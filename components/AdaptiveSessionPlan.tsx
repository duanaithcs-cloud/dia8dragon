import React from 'react';
import { LearningRecommendationRecord } from '../types';

interface AdaptiveSessionPlanProps {
  tasks: LearningRecommendationRecord[];
  loading?: boolean;
}

const typeLabels: Record<LearningRecommendationRecord['type'], string> = {
  REPAIR: 'Vá lỗi vừa phát hiện',
  STRENGTHEN: 'Củng cố kỹ năng yếu',
  VERIFY: 'Kiểm chứng kiến thức',
};

const AdaptiveSessionPlan: React.FC<AdaptiveSessionPlanProps> = ({ tasks, loading = false }) => (
  <section className="adaptive-session-plan" aria-labelledby="adaptive-session-plan-title">
    <div className="adaptive-session-plan-head">
      <div>
        <p>Lộ trình thích ứng</p>
        <h3 id="adaptive-session-plan-title">Tối đa ba việc nên làm tiếp</h3>
      </div>
      <span>{loading ? 'Đang phân tích...' : `${tasks.length} nhiệm vụ`}</span>
    </div>
    {loading ? (
      <div className="adaptive-plan-loading">Đang tổng hợp bằng chứng cục bộ...</div>
    ) : (
      <div className="adaptive-session-plan-grid">
        {tasks.map((task, index) => (
          <article key={task.id} className={`adaptive-task adaptive-task-${task.type.toLowerCase()}`}>
            <div className="adaptive-task-rank">{index + 1}</div>
            <div className="adaptive-task-body">
              <div className="adaptive-task-title-row">
                <div>
                  <small>{typeLabels[task.type]}</small>
                  <strong>{task.title}</strong>
                </div>
              </div>
              <p>{task.reason}</p>
              <div className="adaptive-task-action">{task.action}</div>
              <div className="adaptive-task-meta">
                <span>{task.estimatedMinutes} phút</span>
                <span>{task.offlineReady ? 'Offline' : 'Online'}</span>
                <span>{Math.round(task.confidence * 100)}% tin cậy</span>
              </div>
              <small className="adaptive-task-complete">Điều kiện: {task.completionCriteria}</small>
            </div>
          </article>
        ))}
        {!tasks.length && <div className="adaptive-plan-empty">Chưa đủ bằng chứng để tạo nhiệm vụ. Hãy hoàn thành thêm một phiên Quiz.</div>}
      </div>
    )}
  </section>
);

export default AdaptiveSessionPlan;
