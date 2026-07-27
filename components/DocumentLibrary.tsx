import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useDialogFocus } from '../utils/accessibility';

type UserRole = 'STUDENT' | 'TEACHER';
type LibraryTab = 'TEXTBOOK' | 'HSG' | 'REFERENCE' | 'PRIVATE';
type SortMode = 'NEWEST' | 'PROVINCE' | 'PAGES';
type DocumentFormat = 'DOCX' | 'PDF';

type PublicDocument = {
  id: string;
  collection: 'TEXTBOOK' | 'HSG' | 'REFERENCE';
  file: string;
  title: string;
  unit: string;
  province?: string;
  schoolYear: string;
  dateLabel: string;
  category?: 'SO_GDDT' | 'CUM_CHUYEN_MON' | 'TRUONG_CHUYEN' | 'CAP_XA';
  pages: number;
  examType?: string;
  code?: string;
  description: string;
  sizeBytes: number;
  sha256: string;
  url: string;
  format: DocumentFormat;
  hasAnswerGuide?: boolean;
  printReady: boolean;
  tags: string[];
};

type HsgCatalog = {
  version: string;
  updatedAt: string;
  title: string;
  summary: { documents: number; pages: number; units: number; format: string };
  documents: Omit<PublicDocument, 'collection'>[];
};

type LearningCatalog = {
  version: string;
  updatedAt: string;
  title: string;
  summary: { textbooks: number; references: number; pages: number };
  documents: PublicDocument[];
};

type PrivateDocument = {
  id: string;
  name: string;
  displayName: string;
  size: number;
  type: string;
  format: DocumentFormat;
  addedAt: string;
  blob: Blob;
};

interface DocumentLibraryProps {
  role: UserRole;
  onClose: () => void;
}

const DB_NAME = 'dia8dragon-document-library';
const DB_VERSION = 2;
const STORE_NAME = 'private-documents';
const MAX_PRIVATE_FILE_SIZE = 60 * 1024 * 1024;

const categoryLabels: Record<NonNullable<PublicDocument['category']>, string> = {
  SO_GDDT: 'Sở GDĐT',
  CUM_CHUYEN_MON: 'Cụm chuyên môn',
  TRUONG_CHUYEN: 'Trường chuyên',
  CAP_XA: 'Cấp xã',
};

const tabMeta: Record<Exclude<LibraryTab, 'PRIVATE'>, { title: string; subtitle: string; empty: string }> = {
  TEXTBOOK: { title: 'Sách giáo khoa', subtitle: 'Đọc trực tuyến, tải PDF và in khi cần', empty: 'Chưa có sách giáo khoa phù hợp.' },
  HSG: { title: 'Đề và hướng dẫn chấm HSG', subtitle: 'DOCX có thể tải, chỉnh sửa và in', empty: 'Không tìm thấy đề thi phù hợp bộ lọc.' },
  REFERENCE: { title: 'Tài liệu tham khảo', subtitle: 'Chuyên khảo, atlas, biểu đồ và tài liệu bồi dưỡng', empty: 'Kho tham khảo công khai đang chờ bổ sung tài liệu đã được rà soát.' },
};

const formatBytes = (bytes: number) => {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 KB';
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
};

const normalizeSearch = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();

const Icon = ({ name, size = 22 }: { name: string; size?: number }) => {
  const common = { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, 'aria-hidden': true };
  if (name === 'close') return <svg {...common}><path d="M6 6l12 12M18 6 6 18" /></svg>;
  if (name === 'search') return <svg {...common}><circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/></svg>;
  if (name === 'document') return <svg {...common}><path d="M7 3h7l4 4v14H7z"/><path d="M14 3v5h5M10 12h5M10 16h5"/></svg>;
  if (name === 'book') return <svg {...common}><path d="M4 5a3 3 0 0 1 3-2h5v16H7a3 3 0 0 0-3 2z"/><path d="M20 5a3 3 0 0 0-3-2h-5v16h5a3 3 0 0 1 3 2z"/></svg>;
  if (name === 'download') return <svg {...common}><path d="M12 3v12M8 11l4 4 4-4M4 20h16"/></svg>;
  if (name === 'open') return <svg {...common}><path d="M14 4h6v6M20 4 11 13"/><path d="M18 13v6H5V6h6"/></svg>;
  if (name === 'print') return <svg {...common}><path d="M7 8V3h10v5M7 17H5a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><path d="M7 14h10v7H7z"/></svg>;
  if (name === 'copy') return <svg {...common}><rect x="8" y="8" width="11" height="11" rx="2"/><path d="M16 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h3"/></svg>;
  if (name === 'upload') return <svg {...common}><path d="M12 21V9M8 13l4-4 4 4M4 4h16"/></svg>;
  if (name === 'trash') return <svg {...common}><path d="M4 7h16M9 7V4h6v3M7 7l1 14h8l1-14M10 11v6M14 11v6"/></svg>;
  if (name === 'edit') return <svg {...common}><path d="m4 20 4.5-1 10-10-3.5-3.5-10 10zM13.5 6.5 17 10"/></svg>;
  if (name === 'folder') return <svg {...common}><path d="M3 6h7l2 2h9v11H3z"/></svg>;
  if (name === 'check') return <svg {...common}><path d="m5 12 4 4L19 6"/></svg>;
  if (name === 'info') return <svg {...common}><circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/></svg>;
  if (name === 'reference') return <svg {...common}><path d="M5 4h14v16H5z"/><path d="M8 8h8M8 12h8M8 16h5"/></svg>;
  return <svg {...common}><circle cx="12" cy="12" r="9"/></svg>;
};

const openDb = (): Promise<IDBDatabase> => new Promise((resolve, reject) => {
  if (!('indexedDB' in window)) return reject(new Error('Trình duyệt không hỗ trợ kho tài liệu riêng.'));
  const request = indexedDB.open(DB_NAME, DB_VERSION);
  request.onupgradeneeded = () => {
    const db = request.result;
    if (!db.objectStoreNames.contains(STORE_NAME)) db.createObjectStore(STORE_NAME, { keyPath: 'id' });
  };
  request.onsuccess = () => resolve(request.result);
  request.onerror = () => reject(request.error || new Error('Không mở được kho tài liệu riêng.'));
});

const readPrivateDocuments = async (): Promise<PrivateDocument[]> => {
  const db = await openDb();
  try {
    return await new Promise((resolve, reject) => {
      const request = db.transaction(STORE_NAME, 'readonly').objectStore(STORE_NAME).getAll();
      request.onsuccess = () => resolve((request.result || []).map((item: PrivateDocument) => ({ ...item, format: item.format || (item.name.toLowerCase().endsWith('.pdf') ? 'PDF' : 'DOCX') })));
      request.onerror = () => reject(request.error || new Error('Không đọc được tài liệu riêng.'));
    });
  } finally { db.close(); }
};

const savePrivateDocument = async (document: PrivateDocument) => {
  const db = await openDb();
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      tx.objectStore(STORE_NAME).put(document);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error || new Error('Không lưu được tài liệu.'));
    });
  } finally { db.close(); }
};

const removePrivateDocument = async (id: string) => {
  const db = await openDb();
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      tx.objectStore(STORE_NAME).delete(id);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error || new Error('Không xóa được tài liệu.'));
    });
  } finally { db.close(); }
};

const createPrivateId = () => `doc-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

const DocumentLibrary: React.FC<DocumentLibraryProps> = ({ role, onClose }) => {
  const dialogRef = useDialogFocus<HTMLDivElement>(onClose);
  const [documents, setDocuments] = useState<PublicDocument[]>([]);
  const [hsgSummary, setHsgSummary] = useState({ documents: 0, pages: 0, units: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [tab, setTab] = useState<LibraryTab>('TEXTBOOK');
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<'ALL' | NonNullable<PublicDocument['category']>>('ALL');
  const [sortMode, setSortMode] = useState<SortMode>('NEWEST');
  const [privateDocuments, setPrivateDocuments] = useState<PrivateDocument[]>([]);
  const [notice, setNotice] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const oldOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const handleKey = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handleKey);
    return () => { document.body.style.overflow = oldOverflow; window.removeEventListener('keydown', handleKey); };
  }, [onClose]);

  useEffect(() => {
    const controller = new AbortController();
    Promise.all([
      fetch('/documents/hsg-exams/catalog.json', { signal: controller.signal, cache: 'no-cache' }).then(response => { if (!response.ok) throw new Error(`Không tải được danh mục HSG (${response.status}).`); return response.json() as Promise<HsgCatalog>; }),
      fetch('/documents/learning-library/catalog.json', { signal: controller.signal, cache: 'no-cache' }).then(response => { if (!response.ok) throw new Error(`Không tải được danh mục học tập (${response.status}).`); return response.json() as Promise<LearningCatalog>; }),
    ]).then(([hsg, learning]) => {
      const hsgDocuments: PublicDocument[] = hsg.documents.map(item => ({ ...item, collection: 'HSG' }));
      setDocuments([...learning.documents, ...hsgDocuments]);
      setHsgSummary({ documents: hsg.summary.documents, pages: hsg.summary.pages, units: hsg.summary.units });
    }).catch(reason => {
      if (!controller.signal.aborted) setError(reason instanceof Error ? reason.message : 'Không tải được thư viện.');
    }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, []);

  useEffect(() => {
    if (role !== 'TEACHER') return;
    readPrivateDocuments().then(items => setPrivateDocuments(items.sort((a, b) => b.addedAt.localeCompare(a.addedAt)))).catch(() => setPrivateDocuments([]));
  }, [role]);

  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(''), 3400);
    return () => window.clearTimeout(timer);
  }, [notice]);

  const publicDocuments = useMemo(() => {
    if (tab === 'PRIVATE') return [];
    const cleaned = normalizeSearch(query);
    const filtered = documents.filter(item => {
      if (item.collection !== tab) return false;
      if (tab === 'HSG' && category !== 'ALL' && item.category !== category) return false;
      if (!cleaned) return true;
      return normalizeSearch(`${item.title} ${item.unit} ${item.province || ''} ${item.schoolYear} ${item.examType || ''} ${item.code || ''} ${item.tags.join(' ')}`).includes(cleaned);
    });
    return [...filtered].sort((a, b) => {
      if (sortMode === 'PROVINCE') return (a.province || a.unit).localeCompare(b.province || b.unit, 'vi');
      if (sortMode === 'PAGES') return b.pages - a.pages;
      return `${b.schoolYear}-${b.dateLabel}`.localeCompare(`${a.schoolYear}-${a.dateLabel}`, 'vi');
    });
  }, [documents, tab, category, query, sortMode]);

  const filteredPrivateDocuments = useMemo(() => {
    const cleaned = normalizeSearch(query);
    return privateDocuments.filter(item => !cleaned || normalizeSearch(`${item.displayName} ${item.name}`).includes(cleaned));
  }, [privateDocuments, query]);

  const totals = useMemo(() => ({
    textbooks: documents.filter(item => item.collection === 'TEXTBOOK').length,
    hsg: documents.filter(item => item.collection === 'HSG').length,
    references: documents.filter(item => item.collection === 'REFERENCE').length,
  }), [documents]);

  const handleCopyLink = async (item: PublicDocument) => {
    try {
      await navigator.clipboard.writeText(new URL(item.url, window.location.origin).toString());
      setNotice('Đã sao chép liên kết tài liệu.');
    } catch { setNotice('Trình duyệt chưa cho phép sao chép liên kết.'); }
  };

  const handlePrivateImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    event.target.value = '';
    if (!files.length) return;
    let imported = 0;
    for (const file of files) {
      const lower = file.name.toLowerCase();
      const format: DocumentFormat | null = lower.endsWith('.pdf') ? 'PDF' : lower.endsWith('.docx') ? 'DOCX' : null;
      if (!format) { setNotice(`Bỏ qua ${file.name}: chỉ chấp nhận PDF hoặc DOCX.`); continue; }
      if (file.size > MAX_PRIVATE_FILE_SIZE) { setNotice(`Bỏ qua ${file.name}: dung lượng vượt 60 MB.`); continue; }
      await savePrivateDocument({ id: createPrivateId(), name: file.name, displayName: file.name.replace(/\.(docx|pdf)$/i, '').replace(/_/g, ' '), size: file.size, type: file.type || (format === 'PDF' ? 'application/pdf' : 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'), format, addedAt: new Date().toISOString(), blob: file });
      imported += 1;
    }
    const items = await readPrivateDocuments();
    setPrivateDocuments(items.sort((a, b) => b.addedAt.localeCompare(a.addedAt)));
    setNotice(imported ? `Đã thêm ${imported} tài liệu vào kho riêng.` : 'Không có tài liệu hợp lệ được thêm.');
  };

  const openPrivateDocument = (item: PrivateDocument, download = false) => {
    const url = URL.createObjectURL(item.blob);
    if (download) {
      const anchor = document.createElement('a'); anchor.href = url; anchor.download = item.name; document.body.appendChild(anchor); anchor.click(); anchor.remove();
    } else window.open(url, '_blank', 'noopener,noreferrer');
    window.setTimeout(() => URL.revokeObjectURL(url), 8000);
  };

  const renamePrivateDocument = async (item: PrivateDocument) => {
    const nextName = window.prompt('Tên hiển thị mới:', item.displayName)?.trim();
    if (!nextName || nextName === item.displayName) return;
    const updated = { ...item, displayName: nextName };
    await savePrivateDocument(updated);
    setPrivateDocuments(items => items.map(value => value.id === item.id ? updated : value));
    setNotice('Đã đổi tên hiển thị.');
  };

  const deletePrivateDocument = async (item: PrivateDocument) => {
    if (!window.confirm(`Xóa “${item.displayName}” khỏi thiết bị này?`)) return;
    await removePrivateDocument(item.id);
    setPrivateDocuments(items => items.filter(value => value.id !== item.id));
    setNotice('Đã xóa tài liệu khỏi kho riêng.');
  };

  const switchTab = (next: LibraryTab) => { setTab(next); setQuery(''); setCategory('ALL'); };
  const currentMeta = tab === 'PRIVATE' ? { title: 'Tài liệu của tôi', subtitle: 'PDF và DOCX lưu riêng trên thiết bị', empty: 'Chưa có tài liệu riêng.' } : tabMeta[tab];

  const modal = (
    <div ref={dialogRef} tabIndex={-1} className="document-library-overlay" role="dialog" aria-modal="true" aria-label="Thư viện tài liệu học tập">
      <div className="document-library-shell">
        <header className="document-library-header">
          <div className="document-library-brand"><div className="document-library-brand-icon"><Icon name="folder" size={25}/></div><div><p className="document-library-eyebrow">Learning resources</p><h2>Tài liệu học tập</h2><p>Sách giáo khoa · Đề HSG · Tham khảo</p></div></div>
          <button type="button" className="document-library-close" onClick={onClose} aria-label="Đóng thư viện"><Icon name="close" size={22}/><span>Đóng</span></button>
        </header>

        <div className="document-library-scroll no-scrollbar">
          <section className="document-library-hero learning-library-hero">
            <div><span className="document-library-hero-badge"><Icon name="check" size={16}/> Kho học liệu có cấu trúc</span><h3>Mở nhanh đúng loại tài liệu cần dùng</h3><p>Sách giáo khoa được đọc trực tiếp dạng PDF; đề HSG giữ định dạng Word để tải và in; kho tham khảo sẵn sàng mở rộng sau khi tài liệu được rà soát.</p></div>
            <div className="document-library-stats"><div><strong>{totals.textbooks}</strong><span>Sách giáo khoa</span></div><div><strong>{hsgSummary.documents || totals.hsg}</strong><span>Đề + HDC</span></div><div><strong>{totals.references}</strong><span>Tham khảo</span></div></div>
          </section>

          <section className="document-library-controls">
            <div className="document-library-tabs learning-library-tabs" role="tablist" aria-label="Nhóm tài liệu">
              <button type="button" role="tab" aria-selected={tab === 'TEXTBOOK'} className={tab === 'TEXTBOOK' ? 'is-active' : ''} onClick={() => switchTab('TEXTBOOK')}><Icon name="book" size={18}/> Sách giáo khoa <span>{totals.textbooks}</span></button>
              <button type="button" role="tab" aria-selected={tab === 'HSG'} className={tab === 'HSG' ? 'is-active' : ''} onClick={() => switchTab('HSG')}><Icon name="document" size={18}/> Đề & HDC HSG <span>{totals.hsg}</span></button>
              <button type="button" role="tab" aria-selected={tab === 'REFERENCE'} className={tab === 'REFERENCE' ? 'is-active' : ''} onClick={() => switchTab('REFERENCE')}><Icon name="reference" size={18}/> Tham khảo <span>{totals.references}</span></button>
              {role === 'TEACHER' && <button type="button" role="tab" aria-selected={tab === 'PRIVATE'} className={tab === 'PRIVATE' ? 'is-active' : ''} onClick={() => switchTab('PRIVATE')}><Icon name="folder" size={18}/> Của tôi <span>{privateDocuments.length}</span></button>}
            </div>
            <div className="document-library-toolbar">
              <label className="document-library-search"><Icon name="search" size={19}/><input value={query} onChange={event => setQuery(event.target.value)} placeholder={`Tìm trong ${currentMeta.title.toLowerCase()}...`} aria-label="Tìm tài liệu"/></label>
              {tab === 'HSG' && <><select value={category} onChange={event => setCategory(event.target.value as typeof category)} aria-label="Lọc theo cấp tổ chức"><option value="ALL">Tất cả nguồn</option><option value="SO_GDDT">Sở GDĐT</option><option value="CUM_CHUYEN_MON">Cụm chuyên môn</option><option value="TRUONG_CHUYEN">Trường chuyên</option><option value="CAP_XA">Cấp xã</option></select><select value={sortMode} onChange={event => setSortMode(event.target.value as SortMode)} aria-label="Sắp xếp"><option value="NEWEST">Mới nhất</option><option value="PROVINCE">Theo tỉnh</option><option value="PAGES">Nhiều trang</option></select></>}
              {tab === 'PRIVATE' && role === 'TEACHER' && <button type="button" className="document-library-import" onClick={() => fileInputRef.current?.click()}><Icon name="upload" size={18}/> Thêm PDF/DOCX</button>}
              <input ref={fileInputRef} type="file" accept=".docx,.pdf,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document" multiple hidden onChange={handlePrivateImport}/>
            </div>
          </section>

          {tab !== 'PRIVATE' ? <section className="document-library-content">
            <div className="document-library-section-head"><div><h3>{currentMeta.title}</h3><p>{currentMeta.subtitle} · {publicDocuments.length} tài liệu</p></div><span className="document-library-format-pill">{tab === 'HSG' ? 'DOCX · chỉnh sửa được' : tab === 'TEXTBOOK' ? 'PDF · đọc & in' : 'Đã rà soát trước khi xuất bản'}</span></div>
            {loading && <div className="document-library-empty">Đang nạp thư viện...</div>}
            {error && <div className="document-library-empty is-error"><Icon name="info" size={24}/>{error}</div>}
            {!loading && !error && publicDocuments.length === 0 && <div className="document-library-empty learning-library-empty"><Icon name={tab === 'REFERENCE' ? 'reference' : 'book'} size={34}/><strong>{currentMeta.empty}</strong>{tab === 'REFERENCE' && role === 'TEACHER' && <span>Giáo viên có thể dùng tab “Của tôi” để lưu tài liệu tham khảo trên thiết bị trước khi đưa vào kho công khai.</span>}</div>}
            <div className={`document-library-grid ${tab === 'TEXTBOOK' ? 'is-textbook-grid' : ''}`}>
              {publicDocuments.map(item => <article className={`document-card document-card-${item.format.toLowerCase()}`} key={item.id}>
                <div className="document-card-top"><div className="document-card-file"><Icon name={item.format === 'PDF' ? 'book' : 'document'} size={29}/><span>{item.format}</span></div><div className="document-card-badges">{item.category && <span>{categoryLabels[item.category]}</span>}<span>{item.schoolYear}</span></div></div>
                <div className="document-card-body"><p className="document-card-province">{item.collection === 'HSG' ? `${item.province || ''} · ${item.code || ''}` : item.dateLabel}</p><h4>{item.title}</h4><p className="document-card-unit">{item.unit}</p><p className="document-card-description">{item.description}</p><div className="document-card-meta"><span>{item.pages} trang</span><span>{formatBytes(item.sizeBytes)}</span><span>{item.format === 'DOCX' ? 'Tải & chỉnh sửa' : 'Đọc trực tuyến'}</span>{item.hasAnswerGuide && <span>Đề + HDC</span>}</div></div>
                <div className={`document-card-actions ${item.format === 'PDF' ? 'has-three-actions' : ''}`}>
                  {item.format === 'PDF' ? <><a href={item.url} target="_blank" rel="noreferrer" className="document-download-primary"><Icon name="open" size={18}/><span>Mở đọc</span></a><a href={item.url} download={item.file} title="Tải PDF"><Icon name="download" size={18}/></a></> : <a href={item.url} download={item.file} onClick={() => setNotice('Đã bắt đầu tải DOCX. Mở bằng Word hoặc LibreOffice để in.')} className="document-download-primary"><Icon name="print" size={18}/><span>Tải để in</span></a>}
                  <button type="button" onClick={() => handleCopyLink(item)} title="Sao chép liên kết"><Icon name="copy" size={18}/></button>
                </div>
              </article>)}
            </div>
          </section> : <section className="document-library-content">
            <div className="document-library-section-head"><div><h3>Tài liệu riêng của giáo viên</h3><p>PDF và DOCX lưu trong trình duyệt hiện tại, không tự công khai cho học sinh.</p></div><button type="button" className="document-library-import secondary" onClick={() => fileInputRef.current?.click()}><Icon name="upload" size={18}/> Bổ sung tài liệu</button></div>
            <div className="document-library-private-note"><Icon name="info" size={20}/><div><strong>Kho bổ sung nhanh trên thiết bị</strong><p>Nên giữ thêm bản gốc trong Google Drive. Dữ liệu có thể mất khi xóa dữ liệu trình duyệt.</p></div></div>
            {filteredPrivateDocuments.length === 0 ? <div className="document-library-empty private"><Icon name="folder" size={32}/><strong>Chưa có tài liệu riêng</strong><span>Chọn một hoặc nhiều file PDF/DOCX, tối đa 60 MB mỗi file.</span></div> : <div className="private-document-list">{filteredPrivateDocuments.map(item => <article key={item.id} className="private-document-row"><div className="private-document-icon"><Icon name={item.format === 'PDF' ? 'book' : 'document'} size={24}/></div><div className="private-document-info"><strong>{item.displayName}</strong><span>{item.format} · {formatBytes(item.size)} · Thêm {new Date(item.addedAt).toLocaleString('vi-VN')}</span><small>{item.name}</small></div><div className="private-document-actions"><button type="button" onClick={() => openPrivateDocument(item)}><Icon name="open" size={18}/><span>Mở</span></button><button type="button" onClick={() => openPrivateDocument(item, true)}><Icon name="download" size={18}/><span>Tải</span></button><button type="button" onClick={() => renamePrivateDocument(item)}><Icon name="edit" size={18}/><span>Đổi tên</span></button><button type="button" className="danger" onClick={() => deletePrivateDocument(item)}><Icon name="trash" size={18}/><span>Xóa</span></button></div></article>)}</div>}
          </section>}

          <footer className="document-library-footer"><div><Icon name="book" size={20}/><p><strong>Sách giáo khoa:</strong> bấm Mở đọc để xem PDF; bấm biểu tượng tải để lưu về máy và in.</p></div><div><Icon name="info" size={20}/><p>Tài liệu được giữ theo nguồn người quản trị cung cấp; cần kiểm tra quyền sử dụng và nội dung trước khi phát hành thương mại.</p></div></footer>
        </div>
      </div>
      {notice && <div className="document-library-toast"><Icon name="check" size={18}/>{notice}</div>}
    </div>
  );

  return typeof document === 'undefined' ? null : createPortal(modal, document.body);
};

export default DocumentLibrary;
