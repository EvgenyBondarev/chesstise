import { useState, useEffect, useCallback, useRef } from 'react';
import { Chess } from 'chess.js';
import { Chessboard } from 'react-chessboard';
import type { Square } from 'chess.js';
import type { OpeningTrainer } from '../../data/openingTrainers';
import { fetchMasterMoves, weightedPick } from '../../api/lichessOpenings';
import type { MasterMove } from '../../api/lichessOpenings';
import { PIECE_FROM_KEY, FILE_FROM_KEY, RANK_FROM_KEY } from '../../utils/chessUtils';
import { speak, playSound } from '../../utils/speechUtils';

// ── helpers ────────────────────────────────────────────────────────────────

function isUserTurn(halfMoveIdx: number, userSide: 'white' | 'black'): boolean {
  const whiteToMove = halfMoveIdx % 2 === 0;
  return userSide === 'white' ? whiteToMove : !whiteToMove;
}

function keyBufToSan(buf: string, chess: Chess): string | null {
  const pieceClass = PIECE_FROM_KEY[buf[0]];
  const file       = FILE_FROM_KEY[buf[1]];
  const rank       = RANK_FROM_KEY[buf[2]];
  if (!pieceClass || !file || !rank) return null;

  const toSq = `${file}${rank}` as Square;
  const chessJsPiece = (
    { king: 'k', queen: 'q', rook: 'r', bishop: 'b', knight: 'n', pawn: 'p' } as const
  )[pieceClass];

  const match = chess.moves({ verbose: true }).find(
    m => m.piece === chessJsPiece && m.to === toSq,
  );
  return match?.san ?? null;
}

// ── component ──────────────────────────────────────────────────────────────

export default function OpeningTrainerComponent({ opening }: { opening: OpeningTrainer }) {
  const chessRef     = useRef(new Chess());
  const [fen, setFen]               = useState(() => new Chess().fen());
  const [halfMove, setHalfMove]     = useState(0);
  const [hintOn, setHintOn]         = useState(true);
  const [buf, setBuf]               = useState('');
  const [feedback, setFeedback]     = useState<'correct' | 'wrong' | null>(null);
  const [wrongSan, setWrongSan]     = useState<string | null>(null);
  const [lichess, setLichess]       = useState<MasterMove[]>([]);
  const [history, setHistory]       = useState<string[]>([]);   // SAN list for display
  const [sessions, setSessions]     = useState(0);
  const [lineOver, setLineOver]     = useState(false);
  const opponentTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { seedMoves, userSide } = opening;
  const inSeed   = halfMove < seedMoves.length;
  const userMove = isUserTurn(halfMove, userSide);

  // Hint: the move the user should play
  const hintSan: string | null = (() => {
    if (!userMove || !hintOn) return null;
    if (inSeed) return seedMoves[halfMove];
    return lichess[0]?.san ?? null;
  })();

  // ── reset ────────────────────────────────────────────────────────────────

  const resetSession = useCallback(() => {
    if (opponentTimerRef.current) clearTimeout(opponentTimerRef.current);
    chessRef.current = new Chess();
    setFen(chessRef.current.fen());
    setHalfMove(0);
    setBuf('');
    setFeedback(null);
    setWrongSan(null);
    setLichess([]);
    setHistory([]);
    setLineOver(false);
    setSessions(s => s + 1);
  }, []);

  // ── play a move (internal) ────────────────────────────────────────────────

  const applyMove = useCallback((san: string) => {
    try {
      chessRef.current.move(san);
    } catch {
      resetSession(); return;
    }
    setFen(chessRef.current.fen());
    setHistory(h => [...h, san]);
    setHalfMove(i => i + 1);
  }, [resetSession]);

  // ── fetch Lichess moves after each half-move ──────────────────────────────

  useEffect(() => {
    fetchMasterMoves(chessRef.current.fen()).then(setLichess);
  }, [fen]);

  // ── auto-play opponent moves ──────────────────────────────────────────────

  useEffect(() => {
    if (userMove || feedback !== null || lineOver) return;

    const getOpponentSan = (): string | null => {
      if (inSeed) return seedMoves[halfMove];
      if (lichess.length === 0) return null; // wait for API
      return weightedPick(lichess)?.san ?? null;
    };

    const san = getOpponentSan();
    if (!san) {
      if (!inSeed && lichess.length === 0) return; // still loading
      // no moves left — line ended
      setLineOver(true);
      return;
    }

    opponentTimerRef.current = setTimeout(() => {
      applyMove(san);
      if (!inSeed) speak(san);
    }, 700);

    return () => {
      if (opponentTimerRef.current) clearTimeout(opponentTimerRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [halfMove, userMove, lichess, feedback, lineOver]);

  // ── handle user key input ─────────────────────────────────────────────────

  const handleUserMove = useCallback((san: string | null) => {
    if (!san) {
      // key sequence produced no legal move — ignore silently
      setBuf('');
      return;
    }

    const expectedSan = inSeed ? seedMoves[halfMove] : (lichess[0]?.san ?? null);
    const isCorrect   = inSeed
      ? san === seedMoves[halfMove]
      : lichess.some(m => m.san === san);

    if (isCorrect) {
      playSound(true);
      setFeedback('correct');
      applyMove(san);
      setTimeout(() => setFeedback(null), 400);
    } else {
      playSound(false);
      setFeedback('wrong');
      if (expectedSan) {
        speak(`The move is ${expectedSan}`);
        setWrongSan(expectedSan);
      }
      setTimeout(() => {
        setFeedback(null);
        setWrongSan(null);
        setBuf('');
      }, 1400);
    }
  }, [inSeed, halfMove, seedMoves, lichess, applyMove]);

  useEffect(() => {
    if (!userMove || feedback !== null || lineOver) return;

    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const k = e.key;

      setBuf(prev => {
        if (prev.length === 0) {
          if (!(k in PIECE_FROM_KEY)) return prev;
          return k;
        }
        if (prev.length === 1) {
          if (!(k in FILE_FROM_KEY)) return prev;
          return prev + k;
        }
        if (prev.length === 2) {
          if (!(k in RANK_FROM_KEY)) return prev;
          const full = prev + k;
          // defer so state update from setBuf('') is clean
          setTimeout(() => handleUserMove(keyBufToSan(full, chessRef.current)), 0);
          return '';
        }
        return prev;
      });
    };

    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [userMove, feedback, lineOver, handleUserMove]);

  // ── render ────────────────────────────────────────────────────────────────

  const feedbackClass = feedback === 'correct'
    ? 'flash-correct' : feedback === 'wrong' ? 'flash-incorrect' : '';

  const moveNumber = (idx: number) => Math.floor(idx / 2) + 1;
  const displayHistory = history.map((san, i) => {
    const isWhite = i % 2 === 0;
    const num     = isWhite ? `${moveNumber(i)}. ` : '';
    return `${num}${san}`;
  }).join(' ');

  return (
    <div className="exercise-page exercise-page--wide">
      <h1 className="exercise-title">{opening.name} — Interactive</h1>

      {/* controls row */}
      <div className="opening-trainer-controls">
        <button
          className={`ot-hint-btn${hintOn ? ' active' : ''}`}
          onClick={() => setHintOn(h => !h)}
        >
          Hints {hintOn ? 'ON' : 'OFF'}
        </button>
        <button className="ot-reset-btn" onClick={resetSession}>
          Restart
        </button>
        <span className="ot-session-label">Session {sessions + 1}</span>
      </div>

      {/* hint box */}
      <div className="opening-trainer-hint" aria-live="polite">
        {hintSan ? (
          <span className="ot-hint-move">{hintSan}</span>
        ) : userMove && !hintOn ? (
          <span className="ot-hint-waiting">Your move…</span>
        ) : !userMove ? (
          <span className="ot-hint-waiting">Opponent thinking…</span>
        ) : null}
        {wrongSan && (
          <span className="ot-hint-wrong"> → correct: <strong>{wrongSan}</strong></span>
        )}
      </div>

      <div className="exercise-body">
        <div className="board-col">
          {/* key input display */}
          <div className="bp-key-display" aria-hidden="true">
            {(['piece', 'file', 'rank'] as const).map((label, i) => {
              const char    = buf[i];
              const decoded = i === 0
                ? (PIECE_FROM_KEY[char] ?? '')
                : i === 1
                  ? (FILE_FROM_KEY[char] ?? '')
                  : String(RANK_FROM_KEY[char] ?? '');
              return (
                <div key={label} className={`bp-key-slot ${char ? 'filled' : 'empty'}`}>
                  {char ? decoded : label}
                  {char && <span className="bp-key-label">{label}</span>}
                </div>
              );
            })}
          </div>

          <div className={`board-wrap${feedbackClass ? ` ${feedbackClass}` : ''}`}>
            <Chessboard
              position={fen}
              boardWidth={360}
              arePiecesDraggable={false}
              boardOrientation={userSide}
              animationDuration={250}
            />
          </div>
        </div>

        {/* right panel: move list + key reference */}
        <div className="ot-right-panel">
          {lineOver && (
            <div className="ot-line-over">
              <p>Line complete — no more master games found.</p>
              <button className="game-btn" onClick={resetSession}>
                Play again (new branch)
              </button>
            </div>
          )}

          {displayHistory && (
            <div className="ot-move-list" aria-label="Moves played">
              {displayHistory}
            </div>
          )}

          <details className="color-hint-details" style={{ marginTop: '1rem' }}>
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
        </div>
      </div>
    </div>
  );
}
