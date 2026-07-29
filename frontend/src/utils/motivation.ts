// The daily "work window" the plan is spread across: 8:00 through midnight.
export const WINDOW_START_HOUR = 8;
export const WINDOW_END_HOUR = 24;
export const WINDOW_HOURS = WINDOW_END_HOUR - WINDOW_START_HOUR; // 16

export function getDateKey(d: Date = new Date()): string {
  const y   = d.getFullYear();
  const m   = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

// Fraction of the 8:00–24:00 window elapsed at `now`, clamped to [0, 1].
export function windowFraction(now: Date = new Date()): number {
  const hours = now.getHours() + now.getMinutes() / 60 + now.getSeconds() / 3600;
  return Math.min(1, Math.max(0, (hours - WINDOW_START_HOUR) / WINDOW_HOURS));
}

// Hours of work that should be banked by `now` if effort were spread evenly
// across the whole window.
export function expectedHours(goalHours: number, now: Date = new Date()): number {
  return goalHours * windowFraction(now);
}

// Clock time (as a Date on the same day as `now`) by which the current amount
// of banked work "covers" you — i.e. you're free until this time.
export function freeUntil(actualHours: number, goalHours: number, now: Date = new Date()): Date {
  const fraction = goalHours > 0 ? Math.min(1, actualHours / goalHours) : 0;
  const hours = WINDOW_START_HOUR + fraction * WINDOW_HOURS;
  const result = new Date(now);
  result.setHours(0, 0, 0, 0);
  result.setMilliseconds(hours * 3600_000);
  return result;
}

export function formatClock(d: Date): string {
  return d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
}

export function formatHM(ms: number): string {
  const totalMin = Math.round(ms / 60000);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  if (h <= 0) return `${m}m`;
  return `${h}h ${m}m`;
}
