export interface EndgamePosition {
  id: string;
  name: string;
  category: string;
  fen: string;
  description: string;
  whiteToMove: boolean;
  keyPieceKey: string;
  keyFileKey: string;
  keyRankKey: string;
  keyMove: string;
  explanation: string;
  wrongMove?: string;
  wrongExplanation?: string;
}

export const ENDGAME_POSITIONS: EndgamePosition[] = [

  // ── Rook Endings ────────────────────────────────────────────────────────

  {
    id: 'rook-box-1',
    name: 'Box the King',
    category: 'Rook Endings',
    fen: '7k/5K2/8/8/8/8/8/R7 w - - 0 1',
    description: 'White King on f7, White Rook on a1, Black King on h8. White to move. The Black king is trapped in the corner. One rook move delivers checkmate.',
    whiteToMove: true,
    keyPieceKey: 'd', keyFileKey: ';', keyRankKey: 'a',
    keyMove: 'Rh1#',
    explanation: 'Rh1# — the rook swings to the h-file. White king on f7 controls g7 and g8, sealing every escape. This is the essential "king-covers-two-squares, rook-delivers-check" pattern.',
    wrongMove: 'Ke6?',
    wrongExplanation: 'Moving the king away lets Black escape to g7.',
  },
  {
    id: 'rook-sweeps-8th',
    name: 'Rook Sweeps to the 8th',
    category: 'Rook Endings',
    fen: 'k7/8/K7/8/8/8/8/6R1 w - - 0 1',
    description: 'White King on a6, White Rook on g1, Black King on a8. White to move. One move checkmates.',
    whiteToMove: true,
    keyPieceKey: 'd', keyFileKey: 'l', keyRankKey: ';',
    keyMove: 'Rg8#',
    explanation: 'Rg8# — the rook covers the entire 8th rank. White king on a6 controls a7 and b7; the rook on g8 controls b8. Black king on a8 has no escape.',
    wrongMove: 'Ra1+?',
    wrongExplanation: 'Ra1+ gives check on the a-file but Black king steps to b7 and escapes.',
  },
  {
    id: 'stop-pawn',
    name: 'Rook Stops the Runaway Pawn',
    category: 'Rook Endings',
    fen: 'k7/8/8/4K3/8/8/p7/7R w - - 0 1',
    description: 'White King on e5, White Rook on h1, Black King on a7, Black Pawn on a2. White to move. The pawn is one step from queening. Find the only saving move.',
    whiteToMove: true,
    keyPieceKey: 'd', keyFileKey: 'a', keyRankKey: 'a',
    keyMove: 'Ra1',
    explanation: 'Ra1! — the rook dashes to a1, cutting off the pawn from promoting. White then marches the king over while the rook guards the promotion square.',
    wrongMove: 'Kd5?',
    wrongExplanation: 'Kd5? a1=Q and Black wins with a queen.',
  },
  {
    id: 'lucena-bridge',
    name: 'Build the Bridge (Lucena)',
    category: 'Rook Endings',
    fen: '3k4/3K4/3P4/7R/8/8/8/r7 w - - 0 1',
    description: 'White King on d7, White Rook on h5, White Pawn on d6, Black King on d8, Black Rook on a1. White to move. The Lucena position — the most important rook ending to know. Shelter the king from checks with the first move of the bridge.',
    whiteToMove: true,
    keyPieceKey: 'd', keyFileKey: 'k', keyRankKey: 'j',
    keyMove: 'Rf5',
    explanation: 'Rf5! — the bridge begins. White plays Ke7, then interposes checks on the e-file with Rf1, driving the Black king away and queening the pawn.',
    wrongMove: 'Ke7?',
    wrongExplanation: 'Ke7? Ra7+! and Black gives endless checks along the 7th rank. The rook must come first.',
  },
  {
    id: 'philidor-defense',
    name: 'Philidor Defence (Hold the Draw)',
    category: 'Rook Endings',
    fen: '4k3/8/r3P3/4K3/8/8/8/4R3 b - - 0 1',
    description: 'White King on e5, White Pawn on e6, White Rook on e1, Black King on e8, Black Rook on a6. Black to move. Hold the draw using the Philidor method: the pawn has just advanced to e6, so switch the rook behind the pawn immediately.',
    whiteToMove: false,
    keyPieceKey: 'd', keyFileKey: 'a', keyRankKey: 'a',
    keyMove: 'Ra1',
    explanation: 'Ra1! — Black switches to checking from behind. After Ra1 the rook can give perpetual check on the e-file once the king moves. The key Philidor rule: rook on 6th rank UNTIL the pawn advances, then immediately go behind.',
    wrongMove: 'Rd6+?',
    wrongExplanation: 'Rd6+? Ke4! — the king steps forward, sheltered by the pawn. Now Black cannot reach the back rank to give perpetual checks.',
  },
  {
    id: 'rook-cut-off',
    name: 'Cut Off the King',
    category: 'Rook Endings',
    fen: '8/8/8/3k4/8/3K4/8/R7 w - - 0 1',
    description: 'White King on d3, White Rook on a1, Black King on d5. White to move. The kings are a file apart. Cut off the Black king along the e-file to support your king advancing.',
    whiteToMove: true,
    keyPieceKey: 'd', keyFileKey: 'j', keyRankKey: 'a',
    keyMove: 'Re1',
    explanation: 'Re1! — the rook cuts off the Black king on the e-file. White\'s king can now march to e4 safely and push the Black king back. This cut-off technique is the foundation of all K+R vs K wins.',
    wrongMove: 'Ra5+?',
    wrongExplanation: 'Ra5+? Kc4 — Black king marches toward White and the position is harder to convert.',
  },

  // ── Pawn Endings ────────────────────────────────────────────────────────

  {
    id: 'pawn-promote-mate',
    name: 'Promote and Checkmate',
    category: 'Pawn Endings',
    fen: 'k7/1P6/2K5/8/8/8/8/8 w - - 0 1',
    description: 'White King on c6, White Pawn on b7, Black King on a8. White to move. The pawn is one step from queening. Find the move that wins immediately.',
    whiteToMove: true,
    keyPieceKey: 'f', keyFileKey: 's', keyRankKey: ';',
    keyMove: 'b8=Q#',
    explanation: 'b8=Q# — promotion gives instant checkmate. The new queen attacks a8 along the rank and a7 diagonally. White king covers b7. The Black king has nowhere to go.',
    wrongMove: 'Ka7??',
    wrongExplanation: 'Ka7 stalemates Black — the Black king has no legal moves and is not in check. Draw!',
  },
  {
    id: 'anti-stalemate',
    name: 'Avoid the Stalemate Trap',
    category: 'Pawn Endings',
    fen: '6k1/8/5KP1/8/8/8/8/8 w - - 0 1',
    description: 'White King on f6, White Pawn on g6, Black King on g8. White to move. The pawn can queen — but the wrong move draws immediately. Find the winning king move.',
    whiteToMove: true,
    keyPieceKey: 's', keyFileKey: 'k', keyRankKey: 'l',
    keyMove: 'Kf7',
    explanation: 'Kf7! — king steps aside, giving Black a square (h8) while keeping control. After 1…Kh7 2.g7 Kh6 3.g8=Q+ and White wins.',
    wrongMove: 'g7??',
    wrongExplanation: 'g7 is immediate stalemate — Black king on g8 has no moves and is not in check.',
  },
  {
    id: 'opposition-key',
    name: 'Take the Opposition',
    category: 'Pawn Endings',
    fen: '8/8/8/4k3/8/4K3/8/8 w - - 0 1',
    description: 'White King on e3, Black King on e5. White to move. To make progress in king-and-pawn endings, you must take the opposition — place your king directly opposite the enemy king with one square between them when it is their turn to move.',
    whiteToMove: true,
    keyPieceKey: 's', keyFileKey: 'j', keyRankKey: 'f',
    keyMove: 'Ke4',
    explanation: 'Ke4! — White takes the direct opposition. Black king must step aside, allowing White\'s king to advance and escort a pawn to promotion.',
    wrongMove: 'Kd3?',
    wrongExplanation: 'Kd3? lets Black take the opposition with Kd5 and White cannot make progress.',
  },
  {
    id: 'king-pawn-win',
    name: 'King in Front of the Pawn',
    category: 'Pawn Endings',
    fen: '8/8/4k3/8/4P3/8/8/4K3 w - - 0 1',
    description: 'White King on e1, White Pawn on e4, Black King on e6. White to move. The key rule: advance the king in front of the pawn. Find the winning plan.',
    whiteToMove: true,
    keyPieceKey: 's', keyFileKey: 'j', keyRankKey: 'd',
    keyMove: 'Ke3',
    explanation: 'Ke3! — king marches forward to escort the pawn. The king must lead, not follow. White aims for e5 to push the Black king back, then advance the pawn to promotion.',
    wrongMove: 'e5?',
    wrongExplanation: 'e5? Ke5! — Black king centralises and holds the draw by keeping opposition in front of the pawn.',
  },

  // ── Queen Endings ────────────────────────────────────────────────────────

  {
    id: 'queen-corner',
    name: 'Queen to the Corner',
    category: 'Queen Endings',
    fen: 'k7/8/1K6/8/4Q3/8/8/8 w - - 0 1',
    description: 'White King on b6, White Queen on e4, Black King on a8. White to move. The Black king is near the corner. Find the mating move.',
    whiteToMove: true,
    keyPieceKey: 'l', keyFileKey: 's', keyRankKey: 'l',
    keyMove: 'Qb7#',
    explanation: 'Qb7# — queen moves to b7, attacking a8 diagonally. a7 is controlled by both the queen and White king. Black king has no escape.',
    wrongMove: 'Qa4+?',
    wrongExplanation: 'Qa4+ gives check on the a-file but Black escapes with Kb8.',
  },
  {
    id: 'queen-vs-pawn-a',
    name: 'Queen vs Pawn on 7th',
    category: 'Queen Endings',
    fen: '8/p7/8/8/8/8/8/1Q2K1k1 w - - 0 1',
    description: 'White King on e1, White Queen on b1, Black King on g1, Black Pawn on a7. White to move. The pawn is about to queen. Find the move that stops it without allowing stalemate.',
    whiteToMove: true,
    keyPieceKey: 'l', keyFileKey: 's', keyRankKey: 'k',
    keyMove: 'Qb6',
    explanation: 'Qb6! — queen steps to b6, attacking a7 and preventing queening. White then brings the king to b7 area. The key is avoiding giving Black stalemate while cutting off the pawn.',
    wrongMove: 'Qa2?',
    wrongExplanation: 'Qa2? a8=Q and now it\'s a queen vs queen ending which may be drawn.',
  },
  {
    id: 'queen-smothered',
    name: 'Queen Mate in the Corner',
    category: 'Queen Endings',
    fen: '6k1/6P1/6K1/8/8/8/8/7Q w - - 0 1',
    description: 'White King on g6, White Queen on h1, White Pawn on g7, Black King on g8. White to move. Find the move that forces checkmate next.',
    whiteToMove: true,
    keyPieceKey: 'l', keyFileKey: ';', keyRankKey: 'l',
    keyMove: 'Qh7',
    explanation: 'Qh7! — threatens Qh8# and g8=Q#. Black is in zugzwang: Kf8 allows g8=Q#; there is no defense. The queen dominates from h7 covering both mating squares.',
    wrongMove: 'g8=Q+?',
    wrongExplanation: 'g8=Q+? Kxg8 — Black captures the queen and escapes.',
  },

  // ── Bishop Endings ───────────────────────────────────────────────────────

  {
    id: 'bishop-wrong-color',
    name: 'Bishop on the Wrong Color',
    category: 'Bishop Endings',
    fen: '8/8/8/8/6B1/8/6P1/6k1 w - - 0 1',
    description: 'White King off-board, White Bishop on g4, White Pawn on g2, Black King on g1. White to move. The pawn wants to queen on h8 or f8, but the bishop travels on light squares. Find the drawing move for White — or if you are Black, recognize this is a draw.',
    whiteToMove: true,
    keyPieceKey: 's', keyFileKey: ';', keyRankKey: 'd',
    keyMove: 'Kh3',
    explanation: 'Kh3 — White must bring the king to control the promotion square h1 and prevent Black winning. But if the promotion square (h8) is the opposite color of the bishop, Black can draw even if White queens by giving perpetual check threats on that corner.',
    wrongMove: 'g4?',
    wrongExplanation: 'Advancing the pawn first lets the Black king step to h1 and stalemate threats arise.',
  },
  {
    id: 'bishop-vs-pawn',
    name: 'Bishop Holds Against Two Pawns',
    category: 'Bishop Endings',
    fen: '8/8/8/1pp5/8/8/2B5/2K5 w - - 0 1',
    description: 'White King on c1, White Bishop on c2, Black Pawns on b5 and c5. White to move. The bishop must blockade both connected passed pawns. Find the key defensive square.',
    whiteToMove: true,
    keyPieceKey: 'k', keyFileKey: 'd', keyRankKey: 'f',
    keyMove: 'Bd3',
    explanation: 'Bd3! — the bishop plants itself on d3, blocking b5-b4 (diagonal control) and monitoring c4. White\'s king heads to d2. From d3 the bishop controls the entire b5-f1 diagonal and prevents the pawns from advancing.',
    wrongMove: 'Kd2?',
    wrongExplanation: 'Kd2? b4 and the pawns roll forward before the king can set up.',
  },

  // ── Knight Endings ───────────────────────────────────────────────────────

  {
    id: 'knight-outpost',
    name: 'Knight vs Rook Pawn',
    category: 'Knight Endings',
    fen: '8/8/8/8/8/p7/8/N1K5 w - - 0 1',
    description: 'White King on c1, White Knight on a1, Black Pawn on a3. White to move. A knight on a1 is famously trapped — it cannot stop an a-pawn alone. Find the only move that gives White any chance.',
    whiteToMove: true,
    keyPieceKey: 'j', keyFileKey: 's', keyRankKey: 'd',
    keyMove: 'Nb3',
    explanation: 'Nb3! — the knight escapes from the corner to b3, now able to reach a1 and c1 to block the pawn. White\'s king rushes to b2. This is the only route: Na1 is a death trap for knights against rook pawns.',
    wrongMove: 'Nc2?',
    wrongExplanation: 'Nc2? a2 and the pawn queens — the knight on c2 cannot stop it.',
  },
  {
    id: 'knight-fork-trick',
    name: 'Knight Fork Saves the Draw',
    category: 'Knight Endings',
    fen: '8/8/8/3k4/8/3K2N1/8/8 w - - 0 1',
    description: 'White King on d3, White Knight on g3, Black King on d5. White to move. The knight is far from the action but can create a fork threat. Find the move that keeps White active.',
    whiteToMove: true,
    keyPieceKey: 'j', keyFileKey: 'k', keyRankKey: 'j',
    keyMove: 'Nf5',
    explanation: 'Nf5! — the knight leaps toward the center, threatening Ne7+ or Nd4+. This is the key technique: use knight forks to create counterplay and keep the opponent\'s king tied down.',
    wrongMove: 'Ne4+?',
    wrongExplanation: 'Ne4+? Kc4 and the Black king chases the knight away from the center.',
  },
];

export const ENDGAME_CATEGORIES = [...new Set(ENDGAME_POSITIONS.map(p => p.category))];
