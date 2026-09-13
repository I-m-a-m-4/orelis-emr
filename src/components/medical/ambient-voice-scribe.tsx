'use client';

import React, { useState } from 'react';
import {
    Activity, AlertTriangle, Check, Copy, FileText, HelpCircle, Loader2, Mic,
    RotateCcw, Sparkles, Square, Pause, Play, ShieldAlert, ShieldCheck, HeartPulse,
    Pill, FlaskConical, Stethoscope, Zap, CheckCircle2, ChevronRight, Volume2,
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
import type { GroqVitals, GroqPrescription } from '@/lib/groq';

/**
 * AI Ambient Consultation Scribe powered by Groq LPUs.
 *
 * Sits unobtrusively in doctor-patient consultations, records long conversations,
 * transcribes via Groq Whisper (`whisper-large-v3-turbo`), structures SOAP notes,
 * extracts spoken vitals and prescriptions, and provides a Doctor Oversight Hub
 * for clinical verification before anything enters the medical record.
 */

export interface ParsedSoap {
    subjective: string;
    objective: string;
    assessment: string;
    plan: string;
    chiefComplaint?: string;
    vitals?: GroqVitals;
    prescriptions?: string[];
    structuredPrescriptions?: GroqPrescription[];
    labs?: string[];
    clinicalOversight?: string[];
}

export interface ScribeResult extends ParsedSoap {
    verbatimTranscript: string;
    uncertainties?: string[];
}

interface AmbientVoiceScribeProps {
    onApplySoap?: (soap: ParsedSoap) => void;
    onAppendText?: (field: 'subjective' | 'objective' | 'assessment' | 'plan', text: string) => void;
    onApplyVitals?: (vitals: GroqVitals) => void;
    /** Encounter context, e.g. presenting complaint or patient history */
    context?: string;
    className?: string;
}

function formatDuration(ms: number): string {
    const total = Math.floor(ms / 1000);
    const mins = Math.floor(total / 60);
    const secs = total % 60;
    return `${mins}:${String(secs).padStart(2, '0')}`;
}

/** Send audio to Groq clinical scribe flow */
async function runScribe(
    audioDataUrl: string,
    context?: string
): Promise<{ ok: true; data: ScribeResult } | { ok: false; error: string }> {
    const result = await apiFetch<ScribeResult>('/api/ai/clinical-scribe', {
        method: 'POST',
        body: { audioDataUrl, context },
        description: 'Transcribe clinical consultation via Groq',
        queueOnFailure: false,
    });

    if (!result.ok || !result.data) {
        return { ok: false, error: result.error ?? 'Groq clinical scribe could not process the consultation.' };
    }
    return { ok: true, data: result.data };
}

const FIELD_CONFIG: { key: 'subjective' | 'objective' | 'assessment' | 'plan'; label: string; hint: string; letter: string }[] = [
    { key: 'subjective', label: 'Subjective', hint: 'Patient reported symptoms & history', letter: 'S' },
    { key: 'objective', label: 'Objective', hint: 'Exam observations & physical findings', letter: 'O' },
    { key: 'assessment', label: 'Assessment', hint: 'Clinical impressions & diagnoses', letter: 'A' },
    { key: 'plan', label: 'Plan', hint: 'Therapy, orders & follow-up', letter: 'P' },
];

export function AmbientVoiceScribe({
    onApplySoap,
    onAppendText,
    onApplyVitals,
    context,
    className,
}: AmbientVoiceScribeProps) {
    const { toast } = useToast();
    const recorder = useAudioRecorder();
    const [processing, setProcessing] = useState(false);
    const [processingStep, setProcessingStep] = useState<string>('');
    const [result, setResult] = useState<ScribeResult | null>(null);
    const [activeTab, setActiveTab] = useState<'soap' | 'orders' | 'transcript'>('soap');
    const [copied, setCopied] = useState(false);
    const [oversightAcknowledged, setOversightAcknowledged] = useState(false);

    const recording = recorder.state === 'recording';
    const paused = recorder.state === 'paused';
    const isListening = recording || paused;

    const handleStart = async () => {
        if (!recorder.supported) {
            toast({
                variant: 'destructive',
                title: 'Recording unavailable',
                description: 'Microphone access is not supported on this browser/device.',
            });
            return;
        }
        setResult(null);
        setOversightAcknowledged(false);
        const ok = await recorder.start();
        if (ok) {
            toast({
                title: 'Ambient Listener Activated',
                description: 'Listening to consultation. Speak naturally with the patient.',
            });
        } else if (recorder.error) {
            toast({ variant: 'destructive', title: 'Microphone error', description: recorder.error });
        }
    };

    const handleStop = async () => {
        setProcessingStep('Capturing audio stream…');
        const audio = await recorder.stop();
        if (!audio) {
            toast({
                variant: 'destructive',
                title: 'No audio captured',
                description: 'The recording was empty. Please check your microphone.',
            });
            return;
        }

        setProcessing(true);
        setProcessingStep('Transcribing via Groq Whisper LPU…');

        // Step transition timer for smooth visual feedback
        const stepTimer = setTimeout(() => {
            setProcessingStep('Structuring clinical note & safety oversight flags…');
        }, 1200);

        try {
            const outcome = await runScribe(audio.dataUrl, context);
            clearTimeout(stepTimer);

            if (!outcome.ok) {
                toast({
                    variant: 'destructive',
                    title: 'Transcription failed',
                    description: outcome.error,
                });
                return;
            }

            setResult(outcome.data);
            setActiveTab('soap');

            const hasFlags = (outcome.data.clinicalOversight?.length ?? 0) > 0 || (outcome.data.uncertainties?.length ?? 0) > 0;
            toast({
                title: 'Consultation Documented',
                description: hasFlags
                    ? 'Review clinical oversight safety checks before applying to chart.'
                    : 'SOAP note ready. Review and click "Apply to Chart".',
            });
        } finally {
            clearTimeout(stepTimer);
            setProcessing(false);
            setProcessingStep('');
        }
    };

    const handleReset = () => {
        recorder.reset();
        setResult(null);
        setOversightAcknowledged(false);
    };

    const handleApplyAll = () => {
        if (!result) return;

        if (onApplySoap) {
            onApplySoap({
                subjective: result.subjective,
                objective: result.objective,
                assessment: result.assessment,
                plan: result.plan,
                chiefComplaint: result.chiefComplaint,
                prescriptions: result.prescriptions,
                structuredPrescriptions: result.structuredPrescriptions,
                labs: result.labs,
                vitals: result.vitals,
                clinicalOversight: result.clinicalOversight,
            });
        }

        if (onApplyVitals && result.vitals) {
            onApplyVitals(result.vitals);
        }

        toast({
            title: 'Applied to Patient Chart',
            description: 'SOAP notes, vitals, and orders populated. Review before final sign-off.',
        });
    };

    const handleCopyTranscript = () => {
        if (!result?.verbatimTranscript) return;
        void navigator.clipboard.writeText(result.verbatimTranscript);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
        toast({ title: 'Transcript copied to clipboard' });
    };

    return (
        <Card className={cn('border border-primary/20 bg-card/90 backdrop-blur-md shadow-xl overflow-hidden transition-all duration-300', className)}>
            {/* Header with status and quick stats */}
            <CardHeader className="pb-3 border-b border-border/50 bg-gradient-to-r from-primary/5 via-muted/30 to-background">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div className="flex items-center gap-3">
                        <div className={cn(
                            'p-2.5 rounded-2xl border transition-all duration-500 shadow-sm',
                            recording
                                ? 'bg-destructive/15 border-destructive/50 text-destructive ring-4 ring-destructive/20 animate-pulse'
                                : paused
                                    ? 'bg-amber-500/15 border-amber-500/40 text-amber-500'
                                    : 'bg-primary/10 border-primary/30 text-primary'
                        )}>
                            <Stethoscope className="h-5 w-5" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2 flex-wrap">
                                <CardTitle className="text-sm font-black tracking-tight flex items-center gap-2 font-headline">
                                    AI Ambient Consultation Scribe
                                </CardTitle>
                                <Badge variant="outline" className="text-[10px] font-bold text-primary bg-primary/10 border-primary/30 gap-1 px-1.5 py-0.5">
                                    <Zap className="h-3 w-3 fill-primary" /> Groq LPU
                                </Badge>
                                {recording && (
                                    <Badge className="bg-destructive hover:bg-destructive text-white text-[10px] font-black uppercase tracking-wider animate-pulse">
                                        ● Listening {formatDuration(recorder.durationMs)}
                                    </Badge>
                                )}
                                {paused && (
                                    <Badge className="bg-amber-500 hover:bg-amber-500 text-white text-[10px] font-bold uppercase tracking-wider">
                                        Paused {formatDuration(recorder.durationMs)}
                                    </Badge>
                                )}
                            </div>
                            <CardDescription className="text-xs text-muted-foreground mt-0.5">
                                Ambient clinical scribe with automatic SOAP structuring, vitals extraction & doctor oversight
                            </CardDescription>
                        </div>
                    </div>

                    {/* Controls */}
                    <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
                        {(result || recorder.state === 'stopped') && (
                            <Button
                                size="sm"
                                variant="ghost"
                                onClick={handleReset}
                                className="h-8 text-xs gap-1 text-muted-foreground hover:text-foreground"
                                disabled={processing}
                            >
                                <RotateCcw className="h-3.5 w-3.5" />
                                <span>Reset</span>
                            </Button>
                        )}

                        {recording && (
                            <Button
                                size="sm"
                                variant="outline"
                                onClick={recorder.pause}
                                className="h-8 text-xs gap-1 border-amber-500/40 text-amber-500 hover:bg-amber-500/10"
                                disabled={processing}
                            >
                                <Pause className="h-3.5 w-3.5" />
                                <span>Pause</span>
                            </Button>
                        )}

                        {paused && (
                            <Button
                                size="sm"
                                variant="outline"
                                onClick={recorder.resume}
                                className="h-8 text-xs gap-1 border-primary/40 text-primary hover:bg-primary/10"
                                disabled={processing}
                            >
                                <Play className="h-3.5 w-3.5" />
                                <span>Resume</span>
                            </Button>
                        )}

                        {!isListening ? (
                            <Button
                                size="sm"
                                onClick={handleStart}
                                disabled={processing || recorder.state === 'requesting' || !recorder.supported}
                                className="h-8 gap-1.5 text-xs font-bold shadow-md bg-primary hover:bg-primary/90 text-primary-foreground transition-all hover:scale-105"
                            >
                                {recorder.state === 'requesting' ? (
                                    <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Opening Mic…</>
                                ) : (
                                    <><Mic className="h-3.5 w-3.5" /> Start Ambient Listening</>
                                )}
                            </Button>
                        ) : (
                            <Button
                                size="sm"
                                variant="destructive"
                                onClick={handleStop}
                                disabled={processing}
                                className="h-8 gap-1.5 text-xs font-bold shadow-md animate-pulse"
                            >
                                <Square className="h-3.5 w-3.5 fill-current" />
                                <span>End & Generate Record</span>
                            </Button>
                        )}
                    </div>
                </div>
            </CardHeader>

            <CardContent className="space-y-4 pt-4">
                {/* Browser support & mic permission errors */}
                {!recorder.supported && (
                    <div className="flex items-start gap-2 text-xs text-destructive bg-destructive/5 border border-destructive/20 rounded-lg p-3">
                        <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                        <span>Microphone recording is not supported in this browser. Please use Chrome, Edge, or Safari.</span>
                    </div>
                )}

                {recorder.error && !recording && (
                    <div className="flex items-start gap-2 text-xs text-destructive bg-destructive/5 border border-destructive/20 rounded-lg p-3">
                        <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                        <span>{recorder.error}</span>
                    </div>
                )}

                {/* Active listening waveform meter */}
                {recording && (
                    <div className="space-y-2 p-3.5 rounded-xl bg-muted/30 border border-dashed border-primary/30">
                        <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                            <span className="flex items-center gap-1.5 font-semibold text-primary">
                                <Volume2 className="h-3.5 w-3.5 animate-bounce" /> Ambient Room Audio
                            </span>
                            <span className="font-mono font-bold text-[11px] text-foreground">
                                Duration: {formatDuration(recorder.durationMs)}
                            </span>
                        </div>
                        <div className="flex items-end justify-center gap-1.5 h-12 px-2">
                            {recorder.levels.map((level, i) => (
                                <div
                                    key={i}
                                    className="w-2 rounded-full bg-gradient-to-t from-primary/60 to-primary transition-all duration-75"
                                    style={{ height: `${Math.max(8, level)}%` }}
                                />
                            ))}
                        </div>
                        {recorder.levels.every((l) => l < 3) && (
                            <p className="text-[11px] text-amber-500 text-center flex items-center justify-center gap-1">
                                <AlertTriangle className="h-3 w-3" /> Silent room — ensure the microphone is positioned near the consultation.
                            </p>
                        )}
                    </div>
                )}

                {/* Processing banner */}
                {processing && (
                    <div className="flex flex-col items-center justify-center gap-3 py-8 text-center bg-muted/20 rounded-xl border border-dashed">
                        <div className="relative">
                            <div className="h-10 w-10 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
                            <Sparkles className="h-4 w-4 text-primary absolute inset-0 m-auto" />
                        </div>
                        <div>
                            <p className="text-sm font-bold text-foreground">AI Medical Scribe Processing</p>
                            <p className="text-xs text-muted-foreground mt-0.5">{processingStep || 'Processing audio with Groq LPUs…'}</p>
                        </div>
                    </div>
                )}

                {/* --- RESULTS & DOCTOR OVERSIGHT HUB --- */}
                {result && (
                    <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
                        {/* DOCTOR CLINICAL OVERSIGHT BANNER */}
                        <div className="rounded-xl border border-amber-500/30 bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent p-4 space-y-2.5">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <ShieldAlert className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                                    <h4 className="text-xs font-black uppercase tracking-wider text-amber-600 dark:text-amber-400 font-headline">
                                        Clinical Oversight & Safety Checks
                                    </h4>
                                </div>
                                <Badge variant="outline" className="text-[10px] font-bold border-amber-500/40 text-amber-600 dark:text-amber-400">
                                    Physician Review Required
                                </Badge>
                            </div>

                            {/* Oversight items */}
                            <div className="text-xs text-muted-foreground space-y-1.5 pl-1">
                                {result.clinicalOversight?.length ? (
                                    result.clinicalOversight.map((item, i) => (
                                        <div key={i} className="flex items-start gap-2">
                                            <span className="text-amber-500 mt-0.5 font-bold">•</span>
                                            <span className="leading-snug">{item}</span>
                                        </div>
                                    ))
                                ) : (
                                    <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
                                        <ShieldCheck className="h-4 w-4" />
                                        <span>No safety anomalies or drug conflicts voiced during this encounter.</span>
                                    </div>
                                )}

                                {/* Uncertainties needing human check */}
                                {result.uncertainties?.length ? (
                                    <div className="pt-2 border-t border-amber-500/20">
                                        <p className="text-[11px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider mb-1 flex items-center gap-1">
                                            <HelpCircle className="h-3.5 w-3.5" /> Terms Needing Clarification:
                                        </p>
                                        <div className="flex flex-wrap gap-1.5">
                                            {result.uncertainties.map((unc, i) => (
                                                <Badge key={i} variant="secondary" className="text-[11px] bg-amber-500/15 border border-amber-500/30 text-amber-700 dark:text-amber-300">
                                                    {unc}
                                                </Badge>
                                            ))}
                                        </div>
                                    </div>
                                ) : null}
                            </div>
                        </div>

                        {/* Navigation Tabs */}
                        <div className="flex items-center justify-between border-b border-border/60 pb-2">
                            <div className="flex gap-1.5">
                                <Button
                                    size="sm"
                                    variant={activeTab === 'soap' ? 'default' : 'ghost'}
                                    onClick={() => setActiveTab('soap')}
                                    className="h-7 text-xs font-semibold gap-1.5"
                                >
                                    <Sparkles className="h-3 w-3" /> Structured SOAP
                                </Button>
                                <Button
                                    size="sm"
                                    variant={activeTab === 'orders' ? 'default' : 'ghost'}
                                    onClick={() => setActiveTab('orders')}
                                    className="h-7 text-xs font-semibold gap-1.5"
                                >
                                    <HeartPulse className="h-3 w-3" /> Vitals & Orders
                                    {(result.prescriptions?.length || result.labs?.length || Object.keys(result.vitals || {}).length) ? (
                                        <Badge variant="secondary" className="ml-1 text-[9px] px-1 py-0 h-4">
                                            {(result.prescriptions?.length || 0) + (result.labs?.length || 0)}
                                        </Badge>
                                    ) : null}
                                </Button>
                                <Button
                                    size="sm"
                                    variant={activeTab === 'transcript' ? 'default' : 'ghost'}
                                    onClick={() => setActiveTab('transcript')}
                                    className="h-7 text-xs font-semibold gap-1.5"
                                >
                                    <FileText className="h-3 w-3" /> Verbatim Dialogue
                                </Button>
                            </div>

                            {/* One-click Apply */}
                            {onApplySoap && (
                                <Button
                                    size="sm"
                                    onClick={handleApplyAll}
                                    className="h-7 text-xs font-bold gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm"
                                >
                                    <Check className="h-3.5 w-3.5" /> Approve & Apply to Chart
                                </Button>
                            )}
                        </div>

                        {/* TAB 1: STRUCTURED SOAP */}
                        {activeTab === 'soap' && (
                            <div className="space-y-3">
                                {result.chiefComplaint && (
                                    <div className="p-2.5 rounded-lg bg-primary/5 border border-primary/20 text-xs">
                                        <span className="font-bold uppercase tracking-wider text-primary mr-2">Chief Complaint:</span>
                                        <span className="text-foreground font-medium">{result.chiefComplaint}</span>
                                    </div>
                                )}

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 text-xs">
                                    {FIELD_CONFIG.map(({ key, label, hint, letter }) => {
                                        const text = (result[key] || '').trim();
                                        return (
                                            <div key={key} className="p-3 rounded-xl border bg-muted/20 hover:bg-muted/30 transition-colors space-y-1.5">
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-1.5">
                                                        <span className="h-5 w-5 rounded-md bg-primary/10 text-primary font-bold text-[11px] flex items-center justify-center">
                                                            {letter}
                                                        </span>
                                                        <p className="font-bold text-foreground text-xs uppercase tracking-wider">
                                                            {label}
                                                        </p>
                                                    </div>
                                                    {onAppendText && text && (
                                                        <Button
                                                            size="sm"
                                                            variant="ghost"
                                                            className="h-5 px-1.5 text-[10px] text-muted-foreground hover:text-primary"
                                                            onClick={() => onAppendText(key, text)}
                                                        >
                                                            Append to field
                                                        </Button>
                                                    )}
                                                </div>
                                                <p className="text-[10px] text-muted-foreground/70 uppercase font-mono">{hint}</p>
                                                {text ? (
                                                    <p className="text-muted-foreground leading-relaxed whitespace-pre-wrap">{text}</p>
                                                ) : (
                                                    <p className="text-muted-foreground/40 italic">Nothing was explicitly stated for this section.</p>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {/* TAB 2: VITALS & ORDERS */}
                        {activeTab === 'orders' && (
                            <div className="space-y-3 text-xs">
                                {/* Spoken Vitals */}
                                <div className="p-3 rounded-xl border bg-muted/20 space-y-2">
                                    <div className="flex items-center justify-between">
                                        <p className="font-bold uppercase tracking-wider text-foreground flex items-center gap-1.5">
                                            <HeartPulse className="h-4 w-4 text-primary" /> Spoken Baseline Vitals
                                        </p>
                                        {onApplyVitals && result.vitals && Object.keys(result.vitals).length > 0 && (
                                            <Button
                                                size="sm"
                                                variant="ghost"
                                                className="h-5 px-2 text-[10px] text-primary"
                                                onClick={() => onApplyVitals(result.vitals!)}
                                            >
                                                Apply Vitals
                                            </Button>
                                        )}
                                    </div>
                                    {result.vitals && (result.vitals.bpSys || result.vitals.pulse || result.vitals.temp || result.vitals.spo2 || result.vitals.weight) ? (
                                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                                            {result.vitals.bpSys && (
                                                <div className="p-2 rounded-lg bg-background border text-center">
                                                    <p className="text-[10px] text-muted-foreground uppercase font-bold">Blood Pressure</p>
                                                    <p className="text-sm font-black text-foreground">{result.vitals.bpSys}/{result.vitals.bpDia || '?'}</p>
                                                </div>
                                            )}
                                            {result.vitals.pulse && (
                                                <div className="p-2 rounded-lg bg-background border text-center">
                                                    <p className="text-[10px] text-muted-foreground uppercase font-bold">Pulse / HR</p>
                                                    <p className="text-sm font-black text-foreground">{result.vitals.pulse} bpm</p>
                                                </div>
                                            )}
                                            {result.vitals.temp && (
                                                <div className="p-2 rounded-lg bg-background border text-center">
                                                    <p className="text-[10px] text-muted-foreground uppercase font-bold">Temperature</p>
                                                    <p className="text-sm font-black text-foreground">{result.vitals.temp} °C</p>
                                                </div>
                                            )}
                                            {result.vitals.spo2 && (
                                                <div className="p-2 rounded-lg bg-background border text-center">
                                                    <p className="text-[10px] text-muted-foreground uppercase font-bold">SpO2</p>
                                                    <p className="text-sm font-black text-foreground">{result.vitals.spo2} %</p>
                                                </div>
                                            )}
                                        </div>
                                    ) : (
                                        <p className="text-muted-foreground/60 italic">No specific vital sign values were stated during this consultation.</p>
                                    )}
                                </div>

                                {/* Prescriptions */}
                                <div className="p-3 rounded-xl border bg-muted/20 space-y-2">
                                    <p className="font-bold uppercase tracking-wider text-foreground flex items-center gap-1.5">
                                        <Pill className="h-4 w-4 text-primary" /> Spoken Medications & Prescriptions
                                    </p>
                                    {result.prescriptions?.length ? (
                                        <ul className="space-y-1.5 pl-1">
                                            {result.prescriptions.map((rx, idx) => (
                                                <li key={idx} className="flex items-start gap-2 text-foreground">
                                                    <CheckCircle2 className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" />
                                                    <span className="font-medium">{rx}</span>
                                                </li>
                                            ))}
                                        </ul>
                                    ) : (
                                        <p className="text-muted-foreground/60 italic">No medications were prescribed in this consultation.</p>
                                    )}
                                </div>

                                {/* Labs & Investigations */}
                                <div className="p-3 rounded-xl border bg-muted/20 space-y-2">
                                    <p className="font-bold uppercase tracking-wider text-foreground flex items-center gap-1.5">
                                        <FlaskConical className="h-4 w-4 text-primary" /> Investigations & Diagnostic Orders
                                    </p>
                                    {result.labs?.length ? (
                                        <ul className="space-y-1.5 pl-1">
                                            {result.labs.map((lab, idx) => (
                                                <li key={idx} className="flex items-start gap-2 text-foreground">
                                                    <ChevronRight className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" />
                                                    <span className="font-medium">{lab}</span>
                                                </li>
                                            ))}
                                        </ul>
                                    ) : (
                                        <p className="text-muted-foreground/60 italic">No laboratory or imaging orders were voiced.</p>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* TAB 3: VERBATIM AUDIT TRANSCRIPT */}
                        {activeTab === 'transcript' && (
                            <div className="space-y-2">
                                <div className="flex items-center justify-between text-xs">
                                    <span className="text-muted-foreground flex items-center gap-1">
                                        <FileText className="h-3.5 w-3.5" /> Verbatim conversation record for clinician audit:
                                    </span>
                                    <Button size="sm" variant="ghost" onClick={handleCopyTranscript} className="h-6 text-[11px] gap-1">
                                        {copied ? <Check className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3" />}
                                        {copied ? 'Copied' : 'Copy Transcript'}
                                    </Button>
                                </div>
                                <div className="p-3.5 rounded-xl border border-dashed bg-muted/20 text-xs font-mono text-muted-foreground leading-relaxed max-h-60 overflow-y-auto whitespace-pre-wrap">
                                    {result.verbatimTranscript || 'No speech was recorded.'}
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </CardContent>

            <CardFooter className="bg-muted/10 border-t border-border/50 py-2.5 px-4 flex items-center justify-between text-[11px] text-muted-foreground">
                <span className="flex items-center gap-1.5">
                    <Activity className="h-3.5 w-3.5 text-primary" />
                    Groq Whisper + Qwen Scribe · Physician oversight required before final signing
                </span>
                {result && onApplySoap && (
                    <Button
                        size="sm"
                        onClick={handleApplyAll}
                        className="h-7 text-xs font-bold gap-1.5 bg-primary hover:bg-primary/90 text-primary-foreground"
                    >
                        <Check className="h-3.5 w-3.5" /> Apply Note & Orders
                    </Button>
                )}
            </CardFooter>
        </Card>
    );
}

/**
 * Single-field push-to-talk dictation button.
 * Uses Groq Whisper directly for fast field transcription.
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
                    toast({ variant: 'destructive', title: 'Dictation failed', description: outcome.error });
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
                        : 'Dictate into this field (Groq)'
            }
        >
            {processing ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : recording ? (
                <Square className="h-3.5 w-3.5 text-white" />
            ) : (
                <Mic className="h-3.5 w-3.5 text-muted-foreground hover:text-primary" />
            )}
            <span className="sr-only">
                {recording ? 'Stop dictating' : 'Dictate into this field'}
            </span>
        </Button>
    );
}
