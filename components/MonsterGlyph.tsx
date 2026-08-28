import React from 'react';
import { MonsterBattleDefinition } from '../types';

interface MonsterGlyphProps {
  monster: MonsterBattleDefinition;
  size?: number;
  animated?: boolean;
  sealed?: boolean;
  state?: 'SCOUTED' | 'ENGAGED' | 'SEALED';
  quality?: 'LOW' | 'HIGH';
}

const MonsterGlyph: React.FC<MonsterGlyphProps> = ({ monster, size = 180, animated = true, sealed = false, state, quality = 'HIGH' }) => {
  const visualState = state || (sealed ? 'SEALED' : 'ENGAGED');
  const archetype = ((monster.archetype - 1) % 5) + 1;
  const hornPath = archetype === 1
    ? 'M54 58 L25 20 L66 39 M146 58 L175 20 L134 39'
    : archetype === 2
      ? 'M58 53 Q25 12 36 72 M142 53 Q175 12 164 72'
      : archetype === 3
        ? 'M63 50 L48 12 L82 42 M137 50 L152 12 L118 42'
        : archetype === 4
          ? 'M60 55 Q22 38 32 16 Q68 20 78 45 M140 55 Q178 38 168 16 Q132 20 122 45'
          : 'M58 55 L18 42 L52 27 M142 55 L182 42 L148 27';
  const mouthPath = archetype % 2 === 0 ? 'M70 120 Q100 143 130 120' : 'M68 124 Q100 105 132 124';
  const eyeY = archetype === 5 ? 85 : 82;

  return (
    <svg
      className={`${animated ? 'monster-glyph-animated' : ''} ${sealed ? 'is-sealed' : ''} monster-glyph-${quality.toLowerCase()} monster-glyph-state-${visualState.toLowerCase()}`}
      viewBox="0 0 200 200"
      width={size}
      height={size}
      role="img"
      aria-label={`${monster.name} — ${monster.epithet}`}
      style={{ '--monster-a': monster.accent, '--monster-b': monster.accent2 } as React.CSSProperties}
    >
      <defs>
        <radialGradient id={`monster-core-${monster.topicId}`} cx="38%" cy="30%">
          <stop offset="0" stopColor="#ffffff" stopOpacity=".92" />
          <stop offset=".16" stopColor={monster.accent} stopOpacity=".9" />
          <stop offset="1" stopColor={monster.accent2} stopOpacity=".3" />
        </radialGradient>
        <filter id={`monster-glow-${monster.topicId}`} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="4" result="blur" />
          <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
      </defs>
      {quality === 'HIGH' && <circle className="monster-aura-ring" cx="100" cy="100" r="82" fill="none" stroke={monster.accent} strokeOpacity=".24" strokeWidth="2" strokeDasharray="8 10" />}
      <path d={hornPath} fill="none" stroke={monster.accent2} strokeWidth="9" strokeLinecap="round" strokeLinejoin="round" filter={`url(#monster-glow-${monster.topicId})`} />
      <path d="M43 105 Q42 54 100 42 Q158 54 157 105 Q153 161 100 174 Q47 161 43 105Z" fill={`url(#monster-core-${monster.topicId})`} stroke={monster.accent} strokeWidth="4" />
      <path d="M48 105 Q26 95 28 126 Q34 151 58 143 M152 105 Q174 95 172 126 Q166 151 142 143" fill={monster.accent2} fillOpacity=".44" stroke={monster.accent2} strokeWidth="3" />
      <g className="monster-eyes" filter={`url(#monster-glow-${monster.topicId})`}>
        <path d={`M57 ${eyeY} Q72 ${eyeY - 12} 86 ${eyeY + 2} Q70 ${eyeY + 10} 57 ${eyeY}Z`} fill="#030712" stroke={monster.accent} strokeWidth="3" />
        <path d={`M143 ${eyeY} Q128 ${eyeY - 12} 114 ${eyeY + 2} Q130 ${eyeY + 10} 143 ${eyeY}Z`} fill="#030712" stroke={monster.accent} strokeWidth="3" />
        <circle cx="72" cy={eyeY} r="3.5" fill="#fff" /><circle cx="128" cy={eyeY} r="3.5" fill="#fff" />
      </g>
      <path d={mouthPath} fill="none" stroke="#020617" strokeWidth="7" strokeLinecap="round" />
      <path d="M83 137 L91 151 L99 138 L107 151 L116 137" fill="none" stroke="#fff" strokeOpacity=".9" strokeWidth="4" strokeLinejoin="round" />
      {quality === 'HIGH' && <path className="monster-core-mark" d={`M100 55 L112 75 L100 93 L88 75Z`} fill={monster.accent} stroke="#fff" strokeOpacity=".65" strokeWidth="2" />}
      {visualState === 'SCOUTED' && <path d="M38 146 Q100 176 162 146" fill="none" stroke="#94a3b8" strokeOpacity=".42" strokeWidth="3" strokeDasharray="6 8" />}
      {visualState === 'ENGAGED' && quality === 'HIGH' && <path d="M32 106 Q18 100 12 88 M168 106 Q182 100 188 88" fill="none" stroke={monster.accent} strokeWidth="4" strokeLinecap="round" />}
      {sealed && <path d="M45 101 Q100 34 155 101 Q100 168 45 101Z" fill="none" stroke="#fbbf24" strokeWidth="6" strokeDasharray="14 8" filter={`url(#monster-glow-${monster.topicId})`} />}
    </svg>
  );
};

export default MonsterGlyph;
