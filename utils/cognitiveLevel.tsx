import React from 'react';
import { CognitiveLevel, Question } from '../types';

export const COGNITIVE_LEVELS: CognitiveLevel[] = ['NB', 'TH', 'VD', 'VDC'];

export const cognitiveLevelMeta: Record<CognitiveLevel, {
  label: string;
  tone: string;
  border: string;
  bg: string;
  shadow: string;
  hint: string;
}> = {
  NB: {
    label: 'NB',
    tone: 'text-c4-green',
    border: 'border-c4-green/70',
    bg: 'bg-c4-green/10',
    shadow: 'shadow-[0_0_18px_rgba(0,255,136,0.42)]',
    hint: 'Nhận biết'
  },
  TH: {
    label: 'TH',
    tone: 'text-c1-cyan',
    border: 'border-c1-cyan/70',
    bg: 'bg-c1-cyan/10',
    shadow: 'shadow-[0_0_18px_rgba(34,211,238,0.42)]',
    hint: 'Thông hiểu'
  },
  VD: {
    label: 'VD',
    tone: 'text-c3-amber',
    border: 'border-c3-amber/70',
    bg: 'bg-c3-amber/10',
    shadow: 'shadow-[0_0_18px_rgba(245,158,11,0.42)]',
    hint: 'Vận dụng'
  },
  VDC: {
    label: 'VDC',
    tone: 'text-danger-glow',
    border: 'border-danger-glow/70',
    bg: 'bg-danger-glow/10',
    shadow: 'shadow-[0_0_18px_rgba(255,0,85,0.42)]',
    hint: 'Vận dụng cao'
  }
};

export const levelFromDifficulty = (difficulty?: number): CognitiveLevel => {
  const value = Number(difficulty || 1);
  if (value <= 1) return 'NB';
  if (value === 2) return 'TH';
  if (value === 3) return 'VD';
  return 'VDC';
};

export const levelFromEssayText = (text: string, fallbackIndex = 0): CognitiveLevel => {
  const normalized = text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

  if (/(lien he|de xuat|danh gia|binh luan|giai phap|van dung cao|nhan xet bang|nhan xet bieu do|bang so lieu|atlat)/.test(normalized)) {
    return 'VDC';
  }
  if (/(chung minh|phan tich|so sanh|nhan xet|giai thich|vi sao|tai sao)/.test(normalized)) {
    return 'VD';
  }
  if (/(trinh bay|neu y nghia|neu dac diem|cho biet|xac dinh)/.test(normalized)) {
    return 'TH';
  }
  return (['NB', 'TH', 'VD', 'VDC'] as CognitiveLevel[])[fallbackIndex % 4];
};

export const getQuestionLevel = (question: Question): CognitiveLevel => {
  return question.cognitive_level || levelFromDifficulty(question.difficulty);
};

export const CognitiveBadge = ({ level, compact = false }: { level: CognitiveLevel; compact?: boolean }) => {
  const meta = cognitiveLevelMeta[level];
  return (
    <span
      title={meta.hint}
      className={`inline-flex items-center justify-center rounded-xl border font-black uppercase tracking-[0.16em] animate-level-glow shrink-0 ${meta.bg} ${meta.border} ${meta.tone} ${meta.shadow} ${compact ? 'h-7 px-2 text-[9px]' : 'h-9 px-3 text-[10px]'}`}
    >
      {meta.label}
    </span>
  );
};

export const CognitiveStyles = () => (
  <style>{`
    @keyframes level-glow {
      0%, 100% { filter: brightness(1); opacity: 0.88; }
      50% { filter: brightness(1.45); opacity: 1; }
    }
    .animate-level-glow {
      animation: level-glow 1.8s ease-in-out infinite;
    }
  `}</style>
);
