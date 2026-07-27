import React, { useEffect, useMemo, useState } from 'react';
import { CognitiveLevel, Topic, UIPreferences } from '../types';
import { preloadImage } from '../utils/imagePreloader';
import { CognitiveBadge, CognitiveStyles, levelFromEssayText } from '../utils/cognitiveLevel';
import ReadingCockpit from './ReadingCockpit';
import { cleanDisplayLines, cleanDisplayText } from '../utils/textQuality';

interface ResourceBlock {
  type: 'heading' | 'paragraph' | 'table';
  title?: string;
  text: string;
  rows?: string[];
}

interface ResourceImage {
  url: string;
  caption: string;
  width: number;
  height: number;
}

interface EssayTable {
  rows: string[];
  text: string;
  placement: 'question' | 'guide';
}

interface EssayItem {
  id: string;
  source_no: number;
  cognitive_level?: CognitiveLevel;
  question: string;
  guide: string;
  tables?: EssayTable[];
  source_section: string;
}

interface TopicResource {
  topic_id: number;
  label: string;
  source_file: string;
  source_readable: boolean;
  blocks: ResourceBlock[];
  full_text: string;
  key_points: string[];
  focus_points?: string[];
  focus_source_section?: string;
  essay_items?: EssayItem[];
  evidence_bank?: {
    must_remember?: Array<{ id: string; type: string; text: string; source_file: string }>;
    hsg_arguments?: Array<{ id: string; type: string; text: string; source_file: string }>;
    data_drills?: Array<{ id: string; type: string; text: string; source_file: string }>;
    source_cards?: Array<{ id: string; type: string; text: string; source_file: string }>;
  };
  images: ResourceImage[];
  stats: {
    chars: number;
    blocks: number;
    images: number;
    essay_items?: number;
  };
}

interface TopicResourcePanelProps {
  topic: Topic;
  preferences: UIPreferences;
  onUpdatePreference: (key: keyof UIPreferences, value: any) => void;
  onOpenImage: (url: string, title: string) => void;
  onStartLuyen10: () => void;
  onStartLuyen25: () => void;
  onStartVisual: () => void;
  onStartArena: () => void;
  onOpenManualPrompt: () => void;
}

const compactNumber = (value: number) => new Intl.NumberFormat('vi-VN').format(value || 0);

const normalizeEvidenceCards = (cards: Array<{ id: string; type: string; text: string; source_file: string }> | undefined) =>
  (cards || []).map(card => ({ ...card, text: cleanDisplayText(card.text) })).filter(card => card.text);

const normalizeTopicResource = (data: TopicResource): TopicResource => ({
  ...data,
  label: cleanDisplayText(data.label),
  blocks: (data.blocks || []).map(block => ({
    ...block,
    title: block.title ? cleanDisplayText(block.title) : block.title,
    text: cleanDisplayText(block.text),
    rows: block.rows ? cleanDisplayLines(block.rows) : block.rows
  })).filter(block => block.text || block.rows?.length),
  full_text: cleanDisplayText(data.full_text),
  key_points: cleanDisplayLines(data.key_points),
  focus_points: cleanDisplayLines(data.focus_points),
  focus_source_section: data.focus_source_section ? cleanDisplayText(data.focus_source_section) : data.focus_source_section,
  essay_items: (data.essay_items || []).map(item => ({
    ...item,
    question: cleanDisplayText(item.question),
    guide: cleanDisplayText(item.guide),
    source_section: cleanDisplayText(item.source_section),
    tables: (item.tables || []).map(table => ({
      ...table,
      text: cleanDisplayText(table.text),
      rows: cleanDisplayLines(table.rows)
    }))
  })).filter(item => item.question),
  evidence_bank: data.evidence_bank ? {
    must_remember: normalizeEvidenceCards(data.evidence_bank.must_remember),
    hsg_arguments: normalizeEvidenceCards(data.evidence_bank.hsg_arguments),
    data_drills: normalizeEvidenceCards(data.evidence_bank.data_drills),
    source_cards: normalizeEvidenceCards(data.evidence_bank.source_cards)
  } : data.evidence_bank,
  images: (data.images || [])
    .filter(image => image.width >= 100 && image.height >= 100)
    .map(image => ({ ...image, caption: cleanDisplayText(image.caption) }))
});

const WorkspaceIcon = ({ name }: { name: 'focus' | 'essay' | 'gallery' | 'quiz' | 'visual' | 'arena' | 'ai' }) => {
  const common = { viewBox: '0 0 24 24', width: 18, height: 18, fill: 'none', stroke: 'currentColor', strokeWidth: 1.9, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, 'aria-hidden': true };
  if (name === 'focus') return <svg {...common}><circle cx="12" cy="12" r="7"/><circle cx="12" cy="12" r="2"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3"/></svg>;
  if (name === 'essay') return <svg {...common}><path d="M5 4h14v16H5z"/><path d="M8 8h8M8 12h8M8 16h5"/></svg>;
  if (name === 'gallery') return <svg {...common}><rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="9" r="1.5"/><path d="m5 17 4-4 3 3 2-2 5 3"/></svg>;
  if (name === 'quiz') return <svg {...common}><path d="M7 3h10a2 2 0 0 1 2 2v14H5V5a2 2 0 0 1 2-2Z"/><path d="M9 8h6M9 12h6M9 16h3"/></svg>;
  if (name === 'visual') return <svg {...common}><path d="M4 19V9M10 19V5M16 19v-7M22 19H2"/></svg>;
  if (name === 'arena') return <svg {...common}><path d="m6 3 5 5-2 2-5-5zM18 3l-5 5 2 2 5-5z"/><path d="m8 12-4 4 4 4 4-4M16 12l4 4-4 4-4-4"/></svg>;
  return <svg {...common}><path d="M9 3h6l1 4 3 2v6l-3 2-1 4H9l-1-4-3-2V9l3-2z"/><circle cx="12" cy="12" r="3"/></svg>;
};

const renderTable = (table: EssayTable, tone: 'question' | 'guide', index: number) => (
  <div key={`${tone}-${index}`} className="overflow-x-auto rounded-2xl border border-white/10 bg-white/[0.03]">
    <table className="w-full min-w-[520px] text-left text-xs">
      <tbody>
        {table.rows.map((row, rowIndex) => (
          <tr key={rowIndex} className={rowIndex === 0 ? `${tone === 'question' ? 'bg-primary/15' : 'bg-c4-green/10'} text-white font-black` : 'border-t border-white/5 text-gray-300'}>
            {row.split('|').map((cell, cellIndex) => (
              <td key={cellIndex} className="p-3 align-top break-words">{cleanDisplayText(cell)}</td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

const TopicResourcePanel: React.FC<TopicResourcePanelProps> = ({ topic, preferences, onUpdatePreference, onOpenImage, onStartLuyen10, onStartLuyen25, onStartVisual, onStartArena, onOpenManualPrompt }) => {
  const [resource, setResource] = useState<TopicResource | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'focus' | 'essay' | 'gallery'>('focus');
  const [query, setQuery] = useState('');
  const [expanded, setExpanded] = useState(false);
  const [openEssay, setOpenEssay] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setResource(null);
    setQuery('');
    setExpanded(false);
    setOpenEssay({});
    fetch(`/data/topics/topic-${String(topic.topic_id).padStart(2, '0')}.json`, { signal: controller.signal })
      .then(response => response.ok ? response.json() : Promise.reject(new Error('Không có học liệu')))
      .then((data: TopicResource) => {
        const normalized = normalizeTopicResource(data);
        setResource(normalized);
        normalized.images.slice(0, 4).forEach(image => void preloadImage(image.url));
      })
      .catch(error => {
        if (!controller.signal.aborted) console.warn('Topic resource unavailable:', error);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [topic.topic_id]);

  const gallery = resource?.images?.length
    ? resource.images
    : topic.infographic_url
      ? [{ url: topic.infographic_url, caption: 'Ảnh học liệu', width: 1200, height: 900 }]
      : [];

  const focusItems = resource?.focus_points?.length
    ? resource.focus_points
    : resource?.evidence_bank?.must_remember?.length
      ? resource.evidence_bank.must_remember.map(card => card.text)
      : resource?.key_points || [];

  const filteredEssayItems = useMemo(() => {
    if (!resource?.essay_items?.length) return [];
    const cleaned = query.trim().toLowerCase();
    if (!cleaned) return resource.essay_items;
    return resource.essay_items.filter(item => `${item.question} ${item.guide} ${item.tables?.map(table => table.text).join(' ') || ''}`.toLowerCase().includes(cleaned));
  }, [query, resource]);

  const readerContent = useMemo(() => {
    if (activeTab === 'focus') {
      return [topic.keyword_label, ...focusItems].filter(Boolean).join('. ');
    }
    if (activeTab === 'essay') {
      return filteredEssayItems.slice(0, 24).flatMap(item => [item.question, item.guide]).filter(Boolean).join('. ');
    }
    return cleanDisplayText(resource?.full_text || topic.full_text || topic.source_excerpt || '');
  }, [activeTab, filteredEssayItems, focusItems, resource?.full_text, topic.full_text, topic.keyword_label, topic.source_excerpt]);

  if (loading) {
    return (
      <section className="rounded-3xl border border-white/10 bg-white/[0.04] p-6">
        <div className="h-4 w-32 rounded-full bg-white/10 animate-pulse mb-5"></div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {[1, 2, 3].map(i => <div key={i} className="h-24 rounded-2xl bg-white/5 animate-pulse"></div>)}
        </div>
      </section>
    );
  }

  if (!resource) {
    return (
      <section className="rounded-3xl border border-white/10 bg-white/[0.04] p-6">
        <p className="text-xs font-black uppercase tracking-[0.2em] text-gray-500">Học liệu</p>
        <p className="mt-3 text-sm text-gray-300">{cleanDisplayText(topic.source_excerpt || topic.full_text)}</p>
      </section>
    );
  }

  return (
    <section className="topic-resource-panel rounded-3xl border border-white/10 bg-white/[0.04] p-4 md:p-5 space-y-4">
      <div className="topic-resource-head flex items-center gap-3 min-w-0">
        <span
          className="size-10 rounded-full border-2 flex items-center justify-center shrink-0 text-[10px] font-black text-white tabular-nums shadow-lg bubble-inner"
          style={{ borderColor: topic.color, ['--neon-color' as any]: topic.color, ['--core-color' as any]: `${topic.color}88` }}
        >
          #{topic.topic_id}
        </span>
        <div className="min-w-0">
          <p className="topic-resource-kicker text-[9px] font-black uppercase tracking-[0.2em] text-c4-green">Không gian chuyên đề</p>
          <h3 className="mt-0.5 text-lg md:text-xl font-black uppercase text-white tracking-tight truncate">{topic.keyword_label}</h3>
        </div>
      </div>

      <div className="topic-workspace-toolbar" role="toolbar" aria-label="Thanh công cụ chuyên đề">
        <div className="topic-workspace-nav" aria-label="Nội dung chuyên đề">
          <button type="button" onClick={() => setActiveTab('focus')} aria-pressed={activeTab === 'focus'} className={`topic-toolbar-button topic-toolbar-tab ${activeTab === 'focus' ? 'is-active' : ''}`}>
            <WorkspaceIcon name="focus"/><span>Trọng tâm</span>
          </button>
          <button type="button" onClick={() => setActiveTab('essay')} aria-pressed={activeTab === 'essay'} className={`topic-toolbar-button topic-toolbar-tab ${activeTab === 'essay' ? 'is-active' : ''}`}>
            <WorkspaceIcon name="essay"/><span>Tự luận</span><b>{compactNumber(resource.essay_items?.length || 0)}</b>
          </button>
          <button type="button" onClick={() => setActiveTab('gallery')} aria-pressed={activeTab === 'gallery'} className={`topic-toolbar-button topic-toolbar-tab ${activeTab === 'gallery' ? 'is-active' : ''}`}>
            <WorkspaceIcon name="gallery"/><span>Ảnh</span><b>{compactNumber(gallery.length)}</b>
          </button>
        </div>

        <span className="topic-toolbar-separator" aria-hidden="true"></span>

        <div className="topic-workspace-actions" aria-label="Luyện tập chuyên đề">
          <span className="topic-toolbar-quiz-label"><WorkspaceIcon name="quiz"/><span>Trắc nghiệm</span><b>{compactNumber(resource.evidence_bank?.source_cards?.length || topic.offline_quiz?.length || 0)}</b></span>
          <button type="button" onClick={onStartLuyen10} className="topic-toolbar-button topic-toolbar-action is-primary" title="Làm nhanh 10 câu trắc nghiệm"><span>10 câu</span></button>
          <button type="button" onClick={onStartLuyen25} className="topic-toolbar-button topic-toolbar-action" title="Luyện nâng cao 25 câu trắc nghiệm"><span>25 câu</span></button>
          <button type="button" onClick={onStartVisual} className="topic-toolbar-button topic-toolbar-action" title="Làm trắc nghiệm trực quan"><WorkspaceIcon name="visual"/><span>TN ảnh</span></button>
          <button type="button" onClick={onStartArena} className="topic-toolbar-button topic-toolbar-action" title="Thi đấu 1 đối 1"><WorkspaceIcon name="arena"/><span>Đấu 1v1</span></button>
          <button type="button" onClick={onOpenManualPrompt} className="topic-toolbar-button topic-toolbar-action" title="Tạo đề bằng AI thủ công"><WorkspaceIcon name="ai"/><span>AI</span></button>
        </div>
      </div>

      <ReadingCockpit
        title={topic.keyword_label}
        content={readerContent}
        preferences={preferences}
        onUpdate={onUpdatePreference}
      />

      {activeTab === 'focus' && (
        <div className="topic-focus-layout topic-focus-workspace grid grid-cols-1 lg:grid-cols-[1.1fr_0.9fr] gap-5">
          <div className="topic-focus-copy space-y-3">
            {focusItems.map((point, index) => (
              <div key={index} className="dia8-text-box flex gap-3 rounded-2xl bg-black/20 border border-white/10 p-4">
                <span className="size-7 rounded-full bg-c4-green text-black text-xs font-black flex items-center justify-center shrink-0">{index + 1}</span>
                <p className="dia8-readable text-sm text-gray-200 leading-relaxed break-words">{point}</p>
              </div>
            ))}
          </div>
          <div className="topic-focus-gallery grid grid-cols-2 gap-3 content-start">
            {gallery.slice(0, 4).map((image, index) => (
              <button
                key={image.url}
                onClick={() => onOpenImage(image.url, `${topic.keyword_label} - ảnh ${index + 1}`)}
                onPointerEnter={() => void preloadImage(image.url)}
                className="aspect-[4/3] overflow-hidden rounded-2xl border border-white/10 bg-black/30 group"
              >
                <img src={image.url} alt={image.caption} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" loading="lazy" />
              </button>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'essay' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1 h-12 rounded-2xl bg-black/25 border border-white/10 px-4 flex items-center gap-3">
              <span className="material-symbols-outlined text-lg text-gray-500">search</span>
              <input
                value={query}
                onChange={event => setQuery(event.target.value)}
                placeholder="Tìm tự luận"
                className="flex-1 bg-transparent outline-none text-sm text-white placeholder:text-gray-600"
              />
            </div>
            <button onClick={() => setExpanded(prev => !prev)} className="h-12 px-4 rounded-2xl bg-white/5 border border-white/10 text-[10px] font-black uppercase tracking-widest text-white">
              {expanded ? 'Thu gọn' : 'Mở hết'}
            </button>
          </div>
          <div className="dia8-essay-list max-h-[620px] overflow-y-auto pr-2 space-y-3 no-scrollbar">
            {filteredEssayItems.map((item, index) => {
              const isOpen = expanded || (openEssay[item.id] ?? index < 2);
              const level = item.cognitive_level || levelFromEssayText(item.question, index);
              return (
                <article key={item.id} className="dia8-essay-card rounded-2xl border border-white/10 bg-black/20 overflow-hidden">
                  <button
                    onClick={() => setOpenEssay(prev => ({ ...prev, [item.id]: !isOpen }))}
                    className="dia8-essay-toggle w-full text-left p-4 md:p-5 flex items-start gap-3 hover:bg-white/[0.03] transition-colors"
                  >
                    <span className="h-8 min-w-8 rounded-xl bg-primary text-white text-[11px] font-black flex items-center justify-center tabular-nums">{item.source_no}</span>
                    <CognitiveBadge level={level} compact />
                    <span className="flex-1 min-w-0">
                      <span className="dia8-essay-question-label block text-[10px] font-black uppercase tracking-[0.2em] text-c4-green mb-2">Câu hỏi</span>
                      <span className="dia8-readable dia8-essay-question block text-sm md:text-[15px] font-bold leading-relaxed text-white whitespace-pre-line break-words">{item.question}</span>
                    </span>
                    <span className={`dia8-essay-chevron material-symbols-outlined text-xl text-gray-500 transition-transform ${isOpen ? 'rotate-180' : ''}`}>expand_more</span>
                  </button>
                  {isOpen && (
                    <div className="px-4 md:px-5 pb-5 space-y-4 animate-fade-in">
                      {item.tables?.filter(table => table.placement === 'question').map((table, tableIndex) => renderTable(table, 'question', tableIndex))}
                      <div className="dia8-text-box dia8-essay-guide-box rounded-2xl border border-amber-400/15 bg-amber-400/[0.06] p-4 border-l-4 border-l-amber-400/70">
                        <div className="flex items-center gap-2 mb-3">
                          <span className="material-symbols-outlined text-base text-amber-300">school</span>
                          <p className="dia8-essay-guide-label text-[10px] font-black uppercase tracking-[0.2em] text-amber-300">Hướng dẫn</p>
                        </div>
                        <p className="dia8-readable dia8-essay-guide-text text-sm leading-7 text-gray-200 whitespace-pre-line break-words">{item.guide || 'Tài liệu nguồn không tách riêng phần hướng dẫn cho câu này.'}</p>
                      </div>
                      {item.tables?.filter(table => table.placement !== 'question').map((table, tableIndex) => renderTable(table, 'guide', tableIndex))}
                    </div>
                  )}
                </article>
              );
            })}
            {!filteredEssayItems.length && (
              <div className="dia8-essay-empty rounded-2xl border border-white/10 bg-black/20 p-6 text-sm text-gray-400">Chưa có dữ liệu tự luận sạch cho chuyên đề này.</div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'gallery' && (
        <div className="topic-gallery-grid grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3">
          {gallery.map((image, index) => (
            <button
              key={`${image.url}-${index}`}
              onClick={() => onOpenImage(image.url, `${topic.keyword_label} - ảnh ${index + 1}`)}
              onPointerEnter={() => void preloadImage(image.url)}
              className="group overflow-hidden rounded-2xl border border-white/10 bg-black/30 text-left"
            >
              <div className="aspect-[4/3] overflow-hidden">
                <img src={image.url} alt={image.caption} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" loading="lazy" />
              </div>
              <div className="p-3">
                <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">{image.caption}</p>
              </div>
            </button>
          ))}
        </div>
      )}
      <CognitiveStyles />
    </section>
  );
};

export default TopicResourcePanel;
