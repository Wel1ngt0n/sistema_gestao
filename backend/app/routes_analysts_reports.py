from flask import Blueprint, jsonify, request
from app.services.security_service import require_auth
from app.services.analysts_report_service import AnalystsReportService
from datetime import datetime

analysts_reports_bp = Blueprint('analysts_reports', __name__, url_prefix='/api/reports/implantadores')

@analysts_reports_bp.route('/resumo', methods=['GET'])
@require_auth
def get_analysts_resume(payload):
    """
    Retorna a Visão Comparativa de todos os implantadores (Aba 1).
    """
    try:
        start_str = request.args.get('start')
        end_str = request.args.get('end')
        start_date = datetime.fromisoformat(start_str.replace('Z', '+00:00')).replace(tzinfo=None) if start_str else None
        end_date = datetime.fromisoformat(end_str.replace('Z', '+00:00')).replace(tzinfo=None) if end_str else None
        
        data = AnalystsReportService.get_team_resume(start_date, end_date)
        return jsonify(data), 200
    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500

@analysts_reports_bp.route('/cockpit', methods=['GET'])
@require_auth
def get_team_cockpit(payload):
    """
    IA JARVIS: Retorna visão gerencial com heurísticas de decisão.
    """
    try:
        start_date = request.args.get('start_date')
        end_date = request.args.get('end_date')
        
        # Converter se necessário
        if start_date:
            from dateutil.parser import parse
            start_date = parse(start_date).replace(tzinfo=None)
        if end_date:
            from dateutil.parser import parse
            end_date = parse(end_date).replace(tzinfo=None)

        data = AnalystsReportService.get_team_cockpit(start_date, end_date)
        return jsonify(data), 200
    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500

@analysts_reports_bp.route('/jarvis/chat', methods=['POST'])
@require_auth
def jarvis_chat(payload):
    """
    IA JARVIS: Chat interativo de comando e consulta.
    """
    try:
        from app.services.jarvis_command_service import JarvisCommandService
        message = request.json.get('message')
        if not message:
            return jsonify({"error": "Mensagem vazia"}), 400
            
        response = JarvisCommandService.process_message(message)
        return jsonify(response), 200
    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500

@analysts_reports_bp.route('/diagnostico', methods=['GET'])
@require_auth
def get_diagnostics(payload):
    """
    Retorna o dashboard agregado de causas (Aba 2).
    """
    try:
        data = AnalystsReportService.get_diagnostics()
        return jsonify(data), 200
    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500

@analysts_reports_bp.route('/export-csv', methods=['GET'])
@require_auth
def export_team_csv(payload):
    try:
        from flask import Response
        csv_data = AnalystsReportService.build_team_csv()
        return Response(
            csv_data,
            mimetype="text/csv",
            headers={"Content-disposition": "attachment; filename=diagnostico_time.csv"}
        )
    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500

@analysts_reports_bp.route('/<path:implantador_name>/export-csv', methods=['GET'])
@require_auth
def export_individual_csv(payload, implantador_name):
    try:
        from flask import Response
        csv_data = AnalystsReportService.build_individual_csv(implantador_name)
        return Response(
            csv_data,
            mimetype="text/csv",
            headers={"Content-disposition": f"attachment; filename=diagnostico_{implantador_name}.csv"}
        )
    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500

@analysts_reports_bp.route('/export-pdf', methods=['GET'])
@require_auth
def export_team_pdf(payload):
    try:
        from flask import Response
        pdf_data = AnalystsReportService.build_team_pdf()
        return Response(
            pdf_data.getvalue(),
            mimetype="application/pdf",
            headers={"Content-disposition": "attachment; filename=diagnostico_time.pdf"}
        )
    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500

@analysts_reports_bp.route('/<path:implantador_name>/export-pdf', methods=['GET'])
@require_auth
def export_individual_pdf(payload, implantador_name):
    try:
        from flask import Response
        pdf_data = AnalystsReportService.build_individual_pdf(implantador_name)
        return Response(
            pdf_data.getvalue(),
            mimetype="application/pdf",
            headers={"Content-disposition": f"attachment; filename=diagnostico_{implantador_name}.pdf"}
        )
    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500

@analysts_reports_bp.route('/analyze/team', methods=['POST'])
@require_auth
def analyze_team(payload):
    """IA: Diagnóstico consultivo do time."""
    try:
        data = AnalystsReportService.generate_team_ai_analysis()
        return jsonify(data), 200
    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500

@analysts_reports_bp.route('/analyze/<path:implantador_name>', methods=['POST'])
@require_auth
def analyze_individual(payload, implantador_name):
    """IA: Diagnóstico consultivo individual."""
    try:
        data = AnalystsReportService.generate_ai_analysis(implantador_name)
        return jsonify(data), 200
    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500

@analysts_reports_bp.route('/<path:implantador_name>', methods=['GET'])
@require_auth
def get_analyst_details(payload, implantador_name):
    """
    Retorna o Drill-down Individual do Implantador (Aba 3).
    """
    try:
        start_str = request.args.get('start')
        end_str = request.args.get('end')
        start_date = datetime.fromisoformat(start_str.replace('Z', '+00:00')).replace(tzinfo=None) if start_str else None
        end_date = datetime.fromisoformat(end_str.replace('Z', '+00:00')).replace(tzinfo=None) if end_str else None

        data = AnalystsReportService.get_analyst_details(implantador_name, start_date, end_date)
        return jsonify(data), 200
    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500
