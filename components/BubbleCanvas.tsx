
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
  const [ready, setReady] = useState(false);
  const [dimensions, setDimensions] = useState({ w: window.innerWidth, h: window.innerHeight - 64 });

  // 1. Khởi tạo trạng thái vật lý cho toàn bộ 33 bong bóng
  useEffect(() => {
    const handleResize = () => {
      setDimensions({ w: window.innerWidth, h: window.innerHeight - 64 });
    };
    window.addEventListener('resize', handleResize);

    const w = dimensions.w;
    const h = dimensions.h;

    // Reset và khởi tạo lại toàn bộ 33 bong bóng
    physicsRef.current = topics.map((t) => {
      const baseR = (35 + t.scale * 20) * (preferences.bubbleScale || 1.0);
      
      // Spawn ngẫu nhiên xung quanh tâm để tạo hiệu ứng trôi vào
      const angle = Math.random() * Math.PI * 2;
      const spawnDist = Math.max(w, h) * 0.4;
      const x = w/2 + Math.cos(angle) * spawnDist;
      const y = h/2 + Math.sin(angle) * spawnDist;

      return {
        id: t.topic_id,
        x,
        y,
        vx: (w/2 - x) * 0.005 + (Math.random() - 0.5) * 2,
        vy: (h/2 - y) * 0.005 + (Math.random() - 0.5) * 2,
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

    setReady(true);
    return () => window.removeEventListener('resize', handleResize);
  }, [topics, preferences.bubbleScale]);

  // 2. Vòng lặp vật lý: Xử lý va chạm và chuyển động mượt mà
  useEffect(() => {
    if (!ready) return;

    const update = () => {
      const p = physicsRef.current;
      if (p.length === 0) {
          requestRef.current = requestAnimationFrame(update);
          return;
      }

      const intensity = preferences.intensity || 1.0;
      const gravityStrength = 0.00018 * intensity; 
      const driftSpeed = 0.015 * intensity; 
      const friction = 0.99; 
      const springStrength = 0.06;

      const w = dimensions.w;
      const h = dimensions.h;
      const centerX = w / 2;
      const centerY = h / 2;

      for (let i = 0; i < p.length; i++) {
        const b1 = p[i];
        
        if (!b1.isDragging) {
          // Trọng lực hút về tâm
          b1.vx += (centerX - b1.x) * gravityStrength;
          b1.vy += (centerY - b1.y) * gravityStrength;

          // Chống trôi ra khỏi màn hình
          const margin = 30;
          if (b1.x - b1.r < margin) b1.vx += (margin - (b1.x - b1.r)) * 0.02;
          else if (b1.x + b1.r > w - margin) b1.vx -= (b1.x + b1.r - (w - margin)) * 0.02;
          if (b1.y - b1.r < margin) b1.vy += (margin - (b1.y - b1.r)) * 0.02;
          else if (b1.y + b1.r > h - margin) b1.vy -= (b1.y + b1.r - (h - margin)) * 0.02;
        }

        // Xử lý va chạm giữa các bong bóng
        for (let j = i + 1; j < p.length; j++) {
          const b2 = p[j];
          const dx = b2.x - b1.x;
          const dy = b2.y - b1.y;
          const distSq = dx * dx + dy * dy;
          const minDist = b1.r + b2.r + 10; 

          if (distSq < minDist * minDist) {
            const dist = Math.sqrt(distSq) || 0.1;
            const overlap = (minDist - dist);
            const nx = dx / dist;
            const ny = dy / dist;
            const force = overlap * springStrength;
            
            if (!b1.isDragging) {
              b1.vx -= nx * force;
              b1.vy -= ny * force;
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

      p.forEach((b) => {
        if (!b.isDragging) {
          if (preferences.showDrifting) {
            const time = Date.now() * 0.0008;
            b.vx += (Math.sin(time + b.seed) + Math.sin(time * 0.5 + b.seed * 0.3)) * driftSpeed;
            b.vy += (Math.cos(time * 0.7 + b.seed) + Math.cos(time * 1.2 + b.seed * 0.8)) * driftSpeed;
          }

          b.vx *= friction;
          b.vy *= friction;
          b.x += b.vx;
          b.y += b.vy;
        }

        // Render trực tiếp lên phần tử DOM qua transform để đạt hiệu suất cao
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
  }, [ready, preferences.showDrifting, preferences.intensity, dimensions]);

  const handlePointerDown = (id: number, e: React.PointerEvent) => {
    const b = physicsRef.current.find(i => i.id === id);
    if (b) {
      b.isDragging = true;
      const startX = e.clientX;
      const startY = e.clientY;
      const initialX = b.x;
      const initialY = b.y;
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

  const getStarPositions = (count: number, radius: number) => {
    const positions: { x: number, y: number }[] = [];
    if (count === 1) return [{ x: 0, y: 0 }];
    for (let i = 0; i < count; i++) {
      const angle = (i * 2 * Math.PI) / count - Math.PI / 2;
      positions.push({ x: Math.cos(angle) * radius, y: Math.sin(angle) * radius });
    }
    return positions;
  };

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
      {/* SHENRON DRAGON BACKGROUND LAYER */}
      <div className="dragon-bg-container">
          <div className="dragon-bg-image"></div>
          <div className="dragon-bg-overlay"></div>
      </div>

      <div className="absolute inset-0 pointer-events-none opacity-20 bg-[radial-gradient(circle_at_50%_50%,_#0d33f2_0%,_transparent_60%)] z-10"></div>

      {/* RENDER BONG BÓNG TRỰC TIẾP TỪ TOPICS ĐỂ ĐẢM BẢO REACT LUÔN ĐỒNG BỘ */}
      {topics.map((topic) => {
        const b = physicsRef.current.find(p => p.id === topic.topic_id);
        const stars = arenaStore[topic.topic_id]?.star_level || 0;
        const isGenerating = topic.topic_id === generatingTopicId;
        const isCelebrating = topic.topic_id === celebrationTopicId;
        const pulseClass = topic.pulse_type === 'correct' ? 'pulse-correct' : topic.pulse_type === 'achievement' ? 'pulse-achievement' : '';
        const varietyDur = (5 + (topic.topic_id % 4)).toFixed(1) + 's';
        const masteryStyle = getMasteryStyle(topic.mastery_percent);
        const currentR = b ? b.r : (35 + topic.scale * 20) * (preferences.bubbleScale || 1.0);

        return (
          <div
            key={topic.topic_id}
            ref={(el) => { if (b) b.el = el; }}
            onPointerDown={(e) => handlePointerDown(topic.topic_id, e)}
            className={`bubble-container absolute will-change-transform cursor-pointer group`}
            style={{ 
              width: currentR * 2, 
              height: currentR * 2,
              ['--neon-color' as any]: topic.color,
              ['--core-color' as any]: topic.color,
              ['--b-dur' as any]: varietyDur,
              zIndex: isGenerating || isCelebrating ? 100 : 10,
              // Initial position if physics not yet updated
              left: 0, top: 0,
              transform: b ? `translate3d(${b.x - b.r}px, ${b.y - b.r}px, 0)` : 'translate3d(-500px, -500px, 0)'
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
              
              {stars > 0 && (
                <div className="absolute inset-0 pointer-events-none z-10 flex items-center justify-center">
                  {getStarPositions(stars, currentR * 0.32).map((pos, i) => (
                    <span 
                      key={i} 
                      className="material-symbols-outlined text-amber-500 fill-1 absolute dragon-ball-star"
                      style={{ 
                        fontSize: currentR * 0.28,
                        transform: `translate3d(${pos.x}px, ${pos.y}px, 0)`,
                        ['--delay' as any]: `${i * 0.4}s`
                      }}
                    >
                      star
                    </span>
                  ))}
                </div>
              )}

              <div className="flex flex-col items-center justify-center p-2 text-center relative z-20 transition-transform group-hover:scale-105 duration-500 w-full">
                <span className="material-symbols-outlined text-white opacity-40 group-hover:opacity-100 transition-all duration-500 drop-shadow-[0_0_10px_rgba(255,255,255,0.4)]" style={{ fontSize: currentR * 0.6 }}>
                  {isGenerating ? 'refresh' : topic.icon}
                </span>
                
                <span className="text-white font-black uppercase tracking-tighter leading-tight whitespace-normal max-w-[95%] text-halo text-center"
                      style={{ fontSize: (preferences.fontSize || 16) * (currentR / 55) }}>
                  {topic.keyword_label}
                </span>
                
                <span 
                  className="font-black tabular-nums mt-1 transition-all duration-500"
                  style={{ 
                    ...masteryStyle,
                    fontSize: (preferences.fontSize || 16) * (currentR / 65) 
                  }}
                >
                  {topic.mastery_percent}%
                </span>
              </div>
            </div>
            
            <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-all duration-300 whitespace-nowrap z-50 transform group-hover:translate-y-[-5px]">
               <span className="text-[9px] font-black text-white/80 bg-black/80 px-4 py-1.5 rounded-full border border-white/20 shadow-2xl backdrop-blur-xl uppercase">
                 TOPIC #{topic.topic_id}
               </span>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default BubbleCanvas;
