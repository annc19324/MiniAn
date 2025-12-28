import { Outlet, NavLink } from 'react-router-dom';
import { Home, MessageCircle, User, PlusSquare, Bell, LogOut, Search } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export default function Layout() {
    const { logout, user } = useAuth();

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row">
            {/* Desktop Sidebar (Right Side) */}
            <aside className="hidden md:flex w-72 flex-col bg-white/80 backdrop-blur-xl border-l border-white/50 min-h-screen fixed right-0 top-0 z-50 shadow-[0_0_40px_-10px_rgba(0,0,0,0.05)]">
                <div className="p-8">
                    <h1 className="text-4xl font-black bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-purple-600 tracking-tighter">
                        MiniAn
                    </h1>
                    <p className="text-sm text-slate-400 mt-1 font-medium">Social Network</p>
                </div>

                <nav className="flex-1 px-6 space-y-3">
                    <NavItem to="/" icon={<Home size={22} />} label="Trang chủ" />
                    <NavItem to="/search" icon={<Search size={22} />} label="Tìm kiếm" />
                    <NavItem to="/chat" icon={<MessageCircle size={22} />} label="Tin nhắn" count={3} />
                    <NavItem to="/notifications" icon={<Bell size={22} />} label="Thông báo" />
                    <NavItem to={`/profile/${user?.id}`} icon={<User size={22} />} label="Hồ sơ" />

                    <div className="pt-6 pb-2">
                        <NavLink to="/create" className="flex items-center justify-center space-x-2 w-full bg-indigo-600 text-white p-4 rounded-2xl shadow-lg shadow-indigo-500/30 hover:bg-indigo-700 hover:shadow-indigo-500/40 hover:-translate-y-1 transition-all">
                            <PlusSquare size={20} />
                            <span className="font-bold">Đăng bài</span>
                        </NavLink>
                    </div>
                </nav>

                <div className="p-6 border-t border-slate-100/50 bg-slate-50/50">
                    <div className="flex items-center space-x-3 mb-4">
                        <img src={user?.avatar || "https://ui-avatars.com/api/?name=User&background=random"} alt="Avatar" className="w-10 h-10 rounded-full border-2 border-white shadow-sm" />
                        <div className="flex-1 overflow-hidden">
                            <p className="font-bold text-slate-800 truncate">{user?.fullName || "User"}</p>
                            <p className="text-xs text-slate-500 truncate">@{user?.username || "username"}</p>
                        </div>
                    </div>
                    <button onClick={logout} className="flex items-center space-x-3 text-slate-500 hover:text-red-600 hover:bg-red-50 p-3 rounded-xl w-full transition-all group">
                        <LogOut size={20} className="group-hover:rotate-12 transition-transform" />
                        <span className="font-medium">Đăng xuất</span>
                    </button>
                </div>
            </aside>

            {/* Mobile Header */}
            <header className="md:hidden sticky top-0 z-40 bg-white/80 backdrop-blur-lg border-b border-indigo-50 px-4 py-3 flex justify-between items-center shadow-sm">
                <h1 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600">MiniAn</h1>
                <div className="flex items-center gap-3">
                    <button className="p-2 text-slate-600 hover:bg-slate-100 rounded-full relative">
                        <Bell size={24} />
                        <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full"></span>
                    </button>
                </div>
            </header>

            {/* Main Content (Shifted Left because Sidebar is Right) */}
            <main className="flex-1 md:mr-72 pb-24 md:pb-10 px-4 py-6 max-w-5xl mx-auto w-full">
                <Outlet />
            </main>

            {/* Mobile Bottom Nav */}
            <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-xl border-t border-indigo-50/50 flex justify-around p-3 z-50 shadow-[0_-10px_40px_-15px_rgba(0,0,0,0.1)] pb-safe">
                <MobileNavItem to="/" icon={<Home size={24} />} />
                <MobileNavItem to="/search" icon={<Search size={24} />} />
                <NavLink to="/create" className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white p-3.5 rounded-2xl -mt-8 shadow-lg shadow-indigo-500/40 hover:shadow-indigo-500/50 hover:-translate-y-1 transition-all border-4 border-slate-50">
                    <PlusSquare size={26} />
                </NavLink>
                <MobileNavItem to="/notifications" icon={<Bell size={24} />} />
                <MobileNavItem to={`/profile/${user?.id}`} icon={<User size={24} />} />
            </nav>
        </div>
    );
}

function NavItem({ to, icon, label, count }: { to: string; icon: React.ReactNode; label: string; count?: number }) {
    return (
        <NavLink to={to} className={({ isActive }) =>
            `flex items-center justify-between p-3.5 rounded-xl transition-all duration-300 group ${isActive
                ? 'bg-indigo-50/80 text-indigo-700 shadow-sm font-semibold'
                : 'text-slate-500 hover:bg-slate-50 hover:text-indigo-600 font-medium'
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
            `p-3 rounded-2xl transition-all relative ${isActive ? 'text-indigo-600 bg-indigo-50' : 'text-slate-400'}`
        }>
            {icon}
            {count && <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full ring-2 ring-white"></span>}
        </NavLink>
    );
}
