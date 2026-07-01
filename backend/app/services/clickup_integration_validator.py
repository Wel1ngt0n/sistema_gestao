import os
import logging
from config import Config
from app.services.clickup import ClickUpService

logger = logging.getLogger(__name__)

STATUS_CADASTRO_OMIE_CONCLUIDOS = [
    "concluído", "concluido", "done", "closed", "finalizado"
]

STATUS_INTEGRACAO_CONCLUIDOS = [
    "implantado", "concluído", "concluido", "done", "closed", "finalizado"
]

ETAPAS_POSTERIORES = [
    "cadastro de produtos", "onboarding", "treinamento", "criar lojas",
    "subir apps", "qualidade", "ativar recorrência", "pós-implantação", "pos-implantação"
]

FATHER_TASK_FIELD_ID = "553cb505-acc0-401e-8760-f73879a3aad7"

class ClickUpIntegrationValidator:
    def __init__(self):
        self.clickup = ClickUpService()
        self.mode = os.getenv("CLICKUP_VALIDATOR_MODE", "audit").lower()
        self.logs = []
        
        # Cache for tasks in lists to avoid fetching multiple times
        self.omie_tasks_cache = []
        self.integration_tasks_cache = []
        self._load_caches()

    def _load_caches(self):
        logger.info("[Validator] Loading tasks from Cadastro Omie list...")
        self.omie_tasks_cache = self.clickup.fetch_tasks_from_list(Config.LIST_IDS_STEPS["CADASTRO_OMIE"])
        logger.info("[Validator] Loading tasks from Integracao list...")
        self.integration_tasks_cache = self.clickup.fetch_tasks_from_list(Config.LIST_IDS_STEPS["INTEGRACAO"])

    def registrar_log(self, card_pai, result, action, integracao=None):
        log_entry = {
            "card_pai_id": card_pai.get("id"),
            "card_pai_custom_id": card_pai.get("custom_id"),
            "result": result,
            "action": action,
            "integracao_id": integracao.get("id") if integracao else None
        }
        self.logs.append(log_entry)
        prefix = "[AUDIT]" if self.mode == "audit" else "[FIX]"
        logger.info(f"{prefix} Validator Log: {log_entry}")

    def normalize_status(self, status):
        if not status:
            return ""
        if isinstance(status, dict):
            return status.get("status", "").lower().strip()
        return str(status).lower().strip()

    def _get_custom_field_value(self, task, field_id):
        for field in task.get("custom_fields", []):
            if field.get("id") == field_id:
                return field.get("value")
        return None

    def buscar_card_cadastro_omie(self, father_id):
        for task in self.omie_tasks_cache:
            fid = self._get_custom_field_value(task, FATHER_TASK_FIELD_ID)
            if fid == father_id:
                return task
        return None

    def buscar_integracoes_por_father_task_id(self, father_id):
        results = []
        for task in self.integration_tasks_cache:
            fid = self._get_custom_field_value(task, FATHER_TASK_FIELD_ID)
            if fid == father_id:
                results.append(task)
        return results

    def buscar_integracao_por_fallback(self, card_pai):
        # Fallback by name or description URL
        loja_name = card_pai.get("name", "").lower()
        pai_url = card_pai.get("url", "")
        
        for task in self.integration_tasks_cache:
            # Skip if it already has a different father_id
            fid = self._get_custom_field_value(task, FATHER_TASK_FIELD_ID)
            if fid and fid != card_pai.get("custom_id"):
                continue

            t_name = task.get("name", "").lower()
            t_desc = task.get("description", "")
            
            if (loja_name and loja_name in t_name) or (pai_url and pai_url in t_desc):
                return task
        return None

    def atualizar_father_task_id(self, task_id, father_id):
        if self.mode == "audit":
            logger.info(f"[AUDIT] Would update task {task_id} _father_task_id to {father_id}")
            return
        
        payload = {
            "value": father_id
        }
        self.clickup._post(f"task/{task_id}/field/{FATHER_TASK_FIELD_ID}", payload=payload)
        logger.info(f"[FIX] Updated task {task_id} _father_task_id to {father_id}")

    def mover_card_para_cadastro_omie(self, card_pai):
        if self.mode == "audit":
            logger.info(f"[AUDIT] Would move parent card {card_pai.get('id')} to 'cadastro omie'")
            return
        
        payload = {
            "status": "cadastro omie"
        }
        self.clickup._put(f"task/{card_pai.get('id')}", payload=payload)
        logger.info(f"[FIX] Moved parent card {card_pai.get('id')} to 'cadastro omie'")

    def comentar_no_card(self, task_id, comment):
        if self.mode == "audit":
            logger.info(f"[AUDIT] Would comment on {task_id}: {comment}")
            return
        
        payload = {
            "comment_text": comment
        }
        self.clickup._post(f"task/{task_id}/comment", payload=payload)
        logger.info(f"[FIX] Commented on {task_id}")

    def cadastro_omie_concluido(self, cadastro_omie):
        status = self.normalize_status(cadastro_omie.get("status"))
        return status in STATUS_CADASTRO_OMIE_CONCLUIDOS

    def integracao_concluida(self, integracao):
        status = self.normalize_status(integracao.get("status"))
        return status in STATUS_INTEGRACAO_CONCLUIDOS

    def garantir_integracao_configurada(self, card_pai):
        father_id = card_pai.get("custom_id")
        if not father_id:
            return {"result": "erro_sem_custom_id"}

        integracoes = self.buscar_integracoes_por_father_task_id(father_id)

        if len(integracoes) > 1:
            return {
                "result": "duplicidade_integracao",
                "integracoes": integracoes
            }

        if len(integracoes) == 1:
            return {
                "result": "integracao_encontrada",
                "integracao": integracoes[0]
            }

        integracao_provavel = self.buscar_integracao_por_fallback(card_pai)

        if integracao_provavel:
            self.atualizar_father_task_id(integracao_provavel["id"], father_id)
            return {
                "result": "integracao_corrigida",
                "integracao": integracao_provavel
            }

        return {
            "result": "integracao_ausente",
            "integracao": None
        }

    def validar_status_card_principal(self, card_pai, integracao):
        status_pai = self.normalize_status(card_pai.get("status"))

        if self.integracao_concluida(integracao):
            self.registrar_log(
                card_pai=card_pai,
                integracao=integracao,
                result="integracao_concluida",
                action="no_status_change"
            )
            return

        if status_pai in ETAPAS_POSTERIORES:
            self.mover_card_para_cadastro_omie(card_pai)
            self.registrar_log(
                card_pai=card_pai,
                integracao=integracao,
                result="integracao_pendente",
                action="moved_parent_to_cadastro_omie"
            )
            self.comentar_no_card(
                card_pai["id"],
                "Validação automática: o card foi retornado para Cadastro Omie porque o Cadastro Omie foi concluído, mas a Integração ainda não está concluída."
            )
            return

        self.registrar_log(
            card_pai=card_pai,
            integracao=integracao,
            result="integracao_pendente_parent_not_advanced",
            action="no_status_change"
        )

    def validar_card_principal(self, card_pai):
        father_id = card_pai.get("custom_id")
        if not father_id:
            self.registrar_log(card_pai, "sem_custom_id", "skip_integration_validation")
            return

        # 1. Validar pré-condição: Cadastro Omie concluído
        cadastro_omie = self.buscar_card_cadastro_omie(father_id)

        if not cadastro_omie:
            self.registrar_log(card_pai, "cadastro_omie_nao_encontrado", "skip_integration_validation")
            return

        if not self.cadastro_omie_concluido(cadastro_omie):
            self.registrar_log(card_pai, "aguardando_cadastro_omie", "skip_integration_validation")
            return

        # 2. FASE 1 — Garantir Integração configurada
        integracao_result = self.garantir_integracao_configurada(card_pai)

        if integracao_result["result"] == "duplicidade_integracao":
            self.registrar_log(card_pai, "duplicidade_integracao", "skip_status_validation")
            return

        integracao = integracao_result.get("integracao")

        if not integracao:
            self.registrar_log(card_pai, "integracao_indisponivel", "skip_status_validation")
            return

        # 3. FASE 2 — Validar status do card principal
        self.validar_status_card_principal(card_pai, integracao)

    def run_validation(self):
        logger.info(f"Iniciando Validador de Integracao no modo {self.mode.upper()}...")
        # Get all parent tasks (Lojas) that are open
        parent_tasks = self.clickup.fetch_parent_tasks(include_closed=False)
        for task in parent_tasks:
            self.validar_card_principal(task)
        
        logger.info("Validador de Integracao finalizado.")
        return self.logs
