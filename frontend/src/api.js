import axios from 'axios';

const api = axios.create({
    baseURL: 'http://localhost:5000/api',
});

// Her istek gitmeden hemen önce buraya uğrar
api.interceptors.request.use((config) => {
    const token = localStorage.getItem('token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`; // "Kapıdaki anahtar"
    }
    return config;
}, (error) => {
    return Promise.reject(error);
});

export default api;