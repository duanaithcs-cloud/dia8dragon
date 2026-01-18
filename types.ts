
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

export type CanvasTheme = 'CRYPTO' | 'NATURE' | 'MINIMAL';

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
}

export interface CompetencyScores {
  C1: number;
  C2: number;
  C3: number;
  C4: number;
}

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
  rank: RankLevel;
  rankPoints: number;
  streak: number;
  preferences: UIPreferences;
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
  view_mode: 'STUDENT_CANVAS' | 'TEACHER_DASHBOARD' | 'ARENA_MODE';
}

export interface Question {
  qid: string;
  topic_id: string;
  skill_tag: 'C1' | 'C2' | 'C3' | 'C4';
  type: 'MCQ' | 'TF' | 'FILL';
  difficulty: number;
  prompt: string;
  choices?: Record<string, string>; 
  answer_key: string; 
  explain: string;
  fill_mode?: 'keypad_digit' | 'keypad_letter' | 'choice_letters';
  choice_bank?: string[];
  assets?: {
    table?: string | null;
    chart?: string | null;
    map?: string | null;
  };
}

export interface QuizSession {
  topic_id: number;
  type: 'Luyện 10' | 'Luyện 25' | 'ARENA_COMBAT' | 'MISSION';
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

export type HistoryType = 'TOPIC_VIEW' | 'QUIZ_COMPLETE' | 'INSIGHT_GEN' | 'DAILY_DECAY' | 'POKEMON_SUMMON' | 'ARENA_WIN' | 'ARENA_LOSS' | 'ARENA_MATCH_END';

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
