// src/pages/PostDetails.tsx
import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getPost, likePost, commentPost } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Heart, MessageCircle, Share2, Send, ChevronLeft } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { vi } from 'date-fns/locale';

interface Post {
    id: number;
    content: string;
    image?: string;
    author: {
        id: number;
        username: string;
        fullName: string;
        avatar?: string;
    };
    likes: { userId: number }[];
    comments: any[];
    _count: { likes: number, comments: number };
    createdAt: string;
}

export default function PostDetails() {
    const { id } = useParams();
    const { user } = useAuth();
    const [post, setPost] = useState<Post | null>(null);
    const [loading, setLoading] = useState(true);
    const [commentText, setCommentText] = useState('');

    useEffect(() => {
        if (id) fetchPost();
    }, [id]);

    const fetchPost = async () => {
        try {
            const res = await getPost(Number(id));
            setPost(res.data);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleLike = async () => {
        if (!post) return;
        try {
            await likePost(post.id);
            const isLiked = post.likes.some(l => l.userId === user?.id);
            setPost({
                ...post,
                likes: isLiked ? post.likes.filter(l => l.userId !== user?.id) : [...post.likes, { userId: user!.id }],
                _count: {
                    ...post._count,
                    likes: isLiked ? post._count.likes - 1 : post._count.likes + 1
                }
            });
        } catch (error) {
            console.error('Lỗi like', error);
        }
    };

    const handleCommentSubmit = async () => {
        if (!commentText.trim() || !post) return;
        try {
            const res = await commentPost(post.id, commentText);
            setPost({
                ...post,
                comments: [res.data.comment, ...post.comments],
                _count: { ...post._count, comments: post._count.comments + 1 }
            });
            setCommentText('');
        } catch (error) {
            alert('Lỗi bình luận');
        }
    };

    const handleShare = () => {
        const url = window.location.href; // Or specifically construct it
        navigator.clipboard.writeText(url);
        alert('Đã sao chép liên kết bài viết: ' + url);
    };

    if (loading) return <div className="text-center p-10 text-slate-400">Đang tải bài viết...</div>;
    if (!post) return <div className="text-center p-10 text-slate-400">Không tìm thấy bài viết.</div>;

    const isLiked = post.likes.some(l => l.userId === user?.id);

    return (
        <div className="max-w-3xl mx-auto space-y-4">
            <Link to="/" className="flex items-center gap-2 text-slate-500 hover:text-indigo-600 mb-4 transition-colors">
                <ChevronLeft size={20} />
                Quay lại
            </Link>

            <div className="glass-card animate-fade-in">
                <div className="flex items-center gap-3 mb-4">
                    <Link to={`/profile/${post.author.id}`}>
                        <img src={post.author.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(post.author.username)}`} className="w-12 h-12 rounded-full border-2 border-white shadow-sm" alt="Avatar" />
                    </Link>
                    <div>
                        <Link to={`/profile/${post.author.id}`} className="font-bold text-slate-800 text-lg hover:underline">{post.author.fullName}</Link>
                        <p className="text-sm text-slate-500">
                            {new Date(post.createdAt).toLocaleDateString('vi-VN')} lúc {new Date(post.createdAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                        </p>
                    </div>
                </div>

                <p className="text-slate-800 text-lg mb-6 leading-relaxed whitespace-pre-wrap">{post.content}</p>

                {post.image && (
                    <div className="mb-6 rounded-xl overflow-hidden shadow-sm border border-slate-100 bg-slate-50">
                        <img
                            src={post.image}
                            alt="Post content"
                            className="w-full h-auto object-cover"
                        />
                    </div>
                )}

                <div className="flex items-center justify-between pt-4 border-t border-slate-100 mb-6">
                    <button
                        onClick={handleLike}
                        className={`flex items-center gap-2 transition-colors px-4 py-2 rounded-lg hover:bg-slate-50 ${isLiked ? 'text-red-500' : 'text-slate-500 hover:text-red-500'}`}
                    >
                        <Heart size={24} fill={isLiked ? "currentColor" : "none"} />
                        <span className="font-semibold">{post._count.likes} Thích</span>
                    </button>
                    <div className="flex items-center gap-2 text-slate-500 px-4 py-2">
                        <MessageCircle size={24} />
                        <span className="font-semibold">{post._count.comments} Bình luận</span>
                    </div>
                    <button onClick={handleShare} className="flex items-center gap-2 text-slate-500 hover:text-indigo-500 transition-colors px-4 py-2 rounded-lg hover:bg-slate-50">
                        <Share2 size={24} />
                        <span className="font-semibold">Chia sẻ</span>
                    </button>
                </div>

                <div className="pt-4 border-t border-slate-50">
                    <div className="flex gap-3 mb-6">
                        <img src={user?.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.username || 'User')}`} className="w-10 h-10 rounded-full" alt="MyAvatar" />
                        <div className="flex-1 relative">
                            <input
                                type="text"
                                value={commentText}
                                onChange={(e) => setCommentText(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleCommentSubmit()}
                                placeholder="Viết bình luận..."
                                className="w-full bg-slate-50 border-none rounded-2xl px-5 py-3 pr-12 focus:ring-2 focus:ring-indigo-100 outline-none"
                            />
                            <button
                                onClick={handleCommentSubmit}
                                className="absolute right-2 top-2 text-indigo-500 hover:text-indigo-600 p-1.5 hover:bg-indigo-50 rounded-full transition-colors"
                            >
                                <Send size={20} />
                            </button>
                        </div>
                    </div>

                    <div className="space-y-4">
                        {post.comments.map((comment: any) => (
                            <div key={comment.id} className="flex gap-3 items-start animate-slide-up">
                                <Link to={`/profile/${comment.authorId}`}>
                                    <img src={comment.author?.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(comment.author?.username)}`} className="w-10 h-10 rounded-full" alt="CommenterAvatar" />
                                </Link>
                                <div className="flex-1">
                                    <div className="bg-slate-50 p-3 rounded-2xl rounded-tl-none inline-block min-w-[200px]">
                                        <Link to={`/profile/${comment.authorId}`} className="font-bold text-slate-900 block mb-1 hover:underline">
                                            {comment.author?.fullName}
                                        </Link>
                                        <p className="text-slate-800">{comment.content}</p>
                                    </div>
                                    <div className="text-xs text-slate-400 mt-1 ml-2">
                                        {formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true, locale: vi })}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
