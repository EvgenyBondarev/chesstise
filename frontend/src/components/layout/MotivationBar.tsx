import { useEffect, useRef, useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useMotivationStore } from '../../store/motivationStore';
import { playAlertSound, playCongratsSound } from '../../utils/speechUtils';
import {
  getDateKey, expectedHours, freeUntil, formatClock, formatHM, formatStopwatch, windowFraction,
  WINDOW_START_HOUR, WINDOW_END_HOUR,
} from '../../utils/motivation';

const TICK_HOURS  = [8, 10, 12, 14, 16, 18, 20, 22, 24];
const LABEL_HOURS = [8, 12, 16, 20, 24];

function hourPct(h: number): number {
  return ((h - WINDOW_START_HOUR) / (WINDOW_END_HOUR - WINDOW_START_HOUR)) * 100;
}

function shortDate(dateKey: string): string {
  return new Date(`${dateKey}T00:00:00`).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

interface NumFieldProps {
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  step?: number;
  ariaLabel: string;
  placeholder?: string;
  className?: string;
}

function NumField({ value, onChange, min = 0, max, step = 1, ariaLabel, placeholder, className }: NumFieldProps) {
  const clamp = (v: number) => {
    let r = v;
    if (min !== undefined) r = Math.max(min, r);
    if (max !== undefined) r = Math.min(max, r);
    return r;
  };
  return (
    <span className="num-field">
      <input
        type="number"
        className={`num-field-input${className ? ` ${className}` : ''}`}
        min={min}
        max={max}
        step={step}
        placeholder={placeholder}
        value={value || ''}
        onChange={e => onChange(clamp(Number(e.target.value) || 0))}
        aria-label={ariaLabel}
      />
      <span className="num-field-spin">
        <button type="button" tabIndex={-1} className="num-field-spin-btn" aria-label={`Increase ${ariaLabel}`} onClick={() => onChange(clamp(value + step))}>
          <span className="num-field-arrow-up" />
        </button>
        <button type="button" tabIndex={-1} className="num-field-spin-btn" aria-label={`Decrease ${ariaLabel}`} onClick={() => onChange(clamp(value - step))}>
          <span className="num-field-arrow-down" />
        </button>
      </span>
    </span>
  );
}

export default function MotivationBar() {
  const goalHoursByDate = useMotivationStore(s => s.goalHoursByDate);
  const manualMsByDate  = useMotivationStore(s => s.manualMsByDate);
  const sessions        = useMotivationStore(s => s.sessions);
  const running         = useMotivationStore(s => s.running);
  const setGoalHours    = useMotivationStore(s => s.setGoalHours);
  const addManualMs     = useMotivationStore(s => s.addManualMs);
  const clearManualMs   = useMotivationStore(s => s.clearManualMs);
  const start           = useMotivationStore(s => s.start);
  const stop            = useMotivationStore(s => s.stop);

  const [now, setNow]                     = useState(() => new Date());
  const [showLateAlert, setShowLateAlert] = useState(false);
  const [showManual, setShowManual]       = useState(false);
  const [manualH, setManualH]             = useState(0);
  const [manualM, setManualM]             = useState(0);

  const lastAlertHourRef = useRef(new Date().getHours());
  const goalMetRef       = useRef(false);
  const manualRef        = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  // Close manual popover on outside click / Escape
  useEffect(() => {
    if (!showManual) return;
    const onClick = (e: MouseEvent) => {
      if (manualRef.current && !manualRef.current.contains(e.target as Node)) setShowManual(false);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setShowManual(false); };
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [showManual]);

  // Close late modal on Enter or Escape
  useEffect(() => {
    if (!showLateAlert) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === 'Escape') { e.preventDefault(); setShowLateAlert(false); }
    };
    document.addEventListener('keydown', onKey, { capture: true });
    return () => document.removeEventListener('keydown', onKey, { capture: true });
  }, [showLateAlert]);

  const todayKey = getDateKey(now);

  // Carry forward most recent non-zero goal to a fresh day
  useEffect(() => {
    if (goalHoursByDate[todayKey] !== undefined) return;
    const priorDates = Object.keys(goalHoursByDate).filter(d => d < todayKey).sort();
    const lastGoal = priorDates.length ? goalHoursByDate[priorDates[priorDates.length - 1]] : 0;
    if (lastGoal > 0) setGoalHours(todayKey, lastGoal);
  }, [todayKey, goalHoursByDate, setGoalHours]);

  const goalData = useMemo(() => {
    const goalHours   = goalHoursByDate[todayKey] ?? 0;
    const manualMs    = manualMsByDate[todayKey] ?? 0;
    const completedMs = sessions
      .filter(s => s.date === todayKey)
      .reduce((sum, s) => sum + (s.endMs - s.startMs), 0);
    const runningMs   = running ? Math.max(0, now.getTime() - running.startedAt) : 0;
    const actualMs    = completedMs + runningMs + manualMs;
    const actualHours = actualMs / 3_600_000;
    const expected    = goalHours > 0 ? expectedHours(goalHours, now) : 0;
    const isLate      = goalHours > 0 && actualHours < expected;
    return { goalHours, actualMs, actualHours, expected, isLate };
  }, [goalHoursByDate, manualMsByDate, sessions, running, now, todayKey]);

  // History rows: all days with data, newest first
  const historyRows = useMemo(() => {
    const allDates = new Set([
      ...Object.keys(goalHoursByDate),
      ...Object.keys(manualMsByDate),
      ...sessions.map(s => s.date),
    ]);
    return Array.from(allDates)
      .sort()
      .reverse()
      .map(date => {
        const goalH  = goalHoursByDate[date] ?? 0;
        const manMs  = manualMsByDate[date] ?? 0;
        const doneMs = sessions
          .filter(s => s.date === date)
          .reduce((sum, s) => sum + (s.endMs - s.startMs), 0) + manMs;
        return { date, goalH, doneMs };
      });
  }, [goalHoursByDate, manualMsByDate, sessions]);

  // Triumph sound when goal is first met this session
  useEffect(() => {
    const { goalHours: gh, actualHours: ah } = goalData;
    if (gh <= 0) { goalMetRef.current = false; return; }
    const met = ah >= gh;
    if (met && !goalMetRef.current) { goalMetRef.current = true; playCongratsSound(); }
    if (!met) goalMetRef.current = false;
  }, [goalData]);

  // Late alert once per hour boundary, suppressed while timer is running
  useEffect(() => {
    const currentHour = now.getHours();
    if (currentHour === lastAlertHourRef.current) return;
    lastAlertHourRef.current = currentHour;
    if (!goalData.isLate || running) return;
    playAlertSound();
    setShowLateAlert(true);
    if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
      try {
        const { actualMs, goalHours } = goalData;
        new Notification('Chesstíse — behind schedule', {
          body: `${formatHM(actualMs)} / ${formatHM(goalHours * 3_600_000)} done`,
        });
      } catch { /* Notification unavailable */ }
    }
  }, [goalData, now, running]);

  const { goalHours, actualMs, actualHours, isLate } = goalData;

  const hasGoal       = goalHours > 0;
  const goalTotalMin  = Math.round(goalHours * 60);
  const goalH         = Math.floor(goalTotalMin / 60);
  const goalM         = goalTotalMin % 60;
  const freeUntilTime = hasGoal ? freeUntil(actualHours, goalHours, now) : null;
  const manualMsToday = manualMsByDate[todayKey] ?? 0;
  const runningMsDisplay = running ? Math.max(0, now.getTime() - running.startedAt) : 0;

  const updateGoal = (h: number, m: number) => {
    const hours = Math.max(0, h) + Math.max(0, Math.min(59, m)) / 60;
    setGoalHours(todayKey, hours);
  };

  const handleToggle = () => {
    if (running) { stop(); return; }
    if (typeof Notification !== 'undefined' && Notification.permission === 'default') {
      void Notification.requestPermission();
    }
    start();
  };

  const handleAddManual = () => {
    const ms = (Math.max(0, manualH) * 60 + Math.max(0, Math.min(59, manualM))) * 60_000;
    if (ms > 0) addManualMs(todayKey, ms);
    setManualH(0);
    setManualM(0);
    setShowManual(false);
  };

  const nowFraction  = windowFraction(now);
  const fillFraction = hasGoal ? Math.min(1, actualHours / goalHours) : 0;

  return (
    <div className="motivation-bar">
      <div className="motivation-controls">
        <label className="motivation-goal-label">
          Goal
          <NumField
            className="motivation-goal-input"
            value={goalH}
            onChange={h => updateGoal(h, goalM)}
            step={1}
            placeholder="0"
            ariaLabel="Goal hours for today"
          />
          h
          <NumField
            className="motivation-goal-input"
            value={goalM}
            onChange={m => updateGoal(goalH, m)}
            max={59}
            step={5}
            placeholder="0"
            ariaLabel="Goal minutes for today"
          />
          m
        </label>

        <button
          className={`motivation-playstop${running ? ' running' : ''}`}
          onClick={handleToggle}
          aria-label={running ? 'Stop session' : 'Start session'}
        >
          {running
            ? <span className="motivation-stop-icon" aria-hidden="true" />
            : <span className="motivation-play-icon" aria-hidden="true" />}
        </button>

        {running && (
          <span className="motivation-session-clock" aria-live="off">
            {formatStopwatch(runningMsDisplay)}
          </span>
        )}

        <span className="motivation-total" aria-live="off">
          {formatHM(actualMs)}{hasGoal ? ` / ${formatHM(goalHours * 3_600_000)}` : ''}
        </span>

        <div className="motivation-manual-wrap" ref={manualRef}>
          <button
            className="motivation-manual-btn"
            onClick={() => setShowManual(o => !o)}
            aria-label="Manually add worked time"
            aria-expanded={showManual}
            title="Forgot to hit play? Add time manually"
          >
            ✎
          </button>
          {showManual && (
            <div className="motivation-manual-popover" role="dialog" aria-label="Add time manually">
              <div className="motivation-manual-row">
                <NumField value={manualH} onChange={setManualH} step={1} placeholder="0" ariaLabel="Hours to add" />
                h
                <NumField value={manualM} onChange={setManualM} max={59} step={5} placeholder="0" ariaLabel="Minutes to add" />
                m
                <button className="motivation-manual-add" onClick={handleAddManual}>Add</button>
              </div>
              {manualMsToday > 0 && (
                <div className="motivation-manual-existing">
                  <span>Added manually today: {formatHM(manualMsToday)}</span>
                  <button className="motivation-manual-clear" onClick={() => clearManualMs(todayKey)}>Clear</button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="motivation-timeline-wrap">
        <div className={`motivation-timeline${isLate ? ' late' : ''}`}>
          <div className="motivation-timeline-track">
            {hasGoal && (
              <div className="motivation-timeline-fill" style={{ width: `${fillFraction * 100}%` }} />
            )}
            {TICK_HOURS.map(h => (
              <div key={h} className="motivation-timeline-tick" style={{ left: `${hourPct(h)}%` }} />
            ))}
            <div className="motivation-timeline-now" style={{ left: `${nowFraction * 100}%` }} />
          </div>
          <div className="motivation-timeline-labels">
            {LABEL_HOURS.map(h => (
              <span
                key={h}
                className="motivation-timeline-label"
                style={{
                  left: `${hourPct(h)}%`,
                  transform: h === WINDOW_START_HOUR ? 'translateX(0)' : h === WINDOW_END_HOUR ? 'translateX(-100%)' : 'translateX(-50%)',
                }}
              >
                {h}:00
              </span>
            ))}
          </div>
        </div>

        <span className={`motivation-status${isLate ? ' late' : ''}`}>
          {!hasGoal
            ? 'Set a goal to start tracking'
            : isLate
              ? `Behind schedule — ${formatHM(goalData.expected * 3_600_000 - actualMs)} to catch up`
              : freeUntilTime
                ? `On track — free until ${formatClock(freeUntilTime)}`
                : ''}
        </span>
      </div>

      {historyRows.length > 0 && (
        <div className="motivation-history">
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Goal</th>
                <th>Done</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {historyRows.map(({ date, goalH: gh, doneMs }) => {
                const met    = gh > 0 && doneMs >= gh * 3_600_000;
                const behind = gh > 0 && doneMs < gh * 3_600_000;
                return (
                  <tr key={date} className={date === todayKey ? 'motivation-history-today' : ''}>
                    <td>{shortDate(date)}</td>
                    <td>{gh > 0 ? formatHM(gh * 3_600_000) : '—'}</td>
                    <td>{doneMs > 0 ? formatHM(doneMs) : '—'}</td>
                    <td className={met ? 'hist-met' : behind ? 'hist-behind' : ''}>
                      {met ? '✓' : behind ? '✗' : ''}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {showLateAlert && createPortal(
        <div className="modal-backdrop" onClick={() => setShowLateAlert(false)}>
          <div
            className="modal-panel motivation-alert-panel"
            role="alertdialog"
            aria-modal="true"
            aria-label="Behind schedule"
            onClick={e => e.stopPropagation()}
          >
            <div className="modal-header">
              <span className="modal-title">⏰ Behind schedule</span>
              <button className="modal-close-btn" onClick={() => setShowLateAlert(false)} aria-label="Close">×</button>
            </div>
            <div className="motivation-alert-body">
              <p style={{ margin: 0 }}>
                {formatHM(actualMs)} of {formatHM(goalHours * 3_600_000)} done. Time to play.
              </p>
            </div>
            <div style={{ textAlign: 'right', padding: '0 1rem 0.75rem' }}>
              <button className="motivation-manual-add" onClick={() => setShowLateAlert(false)}>OK (Enter)</button>
            </div>
          </div>
        </div>,
        document.body,
      )}
    </div>
  );
}
