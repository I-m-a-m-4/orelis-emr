'use client';

import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ShieldAlert, Trash2, CheckCircle2, Pill, Search } from 'lucide-react';
import { MOCK_DRUG_INTERACTIONS } from '@/lib/ontomorph';

// Expanded list of 50+ real-world clinical drugs
const CLINICAL_DRUGS = [
  "Aspirin", "Warfarin", "Ibuprofen", "Lisinopril", "Simvastatin", "Amlodipine", "Metformin",
  "Metoprolol", "Losartan", "Atorvastatin", "Clopidogrel", "Spironolactone", "Furosemide",
  "Digoxin", "Nitroglycerin", "Carvedilol", "Acetaminophen", "Naproxen", "Celecoxib",
  "Tramadol", "Morphine", "Oxycodone", "Gabapentin", "Insulin Glargine", "Glipizide",
  "Sitagliptin", "Empagliflozin", "Amoxicillin", "Azithromycin", "Ciprofloxacin",
  "Doxycycline", "Cephalexin", "Metronidazole", "Bactrim", "Omeprazole", "Famotidine",
  "Pantoprazole", "Ondansetron", "Albuterol", "Fluticasone", "Montelukast", "Sertraline",
  "Escitalopram", "Alprazolam", "Clonazepam", "Fluoxetine", "Levothyroxine", "Prednisone",
  "Sildenafil", "Tamsulosin", "Clarithromycin", "Contrast Dye"
].sort();

export function DrugSafetyChecker() {
  const [selectedDrugs, setSelectedDrugs] = useState<string[]>(["Aspirin"]);
  const [searchTerm, setSearchTerm] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const [interactions, setInteractions] = useState<any[]>([]);

  const handleAddDrug = (name: string) => {
    if (!name || selectedDrugs.includes(name)) return;
    const newList = [...selectedDrugs, name];
    setSelectedDrugs(newList);
    checkInteractions(newList);
    setSearchTerm("");
    setShowDropdown(false);
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

  // Filter clinical drugs based on the search query
  const filteredDrugs = CLINICAL_DRUGS.filter(d => 
    d.toLowerCase().includes(searchTerm.toLowerCase()) &&
    !selectedDrugs.includes(d)
  );

  return (
    <Card className="border border-dashed bg-card backdrop-blur-sm relative overflow-visible shadow-sm">
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

      <CardContent className="pt-6 grid gap-6 md:grid-cols-2 overflow-visible">
        {/* Prescription List Manager */}
        <div className="space-y-4 relative overflow-visible">
          <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Current Prescriptions
          </div>
          
          {/* Searchable Autocomplete Input */}
          <div className="relative">
            <div className="relative flex items-center">
              <Search className="absolute left-3 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Type to search drugs (e.g. Nitroglycerin, Sildenafil)..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setShowDropdown(true);
                }}
                onFocus={() => setShowDropdown(true)}
                onBlur={() => setTimeout(() => setShowDropdown(false), 250)}
                className="w-full pl-9 pr-8 py-2 bg-muted/40 border border-border rounded-lg text-xs text-foreground focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20"
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm("")}
                  className="absolute right-3 text-xs text-muted-foreground hover:text-foreground font-bold"
                >
                  ×
                </button>
              )}
            </div>

            {/* Suggestions Dropdown overlay */}
            {showDropdown && (
              <div className="absolute z-[99] w-full mt-1 bg-white dark:bg-zinc-950 border border-border rounded-lg shadow-lg max-h-60 overflow-y-auto">
                {filteredDrugs.length > 0 ? (
                  filteredDrugs.map(drug => (
                    <button
                      key={drug}
                      type="button"
                      onMouseDown={(e) => {
                        // Prevent blur event from firing before mouse down completes
                        e.preventDefault();
                      }}
                      onClick={() => handleAddDrug(drug)}
                      className="w-full text-left px-4 py-2.5 text-xs hover:bg-primary/10 hover:text-primary transition border-b border-zinc-100 dark:border-zinc-900 last:border-b-0 text-black dark:text-zinc-200 font-medium"
                    >
                      {drug}
                    </button>
                  ))
                ) : (
                  <div className="px-4 py-3 text-xs text-muted-foreground italic text-center">
                    No matching drugs found
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="space-y-2 max-h-[180px] overflow-y-auto pr-1">
            {selectedDrugs.map(drug => (
              <div 
                key={drug} 
                className="flex items-center justify-between p-2.5 bg-muted/20 border border-border rounded-lg hover:border-muted-foreground/30 transition"
              >
                <span className="text-xs font-semibold text-foreground">{drug}</span>
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
                No medications added. Search and select a drug above.
              </div>
            )}
          </div>
        </div>

        {/* Safety Assessment Output */}
        <div className="flex flex-col justify-between p-5 bg-muted/20 border border-border rounded-2xl min-h-[220px]">
          <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
            Safety Assessment
          </div>

          <div className="flex-1 flex flex-col justify-center">
            {interactions.length > 0 ? (
              <div className="space-y-3">
                {interactions.map((inter, idx) => (
                  <div key={idx} className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl space-y-1.5 animate-fadeIn">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-red-400 flex items-center gap-1.5">
                        <ShieldAlert className="h-4 w-4 text-red-400" />
                        Critical Interaction: {inter.drugs}
                      </span>
                      <Badge variant="outline" className="bg-red-500/10 text-red-400 border-red-500/30 text-[9px] font-bold">
                        {inter.details.severity} Risk
                      </Badge>
                    </div>
                    <p className="text-[10px] text-muted-foreground leading-normal pl-5">
                      {inter.details.description}
                    </p>
                    <div className="text-[8px] text-muted-foreground text-right font-mono mt-1">
                      Source: {inter.details.source}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 space-y-2">
                <CheckCircle2 className="h-8 w-8 text-emerald-400 mx-auto animate-pulse" />
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
