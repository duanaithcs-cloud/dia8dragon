import React, { useEffect, useMemo, useState } from 'react';
import { UIPreferences } from '../types';

interface ReadingCockpitProps {
  title: string;
  content: string;
  preferences: UIPreferences;
  onUpdate: (key: keyof UIPreferences, value: any) => void;
  compact?: boolean;
}

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const cleanForReading = (value: string) => value
  .replace(/\[[A-Z ]+\]:/g, ' ')
  .replace(/\s+/g, ' ')
  .trim();

const buildChunks = (content: string, wpm: number) => {
  const words = cleanForReading(content).split(' ').filter(Boolean);
  const chunkSize = wpm >= 580 ? 5 : wpm >= 420 ? 4 : 3;
  const chunks: string[][] = [];
  for (let index = 0; index < words.length; index += chunkSize) {
    chunks.push(words.slice(index, index + chunkSize));
  }
  return chunks;
};

const ReadingCockpit: React.FC<ReadingCockpitProps> = ({ title, content, preferences, onUpdate, compact = false }) => {
  const [readerOpen, setReaderOpen] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [chunkIndex, setChunkIndex] = useState(0);

  const mode = preferences.readingMode || 'STUDY';
  const fontScale = preferences.readingFontScale || 1;
  const lineHeight = preferences.readingLineHeight || 1.62;
  const wpm = preferences.quickReadWpm || 320;
  const chunks = useMemo(() => buildChunks(content, wpm), [content, wpm]);
  const currentChunk = chunks[chunkIndex] || [];
  const progress = chunks.length ? Math.round(((chunkIndex + 1) / chunks.length) * 100) : 0;

  useEffect(() => {
    setChunkIndex(0);
    setPlaying(false);
  }, [content]);

  useEffect(() => {
    if (!readerOpen || !playing || !chunks.length) return;
    const wordsPerChunk = Math.max(1, currentChunk.length);
    const punctuationPause = /[.!?;:]$/.test(currentChunk[currentChunk.length - 1] || '') ? 1.45 : 1;
    const interval = Math.max(150, Math.round((60000 / wpm) * wordsPerChunk * punctuationPause));
    const timer = window.setTimeout(() => {
      setChunkIndex(prev => {
        if (prev >= chunks.length - 1) {
          setPlaying(false);
          return prev;
        }
        return prev + 1;
      });
    }, interval);
    return () => window.clearTimeout(timer);
  }, [readerOpen, playing, chunkIndex, chunks.length, currentChunk, wpm]);

  const adjustFont = (delta: number) => onUpdate('readingFontScale', Number(clamp(fontScale + delta, 0.86, 1.34).toFixed(2)));
  const cycleLineHeight = () => {
    const options = [1.45, 1.62, 1.78, 1.92];
    const current = options.findIndex(item => Math.abs(item - lineHeight) < 0.04);
    onUpdate('readingLineHeight', options[(current + 1) % options.length]);
  };

  return (
    <>
      <div className={`reading-cockpit ${compact ? 'reading-cockpit-compact' : ''}`} aria-label="Bàn điều khiển đọc">
        <div className="reading-mode-switch" role="group" aria-label="Chế độ hiển thị văn bản">
          {[
            ['COMPACT', 'Gọn'],
            ['STUDY', 'Học'],
            ['RESEARCH', 'Nghiên cứu']
          ].map(([value, label]) => (
            <button
              type="button"
              key={value}
              aria-pressed={mode === value}
              onClick={() => onUpdate('readingMode', value)}
              className={mode === value ? 'is-active' : ''}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="reading-cockpit-actions">
          <button type="button" onClick={() => adjustFont(-0.08)} aria-label="Giảm cỡ chữ">A−</button>
          <button type="button" onClick={() => adjustFont(0.08)} aria-label="Tăng cỡ chữ">A+</button>
          <button type="button" onClick={cycleLineHeight} aria-label="Đổi giãn dòng" title={`Giãn dòng ${lineHeight.toFixed(2)}`}>
            <span className="material-symbols-outlined">format_line_spacing</span>
          </button>
          <button
            type="button"
            onClick={() => onUpdate('readingAlign', preferences.readingAlign === 'JUSTIFY' ? 'LEFT' : 'JUSTIFY')}
            className={preferences.readingAlign === 'JUSTIFY' ? 'is-active' : ''}
            aria-label="Căn đều văn bản"
          >
            <span className="material-symbols-outlined">format_align_justify</span>
          </button>
          <button
            type="button"
            onClick={() => onUpdate('readingContrast', !preferences.readingContrast)}
            className={preferences.readingContrast ? 'is-active' : ''}
            aria-label="Tăng tương phản"
          >
            <span className="material-symbols-outlined">contrast</span>
          </button>
          <button
            type="button"
            onClick={() => onUpdate('readingTheme', (preferences.readingTheme || 'NIGHT') === 'NIGHT' ? 'DAY' : 'NIGHT')}
            className={`reading-theme-toggle ${(preferences.readingTheme || 'NIGHT') === 'DAY' ? 'is-active' : ''}`}
            aria-label={(preferences.readingTheme || 'NIGHT') === 'NIGHT' ? 'Chuyển sang đọc ban ngày' : 'Chuyển sang đọc ban đêm'}
            title={(preferences.readingTheme || 'NIGHT') === 'NIGHT' ? 'Đọc ban ngày' : 'Đọc ban đêm'}
          >
            {(preferences.readingTheme || 'NIGHT') === 'NIGHT' ? (
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M19.1 4.9l-1.4 1.4M6.3 17.7l-1.4 1.4"/></svg>
            ) : (
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="M20 15.5A8.5 8.5 0 0 1 8.5 4a8.5 8.5 0 1 0 11.5 11.5Z"/></svg>
            )}
          </button>
          <button
            type="button"
            className="reading-quick-launch"
            onClick={() => {
              setReaderOpen(true);
              setPlaying(false);
            }}
            disabled={!cleanForReading(content)}
          >
            <span className="material-symbols-outlined">speed</span>
            <span>Đọc nhanh</span>
          </button>
        </div>
      </div>

      {readerOpen && (
        <div className="quick-reader-overlay" role="dialog" aria-modal="true" aria-label={`Đọc nhanh ${title}`}>
          <div className="quick-reader-backdrop" onClick={() => setReaderOpen(false)}></div>
          <section className="quick-reader-panel">
            <header className="quick-reader-header">
              <div className="min-w-0">
                <p>Đọc tập trung</p>
                <h3>{title}</h3>
              </div>
              <button type="button" onClick={() => setReaderOpen(false)} aria-label="Đóng đọc nhanh">
                <span className="material-symbols-outlined">close</span>
              </button>
            </header>

            <div className="quick-reader-stage" onClick={() => setPlaying(prev => !prev)}>
              <div className="quick-reader-reticle" aria-hidden="true"></div>
              <p aria-live="polite">
                {currentChunk.map((word, index) => {
                  const pivot = Math.floor(currentChunk.length / 2);
                  return <span key={`${word}-${index}`} className={index === pivot ? 'is-pivot' : ''}>{word}{index < currentChunk.length - 1 ? ' ' : ''}</span>;
                })}
              </p>
              {!chunks.length && <small>Không có văn bản để đọc.</small>}
            </div>

            <div className="quick-reader-progress" aria-label={`Tiến độ ${progress}%`}>
              <div style={{ width: `${progress}%` }}></div>
            </div>

            <div className="quick-reader-controls">
              <button type="button" onClick={() => setChunkIndex(prev => Math.max(0, prev - 5))} aria-label="Lùi">
                <span className="material-symbols-outlined">skip_previous</span>
              </button>
              <button type="button" className="quick-reader-play" onClick={() => setPlaying(prev => !prev)} aria-label={playing ? 'Tạm dừng' : 'Phát'}>
                <span className="material-symbols-outlined">{playing ? 'pause' : 'play_arrow'}</span>
              </button>
              <button type="button" onClick={() => setChunkIndex(prev => Math.min(Math.max(0, chunks.length - 1), prev + 5))} aria-label="Tiến">
                <span className="material-symbols-outlined">skip_next</span>
              </button>
            </div>

            <footer className="quick-reader-footer">
              <button type="button" onClick={() => onUpdate('quickReadWpm', clamp(wpm - 40, 160, 720))}>−40</button>
              <strong>{wpm} từ/phút</strong>
              <button type="button" onClick={() => onUpdate('quickReadWpm', clamp(wpm + 40, 160, 720))}>+40</button>
              <span>{chunkIndex + 1}/{Math.max(1, chunks.length)}</span>
            </footer>
          </section>
        </div>
      )}
    </>
  );
};

export default ReadingCockpit;
