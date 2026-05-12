import axios from 'axios';

const CSRF_STORAGE_KEY = 'csrf_token';
let inMemoryAccessToken: string | null = null;

export const setCsrfToken = (token?: string | null) => {
    if (token) {
        sessionStorage.setItem(CSRF_STORAGE_KEY, token);
    } else {
        sessionStorage.removeItem(CSRF_STORAGE_KEY);
    }
};

export const setAccessToken = (token?: string | null) => {
    inMemoryAccessToken = token || null;
};

export const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5003',
    withCredentials: true,
    headers: {
        'Content-Type': 'application/json'
    }
});

api.interceptors.request.use((config) => {
    const method = (config.method || 'get').toLowerCase();
    const needsCsrf = !['get', 'head', 'options'].includes(method);
    const csrfToken = sessionStorage.getItem(CSRF_STORAGE_KEY);

    if (inMemoryAccessToken) {
        config.headers.Authorization = `Bearer ${inMemoryAccessToken}`;
    }

    if (needsCsrf && csrfToken) {
        config.headers['X-CSRF-Token'] = csrfToken;
    }

    if (config.data instanceof FormData) {
        delete config.headers['Content-Type'];
    }

    return config;
}, (error) => {
    return Promise.reject(error);
});

api.interceptors.response.use((response) => {
    return response;
}, (error) => {
    if (error.response && error.response.status === 401) {
        const url = error.config?.url || '';
        if (!url.includes('/api/auth/login') && !url.includes('/api/auth/me')) {
            localStorage.removeItem('auth_token');
            localStorage.removeItem('auth_user');
            setCsrfToken(null);
            window.location.href = '/login';
        }
    }
    return Promise.reject(error);
});
