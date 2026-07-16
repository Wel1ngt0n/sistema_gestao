import { Activity, AlertTriangle, Ban, CheckCircle2, Clock3, Layers3, Link2, Store } from 'lucide-react';
import { IntegrationV2Metrics } from '../types';
import { formatDuration } from '../utils';

interface IntegrationMetricsProps {
    metrics?: IntegrationV2Metrics;
    loading: boolean;
}

const metricItems = (metrics: IntegrationV2Metrics) => [
    { label: 'Lojas de 2026', value: metrics.totalStores.toLocaleString('pt-BR'), icon: Store, tone: 'text-slate-700 bg-slate-100' },
    { label: 'Implantação finalizada', value: metrics.implantationCompleted.toLocaleString('pt-BR'), icon: CheckCircle2, tone: 'text-emerald-700 bg-emerald-50' },
    { label: 'Implantação ativa', value: metrics.implantationActive.toLocaleString('pt-BR'), icon: Activity, tone: 'text-cyan-700 bg-cyan-50' },
    { label: 'Ainda não entraram', value: metrics.notEntered.toLocaleString('pt-BR'), icon: Layers3, tone: 'text-blue-700 bg-blue-50' },
    { label: 'Cobertura', value: `${metrics.coveragePercent.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%`, icon: Link2, tone: 'text-emerald-700 bg-emerald-50' },
    { label: 'Em andamento', value: metrics.workInProgress.toLocaleString('pt-BR'), icon: Clock3, tone: 'text-cyan-700 bg-cyan-50' },
    { label: 'Bloqueadas agora', value: metrics.blockedNow.toLocaleString('pt-BR'), icon: Ban, tone: 'text-rose-700 bg-rose-50' },
    { label: 'Lead time médio', value: formatDuration(metrics.averageLeadTimeSeconds), icon: AlertTriangle, tone: 'text-amber-700 bg-amber-50' },
];

export default function IntegrationMetrics({ metrics, loading }: IntegrationMetricsProps) {
    if (loading || !metrics) {
        return (
            <div className="grid grid-cols-2 gap-2 md:grid-cols-4 2xl:grid-cols-8">
                {Array.from({ length: 8 }).map((_, index) => (
                    <div key={index} className="h-[74px] animate-pulse rounded-lg border border-slate-200 bg-white" />
                ))}
            </div>
        );
    }

    return (
        <div className="grid grid-cols-2 gap-2 md:grid-cols-4 2xl:grid-cols-8">
            {metricItems(metrics).map((item) => (
                <div key={item.label} className="flex min-w-0 items-center gap-3 rounded-lg border border-slate-200 bg-white px-3 py-3 shadow-sm">
                    <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-md ${item.tone}`}>
                        <item.icon size={17} aria-hidden="true" />
                    </div>
                    <div className="min-w-0">
                        <p className="truncate text-[10px] font-bold uppercase text-slate-400">{item.label}</p>
                        <p className="mt-0.5 truncate text-lg font-bold text-slate-800">{item.value}</p>
                    </div>
                </div>
            ))}
        </div>
    );
}
