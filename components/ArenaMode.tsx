
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Topic, UserProfile, ArenaStats, RankLevel } from '../types';

interface ArenaModeProps {
  topics: Topic[];
  userProfile: UserProfile;
  arenaStore?: Record<number, ArenaStats>;
  onStartMatch: (topicId: number) => void;
}

const CompetencyBar: React.FC<{ label: string, score: number, color: string }> = ({ label, score, color }) => (
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
  const [phase, setPhase] = useState<'LOBBY' | 'BAN_PICK'>('LOBBY');
  const [selectedTopicId, setSelectedTopicId] = useState<number>(topics[0]?.topic_id || 1);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  // League of Legends / Arena of Valor Colors
  const GOLD = "#c89b3c";
  const BLUE_HEXTECH = "#00c8c8";
  const DARK_BG = "#010a13";

  // Pokemon Evolution Logic
  const pokemonEvo = useMemo(() => {
    const rank = userProfile.rank;
    if (rank === RankLevel.DONG || rank === RankLevel.BAC) {
      return {
        id: 447,
        name: "Riolu",
        stage: "MẦM NON",
        aura: "rgba(0, 200, 200, 0.3)",
        url: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/447.png"
      };
    } else if (rank === RankLevel.THACH_DAU) {
      return {
        id: 10059,
        name: "Mega Lucario",
        stage: "HUYỀN THOẠI",
        aura: "rgba(200, 155, 60, 0.6)",
        url: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/10059.png"
      };
    } else {
      return {
        id: 448,
        name: "Lucario",
        stage: "TRƯỞNG THÀNH",
        aura: "rgba(200, 155, 60, 0.4)",
        url: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/448.png"
      };
    }
  }, [userProfile.rank]);

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    setMousePos({ x, y });
  };

  const selectedTopic = useMemo(() => 
    topics.find(t => t.topic_id === selectedTopicId) || topics[0], 
  [selectedTopicId, topics]);

  return (
    <div 
      ref={containerRef}
      onMouseMove={handleMouseMove}
      className={`h-full relative flex flex-col items-center justify-center bg-[${DARK_BG}] overflow-hidden select-none`}
    >
      {/* Dynamic Background */}
      <div className="absolute inset-0 pointer-events-none z-0">
        <div 
          className="absolute inset-0 opacity-10 bg-[linear-gradient(rgba(200,155,60,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(200,155,60,0.05)_1px,transparent_1px)] bg-[size:50px_50px] transition-transform duration-700 ease-out"
          style={{ transform: `translate(${mousePos.x * 25}px, ${mousePos.y * 25}px) scale(1.1)` }}
        ></div>
        <div 
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 size-[120vh] bg-blue-900/10 blur-[150px] rounded-full animate-pulse"
        ></div>
      </div>

      {phase === 'LOBBY' ? (
        <div className="max-w-xl w-full text-center space-y-10 animate-slide-up relative z-10">
           <div className="relative group">
              <div 
                className="absolute inset-0 blur-[80px] rounded-full animate-pulse transition-transform duration-500"
                style={{ 
                  backgroundColor: pokemonEvo.aura,
                  transform: `translate(${mousePos.x * 45}px, ${mousePos.y * 45}px) scale(1.4)` 
                }}
              ></div>
              <div 
                className="relative z-10 transition-transform duration-300 ease-out flex flex-col items-center"
                style={{ transform: `perspective(1000px) rotateY(${mousePos.x * 12}deg) rotateX(${mousePos.y * -12}deg)` }}
              >
                <img 
                  src={pokemonEvo.url} 
                  className="size-64 object-contain drop-shadow-[0_0_40px_rgba(255,255,255,0.3)] animate-breathing" 
                  alt={pokemonEvo.name} 
                />
                <div className={`mt-4 px-6 py-1.5 bg-[${GOLD}] text-black text-[11px] font-black uppercase tracking-[0.25em] rounded-full shadow-[0_0_25px_rgba(200,155,60,0.8)]`}>
                  {pokemonEvo.name} • {pokemonEvo.stage}
                </div>
              </div>
           </div>
           
           <div className="space-y-4">
              <h2 className={`text-6xl font-black italic uppercase tracking-tighter text-white drop-shadow-[0_4px_15px_rgba(0,0,0,0.9)]`}>
                Sảnh <span style={{ color: GOLD }}>Thi Đấu</span>
              </h2>
              <div className="flex items-center justify-center gap-5 px-4 overflow-hidden">
                 <div className={`h-px w-16 shrink-0 bg-gradient-to-r from-transparent to-[${GOLD}]`}></div>
                 <p className={`font-black uppercase tracking-[0.5em] text-[10px] animate-pulse whitespace-nowrap`} style={{ color: GOLD }}>Season 1: Kỷ Nguyên Số</p>
                 <div className={`h-px w-16 shrink-0 bg-gradient-to-l from-transparent to-[${GOLD}]`}></div>
              </div>
           </div>

           <div className="grid grid-cols-2 gap-6 px-6">
              <div className="glass-panel p-6 rounded-[2.5rem] border-white/5 bg-white/5 backdrop-blur-2xl relative overflow-hidden group hover:scale-105 transition-transform">
                 <div className={`absolute inset-0 bg-gradient-to-br from-[${GOLD}]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity`}></div>
                 <p className="text-[10px] font-black uppercase text-gray-500 tracking-widest mb-1 italic">Xếp Hạng</p>
                 <h4 className={`text-3xl font-black uppercase tracking-tight`} style={{ color: GOLD }}>{userProfile.rank}</h4>
                 <div className="mt-2 text-[10px] font-bold text-gray-400 uppercase tracking-tighter">{(userProfile.rankPoints % 100)} / 100 LP</div>
              </div>
              <div className="glass-panel p-6 rounded-[2.5rem] border-white/5 bg-white/5 backdrop-blur-2xl relative overflow-hidden group hover:scale-105 transition-transform">
                 <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                 <p className="text-[10px] font-black uppercase text-gray-500 tracking-widest mb-1 italic">Combo Arena</p>
                 <h4 className="text-3xl font-black text-cyan-400 uppercase tracking-tight">{userProfile.streak} 🔥</h4>
                 <div className="mt-2 text-[10px] font-bold text-gray-400 uppercase tracking-tighter italic">Bonus X2 RP</div>
              </div>
           </div>

           <div className="px-6 pt-2">
              <button 
                onClick={() => setPhase('BAN_PICK')}
                className={`group relative w-full h-20 text-white font-black uppercase tracking-[0.4em] rounded-full shadow-[0_15px_45px_rgba(200,155,60,0.3)] hover:scale-[1.03] active:scale-95 transition-all text-lg border-b-4 border-black/50 overflow-hidden`}
                style={{ backgroundColor: GOLD }}
              >
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700 ease-in-out"></div>
                BẮT ĐẦU
              </button>
           </div>
        </div>
      ) : (
        <div className="w-full h-full flex flex-col lg:flex-row relative z-10 overflow-hidden animate-fade-in">
           {/* LEFT: HERO PREVIEW (Selected Topic & Pokemon Stage) */}
           <div className={`w-full lg:w-[450px] shrink-0 border-r border-white/5 bg-black/60 backdrop-blur-3xl p-10 flex flex-col`}>
              <div className="flex-1 flex flex-col justify-center space-y-10 animate-fade-in-left">
                  <div className="relative group mx-auto">
                      <div className="absolute inset-0 rounded-full border border-white/10 animate-spin-slow opacity-20"></div>
                      <div className="absolute inset-[-20px] rounded-full border border-[#c89b3c]/20 animate-ping opacity-10"></div>
                      <div 
                        className="size-64 rounded-full border-4 flex items-center justify-center relative z-10 shadow-2xl transition-transform duration-500 group-hover:scale-105"
                        style={{ borderColor: GOLD, boxShadow: `0 0 60px ${GOLD}33, inset 0 0 40px ${GOLD}11` }}
                      >
                         <img 
                           src={pokemonEvo.url} 
                           className="size-[85%] object-contain drop-shadow-[0_0_15px_rgba(255,255,255,0.4)]"
                           alt={pokemonEvo.name}
                         />
                      </div>
                      <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 z-20">
                         <span className="px-3 py-1 bg-black/80 text-[10px] font-black text-amber-500 rounded-lg border border-amber-500/30 uppercase tracking-widest">{pokemonEvo.stage}</span>
                      </div>
                  </div>

                  <div className="text-center space-y-5">
                      <div>
                        <span className="px-4 py-1.5 bg-white/5 rounded-full text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] border border-white/10 mb-3 inline-block">CHUYÊN ĐỀ #{selectedTopic.topic_id}</span>
                        <h2 className="text-4xl font-black italic uppercase tracking-tighter text-white leading-tight drop-shadow-md">{selectedTopic.keyword_label}</h2>
                      </div>
                      
                      <div className="p-5 bg-white/5 rounded-[2rem] border border-white/5 text-xs text-gray-400 italic leading-relaxed text-center px-8">
                        {selectedTopic.full_text}
                      </div>

                      <div className="grid grid-cols-2 gap-6 pt-2">
                         <div className="text-left space-y-4">
                            <CompetencyBar label="Skill C1" score={selectedTopic.competency_scores.C1} color={BLUE_HEXTECH} />
                            <CompetencyBar label="Skill C2" score={selectedTopic.competency_scores.C2} color="#785a28" />
                         </div>
                         <div className="text-left space-y-4">
                            <CompetencyBar label="Skill C3" score={selectedTopic.competency_scores.C3} color={GOLD} />
                            <CompetencyBar label="Skill C4" score={selectedTopic.competency_scores.C4} color="#00ff88" />
                         </div>
                      </div>
                  </div>
              </div>

              <div className="pt-10 shrink-0">
                  <button 
                    onClick={() => onStartMatch(selectedTopicId)}
                    className={`w-full h-18 text-black font-black uppercase tracking-[0.35em] rounded-full shadow-[0_12px_45px_rgba(200,155,60,0.3)] hover:brightness-110 active:scale-95 transition-all border-b-4 border-black/40 flex items-center justify-center gap-4 text-base`}
                    style={{ backgroundColor: GOLD }}
                  >
                    <span className="material-symbols-outlined text-2xl">swords</span>
                    XÁC NHẬN
                  </button>
                  <button 
                    onClick={() => setPhase('LOBBY')}
                    className="w-full mt-5 py-2 text-[11px] font-black uppercase text-gray-600 hover:text-white transition-colors tracking-widest italic"
                  >
                    TRỞ LẠI SẢNH
                  </button>
              </div>
           </div>

           {/* RIGHT: TOPIC SELECTION GRID (33 Items) */}
           <div className="flex-1 overflow-y-auto p-8 lg:p-14 no-scrollbar bg-black/30">
              <div className="mb-10 flex items-center justify-between">
                  <div>
                    <h3 className="text-2xl font-black italic uppercase text-white tracking-widest drop-shadow-sm">CHỌN CHUYÊN ĐỀ</h3>
                    <p className="text-[10px] text-gray-500 font-bold uppercase tracking-[0.4em] mt-2">Matrix Heroes • Địa Lí 8 KNTT</p>
                  </div>
                  <div className="flex gap-3">
                    <span className={`px-5 py-2 bg-white/5 border border-white/10 rounded-full text-[10px] font-black uppercase italic`} style={{ color: GOLD }}>Season 1 Gold</span>
                  </div>
              </div>

              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 xl:grid-cols-7 gap-6">
                  {topics.map(t => {
                    const stars = arenaStore[t.topic_id]?.star_level || 0;
                    const isActive = selectedTopicId === t.topic_id;
                    return (
                      <button 
                        key={t.topic_id}
                        onClick={() => setSelectedTopicId(t.topic_id)}
                        className={`aspect-square relative rounded-[2rem] border-2 transition-all group p-4 flex flex-col items-center justify-between overflow-hidden ${isActive ? 'bg-gradient-to-br from-[#c89b3c]/30 to-black scale-105 shadow-[0_0_30px_rgba(200,155,60,0.4)]' : 'border-white/5 bg-white/5 hover:border-white/20 hover:scale-105'}`}
                        style={{ borderColor: isActive ? GOLD : 'rgba(255,255,255,0.05)' }}
                      >
                         <div className="absolute inset-0 bg-gradient-to-t from-black/90 to-transparent z-0 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                         
                         {/* Star Badge */}
                         <div className="flex gap-1 relative z-10 w-full justify-center">
                            {[1,2,3,4,5].map(idx => (
                              <div key={idx} className={`size-1.5 rounded-full ${idx <= stars ? 'bg-[#c89b3c] shadow-[0_0_8px_#c89b3c]' : 'bg-white/10'}`}></div>
                            ))}
                         </div>

                         <span 
                           className={`material-symbols-outlined text-4xl transition-all duration-300 relative z-10 ${isActive ? 'scale-110 text-white' : 'text-gray-600 group-hover:text-white'}`}
                           style={{ color: isActive ? '#fff' : t.color }}
                         >
                           {t.icon}
                         </span>

                         <div className="relative z-10 w-full">
                            <span className={`block text-[9px] font-black uppercase text-center line-clamp-1 transition-colors ${isActive ? 'text-white' : 'text-gray-500 group-hover:text-gray-300'} tracking-tighter`}>
                              {t.keyword_label}
                            </span>
                         </div>
                      </button>
                    );
                  })}
              </div>
           </div>
        </div>
      )}

      <style>{`
        @keyframes spin-slow {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .animate-spin-slow {
          animation: spin-slow 20s linear infinite;
        }
        @keyframes fade-in-left {
          from { transform: translateX(-40px); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
        .animate-fade-in-left {
          animation: fade-in-left 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        .animate-fade-in {
          animation: fadeIn 1s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slide-up {
          from { transform: translateY(40px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        .animate-slide-up {
          animation: slide-up 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        .h-18 { height: 4.5rem; }

        @keyframes breathing {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-15px); }
        }
        .animate-breathing {
          animation: breathing 4s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
};

export default ArenaMode;
