
import React, { useState, useMemo, useRef } from 'react';
import { Topic, UserProfile } from '../types';

interface RankPanelProps {
  topics: Topic[];
  isDemo: boolean;
  userProfile: UserProfile;
  onClose: () => void;
  onImportTopics: (imported: Partial<Topic>[]) => void;
}

type SortKey = 'name' | 'C1' | 'C2' | 'C3' | 'C4' | 'mastery' | 'rank' | 'day' | 'week' | 'month' | 'three_months';

const RankPanel: React.FC<RankPanelProps> = ({ topics = [], isDemo, userProfile, onClose, onImportTopics }) => {
  const [sortKey, setSortKey] = useState<SortKey>('mastery');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const hasRealData = useMemo(() => topics.some(t => t.mastery_percent > 0 || t.attempts_count > 0), [topics]);

  const stripBOM = (text: string) => text.replace(/^\ufeff/, '');

  const getMasteryColor = (percent: number) => {
    if (percent === 0) return 'text-gray-600 bg-gray-600/5';
    if (percent <= 30) return 'text-red-500 bg-red-500/10';
    if (percent <= 60) return 'text-orange-500 bg-orange-500/10';
    if (percent <= 85) return 'text-blue-500 bg-blue-500/10';
    return 'text-c4-green bg-c4-green/10';
  };

  const getRankLabel = (percent: number) => {
    if (percent === 0) return { label: 'Chưa học', weight: 0 };
    if (percent <= 30) return { label: 'Cần cố gắng', weight: 1 };
    if (percent <= 50) return { label: 'Trung bình', weight: 2 };
    if (percent <= 75) return { label: 'Khá', weight: 3 };
    if (percent <= 95) return { label: 'Giỏi', weight: 4 };
    return { label: 'Elite', weight: 5 };
  };

  const sortedTopics = useMemo(() => {
    const list = Array.isArray(topics) ? [...topics] : [];
    if (list.length === 0) return [];
    
    list.sort((a, b) => {
      let valA: any, valB: any;
      
      switch (sortKey) {
        case 'name': valA = a.keyword_label; valB = b.keyword_label; break;
        case 'C1': valA = a.competency_scores?.C1 ?? 0; valB = b.competency_scores?.C1 ?? 0; break;
        case 'C2': valA = a.competency_scores?.C2 ?? 0; valB = b.competency_scores?.C2 ?? 0; break;
        case 'C3': valA = a.competency_scores?.C3 ?? 0; valB = b.competency_scores?.C3 ?? 0; break;
        case 'C4': valA = a.competency_scores?.C4 ?? 0; valB = b.competency_scores?.C4 ?? 0; break;
        case 'mastery': valA = a.mastery_percent ?? 0; valB = b.mastery_percent ?? 0; break;
        case 'rank': valA = getRankLabel(a.mastery_percent ?? 0).weight; valB = getRankLabel(b.mastery_percent ?? 0).weight; break;
        case 'day': valA = a.history_mastery?.day ?? 0; valB = b.history_mastery?.day ?? 0; break;
        case 'week': valA = a.history_mastery?.week ?? 0; valB = b.history_mastery?.week ?? 0; break;
        case 'month': valA = a.history_mastery?.month ?? 0; valB = b.history_mastery?.month ?? 0; break;
        case 'three_months': valA = a.history_mastery?.three_months ?? 0; valB = b.history_mastery?.three_months ?? 0; break;
        default: valA = a.mastery_percent ?? 0; valB = b.mastery_percent ?? 0;
      }

      if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
      if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });
    return list;
  }, [topics, sortKey, sortOrder]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortOrder('desc');
    }
  };

  const handleExportCSV = () => {
    if (sortedTopics.length === 0) return;

    const headers = [
      'Họ và tên', 'Lớp', 'ID', 'Chuyên đề', 'Mastery (%)', 'C1 (%)', 'C2 (%)', 'C3 (%)', 'C4 (%)', 
      'Xếp hạng', 'Tăng trưởng (Ngày)', 'Tăng trưởng (Tuần)'
    ];

    const rows = sortedTopics.map(t => [
      `"${userProfile.fullName || 'N/A'}"`,
      `"${userProfile.className || 'N/A'}"`,
      t.topic_id,
      `"${t.keyword_label}"`,
      t.mastery_percent,
      t.competency_scores?.C1 ?? 0,
      t.competency_scores?.C2 ?? 0,
      t.competency_scores?.C3 ?? 0,
      t.competency_scores?.C4 ?? 0,
      getRankLabel(t.mastery_percent).label,
      t.history_mastery?.day ?? 0,
      t.history_mastery?.week ?? 0
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(r => r.join(','))
    ].join('\n');

    const blob = new Blob(["\ufeff" + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `DiaAI_Rankings_${userProfile.fullName || 'Export'}_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      let text = event.target?.result as string;
      if (!text) return;
      text = stripBOM(text);

      const lines = text.split('\n');
      if (lines.length < 2) return;

      const importedData: Partial<Topic>[] = [];
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        const parts = line.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/);
        let topic_id, mastery_percent, c1, c2, c3, c4;
        
        if (parts.length >= 12) {
           topic_id = parseInt(parts[2]);
           mastery_percent = parseFloat(parts[4]);
           c1 = parseFloat(parts[5]);
           c2 = parseFloat(parts[6]);
           c3 = parseFloat(parts[7]);
           c4 = parseFloat(parts[8]);
        } else if (parts.length >= 7) {
           topic_id = parseInt(parts[0]);
           mastery_percent = parseFloat(parts[2]);
           c1 = parseFloat(parts[3]);
           c2 = parseFloat(parts[4]);
           c3 = parseFloat(parts[5]);
           c4 = parseFloat(parts[6]);
        } else {
           continue;
        }

        if (!isNaN(topic_id)) {
          importedData.push({
            topic_id,
            mastery_percent: isNaN(mastery_percent) ? 0 : mastery_percent,
            competency_scores: {
              C1: isNaN(c1) ? 0 : c1,
              C2: isNaN(c2) ? 0 : c2,
              C3: isNaN(c3) ? 0 : c3,
              C4: isNaN(c4) ? 0 : c4,
            }
          });
        }
      }

      if (importedData.length > 0) {
        onImportTopics(importedData);
        alert(`Thành công! Đã đồng bộ dữ liệu của ${importedData.length} chuyên đề.`);
      } else {
        alert("Lỗi! Không tìm thấy dữ liệu hợp lệ trong file CSV. Vui lòng kiểm tra định dạng file xuất từ hệ thống.");
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const SortHeader = ({ label, k, align = 'center' }: { label: string, k: SortKey, align?: 'left' | 'center' | 'right' }) => (
    <th 
      onClick={() => toggleSort(k)} 
      className={`px-2 py-4 text-[9px] font-black uppercase tracking-widest text-gray-500 cursor-pointer hover:text-primary transition-colors select-none ${align === 'center' ? 'text-center' : align === 'right' ? 'text-right' : 'text-left'}`}
    >
      <div className={`flex items-center gap-1 ${align === 'center' ? 'justify-center' : align === 'right' ? 'justify-end' : 'justify-start'}`}>
        {label}
        {sortKey === k && (
          <span className="material-symbols-outlined text-[10px]">
            {sortOrder === 'asc' ? 'arrow_upward' : 'arrow_downward'}
          </span>
        )}
      </div>
    </th>
  );

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-2 sm:p-4">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-2xl" onClick={onClose}></div>
      <div className="relative w-full max-w-[95vw] h-[92vh] bg-background-dark border border-white/10 rounded-3xl flex flex-col overflow-hidden shadow-[0_0_50px_rgba(0,0,0,0.8)] animate-fade-in text-white">
        <header className="p-4 sm:p-6 border-b border-white/10 flex items-center justify-between shrink-0 bg-white/5">
          <div className="flex items-center gap-4">
            <div className="size-12 sm:size-14 rounded-2xl bg-amber-500/20 text-amber-500 flex items-center justify-center border border-amber-500/30">
              <span className="material-symbols-outlined text-3xl sm:text-4xl">workspace_premium</span>
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-black tracking-tight leading-none uppercase">RANKINGS: CHUYÊN ĐỀ ĐỊA LÍ 8</h2>
              <div className="flex items-center gap-3 mt-2">
                <span className={`px-2 py-0.5 border rounded text-[8px] font-black uppercase tracking-widest ${isDemo ? 'bg-white/5 text-gray-400 border-white/10' : 'bg-primary/10 text-primary border-primary/20'}`}>
                  {isDemo ? 'CHẾ ĐỘ GIỚI THIỆU (DEMO)' : `Học sinh: ${userProfile.fullName || 'N/A'}`}
                </span>
                {!isDemo && (
                   <span className="px-2 py-0.5 bg-white/5 text-gray-400 border border-white/10 rounded text-[8px] font-black uppercase tracking-widest">
                    Lớp: {userProfile.className || 'N/A'}
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <input 
              type="file" 
              accept=".csv" 
              ref={fileInputRef} 
              onChange={handleFileUpload} 
              className="hidden" 
            />
            <button 
              onClick={() => fileInputRef.current?.click()}
              className="px-4 py-2 bg-white/5 border border-white/10 rounded-xl flex items-center gap-2 text-[10px] font-black uppercase tracking-widest hover:bg-white/10 transition-all active:scale-95"
            >
              <span className="material-symbols-outlined text-sm">upload</span>
              Tải lên CSV
            </button>
            <button 
              onClick={handleExportCSV}
              disabled={!hasRealData && !isDemo}
              className="px-4 py-2 bg-primary text-white border border-primary/20 rounded-xl flex items-center gap-2 text-[10px] font-black uppercase tracking-widest hover:brightness-110 transition-all active:scale-95 disabled:opacity-30"
            >
              <span className="material-symbols-outlined text-sm text-white">download</span>
              Xuất CSV
            </button>
            <button onClick={onClose} className="size-10 sm:size-12 rounded-2xl bg-white/5 hover:bg-white/10 flex items-center justify-center transition-all border border-white/10 active:scale-95">
              <span className="material-symbols-outlined text-2xl">close</span>
            </button>
          </div>
        </header>

        {(!isDemo && !hasRealData) ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-12 opacity-50">
             <span className="material-symbols-outlined text-7xl mb-6 text-primary">analytics</span>
             <h3 className="text-xl font-black uppercase mb-2">Chưa có dữ liệu luyện tập</h3>
             <p className="max-w-md text-sm text-gray-400 italic">Dữ liệu Rankings sẽ được tổng hợp ngay sau phiên luyện tập đầu tiên của bạn.</p>
             <button 
                onClick={() => fileInputRef.current?.click()}
                className="mt-6 px-6 py-3 bg-primary/20 border border-primary/40 rounded-2xl text-primary text-[11px] font-black uppercase tracking-widest hover:bg-primary/30 transition-all"
              >
                Nhập dữ liệu từ file giáo viên
             </button>
          </div>
        ) : (
          <div className="flex-1 overflow-auto no-scrollbar bg-slate-900/30">
            {isDemo && (
              <div className="sticky top-0 z-30 bg-primary p-2 text-center">
                 <p className="text-[10px] font-black uppercase tracking-widest text-white">Kích hoạt hồ sơ học viên để xem bảng Rankings thực tế</p>
              </div>
            )}
            <table className="w-full text-left border-collapse table-fixed min-w-[1100px]">
              <thead className="sticky top-0 z-20 bg-background-dark/95 backdrop-blur-md border-b border-white/10">
                <tr>
                  <SortHeader label="Chuyên đề" k="name" align="left" />
                  <SortHeader label="C1" k="C1" />
                  <SortHeader label="C2" k="C2" />
                  <SortHeader label="C3" k="C3" />
                  <SortHeader label="C4" k="C4" />
                  <SortHeader label="Thành thạo" k="mastery" />
                  <SortHeader label="Xếp hạng" k="rank" />
                  <SortHeader label="Ngày" k="day" />
                  <SortHeader label="Tuần" k="week" />
                  <SortHeader label="Tháng" k="month" />
                  <SortHeader label="3 Tháng" k="three_months" />
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {sortedTopics.map((t) => (
                  <tr key={t.topic_id} className="hover:bg-primary/5 transition-colors group">
                    <td className="px-3 py-3 align-middle w-1/5">
                      <div className="flex items-center gap-2">
                        <span className="text-[9px] font-black text-gray-600 tabular-nums w-4 shrink-0">{t.topic_id}</span>
                        <span className="text-[11px] font-bold text-gray-300 group-hover:text-primary transition-colors line-clamp-1">{t.keyword_label}</span>
                      </div>
                    </td>
                    <td className="px-1 py-3 text-center align-middle">
                      <span className={`text-[10px] font-grotesk font-black ${isDemo ? 'text-gray-700' : getMasteryColor(t.competency_scores?.C1 ?? 0).split(' ')[0]}`}>
                        {isDemo ? '—' : `${t.competency_scores?.C1 ?? 0}%`}
                      </span>
                    </td>
                    <td className="px-1 py-3 text-center align-middle">
                      <span className={`text-[10px] font-grotesk font-black ${isDemo ? 'text-gray-700' : getMasteryColor(t.competency_scores?.C2 ?? 0).split(' ')[0]}`}>
                        {isDemo ? '—' : `${t.competency_scores?.C2 ?? 0}%`}
                      </span>
                    </td>
                    <td className="px-1 py-3 text-center align-middle">
                      <span className={`text-[10px] font-grotesk font-black ${isDemo ? 'text-gray-700' : getMasteryColor(t.competency_scores?.C3 ?? 0).split(' ')[0]}`}>
                        {isDemo ? '—' : `${t.competency_scores?.C3 ?? 0}%`}
                      </span>
                    </td>
                    <td className="px-1 py-3 text-center align-middle">
                      <span className={`text-[10px] font-grotesk font-black ${isDemo ? 'text-gray-700' : getMasteryColor(t.competency_scores?.C4 ?? 0).split(' ')[0]}`}>
                        {isDemo ? '—' : `${t.competency_scores?.C4 ?? 0}%`}
                      </span>
                    </td>
                    <td className="px-1 py-3 text-center align-middle">
                      <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${isDemo ? 'text-gray-600 bg-gray-600/5' : getMasteryColor(t.mastery_percent ?? 0)}`}>
                        {isDemo ? '0%' : `${t.mastery_percent ?? 0}%`}
                      </span>
                    </td>
                    <td className="px-1 py-3 text-center align-middle">
                      <span className={`text-[8px] font-black uppercase tracking-tighter italic whitespace-nowrap ${isDemo ? 'text-gray-700' : getMasteryColor(t.mastery_percent ?? 0).split(' ')[0]}`}>
                        {isDemo ? '—' : getRankLabel(t.mastery_percent ?? 0).label}
                      </span>
                    </td>
                    <td className="px-1 py-3 text-center align-middle">
                      <span className="text-[10px] font-grotesk font-bold text-gray-500">{isDemo ? '0%' : `${t.history_mastery?.day ?? 0}%`}</span>
                    </td>
                    <td className="px-1 py-3 text-center align-middle">
                      <span className="text-[10px] font-grotesk font-bold text-gray-500">{isDemo ? '0%' : `${t.history_mastery?.week ?? 0}%`}</span>
                    </td>
                    <td className="px-1 py-3 text-center align-middle">
                      <span className="text-[10px] font-grotesk font-bold text-gray-500">{isDemo ? '0%' : `${t.history_mastery?.month ?? 0}%`}</span>
                    </td>
                    <td className="px-1 py-3 text-center align-middle">
                      <span className="text-[10px] font-grotesk font-bold text-gray-500">{isDemo ? '0%' : `${t.history_mastery?.three_months ?? 0}%`}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        
        <footer className="p-4 bg-white/5 border-t border-white/10 flex flex-col sm:flex-row justify-between items-center shrink-0 px-8 gap-2">
           <p className="text-[9px] text-gray-500 font-bold uppercase tracking-widest italic text-center sm:text-left">
              Dữ liệu 33 Chuyên đề Địa Lí 8 được khôi phục nguyên bản.
           </p>
           <div className="text-center sm:text-right">
             <p className="text-[9px] text-gray-400 font-bold uppercase tracking-widest">Mastery & Skill Matrix Rankings</p>
             <p className="text-[8px] text-gray-600 font-black uppercase tracking-widest mt-0.5">Sắp xếp theo Thành thạo | C1-C4 Audited</p>
           </div>
        </footer>
      </div>
    </div>
  );
};

export default RankPanel;
