import { create } from 'zustand';
import type { ExerciseType, SessionStats } from '../types';

const blank = (): SessionStats => ({ shown: 0, correct: 0, accuracy: 0 });

interface SessionState {
  stats: Record<ExerciseType, SessionStats>;
  recordAttempt: (type: ExerciseType, correct: boolean) => void;
  resetStats: (type: ExerciseType) => void;
}

export const useSessionStore = create<SessionState>((set) => ({
  stats: {
    'cell-guesser': blank(),
    'square-color': blank(),
    'blind-pathing': blank(),
  },

  recordAttempt: (type, correct) =>
    set(state => {
      const prev = state.stats[type];
      const shown    = prev.shown + 1;
      const correctN = prev.correct + (correct ? 1 : 0);
      return {
        stats: {
          ...state.stats,
          [type]: {
            shown,
            correct: correctN,
            accuracy: Math.round((correctN / shown) * 100),
          },
        },
      };
    }),

  resetStats: (type) =>
    set(state => ({ stats: { ...state.stats, [type]: blank() } })),
}));
