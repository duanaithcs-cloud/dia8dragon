
import React, { useEffect, useRef, useState } from 'react';
import { Topic, UIPreferences, ArenaStats } from '../types';

interface PhysicsState {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  targetR: number; // Radius target for breathing/scaling
  color: string;
  icon: string;
  mastery: number;
  pulse_type?: 'correct' | 'decay' | 'achievement' | null;
  seed: number;
  isDragging: boolean;
  el: HTMLDivElement | null;
}

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
  const [dimensions, setDimensions] = useState({ w: window.innerWidth, h: window.innerHeight - 64 });

  // 1. Khởi tạo với hiệu ứng các bong bóng từ bên ngoài trôi vào tâm
  useEffect(() => {
    const handleResize = () => {
      setDimensions({ w: window.innerWidth, h: window.innerHeight - 64 });
    };
    window.addEventListener('resize', handleResize);

    const w = dimensions.w;
    const h = dimensions.h;

    physicsRef.current = topics.map((t) => {
      const baseR = (35 + t.scale * 20) * (preferences.bubbleScale || 1.0);
      
      // Spawn bubbles slightly outside or at the edges to create the "trôi vào tâm" effect initially
      const angle = Math.random() * Math.PI * 2;
      const spawnDist = Math.max(w, h) * 0.6;
      const x = w/2 + Math.cos(angle) * spawnDist;
      const y = h/2 + Math.sin(angle) * spawnDist;

      return {
        id: t.topic_id,
        x,
        y,
        vx: (w/2 - x) * 0.01 + (Math.random() - 0.5) * 2,
        vy: (h/2 - y) * 0.01 + (Math.random() - 0.5) * 2,
        r: baseR,
        targetR: baseR,
        color: t.color,
        icon: t.icon,
        mastery: t.mastery_percent,
        pulse_type: t.pulse_type,
        seed: Math.random() * 1000,
        isDragging: false,
        el: null
      };
    });

    return () => window.removeEventListener('resize', handleResize);
  }, [topics, preferences.bubbleScale]);

  // 2. Vòng lặp vật lý chính: Center Gravity, Elastic Collisions, Fluid Motion
  useEffect(() => {
    const update = () => {
      const p = physicsRef.current;
      const intensity = preferences.intensity || 1.0;
      const gravityStrength = 0.00015 * intensity; 
      const driftSpeed = 0.012 * intensity; 
      const friction = 0.992; // Maintain organic flow
      const springStrength = 0.05; // Elasticity strength

      const w = dimensions.w;
      const h = dimensions.h;
      const centerX = w / 2;
      const centerY = h / 2;

      // Single physics pass with sub-iterations for stability
      for (let i = 0; i < p.length; i++) {
        const b1 = p[i];
        
        if (!b1.isDragging) {
          // A. CENTER GRAVITY: Pull bubbles toward cluster center
          b1.vx += (centerX - b1.x) * gravityStrength;
          b1.vy += (centerY - b1.y) * gravityStrength;

          // B. BOUNDARY BOUNCE: Soft repel from edges
          const margin = 20;
          if (b1.x - b1.r < margin) {
            b1.vx += (margin - (b1.x - b1.r)) * 0.01;
            b1.vx *= 0.95;
          } else if (b1.x + b1.r > w - margin) {
            b1.vx -= (b1.x + b1.r - (w - margin)) * 0.01;
            b1.vx *= 0.95;
          }

          if (b1.y - b1.r < margin) {
            b1.vy += (margin - (b1.y - b1.r)) * 0.01;
            b1.vy *= 0.95;
          } else if (b1.y + b1.r > h - margin) {
            b1.vy -= (b1.y + b1.r - (h - margin)) * 0.01;
            b1.vy *= 0.95;
          }
        }

        // C. ELASTIC COLLISIONS & PROXIMITY REPEL
        for (let j = i + 1; j < p.length; j++) {
          const b2 = p[j];
          const dx = b2.x - b1.x;
          const dy = b2.y - b1.y;
          const distSq = dx * dx + dy * dy;
          const minDist = b1.r + b2.r + 8; // Extra padding for neon glow separation

          if (distSq < minDist * minDist) {
            const dist = Math.sqrt(distSq) || 0.1;
            const overlap = (minDist - dist);
            const nx = dx / dist;
            const ny = dy / dist;

            // Spring force based on overlap
            const force = overlap * springStrength;
            
            if (!b1.isDragging) {
              b1.vx -= nx * force;
              b1.vy -= ny * force;
              // Smoothly push out of overlap
              b1.x -= nx * overlap * 0.5;
              b1.y -= ny * overlap * 0.5;
            }
            if (!b2.isDragging) {
              b2.vx += nx * force;
              b2.vy += ny * force;
              b2.x += nx * overlap * 0.5;
              b2.y += ny * overlap * 0.5;
            }
          }
        }
      }

      // D. APPLY VELOCITY & NOISE DRIFT
      p.forEach((b) => {
        if (!b.isDragging) {
          if (preferences.showDrifting) {
            const time = Date.now() * 0.0006;
            // Simulated Perlin noise using multiple sine waves
            b.vx += (Math.sin(time + b.seed) + Math.sin(time * 0.4 + b.seed * 0.5)) * driftSpeed;
            b.vy += (Math.cos(time * 0.8 + b.seed) + Math.cos(time * 1.3 + b.seed * 0.7)) * driftSpeed;
          }

          b.vx *= friction;
          b.vy *= friction;
          
          const maxV = 2.5;
          const speed = Math.sqrt(b.vx * b.vx + b.vy * b.vy);
          if (speed > maxV) {
            b.vx = (b.vx / speed) * maxV;
            b.vy = (b.vy / speed) * maxV;
          }

          b.x += b.vx;
          b.y += b.vy;
        }

        // Render directly via transform
        if (b.el) {
          b.el.style.transform = `translate3d(${b.x - b.r}px, ${b.y - b.r}px, 0)`;
        }
      });

      requestRef.current = requestAnimationFrame(update);
    };

    requestRef.current = requestAnimationFrame(update);
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [preferences.showDrifting, preferences.intensity, dimensions]);

  const handlePointerDown = (id: number, e: React.PointerEvent) => {
    const b = physicsRef.current.find(i => i.id === id);
    if (b) {
      b.isDragging = true;
      const startX = e.clientX;
      const startY = e.clientY;
      const initialX = b.x;
      const initialY = b.y;

      let lastX = e.clientX;
      let lastY = e.clientY;
      let lastTime = Date.now();

      const onMove = (me: PointerEvent) => {
        const now = Date.now();
        const dt = now - lastTime;
        
        b.x = initialX + (me.clientX - startX);
        b.y = initialY + (me.clientY - startY);
        
        if (dt > 0) {
          b.vx = (me.clientX - lastX) / dt * 5;
          b.vy = (me.clientY - lastY) / dt * 5;
        }
        
        lastX = me.clientX;
        lastY = me.clientY;
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

  /**
   * Dragon Ball Star Clustering Logic
   */
  const getStarPositions = (count: number, radius: number) => {
    const positions: { x: number, y: number }[] = [];
    if (count === 1) return [{ x: 0, y: 0 }];
    
    for (let i = 0; i < count; i++) {
      const angle = (i * 2 * Math.PI) / count - Math.PI / 2;
      positions.push({
        x: Math.cos(angle) * radius,
        y: Math.sin(angle) * radius
      });
    }
    return positions;
  };

  /**
   * Dynamic Mastery Style Logic
   */
  const getMasteryStyle = (mastery: number) => {
    let neonColor = '#ff0055'; // 0-39: Neon Pink
    if (mastery >= 100) neonColor = '#00ff88'; // 100+: Hyper Green
    else if (mastery >= 80) neonColor = '#ffcc00'; // 80-99: Cyber Yellow
    else if (mastery >= 40) neonColor = '#00f5ff'; // 40-79: Electric Cyan
    
    return {
      color: neonColor,
      textShadow: `0 0 2px #000, 0 0 4px #000, 0 0 10px ${neonColor}88, 0 0 20px ${neonColor}44`,
      letterSpacing: '0.02em'
    };
  };

  return (
    <div 
      ref={containerRef}
      className="relative w-full h-full overflow-hidden bg-background-dark select-none touch-none"
    >
      {/* SHENRON DRAGON BACKGROUND LAYER */}
      <div className="dragon-bg-container">
          <div className="dragon-bg-image"></div>
          <div className="dragon-bg-overlay"></div>
      </div>

      {/* ADDITIONAL GLOW OVERLAYS */}
      <div className="absolute inset-0 pointer-events-none opacity-20 bg-[radial-gradient(circle_at_50%_50%,_#0d33f2_0%,_transparent_60%)] z-10"></div>

      {physicsRef.current.map((b) => {
        const topic = topics.find(t => t.topic_id === b.id);
        const stars = arenaStore[b.id]?.star_level || 0;
        const isGenerating = b.id === generatingTopicId;
        const isCelebrating = b.id === celebrationTopicId;
        const pulseClass = b.pulse_type === 'correct' ? 'pulse-correct' : b.pulse_type === 'achievement' ? 'pulse-achievement' : '';
        const varietyDur = (5 + (b.seed % 4)).toFixed(1) + 's';
        const masteryStyle = getMasteryStyle(b.mastery);

        return (
          <div
            key={b.id}
            ref={(el) => { b.el = el; }}
            onPointerDown={(e) => handlePointerDown(b.id, e)}
            className={`bubble-container absolute will-change-transform cursor-pointer group`}
            style={{ 
              width: b.r * 2, 
              height: b.r * 2,
              ['--neon-color' as any]: b.color,
              ['--core-color' as any]: b.color,
              ['--b-dur' as any]: varietyDur,
              zIndex: isGenerating || isCelebrating ? 100 : 10
            }}
          >
            <div className={`bubble-inner w-full h-full neon-ring ${pulseClass} ${preferences.showBreathing ? 'animate-breathing' : ''}`}
                 style={{ 
                    opacity: preferences.transparency,
                    filter: `brightness(${preferences.brightness})`
                 }}
            >
              {preferences.showShimmering && <div className="bubble-shimmer"></div>}
              <div className="hover-ripple"></div>
              
              {/* DRAGON BALL STARS */}
              {stars > 0 && (
                <div key={`stars-${stars}`} className="absolute inset-0 pointer-events-none z-10 flex items-center justify-center">
                  {getStarPositions(stars, b.r * 0.32).map((pos, i) => (
                    <span 
                      key={i} 
                      className="material-symbols-outlined text-amber-500 fill-1 absolute dragon-ball-star"
                      style={{ 
                        fontSize: b.r * 0.28,
                        transform: `translate3d(${pos.x}px, ${pos.y}px, 0)`,
                        ['--delay' as any]: `${i * 0.4}s`
                      }}
                    >
                      star
                    </span>
                  ))}
                </div>
              )}

              <div className="flex flex-col items-center justify-center p-2 text-center relative z-20 transition-transform group-hover:scale-105 duration-500 w-full overflow-hidden">
                <span className="material-symbols-outlined text-white opacity-40 group-hover:opacity-100 transition-all duration-500 drop-shadow-[0_0_10px_rgba(255,255,255,0.4)]" style={{ fontSize: b.r * 0.6 }}>
                  {isGenerating ? 'refresh' : b.icon}
                </span>
                
                {/* HIỂN THỊ TÊN CHUYÊN ĐỀ ĐẦY ĐỦ VỚI CHẾ ĐỘ XUỐNG DÒNG */}
                <span className="text-white font-black uppercase tracking-tighter leading-tight whitespace-normal max-w-[95%] text-halo transition-all text-center"
                      style={{ fontSize: (preferences.fontSize || 16) * (b.r / 55) }}>
                  {topic?.keyword_label}
                </span>
                
                {/* HYPER-CONTRAST MASTERY TEXT */}
                <span 
                  className="font-black tabular-nums mt-1 transition-all duration-500"
                  style={{ 
                    ...masteryStyle,
                    fontSize: (preferences.fontSize || 16) * (b.r / 65) 
                  }}
                >
                  {b.mastery}%
                </span>
              </div>
            </div>
            
            <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-all duration-300 whitespace-nowrap z-50 transform group-hover:translate-y-[-5px]">
               <span className="text-[9px] font-black text-white/80 bg-black/80 px-4 py-1.5 rounded-full border border-white/20 shadow-2xl backdrop-blur-xl">
                 TOPIC #{b.id} • {topic?.group_title}
               </span>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default BubbleCanvas;
