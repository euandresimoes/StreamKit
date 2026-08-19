let context: AudioContext | null = null;

function getContext() {
  if (typeof window === "undefined" || !("AudioContext" in window)) return null;
  context ??= new AudioContext();
  if (context.state === "suspended") void context.resume();
  return context;
}

export function playGiveawayTick() {
  const audio = getContext();
  if (!audio) return;
  const oscillator = audio.createOscillator();
  const gain = audio.createGain();
  oscillator.type = "square";
  oscillator.frequency.setValueAtTime(140, audio.currentTime);
  gain.gain.setValueAtTime(0.035, audio.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, audio.currentTime + 0.045);
  oscillator.connect(gain).connect(audio.destination);
  oscillator.start();
  oscillator.stop(audio.currentTime + 0.05);
}

export function playGiveawayWinner() {
  const audio = getContext();
  if (!audio) return;
  const now = audio.currentTime;
  const notes: Array<[number, number]> = [
    [0, 440],
    [0.09, 554],
    [0.18, 659],
  ];
  for (const [offset, frequency] of notes) {
    const oscillator = audio.createOscillator();
    const gain = audio.createGain();
    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(frequency, now + offset);
    gain.gain.setValueAtTime(0.0001, now + offset);
    gain.gain.exponentialRampToValueAtTime(0.08, now + offset + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + offset + 0.25);
    oscillator.connect(gain).connect(audio.destination);
    oscillator.start(now + offset);
    oscillator.stop(now + offset + 0.27);
  }
}
