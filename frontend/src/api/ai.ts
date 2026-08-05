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
    `Chess coach. Student suggests: ${suggestedMoves.join(', ')}.\n` +
    `FEN: ${fen}\n` +
    `Moves so far: ${pgn}\n\n` +
    `First sentence: say directly what this move accomplishes — which piece or square it targets, defends, or gains. ` +
    `Name every piece and square. Do not start with "This move" or "That is".\n` +
    `Second sentence: if this is the best move, say so. If there is a stronger alternative, name it in algebraic notation and say in one clause why it is stronger. 2 sentences max.`;
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
    `Chess coach answering a student question. Question: "${question}"\n` +
    `FEN: ${fen}\n` +
    `Moves so far: ${pgn}\n\n` +
    `Answer directly — no "Great question" or preamble. ` +
    `Only state things you can verify from the position; do NOT invent piece locations or relationships. ` +
    `If recommending a move, write it in algebraic notation. ` +
    `Never say "better position" or "active pieces" without naming exactly what is won, lost, or controlled. ` +
    `2-3 sentences, level: knows basic tactics, not deep strategy.`;
  return callGroq(prompt);
}

export async function fetchGeminiExplain(
  fen: string,
  pgn: string,
  move: string,
  evalHint?: string | null,
): Promise<string | null> {
  const prompt =
    `Chess commentator. Move played: ${move}.\n` +
    `FEN: ${fen}\n` +
    `Recent moves: ${pgn}\n` +
    (evalHint ? `Engine evaluation before → after: ${evalHint}\n` : '') +
    `\n1-2 sentences. Say only what this move directly and concretely does: where the piece went and what it immediately threatens or captures. ` +
    `Do NOT invent piece relationships — only state things you are certain about from the position. ` +
    `Do NOT start with "This move". ` +
    `If the evaluation dropped, call it an inaccuracy and name what was missed.`;
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
