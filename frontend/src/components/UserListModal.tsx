import { X } from 'lucide-react';
import { Link } from 'react-router-dom';
import { getAvatarUrl } from '../utils/avatarUtils';

interface User {
    id: number;
    username: string;
    fullName: string;
    avatar?: string;
    isVip?: boolean;
}

interface UserListModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    users: User[];
    loading?: boolean;
}

export default function UserListModal({ isOpen, onClose, title, users, loading }: UserListModalProps) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in" onClick={onClose}>
            <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-2xl shadow-2xl border border-indigo-50 dark:border-slate-800 flex flex-col max-h-[80vh]" onClick={e => e.stopPropagation()}>
                <div className="p-4 border-b border-indigo-50 dark:border-slate-800 flex justify-between items-center">
                    <h2 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-purple-600 dark:from-indigo-400 dark:to-purple-400">
                        {title}
                    </h2>
                    <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors text-slate-500">
                        <X size={20} />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-2 space-y-2">
                    {loading ? (
                        <div className="text-center p-8 text-slate-400">Đang tải...</div>
                    ) : users.length === 0 ? (
                        <div className="text-center p-8 text-slate-400">Không có ai.</div>
                    ) : (
                        users.map(u => (
                            <Link key={u.id} to={`/profile/${u.id}`} onClick={onClose} className="flex items-center gap-3 p-3 hover:bg-indigo-50/50 dark:hover:bg-slate-800/50 rounded-xl transition-all group">
                                <img src={getAvatarUrl(u.avatar, u.username)} className="w-10 h-10 rounded-full border border-white dark:border-slate-700 shadow-sm" alt="Avatar" />
                                <div className="flex-1">
                                    <h3 className="font-bold text-slate-800 dark:text-slate-200 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                                        {u.fullName}
                                    </h3>
                                    <p className="text-xs text-slate-500 dark:text-slate-400">@{u.username}</p>
                                </div>
                            </Link>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}
