// src/pages/PostDetails.tsx
import { useState, useEffect, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { getPost, likePost, commentPost, deletePost, updatePost, getComments } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Heart, MessageCircle, Share2, Send, ChevronLeft, MoreHorizontal, Trash2, Edit2, Check, X, Image as ImageIcon } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { formatDistanceToNow } from 'date-fns';
import { vi } from 'date-fns/locale';
import { getAvatarUrl } from '../utils/avatarUtils';
import ImageModal from '../components/ImageModal';

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
    const navigate = useNavigate();
    const { user } = useAuth();
    const [post, setPost] = useState<Post | null>(null);
    const [loading, setLoading] = useState(true);
    const [commentText, setCommentText] = useState('');
    const [commentFile, setCommentFile] = useState<File | null>(null);
    const [commentPreviewUrl, setCommentPreviewUrl] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [viewingImage, setViewingImage] = useState<string | null>(null);

    // Pagination State
    const [loadingMoreComments, setLoadingMoreComments] = useState(false);
    const [hasMoreComments, setHasMoreComments] = useState(true);

    // Edit State
    const [isEditing, setIsEditing] = useState(false);
    const [editContent, setEditContent] = useState('');
    const [showMenu, setShowMenu] = useState(false);

    useEffect(() => {
        if (id) fetchPost();
    }, [id]);

    const fetchPost = async () => {
        try {
            const res = await getPost(Number(id));
            setPost(res.data);
            if (res.data.comments && res.data.comments.length < 3) {
                setHasMoreComments(false);
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const loadMoreComments = async () => {
        if (!post || !hasMoreComments) return;
        setLoadingMoreComments(true);
        try {
            const lastCommentId = post.comments[post.comments.length - 1].id;
            const res = await getComments(post.id, lastCommentId);

            if (res.data.length > 0) {
                setPost(prev => prev ? ({
                    ...prev,
                    comments: [...prev.comments, ...res.data]
                }) : null);
                if (res.data.length < 5) setHasMoreComments(false);
            } else {
                setHasMoreComments(false);
            }
        } catch (error) {
            console.error('Lỗi tải bình luận', error);
        } finally {
            setLoadingMoreComments(false);
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

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            if (!file.type.startsWith('image/')) {
                toast.error('Chỉ hỗ trợ file ảnh');
                return;
            }
            if (file.size > 10 * 1024 * 1024) {
                toast.error('Ảnh quá lớn (Tối đa 10MB)');
                return;
            }
            setCommentFile(file);
            setCommentPreviewUrl(URL.createObjectURL(file));
        }
    };

    const clearCommentFile = () => {
        setCommentFile(null);
        setCommentPreviewUrl(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const handleCommentSubmit = async () => {
        if ((!commentText.trim() && !commentFile) || !post) return;
        try {
            const res = await commentPost(post.id, commentText, commentFile || undefined);
            setPost({
                ...post,
                comments: [res.data.comment, ...post.comments],
                _count: { ...post._count, comments: post._count.comments + 1 }
            });
            setCommentText('');
            clearCommentFile();
        } catch (error) {
            toast.error('Lỗi bình luận');
        }
    };

    const handleShare = () => {
        const url = window.location.href; // Or specifically construct it
        navigator.clipboard.writeText(url);
        toast.success('Đã sao chép liên kết bài viết: ' + url);
    };

    const handleDelete = async () => {
        if (!post || !confirm('Bạn có chắc chắn muốn xóa bài viết này?')) return;
        try {
            await deletePost(post.id);
            toast.success('Đã xóa bài viết');
            navigate('/');
        } catch (error) {
            toast.error('Lỗi xóa bài viết');
        }
    };

    const handleUpdate = async () => {
        if (!post || !editContent.trim()) return;
        try {
            const res = await updatePost(post.id, editContent);
            setPost(res.data);
            setIsEditing(false);
            toast.success('Đã cập nhật bài viết');
        } catch (error) {
            toast.error('Lỗi cập nhật bài viết');
        }
    };

    const toggleEdit = () => {
        if (isEditing) {
            setIsEditing(false);
        } else {
            setEditContent(post?.content || '');
            setIsEditing(true);
            setShowMenu(false);
        }
    };

    if (loading) return <div className="text-center p-10 text-slate-400">Đang tải bài viết...</div>;
    if (!post) return <div className="text-center p-10 text-slate-400">Không tìm thấy bài viết.</div>;

    const isLiked = post.likes.some(l => l.userId === user?.id);

    return (
        <div className="max-w-3xl mx-auto space-y-4">
            <Link to="/" className="flex items-center gap-2 text-slate-500 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400 mb-4 transition-colors">
                <ChevronLeft size={20} />
                Quay lại
            </Link>

            <div className="glass-card animate-fade-in">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                        <Link to={`/profile/${post.author.id}`}>
                            <img src={getAvatarUrl(post.author.avatar, post.author.username)} className="w-12 h-12 rounded-full border-2 border-white shadow-sm" alt="Avatar" />
                        </Link>
                        <div>
                            <Link to={`/profile/${post.author.id}`} className="font-bold text-slate-800 dark:text-white text-lg hover:underline">{post.author.fullName}</Link>
                            <p className="text-sm text-slate-500 dark:text-slate-400">
                                {new Date(post.createdAt).toLocaleDateString('vi-VN')} lúc {new Date(post.createdAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                            </p>
                        </div>
                    </div>
                    {user?.id === post.author.id && (
                        <div className="relative">
                            <button onClick={() => setShowMenu(!showMenu)} className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                                <MoreHorizontal />
                            </button>
                            {showMenu && (
                                <div className="absolute right-0 top-10 w-40 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-100 dark:border-slate-700 z-10 overflow-hidden animate-scale-in">
                                    <button onClick={toggleEdit} className="w-full text-left px-4 py-3 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-2 text-sm font-medium">
                                        <Edit2 size={16} /> Sửa bài viết
                                    </button>
                                    <button onClick={handleDelete} className="w-full text-left px-4 py-3 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-2 text-sm font-medium">
                                        <Trash2 size={16} /> Xóa bài viết
                                    </button>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {isEditing ? (
                    <div className="mb-6 space-y-3">
                        <textarea
                            value={editContent}
                            onChange={(e) => setEditContent(e.target.value)}
                            className="w-full p-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 min-h-[150px] text-slate-800 dark:text-slate-200"
                        />
                        <div className="flex justify-end gap-2">
                            <button onClick={toggleEdit} className="px-4 py-2 text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800 rounded-lg flex items-center gap-2">
                                <X size={18} /> Hủy
                            </button>
                            <button onClick={handleUpdate} className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 flex items-center gap-2 shadow-lg shadow-indigo-500/30">
                                <Check size={18} /> Lưu
                            </button>
                        </div>
                    </div>
                ) : (
                    <p className="text-slate-800 dark:text-slate-200 text-lg mb-6 leading-relaxed whitespace-pre-wrap">{post.content}</p>
                )}

                {post.image && (
                    <div className="mb-6 rounded-xl overflow-hidden shadow-sm border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 cursor-pointer" onClick={() => setViewingImage(post.image!)}>
                        <img
                            src={post.image}
                            alt="Post content"
                            className="w-full h-auto object-cover"
                        />
                    </div>
                )}

                <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-800 mb-6">
                    <button
                        onClick={handleLike}
                        className={`flex items-center gap-2 transition-colors px-4 py-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 ${isLiked ? 'text-red-500' : 'text-slate-500 dark:text-slate-400 hover:text-red-500 dark:hover:text-red-400'}`}
                    >
                        <Heart size={24} fill={isLiked ? "currentColor" : "none"} />
                        <span className="font-semibold">{post._count.likes} Thích</span>
                    </button>
                    <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 px-4 py-2">
                        <MessageCircle size={24} />
                        <span className="font-semibold">{post._count.comments} Bình luận</span>
                    </div>
                    <button onClick={handleShare} className="flex items-center gap-2 text-slate-500 dark:text-slate-400 hover:text-indigo-500 dark:hover:text-indigo-400 transition-colors px-4 py-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800">
                        <Share2 size={24} />
                        <span className="font-semibold">Chia sẻ</span>
                    </button>
                </div>

                <div className="pt-4 border-t border-slate-50 dark:border-slate-800">
                    <div className="flex gap-3 mb-6">
                        <img src={getAvatarUrl(user?.avatar, user?.username)} className="w-10 h-10 rounded-full" alt="MyAvatar" />
                        <div className="flex-1">
                            {/* Preview Image */}
                            {commentPreviewUrl && (
                                <div className="mb-2 relative inline-block">
                                    <img src={commentPreviewUrl} alt="Preview" className="h-16 w-auto rounded-lg shadow-sm border border-slate-200 dark:border-slate-700" />
                                    <button
                                        onClick={clearCommentFile}
                                        className="absolute -top-1 -right-1 bg-slate-500 text-white rounded-full p-0.5 hover:bg-slate-600 shadow-sm"
                                    >
                                        <X size={10} />
                                    </button>
                                </div>
                            )}
                            <div className="relative">
                                <input
                                    type="text"
                                    value={commentText}
                                    onChange={(e) => setCommentText(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && handleCommentSubmit()}
                                    placeholder="Viết bình luận..."
                                    className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl px-5 py-3 pr-20 focus:ring-2 focus:ring-indigo-100 dark:focus:ring-indigo-900 outline-none text-slate-800 dark:text-slate-200"
                                />
                                <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                                    <input
                                        type="file"
                                        ref={fileInputRef}
                                        className="hidden"
                                        accept="image/*"
                                        onChange={handleFileSelect}
                                    />
                                    <button
                                        onClick={() => fileInputRef.current?.click()}
                                        className="text-slate-400 hover:text-indigo-500 p-1.5 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full transition-colors"
                                        title="Đính kèm ảnh"
                                    >
                                        <ImageIcon size={18} />
                                    </button>
                                    <button
                                        onClick={handleCommentSubmit}
                                        disabled={!commentText.trim() && !commentFile}
                                        className="text-indigo-500 hover:text-indigo-600 p-1.5 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-full transition-colors disabled:opacity-50"
                                    >
                                        <Send size={18} />
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-4">
                        {post.comments.map((comment: any) => (
                            <div key={comment.id} className="flex gap-3 items-start animate-slide-up">
                                <Link to={`/profile/${comment.authorId}`}>
                                    <img src={getAvatarUrl(comment.author?.avatar, comment.author?.username)} className="w-10 h-10 rounded-full" alt="CommenterAvatar" />
                                </Link>
                                <div className="flex-1">
                                    <div className="bg-slate-50 dark:bg-slate-800 p-3 rounded-2xl rounded-tl-none inline-block min-w-[200px]">
                                        <Link to={`/profile/${comment.authorId}`} className="font-bold text-slate-900 dark:text-white block mb-1 hover:underline">
                                            {comment.author?.fullName}
                                        </Link>
                                        {comment.content && <p className="text-slate-800 dark:text-slate-300">{comment.content}</p>}
                                        {comment.image && (
                                            <img
                                                src={comment.image}
                                                alt="Comment"
                                                className="mt-2 rounded-lg max-h-[200px] w-auto border border-slate-200 dark:border-slate-700 cursor-pointer hover:opacity-95 transition-opacity"
                                                onClick={() => setViewingImage(comment.image)}
                                            />
                                        )}
                                    </div>
                                    <div className="text-xs text-slate-400 mt-1 ml-2">
                                        {formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true, locale: vi })}
                                    </div>
                                </div>
                            </div>
                        ))}

                        {hasMoreComments && (
                            <button
                                onClick={loadMoreComments}
                                disabled={loadingMoreComments}
                                className="w-full text-center py-2 text-indigo-600 dark:text-indigo-400 text-sm font-medium hover:underline"
                            >
                                {loadingMoreComments ? 'Đang tải...' : 'Xem thêm bình luận'}
                            </button>
                        )}
                    </div>
                </div>
            </div>

            <ImageModal
                src={viewingImage}
                onClose={() => setViewingImage(null)}
            />
        </div >
    );
}
