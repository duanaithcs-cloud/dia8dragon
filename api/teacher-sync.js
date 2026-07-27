const json = (res, status, body) => {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(body));
};

const getConfig = () => ({
  url: (process.env.SUPABASE_URL || '').replace(/\/$/, ''),
  serviceKey: process.env.SUPABASE_SERVICE_ROLE_KEY || '',
  teacherKey: process.env.DIA8_TEACHER_SYNC_KEY || '',
  workspaceId: process.env.DIA8_WORKSPACE_ID || 'dia8dragon-primary'
});

const supabaseFetch = async (config, path, options = {}) => {
  const response = await fetch(`${config.url}/rest/v1/${path}`, {
    ...options,
    headers: {
      apikey: config.serviceKey,
      Authorization: `Bearer ${config.serviceKey}`,
      'Content-Type': 'application/json',
      ...(options.headers || {})
    }
  });
  const text = await response.text();
  let payload = null;
  try { payload = text ? JSON.parse(text) : null; } catch { payload = text; }
  if (!response.ok) {
    const error = new Error(`Supabase ${response.status}: ${typeof payload === 'string' ? payload : JSON.stringify(payload)}`);
    error.status = response.status;
    throw error;
  }
  return payload;
};

const getWorkspace = async (config) => {
  const rows = await supabaseFetch(config, `dia8_workspaces?id=eq.${encodeURIComponent(config.workspaceId)}&select=payload,updated_at&limit=1`);
  return Array.isArray(rows) && rows[0] ? rows[0] : null;
};

const getSubmissionRows = async (config, filters = {}) => {
  const params = new URLSearchParams({ select: 'workspace_id,class_id,assignment_id,student_id,payload,updated_at' });
  params.set('workspace_id', `eq.${config.workspaceId}`);
  Object.entries(filters).forEach(([key, value]) => {
    if (value) params.set(key, `eq.${String(value)}`);
  });
  return supabaseFetch(config, `dia8_submissions?${params.toString()}`);
};

const upsertWorkspace = async (config, workspace) => {
  await supabaseFetch(config, 'dia8_workspaces?on_conflict=id', {
    method: 'POST',
    headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
    body: JSON.stringify([{ id: config.workspaceId, payload: workspace, updated_at: new Date().toISOString() }])
  });
};

const upsertSubmissions = async (config, workspace) => {
  const remoteRows = await getSubmissionRows(config);
  const remoteMap = new Map((remoteRows || []).map(row => [`${row.assignment_id}::${row.student_id}`, row.payload || {}]));
  const rows = [];
  for (const assignment of workspace.assignments || []) {
    for (const local of assignment.submissions || []) {
      const key = `${assignment.id}::${local.studentId}`;
      const remote = remoteMap.get(key) || {};
      const localSubmittedAt = Date.parse(local.submittedAt || '') || 0;
      const remoteSubmittedAt = Date.parse(remote.submittedAt || '') || 0;
      const studentSource = remoteSubmittedAt > localSubmittedAt ? remote : local;
      const merged = {
        ...remote,
        ...local,
        answerText: studentSource.answerText,
        studentReflection: studentSource.studentReflection,
        submittedAt: studentSource.submittedAt,
        attemptCount: Math.max(Number(remote.attemptCount || 0), Number(local.attemptCount || 0)),
        status: studentSource.status || local.status || remote.status,
        progressPercent: studentSource.progressPercent ?? local.progressPercent ?? remote.progressPercent ?? 0
      };
      rows.push({
        workspace_id: config.workspaceId,
        class_id: assignment.classroomId,
        assignment_id: assignment.id,
        student_id: local.studentId,
        payload: merged,
        updated_at: new Date().toISOString()
      });
    }
  }
  if (!rows.length) return;
  await supabaseFetch(config, 'dia8_submissions?on_conflict=workspace_id,assignment_id,student_id', {
    method: 'POST',
    headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
    body: JSON.stringify(rows)
  });
};

const mergeSubmissionRows = (workspace, rows) => {
  if (!workspace || !Array.isArray(workspace.assignments)) return workspace;
  const byKey = new Map((rows || []).map(row => [`${row.assignment_id}::${row.student_id}`, row.payload]));
  return {
    ...workspace,
    assignments: workspace.assignments.map(assignment => ({
      ...assignment,
      submissions: (assignment.submissions || []).map(submission => byKey.get(`${assignment.id}::${submission.studentId}`) || submission)
    }))
  };
};

const normalizeCode = (value) => String(value || '').trim().toUpperCase();

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    return res.end();
  }
  if (req.method === 'GET') {
    return json(res, 200, { ok: true, service: 'Dia8Dragon Teacher Sync', mode: 'Supabase Lite' });
  }
  if (req.method !== 'POST') return json(res, 405, { ok: false, error: 'Method not allowed' });

  const config = getConfig();
  if (!config.url || !config.serviceKey) {
    return json(res, 503, { ok: false, error: 'Backend chưa được cấu hình trên Vercel.' });
  }

  const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
  const action = body.action;

  try {
    if (action === 'teacher_push' || action === 'teacher_pull') {
      if (!config.teacherKey || body.key !== config.teacherKey) {
        return json(res, 401, { ok: false, error: 'Mã đồng bộ giáo viên không đúng.' });
      }
    }

    if (action === 'teacher_push') {
      const workspace = body.workspace;
      if (!workspace || !Array.isArray(workspace.classrooms) || !Array.isArray(workspace.assignments)) {
        return json(res, 400, { ok: false, error: 'Dữ liệu không hợp lệ.' });
      }
      await upsertWorkspace(config, workspace);
      await upsertSubmissions(config, workspace);
      return json(res, 200, { ok: true, updatedAt: new Date().toISOString() });
    }

    if (action === 'teacher_pull') {
      const row = await getWorkspace(config);
      if (!row?.payload) return json(res, 200, { ok: true, workspace: null, updatedAt: null });
      const submissions = await getSubmissionRows(config);
      return json(res, 200, {
        ok: true,
        workspace: mergeSubmissionRows(row.payload, submissions),
        updatedAt: row.updated_at
      });
    }

    if (action === 'student_pull') {
      const row = await getWorkspace(config);
      if (!row?.payload) return json(res, 404, { ok: false, error: 'Chưa có dữ liệu lớp trên đám mây.' });
      const workspace = row.payload;
      const classCode = normalizeCode(body.classCode);
      const accessCode = normalizeCode(body.accessCode);
      const classroom = (workspace.classrooms || []).find(item => normalizeCode(item.joinCode) === classCode);
      if (!classroom) return json(res, 404, { ok: false, error: 'Không tìm thấy lớp.' });
      const student = (classroom.students || []).find(item => normalizeCode(item.accessCode) === accessCode || normalizeCode(item.studentCode) === accessCode);
      if (!student) return json(res, 403, { ok: false, error: 'Mã truy cập học sinh không đúng.' });
      const rows = await getSubmissionRows(config, { class_id: classroom.id, student_id: student.id });
      const submissionMap = new Map((rows || []).map(item => [item.assignment_id, item.payload]));
      const assignments = (workspace.assignments || [])
        .filter(item => item.classroomId === classroom.id && item.status !== 'DRAFT')
        .map(item => {
          const sourceSubmission = submissionMap.get(item.id) || (item.submissions || []).find(s => s.studentId === student.id) || { studentId: student.id, status: 'NOT_STARTED', progressPercent: 0 };
          const feedback = sourceSubmission.feedback?.status === 'PUBLISHED' ? sourceSubmission.feedback : undefined;
          return {
            id: item.id,
            title: item.title,
            description: item.description,
            topicIds: item.topicIds,
            questionCount: item.questionCount,
            maxScore: item.maxScore || 100,
            allowTextResponse: item.allowTextResponse !== false,
            dueAt: item.dueAt,
            status: item.status,
            rubric: item.rubric || [],
            submission: { ...sourceSubmission, feedback }
          };
        });
      return json(res, 200, { ok: true, classroom: { id: classroom.id, name: classroom.name }, student: { id: student.id, fullName: student.fullName }, assignments });
    }

    if (action === 'student_submit') {
      const row = await getWorkspace(config);
      if (!row?.payload) return json(res, 404, { ok: false, error: 'Chưa có dữ liệu lớp trên đám mây.' });
      const workspace = row.payload;
      const classCode = normalizeCode(body.classCode);
      const accessCode = normalizeCode(body.accessCode);
      const classroom = (workspace.classrooms || []).find(item => normalizeCode(item.joinCode) === classCode);
      if (!classroom) return json(res, 404, { ok: false, error: 'Không tìm thấy lớp.' });
      const student = (classroom.students || []).find(item => normalizeCode(item.accessCode) === accessCode || normalizeCode(item.studentCode) === accessCode);
      if (!student) return json(res, 403, { ok: false, error: 'Mã truy cập học sinh không đúng.' });
      const assignment = (workspace.assignments || []).find(item => item.id === body.assignmentId && item.classroomId === classroom.id && item.status === 'ACTIVE');
      if (!assignment) return json(res, 404, { ok: false, error: 'Nhiệm vụ không tồn tại hoặc đã đóng.' });

      const existingRows = await getSubmissionRows(config, { assignment_id: assignment.id, student_id: student.id });
      const fallback = (assignment.submissions || []).find(item => item.studentId === student.id) || { studentId: student.id, status: 'NOT_STARTED', progressPercent: 0 };
      const existing = existingRows?.[0]?.payload || fallback;
      const work = body.work || {};
      const now = new Date().toISOString();
      const submission = {
        ...existing,
        studentId: student.id,
        answerText: String(work.answerText || '').slice(0, 30000),
        studentReflection: String(work.studentReflection || '').slice(0, 5000),
        status: new Date() > new Date(assignment.dueAt) ? 'LATE' : 'SUBMITTED',
        progressPercent: 100,
        attemptCount: Math.max(1, Number(existing.attemptCount || 0) + 1),
        submittedAt: now
      };
      await supabaseFetch(config, 'dia8_submissions?on_conflict=workspace_id,assignment_id,student_id', {
        method: 'POST',
        headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
        body: JSON.stringify([{
          workspace_id: config.workspaceId,
          class_id: classroom.id,
          assignment_id: assignment.id,
          student_id: student.id,
          payload: submission,
          updated_at: now
        }])
      });
      return json(res, 200, { ok: true, submission });
    }

    return json(res, 400, { ok: false, error: 'Action không được hỗ trợ.' });
  } catch (error) {
    console.error(error);
    return json(res, error.status || 500, { ok: false, error: error.message || 'Lỗi máy chủ.' });
  }
}
