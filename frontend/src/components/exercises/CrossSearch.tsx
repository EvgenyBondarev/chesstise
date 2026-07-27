import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PLAYER_REGISTRY, PlayerEntry } from '../../data/playerRegistry';
import { ClassicalGame } from '../../data/classicalGames';

export default function CrossSearch() {
  const navigate = useNavigate();
  const [p1, setP1] = useState('');
  const [p2, setP2] = useState('');
  const [results, setResults] = useState<ClassicalGame[] | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSearch() {
    const q1 = p1.trim().toLowerCase();
    const q2 = p2.trim().toLowerCase();
    if (!q1 || !q2) return;

    setLoading(true);
    setResults(null);

    try {
      const matchQ1: PlayerEntry[] = PLAYER_REGISTRY.filter(e =>
        e.name.toLowerCase().includes(q1)
      );
      const matchQ2: PlayerEntry[] = PLAYER_REGISTRY.filter(e =>
        e.name.toLowerCase().includes(q2)
      );

      const [gamesFromQ1, gamesFromQ2] = await Promise.all([
        Promise.all(matchQ1.map(e => e.getGames())),
        Promise.all(matchQ2.map(e => e.getGames())),
      ]);

      const filteredFromQ1: ClassicalGame[] = gamesFromQ1
        .flat()
        .filter(
          g =>
            g.white.toLowerCase().includes(q2) ||
            g.black.toLowerCase().includes(q2)
        );

      const filteredFromQ2: ClassicalGame[] = gamesFromQ2
        .flat()
        .filter(
          g =>
            g.white.toLowerCase().includes(q1) ||
            g.black.toLowerCase().includes(q1)
        );

      const seen = new Set<string>();
      const deduped: ClassicalGame[] = [];

      for (const g of [...filteredFromQ1, ...filteredFromQ2]) {
        const fp = `${g.white}|${g.black}|${g.year ?? '?'}|${g.moves.length}`;
        if (!seen.has(fp)) {
          seen.add(fp);
          deduped.push(g);
        }
      }

      deduped.sort((a, b) => (b.year ?? 0) - (a.year ?? 0));

      setResults(deduped);
    } finally {
      setLoading(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') handleSearch();
  }

  function handleRowKeyDown(e: React.KeyboardEvent, id: string) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      navigate(`/games/${id}`);
    }
  }

  return (
    <div className="exercise-page">
      <h1 className="exercise-title">Cross-Player Search</h1>
      <p style={{ color: 'var(--muted)', fontSize: '0.85rem', marginBottom: '1rem' }}>Find all games between two players across the entire database.</p>

      <div className="cross-search-bar">
        <input
          className="cross-search-input"
          type="text"
          placeholder="Player 1 (e.g. Carlsen)"
          value={p1}
          onChange={e => setP1(e.target.value)}
          onKeyDown={handleKeyDown}
          aria-label="Player 1"
        />
        <span className="cross-search-vs">vs.</span>
        <input
          className="cross-search-input"
          type="text"
          placeholder="Player 2 (e.g. Nakamura)"
          value={p2}
          onChange={e => setP2(e.target.value)}
          onKeyDown={handleKeyDown}
          aria-label="Player 2"
        />
        <button
          className="cross-search-btn"
          onClick={handleSearch}
          disabled={loading}
        >
          {loading ? 'Searching…' : 'Search'}
        </button>
      </div>

      {results !== null && (
        <>
          <p className="cross-search-count">
            {results.length === 0
              ? 'No games found.'
              : `${results.length} game${results.length === 1 ? '' : 's'} found`}
          </p>

          {results.length > 0 && (
            <div className="player-table-wrap">
              <table className="player-table">
                <thead>
                  <tr>
                    <th>Year</th>
                    <th>White</th>
                    <th>Black</th>
                    <th>Result</th>
                    <th>Event</th>
                    <th>Moves</th>
                  </tr>
                </thead>
                <tbody>
                  {results.map(g => (
                    <tr
                      key={`${g.white}|${g.black}|${g.year ?? '?'}|${g.moves.length}`}
                      className="player-row"
                      onClick={() => navigate(`/games/${g.id}`)}
                      onKeyDown={e => handleRowKeyDown(e, g.id)}
                      tabIndex={0}
                      role="button"
                      aria-label={`${g.white} vs ${g.black}, ${g.year ?? 'unknown year'}`}
                    >
                      <td>{g.year ?? '?'}</td>
                      <td>{g.white}</td>
                      <td>{g.black}</td>
                      <td>{g.result}</td>
                      <td>{g.event ?? '—'}</td>
                      <td>{Math.ceil(g.moves.length / 2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}
