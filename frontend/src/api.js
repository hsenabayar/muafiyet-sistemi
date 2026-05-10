import axios from 'axios';

const api = axios.create({
    baseURL: 'http://localhost:5000/api', // Backend adresin
});

// Token varsa otomatik ekler (Auth sistemin için)
api.interceptors.request.use((config) => {
    const token = localStorage.getItem('token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

export default api;