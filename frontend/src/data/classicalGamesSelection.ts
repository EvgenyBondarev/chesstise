export interface CuratedGame {
  id:    string;
  label: string;
}

// 20 games chosen for maximum diversity: openings (A–E ECO spread), tactical
// motifs (sacrifice, combination, pin), strategic themes (blockade, outpost,
// pawn structure), and endgame types across five historical eras.
export const CURATED_GAMES: CuratedGame[] = [
  // ── Romantic era (1851–1870) ─────────────────────────────────────────────
  { id: 'anderssen-54',   label: 'Immortal Game — Anderssen vs Kieseritzky 1851' },
  { id: 'anderssen-117',  label: 'Evergreen Game — Anderssen vs Dufresne 1852' },
  { id: 'morphy-124',     label: 'Opera Game — Morphy vs Duke of Brunswick 1858' },

  // ── Classical era (1890–1930) ─────────────────────────────────────────────
  { id: 'lasker-174',     label: 'WC 1894 G1 — Lasker vs Steinitz (Ruy Lopez)' },
  { id: 'capablanca-244', label: 'NY 1924 — Capablanca vs Tartakower (Dutch)' },
  { id: 'alekhine-903',   label: 'San Remo 1930 — Alekhine vs Nimzowitsch (French)' },

  // ── Pre-WWII / Early Soviet (1938–1948) ──────────────────────────────────
  { id: 'capablanca-555', label: 'AVRO 1938 — Botvinnik vs Capablanca (Nimzo-Indian)' },
  { id: 'botvinnik-376',  label: 'WC 1948 G2 — Botvinnik vs Euwe (Semi-Slav)' },

  // ── Soviet dominance (1958–1972) ─────────────────────────────────────────
  { id: 'smyslov-688',    label: 'WC 1958 G2 — Botvinnik vs Smyslov (King\'s Indian)' },
  { id: 'tal-358',        label: 'WC 1960 G1 — Tal vs Botvinnik (French Winawer)' },
  { id: 'spassky-285',    label: 'Mar del Plata 1960 — Spassky vs Fischer (King\'s Gambit)' },
  { id: 'petrosian-940',  label: 'WC 1966 G1 — Petrosian vs Spassky (Caro-Kann)' },
  { id: 'fischer-19',     label: 'Game of Century 1956 — Byrne vs Fischer (Grünfeld)' },
  { id: 'fischer-779',    label: 'WC 1972 G6 — Fischer vs Spassky (Queen\'s Gambit)' },

  // ── Karpov–Kasparov era (1978–1999) ──────────────────────────────────────
  { id: 'karpov-498',     label: 'WC 1978 G8 — Karpov vs Korchnoi (Ruy Lopez Open)' },
  { id: 'kasparov-373',   label: 'WC 1985 G16 — Karpov vs Kasparov (Sicilian)' },
  { id: 'kasparov-1511',  label: 'Wijk 1999 — Kasparov vs Topalov (Immortal Game)' },

  // ── Modern era (2004–2013) ────────────────────────────────────────────────
  { id: 'kramnik-1496',   label: 'WCh 2004 G1 — Leko vs Kramnik (Petrov Defense)' },
  { id: 'anand-2671',     label: 'WCh 2012 G8 — Anand vs Gelfand (King\'s Indian)' },
  { id: 'carlsen-1586',   label: 'WCh 2013 G5 — Carlsen vs Anand (Queen\'s Gambit)' },
];
