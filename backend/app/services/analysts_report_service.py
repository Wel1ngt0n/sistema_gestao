from app.models import db, Store, TaskStep
from sqlalchemy import func, case, or_
from datetime import datetime, timedelta

class AnalystsReportService:
    
    # Corte: Considerar apenas lojas a partir de 01/01/2026
    CUTOFF_DATE = datetime(2026, 1, 1)
    
    @staticmethod
    def get_team_resume():
        """
        Retorna a Mesa Comparativa do time (Aba 1).
        Agrega métricas por implantador_.
        """
        
        # Obter todos os implantadores distintos que possuem lojas não canceladas.
        # Obter lista de implantadores relevantes (ativos ou com entregas recentes)
        implantadores_query = db.session.query(Store.implantador).distinct().filter(
            Store.implantador.isnot(None), 
            Store.implantador != '',
            Store.status_norm != 'CANCELED'
        )
        
        # Filtro: Pessoas que têm lojas ATIVAS neste momento OR lojas ENTREGUES em 2026
        # Isso garante que a Débora e o Derik apareçam sempre que tiverem trabalho ativo.
        implantadores_query = implantadores_query.filter(
            or_(
                Store.status_norm != 'DONE',
                Store.manual_finished_at >= AnalystsReportService.CUTOFF_DATE,
                Store.end_real_at >= AnalystsReportService.CUTOFF_DATE,
                Store.finished_at >= AnalystsReportService.CUTOFF_DATE
            )
        )
        
        implantadores = [i[0] for i in implantadores_query.all()]
        
        report = []
        
        now = datetime.now()
        thirty_days_ago = now - timedelta(days=30)
        
        for imp in implantadores:
            # Lojas Totais (Ativas vs Entregues)
            stores = Store.query.filter(
                Store.implantador == imp, 
                Store.status_norm != 'CANCELED'
            ).filter(
                or_(
                    Store.status_norm != 'DONE',
                    Store.manual_finished_at >= AnalystsReportService.CUTOFF_DATE,
                    Store.end_real_at >= AnalystsReportService.CUTOFF_DATE,
                    Store.finished_at >= AnalystsReportService.CUTOFF_DATE
                )
            ).all()
            
            ativas = [s for s in stores if s.status_norm != 'DONE']
            concluidas = [s for s in stores if s.status_norm == 'DONE']
            
            # Carga Ponderada (Somente Ativas)
            carga_ponderada = 0.0
            matrizes_ativas = 0
            filiais_ativas = 0
            
            for s in ativas:
                if s.tipo_loja and s.tipo_loja.lower() == 'matriz':
                    carga_ponderada += 1.0
                    matrizes_ativas += 1
                else:
                    carga_ponderada += 0.5
                    filiais_ativas += 1
            
            # MRR Ativo
            mrr_ativo = sum((s.valor_mensalidade or 0.0) for s in ativas)
            
            # Entregas Periodo (Mês Vigente)
            first_day_of_month = datetime(now.year, now.month, 1)
            
            concluidas_mes = [s for s in concluidas if s.effective_finished_at and s.effective_finished_at >= first_day_of_month]
            throughput_mes = len(concluidas_mes)
            
            # 1. SLA Concluídas
            sla_ok_concluidas = 0
            sla_total_concluidas = 0
            for s in concluidas:
                if not s.considerar_tempo_implantacao: continue
                if not s.effective_started_at: continue
                sla_total_concluidas += 1
                sla_limit = s.tempo_contrato or 90
                dias = s.dias_totais_implantacao or 0
                if dias > 0 and dias <= sla_limit:
                    sla_ok_concluidas += 1
            
            pct_sla_concluidas = (sla_ok_concluidas / sla_total_concluidas * 100) if sla_total_concluidas > 0 else 0

            # 2. SLA Ativas (Saúde da Carteira)
            sla_ok_ativas = 0
            sla_total_ativas = 0
            for s in ativas:
                if not s.considerar_tempo_implantacao: continue
                if not s.effective_started_at: continue
                sla_total_ativas += 1
                sla_limit = s.tempo_contrato or 90
                dias = s.dias_em_progresso or 0
                if dias <= sla_limit:
                    sla_ok_ativas += 1
            
            pct_sla_ativas = (sla_ok_ativas / sla_total_ativas * 100) if sla_total_ativas > 0 else 0
            
            
            # Qualidade (Nas entregues)
            retrabalho_count = sum(1 for s in concluidas if s.teve_retrabalho)
            pct_retrabalho = (retrabalho_count / len(concluidas) * 100) if len(concluidas) > 0 else 0
            
            # Idle (Apenas ativas)
            idles = [s.idle_days for s in ativas if s.idle_days is not None]
            idle_medio = (sum(idles) / len(idles)) if len(idles) > 0 else 0
            idle_critico_count = sum(1 for i in idles if i > 7) # Mais de 7 dias sem atualização
            
            # Calculo de Gargalos (Desvios) - Simplificado na Visão 1
            pass 
            
            report.append({
                "implantador": imp,
                "ativos": len(ativas),
                "entregues": len(concluidas),
                "carga_ponderada": carga_ponderada,
                "matrizes_ativas": matrizes_ativas,
                "filiais_ativas": filiais_ativas,
                "mrr_ativo": mrr_ativo,
                "entregas_mes": throughput_mes,
                "pct_sla_concluidas": round(pct_sla_concluidas, 1),
                "pct_sla_ativas": round(pct_sla_ativas, 1),
                "pct_retrabalho": pct_retrabalho,
                "idle_medio": round(idle_medio, 1),
                "idle_critico_count": idle_critico_count
            })
            
        # Sort by Carga Ponderada Descending by default
        report.sort(key=lambda x: x['carga_ponderada'], reverse=True)
        
        return {
            "team": report
        }

    @staticmethod
    def get_analyst_details(implantador_name):
        """
        Retorna o Drill-down Individual do Implantador (Aba 3).
        """
        # Obter todas as lojas do analista
        stores = Store.query.filter(
            Store.implantador == implantador_name, 
            Store.status_norm != 'CANCELED'
        ).filter(
            db.or_(
                Store.status_norm != 'DONE',
                Store.manual_finished_at >= AnalystsReportService.CUTOFF_DATE,
                Store.end_real_at >= AnalystsReportService.CUTOFF_DATE,
                Store.finished_at >= AnalystsReportService.CUTOFF_DATE
            )
        ).all()
        
        ativas = [s for s in stores if s.status_norm != 'DONE']
        concluidas = [s for s in stores if s.status_norm == 'DONE']
        
        now = datetime.now()
        thirty_days_ago = now - timedelta(days=30)
        concluidas_30d = [s for s in concluidas if s.effective_finished_at and s.effective_finished_at >= thirty_days_ago]
        
        carga_ponderada = sum(1.0 if (s.tipo_loja and s.tipo_loja.lower() == 'matriz') else 0.5 for s in ativas)
        mrr_ativo = sum((s.valor_mensalidade or 0.0) for s in ativas)
        
        # 1. SLA Concluídas
        sla_total_concluidas = 0
        sla_ok_concluidas = 0
        for s in concluidas:
            if not s.considerar_tempo_implantacao: continue
            if not s.effective_started_at: continue
            sla_total_concluidas += 1
            sla_limit = s.tempo_contrato or 90
            dias = s.dias_totais_implantacao or 0
            if dias > 0 and dias <= sla_limit:
                sla_ok_concluidas += 1
        pct_sla_concluidas = (sla_ok_concluidas / sla_total_concluidas * 100) if sla_total_concluidas > 0 else 0

        # 2. SLA Ativas
        sla_total_ativas = 0
        sla_ok_ativas = 0
        for s in ativas:
            if not s.considerar_tempo_implantacao: continue
            if not s.effective_started_at: continue
            sla_total_ativas += 1
            sla_limit = s.tempo_contrato or 90
            dias = s.dias_em_progresso or 0
            if dias <= sla_limit:
                sla_ok_ativas += 1
        pct_sla_ativas = (sla_ok_ativas / sla_total_ativas * 100) if sla_total_ativas > 0 else 0
        
        
        retrabalho_count = sum(1 for s in concluidas if s.teve_retrabalho)
        pct_retrabalho = (retrabalho_count / len(concluidas) * 100) if len(concluidas) > 0 else 0
        
        # Detalhes das lojas ativas para exibir na UI
        carteira_atual = []
        for s in ativas:
            carteira_atual.append({
                "id": s.id,
                "name": s.store_name,
                "status_name": s.status,
                "tipo_loja": s.tipo_loja,
                "idle_days": s.idle_days,
                "dias_em_progresso": s.dias_em_progresso,
                "tempo_contrato": s.tempo_contrato or 90,
                "valor_mensalidade": s.valor_mensalidade,
                "teve_retrabalho": s.teve_retrabalho
            })
            
        carteira_atual.sort(key=lambda x: x['idle_days'] or 0, reverse=True)
            
        # Tempos Médios por Etapa:
        # Agrupar TaskSteps das lojas para ver gargalos por etapa
        steps_stats = {}
        total_work_days = 0
        total_idle_days = 0
        
        for s in ativas:
            total_work_days += (s.dias_em_progresso or 0)
            total_idle_days += (s.idle_days or 0)
            for step in s.steps:
                name = (step.step_list_name or "Geral").upper()
                if name not in steps_stats: steps_stats[name] = []
                # Considerar tempo total do step se fechado, ou tempo ate agora
                val = step.total_time_days or 0
                steps_stats[name].append(val)
        
        avg_etapas = {k: round(sum(v)/len(v), 1) for k, v in steps_stats.items() if len(v) > 0}
        
        # Proporção Execução vs Espera
        exec_pct = 100
        wait_pct = 0
        if total_work_days > 0:
            wait_pct = round((total_idle_days / total_work_days) * 100, 1)
            exec_pct = 100 - wait_pct

        # Diagnóstico de Causa (Backend heurístico para enviar para IA)
        causas_imp = {"CLIENTE": 0, "IMPLANTADOR": 0, "FLUXO": 0, "CARGA": 0}
        for s in ativas:
            c = AnalystsReportService._classify_store_delay(s, carga_ponderada)
            if c in causas_imp: causas_imp[c] += 1

        return {
            "summary": {
                "implantador": implantador_name,
                "ativos": len(ativas),
                "entregue_mes": len([s for s in concluidas if s.effective_finished_at and s.effective_finished_at.year == datetime.now().year and s.effective_finished_at.month == datetime.now().month]),
                "entregues_total": len(concluidas),
                "carga_ponderada": carga_ponderada,
                "mrr_ativo": mrr_ativo,
                "pct_sla_concluidas": round(pct_sla_concluidas, 1),
                "pct_sla_ativas": round(pct_sla_ativas, 1),
                "pct_retrabalho": round(pct_retrabalho, 1),
                "idle_medio": round((total_idle_days / len(ativas)) if len(ativas) > 0 else 0, 1),
                "tempo": {
                    "execucao_pct": exec_pct,
                    "espera_pct": wait_pct
                },
                "etapas": avg_etapas,
                "diagnostico_causas": causas_imp
            },
            "ativas": [s.to_dict() for s in ativas],
            "entregas": [s.to_dict() for s in concluidas]
        }

    @staticmethod
    def _classify_store_delay(store, carga_ponderada):
        if store.status_norm in ['DONE', 'CANCELED']:
            return "SEM_ATRASO"
            
        idle = store.idle_days or 0
        dias = store.dias_em_progresso or 0
        sla = store.tempo_contrato or 90
        
        if dias <= sla and idle <= 5:
            return "NO_PRAZO"
            
        status_lower = (store.status or "").lower()
        
        # 1. Cliente (Pausas formais, status explícito)
        if 'aguardando' in status_lower or 'inadimplente' in status_lower or 'cliente' in status_lower or len(store.pauses) > 0:
            return "CLIENTE"
            
        # 2. Carga (Analista com carga acima de 15 pontos)
        if carga_ponderada > 15:
            return "CARGA"
            
        # 3. Implantador (Idle alto, s/ justificativa formal)
        if idle > 7:
            return "IMPLANTADOR"
            
        # 4. Etapa (Restante - Demora natural do processo ou complexidade da etapa atual)
        return "ETAPA"

    @staticmethod
    def get_diagnostics():
        """
        Retorna o dashboard e agregados macro de causas do time (Aba 2).
        """
        stores = Store.query.filter(Store.status_norm != 'CANCELED', Store.status_norm != 'DONE', Store.created_at >= AnalystsReportService.CUTOFF_DATE).all()
        
        # Pré-calcular cargas por implantador para a heurística
        cargas = {}
        for s in stores:
            imp = s.implantador or 'Sem Dono'
            if imp not in cargas:
                cargas[imp] = 0
            cargas[imp] += 1.0 if (s.tipo_loja and s.tipo_loja.lower() == 'matriz') else 0.5
            
        causas = {
            "CLIENTE": 0,
            "IMPLANTADOR": 0,
            "CARGA": 0,
            "ETAPA": 0,
            "NO_PRAZO": 0
        }
        
        gargalos_etapa = {}
        
        for s in stores:
            imp = s.implantador or 'Sem Dono'
            carga = cargas.get(imp, 0)
            
            causa = AnalystsReportService._classify_store_delay(s, carga)
            if causa in causas:
                causas[causa] += 1
                
            if causa == "ETAPA":
                step_name = s.status or "Desconhecido"
                gargalos_etapa[step_name] = gargalos_etapa.get(step_name, 0) + 1
                
        # Format top gargalos
        top_gargalos = [{"etapa": k, "count": v} for k, v in gargalos_etapa.items()]
        top_gargalos.sort(key=lambda x: x['count'], reverse=True)
        
        return {
            "causas_distribuicao": causas,
            "top_gargalos_etapa": top_gargalos[:10],
            "total_analisado": len(stores)
        }

    @staticmethod
    def build_team_csv():
        import io
        import csv
        
        data = AnalystsReportService.get_team_resume()
        team_data = data.get("team", [])
        
        output = io.StringIO()
        writer = csv.writer(output, delimiter=';')
        
        # Header
        writer.writerow([
            "Implantador", "Carga Ponderada", "Lojas Ativas", "Matrizes", "Filiais", 
            "Entregas (30D)", "% SLA", "% Retrabalho", "Idle Medio", "Idle Criticos", "MRR Ativo"
        ])
        
        for item in team_data:
            writer.writerow([
                item['implantador'],
                str(item['carga_ponderada']).replace('.', ','),
                item['ativos'],
                item['matrizes_ativas'],
                item['filiais_ativas'],
                item['throughput_30d'],
                str(item['pct_sla']).replace('.', ','),
                str(item['pct_retrabalho']).replace('.', ','),
                str(item['idle_medio']).replace('.', ','),
                item['idle_critico_count'],
                str(item['mrr_ativo']).replace('.', ',')
            ])
            
        return output.getvalue()

    @staticmethod
    def build_individual_csv(implantador_name):
        import io
        import csv
        
        data = AnalystsReportService.get_analyst_details(implantador_name)
        carteira = data.get("carteira_atual", [])
        
        output = io.StringIO()
        writer = csv.writer(output, delimiter=';')
        
        writer.writerow([
            "Loja", "Tipo", "Status", "Dias em Progresso", 
            "Tempo Contrato (SLA)", "Idle (Espera)", "MRR", "Retrabalho"
        ])
        
        for item in carteira:
            writer.writerow([
                item['name'],
                item['tipo_loja'],
                item['status_name'],
                item['dias_em_progresso'],
                item['tempo_contrato'],
                item['idle_days'],
                str(item['valor_mensalidade']).replace('.', ','),
                "SIM" if item['teve_retrabalho'] else "NAO"
            ])
            
        return output.getvalue()

    @staticmethod
    def generate_ai_analysis(implantador_name):
        """Gera análise consultiva via OpenAI (GPT-4o) para um implantador individual."""
        from app.services.llm_service import LLMService
        import json
        
        details = AnalystsReportService.get_analyst_details(implantador_name)
        summ = details.get("summary", {})
        ativas = details.get("ativas", [])
        
        lojas_criticas = sorted(ativas, key=lambda x: x.get('idle_days', 0), reverse=True)[:10]
        
        payload = {
            "implantador": implantador_name,
            "resumo": {
                "lojas_ativas": summ.get('ativos', 0),
                "lojas_concluidas_mes": summ.get('entregue_mes', 0),
                "percentual_sla": summ.get('pct_sla_ativas', 0),
                "idle_medio": summ.get('idle_medio', 0),
                "lojas_idle_alto": len([s for s in ativas if (s.get('idle_days') or 0) > 7])
            },
            "carga": {
                "carga_ponderada": summ.get('carga_ponderada', 0),
                "mrr": summ.get('mrr_ativo', 0)
            },
            "tempo": {
                "tempo_execucao_percentual": summ.get('tempo', {}).get('exec_pct', 100),
                "tempo_espera_percentual": summ.get('tempo', {}).get('wait_pct', 0)
            },
            "qualidade": {
                "retrabalho_percentual": summ.get('pct_retrabalho', 0)
            },
            "etapas": summ.get('etapas', {}),
            "diagnostico_backend": summ.get('diagnostico_causas', {}),
            "lojas_criticas": [
                {
                    "nome": l.get('name'),
                    "etapa": l.get('status_name'),
                    "idle_dias": l.get('idle_days'),
                    "tempo_total": l.get('dias_em_progresso'),
                    "tempo_limite": l.get('tempo_contrato'),
                    "contexto_verbal": {
                        "descricao": l.get('description'),
                        "ultimos_comentarios": l.get('last_comments')
                    }
                } for l in lojas_criticas
            ],
            "feed_comentarios_recentes": [
                s.last_comments for s in (Store.query.filter(Store.implantador == implantador_name, Store.status_norm != 'DONE').order_by(Store.idle_days.desc()).limit(5).all())
                if s.last_comments
            ]
        }


        prompt = f"""Você é um analista de operações especializado em implantação de sistemas SaaS.
Seu papel NÃO é avaliar o colaborador como pessoa, e sim diagnosticar a operação com base nos dados.

OBJETIVO:
Identificar padrões de baixa performance, entender as causas mais prováveis e sugerir ações práticas para o gestor.

REGRAS:
- NÃO faça julgamentos pessoais (ex: "bom", "ruim")
- NÃO apenas descreva os dados, interprete-os
- NÃO use linguagem vaga
- NÃO invente hipóteses sem base
- SEMPRE analise:
    1. **Documentação**: Os implantadores estão comentando? Os comentários são úteis ou apenas protocolares?
    2. **Integração**: Há bloqueios técnicos mencionados?
    3. **Qualidade**: Há menção de configurações faltando ou erros de checkout?
    4. **Cadastro**: Foram cadastrados produtos na etapa correta?
- FOCO: cadência de execução, concentração de idle, distribuição de carga, risco da carteira.

DADOS PARA ANÁLISE:
{json.dumps(payload, indent=2)}

ESTRUTURA OBRIGATÓRIA DA RESPOSTA (JSON):
{{
  "resumo_executivo": "Visão geral em poucas linhas",
  "padroes_identificados": ["bullet 1", "bullet 2"],
  "diagnostico_causa": {{
      "cliente": "explicação",
      "execucao_interna": "explicação",
      "carga_trabalho": "explicação",
      "fluxo_etapa": "explicação"
  }},
  "gargalos_operacionais": ["onde trava"],
  "riscos_identificados": ["riscos de SLA, etc"],
  "acoes_recomendadas": ["ação 1", "ação 2"],
  "auditoria_raio_x": {{
      "qualidade_documentacao": "descrição",
      "bloqueios_identificados": ["bloqueio 1"],
      "conformidade_etapas": "descrição de problemas em Integração/Qualidade/Cadastro"
  }}
}}
Responda APENAS o JSON.
"""

        llm = LLMService()
        result = llm.call_openai_diagnostic(prompt)

        # Salvar em Memória de Longo Prazo para Auditoria e PDF
        try:
            from app.models import AILongTermMemory
            from app import db
            
            # Guardar como análise de perfil do implantador
            memory = AILongTermMemory(
                analysis_type="individual_diagnostic",
                query_prompt=f"Implantador: {implantador_name}",
                ai_response=json.dumps(result),
                context_snapshot=json.dumps(payload)
            )
            db.session.add(memory)
            db.session.commit()
        except Exception as mem_e:
            print(f"Erro ao salvar memória de IA: {mem_e}")

        return result


    @staticmethod
    def generate_team_ai_analysis():
        """Gera análise consultiva via OpenAI (GPT-4o) para o time inteiro."""
        from app.services.llm_service import LLMService
        import json
        
        team_data = AnalystsReportService.get_team_resume()

        diagnostics = AnalystsReportService.get_diagnostics()
        causas = diagnostics.get("causas_distribuicao", {})
        
        payload = {
            "time": [
                {
                    "implantador": t['implantador'],
                    "ativos": t['ativos'],
                    "carga": t['carga_ponderada'],
                    "entregas_mes": t['entregas_mes'],
                    "sla_concluidas": t['pct_sla_concluidas'],
                    "saude_carteira": t['pct_sla_ativas'],
                    "idle_medio": t['idle_medio']
                } for t in team_data
            ],
            "causas_macro": {
                "cliente": causas.get('CLIENTE', 0),
                "interno": causas.get('IMPLANTADOR', 0),
                "fluxo": causas.get('ETAPA', 0),
                "carga": causas.get('CARGA', 0),
                "no_prazo": causas.get('NO_PRAZO', 0)
            },
            "alertas_verbais_criticos": [
                {
                    "loja": s.store_name,
                    "implantador": s.implantador,
                    "comentarios": s.last_comments
                } for s in (Store.query.filter(Store.status_norm != 'DONE', Store.idle_days > 7).order_by(Store.idle_days.desc()).limit(10).all())
                if s.last_comments
            ]
        }


        prompt = f"""Você é um analista de operações senior especializado em gestão de times de implantação SaaS.
Analise os dados consolidados do time abaixo e produza um diagnóstico gerencial de alta performance.

REGRAS:
- NÃO avalie colaboradores individualmente como pessoas.
- FOCO: Distribuição de carga, gargalos sistêmicos, riscos de throughput e saúde da operação.
- ANALISE: Verifique se os 'alertas_verbais_criticos' indicam um problema comum (ex: muitos implantadores reclamando da mesma coisa/etapa).
- RESPOSTA: Tom profissional, baseado em dados, com ações práticas para o gestor.


DADOS DO TIME:
{json.dumps(payload, indent=2)}

ESTRUTURA OBRIGATÓRIA DA RESPOSTA (JSON):
{{
  "resumo_executivo": "Visão geral do time em poucas linhas",
  "padroes_equipe": ["tendência 1", "tendência 2"],
  "diagnostico_causas": {{
      "externas": "impacto do cliente no time",
      "internas": "gargalos de execução do time",
      "processo": "falhas no fluxo de etapas"
  }},
  "riscos_criticos": ["riscos de meta, turnover, etc"],
  "sugestoes_gestao": ["redistribuição", "treinamento", "ajuste de fluxo"]
}}
Responda APENAS o JSON.
"""
        llm = LLMService()
        result = llm.call_openai_diagnostic(prompt)
        return result

    @staticmethod
    def build_team_pdf():
        """Gera PDF executivo do time para apresentacao gerencial."""
        import io
        from fpdf import FPDF
        
        data = AnalystsReportService.get_team_resume()
        team = data.get("team", [])
        diagnostics = AnalystsReportService.get_diagnostics()
        causas = diagnostics.get("causas_distribuicao", {})
        total = diagnostics.get("total_analisado", 0)
        
        pdf = FPDF()
        pdf.set_auto_page_break(auto=True, margin=15)
        pdf.add_page()
        
        # Title
        pdf.set_font("Helvetica", "B", 20)
        pdf.cell(0, 12, "Diagnostico Operacional do Time", ln=True, align="C")
        pdf.set_font("Helvetica", "", 10)
        pdf.set_text_color(120, 120, 120)
        pdf.cell(0, 8, f"Gerado em: {datetime.now().strftime('%d/%m/%Y %H:%M')}", ln=True, align="C")
        pdf.ln(8)
        
        # Diagnostico de Causas
        pdf.set_text_color(0, 0, 0)
        pdf.set_font("Helvetica", "B", 14)
        pdf.cell(0, 10, "Diagnostico Heuristico de Causas", ln=True)
        pdf.set_font("Helvetica", "", 10)
        pdf.cell(0, 6, f"Total de {total} lojas ativas analisadas.", ln=True)
        pdf.ln(4)
        
        labels = {
            "CLIENTE": "Cliente / Fator Externo",
            "IMPLANTADOR": "Analista / Fator Interno",
            "CARGA": "Sobrecarga de Trabalho",
            "ETAPA": "Demora Natural / Processo",
            "NO_PRAZO": "Em Fluxo Normal"
        }
        
        pdf.set_font("Helvetica", "", 10)
        for key, label in labels.items():
            val = causas.get(key, 0)
            pct = (val / total * 100) if total > 0 else 0
            pdf.cell(80, 7, f"  {label}:", 0, 0)
            pdf.cell(30, 7, f"{val} lojas ({pct:.0f}%)", 0, 1)
        
        pdf.ln(8)
        
        # Mesa Comparativa
        pdf.set_font("Helvetica", "B", 14)
        pdf.cell(0, 10, "Mesa Comparativa do Time", ln=True)
        pdf.ln(2)
        
        # Table Header
        col_widths = [36, 16, 16, 16, 16, 16, 20, 20, 20, 22]
        headers = ["Implantador", "Carga", "Ativas", "Entr.Mes", "Idle", "Crit.", "SLA Ent.", "SLA Car.", "Retr.%", "MRR"]
        
        pdf.set_font("Helvetica", "B", 7)
        pdf.set_fill_color(240, 240, 240)
        for i, h in enumerate(headers):
            pdf.cell(col_widths[i], 7, h, 1, 0, "C", True)
        pdf.ln()
        
        # Table Body
        pdf.set_font("Helvetica", "", 8)
        pdf.set_font("Helvetica", "", 7)
        for t in team:
            pdf.cell(col_widths[0], 6, str(t['implantador'])[:18], 1, 0)
            pdf.cell(col_widths[1], 6, f"{t['carga_ponderada']:.1f}", 1, 0, "C")
            pdf.cell(col_widths[2], 6, str(t['ativos']), 1, 0, "C")
            pdf.cell(col_widths[3], 6, str(t['entregas_mes']), 1, 0, "C")
            pdf.cell(col_widths[4], 6, f"{t['idle_medio']:.0f}d", 1, 0, "C")
            pdf.cell(col_widths[5], 6, str(t['idle_critico_count']), 1, 0, "C")
            pdf.cell(col_widths[6], 6, f"{t['pct_sla_concluidas']:.0f}%", 1, 0, "C")
            pdf.cell(col_widths[7], 6, f"{t['pct_sla_ativas']:.0f}%", 1, 0, "C")
            pdf.cell(col_widths[8], 6, f"{t['pct_retrabalho']:.0f}%", 1, 0, "C")
            pdf.cell(col_widths[9], 6, f"R${t['mrr_ativo']:.0f}", 1, 0, "R")
            pdf.ln()
        
        # Footer
        pdf.ln(10)
        pdf.set_font("Helvetica", "I", 8)
        pdf.set_text_color(150, 150, 150)
        pdf.cell(0, 6, "CRM Instabuy - Modulo de Diagnostico Gerencial", 0, 0, "C")
        
        output = io.BytesIO()
        pdf.output(output)
        output.seek(0)
        return output

    @staticmethod
    def build_individual_pdf(implantador_name):
        """Gera PDF executivo individual para 1:1 ou feedback."""
        import io
        from fpdf import FPDF
        
        details = AnalystsReportService.get_analyst_details(implantador_name)
        summary = details.get("summary", {})
        carteira = details.get("carteira_atual", [])
        
        pdf = FPDF()
        pdf.set_auto_page_break(auto=True, margin=15)
        pdf.add_page()
        
        # Title
        pdf.set_font("Helvetica", "B", 18)
        pdf.cell(0, 12, f"Perfil Analitico: {implantador_name}", ln=True, align="C")
        pdf.set_font("Helvetica", "", 10)
        pdf.set_text_color(120, 120, 120)
        pdf.cell(0, 8, f"Gerado em: {datetime.now().strftime('%d/%m/%Y %H:%M')}", ln=True, align="C")
        pdf.ln(8)
        
        # KPIs
        pdf.set_text_color(0, 0, 0)
        pdf.set_font("Helvetica", "B", 13)
        pdf.cell(0, 10, "Indicadores Principais", ln=True)
        pdf.set_font("Helvetica", "", 10)
        
        kpis = [
            ("Lojas Ativas", str(summary.get('ativos', 0))),
            ("Entregas (Mês)", str(summary.get('entregue_mes', 0))),
            ("Entregas (Total)", str(summary.get('entregues_total', 0))),
            ("Carga Ponderada", f"{summary.get('carga_ponderada', 0):.1f} pts"),
            ("MRR Ativo", f"R$ {summary.get('mrr_ativo', 0):,.2f}"),
            ("% SLA Concluídas", f"{summary.get('pct_sla_concluidas', 0):.1f}%"),
            ("% SLA Ativas", f"{summary.get('pct_sla_ativas', 0):.1f}%"),
            ("% Retrabalho", f"{summary.get('pct_retrabalho', 0):.0f}%"),
        ]
        
        for label, val in kpis:
            pdf.cell(70, 7, f"  {label}:", 0, 0)
            pdf.set_font("Helvetica", "B", 10)
            pdf.cell(60, 7, val, 0, 1)
            pdf.set_font("Helvetica", "", 10)
        
        pdf.ln(6)
        
        # Carteira
        pdf.set_font("Helvetica", "B", 13)
        pdf.cell(0, 10, f"Carteira Ativa ({len(carteira)} Projetos)", ln=True)
        pdf.ln(2)
        
        col_widths = [50, 20, 35, 22, 18, 25]
        headers = ["Loja", "Tipo", "Status", "Dias", "Idle", "MRR"]
        
        pdf.set_font("Helvetica", "B", 8)
        pdf.set_fill_color(240, 240, 240)
        for i, h in enumerate(headers):
            pdf.cell(col_widths[i], 7, h, 1, 0, "C", True)
        pdf.ln()
        
        pdf.set_font("Helvetica", "", 7)
        for loja in carteira:
            name_trunc = str(loja['name'])[:28]
            pdf.cell(col_widths[0], 6, name_trunc, 1, 0)
            pdf.cell(col_widths[1], 6, str(loja.get('tipo_loja', '-'))[:10], 1, 0, "C")
            pdf.cell(col_widths[2], 6, str(loja.get('status_name', '-'))[:20], 1, 0)
            pdf.cell(col_widths[3], 6, f"{loja['dias_em_progresso']}d/{loja['tempo_contrato']}d", 1, 0, "C")
            pdf.cell(col_widths[4], 6, f"{loja['idle_days']}d", 1, 0, "C")
            pdf.cell(col_widths[5], 6, f"R${loja.get('valor_mensalidade', 0) or 0:.0f}", 1, 0, "R")
            pdf.ln()
        
        # PARECER DA IA (RAIO-X)
        try:
            from app.models import AILongTermMemory
            memory = AILongTermMemory.query.filter(
                AILongTermMemory.analysis_type == "individual_diagnostic",
                AILongTermMemory.query_prompt.ilike(f"%{implantador_name}%")
            ).order_by(AILongTermMemory.created_at.desc()).first()
            
            if memory:
                import json
                ai_data = json.loads(memory.ai_response)
                pdf.add_page()
                
                # Title IA
                pdf.set_font("Helvetica", "B", 16)
                pdf.set_text_color(0, 51, 102) # Blueish
                pdf.cell(0, 12, "Parecer Detalhado da IA (Raio-X)", ln=True)
                pdf.ln(4)
                
                # Exec Summary
                pdf.set_font("Helvetica", "B", 11)
                pdf.set_text_color(0, 0, 0)
                pdf.cell(0, 8, "Resumo Executivo:", ln=True)
                pdf.set_font("Helvetica", "", 10)
                pdf.multi_cell(0, 6, ai_data.get('resumo_executivo', '-'))
                pdf.ln(5)
                
                # ClickUp Audit
                raio_x = ai_data.get('auditoria_raio_x', {})
                if raio_x:
                    pdf.set_font("Helvetica", "B", 11)
                    pdf.cell(0, 8, "Auditoria Qualitativa (ClickUp):", ln=True)
                    pdf.set_font("Helvetica", "", 10)
                    pdf.multi_cell(0, 6, f"Documentacao: {raio_x.get('qualidade_documentacao', '-')}")
                    pdf.multi_cell(0, 6, f"Conformidade: {raio_x.get('conformidade_etapas', '-')}")
                    pdf.ln(4)

                # Attention Points
                pdf.set_font("Helvetica", "B", 11)
                pdf.cell(0, 8, "Pontos de Atencao e Riscos:", ln=True)
                pdf.set_font("Helvetica", "", 10)
                bullets = ai_data.get('riscos_identificados', []) + ai_data.get('gargalos_operacionais', [])
                for b in bullets:
                    pdf.multi_cell(0, 6, f"  * {b}")
                pdf.ln(4)

                # Proposed Actions
                pdf.set_font("Helvetica", "B", 11)
                pdf.set_text_color(204, 0, 0) # Reddish
                pdf.cell(0, 8, "Acoes Recomendadas para Gestao:", ln=True)
                pdf.set_font("Helvetica", "", 10)
                pdf.set_text_color(0, 0, 0)
                for a in ai_data.get('acoes_recomendadas', []):
                    pdf.multi_cell(0, 6, f"  > {a}")

        except Exception as pdf_ai_e:
            print(f"Erro ao incluir IA no PDF: {pdf_ai_e}")

        # Footer
        pdf.ln(10)
        pdf.set_font("Helvetica", "I", 8)
        pdf.set_text_color(150, 150, 150)
        pdf.cell(0, 6, "CRM Instabuy - Modulo de Diagnostico Gerencial", 0, 0, "C")
        
        output = io.BytesIO()
        pdf.output(output)
        output.seek(0)
        return output

