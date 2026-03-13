import io
from fpdf import FPDF
from datetime import datetime

class PDFReportDoc(FPDF):
    def __init__(self, month_str, title="Relatório de Implantação"):
        super().__init__()
        self.month_str = month_str
        self.title_text = title
        self.set_auto_page_break(auto=True, margin=15)
        
    def add_page(self, *args, **kwargs):
        super().add_page(*args, **kwargs)
        # Background escuro (zinc-950)
        self.set_fill_color(9, 9, 11)
        self.rect(0, 0, 210, 297, style='F')

    def header(self):
        # Header area (zinc-900)
        self.set_fill_color(24, 24, 27)
        self.rect(0, 0, 210, 25, style='F')
        
        self.set_font("helvetica", "B", 18)
        self.set_text_color(13, 148, 136) # Teal 600
        self.set_xy(10, 5)
        self.cell(0, 10, f"{self.title_text}", border=False, align="L")
        
        self.set_font("helvetica", "", 12)
        self.set_text_color(249, 115, 22) # Orange 500
        self.set_xy(10, 14)
        self.cell(0, 8, f"Mês de Referência: {self.month_str}", border=False, align="L")
        
        self.set_font("helvetica", "", 9)
        self.set_text_color(113, 113, 122) # Zinc 500
        self.set_xy(0, 10)
        self.cell(200, 10, f"Processado em {datetime.now().strftime('%d/%m/%Y %H:%M')}", border=False, align="R")
        
        self.set_y(35)

    def footer(self):
        self.set_y(-15)
        self.set_font("helvetica", "I", 8)
        self.set_text_color(113, 113, 122)
        self.cell(0, 10, f"Página {self.page_no()}", align="C")

class PDFReportService:
    @staticmethod
    def _format_money(value):
        try:
            val = float(value)
            return f"R$ {val:,.2f}".replace(",", "X").replace(".", ",").replace("X", ".")
        except:
            return "R$ 0,00"
            
    @staticmethod
    def generate_monthly_implantation_pdf(data: dict) -> io.BytesIO:
        month_str = data.get('month', 'N/A')
        pdf = PDFReportDoc(month_str, "Relatório Mensal de Implantação")
        pdf.add_page()
        
        # Paleta de Cores
        teal = (13, 148, 136)
        orange = (249, 115, 22)
        white = (250, 250, 250)
        zinc_800 = (39, 39, 42)     # Fundo dos cards
        zinc_900 = (24, 24, 27)     # Borda dos cards
        zinc_400 = (161, 161, 170)  # Textos secundários
        green = (34, 197, 94)
        red = (239, 68, 68)
        
        def card_title(text):
            pdf.set_font("helvetica", "B", 12)
            pdf.set_text_color(*white)
            pdf.set_fill_color(*zinc_800)
            pdf.set_draw_color(*zinc_900)
            pdf.cell(0, 8, f"  {text}", border=1, fill=True, new_x="LMARGIN", new_y="NEXT")
            
        def data_row(label, value, is_money=False, color_val=white, bg_color=(24, 24, 27)):
            pdf.set_font("helvetica", "", 10)
            pdf.set_text_color(*zinc_400)
            pdf.set_fill_color(*bg_color)
            pdf.set_draw_color(*zinc_800)
            pdf.cell(95, 8, f"  {label}", border=1, fill=True)
            
            pdf.set_font("helvetica", "B", 10)
            pdf.set_text_color(*color_val)
            val_str = PDFReportService._format_money(value) if is_money else str(value)
            pdf.cell(95, 8, f"{val_str}  ", border=1, fill=True, align="R", new_x="LMARGIN", new_y="NEXT")

        # --- 1. METAS ANUAIS ---
        goals = data.get('annual_goals', {})
        if goals:
            card_title("Progresso das Metas Anuais (YTD)")
            pdf.set_font("helvetica", "B", 9)
            pdf.set_text_color(*zinc_400)
            pdf.set_fill_color(*zinc_900)
            pdf.cell(60, 7, " Métrica", border=1, fill=True)
            pdf.cell(45, 7, " Atual", border=1, fill=True, align="C")
            pdf.cell(45, 7, " Meta", border=1, fill=True, align="C")
            pdf.cell(40, 7, " Atingimento", border=1, fill=True, align="C", new_x="LMARGIN", new_y="NEXT")
            
            # MRR
            pdf.set_font("helvetica", "", 10)
            pdf.set_text_color(*white)
            pdf.set_fill_color(30, 30, 35)
            pdf.cell(60, 8, " MRR Adicionado", border=1, fill=True)
            pdf.set_text_color(*teal)
            pdf.cell(45, 8, PDFReportService._format_money(goals.get('mrr_ytd', 0)), border=1, fill=True, align="C")
            pdf.set_text_color(*zinc_400)
            pdf.cell(45, 8, PDFReportService._format_money(goals.get('mrr_target', 0)), border=1, fill=True, align="C")
            pct_mrr = goals.get('mrr_pct', 0)
            pdf.set_text_color(*(green if pct_mrr >= 100 else orange))
            pdf.cell(40, 8, f"{pct_mrr}%", border=1, fill=True, align="C", new_x="LMARGIN", new_y="NEXT")
            
            # Lojas
            pdf.set_text_color(*white)
            pdf.cell(60, 8, " Lojas Entregues", border=1, fill=True)
            pdf.set_text_color(*teal)
            pdf.cell(45, 8, str(goals.get('stores_ytd', 0)), border=1, fill=True, align="C")
            pdf.set_text_color(*zinc_400)
            pdf.cell(45, 8, str(goals.get('stores_target', 0)), border=1, fill=True, align="C")
            pct_stores = goals.get('stores_pct', 0)
            pdf.set_text_color(*(green if pct_stores >= 100 else orange))
            pdf.cell(40, 8, f"{pct_stores}%", border=1, fill=True, align="C", new_x="LMARGIN", new_y="NEXT")
            pdf.ln(5)

        # --- 2. RESUMO DO MÊS ---
        stats = data.get('stats', {})
        card_title("Resumo Executivo Mensal")
        data_row("Lojas Entregues", stats.get('total_stores', 0), color_val=teal)
        data_row("MRR Adicionado", stats.get('total_mrr', 0), is_money=True, color_val=teal, bg_color=(30, 30, 35))
        data_row("Ticket Médio", stats.get('ticket_medio', 0), is_money=True)
        data_row("Pontuação da Equipe", stats.get('total_points', 0), bg_color=(30, 30, 35))
        data_row("Tempo Médio de Implantação", f"{stats.get('avg_days', 0)} dias", color_val=orange)
        
        on_time_count = stats.get('on_time_count', 0)
        on_time_pct = stats.get('on_time_pct', 0)
        ot_color = green if on_time_pct >= 90 else (orange if on_time_pct >= 70 else red)
        data_row("Entregas no Prazo (SLA)", f"{on_time_count} lojas ({on_time_pct}%)", color_val=ot_color, bg_color=(30, 30, 35))
        pdf.ln(5)

        # --- 3. WORK IN PROGRESS ---
        wip = data.get('wip_overview')
        if wip:
            card_title("Work In Progress (WIP)")
            data_row("Total de Lojas em Andamento", wip.get('total_wip', 0), color_val=white)
            data_row("MRR em Backlog Estimado", wip.get('mrr_backlog', 0), is_money=True, color_val=teal, bg_color=(30, 30, 35))
            pdf.ln(5)

        # --- 4. RANKING TOP 5 ---
        implantadores = data.get('implantadores', [])
        if implantadores:
            pdf.add_page()
            card_title("Ranking de Desempenho (Top Implantadores)")
            
            pdf.set_font("helvetica", "B", 9)
            pdf.set_text_color(*zinc_400)
            pdf.set_fill_color(*zinc_900)
            pdf.cell(10, 8, " #", border=1, fill=True)
            pdf.cell(60, 8, " Profissional", border=1, fill=True)
            pdf.cell(20, 8, " Lojas", border=1, fill=True, align="C")
            pdf.cell(40, 8, " MRR", border=1, fill=True, align="C")
            pdf.cell(30, 8, " SLA", border=1, fill=True, align="C")
            pdf.cell(30, 8, " Pontos", border=1, fill=True, align="C", new_x="LMARGIN", new_y="NEXT")
            
            pdf.set_font("helvetica", "", 10)
            for idx, imp in enumerate(implantadores):
                bg = (39, 39, 42) if idx % 2 == 0 else (24, 24, 27)
                pdf.set_fill_color(*bg)
                
                # Cores do pódio
                if idx == 0:
                    pdf.set_text_color(250, 204, 21) # Amarelo (Ouro)
                    pdf.set_font("helvetica", "B", 10)
                elif idx == 1:
                    pdf.set_text_color(212, 212, 216) # Prata
                    pdf.set_font("helvetica", "B", 10)
                elif idx == 2:
                    pdf.set_text_color(217, 119, 6) # Bronze
                    pdf.set_font("helvetica", "B", 10)
                else:
                    pdf.set_text_color(*white)
                    pdf.set_font("helvetica", "", 10)
                    
                pdf.cell(10, 8, f" {idx+1}", border=1, fill=True)
                pdf.cell(60, 8, f" {imp.get('name', '')[:25]}", border=1, fill=True)
                
                pdf.set_text_color(*white)
                pdf.set_font("helvetica", "", 10)
                pdf.cell(20, 8, str(imp.get('stores', 0)), border=1, fill=True, align="C")
                pdf.set_text_color(*teal)
                pdf.cell(40, 8, PDFReportService._format_money(imp.get('mrr', 0)), border=1, fill=True, align="C")
                
                sla_pct = imp.get('on_time_pct', 0)
                pdf.set_text_color(*(green if sla_pct >= 90 else (orange if sla_pct >= 70 else red)))
                pdf.cell(30, 8, f"{sla_pct}%", border=1, fill=True, align="C")
                
                pdf.set_text_color(*white)
                pdf.cell(30, 8, str(imp.get('points', 0)), border=1, fill=True, align="C", new_x="LMARGIN", new_y="NEXT")
            
            pdf.ln(5)
            
        # --- 5. TODAS AS LOJAS CONCLUÍDAS ---
        stores = data.get('stores', [])
        if stores:
            pdf.add_page()
            card_title("Detalhamento de Entregas (Lojas Concluídas)")
            
            pdf.set_font("helvetica", "B", 8)
            pdf.set_text_color(*zinc_400)
            pdf.set_fill_color(*zinc_900)
            pdf.cell(45, 8, " Loja", border=1, fill=True)
            pdf.cell(25, 8, " Rede", border=1, fill=True)
            pdf.cell(45, 8, " Responsável", border=1, fill=True)
            pdf.cell(25, 8, " Data Fim", border=1, fill=True, align="C")
            pdf.cell(15, 8, " Dias", border=1, fill=True, align="C")
            pdf.cell(35, 8, " MRR", border=1, fill=True, align="R", new_x="LMARGIN", new_y="NEXT")
            
            pdf.set_font("helvetica", "", 8)
            for idx, s in enumerate(stores):
                bg = (39, 39, 42) if idx % 2 == 0 else (24, 24, 27)
                pdf.set_fill_color(*bg)
                
                pdf.set_text_color(*white)
                pdf.cell(45, 8, f" {s.get('name', '')[:25]}", border=1, fill=True)
                
                pdf.set_text_color(*zinc_400)
                pdf.cell(25, 8, f" {s.get('rede', '')[:15]}", border=1, fill=True)
                
                pdf.set_text_color(*white)
                pdf.cell(45, 8, f" {s.get('implantador', '')[:25]}", border=1, fill=True)
                
                pdf.set_text_color(*zinc_400)
                pdf.cell(25, 8, f" {s.get('finished_at', '')}", border=1, fill=True, align="C")
                
                on_time = s.get('on_time', 0)
                pdf.set_text_color(*(green if on_time else red))
                pdf.cell(15, 8, str(s.get('days', 0)), border=1, fill=True, align="C")
                
                pdf.set_text_color(*teal)
                pdf.cell(35, 8, f"{PDFReportService._format_money(s.get('mrr', 0))} ", border=1, fill=True, align="R", new_x="LMARGIN", new_y="NEXT")

        output = io.BytesIO()
        pdf.output(output)
        output.seek(0)
        return output
