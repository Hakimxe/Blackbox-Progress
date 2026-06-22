import { customAlphabet } from "nanoid";

const slugRand = customAlphabet(
  "abcdefghijklmnopqrstuvwxyz0123456789",
  6
);

export function slugify(name: string): string {
  const base = name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 32);
  const rand = slugRand();
  return base ? `${base}-${rand}` : rand;
}

export function ymd(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function prettyDate(iso: string): string {
  const d = new Date(iso + (iso.length <= 10 ? "T00:00:00" : ""));
  return d.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

export function todayLong(): string {
  return new Date().toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

export function pct(done: number, total: number): number {
  if (!total) return 0;
  return Math.round((done / total) * 100);
}

export function yesterday(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return ymd(d);
}

// Count consecutive days (ending today) where there is a row of given dates.
export function calcStreak(dates: string[]): number {
  if (!dates.length) return 0;
  const set = new Set(dates);
  let streak = 0;
  const cur = new Date();
  // We count today if present, otherwise start from yesterday (so the streak
  // doesn't break the moment a new day starts before submission).
  if (!set.has(ymd(cur))) cur.setDate(cur.getDate() - 1);
  while (set.has(ymd(cur))) {
    streak++;
    cur.setDate(cur.getDate() - 1);
  }
  return streak;
}

export function relDay(iso: string): string {
  if (iso === ymd()) return "Today";
  if (iso === yesterday()) return "Yesterday";
  return prettyDate(iso);
}
