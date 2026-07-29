import { useParams, Link, useNavigate } from 'react-router-dom';
import { Chessboard } from 'react-chessboard';
import { getStructure, STRUCTURES } from '../../data/structures';
import CollapsibleBoard from '../common/CollapsibleBoard';

const BOARD_SIZE = 360;

export default function StructureStudy() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const structure = id ? getStructure(id) : undefined;

  if (!structure) {
    return (
      <div className="exercise-page">
        <Link to="/" className="back-link">← Back</Link>
        <p style={{ color: 'var(--muted)' }}>Structure not found.</p>
      </div>
    );
  }

  return (
    <div className="exercise-page">
      <div className="opening-drill-header">
        <h1 className="exercise-title">{structure.name}</h1>
      </div>

      <div className="exercise-body">
        <div className="board-col">
          <CollapsibleBoard>
            <Chessboard
              position={structure.fen}
              boardWidth={BOARD_SIZE}
              boardOrientation="white"
              showBoardNotation={false}
              arePiecesDraggable={false}
              animationDuration={0}
            />
          </CollapsibleBoard>
        </div>

        <div className="structure-info">
          <p className="structure-summary">{structure.summary}</p>

          {structure.transitions.length > 0 && (
            <div className="structure-transitions">
              <h2 className="structure-transitions-label">Transitions</h2>
              <ul className="transition-list" role="list">
                {structure.transitions.map(t => (
                  <li key={t.toId}>
                    <button
                      className="transition-btn"
                      onClick={() => navigate(`/structures/${t.toId}`)}
                    >
                      <span className="transition-trigger">{t.trigger}</span>
                      <span className="transition-arrow">→</span>
                      <span className="transition-name">{t.toName}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="structure-nav">
            {STRUCTURES.map(s => (
              <Link
                key={s.id}
                to={`/structures/${s.id}`}
                className={`structure-nav-item${s.id === structure.id ? ' active' : ''}`}
                aria-current={s.id === structure.id ? 'page' : undefined}
              >
                {s.name}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
