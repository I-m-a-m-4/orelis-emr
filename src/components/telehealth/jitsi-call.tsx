'use client';

import { useEffect, useRef, useState } from 'react';
import { Mic, MicOff, Monitor, MonitorOff, Phone, Video, VideoOff } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

/**
 * The live telehealth call surface.
 *
 * ## Why this is not a plain iframe
 *
 * It used to be, with a row of Mic / Video / Screen-share buttons floating on top
 * of it that were labelled in the source as "Mockup style for Orelis aesthetics".
 * They had no handlers. Nothing outside an iframe can change what happens inside
 * one, so those buttons could never have worked — and a mute button that looks
 * pressed while the microphone stays live is a patient-confidentiality failure,
 * not a cosmetic one. A clinician discussing one patient's results while the
 * previous consultation is still connected is exactly the outcome it invites.
 *
 * `JitsiMeetExternalAPI` is the supported way to drive a Jitsi session from the
 * host page: `executeCommand` toggles the real device state, and the
 * `*MuteStatusChanged` events report it back, so the icon reflects the microphone
 * rather than a local guess. State is *reflected*, never assumed — a toggle that
 * fails leaves the icon where it was.
 *
 * ## Degrading honestly
 *
 * The API needs a script from meet.jit.si. On a clinic network that blocks it, or
 * offline, the component falls back to the bare iframe **with Jitsi's own toolbar
 * left switched on**, and renders no custom controls at all. Fewer controls that
 * work beats more controls that lie.
 */

const JITSI_HOST = 'meet.jit.si';
const SCRIPT_SRC = `https://${JITSI_HOST}/external_api.js`;

type Mode = 'loading' | 'api' | 'fallback';

declare global {
    interface Window {
        JitsiMeetExternalAPI?: any;
    }
}

/** Resolve true once the external API is on `window`, false if it cannot load. */
function loadJitsiScript(): Promise<boolean> {
    if (typeof window === 'undefined') return Promise.resolve(false);
    if (window.JitsiMeetExternalAPI) return Promise.resolve(true);

    return new Promise((resolve) => {
        const existing = document.querySelector<HTMLScriptElement>('script[data-jitsi-api]');
        if (existing) {
            existing.addEventListener('load', () => resolve(Boolean(window.JitsiMeetExternalAPI)));
            existing.addEventListener('error', () => resolve(false));
            return;
        }

        const script = document.createElement('script');
        script.src = SCRIPT_SRC;
        script.async = true;
        script.dataset.jitsiApi = 'true';
        script.onload = () => resolve(Boolean(window.JitsiMeetExternalAPI));
        script.onerror = () => resolve(false);
        document.head.appendChild(script);
    });
}

export function JitsiCall({
    roomName,
    displayName,
    onEnd,
}: {
    roomName: string;
    displayName: string;
    /** Called when the participant leaves from inside the conference. */
    onEnd: () => void;
}) {
    const containerRef = useRef<HTMLDivElement>(null);
    const apiRef = useRef<any>(null);
    const onEndRef = useRef(onEnd);
    onEndRef.current = onEnd;

    const [mode, setMode] = useState<Mode>('loading');
    const [audioMuted, setAudioMuted] = useState(false);
    const [videoMuted, setVideoMuted] = useState(false);
    const [sharing, setSharing] = useState(false);

    useEffect(() => {
        let disposed = false;

        (async () => {
            const ready = await loadJitsiScript();
            if (disposed) return;

            if (!ready || !containerRef.current || !window.JitsiMeetExternalAPI) {
                console.warn('[telehealth] Jitsi external API unavailable — falling back to a plain iframe with its native toolbar.');
                setMode('fallback');
                return;
            }

            try {
                const api = new window.JitsiMeetExternalAPI(JITSI_HOST, {
                    roomName,
                    parentNode: containerRef.current,
                    userInfo: { displayName },
                    configOverwrite: {
                        prejoinPageEnabled: false,
                        disableDeepLinking: true,
                    },
                    interfaceConfigOverwrite: {
                        // Our own controls replace the native toolbar. Only safe
                        // because they are wired to executeCommand below; the
                        // fallback path deliberately leaves the toolbar alone.
                        TOOLBAR_BUTTONS: ['chat', 'tileview', 'settings', 'raisehand'],
                        SHOW_JITSI_WATERMARK: false,
                    },
                });

                apiRef.current = api;

                // The icons follow the conference, not our clicks. A toggle the
                // browser refuses (no camera, permission denied) therefore leaves
                // the button showing the true state.
                api.addListener('audioMuteStatusChanged', (e: { muted: boolean }) => setAudioMuted(e.muted));
                api.addListener('videoMuteStatusChanged', (e: { muted: boolean }) => setVideoMuted(e.muted));
                api.addListener('screenSharingStatusChanged', (e: { on: boolean }) => setSharing(e.on));
                api.addListener('readyToClose', () => onEndRef.current());

                setMode('api');
            } catch (err) {
                console.error('[telehealth] Could not start the Jitsi session:', err);
                setMode('fallback');
            }
        })();

        return () => {
            disposed = true;
            try {
                apiRef.current?.dispose?.();
            } catch {
                /* the conference is going away regardless */
            }
            apiRef.current = null;
        };
    }, [roomName, displayName]);

    const command = (name: string) => {
        try {
            apiRef.current?.executeCommand(name);
        } catch (err) {
            console.error(`[telehealth] ${name} failed:`, err);
        }
    };

    const controlClass = 'h-12 w-12 rounded-none bg-white/5 border-white/10 hover:bg-white/10';

    return (
        <div className="flex-1 bg-black relative">
            {mode === 'fallback' ? (
                <iframe
                    title="Telehealth consultation"
                    src={`https://${JITSI_HOST}/${roomName}#config.prejoinPageEnabled=false&userInfo.displayName=%22${encodeURIComponent(displayName)}%22`}
                    className="w-full h-full border-none"
                    allow="camera; microphone; display-capture; autoplay; clipboard-write"
                />
            ) : (
                <div ref={containerRef} className="w-full h-full" />
            )}

            {mode === 'loading' && (
                <div className="absolute inset-0 flex items-center justify-center text-white/70 text-sm">
                    Connecting securely…
                </div>
            )}

            {/* Only rendered when the commands behind them are real. */}
            {mode === 'api' && (
                <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-4 p-4 bg-background/20 backdrop-blur-xl border border-white/10 rounded-none shadow-2xl">
                    <Button
                        variant="outline"
                        size="icon"
                        className={cn(controlClass, audioMuted && 'bg-destructive/80 border-destructive text-white hover:bg-destructive')}
                        onClick={() => command('toggleAudio')}
                        aria-pressed={audioMuted}
                        title={audioMuted ? 'Unmute microphone' : 'Mute microphone'}
                    >
                        {audioMuted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
                        <span className="sr-only">{audioMuted ? 'Unmute microphone' : 'Mute microphone'}</span>
                    </Button>

                    <Button
                        variant="outline"
                        size="icon"
                        className={cn(controlClass, videoMuted && 'bg-destructive/80 border-destructive text-white hover:bg-destructive')}
                        onClick={() => command('toggleVideo')}
                        aria-pressed={videoMuted}
                        title={videoMuted ? 'Turn camera on' : 'Turn camera off'}
                    >
                        {videoMuted ? <VideoOff className="h-5 w-5" /> : <Video className="h-5 w-5" />}
                        <span className="sr-only">{videoMuted ? 'Turn camera on' : 'Turn camera off'}</span>
                    </Button>

                    <Button
                        variant="outline"
                        size="icon"
                        className={cn(controlClass, sharing && 'bg-primary/80 border-primary text-white hover:bg-primary')}
                        onClick={() => command('toggleShareScreen')}
                        aria-pressed={sharing}
                        title={sharing ? 'Stop sharing your screen' : 'Share your screen'}
                    >
                        {sharing ? <MonitorOff className="h-5 w-5" /> : <Monitor className="h-5 w-5" />}
                        <span className="sr-only">{sharing ? 'Stop sharing your screen' : 'Share your screen'}</span>
                    </Button>

                    <div className="w-px h-8 bg-white/10" />

                    <Button
                        variant="destructive"
                        size="icon"
                        className="h-12 w-12 rounded-none"
                        onClick={() => {
                            command('hangup');
                            onEndRef.current();
                        }}
                        title="Leave the consultation"
                    >
                        <Phone className="h-5 w-5 rotate-[135deg]" />
                        <span className="sr-only">Leave the consultation</span>
                    </Button>
                </div>
            )}

            {mode === 'fallback' && (
                <div className="absolute top-3 left-1/2 -translate-x-1/2 px-3 py-1.5 bg-amber-500/15 border border-amber-500/30 text-amber-200 text-xs backdrop-blur-sm">
                    Using the built-in Jitsi controls — the meet.jit.si helper script could not be loaded.
                </div>
            )}
        </div>
    );
}
