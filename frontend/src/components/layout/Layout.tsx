import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { Home, MessageCircle, User, PlusSquare, Bell, LogOut, Search, Settings } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { getAvatarUrl } from '../../utils/avatarUtils';

import { useState, useEffect } from 'react';
import { getLeaderboard } from '../../services/api';
import { Award } from 'lucide-react';
import { io } from 'socket.io-client';
import toast from 'react-hot-toast';
import { getConversations } from '../../services/api';
import { sendSystemNotification, playNotificationSound } from '../../utils/notificationUtils';
import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';

export default function Layout() {
    const { logout, user } = useAuth();
    const [leaderboard, setLeaderboard] = useState<any[]>([]);
    const [hasMore, setHasMore] = useState(true);
    const [unreadMessagesCount, setUnreadMessagesCount] = useState(0);
    const [unreadNotificationsCount, setUnreadNotificationsCount] = useState(0);
    const navigate = useNavigate();
    const location = useLocation();
    const isChatPage = location.pathname === '/chat';

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
            // Also join personal room for notifications if needed
            socket.emit('join_room', user.id);
        });

        socket.on('receive_message', (data) => {
            // Prevent self-notifications
            const senderId = data.messageData.sender?._id || data.messageData.sender?.id;
            if (senderId === user?.id) return;

            // GLOBAL LOGIC: Always play sound (simplified for reliability)
            const soundEnabled = localStorage.getItem('notificationSound') !== 'false';
            if (soundEnabled) {
                playNotificationSound();
            }

            // Always try to send system notification
            sendSystemNotification(`Tin nhắn mới từ ${data.messageData.sender.username}`, data.messageData.content);

            // Toast logic: Only show if NOT on chat page or hidden
            const isChatPage = window.location.pathname === '/chat';
            const isHidden = document.hidden;
            if (!isChatPage || isHidden) {
                toast(`💬 ${data.messageData.sender.username}: ${data.messageData.content}`, {
                    icon: '📩',
                    style: { borderRadius: '10px', background: '#333', color: '#fff' },
                });
            }
        });

        socket.on('new_notification', (data) => {
            // Prevent self-notifications if sender info is present
            const senderId = data.sender?._id || data.sender?.id || data.senderId;
            if (senderId && senderId === user?.id) return;

            // For general notifications (Likes, Comments, Follows), ALWAYS play sound if enabled
            const soundEnabled = localStorage.getItem('notificationSound') !== 'false';
            if (soundEnabled) {
                playNotificationSound();
            }

            toast(data.content, { icon: '🔔' });
            setUnreadNotificationsCount(prev => prev + 1);

            // SYSTEM NOTIFICATION FOR ALL TYPES
            sendSystemNotification('Thông báo mới', data.content);
        });

        // Listen for new message alerts to update global count
        socket.on('new_message_alert', () => {
            setUnreadMessagesCount(prev => prev + 1);
        });

        // Listen for refresh triggers (e.g. from markAsRead)
        socket.on('refresh_unread', () => {
            fetchUnread();
        });

        return () => {
            socket.disconnect();
        }
    }, [user]);

    // Fetch unread count
    const fetchUnread = async () => {
        try {
            // Messages
            const resMsg = await getConversations();
            const totalMsg = resMsg.data.reduce((acc: number, c: any) => acc + (c.unreadCount || 0), 0);
            setUnreadMessagesCount(totalMsg);

            // Notifications
            const { getUnreadNotificationsCount } = await import('../../services/api');
            const resNotif = await getUnreadNotificationsCount();
            setUnreadNotificationsCount(resNotif.data.count);
        } catch (error) {
            console.error(error);
        }
    };

    useEffect(() => {
        if (user) {
            fetchUnread();

            // Register SW and Subscribe to Push
            if ('serviceWorker' in navigator && 'PushManager' in window) {
                navigator.serviceWorker.register('/sw.js')
                    .then(async (registration) => {
                        // console.log('SW Registered', registration);

                        // Request Permission
                        const permission = await Notification.requestPermission();
                        if (permission === 'granted') {
                            // Subscribe
                            const subscribeOptions = {
                                userVisibleOnly: true,
                                applicationServerKey: import.meta.env.VITE_VAPID_PUBLIC_KEY
                            };

                            try {
                                const subscription = await registration.pushManager.subscribe(subscribeOptions);
                                // Send to backend
                                const { subscribePush } = await import('../../services/api');
                                await subscribePush(subscription);
                                // console.log('Push Subscribed');
                            } catch (err) {
                                console.error('Failed to subscribe push', err);
                                console.error('Failed to subscribe push', err);
                            }
                        }
                    })
                    .catch(err => console.error('SW Register Error', err));
            }

            // Native Push Registration
            if (Capacitor.isNativePlatform()) {
                import('../../utils/notificationUtils').then(async ({ registerPushNotifications }) => {
                    const { subscribePush } = await import('../../services/api');
                    await registerPushNotifications(subscribePush);
                });
            }
        }
    }, [user, window.location.pathname]); // Refresh when navigating too

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col lg:flex-row transition-colors duration-300">
            {/* Leaderboard Sidebar (Left Side) */}
            <aside className="hidden lg:flex w-56 xl:w-64 flex-col bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl border-r border-white/50 dark:border-slate-800/50 h-screen fixed left-0 top-0 z-40 p-6 transition-colors duration-300">
                <div className="flex items-center gap-2 mb-6 text-yellow-600 dark:text-yellow-500 flex-shrink-0">
                    <Award size={24} />
                    <h2 className="text-xl font-bold">Bảng Xếp Hạng</h2>
                </div>

                <div className="flex-1 overflow-y-auto no-scrollbar space-y-4">
                    {leaderboard.map((u, index) => (
                        <NavLink key={u.id} to={`/profile/${u.id}`} className="flex items-center gap-3 p-3 rounded-xl hover:bg-white/80 dark:hover:bg-slate-800/80 transition-all border border-transparent hover:border-indigo-50 dark:hover:border-indigo-500/30 group">
                            <div className={`w-6 h-6 flex items-center justify-center rounded-full font-bold text-xs ${index === 0 ? 'bg-yellow-400 text-white' :
                                index === 1 ? 'bg-slate-300 text-white' :
                                    index === 2 ? 'bg-amber-600 text-white' : 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-300'
                                }`}>
                                {index + 1}
                            </div>
                            <img src={getAvatarUrl(u.avatar, u.username)} alt="Avatar" className="w-8 h-8 rounded-full border border-white dark:border-slate-700 shadow-sm" />
                            <div className="flex-1 min-w-0">
                                <p className="font-bold text-slate-800 dark:text-slate-200 text-sm truncate group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">{u.fullName}</p>
                                <p className="text-xs text-yellow-600 dark:text-yellow-500 font-bold">{u.coins} xu</p>
                            </div>
                        </NavLink>
                    ))}

                    {hasMore && (
                        <button
                            onClick={loadMoreLeaderboard}
                            className="w-full py-2 text-xs font-bold text-slate-500 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400 bg-slate-50/50 dark:bg-slate-800/30 rounded-lg transition-colors flex items-center justify-center gap-1 group"
                        >
                            <span>Xem thêm</span>
                            <div className="w-4 h-4 rounded-full border-2 border-slate-400 border-t-transparent animate-spin hidden group-active:block w-3 h-3"></div>
                        </button>
                    )}
                </div>
            </aside>

            {/* Desktop Sidebar (Right Side) */}
            <aside className="hidden lg:flex w-64 xl:w-72 flex-col bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-l border-white/50 dark:border-slate-800/50 min-h-screen fixed right-0 top-0 z-50 shadow-[0_0_40px_-10px_rgba(0,0,0,0.05)] dark:shadow-none overflow-y-auto transition-colors duration-300">
                <div className="p-6">
                    <NavLink to="/">
                        <h1 className="text-3xl font-black bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-purple-600 dark:from-indigo-400 dark:to-purple-400 tracking-tighter">
                            MiniAn
                        </h1>
                    </NavLink>
                    <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5 font-medium">Social Network</p>
                </div>

                <div className="px-6 pb-4 border-b border-slate-100/50 dark:border-slate-800/50 bg-slate-50/50 dark:bg-slate-800/50 mb-4 pt-4">
                    <div className="flex items-center space-x-3 mb-3">
                        <img src={getAvatarUrl(user?.avatar, user?.username)} alt="Avatar" className="w-10 h-10 rounded-full border-2 border-white dark:border-slate-700 shadow-sm" />
                        <div className="flex-1 overflow-hidden">
                            <p className="font-bold text-slate-800 dark:text-slate-200 truncate text-sm">{user?.fullName || "User"}</p>
                            <p className="text-xs text-slate-500 dark:text-slate-400 truncate">@{user?.username || "username"}</p>
                        </div>
                    </div>
                    <button onClick={logout} className="flex items-center space-x-2 text-slate-500 dark:text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 p-2 rounded-xl w-full transition-all group text-sm">
                        <LogOut size={18} className="group-hover:rotate-12 transition-transform" />
                        <span className="font-medium">Đăng xuất</span>
                    </button>
                </div>

                <nav className="flex-1 px-4 space-y-2 pb-6">
                    <NavItem to="/" icon={<Home size={20} />} label="Trang chủ" />
                    <NavItem to={`/profile/${user?.id}`} icon={<User size={20} />} label="Hồ sơ" />
                    <NavItem to="/notifications" icon={<Bell size={20} />} label="Thông báo" count={unreadNotificationsCount > 0 ? unreadNotificationsCount : undefined} />
                    <NavItem to="/chat" icon={<MessageCircle size={20} />} label="Tin nhắn" count={unreadMessagesCount > 0 ? unreadMessagesCount : undefined} />
                    <NavItem to="/search" icon={<Search size={20} />} label="Tìm kiếm" />
                    <NavItem to="/settings" icon={<Settings size={20} />} label="Cài đặt" />

                    <div className="pt-4">
                        <NavLink to="/create" className="flex items-center justify-center space-x-2 w-full bg-indigo-600 text-white p-3 rounded-xl shadow-lg shadow-indigo-500/30 hover:bg-indigo-700 hover:shadow-indigo-500/40 hover:-translate-y-1 transition-all dark:bg-indigo-600 dark:hover:bg-indigo-500">
                            <PlusSquare size={18} />
                            <span className="font-bold text-sm">Đăng bài</span>
                        </NavLink>
                    </div>
                </nav>
            </aside>

            {/* Mobile Header */}
            <header
                style={{ paddingTop: 'calc(12px + env(safe-area-inset-top))' }}
                className="lg:hidden sticky top-0 z-40 bg-white/80 dark:bg-slate-900/80 backdrop-blur-lg border-b border-indigo-50 dark:border-slate-800 px-4 pb-3 flex justify-between items-center shadow-sm dark:shadow-none transition-colors duration-300"
            >
                <NavLink to="/">
                    <h1 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600 dark:from-indigo-400 dark:to-purple-400">MiniAn</h1>
                </NavLink>
                <div className="flex items-center gap-3">
                    <NavLink to="/leaderboard" className="p-2 text-yellow-600 dark:text-yellow-500 hover:bg-yellow-50 dark:hover:bg-yellow-900/30 rounded-full">
                        <Award size={24} />
                    </NavLink>
                    <button
                        onClick={() => navigate('/chat')}
                        className="p-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full relative"
                    >
                        <MessageCircle size={24} />
                        {unreadMessagesCount > 0 && (
                            <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white text-[9px] font-bold flex items-center justify-center rounded-full ring-2 ring-white dark:ring-slate-900 transform translate-x-1 -translate-y-1">
                                {unreadMessagesCount > 99 ? '99+' : unreadMessagesCount}
                            </span>
                        )}
                    </button>
                    <NavLink to="/settings" className="p-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full">
                        <Settings size={24} />
                    </NavLink>
                </div>
            </header>

            {/* Main Content (Shifted Left because Sidebar is Right, Shifted Right because Leaderboard is Left) */}
            <main className={`flex-1 lg:mr-64 xl:mr-72 lg:ml-56 xl:ml-64 ${isChatPage ? 'pb-0' : 'pb-24'} lg:pb-10 px-4 py-6 max-w-[1200px] mx-auto w-full min-w-0 transition-all duration-300`}>
                <Outlet />
            </main>

            {/* Mobile Bottom Nav */}
            <nav
                style={{ paddingBottom: 'calc(12px + env(safe-area-inset-bottom))' }}
                className="lg:hidden fixed bottom-0 left-0 right-0 bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl border-t border-indigo-50/50 dark:border-indigo-500/20 flex justify-around p-3 z-50 shadow-[0_-10px_40px_-15px_rgba(0,0,0,0.1)] dark:shadow-none transition-colors duration-300"
            >
                <MobileNavItem to="/" icon={<Home size={24} />} />
                <MobileNavItem to="/search" icon={<Search size={24} />} />
                <MobileNavItem to="/create" icon={<PlusSquare size={24} />} />
                <MobileNavItem to="/notifications" icon={<Bell size={24} />} count={unreadNotificationsCount > 0 ? unreadNotificationsCount : undefined} />
                <MobileNavItem to={`/profile/${user?.id}`} icon={<User size={24} />} />
            </nav>
        </div>
    );
}

function NavItem({ to, icon, label, count }: { to: string; icon: React.ReactNode; label: string; count?: number }) {
    return (
        <NavLink to={to} className={({ isActive }) =>
            `flex items-center justify-between p-2.5 rounded-xl transition-all duration-300 group ${isActive
                ? 'bg-indigo-50/80 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 shadow-sm font-semibold'
                : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50 hover:text-indigo-600 dark:hover:text-indigo-400 font-medium'
            }`
        }>
            <div className="flex items-center space-x-3.5">
                <div className="transition-transform group-hover:scale-110 duration-200">{icon}</div>
                <span>{label}</span>
            </div>
            {count && <span className="bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full shadow-sm">{count}</span>}
        </NavLink>
    );
}

function MobileNavItem({ to, icon, count }: { to: string; icon: React.ReactNode; count?: number }) {
    return (
        <NavLink to={to} className={({ isActive }) =>
            `p-3 rounded-2xl transition-all relative ${isActive ? 'text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/20' : 'text-slate-400 dark:text-slate-500'}`
        }>
            {icon}
            {!!count && count > 0 && (
                <span className="absolute top-2 right-2 w-4 h-4 bg-red-500 text-white text-[9px] font-bold flex items-center justify-center rounded-full ring-2 ring-white dark:ring-slate-900 transform translate-x-1 -translate-y-1">
                    {count > 99 ? '99+' : count}
                </span>
            )}
        </NavLink>
    );
}
