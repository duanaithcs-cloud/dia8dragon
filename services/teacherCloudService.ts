import { TeacherWorkspace } from '../types';

const endpoint = '/api/teacher-sync';

const callApi = async <T>(body: Record<string, unknown>): Promise<T> => {
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  const result = await response.json().catch(() => ({ ok: false, error: 'Phản hồi backend không hợp lệ.' }));
  if (!response.ok || !result.ok) throw new Error(result.error || `HTTP ${response.status}`);
  return result as T;
};

export interface StudentCloudAssignment {
  id: string;
  title: string;
  description: string;
  topicIds: number[];
  questionCount: 10 | 25;
  maxScore: number;
  allowTextResponse: boolean;
  dueAt: string;
  status: string;
  rubric: Array<{ id: string; label: string; description?: string; maxPoints: number }>;
  submission: {
    studentId: string;
    status: string;
    progressPercent: number;
    score?: number;
    submittedAt?: string;
    answerText?: string;
    studentReflection?: string;
    feedback?: {
      strengths?: string;
      nextSteps?: string;
      comment?: string;
      quickTags?: string[];
      rubricScores?: Record<string, number>;
      publishedAt?: string;
    };
  };
}

export const TeacherCloudService = {
  saveKey(key: string) {
    localStorage.setItem('dia8_teacher_sync_key', key);
  },
  loadKey() {
    return localStorage.getItem('dia8_teacher_sync_key') || '';
  },
  async pushWorkspace(workspace: TeacherWorkspace, key: string) {
    return callApi<{ ok: true; updatedAt: string }>({ action: 'teacher_push', key, workspace });
  },
  async pullWorkspace(key: string) {
    return callApi<{ ok: true; workspace: TeacherWorkspace | null; updatedAt: string | null }>({ action: 'teacher_pull', key });
  },
  async pullStudentAssignments(classCode: string, accessCode: string) {
    return callApi<{ ok: true; classroom: { id: string; name: string }; student: { id: string; fullName: string }; assignments: StudentCloudAssignment[] }>({ action: 'student_pull', classCode, accessCode });
  },
  async submitStudentWork(classCode: string, accessCode: string, assignmentId: string, work: { answerText: string; studentReflection: string }) {
    return callApi<{ ok: true; submission: StudentCloudAssignment['submission'] }>({ action: 'student_submit', classCode, accessCode, assignmentId, work });
  }
};
