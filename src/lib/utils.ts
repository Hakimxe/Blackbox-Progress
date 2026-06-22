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

// "just now" / "2m ago" / "1h ago" / "3d ago". Accepts SQLite "YYYY-MM-DD HH:MM:SS"
// (assumed UTC, like SQLite's datetime('now')) or ISO 8601 with timezone.
export function relTime(input: string | null | undefined): string {
  if (!input) return "";
  // SQLite "YYYY-MM-DD HH:MM:SS" has no timezone — treat as UTC.
  const normalized = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(input)
    ? input.replace(" ", "T") + "Z"
    : input;
  const then = new Date(normalized).getTime();
  if (Number.isNaN(then)) return "";
  const diff = Math.max(0, Date.now() - then);
  const s = Math.floor(diff / 1000);
  if (s < 45) return "just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d}d ago`;
  const mo = Math.floor(d / 30);
  if (mo < 12) return `${mo}mo ago`;
  return `${Math.floor(mo / 12)}y ago`;
}

// Whole days since a SQLite/ISO timestamp. Returns 0 for "today".
export function daysAgo(input: string | null | undefined): number {
  if (!input) return 0;
  const normalized = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(input)
    ? input.replace(" ", "T") + "Z"
    : input;
  const then = new Date(normalized).getTime();
  if (Number.isNaN(then)) return 0;
  return Math.max(0, Math.floor((Date.now() - then) / 86_400_000));
}
