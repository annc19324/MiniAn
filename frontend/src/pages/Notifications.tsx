import { useState, useEffect, useRef, useCallback } from 'react';
import { getNotifications, markRead, markAllRead } from '../services/api';
import { CheckCheck } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { vi } from 'date-fns/locale';
import { useNavigate } from 'react-router-dom';
import { getAvatarUrl } from '../utils/avatarUtils';

interface Notification {
    id: number;
    type: string;
    content: string;
    read: boolean;
    createdAt: string;
    postId?: number;
    commentId?: number;
    sender?: {
        id: number;
        username: string;
        avatar?: string;
    };
}

export default function Notifications() {
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);
    const [isFetchingMore, setIsFetchingMore] = useState(false);
    const observer = useRef<IntersectionObserver | null>(null);
    const navigate = useNavigate();

    useEffect(() => {
        fetchNotifications(page);
    }, [page]);

    const fetchNotifications = async (p: number) => {
        if (p === 1) setLoading(true); else setIsFetchingMore(true);
        try {
            const res = await getNotifications(p, 10);
            const newData = res.data;
            if (newData.length < 10) setHasMore(false);

            setNotifications(prev => {
                if (p === 1) return newData;
                // Avoid duplicates
                const existingIds = new Set(prev.map(n => n.id));
                const uniqueNew = newData.filter((n: Notification) => !existingIds.has(n.id));
                return [...prev, ...uniqueNew];
            });
        } catch (error) {
            console.error('Lỗi tải thông báo', error);
        } finally {
            setLoading(false);
            setIsFetchingMore(false);
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

    const lastNotifRef = useCallback((node: HTMLDivElement) => {
        if (loading || isFetchingMore) return;
        if (observer.current) observer.current.disconnect();
        observer.current = new IntersectionObserver(entries => {
            if (entries[0].isIntersecting && hasMore) {
                setPage(prev => prev + 1);
            }
        });
        if (node) observer.current.observe(node);
    }, [loading, isFetchingMore, hasMore]);

    if (loading && page === 1) return <div className="text-center p-10 text-slate-400">Đang tải thông báo...</div>;

    return (
        <div className="md:px-4 pb-10">
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
                {notifications.length === 0 && !loading ? (
                    <div className="glass-card text-center py-10 text-slate-400">
                        Chưa có thông báo nào.
                    </div>
                ) : (
                    notifications.map((n, index) => (
                        <div
                            key={n.id}
                            ref={index === notifications.length - 1 ? lastNotifRef : null}
                            onClick={() => {
                                if (!n.read) handleMarkRead(n.id);
                                if (n.type === 'follow' && n.sender?.id) {
                                    navigate(`/profile/${n.sender.id}`);
                                } else if (n.postId) {
                                    navigate(`/post/${n.postId}${n.commentId ? `#comment-${n.commentId}` : ''}`);
                                }
                            }}
                            className={`glass-card flex items-center gap-4 cursor-pointer hover:bg-white/90 dark:hover:bg-slate-800/90 transition-all ${!n.read ? 'border-indigo-200 bg-indigo-50/50 dark:bg-indigo-900/30' : 'opacity-75'}`}
                        >
                            <img
                                src={getAvatarUrl(n.sender?.avatar, n.sender?.username || 'System')}
                                className="w-12 h-12 rounded-full border-2 border-white dark:border-slate-700 shadow-sm flex-shrink-0"
                                alt="Sender"
                            />
                            <div className="flex-1">
                                <p className="text-slate-800 dark:text-slate-200 leading-snug">
                                    <span className="font-bold">{n.sender?.username || 'Hệ thống'}</span> {n.content.replace(n.sender?.username || '', '')}
                                </p>
                                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                                    {formatDistanceToNow(new Date(n.createdAt), { addSuffix: true, locale: vi })}
                                </p>
                            </div>
                            {!n.read && (
                                <div className="w-3 h-3 bg-red-500 rounded-full shadow-sm"></div>
                            )}
                        </div>
                    ))
                )}
                {isFetchingMore && <div className="text-center py-4 text-slate-400 text-sm">Đang tải thêm...</div>}
                {!hasMore && notifications.length > 0 && <div className="text-center py-4 text-slate-400 text-xs">Đã hiển thị hết thông báo</div>}
            </div>
        </div>
    );
}
