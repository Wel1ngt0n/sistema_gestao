export const formatDate = (value: string | null, withTime = false): string => {
    if (!value) return 'Não informado';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return 'Data inválida';
    return new Intl.DateTimeFormat('pt-BR', {
        timeZone: 'America/Sao_Paulo',
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        ...(withTime ? { hour: '2-digit', minute: '2-digit' } : {}),
    }).format(date);
};

export const formatDuration = (seconds: number | null): string => {
    if (seconds === null || !Number.isFinite(seconds)) return 'Não calculado';
    if (seconds < 60) return '< 1 min';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes} min`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ${minutes % 60}min`;
    const days = Math.floor(hours / 24);
    const remainingHours = hours % 24;
    return remainingHours ? `${days}d ${remainingHours}h` : `${days}d`;
};

export const safeStatusColor = (value: string | null): string => {
    if (value && /^#[0-9a-f]{3,8}$/i.test(value)) return value;
    return '#94a3b8';
};

export const reconciliationLabel = (status: string): string => ({
    NOT_IN_INTEGRATION: 'Ainda não entrou',
    MATCHED: 'Reconciliada',
    AMBIGUOUS: 'Vínculo ambíguo',
    ORPHAN_INTEGRATION_TASK: 'Tarefa órfã',
    DATA_ERROR: 'Inconsistência de dados',
}[status] || status);

export const reconciliationTone = (status: string): string => ({
    NOT_IN_INTEGRATION: 'border-slate-200 bg-slate-100 text-slate-700',
    MATCHED: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    AMBIGUOUS: 'border-amber-200 bg-amber-50 text-amber-700',
    ORPHAN_INTEGRATION_TASK: 'border-violet-200 bg-violet-50 text-violet-700',
    DATA_ERROR: 'border-rose-200 bg-rose-50 text-rose-700',
}[status] || 'border-slate-200 bg-slate-50 text-slate-600');
