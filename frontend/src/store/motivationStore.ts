import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { getDateKey } from '../utils/motivation';

export interface WorkSession {
  date: string; // YYYY-MM-DD, the day the session started
  startMs: number;
  endMs: number;
}

interface MotivationState {
  goalHoursByDate: Record<string, number>;
  manualMsByDate: Record<string, number>;
  sessions: WorkSession[];
  running: { startedAt: number } | null;
  setGoalHours: (date: string, hours: number) => void;
  addManualMs: (date: string, ms: number) => void;
  clearManualMs: (date: string) => void;
  start: () => void;
  stop: () => void;
}

export const useMotivationStore = create<MotivationState>()(
  persist(
    (set, get) => ({
      goalHoursByDate: {},
      manualMsByDate: {},
      sessions: [],
      running: null,

      setGoalHours: (date, hours) =>
        set(state => ({ goalHoursByDate: { ...state.goalHoursByDate, [date]: hours } })),

      addManualMs: (date, ms) =>
        set(state => ({ manualMsByDate: { ...state.manualMsByDate, [date]: (state.manualMsByDate[date] ?? 0) + ms } })),

      clearManualMs: (date) =>
        set(state => {
          const next = { ...state.manualMsByDate };
          delete next[date];
          return { manualMsByDate: next };
        }),

      start: () => {
        if (get().running) return;
        set({ running: { startedAt: Date.now() } });
      },

      stop: () => {
        const running = get().running;
        if (!running) return;
        const endMs = Date.now();
        set(state => ({
          sessions: [
            ...state.sessions,
            { date: getDateKey(new Date(running.startedAt)), startMs: running.startedAt, endMs },
          ],
          running: null,
        }));
      },
    }),
    { name: 'chesstise-motivation' },
  ),
);
