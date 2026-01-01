// src/components/CreateGroupModal.tsx
import { useState, useEffect } from 'react';
import { X, Search, UserPlus, Users } from 'lucide-react';
import { createGroup } from '../services/api';
import { searchUsers } from '../services/api';
import { toast } from 'react-hot-toast';
import { getAvatarUrl } from '../utils/avatarUtils';

interface User {
    id: number;
    username: string;
    fullName: string;
    avatar?: string;
}

interface CreateGroupModalProps {
    isOpen: boolean;
    onClose: () => void;
    onGroupCreated: () => void;
}

export default function CreateGroupModal({ isOpen, onClose, onGroupCreated }: CreateGroupModalProps) {
    const [groupName, setGroupName] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [searchResults, setSearchResults] = useState<User[]>([]);
    const [selectedMembers, setSelectedMembers] = useState<User[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [isCreating, setIsCreating] = useState(false);

    useEffect(() => {
        if (!searchTerm.trim()) {
            setSearchResults([]);
            return;
        }

        const timer = setTimeout(async () => {
            setIsSearching(true);
            try {
                const res = await searchUsers(searchTerm);
                // Filter out already selected members
                setSearchResults(res.data.filter((u: User) => !selectedMembers.some(m => m.id === u.id)));
            } catch (error) {
                console.error('Search error:', error);
            } finally {
                setIsSearching(false);
            }
        }, 300);

        return () => clearTimeout(timer);
    }, [searchTerm, selectedMembers]);

    const handleAddMember = (user: User) => {
        setSelectedMembers([...selectedMembers, user]);
        setSearchResults(searchResults.filter(u => u.id !== user.id));
        setSearchTerm('');
    };

    const handleRemoveMember = (userId: number) => {
        setSelectedMembers(selectedMembers.filter(m => m.id !== userId));
    };

    const handleCreateGroup = async () => {
        if (!groupName.trim()) {
            toast.error('Vui lòng nhập tên nhóm');
            return;
        }

        if (selectedMembers.length === 0) {
            toast.error('Vui lòng thêm ít nhất 1 thành viên');
            return;
        }

        setIsCreating(true);
        try {
            await createGroup(groupName, selectedMembers.map(m => m.id));
            toast.success('Tạo nhóm thành công!');
            onGroupCreated();
            handleClose();
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Lỗi tạo nhóm');
        } finally {
            setIsCreating(false);
        }
    };

    const handleClose = () => {
        setGroupName('');
        setSearchTerm('');
        setSelectedMembers([]);
        setSearchResults([]);
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm animate-fade-in">
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] flex flex-col border border-slate-100 dark:border-slate-700 animate-scale-in">
                {/* Header */}
                <div className="p-6 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg">
                            <Users className="text-indigo-600 dark:text-indigo-400" size={24} />
                        </div>
                        <h2 className="text-xl font-bold text-slate-800 dark:text-white">Tạo nhóm mới</h2>
                    </div>
                    <button
                        onClick={handleClose}
                        className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors text-slate-400"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto p-6 space-y-4">
                    {/* Group Name */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                            Tên nhóm *
                        </label>
                        <input
                            type="text"
                            value={groupName}
                            onChange={(e) => setGroupName(e.target.value)}
                            placeholder="Nhập tên nhóm..."
                            className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all"
                        />
                    </div>

                    {/* Selected Members */}
                    {selectedMembers.length > 0 && (
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                                Thành viên đã chọn ({selectedMembers.length})
                            </label>
                            <div className="flex flex-wrap gap-2">
                                {selectedMembers.map(member => (
                                    <div
                                        key={member.id}
                                        className="flex items-center gap-2 bg-indigo-50 dark:bg-indigo-900/20 px-3 py-1.5 rounded-lg"
                                    >
                                        <img
                                            src={getAvatarUrl(member.avatar, member.username)}
                                            className="w-6 h-6 rounded-full"
                                            alt={member.fullName}
                                        />
                                        <span className="text-sm font-medium text-indigo-700 dark:text-indigo-300">
                                            {member.fullName}
                                        </span>
                                        <button
                                            onClick={() => handleRemoveMember(member.id)}
                                            className="text-indigo-400 hover:text-red-500 transition-colors"
                                        >
                                            <X size={14} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Search Members */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                            Thêm thành viên *
                        </label>
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                            <input
                                type="text"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                placeholder="Tìm kiếm người dùng..."
                                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl pl-10 pr-4 py-2.5 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all"
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
                                    searchResults.map(user => (
                                        <div
                                            key={user.id}
                                            onClick={() => handleAddMember(user)}
                                            className="flex items-center gap-3 p-3 hover:bg-white dark:hover:bg-slate-800 cursor-pointer transition-colors border-b border-slate-100 dark:border-slate-800 last:border-0"
                                        >
                                            <img
                                                src={getAvatarUrl(user.avatar, user.username)}
                                                className="w-10 h-10 rounded-full border-2 border-white dark:border-slate-700"
                                                alt={user.fullName}
                                            />
                                            <div className="flex-1">
                                                <p className="font-medium text-slate-800 dark:text-slate-200">
                                                    {user.fullName}
                                                </p>
                                                <p className="text-xs text-slate-500 dark:text-slate-400">
                                                    @{user.username}
                                                </p>
                                            </div>
                                            <UserPlus className="text-indigo-500" size={18} />
                                        </div>
                                    ))
                                )}
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-slate-100 dark:border-slate-700 flex gap-3">
                    <button
                        onClick={handleClose}
                        className="flex-1 px-4 py-2.5 rounded-xl text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700 font-medium transition-colors"
                    >
                        Hủy
                    </button>
                    <button
                        onClick={handleCreateGroup}
                        disabled={isCreating || !groupName.trim() || selectedMembers.length === 0}
                        className="flex-1 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-medium shadow-lg shadow-indigo-500/30 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                    >
                        {isCreating ? 'Đang tạo...' : 'Tạo nhóm'}
                    </button>
                </div>
            </div>
        </div>
    );
}
