from app.models import db, Store, TaskStep
from sqlalchemy import func, case
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
        implantadores = db.session.query(Store.implantador).distinct().filter(
            Store.implantador.isnot(None), 
            Store.implantador != '',
            Store.status_norm != 'CANCELED',
            Store.created_at >= AnalystsReportService.CUTOFF_DATE
        ).all()
        
        implantadores = [i[0] for i in implantadores]
        
        report = []
        
        now = datetime.now()
        thirty_days_ago = now - timedelta(days=30)
        
        for imp in implantadores:
            # Lojas Totais (Ativas vs Entregues)
            stores = Store.query.filter(Store.implantador == imp, Store.status_norm != 'CANCELED', Store.created_at >= AnalystsReportService.CUTOFF_DATE).all()
            
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
            
            # Entregas Periodo (Últimos 30 dias)
            concluidas_30d = [s for s in concluidas if s.effective_finished_at and s.effective_finished_at >= thirty_days_ago]
            throughput_30d = len(concluidas_30d)
            
            # SLA Global (% Dentro do Prazo entre as concluídas)
            sla_ok = 0
            for s in concluidas:
                sla = s.tempo_contrato or 90
                # Desconta dias em progresso
                if s.dias_totais_implantacao <= sla:
                    sla_ok += 1
            
            pct_sla = (sla_ok / len(concluidas) * 100) if len(concluidas) > 0 else 0
            
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
                "throughput_30d": throughput_30d,
                "pct_sla": pct_sla,
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
        stores = Store.query.filter(Store.implantador == implantador_name, Store.status_norm != 'CANCELED', Store.created_at >= AnalystsReportService.CUTOFF_DATE).all()
        
        ativas = [s for s in stores if s.status_norm != 'DONE']
        concluidas = [s for s in stores if s.status_norm == 'DONE']
        
        now = datetime.now()
        thirty_days_ago = now - timedelta(days=30)
        concluidas_30d = [s for s in concluidas if s.effective_finished_at and s.effective_finished_at >= thirty_days_ago]
        
        carga_ponderada = sum(1.0 if (s.tipo_loja and s.tipo_loja.lower() == 'matriz') else 0.5 for s in ativas)
        mrr_ativo = sum((s.valor_mensalidade or 0.0) for s in ativas)
        
        # Qualidade % e SLA %
        sla_ok = sum(1 for s in concluidas if s.dias_totais_implantacao <= (s.tempo_contrato or 90))
        pct_sla = (sla_ok / len(concluidas) * 100) if len(concluidas) > 0 else 0
        
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
        # A intenção original pede comparação da média do analista vs média do time
        # TODO: Podemos simplificar agora pegando apenas a média do analista para listar as etapas.
        # Exemplo: Agrupar TaskSteps das lojas concluídas e ativas para ver velocidade
        
        return {
            "implantador": implantador_name,
            "resumo": {
                "ativos": len(ativas),
                "entregues_30d": len(concluidas_30d),
                "carga_ponderada": carga_ponderada,
                "mrr_ativo": mrr_ativo,
                "pct_sla": pct_sla,
                "pct_retrabalho": pct_retrabalho,
            },
            "carteira_atual": carteira_atual
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
        """Gera análise consultiva via Gemini para um implantador individual."""
        from app.services.llm_service import LLMService
        import json
        
        details = AnalystsReportService.get_analyst_details(implantador_name)
        resumo = details.get("resumo", {})
        carteira = details.get("carteira_atual", [])
        
        prompt = f"""Voce eh um consultor operacional de implantacao de sistemas.
Analise os dados abaixo de um analista e produza um diagnostico gerencial.

REGRAS:
- NAO avalie o colaborador como pessoa. Foque em padroes operacionais.
- NAO de notas ou classifique como bom/ruim.
- Foque em: padroes de atraso, concentracao de idle, carga de trabalho, gargalos.
- Sugira acoes praticas para o gestor.
- Responda em portugues brasileiro.

DADOS DO ANALISTA: {implantador_name}
- Lojas ativas: {resumo.get('ativos', 0)}
- Entregas (30d): {resumo.get('entregues_30d', 0)}
- Carga ponderada: {resumo.get('carga_ponderada', 0)}
- MRR retido: R$ {resumo.get('mrr_ativo', 0):.2f}
- % dentro do SLA: {resumo.get('pct_sla', 0):.0f}%
- % retrabalho: {resumo.get('pct_retrabalho', 0):.0f}%

CARTEIRA ATIVA (top 10):
"""
        for loja in carteira[:10]:
            prompt += f"- {loja['name']} | Tipo: {loja['tipo_loja']} | Idle: {loja['idle_days']}d | Dias: {loja['dias_em_progresso']}d/{loja['tempo_contrato']}d | Status: {loja['status_name']}\n"
        
        prompt += """
Responda APENAS com o JSON abaixo (sem markdown, sem crases):
{"resumo_geral": "...", "padroes_observados": ["..."], "gargalos_relevantes": ["..."], "riscos_operacionais": ["..."], "sugestoes_acao": ["..."]}"""

        llm = LLMService()
        if not llm.client:
            return {"error": "IA nao configurada. Verifique a chave de API do Gemini."}
        
        try:
            response = llm.client.models.generate_content(model='gemini-flash-latest', contents=prompt)
            cleaned = response.text.replace('```json', '').replace('```', '').strip()
            try:
                return json.loads(cleaned)
            except:
                return {"resumo_geral": cleaned}
        except Exception as e:
            return {"error": str(e)}

    @staticmethod
    def generate_team_ai_analysis():
        """Gera analise consultiva via Gemini para o time inteiro."""
        from app.services.llm_service import LLMService
        import json
        
        team_data = AnalystsReportService.get_team_resume().get("team", [])
        diagnostics = AnalystsReportService.get_diagnostics()
        
        prompt = f"""Voce eh um consultor operacional senior de implantacao de sistemas.
Analise os dados consolidados do time e produza um diagnostico gerencial.

REGRAS:
- NAO avalie colaboradores individualmente como pessoas.
- Foque em padroes do TIME: distribuicao de carga, gargalos recorrentes, riscos.
- Sugira acoes praticas para o gestor redistribuir ou corrigir a operacao.
- Responda em portugues brasileiro.

DADOS DO TIME ({len(team_data)} analistas):
"""
        for t in team_data:
            prompt += f"- {t['implantador']}: {t['ativos']} ativas (M:{t['matrizes_ativas']}/F:{t['filiais_ativas']}), Carga: {t['carga_ponderada']}, Idle medio: {t['idle_medio']}d, SLA: {t['pct_sla']:.0f}%, Retrabalho: {t['pct_retrabalho']:.0f}%, Entregas 30d: {t['throughput_30d']}\n"
        
        causas = diagnostics.get("causas_distribuicao", {})
        prompt += f"""
DIAGNOSTICO HEURISTICO DE CAUSAS:
- Cliente/Externo: {causas.get('CLIENTE', 0)} lojas
- Implantador/Interno: {causas.get('IMPLANTADOR', 0)} lojas
- Etapa/Processo: {causas.get('ETAPA', 0)} lojas
- Sobrecarga: {causas.get('CARGA', 0)} lojas
- No prazo: {causas.get('NO_PRAZO', 0)} lojas

Responda APENAS com o JSON abaixo (sem markdown, sem crases):
"""
        prompt += '{"resumo_geral": "...", "padroes_observados": ["..."], "diagnostico_predominante": "...", "gargalos_relevantes": ["..."], "riscos_operacionais": ["..."], "sugestoes_acao": ["..."]}'

        llm = LLMService()
        if not llm.client:
            return {"error": "IA nao configurada. Verifique a chave de API do Gemini."}
        
        try:
            response = llm.client.models.generate_content(model='gemini-flash-latest', contents=prompt)
            cleaned = response.text.replace('```json', '').replace('```', '').strip()
            try:
                return json.loads(cleaned)
            except:
                return {"resumo_geral": cleaned}
        except Exception as e:
            return {"error": str(e)}

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
        col_widths = [38, 18, 18, 18, 18, 18, 18, 22, 22]
        headers = ["Implantador", "Carga", "Ativas", "Entr.30d", "Idle", "Crit.", "SLA%", "Retr.%", "MRR"]
        
        pdf.set_font("Helvetica", "B", 8)
        pdf.set_fill_color(240, 240, 240)
        for i, h in enumerate(headers):
            pdf.cell(col_widths[i], 7, h, 1, 0, "C", True)
        pdf.ln()
        
        # Table Body
        pdf.set_font("Helvetica", "", 8)
        for t in team:
            pdf.cell(col_widths[0], 6, str(t['implantador'])[:20], 1, 0)
            pdf.cell(col_widths[1], 6, f"{t['carga_ponderada']:.1f}", 1, 0, "C")
            pdf.cell(col_widths[2], 6, str(t['ativos']), 1, 0, "C")
            pdf.cell(col_widths[3], 6, str(t['throughput_30d']), 1, 0, "C")
            pdf.cell(col_widths[4], 6, f"{t['idle_medio']:.0f}d", 1, 0, "C")
            pdf.cell(col_widths[5], 6, str(t['idle_critico_count']), 1, 0, "C")
            pdf.cell(col_widths[6], 6, f"{t['pct_sla']:.0f}%", 1, 0, "C")
            pdf.cell(col_widths[7], 6, f"{t['pct_retrabalho']:.0f}%", 1, 0, "C")
            pdf.cell(col_widths[8], 6, f"R${t['mrr_ativo']:.0f}", 1, 0, "R")
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
        resumo = details.get("resumo", {})
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
            ("Lojas Ativas", str(resumo.get('ativos', 0))),
            ("Entregas (30 dias)", str(resumo.get('entregues_30d', 0))),
            ("Carga Ponderada", f"{resumo.get('carga_ponderada', 0):.1f} pts"),
            ("MRR Retido", f"R$ {resumo.get('mrr_ativo', 0):,.2f}"),
            ("% dentro do SLA", f"{resumo.get('pct_sla', 0):.0f}%"),
            ("% Retrabalho", f"{resumo.get('pct_retrabalho', 0):.0f}%"),
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
        
        # Footer
        pdf.ln(10)
        pdf.set_font("Helvetica", "I", 8)
        pdf.set_text_color(150, 150, 150)
        pdf.cell(0, 6, "CRM Instabuy - Modulo de Diagnostico Gerencial", 0, 0, "C")
        
        output = io.BytesIO()
        pdf.output(output)
        output.seek(0)
        return output
