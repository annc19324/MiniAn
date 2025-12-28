// src/pages/Home.tsx
import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import api from '../services/api';

// Component Feed khi đã đăng nhập
function Feed() {
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/posts/feed')
      .then(res => {
        setPosts(res.data.posts);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return <div className="text-center py-10">Đang tải bài viết...</div>;
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <h2 className="text-2xl font-bold mb-6">Bảng tin</h2>
      {posts.length === 0 ? (
        <p className="text-center text-gray-500 py-10">
          Chưa có bài viết nào. Hãy là người đầu tiên đăng bài!
        </p>
      ) : (
        posts.map(post => (
          <div key={post.id} className="bg-white rounded-xl shadow-md mb-6 overflow-hidden">
            <div className="p-4 flex items-center gap-3">
              <div className="w-12 h-12 bg-gray-300 rounded-full border-2 border-dashed" />
              <div>
                <p className="font-semibold">{post.author.fullName || post.author.username}</p>
                <p className="text-sm text-gray-500">Vừa xong</p>
              </div>
            </div>

            <div className="px-4 pb-2">
              <p className="text-gray-800">{post.content}</p>
            </div>

            {post.image && (
              <img src={post.image} alt="post" className="w-full object-cover max-h-96" />
            )}

            <div className="p-4 flex justify-around border-t">
              <button className="flex items-center gap-2 text-blue-600 hover:bg-blue-50 px-4 py-2 rounded-lg">
                <span>👍</span> Thích ({post._count.likes})
              </button>
              <button className="flex items-center gap-2 text-gray-600 hover:bg-gray-100 px-4 py-2 rounded-lg">
                <span>💬</span> Bình luận ({post._count.comments})
              </button>
            </div>
          </div>
        ))
      )}
    </div>
  );
}

// Trang Home chính
export default function Home() {
  const { user, loading } = useAuth();

  // Nếu đang load auth
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-2xl font-light text-gray-600">Đang tải...</div>
      </div>
    );
  }

  // Nếu CHƯA đăng nhập → Landing Page đẹp
  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500">
        {/* Hero Section */}
        <div className="container mx-auto px-4 py-16 text-center text-white">
          <h1 className="text-5xl md:text-7xl font-bold mb-6 drop-shadow-lg">
            MiniAn
          </h1>
          <p className="text-xl md:text-3xl mb-8 font-light opacity-90">
            Kết nối bạn bè, chia sẻ khoảnh khắc vui vẻ
          </p>
          <p className="text-lg md:text-xl mb-12 max-w-3xl mx-auto opacity-80">
            Đăng bài, chat nhóm, like, comment, nhận coin hàng ngày — tất cả trong một ứng dụng nhỏ mà mạnh mẽ!
          </p>

          <div className="flex flex-col sm:flex-row gap-6 justify-center items-center">
            <Link
              to="/register"
              className="bg-white text-purple-600 px-10 py-4 rounded-full text-xl font-bold shadow-lg hover:bg-gray-100 transform hover:scale-105 transition"
            >
              Đăng ký miễn phí
            </Link>
            <Link
              to="/login"
              className="border-2 border-white px-10 py-4 rounded-full text-xl font-bold hover:bg-white hover:text-purple-600 transition"
            >
              Đăng nhập
            </Link>
          </div>
        </div>

        {/* Features */}
        <div className="bg-white/10 backdrop-blur-md py-16 mt-20">
          <div className="container mx-auto px-4 grid md:grid-cols-3 gap-10 text-center">
            <div className="bg-white/20 p-8 rounded-2xl">
              <div className="text-5xl mb-4">💬</div>
              <h3 className="text-2xl font-bold mb-3">Chat realtime</h3>
              <p>Chat cá nhân hoặc nhóm với bạn bè mọi lúc</p>
            </div>
            <div className="bg-white/20 p-8 rounded-2xl">
              <div className="text-5xl mb-4">📸</div>
              <h3 className="text-2xl font-bold mb-3">Đăng bài ảnh</h3>
              <p>Chia sẻ khoảnh khắc đẹp với ảnh và caption</p>
            </div>
            <div className="bg-white/20 p-8 rounded-2xl">
              <div className="text-5xl mb-4">🪙</div>
              <h3 className="text-2xl font-bold mb-3">Nhận coin hàng ngày</h3>
              <p>Điểm danh nhận coin, mua VIP, ẩn danh...</p>
            </div>
          </div>
        </div>

        <footer className="text-center py-10 text-white/70">
          © 2025 MiniAn - Dự án mạng xã hội mini của bạn
        </footer>
      </div>
    );
  }

  // Nếu ĐÃ đăng nhập → Hiển thị Feed
  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header đơn giản khi đăng nhập */}
      <header className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-purple-600">MiniAn</h1>
          <div className="flex items-center gap-4">
            <span>Xin chào, <strong>{user.fullName || user.username}</strong>!</span>
            <button
              onClick={() => {
                localStorage.removeItem('token');
                window.location.reload();
              }}
              className="text-sm text-gray-600 hover:text-red-600"
            >
              Đăng xuất
            </button>
          </div>
        </div>
      </header>

      {/* Feed bài viết */}
      <Feed />
    </div>
  );
}