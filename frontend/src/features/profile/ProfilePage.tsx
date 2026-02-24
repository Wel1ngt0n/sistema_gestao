import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { api } from '../../services/api';
import {
    User, Mail, ShieldAlert, ShieldCheck, Camera,
    Save, KeyRound, QrCode, LogOut
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';

export const ProfilePage = () => {
    const { user, login, logout, token } = useAuth();

    // Form States
    const [name, setName] = useState(user?.name || '');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [profilePic, setProfilePic] = useState<string | null>(user?.profile_picture || null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Feedback States
    const [loading, setLoading] = useState(false);
    const [successMsg, setSuccessMsg] = useState('');
    const [errorMsg, setErrorMsg] = useState('');

    // 2FA States
    const [qrCodeUri, setQrCodeUri] = useState<string | null>(null);
    const [verifyCode, setVerifyCode] = useState('');
    const [is2FAModalOpen, setIs2FAModalOpen] = useState(false);

    useEffect(() => {
        if (user) {
            setName(user.name);
            setProfilePic(user.profile_picture || null);
        }
    }, [user]);

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            if (file.size > 2 * 1024 * 1024) { // 2MB limit
                setErrorMsg('A imagem deve ter no máximo 2MB.');
                return;
            }
            const reader = new FileReader();
            reader.onloadend = () => {
                setProfilePic(reader.result as string);
                setErrorMsg('');
            };
            reader.readAsDataURL(file);
        }
    };

    const handleSaveProfile = async (e: React.FormEvent) => {
        e.preventDefault();
        setSuccessMsg('');
        setErrorMsg('');

        if (password && password !== confirmPassword) {
            setErrorMsg('As senhas não conferem.');
            return;
        }

        setLoading(true);
        try {
            const payload: any = { name, profile_picture: profilePic };
            if (password) payload.password = password;

            const res = await api.put('/api/profile', payload);

            // Atualiza o contexto (simula um re-login com novos dados)
            if (token) {
                login(token, res.data.user);
            }

            setSuccessMsg('Perfil atualizado com sucesso!');
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
        try {
            const res = await api.post('/api/auth/setup-2fa');
            setQrCodeUri(res.data.uri);
            setVerifyCode('');
        } catch (err: any) {
            setErrorMsg('Erro ao configurar 2FA.');
        }
    };

    const handleVerifyAndEnable2FA = async (e: React.FormEvent) => {
        e.preventDefault();
        setErrorMsg('');
        try {
            await api.post('/api/auth/enable-2fa', { code: verifyCode });

            // Update Context to reflect 2FA enabled
            if (token && user) {
                login(token, { ...user, totp_enabled: true });
            }

            setIs2FAModalOpen(false);
            setSuccessMsg('Autenticação em Dois Fatores (2FA) Ativada com Sucesso!');
        } catch (err: any) {
            setErrorMsg(err.response?.data?.error || 'Código inválido. Tente novamente.');
        }
    };

    return (
        <div className="max-w-4xl mx-auto space-y-6">

            <header className="mb-8">
                <h1 className="text-3xl font-black text-zinc-900 dark:text-zinc-100 uppercase tracking-tight">Meu Perfil</h1>
                <p className="text-zinc-500 mt-2">Gerencie suas informações pessoais e configurações de segurança da conta.</p>
            </header>

            {successMsg && (
                <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-medium rounded-xl flex items-center gap-2">
                    <ShieldCheck className="w-5 h-5 shrink-0" /> {successMsg}
                </div>
            )}

            {errorMsg && (
                <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 font-medium rounded-xl flex items-center gap-2">
                    <ShieldAlert className="w-5 h-5 shrink-0" /> {errorMsg}
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* Lateral Esquerda - Avatar & Segurança Básica */}
                <div className="lg:col-span-1 space-y-6">
                    {/* AVATAR UPLOAD */}
                    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 flex flex-col items-center text-center shadow-sm">
                        <div className="relative group mb-4">
                            <div className="w-32 h-32 rounded-full overflow-hidden bg-zinc-100 dark:bg-zinc-800 border-4 border-white dark:border-zinc-900 shadow-xl relative">
                                {profilePic ? (
                                    <img src={profilePic} alt="Avatar" className="w-full h-full object-cover" />
                                ) : (
                                    <User className="w-16 h-16 text-zinc-400 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                                )}
                            </div>

                            <button
                                onClick={() => fileInputRef.current?.click()}
                                className="absolute bottom-0 right-0 p-3 rounded-full bg-orange-600 text-white shadow-lg hover:bg-orange-500 transition-transform hover:scale-105"
                                title="Alterar Foto"
                            >
                                <Camera className="w-5 h-5" />
                            </button>
                            <input
                                type="file"
                                ref={fileInputRef}
                                className="hidden"
                                accept="image/png, image/jpeg, image/webp"
                                onChange={handleImageUpload}
                            />
                        </div>
                        <h3 className="text-lg font-bold text-zinc-900 dark:text-white truncate w-full">{user?.name}</h3>
                        <p className="text-sm text-zinc-500 flex items-center justify-center gap-1.5"><Mail className="w-4 h-4" /> {user?.email}</p>

                        <div className="mt-4 flex flex-wrap gap-2 justify-center">
                            {user?.roles.map(role => (
                                <span key={role} className="px-2.5 py-1 bg-orange-500/10 text-orange-600 dark:text-orange-400 border border-orange-500/20 text-xs font-bold rounded-md uppercase tracking-wider">
                                    {role}
                                </span>
                            ))}
                        </div>
                    </div>

                    {/* STATUS 2FA */}
                    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 shadow-sm">
                        <h4 className="text-sm font-bold text-zinc-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                            <ShieldCheck className="w-4 h-4" /> Segurança (2FA)
                        </h4>

                        {user?.totp_enabled ? (
                            <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4 text-center">
                                <ShieldCheck className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                                <h5 className="font-bold text-emerald-600 dark:text-emerald-400">2FA Ativado</h5>
                                <p className="text-xs text-emerald-600/70 mt-1">Sua conta está protegida por dupla validação.</p>
                            </div>
                        ) : (
                            <div className="bg-orange-500/10 border border-orange-500/20 rounded-xl p-4 text-center">
                                <ShieldAlert className="w-8 h-8 text-orange-500 mx-auto mb-2" />
                                <h5 className="font-bold text-orange-600 dark:text-orange-400">2FA Desativado</h5>
                                <p className="text-xs text-orange-600/70 mt-1 mb-4">Adicione uma camada extra de proteção.</p>
                                <button
                                    onClick={handleSetup2FA}
                                    className="w-full py-2 bg-orange-600 hover:bg-orange-500 text-white font-medium rounded-lg text-sm transition-colors"
                                >
                                    Configurar 2FA
                                </button>
                            </div>
                        )}
                    </div>

                    {/* LOGOUT */}
                    <button
                        onClick={logout}
                        className="w-full flex items-center justify-center gap-2 py-3 bg-red-50 hover:bg-red-100 dark:bg-red-500/10 dark:hover:bg-red-500/20 text-red-600 dark:text-red-500 font-medium rounded-xl transition-colors border border-red-200 dark:border-red-500/20"
                    >
                        <LogOut className="w-5 h-5" /> Sair da Conta
                    </button>
                </div>

                {/* Área Principal - Forms */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-8 shadow-sm">
                        <h2 className="text-xl font-bold text-zinc-900 dark:text-white mb-6">Informações Pessoais</h2>

                        <form onSubmit={handleSaveProfile} className="space-y-5">
                            <div>
                                <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">Nome Completo</label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <User className="w-5 h-5 text-zinc-400" />
                                    </div>
                                    <input
                                        type="text"
                                        value={name}
                                        onChange={e => setName(e.target.value)}
                                        className="w-full pl-10 pr-4 py-3 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/50 dark:text-white font-medium transition-shadow"
                                        required
                                    />
                                </div>
                            </div>

                            <div className="pt-4 border-t border-zinc-100 dark:border-zinc-800/50">
                                <h3 className="text-sm font-bold text-zinc-900 dark:text-white mb-4">Alterar Senha</h3>
                                <p className="text-xs text-zinc-500 mb-4">Deixe em branco caso não queira alterar sua senha atual.</p>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">Nova Senha</label>
                                        <div className="relative">
                                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                                <KeyRound className="w-5 h-5 text-zinc-400" />
                                            </div>
                                            <input
                                                type="password"
                                                value={password}
                                                onChange={e => setPassword(e.target.value)}
                                                placeholder="Nova Senha"
                                                className="w-full pl-10 pr-4 py-3 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/50 dark:text-white transition-shadow"
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">Confirmar Nova Senha</label>
                                        <div className="relative">
                                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                                <KeyRound className="w-5 h-5 text-zinc-400" />
                                            </div>
                                            <input
                                                type="password"
                                                value={confirmPassword}
                                                onChange={e => setConfirmPassword(e.target.value)}
                                                placeholder="Confirme a Senha"
                                                className="w-full pl-10 pr-4 py-3 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/50 dark:text-white transition-shadow"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="pt-6 flex justify-end">
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="px-6 py-3 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 font-bold rounded-xl flex items-center gap-2 hover:opacity-90 transition-opacity disabled:opacity-50"
                                >
                                    {loading ? 'Salvando...' : (
                                        <>
                                            <Save className="w-5 h-5" /> Salvar Alterações
                                        </>
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>

            {/* Modal de Configuração do 2FA */}
            {is2FAModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <div className="bg-zinc-900 border border-zinc-800 w-full max-w-lg rounded-2xl overflow-hidden shadow-2xl animate-in slide-in-from-bottom-8 duration-300">
                        <div className="p-6 border-b border-zinc-800 flex justify-between items-center bg-zinc-950/50">
                            <h2 className="text-xl font-bold text-white flex items-center gap-2"><QrCode className="w-5 h-5 text-orange-500" /> Configurar Autenticador</h2>
                        </div>

                        <div className="p-8">
                            <ol className="list-decimal list-inside text-zinc-400 space-y-4 mb-8">
                                <li>Baixe o <strong>Google Authenticator</strong> ou Authy.</li>
                                <li>Escaneie o QR Code abaixo com o aplicativo.</li>
                                <li>Digite o código de 6 dígitos gerado para confirmar.</li>
                            </ol>

                            <div className="flex justify-center mb-8 p-4 bg-white rounded-2xl w-fit mx-auto">
                                {qrCodeUri ? (
                                    <QRCodeSVG value={qrCodeUri} size={200} level="M" />
                                ) : (
                                    <div className="w-[200px] h-[200px] bg-zinc-100 flex items-center justify-center text-zinc-400">Gerando...</div>
                                )}
                            </div>

                            <form onSubmit={handleVerifyAndEnable2FA}>
                                <div className="space-y-2 mb-6">
                                    <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block text-center">Código do Aplicativo</label>
                                    <input
                                        type="text"
                                        value={verifyCode}
                                        onChange={(e) => setVerifyCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                                        className="w-full max-w-xs mx-auto block text-center tracking-[0.5em] text-3xl py-4 bg-zinc-950 border border-zinc-800 rounded-xl text-white placeholder-zinc-800 focus:outline-none focus:ring-2 focus:ring-orange-500/50 transition-all font-mono"
                                        placeholder="000000"
                                        required
                                        autoFocus
                                        maxLength={6}
                                    />
                                </div>

                                <div className="flex gap-4">
                                    <button
                                        type="button"
                                        onClick={() => setIs2FAModalOpen(false)}
                                        className="px-6 py-3 bg-zinc-800 hover:bg-zinc-700 text-white font-medium rounded-xl transition-colors"
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={verifyCode.length !== 6}
                                        className="flex-1 py-3 px-4 bg-orange-600 hover:bg-orange-500 disabled:bg-orange-600/50 text-white font-medium rounded-xl transition-all flex items-center justify-center gap-2"
                                    >
                                        Validar e Ativar
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
