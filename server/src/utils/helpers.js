export const DAY_MS = 24 * 60 * 60 * 1000;

// Strict YYYY-MM-DD parser. Rejects impossible dates such as 2026-02-31
// (JavaScript would silently roll those over to 3 March).
export function parseDay(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const date = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(date.valueOf()) || date.toISOString().slice(0, 10) !== value) return null;
  return date;
}

export const escapeRegex = text => String(text).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export const isId = value => typeof value === 'string' && /^[a-f0-9]{24}$/i.test(value);

// Runs one task at a time per key (used so two people cannot book the same room at the same moment).
const locks = new Map();
export async function withLock(key, task) {
  const previous = locks.get(key) || Promise.resolve();
  let release;
  const gate = new Promise(resolve => { release = resolve; });
  const tail = previous.then(() => gate);
  locks.set(key, tail);
  await previous;
  try {
    return await task();
  } finally {
    release();
    if (locks.get(key) === tail) locks.delete(key);
  }
}
