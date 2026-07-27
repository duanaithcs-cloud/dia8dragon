import React, { useState } from 'react';
import { useDialogFocus } from '../utils/accessibility';

interface IdentityDialogProps {
  onConfirm: (fullName: string, className: string) => void;
  onCancel: () => void;
}

const IdentityDialog: React.FC<IdentityDialogProps> = ({ onConfirm, onCancel }) => {
  const [name, setName] = useState('');
  const [cls, setCls] = useState('');
  const dialogRef = useDialogFocus<HTMLDivElement>(onCancel);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim() && cls.trim()) {
      onConfirm(name.trim().toUpperCase(), cls.trim().toUpperCase());
    }
  };

  return (
    <div ref={dialogRef} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby="identity-dialog-title" className="fixed inset-0 z-[300] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-xl animate-fade-in" onClick={onCancel}></div>
      <div className="relative w-full max-w-md bg-background-dark border border-white/10 rounded-[32px] shadow-[0_0_100px_rgba(13,51,242,0.3)] overflow-hidden animate-pop-in">
        <button
          type="button"
          onClick={onCancel}
          aria-label="Đóng hộp thoại hồ sơ"
          className="absolute right-4 top-4 z-20 size-11 rounded-2xl border border-white/10 bg-white/10 text-white flex items-center justify-center hover:bg-rose-500/20 hover:border-rose-300/40 transition-all"
        >
          <span className="material-symbols-outlined text-xl">close</span>
        </button>
        <div className="p-10 space-y-8">
          <div className="text-center space-y-2">
            <div className="size-20 bg-primary/20 border border-primary/40 rounded-3xl mx-auto flex items-center justify-center mb-4">
              <span className="material-symbols-outlined text-4xl text-primary animate-pulse">shield_person</span>
            </div>
            <h2 id="identity-dialog-title" className="text-2xl font-black uppercase tracking-tight text-white italic">Xác nhận</h2>
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-500">Hồ sơ học tập</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest ml-2">Họ tên</label>
              <input
                autoFocus
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="VD: NGUYỄN VĂN A"
                className="w-full h-16 bg-white/5 border border-white/10 rounded-2xl px-6 text-lg font-bold text-white placeholder:text-gray-700 focus:border-primary focus:ring-0 transition-all uppercase"
              />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest ml-2">Lớp</label>
              <input
                type="text"
                value={cls}
                onChange={(e) => setCls(e.target.value)}
                placeholder="VD: 8A"
                className="w-full h-16 bg-white/5 border border-white/10 rounded-2xl px-6 text-lg font-bold text-white placeholder:text-gray-700 focus:border-primary focus:ring-0 transition-all uppercase"
              />
            </div>

            <div className="bg-amber-500/10 border border-amber-500/20 p-4 rounded-2xl">
              <p className="text-[10px] text-amber-500 font-bold leading-relaxed italic">
                Lưu ý: Sau khi ký tên, tiến độ sẽ về 0% để ghi năng lực thật.
              </p>
            </div>

            <button
              type="submit"
              disabled={!name || !cls}
              className="group relative w-full h-16 bg-primary text-white font-black uppercase tracking-[0.2em] rounded-2xl shadow-[0_10px_30px_rgba(13,51,242,0.4)] hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-30 disabled:pointer-events-none"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700 ease-in-out"></div>
              Ký tên
            </button>
          </form>
        </div>

        <div className="px-10 py-4 bg-white/5 border-t border-white/5 text-center">
          <p className="text-[8px] font-black text-gray-600 uppercase tracking-widest">Dữ liệu lưu trên máy</p>
        </div>
      </div>
      <style>{`
        @keyframes pop-in {
          from { transform: scale(0.9); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }
        .animate-pop-in { animation: pop-in 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
      `}</style>
    </div>
  );
};

export default IdentityDialog;

