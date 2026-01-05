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

