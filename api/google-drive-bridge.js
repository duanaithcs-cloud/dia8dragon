const MAX_BODY_BYTES = 5 * 1024 * 1024;

const isAllowedAppsScriptUrl = (value) => {
  try {
    const url = new URL(value);
    const allowedHost = url.hostname === 'script.google.com' || url.hostname.endsWith('.googleusercontent.com');
    const allowedProtocol = url.protocol === 'https:';
    const allowedPath = url.hostname === 'script.google.com'
      ? /^\/macros\/s\/[A-Za-z0-9_-]+\/(exec|dev)$/.test(url.pathname)
      : true;
    return allowedHost && allowedProtocol && allowedPath;
  } catch {
    return false;
  }
};

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'Chỉ hỗ trợ POST.' });

  const allowedOrigin = String(process.env.DIA8_ALLOWED_ORIGIN || '').trim();
  const requestOrigin = String(req.headers.origin || '').trim();
  if (allowedOrigin && requestOrigin && requestOrigin !== allowedOrigin) {
    return res.status(403).json({ ok: false, error: 'Nguồn gọi Google Drive Bridge không được phép.' });
  }

  const contentLength = Number(req.headers['content-length'] || 0);
  if (contentLength > MAX_BODY_BYTES) return res.status(413).json({ ok: false, error: 'Gói sao lưu vượt quá 5 MB.' });

  const { webAppUrl, syncKey, action, payload } = req.body || {};
  if (!isAllowedAppsScriptUrl(String(webAppUrl || ''))) {
    return res.status(400).json({ ok: false, error: 'URL Apps Script không hợp lệ. Hãy dùng URL triển khai kết thúc bằng /exec.' });
  }
  if (!String(syncKey || '').trim()) return res.status(400).json({ ok: false, error: 'Thiếu mã đồng bộ Google Drive.' });
  if (!String(action || '').trim()) return res.status(400).json({ ok: false, error: 'Thiếu thao tác.' });

  try {
    const upstream = await fetch(webAppUrl, {
      method: 'POST',
      redirect: 'follow',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({
        action,
        syncKey,
        payload: payload || {},
        proxyTimestamp: new Date().toISOString()
      })
    });
    const text = await upstream.text();
    let result;
    try {
      result = JSON.parse(text);
    } catch {
      return res.status(502).json({ ok: false, error: 'Apps Script trả về dữ liệu không phải JSON.', detail: text.slice(0, 300) });
    }
    if (!upstream.ok || !result.ok) return res.status(upstream.ok ? 400 : 502).json({ ok: false, error: result.error || `Apps Script HTTP ${upstream.status}` });
    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).json(result);
  } catch (error) {
    return res.status(502).json({ ok: false, error: error instanceof Error ? error.message : 'Không thể kết nối Apps Script.' });
  }
}
