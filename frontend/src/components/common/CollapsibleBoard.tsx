import { useState } from 'react';

interface Props {
  children: React.ReactNode;
  isExpanded?: boolean;
  onToggle?: () => void;
}

export default function CollapsibleBoard({ children, isExpanded, onToggle }: Props) {
  const [localVisible, setLocalVisible] = useState(true);
  const visible = isExpanded !== undefined ? isExpanded : localVisible;
  const toggle  = onToggle ?? (() => setLocalVisible(v => !v));

  return (
    <div className="collapsible-board">
      <button
        className="board-toggle-btn"
        onClick={toggle}
        aria-expanded={visible}
      >
        {visible ? 'Hide board ▲' : 'Show board ▼'}
      </button>
      {visible && <div className="board-wrap">{children}</div>}
    </div>
  );
}
