import type { ClassicalGame } from '../data/classicalGames';

function stripAnnotations(movetext: string): string {
  // Remove comments: { ... }
  let s = movetext.replace(/\{[^}]*\}/g, ' ');
  // Remove variations: ( ... ) — non-nested only, repeated passes for nesting
  for (let i = 0; i < 6; i++) s = s.replace(/\([^()]*\)/g, ' ');
  // Remove NAGs: $N
  s = s.replace(/\$\d+/g, ' ');
  // Remove move numbers: 1. 1... 12.
  s = s.replace(/\d+\.+/g, ' ');
  // Remove result token
  s = s.replace(/1-0|0-1|1\/2-1\/2|\*/g, ' ');
  return s;
}

export function parsePgn(raw: string, idPrefix: string): ClassicalGame[] {
  const games: ClassicalGame[] = [];
  // Split on lines starting with [Event — each new game starts with [Event
  const chunks = raw.split(/(?=^\[Event\s)/m).filter(c => c.trim());

  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    const tags: Record<string, string> = {};

    // Extract all tag pairs [Key "Value"]
    for (const m of chunk.matchAll(/^\[(\w+)\s+"([^"]*)"\]/gm)) {
      tags[m[1]] = m[2];
    }

    if (!tags['White'] || !tags['Black'] || !tags['Result']) continue;

    const result = tags['Result'];
    if (result !== '1-0' && result !== '0-1' && result !== '1/2-1/2') continue;

    // Movetext starts after the last tag line
    const lastTagEnd = [...chunk.matchAll(/^\[.*\]\s*$/gm)].pop();
    const movetextStart = lastTagEnd ? chunk.indexOf(lastTagEnd[0]) + lastTagEnd[0].length : 0;
    const movetext = chunk.slice(movetextStart);

    const cleaned = stripAnnotations(movetext);
    const moves = cleaned.split(/\s+/).map(t => t.trim()).filter(t =>
      t.length > 0 && /[a-hNBRQKO]/.test(t[0])
    );

    if (moves.length === 0) continue;

    const year = tags['Date'] ? parseInt(tags['Date'].slice(0, 4), 10) : null;

    games.push({
      id:     `${idPrefix}-${i}`,
      white:  tags['White'],
      black:  tags['Black'],
      year:   isNaN(year as number) ? null : year,
      event:  tags['Event'] ?? null,
      result: result as '1-0' | '0-1' | '1/2-1/2',
      eco:    tags['ECO'] ?? null,
      moves,
    });
  }

  return games;
}
