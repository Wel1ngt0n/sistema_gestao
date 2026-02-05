const API_URL = 'http://localhost:5004/api';

// Helper Wrapper to mimic Axios
const request = async (endpoint, options = {}) => {
    const headers = { 'Content-Type': 'application/json', ...options.headers };
    try {
        const response = await fetch(`${API_URL}${endpoint}`, { ...options, headers });
        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || `Error ${response.status}`);
        }

        // Axios-like structure: return object with 'data' property
        return { data };
    } catch (error) {
        console.error("API Request Failed:", error);
        throw error;
    }
};

export const api = {
    // Generic Methods (Axios style)
    get: (endpoint) => request(endpoint, { method: 'GET' }),
    post: (endpoint, body) => request(endpoint, { method: 'POST', body: JSON.stringify(body) }),
    put: (endpoint, body) => request(endpoint, { method: 'PUT', body: JSON.stringify(body) }),
    delete: (endpoint) => request(endpoint, { method: 'DELETE' }),

    // Legacy / Specific Modules (Backward Compatibility)
    // Mantendo para não quebrar o que já existia, mas redirecionando para a lógica nova
    implantacao: {
        getSummary: async () => {
            const res = await request('/implantacao/');
            return res.data;
        }
    },
    integracao: {
        sync: async () => {
            const res = await request('/integracao/sync', { method: 'POST' });
            return res.data;
        },
        list: async () => {
            const res = await request('/integracao/list');
            return res.data;
        }
    }
};
