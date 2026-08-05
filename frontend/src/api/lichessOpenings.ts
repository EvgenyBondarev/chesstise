export interface MasterMove {
  san:   string;
  uci:   string;
  white: number;
  draws: number;
  black: number;
}

const cache = new Map<string, MasterMove[]>();

export async function fetchMasterMoves(fen: string): Promise<MasterMove[]> {
  if (cache.has(fen)) return cache.get(fen)!;
  try {
    const res = await fetch(
      `https://explorer.lichess.ovh/masters?fen=${encodeURIComponent(fen)}&moves=8&topGames=0`,
    );
    if (!res.ok) return [];
    const data = await res.json();
    const moves: MasterMove[] = (data.moves ?? []).filter(
      (m: MasterMove) => m.white + m.draws + m.black >= 30,
    );
    cache.set(fen, moves);
    return moves;
  } catch {
    return [];
  }
}

export function weightedPick(moves: MasterMove[]): MasterMove | null {
  if (moves.length === 0) return null;
  const total = moves.reduce((s, m) => s + m.white + m.draws + m.black, 0);
  let r = Math.random() * total;
  for (const m of moves) {
    r -= m.white + m.draws + m.black;
    if (r <= 0) return m;
  }
  return moves[0];
}
