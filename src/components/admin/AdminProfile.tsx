import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { cn } from "@/lib/utils";
import { manageAdminProfile } from "../../utils/admin_api";
import { Textarea } from "../ui/textarea";
import { useTheme } from "../../context/ThemeContext";
import { showSuccessAlert, showErrorAlert } from "../../utils/sweetalert";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "../ui/dialog";
import { Eye, EyeOff, CreditCard, Calendar, Activity, CheckCircle2, Clock, ShieldCheck, Loader2, Download } from "lucide-react";
import { fetchWithTokenRefresh } from "../../utils/authService";
import { API_ENDPOINT } from "../../utils/config";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../ui/table";
import { Badge } from "../ui/badge";
import { format } from "date-fns";
import UpgradePlanDialog from "../common/UpgradePlanDialog";
import { ScrollArea } from "../ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { Skeleton, SkeletonForm } from "../ui/skeleton";

interface AdminProfileProps {
  user: any;
  setError?: (error: string | null) => void;
}

interface ProfileData {
  first_name: string;
  last_name: string;
  email: string;
  mobile_number: string;
  address: string;
  bio: string;
}

const AdminProfile = ({ user: propUser, setError }: AdminProfileProps) => {
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<ProfileData>({
    first_name: "",
    last_name: "",
    email: "",
    mobile_number: "",
    address: "",
    bio: "",
  });
  const [localError, setLocalError] = useState<string | null>(null);
  const [localErrors, setLocalErrors] = useState<Record<string, string>>({});
  const [fetchedUser, setFetchedUser] = useState<any>(null);
  const [originalProfile, setOriginalProfile] = useState<ProfileData | null>(null);
  const { theme } = useTheme();

  // Change password states
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [passwordData, setPasswordData] = useState({ current_password: "", new_password: "", confirm_password: "" });
  const [showPasswords, setShowPasswords] = useState({ current: false, next: false, confirm: false });
  const passwordDialogContentRef = useRef<HTMLDivElement | null>(null);

  // Tabs: details (Personal + Contact), other (Address + Bio), subscription (Plan Details)
  const [activeTab, setActiveTab] = useState<'details' | 'other' | 'subscription' | 'support'>('details');
  const [subscriptionData, setSubscriptionData] = useState<any>(null);
  const [subLoading, setSubLoading] = useState(false);
  const [isUpgradeOpen, setIsUpgradeOpen] = useState(false);

  const [tickets, setTickets] = useState<any[]>([]);
  const [loadingTickets, setLoadingTickets] = useState(false);
  const [showTicketModal, setShowTicketModal] = useState(false);
  const [viewTicket, setViewTicket] = useState<any>(null);
  const [ticketForm, setTicketForm] = useState({ subject: '', description: '', priority: 'Medium' });
  const [downloadingId, setDownloadingId] = useState<number | null>(null);

  useEffect(() => {
    const fetchProfile = async () => {
      let currentUser = propUser;
      if (!currentUser || !currentUser.user_id) {
        try {
          const userData = localStorage.getItem('user');
          if (userData) {
            const parsed = JSON.parse(userData);
            if (parsed.user_id) {
              currentUser = { user_id: parsed.user_id, username: parsed.username || parsed.first_name || '', email: parsed.email || '', role: parsed.role || 'principal' };
              setFetchedUser(currentUser);
            }
          }
        } catch (e) {
          console.error('User load error', e);
        }
      }

      if (!currentUser || !currentUser.user_id) {
        setLocalError('No user');
        setLoading(false);
        return;
      }

      setLoading(true);
      setLocalError(null);
      if (setError) setError(null);

      try {
        const response = await manageAdminProfile({ user_id: currentUser.user_id }, 'GET');
        if (response.success && response.profile) {
          const profileData = {
            first_name: response.profile.first_name || '',
            last_name: response.profile.last_name || '',
            email: response.profile.email || '',
            mobile_number: response.profile.mobile_number || '',
            address: response.profile.address || '',
            bio: response.profile.bio || '',
          };
          setProfile(profileData);
          setOriginalProfile(profileData);
        } else {
          setLocalError(response.message || 'Failed to fetch profile');
          showErrorAlert('Error', response.message || 'Failed to fetch profile');
          if (response.message === 'Admin profile not found. Please create a profile.') {
            setEditing(true);
            setProfile({
              first_name: (currentUser.username || '').split(' ')[0] || '',
              last_name: (currentUser.username || '').split(' ')[1] || '',
              email: currentUser.email || '',
              mobile_number: '',
              address: '',
              bio: '',
            });
          }
        }
      } catch (err) {
        console.error('Fetch Profile Error:', err);
        setLocalError('Network error');
        showErrorAlert('Error', 'Network error');
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [propUser, setError]);

  const fetchSubscriptionDetails = async () => {
    setSubLoading(true);
    try {
      const response = await fetchWithTokenRefresh(`${API_ENDPOINT}/admin/subscription-details/`);
      const result = await response.json();
      if (result.success) {
        setSubscriptionData(result.data);
      } else {
        console.error('Failed to fetch subscription details', result.message);
      }
    } catch (err) {
      console.error('Network error fetching subscription details', err);
    } finally {
      setSubLoading(false);
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
        
        // Use PDF as default extension, but respect content-type if it's HTML fallback
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
      console.error('Download receipt error', err);
      showErrorAlert('Error', 'Network error while downloading receipt');
    } finally {
      setDownloadingId(null);
    }
  };

  useEffect(() => {
    if (activeTab === 'subscription' && !subscriptionData) {
      fetchSubscriptionDetails();
    }
    if (activeTab === 'support') {
      fetchTickets();
    }
  }, [activeTab]);

  const fetchTickets = async () => {
    setLoadingTickets(true);
    try {
      const response = await fetchWithTokenRefresh(`${API_ENDPOINT}/admin/support-tickets/`);
      const res = await response.json();
      if (res.tickets) setTickets(res.tickets);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingTickets(false);
    }
  };

  const handleRaiseTicket = async () => {
    if (!ticketForm.subject || !ticketForm.description) return showErrorAlert('Error', 'Subject and description are required');
    try {
      const response = await fetchWithTokenRefresh(`${API_ENDPOINT}/admin/support-tickets/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(ticketForm)
      });
      const res = await response.json();
      if (res.success) {
        showSuccessAlert('Ticket raised', res.message);
        setShowTicketModal(false);
        setTicketForm({ subject: '', description: '', priority: 'Medium' });
        // Add the new ticket to the start of the list without triggering a GET request
        if (res.ticket) {
          setTickets(prev => [res.ticket, ...prev]);
        }
      } else {
        showErrorAlert('Error', res.error || 'Failed to raise ticket');
      }
    } catch (e) {
      showErrorAlert('Error', 'Network error');
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target as HTMLInputElement;
    let newValue = value;
    let errorMessage = '';

    if (name === 'first_name' || name === 'last_name') {
      if (newValue.length > 50) errorMessage = 'Max 50 characters';
    }
    if (name === 'email') {
      if (newValue && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(newValue)) errorMessage = 'Invalid email';
    }
    if (name === 'mobile_number') {
      newValue = newValue.replace(/[^0-9]/g, '').slice(0, 10);
      if (newValue && newValue.length !== 10) errorMessage = 'Enter 10 digits';
    }
    if (name === 'bio' || name === 'address') {
      if (newValue.length > 300) errorMessage = 'Too long';
    }

    setProfile((p) => ({ ...p, [name]: newValue }));
    setLocalErrors((errs) => ({ ...errs, [name]: errorMessage }));
  };

  const validateProfile = () => {
    const errs: Record<string, string> = {};
    if (!profile.first_name || profile.first_name.trim().length < 1) errs.first_name = 'First name required';
    if (!profile.last_name || profile.last_name.trim().length < 1) errs.last_name = 'Last name required';
    if (profile.email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(profile.email)) errs.email = 'Invalid email';
    if (profile.mobile_number && profile.mobile_number.length !== 10) errs.mobile_number = 'Enter 10 digits';
    setLocalErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSaveProfile = async () => {
    if (!validateProfile()) return;
    setLoading(true);
    setLocalError(null);
    if (setError) setError(null);

    try {
      const currentUser = fetchedUser || propUser;
      if (!currentUser || !currentUser.user_id) {
        setLocalError('User data unavailable for update');
        showErrorAlert('Error', 'User data unavailable for update');
        setLoading(false);
        return;
      }

      const updates = { ...profile };
      const data = { user_id: currentUser.user_id, action: 'edit', updates };
      const response = await manageAdminProfile(data, 'POST');

      if (response.success) {
        showSuccessAlert('Success', 'Profile saved successfully');
        if (response.profile) {
          const profileData = {
            first_name: response.profile.first_name || '',
            last_name: response.profile.last_name || '',
            email: response.profile.email || '',
            mobile_number: response.profile.mobile_number || '',
            address: response.profile.address || '',
            bio: response.profile.bio || '',
          };
          setProfile(profileData);
          setOriginalProfile(profileData);
          localStorage.setItem('user', JSON.stringify({
            ...JSON.parse(localStorage.getItem('user') || '{}'),
            ...response.profile,
            user_id: currentUser.user_id,
          }));
        }
        setEditing(false);
        setLocalErrors({});
      } else {
        const message = response.message || 'Failed to save profile';
        if (setError) setError(message);
        setLocalError(message);
        showErrorAlert('Error', message);
      }
    } catch (err: any) {
      console.error('Save Profile Error:', err);
      const message = err?.message || 'Network error';
      if (setError) setError(message);
      setLocalError(message);
      showErrorAlert('Error', message);
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async () => {
    if (!passwordData.current_password || !passwordData.new_password || !passwordData.confirm_password) {
      showErrorAlert('Missing fields', 'Please fill in current, new and confirm password fields.');
      return;
    }
    if (passwordData.new_password !== passwordData.confirm_password) {
      showErrorAlert('Password mismatch', "New passwords don't match");
      return;
    }
    if (passwordData.current_password === passwordData.new_password) {
      showErrorAlert('Invalid new password', 'Current password and new password cannot be the same.');
      return;
    }

    try {
      const response = await fetchWithTokenRefresh(`${API_ENDPOINT}/profile/change-password/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          current_password: passwordData.current_password,
          new_password: passwordData.new_password,
          confirm_password: passwordData.confirm_password,
        }),
      });
      const result = await response.json();
      if (result.success) {
        setShowPasswordDialog(false);
        setPasswordData({ current_password: '', new_password: '', confirm_password: '' });
        showSuccessAlert('Password changed', 'Your password has been updated successfully.');
      } else {
        showErrorAlert('Unable to change password', result.message || 'Failed to change password');
      }
    } catch (err) {
      console.error('Error changing password:', err);
      showErrorAlert('Unable to change password', 'Failed to change password');
    }
  };

  const renderTabContent = () => {
    if (activeTab === 'details') {
      return (
        <div className="space-y-6">
          {/* Personal */}
          <div className="space-y-4 sm:space-y-5 md:space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 md:gap-5 lg:gap-6">
              <div className="w-full">
                <label className={`block text-xs sm:text-sm mb-1.5 sm:mb-2 font-semibold ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>First Name</label>
                <Input value={profile.first_name} name="first_name" onChange={handleChange} disabled={!editing} placeholder="First name" className="text-xs sm:text-sm h-8 sm:h-9 md:h-10 w-full disabled:opacity-80 disabled:placeholder-opacity-80" />
                {localErrors.first_name && <p className={`text-xs mt-1 sm:mt-1.5 ${theme === 'dark' ? 'text-destructive' : 'text-red-500'}`}>{localErrors.first_name}</p>}
              </div>
              <div className="w-full">
                <label className={`block text-xs sm:text-sm mb-1.5 sm:mb-2 font-semibold ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>Last Name</label>
                <Input value={profile.last_name} name="last_name" onChange={handleChange} disabled={!editing} placeholder="Last name" className="text-xs sm:text-sm h-8 sm:h-9 md:h-10 w-full disabled:opacity-80 disabled:placeholder-opacity-80" />
                {localErrors.last_name && <p className={`text-xs mt-1 sm:mt-1.5 ${theme === 'dark' ? 'text-destructive' : 'text-red-500'}`}>{localErrors.last_name}</p>}
              </div>
            </div>
          </div>

          {/* Contact */}
          <div className="space-y-4 sm:space-y-5">
            <div>
              <label className={`block text-xs sm:text-sm mb-1.5 sm:mb-2 font-semibold ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>Email</label>
              <Input value={profile.email} name="email" onChange={handleChange} disabled={!editing} placeholder="Email address" className="text-xs sm:text-sm h-8 sm:h-10 w-full disabled:opacity-80 disabled:placeholder-opacity-80" />
              {localErrors.email && <p className={`text-xs mt-1 sm:mt-1.5 ${theme === 'dark' ? 'text-destructive' : 'text-red-500'}`}>{localErrors.email}</p>}
            </div>

            <div>
              <label className={`block text-xs sm:text-sm mb-1.5 sm:mb-2 font-semibold ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>Mobile</label>
              <Input value={profile.mobile_number} name="mobile_number" onChange={handleChange} disabled={!editing} maxLength={10} placeholder="10-digit mobile" className="text-xs sm:text-sm h-8 sm:h-10 w-full disabled:opacity-80 disabled:placeholder-opacity-80" />
              {localErrors.mobile_number && <p className={`text-xs mt-1 sm:mt-1.5 ${theme === 'dark' ? 'text-destructive' : 'text-red-500'}`}>{localErrors.mobile_number}</p>}
            </div>
          </div>
        </div>
      );
    }

    if (activeTab === 'subscription') {
      if (subLoading) return (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Skeleton className="h-24 w-full rounded-xl" />
            <Skeleton className="h-24 w-full rounded-xl" />
            <Skeleton className="h-24 w-full rounded-xl" />
          </div>
          <Skeleton className="h-48 w-full rounded-xl" />
        </div>
      );
      if (!subscriptionData) return <div className="text-center py-10 text-muted-foreground">No subscription data found.</div>;

      return (
        <div className="space-y-8 animate-in fade-in duration-500">
          {/* Plan Overview Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className={cn("border-none shadow-sm", theme === 'dark' ? 'bg-zinc-900' : 'bg-white')}>
              <CardContent className="p-4 flex items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center text-purple-600">
                    <ShieldCheck size={24} />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground font-medium">Current Plan</p>
                    <p className="text-lg font-bold text-primary uppercase tracking-tight">{subscriptionData.plan_name}</p>
                  </div>
                </div>
                {subscriptionData.plan_name.toLowerCase() !== 'advance' && (
                  <Button
                    size="sm"
                    className="bg-primary hover:bg-primary/90 text-white text-xs h-8 px-3 rounded-lg"
                    onClick={() => setIsUpgradeOpen(true)}
                  >
                    Upgrade Plan
                  </Button>
                )}
              </CardContent>
            </Card>

            <Card className={cn("border-none shadow-sm", theme === 'dark' ? 'bg-zinc-900' : 'bg-white')}>
              <CardContent className="p-4 flex items-center gap-4">
                <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center",
                  subscriptionData.is_active ? "bg-green-100 text-green-600 dark:bg-green-900/30" : "bg-red-100 text-red-600 dark:bg-red-900/30")}>
                  <Activity size={24} />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground font-medium">Status</p>
                  <Badge variant={subscriptionData.is_active ? "default" : "destructive"} className="mt-0.5">
                    {subscriptionData.is_active ? "Active" : "Inactive"}
                  </Badge>
                </div>
              </CardContent>
            </Card>

            <Card className={cn("border-none shadow-sm", theme === 'dark' ? 'bg-zinc-900' : 'bg-white')}>
              <CardContent className="p-4 flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600">
                  <Calendar size={24} />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground font-medium">Expiry Date</p>
                  <p className="text-sm font-semibold">
                    {subscriptionData.subscription_expires_at
                      ? format(new Date(subscriptionData.subscription_expires_at), 'dd MMM yyyy')
                      : subscriptionData.trial_ends_at
                        ? format(new Date(subscriptionData.trial_ends_at), 'dd MMM yyyy HH:mm')
                        : 'Lifetime Access'}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Payment History */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 px-1">
              <CreditCard size={18} className="text-primary" />
              <h3 className="font-bold text-base">Payment History</h3>
            </div>

            <div className="rounded-xl border overflow-hidden custom-scrollbar">
              <Table>
                <TableHeader className={theme === 'dark' ? 'bg-zinc-900/50' : 'bg-gray-50'}>
                  <TableRow>
                    <TableHead className="w-[180px]">Date</TableHead>
                    <TableHead>Plan</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Transaction ID</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {subscriptionData.payments && subscriptionData.payments.length > 0 ? (
                    subscriptionData.payments.map((p: any) => (
                      <TableRow key={p.id}>
                        <TableCell className="font-medium text-xs sm:text-sm whitespace-nowrap">
                          {format(new Date(p.date), 'dd MMM yyyy')}
                        </TableCell>
                        <TableCell className="uppercase text-xs font-semibold text-muted-foreground">
                          {p.plan_type}
                        </TableCell>
                        <TableCell className="font-bold">
                          ₹{p.amount.toLocaleString()}
                        </TableCell>
                        <TableCell className="text-xs font-mono text-muted-foreground">
                          {p.transaction_id}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800">
                            {p.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0"
                            onClick={() => handleDownloadReceipt(p.id)}
                            disabled={downloadingId === p.id}
                            title="Download Receipt"
                          >
                            {downloadingId === p.id ? (
                              <Loader2 size={14} className="text-primary animate-spin" />
                            ) : (
                              <Download size={14} className="text-primary" />
                            )}
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-10 text-muted-foreground">
                        No payment records found.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </div>
      );
    }

    if (activeTab === 'support') {
      return (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-lg font-bold">Support Tickets</h3>
              <p className="text-sm text-muted-foreground">Raise and track issues with Super Admin HQ.</p>
            </div>
            <Dialog open={showTicketModal} onOpenChange={setShowTicketModal}>
              <DialogTrigger asChild>
                <Button className="bg-primary text-white">Raise Ticket</Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                  <DialogTitle>Raise Support Ticket</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 pt-4">
                  <div>
                    <Label>Subject</Label>
                    <Input value={ticketForm.subject} onChange={e => setTicketForm({ ...ticketForm, subject: e.target.value })} placeholder="Brief summary of the issue" />
                  </div>
                  <div>
                    <Label>Priority</Label>
                    <Select
                      value={ticketForm.priority}
                      onValueChange={value => setTicketForm({ ...ticketForm, priority: value })}
                    >
                      <SelectTrigger className="w-full">
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
                  <div>
                    <Label>Description</Label>
                    <div className="h-20 rounded-md border border-input bg-background overflow-hidden focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2">
                      <Textarea
                        value={ticketForm.description}
                        onChange={e => setTicketForm({ ...ticketForm, description: e.target.value })}
                        placeholder="Detailed description..."
                        className="h-full w-full resize-none border-none focus-visible:ring-0 shadow-none custom-scrollbar"
                      />
                    </div>
                  </div>
                  <Button className="w-full" onClick={handleRaiseTicket} disabled={loadingTickets}>
                    {loadingTickets ? 'Submitting...' : 'Submit Ticket'}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>

            <Dialog open={!!viewTicket} onOpenChange={(open) => !open && setViewTicket(null)}>
              <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                  <DialogTitle>Ticket Details</DialogTitle>
                </DialogHeader>
                {viewTicket && (
                  <div className="space-y-4 pt-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="text-[10px] uppercase text-muted-foreground">Status</Label>
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
                        <Label className="text-[10px] uppercase text-muted-foreground">Priority</Label>
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
                      <Label className="text-[10px] uppercase text-muted-foreground">Subject</Label>
                      <p className="mt-1 font-semibold">{viewTicket.subject}</p>
                    </div>
                    <div>
                      <Label className="text-[10px] uppercase text-muted-foreground">Description</Label>
                      <ScrollArea className="h-32 mt-1 rounded-md border p-3 bg-muted/20">
                        <p className="text-sm whitespace-pre-wrap">{viewTicket.description}</p>
                      </ScrollArea>
                    </div>
                    {viewTicket.response && (
                      <div>
                        <Label className="text-[10px] uppercase text-muted-foreground">HQ Response</Label>
                        <div className="mt-1 p-3 rounded-md bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-100 dark:border-emerald-800/20">
                          <p className="text-sm italic">{viewTicket.response}</p>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </DialogContent>
            </Dialog>
          </div>

          <div className="rounded-md border bg-card shadow-sm overflow-hidden">
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow>
                  <TableHead>Ticket ID</TableHead>
                  <TableHead>Subject</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loadingTickets ? <TableRow><TableCell colSpan={6} className="text-center h-24">Loading tickets...</TableCell></TableRow> :
                  tickets.length === 0 ? <TableRow><TableCell colSpan={6} className="text-center h-24 text-muted-foreground">No support tickets found.</TableCell></TableRow> :
                    tickets.map(t => (
                      <TableRow key={t.id}>
                        <TableCell className="font-medium">{t.id}</TableCell>
                        <TableCell className="font-medium">{t.subject}</TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 px-2 flex items-center gap-1.5 text-primary hover:text-primary hover:bg-primary/10 transition-colors"
                            onClick={() => setViewTicket(t)}
                          >
                            <Eye size={14} />
                            View
                          </Button>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={
                            t.priority === 'Critical' ? 'border-red-500 text-red-600 bg-red-50 dark:bg-red-900/10' :
                              t.priority === 'High' ? 'border-orange-500 text-orange-600 bg-orange-50 dark:bg-orange-900/10' :
                                'border-blue-500 text-blue-600 bg-blue-50 dark:bg-blue-900/10'
                          }>{t.priority}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge className={
                            t.status === 'Resolved' ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200 border-emerald-200' :
                              t.status === 'Closed' ? 'bg-gray-100 text-gray-600 hover:bg-gray-200 border-gray-300' :
                                t.status === 'Pending' ? 'bg-amber-100 text-amber-800 hover:bg-amber-200 border-amber-200' :
                                  'bg-blue-100 text-blue-800 hover:bg-blue-200 border-blue-200'
                          } variant="outline">
                            {t.status}
                          </Badge>
                        </TableCell>
                        <TableCell>{t.date}</TableCell>
                      </TableRow>
                    ))}
              </TableBody>
            </Table>
          </div>
        </div>
      );
    }

    // other tab: Address + Bio
    return (
      <div className="space-y-6">
        <div>
          <label className={`block text-xs sm:text-sm mb-1.5 sm:mb-2 font-semibold ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>Address</label>
          <Textarea value={profile.address} name="address" onChange={handleChange} disabled={!editing} placeholder="Address" rows={3} className="text-xs sm:text-sm w-full disabled:opacity-80 disabled:placeholder-opacity-80" />
          {localErrors.address && <p className={`text-xs mt-1 sm:mt-1.5 ${theme === 'dark' ? 'text-destructive' : 'text-red-500'}`}>{localErrors.address}</p>}
        </div>

        <div>
          <label className={`block text-xs sm:text-sm mb-1.5 sm:mb-2 font-semibold ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>Bio</label>
          <Textarea value={profile.bio} name="bio" onChange={handleChange} disabled={!editing} placeholder="Tell us about yourself" rows={4} className="text-xs sm:text-sm w-full disabled:opacity-80 disabled:placeholder-opacity-80" />
          {localErrors.bio && <p className={`text-xs mt-1 sm:mt-1.5 ${theme === 'dark' ? 'text-destructive' : 'text-red-500'}`}>{localErrors.bio}</p>}
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="w-full max-w-none mx-auto my-2 sm:my-4 md:my-6 px-2 sm:px-4 md:px-6 py-2 sm:py-4 md:py-6">
        <SkeletonForm fields={6} />
      </div>
    );
  }

  return (
    <div className={`flex justify-center items-start ${theme === 'dark' ? 'bg-background' : 'bg-gray-50'}`}>
      <Card className={`w-full max-w-none mx-auto my-2  ${theme === 'dark' ? 'bg-card text-foreground' : 'bg-white text-gray-900'}`}>
        <CardHeader className="px-2 sm:px-3 md:px-4 lg:px-6 py-3 sm:py-4 md:py-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 border-b">
          <div className="flex-1 min-w-0">
            <CardTitle className={`${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>Profile Information</CardTitle>
            <p className={`text-xs sm:text-sm mt-1 ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}`}>View and update your personal information</p>
          </div>

          <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap ml-auto">
            {editing && (
              <Button 
                size="sm" 
                variant="ghost" 
                onClick={() => { 
                  if (originalProfile) setProfile(originalProfile);
                  setEditing(false); 
                  setLocalErrors({});
                }}
              >
                Cancel
              </Button>
            )}

            <Button
              size="sm"
              onClick={() => { if (editing) handleSaveProfile(); else setEditing(true); }}
              variant="outline"
              className="text-white bg-primary border-primary hover:bg-primary/90 hover:border-primary/90 hover:text-white"
              disabled={loading}
            >
              {editing ? (loading ? 'Saving...' : 'Save') : 'Edit Profile'}
            </Button>

            <Dialog open={showPasswordDialog} onOpenChange={setShowPasswordDialog}>
              <DialogTrigger asChild>
                <Button className="text-xs sm:text-sm px-3 sm:px-4 py-1.5 sm:py-2 h-9 bg-primary text-white border-primary hover:bg-primary/90">Change Password</Button>
              </DialogTrigger>
              <DialogContent ref={passwordDialogContentRef} className="w-[calc(100vw-1.5rem)] sm:w-full max-w-[420px] rounded-xl sm:rounded-2xl">
                <DialogHeader>
                  <DialogTitle>Change Password</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="current_password">Current Password</Label>
                    <div className="relative">
                      <Input
                        id="current_password"
                        type={showPasswords.current ? 'text' : 'password'}
                        value={passwordData.current_password}
                        onChange={(e) => setPasswordData({ ...passwordData, current_password: e.target.value })}
                        className="pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPasswords((prev) => ({ ...prev, current: !prev.current }))}
                        className="absolute inset-y-0 right-0 flex items-center px-3 text-muted-foreground hover:text-foreground"
                        aria-label={showPasswords.current ? 'Hide current password' : 'Show current password'}
                      >
                        {showPasswords.current ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="new_password">New Password</Label>
                    <div className="relative">
                      <Input
                        id="new_password"
                        type={showPasswords.next ? 'text' : 'password'}
                        value={passwordData.new_password}
                        onChange={(e) => setPasswordData({ ...passwordData, new_password: e.target.value })}
                        className="pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPasswords((prev) => ({ ...prev, next: !prev.next }))}
                        className="absolute inset-y-0 right-0 flex items-center px-3 text-muted-foreground hover:text-foreground"
                        aria-label={showPasswords.next ? 'Hide new password' : 'Show new password'}
                      >
                        {showPasswords.next ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="confirm_password">Confirm New Password</Label>
                    <div className="relative">
                      <Input
                        id="confirm_password"
                        type={showPasswords.confirm ? 'text' : 'password'}
                        value={passwordData.confirm_password}
                        onChange={(e) => setPasswordData({ ...passwordData, confirm_password: e.target.value })}
                        className="pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPasswords((prev) => ({ ...prev, confirm: !prev.confirm }))}
                        className="absolute inset-y-0 right-0 flex items-center px-3 text-muted-foreground hover:text-foreground"
                        aria-label={showPasswords.confirm ? 'Hide confirm password' : 'Show confirm password'}
                      >
                        {showPasswords.confirm ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                  <div className="flex justify-end space-x-2">
                    <Button variant="outline" onClick={() => setShowPasswordDialog(false)}>Cancel</Button>
                    <Button className="font-medium bg-primary text-white border-primary hover:bg-primary/90 hover:border-primary/90" onClick={handleChangePassword}>Change Password</Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>

        <CardContent className="px-6 pb-6 pt-2 space-y-8">
          {localError && <div className="text-red-500 text-center">{localError}</div>}

          <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-5 md:gap-6 lg:gap-8 items-start">
            <div className="col-span-1 flex flex-col items-center">
              <div className={`w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-primary text-white flex items-center justify-center text-lg sm:text-2xl font-semibold mb-3 sm:mb-4 mt-4 flex-shrink-0`}>
                {(profile.first_name && profile.first_name[0]) || ''}{(profile.last_name && profile.last_name[0]) || ''}
              </div>

              <div className="text-base sm:text-lg font-semibold text-center mb-1">{profile.first_name} {profile.last_name}</div>
              <div className={`text-xs sm:text-sm mb-4 sm:mb-2 text-center ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}`}>Principal</div>

              <div className="w-full mt-4 sm:mt-6 flex flex-col">
                <h4 className={`text-xs sm:text-sm font-bold mb-2.5 sm:mb-4 ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>Quick Info</h4>
                <div className={`border rounded-lg p-2.5 sm:p-4 ${theme === 'dark' ? 'bg-card border-input' : 'bg-gray-50 border-gray-200'}`}>
                  <div className="grid grid-cols-1 gap-2.5 sm:gap-3.5">
                    <div className="flex flex-col justify-start">
                      <span className={`text-xs font-semibold mb-1 ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>Email</span>
                      <span className={`text-xs sm:text-sm break-words px-2 sm:px-2.5 py-1 sm:py-1.5 rounded-2xl line-clamp-2 ${theme === 'dark' ? 'bg-accent text-foreground' : 'bg-purple-100 text-purple-700'}`}>{profile.email || '—'}</span>
                    </div>
                    <div className="flex flex-col justify-start">
                      <span className={`text-xs font-semibold mb-1 ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>Mobile</span>
                      <span className={`text-xs sm:text-sm break-words px-2 sm:px-2.5 py-1 sm:py-1.5 rounded-2xl line-clamp-2 ${theme === 'dark' ? 'bg-accent text-foreground' : 'bg-purple-100 text-purple-700'}`}>{profile.mobile_number || '—'}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="col-span-1 sm:col-span-2 lg:col-span-3 w-full flex flex-col h-full">
              <div className="flex items-center gap-2 mb-3 sm:mb-4 md:mb-5 lg:mb-6 border-b pb-2 sm:pb-3">
                <button onClick={() => setActiveTab('details')} className={`px-3 py-1.5 text-xs sm:text-sm rounded-md transition-colors font-medium ${activeTab === 'details' ? 'bg-primary text-white' : theme === 'dark' ? 'text-muted-foreground hover:text-foreground' : 'text-gray-600 hover:text-gray-900'}`}>Details</button>
                <button onClick={() => setActiveTab('other')} className={`px-3 py-1.5 text-xs sm:text-sm rounded-md transition-colors font-medium ${activeTab === 'other' ? 'bg-primary text-white' : theme === 'dark' ? 'text-muted-foreground hover:text-foreground' : 'text-gray-600 hover:text-gray-900'}`}>Other</button>
                <button onClick={() => setActiveTab('subscription')} className={`px-3 py-1.5 text-xs sm:text-sm rounded-md transition-colors font-medium ${activeTab === 'subscription' ? 'bg-primary text-white' : theme === 'dark' ? 'text-muted-foreground hover:text-foreground' : 'text-gray-600 hover:text-gray-900'}`}>Plan Details</button>
                <button onClick={() => setActiveTab('support')} className={`px-3 py-1.5 text-xs sm:text-sm rounded-md transition-colors font-medium ${activeTab === 'support' ? 'bg-primary text-white' : theme === 'dark' ? 'text-muted-foreground hover:text-foreground' : 'text-gray-600 hover:text-gray-900'}`}>Support Tickets</button>
              </div>

              <div className={`p-3 sm:p-4 md:p-5 lg:p-6 rounded-lg border flex-1 ${theme === 'dark' ? 'bg-card border-input' : 'bg-gray-50 border-gray-200'}`}>
                {renderTabContent()}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <UpgradePlanDialog
        isOpen={isUpgradeOpen}
        onClose={() => setIsUpgradeOpen(false)}
        orgName={localStorage.getItem("org_name") || "Your Institution"}
        currentPlan={subscriptionData?.plan_name || "basic"}
        onSuccess={() => fetchSubscriptionDetails()}
      />
    </div>
  );
};

export default AdminProfile;
