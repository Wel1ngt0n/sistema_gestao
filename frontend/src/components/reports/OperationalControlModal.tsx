import { Fragment, useState, useEffect } from 'react'
import { Dialog, Transition } from '@headlessui/react'
import { X, CheckCircle2, AlertCircle, Calendar, Save, Loader2, MessageSquareText } from 'lucide-react'
import { api } from '../../services/api'

interface Store {
    id: number
    name: string
    delivered_with_quality?: boolean
    teve_retrabalho?: boolean
    considerar_tempo_implantacao?: boolean
    observacoes?: string
}

interface OperationalControlModalProps {
    isOpen: boolean
    onClose: () => void
    store: Store | null
    onSaveSuccess: () => void
}

export function OperationalControlModal({ isOpen, onClose, store, onSaveSuccess }: OperationalControlModalProps) {
    const [loading, setLoading] = useState(false)
    const [formData, setFormData] = useState({
        delivered_with_quality: true,
        teve_retrabalho: false,
        considerar_tempo_implantacao: true,
        observacoes: ''
    })

    useEffect(() => {
        if (store) {
            setFormData({
                delivered_with_quality: store.delivered_with_quality ?? true,
                teve_retrabalho: store.teve_retrabalho ?? false,
                considerar_tempo_implantacao: store.considerar_tempo_implantacao ?? true,
                observacoes: store.observacoes ?? ''
            })
        }
    }, [store])

    const handleSave = async () => {
        if (!store) return
        try {
            setLoading(true)
            await api.patch(`/api/reports/implantadores/stores/${store.id}/operational`, formData)
            onSaveSuccess()
            onClose()
        } catch (err) {
            console.error('Erro ao salvar controle operacional:', err)
            alert('Falha ao salvar alterações.')
        } finally {
            setLoading(false)
        }
    }

    return (
        <Transition appear show={isOpen} as={Fragment}>
            <Dialog as="div" className="relative z-[100]" onClose={onClose}>
                <Transition.Child
                    as={Fragment}
                    enter="ease-out duration-300"
                    enterFrom="opacity-0"
                    enterTo="opacity-100"
                    leave="ease-in duration-200"
                    leaveFrom="opacity-100"
                    leaveTo="opacity-0"
                >
                    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm" />
                </Transition.Child>

                <div className="fixed inset-0 overflow-y-auto">
                    <div className="flex min-h-full items-center justify-center p-4 text-center">
                        <Transition.Child
                            as={Fragment}
                            enter="ease-out duration-300"
                            enterFrom="opacity-0 scale-95"
                            enterTo="opacity-100 scale-100"
                            leave="ease-in duration-200"
                            leaveFrom="opacity-100 scale-100"
                            leaveTo="opacity-0 scale-95"
                        >
                            <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-[2.5rem] bg-[#EEF0F8] p-1 text-left align-middle shadow-2xl transition-all border border-white/20">
                                <div className="bg-white rounded-[2.3rem] overflow-hidden">
                                    {/* Header */}
                                    <div className="px-8 py-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                                        <div>
                                            <Dialog.Title as="h3" className="text-lg font-black text-slate-900 leading-tight">
                                                Controle Operacional
                                            </Dialog.Title>
                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{store?.name}</p>
                                        </div>
                                        <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-xl transition-colors text-slate-400">
                                            <X size={20} />
                                        </button>
                                    </div>

                                    <div className="p-8 space-y-8">
                                        {/* Operacional / SLA Section */}
                                        <div className="space-y-4">
                                            <div className="flex items-center gap-2 mb-4">
                                                <CheckCircle2 size={16} className="text-indigo-600" />
                                                <h4 className="text-xs font-black text-slate-500 uppercase tracking-widest">Controle Operacional / SLA</h4>
                                            </div>
                                            
                                            <div className="space-y-3">
                                                <label className="flex items-center gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-100 hover:border-indigo-200 transition-all cursor-pointer group">
                                                    <input 
                                                        type="checkbox" 
                                                        className="w-5 h-5 rounded-lg border-slate-300 text-indigo-600 focus:ring-indigo-500 transition-all"
                                                        checked={formData.delivered_with_quality}
                                                        onChange={e => setFormData({...formData, delivered_with_quality: e.target.checked})}
                                                    />
                                                    <span className="text-sm font-bold text-slate-700 group-hover:text-slate-900 transition-colors">Loja chegou completa na qualidade?</span>
                                                </label>

                                                <label className="flex items-center gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-100 hover:border-indigo-200 transition-all cursor-pointer group">
                                                    <input 
                                                        type="checkbox" 
                                                        className="w-5 h-5 rounded-lg border-slate-300 text-indigo-600 focus:ring-indigo-500 transition-all"
                                                        checked={formData.teve_retrabalho}
                                                        onChange={e => setFormData({...formData, teve_retrabalho: e.target.checked})}
                                                    />
                                                    <span className="text-sm font-bold text-slate-700 group-hover:text-slate-900 transition-colors">Houve retrabalho pós implantação?</span>
                                                </label>

                                                <label className="flex items-center gap-4 p-4 bg-indigo-50/50 rounded-2xl border border-indigo-100 hover:border-indigo-300 transition-all cursor-pointer group">
                                                    <input 
                                                        type="checkbox" 
                                                        className="w-5 h-5 rounded-lg border-indigo-300 text-indigo-600 focus:ring-indigo-500 transition-all"
                                                        checked={formData.considerar_tempo_implantacao}
                                                        onChange={e => setFormData({...formData, considerar_tempo_implantacao: e.target.checked})}
                                                    />
                                                    <span className="text-sm font-bold text-indigo-900 group-hover:text-indigo-950 transition-colors">Considerar SLA?</span>
                                                </label>
                                            </div>
                                        </div>

                                        {/* Observações Privadas Section */}
                                        <div className="space-y-4">
                                            <div className="flex items-center gap-2 mb-4">
                                                <MessageSquareText size={16} className="text-indigo-600" />
                                                <h4 className="text-xs font-black text-slate-500 uppercase tracking-widest">Observações Privadas</h4>
                                            </div>
                                            <textarea 
                                                className="w-full h-32 p-4 bg-slate-50 rounded-2xl border border-slate-200 focus:border-indigo-400 focus:ring-4 focus:ring-indigo-50 font-medium text-sm text-slate-700 placeholder:text-slate-400 transition-all resize-none"
                                                placeholder="Anotações internas sobre a loja..."
                                                value={formData.observacoes}
                                                onChange={e => setFormData({...formData, observacoes: e.target.value})}
                                            />
                                        </div>

                                        {/* Actions */}
                                        <div className="flex gap-3 pt-4">
                                            <button
                                                onClick={onClose}
                                                className="flex-1 px-6 py-4 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-2xl text-xs font-black uppercase tracking-widest transition-all active:scale-95"
                                            >
                                                Cancelar
                                            </button>
                                            <button
                                                onClick={handleSave}
                                                disabled={loading}
                                                className="flex-[2] px-6 py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl text-xs font-black uppercase tracking-widest transition-all shadow-xl shadow-indigo-100 active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
                                            >
                                                {loading ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                                                {loading ? 'Salvando...' : 'Salvar Alterações'}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </Dialog.Panel>
                        </Transition.Child>
                    </div>
                </div>
            </Dialog>
        </Transition>
    )
}
