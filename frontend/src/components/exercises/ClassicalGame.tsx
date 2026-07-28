import { useState, useEffect, useRef, useMemo } from 'react';
import { Chess } from 'chess.js';
import type { Square } from 'chess.js';
import { Chessboard } from 'react-chessboard';
import { speak, stopSpeaking } from '../../utils/speechUtils';
import { fetchLichessEval, fetchGeminiExplain, fetchGroqIntro, fetchGroqQuestion, formatEval } from '../../api/ai';
import type { LichessEval } from '../../api/ai';
import type { ClassicalGame as GameData } from '../../data/classicalGames';
import CollapsibleBoard from '../common/CollapsibleBoard';

interface PositionData {
  fens:   string[];
  arrows: ([Square, Square] | null)[];
}

function buildPositions(moves: string[]): PositionData {
  const chess = new Chess();
  const fens:   string[]                   = [chess.fen()];
  const arrows: ([Square, Square] | null)[] = [null];
  for (const san of moves) {
    try {
      const m = chess.move(san);
      fens.push(chess.fen());
      arrows.push(m ? [m.from as Square, m.to as Square] : null);
    } catch { break; }
  }
  return { fens, arrows };
}

function buildPgn(moves: string[]): string {
  return moves.map((m, i) =>
    i % 2 === 0 ? `${Math.floor(i / 2) + 1}. ${m}` : m,
  ).join(' ');
}

type MoveClass = 'inaccuracy' | 'mistake' | 'blunder';
const CLASS_ICON:  Record<MoveClass, string> = { inaccuracy: '?!', mistake: '?', blunder: '??' };

function classifyMove(before: LichessEval, after: LichessEval, moveIndex: number): MoveClass | null {
  const side = moveIndex % 2 === 0 ? 1 : -1;
  if (after.mate !== null) {
    const opponentHasMate = side === 1 ? after.mate < 0 : after.mate > 0;
    if (opponentHasMate) {
      const alreadyLost = before.mate !== null && (side === 1 ? before.mate < 0 : before.mate > 0);
      return alreadyLost ? null : 'blunder';
    }
    return null;
  }
  if (before.cp === null || after.cp === null || before.mate !== null) return null;
  const cpLoss = side * (before.cp - after.cp);
  if (cpLoss >= 300) return 'blunder';
  if (cpLoss >= 100) return 'mistake';
  if (cpLoss >= 50)  return 'inaccuracy';
  return null;
}

const PIECE_NAMES: Record<string, string> = { R: 'Rook', N: 'Knight', B: 'Bishop', Q: 'Queen', K: 'King' };

function spokenMove(san: string): string {
  if (san === 'O-O-O' || san === '0-0-0') return 'long castling';
  if (san === 'O-O'   || san === '0-0')   return 'short castling';
  const suffix = san.endsWith('#') ? ' checkmate' : san.endsWith('+') ? ' check' : '';
  const s = san.replace(/[+#]$/, '');
  if (/^[a-h]/.test(s)) {
    if (s.includes('x')) {
      const [from, rest] = s.split('x');
      const to = rest.replace(/=[RNBQ]/, '');
      const promo = rest.match(/=([RNBQ])/);
      return `${from} takes ${to}${promo ? ` promotes to ${PIECE_NAMES[promo[1]]}` : ''}${suffix}`;
    }
    const promo = s.match(/=([RNBQ])$/);
    if (promo) return `${s.replace(/=.*$/, '')} promotes to ${PIECE_NAMES[promo[1]]}${suffix}`;
    return `${s}${suffix}`;
  }
  const piece = PIECE_NAMES[s[0]] ?? s[0];
  const rest  = s.slice(1);
  if (rest.includes('x')) {
    const xIdx = rest.indexOf('x');
    const dis  = rest.slice(0, xIdx);
    const dest = rest.slice(xIdx + 1);
    return `${piece}${dis ? ' ' + dis : ''} takes ${dest}${suffix}`;
  }
  const dest = rest.slice(-2);
  const dis  = rest.slice(0, -2);
  return `${piece}${dis ? ' ' + dis : ''} to ${dest}${suffix}`;
}

interface Commentary {
  lichess: LichessEval | null;
  gemini: string | null;
  loading: boolean;
}

export default function ClassicalGame({ game }: { game: GameData }) {
  const { fens, arrows: preArrows } = useMemo(() => buildPositions(game.moves), [game]);
  const [plyIdx,              setPlyIdx]             = useState(0);
  const [commentary,          setCommentary]         = useState<Commentary | null>(null);
  const [boardExpanded,       setBoardExpanded]      = useState(true);
  const [moveClassifications, setMoveClassifications] = useState<Record<number, MoveClass>>({});

  const [customQ,        setCustomQ]       = useState('');
  const [boardWidth,     setBoardWidth]    = useState(() => Math.min(480, window.innerWidth - 32));
  const lastSpokenRef    = useRef('');
  const prevQRef         = useRef('');
  const keyHandlerRef    = useRef<((e: KeyboardEvent) => void) | null>(null);
  const questionInputRef = useRef<HTMLInputElement>(null);
  const boardContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = boardContainerRef.current;
    if (!el) return;
    const obs = new ResizeObserver(([entry]) => {
      setBoardWidth(Math.min(480, Math.floor(entry.contentRect.width)));
    });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  const currentFen = fens[Math.min(plyIdx, fens.length - 1)];
  const isGameOver = plyIdx >= game.moves.length;

  function say(text: string) {
    lastSpokenRef.current = text;
    speak(text);
  }

  useEffect(() => {
    setPlyIdx(0);
    setCommentary(null);
    setMoveClassifications({});
    say(`${game.white} versus ${game.black}. Press J to advance moves, A or Space for commentary.`);
    (async () => {
      try {
        const evals: (import('../../api/ai').LichessEval | null)[] = [];
        const BATCH = 6;
        for (let i = 0; i < fens.length; i += BATCH) {
          const batch = await Promise.all(fens.slice(i, i + BATCH).map(fen => fetchLichessEval(fen)));
          evals.push(...batch);
          if (i + BATCH < fens.length) await new Promise(r => setTimeout(r, 120));
        }
        const result: Record<number, MoveClass> = {};
        for (let i = 0; i < game.moves.length; i++) {
          const before = evals[i];
          const after  = evals[i + 1];
          if (!before || !after) continue;
          const cls = classifyMove(before, after, i);
          if (cls) result[i] = cls;
        }
        setMoveClassifications(result);
      } catch { /* Lichess unavailable */ }
    })();
  }, [game]); // eslint-disable-line react-hooks/exhaustive-deps

  function handleJ() {
    if (plyIdx < game.moves.length) {
      const cls = moveClassifications[plyIdx];
      say(spokenMove(game.moves[plyIdx]) + (cls ? `, ${cls}` : ''));
      setPlyIdx(p => p + 1);
      setCommentary(null);
    } else {
      say(`End of game. ${game.result}.`);
    }
  }

  function handleF() {
    if (plyIdx > 0) {
      const prevIdx = plyIdx - 1;
      setPlyIdx(prevIdx);
      setCommentary(null);
      say(prevIdx === 0 ? 'Starting position.' : `Back to move ${prevIdx}: ${spokenMove(game.moves[prevIdx - 1])}.`);
    } else {
      say('Already at the start.');
    }
  }

  function handleK() {
    if (commentary?.loading) return;
    setCommentary({ lichess: null, gemini: null, loading: true });

    const fen      = currentFen;
    const pgn      = buildPgn(game.moves.slice(0, plyIdx));
    const lastMove = plyIdx > 0 ? game.moves[plyIdx - 1] : null;

    const groqPromise = lastMove
      ? fetchGeminiExplain(fen, pgn, lastMove)
      : fetchGroqIntro(game.white, game.black, game.year ?? null, game.event ?? null);

    Promise.all([fetchLichessEval(fen), groqPromise])
      .then(([lichess, gemini]) => {
        setCommentary({ lichess, gemini, loading: false });
        const parts: string[] = [];
        if (lichess) parts.push(`${formatEval(lichess)}.`);
        if (gemini)  parts.push(gemini);
        say(parts.join(' ') || 'No commentary available.');
      })
      .catch(() => {
        setCommentary({ lichess: null, gemini: null, loading: false });
        say('Commentary unavailable.');
      });
  }

  function handleAskQuestion() {
    const q = customQ.trim();
    if (!q || commentary?.loading) return;
    setCustomQ('');
    questionInputRef.current?.blur();
    setCommentary({ lichess: null, gemini: null, loading: true });
    const fen = currentFen;
    const pgn = buildPgn(game.moves.slice(0, plyIdx));
    fetchGroqQuestion(fen, pgn, q)
      .then(gemini => {
        setCommentary({ lichess: null, gemini, loading: false });
        if (gemini) say(gemini);
        else say('AI backend not connected.');
      })
      .catch(() => {
        setCommentary({ lichess: null, gemini: null, loading: false });
        say('Question failed.');
      });
  }

  keyHandlerRef.current = (e: KeyboardEvent) => {
    const active = document.activeElement as HTMLElement | null;
    if (active && ['INPUT', 'TEXTAREA', 'SELECT'].includes(active.tagName)) return;
    const { key } = e;
    if (key === 'Control') { stopSpeaking(); return; }
    if (key === 'r' || key === 'R') { e.preventDefault(); speak(lastSpokenRef.current); return; }
    if (key === 'f' || key === 'F') { e.preventDefault(); handleF(); return; }
    if (key === 'j' || key === 'J') { e.preventDefault(); handleJ(); return; }
    if (key === 'k' || key === 'K' || key === 'a' || key === 'A' || key === ' ') { e.preventDefault(); handleK(); return; }
    if (key === 's' || key === 'S') { e.preventDefault(); setBoardExpanded(b => !b); return; }
    if (key === 'd' || key === 'D') { e.preventDefault(); questionInputRef.current?.focus(); return; }
  };

  useEffect(() => {
    const handler = (e: KeyboardEvent) => keyHandlerRef.current?.(e);
    document.addEventListener('keydown', handler, { capture: true });
    return () => document.removeEventListener('keydown', handler, { capture: true });
  }, []);

  const arrows: [Square, Square][] = preArrows[plyIdx] ? [preArrows[plyIdx] as [Square, Square]] : [];

  const posLabel = plyIdx === 0
    ? 'Starting position'
    : `After move ${plyIdx}: ${game.moves[plyIdx - 1]}`;

  return (
    <div className="exercise-page">
      <h1 className="exercise-title">
        {game.white} vs {game.black}
        {game.year  ? ` (${game.year})`  : ''}
        {game.event ? ` · ${game.event}` : ''}
        {' '}— {game.result}
      </h1>

      <div className="exercise-body">
        <div className="board-col">
          <div className="prompt-card" style={{ justifyContent: 'space-between' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--muted)' }}>{posLabel}</span>
            <span className="round-counter">{plyIdx} / {game.moves.length}</span>
          </div>

          <div ref={boardContainerRef} style={{ width: '100%' }}>
            <CollapsibleBoard isExpanded={boardExpanded} onToggle={() => setBoardExpanded(b => !b)}>
              <Chessboard
                position={currentFen}
                boardWidth={boardWidth}
                arePiecesDraggable={false}
                customArrows={arrows}
                animationDuration={200}
                showBoardNotation={false}
              />
            </CollapsibleBoard>
          </div>

          <div className="prompt-card" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '0.4rem' }}>
            {isGameOver && <span>Game over — {game.result}</span>}

            {commentary?.loading && (
              <span style={{ color: 'var(--muted)', fontSize: '0.85rem' }}>Fetching commentary…</span>
            )}

            {commentary && !commentary.loading && (
              <>
                {commentary.lichess && (
                  <span><strong>{formatEval(commentary.lichess)}</strong></span>
                )}
                {commentary.gemini && (
                  <p style={{ margin: 0, lineHeight: 1.55, fontSize: '0.88rem' }}>
                    {commentary.gemini}
                  </p>
                )}
              </>
            )}

            {!commentary && (
              <span style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>
                A / Space = commentary · R = re-read
              </span>
            )}
          </div>

          <div className="cg-pgn">
            {Array.from({ length: Math.ceil(game.moves.length / 2) }, (_, pair) => {
              const wi = pair * 2;
              const bi = pair * 2 + 1;
              const jumpTo = (idx: number) => {
                const cls = moveClassifications[idx];
                setPlyIdx(idx + 1);
                setBoardExpanded(true);
                setCommentary(null);
                say(spokenMove(game.moves[idx]) + (cls ? `, ${cls}` : ''));
              };
              const wCls = moveClassifications[wi];
              const bCls = game.moves[bi] !== undefined ? moveClassifications[bi] : undefined;
              return (
                <div key={pair} className="cg-pgn-pair">
                  <span className="cg-pgn-num">{pair + 1}.</span>
                  <span
                    className={`cg-pgn-move cg-pgn-move-btn${wi === plyIdx - 1 ? ' current' : ''}`}
                    onClick={() => jumpTo(wi)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={e => e.key === 'Enter' && jumpTo(wi)}
                  >
                    {game.moves[wi]}{wCls && <span className={`cg-move-cls cg-move-${wCls}`}>{CLASS_ICON[wCls]}</span>}
                  </span>
                  {game.moves[bi] !== undefined && (
                    <span
                      className={`cg-pgn-move cg-pgn-move-btn${bi === plyIdx - 1 ? ' current' : ''}`}
                      onClick={() => jumpTo(bi)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={e => e.key === 'Enter' && jumpTo(bi)}
                    >
                      {game.moves[bi]}{bCls && <span className={`cg-move-cls cg-move-${bCls}`}>{CLASS_ICON[bCls]}</span>}
                    </span>
                  )}
                </div>
              );
            })}
          </div>

          <div className="cg-question">
            <input
              ref={questionInputRef}
              className="cg-question-input"
              type="text"
              placeholder="Ask a question about this position… (D to focus, Enter to send)"
              value={customQ}
              onChange={e => {
                const newVal = e.target.value;
                // Speak each word as it's completed (space typed)
                if (newVal.endsWith(' ') && !prevQRef.current.endsWith(' ')) {
                  const words = newVal.trim().split(/\s+/);
                  const lastWord = words[words.length - 1];
                  if (lastWord) speak(lastWord);
                }
                prevQRef.current = newVal;
                setCustomQ(newVal);
              }}
              onKeyDown={e => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  const q = customQ.trim();
                  if (q) say(q);
                  handleAskQuestion();
                }
                if (e.key === 'Escape') { questionInputRef.current?.blur(); }
              }}
            />
          </div>

          <div className="cg-mobile-bar">
            <button className="cg-mob-btn" onClick={handleF} aria-label="Back">← Back</button>
            <button className="cg-mob-btn" onClick={handleJ} aria-label="Next move">Next →</button>
            <button className="cg-mob-btn" onClick={handleK} aria-label="Commentary">💬</button>
            <button className="cg-mob-btn" onClick={() => questionInputRef.current?.focus()} aria-label="Ask question">❓ Ask</button>
            <button className="cg-mob-btn" onClick={() => speak(lastSpokenRef.current)} aria-label="Re-read">↺</button>
          </div>

          <div className="cg-legend">
            F = back · J = next · A / Space = commentary · S = board · D = ask · R = re-read
          </div>
        </div>
      </div>
    </div>
  );
}
