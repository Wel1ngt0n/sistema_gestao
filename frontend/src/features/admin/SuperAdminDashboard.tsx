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
    const [activeTab, setActiveTab] = useState<'integration' | 'implantation'>('integration')
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
        if (activeTab === 'integration') {
            fetchPerformance()
        }
    }, [activeTab, selectedCycle])

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
                    <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50 flex items-center gap-2">
                        <Trophy className="w-6 h-6 text-yellow-500" />
                        Gestão de Performance e Bônus
                    </h1>
                    <p className="text-zinc-500 dark:text-zinc-400 mt-1">
                        Acompanhamento de Metas (Coletiva/Individual/Comportamental)
                    </p>
                </div>
                <div className="flex items-center gap-4">
                    <input
                        type="month"
                        value={selectedCycle}
                        onChange={e => setSelectedCycle(e.target.value)}
                        className="bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg px-3 py-2 text-sm dark:text-white"
                    />
                </div>
            </div>

            {/* Tabs */}
            <div className="flex space-x-1 bg-zinc-100 dark:bg-zinc-900/50 p-1 rounded-xl w-fit">
                <button
                    onClick={() => setActiveTab('integration')}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === 'integration'
                        ? 'bg-white dark:bg-zinc-800 text-orange-600 shadow-sm'
                        : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'
                        }`}
                >
                    Integração
                </button>
                <button
                    onClick={() => setActiveTab('implantation')}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === 'implantation'
                        ? 'bg-white dark:bg-zinc-800 text-orange-600 shadow-sm'
                        : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'
                        }`}
                >
                    Implantação (Standby)
                </button>
            </div>

            {activeTab === 'implantation' ? (
                <div className="h-64 flex flex-col items-center justify-center text-zinc-400 border-2 border-dashed border-zinc-200 dark:border-zinc-800 rounded-3xl">
                    <Briefcase size={48} className="mb-4 opacity-50" />
                    <p>Módulo de Bônus de Implantação em Standby.</p>
                </div>
            ) : (
                <div className="space-y-6">
                    {/* Collective Cards */}
                    {data && (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl p-6 text-white shadow-lg relative overflow-hidden">
                                <div className="absolute right-0 top-0 p-4 opacity-20"><Target size={64} /></div>
                                <h3 className="text-blue-100 font-bold uppercase text-xs mb-1">Coletivo: Volume (Pts)</h3>
                                <div className="text-3xl font-bold">{data.collective_kpis.volume_points.toFixed(1)} <span className="text-base font-normal opacity-70">/ 80.0</span></div>
                            </div>
                            <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-2xl p-6 text-white shadow-lg relative overflow-hidden">
                                <div className="absolute right-0 top-0 p-4 opacity-20"><CheckCircle size={64} /></div>
                                <h3 className="text-emerald-100 font-bold uppercase text-xs mb-1">Coletivo: Qualidade</h3>
                                <div className="text-3xl font-bold">{data.collective_kpis.quality_global.toFixed(1)}% <span className="text-base font-normal opacity-70">/ 90%</span></div>
                            </div>
                            <div className="bg-gradient-to-br from-amber-500 to-amber-600 rounded-2xl p-6 text-white shadow-lg relative overflow-hidden">
                                <div className="absolute right-0 top-0 p-4 opacity-20"><UserCheck size={64} /></div>
                                <h3 className="text-amber-100 font-bold uppercase text-xs mb-1">Comportamental (Média)</h3>
                                <div className="text-3xl font-bold">-</div>
                                {/* Could calc average behavioral here if needed */}
                            </div>
                        </div>
                    )}

                    {/* Users Table */}
                    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl overflow-hidden shadow-sm">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-zinc-50 dark:bg-zinc-800/50 text-zinc-500 uppercase font-semibold text-xs border-b border-zinc-200 dark:border-zinc-800">
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
                            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                                {loading && (
                                    <tr><td colSpan={7} className="p-8 text-center text-zinc-500">Calculando Scores...</td></tr>
                                )}
                                {data?.collaborators.map(user => (
                                    <tr key={user.username} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-800/30">
                                        <td className="px-6 py-4 font-bold text-zinc-900 dark:text-zinc-100">
                                            {user.username}
                                            <div className="text-xs text-zinc-500 font-normal">{user.role}</div>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded-lg font-bold">{user.scores.collective}%</span>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <div className="flex flex-col items-center">
                                                <span className="bg-emerald-100 text-emerald-700 px-2 py-1 rounded-lg font-bold">{user.scores.individual}%</span>
                                                <span className="text-[10px] text-zinc-500 mt-1">SLA: {user.metrics.sla_pct}%</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <span className={`px-2 py-1 rounded-lg font-bold ${user.metrics.churns > 0 ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-700'
                                                }`}>
                                                {user.scores.behavioral}%
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <span className="text-lg font-bold text-zinc-900 dark:text-white">{user.scores.final}%</span>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            {user.metrics.churns > 0 ? (
                                                <div className="flex items-center justify-center gap-1 text-rose-600 font-bold text-xs uppercase">
                                                    <AlertTriangle size={12} /> {user.metrics.churns} Churn
                                                </div>
                                            ) : <span className="text-zinc-400">-</span>}
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <button
                                                onClick={() => openReview(user)}
                                                className="p-2 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-lg text-zinc-500 transition-colors"
                                            >
                                                <Edit2 size={16} />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Modal Review */}
            {reviewModalOpen && selectedUser && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white dark:bg-zinc-900 rounded-3xl p-6 w-full max-w-md shadow-2xl border border-zinc-200 dark:border-zinc-800">
                        <h2 className="text-lg font-bold mb-1 dark:text-white">Avaliação Comportamental</h2>
                        <p className="text-sm text-zinc-500 mb-6">Colaborador: {selectedUser.username}</p>

                        <div className="space-y-4">
                            <div>
                                <label className="text-xs uppercase font-bold text-zinc-500 flex justify-between">
                                    Comunicação (0-100) <span className="text-zinc-900 dark:text-white">{reviewForm.comm}</span>
                                </label>
                                <input type="range" min="0" max="100" className="w-full mt-2 accent-amber-600"
                                    value={reviewForm.comm} onChange={e => setReviewForm({ ...reviewForm, comm: Number(e.target.value) })}
                                />
                            </div>
                            <div>
                                <label className="text-xs uppercase font-bold text-zinc-500 flex justify-between">
                                    Processos (0-100) <span className="text-zinc-900 dark:text-white">{reviewForm.proc}</span>
                                </label>
                                <input type="range" min="0" max="100" className="w-full mt-2 accent-amber-600"
                                    value={reviewForm.proc} onChange={e => setReviewForm({ ...reviewForm, proc: Number(e.target.value) })}
                                />
                            </div>
                            <div>
                                <label className="text-xs uppercase font-bold text-zinc-500 flex justify-between">
                                    Responsabilidade (0-100) <span className="text-zinc-900 dark:text-white">{reviewForm.resp}</span>
                                </label>
                                <input type="range" min="0" max="100" className="w-full mt-2 accent-amber-600"
                                    value={reviewForm.resp} onChange={e => setReviewForm({ ...reviewForm, resp: Number(e.target.value) })}
                                />
                            </div>

                            <hr className="border-zinc-100 dark:border-zinc-800 my-4" />

                            <div>
                                <label className="text-xs uppercase font-bold text-rose-500 flex items-center gap-2">
                                    <AlertTriangle size={14} /> Churn Count
                                </label>
                                <p className="text-[10px] text-zinc-400 mb-2">Cada churn reduz 50% da nota comportamental.</p>
                                <input type="number" className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg p-2 dark:text-white"
                                    value={reviewForm.churns} onChange={e => setReviewForm({ ...reviewForm, churns: Number(e.target.value) })}
                                />
                            </div>
                        </div>

                        <div className="flex justify-end gap-2 mt-8">
                            <button onClick={() => setReviewModalOpen(false)} className="px-4 py-2 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg">Cancelar</button>
                            <button onClick={saveReview} className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-bold">Salvar Avaliação</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
