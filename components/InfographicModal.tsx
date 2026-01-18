
import React, { useEffect, useState, useRef } from 'react';

interface InfographicModalProps {
  url: string;
  topicName: string;
  onClose: () => void;
}

const InfographicModal: React.FC<InfographicModalProps> = ({ url, topicName, onClose }) => {
  const [loading, setLoading] = useState(true);
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  // Khóa cuộn trang khi mở Modal
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = 'auto';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);

  const handleZoomIn = () => setScale(prev => Math.min(prev + 0.5, 5));
  const handleZoomOut = () => {
    setScale(prev => {
      const next = Math.max(prev - 0.5, 0.5);
      if (next <= 1) setPosition({ x: 0, y: 0 });
      return next;
    });
  };
  const handleReset = () => {
    setScale(1);
    setPosition({ x: 0, y: 0 });
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    if (scale <= 1) return;
    setIsDragging(true);
    // Sử dụng clientX/Y để tính toán vị trí kéo chính xác
    setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging) return;
    setPosition({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y
    });
  };

  const handlePointerUp = () => setIsDragging(false);

  return (
    <div 
      className="fixed inset-0 z-[2000] flex flex-col items-center justify-center animate-fade-in touch-none select-none"
      style={{ background: 'rgba(2, 3, 5, 0.98)', backdropFilter: 'blur(40px)' }}
    >
      {/* Nền phía sau để click thoát nhanh */}
      <div className="absolute inset-0 z-0" onClick={onClose}></div>

      {/* Khu vực hiển thị ảnh chính */}
      <div 
        ref={containerRef}
        className={`relative w-full h-full flex items-center justify-center overflow-hidden z-10 ${scale > 1 ? 'cursor-grab' : 'cursor-default'} ${isDragging ? 'cursor-grabbing' : ''}`}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
      >
        <div 
          className="relative transition-transform duration-200 ease-out will-change-transform"
          style={{ 
            transform: `translate3d(${position.x}px, ${position.y}px, 0) scale(${scale})`,
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {loading && (
            <div className="absolute inset-0 flex flex-col items-center justify-center z-20">
              <div className="size-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
              <p className="text-[10px] font-black uppercase mt-6 tracking-[0.4em] text-primary animate-pulse">Nạp Data...</p>
            </div>
          )}
          <img 
            src={url} 
            alt={topicName}
            onLoad={() => setLoading(false)}
            draggable={false}
            className={`max-w-[100vw] max-h-[100vh] md:max-w-[90vw] md:max-h-[85vh] object-contain transition-opacity duration-500 ${loading ? 'opacity-0' : 'opacity-100 shadow-[0_0_80px_rgba(0,0,0,0.9)]'}`}
          />
        </div>
      </div>

      {/* Header Bar: Tên chuyên đề - Tối giản */}
      <div className="absolute top-0 left-0 right-0 p-6 flex justify-between items-center z-50 pointer-events-none">
        <div className="bg-black/40 backdrop-blur-xl px-5 py-3 rounded-2xl border border-white/5 animate-slide-down">
          <h3 className="text-sm md:text-lg font-black text-white uppercase tracking-tight italic">{topicName}</h3>
        </div>
        <button 
          onClick={onClose}
          className="size-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-white pointer-events-auto hover:bg-danger-glow transition-all active:scale-90"
        >
          <span className="material-symbols-outlined text-2xl">close</span>
        </button>
      </div>

      {/* Control Dock: Bo tròn, siêu mỏng cho mobile */}
      <div className="absolute bottom-10 left-1/2 -translate-x-1/2 flex items-center gap-1 p-1.5 rounded-full bg-black/60 border border-white/10 backdrop-blur-3xl shadow-2xl animate-slide-up z-50 pointer-events-auto">
        <div className="flex items-center px-4">
           <span className="text-[10px] font-black text-white/50 uppercase tabular-nums">{Math.round(scale * 100)}%</span>
        </div>
        
        <div className="h-6 w-px bg-white/10 mx-1"></div>

        <button 
          onClick={handleZoomOut}
          className="size-11 rounded-full flex items-center justify-center text-white hover:bg-white/10 transition-all active:scale-90"
        >
          <span className="material-symbols-outlined text-2xl">remove</span>
        </button>
        
        <button 
          onClick={handleReset}
          className="size-11 rounded-full flex items-center justify-center text-white bg-white/10 hover:bg-white/20 transition-all active:scale-90"
        >
          <span className="material-symbols-outlined text-xl">fit_screen</span>
        </button>

        <button 
          onClick={handleZoomIn}
          className="size-11 rounded-full flex items-center justify-center text-white hover:bg-white/10 transition-all active:scale-90"
        >
          <span className="material-symbols-outlined text-2xl">add</span>
        </button>
      </div>

      <style>{`
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        .animate-fade-in { animation: fadeIn 0.4s ease-out forwards; }
        
        @keyframes slide-up {
          from { transform: translate(-50%, 40px); opacity: 0; }
          to { transform: translate(-50%, 0); opacity: 1; }
        }
        .animate-slide-up { animation: slide-up 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        
        @keyframes slide-down {
          from { transform: translateY(-20px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        .animate-slide-down { animation: slide-down 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards; }

        /* Tối ưu hóa hiển thị khi xoay màn hình ngang trên mobile */
        @media (orientation: landscape) and (max-height: 500px) {
          .animate-slide-up { bottom: 15px; }
          .p-6 { padding: 1rem; }
        }
      `}</style>
    </div>
  );
};

export default InfographicModal;
