// src/components/GroupManagementModal.tsx
import { useState, useEffect } from 'react';
import { X, UserPlus, UserMinus, LogOut, Search, Camera, Trash2, Edit2, Check } from 'lucide-react';
import { addGroupMember, removeGroupMember, leaveGroup, deleteConversation, searchUsers, updateGroup } from '../services/api';
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
    groupAvatar?: string;
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
    groupAvatar,
    members,
    createdBy,
    onUpdate
}: GroupManagementModalProps) {
    const { user } = useAuth();
    const [searchTerm, setSearchTerm] = useState('');
    const [searchResults, setSearchResults] = useState<User[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [editingName, setEditingName] = useState(false);
    const [newName, setNewName] = useState(groupName);

    const isAdmin = user?.id === createdBy;

    useEffect(() => {
        setNewName(groupName);
    }, [groupName]);

    useEffect(() => {
        if (!searchTerm.trim()) {
            setSearchResults([]);
            return;
        }

        const timer = setTimeout(async () => {
            setIsSearching(true);
            try {
                const res = await searchUsers(searchTerm);
                setSearchResults(res.data.filter((u: User) => !members.some(m => m.id === u.id)));
            } catch (error) {
                console.error('Search error:', error);
            } finally {
                setIsSearching(false);
            }
        }, 300);

        return () => clearTimeout(timer);
    }, [searchTerm, members]);

    const handleUploadAvatar = async (file: File) => {
        setUploading(true);
        try {
            const formData = new FormData();
            formData.append('image', file);
            await updateGroup(roomId, formData);
            toast.success('Đã cập nhật ảnh nhóm');
            onUpdate();
        } catch (error: any) {
            toast.error('Lỗi cập nhật ảnh nhóm');
        } finally {
            setUploading(false);
        }
    };

    const handleUpdateName = async () => {
        if (!newName.trim() || newName === groupName) {
            setEditingName(false);
            return;
        }
        try {
            const formData = new FormData();
            formData.append('name', newName.trim());
            await updateGroup(roomId, formData);
            toast.success('Đã cập nhật tên nhóm');
            setEditingName(false);
            onUpdate();
        } catch (error: any) {
            toast.error('Lỗi cập nhật tên nhóm');
        }
    };

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

    const handleDeleteGroup = async () => {
        if (!confirm('Bạn có chắc muốn xóa nhóm này? Hành động này không thể hoàn tác.')) return;
        try {
            await deleteConversation(roomId);
            toast.success('Đã xóa nhóm');
            onClose();
            onUpdate();
        } catch (error: any) {
            toast.error('Lỗi xóa nhóm');
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm animate-fade-in">
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-md max-h-[85vh] flex flex-col border border-slate-100 dark:border-slate-700 animate-scale-in">
                {/* Header */}
                <div className="p-4 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center">
                    <h2 className="text-lg font-bold text-slate-800 dark:text-white">Quản lý nhóm</h2>
                    <button onClick={onClose} className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors text-slate-400">
                        <X size={18} />
                    </button>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                    {/* Group Name */}
                    <div>
                        <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">Tên nhóm</label>
                        {isAdmin && editingName ? (
                            <div className="flex gap-2">
                                <input
                                    value={newName}
                                    onChange={(e) => setNewName(e.target.value)}
                                    className="flex-1 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                                    autoFocus
                                    onKeyDown={(e) => e.key === 'Enter' && handleUpdateName()}
                                />
                                <button onClick={handleUpdateName} className="p-1.5 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600">
                                    <Check size={16} />
                                </button>
                                <button onClick={() => { setEditingName(false); setNewName(groupName); }} className="p-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg">
                                    <X size={16} />
                                </button>
                            </div>
                        ) : (
                            <div className="flex items-center justify-between bg-slate-50 dark:bg-slate-900 rounded-lg px-3 py-2">
                                <span className="font-medium text-slate-800 dark:text-slate-200">{groupName}</span>
                                {isAdmin && (
                                    <button onClick={() => setEditingName(true)} className="text-indigo-500 hover:text-indigo-600">
                                        <Edit2 size={14} />
                                    </button>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Group Avatar (Admin Only) */}
                    {isAdmin && (
                        <div>
                            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">Ảnh đại diện nhóm</label>
                            <div className="relative w-20 h-20 mx-auto group">
                                <img
                                    src={getAvatarUrl(groupAvatar, groupName)}
                                    className="w-20 h-20 rounded-full border-4 border-white dark:border-slate-700 shadow-md object-cover"
                                    alt="Group avatar"
                                />
                                <label className="absolute inset-0 rounded-full bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer flex items-center justify-center">
                                    <Camera className="text-white" size={20} />
                                    <input
                                        type="file"
                                        accept="image/*"
                                        hidden
                                        onChange={(e) => {
                                            const file = e.target.files?.[0];
                                            if (file) handleUploadAvatar(file);
                                        }}
                                        disabled={uploading}
                                    />
                                </label>
                                {uploading && (
                                    <div className="absolute inset-0 rounded-full bg-black/70 flex items-center justify-center">
                                        <div className="text-white text-xs">Đang tải...</div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Add Member (Admin Only) */}
                    {isAdmin && (
                        <div>
                            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">Thêm thành viên</label>
                            <div className="relative">
                                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                                <input
                                    type="text"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    placeholder="Tìm kiếm người dùng..."
                                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg pl-9 pr-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                                />
                            </div>
                            {searchTerm && (
                                <div className="mt-1.5 bg-slate-50 dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700 max-h-32 overflow-y-auto">
                                    {isSearching ? (
                                        <div className="p-3 text-center text-slate-400 text-xs">Đang tìm kiếm...</div>
                                    ) : searchResults.length === 0 ? (
                                        <div className="p-3 text-center text-slate-400 text-xs">Không tìm thấy</div>
                                    ) : (
                                        searchResults.map(u => (
                                            <div
                                                key={u.id}
                                                onClick={() => handleAddMember(u.id)}
                                                className="flex items-center gap-2 p-2 hover:bg-white dark:hover:bg-slate-800 cursor-pointer transition-colors border-b border-slate-100 dark:border-slate-800 last:border-0"
                                            >
                                                <img src={getAvatarUrl(u.avatar, u.username)} className="w-7 h-7 rounded-full" alt={u.fullName} />
                                                <div className="flex-1 min-w-0">
                                                    <p className="font-medium text-xs text-slate-800 dark:text-slate-200 truncate">{u.fullName}</p>
                                                </div>
                                                <UserPlus className="text-indigo-500 flex-shrink-0" size={14} />
                                            </div>
                                        ))
                                    )}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Members List */}
                    <div>
                        <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">Thành viên ({members.length})</label>
                        <div className="space-y-1.5 max-h-48 overflow-y-auto">
                            {members.map(member => (
                                <div key={member.id} className="flex items-center gap-2 p-2 bg-slate-50 dark:bg-slate-900 rounded-lg">
                                    <img src={getAvatarUrl(member.avatar, member.username)} className="w-8 h-8 rounded-full border border-white dark:border-slate-700" alt={member.fullName} />
                                    <div className="flex-1 min-w-0">
                                        <p className="font-medium text-xs text-slate-800 dark:text-slate-200 truncate">
                                            {member.fullName}
                                            {member.id === createdBy && (
                                                <span className="ml-1.5 text-[10px] bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 px-1.5 py-0.5 rounded">
                                                    Admin
                                                </span>
                                            )}
                                        </p>
                                        <p className="text-[10px] text-slate-500 dark:text-slate-400">@{member.username}</p>
                                    </div>
                                    {isAdmin && member.id !== createdBy && (
                                        <button
                                            onClick={() => handleRemoveMember(member.id)}
                                            className="p-1 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors flex-shrink-0"
                                        >
                                            <UserMinus size={14} />
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Footer Actions */}
                <div className="p-4 border-t border-slate-100 dark:border-slate-700 space-y-2">
                    {!isAdmin && (
                        <button
                            onClick={handleLeaveGroup}
                            className="w-full px-3 py-2 rounded-lg bg-red-500 hover:bg-red-600 text-white font-medium text-sm shadow-lg shadow-red-500/20 transition-all flex items-center justify-center gap-2"
                        >
                            <LogOut size={16} />
                            <span>Rời nhóm</span>
                        </button>
                    )}
                    {isAdmin && (
                        <button
                            onClick={handleDeleteGroup}
                            className="w-full px-3 py-2 rounded-lg bg-red-500 hover:bg-red-600 text-white font-medium text-sm shadow-lg shadow-red-500/20 transition-all flex items-center justify-center gap-2"
                        >
                            <Trash2 size={16} />
                            <span>Xóa nhóm</span>
                        </button>
                    )}
                    <button
                        onClick={onClose}
                        className="w-full px-3 py-2 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700 font-medium text-sm transition-colors"
                    >
                        Đóng
                    </button>
                </div>
            </div>
        </div>
    );
}
