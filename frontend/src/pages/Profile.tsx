// src/pages/Profile.tsx
import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { UserPlus, UserCheck, MessageCircle, MoreHorizontal, MapPin, Calendar, Heart, MessageSquare, Share2, Send, Trash2, Edit2, ChevronDown, X, Image as ImageIcon } from 'lucide-react';
import { getProfile, getUserPosts, followUser, updateUserProfile, likePost, commentPost, deletePost } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-hot-toast';
import { getAvatarUrl } from '../utils/avatarUtils';

import ImageModal from '../components/ImageModal';

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
    isFollowedBy?: boolean;
    isFriend?: boolean;
}

interface Post {
    id: number;
    content: string;
    image?: string;
    createdAt: string;
    likes: { userId: number }[];
    comments: any[];
    _count: {
        likes: number;
        comments: number;
    };
    author?: { // Optional because in profile we know the author
        id: number;
        username: string;
        fullName: string;
        avatar?: string;
    };
}

// EditProfileModal Component
function EditProfileModal({
    user,
    onClose,
    onSuccess
}: {
    user: UserProfile;
    onClose: () => void;
    onSuccess: (updatedUser: any) => void;
}) {
    const [fullName, setFullName] = useState(user.fullName);
    const [bio, setBio] = useState(user.bio || '');
    const [avatar, setAvatar] = useState<File | null>(null);
    const [preview, setPreview] = useState(user.avatar);
    const [loading, setLoading] = useState(false);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            setAvatar(file);
            setPreview(URL.createObjectURL(file));
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            const formData = new FormData();
            formData.append('fullName', fullName);
            formData.append('bio', bio);
            if (avatar) {
                formData.append('avatar', avatar);
            }

            // @ts-ignore
            const res = await updateUserProfile(formData);
            onSuccess(res.data.user);
            onClose();
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Lỗi cập nhật');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-md p-6 shadow-2xl animate-scale-in border dark:border-slate-800">
                <h2 className="text-xl font-bold mb-4 text-slate-900 dark:text-white">Chỉnh sửa hồ sơ</h2>
                <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Avatar Upload */}
                    <div className="flex justify-center mb-4">
                        <div className="relative group cursor-pointer w-24 h-24">
                            <img
                                src={preview ? (preview.startsWith('blob:') ? preview : getAvatarUrl(preview, user.username)) : getAvatarUrl(user.avatar, user.username)}
                                alt="Avatar Preview"
                                className="w-full h-full rounded-full object-cover border-4 border-slate-100 shadow-sm"
                            />
                            <label className="absolute inset-0 bg-black/40 flex items-center justify-center rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer text-white font-bold text-xs">
                                Đổi ảnh
                                <input type="file" className="hidden" accept="image/*" onChange={handleFileChange} />
                            </label>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Tên hiển thị</label>
                        <input
                            type="text"
                            value={fullName}
                            onChange={(e) => setFullName(e.target.value)}
                            className="w-full p-2 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Tiểu sử</label>
                        <textarea
                            value={bio}
                            onChange={(e) => setBio(e.target.value)}
                            rows={3}
                            className="w-full p-2 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                        />
                    </div>
                    <div className="flex justify-end gap-2 mt-6">
                        <button type="button" onClick={onClose} className="px-4 py-2 text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800 rounded-lg font-medium">Hủy</button>
                        <button type="submit" disabled={loading} className="px-4 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 disabled:opacity-50">
                            {loading ? 'Lưu...' : 'Lưu thay đổi'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

export default function Profile() {
    const { id } = useParams();
    const { user: currentUser } = useAuth();
    const navigate = useNavigate();

    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [posts, setPosts] = useState<Post[]>([]);
    const [loading, setLoading] = useState(true);
    const [showEdit, setShowEdit] = useState(false);

    // Interactive State
    const [viewingImage, setViewingImage] = useState<string | null>(null);
    const [activeCommentId, setActiveCommentId] = useState<number | null>(null);
    const [commentText, setCommentText] = useState('');
    const [activeMenuPostId, setActiveMenuPostId] = useState<number | null>(null);
    const [expandedPosts, setExpandedPosts] = useState<Set<number>>(new Set());
    const [replyingTo, setReplyingTo] = useState<{ commentId: number; username: string; postId: number } | null>(null);
    const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest');
    const [activeSortPostId, setActiveSortPostId] = useState<number | null>(null);
    const [commentFile, setCommentFile] = useState<File | null>(null);
    const [expandedReplies, setExpandedReplies] = useState<Set<number>>(new Set());
    const inputRefs = useRef<{ [key: number]: HTMLInputElement | null }>({});

    const toggleComments = (postId: number) => {
        setExpandedPosts(prev => {
            const newSet = new Set(prev);
            if (newSet.has(postId)) {
                newSet.delete(postId);
            } else {
                newSet.add(postId);
            }
            return newSet;
        });
    };

    useEffect(() => {
        const fetchData = async () => {
            console.log("Fetching profile data for ID:", id);
            if (!id) return;
            setLoading(true);
            try {
                console.log("Calling Promise.all...");
                const [profileRes, postsRes] = await Promise.all([
                    getProfile(Number(id)),
                    getUserPosts(Number(id))
                ]);
                console.log("Profile Res:", profileRes.data);
                console.log("Posts Res Length:", postsRes.data.length);
                setProfile(profileRes.data);
                setPosts(postsRes.data);
            } catch (error) {
                console.error("Lỗi tải profile", error);
            } finally {
                setLoading(false);
                console.log("Loading set to false");
            }
        };
        fetchData();
    }, [id]);

    const handleFollow = async () => {
        if (!profile) return;
        try {
            await followUser(profile.id);
            setProfile(prev => {
                if (!prev) return null;
                const newIsFollowing = !prev.isFollowing;
                // If I just followed, and they were following me (isFollowedBy), then we become friends.
                // If I just unfollowed, we are no longer friends (even if they still follow me).
                const newIsFriend = newIsFollowing && prev.isFollowedBy;

                return {
                    ...prev,
                    isFollowing: newIsFollowing,
                    isFriend: newIsFriend,
                    _count: {
                        ...prev._count,
                        followers: newIsFollowing ? prev._count.followers + 1 : prev._count.followers - 1
                    }
                };
            });
        } catch (error) {
            console.error("Lỗi follow", error);
        }
    };

    const handleMessage = () => {
        if (!profile) return;
        navigate('/chat', { state: { targetUserId: profile.id } });
    };

    const handleLike = async (postId: number) => {
        try {
            await likePost(postId);
            setPosts(posts.map(p => {
                if (p.id === postId) {
                    const isLiked = p.likes.some(l => l.userId === currentUser?.id);
                    return {
                        ...p,
                        likes: isLiked ? p.likes.filter(l => l.userId !== currentUser?.id) : [...p.likes, { userId: currentUser!.id }],
                        _count: {
                            ...p._count,
                            likes: isLiked ? p._count.likes - 1 : p._count.likes + 1
                        }
                    };
                }
                return p;
            }));
        } catch (error) {
            console.error('Lỗi like', error);
        }
    };

    const handleCommentSubmit = async (postId: number) => {
        if (!commentText.trim() && !commentFile) return;
        try {
            const res = await commentPost(postId, commentText, commentFile || undefined, replyingTo?.commentId);
            const newComment = {
                ...res.data,
                content: commentText,
                author: currentUser,
                parentId: replyingTo?.commentId || null,
                createdAt: new Date().toISOString()
            };
            setPosts(posts.map(p => {
                if (p.id === postId) {
                    return {
                        ...p,
                        comments: [newComment, ...(p.comments || [])],
                        _count: {
                            ...p._count,
                            comments: (p._count?.comments || 0) + 1
                        }
                    };
                }
                return p;
            }));
            setCommentText('');
            setCommentFile(null);

            // Auto expand the thread if we replied to a comment
            if (replyingTo?.commentId) {
                setExpandedReplies(prev => {
                    const newSet = new Set(prev);
                    newSet.add(replyingTo.commentId);
                    return newSet;
                });
            }

            setReplyingTo(null);
        } catch (error) {
            console.error('Lỗi comment', error);
            toast.error('Gửi bình luận thất bại');
        }
    };

    const handleDeletePost = async (postId: number) => {
        if (!confirm('Bạn có chắc chắn muốn xóa bài viết này?')) return;
        try {
            await deletePost(postId);
            setPosts(posts.filter(p => p.id !== postId));
            toast.success('Đã xóa bài viết');
        } catch (error) {
            toast.error('Lỗi xóa bài viết');
        }
    };

    if (loading) return <div className="text-center p-10 text-slate-400">Đang tải hồ sơ...</div>;
    if (!profile) return <div className="text-center p-10 text-slate-400">Không tìm thấy người dùng.</div>;

    const isMe = currentUser?.id === profile.id;

    return (
        <div className="space-y-6">
            {/* Header Card */}
            <div className="glass-card overflow-hidden">
                {/* Cover Image (Placeholder for now) */}
                <div className="h-48 bg-gradient-to-r from-indigo-400 to-purple-400 dark:from-indigo-600 dark:to-purple-800 relative">
                    {/* Actions */}
                    <div className="absolute top-4 right-4 flex gap-2">
                        {isMe ? (
                            <button
                                onClick={() => setShowEdit(true)}
                                className="bg-black/20 hover:bg-black/30 text-white px-4 py-2 rounded-lg backdrop-blur-md font-medium transition-all"
                            >
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
                            src={getAvatarUrl(profile.avatar, profile.username)}
                            className="w-32 h-32 rounded-full border-4 border-white dark:border-slate-800 shadow-lg object-cover bg-white"
                            alt="Avatar"
                        />

                        <div className="flex gap-3 mb-2">
                            {!isMe && (
                                <>
                                    <button
                                        onClick={handleMessage}
                                        className="p-2.5 text-slate-600 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 rounded-xl transition-colors"
                                    >
                                        <MessageCircle size={20} />
                                    </button>
                                    <button
                                        onClick={handleFollow}
                                        className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold transition-all shadow-lg ${profile.isFollowing
                                            ? 'bg-slate-200 text-slate-700 hover:bg-slate-300 dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-slate-600'
                                            : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-indigo-500/30'
                                            }`}
                                    >
                                        {profile.isFriend ? (
                                            <>
                                                <UserCheck size={18} /> Bạn bè
                                            </>
                                        ) : profile.isFollowing ? (
                                            <>
                                                <UserCheck size={18} /> Đang theo dõi
                                            </>
                                        ) : profile.isFollowedBy ? (
                                            <>
                                                <UserPlus size={18} /> Theo dõi lại
                                            </>
                                        ) : (
                                            <>
                                                <UserPlus size={18} /> Theo dõi
                                            </>
                                        )}
                                    </button>
                                </>
                            )}
                        </div>
                    </div>

                    {/* Info */}
                    <div>
                        <div className="flex items-center gap-2">
                            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{profile.fullName}</h1>
                            {profile.isVip && <span className="text-yellow-500 text-lg">👑</span>}
                            {profile.role === 'ADMIN' && <span className="text-xs bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400 px-2 py-0.5 rounded-full font-bold">ADMIN</span>}
                        </div>
                        <p className="text-slate-500 dark:text-slate-400 font-medium">@{profile.username}</p>

                        {profile.bio && <p className="mt-3 text-slate-700 dark:text-slate-300 leading-relaxed max-w-2xl">{profile.bio}</p>}

                        <div className="flex flex-wrap gap-4 mt-4 text-sm text-slate-500 dark:text-slate-400">
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
                        <div className="flex gap-6 mt-6 border-t border-slate-100 dark:border-slate-800 pt-6">
                            <div className="text-center">
                                <span className="block text-xl font-black text-slate-800 dark:text-slate-200">{profile._count.posts}</span>
                                <span className="text-xs text-slate-500 dark:text-slate-400 font-medium uppercase tracking-wide">Bài viết</span>
                            </div>
                            <div className="text-center">
                                <span className="block text-xl font-black text-slate-800 dark:text-slate-200">{profile._count.followers}</span>
                                <span className="text-xs text-slate-500 dark:text-slate-400 font-medium uppercase tracking-wide">Người theo dõi</span>
                            </div>
                            <div className="text-center">
                                <span className="block text-xl font-black text-slate-800 dark:text-slate-200">{profile._count.following}</span>
                                <span className="text-xs text-slate-500 dark:text-slate-400 font-medium uppercase tracking-wide">Đang theo dõi</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Content Tabs (For now just Posts) */}
            <h3 className="text-lg font-bold text-slate-800 dark:text-white px-2">Bài viết</h3>

            <div className="space-y-6">
                {posts.length === 0 ? (
                    <div className="col-span-full text-center py-10 text-slate-400">Người dùng chưa có bài viết nào.</div>
                ) : (
                    posts.map(post => {
                        const isLiked = post.likes?.some(l => l.userId === currentUser?.id);
                        return (
                            <div key={post.id} className="glass-card p-4 animate-slide-up relative">
                                {isMe && (
                                    <div className="absolute top-4 right-4" onMouseLeave={() => setActiveMenuPostId(null)}>
                                        <button onClick={() => setActiveMenuPostId(activeMenuPostId === post.id ? null : post.id)} className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                                            <MoreHorizontal size={20} />
                                        </button>
                                        {activeMenuPostId === post.id && (
                                            <div className="absolute right-0 top-8 w-40 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-100 dark:border-slate-700 z-10 overflow-hidden animate-scale-in">
                                                <Link to={`/post/${post.id}`} className="w-full text-left px-4 py-3 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-2 text-sm font-medium">
                                                    <Edit2 size={16} /> Sửa
                                                </Link>
                                                <button onClick={() => handleDeletePost(post.id)} className="w-full text-left px-4 py-3 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-2 text-sm font-medium">
                                                    <Trash2 size={16} /> Xóa
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                )}
                                <p className="mb-3 text-slate-800 dark:text-slate-200 leading-relaxed whitespace-pre-wrap pr-8">{post.content}</p>
                                {post.image && (
                                    <div className="mb-4 rounded-xl overflow-hidden shadow-sm border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900">
                                        <img
                                            src={post.image}
                                            className="w-full h-auto max-h-[500px] object-cover cursor-pointer hover:opacity-95 transition-opacity"
                                            alt="Post"
                                            onClick={() => setViewingImage(post.image!)}
                                        />
                                    </div>
                                )}

                                <div className="flex justify-between items-center text-sm text-slate-500 dark:text-slate-400 border-t border-slate-100 dark:border-slate-800 pt-3 mt-auto">
                                    <div className='flex gap-4'>
                                        <button
                                            onClick={() => handleLike(post.id)}
                                            className={`flex items-center gap-1 transition-colors ${isLiked ? 'text-red-500' : 'hover:text-red-500 dark:hover:text-red-400'}`}
                                        >
                                            <Heart size={18} fill={isLiked ? "currentColor" : "none"} />
                                            <span>{post._count.likes}</span>
                                        </button>
                                        <button
                                            onClick={() => setActiveCommentId(activeCommentId === post.id ? null : post.id)}
                                            className="flex items-center gap-1 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                                        >
                                            <MessageSquare size={18} />
                                            <span>{post._count.comments}</span>
                                        </button>
                                        <button
                                            onClick={() => {
                                                const url = window.location.origin + '/post/' + post.id;
                                                navigator.clipboard.writeText(url);
                                                toast.success('Đã sao chép liên kết bài viết!');
                                            }}
                                            className="flex items-center gap-1 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                                        >
                                            <Share2 size={18} />
                                        </button>
                                    </div>
                                    <span className='text-xs'>{formatDistanceToNow(new Date(post.createdAt), { locale: vi, addSuffix: true })}</span>
                                </div>

                                {activeCommentId === post.id && (
                                    <div className="mt-4 pt-4 border-t border-slate-50 dark:border-slate-800 animate-fade-in">
                                        <div className="flex items-center justify-between mb-3 px-1">
                                            <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                                                Bình luận ({post.comments?.length || 0})
                                            </span>
                                            <div className="relative">
                                                <button
                                                    onClick={() => setActiveSortPostId(activeSortPostId === post.id ? null : post.id)}
                                                    className="flex items-center gap-1 text-xs font-medium text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                                                >
                                                    {sortOrder === 'newest' ? 'Mới nhất' : 'Cũ nhất'}
                                                    <ChevronDown size={14} className={`transform transition-transform ${activeSortPostId === post.id ? 'rotate-180' : ''}`} />
                                                </button>

                                                {activeSortPostId === post.id && (
                                                    <div className="absolute right-0 top-full mt-1 w-32 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-100 dark:border-slate-700 z-20 overflow-hidden animate-scale-in origin-top-right">
                                                        <button
                                                            onClick={() => { setSortOrder('newest'); setActiveSortPostId(null); }}
                                                            className={`w-full text-left px-3 py-2 text-xs font-medium flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors ${sortOrder === 'newest' ? 'text-indigo-600 dark:text-indigo-400 bg-indigo-50/50 dark:bg-indigo-900/10' : 'text-slate-700 dark:text-slate-300'}`}
                                                        >
                                                            Mới nhất
                                                            {sortOrder === 'newest' && <div className="w-1.5 h-1.5 rounded-full bg-indigo-600 dark:bg-indigo-400"></div>}
                                                        </button>
                                                        <button
                                                            onClick={() => { setSortOrder('oldest'); setActiveSortPostId(null); }}
                                                            className={`w-full text-left px-3 py-2 text-xs font-medium flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors ${sortOrder === 'oldest' ? 'text-indigo-600 dark:text-indigo-400 bg-indigo-50/50 dark:bg-indigo-900/10' : 'text-slate-700 dark:text-slate-300'}`}
                                                        >
                                                            Cũ nhất
                                                            {sortOrder === 'oldest' && <div className="w-1.5 h-1.5 rounded-full bg-indigo-600 dark:bg-indigo-400"></div>}
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                        <div className="flex gap-2 mb-4">
                                            <img src={currentUser?.avatar || `https://ui-avatars.com/api/?name=${currentUser?.username}`} className="w-8 h-8 rounded-full" alt="MyAvatar" />
                                            <div className="flex-1 relative">
                                                {replyingTo?.postId === post.id && (
                                                    <div className="flex items-center justify-between text-xs text-indigo-600 bg-indigo-50 dark:bg-slate-800/50 px-3 py-1.5 rounded-t-xl mb-2 border-b border-indigo-100 dark:border-slate-700">
                                                        <span>Đang trả lời <b>{replyingTo.username}</b></span>
                                                        <button
                                                            onClick={() => setReplyingTo(null)}
                                                            className="text-red-500 hover:underline"
                                                        >
                                                            Hủy
                                                        </button>
                                                    </div>
                                                )}

                                                {/* Image Preview */}
                                                {commentFile && (
                                                    <div className="mb-2 relative inline-block">
                                                        <img src={URL.createObjectURL(commentFile)} alt="Preview" className="h-16 w-auto rounded-lg border border-slate-200 dark:border-slate-700" />
                                                        <button
                                                            onClick={() => setCommentFile(null)}
                                                            className="absolute -top-2 -right-2 bg-slate-500 text-white rounded-full p-1 shadow-sm hover:bg-slate-600"
                                                        >
                                                            <X size={12} />
                                                        </button>
                                                    </div>
                                                )}

                                                <div className="relative">
                                                    <input
                                                        type="text"
                                                        // Bind ref
                                                        ref={el => { inputRefs.current[post.id] = el; }}
                                                        value={commentText}
                                                        onChange={(e) => setCommentText(e.target.value)}
                                                        onKeyDown={(e) => e.key === 'Enter' && handleCommentSubmit(post.id)}
                                                        placeholder={replyingTo?.postId === post.id ? `Trả lời ${replyingTo.username}...` : "Viết bình luận..."}
                                                        className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl px-4 py-2.5 pr-20 focus:ring-2 focus:ring-indigo-100 dark:focus:ring-indigo-900 outline-none text-sm dark:text-slate-200 shadow-inner"
                                                    />
                                                    <div className="absolute right-2 top-1.5 flex items-center gap-1">
                                                        <label className="p-1.5 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 cursor-pointer rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
                                                            <ImageIcon size={16} />
                                                            <input
                                                                type="file"
                                                                className="hidden"
                                                                accept="image/*"
                                                                onChange={(e) => {
                                                                    if (e.target.files?.[0]) setCommentFile(e.target.files[0]);
                                                                }}
                                                            />
                                                        </label>
                                                        <button
                                                            onClick={() => handleCommentSubmit(post.id)}
                                                            disabled={!commentText.trim() && !commentFile}
                                                            className="p-1.5 text-indigo-500 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-full transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                                        >
                                                            <Send size={16} />
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="space-y-3 max-h-60 overflow-y-auto custom-scrollbar">
                                            {(() => {
                                                const allComments = post.comments || [];
                                                const repliesMap = new Map<number, any[]>();

                                                // Group replies
                                                allComments.forEach((c: any) => {
                                                    if (c.parentId) {
                                                        const list = repliesMap.get(c.parentId) || [];
                                                        list.push(c);
                                                        repliesMap.set(c.parentId, list);
                                                    }
                                                });

                                                // Sort Replies: Oldest First (ASC)
                                                repliesMap.forEach((list) => {
                                                    list.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
                                                });

                                                // Filter Roots
                                                const roots = allComments.filter((c: any) => !c.parentId);

                                                // Sort Roots: Based on User Selection
                                                roots.sort((a, b) => {
                                                    const tA = new Date(a.createdAt).getTime();
                                                    const tB = new Date(b.createdAt).getTime();
                                                    return sortOrder === 'newest' ? tB - tA : tA - tB;
                                                });

                                                const displayRoots = expandedPosts.has(post.id) ? roots : roots.slice(0, 3);

                                                const handleReplyClick = (commentId: number, username: string) => {
                                                    setReplyingTo({ commentId, username, postId: post.id });
                                                    setTimeout(() => {
                                                        const inputEl = inputRefs.current[post.id];
                                                        if (inputEl) inputEl.focus();
                                                    }, 50);
                                                };

                                                const toggleReplies = (commentId: number) => {
                                                    setExpandedReplies(prev => {
                                                        const newSet = new Set(prev);
                                                        if (newSet.has(commentId)) newSet.delete(commentId);
                                                        else newSet.add(commentId);
                                                        return newSet;
                                                    });
                                                };

                                                return displayRoots.map((comment: any) => {
                                                    const replies = repliesMap.get(comment.id) || [];
                                                    const visibleReplies = expandedReplies.has(comment.id) ? replies : replies.slice(0, 3);

                                                    return (
                                                        <div key={comment.id} className="flex gap-2 animate-fade-in group pb-2">
                                                            <Link to={`/profile/${comment.authorId}`}>
                                                                <img src={getAvatarUrl(comment.author?.avatar, comment.author?.username)} className="w-8 h-8 rounded-full shadow-sm hover:opacity-80 transition-opacity" alt="Avatar" />
                                                            </Link>
                                                            <div className="flex-1">
                                                                <div className="bg-slate-50 dark:bg-slate-800/80 rounded-2xl md:rounded-3xl px-3 py-2 md:px-4 md:py-2.5 inline-block shadow-sm relative group/content">
                                                                    <Link to={`/profile/${comment.authorId}`} className="font-bold text-xs md:text-sm text-slate-800 dark:text-slate-200 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">
                                                                        {comment.author?.fullName || comment.author?.username}
                                                                    </Link>
                                                                    <p className="text-xs md:text-sm text-slate-600 dark:text-slate-300 whitespace-pre-wrap leading-relaxed">{comment.content}</p>
                                                                    {comment.imageUrl && (
                                                                        <img
                                                                            src={comment.imageUrl}
                                                                            alt="Attachment"
                                                                            className="mt-2 max-h-40 rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
                                                                            onClick={() => setViewingImage(comment.imageUrl)}
                                                                        />
                                                                    )}
                                                                </div>
                                                                <div className="flex items-center gap-3 mt-1 ml-2">
                                                                    <span className="text-[10px] md:text-xs text-slate-400 font-medium cursor-default">
                                                                        {(() => { try { return comment.createdAt ? formatDistanceToNow(new Date(comment.createdAt), { locale: vi, addSuffix: true }) : 'Vừa xong'; } catch { return 'Vừa xong'; } })()}
                                                                    </span>
                                                                    <button
                                                                        className="text-[10px] md:text-xs font-bold text-slate-500 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400 transition-colors"
                                                                        onClick={() => handleReplyClick(comment.id, comment.author?.username)}
                                                                    >
                                                                        Trả lời
                                                                    </button>
                                                                </div>

                                                                {/* Replies Rendering */}
                                                                {replies.length > 0 && (
                                                                    <div className="mt-2 space-y-3 pl-3 md:pl-4 border-l-2 border-slate-100 dark:border-slate-800">
                                                                        {visibleReplies.map((reply: any) => (
                                                                            <div key={reply.id} className="flex gap-2 animate-fade-in">
                                                                                <Link to={`/profile/${reply.authorId}`}>
                                                                                    <img src={getAvatarUrl(reply.author?.avatar, reply.author?.username)} className="w-6 h-6 rounded-full shadow-sm hover:opacity-80 transition-opacity" alt="Avatar" />
                                                                                </Link>
                                                                                <div className="flex-1">
                                                                                    <div className="bg-slate-50 dark:bg-slate-800/50 rounded-2xl px-3 py-2 inline-block shadow-sm">
                                                                                        <Link to={`/profile/${reply.authorId}`} className="font-bold text-xs text-slate-800 dark:text-slate-200 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">
                                                                                            {reply.author?.fullName || reply.author?.username}
                                                                                        </Link>
                                                                                        <p className="text-xs text-slate-600 dark:text-slate-300 whitespace-pre-wrap leading-relaxed">{reply.content}</p>
                                                                                        {reply.imageUrl && (
                                                                                            <img
                                                                                                src={reply.imageUrl}
                                                                                                alt="Reply Attachment"
                                                                                                className="mt-1 max-h-32 rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
                                                                                                onClick={() => setViewingImage(reply.imageUrl)}
                                                                                            />
                                                                                        )}
                                                                                    </div>
                                                                                    <div className="flex items-center gap-3 mt-1 ml-2">
                                                                                        <span className="text-[10px] text-slate-400">
                                                                                            {(() => { try { return reply.createdAt ? formatDistanceToNow(new Date(reply.createdAt), { locale: vi, addSuffix: true }) : 'Vừa xong'; } catch { return 'Vừa xong'; } })()}
                                                                                        </span>
                                                                                        <button
                                                                                            className="text-[10px] font-bold text-slate-500 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400 transition-colors"
                                                                                            onClick={() => handleReplyClick(comment.id, reply.author?.username)}
                                                                                        >
                                                                                            Trả lời
                                                                                        </button>
                                                                                    </div>
                                                                                </div>
                                                                            </div>
                                                                        ))}

                                                                        {/* Replies Pagination Button */}
                                                                        {replies.length > visibleReplies.length && (
                                                                            <button
                                                                                onClick={() => toggleReplies(comment.id)}
                                                                                className="text-xs font-semibold text-indigo-500 hover:text-indigo-600 dark:text-indigo-400 flex items-center gap-1 ml-2"
                                                                            >
                                                                                <div className="w-4 h-0.5 bg-indigo-500/50 rounded-full mr-1"></div>
                                                                                Xem thêm {replies.length - visibleReplies.length} phản hồi
                                                                            </button>
                                                                        )}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    );
                                                });
                                            })()}

                                            {/* Root Comments View More */}
                                            {(() => {
                                                const roots = (post.comments || []).filter((c: any) => !c.parentId);
                                                return !expandedPosts.has(post.id) && roots.length > 3 && (
                                                    <button
                                                        onClick={() => toggleComments(post.id)}
                                                        className="w-full py-2 text-xs font-bold text-slate-500 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400 transition-colors flex items-center justify-center gap-2 mt-2"
                                                    >
                                                        Xem thêm {roots.length - 3} bình luận
                                                        <ChevronDown size={14} />
                                                    </button>
                                                );
                                            })()}
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })
                )}
            </div>

            {/* Content Tabs (For now just Posts) */}

            < ImageModal
                src={viewingImage}
                onClose={() => setViewingImage(null)}
            />

            {/* Edit Modal */}
            {showEdit && profile && (
                <EditProfileModal
                    user={profile}
                    onClose={() => setShowEdit(false)}
                    onSuccess={(updatedUser) => setProfile(prev => prev ? { ...prev, ...updatedUser } : null)}
                />
            )}
        </div>
    );
}

