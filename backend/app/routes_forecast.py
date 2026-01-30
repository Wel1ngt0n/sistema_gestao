from flask import Blueprint, jsonify, request, send_file
from app.services.forecast_service import ForecastService
from app.models import db, Store
import pandas as pd
import io
from datetime import datetime

forecast_bp = Blueprint('forecast', __name__, url_prefix='/api/forecast')

@forecast_bp.route('/', methods=['GET'])
def get_forecast():
    """
    Retorna dados da tabela principal de forecast.
    Filtros query param: month, year, implantador, rede, status.
    """
    year = request.args.get('year')
    month = request.args.get('month')
    implantador = request.args.get('implantador')
    rede = request.args.get('rede')
    status = request.args.get('status')
    
    print(f"DEBUG FORECAST: year={year}, month={month}, impl={implantador}")
    
    data = ForecastService.get_forecast_data(year, month, implantador, rede, status)
    print(f"DEBUG FORECAST: Returning {len(data)} rows")
    return jsonify(data)

@forecast_bp.route('/summary', methods=['GET'])
def get_summary():
    """
    Retorna cards de resumo mensal.
    """
    data = ForecastService.get_summary_by_month()
    return jsonify(data)

@forecast_bp.route('/store/<int:store_id>', methods=['PUT'])
def update_store_forecast(store_id):
    """
    Atualiza dados manuais de forecast da loja.
    """
    data = request.json
    store = Store.query.get_or_404(store_id)
    from app.services.audit_service import AuditService
    
    # Update fields if present
    if 'manual_go_live_date' in data:
        val = data['manual_go_live_date'] 
        new_dt = datetime.strptime(val, '%Y-%m-%d') if val else None
        AuditService.log_forecast_change(store.id, 'manual_go_live_date', store.manual_go_live_date, new_dt)
        store.manual_go_live_date = new_dt
        
    if 'had_ecommerce' in data: store.had_ecommerce = bool(data['had_ecommerce'])
    if 'previous_platform' in data: store.previous_platform = data['previous_platform']
    if 'deployment_type' in data: store.deployment_type = data['deployment_type']
    if 'projected_orders' in data: store.projected_orders = int(data['projected_orders'])
    if 'order_rate' in data: store.order_rate = float(data['order_rate'])
    
    if 'forecast_obs' in data: 
        AuditService.log_forecast_change(store.id, 'forecast_obs', store.forecast_obs, data['forecast_obs'])
        store.forecast_obs = data['forecast_obs']
        
    if 'include_in_forecast' in data: 
        new_val = bool(data['include_in_forecast'])
        AuditService.log_forecast_change(store.id, 'include_in_forecast', store.include_in_forecast, new_val)
        store.include_in_forecast = new_val
    
    # Auto-parse UF if address changed (optional logic)
    
    db.session.commit()
    return jsonify({"message": "Forecast updated", "id": store.id})

@forecast_bp.route('/export', methods=['GET'])
def export_forecast():
    """
    Gera Excel com colunas exatas solicitadas.
    """
    # Mesmo filtros
    year = request.args.get('year')
    month = request.args.get('month')
    implantador = request.args.get('implantador')
    
    data = ForecastService.get_forecast_data(year, month, implantador)
    
    # Colunas: Implantador, Cliente, Estado, Lojas, Tinha Ecommerce?, Qual?, 
    # Projeção Pedidos, Taxa, MRR Pedidos, Mes Inicio, Etapa, Mes Previsto, Data Go Live, Status
    
    rows = []
    for item in data:
        rows.append({
            "Implantador": item['implantador'],
            "Cliente": item['rede'], # Rede ou Loja Principal
            "Estado": item['state_uf'],
            "Lojas": 1, # TODO: Agrupar por rede se quiser "Lojas vinculadas", aqui é item = loja
            "Tinha Ecommerce?": "Sim" if item['had_ecommerce'] else "Não",
            "Qual?": item['previous_platform'],
            "Projeção Pedidos/mês": item['projected_orders'],
            "Taxa": item['order_rate'],
            "Projeção MRR": item['projected_mrr_orders'],
            "Mês Início": item['start_date'][:7] if item['start_date'] else '',
            "Etapa": item['etapa'],
            "Mês Previsto Go Live": item['month_go_live'],
            "Data Go Live": item['go_live_date'],
            "Status": item['status'],
            "Obs": item['obs']
        })
        
    df = pd.DataFrame(rows)
    
    output = io.BytesIO()
    with pd.ExcelWriter(output, engine='xlsxwriter') as writer:
        df.to_excel(writer, index=False, sheet_name='Forecast')
        # Ajustes de coluna auto-width poderiam ser feitos aqui
        
    output.seek(0)
    
    return send_file(
        output,
        mimetype='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        as_attachment=True,
        download_name=f'forecast_export_{datetime.now().strftime("%Y%m%d")}.xlsx'
    )
