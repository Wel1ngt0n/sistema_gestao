import json
from datetime import datetime, date
from app.models import db, Store, PerformanceReview, SystemConfig, User
from sqlalchemy import or_, and_

def get_date_bounds(cycle):
    """
    Parse a cycle string like '2026-S1', '2026-S2', or '2026-07' into start and end dates.
    If a month is provided, it returns the bounds for the entire semester that month belongs to.
    """
    if '-S' in cycle:
        year, semester = cycle.split('-S')
        year = int(year)
        if semester == '1':
            return datetime(year, 1, 1), datetime(year, 6, 30, 23, 59, 59)
        else:
            return datetime(year, 7, 1), datetime(year, 12, 31, 23, 59, 59)
    else:
        year, month = map(int, cycle.split('-'))
        if month <= 6:
            return datetime(year, 1, 1), datetime(year, 6, 30, 23, 59, 59)
        else:
            return datetime(year, 7, 1), datetime(year, 12, 31, 23, 59, 59)

class ImplantationBonusService:

    @staticmethod
    def get_default_rules():
        return {
            "collective": {
                "volume_target": 90,
                "volume_weight": 25,
                "otd_target": 80,
                "otd_weight": 25,
                "quality_target": 80,
                "quality_weight": 25,
                "churn_max": 1,
                "churn_weight": 25
            },
            "individual": {
                "volume_target": 30, # formula simplification
                "volume_weight": 34,
                "quality_target": 80,
                "quality_weight": 33,
                "organization_weight": 33
            },
            "behavioral": {
                "conduct_weight": 50,
                "process_weight": 50
            },
            "general": {
                "minimum_threshold": 70,
                "point_matriz": 1.0,
                "point_filial": 0.7
            }
        }

    @staticmethod
    def get_rules(cycle):
        key = f"impl_bonus_config_{cycle}"
        config = SystemConfig.query.filter_by(key=key).first()
        if not config:
            # Cria a configuracao padrao.
            rules = ImplantationBonusService.get_default_rules()
            config = SystemConfig(key=key, value=json.dumps(rules), category='implantation_bonus')
            db.session.add(config)
            db.session.commit()
            return rules
        
        try:
            return json.loads(config.value)
        except:
            return ImplantationBonusService.get_default_rules()

    @staticmethod
    def save_rules(cycle, rules_dict):
        key = f"impl_bonus_config_{cycle}"
        config = SystemConfig.query.filter_by(key=key).first()
        if not config:
            config = SystemConfig(key=key, value=json.dumps(rules_dict), category='implantation_bonus')
            db.session.add(config)
        else:
            config.value = json.dumps(rules_dict)
        db.session.commit()
        return rules_dict

    @staticmethod
    def calculate_summary(cycle):
        start_date, end_date = get_date_bounds(cycle)
        rules = ImplantationBonusService.get_rules(cycle)
        
        # 1. Busca as lojas concluidas no periodo.
        stores_done = db.session.query(Store).filter(
            or_(Store.status_norm == 'DONE', Store.manual_finished_at.isnot(None)),
            or_(
                and_(Store.manual_finished_at.isnot(None), Store.manual_finished_at >= start_date, Store.manual_finished_at <= end_date),
                and_(Store.manual_finished_at.is_(None), Store.status_norm == 'DONE', Store.finished_at >= start_date, Store.finished_at <= end_date)
            )
        ).all()
        
        col_rules = rules.get('collective', {})
        gen_rules = rules.get('general', {})
        ind_rules = rules.get('individual', {})
        beh_rules = rules.get('behavioral', {})
        
        # Calcula os indicadores globais.
        total_points = 0.0
        on_time_count = 0
        quality_ok_count = 0
        
        implantador_stats = {}
        
        for s in stores_done:
            # Pts
            pts = gen_rules.get('point_matriz', 1.0) if s.tipo_loja == 'Matriz' else gen_rules.get('point_filial', 0.7)
            total_points += pts
            
            # OTD
            end = s.manual_finished_at or s.end_real_at or s.finished_at
            start = s.start_real_at or s.created_at
            is_on_time = False
            if start and end:
                days = (end - start).days
                contract = s.tempo_contrato or 90
                if days <= contract:
                    on_time_count += 1
                    is_on_time = True
            
            # Quality
            is_quality_ok = not s.teve_retrabalho
            if is_quality_ok:
                quality_ok_count += 1
                
            imp = s.implantador
            if imp:
                if imp not in implantador_stats:
                    implantador_stats[imp] = {"points": 0, "total": 0, "on_time": 0, "quality_ok": 0}
                implantador_stats[imp]["points"] += pts
                implantador_stats[imp]["total"] += 1
                if is_on_time: implantador_stats[imp]["on_time"] += 1
                if is_quality_ok: implantador_stats[imp]["quality_ok"] += 1
        
        total_stores = len(stores_done)
        
        # Coletivo Atingimento
        c_vol_pct = min(100, (total_points / col_rules.get('volume_target', 90)) * 100) if col_rules.get('volume_target') else 100
        c_otd_real = (on_time_count / total_stores * 100) if total_stores else 100
        c_otd_pct = min(100, (c_otd_real / col_rules.get('otd_target', 80)) * 100) if col_rules.get('otd_target') else 100
        c_qual_real = (quality_ok_count / total_stores * 100) if total_stores else 100
        c_qual_pct = min(100, (c_qual_real / col_rules.get('quality_target', 80)) * 100) if col_rules.get('quality_target') else 100
        
        # O churn e informado manualmente na revisao e somado globalmente.
        global_churns = sum([r.churn_count for r in PerformanceReview.query.filter_by(cycle=cycle).all()])
        c_churn_pct = 100 if global_churns <= col_rules.get('churn_max', 1) else max(0, 100 - (global_churns * 50)) # Example penalty
        
        # Pesos Coletivos
        w_vol = col_rules.get('volume_weight', 25) / 100
        w_otd = col_rules.get('otd_weight', 25) / 100
        w_qual = col_rules.get('quality_weight', 25) / 100
        w_churn = col_rules.get('churn_weight', 25) / 100
        
        collective_score = (c_vol_pct * w_vol) + (c_otd_pct * w_otd) + (c_qual_pct * w_qual) + (c_churn_pct * w_churn)
        
        results = []
        # Garante que todos os usuários ativos com cargo de Implantador entrem na lista
        from app.models import Role
        users = User.query.filter(User.roles.any(Role.name.ilike('%implantador%'))).all()
        user_map = {u.name: u.id for u in users}
        
        all_implantadores = set(implantador_stats.keys())
        for u in users:
            all_implantadores.add(u.name)
            
        for imp in list(all_implantadores):
            u_id = user_map.get(imp, 0)
            stats = implantador_stats.get(imp, {"points": 0, "total": 0, "on_time": 0, "quality_ok": 0})
            
            # Individual Realizados
            i_vol_pct = min(100, (stats["points"] / ind_rules.get('volume_target', 30)) * 100) if ind_rules.get('volume_target') else 100
            i_qual_real = (stats["quality_ok"] / stats["total"] * 100) if stats["total"] else 100
            i_qual_pct = min(100, (i_qual_real / ind_rules.get('quality_target', 80)) * 100) if ind_rules.get('quality_target') else 100
            
            # Competencias comportamentais registradas na revisao.
            review = PerformanceReview.query.filter_by(user_id=u_id, cycle=cycle).first() if u_id else None
            
            # We map soft_communication -> organization
            i_org_score = review.soft_communication if review else 0 # Gestor precisa preencher!
            
            iw_vol = ind_rules.get('volume_weight', 34) / 100
            iw_qual = ind_rules.get('quality_weight', 33) / 100
            iw_org = ind_rules.get('organization_weight', 33) / 100
            
            individual_score = (i_vol_pct * iw_vol) + (i_qual_pct * iw_qual) + (i_org_score * iw_org)
            
            # Comportamental
            # process -> process_weight, responsibility -> conduct
            b_cond = review.soft_responsibility if review else 0
            b_proc = review.soft_process if review else 0
            
            bw_cond = beh_rules.get('conduct_weight', 50) / 100
            bw_proc = beh_rules.get('process_weight', 50) / 100
            
            behavioral_score = (b_cond * bw_cond) + (b_proc * bw_proc)
            churns = review.churn_count if review else 0
            
            # Penalidade Churn individual (cada churn derruba 50% do score comportamental)
            if churns > 0:
                behavioral_score = max(0, behavioral_score - (50 * churns))
            
            final_score = (collective_score * 0.4) + (individual_score * 0.4) + (behavioral_score * 0.2)
            
            # Minimum threshold
            if final_score < gen_rules.get('minimum_threshold', 70):
                bonus_pct = 0
            else:
                bonus_pct = final_score
            
            results.append({
                "user_id": u_id,
                "username": imp,
                "role": "Implantador",
                "scores": {
                    "collective": round(collective_score, 1),
                    "individual": round(individual_score, 1),
                    "behavioral": round(behavioral_score, 1),
                    "final": round(final_score, 1)
                },
                "metrics": {
                    "volume_points": round(stats["points"], 1),
                    "completed_count": stats["total"],
                    "sla_pct": round(c_otd_real, 1), # just using collective otd or individual?
                    "quality_pct": round(i_qual_real, 1),
                    "churns": churns,
                    "bonus_pct": round(bonus_pct, 1)
                },
                "details": {
                    "soft_details": {
                        "comm": i_org_score, # org
                        "resp": b_cond,      # conduta
                        "proc": b_proc       # processos
                    }
                }
            })
            
        return {
            "cycle": cycle,
            "collective_kpis": {
                "volume_points": round(total_points, 1),
                "quality_global": round(c_qual_real, 1),
                "doc_global": 100 # Not evaluated for Implantation
            },
            "collaborators": results,
            "rules": rules
        }
