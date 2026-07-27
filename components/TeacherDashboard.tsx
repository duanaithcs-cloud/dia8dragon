import React, { useMemo, useRef, useState } from 'react';
import { exportTeacherExcel, exportTeacherPdf } from '../utils/reportExport';
import { TeacherCloudService } from '../services/teacherCloudService';
import GoogleDriveBackupPanel from './GoogleDriveBackupPanel';
import QuestionPatchCenter from './QuestionPatchCenter';
import TeacherIntelligenceCommand from './TeacherIntelligenceCommand';
import { buildLearningRecommendations, countLearningErrors } from '../utils/learningDiagnostics';
import {
  AssignmentSubmission,
  Classroom,
  ClassroomAssignment,
  ClassroomStudent,
  FeedbackStatus,
  RubricCriterion,
  SubmissionStatus,
  TeacherFeedbackTemplate,
  TeacherWorkspace,
  Topic
} from '../types';

interface TeacherDashboardProps {
  topics: Topic[];
  workspace: TeacherWorkspace;
  onChangeWorkspace: (workspace: TeacherWorkspace) => void;
}

type TeacherTab = 'OVERVIEW' | 'STUDENTS' | 'ASSIGNMENTS' | 'REVIEW' | 'COMPARE' | 'QUESTIONS' | 'COMMAND' | 'SYNC';

const uid = (prefix: string) => `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
const randomCode = (length = 6) => {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  return Array.from({ length }, () => alphabet[Math.floor(Math.random() * alphabet.length)]).join('');
};
const todayPlusDays = (days: number) => {
  const date = new Date();
  date.setDate(date.getDate() + days);
  date.setHours(23, 59, 0, 0);
  return date.toISOString().slice(0, 16);
};
const formatDate = (value?: string) => value ? new Date(value).toLocaleString('vi-VN', { dateStyle: 'short', timeStyle: 'short' }) : '—';
const csvCell = (value: unknown) => `"${String(value ?? '').replace(/"/g, '""')}"`;
const downloadText = (name: string, text: string, type = 'text/csv;charset=utf-8') => {
  const blob = new Blob(['\ufeff', text], { type });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = name;
  anchor.click();
  URL.revokeObjectURL(url);
};
const clampScore = (value: number, max = 100) => Math.max(0, Math.min(max, Number.isFinite(value) ? value : 0));
const submissionDone = (submission: AssignmentSubmission) => submission.status === 'SUBMITTED' || submission.status === 'LATE';

const DEFAULT_RUBRIC: RubricCriterion[] = [
  { id: 'knowledge', label: 'Kiến thức địa lí', description: 'Đúng khái niệm, số liệu và mối quan hệ địa lí.', maxPoints: 4 },
  { id: 'reasoning', label: 'Lập luận và giải thích', description: 'Có nguyên nhân, biểu hiện, tác động và dẫn chứng.', maxPoints: 3 },
  { id: 'evidence', label: 'Khai thác học liệu', description: 'Biết dùng bảng số liệu, bản đồ, biểu đồ hoặc tư liệu.', maxPoints: 2 },
  { id: 'presentation', label: 'Trình bày', description: 'Mạch lạc, đúng thuật ngữ, rõ kết luận.', maxPoints: 1 }
];

const DEFAULT_FEEDBACK_TEMPLATES: TeacherFeedbackTemplate[] = [
  {
    id: 'template_evidence',
    title: 'Thiếu dẫn chứng',
    strengths: 'Em đã xác định đúng hướng trả lời và nêu được ý chính.',
    nextSteps: 'Bổ sung ít nhất một số liệu, địa danh hoặc dẫn chứng từ học liệu để làm rõ nhận định.',
    tags: ['Cần dẫn chứng']
  },
  {
    id: 'template_reasoning',
    title: 'Cần làm rõ quan hệ nhân quả',
    strengths: 'Em đã nhận diện được hiện tượng địa lí cần phân tích.',
    nextSteps: 'Sắp xếp lại theo chuỗi: nguyên nhân → biểu hiện → tác động → giải pháp; tránh liệt kê rời rạc.',
    tags: ['Lập luận']
  },
  {
    id: 'template_precise',
    title: 'Đúng nhưng chưa chính xác',
    strengths: 'Câu trả lời có kiến thức nền và bám sát yêu cầu.',
    nextSteps: 'Kiểm tra lại thuật ngữ, đơn vị và phạm vi lãnh thổ; viết kết luận ngắn, trực tiếp hơn.',
    tags: ['Thuật ngữ', 'Trình bày']
  },
  {
    id: 'template_excellent',
    title: 'Bài làm nổi bật',
    strengths: 'Bài làm chính xác, có dẫn chứng, lập luận rõ và biết liên hệ thực tiễn.',
    nextSteps: 'Tiếp tục rèn cách khái quát hóa thành sơ đồ hoặc bảng so sánh để tăng tốc độ làm bài.',
    tags: ['Hoàn thành tốt']
  }
];

const emptyWorkspace: TeacherWorkspace = { classrooms: [], assignments: [], feedbackTemplates: DEFAULT_FEEDBACK_TEMPLATES };

const TeacherDashboard: React.FC<TeacherDashboardProps> = ({ topics, workspace = emptyWorkspace, onChangeWorkspace }) => {
  const learningErrorSummary = useMemo(() => countLearningErrors(topics.flatMap(topic => topic.error_tags || [])).slice(0, 5), [topics]);
  const interventionTopics = useMemo(() => buildLearningRecommendations(topics, 3), [topics]);
  const [tab, setTab] = useState<TeacherTab>('OVERVIEW');
  const [className, setClassName] = useState('');
  const [schoolYear, setSchoolYear] = useState('2026–2027');
  const [studentName, setStudentName] = useState('');
  const [studentCode, setStudentCode] = useState('');
  const [assignmentTitle, setAssignmentTitle] = useState('');
  const [assignmentDescription, setAssignmentDescription] = useState('');
  const [assignmentDue, setAssignmentDue] = useState(todayPlusDays(7));
  const [questionCount, setQuestionCount] = useState<10 | 25>(10);
  const [selectedTopics, setSelectedTopics] = useState<number[]>([]);
  const [message, setMessage] = useState('');
  const [reviewAssignmentId, setReviewAssignmentId] = useState('');
  const [reviewStudentId, setReviewStudentId] = useState('');
  const [compareStudentIds, setCompareStudentIds] = useState<string[]>([]);
  const [syncKey, setSyncKey] = useState(() => TeacherCloudService.loadKey());
  const [syncing, setSyncing] = useState(false);
  const [feedbackDraft, setFeedbackDraft] = useState({ score: '', strengths: '', nextSteps: '', comment: '', rubricScores: {} as Record<string, number> });
  const rosterInputRef = useRef<HTMLInputElement>(null);
  const resultInputRef = useRef<HTMLInputElement>(null);

  const templates = workspace.feedbackTemplates?.length ? workspace.feedbackTemplates : DEFAULT_FEEDBACK_TEMPLATES;
  const selectedClassroom = useMemo(
    () => workspace.classrooms.find(item => item.id === workspace.selectedClassroomId) || workspace.classrooms[0] || null,
    [workspace]
  );
  const classAssignments = useMemo(
    () => selectedClassroom ? workspace.assignments.filter(item => item.classroomId === selectedClassroom.id) : [],
    [workspace.assignments, selectedClassroom]
  );

  const commit = (next: TeacherWorkspace, notice?: string) => {
    onChangeWorkspace(next);
    if (notice) setMessage(notice);
  };

  const updateClassroom = (classroom: Classroom, notice?: string) => commit({
    ...workspace,
    classrooms: workspace.classrooms.map(item => item.id === classroom.id ? classroom : item)
  }, notice);

  const updateAssignment = (assignment: ClassroomAssignment, notice?: string) => commit({
    ...workspace,
    assignments: workspace.assignments.map(item => item.id === assignment.id ? assignment : item)
  }, notice);

  const selectedReviewAssignment = useMemo(() => {
    const fallback = classAssignments.find(item => item.submissions.some(submissionDone)) || classAssignments[0];
    return classAssignments.find(item => item.id === reviewAssignmentId) || fallback || null;
  }, [classAssignments, reviewAssignmentId]);

  const selectedReviewSubmission = useMemo(() => {
    if (!selectedReviewAssignment) return null;
    const fallback = selectedReviewAssignment.submissions.find(item => submissionDone(item)) || selectedReviewAssignment.submissions[0];
    return selectedReviewAssignment.submissions.find(item => item.studentId === reviewStudentId) || fallback || null;
  }, [selectedReviewAssignment, reviewStudentId]);

  const selectedReviewStudent = useMemo(() => selectedClassroom?.students.find(item => item.id === selectedReviewSubmission?.studentId) || null, [selectedClassroom, selectedReviewSubmission]);

  const submissionRows = useMemo(() => classAssignments.flatMap(assignment => assignment.submissions.map(submission => ({ assignment, submission, student: selectedClassroom?.students.find(item => item.id === submission.studentId) }))), [classAssignments, selectedClassroom]);
  const completedRows = submissionRows.filter(row => submissionDone(row.submission));
  const reviewedRows = completedRows.filter(row => row.submission.feedback?.status === 'PUBLISHED');
  const reviewQueue = completedRows.filter(row => row.submission.feedback?.status !== 'PUBLISHED');
  const lateRows = submissionRows.filter(row => row.submission.status === 'LATE');
  const classAverage = completedRows.length ? Math.round(completedRows.reduce((sum, row) => sum + (row.submission.score || 0), 0) / completedRows.length) : 0;
  const completionRate = submissionRows.length ? Math.round(completedRows.length * 100 / submissionRows.length) : 0;

  const studentMetrics = useMemo(() => {
    if (!selectedClassroom) return [];
    return selectedClassroom.students.map(student => {
      const rows = classAssignments.map(assignment => ({ assignment, submission: assignment.submissions.find(item => item.studentId === student.id) })).filter(row => row.submission);
      const done = rows.filter(row => row.submission && submissionDone(row.submission));
      const scored = done.filter(row => row.submission?.score !== undefined);
      const average = scored.length ? Math.round(scored.reduce((sum, row) => sum + Number(row.submission?.score || 0), 0) / scored.length) : 0;
      const completion = rows.length ? Math.round(done.length * 100 / rows.length) : 0;
      const late = rows.filter(row => row.submission?.status === 'LATE').length;
      const lastTwo = scored.slice(-2).map(row => Number(row.submission?.score || 0));
      const trend = lastTwo.length < 2 ? 'STABLE' : lastTwo[1] > lastTwo[0] ? 'UP' : lastTwo[1] < lastTwo[0] ? 'DOWN' : 'STABLE';
      return { student, rows, average, completion, late, trend, needsSupport: rows.length > 0 && (completion < 60 || average < 50) };
    });
  }, [selectedClassroom, classAssignments]);

  const atRiskStudents = studentMetrics.filter(item => item.needsSupport);

  const createClassroom = () => {
    const name = className.trim();
    if (!name) return setMessage('Hãy nhập tên lớp.');
    const classroom: Classroom = {
      id: uid('class'),
      name,
      schoolYear: schoolYear.trim() || 'Chưa xác định',
      subject: 'Địa lí 8',
      joinCode: randomCode(6),
      createdAt: new Date().toISOString(),
      students: []
    };
    commit({ ...workspace, classrooms: [...workspace.classrooms, classroom], selectedClassroomId: classroom.id, feedbackTemplates: templates }, `Đã tạo lớp ${name} với mã ${classroom.joinCode}.`);
    setClassName('');
  };

  const addStudent = () => {
    if (!selectedClassroom) return setMessage('Hãy tạo hoặc chọn một lớp trước.');
    if (selectedClassroom.students.length >= 50) return setMessage('Lớp đã đạt giới hạn khuyến nghị 50 học sinh.');
    const fullName = studentName.trim();
    if (!fullName) return setMessage('Hãy nhập họ tên học sinh.');
    const duplicate = selectedClassroom.students.some(item => item.fullName.toLocaleLowerCase('vi') === fullName.toLocaleLowerCase('vi'));
    if (duplicate) return setMessage('Học sinh này đã có trong lớp.');
    const student: ClassroomStudent = {
      id: uid('student'),
      fullName,
      className: selectedClassroom.name,
      studentCode: studentCode.trim() || undefined,
      accessCode: randomCode(6),
      joinedAt: new Date().toISOString()
    };
    updateClassroom({ ...selectedClassroom, joinCode: selectedClassroom.joinCode || randomCode(6), students: [...selectedClassroom.students, student] }, `Đã thêm ${fullName}; mã truy cập ${student.accessCode}.`);
    setStudentName(''); setStudentCode('');
  };

  const regenerateStudentAccess = (studentId: string) => {
    if (!selectedClassroom) return;
    const code = randomCode(6);
    updateClassroom({ ...selectedClassroom, students: selectedClassroom.students.map(item => item.id === studentId ? { ...item, accessCode: code } : item) }, `Đã tạo mã mới: ${code}.`);
  };

  const ensureAllCodes = () => {
    if (!selectedClassroom) return;
    const classroom = {
      ...selectedClassroom,
      joinCode: selectedClassroom.joinCode || randomCode(6),
      students: selectedClassroom.students.map(item => ({ ...item, accessCode: item.accessCode || randomCode(6) }))
    };
    updateClassroom(classroom, 'Đã bổ sung mã lớp và mã cá nhân còn thiếu.');
  };

  const removeStudent = (studentId: string) => {
    if (!selectedClassroom || !confirm('Xóa học sinh khỏi lớp? Kết quả nhiệm vụ liên quan cũng sẽ bị loại bỏ.')) return;
    const classrooms = workspace.classrooms.map(item => item.id === selectedClassroom.id ? { ...item, students: item.students.filter(s => s.id !== studentId) } : item);
    const assignments = workspace.assignments.map(item => item.classroomId === selectedClassroom.id ? { ...item, submissions: item.submissions.filter(s => s.studentId !== studentId) } : item);
    commit({ ...workspace, classrooms, assignments }, 'Đã xóa học sinh khỏi lớp.');
  };

  const parseRoster = async (file: File) => {
    if (!selectedClassroom) return;
    const lines = (await file.text()).replace(/^\ufeff/, '').split(/\r?\n/).filter(Boolean);
    const rows = lines.slice(lines[0]?.toLowerCase().includes('họ') || lines[0]?.toLowerCase().includes('name') ? 1 : 0);
    const existing = new Set(selectedClassroom.students.map(s => s.fullName.trim().toLocaleLowerCase('vi')));
    const additions: ClassroomStudent[] = [];
    rows.slice(0, Math.max(0, 50 - selectedClassroom.students.length)).forEach(line => {
      const parts = line.split(/[,;\t]/).map(item => item.trim().replace(/^"|"$/g, ''));
      const fullName = parts[0];
      if (!fullName || existing.has(fullName.toLocaleLowerCase('vi'))) return;
      existing.add(fullName.toLocaleLowerCase('vi'));
      additions.push({ id: uid('student'), fullName, studentCode: parts[1] || undefined, accessCode: randomCode(6), className: selectedClassroom.name, joinedAt: new Date().toISOString() });
    });
    updateClassroom({ ...selectedClassroom, joinCode: selectedClassroom.joinCode || randomCode(6), students: [...selectedClassroom.students, ...additions] }, `Đã nhập ${additions.length} học sinh.`);
  };

  const createAssignment = () => {
    if (!selectedClassroom) return setMessage('Chưa có lớp để giao nhiệm vụ.');
    if (!assignmentTitle.trim()) return setMessage('Hãy nhập tên nhiệm vụ.');
    if (selectedTopics.length === 0) return setMessage('Hãy chọn ít nhất một chuyên đề.');
    const assignment: ClassroomAssignment = {
      id: uid('assignment'),
      classroomId: selectedClassroom.id,
      title: assignmentTitle.trim(),
      description: assignmentDescription.trim(),
      topicIds: selectedTopics,
      questionCount,
      maxScore: 10,
      allowTextResponse: true,
      rubric: DEFAULT_RUBRIC,
      dueAt: new Date(assignmentDue).toISOString(),
      status: 'ACTIVE',
      createdAt: new Date().toISOString(),
      submissions: selectedClassroom.students.map(student => ({ studentId: student.id, status: 'NOT_STARTED', progressPercent: 0, attemptCount: 0 }))
    };
    commit({ ...workspace, assignments: [assignment, ...workspace.assignments], feedbackTemplates: templates }, `Đã giao nhiệm vụ cho ${selectedClassroom.students.length} học sinh.`);
    setAssignmentTitle(''); setAssignmentDescription(''); setSelectedTopics([]); setAssignmentDue(todayPlusDays(7)); setTab('ASSIGNMENTS');
  };

  const setSubmission = (assignment: ClassroomAssignment, studentId: string, patch: Partial<AssignmentSubmission>) => {
    const submissions = assignment.submissions.map(item => item.studentId === studentId ? { ...item, ...patch } : item);
    updateAssignment({ ...assignment, submissions });
  };

  const importResults = async (file: File) => {
    const lines = (await file.text()).replace(/^\ufeff/, '').split(/\r?\n/).filter(Boolean);
    if (lines.length < 2) return setMessage('File kết quả không có dữ liệu.');
    const header = lines[0].split(/[,;\t]/).map(x => x.trim().toLowerCase());
    const assignmentIndex = header.findIndex(x => x.includes('assignment') || x.includes('nhiệm vụ'));
    const studentIndex = header.findIndex(x => x.includes('student') || x.includes('học sinh') || x.includes('mã'));
    const scoreIndex = header.findIndex(x => x.includes('score') || x.includes('điểm'));
    if ([assignmentIndex, studentIndex, scoreIndex].some(index => index < 0)) return setMessage('CSV cần có cột nhiệm vụ, học sinh/mã và điểm.');
    const parsedRows = lines.slice(1).map(line => line.split(/[,;\t]/).map(x => x.trim().replace(/^"|"$/g, '')));
    let updates = 0;
    const assignments = workspace.assignments.map(assignment => {
      let changed = false;
      const submissions = assignment.submissions.map(submission => {
        const row = parsedRows.find(parts => parts[assignmentIndex] === assignment.id && parts[studentIndex] === submission.studentId);
        if (!row) return submission;
        const score = Number(row[scoreIndex]); changed = true; updates += 1;
        return { ...submission, status: new Date() > new Date(assignment.dueAt) ? 'LATE' as const : 'SUBMITTED' as const, progressPercent: 100, score: Number.isFinite(score) ? score : undefined, submittedAt: new Date().toISOString() };
      });
      return changed ? { ...assignment, submissions } : assignment;
    });
    commit({ ...workspace, assignments }, `Đã cập nhật ${updates} kết quả.`);
  };

  const exportReport = () => {
    if (!selectedClassroom) return;
    const rows = [['Lớp','Nhiệm vụ','Học sinh','Mã HS','Trạng thái','Tiến độ','Điểm','Phản hồi','Hạn nộp']];
    classAssignments.forEach(assignment => assignment.submissions.forEach(submission => {
      const student = selectedClassroom.students.find(item => item.id === submission.studentId);
      rows.push([selectedClassroom.name, assignment.title, student?.fullName || 'Không rõ', student?.studentCode || '', submission.status, `${submission.progressPercent}%`, String(submission.score ?? ''), submission.feedback?.status || '', formatDate(assignment.dueAt)]);
    }));
    downloadText(`Bao-cao-${selectedClassroom.name}.csv`, rows.map(row => row.map(csvCell).join(',')).join('\n'));
  };

  const openReview = (assignmentId: string, studentId: string) => {
    const assignment = classAssignments.find(item => item.id === assignmentId);
    const submission = assignment?.submissions.find(item => item.studentId === studentId);
    setReviewAssignmentId(assignmentId);
    setReviewStudentId(studentId);
    setFeedbackDraft({
      score: submission?.score === undefined ? '' : String(submission.score),
      strengths: submission?.feedback?.strengths || '',
      nextSteps: submission?.feedback?.nextSteps || '',
      comment: submission?.feedback?.comment || '',
      rubricScores: submission?.feedback?.rubricScores || {}
    });
    setTab('REVIEW');
  };

  const syncReviewDraftFromSelection = () => {
    const submission = selectedReviewSubmission;
    setFeedbackDraft({
      score: submission?.score === undefined ? '' : String(submission.score),
      strengths: submission?.feedback?.strengths || '',
      nextSteps: submission?.feedback?.nextSteps || '',
      comment: submission?.feedback?.comment || '',
      rubricScores: submission?.feedback?.rubricScores || {}
    });
  };

  const saveFeedback = (status: FeedbackStatus) => {
    if (!selectedReviewAssignment || !selectedReviewSubmission) return setMessage('Chưa chọn bài làm.');
    const maxScore = selectedReviewAssignment.maxScore || 10;
    const numericScore = feedbackDraft.score === '' ? undefined : clampScore(Number(feedbackDraft.score), maxScore);
    const now = new Date().toISOString();
    const patch: Partial<AssignmentSubmission> = {
      score: numericScore,
      reviewedAt: now,
      feedback: {
        status,
        strengths: feedbackDraft.strengths.trim(),
        nextSteps: feedbackDraft.nextSteps.trim(),
        comment: feedbackDraft.comment.trim(),
        rubricScores: feedbackDraft.rubricScores,
        updatedAt: now,
        publishedAt: status === 'PUBLISHED' ? now : selectedReviewSubmission.feedback?.publishedAt
      }
    };
    setSubmission(selectedReviewAssignment, selectedReviewSubmission.studentId, patch);
    setMessage(status === 'PUBLISHED' ? 'Đã công bố phản hồi cho học sinh.' : 'Đã lưu bản nháp phản hồi.');
  };

  const applyTemplate = (template: TeacherFeedbackTemplate) => {
    setFeedbackDraft(prev => ({ ...prev, strengths: template.strengths, nextSteps: template.nextSteps }));
  };

  const handleCloudPush = async () => {
    if (!syncKey.trim()) return setMessage('Hãy nhập mã đồng bộ giáo viên.');
    setSyncing(true); setMessage('Đang đẩy dữ liệu lên cloud…');
    try {
      TeacherCloudService.saveKey(syncKey.trim());
      const result = await TeacherCloudService.pushWorkspace({ ...workspace, feedbackTemplates: templates }, syncKey.trim());
      commit({ ...workspace, feedbackTemplates: templates, cloud: { provider: 'SUPABASE_LITE', lastSyncedAt: result.updatedAt, lastSyncStatus: 'SUCCESS', lastSyncMessage: 'Đã đẩy dữ liệu.' } }, 'Đồng bộ lên cloud thành công.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Đồng bộ thất bại.');
    } finally { setSyncing(false); }
  };

  const handleCloudPull = async () => {
    if (!syncKey.trim()) return setMessage('Hãy nhập mã đồng bộ giáo viên.');
    setSyncing(true); setMessage('Đang kéo dữ liệu và bài làm mới…');
    try {
      TeacherCloudService.saveKey(syncKey.trim());
      const result = await TeacherCloudService.pullWorkspace(syncKey.trim());
      if (!result.workspace) return setMessage('Cloud chưa có dữ liệu. Hãy đẩy dữ liệu lên trước.');
      commit({ ...result.workspace, selectedClassroomId: result.workspace.selectedClassroomId || selectedClassroom?.id, feedbackTemplates: result.workspace.feedbackTemplates?.length ? result.workspace.feedbackTemplates : templates, cloud: { provider: 'SUPABASE_LITE', lastSyncedAt: result.updatedAt || new Date().toISOString(), lastSyncStatus: 'SUCCESS', lastSyncMessage: 'Đã kéo dữ liệu.' } }, 'Đã nhận dữ liệu và bài làm mới từ cloud.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Không thể kéo dữ liệu.');
    } finally { setSyncing(false); }
  };

  const toggleCompareStudent = (studentId: string) => setCompareStudentIds(prev => prev.includes(studentId) ? prev.filter(id => id !== studentId) : prev.length >= 4 ? prev : [...prev, studentId]);
  const compareMetrics = studentMetrics.filter(item => compareStudentIds.includes(item.student.id));

  const tabs: Array<{ id: TeacherTab; label: string; icon: string; badge?: number }> = [
    { id: 'OVERVIEW', label: 'Tổng quan', icon: 'space_dashboard' },
    { id: 'STUDENTS', label: 'Học sinh', icon: 'groups' },
    { id: 'ASSIGNMENTS', label: 'Nhiệm vụ', icon: 'assignment' },
    { id: 'REVIEW', label: 'Chấm bài', icon: 'fact_check', badge: reviewQueue.length },
    { id: 'COMPARE', label: 'So sánh', icon: 'compare_arrows' },
    { id: 'QUESTIONS', label: 'Kiểm định câu', icon: 'rule', badge: 0 },
    { id: 'COMMAND', label: 'Bộ chỉ huy', icon: 'radar' },
    { id: 'SYNC', label: 'Đồng bộ', icon: 'cloud_sync' }
  ];

  return <div className="teacher-command-center h-full overflow-auto bg-[#07090d] text-white">
    <div className="max-w-[1600px] mx-auto p-3 md:p-5 space-y-4 pb-24">
      <header className="rounded-[26px] border border-white/10 bg-gradient-to-br from-amber-500/12 via-white/[.035] to-primary/10 p-4 md:p-6 shadow-2xl">
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-3"><div className="size-12 rounded-2xl bg-amber-500 text-black flex items-center justify-center shadow-lg"><span className="material-symbols-outlined text-2xl">school</span></div><div><p className="text-[9px] font-black uppercase tracking-[.24em] text-amber-300">Teacher Intelligence 3.5.0</p><h1 className="text-xl md:text-3xl font-black leading-tight">Trung tâm kiểm tra, đánh giá và kiểm định câu hỏi</h1></div></div>
            <p className="mt-3 text-xs md:text-sm leading-relaxed text-gray-400 max-w-3xl">Quét nhanh lớp học, phát hiện học sinh cần hỗ trợ, chấm theo rubric, so sánh tiến bộ và công bố phản hồi có thể hành động.</p>
          </div>
          {selectedClassroom && <div className="shrink-0 grid grid-cols-2 gap-2 min-w-[260px]"><div className="rounded-2xl border border-white/10 bg-black/25 p-3"><p className="text-[8px] uppercase font-black text-gray-500">Lớp đang chọn</p><p className="mt-1 font-black">{selectedClassroom.name}</p><p className="text-[9px] text-gray-500">{selectedClassroom.students.length}/50 học sinh</p></div><div className="rounded-2xl border border-c4-green/20 bg-c4-green/[.06] p-3"><p className="text-[8px] uppercase font-black text-gray-500">Mã lớp</p><p className="mt-1 font-black tracking-[.18em] text-c4-green">{selectedClassroom.joinCode || 'CHƯA CÓ'}</p><button onClick={ensureAllCodes} className="text-[8px] uppercase font-black text-gray-400 hover:text-white">Bổ sung mã</button></div></div>}
        </div>
        <div className="mt-5 flex gap-2 overflow-x-auto pb-1 no-scrollbar">{tabs.map(item => <button key={item.id} onClick={() => { setTab(item.id); if (item.id === 'REVIEW') syncReviewDraftFromSelection(); }} className={`relative min-h-11 shrink-0 px-4 rounded-xl border flex items-center gap-2 text-[10px] font-black uppercase tracking-wider transition-all ${tab === item.id ? 'bg-amber-500 text-black border-amber-500' : 'bg-black/20 text-gray-400 border-white/10 hover:text-white'}`}><span className="material-symbols-outlined text-base">{item.icon}</span>{item.label}{item.badge ? <span className={`min-w-5 h-5 rounded-full px-1 flex items-center justify-center text-[8px] ${tab === item.id ? 'bg-black text-amber-400' : 'bg-rose-500 text-white'}`}>{item.badge}</span> : null}</button>)}</div>
      </header>

      {message && <div className="p-3 rounded-xl bg-primary/10 border border-primary/30 text-xs font-bold flex justify-between gap-3"><span>{message}</span><button onClick={() => setMessage('')} className="size-6 rounded-lg bg-white/5">×</button></div>}

      <section className="grid grid-cols-2 xl:grid-cols-5 gap-3">
        {[
          ['Học sinh', selectedClassroom?.students.length || 0, 'groups', 'text-sky-300'],
          ['Hoàn thành', `${completionRate}%`, 'task_alt', 'text-c4-green'],
          ['Điểm TB', classAverage || '—', 'analytics', 'text-amber-300'],
          ['Chờ chấm', reviewQueue.length, 'pending_actions', 'text-rose-300'],
          ['Cần hỗ trợ', atRiskStudents.length, 'warning', 'text-orange-300']
        ].map(([label, value, icon, color]) => <div key={String(label)} className="rounded-2xl bg-white/[.035] border border-white/10 p-4"><div className="flex items-center justify-between"><p className="text-[9px] uppercase tracking-widest text-gray-500 font-black">{label}</p><span className={`material-symbols-outlined text-lg ${color}`}>{icon}</span></div><p className="text-2xl md:text-3xl font-black mt-2">{value}</p></div>)}
      </section>

      <div className="grid xl:grid-cols-[270px_1fr] gap-4">
        <aside className="rounded-[24px] bg-white/[.025] border border-white/10 p-4 space-y-3 h-fit xl:sticky xl:top-3">
          <div className="flex items-center justify-between"><h2 className="text-xs font-black uppercase">Danh sách lớp</h2><span className="text-[9px] text-gray-500">{workspace.classrooms.length}</span></div>
          <div className="space-y-2 max-h-[320px] overflow-auto">{workspace.classrooms.map(item => <button key={item.id} onClick={() => commit({ ...workspace, selectedClassroomId: item.id })} className={`w-full text-left p-3 rounded-xl border ${selectedClassroom?.id === item.id ? 'border-amber-500 bg-amber-500/10' : 'border-white/10 bg-black/20'}`}><b className="text-sm">{item.name}</b><span className="block text-[9px] text-gray-500 mt-1">{item.schoolYear} · {item.students.length} học sinh</span><span className="block text-[8px] mt-1 font-black tracking-widest text-c4-green">{item.joinCode || 'Chưa có mã lớp'}</span></button>)}</div>
          <div className="pt-3 border-t border-white/10 space-y-2"><input value={className} onChange={e => setClassName(e.target.value)} placeholder="Tên lớp, ví dụ 8A1" className="w-full min-h-10 bg-black/40 border border-white/10 rounded-xl px-3 text-xs"/><input value={schoolYear} onChange={e => setSchoolYear(e.target.value)} placeholder="Năm học" className="w-full min-h-10 bg-black/40 border border-white/10 rounded-xl px-3 text-xs"/><button onClick={createClassroom} className="w-full min-h-10 rounded-xl bg-primary font-black text-[10px] uppercase">Tạo lớp</button></div>
        </aside>

        <main className="min-w-0">
          {tab === 'COMMAND' ? <TeacherIntelligenceCommand topics={topics} workspace={workspace} /> : tab === 'QUESTIONS' ? <QuestionPatchCenter topics={topics} /> : !selectedClassroom ? <div className="p-12 text-center rounded-3xl border border-dashed border-white/15 text-gray-500">Tạo lớp đầu tiên để bắt đầu quản lý, hoặc mở tab Kiểm định câu để rà soát ngân hàng 93 câu.</div> : tab === 'OVERVIEW' ? <section className="space-y-4">
            <div className="grid lg:grid-cols-3 gap-4">
              <div className="lg:col-span-2 rounded-[24px] border border-white/10 bg-white/[.03] p-4 md:p-5">
                <div className="flex items-center justify-between gap-3"><div><p className="text-[9px] uppercase font-black tracking-widest text-rose-300">Hàng đợi hành động</p><h3 className="mt-1 text-lg font-black">Việc cần xử lý ngay</h3></div><button onClick={() => setTab('REVIEW')} className="min-h-10 px-4 rounded-xl bg-rose-500/15 border border-rose-500/25 text-rose-300 text-[9px] font-black uppercase">Mở chấm bài</button></div>
                <div className="mt-4 space-y-2">{reviewQueue.slice(0, 6).map(row => <button key={`${row.assignment.id}_${row.submission.studentId}`} onClick={() => openReview(row.assignment.id, row.submission.studentId)} className="w-full grid md:grid-cols-[1fr_180px_110px] gap-2 items-center text-left p-3 rounded-xl border border-white/8 bg-black/25 hover:border-rose-400/35"><div><b className="text-xs">{row.student?.fullName || 'Không rõ'}</b><p className="text-[9px] text-gray-500 mt-1">{row.assignment.title}</p></div><span className="text-[9px] text-gray-500">Nộp {formatDate(row.submission.submittedAt)}</span><span className="text-[9px] font-black uppercase text-rose-300">Chờ phản hồi</span></button>)}{reviewQueue.length === 0 && <div className="p-8 rounded-2xl border border-dashed border-c4-green/20 text-center text-xs text-c4-green">Không còn bài chờ chấm.</div>}</div>
              </div>
              <div className="rounded-[24px] border border-white/10 bg-white/[.03] p-4 md:p-5"><p className="text-[9px] uppercase font-black tracking-widest text-orange-300">Cảnh báo học tập</p><h3 className="mt-1 text-lg font-black">Cần hỗ trợ</h3><div className="mt-4 space-y-2">{atRiskStudents.slice(0, 7).map(item => <button key={item.student.id} onClick={() => { setCompareStudentIds([item.student.id]); setTab('COMPARE'); }} className="w-full p-3 rounded-xl border border-white/8 bg-black/25 text-left"><div className="flex items-center justify-between gap-2"><b className="text-xs">{item.student.fullName}</b><span className="text-[9px] text-orange-300 font-black">{item.average || '—'}đ</span></div><div className="mt-2 h-1.5 bg-white/5 rounded-full overflow-hidden"><div className="h-full bg-orange-400" style={{ width: `${item.completion}%` }}/></div><p className="mt-1 text-[8px] text-gray-500">Hoàn thành {item.completion}% · Muộn {item.late}</p></button>)}{atRiskStudents.length === 0 && <p className="p-6 text-center text-xs text-gray-600">Chưa phát hiện học sinh cần cảnh báo.</p>}</div></div>
            </div>
            <section className="teacher-learning-diagnostics" aria-labelledby="teacher-learning-diagnostics-title">
              <div className="teacher-learning-diagnostics-head">
                <div><p>Chẩn đoán từ Quiz cục bộ</p><h3 id="teacher-learning-diagnostics-title">Can thiệp sư phạm đề xuất</h3></div>
                <span>{learningErrorSummary.reduce((sum, item) => sum + item.count, 0)} lỗi đã ghi nhận</span>
              </div>
              <div className="teacher-learning-diagnostics-grid">
                <div>
                  <h4>Nhóm lỗi nổi bật</h4>
                  {learningErrorSummary.length ? learningErrorSummary.map(item => <article key={item.tag}><strong>{item.tag}</strong><span>{item.count} lần</span></article>) : <p>Chưa có đủ dữ liệu Quiz của học sinh trên thiết bị này.</p>}
                </div>
                <div>
                  <h4>Chuyên đề nên can thiệp</h4>
                  {interventionTopics.map(item => <article key={`${item.topicId}-${item.title}`}><strong>{item.title}</strong><span>{item.reason}</span><small>{item.action}</small></article>)}
                </div>
              </div>
            </section>
            <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">{classAssignments.slice(0, 6).map(assignment => { const done = assignment.submissions.filter(submissionDone).length; const scored = assignment.submissions.filter(item => item.score !== undefined); const avg = scored.length ? Math.round(scored.reduce((sum, item) => sum + Number(item.score || 0), 0) / scored.length) : 0; return <div key={assignment.id} className="rounded-[22px] border border-white/10 bg-black/20 p-4"><div className="flex items-start justify-between gap-3"><div><p className="text-[8px] uppercase font-black text-gray-500">{assignment.status}</p><h4 className="mt-1 font-black leading-snug">{assignment.title}</h4></div><span className="text-xl font-black text-amber-300">{avg || '—'}</span></div><p className="mt-2 text-[9px] text-gray-500">{done}/{assignment.submissions.length} đã nộp · Hạn {formatDate(assignment.dueAt)}</p><div className="mt-3 h-2 bg-white/5 rounded-full overflow-hidden"><div className="h-full bg-c4-green" style={{ width: `${assignment.submissions.length ? done * 100 / assignment.submissions.length : 0}%` }}/></div></div>})}{classAssignments.length === 0 && <div className="md:col-span-2 xl:col-span-3 p-10 rounded-3xl border border-dashed border-white/15 text-center text-gray-600">Chưa có nhiệm vụ. Mở tab Nhiệm vụ để giao bài.</div>}</div>
          </section> : tab === 'STUDENTS' ? <section className="space-y-4">
            <div className="rounded-[22px] border border-white/10 bg-white/[.03] p-4"><div className="grid md:grid-cols-[1fr_220px_auto_auto] gap-2"><input value={studentName} onChange={e => setStudentName(e.target.value)} placeholder="Họ và tên học sinh" className="min-h-11 bg-black/40 border border-white/10 rounded-xl px-3 text-xs"/><input value={studentCode} onChange={e => setStudentCode(e.target.value)} placeholder="Mã học sinh (không bắt buộc)" className="min-h-11 bg-black/40 border border-white/10 rounded-xl px-3 text-xs"/><button onClick={addStudent} className="min-h-11 px-5 rounded-xl bg-c4-green text-black text-[10px] font-black uppercase">Thêm</button><button onClick={() => rosterInputRef.current?.click()} className="min-h-11 px-5 rounded-xl bg-white/10 text-[10px] font-black uppercase">Nhập CSV</button><input ref={rosterInputRef} hidden type="file" accept=".csv,.txt" onChange={e => { const file = e.target.files?.[0]; if (file) void parseRoster(file); e.target.value = ''; }}/></div></div>
            <div className="rounded-[22px] border border-white/10 overflow-x-auto"><div className="min-w-[850px]"><div className="grid grid-cols-[46px_1fr_130px_110px_100px_100px_150px] p-3 bg-white/5 text-[9px] font-black uppercase text-gray-500"><span>STT</span><span>Học sinh</span><span>Mã HS</span><span>Điểm TB</span><span>Hoàn thành</span><span>Xu hướng</span><span>Mã truy cập</span></div>{studentMetrics.map((item, index) => <div key={item.student.id} className="grid grid-cols-[46px_1fr_130px_110px_100px_100px_150px] items-center p-3 border-t border-white/5 text-xs"><span className="text-gray-600">{index + 1}</span><div><b>{item.student.fullName}</b>{item.needsSupport && <span className="ml-2 text-[8px] px-2 py-1 rounded-full bg-orange-500/15 text-orange-300 font-black uppercase">Cần hỗ trợ</span>}<div className="mt-1"><button onClick={() => removeStudent(item.student.id)} className="text-[8px] text-rose-400 uppercase font-black">Xóa</button></div></div><span className="text-gray-500">{item.student.studentCode || '—'}</span><b className={item.average < 50 ? 'text-rose-300' : 'text-c4-green'}>{item.average || '—'}</b><span>{item.completion}%</span><span className={item.trend === 'UP' ? 'text-c4-green' : item.trend === 'DOWN' ? 'text-rose-300' : 'text-gray-500'}>{item.trend === 'UP' ? '↑ Tăng' : item.trend === 'DOWN' ? '↓ Giảm' : '→ Ổn định'}</span><div className="flex items-center gap-2"><code className="font-black tracking-widest text-amber-300">{item.student.accessCode || 'CHƯA CÓ'}</code><button onClick={() => regenerateStudentAccess(item.student.id)} className="size-8 rounded-lg bg-white/5 border border-white/10"><span className="material-symbols-outlined text-sm">refresh</span></button></div></div>)}{studentMetrics.length === 0 && <p className="p-8 text-center text-gray-600 text-xs">Chưa có học sinh.</p>}</div></div>
          </section> : tab === 'ASSIGNMENTS' ? <section className="space-y-4">
            <div className="rounded-[24px] border border-white/10 bg-white/[.03] p-4 md:p-5 space-y-4"><div className="grid md:grid-cols-2 gap-3"><label className="space-y-2"><span className="text-[9px] uppercase font-black tracking-widest text-gray-500">Tên nhiệm vụ</span><input value={assignmentTitle} onChange={e => setAssignmentTitle(e.target.value)} placeholder="Ví dụ: Phân tích thế mạnh TDMNBB" className="w-full min-h-11 bg-black/40 border border-white/10 rounded-xl px-3 text-xs"/></label><label className="space-y-2"><span className="text-[9px] uppercase font-black tracking-widest text-gray-500">Hạn nộp</span><input type="datetime-local" value={assignmentDue} onChange={e => setAssignmentDue(e.target.value)} className="w-full min-h-11 bg-black/40 border border-white/10 rounded-xl px-3 text-xs"/></label></div><textarea value={assignmentDescription} onChange={e => setAssignmentDescription(e.target.value)} placeholder="Yêu cầu, sản phẩm cần nộp và tiêu chí thành công…" className="w-full min-h-24 bg-black/40 border border-white/10 rounded-xl p-3 text-xs leading-relaxed"/><div className="flex gap-2"><button onClick={() => setQuestionCount(10)} className={`px-3 py-2 rounded-lg text-[10px] font-black ${questionCount === 10 ? 'bg-primary' : 'bg-white/5'}`}>10 câu</button><button onClick={() => setQuestionCount(25)} className={`px-3 py-2 rounded-lg text-[10px] font-black ${questionCount === 25 ? 'bg-primary' : 'bg-white/5'}`}>25 câu</button><span className="ml-auto text-[9px] text-gray-500 self-center">Rubric mặc định 10 điểm · nhận bài văn bản</span></div><div className="max-h-52 overflow-auto grid md:grid-cols-2 gap-2">{topics.map(topic => <label key={topic.topic_id} className={`p-3 rounded-xl border text-[10px] cursor-pointer ${selectedTopics.includes(topic.topic_id) ? 'border-amber-500 bg-amber-500/10' : 'border-white/10 bg-black/20'}`}><input type="checkbox" className="mr-2" checked={selectedTopics.includes(topic.topic_id)} onChange={() => setSelectedTopics(prev => prev.includes(topic.topic_id) ? prev.filter(id => id !== topic.topic_id) : [...prev, topic.topic_id])}/>{topic.topic_id}. {topic.keyword_label}</label>)}</div><button onClick={createAssignment} className="w-full min-h-12 rounded-xl bg-amber-500 text-black font-black text-xs uppercase">Giao nhiệm vụ cho lớp</button></div>
            <div className="grid lg:grid-cols-2 gap-4">{classAssignments.map(assignment => { const done = assignment.submissions.filter(submissionDone).length; const published = assignment.submissions.filter(item => item.feedback?.status === 'PUBLISHED').length; return <div key={assignment.id} className="p-4 rounded-[22px] border border-white/10 bg-black/20"><div className="flex justify-between gap-3"><div><h3 className="font-black">{assignment.title}</h3><p className="text-[9px] text-gray-500 mt-1">Hạn: {formatDate(assignment.dueAt)} · {done}/{assignment.submissions.length} đã nộp · {published} phản hồi</p></div><span className={`h-fit text-[8px] px-2 py-1 rounded-full uppercase font-black ${assignment.status === 'ACTIVE' ? 'bg-c4-green/15 text-c4-green' : 'bg-white/5 text-gray-400'}`}>{assignment.status}</span></div><div className="mt-3 h-2 bg-white/5 rounded-full overflow-hidden"><div className="h-full bg-c4-green" style={{ width: `${assignment.submissions.length ? done * 100 / assignment.submissions.length : 0}%` }}/></div><div className="mt-4 flex flex-wrap gap-2"><button onClick={() => { setReviewAssignmentId(assignment.id); setTab('REVIEW'); }} className="px-3 py-2 rounded-lg bg-primary/15 text-primary border border-primary/20 text-[9px] uppercase font-black">Chấm bài</button><button onClick={() => updateAssignment({ ...assignment, status: assignment.status === 'CLOSED' ? 'ACTIVE' : 'CLOSED' })} className="px-3 py-2 rounded-lg bg-white/5 text-[9px] uppercase font-black">{assignment.status === 'CLOSED' ? 'Mở lại' : 'Đóng'}</button><button onClick={() => confirm('Xóa nhiệm vụ?') && commit({ ...workspace, assignments: workspace.assignments.filter(item => item.id !== assignment.id) })} className="px-3 py-2 rounded-lg bg-rose-500/10 text-rose-300 text-[9px] uppercase font-black">Xóa</button></div></div>})}{classAssignments.length === 0 && <div className="lg:col-span-2 p-10 text-center rounded-3xl border border-dashed border-white/15 text-gray-600">Chưa có nhiệm vụ.</div>}</div>
          </section> : tab === 'REVIEW' ? <section className="space-y-4">
            <div className="rounded-[22px] border border-white/10 bg-white/[.03] p-4 grid md:grid-cols-2 gap-3"><label className="space-y-2"><span className="text-[9px] uppercase font-black tracking-widest text-gray-500">Nhiệm vụ</span><select value={selectedReviewAssignment?.id || ''} onChange={e => { setReviewAssignmentId(e.target.value); setReviewStudentId(''); setTimeout(syncReviewDraftFromSelection, 0); }} className="w-full min-h-11 bg-[#0b0e14] border border-white/10 rounded-xl px-3 text-xs">{classAssignments.map(item => <option key={item.id} value={item.id}>{item.title}</option>)}</select></label><label className="space-y-2"><span className="text-[9px] uppercase font-black tracking-widest text-gray-500">Học sinh</span><select value={selectedReviewSubmission?.studentId || ''} onChange={e => { setReviewStudentId(e.target.value); const submission = selectedReviewAssignment?.submissions.find(item => item.studentId === e.target.value); setFeedbackDraft({ score: submission?.score === undefined ? '' : String(submission.score), strengths: submission?.feedback?.strengths || '', nextSteps: submission?.feedback?.nextSteps || '', comment: submission?.feedback?.comment || '', rubricScores: submission?.feedback?.rubricScores || {} }); }} className="w-full min-h-11 bg-[#0b0e14] border border-white/10 rounded-xl px-3 text-xs">{selectedReviewAssignment?.submissions.map(item => { const student = selectedClassroom.students.find(s => s.id === item.studentId); return <option key={item.studentId} value={item.studentId}>{student?.fullName || item.studentId} — {item.status}</option>; })}</select></label></div>
            {!selectedReviewAssignment || !selectedReviewSubmission ? <div className="p-12 text-center rounded-3xl border border-dashed border-white/15 text-gray-600">Chưa có bài làm để chấm.</div> : <div className="grid xl:grid-cols-[1.05fr_.95fr] gap-4">
              <div className="space-y-4"><div className="rounded-[24px] border border-white/10 bg-black/25 p-5"><div className="flex items-start justify-between gap-3"><div><p className="text-[9px] uppercase font-black tracking-widest text-primary">Bài làm học sinh</p><h3 className="mt-1 text-xl font-black">{selectedReviewStudent?.fullName || 'Không rõ'}</h3><p className="mt-1 text-[9px] text-gray-500">{selectedReviewAssignment.title} · {formatDate(selectedReviewSubmission.submittedAt)}</p></div><span className={`text-[8px] px-2 py-1 rounded-full uppercase font-black ${selectedReviewSubmission.status === 'LATE' ? 'bg-rose-500/15 text-rose-300' : 'bg-c4-green/15 text-c4-green'}`}>{selectedReviewSubmission.status}</span></div><div className="mt-5 rounded-2xl border border-white/8 bg-white/[.025] p-4 min-h-[240px]"><p className="text-[9px] uppercase font-black text-gray-500">Nội dung nộp</p><p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-gray-200">{selectedReviewSubmission.answerText || 'Chưa có nội dung văn bản. Giáo viên có thể nhập điểm từ kết quả quiz hoặc file CSV.'}</p></div>{selectedReviewSubmission.studentReflection && <div className="mt-3 rounded-2xl border border-sky-500/15 bg-sky-500/[.05] p-4"><p className="text-[9px] uppercase font-black text-sky-300">Tự phản ánh</p><p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed">{selectedReviewSubmission.studentReflection}</p></div>}</div>
              <div className="rounded-[24px] border border-white/10 bg-white/[.03] p-5"><p className="text-[9px] uppercase font-black tracking-widest text-gray-500">So sánh nhanh</p><div className="mt-3 grid grid-cols-3 gap-2">{[['Điểm lớp', classAverage || '—'], ['Hoàn thành', `${completionRate}%`], ['Lần nộp', selectedReviewSubmission.attemptCount || 1]].map(([label, value]) => <div key={String(label)} className="p-3 rounded-xl bg-black/25 border border-white/5"><p className="text-[8px] uppercase text-gray-500">{label}</p><p className="mt-1 font-black">{value}</p></div>)}</div></div></div>
              <div className="space-y-4"><div className="rounded-[24px] border border-amber-500/20 bg-amber-500/[.04] p-5 space-y-4"><div className="flex items-center justify-between"><div><p className="text-[9px] uppercase font-black tracking-widest text-amber-300">Rubric và điểm</p><h3 className="mt-1 font-black">Chấm nhất quán</h3></div><label className="text-right"><span className="block text-[8px] uppercase text-gray-500">Tổng điểm</span><input type="number" min="0" max={selectedReviewAssignment.maxScore || 10} value={feedbackDraft.score} onChange={e => setFeedbackDraft(prev => ({ ...prev, score: e.target.value }))} className="mt-1 w-24 min-h-11 rounded-xl bg-black/40 border border-amber-500/25 px-3 text-right text-xl font-black text-amber-300"/></label></div><div className="space-y-2">{(selectedReviewAssignment.rubric || DEFAULT_RUBRIC).map(criterion => <div key={criterion.id} className="grid grid-cols-[1fr_80px] gap-3 items-center p-3 rounded-xl bg-black/25 border border-white/5"><div><b className="text-xs">{criterion.label}</b><p className="text-[9px] text-gray-500 mt-1">{criterion.description}</p></div><input type="number" min="0" max={criterion.maxPoints} value={feedbackDraft.rubricScores[criterion.id] ?? ''} onChange={e => setFeedbackDraft(prev => ({ ...prev, rubricScores: { ...prev.rubricScores, [criterion.id]: clampScore(Number(e.target.value), criterion.maxPoints) } }))} className="min-h-10 rounded-lg bg-black/40 border border-white/10 px-2 text-right font-black"/></div>)}</div></div>
              <div className="rounded-[24px] border border-white/10 bg-white/[.03] p-5 space-y-4"><div><p className="text-[9px] uppercase font-black tracking-widest text-c4-green">Thư viện nhận xét nhanh</p><div className="mt-3 flex gap-2 overflow-x-auto pb-1">{templates.map(template => <button key={template.id} onClick={() => applyTemplate(template)} className="shrink-0 px-3 py-2 rounded-xl bg-black/30 border border-white/10 text-[9px] font-black hover:border-c4-green/40">{template.title}</button>)}</div></div><label className="block space-y-2"><span className="text-[9px] uppercase font-black text-c4-green">Điểm mạnh</span><textarea value={feedbackDraft.strengths} onChange={e => setFeedbackDraft(prev => ({ ...prev, strengths: e.target.value }))} className="w-full min-h-24 rounded-xl bg-black/40 border border-white/10 p-3 text-sm leading-relaxed" placeholder="Nêu cụ thể điều học sinh đã làm tốt…"/></label><label className="block space-y-2"><span className="text-[9px] uppercase font-black text-amber-300">Bước tiếp theo</span><textarea value={feedbackDraft.nextSteps} onChange={e => setFeedbackDraft(prev => ({ ...prev, nextSteps: e.target.value }))} className="w-full min-h-24 rounded-xl bg-black/40 border border-white/10 p-3 text-sm leading-relaxed" placeholder="Chỉ ra một hành động học sinh có thể thực hiện ngay…"/></label><label className="block space-y-2"><span className="text-[9px] uppercase font-black text-gray-400">Nhận xét chung</span><textarea value={feedbackDraft.comment} onChange={e => setFeedbackDraft(prev => ({ ...prev, comment: e.target.value }))} className="w-full min-h-20 rounded-xl bg-black/40 border border-white/10 p-3 text-sm leading-relaxed" placeholder="Ghi chú thêm cho học sinh…"/></label><div className="grid sm:grid-cols-2 gap-3"><button onClick={() => saveFeedback('DRAFT')} className="min-h-12 rounded-xl bg-white/10 border border-white/10 text-[10px] font-black uppercase">Lưu nháp</button><button onClick={() => saveFeedback('PUBLISHED')} className="min-h-12 rounded-xl bg-c4-green text-black text-[10px] font-black uppercase">Công bố phản hồi</button></div></div></div>
            </div>}
          </section> : tab === 'COMPARE' ? <section className="space-y-4">
            <div className="rounded-[22px] border border-white/10 bg-white/[.03] p-4"><div className="flex flex-col md:flex-row md:items-center justify-between gap-3"><div><p className="text-[9px] uppercase font-black tracking-widest text-primary">So sánh học sinh</p><h3 className="mt-1 font-black text-lg">Chọn tối đa 4 học sinh</h3></div><button onClick={() => setCompareStudentIds([])} className="px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-[9px] font-black uppercase">Bỏ chọn</button></div><div className="mt-4 flex gap-2 overflow-x-auto pb-1">{studentMetrics.map(item => <button key={item.student.id} onClick={() => toggleCompareStudent(item.student.id)} className={`shrink-0 px-3 py-2 rounded-xl border text-[10px] font-black ${compareStudentIds.includes(item.student.id) ? 'bg-primary border-primary text-white' : 'bg-black/30 border-white/10 text-gray-400'}`}>{item.student.fullName}</button>)}</div></div>
            {compareMetrics.length === 0 ? <div className="p-12 text-center rounded-3xl border border-dashed border-white/15 text-gray-600">Chọn từ 2 đến 4 học sinh để so sánh.</div> : <><div className={`grid gap-4 ${compareMetrics.length >= 3 ? 'xl:grid-cols-4' : 'md:grid-cols-2'}`}>{compareMetrics.map(item => <div key={item.student.id} className="rounded-[24px] border border-white/10 bg-black/25 p-5"><div className="flex items-start justify-between gap-3"><div><p className="text-[9px] uppercase font-black text-gray-500">Hồ sơ học tập</p><h4 className="mt-1 font-black text-lg">{item.student.fullName}</h4></div><span className={`material-symbols-outlined ${item.trend === 'UP' ? 'text-c4-green' : item.trend === 'DOWN' ? 'text-rose-300' : 'text-gray-500'}`}>{item.trend === 'UP' ? 'trending_up' : item.trend === 'DOWN' ? 'trending_down' : 'trending_flat'}</span></div><div className="mt-4 grid grid-cols-2 gap-2"><div className="p-3 rounded-xl bg-white/[.035]"><p className="text-[8px] uppercase text-gray-500">Điểm TB</p><p className="mt-1 text-2xl font-black">{item.average || '—'}</p></div><div className="p-3 rounded-xl bg-white/[.035]"><p className="text-[8px] uppercase text-gray-500">Hoàn thành</p><p className="mt-1 text-2xl font-black">{item.completion}%</p></div></div><div className="mt-4 space-y-2">{classAssignments.map(assignment => { const submission = assignment.submissions.find(sub => sub.studentId === item.student.id); return <div key={assignment.id} className="grid grid-cols-[1fr_auto] gap-3 p-2.5 rounded-xl border border-white/5"><span className="text-[9px] text-gray-400 truncate">{assignment.title}</span><b className={`text-[10px] ${submission?.score === undefined ? 'text-gray-600' : Number(submission.score) < 5 ? 'text-rose-300' : 'text-c4-green'}`}>{submission?.score ?? '—'}</b></div>; })}</div></div>)}</div><div className="rounded-[24px] border border-white/10 overflow-x-auto"><table className="w-full min-w-[720px] text-xs"><thead className="bg-white/5 text-[9px] uppercase text-gray-500"><tr><th className="p-3 text-left">Nhiệm vụ</th>{compareMetrics.map(item => <th key={item.student.id} className="p-3 text-center">{item.student.fullName}</th>)}</tr></thead><tbody>{classAssignments.map(assignment => <tr key={assignment.id} className="border-t border-white/5"><td className="p-3 font-bold">{assignment.title}</td>{compareMetrics.map(item => { const submission = assignment.submissions.find(sub => sub.studentId === item.student.id); return <td key={item.student.id} className="p-3 text-center"><span className="font-black">{submission?.score ?? '—'}</span><span className="block text-[8px] text-gray-500 mt-1">{submission ? submission.status : 'Chưa giao'}</span></td>; })}</tr>)}</tbody></table></div></>}
          </section> : <section className="space-y-4">
            <div className="grid lg:grid-cols-[1fr_.9fr] gap-4"><div className="rounded-[24px] border border-c4-green/20 bg-c4-green/[.04] p-5 space-y-4"><div className="flex items-center gap-3"><div className="size-12 rounded-2xl bg-c4-green text-black flex items-center justify-center"><span className="material-symbols-outlined">cloud_sync</span></div><div><p className="text-[9px] uppercase font-black tracking-widest text-c4-green">Supabase Lite</p><h3 className="font-black text-xl">Đồng bộ lớp dưới 50 học sinh</h3></div></div><p className="text-sm leading-relaxed text-gray-400">Local-first: app vẫn dùng được khi chưa có backend. Khi cấu hình Supabase, giáo viên đẩy lớp và nhiệm vụ lên cloud; học sinh nộp bài bằng mã lớp và mã cá nhân.</p><label className="block space-y-2"><span className="text-[9px] uppercase font-black tracking-widest text-gray-500">Mã đồng bộ giáo viên</span><input type="password" value={syncKey} onChange={e => setSyncKey(e.target.value)} placeholder="Mã đặt trong Vercel: DIA8_TEACHER_SYNC_KEY" className="w-full min-h-12 rounded-xl bg-black/40 border border-white/10 px-4"/></label><div className="grid sm:grid-cols-2 gap-3"><button disabled={syncing} onClick={handleCloudPush} className="min-h-12 rounded-xl bg-primary text-white text-[10px] font-black uppercase disabled:opacity-50">Đẩy lên mây</button><button disabled={syncing} onClick={handleCloudPull} className="min-h-12 rounded-xl bg-c4-green text-black text-[10px] font-black uppercase disabled:opacity-50">Kéo về máy</button></div><div className="rounded-xl bg-black/30 border border-white/5 p-3 text-[10px] text-gray-400"><p><b className="text-white">Lần đồng bộ:</b> {formatDate(workspace.cloud?.lastSyncedAt)}</p><p className="mt-1"><b className="text-white">Trạng thái:</b> {workspace.cloud?.lastSyncMessage || 'Chưa đồng bộ'}</p></div></div>
            <div className="rounded-[24px] border border-white/10 bg-white/[.03] p-5"><p className="text-[9px] uppercase font-black tracking-widest text-amber-300">Thiết lập một lần</p><ol className="mt-4 space-y-3 text-sm text-gray-300 list-decimal pl-5"><li>Tạo project Supabase Free.</li><li>Chạy SQL trong <code className="text-c4-green">docs/SUPABASE_LITE_BACKEND_2.0.md</code>.</li><li>Thêm 4 Environment Variables vào Vercel.</li><li>Redeploy rồi quay lại đây để đẩy dữ liệu.</li></ol><div className="mt-5 p-4 rounded-2xl bg-rose-500/[.05] border border-rose-500/15"><p className="text-[9px] uppercase font-black text-rose-300">Bảo mật</p><p className="mt-2 text-xs leading-relaxed text-gray-400">Không đưa <code>SUPABASE_SERVICE_ROLE_KEY</code> hoặc mã đồng bộ giáo viên lên GitHub, tin nhắn hoặc ảnh chụp công khai.</p></div></div></div>
            <GoogleDriveBackupPanel workspace={{ ...workspace, feedbackTemplates: templates }} onChangeWorkspace={(next) => commit(next)} onMessage={setMessage} />
            <div className="rounded-[24px] border border-white/10 bg-white/[.03] p-4"><div className="flex flex-wrap gap-2"><button onClick={() => selectedClassroom && exportTeacherExcel({ classroom: selectedClassroom, assignments: classAssignments, topics })} className="px-4 py-3 rounded-xl bg-c4-green text-black text-[10px] font-black uppercase">Xuất Excel</button><button onClick={() => selectedClassroom && exportTeacherPdf({ classroom: selectedClassroom, assignments: classAssignments, topics })} className="px-4 py-3 rounded-xl bg-rose-500 text-white text-[10px] font-black uppercase">Xuất PDF</button><button onClick={exportReport} className="px-4 py-3 rounded-xl bg-white/10 text-[10px] font-black uppercase">Xuất CSV</button><button onClick={() => resultInputRef.current?.click()} className="px-4 py-3 rounded-xl bg-primary text-[10px] font-black uppercase">Nhập kết quả CSV</button><input ref={resultInputRef} hidden type="file" accept=".csv,.txt" onChange={e => { const file = e.target.files?.[0]; if (file) void importResults(file); e.target.value = ''; }}/></div></div>
          </section>}
        </main>
      </div>
    </div>
  </div>;
};

export default TeacherDashboard;

