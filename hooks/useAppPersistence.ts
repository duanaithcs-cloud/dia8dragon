import { useEffect, useRef } from 'react';
import { AppState, ArenaStats } from '../types';
import { persistCurrentData, saveBackup } from '../utils/dataPersistence';

export const useAppPersistence = (state: AppState, arenaStore: Record<number, ArenaStats>): void => {
  const lastBackupAtRef = useRef(0);
  const previousIdentityRef = useRef(`${state.user_profile.fullName || ''}|${state.user_profile.className || ''}`);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      persistCurrentData(state, arenaStore);
      const now = Date.now();
      const identity = `${state.user_profile.fullName || ''}|${state.user_profile.className || ''}`;
      const identityChanged = identity !== previousIdentityRef.current;
      if (identityChanged || now - lastBackupAtRef.current >= 5 * 60 * 1000) {
        saveBackup(state, arenaStore, identityChanged ? 'Cập nhật hồ sơ' : 'Sao lưu tự động');
        lastBackupAtRef.current = now;
        previousIdentityRef.current = identity;
      }
    }, 500);
    return () => window.clearTimeout(timer);
  }, [state, arenaStore]);
};
