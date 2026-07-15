import React, { useEffect, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from '../ui/card';
import { Button } from '../ui/button';
import { CreditCard, CheckCircle2, AlertCircle, Building, Calendar, Mail, Phone, Tag, Clock, Check, LifeBuoy, Download, Loader2, Eye, Camera, Edit, Trash, Users } from 'lucide-react';
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
import UpgradePlanDialog from '../common/UpgradePlanDialog';
import { IncreaseCapacityDialog } from '../common/IncreaseCapacityDialog';
import { UpgradeTierDialog } from '../common/UpgradeTierDialog';
import { downloadFile } from '../../utils/downloadHelper';

export const BillingManagement: React.FC = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { theme } = useTheme();

  const [activeTab, setActiveTab] = useState("overview");
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

  const [isUpgradeOpen, setIsUpgradeOpen] = useState(false);
  const [isCapacityUpgradeOpen, setIsCapacityUpgradeOpen] = useState(false);
  const [isTierUpgradeOpen, setIsTierUpgradeOpen] = useState(false);

  const [showEditOrg, setShowEditOrg] = useState(false);
  const [editOrgStep, setEditOrgStep] = useState(1);
  const [orgForm, setOrgForm] = useState({
    name: '',
    accreditation_id: '',
    address: '',
    tax_id: '',
    billing_address: '',
    tech_poc_name: '',
    tech_poc_email: '',
    tech_poc_mobile: ''
  });
  const [orgLogo, setOrgLogo] = useState<File | null>(null);
  const [orgLogoPreview, setOrgLogoPreview] = useState<string | null>(null);
  const [savingOrg, setSavingOrg] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);

  const handleOpenEditOrg = () => {
    if (org) {
      setOrgForm({
        name: org.name || '',
        accreditation_id: org.accreditation_id || '',
        address: org.address || '',
        tax_id: org.tax_id || '',
        billing_address: org.billing_address || '',
        tech_poc_name: org.tech_poc_name || '',
        tech_poc_email: org.tech_poc_email || '',
        tech_poc_mobile: org.tech_poc_mobile || ''
      });
      setOrgLogoPreview(org.logo || null);
      setOrgLogo(null);
      setEditOrgStep(1);
      setShowEditOrg(true);
    }
  };

  const handleOrgLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setOrgLogo(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setOrgLogoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveOrgLogo = async () => {
    const confirmed = await showConfirmAlert('Remove Logo', 'Are you sure you want to remove the logo?', 'Remove');
    if (confirmed.isConfirmed) {
      setOrgLogoPreview(null);
      setOrgLogo(null);
    }
  };

  const handleDirectLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !org) return;

    setUploadingLogo(true);
    try {
      const dataToSend = new FormData();
      dataToSend.append('name', org.name || '');
      dataToSend.append('accreditation_id', org.accreditation_id || '');
      dataToSend.append('address', org.address || '');
      dataToSend.append('tax_id', org.tax_id || '');
      dataToSend.append('billing_address', org.billing_address || '');
      dataToSend.append('tech_poc_name', org.tech_poc_name || '');
      dataToSend.append('tech_poc_email', org.tech_poc_email || '');
      dataToSend.append('tech_poc_mobile', org.tech_poc_mobile || '');
      dataToSend.append('logo', file);

      const response = await fetchWithTokenRefresh(`${API_ENDPOINT}/admin/billing-support/`, {
        method: 'POST',
        body: dataToSend
      });

      const res = await response.json();
      if (res.success) {
        showSuccessAlert('Success', 'Organization logo uploaded successfully');
        if (data) {
          setData({
            ...data,
            org_details: {
              ...data.org_details!,
              logo: res.logo
            }
          });
        }
        const userStr = sessionStorage.getItem("user") || localStorage.getItem("user");
        if (userStr) {
          const userObj = JSON.parse(userStr);
          userObj.org_logo = res.logo;
          sessionStorage.setItem("user", JSON.stringify(userObj));
          localStorage.setItem("user", JSON.stringify(userObj));
          window.dispatchEvent(new Event("userProfileUpdated"));
        }
      } else {
        showErrorAlert('Error', res.message || 'Failed to upload logo');
      }
    } catch (err) {
      showErrorAlert('Error', 'Network error uploading logo');
    } finally {
      setUploadingLogo(false);
    }
  };

  const handleDeleteLogoDirectly = async () => {
    if (!org) return;
    const confirmed = await showConfirmAlert('Remove Logo', 'Are you sure you want to remove the organization logo?', 'Remove');
    if (!confirmed.isConfirmed) return;

    try {
      const dataToSend = new FormData();
      dataToSend.append('name', org.name || '');
      dataToSend.append('accreditation_id', org.accreditation_id || '');
      dataToSend.append('address', org.address || '');
      dataToSend.append('tax_id', org.tax_id || '');
      dataToSend.append('billing_address', org.billing_address || '');
      dataToSend.append('tech_poc_name', org.tech_poc_name || '');
      dataToSend.append('tech_poc_email', org.tech_poc_email || '');
      dataToSend.append('tech_poc_mobile', org.tech_poc_mobile || '');
      dataToSend.append('delete_logo', 'true');

      const response = await fetchWithTokenRefresh(`${API_ENDPOINT}/admin/billing-support/`, {
        method: 'POST',
        body: dataToSend
      });

      const res = await response.json();
      if (res.success) {
        showSuccessAlert('Success', 'Organization logo removed successfully');
        if (data) {
          setData({
            ...data,
            org_details: {
              ...data.org_details!,
              logo: null
            }
          });
        }
        const userStr = sessionStorage.getItem("user") || localStorage.getItem("user");
        if (userStr) {
          const userObj = JSON.parse(userStr);
          userObj.org_logo = null;
          sessionStorage.setItem("user", JSON.stringify(userObj));
          localStorage.setItem("user", JSON.stringify(userObj));
          window.dispatchEvent(new Event("userProfileUpdated"));
        }
      } else {
        showErrorAlert('Error', res.message || 'Failed to remove logo');
      }
    } catch (err) {
      showErrorAlert('Error', 'Network error removing logo');
    }
  };

  const handleSaveOrgDetails = async () => {
    if (!orgForm.name.trim()) {
      showErrorAlert('Error', 'Organization Name is required');
      return;
    }

    setSavingOrg(true);
    try {
      const dataToSend = new FormData();
      Object.entries(orgForm).forEach(([key, val]) => {
        dataToSend.append(key, val);
      });
      if (orgLogo) {
        dataToSend.append('logo', orgLogo);
      } else if (!orgLogoPreview) {
        dataToSend.append('delete_logo', 'true');
      }

      const response = await fetchWithTokenRefresh(`${API_ENDPOINT}/admin/billing-support/`, {
        method: 'POST',
        body: dataToSend
      });

      const res = await response.json();
      if (res.success) {
        showSuccessAlert('Success', 'Organization details updated successfully');
        setShowEditOrg(false);
        const newLogo = res.logo || orgLogoPreview || null;
        if (data) {
          setData({
            ...data,
            org_details: {
              ...data.org_details!,
              ...orgForm,
              logo: newLogo
            }
          });
        }
        const userStr = sessionStorage.getItem("user") || localStorage.getItem("user");
        if (userStr) {
          const userObj = JSON.parse(userStr);
          userObj.org_logo = newLogo;
          sessionStorage.setItem("user", JSON.stringify(userObj));
          localStorage.setItem("user", JSON.stringify(userObj));
          window.dispatchEvent(new Event("userProfileUpdated"));
        }
      } else {
        showErrorAlert('Error', res.message || 'Failed to update organization details');
      }
    } catch (err) {
      showErrorAlert('Error', 'Network error updating organization details');
    } finally {
      setSavingOrg(false);
    }
  };

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
      const response = await fetchWithTokenRefresh(`${API_ENDPOINT}/admin/support-tickets/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(ticketForm)
      });
      const res = await response.json();
      if (res.success) {
        showSuccessAlert('Ticket Raised', 'Support team will contact you shortly');
        setShowRaiseTicket(false);
        setTicketForm({ subject: '', description: '', priority: 'Medium' });
        // Manually prepend the new ticket to data without fully reloading
        if (data && res.ticket) {
          setData({ ...data, support_tickets: [res.ticket, ...(data.support_tickets || [])] });
        }
      } else {
        showErrorAlert('Error', res.error || 'Failed to raise ticket');
      }
    } catch (err) {
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
        const extension = contentType?.includes('html') ? 'html' : 'pdf';
        await downloadFile(response, `Stalight_Receipt_${paymentId}.${extension}`);
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

  const planName = org?.plan_type === 'advance' ? 'Advance' : org?.plan_type === 'pro' ? 'Pro' : 'Basic';
  const cycleStr = org?.billing_cycle || 'Yearly';
  let planPrice = '';

  if (org?.plan_type === 'advance') {
    const maxStudents = org?.max_students || 500;
    const baseRate = 250;
    const totalYearly = maxStudents * baseRate;
    const price = cycleStr === 'Monthly' ? Math.round(totalYearly / 12) : cycleStr === 'Quarterly' ? Math.round(totalYearly / 4) : totalYearly;
    planPrice = `₹${price.toLocaleString('en-IN')} / ${cycleStr}`;
  } else if (org?.plan_type === 'pro') {
    const maxStudents = org?.max_students || 500;
    const baseRate = 200;
    const totalYearly = maxStudents * baseRate;
    const price = cycleStr === 'Monthly' ? Math.round(totalYearly / 12) : cycleStr === 'Quarterly' ? Math.round(totalYearly / 4) : totalYearly;
    planPrice = `₹${price.toLocaleString('en-IN')} / ${cycleStr}`;
  } else {
    const maxStudents = org?.max_students || 500;
    const pricePerStudent = 150;
    const totalYearly = maxStudents * pricePerStudent;
    const price = cycleStr === 'Monthly' ? Math.round(totalYearly / 12) : cycleStr === 'Quarterly' ? Math.round(totalYearly / 4) : totalYearly;
    planPrice = `₹${price.toLocaleString('en-IN')} / ${cycleStr} (Up to ${maxStudents} students)`;
  }
  const formatDate = (dateStr: string | null | undefined) => {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  const formatDateTime = (dateStr: string | null | undefined) => {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleString('en-GB', {
      day: 'numeric', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit', hour12: true
    });
  };

  const TIER_OPTIONS = [
    { max: 750, name: 'Small Tier' },
    { max: 2500, name: 'Medium Tier' },
    { max: 6000, name: 'Large Tier' },
    { max: 12000, name: 'Very Large Tier' },
    { max: 30000, name: 'Enterprise Tier' },
  ];
  const currentMaxStudents = org?.max_students || 500;
  const currentTierInfo = TIER_OPTIONS.find(t => currentMaxStudents <= t.max);
  const isMaxCapacityReached = currentTierInfo ? currentMaxStudents >= currentTierInfo.max : true;

  return (
    <div className="space-y-6">
      <div className="grid gap-6 grid-cols-1 min-[1250px]:grid-cols-3">
        {/* Current Plan Card */}
        <Card id="billing-plan-card" className="col-span-1 min-[1250px]:col-span-1 flex flex-col h-full">
          <CardHeader className="border-b pb-4 flex flex-row items-center justify-between">
            <div>
              <CardTitle className={`text-2xl font-semibold flex items-center gap-2 ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>
                Current Plan
              </CardTitle>
              <CardDescription>Your current subscription tier</CardDescription>
            </div>
            <div className="h-9 shrink-0" />
          </CardHeader>
          <CardContent className="space-y-4 pt-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-muted/50 rounded-lg border">
              <div>
                <p className="font-semibold text-xl text-primary capitalize">{planName}</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Status:</span>
                <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${org?.is_active ? 'bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-400' : 'bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400'}`}>
                  {org?.is_active ? <CheckCircle2 className="h-3.5 w-3.5" /> : <AlertCircle className="h-3.5 w-3.5" />}
                  {org?.is_active ? 'Active' : 'Inactive'}
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-2.5 p-4 border rounded-lg">
              <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-1">
                <span className="text-sm text-muted-foreground flex items-center gap-2"><Tag className="h-4 w-4 shrink-0" /> Price</span>
                <span className="text-sm font-medium break-all text-left sm:text-right">{planPrice}</span>
              </div>
              <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-1 mt-2 pt-2 border-t">
                <span className="text-sm text-muted-foreground flex items-center gap-2"><Users className="h-4 w-4 shrink-0" /> Capacity</span>
                <div className="text-left sm:text-right">
                  <span className="text-sm font-medium">{org?.max_students} Students</span>
                  {org?.buffer_students > 0 && (
                    <div className="text-xs text-muted-foreground">({org?.base_capacity} Base + {org?.buffer_students} Buffer)</div>
                  )}
                </div>
              </div>
              <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-1 mt-2 pt-2 border-t">
                <span className="text-sm text-muted-foreground flex items-center gap-2"><Users className="h-4 w-4 shrink-0" /> Active Students</span>
                <span className={`text-sm font-medium ${org?.active_student_count > (org?.max_students || 0) ? 'text-red-500' : ''}`}>
                  {org?.active_student_count || 0} / {org?.max_students}
                </span>
              </div>
              <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-1 mt-2 pt-2 border-t">
                <span className="text-sm text-muted-foreground flex items-center gap-2"><Calendar className="h-4 w-4 shrink-0" /> Started At</span>
                <span className="text-sm font-medium">{formatDate(org?.subscription_started_at || org?.created_at)}</span>
              </div>
              <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-1 mt-2 pt-2 border-t">
                <span className="text-sm text-muted-foreground flex items-center gap-2"><Calendar className="h-4 w-4 shrink-0" /> Expiry Date</span>
                <span className="text-sm font-medium">{formatDate(org?.subscription_expires_at)}</span>
              </div>
            </div>

            {org?.plan_type === 'basic' && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex gap-3 text-amber-800">
                <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-sm">Basic Plan Active</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Upgrade to Pro or Advance to unlock all features.</p>
                  <div className="flex flex-wrap gap-2 mt-3">
                    <Button variant="default" size="sm" className="bg-amber-600 hover:bg-amber-700" onClick={() => setIsUpgradeOpen(true)}>
                      Upgrade Plan
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className={isMaxCapacityReached ? "border-amber-300 text-amber-700 hover:bg-amber-100" : "border-amber-300 text-amber-700 hover:bg-amber-100"}
                      onClick={() => isMaxCapacityReached ? setIsTierUpgradeOpen(true) : setIsCapacityUpgradeOpen(true)}
                    >
                      {isMaxCapacityReached ? 'Upgrade Tier' : 'Increase Limit'}
                    </Button>
                  </div>
                </div>
              </div>
            )}
            {org?.plan_type === 'pro' && (
              <div className="bg-primary/5 border border-primary/20 rounded-lg p-4 flex gap-3 text-primary">
                <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-sm">Pro Plan Active</p>
                  <p className="text-xs mt-1">Upgrade to Advance to unlock Enterprise features.</p>
                  <div className="flex flex-wrap gap-2 mt-3">
                    <Button variant="default" size="sm" className="bg-primary hover:bg-primary/90 text-white" onClick={() => setIsUpgradeOpen(true)}>
                      Upgrade to Advance
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className={isMaxCapacityReached ? "border-primary/30 text-primary hover:bg-primary/10" : "border-primary/30 text-primary hover:bg-primary/10"}
                      onClick={() => isMaxCapacityReached ? setIsTierUpgradeOpen(true) : setIsCapacityUpgradeOpen(true)}
                    >
                      {isMaxCapacityReached ? 'Upgrade Tier' : 'Increase Limit'}
                    </Button>
                  </div>
                </div>
              </div>
            )}
            {org?.plan_type === 'advance' && (
              <div className={`border rounded-lg p-4 flex gap-3 ${theme === 'dark' ? 'bg-emerald-950/30 border-emerald-900/60 text-emerald-300' : 'bg-emerald-50 border-emerald-200 text-emerald-800'}`}>
                <CheckCircle2 className="h-5 w-5 shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-sm">Advance Plan Active</p>
                  <p className="text-xs mt-1">You are on the highest tier with all Enterprise features unlocked.</p>
                  <div className="flex flex-wrap gap-2 mt-3">
                    <Button
                      variant="outline"
                      size="sm"
                      className={theme === 'dark' ? "border-emerald-800 text-emerald-400 hover:bg-emerald-900/30 hover:text-emerald-300" : "border-emerald-300 text-emerald-700 hover:bg-emerald-100"}
                      onClick={() => isMaxCapacityReached ? setIsTierUpgradeOpen(true) : setIsCapacityUpgradeOpen(true)}
                    >
                      {isMaxCapacityReached ? 'Upgrade Tier' : 'Increase Limit'}
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Organization Details Card */}
        <Card id="billing-org-details-card" className="col-span-1 min-[1250px]:col-span-2 flex flex-col h-full">
          <CardHeader className="border-b pb-4 flex flex-row items-center justify-between">
            <div className="flex-1 pr-4">
              <CardTitle className={`text-2xl font-semibold flex items-center gap-2 ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>
                Organization Details
              </CardTitle>
              <CardDescription>Administrative and contact information</CardDescription>
            </div>
            <Button variant="default" size="sm" onClick={handleOpenEditOrg} className="bg-primary text-white hover:bg-primary/90 flex items-center gap-1.5 shrink-0">
              <Edit size={14} />
              Edit
            </Button>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="flex flex-col min-[1250px]:flex-row items-center min-[1250px]:items-start gap-6 mb-6 w-full">
              {/* Brand Logo Display */}
              <div className="relative flex flex-col items-center justify-center border p-4 rounded-xl bg-muted/20 w-32 h-32 shrink-0 group">
                {org?.logo ? (
                  <>
                    <img src={org.logo} alt="Brand Logo" className="w-full h-full object-contain rounded-lg" />
                    <button
                      onClick={handleDeleteLogoDirectly}
                      className="absolute top-1.5 right-1.5 bg-red-500 hover:bg-red-600 text-white p-1.5 rounded-full cursor-pointer transition-all opacity-0 group-hover:opacity-100 shadow-md"
                      title="Remove Logo"
                    >
                      <Trash className="h-3.5 w-3.5" />
                    </button>
                  </>
                ) : (
                  <>
                    {uploadingLogo ? (
                      <div className="w-full h-full rounded-lg bg-primary/10 flex flex-col items-center justify-center text-primary gap-1">
                        <Loader2 className="h-6 w-6 animate-spin" />
                        <span className="text-[10px] font-semibold text-center leading-tight">Uploading...</span>
                      </div>
                    ) : (
                      <>
                        <label htmlFor="direct-logo-upload" className="w-full h-full rounded-lg bg-primary/10 flex flex-col items-center justify-center text-primary cursor-pointer hover:bg-primary/20 transition-all gap-1">
                          <Camera className="h-6 w-6" />
                          <span className="text-[10px] font-semibold text-center leading-tight">Upload Logo</span>
                        </label>
                        <input id="direct-logo-upload" type="file" accept="image/*" onChange={handleDirectLogoUpload} className="hidden" />
                      </>
                    )}
                  </>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 min-[1250px]:grid-cols-3 gap-x-6 gap-y-4 flex-1 w-full">
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Organization Name</p>
                  <p className="font-medium text-sm text-foreground">{org?.name || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Created At</p>
                  <p className="font-medium text-sm text-foreground">{formatDate(org?.created_at)}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Accreditation ID</p>
                  <p className="font-medium text-sm text-foreground">{org?.accreditation_id || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Tax ID / GSTIN</p>
                  <p className="font-medium text-sm text-foreground">{org?.tax_id || 'N/A'}</p>
                </div>
                <div className="col-span-1 sm:col-span-2 min-[1250px]:col-span-3">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Institution Address</p>
                  <p className="font-medium text-sm text-foreground">{org?.address || 'N/A'}</p>
                </div>
                <div className="col-span-1 sm:col-span-2 min-[1250px]:col-span-3">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Billing Address</p>
                  <p className="font-medium text-sm text-foreground">{org?.billing_address || 'N/A'}</p>
                </div>
              </div>
            </div>

            <div className="pt-3 mt-1 border-t">
              <h4 className="text-base md:text-sm font-semibold mb-3">Technical POC</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="flex items-start gap-2">
                  <Building className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <div className="flex flex-col gap-0.5">
                    <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider leading-none">Name</p>
                    <p className="font-medium text-sm text-foreground leading-normal">{org?.tech_poc_name || 'N/A'}</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <Mail className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <div className="flex flex-col gap-0.5">
                    <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider leading-none">Email</p>
                    <p className="font-medium text-sm text-foreground leading-normal">{org?.tech_poc_email || 'N/A'}</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <Phone className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <div className="flex flex-col gap-0.5">
                    <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider leading-none">Mobile</p>
                    <p className="font-medium text-sm text-foreground leading-normal">{org?.tech_poc_mobile || 'N/A'}</p>
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
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-base md:text-sm text-left whitespace-nowrap">
              <thead className="bg-muted/50 text-muted-foreground text-sm md:text-xs uppercase">
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
                      <td className="px-4 py-3 font-medium">₹{parseFloat(payment.amount as any).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                      <td className="px-4 py-3 font-mono text-sm md:text-xs">{payment.transaction_id}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded-full text-sm md:text-xs font-medium ${payment.status === 'success' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                          {payment.status}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {payment.status === 'success' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 px-2 flex items-center gap-1.5 text-primary hover:text-primary hover:bg-primary/10 text-sm md:text-xs transition-colors"
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
        {payments.length > itemsPerPage && (
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
        <CardHeader id="billing-support-tickets-header" className="flex flex-row items-start justify-between">
          <div className="flex-1 pr-4">
            <CardTitle className="text-lg flex items-center gap-2"><LifeBuoy className="h-5 w-5" /> Support Tickets</CardTitle>
            <CardDescription>Raise and track issues with Super Admin HQ.</CardDescription>
          </div>
          <Button id="billing-raise-ticket-btn" size="sm" onClick={() => setShowRaiseTicket(true)} className="bg-primary text-white hover:bg-primary/90 shrink-0">Raise Ticket</Button>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-base md:text-sm text-left whitespace-nowrap">
              <thead className="bg-muted/50 text-muted-foreground text-sm md:text-xs uppercase">
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
                      <td className="px-4 py-3 font-mono text-sm md:text-xs text-primary">{ticket.ticket_id}</td>
                      <td className="px-4 py-3 font-medium">{ticket.subject}</td>
                      <td className="px-4 py-3 hidden md:table-cell truncate max-w-[200px]" title={ticket.description}>
                        {ticket.description}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded-full text-sm md:text-xs font-medium ${ticket.priority === 'High' || ticket.priority === 'Critical' ? 'bg-red-100 text-red-700' :
                          ticket.priority === 'Medium' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'
                          }`}>
                          {ticket.priority}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded-full text-sm md:text-xs font-medium ${ticket.status === 'Resolved' || ticket.status === 'Closed' ? 'bg-gray-100 text-gray-700' : 'bg-green-100 text-green-700'
                          }`}>
                          {ticket.status}
                        </span>
                      </td>
                      <td className="px-4 py-3">{formatDateTime(ticket.created_at)}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 px-2 flex items-center gap-1.5 text-primary hover:text-primary hover:bg-primary/10 text-sm md:text-xs transition-colors"
                            onClick={() => setViewTicket(ticket)}
                          >
                            <Eye size={14} />
                            View
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 px-2 flex items-center gap-1.5 text-red-600 hover:text-red-700 hover:bg-red-50 text-sm md:text-xs transition-colors"
                            onClick={() => handleDeleteTicket(ticket.id)}
                            disabled={deletingTicketId === ticket.id}
                          >
                            {deletingTicketId === ticket.id ? <Loader2 size={14} className="animate-spin mr-2" /> : null}
                            Delete
                          </Button>
                        </div>
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
        {tickets.length > itemsPerPage && (
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
        <DialogContent className="w-[90%] sm:max-w-[500px] mx-auto rounded-xl">
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

      {/* Edit Organization Details Dialog */}
      <Dialog open={showEditOrg} onOpenChange={setShowEditOrg}>
        <DialogContent className="w-[90%] sm:w-[95%] sm:max-w-[550px] max-h-[85vh] overflow-y-auto mx-auto rounded-xl flex flex-col gap-4">
          <DialogHeader className="border-b pb-3">
            <DialogTitle className="text-xl font-semibold text-left">Edit Organization Details</DialogTitle>
          </DialogHeader>

          <div className="space-y-6 py-2 flex-1">
            {/* Part 1: Institutional Identity */}
            <div className="space-y-3">
              <div className="space-y-0.5 sm:space-y-1">
                <h3 className="text-base font-semibold text-foreground">Institutional Identity</h3>
                <p className="text-muted-foreground text-[11px]">Organization's core details.</p>
              </div>

              <div className="space-y-3 sm:space-y-4">
                <div className="space-y-1 sm:space-y-1.5">
                  <Label htmlFor="orgName" className="text-xs sm:text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">Organization Name *</Label>
                  <Input
                    id="orgName"
                    required
                    placeholder="e.g. AMC College of Engineering"
                    className="h-12 rounded-xl focus-visible:ring-primary/20"
                    value={orgForm.name}
                    onChange={(e) => setOrgForm({ ...orgForm, name: e.target.value })}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <div className="space-y-1 sm:space-y-1.5">
                    <Label htmlFor="accreditationId" className="text-xs sm:text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">Accreditation ID</Label>
                    <Input
                      id="accreditationId"
                      placeholder="AICTE / UGC"
                      className="h-12 rounded-xl focus-visible:ring-primary/20"
                      value={orgForm.accreditation_id}
                      onChange={(e) => setOrgForm({ ...orgForm, accreditation_id: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1 sm:space-y-1.5">
                    <span className="text-xs sm:text-[10px] font-semibold text-muted-foreground uppercase tracking-widest block">Brand Logo</span>
                    <div className="flex items-center gap-3">
                      <div className="relative w-12 h-12 bg-background rounded-xl flex items-center justify-center overflow-hidden border flex-shrink-0">
                        {orgLogoPreview ? (
                          <>
                            <img src={orgLogoPreview} alt="Preview" className="w-full h-full object-cover" />
                            <button
                              type="button"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                handleRemoveOrgLogo();
                              }}
                              className="absolute top-0 right-0 bg-red-500 hover:bg-red-600 text-white p-1 rounded-full cursor-pointer transition-colors shadow-lg"
                              title="Remove Logo"
                            >
                              <Trash className="h-3 w-3" />
                            </button>
                          </>
                        ) : (
                          <Camera size={16} className="text-muted-foreground" />
                        )}
                      </div>

                      <label htmlFor="org-logo-upload" className="flex items-center justify-center gap-2 px-4 bg-muted/30 border h-12 rounded-xl cursor-pointer hover:bg-muted/50 transition-colors flex-1">
                        <span className="text-xs sm:text-[10px] font-medium text-muted-foreground truncate">
                          {orgLogo ? orgLogo.name : (orgLogoPreview ? "Change Logo" : "Upload")}
                        </span>
                      </label>
                      <input id="org-logo-upload" type="file" className="hidden" accept="image/*" onChange={handleOrgLogoChange} />
                    </div>
                  </div>
                </div>

                <div className="space-y-1 sm:space-y-1.5">
                  <Label htmlFor="institutionAddress" className="text-xs sm:text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">Institution Address</Label>
                  <Input
                    id="institutionAddress"
                    placeholder="Full physical address"
                    className="h-12 rounded-xl focus-visible:ring-primary/20"
                    value={orgForm.address}
                    onChange={(e) => setOrgForm({ ...orgForm, address: e.target.value })}
                  />
                </div>
              </div>
            </div>

            <hr className="border-border/50" />

            {/* Part 2: Admin & Billing Details */}
            <div className="space-y-3">
              <div className="space-y-0.5 sm:space-y-1">
                <h3 className="text-base font-semibold text-foreground">Admin & Billing Details</h3>
                <p className="text-muted-foreground text-[11px]">Technical contact person and tax details.</p>
              </div>

              <div className="space-y-3 sm:space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <div className="space-y-1 sm:space-y-1.5">
                    <Label htmlFor="pocName" className="text-xs sm:text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">Technical POC Name</Label>
                    <Input
                      id="pocName"
                      placeholder="POC Name"
                      className="h-12 rounded-xl focus-visible:ring-primary/20"
                      value={orgForm.tech_poc_name}
                      onChange={(e) => setOrgForm({ ...orgForm, tech_poc_name: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1 sm:space-y-1.5">
                    <Label htmlFor="pocMobile" className="text-xs sm:text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">Technical POC Mobile</Label>
                    <Input
                      id="pocMobile"
                      placeholder="POC Mobile"
                      className="h-12 rounded-xl focus-visible:ring-primary/20"
                      value={orgForm.tech_poc_mobile}
                      onChange={(e) => setOrgForm({ ...orgForm, tech_poc_mobile: e.target.value })}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <div className="space-y-1 sm:space-y-1.5">
                    <Label htmlFor="pocEmail" className="text-xs sm:text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">Technical POC Email</Label>
                    <Input
                      id="pocEmail"
                      type="email"
                      placeholder="poc@email.com"
                      className="h-12 rounded-xl focus-visible:ring-primary/20"
                      value={orgForm.tech_poc_email}
                      onChange={(e) => setOrgForm({ ...orgForm, tech_poc_email: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1 sm:space-y-1.5">
                    <Label htmlFor="taxId" className="text-xs sm:text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">Tax ID / GSTIN</Label>
                    <Input
                      id="taxId"
                      placeholder="GSTIN/PAN"
                      className="h-12 rounded-xl focus-visible:ring-primary/20"
                      value={orgForm.tax_id}
                      onChange={(e) => setOrgForm({ ...orgForm, tax_id: e.target.value })}
                    />
                  </div>
                </div>

                <div className="space-y-1 sm:space-y-1.5">
                  <Label htmlFor="billingAddress" className="text-xs sm:text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">Billing Address</Label>
                  <Textarea
                    id="billingAddress"
                    placeholder="Address for invoice generation"
                    className="min-h-16 rounded-xl resize-none focus-visible:ring-primary/20"
                    value={orgForm.billing_address}
                    onChange={(e) => setOrgForm({ ...orgForm, billing_address: e.target.value })}
                  />
                </div>
              </div>
            </div>
          </div>

          <DialogFooter className="flex flex-col-reverse sm:flex-row gap-2 pt-3 border-t">
            <Button variant="outline" className="w-full sm:w-auto" onClick={() => setShowEditOrg(false)}>Cancel</Button>
            <Button className="w-full sm:w-auto" onClick={handleSaveOrgDetails} disabled={savingOrg}>
              {savingOrg ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...</> : 'Save Details'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <UpgradePlanDialog
        isOpen={isUpgradeOpen}
        onClose={() => setIsUpgradeOpen(false)}
        orgName={org?.name}
        currentPlan={org?.plan_type}
        onSuccess={() => window.location.reload()}
        isRenewal={false}
        activeStudentsCount={org?.active_student_count || 0}
        currentMaxStudents={org?.max_students || 500}
        baseCapacity={org?.base_capacity || 500}
        bufferStudents={org?.buffer_students || 0}
      />
      {isCapacityUpgradeOpen && (
        <IncreaseCapacityDialog
          currentPlan={org?.plan_type || 'basic'}
          orgName={org?.name || 'Organization'}
          currentMaxStudents={org?.max_students || 500}
          activeStudentsCount={org?.active_student_count || 0}
          expiryDate={org?.subscription_expires_at}
          onClose={() => setIsCapacityUpgradeOpen(false)}
        />
      )}
      {isTierUpgradeOpen && (
        <UpgradeTierDialog
          onClose={() => setIsTierUpgradeOpen(false)}
          currentPlan={org?.plan_type || 'basic'}
          orgName={org?.name || ''}
          currentMaxStudents={org?.max_students || 500}
          activeStudentsCount={org?.active_student_count || 0}
          expiryDate={org?.subscription_expires_at}
          currentBillingCycle={org?.billing_cycle || 'Yearly'}
        />
      )}
    </div>
  );
};

export default BillingManagement;
