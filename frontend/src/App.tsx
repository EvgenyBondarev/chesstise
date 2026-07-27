import { useState, useEffect } from 'react';
import { Routes, Route, Navigate, useParams } from 'react-router-dom';
import AppLayout from './components/layout/AppLayout';
import CellGuesser from './components/exercises/PerspectiveFlip';
import SquareColorDrill from './components/exercises/SquareColorDrill';
import BlindPathing from './components/exercises/BlindPathing';
import OpeningDrill from './components/exercises/OpeningDrill';
import StructureStudy from './components/exercises/StructureStudy';
import ClassicalGame from './components/exercises/ClassicalGame';
import PlayerPage from './components/exercises/PlayerPage';
import CrossSearch from './components/exercises/CrossSearch';
import EndgameStudy from './components/exercises/EndgameStudy';
import OpeningRecall from './components/exercises/OpeningRecall';
import CalculationTrainer from './components/exercises/CalculationTrainer';
import { findGame } from './data/classicalGames';
import { findGameAcrossPlayers } from './data/playerRegistry';
import type { ClassicalGame as GameData } from './data/classicalGames';

function ClassicalGamePage() {
  const { gameId } = useParams<{ gameId: string }>();
  const [game, setGame] = useState<GameData | null | undefined>(null);

  useEffect(() => {
    if (!gameId) { setGame(undefined); return; }
    setGame(null);
    findGameAcrossPlayers(gameId).then(g => {
      setGame(g ?? findGame(gameId) ?? undefined);
    });
  }, [gameId]);

  if (game === null) return <div className="exercise-page"><p style={{ padding: '2rem' }}>Loading…</p></div>;
  if (!game) return <div className="exercise-page"><p style={{ padding: '2rem' }}>Game not found.</p></div>;
  return <ClassicalGame game={game} />;
}

export default function App() {
  return (
    <AppLayout>
      <Routes>
        <Route path="/"                   element={<Navigate to="/cell-guesser" replace />} />
        <Route path="/cell-guesser"       element={<CellGuesser />} />
        <Route path="/square-color"       element={<SquareColorDrill />} />
        <Route path="/blind-pathing"      element={<BlindPathing />} />
        <Route path="/openings/:id"        element={<OpeningDrill />} />
        <Route path="/openings/:id/recall" element={<OpeningRecall />} />
        <Route path="/structures/:id"      element={<StructureStudy />} />
        <Route path="/players/:playerId"   element={<PlayerPage />} />
        <Route path="/cross-search"        element={<CrossSearch />} />
        <Route path="/games/:gameId"       element={<ClassicalGamePage />} />
        <Route path="/endgame"             element={<EndgameStudy />} />
        <Route path="/calculation"         element={<CalculationTrainer />} />
      </Routes>
    </AppLayout>
  );
}
