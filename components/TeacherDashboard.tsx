
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Topic, SpecialMission, StudentSnapshot, RankLevel, CompetencyScores } from '../types';
import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import BubbleCanvas from './BubbleCanvas';

interface TeacherDashboardProps {
  topics: Topic[];
  onAssignMission: (mission: SpecialMission) => void;
}

const GRID_MODES = [
  { id: '12x', cols: 'grid-cols-2 lg:grid-cols-4', rows: 12 },
  { id: '24x', cols: 'grid-cols-3 lg:grid-cols-6', rows: 24 },
  { id: '40x', cols: 'grid-cols-4 lg:grid-cols-8', rows: 40 },
  { id: '60x', cols: 'grid-cols-5 lg:grid-cols-10', rows: 60 }
];

// Micro Radar Chart (Tokyo University Standard)
const MicroRadar: React.FC<{ scores: CompetencyScores; color: string; size?: number }> = ({ scores, color, size = 40 }) => {
  const r = size / 2;
  const padding = 2;
  const maxR = r - padding;
  
  const p1 = { x: r, y: r - (scores.C1 / 100) * maxR };
  const p2 = { x: r + (scores.C2 / 100) * maxR, y: r };
  const p3 = { x: r, y: r + (scores.C3 / 100) * maxR };
  const p4 = { x: r - (scores.C4 / 100) * maxR, y: r };

  const points = `${p1.x},${p1.y} ${p2.x},${p2.y} ${p3.x},${p3.y} ${p4.x},${p4.y}`;

  return (
    <svg width={size} height={size} className="overflow-visible opacity-80 group-hover:opacity-100 transition-opacity">
      <circle cx={r} cy={r} r={maxR} fill="none" stroke="white" strokeOpacity="0.1" strokeWidth="0.5" />
      <polygon points={points} fill={color} fillOpacity="0.4" stroke={color} strokeWidth="1" />
    </svg>
  );
};

// 33-Pixel Nano Matrix (Binance Style Optimization)
const NanoPixelMatrix: React.FC<{ studentTopics: Topic[] }> = ({ studentTopics }) => {
  return (
    <div className="grid grid-cols-11 gap-[2px] p-1.5 bg-black/50 rounded-lg border border-white/5 shadow-inner">
      {studentTopics.slice(0, 33).map((t) => (
        <div 
          key={t.topic_id} 
          className={`size-[5px] rounded-full transition-all duration-300 ${
            t.mastery_percent === 0 ? 'bg-gray-800' : 
            t.mastery_percent < 40 ? 'bg-danger-glow shadow-[0_0_5px_#ff0055]' : 
            t.mastery_percent < 75 ? 'bg-c3-amber' : 'bg-c4-green shadow-[0_0_5px_#00ff88]'
          }`}
          title={`${t.keyword_label}: ${t.mastery_percent}%`}
        />
      ))}
    </div>
  );
};

const TeacherDashboard: React.FC<TeacherDashboardProps> = ({ topics, onAssignMission }) => {
  const [activeTab, setActiveTab] = useState<'CCTV' | 'RANKING' | 'STRATEGY'>('CCTV');
  const [gridMode, setGridMode] = useState(GRID_MODES[1]);
  const [students, setStudents] = useState<StudentSnapshot[]>([]);
  const [focusedStudentId, setFocusedStudentId] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [aiInsight, setAiInsight] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const stripBOM = (text: string) => text.replace(/^\ufeff/, '');

  const handleCSVUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    // Fix: Explicitly cast to File[] to avoid "unknown" type errors in the loop where file.text() and file.name are accessed.
    const fileArray = Array.from(files) as File[];
    const processedStudents: StudentSnapshot[] = [];

    for (const file of fileArray) {
      // Fix: cast ensures .text() is recognized on the File object.
      let text = await file.text();
      text = stripBOM(text);
      const lines = text.split('\n').filter(l => l.trim());
      if (lines.length < 2) continue;

      // Fix: cast ensures .name is recognized on the File object.
      let studentName = file.name.replace('.csv', '').toUpperCase();
      let className = "N/A";
      const studentTopics: Topic[] = JSON.parse(JSON.stringify(topics)); 

      let masterySum = 0;
      let count = 0;
      let c1=0, c2=0, c3=0, c4=0;

      for (let i = 1; i < lines.length; i++) {
        const parts = lines[i].split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/);
        if (parts.length < 5) continue;
        const topicId = parseInt(parts[2]);
        const mastery = parseFloat(parts[4]) || 0;
        
        const tIdx = studentTopics.findIndex(t => t.topic_id === topicId);
        if (tIdx !== -1) {
          studentTopics[tIdx].mastery_percent = mastery;
          masterySum += mastery;
          count++;
          c1 += parseFloat(parts[5]) || 0;
          c2 += parseFloat(parts[6]) || 0;
          c3 += parseFloat(parts[7]) || 0;
          c4 += parseFloat(parts[8]) || 0;
        }
      }

      const avg = count > 0 ? Math.round(masterySum / count) : 0;
      processedStudents.push({
        id: `${studentName}_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
        name: studentName,
        className: className,
        topics: studentTopics,
        avgMastery: avg,
        competencyAvg: { 
          C1: count > 0 ? Math.round(c1/count) : 0, 
          C2: count > 0 ? Math.round(c2/count) : 0, 
          C3: count > 0 ? Math.round(c3/count) : 0, 
          C4: count > 0 ? Math.round(c4/count) : 0 
        },
        status: avg < 40 ? 'CRITICAL' : (avg < 70 ? 'WARNING' : 'OK'),
        rank: avg < 50 ? RankLevel.BAC : RankLevel.VANG,
        trend: Math.random() > 0.5 ? 'UP' : 'DOWN'
      });
    }

    setStudents(prev => [...prev, ...processedStudents]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleAIAnalyze = async () => {
    if (students.length === 0) return;
    setIsGenerating(true);
    setAiInsight(null);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const prompt = `Bạn là Hội đồng Chiến lược Giáo dục của Apple và Tokyo Univ. 
      Phân tích dữ liệu Matrix 33 chuyên đề của ${students.length} học sinh. 
      Mastery trung bình lớp: ${Math.round(students.reduce((a, s) => a + s.avgMastery, 0) / students.length)}%.
      Số HS nguy cấp (<40%): ${students.filter(s => s.status === 'CRITICAL').length}.
      Hãy đưa ra 3 phương án can thiệp NANO-MATRIX (ngắn gọn, tập trung vào kỹ năng C1-C4).`;

      // Fix: Explicitly type the response to GenerateContentResponse to fix property access errors.
      const response: GenerateContentResponse = await ai.models.generateContent({
        model: 'gemini-3-pro-preview',
        contents: prompt,
      });
      setAiInsight(response.text || "Phân tích thất bại.");
      setActiveTab('STRATEGY');
    } catch (e) {
      setAiInsight("Lỗi AI: " + (e as Error).message);
    } finally {
      setIsGenerating(false);
    }
  };

  const focusedStudent = useMemo(() => students.find(s => s.id === focusedStudentId), [students, focusedStudentId]);

  return (
    <div className="h-full flex flex-col bg-background-dark font-display overflow-hidden animate-fade-in relative">
      
      {/* FOCUS VIEW: Apple Teleportation Effect */}
      {focusedStudent && (
        <div className="absolute inset-0 z-[100] bg-background-dark flex flex-col animate-fade-in">
          <header className="p-6 border-b border-white/5 flex items-center justify-between bg-black/60 backdrop-blur-3xl shrink-0">
            <div className="flex items-center gap-6">
              <button onClick={() => setFocusedStudentId(null)} className="size-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 transition-all active:scale-95">
                <span className="material-symbols-outlined text-2xl">arrow_back</span>
              </button>
              <div>
                <h3 className="text-2xl font-black uppercase text-white tracking-tighter italic">{focusedStudent.name}</h3>
                <p className="text-[10px] text-gray-500 font-bold uppercase tracking-[0.4em] mt-1">Matrix Teleportation Target • Lớp {focusedStudent.className}</p>
              </div>
            </div>
            <div className="flex items-center gap-10">
               <div className="text-right">
                  <span className="text-[10px] text-gray-500 font-black uppercase block tracking-widest">Global Mastery</span>
                  <span className={`text-4xl font-black italic tabular-nums ${focusedStudent.status === 'CRITICAL' ? 'text-danger-glow' : 'text-c4-green'}`}>{focusedStudent.avgMastery}%</span>
               </div>
               <button onClick={() => setFocusedStudentId(null)} className="px-8 py-3 bg-primary text-white text-[10px] font-black uppercase rounded-xl shadow-lg shadow-primary/20">Đóng Quan Sát</button>
            </div>
          </header>
          <div className="flex-1 relative">
            <BubbleCanvas 
              topics={focusedStudent.topics} 
              generatingTopicId={null} 
              celebrationTopicId={null} 
              preferences={{ theme: 'CRYPTO', showBreathing: true, showDrifting: true, showShimmering: true, fontSizeScale: 1.1 }} 
              onBubbleClick={() => {}} 
            />
          </div>
        </div>
      )}

      {/* DASHBOARD HEADER: Binance High-Density Style */}
      <header className="px-8 py-5 border-b border-white/5 bg-white/[0.02] flex items-center justify-between shrink-0">
        <div className="flex items-center gap-5">
          <div className="size-12 rounded-2xl bg-primary/20 border border-primary/40 flex items-center justify-center text-primary shadow-[0_0_30px_rgba(13,51,242,0.2)]">
            <span className="material-symbols-outlined text-3xl">emergency_home</span>
          </div>
          <div>
            <h2 className="text-2xl font-black uppercase tracking-tighter italic text-white leading-none">CCTV NANO-MATRIX COMMAND</h2>
            <div className="flex items-center gap-3 mt-1.5">
                <div className="flex items-center gap-1.5 bg-black/40 px-2 py-0.5 rounded-full border border-white/10">
                    <span className="size-1.5 rounded-full bg-c4-green animate-pulse"></span>
                    <span className="text-[9px] text-gray-400 font-black uppercase tracking-widest">LIVE SYNC ACTIVE</span>
                </div>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          {activeTab === 'CCTV' && (
            <div className="flex bg-white/5 p-1 rounded-2xl mr-4 border border-white/10">
              {GRID_MODES.map(m => (
                <button 
                  key={m.id} 
                  onClick={() => setGridMode(m)}
                  className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${gridMode.id === m.id ? 'bg-primary text-white shadow-xl' : 'text-gray-500 hover:text-white'}`}
                >
                  {m.id}
                </button>
              ))}
            </div>
          )}
          <input type="file" multiple accept=".csv" ref={fileInputRef} onChange={handleCSVUpload} className="hidden" />
          <button 
            onClick={() => fileInputRef.current?.click()}
            className="h-12 px-6 bg-white/5 border border-white/10 rounded-2xl flex items-center gap-3 text-[10px] font-black uppercase tracking-widest hover:bg-white/10 transition-all active:scale-95 group"
          >
            <span className="material-symbols-outlined text-lg group-hover:rotate-12 transition-transform">cloud_upload</span>
            Nạp CCTV Lớp
          </button>
          <button 
            onClick={handleAIAnalyze}
            disabled={isGenerating || students.length === 0}
            className="h-12 px-8 bg-amber-500 text-black rounded-2xl flex items-center gap-3 text-[10px] font-black uppercase tracking-widest hover:brightness-110 shadow-[0_0_30px_rgba(245,158,11,0.2)]"
          >
            <span className="material-symbols-outlined text-lg">psychology</span>
            Gemini Insight
          </button>
        </div>
      </header>

      {/* NAVIGATION: Tokyo Academic Minimal */}
      <nav className="flex items-center gap-14 px-10 py-0.5 border-b border-white/5 bg-black/40">
        {[
          { id: 'CCTV', label: 'Monitor Nano-Grid', icon: 'grid_view' },
          { id: 'RANKING', label: 'Matrix Leaderboard', icon: 'military_tech' },
          { id: 'STRATEGY', label: 'Strategic Path', icon: 'auto_awesome' }
        ].map(tab => (
          <button 
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`text-[10px] font-black uppercase tracking-[0.3em] py-4 flex items-center gap-3 border-b-2 transition-all ${activeTab === tab.id ? 'border-primary text-primary shadow-[inset_0_-10px_10px_-10px_rgba(13,51,242,0.4)]' : 'border-transparent text-gray-600 hover:text-gray-400'}`}
          >
            <span className="material-symbols-outlined text-sm">{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </nav>

      {/* WORKSPACE AREA */}
      <div className="flex-1 overflow-hidden flex">
        <div className="flex-1 overflow-y-auto no-scrollbar p-8">
          {students.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center opacity-30">
              <span className="material-symbols-outlined text-7xl mb-6 animate-pulse">sensors</span>
              <h3 className="text-2xl font-black uppercase text-white mb-3">Chưa có tín hiệu giám sát</h3>
              <p className="max-w-md text-sm italic text-gray-500">Hãy nạp file CSV của cả lớp để bắt đầu quan sát ma trận năng lực.</p>
            </div>
          ) : (
            <div className="animate-fade-in h-full">
              {activeTab === 'CCTV' && (
                <div className={`grid gap-4 ${gridMode.cols} auto-rows-fr`}>
                  {students.slice(0, gridMode.rows).map((s, idx) => (
                    <div 
                      key={s.id} 
                      onClick={() => setFocusedStudentId(s.id)}
                      className={`relative group bg-white/[0.02] rounded-3xl border transition-all cursor-pointer flex flex-col p-4 ${
                        s.status === 'CRITICAL' ? 'border-danger-glow/40 ring-4 ring-danger-glow/5' : 'border-white/5 hover:border-primary/50'
                      }`}
                    >
                      {/* Name & Mastery */}
                      <div className="flex justify-between items-start mb-2">
                         <span className={`text-[10px] font-black uppercase tracking-tighter truncate max-w-[70%] ${s.status === 'CRITICAL' ? 'text-danger-glow' : 'text-gray-300'}`}>
                            {s.name.split(' ').pop()}
                         </span>
                         <span className={`text-sm font-black italic ${s.status === 'CRITICAL' ? 'text-danger-glow' : 'text-primary'}`}>{s.avgMastery}%</span>
                      </div>

                      {/* NANO-MATRIX: The 33-Pixel Grid */}
                      <div className="flex-1 flex items-center justify-center py-2 opacity-60 group-hover:opacity-100 transition-opacity">
                         <NanoPixelMatrix studentTopics={s.topics} />
                      </div>

                      {/* Bottom Info: Radar Mini & Class */}
                      <div className="mt-3 flex justify-between items-end">
                         <MicroRadar scores={s.competencyAvg} color={s.status === 'CRITICAL' ? '#ff0055' : '#0d33f2'} size={24} />
                         <span className="text-[8px] text-gray-600 font-black uppercase">CAM-0{idx+1}</span>
                      </div>

                      {/* Hover Lift Indicator */}
                      <div className="absolute inset-0 bg-primary/10 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none rounded-3xl border-2 border-primary/20 scale-105">
                         <span className="material-symbols-outlined text-white text-3xl drop-shadow-lg scale-0 group-hover:scale-100 transition-transform">visibility</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {activeTab === 'RANKING' && (
                <div className="space-y-3 max-w-5xl mx-auto pb-20">
                  {students.sort((a,b) => b.avgMastery - a.avgMastery).map((s, idx) => (
                    <div key={s.id} onClick={() => setFocusedStudentId(s.id)} className="flex items-center justify-between p-5 bg-white/[0.02] border border-white/5 rounded-2xl hover:bg-white/[0.05] hover:border-primary/40 cursor-pointer transition-all group relative overflow-hidden">
                       <div className="flex items-center gap-8 relative z-10">
                          <div className={`size-12 rounded-xl flex items-center justify-center font-black italic text-xl ${idx === 0 ? 'bg-amber-500 text-black shadow-[0_0_20px_#f59e0b]' : 'bg-white/5 text-gray-600'}`}>
                            #{idx + 1}
                          </div>
                          <div>
                             <h4 className="text-lg font-black text-white group-hover:text-primary transition-colors uppercase tracking-tight">{s.name}</h4>
                             <p className="text-[10px] text-gray-600 font-bold uppercase tracking-widest mt-1">Lớp: {s.className}</p>
                          </div>
                       </div>
                       <div className="flex items-center gap-14 relative z-10">
                          <div className="flex gap-4">
                              {['C1','C2','C3','C4'].map(c => (
                                  <div key={c} className="text-center w-10">
                                      <span className="text-[8px] font-black text-gray-600 uppercase block">{c}</span>
                                      <span className="text-xs font-black text-gray-400">{(s.competencyAvg as any)[c]}%</span>
                                  </div>
                              ))}
                          </div>
                          <div className="text-right w-24">
                             <span className="text-[9px] font-black text-gray-600 uppercase block tracking-widest">Mastery</span>
                             <span className={`text-2xl font-black italic ${s.status === 'CRITICAL' ? 'text-danger-glow' : 'text-c4-green'}`}>{s.avgMastery}%</span>
                          </div>
                       </div>
                       {/* Background Neon Accent */}
                       <div className={`absolute right-0 top-0 bottom-0 w-1 ${s.status === 'CRITICAL' ? 'bg-danger-glow' : 'bg-primary'} opacity-0 group-hover:opacity-100 transition-opacity`}></div>
                    </div>
                  ))}
                </div>
              )}

              {activeTab === 'STRATEGY' && (
                <div className="max-w-4xl mx-auto space-y-10 animate-fade-in pb-32">
                  <div className="glass-panel p-12 rounded-[50px] border border-amber-500/20 bg-amber-500/[0.02] shadow-2xl relative overflow-hidden">
                    <h3 className="text-3xl font-black uppercase text-white mb-10 flex items-center gap-5 italic tracking-tighter">
                      <span className="material-symbols-outlined text-4xl text-amber-500">auto_awesome</span>
                      AI Command Strategic Insights
                    </h3>
                    {aiInsight ? (
                      <div className="space-y-10 animate-fade-in">
                        <div className="prose prose-invert max-w-none text-gray-300 whitespace-pre-wrap leading-relaxed italic p-10 bg-black/40 rounded-[40px] border border-white/5 font-medium shadow-inner text-lg">
                          {aiInsight}
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="p-8 rounded-3xl bg-danger-glow/5 border border-danger-glow/20">
                               <h4 className="text-[10px] font-black uppercase text-danger-glow tracking-widest mb-3">Critical Targets</h4>
                               <p className="text-sm text-gray-400 leading-relaxed italic">Phát hiện {students.filter(s => s.status === 'CRITICAL').length} HS cần can thiệp khẩn cấp chuyên đề 05, 12. Gợi ý đẩy mạnh C1 Mastery.</p>
                            </div>
                            <div className="p-8 rounded-3xl bg-c4-green/5 border border-c4-green/20">
                               <h4 className="text-[10px] font-black uppercase text-c4-green tracking-widest mb-3">Elite Acceleration</h4>
                               <p className="text-sm text-gray-400 leading-relaxed italic">Nhóm Top 10% đã sẵn sàng cho bộ đề VDC (C4). Hãy kích hoạt Arena Mode cho các chuyên đề nâng cao.</p>
                            </div>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-32 opacity-20 flex flex-col items-center">
                        <span className="material-symbols-outlined text-7xl mb-6 animate-pulse text-amber-500">terminal</span>
                        <p className="text-sm font-black uppercase tracking-[0.4em]">System waiting for Gemini sequence...</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <footer className="p-4 bg-white/[0.01] border-t border-white/5 text-center shrink-0">
        <p className="text-[8px] text-gray-700 font-black uppercase tracking-[0.6em] italic">DIA AI NANO-MATRIX COMMAND • APPLE × BINANCE × TOKYO STANDARDS • POWERED BY GEMINI 3 PRO</p>
      </footer>

      <style>{`
        .animate-fade-in { animation: fadeIn 0.8s cubic-bezier(0.16, 1, 0.3, 1); }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        
        @keyframes spin-slow {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .animate-spin-slow {
          animation: spin-slow 15s linear infinite;
        }

        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>
  );
};

export default TeacherDashboard;
