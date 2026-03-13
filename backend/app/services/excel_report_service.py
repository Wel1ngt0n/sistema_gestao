import io
from datetime import datetime
import xlsxwriter

class ExcelReportService:
    @staticmethod
    def generate_annual_implantation_excel(data: dict) -> io.BytesIO:
        output = io.BytesIO()
        workbook = xlsxwriter.Workbook(output, {'in_memory': True})
        
        # --- Formatos ---
        primary_color = '#0d9488'
        text_color = '#18181b'
        white = '#ffffff'
        
        header_format = workbook.add_format({
            'bold': True, 'font_color': white, 'bg_color': primary_color,
            'align': 'center', 'valign': 'vcenter', 'border': 1
        })
        title_format = workbook.add_format({'bold': True, 'font_size': 14, 'font_color': primary_color, 'bottom': 2})
        normal_format = workbook.add_format({'font_size': 11, 'color': text_color})
        bold_format = workbook.add_format({'bold': True, 'font_size': 11, 'color': text_color})
        money_format = workbook.add_format({'num_format': 'R$ #,##0.00', 'color': text_color})
        pct_format = workbook.add_format({'num_format': '0.0%', 'color': text_color})
        
        # Aba: Visão Anual YTD
        ws_anual = workbook.add_worksheet('Visão Anual YTD')
        ws_anual.set_column('A:A', 35)
        ws_anual.set_column('B:D', 20)
        
        ws_anual.write('A1', f'VISÃO ANUAL (YTD) - {datetime.now().year}', title_format)
        ws_anual.write('A2', f'Gerado em: {datetime.now().strftime("%d/%m/%Y %H:%M")}', normal_format)
        
        row = 4
        goals = data.get('annual_goals', {})
        months = data.get('months', [])
        
        # Calculate Global Ticket
        total_ytd_mrr = goals.get('mrr_ytd', 0)
        total_ytd_stores = goals.get('stores_ytd', 0)
        global_ticket = total_ytd_mrr / max(total_ytd_stores, 1)
        
        # Lojas necessárias baseadas no ticket global
        target_mrr = goals.get('mrr_target', 0)
        stores_needed_for_mrr = int((target_mrr / global_ticket)) if global_ticket > 0 else 0
        
        # Run rate necessário
        current_month = datetime.now().month
        months_remaining = max(12 - current_month + 1, 1) # Including current month
        
        mrr_remaining = max(0, target_mrr - total_ytd_mrr)
        stores_remaining = max(0, goals.get('stores_target', 0) - total_ytd_stores)
        
        run_rate_mrr = mrr_remaining / months_remaining
        run_rate_stores = stores_remaining / months_remaining
        
        # Seção 1: Progresso Anual
        ws_anual.write(row, 0, '1. Progresso Geral das Metas', title_format)
        row += 1
        ws_anual.write(row, 0, 'Métrica', header_format)
        ws_anual.write(row, 1, 'Realizado YTD', header_format)
        ws_anual.write(row, 2, 'Meta Anual', header_format)
        ws_anual.write(row, 3, '% Atingimento', header_format)
        row += 1
        
        ws_anual.write(row, 0, 'MRR Adicionado', bold_format)
        ws_anual.write(row, 1, total_ytd_mrr, money_format)
        ws_anual.write(row, 2, target_mrr, money_format)
        ws_anual.write(row, 3, goals.get('mrr_pct', 0) / 100, pct_format)
        row += 1
        
        ws_anual.write(row, 0, 'Lojas Entregues', bold_format)
        ws_anual.write(row, 1, total_ytd_stores, normal_format)
        ws_anual.write(row, 2, goals.get('stores_target', 0), normal_format)
        ws_anual.write(row, 3, goals.get('stores_pct', 0) / 100, pct_format)
        row += 2
        
        # Seção 2: Projeções e Necessidades
        ws_anual.write(row, 0, '2. Projeções e Esforço Necessário', title_format)
        row += 1
        ws_anual.write(row, 0, 'Métrica', header_format)
        ws_anual.write(row, 1, 'Valor Calculado', header_format)
        row += 1
        
        ws_anual.write(row, 0, 'Ticket Médio Global Acumulado', normal_format)
        ws_anual.write(row, 1, global_ticket, money_format)
        row += 1
        
        ws_anual.write(row, 0, 'Total de Lojas estimadas p/ bater Meta MRR', bold_format)
        ws_anual.write(row, 1, stores_needed_for_mrr, normal_format)
        row += 1
        
        ws_anual.write(row, 0, 'Run Rate Necessário MRR (por Mês)', bold_format)
        ws_anual.write(row, 1, run_rate_mrr, money_format)
        row += 1
        
        ws_anual.write(row, 0, 'Run Rate Necessário Lojas (por Mês)', bold_format)
        ws_anual.write(row, 1, run_rate_stores, normal_format)
        row += 2
        
        # Seção 3: Histórico Mensal Consolidado
        ws_anual.write(row, 0, '3. Histórico Mensal Consolidado', title_format)
        row += 1
        hist_headers = ['Mês', 'Lojas', 'MRR Produzido', 'Ticket Médio', 'SLA (No Prazo)', 'Tempo Médio']
        for col, h in enumerate(hist_headers):
            ws_anual.write(row, col, h, header_format)
        row += 1
        
        for m in months:
            s_stats = m.get('stats', {})
            ws_anual.write(row, 0, m.get('month', ''), normal_format)
            ws_anual.write(row, 1, s_stats.get('total_stores', 0), normal_format)
            ws_anual.write(row, 2, s_stats.get('total_mrr', 0), money_format)
            ws_anual.write(row, 3, s_stats.get('ticket_medio', 0), money_format)
            ws_anual.write(row, 4, s_stats.get('on_time_pct', 0) / 100, pct_format)
            ws_anual.write(row, 5, s_stats.get('avg_days', 0), normal_format)
            row += 1
            
        # Aba Lojas de Todos os Meses
        ws_lojas = workbook.add_worksheet('Base Consolidada de Lojas')
        ws_lojas.set_column('A:E', 25)
        ws_lojas.set_column('F:I', 15)
        
        ws_lojas.write('A1', 'BASE GERAL DE ENTREGAS (YTD)', title_format)
        row = 2
        headers = ['Mês', 'Loja', 'Responsável', 'Rede', 'Tipo', 'Data Fim', 'MRR', 'Dias Totais', 'No Prazo']
        for col, h in enumerate(headers):
            ws_lojas.write(row, col, h, header_format)
        row += 1
        
        for m in months:
            m_str = m.get('month', '')
            for s in m.get('stores', []):
                ws_lojas.write(row, 0, m_str, normal_format)
                ws_lojas.write(row, 1, s.get('name'), normal_format)
                ws_lojas.write(row, 2, s.get('implantador'), normal_format)
                ws_lojas.write(row, 3, s.get('rede'), normal_format)
                ws_lojas.write(row, 4, s.get('tipo'), normal_format)
                ws_lojas.write(row, 5, s.get('finished_at'), normal_format)
                ws_lojas.write(row, 6, s.get('mrr', 0), money_format)
                ws_lojas.write(row, 7, s.get('days', 0), normal_format)
                ws_lojas.write(row, 8, 'SIM' if s.get('on_time', 0) else 'NÃO', normal_format)
                row += 1

        workbook.close()
        output.seek(0)
        return output

    @staticmethod
    def generate_monthly_implantation_excel(data: dict) -> io.BytesIO:
        output = io.BytesIO()
        workbook = xlsxwriter.Workbook(output, {'in_memory': True})
        
        # --- Formatos ---
        # Cores (Theme)
        primary_color = '#0d9488' # teal-600
        secondary_color = '#f4f4f5' # zinc-100
        text_color = '#18181b' # zinc-900
        white = '#ffffff'
        
        # Headers
        header_format = workbook.add_format({
            'bold': True, 'font_color': white, 'bg_color': primary_color,
            'align': 'center', 'valign': 'vcenter', 'border': 1
        })
        
        # Títulos de Secão
        title_format = workbook.add_format({
            'bold': True, 'font_size': 14, 'font_color': primary_color,
            'bottom': 2
        })
        
        # Texto Normal
        normal_format = workbook.add_format({'font_size': 11, 'color': text_color})
        bold_format = workbook.add_format({'bold': True, 'font_size': 11, 'color': text_color})
        
        # Moeda
        money_format = workbook.add_format({'num_format': 'R$ #,##0.00', 'color': text_color})
        money_bold = workbook.add_format({'num_format': 'R$ #,##0.00', 'bold': True, 'color': text_color})
        
        # Porcentagem
        pct_format = workbook.add_format({'num_format': '0.0%', 'color': text_color})
        
        # Células com Status
        ok_format = workbook.add_format({'bg_color': '#dcfce7', 'font_color': '#166534', 'align': 'center'})
        warn_format = workbook.add_format({'bg_color': '#fee2e2', 'font_color': '#991b1b', 'align': 'center'})
        
        # ==================== ABA 1: RESUMO ====================
        ws_resumo = workbook.add_worksheet('Resumo Executivo')
        ws_resumo.set_column('A:A', 25)
        ws_resumo.set_column('B:B', 20)
        ws_resumo.set_column('C:C', 20)
        ws_resumo.set_column('D:D', 20)
        
        month_str = data.get('month', 'N/A')
        ws_resumo.write('A1', f'RELATÓRIO MENSAL - {month_str}', title_format)
        ws_resumo.write('A2', f'Gerado em: {datetime.now().strftime("%d/%m/%Y %H:%M")}', normal_format)
        
        row = 4
        
        # 1. Metas Anuais
        goals = data.get('annual_goals', {})
        if goals:
            ws_resumo.write(row, 0, 'Metas Anuais (YTD)', title_format)
            row += 1
            headers = ['Métrica', 'Atual', 'Meta', '% Atingido']
            for col, h in enumerate(headers):
                ws_resumo.write(row, col, h, header_format)
            row += 1
            
            # MRR
            ws_resumo.write(row, 0, 'MRR Total', bold_format)
            ws_resumo.write(row, 1, goals.get('mrr_ytd', 0), money_format)
            ws_resumo.write(row, 2, goals.get('mrr_target', 0), money_format)
            ws_resumo.write(row, 3, goals.get('mrr_pct', 0) / 100, pct_format)
            row += 1
            
            # Lojas
            ws_resumo.write(row, 0, 'Lojas Entregues', bold_format)
            ws_resumo.write(row, 1, goals.get('stores_ytd', 0), normal_format)
            ws_resumo.write(row, 2, goals.get('stores_target', 0), normal_format)
            ws_resumo.write(row, 3, goals.get('stores_pct', 0) / 100, pct_format)
            row += 2
            
        # 2. Resumo do Mês
        stats = data.get('stats', {})
        ws_resumo.write(row, 0, 'Indicadores do Mês', title_format)
        row += 1
        
        indicators = [
            ('Lojas Entregues', stats.get('total_stores', 0), normal_format),
            ('MRR Adicionado', stats.get('total_mrr', 0), money_format),
            ('Ticket Médio', stats.get('ticket_medio', 0), money_format),
            ('Tempo Médio (dias)', stats.get('avg_days', 0), normal_format),
            ('Mediana (dias)', stats.get('median_days', 0), normal_format),
            ('No Prazo', f"{stats.get('on_time_count', 0)} ({stats.get('on_time_pct', 0)}%)", normal_format),
            ('Pontos Acumulados', stats.get('total_points', 0), normal_format)
        ]
        
        for name, val, fmt in indicators:
            ws_resumo.write(row, 0, name, bold_format)
            ws_resumo.write(row, 1, val, fmt)
            row += 1
            
        row += 1
        
        # 3. WIP
        wip = data.get('wip_overview', {})
        if wip:
            ws_resumo.write(row, 0, 'Work In Progress (WIP)', title_format)
            row += 1
            ws_resumo.write(row, 0, 'Lojas em Andamento', bold_format)
            ws_resumo.write(row, 1, wip.get('total_wip', 0), normal_format)
            row += 1
            ws_resumo.write(row, 0, 'MRR Backlog Total', bold_format)
            ws_resumo.write(row, 1, wip.get('mrr_backlog', 0), money_format)
            row += 1
            ws_resumo.write(row, 0, '👉 MRR Quase Entregue (Curto-prazo)', normal_format)
            ws_resumo.write(row, 1, wip.get('mrr_quase_entregue', 0), money_format)
            row += 1
            ws_resumo.write(row, 0, '👉 MRR em Risco/Fase Inicial', normal_format)
            ws_resumo.write(row, 1, wip.get('mrr_em_risco', 0), money_format)
            row += 2
            
            if wip.get('board_stages'):
                ws_resumo.write(row, 0, 'Etapa do Board', header_format)
                ws_resumo.write(row, 1, 'Lojas', header_format)
                row += 1
                for stage in wip['board_stages']:
                    ws_resumo.write(row, 0, stage.get('stage', ''), normal_format)
                    ws_resumo.write(row, 1, stage.get('count', 0), normal_format)
                    row += 1
                row += 1

        # 4. Variação Mensal
        variation = data.get('variation')
        if variation:
            ws_resumo.write(row, 0, 'Variação vs Mês Anterior', title_format)
            row += 1
            ws_resumo.write(row, 0, 'MRR Mês a Mês', bold_format)
            ws_resumo.write(row, 1, variation.get('mrr_change', 0), money_format)
            ws_resumo.write(row, 2, variation.get('mrr_change_pct', 0) / 100, pct_format)
            row += 1
            ws_resumo.write(row, 0, 'Lojas Mês a Mês', bold_format)
            ws_resumo.write(row, 1, variation.get('stores_change', 0), normal_format)
            ws_resumo.write(row, 2, variation.get('stores_change_pct', 0) / 100, pct_format)
            row += 2

        # 5. Insights do Mês
        highlights = data.get('highlights')
        if highlights:
            ws_resumo.write(row, 0, 'Insights do Mês', title_format)
            row += 1
            if highlights.get('fastest'):
                ws_resumo.write(row, 0, 'Mais Rápida', bold_format)
                ws_resumo.write(row, 1, f"{highlights['fastest'].get('name')} ({highlights['fastest'].get('days')} dias)", normal_format)
                row += 1
            if highlights.get('slowest'):
                ws_resumo.write(row, 0, 'Mais Longa', bold_format)
                ws_resumo.write(row, 1, f"{highlights['slowest'].get('name')} ({highlights['slowest'].get('days')} dias)", normal_format)
                row += 1
            if highlights.get('top_mrr'):
                ws_resumo.write(row, 0, 'Maior MRR', bold_format)
                ws_resumo.write(row, 1, f"{highlights['top_mrr'].get('name')} (R$ {highlights['top_mrr'].get('mrr'):,.2f})", normal_format)
                row += 1
            late = highlights.get('late_stores', [])
            if late:
                ws_resumo.write(row, 0, 'Fora do Prazo', bold_format)
                ws_resumo.write(row, 1, " | ".join([f"{s['name']} ({s['days']}d)" for s in late]), normal_format)
                row += 1
            row += 1
            row += 1

        # 6. Histograma de SLAs (Curva de Tempo)
        sla_hist = data.get('sla_histogram')
        if sla_hist:
            ws_resumo.write(row, 0, 'Histograma de SLAs (Ciclo Concluído)', title_format)
            row += 1
            ws_resumo.write(row, 0, 'Super-rápidas (< 30 dias)', bold_format)
            ws_resumo.write(row, 1, sla_hist.get('super_rapidas', 0), normal_format)
            row += 1
            ws_resumo.write(row, 0, 'No Padrão (31 a 60 dias)', bold_format)
            ws_resumo.write(row, 1, sla_hist.get('padrao', 0), normal_format)
            row += 1
            ws_resumo.write(row, 0, 'Sinal de Alerta (61 a 90 dias)', bold_format)
            ws_resumo.write(row, 1, sla_hist.get('alerta', 0), normal_format)
            row += 1
            ws_resumo.write(row, 0, 'Atrasadas (> 90 dias)', bold_format)
            ws_resumo.write(row, 1, sla_hist.get('atrasadas', 0), warn_format)
            row += 2

        # 7. Breakdown por Tipo
        tb = data.get('type_breakdown')
        if tb:
            ws_resumo.write(row, 0, 'Breakdown por Tipo', title_format)
            row += 1
            ws_resumo.write(row, 0, 'Tipo', header_format)
            ws_resumo.write(row, 1, 'Qtd', header_format)
            ws_resumo.write(row, 2, 'MRR', header_format)
            ws_resumo.write(row, 3, 'Médias Dias', header_format)
            row += 1
            
            ws_resumo.write(row, 0, 'Matriz', normal_format)
            ws_resumo.write(row, 1, tb.get('matriz_count', 0), normal_format)
            ws_resumo.write(row, 2, tb.get('matriz_mrr', 0), money_format)
            ws_resumo.write(row, 3, tb.get('matriz_avg_days', 0), normal_format)
            row += 1

            ws_resumo.write(row, 0, 'Filial', normal_format)
            ws_resumo.write(row, 1, tb.get('filial_count', 0), normal_format)
            ws_resumo.write(row, 2, tb.get('filial_mrr', 0), money_format)
            ws_resumo.write(row, 3, tb.get('filial_avg_days', 0), normal_format)
            row += 2
            
        # ==================== ABA 2: RANKING ====================
        ws_ranking = workbook.add_worksheet('Ranking')
        ws_ranking.set_column('A:A', 5)
        ws_ranking.set_column('B:B', 25)
        ws_ranking.set_column('C:G', 15)
        
        ws_ranking.write('A1', 'RANKING DE DESEMPENHO', title_format)
        row = 2
        
        headers = ['#', 'Nome', 'Lojas', 'MRR Produzido', 'Média Dias', 'No Prazo %', 'Pontos']
        for col, h in enumerate(headers):
            ws_ranking.write(row, col, h, header_format)
        row += 1
        
        top_1_props = {'bg_color': '#fef3c7', 'bold': True, 'font_size': 11, 'color': text_color}
        top_2_props = {'bg_color': '#f3f4f6', 'bold': True, 'font_size': 11, 'color': text_color}
        top_3_props = {'bg_color': '#ffedd5', 'bold': True, 'font_size': 11, 'color': text_color}
        normal_props = {'font_size': 11, 'color': text_color}
        
        for idx, imp in enumerate(data.get('implantadores', [])):
            base_props = normal_props
            if idx == 0: base_props = top_1_props
            elif idx == 1: base_props = top_2_props
            elif idx == 2: base_props = top_3_props
            
            # Mix with specific cell formats
            fmt = workbook.add_format(base_props)
            
            ws_ranking.write(row, 0, idx + 1, fmt)
            ws_ranking.write(row, 1, imp.get('name'), fmt)
            ws_ranking.write(row, 2, imp.get('stores', 0), fmt)
            
            mrr_props = base_props.copy()
            mrr_props['num_format'] = 'R$ #,##0.00'
            mrr_f = workbook.add_format(mrr_props)
            ws_ranking.write(row, 3, imp.get('mrr', 0), mrr_f)
            
            ws_ranking.write(row, 4, imp.get('avg_days', 0), fmt)
            
            pct_props = base_props.copy()
            pct_props['num_format'] = '0.0%'
            pct_f = workbook.add_format(pct_props)
            ws_ranking.write(row, 5, imp.get('on_time_pct', 0) / 100, pct_f)
            
            ws_ranking.write(row, 6, imp.get('points', 0), fmt)
            row += 1
            
        # ==================== ABA 3: REDES ====================
        ws_redes = workbook.add_worksheet('MRR por Rede')
        ws_redes.set_column('A:A', 30)
        ws_redes.set_column('B:B', 15)
        ws_redes.set_column('C:C', 20)
        ws_redes.set_column('D:D', 60)
        
        ws_redes.write('A1', 'DECOMPOSIÇÃO DE MRR POR REDE', title_format)
        row = 2
        
        headers = ['Rede', 'Qtd Lojas', 'MRR Produzido', 'Lojas']
        for col, h in enumerate(headers):
            ws_redes.write(row, col, h, header_format)
        row += 1
        
        for r in data.get('mrr_by_rede', []):
            ws_redes.write(row, 0, r.get('rede', ''), normal_format)
            ws_redes.write(row, 1, r.get('count', 0), normal_format)
            ws_redes.write(row, 2, r.get('mrr', 0), money_format)
            ws_redes.write(row, 3, ", ".join(r.get('store_names', [])), normal_format)
            row += 1
            
        # ==================== ABA 4: LOJAS ====================
        ws_lojas = workbook.add_worksheet('Lojas Concluídas')
        ws_lojas.set_column('A:D', 25)
        ws_lojas.set_column('E:H', 15)
        
        ws_lojas.write('A1', 'DETALHAMENTO POR LOJA', title_format)
        row = 2
        
        headers = ['Loja', 'Responsável', 'Rede', 'Tipo', 'Data Fim', 'MRR', 'Dias Totais', 'No Prazo']
        for col, h in enumerate(headers):
            ws_lojas.write(row, col, h, header_format)
        row += 1
        
        for s in data.get('stores', []):
            ws_lojas.write(row, 0, s.get('name'), normal_format)
            ws_lojas.write(row, 1, s.get('implantador'), normal_format)
            ws_lojas.write(row, 2, s.get('rede'), normal_format)
            ws_lojas.write(row, 3, s.get('tipo'), normal_format)
            ws_lojas.write(row, 4, s.get('finished_at'), normal_format)
            ws_lojas.write(row, 5, s.get('mrr', 0), money_format)
            ws_lojas.write(row, 6, s.get('days', 0), normal_format)
            
            on_time = s.get('on_time', 0)
            if on_time:
                ws_lojas.write(row, 7, 'SIM', ok_format)
            else:
                ws_lojas.write(row, 7, 'NÃO', warn_format)
            
            row += 1
            
        workbook.close()
        output.seek(0)
        return output
