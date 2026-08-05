export interface CuratedGame {
  id:       string;
  label:    string;
  patterns: string[];  // pattern keys from taxonomy below
}

export const PATTERN_LABELS: Record<string, string> = {
  // A — King safety
  A1: 'W castles K-side',  A2: 'W castles Q-side',  A3: 'W king stays in centre',
  A4: 'B castles K-side',  A5: 'B castles Q-side',  A6: 'B king stays in centre',
  A7: 'Opposite castling',
  // B — Fianchetto
  B1: 'Bg2 fianchetto',  B2: 'Bb2 fianchetto',  B3: 'Bg7 fianchetto',  B4: 'Bb7 fianchetto',
  // C — Knight geometry
  C1: 'Knight on rim',
  // D — Pawn structures
  D1: 'IQP',  D2: 'Hanging pawns',  D3: 'Passed pawn',  D4: 'Pawn chain',  D5: 'Backward pawn',  D6: 'Pawn storm',
  // E — Tactical motifs
  E1: 'Pin',  E2: 'Knight fork',  E3: 'Discovered attack',  E4: 'Double check',
  E5: 'Back-rank',  E6: 'Queen sacrifice',  E7: 'Exchange sacrifice',  E8: 'Clearance sacrifice',
  // F — Strategic themes
  F1: 'Outpost',  F2: '7th-rank rook',  F3: 'Minority attack',  F4: 'Bishop pair',  F5: 'Bad bishop',
  F6: 'Colour complex',  F7: 'Zugzwang',
  // G — Endgame material
  G1: 'Rook ending',  G3: 'Same-colour bishop ending',
  G4: 'Opposite-colour bishops',  G5: 'Knight vs bishop',  G6: 'Pawn ending',
  // H — Castling interaction
  H1: 'Same-side castling',  H2: 'Opposite-wing attack',
};

// 20 games chosen for maximum diversity across openings (A–E ECO), eras, castling patterns,
// fianchetto squares, tactical motifs, strategic themes, and endgame types.
export const CURATED_GAMES: CuratedGame[] = [
  // ── Romantic era (1851–1870) ─────────────────────────────────────────────
  {
    id: 'anderssen-54',
    label: 'Immortal Game — Anderssen vs Kieseritzky 1851',
    patterns: ['A3','A6','C1','E4','E6','E8'],
  },
  {
    id: 'anderssen-117',
    label: 'Evergreen Game — Anderssen vs Dufresne 1852',
    patterns: ['A1','A6','B4','E3','E6','E8'],
  },
  {
    id: 'morphy-124',
    label: 'Opera Game — Morphy vs Duke of Brunswick 1858',
    patterns: ['A2','A6','E1','E2','E5','F2'],
  },

  // ── Classical era (1890–1930) ─────────────────────────────────────────────
  {
    id: 'lasker-174',
    label: 'WC 1894 G1 — Lasker vs Steinitz (Ruy Lopez)',
    patterns: ['A2','A4','A7','H2','F1','F4'],
  },
  {
    id: 'capablanca-243',
    label: 'NY 1924 — Capablanca vs Tartakower (Dutch)',
    patterns: ['A1','A4','B4','C1','H1','G1','D3','F1'],
  },
  {
    id: 'alekhine-903',
    label: 'San Remo 1930 — Alekhine vs Nimzowitsch (French)',
    patterns: ['A1','A4','B4','H1','D4','D5','F5'],
  },

  // ── Pre-WWII / Early Soviet (1938–1948) ──────────────────────────────────
  {
    id: 'capablanca-555',
    label: 'AVRO 1938 — Botvinnik vs Capablanca (Nimzo-Indian)',
    patterns: ['A1','A4','B2','C1','H1'],
  },
  {
    id: 'nimzowitsch-196',
    label: 'Copenhagen 1923 — Nimzowitsch vs Saemisch (Queen\'s Indian)',
    patterns: ['A1','A4','B1','B4','H1','F7','G6'],
  },
  {
    id: 'botvinnik-375',
    label: 'WC 1948 G2 — Botvinnik vs Euwe (Semi-Slav)',
    patterns: ['A1','A4','H1','F3','D5'],
  },

  // ── Soviet dominance (1954–1972) ─────────────────────────────────────────
  {
    id: 'smyslov-533',
    label: 'WC 1954 R11 — Smyslov vs Botvinnik (Ruy Lopez)',
    patterns: ['A1','A4','B4','C1','H1','G4'],
  },
  {
    id: 'tal-357',
    label: 'WC 1960 G1 — Tal vs Botvinnik (French Winawer)',
    patterns: ['A3','A6','D4','D6','E3','E6'],
  },
  {
    id: 'spassky-284',
    label: "Mar del Plata 1960 — Spassky vs Fischer (King's Gambit)",
    patterns: ['A1','A4','B3','H1','D6','E3'],
  },
  {
    id: 'petrosian-958',
    label: "WC 1966 G10 — Petrosian vs Spassky (King's Indian)",
    patterns: ['A1','A4','B1','B2','B3','C1','H1','E7','F6'],
  },
  {
    id: 'fischer-18',
    label: 'Game of Century 1956 — Byrne vs Fischer (Grünfeld)',
    patterns: ['A3','A4','B3','C1','E2','E3'],
  },
  {
    id: 'fischer-778',
    label: "WC 1972 G6 — Fischer vs Spassky (Queen's Gambit)",
    patterns: ['A1','A4','C1','H1','D1','G1','F3'],
  },

  // ── Karpov–Kasparov era (1985–1999) ──────────────────────────────────────
  {
    id: 'kasparov-373',
    label: 'WC 1985 G16 — Karpov vs Kasparov (Sicilian)',
    patterns: ['A1','A4','B1','C1','H1','D6'],
  },
  {
    id: 'kramnik-1598',
    label: 'WCh 2006 G1 — Kramnik vs Topalov (Catalan)',
    patterns: ['A1','A4','B1','C1','H1','G1','D3'],
  },
  {
    id: 'kasparov-1510',
    label: 'Wijk 1999 — Kasparov vs Topalov (Immortal Game)',
    patterns: ['A2','A5','B3','B4','C1','H1','E8','F2'],
  },

  // ── Modern era (2004–2013) ────────────────────────────────────────────────
  {
    id: 'kramnik-1496',
    label: 'WCh 2004 G1 — Leko vs Kramnik (Petrov Defense)',
    patterns: ['A1','A4','C1','H1','G1'],
  },
  {
    id: 'anand-2671',
    label: "WCh 2012 G8 — Anand vs Gelfand (King's Indian)",
    patterns: ['A3','A4','B3','C1','E3','D3'],
  },
  {
    id: 'carlsen-1586',
    label: 'WCh 2013 G6 — Anand vs Carlsen (Berlin Defense)',
    patterns: ['A1','A4','C1','H1','G1','F5'],
  },

  // ── Endgame classics ──────────────────────────────────────────────────────
  {
    id: 'capablanca-355',
    label: 'Berlin 1928 — Tarrasch vs Capablanca (Ruy Lopez)',
    patterns: ['A1','A4','H1','G5'],
  },
  {
    id: 'rubinstein-217',
    label: 'St Petersburg 1909 — Rubinstein vs Lasker (Tarrasch)',
    patterns: ['A1','A5','A7','H2','G1','D1','D2'],
  },
  {
    id: 'karpov-371',
    label: 'USSR Team Ch 1975 — Karpov vs Spassky (Queen\'s Indian)',
    patterns: ['A1','A4','B1','B4','H1','F6'],
  },
  {
    id: 'karpov-757',
    label: 'Tilburg 1982 — Karpov vs Petrosian (Caro-Kann)',
    patterns: ['A1','A4','H1'],
  },
  {
    id: 'capablanca-393',
    label: 'Hastings 1929 — Capablanca vs Thomas (Queen\'s Indian)',
    patterns: ['A2','A5','B4','H1','G3'],
  },
];
