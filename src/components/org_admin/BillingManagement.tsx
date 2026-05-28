import React, { useEffect, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from '../ui/card';
import { Button } from '../ui/button';
import { CreditCard, CheckCircle2, AlertCircle, Building, Calendar, Mail, Phone, Tag, Clock, Check, LifeBuoy, Download, Loader2, Eye } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getBillingAndSupport, BillingAndSupportResponse } from '../../utils/admin_api';
import { fetchWithTokenRefresh } from '../../utils/authService';
import { API_ENDPOINT } from '../../utils/config';
import { useToast } from '../../hooks/use-toast';
import { SkeletonPageHeader, SkeletonTable, SkeletonStatsGrid } from '../ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../ui/dialog';
import { Badge } from '../ui/badge';
import { ScrollArea } from '../ui/scroll-area';
import { Label } from '../ui/label';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { showSuccessAlert, showErrorAlert, showConfirmAlert } from '../../utils/sweetalert';
import { useTheme } from '../../context/ThemeContext';

const BillingManagement = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { theme } = useTheme();
  
  const [data, setData] = useState<BillingAndSupportResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [downloadingId, setDownloadingId] = useState<number | null>(null);
  const [viewTicket, setViewTicket] = useState<any>(null);
  const [showRaiseTicket, setShowRaiseTicket] = useState(false);
  const [ticketForm, setTicketForm] = useState({ subject: '', description: '', priority: 'Medium' });
  const [submittingTicket, setSubmittingTicket] = useState(false);
  const [deletingTicketId, setDeletingTicketId] = useState<number | null>(null);
  
  const [paymentsPage, setPaymentsPage] = useState(1);
  const [ticketsPage, setTicketsPage] = useState(1);
  const itemsPerPage = 5;

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const res = await getBillingAndSupport();
        if (res.success) {
          setData(res);
        } else {
          toast({ variant: 'destructive', title: 'Error', description: res.message || 'Failed to load billing details' });
        }
      } catch (err) {
        toast({ variant: 'destructive', title: 'Error', description: 'Network error fetching billing details' });
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [toast]);

  const handleRaiseTicket = async () => {
    if (!ticketForm.subject.trim() || !ticketForm.description.trim()) {
      showErrorAlert('Error', 'Subject and description are required');
      return;
    }
    try {
      setSubmittingTicket(true);
      // show a persistent 'Submitting' toast so user knows action is in progress
      const pending = toast({ title: 'Submitting...', description: 'Raising support ticket', });
      const response = await fetchWithTokenRefresh(`${API_ENDPOINT}/admin/support-tickets/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(ticketForm)
      });
      const res = await response.json();
      if (res.success) {
        // update toast to success
        pending.update({ title: 'Ticket raised', description: 'Support team will contact you shortly' });
        setTimeout(() => pending.dismiss(), 2500);
        showSuccessAlert('Ticket Raised', 'Support team will contact you shortly');
        setShowRaiseTicket(false);
        setTicketForm({ subject: '', description: '', priority: 'Medium' });
        // Manually prepend the new ticket to data without fully reloading
        if (data && res.ticket) {
          setData({ ...data, support_tickets: [res.ticket, ...(data.support_tickets || [])] });
        }
      } else {
        pending.update({ title: 'Failed', description: res.error || 'Failed to raise ticket' });
        setTimeout(() => pending.dismiss(), 3500);
        showErrorAlert('Error', res.error || 'Failed to raise ticket');
      }
    } catch (err) {
      toast({ title: 'Network error', description: 'Network error while raising ticket' });
      showErrorAlert('Error', 'Network error while raising ticket');
    } finally {
      setSubmittingTicket(false);
    }
  };

  const handleDownloadReceipt = async (paymentId: number) => {
    setDownloadingId(paymentId);
    try {
      const response = await fetchWithTokenRefresh(`${API_ENDPOINT}/admin/subscription-receipt/${paymentId}/`);
      if (response.ok) {
        const contentType = response.headers.get('content-type');
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const extension = contentType?.includes('html') ? 'html' : 'pdf';
        a.download = `Stalight_Receipt_${paymentId}.${extension}`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        showSuccessAlert('Success', 'Receipt downloaded successfully');
      } else {
        const result = await response.json();
        showErrorAlert('Error', result.message || 'Failed to download receipt');
      }
    } catch (err) {
      showErrorAlert('Error', 'Network error while downloading receipt');
    } finally {
      setDownloadingId(null);
    }
  };

  const handleDeleteTicket = async (ticketId: number) => {
    const confirmed = await showConfirmAlert('Delete ticket', 'Are you sure you want to delete this ticket?', 'Delete');
    if (!confirmed.isConfirmed) return;
    setDeletingTicketId(ticketId);
    try {
      const response = await fetchWithTokenRefresh(`${API_ENDPOINT}/admin/support-tickets/${ticketId}/`, {
        method: 'DELETE'
      });
      const res = await response.json();
      if (res.success) {
        showSuccessAlert('Deleted', 'Support ticket deleted');
        if (data) {
          setData({ ...data, support_tickets: (data.support_tickets || []).filter((t: any) => t.id !== ticketId) });
        }
      } else {
        showErrorAlert('Error', res.error || 'Failed to delete ticket');
      }
    } catch (err) {
      showErrorAlert('Error', 'Network error while deleting ticket');
    } finally {
      setDeletingTicketId(null);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <SkeletonPageHeader />
        <SkeletonStatsGrid items={3} />
        <SkeletonTable rows={4} cols={5} />
      </div>
    );
  }

  const org = data?.org_details;
  const payments = data?.payment_history || [];
  const tickets = data?.support_tickets || [];

  const totalPaymentPages = Math.max(1, Math.ceil(payments.length / itemsPerPage));
  const totalTicketPages = Math.max(1, Math.ceil(tickets.length / itemsPerPage));

  const safePaymentsPage = Math.min(paymentsPage, totalPaymentPages);
  const safeTicketsPage = Math.min(ticketsPage, totalTicketPages);

  const paginatedPayments = payments.slice((safePaymentsPage - 1) * itemsPerPage, safePaymentsPage * itemsPerPage);
  const paginatedTickets = tickets.slice((safeTicketsPage - 1) * itemsPerPage, safeTicketsPage * itemsPerPage);

  const planName = org?.plan_type === 'advance' ? 'Advance' : org?.plan_type === 'pro' ? 'Pro' : 'Basic (Trial)';
  const planPrice = org?.plan_type === 'advance' ? '₹3,00,000/year' : org?.plan_type === 'pro' ? '₹99,999/year' : '₹0';
  
  const formatDate = (dateStr: string | null | undefined) => {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Billing & Plans</h2>
          <p className="text-muted-foreground">Manage your organization's subscription and billing details.</p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* Current Plan Card */}
        <Card id="billing-plan-card" className="col-span-2 md:col-span-1 lg:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Current Plan
            </CardTitle>
            <CardDescription>Your current subscription tier</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg border">
              <div>
                <p className="font-semibold text-xl text-primary">{planName}</p>
              </div>
              <div className="flex flex-col items-end gap-1">
                <span className="text-xs text-muted-foreground">Status</span>
                <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${org?.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                  {org?.is_active ? <CheckCircle2 className="h-3.5 w-3.5" /> : <AlertCircle className="h-3.5 w-3.5" />}
                  {org?.is_active ? 'Active' : 'Inactive'}
                </div>
              </div>
            </div>
            
            <div className="flex flex-col gap-2 p-4 border rounded-lg">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground flex items-center gap-2"><Tag className="h-4 w-4" /> Price</span>
                <span className="text-sm font-medium">{planPrice}</span>
              </div>
              <div className="flex justify-between items-center mt-2 pt-2 border-t">
                <span className="text-sm text-muted-foreground flex items-center gap-2"><Calendar className="h-4 w-4" /> Expiry Date</span>
                <span className="text-sm font-medium">{formatDate(org?.subscription_expires_at)}</span>
              </div>
            </div>

            {org?.plan_type === 'basic' && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex gap-3 text-amber-800">
                <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-sm">Trial Active</p>
                  <p className="text-xs mt-1">Upgrade to Pro or Advance to unlock all features.</p>
                  <Button variant="default" size="sm" className="mt-3 bg-amber-600 hover:bg-amber-700" onClick={() => navigate('/trial-expired')}>
                    Upgrade Plan
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Organization Details Card */}
        <Card id="billing-org-details-card" className="col-span-2 md:col-span-1 lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building className="h-5 w-5" />
              Organization Details
            </CardTitle>
            <CardDescription>Administrative and contact information</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
              <div>
                <p className="text-xs text-muted-foreground mb-1">Organization Name</p>
                <p className="font-medium text-sm">{org?.name || 'N/A'}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Created At</p>
                <p className="font-medium text-sm">{formatDate(org?.created_at)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Accreditation ID</p>
                <p className="font-medium text-sm">{org?.accreditation_id || 'N/A'}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Tax ID / GSTIN</p>
                <p className="font-medium text-sm">{org?.tax_id || 'N/A'}</p>
              </div>
              <div className="md:col-span-2 pt-3 mt-1 border-t">
                <h4 className="text-sm font-semibold mb-3">Technical POC</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="flex items-start gap-2">
                    <Building className="h-4 w-4 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-xs text-muted-foreground">Name</p>
                      <p className="text-sm">{org?.tech_poc_name || 'N/A'}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <Mail className="h-4 w-4 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-xs text-muted-foreground">Email</p>
                      <p className="text-sm">{org?.tech_poc_email || 'N/A'}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <Phone className="h-4 w-4 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-xs text-muted-foreground">Mobile</p>
                      <p className="text-sm">{org?.tech_poc_mobile || 'N/A'}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Payment History Section */}
      <Card id="billing-payment-history">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2"><Clock className="h-5 w-5" /> Payment History</CardTitle>
          <CardDescription>Recent transactions and subscription payments</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-muted/50 text-muted-foreground text-xs uppercase">
                <tr>
                  <th className="px-4 py-3 font-medium rounded-tl-lg">Date</th>
                  <th className="px-4 py-3 font-medium">Plan</th>
                  <th className="px-4 py-3 font-medium">Amount</th>
                  <th className="px-4 py-3 font-medium">Transaction ID</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium rounded-tr-lg">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {paginatedPayments.length > 0 ? (
                  paginatedPayments.map((payment, idx) => (
                    <tr key={idx} className="hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3">{formatDate(payment.timestamp)}</td>
                      <td className="px-4 py-3 capitalize">{payment.plan_type}</td>
                      <td className="px-4 py-3 font-medium">₹{payment.amount}</td>
                      <td className="px-4 py-3 font-mono text-xs">{payment.transaction_id}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${payment.status === 'success' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                          {payment.status}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {payment.status === 'success' && (
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-8 px-2 flex items-center gap-1.5 text-primary hover:text-primary hover:bg-primary/10 transition-colors"
                            onClick={() => handleDownloadReceipt(payment.id)}
                            disabled={downloadingId === payment.id}
                          >
                            {downloadingId === payment.id ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
                            Receipt
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                      No payment history found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
        {payments.length > 0 && (
          <CardFooter className="flex flex-col sm:flex-row justify-between items-center gap-4 text-sm text-muted-foreground px-6 py-4 border-t">
            <div>
              Showing {Math.min((safePaymentsPage - 1) * itemsPerPage + 1, payments.length)} to {Math.min(safePaymentsPage * itemsPerPage, payments.length)} of {payments.length} payments
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={safePaymentsPage === 1}
                onClick={() => setPaymentsPage((p) => Math.max(1, p - 1))}
                className="bg-primary hover:bg-primary/90 text-white border-primary h-9 px-4 transition-all"
              >
                Previous
              </Button>
              <div className="flex items-center justify-center min-w-[2rem]">
                <span className={`text-sm font-semibold ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>{safePaymentsPage}</span>
              </div>
              <Button
                variant="outline"
                size="sm"
                disabled={safePaymentsPage === totalPaymentPages}
                onClick={() => setPaymentsPage((p) => Math.min(totalPaymentPages, p + 1))}
                className="bg-primary hover:bg-primary/90 text-white border-primary h-9 px-4 transition-all"
              >
                Next
              </Button>
            </div>
          </CardFooter>
        )}
      </Card>

      {/* Support Tickets Section */}
      <Card id="billing-support-tickets">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-lg flex items-center gap-2"><LifeBuoy className="h-5 w-5" /> Support Tickets</CardTitle>
            <CardDescription>Raise and track issues with Super Admin HQ.</CardDescription>
          </div>
          <Button id="billing-raise-ticket-btn" size="sm" onClick={() => setShowRaiseTicket(true)}>Raise Ticket</Button>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-muted/50 text-muted-foreground text-xs uppercase">
                <tr>
                  <th className="px-4 py-3 font-medium rounded-tl-lg">Ticket ID</th>
                  <th className="px-4 py-3 font-medium">Subject</th>
                  <th className="px-4 py-3 font-medium hidden md:table-cell">Description</th>
                  <th className="px-4 py-3 font-medium">Priority</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Date</th>
                  <th className="px-4 py-3 font-medium rounded-tr-lg">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {paginatedTickets.length > 0 ? (
                  paginatedTickets.map((ticket, idx) => (
                    <tr key={idx} className="hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3 font-mono text-xs text-primary">{ticket.ticket_id}</td>
                      <td className="px-4 py-3 font-medium">{ticket.subject}</td>
                      <td className="px-4 py-3 hidden md:table-cell truncate max-w-[200px]" title={ticket.description}>
                        {ticket.description}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          ticket.priority === 'High' || ticket.priority === 'Critical' ? 'bg-red-100 text-red-700' :
                          ticket.priority === 'Medium' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'
                        }`}>
                          {ticket.priority}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          ticket.status === 'Resolved' || ticket.status === 'Closed' ? 'bg-gray-100 text-gray-700' : 'bg-green-100 text-green-700'
                        }`}>
                          {ticket.status}
                        </span>
                      </td>
                      <td className="px-4 py-3">{formatDate(ticket.created_at)}</td>
                      <td className="px-4 py-3">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-8 px-2 flex items-center gap-1.5 text-primary hover:text-primary hover:bg-primary/10 transition-colors"
                          onClick={() => setViewTicket(ticket)}
                        >
                          <Eye size={14} />
                          View
                        </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 px-2 flex items-center gap-1.5 text-red-600 hover:text-red-700 hover:bg-red-50 transition-colors"
                            onClick={() => handleDeleteTicket(ticket.id)}
                            disabled={deletingTicketId === ticket.id}
                          >
                            {deletingTicketId === ticket.id ? <Loader2 size={14} className="animate-spin mr-2" /> : null}
                            Delete
                          </Button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">
                      No support tickets found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
        {tickets.length > 0 && (
          <CardFooter className="flex flex-col sm:flex-row justify-between items-center gap-4 text-sm text-muted-foreground px-6 py-4 border-t">
            <div>
              Showing {Math.min((safeTicketsPage - 1) * itemsPerPage + 1, tickets.length)} to {Math.min(safeTicketsPage * itemsPerPage, tickets.length)} of {tickets.length} tickets
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={safeTicketsPage === 1}
                onClick={() => setTicketsPage((p) => Math.max(1, p - 1))}
                className="bg-primary hover:bg-primary/90 text-white border-primary h-9 px-4 transition-all"
              >
                Previous
              </Button>
              <div className="flex items-center justify-center min-w-[2rem]">
                <span className={`text-sm font-semibold ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>{safeTicketsPage}</span>
              </div>
              <Button
                variant="outline"
                size="sm"
                disabled={safeTicketsPage === totalTicketPages}
                onClick={() => setTicketsPage((p) => Math.min(totalTicketPages, p + 1))}
                className="bg-primary hover:bg-primary/90 text-white border-primary h-9 px-4 transition-all"
              >
                Next
              </Button>
            </div>
          </CardFooter>
        )}
      </Card>

      {/* Raise Ticket Modal */}
      <Dialog open={showRaiseTicket} onOpenChange={setShowRaiseTicket}>
        <DialogContent className="w-[90%] sm:max-w-[500px] mx-auto rounded-xl">
          <DialogHeader>
            <DialogTitle>Raise Support Ticket</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="subject">Subject</Label>
              <Input 
                id="subject" 
                placeholder="Brief issue title" 
                value={ticketForm.subject}
                onChange={(e) => setTicketForm({ ...ticketForm, subject: e.target.value })}
                disabled={submittingTicket}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="priority">Priority</Label>
              <Select
                value={ticketForm.priority}
                onValueChange={(val) => setTicketForm({ ...ticketForm, priority: val })}
                disabled={submittingTicket}
              >
                <SelectTrigger id="priority" className="w-full">
                  <SelectValue placeholder="Select priority" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Low">Low</SelectItem>
                  <SelectItem value="Medium">Medium</SelectItem>
                  <SelectItem value="High">High</SelectItem>
                  <SelectItem value="Critical">Critical</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea 
                id="description" 
                placeholder="Detailed explanation of the issue" 
                className="resize-none h-26 overflow-y-auto custom-scrollbar"
                value={ticketForm.description}
                onChange={(e) => setTicketForm({ ...ticketForm, description: e.target.value })}
                disabled={submittingTicket}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRaiseTicket(false)} disabled={submittingTicket}>Cancel</Button>
            <Button onClick={handleRaiseTicket} disabled={submittingTicket}>
              {submittingTicket ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Submitting...</> : 'Submit Ticket'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Ticket Modal */}
      <Dialog open={!!viewTicket} onOpenChange={(open) => !open && setViewTicket(null)}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Ticket Details</DialogTitle>
          </DialogHeader>
          {viewTicket && (
            <div className="space-y-4 pt-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-[10px] uppercase text-muted-foreground font-medium">Status</p>
                  <div className="mt-1">
                    <Badge className={
                      viewTicket.status === 'Resolved' ? 'bg-emerald-100 text-emerald-800 border-emerald-200' :
                      viewTicket.status === 'Closed' ? 'bg-gray-100 text-gray-600 border-gray-300' :
                      viewTicket.status === 'Pending' ? 'bg-amber-100 text-amber-800 border-amber-200' :
                      'bg-blue-100 text-blue-800 border-blue-200'
                    } variant="outline">{viewTicket.status}</Badge>
                  </div>
                </div>
                <div>
                  <p className="text-[10px] uppercase text-muted-foreground font-medium">Priority</p>
                  <div className="mt-1">
                    <Badge variant="outline" className={
                      viewTicket.priority === 'Critical' ? 'border-red-500 text-red-600 bg-red-50' :
                      viewTicket.priority === 'High' ? 'border-orange-500 text-orange-600 bg-orange-50' :
                      'border-blue-500 text-blue-600 bg-blue-50'
                    }>{viewTicket.priority}</Badge>
                  </div>
                </div>
              </div>
              <div>
                <p className="text-[10px] uppercase text-muted-foreground font-medium">Subject</p>
                <p className="mt-1 font-semibold">{viewTicket.subject}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase text-muted-foreground font-medium">Description</p>
                <ScrollArea className="h-32 mt-1 rounded-md border p-3 bg-muted/20">
                  <p className="text-sm whitespace-pre-wrap">{viewTicket.description}</p>
                </ScrollArea>
              </div>
              {viewTicket.response && (
                <div>
                  <p className="text-[10px] uppercase text-muted-foreground font-medium">HQ Response</p>
                  <div className="mt-1 p-3 rounded-md bg-emerald-50 border border-emerald-100">
                    <p className="text-sm italic">{viewTicket.response}</p>
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default BillingManagement;
