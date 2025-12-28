// src/pages/CreatePost.tsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPost } from '../services/api';
import { Image as ImageIcon, Send } from 'lucide-react';

export default function CreatePost() {
    const [content, setContent] = useState('');
    const [image, setImage] = useState<File | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const navigate = useNavigate();

    const handlePostSubmit = async () => {
        if (!content.trim() && !image) return;
        setSubmitting(true);
        const formData = new FormData();
        formData.append('content', content);
        if (image) formData.append('image', image);

        try {
            await createPost(formData);
            navigate('/'); // Go back home
        } catch (error) {
            alert('Đăng bài thất bại');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="max-w-xl mx-auto">
            <h1 className="text-3xl font-extrabold heading-gradient mb-6">Tạo bài viết mới</h1>

            <div className="glass-card p-6">
                <textarea
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder="Bạn đang nghĩ gì?"
                    rows={6}
                    className="glass-input w-full rounded-xl resize-none text-lg mb-4"
                    autoFocus
                />

                {image && (
                    <div className="mb-4 relative inline-block">
                        <img src={URL.createObjectURL(image)} alt="Preview" className="h-48 w-auto rounded-xl border border-slate-200 shadow-sm" />
                        <button onClick={() => setImage(null)} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm shadow-md">×</button>
                    </div>
                )}

                <div className="flex justify-between items-center pt-4 border-t border-indigo-50">
                    <label className="cursor-pointer text-indigo-600 hover:bg-indigo-50 p-3 rounded-xl transition-colors flex items-center gap-2 font-bold">
                        <ImageIcon size={24} />
                        <span>Thêm ảnh</span>
                        <input type="file" hidden accept="image/*" onChange={(e) => setImage(e.target.files?.[0] || null)} />
                    </label>

                    <button
                        onClick={handlePostSubmit}
                        disabled={submitting || (!content && !image)}
                        className="bg-indigo-600 text-white px-8 py-3 rounded-xl font-bold shadow-lg shadow-indigo-500/30 hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-2"
                    >
                        <Send size={20} />
                        {submitting ? 'Đang đăng...' : 'Đăng ngay'}
                    </button>
                </div>
            </div>
        </div>
    );
}
