import api from './client';

export interface LichessEval {
  cp:      number | null;
  mate:    number | null;
  bestUci: string | null;
}

export async function fetchLichessEval(fen: string): Promise<LichessEval | null> {
  try {
    const res = await fetch(
      `https://lichess.org/api/cloud-eval?fen=${encodeURIComponent(fen)}&multiPv=1`,
    );
    if (!res.ok) return null;
    const data = await res.json();
    const pv = data.pvs?.[0];
    if (!pv) return null;
    return {
      cp:      pv.cp      ?? null,
      mate:    pv.mate    ?? null,
      bestUci: pv.moves?.split(' ')[0] ?? null,
    };
  } catch {
    return null;
  }
}

export async function fetchGeminiEval(
  fen: string,
  pgn: string,
  suggestedMoves: string[],
): Promise<string | null> {
  try {
    const { data } = await api.post<{ text: string }>('/ai/evaluate', { fen, pgn, suggestedMoves });
    return data.text;
  } catch {
    return null;
  }
}

export async function fetchGroqIntro(
  white: string,
  black: string,
  year: number | null,
  event: string | null,
): Promise<string | null> {
  try {
    const { data } = await api.post<{ text: string }>('/ai/intro', { white, black, year, event });
    return data.text;
  } catch {
    return null;
  }
}

export async function fetchGroqQuestion(
  fen: string,
  pgn: string,
  question: string,
): Promise<string | null> {
  try {
    const { data } = await api.post<{ text: string }>('/ai/question', { fen, pgn, question });
    return data.text;
  } catch {
    return null;
  }
}

export async function fetchGeminiExplain(
  fen: string,
  pgn: string,
  move: string,
): Promise<string | null> {
  try {
    const { data } = await api.post<{ text: string }>('/ai/explain', { fen, pgn, move });
    return data.text;
  } catch (err: unknown) {
    const msg = (err as { response?: { data?: unknown } })?.response?.data;
    if (msg && typeof msg === 'string') return `[AI error: ${msg}]`;
    return null;
  }
}

export function formatEval(ev: LichessEval): string {
  if (ev.mate !== null) {
    const prefix = ev.mate < 0 ? 'negative ' : '';
    return `${prefix}Mate in ${Math.abs(ev.mate)}`;
  }
  if (ev.cp === null || ev.cp === 0) return '0';
  const pawns = (Math.abs(ev.cp) / 100).toFixed(1);
  return ev.cp < 0 ? `negative ${pawns}` : pawns;
}
