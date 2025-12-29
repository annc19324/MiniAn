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
export const getUserPosts = (userId: number) => api.get(`/posts/user/${userId}`);
export const getPost = (id: number) => api.get(`/posts/${id}`);

// ==== User Services ====
export const getProfile = (id: number) => api.get(`/users/profile/${id}`);
export const dailyCheckIn = () => api.post('/users/check-in');
export const searchUsers = (q: string) => api.get(`/users/search?q=${q}`);
export const followUser = (id: number) => api.post(`/users/follow/${id}`);
export const updateUserProfile = (data: FormData) => api.put('/users/profile/update', data, {
    headers: { 'Content-Type': 'multipart/form-data' }
});
export const getLeaderboard = () => api.get('/users/leaderboard');

// ==== Admin Services ====
export const getAllUsers = () => api.get('/users/admin/users');
export const updateUserStatus = (id: number, data: { role?: string, isVip?: boolean, isActive?: boolean }) => api.put(`/users/admin/users/${id}`, data);

// ==== Notification Services ====
export const getNotifications = () => api.get('/notifications');
export const getUnreadNotificationsCount = () => api.get('/notifications/unread-count');
export const markRead = (id: number) => api.put(`/notifications/${id}/read`);
export const markAllRead = () => api.put('/notifications/read-all');

// ==== Chat Services ====
export const getConversations = () => api.get('/chat/conversations');
export const startConversation = (targetUserId: number) => api.post('/chat/conversation/start', { targetUserId });
export const getMessages = (roomId: number) => api.get(`/chat/${roomId}/messages`);
export const sendMessage = (roomId: number, content: string) => api.post(`/chat/${roomId}/messages`, { content });
export const markMessagesRead = (roomId: number) => api.put(`/chat/read/${roomId}`);

export default api;