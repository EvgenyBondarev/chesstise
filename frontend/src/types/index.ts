export type ExerciseType =
  | 'cell-guesser'
  | 'square-color'
  | 'blind-pathing';

export type BoardOrientation = 'white' | 'black';
export type SquareColor = 'light' | 'dark';
export type Quadrant = 1 | 2 | 3 | 4;
export type PieceType = 'n' | 'b' | 'r' | 'q' | 'k';

export interface SessionStats {
  shown: number;
  correct: number;
  accuracy: number;
}

export interface RunResult {
  timeMs: number;
  correct: number;
  total: number;
  hint?: boolean;                          // undefined → treat as hint=true (easier)
  perspective?: 'white' | 'black' | 'both'; // undefined → treat as single-side (easier)
  subDrill?: string;                       // BlindPathing sub-drill ('king', 'queen', …, 'initial')
  date: string; // ISO datetime
}
