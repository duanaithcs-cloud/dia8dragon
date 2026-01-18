
import React, { useState, useEffect } from 'react';
import { Topic, TagLevel, SearchResult, HistoryEntry, ArenaStats } from '../types';

interface TopicDrawerProps {
  topic: Topic;
  history: HistoryEntry[];
  arenaStore?: Record<number, ArenaStats>;
  onClose: () => void;
  onStartLuyen10: () => void;
  onStartLuyen25: () => void;
  onStartArena: () => void; // Added Arena Action
  onFetchInsights: (topic: Topic) => Promise<SearchResult>;
  onShowInfographic: () => void; // New action
}

const TopicDrawer: React.FC<TopicDrawerProps> = ({ topic, history = [], arenaStore = {}, onClose, onStartLuyen10, onStartLuyen25, onStartArena, onFetchInsights, onShowInfographic }) => {
  const [isDataValid, setIsDataValid] = useState(true);

  useEffect(() => {
    if (!topic || topic.topic_id < 1 || topic.topic_id > 77) {
      setIsDataValid(false);
    }
  }, [topic]);

  const formatTimeRelative = (isoString: string) => {
    const date = new Date(isoString);
    const now = new Date();
    const diffMins = Math.floor((now.getTime() - date.getTime()) / 60000);
    if (diffMins < 1) return 'Vừa xong';
    if (diffMins < 60) return `${diffMins} phút trước`;
    if (diffMins < 1440) return `${Math.floor(diffMins/60)} giờ trước`;
    return date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
  };

  const getScoreColor = (details: string | undefined) => {
    if (!details || !details.includes('/')) return 'text-gray-400';
    const match = details.match(/(\d+)\/(\d+)/);
    if (!match) return 'text-gray-400';
    const ratio = parseInt(match[1]) / parseInt(match[2]);
    if (ratio >= 0.8) return 'text-c4-green';
    if (ratio >= 0.5) return 'text-amber-500';
    return 'text-danger-glow';
  };

  if (!isDataValid) return null;

  const validHistory = (history || []).filter(h => h && (h.type === 'QUIZ_COMPLETE' || h.type === 'ARENA_MATCH_END'));
  const stars = arenaStore[topic.topic_id]?.star_level || 0;

  return (
    <div className="fixed inset-0 z-[60] flex flex-col justify-end">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose}></div>
      <div className="relative w-full max-h-[95%] bg-background-dark rounded-t-[32px] border-t border-white/10 flex flex-col overflow-hidden animate-slide-up shadow-2xl">
        <div className="w-full h-1.5 flex justify-center py-4 shrink-0">
          <div className="w-16 h-1.5 rounded-full bg-white/20"></div>
        </div>
        
        <div className="px-6 pb-40 overflow-y-auto space-y-6 no-scrollbar">
          <header className="flex flex-col md:flex-row items-center md:items-start gap-8 pt-4">
            <div className="flex flex-col items-center gap-2">
              {/* Star Badge Row */}
              {stars > 0 && (
                <div className="flex gap-1 animate-pop-badge mb-1">
                  {Array.from({ length: stars }).map((_, i) => (
                    <span key={i} className="material-symbols-outlined text-amber-500 text-2xl drop-shadow-[0_0_8px_rgba(245,158,11,0.6)] fill-1">star</span>
                  ))}
                </div>
              )}
              
              <div 
                onClick={onShowInfographic}
                className="size-48 shrink-0 rounded-full flex items-center justify-center border-8 relative overflow-hidden bubble-inner shadow-2xl cursor-pointer group/img"
                style={{ 
                  ['--neon-color' as any]: topic.color, 
                  ['--core-color' as any]: `${topic.color}aa`,
                  borderColor: topic.color,
                  boxShadow: `0 20px 60px -15px ${topic.color}88, inset 0 0 40px ${topic.color}44`
                }}
              >
                <span className="material-symbols-outlined text-7xl z-10 text-white drop-shadow-2xl group-hover/img:scale-110 transition-transform">auto_awesome_motion</span>
                <div className="bubble-shimmer"></div>
                <div className="absolute inset-0 bg-primary/20 opacity-0 group-hover/img:opacity-100 transition-opacity flex flex-col items-center justify-center z-20">
                   <span className="text-[10px] font-black uppercase text-white tracking-widest">XEM ẢNH</span>
                </div>
              </div>
            </div>

            <div className="flex-1 text-center md:text-left">
              <div className="flex items-center justify-center md:justify-start gap-3 mb-3">
                <span className="px-3 py-1 rounded-full bg-white/5 border border-white/10 text-[11px] font-black uppercase tracking-widest text-gray-400">
                  CHUYÊN ĐỀ #{topic.topic_id}
                </span>
                <span className="px-4 py-1 rounded-full text-[11px] font-black uppercase tracking-widest text-white border-2" style={{ backgroundColor: `${topic.color}44`, borderColor: topic.color }}>
                  {topic.tag_level}
                </span>
              </div>
              <h2 className="text-4xl font-black leading-tight mb-5 text-white uppercase tracking-tight text-halo">
                {topic.keyword_label}
              </h2>
              <div className="flex flex-col sm:flex-row gap-4 mb-4">
                <button 
                  onClick={onShowInfographic}
                  className="flex-1 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center gap-3 text-[10px] font-black uppercase tracking-[0.2em] hover:bg-white/10 transition-all"
                >
                  <span className="material-symbols-outlined text-sm">image</span> Xem Infographic
                </button>
              </div>
              <div className="bg-white/5 p-6 rounded-3xl border border-white/10">
                <p className="text-gray-200 text-base leading-relaxed font-medium">
                  {topic.full_text}
                </p>
              </div>
            </div>
          </header>

          <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white/5 border border-white/10 rounded-3xl p-8 relative overflow-hidden group">
              <div className="flex justify-between items-start mb-4 relative z-10">
                <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">Mastery Level</span>
                <span className={`px-2 py-1 rounded-full text-[10px] font-black flex items-center gap-1 bg-white/5 border border-white/10 ${topic.delta >= 0 ? 'text-c4-green' : 'text-danger-glow'}`}>
                  {topic.delta >= 0 ? '▲' : '▼'} {Math.abs(topic.delta)}%
                </span>
              </div>
              <div className={`text-7xl font-black mb-4 tabular-nums text-halo relative z-10 ${topic.mastery_percent > 100 ? 'text-c4-green' : 'text-white'}`}>
                {topic.mastery_percent}%{topic.mastery_percent > 100 && '+'}
              </div>
              <div className="w-full h-4 bg-white/10 rounded-full overflow-hidden relative z-10">
                <div className="h-full rounded-full transition-all duration-1000 shadow-[0_0_15px_rgba(255,255,255,0.4)]" style={{ width: `${Math.min(100, topic.mastery_percent)}%`, backgroundColor: topic.color }}></div>
              </div>
              <div className="absolute -right-8 -bottom-8 size-40 rounded-full blur-3xl opacity-20 pointer-events-none" style={{ backgroundColor: topic.color }}></div>
            </div>

            <div className="bg-white/5 border border-white/10 rounded-3xl p-8 flex flex-col relative overflow-hidden">
              <span className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-4 flex items-center gap-2 relative z-10">
                <span className="material-symbols-outlined text-sm">history</span> Lịch sử ôn luyện
              </span>
              <div className="flex-1 space-y-3 overflow-y-auto no-scrollbar max-h-48 relative z-10">
                {validHistory.length > 0 ? (
                  validHistory.slice(0, 5).map(h => (
                    <div key={h.id} className="flex items-center justify-between text-xs p-4 bg-white/5 rounded-2xl border border-white/5">
                      <div className="flex flex-col">
                        <span className="text-gray-300 font-bold">{formatTimeRelative(h.timestamp)}</span>
                        <span className="text-gray-500 uppercase text-[10px] font-black">{h.type === 'ARENA_MATCH_END' ? 'ARENA' : h.details?.split(':')[0]}</span>
                      </div>
                      <span className={`font-black text-base px-3 py-1 rounded-xl bg-black/20 ${getScoreColor(h.details)}`}>
                        {h.details?.includes(':') ? h.details.split(':').pop()?.trim() : h.details}
                      </span>
                    </div>
                  ))
                ) : (
                  <div className="h-full flex flex-col items-center justify-center opacity-30 italic py-8 text-[11px] font-bold uppercase tracking-widest">
                     Chưa có dữ liệu
                  </div>
                )}
              </div>
            </div>
          </section>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <button onClick={onStartLuyen10} className="h-16 rounded-2xl border-2 border-primary text-primary font-black uppercase tracking-widest hover:bg-primary/10 transition-all flex items-center justify-center gap-3 active:scale-95 text-xs">
              <span className="material-symbols-outlined text-xl">quiz</span> Luyện 10 câu
            </button>
            <button onClick={onStartLuyen25} className="h-16 rounded-2xl bg-white/5 border border-white/10 text-white font-black uppercase tracking-widest hover:bg-white/10 transition-all flex items-center justify-center gap-3 active:scale-95 text-xs">
              <span className="material-symbols-outlined text-xl">bolt</span> Luyện 25 câu
            </button>
            <button onClick={onStartArena} className="h-16 rounded-2xl bg-danger-glow text-white font-black uppercase tracking-widest shadow-xl shadow-danger-glow/20 hover:brightness-110 transition-all flex items-center justify-center gap-3 active:scale-95 text-xs">
              <span className="material-symbols-outlined text-xl">swords</span> Arena 1v1
            </button>
          </div>
        </div>

        <div className="absolute bottom-0 left-0 right-0 p-6 bg-background-dark/95 backdrop-blur-2xl border-t border-white/10 text-center">
            <p className="text-[11px] font-black uppercase text-gray-500 tracking-widest flex items-center justify-center gap-2">
                <span className="material-symbols-outlined text-[16px] text-primary">verified_user</span> 100% CONTENT TRUTH AUDITED & LOCKED
            </p>
        </div>
      </div>
      <style>{`
        .text-halo { text-shadow: 0 0 10px rgba(255,255,255,0.2); }
      `}</style>
    </div>
  );
};

export default TopicDrawer;
