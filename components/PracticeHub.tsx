import React, { useMemo, useState } from 'react';
import { Topic } from '../types';
import { buildLearningRecommendations, countLearningErrors } from '../utils/learningDiagnostics';
import TopicIcon from './TopicIcon';

interface PracticeHubProps {
  topics: Topic[];
  onOpenTopic: (topicId: number) => void;
  onStartQuiz: (topicId: number, count: 10 | 25, mode: 'quick' | 'hsg' | 'visual' | 'arena') => void;
  onOpenArena: () => void;
  onOpenMonsterBattle: (topicId: number) => void;
  onOpenAdventure: () => void;
  gamificationEnabled: boolean;
}

const PracticeHub: React.FC<PracticeHubProps> = ({ topics, onOpenTopic, onStartQuiz, onOpenArena, onOpenMonsterBattle, onOpenAdventure, gamificationEnabled }) => {
  const recommendations = useMemo(() => buildLearningRecommendations(topics, 3), [topics]);
  const [selectedTopicId, setSelectedTopicId] = useState<number>(() => recommendations[0]?.topicId || topics[0]?.topic_id || 1);
  const selectedTopic = topics.find(topic => topic.topic_id === selectedTopicId) || topics[0];
  const commonErrors = useMemo(
    () => countLearningErrors(topics.flatMap(topic => topic.error_tags || [])).slice(0, 4),
    [topics]
  );
  const completedTopics = topics.filter(topic => topic.attempts_count > 0).length;
  const averageMastery = topics.length
    ? Math.round(topics.reduce((sum, topic) => sum + Math.min(100, topic.mastery_percent || 0), 0) / topics.length)
    : 0;

  return (
    <section className="practice-hub" aria-labelledby="practice-hub-title">
      <div className="practice-hub-scroll">
        <header className="practice-hub-hero">
          <div>
            <p className="practice-eyebrow">Luyện tập thích ứng</p>
            <h1 id="practice-hub-title">Hôm nay nên học gì?</h1>
            <p className="practice-lead">Ứng dụng ưu tiên chuyên đề dựa trên mức nắm vững, số lần luyện và nhóm lỗi đã ghi nhận. Mỗi gợi ý đều nêu rõ lý do.</p>
            <div className="practice-hero-actions">
              <button
                type="button"
                className="practice-monster-launcher"
                onClick={() => onOpenMonsterBattle(selectedTopic?.topic_id || topics[0]?.topic_id || 1)}
                disabled={!gamificationEnabled}
              >
                <strong>Săn yêu quái</strong>
                <span>Mở 33 chuyên đề yêu quái và bắt đầu từ chuyên đề đang chọn</span>
              </button>
              <button type="button" className="practice-adventure-launcher" onClick={onOpenAdventure} disabled={!gamificationEnabled}>
                <strong>Hành trình Thất Ngọc</strong>
                <span>7 chương · Kho Hành Trang · Trạm Cơ Động</span>
              </button>
            </div>
          </div>
          <div className="practice-summary" aria-label="Tổng quan tiến độ">
            <div><span>Đã luyện</span><strong>{completedTopics}/{topics.length}</strong></div>
            <div><span>Nắm vững TB</span><strong>{averageMastery}%</strong></div>
            <div><span>Nhóm lỗi</span><strong>{commonErrors.length}</strong></div>
          </div>
        </header>

        <div className="practice-layout">
          <section className="practice-panel" aria-labelledby="recommendations-title">
            <div className="practice-panel-head">
              <div>
                <p className="practice-eyebrow">Ưu tiên cá nhân</p>
                <h2 id="recommendations-title">3 việc nên làm tiếp</h2>
              </div>
              <span className="practice-badge">Có giải thích</span>
            </div>
            <div className="practice-recommendation-list">
              {recommendations.map((item, index) => {
                const topic = topics.find(candidate => candidate.topic_id === item.topicId);
                if (!topic) return null;
                const isActive = selectedTopicId === item.topicId;
                return (
                  <button
                    type="button"
                    key={`${item.topicId}-${item.title}`}
                    className={`practice-recommendation ${isActive ? 'is-active' : ''}`}
                    onClick={() => setSelectedTopicId(item.topicId)}
                    aria-pressed={isActive}
                  >
                    <span className="practice-rank" aria-hidden="true">{index + 1}</span>
                    <span className="practice-topic-icon" aria-hidden="true"><TopicIcon name={topic.icon} topicId={topic.topic_id} size={28} /></span>
                    <span className="practice-recommendation-copy">
                      <strong>{topic.keyword_label}</strong>
                      <span>{item.reason}</span>
                      <small>{item.action}</small>
                    </span>
                    <span className={`practice-priority priority-${item.priority.toLowerCase()}`}>{item.priority === 'HIGH' ? 'Ưu tiên cao' : item.priority === 'MEDIUM' ? 'Ưu tiên vừa' : 'Duy trì'}</span>
                  </button>
                );
              })}
            </div>
          </section>

          {selectedTopic && (
            <aside className="practice-action-card" aria-labelledby="practice-action-title">
              <div className="practice-action-title-row">
                <span className="practice-action-icon" aria-hidden="true"><TopicIcon name={selectedTopic.icon} topicId={selectedTopic.topic_id} size={36} /></span>
                <div>
                  <p className="practice-eyebrow">Chuyên đề đang chọn</p>
                  <h2 id="practice-action-title">{selectedTopic.keyword_label}</h2>
                </div>
              </div>
              <div className="practice-mastery-row">
                <span>Mức nắm vững</span>
                <strong>{Math.round(selectedTopic.mastery_percent || 0)}%</strong>
              </div>
              <div className="practice-progress" aria-hidden="true"><span style={{ width: `${Math.min(100, selectedTopic.mastery_percent || 0)}%` }} /></div>
              <div className="practice-action-grid">
                <button type="button" onClick={() => onStartQuiz(selectedTopic.topic_id, 10, 'quick')}>
                  <strong>10 câu Nhớ</strong><span>Chẩn đoán nhanh 5 phút</span>
                </button>
                <button type="button" onClick={() => onStartQuiz(selectedTopic.topic_id, 10, 'visual')}>
                  <strong>10 câu Tư liệu</strong><span>Bảng, biểu đồ, bản đồ</span>
                </button>
                <button type="button" onClick={() => onStartQuiz(selectedTopic.topic_id, 25, 'hsg')}>
                  <strong>25 câu Vận dụng</strong><span>Luyện sâu theo chuẩn HSG</span>
                </button>
                <button type="button" onClick={onOpenArena}>
                  <strong>Thi đấu</strong><span>Kiểm tra tốc độ và độ bền</span>
                </button>
                <button type="button" className="practice-monster-entry" disabled={!gamificationEnabled} onClick={() => onOpenMonsterBattle(selectedTopic.topic_id)}>
                  <strong>Săn yêu quái</strong><span>Phá 3 lớp phòng thủ nhận thức</span>
                </button>
              </div>
              <button type="button" className="practice-open-topic" onClick={() => onOpenTopic(selectedTopic.topic_id)}>Mở Trọng tâm và Tự luận trước khi luyện</button>
            </aside>
          )}
        </div>

        <section className="practice-panel practice-error-panel" aria-labelledby="error-patterns-title">
          <div className="practice-panel-head">
            <div>
              <p className="practice-eyebrow">Chẩn đoán lỗi</p>
              <h2 id="error-patterns-title">Những lỗi cần chú ý</h2>
            </div>
          </div>
          {commonErrors.length ? (
            <div className="practice-error-grid">
              {commonErrors.map(item => (
                <article key={item.tag}>
                  <strong>{item.tag}</strong>
                  <span>{item.count} lần được ghi nhận</span>
                </article>
              ))}
            </div>
          ) : (
            <p className="practice-empty">Chưa có đủ dữ liệu lỗi. Hãy hoàn thành một bộ 10 câu để ứng dụng tạo gợi ý cá nhân.</p>
          )}
        </section>
      </div>
    </section>
  );
};

export default PracticeHub;
