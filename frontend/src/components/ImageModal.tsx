
import { X } from 'lucide-react';

interface ImageModalProps {
    src: string | null;
    onClose: () => void;
}

export default function ImageModal({ src, onClose }: ImageModalProps) {
    if (!src) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 animate-fade-in" onClick={onClose}>
            <button
                onClick={onClose}
                className="absolute top-4 right-4 text-white/70 hover:text-white p-2 rounded-full hover:bg-white/10 transition-colors"
            >
                <X size={32} />
            </button>
            <img
                src={src}
                alt="Full View"
                className="max-w-[95vw] max-h-[95vh] object-contain rounded-lg shadow-2xl animate-scale-in"
                onClick={(e) => e.stopPropagation()} // Prevent close when clicking image
            />
        </div>
    );
}
