import React, { useMemo, useRef, useState } from 'react';
import { AppState, ArenaStats } from '../types';
import {
  BackupMeta,
  TransferSnapshot,
  addChecksum,
  createSnapshot,
  deleteBackup,
  listBackups,
  readBackup,
  saveBackup,
  validateSnapshot
} from '../utils/dataPersistence';
import { useDialogFocus } from '../utils/accessibility';
import { exportLearningEvidenceData } from '../services/learningEvidenceDb';

interface TransferHubProps {
  appState: AppState;
  arenaStore: Record<number, ArenaStats>;
  onImportSnapshot: (snapshot: TransferSnapshot) => void | Promise<void>;
  onClose: () => void;
}

const HANDOFF_TEXT = `DIA8DRAGON - HSG Địa lí 8

1. Giải nén zip.
2. Bấm START_APP.bat để mở app.
3. Bấm STOP_APP.bat để tắt app.
4. Dữ liệu được tự động lưu trên máy và có nhiều điểm khôi phục.
5. Nên xuất gói JSON định kỳ để lưu vào USB/Drive.`;

const formatDate = (iso: string) => new Intl.DateTimeFormat('vi-VN', {
  dateStyle: 'short', timeStyle: 'short'
}).format(new Date(iso));

const formatSize = (bytes: number) => bytes < 1024 ? `${bytes} B` : `${(bytes / 1024).toFixed(1)} KB`;

const TransferHub: React.FC<TransferHubProps> = ({ appState, arenaStore, onImportSnapshot, onClose }) => {
  const dialogRef = useDialogFocus<HTMLDivElement>(onClose);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState('Dữ liệu đang được tự động lưu.');
  const [backups, setBackups] = useState<BackupMeta[]>(() => listBackups());
  const [pendingRestoreId, setPendingRestoreId] = useState<string | null>(null);

  const summary = useMemo(() => ({
    topics: appState.topics.length,
    sessions: appState.session_log.length,
    name: appState.user_profile.fullName || 'Chưa đặt tên'
  }), [appState]);

  const refreshBackups = () => setBackups(listBackups());

  const downloadJson = async () => {
    setStatus('Đang đóng gói tiến trình và bằng chứng học tập...');
    const baseSnapshot = createSnapshot(appState, arenaStore, 'Xuất thủ công');
    const learningEvidence = await exportLearningEvidenceData().catch(() => undefined);
    const { checksum: _checksum, ...payload } = baseSnapshot;
    const snapshot = addChecksum({ ...payload, learningEvidence });
    const blob = new Blob([JSON.stringify(snapshot, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const safeName = (appState.user_profile.fullName || 'hoc-sinh').replace(/[^\p{L}\p{N}-]+/gu, '-');
    link.download = `dia8dragon-${safeName}-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    setStatus('Đã xuất gói dữ liệu có mã kiểm tra toàn vẹn.');
  };

  const createRestorePoint = () => {
    const result = saveBackup(appState, arenaStore, 'Điểm khôi phục thủ công');
    setStatus(result ? 'Đã tạo điểm khôi phục trên máy.' : 'Không thể tạo điểm khôi phục; hãy xuất file JSON ngay.');
    refreshBackups();
  };

  const copyHandoff = async () => {
    try {
      await navigator.clipboard.writeText(HANDOFF_TEXT);
      setStatus('Đã sao chép hướng dẫn.');
    } catch {
      setStatus('Trình duyệt không cho phép sao chép tự động.');
    }
  };

  const handleImportFile = async (file: File | undefined) => {
    if (!file) return;
    try {
      if (file.size > 10 * 1024 * 1024) throw new Error('File vượt quá giới hạn 10 MB.');
      const snapshot = validateSnapshot(JSON.parse(await file.text()));
      await onImportSnapshot(snapshot);
      setStatus(`Đã nhập gói ngày ${formatDate(snapshot.exportedAt)}, gồm cả bằng chứng học tập nếu có.`);
      refreshBackups();
    } catch (error) {
      setStatus((error as Error).message);
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const restoreBackup = async (id: string) => {
    if (pendingRestoreId !== id) {
      setPendingRestoreId(id);
      setStatus('Bấm Khôi phục lần nữa để xác nhận. Dữ liệu hiện tại sẽ được tự động cứu hộ.');
      return;
    }
    try {
      await onImportSnapshot(readBackup(id));
      setPendingRestoreId(null);
      setStatus('Đã khôi phục điểm đã chọn.');
      refreshBackups();
    } catch (error) {
      setStatus((error as Error).message);
    }
  };

  const removeBackup = (id: string) => {
    deleteBackup(id);
    if (pendingRestoreId === id) setPendingRestoreId(null);
    refreshBackups();
    setStatus('Đã xóa điểm khôi phục.');
  };

  return (
    <div ref={dialogRef} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby="transfer-hub-title" className="fixed inset-0 z-[280] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-2xl" onClick={onClose}></div>
      <section className="relative w-full max-w-4xl max-h-[92vh] bg-background-dark border border-white/10 rounded-[32px] shadow-2xl overflow-hidden flex flex-col">
        <header className="p-6 border-b border-white/10 flex items-center justify-between gap-4">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-c4-green">An toàn dữ liệu</p>
            <h2 id="transfer-hub-title" className="text-2xl font-black uppercase text-white tracking-tight">Sao lưu & khôi phục</h2>
          </div>
          <button onClick={onClose} className="size-11 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 transition-all" aria-label="Đóng">
            <span className="material-symbols-outlined">close</span>
          </button>
        </header>

        <div className="overflow-y-auto p-6 space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <button onClick={downloadJson} className="h-32 rounded-2xl bg-c4-green text-black p-4 text-left hover:brightness-110 transition-all">
              <span className="material-symbols-outlined text-3xl mb-3">download</span>
              <span className="block text-xs font-black uppercase tracking-widest">Xuất file</span>
              <span className="block text-[10px] font-black opacity-70 mt-2">Lưu ra USB hoặc Drive.</span>
            </button>
            <button onClick={() => fileInputRef.current?.click()} className="h-32 rounded-2xl bg-white/5 border border-white/10 p-4 text-left hover:bg-white/10 transition-all">
              <span className="material-symbols-outlined text-3xl text-primary mb-3">upload_file</span>
              <span className="block text-xs font-black uppercase tracking-widest text-white">Nhập file</span>
              <span className="block text-[10px] font-bold text-gray-500 mt-2">Kiểm tra trước khi phục hồi.</span>
            </button>
            <button onClick={createRestorePoint} className="h-32 rounded-2xl bg-white/5 border border-white/10 p-4 text-left hover:bg-white/10 transition-all">
              <span className="material-symbols-outlined text-3xl text-amber-300 mb-3">save</span>
              <span className="block text-xs font-black uppercase tracking-widest text-white">Tạo điểm lưu</span>
              <span className="block text-[10px] font-bold text-gray-500 mt-2">Giữ tối đa 8 bản gần nhất.</span>
            </button>
            <button onClick={copyHandoff} className="h-32 rounded-2xl bg-white/5 border border-white/10 p-4 text-left hover:bg-white/10 transition-all">
              <span className="material-symbols-outlined text-3xl text-gray-300 mb-3">assignment</span>
              <span className="block text-xs font-black uppercase tracking-widest text-white">Hướng dẫn</span>
              <span className="block text-[10px] font-bold text-gray-500 mt-2">Sao chép cách sử dụng.</span>
            </button>
          </div>

          <div className="rounded-2xl border border-white/10 bg-black/30 p-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.25em] text-gray-500">Trạng thái</p>
              <p className="text-sm font-bold text-white mt-1">{status}</p>
            </div>
            <div className="flex flex-wrap items-center gap-3 text-[10px] font-black uppercase tracking-widest text-gray-500">
              <span>{summary.name}</span><span>{summary.topics} chuyên đề</span><span>{summary.sessions} lượt ghi</span>
            </div>
          </div>

          <div>
            <div className="flex items-end justify-between gap-3 mb-3">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.25em] text-primary">Trên thiết bị</p>
                <h3 className="text-lg font-black uppercase text-white">Các điểm khôi phục</h3>
              </div>
              <span className="text-[10px] font-black uppercase tracking-widest text-gray-500">{backups.length}/8 bản</span>
            </div>
            {backups.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-white/10 p-6 text-center text-sm text-gray-500">Chưa có điểm khôi phục. Ứng dụng sẽ tự tạo trong quá trình sử dụng.</div>
            ) : (
              <div className="space-y-2">
                {backups.map(backup => (
                  <div key={backup.id} className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-black text-white truncate">{backup.reason}</p>
                      <p className="text-[10px] font-bold text-gray-500 mt-1">{formatDate(backup.createdAt)} · {backup.studentName}{backup.className ? ` · ${backup.className}` : ''} · {backup.sessions} lượt · {formatSize(backup.size)}</p>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <button onClick={() => restoreBackup(backup.id)} className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest ${pendingRestoreId === backup.id ? 'bg-amber-300 text-black' : 'bg-primary text-white'}`}>
                        {pendingRestoreId === backup.id ? 'Xác nhận' : 'Khôi phục'}
                      </button>
                      <button onClick={() => removeBackup(backup.id)} className="px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-[10px] font-black uppercase text-gray-400">Xóa</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <input ref={fileInputRef} type="file" accept="application/json,.json" className="hidden" onChange={(event) => handleImportFile(event.target.files?.[0])} />
      </section>
    </div>
  );
};

export default TransferHub;
