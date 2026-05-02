import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  FileText,
  Download,
  Eye,
  Search,
  IndianRupee,
  CheckCircle,
  Clock,
  AlertTriangle,
  Mail,
  Filter,
  Users,
  ChevronRight,
  TrendingUp,
  CreditCard,
  LayoutGrid,
  MousePointer2,
  CheckCircle2 as CheckIcon
} from 'lucide-react';
import { motion, AnimatePresence } from "framer-motion";
import { useTheme } from "@/context/ThemeContext";
import DashboardCard from '@/components/common/DashboardCard';
import { showSuccessAlert, showErrorAlert } from '../../utils/sweetalert';
import { 
  Skeleton, 
  SkeletonStatsGrid, 
  SkeletonTable, 
  SkeletonList, 
  SkeletonPageHeader,
  SkeletonCard
} from "@/components/ui/skeleton";

import {
  getFeesManagerFilters,
  getFeesManagerSemesters,
  getFeesManagerSections,
  getFeesManagerStats,
  getInvoices,
  recordPayment,
  downloadInvoice as downloadInvoiceApi,
  getInvoiceDetails
} from "../../utils/fees_manager_api";

interface Invoice {
  id: number;
  invoice_number: string;
  student: {
    id: number;
    name: string;
    usn: string;
    department: string;
    semester: number;
  };
  fee_assignment: {
    id: number;
    template: {
      name: string;
      fee_type: string;
    };
    academic_year: string;
  } | null;
  total_amount: number;
  paid_amount: number;
  pending_amount: number;
  due_date: string;
  status: 'unpaid' | 'partially_paid' | 'paid' | 'overdue';
  created_at: string;
  academic_year?: string;
}

interface Payment {
  id: number;
  amount: number;
  payment_date: string;
  payment_method: string;
  transaction_id?: string;
  status: string;
}

interface FilterData {
  batches: { id: number; name: string }[];
  branches: { id: number; name: string; code: string }[];
  admission_modes: string[];
}

const InvoiceManagement: React.FC = () => {
  const { theme } = useTheme();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [invoicesMeta, setInvoicesMeta] = useState<any | null>(null);
  const [statsData, setStatsData] = useState<any | null>(null);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false);
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
  const [isSubmittingPayment, setIsSubmittingPayment] = useState(false);
  const [paymentForm, setPaymentForm] = useState({
    amount: '',
    mode: 'cash',
    transactionId: ''
  });

  // Cascading Filter states
  const [selectedFilters, setSelectedFilters] = useState({
    batchId: '',
    branchId: '',
    semesterId: '',
    sectionId: '',
    admissionMode: '',
    status: 'all',
    search: ''
  });

  const [filterData, setFilterData] = useState<FilterData>({ batches: [], branches: [], admission_modes: [] });
  const [semesters, setSemesters] = useState<{ id: number; number: number; name: string }[]>([]);
  const [sections, setSections] = useState<{ id: number; name: string }[]>([]);

  // Initial data fetch
  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const filterJson = await getFeesManagerFilters();
        if (filterJson.success) {
          setFilterData(filterJson.data);
        }
      } catch (err) {
        console.error("Error fetching filters:", err);
      }
    };
    fetchInitialData();
  }, []);

  // Fetch semesters when branch changes
  useEffect(() => {
    if (!selectedFilters.branchId || selectedFilters.branchId === 'all_branches') {
      setSemesters([]);
      return;
    }
    const fetchSem = async () => {
      const res = await getFeesManagerSemesters(selectedFilters.branchId);
      if (res.success) {
        setSemesters(res.data || []);
      }
    };
    fetchSem();
  }, [selectedFilters.branchId]);

  // Fetch sections when semester changes
  useEffect(() => {
    if (!selectedFilters.semesterId || !selectedFilters.branchId) {
      setSections([]);
      return;
    }
    const fetchSec = async () => {
      const res = await getFeesManagerSections(selectedFilters.branchId, selectedFilters.semesterId);
      if (res.success) {
        setSections(res.data || []);
      }
    };
    fetchSec();
  }, [selectedFilters.semesterId, selectedFilters.branchId]);

  // Fetch invoices based on filters
  useEffect(() => {
    const allFiltersSelected =
      selectedFilters.batchId &&
      selectedFilters.branchId &&
      selectedFilters.semesterId &&
      selectedFilters.sectionId &&
      selectedFilters.admissionMode;

    if (allFiltersSelected || selectedFilters.search.length > 2) {
      fetchInvoices(1);
    } else {
      setInvoices([]);
      setInvoicesMeta(null);
      setLoading(false);
    }
  }, [selectedFilters]);

  // Fetch stats when filters change
  useEffect(() => {
    const allFiltersSelected =
      selectedFilters.batchId &&
      selectedFilters.branchId &&
      selectedFilters.semesterId &&
      selectedFilters.sectionId &&
      selectedFilters.admissionMode;

    const noFiltersSelected =
      !selectedFilters.batchId &&
      !selectedFilters.branchId &&
      !selectedFilters.semesterId &&
      !selectedFilters.sectionId &&
      !selectedFilters.admissionMode;

    if (allFiltersSelected || noFiltersSelected) {
      fetchStats();
    }
  }, [selectedFilters]);

  const fetchStats = async () => {
    try {
      const params = {
        ...(selectedFilters.batchId && { batch_id: selectedFilters.batchId }),
        ...(selectedFilters.branchId && { branch_id: selectedFilters.branchId }),
        ...(selectedFilters.semesterId && { semester_id: selectedFilters.semesterId }),
        ...(selectedFilters.sectionId && { section_id: selectedFilters.sectionId }),
        ...(selectedFilters.admissionMode && { admission_mode: selectedFilters.admissionMode }),
      };

      const res = await getFeesManagerStats(params);
      if (res.success) {
        setStatsData(res.data);
      }
    } catch (e) {
      console.error("Error fetching stats:", e);
    }
  };

  const fetchInvoices = async (page: number = 1) => {
    try {
      setLoading(true);
      const params = {
        page: page.toString(),
        page_size: '50',
        ...(selectedFilters.batchId && { batch_id: selectedFilters.batchId }),
        ...(selectedFilters.branchId && { branch_id: selectedFilters.branchId }),
        ...(selectedFilters.semesterId && { semester_id: selectedFilters.semesterId }),
        ...(selectedFilters.sectionId && { section_id: selectedFilters.sectionId }),
        ...(selectedFilters.admissionMode && { admission_mode: selectedFilters.admissionMode }),
        ...(selectedFilters.status !== 'all' && { status: selectedFilters.status }),
        ...(selectedFilters.search && { search: selectedFilters.search })
      };

      const json = await getInvoices(params);

      if (!json.success) throw new Error(json.message || 'Failed to fetch invoices');

      const list = json.data || [];
      const meta = json.meta || null;

      // Normalization
      const normalized = list.map((inv: any) => ({
        ...inv,
        total_amount: (inv.total_amount_cents ?? 0) / 100,
        paid_amount: (inv.paid_amount_cents ?? 0) / 100,
        pending_amount: (inv.pending_amount_cents ?? 0) / 100,
      }));

      setInvoices(normalized);
      setInvoicesMeta(meta);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const fetchInvoiceDetails = async (invoiceId: number) => {
    try {
      const res = await getInvoiceDetails(invoiceId);

      if (!res.success) throw new Error(res.message || 'Failed to fetch invoice details');

      const inv = res.data || {};

      const normalizedInvoice = {
        ...inv,
        total_amount: (inv.total_amount_cents ?? 0) / 100,
        paid_amount: (inv.paid_amount_cents ?? 0) / 100,
        pending_amount: (inv.pending_amount_cents ?? 0) / 100,
      };

      const normalizedPayments = (inv.payments || []).map((p: any) => ({
        ...p,
        amount: (p.amount_cents ?? 0) / 100,
      }));

      setSelectedInvoice(normalizedInvoice);
      setPayments(normalizedPayments);
      setIsDetailsDialogOpen(true);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to fetch invoice details';
      setError(msg);
      toast({
        variant: "destructive",
        title: "Error",
        description: msg
      });
      console.error("fetchInvoiceDetails error:", err);
    }
  };

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedInvoice) return;

    try {
      setIsSubmittingPayment(true);
      const res = await recordPayment({
        invoice_id: selectedInvoice.id,
        amount: paymentForm.amount,
        mode: paymentForm.mode,
        transaction_id: paymentForm.transactionId
      });

      if (!res.success) {
        throw new Error(res.message || 'Failed to record payment');
      }

      setIsPaymentDialogOpen(false);
      setPaymentForm({ amount: '', mode: 'cash', transactionId: '' });
      fetchInvoices(invoicesMeta?.page || 1);
      fetchStats();
      showSuccessAlert('Success!', 'Payment recorded successfully!');
    } catch (err) {
      showErrorAlert('Error', err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsSubmittingPayment(false);
    }
  };
  const openPaymentDialog = (inv: any) => {
    setSelectedInvoice(inv);
    setPaymentForm({
      amount: (inv.pending_amount_cents / 100).toString(),
      mode: 'cash',
      transactionId: ''
    });
    setIsPaymentDialogOpen(true);
  };

  const downloadInvoice = async (invoiceId: number) => {
    try {
      const json = await downloadInvoiceApi(invoiceId);
      if (!json.success) throw new Error(json.message || 'Failed to download invoice');

      if (json.data?.download_url) {
        window.open(`${window.location.origin}${json.data.download_url}`, '_blank');
      }
    } catch (err) {
      setError('Failed to initiate download');
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
    }).format(amount);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'paid':
        return <Badge className="bg-green-100 text-green-700 hover:bg-green-100 border-green-200">Paid</Badge>;
      case 'partially_paid':
        return <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100 border-blue-200">Partial</Badge>;
      case 'overdue':
        return <Badge className="bg-red-100 text-red-700 hover:bg-red-100 border-red-200">Overdue</Badge>;
      default:
        return <Badge variant="secondary">Unpaid</Badge>;
    }
  };

  return (
    <div>
      <Card>
        <CardHeader className="border-b bg-muted/20 pb-6 px-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <CardTitle>
                Invoice Management
              </CardTitle>
              <p className="text-muted-foreground mt-1 text-sm">Track and manage student fee payments and collections</p>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-6">
          {/* Stats Overview */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <DashboardCard
              title="Total Invoices"
              value={statsData?.total_invoices || 0}
              description="Generated for this session"
              icon={<FileText className="h-5 w-5" />}
            />
            <DashboardCard
              title="Collection"
              value={formatCurrency((statsData?.total_collections_cents || 0) / 100)}
              description="Total revenue collected"
              icon={<TrendingUp className="h-5 w-5" />}
            />
            <DashboardCard
              title="Outstanding"
              value={formatCurrency((statsData?.outstanding_amount_cents || 0) / 100)}
              description="Pending fee balance"
              icon={<Clock className="h-5 w-5" />}
            />
            <DashboardCard
              title="Active Templates"
              value={statsData?.active_fee_structures || 0}
              description="Templates currently assigned"
              icon={<Users className="h-5 w-5" />}
            />
          </div>

          {/* Cascading Filters Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-6">
            <div className="space-y-2">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Batch</Label>
              <Select value={selectedFilters.batchId} onValueChange={(val) => setSelectedFilters(p => ({ ...p, batchId: val }))}>
                <SelectTrigger className="bg-background">
                  <SelectValue placeholder="All Batches" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all_batches">All Batches</SelectItem>
                  {filterData.batches.map(b => <SelectItem key={b.id} value={b.id.toString()}>{b.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Branch</Label>
              <Select
                value={selectedFilters.branchId}
                onValueChange={(val) => setSelectedFilters(p => ({ ...p, branchId: val }))}
                disabled={!selectedFilters.batchId}
              >
                <SelectTrigger className="bg-background">
                  <SelectValue placeholder="All Branches" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all_branches">All Branches</SelectItem>
                  {filterData.branches.map(b => <SelectItem key={b.id} value={b.id.toString()}>{b.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Semester</Label>
              <Select
                value={selectedFilters.semesterId}
                onValueChange={(val) => setSelectedFilters(p => ({ ...p, semesterId: val }))}
                disabled={!selectedFilters.branchId}
              >
                <SelectTrigger className="bg-background">
                  <SelectValue placeholder="Semester" />
                </SelectTrigger>
                <SelectContent>
                  {semesters.map(s => <SelectItem key={s.id} value={s.id.toString()}>{s.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Section</Label>
              <Select
                value={selectedFilters.sectionId}
                onValueChange={(val) => setSelectedFilters(p => ({ ...p, sectionId: val }))}
                disabled={!selectedFilters.semesterId}
              >
                <SelectTrigger className="bg-background">
                  <SelectValue placeholder="Section" />
                </SelectTrigger>
                <SelectContent className="h-60">
                  {sections.map(s => <SelectItem key={s.id} value={s.id.toString()}>{s.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Admission Mode</Label>
              <Select
                value={selectedFilters.admissionMode}
                onValueChange={(val) => setSelectedFilters(p => ({ ...p, admissionMode: val }))}
                disabled={!selectedFilters.sectionId}
              >
                <SelectTrigger className="bg-background">
                  <SelectValue placeholder="Admission" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all_modes">All Modes</SelectItem>
                  {filterData.admission_modes.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Search and Secondary Filter Row */}
          <div className="flex flex-col md:flex-row gap-4 items-center mb-8 bg-muted/20 p-4 rounded-xl border border-border/50">
            <div className="relative flex-1 w-full group">
              <Search className="absolute left-3 top-3.5 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
              <Input
                placeholder="Search USN, Name or Invoice #..."
                className="pl-10 h-12 bg-background border-border/50 shadow-sm transition-all focus:ring-2 focus:ring-primary/20"
                value={selectedFilters.search}
                onChange={(e) => setSelectedFilters(p => ({ ...p, search: e.target.value }))}
              />
            </div>
            <div className="w-full md:w-[220px]">
              <Select value={selectedFilters.status} onValueChange={(val) => setSelectedFilters(p => ({ ...p, status: val }))}>
                <SelectTrigger className="h-12 bg-background border-border/50 shadow-sm font-semibold">
                  <SelectValue placeholder="All Status" />
                </SelectTrigger>
                <SelectContent >
                  <SelectItem value="all">All Invoices</SelectItem>
                  <SelectItem value="paid">Fully Paid</SelectItem>
                  <SelectItem value="unpaid">Unpaid Invoices</SelectItem>
                  <SelectItem value="partially_paid">Partial Payments</SelectItem>
                  <SelectItem value="overdue">Overdue</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Table Area */}
          <div className="rounded-xl border border-border/50 overflow-hidden bg-card/30">
            <Table>
              <TableHeader className="bg-muted/30">
                <TableRow className="hover:bg-transparent">
                  <TableHead className="font-semibold py-4 px-6 text-foreground h-12">Invoice Info</TableHead>
                  <TableHead className="font-semibold text-foreground h-12">Student Details</TableHead>
                  <TableHead className="font-semibold text-foreground h-12">Template Details</TableHead>
                  <TableHead className="text-right font-semibold text-foreground h-12">Total</TableHead>
                  <TableHead className="text-right font-semibold text-foreground h-12">Pending</TableHead>
                  <TableHead className="text-center font-semibold text-foreground h-12">Status</TableHead>
                  <TableHead className="text-right font-semibold pr-6 text-foreground h-12">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="p-0">
                      <SkeletonTable rows={10} cols={7} />
                    </TableCell>
                  </TableRow>
                ) : invoices.length === 0 ? (

                  <TableRow>
                    <TableCell colSpan={7} className="h-80 text-center">
                      {!(selectedFilters.batchId && selectedFilters.branchId && selectedFilters.semesterId && selectedFilters.sectionId && selectedFilters.admissionMode) && selectedFilters.search.length < 3 ? (
                        <div className="flex flex-col items-center justify-center bg-muted/5 p-8 rounded-xl border border-dashed mx-6">
                          <div className="relative mb-6">
                            <div className="absolute -top-4 -right-4 bg-primary/10 p-3 rounded-full animate-bounce">
                              <MousePointer2 className="h-3 w-3 text-primary" />
                            </div>
                            <div className="bg-muted/20 p-8 rounded-2xl border-2 border-dashed border-muted">
                              <Filter className="h-7 w-7 text-muted-foreground/30" />
                            </div>
                          </div>
                          <h3 className="text-lg font-semibold text-foreground mb-2">Selection Required</h3>
                          <p className="text-muted-foreground max-w-sm mb-8 text-sm">
                            Please complete the cascading filter selection or search by USN to load invoice data.
                          </p>
                          <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 w-full max-w-2xl">
                            {[
                              { label: 'Batch', active: !!selectedFilters.batchId },
                              { label: 'Branch', active: !!selectedFilters.branchId },
                              { label: 'Semester', active: !!selectedFilters.semesterId },
                              { label: 'Section', active: !!selectedFilters.sectionId },
                              { label: 'Admission', active: !!selectedFilters.admissionMode },
                            ].map((step, i) => (
                              <div key={step.label} className="flex flex-col items-center gap-2">
                                <div className={`h-8 w-8 rounded-full flex items-center justify-center text-xs font-semibold border-2 transition-all ${step.active ? 'bg-primary border-primary text-white shadow-lg shadow-primary/20' : 'bg-background border-muted text-muted-foreground'
                                  }`}>
                                  {step.active ? <CheckIcon className="h-4 w-4" /> : i + 1}
                                </div>
                                <span className={`text-[13px] font-semibold uppercase tracking-wider ${step.active ? 'text-primary' : 'text-muted-foreground'}`}>
                                  {step.label}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center justify-center space-y-4 py-12">
                          <Search className="h-12 w-12 text-muted-foreground opacity-20" />
                          <div className="space-y-1">
                            <p className="text-lg font-semibold text-foreground">No Invoices Found</p>
                            <p className="text-sm text-muted-foreground italic">Try adjusting your filters or search keywords</p>
                          </div>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ) : (
                  invoices.map((inv) => (
                    <TableRow key={inv.id} className="hover:bg-primary/5 transition-all duration-200 border-b border-border/50">
                      <TableCell className="py-5 px-6 align-middle">
                        <div className="font-mono font-semibold text-primary tracking-tighter text-sm uppercase">{inv.invoice_number}</div>
                        <div className="text-[13px] font-semibold text-muted-foreground uppercase tracking-widest mt-1">
                          {new Date(inv.created_at).toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' })}
                        </div>
                      </TableCell>
                      <TableCell className="align-middle">
                        <div className="font-semibold text-foreground leading-tight">{inv.student.name}</div>
                        <div className="text-[13px] font-semibold text-muted-foreground font-mono uppercase tracking-tight mt-1">{inv.student.usn} • Sem {inv.student.semester}</div>
                      </TableCell>
                      <TableCell className="align-middle">
                        <div className="font-medium text-sm leading-tight">{inv.fee_assignment?.template?.name || 'Manual Entry'}</div>
                        <div className="flex items-center gap-1.5 mt-1">
                          <Badge variant="outline" className="text-[11px] uppercase font-semibold tracking-widest h-4 px-1.5 border-border/50">
                            {inv.fee_assignment?.template?.fee_type || 'Custom'}
                          </Badge>
                          <span className="text-[13px] font-semibold text-muted-foreground uppercase">{inv.academic_year}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right align-middle">
                        <div className="font-semibold text-foreground">{formatCurrency(inv.total_amount)}</div>
                      </TableCell>
                      <TableCell className="text-right align-middle">
                        <div className={`font-semibold ${inv.pending_amount > 0 ? 'text-red-600' : 'text-green-600'}`}>
                          {formatCurrency(inv.pending_amount)}
                        </div>
                      </TableCell>
                      <TableCell className="text-center align-middle">
                        {getStatusBadge(inv.status)}
                      </TableCell>
                      <TableCell className="text-right pr-6 align-middle">
                        <div className="flex justify-end gap-1">
                          {inv.pending_amount > 0 && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-9 w-9 text-green-600 hover:bg-green-50 rounded-full transition-all active:scale-95"
                              onClick={() => openPaymentDialog(inv)}
                              title="Record Payment"
                            >
                              <IndianRupee className="h-4.5 w-4.5" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-9 w-9 text-blue-600 hover:bg-blue-50 rounded-full transition-all active:scale-95"
                            onClick={() => fetchInvoiceDetails(inv.id)}
                            title="View Details"
                          >
                            <Eye className="h-4.5 w-4.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-9 w-9 text-amber-600 hover:bg-amber-50 rounded-full transition-all active:scale-95"
                            onClick={() => downloadInvoice(inv.id)}
                            title="Download PDF"
                          >
                            <Download className="h-4.5 w-4.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>

            {/* Pagination */}
            {invoicesMeta && invoicesMeta.total_pages > 1 && (
              <div className="p-5 border-t flex items-center justify-between bg-muted/10">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">
                  Showing <span className="text-foreground">{(invoicesMeta.page - 1) * 50 + 1}</span> to <span className="text-foreground">{Math.min(invoicesMeta.page * 50, invoicesMeta.count)}</span> of <span className="text-foreground">{invoicesMeta.count}</span>
                </p>
                <div className="flex items-center gap-4">
                  <div className="text-[13px] font-semibold text-muted-foreground uppercase tracking-widest hidden sm:block">
                    Page {invoicesMeta.page} of {invoicesMeta.total_pages}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-9 px-4 font-semibold uppercase text-[13px] tracking-widest rounded-full"
                      disabled={!invoicesMeta.has_previous}
                      onClick={() => fetchInvoices(invoicesMeta.page - 1)}
                    >
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-9 px-4 font-semibold uppercase text-[13px] tracking-widest rounded-full"
                      disabled={!invoicesMeta.has_next}
                      onClick={() => fetchInvoices(invoicesMeta.page + 1)}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Invoice Details Dialog */}      <Dialog open={isDetailsDialogOpen} onOpenChange={setIsDetailsDialogOpen}>
        <DialogContent className="max-w-lg w-[90vw] border-none shadow-2xl p-0 overflow-hidden bg-card rounded-3xl">
          {/* Refined Header */}
          <div className="px-6 py-5 border-b border-border/50 bg-muted/20">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-primary opacity-80" />
                  <span className="text-[13px] uppercase font-semibold tracking-[0.15em] text-muted-foreground/80">Invoice Statement</span>
                </div>
                <h2 className="text-xl font-semibold tracking-tight text-foreground">{selectedInvoice?.invoice_number}</h2>
              </div>
              <div className="flex flex-col items-end gap-1.5">
                <Badge variant="outline" className="border-primary/20 text-primary bg-primary/5 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wider">
                  {selectedInvoice?.status}
                </Badge>
                <span className="text-[13px] text-muted-foreground font-semibold">
                  {selectedInvoice && new Date(selectedInvoice.created_at).toLocaleDateString()}
                </span>
              </div>
            </div>
          </div>

          <div className="p-6 space-y-6 max-h-[80vh] overflow-y-auto custom-scrollbar">
            {/* Info Grid - Responsive */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-3 p-4 rounded-xl border border-border/50 bg-muted/5">
                <h4 className="text-[13px] font-semibold uppercase text-muted-foreground flex items-center gap-2 tracking-widest">
                  <Users className="h-3.5 w-3.5 text-primary" /> Bill To
                </h4>
                <div className="space-y-0.5">
                  <p className="text-base font-semibold text-foreground leading-tight">{selectedInvoice?.student?.name}</p>
                  <p className="text-xs font-medium text-muted-foreground">{selectedInvoice?.student?.usn}</p>
                  <p className="text-xs text-muted-foreground/70">{selectedInvoice?.student?.department}</p>
                  <p className="text-xs font-semibold text-primary/80 mt-1">Semester {selectedInvoice?.student?.semester}</p>
                </div>
              </div>

              <div className="space-y-3 p-4 rounded-xl border border-border/50 bg-muted/5">
                <h4 className="text-[13px] font-semibold uppercase text-muted-foreground flex items-center gap-2 tracking-widest">
                  <LayoutGrid className="h-3.5 w-3.5 text-primary" /> Fee Details
                </h4>
                <div className="space-y-0.5">
                  <p className="text-base font-semibold text-foreground leading-tight">
                    {selectedInvoice?.fee_assignment?.template?.name || 'Custom Assignment'}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="secondary" className="text-[11px] h-4 px-1.5 font-semibold uppercase border-none">
                      {selectedInvoice?.fee_assignment?.template?.fee_type || 'Annual'}
                    </Badge>
                    <span className="text-[13px] font-semibold text-muted-foreground">{selectedInvoice?.academic_year}</span>
                  </div>
                  <p className="text-[13px] font-semibold text-red-500 uppercase tracking-tight mt-2">
                    Due: {selectedInvoice?.due_date ? new Date(selectedInvoice.due_date).toLocaleDateString() : 'N/A'}
                  </p>
                </div>
              </div>
            </div>

            {/* Financial Summary */}
            <div className="bg-primary/5 rounded-xl border border-primary/10 p-4 grid grid-cols-3 gap-4">
              <div className="text-center">
                <p className="text-[11px] text-muted-foreground uppercase font-semibold tracking-wider mb-1">Total</p>
                <p className="text-sm font-semibold text-foreground">{formatCurrency(selectedInvoice?.total_amount || 0)}</p>
              </div>
              <div className="text-center border-x border-primary/10">
                <p className="text-[11px] text-muted-foreground uppercase font-semibold tracking-wider mb-1">Paid</p>
                <p className="text-sm font-semibold text-green-600">{formatCurrency(selectedInvoice?.paid_amount || 0)}</p>
              </div>
              <div className="text-center">
                <p className="text-[11px] text-muted-foreground uppercase font-semibold tracking-wider mb-1">Balance</p>
                <p className="text-sm font-semibold text-red-600">{formatCurrency(selectedInvoice?.pending_amount || 0)}</p>
              </div>
            </div>

            {/* Transactions Section */}
            <div className="space-y-3">
              <h4 className="text-[13px] font-semibold uppercase text-muted-foreground flex items-center gap-2 tracking-widest px-1">
                <CreditCard className="h-3.5 w-3.5 text-primary" /> Payment History
              </h4>
              <div className="border border-border/50 rounded-xl overflow-hidden bg-card">
                {payments.length === 0 ? (
                  <div className="p-8 text-center bg-muted/10">
                    <p className="text-xs text-muted-foreground font-medium italic">No payments recorded for this invoice</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader className="bg-muted/30">
                      <TableRow className="hover:bg-transparent">
                        <TableHead className="h-9 text-[13px] font-semibold uppercase px-4">Date</TableHead>
                        <TableHead className="h-9 text-[13px] font-semibold uppercase">Method</TableHead>
                        <TableHead className="h-9 text-right text-[13px] font-semibold uppercase px-4">Amount</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {payments.map(p => (
                        <TableRow key={p.id} className="hover:bg-muted/10 transition-colors border-b border-border/30 last:border-0">
                          <TableCell className="py-2.5 px-4 text-xs font-medium">
                            {new Date(p.payment_date).toLocaleDateString(undefined, { day: '2-digit', month: 'short' })}
                          </TableCell>
                          <TableCell className="py-2.5 text-[13px] font-semibold uppercase opacity-70">
                            {p.payment_method}
                          </TableCell>
                          <TableCell className="py-2.5 px-4 text-right font-semibold text-green-600 text-xs">
                            {formatCurrency(p.amount)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <Button
                className="flex-1 h-10 text-xs font-semibold uppercase tracking-widest shadow-lg shadow-primary/20"
                onClick={() => downloadInvoice(selectedInvoice?.id || 0)}
              >
                <Download className="h-3.5 w-3.5 mr-2" /> Download Statement
              </Button>
              <Button
                variant="outline"
                className="h-10 px-6 text-xs font-semibold uppercase tracking-widest"
                onClick={() => setIsDetailsDialogOpen(false)}
              >
                Close
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Record Payment Dialog */}
      <Dialog open={isPaymentDialogOpen} onOpenChange={setIsPaymentDialogOpen}>
        <DialogContent className="sm:max-w-md w-[90vw] border-none shadow-2xl p-6 bg-card rounded-3xl">
          <DialogHeader className="space-y-1">
            <DialogTitle className="text-xl font-semibold flex items-center gap-2 text-foreground">
              <div className="bg-green-100 dark:bg-green-900/30 p-2 rounded-lg">
                <IndianRupee className="h-5 w-5 text-green-600 dark:text-green-400" />
              </div>
              Record Payment
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleRecordPayment} className="space-y-5 pt-4">
            <div className="space-y-2">
              <Label className="text-[13px] font-semibold uppercase tracking-widest text-muted-foreground ml-1">Target Student</Label>
              <Input
                value={selectedInvoice?.student.name}
                disabled
                className="bg-muted/30 border-none font-semibold text-foreground h-11"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-[13px] font-semibold uppercase tracking-widest text-muted-foreground ml-1">Amount (₹)</Label>
                <Input
                  type="number"
                  step="0.01"
                  required
                  className="h-11 border-border/50 focus:ring-green-500/20"
                  value={paymentForm.amount}
                  onChange={(e) => setPaymentForm(p => ({ ...p, amount: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-[13px] font-semibold uppercase tracking-widest text-muted-foreground ml-1">Mode</Label>
                <Select value={paymentForm.mode} onValueChange={(val) => setPaymentForm(p => ({ ...p, mode: val }))}>
                  <SelectTrigger className="h-11 border-border/50">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl border-border/50">
                    <SelectItem value="cash">Cash</SelectItem>
                    <SelectItem value="cheque">Cheque</SelectItem>
                    <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                    <SelectItem value="upi">UPI</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-[13px] font-semibold uppercase tracking-widest text-muted-foreground ml-1">Reference / Transaction ID</Label>
              <Input
                placeholder="e.g. Cheque # or Bank Ref"
                className="h-11 border-border/50"
                value={paymentForm.transactionId}
                onChange={(e) => setPaymentForm(p => ({ ...p, transactionId: e.target.value }))}
              />
            </div>

            <div className="flex gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                className="flex-1 h-11 text-xs font-semibold uppercase tracking-widest rounded-xl"
                onClick={() => setIsPaymentDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="flex-[1.5] h-11 bg-green-600 hover:bg-green-700 text-white text-xs font-semibold uppercase tracking-widest rounded-xl shadow-lg shadow-green-500/20"
                disabled={isSubmittingPayment}
              >
                {isSubmittingPayment ? "Recording..." : "Record Payment"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default InvoiceManagement;