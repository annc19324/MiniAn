// src/pages/Home.tsx
import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { getFeed, createPost, likePost, dailyCheckIn } from '../services/api';
import { MessageCircle, Heart, Share2, Image as ImageIcon } from 'lucide-react';
import { Link } from 'react-router-dom';

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

  const handleCheckIn = async () => {
    try {
      const res = await dailyCheckIn();
      alert(res.data.message);
      // Cập nhật lại user info nếu cần
      if (user) {
        const newUser = { ...user, coins: user.coins + (res.data.coinsAdded || 0) };
        const token = localStorage.getItem('token');
        if (token) login(token, newUser); // Cập nhật context
      }
    } catch (error: any) {
      alert(error.response?.data?.message || 'Lỗi điểm danh');
    }
  };

  return (
    <div className="space-y-6">
      <div className="glass-card mb-6 flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-purple-600">
            Xin chào, {user?.fullName}!
          </h2>
          <p className="text-slate-500 text-sm">Coins: <span className="font-bold text-yellow-500">{user?.coins}</span> 🪙</p>
        </div>
        <button
          onClick={handleCheckIn}
          className="bg-gradient-to-r from-yellow-400 to-orange-500 text-white px-4 py-2 rounded-lg shadow-md hover:shadow-lg transform hover:-translate-y-0.5 transition-all font-bold text-sm"
        >
          📅 Điểm danh
        </button>
      </div>

      <div className="glass-card p-4 flex gap-4 items-start">
        <img src={user?.avatar || `https://ui-avatars.com/api/?name=${user?.username}`} className="w-10 h-10 rounded-full border-2 border-white shadow-sm" alt="Avatar" />
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
              <img src={URL.createObjectURL(image)} alt="Preview" className="h-20 w-auto rounded-lg border border-slate-200" />
              <button onClick={() => setImage(null)} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs">×</button>
            </div>
          )}

          <div className="flex justify-between items-center mt-3">
            <label className="cursor-pointer text-indigo-500 hover:bg-indigo-50 p-2 rounded-lg transition-colors flex items-center gap-2 text-sm font-medium">
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
        posts.map((post) => {
          const isLiked = post.likes.some(l => l.userId === user?.id);
          return (
            <div key={post.id} className="glass-card animate-slide-up">
              <div className="flex items-center gap-3 mb-4">
                <Link to={`/profile/${post.author.id}`}>
                  <img src={post.author.avatar || `https://ui-avatars.com/api/?name=${post.author.username}`} className="w-10 h-10 rounded-full border-2 border-white shadow-sm" alt="Avatar" />
                </Link>
                <div>
                  <Link to={`/profile/${post.author.id}`} className="font-bold text-slate-800 hover:underline">{post.author.fullName}</Link>
                  <p className="text-xs text-slate-500">{new Date(post.createdAt).toLocaleDateString('vi-VN')} {new Date(post.createdAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}</p>
                </div>
              </div>

              <p className="text-slate-700 mb-4 leading-relaxed whitespace-pre-wrap">{post.content}</p>

              {post.image && (
                <div className="mb-4 rounded-xl overflow-hidden shadow-sm border border-slate-100">
                  <img src={post.image} alt="Post content" className="w-full h-auto max-h-96 object-cover" />
                </div>
              )}

              <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                <button
                  onClick={() => handleLike(post.id)}
                  className={`flex items-center gap-2 transition-colors ${isLiked ? 'text-red-500' : 'text-slate-500 hover:text-red-500'}`}
                >
                  <Heart size={20} fill={isLiked ? "currentColor" : "none"} />
                  <span>{post._count.likes}</span>
                </button>
                <button className="flex items-center gap-2 text-slate-500 hover:text-indigo-500 transition-colors">
                  <MessageCircle size={20} />
                  <span>{post._count.comments}</span>
                </button>
                <button className="flex items-center gap-2 text-slate-500 hover:text-indigo-500 transition-colors">
                  <Share2 size={20} />
                </button>
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}