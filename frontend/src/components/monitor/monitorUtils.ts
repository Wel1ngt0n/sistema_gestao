
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
    if (!status) return 'bg-slate-100 text-slate-600 border-slate-200 border';
    const s = status.toLowerCase();

    // Sucesso / Concluído
    if (s.includes('conclu') || s.includes('finaliz') || s.includes('complete') || s === 'done')
        return 'bg-emerald-100 text-emerald-700 border-emerald-200 hover:bg-emerald-200 border';

    // Ativo / Em Progresso
    if (s.includes('execu') || s.includes('andamento') || s.includes('progresso') || s === 'in_progress')
        return 'bg-blue-100 text-blue-700 border-blue-200 hover:bg-blue-200 border';

    // CORES ESPECÍFICAS POR ESTÁGIO (Etapas de Implantação Instabuy)

    // 1. Configuração Inicial / Omie
    if (s.includes('omie') || s.includes('cadastro') || s.includes('setup'))
        return 'bg-indigo-100 text-indigo-700 border-indigo-200 hover:bg-indigo-200 border';

    // 2. Integração / ERP
    if (s.includes('integra') || s.includes('erp') || s.includes('conex'))
        return 'bg-violet-100 text-violet-700 border-violet-200 hover:bg-violet-200 border';

    // 3. Produtos / Cardápio / Catálogo
    if (s.includes('produt') || s.includes('cardap') || s.includes('catal'))
        return 'bg-pink-100 text-pink-700 border-pink-200 hover:bg-pink-200 border';

    // 4. Treinamento / Onboarding
    if (s.includes('treina') || s.includes('onboard') || s.includes('ensin'))
        return 'bg-amber-100 text-amber-700 border-amber-200 hover:bg-amber-200 border';

    // 5. Go Live / Teste / Revisão
    if (s.includes('teste') || s.includes('homolog') || s.includes('valid'))
        return 'bg-teal-100 text-teal-700 border-teal-200 hover:bg-teal-200 border';

    // Crítico / Bloqueado
    if (s.includes('imped') || s.includes('block') || s === 'blocked' || s.includes('travad'))
        return 'bg-red-100 text-red-700 border-red-200 font-bold hover:bg-red-200 border';

    // Aviso / Atrasado / Risco
    if (s.includes('atras') || s.includes('risk'))
        return 'bg-rose-100 text-rose-700 border-rose-200 animate-pulse hover:bg-rose-200 border';

    // Aguardando / Cliente / Pendente (Laranja Instabuy)
    if (s.includes('client') || s.includes('pend') || s.includes('aguard') || s.includes('espera'))
        return 'bg-orange-100 text-orange-700 border-orange-200 hover:bg-orange-200 border';

    // Financeiro / Pagamento
    if (s.includes('financeiro') || s.includes('pgto') || s.includes('pagamento'))
        return 'bg-yellow-100 text-yellow-700 border-yellow-200 hover:bg-yellow-200 border';

    // Reuniões / Agendamento
    if (s.includes('agend') || s.includes('reuni'))
        return 'bg-purple-100 text-purple-700 border-purple-200 hover:bg-purple-200 border';

    // Cancelado / Em Espera
    if (s.includes('cancel') || s.includes('hold'))
        return 'bg-slate-200 text-slate-500 border-slate-300 decoration-line-through/50';

    // Padrão / Não Iniciado
    if (s.includes('fila') || s.includes('backlog') || s.includes('novo') || s === 'not_started')
        return 'bg-slate-100 text-slate-600 border-slate-200 border';

    return 'bg-slate-100 text-slate-600 border-slate-200 border';
}

// Helper para Status do Deep Sync
export const getDeepSyncColor = (status: string) => {
    switch (status) {
        case 'COMPLETE': return 'bg-green-100 text-green-700 border-green-200';
        case 'PARTIAL': return 'bg-yellow-100 text-yellow-700 border-yellow-200';
        case 'FAILED': return 'bg-red-100 text-red-700 border-red-200';
        default: return 'bg-slate-100 text-slate-500';
    }
}
