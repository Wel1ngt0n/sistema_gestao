import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { api } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { Lock, Mail, KeyRound, ArrowRight, AlertCircle } from 'lucide-react';
import logo from '../assets/logo.png';

const LoginScreen = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { login } = useAuth();

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    // Estado para 2FA
    const [requires2FA, setRequires2FA] = useState(false);
    const [userId, setUserId] = useState<number | null>(null);
    const [totpCode, setTotpCode] = useState('');

    const from = location.state?.from?.pathname || "/";

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setLoading(true);

        try {
            const response = await api.post('/api/auth/login', { email, password });

            if (response.data.requires_2fa) {
                setRequires2FA(true);
                setUserId(response.data.user_id);
            } else {
                login(response.data.token, response.data.user);
                navigate(from, { replace: true });
            }
        } catch (err: any) {
            setError(err.response?.data?.error || 'Erro ao conectar no servidor.');
        } finally {
            setLoading(false);
        }
    };

    const handleVerify2FA = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setLoading(true);

        try {
            const response = await api.post('/api/auth/verify-2fa', {
                user_id: userId,
                code: totpCode
            });

            login(response.data.token, response.data.user);
            navigate(from, { replace: true });

        } catch (err: any) {
            setError(err.response?.data?.error || 'Código 2FA Inválido.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex text-zinc-100 font-sans bg-[#09090b] relative overflow-hidden">
            {/* Global Gradient Background */}
            <div className="absolute inset-0 bg-gradient-to-r from-[#ea580c] via-[#09090b] to-[#09090b] opacity-90 pointer-events-none z-0"></div>
            <div className="absolute top-0 left-0 w-full h-full opacity-20 bg-[radial-gradient(ellipse_at_top_left,_var(--tw-gradient-stops))] from-orange-400 via-transparent to-transparent pointer-events-none z-0"></div>

            {/* Lado Esquerdo - Info/Branding */}
            <div className="hidden lg:flex w-1/2 p-12 flex-col justify-between relative z-10">

                <div>
                    <div className="flex items-center gap-3 mb-16">
                        <img src={logo} alt="Instabuy" className="w-10 h-10 rounded-lg drop-shadow-md brightness-0 invert" />
                        <span className="text-2xl font-black tracking-tight text-white uppercase">Instabuy<span className="text-orange-200">Operações</span></span>
                    </div>

                    <h2 className="text-5xl font-bold leading-tight mb-6 text-white">
                        Gestão Inteligente.
                    </h2>
                    <p className="text-lg text-orange-100/80 max-w-md">
                        Faça login para acessar o painel de monitoramento, relatórios operacionais e previsão de indicadores críticos.
                    </p>
                </div>

                <div className="flex items-center gap-4 text-sm text-orange-200/50">
                    <p>Módulo Operacional</p>
                    <div className="w-1 h-1 bg-orange-500/50 rounded-full"></div>
                    <p>Instabuy &copy; 2026</p>
                </div>
            </div>

            {/* Lado Direito - Form de Login */}
            <div className="w-full lg:w-1/2 flex items-center justify-center p-8 relative z-10">
                <div className="w-full max-w-md">

                    <div className="mb-10 lg:hidden flex flex-col items-center justify-center gap-3 text-center">
                        <div className="w-12 h-12 bg-orange-600 rounded-lg flex items-center justify-center shadow-lg">
                            <img src={logo} alt="Instabuy" className="w-8 h-8 object-contain brightness-0 invert" />
                        </div>
                        <span className="text-xl font-black tracking-tight text-white uppercase text-center">Instabuy<br /><span className="text-orange-500 text-2xl">Operações</span></span>
                    </div>

                    <div className="bg-[#121214] border border-zinc-800/50 p-8 rounded-2xl shadow-2xl">

                        {!requires2FA ? (
                            <>
                                <h3 className="text-2xl font-bold mb-2">Acesso ao Sistema</h3>
                                <p className="text-zinc-500 text-sm mb-8">Insira suas credenciais para continuar.</p>

                                {error && (
                                    <div className="mb-6 p-4 bg-red-950/30 border border-red-500/20 rounded-xl flex items-start gap-3">
                                        <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                                        <p className="text-red-400 text-sm font-medium">{error}</p>
                                    </div>
                                )}

                                <form onSubmit={handleLogin} className="space-y-5">
                                    <div className="space-y-2">
                                        <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Email</label>
                                        <div className="relative">
                                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                                <Mail className="h-5 w-5 text-zinc-500" />
                                            </div>
                                            <input
                                                type="email"
                                                value={email}
                                                onChange={(e) => setEmail(e.target.value)}
                                                className="w-full pl-10 pr-4 py-3 bg-[#09090b] border border-zinc-800 rounded-xl text-zinc-100 placeholder-zinc-700 focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500 transition-all font-medium"
                                                placeholder="operador@instabuy.com.br"
                                                required
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <div className="flex items-center justify-between">
                                            <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Senha</label>
                                        </div>
                                        <div className="relative">
                                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                                <Lock className="h-5 w-5 text-zinc-500" />
                                            </div>
                                            <input
                                                type="password"
                                                value={password}
                                                onChange={(e) => setPassword(e.target.value)}
                                                className="w-full pl-10 pr-4 py-3 bg-[#09090b] border border-zinc-800 rounded-xl text-zinc-100 placeholder-zinc-700 focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500 transition-all font-medium"
                                                placeholder="••••••••"
                                                required
                                            />
                                        </div>
                                    </div>

                                    <button
                                        type="submit"
                                        disabled={loading}
                                        className="w-full mt-8 py-3 px-4 bg-orange-600 hover:bg-orange-500 disabled:bg-zinc-800 disabled:text-zinc-600 text-white font-medium rounded-xl transition-all flex items-center justify-center gap-2 group shadow-lg shadow-orange-500/10"
                                    >
                                        {loading ? (
                                            <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                                        ) : (
                                            <>
                                                Entrar
                                                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                                            </>
                                        )}
                                    </button>
                                </form>
                            </>
                        ) : (
                            <div className="animate-in fade-in slide-in-from-right-4 duration-500">
                                <div className="w-12 h-12 bg-orange-500/10 rounded-full flex items-center justify-center mb-6 border border-orange-500/20">
                                    <KeyRound className="w-6 h-6 text-orange-500" />
                                </div>
                                <h3 className="text-2xl font-bold mb-2">Autenticação 2FA</h3>
                                <p className="text-zinc-500 text-sm mb-6">Insira o código de 6 dígitos gerado pelo seu aplicativo autenticador.</p>

                                {error && (
                                    <div className="mb-6 p-4 bg-red-950/30 border border-red-500/20 rounded-xl flex items-start gap-3">
                                        <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                                        <p className="text-red-400 text-sm font-medium">{error}</p>
                                    </div>
                                )}

                                <form onSubmit={handleVerify2FA} className="space-y-6">
                                    <div className="space-y-2">
                                        <input
                                            type="text"
                                            value={totpCode}
                                            onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                                            className="w-full text-center tracking-[0.5em] text-3xl py-4 bg-[#09090b] border border-zinc-800 rounded-xl text-zinc-100 placeholder-zinc-800 focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500 transition-all font-mono"
                                            placeholder="000000"
                                            required
                                            autoFocus
                                            maxLength={6}
                                        />
                                    </div>

                                    <div className="flex gap-4">
                                        <button
                                            type="button"
                                            onClick={() => setRequires2FA(false)}
                                            className="px-6 py-3 bg-zinc-800 hover:bg-zinc-700 text-white font-medium rounded-xl transition-colors"
                                        >
                                            Voltar
                                        </button>
                                        <button
                                            type="submit"
                                            disabled={loading || totpCode.length !== 6}
                                            className="flex-1 py-3 px-4 bg-orange-600 hover:bg-orange-500 disabled:bg-orange-600/50 disabled:cursor-not-allowed text-white font-medium rounded-xl transition-all flex items-center justify-center gap-2"
                                        >
                                            {loading ? (
                                                <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                                            ) : (
                                                'Validar Código'
                                            )}
                                        </button>
                                    </div>
                                </form>
                            </div>
                        )}

                    </div>
                </div>
            </div>
        </div>
    );
};

export default LoginScreen;
