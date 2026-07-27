export interface ClassicalGame {
  id:     string;
  white:  string;
  black:  string;
  year:   number | null;
  event:  string | null;
  result: '1-0' | '0-1' | '1/2-1/2';
  moves:  string[];  // SAN, alternating white/black
  eco:    string | null;
}

export interface GmGroup {
  id:    string;
  name:  string;
  games: ClassicalGame[];
}

// ── Magnus Carlsen ─────────────────────────────────────────────────────────

const CARLSEN_GAMES: ClassicalGame[] = [
  {
    id:     'carlsen-1',
    white:  'Unknown',
    black:  'Magnus Carlsen',
    year:   null,
    event:  null,
    result: '0-1',
    eco:    null,
    moves: [
      'e4',    'Nf6',   'e5',    'Nd5',   'd4',    'd6',
      'Nf3',   'Bg4',   'Bc4',   'e6',    'O-O',   'Nb6',
      'Be2',   'Be7',   'h3',    'Bh5',   'Bf4',   'Nc6',
      'c3',    'O-O',   'Nbd2',  'd5',    'b4',    'a5',
      'a3',    'Qd7',   'Qc2',   'Bg6',   'Bd3',   'Rfc8',
      'Rfb1',  'Bf8',   'h4',    'Ne7',   'g3',    'Qa4',
      'Ne1',   'Qxc2',  'Bxc2',  'Bxc2',  'Nxc2',  'Na4',
      'Rb3',   'b6',    'Kf1',   'c5',    'bxc5',  'bxc5',
      'dxc5',  'Rxc5',  'Nb1',   'Rac8',  'Be3',   'Rc4',
      'Bd4',   'Nc6',   'Rb5',   'Nxd4',  'Nxd4',  'Nxc3',
      'Nxc3',  'Rxd4',  'Ne2',   'Ra4',   'Ke1',   'Rxa3',
      'Rab1',  'Bb4+',  'Kf1',   'Rd3',
    ],
  },
  {
    id:     'carlsen-2',
    white:  'Magnus Carlsen',
    black:  'Unknown',
    year:   null,
    event:  null,
    result: '1-0',
    eco:    null,
    moves: [
      'e4',    'e6',    'd4',    'd5',    'Nc3',   'Bb4',
      'e5',    'Ne7',   'a3',    'Bxc3+', 'bxc3',  'b6',
      'Qg4',   'Nf5',   'Bd3',   'h5',    'Qh3',   'c5',
      'Bxf5',  'exf5',  'Qg3',   'Kf8',   'h4',    'Nc6',
      'Bg5',   'f6',    'exf6',  'gxf6',  'Be3',   'Qe7',
      'Ne2',   'Be6',   'O-O',   'Kf7',   'Nf4',   'Rag8',
      'Qf3',   'Qd7',   'Rad1',  'c4',    'Rfe1',  'Rg4',
      'g3',    'Kf8',   'Nxe6+', 'Qxe6',  'Bh6+',  'Kf7',
      'Rxe6',  'Kxe6',  'Bf4',   'Ne7',   'Re1+',  'Kd7',
      'Qe3',
    ],
  },
];

// ── Registry ───────────────────────────────────────────────────────────────

export const GM_GROUPS: GmGroup[] = [
  { id: 'carlsen', name: 'Magnus Carlsen', games: CARLSEN_GAMES },
];

export const ALL_GAMES: ClassicalGame[] = GM_GROUPS.flatMap(g => g.games);

export function findGame(id: string): ClassicalGame | undefined {
  return ALL_GAMES.find(g => g.id === id);
}
