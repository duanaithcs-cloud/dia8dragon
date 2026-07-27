import { MOCK_TOPICS } from '../data';
import { Topic } from '../types';

export const mergeSavedTopicsWithCatalog = (savedTopics?: Partial<Topic>[]): Topic[] => {
  if (!Array.isArray(savedTopics)) return MOCK_TOPICS;
  return MOCK_TOPICS.map(base => {
    const saved = savedTopics.find(topic => Number(topic.topic_id) === base.topic_id);
    if (!saved) return { ...base, pulse_type: null };
    return {
      ...base,
      mastery_percent: saved.mastery_percent ?? base.mastery_percent,
      delta: saved.delta ?? base.delta,
      attempts_count: saved.attempts_count ?? base.attempts_count,
      avg_time_sec: saved.avg_time_sec ?? base.avg_time_sec,
      last_attempt_at: saved.last_attempt_at ?? base.last_attempt_at,
      error_tags: saved.error_tags ?? base.error_tags,
      pinned: saved.pinned ?? base.pinned,
      history_mastery: { ...base.history_mastery, ...(saved.history_mastery || {}) },
      competency_scores: { ...base.competency_scores, ...(saved.competency_scores || {}) },
      pokemon_id: saved.pokemon_id ?? base.pokemon_id,
      pulse_type: null
    };
  });
};
