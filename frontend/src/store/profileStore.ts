import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { RunResult } from '../types';
import {
  saveCellGuesserRun,
  fetchCellGuesserRuns,
  saveSquareColorRun,
  fetchSquareColorRuns,
  saveBlindPathingRun,
  fetchBlindPathingRuns,
} from '../api/progress';
import { useAuthStore } from './authStore';

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
  loadRunsFromApi: () => Promise<void>;
}

const toMs = (r: RunResult) => new Date(r.date).getTime();

// Remove duplicate runs by timestamp — guards against concurrent saves writing the same
// run to the API more than once (e.g. React StrictMode double-invoking effects).
function dedup(runs: RunResult[]): RunResult[] {
  const seen = new Set<number>();
  return runs.filter(r => {
    const t = toMs(r);
    return seen.has(t) ? false : (seen.add(t), true);
  });
}

export const useProfileStore = create<ProfileState>()(
  persist(
    (set, get) => ({
      cellGuesserRuns: [],
      squareColorRuns: [],
      blindPathingRuns: [],
      speechRate: 10,
      markedGames: [],

      addCellGuesserRun: (run) => {
        set(state => ({ cellGuesserRuns: [...state.cellGuesserRuns, run] }));
        const { token } = useAuthStore.getState();
        if (token) saveCellGuesserRun(run).catch(console.error);
      },

      addSquareColorRun: (run) => {
        set(state => ({ squareColorRuns: [...state.squareColorRuns, run] }));
        const { token } = useAuthStore.getState();
        if (token) saveSquareColorRun(run).catch(console.error);
      },

      addBlindPathingRun: (run) => {
        set(state => ({ blindPathingRuns: [...state.blindPathingRuns, run] }));
        const { token } = useAuthStore.getState();
        if (token) saveBlindPathingRun(run).catch(console.error);
      },

      removeBlindPathingRun: (date) => {
        set(state => ({ blindPathingRuns: state.blindPathingRuns.filter(r => r.date !== date) }));
      },

      setSpeechRate: (rate) => set({ speechRate: rate }),

      toggleMarkedGame: (id) => set(state => ({
        markedGames: state.markedGames.includes(id)
          ? state.markedGames.filter(x => x !== id)
          : [...state.markedGames, id],
      })),

      loadRunsFromApi: async () => {
        const { token } = useAuthStore.getState();
        if (!token) return;
        try {
          const [apiCellRuns, apiColorRuns, apiBlindRuns] = await Promise.all([
            fetchCellGuesserRuns(),
            fetchSquareColorRuns(),
            fetchBlindPathingRuns(),
          ]);

          const uniqueCell  = dedup(apiCellRuns);
          const uniqueColor = dedup(apiColorRuns);
          const uniqueBlind = dedup(apiBlindRuns);

          const cellApiMs     = new Set(uniqueCell.map(toMs));
          const cellLocalOnly = get().cellGuesserRuns.filter(r => !cellApiMs.has(toMs(r)));
          for (const run of cellLocalOnly) saveCellGuesserRun(run).catch(console.error);
          const mergedCell = dedup([...uniqueCell, ...cellLocalOnly])
            .sort((a, b) => toMs(a) - toMs(b));

          const colorApiMs     = new Set(uniqueColor.map(toMs));
          const colorLocalOnly = get().squareColorRuns.filter(r => !colorApiMs.has(toMs(r)));
          for (const run of colorLocalOnly) saveSquareColorRun(run).catch(console.error);
          const mergedColor = dedup([...uniqueColor, ...colorLocalOnly])
            .sort((a, b) => toMs(a) - toMs(b));

          const blindApiMs     = new Set(uniqueBlind.map(toMs));
          const blindLocalOnly = get().blindPathingRuns.filter(r => !blindApiMs.has(toMs(r)));
          for (const run of blindLocalOnly) saveBlindPathingRun(run).catch(console.error);
          const mergedBlind = dedup([...uniqueBlind, ...blindLocalOnly])
            .sort((a, b) => toMs(a) - toMs(b));

          set({ cellGuesserRuns: mergedCell, squareColorRuns: mergedColor, blindPathingRuns: mergedBlind });
        } catch (err) {
          console.error('Failed to load runs from API', err);
        }
      },
    }),
    { name: 'chesstise-profile' },
  ),
);
