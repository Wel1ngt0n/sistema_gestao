from app.services.clickup import ClickUpService
from app.services.metrics import MetricsService
from app.models import db, SyncState
from config import Config
from concurrent.futures import ThreadPoolExecutor, as_completed
import logging
from datetime import datetime

class SyncService:
    def __init__(self):
        self.logger = logging.getLogger(__name__)
        self.clickup = ClickUpService()
        self.metrics = MetricsService()
        
    def get_last_sync_ts(self):
        state = SyncState.query.get(1)
        if state and state.last_shallow_sync_at:
            # Converter para timestamp ms para o ClickUp
            return int(state.last_shallow_sync_at.timestamp() * 1000)
        return None

    def update_sync_state(self, success=True):
        state = SyncState.query.get(1)
        if not state:
            state = SyncState(id=1)
            db.session.add(state)
        
        state.last_shallow_sync_at = datetime.now()
        if success:
            state.last_successful_sync_at = datetime.now()
        state.in_progress = False
        db.session.commit()

    def run_sync(self, force_full=False):
        """
        Sync Incremental Otimizado.
        param force_full: Ignora o último timestamp e faz scan completo.
        """
        self.logger.info(f"--- INICIANDO SYNC V2.5 ({'COMPLETO' if force_full else 'INCREMENTAL'}) ---")
        
        last_ts = self.get_last_sync_ts()
        if force_full:
            last_ts = None
            self.logger.info("Modo FORCE FULL ativado: Ignorando timestamp anterior.")
            
        if last_ts:
            self.logger.info(f"Busca incremental a partir de: {datetime.fromtimestamp(last_ts/1000)}")
        else:
            self.logger.info("Busca COMPLETA (Primeiro Sincronismo)")

        # 1. Buscar Lojas (Incremental)
        parent_tasks = self.clickup.fetch_parent_tasks(date_updated_gt=last_ts)
        self.logger.info(f"Lojas modificadas encontradas: {len(parent_tasks)}")
        
        # 2. Buscar Etapas
        steps_map = {} # { custom_id: [tasks] }
        
        all_steps = []
        with ThreadPoolExecutor(max_workers=5) as executor:
            future_to_list = {
                executor.submit(self.clickup.fetch_tasks_from_list, list_id, last_ts): name 
                for name, list_id in Config.LIST_IDS_STEPS.items()
            }
            for future in as_completed(future_to_list):
                 res = future.result()
                 if res:
                     # Inject List Name
                     list_name = future_to_list[future]
                     for t in res: t['step_type_name'] = list_name
                     
                     all_steps.extend(res)
        
        self.logger.info(f"Subtarefas (Etapas) modificadas: {len(all_steps)}")
        
        # Mapear etapas para custom_id
        father_field_id = self.clickup.get_father_field_id()
        for task in all_steps:
            f_val = None
            for cf in task.get('custom_fields', []):
                if cf['id'] == father_field_id:
                    f_val = cf.get('value')
                    break
            if f_val:
                if f_val not in steps_map: steps_map[f_val] = []
                steps_map[f_val].append(task)
        
        processed_count = 0
        
        # 3. Process Stores
        for p_task in parent_tasks:
             try:
                 self.metrics.process_store_data(p_task)
                 db.session.commit()
                 processed_count += 1
             except Exception as e:
                 db.session.rollback()
                 self.logger.error(f"Erro ao processar loja {p_task.get('name')}: {e}")
        
        # 3.1 Process Steps
        from app.models import Store
        
        for custom_id, s_tasks in steps_map.items():
            try:
                store_db = Store.query.filter_by(custom_store_id=custom_id).first()
                if store_db:
                    for s_task in s_tasks:
                         self.metrics.process_step_data(store_db, s_task)
                    
                    # Re-apply rules
                    self.metrics.apply_training_completion_rule(store_db)
                    db.session.commit()
            except Exception as e:
                db.session.rollback()
                self.logger.error(f"Erro ao processar etapas para a loja {custom_id}: {e}")

        # Removed redundant final commit since we commit per item now, 
        # but kept self.metrics.commit() which effectively is just db.session.commit() 
        # to ensure any stragglers specifically if logic changes. 
        # Actually it's cleaner to keep it as a safeguard.
        self.metrics.commit()
        self.update_sync_state(success=True)
        
        self.logger.info("--- SYNC FINALIZADO ---")
        return {"processed": processed_count, "steps_updated": len(all_steps)}
    
    def run_deep_sync(self, store_id):
        """
        Executa Deep Sync para uma loja específica.
        """
        from app.models import Store, StoreDeepSyncState, TimeInStatusCache
        
        try:
            store = Store.query.get(store_id)
            if not store:
                return {"error": "Store not found"}
            
            self.logger.info(f"Iniciando Deep Sync para loja: {store.store_name} ({store.clickup_task_id})")
            
            # Fetch from ClickUp
            data = self.clickup.get_task_history(store.clickup_task_id)
            if not data:
                return {"error": "Failed to fetch from ClickUp"}
            
            # Update Deep Sync State
            dss = StoreDeepSyncState.query.get(store_id)
            if not dss:
                dss = StoreDeepSyncState(store_id=store_id)
                db.session.add(dss)
            
            dss.last_deep_sync_at = datetime.now()
            dss.sync_status = "COMPLETE"
            dss.last_error = None
            
            # Processar Histórico de Status
            # Clear old cache
            TimeInStatusCache.query.filter_by(store_id=store_id).delete()
            
            status_history = data.get('status_history', [])
            for item in status_history:
                status_name = item.get('status')
                total_time = item.get('total_time', {}).get('by_minute', 0) # Minutes assumed
                
                if total_time:
                    total_seconds = int(total_time) * 60
                    
                    cache = TimeInStatusCache(
                        store_id=store_id,
                        status_name=status_name,
                        total_seconds=total_seconds,
                        total_days=round(total_seconds / 86400, 2)
                    )
                    db.session.add(cache)
                
            db.session.commit()
            
            # FORCE RE-EVALUATE COMPLETION RULES
            self.metrics.apply_training_completion_rule(store)
            db.session.commit()
            
            self.logger.info(f"Deep Sync finalizado para {store.store_name}")
            return {"status": "success", "history_items": len(status_history)}
            
        except Exception as e:
            self.logger.error(f"Erro Deep Sync {store_id}: {e}")
            
            # Re-query safely to avoid session rollback issues
            db.session.rollback()
            dss = StoreDeepSyncState.query.get(store_id)
            if dss:
                dss.sync_status = "FAILED"
                dss.last_error = str(e)
                db.session.commit()
            return {"error": str(e)}

    def run_sync_stream(self, force_full=False):
        """Gerador para SSE com Lógica Incremental"""
        yield f"data: 🚀 Iniciando Sync V2.5 ({'COMPLETO' if force_full else 'INCREMENTAL'})...\n\n"
        
        last_ts = self.get_last_sync_ts()
        if force_full:
            last_ts = None
            yield "data: ⚠️ Modo Completo Forçado: Re-escaneando tudo...\n\n"
            
        last_date_str = datetime.fromtimestamp(last_ts/1000).strftime('%d/%m %H:%M') if last_ts else "INÍCIO (Tudo)"
        yield f"data: 🕒 Filtro: desde {last_date_str}\n\n"
        
        # 1. Stores
        yield "data: 🔍 Buscando lojas modificadas...\n\n"
        parent_tasks = self.clickup.fetch_parent_tasks(date_updated_gt=last_ts)
        yield f"data: ✅ {len(parent_tasks)} lojas para atualizar.\n\n"
        
        # 2. Steps
        yield "data: 📦 Buscando etapas modificadas...\n\n"
        all_steps = []
        father_field_id = self.clickup.get_father_field_id()
        
        with ThreadPoolExecutor(max_workers=5) as executor:
            future_to_list = {
                executor.submit(self.clickup.fetch_tasks_from_list, list_id, last_ts): name 
                for name, list_id in Config.LIST_IDS_STEPS.items()
            }
            for future in as_completed(future_to_list):
                try:
                    res = future.result()
                    if res:
                        # Inject List Name
                        list_name = future_to_list[future]
                        for t in res: t['step_type_name'] = list_name
                        
                        all_steps.extend(res)
                    yield f"data: 📥 Lista '{future_to_list[future]}' parcial: {len(res)} itens.\n\n"
                except Exception as e:
                    self.logger.error(str(e))

        # Map steps
        steps_map = {}
        for task in all_steps:
            f_val = None
            for cf in task.get('custom_fields', []):
                if cf['id'] == father_field_id:
                    f_val = cf.get('value')
                    break
            if f_val:
                if f_val not in steps_map: steps_map[f_val] = []
                steps_map[f_val].append(task)
        
        # 3. Process Stores
        count = 0
        for p_task in parent_tasks:
            try:
                self.metrics.process_store_data(p_task)
                db.session.commit()
                count += 1
            except Exception as e:
                db.session.rollback()
                self.logger.error(f"Erro store {p_task.get('name')}: {e}")
        
        yield f"data: 🔄 Lojas processadas: {count}\n\n"
        
        # 4. Process Steps
        from app.models import Store
        steps_processed = 0
        
        for custom_id, s_tasks in steps_map.items():
            try:
                store_db = Store.query.filter_by(custom_store_id=custom_id).first()
                if store_db:
                    for s_task in s_tasks:
                         self.metrics.process_step_data(store_db, s_task)
                    
                    self.metrics.apply_training_completion_rule(store_db)
                    db.session.commit()
                    steps_processed += len(s_tasks)
            except Exception as e:
                db.session.rollback()
                self.logger.error(f"Erro ao processar steps para loja {custom_id}: {e}")
        
        yield f"data: 🔄 Etapas processadas: {steps_processed}\n\n"

        self.metrics.commit()
        self.update_sync_state(success=True)
        
        yield "data: ✨ Sync V2.5 Finalizado!\n\n"
        yield "data: [DONE]\n\n"
