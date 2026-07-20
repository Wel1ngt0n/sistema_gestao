import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

interface ProtectedRouteProps {
    children: React.ReactElement;
    requiredPermission?: string;
}

const ProtectedRoute = ({ children, requiredPermission }: ProtectedRouteProps) => {
    const { user, loading, hasPermission } = useAuth();
    const location = useLocation();

    // Enquanto valida o token armazenado em cache.
    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-zinc-900 text-zinc-100">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-10 h-10 border-4 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
                    <p>Autenticando...</p>
                </div>
            </div>
        );
    }

    if (!user) {
        // Redireciona para o login salvando onde ele queria ir
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    // Bloqueio global: exige a configuração da autenticação em dois fatores.
    // Permite acesso apenas ao perfil até que a configuração seja concluída.
    if (!user.totp_enabled && location.pathname !== '/profile') {
        return <Navigate to="/profile" state={{ force2FA: true }} replace />;
    }

    if (requiredPermission && !hasPermission(requiredPermission)) {
        // Exibe a página de acesso negado.
        return (
            <div className="min-h-screen flex items-center justify-center bg-zinc-900 text-zinc-100 p-6">
                <div className="text-center">
                    <h1 className="text-6xl font-black text-rose-500 mb-4">403</h1>
                    <h2 className="text-2xl font-bold mb-2">Acesso Negado</h2>
                    <p className="text-zinc-400 mb-6">
                        Você não tem a permissão estrutural para acessar esta área.
                    </p>
                    <button
                        onClick={() => window.history.back()}
                        className="px-6 py-2 bg-orange-600 hover:bg-orange-700 rounded-lg text-white font-medium transition-colors"
                    >
                        Voltar
                    </button>
                </div>
            </div>
        );
    }

    return children;
};

export default ProtectedRoute;
