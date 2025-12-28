// src/pages/AdminDashboard.tsx
import { useState, useEffect } from 'react';
import { getAllUsers, updateUserStatus } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

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

    if (loading) return <div className="text-center p-10">Đang tải dữ liệu...</div>;

    return (
        <div className="md:px-4">
            <h1 className="text-3xl font-extrabold heading-gradient mb-6">Quản trị viên</h1>

            <div className="glass-card overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm text-slate-600">
                        <thead className="bg-indigo-50 border-b border-indigo-100 uppercase font-bold text-indigo-700">
                            <tr>
                                <th className="p-4">User</th>
                                <th className="p-4">Email</th>
                                <th className="p-4">Coins</th>
                                <th className="p-4">Role</th>
                                <th className="p-4">VIP</th>
                                <th className="p-4">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {users.map((u) => (
                                <tr key={u.id} className="hover:bg-slate-50 transition-colors">
                                    <td className="p-4 font-medium text-slate-800">{u.username}</td>
                                    <td className="p-4">{u.email}</td>
                                    <td className="p-4 font-bold text-yellow-500">{u.coins}</td>
                                    <td className="p-4">
                                        <select
                                            value={u.role}
                                            onChange={(e) => handleRoleChange(u.id, e.target.value)}
                                            className="bg-white border border-slate-200 text-slate-700 text-xs rounded-lg p-2 focus:ring-2 focus:ring-indigo-500 outline-none"
                                        >
                                            <option value="USER">USER</option>
                                            <option value="ADMIN">ADMIN</option>
                                        </select>
                                    </td>
                                    <td className="p-4">
                                        <button
                                            onClick={() => handleVipToggle(u.id, u.isVip)}
                                            className={`px-3 py-1 rounded-full text-xs font-bold ${u.isVip ? 'bg-gradient-to-r from-yellow-400 to-orange-500 text-white shadow-md' : 'bg-slate-100 text-slate-400'}`}
                                        >
                                            {u.isVip ? 'VIP' : 'Normal'}
                                        </button>
                                    </td>
                                    <td className="p-4">
                                        <button
                                            onClick={() => handleActiveToggle(u.id, u.isActive)}
                                            className={`w-8 h-4 rounded-full relative transition-colors ${u.isActive ? 'bg-green-500' : 'bg-red-500'}`}
                                        >
                                            <span className={`absolute top-0.5 w-3 h-3 bg-white rounded-full transition-transform ${u.isActive ? 'left-4.5' : 'left-0.5'}`}></span>
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
