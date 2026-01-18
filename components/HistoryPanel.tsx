
import React from 'react';
import { HistoryEntry } from '../types';

interface HistoryPanelProps {
  history: HistoryEntry[];
  onClose: () => void;
  onJumpToTopic: (id: number) => void;
}

const HistoryPanel: React.FC<HistoryPanelProps> = ({ history, onClose, onJumpToTopic }) => {
  const formatTime = (isoString: string) => {
    const date = new Date(isoString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);

    if (diffMins < 1) return 'Vừa xong';
    if (diffMins < 60) return `${diffMins} phút trước`;
    if (diffHours < 24) return `${diffHours} giờ trước`;
    return date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
  };

  const getTypeStyles = (type: string) => {
    switch (type) {
      case 'TOPIC_VIEW': return { icon: 'visibility', color: 'text-c1-cyan', bg: 'bg-c1-cyan/10', label: 'Xem chuyên đề' };
      case 'QUIZ_COMPLETE': return { icon: 'check_circle', color: 'text-c4-green', bg: 'bg-c4-green/10', label: 'Hoàn thành đề' };
      case 'INSIGHT_GEN': return { icon: 'auto_awesome', color: 'text-c2-indigo', bg: 'bg-c2-indigo/10', label: 'Tra cứu Insight' };
      default: return { icon: 'history', color: 'text-gray-400', bg: 'bg-white/5', label: 'Hoạt động' };
    }
  };

  return (
    <div className="fixed inset-0 z-[70] flex justify-end">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose}></div>
      <div className="relative w-full max-w-md h-full bg-background-dark border-l border-white/10 flex flex-col shadow-2xl animate-slide-in-right">
        <header className="p-6 border-b border-white/10 flex items-center justify-between shrink-0">
          <div>
            <h2 className="text-xl font-bold flex items-center gap-2">
              <span className="material-symbols-outlined text-primary">history</span>
              Lịch sử học tập
            </h2>
            <p className="text-[10px] text-gray-500 uppercase font-black tracking-widest mt-1">Hành trình bồi dưỡng HSG</p>
          </div>
          <button onClick={onClose} className="size-8 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors">
            <span className="material-symbols-outlined text-sm">close</span>
          </button>
        </header>

        <div className="flex-1 overflow-y-auto p-6 space-y-4 no-scrollbar">
          {history.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center opacity-40">
              <span className="material-symbols-outlined text-6xl mb-4">history_edu</span>
              <p className="text-sm font-medium">Chưa có dữ liệu học tập nào được ghi lại.</p>
              <p className="text-[10px] uppercase mt-1 tracking-tighter">Hãy bắt đầu ôn luyện ngay hôm nay!</p>
            </div>
          ) : (
            history.map((entry, idx) => {
              const style = getTypeStyles(entry.type);
              return (
                <div key={entry.id} className="relative flex gap-4 group">
                  {idx !== history.length - 1 && (
                    <div className="absolute left-[15px] top-8 bottom-0 w-0.5 bg-white/5"></div>
                  )}
                  
                  <div className={`size-8 rounded-full ${style.bg} ${style.color} flex items-center justify-center shrink-0 z-10 border border-white/5`}>
                    <span className="material-symbols-outlined text-sm">{style.icon}</span>
                  </div>

                  <div className="flex-1 pb-6">
                    <div className="flex items-center justify-between mb-1">
                      <span className={`text-[9px] font-black uppercase tracking-widest ${style.color}`}>{style.label}</span>
                      <span className="text-[9px] text-gray-600 font-bold">{formatTime(entry.timestamp)}</span>
                    </div>
                    <div 
                      onClick={() => onJumpToTopic(entry.topicId)}
                      className="p-3 rounded-xl bg-white/5 border border-white/5 hover:bg-white/10 hover:border-primary/30 transition-all cursor-pointer group/card"
                    >
                      <h4 className="text-xs font-bold text-gray-200 group-hover/card:text-primary transition-colors">{entry.topicLabel}</h4>
                      {entry.details && (
                        <p className="text-[10px] text-gray-500 mt-1 line-clamp-2 leading-relaxed italic">
                          {entry.details}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        <footer className="p-6 border-t border-white/10 bg-black/20 text-center shrink-0">
          <p className="text-[10px] text-gray-600 font-bold uppercase tracking-widest">Ghi nhận tối đa 50 hoạt động gần nhất</p>
        </footer>
      </div>
      
      <style>{`
        @keyframes slide-in-right {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
        .animate-slide-in-right {
          animation: slide-in-right 0.4s cubic-bezier(0.16, 1, 0.3, 1);
        }
      `}</style>
    </div>
  );
};

export default HistoryPanel;
