
import React from 'react';
import { UIPreferences, CanvasTheme } from '../types';

interface CanvasOptionsDialogProps {
  preferences: UIPreferences;
  onUpdate: (key: keyof UIPreferences, value: any) => void;
  onClose: () => void;
}

const ControlSlider = ({ label, value, min, max, step, onChange, icon, displayValue }: { label: string, value: number, min: number, max: number, step: number, onChange: (v: number) => void, icon: string, displayValue?: string }) => (
  <div className="space-y-2">
    <div className="flex justify-between items-center px-1">
      <label className="text-[10px] font-black uppercase text-gray-500 tracking-[0.2em] flex items-center gap-2">
        <span className="material-symbols-outlined text-sm">{icon}</span>
        {label}
      </label>
      <span className="text-[10px] font-black text-primary italic">{displayValue || `${Math.round(((value - min) / (max - min)) * 100)}%`}</span>
    </div>
    <input 
      type="range" min={min} max={max} step={step} 
      value={value}
      onChange={(e) => onChange(parseFloat(e.target.value))}
      className="w-full h-1.5 bg-white/10 rounded-full appearance-none cursor-pointer accent-primary"
    />
  </div>
);

const CanvasOptionsDialog: React.FC<CanvasOptionsDialogProps> = ({ preferences, onUpdate, onClose }) => {
  return (
    <div className="fixed bottom-28 right-8 z-[120] w-80 animate-slide-up">
      <div className="glass-panel p-6 rounded-[32px] border border-white/10 shadow-[0_20px_60px_rgba(0,0,0,0.8)] backdrop-blur-3xl bg-black/60 overflow-hidden">
        {/* Decorative Background */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent pointer-events-none"></div>

        <div className="flex items-center justify-between mb-8 relative z-10">
          <div>
            <h3 className="text-sm font-black uppercase tracking-[0.3em] flex items-center gap-2 text-white italic">
              <span className="material-symbols-outlined text-primary text-xl">settings_input_component</span>
              Control Center
            </h3>
            <p className="text-[8px] font-bold text-gray-600 uppercase tracking-widest mt-1">Real-time Physics & Market Sync</p>
          </div>
          <button onClick={onClose} className="size-10 rounded-2xl bg-white/5 border border-white/10 hover:bg-danger-glow/20 flex items-center justify-center transition-all active:scale-90">
            <span className="material-symbols-outlined text-xl">close</span>
          </button>
        </div>

        <div className="space-y-8 relative z-10">
          {/* Global Bubble Size */}
          <ControlSlider 
            label="Global Bubble Size" 
            icon="aspect_ratio" 
            value={preferences.bubbleScale || 1.0} 
            min={0} max={2} step={0.1} 
            onChange={(v) => onUpdate('bubbleScale', v)} 
          />

          {/* Topic Font Size */}
          <ControlSlider 
            label="Topic Font Size" 
            icon="text_fields" 
            value={preferences.fontSize || 16} 
            min={10} max={30} step={1} 
            displayValue={`${preferences.fontSize || 16}px`}
            onChange={(v) => onUpdate('fontSize', v)} 
          />

          {/* Intensity / Wind Control */}
          <ControlSlider 
            label="Intensity / Wind" 
            icon="air" 
            value={preferences.intensity || 1.0} 
            min={0} max={2} step={0.1} 
            onChange={(v) => onUpdate('intensity', v)} 
          />

          {/* Transparency / Shell */}
          <ControlSlider 
            label="Transparency" 
            icon="blur_on" 
            value={preferences.transparency || 0.8} 
            min={0.1} max={1} step={0.05} 
            onChange={(v) => onUpdate('transparency', v)} 
          />

          {/* Brightness / Neon Core */}
          <ControlSlider 
            label="Neon Core Brightness" 
            icon="light_mode" 
            value={preferences.brightness || 1.0} 
            min={0.5} max={2} step={0.1} 
            onChange={(v) => onUpdate('brightness', v)} 
          />

          {/* Style Toggles */}
          <div className="grid grid-cols-2 gap-3">
            {[
              { key: 'showBreathing', label: 'Breathing', icon: 'favorite' },
              { key: 'showDrifting', label: 'Drifting', icon: 'animation' }
            ].map(effect => (
              <button
                key={effect.key}
                onClick={() => onUpdate(effect.key as keyof UIPreferences, !preferences[effect.key as keyof UIPreferences])}
                className={`flex flex-col items-center justify-center p-4 rounded-2xl border transition-all ${preferences[effect.key as keyof UIPreferences] ? 'bg-primary/20 border-primary text-white shadow-[0_0_15px_rgba(13,51,242,0.2)]' : 'bg-white/5 border-white/5 text-gray-600 hover:border-white/20'}`}
              >
                <span className="material-symbols-outlined text-2xl mb-2">{effect.icon}</span>
                <span className="text-[8px] font-black uppercase tracking-widest">{effect.label}</span>
              </button>
            ))}
          </div>

          <div className="pt-4 border-t border-white/5 flex justify-between items-center">
            <button 
              onClick={() => {
                onUpdate('theme', 'CRYPTO');
                onUpdate('showBreathing', true);
                onUpdate('showDrifting', true);
                onUpdate('showShimmering', true);
                onUpdate('fontSize', 16);
                onUpdate('intensity', 1.0);
                onUpdate('transparency', 0.8);
                onUpdate('brightness', 1.0);
                onUpdate('bubbleScale', 1.0);
              }}
              className="text-[9px] font-black uppercase text-gray-500 hover:text-white transition-colors"
            >
              Reset to Factory
            </button>
            <div className="flex gap-1">
              <div className="size-1 rounded-full bg-c4-green animate-pulse"></div>
              <div className="size-1 rounded-full bg-primary animate-pulse delay-75"></div>
              <div className="size-1 rounded-full bg-c3-amber animate-pulse delay-150"></div>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes slide-up {
          from { transform: translateY(40px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        .animate-slide-up {
          animation: slide-up 0.5s cubic-bezier(0.16, 1, 0.3, 1);
        }
      `}</style>
    </div>
  );
};

export default CanvasOptionsDialog;
