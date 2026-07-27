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
  const archetype = ((monster.archetype - 1) % 11) + 1;
  const hornPath = archetype === 1
    ? 'M54 58 L25 20 L66 39 M146 58 L175 20 L134 39'
    : archetype === 2
      ? 'M58 53 Q25 12 36 72 M142 53 Q175 12 164 72'
      : archetype === 3
        ? 'M63 50 L48 12 L82 42 M137 50 L152 12 L118 42'
        : archetype === 4
          ? 'M60 55 Q22 38 32 16 Q68 20 78 45 M140 55 Q178 38 168 16 Q132 20 122 45'
          : archetype === 5
            ? 'M58 55 L18 42 L52 27 M142 55 L182 42 L148 27'
            : archetype === 6
              ? 'M61 56 Q46 18 70 29 M139 56 Q154 18 130 29'
              : archetype === 7
                ? 'M58 55 L40 25 M69 48 L62 18 M142 55 L160 25 M131 48 L138 18'
                : archetype === 8
                  ? 'M54 57 Q24 39 25 18 Q57 25 72 44 M146 57 Q176 39 175 18 Q143 25 128 44'
                  : archetype === 9
                    ? 'M63 50 Q80 20 98 43 M137 50 Q120 20 102 43'
                    : archetype === 10
                      ? 'M55 57 L33 30 L65 38 M145 57 L167 30 L135 38'
                      : 'M51 58 Q34 15 58 26 Q74 36 70 53 M149 58 Q166 15 142 26 Q126 36 130 53';
  const mouthPath = archetype % 2 === 0 ? 'M70 120 Q100 143 130 120' : 'M68 124 Q100 105 132 124';
  const eyeY = archetype === 5 || archetype === 10 ? 85 : archetype === 8 ? 78 : 82;
  const bodyPath = archetype === 1
    ? 'M65 104 Q49 141 68 171 Q100 196 132 171 Q151 141 135 104Z'
    : archetype === 2
      ? 'M61 103 Q38 136 56 166 Q79 197 118 184 Q150 174 144 132 Q140 112 129 102Z'
      : archetype === 3
        ? 'M69 103 Q53 131 59 163 Q84 190 116 184 Q145 168 137 130 Q130 111 118 103Z'
        : archetype === 4
          ? 'M54 105 Q30 130 47 165 Q77 195 116 184 Q158 168 150 128 Q137 105 113 101Z'
          : archetype === 5
            ? 'M66 104 Q45 129 50 160 Q64 187 100 190 Q136 187 150 160 Q155 129 134 104Z'
            : archetype === 6
              ? 'M56 108 Q32 138 53 170 Q79 198 110 178 Q139 197 153 163 Q159 130 130 105Z'
              : archetype === 7
                ? 'M70 105 Q48 124 53 157 Q65 185 101 188 Q136 184 146 154 Q151 124 130 105Z'
                : archetype === 8
                  ? 'M60 107 Q45 135 63 164 Q80 192 103 178 Q129 198 143 165 Q157 130 131 104Z'
                  : archetype === 9
                    ? 'M63 104 Q42 121 46 153 Q55 183 91 182 Q107 199 131 175 Q157 150 139 118 Q128 103 113 101Z'
                    : archetype === 10
                      ? 'M68 105 Q50 133 58 166 Q75 194 102 181 Q128 195 144 164 Q153 132 131 103Z'
                      : 'M59 106 Q35 128 46 162 Q65 190 96 179 Q121 199 147 166 Q159 132 132 104Z';
  const armPath = archetype === 1
    ? 'M63 126 Q29 122 23 95 M137 126 Q171 122 177 95'
    : archetype === 2
      ? 'M60 127 Q34 139 25 166 M135 124 Q165 110 181 135'
      : archetype === 3
        ? 'M62 122 Q31 102 22 74 M137 122 Q169 102 178 74'
        : archetype === 4
          ? 'M57 122 Q24 133 18 154 M142 119 Q177 107 187 81'
          : archetype === 5
            ? 'M60 125 Q30 126 19 118 M140 125 Q170 126 181 118'
            : archetype === 6
              ? 'M58 130 Q31 153 27 181 M139 126 Q170 138 183 163'
              : archetype === 7
                ? 'M63 123 Q42 107 29 84 M137 123 Q158 107 171 84'
                : archetype === 8
                  ? 'M59 126 Q35 112 22 96 M140 126 Q165 112 178 96'
                  : archetype === 9
                    ? 'M59 124 Q35 141 17 139 M138 124 Q164 145 185 152'
                    : archetype === 10
                      ? 'M63 125 Q33 121 24 102 M137 125 Q167 121 176 102'
                      : 'M58 128 Q31 136 20 162 M140 128 Q168 136 180 162';
  const legPath = archetype % 3 === 0
    ? 'M77 171 L60 190 M119 174 L137 190'
    : archetype % 3 === 1
      ? 'M80 172 Q69 185 52 181 M120 172 Q131 185 148 181'
      : 'M78 171 L72 194 M121 171 L128 194';
  const extraPath = archetype === 2
    ? 'M141 151 Q174 158 183 186'
    : archetype === 3
      ? 'M53 139 Q23 122 18 92 M147 139 Q177 122 182 92'
      : archetype === 4
        ? 'M42 159 Q22 177 31 192 M154 154 Q178 173 171 192'
        : archetype === 6
          ? 'M100 178 Q78 195 51 192 M105 176 Q136 190 158 183'
          : archetype === 7
            ? 'M100 187 Q92 202 82 194 M103 187 Q112 202 123 194'
            : archetype === 8
              ? 'M50 116 Q20 83 34 56 M150 116 Q180 83 166 56'
              : archetype === 9
                ? 'M139 153 Q170 174 163 196'
                : archetype === 10
                  ? 'M41 134 L24 118 M159 134 L176 118'
                  : archetype === 11
                    ? 'M44 151 Q21 153 18 131 M156 151 Q179 153 182 131'
                    : '';

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
      {quality === 'HIGH' && <circle className="monster-aura-ring" cx="100" cy="105" r="86" fill="none" stroke={monster.accent} strokeOpacity=".24" strokeWidth="2" strokeDasharray="8 10" />}
      {extraPath && <path d={extraPath} fill="none" stroke={monster.accent2} strokeOpacity=".55" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" filter={`url(#monster-glow-${monster.topicId})`} />}
      <path d={legPath} fill="none" stroke={monster.accent2} strokeWidth="11" strokeLinecap="round" strokeLinejoin="round" />
      <path d={bodyPath} fill={`url(#monster-core-${monster.topicId})`} stroke={monster.accent} strokeWidth="4" />
      <path d={armPath} fill="none" stroke={monster.accent2} strokeWidth="10" strokeLinecap="round" strokeLinejoin="round" />
      <path d={hornPath} fill="none" stroke={monster.accent2} strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" filter={`url(#monster-glow-${monster.topicId})`} />
      <path d="M46 98 Q43 53 100 41 Q157 53 154 98 Q149 140 100 150 Q51 140 46 98Z" fill={`url(#monster-core-${monster.topicId})`} stroke={monster.accent} strokeWidth="4" />
      <path d="M48 101 Q29 94 31 121 Q36 141 57 135 M152 101 Q171 94 169 121 Q164 141 143 135" fill={monster.accent2} fillOpacity=".38" stroke={monster.accent2} strokeWidth="3" />
      <g className="monster-eyes" filter={`url(#monster-glow-${monster.topicId})`}>
        <path d={`M57 ${eyeY} Q72 ${eyeY - 12} 86 ${eyeY + 2} Q70 ${eyeY + 10} 57 ${eyeY}Z`} fill="#030712" stroke={monster.accent} strokeWidth="3" />
        <path d={`M143 ${eyeY} Q128 ${eyeY - 12} 114 ${eyeY + 2} Q130 ${eyeY + 10} 143 ${eyeY}Z`} fill="#030712" stroke={monster.accent} strokeWidth="3" />
        <circle cx="72" cy={eyeY} r="3.5" fill="#fff" /><circle cx="128" cy={eyeY} r="3.5" fill="#fff" />
      </g>
      <path d={mouthPath} fill="none" stroke="#020617" strokeWidth="7" strokeLinecap="round" />
      <path d="M83 137 L91 151 L99 138 L107 151 L116 137" fill="none" stroke="#fff" strokeOpacity=".9" strokeWidth="4" strokeLinejoin="round" />
      {quality === 'HIGH' && <path className="monster-core-mark" d={`M100 158 L113 174 L100 189 L87 174Z`} fill={monster.accent} stroke="#fff" strokeOpacity=".65" strokeWidth="2" />}
      {visualState === 'SCOUTED' && <path d="M38 146 Q100 176 162 146" fill="none" stroke="#94a3b8" strokeOpacity=".42" strokeWidth="3" strokeDasharray="6 8" />}
      {visualState === 'ENGAGED' && quality === 'HIGH' && <path d="M32 106 Q18 100 12 88 M168 106 Q182 100 188 88" fill="none" stroke={monster.accent} strokeWidth="4" strokeLinecap="round" />}
      {sealed && <path d="M45 101 Q100 34 155 101 Q100 168 45 101Z" fill="none" stroke="#fbbf24" strokeWidth="6" strokeDasharray="14 8" filter={`url(#monster-glow-${monster.topicId})`} />}
    </svg>
  );
};

export default MonsterGlyph;
