/**
 * NVDA browse-mode intercepts 'd' (next landmark) and 'l' (next list).
 * Fix: wrap the drill in role="application" and tabIndex={0}.
 * NVDA switches to application mode when this element is focused, passing all
 * keystrokes directly to the DOM instead of intercepting them.
 */
import { useState, useCallback, useEffect, useRef } from 'react';
import { useStopwatch, formatTime } from '../../hooks/useStopwatch';
import type { Square } from 'chess.js';
import { ALL_SQUARES, getSquareColor, shuffleArray, noConsecDupes } from '../../utils/chessUtils';
import { speak, playSound, playCongratsSound } from '../../utils/speechUtils';
import type { SquareColor } from '../../types';
import type { RunResult } from '../../types';
import { useSessionStore } from '../../store/sessionStore';
import { useProfileStore } from '../../store/profileStore';
import { useAnnouncer } from '../../hooks/useAnnouncer';
import StatsPanel from '../common/StatsPanel';

const ID = 'square-color' as const;
const ROUND_SIZE = 30;

function buildDeck(): Square[] {
  return noConsecDupes(shuffleArray(ALL_SQUARES).slice(0, ROUND_SIZE), sq => sq);
}

function isBetter(a: RunResult, b: RunResult): boolean {
  if (a.correct !== b.correct) return a.correct > b.correct;
  return a.timeMs < b.timeMs;
}

export default function SquareColorDrill() {
  const { stats, recordAttempt, resetStats } = useSessionStore();
  const myStats = stats[ID];
  const { announce, liveA, liveB } = useAnnouncer();
  const { addSquareColorRun, squareColorRuns } = useProfileStore();

  const [deck, setDeck]           = useState<Square[]>(() => buildDeck());
  const [idx, setIdx]             = useState(0);
  const [lastResult, setLast]     = useState<'correct' | 'incorrect' | null>(null);
  const [started, setStarted]     = useState(false);
  const [completed, setCompleted] = useState(false);
  const [finalCorrect, setFinalCorrect] = useState(0);
  const [isNewBest, setIsNewBest] = useState(false);
  useEffect(() => { if (isNewBest) playCongratsSound(); }, [isNewBest]);

  const appRef          = useRef<HTMLDivElement>(null);
  const correctRef      = useRef(0);
  const pendingRestart  = useRef(false);
  const { elapsed, start: startTimer, stop: stopTimer } = useStopwatch();

  const bestRun =
    squareColorRuns.length > 0
      ? squareColorRuns.reduce((b, r) => (isBetter(r, b) ? r : b))
      : null;

  // Focus the application region whenever in-game view becomes active
  useEffect(() => {
    if (started && !completed) appRef.current?.focus();
  }, [started, completed]);

  const current = deck[idx];
  const answer  = getSquareColor(current);

  // Voice + aria announcement on each new square (when session running)
  useEffect(() => {
    if (!started) return;
    announce(`${current}. Is it dark or light? Press D or L.`);
    speak(current);
  }, [current, started]); // eslint-disable-line react-hooks/exhaustive-deps

  const completeSession = useCallback(() => {
    const finalTime = stopTimer();
    const finalCorrectCount = correctRef.current;
    const run: RunResult = {
      timeMs:  finalTime,
      correct: finalCorrectCount,
      total:   ROUND_SIZE,
      date:    new Date().toISOString(),
    };
    // Read fresh from the store to avoid stale-closure bug
    const runs = useProfileStore.getState().squareColorRuns;
    const existingBest =
      runs.length > 0 ? runs.reduce((b, r) => (isBetter(r, b) ? r : b)) : null;
    setFinalCorrect(finalCorrectCount);
    setIsNewBest(existingBest === null || isBetter(run, existingBest));
    addSquareColorRun(run);
    setCompleted(true);
  }, [stopTimer, addSquareColorRun]);

  const advance = useCallback(() => {
    const next = idx + 1;
    if (next >= deck.length) completeSession();
    else setIdx(next);
    setLast(null);
  }, [idx, deck.length, completeSession]);

  const guess = useCallback((color: SquareColor) => {
    if (lastResult !== null) return;
    const ok = color === answer;
    if (ok) correctRef.current++;
    playSound(ok);
    setLast(ok ? 'correct' : 'incorrect');
    recordAttempt(ID, ok);
    announce(ok ? `Correct! ${current} is ${answer}.` : `Wrong. ${current} is ${answer}.`);
    setTimeout(advance, ok ? 380 : 750);
  }, [answer, current, lastResult, recordAttempt, announce, advance]);

  useEffect(() => {
    if (!started || completed) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if (e.key === 'd' || e.key === 'D') { e.preventDefault(); guess('dark'); }
      else if (e.key === 'l' || e.key === 'L') { e.preventDefault(); guess('light'); }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [started, completed, guess]);

  const handleStart = useCallback(() => {
    startTimer();
    setStarted(true);
  }, [startTimer]);

  const handleRestart = useCallback(() => {
    correctRef.current = 0;
    resetStats(ID);
    setDeck(buildDeck());
    setIdx(0);
    setLast(null);
    setFinalCorrect(0);
    setIsNewBest(false);
    setCompleted(false);
    pendingRestart.current = true;
    setStarted(false);
  }, [resetStats]);

  // Auto-start after a restart once the pregame state is committed
  useEffect(() => {
    if (!pendingRestart.current || started || completed) return;
    pendingRestart.current = false;
    startTimer();
    setStarted(true);
  }, [started, completed, startTimer]);

  useEffect(() => {
    if (started && !completed) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 's' || e.ctrlKey || e.metaKey || e.altKey) return;
      const el = document.activeElement as HTMLElement | null;
      if (el && ['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName)) return;
      e.preventDefault();
      if (completed) handleRestart();
      else handleStart();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [started, completed, handleStart, handleRestart]);

  // ── Pre-game ─────────────────────────────────────────────────
  if (!started) {
    const recentRuns = [...squareColorRuns].reverse().slice(0, 10);
    const bestDate = bestRun?.date;
    return (
      <div className="exercise-page">
        <h1 className="exercise-title">Square Color Blind-Sense</h1>
        <div className="pregame-screen">
          <p className="pregame-desc">
            {ROUND_SIZE} squares — identify the color as fast as you can
          </p>
          {bestRun && (
            <p className="pregame-best">
              Best: {bestRun.correct}/{bestRun.total} in {formatTime(bestRun.timeMs)}
            </p>
          )}
          <details className="color-hint-details">
            <summary>How to quickly find a square's color</summary>
            <div className="color-hint-body">
              <p>Convert the file letter to a number: <strong>a=1, b=2, c=3, d=4, e=5, f=6, g=7, h=8</strong>.</p>
              <p>Add the rank number to it. If the sum is <strong>divisible by 2</strong> (no remainder) → <strong>dark</strong>. Otherwise → <strong>light</strong>.</p>
              <p>Example: <strong>f3</strong> → 6 + 3 = 9. 9 ÷ 2 has a remainder → <strong>light</strong>.</p>
              <p>Example: <strong>d4</strong> → 4 + 4 = 8. 8 ÷ 2 = 4 exactly → <strong>dark</strong>.</p>
            </div>
          </details>
          <button className="game-btn" onClick={handleStart}>
            Start (s)
          </button>
          {squareColorRuns.length > 0 && (
            <table className="run-history">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Correct</th>
                  <th>Time</th>
                </tr>
              </thead>
              <tbody>
                {recentRuns.map((r, i) => (
                  <tr key={i} className={r.date === bestDate ? 'best-run' : ''}>
                    <td>{new Date(r.date).toLocaleString()}</td>
                    <td>{r.correct}/{r.total}</td>
                    <td>{formatTime(r.timeMs)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    );
  }

  // ── Completion ───────────────────────────────────────────────
  if (completed) {
    const recentRuns = [...squareColorRuns].reverse().slice(0, 10);
    const bestDate = bestRun?.date;
    return (
      <div className="exercise-page">
        <h1 className="exercise-title">Square Color Blind-Sense</h1>
        <div className="completion-screen">
          <p className="completion-label">{ROUND_SIZE} squares — session complete</p>
          <p className="completion-score">{finalCorrect}/{ROUND_SIZE} correct</p>
          <p className="completion-time">{formatTime(elapsed)}</p>
          {isNewBest ? (
            <p className="completion-badge new-best">New best!</p>
          ) : (
            bestRun && (
              <p className="completion-badge">
                Best: {bestRun.correct}/{bestRun.total} in {formatTime(bestRun.timeMs)}
              </p>
            )
          )}
          {squareColorRuns.length > 1 && (
            <table className="run-history">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Correct</th>
                  <th>Time</th>
                </tr>
              </thead>
              <tbody>
                {recentRuns.map((r, i) => (
                  <tr key={i} className={r.date === bestDate ? 'best-run' : ''}>
                    <td>{new Date(r.date).toLocaleString()}</td>
                    <td>{r.correct}/{r.total}</td>
                    <td>{formatTime(r.timeMs)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          <button className="game-btn" onClick={handleRestart}>
            Start again (s)
          </button>
        </div>
      </div>
    );
  }

  // ── In-game ──────────────────────────────────────────────────
  return (
    <div className="exercise-page">
      <h1 className="exercise-title">Square Color Blind-Sense</h1>
      <div className="color-drill-page">
        <div
          role="application"
          aria-label="Square Color drill. Press D for dark or L for light."
          ref={appRef}
          tabIndex={0}
          className="color-drill-left"
          style={{ outline: 'none' }}
        >
          {/* Dual live regions so same-text re-announces in NVDA */}
          <div role="status" aria-live="assertive" aria-atomic="true" className="sr-only">{liveA}</div>
          <div role="status" aria-live="assertive" aria-atomic="true" className="sr-only">{liveB}</div>

          <div className="color-prompt-row">
            <span className="stopwatch" aria-live="off">{formatTime(elapsed)}</span>
            <span className="round-counter" aria-live="off">{idx + 1}/{ROUND_SIZE}</span>
          </div>

          <div
            className={`color-square-display${lastResult ? ` flash-${lastResult}` : ''}`}
            aria-label={`Square: ${current}`}
            aria-live="off"
          >
            {current}
          </div>

          <div className="color-buttons" role="group" aria-label="Choose a color">
            <button
              className="color-btn btn-dark"
              onClick={() => guess('dark')}
              aria-label="Dark (press D)"
              aria-keyshortcuts="d"
              disabled={lastResult !== null}
            >
              Dark
              <span className="color-btn-hint" aria-hidden="true">D</span>
            </button>
            <button
              className="color-btn btn-light"
              onClick={() => guess('light')}
              aria-label="Light (press L)"
              aria-keyshortcuts="l"
              disabled={lastResult !== null}
            >
              Light
              <span className="color-btn-hint" aria-hidden="true">L</span>
            </button>
          </div>
        </div>

        <StatsPanel stats={myStats} lastResult={lastResult} onReset={handleRestart} />
      </div>
    </div>
  );
}
