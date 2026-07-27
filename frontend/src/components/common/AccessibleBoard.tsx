import { useState, useCallback, useEffect, useRef, type CSSProperties } from 'react';
import { Chessboard } from 'react-chessboard';
import type { Square } from 'chess.js';
import type { BoardOrientation } from '../../types';
import { getSquareColor, getFileIndex, getRankIndex } from '../../utils/chessUtils';
import { useAnnouncer } from '../../hooks/useAnnouncer';

interface Props {
  position: Record<string, string>;
  boardWidth: number;
  boardOrientation?: BoardOrientation;
  customSquareStyles?: Record<string, CSSProperties>;
  onSquareSelect: (sq: Square) => void;
  getSquareLabel?: (sq: Square) => string;
  ariaLabel: string;
  initialCursor?: Square;
  disabled?: boolean;
}

function moveSquare(sq: Square, key: string, o: BoardOrientation): Square | null {
  const f = getFileIndex(sq);
  const r = getRankIndex(sq);
  const files = 'abcdefgh';
  let nf = f, nr = r;
  if (o === 'white') {
    if (key === 'ArrowRight') nf++; if (key === 'ArrowLeft') nf--;
    if (key === 'ArrowUp')    nr++; if (key === 'ArrowDown') nr--;
  } else {
    if (key === 'ArrowRight') nf--; if (key === 'ArrowLeft') nf++;
    if (key === 'ArrowUp')    nr--; if (key === 'ArrowDown') nr++;
  }
  if (nf < 1 || nf > 8 || nr < 1 || nr > 8) return null;
  return `${files[nf - 1]}${nr}` as Square;
}

const CURSOR_STYLE: CSSProperties = { outline: '3px solid #58a6ff', outlineOffset: '-3px' };

export default function AccessibleBoard({
  position, boardWidth, boardOrientation = 'white',
  customSquareStyles, onSquareSelect, getSquareLabel,
  ariaLabel, initialCursor = 'a1' as Square, disabled = false,
}: Props) {
  const [cursor, setCursor]   = useState<Square>(initialCursor);
  const [focused, setFocused] = useState(false);  // only show outline when keyboard-focused
  const { announce, liveA, liveB } = useAnnouncer();
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => { setCursor(initialCursor); setFocused(false); }, [boardOrientation, initialCursor]);

  const announceSq = useCallback((sq: Square) => {
    const color = getSquareColor(sq);
    const extra = getSquareLabel?.(sq);
    announce([sq, `${color} square`, extra].filter(Boolean).join(', '));
  }, [getSquareLabel, announce]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    const arrows = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'];
    if (arrows.includes(e.key)) {
      e.preventDefault();
      setFocused(true);
      const next = moveSquare(cursor, e.key, boardOrientation);
      if (next) { setCursor(next); announceSq(next); }
      return;
    }
    if ((e.key === 'Enter' || e.key === ' ') && !disabled) {
      e.preventDefault();
      onSquareSelect(cursor);
    }
  }, [cursor, boardOrientation, disabled, onSquareSelect, announceSq]);

  // Cursor outline only when the board wrapper has keyboard focus
  const mergedStyles: Record<string, CSSProperties> = {
    ...customSquareStyles,
    ...(focused ? {
      [cursor]: { ...(customSquareStyles?.[cursor] ?? {}), ...CURSOR_STYLE },
    } : {}),
  };

  return (
    <div
      role="application"
      aria-label={ariaLabel}
      ref={wrapRef}
      tabIndex={0}
      style={{ outline: 'none', display: 'inline-block' }}
      onBlur={() => setFocused(false)}
      onKeyDown={handleKeyDown}
    >
      <div role="status" aria-live="assertive" aria-atomic="true" className="sr-only">{liveA}</div>
      <div role="status" aria-live="assertive" aria-atomic="true" className="sr-only">{liveB}</div>
      <Chessboard
        position={position}
        boardWidth={boardWidth}
        boardOrientation={boardOrientation}
        showBoardNotation={false}
        arePiecesDraggable={false}
        onSquareClick={disabled ? undefined : onSquareSelect}
        customSquareStyles={mergedStyles}
        animationDuration={0}
      />
    </div>
  );
}
