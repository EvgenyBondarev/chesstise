interface Props {
  children: React.ReactNode;
  isExpanded: boolean;
  onToggle: () => void;
}

export default function CollapsibleBoard({ children, isExpanded, onToggle }: Props) {
  return (
    <div className="collapsible-board">
      <button
        className="board-toggle-btn"
        onClick={onToggle}
        aria-expanded={isExpanded}
      >
        {isExpanded ? 'Hide board ▲' : 'Show board ▼'}
      </button>
      {isExpanded && <div className="board-wrap">{children}</div>}
    </div>
  );
}
