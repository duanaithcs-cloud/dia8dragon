
import React, { useState } from 'react';

interface IdentityDialogProps {
  onConfirm: (fullName: string, className: string) => void;
  onCancel: () => void;
}

const IdentityDialog: React.FC<IdentityDialogProps> = ({ onConfirm, onCancel }) => {
  const [name, setName] = useState("");
  const [cls, setCls] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim() && cls.trim()) {
      onConfirm(name.trim().toUpperCase(), cls.trim().toUpperCase());
    }
  };

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-xl animate-fade-in" onClick={onCancel}></div>
      <div className="relative w-full max-w-md bg-background-dark border border-white/10 rounded-[40px] shadow-[0_0_100px_rgba(13,51,242,0.3)] overflow-hidden animate-pop-in">
        <div className="p-10 space-y-8">
          <div className="text-center space-y-2">
            <div className="size-20 bg-primary/20 border border-primary/40 rounded-3xl mx-auto flex items-center justify-center mb-4">
              <span className="material-symbols-outlined text-4xl text-primary animate-pulse">shield_person</span>
            </div>
            <h2 className="text-2xl font-black uppercase tracking-tight text-white italic">Xác nhận danh tính</h2>
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-500">Apple Education Standards</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest ml-2">Họ và Tên</label>
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
                ⚠️ CHÚ Ý: Sau khi ký tên, toàn bộ tiến độ bong bóng sẽ được reset về 0% để bắt đầu ghi nhận năng lực thực tế của bạn.
              </p>
            </div>

            <button 
              type="submit"
              disabled={!name || !cls}
              className="group relative w-full h-16 bg-primary text-white font-black uppercase tracking-[0.2em] rounded-2xl shadow-[0_10px_30px_rgba(13,51,242,0.4)] hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-30 disabled:pointer-events-none"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700 ease-in-out"></div>
              KÝ TÊN & BẮT ĐẦU
            </button>
          </form>
        </div>

        <div className="px-10 py-4 bg-white/5 border-t border-white/5 text-center">
          <p className="text-[8px] font-black text-gray-600 uppercase tracking-widest">Dữ liệu được bảo mật & Audited bởi Địa AI System</p>
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
