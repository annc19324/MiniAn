// src/pages/LeaderboardPage.tsx
import { useState, useEffect } from 'react';
import { getLeaderboard } from '../services/api';
import { Award } from 'lucide-react';
import { Link } from 'react-router-dom';
import { getAvatarUrl } from '../utils/avatarUtils';

interface LeaderboardUser {
    id: number;
    username: string;
    fullName: string;
    avatar?: string;
    coins: number;
    isVip: boolean;
}

export default function LeaderboardPage() {
    const [users, setUsers] = useState<LeaderboardUser[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchLeaderboard = async () => {
            try {
                const res = await getLeaderboard();
                setUsers(res.data);
            } catch (error) {
                console.error("Lỗi lấy BXH");
            } finally {
                setLoading(false);
            }
        };
        fetchLeaderboard();
    }, []);

    if (loading) return <div className="text-center p-10 text-slate-400">Đang tải bảng xếp hạng...</div>;

    return (
        <div className="md:px-4 space-y-6">
            <h1 className="text-3xl font-extrabold heading-gradient flex items-center gap-3">
                <Award className="text-yellow-500" size={32} />
                Bảng Xếp Hạng
            </h1>

            <div className="glass-card overflow-hidden">
                <div className="p-4 border-b border-indigo-50 bg-indigo-50/50">
                    <p className="text-slate-600">Top những thành viên tích cực và giàu có nhất cộng đồng.</p>
                </div>

                <div className="divide-y divide-slate-100">
                    {users.map((u, index) => (
                        <div key={u.id} className="flex items-center gap-4 p-4 hover:bg-white/80 transition-colors">
                            <div className={`w-10 h-10 flex-shrink-0 flex items-center justify-center rounded-full font-black text-lg shadow-sm ${index === 0 ? 'bg-gradient-to-br from-yellow-300 to-yellow-500 text-white ring-4 ring-yellow-100' :
                                index === 1 ? 'bg-gradient-to-br from-slate-300 to-slate-400 text-white' :
                                    index === 2 ? 'bg-gradient-to-br from-amber-600 to-amber-700 text-white' :
                                        'bg-slate-100 text-slate-500'
                                }`}>
                                {index + 1}
                            </div>

                            <Link to={`/profile/${u.id}`} className="flex-shrink-0">
                                <img
                                    src={getAvatarUrl(u.avatar, u.username)}
                                    className="w-12 h-12 rounded-full border-2 border-white shadow-sm object-cover"
                                    alt="Avatar"
                                />
                            </Link>

                            <div className="flex-1 min-w-0">
                                <Link to={`/profile/${u.id}`} className="font-bold text-slate-900 text-lg hover:text-indigo-600 truncate block">
                                    {u.fullName}
                                </Link>
                                <div className="flex items-center gap-2 text-sm text-slate-500">
                                    <span>@{u.username}</span>
                                    {u.isVip && <span className="bg-yellow-100 text-yellow-700 text-[10px] px-1.5 py-0.5 rounded font-bold">VIP</span>}
                                </div>
                            </div>

                            <div className="text-right">
                                <span className="block font-black text-xl text-yellow-500">{u.coins}</span>
                                <span className="text-xs text-slate-400 font-medium uppercase">Coins</span>
                            </div>
                        </div>
                    ))}

                    {users.length === 0 && (
                        <div className="p-8 text-center text-slate-400">
                            Chưa có dữ liệu bảng xếp hạng.
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
