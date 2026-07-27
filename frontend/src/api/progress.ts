import type { RunResult } from '../types';
import api from './client';

interface SessionResponse {
  id: string;
  exerciseType: string;
  shown: number;
  correct: number;
  startedAt: string;
  endedAt: string | null;
  hintEnabled: boolean | null;
  perspective: string | null;
}

export async function saveCellGuesserRun(run: RunResult): Promise<void> {
  const startedAt = new Date(run.date);
  const endedAt   = new Date(startedAt.getTime() + run.timeMs);
  await api.post('/progress', {
    exerciseType: 'CellGuesser',
    shown:        run.total,
    correct:      run.correct,
    startedAt:    startedAt.toISOString(),
    endedAt:      endedAt.toISOString(),
    hintEnabled:  run.hint  ?? true,
    perspective:  run.perspective ?? 'both',
  });
}

export async function fetchCellGuesserRuns(): Promise<RunResult[]> {
  const { data } = await api.get<SessionResponse[]>('/progress');
  return data
    .filter(s => s.exerciseType === 'CellGuesser')
    .map(s => ({
      timeMs:      s.endedAt
                     ? new Date(s.endedAt).getTime() - new Date(s.startedAt).getTime()
                     : 0,
      correct:     s.correct,
      total:       s.shown,
      hint:        s.hintEnabled ?? true,
      perspective: (s.perspective ?? 'both') as RunResult['perspective'],
      date:        s.startedAt,
    }));
}

export async function saveSquareColorRun(run: RunResult): Promise<void> {
  const startedAt = new Date(run.date);
  const endedAt   = new Date(startedAt.getTime() + run.timeMs);
  await api.post('/progress', {
    exerciseType: 'SquareColor',
    shown:        run.total,
    correct:      run.correct,
    startedAt:    startedAt.toISOString(),
    endedAt:      endedAt.toISOString(),
    hintEnabled:  null,
    perspective:  null,
  });
}

export async function fetchSquareColorRuns(): Promise<RunResult[]> {
  const { data } = await api.get<SessionResponse[]>('/progress');
  return data
    .filter(s => s.exerciseType === 'SquareColor')
    .map(s => ({
      timeMs:  s.endedAt
                 ? new Date(s.endedAt).getTime() - new Date(s.startedAt).getTime()
                 : 0,
      correct: s.correct,
      total:   s.shown,
      date:    s.startedAt,
    }));
}

export async function saveBlindPathingRun(run: RunResult): Promise<void> {
  const startedAt = new Date(run.date);
  const endedAt   = new Date(startedAt.getTime() + run.timeMs);
  await api.post('/progress', {
    exerciseType: 'BlindPathing',
    shown:        run.total,
    correct:      run.correct,
    startedAt:    startedAt.toISOString(),
    endedAt:      endedAt.toISOString(),
    hintEnabled:  null,
    perspective:  run.subDrill ?? null,
  });
}

export async function fetchBlindPathingRuns(): Promise<RunResult[]> {
  const { data } = await api.get<SessionResponse[]>('/progress');
  return data
    .filter(s => s.exerciseType === 'BlindPathing')
    .map(s => ({
      timeMs:    s.endedAt
                   ? new Date(s.endedAt).getTime() - new Date(s.startedAt).getTime()
                   : 0,
      correct:   s.correct,
      total:     s.shown,
      subDrill:  s.perspective ?? undefined,
      date:      s.startedAt,
    }));
}
