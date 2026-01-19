from datetime import datetime
from app.models import db, Store, TaskStep, StatusEvent, StoreSyncLog
from app.services.status_normalizer import StatusNormalizer

class MetricsService:
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
        
        # Custom ID Logic
        custom_id = task_data.get('custom_id')
        if not custom_id:
             for field in task_data.get('custom_fields', []):
                val = field.get('value')
                if val and isinstance(val, str) and len(val) > 2:
                     if 'id' in field.get('name', '').lower() or 'código' in field.get('name', '').lower():
                        custom_id = val
                        break
        if not custom_id: custom_id = "N/A"

        store = Store.query.filter_by(clickup_task_id=clickup_id).first()
        is_new = False
        if not store:
            store = Store(clickup_task_id=clickup_id)
            store.store_name = store_name
            store.custom_store_id = custom_id
            is_new = True
            db.session.add(store)
            db.session.flush() # Para pegar o ID
        
        if not is_new:
            # Capturar valores antigos para log
            old_status = store.status
            old_implantador = store.implantador
            old_mrr = store.valor_mensalidade
            old_impl = store.valor_implantacao
        
        store.store_name = store_name
        store.custom_store_id = custom_id
        store.clickup_url = task_data.get('url')
        
        # Prepare Timestamp for logs (Use date_updated from ClickUp if available)
        updated_at_ts = None
        if task_data.get('date_updated'):
             updated_at_ts = datetime.fromtimestamp(int(task_data['date_updated']) / 1000)

        # Status normalization
        raw_status = task_data.get('status', {}).get('status', 'unknown')
        store.status = raw_status 
        store.status_raw = raw_status
        store.status_norm = StatusNormalizer.normalize(raw_status)
        
        # Logs status
        if not is_new:
            self.log_change(store, 'status', old_status, raw_status, timestamp=updated_at_ts)

        # Dates
        if task_data.get('date_created'):
            store.created_at = datetime.fromtimestamp(int(task_data['date_created']) / 1000)
        
        # Start Real: Snapshot logic
        if task_data.get('date_started'):
             store.start_real_at = datetime.fromtimestamp(int(task_data['date_started']) / 1000)
        else:
             store.start_real_at = store.created_at

        if task_data.get('date_closed'):
            store.finished_at = datetime.fromtimestamp(int(task_data['date_closed']) / 1000)
            
        # Assignee
        assignees = task_data.get('assignees', [])
        current_assignee = None
        if assignees:
            current_assignee = assignees[0]['username']
            store.implantador = current_assignee
            store.implantador_atual = current_assignee
            
            # Simple logic for original: if empty, set as current
            if not store.implantador_original:
                store.implantador_original = current_assignee
        
        if not is_new:
            self.log_change(store, 'implantador', old_implantador, current_assignee, timestamp=updated_at_ts)

        # Custom Fields mapping
        for field in task_data.get('custom_fields', []):
            fname = field.get('name', '').lower()
            fvalue = field.get('value')
            if fvalue is None: continue
            
            val_str = str(fvalue)
            
            if 'mensalidade' in fname:
                try: 
                    new_val = float(val_str)
                    if not is_new: self.log_change(store, 'valor_mensalidade', old_mrr, new_val, timestamp=updated_at_ts)
                    store.valor_mensalidade = new_val
                except: pass
            elif 'implantação' in fname:
                try: 
                    new_val = float(val_str)
                    if not is_new: self.log_change(store, 'valor_implantacao', old_impl, new_val, timestamp=updated_at_ts)
                    store.valor_implantacao = new_val
                except: pass
            elif 'erp' in fname:
                store.erp = val_str
            elif 'cnpj' in fname:
                store.cnpj = val_str
            elif 'crm' in fname:
                store.crm = val_str
        
        # Idle Days Calculation (Store Level)
        if updated_at_ts:
             delta = datetime.now() - updated_at_ts
             store.idle_days = delta.days
        
        db.session.add(store)
        return store

    def process_step_data(self, store_db, task_data):
        clickup_id = task_data['id']
        step = TaskStep.query.filter_by(clickup_task_id=clickup_id).first()
        if not step:
            step = TaskStep(clickup_task_id=clickup_id)
            
        step.store_id = store_db.id
        step.step_name = task_data['name']
        step.step_list_name = task_data.get('step_type_name', 'UNKNOWN')
        step.status = task_data.get('status', {}).get('status')
        
        if task_data.get('date_created'):
            step.created_at = datetime.fromtimestamp(int(task_data['date_created']) / 1000)
        
        if task_data.get('date_started'):
            step.start_real_at = datetime.fromtimestamp(int(task_data['date_started']) / 1000)
        else:
            step.start_real_at = step.created_at
            
        if task_data.get('date_closed'):
            step.end_real_at = datetime.fromtimestamp(int(task_data['date_closed']) / 1000)
            step.closed_at = step.end_real_at
            
        if task_data.get('date_updated'):
             updated_at = datetime.fromtimestamp(int(task_data['date_updated']) / 1000)
             delta = datetime.now() - updated_at
             step.idle_days = delta.days
        
        if step.start_real_at and step.end_real_at:
            delta = step.end_real_at - step.start_real_at
            step.total_time_days = round(delta.total_seconds() / 86400, 2)
            
        db.session.add(step)
        return step

    def apply_training_completion_rule(self, store_db):
        """
        Rule: If Training is done OR Manual Date is set, the Store implementation is effectively done.
        Priority: Manual Date > Training Date.
        """
        # 1. Check for Manual Finish Date (Highest Priority)
        if store_db.manual_finished_at:
            # Enforce DONE status if not already
            if store_db.status_norm != 'DONE' or store_db.status != "Concluído (Manual)":
                old_s = store_db.status
                store_db.status = "Concluído (Manual)"
                store_db.status_norm = "DONE"
                store_db.finished_at = store_db.manual_finished_at
                self.log_change(store_db, 'status', old_s, "Concluído (Manual)", source='manual_rule', timestamp=store_db.manual_finished_at)
            
            # Ensure finished_at matches manual date
            if store_db.finished_at != store_db.manual_finished_at:
                store_db.finished_at = store_db.manual_finished_at

        else:
            # 2. Check for Training Completion
            training_done = False
            training_end = None
            
            for s in store_db.steps:
                if s.step_list_name == "TREINAMENTO" and s.end_real_at:
                    training_done = True
                    training_end = s.end_real_at
                    break
            
            if training_done and training_end:
                # If store is not DONE or date is missing, update it
                # We allow overwriting if the current status is NOT 'DONE', or if we want to enforce Training completion as the 'Done' trigger.
                # To be safe: Only update if NOT already DONE, OR if currently 'DONE' but missing a date.
                
                # Logic: If Training is done, Store IS Done.
                if store_db.status_norm != 'DONE':
                     old_s = store_db.status
                     store_db.status = "Concluído (Treinamento)"
                     store_db.status_norm = "DONE"
                     store_db.finished_at = training_end
                     self.log_change(store_db, 'status', old_s, "Concluído (Treinamento)", source='auto_rule', timestamp=training_end)
                
                # If it is DONE but has no date, fill it
                if not store_db.finished_at:
                    store_db.finished_at = training_end

        # 3. Recalculate Store Total Time (if finished)
        if store_db.finished_at:
             start = store_db.start_real_at or store_db.created_at
             if start:
                 delta = store_db.finished_at - start
                 store_db.total_time_days = round(delta.total_seconds() / 86400, 2)

    def commit(self):
        db.session.commit()
