export interface OpeningTrainer {
  id: string;
  name: string;
  userSide: 'white' | 'black';
  // Full move sequence (both sides) that defines this opening.
  // User moves and opponent moves alternate; after these seed moves
  // the Lichess Masters database continues the line.
  seedMoves: string[];
}

export const TRAINER_WHITE: OpeningTrainer[] = [
  {
    id: 'ruy-lopez',
    name: 'Ruy Lopez',
    userSide: 'white',
    seedMoves: ['e4', 'e5', 'Nf3', 'Nc6', 'Bb5'],
  },
  {
    id: 'italian',
    name: 'Italian Game',
    userSide: 'white',
    seedMoves: ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4'],
  },
  {
    id: 'london',
    name: 'London System',
    userSide: 'white',
    seedMoves: ['d4', 'd5', 'Nf3', 'Nf6', 'Bf4'],
  },
  {
    id: 'queens-gambit',
    name: "Queen's Gambit",
    userSide: 'white',
    seedMoves: ['d4', 'd5', 'c4'],
  },
  {
    id: 'catalan',
    name: 'Catalan Opening',
    userSide: 'white',
    seedMoves: ['d4', 'Nf6', 'c4', 'e6', 'g3'],
  },
];

export const TRAINER_BLACK: OpeningTrainer[] = [
  {
    id: 'sicilian',
    name: 'Sicilian Defence',
    userSide: 'black',
    seedMoves: ['e4', 'c5'],
  },
  {
    id: 'french',
    name: 'French Defence',
    userSide: 'black',
    seedMoves: ['e4', 'e6'],
  },
  {
    id: 'caro-kann',
    name: 'Caro-Kann',
    userSide: 'black',
    seedMoves: ['e4', 'c6'],
  },
  {
    id: 'kings-indian',
    name: "King's Indian",
    userSide: 'black',
    seedMoves: ['d4', 'Nf6', 'c4', 'g6'],
  },
  {
    id: 'nimzo-indian',
    name: 'Nimzo-Indian',
    userSide: 'black',
    seedMoves: ['d4', 'Nf6', 'c4', 'e6', 'Nc3', 'Bb4'],
  },
];

export const ALL_TRAINERS: OpeningTrainer[] = [...TRAINER_WHITE, ...TRAINER_BLACK];

export function findTrainer(id: string): OpeningTrainer | undefined {
  return ALL_TRAINERS.find(t => t.id === id);
}
