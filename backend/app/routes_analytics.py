from flask import Blueprint, jsonify, request, Response
from app.services.analytics_service import AnalyticsService
from datetime import datetime

analytics_bp = Blueprint('analytics_bp', __name__)

@analytics_bp.route('/api/analytics/kpi-cards', methods=['GET'])
def get_kpi_cards():
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
def get_trends():
    try:
        months = int(request.args.get('months', 6))
        implantador = request.args.get('implantador')
        data = AnalyticsService.get_monthly_trends(months, implantador)
        return jsonify(data), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@analytics_bp.route('/api/analytics/performance', methods=['GET'])
def get_performance():
    try:
        implantador = request.args.get('implantador')
        data = AnalyticsService.get_performance_ranking(implantador)
        return jsonify(data), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@analytics_bp.route('/api/analytics/bottlenecks', methods=['GET'])
def get_bottlenecks():
    try:
        implantador = request.args.get('implantador')
        data = AnalyticsService.get_bottlenecks(implantador)
        return jsonify(data), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500
@analytics_bp.route('/api/analytics/implantador-detail/<path:implantador_name>', methods=['GET'])
def get_performance_detail(implantador_name):
    try:
        data = AnalyticsService.get_implantador_details(implantador_name)
        return jsonify(data), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@analytics_bp.route('/api/analytics/export-csv', methods=['GET'])
def export_excel_report():
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
def get_capacity():
    try:
        data = AnalyticsService.get_team_capacity()
        return jsonify(data), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@analytics_bp.route('/api/analytics/forecast', methods=['GET'])
def get_forecast():
    try:
        months = int(request.args.get('months', 6))
        data = AnalyticsService.get_financial_forecast(months)
        return jsonify(data), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@analytics_bp.route('/api/analytics/risk-scatter', methods=['GET'])
def get_risk_scatter():
    try:
        data = AnalyticsService.get_risk_scatter()
        return jsonify(data), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@analytics_bp.route('/api/analytics/distribution', methods=['GET'])
def get_distribution():
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

