
import React, { useEffect, useRef, useState } from 'react';
import { Topic, UIPreferences, ArenaStats } from '../types';

interface PhysicsState {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  targetR: number;
  color: string;
  icon: string;
  mastery: number;
  pulse_type?: 'correct' | 'decay' | 'achievement' | null;
  seed: number;
  isDragging: boolean;
  el: HTMLButtonElement | null;
}


type BubbleVisual = {
  neonColor: string;
  coreColor: string;
  coreColor2: string;
  shellTint: string;
  shimmerColor: string;
  rippleColor: string;
};

const SOLAR_SYSTEM_PALETTE = ['#ffc23a', '#b7a58c', '#d6b36d', '#3ea6ff', '#d46a4c', '#d9a066', '#e8d39e', '#7fe7f1', '#4f6dff'];
const CORAL_REEF_PALETTE = ['#ff6f91', '#ff9671', '#f9f871', '#00c9a7', '#00d2fc', '#845ec2', '#2dd4bf', '#ff8fab'];
const AURORA_PALETTE = ['#0ea5e9', '#22c55e', '#8b5cf6', '#f472b6', '#38bdf8', '#a3e635', '#14b8a6'];


// Hệ màu nguyên bản được chuyển trực tiếp từ dia8olympiad commit 4e4b2aa.
// Dia8 Zalo là preset mặc định: toàn bộ bong bóng dùng xanh #0d33f2.
const DIA8_GROUP_PALETTE = ['#00f5ff', '#6366f1', '#00d1ff', '#00ff88', '#3357ff'];
const DIA8_THEME_COLORS: Record<string, string | 'TOPIC' | 'GROUPS'> = {
  D8_ZALO: '#0d33f2',
  D8_NEON: 'TOPIC',
  D8_GROUPS: 'GROUPS',
  D8_AURORA: '#00ffcc',
  D8_SUNSET: '#ff4d4d',
  D8_DARK: '#333333',
};
const DIA8_THEMES = new Set(Object.keys(DIA8_THEME_COLORS));
const isDia8Theme = (theme: string) => DIA8_THEMES.has(theme);

const OLD_APP_BUBBLE_LABELS: Record<number, string> = {
  1: 'VTĐL-PVLT',
  2: 'A/H VTĐL – PVLT',
  3: 'ĐỊA HÌNH',
  4: 'K.VỰC ĐH',
  5: 'Đ2 K.SẢN',
  6: 'P.BỐ SD KS',
  7: 'P.HÓA ĐỊA HÌNH',
  8: 'KH NĐAGM',
  9: 'LƯU VỰC SÔNG',
  10: 'P.HÓA KH',
  11: 'T.Đ BĐKH KH+TV',
  12: 'KH–N.NGHIỆP',
  13: '1 HT SÔNG',
  14: 'HỒ-ĐẦM-NN',
  15: 'BĐ–TRẠM-KH',
  16: 'VẼ P.T BĐ KH',
  17: 'KH-DU.L',
  18: 'Ư.PHÓ BĐKH',
  19: 'K.THÁC TN NƯỚC',
  20: 'T.Đ BĐKH TN',
  21: '3 LOẠI ĐẤT',
  22: 'THỔ.N NĐAGM',
  23: 'ĐẤT FERALIT',
  24: 'ĐẤT PHÙ SA',
  25: 'SINH VẬT ĐA DẠNG',
  26: 'CHỐNG THOÁI HÓA ĐẤT',
  27: 'BẢO TỒN ĐA DẠNG SV',
  28: 'PV BIỂN',
  29: 'TỰ NHIÊN BIỂN',
  30: 'TÀI NGUYÊN BIỂN',
  31: 'MÔI TRƯỜNG BIỂN',
  32: 'LUẬT BIỂN',
  33: 'TL KK BIỂN',
};

const getBubbleDisplayLabel = (topic: Topic) => {
  if (OLD_APP_BUBBLE_LABELS[topic.topic_id]) return OLD_APP_BUBBLE_LABELS[topic.topic_id];
  const candidate = (topic.short_label || topic.keyword_label || `CD ${topic.topic_id}`).trim();
  if (candidate.length <= 18) return candidate;
  const words = candidate.split(/\s+/).filter(Boolean);
  if (words.length <= 3) return candidate.slice(0, 18);
  return words.slice(0, 3).join(' ');
};

const clampByte = (n: number) => Math.max(0, Math.min(255, Math.round(n)));
const normalizeHex = (hex: string) => {
  const clean = (hex || '').trim().replace('#', '');
  if (clean.length === 3) return '#' + clean.split('').map(c => c + c).join('');
  if (clean.length === 6) return '#' + clean;
  return '#0d33f2';
};
const hexToRgb = (hex: string) => {
  const normalized = normalizeHex(hex).slice(1);
  return {
    r: parseInt(normalized.slice(0, 2), 16),
    g: parseInt(normalized.slice(2, 4), 16),
    b: parseInt(normalized.slice(4, 6), 16)
  };
};
const rgbToHex = (r: number, g: number, b: number) => `#${clampByte(r).toString(16).padStart(2, '0')}${clampByte(g).toString(16).padStart(2, '0')}${clampByte(b).toString(16).padStart(2, '0')}`;
const mixColors = (a: string, b: string, weight = 0.5) => {
  const ca = hexToRgb(a);
  const cb = hexToRgb(b);
  const w = Math.max(0, Math.min(1, weight));
  return rgbToHex(ca.r * (1 - w) + cb.r * w, ca.g * (1 - w) + cb.g * w, ca.b * (1 - w) + cb.b * w);
};
const rgba = (hex: string, alpha: number) => {
  const { r, g, b } = hexToRgb(hex);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};
const getThemeColor = (palette: string[], seed: number) => palette[Math.abs(seed) % palette.length];
const HALF_SIZE_WEIGHTED_TOPICS = new Set([1, 3]);
const seededRandom = (seed: number) => {
  const value = Math.sin(seed * 9301 + 49297) * 233280;
  return value - Math.floor(value);
};
const weightedRadiusVariance = (seed: number, range = 0.07) => 1 + (seededRandom(seed) - 0.5) * 2 * range;
const getWeightedBubbleRadius = (topic: Topic, bubbleScale = 1) => {
  const base = window.innerWidth < 640 ? 25 + topic.scale * 12 : 35 + topic.scale * 20;
  const topicFactor = HALF_SIZE_WEIGHTED_TOPICS.has(topic.topic_id) ? 0.5 : 1;
  return base * topicFactor * bubbleScale * weightedRadiusVariance(24000 + topic.topic_id);
};
const deriveBubbleVisual = (topic: Topic, theme: string): BubbleVisual => {
  const base = normalizeHex(topic.color || '#0d33f2');
  if (isDia8Theme(theme)) {
    const configured = DIA8_THEME_COLORS[theme];
    const themeColor = configured === 'TOPIC'
      ? base
      : configured === 'GROUPS'
        ? DIA8_GROUP_PALETTE[Math.min(DIA8_GROUP_PALETTE.length - 1, Math.floor((topic.topic_id - 1) / 4))]
        : normalizeHex(configured || '#0d33f2');
    return {
      neonColor: themeColor,
      coreColor: themeColor,
      coreColor2: 'rgba(0, 0, 0, 0.9)',
      shellTint: 'rgba(255,255,255,0.3)',
      shimmerColor: 'rgba(255,255,255,0.4)',
      rippleColor: themeColor,
    };
  }
  if (theme === 'SOLAR_SYSTEM') {
    const primary = getThemeColor(SOLAR_SYSTEM_PALETTE, topic.topic_id);
    const secondary = getThemeColor(SOLAR_SYSTEM_PALETTE, topic.topic_id + 3);
    return {
      neonColor: primary,
      coreColor: mixColors(primary, '#fff3cf', 0.18),
      coreColor2: mixColors(secondary, '#0b1020', 0.78),
      shellTint: rgba('#fff3cf', 0.28),
      shimmerColor: rgba('#fff7e2', 0.55),
      rippleColor: mixColors(primary, secondary, 0.35),
    };
  }
  if (theme === 'CORAL_REEF') {
    const primary = getThemeColor(CORAL_REEF_PALETTE, topic.topic_id);
    const secondary = getThemeColor(CORAL_REEF_PALETTE, topic.topic_id + 2);
    return {
      neonColor: primary,
      coreColor: mixColors(primary, '#ffffff', 0.12),
      coreColor2: mixColors(secondary, '#08131b', 0.72),
      shellTint: rgba('#d7fff6', 0.22),
      shimmerColor: rgba('#ffffff', 0.48),
      rippleColor: mixColors(primary, '#7cf7ff', 0.28),
    };
  }
  if (theme === 'AURORA') {
    const primary = getThemeColor(AURORA_PALETTE, topic.topic_id);
    const secondary = getThemeColor(AURORA_PALETTE, topic.topic_id + 2);
    return {
      neonColor: primary,
      coreColor: mixColors(primary, '#d8ffff', 0.12),
      coreColor2: mixColors(secondary, '#020617', 0.82),
      shellTint: rgba('#dbeafe', 0.18),
      shimmerColor: rgba('#f0fdf4', 0.36),
      rippleColor: mixColors(primary, secondary, 0.4),
    };
  }
  // ORIGINAL is intentionally pixel-faithful to the first imported build:
  // topic.color drives both the neon ring and the core, fading to near-black.
  return {
    neonColor: base,
    coreColor: base,
    coreColor2: 'rgba(0, 0, 0, 0.95)',
    shellTint: 'rgba(255,255,255,0.4)',
    shimmerColor: 'rgba(255,255,255,0.4)',
    rippleColor: base,
  };
};

const BACKGROUND_IMAGES: Record<string, string> = {
  ORIGINAL_DRAGON: './assets/dragon-original.jpg',
  CELESTIAL_ORBS: './assets/backgrounds/celestial-dragon-orbs.webp',
  HERO_SUNRISE: './assets/backgrounds/hero-dragon-sunrise.webp',
  MOONLAKE: './assets/backgrounds/moonlake-dragon-orbs.webp',
  HEROES_BATTLE: './assets/backgrounds/dragon-heroes-battle.webp',
};

interface BubbleCanvasProps {
  topics: Topic[];
  preferences: UIPreferences;
  generatingTopicId: number | null;
  celebrationTopicId: number | null;
  arenaStore?: Record<number, ArenaStats>;
  onBubbleClick: (id: number) => void;
}

const BubbleCanvas: React.FC<BubbleCanvasProps> = ({ 
  topics, 
  preferences, 
  generatingTopicId, 
  celebrationTopicId, 
  arenaStore = {},
  onBubbleClick 
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const physicsRef = useRef<PhysicsState[]>([]);
  const requestRef = useRef<number>(null);
  const [ready, setReady] = useState(false);
  const [dimensions, setDimensions] = useState({ w: window.innerWidth, h: window.innerHeight - 64 });
  const [systemReduceMotion, setSystemReduceMotion] = useState(() => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches || false);
  const reduceMotion = Boolean(preferences.reduceMotion || systemReduceMotion);

  useEffect(() => {
    const media = window.matchMedia?.('(prefers-reduced-motion: reduce)');
    if (!media) return;
    const update = () => setSystemReduceMotion(media.matches);
    update();
    media.addEventListener?.('change', update);
    return () => media.removeEventListener?.('change', update);
  }, []);

  // 1. Khởi tạo trạng thái vật lý cho toàn bộ 33 bong bóng
  useEffect(() => {
    const handleResize = () => {
      setDimensions({ w: window.innerWidth, h: window.innerHeight - 64 });
    };
    window.addEventListener('resize', handleResize);

    const w = dimensions.w;
    const h = dimensions.h;

    const columns = Math.ceil(Math.sqrt(topics.length * (w / h)));
    const rows = Math.ceil(topics.length / columns);
    const cellW = w / columns;
    const cellH = h / rows;

    physicsRef.current = topics.map((t, index) => {
      const seed = 24000 + t.topic_id;
      const baseR = getWeightedBubbleRadius(t, preferences.bubbleScale || 1.0);
      const col = index % columns;
      const row = Math.floor(index / columns);
      const jitterX = (seededRandom(seed) - 0.5) * cellW * 0.8;
      const jitterY = (seededRandom(seed + 50) - 0.5) * cellH * 0.8;
      const x = (col + 0.5) * cellW + jitterX;
      const y = (row + 0.5) * cellH + jitterY;

      return {
        id: t.topic_id,
        x,
        y,
        vx: reduceMotion ? 0 : (w/2 - x) * 0.005 + (Math.random() - 0.5) * 2,
        vy: reduceMotion ? 0 : (h/2 - y) * 0.005 + (Math.random() - 0.5) * 2,
        r: baseR,
        targetR: baseR,
        color: t.color,
        icon: t.icon,
        mastery: t.mastery_percent,
        pulse_type: t.pulse_type,
        seed: seed % 1000,
        isDragging: false,
        el: null
      };
    });

    setReady(true);
    return () => window.removeEventListener('resize', handleResize);
  }, [topics, preferences.bubbleScale, reduceMotion, dimensions.w, dimensions.h]);

  // 2. Vòng lặp vật lý
  useEffect(() => {
    if (!ready) return;

    const update = () => {
      const p = physicsRef.current;
      if (p.length === 0) {
          requestRef.current = requestAnimationFrame(update);
          return;
      }

      if (reduceMotion) {
        p.forEach((bubble) => {
          if (bubble.el) bubble.el.style.transform = `translate3d(${bubble.x - bubble.r}px, ${bubble.y - bubble.r}px, 0)`;
        });
        requestRef.current = requestAnimationFrame(update);
        return;
      }

      const intensity = preferences.intensity || 1.0;
      const gravityStrength = 0.00018 * intensity;
      // Giữ cùng cơ chế lực chuyển động với Dia9; các màu sắc vẫn là của Dia8.
      const driftSpeed = ((preferences.driftForce ?? 20) / 100) * 0.1 * intensity;
      const friction = 0.99;
      const springStrength = ((preferences.repulsion ?? 80) / 80) * 0.06;

    const w = dimensions.w;
    const h = dimensions.h;
      const centerX = w / 2;
      const centerY = h / 2;

      for (let i = 0; i < p.length; i++) {
        const b1 = p[i];
        if (!b1.isDragging) {
          b1.vx += (centerX - b1.x) * gravityStrength;
          b1.vy += (centerY - b1.y) * gravityStrength;
          const margin = 30;
          if (b1.x - b1.r < margin) b1.vx += (margin - (b1.x - b1.r)) * 0.02;
          else if (b1.x + b1.r > w - margin) b1.vx -= (b1.x + b1.r - (w - margin)) * 0.02;
          if (b1.y - b1.r < margin) b1.vy += (margin - (b1.y - b1.r)) * 0.02;
          else if (b1.y + b1.r > h - margin) b1.vy -= (b1.y + b1.r - (h - margin)) * 0.02;
        }

        for (let j = i + 1; j < p.length; j++) {
          const b2 = p[j];
          const dx = b2.x - b1.x;
          const dy = b2.y - b1.y;
          const distSq = dx * dx + dy * dy;
          const minDist = (b1.r + b2.r) * (0.85 + (preferences.repulsion ?? 80) / 200);
          if (distSq < minDist * minDist) {
            const dist = Math.sqrt(distSq) || 0.1;
            const overlap = (minDist - dist);
            const nx = dx / dist;
            const ny = dy / dist;
            const force = overlap * springStrength;
            if (!b1.isDragging) {
              b1.vx -= nx * force; b1.vy -= ny * force;
              b1.x -= nx * overlap * 0.5; b1.y -= ny * overlap * 0.5;
            }
            if (!b2.isDragging) {
              b2.vx += nx * force; b2.vy += ny * force;
              b2.x += nx * overlap * 0.5; b2.y += ny * overlap * 0.5;
            }
          }
        }
      }

      p.forEach((b) => {
        if (!b.isDragging) {
          if (preferences.showDrifting) {
            const time = Date.now() * 0.0008;
            b.vx += (Math.sin(time + b.seed) + Math.sin(time * 0.5 + b.seed * 0.3)) * driftSpeed;
            b.vy += (Math.cos(time * 0.7 + b.seed) + Math.cos(time * 1.2 + b.seed * 0.8)) * driftSpeed;
          }
          b.vx *= friction; b.vy *= friction;
          b.x += b.vx; b.y += b.vy;
        }
        if (b.el) {
          b.el.style.transform = `translate3d(${b.x - b.r}px, ${b.y - b.r}px, 0)`;
        }
      });
      requestRef.current = requestAnimationFrame(update);
    };
    requestRef.current = requestAnimationFrame(update);
    return () => { if (requestRef.current) cancelAnimationFrame(requestRef.current); };
  }, [ready, preferences.showDrifting, preferences.intensity, preferences.driftForce, preferences.repulsion, dimensions, reduceMotion]);

  const handlePointerDown = (id: number, e: React.PointerEvent) => {
    const b = physicsRef.current.find(i => i.id === id);
    if (b) {
      b.isDragging = true;
      const startX = e.clientX; const startY = e.clientY;
      const initialX = b.x; const initialY = b.y;
      let lastTime = Date.now();
      const onMove = (me: PointerEvent) => {
        const now = Date.now();
        const dt = now - lastTime;
        if (dt > 0) {
            b.vx = (me.clientX - b.x) / dt * 10;
            b.vy = (me.clientY - b.y) / dt * 10;
        }
        b.x = initialX + (me.clientX - startX);
        b.y = initialY + (me.clientY - startY);
        lastTime = now;
      };
      const onUp = () => {
        b.isDragging = false;
        window.removeEventListener('pointermove', onMove);
        window.removeEventListener('pointerup', onUp);
        onBubbleClick(id);
      };
      window.addEventListener('pointermove', onMove);
      window.addEventListener('pointerup', onUp);
    }
  };

  const handleBubbleKeyDown = (index: number, topicId: number, event: React.KeyboardEvent<HTMLButtonElement>) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onBubbleClick(topicId);
      return;
    }
    if (!['ArrowRight', 'ArrowDown', 'ArrowLeft', 'ArrowUp'].includes(event.key)) return;
    event.preventDefault();
    const direction = event.key === 'ArrowRight' || event.key === 'ArrowDown' ? 1 : -1;
    const nextIndex = (index + direction + topics.length) % topics.length;
    physicsRef.current.find(item => item.id === topics[nextIndex]?.topic_id)?.el?.focus();
  };

  /**
   * Phương án tối ưu cho "Vương miện Sao":
   * Xếp thành hình vòng cung (Arc) ở 1/3 phía trên, cách đỉnh đúng 5% bán kính.
   */
  const getStarCrownPositions = (count: number, radius: number) => {
    const positions: { x: number, y: number, rotate: number }[] = [];
    const orbitRadius = radius * 0.93; // Đặt cách mép trong ~7% để đảm bảo không bị mất cánh (5% + 2% padding)
    
    // Góc mở của vương miện (từ -135 độ đến -45 độ, tập trung ở đỉnh -90 độ)
    const startAngle = -Math.PI * 0.8;
    const endAngle = -Math.PI * 0.2;
    
    if (count === 1) {
      return [{ x: 0, y: -orbitRadius, rotate: 0 }];
    }

    for (let i = 0; i < count; i++) {
      const angle = startAngle + (i * (endAngle - startAngle)) / (count - 1);
      positions.push({
        x: Math.cos(angle) * orbitRadius,
        y: Math.sin(angle) * orbitRadius,
        rotate: (angle * 180 / Math.PI) + 90 // Xoay ngôi sao hướng theo tâm vòng cung
      });
    }
    return positions;
  };

  const selectedBackgroundId = preferences.backgroundId || 'ORIGINAL_DRAGON';
  const selectedBackgroundPath = BACKGROUND_IMAGES[selectedBackgroundId] || BACKGROUND_IMAGES.ORIGINAL_DRAGON;

  React.useEffect(() => {
    (window as any).setDia8Background?.(selectedBackgroundId);
  }, [selectedBackgroundId]);

  const getMasteryStyle = (mastery: number) => {
    let neonColor = '#ff0055'; 
    if (mastery >= 100) neonColor = '#00ff88'; 
    else if (mastery >= 80) neonColor = '#ffcc00'; 
    else if (mastery >= 40) neonColor = '#00f5ff'; 
    return {
      color: neonColor,
      textShadow: `0 0 10px ${neonColor}88, 0 0 20px ${neonColor}44`,
    };
  };

  return (
    <div 
      ref={containerRef}
      className="relative w-full h-full overflow-hidden bg-background-dark select-none touch-none"
    >
      <div className="dragon-bg-container">
          <div className="dragon-bg-image" data-background-id={selectedBackgroundId} style={{ backgroundImage: `url("${selectedBackgroundPath}")`, backgroundSize: 'cover', backgroundPosition: 'center center', backgroundRepeat: 'no-repeat' }}></div>
          <div className="dragon-bg-overlay"></div>
      </div>

      <div className="absolute inset-0 pointer-events-none opacity-20 bg-[radial-gradient(circle_at_50%_50%,_#0d33f2_0%,_transparent_60%)] z-10"></div>

      <p id="bubble-canvas-instructions" className="sr-only">Dùng Tab để đi qua các chuyên đề, Enter hoặc Space để mở, phím mũi tên để chuyển nhanh.</p>

      {topics.map((topic, topicIndex) => {
        const b = physicsRef.current.find(p => p.id === topic.topic_id);
        const starsCount = arenaStore[topic.topic_id]?.star_level || 0;
        const isGenerating = topic.topic_id === generatingTopicId;
        const isCelebrating = topic.topic_id === celebrationTopicId;
        const pulseClass = topic.pulse_type === 'correct' ? 'pulse-correct' : topic.pulse_type === 'achievement' ? 'pulse-achievement' : '';
        const focusClass = isGenerating ? 'animate-generating-focus' : '';
        const varietyDur = (5 + (topic.topic_id % 4)).toFixed(1) + 's';
        const masteryStyle = getMasteryStyle(topic.mastery_percent);
        const currentR = b ? b.r : getWeightedBubbleRadius(topic, preferences.bubbleScale || 1.0);
        const supportedThemes = ['D8_ZALO', 'D8_NEON', 'D8_GROUPS', 'D8_AURORA', 'D8_SUNSET', 'D8_DARK', 'ORIGINAL', 'SOLAR_SYSTEM', 'CORAL_REEF', 'AURORA'];
        const activeTheme = supportedThemes.includes(preferences.theme) ? preferences.theme : 'D8_ZALO';
        const dia8Visual = isDia8Theme(activeTheme);
        const bubbleVisual = deriveBubbleVisual(topic, activeTheme);
        const glowIntensity = preferences.glowIntensity ?? 55;
        const saturation = preferences.saturation ?? 65;
        const breathAmp = preferences.breathAmp ?? 5;
        const displayLabel = isGenerating ? 'AI NANO-MATRIX' : getBubbleDisplayLabel(topic);
        const labelFontSize = (preferences.fontSize || 16) * (currentR / 55);
        const masteryFontSize = (preferences.fontSize || 16) * (currentR / 65);
        return (
          <button
            type="button"
            key={topic.topic_id}
            ref={(el) => { if (b) b.el = el; }}
            onPointerDown={(e) => handlePointerDown(topic.topic_id, e)}
            onKeyDown={(event) => handleBubbleKeyDown(topicIndex, topic.topic_id, event)}
            aria-label={`Chuyên đề ${topic.topic_id}: ${topic.keyword_label}. Mức nắm vững ${Math.round(topic.mastery_percent)} phần trăm.`}
            aria-describedby="bubble-canvas-instructions"
            className={`bubble-container bubble-theme-${activeTheme.toLowerCase().replaceAll('_', '-')} ${dia8Visual ? 'bubble-visual-dia8' : 'bubble-visual-dia8'} absolute will-change-transform cursor-pointer group ${focusClass}`}
            style={{ 
              width: currentR * 2, 
              height: currentR * 2,
              ['--neon-color' as any]: bubbleVisual.neonColor,
              ['--core-color' as any]: bubbleVisual.coreColor,
              ['--core-color-2' as any]: bubbleVisual.coreColor2,
              ['--shell-tint' as any]: bubbleVisual.shellTint,
              ['--shimmer-color' as any]: bubbleVisual.shimmerColor,
              ['--ripple-color' as any]: bubbleVisual.rippleColor,
              ['--b-dur' as any]: varietyDur,
              ['--breath-scale' as any]: 1 + (breathAmp / 200),
              ['--dia8-glow' as any]: glowIntensity / 55,
              ['--dia8-saturation' as any]: saturation / 65,
              zIndex: isGenerating ? 1000 : (isCelebrating ? 100 : 10),
              left: 0, top: 0,
              transform: b ? `translate3d(${b.x - b.r}px, ${b.y - b.r}px, 0)` : 'translate3d(-500px, -500px, 0)'
            }}
          >
            <div className="bubble-neon-halo absolute inset-0 rounded-full pointer-events-none" aria-hidden="true"></div>
              <div className={`bubble-inner w-full h-full neon-ring ${pulseClass} ${preferences.showBreathing && !reduceMotion && !isGenerating ? 'animate-breathing' : ''}`}
                 style={{ 
                    opacity: isGenerating ? 1 : (preferences.transparency ?? 0.8),
                    filter: isGenerating
                      ? 'brightness(1.5)'
                      : dia8Visual
                        ? `brightness(${glowIntensity / 55}) saturate(${saturation / 65})`
                        : `brightness(${preferences.brightness}) saturate(${saturation / 65})`
                 }}
            >
              {preferences.showShimmering && !reduceMotion && !dia8Visual && <div className="bubble-shimmer"></div>}
              <div className="hover-ripple"></div>
              
              {/* HỆ THỐNG VƯƠNG MIỆN SAO DANH DỰ (PRESTIGE CROWN) */}
              {starsCount > 0 && !isGenerating && (
                <div className="absolute inset-0 pointer-events-none z-30 flex items-center justify-center">
                  <div className="relative w-full h-full group-hover:scale-110 group-hover:-translate-y-2 transition-transform duration-700 ease-out">
                    {getStarCrownPositions(starsCount, currentR).map((pos, i) => (
                      <svg
                        key={i}
                        viewBox="0 0 24 24"
                        className="prestige-star absolute star-crown-aura"
                        aria-hidden="true"
                        style={{
                          width: currentR * 0.35,
                          height: currentR * 0.35,
                          left: '50%',
                          top: '50%',
                          transform: `translate(calc(-50% + ${pos.x}px), calc(-50% + ${pos.y}px)) rotate(${pos.rotate}deg)`,
                          transitionDelay: `${i * 0.05}s`,
                          zIndex: 5
                        }}
                      >
                        <path d="m12 2.5 2.8 5.7 6.3.9-4.55 4.43 1.07 6.26L12 16.83 6.38 19.8l1.07-6.26L2.9 9.1l6.3-.9Z" fill="currentColor" stroke="currentColor" strokeWidth="1" strokeLinejoin="round" />
                      </svg>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex flex-col items-center justify-center p-2 text-center relative z-20 transition-transform group-hover:scale-105 duration-500 w-full">
                <span
                  className="material-symbols-outlined text-white opacity-40 group-hover:opacity-100 transition-all duration-500 drop-shadow-[0_0_10px_rgba(255,255,255,0.4)]"
                  aria-hidden="true"
                  style={{ fontSize: currentR * 0.6 }}
                >
                  {isGenerating ? 'refresh' : topic.icon}
                </span>
                
                <span
                  className="bubble-topic-label text-white font-black uppercase tracking-tighter leading-tight whitespace-normal max-w-[95%] text-halo text-center"
                  title={topic.keyword_label}
                  style={{ fontSize: labelFontSize }}
                >
                  {displayLabel}
                </span>
                
                <span 
                  className="font-black tabular-nums mt-1 transition-all duration-500"
                  style={{ 
                    ...masteryStyle,
                    fontSize: masteryFontSize 
                  }}
                >
                  {isGenerating ? 'LOADING...' : `${topic.mastery_percent}%`}
                </span>
              </div>
              </div>
            
            {!isGenerating && (
              <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-all duration-300 whitespace-nowrap z-50 transform group-hover:translate-y-[-5px]">
                 <span className="text-[9px] font-black text-white/80 bg-black/80 px-4 py-1.5 rounded-full border border-white/20 shadow-2xl backdrop-blur-xl uppercase">
                   TOPIC #{topic.topic_id}
                 </span>
              </div>
            )}
          </button>
        );
      })}
    </div>
  );
};

export default BubbleCanvas;
