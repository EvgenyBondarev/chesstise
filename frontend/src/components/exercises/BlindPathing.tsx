import React, { useState, useCallback, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { Chessboard } from 'react-chessboard';
import { useStopwatch, formatTime } from '../../hooks/useStopwatch';
import type { Square } from 'chess.js';
import type { BoardOrientation, RunResult } from '../../types';
import {
  ALL_SQUARES,
  INITIAL_POSITION,
  INITIAL_SQUARES,
  applyDirection,
  PIECE_DIRS,
  KNIGHT_DIR_LIST,
  pieceCode,
  PIECE_FROM_KEY,
  FILE_FROM_KEY,
  RANK_FROM_KEY,
  PIECE_CLASS_NAMES,
  randomElement,
  shuffleArray,
  noConsecDupes,
} from '../../utils/chessUtils';
import type { PieceClass, SubDrill } from '../../utils/chessUtils';
import { speak, playSound, playCongratsSound } from '../../utils/speechUtils';
import { useSessionStore } from '../../store/sessionStore';
import { useProfileStore } from '../../store/profileStore';
import { useAnnouncer } from '../../hooks/useAnnouncer';
import StatsPanel from '../common/StatsPanel';

const ID = 'blind-pathing' as const;
const BOARD_SIZE = 480;
const ROUND_SIZE = 30;

type KnightNotation = 'compass' | 'clock';
type MoveRange = 'adjacent' | 'multi';

const ROW1_DRILLS: SubDrill[] = ['pieceKey', 'fileKey', 'rankKey', 'notation', 'initial'];
const ROW2_DRILLS: SubDrill[] = ['rankChange', 'fileChange', 'rook', 'pawn', 'bishop', 'king'];
const ROW3_DRILLS: SubDrill[] = ['rookMulti', 'bishopMulti', 'queenMulti', 'knight'];
const ALL_DRILLS: SubDrill[] = [...ROW1_DRILLS, ...ROW2_DRILLS, ...ROW3_DRILLS];

const SUBDRILL_LABELS: Record<SubDrill, string> = {
  pieceKey:    'Piece Key',
  fileKey:     'File Key',
  rankKey:     'Rank Key',
  notation:    'Full Notation',
  initial:     'Initial Position',
  rankChange:  'Rank ±',
  fileChange:  'File ±',
  king:        'King',
  queen:       'Queen',
  rook:        'Rook',
  rookMulti:   'Rook 2+',
  bishop:      'Bishop',
  bishopMulti: 'Bishop 2+',
  queenMulti:  'Queen 2+',
  knight:      'Knight',
  pawn:        'Pawn',
};

const SUBDRILL_EXAMPLE: Record<SubDrill, string> = {
  pieceKey:    'Knight → press j',
  fileKey:     'f → press k',
  rankKey:     '5 → press j',
  notation:    'Bd3 → press k (bishop) f (d file) d (rank 3)',
  initial:     'f2 → white pawn → f',
  rankChange:  '5 + 2 → press rank key for 7 → press l',
  fileChange:  'c + 2 → press file key for e → press j',
  king:        'White king c3 right 1 square → d3 → s f d',
  queen:       'White queen c4 top 2 squares → c6 → l d k',
  rook:        'White rook a1 right 1 square → b1 → d s a',
  rookMulti:   'White rook a1 right 3 squares → d1 → d f a',
  bishop:      'White bishop f3 top-left → e4 → k j f',
  bishopMulti: 'White bishop c1 top-right 2 squares → e3 → k j d',
  queenMulti:  'White queen d1 top 2 squares → d3 → l f d',
  knight:      'White knight e4 two up one left → d6 → j f k',
  pawn:        'White pawn e2 top → e3 → f j d',
};

function drillRationale(sd: SubDrill): React.ReactNode {
  switch (sd) {
    case 'pieceKey':
      return <>
        <strong>Why these keys?</strong>{' '}
        From 4.5 million grandmaster moves: pawn (26%) and knight (18%) together account for 44% of all moves —
        they go on <em>index</em> fingers (<kbd>f</kbd>, <kbd>j</kbd>).
        Rook (17%) and bishop (15%) go on <em>middle</em> fingers (<kbd>d</kbd>, <kbd>k</kbd>).
        King (12%) and queen (12%) go on the weaker <em>ring</em> fingers (<kbd>s</kbd>, <kbd>l</kbd>).
      </>;
    case 'fileKey':
      return <>
        <strong>Why this order?</strong>{' '}
        The home row runs a→h left to right — nothing to memorise.
        And it's also ergonomic: d-file (18%) and e-file (17%) together make up 35% of all move destinations,
        landing on your strongest <em>index</em> fingers (<kbd>f</kbd>, <kbd>j</kbd>).
        The edge files a (7%) and h (6%) fall on the outer <kbd>a</kbd> and <kbd>;</kbd> keys.
      </>;
    case 'rankKey':
      return <>
        <strong>Why this order?</strong>{' '}
        The home row runs rank 1→8 left to right — nothing to memorise.
        Rank 5 (18%) and rank 4 (18%) are the busiest ranks in grandmaster chess,
        both on <em>index</em> fingers (<kbd>f</kbd>=4, <kbd>j</kbd>=5).
        Ranks 1 and 8 (back ranks, ~8% each) sit on the outer <kbd>a</kbd> and <kbd>;</kbd> keys.
      </>;
    case 'notation':
      return <>
        <strong>Why these keys?</strong>{' '}
        Each move encodes 3 keys: piece · file · rank.
        Index fingers (<kbd>f</kbd>, <kbd>j</kbd>) cover the most frequent piece (pawn 26% + knight 18% = 44%),
        the most visited files (d 18% + e 17% = 35%), and the most active ranks (4 and 5, 18% each = 36%).
        The full sequential layout means no mapping to memorise for files or ranks.
      </>;
    case 'initial':
      return <>
        <strong>Why these keys?</strong>{' '}
        You press just the <em>piece key</em> for whatever occupies a starting square.
        Pawns (the most moved piece at 26%) are on <kbd>f</kbd> — your dominant index finger.
        Rooks (<kbd>d</kbd>), knights (<kbd>j</kbd>), bishops (<kbd>k</kbd>), queen (<kbd>l</kbd>), king (<kbd>s</kbd>).
      </>;
    case 'rankChange':
      return <>
        <strong>Why this order?</strong>{' '}
        Ranks run 1→8 left to right on the home row — add or subtract, then press the result key.
        The arithmetic lands most often on ranks 4 and 5 (18% each in real games), both on index fingers.
        The layout matches both ergonomics and move frequency without any special mapping.
      </>;
    case 'fileChange':
      return <>
        <strong>Why this order?</strong>{' '}
        Files run a→h left to right on the home row — shift by ±N, then press the result key.
        The d-file (18%) and e-file (17%) are the most active in grandmaster chess,
        and both land on index fingers (<kbd>f</kbd>=d, <kbd>j</kbd>=e).
        Sequential layout means the ergonomic optimum and the mnemonic are identical.
      </>;
    case 'rook':
      return <>
        <strong>Rook key: <kbd>d</kbd></strong> (left middle finger — 17% of grandmaster moves).
        Rooks are the third most moved piece. After pressing <kbd>d</kbd>, type the destination file then rank.
        The home-row file/rank layout ensures the most common rook destinations (d- and e-files, ranks 4–5)
        land on your index fingers.
      </>;
    case 'rookMulti':
      return <>
        <strong>Rook key: <kbd>d</kbd></strong> (left middle finger — 17% of grandmaster moves).
        Multi-step rook moves are common — rooks average over 3 squares per move in open positions.
        The layout keeps your index fingers on the busiest files and ranks even for distant destinations.
      </>;
    case 'bishop':
      return <>
        <strong>Bishop key: <kbd>k</kbd></strong> (right middle finger — 15% of grandmaster moves).
        Bishops are the fourth most moved piece. After <kbd>k</kbd>, type the destination file then rank.
        Diagonal movement means bishops visit the central files (d 18%, e 17%) frequently —
        both on index fingers.
      </>;
    case 'bishopMulti':
      return <>
        <strong>Bishop key: <kbd>k</kbd></strong> (right middle finger — 15% of grandmaster moves).
        Long-diagonal bishops are a hallmark of open games. The central squares d4, e5, d5, e4
        (each 3–4% of all destinations) are all reachable from common starting squares
        and sit on your fastest keys.
      </>;
    case 'queen':
      return <>
        <strong>Queen key: <kbd>l</kbd></strong> (right ring finger — 12% of grandmaster moves).
        Queens move least often proportionally because they're kept safe in the early game.
        The ring finger placement reflects this: the queen is powerful but not the workhorse.
        Once activated, queen destinations are often central — d4, e5, d5 top the frequency list.
      </>;
    case 'queenMulti':
      return <>
        <strong>Queen key: <kbd>l</kbd></strong> (right ring finger — 12% of grandmaster moves).
        Multi-square queen moves tend to target the centre and back ranks.
        Squares d4 (3.7%), d5 (3.6%), e4 (3.1%), e5 (3.1%) are the top four destinations overall —
        all reachable with index-finger file and rank keys.
      </>;
    case 'king':
      return <>
        <strong>King key: <kbd>s</kbd></strong> (left ring finger — 12% of grandmaster moves).
        Kings move roughly as often as queens but are mostly defensive steps (castling + endgame).
        Ring-finger placement reflects their supporting role. Most king moves land on rank 1 or 2 early
        (castling) and central ranks in endgames — covered by the full home-row rank layout.
      </>;
    case 'knight':
      return <>
        <strong>Knight key: <kbd>j</kbd></strong> (right index finger — 18% of grandmaster moves).
        Knights are the second most moved piece. Index finger gives you the fastest response
        for the piece that dominates the opening and middlegame alongside pawns.
        Top knight destinations — f6 (3.2%), f3 (3.0%), c3 (2.7%), c6 (2.6%) — all land on middle or index fingers.
      </>;
    case 'pawn':
      return <>
        <strong>Pawn key: <kbd>f</kbd></strong> (left index finger — 26% of grandmaster moves).
        Pawns are the most moved piece by a wide margin — one in four moves is a pawn push.
        They dominate d- and e-files (18% and 17% of all destinations), which also land on index fingers.
        Index + index: the most common piece on the most common files.
      </>;
  }
}

const SAN_LETTER: Record<PieceClass, string> = {
  king: 'K', queen: 'Q', rook: 'R', bishop: 'B', knight: 'N', pawn: '',
};

// Reverse lookup maps for key-practice drills
const KEY_FROM_PIECE: Record<PieceClass, string> = Object.fromEntries(
  Object.entries(PIECE_FROM_KEY).map(([k, v]) => [v, k])
) as Record<PieceClass, string>;

const KEY_FROM_FILE: Record<string, string> = Object.fromEntries(
  Object.entries(FILE_FROM_KEY).map(([k, v]) => [v, k])
) as Record<string, string>;

const KEY_FROM_RANK: Record<number, string> = Object.fromEntries(
  Object.entries(RANK_FROM_KEY).map(([k, v]) => [v, k])
) as Record<number, string>;

const PIECE_KEYS     = new Set(Object.keys(PIECE_FROM_KEY));
const FILE_RANK_KEYS = new Set(Object.keys(FILE_FROM_KEY));

const ANSWERABLE_FILES = new Set(Object.values(FILE_FROM_KEY));
const ANSWERABLE_RANKS = new Set(Object.values(RANK_FROM_KEY).map(String));
function isAnswerable(sq: Square): boolean {
  return ANSWERABLE_FILES.has(sq[0]) && ANSWERABLE_RANKS.has(sq[1]);
}

const HIGHLIGHT: React.CSSProperties = {
  boxShadow: 'inset 0 0 0 4px rgba(88,166,255,0.85)',
};

// ── Question types ─────────────────────────────────────────────────────────

interface MovementQ {
  kind: 'movement';
  piece: PieceClass;
  color: 'white' | 'black';
  startSq: Square;
  dirLabel: string;
  clockLabel?: string;
  targetSq: Square;
  squareCount: number;
  orientation: BoardOrientation;
}

interface InitialQ {
  kind: 'initial';
  square: Square;
  pieceType: PieceClass;
  color: 'white' | 'black';
}

interface PieceKeyQ  { kind: 'pieceKey';  piece: PieceClass; correctKey: string; }
interface FileKeyQ   { kind: 'fileKey';   file: string;      correctKey: string; }
interface RankKeyQ   { kind: 'rankKey';   rank: number;      correctKey: string; }
interface NotationQ  { kind: 'notation';  piece: PieceClass; file: string; rank: number; }
interface RankChangeQ { kind: 'rankChange'; rank: number; delta: number; correctKey: string; }
interface FileChangeQ { kind: 'fileChange'; file: string; delta: number; correctKey: string; }

type Question = MovementQ | InitialQ | PieceKeyQ | FileKeyQ | RankKeyQ | NotationQ | RankChangeQ | FileChangeQ;

function deterministicSample<T>(pool: T[], weight: (item: T) => number, n: number): T[] {
  const total  = pool.reduce((s, p) => s + weight(p), 0);
  const floats = pool.map(p => (weight(p) / total) * n);
  const counts = floats.map(Math.floor);
  let rem = n - counts.reduce((s, c) => s + c, 0);
  floats
    .map((f, i) => ({ i, frac: f % 1 }))
    .sort((a, b) => b.frac - a.frac)
    .slice(0, rem)
    .forEach(({ i }) => counts[i]++);
  const result: T[] = [];
  pool.forEach((item, i) => { for (let j = 0; j < counts[i]; j++) result.push(item); });
  return shuffleArray(result);
}

// Empirical weights from 4.5 M moves across 52 K grandmaster games
const PIECE_WEIGHTS: Record<PieceClass, number> = {
  pawn: 25.87, knight: 17.62, rook: 17.40, bishop: 15.49, king: 12.04, queen: 11.57,
};
const FILE_WEIGHTS: Record<string, number> = {
  d: 18.17, e: 17.07, c: 15.46, f: 14.00, g: 11.73, b: 10.08, a: 7.01, h: 6.48,
};
const RANK_WEIGHTS: Record<number, number> = {
  5: 17.78, 4: 17.71, 6: 15.82, 3: 14.91, 7: 9.73, 2: 8.65, 8: 7.95, 1: 7.47,
};
const SQUARE_WEIGHTS: Record<string, number> = {
  d4: 3.71, d5: 3.61, f6: 3.20, e4: 3.12, e5: 3.07, f3: 2.97, c4: 2.71, c5: 2.69,
  c3: 2.68, c6: 2.60, e6: 2.34, d7: 2.18, e3: 2.15, d6: 2.12, e7: 2.10, f4: 2.07,
  f5: 2.04, d3: 1.98, d2: 1.93, b5: 1.92, g5: 1.79, b4: 1.78, e2: 1.77, g4: 1.62,
  g6: 1.62, b3: 1.56, b6: 1.55, g3: 1.52, g8: 1.45, a4: 1.44, a5: 1.41, g1: 1.37,
  d8: 1.33, d1: 1.31, e8: 1.29, a6: 1.27, h4: 1.26, c8: 1.25, e1: 1.24, h5: 1.24,
  g7: 1.24, c2: 1.18, c7: 1.18, c1: 1.17, h6: 1.12, g2: 1.09, a3: 1.03, h3: 1.02,
  b7: 1.01, f8: 0.98, f7: 0.96, f2: 0.91, f1: 0.87, b2: 0.80, b8: 0.76, b1: 0.70,
  h7: 0.54, a7: 0.52, h2: 0.50, a2: 0.47, a8: 0.47, h8: 0.42, a1: 0.41, h1: 0.38,
};

// ── Deck builders ──────────────────────────────────────────────────────────

function tryMovementQ(
  piece: PieceClass,
  sq: Square,
  color: 'white' | 'black',
  moveRange: MoveRange,
): MovementQ | null {
  if (piece === 'pawn' && (sq[1] === '1' || sq[1] === '8')) return null;

  if (piece === 'pawn' && moveRange === 'multi') {
    const startRank = color === 'white' ? '2' : '7';
    if (sq[1] !== startRank) return null;
    const step1 = applyDirection(sq, 'top', color);
    const step2 = step1 ? applyDirection(step1, 'top', color) : null;
    if (!step2 || !isAnswerable(step2)) return null;
    return {
      kind: 'movement', piece: 'pawn', color,
      startSq: sq, dirLabel: 'top',
      targetSq: step2, squareCount: 2, orientation: color,
    };
  }

  if (piece === 'knight') {
    const fi = sq.charCodeAt(0) - 97;
    const ri = parseInt(sq[1]) - 1;
    const valid = KNIGHT_DIR_LIST.filter(kd => {
      const df = color === 'white' ? kd.df : -kd.df;
      const dr = color === 'white' ? kd.dr : -kd.dr;
      const nf = fi + df, nr = ri + dr;
      if (nf < 0 || nf >= 8 || nr < 0 || nr >= 8) return false;
      const target = `${'abcdefgh'[nf]}${nr + 1}` as Square;
      return isAnswerable(target);
    });
    if (valid.length === 0) return null;
    const kd = randomElement(valid);
    const df = color === 'white' ? kd.df : -kd.df;
    const dr = color === 'white' ? kd.dr : -kd.dr;
    const target = `${'abcdefgh'[fi + df]}${ri + dr + 1}` as Square;
    return {
      kind: 'movement', piece: 'knight', color,
      startSq: sq, dirLabel: kd.label, clockLabel: kd.clockLabel,
      targetSq: target, squareCount: 1, orientation: color,
    };
  }

  const isSlider = piece === 'rook' || piece === 'bishop' || piece === 'queen';

  let dirs = PIECE_DIRS[piece].filter(d => {
    const step1 = applyDirection(sq, d, color);
    if (!step1 || !isAnswerable(step1)) return false;
    if (isSlider && moveRange === 'multi') {
      const step2 = applyDirection(step1, d, color);
      return step2 !== null && isAnswerable(step2);
    }
    return true;
  });

  if (dirs.length === 0) return null;
  const dir = randomElement(dirs);

  let squareCount = 1;
  let targetSq = applyDirection(sq, dir, color)!;

  if (isSlider && moveRange === 'multi') {
    let maxSteps = 1;
    let tmp = targetSq;
    while (true) {
      const next = applyDirection(tmp, dir, color);
      if (!next || !isAnswerable(next)) break;
      maxSteps++;
      tmp = next;
    }
    squareCount = Math.floor(Math.random() * (maxSteps - 1)) + 2;
    let cur = sq;
    for (let i = 0; i < squareCount; i++) {
      cur = applyDirection(cur, dir, color)!;
    }
    targetSq = cur;
  }

  return {
    kind: 'movement', piece, color,
    startSq: sq, dirLabel: dir,
    targetSq, squareCount, orientation: color,
  };
}

const DRILL_CONFIG: Partial<Record<SubDrill, { piece: PieceClass; mr: MoveRange }>> = {
  king:        { piece: 'king',   mr: 'adjacent' },
  queen:       { piece: 'queen',  mr: 'adjacent' },
  rook:        { piece: 'rook',   mr: 'adjacent' },
  rookMulti:   { piece: 'rook',   mr: 'multi' },
  bishop:      { piece: 'bishop', mr: 'adjacent' },
  bishopMulti: { piece: 'bishop', mr: 'multi' },
  queenMulti:  { piece: 'queen',  mr: 'multi' },
  knight:      { piece: 'knight', mr: 'adjacent' },
  pawn:        { piece: 'pawn',   mr: 'adjacent' },
};

function buildDeck(subDrill: SubDrill, pieceColor: 'white' | 'black' = 'white'): Question[] {
  if (subDrill === 'pieceKey') {
    const pieces = Object.keys(PIECE_WEIGHTS) as PieceClass[];
    return noConsecDupes(
      deterministicSample(pieces, p => PIECE_WEIGHTS[p], ROUND_SIZE * 3)
        .map(piece => ({ kind: 'pieceKey' as const, piece, correctKey: KEY_FROM_PIECE[piece] })),
      q => q.piece,
    ).slice(0, ROUND_SIZE);
  }

  if (subDrill === 'fileKey') {
    const files = Object.keys(FILE_WEIGHTS);
    return noConsecDupes(
      deterministicSample(files, f => FILE_WEIGHTS[f], ROUND_SIZE * 3)
        .map(file => ({ kind: 'fileKey' as const, file, correctKey: KEY_FROM_FILE[file] })),
      q => q.file,
    ).slice(0, ROUND_SIZE);
  }

  if (subDrill === 'rankKey') {
    const ranks = (Object.keys(RANK_WEIGHTS) as unknown as number[]).map(Number);
    return noConsecDupes(
      deterministicSample(ranks, r => RANK_WEIGHTS[r], ROUND_SIZE * 3)
        .map(rank => ({ kind: 'rankKey' as const, rank, correctKey: KEY_FROM_RANK[rank] })),
      q => String(q.rank),
    ).slice(0, ROUND_SIZE);
  }

  if (subDrill === 'notation') {
    const allSquares = Object.keys(SQUARE_WEIGHTS);
    const pieces     = Object.keys(PIECE_WEIGHTS) as PieceClass[];
    const sampSq     = deterministicSample(allSquares, s => SQUARE_WEIGHTS[s], ROUND_SIZE * 4);
    const sampPiece  = deterministicSample(pieces, p => PIECE_WEIGHTS[p], ROUND_SIZE * 4);
    const pool: NotationQ[] = [];
    for (let i = 0; i < sampSq.length && pool.length < ROUND_SIZE + 10; i++) {
      const file  = sampSq[i][0];
      const rank  = parseInt(sampSq[i][1]);
      const piece = sampPiece[i];
      if (piece === 'pawn' && (rank === 1 || rank === 8)) continue;
      pool.push({ kind: 'notation', piece, file, rank });
    }
    return noConsecDupes(pool, q => `${q.piece}-${q.file}${q.rank}`).slice(0, ROUND_SIZE);
  }

  if (subDrill === 'initial') {
    const pool = shuffleArray(INITIAL_SQUARES).slice(0, ROUND_SIZE).map(sq => {
      const info = INITIAL_POSITION[sq]!;
      return { kind: 'initial' as const, square: sq, pieceType: info.piece, color: info.color };
    });
    return noConsecDupes(pool, q => q.square);
  }

  if (subDrill === 'rankChange') {
    const pool: RankChangeQ[] = [];
    for (let rank = 1; rank <= 8; rank++)
      for (let delta = -7; delta <= 7; delta++) {
        if (delta === 0) continue;
        const result = rank + delta;
        if (result < 1 || result > 8) continue;
        pool.push({ kind: 'rankChange', rank, delta, correctKey: KEY_FROM_RANK[result] });
      }
    return noConsecDupes(shuffleArray(pool).slice(0, ROUND_SIZE), q => `${q.rank}${q.delta > 0 ? '+' : ''}${q.delta}`);
  }

  if (subDrill === 'fileChange') {
    const FILES_ALL = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
    const pool: FileChangeQ[] = [];
    for (let i = 0; i < FILES_ALL.length; i++)
      for (let delta = -7; delta <= 7; delta++) {
        if (delta === 0) continue;
        const ri = i + delta;
        if (ri < 0 || ri >= 8) continue;
        pool.push({ kind: 'fileChange', file: FILES_ALL[i], delta, correctKey: KEY_FROM_FILE[FILES_ALL[ri]] });
      }
    return noConsecDupes(shuffleArray(pool).slice(0, ROUND_SIZE), q => `${q.file}${q.delta > 0 ? '+' : ''}${q.delta}`);
  }

  const config = DRILL_CONFIG[subDrill];
  if (!config) return [];
  const { piece, mr: moveRange } = config;

  const deck: Question[] = [];
  let attempts = 0;
  while (deck.length < ROUND_SIZE + 6 && attempts < 5000) {
    attempts++;
    const sq = randomElement(ALL_SQUARES);
    const q = tryMovementQ(piece, sq, pieceColor, moveRange);
    if (q) deck.push(q);
  }
  return (noConsecDupes(deck as MovementQ[], q => q.startSq) as Question[]).slice(0, ROUND_SIZE);
}

// ── Helpers ────────────────────────────────────────────────────────────────

function isBetter(a: RunResult, b: RunResult): boolean {
  if (a.correct !== b.correct) return a.correct > b.correct;
  return a.timeMs < b.timeMs;
}

function decodeKey(key: string, pos: number): string {
  if (pos === 0) return PIECE_CLASS_NAMES[PIECE_FROM_KEY[key]] ?? '?';
  if (pos === 1) return FILE_FROM_KEY[key] ?? '?';
  return String(RANK_FROM_KEY[key] ?? '?');
}

// ── Drill time-series chart ────────────────────────────────────────────────

function DrillChart({ runs }: { runs: RunResult[] }) {
  if (runs.length < 2) return null;

  const W = 320, H = 96, PL = 38, PR = 10, PT = 8, PB = 16;
  const cW = W - PL - PR, cH = H - PT - PB;
  const times = runs.map(r => r.timeMs);
  const minT = Math.min(...times);
  const maxT = Math.max(...times);
  const range = maxT - minT || 1;
  const n = times.length;

  const px = (i: number) => PL + (i / (n - 1)) * cW;
  // High time at top (y small), low time at bottom (y large) → downtrend = improving
  const py = (t: number) => PT + (1 - (t - minT) / range) * cH;

  const pts = times.map((t, i) => [px(i), py(t)] as [number, number]);
  const polyline = pts.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' ');

  // Linear regression trend line
  const sumX  = pts.reduce((s, [x])    => s + x,     0);
  const sumY  = pts.reduce((s, [, y])  => s + y,     0);
  const sumXY = pts.reduce((s, [x, y]) => s + x * y, 0);
  const sumX2 = pts.reduce((s, [x])    => s + x * x, 0);
  const denom = n * sumX2 - sumX * sumX;
  const slope = denom ? (n * sumXY - sumX * sumY) / denom : 0;
  const intercept = (sumY - slope * sumX) / n;
  const [x0, x1] = [pts[0][0], pts[n - 1][0]];

  const fmtMs = (ms: number) => {
    const s = Math.round(ms / 1000);
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
  };

  return (
    <svg
      width={W} height={H}
      style={{ display: 'block', margin: '0.5rem auto', overflow: 'visible' }}
      aria-hidden="true"
    >
      <text x={PL - 4} y={PT + 4}      textAnchor="end" fontSize="9" fill="var(--muted)">{fmtMs(maxT)}</text>
      <text x={PL - 4} y={PT + cH + 4} textAnchor="end" fontSize="9" fill="var(--muted)">{fmtMs(minT)}</text>
      <line x1={PL} y1={PT} x2={PL} y2={PT + cH} stroke="var(--border,#555)" strokeWidth="0.5" />
      <line x1={PL} y1={PT + cH} x2={PL + cW} y2={PT + cH} stroke="var(--border,#555)" strokeWidth="0.5" />
      <text x={PL + cW} y={H - 2} textAnchor="end" fontSize="9" fill="var(--muted)">{n} sessions</text>
      <polyline points={polyline} fill="none" stroke="var(--accent,#58a6ff)" strokeWidth="1.5" strokeLinejoin="round" />
      <line
        x1={x0} y1={slope * x0 + intercept}
        x2={x1} y2={slope * x1 + intercept}
        stroke="#e06c75" strokeWidth="1.2" strokeDasharray="4 3" opacity="0.8"
      />
      {pts.map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r="2.5" fill="var(--accent,#58a6ff)" />
      ))}
    </svg>
  );
}

// ── Component ──────────────────────────────────────────────────────────────

export default function BlindPathing() {
  const { stats, recordAttempt, resetStats } = useSessionStore();
  const myStats = stats[ID];
  const { announce, liveA, liveB } = useAnnouncer();
  const { addBlindPathingRun, removeBlindPathingRun, blindPathingRuns } = useProfileStore();
  const { key: locationKey } = useLocation();

  const [subDrill, setSubDrill]         = useState<SubDrill>('pieceKey');
  const [pieceColor, setPieceColor]     = useState<'white' | 'black'>('white');
  const [deck, setDeck]                 = useState<Question[]>(() => buildDeck('pieceKey', 'white'));
  const [idx, setIdx]                   = useState(0);
  const [buffer, setBuffer]             = useState('');
  const [lastResult, setLast]           = useState<'correct' | 'incorrect' | null>(null);
  const [started, setStarted]           = useState(false);
  const [completed, setCompleted]       = useState(false);
  const [finalCorrect, setFinalCorrect] = useState(0);
  const [isNewBest, setIsNewBest]       = useState(false);
  useEffect(() => { if (isNewBest) playCongratsSound(); }, [isNewBest]);
  const [knightNotation, setKnightNotation] = useState<KnightNotation>('compass');

  const appRef     = useRef<HTMLDivElement>(null);
  const correctRef = useRef(0);
  const { elapsed, start: startTimer, stop: stopTimer, clear: clearTimer } = useStopwatch();

  const isPieceDrill = (ROW2_DRILLS as SubDrill[]).includes(subDrill);

  const runsForDrill = blindPathingRuns.filter(r => r.subDrill === subDrill);
  const bestRun = runsForDrill.length > 0
    ? runsForDrill.reduce((b, r) => isBetter(r, b) ? r : b)
    : null;

  useEffect(() => {
    stopTimer();
    clearTimer();
    correctRef.current = 0;
    setStarted(false);
    setCompleted(false);
    setBuffer('');
    setLast(null);
  }, [locationKey]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (started && !completed) appRef.current?.focus();
  }, [started, completed]);

  const currentQ = deck[idx];

  const maxLen = (() => {
    if (!currentQ) return 1;
    if (currentQ.kind === 'initial'    || currentQ.kind === 'pieceKey' ||
        currentQ.kind === 'fileKey'    || currentQ.kind === 'rankKey'  ||
        currentQ.kind === 'rankChange' || currentQ.kind === 'fileChange') return 1;
    return 3;
  })();

  const isOneKey   = maxLen === 1;
  const isKeyDrill = currentQ?.kind === 'pieceKey'   || currentQ?.kind === 'fileKey'   ||
                     currentQ?.kind === 'rankKey'    || currentQ?.kind === 'notation'   ||
                     currentQ?.kind === 'rankChange' || currentQ?.kind === 'fileChange';

  const dirLabel = currentQ?.kind === 'movement' && currentQ.piece === 'knight' && knightNotation === 'clock'
    ? (currentQ.clockLabel ?? currentQ.dirLabel)
    : (currentQ?.kind === 'movement' ? currentQ.dirLabel : '');

  useEffect(() => {
    if (!started || !currentQ) return;
    if (currentQ.kind === 'movement') {
      const name  = PIECE_CLASS_NAMES[currentQ.piece];
      const color = currentQ.color;
      const sq    = currentQ.startSq[0].toUpperCase() + currentQ.startSq[1];
      const suffix = currentQ.squareCount > 1 ? ` ${currentQ.squareCount} squares` : '';
      announce(`${color} ${name} ${sq} ${dirLabel}${suffix}`);
      speak(`${sq} ${dirLabel}${suffix}`);
    } else if (currentQ.kind === 'initial') {
      const sq = currentQ.square[0].toUpperCase() + currentQ.square[1];
      announce(`${sq}. What piece?`);
      speak(sq);
    } else if (currentQ.kind === 'pieceKey') {
      announce(`${PIECE_CLASS_NAMES[currentQ.piece]}. What key?`);
      speak(PIECE_CLASS_NAMES[currentQ.piece]);
    } else if (currentQ.kind === 'fileKey') {
      const f = currentQ.file.toUpperCase();
      announce(`${f}. What key?`);
      speak(f);
    } else if (currentQ.kind === 'rankKey') {
      announce(`${currentQ.rank}. What key?`);
      speak(String(currentQ.rank));
    } else if (currentQ.kind === 'rankChange') {
      const word = currentQ.delta > 0 ? 'plus' : 'minus';
      const expr = `${currentQ.rank} ${word} ${Math.abs(currentQ.delta)}`;
      announce(`${expr}. What key?`);
      speak(expr);
    } else if (currentQ.kind === 'fileChange') {
      const word = currentQ.delta > 0 ? 'plus' : 'minus';
      const expr = `${currentQ.file.toUpperCase()} ${word} ${Math.abs(currentQ.delta)}`;
      announce(`${expr}. What key?`);
      speak(expr);
    } else if (currentQ.kind === 'notation') {
      const letter = SAN_LETTER[currentQ.piece];
      const san = `${letter}${currentQ.file}${currentQ.rank}`;
      announce(`${san}. What keys?`);
      speak(`${letter ? letter + ' ' : ''}${currentQ.file} ${currentQ.rank}`);
    }
  }, [currentQ, started]); // eslint-disable-line react-hooks/exhaustive-deps

  const completeSession = useCallback(() => {
    const finalTime  = stopTimer();
    const finalCount = correctRef.current;
    const run: RunResult = {
      timeMs:   finalTime,
      correct:  finalCount,
      total:    ROUND_SIZE,
      subDrill,
      date:     new Date().toISOString(),
    };
    const runs      = useProfileStore.getState().blindPathingRuns;
    const drillRuns = runs.filter(r => r.subDrill === subDrill);
    const existing  = drillRuns.length > 0
      ? drillRuns.reduce((b, r) => isBetter(r, b) ? r : b)
      : null;
    setFinalCorrect(finalCount);
    setIsNewBest(existing === null || isBetter(run, existing));
    addBlindPathingRun(run);
    setCompleted(true);
  }, [stopTimer, addBlindPathingRun, subDrill]);

  const advance = useCallback(() => {
    const next = idx + 1;
    if (next >= deck.length) completeSession();
    else setIdx(next);
    setLast(null);
    setBuffer('');
  }, [idx, deck.length, completeSession]);

  const evaluateAnswer = useCallback((buf: string) => {
    const q = deck[idx];
    let ok = false;
    let correctLabel = '';

    if (q.kind === 'pieceKey') {
      ok = buf[0] === q.correctKey;
      correctLabel = `${PIECE_CLASS_NAMES[q.piece]}: key ${q.correctKey}`;
    } else if (q.kind === 'fileKey') {
      ok = buf[0] === q.correctKey;
      correctLabel = `${q.file.toUpperCase()}: key ${q.correctKey}`;
    } else if (q.kind === 'rankKey') {
      ok = buf[0] === q.correctKey;
      correctLabel = `${q.rank}: key ${q.correctKey}`;
    } else if (q.kind === 'rankChange') {
      ok = buf[0] === q.correctKey;
      const sign = q.delta > 0 ? '+' : '-';
      correctLabel = `${q.rank} ${sign} ${Math.abs(q.delta)} = ${q.rank + q.delta}: key ${q.correctKey}`;
    } else if (q.kind === 'fileChange') {
      ok = buf[0] === q.correctKey;
      const FILES_ALL = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
      const ri = FILES_ALL.indexOf(q.file) + q.delta;
      const sign = q.delta > 0 ? '+' : '-';
      correctLabel = `${q.file.toUpperCase()} ${sign} ${Math.abs(q.delta)} = ${FILES_ALL[ri].toUpperCase()}: key ${q.correctKey}`;
    } else if (q.kind === 'initial') {
      ok = PIECE_FROM_KEY[buf[0]] === q.pieceType;
      correctLabel = `${q.color} ${PIECE_CLASS_NAMES[q.pieceType]}`;
    } else if (q.kind === 'notation') {
      const typedPiece = PIECE_FROM_KEY[buf[0]];
      const typedFile  = FILE_FROM_KEY[buf[1]];
      const typedRank  = RANK_FROM_KEY[buf[2]];
      ok = typedPiece === q.piece && typedFile === q.file && typedRank === q.rank;
      const letter = SAN_LETTER[q.piece];
      correctLabel = `${letter}${q.file}${q.rank}`;
    } else {
      const typedPiece = PIECE_FROM_KEY[buf[0]];
      const typedFile  = FILE_FROM_KEY[buf[1]];
      const typedRank  = RANK_FROM_KEY[buf[2]];
      if (typedPiece && typedFile && typedRank) {
        ok = typedPiece === q.piece && `${typedFile}${typedRank}` === q.targetSq;
      }
      correctLabel = q.targetSq[0].toUpperCase() + q.targetSq[1];
    }

    if (ok) correctRef.current++;
    playSound(ok);
    setLast(ok ? 'correct' : 'incorrect');
    recordAttempt(ID, ok);
    announce(ok ? `Correct! ${correctLabel}` : `Wrong. ${correctLabel}`);
    setTimeout(advance, ok ? 380 : 750);
  }, [deck, idx, recordAttempt, announce, advance]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (!started || lastResult !== null || buffer.length >= maxLen) return;
    const key = e.key;

    let validKeys: Set<string>;
    if (currentQ.kind === 'fileKey' || currentQ.kind === 'rankKey' ||
        currentQ.kind === 'fileChange' || currentQ.kind === 'rankChange') {
      validKeys = FILE_RANK_KEYS;
    } else if (currentQ.kind === 'pieceKey' || currentQ.kind === 'initial' || buffer.length === 0) {
      validKeys = PIECE_KEYS;
    } else {
      validKeys = FILE_RANK_KEYS;
    }

    if (!validKeys.has(key)) return;
    e.preventDefault();
    const newBuf = buffer + key;
    setBuffer(newBuf);

    if (newBuf.length === maxLen) evaluateAnswer(newBuf);
  }, [started, lastResult, buffer, maxLen, currentQ, evaluateAnswer]);

  const handleBack = useCallback(() => {
    stopTimer();
    clearTimer();
    correctRef.current = 0;
    resetStats(ID);
    setDeck(buildDeck(subDrill, pieceColor));
    setIdx(0);
    setBuffer('');
    setLast(null);
    setStarted(false);
    setCompleted(false);
  }, [stopTimer, clearTimer, resetStats, subDrill, pieceColor]);

  const startNewSession = useCallback((sd: SubDrill, pc: 'white' | 'black' = pieceColor) => {
    clearTimer();
    correctRef.current = 0;
    resetStats(ID);
    setSubDrill(sd);
    setDeck(buildDeck(sd, pc));
    setIdx(0);
    setBuffer('');
    setLast(null);
    setCompleted(false);
    setStarted(false);
    setFinalCorrect(0);
    setIsNewBest(false);
  }, [clearTimer, resetStats, pieceColor]);

  const handleStart = useCallback(() => {
    startTimer();
    setStarted(true);
  }, [startTimer]);

  // Used both in-game (StatsPanel restart) and as the "Start again" action
  const handleRestart = useCallback(() => {
    correctRef.current = 0;
    resetStats(ID);
    setDeck(buildDeck(subDrill, pieceColor));
    setIdx(0);
    setBuffer('');
    setLast(null);
    setFinalCorrect(0);
    setIsNewBest(false);
    setCompleted(false);
    startTimer();
  }, [subDrill, pieceColor, resetStats, startTimer]);

  useEffect(() => {
    if (started && !completed) return;
    const drillIdx = ALL_DRILLS.indexOf(subDrill);
    const prevDrill = ALL_DRILLS[(drillIdx - 1 + ALL_DRILLS.length) % ALL_DRILLS.length];
    const nextDrill = ALL_DRILLS[(drillIdx + 1) % ALL_DRILLS.length];
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const el = document.activeElement as HTMLElement | null;
      if (el && ['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName)) return;
      if (e.key === 's') { e.preventDefault(); if (completed) handleRestart(); else handleStart(); }
      if (e.key === 'g') { e.preventDefault(); startNewSession(prevDrill); }
      if (e.key === 'h') { e.preventDefault(); startNewSession(nextDrill); }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [started, completed, subDrill, handleStart, handleRestart, startNewSession]);

  // ── Board state ────────────────────────────────────────────────────────────
  const boardPos: Record<string, string> = {};
  const boardStyles: Record<string, React.CSSProperties> = {};
  let boardOrientation: BoardOrientation = 'white';
  let promptSq: Square | null = null;

  if (currentQ?.kind === 'movement') {
    boardPos[currentQ.startSq] = pieceCode(currentQ.piece, currentQ.color);
    if (lastResult !== null) boardStyles[currentQ.targetSq] = HIGHLIGHT;
    boardOrientation = currentQ.orientation;
    promptSq = currentQ.startSq;
  } else if (currentQ?.kind === 'initial') {
    boardStyles[currentQ.square] = HIGHLIGHT;
    promptSq = currentQ.square;
  }

  const slotLabels = isOneKey ? ['piece'] : ['piece', 'file', 'rank'];

  // ── Pre-game ───────────────────────────────────────────────────────────────
  if (!started) {
    const recent   = runsForDrill.slice().reverse().slice(0, 10);
    const bestDate = bestRun?.date;

    const drillDesc = (() => {
      if (subDrill === 'initial')  return `${ROUND_SIZE} squares — name the piece at each starting position`;
      if (subDrill === 'pieceKey') return `${ROUND_SIZE} prompts — press the key for each piece name`;
      if (subDrill === 'fileKey')  return `${ROUND_SIZE} prompts — press the key for each file letter`;
      if (subDrill === 'rankKey')  return `${ROUND_SIZE} prompts — press the key for each rank number`;
      if (subDrill === 'notation') return `${ROUND_SIZE} prompts — type the 3-key code for each piece and square`;
      const name = SUBDRILL_LABELS[subDrill].replace(' 2+', '').toLowerCase();
      const isMulti = subDrill === 'rookMulti' || subDrill === 'bishopMulti' || subDrill === 'queenMulti';
      return `${ROUND_SIZE} prompts — find where the ${name} lands${isMulti ? ' (2+ squares)' : ''}`;
    })();

    return (
      <div className="exercise-page">
        <h1 className="exercise-title">Blind Pathing</h1>
        <div className="pregame-screen" style={{ maxWidth: 540 }}>

          <div className="bp-subdrills">
            <div className="bp-subdrill-row">
              {ROW1_DRILLS.map(sd => (
                <button
                  key={sd}
                  className={`bp-subdrill-btn${subDrill === sd ? ' active' : ''}`}
                  onClick={() => startNewSession(sd)}
                >
                  {SUBDRILL_LABELS[sd]}
                </button>
              ))}
            </div>
            <div className="bp-subdrill-row">
              {ROW2_DRILLS.map(sd => (
                <button
                  key={sd}
                  className={`bp-subdrill-btn${subDrill === sd ? ' active' : ''}`}
                  onClick={() => startNewSession(sd)}
                >
                  {SUBDRILL_LABELS[sd]}
                </button>
              ))}
            </div>
            <div className="bp-subdrill-row">
              {ROW3_DRILLS.map(sd => (
                <button
                  key={sd}
                  className={`bp-subdrill-btn${subDrill === sd ? ' active' : ''}`}
                  onClick={() => startNewSession(sd)}
                >
                  {SUBDRILL_LABELS[sd]}
                </button>
              ))}
            </div>
          </div>

          {isPieceDrill && (
            <div className="pregame-options">
              <label htmlFor="piece-color" style={{ fontSize: '0.82rem', color: 'var(--muted)' }}>
                Piece color:
              </label>
              <select
                id="piece-color"
                className="perspective-select"
                value={pieceColor}
                onChange={e => {
                  const pc = e.target.value as 'white' | 'black';
                  setPieceColor(pc);
                  setDeck(buildDeck(subDrill, pc));
                  setIdx(0);
                }}
              >
                <option value="white">White</option>
                <option value="black">Black</option>
              </select>
            </div>
          )}

          {subDrill === 'knight' && (
            <div className="pregame-options">
              <label htmlFor="knight-notation" style={{ fontSize: '0.82rem', color: 'var(--muted)' }}>
                Direction style:
              </label>
              <select
                id="knight-notation"
                className="perspective-select"
                value={knightNotation}
                onChange={e => setKnightNotation(e.target.value as KnightNotation)}
              >
                <option value="compass">Verbal (two up one right)</option>
                <option value="clock">Clock face (1 o'clock)</option>
              </select>
            </div>
          )}

          <p className="pregame-desc">{drillDesc}</p>

          <details className="color-hint-details">
            <summary>Keyboard shortcuts</summary>
            <div className="color-hint-body">
              {subDrill === 'initial' || subDrill === 'pieceKey'
                ? <p>Type <strong>1 key</strong> for the piece.</p>
                : subDrill === 'fileKey'
                  ? <p>Type <strong>1 key</strong> for the file.</p>
                  : subDrill === 'rankKey'
                    ? <p>Type <strong>1 key</strong> for the rank.</p>
                    : <p>Type <strong>3 keys</strong>: piece · file · rank. Submits automatically on the third key.</p>}
              {subDrill !== 'fileKey' && subDrill !== 'rankKey' && (
                <p>
                  <strong>Pieces</strong>{' — ordered by how often each piece moves in grandmaster games:'}<br />
                  <kbd>f</kbd>=pawn <span className="shortcut-pct">(26%)</span>{' | '}
                  <kbd>j</kbd>=knight <span className="shortcut-pct">(18%)</span>{' | '}
                  <kbd>d</kbd>=rook <span className="shortcut-pct">(17%)</span>{' | '}
                  <kbd>k</kbd>=bishop <span className="shortcut-pct">(15%)</span>{' | '}
                  <kbd>s</kbd>=king <span className="shortcut-pct">(12%)</span>{' | '}
                  <kbd>l</kbd>=queen <span className="shortcut-pct">(12%)</span>
                </p>
              )}
              {subDrill !== 'pieceKey' && subDrill !== 'rankKey' && subDrill !== 'initial' && (
                <p>
                  <strong>Files</strong>{' — home row left → right maps a through h:'}<br />
                  <kbd>a</kbd>=a | <kbd>s</kbd>=b | <kbd>d</kbd>=c | <kbd>f</kbd>=d | <kbd>j</kbd>=e | <kbd>k</kbd>=f | <kbd>l</kbd>=g | <kbd>;</kbd>=h
                </p>
              )}
              {subDrill !== 'pieceKey' && subDrill !== 'fileKey' && subDrill !== 'initial' && (
                <p>
                  <strong>Ranks</strong>{' — home row left → right maps 1 through 8:'}<br />
                  <kbd>a</kbd>=1 | <kbd>s</kbd>=2 | <kbd>d</kbd>=3 | <kbd>f</kbd>=4 | <kbd>j</kbd>=5 | <kbd>k</kbd>=6 | <kbd>l</kbd>=7 | <kbd>;</kbd>=8
                </p>
              )}
              <p className="shortcut-rationale">
                {drillRationale(subDrill)}
              </p>
              <p style={{ marginTop: '0.4rem', color: 'var(--text)' }}>
                <strong>Example — </strong>{SUBDRILL_EXAMPLE[subDrill]}
              </p>
            </div>
          </details>

          {(() => {
            const di = ALL_DRILLS.indexOf(subDrill);
            const prev = ALL_DRILLS[(di - 1 + ALL_DRILLS.length) % ALL_DRILLS.length];
            const next = ALL_DRILLS[(di + 1) % ALL_DRILLS.length];
            return (
              <div className="drill-sibling-nav">
                <button className="drill-nav-btn" onClick={() => startNewSession(prev)}>← {SUBDRILL_LABELS[prev]} (g)</button>
                <button className="game-btn" onClick={handleStart}>Start (s)</button>
                <button className="drill-nav-btn" onClick={() => startNewSession(next)}>{SUBDRILL_LABELS[next]} (h) →</button>
              </div>
            );
          })()}

          <table className="bp-overview">
            <thead>
              <tr>
                <th>Drill</th>
                <th>Sessions</th>
                <th>Best</th>
                <th>Time</th>
              </tr>
            </thead>
            <tbody>
              {([...ROW1_DRILLS, ...ROW2_DRILLS, ...ROW3_DRILLS] as SubDrill[]).map(sd => {
                const sdRuns = blindPathingRuns.filter(r => r.subDrill === sd);
                const sdBest = sdRuns.length > 0
                  ? sdRuns.reduce((b, r) => isBetter(r, b) ? r : b)
                  : null;
                return (
                  <tr
                    key={sd}
                    className={subDrill === sd ? 'bp-overview-active' : ''}
                    onClick={() => startNewSession(sd)}
                  >
                    <td>{SUBDRILL_LABELS[sd]}</td>
                    <td>{sdRuns.length || '—'}</td>
                    <td>{sdBest ? `${sdBest.correct}/${sdBest.total}` : '—'}</td>
                    <td>{sdBest ? formatTime(sdBest.timeMs) : '—'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {recent.length > 0 && (
            <table className="run-history">
              <thead>
                <tr><th>Date</th><th>Correct</th><th>Time</th><th></th></tr>
              </thead>
              <tbody>
                {recent.map((r, i) => (
                  <tr key={i} className={r.date === bestDate ? 'best-run' : ''}>
                    <td>{new Date(r.date).toLocaleString()}</td>
                    <td>{r.correct}/{r.total}</td>
                    <td>{formatTime(r.timeMs)}</td>
                    <td>
                      <button
                        className="run-delete-btn"
                        onClick={() => removeBlindPathingRun(r.date)}
                        aria-label="Delete this run"
                      >×</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          <DrillChart runs={runsForDrill.slice(-20)} />
        </div>
      </div>
    );
  }

  // ── Completion ─────────────────────────────────────────────────────────────
  if (completed) {
    const recent   = runsForDrill.slice().reverse().slice(0, 10);
    const bestDate = bestRun?.date;
    return (
      <div className="exercise-page">
        <h1 className="exercise-title">Blind Pathing</h1>
        <div className="completion-screen">
          <button className="bp-back-btn" onClick={handleBack}>← Back to overview</button>
          <p className="completion-label">{SUBDRILL_LABELS[subDrill]} — session complete</p>
          <p className="completion-score">{finalCorrect}/{ROUND_SIZE} correct</p>
          <p className="completion-time">{formatTime(elapsed)}</p>
          {isNewBest
            ? <p className="completion-badge new-best">New best!</p>
            : bestRun && (
              <p className="completion-badge">
                Best: {bestRun.correct}/{bestRun.total} in {formatTime(bestRun.timeMs)}
              </p>
            )}
          {recent.length > 1 && (
            <table className="run-history">
              <thead>
                <tr><th>Date</th><th>Correct</th><th>Time</th><th></th></tr>
              </thead>
              <tbody>
                {recent.map((r, i) => (
                  <tr key={i} className={r.date === bestDate ? 'best-run' : ''}>
                    <td>{new Date(r.date).toLocaleString()}</td>
                    <td>{r.correct}/{r.total}</td>
                    <td>{formatTime(r.timeMs)}</td>
                    <td>
                      <button
                        className="run-delete-btn"
                        onClick={() => removeBlindPathingRun(r.date)}
                        aria-label="Delete this run"
                      >×</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          <DrillChart runs={runsForDrill.slice(-20)} />
          {(() => {
            const di = ALL_DRILLS.indexOf(subDrill);
            const prev = ALL_DRILLS[(di - 1 + ALL_DRILLS.length) % ALL_DRILLS.length];
            const next = ALL_DRILLS[(di + 1) % ALL_DRILLS.length];
            return (
              <div className="drill-sibling-nav">
                <button className="drill-nav-btn" onClick={() => startNewSession(prev)}>← {SUBDRILL_LABELS[prev]} (g)</button>
                <button className="game-btn" onClick={handleRestart}>Start again (s)</button>
                <button className="drill-nav-btn" onClick={() => startNewSession(next)}>{SUBDRILL_LABELS[next]} (h) →</button>
              </div>
            );
          })()}
        </div>
      </div>
    );
  }

  // ── In-game ────────────────────────────────────────────────────────────────
  const keyDrillPrompt = (() => {
    if (currentQ.kind === 'pieceKey') return PIECE_CLASS_NAMES[currentQ.piece];
    if (currentQ.kind === 'fileKey')  return currentQ.file.toUpperCase();
    if (currentQ.kind === 'rankKey')  return String(currentQ.rank);
    if (currentQ.kind === 'notation') {
      const letter = SAN_LETTER[currentQ.piece];
      return `${letter}${currentQ.file}${currentQ.rank}`;
    }
    if (currentQ.kind === 'rankChange') {
      const sign = currentQ.delta > 0 ? ' + ' : ' - ';
      return `${currentQ.rank}${sign}${Math.abs(currentQ.delta)}`;
    }
    if (currentQ.kind === 'fileChange') {
      const sign = currentQ.delta > 0 ? ' + ' : ' - ';
      return `${currentQ.file.toUpperCase()}${sign}${Math.abs(currentQ.delta)}`;
    }
    return '';
  })();

  return (
    <div className="exercise-page">
      <div role="status" aria-live="assertive" aria-atomic="true" className="sr-only">{liveA}</div>
      <div role="status" aria-live="assertive" aria-atomic="true" className="sr-only">{liveB}</div>

      <h1 className="exercise-title">Blind Pathing</h1>

      <div
        role="application"
        aria-label="Blind Pathing drill. Type the keyboard shortcut for your answer."
        ref={appRef}
        tabIndex={0}
        className="exercise-body"
        onKeyDown={handleKeyDown}
        style={{ outline: 'none' }}
      >
        <div className="board-col">
          <button className="bp-back-btn" onClick={handleBack}>← Back</button>

          <div className="prompt-card">
            {currentQ.kind === 'movement' && (
              <span className="piece-chip" aria-hidden="true">
                {currentQ.color === 'white' ? '♔' : '♚'} {PIECE_CLASS_NAMES[currentQ.piece]}
              </span>
            )}
            {isKeyDrill ? (
              <span className="prompt-target" aria-label={`${keyDrillPrompt}. Press the correct key.`}>
                {keyDrillPrompt}
              </span>
            ) : (
              <span
                className="prompt-target"
                aria-label={
                  currentQ.kind === 'movement'
                    ? `${currentQ.color} ${PIECE_CLASS_NAMES[currentQ.piece]} on ${currentQ.startSq[0].toUpperCase()}${currentQ.startSq[1]}, ${dirLabel}`
                    : `What piece is on ${currentQ.square[0].toUpperCase()}${currentQ.square[1]}?`
                }
              >
                {promptSq}
              </span>
            )}
            {currentQ.kind === 'movement' && (
              <span className={`orient-pill ${currentQ.orientation}`} aria-hidden="true">
                {currentQ.orientation}
              </span>
            )}
            <span className="stopwatch" aria-live="off">{formatTime(elapsed)}</span>
            <span className="round-counter" aria-live="off">{idx + 1}/{ROUND_SIZE}</span>
          </div>

          {dirLabel && (
            <div className="bp-direction" aria-hidden="true">
              {dirLabel}
              {currentQ.kind === 'movement' && currentQ.squareCount > 1 && (
                <span className="bp-direction-count"> × {currentQ.squareCount}</span>
              )}
            </div>
          )}

          {subDrill === 'knight' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <label htmlFor="knight-notation-ig" style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>
                Style:
              </label>
              <select
                id="knight-notation-ig"
                className="perspective-select"
                value={knightNotation}
                onChange={e => setKnightNotation(e.target.value as KnightNotation)}
              >
                <option value="compass">Verbal</option>
                <option value="clock">Clock</option>
              </select>
            </div>
          )}

          {!isKeyDrill && (
            <div className={`board-wrap${lastResult ? ` flash-${lastResult}` : ''}`} aria-hidden="true">
              <Chessboard
                position={boardPos}
                boardWidth={BOARD_SIZE}
                boardOrientation={boardOrientation}
                showBoardNotation={false}
                arePiecesDraggable={false}
                customSquareStyles={boardStyles}
                animationDuration={0}
              />
            </div>
          )}

          {isKeyDrill && (
            <div className={`bp-key-big-prompt${lastResult ? ` flash-${lastResult}` : ''}`} aria-hidden="true">
              {keyDrillPrompt}
            </div>
          )}

          <div className="bp-key-display" aria-hidden="true">
            {Array.from({ length: maxLen }, (_, i) => {
              const char = buffer[i];
              return (
                <div key={i} className={`bp-key-slot ${char ? 'filled' : 'empty'}`}>
                  {char ? decodeKey(char, i) : slotLabels[i]}
                  {char && <span className="bp-key-label">{slotLabels[i]}</span>}
                </div>
              );
            })}
          </div>
        </div>

        <StatsPanel stats={myStats} lastResult={lastResult} onReset={handleRestart} />
      </div>
    </div>
  );
}
