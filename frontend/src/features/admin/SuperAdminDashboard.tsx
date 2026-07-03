import { useState, useEffect } from 'react'
import { api } from '../../services/api'
import {
    Trophy,
    Target,
    AlertTriangle,
    Edit2,
    CheckCircle,
    UserCheck,
    Briefcase
} from 'lucide-react'

interface CollaboratorPerf {
    user_id: number | null
    username: string
    role: string
    scores: {
        collective: number
        individual: number
        behavioral: number
        final: number
    }
    metrics: {
        volume_points: number
        completed_count: number
        sla_pct: number
        quality_pct: number
        churns: number
    }
    details: {
        soft_details: {
            comm: number
            proc: number
            resp: number
        }
    }
}

interface PerformanceSummary {
    cycle: string
    collective_kpis: {
        volume_points: number
        quality_global: number
        doc_global: number
    }
    collaborators: CollaboratorPerf[]
}

export default function SuperAdminDashboard() {
    const [activeTab, setActiveTab] = useState<'integration' | 'implantation'>('implantation')
    const [data, setData] = useState<PerformanceSummary | null>(null)
    const [loading, setLoading] = useState(true)
    const [selectedCycle, setSelectedCycle] = useState(new Date().toISOString().slice(0, 7)) // YYYY-MM

    // Modal Review
    const [reviewModalOpen, setReviewModalOpen] = useState(false)
    const [selectedUser, setSelectedUser] = useState<CollaboratorPerf | null>(null)
    const [reviewForm, setReviewForm] = useState({
        comm: 0,
        proc: 0,
        resp: 0,
        churns: 0
    })

    useEffect(() => {
        fetchImplantation()
    }, [selectedCycle])

    const [implData, setImplData] = useState<PerformanceSummary | null>(null)
    const [implRules, setImplRules] = useState<any>(null)
    const [configModalOpen, setConfigModalOpen] = useState(false)

    const fetchImplantation = async () => {
        try {
            setLoading(true)
            const response = await api.get(`/api/performance/implantation/summary?cycle=${selectedCycle}`)
            setImplData(response.data)
            setImplRules(response.data.rules)
        } catch (error) {
            console.error(error)
        } finally {
            setLoading(false)
        }
    }

    const saveImplantationRules = async () => {
        try {
            await api.post('/api/performance/implantation/rules', {
                cycle: selectedCycle,
                rules: implRules
            })
            setConfigModalOpen(false)
            fetchImplantation()
        } catch (error) {
            alert('Erro ao salvar regras')
        }
    }

    const fetchPerformance = async () => {
        try {
            setLoading(true)
            const response = await api.get(`/api/performance/summary?cycle=${selectedCycle}`)
            setData(response.data)
        } catch (error) {
            console.error(error)
        } finally {
            setLoading(false)
        }
    }

    const openReview = (user: CollaboratorPerf) => {
        setSelectedUser(user)
        setReviewForm({
            comm: user.details.soft_details.comm,
            proc: user.details.soft_details.proc,
            resp: user.details.soft_details.resp,
            churns: user.metrics.churns
        })
        setReviewModalOpen(true)
    }

    const saveReview = async () => {
        if (!selectedUser) return
        try {
            await api.post('/api/performance/review', {
                user_id: selectedUser.user_id, // If null (dummy), backend might complain. Logic handles real users mostly.
                cycle: selectedCycle,
                soft_communication: reviewForm.comm,
                soft_process: reviewForm.proc,
                soft_responsibility: reviewForm.resp,
                churn_count: reviewForm.churns
            })
            setReviewModalOpen(false)
            fetchPerformance()
        } catch (error) {
            alert('Erro ao salvar avaliação. Certifique-se que o usuário existe no banco.')
        }
    }

    return (
        <div className="max-w-7xl mx-auto space-y-8">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-zinc-900 flex items-center gap-2">
                        <Trophy className="w-6 h-6 text-yellow-500" />
                        Gestão de Performance e Bônus
                    </h1>
                    <p className="text-zinc-500 mt-1">
                        Acompanhamento de Metas (Coletiva/Individual/Comportamental)
                    </p>
                </div>
                <div className="flex items-center gap-4">
                    <input
                        type="month"
                        value={selectedCycle}
                        onChange={e => setSelectedCycle(e.target.value)}
                        className="bg-zinc-50 border border-zinc-200 rounded-lg px-3 py-2 text-sm"
                    />
                </div>
            </div>

            {/* Tabs removidas para focar em Implantação */}
            {(activeTab === 'implantation' || activeTab === 'integration') && (
                <div className="space-y-6">
                    <div className="flex justify-end">
                        <button onClick={() => setConfigModalOpen(true)} className="px-4 py-2 bg-zinc-800 text-white rounded-lg text-sm font-bold flex items-center gap-2 hover:bg-zinc-700">
                            ⚙️ Configurar Metas do Semestre
                        </button>
                    </div>
                    {implData && (
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl p-6 text-white shadow-lg relative overflow-hidden">
                                <h3 className="text-blue-100 font-bold uppercase text-xs mb-1">Coletivo: Volume (Pts)</h3>
                                <div className="text-3xl font-bold">{implData.collective_kpis.volume_points.toFixed(1)} <span className="text-base font-normal opacity-70">/ {implRules?.collective?.volume_target || 90}</span></div>
                            </div>
                            <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-2xl p-6 text-white shadow-lg relative overflow-hidden">
                                <h3 className="text-emerald-100 font-bold uppercase text-xs mb-1">Coletivo: Prazo (SLA)</h3>
                                <div className="text-3xl font-bold">{implData.collaborators.length > 0 ? (implData.collaborators.reduce((acc, u) => acc + u.metrics.sla_pct, 0) / implData.collaborators.length).toFixed(1) : 100}% <span className="text-base font-normal opacity-70">/ {implRules?.collective?.otd_target || 80}%</span></div>
                            </div>
                            <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl p-6 text-white shadow-lg relative overflow-hidden">
                                <h3 className="text-purple-100 font-bold uppercase text-xs mb-1">Coletivo: Qualidade</h3>
                                <div className="text-3xl font-bold">{implData.collective_kpis.quality_global.toFixed(1)}% <span className="text-base font-normal opacity-70">/ {implRules?.collective?.quality_target || 80}%</span></div>
                            </div>
                            <div className="bg-gradient-to-br from-amber-500 to-amber-600 rounded-2xl p-6 text-white shadow-lg relative overflow-hidden">
                                <h3 className="text-amber-100 font-bold uppercase text-xs mb-1">Coletivo: Churns</h3>
                                <div className="text-3xl font-bold">{implData.collaborators.reduce((acc, u) => acc + u.metrics.churns, 0)} <span className="text-base font-normal opacity-70">/ {implRules?.collective?.churn_max || 1}</span></div>
                            </div>
                        </div>
                    )}

                    <div className="bg-white border border-zinc-200 rounded-3xl overflow-hidden shadow-sm">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-zinc-50/50 text-zinc-500 uppercase font-semibold text-xs border-b border-zinc-200">
                                <tr>
                                    <th className="px-6 py-4">Colaborador</th>
                                    <th className="px-6 py-4 text-center">Coletivo (40%)</th>
                                    <th className="px-6 py-4 text-center">Individual (40%)</th>
                                    <th className="px-6 py-4 text-center">Comport. (20%)</th>
                                    <th className="px-6 py-4 text-center">Score Final</th>
                                    <th className="px-6 py-4 text-center">Penalidades</th>
                                    <th className="px-6 py-4 text-center">Ações</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-zinc-100">
                                {loading && (
                                    <tr><td colSpan={7} className="p-8 text-center text-zinc-500">Calculando Scores...</td></tr>
                                )}
                                {implData?.collaborators.map(user => (
                                    <tr key={user.username} className="hover:bg-zinc-50/50/30">
                                        <td className="px-6 py-4 font-bold text-zinc-900">
                                            {user.username}
                                            <div className="text-xs text-zinc-500 font-normal">{user.role}</div>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded-lg font-bold">{user.scores.collective}%</span>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <div className="flex flex-col items-center">
                                                <span className="bg-emerald-100 text-emerald-700 px-2 py-1 rounded-lg font-bold">{user.scores.individual}%</span>
                                                <span className="text-[10px] text-zinc-500 mt-1">Vol: {user.metrics.volume_points} / {implRules?.individual?.volume_target || 30} pts</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <span className={`px-2 py-1 rounded-lg font-bold ${user.metrics.churns > 0 ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-700'}`}>
                                                {user.scores.behavioral}%
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <span className="text-lg font-bold text-zinc-900">{user.scores.final}%</span>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            {user.metrics.churns > 0 ? (
                                                <span className="text-xs bg-rose-100 text-rose-700 px-2 py-1 rounded font-bold">
                                                    {user.metrics.churns} Churns (-{user.metrics.churns * 50}%)
                                                </span>
                                            ) : '-'}
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <button 
                                                onClick={() => openReview(user)}
                                                className="p-2 bg-zinc-100 hover:bg-zinc-200 rounded-lg transition-colors"
                                                title="Avaliar Comportamento"
                                            >
                                                <Edit2 size={16} className="text-zinc-600" />
                                            </button>
                                        </td>
            <div className="space-y-6">
                <div className="flex justify-end">
                    <button onClick={() => setConfigModalOpen(true)} className="px-4 py-2 bg-zinc-800 text-white rounded-lg text-sm font-bold flex items-center gap-2 hover:bg-zinc-700">
                        ⚙️ Configurar Metas do Semestre
                    </button>
                </div>
                {implData && (
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl p-6 text-white shadow-lg relative overflow-hidden">
                            <h3 className="text-blue-100 font-bold uppercase text-xs mb-1">Coletivo: Volume (Pts)</h3>
                            <div className="text-3xl font-bold">{implData.collective_kpis.volume_points.toFixed(1)} <span className="text-base font-normal opacity-70">/ {implRules?.collective?.volume_target || 90}</span></div>
                        </div>
                        <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-2xl p-6 text-white shadow-lg relative overflow-hidden">
                            <h3 className="text-emerald-100 font-bold uppercase text-xs mb-1">Coletivo: Prazo (SLA)</h3>
                            <div className="text-3xl font-bold">{implData.collaborators.length > 0 ? (implData.collaborators.reduce((acc, u) => acc + u.metrics.sla_pct, 0) / implData.collaborators.length).toFixed(1) : 100}% <span className="text-base font-normal opacity-70">/ {implRules?.collective?.otd_target || 80}%</span></div>
                        </div>
                        <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl p-6 text-white shadow-lg relative overflow-hidden">
                            <h3 className="text-purple-100 font-bold uppercase text-xs mb-1">Coletivo: Qualidade</h3>
                            <div className="text-3xl font-bold">{implData.collective_kpis.quality_global.toFixed(1)}% <span className="text-base font-normal opacity-70">/ {implRules?.collective?.quality_target || 80}%</span></div>
                        </div>
                        <div className="bg-gradient-to-br from-amber-500 to-amber-600 rounded-2xl p-6 text-white shadow-lg relative overflow-hidden">
                            <h3 className="text-amber-100 font-bold uppercase text-xs mb-1">Coletivo: Churns</h3>
                            <div className="text-3xl font-bold">{implData.collaborators.reduce((acc, u) => acc + u.metrics.churns, 0)} <span className="text-base font-normal opacity-70">/ {implRules?.collective?.churn_max || 1}</span></div>
                        </div>
                    </div>
                )}

                <div className="bg-white border border-zinc-200 rounded-3xl overflow-hidden shadow-sm">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-zinc-50/50 text-zinc-500 uppercase font-semibold text-xs border-b border-zinc-200">
                            <tr>
                                <th className="px-6 py-4">Colaborador</th>
                                <th className="px-6 py-4 text-center">Coletivo (40%)</th>
                                <th className="px-6 py-4 text-center">Individual (40%)</th>
                                <th className="px-6 py-4 text-center">Comport. (20%)</th>
                                <th className="px-6 py-4 text-center">Score Final</th>
                                <th className="px-6 py-4 text-center">Penalidades</th>
                                <th className="px-6 py-4 text-center">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-100">
                            {loading && (
                                <tr><td colSpan={7} className="p-8 text-center text-zinc-500">Calculando Scores...</td></tr>
                            )}
                            {implData?.collaborators.map(user => (
                                <tr key={user.username} className="hover:bg-zinc-50/50/30">
                                    <td className="px-6 py-4 font-bold text-zinc-900">
                                        {user.username}
                                        <div className="text-xs text-zinc-500 font-normal">{user.role}</div>
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded-lg font-bold">{user.scores.collective}%</span>
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <div className="flex flex-col items-center">
                                            <span className="bg-emerald-100 text-emerald-700 px-2 py-1 rounded-lg font-bold">{user.scores.individual}%</span>
                                            <span className="text-[10px] text-zinc-500 mt-1">Vol: {user.metrics.volume_points} / {implRules?.individual?.volume_target || 30} pts</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <span className={`px-2 py-1 rounded-lg font-bold ${user.metrics.churns > 0 ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-700'}`}>
                                            {user.scores.behavioral}%
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <span className="text-lg font-bold text-zinc-900">{user.scores.final}%</span>
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        {user.metrics.churns > 0 ? (
                                            <span className="text-xs bg-rose-100 text-rose-700 px-2 py-1 rounded font-bold">
                                                {user.metrics.churns} Churns (-{user.metrics.churns * 50}%)
                                            </span>
                                        ) : '-'}
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <button 
                                            onClick={() => openReview(user)}
                                            className="p-2 bg-zinc-100 hover:bg-zinc-200 rounded-lg transition-colors"
                                            title="Avaliar Comportamento"
                                        >
                                            <Edit2 size={16} className="text-zinc-600" />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Modal Review */}
            {reviewModalOpen && selectedUser && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl border border-zinc-200">
                        <h2 className="text-lg font-bold mb-1">Avaliação Comportamental</h2>
                        <p className="text-sm text-zinc-500 mb-6">Colaborador: {selectedUser.username}</p>

                        <div className="space-y-4">
                            <div>
                                <label className="text-xs uppercase font-bold text-zinc-500 flex justify-between">
                                    {activeTab === 'implantation' ? 'Organização e Registro' : 'Comunicação'} (0-100) <span className="text-zinc-900">{reviewForm.comm}</span>
                                </label>
                                <input type="range" min="0" max="100" className="w-full mt-2 accent-amber-600"
                                    value={reviewForm.comm} onChange={e => setReviewForm({ ...reviewForm, comm: Number(e.target.value) })}
                                />
                            </div>
                            <div>
                                <label className="text-xs uppercase font-bold text-zinc-500 flex justify-between">
                                    {activeTab === 'implantation' ? 'Aderência aos Processos' : 'Processos'} (0-100) <span className="text-zinc-900">{reviewForm.proc}</span>
                                </label>
                                <input type="range" min="0" max="100" className="w-full mt-2 accent-amber-600"
                                    value={reviewForm.proc} onChange={e => setReviewForm({ ...reviewForm, proc: Number(e.target.value) })}
                                />
                            </div>
                            <div>
                                <label className="text-xs uppercase font-bold text-zinc-500 flex justify-between">
                                    {activeTab === 'implantation' ? 'Conduta Profissional' : 'Responsabilidade'} (0-100) <span className="text-zinc-900">{reviewForm.resp}</span>
                                </label>
                                <input type="range" min="0" max="100" className="w-full mt-2 accent-amber-600"
                                    value={reviewForm.resp} onChange={e => setReviewForm({ ...reviewForm, resp: Number(e.target.value) })}
                                />
                            </div>

                            <hr className="border-zinc-100 my-4" />

                            <div>
                                <label className="text-xs uppercase font-bold text-rose-500 flex items-center gap-2">
                                    <AlertTriangle size={14} /> Churn Count
                                </label>
                                <p className="text-[10px] text-zinc-400 mb-2">Cada churn reduz 50% da nota comportamental.</p>
                                <input type="number" className="w-full bg-zinc-50 border border-zinc-200 rounded-lg p-2"
                                    value={reviewForm.churns} onChange={e => setReviewForm({ ...reviewForm, churns: Number(e.target.value) })}
                                />
                            </div>
                        </div>

                        <div className="flex justify-end gap-2 mt-8">
                            <button onClick={() => setReviewModalOpen(false)} className="px-4 py-2 text-zinc-500 hover:bg-zinc-100 rounded-lg">Cancelar</button>
                            <button onClick={saveReview} className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-bold">Salvar Avaliação</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal Configuração Implantação */}
            {configModalOpen && implRules && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white rounded-3xl p-6 w-full max-w-2xl shadow-2xl border border-zinc-200 max-h-[90vh] overflow-y-auto">
                        <h2 className="text-lg font-bold mb-1">Configurar Metas - {selectedCycle}</h2>
                        <p className="text-sm text-zinc-500 mb-6">Ajuste os alvos para o cálculo automático do semestre.</p>

                        <div className="grid grid-cols-2 gap-6">
                            <div className="space-y-4">
                                <h3 className="font-bold text-zinc-700 border-b pb-2">Coletivo (40%)</h3>
                                <div>
                                    <label className="text-xs font-bold text-zinc-500">Alvo de Volume (Pontos)</label>
                                    <input type="number" className="w-full bg-zinc-50 border border-zinc-200 rounded-lg p-2"
                                        value={implRules.collective.volume_target} onChange={e => setImplRules({...implRules, collective: {...implRules.collective, volume_target: Number(e.target.value)}})}
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-zinc-500">Alvo de Prazo/SLA (%)</label>
                                    <input type="number" className="w-full bg-zinc-50 border border-zinc-200 rounded-lg p-2"
                                        value={implRules.collective.otd_target} onChange={e => setImplRules({...implRules, collective: {...implRules.collective, otd_target: Number(e.target.value)}})}
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-zinc-500">Alvo de Qualidade (%)</label>
                                    <input type="number" className="w-full bg-zinc-50 border border-zinc-200 rounded-lg p-2"
                                        value={implRules.collective.quality_target} onChange={e => setImplRules({...implRules, collective: {...implRules.collective, quality_target: Number(e.target.value)}})}
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-zinc-500">Limite de Churn (Max)</label>
                                    <input type="number" className="w-full bg-zinc-50 border border-zinc-200 rounded-lg p-2"
                                        value={implRules.collective.churn_max} onChange={e => setImplRules({...implRules, collective: {...implRules.collective, churn_max: Number(e.target.value)}})}
                                    />
                                </div>
                            </div>

                            <div className="space-y-4">
                                <h3 className="font-bold text-zinc-700 border-b pb-2">Individual (40%)</h3>
                                <div>
                                    <label className="text-xs font-bold text-zinc-500">Alvo de Volume (Pontos / Pessoa)</label>
                                    <input type="number" className="w-full bg-zinc-50 border border-zinc-200 rounded-lg p-2"
                                        value={implRules.individual.volume_target} onChange={e => setImplRules({...implRules, individual: {...implRules.individual, volume_target: Number(e.target.value)}})}
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-zinc-500">Alvo de Qualidade (%)</label>
                                    <input type="number" className="w-full bg-zinc-50 border border-zinc-200 rounded-lg p-2"
                                        value={implRules.individual.quality_target} onChange={e => setImplRules({...implRules, individual: {...implRules.individual, quality_target: Number(e.target.value)}})}
                                    />
                                </div>
                                <h3 className="font-bold text-zinc-700 border-b pb-2 mt-4">Geral</h3>
                                <div>
                                    <label className="text-xs font-bold text-zinc-500">Threshold Mínimo para Bônus (%)</label>
                                    <input type="number" className="w-full bg-zinc-50 border border-zinc-200 rounded-lg p-2"
                                        value={implRules.general.minimum_threshold} onChange={e => setImplRules({...implRules, general: {...implRules.general, minimum_threshold: Number(e.target.value)}})}
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="flex justify-end gap-2 mt-8 border-t pt-4">
                            <button onClick={() => setConfigModalOpen(false)} className="px-4 py-2 text-zinc-500 hover:bg-zinc-100 rounded-lg">Cancelar</button>
                            <button onClick={saveImplantationRules} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold">Salvar Configurações</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
