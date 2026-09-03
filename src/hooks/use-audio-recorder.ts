'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Microphone capture for clinical dictation.
 *
 * Replaces the `webkitSpeechRecognition` path the scribe used to depend on.
 * `MediaRecorder` and `getUserMedia` are supported everywhere the app runs —
 * including Safari, Firefox and packaged WebViews, none of which implement the
 * Web Speech API — and it produces an audio file the server can hand to a model
 * with clinical vocabulary, rather than a browser's best guess at what a drug
 * name sounded like.
 *
 * The level meter reads a real `AnalyserNode`. The previous visualiser was
 * `Math.random()` on an animation frame, which drew a confident waveform for a
 * muted microphone — a clinician would dictate a whole consultation into nothing
 * and only discover it afterwards. Levels here are zero when the room is silent,
 * which is the one thing the meter exists to tell you.
 */

export type RecorderState = 'idle' | 'requesting' | 'recording' | 'stopped';

/** Containers in preference order. Chromium gives Opus; Safari gives AAC in MP4. */
const CANDIDATE_TYPES = [
    'audio/webm;codecs=opus',
    'audio/webm',
    'audio/mp4',
    'audio/ogg;codecs=opus',
];

function pickMimeType(): string | undefined {
    if (typeof MediaRecorder === 'undefined') return undefined;
    for (const type of CANDIDATE_TYPES) {
        try {
            if (MediaRecorder.isTypeSupported(type)) return type;
        } catch {
            /* isTypeSupported throws on some older WebViews */
        }
    }
    // undefined lets the browser choose its own default rather than failing.
    return undefined;
}

const BAR_COUNT = 16;
const SILENT_BARS = new Array(BAR_COUNT).fill(0);

export interface AudioRecording {
    /** `data:audio/webm;base64,...` — the media type travels with the bytes. */
    dataUrl: string;
    mimeType: string;
    durationMs: number;
    bytes: number;
}

export function useAudioRecorder() {
    const [state, setState] = useState<RecorderState>('idle');
    const [levels, setLevels] = useState<number[]>(SILENT_BARS);
    const [durationMs, setDurationMs] = useState(0);
    const [error, setError] = useState<string | null>(null);

    const recorderRef = useRef<MediaRecorder | null>(null);
    const chunksRef = useRef<Blob[]>([]);
    const streamRef = useRef<MediaStream | null>(null);
    const audioContextRef = useRef<AudioContext | null>(null);
    const analyserRef = useRef<AnalyserNode | null>(null);
    const frameRef = useRef<number | null>(null);
    const startedAtRef = useRef<number>(0);

    const supported =
        typeof window !== 'undefined' &&
        typeof MediaRecorder !== 'undefined' &&
        Boolean(navigator?.mediaDevices?.getUserMedia);

    /** Release the microphone and every audio graph node built for it. */
    const teardown = useCallback(() => {
        if (frameRef.current !== null) {
            cancelAnimationFrame(frameRef.current);
            frameRef.current = null;
        }
        analyserRef.current = null;

        if (audioContextRef.current) {
            void audioContextRef.current.close().catch(() => {});
            audioContextRef.current = null;
        }
        // Stopping the tracks is what turns the browser's recording indicator off.
        // Leaving them live means the tab looks like it is still listening.
        streamRef.current?.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
        recorderRef.current = null;
        setLevels(SILENT_BARS);
    }, []);

    useEffect(() => teardown, [teardown]);

    const start = useCallback(async (): Promise<boolean> => {
        if (!supported) {
            setError('This browser cannot record audio.');
            return false;
        }

        setError(null);
        setState('requesting');

        let stream: MediaStream;
        try {
            stream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true,
                },
            });
        } catch (err: any) {
            setState('idle');
            setError(
                err?.name === 'NotAllowedError'
                    ? 'Microphone access was blocked. Allow it in your browser settings to dictate.'
                    : err?.name === 'NotFoundError'
                        ? 'No microphone was found on this device.'
                        : err?.message ?? 'Could not open the microphone.'
            );
            return false;
        }

        streamRef.current = stream;
        chunksRef.current = [];

        // Real levels, from the same stream being recorded.
        try {
            const Ctx = window.AudioContext ?? (window as any).webkitAudioContext;
            const context: AudioContext = new Ctx();
            const analyser = context.createAnalyser();
            analyser.fftSize = 256;
            analyser.smoothingTimeConstant = 0.7;
            context.createMediaStreamSource(stream).connect(analyser);

            audioContextRef.current = context;
            analyserRef.current = analyser;

            const bins = new Uint8Array(analyser.frequencyBinCount);
            const step = Math.floor(bins.length / BAR_COUNT) || 1;

            const tick = () => {
                const node = analyserRef.current;
                if (!node) return;
                node.getByteFrequencyData(bins);

                const next: number[] = [];
                for (let i = 0; i < BAR_COUNT; i++) {
                    let total = 0;
                    for (let j = 0; j < step; j++) total += bins[i * step + j] ?? 0;
                    // 0–100, so the consumer can treat it as a percentage height.
                    next.push(Math.min(100, Math.round((total / step / 255) * 100)));
                }
                setLevels(next);
                frameRef.current = requestAnimationFrame(tick);
            };
            frameRef.current = requestAnimationFrame(tick);
        } catch (err) {
            // A missing AudioContext costs the meter, not the recording.
            console.warn('[recorder] level metering unavailable:', err);
        }

        const mimeType = pickMimeType();
        let recorder: MediaRecorder;
        try {
            recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
        } catch (err: any) {
            teardown();
            setState('idle');
            setError(err?.message ?? 'This browser could not start a recording.');
            return false;
        }

        recorder.ondataavailable = (event) => {
            if (event.data && event.data.size > 0) chunksRef.current.push(event.data);
        };

        recorderRef.current = recorder;
        startedAtRef.current = Date.now();
        setDurationMs(0);
        // A timeslice means chunks arrive as we go, so a crash mid-consultation
        // still leaves whatever was captured up to that point.
        recorder.start(1000);
        setState('recording');
        return true;
    }, [supported, teardown]);

    /** Stop and resolve the recording, or null if nothing was captured. */
    const stop = useCallback((): Promise<AudioRecording | null> => {
        const recorder = recorderRef.current;
        if (!recorder || recorder.state === 'inactive') {
            teardown();
            setState('stopped');
            return Promise.resolve(null);
        }

        return new Promise((resolve) => {
            recorder.onstop = () => {
                const mimeType = recorder.mimeType || 'audio/webm';
                const blob = new Blob(chunksRef.current, { type: mimeType });
                const elapsed = Date.now() - startedAtRef.current;

                setDurationMs(elapsed);
                setState('stopped');
                teardown();

                if (!blob.size) {
                    resolve(null);
                    return;
                }

                const reader = new FileReader();
                reader.onloadend = () => {
                    resolve({
                        dataUrl: String(reader.result),
                        mimeType,
                        durationMs: elapsed,
                        bytes: blob.size,
                    });
                };
                reader.onerror = () => resolve(null);
                reader.readAsDataURL(blob);
            };

            try {
                recorder.stop();
            } catch {
                teardown();
                setState('stopped');
                resolve(null);
            }
        });
    }, [teardown]);

    const reset = useCallback(() => {
        teardown();
        chunksRef.current = [];
        setState('idle');
        setDurationMs(0);
        setError(null);
    }, [teardown]);

    // A visible timer while recording: dictation has a size ceiling on the server
    // and a clinician should be able to see how long they have been going.
    useEffect(() => {
        if (state !== 'recording') return;
        const id = setInterval(() => setDurationMs(Date.now() - startedAtRef.current), 500);
        return () => clearInterval(id);
    }, [state]);

    return { state, levels, durationMs, error, supported, start, stop, reset };
}
