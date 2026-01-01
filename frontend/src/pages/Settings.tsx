import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { updateUserProfile } from '../services/api';
import api from '../services/api';
import { User, Lock, Save, LogOut, Moon, Bell, Volume2 } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { requestNotificationPermission } from '../utils/notificationUtils';

export default function Settings() {
    const { user, logout, updateUser } = useAuth();
    const { theme, setTheme } = useTheme();

    const [activeSection, setActiveSection] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [passwordData, setPasswordData] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
    const [formData, setFormData] = useState({
        username: user?.username || '',
        email: user?.email || '',
        fullName: user?.fullName || ''
    });
    const [notificationPermission, setNotificationPermission] = useState(Notification.permission);
    const [soundEnabled, setSoundEnabled] = useState(() => localStorage.getItem('notificationSound') !== 'false');

    const toggleSection = (section: string) => {
        setActiveSection(activeSection === section ? null : section);
    };

    const toggleSound = () => {
        const newState = !soundEnabled;
        setSoundEnabled(newState);
        localStorage.setItem('notificationSound', String(newState));
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
            // @ts-ignore
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

    const handleEnableNotifications = async () => {
        const granted = await requestNotificationPermission();
        setNotificationPermission(granted ? 'granted' : 'denied');
        if (granted) alert("Đã bật thông báo hệ thống!");
        else alert("Bạn đã từ chối quyền thông báo. Vui lòng bật lại trong cài đặt trình duyệt.");
    };

    return (
        <div className="max-w-2xl mx-auto space-y-6">
            <h1 className="text-3xl font-extrabold heading-gradient mb-8">Cài đặt tài khoản</h1>

            {/* Admin Section (Only for Admin) */}
            {user?.role === 'ADMIN' && (
                <div className="glass-card overflow-hidden">
                    <button
                        onClick={() => toggleSection('admin')}
                        className="w-full flex items-center justify-between p-6 bg-white/50 hover:bg-white/80 dark:bg-slate-800/50 dark:hover:bg-slate-700/50 transition-all text-left"
                    >
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-purple-100 text-purple-600 rounded-lg dark:bg-purple-900/30 dark:text-purple-400">
                                <Lock size={24} />
                            </div>
                            <div>
                                <h2 className="text-lg font-bold text-slate-800 dark:text-white">Quản trị viên</h2>
                                <p className="text-sm text-slate-500 dark:text-slate-400">Quản lý người dùng & hệ thống</p>
                            </div>
                        </div>
                        <span className={`transform transition-transform text-slate-500 dark:text-slate-400 ${activeSection === 'admin' ? 'rotate-180' : ''}`}>
                            ▼
                        </span>
                    </button>

                    {activeSection === 'admin' && (
                        <div className="p-6 border-t border-slate-100 dark:border-slate-700 animate-slide-down">
                            <p className="text-slate-600 dark:text-slate-300 mb-4">Truy cập bảng điều khiển quản trị để quản lý người dùng, bài viết và thống kê hệ thống.</p>
                            <button
                                onClick={() => window.location.href = '/admin'}
                                className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 text-white px-6 py-3 rounded-xl font-bold shadow-lg hover:shadow-xl hover:scale-[1.02] transition-all flex items-center justify-center gap-2"
                            >
                                <Lock size={20} />
                                Truy cập Admin Dashboard
                            </button>
                        </div>
                    )}
                </div>
            )}

            {/* General Info Accordion */}
            <div className="glass-card overflow-hidden">
                <button
                    onClick={() => toggleSection('general')}
                    className="w-full flex items-center justify-between p-6 bg-white/50 hover:bg-white/80 dark:bg-slate-800/50 dark:hover:bg-slate-700/50 transition-all text-left"
                >
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-indigo-100 text-indigo-600 rounded-lg dark:bg-indigo-900/30 dark:text-indigo-400">
                            <User size={24} />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-slate-800 dark:text-white">Thông tin chung</h2>
                            <p className="text-sm text-slate-500 dark:text-slate-400">Tên, email, ảnh đại diện</p>
                        </div>
                    </div>
                    <span className={`transform transition-transform text-slate-500 dark:text-slate-400 ${activeSection === 'general' ? 'rotate-180' : ''}`}>
                        ▼
                    </span>
                </button>

                {activeSection === 'general' && (
                    <div className="p-6 border-t border-slate-100 dark:border-slate-700 animate-slide-down">
                        <form onSubmit={handleInfoSubmit} className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="label dark:text-slate-300">Tên đăng nhập</label>
                                    <input
                                        type="text"
                                        value={formData.username}
                                        onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                                        className="glass-input w-full"
                                    />
                                </div>
                                <div>
                                    <label className="label dark:text-slate-300">Email</label>
                                    <input
                                        type="email"
                                        value={formData.email}
                                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                        className="glass-input w-full"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="label dark:text-slate-300">Họ và tên</label>
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

            {/* Notification Accordion */}
            <div className="glass-card overflow-hidden">
                <button
                    onClick={() => toggleSection('notifications')}
                    className="w-full flex items-center justify-between p-6 bg-white/50 hover:bg-white/80 dark:bg-slate-800/50 dark:hover:bg-slate-700/50 transition-all text-left"
                >
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-pink-100 text-pink-600 rounded-lg dark:bg-pink-900/30 dark:text-pink-400">
                            <Bell size={24} />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-slate-800 dark:text-white">Thông báo</h2>
                            <p className="text-sm text-slate-500 dark:text-slate-400">Âm thanh & Thông báo đẩy</p>
                        </div>
                    </div>
                    <span className={`transform transition-transform text-slate-500 dark:text-slate-400 ${activeSection === 'notifications' ? 'rotate-180' : ''}`}>
                        ▼
                    </span>
                </button>

                {activeSection === 'notifications' && (
                    <div className="p-6 border-t border-slate-100 dark:border-slate-700 animate-slide-down space-y-6">
                        {/* Browser Notifications */}
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="font-medium text-slate-800 dark:text-white">Thông báo đẩy</p>
                                <p className="text-sm text-slate-500 dark:text-slate-400">Nhận thông báo khi có tin nhắn hoặc tương tác mới.</p>
                            </div>
                            <button
                                onClick={handleEnableNotifications}
                                disabled={notificationPermission === 'granted'}
                                className={`px-4 py-2 rounded-lg font-bold transition-all ${notificationPermission === 'granted' ? 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400' : 'bg-indigo-600 text-white hover:bg-indigo-700'}`}
                            >
                                {notificationPermission === 'granted' ? 'Đã bật' : 'Bật ngay'}
                            </button>
                        </div>

                        {/* Sound Toggle */}
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-slate-100 text-slate-600 rounded-lg dark:bg-slate-800 dark:text-slate-400">
                                    <Volume2 size={20} />
                                </div>
                                <div>
                                    <p className="font-medium text-slate-800 dark:text-white">Âm thanh thông báo</p>
                                    <p className="text-sm text-slate-500 dark:text-slate-400">Phát âm thanh khi có thông báo mới</p>
                                </div>
                            </div>
                            <button
                                onClick={toggleSound}
                                className={`relative w-14 h-7 rounded-full transition-colors duration-300 ${soundEnabled ? 'bg-indigo-600' : 'bg-slate-300'}`}
                            >
                                <div className={`absolute left-1 top-1 w-5 h-5 bg-white rounded-full shadow-sm transition-transform duration-300 ${soundEnabled ? 'translate-x-7' : 'translate-x-0'}`}></div>
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Security Accordion */}
            <div className="glass-card overflow-hidden">
                <button
                    onClick={() => toggleSection('security')}
                    className="w-full flex items-center justify-between p-6 bg-white/50 hover:bg-white/80 dark:bg-slate-800/50 dark:hover:bg-slate-700/50 transition-all text-left"
                >
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-red-100 text-red-500 rounded-lg dark:bg-red-900/30 dark:text-red-400">
                            <Lock size={24} />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-slate-800 dark:text-white">Bảo mật</h2>
                            <p className="text-sm text-slate-500 dark:text-slate-400">Đổi mật khẩu</p>
                        </div>
                    </div>
                    <span className={`transform transition-transform text-slate-500 dark:text-slate-400 ${activeSection === 'security' ? 'rotate-180' : ''}`}>
                        ▼
                    </span>
                </button>

                {activeSection === 'security' && (
                    <div className="p-6 border-t border-slate-100 dark:border-slate-700 animate-slide-down">
                        <form onSubmit={handlePasswordSubmit} className="space-y-4">
                            <div>
                                <label className="label dark:text-slate-300">Mật khẩu hiện tại</label>
                                <input
                                    type="password"
                                    value={passwordData.currentPassword}
                                    onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                                    className="glass-input w-full"
                                />
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="label dark:text-slate-300">Mật khẩu mới</label>
                                    <input
                                        type="password"
                                        value={passwordData.newPassword}
                                        onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                                        className="glass-input w-full"
                                    />
                                </div>
                                <div>
                                    <label className="label dark:text-slate-300">Xác nhận mật khẩu mới</label>
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

            {/* Appearance Accordion */}
            <div className="glass-card overflow-hidden">
                <button
                    onClick={() => toggleSection('appearance')}
                    className="w-full flex items-center justify-between p-6 bg-white/50 hover:bg-white/80 dark:bg-slate-800/50 dark:hover:bg-slate-700/50 transition-all text-left"
                >
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-yellow-100 text-yellow-600 rounded-lg dark:bg-yellow-900/30 dark:text-yellow-400">
                            <Moon size={24} />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-slate-800 dark:text-white">Giao diện</h2>
                            <p className="text-sm text-slate-500 dark:text-slate-400">Chế độ sáng / tối</p>
                        </div>
                    </div>
                    <span className={`transform transition-transform text-slate-500 dark:text-slate-400 ${activeSection === 'appearance' ? 'rotate-180' : ''}`}>
                        ▼
                    </span>
                </button>

                {activeSection === 'appearance' && (
                    <div className="p-6 border-t border-slate-100 dark:border-slate-700 animate-slide-down">
                        <div className="flex items-center justify-between">
                            <span className="font-medium text-slate-700 dark:text-slate-300">Chế độ tối</span>
                            <button
                                onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                                className={`relative w-14 h-7 rounded-full transition-colors duration-300 ${theme === 'dark' ? 'bg-indigo-600' : 'bg-slate-300'}`}
                            >
                                <div className={`absolute left-1 top-1 w-5 h-5 bg-white rounded-full shadow-sm transition-transform duration-300 ${theme === 'dark' ? 'translate-x-7' : 'translate-x-0'}`}></div>
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Logout Section */}
            <button
                onClick={logout}
                className="w-full glass-card p-6 flex items-center gap-3 hover:bg-red-50 dark:hover:bg-red-900/20 hover:border-red-200 dark:hover:border-red-800 transition-all text-left group border border-transparent"
            >
                <div className="p-2 bg-slate-100 text-slate-500 group-hover:bg-red-500 group-hover:text-white rounded-lg transition-colors dark:bg-slate-700 dark:text-slate-300">
                    <LogOut size={24} />
                </div>
                <div>
                    <h2 className="text-lg font-bold text-slate-700 dark:text-slate-200 group-hover:text-red-600 dark:group-hover:text-red-400">Đăng xuất</h2>
                    <p className="text-sm text-slate-500 dark:text-slate-400 group-hover:text-red-400">Đăng xuất khỏi tài khoản của bạn</p>
                </div>
            </button>
        </div>
    );
}

