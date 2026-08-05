import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { getDateKey } from '../utils/motivation';

export interface WorkSession {
  date: string;
  startMs: number;
  endMs: number;
}

interface MotivationState {
  goalHoursByDate: Record<string, number>;
  manualMsByDate:  Record<string, number>;
  sessions:  WorkSession[];
  running:   { startedAt: number } | null;

  setGoalHours:  (date: string, hours: number) => void;
  addManualMs:   (date: string, ms: number) => void;
  clearManualMs: (date: string) => void;
  clearAll: () => void;
  start: () => void;
  stop:  () => void;
}

export const useMotivationStore = create<MotivationState>()(
  persist(
    (set, get) => ({
      goalHoursByDate: {},
      manualMsByDate:  {},
      sessions:  [],
      running:   null,

      setGoalHours: (date, hours) =>
        set(state => ({ goalHoursByDate: { ...state.goalHoursByDate, [date]: hours } })),

      addManualMs: (date, ms) =>
        set(state => ({
          manualMsByDate: {
            ...state.manualMsByDate,
            [date]: (state.manualMsByDate[date] ?? 0) + ms,
          },
        })),

      clearManualMs: (date) =>
        set(state => {
          const next = { ...state.manualMsByDate };
          delete next[date];
          return { manualMsByDate: next };
        }),

      clearAll: () => set({ goalHoursByDate: {}, manualMsByDate: {}, sessions: [], running: null }),

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
    {
      name: 'chesstise-motivation',
      version: 3,
      migrate: (persisted: any, version: number) => {
        if (version < 3) {
          // v1: flat goalHoursByDate / manualMsByDate
          // v2: goalHoursByDateByType / manualMsByDateByType (chess + zazen)
          const byType    = persisted.goalHoursByDateByType;
          const manByType = persisted.manualMsByDateByType;
          return {
            goalHoursByDate: byType    ? (byType.chess    ?? {}) : (persisted.goalHoursByDate    ?? {}),
            manualMsByDate:  manByType ? (manByType.chess ?? {}) : (persisted.manualMsByDate ?? {}),
            sessions: (persisted.sessions ?? []).map(({ type: _t, ...s }: any) => s),
            running:  persisted.running ? { startedAt: persisted.running.startedAt } : null,
          };
        }
        return persisted as MotivationState;
      },
    },
  ),
);
