import React, { useMemo, useState } from 'react';
import { AssignmentSubmission, GoogleDriveBackupState, TeacherWorkspace } from '../types';
import {
  GoogleDriveBridgeConfig,
  GoogleDriveBridgeInfo,
  GoogleDriveBridgeService,
  GoogleFormSubmission
} from '../services/googleDriveBridgeService';

interface GoogleDriveBackupPanelProps {
  workspace: TeacherWorkspace;
  onChangeWorkspace: (workspace: TeacherWorkspace) => void;
  onMessage: (message: string) => void;
}

const normalizeCode = (value?: string) => String(value || '').trim().toLocaleUpperCase('vi');
const isSubmitted = (submission: AssignmentSubmission) => submission.status === 'SUBMITTED' || submission.status === 'LATE';

const mergeGoogleFormResponses = (workspace: TeacherWorkspace, responses: GoogleFormSubmission[]) => {
  const imported = new Set(workspace.googleDriveBackup?.importedFormResponseIds || []);
  let importedCount = 0;
  let unmatchedCount = 0;
  const importedIds: string[] = [];

  const assignments = workspace.assignments.map(assignment => {
    const classroom = workspace.classrooms.find(item => item.id === assignment.classroomId);
    if (!classroom) return assignment;
    const matchingResponses = responses.filter(response => {
      if (imported.has(response.responseId)) return false;
      const classMatches = normalizeCode(classroom.joinCode) === normalizeCode(response.classCode)
        || normalizeCode(classroom.name) === normalizeCode(response.classCode);
      return classMatches && response.assignmentId === assignment.id;
    });
    if (!matchingResponses.length) return assignment;

    const submissions = assignment.submissions.map(submission => {
      const student = classroom.students.find(item => item.id === submission.studentId);
      if (!student) return submission;
      const response = matchingResponses
        .filter(item => {
          const code = normalizeCode(item.studentCode);
          return code === normalizeCode(student.accessCode)
            || code === normalizeCode(student.studentCode)
            || normalizeCode(item.studentName) === normalizeCode(student.fullName);
        })
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0];
      if (!response) return submission;

      imported.add(response.responseId);
      importedIds.push(response.responseId);
      importedCount += 1;
      const late = new Date(response.timestamp).getTime() > new Date(assignment.dueAt).getTime();
      return {
        ...submission,
        status: late ? 'LATE' as const : 'SUBMITTED' as const,
        progressPercent: 100,
        submittedAt: response.timestamp,
        answerText: response.answerText,
        studentReflection: response.studentReflection,
        note: [submission.note, response.note, `Google Form: ${response.responseId}`].filter(Boolean).join(' · '),
        attemptCount: Math.max(1, Number(submission.attemptCount || 0) + (isSubmitted(submission) ? 1 : 0))
      };
    });
    return { ...assignment, submissions };
  });

  responses.forEach(response => {
    if (!imported.has(response.responseId)) unmatchedCount += 1;
  });

  const state: GoogleDriveBackupState = {
    ...(workspace.googleDriveBackup || {}),
    provider: 'GOOGLE_DRIVE_LITE',
    lastFormImportAt: new Date().toISOString(),
    importedFormResponseIds: [...(workspace.googleDriveBackup?.importedFormResponseIds || []), ...importedIds].slice(-1000)
  };
  return { workspace: { ...workspace, assignments, googleDriveBackup: state }, importedCount, unmatchedCount };
};

const GoogleDriveBackupPanel: React.FC<GoogleDriveBackupPanelProps> = ({ workspace, onChangeWorkspace, onMessage }) => {
  const initialConfig = useMemo(() => GoogleDriveBridgeService.loadConfig(), []);
  const [config, setConfig] = useState<GoogleDriveBridgeConfig>(initialConfig);
  const [busy, setBusy] = useState(false);
  const [info, setInfo] = useState<GoogleDriveBridgeInfo | null>(null);
  const [showKey, setShowKey] = useState(false);

  const validateConfig = () => {
    if (!config.webAppUrl.trim()) throw new Error('Hãy nhập URL Apps Script kết thúc bằng /exec.');
    if (!config.syncKey.trim()) throw new Error('Hãy nhập mã đồng bộ được tạo bởi Apps Script.');
    if (!/^https:\/\/script\.google\.com\/macros\/s\/[A-Za-z0-9_-]+\/exec(?:\?.*)?$/.test(config.webAppUrl.trim())) {
      throw new Error('URL chưa đúng định dạng triển khai Apps Script /exec.');
    }
  };

  const run = async (message: string, task: () => Promise<void>) => {
    setBusy(true);
    onMessage(message);
    try {
      validateConfig();
      GoogleDriveBridgeService.saveConfig(config);
      await task();
    } catch (error) {
      onMessage(error instanceof Error ? error.message : 'Google Drive Bridge gặp lỗi.');
    } finally {
      setBusy(false);
    }
  };

  const testConnection = () => run('Đang kiểm tra kết nối Google Drive…', async () => {
    const result = await GoogleDriveBridgeService.ping(config);
    setInfo(result);
    onChangeWorkspace({
      ...workspace,
      googleDriveBackup: {
        ...(workspace.googleDriveBackup || {}),
        provider: 'GOOGLE_DRIVE_LITE',
        lastSyncStatus: 'SUCCESS',
        lastSyncMessage: 'Kết nối Google Drive hoạt động.',
        spreadsheetUrl: result.spreadsheetUrl,
        formUrl: result.formUrl,
        folderUrl: result.folderUrl,
        lastBackupAt: result.lastBackupAt || workspace.googleDriveBackup?.lastBackupAt
      }
    });
    onMessage('Kết nối Google Drive Lite thành công.');
  });

  const backupNow = () => run('Đang tạo bản sao lưu trên Google Drive…', async () => {
    const result = await GoogleDriveBridgeService.backupWorkspace(config, workspace);
    setInfo(result);
    onChangeWorkspace({
      ...workspace,
      googleDriveBackup: {
        ...(workspace.googleDriveBackup || {}),
        provider: 'GOOGLE_DRIVE_LITE',
        lastBackupAt: result.lastBackupAt,
        lastSyncStatus: 'SUCCESS',
        lastSyncMessage: `Đã sao lưu: ${result.fileName}`,
        spreadsheetUrl: result.spreadsheetUrl,
        formUrl: result.formUrl,
        folderUrl: result.folderUrl
      }
    });
    onMessage('Đã sao lưu lớp, học sinh, nhiệm vụ, bài làm và phản hồi vào Google Drive.');
  });

  const restoreLatest = () => run('Đang tải bản sao lưu gần nhất…', async () => {
    const result = await GoogleDriveBridgeService.restoreLatest(config);
    const accepted = window.confirm(`Khôi phục bản sao lưu ${new Date(result.createdAt).toLocaleString('vi-VN')}? Dữ liệu hiện tại trên thiết bị sẽ được thay bằng bản này.`);
    if (!accepted) return onMessage('Đã hủy khôi phục.');
    onChangeWorkspace({
      ...result.workspace,
      selectedClassroomId: result.workspace.selectedClassroomId || workspace.selectedClassroomId,
      googleDriveBackup: {
        ...(result.workspace.googleDriveBackup || workspace.googleDriveBackup || {}),
        provider: 'GOOGLE_DRIVE_LITE',
        lastRestoreAt: new Date().toISOString(),
        lastSyncStatus: 'SUCCESS',
        lastSyncMessage: `Đã khôi phục backup ${result.backupId}.`
      }
    });
    onMessage('Khôi phục dữ liệu từ Google Drive thành công.');
  });

  const importFormResponses = () => run('Đang đọc bài nộp dự phòng từ Google Form…', async () => {
    const result = await GoogleDriveBridgeService.pullFormResponses(config, workspace.googleDriveBackup?.lastFormImportAt);
    const merged = mergeGoogleFormResponses(workspace, result.responses);
    onChangeWorkspace(merged.workspace);
    onMessage(`Đã nhập ${merged.importedCount} bài từ Google Form; ${merged.unmatchedCount} phản hồi chưa khớp mã lớp, mã học sinh hoặc mã nhiệm vụ.`);
  });

  const state = workspace.googleDriveBackup;
  const displayInfo = info || {
    ok: true as const,
    spreadsheetUrl: state?.spreadsheetUrl,
    formUrl: state?.formUrl,
    folderUrl: state?.folderUrl,
    lastBackupAt: state?.lastBackupAt
  };

  return (
    <div className="rounded-[24px] border border-sky-400/20 bg-sky-400/[.04] p-5 space-y-5">
      <div className="flex items-start gap-3">
        <div className="size-12 shrink-0 rounded-2xl bg-white text-[#0b57d0] flex items-center justify-center shadow-lg">
          <span className="material-symbols-outlined">add_to_drive</span>
        </div>
        <div className="min-w-0">
          <p className="text-[9px] uppercase font-black tracking-widest text-sky-300">Google Drive Lite 2.1</p>
          <h3 className="font-black text-xl">Kho dữ liệu do giáo viên sở hữu</h3>
          <p className="mt-2 text-sm leading-relaxed text-gray-400">Tạo bảng thống kê Google Sheets, Google Form nộp bài dự phòng và tối đa 30 bản sao lưu JSON nén trong Drive của chính giáo viên.</p>
        </div>
      </div>

      <div className="space-y-3">
        <label className="block space-y-2">
          <span className="text-[9px] uppercase font-black tracking-widest text-gray-500">URL Apps Script Web App</span>
          <input
            value={config.webAppUrl}
            onChange={event => setConfig(prev => ({ ...prev, webAppUrl: event.target.value }))}
            placeholder="https://script.google.com/macros/s/.../exec"
            autoComplete="off"
            className="w-full min-h-12 rounded-xl bg-black/40 border border-white/10 px-4 text-xs"
          />
        </label>
        <label className="block space-y-2">
          <span className="text-[9px] uppercase font-black tracking-widest text-gray-500">Mã đồng bộ bí mật</span>
          <div className="grid grid-cols-[1fr_auto] gap-2">
            <input
              type={showKey ? 'text' : 'password'}
              value={config.syncKey}
              onChange={event => setConfig(prev => ({ ...prev, syncKey: event.target.value }))}
              placeholder="DIA8-XXXXXXXXXXXX-XXXXXXXXXXXX"
              autoComplete="off"
              className="min-w-0 min-h-12 rounded-xl bg-black/40 border border-white/10 px-4 text-xs"
            />
            <button type="button" onClick={() => setShowKey(value => !value)} className="size-12 rounded-xl bg-white/5 border border-white/10" aria-label={showKey ? 'Ẩn mã' : 'Hiện mã'}>
              <span className="material-symbols-outlined">{showKey ? 'visibility_off' : 'visibility'}</span>
            </button>
          </div>
        </label>
      </div>

      <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-3">
        <button disabled={busy} onClick={testConnection} className="min-h-12 rounded-xl bg-white/10 border border-white/10 text-[9px] font-black uppercase disabled:opacity-50">Kiểm tra</button>
        <button disabled={busy} onClick={backupNow} className="min-h-12 rounded-xl bg-[#0b57d0] text-white text-[9px] font-black uppercase disabled:opacity-50">Sao lưu ngay</button>
        <button disabled={busy} onClick={importFormResponses} className="min-h-12 rounded-xl bg-amber-400 text-black text-[9px] font-black uppercase disabled:opacity-50">Nhập từ Form</button>
        <button disabled={busy} onClick={restoreLatest} className="min-h-12 rounded-xl bg-c4-green text-black text-[9px] font-black uppercase disabled:opacity-50">Khôi phục</button>
      </div>

      <div className="rounded-2xl bg-black/30 border border-white/5 p-4 grid sm:grid-cols-2 gap-3 text-[10px] text-gray-400">
        <div><b className="text-white">Lần sao lưu:</b><br />{displayInfo.lastBackupAt ? new Date(displayInfo.lastBackupAt).toLocaleString('vi-VN') : 'Chưa sao lưu'}</div>
        <div><b className="text-white">Trạng thái:</b><br />{state?.lastSyncMessage || 'Chưa kiểm tra kết nối'}</div>
      </div>

      <div className="grid sm:grid-cols-3 gap-2">
        {[
          ['Mở bảng thống kê', displayInfo.spreadsheetUrl, 'table_view'],
          ['Mở Form nộp bài', displayInfo.formUrl, 'description'],
          ['Mở thư mục backup', displayInfo.folderUrl, 'folder_open']
        ].map(([label, url, icon]) => (
          <button
            key={String(label)}
            type="button"
            disabled={!url}
            onClick={() => url && window.open(String(url), '_blank', 'noopener,noreferrer')}
            className="min-h-11 rounded-xl bg-white/[.04] border border-white/10 text-[9px] font-black uppercase disabled:opacity-30 flex items-center justify-center gap-2"
          >
            <span className="material-symbols-outlined text-base">{icon}</span>{label}
          </button>
        ))}
      </div>

      <div className="rounded-2xl border border-amber-400/15 bg-amber-400/[.04] p-4">
        <p className="text-[9px] uppercase font-black text-amber-300">Vai trò đúng của Google Drive Lite</p>
        <p className="mt-2 text-xs leading-relaxed text-gray-400">Dùng làm kho sao lưu, thống kê và kênh nộp bài dự phòng. Không thay thế máy chủ bản quyền ba thiết bị và không nên là backend thời gian thực duy nhất cho sản phẩm thương mại.</p>
      </div>
    </div>
  );
};

export default GoogleDriveBackupPanel;
