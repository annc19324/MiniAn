// src/pages/Settings.tsx
import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { updateUserProfile } from '../services/api';
import api from '../services/api';
import { User, Lock, Save, LogOut } from 'lucide-react';

export default function Settings() {
    const { user, login, logout, updateUser } = useAuth();
    const [activeSection, setActiveSection] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [passwordData, setPasswordData] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
    const [formData, setFormData] = useState({
        username: user?.username || '',
        email: user?.email || '',
        fullName: user?.fullName || ''
    });

    const toggleSection = (section: string) => {
        setActiveSection(activeSection === section ? null : section);
    };

    const handleInfoSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            const data = new FormData();
            data.append('fullName', formData.fullName);
            data.append('username', formData.username);
            data.append('email', formData.email);

            const res = await updateUserProfile(data);
            updateUser(res.data.user);
            alert('Cập nhật thông tin thành công');
        } catch (error: any) {
            alert(error.response?.data?.message || 'Lỗi cập nhật');
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
        <div className="max-w-2xl mx-auto space-y-6">
            <h1 className="text-3xl font-extrabold heading-gradient mb-8">Cài đặt tài khoản</h1>

            {/* General Info Accordion */}
            <div className="glass-card overflow-hidden">
                <button
                    onClick={() => toggleSection('general')}
                    className="w-full flex items-center justify-between p-6 bg-white/50 hover:bg-white/80 transition-all text-left"
                >
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-indigo-100 text-indigo-600 rounded-lg">
                            <User size={24} />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-slate-800">Thông tin chung</h2>
                            <p className="text-sm text-slate-500">Tên, email, ảnh đại diện</p>
                        </div>
                    </div>
                    <span className={`transform transition - transform ${activeSection === 'general' ? 'rotate-180' : ''} `}>
                        ▼
                    </span>
                </button>

                {activeSection === 'general' && (
                    <div className="p-6 border-t border-slate-100 animate-slide-down">
                        <form onSubmit={handleInfoSubmit} className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="label">Tên đăng nhập</label>
                                    <input
                                        type="text"
                                        value={formData.username}
                                        onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                                        className="glass-input w-full"
                                    />
                                </div>
                                <div>
                                    <label className="label">Email</label>
                                    <input
                                        type="email"
                                        value={formData.email}
                                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                        className="glass-input w-full"
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
                )}
            </div>

            {/* Security Accordion */}
            <div className="glass-card overflow-hidden">
                <button
                    onClick={() => toggleSection('security')}
                    className="w-full flex items-center justify-between p-6 bg-white/50 hover:bg-white/80 transition-all text-left"
                >
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-red-100 text-red-500 rounded-lg">
                            <Lock size={24} />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-slate-800">Bảo mật</h2>
                            <p className="text-sm text-slate-500">Đổi mật khẩu</p>
                        </div>
                    </div>
                    <span className={`transform transition - transform ${activeSection === 'security' ? 'rotate-180' : ''} `}>
                        ▼
                    </span>
                </button>

                {activeSection === 'security' && (
                    <div className="p-6 border-t border-slate-100 animate-slide-down">
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
                )}
            </div>

            {/* Logout Section (Always visible or accordion? User requested "Logout button lost". Lets make it a button card) */}
            <button
                onClick={logout}
                className="w-full glass-card p-6 flex items-center gap-3 hover:bg-red-50 hover:border-red-200 transition-all text-left group border border-transparent"
            >
                <div className="p-2 bg-slate-100 text-slate-500 group-hover:bg-red-500 group-hover:text-white rounded-lg transition-colors">
                    <LogOut size={24} />
                </div>
                <div>
                    <h2 className="text-lg font-bold text-slate-700 group-hover:text-red-600">Đăng xuất</h2>
                    <p className="text-sm text-slate-500 group-hover:text-red-400">Đăng xuất khỏi tài khoản của bạn</p>
                </div>
            </button>
        </div>
    );
}

