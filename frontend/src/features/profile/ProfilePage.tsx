import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import {
    AlertCircle,
    AtSign,
    BadgeCheck,
    Camera,
    CheckCircle2,
    Fingerprint,
    ImageOff,
    KeyRound,
    LockKeyhole,
    LogOut,
    Mail,
    QrCode,
    Save,
    ShieldAlert,
    ShieldCheck,
    Upload,
    User,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { api } from '../../services/api';

export const ProfilePage = () => {
    const navigate = useNavigate();
    const { user, login, logout } = useAuth();
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [name, setName] = useState(user?.name || '');
    const [email, setEmail] = useState(user?.email || '');
    const [currentPassword, setCurrentPassword] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [profilePic, setProfilePic] = useState<string | null>(user?.profile_picture || null);

    const [loading, setLoading] = useState(false);
    const [successMsg, setSuccessMsg] = useState('');
    const [errorMsg, setErrorMsg] = useState('');

    const [qrCodeUri, setQrCodeUri] = useState<string | null>(null);
    const [verifyCode, setVerifyCode] = useState('');
    const [is2FAModalOpen, setIs2FAModalOpen] = useState(false);

    const emailChanged = email.trim().toLowerCase() !== (user?.email || '').toLowerCase();
    const changingPassword = Boolean(password || confirmPassword);
    const needsCurrentPassword = emailChanged || changingPassword;
    const initials = (name || user?.name || 'U')
        .split(' ')
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0])
        .join('')
        .toUpperCase();

    useEffect(() => {
        if (user) {
            setName(user.name);
            setEmail(user.email);
            setProfilePic(user.profile_picture || null);
        }
    }, [user]);

    const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        if (file.size > 2 * 1024 * 1024) {
            setErrorMsg('A imagem deve ter no maximo 2MB.');
            return;
        }

        const reader = new FileReader();
        reader.onloadend = () => {
            setProfilePic(reader.result as string);
            setErrorMsg('');
        };
        reader.readAsDataURL(file);
    };

    const handleSaveProfile = async (event: React.FormEvent) => {
        event.preventDefault();
        setSuccessMsg('');
        setErrorMsg('');

        if (!name.trim()) {
            setErrorMsg('Informe seu nome completo.');
            return;
        }

        if (!email.trim()) {
            setErrorMsg('Informe seu e-mail.');
            return;
        }

        if (password && password.length < 8) {
            setErrorMsg('A nova senha deve ter pelo menos 8 caracteres.');
            return;
        }

        if (password !== confirmPassword) {
            setErrorMsg('As senhas nao conferem.');
            return;
        }

        if (needsCurrentPassword && !currentPassword) {
            setErrorMsg('Informe sua senha atual para alterar e-mail ou senha.');
            return;
        }

        setLoading(true);
        try {
            const payload: Record<string, string | null> = {
                name: name.trim(),
                email: email.trim().toLowerCase(),
                profile_picture: profilePic,
            };

            if (currentPassword) payload.current_password = currentPassword;
            if (password) payload.password = password;

            const response = await api.put('/api/profile', payload);
            login(response.data.user);
            setSuccessMsg('Perfil atualizado com sucesso.');
            setCurrentPassword('');
            setPassword('');
            setConfirmPassword('');
        } catch (err: any) {
            setErrorMsg(err.response?.data?.error || 'Erro ao salvar perfil.');
        } finally {
            setLoading(false);
        }
    };

    const handleSetup2FA = async () => {
        setIs2FAModalOpen(true);
        setErrorMsg('');
        try {
            const response = await api.post('/api/auth/setup-2fa');
            setQrCodeUri(response.data.uri);
            setVerifyCode('');
        } catch {
            setErrorMsg('Erro ao configurar 2FA.');
            setIs2FAModalOpen(false);
        }
    };

    const handleVerifyAndEnable2FA = async (event: React.FormEvent) => {
        event.preventDefault();
        setErrorMsg('');
        try {
            await api.post('/api/auth/enable-2fa', { code: verifyCode });
            if (user) login({ ...user, totp_enabled: true });
            setIs2FAModalOpen(false);
            setSuccessMsg('Autenticacao em dois fatores ativada com sucesso.');
        } catch (err: any) {
            setErrorMsg(err.response?.data?.error || 'Codigo invalido. Tente novamente.');
        }
    };

    const handleLogout = async () => {
        await logout();
        navigate('/login', { replace: true });
    };

    return (
        <div className="mx-auto max-w-7xl space-y-6">
            <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                <div>
                    <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-orange-200 bg-white px-3 py-1 text-xs font-bold uppercase tracking-wide text-orange-600 shadow-sm">
                        <Fingerprint className="h-4 w-4" />
                        Conta e seguranca
                    </div>
                    <h1 className="text-3xl font-black uppercase tracking-tight text-slate-950">Meu perfil</h1>
                    <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
                        Atualize dados pessoais, contato, foto, senha e protecao da conta.
                    </p>
                </div>

                <button
                    onClick={handleLogout}
                    className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-red-200 bg-red-50 px-5 text-sm font-bold text-red-600 transition hover:bg-red-100"
                >
                    <LogOut className="h-4 w-4" />
                    Sair da conta
                </button>
            </header>

            {successMsg && (
                <div className="flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">
                    <CheckCircle2 className="h-5 w-5" />
                    {successMsg}
                </div>
            )}

            {errorMsg && (
                <div className="flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
                    <AlertCircle className="h-5 w-5" />
                    {errorMsg}
                </div>
            )}

            <div className="grid grid-cols-1 gap-6 xl:grid-cols-[360px_1fr]">
                <aside className="space-y-6">
                    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                        <div className="flex flex-col items-center text-center">
                            <div className="relative">
                                <div className="flex h-36 w-36 items-center justify-center overflow-hidden rounded-full border-4 border-white bg-slate-100 shadow-xl ring-1 ring-slate-200">
                                    {profilePic ? (
                                        <img src={profilePic} alt="Avatar" className="h-full w-full object-cover" />
                                    ) : (
                                        <span className="text-4xl font-black text-slate-400">{initials}</span>
                                    )}
                                </div>
                                <button
                                    type="button"
                                    onClick={() => fileInputRef.current?.click()}
                                    className="absolute bottom-1 right-1 flex h-12 w-12 items-center justify-center rounded-full bg-orange-500 text-white shadow-lg transition hover:bg-orange-600"
                                    title="Alterar foto"
                                >
                                    <Camera className="h-5 w-5" />
                                </button>
                            </div>

                            <input
                                ref={fileInputRef}
                                type="file"
                                className="hidden"
                                accept="image/png, image/jpeg, image/webp"
                                onChange={handleImageUpload}
                            />

                            <h2 className="mt-5 max-w-full truncate text-xl font-black text-slate-950">{user?.name}</h2>
                            <p className="mt-1 flex max-w-full items-center justify-center gap-2 truncate text-sm text-slate-500">
                                <Mail className="h-4 w-4 shrink-0" />
                                {user?.email}
                            </p>

                            <div className="mt-4 flex flex-wrap justify-center gap-2">
                                {user?.roles.map((role) => (
                                    <span key={role} className="rounded-lg border border-orange-200 bg-orange-50 px-2.5 py-1 text-xs font-black uppercase tracking-wide text-orange-600">
                                        {role}
                                    </span>
                                ))}
                            </div>
                        </div>

                        <div className="mt-6 grid grid-cols-2 gap-3">
                            <button
                                type="button"
                                onClick={() => fileInputRef.current?.click()}
                                className="flex h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white text-sm font-bold text-slate-700 transition hover:bg-slate-50"
                            >
                                <Upload className="h-4 w-4" />
                                Enviar
                            </button>
                            <button
                                type="button"
                                onClick={() => setProfilePic(null)}
                                className="flex h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white text-sm font-bold text-slate-700 transition hover:bg-slate-50"
                            >
                                <ImageOff className="h-4 w-4" />
                                Remover
                            </button>
                        </div>
                    </section>

                    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                        <div className="mb-4 flex items-center justify-between gap-3">
                            <div>
                                <h3 className="text-sm font-black uppercase tracking-wide text-slate-700">Seguranca</h3>
                                <p className="mt-1 text-xs text-slate-500">Status de protecao da sua conta.</p>
                            </div>
                            {user?.totp_enabled ? (
                                <BadgeCheck className="h-6 w-6 text-emerald-500" />
                            ) : (
                                <ShieldAlert className="h-6 w-6 text-orange-500" />
                            )}
                        </div>

                        {user?.totp_enabled ? (
                            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
                                <ShieldCheck className="mb-3 h-8 w-8 text-emerald-600" />
                                <h4 className="font-black text-emerald-700">2FA ativo</h4>
                                <p className="mt-1 text-sm leading-5 text-emerald-700/75">Sua conta exige codigo temporario no login.</p>
                            </div>
                        ) : (
                            <div className="rounded-xl border border-orange-200 bg-orange-50 p-4">
                                <ShieldAlert className="mb-3 h-8 w-8 text-orange-600" />
                                <h4 className="font-black text-orange-700">2FA pendente</h4>
                                <p className="mt-1 text-sm leading-5 text-orange-700/75">Ative a segunda etapa para reduzir risco de acesso indevido.</p>
                                <button
                                    type="button"
                                    onClick={handleSetup2FA}
                                    className="mt-4 flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-orange-500 text-sm font-black text-white transition hover:bg-orange-600"
                                >
                                    <QrCode className="h-4 w-4" />
                                    Configurar 2FA
                                </button>
                            </div>
                        )}
                    </section>
                </aside>

                <form onSubmit={handleSaveProfile} className="space-y-6">
                    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm lg:p-8">
                        <div className="mb-6 flex items-start justify-between gap-4">
                            <div>
                                <h2 className="text-xl font-black text-slate-950">Informacoes pessoais</h2>
                                <p className="mt-1 text-sm text-slate-500">Nome e contato usados para identificacao no sistema.</p>
                            </div>
                            <User className="h-6 w-6 text-orange-500" />
                        </div>

                        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
                            <label className="space-y-2">
                                <span className="text-xs font-black uppercase tracking-wide text-slate-500">Nome completo</span>
                                <span className="relative block">
                                    <User className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                                    <input
                                        type="text"
                                        value={name}
                                        onChange={(event) => setName(event.target.value)}
                                        className="h-14 w-full rounded-xl border border-slate-200 bg-slate-50 pl-12 pr-4 text-base font-bold text-slate-900 outline-none transition focus:border-orange-300 focus:bg-white focus:ring-4 focus:ring-orange-500/10"
                                        required
                                    />
                                </span>
                            </label>

                            <label className="space-y-2">
                                <span className="text-xs font-black uppercase tracking-wide text-slate-500">E-mail</span>
                                <span className="relative block">
                                    <AtSign className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                                    <input
                                        type="email"
                                        value={email}
                                        onChange={(event) => setEmail(event.target.value)}
                                        className="h-14 w-full rounded-xl border border-slate-200 bg-slate-50 pl-12 pr-4 text-base font-bold text-slate-900 outline-none transition focus:border-orange-300 focus:bg-white focus:ring-4 focus:ring-orange-500/10"
                                        required
                                    />
                                </span>
                            </label>
                        </div>
                    </section>

                    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm lg:p-8">
                        <div className="mb-6 flex items-start justify-between gap-4">
                            <div>
                                <h2 className="text-xl font-black text-slate-950">Credenciais</h2>
                                <p className="mt-1 text-sm text-slate-500">Use a senha atual para confirmar alteracoes sensiveis.</p>
                            </div>
                            <LockKeyhole className="h-6 w-6 text-orange-500" />
                        </div>

                        <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
                            <label className="space-y-2">
                                <span className="text-xs font-black uppercase tracking-wide text-slate-500">Senha atual</span>
                                <span className="relative block">
                                    <KeyRound className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                                    <input
                                        type="password"
                                        value={currentPassword}
                                        onChange={(event) => setCurrentPassword(event.target.value)}
                                        placeholder={needsCurrentPassword ? 'Obrigatoria' : 'Opcional'}
                                        className="h-14 w-full rounded-xl border border-slate-200 bg-slate-50 pl-12 pr-4 text-base font-bold text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-orange-300 focus:bg-white focus:ring-4 focus:ring-orange-500/10"
                                        autoComplete="current-password"
                                    />
                                </span>
                            </label>

                            <label className="space-y-2">
                                <span className="text-xs font-black uppercase tracking-wide text-slate-500">Nova senha</span>
                                <span className="relative block">
                                    <KeyRound className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                                    <input
                                        type="password"
                                        value={password}
                                        onChange={(event) => setPassword(event.target.value)}
                                        placeholder="Minimo 8 caracteres"
                                        className="h-14 w-full rounded-xl border border-slate-200 bg-slate-50 pl-12 pr-4 text-base font-bold text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-orange-300 focus:bg-white focus:ring-4 focus:ring-orange-500/10"
                                        autoComplete="new-password"
                                    />
                                </span>
                            </label>

                            <label className="space-y-2">
                                <span className="text-xs font-black uppercase tracking-wide text-slate-500">Confirmar senha</span>
                                <span className="relative block">
                                    <KeyRound className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                                    <input
                                        type="password"
                                        value={confirmPassword}
                                        onChange={(event) => setConfirmPassword(event.target.value)}
                                        placeholder="Repita a senha"
                                        className="h-14 w-full rounded-xl border border-slate-200 bg-slate-50 pl-12 pr-4 text-base font-bold text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-orange-300 focus:bg-white focus:ring-4 focus:ring-orange-500/10"
                                        autoComplete="new-password"
                                    />
                                </span>
                            </label>
                        </div>

                        <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-500">
                            Alterar e-mail ou senha exige a senha atual. Alteracoes simples, como nome e foto, podem ser salvas sem confirmar credenciais.
                        </div>
                    </section>

                    <div className="flex justify-end">
                        <button
                            type="submit"
                            disabled={loading}
                            className="flex h-12 min-w-48 items-center justify-center gap-2 rounded-xl bg-slate-950 px-6 text-sm font-black text-white shadow-sm transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            {loading ? (
                                <span className="h-5 w-5 animate-spin rounded-full border-2 border-white/25 border-t-white" />
                            ) : (
                                <>
                                    <Save className="h-4 w-4" />
                                    Salvar alteracoes
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>

            {is2FAModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm">
                    <div className="w-full max-w-lg overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
                        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-5">
                            <div>
                                <h2 className="flex items-center gap-2 text-lg font-black text-slate-950">
                                    <QrCode className="h-5 w-5 text-orange-500" />
                                    Configurar autenticador
                                </h2>
                                <p className="mt-1 text-sm text-slate-500">Escaneie o QR Code e confirme o codigo.</p>
                            </div>
                        </div>

                        <div className="p-6">
                            <div className="mx-auto mb-6 flex w-fit justify-center rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                                {qrCodeUri ? (
                                    <QRCodeSVG value={qrCodeUri} size={200} level="M" />
                                ) : (
                                    <div className="flex h-[200px] w-[200px] items-center justify-center rounded-xl bg-slate-50 text-sm font-bold text-slate-400">
                                        Gerando...
                                    </div>
                                )}
                            </div>

                            <form onSubmit={handleVerifyAndEnable2FA} className="space-y-5">
                                <label className="block space-y-2">
                                    <span className="block text-center text-xs font-black uppercase tracking-wide text-slate-500">Codigo do aplicativo</span>
                                    <input
                                        type="text"
                                        value={verifyCode}
                                        onChange={(event) => setVerifyCode(event.target.value.replace(/\D/g, '').slice(0, 6))}
                                        className="mx-auto block h-16 w-full max-w-xs rounded-xl border border-slate-200 bg-slate-50 text-center font-mono text-3xl font-black tracking-[0.5em] text-slate-950 outline-none transition placeholder:text-slate-300 focus:border-orange-300 focus:bg-white focus:ring-4 focus:ring-orange-500/10"
                                        placeholder="000000"
                                        required
                                        autoFocus
                                        maxLength={6}
                                        inputMode="numeric"
                                        autoComplete="one-time-code"
                                    />
                                </label>

                                <div className="flex flex-col gap-3 sm:flex-row">
                                    <button
                                        type="button"
                                        onClick={() => setIs2FAModalOpen(false)}
                                        className="h-12 rounded-xl border border-slate-200 px-6 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={verifyCode.length !== 6}
                                        className="flex h-12 flex-1 items-center justify-center rounded-xl bg-orange-500 px-6 text-sm font-black text-white transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-60"
                                    >
                                        Validar e ativar
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
