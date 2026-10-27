// Save files, kept in the browser's local storage (one entry per slot).

export const SLOTS = 8;
const KEY = (n) => `skeleton-house:save:${n}`;

export function readSave(n) {
  try {
    const raw = localStorage.getItem(KEY(n));
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function writeSave(n, data) {
  try {
    localStorage.setItem(KEY(n), JSON.stringify({ ...data, savedAt: Date.now() }));
    return true;
  } catch {
    return false;
  }
}

export function listSaves() {
  return Array.from({ length: SLOTS }, (_, i) => readSave(i + 1));
}

export const hasSaves = () => listSaves().some(Boolean);

/** 1234.5 seconds → "00:20:34" */
export function formatPlaytime(s) {
  s = Math.floor(s || 0);
  const pad = (v) => String(v).padStart(2, '0');
  return `${pad(Math.floor(s / 3600))}:${pad(Math.floor(s / 60) % 60)}:${pad(s % 60)}`;
}
