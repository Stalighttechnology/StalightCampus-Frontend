import { useState, useEffect, useCallback } from "react";
import { API_BASE_URL } from "@/utils/config";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../../components/ui/table";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "../../components/ui/dialog";
import { useTheme } from "../../context/ThemeContext";
import { Card, CardHeader, CardTitle, CardContent } from "../../components/ui/card";
import { fetchWithSuperadminTokenRefresh } from "../../utils/authService";
import { useToast } from "@/components/ui/use-toast";
import { DateTimePicker } from "@/components/ui/datetime-picker";
import { format } from "date-fns";
import {
  Eye,
  Loader2,
  Clock,
  Plus,
  Pencil,
  FileText,
  ExternalLink,
  Upload,
  X,
  CreditCard,
} from "lucide-react";

interface PaymentItem {
  id: number;
  transaction_id: string;
  amount: string;
  amount_raw?: number;
  plan_type: string;
  plan_raw?: string;
  billing_cycle?: string;
  billing_cycle_display?: string;
  status: string;
  date: string;
  document_url?: string | null;
}

interface BillingOrgItem {
  id: number;
  org_name: string;
  plan: string;
  amount: string;
  amount_raw: number;
  status: string;
  date: string;
}

const Billing = () => {
  const [data, setData] = useState<BillingOrgItem[]>([]);
  const [loading, setLoading] = useState(true);
  const { theme } = useTheme();
  const { toast } = useToast();

  // Payment History Dialog state
  const [selectedOrg, setSelectedOrg] = useState<BillingOrgItem | null>(null);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [historyData, setHistoryData] = useState<PaymentItem[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Add / Edit Payment Modal & Form state
  const [isAddPaymentOpen, setIsAddPaymentOpen] = useState(false);
  const [editingPayment, setEditingPayment] = useState<PaymentItem | null>(null);
  const [submittingPayment, setSubmittingPayment] = useState(false);

  // Form Fields
  const [paymentDate, setPaymentDate] = useState<Date | undefined>(new Date());
  const [formTxnId, setFormTxnId] = useState("");
  const [formAmount, setFormAmount] = useState("");
  const [formPlan, setFormPlan] = useState("advance");
  const [formBillingCycle, setFormBillingCycle] = useState("quarterly");
  const [formStatus, setFormStatus] = useState("success");
  const [formFile, setFormFile] = useState<File | null>(null);
  const [existingDocumentUrl, setExistingDocumentUrl] = useState<string | null>(null);

  // Fetch all billing organizations
  const fetchBillingData = useCallback(async () => {
    try {
      const response = await fetchWithSuperadminTokenRefresh(`${API_BASE_URL}/api/superadmin/billing/`, {
        headers: { "Authorization": `Bearer ${localStorage.getItem("superadmin_token")}` }
      });
      if (response.ok) {
        const res = await response.json();
        setData(res.billing || []);
      }
    } catch (error) {
      console.error("Failed to fetch billing data:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBillingData();
  }, [fetchBillingData]);

  // Fetch payment history for a specific organization
  const fetchHistory = useCallback(async (orgId: number) => {
    setLoadingHistory(true);
    try {
      const response = await fetchWithSuperadminTokenRefresh(`${API_BASE_URL}/api/superadmin/billing/${orgId}/payments/`, {
        headers: { "Authorization": `Bearer ${localStorage.getItem("superadmin_token")}` }
      });
      if (response.ok) {
        const res = await response.json();
        setHistoryData(res.payments || []);
      }
    } catch (error) {
      console.error("Failed to load payment history:", error);
    } finally {
      setLoadingHistory(false);
    }
  }, []);

  const handleViewHistory = (org: BillingOrgItem) => {
    setSelectedOrg(org);
    setIsHistoryOpen(true);
    fetchHistory(org.id);
  };

  // Open "Add Payment Record" modal with default values
  const handleOpenAddPayment = () => {
    setEditingPayment(null);
    setPaymentDate(new Date());
    setFormTxnId("");
    setFormAmount("");
    setFormPlan(selectedOrg?.plan?.toLowerCase() || "advance");
    setFormBillingCycle("quarterly");
    setFormStatus("success");
    setFormFile(null);
    setExistingDocumentUrl(null);
    setIsAddPaymentOpen(true);
  };

  // Open "Edit Payment Record" modal populated with existing record
  const handleOpenEditPayment = (payment: PaymentItem) => {
    setEditingPayment(payment);

    let parsedDate: Date | undefined;
    if (payment.date) {
      const d = new Date(payment.date.replace(" ", "T"));
      parsedDate = isNaN(d.getTime()) ? new Date() : d;
    } else {
      parsedDate = new Date();
    }
    setPaymentDate(parsedDate);

    setFormTxnId(payment.transaction_id || "");
    const cleanAmt = payment.amount_raw !== undefined
      ? String(payment.amount_raw)
      : payment.amount.replace(/[^0-9.]/g, "");
    setFormAmount(cleanAmt);

    setFormPlan(payment.plan_raw?.toLowerCase() || payment.plan_type?.toLowerCase() || "advance");
    setFormBillingCycle(payment.billing_cycle || "quarterly");
    setFormStatus(payment.status === "Paid" ? "success" : (payment.status || "success"));
    setFormFile(null);
    setExistingDocumentUrl(payment.document_url || null);
    setIsAddPaymentOpen(true);
  };

  // Submit payment record (create or update)
  const handleAddPaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrg) return;

    if (!paymentDate) {
      toast({
        title: "Date Required",
        description: "Please select a payment date.",
        variant: "destructive",
      });
      return;
    }

    if (!formAmount || isNaN(Number(formAmount)) || Number(formAmount) < 0) {
      toast({
        title: "Invalid Amount",
        description: "Please enter a valid payment amount (₹).",
        variant: "destructive",
      });
      return;
    }

    if (!formTxnId.trim()) {
      toast({
        title: "Transaction ID Required",
        description: "Please provide a transaction or reference ID.",
        variant: "destructive",
      });
      return;
    }

    setSubmittingPayment(true);

    try {
      const formData = new FormData();
      formData.append("amount", formAmount.trim());
      formData.append("transaction_id", formTxnId.trim());
      formData.append("date", format(paymentDate, "yyyy-MM-dd HH:mm:ss"));
      formData.append("plan_type", formPlan);
      formData.append("billing_cycle", formBillingCycle);
      formData.append("status", formStatus);
      if (formFile) {
        formData.append("document", formFile);
      }

      const url = editingPayment
        ? `${API_BASE_URL}/api/superadmin/billing/${selectedOrg.id}/payments/${editingPayment.id}/`
        : `${API_BASE_URL}/api/superadmin/billing/${selectedOrg.id}/payments/`;

      const response = await fetchWithSuperadminTokenRefresh(url, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${localStorage.getItem("superadmin_token")}`,
        },
        body: formData,
      });

      const resData = await response.json();

      if (response.ok) {
        toast({
          title: editingPayment ? "Payment Updated" : "Payment Recorded",
          description: editingPayment
            ? `Payment of ₹${Number(formAmount).toLocaleString()} updated successfully.`
            : `Payment of ₹${Number(formAmount).toLocaleString()} recorded successfully.`,
        });

        setIsAddPaymentOpen(false);

        // Refresh both history table and main billing organizations table
        await fetchHistory(selectedOrg.id);
        await fetchBillingData();
      } else {
        toast({
          title: editingPayment ? "Failed to Update Payment" : "Failed to Add Payment",
          description: resData.error || "An error occurred while saving the payment record.",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Network error while saving payment record.",
        variant: "destructive",
      });
    } finally {
      setSubmittingPayment(false);
    }
  };

  const isDark = theme === "dark";

  return (
    <div className="space-y-6">
      <Card className={`shadow-sm backdrop-blur-sm transition-all duration-300 border ${isDark ? 'bg-card/40 border-border text-foreground' : 'bg-white border-gray-100 text-gray-900'}`}>
        <CardHeader>
          <CardTitle className={`text-2xl font-semibold leading-none tracking-tight mb-2 ${isDark ? 'text-foreground' : 'text-gray-900'}`}>
            Billing & Payments
          </CardTitle>
          <p className={`text-sm ${isDark ? 'text-muted-foreground' : 'text-gray-500'}`}>
            Track organization payments, revenue, and subscription transactions.
          </p>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border overflow-hidden">
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow>
                  <TableHead>Organization</TableHead>
                  <TableHead>Current Plan</TableHead>
                  <TableHead>Total Paid</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date Added</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center">Loading billing data...</TableCell>
                  </TableRow>
                ) : data.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                      No organizations found.
                    </TableCell>
                  </TableRow>
                ) : (
                  data.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">{item.org_name}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="capitalize">
                          {item.plan}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-semibold text-primary">{item.amount}</TableCell>
                      <TableCell>
                        <Badge
                          variant={item.status === 'Paid' ? 'default' : 'secondary'}
                          className={item.status === 'Paid' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300' : ''}
                        >
                          {item.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{item.date}</TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleViewHistory(item)}
                          className="text-primary hover:text-primary hover:bg-primary/10 font-medium"
                        >
                          <Eye className="h-4 w-4 mr-1.5" /> View History
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Payment History Dialog */}
      <Dialog open={isHistoryOpen} onOpenChange={setIsHistoryOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col p-6 border-border bg-background">
          <DialogHeader className="flex-shrink-0 flex flex-row items-start justify-between pb-4 border-b border-border gap-4">
            <div>
              <DialogTitle className="flex items-center gap-2 text-xl font-bold">
                <Clock className="h-5 w-5 text-primary" />
                Payment History - {selectedOrg?.org_name}
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground pt-1">
                Complete record of all transactions, upgrades, and buffer packs.
              </DialogDescription>
            </div>

            <Button
              size="sm"
              onClick={handleOpenAddPayment}
              className="gap-1.5 shrink-0 text-xs shadow-sm"
            >
              <Plus className="h-4 w-4" /> Add Payment Record
            </Button>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto mt-4 pr-1">
            {loadingHistory ? (
              <div className="flex justify-center items-center h-48">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : historyData.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground border border-border rounded-lg bg-muted/20">
                <CreditCard className="h-8 w-8 mx-auto mb-2 text-muted-foreground/60" />
                <p className="font-medium text-sm text-foreground">No payment history found for this organization.</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Click the <strong>Add Payment Record</strong> button above to record a transaction.
                </p>
              </div>
            ) : (
              <div className="border border-border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader className="bg-muted/50">
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Billing Cycle</TableHead>
                      <TableHead>Plan / Item</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Transaction ID</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-center">Receipt / Document</TableHead>
                      <TableHead className="text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {historyData.map((tx: any) => {
                      const fullDocUrl = tx.document_url
                        ? (tx.document_url.startsWith("http") ? tx.document_url : `${API_BASE_URL}${tx.document_url}`)
                        : null;

                      return (
                        <TableRow key={tx.id} className="text-xs">
                          <TableCell className="whitespace-nowrap font-mono">{tx.date}</TableCell>
                          <TableCell>
                            <Badge
                              variant="outline"
                              className={
                                tx.billing_cycle === 'quarterly'
                                  ? "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/50 dark:text-blue-400 capitalize"
                                  : tx.billing_cycle === 'monthly'
                                  ? "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/50 dark:text-purple-400 capitalize"
                                  : tx.billing_cycle === 'yearly'
                                  ? "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/50 dark:text-amber-400 capitalize"
                                  : "bg-muted text-muted-foreground capitalize"
                              }
                            >
                              {tx.billing_cycle_display || tx.billing_cycle || "One-Time"}
                            </Badge>
                          </TableCell>
                          <TableCell className="font-medium">{tx.plan_type}</TableCell>
                          <TableCell className="text-primary font-bold text-sm">
                            {tx.amount}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground font-mono">
                            {tx.transaction_id || "N/A"}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant="outline"
                              className={
                                tx.status === "success" || tx.status === "Paid"
                                  ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-400"
                                  : "bg-muted text-muted-foreground"
                              }
                            >
                              {tx.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center">
                            {fullDocUrl ? (
                              <a
                                href={fullDocUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium border border-border bg-muted/40 hover:bg-muted text-foreground transition-colors"
                              >
                                <FileText className="h-3.5 w-3.5 text-primary" />
                                <span>View Receipt</span>
                                <ExternalLink className="h-3 w-3 text-muted-foreground" />
                              </a>
                            ) : (
                              <span className="text-muted-foreground text-xs">—</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right whitespace-nowrap">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => handleOpenEditPayment(tx)}
                              className="h-7 px-2.5 text-xs gap-1 border-border hover:bg-muted"
                            >
                              <Pencil className="h-3 w-3 text-muted-foreground" />
                              <span>Edit</span>
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Add / Edit Payment Record Form Modal - Pure shadcn Theme */}
      <Dialog open={isAddPaymentOpen} onOpenChange={setIsAddPaymentOpen}>
        <DialogContent className="sm:max-w-[480px] border-border bg-background">
          <form onSubmit={handleAddPaymentSubmit}>
            <DialogHeader className="pb-4 border-b border-border">
              <div className="flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-primary" />
                <DialogTitle className="text-lg font-semibold">
                  {editingPayment ? "Update Payment Record" : "Add Payment Record"}
                </DialogTitle>
              </div>
              <DialogDescription className="text-xs text-muted-foreground pt-0.5">
                {editingPayment
                  ? `Update payment details for ${selectedOrg?.org_name}.`
                  : `Record payment for ${selectedOrg?.org_name}. Multiple payments (monthly, quarterly, yearly) can be added.`}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              {/* Payment Date & Time - shadcn DateTimePicker */}
              <div className="space-y-2">
                <Label className="text-xs font-medium">
                  Payment Date & Time *
                </Label>
                <DateTimePicker
                  value={paymentDate}
                  onChange={(d) => setPaymentDate(d)}
                  className="h-9 text-xs font-normal"
                />
              </div>

              {/* Transaction ID */}
              <div className="space-y-2">
                <Label htmlFor="pay-txn" className="text-xs font-medium">
                  Transaction / Reference ID *
                </Label>
                <Input
                  id="pay-txn"
                  type="text"
                  placeholder="e.g. UPI-123456789 or BANK_REF_..."
                  value={formTxnId}
                  onChange={(e) => setFormTxnId(e.target.value)}
                  required
                  className="h-9 text-xs font-mono"
                />
              </div>

              {/* Amount & Billing Cycle Grid */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="pay-amt" className="text-xs font-medium">
                    Amount (₹) *
                  </Label>
                  <Input
                    id="pay-amt"
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    value={formAmount}
                    onChange={(e) => setFormAmount(e.target.value)}
                    required
                    className="h-9 text-xs font-semibold"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-medium">
                    Billing Cycle / Period *
                  </Label>
                  <Select value={formBillingCycle} onValueChange={setFormBillingCycle}>
                    <SelectTrigger className="h-9 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="quarterly">Quarterly</SelectItem>
                      <SelectItem value="monthly">Monthly</SelectItem>
                      <SelectItem value="yearly">Yearly</SelectItem>
                      <SelectItem value="one_time">One-time / Base</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Plan Type & Status Grid */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs font-medium">
                    Plan / Item
                  </Label>
                  <Select value={formPlan} onValueChange={setFormPlan}>
                    <SelectTrigger className="h-9 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="advance">Advance</SelectItem>
                      <SelectItem value="pro">Pro</SelectItem>
                      <SelectItem value="basic">Basic</SelectItem>
                      <SelectItem value="buffer_expansion">Buffer Expansion</SelectItem>
                      <SelectItem value="custom">Custom / Offline</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-medium">
                    Payment Status
                  </Label>
                  <Select value={formStatus} onValueChange={setFormStatus}>
                    <SelectTrigger className="h-9 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="success">Success / Paid</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Document / Receipt Upload (Optional) */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-medium">
                    Document / Receipt Proof (Optional)
                  </Label>
                  <span className="text-[11px] text-muted-foreground">PDF, PNG, JPG</span>
                </div>

                {formFile ? (
                  <div className="flex items-center justify-between p-3 rounded-lg border border-border bg-muted/40">
                    <div className="flex items-center gap-2.5 truncate">
                      <FileText className="h-4 w-4 text-primary shrink-0" />
                      <span className="text-xs font-medium text-foreground truncate">{formFile.name}</span>
                      <span className="text-[11px] text-muted-foreground">
                        ({(formFile.size / 1024).toFixed(0)} KB)
                      </span>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setFormFile(null)}
                      className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ) : existingDocumentUrl ? (
                  <div className="flex items-center justify-between p-3 rounded-lg border border-border bg-muted/30">
                    <div className="flex items-center gap-2 truncate">
                      <FileText className="h-4 w-4 text-primary shrink-0" />
                      <span className="text-xs text-foreground truncate">Current receipt on file</span>
                      <a
                        href={existingDocumentUrl.startsWith("http") ? existingDocumentUrl : `${API_BASE_URL}${existingDocumentUrl}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-primary hover:underline font-medium inline-flex items-center gap-1 shrink-0 ml-1"
                      >
                        <span>View</span>
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </div>
                    <label className="cursor-pointer text-xs font-medium text-primary hover:underline shrink-0 ml-2">
                      <span>Replace</span>
                      <input
                        type="file"
                        accept=".pdf,.png,.jpg,.jpeg"
                        onChange={(e) => {
                          if (e.target.files && e.target.files[0]) {
                            setFormFile(e.target.files[0]);
                          }
                        }}
                        className="hidden"
                      />
                    </label>
                  </div>
                ) : (
                  <label className="flex flex-col items-center justify-center border-2 border-dashed border-muted-foreground/25 hover:border-primary/50 rounded-lg p-5 cursor-pointer bg-muted/10 hover:bg-muted/20 transition-all text-center group">
                    <div className="p-2 rounded-full bg-muted group-hover:bg-primary/10 transition-colors mb-2">
                      <Upload className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
                    </div>
                    <span className="text-xs font-medium text-foreground">Click to upload receipt document</span>
                    <input
                      type="file"
                      accept=".pdf,.png,.jpg,.jpeg"
                      onChange={(e) => {
                        if (e.target.files && e.target.files[0]) {
                          setFormFile(e.target.files[0]);
                        }
                      }}
                      className="hidden"
                    />
                  </label>
                )}
              </div>
            </div>

            <DialogFooter className="gap-2 sm:gap-0 pt-4 border-t border-border">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsAddPaymentOpen(false)}
                disabled={submittingPayment}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={submittingPayment}
              >
                {submittingPayment ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Plus className="mr-2 h-4 w-4" />
                    {editingPayment ? "Update Payment Record" : "Save Payment Record"}
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Billing;
