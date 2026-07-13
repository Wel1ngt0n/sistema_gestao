from datetime import datetime
import json
from app.models import db, Store, TaskStep, StoreSyncLog
from app.services.status_normalizer import StatusNormalizer

class MetricsService:
    """Centraliza a atualizacao dos modelos a partir dos dados do ClickUp."""

    def log_change(self, store, field_name, old_value, new_value, source='sync', timestamp=None):
        if str(old_value) != str(new_value):
            log = StoreSyncLog(
                store_id=store.id,
                field_name=field_name,
                old_value=str(old_value) if old_value is not None else None,
                new_value=str(new_value) if new_value is not None else None,
                source=source,
                changed_at=timestamp or datetime.now()
            )
            db.session.add(log)

    def process_store_data(self, task_data):
        clickup_id = task_data['id']
        store_name = task_data['name']
        
        # Identifica o codigo interno da loja nos campos customizados do ClickUp.
        custom_id = task_data.get('custom_id')
        if not custom_id:
             for field in task_data.get('custom_fields', []):
                val = field.get('value')
                if val and isinstance(val, str) and len(val) > 2:
                     if 'id' in field.get('name', '').lower() or 'código' in field.get('name', '').lower():
                        custom_id = val
                        break
        if not custom_id: 
            custom_id = "N/A"

        store = Store.query.filter_by(clickup_task_id=clickup_id).first()
        is_new = False
        if not store:
            store = Store(clickup_task_id=clickup_id)
            store.store_name = store_name
            store.custom_store_id = custom_id
            is_new = True
            db.session.add(store)
            db.session.flush() # Necessario para logs que dependem do ID.
        
        if not is_new:
            # Captura valores antigos para registrar alteracoes relevantes.
            old_status = store.status
            old_implantador = store.implantador
            old_mrr = store.valor_mensalidade
            old_impl = store.valor_implantacao
        
        store.store_name = store_name
        store.custom_store_id = custom_id
        store.clickup_url = task_data.get('url')
        
        # Usa date_updated do ClickUp como referencia temporal do log, quando disponivel.
        updated_at_ts = None
        if task_data.get('date_updated'):
             updated_at_ts = datetime.fromtimestamp(int(task_data['date_updated']) / 1000)

        # Normaliza status externo para os estados internos usados pelo sistema.
        raw_status = task_data.get('status', {}).get('status', 'unknown')
        if task_data.get('archived', False):
            store.status = 'ARQUIVADA'
            store.status_raw = raw_status
            store.status_norm = 'ARCHIVED'
        else:
            store.status = raw_status 
            store.status_raw = raw_status
            store.status_norm = StatusNormalizer.normalize(raw_status)
        
        # Registra mudanca de status somente em lojas existentes.
        if not is_new:
            self.log_change(store, 'status', old_status, raw_status, timestamp=updated_at_ts)

        # Datas principais vindas do ClickUp.
        if task_data.get('date_created'):
            store.created_at = datetime.fromtimestamp(int(task_data['date_created']) / 1000)
        
        # Data inicial efetiva: ClickUp date_started ou data de criacao.
        if task_data.get('date_started'):
             store.start_real_at = datetime.fromtimestamp(int(task_data['date_started']) / 1000)
        else:
             store.start_real_at = store.created_at

        if task_data.get('date_closed'):
            store.finished_at = datetime.fromtimestamp(int(task_data['date_closed']) / 1000)
        elif task_data.get('date_done'):
             store.finished_at = datetime.fromtimestamp(int(task_data['date_done']) / 1000)
            
        # Responsavel atual e snapshot completo dos assignees.
        assignees = task_data.get('assignees', [])
        current_assignee = None
        if assignees:
            current_assignee = assignees[0]['username']
            # Salvar JSON completo (V6)
            store.assignees_json = json.dumps([{
                'id': a.get('id'),
                'username': a.get('username'),
                'avatar': a.get('profilePicture'),
                'initials': a.get('initials')
            } for a in assignees])
            
        store.implantador = current_assignee
        store.implantador_atual = current_assignee
        
        # O responsavel original e definido na primeira vez em que houver assignee.
        if not store.implantador_original and current_assignee:
            store.implantador_original = current_assignee
        
        if not is_new:
            self.log_change(store, 'implantador', old_implantador, current_assignee, timestamp=updated_at_ts)

        # Mapeia campos customizados comerciais sem alterar nomes externos.
        for field in task_data.get('custom_fields', []):
            fname = field.get('name', '').lower()
            fvalue = field.get('value')
            if fvalue is None: 
                continue
            
            val_str = str(fvalue)
            
            if 'mensalidade' in fname:
                try: 
                    new_val = float(val_str)
                    if not is_new:
                        self.log_change(store, 'valor_mensalidade', old_mrr, new_val, timestamp=updated_at_ts)
                    store.valor_mensalidade = new_val
                except (ValueError, TypeError): 
                    pass
            elif 'implantação' in fname:
                try: 
                    new_val = float(val_str)
                    if not is_new:
                        self.log_change(store, 'valor_implantacao', old_impl, new_val, timestamp=updated_at_ts)
                    store.valor_implantacao = new_val
                except (ValueError, TypeError): 
                    pass
            elif 'erp' in fname:
                store.erp = val_str[:500] if len(val_str) > 500 else val_str
            elif 'cnpj' in fname:
                store.cnpj = val_str[:200] if len(val_str) > 200 else val_str
            elif 'crm' in fname:
                store.crm = val_str[:200] if len(val_str) > 200 else val_str
        
        # Dias sem atualizacao desde o ultimo date_updated recebido.
        if updated_at_ts:
             delta = datetime.now() - updated_at_ts
             store.idle_days = delta.days
        
        # Contexto textual usado pelos modulos de IA/diagnostico.
        if task_data.get('description'):
            store.description = task_data.get('description')
        if task_data.get('comments_text'): # Passado pelo SyncService
            store.last_comments = task_data.get('comments_text')
        
        db.session.add(store)
        return store

    def process_step_data(self, store_db, task_data, manual_flags=None):
        clickup_id = task_data['id']
        step = TaskStep.query.filter_by(clickup_task_id=clickup_id).first()
        if not step:
            step = TaskStep(clickup_task_id=clickup_id)
            step.store_id = store_db.id
            db.session.add(step)
            db.session.flush() # Necessario para checar flags manuais pelo ID.
            
        step.store_id = store_db.id
        step.step_name = task_data['name']
        step.step_list_name = task_data.get('step_type_name', 'UNKNOWN')
        step.status = task_data.get('status', {}).get('status')
        
        if task_data.get('date_created'):
            step.created_at = datetime.fromtimestamp(int(task_data['date_created']) / 1000)
            
        # Determinar se a data foi editada manualmente (Hierarquia Max) - OTIMIZADO via cache
        has_manual_start = False
        has_manual_end = False
        
        if manual_flags is not None:
            # Usa cache de flags manuais para evitar milhares de queries.
            has_manual_start = f'step_start_{step.id}' in manual_flags.get(store_db.id, set())
            has_manual_end = f'step_end_{step.id}' in manual_flags.get(store_db.id, set())
        elif step.id:
            # Fallback legado para chamadas unitarias.
            has_manual_start = StoreSyncLog.query.filter_by(store_id=store_db.id, field_name=f'step_start_{step.id}', source='manual').first() is not None
            has_manual_end = StoreSyncLog.query.filter_by(store_id=store_db.id, field_name=f'step_end_{step.id}', source='manual').first() is not None

        if not has_manual_start:
            if task_data.get('date_started'):
                step.start_real_at = datetime.fromtimestamp(int(task_data['date_started']) / 1000)
            else:
                # Fallback: usa o fim da etapa concluida imediatamente anterior.
                limit_date = step.end_real_at or datetime.now()
                # Otimizacao: apenas uma query nesse caminho raro.
                last_finished_step = TaskStep.query.filter(
                    TaskStep.store_id == store_db.id, 
                    TaskStep.id != step.id, 
                    TaskStep.end_real_at.isnot(None),
                    TaskStep.end_real_at <= limit_date
                ).order_by(TaskStep.end_real_at.desc()).first()
                if last_finished_step:
                    step.start_real_at = last_finished_step.end_real_at
                else:
                    step.start_real_at = step.created_at
            
        if not has_manual_end:
            if task_data.get('date_closed'):
                step.end_real_at = datetime.fromtimestamp(int(task_data['date_closed']) / 1000)
                step.closed_at = step.end_real_at

        # Trava de seguranca: inicio nao pode ser maior que fim.
        if step.start_real_at and step.end_real_at and step.start_real_at > step.end_real_at:
             step.start_real_at = step.created_at or step.end_real_at

        if task_data.get('date_updated'):
             updated_at = datetime.fromtimestamp(int(task_data['date_updated']) / 1000)
             delta = datetime.now() - updated_at
             step.idle_days = delta.days
        
        if step.start_real_at and step.end_real_at:
            delta = step.end_real_at - step.start_real_at
            step.total_time_days = round(max(0.0, delta.total_seconds() / 86400), 2)
        elif step.start_real_at and not step.end_real_at:
            delta = datetime.now() - step.start_real_at
            step.total_time_days = round(max(0.0, delta.total_seconds() / 86400), 2)
        else:
            step.total_time_days = 0.0
            
        # Contexto textual usado pelos modulos de IA/diagnostico.
        if task_data.get('description'):
            step.description = task_data.get('description')
        if task_data.get('comments_text'):
            step.last_comments = task_data.get('comments_text')

        db.session.add(step)
        return step

    def apply_training_completion_rule(self, store_db):
        """
        Aplica a regra de conclusao operacional da loja.
        Prioridade: data manual > termino da etapa TREINAMENTO.
        """
        # 1. Data final manual tem prioridade maxima.
        if store_db.manual_finished_at:
            # Forca status DONE quando a conclusao manual existir.
            if store_db.status_norm != 'DONE' or store_db.status != "Concluído (Manual)":
                old_s = store_db.status
                store_db.status = "Concluído (Manual)"
                store_db.status_norm = "DONE"
                store_db.finished_at = store_db.manual_finished_at
                self.log_change(store_db, 'status', old_s, "Concluído (Manual)", source='manual_rule', timestamp=store_db.manual_finished_at)
            
            # Mantem finished_at alinhado com a data manual.
            if store_db.finished_at != store_db.manual_finished_at:
                store_db.finished_at = store_db.manual_finished_at

        else:
            # 2. Sem data manual, treinamento concluido define entrega operacional.
            training_done = False
            training_end = None
            
            for s in store_db.steps:
                if s.step_list_name == "TREINAMENTO" and s.end_real_at:
                    training_done = True
                    training_end = s.end_real_at
                    break
            
            if training_done and training_end:
                # A etapa TREINAMENTO concluida e o gatilho de DONE operacional.
                if store_db.status_norm != 'DONE':
                     old_s = store_db.status
                     store_db.status = "Concluído (Treinamento)"
                     store_db.status_norm = "DONE"
                     store_db.finished_at = training_end
                     self.log_change(store_db, 'status', old_s, "Concluído (Treinamento)", source='auto_rule', timestamp=training_end)
                
                # Se ja estava DONE mas sem data final, preenche com o fim do treinamento.
                if not store_db.finished_at:
                    store_db.finished_at = training_end

        # 3. Recalcula o tempo total quando ha data final.
        if store_db.finished_at:
             start = store_db.start_real_at or store_db.created_at
             if start:
                 delta = store_db.finished_at - start
                 store_db.total_time_days = round(delta.total_seconds() / 86400, 2)

    def commit(self):
        db.session.commit()
