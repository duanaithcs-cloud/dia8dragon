
import React, { useState, useEffect } from 'react';
import { Topic, TagLevel, SearchResult, HistoryEntry, ArenaStats, UIPreferences } from '../types';
import { GeminiService } from '../services/geminiService';
import { preloadImage } from '../utils/imagePreloader';
import TopicResourcePanel from './TopicResourcePanel';
import { cleanDisplayText } from '../utils/textQuality';
import { useDialogFocus } from '../utils/accessibility';

interface TopicDrawerProps {
  topic: Topic;
  history: HistoryEntry[];
  arenaStore?: Record<number, ArenaStats>;
  preferences: UIPreferences;
  onUpdatePreference: (key: keyof UIPreferences, value: any) => void;
  onClose: () => void;
  onStartLuyen10: () => void;
  onStartLuyen25: () => void;
  onStartVisual: () => void;
  onStartArena: () => void; // Added Arena Action
  onStartManualQuiz: (rawJson: string) => void;
  onFetchInsights: (topic: Topic) => Promise<SearchResult>;
  onShowInfographic: (url?: string, title?: string) => void; // New action
}

const TopicDrawer: React.FC<TopicDrawerProps> = ({ topic, history = [], arenaStore = {}, preferences, onUpdatePreference, onClose, onStartLuyen10, onStartLuyen25, onStartVisual, onStartArena, onStartManualQuiz, onFetchInsights, onShowInfographic }) => {
  const [isDataValid, setIsDataValid] = useState(true);
  const [showManualPrompt, setShowManualPrompt] = useState(false);
  const [manualCount, setManualCount] = useState<10 | 25>(10);
  const [manualJson, setManualJson] = useState("");
  const [manualStatus, setManualStatus] = useState("");
  const dialogRef = useDialogFocus<HTMLDivElement>(onClose);

  useEffect(() => {
    if (!topic || topic.topic_id < 1 || topic.topic_id > 77) {
      setIsDataValid(false);
    }
  }, [topic]);

  useEffect(() => {
    void preloadImage(topic.infographic_url);
  }, [topic.infographic_url]);

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
  const manualPrompt = cleanDisplayText(GeminiService.buildManualQuizPrompt(topic, manualCount));
  const openDefaultInfographic = () => onShowInfographic(topic.infographic_url, topic.keyword_label);

  const copyManualPrompt = async () => {
    await navigator.clipboard.writeText(manualPrompt);
    setManualStatus("Đã sao chép prompt");
  };

  const submitManualJson = () => {
    if (!manualJson.trim()) {
      setManualStatus("Chưa có JSON");
      return;
    }
    onStartManualQuiz(manualJson);
  };

  return (
    <div ref={dialogRef} tabIndex={-1} className="topic-drawer-shell fixed inset-0 z-[60] isolate flex flex-col justify-end" role="dialog" aria-modal="true" aria-label={`Không gian học tập chuyên đề ${topic.keyword_label}`}>
      <div className="topic-drawer-backdrop absolute inset-0 z-0 bg-black/60 backdrop-blur-sm" onClick={onClose}></div>
      <div className="topic-drawer-panel topic-workspace-panel relative z-10 w-full max-h-[95%] bg-background-dark rounded-t-[32px] border-t border-white/10 flex flex-col overflow-hidden animate-slide-up shadow-2xl">
        <div className="topic-drawer-handle w-full h-1.5 flex justify-center py-4 shrink-0">
          <div className="w-16 h-1.5 rounded-full bg-white/20"></div>
        </div>
        
        <div className="topic-drawer-scroll topic-workspace-scroll px-6 pb-10 overflow-y-auto space-y-4 no-scrollbar">
          <header className="topic-drawer-header flex items-center justify-between gap-3 pt-1">
            <div className="flex items-center gap-3 min-w-0">
              <div
                onClick={openDefaultInfographic}
                onPointerEnter={() => void preloadImage(topic.infographic_url)}
                className="size-12 sm:size-14 shrink-0 rounded-full flex items-center justify-center border-2 relative overflow-hidden bubble-inner shadow-lg cursor-pointer group/img"
                style={{
                  ['--neon-color' as any]: topic.color,
                  ['--core-color' as any]: `${topic.color}aa`,
                  borderColor: topic.color,
                  boxShadow: `0 10px 26px -12px ${topic.color}aa, inset 0 0 18px ${topic.color}44`
                }}
                aria-label={`Chuyên đề #${topic.topic_id}`}
              >
                <span className="relative z-10 text-[11px] sm:text-xs font-black text-white tabular-nums">#{topic.topic_id}</span>
                <div className="bubble-shimmer"></div>
              </div>
              {stars > 0 && (
                <div className="hidden sm:flex gap-0.5 animate-pop-badge">
                  {Array.from({ length: stars }).map((_, i) => (
                    <span key={i} className="material-symbols-outlined text-amber-500 text-base drop-shadow-[0_0_8px_rgba(245,158,11,0.6)] fill-1">star</span>
                  ))}
                </div>
              )}
              <span className="hidden sm:inline-flex px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest text-white border" style={{ backgroundColor: `${topic.color}33`, borderColor: topic.color }}>
                {topic.tag_level}
              </span>
            </div>

            <button
              onClick={onClose}
              className="h-11 px-4 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-[0.16em] text-white hover:bg-white/10 transition-all shrink-0"
              aria-label="Đóng không gian chuyên đề và trở về Canvas"
            >
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M8 4v16M8 9h13"/></svg>
              <span>Canvas</span>
            </button>
          </header>

          <TopicResourcePanel
            topic={topic}
            preferences={preferences}
            onUpdatePreference={onUpdatePreference}
            onOpenImage={onShowInfographic}
            onStartLuyen10={onStartLuyen10}
            onStartLuyen25={onStartLuyen25}
            onStartVisual={onStartVisual}
            onStartArena={onStartArena}
            onOpenManualPrompt={() => setShowManualPrompt(true)}
          />

          <section className="topic-summary-grid grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white/5 border border-white/10 rounded-3xl p-8 relative overflow-hidden group">
              <div className="flex justify-between items-start mb-4 relative z-10">
                <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">Nắm vững</span>
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
                <span className="material-symbols-outlined text-sm">history</span> Lịch sử
              </span>
              <div className="flex-1 space-y-3 overflow-y-auto no-scrollbar max-h-48 relative z-10">
                {validHistory.length > 0 ? (
                  validHistory.slice(0, 5).map(h => (
                    <div key={h.id} className="flex items-center justify-between text-xs p-4 bg-white/5 rounded-2xl border border-white/5">
                      <div className="flex flex-col">
                        <span className="text-gray-300 font-bold">{formatTimeRelative(h.timestamp)}</span>
                        <span className="text-gray-500 uppercase text-[10px] font-black">{h.type === 'ARENA_MATCH_END' ? 'Đấu' : h.details?.split(':')[0]}</span>
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

        </div>

        {showManualPrompt && (
          <div className="absolute inset-0 z-[80] bg-background-dark/98 backdrop-blur-2xl flex flex-col">
            <div className="p-5 border-b border-white/10 flex items-center justify-between shrink-0">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.25em] text-c4-green">AI thủ công</p>
                <h3 className="text-xl font-black uppercase text-white">{topic.keyword_label}</h3>
              </div>
              <button onClick={() => setShowManualPrompt(false)} className="size-11 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 transition-all">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 grid grid-cols-1 lg:grid-cols-2 gap-5">
              <section className="space-y-4 min-h-0">
                <div className="flex items-center gap-2">
                  {[10, 25].map(count => (
                    <button
                      key={count}
                      onClick={() => setManualCount(count as 10 | 25)}
                      className={`h-10 px-4 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all ${manualCount === count ? 'bg-c4-green text-black border-c4-green' : 'bg-white/5 text-gray-400 border-white/10'}`}
                    >
                      {count} câu TN
                    </button>
                  ))}
                  <button
                    onClick={() => window.open('https://gemini.google.com/app', '_blank', 'noopener,noreferrer')}
                    className="ml-auto h-10 px-4 rounded-xl bg-primary text-white text-[10px] font-black uppercase tracking-widest flex items-center gap-2"
                  >
                    <span className="material-symbols-outlined text-sm">open_in_new</span> Mở AI
                  </button>
                </div>
                <textarea
                  readOnly
                  value={manualPrompt}
                  className="w-full min-h-[420px] bg-black/40 border border-white/10 rounded-2xl p-4 text-xs text-gray-200 leading-relaxed font-mono resize-none focus:outline-none focus:border-c4-green"
                />
                <button onClick={copyManualPrompt} className="w-full h-12 rounded-2xl bg-c4-green text-black font-black uppercase tracking-[0.18em] flex items-center justify-center gap-2">
                  <span className="material-symbols-outlined text-lg">content_copy</span> Sao chép prompt
                </button>
              </section>

              <section className="space-y-4 min-h-0">
                <div className="h-10 flex items-center justify-between">
                  <p className="text-[10px] font-black uppercase tracking-[0.25em] text-gray-500">Dán JSON AI</p>
                  {manualStatus && <span className="text-[9px] font-black uppercase text-c4-green">{manualStatus}</span>}
                </div>
                <textarea
                  value={manualJson}
                  onChange={(e) => setManualJson(e.target.value)}
                  placeholder='{"questions":[...]}'
                  className="w-full min-h-[420px] bg-black/40 border border-white/10 rounded-2xl p-4 text-xs text-gray-200 leading-relaxed font-mono resize-none focus:outline-none focus:border-primary placeholder:text-gray-700"
                />
                <button onClick={submitManualJson} className="w-full h-12 rounded-2xl bg-primary text-white font-black uppercase tracking-[0.18em] flex items-center justify-center gap-2">
                  <span className="material-symbols-outlined text-lg">play_arrow</span> Nạp đề
                </button>
              </section>
            </div>
          </div>
        )}

        <div className="topic-trust-footer absolute bottom-0 left-0 right-0 p-6 bg-background-dark/95 backdrop-blur-2xl border-t border-white/10 text-center">
            <p className="text-[11px] font-black uppercase text-gray-500 tracking-widest flex items-center justify-center gap-2">
                <span className="material-symbols-outlined text-[16px] text-primary">verified_user</span> Câu hỏi có căn cứ học liệu
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
