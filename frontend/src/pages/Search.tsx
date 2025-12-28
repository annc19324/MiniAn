// src/pages/Search.tsx
import { useState, useEffect } from 'react';
import { searchUsers, followUser } from '../services/api';
import { useSearchParams, Link } from 'react-router-dom';
import { Search as SearchIcon, UserPlus, UserCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface User {
    id: number;
    username: string;
    fullName: string;
    avatar?: string;
    isVip: boolean;
    isFollowing?: boolean;
    // API search chưa trả về isFollowing, ta có thể xử lý ở backend hoặc client.
    // Để đơn giản, chức năng search hiện tại chưa check follow status.
    // Ta sẽ implement call follow và update UI state.
}

export default function Search() {
    const [searchParams, setSearchParams] = useSearchParams();
    const query = searchParams.get('q') || '';
    const [results, setResults] = useState<User[]>([]);
    const [loading, setLoading] = useState(false);
    const { user: currentUser } = useAuth();

    // Debounce search could be better, but simple effect is fine for now
    useEffect(() => {
        if (query) {
            handleSearch(query);
        }
    }, [query]);

    const handleSearch = async (q: string) => {
        setLoading(true);
        try {
            const res = await searchUsers(q);
            setResults(res.data);
        } catch (error) {
            console.error('Lỗi tìm kiếm');
        } finally {
            setLoading(false);
        }
    };

    const handleFollow = async (id: number) => {
        try {
            const res = await followUser(id);
            alert(res.data.message);
            // Cập nhật UI (nếu cần thiết, tuy nhiên search result không giữ status follow)
        } catch (error: any) {
            alert(error.response?.data?.message || 'Lỗi follow');
        }
    };

    return (
        <div className="md:px-4">
            <h1 className="text-3xl font-extrabold heading-gradient mb-6">Tìm kiếm</h1>

            <div className="glass-card p-4 mb-6 flex items-center gap-2">
                <SearchIcon className="text-slate-400" />
                <input
                    type="text"
                    value={query}
                    onChange={(e) => setSearchParams({ q: e.target.value })}
                    placeholder="Tìm người dùng..."
                    className="bg-transparent border-none outline-none w-full text-slate-700 font-medium placeholder:text-slate-300"
                    autoFocus
                />
            </div>

            {loading ? (
                <div className="text-center text-slate-400">Đang tìm...</div>
            ) : results.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {results.map((u) => (
                        <div key={u.id} className="glass-card flex items-center justify-between">
                            <Link to={`/profile/${u.id}`} className="flex items-center gap-3">
                                <img src={u.avatar || `https://ui-avatars.com/api/?name=${u.username}&background=random`} className="w-12 h-12 rounded-full border-2 border-white shadow-sm" alt="Avatar" />
                                <div>
                                    <h3 className="font-bold text-slate-800 flex items-center gap-1">
                                        {u.fullName}
                                        {u.isVip && <span className="text-yellow-500 text-xs">👑</span>}
                                    </h3>
                                    <p className="text-xs text-slate-500">@{u.username}</p>
                                </div>
                            </Link>

                            {u.id !== currentUser?.id && (
                                <button
                                    onClick={() => handleFollow(u.id)}
                                    className="p-2 bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-100 transition-colors"
                                >
                                    <UserPlus size={20} />
                                </button>
                            )}
                        </div>
                    ))}
                </div>
            ) : query ? (
                <div className="text-center text-slate-400">Không tìm thấy kết quả nào.</div>
            ) : (
                <div className="text-center text-slate-400">Nhập tên người dùng để tìm kiếm.</div>
            )}
        </div>
    );
}
