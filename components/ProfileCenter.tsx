import React, { useMemo, useState } from 'react';
import { Topic, UIPreferences, UserProfile } from '../types';
import { buildLearningRecommendations, countLearningErrors } from '../utils/learningDiagnostics';

interface ProfileCenterProps {
  userProfile: UserProfile;
  topics: Topic[];
  sessionCount: number;
  onUpdatePreference: (key: keyof UIPreferences, value: unknown) => void;
  onOpenTransferHub: () => void;
  onOpenRank: () => void;
  onChangeRole: () => void;
  onResetLocalData: () => void;
}

const ProfileCenter: React.FC<ProfileCenterProps> = ({
  userProfile,
  topics,
  sessionCount,
  onUpdatePreference,
  onOpenTransferHub,
  onOpenRank,
  onChangeRole,
  onResetLocalData,
}) => {
  const [deleteStep, setDeleteStep] = useState(false);
  const recommendations = useMemo(() => buildLearningRecommendations(topics, 3), [topics]);
  const errorGroups = useMemo(() => countLearningErrors(topics.flatMap(topic => topic.error_tags || [])).slice(0, 5), [topics]);
  const averageMastery = topics.length
    ? Math.round(topics.reduce((sum, topic) => sum + Math.min(100, topic.mastery_percent || 0), 0) / topics.length)
    : 0;

  return (
    <section className="profile-center" aria-labelledby="profile-center-title">
      <div className="profile-center-scroll">
        <header className="profile-hero">
          <div className="profile-avatar" aria-hidden="true">{(userProfile.fullName || 'HS').slice(0, 2).toUpperCase()}</div>
          <div>
            <p className="profile-eyebrow">Cá nhân và quyền riêng tư</p>
            <h1 id="profile-center-title">{userProfile.fullName || 'Học sinh Dia8Dragon'}</h1>
            <p>{userProfile.className || 'Chưa đặt lớp'} · {userProfile.rank} · {userProfile.rankPoints} điểm</p>
          </div>
          <div className="profile-hero-actions">
            <button type="button" onClick={onOpenRank}>Xem tiến độ</button>
            <button type="button" onClick={onChangeRole}>Đổi không gian</button>
          </div>
        </header>

        <div className="profile-grid">
          <section className="profile-card" aria-labelledby="profile-overview-title">
            <div className="profile-card-head">
              <div><p className="profile-eyebrow">Hồ sơ học tập</p><h2 id="profile-overview-title">Tổng quan</h2></div>
            </div>
            <div className="profile-stat-grid">
              <div><span>Nắm vững TB</span><strong>{averageMastery}%</strong></div>
              <div><span>Phiên đã lưu</span><strong>{sessionCount}</strong></div>
              <div><span>Chuỗi học</span><strong>{userProfile.streak}</strong></div>
              <div><span>Chuyên đề đã luyện</span><strong>{topics.filter(topic => topic.attempts_count > 0).length}/{topics.length}</strong></div>
            </div>
            <div className="profile-recommendations">
              <h3>Ba ưu tiên tiếp theo</h3>
              {recommendations.map(item => (
                <article key={`${item.topicId}-${item.title}`}>
                  <strong>{item.title}</strong>
                  <span>{item.reason}</span>
                  <small>{item.action}</small>
                </article>
              ))}
            </div>
          </section>

          <section className="profile-card" aria-labelledby="profile-accessibility-title">
            <div className="profile-card-head">
              <div><p className="profile-eyebrow">P0 · Khả năng tiếp cận</p><h2 id="profile-accessibility-title">Hiển thị và chuyển động</h2></div>
            </div>
            <label className="profile-toggle">
              <span><strong>Chữ dễ đọc</strong><small>Không dùng cỡ chữ chức năng dưới 12 px.</small></span>
              <input
                type="checkbox"
                checked={userProfile.preferences.accessibleText !== false}
                onChange={event => onUpdatePreference('accessibleText', event.target.checked)}
              />
            </label>
            <label className="profile-toggle">
              <span><strong>Giảm chuyển động</strong><small>Tắt trôi, nhịp thở, shimmer và các hiệu ứng mạnh.</small></span>
              <input
                type="checkbox"
                checked={Boolean(userProfile.preferences.reduceMotion)}
                onChange={event => onUpdatePreference('reduceMotion', event.target.checked)}
              />
            </label>
            <p className="profile-note">Ứng dụng cũng tự tôn trọng cài đặt “Reduce Motion” của hệ điều hành. Bong bóng hỗ trợ Tab, Enter, Space và phím mũi tên.</p>
          </section>

          <section className="profile-card" aria-labelledby="profile-privacy-title">
            <div className="profile-card-head">
              <div><p className="profile-eyebrow">P0 · Quyền riêng tư</p><h2 id="profile-privacy-title">Quyền kiểm soát dữ liệu</h2></div>
            </div>
            <label className="profile-toggle profile-toggle-ai">
              <span><strong>Cho phép xử lý bằng AI</strong><small>Khi tắt, Quiz dùng ngân hàng cục bộ; nội dung hồ sơ không được gửi tới API Gemini.</small></span>
              <input
                type="checkbox"
                checked={Boolean(userProfile.preferences.allowAiProcessing)}
                onChange={event => onUpdatePreference('allowAiProcessing', event.target.checked)}
              />
            </label>
            <div className="profile-data-list">
              <div><strong>Lưu trên thiết bị</strong><span>Hồ sơ, tiến độ, lịch sử Quiz, bản nháp bài giao và tài liệu riêng.</span></div>
              <div><strong>Không tự gửi</strong><span>Dữ liệu chỉ đồng bộ khi người dùng chủ động cấu hình Drive hoặc dịch vụ giáo viên.</span></div>
              <div><strong>Có thể xuất/xóa</strong><span>Người dùng có thể tải gói sao lưu hoặc xóa dữ liệu cục bộ bất cứ lúc nào.</span></div>
            </div>
            <div className="profile-data-actions">
              <button type="button" className="profile-primary-action" onClick={onOpenTransferHub}>Xuất hoặc khôi phục dữ liệu</button>
              {!deleteStep ? (
                <button type="button" className="profile-danger-action" onClick={() => setDeleteStep(true)}>Xóa dữ liệu trên thiết bị</button>
              ) : (
                <div className="profile-delete-confirm" role="alert">
                  <p>Thao tác này xóa hồ sơ, tiến độ, bản sao lưu, mã lớp và tài liệu riêng trên thiết bị. Không thể hoàn tác.</p>
                  <div>
                    <button type="button" onClick={() => setDeleteStep(false)}>Hủy</button>
                    <button type="button" className="profile-danger-action" onClick={onResetLocalData}>Xác nhận xóa</button>
                  </div>
                </div>
              )}
            </div>
          </section>

          <section className="profile-card" aria-labelledby="profile-errors-title">
            <div className="profile-card-head">
              <div><p className="profile-eyebrow">P1 · Cá nhân hóa</p><h2 id="profile-errors-title">Nhóm lỗi đang theo dõi</h2></div>
            </div>
            {errorGroups.length ? (
              <div className="profile-error-list">
                {errorGroups.map(item => <div key={item.tag}><strong>{item.tag}</strong><span>{item.count} lần</span></div>)}
              </div>
            ) : (
              <p className="profile-note">Chưa có dữ liệu lỗi. Sau một bài Quiz, hệ thống sẽ phân loại lỗi và giải thích vì sao gợi ý chuyên đề tiếp theo.</p>
            )}
          </section>
        </div>
      </div>
    </section>
  );
};

export default ProfileCenter;
