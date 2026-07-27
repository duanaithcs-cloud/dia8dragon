import { UIPreferences } from '../types';

export const defaultUI: UIPreferences = {
  theme: 'D8_ZALO', showBreathing: true, showDrifting: true, showShimmering: true,
  fontSize: 13, intensity: 1.0, transparency: 0.8, brightness: 1.0,
  bubbleScale: 1.0, breathAmp: 5, glowIntensity: 55, saturation: 65,
  driftForce: 20, repulsion: 80, backgroundId: 'ORIGINAL_DRAGON',
  readingMode: 'STUDY', readingFontScale: 1.0, readingLineHeight: 1.62,
  readingAlign: 'LEFT', readingContrast: false, quickReadWpm: 320,
  layoutMode: 'AUTO', readingTheme: 'NIGHT', allowAiProcessing: false,
  reduceMotion: false, accessibleText: true, visualQuality: 'LOW'
};

export const normalizeCanvasTheme = (theme: unknown): UIPreferences['theme'] => {
  const supported: UIPreferences['theme'][] = [
    'D8_ZALO', 'D8_NEON', 'D8_GROUPS', 'D8_AURORA', 'D8_SUNSET', 'D8_DARK',
    'ORIGINAL', 'SOLAR_SYSTEM', 'CORAL_REEF', 'AURORA'
  ];
  const legacyMap: Record<string, UIPreferences['theme']> = {
    CRYPTO: 'ORIGINAL', ZALO: 'D8_ZALO', NEON: 'D8_NEON',
    SUNSET: 'D8_SUNSET', DARK: 'D8_DARK'
  };
  if (typeof theme === 'string' && legacyMap[theme]) return legacyMap[theme];
  return supported.includes(theme as UIPreferences['theme']) ? theme as UIPreferences['theme'] : 'D8_ZALO';
};
