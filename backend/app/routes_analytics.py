from flask import Blueprint, jsonify, request, Response
from app.services.analytics_service import AnalyticsService
from app.services.security_service import require_auth
from datetime import datetime

analytics_bp = Blueprint('analytics_bp', __name__)

@analytics_bp.route('/api/analytics/kpi-cards', methods=['GET'])
@require_auth
def get_kpi_cards(payload):
    try:
        start_date_str = request.args.get('start_date')
        end_date_str = request.args.get('end_date')
        
        start_date = None
        end_date = None
        
        if start_date_str:
            try:
                start_date = datetime.strptime(start_date_str, '%Y-%m-%d')
            except ValueError:
                pass
                
        if end_date_str:
            try:
                end_date = datetime.strptime(end_date_str, '%Y-%m-%d')
            except ValueError:
                pass
                
        # Filtros avançados
        implantador = request.args.get('implantador')
        
        data = AnalyticsService.get_kpi_cards(start_date, end_date, implantador)
        return jsonify(data), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@analytics_bp.route('/api/analytics/trends', methods=['GET'])
@require_auth
def get_trends(payload):
    try:
        months = int(request.args.get('months', 6))
        implantador = request.args.get('implantador')
        data = AnalyticsService.get_monthly_trends(months, implantador)
        return jsonify(data), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@analytics_bp.route('/api/analytics/annual-trends', methods=['GET'])
@require_auth
def get_annual_trends(payload):
    try:
        year = request.args.get('year')
        if year:
            year = int(year)
        else:
            year = datetime.now().year
        data = AnalyticsService.get_annual_trends(year)
        return jsonify(data), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@analytics_bp.route('/api/analytics/performance', methods=['GET'])
@require_auth
def get_performance(payload):
    try:
        implantador = request.args.get('implantador')
        data = AnalyticsService.get_performance_ranking(implantador)
        return jsonify(data), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@analytics_bp.route('/api/analytics/bottlenecks', methods=['GET'])
@require_auth
def get_bottlenecks(payload):
    try:
        implantador = request.args.get('implantador')
        data = AnalyticsService.get_bottlenecks(implantador)
        return jsonify(data), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500
@analytics_bp.route('/api/analytics/implantador-detail/<path:implantador_name>', methods=['GET'])
@require_auth
def get_performance_detail(payload, implantador_name):
    try:
        data = AnalyticsService.get_implantador_details(implantador_name)
        return jsonify(data), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@analytics_bp.route('/api/analytics/export-csv', methods=['GET'])
@require_auth
def export_excel_report(payload):
    try:
        start_date_str = request.args.get('start_date')
        end_date_str = request.args.get('end_date')
        implantador = request.args.get('implantador')
        
        start_date = None
        end_date = None
        
        if start_date_str:
            try: start_date = datetime.strptime(start_date_str, '%Y-%m-%d')
            except: pass
        if end_date_str:
            try: end_date = datetime.strptime(end_date_str, '%Y-%m-%d')
            except: pass
            
        excel_file = AnalyticsService.export_analytics_excel(start_date, end_date, implantador)
        
        filename = f"analytics_report_{datetime.now().strftime('%Y%m%d_%H%M%S')}.xlsx"
        
        from flask import send_file
        return send_file(
            excel_file,
            mimetype="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            as_attachment=True,
            download_name=filename
        )
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@analytics_bp.route('/api/analytics/capacity', methods=['GET'])
@require_auth
def get_capacity(payload):
    try:
        data = AnalyticsService.get_team_capacity()
        return jsonify(data), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@analytics_bp.route('/api/analytics/forecast', methods=['GET'])
@require_auth
def get_forecast(payload):
    try:
        months = int(request.args.get('months', 6))
        data = AnalyticsService.get_financial_forecast(months)
        return jsonify(data), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@analytics_bp.route('/api/analytics/risk-scatter', methods=['GET'])
@require_auth
def get_risk_scatter(payload):
    try:
        data = AnalyticsService.get_risk_scatter()
        return jsonify(data), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@analytics_bp.route('/api/analytics/distribution', methods=['GET'])
@require_auth
def get_distribution(payload):
    try:
        from app.models import Store
        from sqlalchemy import or_
        
        # 1. Distribuição por Etapa (Gargalo Atual)
        # Active = Valendo None em todas as datas de fim (Mesma lógica do get_stores)
        active_stores = Store.query.filter(
            Store.manual_finished_at == None, 
            Store.end_real_at == None, 
            Store.finished_at == None
        ).all()
        
        step_counts = {}
        erp_counts = {}
        
        for s in active_stores:
            # ERP (Normalização)
            erp_raw = s.erp or "Não Informado"
            erp = erp_raw.strip().upper()
            erp_counts[erp] = erp_counts.get(erp, 0) + 1
            
            # Etapa Ativa
            active_step_name = "Não Iniciado"
            found_active = False
            if s.steps:
                sorted_steps = sorted(s.steps, key=lambda x: x.id)
                for step in sorted_steps:
                    if step.start_real_at and not step.end_real_at:
                        active_step_name = step.step_name.strip() # Manter case original por enquanto, mas limpar espaços
                        found_active = True
                        break
                
                if not found_active:
                    if all(st.end_real_at for st in s.steps):
                         active_step_name = "Finalizando"
                    elif not any(st.start_real_at for st in s.steps):
                         active_step_name = "Aguardando Início"
            
            step_counts[active_step_name] = step_counts.get(active_step_name, 0) + 1

        # Ordenação e Agrupamento ERPs (Top 10)
        sorted_erps = sorted(erp_counts.items(), key=lambda x: x[1], reverse=True)
        top_erps = dict(sorted_erps[:10])
        if len(sorted_erps) > 10:
            top_erps['OUTROS'] = sum(v for k, v in sorted_erps[10:])

        # Ordenação e Agrupamento Steps (Top 15 para evitar poluição visual)
        sorted_steps = sorted(step_counts.items(), key=lambda x: x[1], reverse=True)
        top_steps = dict(sorted_steps[:15])
        if len(sorted_steps) > 15:
             top_steps['OUTROS PROCESSOS'] = sum(v for k, v in sorted_steps[15:])
            
        return jsonify({
            "steps": top_steps,
            "erps": top_erps
        }), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@analytics_bp.route('/api/analytics/financeiro-implantacao', methods=['GET'])
@require_auth
def get_financeiro_implantacao(payload):
    """
    Endpoint financeiro para a aba Financeiro do painel de analytics.
    Classifica lojas por estado de cobrança e retorna resumo + lista operacional.
    """
    try:
        from app.models import Store
        from app.services.analytics_service import DATA_CUTOFF

        start_date_str = request.args.get('start_date')
        end_date_str = request.args.get('end_date')
        implantador = request.args.get('implantador')

        start_date = None
        end_date = None

        if start_date_str:
            try:
                start_date = datetime.strptime(start_date_str, '%Y-%m-%d')
            except ValueError:
                pass
        if end_date_str:
            try:
                end_date = datetime.strptime(end_date_str, '%Y-%m-%d')
            except ValueError:
                pass

        data_corte_financeiro = datetime(2026, 1, 1)
        if start_date is None or start_date < data_corte_financeiro:
            start_date = data_corte_financeiro

        # Query base: all stores
        query = Store.query

        if implantador:
            query = query.filter(Store.implantador == implantador)

        all_stores = query.all()

        def normalizar_status_financeiro(valor):
            import unicodedata
            texto = (valor or '').strip().lower()
            return ''.join(
                char for char in unicodedata.normalize('NFKD', texto)
                if not unicodedata.combining(char)
            )

        def status_sem_informacao(status):
            return status in {'', '0', '0.0', 'none', 'null', 'nan', '-'}

        def status_pagante(status):
            if status_sem_informacao(status):
                return False
            if 'nao' in status or 'devendo' in status or 'pendente' in status:
                return False
            return status in {'pago', 'em dia', 'paga mensalidade', 'pagante'} or 'pago' in status or 'em dia' in status

        def status_pronto_cobranca(status):
            if status_sem_informacao(status):
                return False
            return 'pronta' in status or 'cobranca' in status

        def status_devedor(status):
            return 'devend' in status

        def status_cancelado(status):
            return 'cancelad' in status

        # Classify stores
        lojas_concluidas_pagantes = 0
        lojas_concluidas_nao_pagantes = 0
        lojas_concluidas_sem_status = 0
        lojas_concluidas_devedores = 0
        lojas_concluidas_canceladas = 0
        lojas_em_implantacao = 0
        lojas_prontas_para_cobranca = 0
        mrr_ativado = 0.0
        mrr_concluido_nao_pagante = 0.0
        mrr_concluido_sem_status = 0.0
        mrr_concluido_devedor = 0.0
        mrr_concluido_cancelado = 0.0
        mrr_em_implantacao = 0.0
        mrr_pendente_cobranca = 0.0
        mensalidade_pendente_entrada = 0.0
        lojas_detalhe = []

        for store in all_stores:
            mensalidade = store.valor_mensalidade or 0.0
            finished = store.effective_finished_at
            is_done = store.status_norm == 'DONE'
            financeiro = normalizar_status_financeiro(store.financeiro_status)

            # Date filter for concluded stores: financial analytics follows the 2026 implementation cut.
            if is_done:
                if not finished:
                    continue
                if finished < start_date:
                    continue
                if end_date and finished > end_date:
                    continue

            # Classification logic
            if is_done:
                if status_pagante(financeiro):
                    status_cobranca = 'pagante'
                    lojas_concluidas_pagantes += 1
                    mrr_ativado += mensalidade
                elif status_pronto_cobranca(financeiro):
                    status_cobranca = 'pendente_cobranca'
                    lojas_prontas_para_cobranca += 1
                    mrr_pendente_cobranca += mensalidade
                    mensalidade_pendente_entrada += mensalidade
                elif status_sem_informacao(financeiro):
                    status_cobranca = 'sem_status_financeiro'
                    lojas_concluidas_sem_status += 1
                    mrr_concluido_sem_status += mensalidade
                    mensalidade_pendente_entrada += mensalidade
                elif status_devedor(financeiro):
                    status_cobranca = 'devedor'
                    lojas_concluidas_devedores += 1
                    mrr_concluido_devedor += mensalidade
                    mensalidade_pendente_entrada += mensalidade
                elif status_cancelado(financeiro):
                    status_cobranca = 'cancelado'
                    lojas_concluidas_canceladas += 1
                    mrr_concluido_cancelado += mensalidade
                else:
                    status_cobranca = 'nao_pagante'
                    lojas_concluidas_nao_pagantes += 1
                    mrr_concluido_nao_pagante += mensalidade
                    mensalidade_pendente_entrada += mensalidade
            else:
                if store.is_scheduled:
                    continue
                status_cobranca = 'em_implantacao'
                lojas_em_implantacao += 1
                mrr_em_implantacao += mensalidade

            # Calculate days since conclusion
            dias_desde_conclusao = None
            if finished:
                delta = datetime.now() - finished
                dias_desde_conclusao = max(0, delta.days)

            # Active step name
            etapa = 'Concluída' if is_done else 'Não iniciado'
            if not is_done and store.steps:
                sorted_steps = sorted(store.steps, key=lambda x: x.id)
                for step in sorted_steps:
                    if step.start_real_at and not step.end_real_at:
                        etapa = step.step_name.strip()
                        break

            lojas_detalhe.append({
                'id': store.id,
                'nome': store.store_name,
                'implantador': store.implantador,
                'etapa': etapa,
                'status_cobranca': status_cobranca,
                'mensalidade': mensalidade,

            # Calculate days since conclusion
            dias_desde_conclusao = None
            if finished:
                delta = datetime.now() - finished
                dias_desde_conclusao = max(0, delta.days)

            # Active step name
            etapa = 'Concluída' if is_done else 'Não iniciado'
            if not is_done and store.steps:
                sorted_steps = sorted(store.steps, key=lambda x: x.id)
                for step in sorted_steps:
                    if step.start_real_at and not step.end_real_at:
                        etapa = step.step_name.strip()
                        break

            lojas_detalhe.append({
                'id': store.id,
                'nome': store.store_name,
                'implantador': store.implantador,
                'etapa': etapa,
                'status_cobranca': status_cobranca,
                'mensalidade': mensalidade,
                'data_conclusao': finished.isoformat() if finished else None,
                'data_prevista_cobranca': None,
                'dias_desde_conclusao': dias_desde_conclusao,
            })

        # Sort: non-paying concluded first, then by days_since_conclusion descending
        lojas_detalhe.sort(
            key=lambda x: (
                0 if x['status_cobranca'] in {'nao_pagante', 'sem_status_financeiro', 'devedor'} else 1 if x['status_cobranca'] == 'pendente_cobranca' else 2,
                -(x['dias_desde_conclusao'] or 0),
            )
        )

        return jsonify({
            'resumo': {
                'lojas_concluidas_pagantes': lojas_concluidas_pagantes,
                'lojas_concluidas_nao_pagantes': lojas_concluidas_nao_pagantes + lojas_concluidas_sem_status + lojas_concluidas_devedores,
                'lojas_concluidas_nao_pagantes_explicitas': lojas_concluidas_nao_pagantes,
                'lojas_concluidas_sem_status': lojas_concluidas_sem_status,
                'lojas_concluidas_devedores': lojas_concluidas_devedores,
                'lojas_concluidas_canceladas': lojas_concluidas_canceladas,
                'mensalidade_pendente_entrada': mensalidade_pendente_entrada,
                'mrr_ativado': mrr_ativado,
                'mrr_concluido_nao_pagante': mrr_concluido_nao_pagante,
                'mrr_concluido_sem_status': mrr_concluido_sem_status,
                'mrr_concluido_devedor': mrr_concluido_devedor,
                'mrr_concluido_cancelado': mrr_concluido_cancelado,
                'mrr_em_implantacao': mrr_em_implantacao,
                'mrr_pendente_cobranca': mrr_pendente_cobranca,
                'lojas_em_implantacao': lojas_em_implantacao,
                'lojas_prontas_para_cobranca': lojas_prontas_para_cobranca,
            },
            'lojas': lojas_detalhe,
        }), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500
