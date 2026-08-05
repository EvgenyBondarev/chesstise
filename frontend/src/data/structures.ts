export interface StructureTransition {
  trigger: string;
  toName: string;
  toId: string;
}

export interface PawnStructure {
  id: string;
  name: string;
  fen: string;
  summary: string;
  transitions: StructureTransition[];
}

export const STRUCTURES: PawnStructure[] = [
  {
    id: 'caro-formation',
    name: 'The Caro Formation',
    fen: '4k3/pp3ppp/2p5/3p4/4P3/2P5/PP3PPP/4K3 w - - 0 1',
    summary: 'White has a central space advantage; Black seeks to challenge with c5 or e5.',
    transitions: [
      { trigger: 'exd5', toName: 'Slav Formation', toId: 'slav-formation' },
    ],
  },
  {
    id: 'slav-formation',
    name: 'The Slav Formation',
    fen: '4k3/pp2pp1p/2p3p1/3p4/2P1P3/8/PP3PPP/4K3 w - - 0 1',
    summary: 'A rock-solid central wedge where Black has traded a wing pawn for a center pawn.',
    transitions: [
      { trigger: 'dxc4', toName: 'Hanging Pawns', toId: 'hanging-pawns' },
    ],
  },
  {
    id: 'sicilian-scheveningen',
    name: 'The Sicilian-Scheveningen',
    fen: '4k3/pp2bppp/3p1n2/4p3/4P3/2N5/PPP2PPP/4K3 w - - 0 1',
    summary: 'Small center (d6/e6) providing Black with flexibility and counterplay on the c-file.',
    transitions: [],
  },
  {
    id: 'sicilian-dragon',
    name: 'The Sicilian-Dragon',
    fen: '4k3/pp2pp1p/3p2p1/8/4P3/8/PPP2PPP/4K3 w - - 0 1',
    summary: 'A hyper-aggressive kingside fianchetto with deep pressure on the long diagonal.',
    transitions: [],
  },
  {
    id: 'hedgehog',
    name: 'The Hedgehog',
    fen: '4k3/1p2pp1p/p2p1np1/8/2P1P3/1P6/P4PPP/4K3 w - - 0 1',
    summary: "Black stays behind the 3rd rank 'spines,' waiting to explode with b5 or d5 breaks.",
    transitions: [
      { trigger: 'd5', toName: 'Isolani (IQP)', toId: 'isolani' },
    ],
  },
  {
    id: 'french-d5-chain',
    name: 'The d5-Chain (French)',
    fen: '4k3/pp1p1ppp/2p1p3/3P4/4P3/8/PP3PPP/4K3 w - - 0 1',
    summary: 'A locked center where White attacks the kingside and Black undermines the base at d4.',
    transitions: [
      { trigger: 'c5', toName: 'e5-Chain (KID)', toId: 'e5-chain-kid' },
    ],
  },
  {
    id: 'e5-chain-kid',
    name: 'The e5-Chain (KID)',
    fen: '4k3/pp1p1p1p/4p1p1/4P3/3P4/8/PP3PPP/4K3 w - - 0 1',
    summary: 'A locked center where Black launches a kingside pawn storm starting with f5.',
    transitions: [
      { trigger: 'f5', toName: 'Isolani (IQP)', toId: 'isolani' },
    ],
  },
  {
    id: 'isolani',
    name: 'The Isolani (IQP)',
    fen: '4k3/pp3ppp/8/3p4/3P4/8/PP3PPP/4K3 w - - 0 1',
    summary: 'White has great piece activity and attacking chances but a weak d5 square in the endgame.',
    transitions: [
      { trigger: 'd5',       toName: 'Carlsbad',       toId: 'carlsbad'       },
      { trigger: 'c6+dxc3', toName: 'Hanging Pawns',  toId: 'hanging-pawns'  },
    ],
  },
  {
    id: 'hanging-pawns',
    name: 'The Hanging Pawns',
    fen: '4k3/pp3ppp/8/2pp4/8/2PP4/PP3PPP/4K3 w - - 0 1',
    summary: 'A dynamic pair of pawns on c5/d5 that provide space but can become targets if blockaded.',
    transitions: [],
  },
  {
    id: 'carlsbad',
    name: 'The Carlsbad',
    fen: '4k3/pp3ppp/2p5/3p4/3P4/8/PP3PPP/4K3 w - - 0 1',
    summary: "Symmetrical center leading to White's 'Minority Attack' (pushing a-b pawns against b-c pawns).",
    transitions: [
      { trigger: 'e4', toName: 'Caro Formation', toId: 'caro-formation' },
    ],
  },
  {
    id: 'stonewall',
    name: 'The Stonewall',
    fen: '4k3/pp1pp1pp/8/2p1P3/2PP1P2/8/PP4PP/4K3 w - - 0 1',
    summary: "A rigid, 'bone-crushing' center that clamps down on the e5 square for an attack.",
    transitions: [
      { trigger: 'e6', toName: 'd5-Chain (French)', toId: 'french-d5-chain' },
    ],
  },
];

export function getStructure(id: string): PawnStructure | undefined {
  return STRUCTURES.find(s => s.id === id);
}
