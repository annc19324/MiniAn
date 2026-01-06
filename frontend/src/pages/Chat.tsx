// src/pages/Chat.tsx
import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { getConversations, getMessages, sendMessage, startConversation, markMessagesRead, updateMessage, deleteMessage, deleteConversation } from '../services/api';
import { io, Socket } from 'socket.io-client';
import { Send, MoreVertical, Phone, MessageCircle, Search, Trash2, Edit2, RotateCcw, MoreHorizontal, X, Check, Users, Image as ImageIcon, ArrowLeft } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { getAvatarUrl } from '../utils/avatarUtils';
import CreateGroupModal from '../components/CreateGroupModal';
import GroupManagementModal from '../components/GroupManagementModal';
import ImageModal from '../components/ImageModal';

import { formatDistanceToNow, format } from 'date-fns';
import { vi } from 'date-fns/locale';
import { useLocation, Link } from 'react-router-dom';

interface Message {
    id: number;
    content: string;
    senderId: number;
    roomId: number; // Added roomId
    mediaUrl?: string; // Added
    mediaType?: 'image' | 'video'; // Added
    sender: {
        id: number;
        username: string;
        fullName: string;
        avatar?: string;
    };
    createdAt: string;
    updatedAt: string;
    isRead?: boolean;
    deletedBy: number[];
    isRecalled: boolean;
    isEdited?: boolean;
}

interface ConfirmModalState {
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    type: 'danger' | 'info';
}

interface Conversation {
    id: number;
    name: string;
    avatar?: string;
    lastMessage?: {
        content: string;
        createdAt: string;
    };
    otherMemberId?: number;
    unreadCount?: number;
    isGroup?: boolean;
    memberCount?: number;
    members?: Array<{
        id: number;
        username: string;
        fullName: string;
        avatar?: string;
    }>;
    createdBy?: number;
}

export default function Chat() {
    const { user } = useAuth();
    const location = useLocation();
    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [messages, setMessages] = useState<Message[]>([]);
    const [activeRoomId, setActiveRoomId] = useState<number | null>(null);
    const [newMessage, setNewMessage] = useState('');
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [viewingImage, setViewingImage] = useState<string | null>(null);
    const [socket, setSocket] = useState<Socket | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [showCreateGroupModal, setShowCreateGroupModal] = useState(false);
    const [showGroupManagement, setShowGroupManagement] = useState(false);

    // Pagination
    const [hasMore, setHasMore] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const scrollContainerRef = useRef<HTMLDivElement>(null);

    // Edit/Delete State
    const [editingMsgId, setEditingMsgId] = useState<number | null>(null);
    const [editContent, setEditContent] = useState('');
    const [msgMenuId, setMsgMenuId] = useState<number | null>(null);
    const [showRoomMenu, setShowRoomMenu] = useState(false);
    const roomMenuRef = useRef<HTMLDivElement>(null);
    const msgMenuRef = useRef<HTMLDivElement>(null);
    const [confirmModal, setConfirmModal] = useState<ConfirmModalState>({
        isOpen: false,
        title: '',
        message: '',
        onConfirm: () => { },
        type: 'danger'
    });

    // Initialize Socket
    useEffect(() => {
        const newSocket = io(import.meta.env.VITE_SOCKET_URL);
        setSocket(newSocket);

        return () => {
            newSocket.disconnect();
        };
    }, []);

    // Handle Start Chat from Profile/Search (via state)
    useEffect(() => {
        const startChat = async () => {
            if (location.state?.targetUserId) {
                try {
                    const res = await startConversation(location.state.targetUserId);
                    const room = res.data;
                    setActiveRoomId(room.id);
                    // Reload conversations explicitly or optimistically add
                    await fetchConvos();
                } catch (error) {
                    console.error("Failed to start chat", error);
                }
            }
        };

        const fetchConvos = async () => {
            try {
                const res = await getConversations();
                setConversations(res.data);
            } catch (error) {
                console.error("Lỗi lấy danh sách chat", error);
            } finally {
                setLoading(false);
            }
        };

        fetchConvos().then(() => {
            if (location.state?.targetUserId) startChat();
        });
    }, [location.state]); // Depend on location.state so it runs when navigating with state

    // Clear messages when switching rooms
    useEffect(() => {
        setMessages([]);
        setHasMore(true);
    }, [activeRoomId]);

    // Handle Active Room
    useEffect(() => {
        if (!activeRoomId || !socket) return;

        // Fetch messages
        const fetchMsgs = async () => {
            try {
                const res = await getMessages(activeRoomId);
                setMessages(res.data);
                setHasMore(res.data.length === 10); // If < 10 returned, no more

                // Use instant scroll for initial load
                setTimeout(() => {
                    scrollToBottom(false);
                }, 100);

                // Reset unread count locally
                setConversations(prev => prev.map(c =>
                    c.id === activeRoomId ? { ...c, unreadCount: 0 } : c
                ));

                // Mark as read when opening room
                await markMessagesRead(activeRoomId);
            } catch (error) {
                console.error("Lỗi lấy tin nhắn", error);
            }
        };
        fetchMsgs();

        // Join Room
        socket.emit('join_room', activeRoomId);

        // Listen for new messages
        const handleReceiveMessage = (data: any) => {
            if (Number(data.roomId) === activeRoomId) {
                setMessages((prev) => [...prev, data.messageData]);
                scrollToBottom(true); // Smooth scroll for new messages

                // Update conversation list last message without incrementing unread
                setConversations(prev => prev.map(c =>
                    c.id === activeRoomId
                        ? { ...c, lastMessage: { content: data.messageData.content, createdAt: data.messageData.createdAt } }
                        : c
                ));

                // Mark as read immediately if window is focused (simplified: just call it)
                markMessagesRead(activeRoomId);
            } else {
                // Sent to another room, update unread count
                setConversations(prev => prev.map(c => {
                    if (c.id === Number(data.roomId)) {
                        return {
                            ...c,
                            unreadCount: (c.unreadCount || 0) + 1,
                            lastMessage: { content: data.messageData.content, createdAt: data.messageData.createdAt }
                        };
                    }
                    return c;
                }));
            }
        };

        // ... rest of listeners ...

        const handleMessagesRead = (data: any) => {
            console.log("RX: messages_read event", data);

            // If I am the reader, ignore (I read their messages, doesn't mean they read mine)
            if (data.readerId === user?.id) return;

            if (Number(data.roomId) === activeRoomId) {
                // Sent messages read by other
                setMessages((prev) => prev.map(msg => {
                    if (msg.senderId === user?.id) return { ...msg, isRead: true };
                    return msg;
                }));
            }
        };

        const handleMessageDeleted = (data: any) => {
            if (Number(data.roomId) === activeRoomId) {
                setMessages((prev) => prev.filter(m => m.id !== Number(data.messageId)));
                setConversations(prev => prev.map(c => {
                    if (c.id === activeRoomId && c.lastMessage?.content && messages.length > 0) {
                        return c;
                    }
                    return c;
                }));
            }
        };

        const handleMessageUpdated = (data: any) => {
            if (Number(data.message.roomId) === activeRoomId) {
                setMessages((prev) => prev.map(m => m.id === data.message.id ? data.message : m));
            }
        };

        socket.on('receive_message', handleReceiveMessage);
        socket.on('messages_read', handleMessagesRead);
        socket.on('message_deleted', handleMessageDeleted);
        socket.on('message_updated', handleMessageUpdated);

        return () => {
            socket.off('receive_message', handleReceiveMessage);
            socket.off('messages_read', handleMessagesRead);
            socket.off('message_deleted', handleMessageDeleted);
            socket.off('message_updated', handleMessageUpdated);
        };
    }, [activeRoomId, socket]);

    // Scroll Listener for History
    const handleScroll = async (e: React.UIEvent<HTMLDivElement>) => {
        const { scrollTop } = e.currentTarget;
        // Increase threshold to 10px to easily trigger on mobile touch
        if (scrollTop <= 10 && hasMore && !loadingMore && messages.length > 0) {
            setLoadingMore(true);
            const currentScrollHeight = e.currentTarget.scrollHeight;

            try {
                const oldestMsgId = messages[0].id;
                const res = await getMessages(activeRoomId!, oldestMsgId);

                if (res.data.length > 0) {
                    setMessages(prev => [...res.data, ...prev]);
                    // Adjust scroll position to maintain view
                    setTimeout(() => {
                        if (scrollContainerRef.current) {
                            scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight - currentScrollHeight;
                        }
                    }, 0);
                    if (res.data.length < 10) setHasMore(false);
                } else {
                    setHasMore(false);
                }
            } catch (error) {
                console.error("Lỗi tải tin nhắn cũ", error);
            } finally {
                setLoadingMore(false);
            }
        }
    };

    // Click outside to close menus
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            // Close room menu if click outside
            if (roomMenuRef.current && !roomMenuRef.current.contains(e.target as Node)) {
                setShowRoomMenu(false);
            }
            // Close message menu if click outside
            if (msgMenuRef.current && !msgMenuRef.current.contains(e.target as Node)) {
                setMsgMenuId(null);
            }
        };

        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            // Validate size (e.g. 50MB)
            if (file.size > 50 * 1024 * 1024) {
                toast.error('File quá lớn (Tối đa 50MB)');
                return;
            }
            setSelectedFile(file);
            const url = URL.createObjectURL(file);
            setPreviewUrl(url);
        }
    };

    const scrollToBottom = (smooth = true) => {
        messagesEndRef.current?.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto' });
    };

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if ((!newMessage.trim() && !selectedFile) || !activeRoomId || !user) return;

        const tempContent = newMessage;
        const tempFile = selectedFile;

        // Clear input immediately
        setNewMessage('');
        setSelectedFile(null);
        setPreviewUrl(null);
        if (fileInputRef.current) fileInputRef.current.value = '';

        try {
            // Save to DB
            const res = await sendMessage(activeRoomId, tempContent, tempFile || undefined);
            const savedMessage = res.data;

            // Update Local State (if Socket doesn't do it faster, but usually we rely on socket for consistency or optimistic update)
            // Here we just rely on socket receive or push optimistic
            setMessages((prev) => [...prev, savedMessage]);

            // Emit to Socket (so other user gets it)
            socket?.emit('send_message', {
                roomId: activeRoomId,
                messageData: savedMessage // Send full message object
            });

            scrollToBottom(true);

            // Update conversation list
            let displayContent = tempContent;
            if (!tempContent && savedMessage.mediaType === 'image') displayContent = '[Hình ảnh]';
            if (!tempContent && savedMessage.mediaType === 'video') displayContent = '[Video]';

            setConversations(prev => prev.map(c =>
                c.id === activeRoomId
                    ? { ...c, lastMessage: { content: displayContent, createdAt: new Date().toISOString() } }
                    : c
            ));

        } catch (error) {
            console.error("Lỗi gửi tin", error);
            setNewMessage(tempContent);
            if (tempFile) {
                setSelectedFile(tempFile); // simplified revert
                setPreviewUrl(URL.createObjectURL(tempFile));
            }
            toast.error('Gửi tin thất bại');
        }
    };

    // New Handlers
    const closeConfirmModal = () => setConfirmModal(prev => ({ ...prev, isOpen: false }));

    const handleDeleteConv = async () => {
        if (!activeRoomId) return;
        setConfirmModal({
            isOpen: true,
            title: 'Xóa cuộc trò chuyện',
            message: 'Bạn có chắc chắn muốn xóa cuộc trò chuyện này? Hành động này không thể hoàn tác.',
            type: 'danger',
            onConfirm: async () => {
                try {
                    await deleteConversation(activeRoomId);
                    setConversations(prev => prev.filter(c => c.id !== activeRoomId));
                    setActiveRoomId(null);
                    setShowRoomMenu(false);
                    toast.success('Đã xóa cuộc trò chuyện');
                    closeConfirmModal();
                } catch (error) {
                    toast.error('Lỗi xóa cuộc trò chuyện');
                    closeConfirmModal();
                }
            }
        });
    };

    // Thu hồi (Recall) - Xóa cho tất cả mọi người
    const handleRecallMsg = async (msgId: number) => {
        setConfirmModal({
            isOpen: true,
            title: 'Thu hồi tin nhắn',
            message: 'Tin nhắn sẽ bị thu hồi với tất cả thành viên trong cuộc trò chuyện.',
            type: 'danger',
            onConfirm: async () => {
                try {
                    await deleteMessage(msgId, 'recall');
                    // Optimistic update handled by socket 'message_deleted' usually, but here:
                    setMessages(prev => prev.filter(m => m.id !== msgId));
                    setMsgMenuId(null);
                    toast.success('Đã thu hồi tin nhắn');
                    closeConfirmModal();
                } catch (error) {
                    toast.error('Lỗi thu hồi tin nhắn');
                    closeConfirmModal();
                }
            }
        });
    };

    // Xóa phía tôi (Delete for me)
    const handleDeleteMsgForMe = async (msgId: number) => {
        setConfirmModal({
            isOpen: true,
            title: 'Xóa ở phía tôi',
            message: 'Tin nhắn sẽ chỉ bị xóa khỏi lịch sử chat của bạn. Người khác vẫn sẽ nhìn thấy.',
            type: 'info',
            onConfirm: async () => {
                try {
                    await deleteMessage(msgId, 'me');
                    setMessages(prev => prev.filter(m => m.id !== msgId));
                    setMsgMenuId(null);
                    toast.success('Đã xóa tin nhắn');
                    closeConfirmModal();
                } catch (error) {
                    toast.error('Lỗi xóa tin nhắn');
                    closeConfirmModal();
                }
            }
        });
    };

    const handleUpdateMsg = async () => {
        if (!editingMsgId || !editContent.trim()) return;
        try {
            const res = await updateMessage(editingMsgId, editContent);
            setMessages(prev => prev.map(m => m.id === editingMsgId ? res.data : m));
            setEditingMsgId(null);
            setEditContent('');
            toast.success('Đã sửa tin nhắn');
        } catch (error) {
            toast.error('Lỗi sửa tin nhắn');
        }
    };

    const startEditing = (msg: Message) => {
        setEditingMsgId(msg.id);
        setEditContent(msg.content);
        setMsgMenuId(null);
    };

    const activeConversation = conversations.find(c => c.id === activeRoomId);

    if (loading) return <div className="text-center p-10 text-slate-400">Đang tải đoạn chat...</div>;

    return (
        <div className="fixed inset-x-2 top-[70px] bottom-[50px] z-30 lg:z-auto lg:static lg:inset-auto flex lg:h-[calc(100vh-80px)] glass-card overflow-hidden">
            {/* Sidebar / Conversation List */}
            <div className={`w-full lg:w-[30%] lg:max-w-sm border-r border-indigo-50 dark:border-slate-800 flex flex-col ${activeRoomId ? 'hidden lg:flex' : 'flex'}`}>
                <div className="p-3 border-b border-indigo-50 dark:border-slate-800 space-y-3">
                    <h2 className="text-xl font-bold text-slate-800 dark:text-white">Tin nhắn</h2>
                    <div className="flex gap-2">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                            <input
                                type="text"
                                placeholder="Tìm kiếm..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 pl-9 pr-3 py-2 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                            />
                        </div>
                        <button
                            onClick={() => setShowCreateGroupModal(true)}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white p-2 rounded-xl flex items-center justify-center shadow-md shadow-indigo-500/20 transition-all active:scale-95"
                            title="Tạo nhóm mới"
                        >
                            <Users size={18} />
                        </button>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto">
                    {conversations.filter(c => c.name.toLowerCase().includes(searchTerm.toLowerCase())).length === 0 ? (
                        <div className="p-4 text-center text-slate-400 text-sm">Không tìm thấy cuộc trò chuyện.</div>
                    ) : (
                        conversations.filter(c => c.name.toLowerCase().includes(searchTerm.toLowerCase())).map((c) => (
                            <div
                                key={c.id}
                                onClick={() => setActiveRoomId(c.id)}
                                className={`flex items-center gap-3 p-3 cursor-pointer hover:bg-white/50 dark:hover:bg-slate-800/50 transition-colors border-b border-slate-50 dark:border-slate-800/50 ${activeRoomId === c.id ? 'bg-indigo-50/80 dark:bg-indigo-900/20' : ''}`}
                            >
                                <img
                                    src={getAvatarUrl(c.avatar, c.name)}
                                    className="w-10 h-10 rounded-full border border-white dark:border-slate-700 shadow-sm object-cover"
                                    alt="Avatar"
                                />
                                <div className="flex-1 min-w-0">
                                    <h4 className="font-semibold text-slate-800 dark:text-slate-200 truncate text-sm">{c.name}</h4>
                                    <p className={`text-xs truncate ${activeRoomId === c.id ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-500 dark:text-slate-400'}`}>
                                        {c.unreadCount ? <span className="font-bold text-slate-900 dark:text-white">{c.lastMessage?.content}</span> : (c.lastMessage?.content || <span className="italic text-slate-400 dark:text-slate-500">Bắt đầu trò chuyện</span>)}
                                    </p>
                                </div>
                                <div className="flex flex-col items-end gap-1">
                                    {c.lastMessage && (
                                        <span className="text-[10px] text-slate-400 dark:text-slate-500 whitespace-nowrap">
                                            {formatDistanceToNow(new Date(c.lastMessage.createdAt), { locale: vi, addSuffix: false })}
                                        </span>
                                    )}
                                    {!!c.unreadCount && c.unreadCount > 0 && (
                                        <span className="bg-red-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full min-w-[1.25rem] text-center">
                                            {c.unreadCount}
                                        </span>
                                    )}
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* Chat Box */}
            <div className={`flex-1 flex-col bg-white/30 dark:bg-slate-900/30 min-w-0 ${!activeRoomId ? 'hidden lg:flex' : 'flex'}`}>
                {activeRoomId ? (
                    <>
                        {/* Chat Header */}
                        <div className="p-4 border-b border-indigo-50 dark:border-slate-800 bg-white/60 dark:bg-slate-900/60 backdrop-blur-sm flex justify-between items-center z-10">
                            <div className="flex items-center gap-3">
                                <button onClick={() => setActiveRoomId(null)} className="lg:hidden text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 text-[24px]">
                                    ❮
                                </button>
                                {activeConversation?.isGroup ? (
                                    <button
                                        onClick={() => setShowGroupManagement(true)}
                                        className="flex items-center gap-3 hover:opacity-80 transition-opacity"
                                    >
                                        <img
                                            src={getAvatarUrl(activeConversation?.avatar, activeConversation?.name)}
                                            className="w-10 h-10 rounded-full border border-white dark:border-slate-700 shadow-sm object-cover"
                                            alt="Avatar"
                                        />
                                        <div>
                                            <h4 className="font-bold text-slate-800 dark:text-white truncate max-w-[200px]">{activeConversation?.name}</h4>
                                            <span className="text-xs text-slate-500 dark:text-slate-400">{activeConversation.memberCount} thành viên</span>
                                        </div>
                                    </button>
                                ) : (
                                    <Link to={`/profile/${activeConversation?.otherMemberId}`} className="flex items-center gap-3 hover:opacity-80 transition-opacity">
                                        <img
                                            src={getAvatarUrl(activeConversation?.avatar, activeConversation?.name)}
                                            className="w-10 h-10 rounded-full border border-white dark:border-slate-700 shadow-sm object-cover"
                                            alt="Avatar"
                                        />
                                        <div>
                                            <h4 className="font-bold text-slate-800 dark:text-white truncate max-w-[200px]">{activeConversation?.name}</h4>
                                            <span className="text-xs text-green-500 flex items-center gap-1">● Đang hoạt động</span>
                                        </div>
                                    </Link>
                                )}
                            </div>
                            <div className="flex gap-2 text-slate-400 dark:text-slate-500 relative" ref={roomMenuRef}>
                                <Phone size={20} className="hover:text-indigo-600 dark:hover:text-indigo-400 cursor-pointer" />
                                <MoreVertical
                                    size={20}
                                    className="hover:text-indigo-600 dark:hover:text-indigo-400 cursor-pointer"
                                    onClick={() => setShowRoomMenu(!showRoomMenu)}
                                />
                                {showRoomMenu && (
                                    <div className="absolute right-0 top-8 w-56 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-100 dark:border-slate-700 z-50 overflow-hidden animate-scale-in">
                                        {activeConversation?.isGroup && (
                                            <button
                                                onClick={() => {
                                                    setShowGroupManagement(true);
                                                    setShowRoomMenu(false);
                                                }}
                                                className="w-full text-left px-4 py-3 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-2 text-sm font-medium transition-colors"
                                            >
                                                <Users size={16} />
                                                Quản lý nhóm
                                            </button>
                                        )}
                                        <button
                                            onClick={handleDeleteConv}
                                            className="w-full text-left px-4 py-3 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-2 text-sm font-medium transition-colors"
                                        >
                                            <Trash2 size={16} />
                                            Xóa cuộc trò chuyện
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Messages Area */}
                        <div
                            className="flex-1 overflow-y-auto p-4 space-y-6 no-scrollbar overscroll-y-contain"
                            style={{ WebkitOverflowScrolling: 'touch', overscrollBehaviorY: 'contain' }} // Prevent pull-to-refresh
                            ref={scrollContainerRef}
                            onScroll={handleScroll}
                        >
                            {loadingMore && <div className="text-center text-xs text-slate-400 py-2">Đang tải tin cũ...</div>}
                            {messages.map((msg, idx) => {
                                const isMe = msg.senderId === user?.id;
                                const showAvatar = !isMe && (idx === 0 || messages[idx - 1].senderId !== msg.senderId);
                                const isEditing = editingMsgId === msg.id;

                                return (
                                    <div
                                        key={msg.id}
                                        className={`group flex ${isMe ? 'justify-end' : 'justify-start'} items-start gap-2 relative`}
                                        onMouseLeave={() => setMsgMenuId(null)}
                                    >
                                        {!isMe && (
                                            <div className={`w-8 flex-shrink-0 ${activeConversation?.isGroup ? 'mt-5' : ''}`}>
                                                {showAvatar && (
                                                    <Link to={`/profile/${msg.senderId}`}>
                                                        <img
                                                            src={getAvatarUrl(msg.sender.avatar, msg.sender.username)}
                                                            className="w-8 h-8 rounded-full shadow-sm hover:opacity-80 transition-opacity"
                                                            title={msg.sender.fullName}
                                                            alt={msg.sender.fullName}
                                                        />
                                                    </Link>
                                                )}
                                            </div>
                                        )}

                                        {/* Message Actions (Only for Me) */}
                                        {isMe && !isEditing && (
                                            <div className="relative self-center mr-2 order-first">
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); setMsgMenuId(msgMenuId === msg.id ? null : msg.id); }}
                                                    className="p-1 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 bg-white/50 dark:bg-slate-800/50 rounded-full hover:bg-white dark:hover:bg-slate-700 transition-opacity"
                                                >
                                                    <MoreHorizontal size={16} />
                                                </button>
                                                {msgMenuId === msg.id && (
                                                    <div ref={msgMenuRef} className="absolute right-0 top-8 w-32 bg-white dark:bg-slate-800 rounded-lg shadow-xl border border-slate-100 dark:border-slate-700 z-50 overflow-hidden animate-scale-in">
                                                        <button
                                                            onClick={() => startEditing(msg)}
                                                            className="w-full text-left px-3 py-2 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-2 text-xs font-medium"
                                                        >
                                                            <Edit2 size={14} /> Sửa
                                                        </button>
                                                        <button
                                                            onClick={() => handleDeleteMsgForMe(msg.id)}
                                                            className="w-full text-left px-3 py-2 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-2 text-xs font-medium"
                                                        >
                                                            <Trash2 size={14} /> Xóa ở phía tôi
                                                        </button>
                                                        {/* Check 1h limit for recall */
                                                            (new Date().getTime() - new Date(msg.createdAt).getTime() < 60 * 60 * 1000) && (
                                                                <button
                                                                    onClick={() => handleRecallMsg(msg.id)}
                                                                    className="w-full text-left px-3 py-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-2 text-xs font-medium"
                                                                >
                                                                    <RotateCcw size={14} /> Thu hồi
                                                                </button>
                                                            )
                                                        }
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        <div className={`relative max-w-[70%] flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                                            {/* Show sender name in group chat */}
                                            {activeConversation?.isGroup && !isMe && showAvatar && (
                                                <Link
                                                    to={`/profile/${msg.senderId}`}
                                                    className="text-[11px] text-slate-500 dark:text-slate-400 mb-1 ml-1 block hover:underline hover:text-indigo-500 transition-colors font-medium"
                                                >
                                                    {msg.sender.fullName || msg.sender.username}
                                                </Link>
                                            )}

                                            {isEditing ? (
                                                <div className="flex gap-2 items-center">
                                                    <input
                                                        value={editContent}
                                                        onChange={(e) => setEditContent(e.target.value)}
                                                        className="bg-white dark:bg-slate-800 border border-indigo-200 dark:border-slate-600 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 w-full min-w-[200px]"
                                                        autoFocus
                                                        onKeyDown={(e) => e.key === 'Enter' && handleUpdateMsg()}
                                                    />
                                                    <button onClick={handleUpdateMsg} className="p-1.5 bg-indigo-500 text-white rounded-full hover:bg-indigo-600"><Check size={14} /></button>
                                                    <button onClick={() => setEditingMsgId(null)} className="p-1.5 bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-full hover:bg-slate-300 dark:hover:bg-slate-600"><X size={14} /></button>
                                                </div>
                                            ) : (
                                                <div className="flex flex-col gap-1">
                                                    {/* Media Block (Image/Video) */}
                                                    {msg.mediaUrl && (
                                                        <div className="">
                                                            {msg.mediaType === 'image' ? (
                                                                <img
                                                                    src={msg.mediaUrl}
                                                                    alt="Attached"
                                                                    className="max-w-[250px] max-h-[300px] object-cover rounded-2xl shadow-sm cursor-pointer hover:opacity-95 bg-transparent"
                                                                    onClick={() => setViewingImage(msg.mediaUrl!)}
                                                                />
                                                            ) : (
                                                                <video
                                                                    src={msg.mediaUrl}
                                                                    controls
                                                                    className="max-w-[250px] max-h-[300px] object-cover rounded-2xl shadow-sm bg-black"
                                                                />
                                                            )}
                                                        </div>
                                                    )}

                                                    {/* Text Content Block */}
                                                    {msg.content && (
                                                        <div
                                                            className={`px-4 py-2 text-sm leading-relaxed shadow-sm relative overflow-hidden max-w-fit ${isMe
                                                                ? 'bg-gradient-to-tr from-indigo-600 to-purple-600 text-white rounded-2xl rounded-br-none self-end'
                                                                : 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 rounded-2xl rounded-bl-none self-start'
                                                                }`}
                                                        >
                                                            {msg.content}
                                                            {msg.isEdited && (
                                                                <span className="text-[10px] opacity-70 ml-1 italic block text-right">đã sửa</span>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            )}

                                            {/* Timestamp Tooltip/Display - Moved to Bottom */}
                                            {!isEditing && (
                                                <div className={`text-[10px] text-slate-400 dark:text-slate-500 mt-1 mx-1 ${isMe ? 'text-right' : 'text-left'}`}>
                                                    {format(new Date(msg.createdAt), "HH:mm dd/MM/yyyy", { locale: vi })}
                                                    {isMe && (
                                                        <span className="ml-2">
                                                            {msg.isRead ? "Đã xem" : "Đã gửi"}
                                                        </span>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                            <div ref={messagesEndRef} />
                        </div>

                        {/* Input Area */}
                        {/* Input Area */}
                        <div className="px-3 py-3 bg-white/60 dark:bg-slate-900/60 backdrop-blur-sm border-t border-indigo-50 dark:border-slate-800">
                            {previewUrl && (
                                <div className="mb-2 relative inline-block">
                                    {selectedFile?.type.startsWith('image/') ? (
                                        <img src={previewUrl} alt="Preview" className="h-20 w-auto rounded-lg shadow-md object-cover border border-white dark:border-slate-700" />
                                    ) : (
                                        <video src={previewUrl} className="h-20 w-auto rounded-lg shadow-md bg-black border border-white dark:border-slate-700" />
                                    )}
                                    <button
                                        onClick={() => {
                                            setSelectedFile(null);
                                            setPreviewUrl(null);
                                            if (fileInputRef.current) fileInputRef.current.value = '';
                                        }}
                                        className="absolute -top-2 -right-2 bg-slate-500 text-white rounded-full p-1 hover:bg-slate-600 shadow-sm"
                                    >
                                        <X size={12} />
                                    </button>
                                </div>
                            )}
                            <form onSubmit={handleSendMessage} className="flex items-center gap-2 w-full">
                                <input
                                    type="file"
                                    ref={fileInputRef}
                                    onChange={handleFileSelect}
                                    className="hidden"
                                    accept="image/*,video/mp4,video/webm"
                                />
                                <input
                                    type="text"
                                    value={newMessage}
                                    onChange={(e) => setNewMessage(e.target.value)}
                                    placeholder="Nhập tin nhắn..."
                                    className="flex-1 min-w-0 bg-white dark:bg-slate-800 border border-indigo-100 dark:border-slate-700 text-slate-800 dark:text-slate-200 rounded-full px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all font-medium placeholder:text-slate-400 dark:placeholder:text-slate-500"
                                />
                                <button
                                    type="button"
                                    onClick={() => fileInputRef.current?.click()}
                                    className="p-3 text-slate-400 hover:text-indigo-600 dark:text-slate-500 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors"
                                    title="Đính kèm ảnh/video"
                                >
                                    <ImageIcon size={20} />
                                </button>
                                <button
                                    type="submit"
                                    disabled={!newMessage.trim() && !selectedFile}
                                    className="p-3 bg-indigo-600 text-white rounded-full shadow-lg shadow-indigo-500/30 hover:bg-indigo-700 disabled:opacity-50 disabled:shadow-none transition-all hover:scale-105 active:scale-95"
                                >
                                    <Send size={20} />
                                </button>
                            </form>
                        </div>
                    </>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-slate-300 dark:text-slate-700">
                        <MessageCircle size={64} className="mb-4 text-indigo-100 dark:text-indigo-900/20" />
                        <p className="text-lg font-medium text-slate-400 dark:text-slate-600">Chọn một cuộc trò chuyện để bắt đầu</p>
                    </div>
                )}
            </div>


            {/* Custom Confirmation Modal */}
            {
                confirmModal.isOpen && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm animate-fade-in">
                        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl p-6 w-96 transform transition-all scale-100 animate-scale-in border border-slate-100 dark:border-slate-700">
                            <h3 className={`text-lg font-bold mb-2 ${confirmModal.type === 'danger' ? 'text-red-600' : 'text-slate-800 dark:text-white'}`}>
                                {confirmModal.title}
                            </h3>
                            <p className="text-slate-600 dark:text-slate-300 mb-6 text-sm leading-relaxed">
                                {confirmModal.message}
                            </p>
                            <div className="flex justify-end gap-3">
                                <button
                                    onClick={closeConfirmModal}
                                    className="px-4 py-2 rounded-xl text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700 font-medium text-sm transition-colors"
                                >
                                    Hủy bỏ
                                </button>
                                <button
                                    onClick={confirmModal.onConfirm}
                                    className={`px-4 py-2 rounded-xl text-white font-medium text-sm shadow-lg transform active:scale-95 transition-all ${confirmModal.type === 'danger' ? 'bg-red-500 hover:bg-red-600 shadow-red-500/30' : 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-500/30'}`}
                                >
                                    Xác nhận
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* Create Group Modal */}
            <CreateGroupModal
                isOpen={showCreateGroupModal}
                onClose={() => setShowCreateGroupModal(false)}
                onGroupCreated={async () => {
                    const res = await getConversations();
                    setConversations(res.data);
                }}
            />

            {/* Group Management Modal */}
            {
                activeConversation?.isGroup && (
                    <GroupManagementModal
                        isOpen={showGroupManagement}
                        onClose={() => setShowGroupManagement(false)}
                        roomId={activeRoomId!}
                        groupName={activeConversation.name}
                        groupAvatar={activeConversation.avatar}
                        members={activeConversation?.members || []}
                        createdBy={activeConversation?.createdBy}
                        onUpdate={async () => {
                            const res = await getConversations();
                            setConversations(res.data);
                        }}
                        onDelete={() => {
                            setActiveRoomId(null);
                            setMessages([]);
                        }}
                    />
                )
            }
            <ImageModal
                src={viewingImage}
                onClose={() => setViewingImage(null)}
            />
        </div>
    );
}
