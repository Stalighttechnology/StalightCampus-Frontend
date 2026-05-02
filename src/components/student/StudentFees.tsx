import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from '@/components/ui/badge';
import { Button } from "@/components/ui/button";
import { Loader2, CreditCard, Receipt, AlertCircle, CheckCircle, Calendar, IndianRupee, Download, TrendingUp, TrendingDown } from 'lucide-react';
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { loadStripe } from '@stripe/stripe-js';
import { useTheme } from "@/context/ThemeContext";
import { motion, AnimatePresence } from "framer-motion";
import { fetchWithTokenRefresh } from '@/utils/authService';
import { API_ENDPOINT } from '@/utils/config';
import { SkeletonPageHeader, SkeletonStatsGrid, SkeletonTable } from "@/components/ui/skeleton";

interface InvoiceComponent {
  id: number;
  component_name: string;
  component_amount: number;
  paid_amount: number;
  balance_amount: number;
}

interface InvoiceData {
  id: number;
  invoice_number: string;
  semester: number;
  academic_year: string;
  total_amount: number;
  paid_amount: number;
  balance_amount: number;
  status: string;
  due_date: string | null;
  created_at: string | null;
  invoice_type: string;
  components?: InvoiceComponent[];
}

interface PaymentData {
  id: number;
  invoice_id: number;
  amount: number;
  mode: string;
  status: string;
  timestamp: string;
  transaction_id: string;
  payment_reference: string;
}

interface ReceiptData {
  id: number;
  receipt_number: string;
  amount: number;
  payment_id: number;
  payment_date: string;
  payment_mode: string;
  transaction_id: string;
  invoice_id: number;
  semester: number;
  generated_at: string;
}

interface StudentInfo {
  id: number;
  name: string;
  usn: string;
  dept: string;
  semester: number;
  admission_mode: string;
  status: boolean;
  email: string;
}

interface FeeSummary {
  total_fees: number;
  amount_paid: number;
  remaining_fees: number;
  due_date: string | null;
  payment_status: string;
}

interface FeeDataResponse {
  student: StudentInfo;
  fee_summary: FeeSummary;
  fee_breakdown: Record<string, number>;
  invoices: InvoiceData[];
  payments: PaymentData[];
  receipts: ReceiptData[];
  statistics: {
    total_invoices: number;
    total_payments: number;
    total_receipts: number;
    successful_payments: number;
    pending_payments: number;
    failed_payments: number;
  };
}

interface StudentFeesProps {
  user: any;
}

const StudentFees: React.FC<StudentFeesProps> = ({ user }) => {
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [paymentType, setPaymentType] = useState<'full' | 'component'>('full');
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<number | null>(null);
  const [selectedComponents, setSelectedComponents] = useState<Set<number>>(new Set());
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [invoicePage, setInvoicePage] = useState(1);
  const [paymentPage, setPaymentPage] = useState(1);
  const { theme } = useTheme();

  console.log('StudentFees user object:', user);
  console.log('StudentFees user.usn:', user?.usn);
  console.log('StudentFees user.username:', user?.username);

  // Fetch complete fee data from Django backend
  const { data: feeData, isLoading, error } = useQuery<FeeDataResponse>({
    queryKey: ['studentCompleteFeeData', user?.usn || user?.username, invoicePage, paymentPage],
    queryFn: async (): Promise<FeeDataResponse> => {
      const response = await fetchWithTokenRefresh(`${API_ENDPOINT}/student/fee-data/?invoice_page=${invoicePage}&payment_page=${paymentPage}`, {
        headers: {
          'Content-Type': 'application/json',
        },
      });
      if (!response.ok) {
        throw new Error('Failed to fetch fee data');
      }
      const raw = await response.json();

      const toRupees = (centsOrAmount: any) => {
        if (centsOrAmount === null || centsOrAmount === undefined) return 0;
        // If backend returns cents (integer), convert to rupees
        if (Number.isInteger(centsOrAmount)) return centsOrAmount / 100;
        const n = Number(centsOrAmount);
        return isNaN(n) ? 0 : n;
      };

      const transformed: FeeDataResponse = {
        student: raw.student,
        fee_summary: {
          total_fees: toRupees(raw.fee_summary?.total_fees_cents ?? raw.fee_summary?.total_fees),
          amount_paid: toRupees(raw.fee_summary?.amount_paid_cents ?? raw.fee_summary?.amount_paid),
          remaining_fees: toRupees(raw.fee_summary?.remaining_fees_cents ?? raw.fee_summary?.remaining_fees),
          due_date: raw.fee_summary?.due_date ?? null,
          payment_status: raw.fee_summary?.payment_status ?? '',
        },
        fee_breakdown: raw.fee_breakdown || {},
        invoices: (raw.invoices || []).map((inv: any) => ({
          id: inv.id,
          invoice_number: inv.invoice_number,
          semester: inv.semester,
          academic_year: inv.academic_year,
          total_amount: toRupees(inv.total_amount_cents ?? inv.total_amount),
          paid_amount: toRupees(inv.paid_amount_cents ?? inv.paid_amount),
          balance_amount: toRupees(inv.balance_amount_cents ?? inv.balance_amount),
          status: inv.status,
          due_date: inv.due_date,
          created_at: inv.created_at,
          invoice_type: inv.invoice_type,
          components: inv.components || [],
        })),
        payments: (raw.payments || []).map((p: any) => ({
          id: p.id,
          invoice_id: p.invoice_id,
          amount: toRupees(p.amount_cents ?? p.amount),
          mode: p.mode,
          status: p.status,
          timestamp: p.timestamp,
          transaction_id: p.transaction_id,
          payment_reference: p.payment_reference,
        })),
        receipts: (raw.receipts || []).map((r: any) => ({
          id: r.id,
          receipt_number: r.receipt_number,
          amount: toRupees(r.amount_cents ?? r.amount),
          payment_id: r.payment_id,
          payment_date: r.payment_date,
          payment_mode: r.payment_mode,
          transaction_id: r.transaction_id,
          invoice_id: r.invoice_id,
          semester: r.semester || 0,
          generated_at: r.generated_at,
        })),
        statistics: raw.statistics || {
          total_invoices: 0,
          total_payments: 0,
          total_receipts: 0,
          successful_payments: 0,
          pending_payments: 0,
          failed_payments: 0,
        }
      };

      return transformed;
    },
    enabled: !!user,
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <SkeletonPageHeader />
        <SkeletonStatsGrid items={3} />
        <SkeletonTable rows={4} cols={5} />
      </div>
    );
  }

  if (error) {
    return (
      <Alert className={`max-w-2xl mx-auto mt-8 ${theme === 'dark' ? 'bg-destructive/20 border border-destructive text-destructive-foreground' : 'bg-red-100 border border-red-200 text-red-800'}`}>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Unable to load fee information. Please try again later.
        </AlertDescription>
      </Alert>
    );
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
    }).format(amount);
  };

  const getStatusColor = (remaining: number) => {
    if (remaining === 0) return theme === 'dark' ? 'bg-green-900/30 text-green-400' : 'bg-green-100 text-green-800';
    if (remaining > 0) return theme === 'dark' ? 'bg-destructive/20 text-destructive-foreground' : 'bg-red-100 text-red-800';
    return theme === 'dark' ? 'bg-gray-800 text-gray-300' : 'bg-gray-100 text-gray-800';
  };

  const getStatusIcon = (remaining: number) => {
    return remaining === 0 ? <CheckCircle className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />;
  };

  const handlePaymentClick = (invoiceId: number) => {
    setSelectedInvoiceId(invoiceId);
    setPaymentType('full');
    setSelectedComponents(new Set());
    setPaymentModalOpen(true);
  };

  const handleComponentPaymentClick = (invoiceId: number) => {
    setSelectedInvoiceId(invoiceId);
    setPaymentType('component');
    setSelectedComponents(new Set());
    setPaymentModalOpen(true);
  };

  const handleComponentToggle = (componentId: number) => {
    const newSet = new Set(selectedComponents);
    if (newSet.has(componentId)) {
      newSet.delete(componentId);
    } else {
      newSet.add(componentId);
    }
    setSelectedComponents(newSet);
  };

  const initiateStripePayment = async () => {
    try {
      setIsProcessingPayment(true);
      const stripeKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY;

      if (!stripeKey) {
        alert('Payment configuration error. Please contact support.');
        return;
      }

      const stripe = await loadStripe(stripeKey);
      if (!stripe) {
        alert('Failed to initialize payment. Please try again.');
        return;
      }

      if (selectedInvoiceId === null) return;

      const response = await fetchWithTokenRefresh(`${API_ENDPOINT}/payments/create-checkout-session/${selectedInvoiceId}/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          payment_type: paymentType,
          selected_components: paymentType === 'component' && currentInvoice?.components
            ? Array.from(selectedComponents).map((idx: any) => currentInvoice.components[idx as number]?.id)
            : null,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create checkout session');
      }

      const { session_id, checkout_url } = await response.json();

      // Redirect to Stripe checkout with proper API key
      if (checkout_url) {
        // Use the checkout_url provided by backend if available
        window.location.href = checkout_url;
      } else if (session_id) {
        // Fallback: construct checkout URL with publishable key
        const checkoutUrl = `https://checkout.stripe.com/pay/${session_id}?key=${stripeKey}`;
        window.location.href = checkoutUrl;
      }
    } catch (error) {
      console.error('Payment error:', error);
      alert('Error initiating payment. Please try again.');
    } finally {
      setIsProcessingPayment(false);
    }
  };

  const handleDownloadReceipt = async (paymentId: number) => {
    try {
      const response = await fetchWithTokenRefresh(`${API_ENDPOINT}/payments/receipt/${paymentId}/`);

      if (!response.ok) throw new Error('Failed to download receipt');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `receipt_${paymentId}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading receipt:', error);
      alert('Failed to download receipt.');
    }
  };

  const currentInvoice = selectedInvoiceId === 0
    ? { id: 0, balance_amount: feeData?.fee_summary?.remaining_fees || 0, invoice_number: 'ALL' }
    : feeData?.invoices?.find(inv => inv.id === selectedInvoiceId);

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.2,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.4, ease: "easeOut" },
    },
  };

  const cardVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
    >
      <Card className={`overflow-hidden ${theme === 'dark' ? 'bg-card text-card-foreground' : 'bg-white text-gray-900'}`}>
        <CardHeader className="border-b">
          <div className="flex justify-between items-center">
            
              <CardTitle className={`text-lg sm:text-xl md:text-2xl font-semibold text-gray-900'}`}>
                Fee Information
              </CardTitle>
              <p className={`text-sm ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-600'}`}>
                View and manage your fee payments
              </p>
           
          </div>
        </CardHeader>
        <CardContent className="p-6 space-y-8">

      {/* Student Info Section */}
      <motion.div variants={cardVariants} initial="hidden" animate="visible">
        <Card className={`shadow-none border ${theme === 'dark' ? 'bg-muted/20 border-border' : 'bg-gray-50/50 border-gray-200'}`}>
          <CardHeader>
            <CardTitle className={`flex items-center gap-2 text-lg ${theme === 'dark' ? 'text-card-foreground' : 'text-gray-900'}`}>
              <CreditCard className="h-5 w-5" />
              Student Details
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              <motion.div variants={itemVariants}>
                <label className={`text-xs font-semibold uppercase tracking-wider ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}`}>
                  Name
                </label>
                <p className={`text-base font-semibold mt-1.5 ${theme === 'dark' ? 'text-card-foreground' : 'text-gray-900'}`}>
                  {feeData?.student?.name || 'N/A'}
                </p>
              </motion.div>
              <motion.div variants={itemVariants}>
                <label className={`text-xs font-semibold uppercase tracking-wider ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}`}>
                  USN
                </label>
                <p className={`text-base font-semibold mt-1.5 ${theme === 'dark' ? 'text-card-foreground' : 'text-gray-900'}`}>
                  {feeData?.student?.usn || 'N/A'}
                </p>
              </motion.div>
              <motion.div variants={itemVariants}>
                <label className={`text-xs font-semibold uppercase tracking-wider ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}`}>
                  Department
                </label>
                <p className={`text-base font-semibold mt-1.5 ${theme === 'dark' ? 'text-card-foreground' : 'text-gray-900'}`}>
                  {feeData?.student?.dept || 'N/A'}
                </p>
              </motion.div>
              <motion.div variants={itemVariants}>
                <label className={`text-xs font-semibold uppercase tracking-wider ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}`}>
                  Semester
                </label>
                <p className={`text-base font-semibold mt-1.5 ${theme === 'dark' ? 'text-card-foreground' : 'text-gray-900'}`}>
                  Semester {feeData?.student?.semester || 'N/A'}
                </p>
              </motion.div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Fee Summary Cards */}
      <motion.div
        className="grid grid-cols-1 md:grid-cols-3 gap-6"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {/* Total Fees Card */}
        <motion.div
          variants={cardVariants}
          whileHover={{ y: -4, scale: 1.02 }}
          className="h-full"
        >
          <Card className={`shadow-none border h-full ${theme === 'dark' ? 'bg-muted/20 border-border' : 'bg-gray-50/50 border-gray-200'}`}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <p className={`text-xs font-semibold uppercase tracking-wider mb-2 ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-600'}`}>
                    Total Fees
                  </p>
                  <p className={`text-3xl font-bold ${theme === 'dark' ? 'text-card-foreground' : 'text-gray-900'}`}>
                    {formatCurrency(feeData?.fee_summary?.total_fees || 0)}
                  </p>
                </div>
                <motion.div whileHover={{ rotate: 10 }} className={`p-3 rounded-lg ${theme === 'dark' ? 'bg-primary/10 text-primary' : 'bg-blue-100 text-blue-600'}`}>
                  <IndianRupee className="h-6 w-6" />
                </motion.div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Amount Paid Card */}
        <motion.div
          variants={cardVariants}
          whileHover={{ y: -4, scale: 1.02 }}
          className="h-full"
        >
          <Card className={`shadow-none border h-full ${theme === 'dark' ? 'bg-muted/20 border-border' : 'bg-gray-50/50 border-gray-200'}`}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <p className={`text-xs font-semibold uppercase tracking-wider mb-2 ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-600'}`}>
                    Amount Paid
                  </p>
                  <p className={`text-3xl font-bold ${theme === 'dark' ? 'text-green-400' : 'text-green-600'}`}>
                    {formatCurrency(feeData?.fee_summary?.amount_paid || 0)}
                  </p>
                </div>
                <motion.div whileHover={{ rotate: 10 }} className={`p-3 rounded-lg ${theme === 'dark' ? 'bg-green-500/10 text-green-400' : 'bg-green-100 text-green-600'}`}>
                  <TrendingUp className="h-6 w-6" />
                </motion.div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Remaining Fees Card */}
        <motion.div
          variants={cardVariants}
          whileHover={{ y: -4, scale: 1.02 }}
          className="h-full"
        >
          <Card className={`shadow-none border h-full ${theme === 'dark' ? 'bg-muted/20 border-border' : 'bg-gray-50/50 border-gray-200'}`}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <p className={`text-xs font-semibold uppercase tracking-wider mb-2 ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-600'}`}>
                    Remaining Fees
                  </p>
                  <p className={`text-3xl font-bold ${theme === 'dark' ? 'text-destructive' : 'text-red-600'}`}>
                    {formatCurrency(feeData?.fee_summary?.remaining_fees || 0)}
                  </p>
                </div>
                <motion.div whileHover={{ rotate: 10 }} className={`p-3 rounded-lg ${theme === 'dark' ? 'bg-destructive/10 text-destructive' : 'bg-red-100 text-red-600'}`}>
                  <TrendingDown className="h-6 w-6" />
                </motion.div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>

      {/* Status Section */}
      <motion.div variants={cardVariants} initial="hidden" animate="visible">
        <Card className={`shadow-none border ${theme === 'dark' ? 'bg-muted/20 border-border' : 'bg-gray-50/50 border-gray-200'}`}>
          <CardHeader>
            <CardTitle className={`flex items-center gap-2 text-lg ${theme === 'dark' ? 'text-card-foreground' : 'text-gray-900'}`}>
              {getStatusIcon(feeData?.fee_summary?.remaining_fees || 0)}
              Payment Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
              <motion.div variants={itemVariants}>
                <Badge className={`mb-3 ${getStatusColor(feeData?.fee_summary?.remaining_fees || 0)} px-4 py-2 text-base`}>
                  {(feeData?.fee_summary?.remaining_fees || 0) === 0 ? '✓ All Paid' : '● Pending Payment'}
                </Badge>
                {feeData?.fee_summary?.due_date && (
                  <p className={`text-sm flex items-center gap-2 mt-3 ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-600'}`}>
                    <Calendar className="h-4 w-4" />
                    Due Date: {new Date(feeData.fee_summary.due_date).toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' })}
                  </p>
                )}
              </motion.div>
              <motion.div variants={itemVariants} className="flex flex-wrap gap-3">
                {(feeData?.fee_summary?.remaining_fees || 0) > 0 && (
                  <>
                    <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                      <Button
                        className={`bg-primary hover:bg-primary/90 text-white font-semibold`}
                        onClick={() => handlePaymentClick(0)}
                      >
                        <CreditCard className="h-4 w-4 mr-2" />
                        Pay Full Amount
                      </Button>
                    </motion.div>
                    <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                      <Button
                        variant="outline"
                        className={theme === 'dark' ? 'border-border text-card-foreground hover:bg-accent' : 'border-gray-300 text-gray-700 hover:bg-gray-100 font-semibold'}
                        onClick={() => {
                          const inv = feeData?.invoices?.find(inv => inv.balance_amount > 0);
                          if (inv) handleComponentPaymentClick(inv.id);
                        }}
                      >
                        Pay by Component
                      </Button>
                    </motion.div>
                  </>
                )}
              </motion.div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Invoices Section */}
      <motion.div variants={cardVariants} initial="hidden" animate="visible">
        <Card className={`shadow-none border ${theme === 'dark' ? 'bg-muted/20 border-border' : 'bg-gray-50/50 border-gray-200'}`}>
          <CardHeader>
            <CardTitle className={`flex items-center gap-2 text-lg ${theme === 'dark' ? 'text-card-foreground' : 'text-gray-900'}`}>
              <Receipt className="h-5 w-5" />
              Fee Invoices ({feeData?.statistics?.total_invoices || 0})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {feeData?.invoices?.length ? (
              <motion.div
                className="space-y-4"
                variants={containerVariants}
                initial="hidden"
                animate="visible"
              >
                <AnimatePresence>
                  {feeData.invoices.map((invoice) => (
                    <motion.div
                      key={invoice.id}
                      variants={itemVariants}
                      layout
                      className={`border rounded-lg p-4 transition-all ${theme === 'dark' ? 'border-border hover:border-primary/50 hover:bg-card/50' : 'border-gray-200 hover:border-blue-300 hover:bg-gray-50'}`}
                      whileHover={{ x: 4 }}
                    >
                      <div className="flex justify-between items-start mb-4">
                        <motion.div variants={itemVariants}>
                          <h3 className={`font-semibold text-base ${theme === 'dark' ? 'text-card-foreground' : 'text-gray-900'}`}>
                            Semester {invoice.semester} • {invoice.academic_year}
                          </h3>
                          <p className={`text-sm ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-600'}`}>
                            Invoice #{invoice.invoice_number}
                          </p>
                        </motion.div>
                        <motion.div whileHover={{ scale: 1.1 }}>
                          <Badge
                            variant={invoice.status === 'paid' ? 'default' : 'destructive'}
                            className={`font-semibold ${invoice.status === 'paid' ? 'bg-green-600 text-white' : ''}`}
                          >
                            {invoice.status.toUpperCase()}
                          </Badge>
                        </motion.div>
                      </div>
                      <div className="grid grid-cols-3 gap-4 mb-4 p-3 rounded-lg" style={{ backgroundColor: theme === 'dark' ? 'rgba(99, 102, 241, 0.05)' : 'rgba(59, 130, 246, 0.05)' }}>
                        <motion.div variants={itemVariants}>
                          <p className={`text-xs font-semibold uppercase ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-600'}`}>
                            Total
                          </p>
                          <p className={`font-semibold text-base ${theme === 'dark' ? 'text-card-foreground' : 'text-gray-900'}`}>
                            {formatCurrency(invoice.total_amount)}
                          </p>
                        </motion.div>
                        <motion.div variants={itemVariants}>
                          <p className={`text-xs font-semibold uppercase ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-600'}`}>
                            Paid
                          </p>
                          <p className={`font-semibold text-base ${theme === 'dark' ? 'text-green-400' : 'text-green-600'}`}>
                            {formatCurrency(invoice.paid_amount)}
                          </p>
                        </motion.div>
                        <motion.div variants={itemVariants}>
                          <p className={`text-xs font-semibold uppercase ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-600'}`}>
                            Balance
                          </p>
                          <p className={`font-semibold text-base ${theme === 'dark' ? 'text-destructive' : 'text-red-600'}`}>
                            {formatCurrency(invoice.balance_amount)}
                          </p>
                        </motion.div>
                      </div>
                      {invoice.balance_amount > 0 && (
                        <motion.div
                          variants={itemVariants}
                          className="flex gap-2 flex-wrap"
                        >
                          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                            <Button
                              size="sm"
                              className={`bg-primary hover:bg-primary/90 text-white font-semibold`}
                              onClick={() => handlePaymentClick(invoice.id)}
                            >
                              <CreditCard className="h-3.5 w-3.5 mr-1" />
                              Pay Full
                            </Button>
                          </motion.div>
                          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                            <Button
                              size="sm"
                              variant="outline"
                              className={theme === 'dark' ? 'border-border text-card-foreground hover:bg-accent' : 'border-gray-300 text-gray-700 hover:bg-gray-100 font-semibold'}
                              onClick={() => handleComponentPaymentClick(invoice.id)}
                            >
                              Pay Component
                            </Button>
                          </motion.div>
                        </motion.div>
                      )}
                    </motion.div>
                  ))}
                </AnimatePresence>

                {/* Invoice Pagination */}
                {feeData && feeData.statistics.total_invoices > 10 && (
                  <div className="flex items-center justify-between mt-6 pt-4 border-t border-border">
                    <p className={`text-sm ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}`}>
                      Showing {(invoicePage - 1) * 10 + 1} to {Math.min(invoicePage * 10, feeData.statistics.total_invoices)} of {feeData.statistics.total_invoices} invoices
                    </p>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setInvoicePage(p => Math.max(1, p - 1))}
                        disabled={invoicePage === 1}
                        className={theme === 'dark' ? 'border-border' : 'border-gray-200'}
                      >
                        Previous
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setInvoicePage(p => p + 1)}
                        disabled={invoicePage * 10 >= feeData.statistics.total_invoices}
                        className={theme === 'dark' ? 'border-border' : 'border-gray-200'}
                      >
                        Next
                      </Button>
                    </div>
                  </div>
                )}
              </motion.div>
            ) : (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className={`text-center py-12 text-lg ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}`}
              >
                No invoices found
              </motion.p>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Payment History Section */}
      <motion.div variants={cardVariants} initial="hidden" animate="visible">
        <Card className={`shadow-none border ${theme === 'dark' ? 'bg-muted/20 border-border' : 'bg-gray-50/50 border-gray-200'}`}>
          <CardHeader>
            <CardTitle className={`flex items-center gap-2 text-lg ${theme === 'dark' ? 'text-card-foreground' : 'text-gray-900'}`}>
              <CreditCard className="h-5 w-5" />
              Payment History ({feeData?.statistics?.total_payments || 0})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {feeData?.payments?.length ? (
              <motion.div
                className="space-y-3"
                variants={containerVariants}
                initial="hidden"
                animate="visible"
              >
                <AnimatePresence>
                  {feeData.payments.map((payment) => (
                    <motion.div
                      key={payment.id}
                      variants={itemVariants}
                      layout
                      className={`border rounded-lg p-4 transition-all ${theme === 'dark' ? 'border-border hover:border-primary/50 hover:bg-card/50' : 'border-gray-200 hover:border-blue-300 hover:bg-gray-50'}`}
                      whileHover={{ x: 4 }}
                    >
                      <div className="flex justify-between items-start gap-4">
                        <motion.div variants={itemVariants} className="flex-1">
                          <h3 className={`font-semibold text-base ${theme === 'dark' ? 'text-card-foreground' : 'text-gray-900'}`}>
                            {formatCurrency(payment.amount)}
                          </h3>
                          <p className={`text-sm mt-1 ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-600'}`}>
                            {new Date(payment.timestamp).toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' })} • {payment.mode}
                          </p>
                        </motion.div>
                        <motion.div variants={itemVariants} className="flex gap-2 flex-shrink-0">
                          <Badge
                            variant={payment.status === 'success' ? 'default' : (payment.status === 'failed' ? 'destructive' : 'secondary')}
                            className={
                              payment.status === 'success' ? 'bg-green-600 text-white' :
                                (payment.status === 'failed' ? '' : 'bg-yellow-100 text-yellow-800 border-yellow-300')
                            }
                          >
                            {payment.status === 'success' ? '✓ Success' : (payment.status === 'failed' ? 'Failed' : 'Pending')}
                          </Badge>
                          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                            <Button
                              variant="ghost"
                              size="sm"
                              className={theme === 'dark' ? 'text-primary hover:bg-primary/10' : 'text-blue-600 hover:bg-blue-50'}
                              onClick={() => handleDownloadReceipt(payment.id)}
                              title="Download Receipt"
                            >
                              <Download className="h-4 w-4" />
                            </Button>
                          </motion.div>
                        </motion.div>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>

                {/* Payment Pagination */}
                {feeData && feeData.statistics.total_payments > 10 && (
                  <div className="flex items-center justify-between mt-6 pt-4 border-t border-border">
                    <p className={`text-sm ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}`}>
                      Showing {(paymentPage - 1) * 10 + 1} to {Math.min(paymentPage * 10, feeData.statistics.total_payments)} of {feeData.statistics.total_payments} payments
                    </p>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPaymentPage(p => Math.max(1, p - 1))}
                        disabled={paymentPage === 1}
                        className={theme === 'dark' ? 'border-border' : 'border-gray-200'}
                      >
                        Previous
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPaymentPage(p => p + 1)}
                        disabled={paymentPage * 10 >= feeData.statistics.total_payments}
                        className={theme === 'dark' ? 'border-border' : 'border-gray-200'}
                      >
                        Next
                      </Button>
                    </div>
                  </div>
                )}
              </motion.div>
            ) : (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className={`text-center py-12 text-lg ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}`}
              >
                No payment history
              </motion.p>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </CardContent>
  </Card>

  {/* Payment Modal and other overlays */}
  <AnimatePresence>
        {paymentModalOpen && (
          <Dialog open={paymentModalOpen} onOpenChange={setPaymentModalOpen}>
            {/* ... Modal content remains same ... */}
            <DialogContent className={`max-w-md ${theme === 'dark' ? 'bg-background text-foreground border-border' : 'bg-white text-gray-900 border-gray-200'}`}>
              <DialogHeader>
                <DialogTitle className={theme === 'dark' ? 'text-foreground' : 'text-gray-900'}>
                  {selectedInvoiceId === 0
                    ? '💳 Pay Total Remaining Balance'
                    : (paymentType === 'full' ? '💳 Pay Full Amount' : '🧩 Pay by Component')
                  }
                </DialogTitle>
              </DialogHeader>

              {paymentType === 'full' ? (
                <motion.div
                  className="space-y-4"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <div className={`p-4 rounded-lg border-2 ${theme === 'dark' ? 'bg-purple-500/10 border-purple-500/30' : 'bg-purple-50 border-purple-300'}`}>
                    <p className={`text-sm font-medium mb-2 ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-600'}`}>
                      Total Amount to Pay
                    </p>
                    <p className={`text-3xl font-bold ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>
                      {formatCurrency(currentInvoice?.balance_amount || 0)}
                    </p>
                  </div>
                  <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                    <Button
                      onClick={initiateStripePayment}
                      disabled={isProcessingPayment}
                      className={`bg-primary hover:bg-primary/90 text-white w-full font-semibold py-6 text-base disabled:opacity-50`}
                    >
                      {isProcessingPayment ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Processing...
                        </>
                      ) : (
                        <>
                          <CreditCard className="h-4 w-4 mr-2" />
                          Proceed to Stripe Payment
                        </>
                      )}
                    </Button>
                  </motion.div>
                </motion.div>
              ) : (
                <motion.div
                  className="space-y-4"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <p className={`text-sm font-medium ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-600'}`}>
                    Select components to pay:
                  </p>
                  <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
                    {currentInvoice?.components?.map((component, idx) => (
                      <motion.div
                        key={idx}
                        variants={itemVariants}
                        className={`flex items-center space-x-3 p-3 border rounded-lg ${theme === 'dark' ? 'border-border hover:bg-accent/50' : 'border-gray-200 hover:bg-gray-50'}`}
                      >
                        <Checkbox
                          checked={selectedComponents.has(idx)}
                          onCheckedChange={() => handleComponentToggle(idx)}
                          className={`w-5 h-5 ${theme === 'dark' ? 'border-border' : 'border-gray-300'}`}
                        />
                        <Label className={`flex-1 cursor-pointer ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>
                          <div>
                            <p className="font-medium text-sm">{component.component_name}</p>
                            <p className={`text-xs mt-1 ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-600'}`}>
                              Balance: {formatCurrency(component.balance_amount)}
                            </p>
                          </div>
                        </Label>
                      </motion.div>
                    ))}
                  </div>

                  {selectedComponents.size > 0 && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`p-4 rounded-lg border-2 ${theme === 'dark' ? 'bg-purple-500/10 border-purple-500/30' : 'bg-purple-50 border-purple-300'}`}
                    >
                      <p className={`text-sm font-medium mb-2 ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-600'}`}>
                        Total Selected
                      </p>
                      <p className={`text-2xl font-bold ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>
                        {formatCurrency(
                          (currentInvoice?.components || [])
                            .filter((_, idx) => selectedComponents.has(idx))
                            .reduce((sum, comp) => sum + comp.balance_amount, 0)
                        )}
                      </p>
                    </motion.div>
                  )}

                  <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                    <Button
                      onClick={initiateStripePayment}
                      disabled={isProcessingPayment || selectedComponents.size === 0}
                      className={`bg-primary hover:bg-primary/90 text-white w-full font-semibold py-6 text-base disabled:opacity-50`}
                    >
                      {isProcessingPayment ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Processing...
                        </>
                      ) : (
                        <>
                          <CreditCard className="h-4 w-4 mr-2" />
                          Proceed to Payment
                        </>
                      )}
                    </Button>
                  </motion.div>
                </motion.div>
              )}
            </DialogContent>
          </Dialog>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default StudentFees;