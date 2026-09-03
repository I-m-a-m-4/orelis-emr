'use client';

import React, { useState } from 'react';
import {
    Activity, AlertTriangle, Check, Copy, FileText, HelpCircle, Loader2, Mic,
    RotateCcw, Sparkles, Square,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
    Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useAudioRecorder } from '@/hooks/use-audio-recorder';
import { apiFetch } from '@/lib/api-client';
import { cn } from '@/lib/utils';

/**
 * Clinical voice scribe.
 *
 * ## What changed and why it mattered
 *
 * This component used to run on `webkitSpeechRecognition` and a keyword matcher.
 * Three things were wrong, in increasing order of severity:
 *
 * 1. **It only worked in Chromium.** Safari and Firefox have no Web Speech API, so
 *    the button did nothing at all — and neither do many packaged WebViews.
 * 2. **The waveform was `Math.random()`.** It animated identically whether the
 *    microphone was live or muted, so there was no way to notice a failed
 *    recording until the consultation was over.
 * 3. **It invented clinical content.** When the keyword matcher found nothing for
 *    a field it substituted a sentence — "Physical examination findings documented
 *    per vocal dictation", "Clinical assessment pending diagnostic confirmation" —
 *    and offered to write that into the chart. A fabricated examination finding in
 *    a signed medical record is a patient-safety and medico-legal problem, and it
 *    is the specific reason this rewrite exists.
 *
 * Now: `MediaRecorder` captures audio anywhere, a real `AnalyserNode` drives the
 * meter, and the audio goes to `clinical-scribe` — a Gemini flow that transcribes
 * *and* structures in one pass, returns the verbatim transcript alongside the
 * fielded note so the clinician can check it, and lists what it could not make out
 * instead of guessing. **An empty field stays empty.**
 *
 * Nothing reaches the chart without the clinician pressing Apply.
 */

interface ParsedSoap {
    subjective: string;
    objective: string;
    assessment: string;
    plan: string;
    chiefComplaint?: string;
    prescriptions?: string[];
    labs?: string[];
}

interface ScribeResult extends ParsedSoap {
    verbatimTranscript: string;
    uncertainties?: string[];
}

interface AmbientVoiceScribeProps {
    onApplySoap?: (soap: ParsedSoap) => void;
    onAppendText?: (field: 'subjective' | 'objective' | 'assessment' | 'plan', text: string) => void;
    /** Anything already known about the encounter, to steer the transcription. */
    context?: string;
    className?: string;
}

function formatDuration(ms: number): string {
    const total = Math.floor(ms / 1000);
    return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
}

/** Send a recording for transcription. Shared by both exports in this file. */
async function runScribe(
    audioDataUrl: string,
    context?: string
): Promise<{ ok: true; data: ScribeResult } | { ok: false; error: string }> {
    const result = await apiFetch<ScribeResult>('/api/ai/clinical-scribe', {
        method: 'POST',
        body: { audioDataUrl, context },
        description: 'Transcribe clinical dictation',
        // Never queue this. A transcription replayed hours later would arrive
        // detached from the consultation it belongs to, and the clinician has
        // already moved on — better to fail now and keep the audio.
        queueOnFailure: false,
    });

    if (!result.ok || !result.data) {
        return { ok: false, error: result.error ?? 'The scribe could not process that recording.' };
    }
    return { ok: true, data: result.data };
}

const FIELD_STYLES: { key: keyof ParsedSoap; label: string; hint: string }[] = [
    { key: 'subjective', label: 'Subjective', hint: 'Symptoms & history' },
    { key: 'objective', label: 'Objective', hint: 'Vitals & examination' },
    { key: 'assessment', label: 'Assessment', hint: 'Diagnosis' },
    { key: 'plan', label: 'Plan', hint: 'Treatment & orders' },
];

export function AmbientVoiceScribe({
    onApplySoap,
    onAppendText,
    context,
    className,
}: AmbientVoiceScribeProps) {
    const { toast } = useToast();
    const recorder = useAudioRecorder();
    const [processing, setProcessing] = useState(false);
    const [result, setResult] = useState<ScribeResult | null>(null);
    const [copied, setCopied] = useState(false);

    const recording = recorder.state === 'recording';

    const handleStart = async () => {
        if (!recorder.supported) {
            toast({
                variant: 'destructive',
                title: 'Recording unavailable',
                description: 'This browser cannot access a microphone.',
            });
            return;
        }
        setResult(null);
        const ok = await recorder.start();
        if (ok) {
            toast({ title: 'Recording', description: 'Speak naturally. Stop when you are done.' });
        } else if (recorder.error) {
            toast({ variant: 'destructive', title: 'Microphone unavailable', description: recorder.error });
        }
    };

    const handleStop = async () => {
        const audio = await recorder.stop();
        if (!audio) {
            toast({
                variant: 'destructive',
                title: 'Nothing recorded',
                description: 'No audio was captured. Check your microphone and try again.',
            });
            return;
        }

        setProcessing(true);
        try {
            const outcome = await runScribe(audio.dataUrl, context);
            if (!outcome.ok) {
                toast({ variant: 'destructive', title: 'Transcription failed', description: outcome.error });
                return;
            }
            setResult(outcome.data);
            toast({
                title: 'Transcribed',
                description: outcome.data.uncertainties?.length
                    ? `Review ${outcome.data.uncertainties.length} unclear term(s) before applying.`
                    : 'Check the note against the transcript before applying.',
            });
        } finally {
            setProcessing(false);
        }
    };

    const handleReset = () => {
        recorder.reset();
        setResult(null);
    };

    const handleApply = () => {
        if (!result || !onApplySoap) return;
        onApplySoap({
            subjective: result.subjective,
            objective: result.objective,
            assessment: result.assessment,
            plan: result.plan,
            chiefComplaint: result.chiefComplaint,
            prescriptions: result.prescriptions,
            labs: result.labs,
        });
        toast({ title: 'Applied to chart', description: 'Review each field before finalising the encounter.' });
    };

    const handleCopy = () => {
        if (!result?.verbatimTranscript) return;
        void navigator.clipboard.writeText(result.verbatimTranscript);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
        toast({ title: 'Transcript copied' });
    };

    return (
        <Card className={cn('border-dashed border-primary/30 bg-card/80 backdrop-blur-md shadow-lg overflow-hidden', className)}>
            <CardHeader className="pb-3 border-b border-border/40 bg-muted/20">
                <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-2.5">
                        <div className={cn(
                            'p-2 rounded-xl border transition-all duration-300',
                            recording
                                ? 'bg-destructive/10 border-destructive/40 text-destructive'
                                : 'bg-primary/10 border-primary/30 text-primary'
                        )}>
                            <Mic className="h-5 w-5" />
                        </div>
                        <div>
                            <CardTitle className="text-sm font-bold flex items-center gap-2">
                                Clinical Voice Scribe
                                {recording && (
                                    <Badge className="bg-destructive hover:bg-destructive text-white text-[9px] font-black uppercase tracking-wider">
                                        Recording {formatDuration(recorder.durationMs)}
                                    </Badge>
                                )}
                            </CardTitle>
                            <CardDescription className="text-xs">
                                Dictate the consultation. Nothing is written to the chart until you apply it.
                            </CardDescription>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                        {(result || recorder.state === 'stopped') && (
                            <Button size="sm" variant="ghost" onClick={handleReset} className="h-8 text-xs" disabled={processing}>
                                <RotateCcw className="h-3.5 w-3.5" />
                                <span className="sr-only">Start over</span>
                            </Button>
                        )}
                        <Button
                            size="sm"
                            variant={recording ? 'destructive' : 'default'}
                            onClick={recording ? handleStop : handleStart}
                            disabled={processing || recorder.state === 'requesting'}
                            className="gap-1.5 text-xs font-semibold shadow-md"
                        >
                            {recorder.state === 'requesting' ? (
                                <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Opening mic…</>
                            ) : recording ? (
                                <><Square className="h-3.5 w-3.5" /> Stop & transcribe</>
                            ) : (
                                <><Mic className="h-3.5 w-3.5" /> Start dictation</>
                            )}
                        </Button>
                    </div>
                </div>
            </CardHeader>

            <CardContent className="space-y-3 pt-4">
                {!recorder.supported && (
                    <div className="flex items-start gap-2 text-xs text-destructive bg-destructive/5 border border-destructive/20 rounded-md p-3">
                        <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                        <span>This browser cannot record audio. Dictation needs microphone support.</span>
                    </div>
                )}

                {recorder.error && !recording && (
                    <div className="flex items-start gap-2 text-xs text-destructive bg-destructive/5 border border-destructive/20 rounded-md p-3">
                        <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                        <span>{recorder.error}</span>
                    </div>
                )}

                {/* Real levels. Flat bars mean the microphone is genuinely hearing
                    nothing — which is the whole point of showing them. */}
                {recording && (
                    <div className="space-y-1.5">
                        <div className="flex items-end justify-center gap-1 h-14 px-3 py-2 rounded-lg bg-muted/30 border border-dashed">
                            {recorder.levels.map((level, i) => (
                                <div
                                    key={i}
                                    className="w-1.5 rounded-full bg-primary transition-all duration-75"
                                    style={{ height: `${Math.max(6, level)}%` }}
                                />
                            ))}
                        </div>
                        {recorder.levels.every((l) => l < 3) && (
                            <p className="text-[11px] text-amber-500 text-center flex items-center justify-center gap-1">
                                <AlertTriangle className="h-3 w-3" /> No sound detected — check your microphone
                            </p>
                        )}
                    </div>
                )}

                {processing && (
                    <div className="flex items-center justify-center gap-2 py-6 text-sm text-muted-foreground">
                        <Loader2 className="h-4 w-4 animate-spin" /> Transcribing and structuring…
                    </div>
                )}

                {result && (
                    <div className="space-y-3 animate-in fade-in slide-in-from-top-2 duration-300">
                        {/* Uncertainties first: they are the thing most likely to
                            cause harm if scrolled past. */}
                        {result.uncertainties?.length ? (
                            <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 space-y-1.5">
                                <p className="text-[11px] font-bold uppercase tracking-wider text-amber-500 flex items-center gap-1.5">
                                    <HelpCircle className="h-3.5 w-3.5" /> Confirm before applying
                                </p>
                                <ul className="text-xs text-muted-foreground list-disc pl-4 space-y-0.5">
                                    {result.uncertainties.map((item, i) => <li key={i}>{item}</li>)}
                                </ul>
                            </div>
                        ) : null}

                        <div className="space-y-1.5">
                            <div className="flex items-center justify-between">
                                <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                                    <FileText className="h-3.5 w-3.5" /> Verbatim transcript
                                </p>
                                <Button size="sm" variant="ghost" onClick={handleCopy} className="h-6 text-[11px] gap-1">
                                    {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                                    {copied ? 'Copied' : 'Copy'}
                                </Button>
                            </div>
                            <p className="text-xs text-muted-foreground leading-relaxed max-h-32 overflow-y-auto border border-dashed rounded-md p-2.5 bg-muted/20 whitespace-pre-wrap">
                                {result.verbatimTranscript || 'No speech was transcribed.'}
                            </p>
                        </div>

                        <div className="flex items-center justify-between pt-1 border-t border-border/60">
                            <div className="flex items-center gap-1.5 text-xs font-bold text-primary">
                                <Sparkles className="h-3.5 w-3.5" /> Structured note
                            </div>
                            {onApplySoap && (
                                <Button size="sm" onClick={handleApply} className="h-7 text-xs gap-1.5">
                                    <Check className="h-3.5 w-3.5" /> Apply to chart
                                </Button>
                            )}
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                            {FIELD_STYLES.map(({ key, label, hint }) => {
                                const value = result[key];
                                const text = typeof value === 'string' ? value.trim() : '';
                                return (
                                    <div key={key} className="p-2.5 rounded-lg border bg-muted/20 space-y-1">
                                        <div className="flex items-center justify-between">
                                            <p className="font-bold text-primary text-[11px] uppercase tracking-wider">
                                                {label}
                                            </p>
                                            {onAppendText && text && (
                                                <Button
                                                    size="sm"
                                                    variant="ghost"
                                                    className="h-5 px-1.5 text-[10px]"
                                                    onClick={() => onAppendText(key as any, text)}
                                                >
                                                    Append
                                                </Button>
                                            )}
                                        </div>
                                        <p className="text-[10px] text-muted-foreground/60 uppercase">{hint}</p>
                                        {/* An empty field is shown as empty, on purpose. */}
                                        {text ? (
                                            <p className="text-muted-foreground leading-relaxed whitespace-pre-wrap">{text}</p>
                                        ) : (
                                            <p className="text-muted-foreground/50 italic">Nothing was dictated for this section.</p>
                                        )}
                                    </div>
                                );
                            })}
                        </div>

                        {(result.prescriptions?.length || result.labs?.length) ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                                {result.prescriptions?.length ? (
                                    <div className="p-2.5 rounded-lg border bg-muted/20 space-y-1">
                                        <p className="font-bold text-[11px] uppercase tracking-wider text-muted-foreground">
                                            Medications mentioned
                                        </p>
                                        <ul className="list-disc pl-4 text-muted-foreground space-y-0.5">
                                            {result.prescriptions.map((rx, i) => <li key={i}>{rx}</li>)}
                                        </ul>
                                    </div>
                                ) : null}
                                {result.labs?.length ? (
                                    <div className="p-2.5 rounded-lg border bg-muted/20 space-y-1">
                                        <p className="font-bold text-[11px] uppercase tracking-wider text-muted-foreground">
                                            Investigations mentioned
                                        </p>
                                        <ul className="list-disc pl-4 text-muted-foreground space-y-0.5">
                                            {result.labs.map((lab, i) => <li key={i}>{lab}</li>)}
                                        </ul>
                                    </div>
                                ) : null}
                            </div>
                        ) : null}
                    </div>
                )}
            </CardContent>

            <CardFooter className="bg-muted/10 border-t border-border/40 py-2.5 px-4">
                <span className="text-[11px] text-muted-foreground flex items-center gap-1.5">
                    <Activity className="h-3.5 w-3.5 text-emerald-500" />
                    Transcribed on the server · never auto-filed to the chart
                </span>
            </CardFooter>
        </Card>
    );
}

/**
 * Push-to-talk dictation for one field.
 *
 * Same engine as the full scribe — record, send, receive text — so it works in
 * every browser the app supports rather than only Chromium. Returns the verbatim
 * transcript: a single field wants what was said, not a restructured note.
 */
export function FieldVoiceDictationButton({
    onTranscript,
    className,
}: {
    onTranscript: (text: string) => void;
    className?: string;
}) {
    const { toast } = useToast();
    const recorder = useAudioRecorder();
    const [processing, setProcessing] = useState(false);

    const recording = recorder.state === 'recording';
    const busy = processing || recorder.state === 'requesting';

    const handleClick = async (event: React.MouseEvent) => {
        event.preventDefault();

        if (recording) {
            const audio = await recorder.stop();
            if (!audio) {
                toast({ variant: 'destructive', title: 'Nothing recorded' });
                return;
            }

            setProcessing(true);
            try {
                const outcome = await runScribe(audio.dataUrl);
                if (!outcome.ok) {
                    toast({ variant: 'destructive', title: 'Transcription failed', description: outcome.error });
                    return;
                }
                const text = outcome.data.verbatimTranscript?.trim();
                if (text) {
                    onTranscript(text);
                } else {
                    toast({ variant: 'destructive', title: 'No speech detected' });
                }
            } finally {
                setProcessing(false);
                recorder.reset();
            }
            return;
        }

        const ok = await recorder.start();
        if (!ok && recorder.error) {
            toast({ variant: 'destructive', title: 'Microphone unavailable', description: recorder.error });
        }
    };

    return (
        <Button
            type="button"
            size="icon"
            variant={recording ? 'destructive' : 'ghost'}
            onClick={handleClick}
            disabled={busy || !recorder.supported}
            className={cn('h-7 w-7 rounded-md shrink-0 transition-all', recording && 'animate-pulse', className)}
            title={
                !recorder.supported
                    ? 'Dictation needs microphone support'
                    : recording
                        ? 'Stop and transcribe'
                        : 'Dictate into this field'
            }
        >
            {processing
                ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                : recording
                    ? <Square className="h-3.5 w-3.5 text-white" />
                    : <Mic className="h-3.5 w-3.5 text-muted-foreground hover:text-primary" />}
            <span className="sr-only">
                {recording ? 'Stop dictating' : 'Dictate into this field'}
            </span>
        </Button>
    );
}
