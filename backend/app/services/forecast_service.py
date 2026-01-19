import re
from app.models import db, Store
from datetime import datetime
from dateutil.relativedelta import relativedelta
from sqlalchemy import or_, and_

class ForecastService:
    
    VALID_UFS = {
        'AC', 'AL', 'AM', 'AP', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 
        'MG', 'MS', 'MT', 'PA', 'PB', 'PE', 'PI', 'PR', 'RJ', 'RN', 
        'RO', 'RR', 'RS', 'SC', 'SE', 'SP', 'TO'
    }

    @staticmethod
    def parse_estado_from_address(address: str) -> str | None:
        """
        Extrai a UF do endereço seguindo as regras:
        1. Procurar padrão " - XX" ou ", XX" ou " XX" no final ou meio, onde XX é UF válida.
        2. Validar contra lista oficial.
        """
        if not address:
            return None
            
        # Normalizar para uppercase
        addr_upper = address.upper()
        
        # Regex para encontrar UFs (espaço/virgula/hifen + UF + fim de string ou espaço/virgula)
        # Ex: " - RJ", ", SP", " MG "
        # Prioriza matches que parecem estar no final ou segregados
        patterns = [
            r'[\-,]\s*([A-Z]{2})\s*$',    # Final da string: ", RJ" ou "- RJ"
            r'\s+([A-Z]{2})\s*\d{5}-?\d{3}', # Antes do CEP: "RJ 20000-000"
            r'[\-,]\s*([A-Z]{2})[\-,]',   # Meio delimitado: ", RJ,"
            r'\s+([A-Z]{2})$'             # Final solto: " RJ"
        ]
        
        for p in patterns:
            matches = re.findall(p, addr_upper)
            for m in matches:
                if m in ForecastService.VALID_UFS:
                    return m
                    
        return None

    @staticmethod
    def get_forecast_data(year=None, month=None, implantador=None, rede=None, status=None):
        """
        Retorna dados de forecast para a tela de CS.
        Calcula datas preveistas, status projetado e agrupa por mês.
        """
        query = db.session.query(Store).filter(Store.include_in_forecast == True)
        
        if implantador:
            query = query.filter(Store.implantador == implantador)
        
        if rede:
            query = query.filter(Store.rede == rede)
            
        stores = query.all()
        results = []
        
        for s in stores:
            # 1. Calcular Data Prevista Go Live
            # Prioridade: Manual > Contratual (SLA) > Estimada
            go_live_date = None
            
            if s.manual_go_live_date:
                go_live_date = s.manual_go_live_date
            elif s.effective_started_at:
                days = s.tempo_contrato or 90
                go_live_date = s.effective_started_at + relativedelta(days=days)
            
            # Se não tiver data, não entra no forecast de tempo, mas listamos?
            if not go_live_date: 
                go_live_date = datetime.now() + relativedelta(months=1) # Fallback seguro
            
            # 2. Calcular Status
            # DONE (Ja foi), ATRASADA, DENTRO_PRAZO
            forecast_status = 'EM_IMPLANTACAO'
            today = datetime.now()
            
            is_completed = s.status_norm == 'DONE' or s.manual_finished_at is not None
            
            if is_completed:
                forecast_status = 'GO_LIVE'
            elif today > go_live_date:
                forecast_status = 'ATRASADA'
            else:
                forecast_status = 'DENTRO_PRAZO'
                
            # Filtro de Status (se solicitado)
            if status and status != forecast_status:
                continue
                
            # 3. Extrair UF se não existir (one-time logic or always check?)
            # Vamos tentar preencher se estiver vazio no objeto (mas não salvar no banco aqui pa performance, 
            # ideal é salvar no sync ou update)
            if not s.state_uf and s.address:
                s.state_uf = ForecastService.parse_estado_from_address(s.address)
                
            # 4. Projeções
            taxa = s.order_rate or 0.0
            pedidos = s.projected_orders or 0
            # Se tiver taxa e pedidos base, calcula. Se tiver só pedidos (flat), usa.
            # Regra user: "pedidos_previstos_mes = projecao_pedidos_origem * taxa_pedido"
            # Assumindo q 'projected_orders' é a base.
            
            final_orders = 0
            if taxa > 0:
                final_orders = int(pedidos * taxa) # Ex: 1000 * 0.8 = 800
            else:
                final_orders = pedidos # Se taxa 0, assume valor cheio se preenchido, ou 0.
            
            # MRR (Se valor unitário existir... não temos valor unitário por pedido no modelo ainda, 
            # user falou "mrr_previsto_pedidos = pedidos * valor_unitario". 
            # Vou assumir ticket médio padrão ou 0 por enquanto, ou usar mensalidade como proxy?)
            # O user disse: "(se não existir valor unitário, manter apenas pedidos + taxa)". 
            # ok, MRR de Pedidos é diferente de MRR de Assinatura.
            # Vou deixar MRR Pedidos como 0 por enquanto ou criar campo se precisar.
            mrr_pedidos = 0.0 
            
            # 5. Agrupamento
            month_key = go_live_date.strftime('%Y-%m')
            
            # Filtro de Ano/Mes (se solicitado)
            # Filtro de Ano (se solicitado)
            if year:
                # month_key format: YYYY-MM
                if not month_key.startswith(str(year)):
                    continue
                    
            # Filtro de Mês (se solicitado)
            if month:
                target_month = str(month).zfill(2)
                current_month = month_key.split('-')[1]
                if current_month != target_month:
                    continue

            results.append({
                "id": s.id,
                "store_name": s.store_name,
                "rede": s.rede or s.store_name,
                "implantador": s.implantador,
                "state_uf": s.state_uf,
                "tipo_loja": s.tipo_loja,
                "deployment_type": s.deployment_type,
                "had_ecommerce": s.had_ecommerce,
                "previous_platform": s.previous_platform,
                "projected_orders": final_orders,
                "order_rate": taxa,
                "projected_mrr_orders": mrr_pedidos,
                "go_live_date": go_live_date.strftime('%Y-%m-%d'),
                "month_go_live": month_key,
                "status": forecast_status,
                "etapa": s.status, # Etapa atual
                "start_date": s.effective_started_at.strftime('%Y-%m-%d') if s.effective_started_at else None,
                "obs": s.forecast_obs
            })
            
        # Ordenar por data
        results.sort(key=lambda x: x['go_live_date'])
        return results

    @staticmethod
    def get_summary_by_month():
        """
        Retorna card steps resumidos por mês para o topo da tela.
        """
        all_data = ForecastService.get_forecast_data()
        summary = {}
        
        for item in all_data:
            m = item['month_go_live']
            if m not in summary:
                summary[m] = {
                    'month': m,
                    'total_stores': 0,
                    'matriz_count': 0,
                    'filial_count': 0,
                    'total_orders': 0,
                    'total_mrr': 0,
                    'risk_count': 0
                }
            
            summary[m]['total_stores'] += 1
            if item['tipo_loja'] == 'Matriz': summary[m]['matriz_count'] += 1
            else: summary[m]['filial_count'] += 1
            
            summary[m]['total_orders'] += item['projected_orders']
            # MRR de Mensalidade ou Pedido? User falou "total de MRR previsto". 
            # Geralmente é o da assinatura + pedidos. Vou somar 0 por enquanto para pedidos.
            
            if item['status'] == 'ATRASADA':
                summary[m]['risk_count'] += 1
                
        return sorted(summary.values(), key=lambda x: x['month'])
