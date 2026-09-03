'use client';

import { useMemo, useState } from 'react';
import { addDoc, collection, doc, updateDoc } from 'firebase/firestore';
import { Download, FileText, Plus, Trash2 } from 'lucide-react';

import { useFirestore } from '@/firebase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
    Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { DashLoader } from '@/components/ui/dash-loader';
import type { Patient } from '@/lib/types';

/**
 * Invoice creation, viewing and export.
 *
 * All three controls on the billing page were inert: "New Patient Invoice" had no
 * handler, and the per-row download and view icons did nothing — so an invoice
 * could be listed but never raised, read or given to a patient.
 *
 * ## The stored shape
 *
 * `invoices` has no interface in src/lib/types.ts; the fields written here are the
 * ones the rest of the app already reads — `amount` and `status` (billing table),
 * `date` (the offline sync target's ordering field) and `createdAt` (the billing
 * page's own ordering field). Both date fields are written deliberately: they are
 * separately indexed and a record missing either drops out of one of those two
 * orderings entirely.
 *
 * `status` is stored lowercase (`paid` / `unpaid`) because that is what the
 * existing table and the dashboard's collection-rate metric compare against.
 */

export interface InvoiceLine {
    description: string;
    quantity: number;
    unitPrice: number;
}

const naira = (n: number) => `₦${(Math.round(n * 100) / 100).toLocaleString()}`;

function lineTotal(line: InvoiceLine): number {
    return (Number(line.quantity) || 0) * (Number(line.unitPrice) || 0);
}

function invoiceTotal(lines: InvoiceLine[]): number {
    return lines.reduce((acc, l) => acc + lineTotal(l), 0);
}

/** A short human-quotable reference. Not an id — the document id remains the key. */
function invoiceRef(invoice: any): string {
    const stamp = invoice?.createdAt ?? invoice?.date;
    const year = stamp ? new Date(stamp).getFullYear() : new Date().getFullYear();
    return `INV-${year}-${String(invoice?.id ?? '').slice(-6).toUpperCase()}`;
}

/* ------------------------------------------------------------------ new invoice */

export function NewInvoiceDialog({
    clinicId,
    patients,
}: {
    clinicId?: string;
    patients: Patient[] | null;
}) {
    const firestore = useFirestore();
    const { toast } = useToast();
    const [open, setOpen] = useState(false);
    const [saving, setSaving] = useState(false);
    const [patientId, setPatientId] = useState('');
    const [status, setStatus] = useState<'unpaid' | 'paid'>('unpaid');
    const [lines, setLines] = useState<InvoiceLine[]>([
        { description: '', quantity: 1, unitPrice: 0 },
    ]);

    const total = useMemo(() => invoiceTotal(lines), [lines]);
    const patient = patients?.find((p) => p.id === patientId);

    const updateLine = (index: number, patch: Partial<InvoiceLine>) => {
        setLines((prev) => prev.map((l, i) => (i === index ? { ...l, ...patch } : l)));
    };

    const reset = () => {
        setPatientId('');
        setStatus('unpaid');
        setLines([{ description: '', quantity: 1, unitPrice: 0 }]);
    };

    const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (!firestore || !clinicId) return;

        const billable = lines.filter((l) => l.description.trim() && lineTotal(l) > 0);
        if (!patient) {
            toast({ title: 'Select a patient', description: 'An invoice must be raised against a patient.', variant: 'destructive' });
            return;
        }
        if (!billable.length) {
            toast({ title: 'Nothing to bill', description: 'Add at least one line with a description and an amount.', variant: 'destructive' });
            return;
        }

        setSaving(true);
        const now = new Date().toISOString();

        try {
            await addDoc(collection(firestore, 'invoices'), {
                clinicId,
                patientId: patient.id,
                patientName: `${patient.firstName} ${patient.surname}`.trim(),
                items: billable,
                amount: invoiceTotal(billable),
                status,
                // Both, on purpose — see the module comment.
                date: now,
                createdAt: now,
                updatedAt: now,
            });

            toast({ title: 'Invoice raised', description: `${naira(invoiceTotal(billable))} billed to ${patient.firstName}.` });
            reset();
            setOpen(false);
        } catch (err: any) {
            console.error('Invoice create failed:', err);
            toast({ title: 'Could not save', description: err?.message ?? 'Unknown error.', variant: 'destructive' });
        } finally {
            setSaving(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) reset(); }}>
            <DialogTrigger asChild>
                <Button className="button-glow">
                    <Plus className="mr-2 h-4 w-4" /> New Patient Invoice
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[640px]">
                <form onSubmit={handleSubmit}>
                    <DialogHeader>
                        <DialogTitle>Raise an invoice</DialogTitle>
                        <DialogDescription>Bill a patient for services, procedures or dispensed items.</DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-4">
                        <div className="grid gap-4 sm:grid-cols-2">
                            <div className="space-y-2">
                                <Label htmlFor="patient">Patient</Label>
                                <Select value={patientId} onValueChange={setPatientId}>
                                    <SelectTrigger id="patient">
                                        <SelectValue placeholder="Select a patient" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {patients?.length
                                            ? patients.map((p) => (
                                                <SelectItem key={p.id} value={p.id}>
                                                    {p.firstName} {p.surname}
                                                    {p.patientCode ? ` · ${p.patientCode}` : ''}
                                                </SelectItem>
                                            ))
                                            : <SelectItem value="" disabled>No patients registered yet</SelectItem>}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="status">Status</Label>
                                <Select value={status} onValueChange={(v) => setStatus(v as 'paid' | 'unpaid')}>
                                    <SelectTrigger id="status"><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="unpaid">Unpaid</SelectItem>
                                        <SelectItem value="paid">Paid</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label>Line items</Label>
                            <div className="space-y-2">
                                {lines.map((line, i) => (
                                    <div key={i} className="flex items-end gap-2">
                                        <div className="flex-1">
                                            <Input
                                                placeholder="Description"
                                                value={line.description}
                                                onChange={(e) => updateLine(i, { description: e.target.value })}
                                                aria-label={`Line ${i + 1} description`}
                                            />
                                        </div>
                                        <div className="w-20">
                                            <Input
                                                type="number"
                                                min="1"
                                                value={line.quantity}
                                                onChange={(e) => updateLine(i, { quantity: Number(e.target.value) })}
                                                aria-label={`Line ${i + 1} quantity`}
                                            />
                                        </div>
                                        <div className="w-28">
                                            <Input
                                                type="number"
                                                min="0"
                                                step="0.01"
                                                value={line.unitPrice}
                                                onChange={(e) => updateLine(i, { unitPrice: Number(e.target.value) })}
                                                aria-label={`Line ${i + 1} unit price`}
                                            />
                                        </div>
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="icon"
                                            className="text-destructive shrink-0"
                                            onClick={() => setLines((prev) => prev.filter((_, j) => j !== i))}
                                            disabled={lines.length === 1}
                                            aria-label={`Remove line ${i + 1}`}
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                ))}
                            </div>
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="border-dashed"
                                onClick={() => setLines((prev) => [...prev, { description: '', quantity: 1, unitPrice: 0 }])}
                            >
                                <Plus className="mr-2 h-3.5 w-3.5" /> Add line
                            </Button>
                        </div>

                        <div className="flex items-center justify-between border-t border-dashed pt-3">
                            <span className="text-sm font-medium text-muted-foreground">Total</span>
                            <span className="text-xl font-bold tabular-nums">{naira(total)}</span>
                        </div>
                    </div>

                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={saving}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={saving}>
                            {saving ? <DashLoader size="sm" className="text-white" /> : 'Raise invoice'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}

/* ------------------------------------------------------------------- view / PDF */

/**
 * Render an invoice to a PDF and hand it to the browser.
 *
 * `jspdf` is imported dynamically: it is a large dependency that only matters at
 * the moment someone asks for a download, and pulling it into the billing page's
 * first load would cost every visitor for a button most never press.
 */
async function downloadInvoicePdf(invoice: any, clinicName: string) {
    const { default: JsPDF } = await import('jspdf');
    const pdf = new JsPDF({ unit: 'pt', format: 'a4' });

    const left = 48;
    let y = 64;

    pdf.setFontSize(20).setFont('helvetica', 'bold');
    pdf.text(clinicName || 'Clinic Invoice', left, y);

    y += 24;
    pdf.setFontSize(10).setFont('helvetica', 'normal');
    pdf.text(`Invoice ${invoiceRef(invoice)}`, left, y);

    y += 14;
    const issued = invoice.createdAt ?? invoice.date;
    pdf.text(`Issued: ${issued ? new Date(issued).toLocaleDateString() : '—'}`, left, y);

    y += 14;
    pdf.text(`Patient: ${invoice.patientName ?? '—'}`, left, y);

    y += 14;
    pdf.text(`Status: ${String(invoice.status ?? 'unpaid').toUpperCase()}`, left, y);

    y += 28;
    pdf.setFont('helvetica', 'bold');
    pdf.text('Description', left, y);
    pdf.text('Qty', 380, y, { align: 'right' });
    pdf.text('Unit', 450, y, { align: 'right' });
    pdf.text('Amount', 548, y, { align: 'right' });

    y += 8;
    pdf.setLineWidth(0.5).line(left, y, 548, y);
    y += 18;
    pdf.setFont('helvetica', 'normal');

    const items: InvoiceLine[] = Array.isArray(invoice.items) ? invoice.items : [];

    if (items.length) {
        for (const item of items) {
            // Long descriptions wrap rather than running off the page edge.
            const wrapped = pdf.splitTextToSize(item.description || '—', 300) as string[];
            pdf.text(wrapped, left, y);
            pdf.text(String(item.quantity ?? 1), 380, y, { align: 'right' });
            pdf.text(naira(item.unitPrice ?? 0), 450, y, { align: 'right' });
            pdf.text(naira(lineTotal(item)), 548, y, { align: 'right' });
            y += Math.max(wrapped.length * 12, 18);

            if (y > 740) { pdf.addPage(); y = 64; }
        }
    } else {
        // Older invoices were stored as a bare `amount` with no breakdown.
        pdf.text('Services rendered', left, y);
        pdf.text(naira(invoice.amount ?? 0), 548, y, { align: 'right' });
        y += 18;
    }

    y += 6;
    pdf.line(left, y, 548, y);
    y += 20;
    pdf.setFont('helvetica', 'bold').setFontSize(12);
    pdf.text('Total', 450, y, { align: 'right' });
    pdf.text(naira(invoice.amount ?? invoiceTotal(items)), 548, y, { align: 'right' });

    pdf.save(`${invoiceRef(invoice)}.pdf`);
}

export function DownloadInvoiceButton({ invoice, clinicName }: { invoice: any; clinicName: string }) {
    const { toast } = useToast();
    const [busy, setBusy] = useState(false);

    return (
        <Button
            variant="ghost"
            size="icon"
            disabled={busy}
            title={`Download ${invoiceRef(invoice)} as PDF`}
            onClick={async () => {
                setBusy(true);
                try {
                    await downloadInvoicePdf(invoice, clinicName);
                } catch (err: any) {
                    console.error('Invoice PDF failed:', err);
                    toast({ title: 'Could not build the PDF', description: err?.message, variant: 'destructive' });
                } finally {
                    setBusy(false);
                }
            }}
        >
            {busy ? <DashLoader size="sm" /> : <Download className="h-4 w-4" />}
            <span className="sr-only">Download {invoiceRef(invoice)}</span>
        </Button>
    );
}

export function ViewInvoiceDialog({ invoice, clinicName }: { invoice: any; clinicName: string }) {
    const firestore = useFirestore();
    const { toast } = useToast();
    const [open, setOpen] = useState(false);

    const items: InvoiceLine[] = Array.isArray(invoice.items) ? invoice.items : [];
    const isPaid = String(invoice.status ?? '').toLowerCase() === 'paid';

    const markPaid = () => {
        if (!firestore) return;
        void updateDoc(doc(firestore, 'invoices', invoice.id), {
            status: 'paid',
            paidAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        }).catch((err) => {
            console.error('Could not mark invoice paid:', err);
            toast({ title: 'Update failed', description: err?.message, variant: 'destructive' });
        });
        toast({ title: 'Marked as paid', description: `${invoiceRef(invoice)} settled.` });
        setOpen(false);
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="ghost" size="icon" title={`View ${invoiceRef(invoice)}`}>
                    <FileText className="h-4 w-4" />
                    <span className="sr-only">View {invoiceRef(invoice)}</span>
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[560px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        {invoiceRef(invoice)}
                        <Badge
                            variant={isPaid ? 'default' : 'outline'}
                            className={isPaid ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' : ''}
                        >
                            {isPaid ? 'Paid' : 'Unpaid'}
                        </Badge>
                    </DialogTitle>
                    <DialogDescription>
                        {invoice.patientName ?? 'Unknown patient'} ·{' '}
                        {invoice.createdAt || invoice.date
                            ? new Date(invoice.createdAt ?? invoice.date).toLocaleDateString()
                            : 'No date recorded'}
                    </DialogDescription>
                </DialogHeader>

                <div className="py-2">
                    {items.length ? (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Description</TableHead>
                                    <TableHead className="text-right">Qty</TableHead>
                                    <TableHead className="text-right">Unit</TableHead>
                                    <TableHead className="text-right">Amount</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {items.map((item, i) => (
                                    <TableRow key={i}>
                                        <TableCell>{item.description}</TableCell>
                                        <TableCell className="text-right tabular-nums">{item.quantity}</TableCell>
                                        <TableCell className="text-right tabular-nums">{naira(item.unitPrice)}</TableCell>
                                        <TableCell className="text-right tabular-nums">{naira(lineTotal(item))}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    ) : (
                        <p className="text-sm text-muted-foreground py-4">
                            This invoice was recorded as a single amount with no itemised breakdown.
                        </p>
                    )}

                    <div className="flex items-center justify-between border-t border-dashed mt-4 pt-3">
                        <span className="text-sm font-medium text-muted-foreground">Total</span>
                        <span className="text-xl font-bold tabular-nums">
                            {naira(invoice.amount ?? invoiceTotal(items))}
                        </span>
                    </div>
                </div>

                <DialogFooter className="gap-2">
                    {!isPaid && (
                        <Button variant="outline" onClick={markPaid}>Mark as paid</Button>
                    )}
                    <DownloadInvoiceButton invoice={invoice} clinicName={clinicName} />
                    <Button onClick={() => setOpen(false)}>Close</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
