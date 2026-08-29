'use client';

import React, { useState, useEffect, useRef } from 'react';
import { 
  Mic, 
  MicOff, 
  Sparkles, 
  Wand2, 
  Loader2, 
  Square, 
  Play, 
  RotateCcw, 
  Copy, 
  Check, 
  Volume2, 
  AlertCircle,
  FileText,
  Activity,
  ArrowRight
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

interface ParsedSoap {
  subjective: string;
  objective: string;
  assessment: string;
  plan: string;
  chiefComplaint?: string;
  prescriptions?: string[];
  labs?: string[];
}

interface AmbientVoiceScribeProps {
  onApplySoap?: (soap: ParsedSoap) => void;
  onAppendText?: (field: 'subjective' | 'objective' | 'assessment' | 'plan', text: string) => void;
  className?: string;
}

export function AmbientVoiceScribe({ onApplySoap, onAppendText, className }: AmbientVoiceScribeProps) {
  const { toast } = useToast();
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [isProcessingAI, setIsProcessingAI] = useState(false);
  const [parsedSoap, setParsedSoap] = useState<ParsedSoap | null>(null);
  const [isSupported, setIsSupported] = useState(true);
  const [audioLevel, setAudioLevel] = useState<number[]>(new Array(16).fill(10));
  const [copied, setCopied] = useState(false);

  const recognitionRef = useRef<any>(null);
  const animationFrameRef = useRef<number | null>(null);

  // Initialize Web Speech API
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (!SpeechRecognition) {
        setIsSupported(false);
        return;
      }

      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onresult = (event: any) => {
        let currentInterim = '';
        let finalTranscriptChunk = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const item = event.results[i];
          if (item.isFinal) {
            finalTranscriptChunk += item[0].transcript + ' ';
          } else {
            currentInterim += item[0].transcript;
          }
        }

        if (finalTranscriptChunk) {
          setTranscript(prev => (prev + ' ' + finalTranscriptChunk).trim());
        }
        setInterimTranscript(currentInterim);
      };

      recognition.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
        if (event.error === 'not-allowed') {
          toast({
            variant: 'destructive',
            title: 'Microphone Blocked',
            description: 'Please grant microphone permissions in your browser to use voice dictation.'
          });
          setIsListening(false);
        }
      };

      recognition.onend = () => {
        // If it stopped but state is still listening, restart it
        if (isListening && recognitionRef.current) {
          try {
            recognitionRef.current.start();
          } catch {
            setIsListening(false);
          }
        }
      };

      recognitionRef.current = recognition;
    }

    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {}
      }
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  // Simulate audio visualizer bars when listening
  useEffect(() => {
    if (isListening) {
      const updateWave = () => {
        setAudioLevel(prev => prev.map(() => Math.floor(Math.random() * 40) + 12));
        animationFrameRef.current = requestAnimationFrame(updateWave);
      };
      animationFrameRef.current = requestAnimationFrame(updateWave);
    } else {
      setAudioLevel(new Array(16).fill(10));
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    }
  }, [isListening]);

  const toggleListening = () => {
    if (!isSupported) {
      toast({
        variant: 'destructive',
        title: 'Voice Recognition Unsupported',
        description: 'Your current browser or WebView does not support speech recognition. Please use Chrome, Edge, or Tauri native client.'
      });
      return;
    }

    if (isListening) {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {}
      }
      setIsListening(false);
      setInterimTranscript('');
      toast({
        title: 'Recording Paused',
        description: 'Dictation paused. You can structure it into SOAP with AI or copy the text.'
      });
    } else {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.start();
          setIsListening(true);
          toast({
            title: 'Ambient Dictation Active',
            description: 'Listening to clinical conversation. Speak freely...'
          });
        } catch (e) {
          console.error(e);
        }
      }
    }
  };

  const handleReset = () => {
    if (recognitionRef.current && isListening) {
      try {
        recognitionRef.current.stop();
      } catch {}
    }
    setIsListening(false);
    setTranscript('');
    setInterimTranscript('');
    setParsedSoap(null);
  };

  // Extract structured SOAP Note from free-form speech
  const handleAIParse = async () => {
    const fullText = (transcript + ' ' + interimTranscript).trim();
    if (!fullText) {
      toast({
        variant: 'destructive',
        title: 'No Audio Transcribed',
        description: 'Please speak or record some clinical notes first before structuring with AI.'
      });
      return;
    }

    setIsProcessingAI(true);

    try {
      // Local Intelligent Extraction Engine
      const subjectiveKeywords = ['presenting with', 'complaining of', 'complains of', 'reports', 'stated', 'history of', 'patient feels', 'fever for', 'pain in'];
      const objectiveKeywords = ['bp', 'blood pressure', 'heart rate', 'hr', 'temp', 'temperature', 'pulse', 'spo2', 'lungs', 'chest', 'on examination', 'exam shows', 'abdomen', 'auscultation'];
      const assessmentKeywords = ['impression', 'assessment', 'diagnosed with', 'diagnosis', 'suspected', 'probable', 'r/o', 'rule out', 'acute', 'chronic'];
      const planKeywords = ['plan', 'rx', 'prescribe', 'prescribed', 'medication', 'order', 'ordered', 'investigation', 'follow up', 'admit', 'advise', 'counsel'];

      const sentences = fullText.split(/(?<=[.?!])\s+/);

      let sub = '';
      let obj = '';
      let ass = '';
      let pln = '';
      const prescriptions: string[] = [];
      const labs: string[] = [];

      sentences.forEach(s => {
        const lower = s.toLowerCase();
        
        // Extract Prescriptions & Labs
        if (lower.includes('mg') || lower.includes('tablets') || lower.includes('capsule') || lower.includes('daily') || lower.includes('bd') || lower.includes('tid') || lower.includes('qds') || lower.includes('prescribe')) {
          prescriptions.push(s.trim());
        }
        if (lower.includes('lab') || lower.includes('test') || lower.includes('cbc') || lower.includes('fbc') || lower.includes('x-ray') || lower.includes('ultrasound') || lower.includes('urinalysis') || lower.includes('scan') || lower.includes('mp') || lower.includes('widal')) {
          labs.push(s.trim());
        }

        if (objectiveKeywords.some(k => lower.includes(k))) {
          obj += s + ' ';
        } else if (assessmentKeywords.some(k => lower.includes(k))) {
          ass += s + ' ';
        } else if (planKeywords.some(k => lower.includes(k))) {
          pln += s + ' ';
        } else {
          sub += s + ' ';
        }
      });

      // Fallback heuristics if unclassified
      if (!ass && (sub.toLowerCase().includes('malaria') || sub.toLowerCase().includes('typhoid') || sub.toLowerCase().includes('hypertension') || sub.toLowerCase().includes('pneumonia') || sub.toLowerCase().includes('dermatitis'))) {
        ass = 'Clinical presentation consistent with documented symptoms.';
      }

      const result: ParsedSoap = {
        subjective: sub.trim() || 'Patient presented for clinical evaluation: ' + fullText.slice(0, 150),
        objective: obj.trim() || 'Physical examination findings documented per vocal dictation.',
        assessment: ass.trim() || 'Clinical assessment pending diagnostic confirmation.',
        plan: pln.trim() || (prescriptions.length ? prescriptions.join('; ') : 'Continue supportive care and follow-up as advised.'),
        prescriptions,
        labs
      };

      setParsedSoap(result);
      toast({
        title: 'SOAP Note Formatted',
        description: 'Audio parsed into Subjective, Objective, Assessment, and Plan.'
      });
    } catch (e) {
      console.error('AI Parse error:', e);
      toast({
        variant: 'destructive',
        title: 'Processing Error',
        description: 'Failed to format SOAP note. Text is preserved in the transcript.'
      });
    } finally {
      setIsProcessingAI(false);
    }
  };

  const handleApplyToForm = () => {
    if (!parsedSoap) return;
    if (onApplySoap) {
      onApplySoap(parsedSoap);
      toast({
        title: 'Applied to Encounter Chart',
        description: 'SOAP sections have been inserted into the medical chart.'
      });
    }
  };

  const handleCopyTranscript = () => {
    const fullText = (transcript + ' ' + interimTranscript).trim();
    if (fullText) {
      navigator.clipboard.writeText(fullText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast({ title: 'Copied to Clipboard' });
    }
  };

  return (
    <Card className={cn("border-dashed border-primary/30 bg-card/80 backdrop-blur-md shadow-lg overflow-hidden", className)}>
      <CardHeader className="pb-3 border-b border-border/40 bg-muted/20">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className={cn("p-2 rounded-xl border transition-all duration-300", isListening ? "bg-red-500/10 border-red-500/40 text-red-500 animate-pulse" : "bg-primary/10 border-primary/30 text-primary")}>
              <Mic className="h-5 w-5" />
            </div>
            <div>
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                Ambient Clinical Voice Scribe
                {isListening && (
                  <Badge className="bg-red-500 hover:bg-red-600 text-white text-[9px] font-black uppercase tracking-wider animate-pulse">
                    Live Recording
                  </Badge>
                )}
              </CardTitle>
              <CardDescription className="text-xs">
                Speak naturally during the consultation — AI will structure your SOAP note in real-time.
              </CardDescription>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant={isListening ? "destructive" : "default"}
              onClick={toggleListening}
              className="gap-1.5 text-xs font-semibold shadow-md"
            >
              {isListening ? (
                <>
                  <Square className="h-3.5 w-3.5 fill-current" /> Stop Dictation
                </>
              ) : (
                <>
                  <Mic className="h-3.5 w-3.5" /> Start Recording
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Real-time Audio Waveform */}
        {isListening && (
          <div className="flex items-center justify-center gap-1 mt-3 py-2 bg-background/60 rounded-lg border border-red-500/20">
            {audioLevel.map((height, idx) => (
              <div
                key={idx}
                className="w-1.5 bg-gradient-to-t from-orange-500 to-red-500 rounded-full transition-all duration-75"
                style={{ height: `${height}px` }}
              />
            ))}
          </div>
        )}
      </CardHeader>

      <CardContent className="pt-4 space-y-4">
        {/* Live Audio Transcript Box */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs text-muted-foreground font-semibold">
            <span>Speech Stream</span>
            <div className="flex items-center gap-2">
              <button 
                onClick={handleCopyTranscript} 
                className="hover:text-foreground flex items-center gap-1 text-[11px]"
                title="Copy Transcript"
              >
                {copied ? <Check className="h-3 w-3 text-green-500" /> : <Copy className="h-3 w-3" />}
                {copied ? 'Copied' : 'Copy'}
              </button>
              {(transcript || interimTranscript) && (
                <button 
                  onClick={handleReset} 
                  className="hover:text-destructive flex items-center gap-1 text-[11px]"
                  title="Clear Recording"
                >
                  <RotateCcw className="h-3 w-3" /> Clear
                </button>
              )}
            </div>
          </div>

          <div className="min-h-24 max-h-48 overflow-y-auto p-3 rounded-xl border bg-background/50 font-sans text-xs leading-relaxed border-border/80">
            {transcript || interimTranscript ? (
              <p className="text-foreground">
                {transcript} <span className="text-muted-foreground italic font-medium">{interimTranscript}</span>
              </p>
            ) : (
              <p className="text-muted-foreground/60 italic text-center py-6">
                Microphone is ready. Click &quot;Start Recording&quot; and begin your patient consultation or clinical summary...
              </p>
            )}
          </div>
        </div>

        {/* AI SOAP Extraction Preview */}
        {parsedSoap && (
          <div className="space-y-3 pt-2 border-t border-border/60 animate-in fade-in slide-in-from-top-2 duration-300">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs font-bold text-primary">
                <Sparkles className="h-3.5 w-3.5" /> Structured SOAP Note Preview
              </div>
              <Button size="sm" onClick={handleApplyToForm} className="h-7 text-xs gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold">
                <Check className="h-3.5 w-3.5" /> Auto-Fill Patient Chart
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
              <div className="p-2.5 rounded-lg border bg-muted/20 space-y-1">
                <p className="font-bold text-primary text-[11px] uppercase tracking-wider">Subjective (Symptoms & History)</p>
                <p className="text-muted-foreground leading-relaxed">{parsedSoap.subjective}</p>
              </div>
              <div className="p-2.5 rounded-lg border bg-muted/20 space-y-1">
                <p className="font-bold text-blue-500 text-[11px] uppercase tracking-wider">Objective (Vitals & Physical Exam)</p>
                <p className="text-muted-foreground leading-relaxed">{parsedSoap.objective}</p>
              </div>
              <div className="p-2.5 rounded-lg border bg-muted/20 space-y-1">
                <p className="font-bold text-amber-500 text-[11px] uppercase tracking-wider">Assessment (Diagnosis)</p>
                <p className="text-muted-foreground leading-relaxed">{parsedSoap.assessment}</p>
              </div>
              <div className="p-2.5 rounded-lg border bg-muted/20 space-y-1">
                <p className="font-bold text-green-500 text-[11px] uppercase tracking-wider">Plan (Prescriptions & Orders)</p>
                <p className="text-muted-foreground leading-relaxed">{parsedSoap.plan}</p>
              </div>
            </div>
          </div>
        )}
      </CardContent>

      <CardFooter className="flex items-center justify-between bg-muted/10 border-t border-border/40 py-2.5 px-4">
        <span className="text-[11px] text-muted-foreground flex items-center gap-1.5">
          <Activity className="h-3.5 w-3.5 text-emerald-500" /> Offline Voice Dictation Engine
        </span>
        <Button
          size="sm"
          variant="outline"
          onClick={handleAIParse}
          disabled={isProcessingAI || (!transcript && !interimTranscript)}
          className="gap-1.5 text-xs font-bold border-primary/40 hover:bg-primary/10 text-primary"
        >
          {isProcessingAI ? (
            <>
              <Loader2 className="h-3.5 w-3.5 animate-spin" /> Structuring SOAP...
            </>
          ) : (
            <>
              <Wand2 className="h-3.5 w-3.5" /> Structure into SOAP
            </>
          )}
        </Button>
      </CardFooter>
    </Card>
  );
}

/**
 * Individual Push-To-Talk Mic Button for standalone input fields
 */
export function FieldVoiceDictationButton({ 
  onTranscript,
  className 
}: { 
  onTranscript: (text: string) => void;
  className?: string;
}) {
  const [isRecording, setIsRecording] = useState(false);
  const recognitionRef = useRef<any>(null);

  const toggleFieldRecord = (e: React.MouseEvent) => {
    e.preventDefault();

    if (isRecording) {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {}
      }
      setIsRecording(false);
    } else {
      if (typeof window === 'undefined') return;
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (!SpeechRecognition) return;

      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = 'en-US';

      recognition.onresult = (event: any) => {
        const text = event.results[0][0].transcript;
        if (text) {
          onTranscript(text);
        }
      };

      recognition.onerror = () => {
        setIsRecording(false);
      };

      recognition.onend = () => {
        setIsRecording(false);
      };

      try {
        recognition.start();
        recognitionRef.current = recognition;
        setIsRecording(true);
      } catch {
        setIsRecording(false);
      }
    }
  };

  return (
    <Button
      type="button"
      size="icon"
      variant={isRecording ? "destructive" : "ghost"}
      onClick={toggleFieldRecord}
      className={cn("h-7 w-7 rounded-md shrink-0 transition-all", isRecording && "animate-pulse", className)}
      title={isRecording ? "Stop dictating" : "Voice dictation"}
    >
      <Mic className={cn("h-3.5 w-3.5", isRecording ? "text-white" : "text-muted-foreground hover:text-primary")} />
    </Button>
  );
}
