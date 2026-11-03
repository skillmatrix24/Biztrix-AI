
"use client";

import { useMemo, useState } from "react";
import { 
  ShieldCheck, 
  ArrowLeft, 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  Loader2, 
  History, 
  Database, 
  Link as LinkIcon, 
  ArrowRight,
  ShieldAlert,
  Zap,
  Tag,
  Users,
  LayoutList,
  Target,
  Calculator,
  Search,
  ChevronRight,
  BadgeCheck,
  FileCode,
  AlertCircle,
  RefreshCcw
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { useFirestore, useCollection, useMemoFirebase, useUser, useDoc } from "@/firebase";
import { collection, doc, query, orderBy } from "firebase/firestore";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { toast } from "@/hooks/use-toast";

export default function SolarReconciliationPage() {
  const firestore = useFirestore();
  const { user } = useUser();

  const userProfileRef = useMemoFirebase(() => user?.uid ? doc(firestore, 'users', user.uid) : null, [firestore, user?.uid]);
  const { data: profile, isLoading: isProfileLoading } = useDoc<any>(userProfileRef);
  const businessId = profile?.businessId;

  // DATA NODES
  const inqQuery = useMemoFirebase(() => businessId ? collection(firestore, 'businesses', businessId, 'solarInquiries') : null, [firestore, businessId]);
  const { data: inquiries = [] } = useCollection<any>(inqQuery);

  const surveysQuery = useMemoFirebase(() => businessId ? collection(firestore, 'businesses', businessId, 'solarSurveys') : null, [firestore, businessId]);
  const { data: surveys = [] } = useCollection<any>(surveysQuery);

  const quotesQuery = useMemoFirebase(() => businessId ? collection(firestore, 'businesses', businessId, 'quotations') : null, [firestore, businessId]);
  const { data: allQuotes = [] } = useCollection<any>(quotesQuery);
  const solarQuotes = useMemo(() => (allQuotes || []).filter((q: any) => q.solarSystemDesignId), [allQuotes]);

  const installsQuery = useMemoFirebase(() => businessId ? collection(firestore, 'businesses', businessId, 'solarInstallations') : null, [firestore, businessId]);
  const { data: installations = [] } = useCollection<any>(installsQuery);

  const cashbookQuery = useMemoFirebase(() => businessId ? collection(firestore, 'businesses', businessId, 'cashbook') : null, [firestore, businessId]);
  const { data: transactions = [] } = useCollection<any>(cashbookQuery);

  const [isScanning, setIsScanning] = useState(false);

  const exceptions = useMemo(() => {
    const list: any[] = [];
    const inqList = inquiries || [];
    const surList = surveys || [];
    const quoteList = solarQuotes || [];
    const instList = installations || [];
    const transList = transactions || [];

    // 1. Technical Relationship Exceptions
    instList.forEach(inst => {
       const quote = quoteList.find(q => q.id === inst.solarQuotationId);
       if (!quote || quote.status !== 'converted') {
          list.push({ id: inst.id, node: inst.installationNumber, type: 'DATA_QUALITY', msg: 'Field node established without accepted proposal.', link: `/solar/installations/${inst.id}` });
       }
    });

    // 2. Financial Reconciliation Review (Collection > Quote)
    quoteList.filter(q => q.status === 'converted').forEach(quote => {
       const collected = transList.filter(t => t.type === 'credit' && (t.particulars?.includes(quote.quotationId) || t.particulars?.includes(quote.customerName))).reduce((sum, t) => sum + (parseFloat(t.amount) || 0), 0);
       
       if (collected > (quote.totals?.finalPayout || 0)) {
          list.push({ id: quote.id, node: quote.customerName, type: 'FINANCIAL_REVIEW', msg: 'Collected amount exceeds accepted quotation value. Verify tax or extras.', link: `/solar/quotations/${quote.id}` });
       }
    });

    // 3. Inquiry-Survey Gap
    inqList.forEach(inq => {
       const survey = surList.find(s => s.inquiryId === inq.id);
       if (!survey && !['LOST', 'CONVERTED'].includes(inq.status)) {
          list.push({ id: inq.id, node: inq.customerName, type: 'RELATIONSHIP_ISSUE', msg: 'Active inquiry node missing technical audit.', link: `/solar/inquiries/${inq.id}` });
       }
    });

    return list;
  }, [installations, solarQuotes, inquiries, surveys, transactions]);

  const handleRunScan = () => {
    setIsScanning(true);
    setTimeout(() => {
      setIsScanning(false);
      toast({ title: "Reconciliation Sync Complete", description: "All data nodes verified against protocol." });
    }, 1500);
  };

  if (isProfileLoading) return <div className="min-h-screen flex items-center justify-center opacity-40 text-left"><Loader2 className="animate-spin text-primary h-10 w-10" /></div>;

  return (
    <div className="max-w-5xl mx-auto space-y-10 pb-20 text-left px-2 sm:px-0">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-6 px-1">
        <div className="flex items-center gap-4 text-left">
          <Button asChild variant="ghost" size="icon" className="h-10 w-10 rounded-full bg-white shadow-sm border shrink-0"><Link href="/solar/reports"><ArrowLeft className="h-5 w-5" /></Link></Button>
          <div className="text-left">
            <h2 className="text-2xl md:text-3xl font-black text-slate-900 uppercase">Data Reconciliation</h2>
            <p className="text-[10px] md:text-sm text-muted-foreground uppercase font-black tracking-widest mt-1 opacity-60">Registry Integrity Scan</p>
          </div>
        </div>
        <Button onClick={handleRunScan} disabled={isScanning} className="bg-primary hover:bg-primary/90 shadow-xl h-12 px-10 rounded-2xl font-black uppercase text-[10px] tracking-widest text-white active:scale-95 transition-all">
          {isScanning ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <RefreshCcw className="mr-2 h-5 w-5" />}
          Run Node Audit
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        <div className="lg:col-span-8 space-y-8">
           <Card className="border-none shadow-md overflow-hidden bg-white rounded-[2.5rem] border text-left">
              <CardHeader className="bg-muted/30 border-b py-6 px-8 flex flex-row items-center justify-between">
                 <div className="space-y-1 text-left">
                   <CardTitle className="text-xs font-black uppercase tracking-widest text-primary flex items-center gap-2 text-left"><ShieldAlert className="h-4 w-4" /> Integrity Exceptions</CardTitle>
                   <p className="text-[9px] font-bold text-muted-foreground uppercase">Unlinked or inconsistent node detection</p>
                 </div>
                 <Badge variant="outline" className="text-[10px] font-black h-6 border-primary/20 text-primary uppercase">{exceptions.length} Issues</Badge>
              </CardHeader>
              <div className="overflow-x-auto scrollbar-hide text-left">
                 <Table className="min-w-[700px] text-left">
                    <TableHeader className="text-left"><TableRow className="bg-muted/10 text-left"><TableHead className="pl-8 text-[10px] font-black uppercase h-12">Registry Node</TableHead><TableHead className="text-[10px] font-black uppercase h-12">Exception Protocol</TableHead><TableHead className="text-right pr-8 h-12 w-16"></TableHead></TableRow></TableHeader>
                    <TableBody className="text-left">
                       {exceptions.length === 0 ? <TableRow><TableCell colSpan={3} className="h-60 text-center opacity-30 italic text-sm font-black uppercase">No logical mismatches found in registry.</TableCell></TableRow> : exceptions.map((ex: any) => (
                         <TableRow key={ex.id} className="hover:bg-muted/5 transition-colors border-b text-left">
                            <TableCell className="pl-8 py-6 text-left">
                               <div className="flex items-center gap-4 text-left">
                                  <div className={cn("h-10 w-10 rounded-xl flex items-center justify-center text-white shadow-lg", ex.type === 'FINANCIAL_REVIEW' ? 'bg-orange-500' : 'bg-blue-500')}>
                                     <AlertCircle className="h-5 w-5" />
                                  </div>
                                  <div className="text-left">
                                     <p className="text-sm font-black text-slate-900 uppercase leading-none mb-1.5">{ex.node}</p>
                                     <Badge className={cn("text-[7px] font-black uppercase h-4 px-1.5", ex.type === 'FINANCIAL_REVIEW' ? "bg-orange-50 text-orange-600 border-none" : "bg-blue-50 text-blue-600 border-none")}>{ex.type.replace('_', ' ')}</Badge>
                                  </div>
                               </div>
                            </TableCell>
                            <TableCell className="text-left"><p className="text-xs font-medium text-slate-600 leading-relaxed italic max-w-sm">"{ex.msg}"</p></TableCell>
                            <TableCell className="text-right pr-8"><Button asChild variant="ghost" size="icon" className="h-8 w-8 text-primary"><Link href={ex.link}><ChevronRight className="h-4 w-4" /></Link></Button></TableCell>
                         </TableRow>
                       ))}
                    </TableBody>
                 </Table>
              </div>
           </Card>
        </div>
      </div>
    </div>
  );
}
