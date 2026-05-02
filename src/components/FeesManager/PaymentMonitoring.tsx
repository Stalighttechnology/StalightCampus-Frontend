import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
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
  Mail
} from 'lucide-react';
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
} from "../../utils/fees_manager_api";
import { 
  Skeleton, 
  SkeletonStatsGrid, 
  SkeletonTable, 
  SkeletonList, 
  SkeletonPageHeader,
  SkeletonCard
} from "@/components/ui/skeleton";


interface Payment {
  id: number;
  invoice: {
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

const PaymentMonitoring: React.FC = () => {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [stats, setStats] = useState<PaymentStats | null>(null);
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false);
  const [isDetailLoading, setIsDetailLoading] = useState(false);
  const [notifying, setNotifying] = useState(false);
  const [hasNotified, setHasNotified] = useState(false);

  // Filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [methodFilter, setMethodFilter] = useState('all');
  const [dateRange, setDateRange] = useState('all');
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
  }, [currentPage, statusFilter, methodFilter, dateRange]);

  // Debounced search
  useEffect(() => {
    // Skip the first render if searchTerm is empty to avoid duplicate calls on mount
    const timer = setTimeout(() => {
      if (searchTerm) {
        if (currentPage === 1) {
          fetchData();
        } else {
          setCurrentPage(1);
        }
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const fetchData = async () => {
    try {
      setLoading(true);

      const params = {
        page: currentPage.toString(),
        ...(searchTerm && { search: searchTerm }),
        ...(statusFilter !== 'all' && { status: statusFilter }),
        ...(methodFilter !== 'all' && { mode: methodFilter }),
        ...(dateRange !== 'all' && { date_range: dateRange }),
      };

      // Fetch payments and stats in parallel
      const [paymentsJson, statsJson] = await Promise.all([
        getPayments(params),
        getPaymentStats(params)
      ]);

      if (!paymentsJson.success || !statsJson.success) {
        throw new Error('Failed to fetch payment data');
      }

      // Normalize monetary fields from cents when present
      const normalize = (p: any) => ({
        ...p,
        amount: toRupees(p.amount_cents ?? p.amount),
        payment_method: p.mode ?? p.payment_method ?? 'N/A',
        payment_date: p.timestamp ?? p.payment_date ?? p.created_at ?? null,
        created_at: p.created_at ?? p.timestamp ?? null,
        updated_at: p.updated_at ?? p.timestamp ?? null,
      });

      const normalizedPayments = (paymentsJson.data || []).map((p: any) => normalize(p));
      setMeta(paymentsJson.meta || null);

      const s = statsJson.data || {};
      const normalizedStats = {
        ...s,
        total_amount: toRupees(s.total_amount_cents ?? s.total_amount),
        today_amount: toRupees(s.today_amount_cents ?? s.today_amount),
        monthly_amount: toRupees(s.monthly_amount_cents ?? s.monthly_amount),
        refunded_amount: toRupees(s.refunded_amount_cents ?? s.refunded_amount),
        outstanding_amount: toRupees(s.outstanding_amount_cents ?? s.outstanding_amount),
      };

      setPayments(normalizedPayments || []);
      setStats(normalizedStats);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const fetchPaymentDetails = async (paymentId: number) => {
    // Open dialog immediately so the button always responds and user sees loading
    console.debug('fetchPaymentDetails start for', paymentId);
    setSelectedPayment(null);
    setIsDetailLoading(true);
    setIsDetailsDialogOpen(true);
    try {
      console.debug('fetchPaymentDetails called for', paymentId);
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
        updated_at: p.updated_at ?? p.timestamp ?? null,
      };
      // Ensure invoice and nested fields exist to avoid render crashes
      if (!normalized.invoice) {
        normalized.invoice = {
          id: null,
          invoice_number: 'N/A',
          student: { id: null, name: 'N/A', usn: '', department: '', semester: '' },
          fee_assignment: { template: { name: 'N/A', fee_type: '' } },
        } as any;
      } else {
        normalized.invoice.student = normalized.invoice.student || { id: null, name: 'N/A', usn: '', department: '', semester: '' };
        normalized.invoice.fee_assignment = normalized.invoice.fee_assignment || { template: { name: 'N/A', fee_type: '' } };
        normalized.invoice.student.department = normalized.invoice.student.department || normalized.invoice.student.branch || '';
        normalized.invoice.student.semester = normalized.invoice.student.semester || '';
      }

      console.debug('normalized payment detail:', normalized);
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
    console.debug('Details dialog open:', isDetailsDialogOpen, 'selectedPayment:', selectedPayment, 'loading:', isDetailLoading);
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
      currency: 'INR',
    }).format(amount);
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      completed: { variant: 'default' as const, label: 'Completed', color: 'text-green-600' },
      success: { variant: 'default' as const, label: 'Completed', color: 'text-green-600' },
      pending: { variant: 'secondary' as const, label: 'Pending', color: 'text-yellow-600' },
      failed: { variant: 'destructive' as const, label: 'Failed', color: 'text-red-600' },
      refunded: { variant: 'outline' as const, label: 'Refunded', color: 'text-gray-600' },
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
      neft: { label: 'NEFT', color: 'bg-teal-100 text-teal-800' },
    };

    const config = methodConfig[method as keyof typeof methodConfig] || { label: method, color: 'bg-gray-100 text-gray-800' };
    return <Badge className={config.color}>{config.label}</Badge>;
  };

  if (loading) {
    return (
      <div className="space-y-8 p-6">
        <SkeletonPageHeader />
        <SkeletonStatsGrid items={4} />
        <div className="space-y-4">
          <Skeleton className="h-10 w-full rounded-xl" />
          <SkeletonTable rows={10} cols={6} />
        </div>
      </div>
    );
  }



  return (
    <div >
      <Card>
        <CardHeader className="border-b bg-muted/20 pb-6 px-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <CardTitle>
                Payment Monitoring
              </CardTitle>
              <p className="text-muted-foreground mt-1 text-sm">Track and manage all fee payments and transactions</p>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-6">
          {/* Stats Overview */}
          {stats && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <DashboardCard
                title="Total Revenue"
                value={formatCurrency(stats.total_amount)}
                description={`${stats.total_payments} total transactions`}
                icon={<DollarSign className="h-5 w-5" />}
              />
              <DashboardCard
                title="Successful"
                value={stats.successful_payments}
                description="Completed payments"
                icon={<CheckCircle className="h-5 w-5" />}
              />
              <DashboardCard
                title="Today's Collection"
                value={formatCurrency(stats.today_amount)}
                description={`${stats.today_payments} payments today`}
                icon={<TrendingUp className="h-5 w-5" />}
              />
              <DashboardCard
                title="Outstanding"
                value={formatCurrency(stats.outstanding_amount)}
                description={`${stats.pending_invoice_count} unpaid invoices`}
                icon={<AlertTriangle className="h-5 w-5 text-amber-500" />}
              />
            </div>
          )}

          {/* Control Row */}
          <div className="space-y-4 mb-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label className="text-[13px] font-semibold uppercase tracking-wider text-muted-foreground ml-1">Payment Status</Label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="h-10 bg-background border-border/50">
                    <SelectValue placeholder="All Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="failed">Failed</SelectItem>
                    <SelectItem value="refunded">Refunded</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-[13px] font-semibold uppercase tracking-wider text-muted-foreground ml-1">Payment Mode</Label>
                <Select value={methodFilter} onValueChange={setMethodFilter}>
                  <SelectTrigger className="h-10 bg-background border-border/50">
                    <SelectValue placeholder="All Methods" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Methods</SelectItem>
                    <SelectItem value="stripe">Stripe</SelectItem>
                    <SelectItem value="cash">Cash</SelectItem>
                    <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                    <SelectItem value="cheque">Cheque</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-[13px] font-semibold uppercase tracking-wider text-muted-foreground ml-1">Time Period</Label>
                <Select value={dateRange} onValueChange={setDateRange}>
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
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 h-11 bg-background border-border/50 shadow-sm transition-all focus:ring-2 focus:ring-primary/20"
                />
              </div>
              
              {statusFilter === 'pending' && (
                <Button 
                  onClick={handleBulkNotify}
                  disabled={notifying || hasNotified}
                  className={`h-11 px-6 shadow-lg rounded-xl transition-all active:scale-95 flex items-center gap-2 font-semibold ${
                    hasNotified 
                      ? "bg-green-600 hover:bg-green-700 text-white shadow-green-200/50" 
                      : "bg-primary hover:bg-primary/90 text-white shadow-primary/50"
                  }`}
                >
                  {notifying ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      Sending...
                    </>
                  ) : hasNotified ? (
                    <>
                      <CheckCircle className="w-4 h-4" />
                      Reminders Sent
                    </>
                  ) : (
                    <>
                      <Mail className="w-4 h-4" />
                      Notify All Pending
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>

          {/* Payments Table */}
          <div className="rounded-xl border border-border/50 overflow-x-auto bg-card/30 backdrop-blur-md custom-scrollbar">
            <Table>
              <TableHeader className="bg-muted/40">
                <TableRow className="hover:bg-transparent border-b border-border/50">
                  <TableHead className="w-[140px] px-6 py-4 text-[13px] font-semibold uppercase tracking-wider">Invoice #</TableHead>
                  <TableHead className="px-6 py-4 text-[13px] font-semibold uppercase tracking-wider">Student Details</TableHead>
                  <TableHead className="px-6 py-4 text-right text-[13px] font-semibold uppercase tracking-wider">Amount</TableHead>
                  <TableHead className="px-6 py-4 text-center text-[13px] font-semibold uppercase tracking-wider">Mode</TableHead>
                  <TableHead className="px-6 py-4 text-center text-[13px] font-semibold uppercase tracking-wider">Status</TableHead>
                  <TableHead className="px-6 py-4 text-right pr-6 text-[13px] font-semibold uppercase tracking-wider">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payments.length === 0 ? (
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
                  </TableRow>
                ) : (
                  payments.map((p) => (
                    <TableRow key={p.id} className="hover:bg-primary/5 transition-all duration-200 border-b border-border/50">
                      <TableCell className="py-5 px-6 align-middle">
                        <div className="font-mono font-semibold text-primary tracking-tighter text-sm uppercase">{p.invoice.invoice_number}</div>
                        <div className="text-[13px] font-semibold text-muted-foreground uppercase tracking-widest mt-1">
                          {new Date(p.payment_date).toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' })}
                        </div>
                      </TableCell>
                      <TableCell className="px-6 align-middle">
                        <div className="font-semibold text-foreground leading-tight">{p.invoice.student.name}</div>
                        <div className="text-[13px] font-semibold text-muted-foreground font-mono uppercase tracking-tight mt-1">
                          {p.invoice.student.usn} • Sem {p.invoice.student.semester}
                        </div>
                      </TableCell>
                      <TableCell className="text-right align-middle">
                        <div className="font-semibold text-green-600">{formatCurrency(p.amount)}</div>

                      </TableCell>
                      <TableCell className="text-center align-middle">
                        {getMethodBadge(p.payment_method)}
                      </TableCell>
                      <TableCell className="text-center align-middle">
                        {getStatusBadge(p.status)}
                      </TableCell>
                      <TableCell className="text-right pr-6 align-middle">
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-9 w-9 text-blue-600 hover:bg-blue-50 rounded-full transition-all active:scale-95"
                            onClick={() => fetchPaymentDetails(p.id)}
                            title="View Details"
                          >
                            <Eye className="h-4.5 w-4.5" />
                          </Button>
                          {(p.status === 'completed' || p.status === 'success') && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-9 w-9 text-green-600 hover:bg-green-50 rounded-full transition-all active:scale-95"
                              onClick={() => downloadReceipt(p.id)}
                              title="Download Receipt"
                            >
                              <Download className="h-4.5 w-4.5" />
                            </Button>
                          )}
                          {p.status === 'completed' && p.payment_method === 'stripe' && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-9 w-9 text-red-600 hover:bg-red-50 rounded-full transition-all active:scale-95"
                              onClick={() => processRefund(p.id)}
                              title="Process Refund"
                            >
                              <RefreshCw className="h-4.5 w-4.5" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>

            {/* Pagination Footer */}
            {meta && meta.total_pages > 1 && (
              <div className="p-5 border-t flex flex-col sm:flex-row items-center justify-between gap-4 bg-muted/10">
                <p className="text-[13px] font-medium text-muted-foreground">
                  Showing <span className="text-foreground font-semibold">{(meta.page - 1) * 25 + 1}</span> to <span className="text-foreground font-semibold">{Math.min(meta.page * 25, meta.total_count)}</span> of <span className="text-foreground font-semibold">{meta.total_count}</span> results
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="pagination-btn text-white bg-primary border-primary hover:bg-primary/90 hover:border-primary/90 hover:text-white px-4 h-9 rounded-lg transition-all active:scale-95 disabled:opacity-50"
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  >
                    <ChevronLeft className="h-4 w-4 mr-1" />
                    Previous
                  </Button>

                  <Button
                    variant="outline"
                    size="sm"
                    disabled
                    className={cn(
                      "h-9 w-10 font-bold rounded-lg border-border/50",
                      theme === 'dark' ? "bg-card text-foreground" : "bg-white text-gray-900"
                    )}
                  >
                    {currentPage}
                  </Button>

                  <Button
                    variant="outline"
                    size="sm"
                    className="pagination-btn text-white bg-primary border-primary hover:bg-primary/90 hover:border-primary/90 hover:text-white px-4 h-9 rounded-lg transition-all active:scale-95 disabled:opacity-50"
                    disabled={currentPage === meta.total_pages}
                    onClick={() => setCurrentPage(p => Math.min(meta.total_pages, p + 1))}
                  >
                    Next
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Payment Details Dialog */}
      <Dialog open={isDetailsDialogOpen} onOpenChange={setIsDetailsDialogOpen}>
        <DialogContent className="max-w-lg h-[600px] w-[90vw] border-none shadow-2xl p-0 overflow-hidden bg-card rounded-3xl">
          <DialogHeader className="sr-only">
            <DialogTitle>Payment Details</DialogTitle>
            <DialogDescription>Detailed information about the selected payment transaction</DialogDescription>
          </DialogHeader>
          {/* Refined Header */}
          <div className="px-6 py-5 border-b border-border/50 bg-muted/20">
            <div className="flex items-center justify-between pr-10">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <CreditCard className="h-4 w-4 text-primary opacity-80" />
                  <span className="text-[13px] font-semibold uppercase tracking-[0.15em] text-muted-foreground/80">Transaction Statement</span>
                </div>
                <h2 className="text-xl font-semibold tracking-tight text-foreground truncate max-w-[200px] sm:max-w-none">
                  #{selectedPayment?.transaction_id?.substring(0, 12) || 'REF-N/A'}
                </h2>
              </div>
              <div className="flex flex-col items-end gap-1.5 shrink-0">
                <div className="scale-90 origin-right">
                  {selectedPayment && getStatusBadge(selectedPayment.status)}
                </div>
                <span className="text-[12px] text-muted-foreground font-semibold">
                  {selectedPayment && new Date(selectedPayment.payment_date).toLocaleDateString()}
                </span>
              </div>
            </div>
          </div>

          <div className="p-6 space-y-6 max-h-[80vh] overflow-y-auto custom-scrollbar">
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
            ) : selectedPayment && (

              <>
                {/* Info Grid - Responsive */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-3 p-4 rounded-xl border border-border/50 bg-muted/5">
                    <h4 className="text-[12px] font-semibold uppercase text-muted-foreground flex items-center gap-2 tracking-widest">
                      <Users className="h-3.5 w-3.5 text-primary" /> Payer Information
                    </h4>
                    <div className="space-y-1">
                      <p className="text-base font-semibold text-foreground leading-tight">{selectedPayment.invoice.student.name}</p>
                      <div className="space-y-0.5">
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{selectedPayment.invoice.student.usn}</p>
                        <p className="text-xs text-muted-foreground/70">{selectedPayment.invoice.student.department}</p>
                        <p className="text-xs font-semibold text-primary/80">Semester {selectedPayment.invoice.student.semester || 'N/A'}</p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3 p-4 rounded-xl border border-border/50 bg-muted/5">
                    <h4 className="text-[12px] font-semibold uppercase text-muted-foreground flex items-center gap-2 tracking-widest">
                      <FileText className="h-3.5 w-3.5 text-primary" /> Associated Fee
                    </h4>
                    <div className="space-y-1">
                      <p className="text-base font-semibold text-foreground leading-tight">
                        {selectedPayment.invoice?.fee_assignment?.template?.name || 'Manual Assignment'}
                      </p>
                      <div className="flex flex-col gap-1.5 mt-1">
                        <Badge variant="secondary" className="w-fit text-[10px] h-4.5 px-2 font-semibold uppercase border-none">
                          {selectedPayment.invoice?.fee_assignment?.template?.fee_type || 'N/A'}
                        </Badge>
                        <div className="text-[12px] font-semibold text-muted-foreground">Invoice: <span className="text-primary font-mono">{selectedPayment.invoice?.invoice_number}</span></div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Financial Summary */}
                <div className="bg-primary/5 rounded-xl border border-primary/10 p-5 grid grid-cols-2 gap-4 text-center shadow-inner">
                  <div className="border-r border-primary/10">
                    <p className="text-[11px] text-muted-foreground uppercase font-semibold tracking-wider mb-1">Payment Amount</p>
                    <p className="text-xl font-bold text-green-600 tracking-tight">{formatCurrency(selectedPayment.amount)}</p>
                  </div>
                  <div className="flex flex-col items-center justify-center">
                    <p className="text-[11px] text-muted-foreground uppercase font-semibold tracking-wider mb-1">Method</p>
                    <div className="scale-100">{getMethodBadge(selectedPayment.payment_method)}</div>
                  </div>
                </div>

                {/* Technical Details */}
                <div className="space-y-4">
                  <h4 className="text-[12px] font-semibold uppercase text-muted-foreground flex items-center gap-2 tracking-widest px-1">
                    <LayoutGrid className="h-3.5 w-3.5 text-primary" /> Technical Details
                  </h4>
                  <div className="border border-border/50 rounded-xl p-5 space-y-4 bg-muted/5 font-mono text-[11px]">
                    <div className="space-y-1.5 pb-3 border-b border-border/30">
                      <span className="text-muted-foreground uppercase text-[9px] font-bold tracking-widest">Transaction ID</span>
                      <p className="font-bold text-foreground select-all break-all leading-relaxed bg-background/50 p-2 rounded-lg border border-border/20">
                        {selectedPayment.transaction_id || 'N/A'}
                      </p>
                    </div>
                    {selectedPayment.stripe_payment_intent_id && (
                      <div className="space-y-1.5 pb-3 border-b border-border/30">
                        <span className="text-muted-foreground uppercase text-[9px] font-bold tracking-widest">Stripe Payment Intent</span>
                        <p className="font-bold text-foreground select-all break-all leading-relaxed bg-background/50 p-2 rounded-lg border border-border/20">
                          {selectedPayment.stripe_payment_intent_id}
                        </p>
                      </div>
                    )}
                    <div className="flex justify-between items-center pt-1">
                      <span className="text-muted-foreground uppercase text-[9px] font-bold tracking-widest">Logged At</span>
                      <span className="text-foreground font-bold">{new Date(selectedPayment.created_at).toLocaleString()}</span>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex flex-col sm:flex-row gap-3 pt-2">
                  {(selectedPayment.status === 'completed' || selectedPayment.status === 'success') && (
                    <Button
                      className="flex-1 h-11 text-xs font-semibold uppercase tracking-widest shadow-lg shadow-primary/20 rounded-xl"
                      onClick={() => downloadReceipt(selectedPayment.id)}
                    >
                      <Download className="h-3.5 w-3.5 mr-2" /> Download Receipt
                    </Button>
                  )}
                  {selectedPayment.status === 'completed' && selectedPayment.payment_method === 'stripe' && (
                    <Button
                      variant="destructive"
                      className="flex-1 h-11 text-xs font-semibold uppercase tracking-widest rounded-xl"
                      onClick={() => processRefund(selectedPayment.id)}
                    >
                      Process Refund
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    className="h-11 px-8 text-xs font-semibold uppercase tracking-widest rounded-xl border-border/50"
                    onClick={() => setIsDetailsDialogOpen(false)}
                  >
                    Close Window
                  </Button>
                </div>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PaymentMonitoring;