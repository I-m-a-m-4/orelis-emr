'use client';

import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Sparkles, TrendingDown, HelpCircle, Activity } from 'lucide-react';

export function WhatIfCoach() {
  const [systolicBP, setSystolicBP] = useState(128);
  const [ldl, setLdl] = useState(115);
  const [exercise, setExercise] = useState(2); // hours/week
  const [isSmoking, setIsSmoking] = useState(false);

  // Simple cardiovascular risk estimation model (what-if projection)
  const calculateRisk = () => {
    let base = 3.5; // base percentage risk
    
    // BP contribution
    if (systolicBP > 120) {
      base += (systolicBP - 120) * 0.15;
    }
    
    // Cholesterol contribution
    if (ldl > 100) {
      base += (ldl - 100) * 0.08;
    }
    
    // Smoking factor
    if (isSmoking) {
      base += 5.0;
    }
    
    // Exercise mitigation
    base -= exercise * 0.5;
    
    return Math.max(1.2, parseFloat(base.toFixed(1)));
  };

  const risk = calculateRisk();

  const getRiskDetails = (score: number) => {
    if (score < 4) return { label: 'Optimal', color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20', desc: 'Your cardiovascular system is in excellent condition.' };
    if (score < 8) return { label: 'Moderate', color: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20', desc: 'Borderline elevated risk. Small lifestyle changes will help.' };
    return { label: 'High', color: 'bg-red-500/10 text-red-400 border-red-500/20', desc: 'Elevated risk. Clinical guidance and lifestyle intervention recommended.' };
  };

  const details = getRiskDetails(risk);

  return (
    <Card className="border border-dashed bg-card backdrop-blur-sm relative overflow-hidden shadow-sm">
      <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/10 rounded-full blur-3xl pointer-events-none" />
      
      <CardHeader className="pb-2 border-b border-border border-dashed">
        <CardTitle className="text-lg font-headline flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-orange-400" />
          What-If Simulation Coach
        </CardTitle>
        <CardDescription className="text-xs">
          Simulate vitals and lifestyle options to view estimated 10-year risk
        </CardDescription>
      </CardHeader>

      <CardContent className="pt-6 grid gap-6 md:grid-cols-2">
        {/* Sliders and Controls */}
        <div className="space-y-5">
          <div className="space-y-2">
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Systolic Blood Pressure</span>
              <span className="font-mono font-bold text-foreground">{systolicBP} mmHg</span>
            </div>
            <Slider
              value={[systolicBP]}
              onValueChange={(val) => setSystolicBP(val[0])}
              min={90}
              max={180}
              step={1}
              className="py-1"
            />
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">LDL Cholesterol</span>
              <span className="font-mono font-bold text-foreground">{ldl} mg/dL</span>
            </div>
            <Slider
              value={[ldl]}
              onValueChange={(val) => setLdl(val[0])}
              min={50}
              max={220}
              step={1}
              className="py-1"
            />
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Weekly Exercise</span>
              <span className="font-mono font-bold text-foreground">{exercise} hours</span>
            </div>
            <Slider
              value={[exercise]}
              onValueChange={(val) => setExercise(val[0])}
              min={0}
              max={15}
              step={1}
              className="py-1"
            />
          </div>

          <div className="flex items-center justify-between p-3 rounded-lg bg-muted/20 border border-border">
            <span className="text-xs text-muted-foreground">Tobacco Usage</span>
            <button
              onClick={() => setIsSmoking(!isSmoking)}
              className={`px-3 py-1 rounded text-xs transition font-semibold ${
                isSmoking ? 'bg-red-500 text-white' : 'bg-muted text-muted-foreground hover:text-foreground'
              }`}
            >
              {isSmoking ? "Yes (Smoking)" : "No"}
            </button>
          </div>
        </div>

        {/* Prediction Results */}
        <div className="flex flex-col justify-between p-5 bg-muted/20 border border-border rounded-2xl relative">
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase font-mono tracking-wider text-muted-foreground">10-Year ASCVD Risk</span>
            <Badge variant="outline" className={`${details.color} font-bold px-2 py-0.5`}>
              {details.label}
            </Badge>
          </div>

          <div className="my-6 text-center">
            <div className="text-5xl font-mono font-bold text-foreground tracking-tighter">
              {risk}%
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              {details.desc}
            </p>
          </div>

          <div className="pt-3 border-t border-dashed border-border flex items-start gap-2.5">
            <TrendingDown className="h-4 w-4 text-emerald-400 mt-0.5 flex-shrink-0" />
            <div className="text-[11px] text-muted-foreground leading-normal">
              {exercise < 4 ? (
                <span>Adding <strong className="text-foreground">2 more hours</strong> of cardio exercise per week could lower your overall cardiovascular risk by <strong className="text-emerald-400 font-mono">1.0%</strong>.</span>
              ) : ldl > 100 ? (
                <span>Lowering LDL cholesterol to <strong className="text-foreground">99 mg/dL</strong> or below could drop your risk level back into the optimal range.</span>
              ) : (
                <span>Maintain your current active lifestyle to keep your digital twin metrics at peak health.</span>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
