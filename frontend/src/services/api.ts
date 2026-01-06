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
export const commentPost = (postId: number, content: string, file?: File, parentId?: number) => {
    const formData = new FormData();
    formData.append('content', content);
    if (file) formData.append('file', file);
    if (parentId) formData.append('parentId', parentId.toString());
    return api.post(`/posts/${postId}/comment`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
    });
};
export const getUserPosts = (userId: number) => api.get(`/posts/user/${userId}`);
export const getPost = (id: number) => api.get(`/posts/${id}`);
export const deletePost = (id: number) => api.delete(`/posts/${id}`);
export const updatePost = (id: number, content: string) => api.put(`/posts/${id}`, { content });
export const getComments = (postId: number, cursor?: number) => api.get(`/posts/${postId}/comments`, { params: { cursor, limit: 5 } });

// ==== User Services ====
export const getProfile = (id: number) => api.get(`/users/profile/${id}`);
export const getFollowers = (id: number) => api.get(`/users/profile/${id}/followers`); // New
export const getFollowing = (id: number) => api.get(`/users/profile/${id}/following`); // New
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
export const updateUserCoins = (id: number, amount: number) => api.post(`/users/admin/users/${id}/coins`, { amount });
export const deleteUser = (id: number) => api.delete(`/users/admin/users/${id}`);
export const adminCreateUser = (data: any) => api.post('/users/admin/users', data);

// ==== Notification Services ====
export const getNotifications = () => api.get('/notifications');
export const getUnreadNotificationsCount = () => api.get('/notifications/unread-count');
export const markRead = (id: number) => api.put(`/notifications/${id}/read`);
export const markAllRead = () => api.put('/notifications/read-all');
export const subscribePush = (subscription: PushSubscription) => api.post('/notifications/subscribe', subscription);

// ==== Chat Services ====
// ==== Chat Services ====
export const getConversations = () => api.get('/chat/conversations');
export const startConversation = (targetUserId: number) => api.post('/chat/conversation/start', { targetUserId });
export const deleteConversation = (id: number) => api.delete(`/chat/conversation/${id}`);
export const getMessages = (roomId: number, cursor?: number) => api.get(`/chat/${roomId}/messages`, { params: { cursor, limit: 10 } });
export const sendMessage = (roomId: number, content: string, file?: File) => {
    const formData = new FormData();
    formData.append('content', content);
    if (file) formData.append('file', file);
    return api.post(`/chat/${roomId}/messages`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
    });
};
export const markMessagesRead = (roomId: number) => api.put(`/chat/read/${roomId}`);
export const deleteMessage = (id: number, type: 'recall' | 'me') => api.delete(`/chat/message/${id}`, { data: { type } });
export const updateMessage = (id: number, content: string) => api.put(`/chat/message/${id}`, { content });

// Group Chat Services
export const createGroup = (name: string, memberIds: number[]) => api.post('/chat/group/create', { name, memberIds });
export const updateGroup = (id: number, data: FormData) => api.put(`/chat/group/${id}`, data, { headers: { 'Content-Type': 'multipart/form-data' } });
export const addGroupMember = (roomId: number, memberId: number) => api.post(`/chat/group/${roomId}/member/add`, { memberId });
export const removeGroupMember = (roomId: number, memberId: number) => api.delete(`/chat/group/${roomId}/member/remove`, { data: { memberId } });
export const leaveGroup = (roomId: number) => api.post(`/chat/group/${roomId}/leave`);

export default api;