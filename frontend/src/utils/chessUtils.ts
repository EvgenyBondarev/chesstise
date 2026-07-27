import type { Square } from 'chess.js';
import type { BoardOrientation, PieceType, Quadrant, SquareColor } from '../types';

const FILES = 'abcdefgh'.split('');
const RANKS = [1, 2, 3, 4, 5, 6, 7, 8];

export const ALL_SQUARES: Square[] = FILES.flatMap(f =>
  RANKS.map(r => `${f}${r}` as Square)
);

export function getFileIndex(sq: Square): number {
  return sq.charCodeAt(0) - 96; // a=1 … h=8
}

export function getRankIndex(sq: Square): number {
  return parseInt(sq[1]);
}

// (file + rank) even → dark; odd → light  (a=1, b=2 …)
export function getSquareColor(sq: Square): SquareColor {
  return (getFileIndex(sq) + getRankIndex(sq)) % 2 === 0 ? 'dark' : 'light';
}

// Visual quadrant as the user sees it on screen:
//   Q1 = bottom-left, Q2 = bottom-right, Q3 = top-left, Q4 = top-right
export function getVisualQuadrant(sq: Square, orientation: BoardOrientation): Quadrant {
  const f = getFileIndex(sq);
  const r = getRankIndex(sq);

  if (orientation === 'white') {
    const left   = f <= 4;
    const bottom = r <= 4;
    if ( left &&  bottom) return 1;
    if (!left &&  bottom) return 2;
    if ( left && !bottom) return 3;
    return 4;
  } else {
    // Board flipped: h8 is bottom-left, a1 is top-right
    const left   = f >= 5; // files e-h appear on the left
    const bottom = r >= 5; // ranks 5-8 appear at the bottom
    if ( left &&  bottom) return 1;
    if (!left &&  bottom) return 2;
    if ( left && !bottom) return 3;
    return 4;
  }
}

export function getSquaresInQuadrant(q: Quadrant, orientation: BoardOrientation): Square[] {
  return ALL_SQUARES.filter(sq => getVisualQuadrant(sq, orientation) === q);
}

export function shuffleArray<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// After a shuffle, fix any consecutive duplicates by swapping with the next distinct element.
export function noConsecDupes<T>(arr: T[], key: (item: T) => string): T[] {
  const a = [...arr];
  for (let i = 1; i < a.length; i++) {
    if (key(a[i]) === key(a[i - 1])) {
      for (let j = i + 1; j < a.length; j++) {
        if (key(a[j]) !== key(a[i - 1])) {
          [a[i], a[j]] = [a[j], a[i]];
          break;
        }
      }
    }
  }
  return a;
}

export function randomElement<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

// Parse user input like "c1g5" into { from, to }
export function parseBlindMove(input: string): { from: Square; to: Square } | null {
  const s = input.trim().toLowerCase();
  if (s.length !== 4) return null;
  const from = s.slice(0, 2);
  const to   = s.slice(2, 4);
  if (!/^[a-h][1-8]$/.test(from) || !/^[a-h][1-8]$/.test(to)) return null;
  return { from: from as Square, to: to as Square };
}

// Pure piece-movement on an empty board (no check detection needed for drills)
export function getValidMoves(piece: PieceType, sq: Square): Square[] {
  const f = getFileIndex(sq) - 1; // 0-indexed
  const r = getRankIndex(sq) - 1;
  const results: Square[] = [];

  const add = (df: number, dr: number) => {
    const nf = f + df, nr = r + dr;
    if (nf >= 0 && nf < 8 && nr >= 0 && nr < 8)
      results.push(`${'abcdefgh'[nf]}${nr + 1}` as Square);
  };

  const slide = (df: number, dr: number) => {
    for (let i = 1; i < 8; i++) {
      const nf = f + df * i, nr = r + dr * i;
      if (nf < 0 || nf >= 8 || nr < 0 || nr >= 8) break;
      results.push(`${'abcdefgh'[nf]}${nr + 1}` as Square);
    }
  };

  switch (piece) {
    case 'n':
      for (const [df, dr] of [[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]])
        add(df, dr);
      break;
    case 'b':
      slide(1,1); slide(1,-1); slide(-1,1); slide(-1,-1);
      break;
    case 'r':
      slide(1,0); slide(-1,0); slide(0,1); slide(0,-1);
      break;
    case 'q':
      slide(1,1); slide(1,-1); slide(-1,1); slide(-1,-1);
      slide(1,0); slide(-1,0); slide(0,1); slide(0,-1);
      break;
    case 'k':
      for (const [df, dr] of [[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]])
        add(df, dr);
      break;
  }

  return results;
}

export const PIECE_NAMES: Record<PieceType, string> = {
  n: 'Knight', b: 'Bishop', r: 'Rook', q: 'Queen', k: 'King'
};

// react-chessboard piece codes
export const PIECE_CODES: Record<PieceType, string> = {
  n: 'wN', b: 'wB', r: 'wR', q: 'wQ', k: 'wK'
};

// ── BlindPathing utilities ──────────────────────────────────────────────────

export type PieceClass = 'king' | 'queen' | 'rook' | 'bishop' | 'knight' | 'pawn';
export type SubDrill = PieceClass | 'initial' | 'pieceKey' | 'fileKey' | 'rankKey' | 'notation' | 'rookMulti' | 'bishopMulti' | 'queenMulti' | 'rankChange' | 'fileChange';

export interface PieceInfo { piece: PieceClass; color: 'white' | 'black' }

export const INITIAL_POSITION: Partial<Record<Square, PieceInfo>> = {
  a1: { piece: 'rook',   color: 'white' }, b1: { piece: 'knight', color: 'white' },
  c1: { piece: 'bishop', color: 'white' }, d1: { piece: 'queen',  color: 'white' },
  e1: { piece: 'king',   color: 'white' }, f1: { piece: 'bishop', color: 'white' },
  g1: { piece: 'knight', color: 'white' }, h1: { piece: 'rook',   color: 'white' },
  a2: { piece: 'pawn', color: 'white' }, b2: { piece: 'pawn', color: 'white' },
  c2: { piece: 'pawn', color: 'white' }, d2: { piece: 'pawn', color: 'white' },
  e2: { piece: 'pawn', color: 'white' }, f2: { piece: 'pawn', color: 'white' },
  g2: { piece: 'pawn', color: 'white' }, h2: { piece: 'pawn', color: 'white' },
  a7: { piece: 'pawn', color: 'black' }, b7: { piece: 'pawn', color: 'black' },
  c7: { piece: 'pawn', color: 'black' }, d7: { piece: 'pawn', color: 'black' },
  e7: { piece: 'pawn', color: 'black' }, f7: { piece: 'pawn', color: 'black' },
  g7: { piece: 'pawn', color: 'black' }, h7: { piece: 'pawn', color: 'black' },
  a8: { piece: 'rook',   color: 'black' }, b8: { piece: 'knight', color: 'black' },
  c8: { piece: 'bishop', color: 'black' }, d8: { piece: 'queen',  color: 'black' },
  e8: { piece: 'king',   color: 'black' }, f8: { piece: 'bishop', color: 'black' },
  g8: { piece: 'knight', color: 'black' }, h8: { piece: 'rook',   color: 'black' },
};

export const INITIAL_SQUARES: Square[] = Object.keys(INITIAL_POSITION) as Square[];

// Direction labels → [dFile, dRank] in WHITE-perspective coordinates.
// For black perspective, both are negated by the caller.
const DIR_DELTAS: Record<string, [number, number]> = {
  'top':          [ 0,  1],
  'bottom':       [ 0, -1],
  'left':         [-1,  0],
  'right':        [ 1,  0],
  'top-left':     [-1,  1],
  'top-right':    [ 1,  1],
  'bottom-left':  [-1, -1],
  'bottom-right': [ 1, -1],
};

// Knight L-shape descriptions with their deltas in white-perspective coordinates.
export const KNIGHT_DIR_LIST: Array<{ label: string; clockLabel: string; df: number; dr: number }> = [
  { label: 'two up one right',    clockLabel: '1 o\'clock',  df:  1, dr:  2 },
  { label: 'two up one left',     clockLabel: '11 o\'clock', df: -1, dr:  2 },
  { label: 'two down one right',  clockLabel: '5 o\'clock',  df:  1, dr: -2 },
  { label: 'two down one left',   clockLabel: '7 o\'clock',  df: -1, dr: -2 },
  { label: 'one up two right',    clockLabel: '2 o\'clock',  df:  2, dr:  1 },
  { label: 'one up two left',     clockLabel: '10 o\'clock', df: -2, dr:  1 },
  { label: 'one down two right',  clockLabel: '4 o\'clock',  df:  2, dr: -1 },
  { label: 'one down two left',   clockLabel: '8 o\'clock',  df: -2, dr: -1 },
];

// Applies a direction label to sq for the given orientation, returns target or null.
export function applyDirection(
  sq: Square,
  dirLabel: string,
  orientation: BoardOrientation,
): Square | null {
  const raw = DIR_DELTAS[dirLabel];
  if (!raw) return null;
  const [rdf, rdr] = raw;
  const df = orientation === 'white' ? rdf : -rdf;
  const dr = orientation === 'white' ? rdr : -rdr;
  const f = sq.charCodeAt(0) - 97;
  const r = parseInt(sq[1]) - 1;
  const nf = f + df;
  const nr = r + dr;
  if (nf < 0 || nf > 7 || nr < 0 || nr > 7) return null;
  return `${'abcdefgh'[nf]}${nr + 1}` as Square;
}

// Valid direction labels per piece class (knight handled separately via KNIGHT_DIR_LIST).
export const PIECE_DIRS: Record<PieceClass, string[]> = {
  king:   ['top', 'bottom', 'left', 'right', 'top-left', 'top-right', 'bottom-left', 'bottom-right'],
  queen:  ['top', 'bottom', 'left', 'right', 'top-left', 'top-right', 'bottom-left', 'bottom-right'],
  rook:   ['top', 'bottom', 'left', 'right'],
  bishop: ['top-left', 'top-right', 'bottom-left', 'bottom-right'],
  pawn:   ['top', 'top-left', 'top-right'],
  knight: [],
};

// react-chessboard piece code for a class + color.
export function pieceCode(piece: PieceClass, color: 'white' | 'black'): string {
  const c = color === 'white' ? 'w' : 'b';
  const p = { king: 'K', queen: 'Q', rook: 'R', bishop: 'B', knight: 'N', pawn: 'P' }[piece];
  return `${c}${p}`;
}

export const PIECE_CLASS_NAMES: Record<PieceClass, string> = {
  king: 'King', queen: 'Queen', rook: 'Rook', bishop: 'Bishop', knight: 'Knight', pawn: 'Pawn',
};

// Key → decoded value maps for the home-row shortcut system.
export const PIECE_FROM_KEY: Record<string, PieceClass> = {
  s: 'king', d: 'rook', f: 'pawn', j: 'knight', k: 'bishop', l: 'queen',
};
export const FILE_FROM_KEY: Record<string, string> = {
  a: 'a', s: 'b', d: 'c', f: 'd', j: 'e', k: 'f', l: 'g', ';': 'h',
};
export const RANK_FROM_KEY: Record<string, number> = {
  a: 1, s: 2, d: 3, f: 4, j: 5, k: 6, l: 7, ';': 8,
};
