import { useState, useCallback, useRef } from 'react';

// Alternates between two live regions so the same text re-announces reliably.
export function useAnnouncer() {
  const [a, setA] = useState('');
  const [b, setB] = useState('');
  const turn = useRef(false);

  const announce = useCallback((msg: string) => {
    turn.current = !turn.current;
    if (turn.current) { setA(msg); setB(''); }
    else              { setB(msg); setA(''); }
  }, []);

  return { announce, liveA: a, liveB: b };
}
