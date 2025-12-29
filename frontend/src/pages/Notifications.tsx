import { useState, useEffect } from 'react';
import { getNotifications, markRead, markAllRead } from '../services/api';
import { CheckCheck } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { vi } from 'date-fns/locale';
import { useNavigate } from 'react-router-dom';

interface Notification {
    id: number;
    type: string;
    content: string;
    read: boolean;
    createdAt: string;
    postId?: number;
    sender?: {
        id: number;
        username: string;
        avatar?: string;
    };
}

export default function Notifications() {
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        fetchNotifications();
    }, []);

    const fetchNotifications = async () => {
        try {
            const res = await getNotifications();
            setNotifications(res.data);
        } catch (error) {
            console.error('Lỗi tải thông báo', error);
        } finally {
            setLoading(false);
        }
    };

    const handleMarkRead = async (id: number) => {
        try {
            await markRead(id);
            setNotifications(notifications.map(n => n.id === id ? { ...n, read: true } : n));
        } catch (error) {
            console.error('Lỗi', error);
        }
    };

    const handleMarkAllRead = async () => {
        try {
            await markAllRead();
            setNotifications(notifications.map(n => ({ ...n, read: true })));
        } catch (error) {
            console.error('Lỗi', error);
        }
    };

    if (loading) return <div className="text-center p-10 text-slate-400">Đang tải thông báo...</div>;

    return (
        <div className="md:px-4">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-extrabold heading-gradient">Thông báo</h1>
                <button
                    onClick={handleMarkAllRead}
                    className="flex items-center gap-2 text-sm font-bold text-indigo-600 hover:bg-indigo-50 px-3 py-2 rounded-lg transition-colors"
                >
                    <CheckCheck size={18} />
                    <span>Đọc tất cả</span>
                </button>
            </div>

            <div className="space-y-3">
                {notifications.length === 0 ? (
                    <div className="glass-card text-center py-10 text-slate-400">
                        Chưa có thông báo nào.
                    </div>
                ) : (
                    notifications.map((n) => (
                        <div
                            key={n.id}
                            onClick={() => {
                                if (!n.read) handleMarkRead(n.id);
                                if (n.postId) navigate(`/post/${n.postId}`);
                            }}
                            className={`glass-card flex items-center gap-4 cursor-pointer hover:bg-white/90 transition-all ${!n.read ? 'border-indigo-200 bg-indigo-50/50' : 'opacity-75'}`}
                        >
                            <img
                                src={n.sender?.avatar || `https://ui-avatars.com/api/?name=${n.sender?.username || 'System'}&background=random`}
                                className="w-12 h-12 rounded-full border-2 border-white shadow-sm flex-shrink-0"
                                alt="Sender"
                            />
                            <div className="flex-1">
                                <p className="text-slate-800 leading-snug">
                                    <span className="font-bold">{n.sender?.username || 'Hệ thống'}</span> {n.content.replace(n.sender?.username || '', '')}
                                </p>
                                <p className="text-xs text-slate-500 mt-1">
                                    {formatDistanceToNow(new Date(n.createdAt), { addSuffix: true, locale: vi })}
                                </p>
                            </div>
                            {!n.read && (
                                <div className="w-3 h-3 bg-red-500 rounded-full shadow-sm"></div>
                            )}
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
