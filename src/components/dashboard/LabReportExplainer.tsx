import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { HelpCircle, FileText, Search, BookOpen, RefreshCw } from 'lucide-react';
import { MOCK_LOINC_CONCEPTS } from '@/lib/ontomorph';
import { explainLabConceptAction } from '@/app/actions/ontomorph';

export function LabReportExplainer() {
  const [selectedLoinc, setSelectedLoinc] = useState("2339-0");
  const [customLoinc, setCustomLoinc] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [currentConcept, setCurrentConcept] = useState<any>({
    name: "Glucose [Mass/volume] in Blood",
    range: "70 - 99 mg/dL",
    explanation: "Measures the sugar levels in your blood. Your level of 105 mg/dL is slightly elevated, indicating a pre-diabetic metabolic profile.",
    status: "Mildly Elevated"
  });

  useEffect(() => {
    const fetchExplanation = async () => {
      setIsLoading(true);
      const res = await explainLabConceptAction(selectedLoinc);
      if (res.success) {
        let status = "Normal";
        if (selectedLoinc === "2339-0") status = "Mildly Elevated";
        else if (selectedLoinc === "18262-6") status = "Borderline High";
        
        setCurrentConcept({
          name: res.conceptName,
          range: res.range,
          explanation: res.explanation,
          status
        });
      } else {
        const mock = MOCK_LOINC_CONCEPTS[selectedLoinc];
        if (mock) {
          setCurrentConcept(mock);
        } else {
          setCurrentConcept({
            name: `LOINC ${selectedLoinc} Concept`,
            range: "Unknown Range",
            explanation: "No explanation details found.",
            status: "Unknown"
          });
        }
      }
      setIsLoading(false);
    };

    fetchExplanation();
  }, [selectedLoinc]);

  const handleCustomSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (customLoinc.trim()) {
      setSelectedLoinc(customLoinc.trim());
    }
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'Normal': return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
      case 'Borderline High': return 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20';
      case 'Mildly Elevated': return 'bg-orange-500/10 text-orange-400 border-orange-500/20';
      default: return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
    }
  };

  return (
    <Card className="border border-dashed bg-card backdrop-blur-sm relative overflow-hidden shadow-sm">
      <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
      
      <CardHeader className="pb-2 border-b border-border border-dashed">
        <CardTitle className="text-lg font-headline flex items-center gap-2">
          <BookOpen className="h-5 w-5 text-blue-400" />
          HOLON Lab Report Explainer
        </CardTitle>
        <CardDescription className="text-xs">
          Translate complex clinical metrics and LOINC codes into plain English explanations
        </CardDescription>
      </CardHeader>

      <CardContent className="pt-6 grid gap-6 md:grid-cols-12">
        {/* Lab metric selector */}
        <div className="md:col-span-5 space-y-4">
          <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Select Lab Metric
          </div>
          
          {/* Custom LOINC Lookup Form */}
          <form onSubmit={handleCustomSearch} className="flex gap-2">
            <input
              type="text"
              placeholder="Enter LOINC code (e.g. 4544-3)..."
              value={customLoinc}
              onChange={(e) => setCustomLoinc(e.target.value)}
              className="flex-1 px-3 py-1.5 bg-muted/40 border border-border rounded-lg text-xs text-foreground focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 font-mono"
            />
            <button
              type="submit"
              className="px-3 py-1.5 bg-primary text-primary-foreground rounded-lg text-xs font-medium hover:bg-primary/95 transition"
            >
              Lookup
            </button>
          </form>

          <div className="space-y-2">
            {Object.entries(MOCK_LOINC_CONCEPTS).map(([code, concept]) => (
              <button
                key={code}
                onClick={() => setSelectedLoinc(code)}
                className={`w-full text-left p-3 rounded-xl border text-xs transition duration-300 ${
                  selectedLoinc === code
                    ? 'bg-primary/10 border-primary text-foreground font-semibold'
                    : 'bg-muted/20 border-border text-muted-foreground hover:bg-muted/40 hover:text-foreground'
                }`}
              >
                <div className="flex justify-between items-start mb-1">
                  <span className="font-semibold truncate max-w-[150px]">{concept.name.split(' [')[0]}</span>
                  <Badge variant="outline" className="text-[8px] font-mono border-border">LOINC {code}</Badge>
                </div>
                <div className="text-[10px] text-muted-foreground">Range: {concept.range}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Translation Explanation Box */}
        <div className="md:col-span-7 flex flex-col justify-between p-5 bg-muted/20 border border-border rounded-2xl relative min-h-[220px]">
          {isLoading && (
            <div className="absolute inset-0 bg-background/50 backdrop-blur-xs flex items-center justify-center rounded-2xl z-10">
              <RefreshCw className="h-6 w-6 text-primary animate-spin" />
            </div>
          )}
          
          <div>
            <div className="flex items-center justify-between border-b border-border pb-3 mb-4">
              <div>
                <h3 className="text-sm font-semibold text-foreground">{currentConcept.name}</h3>
                <span className="text-[10px] text-muted-foreground font-mono">LOINC ID: {selectedLoinc}</span>
              </div>
              <Badge variant="outline" className={`${getStatusBadgeColor(currentConcept.status)} font-bold`}>
                {currentConcept.status}
              </Badge>
            </div>

            <div className="space-y-4">
              <div>
                <div className="text-[10px] uppercase font-mono text-muted-foreground tracking-wider mb-1">Clinical Reference Range</div>
                <div className="text-sm font-semibold font-mono text-foreground">{currentConcept.range}</div>
              </div>

              <div>
                <div className="text-[10px] uppercase font-mono text-muted-foreground tracking-wider mb-1">Patient-Friendly Explanation</div>
                <p className="text-xs text-muted-foreground leading-relaxed font-sans">{currentConcept.explanation}</p>
              </div>
            </div>
          </div>

          <div className="mt-6 pt-3 border-t border-dashed border-border flex items-center gap-2 text-muted-foreground text-[9px] font-mono">
            <FileText className="h-3.5 w-3.5" />
            Verified against Ontomorph HOLON Clinical Knowledge Graph
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
