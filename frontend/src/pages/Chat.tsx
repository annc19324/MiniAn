// src/pages/Chat.tsx
import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { getConversations, getMessages, sendMessage, startConversation, markMessagesRead } from '../services/api';
import { io, Socket } from 'socket.io-client';
import { Send, User as UserIcon, MoreVertical, Phone, MessageCircle } from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';
import { vi } from 'date-fns/locale';
import { useLocation } from 'react-router-dom';

interface Message {
    id: number;
    content: string;
    senderId: number;
    sender: {
        id: number;
        username: string;
        avatar?: string;
    };
    createdAt: string;
    isRead?: boolean;
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
}

export default function Chat() {
    const { user } = useAuth();
    const location = useLocation();
    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [messages, setMessages] = useState<Message[]>([]);
    const [activeRoomId, setActiveRoomId] = useState<number | null>(null);
    const [newMessage, setNewMessage] = useState('');
    const [socket, setSocket] = useState<Socket | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const [loading, setLoading] = useState(true);

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

    // Handle Active Room
    useEffect(() => {
        if (!activeRoomId || !socket) return;

        // Fetch messages
        const fetchMsgs = async () => {
            try {
                const res = await getMessages(activeRoomId);
                setMessages(res.data);
                scrollToBottom();

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
                scrollToBottom();

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

        socket.on('receive_message', handleReceiveMessage);
        socket.on('messages_read', handleMessagesRead);

        return () => {
            socket.off('receive_message', handleReceiveMessage);
            socket.off('messages_read', handleMessagesRead);
        };
    }, [activeRoomId, socket]);

    // Join all rooms to listen for notifications
    useEffect(() => {
        if (!socket || conversations.length === 0) return;
        conversations.forEach(c => {
            socket.emit('join_room', c.id);
        });
    }, [conversations, socket]);

    const scrollToBottom = () => {
        setTimeout(() => {
            messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }, 100);
    };

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newMessage.trim() || !activeRoomId || !user) return;

        const tempContent = newMessage;
        setNewMessage(''); // Clear input immediately

        try {
            // Save to DB
            const res = await sendMessage(activeRoomId, tempContent);
            const savedMessage = res.data;

            // Update Local State
            setMessages((prev) => [...prev, savedMessage]);

            // Emit to Socket (so other user gets it)
            socket?.emit('send_message', {
                roomId: activeRoomId,
                messageData: savedMessage // Send full message object
            });

            scrollToBottom();

            // Update conversation list
            // Update conversation list
            setConversations(prev => prev.map(c =>
                c.id === activeRoomId
                    ? { ...c, lastMessage: { content: tempContent, createdAt: new Date().toISOString() } }
                    : c
            ));

        } catch (error) {
            console.error("Lỗi gửi tin", error);
            setNewMessage(tempContent); // Revert if failed
        }
    };



    const activeConversation = conversations.find(c => c.id === activeRoomId);

    if (loading) return <div className="text-center p-10 text-slate-400">Đang tải đoạn chat...</div>;

    return (
        <div className="flex h-[calc(100vh-120px)] md:h-[calc(100vh-80px)] glass-card overflow-hidden">
            {/* Sidebar / Conversation List */}
            <div className={`w-full md:w-80 border-r border-indigo-50 flex flex-col ${activeRoomId ? 'hidden md:flex' : 'flex'}`}>
                <div className="p-4 border-b border-indigo-50">
                    <h2 className="text-xl font-bold text-slate-800">Tin nhắn</h2>
                </div>
                <div className="flex-1 overflow-y-auto">
                    {conversations.length === 0 ? (
                        <div className="p-4 text-center text-slate-400 text-sm">Chưa có cuộc trò chuyện nào.</div>
                    ) : (
                        conversations.map((c) => (
                            <div
                                key={c.id}
                                onClick={() => setActiveRoomId(c.id)}
                                className={`flex items-center gap-3 p-4 cursor-pointer hover:bg-white/50 transition-colors ${activeRoomId === c.id ? 'bg-indigo-50/80' : ''}`}
                            >
                                <img
                                    src={c.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(c.name)}&background=random&color=fff&length=1`}
                                    className="w-12 h-12 rounded-full border-2 border-white shadow-sm object-cover"
                                    alt="Avatar"
                                />
                                <div className="flex-1 min-w-0">
                                    <h4 className="font-bold text-slate-800 truncate">{c.name}</h4>
                                    <p className={`text-sm truncate ${activeRoomId === c.id ? 'text-indigo-600' : 'text-slate-500'}`}>
                                        {c.unreadCount ? <span className="font-bold text-slate-900">{c.lastMessage?.content}</span> : (c.lastMessage?.content || <span className="italic text-slate-400">Bắt đầu trò chuyện</span>)}
                                    </p>
                                </div>
                                <div className="flex flex-col items-end">
                                    {c.lastMessage && (
                                        <span className="text-[10px] text-slate-400 whitespace-nowrap mb-1">
                                            {formatDistanceToNow(new Date(c.lastMessage.createdAt), { locale: vi, addSuffix: false })}
                                        </span>
                                    )}
                                    {!!c.unreadCount && c.unreadCount > 0 && (
                                        <span className="bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[1.25rem] text-center">
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
            <div className={`flex-1 flex-col bg-white/30 ${!activeRoomId ? 'hidden md:flex' : 'flex'}`}>
                {activeRoomId ? (
                    <>
                        {/* Chat Header */}
                        <div className="p-4 border-b border-indigo-50 bg-white/60 backdrop-blur-sm flex justify-between items-center z-10">
                            <div className="flex items-center gap-3">
                                <button onClick={() => setActiveRoomId(null)} className="md:hidden text-slate-500 hover:text-indigo-600">
                                    ←
                                </button>
                                <img
                                    src={activeConversation?.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(activeConversation?.name || '')}&background=random&color=fff&length=1`}
                                    className="w-10 h-10 rounded-full border border-white shadow-sm object-cover"
                                    alt="Avatar"
                                />
                                <div>
                                    <h4 className="font-bold text-slate-800">{activeConversation?.name}</h4>
                                    <span className="text-xs text-green-500 flex items-center gap-1">● Đang hoạt động</span>
                                </div>
                            </div>
                            <div className="flex gap-2 text-slate-400">
                                <Phone size={20} className="hover:text-indigo-600 cursor-pointer" />
                                <MoreVertical size={20} className="hover:text-indigo-600 cursor-pointer" />
                            </div>
                        </div>

                        {/* Messages Area */}
                        <div className="flex-1 overflow-y-auto p-4 space-y-6">
                            {messages.map((msg, idx) => {
                                const isMe = msg.senderId === user?.id;
                                const showAvatar = !isMe && (idx === 0 || messages[idx - 1].senderId !== msg.senderId);

                                return (
                                    <div
                                        key={msg.id}
                                        className={`group flex ${isMe ? 'justify-end' : 'justify-start'} items-end gap-2 relative`}
                                    >
                                        {!isMe && (
                                            <div className="w-8 flex-shrink-0">
                                                {showAvatar && (
                                                    <img
                                                        src={msg.sender.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(msg.sender.username)}&background=random&color=fff&length=1`}
                                                        className="w-8 h-8 rounded-full shadow-sm"
                                                        alt="Sender"
                                                    />
                                                )}
                                            </div>
                                        )}

                                        <div className={`relative max-w-[70%]`}>
                                            {/* Timestamp Tooltip/Display */}
                                            <div className={`text-[10px] text-slate-400 mb-1 ${isMe ? 'text-right' : 'text-left'} opacity-0 group-hover:opacity-100 transition-opacity`}>
                                                {format(new Date(msg.createdAt), "HH:mm EE dd/MM/yyyy", { locale: vi })}
                                            </div>

                                            <div
                                                className={`px-4 py-2 rounded-2xl text-sm leading-relaxed shadow-sm relative ${isMe
                                                    ? 'bg-gradient-to-tr from-indigo-600 to-purple-600 text-white rounded-br-none'
                                                    : 'bg-white text-slate-800 rounded-bl-none'
                                                    }`}
                                            >
                                                {msg.content}
                                            </div>
                                            {isMe && (
                                                <div className="text-[10px] text-slate-400 text-right mt-1">
                                                    {msg.isRead ? "Đã xem" : "Đã gửi"}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                            <div ref={messagesEndRef} />
                        </div>

                        {/* Input Area */}
                        <div className="p-4 bg-white/60 backdrop-blur-sm border-t border-indigo-50">
                            <form onSubmit={handleSendMessage} className="flex items-center gap-2">
                                <input
                                    type="text"
                                    value={newMessage}
                                    onChange={(e) => setNewMessage(e.target.value)}
                                    placeholder="Nhập tin nhắn..."
                                    className="flex-1 bg-white border border-indigo-100 text-slate-800 rounded-full px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all font-medium placeholder:text-slate-400"
                                />
                                <button
                                    type="submit"
                                    disabled={!newMessage.trim()}
                                    className="p-3 bg-indigo-600 text-white rounded-full shadow-lg shadow-indigo-500/30 hover:bg-indigo-700 disabled:opacity-50 disabled:shadow-none transition-all hover:scale-105 active:scale-95"
                                >
                                    <Send size={20} />
                                </button>
                            </form>
                        </div>
                    </>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-slate-300">
                        <MessageCircle size={64} className="mb-4 text-indigo-100" />
                        <p className="text-lg font-medium text-slate-400">Chọn một cuộc trò chuyện để bắt đầu</p>
                    </div>
                )}
            </div>
        </div>
    );
}
