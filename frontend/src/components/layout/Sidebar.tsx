import { NavLink } from 'react-router-dom';
import { createPortal } from 'react-dom';
import { useEffect, useState } from 'react';
import { WHITE_OPENINGS, BLACK_OPENINGS } from '../../data/openings';
import { STRUCTURES } from '../../data/structures';
import { PLAYER_REGISTRY } from '../../data/playerRegistry';
import { useAuthStore } from '../../store/authStore';
import { useProfileStore } from '../../store/profileStore';
import { setGlobalSpeechRate } from '../../utils/speechUtils';

function formatDuration(ms: number): string {
  const totalMin = Math.floor(ms / 60000);
  const totalHrs = Math.floor(totalMin / 60);
  const days     = Math.floor(totalHrs / 24);
  const hrs      = totalHrs % 24;
  const mins     = totalMin % 60;
  const parts: string[] = [];
  if (days) parts.push(`${days}d`);
  if (hrs || days) parts.push(`${hrs}h`);
  parts.push(`${mins}m`);
  return parts.join(' ');
}

const DRILLS = [
  { to: '/cell-guesser',   icon: '⊞', label: 'Cell Guesser',        desc: 'Click the square in the lit quadrant' },
  { to: '/square-color',   icon: '◐', label: 'Square Color',         desc: 'Dark or light? Press D / L shortcut'  },
  { to: '/blind-pathing',  icon: '⤳', label: 'Blind Pathing',        desc: 'Type the destination square from memory' },
  { to: '/calculation',    icon: '⁺', label: 'Calculation Trainer',  desc: 'Piece moves, reachability and forks' },
];

function NavItem({ to, icon, label, desc }: { to: string; icon: string; label: string; desc: string }) {
  return (
    <li>
      <NavLink
        to={to}
        className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
        aria-label={`${label}: ${desc}`}
      >
        <span className="nav-icon" aria-hidden="true">{icon}</span>
        <span className="nav-text-group">
          <span className="nav-label">{label}</span>
          <span className="nav-desc" aria-hidden="true">{desc}</span>
        </span>
      </NavLink>
    </li>
  );
}

function SimpleNavItem({ to, label }: { to: string; label: string }) {
  return (
    <li>
      <NavLink
        to={to}
        className={({ isActive }) => `nav-item nav-item-compact${isActive ? ' active' : ''}`}
      >
        {label}
      </NavLink>
    </li>
  );
}

function PlayerSearch() {
  const [q, setQ] = useState('');
  const filtered = q.trim()
    ? PLAYER_REGISTRY.filter(p => p.name.toLowerCase().includes(q.toLowerCase()))
    : PLAYER_REGISTRY;
  return (
    <>
      <input
        className="sidebar-player-search"
        type="search"
        placeholder="Filter players…"
        value={q}
        onChange={e => setQ(e.target.value)}
        aria-label="Filter players"
      />
      <ul role="list" style={{ listStyle: 'none', padding: 0, margin: 0 }}>
        {filtered.map(p => (
          <SimpleNavItem key={p.id} to={`/players/${p.id}`} label={p.name} />
        ))}
        {filtered.length === 0 && (
          <li style={{ padding: '0.4rem 1rem', opacity: 0.5, fontSize: '0.8rem' }}>No match</li>
        )}
      </ul>
    </>
  );
}

export default function Sidebar({ onSignIn, isOpen }: { onSignIn: () => void; isOpen?: boolean }) {
  const displayName  = useAuthStore(s => s.displayName);
  const logout       = useAuthStore(s => s.logout);
  const clearRuns        = useProfileStore(s => s.cellGuesserRuns);
  const cellRuns         = useProfileStore(s => s.cellGuesserRuns);
  const colorRuns        = useProfileStore(s => s.squareColorRuns);
  const blindRuns        = useProfileStore(s => s.blindPathingRuns);
  const speechRate       = useProfileStore(s => s.speechRate);
  const setSpeechRate    = useProfileStore(s => s.setSpeechRate);

  const totalDrillMs = [...cellRuns, ...colorRuns, ...blindRuns].reduce((sum, r) => sum + r.timeMs, 0);

  const [showDrillStats, setShowDrillStats] = useState(false);

  useEffect(() => {
    if (!showDrillStats) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setShowDrillStats(false); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [showDrillStats]);

  const dailyRows = Object.entries(
    [...cellRuns, ...colorRuns, ...blindRuns].reduce((acc, r) => {
      const day = r.date.slice(0, 10);
      acc[day] = (acc[day] ?? 0) + r.timeMs;
      return acc;
    }, {} as Record<string, number>)
  ).sort(([a], [b]) => b.localeCompare(a));

  useEffect(() => { setGlobalSpeechRate(speechRate); }, [speechRate]);

  const handleLogout = () => {
    logout();
    // Keep local runs intact — they'll reload from API on next login
    void clearRuns;
  };

  return (
    <nav className={`sidebar${isOpen ? ' sidebar-open' : ''}`} aria-label="Main navigation">
      <div className="sidebar-logo" aria-hidden="true">♟ Chesstíse</div>
      <h2 className="sr-only">Chesstíse – Blindfold Chess Trainer</h2>

      {/* ── Classical Games ── */}
      <details className="sidebar-group" open>
        <summary className="sidebar-group-btn">Classical Games</summary>
        <SimpleNavItem to="/cross-search" label="⇄ Cross-player search" />
        <PlayerSearch />
      </details>

      {/* ── Drills ── */}
      <div className="sidebar-drills-wrapper">
        <details className="sidebar-group">
          <summary className="sidebar-group-btn">Drills</summary>
          <ul role="list" style={{ listStyle: 'none', padding: 0, margin: 0 }}>
            {DRILLS.map(d => <NavItem key={d.to} {...d} />)}
          </ul>
        </details>
        {totalDrillMs > 0 && (
          <button
            className={`sidebar-group-time${showDrillStats ? ' active' : ''}`}
            onClick={() => setShowDrillStats(s => !s)}
            aria-label={`Total drill time ${formatDuration(totalDrillMs)}, click for daily breakdown`}
          >
            {formatDuration(totalDrillMs)}
          </button>
        )}
      </div>

      {showDrillStats && dailyRows.length > 0 && createPortal(
        <div className="modal-backdrop" onClick={() => setShowDrillStats(false)}>
          <div className="modal-panel" role="dialog" aria-modal="true" aria-label="Daily drill time" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <span className="modal-title">Daily drill time</span>
              <button className="modal-close-btn" onClick={() => setShowDrillStats(false)} aria-label="Close">×</button>
            </div>
            <table className="drill-stats-table">
              <thead><tr><th>Date</th><th>Time</th></tr></thead>
              <tbody>
                {dailyRows.map(([day, ms]) => (
                  <tr key={day}>
                    <td>{new Date(day + 'T12:00:00').toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</td>
                    <td>{formatDuration(ms)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>,
        document.body
      )}

      {/* ── Openings ── */}
      <details className="sidebar-group">
        <summary className="sidebar-group-btn">Openings</summary>
        <div className="sidebar-sub-label" aria-hidden="true">For White — Learn</div>
        <ul role="list" style={{ listStyle: 'none', padding: 0, margin: 0 }}>
          {WHITE_OPENINGS.map(o => (
            <SimpleNavItem key={o.id} to={`/openings/${o.id}`} label={o.name} />
          ))}
        </ul>
        <div className="sidebar-sub-label" aria-hidden="true">For White — Recall</div>
        <ul role="list" style={{ listStyle: 'none', padding: 0, margin: 0 }}>
          {WHITE_OPENINGS.map(o => (
            <SimpleNavItem key={o.id + '-r'} to={`/openings/${o.id}/recall`} label={o.name} />
          ))}
        </ul>
        <div className="sidebar-sub-label" aria-hidden="true">For Black — Learn</div>
        <ul role="list" style={{ listStyle: 'none', padding: 0, margin: 0 }}>
          {BLACK_OPENINGS.map(o => (
            <SimpleNavItem key={o.id} to={`/openings/${o.id}`} label={o.name} />
          ))}
        </ul>
        <div className="sidebar-sub-label" aria-hidden="true">For Black — Recall</div>
        <ul role="list" style={{ listStyle: 'none', padding: 0, margin: 0 }}>
          {BLACK_OPENINGS.map(o => (
            <SimpleNavItem key={o.id + '-r'} to={`/openings/${o.id}/recall`} label={o.name} />
          ))}
        </ul>
      </details>

      {/* ── Middlegame ── */}
      <details className="sidebar-group">
        <summary className="sidebar-group-btn">Middlegame</summary>
        <div className="sidebar-sub-label" aria-hidden="true">Pawn Structures</div>
        <ul role="list" style={{ listStyle: 'none', padding: 0, margin: 0 }}>
          {STRUCTURES.map(s => (
            <SimpleNavItem key={s.id} to={`/structures/${s.id}`} label={s.name} />
          ))}
        </ul>
        <div className="sidebar-sub-label" aria-hidden="true">Themes</div>
        <div className="sidebar-placeholder">Coming soon</div>
      </details>

      {/* ── Endgame ── */}
      <details className="sidebar-group">
        <summary className="sidebar-group-btn">Endgame</summary>
        <ul role="list" style={{ listStyle: 'none', padding: 0, margin: 0 }}>
          <SimpleNavItem to="/endgame" label="Endgame Drills" />
        </ul>
      </details>

      {/* ── Voice speed ── */}
      <div className="sidebar-speech">
        <span className="sidebar-speech-label">🔊 Speed</span>
        <input
          type="range"
          min={1}
          max={10}
          step={0.5}
          value={speechRate}
          onChange={e => setSpeechRate(Number(e.target.value))}
          className="sidebar-speech-slider"
          aria-label="Voice speed"
        />
        <span className="sidebar-speech-value">{speechRate}×</span>
      </div>

      {/* ── Auth ── */}
      <div className="sidebar-auth">
        {displayName ? (
          <>
            <span className="sidebar-user" title={displayName}>{displayName}</span>
            <button className="sidebar-signout" onClick={handleLogout}>Sign out</button>
          </>
        ) : (
          <button className="sidebar-signin" onClick={onSignIn}>Sign in</button>
        )}
      </div>
    </nav>
  );
}
