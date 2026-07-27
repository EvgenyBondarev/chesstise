import { useState } from 'react';

interface Props {
  children: React.ReactNode;
  defaultVisible?: boolean;
}

export default function CollapsibleBoard({ children, defaultVisible = true }: Props) {
  const [visible, setVisible] = useState(defaultVisible);
  return (
    <div className="collapsible-board">
      <button
        className="board-toggle-btn"
        onClick={() => setVisible(v => !v)}
        aria-expanded={visible}
      >
        {visible ? 'Hide board ▲' : 'Show board ▼'}
      </button>
      {visible && <div className="board-wrap">{children}</div>}
    </div>
  );
}
