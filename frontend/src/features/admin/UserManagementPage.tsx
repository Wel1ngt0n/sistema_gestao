import { useState, useEffect } from 'react'
import { api } from '../../services/api'
import { Users, UserPlus, Search, Shield, MoreVertical, XCircle, Mail } from 'lucide-react'

interface User {
    id: number
    name: string
    email: string
    role: string
    is_active: boolean
    last_login: string | null
}

export default function UserManagementPage() {
    const [users, setUsers] = useState<User[]>([])
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState('')
    const [showCreateModal, setShowCreateModal] = useState(false)

    // Form State
    const [newUser, setNewUser] = useState({ name: '', email: '', role: 'Operador', password: '' })

    useEffect(() => {
        fetchUsers()
    }, [])

    const fetchUsers = async () => {
        try {
            setLoading(true)
            const response = await api.get('/api/admin/users')
            setUsers(response.data)
        } catch (error) {
            console.error('Failed to fetch users', error)
        } finally {
            setLoading(false)
        }
    }

    const handleCreateUser = async (e: React.FormEvent) => {
        e.preventDefault()
        try {
            await api.post('/api/admin/users', newUser)
            setShowCreateModal(false)
            setNewUser({ name: '', email: '', role: 'Operador', password: '' })
            fetchUsers()
        } catch (error) {
            alert('Erro ao criar usuário')
        }
    }

    const toggleStatus = async (user: User) => {
        if (!confirm(`Deseja ${user.is_active ? 'desativar' : 'ativar'} este usuário?`)) return

        try {
            await api.put(`/api/admin/users/${user.id}`, { is_active: !user.is_active })
            fetchUsers()
        } catch (error) {
            console.error(error)
        }
    }

    const filteredUsers = users.filter(u =>
        u.name.toLowerCase().includes(search.toLowerCase()) ||
        u.role.toLowerCase().includes(search.toLowerCase()) ||
        (u.email && u.email.toLowerCase().includes(search.toLowerCase()))
    )

    return (
        <div className="max-w-6xl mx-auto space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50 flex items-center gap-2">
                        <Users className="w-6 h-6 text-orange-500" />
                        Gestão de Usuários
                    </h1>
                    <p className="text-zinc-500 dark:text-zinc-400 mt-1">
                        Controle quem tem acesso ao CRM e seus níveis de permissão.
                    </p>
                </div>
                <button
                    onClick={() => setShowCreateModal(true)}
                    className="flex items-center gap-2 px-4 py-2.5 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-xl font-medium hover:opacity-90 transition-all shadow-lg hover:shadow-xl"
                >
                    <UserPlus size={18} />
                    Novo Usuário
                </button>
            </div>

            {/* Filters */}
            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 w-5 h-5" />
                <input
                    type="text"
                    placeholder="Buscar por nome, email ou função..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 outline-none transition-all"
                />
            </div>

            {/* Users List */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {loading ? (
                    [...Array(6)].map((_, i) => (
                        <div key={i} className="h-40 bg-zinc-100 dark:bg-zinc-800/50 rounded-2xl animate-pulse"></div>
                    ))
                ) : filteredUsers.map(user => (
                    <div key={user.id} className="group bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-5 rounded-2xl shadow-sm hover:shadow-md transition-all relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-4">
                            <span className={`inline-flex w-2.5 h-2.5 rounded-full ${user.is_active ? 'bg-emerald-500' : 'bg-red-500'}`} title={user.is_active ? "Ativo" : "Inativo"}></span>
                        </div>

                        <div className="flex items-center gap-4 mb-4">
                            <div className="w-12 h-12 bg-gradient-to-br from-zinc-100 to-zinc-200 dark:from-zinc-800 dark:to-zinc-700 rounded-xl flex items-center justify-center text-zinc-500 font-bold text-xl uppercase">
                                {user.name.substring(0, 2)}
                            </div>
                            <div>
                                <h3 className="font-bold text-lg text-zinc-900 dark:text-white leading-tight">{user.name}</h3>
                                {user.email && (
                                    <div className="flex items-center gap-1.5 text-xs text-zinc-500 mt-0.5">
                                        <Mail size={12} /> {user.email}
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="flex items-center gap-2 mb-4">
                            <div className="px-2.5 py-1 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-xs font-semibold text-zinc-600 dark:text-zinc-300 flex items-center gap-1.5 border border-zinc-200 dark:border-zinc-700 uppercase tracking-wide">
                                <Shield size={12} />
                                {user.role}
                            </div>
                            {user.last_login && (
                                <span className="text-[10px] text-zinc-400">
                                    Último acesso: {user.last_login}
                                </span>
                            )}
                        </div>

                        <div className="border-t border-zinc-100 dark:border-zinc-800 pt-3 flex items-center justify-between">
                            <button
                                onClick={() => toggleStatus(user)}
                                className={`text-xs font-medium px-3 py-1.5 rounded-lg transition-colors border ${user.is_active
                                    ? 'border-red-100 text-red-600 hover:bg-red-50 dark:border-red-900/30 dark:text-red-400 dark:hover:bg-red-900/20'
                                    : 'border-emerald-100 text-emerald-600 hover:bg-emerald-50 dark:border-emerald-900/30 dark:text-emerald-400 dark:hover:bg-emerald-900/20'
                                    }`}
                            >
                                {user.is_active ? 'Desativar Acesso' : 'Reativar Acesso'}
                            </button>
                            <button className="p-1.5 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition-colors">
                                <MoreVertical size={16} />
                            </button>
                        </div>
                    </div>
                ))}
            </div>

            {/* Create Modal */}
            {showCreateModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white dark:bg-zinc-900 rounded-3xl p-6 w-full max-w-md shadow-2xl border border-zinc-200 dark:border-zinc-800 transform scale-100 animate-in zoom-in-95 duration-200">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-xl font-bold dark:text-white">Convidar Usuário</h2>
                            <button onClick={() => setShowCreateModal(false)} className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full transition-colors">
                                <XCircle className="text-zinc-400" />
                            </button>
                        </div>

                        <form onSubmit={handleCreateUser} className="space-y-4">
                            <div>
                                <label className="block text-xs font-semibold text-zinc-500 uppercase mb-1">Nome Completo</label>
                                <input
                                    required
                                    className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all dark:text-white"
                                    value={newUser.name}
                                    onChange={e => setNewUser({ ...newUser, name: e.target.value })}
                                    placeholder="ex: João Silva"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-zinc-500 uppercase mb-1">Email</label>
                                <input
                                    type="email"
                                    className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all dark:text-white"
                                    value={newUser.email}
                                    onChange={e => setNewUser({ ...newUser, email: e.target.value })}
                                    placeholder="joao@instabuy.com.br"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-zinc-500 uppercase mb-1">Senha Inicial</label>
                                <input
                                    type="password"
                                    required
                                    className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all dark:text-white"
                                    value={newUser.password}
                                    onChange={e => setNewUser({ ...newUser, password: e.target.value })}
                                    placeholder="******"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-zinc-500 uppercase mb-1">Função</label>
                                <select
                                    className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all dark:text-white"
                                    value={newUser.role}
                                    onChange={e => setNewUser({ ...newUser, role: e.target.value })}
                                >
                                    <option value="Operador">Operador (Acesso Padrão)</option>
                                    <option value="Gerente">Gerente (Acesso Avançado)</option>
                                    <option value="Super Admin">Super Admin (Acesso Total)</option>
                                </select>
                            </div>

                            <button
                                type="submit"
                                className="w-full py-3.5 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 font-bold rounded-xl mt-4 hover:opacity-90 transition-opacity shadow-lg"
                            >
                                Criar Usuário
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    )
}
