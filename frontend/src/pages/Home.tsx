// src/pages/Home.tsx
import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { getFeed, createPost, likePost, dailyCheckIn, commentPost, deletePost } from '../services/api';
import { MessageCircle, Heart, Share2, Image as ImageIcon, X, Send, Search, MoreHorizontal, Trash2, Edit2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { vi } from 'date-fns/locale';
import { Link } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { getAvatarUrl } from '../utils/avatarUtils';

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

export default function Home() {
  const { user, login } = useAuth();
  const [posts, setPosts] = useState<Post[]>([]);
  const [content, setContent] = useState('');
  const [image, setImage] = useState<File | null>(null);
  const [loadingPosts, setLoadingPosts] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [activeCommentId, setActiveCommentId] = useState<number | null>(null);
  const [commentText, setCommentText] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [activeMenuPostId, setActiveMenuPostId] = useState<number | null>(null);
  const [editingPostId, setEditingPostId] = useState<number | null>(null);
  const [editPostContent, setEditPostContent] = useState('');

  const fetchPosts = async () => {
    try {
      const res = await getFeed();
      setPosts(res.data.posts);
    } catch (error) {
      console.error('Lỗi tải bảng tin', error);
    } finally {
      setLoadingPosts(false);
    }
  };

  useEffect(() => {
    fetchPosts();
  }, []);

  // Click outside to close post menu
  useEffect(() => {
    const handleClickOutside = () => {
      setActiveMenuPostId(null);
    };

    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  const handlePostSubmit = async () => {
    if (!content.trim() && !image) return;
    setSubmitting(true);
    const formData = new FormData();
    formData.append('content', content);
    if (image) formData.append('image', image);

    try {
      await createPost(formData);
      setContent('');
      setImage(null);
      fetchPosts();
    } catch (error) {
      alert('Đăng bài thất bại');
    } finally {
      setSubmitting(false);
    }
  };

  const handleLike = async (postId: number) => {
    try {
      await likePost(postId);
      setPosts(posts.map(p => {
        if (p.id === postId) {
          const isLiked = p.likes.some(l => l.userId === user?.id);
          return {
            ...p,
            likes: isLiked ? p.likes.filter(l => l.userId !== user?.id) : [...p.likes, { userId: user!.id }],
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
    if (!commentText.trim()) return;
    try {
      const res = await commentPost(postId, commentText);
      setPosts(posts.map(p => {
        if (p.id === postId) {
          return {
            ...p,
            comments: [res.data.comment, ...p.comments],
            _count: { ...p._count, comments: p._count.comments + 1 }
          };
        }
        return p;
      }));
      setCommentText('');
    } catch (error) {
      alert('Lỗi bình luận');
    }
  };

  const handleCheckIn = async () => {
    try {
      const res = await dailyCheckIn();
      toast.success(res.data.message);
      if (user) {
        const newUser = { ...user, coins: user.coins + (res.data.coinsAdded || 0) };
        const token = localStorage.getItem('token');
        if (token) login(token, newUser);
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Lỗi điểm danh');
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

  const handleStartEditPost = (post: Post) => {
    setEditingPostId(post.id);
    setEditPostContent(post.content);
    setActiveMenuPostId(null);
  };

  const handleUpdatePost = async (postId: number) => {
    if (!editPostContent.trim()) return;
    try {
      const res = await import('../services/api').then(m => m.updatePost(postId, editPostContent));
      setPosts(posts.map(p => p.id === postId ? { ...p, content: res.data.content } : p)); // Assuming API returns updated post
      setEditingPostId(null);
      toast.success('Đã cập nhật bài viết');
    } catch (error) {
      toast.error('Lỗi cập nhật bài viết');
    }
  };

  return (
    <div className="space-y-6">
      <div className="glass-card mb-6 flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-purple-600 dark:from-indigo-400 dark:to-purple-400">
            Xin chào
            <br />
            {user?.fullName}!
          </h2>
          <p className="text-slate-500 dark:text-slate-400 text-sm">Coins: <span className="font-bold text-yellow-500">{user?.coins}</span> 🪙</p>
        </div>
        <button
          onClick={handleCheckIn}
          className="bg-gradient-to-r from-yellow-400 to-orange-500 text-white px-4 py-2 rounded-lg shadow-md hover:shadow-lg transform hover:-translate-y-0.5 transition-all font-bold text-sm"
        >
          Điểm danh
        </button>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" size={20} />
        <input
          type="text"
          placeholder="Tìm kiếm bài viết, người dùng..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full bg-white dark:bg-slate-900 border border-indigo-50 dark:border-slate-800 text-slate-800 dark:text-slate-200 pl-12 pr-4 py-3 rounded-2xl shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all font-medium placeholder:text-slate-400 dark:placeholder:text-slate-500"
        />
      </div>

      <div className="glass-card p-4 flex gap-4 items-start">
        <img src={getAvatarUrl(user?.avatar, user?.username)} className="w-10 h-10 rounded-full border-2 border-white dark:border-slate-700 shadow-sm" alt="Avatar" />
        <div className="flex-1">
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Bạn đang nghĩ gì?"
            rows={2}
            className="glass-input w-full rounded-xl resize-none"
          />

          {image && (
            <div className="mt-2 relative inline-block">
              <img src={URL.createObjectURL(image)} alt="Preview" className="h-20 w-auto rounded-lg border border-slate-200 dark:border-slate-700" />
              <button onClick={() => setImage(null)} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs">×</button>
            </div>
          )}

          <div className="flex justify-between items-center mt-3">
            <label className="cursor-pointer text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 p-2 rounded-lg transition-colors flex items-center gap-2 text-sm font-medium">
              <ImageIcon size={18} />
              <span>Ảnh</span>
              <input type="file" hidden accept="image/*" onChange={(e) => setImage(e.target.files?.[0] || null)} />
            </label>
            <button
              onClick={handlePostSubmit}
              disabled={submitting || (!content && !image)}
              className="bg-indigo-600 text-white px-6 py-2 rounded-xl font-medium shadow-lg hover:bg-indigo-700 disabled:opacity-50"
            >
              {submitting ? 'Đăng...' : 'Đăng bài'}
            </button>
          </div>
        </div>
      </div>

      {loadingPosts ? (
        <div className="text-center py-10 text-slate-400">Đang tải bảng tin...</div>
      ) : posts.length === 0 ? (
        <div className="text-center py-10 text-slate-400">Chưa có bài viết nào, hãy là người đầu tiên!</div>
      ) : (
        posts.filter(p =>
          p.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
          p.author.fullName.toLowerCase().includes(searchTerm.toLowerCase())
        ).map((post) => {
          const isLiked = post.likes.some(l => l.userId === user?.id);
          return (
            <div key={post.id} className="glass-card animate-slide-up">
              <div className="flex items-center gap-3 mb-4">
                <Link to={`/profile/${post.author.id}`}>
                  <img src={getAvatarUrl(post.author.avatar, post.author.username)} className="w-10 h-10 rounded-full border-2 border-white dark:border-slate-700 shadow-sm" alt="Avatar" />
                </Link>
                <div>
                  <Link to={`/profile/${post.author.id}`} className="font-bold text-slate-800 dark:text-slate-100 hover:underline">{post.author.fullName}</Link>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{new Date(post.createdAt).toLocaleDateString('vi-VN')} {new Date(post.createdAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}</p>
                </div>
              </div>

              {user?.id === post.author.id && (
                <div className="absolute top-4 right-4 relative">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveMenuPostId(activeMenuPostId === post.id ? null : post.id);
                    }}
                    className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                  >
                    <MoreHorizontal size={20} />
                  </button>
                  {activeMenuPostId === post.id && (
                    <div
                      onClick={(e) => e.stopPropagation()}
                      className="absolute right-0 top-8 w-40 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-100 dark:border-slate-700 z-10 overflow-hidden animate-scale-in"
                    >
                      <button onClick={() => handleStartEditPost(post)} className="w-full text-left px-4 py-3 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-2 text-sm font-medium">
                        <Edit2 size={16} /> Sửa
                      </button>
                      <button onClick={() => handleDeletePost(post.id)} className="w-full text-left px-4 py-3 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-2 text-sm font-medium">
                        <Trash2 size={16} /> Xóa
                      </button>
                    </div>
                  )}
                </div>
              )}

              {editingPostId === post.id ? (
                <div className="mb-4">
                  <textarea
                    value={editPostContent}
                    onChange={(e) => setEditPostContent(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-indigo-200 dark:border-slate-700 rounded-xl p-3 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 mb-2"
                    rows={3}
                  />
                  <div className="flex gap-2 justify-end">
                    <button onClick={() => setEditingPostId(null)} className="px-3 py-1.5 text-sm font-medium text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg">Hủy</button>
                    <button onClick={() => handleUpdatePost(post.id)} className="px-3 py-1.5 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg">Lưu</button>
                  </div>
                </div>
              ) : (
                <p className="text-slate-700 dark:text-slate-200 mb-4 leading-relaxed whitespace-pre-wrap">{post.content}</p>
              )}

              {
                post.image && (
                  <div className="mb-4 rounded-xl overflow-hidden shadow-sm border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900">
                    <img
                      src={post.image}
                      alt="Post content"
                      onClick={() => setSelectedImage(post.image!)}
                      className="w-full h-auto max-h-[500px] object-cover cursor-pointer hover:opacity-95 transition-opacity"
                    />
                  </div>
                )
              }

              <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-800 mb-2">
                <button
                  onClick={() => handleLike(post.id)}
                  className={`flex items-center gap-2 transition-colors ${isLiked ? 'text-red-500' : 'text-slate-500 dark:text-slate-400 hover:text-red-500 dark:hover:text-red-400'}`}
                >
                  <Heart size={20} fill={isLiked ? "currentColor" : "none"} />
                  <span>{post._count.likes}</span>
                </button>
                <button
                  onClick={() => setActiveCommentId(activeCommentId === post.id ? null : post.id)}
                  className="flex items-center gap-2 text-slate-500 dark:text-slate-400 hover:text-indigo-500 dark:hover:text-indigo-400 transition-colors"
                >
                  <MessageCircle size={20} />
                  <span>{post._count.comments}</span>
                </button>
                <button
                  onClick={() => {
                    const url = window.location.origin + '/post/' + post.id;
                    navigator.clipboard.writeText(url);
                    alert('Đã sao chép liên kết bài viết!');
                  }}
                  className="flex items-center gap-2 text-slate-500 dark:text-slate-400 hover:text-indigo-500 dark:hover:text-indigo-400 transition-colors"
                >
                  <Share2 size={20} />
                </button>
              </div>

              {
                activeCommentId === post.id && (
                  <div className="mt-4 pt-4 border-t border-slate-50 dark:border-slate-800 animate-fade-in">
                    <div className="flex gap-2 mb-4">
                      <img src={getAvatarUrl(user?.avatar, user?.username)} className="w-8 h-8 rounded-full" alt="MyAvatar" />
                      <div className="flex-1 relative">
                        <input
                          type="text"
                          value={commentText}
                          onChange={(e) => setCommentText(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && handleCommentSubmit(post.id)}
                          placeholder="Viết bình luận..."
                          className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl px-4 py-2 pr-10 focus:ring-2 focus:ring-indigo-100 dark:focus:ring-indigo-900 outline-none text-sm dark:text-slate-200"
                        />
                        <button
                          onClick={() => handleCommentSubmit(post.id)}
                          className="absolute right-2 top-1.5 text-indigo-500 hover:text-indigo-600 p-1"
                        >
                          <Send size={16} />
                        </button>
                      </div>
                    </div>

                    <div className="space-y-3 max-h-60 overflow-y-auto custom-scrollbar">
                      {post.comments.map((comment: any) => (
                        <div key={comment.id} className="flex gap-2 items-start">
                          <Link to={`/profile/${comment.authorId}`}>
                            <img src={getAvatarUrl(comment.author?.avatar, comment.author?.username)} className="w-7 h-7 rounded-full" alt="CommenterAvatar" />
                          </Link>
                          <div className="bg-slate-50 dark:bg-slate-800 p-2.5 rounded-2xl rounded-tl-none">
                            <Link to={`/profile/${comment.authorId}`} className="font-bold text-xs text-slate-900 dark:text-slate-100 block mb-0.5">
                              {comment.author?.fullName}
                            </Link>
                            <p className="text-sm text-slate-700 dark:text-slate-300">{comment.content}</p>
                          </div>
                          <span className="text-[10px] text-slate-400 mt-1 self-end whitespace-nowrap">
                            {formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true, locale: vi })}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              }
            </div>
          );
        })
      )}

      {
        selectedImage && (
          <div
            className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center p-4 animate-fade-in cursor-zoom-out"
            onClick={() => setSelectedImage(null)}
          >
            <button
              onClick={() => setSelectedImage(null)}
              className="absolute top-4 right-4 text-white/70 hover:text-white bg-white/10 p-2 rounded-full backdrop-blur-sm transition-colors"
            >
              <X size={32} />
            </button>
            <img
              src={selectedImage}
              className="max-w-full max-h-[90vh] object-contain rounded-lg shadow-2xl animate-zoom-in"
              alt="Full preview"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        )
      }
    </div >
  );
}