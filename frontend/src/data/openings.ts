export interface OpeningMove {
  san: string;
  from: string;
  to: string;
  rookFrom?: string; // castling secondary piece
  rookTo?: string;
}

export interface Opening {
  id: string;
  name: string;
  side: 'white' | 'black';
  summary: string;
  moves: OpeningMove[];
}

// White piece starting squares
export const WHITE_START: Record<string, string> = {
  a1:'wR', b1:'wN', c1:'wB', d1:'wQ', e1:'wK', f1:'wB', g1:'wN', h1:'wR',
  a2:'wP', b2:'wP', c2:'wP', d2:'wP', e2:'wP', f2:'wP', g2:'wP', h2:'wP',
};

// Black piece starting squares
export const BLACK_START: Record<string, string> = {
  a8:'bR', b8:'bN', c8:'bB', d8:'bQ', e8:'bK', f8:'bB', g8:'bN', h8:'bR',
  a7:'bP', b7:'bP', c7:'bP', d7:'bP', e7:'bP', f7:'bP', g7:'bP', h7:'bP',
};

export const OPENINGS: Opening[] = [
  // ── WHITE ─────────────────────────────────────────────────────────────────
  {
    id: 'london-system',
    name: 'London System',
    side: 'white',
    summary: 'Solid triangle pawn structure with a powerful dark-squared bishop controlling the center.',
    moves: [
      { san:'d4',   from:'d2', to:'d4' },
      { san:'Bf4',  from:'c1', to:'f4' },  // c1 bishop via d2(empty)–e3–f4
      { san:'Nf3',  from:'g1', to:'f3' },
      { san:'e3',   from:'e2', to:'e3' },
      { san:'c3',   from:'c2', to:'c3' },
      { san:'Bd3',  from:'f1', to:'d3' },  // f1 bishop via e2(empty)–d3
      { san:'Nbd2', from:'b1', to:'d2' },
      { san:'O-O',  from:'e1', to:'g1', rookFrom:'h1', rookTo:'f1' },
    ],
  },
  {
    id: 'italian-game',
    name: 'Italian Game',
    side: 'white',
    summary: 'Classical e4/d3 center with the bishop eyeing the weak f7 square.',
    moves: [
      { san:'e4',   from:'e2', to:'e4' },
      { san:'Nf3',  from:'g1', to:'f3' },
      { san:'Bc4',  from:'f1', to:'c4' },  // f1 bishop via e2(empty)–d3–c4
      { san:'d3',   from:'d2', to:'d3' },
      { san:'c3',   from:'c2', to:'c3' },
      { san:'O-O',  from:'e1', to:'g1', rookFrom:'h1', rookTo:'f1' },
      { san:'Nbd2', from:'b1', to:'d2' },
      { san:'Re1',  from:'f1', to:'e1' },  // rook slides from f1 (post-castle) to e1
    ],
  },
  {
    id: 'ruy-lopez',
    name: 'Ruy Lopez',
    side: 'white',
    summary: 'Pressure on c6 to control e5, preparing for a c3-d4 central break.',
    moves: [
      { san:'e4',   from:'e2', to:'e4' },
      { san:'Nf3',  from:'g1', to:'f3' },
      { san:'Bb5',  from:'f1', to:'b5' },  // f1 bishop via e2(empty)–d3–c4–b5
      { san:'O-O',  from:'e1', to:'g1', rookFrom:'h1', rookTo:'f1' },
      { san:'Re1',  from:'f1', to:'e1' },
      { san:'c3',   from:'c2', to:'c3' },
      { san:'d3',   from:'d2', to:'d3' },
      { san:'Nbd2', from:'b1', to:'d2' },
    ],
  },
  {
    id: 'kings-indian-attack',
    name: "King's Indian Attack",
    side: 'white',
    summary: 'Fianchettoed g2 bishop and a closed center, preparing for a kingside pawn storm.',
    moves: [
      { san:'Nf3',  from:'g1', to:'f3' },
      { san:'g3',   from:'g2', to:'g3' },
      { san:'Bg2',  from:'f1', to:'g2' },  // fianchetto
      { san:'d3',   from:'d2', to:'d3' },
      { san:'O-O',  from:'e1', to:'g1', rookFrom:'h1', rookTo:'f1' },
      { san:'Nbd2', from:'b1', to:'d2' },
      { san:'e4',   from:'e2', to:'e4' },
      { san:'Re1',  from:'f1', to:'e1' },
    ],
  },
  {
    id: 'queens-gambit',
    name: "Queen's Gambit",
    side: 'white',
    summary: 'Challenging the d5 square immediately to gain total central dominance.',
    moves: [
      { san:'d4',   from:'d2', to:'d4' },
      { san:'c4',   from:'c2', to:'c4' },
      { san:'Nc3',  from:'b1', to:'c3' },
      { san:'Nf3',  from:'g1', to:'f3' },
      { san:'Bg5',  from:'c1', to:'g5' },  // c1 bishop via d2(empty)–e3–f4–g5
      { san:'e3',   from:'e2', to:'e3' },
      { san:'Bd3',  from:'f1', to:'d3' },
      { san:'O-O',  from:'e1', to:'g1', rookFrom:'h1', rookTo:'f1' },
    ],
  },

  // ── BLACK ─────────────────────────────────────────────────────────────────
  {
    id: 'sicilian-dragon',
    name: 'Sicilian Dragon',
    side: 'black',
    summary: 'Hyper-aggressive kingside fianchetto fighting for the d4 square.',
    moves: [
      { san:'c5',   from:'c7', to:'c5' },
      { san:'d6',   from:'d7', to:'d6' },
      { san:'cxd4', from:'c5', to:'d4' },  // pawn captures/moves to d4 in isolation
      { san:'Nf6',  from:'g8', to:'f6' },
      { san:'g6',   from:'g7', to:'g6' },
      { san:'Bg7',  from:'f8', to:'g7' },
      { san:'Nc6',  from:'b8', to:'c6' },
      { san:'O-O',  from:'e8', to:'g8', rookFrom:'h8', rookTo:'f8' },
    ],
  },
  {
    id: 'french-defense',
    name: 'French Defense',
    side: 'black',
    summary: 'Solid e6/d5 chain, challenging White\'s center from the wing with c5.',
    moves: [
      { san:'e6',   from:'e7', to:'e6' },
      { san:'d5',   from:'d7', to:'d5' },
      { san:'c5',   from:'c7', to:'c5' },
      { san:'Nf6',  from:'g8', to:'f6' },
      { san:'Be7',  from:'f8', to:'e7' },
      { san:'O-O',  from:'e8', to:'g8', rookFrom:'h8', rookTo:'f8' },
      { san:'Nc6',  from:'b8', to:'c6' },
      { san:'Bd7',  from:'c8', to:'d7' },
    ],
  },
  {
    id: 'caro-kann',
    name: 'Caro-Kann',
    side: 'black',
    summary: "The 'Solid Wall'—developing the Bishop before locking the pawn chain with e6.",
    moves: [
      { san:'c6',   from:'c7', to:'c6' },
      { san:'d5',   from:'d7', to:'d5' },
      { san:'Bf5',  from:'c8', to:'f5' },  // c8 bishop via d7(empty)–e6–f5
      { san:'e6',   from:'e7', to:'e6' },
      { san:'Nf6',  from:'g8', to:'f6' },
      { san:'Be7',  from:'f8', to:'e7' },
      { san:'Nbd7', from:'b8', to:'d7' },
      { san:'O-O',  from:'e8', to:'g8', rookFrom:'h8', rookTo:'f8' },
    ],
  },
  {
    id: 'kings-indian-defense',
    name: "King's Indian Defense",
    side: 'black',
    summary: 'Giving up the center early to launch a devastating kingside attack after f5.',
    moves: [
      { san:'Nf6',  from:'g8', to:'f6' },
      { san:'g6',   from:'g7', to:'g6' },
      { san:'Bg7',  from:'f8', to:'g7' },
      { san:'d6',   from:'d7', to:'d6' },
      { san:'O-O',  from:'e8', to:'g8', rookFrom:'h8', rookTo:'f8' },
      { san:'e5',   from:'e7', to:'e5' },
      { san:'Nbd7', from:'b8', to:'d7' },
      { san:'f5',   from:'f7', to:'f5' },
    ],
  },
  {
    id: 'slav-defense',
    name: 'Slav Defense',
    side: 'black',
    summary: 'Rock-solid d5 support without blocking the light-squared bishop.',
    moves: [
      { san:'d5',   from:'d7', to:'d5' },
      { san:'c6',   from:'c7', to:'c6' },
      { san:'Nf6',  from:'g8', to:'f6' },
      { san:'dxc4', from:'d5', to:'c4' },  // pawn moves to c4 in isolation
      { san:'Bf5',  from:'c8', to:'f5' },
      { san:'e6',   from:'e7', to:'e6' },
      { san:'Nbd7', from:'b8', to:'d7' },
      { san:'Be7',  from:'f8', to:'e7' },
      { san:'O-O',  from:'e8', to:'g8', rookFrom:'h8', rookTo:'f8' },
    ],
  },
];

export function getOpening(id: string): Opening | undefined {
  return OPENINGS.find(o => o.id === id);
}

export const WHITE_OPENINGS = OPENINGS.filter(o => o.side === 'white');
export const BLACK_OPENINGS = OPENINGS.filter(o => o.side === 'black');
