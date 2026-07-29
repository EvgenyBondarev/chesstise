import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useMotivationStore } from '../../store/motivationStore';
import { playAlertSound } from '../../utils/speechUtils';
import {
  getDateKey, expectedHours, freeUntil, formatClock, formatHM, windowFraction,
} from '../../utils/motivation';

const ALERT_COOLDOWN_MS = 10 * 60 * 1000; // don't re-nag more than once per 10 min

export default function MotivationBar() {
  const goalHoursByDate = useMotivationStore(s => s.goalHoursByDate);
  const sessions         = useMotivationStore(s => s.sessions);
  const running           = useMotivationStore(s => s.running);
  const setGoalHours      = useMotivationStore(s => s.setGoalHours);
  const start             = useMotivationStore(s => s.start);
  const stop               = useMotivationStore(s => s.stop);

  const [now, setNow] = useState(() => new Date());
  const [showLateModal, setShowLateModal] = useState(false);
  const lastAlertRef = useRef(0);

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const todayKey   = getDateKey(now);
  const goalHours  = goalHoursByDate[todayKey] ?? 0;

  const completedMsToday = sessions
    .filter(s => s.date === todayKey)
    .reduce((sum, s) => sum + (s.endMs - s.startMs), 0);
  const runningMsToday = running ? Math.max(0, now.getTime() - running.startedAt) : 0;
  const actualMs    = completedMsToday + runningMsToday;
  const actualHours = actualMs / 3_600_000;

  const hasGoal   = goalHours > 0;
  const expected  = hasGoal ? expectedHours(goalHours, now) : 0;
  const isLate    = hasGoal && actualHours < expected;
  const freeUntilTime = hasGoal ? freeUntil(actualHours, goalHours, now) : null;

  // Fire the audio + pop-up signal when behind schedule, throttled so it doesn't nag constantly.
  useEffect(() => {
    if (!isLate) return;
    const sinceLast = Date.now() - lastAlertRef.current;
    if (sinceLast < ALERT_COOLDOWN_MS) return;
    lastAlertRef.current = Date.now();
    playAlertSound();
    setShowLateModal(true);
    if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
      try {
        new Notification('Chesstíse — behind schedule', {
          body: `You're behind your ${goalHours}h chess goal for today.`,
        });
      } catch { /* Notification unavailable */ }
    }
  }, [isLate, goalHours, now]);

  const handleToggle = () => {
    if (running) {
      stop();
      return;
    }
    if (typeof Notification !== 'undefined' && Notification.permission === 'default') {
      void Notification.requestPermission();
    }
    start();
  };

  const nowFraction = windowFraction(now);
  const fillFraction = hasGoal ? Math.min(1, actualHours / goalHours) : 0;

  return (
    <div className="motivation-bar">
      <div className="motivation-controls">
        <label className="motivation-goal-label">
          Today's goal
          <input
            type="number"
            className="motivation-goal-input"
            min={0}
            step={0.5}
            placeholder="hrs"
            value={goalHours || ''}
            onChange={e => setGoalHours(todayKey, Math.max(0, Number(e.target.value) || 0))}
            aria-label="Planned chess work hours for today"
          />
          h
        </label>

        <button
          className={`motivation-playstop${running ? ' running' : ''}`}
          onClick={handleToggle}
          aria-label={running ? 'Stop work session' : 'Start work session'}
        >
          {running ? '■' : '▶'}
        </button>

        <span className="motivation-total" aria-live="off">
          {formatHM(actualMs)}{hasGoal ? ` / ${goalHours}h` : ''}
        </span>
      </div>

      <div className="motivation-timeline-wrap">
        <div className={`motivation-timeline${isLate ? ' late' : ''}`}>
          <div className="motivation-timeline-track">
            {hasGoal && (
              <div className="motivation-timeline-fill" style={{ width: `${fillFraction * 100}%` }} />
            )}
            <div className="motivation-timeline-now" style={{ left: `${nowFraction * 100}%` }} />
          </div>
          <div className="motivation-timeline-labels">
            <span>8:00</span>
            <span>24:00</span>
          </div>
        </div>

        <span className={`motivation-status${isLate ? ' late' : ''}`}>
          {!hasGoal
            ? 'Set a goal to start tracking'
            : isLate
              ? `Behind schedule — ${formatHM(expected * 3_600_000 - actualMs)} to catch up`
              : freeUntilTime
                ? `On track — free until ${formatClock(freeUntilTime)}`
                : ''}
        </span>
      </div>

      {showLateModal && createPortal(
        <div className="modal-backdrop" onClick={() => setShowLateModal(false)}>
          <div className="modal-panel motivation-alert-panel" role="alertdialog" aria-modal="true" aria-label="Behind schedule" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <span className="modal-title">⏰ Behind schedule</span>
              <button className="modal-close-btn" onClick={() => setShowLateModal(false)} aria-label="Close">×</button>
            </div>
            <p className="motivation-alert-body">
              You've done {formatHM(actualMs)} of your {goalHours}h goal today. Time to sit down and play.
            </p>
          </div>
        </div>,
        document.body,
      )}
    </div>
  );
}
