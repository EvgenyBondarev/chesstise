import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { getDateKey } from '../utils/motivation';

export type GoalType = 'chess' | 'zazen';

export const GOAL_LABELS: Record<GoalType, string> = {
  chess: '♟ Chess',
  zazen: '◯ Zazen',
};

export const GOAL_ACTION: Record<GoalType, string> = {
  chess: 'play',
  zazen: 'meditate',
};

export interface WorkSession {
  date: string;
  startMs: number;
  endMs: number;
  type: GoalType;
}

interface MotivationState {
  goalHoursByDateByType: Record<GoalType, Record<string, number>>;
  manualMsByDateByType:  Record<GoalType, Record<string, number>>;
  sessions:   WorkSession[];
  running:    { startedAt: number; type: GoalType } | null;
  activeGoal: GoalType;

  setGoalHours:  (type: GoalType, date: string, hours: number) => void;
  addManualMs:   (type: GoalType, date: string, ms: number) => void;
  clearManualMs: (type: GoalType, date: string) => void;
  setActiveGoal: (type: GoalType) => void;
  start: (type: GoalType) => void;
  stop:  () => void;
}

export const useMotivationStore = create<MotivationState>()(
  persist(
    (set, get) => ({
      goalHoursByDateByType: { chess: {}, zazen: {} },
      manualMsByDateByType:  { chess: {}, zazen: {} },
      sessions:   [],
      running:    null,
      activeGoal: 'chess',

      setGoalHours: (type, date, hours) =>
        set(state => ({
          goalHoursByDateByType: {
            ...state.goalHoursByDateByType,
            [type]: { ...state.goalHoursByDateByType[type], [date]: hours },
          },
        })),

      addManualMs: (type, date, ms) =>
        set(state => ({
          manualMsByDateByType: {
            ...state.manualMsByDateByType,
            [type]: {
              ...state.manualMsByDateByType[type],
              [date]: (state.manualMsByDateByType[type]?.[date] ?? 0) + ms,
            },
          },
        })),

      clearManualMs: (type, date) =>
        set(state => {
          const next = { ...state.manualMsByDateByType[type] };
          delete next[date];
          return { manualMsByDateByType: { ...state.manualMsByDateByType, [type]: next } };
        }),

      setActiveGoal: (type) => set({ activeGoal: type }),

      start: (type) => {
        if (get().running) return;
        set({ running: { startedAt: Date.now(), type } });
      },

      stop: () => {
        const running = get().running;
        if (!running) return;
        const endMs = Date.now();
        set(state => ({
          sessions: [
            ...state.sessions,
            { date: getDateKey(new Date(running.startedAt)), startMs: running.startedAt, endMs, type: running.type },
          ],
          running: null,
        }));
      },
    }),
    {
      name: 'chesstise-motivation',
      version: 2,
      migrate: (persisted: any, version: number) => {
        if (version < 2) {
          return {
            goalHoursByDateByType: {
              chess: persisted.goalHoursByDate ?? {},
              zazen: {},
            },
            manualMsByDateByType: {
              chess: persisted.manualMsByDate ?? {},
              zazen: {},
            },
            sessions: (persisted.sessions ?? []).map((s: any) => ({ ...s, type: 'chess' as GoalType })),
            running: persisted.running ? { ...persisted.running, type: 'chess' as GoalType } : null,
            activeGoal: 'chess' as GoalType,
          };
        }
        return persisted as MotivationState;
      },
    },
  ),
);
