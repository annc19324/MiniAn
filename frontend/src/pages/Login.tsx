// src/pages/Login.tsx
import { useState } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Link, useNavigate } from 'react-router-dom';

import toast from 'react-hot-toast';

export default function Login() {
    const [emailOrUsername, setEmailOrUsername] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const { login } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            const res = await api.post('/auth/login', { emailOrUsername, password });
            login(res.data.token, res.data.user);
            toast.success('Đăng nhập thành công!');
            navigate('/');
        } catch (err: any) {
            console.error("Login failed:", err);
            const msg = err.response?.data?.message || err.message || 'Đăng nhập thất bại';
            toast.error(msg);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen auth-bg flex items-center justify-center p-4">
            <div className="glass-card w-full max-w-md p-8 animate-fade-in relative z-10">
                <div className="text-center mb-8">
                    <h1 className="text-4xl font-extrabold heading-gradient mb-2">MiniAn</h1>
                    <p className="text-slate-500 font-medium">Đăng nhập để kết nối</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-5">
                    <div>
                        <input
                            type="text"
                            placeholder="Email hoặc Tên đăng nhập"
                            value={emailOrUsername}
                            onChange={(e) => setEmailOrUsername(e.target.value)}
                            className="glass-input w-full"
                            required
                        />
                    </div>
                    <div>
                        <input
                            type="password"
                            placeholder="Mật khẩu"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="glass-input w-full"
                            required
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="glass-btn w-full flex justify-center items-center"
                    >
                        {loading ? 'Đang xử lý...' : 'Đăng nhập ngay'}
                    </button>
                </form>

                <p className="text-center mt-8 text-slate-500 text-sm">
                    Chưa có tài khoản?{' '}
                    <Link to="/register" className="text-indigo-600 font-bold hover:underline">
                        Đăng ký miễn phí
                    </Link>
                </p>
            </div>

            {/* Background Decorations */}
            <div className="fixed top-1/4 left-1/4 w-96 h-96 bg-indigo-500/20 rounded-full blur-3xl -z-0 pointer-events-none"></div>
            <div className="fixed bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl -z-0 pointer-events-none"></div>
        </div>
    );
}