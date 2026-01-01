// src/components/GroupManagementModal.tsx
import { useState, useEffect } from 'react';
import { X, UserPlus, UserMinus, LogOut, Users as UsersIcon, Search } from 'lucide-react';
import { addGroupMember, removeGroupMember, leaveGroup, searchUsers } from '../services/api';
import { toast } from 'react-hot-toast';
import { getAvatarUrl } from '../utils/avatarUtils';
import { useAuth } from '../context/AuthContext';

interface Member {
    id: number;
    username: string;
    fullName: string;
    avatar?: string;
}

interface GroupManagementModalProps {
    isOpen: boolean;
    onClose: () => void;
    roomId: number;
    groupName: string;
    members: Member[];
    createdBy?: number;
    onUpdate: () => void;
}

interface User {
    id: number;
    username: string;
    fullName: string;
    avatar?: string;
}

export default function GroupManagementModal({
    isOpen,
    onClose,
    roomId,
    groupName,
    members,
    createdBy,
    onUpdate
}: GroupManagementModalProps) {
    const { user } = useAuth();
    const [searchTerm, setSearchTerm] = useState('');
    const [searchResults, setSearchResults] = useState<User[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [isAddingMember, setIsAddingMember] = useState(false);

    const isAdmin = user?.id === createdBy;

    useEffect(() => {
        if (!searchTerm.trim()) {
            setSearchResults([]);
            return;
        }

        const timer = setTimeout(async () => {
            setIsSearching(true);
            try {
                const res = await searchUsers(searchTerm);
                // Filter out existing members
                setSearchResults(res.data.filter((u: User) => !members.some(m => m.id === u.id)));
            } catch (error) {
                console.error('Search error:', error);
            } finally {
                setIsSearching(false);
            }
        }, 300);

        return () => clearTimeout(timer);
    }, [searchTerm, members]);

    const handleAddMember = async (memberId: number) => {
        try {
            await addGroupMember(roomId, memberId);
            toast.success('Đã thêm thành viên');
            setSearchTerm('');
            onUpdate();
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Lỗi thêm thành viên');
        }
    };

    const handleRemoveMember = async (memberId: number) => {
        if (!confirm('Bạn có chắc muốn xóa thành viên này?')) return;

        try {
            await removeGroupMember(roomId, memberId);
            toast.success('Đã xóa thành viên');
            onUpdate();
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Lỗi xóa thành viên');
        }
    };

    const handleLeaveGroup = async () => {
        if (!confirm('Bạn có chắc muốn rời khỏi nhóm?')) return;

        try {
            await leaveGroup(roomId);
            toast.success('Đã rời khỏi nhóm');
            onClose();
            onUpdate();
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Lỗi rời nhóm');
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm animate-fade-in">
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] flex flex-col border border-slate-100 dark:border-slate-700 animate-scale-in">
                {/* Header */}
                <div className="p-6 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg">
                            <UsersIcon className="text-indigo-600 dark:text-indigo-400" size={24} />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-slate-800 dark:text-white">{groupName}</h2>
                            <p className="text-xs text-slate-500 dark:text-slate-400">{members.length} thành viên</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors text-slate-400"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto p-6 space-y-4">
                    {/* Members List */}
                    <div>
                        <h3 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">Thành viên</h3>
                        <div className="space-y-2">
                            {members.map(member => (
                                <div
                                    key={member.id}
                                    className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-900 rounded-xl"
                                >
                                    <img
                                        src={getAvatarUrl(member.avatar, member.username)}
                                        className="w-10 h-10 rounded-full border-2 border-white dark:border-slate-700"
                                        alt={member.fullName}
                                    />
                                    <div className="flex-1">
                                        <p className="font-medium text-slate-800 dark:text-slate-200">
                                            {member.fullName}
                                            {member.id === createdBy && (
                                                <span className="ml-2 text-xs bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 px-2 py-0.5 rounded">
                                                    Quản trị viên
                                                </span>
                                            )}
                                        </p>
                                        <p className="text-xs text-slate-500 dark:text-slate-400">@{member.username}</p>
                                    </div>
                                    {isAdmin && member.id !== createdBy && (
                                        <button
                                            onClick={() => handleRemoveMember(member.id)}
                                            className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                                            title="Xóa thành viên"
                                        >
                                            <UserMinus size={16} />
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Add Member (Only for admin or all members - can customize) */}
                    {isAdmin && (
                        <div>
                            <h3 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">Thêm thành viên</h3>
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                <input
                                    type="text"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    placeholder="Tìm kiếm người dùng..."
                                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl pl-10 pr-4 py-2.5 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all text-sm"
                                />
                            </div>

                            {/* Search Results */}
                            {searchTerm && (
                                <div className="mt-2 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 max-h-48 overflow-y-auto">
                                    {isSearching ? (
                                        <div className="p-4 text-center text-slate-400 text-sm">Đang tìm kiếm...</div>
                                    ) : searchResults.length === 0 ? (
                                        <div className="p-4 text-center text-slate-400 text-sm">Không tìm thấy người dùng</div>
                                    ) : (
                                        searchResults.map(u => (
                                            <div
                                                key={u.id}
                                                onClick={() => handleAddMember(u.id)}
                                                className="flex items-center gap-3 p-3 hover:bg-white dark:hover:bg-slate-800 cursor-pointer transition-colors border-b border-slate-100 dark:border-slate-800 last:border-0"
                                            >
                                                <img
                                                    src={getAvatarUrl(u.avatar, u.username)}
                                                    className="w-8 h-8 rounded-full border-2 border-white dark:border-slate-700"
                                                    alt={u.fullName}
                                                />
                                                <div className="flex-1">
                                                    <p className="font-medium text-sm text-slate-800 dark:text-slate-200">{u.fullName}</p>
                                                    <p className="text-xs text-slate-500 dark:text-slate-400">@{u.username}</p>
                                                </div>
                                                <UserPlus className="text-indigo-500" size={16} />
                                            </div>
                                        ))
                                    )}
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-slate-100 dark:border-slate-700 flex gap-3">
                    {!isAdmin && (
                        <button
                            onClick={handleLeaveGroup}
                            className="flex-1 px-4 py-2.5 rounded-xl bg-red-500 hover:bg-red-600 text-white font-medium shadow-lg shadow-red-500/30 transition-all flex items-center justify-center gap-2"
                        >
                            <LogOut size={18} />
                            <span>Rời nhóm</span>
                        </button>
                    )}
                    <button
                        onClick={onClose}
                        className="flex-1 px-4 py-2.5 rounded-xl text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700 font-medium transition-colors"
                    >
                        Đóng
                    </button>
                </div>
            </div>
        </div>
    );
}
