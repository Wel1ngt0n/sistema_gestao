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
        """Coleta status e comentários relevantes das lojas."""
        data = []
        
        keywords = ["Integração", "App", "Qualidade", "Treinamento", "Financeiro"]
        
        for s in stores:
            store_info = {
                "id": s.id,
                "name": s.store_name,
                "type": s.tipo_loja,
                "days_in_progress": s.dias_em_progresso,
                "status": s.status_norm,
                "comments_summary": []
            }
            
            # A. Comentários do Card Pai (Máx 5 mais recentes)
            try:
                comments = self.clickup.get_task_comments(s.clickup_task_id)
                if comments:
                    # Filter: Pegar texto de comentários recentes não automáticos
                    relevant_comments = [c['comment_text'] for c in comments[:5] if c.get('comment_text')]
                    if relevant_comments:
                        store_info["comments_summary"].append(f"CARD PAI: {' | '.join(relevant_comments)}")
            except Exception as e:
                logger.error(f"Erro ao buscar comments parent {s.store_name}: {e}")

            # B. Comentários de Tarefas Críticas (Apenas se estagnadas ou keywords)
            # Buscar passos no DB
            steps = TaskStep.query.filter_by(store_id=s.id).filter(
                TaskStep.status != 'closed'
            ).all()
            
            for step in steps:
                # Se nome combina com keywords
                if any(k.lower() in step.step_name.lower() for k in keywords):
                    try:
                        step_comments = self.clickup.get_task_comments(step.clickup_task_id)
                        if step_comments:
                            last_comment = step_comments[0].get('comment_text', '') # Pegar só o último
                            if last_comment:
                                store_info["comments_summary"].append(f"TAREFA '{step.step_name}': {last_comment}")
                    except:
                        pass
            
            data.append(store_info)
            
        return data

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


