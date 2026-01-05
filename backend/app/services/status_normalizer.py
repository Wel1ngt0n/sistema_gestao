class StatusNormalizer:
    """
    Normaliza status variados do ClickUp para um Enum interno padrão.
    Enum: IN_PROGRESS, DONE, BLOCKED, NOT_STARTED
    """
    
    DONE_STATUSES = [
        "concluído", "concluido", "complete", "finished", "closed", 
        "arquivado", "finalizado", "encerrado", "done"
    ]
    
    BLOCKED_STATUSES = [
        "travado", "impedimento", "blocked", "hold", " congelado",
        "jurídico", "financeiro", "aguardando cliente", "pausado"
    ]
    
    NOT_STARTED_STATUSES = [
        "to do", "novo", "backlog", "fila", "pendente", "not started"
    ]

    @staticmethod
    def normalize(raw_status: str) -> str:
        if not raw_status:
            return "IN_PROGRESS"
            
        s = raw_status.lower().strip()
        
        if any(x in s for x in StatusNormalizer.DONE_STATUSES):
            return "DONE"
            
        if any(x in s for x in StatusNormalizer.BLOCKED_STATUSES):
            return "BLOCKED"
            
        if any(x in s for x in StatusNormalizer.NOT_STARTED_STATUSES):
            return "NOT_STARTED"
            
        # Default fallback
        return "IN_PROGRESS"
