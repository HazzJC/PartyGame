import { useEffect } from 'react';

/** Keeps phones awake during a game (iOS 16.4+, Android Chrome). Silently no-ops elsewhere. */
export function useWakeLock(): void {
  useEffect(() => {
    let lock: WakeLockSentinel | null = null;
    let cancelled = false;
    const request = async () => {
      if (cancelled || document.visibilityState !== 'visible' || !('wakeLock' in navigator)) return;
      try {
        lock = await navigator.wakeLock.request('screen');
      } catch {
        // Needs a user gesture on some browsers; retried on the next interaction.
      }
    };
    const onVisible = () => void request();
    void request();
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('pointerdown', onVisible, { once: true });
    return () => {
      cancelled = true;
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('pointerdown', onVisible);
      void lock?.release().catch(() => undefined);
    };
  }, []);
}
