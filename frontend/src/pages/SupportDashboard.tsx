import { useEffect, useMemo, useState, type ElementType, type ReactNode } from 'react';
import {
  Activity,
  AlertCircle,
  BarChart3,
  CheckCircle2,
  Clock3,
  Database,
  FileUp,
  Link2,
  MessageSquare,
  RefreshCw,
  Search,
  ShieldCheck,
  Star,
  UploadCloud,
  Users,
  Webhook,
  X,
} from 'lucide-react';
import { api } from '../services/api';

type TabKey = 'operacao' | 'equipe' | 'qualidade' | 'conversas' | 'fontes';

interface SupportKpis {
  open_conversations: number;
  closed_conversations: number;
  messages_in: number;
  messages_out: number;
  avg_response_time: string;
  avg_response_time_seconds: number;
  avg_nps: number | null;
  pending_tickets: number;
  open_tickets: number;
  last_sync: string;
  last_import: string;
}

interface AgentPerf {
  agent_name: string;
  group_name?: string;
  total_contacts: number;
  total_conversations: number;
  closed_conversations: number;
  total_messages_sent: number;
  avg_response_time_seconds: number;
  avg_close_time_seconds: number;
  avg_nps: number | null;
  nps_count: number;
  pending_tickets: number;
  open_tickets: number;
  activities_today: number;
  last_activity_at?: string | null;
}

interface MessageItem {
  id: number;
  text: string;
  direction: 'IN' | 'OUT';
  status: string;
  contact_name: string;
  timestamp: string | null;
  source?: string;
}

interface NpsFeedback {
  id: number;
  contact_name: string;
  agent_name?: string | null;
  nps_score: number;
  nps_comment?: string | null;
  date?: string | null;
  source?: string;
}

interface ImportBatch {
  id: number;
  status: string;
  files_count: number;
  rows_total: number;
  rows_imported: number;
  errors_count: number;
  started_at?: string | null;
  finished_at?: string | null;
  stats?: Array<{ file: string; type: string; stats: Record<string, unknown> }>;
}

interface SourceHealth {
  webhooks?: {
    total_events: number;
    pending_events: number;
    last_received_at?: string | null;
    last_processed_at?: string | null;
    last_event_type?: string | null;
  };
  imports?: {
    last_status: string;
    last_finished_at?: string | null;
    last_batches: ImportBatch[];
  };
}

interface OverviewData {
  period: string;
  kpis: SupportKpis;
  agents: AgentPerf[];
  messages: MessageItem[];
  nps_feedbacks: NpsFeedback[];
  hourly_response: Array<{ hour: string; day: string; seconds: number }>;
  close_reasons: Array<{ reason: string; conversations?: number; contacts?: number; close_time_seconds?: number }>;
  daily_series: Record<string, Array<{ label: string; value: number }>>;
  source_health: SourceHealth;
  imports: ImportBatch[];
}

interface OrphanContact {
  id: number;
  name: string;
  phone?: string;
  created_at?: string | null;
}

interface ConversationItem {
  id: number;
  contact_name: string;
  phone?: string | null;
  status?: string | null;
  channel?: string | null;
  agent_name?: string | null;
  created_at?: string | null;
  nps_score?: number | null;
  source?: string;
}

const emptyKpis: SupportKpis = {
  open_conversations: 0,
  closed_conversations: 0,
  messages_in: 0,
  messages_out: 0,
  avg_response_time: '0m',
  avg_response_time_seconds: 0,
  avg_nps: null,
  pending_tickets: 0,
  open_tickets: 0,
  last_sync: 'Nunca',
  last_import: 'Nunca',
};

const formatTime = (seconds?: number | null) => {
  if (!seconds) return '0m';
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m`;
  return `${Math.floor(seconds)}s`;
};

const formatDate = (value?: string | null) => {
  if (!value) return '-';
  return new Date(value).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
};

const cn = (...classes: Array<string | false | undefined>) => classes.filter(Boolean).join(' ');

const MetricCard = ({
  label,
  value,
  helper,
  icon: Icon,
  color = 'orange',
}: {
  label: string;
  value: string | number;
  helper: string;
  icon: ElementType;
  color?: 'orange' | 'green' | 'blue' | 'red' | 'slate';
}) => {
  const accents = {
    orange: 'bg-orange-500 text-orange-600',
    green: 'bg-emerald-500 text-emerald-600',
    blue: 'bg-sky-500 text-sky-600',
    red: 'bg-rose-500 text-rose-600',
    slate: 'bg-slate-500 text-slate-600',
  };
  const [bar, text] = accents[color].split(' ');

  return (
    <div className="group relative rounded-lg border border-zinc-200 bg-white p-5 shadow-sm transition-all duration-200 hover:border-zinc-300 hover:shadow-md">
      <div className={cn('absolute inset-x-0 top-0 h-0.5 rounded-t-lg opacity-80', bar)} />
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">{label}</p>
          <p className="mt-2 text-3xl font-semibold tracking-tight text-zinc-950">{value}</p>
        </div>
        <div className={cn('rounded-md border border-zinc-200 bg-zinc-50 p-2 transition-colors group-hover:bg-white', text)}>
          <Icon size={18} strokeWidth={2} />
        </div>
      </div>
      <div className="h-1 w-full rounded-full bg-zinc-100">
        <div className={cn('h-1 w-2/5 rounded-full', bar)} />
      </div>
      <p className="mt-3 text-sm text-zinc-500">{helper}</p>
    </div>
  );
};

const Section = ({ title, subtitle, children }: { title: string; subtitle?: string; children: ReactNode }) => (
  <section className="rounded-lg border border-zinc-200 bg-white p-5 shadow-sm">
    <div className="mb-5 flex flex-col gap-1">
      <h2 className="text-sm font-semibold text-zinc-950">{title}</h2>
      {subtitle && <p className="text-sm text-zinc-500">{subtitle}</p>}
    </div>
    {children}
  </section>
);

const SourceBadge = ({ source }: { source?: string }) => (
  <span className={cn(
    'inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-semibold',
    source === 'Webhook' ? 'bg-sky-50 text-sky-700' : source === 'Unificado' ? 'bg-emerald-50 text-emerald-700' : 'bg-zinc-100 text-zinc-600'
  )}>
    {source || 'CSV'}
  </span>
);

export const SupportDashboard = () => {
  const currentMonth = new Date().toISOString().substring(0, 7);
  const [selectedPeriod, setSelectedPeriod] = useState(currentMonth);
  const [importPeriod, setImportPeriod] = useState(currentMonth);
  const [periods, setPeriods] = useState<string[]>([currentMonth]);
  const [overview, setOverview] = useState<OverviewData | null>(null);
  const [orphans, setOrphans] = useState<OrphanContact[]>([]);
  const [conversations, setConversations] = useState<ConversationItem[]>([]);
  const [webhookEvents, setWebhookEvents] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<TabKey>('operacao');
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [importing, setImporting] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [search, setSearch] = useState('');
  const [linkingContact, setLinkingContact] = useState<OrphanContact | null>(null);
  const [storeName, setStoreName] = useState('');

  const kpis = overview?.kpis || emptyKpis;
  const maxCloseReason = useMemo(() => {
    return Math.max(...(overview?.close_reasons || []).map((item) => item.conversations || 0), 1);
  }, [overview]);

  const fetchPeriods = async () => {
    const response = await api.get('/api/support/periods').catch(() => ({ data: [currentMonth] }));
    const data = Array.isArray(response.data) && response.data.length ? response.data : [currentMonth];
    setPeriods(data);
    if (!data.includes(selectedPeriod)) setSelectedPeriod(data[0]);
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const [overviewRes, orphanRes, eventsRes, convRes] = await Promise.all([
        api.get(`/api/support/overview?period=${selectedPeriod}`),
        api.get('/api/support/orphans').catch(() => ({ data: [] })),
        api.get('/api/webhooks/events').catch(() => ({ data: [] })),
        api.get(`/api/support/conversations?period=${selectedPeriod}&q=${encodeURIComponent(search)}&page_size=30`).catch(() => ({ data: { items: [] } })),
      ]);
      setOverview(overviewRes.data);
      setOrphans(Array.isArray(orphanRes.data) ? orphanRes.data : []);
      setWebhookEvents(Array.isArray(eventsRes.data) ? eventsRes.data : []);
      setConversations(Array.isArray(convRes.data?.items) ? convRes.data.items : []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPeriods();
  }, []);

  useEffect(() => {
    fetchData();
    const interval = window.setInterval(fetchData, 600000);
    return () => window.clearInterval(interval);
  }, [selectedPeriod]);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      if (activeTab === 'conversas') fetchData();
    }, 350);
    return () => window.clearTimeout(timeout);
  }, [search]);

  const handleFiles = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    setSelectedFiles((prev) => [...prev, ...files]);
    event.target.value = '';
  };

  const handleImport = async () => {
    if (!selectedFiles.length) return;
    setImporting(true);
    try {
      const formData = new FormData();
      formData.append('period', importPeriod);
      selectedFiles.forEach((file) => formData.append('files', file));
      await api.post('/api/support/import-csv', formData);
      setSelectedFiles([]);
      await fetchPeriods();
      await fetchData();
    } finally {
      setImporting(false);
    }
  };

  const handleSync = async () => {
    setSyncing(true);
    try {
      await api.post('/api/support/sync');
      await fetchData();
    } finally {
      setSyncing(false);
    }
  };

  const submitStoreLink = async () => {
    if (!linkingContact || !storeName.trim()) return;
    await api.post('/api/support/link-store', { contact_id: linkingContact.id, store_name: storeName.trim() });
    setLinkingContact(null);
    setStoreName('');
    await fetchData();
  };

  if (loading && !overview) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-zinc-200 border-t-[#ff7900]" />
      </div>
    );
  }

  const tabs: Array<{ key: TabKey; label: string; icon: ElementType }> = [
    { key: 'operacao', label: 'Operacao', icon: Activity },
    { key: 'equipe', label: 'Equipe', icon: Users },
    { key: 'qualidade', label: 'Qualidade', icon: Star },
    { key: 'conversas', label: 'Conversas', icon: MessageSquare },
    { key: 'fontes', label: 'Fontes', icon: Database },
  ];

  return (
    <div className="w-full">
      <div className="mx-auto w-full max-w-[1920px] space-y-6 p-6 lg:p-10">
        <header className="flex flex-col gap-5 rounded-lg border border-zinc-200 bg-white p-5 shadow-sm xl:flex-row xl:items-center xl:justify-between">
          <div>
            <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-orange-600">
              <ShieldCheck size={14} />
              Suporte Zenvia
            </div>
            <h1 className="text-2xl font-semibold tracking-tight text-zinc-950">Central operacional de suporte</h1>
            <p className="mt-1 max-w-3xl text-sm text-zinc-500">
              Dados historicos entram por upload de CSV no sistema. Webhooks alimentam eventos recentes em tempo quase real.
            </p>
          </div>

          <div className="flex flex-col gap-3 md:flex-row md:items-center">
            <div className="flex items-center gap-2 rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2">
              <Clock3 size={16} className="text-zinc-500" />
              <input
                type="month"
                value={selectedPeriod}
                onChange={(event) => setSelectedPeriod(event.target.value)}
                className="bg-transparent text-sm font-semibold text-zinc-800 outline-none"
              />
            </div>
            {periods.length > 1 && (
              <div className="hidden items-center gap-1 rounded-lg border border-zinc-200 bg-white p-1 lg:flex">
                {periods.slice(0, 4).map((period) => (
                  <button
                    key={period}
                    onClick={() => setSelectedPeriod(period)}
                    className={cn(
                      'rounded-md px-3 py-1.5 text-xs font-semibold transition',
                      selectedPeriod === period ? 'bg-orange-50 text-orange-700' : 'text-zinc-500 hover:bg-zinc-50 hover:text-zinc-900'
                    )}
                  >
                    {period}
                  </button>
                ))}
              </div>
            )}
            <button
              onClick={handleSync}
              disabled={syncing}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#128131] px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-[#0f6b29] disabled:cursor-not-allowed disabled:bg-zinc-300"
            >
              <RefreshCw size={16} className={syncing ? 'animate-spin' : ''} />
              {syncing ? 'Processando webhooks' : 'Sincronizar webhooks'}
            </button>
          </div>
        </header>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          <MetricCard label="Conversas abertas" value={kpis.open_conversations} helper={`${kpis.closed_conversations} fechadas no periodo`} icon={MessageSquare} color="green" />
          <MetricCard label="Mensagens recebidas" value={kpis.messages_in} helper={`${kpis.messages_out} respostas enviadas`} icon={BarChart3} color="orange" />
          <MetricCard label="Tempo medio resposta" value={kpis.avg_response_time} helper="Baseado na performance importada" icon={Clock3} color="blue" />
          <MetricCard label="Pendencias da equipe" value={kpis.pending_tickets + kpis.open_tickets} helper={`${kpis.pending_tickets} pendentes, ${kpis.open_tickets} abertas`} icon={AlertCircle} color={kpis.pending_tickets > 0 ? 'red' : 'slate'} />
        </div>

        <section className="rounded-lg border border-zinc-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-sm font-semibold text-zinc-950">Importar dados historicos da Zenvia</h2>
              <p className="mt-1 text-sm text-zinc-500">Envie os CSVs exportados do painel online da Zenvia. O sistema detecta o tipo pelo cabecalho.</p>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <input
                type="month"
                value={importPeriod}
                onChange={(event) => setImportPeriod(event.target.value)}
                className="rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm font-semibold text-zinc-800 outline-none focus:border-orange-300"
              />
              <label className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-zinc-200 bg-white px-4 py-2 text-sm font-semibold text-zinc-700 transition hover:border-orange-300 hover:text-orange-600">
                <UploadCloud size={16} />
                Selecionar CSVs
                <input type="file" accept=".csv" multiple className="hidden" onChange={handleFiles} />
              </label>
              <button
                onClick={handleImport}
                disabled={!selectedFiles.length || importing}
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#ff7900] px-4 py-2 text-sm font-semibold text-white transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:bg-zinc-300"
              >
                <FileUp size={16} />
                {importing ? 'Importando' : 'Importar'}
              </button>
            </div>
          </div>

          {selectedFiles.length > 0 && (
            <div className="grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-3">
              {selectedFiles.map((file, index) => (
                <div key={`${file.name}-${index}`} className="flex items-center justify-between gap-3 rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-zinc-800">{file.name}</p>
                    <p className="text-xs text-zinc-500">{(file.size / 1024).toFixed(1)} KB</p>
                  </div>
                  <button
                    onClick={() => setSelectedFiles((prev) => prev.filter((_, itemIndex) => itemIndex !== index))}
                    className="rounded-md p-1 text-zinc-400 transition hover:bg-white hover:text-rose-600"
                    aria-label="Remover arquivo"
                  >
                    <X size={16} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>

        <div className="flex gap-2 overflow-x-auto border-b border-zinc-200">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={cn(
                  'inline-flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-semibold transition',
                  activeTab === tab.key ? 'border-orange-500 text-orange-600' : 'border-transparent text-zinc-500 hover:text-zinc-900'
                )}
              >
                <Icon size={16} />
                {tab.label}
              </button>
            );
          })}
        </div>

        {activeTab === 'operacao' && (
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
            <Section title="Motivos de fechamento" subtitle="Ranking importado dos relatorios da Zenvia">
              <div className="space-y-3">
                {(overview?.close_reasons || []).slice(0, 8).map((item) => (
                  <div key={item.reason}>
                    <div className="mb-1 flex items-center justify-between gap-3 text-sm">
                      <span className="truncate font-medium text-zinc-700">{item.reason}</span>
                      <span className="font-semibold text-zinc-950">{item.conversations || item.contacts || 0}</span>
                    </div>
                    <div className="h-2 rounded-full bg-zinc-100">
                      <div className="h-2 rounded-full bg-orange-500" style={{ width: `${Math.max(((item.conversations || 0) / maxCloseReason) * 100, 4)}%` }} />
                    </div>
                  </div>
                ))}
                {!overview?.close_reasons?.length && <p className="text-sm text-zinc-500">Importe o CSV de motivos para visualizar este bloco.</p>}
              </div>
            </Section>

            <Section title="Resposta por hora" subtitle="Piores janelas do atendimento">
              <div className="space-y-2">
                {(overview?.hourly_response || [])
                  .filter((item) => item.seconds > 0)
                  .sort((a, b) => b.seconds - a.seconds)
                  .slice(0, 10)
                  .map((item) => (
                    <div key={`${item.day}-${item.hour}`} className="flex items-center justify-between rounded-lg border border-zinc-100 px-3 py-2">
                      <span className="text-sm font-medium text-zinc-700">{item.day} as {item.hour}</span>
                      <span className="text-sm font-semibold text-zinc-950">{formatTime(item.seconds)}</span>
                    </div>
                  ))}
                {!overview?.hourly_response?.length && <p className="text-sm text-zinc-500">Importe o CSV de tempo de resposta por hora.</p>}
              </div>
            </Section>

            <Section title="Contatos sem loja" subtitle="Pendencias de vinculo operacional">
              <div className="space-y-2">
                {orphans.slice(0, 8).map((contact) => (
                  <div key={contact.id} className="flex items-center justify-between gap-3 rounded-lg border border-zinc-100 px-3 py-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-zinc-800">{contact.name || 'Sem nome'}</p>
                      <p className="text-xs text-zinc-500">{contact.phone || '-'}</p>
                    </div>
                    <button
                      onClick={() => setLinkingContact(contact)}
                      className="inline-flex items-center gap-1 rounded-md border border-orange-200 px-2 py-1 text-xs font-semibold text-orange-600 transition hover:bg-orange-50"
                    >
                      <Link2 size={13} />
                      Vincular
                    </button>
                  </div>
                ))}
                {!orphans.length && <p className="text-sm text-zinc-500">Nenhum contato orfao no momento.</p>}
              </div>
            </Section>
          </div>
        )}

        {activeTab === 'equipe' && (
          <Section title="Performance da equipe" subtitle="Volume, tempo, NPS e pendencias por atendente">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[980px] text-left">
                <thead>
                  <tr className="border-b border-zinc-100 text-xs font-semibold uppercase tracking-wide text-zinc-500">
                    <th className="px-3 py-3">Atendente</th>
                    <th className="px-3 py-3 text-right">Contatos</th>
                    <th className="px-3 py-3 text-right">Conversas</th>
                    <th className="px-3 py-3 text-right">Fechadas</th>
                    <th className="px-3 py-3 text-right">Mensagens</th>
                    <th className="px-3 py-3 text-right">Resposta</th>
                    <th className="px-3 py-3 text-right">Fechamento</th>
                    <th className="px-3 py-3 text-right">NPS</th>
                    <th className="px-3 py-3 text-right">Pendencias</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {(overview?.agents || []).map((agent) => (
                    <tr key={agent.agent_name} className="hover:bg-zinc-50">
                      <td className="px-3 py-3">
                        <p className="text-sm font-semibold text-zinc-900">{agent.agent_name}</p>
                        <p className="text-xs text-zinc-500">{agent.group_name || 'Suporte'}</p>
                      </td>
                      <td className="px-3 py-3 text-right text-sm font-medium">{agent.total_contacts}</td>
                      <td className="px-3 py-3 text-right text-sm">{agent.total_conversations}</td>
                      <td className="px-3 py-3 text-right text-sm">{agent.closed_conversations}</td>
                      <td className="px-3 py-3 text-right text-sm font-medium text-sky-700">{agent.total_messages_sent}</td>
                      <td className="px-3 py-3 text-right text-sm">{formatTime(agent.avg_response_time_seconds)}</td>
                      <td className="px-3 py-3 text-right text-sm">{formatTime(agent.avg_close_time_seconds)}</td>
                      <td className="px-3 py-3 text-right text-sm font-semibold">{agent.avg_nps === null ? '-' : `${agent.avg_nps.toFixed(1)} (${agent.nps_count})`}</td>
                      <td className="px-3 py-3 text-right text-sm">{agent.pending_tickets}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Section>
        )}

        {activeTab === 'qualidade' && (
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            <Section title="NPS recente" subtitle="Feedbacks vinculados as conversas">
              <div className="space-y-3">
                {(overview?.nps_feedbacks || []).map((feedback) => (
                  <div key={feedback.id} className="flex items-start gap-3 rounded-lg border border-zinc-100 p-3">
                    <div className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-sm font-bold', feedback.nps_score >= 9 ? 'bg-emerald-50 text-emerald-700' : feedback.nps_score >= 7 ? 'bg-amber-50 text-amber-700' : 'bg-rose-50 text-rose-700')}>
                      {feedback.nps_score}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-semibold text-zinc-900">{feedback.contact_name}</p>
                        <SourceBadge source={feedback.source} />
                      </div>
                      <p className="mt-1 text-xs text-zinc-500">{feedback.agent_name || 'Sem atendente'} - {formatDate(feedback.date)}</p>
                      {feedback.nps_comment && <p className="mt-2 line-clamp-2 text-sm text-zinc-600">{feedback.nps_comment}</p>}
                    </div>
                  </div>
                ))}
                {!overview?.nps_feedbacks?.length && <p className="text-sm text-zinc-500">Sem NPS para o periodo selecionado.</p>}
              </div>
            </Section>

            <Section title="Sinais de qualidade" subtitle="Resumo das fontes importadas">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="rounded-lg border border-zinc-100 p-4">
                  <p className="text-xs font-semibold uppercase text-zinc-500">NPS medio</p>
                  <p className="mt-2 text-3xl font-semibold text-zinc-950">{kpis.avg_nps === null ? '-' : kpis.avg_nps.toFixed(1)}</p>
                </div>
                <div className="rounded-lg border border-zinc-100 p-4">
                  <p className="text-xs font-semibold uppercase text-zinc-500">Tempo medio</p>
                  <p className="mt-2 text-3xl font-semibold text-zinc-950">{kpis.avg_response_time}</p>
                </div>
                <div className="rounded-lg border border-zinc-100 p-4">
                  <p className="text-xs font-semibold uppercase text-zinc-500">Ultimo import</p>
                  <p className="mt-2 text-sm font-semibold text-zinc-950">{kpis.last_import}</p>
                </div>
                <div className="rounded-lg border border-zinc-100 p-4">
                  <p className="text-xs font-semibold uppercase text-zinc-500">Ultimo webhook</p>
                  <p className="mt-2 text-sm font-semibold text-zinc-950">{formatDate(overview?.source_health?.webhooks?.last_received_at)}</p>
                </div>
              </div>
            </Section>
          </div>
        )}

        {activeTab === 'conversas' && (
          <div className="space-y-4">
            <div className="flex max-w-xl items-center gap-2 rounded-lg border border-zinc-200 bg-white px-3 py-2 shadow-sm">
              <Search size={16} className="text-zinc-400" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Buscar por cliente, telefone ou conversa"
                className="w-full bg-transparent text-sm outline-none"
              />
            </div>
            <Section title="Conversas do periodo" subtitle="Dados unificados de CSV e webhooks">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[860px] text-left">
                  <thead>
                    <tr className="border-b border-zinc-100 text-xs font-semibold uppercase tracking-wide text-zinc-500">
                      <th className="px-3 py-3">Cliente</th>
                      <th className="px-3 py-3">Atendente</th>
                      <th className="px-3 py-3">Status</th>
                      <th className="px-3 py-3">Canal</th>
                      <th className="px-3 py-3">NPS</th>
                      <th className="px-3 py-3">Origem</th>
                      <th className="px-3 py-3">Criada em</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100">
                    {conversations.map((item) => (
                      <tr key={item.id} className="hover:bg-zinc-50">
                        <td className="px-3 py-3">
                          <p className="text-sm font-semibold text-zinc-900">{item.contact_name}</p>
                          <p className="text-xs text-zinc-500">{item.phone || '-'}</p>
                        </td>
                        <td className="px-3 py-3 text-sm text-zinc-700">{item.agent_name || '-'}</td>
                        <td className="px-3 py-3 text-sm">{item.status || '-'}</td>
                        <td className="px-3 py-3 text-sm">{item.channel || '-'}</td>
                        <td className="px-3 py-3 text-sm">{item.nps_score ?? '-'}</td>
                        <td className="px-3 py-3"><SourceBadge source={item.source} /></td>
                        <td className="px-3 py-3 text-sm text-zinc-500">{formatDate(item.created_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {!conversations.length && <p className="p-6 text-center text-sm text-zinc-500">Nenhuma conversa encontrada.</p>}
              </div>
            </Section>
          </div>
        )}

        {activeTab === 'fontes' && (
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            <Section title="Saude dos webhooks" subtitle="Eventos recebidos da Zenvia em tempo quase real">
              <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div className="rounded-lg border border-zinc-100 p-4">
                  <Webhook className="mb-3 text-sky-600" size={18} />
                  <p className="text-xs font-semibold uppercase text-zinc-500">Recebidos</p>
                  <p className="mt-1 text-2xl font-semibold text-zinc-950">{overview?.source_health?.webhooks?.total_events || 0}</p>
                </div>
                <div className="rounded-lg border border-zinc-100 p-4">
                  <Activity className="mb-3 text-orange-600" size={18} />
                  <p className="text-xs font-semibold uppercase text-zinc-500">Pendentes</p>
                  <p className="mt-1 text-2xl font-semibold text-zinc-950">{overview?.source_health?.webhooks?.pending_events || 0}</p>
                </div>
                <div className="rounded-lg border border-zinc-100 p-4">
                  <CheckCircle2 className="mb-3 text-emerald-600" size={18} />
                  <p className="text-xs font-semibold uppercase text-zinc-500">Ultimo tipo</p>
                  <p className="mt-1 truncate text-sm font-semibold text-zinc-950">{overview?.source_health?.webhooks?.last_event_type || '-'}</p>
                </div>
              </div>
              <div className="space-y-2">
                {webhookEvents.map((event) => (
                  <div key={event.id} className="flex items-center justify-between gap-3 rounded-lg border border-zinc-100 px-3 py-2">
                    <div>
                      <p className="text-sm font-semibold text-zinc-800">#{event.id} {event.payload_type}</p>
                      <p className="text-xs text-zinc-500">{event.received_at}</p>
                    </div>
                    <span className={cn('rounded-md px-2 py-1 text-xs font-semibold', event.status === 'Processado' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700')}>
                      {event.status}
                    </span>
                  </div>
                ))}
              </div>
            </Section>

            <Section title="Historico de imports" subtitle="Arquivos enviados pelo sistema online">
              <div className="space-y-3">
                {(overview?.imports || []).map((batch) => (
                  <div key={batch.id} className="rounded-lg border border-zinc-100 p-3">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-zinc-900">Lote #{batch.id}</p>
                        <p className="text-xs text-zinc-500">{formatDate(batch.finished_at || batch.started_at)}</p>
                      </div>
                      <span className={cn('rounded-md px-2 py-1 text-xs font-semibold', batch.status === 'success' ? 'bg-emerald-50 text-emerald-700' : batch.status === 'partial' ? 'bg-amber-50 text-amber-700' : 'bg-rose-50 text-rose-700')}>
                        {batch.status}
                      </span>
                    </div>
                    <div className="mt-3 grid grid-cols-3 gap-2 text-xs text-zinc-600">
                      <span>{batch.files_count} arquivos</span>
                      <span>{batch.rows_imported} itens</span>
                      <span>{batch.errors_count} erros</span>
                    </div>
                  </div>
                ))}
                {!overview?.imports?.length && <p className="text-sm text-zinc-500">Nenhum import registrado para o periodo.</p>}
              </div>
            </Section>
          </div>
        )}
      </div>

      {linkingContact && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/40 p-4">
          <div className="w-full max-w-md rounded-lg bg-white p-5 shadow-xl">
            <h3 className="text-base font-semibold text-zinc-950">Vincular contato a loja</h3>
            <p className="mt-1 text-sm text-zinc-500">{linkingContact.name} - {linkingContact.phone || 'sem telefone'}</p>
            <input
              value={storeName}
              onChange={(event) => setStoreName(event.target.value)}
              placeholder="Nome da loja"
              className="mt-4 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-orange-300"
            />
            <div className="mt-5 flex justify-end gap-2">
              <button onClick={() => setLinkingContact(null)} className="rounded-lg border border-zinc-200 px-4 py-2 text-sm font-semibold text-zinc-700">Cancelar</button>
              <button onClick={submitStoreLink} className="rounded-lg bg-[#ff7900] px-4 py-2 text-sm font-semibold text-white">Vincular</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SupportDashboard;
