import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || '';

const api = axios.create({
    baseURL: `${API_URL}/api`,
    headers: {
        'Content-Type': 'application/json'
    }
});

// Request interceptor to add auth token
api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// Response interceptor for error handling
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response) {
            // Server responded with error
            const { status, data } = error.response;

            if (status === 401) {
                // Unauthorized - clear token and redirect to login
                localStorage.removeItem('token');
                window.location.href = '/login';
            }

            // Return error message from server
            return Promise.reject({
                status,
                message: data.message || 'Something went wrong',
                errors: data.errors
            });
        } else if (error.request) {
            // Request made but no response
            return Promise.reject({
                status: 0,
                message: 'Network error. Please check your connection.'
            });
        } else {
            // Request setup error
            return Promise.reject({
                status: 0,
                message: error.message
            });
        }
    }
);

export default api;

// Helper functions for common API calls
export const authAPI = {
    register: (data) => api.post('/auth/register', data),
    verify: (data) => api.post('/auth/verify', data),
    checkUser: (identifier) => api.post('/auth/login-check', { identifier }),
    getProfile: () => api.get('/auth/me'),
    updateProfile: (data) => api.put('/auth/me', data)
};

export const universitiesAPI = {
    getAll: () => api.get('/universities'),
    getById: (id) => api.get(`/universities/${id}`)
};

export const outletsAPI = {
    getAll: () => api.get('/outlets'),
    getBySlug: (slug) => api.get(`/outlets/${slug}`)
};

export const menuAPI = {
    getByOutlet: (outletId, params) => api.get(`/menu/outlet/${outletId}`, { params }),
    getItem: (id) => api.get(`/menu/item/${id}`),
    search: (query) => api.get('/menu/search', { params: { q: query } })
};

export const ordersAPI = {
    create: (data) => api.post('/orders', data),
    getAll: (params) => api.get('/orders', { params }),
    getActive: () => api.get('/orders/active'),
    getById: (id) => api.get(`/orders/${id}`)
};

export const paymentsAPI = {
    createOrder: (orderId) => api.post('/payments/create-order', { orderId }),
    verify: (data) => api.post('/payments/verify', data)
};

export const analyzeAPI = {
    getNutrition: (itemName, description, isVeg) =>
        api.post('/analyze/nutrition', { itemName, description, isVeg }),
    batchNutrition: (items) =>
        api.post('/analyze/nutrition/batch', { items })
};
