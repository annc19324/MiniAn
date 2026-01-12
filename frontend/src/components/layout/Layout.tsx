import { useNavigate, useLocation, Outlet, NavLink } from 'react-router-dom';
import { Home, Search, MessageCircle, Bell, User, LogOut, Award, Settings, ArrowLeft, Trophy } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { getAvatarUrl } from '../../utils/avatarUtils';

import { useState, useEffect, useRef } from 'react';
import { getLeaderboard } from '../../services/api';
import { io } from 'socket.io-client';
import toast from 'react-hot-toast';
import { getConversations } from '../../services/api';
import { sendSystemNotification, playNotificationSound } from '../../utils/notificationUtils';
import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';
import PullToRefresh from 'react-simple-pull-to-refresh';

export default function Layout() {
    const { logout, user } = useAuth();
    const [leaderboard, setLeaderboard] = useState<any[]>([]);
    const [hasMore, setHasMore] = useState(true);
    const [unreadMessagesCount, setUnreadMessagesCount] = useState(0);
    const [unreadNotificationsCount, setUnreadNotificationsCount] = useState(0);
    const navigate = useNavigate();
    const location = useLocation();
    const isChatPage = location.pathname === '/chat';
    const contentRef = useRef<HTMLDivElement>(null);

    // Auto-focus on route change to enable immediate scrolling without initial click
    useEffect(() => {
        if (contentRef.current) {
            contentRef.current.focus();
        }
    }, [location.pathname]);

    // Expose navigate for notification clicks
    useEffect(() => {
        (window as any).routerNavigate = navigate;
    }, [navigate]);

    const fetchLeaderboard = async () => {
        try {
            const res = await getLeaderboard(10, 0);
            setLeaderboard(res.data);
            if (res.data.length < 10) setHasMore(false);
        } catch (error) {
            console.error("Lỗi lấy BXH");
        }
    };

    const loadMoreLeaderboard = async () => {
        try {
            const res = await getLeaderboard(10, leaderboard.length);
            if (res.data && res.data.length > 0) {
                setLeaderboard(prev => [...prev, ...res.data]);
                if (res.data.length < 10) setHasMore(false);
            } else {
                setHasMore(false);
            }
        } catch (error) {
            console.error("Lỗi tải thêm BXH");
        }
    };

    useEffect(() => {
        fetchLeaderboard();
        if (Capacitor.isNativePlatform()) {
            LocalNotifications.requestPermissions();
        }
    }, []);

    useEffect(() => {
        if (!user) return;
        const socket = io(import.meta.env.VITE_SOCKET_URL);

        socket.on('connect', () => {
            socket.emit('user_connected', user.id);
            socket.emit('join_room', user.id);
        });

        socket.on('receive_message', (data) => {
            const senderId = data.messageData.sender?._id || data.messageData.sender?.id;
            if (senderId === user?.id) return;

            const soundEnabled = localStorage.getItem('notificationSound') !== 'false';
            if (soundEnabled) {
                playNotificationSound();
            }

            sendSystemNotification(
                `Tin nhắn mới từ ${data.messageData.sender.username}`,
                data.messageData.content,
                undefined,
                { url: '/chat' }
            );

            const isChatPage = window.location.pathname === '/chat';
            const isHidden = document.hidden;
            if (!isChatPage || isHidden) {
                toast(`💬 ${data.messageData.sender.username}: ${data.messageData.content}`, {
                    icon: '📩',
                    style: { borderRadius: '10px', background: '#333', color: '#fff' },
                });
            }
        });

        socket.on('notification_count_update', (data) => {
            if (data.userId === user.id) {
                setUnreadNotificationsCount(data.count);
            }
        });

        socket.on('unread_count_update', (data) => {
            setUnreadMessagesCount(data.totalUnread);
        });

        const fetchCounts = async () => {
            try {
                const res = await getConversations();
                const total = res.data.reduce((acc: number, c: any) => acc + (c.unreadCount || 0), 0);
                setUnreadMessagesCount(total);

                const notifRes = await (await import('../../services/api')).getUnreadNotificationsCount();
                setUnreadNotificationsCount(notifRes.data.count);
            } catch (error) {
                console.error("Error fetching counts", error);
            }
        };
        fetchCounts();

        return () => {
            socket.disconnect();
        };
    }, [user, location.pathname]);

    return (
        <div className="flex flex-col lg:flex-row min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans selection:bg-indigo-100 dark:selection:bg-indigo-900/40">
            {/* Desktop Left Sidebar: Menu */}
            <aside className="hidden lg:flex flex-col w-64 xl:w-72 h-screen sticky top-0 bg-white dark:bg-slate-900 border-r border-indigo-50 dark:border-slate-800 z-30 shadow-sm">
                <div className="p-6">
                    <h1 className="text-2xl font-black bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent tracking-tighter uppercase transition-all hover:scale-105 cursor-default">
                        MiniAn
                    </h1>
                </div>

                <nav className="flex-1 px-4 py-4 space-y-1.5 overflow-y-auto no-scrollbar">
                    <NavLink to="/" className={({ isActive }) => `flex items-center gap-4 px-4 py-3.5 rounded-2xl transition-all group ${isActive ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200 dark:shadow-none translate-x-1' : 'hover:bg-indigo-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400'}`}>
                        <Home size={22} className="group-hover:scale-110 transition-transform" />
                        <span className="font-bold tracking-tight">Trang chủ</span>
                    </NavLink>
                    <NavLink to="/search" className={({ isActive }) => `flex items-center gap-4 px-4 py-3.5 rounded-2xl transition-all group ${isActive ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200 dark:shadow-none translate-x-1' : 'hover:bg-indigo-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400'}`}>
                        <Search size={22} className="group-hover:scale-110 transition-transform" />
                        <span className="font-bold tracking-tight">Tìm kiếm</span>
                    </NavLink>
                    <NavLink to="/chat" className={({ isActive }) => `flex items-center gap-4 px-4 py-3.5 rounded-2xl transition-all group relative ${isActive ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200 dark:shadow-none translate-x-1' : 'hover:bg-indigo-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400'}`}>
                        <MessageCircle size={22} className="group-hover:scale-110 transition-transform" />
                        <span className="font-bold tracking-tight">Tin nhắn</span>
                        {unreadMessagesCount > 0 && (
                            <span className="absolute right-4 top-1/2 -translate-y-1/2 bg-red-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full ring-2 ring-white dark:ring-slate-900">
                                {unreadMessagesCount > 99 ? '99+' : unreadMessagesCount}
                            </span>
                        )}
                    </NavLink>
                    <NavLink to="/notifications" className={({ isActive }) => `flex items-center gap-4 px-4 py-3.5 rounded-2xl transition-all group relative ${isActive ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200 dark:shadow-none translate-x-1' : 'hover:bg-indigo-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400'}`}>
                        <Bell size={22} className="group-hover:scale-110 transition-transform" />
                        <span className="font-bold tracking-tight">Thông báo</span>
                        {unreadNotificationsCount > 0 && (
                            <span className="absolute right-4 top-1/2 -translate-y-1/2 bg-indigo-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full ring-2 ring-white dark:ring-slate-900">
                                {unreadNotificationsCount > 99 ? '99+' : unreadNotificationsCount}
                            </span>
                        )}
                    </NavLink>
                    <NavLink to={`/profile/${user?.id}`} className={({ isActive }) => `flex items-center gap-4 px-4 py-3.5 rounded-2xl transition-all group ${isActive ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200 dark:shadow-none translate-x-1' : 'hover:bg-indigo-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400'}`}>
                        <User size={22} className="group-hover:scale-110 transition-transform" />
                        <span className="font-bold tracking-tight">Cá nhân</span>
                    </NavLink>
                    <NavLink to="/settings" className={({ isActive }) => `flex items-center gap-4 px-4 py-3.5 rounded-2xl transition-all group ${isActive ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200 dark:shadow-none translate-x-1' : 'hover:bg-indigo-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400'}`}>
                        <Settings size={22} className="group-hover:scale-110 transition-transform" />
                        <span className="font-bold tracking-tight">Cài đặt</span>
                    </NavLink>
                </nav>

                <div className="p-4 mt-auto border-t border-indigo-50 dark:border-slate-800">
                    <button onClick={logout} className="flex items-center gap-4 w-full px-4 py-3.5 rounded-2xl text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 font-bold transition-all group active:scale-95">
                        <LogOut size={22} className="group-hover:rotate-12 transition-transform" />
                        <span>Đăng xuất</span>
                    </button>
                    <div className="mt-4 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 flex items-center gap-3">
                        <img src={getAvatarUrl(user?.avatar, user?.username)} className="w-10 h-10 rounded-xl object-cover ring-2 ring-indigo-100 dark:ring-slate-700" alt="Me" />
                        <div className="flex-1 min-w-0">
                            <p className="font-bold text-sm truncate">{user?.fullName}</p>
                            <p className="text-[10px] text-slate-400 uppercase font-black tracking-widest">{user?.username}</p>
                        </div>
                    </div>
                </div>
            </aside>

            {/* Mobile Header */}
            <header className="lg:hidden flex items-center justify-between px-4 py-3 h-16 bg-white dark:bg-slate-900 border-b border-indigo-50 dark:border-slate-800 sticky top-0 z-40 backdrop-blur-md bg-white/80 dark:bg-slate-900/80 mt-[env(safe-area-inset-top)]">
                <button onClick={() => navigate(-1)} className="p-2 text-indigo-600 dark:text-indigo-400 active:scale-90 transition-transform">
                    <ArrowLeft size={24} />
                </button>
                <span className="font-black text-xl tracking-tighter uppercase bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                    MiniAn
                </span>
                <div className="flex items-center gap-2">
                    <NavLink to="/search" className="p-2 text-slate-600 dark:text-slate-400">
                        <Search size={22} />
                    </NavLink>
                </div>
            </header>

            {/* Main Content Area */}
            <main className="flex-1 flex flex-col min-h-0 bg-slate-50 dark:bg-slate-950">
                {isChatPage ? (
                    /* Chat Page: Full Width/Height, No PullToRefresh, Custom Scroll */
                    <div className="flex-1 w-full bg-white dark:bg-slate-900 lg:bg-transparent overflow-hidden">
                        <Outlet />
                    </div>
                ) : (
                    /* Other Pages: Standard Scrollable Area with PullToRefresh */
                    <PullToRefresh
                        onRefresh={async () => { window.location.reload(); return Promise.resolve(); }}
                        className="flex-1 w-full h-full overflow-y-auto no-scrollbar"
                    >
                        <div
                            ref={contentRef}
                            className="px-4 py-6 min-h-full outline-none no-scrollbar"
                            tabIndex={0}
                        >
                            <Outlet />
                        </div>
                    </PullToRefresh>
                )}
            </main>

            {/* Desktop Right Sidebar: Leaderboard */}
            <aside className="hidden xl:flex flex-col w-80 h-screen sticky top-0 bg-white dark:bg-slate-900 border-l border-indigo-50 dark:border-slate-800 z-30 overflow-hidden">
                <div className="p-6 border-b border-indigo-50 dark:border-slate-800 flex items-center gap-2">
                    <Trophy className="text-yellow-500" size={20} />
                    <h2 className="text-xl font-bold">Bảng Xếp Hạng</h2>
                </div>

                <div className="flex-1 overflow-y-auto no-scrollbar space-y-4" tabIndex={0}>
                    {leaderboard.map((u, index) => (
                        <NavLink key={u.id} to={`/profile/${u.id}`} className="flex items-center gap-3 p-3 rounded-xl hover:bg-white/80 dark:hover:bg-slate-800/80 transition-all border border-transparent hover:border-indigo-50 dark:hover:border-indigo-500/30 group">
                            <div className={`w-6 h-6 flex items-center justify-center rounded-full font-bold text-xs ${index === 0 ? 'bg-yellow-400 text-white' :
                                index === 1 ? 'bg-slate-300 text-slate-700' :
                                    index === 2 ? 'bg-amber-600 text-white' : 'text-slate-400'}`}>
                                {index + 1}
                            </div>
                            <img src={getAvatarUrl(u.avatar, u.username)} className="w-10 h-10 rounded-full object-cover ring-2 ring-transparent group-hover:ring-indigo-200 transition-all" alt={u.username} />
                            <div className="flex-1 min-w-0">
                                <p className="font-bold text-sm truncate group-hover:text-indigo-600 transition-colors uppercase">{u.fullName}</p>
                                <p className="text-[10px] text-slate-400 font-bold">{u.username}</p>
                            </div>
                            <div className="text-right">
                                <p className="text-sm font-black text-indigo-600 dark:text-indigo-400">{u.coins.toLocaleString()}</p>
                                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter">Xu</p>
                            </div>
                        </NavLink>
                    ))}
                    {hasMore && (
                        <button onClick={loadMoreLeaderboard} className="w-full py-4 text-xs font-black text-indigo-600 uppercase tracking-widest hover:bg-indigo-50 transition-colors">
                            Xem thêm...
                        </button>
                    )}
                </div>
            </aside>

            {/* Mobile Bottom Navigation */}
            <nav className="lg:hidden grid grid-cols-5 h-16 bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl border-t border-indigo-50 dark:border-slate-800 fixed bottom-0 left-0 right-0 z-50 pb-[env(safe-area-inset-bottom)]">
                <NavLink to="/" className={({ isActive }) => `flex flex-col items-center justify-center gap-0.5 transition-all ${isActive ? 'text-indigo-600' : 'text-slate-400'}`}>
                    <Home size={22} />
                    <span className="text-[10px] font-bold">Chủ</span>
                </NavLink>
                <NavLink to="/leaderboard" className={({ isActive }) => `flex flex-col items-center justify-center gap-0.5 transition-all ${isActive ? 'text-indigo-600' : 'text-slate-400'}`}>
                    <Award size={22} />
                    <span className="text-[10px] font-bold">Hạng</span>
                </NavLink>
                <NavLink to="/chat" className={({ isActive }) => `flex flex-col items-center justify-center gap-0.5 transition-all relative ${isActive ? 'text-indigo-600' : 'text-slate-400'}`}>
                    <MessageCircle size={22} />
                    <span className="text-[10px] font-bold">Chat</span>
                    {unreadMessagesCount > 0 && (
                        <span className="absolute top-2 right-4 bg-red-500 text-white text-[8px] font-black w-4 h-4 flex items-center justify-center rounded-full ring-2 ring-white dark:ring-slate-900">
                            {unreadMessagesCount > 9 ? '9+' : unreadMessagesCount}
                        </span>
                    )}
                </NavLink>
                <NavLink to="/notifications" className={({ isActive }) => `flex flex-col items-center justify-center gap-0.5 transition-all relative ${isActive ? 'text-indigo-600' : 'text-slate-400'}`}>
                    <Bell size={22} />
                    <span className="text-[10px] font-bold">N.Nhận</span>
                    {unreadNotificationsCount > 0 && (
                        <span className="absolute top-2 right-4 bg-indigo-500 text-white text-[8px] font-black w-4 h-4 flex items-center justify-center rounded-full ring-2 ring-white dark:ring-slate-900">
                            {unreadNotificationsCount > 9 ? '9+' : unreadNotificationsCount}
                        </span>
                    )}
                </NavLink>
                <NavLink to={`/profile/${user?.id}`} className={({ isActive }) => `flex flex-col items-center justify-center gap-0.5 transition-all ${isActive ? 'text-indigo-600' : 'text-slate-400'}`}>
                    <User size={22} />
                    <span className="text-[10px] font-bold">Tôi</span>
                </NavLink>
            </nav>
        </div>
    );
}
