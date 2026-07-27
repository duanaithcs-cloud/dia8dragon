import React, { useEffect, useMemo, useState } from 'react';
import {
  Question,
  QuestionIntelligenceRecord,
  QuestionIntelligenceSignal,
  QuestionLifecycleStatus,
  QuestionPatchDraft,
  QuestionReportRecord,
  QuestionVersionRecord,
  Topic,
} from '../types';
import { loadQuestionBankSnapshot } from '../services/questionIntelligenceService';
import {
  approveQuestionPatch,
  getQuestionIntelligenceSnapshot,
  resolveQuestionReport,
  rollbackQuestionPatch,
  rollbackQuestionToBaseline,
  saveQuestionLifecycleDecision,
  submitQuestionReport,
} from '../services/learningEvidenceDb';

interface QuestionPatchCenterProps {
  topics: Topic[];
}

type StatusFilter = 'ALL' | QuestionLifecycleStatus;
type ReportCategory = QuestionReportRecord['category'];

interface QuestionViewModel {
  question: Question;
  record?: QuestionIntelligenceRecord;
  status: QuestionLifecycleStatus;
  riskScore: number;
  signals: QuestionIntelligenceSignal[];
  openReports: QuestionReportRecord[];
  versions: QuestionVersionRecord[];
}

const STATUS_META: Record<QuestionLifecycleStatus, { label: string; className: string; icon: string }> = {
  STABLE: { label: 'Ổn định', className: 'bg-c4-green/10 text-c4-green border-c4-green/25', icon: 'verified' },
  MONITOR: { label: 'Cần theo dõi', className: 'bg-sky-400/10 text-sky-300 border-sky-400/25', icon: 'visibility' },
  SUSPECT: { label: 'Đáng nghi', className: 'bg-amber-400/10 text-amber-300 border-amber-400/25', icon: 'warning' },
  QUARANTINED: { label: 'Tạm cách ly', className: 'bg-rose-500/10 text-rose-300 border-rose-500/25', icon: 'block' },
  PATCHED: { label: 'Đã sửa', className: 'bg-violet-400/10 text-violet-300 border-violet-400/25', icon: 'build_circle' },
  REPLACED: { label: 'Đã thay thế', className: 'bg-gray-400/10 text-gray-300 border-gray-400/25', icon: 'swap_horiz' },
};

const SIGNAL_LABELS: Record<string, string> = {
  MULTIPLE_PLAUSIBLE_ANSWERS: 'Có nhiều đáp án hợp lý',
  ANSWER_EXPLANATION_MISMATCH: 'Đáp án và lời giải không khớp',
  MISSING_UNIT_OR_YEAR: 'Thiếu đơn vị hoặc năm',
  DISTRACTOR_ANOMALY: 'Phương án nhiễu/tỉ lệ sai bất thường',
  HIGH_PERFORMER_ALTERNATIVE: 'Người học thành thạo chọn đáp án khác',
  ERROR_RATE_SPIKE: 'Tỉ lệ sai tăng sau cập nhật',
  TEACHER_REPORTS: 'Giáo viên báo lỗi nhiều lần',
  SOURCE_CONFLICT: 'Nguồn SGK mâu thuẫn hoặc chưa đủ',
};

const mergeSignals = (...groups: QuestionIntelligenceSignal[][]): QuestionIntelligenceSignal[] => {
  const rank = { INFO: 1, WARNING: 2, CRITICAL: 3 } as const;
  const map = new Map<string, QuestionIntelligenceSignal>();
  groups.flat().forEach(signal => {
    const current = map.get(signal.code);
    if (!current || rank[signal.severity] >= rank[current.severity]) map.set(signal.code, signal);
  });
  return Array.from(map.values());
};

const downloadJson = (filename: string, payload: unknown) => {
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
};

const emptyPatch = (question: Question): QuestionPatchDraft => ({
  questionId: question.qid,
  topicId: Number(question.topicId || question.topic_id),
  prompt: question.prompt,
  answerKey: question.answer_key,
  choices: question.choices ? { ...question.choices } : undefined,
  explanation: question.explain,
  sourceEvidence: { ...question.sourceEvidence },
  changeSummary: '',
  targetStatus: 'PATCHED',
});

const QuestionPatchCenter: React.FC<QuestionPatchCenterProps> = ({ topics }) => {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [records, setRecords] = useState<QuestionIntelligenceRecord[]>([]);
  const [reports, setReports] = useState<QuestionReportRecord[]>([]);
  const [versions, setVersions] = useState<QuestionVersionRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL');
  const [topicFilter, setTopicFilter] = useState<number | 'ALL'>('ALL');
  const [selectedId, setSelectedId] = useState('');
  const [teacherNote, setTeacherNote] = useState('');
  const [replacementQuestionId, setReplacementQuestionId] = useState('');
  const [reportCategory, setReportCategory] = useState<ReportCategory>('ANSWER');
  const [reportDetail, setReportDetail] = useState('');
  const [patchDraft, setPatchDraft] = useState<QuestionPatchDraft | null>(null);
  const [saving, setSaving] = useState(false);

  const refresh = async (preserveSelection = true) => {
    setLoading(true);
    try {
      const [bank, local] = await Promise.all([loadQuestionBankSnapshot(topics), getQuestionIntelligenceSnapshot()]);
      setQuestions(bank.questions);
      setRecords(local.records);
      setReports(local.reports);
      setVersions(local.versions);
      if (!preserveSelection || !selectedId) setSelectedId(bank.questions[0]?.qid || '');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Không thể nạp Trung tâm kiểm định.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void refresh(false); }, [topics]);

  const recordMap = useMemo(() => Object.fromEntries(records.map(item => [item.questionId, item])), [records]);
  const reportMap = useMemo(() => reports.reduce<Record<string, QuestionReportRecord[]>>((map, item) => {
    (map[item.questionId] ||= []).push(item);
    return map;
  }, {}), [reports]);
  const versionMap = useMemo(() => versions.reduce<Record<string, QuestionVersionRecord[]>>((map, item) => {
    (map[item.questionId] ||= []).push(item);
    return map;
  }, {}), [versions]);

  const models = useMemo<QuestionViewModel[]>(() => questions.map(question => {
    const record = recordMap[question.qid];
    const staticProfile = question.questionIntelligence;
    return {
      question,
      record,
      status: record?.status || question.status || 'STABLE',
      riskScore: Math.max(record?.riskScore || 0, staticProfile?.riskScore || 0),
      signals: mergeSignals(staticProfile?.signals || [], record?.signals || []),
      openReports: (reportMap[question.qid] || []).filter(item => item.status === 'OPEN'),
      versions: [...(versionMap[question.qid] || [])].sort((a, b) => (b.createdAt || b.lastSeenAt).localeCompare(a.createdAt || a.lastSeenAt)),
    };
  }), [questions, recordMap, reportMap, versionMap]);

  const filtered = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase('vi');
    return models.filter(model => {
      if (statusFilter !== 'ALL' && model.status !== statusFilter) return false;
      if (topicFilter !== 'ALL' && Number(model.question.topicId || model.question.topic_id) !== topicFilter) return false;
      if (!needle) return true;
      return `${model.question.qid} ${model.question.prompt} ${model.question.answer_key}`.toLocaleLowerCase('vi').includes(needle);
    }).sort((a, b) => b.riskScore - a.riskScore || b.openReports.length - a.openReports.length || a.question.qid.localeCompare(b.question.qid));
  }, [models, query, statusFilter, topicFilter]);

  const selected = models.find(model => model.question.qid === selectedId) || filtered[0] || models[0];

  useEffect(() => {
    if (!selected) return;
    setTeacherNote(selected.record?.teacherNote || '');
    setReplacementQuestionId(selected.record?.replacementQuestionId || '');
    setPatchDraft(emptyPatch(selected.question));
  }, [selected?.question.qid, selected?.record?.activeVersionId]);

  const counts = useMemo(() => Object.fromEntries(Object.keys(STATUS_META).map(status => [status, models.filter(item => item.status === status).length])) as Record<QuestionLifecycleStatus, number>, [models]);
  const flaggedCount = models.filter(item => item.signals.length || item.openReports.length).length;

  const decide = async (status: QuestionLifecycleStatus) => {
    if (!selected) return;
    setSaving(true);
    try {
      await saveQuestionLifecycleDecision({
        questionId: selected.question.qid,
        topicId: Number(selected.question.topicId || selected.question.topic_id),
        baselineVersion: selected.question.contentVersion || '1.0.0',
        status,
        teacherNote,
        replacementQuestionId: status === 'REPLACED' ? replacementQuestionId.trim() : undefined,
      });
      setMessage(status === 'QUARANTINED'
        ? 'Đã cách ly câu hỏi. Câu không còn được giao và không tác động hồ sơ năng lực.'
        : `Đã chuyển câu sang trạng thái “${STATUS_META[status].label}”.`);
      await refresh();
    } finally { setSaving(false); }
  };

  const report = async () => {
    if (!selected || !reportDetail.trim()) return setMessage('Hãy ghi rõ nội dung cần kiểm định.');
    setSaving(true);
    try {
      await submitQuestionReport({
        questionId: selected.question.qid,
        topicId: Number(selected.question.topicId || selected.question.topic_id),
        reporterRole: 'TEACHER',
        category: reportCategory,
        detail: reportDetail,
      });
      setReportDetail('');
      setMessage('Đã ghi báo cáo. Hệ thống sẽ tính tín hiệu nhiều báo cáo ở các lượt làm tiếp theo.');
      await refresh();
    } finally { setSaving(false); }
  };

  const approvePatch = async () => {
    if (!selected || !patchDraft) return;
    if (!patchDraft.prompt.trim() || !patchDraft.answerKey.trim() || !patchDraft.changeSummary.trim()) {
      return setMessage('Bản vá cần có câu hỏi, đáp án và mô tả thay đổi.');
    }
    if (patchDraft.choices && !patchDraft.choices[patchDraft.answerKey]) return setMessage('Đáp án đúng chưa tồn tại trong các phương án.');
    setSaving(true);
    try {
      const version = await approveQuestionPatch(patchDraft, selected.question);
      setMessage(`Đã duyệt bản vá ${version.contentVersion}. Bản mới sẽ được dùng ngay khi tạo Quiz tiếp theo.`);
      await refresh();
    } finally { setSaving(false); }
  };

  const rollback = async (versionId: string) => {
    if (!selected) return;
    setSaving(true);
    try {
      const result = await rollbackQuestionPatch(selected.question.qid, versionId);
      setMessage(result ? `Đã khôi phục ${versionId}.` : 'Không tìm thấy phiên bản để khôi phục.');
      await refresh();
    } finally { setSaving(false); }
  };

  const rollbackBaseline = async () => {
    if (!selected) return;
    setSaving(true);
    try {
      const result = await rollbackQuestionToBaseline(selected.question.qid);
      setMessage(result ? `Đã khôi phục bản gốc ${result.baselineVersion}.` : 'Câu chưa có bản vá để khôi phục.');
      await refresh();
    } finally { setSaving(false); }
  };

  const exportPatchPackage = () => downloadJson(`Dia8Dragon-Question-Patches-${new Date().toISOString().slice(0, 10)}.json`, {
    schema: 'dia8dragon-question-patch-package.v1',
    appVersion: '3.3.0.1',
    exportedAt: new Date().toISOString(),
    intelligence: records,
    reports,
    versions: versions.filter(item => item.createdBy === 'TEACHER'),
  });

  if (loading && !questions.length) return <div className="min-h-[360px] flex items-center justify-center text-xs font-black uppercase tracking-widest text-c4-green">Đang kiểm định 93 câu…</div>;
  if (!selected) return <div className="p-10 text-center text-gray-500">Không tìm thấy ngân hàng câu hỏi.</div>;

  const meta = STATUS_META[selected.status];
  const choices = patchDraft?.choices;
  return <div className="question-patch-center space-y-4">
    <section className="rounded-[24px] border border-violet-400/20 bg-gradient-to-br from-violet-500/10 via-white/[.025] to-sky-500/5 p-4 md:p-5">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div><p className="text-[9px] uppercase tracking-[.24em] font-black text-violet-300">Question Intelligence 3.2.3</p><h2 className="mt-1 text-xl md:text-2xl font-black">Trung tâm kiểm định và vá câu hỏi</h2><p className="mt-2 max-w-3xl text-xs md:text-sm leading-relaxed text-gray-400">Cảnh báo tự động chỉ hỗ trợ quyết định. Giáo viên là người duyệt cuối cùng; câu cách ly không trừ năng lực và được thay bằng câu tương đương.</p></div>
        <button onClick={exportPatchPackage} className="min-h-11 px-4 rounded-xl bg-violet-500 text-white text-[9px] font-black uppercase flex items-center justify-center gap-2"><span className="material-symbols-outlined text-base">download</span>Xuất gói bản vá</button>
      </div>
      <div className="mt-4 grid grid-cols-2 md:grid-cols-4 xl:grid-cols-7 gap-2">
        <div className="rounded-xl bg-black/25 border border-white/10 p-3"><p className="text-[8px] uppercase text-gray-500">Tổng câu</p><p className="mt-1 text-xl font-black">{models.length}</p></div>
        <div className="rounded-xl bg-black/25 border border-white/10 p-3"><p className="text-[8px] uppercase text-gray-500">Có tín hiệu</p><p className="mt-1 text-xl font-black text-amber-300">{flaggedCount}</p></div>
        {(Object.keys(STATUS_META) as QuestionLifecycleStatus[]).map(status => <button key={status} onClick={() => setStatusFilter(status)} className={`rounded-xl border p-3 text-left ${STATUS_META[status].className}`}><p className="text-[8px] uppercase font-black">{STATUS_META[status].label}</p><p className="mt-1 text-xl font-black">{counts[status]}</p></button>)}
      </div>
    </section>

    {message && <div className="p-3 rounded-xl bg-primary/10 border border-primary/30 text-xs font-bold flex justify-between gap-3"><span>{message}</span><button onClick={() => setMessage('')} className="size-6 rounded-lg bg-white/5">×</button></div>}

    <section className="grid xl:grid-cols-[390px_1fr] gap-4">
      <aside className="rounded-[22px] border border-white/10 bg-white/[.025] p-3 h-fit xl:sticky xl:top-3">
        <div className="grid grid-cols-2 gap-2"><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Tìm mã hoặc nội dung…" className="col-span-2 min-h-11 rounded-xl bg-black/40 border border-white/10 px-3 text-xs"/><select value={topicFilter} onChange={event => setTopicFilter(event.target.value === 'ALL' ? 'ALL' : Number(event.target.value))} className="min-h-11 rounded-xl bg-black/40 border border-white/10 px-3 text-xs"><option value="ALL">Tất cả chuyên đề</option>{topics.map(topic => <option key={topic.topic_id} value={topic.topic_id}>T{topic.topic_id}: {topic.short_label}</option>)}</select><select value={statusFilter} onChange={event => setStatusFilter(event.target.value as StatusFilter)} className="min-h-11 rounded-xl bg-black/40 border border-white/10 px-3 text-xs"><option value="ALL">Tất cả trạng thái</option>{(Object.keys(STATUS_META) as QuestionLifecycleStatus[]).map(status => <option key={status} value={status}>{STATUS_META[status].label}</option>)}</select></div>
        <div className="mt-3 max-h-[70vh] overflow-auto space-y-2 pr-1">{filtered.map(item => <button key={item.question.qid} onClick={() => setSelectedId(item.question.qid)} className={`w-full text-left rounded-xl border p-3 ${selected.question.qid === item.question.qid ? 'border-violet-400 bg-violet-500/10' : 'border-white/10 bg-black/20 hover:border-white/25'}`}><div className="flex items-start justify-between gap-2"><b className="text-[10px] text-violet-200">{item.question.qid}</b><span className={`px-2 py-1 rounded-full border text-[7px] uppercase font-black ${STATUS_META[item.status].className}`}>{STATUS_META[item.status].label}</span></div><p className="mt-2 text-[11px] leading-relaxed text-gray-300 line-clamp-3">{item.question.prompt}</p><div className="mt-2 flex items-center gap-2 text-[8px] text-gray-500"><span>Rủi ro {item.riskScore}</span><span>•</span><span>{item.record?.attempts || 0} lượt</span><span>•</span><span>{item.signals.length + item.openReports.length} tín hiệu</span></div></button>)}</div>
      </aside>

      <main className="space-y-4 min-w-0">
        <article className="rounded-[24px] border border-white/10 bg-white/[.03] p-4 md:p-5">
          <div className="flex flex-col md:flex-row md:items-start justify-between gap-3"><div><p className="text-[9px] uppercase font-black text-gray-500">{selected.question.qid} · Chuyên đề {selected.question.topicId || selected.question.topic_id} · v{selected.question.contentVersion || '1.0.0'}</p><h3 className="mt-2 text-lg font-black leading-relaxed">{selected.question.prompt}</h3></div><span className={`shrink-0 px-3 py-2 rounded-xl border text-[9px] font-black uppercase flex items-center gap-2 ${meta.className}`}><span className="material-symbols-outlined text-base">{meta.icon}</span>{meta.label}</span></div>
          {selected.question.choices && <div className="mt-4 grid md:grid-cols-2 gap-2">{Object.entries(selected.question.choices).map(([key, value]) => <div key={key} className={`p-3 rounded-xl border ${key === selected.question.answer_key ? 'border-c4-green/30 bg-c4-green/[.06]' : 'border-white/10 bg-black/20'}`}><b className={key === selected.question.answer_key ? 'text-c4-green' : 'text-gray-500'}>{key}.</b> <span className="text-sm">{value}</span></div>)}</div>}
          <div className="mt-4 grid md:grid-cols-3 gap-2"><div className="p-3 rounded-xl bg-black/25 border border-white/10"><p className="text-[8px] uppercase text-gray-500">Đáp án duyệt</p><p className="mt-1 font-black text-c4-green">{selected.question.answer_key}</p></div><div className="p-3 rounded-xl bg-black/25 border border-white/10"><p className="text-[8px] uppercase text-gray-500">Lượt làm / tỉ lệ sai</p><p className="mt-1 font-black">{selected.record?.attempts || 0} / {Math.round((selected.record?.errorRate || 0) * 100)}%</p></div><div className="p-3 rounded-xl bg-black/25 border border-white/10"><p className="text-[8px] uppercase text-gray-500">Điểm rủi ro</p><p className={`mt-1 font-black ${selected.riskScore >= 55 ? 'text-rose-300' : selected.riskScore >= 22 ? 'text-amber-300' : 'text-c4-green'}`}>{selected.riskScore}/100</p></div></div>
          <details className="mt-4 rounded-xl border border-white/10 bg-black/20 p-3"><summary className="cursor-pointer text-[9px] font-black uppercase text-sky-300">Căn cứ và lời giải</summary><p className="mt-3 text-xs leading-relaxed text-gray-300">{selected.question.explain}</p><p className="mt-3 text-[10px] leading-relaxed text-gray-500"><b className="text-gray-300">Nguồn:</b> {selected.question.sourceEvidence?.source || selected.question.source_file || 'Chưa ghi nguồn'}</p><p className="mt-2 text-[10px] leading-relaxed text-gray-500">{selected.question.sourceEvidence?.text || selected.question.evidence_text}</p></details>
        </article>

        <section className="rounded-[24px] border border-white/10 bg-white/[.03] p-4 md:p-5"><div className="flex items-center justify-between"><div><p className="text-[9px] uppercase font-black text-amber-300">Tín hiệu tự động</p><h3 className="mt-1 font-black">Cảnh báo cần giáo viên xem xét</h3></div><span className="text-2xl font-black">{selected.signals.length + selected.openReports.length}</span></div>{selected.signals.length === 0 && selected.openReports.length === 0 ? <div className="mt-4 p-4 rounded-xl border border-c4-green/20 bg-c4-green/[.04] text-xs text-c4-green">Chưa phát hiện tín hiệu bất thường. Câu vẫn được theo dõi bằng dữ liệu làm bài.</div> : <div className="mt-4 grid md:grid-cols-2 gap-3">{selected.signals.map(signal => <div key={signal.code} className={`p-3 rounded-xl border ${signal.severity === 'CRITICAL' ? 'border-rose-500/25 bg-rose-500/[.05]' : 'border-amber-400/20 bg-amber-400/[.04]'}`}><div className="flex items-center justify-between gap-2"><b className="text-[10px]">{SIGNAL_LABELS[signal.code] || signal.label}</b><span className={`text-[7px] uppercase font-black ${signal.severity === 'CRITICAL' ? 'text-rose-300' : 'text-amber-300'}`}>{signal.severity}</span></div><p className="mt-2 text-[10px] leading-relaxed text-gray-400">{signal.detail}</p>{signal.evidence && <p className="mt-2 text-[9px] leading-relaxed text-gray-600">{signal.evidence}</p>}</div>)}{selected.openReports.map(report => <div key={report.id} className="p-3 rounded-xl border border-violet-400/20 bg-violet-400/[.04]"><div className="flex justify-between gap-2"><b className="text-[10px]">Báo cáo {report.category}</b><button onClick={() => void resolveQuestionReport(report.id, 'RESOLVED').then(() => refresh())} className="text-[8px] text-c4-green font-black uppercase">Đã xử lý</button></div><p className="mt-2 text-[10px] leading-relaxed text-gray-400">{report.detail}</p></div>)}</div>}</section>

        <section className="rounded-[24px] border border-white/10 bg-white/[.03] p-4 md:p-5"><p className="text-[9px] uppercase font-black text-sky-300">Quyết định giáo viên</p><div className="mt-3 grid sm:grid-cols-3 xl:grid-cols-6 gap-2">{(Object.keys(STATUS_META) as QuestionLifecycleStatus[]).map(status => <button disabled={saving} key={status} onClick={() => void decide(status)} className={`min-h-11 rounded-xl border px-2 text-[8px] font-black uppercase disabled:opacity-50 ${STATUS_META[status].className}`}>{STATUS_META[status].label}</button>)}</div><textarea value={teacherNote} onChange={event => setTeacherNote(event.target.value)} placeholder="Ghi căn cứ cho quyết định…" className="mt-3 w-full min-h-20 rounded-xl bg-black/35 border border-white/10 p-3 text-xs"/><input value={replacementQuestionId} onChange={event => setReplacementQuestionId(event.target.value)} placeholder="Mã câu thay thế (dùng khi chọn Đã thay thế)" className="mt-2 w-full min-h-11 rounded-xl bg-black/35 border border-white/10 px-3 text-xs"/><p className="mt-3 text-[9px] leading-relaxed text-gray-500">Tạm cách ly: vẫn lưu bằng chứng nhưng không trừ năng lực, không tạo thẻ vá lỗi/gợi ý và không đưa câu vào đề mới.</p></section>

        <section className="rounded-[24px] border border-white/10 bg-white/[.03] p-4 md:p-5"><p className="text-[9px] uppercase font-black text-rose-300">Báo lỗi câu hỏi</p><div className="mt-3 grid md:grid-cols-[190px_1fr_auto] gap-2"><select value={reportCategory} onChange={event => setReportCategory(event.target.value as ReportCategory)} className="min-h-11 rounded-xl bg-black/35 border border-white/10 px-3 text-xs"><option value="ANSWER">Đáp án</option><option value="WORDING">Cách diễn đạt</option><option value="SOURCE">Nguồn SGK</option><option value="UNIT_YEAR">Đơn vị/năm</option><option value="DISTRACTOR">Phương án nhiễu</option><option value="OTHER">Khác</option></select><input value={reportDetail} onChange={event => setReportDetail(event.target.value)} placeholder="Mô tả cụ thể lỗi hoặc điểm cần xác minh…" className="min-h-11 rounded-xl bg-black/35 border border-white/10 px-3 text-xs"/><button disabled={saving} onClick={() => void report()} className="min-h-11 px-4 rounded-xl bg-rose-500 text-white text-[9px] font-black uppercase disabled:opacity-50">Gửi báo cáo</button></div></section>

        {patchDraft && <section className="rounded-[24px] border border-violet-400/20 bg-violet-500/[.035] p-4 md:p-5"><div className="flex items-center justify-between"><div><p className="text-[9px] uppercase font-black text-violet-300">Trình biên tập bản vá</p><h3 className="mt-1 font-black">Tạo phiên bản mới, không ghi đè bản cũ</h3></div><span className="text-[9px] text-gray-500">Hiện tại v{selected.question.contentVersion || '1.0.0'}</span></div><label className="block mt-4 space-y-2"><span className="text-[9px] uppercase font-black text-gray-500">Câu hỏi</span><textarea value={patchDraft.prompt} onChange={event => setPatchDraft({ ...patchDraft, prompt: event.target.value })} className="w-full min-h-24 rounded-xl bg-black/35 border border-white/10 p-3 text-sm"/></label>{choices && <div className="mt-3 grid md:grid-cols-2 gap-2">{Object.entries(choices).map(([key, value]) => <label key={key} className="flex gap-2 items-start p-3 rounded-xl bg-black/25 border border-white/10"><input type="radio" name="patch-answer" checked={patchDraft.answerKey === key} onChange={() => setPatchDraft({ ...patchDraft, answerKey: key })}/><div className="flex-1"><b className="text-xs text-violet-300">{key}</b><textarea value={value} onChange={event => setPatchDraft({ ...patchDraft, choices: { ...choices, [key]: event.target.value } })} className="mt-1 w-full min-h-16 rounded-lg bg-black/30 border border-white/10 p-2 text-xs"/></div></label>)}</div>}<label className="block mt-3 space-y-2"><span className="text-[9px] uppercase font-black text-gray-500">Lời giải khoa học</span><textarea value={patchDraft.explanation} onChange={event => setPatchDraft({ ...patchDraft, explanation: event.target.value })} className="w-full min-h-28 rounded-xl bg-black/35 border border-white/10 p-3 text-xs leading-relaxed"/></label><div className="mt-3 grid md:grid-cols-2 gap-2"><input value={patchDraft.sourceEvidence?.source || ''} onChange={event => setPatchDraft({ ...patchDraft, sourceEvidence: { ...patchDraft.sourceEvidence, source: event.target.value } })} placeholder="Nguồn SGK, bài, trang" className="min-h-11 rounded-xl bg-black/35 border border-white/10 px-3 text-xs"/><input value={patchDraft.changeSummary} onChange={event => setPatchDraft({ ...patchDraft, changeSummary: event.target.value })} placeholder="Mô tả lý do và nội dung sửa" className="min-h-11 rounded-xl bg-black/35 border border-white/10 px-3 text-xs"/></div><textarea value={patchDraft.sourceEvidence?.text || ''} onChange={event => setPatchDraft({ ...patchDraft, sourceEvidence: { ...patchDraft.sourceEvidence, text: event.target.value } })} placeholder="Trích đoạn căn cứ nguồn" className="mt-2 w-full min-h-20 rounded-xl bg-black/35 border border-white/10 p-3 text-xs"/><button disabled={saving} onClick={() => void approvePatch()} className="mt-3 min-h-12 w-full rounded-xl bg-violet-500 text-white text-[10px] font-black uppercase disabled:opacity-50">Duyệt và phát hành bản vá</button></section>}

        <section className="rounded-[24px] border border-white/10 bg-white/[.03] p-4 md:p-5"><p className="text-[9px] uppercase font-black text-c4-green">Lịch sử phiên bản</p><div className="mt-3 space-y-2"><div className="p-3 rounded-xl border border-white/10 bg-black/20 flex items-center justify-between gap-3"><div><b className="text-xs">Bản gốc v{selected.record?.baselineVersion || selected.question.contentVersion || '1.0.0'}</b><p className="text-[9px] text-gray-500 mt-1">Dữ liệu trong ngân hàng 93 câu</p></div><button disabled={saving || !selected.record?.activeVersionId} onClick={() => void rollbackBaseline()} className="min-h-9 px-3 rounded-lg bg-white/10 text-[8px] font-black uppercase disabled:opacity-40">Khôi phục bản gốc</button></div>{selected.versions.filter(item => item.createdBy === 'TEACHER').map(version => <div key={version.id} className={`p-3 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${selected.record?.activeVersionId === version.id ? 'border-violet-400 bg-violet-500/[.06]' : 'border-white/10 bg-black/20'}`}><div><b className="text-xs">v{version.contentVersion} · {STATUS_META[version.status].label}</b><p className="mt-1 text-[9px] text-gray-500">{version.changeSummary || 'Không có ghi chú'} · {version.createdAt ? new Date(version.createdAt).toLocaleString('vi-VN') : '—'}</p></div><button disabled={saving || selected.record?.activeVersionId === version.id} onClick={() => void rollback(version.id)} className="min-h-9 px-3 rounded-lg bg-white/10 text-[8px] font-black uppercase disabled:opacity-40">Khôi phục bản này</button></div>)}{!selected.versions.some(item => item.createdBy === 'TEACHER') && <p className="text-[10px] text-gray-600">Chưa có bản vá do giáo viên phát hành.</p>}</div></section>
      </main>
    </section>
  </div>;
};

export default QuestionPatchCenter;
