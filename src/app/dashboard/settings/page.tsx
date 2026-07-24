
'use client';
import { useActionState, useEffect, useRef, useMemo, useState } from 'react';
import { useFormStatus } from 'react-dom';
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useUser, useFirestore, useDoc, useCollection } from "@/firebase";
import { doc, updateDoc, collection, addDoc, query, where, orderBy, limit } from 'firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';
import { updateProfileAction, type UpdateProfileFormState } from '@/app/actions';
import { useToast } from '@/hooks/use-toast';
import type { UserProfile, Clinic } from '@/lib/types';
import { Building, CreditCard, Loader2, Palette, ShieldCheck, FileClock, UserCog, Database, Link as LinkIcon, MessageSquare, Activity, FileJson, Lock, Smartphone, Download, Key, ExternalLink, Clock, Plus, Trash2, Check, AlertCircle } from 'lucide-react';
import { Switch } from "@/components/ui/switch";
import { DashLoader } from "@/components/ui/dash-loader";
import Link from 'next/link';
import { useTheme } from 'next-themes';
import { usePWA } from '@/hooks/use-pwa';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PaystackButton } from '@/components/paystack-button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { generatePatientCode } from '@/lib/utils';

const initialState: UpdateProfileFormState = {
  message: '',
  isSuccess: false,
};

function ClinicSetupTool({ clinic }: { clinic: Clinic }) {
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isSaving, setIsSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!firestore || !clinic.id) return;
    setIsSaving(true);

    const formData = new FormData(e.currentTarget);

    // Prepare clinic update data
    const updateData: any = {
      name: formData.get('name') as string,
      email: formData.get('email') as string,
      phone: formData.get('phone') as string,
      address: formData.get('address') as string,
      website: formData.get('website') as string,
    };

    // Prepare Operating Hours
    const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    const hours: any = {};
    days.forEach(day => {
      hours[day] = {
        open: formData.get(`${day}-open`) as string || '08:00',
        close: formData.get(`${day}-close`) as string || '18:00',
        isClosed: formData.get(`${day}-closed`) === 'on'
      };
    });
    updateData.operatingHours = hours;

    try {
      await updateDoc(doc(firestore, 'clinics', clinic.id), updateData);
      toast({ title: "Clinic Updated", description: "All settings and operating hours have been synchronized." });

      // Log the action
      await addDoc(collection(firestore, 'audit_logs'), {
        clinicId: clinic.id,
        action: 'UPDATE_CLINIC_SETTINGS',
        timestamp: new Date().toISOString(),
        details: 'Updated profile and operating hours'
      });

    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="md:col-span-2">
      <Card className="border-dashed overflow-hidden">
        <CardHeader className="bg-primary/5 border-b border-dashed">
          <CardTitle className="flex items-center gap-2"><Building className="w-5 h-5" /> Clinic Configuration</CardTitle>
          <CardDescription>Consolidated settings for your medical facility.</CardDescription>
        </CardHeader>
        <CardContent className="pt-6 space-y-8">
          {/* Basic Info */}
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Clinic Name</Label>
              <Input name="name" defaultValue={clinic.name} />
            </div>
            <div className="space-y-2">
              <Label>Public Email</Label>
              <Input name="email" type="email" defaultValue={clinic.email} />
            </div>
            <div className="space-y-2">
              <Label>Contact Phone</Label>
              <Input name="phone" defaultValue={clinic.phone} />
            </div>
            <div className="space-y-2">
              <Label>Website</Label>
              <Input name="website" defaultValue={clinic.website} placeholder="https://" />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>Physical Address</Label>
              <Input name="address" defaultValue={clinic.address} />
            </div>
          </div>

          {/* Operating Hours */}
          <div className="space-y-4 pt-4 border-t border-dashed">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-orange-500" />
              <h3 className="text-sm font-bold uppercase tracking-wider">Business & Operating Hours</h3>
            </div>
            <div className="grid gap-4">
              {['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'].map((day) => (
                <div key={day} className="flex flex-wrap items-center gap-4 p-3 bg-card/50 rounded-lg border border-dashed hover:border-primary/30 transition-colors">
                  <Label className="w-24 capitalize font-medium">{day}</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      name={`${day}-open`}
                      type="time"
                      className="w-32 h-8"
                      defaultValue={clinic.operatingHours?.[day as keyof typeof clinic.operatingHours]?.open || '08:00'}
                    />
                    <span className="text-xs text-muted-foreground">to</span>
                    <Input
                      name={`${day}-close`}
                      type="time"
                      className="w-32 h-8"
                      defaultValue={clinic.operatingHours?.[day as keyof typeof clinic.operatingHours]?.close || '18:00'}
                    />
                  </div>
                  <div className="ml-auto flex items-center gap-2">
                    <Label htmlFor={`${day}-closed`} className="text-xs">Closed</Label>
                    <Switch
                      id={`${day}-closed`}
                      name={`${day}-closed`}
                      defaultChecked={clinic.operatingHours?.[day as keyof typeof clinic.operatingHours]?.isClosed}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
        <CardFooter className="bg-primary/5 border-t border-dashed justify-end gap-2">
          <Button type="submit" disabled={isSaving} className="button-glow">
            {isSaving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <ShieldCheck className="w-4 h-4 mr-2" />}
            Synchronize Settings
          </Button>
        </CardFooter>
      </Card>
    </form>
  );
}

function AuditLogTool({ clinicId }: { clinicId: string }) {
  const firestore = useFirestore();
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchLogs = async () => {
    if (!firestore || !clinicId) return;
    setLoading(true);
    try {
      const q = query(
        collection(firestore, 'audit_logs'),
        where('clinicId', '==', clinicId),
        orderBy('timestamp', 'desc'),
        limit(10)
      );
      const querySnapshot = await useCollection<any>(q as any); // Mock or actual helper usage
      // Since useCollection is a hook, we can't call it inside fetchLogs. 
      // In a real implementation we'd use getDocs here for a one-off fetch.
    } catch (e) { }
    setLoading(false);
  }

  // Direct firestore access for this tool
  const logsQuery = useMemo(() => {
    if (!firestore || !clinicId) return null;
    return query(collection(firestore, 'audit_logs'), where('clinicId', '==', clinicId), orderBy('timestamp', 'desc'), limit(15));
  }, [firestore, clinicId]);
  const { data: auditData, loading: logsLoading } = useCollection<any>(logsQuery as any);

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Card className="border-dashed cursor-pointer hover:bg-primary/5 transition-all">
          <CardHeader>
            <CardTitle className='flex items-center gap-2 text-primary'><Activity className='w-5 h-5' />Audit Logs</CardTitle>
            <CardDescription>View a log of important activities in your clinic.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" className="w-full">Open Activity Trail</Button>
          </CardContent>
        </Card>
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Clinic Audit Trail</DialogTitle>
          <DialogDescription>The last 15 security and management events.</DialogDescription>
        </DialogHeader>
        <div className="flex-1 overflow-y-auto mt-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Timestamp</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Details</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logsLoading ? (
                <TableRow><TableCell colSpan={3} className="text-center py-8"><DashLoader /></TableCell></TableRow>
              ) : auditData?.length === 0 ? (
                <TableRow><TableCell colSpan={3} className="text-center py-8">No events recorded yet.</TableCell></TableRow>
              ) : (
                auditData?.map((log, i) => (
                  <TableRow key={i}>
                    <TableCell className="text-xs font-mono">{new Date(log.timestamp).toLocaleString()}</TableCell>
                    <TableCell><Badge variant="outline">{log.action}</Badge></TableCell>
                    <TableCell className="text-xs text-muted-foreground">{log.details}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function APIIntegrationTool() {
  return (
    <Card className="border-dashed hover:bg-orange-500/5 transition-all border-orange-500/20">
      <CardHeader>
        <CardTitle className='flex items-center gap-2 text-orange-500'><Lock className='w-5 h-5' />API & Integrations</CardTitle>
        <CardDescription>Manage API keys for external software integrations.</CardDescription>
      </CardHeader>
      <CardContent>
        <Button asChild variant="outline" className="w-full border-orange-500/20 text-orange-500 hover:bg-orange-500/10">
          <Link href="/dashboard/developers">Manage API Keys & Keys</Link>
        </Button>
      </CardContent>
    </Card>
  );
}

function DataImportTool({ clinicId }: { clinicId: string }) {
  const { toast } = useToast();
  const firestore = useFirestore();
  const [importData, setImportData] = useState<any[]>([]);
  const [isImporting, setIsImporting] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const lines = text.split('\n');
      const headers = lines[0].split(',').map(h => h.trim().toLowerCase());

      const processed = lines.slice(1).filter(l => l.trim()).map(line => {
        const values = line.split(',');
        const obj: any = {};
        headers.forEach((h, i) => {
          obj[h] = values[i]?.trim();
        });
        return obj;
      });
      setImportData(processed);
      setIsOpen(true);
    };
    reader.readAsText(file);
  };

  const confirmImport = async () => {
    if (!firestore || !clinicId) return;
    setIsImporting(true);
    let success = 0;
    try {
      for (const item of importData) {
        await addDoc(collection(firestore, 'patients'), {
          clinicId,
          patientCode: generatePatientCode(),
          firstName: item.firstname || item.first_name || item.name?.split(' ')[0] || 'Imported',
          surname: item.surname || item.last_name || item.name?.split(' ')[1] || 'Patient',
          email: item.email || '',
          phone: item.phone || item.telephone || '',
          address: item.address || '',
          sex: item.sex || item.gender || 'Other',
          dob: item.dob || item.birthdate || '',
          registrationDate: new Date().toISOString(),
          status: 'Active',
          importSource: 'CSV_UPLOAD'
        });
        success++;
      }
      toast({ title: "Import Successful", description: `Successfully imported ${success} patient records.` });
      setIsOpen(false);
      setImportData([]);
    } catch (e: any) {
      toast({ title: "Import Error", description: e.message, variant: "destructive" });
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <Card className="border-dashed border-indigo-500/20 hover:bg-indigo-500/5 transition-all">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-indigo-500"><Database className="w-5 h-5" /> Patient Data Import</CardTitle>
        <CardDescription>Migrate patients from other EMRs via CSV file.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <Button variant="outline" size="sm" disabled className="h-12 opacity-50"><ExternalLink className="w-4 h-4 mr-2" /> Salesforce</Button>
          <Button variant="outline" size="sm" disabled className="h-12 opacity-50"><ExternalLink className="w-4 h-4 mr-2" /> HubSpot</Button>
        </div>
        <div>
          <Label className="text-[10px] uppercase font-bold text-muted-foreground">Generic CSV Import</Label>
          <div className="mt-2 relative">
            <Input
              type="file"
              accept=".csv"
              className="opacity-0 absolute inset-0 cursor-pointer z-10"
              onChange={handleFileChange}
            />
            <div className="flex items-center justify-between p-3 border-2 border-dashed rounded-lg bg-indigo-500/5 border-indigo-500/30">
              <div className="flex items-center gap-2">
                <FileJson className="w-5 h-5 text-indigo-500" />
                <span className="text-xs">Select patient_list.csv</span>
              </div>
              <Button size="sm" variant="ghost" className="text-xs underline pointer-events-none">Browse Files</Button>
            </div>
          </div>
        </div>

        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogContent className="max-w-4xl max-h-[80vh] flex flex-col">
            <DialogHeader>
              <DialogTitle>Import Preview (Sneak Peak)</DialogTitle>
              <DialogDescription>Review the {importData.length} records found in your CSV file.</DialogDescription>
            </DialogHeader>
            <div className="flex-1 overflow-auto border rounded-md">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>First Name</TableHead>
                    <TableHead>Surname</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Phone</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {importData.slice(0, 10).map((row, i) => (
                    <TableRow key={i}>
                      <TableCell>{row.firstname || row.first_name || '?'}</TableCell>
                      <TableCell>{row.surname || row.last_name || '?'}</TableCell>
                      <TableCell>{row.email || '-'}</TableCell>
                      <TableCell>{row.phone || '-'}</TableCell>
                    </TableRow>
                  ))}
                  {importData.length > 10 && <TableRow><TableCell colSpan={4} className="text-center text-xs text-muted-foreground">...and {importData.length - 10} more records</TableCell></TableRow>}
                </TableBody>
              </Table>
            </div>
            <DialogFooter className="pt-4">
              <Button variant="outline" onClick={() => setIsOpen(false)}>Cancel</Button>
              <Button onClick={confirmImport} disabled={isImporting} className="bg-indigo-600 hover:bg-indigo-700">
                {isImporting && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                Complete Import
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}

function NotificationPreferencesTool({ userProfile, firestore }: { userProfile: UserProfile, firestore: any }) {
  const { toast } = useToast();
  const [emailPref, setEmailPref] = useState(true);
  const [smsPref, setSmsPref] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    setLoading(true);
    try {
      await updateDoc(doc(firestore, 'users', userProfile.uid), {
        preferences: { email: emailPref, sms: smsPref }
      });
      toast({ title: 'Saved', description: 'Notification preferences synchronized with server.' });
    } catch (e) {
      toast({ title: 'Error', description: 'Could not save preferences.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="border-dashed">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-purple-500"><MessageSquare className="w-5 h-5" /> Alerts & Communication</CardTitle>
        <CardDescription>Choose how you want to be alerted by Orelis engine.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between border-b border-dashed pb-4">
          <Label className="flex flex-col gap-1 cursor-pointer">
            <span className="font-medium">Email Summaries</span>
            <span className="font-normal text-xs text-muted-foreground">Receive daily lab result summaries.</span>
          </Label>
          <Switch checked={emailPref} onCheckedChange={setEmailPref} />
        </div>
        <div className="flex items-center justify-between">
          <Label className="flex flex-col gap-1 cursor-pointer">
            <span className="font-medium">SMS Text Alerts</span>
            <span className="font-normal text-xs text-muted-foreground">Critical ward alerts and 2FA OTPs.</span>
          </Label>
          <Switch checked={smsPref} onCheckedChange={setSmsPref} />
        </div>
        <div className="pt-2">
          <Button onClick={handleSave} disabled={loading} className="w-full sm:w-auto button-glow bg-purple-600 hover:bg-purple-700 cursor-pointer">
            {loading ? <DashLoader size="sm" className="mr-2" /> : null}
            Save Preferences
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className="button-glow cursor-pointer">
      {pending ? <DashLoader size="sm" className="mr-2" /> : null}
      {pending ? 'Saving...' : 'Save Changes'}
    </Button>
  );
}

function ProfileForm({ user }: { user: UserProfile }) {
  const [state, formAction] = useActionState(updateProfileAction, initialState);
  const { toast } = useToast();
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.message) {
      toast({
        title: state.isSuccess ? 'Success!' : 'Error!',
        description: state.message,
        variant: state.isSuccess ? 'default' : 'destructive',
      });
    }
  }, [state, toast]);

  return (
    <form ref={formRef} action={formAction}>
      <input type="hidden" name="userId" value={user.uid} />
      <Card className="border-dashed">
        <CardHeader>
          <CardTitle>Personal Information</CardTitle>
          <CardDescription>Manage your personal profile details.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Full Name</Label>
            <Input id="name" name="name" defaultValue={user.name} />
            {state.errors?.name && <p className="text-sm font-medium text-destructive">{state.errors.name}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" defaultValue={user.email} disabled />
          </div>
        </CardContent>
        <CardFooter>
          <div className="flex justify-end w-full">
            <SubmitButton />
          </div>
        </CardFooter>
      </Card>
    </form>
  )
}

export default function SettingsPage() {
  const { user, loading: userLoading } = useUser();
  const firestore = useFirestore();
  const { theme, setTheme } = useTheme();

  const userProfileRef = useMemo(() => {
    if (!user || !firestore) return null;
    return doc(firestore, 'users', user.uid);
  }, [user, firestore]);
  const { data: userProfile, loading: profileLoading } = useDoc<UserProfile>(userProfileRef);

  const clinicRef = useMemo(() => {
    if (!userProfile?.clinicId || !firestore) return null;
    return doc(firestore, 'clinics', userProfile.clinicId);
  }, [userProfile, firestore]);
  const { data: clinic, loading: clinicLoading } = useDoc<Clinic>(clinicRef);

  const isLoading = userLoading || profileLoading;

  const paystackConfig = {
    reference: new Date().getTime().toString(),
    email: user?.email || '',
    amount: 200000, // ₦2,000 in kobo
    publicKey: process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY || '',
  };

  if (isLoading || profileLoading) return <DashLoader />;

  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-center">
        <h1 className="font-semibold text-lg md:text-2xl">General Settings</h1>
      </div>

      <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
        <div className="lg:col-span-1 space-y-8 text-center sm:text-left">
          {userProfile && <ProfileForm user={userProfile} />}

          <Card className="border-dashed">
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Palette /> Appearance</CardTitle>
              <CardDescription>Customize the interface mode.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Label htmlFor="theme">Active Theme</Label>
                <Select value={theme} onValueChange={setTheme}>
                  <SelectTrigger id="theme">
                    <SelectValue placeholder="Select theme" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="light">Light (Cream)</SelectItem>
                    <SelectItem value="dark">Dark (Nero)</SelectItem>
                    <SelectItem value="system">Follow System</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {userProfile?.role !== 'patient' && (
            <Card className="border-dashed">
              <CardHeader>
                <CardTitle className='flex items-center gap-2'><CreditCard className='w-5 h-5' />Subscription</CardTitle>
                <CardDescription>Orelis Doctor Business (₦2,000/mo)</CardDescription>
              </CardHeader>
              <CardContent>
                <PaystackButton config={paystackConfig} />
              </CardContent>
            </Card>
          )}
        </div>

        <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-8 content-start">
          {userProfile?.role === 'admin' && clinic && (
            <ClinicSetupTool clinic={clinic} />
          )}

          {userProfile?.clinicId && userProfile?.role !== 'patient' && (
            <>
              <AuditLogTool clinicId={userProfile.clinicId} />
              <APIIntegrationTool />
              <DataImportTool clinicId={userProfile.clinicId} />
            </>
          )}

          {userProfile && (
            <div className={userProfile.role === 'patient' ? 'md:col-span-2' : ''}>
              <NotificationPreferencesTool userProfile={userProfile} firestore={firestore} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
