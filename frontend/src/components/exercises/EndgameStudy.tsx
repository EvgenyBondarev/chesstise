import { useState, useEffect, useCallback } from 'react';
import { Chess } from 'chess.js';
import { Chessboard } from 'react-chessboard';
import { ENDGAME_POSITIONS, ENDGAME_CATEGORIES } from '../../data/endgames';
import {
  PIECE_FROM_KEY, FILE_FROM_KEY, RANK_FROM_KEY, PIECE_CLASS_NAMES,
} from '../../utils/chessUtils';
import { speak } from '../../utils/speechUtils';
import CollapsibleBoard from '../common/CollapsibleBoard';

function applyMoveFen(fen: string, san: string): string {
  try {
    const chess = new Chess(fen);
    chess.move(san);
    return chess.fen();
  } catch {
    return fen;
  }
}

export default function EndgameStudy() {
  const [category, setCategory] = useState(ENDGAME_CATEGORIES[0]);
  const [idx, setIdx]           = useState(0);
  const [buf, setBuf]           = useState('');
  const [status, setStatus]     = useState<'idle' | 'correct' | 'wrong'>('idle');
  const [showHint, setShowHint] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const [score, setScore]       = useState(0);
  const [done, setDone]         = useState(false);

  const positions = ENDGAME_POSITIONS.filter(p => p.category === category);
  const pos = positions[idx];

  const resultFen = status === 'correct' ? applyMoveFen(pos.fen, pos.keyMove) : pos.fen;

  const startCategory = useCallback((cat: string) => {
    setCategory(cat);
    setIdx(0); setBuf(''); setStatus('idle');
    setShowHint(false); setAttempts(0); setScore(0); setDone(false);
    const first = ENDGAME_POSITIONS.find(p => p.category === cat);
    if (first) speak(`${first.name}. ${first.description} ${first.whiteToMove ? 'White to move.' : 'Black to move.'}`);
  }, []);

  const advance = useCallback(() => {
    if (idx + 1 >= positions.length) { setDone(true); return; }
    const next = positions[idx + 1];
    speak(`${next.name}. ${next.description} ${next.whiteToMove ? 'White to move.' : 'Black to move.'}`);
    setIdx(i => i + 1);
    setBuf(''); setStatus('idle'); setShowHint(false); setAttempts(0);
  }, [idx, positions]);

  const handleKey = useCallback((e: KeyboardEvent) => {
    if (done) return;
    if (status === 'correct') { if (e.key === 'Enter' || e.key === ' ') advance(); return; }
    if (status === 'wrong') return;

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
      const correct =
        full[0] === pos.keyPieceKey &&
        full[1] === pos.keyFileKey  &&
        full[2] === pos.keyRankKey;
      setAttempts(a => a + 1);
      if (correct) {
        setScore(s => s + (attempts === 0 ? 1 : 0));
        setStatus('correct');
        speak(`Correct. ${pos.keyMove}. ${pos.explanation}`);
      } else {
        setStatus('wrong');
        speak('Not quite. Try again.');
        setTimeout(() => { setBuf(''); setStatus('idle'); setShowHint(true); }, 900);
      }
    }
  }, [buf, status, done, pos, attempts, advance]);

  useEffect(() => {
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [handleKey]);

  useEffect(() => {
    if (pos) speak(`${pos.name}. ${pos.description} ${pos.whiteToMove ? 'White to move.' : 'Black to move.'}`);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="exercise-page">
      <h1 className="exercise-title">Endgame Drills</h1>

      <div className="bp-subdrill-row" style={{ marginBottom: '1.25rem' }}>
        {ENDGAME_CATEGORIES.map(cat => (
          <button
            key={cat}
            className={`bp-subdrill-btn${category === cat ? ' active' : ''}`}
            onClick={() => startCategory(cat)}
          >
            {cat}
          </button>
        ))}
      </div>

      {done ? (
        <>
          <p className="pregame-desc">
            {category} complete — <strong>{score} / {positions.length}</strong> first-attempt correct.
          </p>
          <p className="pregame-desc">
            Endgame precision separates GMs from everyone else. Repeat until every position is instant.
          </p>
          <button className="game-btn" onClick={() => startCategory(category)}>Retry</button>
        </>
      ) : (
        <>
          <div className="endgame-progress">
            Position {idx + 1} of {positions.length}
            <span className="endgame-score">Score: {score}/{idx}</span>
          </div>

          <div className="endgame-card">
            <h2 className="endgame-name">{pos.name}</h2>
            <p className="endgame-desc">{pos.description}</p>
            <p className="endgame-turn">{pos.whiteToMove ? 'White to move.' : 'Black to move.'}</p>
          </div>

          <CollapsibleBoard>
            <Chessboard
              position={resultFen}
              boardWidth={360}
              arePiecesDraggable={false}
              animationDuration={300}
              showBoardNotation={false}
              boardOrientation={pos.whiteToMove ? 'white' : 'black'}
            />
          </CollapsibleBoard>

          {status === 'idle' && (
            <div className="endgame-input-area">
              <div className="bp-key-display" aria-hidden="true">
                {(['piece', 'file', 'rank'] as const).map((label, i) => {
                  const char = buf[i];
                  const decoded = i === 0 ? PIECE_CLASS_NAMES[PIECE_FROM_KEY[char]] ?? ''
                                : i === 1 ? FILE_FROM_KEY[char] ?? ''
                                : String(RANK_FROM_KEY[char] ?? '');
                  return (
                    <div key={label} className={`bp-key-slot ${char ? 'filled' : 'empty'}`}>
                      {char ? decoded : label}
                      {char && <span className="bp-key-label">{label}</span>}
                    </div>
                  );
                })}
              </div>
              {showHint && pos.wrongMove && (
                <p className="endgame-hint">
                  Hint: avoid <em>{pos.wrongMove}</em> — {pos.wrongExplanation}
                </p>
              )}
            </div>
          )}

          {status === 'correct' && (
            <div className="endgame-feedback correct">
              <div className="feedback-move">✓ {pos.keyMove}</div>
              <p>{pos.explanation}</p>
              <p className="endgame-continue">Press Enter or Space for next position →</p>
            </div>
          )}

          {status === 'wrong' && (
            <div className="endgame-feedback wrong">
              ✗ Not quite — try again
            </div>
          )}

          <details className="color-hint-details" style={{ marginTop: '1.5rem' }}>
            <summary>Key reference</summary>
            <div className="color-hint-body">
              <p><strong>Pieces:</strong>{' '}
                <kbd>f</kbd>=pawn | <kbd>j</kbd>=knight | <kbd>d</kbd>=rook |{' '}
                <kbd>k</kbd>=bishop | <kbd>s</kbd>=king | <kbd>l</kbd>=queen
              </p>
              <p><strong>Files:</strong>{' '}
                <kbd>a</kbd>=a | <kbd>s</kbd>=b | <kbd>d</kbd>=c | <kbd>f</kbd>=d |{' '}
                <kbd>j</kbd>=e | <kbd>k</kbd>=f | <kbd>l</kbd>=g | <kbd>;</kbd>=h
              </p>
              <p><strong>Ranks:</strong>{' '}
                <kbd>a</kbd>=1 | <kbd>s</kbd>=2 | <kbd>d</kbd>=3 | <kbd>f</kbd>=4 |{' '}
                <kbd>j</kbd>=5 | <kbd>k</kbd>=6 | <kbd>l</kbd>=7 | <kbd>;</kbd>=8
              </p>
            </div>
          </details>
        </>
      )}
    </div>
  );
}
