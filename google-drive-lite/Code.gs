/**
 * Dia8Dragon Google Drive Lite 2.1
 * Mỗi giáo viên sở hữu một thư mục Drive, một Google Sheet thống kê,
 * một Google Form nộp bài dự phòng và các file sao lưu JSON nén.
 */

const DIA8 = Object.freeze({
  VERSION: '2.1.0',
  FOLDER_NAME: 'Dia8Dragon - Du lieu day hoc',
  SPREADSHEET_NAME: 'Dia8Dragon - Bang dieu khien giao vien',
  FORM_NAME: 'Dia8Dragon - Nop bai du phong',
  BACKUP_PREFIX: 'Dia8Dragon-Backup-',
  MAX_BACKUPS: 30,
  SHEETS: {
    GUIDE: 'HUONG_DAN',
    DASHBOARD: 'THONG_KE',
    CLASSROOMS: 'LOP_HOC',
    STUDENTS: 'HOC_SINH',
    ASSIGNMENTS: 'NHIEM_VU',
    SUBMISSIONS: 'BAI_LAM',
    FEEDBACK: 'PHAN_HOI',
    AUDIT: 'NHAT_KY'
  },
  FORM_FIELDS: {
    CLASS: 'Mã lớp',
    STUDENT_CODE: 'Mã học sinh / mã truy cập',
    ASSIGNMENT: 'Mã nhiệm vụ',
    STUDENT_NAME: 'Họ và tên',
    ANSWER: 'Nội dung bài làm',
    REFLECTION: 'Tự phản ánh',
    NOTE: 'Ghi chú'
  }
});

function setupDia8Dragon() {
  const props = PropertiesService.getScriptProperties();
  const existingSpreadsheetId = props.getProperty('SPREADSHEET_ID');
  if (existingSpreadsheetId) {
    const info = getSetupInfo_();
    console.log(JSON.stringify(info, null, 2));
    return info;
  }

  const folder = DriveApp.createFolder(DIA8.FOLDER_NAME);
  const spreadsheet = SpreadsheetApp.create(DIA8.SPREADSHEET_NAME);
  moveFileToFolder_(spreadsheet.getId(), folder);
  initializeSpreadsheet_(spreadsheet);

  const form = FormApp.create(DIA8.FORM_NAME, true);
  form
    .setDescription('Kênh nộp bài dự phòng khi Dia8Dragon hoặc đường truyền gặp sự cố. Hãy nhập đúng mã lớp, mã học sinh và mã nhiệm vụ do giáo viên cung cấp.')
    .setConfirmationMessage('Bài làm đã được lưu vào Google Drive của giáo viên. Em có thể chụp lại màn hình xác nhận này.')
    .setCollectEmail(false)
    .setLimitOneResponsePerUser(false)
    .setShowLinkToRespondAgain(true)
    .setProgressBar(true);

  form.addListItem().setTitle(DIA8.FORM_FIELDS.CLASS).setRequired(true).setChoiceValues(['Chưa có lớp — giáo viên cần sao lưu từ Dia8Dragon']);
  form.addTextItem().setTitle(DIA8.FORM_FIELDS.STUDENT_CODE).setRequired(true);
  form.addListItem().setTitle(DIA8.FORM_FIELDS.ASSIGNMENT).setRequired(true).setChoiceValues(['Chưa có nhiệm vụ — giáo viên cần sao lưu từ Dia8Dragon']);
  form.addTextItem().setTitle(DIA8.FORM_FIELDS.STUDENT_NAME).setRequired(true);
  form.addParagraphTextItem().setTitle(DIA8.FORM_FIELDS.ANSWER).setRequired(true);
  form.addParagraphTextItem().setTitle(DIA8.FORM_FIELDS.REFLECTION).setRequired(false);
  form.addParagraphTextItem().setTitle(DIA8.FORM_FIELDS.NOTE).setRequired(false);
  form.setDestination(FormApp.DestinationType.SPREADSHEET, spreadsheet.getId());
  moveFileToFolder_(form.getId(), folder);

  const syncKey = createRandomKey_();
  props.setProperties({
    FOLDER_ID: folder.getId(),
    SPREADSHEET_ID: spreadsheet.getId(),
    FORM_ID: form.getId(),
    SYNC_KEY_HASH: hashSecret_(syncKey),
    CREATED_AT: new Date().toISOString(),
    LAST_BACKUP_AT: ''
  });

  writeGuide_(spreadsheet, syncKey, form, folder);
  appendAudit_('SETUP', 'Khởi tạo Google Drive Lite', { version: DIA8.VERSION });

  const info = getSetupInfo_();
  info.syncKey = syncKey;
  console.log(JSON.stringify(info, null, 2));
  return info;
}

function rotateSyncKey() {
  ensureSetup_();
  const syncKey = createRandomKey_();
  PropertiesService.getScriptProperties().setProperty('SYNC_KEY_HASH', hashSecret_(syncKey));
  const spreadsheet = getSpreadsheet_();
  writeGuide_(spreadsheet, syncKey, getForm_(), getFolder_());
  appendAudit_('ROTATE_KEY', 'Đã đổi mã đồng bộ', {});
  console.log('MÃ ĐỒNG BỘ MỚI: ' + syncKey);
  return syncKey;
}

function showSetupInfo() {
  const info = getSetupInfo_();
  console.log(JSON.stringify(info, null, 2));
  return info;
}

function doGet() {
  try {
    ensureSetup_();
    const html = [
      '<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">',
      '<title>Dia8Dragon Google Drive Lite</title>',
      '<style>body{font-family:Arial,sans-serif;background:#071018;color:#eef;padding:32px;line-height:1.6}main{max-width:720px;margin:auto;background:#101b29;padding:28px;border-radius:24px;border:1px solid #29405e}code{background:#06101a;padding:3px 7px;border-radius:7px}</style></head><body><main>',
      '<h1>Dia8Dragon Google Drive Lite</h1>',
      '<p>Trạng thái: <b>Đã sẵn sàng</b></p>',
      '<p>Phiên bản: <code>' + escapeHtml_(DIA8.VERSION) + '</code></p>',
      '<p>Các liên kết Drive, Sheets và Form chỉ được trả về cho Dia8Dragon sau khi xác minh mã đồng bộ.</p>',
      '<p>Giáo viên xem thông tin thiết lập trong trang <b>HUONG_DAN</b> của bảng tính đã tạo.</p>',
      '</main></body></html>'
    ].join('');
    return HtmlService.createHtmlOutput(html).setTitle('Dia8Dragon Google Drive Lite');
  } catch (error) {
    return HtmlService.createHtmlOutput('<h2>Chưa thiết lập Dia8Dragon Google Drive Lite</h2><p>Hãy chạy hàm <code>setupDia8Dragon()</code> trong Apps Script trước.</p>');
  }
}

function doPost(e) {
  const startedAt = Date.now();
  try {
    ensureSetup_();
    const body = parseJsonBody_(e);
    validateSyncKey_(body.syncKey);
    const action = String(body.action || '').trim();
    const payload = body.payload || {};

    if (action === 'ping') return json_({ ok: true, ...getSetupInfo_(), stats: computeStatsFromSheets_() });
    if (action === 'backup_workspace') return withScriptLock_(function () { return backupWorkspace_(payload); });
    if (action === 'restore_latest') return withScriptLock_(function () { return restoreLatest_(); });
    if (action === 'pull_form_responses') return pullFormResponses_(payload);
    throw new Error('Thao tác không được hỗ trợ: ' + action);
  } catch (error) {
    appendAuditSafe_('ERROR', error && error.message ? error.message : String(error), { durationMs: Date.now() - startedAt });
    return json_({ ok: false, error: error && error.message ? error.message : String(error) });
  }
}

function backupWorkspace_(payload) {
  const workspace = payload && payload.workspace;
  if (!workspace || !Array.isArray(workspace.classrooms) || !Array.isArray(workspace.assignments)) {
    throw new Error('Dữ liệu workspace không hợp lệ.');
  }

  const now = new Date();
  const backupId = Utilities.getUuid();
  const snapshot = {
    schemaVersion: 1,
    appVersion: String(payload.appVersion || ''),
    backupId: backupId,
    createdAt: now.toISOString(),
    workspace: workspace
  };
  const json = JSON.stringify(snapshot);
  if (json.length > 4_500_000) throw new Error('Bản sao lưu vượt quá giới hạn an toàn 4,5 MB. Hãy xuất dữ liệu theo từng năm học.');

  const fileName = DIA8.BACKUP_PREFIX + Utilities.formatDate(now, Session.getScriptTimeZone(), 'yyyyMMdd-HHmmss') + '-' + backupId.slice(0, 8) + '.json.gz';
  const blob = Utilities.gzip(Utilities.newBlob(json, 'application/json', fileName.replace(/\.gz$/, ''))).setName(fileName);
  getFolder_().createFile(blob);

  writeWorkspaceTables_(workspace);
  updateFormChoices_(workspace);
  trimBackups_();
  PropertiesService.getScriptProperties().setProperty('LAST_BACKUP_AT', now.toISOString());
  appendAudit_('BACKUP', 'Sao lưu workspace thành công', {
    backupId: backupId,
    fileName: fileName,
    bytes: blob.getBytes().length,
    classrooms: workspace.classrooms.length,
    assignments: workspace.assignments.length
  });

  return json_({
    ok: true,
    backupId: backupId,
    fileName: fileName,
    lastBackupAt: now.toISOString(),
    ...getSetupInfo_(),
    stats: computeWorkspaceStats_(workspace)
  });
}

function restoreLatest_() {
  const files = listBackupFiles_();
  if (!files.length) throw new Error('Chưa có bản sao lưu Google Drive.');
  const file = files[0];
  const json = Utilities.ungzip(file.getBlob()).getDataAsString('UTF-8');
  const snapshot = JSON.parse(json);
  if (!snapshot.workspace) throw new Error('Bản sao lưu không chứa workspace.');
  appendAudit_('RESTORE', 'Đã tải bản sao lưu gần nhất về ứng dụng', { backupId: snapshot.backupId, fileName: file.getName() });
  return json_({ ok: true, workspace: snapshot.workspace, backupId: snapshot.backupId || file.getId(), createdAt: snapshot.createdAt || file.getDateCreated().toISOString() });
}

function pullFormResponses_(payload) {
  const form = getForm_();
  const sinceRaw = String(payload && payload.since || '').trim();
  const since = sinceRaw ? new Date(sinceRaw) : new Date(0);
  const responses = form.getResponses(since).map(function (response) {
    const values = {};
    response.getItemResponses().forEach(function (itemResponse) {
      values[itemResponse.getItem().getTitle()] = itemResponse.getResponse();
    });
    return {
      responseId: response.getId() || Utilities.getUuid(),
      timestamp: response.getTimestamp().toISOString(),
      classCode: parseChoiceCode_(values[DIA8.FORM_FIELDS.CLASS]),
      studentCode: cleanString_(values[DIA8.FORM_FIELDS.STUDENT_CODE]),
      assignmentId: parseChoiceCode_(values[DIA8.FORM_FIELDS.ASSIGNMENT]),
      studentName: cleanString_(values[DIA8.FORM_FIELDS.STUDENT_NAME]),
      answerText: cleanString_(values[DIA8.FORM_FIELDS.ANSWER]),
      studentReflection: cleanString_(values[DIA8.FORM_FIELDS.REFLECTION]),
      note: cleanString_(values[DIA8.FORM_FIELDS.NOTE])
    };
  });
  appendAudit_('FORM_PULL', 'Đã đọc bài nộp dự phòng từ Google Form', { count: responses.length, since: since.toISOString() });
  return json_({ ok: true, responses: responses, formUrl: form.getPublishedUrl() });
}

function initializeSpreadsheet_(spreadsheet) {
  const first = spreadsheet.getSheets()[0];
  first.setName(DIA8.SHEETS.GUIDE);
  const definitions = [
    [DIA8.SHEETS.DASHBOARD, ['CHỈ SỐ', 'GIÁ TRỊ', 'CẬP NHẬT']],
    [DIA8.SHEETS.CLASSROOMS, ['ID LỚP', 'TÊN LỚP', 'NĂM HỌC', 'MÔN', 'MÃ LỚP', 'NGÀY TẠO', 'SỐ HỌC SINH']],
    [DIA8.SHEETS.STUDENTS, ['ID LỚP', 'TÊN LỚP', 'ID HỌC SINH', 'HỌ TÊN', 'MÃ HỌC SINH', 'MÃ TRUY CẬP', 'NGÀY THAM GIA', 'GHI CHÚ']],
    [DIA8.SHEETS.ASSIGNMENTS, ['ID NHIỆM VỤ', 'ID LỚP', 'TÊN LỚP', 'TIÊU ĐỀ', 'MÔ TẢ', 'CHUYÊN ĐỀ', 'SỐ CÂU', 'ĐIỂM TỐI ĐA', 'HẠN NỘP', 'TRẠNG THÁI', 'NGÀY TẠO', 'SỐ BÀI']],
    [DIA8.SHEETS.SUBMISSIONS, ['ID NHIỆM VỤ', 'ID LỚP', 'ID HỌC SINH', 'HỌ TÊN', 'TRẠNG THÁI', 'TIẾN ĐỘ', 'ĐIỂM', 'NGÀY NỘP', 'NỘI DUNG', 'TỰ PHẢN ÁNH', 'ĐỘ CHÍNH XÁC', 'THỜI GIAN GIÂY', 'SỐ LẦN', 'NGÀY CHẤM']],
    [DIA8.SHEETS.FEEDBACK, ['ID NHIỆM VỤ', 'ID HỌC SINH', 'TRẠNG THÁI', 'ĐIỂM MẠNH', 'BƯỚC TIẾP THEO', 'NHẬN XÉT', 'RUBRIC JSON', 'CẬP NHẬT', 'CÔNG BỐ']],
    [DIA8.SHEETS.AUDIT, ['THỜI GIAN', 'SỰ KIỆN', 'MÔ TẢ', 'CHI TIẾT JSON']]
  ];
  definitions.forEach(function (definition) {
    const sheet = spreadsheet.insertSheet(definition[0]);
    sheet.getRange(1, 1, 1, definition[1].length).setValues([definition[1]]);
    styleHeader_(sheet, definition[1].length);
    sheet.setFrozenRows(1);
  });
}

function writeGuide_(spreadsheet, syncKey, form, folder) {
  const sheet = getOrCreateSheet_(spreadsheet, DIA8.SHEETS.GUIDE);
  sheet.clear();
  const rows = [
    ['DIA8DRAGON GOOGLE DRIVE LITE', '2.1'],
    ['Mã đồng bộ bí mật', syncKey],
    ['URL Google Form', form.getPublishedUrl()],
    ['URL thống kê Form', form.getSummaryUrl()],
    ['URL bảng tính', spreadsheet.getUrl()],
    ['URL thư mục sao lưu', folder.getUrl()],
    ['Hướng dẫn', 'Sau khi Deploy Apps Script dưới dạng Web app, copy URL /exec và mã đồng bộ vào Dia8Dragon → Giáo viên → Đồng bộ.'],
    ['Bảo mật', 'Không gửi mã đồng bộ cho học sinh. Học sinh chỉ dùng Google Form công khai khi cần nộp bài dự phòng.'],
    ['Khuyến nghị', 'Bật xác minh 2 bước cho Tài khoản Google và định kỳ tải thêm bản Excel/JSON về máy.']
  ];
  sheet.getRange(1, 1, rows.length, 2).setValues(rows);
  sheet.getRange('A1:B1').merge().setValue('DIA8DRAGON GOOGLE DRIVE LITE 2.1').setFontSize(18).setFontWeight('bold').setBackground('#0b57d0').setFontColor('#ffffff');
  sheet.setColumnWidth(1, 210);
  sheet.setColumnWidth(2, 760);
  sheet.getRange(2, 1, rows.length - 1, 1).setFontWeight('bold').setBackground('#e8f0fe');
  sheet.getRange(2, 2, rows.length - 1, 1).setWrap(true);
  sheet.setFrozenRows(1);
}

function writeWorkspaceTables_(workspace) {
  const spreadsheet = getSpreadsheet_();
  const classroomById = {};
  const studentById = {};
  (workspace.classrooms || []).forEach(function (classroom) {
    classroomById[classroom.id] = classroom;
    (classroom.students || []).forEach(function (student) { studentById[student.id] = student; });
  });

  const classroomRows = (workspace.classrooms || []).map(function (classroom) {
    return [classroom.id, classroom.name, classroom.schoolYear, classroom.subject, classroom.joinCode || '', classroom.createdAt || '', (classroom.students || []).length];
  });
  const studentRows = [];
  (workspace.classrooms || []).forEach(function (classroom) {
    (classroom.students || []).forEach(function (student) {
      studentRows.push([classroom.id, classroom.name, student.id, student.fullName, student.studentCode || '', student.accessCode || '', student.joinedAt || '', student.note || '']);
    });
  });
  const assignmentRows = [];
  const submissionRows = [];
  const feedbackRows = [];
  (workspace.assignments || []).forEach(function (assignment) {
    const classroom = classroomById[assignment.classroomId] || {};
    assignmentRows.push([
      assignment.id, assignment.classroomId, classroom.name || '', assignment.title, assignment.description || '',
      (assignment.topicIds || []).join(', '), assignment.questionCount || '', assignment.maxScore || 10,
      assignment.dueAt || '', assignment.status || '', assignment.createdAt || '', (assignment.submissions || []).length
    ]);
    (assignment.submissions || []).forEach(function (submission) {
      const student = studentById[submission.studentId] || {};
      submissionRows.push([
        assignment.id, assignment.classroomId, submission.studentId, student.fullName || '', submission.status || '',
        submission.progressPercent || 0, submission.score === undefined ? '' : submission.score, submission.submittedAt || '',
        submission.answerText || '', submission.studentReflection || '', submission.accuracyPercent === undefined ? '' : submission.accuracyPercent,
        submission.durationSeconds === undefined ? '' : submission.durationSeconds, submission.attemptCount || 0, submission.reviewedAt || ''
      ]);
      if (submission.feedback) {
        feedbackRows.push([
          assignment.id, submission.studentId, submission.feedback.status || '', submission.feedback.strengths || '',
          submission.feedback.nextSteps || '', submission.feedback.comment || '', JSON.stringify(submission.feedback.rubricScores || {}),
          submission.feedback.updatedAt || '', submission.feedback.publishedAt || ''
        ]);
      }
    });
  });

  replaceData_(spreadsheet.getSheetByName(DIA8.SHEETS.CLASSROOMS), classroomRows);
  replaceData_(spreadsheet.getSheetByName(DIA8.SHEETS.STUDENTS), studentRows);
  replaceData_(spreadsheet.getSheetByName(DIA8.SHEETS.ASSIGNMENTS), assignmentRows);
  replaceData_(spreadsheet.getSheetByName(DIA8.SHEETS.SUBMISSIONS), submissionRows);
  replaceData_(spreadsheet.getSheetByName(DIA8.SHEETS.FEEDBACK), feedbackRows);
  writeDashboard_(workspace);
}

function writeDashboard_(workspace) {
  const sheet = getSpreadsheet_().getSheetByName(DIA8.SHEETS.DASHBOARD);
  const stats = computeWorkspaceStats_(workspace);
  const now = new Date().toISOString();
  const rows = [
    ['Số lớp', stats.classrooms, now],
    ['Số học sinh', stats.students, now],
    ['Số nhiệm vụ', stats.assignments, now],
    ['Bài đã nộp', stats.submissions, now],
    ['Bài đã phản hồi', stats.reviewed, now],
    ['Tỷ lệ hoàn thành', stats.completionRate / 100, now],
    ['Điểm trung bình', stats.averageScore, now],
    ['Học sinh cần hỗ trợ', stats.atRiskStudents, now]
  ];
  replaceData_(sheet, rows);
  sheet.getRange(2, 2, Math.max(1, rows.length), 1).setNumberFormat('0.00');
  sheet.getRange(7, 2).setNumberFormat('0.0%');
  sheet.setColumnWidth(1, 240);
  sheet.setColumnWidth(2, 150);
  sheet.setColumnWidth(3, 210);
  sheet.getRange(2, 1, rows.length, 3).applyRowBanding(SpreadsheetApp.BandingTheme.BLUE);
}

function updateFormChoices_(workspace) {
  const form = getForm_();
  const classChoices = (workspace.classrooms || []).map(function (classroom) {
    return String(classroom.joinCode || classroom.id) + ' | ' + String(classroom.name || 'Lớp');
  });
  const classroomById = {};
  (workspace.classrooms || []).forEach(function (classroom) { classroomById[classroom.id] = classroom; });
  const assignmentChoices = (workspace.assignments || []).filter(function (assignment) { return assignment.status !== 'CLOSED'; }).map(function (assignment) {
    const classroom = classroomById[assignment.classroomId] || {};
    return String(assignment.id) + ' | ' + String(classroom.name || '') + ' | ' + String(assignment.title || 'Nhiệm vụ');
  });
  setListChoices_(form, DIA8.FORM_FIELDS.CLASS, classChoices.length ? classChoices : ['Chưa có lớp — giáo viên cần sao lưu từ Dia8Dragon']);
  setListChoices_(form, DIA8.FORM_FIELDS.ASSIGNMENT, assignmentChoices.length ? assignmentChoices : ['Chưa có nhiệm vụ — giáo viên cần sao lưu từ Dia8Dragon']);
}

function setListChoices_(form, title, choices) {
  const item = form.getItems(FormApp.ItemType.LIST).map(function (entry) { return entry.asListItem(); }).find(function (entry) { return entry.getTitle() === title; });
  if (item) item.setChoiceValues(choices.slice(0, 200));
}

function computeWorkspaceStats_(workspace) {
  const classrooms = workspace.classrooms || [];
  const assignments = workspace.assignments || [];
  const students = classrooms.reduce(function (sum, classroom) { return sum + (classroom.students || []).length; }, 0);
  let expected = 0;
  let submissions = 0;
  let reviewed = 0;
  let scoreSum = 0;
  let scoreCount = 0;
  const studentMetrics = {};

  assignments.forEach(function (assignment) {
    (assignment.submissions || []).forEach(function (submission) {
      expected += 1;
      if (!studentMetrics[submission.studentId]) studentMetrics[submission.studentId] = { expected: 0, completed: 0, scores: [] };
      studentMetrics[submission.studentId].expected += 1;
      if (submission.status === 'SUBMITTED' || submission.status === 'LATE') {
        submissions += 1;
        studentMetrics[submission.studentId].completed += 1;
      }
      if (submission.feedback && submission.feedback.status === 'PUBLISHED') reviewed += 1;
      if (submission.score !== undefined && submission.score !== null && submission.score !== '') {
        scoreSum += Number(submission.score) || 0;
        scoreCount += 1;
        studentMetrics[submission.studentId].scores.push(Number(submission.score) || 0);
      }
    });
  });

  const atRiskStudents = Object.keys(studentMetrics).filter(function (studentId) {
    const metric = studentMetrics[studentId];
    const completion = metric.expected ? metric.completed * 100 / metric.expected : 0;
    const average = metric.scores.length ? metric.scores.reduce(function (a, b) { return a + b; }, 0) / metric.scores.length : 0;
    return metric.expected > 0 && (completion < 60 || (metric.scores.length > 0 && average < 5));
  }).length;

  return {
    classrooms: classrooms.length,
    students: students,
    assignments: assignments.length,
    submissions: submissions,
    reviewed: reviewed,
    completionRate: expected ? Math.round(submissions * 10000 / expected) / 100 : 0,
    averageScore: scoreCount ? Math.round(scoreSum * 100 / scoreCount) / 100 : 0,
    atRiskStudents: atRiskStudents
  };
}

function computeStatsFromSheets_() {
  const spreadsheet = getSpreadsheet_();
  return {
    classrooms: dataRowCount_(spreadsheet.getSheetByName(DIA8.SHEETS.CLASSROOMS)),
    students: dataRowCount_(spreadsheet.getSheetByName(DIA8.SHEETS.STUDENTS)),
    assignments: dataRowCount_(spreadsheet.getSheetByName(DIA8.SHEETS.ASSIGNMENTS)),
    submissions: dataRowCount_(spreadsheet.getSheetByName(DIA8.SHEETS.SUBMISSIONS)),
    reviewed: dataRowCount_(spreadsheet.getSheetByName(DIA8.SHEETS.FEEDBACK))
  };
}

function replaceData_(sheet, rows) {
  if (!sheet) throw new Error('Thiếu trang tính cần thiết. Hãy chạy lại setupDia8Dragon().');
  const lastRow = sheet.getLastRow();
  const lastColumn = sheet.getLastColumn();
  if (lastRow > 1 && lastColumn > 0) sheet.getRange(2, 1, lastRow - 1, lastColumn).clearContent();
  if (!rows.length) return;
  const safeRows = rows.map(function (row) { return row.map(safeCell_); });
  sheet.getRange(2, 1, safeRows.length, safeRows[0].length).setValues(safeRows);
  sheet.getRange(2, 1, safeRows.length, safeRows[0].length).setWrapStrategy(SpreadsheetApp.WrapStrategy.CLIP);
}

function appendAudit_(eventName, description, detail) {
  const sheet = getSpreadsheet_().getSheetByName(DIA8.SHEETS.AUDIT);
  sheet.appendRow([new Date().toISOString(), safeCell_(eventName), safeCell_(description), safeCell_(JSON.stringify(detail || {}))]);
}

function appendAuditSafe_(eventName, description, detail) {
  try { appendAudit_(eventName, description, detail); } catch (_) {}
}

function trimBackups_() {
  const files = listBackupFiles_();
  files.slice(DIA8.MAX_BACKUPS).forEach(function (file) { file.setTrashed(true); });
}

function listBackupFiles_() {
  const iterator = getFolder_().getFiles();
  const files = [];
  while (iterator.hasNext()) {
    const file = iterator.next();
    if (file.getName().indexOf(DIA8.BACKUP_PREFIX) === 0 && /\.json\.gz$/.test(file.getName())) files.push(file);
  }
  files.sort(function (a, b) { return b.getDateCreated().getTime() - a.getDateCreated().getTime(); });
  return files;
}

function getSetupInfo_() {
  ensureSetup_();
  const form = getForm_();
  const props = PropertiesService.getScriptProperties();
  return {
    version: DIA8.VERSION,
    spreadsheetUrl: getSpreadsheet_().getUrl(),
    formUrl: form.getPublishedUrl(),
    formSummaryUrl: form.getSummaryUrl(),
    folderUrl: getFolder_().getUrl(),
    lastBackupAt: props.getProperty('LAST_BACKUP_AT') || '',
    backupCount: listBackupFiles_().length
  };
}

function ensureSetup_() {
  const props = PropertiesService.getScriptProperties();
  if (!props.getProperty('SPREADSHEET_ID') || !props.getProperty('FORM_ID') || !props.getProperty('FOLDER_ID') || !props.getProperty('SYNC_KEY_HASH')) {
    throw new Error('Google Drive Lite chưa được thiết lập. Hãy chạy setupDia8Dragon() trong Apps Script.');
  }
}

function getSpreadsheet_() {
  return SpreadsheetApp.openById(PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID'));
}

function getForm_() {
  return FormApp.openById(PropertiesService.getScriptProperties().getProperty('FORM_ID'));
}

function getFolder_() {
  return DriveApp.getFolderById(PropertiesService.getScriptProperties().getProperty('FOLDER_ID'));
}

function moveFileToFolder_(fileId, folder) {
  DriveApp.getFileById(fileId).moveTo(folder);
}

function getOrCreateSheet_(spreadsheet, name) {
  return spreadsheet.getSheetByName(name) || spreadsheet.insertSheet(name);
}

function styleHeader_(sheet, width) {
  sheet.getRange(1, 1, 1, width).setBackground('#0b57d0').setFontColor('#ffffff').setFontWeight('bold').setWrap(true);
}

function withScriptLock_(callback) {
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try { return callback(); } finally { lock.releaseLock(); }
}

function validateSyncKey_(syncKey) {
  const candidate = String(syncKey || '').trim();
  if (candidate.length < 16) throw new Error('Mã đồng bộ không hợp lệ.');
  const expected = PropertiesService.getScriptProperties().getProperty('SYNC_KEY_HASH');
  if (hashSecret_(candidate) !== expected) throw new Error('Sai mã đồng bộ Google Drive.');
}

function hashSecret_(value) {
  const digest = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, String(value), Utilities.Charset.UTF_8);
  return Utilities.base64EncodeWebSafe(digest).replace(/=+$/g, '');
}

function createRandomKey_() {
  return ['DIA8', Utilities.getUuid().replace(/-/g, '').slice(0, 12).toUpperCase(), Utilities.getUuid().replace(/-/g, '').slice(0, 12).toUpperCase()].join('-');
}

function parseJsonBody_(e) {
  if (!e || !e.postData || !e.postData.contents) throw new Error('Yêu cầu không có dữ liệu.');
  try { return JSON.parse(e.postData.contents); } catch (_) { throw new Error('JSON không hợp lệ.'); }
}

function json_(value) {
  return ContentService.createTextOutput(JSON.stringify(value)).setMimeType(ContentService.MimeType.JSON);
}

function safeCell_(value) {
  if (value === null || value === undefined) return '';
  if (typeof value === 'number' || typeof value === 'boolean' || value instanceof Date) return value;
  const text = String(value);
  return /^[=+\-@]/.test(text) ? "'" + text : text;
}

function cleanString_(value) {
  if (Array.isArray(value)) return value.join(', ').trim();
  return String(value === undefined || value === null ? '' : value).trim();
}

function parseChoiceCode_(value) {
  return cleanString_(value).split('|')[0].trim();
}

function dataRowCount_(sheet) {
  return sheet ? Math.max(0, sheet.getLastRow() - 1) : 0;
}

function escapeHtml_(value) {
  return String(value || '').replace(/[&<>'"]/g, function (char) {
    return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[char];
  });
}
