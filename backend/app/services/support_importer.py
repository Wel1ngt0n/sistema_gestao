"""
SupportImporter V3.1 - Motor de Ingestão Multi-Arquivo para Zenvia Support Intelligence.

Processa todas as planilhas da pasta excel_suporte em ordem lógica:
1. Conversas -> Cadastro mestre de contatos (telefone, email, NPS)
2. Activities -> Histórico de mensagens (vincula agentes)
3. Performance do grupo -> KPIs agregados por atendente
4. Agentes -> Estado atual e atividade dos atendentes
"""
import pandas as pd
import hashlib
from datetime import datetime
import re
import json
import os
from app.models import db, SupportContact, SupportConversation, SupportMessage, SupportAgentPerformance, SystemConfig

def slugify(text):
    if not text:
        return "unknown"
    return re.sub(r'\W+', '_', str(text)).lower()

def get_hash(text):
    return hashlib.md5(str(text).encode()).hexdigest()

def parse_time_to_seconds(time_str):
    """
    Converte strings de tempo da Zenvia para segundos.
    Exemplos: "5m 39s", "10h 53m", "2m 0s", "27s", "1h 31m", "04d 15h"
    """
    if not time_str or time_str == '-' or time_str == '0s':
        return 0
    
    total = 0
    time_str = str(time_str).strip()
    
    # Dias
    d_match = re.search(r'(\d+)d', time_str)
    if d_match:
        total += int(d_match.group(1)) * 86400
    
    # Horas
    h_match = re.search(r'(\d+)h', time_str)
    if h_match:
        total += int(h_match.group(1)) * 3600
    
    # Minutos
    m_match = re.search(r'(\d+)m', time_str)
    if m_match:
        total += int(m_match.group(1)) * 60
    
    # Segundos
    s_match = re.search(r'(\d+)s', time_str)
    if s_match:
        total += int(s_match.group(1))
    
    return total

def read_input_data(data, required_column=None):
    """Lê entrada que pode ser um DataFrame ou um objeto de arquivo (buffer)."""
    if isinstance(data, pd.DataFrame):
        df = data
    else:
        # Se for buffer, tenta ler com múltiplos encodings
        df = None
        for encoding in ['utf-8', 'latin-1', 'cp1252']:
            try:
                if hasattr(data, 'seek'):
                    data.seek(0)
                df = pd.read_csv(data, encoding=encoding)
                if required_column:
                    # Limpa espaços das colunas para bater certinho
                    df.columns = [c.strip() for c in df.columns]
                    if required_column not in df.columns:
                        df = None
                        continue
                break
            except:
                continue
    
    if df is not None:
        # Limpa espaços de todas as colunas
        df.columns = [c.strip() for c in df.columns]
        print(f">>> Arquivo lido com sucesso. Colunas: {df.columns.tolist()[:5]}...")
    return df

# ============================================================
# 1. ENRIQUECIMENTO DE CONTATOS (Conversas - *.csv)
# ============================================================
def enrich_contacts_from_conversations_csv(data):
    """
    Processa dados de conversas para enriquecer contatos e extrair NPS.
    'data' pode ser um DataFrame ou um objeto de arquivo.
    """
    df = read_input_data(data, 'phone')
    if df is None:
        return {"error": "Formato de arquivo de conversas inválido ou coluna 'phone' não encontrada."}

    stats = {
        "total_rows": len(df),
        "contacts_updated": 0,
        "contacts_created": 0,
        "nps_extracted": 0
    }

    for _, row in df.iterrows():
        try:
            name = str(row.get('name', ''))
            phone = str(row.get('phone', ''))
            email = str(row.get('email', ''))
            created_at = str(row.get('created_at', ''))
            extra_raw = str(row.get('extra', '{}'))

            if not name or name == 'nan':
                continue

            # Parse timestamp
            try:
                conv_ts = pd.to_datetime(created_at).to_pydatetime()
            except:
                conv_ts = datetime.now()

            # Extração de NPS do JSON no campo 'extra'
            nps_score = None
            nps_comment = None
            try:
                clean_extra = extra_raw.replace('""', '"')
                if clean_extra.startswith('"') and clean_extra.endswith('"'):
                    clean_extra = clean_extra[1:-1]
                extra_data = json.loads(clean_extra)
                
                nps_val = extra_data.get('nps')
                if nps_val is not None:
                    nps_str = str(nps_val).strip()
                    if nps_str.isdigit() and 0 <= int(nps_str) <= 10:
                        nps_score = int(nps_str)
                    elif len(nps_str) > 1:
                        nps_comment = nps_str
            except:
                pass

            # Contato
            contact_slug = slugify(name)
            zenvia_contact_id = f"IMPORT_{contact_slug}"

            contact = SupportContact.query.filter_by(zenvia_contact_id=zenvia_contact_id).first()
            if not contact and phone and phone != 'nan':
                contact = SupportContact.query.filter_by(phone=phone).first()

            if contact:
                if (not contact.phone or contact.phone == 'nan') and phone != 'nan':
                    contact.phone = phone
                if (not contact.email or contact.email == 'nan') and email != 'nan':
                    contact.email = email
                stats["contacts_updated"] += 1
            else:
                contact = SupportContact(
                    zenvia_contact_id=zenvia_contact_id,
                    name=name,
                    phone=phone if phone != 'nan' else None,
                    email=email if email != 'nan' else None
                )
                db.session.add(contact)
                db.session.flush()
                stats["contacts_created"] += 1

            # Vincular NPS à conversa do mesmo mês
            if nps_score is not None or nps_comment:
                conv_key = f"{contact_slug}_{conv_ts.strftime('%Y%m')}"
                zenvia_conv_id = f"IMPORT_CONV_{conv_key}"
                conv = SupportConversation.query.filter_by(zenvia_conversation_id=zenvia_conv_id).first()
                if conv:
                    if nps_score is not None:
                        conv.nps_score = nps_score
                    if nps_comment and (not conv.nps_comment or len(nps_comment) > len(conv.nps_comment)):
                        conv.nps_comment = nps_comment
                    stats["nps_extracted"] += 1

            if (stats["contacts_updated"] + stats["contacts_created"]) % 500 == 0:
                db.session.commit()
        except:
            continue

    db.session.commit()
    return stats


# ============================================================
# 2. IMPORTAÇÃO DE ATIVIDADES (export-activities-*.csv)
# ============================================================
def import_zenvia_activities_csv(data):
    """
    Importa o histórico de mensagens.
    'data' pode ser um DataFrame ou um objeto de arquivo.
    """
    df = read_input_data(data, 'Cliente')
    if df is None:
        return {"error": "Formato de arquivo de atividades inválido ou coluna 'Cliente' não encontrada."}

    stats = {
        "total_rows": len(df),
        "messages_imported": 0,
        "contacts_created": 0,
        "conversations_created": 0,
        "errors": 0
    }

    contact_cache = {}
    conv_cache = {}

    for _, row in df.iterrows():
        try:
            date_str = str(row.get('Data', ''))
            contact_name = str(row.get('Cliente', ''))
            agent_name = str(row.get('Agente', ''))
            group_name = str(row.get('Grupo', ''))
            details = str(row.get('Detalhes', ''))

            if not date_str or not contact_name or not details or contact_name == 'nan':
                continue

            # Parse Date
            try:
                ts = datetime.strptime(date_str, "%d/%m/%Y, %H:%M")
            except:
                try:
                    ts = pd.to_datetime(date_str).to_pydatetime()
                except:
                    continue

            # Identificar Direção e Texto
            direction = None
            msg_text = details

            if details.startswith("WhatsApp recebido:"):
                direction = "IN"
                msg_text = details.replace("WhatsApp recebido:", "").strip()
            elif details.startswith("WhatsApp enviado:"):
                direction = "OUT"
                msg_text = details.replace("WhatsApp enviado:", "").strip()
                # Remove prefixo "Agente: " da mensagem
                parts = msg_text.split(":", 1)
                if len(parts) > 1 and len(parts[0]) < 30:
                    msg_text = parts[1].strip()

            if not direction:
                continue

            # 1. Contato
            contact_slug = slugify(contact_name)
            zenvia_contact_id = f"IMPORT_{contact_slug}"

            contact_id = contact_cache.get(contact_slug)
            if not contact_id:
                contact = SupportContact.query.filter_by(zenvia_contact_id=zenvia_contact_id).first()
                if not contact:
                    contact = SupportContact(
                        zenvia_contact_id=zenvia_contact_id,
                        name=contact_name
                    )
                    db.session.add(contact)
                    db.session.flush()
                    stats["contacts_created"] += 1
                contact_id = contact.id
                contact_cache[contact_slug] = contact_id

            # 2. Conversa (Agrupamento mensal)
            conv_key = f"{contact_slug}_{ts.strftime('%Y%m')}"
            zenvia_conv_id = f"IMPORT_CONV_{conv_key}"

            conv_id = conv_cache.get(conv_key)
            if not conv_id:
                conv = SupportConversation.query.filter_by(zenvia_conversation_id=zenvia_conv_id).first()
                if not conv:
                    conv = SupportConversation(
                        zenvia_conversation_id=zenvia_conv_id,
                        contact_id=contact_id,
                        status='CLOSED',
                        channel='whatsapp',
                        created_at_zenvia=ts,
                        agent_name=agent_name if agent_name and agent_name != 'nan' else None
                    )
                    db.session.add(conv)
                    db.session.flush()
                    stats["conversations_created"] += 1
                else:
                    if agent_name and agent_name != 'nan' and not conv.agent_name:
                        conv.agent_name = agent_name
                conv_id = conv.id
                conv_cache[conv_key] = conv_id

            # 3. Mensagem (com dedup por hash)
            msg_hash = get_hash(f"{contact_slug}_{date_str}_{msg_text}")
            zenvia_message_id = f"IMPORT_MSG_{msg_hash}"

            exists = SupportMessage.query.filter_by(zenvia_message_id=zenvia_message_id).first()
            if not exists:
                msg = SupportMessage(
                    zenvia_message_id=zenvia_message_id,
                    conversation_id=conv_id,
                    direction=direction,
                    text=msg_text,
                    timestamp=ts,
                    status='SENT' if direction == 'OUT' else 'READ'
                )
                db.session.add(msg)
                stats["messages_imported"] += 1

            if stats["messages_imported"] % 1000 == 0:
                db.session.commit()

        except Exception as row_err:
            stats["errors"] += 1
            continue

    db.session.commit()
    return stats


# ============================================================
# 3. PERFORMANCE DO GRUPO (Performance do grupo*.csv)
# ============================================================
def import_agent_performance_csv(data, period=None):
    """
    Importa KPIs agregados.
    """
    df = read_input_data(data, 'Consultor')
    if df is None:
        return {"error": "Formato de arquivo de performance inválido ou coluna 'Consultor' não encontrada."}

    if not period:
        period = datetime.now().strftime('%Y-%m')

    stats = {"agents_imported": 0}

    for _, row in df.iterrows():
        try:
            name = str(row.get('Consultor', '')).strip()
            if not name or name == 'TOTAL' or name == 'nan':
                continue

            group = str(row.get('Grupo', 'Suporte N1')).strip()
            total_contacts = int(row.get('Total de contatos', 0) or 0)
            total_convs = int(row.get('Conv. totais', 0) or 0)
            new_convs = int(row.get('Novas converas', row.get('Novas conversas', 0)) or 0)
            closed_convs = int(row.get('Conv. fechadas', 0) or 0)
            close_time = parse_time_to_seconds(row.get('Fecha em', '0s'))
            response_time = parse_time_to_seconds(row.get('Responde em', '0s'))
            msgs_sent = int(row.get('Mensagens enviadas', 0) or 0)

            perf = SupportAgentPerformance.query.filter_by(
                agent_name=name, period=period
            ).first()

            if perf:
                perf.total_contacts = total_contacts
                perf.total_conversations = total_convs
                perf.new_conversations = new_convs
                perf.closed_conversations = closed_convs
                perf.avg_response_time_seconds = response_time
                perf.avg_close_time_seconds = close_time
                perf.total_messages_sent = msgs_sent
                perf.group_name = group
            else:
                perf = SupportAgentPerformance(
                    agent_name=name,
                    period=period,
                    group_name=group,
                    total_contacts=total_contacts,
                    total_conversations=total_convs,
                    new_conversations=new_convs,
                    closed_conversations=closed_convs,
                    avg_response_time_seconds=response_time,
                    avg_close_time_seconds=close_time,
                    total_messages_sent=msgs_sent
                )
                db.session.add(perf)

            stats["agents_imported"] += 1
        except:
            continue

    db.session.commit()
    return stats


# ============================================================
# 4. AGENTES ATIVO (Agentes.csv)
# ============================================================
def import_agents_status_csv(data, period=None):
    """
    Importa estado atual dos atendentes.
    """
    df = read_input_data(data, 'Consultor')
    if df is None:
        return {"error": "Formato de arquivo de agentes inválido ou coluna 'Consultor' não encontrada."}

    if not period:
        period = datetime.now().strftime('%Y-%m')

    stats = {"agents_updated": 0}

    for _, row in df.iterrows():
        try:
            name = str(row.get('Consultor', '')).strip()
            if not name or name == 'nan' or name == '':
                continue

            last_activity = None
            try:
                last_activity = pd.to_datetime(row.get('Ult. Atividade', '')).to_pydatetime()
            except:
                pass

            activities = int(row.get('Ativ. realizadas hoje', 0) or 0)
            pending = int(row.get('Atendimentos pendentes', 0) or 0)
            open_tickets = int(row.get('Atendimentos abertos', 0) or 0)

            perf = SupportAgentPerformance.query.filter_by(
                agent_name=name, period=period
            ).first()

            if perf:
                perf.last_activity_at = last_activity
                perf.activities_today = activities
                perf.pending_tickets = pending
                perf.open_tickets = open_tickets
            else:
                perf = SupportAgentPerformance(
                    agent_name=name,
                    period=period,
                    last_activity_at=last_activity,
                    activities_today=activities,
                    pending_tickets=pending,
                    open_tickets=open_tickets
                )
                db.session.add(perf)

            stats["agents_updated"] += 1
        except:
            continue

    db.session.commit()
    return stats


# ============================================================
# 5. CÁLCULO DE NPS POR ATENDENTE (Pós-importação)
# ============================================================
def calculate_agent_nps(period=None):
    """
    Cruza as conversas que têm NPS + agent_name e calcula a média por atendente.
    """
    if not period:
        period = datetime.now().strftime('%Y-%m')

    convs = SupportConversation.query.filter(
        SupportConversation.nps_score.isnot(None),
        SupportConversation.agent_name.isnot(None)
    ).all()

    agent_nps = {}
    for conv in convs:
        name = conv.agent_name.strip()
        if name not in agent_nps:
            agent_nps[name] = []
        agent_nps[name].append(conv.nps_score)

    stats = {"agents_with_nps": 0}

    for name, scores in agent_nps.items():
        avg = sum(scores) / len(scores) if scores else 0
        count = len(scores)

        perf = SupportAgentPerformance.query.filter_by(
            agent_name=name, period=period
        ).first()

        if perf:
            perf.avg_nps = round(avg, 2)
            perf.nps_count = count
        else:
            perf = SupportAgentPerformance(
                agent_name=name,
                period=period,
                avg_nps=round(avg, 2),
                nps_count=count
            )
            db.session.add(perf)

        stats["agents_with_nps"] += 1

    db.session.commit()
    return stats
