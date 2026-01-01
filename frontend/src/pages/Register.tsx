import { useState } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

export default function Register() {
    const [username, setUsername] = useState('');
    const [email, setEmail] = useState('');
    const [fullName, setFullName] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const { login } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        if (password !== confirmPassword) {
            setError('Mật khẩu xác nhận không khớp!');
            toast.error('Mật khẩu xác nhận không khớp!');
            setLoading(false);
            return;
        }

        if (password.length < 6) {
            setError('Mật khẩu phải ít nhất 6 ký tự');
            toast.error('Mật khẩu phải ít nhất 6 ký tự');
            setLoading(false);
            return;
        }

        try {
            const res = await api.post('/auth/register', {
                username,
                email,
                password,
                fullName,
            });

            login(res.data.token, res.data.user);
            toast.success('Đăng ký thành công! Chào mừng bạn.');
            navigate('/');
        } catch (err: any) {
            const msg = err.response?.data?.message || 'Đăng ký thất bại, vui lòng thử lại';
            setError(msg);
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
                    <p className="text-slate-500 font-medium">Tạo tài khoản mới</p>
                </div>

                {error && (
                    <div className="bg-red-50 text-red-600 px-4 py-3 rounded-xl mb-6 text-sm flex items-center gap-2 border border-red-100">
                        <span className="font-bold">⚠️</span> {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                    <input
                        type="text"
                        placeholder="Tên đăng nhập (username)"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        className="glass-input w-full"
                        required
                        minLength={3}
                    />

                    <input
                        type="email"
                        placeholder="Email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="glass-input w-full"
                        required
                    />

                    <input
                        type="text"
                        placeholder="Họ và tên"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        className="glass-input w-full"
                        required
                    />

                    <input
                        type="password"
                        placeholder="Mật khẩu (ít nhất 6 ký tự)"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="glass-input w-full"
                        required
                        minLength={6}
                    />

                    <input
                        type="password"
                        placeholder="Xác nhận mật khẩu"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="glass-input w-full"
                        required
                    />

                    <button
                        type="submit"
                        disabled={loading}
                        className="glass-btn w-full flex justify-center items-center mt-4"
                    >
                        {loading ? 'Đang tạo...' : 'Đăng ký ngay'}
                    </button>
                </form>

                <p className="text-center mt-8 text-slate-500 text-sm">
                    Đã có tài khoản?{' '}
                    <Link to="/login" className="text-indigo-600 font-bold hover:underline">
                        Đăng nhập ngay
                    </Link>
                </p>
            </div>

            {/* Background Decorations */}
            <div className="fixed top-1/4 left-1/4 w-96 h-96 bg-indigo-500/20 rounded-full blur-3xl -z-0 pointer-events-none"></div>
            <div className="fixed bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl -z-0 pointer-events-none"></div>
        </div>
    );
}