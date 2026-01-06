import { useState, useEffect, useRef } from 'react';
import { useParams, Link, useNavigate, useLocation } from 'react-router-dom';
import { getPost, likePost, commentPost, deletePost, updatePost, getComments } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Heart, MessageCircle, Share2, Send, ChevronLeft, MoreHorizontal, Trash2, Edit2, Check, X, Image as ImageIcon, ChevronDown } from 'lucide-react';
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
    const location = useLocation();

    const { user } = useAuth();
    const [post, setPost] = useState<Post | null>(null);
    const [loading, setLoading] = useState(true);
    const [commentText, setCommentText] = useState('');
    const [commentFile, setCommentFile] = useState<File | null>(null);
    const [commentPreviewUrl, setCommentPreviewUrl] = useState<string | null>(null);
    // Scroll to comment handler
    useEffect(() => {
        if (location.hash && post) {
            const id = location.hash.replace('#', '');
            const element = document.getElementById(id);
            if (element) {
                setTimeout(() => {
                    element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    element.classList.add('ring-2', 'ring-indigo-500', 'bg-indigo-500/20', 'transition-all', 'duration-500');
                    setTimeout(() => element.classList.remove('ring-2', 'ring-indigo-500', 'bg-indigo-500/20'), 3000);
                }, 500);
            }
        }
    }, [location.hash, post]);

    const fileInputRef = useRef<HTMLInputElement>(null);
    const [viewingImage, setViewingImage] = useState<string | null>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    // Comment Features State
    const [replyingTo, setReplyingTo] = useState<{ commentId: number, username: string } | null>(null);
    const [expandedReplies, setExpandedReplies] = useState<Set<number>>(new Set());
    const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest');

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
            const res = await commentPost(post.id, commentText, commentFile || undefined, replyingTo?.commentId);
            const { comment } = res.data;
            const newComment = {
                ...comment,
                content: commentText,
                author: user,
                parentId: replyingTo?.commentId || null,
                createdAt: new Date().toISOString()
            };
            setPost(prev => prev ? ({
                ...prev,
                comments: [newComment, ...(prev.comments || [])],
                _count: { ...prev._count, comments: prev._count.comments + 1 }
            }) : null);
            setCommentText('');
            clearCommentFile();

            // Auto expand thread if replying
            if (replyingTo?.commentId) {
                setExpandedReplies(prev => {
                    const newSet = new Set(prev);
                    newSet.add(replyingTo.commentId);
                    return newSet;
                });
            }
            setReplyingTo(null);

        } catch (error) {
            console.error(error);
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

                <div className="flex justify-between items-center mb-2 px-1">
                    <span className="text-sm font-bold text-slate-700 dark:text-slate-300">Bình luận</span>
                    <button
                        onClick={() => setSortOrder(prev => prev === 'newest' ? 'oldest' : 'newest')}
                        className="text-xs font-bold text-slate-500 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400 flex items-center gap-1 transition-colors"
                    >
                        {sortOrder === 'newest' ? 'Mới nhất' : 'Cũ nhất'} <ChevronDown size={14} />
                    </button>
                </div>

                {replyingTo && (
                    <div className="flex items-center justify-between text-xs text-indigo-600 bg-indigo-50 dark:bg-slate-800/50 px-3 py-1.5 rounded-t-xl mb-2 border-b border-indigo-100 dark:border-slate-700">
                        <span>Đang trả lời <b>{replyingTo.username}</b></span>
                        <button onClick={() => setReplyingTo(null)} className="text-red-500 hover:underline">Hủy</button>
                    </div>
                )}

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
                                    ref={inputRef}
                                    value={commentText}
                                    onChange={(e) => setCommentText(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && handleCommentSubmit()}
                                    placeholder={replyingTo ? `Trả lời ${replyingTo.username}...` : "Viết bình luận..."}
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
                        {(() => {
                            const allComments = post.comments || [];
                            const repliesMap = new Map<number, any[]>();
                            allComments.forEach((c: any) => {
                                if (c.parentId) {
                                    const list = repliesMap.get(c.parentId) || [];
                                    list.push(c);
                                    repliesMap.set(c.parentId, list);
                                }
                            });
                            repliesMap.forEach(list => list.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()));
                            const roots = allComments.filter((c: any) => !c.parentId);
                            roots.sort((a, b) => {
                                const tA = new Date(a.createdAt).getTime();
                                const tB = new Date(b.createdAt).getTime();
                                return sortOrder === 'newest' ? tB - tA : tA - tB;
                            });

                            // In PostDetails, maybe we show ALL roots by default? Or paginate?
                            // The existing logic used loadMoreComments. Let's show all loaded roots.

                            const handleReplyClick = (commentId: number, username: string) => {
                                setReplyingTo({ commentId, username });
                                setTimeout(() => {
                                    if (inputRef.current) {
                                        inputRef.current.focus();
                                        inputRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                    }
                                }, 100);
                            };

                            const toggleReplies = (commentId: number) => {
                                setExpandedReplies(prev => {
                                    const newSet = new Set(prev);
                                    if (newSet.has(commentId)) newSet.delete(commentId); else newSet.add(commentId);
                                    return newSet;
                                });
                            };

                            return roots.map((comment: any) => {
                                const replies = repliesMap.get(comment.id) || [];
                                const visibleReplies = expandedReplies.has(comment.id) ? replies : replies.slice(0, 3);

                                return (
                                    <div key={comment.id} id={`comment-${comment.id}`} className="flex gap-3 items-start animate-slide-up group">
                                        <Link to={`/profile/${comment.authorId}`}>
                                            <img src={getAvatarUrl(comment.author?.avatar, comment.author?.username)} className="w-10 h-10 rounded-full" alt="Avatar" />
                                        </Link>
                                        <div className="flex-1">
                                            <div className="bg-slate-50 dark:bg-slate-800 p-3 rounded-2xl rounded-tl-none inline-block min-w-[200px]">
                                                <Link to={`/profile/${comment.authorId}`} className="font-bold text-slate-900 dark:text-white block mb-1 hover:underline">
                                                    {comment.author?.fullName}
                                                </Link>
                                                {comment.content && <p className="text-slate-800 dark:text-slate-300 whitespace-pre-wrap">{comment.content}</p>}
                                                {comment.image && (
                                                    <img src={comment.image} alt="Cmt" className="mt-2 rounded-lg max-h-[200px] w-auto border border-slate-200 dark:border-slate-700 cursor-pointer hover:opacity-95" onClick={() => setViewingImage(comment.image)} />
                                                )}
                                                {comment.imageUrl && !comment.image && (
                                                    <img src={comment.imageUrl} alt="Cmt" className="mt-2 rounded-lg max-h-[200px] w-auto border border-slate-200 dark:border-slate-700 cursor-pointer hover:opacity-95" onClick={() => setViewingImage(comment.imageUrl)} />
                                                )}
                                            </div>
                                            <div className="text-xs text-slate-400 mt-1 ml-2 flex items-center gap-3">
                                                <span>{(() => { try { return comment.createdAt ? formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true, locale: vi }) : 'Vừa xong'; } catch { return 'Vừa xong'; } })()}</span>
                                                <button className="font-bold text-slate-500 hover:text-indigo-600 dark:text-slate-400 hover:underline" onClick={() => handleReplyClick(comment.id, comment.author?.username)}>Trả lời</button>
                                            </div>

                                            {/* Replies */}
                                            {replies.length > 0 && (
                                                <div className="mt-2 space-y-3 pl-4 border-l-2 border-slate-100 dark:border-slate-800">
                                                    {visibleReplies.map((reply: any) => (
                                                        <div key={reply.id} id={`comment-${reply.id}`} className="flex gap-2 animate-fade-in">
                                                            <Link to={`/profile/${reply.authorId}`}>
                                                                <img src={getAvatarUrl(reply.author?.avatar, reply.author?.username)} className="w-8 h-8 rounded-full" alt="Avatar" />
                                                            </Link>
                                                            <div className="flex-1">
                                                                <div className="bg-slate-50 dark:bg-slate-800/80 p-2.5 rounded-2xl inline-block">
                                                                    <Link to={`/profile/${reply.authorId}`} className="font-bold text-xs text-slate-900 dark:text-white block mb-0.5">{reply.author?.fullName}</Link>
                                                                    <p className="text-xs text-slate-800 dark:text-slate-300">{reply.content}</p>
                                                                    {(reply.image || reply.imageUrl) && (
                                                                        <img src={reply.image || reply.imageUrl} alt="Rep" className="mt-1 max-h-32 rounded-lg cursor-pointer" onClick={() => setViewingImage(reply.image || reply.imageUrl)} />
                                                                    )}
                                                                </div>
                                                                <div className="text-[10px] text-slate-400 mt-1 ml-2 flex gap-2">
                                                                    <span>{(() => { try { return reply.createdAt ? formatDistanceToNow(new Date(reply.createdAt), { addSuffix: true, locale: vi }) : 'Vừa xong'; } catch { return 'Vừa xong'; } })()}</span>
                                                                    <button className="font-bold hover:underline" onClick={() => handleReplyClick(comment.id, reply.author?.username)}>Trả lời</button>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    ))}
                                                    {replies.length > visibleReplies.length && (
                                                        <button onClick={() => toggleReplies(comment.id)} className="text-xs font-semibold text-indigo-500 hover:underline flex items-center gap-1 ml-2">
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
