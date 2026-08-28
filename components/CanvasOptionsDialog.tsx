import React, { useEffect, useState } from 'react';
import { UIPreferences, CanvasBackgroundId, CanvasTheme } from '../types';
import { useDialogFocus } from '../utils/accessibility';

interface CanvasOptionsDialogProps {
  preferences: UIPreferences;
  onUpdate: (key: keyof UIPreferences, value: any) => void;
  onClose: () => void;
}

type SettingsSection = 'THEME' | 'BACKGROUND' | 'BUBBLE' | 'READING' | 'APPEARANCE' | 'DEVICE';

const BACKGROUNDS: Array<{ id: CanvasBackgroundId; name: string; image: string }> = [
  { id: 'ORIGINAL_DRAGON', name: 'Rồng thần nguyên bản', image: './assets/dragon-original.jpg' },
  { id: 'CELESTIAL_ORBS', name: 'Thần long thiên giới', image: './assets/backgrounds/celestial-dragon-orbs.webp' },
  { id: 'HERO_SUNRISE', name: 'Chiến binh bình minh', image: './assets/backgrounds/hero-dragon-sunrise.webp' },
  { id: 'MOONLAKE', name: 'Long hồ nguyệt dạ', image: './assets/backgrounds/moonlake-dragon-orbs.webp' },
  { id: 'HEROES_BATTLE', name: 'Tam hiệp long lực', image: './assets/backgrounds/dragon-heroes-battle.webp' },
];

const BUBBLE_THEMES: Array<{ id: CanvasTheme; name: string; subtitle: string; preview: string; source: 'DIA8' | 'DIA8' }> = [
  {
    id: 'D8_ZALO',
    name: 'Dia8 nguyên bản',
    subtitle: 'Preset Zalo gốc: xanh #0d33f2, neon và nhịp thở đúng bản lớp 8',
    preview: 'radial-gradient(circle at 28% 26%, rgba(255,255,255,.8), transparent 18%), radial-gradient(circle at center, #0d33f2 0%, #020617 72%, #000 100%)',
    source: 'DIA8'
  },
  {
    id: 'D8_NEON',
    name: 'Dia8 Neon',
    subtitle: 'Giữ nguyên màu nhóm/chuyên đề, tăng sáng theo bộ điều khiển Dia8',
    preview: 'linear-gradient(135deg, #00f5ff 0%, #6366f1 28%, #00d1ff 50%, #00ff88 73%, #3357ff 100%)',
    source: 'DIA8'
  },
  {
    id: 'D8_GROUPS',
    name: 'Bảng màu 5 nhóm Dia8',
    subtitle: 'Đủ 5 màu nguồn: Cyan, Indigo, Sky, Green và Blue',
    preview: 'linear-gradient(90deg, #00f5ff 0 20%, #6366f1 20% 40%, #00d1ff 40% 60%, #00ff88 60% 80%, #3357ff 80% 100%)',
    source: 'DIA8'
  },
  {
    id: 'D8_AURORA',
    name: 'Dia8 Aurora',
    subtitle: 'Màu ngọc lam nguyên bản #00ffcc',
    preview: 'radial-gradient(circle at 28% 25%, rgba(255,255,255,.75), transparent 18%), linear-gradient(135deg, #00ffcc, #003b36 72%, #000)',
    source: 'DIA8'
  },
  {
    id: 'D8_SUNSET',
    name: 'Dia8 Sunset',
    subtitle: 'Sắc đỏ hoàng hôn nguyên bản #ff4d4d',
    preview: 'radial-gradient(circle at 28% 25%, rgba(255,255,255,.7), transparent 18%), linear-gradient(135deg, #ff4d4d, #7f1d1d 68%, #160606)',
    source: 'DIA8'
  },
  {
    id: 'D8_DARK',
    name: 'Dia8 Dark',
    subtitle: 'Xám than #333333, viền sáng tối giản',
    preview: 'radial-gradient(circle at 28% 25%, rgba(255,255,255,.55), transparent 18%), linear-gradient(135deg, #555, #333 45%, #050505)',
    source: 'DIA8'
  },
  {
    id: 'ORIGINAL',
    name: 'Nguyên bản Dia8',
    subtitle: 'Màu chuyên đề và ánh sáng gốc của Dia8Dragon',
    preview: 'radial-gradient(circle at 30% 30%, rgba(255,255,255,.65), transparent 20%), linear-gradient(135deg, #0d33f2 0%, #00f5ff 38%, #ffcc00 72%, #ff0055 100%)',
    source: 'DIA8'
  },
  {
    id: 'SOLAR_SYSTEM',
    name: 'Hệ Mặt Trời',
    subtitle: 'Sắc hành tinh và ánh kim không gian',
    preview: 'radial-gradient(circle at 22% 28%, rgba(255,244,214,.95), rgba(255,194,58,.8) 20%, transparent 22%), linear-gradient(135deg, #503214 0%, #d46a4c 28%, #3ea6ff 52%, #e9c98d 74%, #4f6dff 100%)',
    source: 'DIA8'
  },
  {
    id: 'CORAL_REEF',
    name: 'Rạn san hô',
    subtitle: 'Rực rỡ, tươi sáng và giàu tương phản',
    preview: 'radial-gradient(circle at 25% 25%, rgba(255,255,255,.75), transparent 18%), linear-gradient(135deg, #ff6f91 0%, #ff9671 22%, #f9f871 44%, #00c9a7 68%, #00d2fc 100%)',
    source: 'DIA8'
  },
  {
    id: 'AURORA',
    name: 'Cực quang Dia8',
    subtitle: 'Dải sáng lạnh đa sắc, sâu và dịu mắt',
    preview: 'radial-gradient(circle at 26% 24%, rgba(255,255,255,.72), transparent 20%), linear-gradient(135deg, #172554 0%, #0ea5e9 24%, #22c55e 55%, #8b5cf6 82%, #f472b6 100%)',
    source: 'DIA8'
  }
];

const SECTION_META: Array<{ id: SettingsSection; label: string; shortLabel: string; hint: string }> = [
  { id: 'THEME', label: 'Theme', shortLabel: 'Theme', hint: 'Bộ màu toàn bộ bong bóng' },
  { id: 'BACKGROUND', label: 'Ảnh nền', shortLabel: 'Nền', hint: 'Không gian nền toàn màn hình' },
  { id: 'BUBBLE', label: 'Bong bóng', shortLabel: 'Bóng', hint: 'Kích thước, chữ và chuyển động' },
  { id: 'READING', label: 'Đọc', shortLabel: 'Đọc', hint: 'Chế độ, cỡ chữ và giãn dòng' },
  { id: 'APPEARANCE', label: 'Ngày / đêm', shortLabel: 'Sáng', hint: 'Bề mặt đọc ban ngày hoặc ban đêm' },
  { id: 'DEVICE', label: 'Mobile / Desktop', shortLabel: 'Thiết bị', hint: 'Tự động hoặc ép kiểu bố cục' },
];

const SettingsGlyph: React.FC<{ section: SettingsSection; size?: number }> = ({ section, size = 24 }) => {
  const common = { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, 'aria-hidden': true };
  if (section === 'THEME') return <svg {...common}><path d="M12 3a9 9 0 1 0 0 18h1.2a1.8 1.8 0 0 0 .8-3.4l-.4-.2a1.5 1.5 0 0 1 .7-2.8H17a4 4 0 0 0 4-4A7.6 7.6 0 0 0 12 3Z"/><circle cx="7.5" cy="10" r=".8" fill="currentColor" stroke="none"/><circle cx="10" cy="7" r=".8" fill="currentColor" stroke="none"/><circle cx="14" cy="7" r=".8" fill="currentColor" stroke="none"/><circle cx="16.5" cy="10" r=".8" fill="currentColor" stroke="none"/></svg>;
  if (section === 'BACKGROUND') return <svg {...common}><rect x="3" y="4" width="18" height="16" rx="3"/><circle cx="8" cy="9" r="1.5"/><path d="m5 17 4.5-4.5 3 3L15 13l4 4"/></svg>;
  if (section === 'BUBBLE') return <svg {...common}><circle cx="10" cy="11" r="6"/><circle cx="17.5" cy="7" r="3"/><circle cx="17" cy="16.5" r="4"/><path d="M8 8.5c.9-.9 2.1-1.3 3.3-1" opacity=".8"/></svg>;
  if (section === 'READING') return <svg {...common}><path d="M4 5.5A3.5 3.5 0 0 1 7.5 4H11v15H7.5A3.5 3.5 0 0 0 4 20.5Z"/><path d="M20 5.5A3.5 3.5 0 0 0 16.5 4H13v15h3.5a3.5 3.5 0 0 1 3.5 1.5Z"/><path d="M7 8h2M7 11h2M15 8h2M15 11h2"/></svg>;
  if (section === 'APPEARANCE') return <svg {...common}><path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6 7 7M17 17l1.4 1.4M18.4 5.6 17 7"/><path d="M15.8 16.7A6 6 0 0 1 8.2 7.3 6.5 6.5 0 1 0 15.8 16.7Z"/></svg>;
  return <svg {...common}><rect x="3" y="5" width="13" height="9" rx="2"/><path d="M7 19h5M9.5 14v5"/><rect x="17" y="8" width="4" height="9" rx="1"/></svg>;
};

const CloseGlyph = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18"/></svg>;

const ControlSlider = ({ label, value, min, max, step, onChange, displayValue }: { label: string, value: number, min: number, max: number, step: number, onChange: (v: number) => void, displayValue?: string }) => (
  <div className="settings-control-box">
    <div className="flex justify-between items-center gap-3">
      <label className="text-[10px] font-black uppercase text-slate-200 tracking-[0.12em]">{label}</label>
      <span className="settings-value-badge">{displayValue || `${Math.round(((value - min) / (max - min)) * 100)}%`}</span>
    </div>
    <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(parseFloat(e.target.value))} className="settings-range" />
  </div>
);

const CanvasOptionsDialog: React.FC<CanvasOptionsDialogProps> = ({ preferences, onUpdate, onClose }) => {
  const dialogRef = useDialogFocus<HTMLDivElement>(onClose);
  const [activeSection, setActiveSection] = useState<SettingsSection>('THEME');
  const selectedBackground = preferences.backgroundId || 'ORIGINAL_DRAGON';
  const selectedTheme = BUBBLE_THEMES.some((item) => item.id === preferences.theme) ? (preferences.theme as CanvasTheme) : 'D8_GROUPS';
  const activeMeta = SECTION_META.find((item) => item.id === activeSection) || SECTION_META[0];

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  const updatePreference = (key: keyof UIPreferences, value: any) => {
    if (key === 'backgroundId') {
      (window as any).setDia8Background?.(value);
      window.dispatchEvent(new CustomEvent('dia8:set-background', { detail: { id: value } }));
    }
    onUpdate(key, value);
  };

  const resetDefaults = () => {
    updatePreference('theme','D8_GROUPS');
    updatePreference('backgroundId','ORIGINAL_DRAGON');
    updatePreference('showBreathing',true);
    updatePreference('showDrifting',true);
    updatePreference('showShimmering',true);
    updatePreference('fontSize',13);
    updatePreference('intensity',1);
    updatePreference('transparency',.8);
    updatePreference('brightness',1);
    updatePreference('bubbleScale',1);
    updatePreference('breathAmp',5);
    updatePreference('glowIntensity',55);
    updatePreference('saturation',65);
    updatePreference('driftForce',20);
    updatePreference('repulsion',80);
    updatePreference('readingMode','STUDY');
    updatePreference('readingFontScale',1);
    updatePreference('readingLineHeight',1.62);
    updatePreference('readingAlign','LEFT');
    updatePreference('readingContrast',false);
    updatePreference('quickReadWpm',320);
    updatePreference('layoutMode','AUTO');
    updatePreference('readingTheme','NIGHT');
  };

  const renderTheme = () => (
    <div className="settings-choice-grid">
      {BUBBLE_THEMES.map((theme) => {
        const active = selectedTheme === theme.id;
        return (
          <button key={theme.id} type="button" aria-pressed={active} onClick={() => updatePreference('theme', theme.id)} className={`settings-choice-card ${active ? 'is-active' : ''}`}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="settings-choice-title">{theme.name}</div>
                <div className="settings-choice-note">{theme.subtitle}</div>
              </div>
              {active && <span className="settings-check">✓</span>}
            </div>
            <div className="settings-theme-preview" style={{ background: theme.preview }} />
            <span className={`settings-theme-source ${theme.source === 'DIA8' ? 'is-dia8' : 'is-dia8'}`}>{theme.source}</span>
          </button>
        );
      })}
    </div>
  );

  const renderBackground = () => (
    <div className="settings-choice-grid">
      {BACKGROUNDS.map((bg) => {
        const active = selectedBackground === bg.id;
        return (
          <button type="button" key={bg.id} aria-pressed={active} onClick={() => updatePreference('backgroundId', bg.id)} className={`settings-background-card ${active ? 'is-active' : ''}`} title={bg.name}>
            <img src={bg.image} alt={bg.name} />
            <span className="settings-background-label">{bg.name}</span>
            {active && <span className="settings-check settings-background-check">✓</span>}
          </button>
        );
      })}
    </div>
  );

  const renderBubble = () => (
    <div className="space-y-3">
      <ControlSlider label="Kích thước bong bóng" value={preferences.bubbleScale || 1} min={0.55} max={1.7} step={0.05} displayValue={`${Math.round((preferences.bubbleScale || 1) * 100)}%`} onChange={(v) => updatePreference('bubbleScale', v)} />
      <ControlSlider label="Cỡ chữ trên bong bóng" value={preferences.fontSize || 16} min={10} max={26} step={1} displayValue={`${preferences.fontSize || 16}px`} onChange={(v) => updatePreference('fontSize', v)} />
      <ControlSlider label="Độ trong" value={preferences.transparency || .8} min={.25} max={1} step={.05} displayValue={`${Math.round((preferences.transparency || .8) * 100)}%`} onChange={(v) => updatePreference('transparency', v)} />
      <ControlSlider label="Speed · tốc độ chuyển động" value={(preferences.intensity || 1) * 45} min={0} max={100} step={1} displayValue={`${Math.round((preferences.intensity || 1) * 45)}%`} onChange={(v) => updatePreference('intensity', v / 45)} />
      <ControlSlider label="Độ sáng tổng thể" value={preferences.brightness || 1} min={.55} max={1.65} step={.05} onChange={(v) => updatePreference('brightness', v)} />
      <div className="settings-dia8-control-group">
        <div className="settings-dia8-control-header">
          <div><strong>Bộ điều khiển thị giác Dia8</strong><small>Chuyển nguyên bản từ ứng dụng lớp 8 · tác động tức thời</small></div>
          <button type="button" onClick={() => {
            updatePreference('theme','D8_GROUPS');
            updatePreference('bubbleScale',1);
            updatePreference('fontSize',13);
            updatePreference('intensity',1);
            updatePreference('showBreathing',true);
            updatePreference('showDrifting',true);
            updatePreference('breathAmp',5);
            updatePreference('glowIntensity',55);
            updatePreference('saturation',65);
            updatePreference('driftForce',20);
            updatePreference('repulsion',80);
          }}>Khôi phục Dia8</button>
        </div>
        <ControlSlider label="Glow · ánh sáng neon" value={preferences.glowIntensity ?? 55} min={0} max={100} step={1} displayValue={`${Math.round(preferences.glowIntensity ?? 55)}%`} onChange={(v) => updatePreference('glowIntensity', v)} />
        <ControlSlider label="Color · độ bão hòa" value={preferences.saturation ?? 65} min={0} max={100} step={1} displayValue={`${Math.round(preferences.saturation ?? 65)}%`} onChange={(v) => updatePreference('saturation', v)} />
        <ControlSlider label="Breath · biên độ nhịp" value={preferences.breathAmp ?? 5} min={0} max={20} step={1} displayValue={`${Math.round(preferences.breathAmp ?? 5)}/20`} onChange={(v) => { updatePreference('breathAmp', v); updatePreference('showBreathing', v > 0); }} />
        <ControlSlider label="Drift · lực trôi" value={preferences.driftForce ?? 20} min={0} max={100} step={1} displayValue={`${Math.round(preferences.driftForce ?? 20)}%`} onChange={(v) => { updatePreference('driftForce', v); updatePreference('showDrifting', v > 0); }} />
        <ControlSlider label="Space · khoảng cách bong bóng" value={preferences.repulsion ?? 80} min={0} max={100} step={1} displayValue={`${Math.round(preferences.repulsion ?? 80)}%`} onChange={(v) => updatePreference('repulsion', v)} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <button type="button" onClick={() => updatePreference('showBreathing', !preferences.showBreathing)} className={`settings-toggle-card ${preferences.showBreathing ? 'is-active' : ''}`}>
          <span className="settings-toggle-orb pulse-orb" aria-hidden="true" />
          <span><strong>Nhịp đập</strong><small>{preferences.showBreathing ? 'Đang bật' : 'Đang tắt'}</small></span>
        </button>
        <button type="button" onClick={() => updatePreference('showDrifting', !preferences.showDrifting)} className={`settings-toggle-card ${preferences.showDrifting ? 'is-active' : ''}`}>
          <span className="settings-toggle-orb drift-orb" aria-hidden="true" />
          <span><strong>Chuyển động</strong><small>{preferences.showDrifting ? 'Đang bật' : 'Đang tắt'}</small></span>
        </button>
      </div>
    </div>
  );

  const renderReading = () => (
    <div className="space-y-3">
      <div className="settings-segmented" role="group" aria-label="Chế độ đọc">
        {([['COMPACT','Gọn'],['STUDY','Học'],['RESEARCH','Nghiên cứu']] as const).map(([value,label]) => (
          <button type="button" key={value} onClick={() => updatePreference('readingMode', value)} className={`${(preferences.readingMode || 'STUDY') === value ? 'is-active' : ''}`}>{label}</button>
        ))}
      </div>
      <ControlSlider label="Cỡ chữ đọc" value={preferences.readingFontScale || 1} min={0.86} max={1.34} step={0.04} displayValue={`${Math.round((preferences.readingFontScale || 1) * 100)}%`} onChange={(v) => updatePreference('readingFontScale', v)} />
      <ControlSlider label="Giãn dòng" value={preferences.readingLineHeight || 1.62} min={1.4} max={1.95} step={0.05} displayValue={(preferences.readingLineHeight || 1.62).toFixed(2)} onChange={(v) => updatePreference('readingLineHeight', v)} />
      <ControlSlider label="Tốc độ đọc nhanh" value={preferences.quickReadWpm || 320} min={160} max={720} step={20} displayValue={`${preferences.quickReadWpm || 320} từ/phút`} onChange={(v) => updatePreference('quickReadWpm', v)} />
      <div className="grid grid-cols-2 gap-3">
        <button type="button" onClick={() => updatePreference('readingAlign', preferences.readingAlign === 'JUSTIFY' ? 'LEFT' : 'JUSTIFY')} className={`settings-toggle-card ${preferences.readingAlign === 'JUSTIFY' ? 'is-active' : ''}`}>
          <span className="text-lg" aria-hidden="true">☰</span><span><strong>Căn đều</strong><small>{preferences.readingAlign === 'JUSTIFY' ? 'Đang bật' : 'Căn trái'}</small></span>
        </button>
        <button type="button" onClick={() => updatePreference('readingContrast', !preferences.readingContrast)} className={`settings-toggle-card ${preferences.readingContrast ? 'is-active' : ''}`}>
          <span className="contrast-disc" aria-hidden="true"/><span><strong>Tương phản</strong><small>{preferences.readingContrast ? 'Cao' : 'Tiêu chuẩn'}</small></span>
        </button>
      </div>
    </div>
  );

  const renderAppearance = () => (
    <div className="grid grid-cols-2 gap-3">
      <button type="button" onClick={() => updatePreference('readingTheme', 'DAY')} className={`settings-mode-card day-card ${(preferences.readingTheme || 'NIGHT') === 'DAY' ? 'is-active' : ''}`}>
        <span className="settings-mode-symbol" aria-hidden="true">☀</span>
        <strong>Ban ngày</strong>
        <small>Nền sáng, chữ tối, phù hợp phòng học</small>
      </button>
      <button type="button" onClick={() => updatePreference('readingTheme', 'NIGHT')} className={`settings-mode-card night-card ${(preferences.readingTheme || 'NIGHT') === 'NIGHT' ? 'is-active' : ''}`}>
        <span className="settings-mode-symbol" aria-hidden="true">☾</span>
        <strong>Ban đêm</strong>
        <small>Nền tối, giảm chói, giữ chất buồng lái</small>
      </button>
    </div>
  );

  const renderDevice = () => (
    <div className="space-y-3">
      {([['AUTO','Tự động','Ứng dụng tự nhận diện kích thước và cách cầm thiết bị.'],['MOBILE','Mobile','Ưu tiên nút chạm, thanh điều hướng dưới và khung đọc toàn màn hình.'],['DESKTOP','Desktop','Tận dụng màn hình rộng, vùng đọc dài và nhiều công cụ cùng lúc.']] as const).map(([value,label,note]) => (
        <button type="button" key={value} onClick={() => updatePreference('layoutMode', value)} className={`settings-device-row ${(preferences.layoutMode || 'AUTO') === value ? 'is-active' : ''}`}>
          <span className="settings-device-icon"><SettingsGlyph section="DEVICE" size={23}/></span>
          <span><strong>{label}</strong><small>{note}</small></span>
          <span className="settings-radio" aria-hidden="true" />
        </button>
      ))}
    </div>
  );

  const renderActiveSection = () => {
    if (activeSection === 'THEME') return renderTheme();
    if (activeSection === 'BACKGROUND') return renderBackground();
    if (activeSection === 'BUBBLE') return renderBubble();
    if (activeSection === 'READING') return renderReading();
    if (activeSection === 'APPEARANCE') return renderAppearance();
    return renderDevice();
  };

  return (
    <div ref={dialogRef} tabIndex={-1} className="canvas-options-dialog" role="dialog" aria-modal="true" aria-label="Công cụ tùy chỉnh giao diện">
      <div className="canvas-options-shell">
        <div className="canvas-options-header">
          <div>
            <div className="canvas-options-kicker">Điều khiển trực quan</div>
            <h3>Tùy chỉnh</h3>
            <p>Chọn một cụm tính năng, sau đó quan sát thay đổi trực tiếp trên ứng dụng.</p>
          </div>
          <button type="button" onClick={onClose} className="canvas-options-close" aria-label="Đóng công cụ tùy chỉnh" title="Đóng (Esc)"><CloseGlyph/></button>
        </div>

        <div className="settings-category-grid" role="tablist" aria-label="Nhóm tùy chỉnh">
          {SECTION_META.map((section) => {
            const active = activeSection === section.id;
            return (
              <button
                type="button"
                role="tab"
                aria-selected={active}
                key={section.id}
                onClick={() => setActiveSection(section.id)}
                className={`settings-category-button ${active ? 'is-active' : ''}`}
                title={section.hint}
              >
                <span className="settings-category-icon"><SettingsGlyph section={section.id}/></span>
                <span className="settings-category-label">{section.shortLabel}</span>
                <span className="settings-category-dot" aria-hidden="true"/>
              </button>
            );
          })}
        </div>

        <section className="settings-detail-panel" role="tabpanel" aria-live="polite">
          <div className="settings-detail-header">
            <span className="settings-detail-icon"><SettingsGlyph section={activeSection} size={25}/></span>
            <div>
              <h4>{activeMeta.label}</h4>
              <p>{activeMeta.hint}</p>
            </div>
          </div>
          <div key={activeSection} className="settings-detail-content">{renderActiveSection()}</div>
        </section>

        <div className="canvas-options-footer">
          <button type="button" onClick={resetDefaults}>Khôi phục mặc định</button>
          <span>6 cụm điều khiển · thay đổi tức thời</span>
        </div>
      </div>
    </div>
  );
};

export default CanvasOptionsDialog;
