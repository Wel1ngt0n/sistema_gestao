import { FormEvent, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
    AlertCircle,
    ArrowRight,
    BarChart3,
    CheckCircle2,
    Eye,
    EyeOff,
    KeyRound,
    Lock,
    Mail,
    ShieldCheck,
} from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import logo from '../assets/logo.png';

const BRAND_ORANGE = '#ff7900';
const BRAND_GREEN = '#128131';

const LoginScreen = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { login } = useAuth();

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    const [requires2FA, setRequires2FA] = useState(false);
    const [userId, setUserId] = useState<number | null>(null);
    const [twoFAChallenge, setTwoFAChallenge] = useState('');
    const [totpCode, setTotpCode] = useState('');

    const from = location.state?.from?.pathname || '/';

    const handleLogin = async (e: FormEvent) => {
        e.preventDefault();
        setError(null);
        setLoading(true);

        try {
            const response = await api.post('/api/auth/login', { email, password });

            if (response.data.requires_2fa) {
                setRequires2FA(true);
                setUserId(response.data.user_id);
                setTwoFAChallenge(response.data.challenge || '');
            } else {
                login(response.data.user, response.data.csrf_token);
                navigate(from, { replace: true });
            }
        } catch (err: any) {
            setError(err.response?.data?.error || 'Erro ao conectar no servidor.');
        } finally {
            setLoading(false);
        }
    };

    const handleVerify2FA = async (e: FormEvent) => {
        e.preventDefault();
        setError(null);
        setLoading(true);

        try {
            const response = await api.post('/api/auth/verify-2fa', {
                user_id: userId,
                code: totpCode,
                challenge: twoFAChallenge,
            });

            login(response.data.user, response.data.csrf_token);
            navigate(from, { replace: true });
        } catch (err: any) {
            setError(err.response?.data?.error || 'Codigo 2FA invalido.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <main className="relative flex min-h-screen overflow-hidden bg-[#f7f8fb] text-slate-950">
            <div className="absolute inset-0 bg-[linear-gradient(125deg,#ffffff_0%,#ffffff_34%,#fff7ed_60%,#ffe8cc_100%)]" />
            <div className="absolute inset-y-0 left-0 w-[58%] bg-[radial-gradient(circle_at_18%_18%,rgba(255,121,0,0.18),transparent_32%),radial-gradient(circle_at_8%_78%,rgba(18,129,49,0.08),transparent_30%)]" />
            <div className="absolute right-0 top-0 h-full w-1/2 bg-[linear-gradient(135deg,rgba(255,255,255,0.72),rgba(255,121,0,0.10))]" />

            <section className="relative z-10 grid min-h-screen w-full grid-cols-1 lg:grid-cols-[1.05fr_0.95fr]">
                <div className="hidden flex-col justify-between px-10 py-10 lg:flex xl:px-14">
                    <div>
                        <div className="flex items-center gap-3">
                            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white shadow-sm ring-1 ring-orange-100">
                                <img src={logo} alt="Instabuy" className="h-8 w-8 object-contain" />
                            </div>
                            <div className="text-2xl font-black uppercase tracking-tight text-slate-950">
                                <span>Instabuy</span>
                                <span className="ml-2" style={{ color: BRAND_ORANGE }}>Operacoes</span>
                            </div>
                        </div>

                        <div className="mt-20 max-w-xl">
                            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-orange-200 bg-white/80 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-orange-700 shadow-sm backdrop-blur">
                                <ShieldCheck size={14} />
                                Painel operacional seguro
                            </div>
                            <h1 className="text-4xl font-black leading-tight tracking-tight text-slate-950 xl:text-5xl">
                                Gestao inteligente para operacoes.
                            </h1>
                            <p className="mt-5 max-w-lg text-base leading-7 text-slate-600">
                                Acesse monitoramento, suporte, integracoes, relatorios e indicadores criticos em uma experiencia unificada.
                            </p>
                        </div>

                        <div className="mt-8 grid max-w-xl grid-cols-3 gap-3">
                            {[
                                { label: 'SLA', value: 'Tempo real', icon: BarChart3 },
                                { label: 'Dados', value: 'Unificados', icon: CheckCircle2 },
                                { label: 'Acesso', value: 'Protegido', icon: ShieldCheck },
                            ].map((item) => (
                                <div key={item.label} className="rounded-lg border border-orange-100 bg-white/75 p-3 shadow-sm backdrop-blur">
                                    <item.icon className="mb-2 h-4 w-4 text-orange-500" />
                                    <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{item.label}</p>
                                    <p className="mt-1 text-sm font-bold text-slate-900">{item.value}</p>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="flex items-center gap-4 text-sm text-slate-500">
                        <span>Modulo Operacional</span>
                        <span className="h-1 w-1 rounded-full bg-orange-400" />
                        <span>Instabuy © 2026</span>
                    </div>
                </div>

                <div className="flex items-center justify-center px-5 py-8 sm:px-8 lg:px-12">
                    <div className="w-full max-w-[460px]">
                        <div className="mb-8 flex flex-col items-center gap-3 text-center lg:hidden">
                            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white shadow-sm ring-1 ring-orange-100">
                                <img src={logo} alt="Instabuy" className="h-9 w-9 object-contain" />
                            </div>
                            <div className="text-xl font-black uppercase tracking-tight text-slate-950">
                                Instabuy <span className="text-[#ff7900]">Operacoes</span>
                            </div>
                        </div>

                        <div className="rounded-3xl border border-orange-100/80 bg-white/90 p-6 shadow-2xl shadow-orange-900/10 backdrop-blur-xl sm:p-8">
                            <div className="mb-8 flex items-start justify-between gap-4">
                                <div>
                                    <p className="mb-2 text-xs font-bold uppercase tracking-[0.18em] text-orange-400">
                                        {requires2FA ? 'Verificacao' : 'Acesso ao sistema'}
                                    </p>
                                    <h2 className="text-3xl font-black tracking-tight text-slate-950">
                                        {requires2FA ? 'Confirme sua identidade' : 'Bem-vindo de volta'}
                                    </h2>
                                    <p className="mt-2 text-sm leading-6 text-slate-500">
                                        {requires2FA
                                            ? 'Insira o codigo de 6 digitos do seu aplicativo autenticador.'
                                            : 'Entre com suas credenciais para continuar no painel operacional.'}
                                    </p>
                                </div>
                                <div className="hidden rounded-xl border border-orange-100 bg-orange-50 p-3 text-orange-500 sm:block">
                                    {requires2FA ? <KeyRound size={22} /> : <Lock size={22} />}
                                </div>
                            </div>

                            {error && (
                                <div className="mb-6 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4" role="alert">
                                    <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-500" />
                                    <p className="text-sm font-medium text-red-700">{error}</p>
                                </div>
                            )}

                            {!requires2FA ? (
                                <form onSubmit={handleLogin} className="space-y-5">
                                    <div className="space-y-2">
                                        <label htmlFor="email" className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500">
                                            Email
                                        </label>
                                        <div className="relative">
                                            <Mail className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                                            <input
                                                id="email"
                                                type="email"
                                                value={email}
                                                onChange={(e) => setEmail(e.target.value)}
                                                className="h-14 w-full rounded-xl border border-slate-200 bg-white pl-12 pr-4 text-base font-semibold text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-orange-400/80 focus:ring-4 focus:ring-orange-500/10"
                                                placeholder="operador@instabuy.com.br"
                                                autoComplete="email"
                                                required
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <label htmlFor="password" className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500">
                                            Senha
                                        </label>
                                        <div className="relative">
                                            <Lock className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                                            <input
                                                id="password"
                                                type={showPassword ? 'text' : 'password'}
                                                value={password}
                                                onChange={(e) => setPassword(e.target.value)}
                                                className="h-14 w-full rounded-xl border border-slate-200 bg-white pl-12 pr-12 text-base font-semibold text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-orange-400/80 focus:ring-4 focus:ring-orange-500/10"
                                                placeholder="Digite sua senha"
                                                autoComplete="current-password"
                                                required
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowPassword((value) => !value)}
                                                className="absolute right-3 top-1/2 rounded-lg p-2 text-slate-400 transition hover:bg-orange-50 hover:text-orange-600"
                                                aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                                            >
                                                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                            </button>
                                        </div>
                                    </div>

                                    <button
                                        type="submit"
                                        disabled={loading}
                                        className="group mt-7 flex h-14 w-full items-center justify-center gap-2 rounded-xl bg-[#ff7900] px-4 text-base font-black text-white shadow-lg shadow-orange-500/20 transition hover:bg-[#e66d00] disabled:cursor-not-allowed disabled:bg-zinc-800 disabled:text-zinc-500"
                                    >
                                        {loading ? (
                                            <span className="h-5 w-5 animate-spin rounded-full border-2 border-white/25 border-t-white" />
                                        ) : (
                                            <>
                                                Entrar
                                                <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
                                            </>
                                        )}
                                    </button>
                                </form>
                            ) : (
                                <form onSubmit={handleVerify2FA} className="space-y-6">
                                    <div className="rounded-2xl border border-orange-100 bg-orange-50 p-4">
                                        <div className="flex items-center gap-3">
                                            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-100 text-orange-600">
                                                <KeyRound size={20} />
                                            </div>
                                            <div>
                                                <p className="text-sm font-bold text-slate-950">Autenticacao em duas etapas</p>
                                                <p className="text-xs text-slate-500">Use o codigo temporario do seu autenticador.</p>
                                            </div>
                                        </div>
                                    </div>

                                    <input
                                        type="text"
                                        value={totpCode}
                                        onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                                        className="h-16 w-full rounded-xl border border-slate-200 bg-white text-center font-mono text-3xl font-bold tracking-[0.5em] text-slate-950 outline-none transition placeholder:text-slate-300 focus:border-orange-400/80 focus:ring-4 focus:ring-orange-500/10"
                                        placeholder="000000"
                                        required
                                        autoFocus
                                        maxLength={6}
                                        inputMode="numeric"
                                        autoComplete="one-time-code"
                                    />

                                    <div className="flex flex-col gap-3 sm:flex-row">
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setRequires2FA(false);
                                                setTotpCode('');
                                                setTwoFAChallenge('');
                                                setError(null);
                                            }}
                                            className="h-12 rounded-xl border border-slate-200 px-6 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
                                        >
                                            Voltar
                                        </button>
                                        <button
                                            type="submit"
                                            disabled={loading || totpCode.length !== 6}
                                            className="flex h-12 flex-1 items-center justify-center rounded-xl bg-[#ff7900] px-4 text-sm font-black text-white transition hover:bg-[#e66d00] disabled:cursor-not-allowed disabled:bg-zinc-800 disabled:text-zinc-500"
                                        >
                                            {loading ? (
                                                <span className="h-5 w-5 animate-spin rounded-full border-2 border-white/25 border-t-white" />
                                            ) : (
                                                'Validar codigo'
                                            )}
                                        </button>
                                    </div>
                                </form>
                            )}

                            <div className="mt-7 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-5 text-xs text-slate-500">
                                <span>Ambiente operacional Instabuy</span>
                                <span className="inline-flex items-center gap-1.5 font-semibold" style={{ color: BRAND_GREEN }}>
                                    <span className="h-1.5 w-1.5 rounded-full bg-[#128131]" />
                                    Online
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            </section>
        </main>
    );
};

export default LoginScreen;
