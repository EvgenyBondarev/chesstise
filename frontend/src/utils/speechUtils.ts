// Space out letter-digit boundaries in chess notation (a2 → a 2) and capitalize
// standalone 'a' so TTS reads file 'a' as "ay" not "ah".
export function processText(text: string): string {
  return text
    .replace(/([a-zA-Z])(\d)/g, '$1 $2')
    .replace(/(\d)([a-zA-Z])/g, '$1 $2')
    .replace(/\ba\b/g, 'A');
}

let globalSpeechRate = 10;
export function setGlobalSpeechRate(rate: number): void { globalSpeechRate = rate; }

export function stopSpeaking(): void {
  if (typeof window !== 'undefined' && window.speechSynthesis) window.speechSynthesis.cancel();
}

export function speak(text: string): void {
  if (typeof window === 'undefined' || !window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  const utt = new SpeechSynthesisUtterance(processText(text));
  utt.rate = globalSpeechRate;
  window.speechSynthesis.speak(utt);
}

export function playCongratsSound(): void {
  try {
    const ctx = new AudioContext();
    const t   = ctx.currentTime;

    const hit = (
      freq: number, start: number, dur: number, vol: number,
      type: OscillatorType = 'square'
    ) => {
      const osc = ctx.createOscillator();
      const g   = ctx.createGain();
      osc.type = type;
      osc.frequency.value = freq;
      osc.connect(g);
      g.connect(ctx.destination);
      g.gain.setValueAtTime(0, start);
      g.gain.linearRampToValueAtTime(vol, start + 0.015);
      g.gain.setValueAtTime(vol * 0.65, start + dur * 0.55);
      g.gain.exponentialRampToValueAtTime(0.001, start + dur);
      osc.start(start);
      osc.stop(start + dur + 0.05);
    };

    // Rising brass fanfare: C4 → G4 → C5 → E5 → G5
    hit(261.63, t + 0.00, 0.13, 0.22);
    hit(392.00, t + 0.11, 0.13, 0.22);
    hit(523.25, t + 0.22, 0.14, 0.25);
    hit(659.25, t + 0.34, 0.16, 0.28);
    hit(783.99, t + 0.48, 0.18, 0.28);

    // Climactic top chord: C6 + E6 + G6
    hit(1046.50, t + 0.64, 0.55, 0.28);
    hit(1318.51, t + 0.70, 0.48, 0.18);
    hit(1567.98, t + 0.76, 0.42, 0.14);

    // Bass punches
    hit(65.41,  t + 0.00, 0.30, 0.45, 'sine'); // C2 at opening
    hit(130.81, t + 0.64, 0.55, 0.40, 'sine'); // C3 at climax

    // Sustained C major chord swell (the "epic" hold)
    const chordFreqs = [130.81, 261.63, 329.63, 392.00, 523.25, 659.25, 783.99, 1046.50];
    chordFreqs.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const g   = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      osc.connect(g);
      g.connect(ctx.destination);
      const s   = t + 0.82;
      const vol = Math.max(0.02, 0.13 - i * 0.012);
      g.gain.setValueAtTime(0, s);
      g.gain.linearRampToValueAtTime(vol, s + 0.10);
      g.gain.setValueAtTime(vol, s + 0.90);
      g.gain.exponentialRampToValueAtTime(0.001, s + 2.30);
      osc.start(s);
      osc.stop(s + 2.40);
      if (i === chordFreqs.length - 1) osc.onended = () => ctx.close();
    });
  } catch { /* AudioContext unavailable */ }
}

// Three urgent beeps — used when you've fallen behind your chess practice schedule.
export function playAlertSound(): void {
  try {
    const ctx = new AudioContext();
    const t   = ctx.currentTime;
    const beep = (start: number) => {
      const osc  = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'square';
      osc.frequency.setValueAtTime(880, start);
      gain.gain.setValueAtTime(0, start);
      gain.gain.linearRampToValueAtTime(0.3, start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.25);
      osc.start(start);
      osc.stop(start + 0.25);
    };
    beep(t);
    beep(t + 0.35);
    beep(t + 0.7);
    setTimeout(() => { try { ctx.close(); } catch { /* noop */ } }, 1100);
  } catch { /* AudioContext unavailable */ }
}

export function playSound(correct: boolean): void {
  try {
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    const t = ctx.currentTime;

    if (correct) {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, t);
      osc.frequency.setValueAtTime(1320, t + 0.08);
      gain.gain.setValueAtTime(0.25, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
      osc.start(t);
      osc.stop(t + 0.35);
    } else {
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(280, t);
      osc.frequency.linearRampToValueAtTime(180, t + 0.3);
      gain.gain.setValueAtTime(0.2, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.4);
      osc.start(t);
      osc.stop(t + 0.4);
    }

    osc.onended = () => ctx.close();
  } catch {
    // AudioContext unavailable
  }
}
