// Standalone PGN pattern auditor — run with node scripts/audit-patterns.js <mode> [args]
// Modes:
//   audit-all          — print pattern matrix for the 20 curated games
//   audit <id> <idx>   — show patterns for one game  (e.g. audit kasparov 373)
//   search <id> <pat>  — find decisive games with a given pattern (e.g. search kasparov B1)
//   search-multi <id> <pat1,pat2,...>  — all patterns must be present

'use strict';
const fs   = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'frontend', 'src', 'data');

function readPgn(playerId) {
  const f = path.join(DATA_DIR, `${playerId}_games.pgn`);
  if (!fs.existsSync(f)) return null;
  return fs.readFileSync(f, 'utf8');
}

function getChunks(pgn) {
  return pgn.split(/(?=^\[Event\s)/m).filter(c => c.trim());
}

function getTags(chunk) {
  const tags = {};
  for (const m of chunk.matchAll(/^\[(\w+)\s+"([^"]*)"\]/gm)) {
    tags[m[1]] = m[2];
  }
  return tags;
}

function stripAnnotations(mv) {
  let s = mv.replace(/\{[^}]*\}/g, ' ');
  for (let i = 0; i < 8; i++) s = s.replace(/\([^()]*\)/g, ' ');
  s = s.replace(/\$\d+/g, ' ');
  s = s.replace(/\d+\.+/g, ' ');
  s = s.replace(/1-0|0-1|1\/2-1\/2|\*/g, ' ');
  return s;
}

function parseMoves(chunk) {
  const tagMatches = [...chunk.matchAll(/^\[.*\]\s*$/gm)];
  const last = tagMatches[tagMatches.length - 1];
  const start = last ? chunk.indexOf(last[0]) + last[0].length : 0;
  const cleaned = stripAnnotations(chunk.slice(start));
  return cleaned.split(/\s+/).map(t => t.trim()).filter(t =>
    t.length > 0 && /[a-hNBRQKO]/.test(t[0])
  );
}

function detectPatterns(moves) {
  const white = moves.filter((_, i) => i % 2 === 0);
  const black = moves.filter((_, i) => i % 2 === 1);

  const wCastle = white.includes('O-O-O') ? 'Q' : white.includes('O-O') ? 'K' : null;
  const bCastle = black.includes('O-O-O') ? 'Q' : black.includes('O-O') ? 'K' : null;
  const all     = moves.join(' ');

  return {
    A1: wCastle === 'K',
    A2: wCastle === 'Q',
    A3: wCastle === null,
    A4: bCastle === 'K',
    A5: bCastle === 'Q',
    A6: bCastle === null,
    A7: (wCastle === 'K' && bCastle === 'Q') || (wCastle === 'Q' && bCastle === 'K'),
    B1: all.includes('Bg2'),
    B2: all.includes('Bb2'),
    B3: all.includes('Bg7'),
    B4: all.includes('Bb7'),
    C1: /N[ah][1-8]/.test(all),
    H1: wCastle !== null && bCastle !== null && wCastle === bCastle,
    H2: (wCastle === 'K' && bCastle === 'Q') || (wCastle === 'Q' && bCastle === 'K'),
  };
}

// ── modes ────────────────────────────────────────────────────────────────────

function auditGame(playerId, idx) {
  const pgn = readPgn(playerId);
  if (!pgn) { console.log('Player not found:', playerId); return; }
  const chunks = getChunks(pgn);
  const chunk  = chunks[idx];
  if (!chunk) { console.log(`No game at index ${idx} (total ${chunks.length})`); return; }
  const tags   = getTags(chunk);
  const moves  = parseMoves(chunk);
  const p      = detectPatterns(moves);
  const active = Object.entries(p).filter(([, v]) => v).map(([k]) => k);
  console.log(`${tags.White} vs ${tags.Black}  ${tags.Date || '?'}  [${tags.ECO || '?'}]  ${tags.Result}`);
  console.log('Patterns:', active.join('  ') || 'none');
  console.log('Moves:', moves.length);
}

function auditAll() {
  const CURATED = [
    ['anderssen',54],['anderssen',117],['morphy',124],
    ['lasker',174],['capablanca',244],['alekhine',903],
    ['capablanca',555],['botvinnik',376],
    ['smyslov',688],['tal',358],['spassky',285],
    ['petrosian',940],['fischer',19],['fischer',779],
    ['karpov',498],['kasparov',373],['kasparov',1511],
    ['kramnik',1496],['anand',2671],['carlsen',1586],
  ];
  const KEYS = ['A1','A2','A3','A4','A5','A6','A7','B1','B2','B3','B4','C1','H1','H2'];
  const header = ['Game ID + White vs Black'.padEnd(44), ...KEYS].join(' ');
  console.log(header);
  console.log('-'.repeat(header.length));
  for (const [pid, idx] of CURATED) {
    const pgn = readPgn(pid);
    if (!pgn) { console.log(`${pid}-${idx}: NOT FOUND`); continue; }
    const chunks = getChunks(pgn);
    const chunk  = chunks[idx];
    if (!chunk) { console.log(`${pid}-${idx}: NO GAME`); continue; }
    const tags  = getTags(chunk);
    const moves = parseMoves(chunk);
    const p     = detectPatterns(moves);
    const label = `${pid}-${idx} (${(tags.White || '?').split(',')[0].trim()} v ${(tags.Black || '?').split(',')[0].trim()})`.substring(0, 44).padEnd(44);
    const row   = KEYS.map(k => (p[k] ? '✓' : '').padEnd(k.length + 1));
    console.log(label + ' ' + row.join(' '));
  }
}

function searchGames(playerId, patternFn, maxResults = 15) {
  const pgn = readPgn(playerId);
  if (!pgn) { console.log('Player not found:', playerId); return; }
  const chunks  = getChunks(pgn);
  let   found   = 0;
  for (let i = 0; i < chunks.length; i++) {
    if (found >= maxResults) break;
    try {
      const tags = getTags(chunks[i]);
      if (!tags.White || !tags.Black) continue;
      if (tags.Result !== '1-0' && tags.Result !== '0-1') continue;
      const moves = parseMoves(chunks[i]);
      if (moves.length < 25) continue;
      const p = detectPatterns(moves);
      if (!patternFn(p, tags)) continue;
      const active = Object.entries(p).filter(([, v]) => v).map(([k]) => k).join(' ');
      console.log(`  ${playerId}-${i}: ${tags.White} vs ${tags.Black}  ${tags.Date || '?'}  [${tags.ECO || '?'}]  ${tags.Result}  | ${active}`);
      found++;
    } catch {}
  }
  if (found === 0) console.log('  (no matches)');
}

// ── CLI ───────────────────────────────────────────────────────────────────────

const [,, mode, ...rest] = process.argv;

if (mode === 'audit-all') {
  auditAll();
} else if (mode === 'audit') {
  auditGame(rest[0], parseInt(rest[1]));
} else if (mode === 'search') {
  const [playerId, pat] = rest;
  console.log(`Searching ${playerId} for ${pat}…`);
  searchGames(playerId, p => p[pat]);
} else if (mode === 'search-multi') {
  const [playerId, patStr] = rest;
  const pats = patStr.split(',');
  console.log(`Searching ${playerId} for [${pats.join(' + ')}]…`);
  searchGames(playerId, p => pats.every(k => p[k]));
} else {
  console.log('Usage:');
  console.log('  node scripts/audit-patterns.js audit-all');
  console.log('  node scripts/audit-patterns.js audit <playerId> <idx>');
  console.log('  node scripts/audit-patterns.js search <playerId> <pattern>');
  console.log('  node scripts/audit-patterns.js search-multi <playerId> <pat1,pat2,...>');
}
