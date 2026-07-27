import pgnRaw from './carlsen_games.pgn?raw';
import { parsePgn } from '../utils/pgnParser';
import type { ClassicalGame } from './classicalGames';

let _cache: ClassicalGame[] | null = null;

export function getCarlsenGames(): ClassicalGame[] {
  if (!_cache) _cache = parsePgn(pgnRaw, 'carlsen-pgn');
  return _cache;
}

export function findCarlsenGame(id: string): ClassicalGame | undefined {
  return getCarlsenGames().find(g => g.id === id);
}
