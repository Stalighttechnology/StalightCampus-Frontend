import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Mail, Send, AlertCircle, Search, Eye, ChevronLeft, ChevronRight, 
  Clock, CheckCircle2, Building, Calendar as CalendarIcon, CreditCard, RefreshCw 
} from "lucide-react";
import { format, parse, isValid } from "date-fns";

// Shadcn UI Components
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Textarea } from "../../components/ui/textarea";
import { Label } from "../../components/ui/label";
import { Badge } from "../../components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "../../components/ui/popover";
import { Calendar } from "../../components/ui/calendar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "../../components/ui/dialog";

import { API_ENDPOINT } from "../../utils/config";
import { fetchWithSuperadminTokenRefresh } from "../../utils/authService";
import { showSuccessAlert, showErrorAlert } from "../../utils/sweetalert";
import { cn } from "../../lib/utils";

const MAX_EMAILS = 20;

const DEFAULT_PAYMENT_DETAILS = `Bank Name: HDFC Bank
Beneficiary Name: Stalight Technologies Private Limited
Account Number: 50200088991122
IFSC Code: HDFC0001234
Account Type: Current Account`;

interface HistoryItem {
  id: number;
  subject: string;
  template: string;
  total_sent: number;
  total_failed: number;
  successful_emails: string[];
  failed_emails: string[];
  sent_at: string;
  sent_by: string;
}

interface OrgOption {
  id: number;
  name: string;
  domain: string;
  plan_type: string;
  admin_email: string;
  tech_poc_email: string;
  is_active: boolean;
}

const BulkEmailer = () => {
  const [emailsText, setEmailsText] = useState("");
  const [subject, setSubject] = useState("Introduction to Stalight Campus");
  const [template, setTemplate] = useState("marketing_demo_invite");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Payment Due specific fields
  const [organizations, setOrganizations] = useState<OrgOption[]>([]);
  const [orgsLoading, setOrgsLoading] = useState(false);
  const [selectedOrgId, setSelectedOrgId] = useState("");
  const [selectedOrgName, setSelectedOrgName] = useState("");
  
  // Date selection state
  const [dueDateObj, setDueDateObj] = useState<Date | undefined>(undefined);
  const [dueDateText, setDueDateText] = useState("");
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);

  const [amountDue, setAmountDue] = useState("");
  const [paymentDetails, setPaymentDetails] = useState(DEFAULT_PAYMENT_DETAILS);

  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("");
  
  const [selectedHistory, setSelectedHistory] = useState<HistoryItem | null>(null);

  const fetchOrganizations = async () => {
    setOrgsLoading(true);
    try {
      const response = await fetchWithSuperadminTokenRefresh(`${API_ENDPOINT}/superadmin/marketing/organizations/`);
      if (response.ok) {
        const data = await response.json();
        setOrganizations(data.organizations || []);
      }
    } catch (err) {
      console.error("Failed to fetch organizations:", err);
    } finally {
      setOrgsLoading(false);
    }
  };

  const fetchHistory = async () => {
    setHistoryLoading(true);
    try {
      const response = await fetchWithSuperadminTokenRefresh(`${API_ENDPOINT}/superadmin/marketing/send-bulk-emails/history/?page=${page}&search=${debouncedSearchQuery}&page_size=10`);
      if (response.ok) {
        const data = await response.json();
        setHistory(data.history);
        setTotalPages(data.total_pages);
      }
    } catch (error) {
      console.error("Failed to fetch history:", error);
    } finally {
      setHistoryLoading(false);
    }
  };

  useEffect(() => {
    fetchOrganizations();
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
      setPage(1); // Reset page on new search query
    }, 500);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    fetchHistory();
  }, [page, debouncedSearchQuery]);

  const handleTemplateChange = (newTemplate: string) => {
    setTemplate(newTemplate);
    setError(null);
    if (newTemplate === "payment_due") {
      if (subject === "Introduction to Stalight Campus" || !subject.trim()) {
        setSubject(selectedOrgName ? `Payment Due Notice - ${selectedOrgName}` : "Payment Due Notice - Stalight Campus Subscription");
      }
      if (organizations.length === 0) {
        fetchOrganizations();
      }
    } else if (newTemplate === "marketing_demo_invite") {
      if (subject.startsWith("Payment Due Notice")) {
        setSubject("Introduction to Stalight Campus");
      }
    }
  };

  const handleOrgChange = (orgIdStr: string) => {
    setSelectedOrgId(orgIdStr);
    const found = organizations.find((o) => String(o.id) === orgIdStr);
    if (found) {
      setSelectedOrgName(found.name);
      if (subject.startsWith("Payment Due Notice") || subject === "Introduction to Stalight Campus") {
        setSubject(`Payment Due Notice - ${found.name}`);
      }
      // Auto prefill recipient email if currently empty
      const targetEmail = found.admin_email || found.tech_poc_email;
      if (targetEmail && !emailsText.trim()) {
        setEmailsText(targetEmail);
      }
    } else {
      setSelectedOrgName("");
    }
  };

  const handleDateSelect = (date: Date | undefined) => {
    setDueDateObj(date);
    if (date) {
      setDueDateText(format(date, "dd/MM/yyyy"));
    } else {
      setDueDateText("");
    }
    setIsCalendarOpen(false);
  };

  const handleDueDateTextChange = (text: string) => {
    setDueDateText(text);
    // Attempt parse if exactly 10 chars (dd/MM/yyyy)
    if (text.length === 10) {
      const parsed = parse(text, "dd/MM/yyyy", new Date());
      if (isValid(parsed)) {
        setDueDateObj(parsed);
        return;
      }
    }
    setDueDateObj(undefined);
  };

  const getSelectedOrg = () => {
    return organizations.find((o) => String(o.id) === selectedOrgId);
  };

  const getValidEmails = (text: string) => {
    return text
      .split(/[\s,]+/)
      .map(e => e.trim())
      .filter(e => e.length > 0);
  };

  const validateEmails = (emails: string[]) => {
    const emailRegex = /^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$/;
    return emails.filter(e => !emailRegex.test(e));
  };

  const handleEmailsChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const text = e.target.value;
    const currentEmails = getValidEmails(text);
    
    if (currentEmails.length > MAX_EMAILS) {
      setError(`You can only enter up to ${MAX_EMAILS} emails.`);
      const truncated = currentEmails.slice(0, MAX_EMAILS).join(", ");
      setEmailsText(truncated);
      return;
    }
    
    setError(null);
    setEmailsText(text);
  };

  const handleSendEmails = async () => {
    setError(null);
    
    const emails = getValidEmails(emailsText);
    
    if (emails.length === 0) {
      setError("Please enter at least one recipient email address.");
      return;
    }

    if (emails.length > MAX_EMAILS) {
      setError(`Maximum ${MAX_EMAILS} emails allowed per request.`);
      return;
    }

    const invalidEmails = validateEmails(emails);
    if (invalidEmails.length > 0) {
      setError(`Invalid email formats found: ${invalidEmails.join(", ")}`);
      return;
    }

    // Additional validations for payment_due template
    if (template === "payment_due") {
      if (!selectedOrgName && !selectedOrgId) {
        setError("Please select the target institution / organization.");
        return;
      }
      if (!dueDateText.trim()) {
        setError("Please select or enter the payment due date (dd/mm/yyyy).");
        return;
      }
      if (!amountDue.trim()) {
        setError("Please enter the amount due to be received.");
        return;
      }
      if (!paymentDetails.trim()) {
        setError("Please enter the inward payment remittance details.");
        return;
      }
    }

    setIsLoading(true);
    try {
      const payload: any = {
        emails,
        subject,
        template,
      };

      if (template === "payment_due") {
        payload.org_id = selectedOrgId ? Number(selectedOrgId) : undefined;
        payload.org_name = selectedOrgName;
        payload.due_date = dueDateText;
        payload.amount_due = amountDue;
        payload.payment_details = paymentDetails;
      }

      const response = await fetchWithSuperadminTokenRefresh(`${API_ENDPOINT}/superadmin/marketing/send-bulk-emails/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || "Failed to send emails");
      }
      
      showSuccessAlert("Success", data.message || `Successfully sent ${emails.length} emails.`);
      setEmailsText("");
      // Refresh history
      setPage(1);
      fetchHistory();
    } catch (err: any) {
      setError(err.message || "Failed to send emails. Please try again.");
      showErrorAlert("Error", err.message || "Failed to send emails.");
    } finally {
      setIsLoading(false);
    }
  };

  const currentEmailCount = getValidEmails(emailsText).length;
  const currentSelectedOrg = getSelectedOrg();

  return (
    <div className="flex-1 p-8 lg:p-10 bg-gray-50 dark:bg-background overflow-y-auto">
      <div className="max-w-5xl mx-auto space-y-8 pb-24">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-foreground tracking-tight">Bulk Emailer</h1>
            <p className="text-gray-500 dark:text-muted-foreground mt-2">
              Send official marketing, demo invites, and payment due notifications to institutions.
            </p>
          </div>
          <div className="p-3 bg-primary/10 rounded-xl text-primary">
            <Mail size={24} />
          </div>
        </div>

        {/* Content Card */}
        <div className="bg-white dark:bg-card rounded-2xl border border-gray-200 dark:border-border shadow-sm overflow-hidden">
          <div className="p-6 md:p-8 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Template Selection using Shadcn Select */}
              <div className="space-y-2">
                <Label className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                  Template
                </Label>
                <Select value={template} onValueChange={handleTemplateChange}>
                  <SelectTrigger className="w-full h-11 rounded-xl bg-white dark:bg-accent border-gray-200 dark:border-border font-medium">
                    <SelectValue placeholder="Select Template" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="marketing_demo_invite">Demo Invite (WhatsApp Link)</SelectItem>
                    <SelectItem value="payment_due">Payment Due Reminder</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Subject using Shadcn Input */}
              <div className="space-y-2">
                <Label className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                  Subject
                </Label>
                <Input
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="w-full h-11 rounded-xl bg-white dark:bg-accent border-gray-200 dark:border-border"
                  placeholder="Payment Due Notice - Stalight Campus Subscription"
                />
              </div>
            </div>

            {/* Payment Due Specific Inputs */}
            <AnimatePresence>
              {template === "payment_due" && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.25 }}
                  className="space-y-6 pt-4 border-t border-gray-100 dark:border-border overflow-hidden"
                >
                  <div className="p-4 bg-purple-50/60 dark:bg-purple-950/20 border border-purple-200/80 dark:border-purple-900/40 rounded-xl flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <CreditCard className="text-purple-600 dark:text-purple-400" size={20} />
                      <div>
                        <h3 className="text-sm font-semibold text-purple-950 dark:text-purple-300">Payment Due Configuration</h3>
                        <p className="text-xs text-purple-700 dark:text-purple-400 mt-0.5">Specify the institution, payment due date (dd/mm/yyyy), amount, and remittance details.</p>
                      </div>
                    </div>
                  </div>

                  {/* Organization Selection using Shadcn Select */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
                        <Building size={16} className="text-gray-500" />
                        Target Institution / Organization <span className="text-red-500">*</span>
                      </Label>
                      {currentSelectedOrg && (currentSelectedOrg.admin_email || currentSelectedOrg.tech_poc_email) && (
                        <button
                          type="button"
                          onClick={() => {
                            const em = currentSelectedOrg.admin_email || currentSelectedOrg.tech_poc_email;
                            setEmailsText(em);
                          }}
                          className="text-xs text-primary font-medium hover:underline flex items-center gap-1"
                        >
                          Use {currentSelectedOrg.admin_email ? "Admin" : "POC"} Email ({currentSelectedOrg.admin_email || currentSelectedOrg.tech_poc_email})
                        </button>
                      )}
                    </div>

                    <Select value={selectedOrgId} onValueChange={handleOrgChange} disabled={orgsLoading}>
                      <SelectTrigger className="w-full h-11 rounded-xl bg-white dark:bg-accent border-gray-200 dark:border-border">
                        <SelectValue placeholder={orgsLoading ? "Loading institutions..." : "-- Select an institution --"} />
                      </SelectTrigger>
                      <SelectContent className="max-h-[300px]">
                        {organizations.map((org) => (
                          <SelectItem key={org.id} value={String(org.id)}>
                            {org.name} ({org.plan_type} • {org.admin_email || org.tech_poc_email || "No email"})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Due Date (Shadcn Popover + Calendar) & Amount Due Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Payment Due Date with dd/mm/yyyy & Calendar Popover */}
                    <div className="space-y-2">
                      <Label className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
                        <CalendarIcon size={16} className="text-gray-500" />
                        Payment Due Date <span className="text-red-500">*</span>
                      </Label>
                      
                      <div className="flex items-center gap-2">
                        <div className="relative flex-1">
                          <Input
                            type="text"
                            placeholder="dd/mm/yyyy"
                            value={dueDateText}
                            onChange={(e) => handleDueDateTextChange(e.target.value)}
                            className="w-full h-11 rounded-xl bg-white dark:bg-accent border-gray-200 dark:border-border font-medium pr-10"
                          />
                        </div>

                        <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
                          <PopoverTrigger asChild>
                            <Button
                              type="button"
                              variant="outline"
                              className={cn(
                                "h-11 px-3.5 rounded-xl border-gray-200 dark:border-border bg-white dark:bg-accent shrink-0 flex items-center gap-2",
                                !dueDateObj && "text-muted-foreground"
                              )}
                            >
                              <CalendarIcon className="h-4 w-4 text-primary" />
                              <Badge variant="secondary" className="text-[11px] font-normal py-0">
                                dd/mm/yyyy
                              </Badge>
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0 rounded-xl shadow-xl z-50" align="start">
                            <Calendar
                              mode="single"
                              selected={dueDateObj}
                              onSelect={handleDateSelect}
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Enter date manually (dd/mm/yyyy) or pick from the calendar.
                      </p>
                    </div>

                    {/* Amount Due using Shadcn Input */}
                    <div className="space-y-2">
                      <Label className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
                        <CreditCard size={16} className="text-gray-500" />
                        Amount Due to be Received <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        type="text"
                        value={amountDue}
                        onChange={(e) => setAmountDue(e.target.value)}
                        placeholder="e.g. ₹50,000 or 50000"
                        className="w-full h-11 rounded-xl bg-white dark:bg-accent border-gray-200 dark:border-border font-medium"
                      />
                    </div>
                  </div>

                  {/* Inward Payment Remittance Details using Shadcn Textarea */}
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                      Inward Payment / Bank Remittance Details <span className="text-red-500">*</span>
                    </Label>
                    <Textarea
                      value={paymentDetails}
                      onChange={(e) => setPaymentDetails(e.target.value)}
                      rows={5}
                      className="w-full p-4 rounded-xl border-gray-200 dark:border-border bg-white dark:bg-accent font-mono text-sm leading-relaxed resize-y"
                      placeholder="Enter Bank Name, Beneficiary Name, Account Number, IFSC Code, etc."
                    />
                    <p className="text-xs text-muted-foreground">
                      This information will appear in the recipient's email card as the receiving bank remittance details.
                    </p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Recipient Emails using Shadcn Textarea */}
            <div className="space-y-2">
              <div className="flex justify-between items-end">
                <Label className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                  Recipient Emails
                </Label>
                <span className={`text-xs font-medium ${currentEmailCount >= MAX_EMAILS ? 'text-red-500' : 'text-gray-500'}`}>
                  {currentEmailCount} / {MAX_EMAILS}
                </span>
              </div>
              <Textarea
                value={emailsText}
                onChange={handleEmailsChange}
                className="w-full min-h-[140px] p-4 rounded-xl border-gray-200 dark:border-border bg-white dark:bg-accent resize-y"
                placeholder="Enter comma-separated email addresses (e.g., principal@college.edu, accounts@college.edu)"
              />
              <p className="text-xs text-muted-foreground">
                You can send up to {MAX_EMAILS} emails at once. Commas and spaces are accepted as separators.
              </p>
            </div>

            {error && (
              <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="p-4 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 rounded-xl flex items-start gap-3">
                <AlertCircle className="text-red-500 shrink-0 mt-0.5" size={20} />
                <div className="text-sm text-red-700 dark:text-red-400 font-medium whitespace-pre-wrap">{error}</div>
              </motion.div>
            )}

            <div className="pt-2 flex justify-end">
              <Button
                onClick={handleSendEmails}
                disabled={isLoading || currentEmailCount === 0}
                className="px-8 h-12 bg-primary hover:bg-primary/90 text-white rounded-xl font-medium shadow-lg shadow-primary/20 transition-all"
              >
                {isLoading ? (
                  <span className="flex items-center gap-2">
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Sending...
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <Send size={18} />
                    Send Emails
                  </span>
                )}
              </Button>
            </div>
          </div>
        </div>

        {/* History Section */}
        <div className="bg-white dark:bg-card rounded-2xl border border-gray-200 dark:border-border shadow-sm overflow-hidden mt-8">
          <div className="p-6 border-b border-gray-100 dark:border-border flex flex-col md:flex-row md:items-center justify-between gap-4">
            <h2 className="text-xl font-bold text-gray-900 dark:text-foreground flex items-center gap-2">
              <Clock size={20} className="text-gray-400" />
              Email History
            </h2>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                <Input 
                  placeholder="Search history..." 
                  className="pl-9 w-[250px] rounded-full"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-gray-50 dark:bg-muted/50 text-gray-600 dark:text-muted-foreground font-medium border-b border-gray-200 dark:border-border">
                <tr>
                  <th className="px-6 py-4">Date & Time</th>
                  <th className="px-6 py-4">Subject</th>
                  <th className="px-6 py-4">Template</th>
                  <th className="px-6 py-4">Sent By</th>
                  <th className="px-6 py-4 text-center">Status</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-border text-gray-700 dark:text-gray-300">
                {historyLoading && history.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                        <p>Loading history...</p>
                      </div>
                    </td>
                  </tr>
                ) : history.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                      No email history found.
                    </td>
                  </tr>
                ) : (
                  history.map((item) => (
                    <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-muted/30 transition-colors">
                      <td className="px-6 py-4">
                        {new Date(item.sent_at).toLocaleString()}
                      </td>
                      <td className="px-6 py-4 font-medium max-w-[200px] truncate">
                        {item.subject}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2.5 py-1 rounded-md text-xs font-medium ${
                          item.template === "payment_due" 
                            ? "bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 border border-amber-200/50" 
                            : "bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300"
                        }`}>
                          {item.template === "payment_due" ? "Payment Due" : item.template}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        {item.sent_by}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <div className="flex items-center justify-center gap-2 text-xs font-semibold">
                          <span className="text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 px-2 py-1 rounded">
                            {item.total_sent} Sent
                          </span>
                          {item.total_failed > 0 && (
                            <span className="text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 px-2 py-1 rounded">
                              {item.total_failed} Failed
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="text-primary hover:text-primary hover:bg-primary/10"
                          onClick={() => setSelectedHistory(item)}
                        >
                          <Eye size={16} className="mr-1.5" />
                          View
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          
          {totalPages > 1 && (
            <div className="p-4 border-t border-gray-100 dark:border-border flex items-center justify-between">
              <p className="text-sm text-gray-500">
                Page <span className="font-medium text-gray-900 dark:text-gray-100">{page}</span> of <span className="font-medium text-gray-900 dark:text-gray-100">{totalPages}</span>
              </p>
              <div className="flex items-center gap-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                >
                  <ChevronLeft size={16} />
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                >
                  <ChevronRight size={16} />
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* View Details Modal */}
      <Dialog open={!!selectedHistory} onOpenChange={(open) => !open && setSelectedHistory(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Email Dispatch Details</DialogTitle>
          </DialogHeader>
          {selectedHistory && (
            <div className="space-y-6 pt-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-gray-500 mb-1">Subject</p>
                  <p className="font-medium text-gray-900 dark:text-gray-100">{selectedHistory.subject}</p>
                </div>
                <div>
                  <p className="text-gray-500 mb-1">Date & Time</p>
                  <p className="font-medium text-gray-900 dark:text-gray-100">{new Date(selectedHistory.sent_at).toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-gray-500 mb-1">Template</p>
                  <p className="font-medium text-gray-900 dark:text-gray-100">
                    {selectedHistory.template === "payment_due" ? "Payment Due Reminder" : selectedHistory.template}
                  </p>
                </div>
                <div>
                  <p className="text-gray-500 mb-1">Sent By</p>
                  <p className="font-medium text-gray-900 dark:text-gray-100">{selectedHistory.sent_by}</p>
                </div>
              </div>

              {selectedHistory.successful_emails.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-sm font-semibold text-green-700 dark:text-green-400 flex items-center gap-2">
                    <CheckCircle2 size={16} />
                    Successfully Sent ({selectedHistory.total_sent})
                  </h4>
                  <div className="bg-gray-50 dark:bg-accent rounded-lg p-3 text-sm text-gray-700 dark:text-gray-300 max-h-[200px] overflow-y-auto">
                    <ul className="list-disc pl-5 space-y-1">
                      {selectedHistory.successful_emails.map((email, idx) => (
                        <li key={idx}>{email}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}

              {selectedHistory.failed_emails.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-sm font-semibold text-red-700 dark:text-red-400 flex items-center gap-2">
                    <AlertCircle size={16} />
                    Failed to Send ({selectedHistory.total_failed})
                  </h4>
                  <div className="bg-gray-50 dark:bg-accent rounded-lg p-3 text-sm text-gray-700 dark:text-gray-300 max-h-[200px] overflow-y-auto">
                    <ul className="list-disc pl-5 space-y-1 text-red-600 dark:text-red-400">
                      {selectedHistory.failed_emails.map((email, idx) => (
                        <li key={idx}>{email}</li>
                      ))}
                    </ul>
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

export default BulkEmailer;
