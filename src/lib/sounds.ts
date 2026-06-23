let ctx: AudioContext | null = null;

function getCtx(): AudioContext {
  if (!ctx) ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
  return ctx;
}

function tone(freq: number, startAt: number, duration: number, gain = 0.25, type: OscillatorType = 'sine') {
  try {
    const ac = getCtx();
    if (ac.state === 'suspended') ac.resume();
    const osc = ac.createOscillator();
    const g = ac.createGain();
    osc.connect(g);
    g.connect(ac.destination);
    osc.type = type;
    osc.frequency.setValueAtTime(freq, ac.currentTime + startAt);
    g.gain.setValueAtTime(gain, ac.currentTime + startAt);
    g.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + startAt + duration);
    osc.start(ac.currentTime + startAt);
    osc.stop(ac.currentTime + startAt + duration);
  } catch {}
}

// Driver: nueva solicitud de carrera — urgente, dos tonos ascendentes
export function playNewRequest() {
  tone(440, 0,    0.12, 0.35, 'square');
  tone(660, 0.14, 0.18, 0.35, 'square');
}

// Cliente: nueva oferta del driver — agradable, dos tonos suaves
export function playNewOffer() {
  tone(880, 0,   0.18, 0.22);
  tone(660, 0.2, 0.25, 0.18);
}

// Cambio de estado positivo (en camino, llegó, viaje iniciado, completado)
export function playStatusPositive() {
  tone(660, 0,    0.1, 0.2);
  tone(880, 0.12, 0.2, 0.18);
}

// Cambio de estado negativo (cancelado)
export function playStatusNegative() {
  tone(330, 0,    0.2, 0.3);
  tone(220, 0.22, 0.3, 0.25);
}
