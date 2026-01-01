// src/pages/AdminDashboard.tsx
import { useState, useEffect } from 'react';
import { getAllUsers, updateUserStatus, updateUserCoins } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Search, Users, Shield, Crown, Coins } from 'lucide-react';

interface User {
    id: number;
    username: string;
    email: string;
    fullName: string;
    role: string;
    isVip: boolean;
    isActive: boolean;
    coins: number;
}

export default function AdminDashboard() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        if (user && user.role !== 'ADMIN') {
            navigate('/');
            return;
        }

        const fetchData = async () => {
            try {
                const res = await getAllUsers();
                setUsers(res.data);
            } catch (error) {
                console.error("Lỗi tải users", error);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [user, navigate]);

    const handleRoleChange = async (id: number, newRole: string) => {
        try {
            await updateUserStatus(id, { role: newRole });
            setUsers(users.map(u => u.id === id ? { ...u, role: newRole } : u));
        } catch (error) {
            alert('Lỗi cập nhật role');
        }
    };

    const handleVipToggle = async (id: number, currentVip: boolean) => {
        try {
            await updateUserStatus(id, { isVip: !currentVip });
            setUsers(users.map(u => u.id === id ? { ...u, isVip: !currentVip } : u));
        } catch (error) {
            alert('Lỗi cập nhật VIP');
        }
    };

    const handleActiveToggle = async (id: number, currentActive: boolean) => {
        try {
            await updateUserStatus(id, { isActive: !currentActive });
            setUsers(users.map(u => u.id === id ? { ...u, isActive: !currentActive } : u));
        } catch (error) {
            alert('Lỗi cập nhật trạng thái');
        }
    };

    const handleCoinUpdate = async (id: number, type: 'add' | 'subtract') => {
        const amountStr = prompt(type === 'add' ? 'Nhập số coin muốn cộng:' : 'Nhập số coin muốn trừ:');
        if (!amountStr) return;

        let amount = parseInt(amountStr);
        if (isNaN(amount) || amount <= 0) {
            alert('Vui lòng nhập số hợp lệ');
            return;
        }

        if (type === 'subtract') amount = -amount;

        try {
            const res = await updateUserCoins(id, amount);
            // @ts-ignore
            setUsers(users.map(u => u.id === id ? { ...u, coins: res.data.coins } : u));
            alert('Cập nhật coin thành công');
        } catch (error) {
            alert('Lỗi cập nhật coin');
        }
    };

    const filteredUsers = users.filter(u =>
        u.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (u.fullName && u.fullName.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    const stats = {
        total: users.length,
        active: users.filter(u => u.isActive).length,
        vip: users.filter(u => u.isVip).length,
        admins: users.filter(u => u.role === 'ADMIN').length
    };

    if (loading) return <div className="text-center p-10">Đang tải dữ liệu...</div>;

    return (
        <div className="md:px-4 space-y-6">
            <h1 className="text-3xl font-extrabold heading-gradient">Quản trị viên</h1>

            {/* Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="glass-card p-4 flex items-center gap-3">
                    <div className="p-3 bg-blue-100 text-blue-600 rounded-xl">
                        <Users size={24} />
                    </div>
                    <div>
                        <p className="text-sm text-slate-500 font-medium">Tổng User</p>
                        <p className="text-2xl font-bold text-slate-800">{stats.total}</p>
                    </div>
                </div>
                <div className="glass-card p-4 flex items-center gap-3">
                    <div className="p-3 bg-green-100 text-green-600 rounded-xl">
                        <Users size={24} />
                    </div>
                    <div>
                        <p className="text-sm text-slate-500 font-medium">Hoạt động</p>
                        <p className="text-2xl font-bold text-slate-800">{stats.active}</p>
                    </div>
                </div>
                <div className="glass-card p-4 flex items-center gap-3">
                    <div className="p-3 bg-yellow-100 text-yellow-600 rounded-xl">
                        <Crown size={24} />
                    </div>
                    <div>
                        <p className="text-sm text-slate-500 font-medium">VIP</p>
                        <p className="text-2xl font-bold text-slate-800">{stats.vip}</p>
                    </div>
                </div>
                <div className="glass-card p-4 flex items-center gap-3">
                    <div className="p-3 bg-purple-100 text-purple-600 rounded-xl">
                        <Shield size={24} />
                    </div>
                    <div>
                        <p className="text-sm text-slate-500 font-medium">Admin</p>
                        <p className="text-2xl font-bold text-slate-800">{stats.admins}</p>
                    </div>
                </div>
            </div>

            {/* Search & Actions */}
            <div className="glass-card p-4 flex flex-col md:flex-row gap-4 justify-between items-center">
                <div className="relative w-full md:w-96">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input
                        type="text"
                        placeholder="Tìm kiếm người dùng..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 bg-slate-50 border-none rounded-xl focus:ring-2 focus:ring-indigo-200 outline-none transition-all"
                    />
                </div>
                {/* Future actions like 'Export User' or 'Add User' can go here */}
            </div>

            <div className="glass-card overflow-hidden">
                <div className="p-4 border-b border-slate-100">
                    <h2 className="font-bold text-lg text-slate-800">Danh sách người dùng</h2>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm text-slate-600">
                        <thead className="bg-slate-50 border-b border-slate-100 uppercase font-bold text-xs text-slate-500">
                            <tr>
                                <th className="p-4">User</th>
                                <th className="p-4">Thông tin</th>
                                <th className="p-4">Coins</th>
                                <th className="p-4">Vai trò</th>
                                <th className="p-4">Trạng thái</th>
                                <th className="p-4">Hành động</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {filteredUsers.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="p-8 text-center text-slate-400">Không tìm thấy kết quả</td>
                                </tr>
                            ) : (
                                filteredUsers.map((u) => (
                                    <tr key={u.id} className="hover:bg-slate-50/50 transition-colors">
                                        <td className="p-4">
                                            <div className="font-bold text-slate-800">{u.username}</div>
                                            <div className="text-xs text-slate-400">ID: {u.id}</div>
                                        </td>
                                        <td className="p-4">
                                            <div className="font-medium">{u.fullName}</div>
                                            <div className="text-xs text-slate-400">{u.email}</div>
                                        </td>
                                        <td className="p-4 font-bold text-slate-700">
                                            <div className="flex items-center gap-2">
                                                <span>{u.coins}</span> <Coins size={14} className="text-yellow-500" />
                                                <div className="flex flex-col gap-1 ml-2">
                                                    <button onClick={() => handleCoinUpdate(u.id, 'add')} className="px-1.5 bg-green-100 hover:bg-green-200 text-green-700 rounded text-[10px] font-bold">+</button>
                                                    <button onClick={() => handleCoinUpdate(u.id, 'subtract')} className="px-1.5 bg-red-100 hover:bg-red-200 text-red-700 rounded text-[10px] font-bold">-</button>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="p-4">
                                            <select
                                                value={u.role}
                                                onChange={(e) => handleRoleChange(u.id, e.target.value)}
                                                className={`border-none text-xs rounded-lg p-1.5 font-bold focus:ring-2 focus:ring-indigo-100 outline-none cursor-pointer ${u.role === 'ADMIN' ? 'bg-purple-100 text-purple-700' : 'bg-slate-100 text-slate-600'}`}
                                            >
                                                <option value="USER">Member</option>
                                                <option value="ADMIN">Admin</option>
                                            </select>
                                        </td>
                                        <td className="p-4">
                                            <div className="flex flex-col gap-2 items-start">
                                                <button
                                                    onClick={() => handleVipToggle(u.id, u.isVip)}
                                                    className={`px-2 py-0.5 rounded text-[10px] font-bold border transition-all ${u.isVip ? 'bg-yellow-100 text-yellow-700 border-yellow-200' : 'bg-white text-slate-400 border-slate-200 hover:border-yellow-300'}`}
                                                >
                                                    {u.isVip ? 'VIP Member' : 'Set VIP'}
                                                </button>
                                            </div>
                                        </td>
                                        <td className="p-4">
                                            <button
                                                onClick={() => handleActiveToggle(u.id, u.isActive)}
                                                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${u.isActive ? 'bg-green-100 text-green-700 hover:bg-green-200' : 'bg-red-100 text-red-700 hover:bg-red-200'}`}
                                            >
                                                {u.isActive ? 'Active' : 'Banned'}
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
