// src/pages/Settings.tsx
import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { updateUserProfile } from '../services/api'; // We might need a new endpoint for Password
import { User, Lock, Mail, Save } from 'lucide-react';
import api from '../services/api';

export default function Settings() {
    const { user, login } = useAuth(); // We might need a way to refresh user logic or just update locally
    // For password change specifically
    const [passwordData, setPasswordData] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });

    // For general info (reuse updateUserProfile logic, but maybe here we want Email too?)
    // Currently updateUserProfile only supports fullName, bio, avatar. 
    // Let's assume we can add Email update to it or a separate function.
    const [formData, setFormData] = useState({
        username: user?.username || '',
        email: user?.email || '',
        fullName: user?.fullName || ''
    });

    const [loading, setLoading] = useState(false);

    const handleInfoSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            const data = new FormData();
            data.append('fullName', formData.fullName);
            // bio if we add it

            const res = await updateUserProfile(data);
            alert('Cập nhật thông tin thành công');
        } catch (error) {
            alert('Lỗi cập nhật');
        } finally {
            setLoading(false);
        }
    };

    const handlePasswordSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (passwordData.newPassword !== passwordData.confirmPassword) return alert("Mật khẩu mới không khớp");

        try {
            await api.put('/users/profile/change-password', {
                currentPassword: passwordData.currentPassword,
                newPassword: passwordData.newPassword
            });
            alert('Đổi mật khẩu thành công');
            setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
        } catch (error: any) {
            alert(error.response?.data?.message || 'Lỗi đổi mật khẩu');
        }
    };

    return (
        <div className="max-w-2xl mx-auto space-y-8">
            <h1 className="text-3xl font-extrabold heading-gradient">Cài đặt tài khoản</h1>

            {/* General Info */}
            <div className="glass-card p-6">
                <h2 className="text-xl font-bold mb-6 flex items-center gap-2 text-slate-800">
                    <User className="text-indigo-600" />
                    Thông tin chung
                </h2>
                <form onSubmit={handleInfoSubmit} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="label">Tên đăng nhập</label>
                            <input
                                type="text"
                                value={formData.username}
                                disabled
                                className="glass-input w-full opacity-60 cursor-not-allowed"
                            />
                        </div>
                        <div>
                            <label className="label">Email</label>
                            <input
                                type="email"
                                value={formData.email}
                                disabled // Enable if backend supports
                                className="glass-input w-full opacity-60 cursor-not-allowed"
                            />
                        </div>
                    </div>
                    <div>
                        <label className="label">Họ và tên</label>
                        <input
                            type="text"
                            value={formData.fullName}
                            onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                            className="glass-input w-full"
                        />
                    </div>
                    <div className="flex justify-end">
                        <button type="submit" disabled={loading} className="btn-primary flex items-center gap-2">
                            <Save size={18} /> Lưu thay đổi
                        </button>
                    </div>
                </form>
            </div>

            {/* Security */}
            <div className="glass-card p-6">
                <h2 className="text-xl font-bold mb-6 flex items-center gap-2 text-slate-800">
                    <Lock className="text-red-500" />
                    Bảo mật
                </h2>
                <form onSubmit={handlePasswordSubmit} className="space-y-4">
                    <div>
                        <label className="label">Mật khẩu hiện tại</label>
                        <input
                            type="password"
                            value={passwordData.currentPassword}
                            onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                            className="glass-input w-full"
                        />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="label">Mật khẩu mới</label>
                            <input
                                type="password"
                                value={passwordData.newPassword}
                                onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                                className="glass-input w-full"
                            />
                        </div>
                        <div>
                            <label className="label">Xác nhận mật khẩu mới</label>
                            <input
                                type="password"
                                value={passwordData.confirmPassword}
                                onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                                className="glass-input w-full"
                            />
                        </div>
                    </div>
                    <div className="flex justify-end">
                        <button type="submit" className="bg-red-500 text-white px-6 py-2 rounded-xl font-bold shadow-lg hover:bg-red-600 transition-all flex items-center gap-2">
                            <Save size={18} /> Đổi mật khẩu
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
