/** Seat tokens live in localStorage (survive refresh); host tokens in sessionStorage (per tab). */
function safe<T>(fn: () => T, fallback: T): T {
  try {
    return fn();
  } catch {
    return fallback;
  }
}

export const seatStore = {
  get: (code: string) => safe(() => localStorage.getItem(`seat:${code}`), null),
  set: (code: string, token: string) => safe(() => localStorage.setItem(`seat:${code}`, token), undefined),
  clear: (code: string) => safe(() => localStorage.removeItem(`seat:${code}`), undefined),
};

export const hostStore = {
  get: (code: string) => safe(() => sessionStorage.getItem(`host:${code}`), null),
  set: (code: string, token: string) => safe(() => sessionStorage.setItem(`host:${code}`, token), undefined),
};

export const prefs = {
  get: (key: string) => safe(() => localStorage.getItem(`pref:${key}`), null),
  set: (key: string, value: string) => safe(() => localStorage.setItem(`pref:${key}`, value), undefined),
};

/** Personal player link. The token lives in the hash so it is never sent in requests or referrers. */
export function seatLink(code: string, token: string): string {
  return `${location.origin}/${code}#seat=${encodeURIComponent(token)}`;
}

export function joinLink(code: string): string {
  return `${location.origin}/${code}`;
}
