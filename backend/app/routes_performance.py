from flask import Blueprint, jsonify, request
from app.models import db, Store, IntegrationMetric, PerformanceReview, User
from app.services.security_service import require_auth, require_permission
from datetime import datetime, date
from sqlalchemy import func

performance_bp = Blueprint('performance', __name__, url_prefix='/api/performance')

@performance_bp.route('/summary', methods=['GET'])
@require_auth
def get_performance_summary(payload):
    """
    Retorna o resumo de performance de todos os colaboradores elegíveis.
    Filtros: ?cycle=2024-02 (Default: Mês atual)
    """
    cycle = request.args.get('cycle', datetime.now().strftime('%Y-%m'))
    
    # 1. Buscar Integradores
    # Assumindo que temos users com role='integrator' ou buscamos nomes distintos na tabela stores?
    # Por enquanto, vamos buscar nomes distintos na tabela Store.integrador se não tivermos Users cadastrados.
    # Ideal: Usar tabela User. Vamos listar Users e se não tiver, fallback para nomes únicos.
    
    users = User.query.filter_by(role='integrator').all()
    
    # Se não tiver usuários cadastrados, vamos criar objetos dummy baseados nos nomes encontrados nas lojas
    # Isso é para garantir que funcione mesmo sem users criados no sistema de auth
    if not users:
        integrators_names = db.session.query(Store.integrador).distinct().filter(Store.integrador.isnot(None), Store.integrador != '').all()
        users = [{"username": name[0], "id": None} for name in integrators_names]
    
    results = []
    
    # --- METAS COLETIVAS (40%) ---
    # 1. Volume (80 pontos)
    # 2. Qualidade Pós-Go-Live (90% sem falhas)
    # 3. Documentação (100%)
    
    # Calcular Coletivo Globalmente
    all_metrics = IntegrationMetric.query.join(Store).all()
    
    total_points = 0.0
    total_integrated = 0
    sla_ok_count = 0
    quality_ok_count = 0
    doc_ok_count = 0
    
    for m in all_metrics:
        # Volume
        if m.end_date: # Considerar filtro de data do ciclo depois
            points = 1.0 if m.store.tipo_loja == 'Matriz' else 0.7
            total_points += points
            total_integrated += 1
            
            # SLA Global (<60 dias)
            if m.start_date:
                days = (m.end_date - m.start_date).days
                if days <= 60:
                    sla_ok_count += 1
            
            # Qualidade Global (Sem bugs)
            if m.post_go_live_bugs == 0:
                quality_ok_count += 1
                
        # Doc Global (Todas)
        if m.documentation_status == 'DONE':
            doc_ok_count += 1
            
    # Percentuais Coletivos
    # Meta Volume: 80 pontos = 100%. 
    p_volume = min(100, (total_points / 80.0) * 100)
    
    # Meta Qualidade: 90% = 100% atingimento.
    pct_quality_real = (quality_ok_count / total_integrated * 100) if total_integrated else 100
    p_quality = min(100, (pct_quality_real / 90.0) * 100)
    
    # Meta Doc: 100% = 100% atingimento.
    pct_doc_real = (doc_ok_count / len(all_metrics) * 100) if all_metrics else 0
    p_doc = min(100, pct_doc_real) # Se meta é 100%, o realizado já é o atingimento
    
    # Peso no Bloco Coletivo (conforme prompt)
    # Volume: 25%, Qualidade: 25%, Doc: 25%. Faltou 25%? 
    # O prompt diz: "Peso no bloco coletivo: 25%" para cada. Vamos assumir pesos iguais ou recaucular.
    # Assumindo 33% cada um dos 3 itens citados no prompt (Volume, Qualidade, Doc)?
    # Prompt cita 3 metas coletivas. Vamos dividir por 3.
    
    collective_score = (p_volume + p_quality + p_doc) / 3.0
    
    
    for user in users:
        username = user.username if hasattr(user, 'username') else user['username']
        user_id = user.id if hasattr(user, 'id') else 0
        
        # --- METAS INDIVIDUAIS (40%) ---
        # 1. SLA Individual (90% <= 60 dias) - Peso 34%
        # 2. Qualidade Individual (90% sem falhas) - Peso 33%
        # 3. Registro Técnico/Auditoria (Manual/Audit) - Peso 33%
        
        user_metrics = [m for m in all_metrics if m.store.integrador == username]
        
        u_total = 0
        u_sla_ok = 0
        u_quality_ok = 0
        
        for m in user_metrics:
            if m.end_date:
                u_total += 1
                if m.start_date and (m.end_date - m.start_date).days <= 60:
                    u_sla_ok += 1
                if m.post_go_live_bugs == 0:
                    u_quality_ok += 1
        
        # Calc Individual
        u_pct_sla = (u_sla_ok / u_total * 100) if u_total else 100
        u_score_sla = min(100, (u_pct_sla / 90.0) * 100)
        
        u_pct_quality = (u_quality_ok / u_total * 100) if u_total else 100
        u_score_quality = min(100, (u_pct_quality / 90.0) * 100)
        
        # Auditoria (Placeholder 100% por enquanto ou pegar de review)
        u_score_audit = 100.0 
        
        individual_score = (u_score_sla * 0.34) + (u_score_quality * 0.33) + (u_score_audit * 0.33)
        
        # --- COMPORTAMENTAL (20%) ---
        # Buscar Review existente
        review = None
        if user_id:
            review = PerformanceReview.query.filter_by(user_id=user_id, cycle=cycle).first()
            
        soft_score = 100.0 # Default start
        churn_penalty = False
        
        if review:
            avg_soft = (review.soft_communication + review.soft_process + review.soft_responsibility) / 3.0
            soft_score = avg_soft
            
            # Churn Penalty: Bloqueia 50% do comportamental
            if review.churn_count > 0:
                soft_score = soft_score * 0.5
                churn_penalty = True
        
        # --- FINAL SCORE ---
        # 40% Coletivo, 40% Individual, 20% Comportamental
        final_score = (collective_score * 0.4) + (individual_score * 0.4) + (soft_score * 0.2)
        
        # Bônus Estimado (Exemplo: Salário Base x Multiplicador x Score%)
        # Aqui retornamos apenas o % de atingimento
        
        results.append({
            "user_id": user_id,
            "username": username,
            "role": "Integrador",
            "scores": {
                "collective": round(collective_score, 1),
                "individual": round(individual_score, 1),
                "behavioral": round(soft_score, 1),
                "final": round(final_score, 1)
            },
            "metrics": {
                "volume_points": round(total_points, 1),
                "completed_count": u_total,
                "sla_pct": round(u_pct_sla, 1),
                "quality_pct": round(u_pct_quality, 1),
                "churns": review.churn_count if review else 0
            },
            "details": {
                "p_volume": round(p_volume, 1),
                "p_doc": round(p_doc, 1),
                "soft_details": {
                    "comm": review.soft_communication if review else 0,
                    "proc": review.soft_process if review else 0,
                    "resp": review.soft_responsibility if review else 0
                }
            }
        })
        
    return jsonify({
        "cycle": cycle,
        "collective_kpis": {
            "volume_points": total_points,
            "quality_global": pct_quality_real,
            "doc_global": pct_doc_real
        },
        "collaborators": results
    })

@performance_bp.route('/review', methods=['POST'])
@require_auth
@require_permission('manage_performance')
def save_review(payload):
    """
    Salva avaliação comportamental manual.
    Payload: { user_id, cycle, soft_communication, soft_process, soft_responsibility, churn_count }
    """
    data = request.json
    user_id = data.get('user_id')
    cycle = data.get('cycle')
    
    if not user_id:
        # Se usuário não existe (caso dummy), precisaríamos criar? 
        # Por enquanto obrigar ter user real para salvar review
        return jsonify({"error": "User ID required"}), 400
        
    review = PerformanceReview.query.filter_by(user_id=user_id, cycle=cycle).first()
    if not review:
        review = PerformanceReview(user_id=user_id, cycle=cycle)
        db.session.add(review)
        
    if 'soft_communication' in data: review.soft_communication = float(data['soft_communication'])
    if 'soft_process' in data: review.soft_process = float(data['soft_process'])
    if 'soft_responsibility' in data: review.soft_responsibility = float(data['soft_responsibility'])
    if 'churn_count' in data: review.churn_count = int(data['churn_count'])
    
    try:
        db.session.commit()
        return jsonify({"message": "Avaliação salva com sucesso"}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500
