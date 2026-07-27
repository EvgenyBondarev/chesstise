import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { RunResult } from '../types';

interface ProfileState {
  cellGuesserRuns: RunResult[];
  squareColorRuns: RunResult[];
  blindPathingRuns: RunResult[];
  speechRate: number;
  markedGames: string[];
  addCellGuesserRun: (run: RunResult) => void;
  addSquareColorRun: (run: RunResult) => void;
  addBlindPathingRun: (run: RunResult) => void;
  removeBlindPathingRun: (date: string) => void;
  setSpeechRate: (rate: number) => void;
  toggleMarkedGame: (id: string) => void;
}

export const useProfileStore = create<ProfileState>()(
  persist(
    (set) => ({
      cellGuesserRuns: [],
      squareColorRuns: [],
      blindPathingRuns: [],
      speechRate: 10,
      markedGames: [],

      addCellGuesserRun: (run) =>
        set(state => ({ cellGuesserRuns: [...state.cellGuesserRuns, run] })),

      addSquareColorRun: (run) =>
        set(state => ({ squareColorRuns: [...state.squareColorRuns, run] })),

      addBlindPathingRun: (run) =>
        set(state => ({ blindPathingRuns: [...state.blindPathingRuns, run] })),

      removeBlindPathingRun: (date) =>
        set(state => ({ blindPathingRuns: state.blindPathingRuns.filter(r => r.date !== date) })),

      setSpeechRate: (rate) => set({ speechRate: rate }),

      toggleMarkedGame: (id) => set(state => ({
        markedGames: state.markedGames.includes(id)
          ? state.markedGames.filter(x => x !== id)
          : [...state.markedGames, id],
      })),
    }),
    { name: 'chesstise-profile' },
  ),
);
