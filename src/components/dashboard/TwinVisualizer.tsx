'use client';

import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Activity, ShieldAlert, Heart, Zap, RefreshCw, Layers } from 'lucide-react';
const MOCK_TWIN_SYSTEMS = {
  cardiovascular: {
    status: "normal",
    signals: [
      { code: "HR", name: "Heart Rate", value: "72", unit: "bpm", timestamp: new Date().toISOString() },
      { code: "BP_SYS", name: "Systolic BP", value: "118", unit: "mmHg", timestamp: new Date().toISOString() },
      { code: "BP_DIA", name: "Diastolic BP", value: "76", unit: "mmHg", timestamp: new Date().toISOString() },
      { code: "LDL", name: "LDL Cholesterol", value: "115", unit: "mg/dL", timestamp: new Date().toISOString() },
      { code: "HDL", name: "HDL Cholesterol", value: "48", unit: "mg/dL", timestamp: new Date().toISOString() },
    ]
  },
  metabolic: {
    status: "warning",
    signals: [
      { code: "GLU", name: "Fasting Glucose", value: "105", unit: "mg/dL", timestamp: new Date().toISOString() },
      { code: "A1C", name: "HbA1c", value: "5.8", unit: "%", timestamp: new Date().toISOString() },
      { code: "BMI", name: "Body Mass Index", value: "26.4", unit: "kg/m²", timestamp: new Date().toISOString() },
    ]
  },
  respiratory: {
    status: "normal",
    signals: [
      { code: "SPO2", name: "Oxygen Saturation", value: "98", unit: "%", timestamp: new Date().toISOString() },
      { code: "RR", name: "Respiratory Rate", value: "14", unit: "pm", timestamp: new Date().toISOString() },
    ]
  }
};

export function TwinVisualizer({ patientId }: { patientId?: string }) {
  const [selectedSystem, setSelectedSystem] = useState<'cardiovascular' | 'metabolic' | 'respiratory'>('cardiovascular');
  const [isPlaying, setIsPlaying] = useState(true);
  const [telemetry, setTelemetry] = useState(MOCK_TWIN_SYSTEMS);
  const [logs, setLogs] = useState<string[]>(["Digital Twin connection established."]);
  const [isSimulating, setIsSimulating] = useState(false);
  const [simResult, setSimResult] = useState<any>(null);

  // Real-time signal stream simulator
  useEffect(() => {
    if (!isPlaying) return;

    const interval = setInterval(() => {
      setTelemetry((prev) => {
        const next = JSON.parse(JSON.stringify(prev));
        
        // Randomly fluctuate heart rate
        if (selectedSystem === 'cardiovascular') {
          const hrIndex = next.cardiovascular.signals.findIndex((s: any) => s.code === "HR");
          const currentHr = parseInt(next.cardiovascular.signals[hrIndex].value);
          const change = Math.floor(Math.random() * 5) - 2; // -2 to +2
          const newHr = Math.max(60, Math.min(100, currentHr + change));
          next.cardiovascular.signals[hrIndex].value = newHr.toString();
          
          if (newHr > 85) {
            setLogs(l => [`[Warning] Heart Rate elevated to ${newHr} bpm`, ...l.slice(0, 4)]);
          }
        }

        // Randomly fluctuate oxygen levels
        if (selectedSystem === 'respiratory') {
          const spo2Index = next.respiratory.signals.findIndex((s: any) => s.code === "SPO2");
          const currentSp = parseInt(next.respiratory.signals[spo2Index].value);
          const change = Math.random() > 0.8 ? (Math.random() > 0.5 ? 1 : -1) : 0;
          const newSp = Math.max(95, Math.min(100, currentSp + change));
          next.respiratory.signals[spo2Index].value = newSp.toString();
        }

        return next;
      });
    }, 1500);

    return () => clearInterval(interval);
  }, [isPlaying, selectedSystem]);

  const handleRunTrajectorySimulation = async () => {
    setIsSimulating(true);
    setLogs(l => ["[Ontomorph API] Initializing trajectory simulation...", ...l.slice(0, 4)]);
    
    try {
      if (false) {
        
      } else {
        // Fallback sandbox simulation with delay
        await new Promise(resolve => setTimeout(resolve, 1500));
        setLogs(l => ["[Sandbox API] Running trajectory model on mock twin telemetry...", ...l.slice(0, 4)]);
        setSimResult({
          scalarOutputs: {
            "Baseline LDL": `${telemetry.cardiovascular.signals.find(s => s.code === "LDL")?.value || 115} mg/dL`,
            "10-Year ASCVD Risk": "5.4%",
            "Projected Risk Change": "-1.8%",
            "Target LDL": "70 mg/dL"
          },
          disclaimer: "Sandbox prediction. Not for actual clinical diagnostics.",
          narration: "Lowering LDL cholesterol level below 70 mg/dL yields a projected 1.8% reduction in overall 10-year cardivascular events for this subject."
        });
        setLogs(l => ["[Sandbox API] Trajectory simulation completed successfully.", ...l.slice(0, 4)]);
      }
    } catch (err: any) {
      console.error(err);
      setLogs(l => [`[Error] API Simulation failed: ${err.message || 'Server Timeout'}`, ...l.slice(0, 4)]);
    } finally {
      setIsSimulating(false);
    }
  };

  const currentSystemData = telemetry[selectedSystem];

  return (
    <Card className="border border-dashed bg-card backdrop-blur-sm relative overflow-hidden shadow-sm">
      <div className="absolute top-0 right-0 w-48 h-48 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
      <CardHeader className="flex flex-row items-center justify-between pb-2 border-b border-border border-dashed">
        <div>
          <CardTitle className="text-lg font-headline flex items-center gap-2">
            <Activity className="h-5 w-5 text-primary animate-pulse" />
            Digital Twin Telemetry
          </CardTitle>
          <CardDescription className="text-xs">
            Live health state monitoring & system streams
          </CardDescription>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={isPlaying ? "default" : "secondary"} className="text-[10px] uppercase font-bold tracking-wider">
            {isPlaying ? "Live Stream" : "Paused"}
          </Badge>
          <button 
            onClick={() => setIsPlaying(!isPlaying)}
            className="p-1 rounded bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground transition"
            title="Toggle simulation stream"
          >
            <RefreshCw className={`h-4 w-4 ${isPlaying ? 'animate-spin' : ''}`} style={{ animationDuration: '4s' }} />
          </button>
        </div>
      </CardHeader>
      
      <CardContent className="pt-6 grid gap-6 md:grid-cols-12">
        {/* Human Silhouette Visualization Box */}
        <div className="md:col-span-4 flex flex-col items-center justify-center p-4 bg-muted/20 border border-border rounded-xl relative min-h-[220px]">
          <div className="absolute top-2 left-2 text-[10px] text-muted-foreground uppercase font-mono tracking-widest">
            3D Anatomy Map
          </div>
          {/* Stylized geometric organ map */}
          <div className="relative w-24 h-40 flex items-center justify-center border border-dashed border-muted-foreground/30 rounded-3xl">
            {/* Pulsing heart area */}
            <div className={`absolute top-10 w-4 h-4 bg-red-500/30 rounded-full flex items-center justify-center ${selectedSystem === 'cardiovascular' ? 'scale-125' : ''}`}>
              <Heart className={`h-2.5 w-2.5 text-red-500 ${selectedSystem === 'cardiovascular' ? 'animate-ping' : ''}`} />
            </div>
            {/* Metabolic/Core area */}
            <div className={`absolute top-20 w-6 h-6 bg-orange-500/20 rounded-full flex items-center justify-center ${selectedSystem === 'metabolic' ? 'ring-1 ring-orange-400' : ''}`}>
              <Zap className="h-3 w-3 text-orange-400" />
            </div>
            {/* Respiratory/Lung area */}
            <div className={`absolute top-12 w-10 h-3 bg-blue-500/10 rounded-full flex justify-between px-1 ${selectedSystem === 'respiratory' ? 'bg-blue-500/30' : ''}`}>
              <span className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-pulse" />
              <span className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-pulse" />
            </div>
            <span className="text-[10px] text-muted-foreground/50 absolute bottom-2 font-mono">Twin-01</span>
          </div>
        </div>

        {/* System Details and Metrics */}
        <div className="md:col-span-8 flex flex-col justify-between gap-4">
          <div className="flex gap-2 border-b border-border pb-3">
            {(['cardiovascular', 'metabolic', 'respiratory'] as const).map((sys) => (
              <button
                key={sys}
                onClick={() => setSelectedSystem(sys)}
                className={`px-3 py-1.5 rounded-lg text-xs capitalize transition font-medium ${
                  selectedSystem === sys 
                    ? 'bg-primary text-primary-foreground font-semibold shadow-sm' 
                    : 'bg-muted text-muted-foreground hover:bg-muted/80'
                }`}
              >
                {sys}
              </button>
            ))}
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {currentSystemData.signals.map((sig: any) => (
              <div 
                key={sig.code}
                className="p-3 bg-muted/20 border border-border rounded-xl flex flex-col justify-between hover:border-primary/30 transition-all duration-300"
              >
                <div className="flex justify-between items-center text-muted-foreground text-[10px] uppercase font-mono tracking-wider">
                  <span>{sig.name}</span>
                  <span className="text-primary font-bold">{sig.code}</span>
                </div>
                <div className="mt-2 flex items-baseline gap-1">
                  <span className="text-2xl font-bold font-mono text-foreground tracking-tight">{sig.value}</span>
                  <span className="text-xs text-muted-foreground uppercase">{sig.unit}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Trajectory Simulation Panel */}
          {selectedSystem === 'cardiovascular' && (
            <div className="p-3.5 rounded-xl border border-dashed border-primary/30 bg-primary/5 flex flex-col gap-2.5">
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold text-foreground">Trajectory model</span>
                <Button 
                  size="sm" 
                  className="h-7 text-[10px] uppercase tracking-wider font-bold" 
                  onClick={handleRunTrajectorySimulation}
                  disabled={isSimulating}
                >
                  {isSimulating ? <RefreshCw className="mr-1 h-3 w-3 animate-spin" /> : null}
                  {isSimulating ? "Simulating..." : "Run Trajectory Model"}
                </Button>
              </div>

              {simResult ? (
                <div className="space-y-2 mt-1 animate-fadeIn">
                  <div className="grid grid-cols-2 gap-2 text-[10px] font-mono">
                    {Object.entries(simResult.scalarOutputs).map(([key, val]: any) => (
                      <div key={key} className="bg-background/80 p-1.5 rounded border border-border flex justify-between">
                        <span className="text-muted-foreground">{key}:</span>
                        <span className="font-bold text-primary">{val}</span>
                      </div>
                    ))}
                  </div>
                  <p className="text-[10px] text-muted-foreground leading-normal bg-muted/40 p-2 rounded italic">
                    {simResult.narration}
                  </p>
                </div>
              ) : (
                <p className="text-[10px] text-muted-foreground leading-normal italic">
                  Run a what-if ASCVD cardiovascular risk trajectory simulation against the digital twin.
                </p>
              )}
            </div>
          )}

          {/* Real-time Telemetry Event Log */}
          <div className="bg-muted/40 rounded-xl p-3 border border-border">
            <div className="flex items-center gap-1.5 mb-1.5">
              <Layers className="h-3 w-3 text-primary" />
              <span className="text-[10px] font-mono uppercase text-muted-foreground tracking-wider">Event Console</span>
            </div>
            <div className="space-y-1 font-mono text-[9px] text-muted-foreground max-h-[50px] overflow-y-auto">
              {logs.map((log, idx) => (
                <div key={idx} className="truncate">
                  <span className="text-primary">&gt;</span> {log}
                </div>
              ))}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
