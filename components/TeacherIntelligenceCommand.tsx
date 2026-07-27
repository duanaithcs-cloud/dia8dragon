import React, { useEffect, useMemo, useState } from 'react';
import { TeacherCommandPolicy, TeacherWorkspace, Topic } from '../types';
import {
  createDefaultTeacherCommandPolicy,
  exportOfflineLearningPack,
  loadTeacherCommandPolicy,
  loadTeacherIntelligenceLocalSnapshot,
  saveTeacherCommandPolicy,
  TeacherIntelligenceLocalSnapshot,
} from '../services/teacherCommandService';
import { loadInventoryCatalog } from '../services/inventoryService';
import { InventoryCatalogItem } from '../types';
import './adventure.css';

interface TeacherIntelligenceCommandProps {
  topics: Topic[];
  workspace: TeacherWorkspace;
}

const emptySnapshot: TeacherIntelligenceLocalSnapshot = {
  monsterProgress: [], journeys: [], skills: [], errors: [], reviews: [], questionRecords: [], inventory: [],
};

const TeacherIntelligenceCommand: React.FC<TeacherIntelligenceCommandProps> = ({ topics, workspace }) => {
  const [snapshot, setSnapshot] = useState<TeacherIntelligenceLocalSnapshot>(emptySnapshot);
  const [policy, setPolicy] = useState<TeacherCommandPolicy>(() => loadTeacherCommandPolicy());
  const [catalog, setCatalog] = useState<InventoryCatalogItem[]>([]);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);

  const refresh = async () => {
    setLoading(true);
    const [local, items] = await Promise.all([loadTeacherIntelligenceLocalSnapshot(), loadInventoryCatalog()]);
    setSnapshot(local);
    setCatalog(items);
    setLoading(false);
  };

  useEffect(() => { void refresh(); }, []);

  const savePolicy = (patch: Partial<TeacherCommandPolicy>) => {
    const next = saveTeacherCommandPolicy({ ...policy, ...patch });
    setPolicy(next);
    setMessage('Đã áp dụng chính sách trên thiết bị này. Dữ liệu học tập không bị xóa.');
  };

  const sealedByTopic = useMemo(() => {
    const map = new Map<number, number>();
    snapshot.monsterProgress.filter(item => item.status === 'SEALED').forEach(item => map.set(item.topicId, (map.get(item.topicId) || 0) + 1));
    return map;
  }, [snapshot.monsterProgress]);

  const errorGroups = useMemo(() => {
    const counts = new Map<string, number>();
    snapshot.errors.filter(item => item.status === 'OPEN').forEach(item => counts.set(item.errorTag, (counts.get(item.errorTag) || 0) + 1));
    return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6);
  }, [snapshot.errors]);

  const skillsDue = useMemo(() => snapshot.skills.filter(item => Date.parse(item.nextReviewAt || '') <= Date.now()).sort((a, b) => a.masteryEstimate - b.masteryEstimate), [snapshot.skills]);
  const suspicious = useMemo(() => snapshot.questionRecords.filter(item => ['MONITOR', 'SUSPECT', 'QUARANTINED'].includes(item.status)).sort((a, b) => b.riskScore - a.riskScore), [snapshot.questionRecords]);
  const pendingRepair = snapshot.reviews.filter(item => item.status === 'PENDING' && item.reason === 'REPAIR_VERIFICATION').length;
  const completedRepair = snapshot.reviews.filter(item => item.status === 'REVIEWED' && item.reason === 'REPAIR_VERIFICATION').length;
  const repairEffectiveness = pendingRepair + completedRepair ? Math.round(completedRepair * 100 / (pendingRepair + completedRepair)) : 0;

  const supportStudents = useMemo(() => {
    return workspace.classrooms.flatMap(classroom => classroom.students.map(student => {
      const submissions = workspace.assignments.filter(assignment => assignment.classroomId === classroom.id).flatMap(assignment => assignment.submissions.filter(item => item.studentId === student.id));
      const completed = submissions.filter(item => item.status === 'SUBMITTED' || item.status === 'LATE');
      const average = completed.length ? completed.reduce((sum, item) => sum + Number(item.score || 0), 0) / completed.length : 0;
      const completion = submissions.length ? completed.length * 100 / submissions.length : 0;
      return { student, classroom, average, completion, needsSupport: submissions.length > 0 && (average < 5 || completion < 60) };
    })).filter(item => item.needsSupport).slice(0, 8);
  }, [workspace]);

  const toggleLockedItem = (itemId: string) => {
    const lockedItemIds = policy.lockedItemIds.includes(itemId)
      ? policy.lockedItemIds.filter(id => id !== itemId)
      : [...policy.lockedItemIds, itemId];
    savePolicy({ lockedItemIds });
  };

  const updateWeight = (topicId: number, value: number) => savePolicy({ topicWeights: { ...policy.topicWeights, [topicId]: value } });

  return (
    <section className="teacher-intelligence-command" aria-labelledby="teacher-command-title">
      <header className="tic-hero">
        <div><p>Teacher Intelligence Command 3.4.1</p><h2 id="teacher-command-title">Bộ chỉ huy can thiệp học tập</h2><span>Đọc bằng chứng local-first trên thiết bị, không tự suy diễn khi thiếu dữ liệu và không thay quyết định của giáo viên.</span></div>
        <button type="button" onClick={() => void refresh()} disabled={loading}>{loading ? 'Đang quét…' : 'Quét lại dữ liệu'}</button>
      </header>
      {message && <div className="tic-message"><span>{message}</span><button type="button" onClick={() => setMessage('')}>×</button></div>}
      <div className="tic-scorecards">
        <article><span>Yêu quái chưa phong ấn</span><strong>{Math.max(0, topics.length - new Set(snapshot.monsterProgress.filter(item => item.status === 'SEALED').map(item => item.topicId)).size)}</strong></article>
        <article><span>Lỗi mở</span><strong>{snapshot.errors.filter(item => item.status === 'OPEN').length}</strong></article>
        <article><span>Kỹ năng đến hạn</span><strong>{skillsDue.length}</strong></article>
        <article><span>Câu cần chú ý</span><strong>{suspicious.length}</strong></article>
        <article><span>Hiệu quả vá lỗi</span><strong>{repairEffectiveness}%</strong></article>
        <article><span>Học sinh cần hỗ trợ</span><strong>{supportStudents.length}</strong></article>
      </div>

      <div className="tic-grid">
        <article className="tic-panel">
          <div className="tic-panel-head"><div><p>Bản đồ 33 chuyên đề</p><h3>Yêu quái lớp chưa phong ấn</h3></div><span>{sealedByTopic.size}/{topics.length}</span></div>
          <div className="tic-topic-grid">{topics.map(topic => <div key={topic.topic_id} className={sealedByTopic.has(topic.topic_id) ? 'is-sealed' : ''}><b>{topic.topic_id}</b><span>{topic.keyword_label}</span><strong>{sealedByTopic.has(topic.topic_id) ? 'Đã phong ấn' : 'Chưa đủ bằng chứng'}</strong></div>)}</div>
        </article>

        <article className="tic-panel">
          <div className="tic-panel-head"><div><p>Nhóm lỗi phổ biến</p><h3>Cần can thiệp theo nguyên nhân</h3></div></div>
          <div className="tic-list">{errorGroups.length ? errorGroups.map(([tag, count]) => <div key={tag}><strong>{tag}</strong><span>{count} trường hợp mở</span></div>) : <div className="tic-empty">Chưa có đủ lỗi local để tổng hợp.</div>}</div>
          <div className="tic-panel-head second"><div><p>Kỹ năng sắp quên</p><h3>Ưu tiên kiểm chứng</h3></div></div>
          <div className="tic-list">{skillsDue.slice(0, 6).map(skill => <div key={skill.id}><strong>{skill.skillId}</strong><span>Chuyên đề {skill.topicId} · nắm vững {Math.round(skill.masteryEstimate)}%</span></div>)}{!skillsDue.length && <div className="tic-empty">Chưa có kỹ năng đến hạn trên thiết bị.</div>}</div>
        </article>

        <article className="tic-panel">
          <div className="tic-panel-head"><div><p>Question Intelligence</p><h3>Câu hỏi đáng nghi</h3></div><span>{suspicious.length}</span></div>
          <div className="tic-list">{suspicious.slice(0, 8).map(item => <div key={item.id}><strong>{item.questionId}</strong><span>{item.status} · rủi ro {item.riskScore}% · {item.reportCount} báo lỗi</span></div>)}{!suspicious.length && <div className="tic-empty">Không có câu nào bị đánh dấu trên thiết bị này.</div>}</div>
        </article>

        <article className="tic-panel">
          <div className="tic-panel-head"><div><p>Học sinh cần hỗ trợ</p><h3>Ưu tiên theo tiến độ</h3></div><span>{supportStudents.length}</span></div>
          <div className="tic-list">{supportStudents.map(item => <div key={`${item.classroom.id}:${item.student.id}`}><strong>{item.student.fullName}</strong><span>{item.classroom.name} · hoàn thành {Math.round(item.completion)}% · điểm TB {item.average ? item.average.toFixed(1) : '—'}</span></div>)}{!supportStudents.length && <div className="tic-empty">Chưa phát hiện học sinh cần cảnh báo từ Bài giao.</div>}</div>
        </article>
      </div>

      <section className="tic-controls">
        <header><div><p>Quyền điều khiển giáo viên</p><h3>Chính sách game hóa và đánh giá</h3></div><span>Cập nhật {new Date(policy.updatedAt).toLocaleString('vi-VN')}</span></header>
        <div className="tic-toggle-grid">
          <label><input type="checkbox" checked={policy.gamificationEnabled} onChange={event => savePolicy({ gamificationEnabled: event.target.checked })}/><span/><div><strong>Game hóa</strong><small>Tắt Hành trình, yêu quái và Boss; Quiz vẫn hoạt động.</small></div></label>
          <label><input type="checkbox" checked={policy.leaderboardEnabled} onChange={event => savePolicy({ leaderboardEnabled: event.target.checked })}/><span/><div><strong>Bảng hạng</strong><small>Có thể tắt để giảm cạnh tranh không cần thiết.</small></div></label>
          <label><input type="checkbox" checked={policy.equipmentEnabled} onChange={event => savePolicy({ equipmentEnabled: event.target.checked })}/><span/><div><strong>Thiết bị học tập</strong><small>Thiết bị chỉ hỗ trợ thao tác, không hiện đáp án.</small></div></label>
          <label><input type="checkbox" checked={policy.officialAssessmentMode} onChange={event => savePolicy({ officialAssessmentMode: event.target.checked })}/><span/><div><strong>Kiểm tra chính thức</strong><small>Tự khóa phương tiện và thiết bị hỗ trợ.</small></div></label>
        </div>

        <div className="tic-weight-panel">
          <div><p>Trọng số chuyên đề</p><h4>Điều chỉnh ưu tiên La Bàn</h4><span>0,5 = giảm ưu tiên · 1 = bình thường · 2 = ưu tiên cao.</span></div>
          <div className="tic-weight-grid">{topics.map(topic => <label key={topic.topic_id}><span>{topic.topic_id}. {topic.short_label || topic.keyword_label}</span><input type="range" min="0.5" max="2" step="0.25" value={policy.topicWeights[topic.topic_id] || 1} onChange={event => updateWeight(topic.topic_id, Number(event.target.value))}/><b>{policy.topicWeights[topic.topic_id] || 1}×</b></label>)}</div>
        </div>

        <div className="tic-equipment-panel">
          <div><p>Khóa thiết bị theo lớp</p><h4>Chọn vật phẩm không được sử dụng</h4></div>
          <div>{catalog.filter(item => item.category === 'DEVICE' || item.category === 'VEHICLE').map(item => <button type="button" key={item.id} className={policy.lockedItemIds.includes(item.id) ? 'is-locked' : ''} onClick={() => toggleLockedItem(item.id)}>{policy.lockedItemIds.includes(item.id) ? 'Đang khóa' : 'Cho phép'} · {item.name}</button>)}</div>
        </div>

        <div className="tic-export-row"><button type="button" onClick={() => exportOfflineLearningPack(topics.map(topic => topic.topic_id), policy)}>Phát hành gói học offline</button><span>Gói không chứa dữ liệu cá nhân, không tải trước PDF/DOCX và giữ nguyên cơ chế local-first.</span></div>
      </section>
    </section>
  );
};

export default TeacherIntelligenceCommand;
