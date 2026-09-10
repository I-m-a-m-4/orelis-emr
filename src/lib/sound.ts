/**
 * High-fidelity clinical chime synthesizer for Orelis notifications.
 * Uses the Web Audio API with zero external asset dependencies so it works offline,
 * in native Tauri (Windows, macOS, Android, iOS), and in web browsers.
 */

export function playNotificationSound(): void {
  if (typeof window === 'undefined') return;

  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;

    const ctx = new AudioContextClass();
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }

    const now = ctx.currentTime;

    // Harmonic two-tone chime (A5 = 880Hz, E6 = 1318.5Hz)
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gainNode = ctx.createGain();

    osc1.type = 'sine';
    osc2.type = 'triangle';

    osc1.frequency.setValueAtTime(880, now);
    osc1.frequency.exponentialRampToValueAtTime(1318.51, now + 0.12);

    osc2.frequency.setValueAtTime(440, now);
    osc2.frequency.exponentialRampToValueAtTime(659.25, now + 0.12);

    gainNode.gain.setValueAtTime(0.18, now);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, now + 0.6);

    osc1.connect(gainNode);
    osc2.connect(gainNode);
    gainNode.connect(ctx.destination);

    osc1.start(now);
    osc2.start(now);

    osc1.stop(now + 0.6);
    osc2.stop(now + 0.6);

    // Clean up AudioContext after sound finishes
    setTimeout(() => {
      try {
        ctx.close().catch(() => {});
      } catch {}
    }, 700);
  } catch (err) {
    // Audio context may be blocked before first user gesture
    console.debug('[sound] Audio notification skipped:', err);
  }
}
