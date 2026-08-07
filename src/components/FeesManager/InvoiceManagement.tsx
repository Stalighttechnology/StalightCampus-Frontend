import { translateTerminology, getTerm } from "@/utils/institutionConfig";
import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from "@/components/ui/card";
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
  ChevronDown,
  TrendingUp,
  CreditCard,
  LayoutGrid,
  MousePointer2,
  Loader2,
  CheckCircle2 as CheckIcon } from
'lucide-react';
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
  SkeletonCard } from
"@/components/ui/skeleton";

import {
  getFeesManagerFilters,
  getFeesManagerSemesters,
  getFeesManagerSections,
  getFeesManagerStats,
  getInvoices,
  recordPayment,
  downloadInvoice as downloadInvoiceApi,
  downloadInvoicePdf,
  getInvoiceDetails } from
"../../utils/fees_manager_api";

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
  semester?: number | null;
  components?: {
    id: number;
    name: string;
    amount: number;
    paid: number;
    balance: number;
  }[];
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
  batches: {id: number;name: string;}[];
  branches: {id: number;name: string;code: string;}[];
  admission_modes: string[];
}

const InvoiceManagement: React.FC<{ isReadOnly?: boolean }> = ({ isReadOnly = false }) => {
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
  const [downloadingInvoiceId, setDownloadingInvoiceId] = useState<number | null>(null);
  const [paymentForm, setPaymentForm] = useState({
    amount: '',
    mode: 'cash',
    transactionId: ''
  });

  // Group by Student toggle state
  const [groupByStudent, setGroupByStudent] = useState(false);
  const [expandedStudentIds, setExpandedStudentIds] = useState<Set<number>>(new Set());

  // Modal state for Group-by-Student view
  const [selectedStudentGroupForModal, setSelectedStudentGroupForModal] = useState<{
    student: Invoice['student'];
    invoices: Invoice[];
  } | null>(null);

  const toggleStudentExpand = (studentId: number) => {
    setExpandedStudentIds(prev => {
      const next = new Set(prev);
      if (next.has(studentId)) next.delete(studentId);
      else next.add(studentId);
      return next;
    });
  };

  // Build grouped map: studentId -> { student, invoices[] }
  const groupedInvoices = React.useMemo(() => {
    const map = new Map<number, { student: Invoice['student']; invoices: Invoice[] }>();
    invoices.forEach(inv => {
      const sid = inv.student.id;
      if (!map.has(sid)) map.set(sid, { student: inv.student, invoices: [] });
      map.get(sid)!.invoices.push(inv);
    });
    return Array.from(map.values());
  }, [invoices]);

  // Cascading Filter states
  const [selectedFilters, setSelectedFilters] = useState({
    batchId: '',
    branchId: '',
    semesterId: '',
    sectionId: '',
    admissionMode: '',
    status: 'all'
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [appliedSearch, setAppliedSearch] = useState('');
  const [openSelect, setOpenSelect] = useState<'batch' | 'branch' | 'semester' | 'section' | 'admission' | null>(null);

  const [filterData, setFilterData] = useState<FilterData>({ batches: [], branches: [], admission_modes: [] });
  const [semesters, setSemesters] = useState<{id: number;number: number;name: string;}[]>([]);
  const [sections, setSections] = useState<{id: number;name: string;}[]>([]);

  // Loading states for cascading filters
  const [loadingInitialFilters, setLoadingInitialFilters] = useState(false);
  const [loadingSemesters, setLoadingSemesters] = useState(false);
  const [loadingSections, setLoadingSections] = useState(false);

  // Initial data fetch
  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        setLoadingInitialFilters(true);
        const filterJson = await getFeesManagerFilters();
        if (filterJson.success) {
          setFilterData(filterJson.data);
        }
      } catch (err) {

      } finally {
        setLoadingInitialFilters(false);
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
      setLoadingSemesters(true);
      const res = await getFeesManagerSemesters(selectedFilters.branchId);
      if (res.success) {
        setSemesters(res.data || []);
      }
      setLoadingSemesters(false);
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
      setLoadingSections(true);
      const res = await getFeesManagerSections(selectedFilters.branchId, selectedFilters.semesterId);
      if (res.success) {
        setSections(res.data || []);
      }
      setLoadingSections(false);
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

    if (allFiltersSelected || appliedSearch.length > 2) {
      fetchInvoices(1);
    } else {
      setInvoices([]);
      setInvoicesMeta(null);
      setLoading(false);
    }
  }, [selectedFilters, appliedSearch]);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setAppliedSearch(searchQuery.trim());
    }, 500);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Clear search query when dropdown filters change
  useEffect(() => {
    setSearchQuery("");
    setAppliedSearch("");
  }, [
    selectedFilters.batchId,
    selectedFilters.branchId,
    selectedFilters.semesterId,
    selectedFilters.sectionId,
    selectedFilters.admissionMode,
    selectedFilters.status
  ]);

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
        ...(selectedFilters.admissionMode && { admission_mode: selectedFilters.admissionMode })
      };

      const res = await getFeesManagerStats(params);
      if (res.success) {
        setStatsData(res.data);
      }
    } catch (e) {

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
        ...(appliedSearch && { search: appliedSearch })
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
        pending_amount: (inv.pending_amount_cents ?? 0) / 100
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
        components: (inv.components || []).map((c: any) => ({
          ...c,
          amount: (c.amount_cents ?? 0) / 100,
          paid: (c.paid_cents ?? 0) / 100,
          balance: (c.balance_cents ?? 0) / 100
        }))
      };

      const normalizedPayments = (inv.payments || []).map((p: any) => ({
        ...p,
        amount: (p.amount_cents ?? 0) / 100
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
    setDownloadingInvoiceId(invoiceId);
    try {
      const response = await downloadInvoicePdf(invoiceId);
      if (!response.success) {
        throw new Error(response.message || 'Failed to download invoice');
      }

      const blob = response.data;
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `invoice_${invoiceId}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to download invoice');
    } finally {
      setDownloadingInvoiceId(null);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR'
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
    <div id="feesmanager-invoices-container">
      <Card>
        <div id="feesmanager-invoices-header">
          <CardHeader className="border-b border-border/50 flex flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle className="text-xl sm:text-xl md:text-2xl font-semibold text-gray-900">Invoice Management</CardTitle>
              <CardDescription className="text-sm sm:text-sm text-muted-foreground mt-1">
                Track and manage student fee payments and collections
              </CardDescription>
            </div>
          </CardHeader>

          <CardContent className="p-4 sm:p-3 pb-0">
          {/* Stats Overview */}
          <div className="grid grid-cols-1 sm:grid-cols-2 min-[1250px]:grid-cols-4 gap-6 mb-4 sm:mb-0">
            <DashboardCard
              title="Total Invoices"
              value={statsData?.total_invoices || 0}
              description="Generated for this session"
              icon={<FileText className="h-5 w-5" />} />
            
            <DashboardCard
              title="Collection"
              value={formatCurrency((statsData?.total_collections_cents || 0) / 100)}
              description="Total revenue collected"
              icon={<TrendingUp className="h-5 w-5" />} />
            
            <DashboardCard
              title="Outstanding"
              value={formatCurrency((statsData?.outstanding_amount_cents || 0) / 100)}
              description="Pending fee balance"
              icon={<Clock className="h-5 w-5" />} />
            
            <DashboardCard
              title="Active Templates"
              value={statsData?.active_fee_structures || 0}
              description="Templates currently assigned"
              icon={<Users className="h-5 w-5" />} />
            
          </div>
          </CardContent>
        </div>

        <CardContent className="p-4 sm:p-6 pt-0 sm:pt-6">
          {/* Cascading Filters Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-6">
            <div className="space-y-2">
              <Label className="text-sm sm:text-xs font-semibold uppercase tracking-wider text-muted-foreground">Batch</Label>
              <Select
                value={selectedFilters.batchId}
                open={openSelect === 'batch'}
                onOpenChange={(open) => setOpenSelect(open ? 'batch' : null)}
                onValueChange={(val) => {
                  setSelectedFilters((p) => ({ ...p, batchId: val }));
                  setTimeout(() => setOpenSelect('branch'), 100);
                }}>
                <SelectTrigger className="bg-background">
                  <SelectValue placeholder="Select Batch" />
                </SelectTrigger>
                <SelectContent>
                  {loadingInitialFilters ? (
                    <SelectItem value="none" disabled className="text-muted-foreground text-xs text-center">
                      Loading batches...
                    </SelectItem>
                  ) : filterData.batches.length > 0 ? (
                    filterData.batches.map((b) => <SelectItem key={b.id} value={b.id.toString()}>{b.name}</SelectItem>)
                  ) : (
                    <SelectItem value="none" disabled className="text-muted-foreground text-xs text-center">
                      No batches found
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-sm sm:text-xs font-semibold uppercase tracking-wider text-muted-foreground">{translateTerminology("Branch")}</Label>
              <Select
                value={selectedFilters.branchId}
                open={openSelect === 'branch'}
                onOpenChange={(open) => setOpenSelect(open ? 'branch' : null)}
                onValueChange={(val) => {
                  setSelectedFilters((p) => ({ ...p, branchId: val }));
                  setTimeout(() => setOpenSelect('semester'), 100);
                }}
                disabled={!selectedFilters.batchId}>
                
                <SelectTrigger className="bg-background">
                  <SelectValue placeholder={translateTerminology("Select Branch")} />
                </SelectTrigger>
                <SelectContent>
                  {loadingInitialFilters ? (
                    <SelectItem value="none" disabled className="text-muted-foreground text-xs text-center">
                      Loading branches...
                    </SelectItem>
                  ) : filterData.branches.length > 0 ? (
                    filterData.branches.map((b) => <SelectItem key={b.id} value={b.id.toString()}>{b.name}</SelectItem>)
                  ) : (
                    <SelectItem value="none" disabled className="text-muted-foreground text-xs text-center">
                      No branches found
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-sm sm:text-xs font-semibold uppercase tracking-wider text-muted-foreground">{translateTerminology("Semester")}</Label>
              <Select
                value={selectedFilters.semesterId}
                open={openSelect === 'semester'}
                onOpenChange={(open) => setOpenSelect(open ? 'semester' : null)}
                onValueChange={(val) => {
                  setSelectedFilters((p) => ({ ...p, semesterId: val }));
                  setTimeout(() => setOpenSelect('section'), 100);
                }}
                disabled={!selectedFilters.branchId}>
                
                <SelectTrigger className="bg-background">
                  <SelectValue placeholder={translateTerminology("Select Semester")} />
                </SelectTrigger>
                <SelectContent>
                  {loadingSemesters ? (
                    <SelectItem value="none" disabled className="text-muted-foreground text-xs text-center">
                      Loading semesters...
                    </SelectItem>
                  ) : semesters.length > 0 ? (
                    semesters.map((s) => <SelectItem key={s.id} value={s.id.toString()}>{translateTerminology(s.name)}</SelectItem>)
                  ) : (
                    <SelectItem value="none" disabled className="text-muted-foreground text-xs text-center">
                      No semesters found
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-sm sm:text-xs font-semibold uppercase tracking-wider text-muted-foreground">Section</Label>
              <Select
                value={selectedFilters.sectionId}
                open={openSelect === 'section'}
                onOpenChange={(open) => setOpenSelect(open ? 'section' : null)}
                onValueChange={(val) => {
                  setSelectedFilters((p) => ({ ...p, sectionId: val }));
                  setTimeout(() => setOpenSelect('admission'), 100);
                }}
                disabled={!selectedFilters.semesterId}>
                
                <SelectTrigger className="bg-background">
                  <SelectValue placeholder="Select Section" />
                </SelectTrigger>
                <SelectContent className="max-h-60">
                  {loadingSections ? (
                    <SelectItem value="none" disabled className="text-muted-foreground text-xs text-center">
                      Loading sections...
                    </SelectItem>
                  ) : sections.length > 0 ? (
                    sections.map((s) => <SelectItem key={s.id} value={s.id.toString()}>{s.name}</SelectItem>)
                  ) : (
                    <SelectItem value="none" disabled className="text-muted-foreground text-xs text-center">
                      No sections found
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-sm sm:text-xs font-semibold uppercase tracking-wider text-muted-foreground">Admission Mode</Label>
              <Select
                value={selectedFilters.admissionMode}
                open={openSelect === 'admission'}
                onOpenChange={(open) => setOpenSelect(open ? 'admission' : null)}
                onValueChange={(val) => {
                  setSelectedFilters((p) => ({ ...p, admissionMode: val }));
                  setOpenSelect(null);
                }}
                disabled={!selectedFilters.sectionId}>
                
                <SelectTrigger className="bg-background">
                  <SelectValue placeholder="Select Admission Mode" />
                </SelectTrigger>
                <SelectContent>
                  {loadingInitialFilters ? (
                    <SelectItem value="none" disabled className="text-muted-foreground text-xs text-center">
                      Loading admission modes...
                    </SelectItem>
                  ) : filterData.admission_modes.length > 0 ? (
                    filterData.admission_modes.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)
                  ) : (
                    <SelectItem value="none" disabled className="text-muted-foreground text-xs text-center">
                      No admission modes found
                    </SelectItem>
                  )}
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
                className="pl-10 pr-12 h-12 bg-background border-border/50 shadow-sm transition-all focus:ring-2 focus:ring-primary/20"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)} />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-primary hover:text-primary/80 transition-colors"
                >
                  Clear
                </button>
              )}
            </div>
            <div className="w-full md:w-[220px]">
              <Select value={selectedFilters.status} onValueChange={(val) => setSelectedFilters((p) => ({ ...p, status: val }))}>
                <SelectTrigger className="h-12 bg-background border-border/50 shadow-sm font-semibold">
                  <SelectValue placeholder="All Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Invoices</SelectItem>
                  <SelectItem value="paid">Fully Paid</SelectItem>
                  <SelectItem value="unpaid">Unpaid Invoices</SelectItem>
                  <SelectItem value="partially_paid">Partial Payments</SelectItem>
                  <SelectItem value="overdue">Overdue</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {/* Group by Student toggle */}
            <button
              onClick={() => { setGroupByStudent(v => !v); setExpandedStudentIds(new Set()); }}
              className={`flex items-center justify-center gap-2 h-12 px-4 rounded-xl border font-semibold text-sm transition-all whitespace-nowrap w-full sm:w-auto ${
                groupByStudent
                  ? 'bg-primary text-primary-foreground border-primary shadow-md shadow-primary/20'
                  : 'bg-background border-border/50 text-muted-foreground hover:border-primary/40 hover:text-foreground'
              }`}
              title="Toggle Group by Student"
            >
              <Users className="h-4 w-4" />
              Group by Student
            </button>
          </div>

          {/* Table Area */}
          <div className="rounded-xl border border-border/50 overflow-hidden bg-card/30">
            <Table>
              <TableHeader className="bg-muted/40">
                <TableRow className="hover:bg-transparent border-b border-border/50">
                  {groupByStudent ? (
                    <>
                      <TableHead className="px-6 py-4 text-[13px] font-semibold uppercase tracking-wider">Student</TableHead>
                      <TableHead className="px-6 py-4 text-[13px] font-semibold uppercase tracking-wider">Invoices</TableHead>
                      <TableHead className="px-6 py-4 text-right text-[13px] font-semibold uppercase tracking-wider">Total</TableHead>
                      <TableHead className="px-6 py-4 text-right text-[13px] font-semibold uppercase tracking-wider">Outstanding</TableHead>
                      <TableHead className="px-6 py-4 text-center text-[13px] font-semibold uppercase tracking-wider">Status</TableHead>
                      <TableHead className="px-6 py-4 text-center text-[13px] font-semibold uppercase tracking-wider">Actions</TableHead>
                    </>
                  ) : (
                    <>
                      <TableHead className="px-6 py-4 text-[13px] font-semibold uppercase tracking-wider">Invoice Info</TableHead>
                      <TableHead className="px-6 py-4 text-[13px] font-semibold uppercase tracking-wider">Student Details</TableHead>
                      <TableHead className="px-6 py-4 text-[13px] font-semibold uppercase tracking-wider">Template Details</TableHead>
                      <TableHead className="px-6 py-4 text-right text-[13px] font-semibold uppercase tracking-wider">Total</TableHead>
                      <TableHead className="px-6 py-4 text-right text-[13px] font-semibold uppercase tracking-wider">Pending</TableHead>
                      <TableHead className="px-6 py-4 text-center text-[13px] font-semibold uppercase tracking-wider">Status</TableHead>
                      <TableHead className="px-6 py-4 text-right pr-6 text-[13px] font-semibold uppercase tracking-wider">Actions</TableHead>
                    </>
                  )}
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ?
                <TableRow>
                    <TableCell colSpan={7} className="p-0">
                      <SkeletonTable rows={10} cols={7} />
                    </TableCell>
                  </TableRow> :
                invoices.length === 0 ?

                <TableRow>
                    <TableCell colSpan={7} className="h-80 text-center p-0 sm:p-4">
                      {!(selectedFilters.batchId && selectedFilters.branchId && selectedFilters.semesterId && selectedFilters.sectionId && selectedFilters.admissionMode) && appliedSearch.length < 3 ?
                        <div className="sticky left-4 sm:static flex flex-col items-center justify-center bg-muted/5 p-4 sm:p-8 rounded-xl border border-dashed w-[calc(100vw-2rem)] sm:w-auto ml-0 sm:mx-6 my-4 sm:my-0 text-center">
                          <div className="relative mb-4 sm:mb-6">
                            <div className="absolute -top-4 -right-4 bg-primary/10 p-3 rounded-full animate-bounce">
                              <MousePointer2 className="h-3 w-3 text-primary" />
                            </div>
                            <div className="bg-muted/20 p-6 sm:p-8 rounded-2xl border-2 border-dashed border-muted">
                              <Filter className="h-6 w-6 sm:h-7 sm:w-7 text-muted-foreground/30" />
                            </div>
                          </div>
                          <h3 className="text-lg font-semibold text-foreground mb-2">Selection Required</h3>
                          <p className="text-muted-foreground max-w-sm mb-6 sm:mb-8 text-sm px-2 sm:px-0">
                            Please complete the cascading filter selection or search by USN to load invoice data.
                          </p>
                          <div className="grid grid-cols-3 sm:grid-cols-5 gap-3 sm:gap-4 w-full sm:max-w-2xl">
                            {[
                        { label: 'Batch', active: !!selectedFilters.batchId },
                        { label: translateTerminology("Branch"), active: !!selectedFilters.branchId },
                        { label: translateTerminology("Semester"), active: !!selectedFilters.semesterId },
                        { label: 'Section', active: !!selectedFilters.sectionId },
                        { label: 'Admission', active: !!selectedFilters.admissionMode }].
                        map((step, i) =>
                        <div key={step.label} className="flex flex-col items-center gap-2">
                                <div className={`h-8 w-8 rounded-full flex items-center justify-center text-xs font-semibold border-2 transition-all ${step.active ? 'bg-primary border-primary text-white shadow-lg shadow-primary/20' : 'bg-background border-muted text-muted-foreground'}`
                          }>
                                  {step.active ? <CheckIcon className="h-4 w-4" /> : i + 1}
                                </div>
                                <span className={`text-[13px] font-semibold uppercase tracking-wider ${step.active ? 'text-primary' : 'text-muted-foreground'}`}>
                                  {step.label}
                                </span>
                              </div>
                        )}
                          </div>
                        </div> :

                    <div className="flex flex-col items-center justify-center space-y-4 py-12">
                          <Search className="h-12 w-12 text-muted-foreground opacity-20" />
                          <div className="space-y-1">
                            <p className="text-lg font-semibold text-foreground">No Invoices Found</p>
                            <p className="text-sm text-muted-foreground italic">Try adjusting your filters or search keywords</p>
                          </div>
                        </div>
                    }
                    </TableCell>
                  </TableRow> :

                groupByStudent ? (
                  // ── GROUPED VIEW ──────────────────────────────────────────
                  groupedInvoices.map(({ student, invoices: studentInvs }) => {
                    const totalAmt = studentInvs.reduce((s, i) => s + i.total_amount, 0);
                    const pendingAmt = studentInvs.reduce((s, i) => s + i.pending_amount, 0);
                    const allPaid = studentInvs.every(i => i.status === 'paid');
                    const hasOverdue = studentInvs.some(i => i.status === 'overdue');
                    const hasPartial = studentInvs.some(i => i.status === 'partially_paid');
                    const groupStatus = allPaid ? 'paid' : hasOverdue ? 'overdue' : hasPartial ? 'partially_paid' : 'unpaid';

                    return (
                      <React.Fragment key={student.id}>
                        {/* Student summary row */}
                        <TableRow
                          className="hover:bg-primary/5 transition-all duration-200 border-b border-border/50"
                        >
                          <TableCell className="py-4 align-middle">
                            <div className="font-semibold text-foreground text-sm">{student.name}</div>
                            <div className="text-[13px] font-mono text-muted-foreground uppercase tracking-tight mt-0.5">
                              {student.usn}
                            </div>
                          </TableCell>
                          <TableCell className="py-4 align-middle">
                            <div className="flex flex-wrap gap-1">
                              <Badge variant="outline" className="text-[12px] font-semibold">
                                {studentInvs.length} Invoice{studentInvs.length !== 1 ? 's' : ''}
                              </Badge>
                              {studentInvs.filter(i => i.status === 'paid').length > 0 && (
                                <Badge className="text-[12px] bg-green-100 text-green-700 hover:bg-green-100">
                                  {studentInvs.filter(i => i.status === 'paid').length} Paid
                                </Badge>
                              )}
                              {studentInvs.filter(i => i.status !== 'paid').length > 0 && (
                                <Badge className="text-[12px] bg-red-100 text-red-700 hover:bg-red-100">
                                  {studentInvs.filter(i => i.status !== 'paid').length} Pending
                                </Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-right py-4 align-middle">
                            <div className="font-semibold text-foreground">{formatCurrency(totalAmt)}</div>
                          </TableCell>
                          <TableCell className="text-right py-4 align-middle">
                            <div className={`font-semibold ${pendingAmt > 0 ? 'text-red-600' : 'text-green-600'}`}>
                              {formatCurrency(pendingAmt)}
                            </div>
                          </TableCell>
                          <TableCell className="text-center py-4 align-middle">
                            {getStatusBadge(groupStatus as any)}
                          </TableCell>
                          <TableCell className="text-center py-4 align-middle">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/30 rounded-full transition-all active:scale-95"
                              title="View All Invoices"
                              onClick={() => setSelectedStudentGroupForModal({ student, invoices: studentInvs })}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      </React.Fragment>
                    );
                  })
                ) : (
                  // ── FLAT VIEW (default) ───────────────────────────────────
                  invoices.map((inv) =>
                  <TableRow key={inv.id} className="hover:bg-primary/5 transition-all duration-200 border-b border-border/50">
                        <TableCell className="py-5 px-6 align-middle">
                          <div className="font-mono font-semibold text-primary tracking-tighter text-sm uppercase">{inv.invoice_number}</div>
                          <div className="text-[13px] font-semibold text-muted-foreground uppercase tracking-widest mt-1">
                            {new Date(inv.created_at).toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' })}
                          </div>
                        </TableCell>
                        <TableCell className="align-middle">
                          <div className="font-semibold text-foreground leading-tight text-sm sm:text-md">{inv.student.name}</div>
                          <div className="text-[13px] font-semibold text-muted-foreground font-mono uppercase tracking-tight mt-1">
                            {inv.student.usn} • Sem {inv.semester && inv.semester !== 'N/A' ? inv.semester : inv.student.semester || 'N/A'}
                          </div>
                        </TableCell>
                        <TableCell className="align-middle">
                          <div className="font-medium text-sm leading-tight">{inv.fee_assignment?.template?.name || 'Manual Entry'}</div>
                          <div className="flex items-center gap-1.5 mt-1">
                            <Badge variant="outline" className="text-[14px] uppercase font-semibold tracking-widest h-4 px-1.5 border-border/50">
                              {inv.fee_assignment?.template?.fee_type || 'Custom'}
                            </Badge>
                            <span className="text-[13px] font-semibold text-muted-foreground uppercase">{inv.academic_year || inv.fee_assignment?.academic_year || 'N/A'}</span>
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
                            {!isReadOnly && inv.pending_amount > 0 &&
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-9 px-3 flex items-center gap-1.5 text-green-600 hover:bg-green-50 dark:hover:bg-green-950/30 rounded-full transition-all active:scale-95 font-medium"
                          onClick={() => openPaymentDialog(inv)}
                          title="Record Payment">
                          
                                <IndianRupee className="h-4 w-4" />
                                <span className="text-sm">Collect Fees</span>
                              </Button>
                        }
                            <Button
                          variant="ghost"
                          size="icon"
                          className="h-9 w-9 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/30 rounded-full transition-all active:scale-95"
                          onClick={() => fetchInvoiceDetails(inv.id)}
                          title="View Details">
                          
                              <Eye className="h-4.5 w-4.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-9 w-9 text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/30 rounded-full transition-all active:scale-95"
                              onClick={() => downloadInvoice(inv.id)}
                              disabled={downloadingInvoiceId !== null}
                              title="Download PDF">
                              {downloadingInvoiceId === inv.id ? (
                                <Loader2 className="h-4.5 w-4.5 animate-spin" />
                              ) : (
                                <Download className="h-4.5 w-4.5" />
                              )}
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                  )
                )}
              </TableBody>
            </Table>

          </div>
        </CardContent>
        {/* Pagination */}
        {invoicesMeta && invoicesMeta.total_pages > 1 && (
          <CardFooter className="p-5 border-t flex flex-col sm:flex-row items-center justify-between gap-4 bg-muted/10">
            <p className="text-[13px] font-medium text-muted-foreground">
              Showing <span className="text-foreground font-semibold">{(invoicesMeta.page - 1) * 50 + 1}</span> to <span className="text-foreground font-semibold">{Math.min(invoicesMeta.page * 50, invoicesMeta.count)}</span> of <span className="text-foreground font-semibold">{invoicesMeta.count}</span> results
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="pagination-btn text-white bg-primary border-primary hover:bg-primary/90 hover:border-primary/90 hover:text-white px-4 h-9 rounded-lg transition-all active:scale-95 disabled:opacity-50"
                disabled={!invoicesMeta.has_previous || loading}
                onClick={() => fetchInvoices(invoicesMeta.page - 1)}
              >
                Previous
              </Button>

              <Button
                variant="outline"
                size="sm"
                disabled
                className={`h-9 w-10 font-semibold rounded-lg border border-border/50 ${
                  theme === 'dark' ? "bg-card text-foreground" : "bg-white text-gray-900"
                }`}
              >
                {invoicesMeta.page}
              </Button>

              <Button
                variant="outline"
                size="sm"
                className="pagination-btn text-white bg-primary border-primary hover:bg-primary/90 hover:border-primary/90 hover:text-white px-4 h-9 rounded-lg transition-all active:scale-95 disabled:opacity-50"
                disabled={!invoicesMeta.has_next || loading}
                onClick={() => fetchInvoices(invoicesMeta.page + 1)}
              >
                Next
              </Button>
            </div>
          </CardFooter>
        )}
      </Card>

      <Dialog open={isDetailsDialogOpen} onOpenChange={setIsDetailsDialogOpen}>
        <DialogContent className={`max-w-lg w-[90vw] h-[80vh] md:h-[80vh] border shadow-2xl p-0 gap-0 overflow-hidden rounded-xl flex flex-col ${theme === 'dark' ? 'bg-card border-border text-foreground' : 'bg-white border-slate-200 text-slate-900'}`}>
          {/* Header */}
          <div className={`p-6 pr-12 border-b flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 sm:gap-4 flex-shrink-0 ${theme === 'dark' ? 'bg-card border-border' : 'bg-white border-slate-100'}`}>
            <div>
              <h2 className={`text-xl font-semibold tracking-tight ${theme === 'dark' ? 'text-foreground' : 'text-slate-900'}`}>Invoice Statement</h2>
              <p className="text-muted-foreground text-sm mt-1 font-mono">{selectedInvoice?.invoice_number}</p>
            </div>
            <div className="flex flex-row sm:flex-col items-center sm:items-end gap-2 sm:gap-1.5 shrink-0">
              <div className="scale-100 origin-right">
                {selectedInvoice && getStatusBadge(selectedInvoice.status)}
              </div>
              <span className="text-muted-foreground text-sm font-medium">
                {selectedInvoice && new Date(selectedInvoice.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' })}
              </span>
            </div>
          </div>

          <div className={`p-6 flex-1 overflow-y-auto custom-scrollbar space-y-6 ${theme === 'dark' ? 'bg-muted/10' : 'bg-slate-50/50'}`}>
            {/* Bill To */}
            <div className={`p-4 rounded-lg border grid grid-cols-2 gap-y-4 ${theme === 'dark' ? 'bg-card border-border' : 'bg-white border-slate-200'}`}>
              <div className="col-span-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Bill To</p>
                <p className={`text-base font-semibold mt-1 leading-tight ${theme === 'dark' ? 'text-foreground' : 'text-slate-900'}`}>{selectedInvoice?.student?.name}</p>
              </div>
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest font-mono">USN</p>
                <p className={`text-sm font-medium mt-1 ${theme === 'dark' ? 'text-muted-foreground' : 'text-slate-700'}`}>{selectedInvoice?.student?.usn}</p>
              </div>
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Department</p>
                <p className={`text-sm font-medium mt-1 ${theme === 'dark' ? 'text-muted-foreground' : 'text-slate-700'}`}>{selectedInvoice?.student?.department}</p>
              </div>
              <div className="col-span-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">{translateTerminology("Semester")}</p>
                <p className="text-sm font-semibold mt-1 text-primary">
                  {selectedInvoice?.semester && selectedInvoice.semester !== 'N/A'
                    ? `Semester ${selectedInvoice.semester}`
                    : selectedInvoice?.student?.semester && selectedInvoice.student.semester !== 'N/A'
                    ? `Semester ${selectedInvoice.student.semester}`
                    : 'N/A'}
                </p>
              </div>
            </div>

            {/* Fee Details */}
            <div className={`p-4 rounded-lg border grid grid-cols-2 gap-y-4 ${theme === 'dark' ? 'bg-card border-border' : 'bg-white border-slate-200'}`}>
              <div className="col-span-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Fee Details</p>
                <p className={`text-base font-semibold mt-1 leading-tight ${theme === 'dark' ? 'text-foreground' : 'text-slate-900'}`}>
                  {selectedInvoice?.fee_assignment?.template?.name || 'Custom Assignment'}
                </p>
              </div>
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Fee Type / Year</p>
                <p className={`text-sm font-medium mt-1 capitalize ${theme === 'dark' ? 'text-muted-foreground' : 'text-slate-700'}`}>
                  {selectedInvoice?.fee_assignment?.template?.fee_type || 'Annual'} ({selectedInvoice?.academic_year || selectedInvoice?.fee_assignment?.academic_year || ''})
                </p>
              </div>
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Due Date</p>
                <p className="text-sm font-semibold mt-1 text-red-500">
                  {selectedInvoice?.due_date ? new Date(selectedInvoice.due_date).toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' }) : 'N/A'}
                </p>
              </div>
            </div>

            {/* Fee Components / Particulars */}
            {selectedInvoice?.components && selectedInvoice.components.length > 0 && (
              <div className="space-y-3">
                <h4 className={`text-xs font-semibold uppercase tracking-widest block px-1 ${theme === 'dark' ? 'text-foreground/85' : 'text-slate-700'}`}>Particulars / Fee Components</h4>
                <div className={`border rounded-lg overflow-hidden ${theme === 'dark' ? 'bg-card border-border' : 'border-slate-200 bg-white'}`}>
                  <Table>
                    <TableHeader className={`border-b ${theme === 'dark' ? 'bg-muted/20 border-border' : 'bg-slate-50 border-slate-200'}`}>
                      <TableRow className="hover:bg-transparent">
                        <TableHead className="h-9 text-xs font-semibold uppercase text-muted-foreground px-4">Particulars</TableHead>
                        <TableHead className="h-9 text-right text-xs font-semibold uppercase text-muted-foreground px-4">Amount</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {selectedInvoice.components.map((comp) => (
                        <TableRow key={comp.id} className={`transition-colors border-b last:border-0 ${theme === 'dark' ? 'border-border hover:bg-muted/20' : 'border-slate-100 hover:bg-slate-50/50'}`}>
                          <TableCell className={`py-2.5 px-4 text-xs font-semibold ${theme === 'dark' ? 'text-muted-foreground' : 'text-slate-700'}`}>
                            {comp.name}
                          </TableCell>
                          <TableCell className={`py-2.5 px-4 text-right font-bold text-xs ${theme === 'dark' ? 'text-foreground' : 'text-slate-900'}`}>
                            {formatCurrency(comp.amount)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}

            {/* Financial Summary */}
            <div className={`p-4 rounded-lg border grid grid-cols-3 gap-4 ${theme === 'dark' ? 'bg-card border-border' : 'bg-white border-slate-200'}`}>
              <div className={`text-center border-r ${theme === 'dark' ? 'border-border' : 'border-slate-100'}`}>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-1">Total</p>
                <p className={`text-base font-bold ${theme === 'dark' ? 'text-foreground' : 'text-slate-900'}`}>{formatCurrency(selectedInvoice?.total_amount || 0)}</p>
              </div>
              <div className={`text-center border-r ${theme === 'dark' ? 'border-border' : 'border-slate-100'}`}>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-1">Paid</p>
                <p className="text-base font-bold text-emerald-600">{formatCurrency(selectedInvoice?.paid_amount || 0)}</p>
              </div>
              <div className="text-center">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-1">Balance</p>
                <p className="text-base font-bold text-red-600">{formatCurrency(selectedInvoice?.pending_amount || 0)}</p>
              </div>
            </div>

            {/* Payment History */}
            <div className="space-y-3">
              <h4 className={`text-xs font-semibold uppercase tracking-widest block px-1 ${theme === 'dark' ? 'text-foreground/85' : 'text-slate-700'}`}>Payment History</h4>
              <div className={`border rounded-lg overflow-hidden ${theme === 'dark' ? 'bg-card border-border' : 'border-slate-200 bg-white'}`}>
                {payments.length === 0 ? (
                  <div className={`p-6 text-center ${theme === 'dark' ? 'bg-muted/10' : 'bg-slate-50/30'}`}>
                    <p className="text-xs text-muted-foreground font-medium italic">No payments recorded for this invoice</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader className={`border-b ${theme === 'dark' ? 'bg-muted/20 border-border' : 'bg-slate-50 border-slate-200'}`}>
                      <TableRow className="hover:bg-transparent">
                        <TableHead className="h-9 text-xs font-semibold uppercase text-muted-foreground px-4">Date</TableHead>
                        <TableHead className="h-9 text-xs font-semibold uppercase text-muted-foreground">Method</TableHead>
                        <TableHead className="h-9 text-right text-xs font-semibold uppercase text-muted-foreground px-4">Amount</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {payments.map((p) => (
                        <TableRow key={p.id} className={`transition-colors border-b last:border-0 ${theme === 'dark' ? 'border-border hover:bg-muted/20' : 'border-slate-100 hover:bg-slate-50/50'}`}>
                          <TableCell className={`py-2.5 px-4 text-xs font-medium ${theme === 'dark' ? 'text-muted-foreground' : 'text-slate-700'}`}>
                            {new Date(p.payment_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
                          </TableCell>
                          <TableCell className="py-2.5 text-xs font-semibold uppercase text-muted-foreground">
                            {p.payment_method}
                          </TableCell>
                          <TableCell className="py-2.5 px-4 text-right font-bold text-emerald-600 text-xs">
                            {formatCurrency(p.amount)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </div>
            </div>
          </div>

          {/* Footer Actions */}
          <div className={`p-6 border-t flex flex-col sm:flex-row gap-3 flex-shrink-0 ${theme === 'dark' ? 'bg-card border-border' : 'bg-white border-slate-100'}`}>
            <button
              onClick={() => downloadInvoice(selectedInvoice?.id || 0)}
              disabled={downloadingInvoiceId !== null}
              className="flex-1 bg-primary hover:bg-primary/90 disabled:opacity-50 text-white font-medium py-2.5 px-4 rounded-lg shadow-sm transition-colors flex items-center justify-center gap-2 text-sm"
            >
              {downloadingInvoiceId === selectedInvoice?.id ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Downloading...</span>
                </>
              ) : (
                <>
                  <Download className="h-4 w-4" />
                  <span>Download Statement</span>
                </>
              )}
            </button>
            <button
              onClick={() => setIsDetailsDialogOpen(false)}
              className={`px-6 py-2.5 border font-medium rounded-lg transition-colors text-sm ${theme === 'dark' ? 'border-border hover:bg-muted text-foreground' : 'border-slate-200 hover:bg-slate-50 hover:border-slate-300 text-slate-700'}`}
            >
              Close
            </button>
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
                className="bg-muted/30 border-none font-semibold text-foreground h-11" />
              
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
                  onChange={(e) => setPaymentForm((p) => ({ ...p, amount: e.target.value }))} />
                
              </div>
              <div className="space-y-2">
                <Label className="text-[13px] font-semibold uppercase tracking-widest text-muted-foreground ml-1">Mode</Label>
                <Select value={paymentForm.mode} onValueChange={(val) => setPaymentForm((p) => ({ ...p, mode: val }))}>
                  <SelectTrigger className="h-11 border-border/50">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl border-border/50">
                    <SelectItem value="cash">Cash</SelectItem>
                    <SelectItem value="cheque">Cheque</SelectItem>
                    <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                    <SelectItem value="upi">UPI</SelectItem>
                    <SelectItem value="discount">Discount / Waiver</SelectItem>
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
                onChange={(e) => setPaymentForm((p) => ({ ...p, transactionId: e.target.value }))} />
              
            </div>

            <div className="flex gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                className="flex-1 h-11 text-xs font-semibold uppercase tracking-widest rounded-xl"
                onClick={() => setIsPaymentDialogOpen(false)}>
                
                Cancel
              </Button>
              <Button
                type="submit"
                className="flex-[1.5] h-11 bg-green-600 hover:bg-green-700 text-white text-xs font-semibold uppercase tracking-widest rounded-xl shadow-lg shadow-green-500/20"
                disabled={isSubmittingPayment}>
                
                {isSubmittingPayment ? "Recording..." : "Record Payment"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Student Group Invoices Modal */}
      <Dialog open={!!selectedStudentGroupForModal} onOpenChange={(open) => !open && setSelectedStudentGroupForModal(null)}>
        <DialogContent className="w-[90vw] max-w-[90vw] sm:max-w-2xl max-h-[80vh] sm:max-h-[85vh] flex flex-col overflow-hidden p-0 rounded-2xl border border-border/80 shadow-2xl">
          {selectedStudentGroupForModal && (
            <>
              {/* Modal Header */}
              <div className="p-4 sm:p-6 pb-4 border-b bg-muted/30 relative">
                <div className="flex flex-col gap-1 pr-6">
                  <h2 className="text-lg sm:text-xl font-semibold text-foreground leading-tight">
                    {selectedStudentGroupForModal.student.name}
                  </h2>
                  <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground mt-1">
                    <span className="font-mono font-semibold bg-primary/10 text-primary px-2 py-0.5 rounded text-[11px]">
                      {selectedStudentGroupForModal.student.usn}
                    </span>
                    <span className="text-muted-foreground/40">•</span>
                    <span className="font-medium text-foreground/80">{selectedStudentGroupForModal.student.department}</span>
                    <span className="text-muted-foreground/40">•</span>
                    <span className="font-medium text-muted-foreground">Sem {selectedStudentGroupForModal.student.semester}</span>
                  </div>
                </div>
              </div>

              {/* Modal Body */}
              <div className="p-4 sm:p-6 overflow-y-auto space-y-3.5 flex-1 bg-background">
                {/* Summary Banner */}
                <div className="flex items-center justify-between p-3.5 rounded-xl bg-muted/40 border border-border/80 dark:border-border/70 text-xs font-semibold">
                  <span className="text-muted-foreground font-medium">
                    Invoices ({selectedStudentGroupForModal.invoices.length})
                  </span>
                  <span className="text-sm font-semibold text-foreground">
                    Total: <span className="text-green-600 dark:text-green-400 font-bold">{formatCurrency(selectedStudentGroupForModal.invoices.reduce((sum, inv) => sum + inv.total_amount, 0))}</span>
                  </span>
                </div>

                {/* Invoices List */}
                <div className="space-y-3">
                  {selectedStudentGroupForModal.invoices.map((inv) => (
                    <div
                      key={inv.id}
                      className="rounded-xl border border-border/80 dark:border-border/70 bg-card hover:border-primary/40 shadow-sm transition-all overflow-hidden"
                    >
                      {/* Card Top – Invoice # + Status */}
                      <div className="flex items-center justify-between px-4 py-3 bg-muted/30 border-b border-border/60">
                        <span className="font-mono font-bold text-primary text-sm uppercase tracking-tight">
                          {inv.invoice_number}
                        </span>
                        {getStatusBadge(inv.status)}
                      </div>

                      {/* Card Body – all fields */}
                      <div className="px-4 py-3 grid grid-cols-2 gap-x-6 gap-y-2.5 text-sm">
                        {/* Date */}
                        <div>
                          <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-0.5">Date</div>
                          <div className="font-medium text-foreground">
                            {new Date(inv.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                          </div>
                        </div>

                        {/* Academic Year */}
                        <div>
                          <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-0.5">Academic Year</div>
                          <div className="font-medium text-foreground">
                            {inv.academic_year || inv.fee_assignment?.academic_year || '—'}
                          </div>
                        </div>

                        {/* Template Name */}
                        <div className="col-span-2">
                          <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-0.5">Template</div>
                          <div className="font-semibold text-foreground">
                            {inv.fee_assignment?.template?.name || 'Manual Entry'}
                          </div>
                        </div>

                        {/* Fee Type */}
                        <div className="col-span-2">
                          <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-0.5">Fee Type</div>
                          <Badge variant="secondary" className="text-[10px] uppercase font-semibold tracking-wider px-2 py-0.5 border border-border/50">
                            {inv.fee_assignment?.template?.fee_type || 'Custom'}
                          </Badge>
                        </div>
                      </div>

                      {/* Card Footer – amounts */}
                      <div className="flex items-center gap-0 border-t border-border/60">
                        <div className="flex-1 text-center py-3 border-r border-border/60">
                          <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Total</div>
                          <div className="font-bold text-foreground text-sm mt-0.5">{formatCurrency(inv.total_amount)}</div>
                        </div>
                        <div className="flex-1 text-center py-3 border-r border-border/60">
                          <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Paid</div>
                          <div className="font-bold text-green-600 dark:text-green-400 text-sm mt-0.5">{formatCurrency(inv.paid_amount)}</div>
                        </div>
                        <div className="flex-1 text-center py-3">
                          <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Balance</div>
                          <div className={`font-bold text-sm mt-0.5 ${inv.pending_amount > 0 ? 'text-red-500' : 'text-green-600 dark:text-green-400'}`}>
                            {formatCurrency(inv.pending_amount)}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>);

};

export default InvoiceManagement;