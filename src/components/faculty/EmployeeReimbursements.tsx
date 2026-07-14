import React, { useState, useEffect, useCallback } from 'react';
import { useTheme } from '@/context/ThemeContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  ReceiptText,
  PlusCircle,
  Clock,
  CheckCircle2,
  XCircle,
  ChevronLeft,
  ChevronRight,
  IndianRupee,
  FileText,
  Loader2,
  Eye,
} from 'lucide-react';
import { getMyReimbursements, submitReimbursementClaim } from '@/utils/faculty_api';
import { showConfirmAlert, showSweetAlert } from '@/utils/sweetalert';

const CLAIM_TYPES = [
  { value: 'travel', label: 'Travel Expenses' },
  { value: 'medical', label: 'Medical Reimbursement' },
  { value: 'food', label: 'Food & Entertainment' },
  { value: 'office_supplies', label: 'Office Supplies' },
  { value: 'internet', label: 'Internet / Phone' },
  { value: 'training', label: 'Training & Education' },
  { value: 'other', label: 'Other' },
];

const STATUS_META: Record<string, { label: string; color: string; icon: React.ComponentType<{ size?: number; className?: string }> }> = {
  pending:  { label: 'Pending',  color: 'bg-amber-500/10 text-amber-500 border-amber-500/20',  icon: Clock },
  approved: { label: 'Approved', color: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20', icon: CheckCircle2 },
  rejected: { label: 'Rejected', color: 'bg-red-500/10 text-red-500 border-red-500/20', icon: XCircle },
  processed:{ label: 'Processed',color: 'bg-blue-500/10 text-blue-500 border-blue-500/20',  icon: CheckCircle2 },
};

interface Claim {
  id: number;
  type: string;
  amount: string | number;
  description: string;
  status: string;
  created_at: string;
}

const formatDate = (dateString: string) => {
  if (!dateString) return "";
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString;
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}-${month}-${year}`;
  } catch (e) {
    return dateString;
  }
};

const EmployeeReimbursements: React.FC = () => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  // List state
  const [claims, setClaims] = useState<Claim[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [fetchLoading, setFetchLoading] = useState(false);

  // Form state
  const [showForm, setShowForm] = useState(false);
  const [claimType, setClaimType] = useState('');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Notification
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Description modal
  const [descModal, setDescModal] = useState<{ text: string; type: string } | null>(null);

  const fetchClaims = useCallback(async (p: number) => {
    setFetchLoading(true);
    const res = await getMyReimbursements(p);
    if (res.success) {
      setClaims(res.results ?? res.data ?? []);
      const count = res.count ?? 0;
      setTotalPages(Math.max(1, Math.ceil(count / 10)));
      setTotalCount(count);
    }
    setFetchLoading(false);
  }, []);

  useEffect(() => {
    fetchClaims(page);
  }, [page, fetchClaims]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!claimType || !amount || Number(amount) <= 0) {
      showSweetAlert('Validation Error', 'Please select an expense type and enter a valid amount.', 'error');
      return;
    }

    const confirm = await showConfirmAlert(
      'Submit this claim?',
      'Your reimbursement claim will be sent to the payroll manager for review.',
      'Yes, Submit',
      'question'
    );
    if (!confirm.isConfirmed) return;

    setSubmitting(true);
    const res = await submitReimbursementClaim({
      type: claimType,
      amount: Number(amount),
      description,
    });
    setSubmitting(false);
    if (res.success) {
      setShowForm(false);
      setClaimType('');
      setAmount('');
      setDescription('');
      setPage(1);
      fetchClaims(1);
      showSweetAlert('Submitted!', 'Your reimbursement claim has been submitted successfully.', 'success');
    } else {
      showSweetAlert('Failed', res.message || 'Failed to submit claim. Please try again.', 'error');
    }
  };

  const cardBase = isDark
    ? 'bg-slate-900 border-slate-800 text-white'
    : 'bg-white border-slate-200 text-slate-900';
  const inputClass = `w-full ${isDark ? 'bg-slate-800 border-slate-700 text-white placeholder:text-slate-500' : 'bg-white border-slate-200 text-slate-900 placeholder:text-slate-400'}`;

  return (
    <div className={`w-full min-h-full ${isDark ? 'bg-background text-foreground' : 'bg-gray-50 text-gray-900'} pb-10`}>
      <Card className={isDark ? 'bg-card border border-border flex flex-col w-full shadow-sm' : 'bg-white border border-gray-200 flex flex-col w-full shadow-sm'}>
        <CardHeader className="p-4 sm:p-6 pb-4 border-b border-border flex flex-col md:flex-row justify-between items-start md:items-center gap-4 space-y-0">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <CardTitle className={`text-2xl font-semibold flex items-center gap-2 ${isDark ? 'text-foreground' : 'text-gray-900'}`}>
                Reimbursements &amp; Claims
              </CardTitle>
            </div>
            <p className={`text-sm ${isDark ? 'text-muted-foreground' : 'text-gray-500'}`}>
              Submit and track your expense reimbursement requests.
            </p>
          </div>
          <Button className="gap-2 bg-primary hover:bg-primary/90 text-white w-full md:w-auto" onClick={() => setShowForm(true)}>
            <PlusCircle size={16} /> New Claim
          </Button>
        </CardHeader>
        
        <CardContent className="p-3 sm:p-6 space-y-4 sm:space-y-6">
          {/* Summary cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
            {(['pending', 'approved', 'rejected', 'processed'] as const).map((s) => {
              const count = claims.filter((c) => c.status === s).length;
              const meta = STATUS_META[s];
              return (
                <Card key={s} className={`${isDark ? 'bg-slate-900/50 border-slate-800' : 'bg-slate-50 border-slate-200'} border`}>
                  <CardContent className="p-3 sm:p-4 flex items-center gap-2 sm:gap-3">
                    <div className={`h-8 w-8 sm:h-10 sm:w-10 rounded-full flex items-center justify-center text-sm ${meta.color} border shrink-0`}>
                      <meta.icon className="h-4 w-4 sm:h-5 sm:w-5" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xl sm:text-lg font-semibold sm:font-semibold truncate">{count}</p>
                      <p className="text-[14px] sm:text-xs text-muted-foreground truncate">{meta.label}</p>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Claims table (Visible only on desktop) */}
          <div className="border border-border rounded-lg overflow-hidden bg-background hidden md:block">
            <div className="px-4 py-3 border-b border-border flex items-center justify-between text-sm text-gray-500 dark:text-gray-400">
              <span className="font-semibold text-slate-950 dark:text-white flex items-center gap-2">
                My Claims History
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className={`${isDark ? 'bg-slate-800/50 text-slate-300' : 'bg-slate-100 text-slate-600'} text-xs sm:text-sm`}>
                  <tr>
                    <th className="px-3 py-3 sm:px-5 sm:py-3 font-semibold">Type</th>
                    <th className="px-3 py-3 sm:px-5 sm:py-3 font-semibold">Description</th>
                    <th className="px-3 py-3 sm:px-5 sm:py-3 font-semibold text-right">Amount</th>
                    <th className="px-3 py-3 sm:px-5 sm:py-3 font-semibold">Status</th>
                    <th className="px-3 py-3 sm:px-5 sm:py-3 font-semibold">Submitted On</th>
                  </tr>
                </thead>
                <tbody className={`divide-y ${isDark ? 'divide-slate-800' : 'divide-slate-100'} text-xs sm:text-sm`}>
                  {fetchLoading ? (
                    <tr>
                      <td colSpan={5} className="py-12 text-center">
                        <Loader2 size={24} className="animate-spin mx-auto text-blue-500" />
                      </td>
                    </tr>
                  ) : claims.length === 0 ? (
                    <tr>
                      <td colSpan={5} className={`py-12 text-center ${isDark ? 'text-slate-500' : 'text-slate-400'} italic`}>
                        No reimbursement claims submitted yet.
                      </td>
                    </tr>
                  ) : (
                    claims.map((claim) => {
                      const meta = STATUS_META[claim.status] ?? STATUS_META['pending'];
                      const typeLabel = CLAIM_TYPES.find((t) => t.value === claim.type)?.label ?? claim.type;
                      return (
                        <tr key={claim.id} className={`${isDark ? 'hover:bg-slate-800/40' : 'hover:bg-slate-50'} transition-colors`}>
                          <td className="px-3 py-3 sm:px-5 sm:py-4 font-medium">
                            <div className="flex items-center gap-1.5 min-w-max">
                              <FileText size={14} className="text-blue-400 shrink-0" />
                              {typeLabel}
                            </div>
                          </td>
                          <td className="px-3 py-3 sm:px-5 sm:py-4">
                            {claim.description ? (
                              <button
                                onClick={() => setDescModal({ text: claim.description, type: typeLabel })}
                                className={`text-[10px] sm:text-xs font-medium px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-md transition border ${
                                  isDark
                                    ? 'border-purple-500/20 text-purple-400 bg-purple-950/20 hover:bg-purple-950/40'
                                    : 'border-purple-100 text-purple-600 bg-purple-50 hover:bg-purple-100/80'
                                }`}
                              >
                                View
                              </button>
                            ) : (
                              <span className={`text-xs italic ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>—</span>
                            )}
                          </td>
                          <td className="px-3 py-3 sm:px-5 sm:py-4 text-right font-semibold text-blue-500">
                            <span className="flex items-center justify-end gap-0.5 min-w-max">
                              <IndianRupee size={13} />{Number(claim.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                            </span>
                          </td>
                          <td className="px-3 py-3 sm:px-5 sm:py-4">
                            <Badge variant="outline" className={`capitalize text-[10px] sm:text-xs gap-1 border px-2 py-0.5 ${meta.color} min-w-max`}>
                              <meta.icon size={11} className="shrink-0" /> {meta.label}
                            </Badge>
                          </td>
                          <td className={`px-3 py-3 sm:px-5 sm:py-4 ${isDark ? 'text-slate-400' : 'text-slate-505'} min-w-max`}>
                            {formatDate(claim.created_at)}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Claims Mobile List (Visible only on mobile) */}
          <div className="space-y-3 md:hidden">
            <div className="px-1 pb-1 flex items-center justify-between text-sm text-gray-500 dark:text-gray-400">
              <span className="font-semibold text-slate-950 dark:text-white">
                My Claims History
              </span>
            </div>
            {fetchLoading ? (
              <div className="py-10 text-center">
                <Loader2 size={24} className="animate-spin mx-auto text-blue-500" />
              </div>
            ) : claims.length === 0 ? (
              <div className={`p-8 text-center border border-dashed rounded-xl ${isDark ? 'text-slate-500 border-slate-800' : 'text-slate-400 border-slate-200'} italic`}>
                No reimbursement claims submitted yet.
              </div>
            ) : (
              claims.map((claim) => {
                const meta = STATUS_META[claim.status] ?? STATUS_META['pending'];
                const typeLabel = CLAIM_TYPES.find((t) => t.value === claim.type)?.label ?? claim.type;
                return (
                  <div key={claim.id} className={`p-4 rounded-xl border flex flex-col gap-3 ${isDark ? 'bg-slate-900/50 border-slate-800' : 'bg-white border-slate-200'}`}>
                    <div className="flex justify-between items-center gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <FileText size={15} className="text-blue-400 shrink-0" />
                        <span className="font-semibold text-sm truncate">{typeLabel}</span>
                      </div>
                      <Badge variant="outline" className={`capitalize text-[10px] gap-1 border px-2 py-0.5 ${meta.color} shrink-0`}>
                        <meta.icon size={11} className="shrink-0" /> {meta.label}
                      </Badge>
                    </div>

                    <div className="flex justify-between items-center text-xs text-muted-foreground">
                      <span>Submitted: {formatDate(claim.created_at)}</span>
                      <span className="font-semibold text-blue-500 text-sm flex items-center gap-0.5">
                        <IndianRupee size={12} />{Number(claim.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </span>
                    </div>

                    {claim.description && (
                      <div className="pt-2 border-t border-dashed border-border flex justify-between items-center">
                        <span className="text-[11px] text-muted-foreground">Purpose provided</span>
                        <button
                          onClick={() => setDescModal({ text: claim.description, type: typeLabel })}
                          className={`text-xs font-medium px-2.5 py-1 rounded-md transition border flex items-center gap-1.5 ${
                            isDark
                              ? 'border-purple-500/20 text-purple-400 bg-purple-950/20 hover:bg-purple-950/40'
                              : 'border-purple-100 text-purple-600 bg-purple-50 hover:bg-purple-100/80'
                          }`}
                        >
                          <Eye size={12} /> View Purpose
                        </button>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </CardContent>

        {/* Pagination */}
        {totalPages > 1 && (
          <CardFooter className={`flex flex-col sm:flex-row justify-between items-center gap-4 text-sm text-muted-foreground px-6 py-4 border-t ${isDark ? 'border-slate-800' : 'border-slate-200'} mt-auto`}>
            <div>
              Showing {Math.min((page - 1) * 10 + 1, totalCount)} to {Math.min(page * 10, totalCount)} of {totalCount} claims
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(p => p - 1)}
                disabled={page === 1 || fetchLoading}
                className="bg-primary hover:bg-primary/90 text-white border-primary h-9 px-4 transition-all">
                Previous
              </Button>

              <div className="flex items-center justify-center min-w-[2rem]">
                <span className={`text-sm font-semibold ${isDark ? 'text-foreground' : 'text-gray-900'}`}>
                  {page}
                </span>
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(p => p + 1)}
                disabled={page === totalPages || fetchLoading}
                className="bg-primary hover:bg-primary/90 text-white border-primary h-9 px-4 transition-all">
                Next
              </Button>
            </div>
          </CardFooter>
        )}
      </Card>

      {/* New Claim Dialog */}
      <Dialog open={showForm} onOpenChange={(open) => { if (!open) setShowForm(false); }}>
        <DialogContent 
          onPointerDownOutside={(e) => e.preventDefault()}
          onInteractOutside={(e) => e.preventDefault()}
          className={`w-[90vw] sm:max-w-lg rounded-xl p-0 shadow-2xl border max-h-[80vh] overflow-y-auto custom-scrollbar  ${isDark ? 'bg-[#0f172a] text-slate-100 border-slate-800' : 'bg-white text-slate-900 border-slate-200'}`}>
          <DialogHeader className={`px-6 pt-6 pb-4 border-b ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>
            <DialogTitle className="flex items-center gap-2 text-lg font-semibold">
              Submit Reimbursement Claim
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="px-6 py-5 space-y-5">
            {/* Claim Type */}
            <div className="space-y-1.5">
              <Label className={`text-sm font-semibold ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                Expense Type <span className="text-red-500">*</span>
              </Label>
              <Select value={claimType} onValueChange={setClaimType}>
                <SelectTrigger className={inputClass}>
                  <SelectValue placeholder="Select expense type" />
                </SelectTrigger>
                <SelectContent>
                  {CLAIM_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Amount */}
            <div className="space-y-1.5">
              <Label className={`text-sm font-semibold ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                Amount (₹) <span className="text-red-500">*</span>
              </Label>
              <div className="relative">
                <IndianRupee size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <Input
                  type="number"
                  min="1"
                  step="0.01"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  className={`${inputClass} pl-8`}
                />
              </div>
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <Label className={`text-sm font-semibold ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                Description / Purpose
              </Label>
              <Textarea
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Brief details about the expense..."
                className={`${inputClass} resize-none custom-scrollbar`}
              />
            </div>

            <p className={`text-xs ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
              Your claim will be reviewed by the payroll manager and reflected in your next payroll run if approved.
            </p>

            <div className="flex justify-end gap-3 pt-1">
              <Button type="button" variant="outline" onClick={() => setShowForm(false)} disabled={submitting}>
                Cancel
              </Button>
              <Button type="submit" disabled={submitting} className="gap-2">
                {submitting && <Loader2 size={15} className="animate-spin" />}
                Submit Claim
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
      {/* Description Modal */}
      <Dialog open={!!descModal} onOpenChange={(open) => { if (!open) setDescModal(null); }}>
        <DialogContent className={`${isDark ? 'bg-card text-foreground border border-border' : 'bg-white text-gray-900 border border-gray-200'} max-w-[90%] sm:max-w-md mx-auto rounded-xl p-4 sm:p-6`}>
          <DialogHeader>
            <DialogTitle className={`text-lg font-semibold ${isDark ? 'text-foreground' : 'text-gray-900'}`}>
              Claim Description
            </DialogTitle>
            <DialogDescription className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              {descModal?.type} expense
            </DialogDescription>
          </DialogHeader>

          <div
            className={`p-3 text-base leading-relaxed whitespace-pre-wrap break-words 
                      max-h-64 overflow-y-auto custom-scrollbar rounded-md ${isDark ? 'text-foreground' : 'text-gray-900'}`}
          >
            {descModal?.text || <span className="italic text-slate-400">No description provided.</span>}
          </div>

          <DialogFooter>
            <Button
              className="bg-primary hover:bg-primary/90 text-white font-semibold transition-all duration-200 shadow-lg shadow-primary/20 px-6"
              onClick={() => setDescModal(null)}
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default EmployeeReimbursements;
