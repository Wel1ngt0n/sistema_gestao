import { useEffect, useState } from 'react'
import { api } from '../../services/api'
import {
  Users, AlertTriangle, CheckCircle, Download, ArrowUpDown, LayoutDashboard, List
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import TeamDiagnosticsDashboardView from './TeamDiagnosticsDashboardView'

interface AnalystResume {
  implantador: string
  ativos: number
  entregues: number
  carga_ponderada: number
  matrizes_ativas: number
  filiais_ativas: number
  mrr_ativo: number
  entregas_mes: number
  pct_sla_concluidas: number
  pct_sla_ativas: number
  pct_retrabalho: number
  idle_medio: number
  idle_critico_count: number
}

export default function TeamDiagnosticsView() {
  const navigate = useNavigate()
  const [data, setData] = useState<AnalystResume[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [activeTab, setActiveTab] = useState<'TABLE' | 'DASHBOARD'>('TABLE')

  // Sorters
  const [sortField, setSortField] = useState<keyof AnalystResume>('carga_ponderada')
  const [sortAsc, setSortAsc] = useState(false)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      setLoading(true)
      const res = await api.get('/api/reports/implantadores/resumo')
      setData(res.data.team || [])
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleSort = (field: keyof AnalystResume) => {
    if (sortField === field) {
      setSortAsc(!sortAsc)
    } else {
      setSortField(field)
      setSortAsc(false) // Default descending for new field
    }
  }

  const sortedData = [...data].sort((a, b) => {
    const valA = a[sortField]
    const valB = b[sortField]
    if (valA < valB) return sortAsc ? -1 : 1
    if (valA > valB) return sortAsc ? 1 : -1
    return 0
  })

  // Format currency
  const formatMoney = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val)
  }

  const handleExportCSV = async () => {
    try {
      const res = await api.get('/api/reports/implantadores/export-csv', { responseType: 'blob' })
      const url = window.URL.createObjectURL(new Blob([res.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', 'diagnostico_time.csv')
      document.body.appendChild(link)
      link.click()
      link.remove()
    } catch (err) {
      alert('Erro ao exportar CSV')
    }
  }

  const handleExportPDF = async () => {
    try {
      const res = await api.get('/api/reports/implantadores/export-pdf', { responseType: 'blob' })
      const url = window.URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', 'diagnostico_time.pdf')
      document.body.appendChild(link)
      link.click()
      link.remove()
    } catch (err) {
      alert('Erro ao exportar PDF')
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-3">
            <Users className="text-orange-500" />
            Módulo de Diagnóstico: Equipe
          </h1>
          <p className="text-zinc-500 dark:text-zinc-400 mt-1">
            Visão comparativa de carga, entrega, e anomalias operacionais para tomada de decisão gerencial.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-sm font-medium hover:bg-zinc-50 dark:hover:bg-zinc-750 transition-colors"
          >
            <Download size={16} />
            CSV
          </button>
          <button
            onClick={handleExportPDF}
            className="flex items-center gap-2 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg text-sm font-medium transition-colors"
          >
            <Download size={16} />
            PDF Executivo
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 p-1 bg-zinc-100 dark:bg-zinc-800/50 rounded-xl w-fit">
        <button
          onClick={() => setActiveTab('TABLE')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === 'TABLE' ? 'bg-white dark:bg-zinc-700 shadow-sm text-zinc-900 dark:text-zinc-100' : 'text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-300'}`}
        >
          <List size={16} />
          Visão Comparativa do Time
        </button>
        <button
          onClick={() => setActiveTab('DASHBOARD')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === 'DASHBOARD' ? 'bg-white dark:bg-zinc-700 shadow-sm text-zinc-900 dark:text-zinc-100' : 'text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-300'}`}
        >
          <LayoutDashboard size={16} />
          Diagnóstico e Causa Raiz
        </button>
      </div>

      {activeTab === 'DASHBOARD' ? (
        <TeamDiagnosticsDashboardView />
      ) : loading ? (
        <div className="flex items-center justify-center p-12">
          <div className="w-8 h-8 rounded-full border-4 border-zinc-200 dark:border-zinc-800 border-t-orange-500 animate-spin"></div>
        </div>
      ) : error ? (
        <div className="p-4 bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 rounded-xl">
          {error}
        </div>
      ) : (
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-zinc-500 dark:text-zinc-400 uppercase bg-zinc-50 dark:bg-zinc-900/50 border-b border-zinc-200 dark:border-zinc-800">
                <tr>
                  <th className="px-6 py-4 cursor-pointer hover:bg-zinc-100 dark:hover:bg-zinc-800/50" onClick={() => handleSort('implantador')}>
                    <div className="flex items-center gap-2">Implantador <ArrowUpDown size={14} /></div>
                  </th>
                  <th className="px-6 py-4 cursor-pointer hover:bg-zinc-100 dark:hover:bg-zinc-800/50" onClick={() => handleSort('carga_ponderada')}>
                    <div className="flex items-center gap-2">Carga Ponderada <ArrowUpDown size={14} /></div>
                  </th>
                  <th className="px-6 py-4 cursor-pointer hover:bg-zinc-100 dark:hover:bg-zinc-800/50" title="Matrizes vs Filiais" onClick={() => handleSort('ativos')}>
                    <div className="flex items-center gap-2">Lojas Ativas <ArrowUpDown size={14} /></div>
                  </th>
                  <th className="px-6 py-4 cursor-pointer hover:bg-zinc-100 dark:hover:bg-zinc-800/50" onClick={() => handleSort('entregas_mes')}>
                    <div className="flex items-center gap-2">Entregas (Mês) <ArrowUpDown size={14} /></div>
                  </th>
                  <th className="px-6 py-4 cursor-pointer hover:bg-zinc-100 dark:hover:bg-zinc-800/50" onClick={() => handleSort('idle_medio')}>
                    <div className="flex items-center gap-2">Idle Médio <ArrowUpDown size={14} /></div>
                  </th>
                  <th className="px-6 py-4 cursor-pointer hover:bg-zinc-100 dark:hover:bg-zinc-800/50 text-center" onClick={() => handleSort('idle_critico_count')}>
                    <div className="flex items-center justify-center gap-2">Críticos (<span className="text-red-500">{'>'}7d</span>) <ArrowUpDown size={14} /></div>
                  </th>
                  <th className="px-6 py-4 cursor-pointer hover:bg-zinc-100 dark:hover:bg-zinc-800/50" onClick={() => handleSort('pct_sla_concluidas')}>
                    <div className="flex items-center gap-2">SLA Entregues <ArrowUpDown size={14} /></div>
                  </th>
                  <th className="px-6 py-4 cursor-pointer hover:bg-zinc-100 dark:hover:bg-zinc-800/50" onClick={() => handleSort('pct_sla_ativas')}>
                    <div className="flex items-center gap-2">Saúde Carteira <ArrowUpDown size={14} /></div>
                  </th>
                  <th className="px-6 py-4 cursor-pointer hover:bg-zinc-100 dark:hover:bg-zinc-800/50" onClick={() => handleSort('pct_retrabalho')}>
                    <div className="flex items-center gap-2">Retrabalho <ArrowUpDown size={14} /></div>
                  </th>
                  <th className="px-6 py-4 cursor-pointer hover:bg-zinc-100 dark:hover:bg-zinc-800/50" onClick={() => handleSort('mrr_ativo')}>
                    <div className="flex items-center gap-2">MRR Restante <ArrowUpDown size={14} /></div>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/50">
                {sortedData.map((item, idx) => (
                  <tr
                    key={idx}
                    className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors group cursor-pointer"
                    onClick={() => navigate(`/team-diagnostics/${encodeURIComponent(item.implantador)}`)}
                  >
                    <td className="px-6 py-4 font-semibold text-zinc-900 dark:text-zinc-100">
                      {item.implantador}
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-indigo-50 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-400">
                        {item.carga_ponderada.toFixed(1)} pts
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="font-medium">{item.ativos} Lojas</span>
                        <span className="text-xs text-zinc-500 dark:text-zinc-500">M: {item.matrizes_ativas} | F: {item.filiais_ativas}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <CheckCircle className="text-emerald-500 w-4 h-4" />
                        <span className="font-medium">{item.entregas_mes}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`font-medium ${item.idle_medio > 4 ? 'text-amber-500' : 'text-zinc-700 dark:text-zinc-300'}`}>
                        {item.idle_medio}d
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      {item.idle_critico_count > 0 ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400">
                          <AlertTriangle className="w-3 h-3" />
                          {item.idle_critico_count}
                        </span>
                      ) : (
                        <span className="text-zinc-400">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`font-medium ${item.pct_sla_concluidas < 70 ? 'text-red-500' : 'text-emerald-500'}`}>
                        {item.pct_sla_concluidas}%
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`font-medium ${item.pct_sla_ativas < 80 ? 'text-amber-500' : 'text-emerald-500'}`}>
                        {item.pct_sla_ativas}%
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`font-medium ${item.pct_retrabalho > 15 ? 'text-red-500' : 'text-zinc-700 dark:text-zinc-300'}`}>
                        {item.pct_retrabalho.toFixed(0)}%
                      </span>
                    </td>
                    <td className="px-6 py-4 text-zinc-500 font-medium">
                      {formatMoney(item.mrr_ativo)}
                    </td>
                  </tr>
                ))}
                {sortedData.length === 0 && (
                  <tr>
                    <td colSpan={9} className="px-6 py-8 text-center text-zinc-500">
                      Nenhum dado de diagnóstico disponível no momento.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
