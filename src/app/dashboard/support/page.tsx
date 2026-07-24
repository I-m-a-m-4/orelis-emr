
'use client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Input } from "@/components/ui/input";
import { Search, Info, ShieldCheck, Zap, Stethoscope, Users, CreditCard, Layout } from "lucide-react";
import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { OrelisLogo } from "@/components/layout/orelis-logo";

import { useUser, useFirestore, useDoc } from "@/firebase";
import { doc } from "firebase/firestore";
import type { UserProfile } from "@/lib/types";

const staffFAQItems = [
    {
        category: "Getting Started",
        question: "How do I add a new patient to the system?",
        answer: "Adding a patient is the foundational step of digital records in Orelis. To begin, navigate to the **[Patients Page](/dashboard/patients)** and click the primary **Add Patient** button. You will be prompted to enter essential details including Full Name, Date of Birth, Gender, and Contact Information.\n\nUpon saving, Orelis automatically generates a unique **8-character linking code** (e.g., OR-X9J2). This code is crucial for patient privacy—it allows patients to securely connect their own portal accounts to the clinic's records without exposing sensitive global identifiers."
    },
    {
        category: "Access Control",
        question: "What is the difference between roles?",
        answer: "Orelis utilizes a sophisticated Role-Based Access Control (RBAC) system to ensure data integrity and HIPAA compliance:\n\n" +
            "• **Admin:** The highest privilege tier. Admins possess full control over clinic settings, financial configurations, staff management (hiring/deactivating), and can access all revenue analytics and audit logs.\n\n" +
            "• **Doctor:** Tailored for the clinical workflow. Doctors can create and sign clinical encounters (SOAP notes), view complete patient medical histories, order laboratory investigations, and manage their consultation queue.\n\n" +
            "• **Receptionist:** Designed for front-desk efficiency. Receptionists manage the master appointments calendar, check patients into the waitlist, update basic demographic files, and generate official payment receipts.\n\n" +
            "• **Patient:** A secure, restricted portal. Patients can view their own verified medical records, check upcoming appointments, and request new consultations. They have NO access to other patients' data or clinic staff tools."
    },
    {
        category: "Clinical Workflow",
        question: "What is the SOAP format and how should I use it?",
        answer: "Orelis implements the industry-standard **SOAP** (Subjective, Objective, Assessment, Plan) framework for clinical documentation:\n\n" +
            "1. **Subjective:** Document the patient's primary complaints, symptoms, and medical history as reported by the patient.\n" +
            "2. **Objective:** Record measurable data such as vital signs (BP, Heart Rate, Temp), physical examination findings, and verified lab results.\n" +
            "3. **Assessment:** Professional diagnosis or clinical impression based on the subjective and objective data.\n" +
            "4. **Plan:** Outline the treatment strategy, including medications prescribed, diagnostic tests ordered, and follow-up instructions.\n\nFollowing this structure enables our AI engine to provide accurate diagnostics assistance and longitudinal health tracking."
    },
    {
        category: "System Features",
        question: "How does the offline-first synchronization work?",
        answer: "Orelis is engineered for reliability in low-connectivity environments. Using an **Offline-First Synchronization Engine**, the system caches your data locally in your browser's secure storage if the internet is lost.\n\nYou can continue to see patients, write notes, and update records. A 'Sync Pending' indicator will appear in the sidebar. Once a stable connection is restored, Orelis performs an intelligent background sync, merging your local updates with the cloud database seamlessly—ensuring zero data loss."
    },
    {
        category: "Pharmacy & Billing",
        question: "How do I manage medication inventory and dispensing?",
        answer: "The **[Pharmacy Module](/dashboard/pharmacy)** closes the loop between diagnosis and treatment. When a doctor writes a prescription in an encounter, it instantly populates the pharmacist's 'Ready to Dispense' queue.\n\nPharmacists can then verify the order, check system-wide inventory levels, and mark items as dispensed. The system automatically decrements stock counts and maintains a financial audit trail for billing. Admins can set 'Low Stock Alerts' to ensure critical medications are always available."
    },
    {
        category: "Security",
        question: "Is clinical and financial data secure?",
        answer: "Security is built into our core architecture. Every piece of patient and financial data is encrypted at rest and in transit using **AES-256** standards. We utilize Firebase's enterprise-grade security rules to ensure that no user—except authorized personnel with the correct role—can even 'see' the existence of records outside their permission scope. Our infrastructure is designed to exceed HIPAA and GDPR compliance requirements for medical data handling."
    },
    {
        category: "Operations",
        question: "How do I handle staff turnover or deactivation?",
        answer: "Account security is paramount when staff depart. Admins can navigate to the **[Staff Module](/dashboard/staff)**, select the specific user profile, and change their status to 'Deactivated'. This terminates their active sessions immediately and prevents any future logins, while preserving the audit logs of all actions they performed while active at the clinic."
    },
    {
        category: "Diagnostics",
        question: "How are laboratory results integrated?",
        answer: "When a Doctor orders a lab test via the **[Laboratory](/dashboard/lab)** module, it enters the Lab Technician's task list. Once the technician performs the test and inputs the results (including attachments/images), the ordering doctor receives an automated notification. The results are instantly pinned to the patient's timeline for immediate clinical review."
    },
    {
        category: "Reporting & Exports",
        question: "How can I export my clinic's monthly financial data?",
        answer: "Admins can access the **[Analytics & Finance](/dashboard/reports)** dashboard and use the 'Export Report' feature. This generates a comprehensive breakdown of revenue streams, department performance, and recent transactions in a printer-friendly or PDF format for accounting purposes."
    },
    {
        category: "Patient Records",
        question: "How do I see a timeline of all clinical encounters for a patient?",
        answer: "Navigate to the **[Comprehensive Records](/dashboard/records)** section and search for the patient. Their profile contains a chronological timeline of all verified encounters, prescriptions, and lab results, providing a complete longitudinal view of their medical history."
    },
    {
        category: "Appointments",
        question: "What happens if I need to reschedule an appointment?",
        answer: "From the **[Appointments Calendar](/dashboard/appointments)**, you can select any confirmed appointment and choose 'Reschedule'. This allows you to pick a new time slot. The system automatically updates the doctor's schedule and can trigger an SMS/Email notification to the patient."
    },
    {
        category: "Custom Billing",
        question: "Can I create custom billing categories for specific services?",
        answer: "Yes. Admins can define custom services and price points in the **[Billing Center](/dashboard/billing)** settings. These categories can then be selected when generating invoices for consultations, procedures, or administrative tasks."
    },
    {
        category: "Staff Management",
        question: "How do I assign specific roles to new staff members?",
        answer: "When adding a new user in the **[Staff Module](/dashboard/staff)**, you select their primary role (Doctor, Receptionist, or Admin) from the dropdown. This selection immediately applies the relevant security rules and interface configurations for that user."
    },
    {
        category: "API & Integrations",
        question: "How do I connect Orelis with other systems?",
        answer: "Orelis supports an **Event-Driven Architecture** for seamless 3rd-party integrations. To build a secure, no-cost bridge between Orelis and your existing tools, follow this technical roadmap:\n\n" +
            "1. **API Integration Layer:** Create a route in your Next.js app (e.g., `/api/integrate/orelis`) that accepts incoming data from Orelis.\n" +
            "2. **Shared Secret Key:** Use a simple header token (API Key) that only your EMR and Orelis know to secure the connection.\n" +
            "3. **Conflict Resolution:** Use Firestore's `onSnapshot` or a simple 'Last Updated' timestamp to ensure the newest information wins if records are modified in both systems simultaneously.\n" +
            "4. **Transaction History (Shelf History):** Instead of overwriting medical data, our integration layer populates a dedicated `purchases` collection. This allows doctors to see a unified timeline: **Medical History** ([Clinic Visit Data]) alongside **Shelf History** ([Purchased 'Clinic Clear Cream' on Oct 10]).\n\nTo begin mapping fields, ensure you correlate Orelis `BuyerName` with our internal `Patient` identity for data parity."
    },
    {
        category: "Data Management",
        question: "What is the format for Patient Data Import?",
        answer: "Bulk importing records is easy via our **[Settings > Patient Data Import](/dashboard/settings)** tool. For a successful import, your CSV file MUST include these headers in the first row:\n\n" +
            "• **firstName**: Patient's legal first name.\n" +
            "• **surname**: Patient's family name.\n" +
            "• **dateOfBirth**: Format as YYYY-MM-DD (e.g., 1990-05-15).\n" +
            "• **gender**: Male, Female, or Other.\n" +
            "• **phone**: Primary contact number (including country code).\n" +
            "• **email**: (Optional) For digital portal access.\n" +
            "• **address**: (Optional) Residential address.\n\nOrelis will automatically generate unique **Patient Codes** for every imported record and flag any duplicate entries based on name/DOB combinations."
    },
    {
        category: "Monetization & Scaling",
        question: "How can I profit by providing an API for my clinic?",
        answer: "Orelis can be transformed into a **Platform-as-a-Service (PaaS)**, allowing you to monetize your data and integrations. Here is how it works:\n\n" +
            "1. **Subscription Tiers:** Define levels of access (e.g., **Free**, **Pro**, **Enterprise**). Higher tiers allow more monthly API requests (e.g., 50,000 requests/month for Enterprise).\n" +
            "2. **Usage-Based Billing:** Implement 'Pay-per-Call' monetization. For every data request external partners (like pharmacies or insurance providers) make to your API, you can track and bill them based on volume.\n" +
            "3. **Provisioning API:** We have implemented a sample route at `/api/v1/data`. It uses **Bearer Token Authentication** and automatically tracks usage against a clinic's assigned `quotaLimit`.\n" +
            "4. **Partnership Ecosystem:** You can sell 'Data Insights' to research organizations or pharmacies by providing anonymized analytics APIs, ensuring high-margin revenue without manual intervention."
    }
];

const patientFAQItems = [
    {
        category: "Patient Portal",
        question: "How do I link my account to my hospital records?",
        answer: "To securely access your records, you need a **Patient Unique Code** from your clinic. \n\n1. Go to **[My Records](/dashboard/my-records)**.\n2. Select your hospital from the list.\n3. Enter the 6-character code provided on your patient card or by the receptionist.\n4. Click **Link My Records** to instantly see your history."
    },
    {
        category: "Medical Records",
        question: "Can I see my lab results and prescriptions?",
        answer: "Yes! Once linked, your **[My Records](/dashboard/my-records)** page will display a chronological history of your visits. You can switch between **Visits**, **Prescriptions**, and **Appointments** tabs to see exactly what the doctor ordered and diagnosed."
    },
    {
        category: "Appointments",
        question: "How do I check my upcoming appointments?",
        answer: "Your scheduled visits are displayed right on your **[Dashboard](/dashboard)**. You can also view a full list of past and future appointments in the **Appointments** tab within your records section."
    },
    {
        category: "Privacy & Security",
        question: "Who can see my medical records?",
        answer: "Your privacy is our highest priority. Only you and authorized clinical staff at your hospital (your doctors and nurses) can access your records. Orelis uses enterprise-grade encryption and secure access codes to ensure no one else can see your health information."
    },
    {
        category: "Support",
        question: "What should I do if my Patient Code doesn't work?",
        answer: "If you encounter an error linking your records, please verify that you have selected the correct hospital. If the code still doesn't work, contact your clinic's front desk—they can instantly regenerate a new code for you from their dashboard."
    },
    {
        category: "Account Settings",
        question: "How do I change my notification preferences?",
        answer: "You can manage how you receive updates by going to **[General Settings](/dashboard/settings)**. Here, you can toggle Email or SMS notifications for important health updates and reminders."
    }
];

export default function SupportPage() {
    const { user } = useUser();
    const firestore = useFirestore();
    const [searchTerm, setSearchTerm] = useState('');

    const userProfileRef = useMemo(() => {
        if (!user || !firestore) return null;
        return doc(firestore, 'users', user.uid);
    }, [user, firestore]);
    const { data: userProfile } = useDoc<UserProfile>(userProfileRef);

    const isPatient = userProfile?.role === 'patient';
    const faqItems = isPatient ? patientFAQItems : staffFAQItems;

    const filteredFAQs = useMemo(() => {
        return faqItems.filter(faq =>
            faq.question.toLowerCase().includes(searchTerm.toLowerCase()) ||
            faq.answer.toLowerCase().includes(searchTerm.toLowerCase()) ||
            faq.category.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [searchTerm, faqItems]);

    return (
        <div className="flex flex-col gap-8 max-w-5xl mx-auto py-12 px-4 font-dm-sans min-h-screen">
            {/* Header Section */}
            <div className="text-center space-y-6">
                <div className="flex justify-center mb-4 transition-transform hover:scale-105 duration-500">
                    <OrelisLogo />
                </div>
                <h1 className="text-5xl font-black tracking-tighter bg-clip-text text-transparent bg-gradient-to-r from-primary via-primary/80 to-primary/60">
                    {isPatient ? "Patient Help Center" : "Support Intelligence"}
                </h1>
                <p className="text-muted-foreground text-xl max-w-2xl mx-auto leading-relaxed">
                    {isPatient
                        ? "Everything you need to know about managing your health records and appointments at Orelis."
                        : "Explore our comprehensive knowledge base to master the Orelis EMR ecosystem. From clinical entry to advanced financial analytics."
                    }
                </p>
            </div>

            {/* Search Section */}
            <div className="mt-8 space-y-6">
                <div className="relative group max-w-3xl mx-auto">
                    <div className="absolute inset-y-0 left-5 flex items-center pointer-events-none text-muted-foreground">
                        <Search size={24} />
                    </div>
                    <Input
                        placeholder="Search documentation, roles, workflows..."
                        className="pl-14 h-16 text-xl bg-background/50 border-2 border-dashed rounded-none focus-visible:ring-primary transition-all duration-300"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>

                <div className="grid grid-cols-1 gap-6">
                    <Card className="border-dashed overflow-hidden bg-background/40 backdrop-blur-md rounded-none">
                        <CardHeader className="bg-muted/30 border-b border-dashed px-8 py-6">
                            <CardTitle className="flex items-center gap-3 text-2xl font-bold">
                                <Info className="w-7 h-7 text-primary" />
                                {searchTerm ? `Search Results (${filteredFAQs.length})` : "Standard Documentation & FAQ"}
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-0">
                            {filteredFAQs.length > 0 ? (
                                <Accordion type="single" collapsible className="w-full">
                                    {filteredFAQs.map((faq, index) => (
                                        <AccordionItem
                                            key={index}
                                            value={`item-${index}`}
                                            className="border-b border-dashed border-muted last:border-0 hover:bg-primary/[0.02] transition-colors px-4 md:px-8"
                                        >
                                            <AccordionTrigger className="text-left font-bold py-8 hover:no-underline text-foreground data-[state=open]:text-primary transition-all group">
                                                <div className="flex flex-col gap-1">
                                                    <span className="text-xs uppercase tracking-widest text-muted-foreground font-black group-data-[state=open]:text-primary/70">
                                                        {faq.category}
                                                    </span>
                                                    <span className="text-lg md:text-xl">
                                                        {faq.question}
                                                    </span>
                                                </div>
                                            </AccordionTrigger>
                                            <AccordionContent className="pb-8 text-muted-foreground leading-relaxed text-lg font-medium">
                                                <div className="pr-4 md:pr-12 prose prose-zinc dark:prose-invert max-w-none prose-p:mb-4 prose-strong:text-foreground prose-strong:font-black">
                                                    {faq.answer.split('\n\n').map((paragraph, i) => (
                                                        <p key={i}>
                                                            {paragraph.split('\n').map((line, j) => (
                                                                <span key={j} className="block">
                                                                    {line.startsWith('• ') ? (
                                                                        <span className="flex items-start gap-3 mt-4 group">
                                                                            <span className="w-2 h-2 rounded-full bg-primary mt-2 flex-shrink-0 group-hover:scale-125 transition-transform" />
                                                                            <span dangerouslySetInnerHTML={{ __html: line.replace('• ', '').replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') }} />
                                                                        </span>
                                                                    ) : (
                                                                        <span dangerouslySetInnerHTML={{ __html: line.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') }} />
                                                                    )}
                                                                </span>
                                                            ))}
                                                        </p>
                                                    ))}
                                                </div>
                                            </AccordionContent>
                                        </AccordionItem>
                                    ))}
                                </Accordion>
                            ) : (
                                <div className="p-24 text-center space-y-6">
                                    <div className="w-20 h-20 bg-muted/50 rounded-none flex items-center justify-center mx-auto mb-4">
                                        <Search className="w-10 h-10 text-muted-foreground/30" />
                                    </div>
                                    <div>
                                        <p className="text-xl font-bold text-foreground">No results found</p>
                                        <p className="text-muted-foreground mt-2">We couldn't find any documentation matching "{searchTerm}". Try simpler keywords or roles.</p>
                                    </div>
                                    <Button
                                        variant="outline"
                                        className="rounded-none px-8 hover:bg-primary hover:text-white transition-all border-dashed"
                                        onClick={() => setSearchTerm('')}
                                    >
                                        Clear Search
                                    </Button>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>

            <div className="mt-16 text-center space-y-4 p-12 bg-gradient-to-b from-primary/[0.03] to-transparent rounded-none border border-dashed border-primary/20">
                <h2 className="text-2xl font-black text-foreground">Need direct human assistance?</h2>
                <p className="text-muted-foreground text-lg">
                    Contact our clinical support team at <span className="text-primary font-bold">support@orelis.app</span> or use the floating AI guide for instant real-time help.
                </p>
                <div className="pt-4 flex justify-center gap-4">
                    <Badge variant="secondary" className="px-4 py-1 rounded-none text-xs font-black uppercase tracking-widest bg-emerald-500/10 text-emerald-600 border-none">
                        99.9% Uptime
                    </Badge>
                    <Badge variant="secondary" className="px-4 py-1 rounded-none text-xs font-black uppercase tracking-widest bg-blue-500/10 text-blue-600 border-none">
                        24/7 Monitoring
                    </Badge>
                </div>
            </div>
        </div>
    );
}
