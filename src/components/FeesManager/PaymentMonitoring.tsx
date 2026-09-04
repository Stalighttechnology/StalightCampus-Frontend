import { translateTerminology, getTerm } from "@/utils/institutionConfig";
import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  CreditCard,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Search,
  Calendar,
  IndianRupee,
  CheckCircle,
  Clock,
  AlertTriangle,
  RefreshCw,
  Eye,
  Download,
  LayoutGrid,
  FileText,
  Users,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Loader2,
  Mail
} from
  'lucide-react';
import DashboardCard from '@/components/common/DashboardCard';
import { useTheme } from '@/context/ThemeContext';
import { showConfirmAlert, showSuccessAlert } from '../../utils/sweetalert';
import {
  getPayments,
  getPaymentStats,
  getPaymentDetails as getPaymentDetailsApi,
  processRefund as processRefundApi,
  downloadReceipt as downloadReceiptApi,
  bulkSendReminders
} from
  "../../utils/fees_manager_api";
import {
  Skeleton,
  SkeletonStatsGrid,
  SkeletonTable,
  SkeletonList,
  SkeletonPageHeader,
  SkeletonCard
} from
  "@/components/ui/skeleton";
import { AnimatePresence, motion } from "framer-motion";


interface Payment {
  id: number;
  components?: {
    component_name: string;
    allocated_amount: number;
  }[];
  invoice: {
    id: number;
    invoice_number: string;
    semester?: number | null;
    invoice_type?: string | null;
    academic_year?: string | null;
    student: {
      id: number;
      name: string;
      usn: string;
      department: string;
      semester: number;
    };
    fee_assignment: {
      template: {
        name: string;
        fee_type: string;
      };
    };
  };
  amount: number;
  payment_date: string;
  payment_method: string;
  transaction_id?: string;
  note?: string;
  status: 'pending' | 'completed' | 'success' | 'failed' | 'refunded';
  stripe_payment_intent_id?: string;
  created_at: string;
  updated_at: string;
}

interface PaymentStats {
  total_payments: number;
  total_amount: number;
  successful_payments: number;
  failed_payments: number;
  pending_payments: number;
  monthly_payments: number;
  monthly_amount: number;
  outstanding_amount: number;
  pending_invoice_count: number;
}

const PaymentMonitoring: React.FC<{ isReadOnly?: boolean }> = ({ isReadOnly = false }) => {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [stats, setStats] = useState<PaymentStats | null>(null);
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false);
  const [isDetailLoading, setIsDetailLoading] = useState(false);
  const [notifying, setNotifying] = useState(false);
  const [hasNotified, setHasNotified] = useState(false);
  const [downloadingReceiptId, setDownloadingReceiptId] = useState<number | null>(null);
  const [expandedInvoice, setExpandedInvoice] = useState<string | null>(null);

  // Group by Student toggle state
  const [groupByStudent, setGroupByStudent] = useState(false);
  const [expandedStudentIds, setExpandedStudentIds] = useState<Set<number>>(new Set());

  // Modal state for Group-by-Student view
  const [selectedStudentGroupForModal, setSelectedStudentGroupForModal] = useState<{
    student: any;
    payments: Payment[];
  } | null>(null);

  const toggleStudentExpand = (studentId: number) => {
    setExpandedStudentIds(prev => {
      const next = new Set(prev);
      if (next.has(studentId)) next.delete(studentId);
      else next.add(studentId);
      return next;
    });
  };

  // Build grouped map: studentId -> { student, payments[] }
  const groupedPayments = React.useMemo(() => {
    const map = new Map<number, { student: any; payments: Payment[] }>();
    payments.forEach(p => {
      const sid = p.invoice.student.id;
      if (!map.has(sid)) map.set(sid, { student: p.invoice.student, payments: [] });
      map.get(sid)!.payments.push(p);
    });
    return Array.from(map.values());
  }, [payments]);

  // Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [appliedSearch, setAppliedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [methodFilter, setMethodFilter] = useState('all');
  const [dateRange, setDateRange] = useState('all');
  const [openSelect, setOpenSelect] = useState<'status' | 'method' | 'date' | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [meta, setMeta] = useState<any>(null);
  const { theme } = useTheme();

  // Helper to normalize amounts (cents or direct amounts) to rupees
  const toRupees = (centsOrAmount: any) => {
    if (centsOrAmount === null || centsOrAmount === undefined) return 0;
    if (Number.isInteger(centsOrAmount)) return centsOrAmount / 100;
    const n = Number(centsOrAmount);
    return isNaN(n) ? 0 : n;
  };

  useEffect(() => {
    fetchData();
    setHasNotified(false); // Reset notified state when filters change
  }, [currentPage, statusFilter, methodFilter, dateRange, appliedSearch]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      setAppliedSearch((prev) => {
        const next = searchQuery.trim();
        if (prev !== next) setCurrentPage(1);
        return next;
      });
    }, 500);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const fetchData = async () => {
    try {
      setLoading(true);

      const params = {
        page: currentPage.toString(),
        ...(appliedSearch && { search: appliedSearch }),
        ...(statusFilter !== 'all' && { status: statusFilter }),
        ...(methodFilter !== 'all' && { mode: methodFilter }),
        ...(dateRange !== 'all' && { date_range: dateRange })
      };

      // Fetch payments
      const paymentsJson = await getPayments(params);

      if (!paymentsJson.success) {
        throw new Error('Failed to fetch payment data');
      }

      // Normalize monetary fields from cents when present
      const normalize = (p: any) => ({
        ...p,
        amount: toRupees(p.amount_cents ?? p.amount),
        payment_method: p.mode ?? p.payment_method ?? 'N/A',
        payment_date: p.timestamp ?? p.payment_date ?? p.created_at ?? null,
        created_at: p.created_at ?? p.timestamp ?? null,
        updated_at: p.updated_at ?? p.timestamp ?? null
      });

      const normalizedPayments = (paymentsJson.data || []).map((p: any) => normalize(p));
      setMeta(paymentsJson.meta || null);

      setPayments(normalizedPayments || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  // Fetch stats only once on component mount
  useEffect(() => {
    getPaymentStats({}).then(statsJson => {
      if (statsJson.success) {
        const s = statsJson.data || {};
        setStats({
          ...s,
          total_amount: toRupees(s.total_amount_cents ?? s.total_amount),
          today_amount: toRupees(s.today_amount_cents ?? s.today_amount),
          monthly_amount: toRupees(s.monthly_amount_cents ?? s.monthly_amount),
          refunded_amount: toRupees(s.refunded_amount_cents ?? s.refunded_amount),
          outstanding_amount: toRupees(s.outstanding_amount_cents ?? s.outstanding_amount)
        });
      }
    }).catch(console.error);
  }, []);

  const fetchPaymentDetails = async (paymentId: number) => {
    // Open dialog immediately so the button always responds and user sees loading

    setSelectedPayment(null);
    setIsDetailLoading(true);
    setIsDetailsDialogOpen(true);
    try {

      const json = await getPaymentDetailsApi(paymentId);

      if (!json.success) {
        throw new Error(json.message || 'Failed to fetch payment details');
      }

      const p = json.data || {};
      const normalized = {
        ...p,
        amount: toRupees(p.amount_cents ?? p.amount),
        payment_method: p.mode ?? p.payment_method ?? 'N/A',
        payment_date: p.timestamp ?? p.payment_date ?? p.created_at ?? null,
        created_at: p.created_at ?? p.timestamp ?? null,
        updated_at: p.updated_at ?? p.timestamp ?? null
      };
      // Ensure invoice and nested fields exist to avoid render crashes
      if (!normalized.invoice) {
        normalized.invoice = {
          id: null,
          invoice_number: 'N/A',
          invoice_type: 'Custom',
          academic_year: 'N/A',
          semester: null,
          student: { id: null, name: 'N/A', usn: '', department: '', semester: '' },
          fee_assignment: { template: { name: 'N/A', fee_type: '' } }
        } as any;
      } else {
        normalized.invoice.student = normalized.invoice.student || { id: null, name: 'N/A', usn: '', department: '', semester: '' };
        normalized.invoice.fee_assignment = normalized.invoice.fee_assignment || { template: { name: 'N/A', fee_type: '' } };
        normalized.invoice.student.department = normalized.invoice.student.department || normalized.invoice.student.branch || '';
        normalized.invoice.student.semester = normalized.invoice.student.semester || '';
        normalized.invoice.invoice_type = normalized.invoice.invoice_type || '';
        normalized.invoice.academic_year = normalized.invoice.academic_year || '';
        normalized.invoice.semester = normalized.invoice.semester || null;
      }


      setSelectedPayment(normalized);
      setIsDetailLoading(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch payment details');
      // Close the dialog if we couldn't fetch details
      setIsDetailLoading(false);
      setIsDetailsDialogOpen(false);
    }
  };

  // debug: log when dialog open state or selected payment changes
  useEffect(() => {

  }, [isDetailsDialogOpen, selectedPayment, isDetailLoading]);

  const processRefund = async (paymentId: number) => {
    const confirmed = await showConfirmAlert(
      'Process Refund?',
      'Are you sure you want to process a refund for this payment?',
      'Yes, refund it'
    );

    if (!confirmed.isConfirmed) return;

    try {
      const result = await processRefundApi(paymentId);

      if (!result.success) {
        throw new Error(result.message || 'Failed to process refund');
      }

      await fetchData();
      showSuccessAlert('Success!', 'Refund processed successfully!');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to process refund');
    }
  };

  const downloadReceipt = async (paymentId: number) => {
    setDownloadingReceiptId(paymentId);
    try {
      const response = await downloadReceiptApi(paymentId);

      if (!response.success) {
        throw new Error(response.message || 'Failed to download receipt');
      }

      const blob = response.data;
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `receipt_${paymentId}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to download receipt');
    } finally {
      setDownloadingReceiptId(null);
    }
  };

  // Server-side filtering is now used, so we just return the payments
  const displayPayments = payments;

  const handleBulkNotify = async () => {
    const confirmed = await showConfirmAlert(
      'Send Bulk Reminders?',
      'This will send fee reminder emails to all students with pending invoices. Continue?',
      'Yes, send now'
    );

    if (!confirmed.isConfirmed) return;

    setNotifying(true);
    try {
      const response = await bulkSendReminders();
      if (response.success) {
        showSuccessAlert(
          'Notifications Sent!',
          `Successfully sent reminders to ${response.data.sent_count} students.`
        );
        setHasNotified(true);
      } else {
        setError(response.message || 'Failed to send bulk reminders');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send bulk reminders');
    } finally {
      setNotifying(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR'
    }).format(amount);
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      completed: { variant: 'default' as const, label: 'Completed', color: 'text-green-600' },
      success: { variant: 'default' as const, label: 'Completed', color: 'text-green-600' },
      pending: { variant: 'secondary' as const, label: 'Pending', color: 'text-yellow-600' },
      failed: { variant: 'destructive' as const, label: 'Failed', color: 'text-red-600' },
      refunded: { variant: 'outline' as const, label: 'Refunded', color: 'text-gray-600' }
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const getMethodBadge = (method: string) => {
    const methodConfig = {
      stripe: { label: 'Stripe', color: 'bg-purple-100 text-purple-800' },
      cash: { label: 'Cash', color: 'bg-green-100 text-green-800' },
      bank_transfer: { label: 'Bank Transfer', color: 'bg-blue-100 text-blue-800' },
      cheque: { label: 'Cheque', color: 'bg-orange-100 text-orange-800' },
      upi: { label: 'UPI', color: 'bg-cyan-100 text-cyan-800' },
      dd: { label: 'DD', color: 'bg-indigo-100 text-indigo-800' },
      neft: { label: 'NEFT', color: 'bg-teal-100 text-teal-800' }
    };

    const config = methodConfig[method as keyof typeof methodConfig] || { label: method, color: 'bg-gray-100 text-gray-800' };
    return <Badge className={config.color}>{config.label}</Badge>;
  };

  // Initial load skeleton - only if we have no data and no stats
  if (loading && payments.length === 0 && !stats) {
    return (
      <div className="space-y-8 p-6">
        <SkeletonPageHeader />
        <SkeletonStatsGrid items={4} columns={4} />
        <div className="space-y-4">
          <Skeleton className="h-10 w-full rounded-xl" />
          <SkeletonTable rows={10} cols={6} />
        </div>
      </div>);

  }



  return (
    <div id="feesmanager-payments-container">
      <Card>
        <div id="feesmanager-payments-header">
          <CardHeader className="border-b border-border/50 flex flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle className="text-xl sm:text-xl md:text-2xl font-semibold text-gray-900">Payment Monitoring</CardTitle>
              <CardDescription className="text-sm sm:text-sm text-muted-foreground mt-1">
                Track and manage all fee payments and transactions
              </CardDescription>
            </div>
          </CardHeader>

          <CardContent className="p-3 pb-0">
            {/* Stats Overview */}
            {stats &&
              <div className="grid grid-cols-1 sm:grid-cols-2 min-[1250px]:grid-cols-4 gap-6 mb-4">
                <DashboardCard
                  title="Total Revenue"
                  value={formatCurrency(stats.total_amount)}
                  description={`${stats.total_payments} total transactions`}
                  icon={<IndianRupee className="h-5 w-5" />} />

                <DashboardCard
                  title="Successful"
                  value={stats.successful_payments}
                  description="Completed payments"
                  icon={<CheckCircle className="h-5 w-5" />} />

                <DashboardCard
                  title="Today's Collection"
                  value={formatCurrency(stats.today_amount)}
                  description={`${stats.today_payments} payments today`}
                  icon={<TrendingUp className="h-5 w-5" />} />

                <DashboardCard
                  title="Outstanding"
                  value={formatCurrency(stats.outstanding_amount)}
                  description={`${stats.pending_invoice_count} unpaid invoices`}
                  icon={<AlertTriangle className="h-5 w-5 text-amber-500" />} />

              </div>
            }
          </CardContent>
        </div>

        <CardContent className="p-6">
          {/* Control Row */}
          <div className="space-y-4 mb-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label className="text-[13px] font-semibold uppercase tracking-wider text-muted-foreground ml-1">Payment Status</Label>
                <Select
                  value={statusFilter}
                  open={openSelect === 'status'}
                  onOpenChange={(open) => setOpenSelect(open ? 'status' : null)}
                  onValueChange={(val) => {
                    setStatusFilter(val);
                    setCurrentPage(1);
                    setTimeout(() => setOpenSelect('method'), 100);
                  }}>
                  <SelectTrigger className="h-10 bg-background border-border/50">
                    <SelectValue placeholder="All Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="success">Completed</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="failed">Failed</SelectItem>
                    <SelectItem value="refunded">Refunded</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-[13px] font-semibold uppercase tracking-wider text-muted-foreground ml-1">Payment Mode</Label>
                <Select
                  value={methodFilter}
                  open={openSelect === 'method'}
                  onOpenChange={(open) => setOpenSelect(open ? 'method' : null)}
                  onValueChange={(val) => {
                    setMethodFilter(val);
                    setCurrentPage(1);
                    setTimeout(() => setOpenSelect('date'), 100);
                  }}>
                  <SelectTrigger className="h-10 bg-background border-border/50">
                    <SelectValue placeholder="All Methods" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Methods</SelectItem>
                    <SelectItem value="razorpay">Razorpay</SelectItem>
                    <SelectItem value="cash">Cash</SelectItem>
                    <SelectItem value="cheque">Cheque</SelectItem>
                    <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                    <SelectItem value="upi">UPI</SelectItem>
                    <SelectItem value="dd">DD</SelectItem>
                    <SelectItem value="neft">NEFT</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-[13px] font-semibold uppercase tracking-wider text-muted-foreground ml-1">Time Period</Label>
                <Select
                  value={dateRange}
                  open={openSelect === 'date'}
                  onOpenChange={(open) => setOpenSelect(open ? 'date' : null)}
                  onValueChange={(val) => {
                    setDateRange(val);
                    setCurrentPage(1);
                    setOpenSelect(null);
                  }}>
                  <SelectTrigger className="h-10 bg-background border-border/50">
                    <SelectValue placeholder="All Time" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Time</SelectItem>
                    <SelectItem value="today">Today</SelectItem>
                    <SelectItem value="week">This Week</SelectItem>
                    <SelectItem value="month">This Month</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by student name, USN, invoice number, or transaction ID..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 pr-12 h-11 bg-background border-border/50 shadow-sm transition-all focus:ring-2 focus:ring-primary/20" />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-primary hover:text-primary/80 transition-colors"
                  >
                    Clear
                  </button>
                )}
              </div>

              {/* Group by Student toggle */}
              <button
                onClick={() => { setGroupByStudent(v => !v); setExpandedStudentIds(new Set()); }}
                className={`flex items-center justify-center gap-2 h-11 px-4 rounded-xl border font-semibold text-sm transition-all whitespace-nowrap w-full sm:w-auto sm:ml-auto ${
                  groupByStudent
                    ? 'bg-primary text-primary-foreground border-primary shadow-md'
                    : 'bg-background border-border/50 text-muted-foreground hover:border-primary/40 hover:text-foreground'
                }`}
                title="Toggle Group by Student"
              >
                <Users className="h-4 w-4" />
                Group by Student
              </button>

              {statusFilter === 'pending' &&
                <Button
                  onClick={handleBulkNotify}
                  disabled={notifying || hasNotified}
                  className={`h-11 px-6 shadow-lg rounded-xl transition-all active:scale-95 flex items-center gap-2 font-semibold ${hasNotified ?
                    "bg-green-600 hover:bg-green-700 text-white shadow-green-200/50" :
                    "bg-primary hover:bg-primary/90 text-white shadow-primary/50"}`
                  }>

                  {notifying ?
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      Sending...
                    </> :
                    hasNotified ?
                      <>
                        <CheckCircle className="w-4 h-4" />
                        Reminders Sent
                      </> :

                      <>
                        <Mail className="w-4 h-4" />
                        Notify All Pending
                      </>
                  }
                </Button>
              }
            </div>
          </div>

          {/* Payments Table */}
          <div className="rounded-xl border border-border/50 overflow-x-auto bg-card/30 backdrop-blur-md custom-scrollbar">
            <Table>
              <TableHeader className="bg-muted/40">
                <TableRow className="hover:bg-transparent border-b border-border/50">
                  {groupByStudent ? (
                    <>
                      <TableHead className="px-6 py-4 text-[13px] font-semibold uppercase tracking-wider">Student Details</TableHead>
                      <TableHead className="px-6 py-4 text-right text-[13px] font-semibold uppercase tracking-wider">Amount</TableHead>
                      <TableHead className="px-6 py-4 text-center text-[13px] font-semibold uppercase tracking-wider">Mode</TableHead>
                      <TableHead className="px-6 py-4 text-center text-[13px] font-semibold uppercase tracking-wider">Status</TableHead>
                      <TableHead className="px-6 py-4 text-center text-[13px] font-semibold uppercase tracking-wider">Actions</TableHead>
                    </>
                  ) : (
                    <>
                      <TableHead className="w-[140px] px-6 py-4 text-[13px] font-semibold uppercase tracking-wider">Invoice #</TableHead>
                      <TableHead className="px-6 py-4 text-[13px] font-semibold uppercase tracking-wider">Student Details</TableHead>
                      <TableHead className="px-6 py-4 text-right text-[13px] font-semibold uppercase tracking-wider">Amount</TableHead>
                      <TableHead className="px-6 py-4 text-center text-[13px] font-semibold uppercase tracking-wider">Mode</TableHead>
                      <TableHead className="px-6 py-4 text-center text-[13px] font-semibold uppercase tracking-wider">Status</TableHead>
                      <TableHead className="px-6 py-4 text-right pr-6 text-[13px] font-semibold uppercase tracking-wider">Actions</TableHead>
                    </>
                  )}
                </TableRow>
              </TableHeader>
              <TableBody className={loading ? "opacity-50 pointer-events-none transition-opacity duration-200" : "transition-opacity duration-200"}>
                {payments.length === 0 ?
                  <TableRow>
                    <TableCell colSpan={6} className="h-72 text-center">
                      <div className="flex flex-col items-center justify-center space-y-3 opacity-60">
                        <div className="bg-muted p-4 rounded-full">
                          <CreditCard className="h-8 w-8 text-muted-foreground" />
                        </div>
                        <div className="space-y-1">
                          <p className="text-sm font-semibold uppercase tracking-widest">No Transactions Found</p>
                          <p className="text-xs text-muted-foreground">Adjust your filters to see more results</p>
                        </div>
                      </div>
                    </TableCell>
                  </TableRow> :

                  groupByStudent ? (
                    groupedPayments.map(({ student, payments: studentPayments }) => {
                      const totalAmt = studentPayments.reduce((s, p) => s + Number(p.amount), 0);

                      // Determine worst case status
                      const allSuccess = studentPayments.every(p => p.status === 'success' || p.status === 'completed');
                      const hasFailed = studentPayments.some(p => p.status === 'failed');
                      const hasPending = studentPayments.some(p => p.status === 'pending');
                      const groupStatus = hasFailed ? 'failed' : hasPending ? 'pending' : allSuccess ? 'completed' : 'pending';

                      return (
                        <React.Fragment key={student.id}>
                          <TableRow
                            className="hover:bg-primary/5 transition-all duration-200 border-b border-border/50"
                          >
                            <TableCell className="px-6 py-4 align-middle">
                              <div className="font-semibold text-foreground leading-tight">{student.name}</div>
                              <div className="text-[13px] font-semibold text-muted-foreground font-mono uppercase tracking-tight mt-1">
                                {student.usn} • Sem {student.semester || 'N/A'}
                              </div>
                            </TableCell>
                            <TableCell className="text-right py-4 align-middle">
                              <div className="font-semibold text-foreground">{formatCurrency(totalAmt)}</div>
                              <Badge variant="outline" className="mt-1 text-[11px]">
                                {studentPayments.length} Payment{studentPayments.length !== 1 ? 's' : ''}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-center py-4 align-middle">
                              <Badge variant="outline" className="text-muted-foreground">Multiple</Badge>
                            </TableCell>
                            <TableCell className="text-center py-4 align-middle">
                              {getStatusBadge(groupStatus as any)}
                            </TableCell>
                            <TableCell className="text-center py-4 align-middle">
                              <Button
                                variant="ghost"
                                size="icon"
                                className={`h-8 w-8 rounded-full transition-all active:scale-95 ${theme === 'dark' ? 'text-blue-400 hover:bg-blue-950/30' : 'text-blue-600 hover:bg-blue-50'}`}
                                title="View All Payments"
                                onClick={() => setSelectedStudentGroupForModal({ student, payments: studentPayments })}
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        </React.Fragment>
                      );
                    })
                  ) :

                  Object.values(
                    payments.reduce((acc, p) => {
                      const invNum = p.invoice.invoice_number;
                      if (!acc[invNum]) acc[invNum] = [];
                      acc[invNum].push(p);
                      return acc;
                    }, {} as Record<string, Payment[]>)
                  ).map((group) => {
                    const invNum = group[0].invoice.invoice_number;
                    const isExpanded = expandedInvoice === invNum;
                    const latestPayment = group.reduce((latest, current) =>
                      new Date(current.payment_date) > new Date(latest.payment_date) ? current : latest
                    );
                    const totalAmount = group.reduce((sum, p) => sum + Number(p.amount), 0);
                    const p = latestPayment;

                    return (
                      <React.Fragment key={invNum}>
                        <TableRow className="hover:bg-primary/5 transition-all duration-200 border-b border-border/50">
                          <TableCell className="py-5 px-6 align-middle">
                            <div className="font-mono font-semibold text-primary tracking-tighter text-sm uppercase">{p.invoice.invoice_number}</div>
                            <div className="mt-1 flex flex-wrap items-center gap-2">
                              <span className="text-[13px] font-semibold text-muted-foreground uppercase tracking-widest">
                                {new Date(p.payment_date).toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' })}
                              </span>
                              {group.length > 1 && <Badge variant="secondary" className="text-[10px] py-0.5 px-1.5 whitespace-nowrap tracking-normal normal-case">{group.length} Payments</Badge>}
                            </div>
                          </TableCell>
                          <TableCell className="px-6 align-middle">
                            <div className="font-semibold text-foreground leading-tight">{p.invoice.student.name}</div>
                            <div className="text-[13px] font-semibold text-muted-foreground font-mono uppercase tracking-tight mt-1">
                              {p.invoice.student.usn} • Sem {p.invoice.semester && p.invoice.semester !== 'N/A' ? p.invoice.semester : p.invoice.student.semester || 'N/A'}
                            </div>
                          </TableCell>
                          <TableCell className="text-right align-middle">
                            <div className="font-semibold text-green-600">{formatCurrency(totalAmount)}</div>
                          </TableCell>
                          <TableCell className="text-center align-middle">
                            {group.length > 1 ? <Badge variant="outline" className="text-muted-foreground">Multiple</Badge> : getMethodBadge(p.payment_method)}
                          </TableCell>
                          <TableCell className="text-center align-middle">
                            {group.length > 1 ? <Badge variant="outline" className="text-muted-foreground">Multiple</Badge> : getStatusBadge(p.status)}
                          </TableCell>
                          <TableCell className="text-right pr-6 align-middle">
                            <div className="flex justify-end gap-2">
                              {group.length > 1 ? (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 px-3 text-xs font-semibold rounded-lg hover:bg-primary/10 hover:text-primary transition-colors border border-border/50 shadow-sm"
                                  onClick={() => setExpandedInvoice(isExpanded ? null : invNum)}
                                >
                                  {isExpanded ? 'Hide' : 'View All'}
                                </Button>
                              ) : (
                                <div className="flex gap-1">
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className={`h-9 w-9 rounded-full transition-all active:scale-95 ${theme === 'dark' ? 'text-blue-400 hover:bg-blue-950/30' : 'text-blue-600 hover:bg-blue-50'}`}
                                    onClick={() => fetchPaymentDetails(p.id)}
                                    title="View Details">
                                    <Eye className="h-4.5 w-4.5" />
                                  </Button>
                                  {(p.status === 'completed' || p.status === 'success' || p.status === 'pending') &&
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className={`h-9 w-9 rounded-full transition-all active:scale-95 ${p.status === 'pending'
                                        ? 'text-gray-400 dark:text-gray-600 opacity-50 cursor-not-allowed'
                                        : (theme === 'dark' ? 'text-green-400 hover:bg-green-950/30' : 'text-green-600 hover:bg-green-50')
                                        }`}
                                      onClick={() => p.status !== 'pending' && downloadReceipt(p.id)}
                                      disabled={downloadingReceiptId !== null || p.status === 'pending'}
                                      title={p.status === 'pending' ? "Cannot Download Receipt for Pending Payment" : "Download Receipt"}>
                                      {downloadingReceiptId === p.id ? (
                                        <Loader2 className="h-4.5 w-4.5 animate-spin" />
                                      ) : (
                                        <Download className="h-4.5 w-4.5" />
                                      )}
                                    </Button>
                                  }
                                  {!isReadOnly && p.status === 'successful' && (
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => confirmRefund(p.id)}
                                      className={`h-8 w-8 transition-all active:scale-95 ${theme === 'dark' ? 'text-amber-400 hover:bg-amber-950/30' : 'text-amber-600 hover:text-amber-700 hover:bg-amber-50'}`}
                                      title="Process Refund"
                                      disabled={refundLoading === p.id}
                                    >
                                      <RotateCcw className="h-4 w-4" />
                                    </Button>
                                  )}
                                </div>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>

                        {/* Expanded Sub-rows for Multiple Payments */}
                        {isExpanded && group.length > 1 && group.map((subPayment, idx) => (
                          <TableRow key={subPayment.id} className="bg-muted/30 border-b border-border/50">
                            <TableCell className="py-3 px-6 align-middle pl-10 border-l-2 border-l-primary/30">
                              <div className="text-[12px] font-semibold text-muted-foreground flex items-center gap-2">
                                <div className="w-1.5 h-1.5 rounded-full bg-primary/40"></div>
                                {new Date(subPayment.payment_date).toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' })}
                              </div>
                            </TableCell>
                            <TableCell className="px-6 align-middle">
                              <div className="text-[12px] font-medium text-muted-foreground">
                                {subPayment.note ? (
                                  <div className="text-foreground font-medium text-xs break-words bg-primary/5 px-2 py-0.5 rounded border border-primary/20 max-w-[240px] mb-0.5">
                                    {subPayment.note}
                                  </div>
                                ) : null}
                                <span className="italic">
                                  {subPayment.transaction_id ? `Txn: ${subPayment.transaction_id}` : `Payment ${idx + 1}`}
                                </span>
                              </div>
                            </TableCell>
                            <TableCell className="text-right align-middle">
                              <div className="font-semibold text-[13px] text-green-600/80">{formatCurrency(subPayment.amount)}</div>
                            </TableCell>
                            <TableCell className="text-center align-middle scale-90 origin-center">
                              {getMethodBadge(subPayment.payment_method)}
                            </TableCell>
                            <TableCell className="text-center align-middle scale-90 origin-center">
                              {getStatusBadge(subPayment.status)}
                            </TableCell>
                            <TableCell className="text-right pr-6 align-middle">
                              <div className="flex justify-end gap-1">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className={`h-8 w-8 rounded-full transition-all active:scale-95 ${theme === 'dark' ? 'text-blue-400 hover:bg-blue-950/30' : 'text-blue-600 hover:bg-blue-50'}`}
                                  onClick={() => fetchPaymentDetails(subPayment.id)}
                                  title="View Details">
                                  <Eye className="h-4 w-4" />
                                </Button>
                                {(subPayment.status === 'completed' || subPayment.status === 'success' || subPayment.status === 'pending') &&
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className={`h-8 w-8 rounded-full transition-all active:scale-95 ${subPayment.status === 'pending'
                                      ? 'text-gray-400 dark:text-gray-600 opacity-50 cursor-not-allowed'
                                      : (theme === 'dark' ? 'text-green-400 hover:bg-green-950/30' : 'text-green-600 hover:bg-green-50')
                                      }`}
                                    onClick={() => subPayment.status !== 'pending' && downloadReceipt(subPayment.id)}
                                    disabled={downloadingReceiptId !== null || subPayment.status === 'pending'}
                                    title={subPayment.status === 'pending' ? "Cannot Download Receipt for Pending Payment" : "Download Receipt"}>
                                    {downloadingReceiptId === subPayment.id ? (
                                      <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : (
                                      <Download className="h-4 w-4" />
                                    )}
                                  </Button>
                                }
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </React.Fragment>
                    );
                  })
                }
              </TableBody>
            </Table>

          </div>
        </CardContent>        {/* Pagination Footer */}
        {meta && meta.total_pages > 1 && (
          <CardFooter className={`flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-muted-foreground px-6 py-4 border-t border-border mt-auto`}>
            <div className={`text-sm font-medium ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}`}>
              Showing Page {currentPage} of {meta.total_pages}
            </div>
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                className="bg-primary text-white border-primary hover:bg-primary/90 hover:border-primary/90 px-4 h-9 shadow-sm shadow-primary/10"
                onClick={() => {
                  if (currentPage > 1) {
                    const next = currentPage - 1;
                    setCurrentPage(next);
                  }
                }}
                disabled={currentPage === 1}
              >
                Previous
              </Button>

              <div className={`min-w-10 h-9 flex items-center justify-center rounded-md border text-sm font-semibold ${theme === 'dark' ? 'bg-muted/50 border-border text-foreground' : 'bg-gray-50 border-gray-200 text-gray-900'}`}>
                {currentPage}
              </div>

              <Button
                variant="outline"
                size="sm"
                className="bg-primary text-white border-primary hover:bg-primary/90 hover:border-primary/90 px-4 h-9 shadow-sm shadow-primary/10"
                onClick={() => {
                  if (currentPage < meta.total_pages) {
                    const next = currentPage + 1;
                    setCurrentPage(next);
                  }
                }}
                disabled={currentPage === meta.total_pages}
              >
                Next
              </Button>
            </div>
          </CardFooter>
        )}
      </Card>

      {/* Payment Details Dialog */}
      <Dialog open={isDetailsDialogOpen} onOpenChange={setIsDetailsDialogOpen}>
        <DialogContent className={`max-w-lg w-[90vw] h-[80vh] md:h-[80vh] border shadow-2xl p-0 gap-0 overflow-hidden rounded-xl flex flex-col ${theme === 'dark' ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'}`}>
          <DialogHeader className="sr-only">
            <DialogTitle>Payment Details</DialogTitle>
            <DialogDescription>Detailed information about the selected payment transaction</DialogDescription>
          </DialogHeader>
          {/* Header */}
          <div className={`p-6 pr-12 border-b flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 sm:gap-4 flex-shrink-0 ${theme === 'dark' ? 'border-slate-800 bg-slate-900' : 'border-slate-100 bg-white'}`}>
            <div>
              <h2 className={`text-xl font-semibold tracking-tight ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>Transaction Statement</h2>
              <p className={`text-sm mt-1 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>#{selectedPayment?.transaction_id?.substring(0, 12) || 'REF-N/A'}</p>
            </div>
            <div className="flex flex-row sm:flex-col items-center sm:items-end gap-2 sm:gap-1.5 shrink-0">
              <div className="scale-100 origin-right">
                {selectedPayment && getStatusBadge(selectedPayment.status)}
              </div>
              <span className={`text-sm font-medium ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                {selectedPayment && new Date(selectedPayment.payment_date).toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' })}
              </span>
            </div>
          </div>

          <div className={`p-6 flex-1 overflow-y-auto custom-scrollbar space-y-6 ${theme === 'dark' ? 'bg-slate-950/40' : 'bg-slate-50/50'}`}>
            {isDetailLoading ? (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <SkeletonCard className="h-32" />
                  <SkeletonCard className="h-32" />
                </div>
                <Skeleton className="h-24 w-full rounded-xl" />
                <div className="space-y-4">
                  <Skeleton className="h-4 w-1/4" />
                  <Skeleton className="h-32 w-full rounded-xl" />
                </div>
                <div className="flex gap-3">
                  <Skeleton className="h-11 flex-1 rounded-xl" />
                  <Skeleton className="h-11 flex-1 rounded-xl" />
                  <Skeleton className="h-11 flex-1 rounded-xl" />
                </div>
              </div>
            ) : (
              selectedPayment && (
                <>
                  {/* Payer Information */}
                  <div className={`p-4 rounded-lg border grid grid-cols-2 gap-y-4 ${theme === 'dark' ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200'}`}>
                    <div className="col-span-2">
                      <p className={`text-xs font-semibold uppercase tracking-widest ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>Payer Information</p>
                      <p className={`text-base font-semibold mt-1 leading-tight ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>{selectedPayment.invoice.student.name}</p>
                    </div>
                    <div>
                      <p className={`text-xs font-semibold uppercase tracking-widest font-mono ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>{translateTerminology("USN")}</p>
                      <p className={`text-sm font-medium mt-1 ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>{selectedPayment.invoice.student.usn}</p>
                    </div>
                    <div>
                      <p className={`text-xs font-semibold uppercase tracking-widest ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>{translateTerminology("Department")}</p>
                      <p className={`text-sm font-medium mt-1 ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>{selectedPayment.invoice.student.department}</p>
                    </div>
                    <div className="col-span-2">
                      <p className={`text-xs font-semibold uppercase tracking-widest ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>{translateTerminology("Semester")}</p>
                      <p className="text-sm font-semibold mt-1 text-primary">
                        {selectedPayment.invoice.semester && selectedPayment.invoice.semester !== 'N/A'
                          ? `${translateTerminology("Semester")} ${selectedPayment.invoice.semester}`
                          : selectedPayment.invoice.student.semester && selectedPayment.invoice.student.semester !== 'N/A'
                            ? `${translateTerminology("Semester")} ${selectedPayment.invoice.student.semester}`
                            : 'N/A'}
                      </p>
                    </div>
                  </div>

                  {/* Associated Fee */}
                  <div className={`p-4 rounded-lg border grid grid-cols-2 gap-y-4 ${theme === 'dark' ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200'}`}>
                    <div className="col-span-2">
                      <p className={`text-xs font-semibold uppercase tracking-widest ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>Associated Fee</p>
                      <p className={`text-base font-semibold mt-1 leading-tight ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                        {selectedPayment.invoice?.fee_assignment?.template?.name || 'Manual Assignment'}
                      </p>
                    </div>
                    <div>
                      <p className={`text-xs font-semibold uppercase tracking-widest ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>Fee Type / {translateTerminology("Semester")}</p>
                      <p className={`text-sm font-medium mt-1 capitalize ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
                        {selectedPayment.invoice?.fee_assignment?.template?.fee_type ||
                          (selectedPayment.invoice?.invoice_type ? selectedPayment.invoice.invoice_type.replace('_', ' ') : 'N/A')}
                        {selectedPayment.invoice?.academic_year ? ` (${selectedPayment.invoice.academic_year})` : ''}
                      </p>
                    </div>
                    <div>
                      <p className={`text-xs font-semibold uppercase tracking-widest font-mono ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>Invoice</p>
                      <p className={`text-sm font-medium mt-1 font-mono ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
                        {selectedPayment.invoice?.invoice_number}
                      </p>
                    </div>
                  </div>

                  {/* Particulars Breakdown */}
                  {selectedPayment.components && selectedPayment.components.length > 0 && (
                    <div className={`p-4 rounded-lg border ${theme === 'dark' ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200'}`}>
                      <p className={`text-xs font-semibold uppercase tracking-widest mb-3 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                        Particulars Breakdown
                      </p>
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs">
                          <thead>
                            <tr className={`border-b ${theme === 'dark' ? 'border-slate-800 text-slate-400' : 'border-slate-200 text-slate-500'}`}>
                              <th className="pb-2 font-medium">Particulars</th>
                              <th className="pb-2 font-medium text-right">Amount</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-border/20">
                            {selectedPayment.components.map((comp, idx) => (
                              <tr key={idx} className={theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}>
                                <td className="py-2.5 font-medium">{comp.component_name}</td>
                                <td className="py-2.5 text-right font-semibold">{formatCurrency(comp.allocated_amount)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* Financial Summary */}
                  <div className={`p-4 rounded-lg border grid grid-cols-2 gap-y-4 ${theme === 'dark' ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200'}`}>
                    <div>
                      <p className={`text-xs font-semibold uppercase tracking-widest ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>Payment Amount</p>
                      <p className={`text-xl font-semibold mt-1 tracking-tight ${theme === 'dark' ? 'text-emerald-400' : 'text-emerald-600'}`}>
                        {formatCurrency(selectedPayment.amount)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className={`text-xs font-semibold uppercase tracking-widest ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>Method</p>
                      <div className="mt-1 flex justify-end">
                        {getMethodBadge(selectedPayment.payment_method)}
                      </div>
                    </div>
                  </div>

                  {/* Technical Details */}
                  <div className={`p-4 rounded-lg border grid grid-cols-1 gap-y-4 ${theme === 'dark' ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200'}`}>
                    <div>
                      <p className={`text-xs font-semibold uppercase tracking-widest ${theme === 'dark' ? 'text-slate-300' : 'text-slate-500'}`}>Technical Details</p>
                    </div>
                    <div className={`h-px ${theme === 'dark' ? 'bg-slate-800' : 'bg-slate-100'}`}></div>
                    <div>
                      <p className={`text-xs font-semibold uppercase tracking-widest font-mono ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>Transaction ID</p>
                      <p className={`text-sm font-medium mt-1 font-mono break-all select-all ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
                        {selectedPayment.transaction_id || 'N/A'}
                      </p>
                    </div>
                    {selectedPayment.note && (
                      <div>
                        <p className={`text-xs font-semibold uppercase tracking-widest ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>Note / Remarks</p>
                        <p className={`text-sm font-medium mt-1 break-words p-2.5 rounded-lg border ${theme === 'dark' ? 'bg-slate-800/60 border-slate-700 text-slate-200' : 'bg-slate-50 border-slate-200 text-slate-800'}`}>
                          {selectedPayment.note}
                        </p>
                      </div>
                    )}
                    {selectedPayment.stripe_payment_intent_id && (
                      <div>
                        <p className={`text-xs font-semibold uppercase tracking-widest font-mono ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>Stripe Payment Intent</p>
                        <p className={`text-sm font-medium mt-1 font-mono break-all select-all ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
                          {selectedPayment.stripe_payment_intent_id}
                        </p>
                      </div>
                    )}
                    <div className="flex justify-between items-center">
                      <p className={`text-xs font-semibold uppercase tracking-widest ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>Logged At</p>
                      <p className={`text-sm font-medium ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
                        {new Date(selectedPayment.created_at).toLocaleString()}
                      </p>
                    </div>
                  </div>
                </>
              )
            )}
          </div>

          {/* Footer Actions */}
          <div className={`p-6 border-t flex flex-col sm:flex-row gap-3 flex-shrink-0 ${theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100'}`}>
            {selectedPayment && (selectedPayment.status === 'completed' || selectedPayment.status === 'success' || selectedPayment.status === 'pending') && (
              <button
                onClick={() => selectedPayment.status !== 'pending' && downloadReceipt(selectedPayment.id)}
                disabled={downloadingReceiptId !== null || selectedPayment.status === 'pending'}
                className="flex-1 bg-primary hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium py-2.5 px-4 rounded-lg shadow-sm transition-colors flex items-center justify-center gap-2 text-sm"
                title={selectedPayment.status === 'pending' ? "Cannot Download Receipt for Pending Payment" : "Download Receipt"}
              >
                {downloadingReceiptId === selectedPayment.id ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Downloading...</span>
                  </>
                ) : (
                  <>
                    <Download className="h-4 w-4" />
                    <span>Download Receipt</span>
                  </>
                )}
              </button>
            )}
            {selectedPayment && selectedPayment.status === 'completed' && selectedPayment.payment_method === 'stripe' && (
              <button
                onClick={() => processRefund(selectedPayment.id)}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white font-medium py-2.5 px-4 rounded-lg shadow-sm transition-colors flex items-center justify-center gap-2 text-sm"
              >
                Process Refund
              </button>
            )}
            <button
              onClick={() => setIsDetailsDialogOpen(false)}
              className={`px-6 py-2.5 font-medium rounded-lg transition-colors text-sm ${theme === 'dark' ? 'bg-primary hover:bg-primary/90 text-white shadow-sm' : 'border border-slate-200 hover:border-slate-300 text-slate-700'}`}
            >
              Close Window
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Student Group Payments Modal */}
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
                    <span className="font-medium text-muted-foreground">Sem {selectedStudentGroupForModal.student.semester || 'N/A'}</span>
                  </div>
                </div>
              </div>

              {/* Modal Body */}
              <div className="p-4 sm:p-6 overflow-y-auto space-y-3.5 flex-1 bg-background">
                {/* Summary Banner */}
                <div className="flex items-center justify-between p-3.5 rounded-xl bg-muted/40 border border-border/80 dark:border-border/70 text-xs font-semibold">
                  <span className="text-muted-foreground font-medium">
                    Payments ({selectedStudentGroupForModal.payments.length})
                  </span>
                  <span className="text-sm font-semibold text-foreground">
                    Total: <span className="text-green-600 dark:text-green-400 font-bold">{formatCurrency(selectedStudentGroupForModal.payments.reduce((sum, p) => sum + Number(p.amount), 0))}</span>
                  </span>
                </div>

                {/* Payments List */}
                <div className="space-y-3">
                  {selectedStudentGroupForModal.payments.map((p) => (
                    <div
                      key={p.id}
                      className="rounded-xl border border-border/80 dark:border-border/70 bg-card hover:border-primary/40 shadow-sm transition-all overflow-hidden"
                    >
                      {/* Card Top – Invoice # + Status */}
                      <div className="flex items-center justify-between px-4 py-3 bg-muted/30 border-b border-border/60">
                        <span className="font-mono font-bold text-primary text-sm uppercase tracking-tight">
                          {p.invoice.invoice_number}
                        </span>
                        {getStatusBadge(p.status)}
                      </div>

                      {/* Card Body */}
                      <div className="px-4 py-3 grid grid-cols-2 gap-x-6 gap-y-2.5 text-sm">
                        {/* Date */}
                        <div>
                          <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-0.5">Date</div>
                          <div className="font-medium text-foreground">
                            {new Date(p.payment_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                          </div>
                        </div>

                        {/* Academic Year */}
                        <div>
                          <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-0.5">Academic Year</div>
                          <div className="font-medium text-foreground">
                            {p.invoice.academic_year || '—'}
                          </div>
                        </div>

                        {/* Template Name */}
                        <div className="col-span-2">
                          <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-0.5">Template</div>
                          <div className="font-semibold text-foreground">
                            {p.invoice.fee_assignment?.template?.name || 'Manual Entry'}
                          </div>
                        </div>

                        {/* Fee Type */}
                        <div>
                          <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-0.5">Fee Type</div>
                          <Badge variant="secondary" className="text-[10px] uppercase font-semibold tracking-wider px-2 py-0.5 border border-border/50">
                            {p.invoice.fee_assignment?.template?.fee_type || 'Custom'}
                          </Badge>
                        </div>

                        {/* Payment Method */}
                        <div>
                          <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-0.5">Method</div>
                          {getMethodBadge(p.payment_method)}
                        </div>

                        {/* Custom Note */}
                        {p.note && (
                          <div className="col-span-2">
                            <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-0.5">Note / Remarks</div>
                            <div className="text-xs font-medium text-foreground bg-primary/5 px-2.5 py-1.5 rounded-md border border-primary/20 break-words">
                              {p.note}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Card Footer – amount */}
                      <div className="flex items-center border-t border-border/60">
                        <div className="flex-1 text-center py-3">
                          <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Amount Paid</div>
                          <div className="font-bold text-green-600 dark:text-green-400 text-sm mt-0.5">{formatCurrency(p.amount)}</div>
                        </div>
                        {(p.status === 'completed' || p.status === 'success') && (
                          <div className="border-l border-border/60 px-4 py-3">
                            <Button
                              variant="ghost"
                              size="icon"
                              className={`h-8 w-8 rounded-full transition-all active:scale-95 ${theme === 'dark' ? 'text-green-400 hover:bg-green-950/30' : 'text-green-600 hover:bg-green-50'}`}
                              title="Download Receipt"
                              onClick={() => downloadReceipt(p.id)}
                              disabled={downloadingReceiptId !== null}
                            >
                              {downloadingReceiptId === p.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                            </Button>
                          </div>
                        )}
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

export default PaymentMonitoring;