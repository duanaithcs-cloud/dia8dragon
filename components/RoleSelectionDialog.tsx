import React from 'react';
import { useDialogFocus } from '../utils/accessibility';

interface RoleSelectionDialogProps {
  currentRole: 'STUDENT' | 'TEACHER';
  onSelect: (role: 'STUDENT' | 'TEACHER') => void;
  onClose?: () => void;
}

const RoleSelectionDialog: React.FC<RoleSelectionDialogProps> = ({ currentRole, onSelect, onClose }) => {
  const dialogRef = useDialogFocus<HTMLDivElement>(onClose);
  return (
    <div ref={dialogRef} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby="role-dialog-title" className="fixed inset-0 z-[350] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/90 backdrop-blur-2xl animate-fade-in" onClick={onClose}></div>
      <div className="relative w-full max-w-4xl rounded-[36px] border border-white/10 bg-background-dark/95 p-6 md:p-10 shadow-[0_0_120px_rgba(13,51,242,0.25)] animate-pop-in">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex size-16 items-center justify-center rounded-3xl border border-primary/40 bg-primary/15">
            <span className="material-symbols-outlined text-3xl text-primary">switch_account</span>
          </div>
          <h2 id="role-dialog-title" className="text-3xl font-black uppercase italic tracking-tight text-white">Chọn không gian sử dụng</h2>
          <p className="mt-2 text-[10px] font-black uppercase tracking-[0.3em] text-gray-500">Mỗi vai trò có luồng thao tác riêng</p>
        </div>

        <div className="grid gap-5 md:grid-cols-2">
          <button
            onClick={() => onSelect('STUDENT')}
            className={`group rounded-[28px] border p-7 text-left transition-all hover:-translate-y-1 ${currentRole === 'STUDENT' ? 'border-primary bg-primary/10 shadow-[0_0_50px_rgba(13,51,242,0.18)]' : 'border-white/10 bg-white/[0.03] hover:border-primary/50'}`}
          >
            <div className="mb-6 flex items-start justify-between">
              <div className="flex size-14 items-center justify-center rounded-2xl bg-primary text-white shadow-lg shadow-primary/20">
                <span className="material-symbols-outlined text-3xl">school</span>
              </div>
              {currentRole === 'STUDENT' && <span className="rounded-full bg-primary/20 px-3 py-1 text-[9px] font-black uppercase tracking-widest text-primary">Đang chọn</span>}
            </div>
            <h3 className="text-2xl font-black uppercase italic text-white">Học sinh</h3>
            <p className="mt-3 text-sm leading-6 text-gray-400">Học theo chuyên đề, luyện tập, thi đấu, xem tiến trình và quản lý hồ sơ cá nhân.</p>
            <div className="mt-6 flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-primary">
              Vào không gian học <span className="material-symbols-outlined text-base transition-transform group-hover:translate-x-1">arrow_forward</span>
            </div>
          </button>

          <button
            onClick={() => onSelect('TEACHER')}
            className={`group rounded-[28px] border p-7 text-left transition-all hover:-translate-y-1 ${currentRole === 'TEACHER' ? 'border-amber-500 bg-amber-500/10 shadow-[0_0_50px_rgba(245,158,11,0.16)]' : 'border-white/10 bg-white/[0.03] hover:border-amber-500/50'}`}
          >
            <div className="mb-6 flex items-start justify-between">
              <div className="flex size-14 items-center justify-center rounded-2xl bg-amber-500 text-black shadow-lg shadow-amber-500/20">
                <span className="material-symbols-outlined text-3xl">co_present</span>
              </div>
              {currentRole === 'TEACHER' && <span className="rounded-full bg-amber-500/20 px-3 py-1 text-[9px] font-black uppercase tracking-widest text-amber-500">Đang chọn</span>}
            </div>
            <h3 className="text-2xl font-black uppercase italic text-white">Giáo viên</h3>
            <p className="mt-3 text-sm leading-6 text-gray-400">Theo dõi lớp, nhập dữ liệu học sinh, phân tích năng lực, giao nhiệm vụ và quản lý sao lưu.</p>
            <div className="mt-6 flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-amber-500">
              Vào bảng giáo viên <span className="material-symbols-outlined text-base transition-transform group-hover:translate-x-1">arrow_forward</span>
            </div>
          </button>
        </div>

        <div className="mt-7 rounded-2xl border border-white/5 bg-white/[0.03] px-5 py-4 text-center text-[10px] font-bold leading-5 text-gray-500">
          Chuyển vai trò không xóa dữ liệu học tập. Chế độ giáo viên trong bản local là không gian nghiệp vụ, không phải cơ chế xác thực bảo mật.
        </div>
      </div>
    </div>
  );
};

export default RoleSelectionDialog;
