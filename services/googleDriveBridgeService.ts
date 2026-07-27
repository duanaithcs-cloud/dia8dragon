import { TeacherWorkspace } from '../types';

const endpoint = '/api/google-drive-bridge';
const URL_KEY = 'dia8_google_drive_webapp_url';
const SECRET_KEY = 'dia8_google_drive_sync_key';

export interface GoogleDriveBridgeConfig {
  webAppUrl: string;
  syncKey: string;
}

export interface GoogleDriveBridgeInfo {
  ok: true;
  spreadsheetUrl?: string;
  formUrl?: string;
  formSummaryUrl?: string;
  folderUrl?: string;
  lastBackupAt?: string;
  backupCount?: number;
  stats?: {
    classrooms: number;
    students: number;
    assignments: number;
    submissions: number;
    reviewed: number;
  };
}

export interface GoogleFormSubmission {
  responseId: string;
  timestamp: string;
  classCode: string;
  studentCode: string;
  assignmentId: string;
  studentName: string;
  answerText: string;
  studentReflection: string;
  note?: string;
}

const callBridge = async <T>(config: GoogleDriveBridgeConfig, action: string, payload: Record<string, unknown> = {}): Promise<T> => {
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ webAppUrl: config.webAppUrl.trim(), syncKey: config.syncKey.trim(), action, payload })
  });
  const result = await response.json().catch(() => ({ ok: false, error: 'Phản hồi Google Drive Bridge không hợp lệ.' }));
  if (!response.ok || !result.ok) throw new Error(result.error || `HTTP ${response.status}`);
  return result as T;
};

export const GoogleDriveBridgeService = {
  loadConfig(): GoogleDriveBridgeConfig {
    return {
      webAppUrl: localStorage.getItem(URL_KEY) || '',
      syncKey: localStorage.getItem(SECRET_KEY) || ''
    };
  },
  saveConfig(config: GoogleDriveBridgeConfig) {
    localStorage.setItem(URL_KEY, config.webAppUrl.trim());
    localStorage.setItem(SECRET_KEY, config.syncKey.trim());
  },
  clearConfig() {
    localStorage.removeItem(URL_KEY);
    localStorage.removeItem(SECRET_KEY);
  },
  ping(config: GoogleDriveBridgeConfig) {
    return callBridge<GoogleDriveBridgeInfo>(config, 'ping');
  },
  backupWorkspace(config: GoogleDriveBridgeConfig, workspace: TeacherWorkspace) {
    return callBridge<GoogleDriveBridgeInfo & { backupId: string; fileName: string }>(config, 'backup_workspace', {
      workspace,
      clientTimestamp: new Date().toISOString(),
      appVersion: '2.1.0'
    });
  },
  restoreLatest(config: GoogleDriveBridgeConfig) {
    return callBridge<{ ok: true; workspace: TeacherWorkspace; backupId: string; createdAt: string }>(config, 'restore_latest');
  },
  pullFormResponses(config: GoogleDriveBridgeConfig, since?: string) {
    return callBridge<{ ok: true; responses: GoogleFormSubmission[]; formUrl?: string }>(config, 'pull_form_responses', { since: since || '' });
  }
};
