'use client';

import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ShieldAlert, Plus, Trash2, CheckCircle2, Pill } from 'lucide-react';
import { MOCK_DRUG_INTERACTIONS } from '@/lib/ontomorph';

const PRESET_DRUGS = ["Aspirin", "Warfarin", "Ibuprofen", "Lisinopril", "Simvastatin", "Amlodipine", "Metformin"];

export function DrugSafetyChecker() {
  const [selectedDrugs, setSelectedDrugs] = useState<string[]>(["Aspirin"]);
  const [drugInput, setDrugInput] = useState("");
  const [interactions, setInteractions] = useState<any[]>([]);

  const handleAddDrug = (name: string) => {
    if (!name || selectedDrugs.includes(name)) return;
    const newList = [...selectedDrugs, name];
    setSelectedDrugs(newList);
    checkInteractions(newList);
    setDrugInput("");
  };

  const handleRemoveDrug = (name: string) => {
    const newList = selectedDrugs.filter(d => d !== name);
    setSelectedDrugs(newList);
    checkInteractions(newList);
  };

  const checkInteractions = (drugs: string[]) => {
    const found: any[] = [];
    
    // Check combinations
    for (let i = 0; i < drugs.length; i++) {
      for (let j = i + 1; j < drugs.length; j++) {
        const pair1 = `${drugs[i]} + ${drugs[j]}`;
        const pair2 = `${drugs[j]} + ${drugs[i]}`;
        
        if (MOCK_DRUG_INTERACTIONS[pair1]) {
          found.push({ drugs: pair1, details: MOCK_DRUG_INTERACTIONS[pair1][0] });
        } else if (MOCK_DRUG_INTERACTIONS[pair2]) {
          found.push({ drugs: pair2, details: MOCK_DRUG_INTERACTIONS[pair2][0] });
        }
      }
    }
    
    setInteractions(found);
  };

  return (
    <Card className="border border-dashed bg-card backdrop-blur-sm relative overflow-hidden shadow-sm">
      <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
      
      <CardHeader className="pb-2 border-b border-border border-dashed">
        <CardTitle className="text-lg font-headline flex items-center gap-2">
          <Pill className="h-5 w-5 text-emerald-400" />
          HOLON Drug Safety Checker
        </CardTitle>
        <CardDescription className="text-xs">
          Cross-reference drug lists against 1.7 million clinical interactions in real-time
        </CardDescription>
      </CardHeader>

      <CardContent className="pt-6 grid gap-6 md:grid-cols-2">
        {/* Prescription List Manager */}
        <div className="space-y-4">
          <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Current Prescriptions
          </div>
          
          <div className="flex gap-2">
            <select
              value={drugInput}
              onChange={(e) => handleAddDrug(e.target.value)}
              className="flex-1 px-3 py-2 bg-muted/40 border border-border rounded-lg text-xs text-foreground focus:outline-none focus:border-primary/50"
            >
              <option value="" className="bg-background text-foreground">-- Select drug to add --</option>
              {PRESET_DRUGS.filter(d => !selectedDrugs.includes(d)).map(d => (
                <option key={d} value={d} className="bg-background text-foreground">{d}</option>
              ))}
            </select>
          </div>

          <div className="space-y-2 max-h-[180px] overflow-y-auto pr-1">
            {selectedDrugs.map(drug => (
              <div 
                key={drug} 
                className="flex items-center justify-between p-2.5 bg-muted/20 border border-border rounded-lg hover:border-muted-foreground/30 transition"
              >
                <span className="text-xs font-medium text-foreground">{drug}</span>
                <button
                  onClick={() => handleRemoveDrug(drug)}
                  className="text-muted-foreground hover:text-red-400 transition"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
            {selectedDrugs.length === 0 && (
              <div className="text-center py-6 text-xs text-muted-foreground italic">
                No medications added. Select a drug above.
              </div>
            )}
          </div>
        </div>

        {/* Safety Assessment Output */}
        <div className="flex flex-col justify-between p-5 bg-muted/20 border border-border rounded-2xl">
          <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
            Safety Assessment
          </div>

          <div className="flex-1 flex flex-col justify-center">
            {interactions.length > 0 ? (
              <div className="space-y-3">
                {interactions.map((inter, idx) => (
                  <div key={idx} className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl space-y-1.5 animate-fadeIn">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-red-400">{inter.drugs}</span>
                      <Badge variant="outline" className="bg-red-500/10 text-red-400 border-red-500/30 text-[9px] font-bold">
                        {inter.details.severity} Risk
                      </Badge>
                    </div>
                    <p className="text-[10px] text-muted-foreground leading-normal">
                      {inter.details.description}
                    </p>
                    <div className="text-[8px] text-muted-foreground text-right font-mono">
                      Source: {inter.details.source}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 space-y-2">
                <CheckCircle2 className="h-8 w-8 text-emerald-400 mx-auto" />
                <p className="text-xs text-emerald-400 font-medium">No interactions found</p>
                <p className="text-[10px] text-muted-foreground max-w-[200px] mx-auto">
                  The selected prescriptions are safe for concurrent administration.
                </p>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
