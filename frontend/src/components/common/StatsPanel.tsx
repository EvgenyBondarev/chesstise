import type { SessionStats } from '../../types';

interface Props {
  stats: SessionStats;
  lastResult: 'correct' | 'incorrect' | null;
  onReset: () => void;
  idleText?: string;
}

function accuracyClass(acc: number, shown: number) {
  if (shown === 0) return '';
  if (acc >= 80) return 'hi';
  if (acc >= 50) return 'mid';
  return 'lo';
}

export default function StatsPanel({ stats, lastResult, onReset, idleText = 'Waiting…' }: Props) {
  const { shown, correct, accuracy } = stats;
  const accStr = shown === 0 ? 'No attempts yet' : `${accuracy}%`;

  return (
    <aside
      className="stats-panel"
      aria-label="Session statistics"
      aria-live="polite"
      aria-atomic="false"
    >
      <div className="stats-heading" aria-hidden="true">Session Stats</div>

      <dl className="stats-grid">
        <div className="stat">
          <dt className="stat-label">Shown</dt>
          <dd className="stat-value">{shown}</dd>
        </div>
        <div className="stat">
          <dt className="stat-label">Correct</dt>
          <dd className="stat-value">{correct}</dd>
        </div>
        <div className="stat">
          <dt className="stat-label">Accuracy</dt>
          <dd
            className={`stat-value ${accuracyClass(accuracy, shown)}`}
            aria-label={`Accuracy: ${accStr}`}
          >
            {shown === 0 ? '—' : `${accuracy}%`}
          </dd>
        </div>
      </dl>

      <div
        className={`result-pill ${lastResult ?? 'idle'}`}
        role="status"
        aria-live="off"
        aria-label={
          lastResult === 'correct'   ? 'Last answer: correct' :
          lastResult === 'incorrect' ? 'Last answer: wrong' :
          idleText
        }
      >
        {lastResult === 'correct'   && '✓ Correct'}
        {lastResult === 'incorrect' && '✗ Wrong'}
        {lastResult === null        && idleText}
      </div>

      <button
        className="reset-btn"
        onClick={onReset}
        aria-label="Restart session"
      >
        Restart session
      </button>
    </aside>
  );
}
