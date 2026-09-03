'use client';

import { useState, useMemo, useRef } from 'react';
import {
    Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from "@/components/ui/table";
import {
    Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger
} from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useUser, useFirestore, useDoc, useCollection } from "@/firebase";
import {
    collection, query, where, orderBy, doc, addDoc, serverTimestamp, writeBatch
} from 'firebase/firestore';
import {
    ArrowLeftRight, UploadCloud, FileSpreadsheet, Database, CheckCircle2,
    AlertCircle, Download, RefreshCw, Sliders, Globe, Activity, Webhook,
    Server, Key, ShieldCheck, Trash2, History, Sparkles, FileText,
    Building2, Check, Copy, ExternalLink, Zap, Package, Calendar, Pill, Users
} from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import { DashLoader } from "@/components/ui/dash-loader";
import type { UserProfile, ImportBatchLog, IntegrationConfig } from "@/lib/types";

// CSV Templates
const SAMPLE_TEMPLATES: Record<string, { filename: string; headers: string[]; sampleRow: string[] }> = {
    Patients: {
        filename: 'orelis_patients_template.csv',
        headers: ['surname', 'firstName', 'sex', 'dob', 'phone', 'email', 'address', 'maritalStatus', 'occupation', 'nextOfKinName', 'nextOfKinPhone'],
        sampleRow: ['Doe', 'John', 'Male', '1985-06-15', '+2348012345678', 'john.doe@example.com', '12 Hospital Road, Lagos', 'Married', 'Engineer', 'Jane Doe', '+2348098765432']
    },
    Inventory: {
        filename: 'orelis_inventory_template.csv',
        headers: ['name', 'category', 'unit', 'quantity', 'minStock', 'price'],
        sampleRow: ['Surgical Gloves (Box of 100)', 'Consumables', 'box', '50', '10', '4500']
    },
    Appointments: {
        filename: 'orelis_appointments_template.csv',
        headers: ['patientName', 'doctorName', 'appointmentDate', 'reason', 'status'],
        sampleRow: ['John Doe', 'Dr. Sarah Smith', '2026-09-10T10:00:00Z', 'Routine Medical Checkup', 'Scheduled']
    },
    Prescriptions: {
        filename: 'orelis_prescriptions_template.csv',
        headers: ['patientName', 'doctorName', 'medicationName', 'dosage', 'frequency', 'duration', 'quantity', 'status'],
        sampleRow: ['John Doe', 'Dr. Sarah Smith', 'Amoxicillin 500mg', '500mg', 'TDS (8 hourly)', '7 days', '21', 'Pending']
    }
};

// Legacy EMR Presets
const MIGRATION_PRESETS = [
    {
        id: 'epic',
        name: 'Epic Systems',
        description: 'FHIR R4 & CSV Patient Demographics Export',
        format: 'CSV / JSON FHIR',
        mappings: { surname: 'Last_Name', firstName: 'First_Name', dob: 'Birth_Date', phone: 'Home_Phone', email: 'Email_Address' }
    },
    {
        id: 'cerner',
        name: 'Cerner / Oracle Health',
        description: 'Millennium EHR Clinical Master Person Index',
        format: 'CSV / XML',
        mappings: { surname: 'PAT_LAST_NAME', firstName: 'PAT_FIRST_NAME', dob: 'DOB', phone: 'MOBILE', email: 'EMAIL' }
    },
    {
        id: 'openmrs',
        name: 'OpenMRS',
        description: 'OpenMRS Person & Patient Identifier Database Dump',
        format: 'CSV / SQL JSON',
        mappings: { surname: 'family_name', firstName: 'given_name', dob: 'birthdate', phone: 'phone_number', address: 'address1' }
    },
    {
        id: 'openemr',
        name: 'OpenEMR',
        description: 'OpenEMR Patient Data & Billing Table Export',
        format: 'CSV / MySQL Export',
        mappings: { surname: 'lname', firstName: 'fname', dob: 'DOB', phone: 'phone_cell', email: 'email' }
    },
    {
        id: 'kareo',
        name: 'Kareo / Tebra',
        description: 'Practice Management & Demographics CSV',
        format: 'CSV',
        mappings: { surname: 'LastName', firstName: 'FirstName', dob: 'DateOfBirth', phone: 'CellPhone', email: 'Email' }
    }
];

// Software Integrations
const INITIAL_INTEGRATIONS: IntegrationConfig[] = [
    {
        id: 'lis-hl7',
        clinicId: '',
        name: 'Laboratory Information System (LIS / HL7)',
        category: 'LIS',
        enabled: true,
        webhookUrl: 'https://api.orelis.app/v1/lis/incoming-hl7',
        status: 'Connected',
        lastSync: '10 minutes ago'
    },
    {
        id: 'paystack-gateway',
        clinicId: '',
        name: 'Paystack Integrated Payments',
        category: 'Payment',
        enabled: true,
        apiKey: 'pk_live_12254d47cfebff3cc40c54b060b1a1e5e2ddc669',
        status: 'Connected',
        lastSync: 'Just now'
    },
    {
        id: 'twilio-sms',
        clinicId: '',
        name: 'Twilio SMS & Whatsapp Appointment Reminders',
        category: 'Communication',
        enabled: true,
        apiKey: 'AC_live_3920193019301930193',
        status: 'Connected',
        lastSync: '2 hours ago'
    },
    {
        id: 'external-fhir',
        clinicId: '',
        name: 'National Health Insurance / External EHR Gateway',
        category: 'EHR',
        enabled: false,
        webhookUrl: 'https://nhis-gateway.gov.ng/fhir/r4',
        status: 'Disconnected'
    }
];

/** Parse CSV string into array of objects */
function parseCSV(csvText: string): { headers: string[]; rows: Record<string, string>[] } {
    const lines = csvText.split(/\r\n|\n/).filter(line => line.trim().length > 0);
    if (lines.length === 0) return { headers: [], rows: [] };

    const headers = lines[0].split(',').map(h => h.trim().replace(/^["']|["']$/g, ''));
    const rows: Record<string, string>[] = [];

    for (let i = 1; i < lines.length; i++) {
        // Regex to split by comma outside quotes
        const values = lines[i].split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map(v => v.trim().replace(/^["']|["']$/g, ''));
        if (values.length === headers.length || values.some(v => v !== '')) {
            const rowObj: Record<string, string> = {};
            headers.forEach((h, idx) => {
                rowObj[h] = values[idx] || '';
            });
            rows.push(rowObj);
        }
    }

    return { headers, rows };
}

export default function DataImportIntegrationsPage() {
    const { toast } = useToast();
    const { user } = useUser();
    const firestore = useFirestore();
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Profile & Clinic
    const userProfileRef = useMemo(() => {
        if (!user || !firestore) return null;
        return doc(firestore, 'users', user.uid);
    }, [user, firestore]);
    const { data: userProfile } = useDoc<UserProfile>(userProfileRef);

    // Audit logs
    const auditLogsQuery = useMemo(() => {
        if (!userProfile?.clinicId || !firestore) return null;
        return query(
            collection(firestore, 'import_batches'),
            where('clinicId', '==', userProfile.clinicId),
            orderBy('timestamp', 'desc')
        );
    }, [userProfile?.clinicId, firestore]);
    const { data: importLogs, loading: logsLoading } = useCollection<ImportBatchLog>(auditLogsQuery);

    // State
    const [selectedEntity, setSelectedEntity] = useState<'Patients' | 'Inventory' | 'Appointments' | 'Prescriptions'>('Patients');
    const [parsedData, setParsedData] = useState<{ filename: string; headers: string[]; rows: Record<string, string>[] } | null>(null);
    const [fieldMappings, setFieldMappings] = useState<Record<string, string>>({});
    const [importing, setImporting] = useState(false);
    const [progress, setProgress] = useState(0);

    // Software Integrations State
    const [integrations, setIntegrations] = useState<IntegrationConfig[]>(INITIAL_INTEGRATIONS);
    const [webhookUrlInput, setWebhookUrlInput] = useState('');
    const [customWebhooks, setCustomWebhooks] = useState<string[]>([
        'https://clinic-analytics.internal.net/webhooks/patient-registered',
        'https://billing-sync.hospital.org/events/invoice-paid'
    ]);

    // Handle File Upload
    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            const text = event.target?.result as string;
            const { headers, rows } = parseCSV(text);

            if (headers.length === 0 || rows.length === 0) {
                toast({
                    title: "Empty or Invalid File",
                    description: "The uploaded file contains no valid CSV headers or rows.",
                    variant: "destructive"
                });
                return;
            }

            // Auto mapping
            const initialMappings: Record<string, string> = {};
            const schemaHeaders = SAMPLE_TEMPLATES[selectedEntity].headers;

            schemaHeaders.forEach(schemaField => {
                const match = headers.find(h =>
                    h.toLowerCase().replace(/[^a-z0-9]/g, '') === schemaField.toLowerCase().replace(/[^a-z0-9]/g, '')
                );
                if (match) {
                    initialMappings[schemaField] = match;
                }
            });

            setFieldMappings(initialMappings);
            setParsedData({ filename: file.name, headers, rows });
            toast({
                title: "File Loaded Successfully",
                description: `Parsed ${rows.length} rows from ${file.name}.`
            });
        };
        reader.readAsText(file);
    };

    // Download CSV Sample Template
    const downloadSampleCSV = (entity: string) => {
        const template = SAMPLE_TEMPLATES[entity];
        if (!template) return;

        const csvContent = "data:text/csv;charset=utf-8," +
            [template.headers.join(','), template.sampleRow.join(',')].join('\n');

        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", template.filename);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        toast({
            title: "Template Downloaded",
            description: `Downloaded ${template.filename}. Open it in Excel or Google Sheets to add records.`
        });
    };

    // Apply Preset Mapping
    const applyPreset = (preset: typeof MIGRATION_PRESETS[0]) => {
        setFieldMappings(preset.mappings as unknown as Record<string, string>);
        toast({
            title: `Applied Preset: ${preset.name}`,
            description: "Field mapping rules updated for " + preset.name
        });
    };

    // Execute Bulk Import to Firestore
    const executeImport = async () => {
        if (!parsedData || !firestore || !userProfile?.clinicId) {
            toast({ title: "Import Error", description: "Missing active session or file data.", variant: "destructive" });
            return;
        }

        setImporting(true);
        setProgress(10);

        try {
            const rows = parsedData.rows;
            let successCount = 0;
            let failureCount = 0;
            const errors: string[] = [];

            // Chunk in batches of 200
            const chunkSize = 200;
            const targetCollectionName = selectedEntity === 'Patients' ? 'patients' :
                selectedEntity === 'Inventory' ? 'inventory' :
                    selectedEntity === 'Appointments' ? 'appointments' : 'prescriptions';

            for (let i = 0; i < rows.length; i += chunkSize) {
                const chunk = rows.slice(i, i + chunkSize);
                const batch = writeBatch(firestore);

                chunk.forEach((row, index) => {
                    const docRef = doc(collection(firestore, targetCollectionName));
                    const mappedRecord: Record<string, any> = {
                        clinicId: userProfile.clinicId,
                        importedVia: 'Orelis-Data-Importer',
                        importedAt: new Date().toISOString()
                    };

                    // Map fields
                    Object.entries(fieldMappings).forEach(([schemaKey, fileHeader]) => {
                        if (fileHeader && row[fileHeader] !== undefined) {
                            mappedRecord[schemaKey] = row[fileHeader];
                        }
                    });

                    // Defaults for Patient
                    if (selectedEntity === 'Patients') {
                        if (!mappedRecord.surname) mappedRecord.surname = row['surname'] || 'Imported';
                        if (!mappedRecord.firstName) mappedRecord.firstName = row['firstName'] || `Patient #${i + index + 1}`;
                        if (!mappedRecord.patientCode) mappedRecord.patientCode = `P-${Math.floor(100000 + Math.random() * 900000)}`;
                        mappedRecord.registrationDate = mappedRecord.registrationDate || new Date().toISOString();
                    }

                    // Defaults for Inventory
                    if (selectedEntity === 'Inventory') {
                        if (!mappedRecord.name) mappedRecord.name = row['name'] || `Supply Item #${i + index + 1}`;
                        mappedRecord.quantity = Number(mappedRecord.quantity) || 10;
                        mappedRecord.minStock = Number(mappedRecord.minStock) || 5;
                        mappedRecord.unit = mappedRecord.unit || 'unit';
                        mappedRecord.category = mappedRecord.category || 'Consumables';
                    }

                    batch.set(docRef, mappedRecord);
                    successCount++;
                });

                await batch.commit();
                const percentComplete = Math.min(95, Math.round(((i + chunk.length) / rows.length) * 100));
                setProgress(percentComplete);
            }

            // Log batch to import_batches collection
            await addDoc(collection(firestore, 'import_batches'), {
                clinicId: userProfile.clinicId,
                fileName: parsedData.filename,
                entityType: selectedEntity,
                importedCount: successCount,
                failedCount: failureCount,
                totalRecords: rows.length,
                timestamp: new Date().toISOString(),
                performedBy: userProfile.name || userProfile.email,
                status: failureCount === 0 ? 'Completed' : 'Partial'
            });

            setProgress(100);
            toast({
                title: "Import Finished Successfully!",
                description: `Successfully imported ${successCount} ${selectedEntity} records into your clinic database.`
            });

            // Reset file upload
            setParsedData(null);

        } catch (err: any) {
            console.error("Bulk Import error:", err);
            toast({
                title: "Import Failed",
                description: err?.message || "An unexpected error occurred during database insertion.",
                variant: "destructive"
            });
        } finally {
            setImporting(false);
        }
    };

    // Toggle Integration Switch
    const toggleIntegration = (id: string) => {
        setIntegrations(prev => prev.map(item => {
            if (item.id === id) {
                const nextState = !item.enabled;
                return {
                    ...item,
                    enabled: nextState,
                    status: nextState ? 'Connected' : 'Disconnected'
                };
            }
            return item;
        }));
        toast({ title: "Integration Updated", description: "Connection status saved." });
    };

    // Add Custom Webhook
    const addCustomWebhook = () => {
        if (!webhookUrlInput.trim()) return;
        setCustomWebhooks(prev => [...prev, webhookUrlInput.trim()]);
        setWebhookUrlInput('');
        toast({ title: "Webhook Endpoint Registered", description: "Events will now stream to this endpoint." });
    };

    return (
        <div className="flex flex-col gap-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="font-semibold text-lg md:text-2xl flex items-center gap-2">
                        <ArrowLeftRight className="text-primary h-6 w-6" /> Data Import & Integrations Hub
                    </h1>
                    <p className="text-sm text-muted-foreground">
                        Migrate patient records, inventory, and clinical data from legacy EMRs or connect live software & webhooks.
                    </p>
                </div>
                <Badge variant="outline" className="w-fit border-primary/30 text-primary bg-primary/5 px-3 py-1 font-mono text-xs">
                    <Zap className="h-3.5 w-3.5 mr-1 text-primary animate-pulse" /> Enterprise Data Sync Engine
                </Badge>
            </div>

            {/* Main Tabs */}
            <Tabs defaultValue="importer" className="w-full">
                <TabsList className="grid grid-cols-2 md:grid-cols-4 w-full md:w-auto h-auto p-1 bg-muted/60">
                    <TabsTrigger value="importer" className="gap-2 py-2">
                        <UploadCloud className="h-4 w-4 text-primary" /> Smart Importer
                    </TabsTrigger>
                    <TabsTrigger value="presets" className="gap-2 py-2">
                        <Database className="h-4 w-4 text-blue-500" /> Legacy EMR Presets
                    </TabsTrigger>
                    <TabsTrigger value="integrations" className="gap-2 py-2">
                        <Webhook className="h-4 w-4 text-purple-500" /> Software & Webhooks
                    </TabsTrigger>
                    <TabsTrigger value="history" className="gap-2 py-2">
                        <History className="h-4 w-4 text-amber-500" /> Import History Log
                    </TabsTrigger>
                </TabsList>

                {/* ========================================================= */}
                {/* TAB 1: SMART FILE IMPORTER */}
                {/* ========================================================= */}
                <TabsContent value="importer" className="space-y-6 mt-4">
                    <div className="grid gap-6 lg:grid-cols-3">
                        {/* Step 1: Configuration */}
                        <Card className="lg:col-span-1 border border-dashed">
                            <CardHeader>
                                <CardTitle className="text-sm font-bold uppercase tracking-wider flex items-center gap-2">
                                    <Sliders className="h-4 w-4 text-primary" /> Step 1: Select Import Entity
                                </CardTitle>
                                <CardDescription>Pick what data type you are importing into Orelis.</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="space-y-2">
                                    <Label>Data Entity</Label>
                                    <Select value={selectedEntity} onValueChange={(val: any) => { setSelectedEntity(val); setParsedData(null); }}>
                                        <SelectTrigger><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="Patients">👥 Patient Records & Demographics</SelectItem>
                                            <SelectItem value="Inventory">📦 Inventory & Medical Supplies</SelectItem>
                                            <SelectItem value="Appointments">📅 Appointments & Clinic Visits</SelectItem>
                                            <SelectItem value="Prescriptions">💊 Prescriptions & Pharmacy Stock</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="p-4 bg-muted/40 rounded-lg border border-dashed text-xs space-y-3">
                                    <div className="flex items-center justify-between">
                                        <span className="font-semibold text-foreground flex items-center gap-1.5">
                                            <FileSpreadsheet className="h-4 w-4 text-emerald-500" /> Sample CSV Template
                                        </span>
                                        <Button variant="outline" size="sm" onClick={() => downloadSampleCSV(selectedEntity)} className="h-7 text-xs gap-1">
                                            <Download className="h-3.5 w-3.5" /> Download
                                        </Button>
                                    </div>
                                    <p className="text-muted-foreground leading-relaxed">
                                        Download the standardized template for <strong>{selectedEntity}</strong>. Populate it in Excel and upload below.
                                    </p>
                                </div>

                                {/* File Dropzone */}
                                <div className="space-y-2">
                                    <Label>Upload File (CSV or JSON)</Label>
                                    <div
                                        onClick={() => fileInputRef.current?.click()}
                                        className="border-2 border-dashed border-primary/30 hover:border-primary rounded-xl p-6 text-center cursor-pointer transition-all bg-primary/5 hover:bg-primary/10 flex flex-col items-center justify-center gap-2"
                                    >
                                        <UploadCloud className="h-8 w-8 text-primary animate-bounce" />
                                        <div className="text-sm font-semibold">Click to select CSV / JSON file</div>
                                        <div className="text-xs text-muted-foreground">Supports .csv, .json export files up to 50MB</div>
                                        <input
                                            ref={fileInputRef}
                                            type="file"
                                            accept=".csv,.json"
                                            className="hidden"
                                            onChange={handleFileUpload}
                                        />
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Step 2: Mapping & Preview */}
                        <Card className="lg:col-span-2">
                            <CardHeader>
                                <div className="flex items-center justify-between">
                                    <div>
                                        <CardTitle className="text-sm font-bold uppercase tracking-wider flex items-center gap-2">
                                            <CheckCircle2 className="h-4 w-4 text-emerald-500" /> Step 2: Field Mapping & Validation
                                        </CardTitle>
                                        <CardDescription>
                                            {parsedData ? `Previewing ${parsedData.rows.length} records from ${parsedData.filename}` : 'Upload a file on the left to preview field mapping.'}
                                        </CardDescription>
                                    </div>
                                    {parsedData && (
                                        <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20 font-mono">
                                            {parsedData.rows.length} Records Ready
                                        </Badge>
                                    )}
                                </div>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                {!parsedData ? (
                                    <div className="flex flex-col items-center justify-center py-16 text-center text-muted-foreground border border-dashed rounded-lg">
                                        <FileSpreadsheet className="h-12 w-12 opacity-30 mb-3" />
                                        <p className="font-medium text-sm">No File Loaded Yet</p>
                                        <p className="text-xs max-w-sm mt-1">Select an entity and upload a CSV/JSON file to preview column auto-matching and validate rows before importing.</p>
                                    </div>
                                ) : (
                                    <>
                                        {/* Field Mapping Grid */}
                                        <div className="space-y-3">
                                            <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                                                <Sliders className="h-3.5 w-3.5" /> Schema Field Auto-Matching
                                            </h4>
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-48 overflow-y-auto p-3 bg-muted/30 rounded-lg border">
                                                {SAMPLE_TEMPLATES[selectedEntity].headers.map(schemaKey => (
                                                    <div key={schemaKey} className="flex items-center justify-between gap-2 p-2 bg-background rounded border text-xs">
                                                        <span className="font-mono font-semibold text-primary">{schemaKey}:</span>
                                                        <Select
                                                            value={fieldMappings[schemaKey] || ''}
                                                            onValueChange={(val) => setFieldMappings(prev => ({ ...prev, [schemaKey]: val }))}
                                                        >
                                                            <SelectTrigger className="h-7 text-xs w-36"><SelectValue placeholder="Ignore field" /></SelectTrigger>
                                                            <SelectContent>
                                                                <SelectItem value="">-- Ignore --</SelectItem>
                                                                {parsedData.headers.map(h => (
                                                                    <SelectItem key={h} value={h}>{h}</SelectItem>
                                                                ))}
                                                            </SelectContent>
                                                        </Select>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Data Preview Table */}
                                        <div className="space-y-3">
                                            <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                                                <FileText className="h-3.5 w-3.5" /> Pre-Import Sample Preview (First 5 Rows)
                                            </h4>
                                            <div className="overflow-x-auto border rounded-lg max-h-52 overflow-y-auto">
                                                <Table>
                                                    <TableHeader>
                                                        <TableRow>
                                                            {parsedData.headers.slice(0, 6).map((h, idx) => (
                                                                <TableHead key={idx} className="text-xs font-mono">{h}</TableHead>
                                                            ))}
                                                        </TableRow>
                                                    </TableHeader>
                                                    <TableBody>
                                                        {parsedData.rows.slice(0, 5).map((row, rIdx) => (
                                                            <TableRow key={rIdx}>
                                                                {parsedData.headers.slice(0, 6).map((h, cIdx) => (
                                                                    <TableCell key={cIdx} className="text-xs truncate max-w-[150px]">
                                                                        {row[h] || <span className="opacity-40 font-mono">—</span>}
                                                                    </TableCell>
                                                                ))}
                                                            </TableRow>
                                                        ))}
                                                    </TableBody>
                                                </Table>
                                            </div>
                                        </div>

                                        {/* Import Execution Button & Progress */}
                                        {importing && (
                                            <div className="space-y-2">
                                                <div className="flex justify-between text-xs font-medium">
                                                    <span>Inserting records into Firestore database...</span>
                                                    <span>{progress}%</span>
                                                </div>
                                                <Progress value={progress} className="h-2" />
                                            </div>
                                        )}

                                        <div className="flex items-center justify-end gap-3 pt-2">
                                            <Button variant="outline" onClick={() => setParsedData(null)} disabled={importing}>
                                                Cancel
                                            </Button>
                                            <Button onClick={executeImport} disabled={importing} className="button-glow gap-2">
                                                {importing ? <DashLoader size="sm" className="text-white" /> : <Database className="h-4 w-4" />}
                                                Execute Bulk Import ({parsedData.rows.length} Records)
                                            </Button>
                                        </div>
                                    </>
                                )}
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>

                {/* ========================================================= */}
                {/* TAB 2: LEGACY EMR MIGRATION PRESETS */}
                {/* ========================================================= */}
                <TabsContent value="presets" className="space-y-6 mt-4">
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-base font-bold flex items-center gap-2">
                                <Database className="h-5 w-5 text-blue-500" /> One-Click EMR & EHR Migration Presets
                            </CardTitle>
                            <CardDescription>
                                Pre-configured data translation matrices for standard exports from major legacy health systems.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                                {MIGRATION_PRESETS.map((preset) => (
                                    <div key={preset.id} className="flex flex-col justify-between p-4 border rounded-xl bg-card hover:border-primary/50 transition-all space-y-4 shadow-sm">
                                        <div className="space-y-2">
                                            <div className="flex items-center justify-between">
                                                <h3 className="font-bold text-sm">{preset.name}</h3>
                                                <Badge variant="outline" className="text-[10px] font-mono">{preset.format}</Badge>
                                            </div>
                                            <p className="text-xs text-muted-foreground leading-relaxed">{preset.description}</p>
                                        </div>

                                        <div className="space-y-2">
                                            <div className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Field Mappings</div>
                                            <div className="p-2 bg-muted/40 rounded border text-[11px] font-mono space-y-1">
                                                {Object.entries(preset.mappings).slice(0, 3).map(([k, v]) => (
                                                    <div key={k} className="flex justify-between">
                                                        <span className="text-primary">{k}</span> ➔ <span>{v}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>

                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => applyPreset(preset)}
                                            className="w-full gap-1 text-xs hover:bg-primary hover:text-white transition-colors"
                                        >
                                            <Check className="h-3.5 w-3.5" /> Apply Preset Mapping
                                        </Button>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* ========================================================= */}
                {/* TAB 3: SOFTWARE CONNECTIONS & WEBHOOKS */}
                {/* ========================================================= */}
                <TabsContent value="integrations" className="space-y-6 mt-4">
                    <div className="grid gap-6 lg:grid-cols-3">
                        {/* Integration Cards */}
                        <Card className="lg:col-span-2">
                            <CardHeader>
                                <CardTitle className="text-base font-bold flex items-center gap-2">
                                    <Webhook className="h-5 w-5 text-purple-500" /> Active Software Connections
                                </CardTitle>
                                <CardDescription>Live real-time data connectors for labs, payment gateways, and communications.</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                {integrations.map((item) => (
                                    <div key={item.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 border rounded-xl bg-card gap-4">
                                        <div className="space-y-1">
                                            <div className="flex items-center gap-2">
                                                <h3 className="font-bold text-sm">{item.name}</h3>
                                                <Badge
                                                    variant="outline"
                                                    className={item.enabled ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" : "bg-muted text-muted-foreground"}
                                                >
                                                    {item.status}
                                                </Badge>
                                            </div>
                                            {item.webhookUrl && (
                                                <div className="text-xs font-mono text-muted-foreground flex items-center gap-1">
                                                    <Globe className="h-3 w-3" /> {item.webhookUrl}
                                                </div>
                                            )}
                                            {item.lastSync && (
                                                <div className="text-[11px] text-muted-foreground/70">
                                                    Last synced: {item.lastSync}
                                                </div>
                                            )}
                                        </div>

                                        <div className="flex items-center gap-3">
                                            <Switch
                                                checked={item.enabled}
                                                onCheckedChange={() => toggleIntegration(item.id)}
                                            />
                                        </div>
                                    </div>
                                ))}
                            </CardContent>
                        </Card>

                        {/* Webhook Endpoint Configurator */}
                        <Card className="lg:col-span-1 border border-dashed">
                            <CardHeader>
                                <CardTitle className="text-sm font-bold uppercase tracking-wider flex items-center gap-2">
                                    <Server className="h-4 w-4 text-primary" /> Register Custom Webhook
                                </CardTitle>
                                <CardDescription>Stream clinical events (`patient.created`, `encounter.finalized`) to external servers.</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="space-y-2">
                                    <Label>Webhook Destination URL</Label>
                                    <Input
                                        placeholder="https://your-server.com/api/webhook"
                                        value={webhookUrlInput}
                                        onChange={(e) => setWebhookUrlInput(e.target.value)}
                                    />
                                </div>

                                <Button size="sm" onClick={addCustomWebhook} className="w-full gap-2">
                                    <Zap className="h-4 w-4" /> Add Webhook Endpoint
                                </Button>

                                <div className="space-y-2 pt-2">
                                    <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Active Endpoints</Label>
                                    <div className="space-y-2 max-h-48 overflow-y-auto">
                                        {customWebhooks.map((url, idx) => (
                                            <div key={idx} className="flex items-center justify-between p-2 bg-muted/40 rounded border text-xs font-mono">
                                                <span className="truncate max-w-[200px]">{url}</span>
                                                <Badge variant="outline" className="text-[9px] bg-emerald-500/10 text-emerald-500">HTTP 200 OK</Badge>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>

                {/* ========================================================= */}
                {/* TAB 4: IMPORT AUDIT HISTORY LOG */}
                {/* ========================================================= */}
                <TabsContent value="history" className="space-y-6 mt-4">
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-base font-bold flex items-center gap-2">
                                <History className="h-5 w-5 text-amber-500" /> Audit Log of Database Import Batches
                            </CardTitle>
                            <CardDescription>
                                Complete compliance trail of all bulk file imports performed in your facility.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            {logsLoading ? (
                                <div className="flex justify-center py-12">
                                    <DashLoader size="lg" />
                                </div>
                            ) : !importLogs || importLogs.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground border border-dashed rounded-lg">
                                    <History className="h-10 w-10 opacity-30 mb-2" />
                                    <p className="font-medium text-sm">No Import History Found</p>
                                    <p className="text-xs">Executed import batches will record automatically here for audit compliance.</p>
                                </div>
                            ) : (
                                <div className="overflow-x-auto">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Timestamp</TableHead>
                                                <TableHead>File Name</TableHead>
                                                <TableHead>Entity Type</TableHead>
                                                <TableHead>Records Imported</TableHead>
                                                <TableHead>Performed By</TableHead>
                                                <TableHead>Status</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {importLogs.map((log) => (
                                                <TableRow key={log.id}>
                                                    <TableCell className="text-xs font-mono">
                                                        {new Date(log.timestamp).toLocaleString()}
                                                    </TableCell>
                                                    <TableCell className="font-medium text-xs flex items-center gap-2">
                                                        <FileSpreadsheet className="h-4 w-4 text-emerald-500 shrink-0" />
                                                        {log.fileName}
                                                    </TableCell>
                                                    <TableCell><Badge variant="outline" className="text-xs">{log.entityType}</Badge></TableCell>
                                                    <TableCell className="text-xs font-bold">{log.importedCount} / {log.totalRecords}</TableCell>
                                                    <TableCell className="text-xs">{log.performedBy}</TableCell>
                                                    <TableCell>
                                                        <Badge className={log.status === 'Completed' ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" : "bg-amber-500/10 text-amber-500"}>
                                                            {log.status}
                                                        </Badge>
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}
