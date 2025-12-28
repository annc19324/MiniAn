// src/services/api.ts
import axios from 'axios';

const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL,
});

api.interceptors.request.use((config) => {
    const token = localStorage.getItem('token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

// ==== Post Services ====
export const getFeed = () => api.get('/posts');
export const createPost = (formData: FormData) => api.post('/posts', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
});
export const likePost = (postId: number) => api.post(`/posts/${postId}/like`);
export const commentPost = (postId: number, content: string) => api.post(`/posts/${postId}/comment`, { content });

// ==== User Services ====
export const getProfile = (id: number) => api.get(`/users/profile/${id}`);
export const dailyCheckIn = () => api.post('/users/check-in');

// ==== Admin Services ====
export const getAllUsers = () => api.get('/users/admin/users');
export const updateUserStatus = (id: number, data: { role?: string, isVip?: boolean, isActive?: boolean }) => api.put(`/users/admin/users/${id}`, data);

export default api;