
// Helper para formatar moeda
export const formatCurrency = (val: number | undefined | null) => {
    if (val === undefined || val === null) return '-';
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
}

// Helper para data
export const formatDate = (dateStr: string | null | undefined) => {
    if (!dateStr) return '-';
    const [y, m, d] = dateStr.split('-');
    return `${d}/${m}/${y}`;
}

// Helper para Cores de Status
export const getStatusColor = (status: string | null) => {
    if (!status) return 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700 border';
    const s = status.toLowerCase();

    // Sucesso / Concluído
    if (s.includes('conclu') || s.includes('finaliz') || s.includes('complete') || s === 'done')
        return 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20 hover:bg-emerald-200 dark:hover:bg-emerald-500/20 border';

    // Ativo / Em Progresso
    if (s.includes('execu') || s.includes('andamento') || s.includes('progresso') || s === 'in_progress')
        return 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-500/20 hover:bg-blue-200 dark:hover:bg-blue-500/20 border';

    // CORES ESPECÍFICAS POR ESTÁGIO (Etapas de Implantação Instabuy)

    // 1. Configuração Inicial / Omie
    if (s.includes('omie') || s.includes('cadastro') || s.includes('setup'))
        return 'bg-indigo-100 text-indigo-700 border-indigo-200 dark:bg-indigo-500/10 dark:text-indigo-400 dark:border-indigo-500/20 hover:bg-indigo-200 dark:hover:bg-indigo-500/20 border';

    // 2. Integração / ERP
    if (s.includes('integra') || s.includes('erp') || s.includes('conex'))
        return 'bg-violet-100 text-violet-700 border-violet-200 dark:bg-violet-500/10 dark:text-violet-400 dark:border-violet-500/20 hover:bg-violet-200 dark:hover:bg-violet-500/20 border';

    // 3. Produtos / Cardápio / Catálogo
    if (s.includes('produt') || s.includes('cardap') || s.includes('catal'))
        return 'bg-pink-100 text-pink-700 border-pink-200 dark:bg-pink-500/10 dark:text-pink-400 dark:border-pink-500/20 hover:bg-pink-200 dark:hover:bg-pink-500/20 border';

    // 4. Treinamento / Onboarding
    if (s.includes('treina') || s.includes('onboard') || s.includes('ensin'))
        return 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20 hover:bg-amber-200 dark:hover:bg-amber-500/20 border';

    // 5. Go Live / Teste / Revisão
    if (s.includes('teste') || s.includes('homolog') || s.includes('valid'))
        return 'bg-teal-100 text-teal-700 border-teal-200 dark:bg-teal-500/10 dark:text-teal-400 dark:border-teal-500/20 hover:bg-teal-200 dark:hover:bg-teal-500/20 border';

    // Crítico / Bloqueado
    if (s.includes('imped') || s.includes('block') || s === 'blocked' || s.includes('travad'))
        return 'bg-red-100 text-red-700 border-red-200 font-bold dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/20 hover:bg-red-200 dark:hover:bg-red-500/20 border';

    // Aviso / Atrasado / Risco
    if (s.includes('atras') || s.includes('risk'))
        return 'bg-rose-100 text-rose-700 border-rose-200 animate-pulse dark:bg-rose-500/10 dark:text-rose-400 dark:border-rose-500/20 hover:bg-rose-200 dark:hover:bg-rose-500/20 border';

    // Aguardando / Cliente / Pendente (Laranja Instabuy)
    if (s.includes('client') || s.includes('pend') || s.includes('aguard') || s.includes('espera'))
        return 'bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-500/10 dark:text-orange-400 dark:border-orange-500/20 hover:bg-orange-200 dark:hover:bg-orange-500/20 border';

    // Financeiro / Pagamento
    if (s.includes('financeiro') || s.includes('pgto') || s.includes('pagamento'))
        return 'bg-yellow-100 text-yellow-700 border-yellow-200 dark:bg-yellow-500/10 dark:text-yellow-400 dark:border-yellow-500/20 hover:bg-yellow-200 dark:hover:bg-yellow-500/20 border';

    // Reuniões / Agendamento
    if (s.includes('agend') || s.includes('reuni'))
        return 'bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-500/10 dark:text-purple-400 dark:border-purple-500/20 hover:bg-purple-200 dark:hover:bg-purple-500/20 border';

    // Cancelado / Em Espera
    if (s.includes('cancel') || s.includes('hold'))
        return 'bg-slate-200 text-slate-500 border-slate-300 decoration-line-through dark:bg-slate-700/50 dark:text-slate-500 dark:border-slate-600';

    // Padrão / Não Iniciado
    if (s.includes('fila') || s.includes('backlog') || s.includes('novo') || s === 'not_started')
        return 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700 border';

    return 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700 border';
}

// Helper para Status do Deep Sync
export const getDeepSyncColor = (status: string) => {
    switch (status) {
        case 'COMPLETE': return 'bg-green-100 text-green-700 border-green-200 dark:bg-green-500/20 dark:text-green-400 dark:border-green-500/50';
        case 'PARTIAL': return 'bg-yellow-100 text-yellow-700 border-yellow-200 dark:bg-yellow-500/20 dark:text-yellow-400 dark:border-yellow-500/50';
        case 'FAILED': return 'bg-red-100 text-red-700 border-red-200 dark:bg-red-500/20 dark:text-red-400 dark:border-red-500/50';
        default: return 'bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-500';
    }
}
