import { useState, useEffect } from 'react';
import { getAllUsers, updateUserStatus, updateUserCoins, deleteUser, adminCreateUser } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Search, Coins, X, UserPlus, Trash2, ChevronDown, Eye, EyeOff } from 'lucide-react';
import toast from 'react-hot-toast';

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

    // Modals Check
    const [coinModal, setCoinModal] = useState<{ isOpen: boolean, userId: number | null, type: 'add' | 'subtract', amount: string }>({
        isOpen: false, userId: null, type: 'add', amount: ''
    });

    const [createModal, setCreateModal] = useState({
        isOpen: false,
        username: '', email: '', password: '', fullName: ''
    });

    const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean, userId: number | null, username: string }>({
        isOpen: false, userId: null, username: ''
    });
    const [activeRoleMenuId, setActiveRoleMenuId] = useState<number | null>(null);
    const [showCreatePassword, setShowCreatePassword] = useState(false);

    useEffect(() => {
        if (user && user.role !== 'ADMIN') {
            navigate('/');
            return;
        }
        fetchData();
    }, [user, navigate]);

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

    // ... Existing handlers ...
    const handleRoleChange = async (id: number, newRole: string) => {
        try {
            await updateUserStatus(id, { role: newRole });
            setUsers(users.map(u => u.id === id ? { ...u, role: newRole } : u));
            toast.success('Cập nhật vai trò thành công');
        } catch (error) {
            toast.error('Lỗi cập nhật role');
        }
    };

    const handleVipToggle = async (id: number, currentVip: boolean) => {
        try {
            await updateUserStatus(id, { isVip: !currentVip });
            setUsers(users.map(u => u.id === id ? { ...u, isVip: !currentVip } : u));
            toast.success(`Đã ${!currentVip ? 'kích hoạt' : 'hủy'} VIP`);
        } catch (error) {
            toast.error('Lỗi cập nhật VIP');
        }
    };

    const handleActiveToggle = async (id: number, currentActive: boolean) => {
        try {
            await updateUserStatus(id, { isActive: !currentActive });
            setUsers(users.map(u => u.id === id ? { ...u, isActive: !currentActive } : u));
            toast.success(`Đã ${!currentActive ? 'mở khóa' : 'khóa'} tài khoản`);
        } catch (error) {
            toast.error('Lỗi cập nhật trạng thái');
        }
    };

    // Coin Logic
    const openCoinModal = (id: number, type: 'add' | 'subtract') => {
        setCoinModal({ isOpen: true, userId: id, type, amount: '' });
    };

    const handleSaveCoin = async () => {
        if (!coinModal.userId || !coinModal.amount) return;
        const amountNum = parseInt(coinModal.amount);
        if (isNaN(amountNum) || amountNum <= 0) {
            toast.error('Vui lòng nhập số tiền hợp lệ');
            return;
        }
        const finalAmount = coinModal.type === 'subtract' ? -amountNum : amountNum;
        try {
            const res = await updateUserCoins(coinModal.userId, finalAmount);
            // @ts-ignore
            setUsers(users.map(u => u.id === coinModal.userId ? { ...u, coins: res.data.coins } : u));
            toast.success('Cập nhật xu thành công');
            setCoinModal({ ...coinModal, isOpen: false });
        } catch (error) {
            toast.error('Lỗi cập nhật xu');
        }
    };

    // Create User Logic
    const handleCreateUser = async () => {
        const { username, email, password, fullName } = createModal;
        if (!username || !email || !password) {
            toast.error('Vui lòng điền đầy đủ thông tin');
            return;
        }
        try {
            await adminCreateUser({ username, email, password, fullName });
            toast.success('Tạo người dùng thành công');
            setCreateModal({ isOpen: false, username: '', email: '', password: '', fullName: '' });
            fetchData(); // Reload list
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Lỗi tạo người dùng');
        }
    };

    // Delete User Logic
    const openDeleteModal = (u: User) => {
        setDeleteModal({ isOpen: true, userId: u.id, username: u.username });
    };

    const handleDeleteUser = async () => {
        if (!deleteModal.userId) return;
        try {
            await deleteUser(deleteModal.userId);
            setUsers(users.filter(u => u.id !== deleteModal.userId));
            toast.success('Xóa người dùng thành công');
            setDeleteModal({ isOpen: false, userId: null, username: '' });
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Lỗi xóa người dùng');
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
        <div className="md:px-4 h-[calc(100vh-80px)] flex flex-col">
            {/* Creates a fixed non-scrolling header area */}
            <div className="shrink-0 bg-slate-50/95 dark:bg-slate-950/95 backdrop-blur-md pb-2 pt-1 space-y-2 -mx-4 px-4 md:mx-0 md:px-0 border-b border-slate-200 dark:border-slate-800 z-30">
                <div className="flex items-center justify-between">
                    <h1 className="text-xl font-extrabold heading-gradient">Quản trị viên</h1>
                    {/* Compact Stats */}
                    <div className="hidden md:flex gap-4 text-xs font-medium text-slate-500 dark:text-slate-400">
                        <span>Total: <b className="text-slate-800 dark:text-white">{stats.total}</b></span>
                        <span>Active: <b className="text-green-600">{stats.active}</b></span>
                        <span>VIP: <b className="text-yellow-600">{stats.vip}</b></span>
                        <span>Admin: <b className="text-purple-600">{stats.admins}</b></span>
                    </div>
                </div>

                {/* Mobile Stats (only visible on small screens) */}
                <div className="grid grid-cols-4 gap-2 md:hidden">
                    <div className="p-2 bg-white dark:bg-slate-800 rounded-lg text-center shadow-sm">
                        <p className="text-[10px] text-slate-500">Total</p>
                        <p className="font-bold text-sm dark:text-white">{stats.total}</p>
                    </div>
                    <div className="p-2 bg-white dark:bg-slate-800 rounded-lg text-center shadow-sm">
                        <p className="text-[10px] text-green-500">Active</p>
                        <p className="font-bold text-sm dark:text-white">{stats.active}</p>
                    </div>
                    <div className="p-2 bg-white dark:bg-slate-800 rounded-lg text-center shadow-sm">
                        <p className="text-[10px] text-yellow-500">VIP</p>
                        <p className="font-bold text-sm dark:text-white">{stats.vip}</p>
                    </div>
                    <div className="p-2 bg-white dark:bg-slate-800 rounded-lg text-center shadow-sm">
                        <p className="text-[10px] text-purple-500">Admin</p>
                        <p className="font-bold text-sm dark:text-white">{stats.admins}</p>
                    </div>
                </div>

                {/* Search & Actions - Compact */}
                <div className="flex gap-2">
                    <div className="relative flex-1">
                        <Search className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                        <input
                            type="text"
                            placeholder="Tìm kiếm..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-8 pr-3 py-1.5 text-sm bg-white dark:bg-slate-800 border-none rounded-lg focus:ring-1 focus:ring-indigo-500 outline-none transition-all dark:text-slate-200 shadow-sm"
                        />
                    </div>
                    <button
                        onClick={() => setCreateModal({ ...createModal, isOpen: true })}
                        className="flex items-center gap-1 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-bold shadow-md whitespace-nowrap"
                    >
                        <UserPlus size={14} />
                        <span className="hidden sm:inline">Thêm</span>
                    </button>
                </div>
            </div>

            {/* Scrollable Table Area */}
            <div className="glass-card overflow-hidden mt-4 flex-1 flex flex-col min-h-0">
                <div className="overflow-auto flex-1 no-scrollbar">
                    <table className="w-full text-left text-sm text-slate-600 dark:text-slate-300 relative">
                        <thead className="sticky top-0 z-20 bg-slate-50 dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 uppercase font-bold text-xs text-slate-500 dark:text-slate-400 shadow-sm">
                            <tr>
                                <th className="p-4 bg-slate-50 dark:bg-slate-900">User</th>
                                <th className="p-4 bg-slate-50 dark:bg-slate-900">Thông tin</th>
                                <th className="p-4 bg-slate-50 dark:bg-slate-900">Coins</th>
                                <th className="p-4 bg-slate-50 dark:bg-slate-900">Vai trò</th>
                                <th className="p-4 bg-slate-50 dark:bg-slate-900">Trạng thái</th>
                                <th className="p-4 bg-slate-50 dark:bg-slate-900">Hành động</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                            {filteredUsers.length === 0 ? (
                                <tr><td colSpan={6} className="p-8 text-center text-slate-400">Không tìm thấy kết quả</td></tr>
                            ) : (
                                filteredUsers.map((u) => (
                                    <tr key={u.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors">
                                        <td className="p-4">
                                            <div className="font-bold text-slate-800 dark:text-white">{u.username}</div>
                                            <div className="text-xs text-slate-400">ID: {u.id}</div>
                                        </td>
                                        <td className="p-4">
                                            <div className="font-medium text-slate-700 dark:text-slate-300">{u.fullName}</div>
                                            <div className="text-xs text-slate-400">{u.email}</div>
                                        </td>
                                        <td className="p-4 font-bold text-slate-700 dark:text-slate-200">
                                            <div className="flex items-center gap-2">
                                                <span>{u.coins}</span> <Coins size={14} className="text-yellow-500" />
                                                <div className="flex flex-col gap-1 ml-2">
                                                    <button onClick={() => openCoinModal(u.id, 'add')} className="px-1.5 bg-green-100 hover:bg-green-200 text-green-700 dark:bg-green-900/30 dark:text-green-400 rounded text-[10px] font-bold">+</button>
                                                    <button onClick={() => openCoinModal(u.id, 'subtract')} className="px-1.5 bg-red-100 hover:bg-red-200 text-red-700 dark:bg-red-900/30 dark:text-red-400 rounded text-[10px] font-bold">-</button>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="p-4">
                                            <div className="relative">
                                                <button
                                                    onClick={() => setActiveRoleMenuId(activeRoleMenuId === u.id ? null : u.id)}
                                                    className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${u.role === 'ADMIN'
                                                        ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400 ring-1 ring-purple-200 dark:ring-purple-800'
                                                        : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300 ring-1 ring-slate-200 dark:ring-slate-700'
                                                        }`}
                                                >
                                                    {u.role === 'ADMIN' ? 'Admin' : 'Member'}
                                                    <ChevronDown size={14} className={`transition-transform ${activeRoleMenuId === u.id ? 'rotate-180' : ''}`} />
                                                </button>

                                                {activeRoleMenuId === u.id && (
                                                    <div className="absolute left-0 top-full mt-1 w-32 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-100 dark:border-slate-700 z-50 overflow-hidden animate-scale-in">
                                                        <button
                                                            onClick={() => { handleRoleChange(u.id, 'USER'); setActiveRoleMenuId(null); }}
                                                            className={`w-full text-left px-3 py-2 text-xs font-medium flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors ${u.role === 'USER' ? 'text-indigo-600 dark:text-indigo-400 bg-indigo-50/50 dark:bg-indigo-900/10' : 'text-slate-700 dark:text-slate-300'}`}
                                                        >
                                                            Member
                                                            {u.role === 'USER' && <div className="w-1.5 h-1.5 rounded-full bg-indigo-600 dark:bg-indigo-400"></div>}
                                                        </button>
                                                        <button
                                                            onClick={() => { handleRoleChange(u.id, 'ADMIN'); setActiveRoleMenuId(null); }}
                                                            className={`w-full text-left px-3 py-2 text-xs font-medium flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors ${u.role === 'ADMIN' ? 'text-purple-600 dark:text-purple-400 bg-purple-50/50 dark:bg-purple-900/10' : 'text-slate-700 dark:text-slate-300'}`}
                                                        >
                                                            Admin
                                                            {u.role === 'ADMIN' && <div className="w-1.5 h-1.5 rounded-full bg-purple-600 dark:bg-purple-400"></div>}
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        </td>
                                        <td className="p-4">
                                            <div className="flex flex-col gap-2 items-start">
                                                <button onClick={() => handleVipToggle(u.id, u.isVip)} className={`px-2 py-0.5 rounded text-[10px] font-bold border transition-all ${u.isVip ? 'bg-yellow-100 text-yellow-700 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-400 dark:border-yellow-900' : 'bg-white dark:bg-transparent text-slate-400 border-slate-200 dark:border-slate-700 hover:border-yellow-300'}`}>
                                                    {u.isVip ? 'VIP Member' : 'Set VIP'}
                                                </button>
                                                <button onClick={() => handleActiveToggle(u.id, u.isActive)} className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${u.isActive ? 'bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-400' : 'bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-400'}`}>
                                                    {u.isActive ? 'Active' : 'Banned'}
                                                </button>
                                            </div>
                                        </td>
                                        <td className="p-4">
                                            <button
                                                onClick={() => openDeleteModal(u)}
                                                className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                                                title="Xóa người dùng này"
                                            >
                                                <Trash2 size={18} />
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Coin Modal */}
            {coinModal.isOpen && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in p-4">
                    <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl scale-100 animate-scale-in border border-slate-100 dark:border-slate-800">
                        <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-900/50">
                            <h3 className="font-bold text-lg text-slate-800 dark:text-white">{coinModal.type === 'add' ? 'Cộng xu' : 'Trừ xu'}</h3>
                            <button onClick={() => setCoinModal({ ...coinModal, isOpen: false })} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"><X size={20} /></button>
                        </div>
                        <div className="p-6">
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Nhập số lượng xu</label>
                            <div className="relative">
                                <Coins className="absolute left-3 top-1/2 -translate-y-1/2 text-yellow-500" size={20} />
                                <input
                                    type="number"
                                    value={coinModal.amount}
                                    onChange={(e) => setCoinModal({ ...coinModal, amount: e.target.value })}
                                    className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all font-bold text-lg text-slate-800 dark:text-white"
                                    placeholder="0"
                                    autoFocus
                                    onKeyDown={(e) => e.key === 'Enter' && handleSaveCoin()}
                                />
                            </div>
                            <div className="flex gap-3 mt-6">
                                <button onClick={() => setCoinModal({ ...coinModal, isOpen: false })} className="flex-1 py-2.5 rounded-xl font-bold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">Hủy</button>
                                <button onClick={handleSaveCoin} className={`flex-1 py-2.5 rounded-xl font-bold text-white transition-all shadow-lg shadow-indigo-500/20 ${coinModal.type === 'add' ? 'bg-green-500 hover:bg-green-600' : 'bg-red-500 hover:bg-red-600'}`}>Xác nhận</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Create User Modal */}
            {createModal.isOpen && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in p-4">
                    <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl scale-100 animate-scale-in border border-slate-100 dark:border-slate-800">
                        <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-900/50">
                            <h3 className="font-bold text-lg text-slate-800 dark:text-white">Thêm thành viên mới</h3>
                            <button onClick={() => setCreateModal({ ...createModal, isOpen: false })} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"><X size={20} /></button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">Tên đăng nhập *</label>
                                <input type="text" value={createModal.username} onChange={e => setCreateModal({ ...createModal, username: e.target.value })} className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:border-indigo-500 dark:text-white" placeholder="username" />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">Email *</label>
                                <input type="email" value={createModal.email} onChange={e => setCreateModal({ ...createModal, email: e.target.value })} className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:border-indigo-500 dark:text-white" placeholder="user@example.com" />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">Mật khẩu *</label>
                                <div className="relative">
                                    <input type={showCreatePassword ? "text" : "password"} value={createModal.password} onChange={e => setCreateModal({ ...createModal, password: e.target.value })} className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:border-indigo-500 dark:text-white pr-10" placeholder="******" />
                                    <button
                                        type="button"
                                        onClick={() => setShowCreatePassword(!showCreatePassword)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-indigo-600 transition-colors"
                                    >
                                        {showCreatePassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                    </button>
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">Họ tên</label>
                                <input type="text" value={createModal.fullName} onChange={e => setCreateModal({ ...createModal, fullName: e.target.value })} className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:border-indigo-500 dark:text-white" placeholder="Nguyen Van A" />
                            </div>
                            <div className="flex gap-3 mt-6">
                                <button onClick={() => setCreateModal({ ...createModal, isOpen: false })} className="flex-1 py-2.5 rounded-xl font-bold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">Hủy</button>
                                <button onClick={handleCreateUser} className="flex-1 py-2.5 rounded-xl font-bold text-white bg-indigo-600 hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-500/20">Tạo tài khoản</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Confirmation Modal */}
            {deleteModal.isOpen && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in p-4">
                    <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl scale-100 animate-scale-in border border-slate-100 dark:border-slate-800">
                        <div className="p-6 text-center">
                            <div className="w-12 h-12 bg-red-100 dark:bg-red-900/30 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
                                <Trash2 size={24} />
                            </div>
                            <h3 className="font-bold text-lg text-slate-800 dark:text-white mb-2">Xác nhận xóa?</h3>
                            <p className="text-slate-500 dark:text-slate-400 text-sm mb-6">Bạn có chắc chắn muốn xóa người dùng <span className="font-bold text-slate-800 dark:text-slate-200">{deleteModal.username}</span>? Hành động này không thể hoàn tác.</p>
                            <div className="flex gap-3">
                                <button onClick={() => setDeleteModal({ ...deleteModal, isOpen: false })} className="flex-1 py-2.5 rounded-xl font-bold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">Hủy</button>
                                <button onClick={handleDeleteUser} className="flex-1 py-2.5 rounded-xl font-bold text-white bg-red-500 hover:bg-red-600 transition-all shadow-lg shadow-red-500/20">Xóa vĩnh viễn</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
