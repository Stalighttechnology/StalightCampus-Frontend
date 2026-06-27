import React, { useState, useEffect, useCallback } from 'react';
import { useTheme } from '@/context/ThemeContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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

const STATUS_META: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  pending:  { label: 'Pending',  color: 'bg-amber-500/10 text-amber-500 border-amber-500/20',  icon: <Clock size={13} /> },
  approved: { label: 'Approved', color: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20', icon: <CheckCircle2 size={13} /> },
  rejected: { label: 'Rejected', color: 'bg-red-500/10 text-red-500 border-red-500/20', icon: <XCircle size={13} /> },
  processed:{ label: 'Processed',color: 'bg-blue-500/10 text-blue-500 border-blue-500/20',  icon: <CheckCircle2 size={13} /> },
};

interface Claim {
  id: number;
  type: string;
  amount: string | number;
  description: string;
  status: string;
  created_at: string;
}

const EmployeeReimbursements: React.FC = () => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  // List state
  const [claims, setClaims] = useState<Claim[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
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
    <div className="space-y-6 pb-10">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
            Reimbursements &amp; Claims
          </h1>
          <p className={`text-sm mt-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
            Submit and track your expense reimbursement requests.
          </p>
        </div>
        <Button className="gap-2" onClick={() => setShowForm(true)}>
          <PlusCircle size={16} /> New Claim
        </Button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {(['pending', 'approved', 'rejected', 'processed'] as const).map((s) => {
          const count = claims.filter((c) => c.status === s).length;
          const meta = STATUS_META[s];
          return (
            <Card key={s} className={`${cardBase} border`}>
              <CardContent className="pt-5 pb-4 flex items-center gap-3">
                <div className={`h-10 w-10 rounded-full flex items-center justify-center text-sm ${meta.color} border`}>
                  {meta.icon}
                </div>
                <div>
                  <p className="text-xl font-bold">{count}</p>
                  <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{meta.label}</p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Claims table */}
      <Card className={`${cardBase} border`}>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <ReceiptText size={18} className="text-blue-500" /> My Claims History
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className={`${isDark ? 'bg-slate-800/50 text-slate-300' : 'bg-slate-100 text-slate-600'}`}>
                <tr>
                  <th className="px-5 py-3 font-semibold">Type</th>
                  <th className="px-5 py-3 font-semibold">Description</th>
                  <th className="px-5 py-3 font-semibold text-right">Amount</th>
                  <th className="px-5 py-3 font-semibold">Status</th>
                  <th className="px-5 py-3 font-semibold">Submitted On</th>
                </tr>
              </thead>
              <tbody className={`divide-y ${isDark ? 'divide-slate-800' : 'divide-slate-100'}`}>
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
                        <td className="px-5 py-4 font-medium">
                          <div className="flex items-center gap-2">
                            <FileText size={15} className="text-blue-400 shrink-0" />
                            {typeLabel}
                          </div>
                        </td>
                        <td className="px-5 py-4">
                          {claim.description ? (
                            <button
                              onClick={() => setDescModal({ text: claim.description, type: typeLabel })}
                              className="flex items-center gap-1.5 text-xs text-blue-500 hover:text-blue-600 hover:underline transition-colors"
                            >
                              <Eye size={13} /> View
                            </button>
                          ) : (
                            <span className={`text-xs italic ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>—</span>
                          )}
                        </td>
                        <td className="px-5 py-4 text-right font-semibold text-blue-500">
                          <span className="flex items-center justify-end gap-0.5">
                            <IndianRupee size={13} />{Number(claim.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </span>
                        </td>
                        <td className="px-5 py-4">
                          <Badge variant="outline" className={`capitalize text-xs gap-1 border ${meta.color}`}>
                            {meta.icon} {meta.label}
                          </Badge>
                        </td>
                        <td className={`px-5 py-4 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                          {claim.created_at}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className={`flex items-center justify-between px-5 py-3 border-t ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>
              <span className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                Page {page} of {totalPages}
              </span>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>
                  <ChevronLeft size={15} /> Previous
                </Button>
                <Button size="sm" variant="outline" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>
                  Next <ChevronRight size={15} />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* New Claim Dialog */}
      <Dialog open={showForm} onOpenChange={(open) => { if (!open) setShowForm(false); }}>
        <DialogContent className={`w-[90vw] sm:max-w-lg rounded-xl p-0 shadow-2xl border overflow-hidden ${isDark ? 'bg-[#0f172a] text-slate-100 border-slate-800' : 'bg-white text-slate-900 border-slate-200'}`}>
          <DialogHeader className={`px-6 pt-6 pb-4 border-b ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>
            <DialogTitle className="flex items-center gap-2 text-lg font-bold">
              <ReceiptText size={20} className="text-blue-500" /> Submit Reimbursement Claim
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
                className={inputClass}
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
                      max-h-64 overflow-y-auto rounded-md ${isDark ? 'text-foreground' : 'text-gray-900'}`}
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
