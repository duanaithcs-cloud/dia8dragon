import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { StudentCloudAssignment, TeacherCloudService } from '../services/teacherCloudService';
import { useDialogFocus } from '../utils/accessibility';

interface StudentAssignmentHubProps {
  onClose: () => void;
}

type AssignmentFilter = 'ALL' | 'TODO' | 'SUBMITTED' | 'FEEDBACK';

const formatDate = (value?: string) => value ? new Date(value).toLocaleString('vi-VN', { dateStyle: 'short', timeStyle: 'short' }) : '—';
const statusLabel: Record<string, string> = {
  NOT_STARTED: 'Chưa làm',
  IN_PROGRESS: 'Đang làm',
  SUBMITTED: 'Đã nộp',
  LATE: 'Nộp muộn'
};

const Icon = ({ name, size = 20 }: { name: string; size?: number }) => {
  const props = { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, 'aria-hidden': true };
  if (name === 'close') return <svg {...props}><path d="M6 6l12 12M18 6 6 18" /></svg>;
  if (name === 'assignment') return <svg {...props}><path d="M9 5h6M9 3h6v4H9z"/><path d="M6 5H4v16h16V5h-2M8 12h8M8 16h5"/></svg>;
  if (name === 'refresh') return <svg {...props}><path d="M20 11a8 8 0 1 0-2.3 5.7"/><path d="M20 4v7h-7"/></svg>;
  if (name === 'clock') return <svg {...props}><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>;
  if (name === 'check') return <svg {...props}><path d="m5 12 4 4 10-10"/></svg>;
  if (name === 'feedback') return <svg {...props}><path d="M4 5h16v11H8l-4 4z"/><path d="M8 9h8M8 13h5"/></svg>;
  if (name === 'edit') return <svg {...props}><path d="m4 20 4.5-1 10-10-3.5-3.5-10 10zM13.5 6.5 17 10"/></svg>;
  if (name === 'logout') return <svg {...props}><path d="M10 4H5v16h5M14 8l4 4-4 4M18 12H9"/></svg>;
  if (name === 'send') return <svg {...props}><path d="m3 11 18-8-8 18-2-7z"/><path d="m11 14 10-11"/></svg>;
  if (name === 'school') return <svg {...props}><path d="m3 10 9-5 9 5-9 5z"/><path d="M7 13v4c3 2 7 2 10 0v-4M21 10v6"/></svg>;
  if (name === 'save') return <svg {...props}><path d="M5 4h12l2 2v14H5z"/><path d="M8 4v6h8V4M8 20v-6h8v6"/></svg>;
  return <svg {...props}><circle cx="12" cy="12" r="9"/></svg>;
};

const isSubmitted = (assignment: StudentCloudAssignment) => assignment.submission.status === 'SUBMITTED' || assignment.submission.status === 'LATE';
const hasPublishedFeedback = (assignment: StudentCloudAssignment) => Boolean(assignment.submission.feedback?.publishedAt || assignment.submission.feedback);
const isOverdue = (assignment: StudentCloudAssignment) => Date.now() > new Date(assignment.dueAt).getTime() && !isSubmitted(assignment);
const draftKey = (classCode: string, accessCode: string, assignmentId: string) => `dia8_assignment_draft:${classCode}:${accessCode}:${assignmentId}`;

const StudentAssignmentHub: React.FC<StudentAssignmentHubProps> = ({ onClose }) => {
  const [classCode, setClassCode] = useState(() => localStorage.getItem('dia8_student_class_code') || '');
  const [accessCode, setAccessCode] = useState(() => localStorage.getItem('dia8_student_access_code') || '');
  const [studentName, setStudentName] = useState('');
  const [className, setClassName] = useState('');
  const [assignments, setAssignments] = useState<StudentCloudAssignment[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [filter, setFilter] = useState<AssignmentFilter>('ALL');
  const [answerText, setAnswerText] = useState('');
  const [reflection, setReflection] = useState('');
  const [draftSavedAt, setDraftSavedAt] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const dialogRef = useDialogFocus<HTMLDivElement>(onClose);

  const sortedAssignments = useMemo(() => [...assignments].sort((a, b) => {
    const score = (item: StudentCloudAssignment) => hasPublishedFeedback(item) ? 3 : isSubmitted(item) ? 2 : isOverdue(item) ? 0 : 1;
    const diff = score(a) - score(b);
    return diff || new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime();
  }), [assignments]);

  const visibleAssignments = useMemo(() => sortedAssignments.filter(item => {
    if (filter === 'TODO') return !isSubmitted(item);
    if (filter === 'SUBMITTED') return isSubmitted(item);
    if (filter === 'FEEDBACK') return hasPublishedFeedback(item);
    return true;
  }), [sortedAssignments, filter]);

  const active = useMemo(() => assignments.find(item => item.id === activeId) || visibleAssignments[0] || assignments[0] || null, [assignments, visibleAssignments, activeId]);

  const counts = useMemo(() => ({
    all: assignments.length,
    todo: assignments.filter(item => !isSubmitted(item)).length,
    submitted: assignments.filter(isSubmitted).length,
    feedback: assignments.filter(hasPublishedFeedback).length,
  }), [assignments]);

  const completionPercent = counts.all ? Math.round((counts.submitted / counts.all) * 100) : 0;

  useEffect(() => {
    const oldOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    document.documentElement.dataset.assignmentModal = 'open';
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = oldOverflow;
      delete document.documentElement.dataset.assignmentModal;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);

  useEffect(() => {
    if (!active) return;
    setActiveId(active.id);
    const key = draftKey(classCode.trim().toUpperCase(), accessCode.trim().toUpperCase(), active.id);
    const localDraft = localStorage.getItem(key);
    if (localDraft) {
      try {
        const parsed = JSON.parse(localDraft) as { answerText?: string; reflection?: string; savedAt?: string };
        setAnswerText(parsed.answerText ?? active.submission.answerText ?? '');
        setReflection(parsed.reflection ?? active.submission.studentReflection ?? '');
        setDraftSavedAt(parsed.savedAt || '');
        return;
      } catch {
        localStorage.removeItem(key);
      }
    }
    setAnswerText(active.submission.answerText || '');
    setReflection(active.submission.studentReflection || '');
    setDraftSavedAt('');
  }, [active?.id, classCode, accessCode]);

  useEffect(() => {
    if (!active || !studentName) return;
    const timer = window.setTimeout(() => {
      const savedAt = new Date().toISOString();
      localStorage.setItem(draftKey(classCode.trim().toUpperCase(), accessCode.trim().toUpperCase(), active.id), JSON.stringify({ answerText, reflection, savedAt }));
      setDraftSavedAt(savedAt);
    }, 650);
    return () => window.clearTimeout(timer);
  }, [answerText, reflection, active?.id, studentName, classCode, accessCode]);

  useEffect(() => {
    if (activeId && visibleAssignments.some(item => item.id === activeId)) return;
    setActiveId(visibleAssignments[0]?.id || assignments[0]?.id || null);
  }, [filter, visibleAssignments, assignments, activeId]);

  const connect = async () => {
    if (!classCode.trim() || !accessCode.trim()) return setMessage('Hãy nhập mã lớp và mã truy cập cá nhân.');
    setLoading(true); setMessage('');
    try {
      const result = await TeacherCloudService.pullStudentAssignments(classCode.trim(), accessCode.trim());
      const normalizedClass = classCode.trim().toUpperCase();
      const normalizedAccess = accessCode.trim().toUpperCase();
      localStorage.setItem('dia8_student_class_code', normalizedClass);
      localStorage.setItem('dia8_student_access_code', normalizedAccess);
      setClassCode(normalizedClass);
      setAccessCode(normalizedAccess);
      setStudentName(result.student.fullName);
      setClassName(result.classroom.name);
      setAssignments(result.assignments);
      setActiveId(result.assignments[0]?.id || null);
      setFilter('ALL');
      setMessage(`Đã đồng bộ ${result.assignments.length} bài giao.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Không thể kết nối.');
    } finally {
      setLoading(false);
    }
  };

  const submit = async () => {
    if (!active) return;
    if (!answerText.trim() && active.allowTextResponse) return setMessage('Hãy nhập nội dung bài làm trước khi nộp.');
    if (!window.confirm(active.submission.submittedAt ? 'Nộp lại bài và thay thế lần nộp trước?' : 'Xác nhận nộp bài cho giáo viên?')) return;
    setLoading(true); setMessage('');
    try {
      const result = await TeacherCloudService.submitStudentWork(classCode, accessCode, active.id, { answerText, studentReflection: reflection });
      setAssignments(prev => prev.map(item => item.id === active.id ? { ...item, submission: result.submission } : item));
      localStorage.removeItem(draftKey(classCode, accessCode, active.id));
      setDraftSavedAt('');
      setMessage('Đã nộp bài thành công. Giáo viên sẽ nhận được sau lần đồng bộ tiếp theo.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Không thể nộp bài.');
    } finally {
      setLoading(false);
    }
  };

  const disconnect = () => {
    setStudentName(''); setClassName(''); setAssignments([]); setActiveId(null); setMessage('Đã thoát khỏi lớp trên thiết bị này.');
  };

  const modal = (
    <div ref={dialogRef} tabIndex={-1} className="student-assignment-hub" role="dialog" aria-modal="true" aria-label="Trung tâm bài giao của học sinh">
      <div className="student-assignment-backdrop" aria-hidden="true" />
      <div className="student-assignment-shell">
        <header className="student-assignment-header">
          <div className="student-assignment-brand">
            <span className="student-assignment-brand-icon"><Icon name="assignment" size={24} /></span>
            <div className="min-w-0">
              <p>Learning workflow</p>
              <h2>Bài giao của tôi</h2>
              <span>{studentName ? `${studentName} · ${className}` : 'Kết nối lớp học bằng hai mã do giáo viên cấp'}</span>
            </div>
          </div>
          <div className="student-assignment-head-actions">
            {studentName && <button type="button" onClick={connect} disabled={loading} title="Đồng bộ bài mới"><Icon name="refresh" size={18} /><span>Làm mới</span></button>}
            <button type="button" onClick={onClose} className="student-assignment-close" aria-label="Đóng cửa sổ bài giao"><Icon name="close" size={19} /><span>Đóng</span></button>
          </div>
        </header>

        {message && <div className="student-assignment-notice"><span>{message}</span><button type="button" onClick={() => setMessage('')} aria-label="Ẩn thông báo">×</button></div>}

        {!studentName ? (
          <main className="student-assignment-login">
            <section className="student-assignment-login-card">
              <div className="student-assignment-login-icon"><Icon name="school" size={31} /></div>
              <p className="student-assignment-kicker">Bước 1 · Kết nối lớp</p>
              <h3>Nhận bài, nộp bài và xem phản hồi trong một nơi</h3>
              <p>Nhập đúng mã lớp và mã cá nhân. Ứng dụng không yêu cầu mật khẩu Google, mật khẩu mạng xã hội hoặc thông tin thanh toán.</p>
              <div className="student-assignment-login-grid">
                <label><span>Mã lớp</span><input value={classCode} onChange={event => setClassCode(event.target.value.toUpperCase())} maxLength={12} autoComplete="off" placeholder="Ví dụ: 8A1X7K" /></label>
                <label><span>Mã truy cập cá nhân</span><input value={accessCode} onChange={event => setAccessCode(event.target.value.toUpperCase())} maxLength={12} autoComplete="off" placeholder="Ví dụ: A7K29Q" /></label>
              </div>
              <button type="button" onClick={connect} disabled={loading} className="student-assignment-primary"><span>{loading ? 'Đang kết nối…' : 'Mở trung tâm bài giao'}</span></button>
              <div className="student-assignment-login-guide"><span>1. Chọn bài</span><span>2. Đọc yêu cầu</span><span>3. Soạn và nộp</span><span>4. Xem phản hồi</span></div>
            </section>
          </main>
        ) : (
          <main className="student-assignment-workspace">
            <section className="student-assignment-overview">
              <div className="student-assignment-progress-card">
                <div><p>Tiến độ lớp học</p><strong>{completionPercent}%</strong></div>
                <div className="student-assignment-progress-track"><span style={{ width: `${completionPercent}%` }} /></div>
              </div>
              <div className="student-assignment-metrics">
                <button type="button" onClick={() => setFilter('ALL')} className={filter === 'ALL' ? 'is-active' : ''}><Icon name="assignment" size={18}/><span>Tất cả</span><strong>{counts.all}</strong></button>
                <button type="button" onClick={() => setFilter('TODO')} className={filter === 'TODO' ? 'is-active' : ''}><Icon name="clock" size={18}/><span>Cần làm</span><strong>{counts.todo}</strong></button>
                <button type="button" onClick={() => setFilter('SUBMITTED')} className={filter === 'SUBMITTED' ? 'is-active' : ''}><Icon name="check" size={18}/><span>Đã nộp</span><strong>{counts.submitted}</strong></button>
                <button type="button" onClick={() => setFilter('FEEDBACK')} className={filter === 'FEEDBACK' ? 'is-active' : ''}><Icon name="feedback" size={18}/><span>Phản hồi</span><strong>{counts.feedback}</strong></button>
              </div>
            </section>

            <section className="student-assignment-main-grid">
              <aside className="student-assignment-list-panel">
                <div className="student-assignment-list-head"><div><b>Danh sách bài</b><span>{visibleAssignments.length} bài đang hiển thị</span></div><button type="button" onClick={disconnect} title="Đổi mã truy cập"><Icon name="logout" size={17}/></button></div>
                <div className="student-assignment-list no-scrollbar">
                  {visibleAssignments.map(item => {
                    const selected = active?.id === item.id;
                    const overdue = isOverdue(item);
                    return <button type="button" key={item.id} onClick={() => setActiveId(item.id)} className={`student-assignment-list-item ${selected ? 'is-active' : ''}`}>
                      <div className="student-assignment-list-title"><b>{item.title}</b><span className={`status-${item.submission.status.toLowerCase()}`}>{statusLabel[item.submission.status] || item.submission.status}</span></div>
                      <p>Hạn {formatDate(item.dueAt)}</p>
                      <div><span>{item.questionCount} câu</span><span>{item.maxScore} điểm</span>{overdue && <span className="is-overdue">Quá hạn</span>}</div>
                    </button>;
                  })}
                  {!visibleAssignments.length && <div className="student-assignment-empty">Không có bài phù hợp bộ lọc.</div>}
                </div>
              </aside>

              <section className="student-assignment-detail no-scrollbar">
                {!active ? <div className="student-assignment-empty">Chọn một bài để bắt đầu.</div> : <div className="student-assignment-detail-inner">
                  <div className="student-assignment-stepper" aria-label="Quy trình làm bài">
                    <span className="is-done">1<b>Chọn bài</b></span><i/><span className="is-done">2<b>Đọc yêu cầu</b></span><i/><span className={answerText.trim() ? 'is-done' : 'is-current'}>3<b>Soạn bài</b></span><i/><span className={isSubmitted(active) ? 'is-done' : 'is-current'}>4<b>Nộp & phản hồi</b></span>
                  </div>

                  <article className="student-assignment-card assignment-brief-card">
                    <div className="student-assignment-brief-head"><div><p>Nhiệm vụ</p><h3>{active.title}</h3></div><div className="student-assignment-due"><span>Hạn nộp</span><b>{formatDate(active.dueAt)}</b><small>{active.questionCount} câu · {active.maxScore} điểm</small></div></div>
                    <p className="student-assignment-description">{active.description || 'Giáo viên chưa nhập hướng dẫn chi tiết.'}</p>
                    {!!active.rubric?.length && <div className="student-assignment-rubric"><p>Tiêu chí đánh giá</p><div>{active.rubric.map(item => <section key={item.id}><div><b>{item.label}</b>{item.description && <span>{item.description}</span>}</div><strong>{item.maxPoints}đ</strong></section>)}</div></div>}
                  </article>

                  <article className="student-assignment-card assignment-editor-card">
                    <div className="student-assignment-editor-head"><div><p>Bước 3 · Soạn bài</p><h4>Bài làm của em</h4></div><span><Icon name="save" size={15}/>{draftSavedAt ? `Đã tự lưu ${formatDate(draftSavedAt)}` : 'Tự lưu trên thiết bị'}</span></div>
                    <textarea disabled={!active.allowTextResponse} value={answerText} onChange={event => setAnswerText(event.target.value)} placeholder={active.allowTextResponse ? 'Nhập câu trả lời, lập luận, số liệu hoặc kết luận…' : 'Nhiệm vụ này không nhận bài dạng văn bản.'} />
                    <label><span>Tự phản ánh sau khi làm</span><textarea value={reflection} onChange={event => setReflection(event.target.value)} placeholder="Em đã hiểu gì? Phần nào còn chưa chắc?" /></label>
                  </article>

                  {active.submission.feedback && <article className="student-assignment-card assignment-feedback-card">
                    <div className="student-assignment-feedback-head"><div><p>Phản hồi giáo viên</p><h4>Kết quả đã công bố</h4></div>{active.submission.score !== undefined && <div><strong>{active.submission.score}</strong><span>/{active.maxScore}</span></div>}</div>
                    <div className="student-assignment-feedback-grid">
                      {active.submission.feedback.strengths && <section><p>Điểm mạnh</p><span>{active.submission.feedback.strengths}</span></section>}
                      {active.submission.feedback.nextSteps && <section><p>Bước tiếp theo</p><span>{active.submission.feedback.nextSteps}</span></section>}
                      {active.submission.feedback.comment && <section><p>Nhận xét chung</p><span>{active.submission.feedback.comment}</span></section>}
                    </div>
                  </article>}

                  <div className="student-assignment-submit-bar">
                    <div><span>Lần nộp gần nhất</span><b>{active.submission.submittedAt ? formatDate(active.submission.submittedAt) : 'Chưa nộp'}</b></div>
                    <button type="button" onClick={submit} disabled={loading || active.status !== 'ACTIVE'}><Icon name="send" size={18}/><span>{loading ? 'Đang gửi…' : active.submission.submittedAt ? 'Nộp lại bài' : 'Nộp bài'}</span></button>
                  </div>
                </div>}
              </section>
            </section>
          </main>
        )}
      </div>
      <button type="button" onClick={onClose} className="student-assignment-safe-close" aria-label="Đóng bài giao"><Icon name="close" size={20}/></button>
    </div>
  );

  return typeof document === 'undefined' ? null : createPortal(modal, document.body);
};

export default StudentAssignmentHub;

