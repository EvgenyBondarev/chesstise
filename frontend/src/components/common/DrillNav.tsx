import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

const DRILL_PATHS = ['/cell-guesser', '/square-color', '/blind-pathing'];

export default function DrillNav() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const idx = DRILL_PATHS.indexOf(pathname);
  const prev = DRILL_PATHS[(idx - 1 + DRILL_PATHS.length) % DRILL_PATHS.length];
  const next = DRILL_PATHS[(idx + 1) % DRILL_PATHS.length];

  useEffect(() => {
    if (idx === -1) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const el = document.activeElement as HTMLElement | null;
      if (el && ['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName)) return;
      if (e.key === 'g') { e.preventDefault(); navigate(prev); }
      if (e.key === 'h') { e.preventDefault(); navigate(next); }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [idx, prev, next, navigate]);

  if (idx === -1) return null;

  return (
    <div className="drill-nav">
      <button className="drill-nav-btn" onClick={() => navigate(prev)}>← Previous (g)</button>
      <button className="drill-nav-btn" onClick={() => navigate(next)}>Next (h) →</button>
    </div>
  );
}
