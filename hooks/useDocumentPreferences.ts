import { useEffect } from 'react';
import { UIPreferences } from '../types';

export const useDocumentPreferences = (preferences: UIPreferences): void => {
  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty('--reader-font-scale', String(preferences.readingFontScale || 1));
    root.style.setProperty('--reader-line-height', String(preferences.readingLineHeight || 1.62));
    root.style.setProperty('--reader-wpm', String(preferences.quickReadWpm || 320));
    root.dataset.readingMode = preferences.readingMode || 'STUDY';
    root.dataset.readingAlign = preferences.readingAlign || 'LEFT';
    root.dataset.readingContrast = preferences.readingContrast ? 'HIGH' : 'NORMAL';
    root.dataset.uiLayout = preferences.layoutMode || 'AUTO';
    root.dataset.readingTheme = preferences.readingTheme || 'NIGHT';
    root.dataset.reduceMotion = preferences.reduceMotion ? 'REDUCE' : 'FULL';
    root.dataset.accessibleText = preferences.accessibleText === false ? 'OFF' : 'ON';
    window.requestAnimationFrame(() => window.dispatchEvent(new Event('resize')));
  }, [preferences]);
};
