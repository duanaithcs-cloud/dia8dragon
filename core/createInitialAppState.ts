import { AppState, RankLevel, Timeframe } from '../types';
import { loadAppState } from '../utils/dataPersistence';
import { defaultUI, normalizeCanvasTheme } from './appDefaults';
import { mergeSavedTopicsWithCatalog } from './topicState';

export const createInitialAppState = (): AppState => {
  const defaults: AppState = {
    user_profile: {
      school: 'KNTT - Địa 8', level: 'HSG', role: 'STUDENT', roleConfirmed: false,
      rank: RankLevel.DONG, rankPoints: 0, streak: 0, preferences: defaultUI
    },
    timeframe: Timeframe.D7,
    topics: mergeSavedTopicsWithCatalog(),
    pokemon_collection: [], session_log: [], missions: [], has_started: false,
    is_demo: false, last_activity_ts: new Date().toISOString(),
    view_mode: 'STUDENT_CANVAS', teacher_workspace: { classrooms: [], assignments: [] }
  };
  const parsed = loadAppState<Partial<AppState> | null>(null).value;
  if (!parsed) return defaults;
  return {
    ...defaults,
    ...parsed,
    topics: mergeSavedTopicsWithCatalog(parsed.topics),
    teacher_workspace: { ...defaults.teacher_workspace, ...(parsed.teacher_workspace || {}) },
    user_profile: {
      ...defaults.user_profile,
      ...(parsed.user_profile || {}),
      preferences: {
        ...defaults.user_profile.preferences,
        ...(parsed.user_profile?.preferences || {}),
        theme: normalizeCanvasTheme(parsed.user_profile?.preferences?.theme)
      }
    }
  };
};
