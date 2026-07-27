import React from 'react';
import { LearningRecommendationRecord } from '../types';

interface AdaptiveRepairCardProps {
  task: LearningRecommendationRecord;
  equivalentQueued?: boolean;
}

const AdaptiveRepairCard: React.FC<AdaptiveRepairCardProps> = ({ task, equivalentQueued = false }) => {
  const detail = task.scientificDetail;
  return (
    <section className="adaptive-repair-card" aria-labelledby={`adaptive-repair-${task.id}`}>
      <div className="adaptive-repair-head">
        <div>
          <p>Thẻ vá lỗi khoa học</p>
          <h3 id={`adaptive-repair-${task.id}`}>{task.title}</h3>
        </div>
        <span>{Math.round(task.confidence * 100)}% tin cậy</span>
      </div>

      {detail ? (
        <>
          <div className="adaptive-repair-answer-contrast">
            <div className="adaptive-answer-wrong">
              <span>Em đã chọn</span>
              <strong>{detail.selectedAnswerKey}. {detail.selectedAnswerText || 'Phương án đã chọn'}</strong>
            </div>
            <div className="adaptive-answer-correct">
              <span>Đáp án đúng</span>
              <strong>{detail.correctAnswerKey}. {detail.correctAnswerText}</strong>
            </div>
          </div>

          <div className="adaptive-science-block adaptive-science-misconception">
            <div>
              <strong>Vì sao phương án đã chọn chưa đúng?</strong>
              <p>{detail.misconception}</p>
            </div>
          </div>

          <div className="adaptive-science-block adaptive-science-anchor">
            <div>
              <strong>Kiến thức địa lí cần chốt</strong>
              <p>{detail.knowledgeAnchor}</p>
            </div>
          </div>
        </>
      ) : (
        <p className="adaptive-repair-reason">{task.reason}</p>
      )}

      <div className="adaptive-repair-action">
        <div>
          <strong>Cách vá</strong>
          <p>{task.action}</p>
        </div>
      </div>

      {detail && (
        <div className="adaptive-science-memory">
          <strong>{detail.memoryCue}</strong>
          <p>{detail.verificationPrompt}</p>
        </div>
      )}

      <div className="adaptive-repair-meta">
        <span>{task.estimatedMinutes} phút</span>
        <span>{task.offlineReady ? 'Làm offline' : 'Cần mạng'}</span>
        <span>{equivalentQueued ? 'Đã xếp câu tương đương' : 'Sẽ kiểm chứng lại'}</span>
      </div>

      {detail?.sourceLabel && (
        <details className="adaptive-repair-source">
          <summary>Căn cứ SGK</summary>
          <p>{detail.sourceExcerpt}</p>
          <small>{detail.sourceLabel}</small>
        </details>
      )}

      <small>Hoàn thành khi: {task.completionCriteria}</small>
    </section>
  );
};

export default AdaptiveRepairCard;
