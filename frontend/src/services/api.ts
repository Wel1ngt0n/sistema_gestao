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

export const getAccessToken = () => inMemoryAccessToken;

export const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL || '',
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
    const isPresentationMode = localStorage.getItem('presentation_mode') === 'true';
    if (isPresentationMode && response.data) {
        const isFinancialKey = (key: string) => {
            const k = key.toLowerCase();
            const exactMatches = ['id', 'status', 'code', 'month', 'year', 'day', 'page', 'size', 'index', 'order'];
            if (exactMatches.includes(k)) return false;
            
            const avoid = ['id', 'date', 'time', 'status', 'code', 'version', 'count', 'cpf', 'cnpj', 'phone', 'zip', 'cep', 'lat', 'lng', 'percent', 'tax', 'rate', 'type', 'category', 'color', 'icon', 'url', 'path', 'slug', 'token'];
            if (avoid.some(word => k.includes(word))) return false;
        
            return true;
        };
        
        const halveData = (data: any, keyName?: string, index?: number): any => {
            if (data === null || data === undefined) return data;
            
            if (typeof data === 'number') {
                if (!keyName || isFinancialKey(keyName)) {
                    return Number.isInteger(data) ? Math.floor(data / 2) : data / 2;
                }
                return data;
            }
            
            if (typeof data === 'string') {
                // If it is a string representing a number, halve it too
                if (/^-?\d+(\.\d+)?$/.test(data) && keyName && isFinancialKey(keyName) && data.length < 15) {
                    if (!data.startsWith('0') || data === '0' || data.startsWith('0.')) {
                        const num = parseFloat(data);
                        if (!isNaN(num)) {
                            const halved = num / 2;
                            return Number.isInteger(num) ? Math.floor(halved).toString() : halved.toFixed(2);
                        }
                    }
                }
                
                // Anonymize the name strings if they seem to represent a store/entity
                if (keyName && ['name', 'nome', 'store_name', 'client_name', 'razao_social', 'fantasia', 'loja'].includes(keyName.toLowerCase())) {
                    return index !== undefined ? `Loja Oculta ${index + 1}` : `Entidade Oculta`;
                }
                
                return data;
            }
            
            if (Array.isArray(data)) {
                // Cut the array in half to anonymize and hide half of the stores
                let arrayToProcess = data;
                if (data.length > 2 && typeof data[0] === 'object' && data[0] !== null) {
                    arrayToProcess = data.slice(0, Math.ceil(data.length / 2));
                }
                return arrayToProcess.map((item, idx) => halveData(item, keyName, idx));
            }
            
            if (typeof data === 'object') {
                const newData: any = {};
                for (const [key, value] of Object.entries(data)) {
                    newData[key] = halveData(value, key, index);
                }
                return newData;
            }
            
            return data;
        };

        response.data = halveData(response.data);
    }
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
