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

        // Username Validation
        const usernameRegex = /^[a-zA-Z0-9.]{6,50}$/;
        if (!usernameRegex.test(username.trim())) {
            setError('Tên đăng nhập 6-50 ký tự, gồm chữ, số và dấu chấm');
            toast.error('Tên đăng nhập không hợp lệ');
            setLoading(false);
            return;
        }

        // FullName Validation
        if (fullName.length < 2 || fullName.length > 50) {
            setError('Họ tên phải từ 2-50 ký tự');
            toast.error('Họ tên không hợp lệ');
            setLoading(false);
            return;
        }

        // Password Validation
        // 8 chars, 1 upper, 1 lower, 1 number, 1 special
        const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,50}$/;
        if (!passwordRegex.test(password)) {
            setError('Mật khẩu yếu: Cần 8-50 ký tự, có chữ Hoa, thường, số và ký tự đặc biệt');
            toast.error('Mật khẩu không đạt yêu cầu');
            setLoading(false);
            return;
        }

        try {
            const res = await api.post('/auth/register', {
                username: username.trim(),
                email: email.trim(),
                password,
                fullName: fullName.trim(),
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
                        placeholder="Tên đăng nhập (a-z, 0-9, .)"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        className="glass-input w-full"
                        required
                        minLength={6}
                        maxLength={50}
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
                        placeholder="Họ và tên (2-50 ký tự)"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        className="glass-input w-full"
                        required
                        minLength={2}
                        maxLength={50}
                    />

                    <input
                        type="password"
                        placeholder="Mật khẩu (8+ ký tự, đủ mạnh)"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="glass-input w-full"
                        required
                        minLength={8}
                        maxLength={50}
                    />

                    <input
                        type="password"
                        placeholder="Xác nhận mật khẩu"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="glass-input w-full"
                        required
                        minLength={8}
                        maxLength={50}
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