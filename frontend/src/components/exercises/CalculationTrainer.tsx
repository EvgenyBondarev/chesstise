import { useState, useEffect, useCallback, useRef } from 'react';
import type { Square } from 'chess.js';
import {
  ALL_SQUARES, getValidMoves, getSquareColor, PIECE_NAMES,
  KNIGHT_DIR_LIST, getFileIndex, getRankIndex,
  FILE_FROM_KEY, RANK_FROM_KEY, randomElement,
} from '../../utils/chessUtils';
import type { PieceType } from '../../types';

// ── BFS: minimum knight moves between two squares ──────────────────────────

const KNIGHT_DELTAS: [number, number][] = [
  [-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1],
];

function knightMinMoves(from: Square, to: Square): number {
  if (from === to) return 0;
  const queue: [string, number][] = [[from, 0]];
  const visited = new Set([from as string]);
  while (queue.length) {
    const [sq, dist] = queue.shift()!;
    for (const [df, dr] of KNIGHT_DELTAS) {
      const nf = sq.charCodeAt(0) - 97 + df;
      const nr = parseInt(sq[1]) - 1 + dr;
      if (nf < 0 || nf > 7 || nr < 0 || nr > 7) continue;
      const next = `${'abcdefgh'[nf]}${nr + 1}`;
      if (next === to) return dist + 1;
      if (!visited.has(next)) { visited.add(next); queue.push([next, dist + 1]); }
    }
  }
  return -1;
}

// ── Question types ──────────────────────────────────────────────────────────

type AnswerType = 'yn' | 'number' | 'square';

interface Question {
  prompt: string;
  answerType: AnswerType;
  answer: string;
  explanation: string;
}

const PIECES: PieceType[] = ['n', 'b', 'r', 'q', 'k'];

function genKnightDirection(): Question {
  for (let attempt = 0; attempt < 50; attempt++) {
    const sq   = randomElement(ALL_SQUARES);
    const dir  = randomElement(KNIGHT_DIR_LIST);
    const nf   = getFileIndex(sq) - 1 + dir.df;
    const nr   = getRankIndex(sq) - 1 + dir.dr;
    if (nf < 0 || nf > 7 || nr < 0 || nr > 7) continue;
    const dest = `${'abcdefgh'[nf]}${nr + 1}` as Square;
    return {
      prompt: `Knight on ${sq} — ${dir.label}. What square does it land on?`,
      answerType: 'square',
      answer: dest,
      explanation: `${dir.label} from ${sq} (Δfile ${dir.df > 0 ? '+' : ''}${dir.df}, Δrank ${dir.dr > 0 ? '+' : ''}${dir.dr}) → ${dest}`,
    };
  }
  return genKnightDirection();
}

function genReachIn1(): Question {
  const piece = randomElement(PIECES);
  const from  = randomElement(ALL_SQUARES);
  const to    = randomElement(ALL_SQUARES.filter(s => s !== from));
  const valid = getValidMoves(piece, from).includes(to as Square);
  return {
    prompt: `Can a ${PIECE_NAMES[piece]} on ${from} reach ${to} in 1 move? (y / n)`,
    answerType: 'yn',
    answer: valid ? 'y' : 'n',
    explanation: valid
      ? `Yes — ${PIECE_NAMES[piece]} on ${from} can reach ${to} in one move.`
      : `No — ${PIECE_NAMES[piece]} on ${from} cannot reach ${to} in one move.`,
  };
}

function genBishopColor(): Question {
  const from = randomElement(ALL_SQUARES);
  const to   = randomElement(ALL_SQUARES.filter(s => s !== from));
  const same = getSquareColor(from) === getSquareColor(to);
  return {
    prompt: `A bishop on ${from}. Can it ever reach ${to}? (y / n)`,
    answerType: 'yn',
    answer: same ? 'y' : 'n',
    explanation: same
      ? `Yes — ${from} and ${to} are both ${getSquareColor(from)} squares. Bishops never change color.`
      : `No — ${from} is ${getSquareColor(from)} and ${to} is ${getSquareColor(to)}. A bishop can never cross to the other color.`,
  };
}

function genCountMoves(): Question {
  const piece = randomElement(PIECES);
  const sq    = randomElement(ALL_SQUARES);
  const count = getValidMoves(piece, sq).length;
  return {
    prompt: `How many squares can a ${PIECE_NAMES[piece]} on ${sq} reach in 1 move? (number)`,
    answerType: 'number',
    answer: String(count),
    explanation: `A ${PIECE_NAMES[piece]} on ${sq} reaches exactly ${count} square${count !== 1 ? 's' : ''} on an empty board.`,
  };
}

function genMinKnightMoves(): Question {
  const from  = randomElement(ALL_SQUARES);
  const to    = randomElement(ALL_SQUARES.filter(s => s !== from));
  const moves = knightMinMoves(from as Square, to as Square);
  return {
    prompt: `Minimum knight moves from ${from} to ${to}? (number)`,
    answerType: 'number',
    answer: String(moves),
    explanation: `A knight needs at least ${moves} move${moves !== 1 ? 's' : ''} to travel from ${from} to ${to}.`,
  };
}

function genKnightFork(): Question {
  const sq          = randomElement(ALL_SQUARES);
  const knightMoves = getValidMoves('n', sq);
  if (knightMoves.length < 2) return genKnightFork();

  const isFork = Math.random() > 0.5 && knightMoves.length >= 2;
  let t1: Square, t2: Square;

  if (isFork) {
    t1 = randomElement(knightMoves) as Square;
    t2 = randomElement(knightMoves.filter(s => s !== t1)) as Square;
  } else {
    t1 = randomElement(knightMoves) as Square;
    const nonMoves = ALL_SQUARES.filter(s => !knightMoves.includes(s as Square) && s !== sq);
    if (!nonMoves.length) return genKnightFork();
    t2 = randomElement(nonMoves) as Square;
  }

  const actual = knightMoves.includes(t1) && knightMoves.includes(t2);
  return {
    prompt: `Can a knight on ${sq} attack both ${t1} and ${t2} at the same time? (y / n)`,
    answerType: 'yn',
    answer: actual ? 'y' : 'n',
    explanation: actual
      ? `Yes — both ${t1} and ${t2} are valid knight moves from ${sq}. This is a potential fork square.`
      : `No — a knight on ${sq} cannot reach both ${t1} and ${t2} in one move.`,
  };
}

const GENERATORS = [
  genKnightDirection,
  genReachIn1,
  genBishopColor,
  genCountMoves,
  genMinKnightMoves,
  genKnightFork,
];

function nextQuestion(): Question {
  return randomElement(GENERATORS)();
}

// ── Component ──────────────────────────────────────────────────────────────

const ROUND = 20;

export default function CalculationTrainer() {
  const [q, setQ]             = useState<Question>(() => nextQuestion());
  const [numBuf, setNumBuf]   = useState('');
  const [sqBuf, setSqBuf]     = useState('');  // file key + rank key (2 chars)
  const [status, setStatus]   = useState<'idle' | 'correct' | 'wrong'>('idle');
  const [answered, setAnswered] = useState(0);
  const [correct, setCorrect]   = useState(0);
  const explanationRef = useRef<HTMLParagraphElement>(null);

  const advance = useCallback(() => {
    if (answered >= ROUND) return;
    setQ(nextQuestion());
    setNumBuf(''); setSqBuf(''); setStatus('idle');
  }, [answered]);

  const submit = useCallback((typed: string) => {
    if (typed === q.answer) {
      setCorrect(c => c + 1);
      setStatus('correct');
    } else {
      setStatus('wrong');
    }
    setAnswered(a => a + 1);
    setTimeout(() => explanationRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 50);
  }, [q.answer]);

  const handleKey = useCallback((e: KeyboardEvent) => {
    if (status !== 'idle') {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        advance();
      }
      return;
    }

    const k = e.key.toLowerCase();

    if (q.answerType === 'yn') {
      if (k === 'y' || k === 'n') submit(k);
    } else if (q.answerType === 'number') {
      if (/^[0-9]$/.test(k)) {
        setNumBuf(b => {
          const next = b + k;
          return next;
        });
      } else if (k === 'enter') {
        if (numBuf.length > 0) submit(numBuf);
      } else if (k === 'backspace') {
        setNumBuf(b => b.slice(0, -1));
      }
    } else if (q.answerType === 'square') {
      if (sqBuf.length === 0 && k in FILE_FROM_KEY) {
        setSqBuf(k);
      } else if (sqBuf.length === 1 && k in RANK_FROM_KEY) {
        const full = sqBuf + k;
        const sq   = FILE_FROM_KEY[sqBuf] + RANK_FROM_KEY[k];
        setSqBuf(full);
        submit(sq);
      }
    }
  }, [status, q.answerType, numBuf, sqBuf, submit, advance]);

  // numBuf enter via key handler needs latest numBuf
  const handleKeyWithEnter = useCallback((e: KeyboardEvent) => {
    if (status === 'idle' && q.answerType === 'number' && e.key === 'Enter') {
      if (numBuf.length > 0) submit(numBuf);
    } else {
      handleKey(e);
    }
  }, [status, q.answerType, numBuf, submit, handleKey]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyWithEnter);
    return () => window.removeEventListener('keydown', handleKeyWithEnter);
  }, [handleKeyWithEnter]);

  const isDone = answered >= ROUND;

  if (isDone) {
    return (
      <div className="exercise-page">
        <h1 className="exercise-title">Calculation Trainer</h1>
        <p className="pregame-desc">
          Round complete — <strong>{correct} / {ROUND}</strong> correct ({Math.round(correct / ROUND * 100)}%).
        </p>
        <p className="pregame-desc">
          {correct === ROUND ? 'Flawless. GMs think this fast naturally.' :
           correct >= 15 ? 'Strong. Keep drilling until it\'s instant.' :
           'Keep going — these patterns need to become automatic.'}
        </p>
        <button className="game-btn" onClick={() => {
          setQ(nextQuestion()); setNumBuf(''); setSqBuf('');
          setStatus('idle'); setAnswered(0); setCorrect(0);
        }}>
          New Round
        </button>
      </div>
    );
  }

  return (
    <div className="exercise-page">
      <h1 className="exercise-title">Calculation Trainer</h1>

      <div className="calc-progress">
        {answered} / {ROUND} — Score: {correct}
        <span className="calc-pct">
          {answered > 0 ? ` (${Math.round(correct / answered * 100)}%)` : ''}
        </span>
      </div>

      <div className="calc-card">
        <p className="calc-question">{q.prompt}</p>

        {status === 'idle' && (
          <div className="calc-input">
            {q.answerType === 'yn' && (
              <span className="calc-yn-hint"><kbd>y</kbd> = yes &nbsp; <kbd>n</kbd> = no</span>
            )}
            {q.answerType === 'number' && (
              <div className="calc-num-buf">
                {numBuf || <span className="buf-empty">type number…</span>}
                {numBuf && <span className="calc-yn-hint"> then Enter</span>}
              </div>
            )}
            {q.answerType === 'square' && (
              <div className="calc-sq-buf">
                {sqBuf.length === 0
                  ? <span className="buf-empty">file key → rank key</span>
                  : <span>
                      <kbd>{sqBuf[0]}</kbd>
                      {' '}({FILE_FROM_KEY[sqBuf[0]]}-file){' '}
                      <span className="buf-empty">→ rank key</span>
                    </span>
                }
              </div>
            )}
          </div>
        )}

        {status !== 'idle' && (
          <div className={`calc-feedback ${status}`}>
            <strong>{status === 'correct' ? '✓ Correct' : '✗ Wrong'}</strong>
            {status === 'wrong' && <span> — answer: <strong>{q.answer}</strong></span>}
            <p ref={explanationRef} className="calc-explanation">{q.explanation}</p>
            <span className="calc-continue">Enter / Space → next</span>
          </div>
        )}
      </div>

      <details className="color-hint-details" style={{ marginTop: '1.5rem' }}>
        <summary>Question types</summary>
        <div className="color-hint-body">
          <p>• <strong>Knight direction</strong> — type file key + rank key (2 keys, auto-submits)</p>
          <p>• <strong>y / n questions</strong> — press y or n</p>
          <p>• <strong>Number questions</strong> — type digits, then Enter</p>
        </div>
      </details>
    </div>
  );
}
