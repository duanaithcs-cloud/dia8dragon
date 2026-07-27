import React, { useMemo, useState } from 'react';
import { ArenaStats, RankLevel, Topic, UserProfile } from '../types';
import TopicIcon from './TopicIcon';

interface ArenaModeProps {
  topics: Topic[];
  userProfile: UserProfile;
  arenaStore?: Record<number, ArenaStats>;
  onStartMatch: (topicId: number) => void;
}

const GOLD = '#c89b3c';
const CYAN = '#00c8c8';


const ArenaSwordIcon: React.FC<{ size?: number; className?: string }> = ({ size = 26, className = '' }) => (
  <svg
    viewBox="0 0 24 24"
    width={size}
    height={size}
    className={className}
    aria-hidden="true"
    focusable="false"
    style={{ display: 'block' }}
  >
    <path d="m4 4 6.7 6.7M3 3l4.8 1.2L9 7l-2 2-2.8-1.2Z" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    <path d="m20 4-6.7 6.7M21 3l-4.8 1.2L15 7l2 2 2.8-1.2Z" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    <path d="m9.5 12.5-4.8 4.8M14.5 12.5l4.8 4.8M3.5 18.5l2 2 2-2-2-2ZM20.5 18.5l-2 2-2-2 2-2Z" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const CompetencyBar: React.FC<{ label: string; score: number; color: string }> = ({ label, score, color }) => (
  <div className="space-y-1">
    <div className="flex justify-between items-center px-1">
      <span className="text-[8px] font-black uppercase text-gray-400 tracking-widest">{label}</span>
      <span className="text-[10px] font-black italic" style={{ color }}>{score}%</span>
    </div>
    <div className="h-1 bg-white/5 rounded-full overflow-hidden">
      <div className="h-full rounded-full transition-all duration-1000" style={{ width: `${score}%`, backgroundColor: color, boxShadow: `0 0 10px ${color}` }}></div>
    </div>
  </div>
);

const ArenaMode: React.FC<ArenaModeProps> = ({ topics, userProfile, arenaStore = {}, onStartMatch }) => {
  const [phase, setPhase] = useState<'LOBBY' | 'PICK'>('LOBBY');
  const [selectedTopicId, setSelectedTopicId] = useState<number>(topics[0]?.topic_id || 1);

  const mascot = useMemo(() => {
    const rank = userProfile.rank;
    if (rank === RankLevel.DONG || rank === RankLevel.BAC) {
      return {
        name: 'Riolu',
        stage: 'Mầm',
        aura: 'rgba(0, 200, 200, 0.2)',
        effect: '',
        url: '/assets/riolu.png'
      };
    }
    if (rank === RankLevel.VANG || rank === RankLevel.BACH_KIM) {
      return {
        name: 'Lucario',
        stage: 'Trưởng thành',
        aura: 'rgba(200, 155, 60, 0.3)',
        effect: 'animate-pulse',
        url: '/assets/lucario.png'
      };
    }
    if (rank === RankLevel.KIM_CUONG || rank === RankLevel.CAO_THU) {
      return {
        name: 'Aura Lucario',
        stage: 'Chiến binh',
        aura: 'rgba(13, 51, 242, 0.4)',
        effect: 'animate-lightning',
        url: '/assets/lucario.png'
      };
    }
    return {
      name: 'Mega Lucario',
      stage: 'Huyền thoại',
      aura: 'rgba(200, 155, 60, 0.6)',
      effect: 'animate-lightning',
      url: '/assets/mega-lucario.png'
    };
  }, [userProfile.rank]);

  const selectedTopic = useMemo(
    () => topics.find(t => t.topic_id === selectedTopicId) || topics[0],
    [selectedTopicId, topics]
  );

  return (
    <div className="h-full relative flex flex-col items-center justify-center bg-[#010a13] overflow-hidden select-none text-white">
      <div className="absolute inset-0 pointer-events-none opacity-20 bg-[linear-gradient(rgba(200,155,60,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(200,155,60,0.08)_1px,transparent_1px)] bg-[size:48px_48px]"></div>
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 size-[110vh] bg-blue-900/10 blur-[140px] rounded-full"></div>

      {phase === 'LOBBY' ? (
        <div className="max-w-xl w-full text-center space-y-10 animate-slide-up relative z-10 px-4">
          <div className="relative">
            <div className="absolute inset-0 blur-[80px] rounded-full animate-pulse" style={{ backgroundColor: mascot.aura }}></div>
            <img
              src={mascot.url}
              className={`relative z-10 size-64 mx-auto object-contain drop-shadow-[0_0_40px_rgba(255,255,255,0.3)] animate-breathing ${mascot.effect}`}
              alt={mascot.name}
            />
            <div className="relative z-20 mt-4 px-6 py-1.5 bg-[#c89b3c] text-black text-[11px] font-black uppercase tracking-[0.25em] rounded-full inline-block shadow-[0_0_25px_rgba(200,155,60,0.8)]">
              {mascot.name} | {mascot.stage}
            </div>
          </div>

          <div className="space-y-4">
            <h2 className="text-5xl sm:text-6xl font-black italic uppercase tracking-tight text-white drop-shadow-[0_4px_15px_rgba(0,0,0,0.9)]">
              Sảnh <span style={{ color: GOLD }}>Đấu</span>
            </h2>
            <p className="font-black uppercase tracking-[0.35em] text-[10px] animate-pulse whitespace-nowrap" style={{ color: GOLD }}>
              Mùa 1: Số hóa
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4 sm:gap-6 px-2 sm:px-6">
            <div className="glass-panel p-6 rounded-3xl border-white/5 bg-white/5 backdrop-blur-2xl">
              <p className="text-[10px] font-black uppercase text-gray-500 tracking-widest mb-1 italic">Hạng</p>
              <h4 className="text-2xl sm:text-3xl font-black uppercase tracking-tight" style={{ color: GOLD }}>{userProfile.rank}</h4>
              <div className="mt-2 text-[10px] font-bold text-gray-400 uppercase">{userProfile.rankPoints % 100} / 100 LP</div>
            </div>
            <div className="glass-panel p-6 rounded-3xl border-white/5 bg-white/5 backdrop-blur-2xl">
              <p className="text-[10px] font-black uppercase text-gray-500 tracking-widest mb-1 italic">Chuỗi</p>
              <h4 className="text-2xl sm:text-3xl font-black text-cyan-400 uppercase tracking-tight">{userProfile.streak}x</h4>
              <div className="mt-2 text-[10px] font-bold text-gray-400 uppercase italic">Thưởng x2</div>
            </div>
          </div>

          <div className="px-2 sm:px-6 pt-2">
            <button
              onClick={() => setPhase('PICK')}
              className="group relative w-full h-20 text-black font-black uppercase tracking-[0.25em] rounded-full shadow-[0_15px_45px_rgba(200,155,60,0.3)] hover:scale-[1.03] active:scale-95 transition-all text-base sm:text-lg border-b-4 border-black/50 overflow-hidden"
              style={{ backgroundColor: GOLD }}
            >
              Bắt đầu
            </button>
          </div>
        </div>
      ) : (
        <div className="w-full h-full flex flex-col lg:flex-row relative z-10 overflow-hidden animate-fade-in">
          <aside className="w-full lg:w-[450px] shrink-0 border-r border-white/5 bg-black/60 backdrop-blur-3xl p-6 lg:p-10 flex flex-col">
            <div className="flex-1 flex flex-col justify-center space-y-8">
              <div className="relative mx-auto">
                <div className="size-56 sm:size-64 rounded-full border-4 flex items-center justify-center shadow-2xl overflow-hidden" style={{ borderColor: GOLD, boxShadow: `0 0 60px ${GOLD}33, inset 0 0 40px ${GOLD}11` }}>
                  <img src={mascot.url} className={`size-[85%] object-contain drop-shadow-[0_0_15px_rgba(255,255,255,0.4)] ${mascot.effect}`} alt={mascot.name} />
                </div>
                <span className="absolute -bottom-2 left-1/2 -translate-x-1/2 px-3 py-1 bg-black/80 text-[10px] font-black text-amber-500 rounded-lg border border-amber-500/30 uppercase tracking-widest whitespace-nowrap">
                  {mascot.stage}
                </span>
              </div>

              <div className="text-center space-y-5">
                <div>
                  <span className="px-4 py-1.5 bg-white/5 rounded-full text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] border border-white/10 mb-3 inline-flex items-center gap-2">
                    <TopicIcon name={selectedTopic.icon} topicId={selectedTopic.topic_id} size={18} title={selectedTopic.keyword_label} style={{ color: selectedTopic.color }} />
                    CĐ #{selectedTopic.topic_id}
                  </span>
                  <h2 className="text-3xl sm:text-4xl font-black italic uppercase tracking-tight text-white leading-tight">{selectedTopic.keyword_label}</h2>
                </div>
                <div className="p-5 bg-white/5 rounded-3xl border border-white/5 text-xs text-gray-400 italic leading-relaxed text-center px-8 line-clamp-5">
                  {selectedTopic.full_text}
                </div>
                <div className="grid grid-cols-2 gap-6 pt-2">
                  <div className="text-left space-y-4">
                    <CompetencyBar label="C1" score={selectedTopic.competency_scores.C1} color={CYAN} />
                    <CompetencyBar label="C2" score={selectedTopic.competency_scores.C2} color="#785a28" />
                  </div>
                  <div className="text-left space-y-4">
                    <CompetencyBar label="C3" score={selectedTopic.competency_scores.C3} color={GOLD} />
                    <CompetencyBar label="C4" score={selectedTopic.competency_scores.C4} color="#00ff88" />
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-8 shrink-0">
              <button
                onClick={() => onStartMatch(selectedTopicId)}
                className="w-full h-18 text-black font-black uppercase tracking-[0.25em] rounded-full shadow-[0_12px_45px_rgba(200,155,60,0.3)] hover:brightness-110 active:scale-95 transition-all border-b-4 border-black/40 flex items-center justify-center gap-4 text-base"
                style={{ backgroundColor: GOLD }}
              >
                <ArenaSwordIcon size={26} className="shrink-0" />
                Chọn
              </button>
              <button
                onClick={() => setPhase('LOBBY')}
                className="w-full mt-5 py-2 text-[11px] font-black uppercase text-gray-600 hover:text-white transition-colors tracking-widest italic"
              >
                Trở lại
              </button>
            </div>
          </aside>

          <main className="flex-1 overflow-y-auto p-6 lg:p-14 no-scrollbar bg-black/30">
            <div className="mb-10 flex items-center justify-between">
              <div>
                <h3 className="text-2xl font-black italic uppercase text-white tracking-widest">Chọn chuyên đề</h3>
                <p className="text-[10px] text-gray-500 font-bold uppercase tracking-[0.4em] mt-2">PVT-THCSHH</p>
              </div>
              <span className="px-5 py-2 bg-white/5 border border-white/10 rounded-full text-[10px] font-black uppercase italic" style={{ color: GOLD }}>Mùa 1</span>
            </div>

            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 xl:grid-cols-7 gap-4 sm:gap-6">
              {topics.map(t => {
                const stars = arenaStore[t.topic_id]?.star_level || 0;
                const isActive = selectedTopicId === t.topic_id;
                return (
                  <button
                    key={t.topic_id}
                    onClick={() => setSelectedTopicId(t.topic_id)}
                    className={`aspect-square relative rounded-3xl border-2 transition-all group p-4 flex flex-col items-center justify-between overflow-hidden ${isActive ? 'bg-gradient-to-br from-[#c89b3c]/30 to-black scale-105 shadow-[0_0_30px_rgba(200,155,60,0.4)]' : 'border-white/5 bg-white/5 hover:border-white/20 hover:scale-105'}`}
                    style={{ borderColor: isActive ? GOLD : 'rgba(255,255,255,0.05)' }}
                  >
                    <div className="flex gap-1 relative z-10 w-full justify-center">
                      {[1, 2, 3, 4, 5].map(idx => (
                        <div key={idx} className={`size-1.5 rounded-full ${idx <= stars ? 'bg-[#c89b3c] shadow-[0_0_8px_#c89b3c]' : 'bg-white/10'}`}></div>
                      ))}
                    </div>
                    <TopicIcon
                      name={t.icon}
                      topicId={t.topic_id}
                      size={38}
                      title={t.keyword_label}
                      className={`transition-all duration-300 relative z-10 ${isActive ? 'scale-110 text-white' : 'group-hover:text-white'}`}
                      style={{ color: isActive ? '#fff' : t.color }}
                    />
                    <span className={`relative z-10 block w-full text-[9px] font-black uppercase text-center line-clamp-1 transition-colors ${isActive ? 'text-white' : 'text-gray-500 group-hover:text-gray-300'} tracking-tight`}>
                      {t.keyword_label}
                    </span>
                  </button>
                );
              })}
            </div>
          </main>
        </div>
      )}

      <style>{`
        @keyframes breathing {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-15px); }
        }
        .animate-breathing { animation: breathing 4s ease-in-out infinite; }
        .h-18 { height: 4.5rem; }
      `}</style>
    </div>
  );
};

export default ArenaMode;
