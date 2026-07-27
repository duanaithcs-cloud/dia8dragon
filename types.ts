
export enum TagLevel {
  NB = 'NB',
  TH = 'TH',
  VD = 'VD',
  VDC = 'VDC'
}

export enum Timeframe {
  D7 = '7d',
  D30 = '30d',
  D90 = '90d',
  HKI = 'HKI',
  HKII = 'HKII',
  ALL = 'ALL'
}

export enum RankLevel {
  DONG = 'Đồng',
  BAC = 'Bạc',
  VANG = 'Vàng',
  BACH_KIM = 'Bạch Kim',
  KIM_CUONG = 'Kim Cương',
  CAO_THU = 'Cao Thủ',
  THACH_DAU = 'Thách Đấu'
}

export type CanvasTheme =
  | 'D8_ZALO'
  | 'D8_NEON'
  | 'D8_GROUPS'
  | 'D8_AURORA'
  | 'D8_SUNSET'
  | 'D8_DARK'
  | 'ORIGINAL'
  | 'SOLAR_SYSTEM'
  | 'CORAL_REEF'
  | 'AURORA';
export type ReadingMode = 'COMPACT' | 'STUDY' | 'RESEARCH';
export type ReadingAlign = 'LEFT' | 'JUSTIFY';
export type UILayoutMode = 'AUTO' | 'DESKTOP' | 'MOBILE';
export type ReadingTheme = 'DAY' | 'NIGHT';
export type StudentViewMode = 'STUDENT_CANVAS' | 'PRACTICE_HUB' | 'PROFILE_CENTER' | 'ARENA_MODE' | 'MONSTER_BATTLE' | 'ADVENTURE_COMMAND';
export type LearningErrorTag =
  | 'Nhớ sai dữ kiện'
  | 'Hiểu sai quan hệ'
  | 'Nhầm phạm vi không gian'
  | 'Đọc sai bảng hoặc biểu đồ'
  | 'Sai kỹ năng tính toán'
  | 'Đọc sót từ khóa phủ định'
  | 'Vận dụng chưa đúng'
  | 'Đọc vội hoặc chọn thiếu căn cứ'
  | 'Nhầm khái niệm'
  | 'Nhầm nguyên nhân và hệ quả'
  | 'Câu hỏi có dấu hiệu lỗi';


export type StudentConfidence = 'LOW' | 'MEDIUM' | 'HIGH';
export type NetworkState = 'ONLINE' | 'OFFLINE';
export type ResponseTimingFlag = 'FAST' | 'EXPECTED' | 'SLOW';
export type LearningEvidenceSaveStatus = 'IDLE' | 'SAVING' | 'SAVED' | 'ERROR';
export type AdaptiveTaskType = 'REPAIR' | 'STRENGTHEN' | 'VERIFY';
export type AdaptiveTaskStatus = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'DISMISSED';
export type MonsterBattlePhase = 'SCOUT' | 'BREAK_ARMOR' | 'COUNTERATTACK' | 'SEAL';
export type MonsterDefenseLayer = 'KNOWLEDGE_ARMOR' | 'SKILL_SHIELD' | 'MEMORY_SEAL';
export type MonsterBattleStatus = 'UNSEEN' | 'IN_PROGRESS' | 'AWAITING_SEAL' | 'SEALED';
export type QuestionLifecycleStatus = 'STABLE' | 'MONITOR' | 'SUSPECT' | 'QUARANTINED' | 'PATCHED' | 'REPLACED';

export type QuestionIntelligenceSignalCode =
  | 'MULTIPLE_PLAUSIBLE_ANSWERS'
  | 'ANSWER_EXPLANATION_MISMATCH'
  | 'MISSING_UNIT_OR_YEAR'
  | 'DISTRACTOR_ANOMALY'
  | 'HIGH_PERFORMER_ALTERNATIVE'
  | 'ERROR_RATE_SPIKE'
  | 'TEACHER_REPORTS'
  | 'SOURCE_CONFLICT';
export type QuestionIntelligenceSeverity = 'INFO' | 'WARNING' | 'CRITICAL';

export interface QuestionIntelligenceSignal {
  code: QuestionIntelligenceSignalCode;
  severity: QuestionIntelligenceSeverity;
  label: string;
  detail: string;
  evidence?: string;
}

export interface QuestionIntelligenceProfile {
  version: 'question-intelligence-static-v1';
  auditedAt: string;
  riskScore: number;
  signals: QuestionIntelligenceSignal[];
  recommendedStatus: QuestionLifecycleStatus;
  rationale: string;
}

export interface QuestionIntelligenceRecord {
  id: string;
  questionId: string;
  topicId: number;
  status: QuestionLifecycleStatus;
  baselineVersion: string;
  activeVersionId?: string;
  replacementQuestionId?: string;
  riskScore: number;
  signals: QuestionIntelligenceSignal[];
  attempts: number;
  wrongCount: number;
  errorRate: number;
  leadingWrongAnswer?: string;
  reportCount: number;
  teacherNote?: string;
  teacherDecisionAt?: string;
  lastAnalyzedAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface QuestionReportRecord {
  id: string;
  questionId: string;
  topicId: number;
  reporterRole: 'TEACHER' | 'STUDENT' | 'SYSTEM';
  category: 'ANSWER' | 'WORDING' | 'SOURCE' | 'UNIT_YEAR' | 'DISTRACTOR' | 'OTHER';
  detail: string;
  status: 'OPEN' | 'RESOLVED' | 'DISMISSED';
  createdAt: string;
  updatedAt: string;
}

export interface QuestionPatchDraft {
  questionId: string;
  topicId: number;
  prompt: string;
  answerKey: string;
  choices?: Record<string, string>;
  explanation: string;
  sourceEvidence?: QuestionSourceEvidence;
  changeSummary: string;
  targetStatus?: Extract<QuestionLifecycleStatus, 'PATCHED' | 'STABLE' | 'MONITOR'>;
}

export interface QuestionSourceEvidence {
  id?: string;
  text?: string;
  source?: string;
}

export interface QuestionRepairGuidance {
  version: string;
  reviewStatus: 'SOURCE_GROUNDED_AUDITED';
  questionKind: 'fact' | 'concept' | 'cause' | 'reasoning' | 'solution' | 'location' | 'data' | 'calculation' | 'negative';
  title: string;
  knowledgeAnchor: string;
  correctAnswerKey: string;
  correctAnswerText: string;
  optionFeedback: Record<string, string>;
  repairAction: string;
  memoryCue: string;
  verificationPrompt: string;
  sourceLabel: string;
  sourceExcerpt: string;
}

export interface ScientificRepairDetail {
  guidanceVersion: string;
  questionId: string;
  selectedAnswerKey: string;
  selectedAnswerText?: string;
  correctAnswerKey: string;
  correctAnswerText: string;
  knowledgeAnchor: string;
  misconception: string;
  memoryCue: string;
  verificationPrompt: string;
  sourceLabel: string;
  sourceExcerpt: string;
}

export interface LearningEvidenceDraft {
  eventId: string;
  sessionId: string;
  occurredAt: string;
  topicId: number;
  questionId: string;
  questionVersion: string;
  questionStatus: QuestionLifecycleStatus;
  assessmentImpact: 'COUNTED' | 'EXCLUDED_QUESTION_REVIEW';
  skillIds: string[];
  cognitiveLevel: CognitiveLevel;
  difficulty: number;
  firstAnswer: string;
  finalAnswer: string;
  correctAnswer: string;
  isCorrect: boolean;
  hintUsed: boolean;
  responseTimeMs: number;
  timingFlag: ResponseTimingFlag;
  confidence: StudentConfidence;
  networkState: NetworkState;
  practiceMode: 'quick' | 'hsg' | 'visual' | 'arena' | 'monster' | 'manual';
  errorTags: LearningErrorTag[];
  inferenceConfidence: number;
  sourceEvidence?: QuestionSourceEvidence;
  repairGuidance?: QuestionRepairGuidance;
  questionIntelligence?: QuestionIntelligenceProfile;
  contentSnapshot?: {
    prompt: string;
    answerKey: string;
    choices?: Record<string, string>;
  };
}

export interface LearningEvent extends LearningEvidenceDraft {
  learnerId: string;
  appVersion: string;
  savedAt: string;
}

export interface StudentSkillRecord {
  id: string;
  learnerId: string;
  topicId: number;
  skillId: string;
  attempts: number;
  correctCount: number;
  accuracy: number;
  masteryEstimate: number;
  evidenceConfidence: number;
  consecutiveCorrect: number;
  consecutiveWrong: number;
  stabilityDays: number;
  retentionEstimate: number;
  nextReviewAt: string;
  lastCorrectAt?: string;
  lastErrorTag?: LearningErrorTag;
  modelVersion: 'adaptive-local-v1';
  explanation: string;
  lastEventAt: string;
  updatedAt: string;
}

export interface ErrorCaseRecord {
  id: string;
  learnerId: string;
  eventId: string;
  topicId: number;
  questionId: string;
  questionVersion: string;
  errorTag: LearningErrorTag;
  status: 'OPEN' | 'REVIEWED' | 'RESOLVED';
  createdAt: string;
  updatedAt: string;
}

export interface LearningReviewQueueRecord {
  id: string;
  learnerId: string;
  eventId: string;
  topicId: number;
  questionId: string;
  reason: 'TIMING_ANOMALY' | 'LOW_INFERENCE_CONFIDENCE' | 'QUESTION_STATUS' | 'SPACED_REVIEW_DUE' | 'REPAIR_VERIFICATION';
  status: 'PENDING' | 'REVIEWED' | 'DISMISSED';
  detail: string;
  dueAt?: string;
  skillIds?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface LearningRecommendationRecord {
  id: string;
  learnerId: string;
  topicId: number;
  sourceEventId: string;
  sessionId?: string;
  type: AdaptiveTaskType;
  title: string;
  reason: string;
  action: string;
  estimatedMinutes: number;
  offlineReady: boolean;
  completionCriteria: string;
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  confidence: number;
  targetSkillIds: string[];
  errorTag?: LearningErrorTag;
  status: AdaptiveTaskStatus;
  createdAt: string;
  dueAt?: string;
  scientificDetail?: ScientificRepairDetail;
}

export interface AdaptiveEvidenceResult {
  event: LearningEvent;
  repairCard?: LearningRecommendationRecord;
  updatedSkills: StudentSkillRecord[];
  equivalentQuestionSuggested: boolean;
}

export interface AdaptiveSessionPlan {
  sessionId: string;
  topicId: number;
  generatedAt: string;
  tasks: LearningRecommendationRecord[];
}

export interface QuestionVersionRecord {
  id: string;
  questionId: string;
  contentVersion: string;
  topicId: number;
  status: QuestionLifecycleStatus;
  checksum: string;
  prompt: string;
  answerKey: string;
  choices?: Record<string, string>;
  explanation?: string;
  repairGuidance?: QuestionRepairGuidance;
  sourceEvidence?: QuestionSourceEvidence;
  parentVersionId?: string;
  changeSummary?: string;
  createdBy?: 'SYSTEM' | 'TEACHER';
  createdAt?: string;
  firstSeenAt: string;
  lastSeenAt: string;
}

export interface SyncOutboxRecord {
  id: string;
  entityType: 'LEARNING_EVENT' | 'SKILL_UPDATE' | 'ERROR_CASE' | 'RECOMMENDATION' | 'QUESTION_INTELLIGENCE' | 'QUESTION_REPORT' | 'QUESTION_PATCH' | 'JOURNEY_PROGRESS' | 'INVENTORY_UPDATE' | 'STORY_PROGRESS' | 'SYNC_SETTINGS';
  entityId: string;
  payload: unknown;
  status: 'PENDING' | 'SYNCING' | 'FAILED' | 'CONFIRMED';
  attempts: number;
  createdAt: string;
  updatedAt: string;
  nextAttemptAt?: string;
}

export interface MonsterBattleDefinition {
  topicId: number;
  topicLabel: string;
  name: string;
  epithet: string;
  signatureTrick: string;
  archetype: number;
  accent: string;
  accent2: string;
}

export interface MonsterBattlePhaseResult {
  correct: number;
  total: number;
  completedAt: string;
}

export interface MonsterBattleProgressRecord {
  id: string;
  learnerId: string;
  topicId: number;
  version: 'monster-battle-local-v1';
  status: MonsterBattleStatus;
  phase: MonsterBattlePhase;
  layers: {
    knowledgeArmor: number;
    skillShield: number;
    memorySeal: number;
  };
  attempts: number;
  victories: number;
  questionHistory: string[];
  phaseResults: Partial<Record<MonsterBattlePhase, MonsterBattlePhaseResult>>;
  sealDueAt?: string;
  sealedAt?: string;
  lastBattleAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface MonsterBattleReward {
  topicId: number;
  correctCount: number;
  totalQuestions: number;
  masteryDelta: number;
  rankPoints: number;
  sealed: boolean;
  phase: MonsterBattlePhase;
}


export type JourneyChapterStatus = 'LOCKED' | 'OPEN' | 'BOSS_READY' | 'ORB_RECOVERED';
export type JourneyBossStatus = 'LOCKED' | 'READY' | 'IN_PROGRESS' | 'DEFEATED';

export interface JourneyChapterDefinition {
  id: number;
  title: string;
  subtitle: string;
  topicIds: number[];
  orbName: string;
  orbColor: string;
  bossName: string;
  bossTrick: string;
  clue: string;
}

export interface JourneyChapterProgress {
  chapterId: number;
  status: JourneyChapterStatus;
  bossStatus: JourneyBossStatus;
  recoveredOrb: boolean;
  recoveredAt?: string;
  bossAttempts: number;
  bossBestCorrect: number;
  bossQuestionHistory: string[];
}

export interface JourneyProgressRecord {
  id: string;
  learnerId: string;
  version: 'seven-orb-journey-v1';
  collectedOrbIds: number[];
  frequencyFragments: number;
  compassCalibration: number;
  chapters: JourneyChapterProgress[];
  currentChapterId: number;
  createdAt: string;
  updatedAt: string;
}

export interface CompassRecommendation {
  id: string;
  topicId: number;
  title: string;
  reason: string;
  estimatedMinutes: number;
  confidence: number;
  offlineReady: boolean;
  source: 'WEAK_SKILL' | 'OPEN_ERROR' | 'DUE_REVIEW' | 'MONSTER_PROGRESS';
}

export type InventoryCategory = 'VEHICLE' | 'DEVICE' | 'STATION' | 'DECORATION';
export type InventoryItemStatus = 'LOCKED' | 'CRAFTABLE' | 'OWNED';

export interface InventoryRequirement {
  sealedMonsters?: number;
  recoveredOrbs?: number;
  learningEvents?: number;
  minimumMastery?: number;
  requiredItemIds?: string[];
}

export interface InventoryCatalogItem {
  id: string;
  category: InventoryCategory;
  name: string;
  description: string;
  learningBenefit: string;
  iconId: string;
  rarity: 'COMMON' | 'RARE' | 'EPIC';
  requirements: InventoryRequirement;
  officialAssessmentLocked: boolean;
}

export interface InventoryOwnedRecord {
  id: string;
  learnerId: string;
  itemId: string;
  status: InventoryItemStatus;
  craftedAt?: string;
  unlockedAt?: string;
  equipped?: boolean;
  updatedAt: string;
}

export type HybridSyncPolicy = 'WIFI_ONLY' | 'ANY_NETWORK' | 'MANUAL' | 'OFF';

export interface HybridSyncSettings {
  version: 'hybrid-sync-v1';
  policy: HybridSyncPolicy;
  lastAttemptAt?: string;
  lastSuccessAt?: string;
  lastStatus: 'IDLE' | 'WAITING_NETWORK' | 'WAITING_WIFI' | 'WAITING_REMOTE' | 'SYNCING' | 'SUCCESS' | 'ERROR';
  lastMessage?: string;
  officialAssessmentMode: boolean;
}

export interface HybridSyncSummary {
  online: boolean;
  connectionType: string;
  pending: number;
  failed: number;
  confirmed: number;
  settings: HybridSyncSettings;
}

export interface TeacherCommandPolicy {
  version: 'teacher-command-v1';
  gamificationEnabled: boolean;
  leaderboardEnabled: boolean;
  equipmentEnabled: boolean;
  officialAssessmentMode: boolean;
  topicWeights: Record<number, number>;
  lockedItemIds: string[];
  updatedAt: string;
}

export type VisualQuality = 'LOW' | 'HIGH';

export interface LearningRecommendation {
  topicId: number;
  title: string;
  reason: string;
  action: string;
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  errorTag?: LearningErrorTag;
}
export type CanvasBackgroundId = 'ORIGINAL_DRAGON' | 'CELESTIAL_ORBS' | 'HERO_SUNRISE' | 'MOONLAKE' | 'HEROES_BATTLE';

export interface UIPreferences {
  theme: CanvasTheme;
  showBreathing: boolean;
  showDrifting: boolean;
  showShimmering: boolean;
  fontSize: number; // Kích thước chữ (10px to 30px)
  intensity: number; // 0 to 2
  transparency: number; // 0 to 1
  brightness: number; // 0 to 2
  bubbleScale: number; // 0 to 2 (0% to 200%)
  // Bộ điều khiển thị giác được chuyển nguyên bản từ Dia8 Olympiad.
  breathAmp?: number; // 0–20, biên độ nhịp thở
  glowIntensity?: number; // 0–100, độ sáng neon
  saturation?: number; // 0–100, độ bão hòa màu
  driftForce?: number; // 0–100, lực trôi
  repulsion?: number; // 0–100, khoảng cách/đẩy giữa các bong bóng
  backgroundId?: CanvasBackgroundId;
  readingMode?: ReadingMode;
  readingFontScale?: number;
  readingLineHeight?: number;
  readingAlign?: ReadingAlign;
  readingContrast?: boolean;
  quickReadWpm?: number;
  layoutMode?: UILayoutMode;
  readingTheme?: ReadingTheme;
  allowAiProcessing?: boolean;
  reduceMotion?: boolean;
  accessibleText?: boolean;
  visualQuality?: VisualQuality;
}


export interface CompetencyScores {
  C1: number;
  C2: number;
  C3: number;
  C4: number;
}

export type CognitiveLevel = 'NB' | 'TH' | 'VD' | 'VDC';

export interface Topic {
  topic_id: number;
  group_id: number;
  group_title: string;
  tag_level: TagLevel;
  keyword_label: string;
  short_label: string;
  full_text: string;
  mastery_percent: number;
  scale: number;
  delta: number;
  attempts_count: number;
  avg_time_sec: number;
  competency_scores: CompetencyScores;
  last_attempt_at: string | null;
  error_tags: string[];
  pinned: boolean;
  history_mastery: {
    day: number;
    week: number;
    month: number;
    three_months: number;
  };
  icon: string;
  color: string;
  pulse_type?: 'correct' | 'decay' | 'achievement' | null;
  pokemon_id?: string | null;
  infographic_url?: string; // New: Link to GitHub Infographic
  source_file?: string;
  source_excerpt?: string;
  source_readable?: boolean;
  offline_quiz?: readonly Question[];
}

export interface ArenaStats {
  star_level: number;
  matches_played: number;
  best_accuracy: number;
  last_match_at: string | null;
  last_result: {
    correct_count: number;
    wrong_count: number;
    accuracy: number;
  } | null;
}

export interface StudentSnapshot {
  id: string; // Unique combination of Name + Class
  name: string;
  className: string;
  topics: Topic[];
  avgMastery: number;
  competencyAvg: CompetencyScores;
  status: 'OK' | 'WARNING' | 'CRITICAL' | 'INCOMPLETE';
  rank: RankLevel;
  trend: 'UP' | 'DOWN' | 'STABLE';
}

export interface Pokemon {
  id: string;
  name: string;
  imageUrl: string;
  topicIds: [number, number, number];
  createdAt: string;
  type: string;
}

export interface UserProfile {
  school: string;
  level: string;
  fullName?: string;
  className?: string;
  role: 'STUDENT' | 'TEACHER';
  roleConfirmed?: boolean;
  rank: RankLevel;
  rankPoints: number;
  streak: number;
  preferences: UIPreferences;
}


export type AssignmentStatus = 'DRAFT' | 'ACTIVE' | 'CLOSED';
export type SubmissionStatus = 'NOT_STARTED' | 'IN_PROGRESS' | 'SUBMITTED' | 'LATE';
export type FeedbackStatus = 'DRAFT' | 'PUBLISHED';

export interface RubricCriterion {
  id: string;
  label: string;
  description?: string;
  maxPoints: number;
}

export interface SubmissionFeedback {
  status: FeedbackStatus;
  strengths?: string;
  nextSteps?: string;
  comment?: string;
  quickTags?: string[];
  rubricScores?: Record<string, number>;
  updatedAt?: string;
  publishedAt?: string;
}

export interface ClassroomStudent {
  id: string;
  fullName: string;
  className: string;
  studentCode?: string;
  accessCode?: string;
  note?: string;
  joinedAt: string;
}

export interface Classroom {
  id: string;
  name: string;
  schoolYear: string;
  subject: string;
  joinCode?: string;
  createdAt: string;
  students: ClassroomStudent[];
}

export interface AssignmentSubmission {
  studentId: string;
  status: SubmissionStatus;
  progressPercent: number;
  score?: number;
  submittedAt?: string;
  note?: string;
  answerText?: string;
  studentReflection?: string;
  accuracyPercent?: number;
  durationSeconds?: number;
  attemptCount?: number;
  reviewedAt?: string;
  feedback?: SubmissionFeedback;
}

export interface ClassroomAssignment {
  id: string;
  classroomId: string;
  title: string;
  description: string;
  topicIds: number[];
  questionCount: 10 | 25;
  maxScore?: number;
  allowTextResponse?: boolean;
  rubric?: RubricCriterion[];
  dueAt: string;
  status: AssignmentStatus;
  createdAt: string;
  submissions: AssignmentSubmission[];
}

export interface TeacherFeedbackTemplate {
  id: string;
  title: string;
  strengths: string;
  nextSteps: string;
  tags?: string[];
}

export interface TeacherCloudState {
  provider: 'LOCAL' | 'SUPABASE_LITE';
  lastSyncedAt?: string;
  lastSyncStatus?: 'IDLE' | 'SYNCING' | 'SUCCESS' | 'ERROR';
  lastSyncMessage?: string;
}

export interface GoogleDriveBackupState {
  provider: 'GOOGLE_DRIVE_LITE';
  lastBackupAt?: string;
  lastRestoreAt?: string;
  lastFormImportAt?: string;
  lastSyncStatus?: 'IDLE' | 'SYNCING' | 'SUCCESS' | 'ERROR';
  lastSyncMessage?: string;
  spreadsheetUrl?: string;
  formUrl?: string;
  folderUrl?: string;
  importedFormResponseIds?: string[];
}

export interface TeacherWorkspace {
  classrooms: Classroom[];
  assignments: ClassroomAssignment[];
  feedbackTemplates?: TeacherFeedbackTemplate[];
  cloud?: TeacherCloudState;
  googleDriveBackup?: GoogleDriveBackupState;
  selectedClassroomId?: string;
}

export interface AppState {
  user_profile: UserProfile;
  timeframe: Timeframe;
  topics: Topic[];
  pokemon_collection: Pokemon[];
  session_log: HistoryEntry[];
  missions: SpecialMission[];
  has_started?: boolean;
  is_demo?: boolean; 
  last_activity_ts?: string; 
  view_mode: StudentViewMode | 'TEACHER_DASHBOARD';
  teacher_workspace?: TeacherWorkspace;
}

export interface Question {
  qid: string;
  topic_id: string;
  topicId?: number;
  skill_tag: 'C1' | 'C2' | 'C3' | 'C4';
  skillIds?: string[];
  cognitive_level?: CognitiveLevel;
  cognitiveLevel?: CognitiveLevel;
  type: 'MCQ' | 'TF' | 'FILL';
  difficulty: number;
  prompt: string;
  choices?: Record<string, string>; 
  answer_key: string; 
  explain: string;
  evidence_id?: string;
  evidence_text?: string;
  source_file?: string;
  errorTags?: LearningErrorTag[];
  distractorReasons?: Record<string, string>;
  sourceEvidence?: QuestionSourceEvidence;
  repairGuidance?: QuestionRepairGuidance;
  contentVersion?: string;
  status?: QuestionLifecycleStatus;
  questionIntelligence?: QuestionIntelligenceProfile;
  fill_mode?: 'keypad_digit' | 'keypad_letter' | 'choice_letters';
  choice_bank?: string[];
  assets?: {
    table?: string | null;
    chart?: string | null;
    map?: string | null;
  };
}

export interface QuizSession {
  session_id?: string;
  started_at?: string;
  topic_id: number;
  type: '10 câu TN' | '25 câu TN' | 'ARENA_COMBAT' | 'MONSTER_BATTLE' | 'MISSION';
  practice_mode?: 'quick' | 'hsg' | 'visual' | 'arena' | 'monster';
  questions: Question[];
  currentQuestionIndex: number;
  answers: Record<string, string>;
  summary?: SessionSummary;
  time_limit_seconds?: number;
}

export interface SessionSummary {
  total_questions: number;
  correct_count: number;
  accuracy_pct: number;
  avg_time_ms: number;
  c1_correct: number;
  c2_correct: number;
  c3_correct: number;
  c4_correct: number;
  score_total: number;
  bonus_total: number;
  final_score: number;
}

export type HistoryType = 'TOPIC_VIEW' | 'QUIZ_COMPLETE' | 'INSIGHT_GEN' | 'DAILY_DECAY' | 'POKEMON_SUMMON' | 'ARENA_WIN' | 'ARENA_LOSS' | 'ARENA_MATCH_END' | 'MONSTER_BATTLE' | 'MONSTER_SEALED';

export interface HistoryEntry {
  id: string;
  timestamp: string;
  type: HistoryType;
  topicId: number;
  topicLabel: string;
  details?: string;
}

export interface SearchResult {
  summary: string;
  sources: { title: string; uri: string }[];
}

export interface SpecialMission {
  id: string;
  title: string;
  description: string;
  topicId: number;
  rewardPoints: number;
  deadline: string;
  status: 'PENDING' | 'COMPLETED';
}

export interface StudentProgress {
  id: string;
  name: string;
  class: string;
  avgMastery: number;
  topCompetency: string;
  weakTopics: number[];
  rank: RankLevel;
}
