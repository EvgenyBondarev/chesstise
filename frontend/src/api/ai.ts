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

const GROQ_KEY: string = import.meta.env.VITE_GROQ_API_KEY ?? '';

async function callGroq(prompt: string): Promise<string | null> {
  if (!GROQ_KEY) {
    console.warn('[Groq] VITE_GROQ_API_KEY not set');
    return null;
  }
  try {
    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GROQ_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model:      'llama-3.3-70b-versatile',
        messages:   [{ role: 'user', content: prompt }],
        max_tokens: 300,
      }),
    });
    if (!res.ok) {
      console.error('[Groq]', res.status, await res.text());
      return null;
    }
    const data = await res.json();
    return (data.choices?.[0]?.message?.content as string | undefined)?.trim() ?? null;
  } catch (err) {
    console.error('[Groq] fetch error:', err);
    return null;
  }
}

export async function fetchGeminiEval(
  fen: string,
  pgn: string,
  suggestedMoves: string[],
): Promise<string | null> {
  const prompt =
    `You are a chess coach. The student suggests ${suggestedMoves.join(', ')}.\n` +
    `Position (FEN): ${fen}\n` +
    `Game so far: ${pgn}\n\n` +
    `Evaluate concretely: does this move win material, control a key square, or create a specific threat — name the exact square or piece. ` +
    `If there is a stronger alternative, write it in algebraic notation and say why in one clause. ` +
    `Never say "good move" or "interesting idea" without naming what specifically it achieves. 2 sentences max.`;
  return callGroq(prompt);
}

export async function fetchGroqIntro(
  white: string,
  black: string,
  year: number | null,
  event: string | null,
): Promise<string | null> {
  const context = [year, event].filter(Boolean).join(', ');
  const prompt =
    `You are a concise chess commentator. Introduce the game between ${white} and ${black}` +
    (context ? ` (${context})` : '') +
    `. Who are these players and what style of play should we expect? Answer in exactly 2 short sentences.`;
  return callGroq(prompt);
}

export async function fetchGroqQuestion(
  fen: string,
  pgn: string,
  question: string,
): Promise<string | null> {
  const prompt =
    `You are a chess coach. The student asks: "${question}"\n` +
    `Position (FEN): ${fen}\n` +
    `Game so far: ${pgn}\n\n` +
    `Answer with concrete details only: name specific squares and pieces (e.g. "the knight on f3"), ` +
    `state threats by exact square (e.g. "threatens Bxh7+"), and if recommending a move write it in algebraic notation. ` +
    `Avoid vague phrases like "better position", "active pieces", or "good square" — always say exactly what is won, lost, or controlled and why. ` +
    `2-3 sentences.`;
  return callGroq(prompt);
}

export async function fetchGeminiExplain(
  fen: string,
  pgn: string,
  move: string,
): Promise<string | null> {
  const prompt =
    `You are a chess coach. The move ${move} was just played.\n` +
    `Position (FEN): ${fen}\n` +
    `Game so far: ${pgn}\n\n` +
    `Explain concretely: which square or piece does this move directly target or vacate, ` +
    `what specific threat does it create or prevent (name the square), ` +
    `and what is the opponent's main concern on the next move. ` +
    `Do not use vague terms — name every piece and square you refer to. 2 sentences.`;
  return callGroq(prompt);
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
