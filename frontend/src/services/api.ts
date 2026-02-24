import axios from 'axios';

export const api = axios.create({
    baseURL: 'http://localhost:5003',
    headers: {
        'Content-Type': 'application/json'
    }
});

// Interceptor para injetar o Token em todas as chamadas
api.interceptors.request.use((config) => {
    const token = localStorage.getItem('auth_token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
}, (error) => {
    return Promise.reject(error);
});

// Interceptor para deslogar automaticamente se o token expirar (401)
api.interceptors.response.use((response) => {
    return response;
}, (error) => {
    if (error.response && error.response.status === 401) {
        // Ignora a rota de login para não causar loop infinito
        if (!error.config.url.includes('/api/auth/login')) {
            localStorage.removeItem('auth_token');
            localStorage.removeItem('auth_user');
            // Recarrega a página para jogar o usuário para Fora 
            // (AuthContext irá captar que não tem mais token)
            window.location.href = '/login';
        }
    }
    return Promise.reject(error);
});
