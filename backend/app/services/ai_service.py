from google import genai
import logging
import json
import os
from datetime import datetime
from app.models import db, Store, TaskStep, MetricsSnapshotDaily
from app.services.clickup import ClickUpService
from config import Config

logger = logging.getLogger(__name__)

class GeminiService:
    def __init__(self):
        self.api_key = Config.GEMINI_API_KEY or os.environ.get("GEMINI_API_KEY")
        if self.api_key:
            try:
                self.client = genai.Client(api_key=self.api_key)
            except Exception as e:
                logger.error(f"[Gemini] Error initializing client: {e}")
                self.client = None
        else:
            self.client = None
            logger.warning("[Gemini] API Key not found. AI features disabled.")
        
        self.clickup = ClickUpService()
        
    def analyze_network_context(self, store_id, force=False):
        """
        Analisa o contexto da REDE (Matriz + Filiais) da loja fornecida.
        Coleta dados do banco e comentários do ClickUp.
        """
        if not self.client:
            return {"error": "AI not configured"}

        target_store = Store.query.get(store_id)
        if not target_store:
            return {"error": "Store not found"}

        # 1. Check Cache
        if not force and target_store.ai_summary:
            try:
                cached_data = json.loads(target_store.ai_summary)
                cached_data['_cached'] = True
                cached_data['_analyzed_at'] = target_store.ai_analyzed_at.strftime('%d/%m/%Y %H:%M') if target_store.ai_analyzed_at else None
                return cached_data
            except Exception as e:
                logger.warning(f"[Gemini] Cache corrupted: {e}")

        start_time = datetime.now()
            
        network_stores = self._get_network_stores(target_store)
        logger.info(f"[Gemini] Analisando rede com {len(network_stores)} lojas (Base: {target_store.store_name})")

        # 2. Coletar Contexto (Dados + Comentários)
        context_data = self._gather_context_data(network_stores)
        
        # 3. Montar Prompt
        prompt = self._build_prompt(context_data)
        
        # 4. Chamar IA
        try:
            logger.info("[Gemini] Enviando prompt para API...")
            response = self.client.models.generate_content(
                model='gemini-flash-latest',
                contents=prompt
            )
            raw_text = response.text
            
            # Limpar JSON markdown
            json_text = raw_text.replace("```json", "").replace("```", "").strip()
            
            # Tentar parsear
            result = json.loads(json_text)
            
            # Salvar resultado no banco (apenas para a loja alvo por enquanto, ou para todas)
            self._save_analysis_to_db(target_store, result)
            
            logger.info(f"[Gemini] Análise concluída em {(datetime.now() - start_time).seconds}s")
            
            # Return with metadata
            result['_cached'] = False
            result['_analyzed_at'] = datetime.now().strftime('%d/%m/%Y %H:%M')
            return result
            
        except Exception as e:
            logger.error(f"[Gemini] Erro na análise: {e}")
            return {"error": str(e)}

    # ... methods ...

    def _save_analysis_to_db(self, store, result):
        """Salva o resultado no banco (Store e MetricsSnapshotDaily)."""
        try:
            # 1. Save to Store (Persistent Cache)
            store.ai_summary = json.dumps(result)
            store.ai_analyzed_at = datetime.now()
            
            # 2. Try to save to Daily Snapshot (Historical)
            today = datetime.today().date()
            snapshot = MetricsSnapshotDaily.query.filter_by(
                store_id=store.id, 
                snapshot_date=today
            ).first()
            
            if snapshot:
                snapshot.ai_risk_level = result.get('risk_level')
                snapshot.ai_network_summary = result.get('summary_network')
                snapshot.ai_action_plan = json.dumps(result.get('action_plan'))
                snapshot.ai_last_analysis = datetime.now()
            
            db.session.add(store)
            db.session.commit()
        except Exception as e:
            logger.error(f"[Gemini] Failed to save analysis: {e}")
            db.session.rollback()

    def _get_network_stores(self, store):
        """Retorna lista com a loja, sua matriz (se houver) e suas filiais (se houver)."""
        all_stores = {store}
        
        # Se tem matriz, pegar matriz
        if store.parent_id:
            matriz = Store.query.get(store.parent_id)
            if matriz:
                all_stores.add(matriz)
                # Pegar irmãs?
                all_stores.update(matriz.filiais)
        
        # Se é matriz, pegar filiais
        if store.filiais:
            all_stores.update(store.filiais)
            
        return list(all_stores)

    def _gather_context_data(self, stores):
        """ESCAVAÇÃO RAIO-X: Extrai tudo da Loja, incluindo Subtarefas e Oceanos de Comentários."""
        data = []
        for s in stores:
            store_info = {
                "id": s.id,
                "name": s.store_name,
                "implantador": s.implantador,
                "days_in_progress": s.dias_em_progresso,
                "status": s.status_norm,
                "bottlenecks": [],
                "subtasks_status": [],
                "comments_ocean": []
            }
            
            # Puxa Todas as Steps da Loja mapeadas no banco (que já conectam aos IDs do ClickUp)
            all_steps = TaskStep.query.filter_by(store_id=s.id).all()
            
            for step in all_steps:
                # Status e Gargalos
                is_stuck = step.idle_days > 3
                if step.status not in ['closed', 'concluido', 'done']:
                    status_str = f"[{step.step_name.upper()}]: {step.status} (Parado há {step.idle_days} dias, Total: {int(step.total_time_days)}d)"
                    store_info["subtasks_status"].append(status_str)
                    if is_stuck:
                        store_info["bottlenecks"].append(f"ALERTA: A equipe/etapa de {step.step_name} está travada há {step.idle_days} dias.")
                
                # Comentários de TODAS as subtarefas (Escavação Profunda)
                try:
                    step_comments = self.clickup.get_task_comments(step.clickup_task_id)
                    if step_comments:
                        # Filtrar bots (ignora usuários automáticos)
                        real_comments = [c for c in step_comments if 'ClickUp' not in c.get('user', {}).get('username', '')]
                        for c in real_comments[:3]: # Mantém os 3 mais recentes por etapa
                            text = c.get('comment_text', '').replace('\n', ' ')
                            user = c.get('user', {}).get('username', 'Equipe')
                            date_str = datetime.fromtimestamp(int(c.get('date', 0))/1000).strftime('%d/%m') if c.get('date') else ''
                            store_info["comments_ocean"].append(f"[{date_str}] Na etapa '{step.step_name}', {user} disse: {text}")
                except Exception as e:
                    logger.error(f"[Gemini] Erro ao ler comments subtask {step.step_name}: {e}")

            # Comentários do Card Pai (Loja Principal)
            try:
                parent_comments = self.clickup.get_task_comments(s.clickup_task_id)
                if parent_comments:
                    real_parent_comments = [c for c in parent_comments if 'ClickUp' not in c.get('user', {}).get('username', '')]
                    for c in real_parent_comments[:5]:
                        text = c.get('comment_text', '').replace('\n', ' ')
                        user = c.get('user', {}).get('username', 'Equipe')
                        date_str = datetime.fromtimestamp(int(c.get('date', 0))/1000).strftime('%d/%m') if c.get('date') else ''
                        store_info["comments_ocean"].append(f"[{date_str}] No CARD PAI da Loja, {user} disse: {text}")
            except Exception as e:
                logger.error(f"[Gemini] Erro ao ler comments da loja matriz: {e}")
                
            data.append(store_info)
        return data

    def _get_team_performance_summary(self):
        """MÓDULO DE TIME: Retorna volume e atraso concentrado por Implantador."""
        active_stores = Store.query.filter(Store.status_norm != 'DONE').all()
        team_stats = {}
        for s in active_stores:
            imp = s.implantador or "Sem Dono Fixo"
            if imp not in team_stats:
                team_stats[imp] = {"lojas_ativas": 0, "lojas_atrasadas_ou_críticas": 0}
            
            team_stats[imp]["lojas_ativas"] += 1
            if s.dias_em_progresso > (s.tempo_contrato or 90) or (s.daily_snapshots and s.daily_snapshots[-1].risk_score > 25):
                team_stats[imp]["lojas_atrasadas_ou_críticas"] += 1
        
        return team_stats

    def _build_prompt(self, context_data):
        return f"""
        Você é um ENGENHEIRO DE PRODUÇÃO e SUPERVISOR SÊNIOR DE OPERAÇÕES, responsável por analisar o progresso de implantação de uma REDE DE LOJAS (Matriz + Filiais).

        Seu foco NÃO é apenas tecnologia, mas:
        - fluxo operacional
        - dependência entre etapas
        - gargalos recorrentes
        - impacto sistêmico na rede como um todo

        OBJETIVO DA ANÁLISE:
        Avaliar a SAÚDE OPERACIONAL da REDE de forma CONJUNTA.
        Se a MATRIZ estiver bloqueada ou atrasada, considere que isso impacta diretamente todas as filiais.

        DADOS DE ENTRADA:
        Você receberá um JSON contendo, para cada loja da rede:
        - status atual
        - dias em progresso
        - comentários recentes das tarefas do ClickUp (Matriz e Filiais)
        - identificação se a loja é MATRIZ ou FILIAL

        DADOS DA REDE (Lojas):
        {json.dumps(context_data, indent=2, ensure_ascii=False)}

        CRITÉRIOS DE ANÁLISE (OBRIGATÓRIOS):

        1. MATRIZ TEM PRIORIDADE
        - Problemas na MATRIZ têm peso MAIOR que problemas em filiais isoladas.
        - Se um bloqueio da MATRIZ se repete nas FILIAIS, trate como gargalo estrutural.

        2. IDENTIFICAÇÃO DE GARGALOS
        Analise os comentários em busca de:
        - bloqueios técnicos (integração, erro de sistema, dependência de terceiros)
        - bloqueios operacionais (falta de alinhamento, retrabalho, priorização)
        - bloqueios do cliente (retorno lento, dados faltantes, validação pendente)

        Liste APENAS gargalos reais, explícitos ou claramente inferidos.
        Evite hipóteses vagas.

        3. CLASSIFICAÇÃO DE RISCO DA REDE
        Classifique o nível de risco considerando:
        - tempo total da MATRIZ
        - recorrência de bloqueios nas filiais
        - sinais de estagnação ou retrabalho
        - impacto potencial em prazo, qualidade ou ativação financeira

        Use estritamente:
        - LOW
        - MEDIUM
        - HIGH
        - CRITICAL

        4. PLANO DE AÇÃO (PRÁTICO E EXECUTÁVEL)
        Crie no máximo 3 ações.
        Cada ação deve ser:
        - clara
        - objetiva
        - acionável por um time de operações
        Evite sugestões genéricas ou excessivamente técnicas.

        FORMATO DE RESPOSTA:
        Responda ESTRITAMENTE em JSON, no seguinte formato:

        {{
            "risk_level": "CRITICAL | HIGH | MEDIUM | LOW",
            "summary_network": "Resumo executivo da saúde da rede em até 3 linhas. Destaque se a Matriz é o principal risco.",
            "specific_blockers": [
                "Bloqueio 1 (ex: Integração da Matriz parada aguardando ajuste de ERP)",
                "Bloqueio 2 (ex: Dependência recorrente de retorno do cliente nas filiais)"
            ],
            "action_plan": [
                "Ação 1 clara e executável",
                "Ação 2 clara e executável",
                "Ação 3 clara e executável"
            ]
        }}

        REGRAS FINAIS:
        - Seja direto e executivo.
        - Priorize impacto sistêmico, não casos isolados.
        - Pense como alguém responsável por prazo, qualidade e escala operacional.
        - Não explique o raciocínio fora do JSON.
        """


    def chat_with_operational_context(self, user_message):
        """
        Chat com contexto total da operação. Agora possui Memória de Longo Prazo.
        1. Busca resumo de todas as lojas ativas.
        2. Se o usuário citar uma loja específica, busca contexto detalhado (comentários) e MEMÓRIAS ANTERIORES.
        3. Envia para o Gemini com persona de Gerente de Operações e salva uma nova memória.
        """
        if not self.client:
            return {"response": "IA não configurada (API Key ausente).", "sources": []}

        try:
            # Importa para acesso à memória
            from app.models import AILongTermMemory
            
            # A. Contexto Global (Todas as lojas ativas)
            active_stores_summary = self._get_all_active_stores_summary()
            team_performance = self._get_team_performance_summary()
            
            # B. Contexto Específico (Se houver menção) e Memórias
            specific_context = []
            mentioned_stores = self._identify_stores_in_message(user_message, active_stores_summary)
            past_memories_text = ""
            
            analysis_type = "general_operations"
            store_id_for_memory = None
            
            if mentioned_stores:
                specific_context = self._gather_context_data(mentioned_stores)
                analysis_type = "specific_store"
                store_id_for_memory = mentioned_stores[0].id
                
                # Busca as últimas 3 memórias desta loja
                past_memories = AILongTermMemory.query.filter_by(store_id=store_id_for_memory).order_by(AILongTermMemory.created_at.desc()).limit(3).all()
                if past_memories:
                    past_memories_text = "\n--- MEMÓRIAS E ANÁLISES ANTERIORES DESTA LOJA ---\n"
                    for mem in reversed(past_memories): # Do mais antigo pro mais recente
                        past_memories_text += f"\nEm {mem.created_at.strftime('%d/%m/%Y %H:%M')} o usuário perguntou: '{mem.query_prompt}'\n"
                        past_memories_text += f"Sua análise na época foi: '{mem.ai_response}'\n"
                        
            else:
                # Se for análise geral, traz as últimas memórias gerais
                past_memories = AILongTermMemory.query.filter_by(analysis_type="general_operations").order_by(AILongTermMemory.created_at.desc()).limit(2).all()
                if past_memories:
                    past_memories_text = "\n--- MEMÓRIAS ANTERIORES DO QUADRO GERAL ---\n"
                    for mem in reversed(past_memories):
                        past_memories_text += f"\nEm {mem.created_at.strftime('%d/%m/%Y')} foi avaliado isso:\n{mem.ai_response}\n"
            
            # C. Construção do Prompt (RAG com Tool-like approach na mente)
            system_instruction = f"""
            Você é o CENTRAL COMMAND (IA) do CRM de Implantação.
            Você não é apenas um chatbot. Você é a DIRETORA OPERACIONAL E DE PERFORMANCE.

            SEUS SUPERPODERES (DADOS DE EXAUSTÃO):
            - Relatório de Desempenho do Time e Carga de Trabalho atual.
            - Visualização de Todas as Lojas e seus Atrasos.
            - **Raio-X de Lojas**: Se o usuário questionar sobre uma Loja X, avalie as sub-etapas dela e o OCEANO DE COMENTÁRIOS que extraímos de todos os departamentos (Integração, Qualidade, Cadastro).

            --- DADOS DO TIME ATUAL (Performance e Carga de Lojas): ---
            {json.dumps(team_performance, ensure_ascii=False)}

            --- DADOS DA REDE GERAL (Lojas Ativas): ---
            {json.dumps(active_stores_summary, ensure_ascii=False)[:3000]}
            
            --- DEEP-DIVE DA LOJA (Gargalos, Status das Subtarefas e O que as equipes estão comentando lá dentro): ---
            {json.dumps(specific_context, indent=2, ensure_ascii=False) if specific_context else "Nenhuma loja específica requerida para Escavação Profunda."}
            {past_memories_text}
            
            SUA MISSÃO:
            1. **Identificar Padrões**: Se 3 lojas estão travadas em "Integração", isso é um problema sistêmico. ALERTE.
            2. **Diagnóstico Preciso**: Não diga "a loja está atrasada". Diga "A loja está parada há 5 dias na etapa X".
            3. **Formatação Rica**:
               - Use 🚨 para Riscos Altos.
               - Use ⚠️ para Atenção.
               - Use ⏳ para Gargalos de Tempo.
               - Use **Negrito** para nomes de lojas e steps.

            REGRAS DE RESPOSTA:
            - Se o usuário perguntar "Como está a rede?", faça um resumo executivo focado nos GARGALOS (Steps travados).
            - Se perguntar de uma loja, faça uma autópsia completa: Onde travou? Por que? O que dizem os comentários?
            - Responda SEMPRE em Português do Brasil.
            - Seja conciso mas letal nos detalhes.
            """

            # D. Chamada à API
            chat = self.client.chats.create(model='gemini-flash-latest')
            response = chat.send_message(
                message=f"CONTEXTO DO SISTEMA:\n{system_instruction}\n\nPERGUNTA DO USUÁRIO:\n{user_message}"
            )
            
            # E. Ouro: Salvar Nova Memória a Longo Prazo
            try:
                nova_memoria = AILongTermMemory(
                    store_id=store_id_for_memory,
                    analysis_type=analysis_type,
                    query_prompt=user_message,
                    context_snapshot=json.dumps(specific_context) if specific_context else "Resumo Geral",
                    ai_response=response.text
                )
                db.session.add(nova_memoria)
                db.session.commit()
            except Exception as mem_e:
                logger.error(f"[Gemini Memory] Falha ao gravar memória: {mem_e}")
                db.session.rollback()
            
            return {
                "response": response.text,
                "sources": [s.store_name for s in mentioned_stores] if mentioned_stores else ["Base Geral"]
            }

        except Exception as e:
            logger.error(f"[Gemini] Chat error: {e}")
            return {"response": f"Erro ao processar sua pergunta: {str(e)}", "sources": []}

    def _get_all_active_stores_summary(self):
        """Retorna lista leve de todas as lojas não-concluídas."""
        # Filtrar status diferente de 'DONE' e 'CANCELLED' (ajuste conforme seu modelo)
        stores = Store.query.filter(Store.status_norm != 'DONE').all()
        
        summary = []
        for s in stores:
            summary.append({
                "id": s.id,
                "name": s.store_name,
                "implantador": s.implantador,
                "status": s.status_norm,
                "days": s.dias_em_progresso,
                "days": s.dias_em_progresso,
                # Tentar pegar risco do snapshot de hoje ou mais recente
                "risk": (s.daily_snapshots[-1].risk_score if s.daily_snapshots else 0)
            })
        return summary

    def _identify_stores_in_message(self, message, all_stores_summary):
        """Tenta encontrar lojas citadas na mensagem (busca simples por nome)."""
        message_lower = message.lower()
        found_ids = []
        
        for s in all_stores_summary:
            # Tokenização simples: verifica se partes do nome da loja estão na mensagem
            # Ex: "Loja Teste" -> verifica se "teste" está na mensagem se tiver tamanho razoável
            name_parts = [p.lower() for p in s['name'].split() if len(p) > 3]
            
            if s['name'].lower() in message_lower:
                found_ids.append(s['id'])
            elif any(part in message_lower for part in name_parts):
                found_ids.append(s['id'])
                
        if found_ids:
            return Store.query.filter(Store.id.in_(found_ids)).all()
        return []
