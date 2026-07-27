import { useState, useCallback, useEffect, useRef } from 'react';

export function formatTime(ms: number): string {
  const tenths = Math.floor(ms / 100);
  const s = Math.floor(tenths / 10);
  const t = tenths % 10;
  const m = Math.floor(s / 60);
  const ss = s % 60;
  return `${m}:${String(ss).padStart(2, '0')}.${t}`;
}

export function useStopwatch() {
  const [elapsed, setElapsed] = useState(0);
  const startedAtRef = useRef<number>(0);
  const intervalRef  = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => () => { if (intervalRef.current) clearInterval(intervalRef.current); }, []);

  // Start or restart the timer from zero
  const start = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    startedAtRef.current = Date.now();
    setElapsed(0);
    intervalRef.current = setInterval(
      () => setElapsed(Date.now() - startedAtRef.current),
      100,
    );
  }, []);

  // Stop the timer, freeze elapsed, return the final ms value
  const stop = useCallback((): number => {
    if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
    const finalTime = Date.now() - startedAtRef.current;
    setElapsed(finalTime);
    return finalTime;
  }, []);

  // Stop and reset to zero (for going back to pre-game)
  const clear = useCallback(() => {
    if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
    setElapsed(0);
  }, []);

  return { elapsed, start, stop, clear };
}
