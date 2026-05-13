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
        
    def _sync_verbal_context(self, task_data):
        """
        Busca descrição e comentários recentes para enriquecer a IA (Raio-X).
        """
        task_id = task_data.get('id')
        if not task_id: 
            return
        
        # 1. Descrição
        # Às vezes a descrição já vem no task_data, se não, buscaríamos (ClickUp API cost)
        # Por padrão, fetch_tasks do ClickUp traz text_content/description
        
        # 2. Comentários (Endpoint separado)
        try:
            comments = self.clickup.get_task_comments(task_id)
            if comments:
                # Pegar os 15 mais recentes
                recent = comments[:15]
                formatted = []
                for c in recent:
                    user = c.get('user', {}).get('username', 'N/A')
                    text = c.get('comment_text', '').strip()
                    date_ms = c.get('date')
                    date_str = ""
                    if date_ms:
                        date_str = datetime.fromtimestamp(int(date_ms)/1000).strftime('%d/%m')
                    
                    if text:
                        formatted.append(f"[{date_str}] {user}: {text}")
                
                task_data['comments_text'] = "\n".join(formatted)
        except Exception as e:
            self.logger.warning(f"Erro ao buscar comentários para task {task_id}: {e}")

    def _extract_latest_human_comment(self, comments):
        for comment in comments or []:
            user = comment.get('user', {}) or {}
            username = user.get('username') or user.get('email') or 'N/A'
            if 'clickup' in username.lower():
                continue

            text = (comment.get('comment_text') or '').strip()
            if not text:
                continue

            comment_at = None
            date_ms = comment.get('date')
            if date_ms:
                try:
                    comment_at = datetime.fromtimestamp(int(date_ms) / 1000)
                except (TypeError, ValueError):
                    comment_at = None

            return {
                "text": text,
                "user": username,
                "at": comment_at,
            }
        return None

    def sync_parent_card_documentation(self, limit=None):
        """
        Atualiza apenas comentarios do card principal das lojas ativas.
        """
        from app.models import Store

        query = Store.query.filter(
            Store.status_norm == 'IN_PROGRESS',
            Store.clickup_task_id.isnot(None),
        ).order_by(Store.idle_days.desc(), Store.id.asc())
        if limit:
            query = query.limit(limit)

        stores = query.all()
        checked = 0
        updated = 0
        errors = 0

        for store in stores:
            checked += 1
            try:
                comments = self.clickup.get_task_comments(store.clickup_task_id)
                latest = self._extract_latest_human_comment(comments)
                if latest:
                    store.last_parent_comment_at = latest["at"]
                    store.last_parent_comment_by = latest["user"]

                task_data = {"id": store.clickup_task_id}
                self._sync_verbal_context(task_data)
                if task_data.get("comments_text"):
                    store.last_comments = task_data["comments_text"]

                updated += 1
            except Exception as e:
                errors += 1
                self.logger.warning(f"Erro ao atualizar documentacao da loja {store.id}: {e}")

        db.session.commit()
        return {"checked": checked, "updated": updated, "errors": errors}

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
        param force_full: ignora o ultimo timestamp e faz varredura completa.
        """
        from app.models import SyncRun, SyncError
        import traceback

        run_record = SyncRun(status="RUNNING")
        db.session.add(run_record)
        db.session.commit()
        
        try:
            self.logger.info(f"--- INICIANDO SYNC V2.5 ({'COMPLETO' if force_full else 'INCREMENTAL'}) ---")
            
            # Otimização Sync V3.5: Respeitar CUTOFF_DATE (01/01/2026)
            from app.services.analysts_report_service import AnalystsReportService
            last_ts = self.get_last_sync_ts()
            
            if force_full:
                last_ts = int(AnalystsReportService.CUTOFF_DATE.timestamp() * 1000)
                self.logger.info(f"Modo FORCE FULL ativado: Sincronizando desde {AnalystsReportService.CUTOFF_DATE.strftime('%d/%m/%Y')}.")
            elif last_ts:
                cutoff_ts = int(AnalystsReportService.CUTOFF_DATE.timestamp() * 1000)
                if last_ts < cutoff_ts:
                    last_ts = cutoff_ts
                self.logger.info(f"Busca incremental a partir de: {datetime.fromtimestamp(last_ts/1000)}")
            else:
                last_ts = int(AnalystsReportService.CUTOFF_DATE.timestamp() * 1000)
                self.logger.info(f"Primeiro Sincronismo: Iniciando desde {AnalystsReportService.CUTOFF_DATE.strftime('%d/%m/%Y')}")

            # 1. Buscar Lojas (Lógica de Cobertura Total 2026 + Ativas)
            parent_tasks_dict = {}
            
            # Passo A: Ativas (Sempre)
            active_tasks = self.clickup.fetch_parent_tasks(include_closed=False)
            for t in active_tasks:
                parent_tasks_dict[t['id']] = t
            
            # Passo B: Ciclo Atual (2026)
            recent_tasks = self.clickup.fetch_parent_tasks(date_updated_gt=last_ts, include_closed=True)
            for t in recent_tasks:
                parent_tasks_dict[t['id']] = t
                
            parent_tasks = list(parent_tasks_dict.values())
            self.logger.info(f"Lojas modificadas/ativas encontradas: {len(parent_tasks)}")
            
            # 2. Buscar Etapas
            steps_map = {} # { custom_id: [tarefas] }
            
            all_steps = []
            with ThreadPoolExecutor(max_workers=5) as executor:
                future_to_list = {
                    executor.submit(self.clickup.fetch_tasks_from_list, list_id, last_ts): name 
                    for name, list_id in Config.LIST_IDS_STEPS.items()
                }
                for future in as_completed(future_to_list):
                     res = future.result()
                     if res:
                         # Injeta o nome da lista para preservar o tipo da etapa.
                         list_name = future_to_list[future]
                         for t in res:
                             t['step_type_name'] = list_name
                         
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
                    if f_val not in steps_map: 
                        steps_map[f_val] = []
                    steps_map[f_val].append(task)
            
            processed_count = 0
            
            # 3. Processar Lojas
            for p_task in parent_tasks:
                 try:
                      # Sincronizar Contexto Verbal (Raio-X)
                      self._sync_verbal_context(p_task)
                      
                      self.metrics.process_store_data(p_task)

                      db.session.commit()
                      processed_count += 1
                 except Exception as e:
                     db.session.rollback()
                     self.logger.error(f"Erro ao processar loja {p_task.get('name')}: {e}")
                     # Registrar Erro V2.5
                     err = SyncError(
                         sync_run_id=run_record.id,
                         task_id=p_task.get('id'),
                         error_msg=str(e),
                         traceback=traceback.format_exc()
                     )
                     db.session.add(err)
                     db.session.commit()
            
            # 3.1 Processar Etapas
            from app.models import Store
            steps_updated_count = 0
            
            for custom_id, s_tasks in steps_map.items():
                try:
                    store_db = Store.query.filter_by(custom_store_id=custom_id).first()
                    if store_db:
                        for s_task in s_tasks:
                             # Sincronizar Contexto Verbal para Etapa
                             self._sync_verbal_context(s_task)
                             
                             self.metrics.process_step_data(store_db, s_task)

                             steps_updated_count += 1
                        
                        # Reaplicar regras
                        self.metrics.apply_training_completion_rule(store_db)
                        db.session.commit()
                except Exception as e:
                    db.session.rollback()
                    self.logger.error(f"Erro ao processar etapas para a loja {custom_id}: {e}")
                    # Registrar Erro V2.5
                    err = SyncError(
                        sync_run_id=run_record.id,
                        store_id=(store_db.id if store_db else None),
                        error_msg=str(e),
                        traceback=traceback.format_exc()
                    )
                    db.session.add(err)
                    db.session.commit()

            self.metrics.commit()
            self.update_sync_state(success=True)
            
            # Atualizar Registro de Execução
            run_record.finished_at = datetime.now()
            run_record.status = "SUCCESS"
            run_record.items_processed = len(parent_tasks)
            run_record.items_updated = processed_count + steps_updated_count
            db.session.commit()

            self.logger.info("--- SYNC FINALIZADO ---")
            
            # Pos-sync: notificacoes nao devem bloquear o resultado principal.
            try:
                from app.services.notification_service import check_sla_alerts
                alert_result = check_sla_alerts()
                if alert_result.get("alerts_count", 0) > 0:
                    self.logger.info(f"Notificação SLA: {alert_result['alerts_count']} alertas enviados")
            except Exception as notif_err:
                self.logger.warning(f"Erro ao enviar notificações pós-sync: {notif_err}")
            
            return {"processed": processed_count, "steps_updated": len(all_steps)}
            
        except Exception as e:
            self.logger.error(f"Erro fatal no sincronismo: {e}")
            run_record.finished_at = datetime.now()
            run_record.status = "ERROR"
            run_record.error_summary = str(e)
            db.session.commit()
            raise e
    
    def run_deep_sync(self, store_id):
        """
        Executa Deep Sync para uma loja específica.
        """
        from app.models import Store, StoreDeepSyncState, TimeInStatusCache
        
        try:
            store = Store.query.get(store_id)
            if not store:
                return {"error": "Loja nao encontrada"}
            
            self.logger.info(f"Iniciando Deep Sync para loja: {store.store_name} ({store.clickup_task_id})")
            
            # Buscar do ClickUp
            data = self.clickup.get_task_history(store.clickup_task_id)
            if not data:
                return {"error": "Falha ao buscar historico no ClickUp"}
            
            # Atualizar Estado Deep Sync
            dss = StoreDeepSyncState.query.get(store_id)
            if not dss:
                dss = StoreDeepSyncState(store_id=store_id)
                db.session.add(dss)
            
            dss.last_deep_sync_at = datetime.now()
            dss.sync_status = "COMPLETE"
            dss.last_error = None
            
            # Processar Histórico de Status
            # Limpar cache antigo
            TimeInStatusCache.query.filter_by(store_id=store_id).delete()
            
            status_history = data.get('status_history', [])
            for item in status_history:
                status_name = item.get('status')
                total_time = item.get('total_time', {}).get('by_minute', 0) # Valor assumido em minutos.
                
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
            
            # FORÇAR REAVALIAÇÃO DE REGRAS DE CONCLUSÃO
            self.metrics.apply_training_completion_rule(store)
            db.session.commit()
            
            self.logger.info(f"Deep Sync finalizado para {store.store_name}")
            return {"status": "success", "history_items": len(status_history)}
            
        except Exception as e:
            self.logger.error(f"Erro Deep Sync {store_id}: {e}")
            
            # Reconsulta apos rollback para evitar objeto preso em sessao invalida.
            db.session.rollback()
            dss = StoreDeepSyncState.query.get(store_id)
            if dss:
                dss.sync_status = "FAILED"
                dss.last_error = str(e)
                db.session.commit()
            return {"error": str(e)}

    def run_sync_stream(self, force_full=False, vital_only=False):
        """Gerador SSE com sincronismo incremental e logs de progresso."""
        from app.models import SyncRun, SyncError
        import traceback
        
        # Registra a execucao antes de iniciar o streaming.
        run_record = SyncRun(status="RUNNING")
        db.session.add(run_record)
        db.session.commit()
        
        try:
            mode_str = "VITAL" if vital_only else "DEEP"
            yield f"data: 🚀 Iniciando Sync V3.0 ({mode_str} - {'COMPLETO' if force_full else 'INCREMENTAL'})...\n\n"
            
            # Otimização Sync V3.5: Respeitar CUTOFF_DATE (01/01/2026) no sincronismo completo
            from app.services.analysts_report_service import AnalystsReportService
            last_ts = self.get_last_sync_ts()
            
            if force_full:
                last_ts = int(AnalystsReportService.CUTOFF_DATE.timestamp() * 1000)
                yield f"data: ⚠️ Modo Completo Ativado: Sincronizando desde {AnalystsReportService.CUTOFF_DATE.strftime('%d/%m/%Y')}...\n\n"
            elif last_ts:
                # Se o último sync for mais antigo que o corte (improvável mas possível), usamos o corte
                cutoff_ts = int(AnalystsReportService.CUTOFF_DATE.timestamp() * 1000)
                if last_ts < cutoff_ts:
                    last_ts = cutoff_ts
                yield f"data: 🕒 Sincronismo Incremental: Desde {datetime.fromtimestamp(last_ts/1000).strftime('%d/%m/%Y %H:%M')}...\n\n"
            else:
                last_ts = int(AnalystsReportService.CUTOFF_DATE.timestamp() * 1000)
                yield f"data: 🚀 Primeiro Sincronismo: Iniciando desde {AnalystsReportService.CUTOFF_DATE.strftime('%d/%m/%Y')}...\n\n"
            
            # 1. Stores (Processamento em Tempo Real) - Cobertura Total 2026 + Ativas
            yield "data: 🔍 Buscando e processando lojas...\n\n"
            self.logger.info(f"--- INICIANDO BUSCA DE LOJAS (Cutoff: {AnalystsReportService.CUTOFF_DATE}) ---")
            
            parent_tasks_dict = {}
            # A: Lojas em Aberto (Sempre sincronizar)
            yield "data: 📥 Sincronizando lojas em andamento...\n\n"
            self.logger.info("Buscando lojas com status 'Open'...")
            for batch in self.clickup.fetch_parent_tasks_generator(include_closed=False):
                for t in batch:
                    parent_tasks_dict[t['id']] = t
            
            # B: Lojas Concluídas este ano
            yield f"data: 📥 Sincronizando histórico desde {AnalystsReportService.CUTOFF_DATE.strftime('%d/%m/%Y')}...\n\n"
            self.logger.info(f"Buscando histórico de lojas desde {AnalystsReportService.CUTOFF_DATE}...")
            for batch in self.clickup.fetch_parent_tasks_generator(date_updated_gt=last_ts, include_closed=True):
                for t in batch:
                    parent_tasks_dict[t['id']] = t
            
            parent_tasks_list = list(parent_tasks_dict.values())
            self.logger.info(f"Total de lojas para processar: {len(parent_tasks_list)}")
            stores_processed = 0
            
            def to_chunks(data_list, chunk_size):
                for i in range(0, len(data_list), chunk_size):
                    yield data_list[i:i + chunk_size]

            for batch in to_chunks(parent_tasks_list, 20):
                if batch:
                    for p_task in batch:
                        try:
                            store_name = p_task.get('name', 'Desconhecido')
                            self.logger.info(f"Processando loja [{stores_processed + 1}]: {store_name}")
                            
                            # Sincronizar Contexto Verbal (Raio-X) apenas se NÃO for Vital
                            if not vital_only:
                                self._sync_verbal_context(p_task)
                                
                                # Capturar Time Tracking (V6)
                                try:
                                    tt_data = self.clickup.get_task_time_tracking(p_task.get('id'))
                                    total_ms = sum(int(entry.get('duration', 0)) for entry in tt_data)
                                    p_task['total_time_tracked'] = int(total_ms / 1000) # segundos
                                except (ValueError, TypeError, Exception): 
                                    pass
                            
                            store_db = self.metrics.process_store_data(p_task)
                            
                            # Se tivermos time tracked no p_task, atualizar no model
                            if p_task.get('total_time_tracked') is not None:
                                store_db.total_time_tracked = p_task['total_time_tracked']
                                
                                # Capturar Time In Status (Histórico de Métricas V6)
                                try:
                                    status_data = self.clickup.get_task_history(p_task.get('id'))
                                    if status_data:
                                        from app.models import TimeInStatusCache
                                        # Limpar e atualizar
                                        TimeInStatusCache.query.filter_by(store_id=store_db.id).delete()
                                        for item in status_data.get('status_history', []):
                                            status_name = item.get('status')
                                            total_min = item.get('total_time', {}).get('by_minute', 0)
                                            if total_min:
                                                cache = TimeInStatusCache(
                                                    store_id=store_db.id,
                                                    status_name=status_name,
                                                    total_seconds=int(total_min) * 60,
                                                    total_days=round((int(total_min) * 60) / 86400, 2)
                                                )
                                                db.session.add(cache)
                                except (ValueError, TypeError, Exception): 
                                    pass
                            
                            db.session.commit()
                            stores_processed += 1
                        except Exception as e:
                            db.session.rollback()
                            self.logger.error(f"Erro store {p_task.get('name')}: {e}")
                            err = SyncError(
                                sync_run_id=run_record.id,
                                task_id=p_task.get('id'),
                                error_msg=f"Atualizacao de loja: {str(e)}",
                                traceback=traceback.format_exc()
                            )
                            db.session.add(err)
                            db.session.commit()
                            
                        # MANTÉM A CONEXÃO SSE VIVA (EVITA TIMEOUT NO RENDER)
                        if not vital_only and stores_processed % 3 == 0:
                            yield f"data: ⏳ [Deep] {stores_processed} lojas detalhadas processadas...\n\n"
                    
                    yield f"data: ⏳ Lote de lojas concluído. Total: {stores_processed}...\n\n"
                    batch = None # Libera referencia do lote processado.

            self.logger.info(f"--- FIM DO PROCESSAMENTO DE LOJAS: {stores_processed} processadas ---")
            yield f"data: ✅ {stores_processed} lojas sincronizadas.\n\n"
            
            # 2. Steps (Processamento em Tempo Real por Batch) - OTIMIZADO
            yield "data: 📦 Buscando e processando etapas...\n\n"
            self.logger.info("--- INICIANDO BUSCA DE ETAPAS (SUBTAREFAS) ---")
            steps_processed = 0
            father_field_id = self.clickup.get_father_field_id()
            from app.models import Store, StoreSyncLog
            
            # CACHE DE LOJAS: Evita milhares de queries individuais
            self.logger.info("Construindo cache de lojas...")
            store_cache = {s.custom_store_id: s for s in Store.query.all()}
            
            # CACHE DE FLAGS MANUAIS: Evita milhares de queries individuais a StoreSyncLog
            self.logger.info("Construindo cache de flags manuais...")
            manual_flags = {}
            all_manual = StoreSyncLog.query.filter(
                StoreSyncLog.source == 'manual',
                StoreSyncLog.field_name.like('step_%')
            ).all()
            for log in all_manual:
                if log.store_id not in manual_flags:
                    manual_flags[log.store_id] = set()
                manual_flags[log.store_id].add(log.field_name)

            for list_name, list_id in Config.LIST_IDS_STEPS.items():
                try:
                    yield f"data: 📥 Iniciando busca da lista '{list_name}'...\n\n"
                    self.logger.info(f"Sincronizando lista de etapas: {list_name} ({list_id})")
                    
                    # Lógica Dupla para Etapas:
                    # 1. Busca TODAS as etapas em aberto (independentemente da data)
                    # 2. Busca TODAS as etapas atualizadas desde o corte
                    
                    steps_dict = {}
                    
                    # A: Etapas em Aberto
                    self.logger.info(f"[{list_name}] Buscando etapas em aberto...")
                    for batch in self.clickup.fetch_tasks_from_list_generator(list_id, include_closed=False):
                        for t in batch:
                            steps_dict[t['id']] = t
                    
                    # B: Etapas do Ciclo Atual
                    self.logger.info(f"[{list_name}] Buscando etapas concluídas em 2026...")
                    search_ts = last_ts if last_ts else int(AnalystsReportService.CUTOFF_DATE.timestamp() * 1000)
                    for batch in self.clickup.fetch_tasks_from_list_generator(list_id, date_updated_gt=search_ts, include_closed=True):
                        for t in batch:
                            steps_dict[t['id']] = t
                    
                    steps_list = list(steps_dict.values())
                    self.logger.info(f"[{list_name}] Total de etapas encontradas: {len(steps_list)}")
                    
                    for s_task in steps_list:
                        try:
                            # Encontrar Store via Custom Field
                            custom_id = None
                            for cf in s_task.get('custom_fields', []):
                                if cf['id'] == father_field_id:
                                    custom_id = cf.get('value')
                                    break
                            
                            if custom_id:
                                # Usar CACHE em vez de Query
                                store_db = store_cache.get(custom_id)
                                if store_db:
                                    s_task['step_type_name'] = list_name
                                    
                                    # Processar com Cache de Manual Flags
                                    self.metrics.process_step_data(store_db, s_task, manual_flags=manual_flags)
                                    
                                    # Aplicar regra de treinamento
                                    self.metrics.apply_training_completion_rule(store_db)
                                    
                                    steps_processed += 1
                                    
                                    # BATCH COMMIT: Commita a cada 50 etapas em vez de 1 por 1
                                    if steps_processed % 50 == 0:
                                        db.session.commit()
                                        self.logger.info(f"[{list_name}] Batch de 50 etapas commitado. Total: {steps_processed}")
                                    
                                    # MANTÉM A CONEXÃO SSE VIVA
                                    if not vital_only and steps_processed % 10 == 0:
                                        yield f"data: ⏳ [Deep] {steps_processed} etapas atualizadas...\n\n"
                                        
                        except Exception as inner_e:
                            db.session.rollback()
                            self.logger.error(f"Erro na etapa {s_task.get('id')}: {inner_e}")
                    
                    # Commit ao final de cada lista
                    db.session.commit()
                    self.logger.info(f"[{list_name}] Sincronização concluída.")
                    yield f"data: 📦 Lista '{list_name}' concluída: {len(steps_list)} etapas.\n\n"
                except Exception as e:
                    self.logger.error(str(e))
                    yield f"data: ⚠️ Erro ao buscar lista '{list_name}': {str(e)}\n\n"
                    yield f"data: 🔄 Etapas processadas: {steps_processed}\n\n"
    
            self.metrics.commit()
            self.update_sync_state(success=True)
            
            # Atualizar Registro de Execução (Sucesso)
            run_record.finished_at = datetime.now()
            run_record.status = "SUCCESS"
            run_record.items_processed = stores_processed
            run_record.items_updated = stores_processed + steps_processed
            db.session.commit()
            
            yield "data: ✨ Sync V3.0 Finalizado!\n\n"
            yield "data: [DONE]\n\n"

        except Exception as e:
            # Log de Erro Fatal
            self.logger.error(f"Erro fatal no stream de sincronismo: {e}")
            run_record.finished_at = datetime.now()
            run_record.status = "ERROR"
            run_record.error_summary = str(e)
            db.session.commit()
            yield f"data: ❌ Erro Fatal: {str(e)}\n\n"
            yield "data: [DONE]\n\n"
    def run_integration_sync(self):
        """
        Sincroniza APENAS a lista de Integração e atualiza métricas específicas.
        Usa time_in_status do ClickUp para extrair datas reais de início/fim.
        """
        from app.models import Store, IntegrationMetric, TaskStep
        
        try:
            self.logger.info("--- INICIANDO SYNC INTEGRAÇÃO ---")
            
            # 1. Buscar Tarefas da Lista de Integração
            list_id = Config.LIST_IDS_STEPS['INTEGRACAO']
            tasks = self.clickup.fetch_tasks_from_list(list_id, date_updated_gt=None)
            
            if not tasks:
                self.logger.info("Nenhuma tarefa de integração encontrada.")
                return {"processed": 0}
                
            self.logger.info(f"Tarefas de integração encontradas: {len(tasks)}")
            
            # 2. Processar Steps e mapear clickup_task_id por store
            father_field_id = self.clickup.get_father_field_id()
            updated_count = 0
            # Mapa: store_id -> clickup_task_id (da subtarefa de integração)
            store_task_map = {}
            
            for task in tasks:
                custom_id = None
                for cf in task.get('custom_fields', []):
                    if cf['id'] == father_field_id:
                        custom_id = cf.get('value')
                        break
                
                if custom_id:
                    store = Store.query.filter_by(custom_store_id=custom_id).first()
                    if store:
                        task['step_type_name'] = 'INTEGRACAO'
                        self.metrics.process_step_data(store, task)
                        
                        assignees = task.get('assignees', [])
                        if assignees:
                            current_assignee = assignees[0]['username']
                            store.integrador = current_assignee
                            
                        store_task_map[store.id] = task['id']
                        updated_count += 1
            
            db.session.commit()
            
            # 3. Atualizar IntegrationMetric com datas reais via status history
            self.logger.info(f"Buscando datas de integração para {len(store_task_map)} lojas...")
            
            import time as time_mod
            for store_id, clickup_task_id in store_task_map.items():
                store = Store.query.get(store_id)
                metric = IntegrationMetric.query.filter_by(store_id=store_id).first()
                if not metric:
                    metric = IntegrationMetric(store_id=store_id, snapshot_date=datetime.now().date())
                    db.session.add(metric)
                
                try:
                    # Buscar datas reais via status change history
                    dates = self.clickup.parse_integration_dates(clickup_task_id)
                    
                    if dates['start_date']:
                        metric.start_date = dates['start_date']
                    if dates['end_date']:
                        metric.end_date = dates['end_date']
                    
                    # Fallback: se não achou via status, usar step dates
                    if not metric.start_date:
                        step = TaskStep.query.filter_by(store_id=store_id, step_list_name='INTEGRACAO').first()
                        if step:
                            metric.start_date = step.start_real_at or step.created_at
                    
                    if not metric.end_date:
                        step = TaskStep.query.filter_by(store_id=store_id, step_list_name='INTEGRACAO').first()
                        if step and step.end_real_at:
                            metric.end_date = step.end_real_at
                    
                    # Calcular SLA
                    if metric.start_date and metric.end_date:
                        metric.sla_days = (metric.end_date - metric.start_date).days
                    elif metric.start_date:
                        # Em andamento: calcular dias até agora
                        metric.sla_days = (datetime.now() - metric.start_date).days
                    
                    # Pequeno intervalo para respeitar o rate limit da API externa.
                    time_mod.sleep(0.1)
                    
                except Exception as e:
                    self.logger.warning(f"Erro ao buscar datas para store {store_id}: {e}")
            
            db.session.commit()
            self.logger.info(f"--- SYNC INTEGRAÇÃO FINALIZADO: {updated_count} steps atualizados ---")
            
            return {"processed": updated_count, "stores_updated": len(store_task_map)}
            
        except Exception as e:
            self.logger.error(f"Erro Sync Integração: {e}")
            db.session.rollback()
            raise e

    def run_implantacao_sync(self):
        """
        Sincroniza todas as listas EXCETO Integração.
        """
        from app.models import Store
        from concurrent.futures import ThreadPoolExecutor, as_completed
        
        try:
            self.logger.info("--- INICIANDO SYNC RÁPIDO IMPLANTAÇÃO ---")
            
            all_steps = []
            with ThreadPoolExecutor(max_workers=5) as executor:
                future_to_list = {}
                for name, list_id in Config.LIST_IDS_STEPS.items():
                    if name != 'INTEGRACAO':
                        future_to_list[executor.submit(self.clickup.fetch_tasks_from_list, list_id, None)] = name
                        
                for future in as_completed(future_to_list):
                     res = future.result()
                     if res:
                         list_name = future_to_list[future]
                         for t in res:
                             t['step_type_name'] = list_name
                         all_steps.extend(res)
            
            if not all_steps:
                self.logger.info("Nenhuma tarefa de implantação encontrada.")
                return {"processed": 0}
                
            self.logger.info(f"Tarefas de implantação encontradas: {len(all_steps)}")
            
            # 2. Processar Steps
            father_field_id = self.clickup.get_father_field_id()
            updated_count = 0
            affected_store_ids = set()
            
            for task in all_steps:
                custom_id = None
                for cf in task.get('custom_fields', []):
                    if cf['id'] == father_field_id:
                        custom_id = cf.get('value')
                        break
                
                if custom_id:
                    store = Store.query.filter_by(custom_store_id=custom_id).first()
                    if store:
                        self.metrics.process_step_data(store, task)
                        affected_store_ids.add(store.id)
                        updated_count += 1
            
            db.session.commit()
            
            # Recalcular regras de conclusão para lojas afetadas
            for store_id in affected_store_ids:
                store = Store.query.get(store_id)
                if store:
                    self.metrics.apply_training_completion_rule(store)
            
            db.session.commit()
            self.logger.info(f"--- SYNC IMPLANTAÇÃO FINALIZADO: {updated_count} steps atualizados ---")
            
            return {"processed": updated_count, "stores_updated": len(affected_store_ids)}
            
        except Exception as e:
            self.logger.error(f"Erro Sync Implantação: {e}")
            db.session.rollback()
            raise e
