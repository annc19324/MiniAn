// src/pages/Profile.tsx
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getProfile, getUserPosts, followUser } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { UserPlus, UserCheck, MessageCircle, MoreHorizontal, MapPin, Link as LinkIcon, Calendar, Heart, MessageSquare } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { vi } from 'date-fns/locale';

interface UserProfile {
    id: number;
    username: string;
    fullName: string;
    avatar?: string;
    bio?: string;
    role: string;
    isVip: boolean;
    createdAt: string;
    _count: {
        followers: number;
        following: number;
        posts: number;
    };
    isFollowing: boolean;
}

interface Post {
    id: number;
    content: string;
    image?: string;
    createdAt: string;
    _count: {
        likes: number;
        comments: number;
    };
}

export default function Profile() {
    const { id } = useParams();
    const { user: currentUser } = useAuth();
    const navigate = useNavigate();

    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [posts, setPosts] = useState<Post[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            if (!id) return;
            setLoading(true);
            try {
                const [profileRes, postsRes] = await Promise.all([
                    getProfile(Number(id)),
                    getUserPosts(Number(id))
                ]);
                setProfile(profileRes.data);
                setPosts(postsRes.data);
            } catch (error) {
                console.error("Lỗi tải profile", error);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [id]);

    const handleFollow = async () => {
        if (!profile) return;
        try {
            await followUser(profile.id);
            setProfile(prev => prev ? {
                ...prev,
                isFollowing: !prev.isFollowing,
                _count: {
                    ...prev._count,
                    followers: prev.isFollowing ? prev._count.followers - 1 : prev._count.followers + 1
                }
            } : null);
        } catch (error) {
            console.error("Lỗi follow", error);
        }
    };

    const handleMessage = () => {
        if (!profile) return;
        navigate('/chat', { state: { targetUserId: profile.id } });
    };

    if (loading) return <div className="text-center p-10 text-slate-400">Đang tải hồ sơ...</div>;
    if (!profile) return <div className="text-center p-10 text-slate-400">Không tìm thấy người dùng.</div>;

    const isMe = currentUser?.id === profile.id;

    return (
        <div className="space-y-6">
            {/* Header Card */}
            <div className="glass-card overflow-hidden">
                {/* Cover Image (Placeholder for now) */}
                <div className="h-48 bg-gradient-to-r from-indigo-400 to-purple-400 relative">
                    {/* Actions */}
                    <div className="absolute top-4 right-4 flex gap-2">
                        {isMe ? (
                            <button className="bg-black/20 hover:bg-black/30 text-white px-4 py-2 rounded-lg backdrop-blur-md font-medium transition-all">
                                Chỉnh sửa trang cá nhân
                            </button>
                        ) : (
                            <>
                                <button className="bg-black/20 hover:bg-black/30 p-2 rounded-full text-white backdrop-blur-md">
                                    <MoreHorizontal />
                                </button>
                            </>
                        )}
                    </div>
                </div>

                <div className="px-6 pb-6 relative">
                    {/* Avatar */}
                    <div className="-mt-16 mb-4 flex justify-between items-end">
                        <img
                            src={profile.avatar || `https://ui-avatars.com/api/?name=${profile.username}&background=random`}
                            className="w-32 h-32 rounded-full border-4 border-white shadow-lg object-cover bg-white"
                            alt="Avatar"
                        />

                        <div className="flex gap-3 mb-2">
                            {!isMe && (
                                <>
                                    <button
                                        onClick={handleMessage}
                                        className="p-2.5 text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
                                    >
                                        <MessageCircle size={20} />
                                    </button>
                                    <button
                                        onClick={handleFollow}
                                        className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold transition-all shadow-lg ${profile.isFollowing
                                                ? 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                                                : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-indigo-500/30'
                                            }`}
                                    >
                                        {profile.isFollowing ? <UserCheck size={18} /> : <UserPlus size={18} />}
                                        {profile.isFollowing ? 'Đang theo dõi' : 'Theo dõi'}
                                    </button>
                                </>
                            )}
                        </div>
                    </div>

                    {/* Info */}
                    <div>
                        <div className="flex items-center gap-2">
                            <h1 className="text-2xl font-bold text-slate-900">{profile.fullName}</h1>
                            {profile.isVip && <span className="text-yellow-500 text-lg">👑</span>}
                            {profile.role === 'ADMIN' && <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full font-bold">ADMIN</span>}
                        </div>
                        <p className="text-slate-500 font-medium">@{profile.username}</p>

                        {profile.bio && <p className="mt-3 text-slate-700 leading-relaxed max-w-2xl">{profile.bio}</p>}

                        <div className="flex flex-wrap gap-4 mt-4 text-sm text-slate-500">
                            <div className="flex items-center gap-1">
                                <Calendar size={16} />
                                <span>Đã tham gia {formatDistanceToNow(new Date(profile.createdAt), { locale: vi, addSuffix: true })}</span>
                            </div>
                            <div className="flex items-center gap-1">
                                <MapPin size={16} />
                                <span>Vietnam</span>
                            </div>
                        </div>

                        {/* Stats */}
                        <div className="flex gap-6 mt-6 border-t border-slate-100 pt-6">
                            <div className="text-center">
                                <span className="block text-xl font-black text-slate-800">{profile._count.posts}</span>
                                <span className="text-xs text-slate-500 font-medium uppercase tracking-wide">Bài viết</span>
                            </div>
                            <div className="text-center">
                                <span className="block text-xl font-black text-slate-800">{profile._count.followers}</span>
                                <span className="text-xs text-slate-500 font-medium uppercase tracking-wide">Người theo dõi</span>
                            </div>
                            <div className="text-center">
                                <span className="block text-xl font-black text-slate-800">{profile._count.following}</span>
                                <span className="text-xs text-slate-500 font-medium uppercase tracking-wide">Đang theo dõi</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Content Tabs (For now just Posts) */}
            <h3 className="text-lg font-bold text-slate-800 px-2">Bài viết</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {posts.length === 0 ? (
                    <div className="col-span-full text-center py-10 text-slate-400">Người dùng chưa có bài viết nào.</div>
                ) : (
                    posts.map(post => (
                        <div key={post.id} className="glass-card p-4 hover:bg-white/80 transition-all cursor-pointer">
                            <p className="mb-3 text-slate-800 line-clamp-3 leading-relaxed">{post.content}</p>
                            {post.image && (
                                <img src={post.image} className="w-full h-48 object-cover rounded-xl mb-3" alt="Post" />
                            )}
                            <div className="flex justify-between text-xs text-slate-400 border-t border-slate-100 pt-3 mt-auto">
                                <span className="flex items-center gap-1"><Heart size={14} /> {post._count.likes}</span>
                                <span className="flex items-center gap-1"><MessageSquare size={14} /> {post._count.comments}</span>
                                <span>{formatDistanceToNow(new Date(post.createdAt), { locale: vi })}</span>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
