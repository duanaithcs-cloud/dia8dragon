import crypto from 'node:crypto';

const json = (res, status, body) => {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(body));
};

const config = () => ({
  enabled: String(process.env.DIA8_ENABLE_STUDENT_SYNC || '').toLowerCase() === 'true',
  url: String(process.env.SUPABASE_URL || '').replace(/\/$/, ''),
  serviceKey: String(process.env.SUPABASE_SERVICE_ROLE_KEY || ''),
  workspaceId: String(process.env.DIA8_WORKSPACE_ID || 'dia8dragon-primary'),
  allowedOrigin: String(process.env.DIA8_ALLOWED_ORIGIN || '').trim(),
});

const supabaseFetch = async (cfg, path, options = {}) => {
  const response = await fetch(`${cfg.url}/rest/v1/${path}`, {
    ...options,
    headers: {
      apikey: cfg.serviceKey,
      Authorization: `Bearer ${cfg.serviceKey}`,
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });
  const text = await response.text();
  let payload;
  try { payload = text ? JSON.parse(text) : null; } catch { payload = text; }
  if (!response.ok) throw new Error(`Supabase ${response.status}: ${typeof payload === 'string' ? payload : JSON.stringify(payload)}`);
  return payload;
};

const safeRecords = records => (Array.isArray(records) ? records : [])
  .slice(0, 100)
  .filter(row => row && typeof row.id === 'string' && typeof row.entityType === 'string')
  .map(row => ({
    id: String(row.id).slice(0, 220),
    entityType: String(row.entityType).slice(0, 80),
    entityId: String(row.entityId || '').slice(0, 220),
    payload: row.payload ?? {},
    createdAt: row.createdAt || new Date().toISOString(),
    updatedAt: row.updatedAt || new Date().toISOString(),
  }));

export default async function handler(req, res) {
  if (req.method !== 'POST') return json(res, 405, { ok: false, error: 'Chỉ hỗ trợ POST.' });
  const cfg = config();
  if (!cfg.enabled) return json(res, 503, { ok: false, error: 'Student Hybrid Sync chưa được bật trên Vercel. Dữ liệu vẫn an toàn trong Hàng đợi đồng bộ.' });
  if (!cfg.url || !cfg.serviceKey) return json(res, 503, { ok: false, error: 'Thiếu cấu hình Supabase cho Student Hybrid Sync.' });
  const origin = String(req.headers.origin || '').trim();
  if (cfg.allowedOrigin && origin && origin !== cfg.allowedOrigin) return json(res, 403, { ok: false, error: 'Nguồn gửi dữ liệu không được phép.' });

  const learnerId = String(req.body?.learnerId || '').trim();
  const records = safeRecords(req.body?.records);
  if (!learnerId || learnerId.length > 220) return json(res, 400, { ok: false, error: 'learnerId không hợp lệ.' });
  if (!records.length) return json(res, 200, { ok: true, confirmedIds: [] });

  const learnerHash = crypto.createHash('sha256').update(`${cfg.workspaceId}:${learnerId}`).digest('hex');
  const rows = records.map(record => ({
    id: crypto.createHash('sha256').update(`${learnerHash}:${record.id}`).digest('hex'),
    workspace_id: cfg.workspaceId,
    learner_hash: learnerHash,
    client_record_id: record.id,
    entity_type: record.entityType,
    entity_id: record.entityId,
    payload: record.payload,
    client_created_at: record.createdAt,
    updated_at: new Date().toISOString(),
  }));

  try {
    await supabaseFetch(cfg, 'dia8_learning_sync?on_conflict=id', {
      method: 'POST',
      headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
      body: JSON.stringify(rows),
    });
    return json(res, 200, { ok: true, confirmedIds: records.map(record => record.id) });
  } catch (error) {
    return json(res, 502, { ok: false, error: error instanceof Error ? error.message : 'Không thể đồng bộ dữ liệu học tập.' });
  }
}
