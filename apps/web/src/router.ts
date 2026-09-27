import { useSyncExternalStore } from 'react';

const listeners = new Set<() => void>();
const notify = () => listeners.forEach((l) => l());
window.addEventListener('popstate', notify);

export function navigate(path: string, opts: { replace?: boolean } = {}): void {
  if (opts.replace) history.replaceState(null, '', path);
  else history.pushState(null, '', path);
  notify();
}

export function useLocation(): string {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => location.pathname,
  );
}

/** Reads a value from the URL hash (#key=value) — used for secret tokens that must never hit the network. */
export function hashParam(key: string): string | null {
  return new URLSearchParams(location.hash.slice(1)).get(key);
}
