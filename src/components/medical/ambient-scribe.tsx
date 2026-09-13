"use client";

import React, { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Mic, Square, CheckCircle, Bot, Activity, Waves } from "lucide-react";
import { cn } from "@/lib/utils";

interface AmbientScribeProps {
  onAppendSummary: (summary: string) => void;
}

export function AmbientScribe({ onAppendSummary }: AmbientScribeProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [timer, setTimer] = useState(0);
  const [summary, setSummary] = useState<string | null>(null);

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (isRecording) {
      timerRef.current = setInterval(() => {
        setTimer((prev) => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isRecording]);

  const handleStartRecording = () => {
    setIsRecording(true);
    setTimer(0);
    setSummary(null);
  };

  const handleStopRecording = () => {
    setIsRecording(false);
    setIsProcessing(true);

    // Simulate AI processing time
    setTimeout(() => {
      setIsProcessing(false);
      setSummary(`Subjective:
Patient reports mild chest pain starting 2 days ago, described as sharp and localized. Pain worsens on deep inspiration.

Objective:
Vitals stable. BP 120/80, HR 75 bpm. Lungs clear to auscultation bilaterally.

Assessment:
Likely musculoskeletal chest pain or mild costochondritis. Unlikely cardiac etiology given normal vitals and characteristics.

Plan:
- Advised rest and NSAIDs for pain relief.
- Follow-up if symptoms worsen or persist beyond 1 week.
- Proceed with routine ECG as precaution.`);
    }, 2500);
  };

  const handleAppend = () => {
    if (summary) {
      onAppendSummary(summary);
      setSummary(null);
      setTimer(0);
    }
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, "0");
    const s = (seconds % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };

  return (
    <Card className="border-primary/20 bg-card overflow-hidden relative shadow-sm">
      {/* Decorative gradient when recording */}
      <div 
        className={cn(
          "absolute inset-0 bg-gradient-to-r from-emerald-500/0 via-emerald-500/5 to-emerald-500/0 transition-opacity duration-1000 pointer-events-none",
          isRecording ? "opacity-100" : "opacity-0"
        )} 
      />

      <CardHeader className="pb-3 border-b border-dashed">
        <CardTitle className="text-xs uppercase tracking-widest text-emerald-600 flex items-center gap-2 font-bold">
          <Bot className="h-4 w-4" />
          AI Ambient Scribe
        </CardTitle>
        <CardDescription className="text-xs">
          Passively records consultation audio and generates a structured clinical note.
        </CardDescription>
      </CardHeader>
      
      <CardContent className="pt-6">
        <div className="flex flex-col items-center justify-center gap-6 min-h-[120px]">
          {/* Default state */}
          {!isRecording && !isProcessing && !summary && (
            <div className="text-center space-y-4">
              <Button 
                onClick={handleStartRecording} 
                className="h-16 w-16 rounded-full bg-emerald-100 hover:bg-emerald-200 text-emerald-600 shadow-sm"
              >
                <Mic className="h-8 w-8" />
              </Button>
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Start Listening</p>
            </div>
          )}

          {/* Recording state with wavy animation */}
          {isRecording && (
            <div className="text-center space-y-6 w-full">
              <div className="flex items-center justify-center h-16 w-full gap-1">
                {/* Simulated audio waveform */}
                {[...Array(15)].map((_, i) => (
                  <div
                    key={i}
                    className="w-1.5 bg-emerald-500 rounded-full animate-wave"
                    style={{
                      height: `${Math.max(10, Math.random() * 40 + 10)}px`,
                      animationDelay: `${i * 0.1}s`,
                      animationDuration: '0.8s'
                    }}
                  />
                ))}
              </div>
              
              <div className="flex items-center justify-center gap-4">
                <div className="text-2xl font-mono font-bold text-emerald-600 w-20 text-center animate-pulse">
                  {formatTime(timer)}
                </div>
                <Button 
                  onClick={handleStopRecording} 
                  variant="destructive" 
                  className="h-12 w-12 rounded-full shadow-sm animate-pulse shadow-red-500/20"
                >
                  <Square className="h-5 w-5 fill-current" />
                </Button>
              </div>
            </div>
          )}

          {/* Processing state */}
          {isProcessing && (
            <div className="text-center space-y-4 w-full flex flex-col items-center">
              <Activity className="h-10 w-10 text-emerald-500 animate-spin" />
              <p className="text-sm font-semibold text-emerald-600 animate-pulse">Transcribing & Synthesizing SOAP Note...</p>
            </div>
          )}

          {/* Summary generated state */}
          {summary && (
            <div className="w-full space-y-4 animate-in fade-in zoom-in duration-300">
              <div className="bg-muted/30 border rounded-md p-4 text-xs font-mono whitespace-pre-wrap text-foreground relative">
                <CheckCircle className="absolute top-4 right-4 h-5 w-5 text-emerald-500" />
                {summary}
              </div>
              <div className="flex items-center gap-3 w-full">
                <Button variant="outline" className="flex-1 text-xs" onClick={() => setSummary(null)}>Discard</Button>
                <Button className="flex-1 text-xs bg-emerald-600 hover:bg-emerald-700" onClick={handleAppend}>
                  Append to Encounter Log
                </Button>
              </div>
            </div>
          )}
        </div>
      </CardContent>

      <style jsx>{`
        @keyframes wave {
          0%, 100% { height: 10px; }
          50% { height: 50px; }
        }
        .animate-wave {
          animation: wave ease-in-out infinite alternate;
        }
      `}</style>
    </Card>
  );
}
