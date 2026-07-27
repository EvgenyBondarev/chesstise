import { useState, useCallback, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Chessboard } from 'react-chessboard';
import CollapsibleBoard from '../common/CollapsibleBoard';
import type { Square } from 'chess.js';
import { getOpening, WHITE_START, BLACK_START } from '../../data/openings';
import type { OpeningMove } from '../../data/openings';
import { useAnnouncer } from '../../hooks/useAnnouncer';

const BOARD_SIZE = 480;

const SELECTED_STYLE: React.CSSProperties = { background: 'rgba(88,166,255,0.35)' };
const ERROR_STYLE:    React.CSSProperties = { background: 'rgba(248,81,73,0.45)'   };

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

export default function OpeningDrill() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const opening = id ? getOpening(id) : undefined;
  const { announce, liveA, liveB } = useAnnouncer();

  const startPos = opening?.side === 'white' ? { ...WHITE_START } : { ...BLACK_START };
  const orient   = opening?.side === 'white' ? 'white' : 'black' as const;

  const [position,  setPosition]  = useState<Record<string, string>>(startPos);
  const [step,      setStep]      = useState(0);
  const [selected,  setSelected]  = useState<Square | null>(null);
  const [errorSq,   setErrorSq]   = useState<Square | null>(null);
  const [errorMsg,  setErrorMsg]  = useState('');
  const [done,      setDone]      = useState(false);
  const [showHint,  setShowHint]  = useState(false);

  // Reset everything when the opening id changes
  useEffect(() => {
    if (!opening) return;
    const fresh = opening.side === 'white' ? { ...WHITE_START } : { ...BLACK_START };
    setPosition(fresh);
    setStep(0);
    setSelected(null);
    setErrorSq(null);
    setErrorMsg('');
    setDone(false);
    setShowHint(false);
    announce(`${opening.name} — move 1 of ${opening.moves.length}. Select your piece.`);
  }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  const clearError = useCallback(() => {
    setErrorSq(null);
    setErrorMsg('');
  }, []);

  const handleSquareClick = useCallback((sq: Square) => {
    if (done || !opening) return;
    clearError();

    const move = opening.moves[step];

    if (selected === null) {
      if (!position[sq]) return; // empty square — ignore

      if (sq !== move.from) {
        setErrorSq(sq);
        const msg = `Wrong piece — play ${move.san}`;
        setErrorMsg(msg);
        announce(msg);
        setTimeout(clearError, 900);
        return;
      }
      setSelected(sq);
      announce(`${sq} selected`);
    } else {
      if (sq === selected) { setSelected(null); return; }

      if (sq === move.to) {
        const next = applyMove(position, move);
        setPosition(next);
        setSelected(null);
        setShowHint(false);

        const nextStep = step + 1;
        if (nextStep >= opening.moves.length) {
          setDone(true);
          announce(`Tabiya reached! ${opening.summary}`);
        } else {
          setStep(nextStep);
          announce(`Correct! Move ${nextStep + 1} of ${opening.moves.length}.`);
        }
      } else {
        setErrorSq(sq);
        const msg = `Wrong square — correct destination is ${move.to}`;
        setErrorMsg(msg);
        announce(msg);
        setSelected(null);
        setTimeout(clearError, 900);
      }
    }
  }, [done, opening, step, selected, position, clearError, announce]);

  const reset = useCallback(() => {
    if (!opening) return;
    const fresh = opening.side === 'white' ? { ...WHITE_START } : { ...BLACK_START };
    setPosition(fresh);
    setStep(0);
    setSelected(null);
    setErrorSq(null);
    setErrorMsg('');
    setDone(false);
    setShowHint(false);
    announce(`Restarted. Move 1 of ${opening.moves.length}.`);
  }, [opening, announce]);

  if (!opening) {
    return (
      <div className="exercise-page">
        <button className="back-link" onClick={() => navigate(-1)}>← Back</button>
        <p style={{ color: 'var(--muted)' }}>Opening not found.</p>
      </div>
    );
  }

  const moves = opening.moves;
  const currentMove = moves[step];

  const customStyles: Record<string, React.CSSProperties> = {};
  if (selected) customStyles[selected] = SELECTED_STYLE;
  if (errorSq)  customStyles[errorSq]  = ERROR_STYLE;

  return (
    <div className="exercise-page">
      <div role="status" aria-live="polite" aria-atomic="true" className="sr-only">{liveA}</div>
      <div role="status" aria-live="polite" aria-atomic="true" className="sr-only">{liveB}</div>

      <div className="opening-drill-header">
        <button className="back-link" onClick={() => navigate(-1)} aria-label="Back">←</button>
        <h1 className="exercise-title">{opening.name}</h1>
        <span className={`orient-pill ${opening.side}`} aria-label={`Playing as ${opening.side}`}>
          {opening.side === 'white' ? '♔ White' : '♚ Black'}
        </span>
      </div>

      {/* Move strip */}
      <div className="move-strip" role="list" aria-label="Opening moves">
        {moves.map((m, i) => (
          <span
            key={i}
            role="listitem"
            className={`move-chip${i < step ? ' done' : i === step && !done ? ' active' : ''}`}
            aria-current={i === step && !done ? 'step' : undefined}
          >
            {m.san}
          </span>
        ))}
      </div>

      <div className="exercise-body">
        <div className="board-col">
          {/* Prompt / completion card */}
          {done ? (
            <div className="prompt-card opening-done-card" role="status">
              <span style={{ color: 'var(--green)', fontWeight: 700, fontSize: '1rem' }}>
                ✓ Tabiya reached!
              </span>
              <p style={{ color: 'var(--muted)', fontSize: '.875rem', marginTop: '.25rem' }}>
                {opening.summary}
              </p>
            </div>
          ) : (
            <div className="prompt-card" role="region" aria-label="Move prompt">
              <span className="prompt-badge">
                {step + 1} / {moves.length}
              </span>
              {errorMsg ? (
                <span style={{ color: 'var(--red)', fontSize: '.875rem', flex: 1 }}>
                  {errorMsg}
                </span>
              ) : (
                <span style={{ color: 'var(--muted)', fontSize: '.875rem', flex: 1 }}>
                  {selected ? 'Now click destination square' : 'Click piece to move'}
                </span>
              )}
              <button
                className="hint-btn"
                onClick={() => setShowHint(h => !h)}
                aria-expanded={showHint}
                aria-controls="opening-hint"
              >
                {showHint ? 'Hide hint' : 'Hint'}
              </button>
              {showHint && (
                <span
                  id="opening-hint"
                  className="hint-text"
                  aria-live="polite"
                >
                  {currentMove.san}
                </span>
              )}
            </div>
          )}

          <CollapsibleBoard>
            <Chessboard
              position={position}
              boardWidth={BOARD_SIZE}
              boardOrientation={orient}
              showBoardNotation={false}
              arePiecesDraggable={false}
              onSquareClick={done ? undefined : handleSquareClick}
              customSquareStyles={customStyles}
              animationDuration={150}
            />
          </CollapsibleBoard>

          {done && (
            <button className="submit-btn" onClick={reset}>
              Play Again
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
