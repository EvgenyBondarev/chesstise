import { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getOpening, WHITE_START, BLACK_START } from '../../data/openings';
import type { OpeningMove } from '../../data/openings';
import { PIECE_FROM_KEY, FILE_FROM_KEY, RANK_FROM_KEY } from '../../utils/chessUtils';

const PIECE_CODE_TO_CLASS: Record<string, string> = {
  P: 'pawn', N: 'knight', B: 'bishop', R: 'rook', Q: 'queen', K: 'king',
};

function pieceClassAt(pos: Record<string, string>, square: string): string {
  const code = pos[square];
  if (!code) return '';
  return PIECE_CODE_TO_CLASS[code[1].toUpperCase()] ?? '';
}

function applyMove(pos: Record<string, string>, move: OpeningMove): Record<string, string> {
  const next = { ...pos };
  next[move.to] = next[move.from];
  delete next[move.from];
  if (move.rookFrom && move.rookTo) {
    next[move.rookTo] = next[move.rookFrom];
    delete next[move.rookFrom];
  }
  return next;
}

const START_POS = { ...WHITE_START, ...BLACK_START };

export default function OpeningRecall() {
  const { id } = useParams<{ id: string }>();
  const opening = id ? getOpening(id) : undefined;

  const [pos, setPos]           = useState<Record<string, string>>(START_POS);
  const [step, setStep]         = useState(0);
  const [buf, setBuf]           = useState('');
  const [status, setStatus]     = useState<'idle' | 'correct' | 'wrong'>('idle');
  const [mistakes, setMistakes] = useState(0);
  const [done, setDone]         = useState(false);

  useEffect(() => {
    setPos(START_POS); setStep(0); setBuf('');
    setStatus('idle'); setMistakes(0); setDone(false);
  }, [id]);

  const move = opening?.moves[step];
  const isWhiteMove = step % 2 === 0;
  const moveNum = Math.floor(step / 2) + 1;

  const handleKey = useCallback((e: KeyboardEvent) => {
    if (!opening || done || !move) return;
    if (status !== 'idle') return;

    const k = e.key;

    if (buf.length === 0) {
      if (!(k in PIECE_FROM_KEY)) return;
      setBuf(k);
    } else if (buf.length === 1) {
      if (!(k in FILE_FROM_KEY)) return;
      setBuf(b => b + k);
    } else if (buf.length === 2) {
      if (!(k in RANK_FROM_KEY)) return;
      const full = buf + k;
      setBuf(full);

      const typedPiece = PIECE_FROM_KEY[full[0]];
      const typedFile  = FILE_FROM_KEY[full[1]];
      const typedRank  = RANK_FROM_KEY[full[2]];
      const typedDest  = `${typedFile}${typedRank}`;

      const expectedPiece = pieceClassAt(pos, move.from);
      const destOk  = typedDest === move.to;
      const pieceOk = typedPiece === expectedPiece;

      if (destOk && pieceOk) {
        setStatus('correct');
        const newPos = applyMove(pos, move);
        setTimeout(() => {
          setPos(newPos);
          setBuf('');
          setStatus('idle');
          if (step + 1 >= opening.moves.length) setDone(true);
          else setStep(s => s + 1);
        }, 700);
      } else {
        setMistakes(m => m + 1);
        setStatus('wrong');
        setTimeout(() => { setBuf(''); setStatus('idle'); }, 900);
      }
    }
  }, [buf, status, done, move, pos, opening, step]);

  useEffect(() => {
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [handleKey]);

  if (!opening) {
    return <div className="exercise-page"><p style={{ padding: '2rem' }}>Opening not found.</p></div>;
  }

  if (done) {
    const total = opening.moves.length;
    return (
      <div className="exercise-page">
        <h1 className="exercise-title">Opening Recall Complete</h1>
        <p className="pregame-desc">
          <strong>{opening.name}</strong> — {total} moves recalled.
        </p>
        <p className="pregame-desc">
          Mistakes: <strong>{mistakes}</strong>
          {mistakes === 0 ? ' — Perfect!' : mistakes <= 2 ? ' — Very good.' : ' — Keep drilling.'}
        </p>
        <p className="pregame-desc opening-summary">{opening.summary}</p>
        <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem', flexWrap: 'wrap' }}>
          <button
            className="game-btn"
            onClick={() => { setPos(START_POS); setStep(0); setBuf(''); setStatus('idle'); setMistakes(0); setDone(false); }}
          >
            Retry
          </button>
          <Link to={`/openings/${id}`} className="game-btn" style={{ textDecoration: 'none', textAlign: 'center' }}>
            ← Back to Learning Mode
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="exercise-page">
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
        <h1 className="exercise-title" style={{ margin: 0 }}>{opening.name} — Recall</h1>
        <Link to={`/openings/${id}`} style={{ fontSize: '0.85rem', opacity: 0.6 }}>Learning mode</Link>
      </div>

      <div className="recall-progress">
        Move {moveNum} of {Math.ceil(opening.moves.length / 2)}{' '}
        <span className="recall-side" data-side={isWhiteMove ? 'white' : 'black'}>
          {isWhiteMove ? '● White' : '○ Black'}
        </span>
        <span className="recall-mistakes">Mistakes: {mistakes}</span>
      </div>

      <div className="recall-prompt">
        <span className="recall-move-label">{moveNum}{isWhiteMove ? '.' : '…'}</span>
        {status === 'idle' && <span className="recall-cursor">▮</span>}
        {status === 'correct' && move && (
          <span className="recall-san correct">✓ {move.san}</span>
        )}
        {status === 'wrong' && (
          <span className="recall-san wrong">✗ Try again</span>
        )}
      </div>

      {buf.length > 0 && status === 'idle' && (
        <div className="recall-buf">
          {buf.split('').map((k, i) => <kbd key={i}>{k}</kbd>)}
          <span className="recall-buf-hint">
            {buf.length === 1 && ` ${PIECE_FROM_KEY[buf[0]]}`}
            {buf.length === 2 && ` ${PIECE_FROM_KEY[buf[0]]} to ${FILE_FROM_KEY[buf[1]]}`}
          </span>
        </div>
      )}

      <div className="recall-history">
        {opening.moves.slice(0, step).map((m, i) => (
          <span key={i} className="recall-past-move">
            {i % 2 === 0 && <span className="recall-past-num">{Math.floor(i / 2) + 1}.</span>}
            {m.san}
          </span>
        ))}
      </div>

      <details className="color-hint-details" style={{ marginTop: '1.5rem' }}>
        <summary>Keyboard reference</summary>
        <div className="color-hint-body">
          <p><strong>Pieces:</strong>{' '}
            <kbd>f</kbd>=pawn | <kbd>j</kbd>=knight | <kbd>d</kbd>=rook |{' '}
            <kbd>k</kbd>=bishop | <kbd>s</kbd>=king | <kbd>l</kbd>=queen
          </p>
          <p><strong>Files a→h:</strong>{' '}
            <kbd>a</kbd> <kbd>s</kbd> <kbd>d</kbd> <kbd>f</kbd> <kbd>j</kbd> <kbd>k</kbd> <kbd>l</kbd> <kbd>;</kbd>
          </p>
          <p><strong>Ranks 1→8:</strong>{' '}
            <kbd>a</kbd> <kbd>s</kbd> <kbd>d</kbd> <kbd>f</kbd> <kbd>j</kbd> <kbd>k</kbd> <kbd>l</kbd> <kbd>;</kbd>
          </p>
        </div>
      </details>
    </div>
  );
}
