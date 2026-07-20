import { useCallback, useEffect, useMemo, useRef, useState, type ElementType, type ReactNode } from 'react';
import {
  Activity,
  AlertCircle,
  BarChart3,
  CalendarRange,
  Clock3,
  Database,
  FileUp,
  Link2,
  MessageSquare,
  Pencil,
  Save,
  Search,
  ShieldCheck,
  Star,
  UploadCloud,
  Users,
  X,
} from 'lucide-react';
import { api } from '../services/api';

type TabKey = 'operacao' | 'equipe' | 'qualidade' | 'conversas' | 'fontes';
type GroupBy = 'day' | 'week' | 'month';
type ImportGranularity = 'daily' | 'weekly' | 'monthly' | 'custom';

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
  new_conversations: number;
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
  period: string;
  window_label?: string | null;
  granularity?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  status: string;
  files_count: number;
  rows_total: number;
  rows_imported: number;
  errors_count: number;
  started_at?: string | null;
  finished_at?: string | null;
  stats?: Array<{ file: string; type: string; stats: Record<string, unknown> }>;
}

interface OverviewTimelineRow {
  label: string;
  bucket_date: string;
  new_conversations: number;
  new_contacts: number;
  closed_conversations: number;
  interactions: number;
  avg_nps: number | null;
}

interface OverviewData {
  period: string;
  start_date: string;
  end_date: string;
  group_by: GroupBy;
  window_label: string;
  kpis: SupportKpis;
  agents: AgentPerf[];
  messages: MessageItem[];
  nps_feedbacks: NpsFeedback[];
  hourly_response: Array<{ hour: string; day: string; seconds: number; window_label?: string }>;
  close_reasons: Array<{ reason: string; conversations?: number; contacts?: number; close_time_seconds?: number }>;
  daily_series: Record<string, Array<{ label: string; value: number }>>;
  timeline: OverviewTimelineRow[];
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

interface WindowItem {
  id: number;
  period: string;
  granularity: string;
  window_label: string;
  start_date?: string | null;
  end_date?: string | null;
  status: string;
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

const todayIso = () => new Date().toISOString().slice(0, 10);

const firstDayOfMonthIso = () => {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
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

const GranularityPill = ({ value }: { value?: string | null }) => {
  const tone = value === 'weekly'
    ? 'bg-sky-50 text-sky-700'
    : value === 'daily'
      ? 'bg-emerald-50 text-emerald-700'
      : value === 'monthly'
        ? 'bg-orange-50 text-orange-700'
        : 'bg-zinc-100 text-zinc-600';

  return <span className={cn('rounded-md px-2 py-1 text-[11px] font-semibold uppercase', tone)}>{value || 'custom'}</span>;
};

export const SupportDashboard = () => {
  const [selectedStartDate, setSelectedStartDate] = useState(firstDayOfMonthIso());
  const [selectedEndDate, setSelectedEndDate] = useState(todayIso());
  const [groupBy, setGroupBy] = useState<GroupBy>('day');

  const [importStartDate, setImportStartDate] = useState(firstDayOfMonthIso());
  const [importEndDate, setImportEndDate] = useState(todayIso());
  const [importGranularity, setImportGranularity] = useState<ImportGranularity>('weekly');

  const [windows, setWindows] = useState<WindowItem[]>([]);
  const [overview, setOverview] = useState<OverviewData | null>(null);
  const [orphans, setOrphans] = useState<OrphanContact[]>([]);
  const [conversations, setConversations] = useState<ConversationItem[]>([]);
  const [activeTab, setActiveTab] = useState<TabKey>('operacao');
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [search, setSearch] = useState('');
  const [linkingContact, setLinkingContact] = useState<OrphanContact | null>(null);
  const [storeName, setStoreName] = useState('');
  const [editingNpsId, setEditingNpsId] = useState<number | null>(null);
  const [npsAgentDrafts, setNpsAgentDrafts] = useState<Record<number, string>>({});
  const [savingNpsId, setSavingNpsId] = useState<number | null>(null);
  const queryRef = useRef({ selectedStartDate, selectedEndDate, groupBy, search });

  useEffect(() => {
    queryRef.current = { selectedStartDate, selectedEndDate, groupBy, search };
  }, [groupBy, search, selectedEndDate, selectedStartDate]);

  const kpis = overview?.kpis || emptyKpis;
  const maxCloseReason = useMemo(() => {
    return Math.max(...(overview?.close_reasons || []).map((item) => item.conversations || 0), 1);
  }, [overview]);

  const maxTimeline = useMemo(() => {
    return Math.max(...(overview?.timeline || []).map((item) => item.new_conversations), 1);
  }, [overview]);

  const availableAgents = useMemo(() => {
    const set = new Set<string>();
    (overview?.agents || []).forEach((agent) => {
      if (agent.agent_name?.trim()) set.add(agent.agent_name.trim());
    });
    (overview?.nps_feedbacks || []).forEach((feedback) => {
      if (feedback.agent_name?.trim()) set.add(feedback.agent_name.trim());
    });
    return Array.from(set).sort((left, right) => left.localeCompare(right, 'pt-BR'));
  }, [overview]);

  const fetchWindows = useCallback(async () => {
    const response = await api.get('/api/support/windows').catch(() => ({ data: [] }));
    setWindows(Array.isArray(response.data) ? response.data : []);
  }, []);

  const fetchData = useCallback(async () => {
    const {
      selectedStartDate: currentStartDate,
      selectedEndDate: currentEndDate,
      groupBy: currentGroupBy,
      search: currentSearch,
    } = queryRef.current;
    setLoading(true);
    try {
      const query = `start_date=${currentStartDate}&end_date=${currentEndDate}&group_by=${currentGroupBy}`;
      const [overviewRes, orphanRes, convRes] = await Promise.all([
        api.get(`/api/support/overview?${query}`),
        api.get('/api/support/orphans').catch(() => ({ data: [] })),
        api.get(`/api/support/conversations?start_date=${currentStartDate}&end_date=${currentEndDate}&q=${encodeURIComponent(currentSearch)}&page_size=30`).catch(() => ({ data: { items: [] } })),
      ]);
      setOverview(overviewRes.data);
      setOrphans(Array.isArray(orphanRes.data) ? orphanRes.data : []);
      setConversations(Array.isArray(convRes.data?.items) ? convRes.data.items : []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchWindows();
  }, [fetchWindows]);

  useEffect(() => {
    fetchData();
    const interval = window.setInterval(fetchData, 600000);
    return () => window.clearInterval(interval);
  }, [fetchData, groupBy, selectedEndDate, selectedStartDate]);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      if (activeTab === 'conversas') fetchData();
    }, 350);
    return () => window.clearTimeout(timeout);
  }, [activeTab, fetchData, search]);

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
      formData.append('start_date', importStartDate);
      formData.append('end_date', importEndDate);
      formData.append('granularity', importGranularity);
      selectedFiles.forEach((file) => formData.append('files', file));
      await api.post('/api/support/import-csv', formData);
      setSelectedFiles([]);
      await fetchWindows();
      setSelectedStartDate(importStartDate);
      setSelectedEndDate(importEndDate);
      setGroupBy(importGranularity === 'monthly' ? 'month' : importGranularity === 'weekly' ? 'week' : 'day');
      await fetchData();
    } finally {
      setImporting(false);
    }
  };

  const submitStoreLink = async () => {
    if (!linkingContact || !storeName.trim()) return;
    await api.post('/api/support/link-store', { contact_id: linkingContact.id, store_name: storeName.trim() });
    setLinkingContact(null);
    setStoreName('');
    await fetchData();
  };

  const startEditingNpsAgent = (feedback: NpsFeedback) => {
    setEditingNpsId(feedback.id);
    setNpsAgentDrafts((prev) => ({
      ...prev,
      [feedback.id]: feedback.agent_name || '',
    }));
  };

  const saveNpsAgent = async (feedbackId: number) => {
    setSavingNpsId(feedbackId);
    try {
      await api.patch(`/api/support/conversations/${feedbackId}/agent`, {
        agent_name: (npsAgentDrafts[feedbackId] || '').trim(),
      });
      setEditingNpsId(null);
      await fetchData();
    } finally {
      setSavingNpsId(null);
    }
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
        <header className="flex flex-col gap-5 rounded-lg border border-zinc-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-orange-600">
                <ShieldCheck size={14} />
                Suporte por planilhas
              </div>
              <h1 className="text-2xl font-semibold tracking-tight text-zinc-950">Central operacional de suporte</h1>
              <p className="mt-1 max-w-4xl text-sm text-zinc-500">
                Importe cada lote com a janela correta e acompanhe os resultados por dia, semana ou mes. Ideal para fechamentos semanais e apresentacoes mensais do time.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-4">
              <div className="flex items-center gap-2 rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2">
                <CalendarRange size={16} className="text-zinc-500" />
                <input type="date" value={selectedStartDate} onChange={(event) => setSelectedStartDate(event.target.value)} className="bg-transparent text-sm font-semibold text-zinc-800 outline-none" />
              </div>
              <div className="flex items-center gap-2 rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2">
                <CalendarRange size={16} className="text-zinc-500" />
                <input type="date" value={selectedEndDate} onChange={(event) => setSelectedEndDate(event.target.value)} className="bg-transparent text-sm font-semibold text-zinc-800 outline-none" />
              </div>
              <div className="flex items-center gap-1 rounded-lg border border-zinc-200 bg-white p-1">
                {[
                  { key: 'day' as const, label: 'Dia' },
                  { key: 'week' as const, label: 'Semana' },
                  { key: 'month' as const, label: 'Mes' },
                ].map((item) => (
                  <button
                    key={item.key}
                    onClick={() => setGroupBy(item.key)}
                    className={cn(
                      'rounded-md px-3 py-1.5 text-xs font-semibold transition',
                      groupBy === item.key ? 'bg-orange-50 text-orange-700' : 'text-zinc-500 hover:bg-zinc-50 hover:text-zinc-900'
                    )}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
              <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-emerald-700">Janela ativa</p>
                <p className="mt-1 text-sm font-semibold text-emerald-900">{overview?.window_label || `${selectedStartDate} a ${selectedEndDate}`}</p>
              </div>
            </div>
          </div>

          {windows.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {windows.slice(0, 8).map((window) => (
                <button
                  key={window.id}
                  onClick={() => {
                    if (window.start_date) setSelectedStartDate(window.start_date);
                    if (window.end_date) setSelectedEndDate(window.end_date);
                    setGroupBy(window.granularity === 'monthly' ? 'month' : window.granularity === 'weekly' ? 'week' : 'day');
                  }}
                  className="inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1.5 text-xs font-semibold text-zinc-700 transition hover:border-orange-300 hover:bg-orange-50 hover:text-orange-700"
                >
                  <GranularityPill value={window.granularity} />
                  {window.window_label}
                </button>
              ))}
            </div>
          )}
        </header>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          <MetricCard label="Chamados no periodo" value={kpis.open_conversations + kpis.closed_conversations} helper={`${kpis.closed_conversations} encerrados dentro da janela`} icon={MessageSquare} color="green" />
          <MetricCard label="Mensagens recebidas" value={kpis.messages_in} helper={`${kpis.messages_out} respostas enviadas`} icon={BarChart3} color="orange" />
          <MetricCard label="Tempo medio resposta" value={kpis.avg_response_time} helper="Leitura agregada da performance importada" icon={Clock3} color="blue" />
          <MetricCard label="Pendencias da equipe" value={kpis.pending_tickets + kpis.open_tickets} helper={`${kpis.pending_tickets} pendentes, ${kpis.open_tickets} abertas`} icon={AlertCircle} color={kpis.pending_tickets > 0 ? 'red' : 'slate'} />
        </div>

        <section className="rounded-lg border border-zinc-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-sm font-semibold text-zinc-950">Importar dados historicos da Zenvia</h2>
              <p className="mt-1 text-sm text-zinc-500">Informe a janela real do lote para manter seus fechamentos diários, semanais e mensais consistentes.</p>
            </div>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-5">
              <input type="date" value={importStartDate} onChange={(event) => setImportStartDate(event.target.value)} className="rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm font-semibold text-zinc-800 outline-none focus:border-orange-300" />
              <input type="date" value={importEndDate} onChange={(event) => setImportEndDate(event.target.value)} className="rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm font-semibold text-zinc-800 outline-none focus:border-orange-300" />
              <select value={importGranularity} onChange={(event) => setImportGranularity(event.target.value as ImportGranularity)} className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm font-semibold text-zinc-800 outline-none focus:border-orange-300">
                <option value="daily">Diario</option>
                <option value="weekly">Semanal</option>
                <option value="monthly">Mensal</option>
                <option value="custom">Personalizado</option>
              </select>
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
            <Section title="Serie do periodo" subtitle="Separacao por dia, semana ou mes conforme o agrupamento ativo">
              <div className="space-y-3">
                {(overview?.timeline || []).map((item) => (
                  <div key={item.bucket_date} className="rounded-lg border border-zinc-100 p-3">
                    <div className="mb-2 flex items-center justify-between gap-3 text-sm">
                      <span className="font-semibold text-zinc-800">{item.label}</span>
                      <span className="text-xs font-semibold text-zinc-500">{item.interactions} interacoes</span>
                    </div>
                    <div className="h-2 rounded-full bg-zinc-100">
                      <div className="h-2 rounded-full bg-orange-500" style={{ width: `${Math.max((item.new_conversations / maxTimeline) * 100, 4)}%` }} />
                    </div>
                    <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-zinc-600">
                      <span>{item.new_conversations} chamados</span>
                      <span>{item.new_contacts} novos contatos</span>
                      <span>{item.closed_conversations} encerrados</span>
                      <span>NPS {item.avg_nps === null ? '-' : item.avg_nps.toFixed(1)}</span>
                    </div>
                  </div>
                ))}
                {!overview?.timeline?.length && <p className="text-sm text-zinc-500">Importe planilhas com datas para visualizar a serie do periodo.</p>}
              </div>
            </Section>

            <Section title="Motivos de chamado" subtitle="Ranking agregado das janelas importadas">
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
          <Section title="Performance da equipe" subtitle="Totais do intervalo e notas por pessoa">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1080px] text-left">
                <thead>
                  <tr className="border-b border-zinc-100 text-xs font-semibold uppercase tracking-wide text-zinc-500">
                    <th className="px-3 py-3">Atendente</th>
                    <th className="px-3 py-3 text-right">Contatos</th>
                    <th className="px-3 py-3 text-right">Chamados</th>
                    <th className="px-3 py-3 text-right">Novos</th>
                    <th className="px-3 py-3 text-right">Fechados</th>
                    <th className="px-3 py-3 text-right">Mensagens</th>
                    <th className="px-3 py-3 text-right">1a resposta</th>
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
                      <td className="px-3 py-3 text-right text-sm">{agent.new_conversations}</td>
                      <td className="px-3 py-3 text-right text-sm">{agent.closed_conversations}</td>
                      <td className="px-3 py-3 text-right text-sm font-medium text-sky-700">{agent.total_messages_sent}</td>
                      <td className="px-3 py-3 text-right text-sm">{formatTime(agent.avg_response_time_seconds)}</td>
                      <td className="px-3 py-3 text-right text-sm">{formatTime(agent.avg_close_time_seconds)}</td>
                      <td className="px-3 py-3 text-right text-sm font-semibold">{agent.avg_nps === null ? '-' : `${agent.avg_nps.toFixed(1)} (${agent.nps_count})`}</td>
                      <td className="px-3 py-3 text-right text-sm">{agent.pending_tickets + agent.open_tickets}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Section>
        )}

        {activeTab === 'qualidade' && (
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            <Section title="NPS recente" subtitle="Feedbacks vinculados as conversas do intervalo">
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
                      <div className="mt-1 flex flex-wrap items-center gap-2">
                        {editingNpsId === feedback.id ? (
                          <>
                            <select
                              value={npsAgentDrafts[feedback.id] ?? feedback.agent_name ?? ''}
                              onChange={(event) => setNpsAgentDrafts((prev) => ({ ...prev, [feedback.id]: event.target.value }))}
                              className="rounded-md border border-zinc-200 bg-white px-2 py-1 text-xs font-semibold text-zinc-800 outline-none focus:border-orange-300"
                            >
                              <option value="">Sem atendente</option>
                              {availableAgents.map((agentName) => (
                                <option key={agentName} value={agentName}>{agentName}</option>
                              ))}
                            </select>
                            <button
                              onClick={() => saveNpsAgent(feedback.id)}
                              disabled={savingNpsId === feedback.id}
                              className="inline-flex items-center gap-1 rounded-md bg-[#ff7900] px-2 py-1 text-xs font-semibold text-white transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:bg-zinc-300"
                            >
                              <Save size={12} />
                              {savingNpsId === feedback.id ? 'Salvando' : 'Salvar'}
                            </button>
                            <button
                              onClick={() => setEditingNpsId(null)}
                              className="rounded-md border border-zinc-200 px-2 py-1 text-xs font-semibold text-zinc-600 transition hover:bg-zinc-50"
                            >
                              Cancelar
                            </button>
                          </>
                        ) : (
                          <>
                            <p className="text-xs text-zinc-500">{feedback.agent_name || 'Sem atendente'} - {formatDate(feedback.date)}</p>
                            <button
                              onClick={() => startEditingNpsAgent(feedback)}
                              className="inline-flex items-center gap-1 rounded-md border border-orange-200 px-2 py-1 text-[11px] font-semibold text-orange-600 transition hover:bg-orange-50"
                            >
                              <Pencil size={12} />
                              Editar atendente
                            </button>
                          </>
                        )}
                      </div>
                      {feedback.nps_comment && <p className="mt-2 line-clamp-2 text-sm text-zinc-600">{feedback.nps_comment}</p>}
                    </div>
                  </div>
                ))}
                {!overview?.nps_feedbacks?.length && <p className="text-sm text-zinc-500">Sem NPS para a janela selecionada.</p>}
              </div>
            </Section>

            <Section title="Piores janelas de resposta" subtitle="Recorte por dia e hora dos arquivos importados">
              <div className="space-y-2">
                {(overview?.hourly_response || [])
                  .filter((item) => item.seconds > 0)
                  .sort((a, b) => b.seconds - a.seconds)
                  .slice(0, 10)
                  .map((item) => (
                    <div key={`${item.window_label || 'janela'}-${item.day}-${item.hour}`} className="flex items-center justify-between rounded-lg border border-zinc-100 px-3 py-2">
                      <div>
                        <p className="text-sm font-medium text-zinc-700">{item.day} as {item.hour}</p>
                        {item.window_label && <p className="text-xs text-zinc-500">{item.window_label}</p>}
                      </div>
                      <span className="text-sm font-semibold text-zinc-950">{formatTime(item.seconds)}</span>
                    </div>
                  ))}
                {!overview?.hourly_response?.length && <p className="text-sm text-zinc-500">Importe o CSV de tempo de resposta por hora.</p>}
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
            <Section title="Conversas do intervalo" subtitle="Dados detalhados das mensagens importadas">
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
            <Section title="Janelas importadas" subtitle="Lotes recentes para reaplicar rapidamente seus fechamentos">
              <div className="space-y-3">
                {windows.map((window) => (
                  <button
                    key={window.id}
                    onClick={() => {
                      if (window.start_date) setSelectedStartDate(window.start_date);
                      if (window.end_date) setSelectedEndDate(window.end_date);
                      setGroupBy(window.granularity === 'monthly' ? 'month' : window.granularity === 'weekly' ? 'week' : 'day');
                    }}
                    className="flex w-full items-center justify-between gap-3 rounded-lg border border-zinc-100 p-3 text-left transition hover:border-orange-200 hover:bg-orange-50/40"
                  >
                    <div>
                      <p className="text-sm font-semibold text-zinc-900">{window.window_label}</p>
                      <p className="text-xs text-zinc-500">{window.start_date || '-'} ate {window.end_date || '-'}</p>
                    </div>
                    <GranularityPill value={window.granularity} />
                  </button>
                ))}
                {!windows.length && <p className="text-sm text-zinc-500">Nenhum lote importado ainda.</p>}
              </div>
            </Section>

            <Section title="Historico de imports" subtitle="Arquivos enviados e consolidacao por lote">
              <div className="space-y-3">
                {(overview?.imports || []).map((batch) => (
                  <div key={batch.id} className="rounded-lg border border-zinc-100 p-3">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-zinc-900">{batch.window_label || `Lote #${batch.id}`}</p>
                        <p className="text-xs text-zinc-500">{formatDate(batch.finished_at || batch.started_at)}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <GranularityPill value={batch.granularity} />
                        <span className={cn('rounded-md px-2 py-1 text-xs font-semibold', batch.status === 'success' ? 'bg-emerald-50 text-emerald-700' : batch.status === 'partial' ? 'bg-amber-50 text-amber-700' : 'bg-rose-50 text-rose-700')}>
                          {batch.status}
                        </span>
                      </div>
                    </div>
                    <div className="mt-3 grid grid-cols-3 gap-2 text-xs text-zinc-600">
                      <span>{batch.files_count} arquivos</span>
                      <span>{batch.rows_imported} itens</span>
                      <span>{batch.errors_count} erros</span>
                    </div>
                  </div>
                ))}
                {!overview?.imports?.length && <p className="text-sm text-zinc-500">Nenhum import registrado para esta janela.</p>}
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
