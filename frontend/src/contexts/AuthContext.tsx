import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { api, setAccessToken, setCsrfToken } from '../services/api';

interface User {
    id: number;
    name: string;
    email: string;
    profile_picture?: string;
    is_active: boolean;
    totp_enabled: boolean;
    roles: string[];
}

interface AuthContextType {
    user: User | null;
    token: string | null;
    login: (userData: User, csrfToken?: string | null, accessToken?: string | null) => void;
    logout: () => Promise<void>;
    loading: boolean;
    hasPermission: (perm: string) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadSession = async () => {
            try {
                const response = await api.get('/api/auth/me');
                setUser(response.data.user);
                setCsrfToken(response.data.csrf_token);
                setAccessToken(null);
                localStorage.removeItem('auth_token');
                localStorage.setItem('auth_user', JSON.stringify(response.data.user));
            } catch {
                setUser(null);
                setCsrfToken(null);
                setAccessToken(null);
                localStorage.removeItem('auth_token');
                localStorage.removeItem('auth_user');
            } finally {
                setLoading(false);
            }
        };

        loadSession();
    }, []);

    const login = (userData: User, csrfToken?: string | null, accessToken?: string | null) => {
        setUser(userData);
        if (csrfToken !== undefined) {
            setCsrfToken(csrfToken);
        }
        if (accessToken !== undefined) {
            setAccessToken(accessToken);
        }
        localStorage.removeItem('auth_token');
        localStorage.setItem('auth_user', JSON.stringify(userData));
    };

    const logout = async () => {
        try {
            await api.post('/api/auth/logout');
        } catch {
            // Mesmo se o cookie ja expirou, limpamos o estado local.
        } finally {
            setUser(null);
            setCsrfToken(null);
            setAccessToken(null);
            localStorage.removeItem('auth_token');
            localStorage.removeItem('auth_user');
        }
    };

    const hasPermission = (_permission: string): boolean => {
        if (user?.roles.includes('Super Admin')) return true;
        return false;
    };

    return (
        <AuthContext.Provider value={{ user, token: null, login, logout, loading, hasPermission }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
