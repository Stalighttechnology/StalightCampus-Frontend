import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import { Checkbox } from '@/components/ui/checkbox';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  CalendarIcon,
  CalendarCheck2,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Users,
  FileText,
  Upload,
  ExternalLink,
  Filter,
  Loader2,
  Ban,
  ChevronRight,
  Eye,
  Info,
  UserCheck
} from 'lucide-react';
import { format, isSameDay } from 'date-fns';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from '@/components/ui/dialog';
import Swal from 'sweetalert2';
import toast from 'react-hot-toast';
import { useTheme } from '@/context/ThemeContext';
import {
  getDeveloperLeaves,
  applyDeveloperLeave,
  cancelDeveloperLeave,
  getDeveloperColleagues,
  getDeveloperSubstituteRequests,
  actionDeveloperSubstituteRequest,
  DeveloperLeaveRecord,
  DeveloperSubstituteRequest,
  DeveloperColleague,
  DeveloperLeaveQuota
} from '@/utils/admin_api';

const formatDateDisplay = (dateStr?: string) => {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr.includes('T') ? dateStr : `${dateStr}T00:00:00`);
    if (isNaN(d.getTime())) return dateStr;
    return format(d, 'MMM dd, yyyy');
  } catch {
    return dateStr;
  }
};

const getStatusBadge = (status: string, theme: string) => {
  const norm = (status || 'PENDING').toUpperCase();
  switch (norm) {
    case 'PENDING':
      return (
        <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold inline-flex items-center gap-1 ${
          theme === 'dark' ? 'bg-yellow-900/50 text-yellow-200 border border-yellow-800' : 'bg-yellow-100 text-yellow-800 border border-yellow-200'
        }`}>
          <Clock className="w-3 h-3" />
          Pending
        </span>
      );
    case 'APPROVED':
      return (
        <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold inline-flex items-center gap-1 ${
          theme === 'dark' ? 'bg-emerald-950/50 text-emerald-300 border border-emerald-800' : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
        }`}>
          <CheckCircle2 className="w-3 h-3" />
          Approved
        </span>
      );
    case 'REJECTED':
      return (
        <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold inline-flex items-center gap-1 ${
          theme === 'dark' ? 'bg-rose-950/50 text-rose-300 border border-rose-800' : 'bg-rose-100 text-rose-800 border border-rose-200'
        }`}>
          <XCircle className="w-3 h-3" />
          Rejected
        </span>
      );
    case 'CANCELLED':
      return (
        <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold inline-flex items-center gap-1 ${
          theme === 'dark' ? 'bg-slate-800 text-slate-300 border border-slate-700' : 'bg-slate-100 text-slate-700 border border-slate-300'
        }`}>
          <Ban className="w-3 h-3" />
          Cancelled
        </span>
      );
    default:
      return (
        <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
          theme === 'dark' ? 'bg-gray-800 text-gray-200' : 'bg-gray-100 text-gray-700'
        }`}>
          {status}
        </span>
      );
  }
};

const getSubstituteStatusBadge = (status?: string, theme: string = 'light', overallStatus?: string) => {
  if (overallStatus === 'CANCELLED') {
    return (
      <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold inline-flex items-center gap-1 bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-300 dark:border-slate-700">
        <Ban className="w-3 h-3" />
        Voided
      </span>
    );
  }

  const norm = (status || 'PENDING').toUpperCase();
  switch (norm) {
    case 'ACCEPTED':
      return (
        <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold inline-flex items-center gap-1 ${
          theme === 'dark' ? 'bg-emerald-950/50 text-emerald-300 border border-emerald-800' : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
        }`}>
          <CheckCircle2 className="w-3 h-3" />
          Accepted
        </span>
      );
    case 'DECLINED':
      return (
        <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold inline-flex items-center gap-1 ${
          theme === 'dark' ? 'bg-rose-950/50 text-rose-300 border border-rose-800' : 'bg-rose-100 text-rose-800 border border-rose-200'
        }`}>
          <XCircle className="w-3 h-3" />
          Declined
        </span>
      );
    case 'PENDING':
    default:
      return (
        <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold inline-flex items-center gap-1 ${
          theme === 'dark' ? 'bg-amber-950/50 text-amber-300 border border-amber-800' : 'bg-amber-100 text-amber-800 border border-amber-200'
        }`}>
          <Clock className="w-3 h-3" />
          Awaiting Action
        </span>
      );
  }
};

const renderLeaveCategoryBadge = (leaveType: string, isHalfDay?: boolean, halfDaySession?: string | null) => {
  const normalizedType = (leaveType || 'casual').toLowerCase();

  let label = 'Casual (CL)';
  let colorClass = 'bg-blue-100 text-blue-800 dark:bg-blue-950/40 dark:text-blue-300';

  if (normalizedType === 'sick') {
    label = 'Sick / Medical (SL)';
    colorClass = 'bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300';
  } else if (normalizedType === 'earned') {
    label = 'Earned (EL)';
    colorClass = 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950/40 dark:text-indigo-300';
  } else if (normalizedType === 'comp_off') {
    label = 'Comp Off';
    colorClass = 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300';
  } else if (normalizedType === 'short_permission') {
    label = 'Short Permission';
    colorClass = 'bg-purple-100 text-purple-800 dark:bg-purple-950/40 dark:text-purple-300';
  } else if (normalizedType === 'lop') {
    label = 'Leave Without Pay (LOP)';
    colorClass = 'bg-rose-100 text-rose-800 dark:bg-rose-950/40 dark:text-rose-300';
  }

  const showHalfDay = Boolean(isHalfDay || normalizedType === 'half_day');
  const sessionNormalized = (halfDaySession || '').toLowerCase();
  const sessionText = (sessionNormalized === 'forenoon' || sessionNormalized === 'morning') ? 'Morning' : 'Afternoon';

  return (
    <div className="flex flex-wrap items-center gap-1 mt-1">
      <span className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded w-fit ${colorClass}`}>
        {label}
      </span>
      {showHalfDay && (
        <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300 w-fit">
          Half-Day ({sessionText})
        </span>
      )}
    </div>
  );
};

const DeveloperApplyLeave: React.FC = () => {
  const { theme } = useTheme();

  // Quotas & Colleague data
  const [quotas, setQuotas] = useState<DeveloperLeaveQuota | null>(null);
  const [colleagues, setColleagues] = useState<DeveloperColleague[]>([]);

  // History state
  const [leaves, setLeaves] = useState<DeveloperLeaveRecord[]>([]);
  const [loadingHistory, setLoadingHistory] = useState<boolean>(true);
  const [page, setPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [totalItems, setTotalItems] = useState<number>(0);
  const [filterStatus, setFilterStatus] = useState<string>('All');
  const [filterOpen, setFilterOpen] = useState<boolean>(false);

  // Form inputs
  const [leaveType, setLeaveType] = useState<string>('casual');
  const [startDate, setStartDate] = useState<Date | undefined>(undefined);
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);
  const [isHalfDay, setIsHalfDay] = useState<boolean>(false);
  const [halfDaySession, setHalfDaySession] = useState<'afternoon' | 'forenoon'>('afternoon');
  const [startTime, setStartTime] = useState<string>('09:30');
  const [endTime, setEndTime] = useState<string>('11:30');
  const [substituteId, setSubstituteId] = useState<string>('');
  const [title, setTitle] = useState<string>('');
  const [reason, setReason] = useState<string>('');
  const [documentFile, setDocumentFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Popover calendar toggles
  const [startCalendarOpen, setStartCalendarOpen] = useState<boolean>(false);
  const [endCalendarOpen, setEndCalendarOpen] = useState<boolean>(false);

  // Details Modal
  const [selectedLeave, setSelectedLeave] = useState<DeveloperLeaveRecord | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Top main tab switcher ('apply' vs 'substitute_requests')
  const [activeMainTab, setActiveMainTab] = useState<'apply' | 'substitute_requests'>('apply');
  const [pendingSubstituteCount, setPendingSubstituteCount] = useState<number>(0);

  // Substitute requests state
  const [substituteRequests, setSubstituteRequests] = useState<DeveloperSubstituteRequest[]>([]);
  const [substituteLoading, setSubstituteLoading] = useState<boolean>(false);
  const [substituteStatusFilter, setSubstituteStatusFilter] = useState<string>('All');
  const [substitutePage, setSubstitutePage] = useState<number>(1);
  const [substituteTotalPages, setSubstituteTotalPages] = useState<number>(1);
  const [substituteTotalItems, setSubstituteTotalItems] = useState<number>(0);
  const [substituteViewReason, setSubstituteViewReason] = useState<string | null>(null);

  // Initial load
  useEffect(() => {
    fetchColleagues();
    fetchSubstituteCountOnly();
  }, []);

  useEffect(() => {
    fetchLeaves(page, filterStatus);
  }, [page, filterStatus]);

  useEffect(() => {
    if (activeMainTab === 'substitute_requests') {
      fetchSubstituteRequests();
    }
  }, [activeMainTab, substitutePage, substituteStatusFilter]);

  const fetchSubstituteCountOnly = async () => {
    try {
      const res = await getDeveloperSubstituteRequests({ count_only: true });
      if (res && (res.pending_count !== undefined || res.count !== undefined)) {
        setPendingSubstituteCount(res.pending_count ?? res.count ?? 0);
      }
    } catch (e) {
      // ignore
    }
  };

  const fetchSubstituteRequests = async () => {
    try {
      setSubstituteLoading(true);
      const res = await getDeveloperSubstituteRequests({
        status: substituteStatusFilter === 'All' ? undefined : substituteStatusFilter,
        page: substitutePage,
        page_size: 10,
      });
      if (res && res.data) {
        setSubstituteRequests(res.data.requests || []);
        if (res.pending_count !== undefined || res.data.pending_count !== undefined) {
          setPendingSubstituteCount(res.pending_count ?? res.data.pending_count ?? 0);
        }
        if (res.count !== undefined) {
          setSubstituteTotalItems(res.count);
          setSubstituteTotalPages(Math.ceil(res.count / 10) || 1);
        }
      }
    } catch (e) {
      toast.error('Failed to load substitute requests');
    } finally {
      setSubstituteLoading(false);
    }
  };

  const handleSubstituteAction = async (leaveId: number | string, action: 'ACCEPT' | 'DECLINE') => {
    const isDark = theme === 'dark';
    const actionLabel = action === 'ACCEPT' ? 'Accept Handover Duty' : 'Decline Handover Request';

    const { value: remarks, isConfirmed } = await Swal.fire({
      title: `${actionLabel}?`,
      text: action === 'ACCEPT'
        ? 'You are accepting to cover duties or act as standby for this colleague during their leave period.'
        : 'Please enter remarks for declining this handover duty request.',
      input: 'textarea',
      inputPlaceholder: 'Add optional notes or remarks...',
      showCancelButton: true,
      confirmButtonText: action === 'ACCEPT' ? 'Yes, Accept' : 'Decline',
      confirmButtonColor: action === 'ACCEPT' ? '#10b981' : '#ef4444',
      cancelButtonText: 'Cancel',
      background: isDark ? '#1c1c1e' : '#ffffff',
      color: isDark ? '#ffffff' : '#000000'
    });

    if (isConfirmed) {
      try {
        const res = await actionDeveloperSubstituteRequest({
          leave_id: leaveId,
          action,
          remarks: remarks || ''
        });

        if (res.success) {
          await Swal.fire({
            title: 'Success',
            text: res.message || `Handover duty ${action.toLowerCase()}ed successfully.`,
            icon: 'success',
            confirmButtonColor: '#3b82f6',
            background: isDark ? '#1c1c1e' : '#ffffff',
            color: isDark ? '#ffffff' : '#000000'
          });
          fetchSubstituteRequests();
          fetchSubstituteCountOnly();
          fetchLeaves(page, filterStatus);
        } else {
          throw new Error(res.message || 'Action failed');
        }
      } catch (err: any) {
        await Swal.fire({
          title: 'Error',
          text: err.message || 'Failed to update handover duty status',
          icon: 'error',
          confirmButtonColor: '#ef4444',
          background: isDark ? '#1c1c1e' : '#ffffff',
          color: isDark ? '#ffffff' : '#000000'
        });
      }
    }
  };

  const fetchColleagues = async () => {
    try {
      const res = await getDeveloperColleagues();
      if (res.success && res.data) {
        setColleagues(res.data);
      }
    } catch (e) {
      console.error('Failed to load colleagues', e);
    }
  };

  const fetchLeaves = async (targetPage: number, status: string) => {
    try {
      setLoadingHistory(true);
      const apiStatus = status === 'All' ? undefined : status.toUpperCase();
      const res = await getDeveloperLeaves(targetPage, apiStatus);
      if (res.success && res.data) {
        setLeaves(res.data);
        setTotalPages(res.total_pages || 1);
        setTotalItems(res.count || res.data.length);
        if (res.quotas) {
          setQuotas(res.quotas);
        }
      }
    } catch (e) {
      toast.error('Failed to load leave history');
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!startDate) {
      setError('Please select a start date');
      return;
    }

    const finalEndDate = endDate || startDate;
    if (startDate > finalEndDate) {
      setError('End date cannot be earlier than start date');
      return;
    }

    if (!reason.trim()) {
      setError('Please provide a detailed reason for leave');
      return;
    }

    if (leaveType === 'short_permission') {
      if (!startTime || !endTime) {
        setError('Start time and end time are required for short permission');
        return;
      }
      if (endTime <= startTime) {
        setError('End time must be after start time');
        return;
      }
    }

    try {
      setSubmitting(true);
      const formData = new FormData();
      formData.append('leave_type', leaveType);
      formData.append('start_date', format(startDate, 'yyyy-MM-dd'));
      formData.append('end_date', format(finalEndDate, 'yyyy-MM-dd'));
      formData.append('reason', reason.trim());
      if (title.trim()) formData.append('title', title.trim());
      formData.append('is_half_day', isHalfDay || leaveType === 'half_day' ? 'true' : 'false');
      if (isHalfDay || leaveType === 'half_day') {
        formData.append('half_day_session', halfDaySession);
      }
      if (leaveType === 'short_permission') {
        formData.append('start_time', startTime);
        formData.append('end_time', endTime);
      }
      if (substituteId && substituteId !== 'none') {
        formData.append('substitute_developer_id', substituteId);
      }
      if (documentFile) {
        formData.append('document', documentFile);
      }

      const res = await applyDeveloperLeave(formData);
      if (res.success) {
        toast.success(res.message || 'Leave applied successfully!');
        // Reset form
        setTitle('');
        setReason('');
        setStartDate(undefined);
        setEndDate(undefined);
        setIsHalfDay(false);
        setSubstituteId('');
        setDocumentFile(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
        // Refresh records
        fetchLeaves(1, filterStatus);
        fetchSubstituteCountOnly();
      } else {
        Swal.fire({
          title: 'Application Failed',
          text: res.message || 'Failed to submit leave application',
          icon: 'error',
          confirmButtonColor: '#ef4444',
          background: theme === 'dark' ? '#1c1c1e' : '#ffffff',
          color: theme === 'dark' ? '#E4E4E7' : '#000000'
        });
      }
    } catch (e: any) {
      toast.error(e.message || 'Network error occurred');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancelLeave = async (id: number) => {
    const result = await Swal.fire({
      title: 'Cancel Leave Request?',
      text: 'Are you sure you want to cancel this pending leave request?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Yes, Cancel Leave',
      cancelButtonText: 'Keep Request',
      confirmButtonColor: '#ef4444',
      cancelButtonColor: theme === 'dark' ? '#3f3f46' : '#d1d5db',
      background: theme === 'dark' ? '#1c1c1e' : '#ffffff',
      color: theme === 'dark' ? '#E4E4E7' : '#000000'
    });

    if (!result.isConfirmed) return;

    try {
      const res = await cancelDeveloperLeave(id);
      if (res.success) {
        toast.success('Leave request cancelled');
        fetchLeaves(page, filterStatus);
        fetchSubstituteCountOnly();
      } else {
        toast.error(res.message || 'Failed to cancel leave request');
      }
    } catch (e) {
      toast.error('Network error while cancelling leave');
    }
  };

  const currentYear = new Date().getFullYear();

  return (
    <div className={`space-y-6 w-full max-w-7xl mx-auto pb-12 ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>
      {/* Leave Cycle Header */}
      <div className={`p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
        theme === 'dark' ? 'bg-card border-border shadow-sm' : 'bg-white border-slate-200 shadow-sm'
      }`}>
        <div className="flex items-center gap-2">
          <CalendarIcon className="w-5 h-5 text-primary shrink-0" />
          <span className="text-xs sm:text-sm font-semibold text-foreground">
            Developer Leave Cycle:
          </span>
          <span className="text-xs font-mono font-semibold px-2.5 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
            Year {currentYear}
          </span>
        </div>
        <span className="text-[11px] text-muted-foreground font-medium">
          Cycle Window: Jan 01, {currentYear} to Dec 31, {currentYear} (Annual Reset)
        </span>
      </div>

      {/* Top Header Tab Switcher (Apply Leave & History vs Substitute Requests) */}
      <div className="flex items-center w-full border-b border-border pb-3">
        <div className={`flex items-center p-1 rounded-xl border w-full ${
          theme === 'dark' ? 'bg-background/80 border-border' : 'bg-muted/40 border-border/60'
        }`}>
          <button
            type="button"
            onClick={() => setActiveMainTab('apply')}
            className={`flex-1 justify-center px-4 py-2.5 text-xs sm:text-sm font-semibold rounded-lg transition-all duration-200 flex items-center gap-2 ${
              activeMainTab === 'apply'
                ? 'bg-primary text-white shadow-sm'
                : 'text-muted-foreground hover:text-foreground hover:bg-background/50'
            }`}
          >
            <CalendarCheck2 className="w-4 h-4 shrink-0" />
            <span className="whitespace-nowrap">Apply Leave</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveMainTab('substitute_requests')}
            className={`flex-1 justify-center px-4 py-2.5 text-xs sm:text-sm font-semibold rounded-lg transition-all duration-200 flex items-center gap-2 relative ${
              activeMainTab === 'substitute_requests'
                ? 'bg-primary text-white shadow-sm'
                : 'text-muted-foreground hover:text-foreground hover:bg-background/50'
            }`}
          >
            <Users className="w-4 h-4 shrink-0" />
            <span className="whitespace-nowrap">Substitute / Handover Requests</span>
            {pendingSubstituteCount > 0 && (
              <span className={`ml-1.5 px-1.5 py-0.5 text-[10px] rounded-full font-semibold leading-none ${
                activeMainTab === 'substitute_requests'
                  ? 'bg-white text-primary'
                  : 'bg-rose-500 text-white animate-pulse'
              }`}>
                {pendingSubstituteCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {activeMainTab === 'apply' ? (
        <>
          {/* Main 2-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        {/* LEFT COLUMN: Leave Application Form */}
        <Card id="apply-leave-form-card" className={`apply-leave-card flex flex-col h-full border ${theme === 'dark' ? 'bg-card text-foreground border-border shadow-sm' : 'bg-white text-gray-900 border-gray-200 shadow-sm'}`}>
          <CardHeader className="px-4 sm:px-6 py-4 sm:py-5 border-b">
            <div className="flex flex-col gap-1">
              <CardTitle className={`tracking-tight text-xl font-semibold ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>
                Leave Application Form
              </CardTitle>
              <CardDescription className="text-xs text-muted-foreground">
                Submit a leave request for HQ Admin approval
              </CardDescription>
            </div>
          </CardHeader>

          <CardContent className="p-4 sm:p-6 space-y-5">
            {error && (
              <div className={`p-3 rounded-lg text-xs font-medium flex items-center gap-2 ${
                theme === 'dark' ? 'bg-destructive/20 text-destructive-foreground border border-destructive' : 'bg-red-100 text-red-700 border border-red-200'
              }`}>
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Leave Category Select */}
              <div className="space-y-1.5">
                <Label htmlFor="leave-category-select" className="text-xs font-semibold">
                  Leave Category <span className="text-red-500">*</span>
                </Label>
                <Select
                  value={leaveType}
                  onValueChange={(val) => {
                    setLeaveType(val);
                    setIsHalfDay(val === 'half_day');
                    if (val === 'short_permission') {
                      if (!startDate) setStartDate(new Date());
                    }
                  }}
                >
                  <SelectTrigger id="leave-category-select" className="w-full text-xs font-semibold h-10">
                    <SelectValue placeholder="Select Leave Category" />
                  </SelectTrigger>
                  <SelectContent className={theme === 'dark' ? 'bg-card border-border text-foreground' : ''}>
                    <SelectItem value="casual">Casual Leave (CL)</SelectItem>
                    <SelectItem value="sick">Sick / Medical Leave (SL)</SelectItem>
                    <SelectItem value="earned">Earned Leave (EL)</SelectItem>
                    <SelectItem value="comp_off">Comp Off</SelectItem>
                    <SelectItem value="half_day">Half Day</SelectItem>
                    <SelectItem value="short_permission">Short Permission (Hours)</SelectItem>
                    <SelectItem value="lop">Leave Without Pay (LOP)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Date Selection Row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Start Date */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">
                    {leaveType === 'short_permission' ? 'Permission Date' : 'Start Date'} <span className="text-red-500">*</span>
                  </Label>
                  <Popover open={startCalendarOpen} onOpenChange={setStartCalendarOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        type="button"
                        variant="outline"
                        className={`w-full justify-start text-left text-xs font-normal h-10 ${
                          !startDate && 'text-muted-foreground'
                        }`}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {startDate ? format(startDate, 'MMM dd, yyyy') : <span>Pick date</span>}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={startDate}
                        onSelect={(date) => {
                          setStartDate(date);
                          if (!endDate || (date && date > endDate)) {
                            setEndDate(date);
                          }
                          setStartCalendarOpen(false);
                        }}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                {/* End Date (hidden for short permission) */}
                {leaveType !== 'short_permission' && (
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">
                      End Date <span className="text-red-500">*</span>
                    </Label>
                    <Popover open={endCalendarOpen} onOpenChange={setEndCalendarOpen}>
                      <PopoverTrigger asChild>
                        <Button
                          type="button"
                          variant="outline"
                          className={`w-full justify-start text-left text-xs font-normal h-10 ${
                            !endDate && 'text-muted-foreground'
                          }`}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {endDate ? format(endDate, 'MMM dd, yyyy') : <span>Pick date</span>}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={endDate}
                          onSelect={(date) => {
                            setEndDate(date);
                            setEndCalendarOpen(false);
                          }}
                          disabled={(date) => (startDate ? date < startDate : false)}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                )}
              </div>

              {/* Half-Day Option (if not short permission) */}
              {leaveType !== 'short_permission' && (
                <div className={`p-3 rounded-lg border space-y-2 ${theme === 'dark' ? 'bg-muted/10 border-border' : 'bg-gray-50/70 border-gray-200'}`}>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="half-day-check"
                      checked={isHalfDay || leaveType === 'half_day'}
                      onCheckedChange={(checked) => setIsHalfDay(Boolean(checked))}
                    />
                    <label
                      htmlFor="half-day-check"
                      className="text-xs font-medium leading-none cursor-pointer"
                    >
                      Apply as Half-Day Leave (Deducts 0.5 day)
                    </label>
                  </div>

                  {(isHalfDay || leaveType === 'half_day') && (
                    <div className="pt-2 pl-6">
                      <Label className="text-xs text-muted-foreground block mb-1.5">Session</Label>
                      <Select
                        value={halfDaySession}
                        onValueChange={(val: any) => setHalfDaySession(val)}
                      >
                        <SelectTrigger className="w-full sm:w-60 h-9 text-xs">
                          <SelectValue placeholder="Select session" />
                        </SelectTrigger>
                        <SelectContent className={theme === 'dark' ? 'bg-card border-border text-foreground' : ''}>
                          <SelectItem value="forenoon">Forenoon (Morning Session)</SelectItem>
                          <SelectItem value="afternoon">Afternoon Session</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>
              )}

              {/* Short Permission Times */}
              {leaveType === 'short_permission' && (
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Start Time <span className="text-red-500">*</span></Label>
                    <Input
                      type="time"
                      value={startTime}
                      onChange={(e) => setStartTime(e.target.value)}
                      className="h-10 text-xs"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">End Time <span className="text-red-500">*</span></Label>
                    <Input
                      type="time"
                      value={endTime}
                      onChange={(e) => setEndTime(e.target.value)}
                      className="h-10 text-xs"
                    />
                  </div>
                </div>
              )}

              {/* Handover / Standby Colleague */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">
                  Handover / Standby Colleague (Optional)
                </Label>
                <Select value={substituteId} onValueChange={setSubstituteId}>
                  <SelectTrigger className="w-full text-xs h-10">
                    <SelectValue placeholder="Select colleague for task coverage" />
                  </SelectTrigger>
                  <SelectContent className={theme === 'dark' ? 'bg-card border-border text-foreground' : ''}>
                    <SelectItem value="none">None / Not Required</SelectItem>
                    {colleagues.map((c) => (
                      <SelectItem key={c.id} value={c.id.toString()}>
                        {c.name} ({c.email})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Supporting Document */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">
                  Supporting Document (Optional)
                </Label>
                <div className="relative">
                  <Input
                    ref={fileInputRef}
                    type="file"
                    onChange={(e) => {
                      const file = e.target.files?.[0] || null;
                      setDocumentFile(file);
                    }}
                    className="h-10 text-xs cursor-pointer file:mr-3 file:py-1 file:px-2.5 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20"
                  />
                </div>
                <p className="text-[11px] text-muted-foreground">Attach medical certificate, duty order, or relevant proof if needed.</p>
              </div>

              {/* Subject / Title */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Subject / Title (Optional)</Label>
                <Input
                  placeholder="E.g., Medical Appointment, Family Event, Personal Duty..."
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="h-10 text-xs"
                />
              </div>

              {/* Reason */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">
                  Reason for Leave <span className="text-red-500">*</span>
                </Label>
                <Textarea
                  placeholder="Provide clear reasons for this leave request..."
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="min-h-[90px] text-xs resize-y"
                />
              </div>

              {/* Submit Button */}
              <Button
                type="submit"
                disabled={submitting}
                className="w-full h-11 text-sm font-semibold flex items-center justify-center gap-2 shadow-sm"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Submitting Application...
                  </>
                ) : (
                  <>
                    <CalendarCheck2 className="w-4 h-4" />
                    Submit Leave Request
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* RIGHT COLUMN: Leave History (Matching Faculty Dashboard Design) */}
        <Card id="recent-leaves-card" className={`apply-leave-card flex flex-col h-full border ${theme === 'dark' ? 'bg-card text-foreground border-border shadow-sm' : 'bg-white text-gray-900 border-gray-200 shadow-sm'}`}>
          <CardHeader className="px-4 sm:px-6 py-4 sm:py-5 border-b">
            <div className="flex flex-row items-start sm:items-center justify-between gap-4 w-full">
              <div className="flex flex-col gap-1">
                <CardTitle className={`tracking-tight text-xl font-semibold ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>
                  Leave History
                </CardTitle>
                <CardDescription className="text-xs text-muted-foreground">
                  Track your leave requests and approval status
                </CardDescription>
              </div>

              {/* Filter Button Matching Faculty */}
              <div className="flex-shrink-0">
                <Popover open={filterOpen} onOpenChange={setFilterOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex items-center justify-center bg-primary text-white border-primary hover:bg-primary/90 hover:border-primary/90 hover:text-white transition-all shadow-sm h-9 px-3 rounded-lg text-xs font-medium"
                    >
                      <Filter className="w-3.5 h-3.5 mr-1.5" />
                      <span>{filterStatus === 'All' ? 'Filter' : filterStatus}</span>
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className={`w-44 p-2 ${theme === 'dark' ? 'bg-card text-foreground border-border' : 'bg-white text-gray-900 border-gray-200'}`}>
                    <div className="space-y-1">
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground px-2 py-1">
                        Filter Status
                      </p>
                      {['All', 'Pending', 'Approved', 'Rejected', 'Cancelled'].map((st) => (
                        <Button
                          key={st}
                          variant={filterStatus === st ? 'default' : 'ghost'}
                          size="sm"
                          className={`w-full justify-start text-xs h-8 px-2 ${
                            filterStatus === st ? 'bg-primary text-white' : 'hover:bg-primary/10 hover:text-primary'
                          }`}
                          onClick={() => {
                            setFilterStatus(st);
                            setPage(1);
                            setFilterOpen(false);
                          }}
                        >
                          {st}
                        </Button>
                      ))}
                    </div>
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-4 sm:p-6 flex-1">
            {loadingHistory ? (
              <div className="py-20 flex flex-col items-center justify-center space-y-3">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
                <p className="text-xs text-muted-foreground">Loading leave history...</p>
              </div>
            ) : leaves.length === 0 ? (
              <div className={`flex flex-col items-center justify-center py-20 px-4 rounded-xl border-2 border-dashed ${
                theme === 'dark' ? 'border-border bg-card/30' : 'border-gray-200 bg-gray-50/50'
              }`}>
                <div className={`p-4 rounded-full mb-3 ${theme === 'dark' ? 'bg-primary/10' : 'bg-primary/5'}`}>
                  <CalendarCheck2 className="w-10 h-10 text-primary opacity-50" />
                </div>
                <h3 className="text-sm font-semibold mb-1">No Leave Records Found</h3>
                <p className="text-xs text-center max-w-sm text-muted-foreground">
                  {filterStatus !== 'All'
                    ? `There are no ${filterStatus.toLowerCase()} leave requests.`
                    : 'You have not submitted any leave requests yet.'}
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {leaves.map((req) => (
                  <div
                    key={req.id}
                    className={`p-3.5 rounded-xl border transition-all hover:shadow-xs ${
                      theme === 'dark' ? 'bg-card/60 border-border hover:border-border/80' : 'bg-white border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    {/* Header Row: Title & Badges */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-semibold text-foreground truncate">
                          {req.title || 'Leave Application'}
                        </div>
                        {renderLeaveCategoryBadge(req.leave_type, req.is_half_day, req.half_day_session)}
                      </div>
                      <div className="shrink-0">
                        {getStatusBadge(req.status, theme)}
                      </div>
                    </div>

                    {/* Date Period & Time */}
                    <div className={`mt-3 p-2.5 rounded-lg border text-xs flex flex-col gap-1 ${
                      theme === 'dark' ? 'bg-muted/10 border-border/40' : 'bg-gray-50/60 border-gray-100'
                    }`}>
                      <div className="flex items-center gap-2">
                        <CalendarIcon className="w-3.5 h-3.5 text-primary/70 shrink-0" />
                        <span className="font-medium text-foreground">
                          {formatDateDisplay(req.start_date)}
                        </span>
                        {req.start_date !== req.end_date && (
                          <>
                            <span className="text-muted-foreground">to</span>
                            <span className="font-medium text-foreground">
                              {formatDateDisplay(req.end_date)}
                            </span>
                          </>
                        )}
                        <span className="text-muted-foreground ml-auto font-medium">
                          ({req.days_count} {req.days_count === 1 ? 'day' : 'days'})
                        </span>
                      </div>

                      {req.start_time && req.end_time && (
                        <div className="text-[11px] font-semibold text-primary pl-5">
                          {req.start_time} - {req.end_time}
                        </div>
                      )}
                    </div>

                    {/* Sub / Remarks / Attachments */}
                    {req.substitute_developer_name && (
                      <div className="mt-2 text-xs text-muted-foreground flex flex-wrap items-center gap-1.5">
                        <Users className="w-3.5 h-3.5 text-primary/60 shrink-0" />
                        <span>Standby: <strong className="text-foreground">{req.substitute_developer_name}</strong></span>
                        {req.substitute_status === 'ACCEPTED' && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded-full font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300">
                            ✓ Accepted
                          </span>
                        )}
                        {req.substitute_status === 'DECLINED' && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded-full font-semibold bg-rose-100 text-rose-800 dark:bg-rose-950/40 dark:text-rose-300">
                            ✕ Declined
                          </span>
                        )}
                        {req.substitute_status === 'PENDING' && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded-full font-semibold bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
                            ⏳ Awaiting Standby
                          </span>
                        )}
                      </div>
                    )}

                    {req.admin_remarks && (
                      <div className="mt-2 text-xs text-amber-600 dark:text-amber-400 p-2 rounded bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40">
                        <strong>Admin remarks:</strong> {req.admin_remarks}
                      </div>
                    )}

                    {/* Actions Row */}
                    <div className="mt-3 pt-2.5 border-t border-border/40 flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedLeave(req)}
                          className="text-xs h-8 px-2.5 text-primary hover:text-primary hover:bg-primary/10"
                        >
                          <Eye className="w-3.5 h-3.5 mr-1" />
                          View Details
                        </Button>

                        {req.document_url && (
                          <a
                            href={req.document_url}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground px-2 py-1 rounded hover:bg-muted/50"
                          >
                            <FileText className="w-3.5 h-3.5 text-primary" />
                            <span>Attachment</span>
                            <ExternalLink className="w-2.5 h-2.5 opacity-60" />
                          </a>
                        )}
                      </div>

                      {req.status === 'PENDING' && (
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleCancelLeave(req.id)}
                          className="text-xs h-8 px-3"
                        >
                          Cancel Request
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>

          {/* Pagination Footer */}
          {!loadingHistory && totalPages > 1 && (
            <CardFooter className="flex flex-col sm:flex-row justify-between items-center gap-3 text-xs text-muted-foreground px-4 sm:px-6 py-3 border-t border-border mt-auto">
              <div>
                Showing <span className="font-medium text-foreground">{Math.min((page - 1) * 10 + 1, totalItems)}</span> to{' '}
                <span className="font-medium text-foreground">{Math.min(page * 10, totalItems)}</span> of{' '}
                <span className="font-medium text-foreground">{totalItems}</span> applications
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="h-8 px-3 text-xs"
                >
                  Previous
                </Button>
                <span className="text-xs font-semibold px-2">
                  {page} / {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="h-8 px-3 text-xs"
                >
                  Next
                </Button>
              </div>
            </CardFooter>
          )}
        </Card>
      </div>
      </>
      ) : (
        /* Alternate Duty / Substitute Requests Assigned to You */
        <Card className={`border shadow-sm flex flex-col ${theme === 'dark' ? 'bg-card border-border' : 'bg-white border-gray-200'}`}>
          <CardHeader className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b pb-4">
            <div>
              <CardTitle className="text-lg sm:text-xl font-semibold">
                Alternate Duty / Handover Requests Assigned to You
              </CardTitle>
              <CardDescription className="text-xs sm:text-sm text-muted-foreground mt-1">
                Colleagues who nominated you as standby / handover colleague while they are on leave. Accept or decline to allow their request to proceed.
              </CardDescription>
            </div>

            {/* Status Filter */}
            <div className="flex items-center gap-2 self-end sm:self-auto">
              <Select value={substituteStatusFilter} onValueChange={(val) => { setSubstituteStatusFilter(val); setSubstitutePage(1); }}>
                <SelectTrigger className="leave-filter-select min-w-[130px] w-auto px-3 h-9 flex items-center justify-center gap-2 rounded-lg border border-primary bg-primary text-white hover:bg-primary/90 shadow-sm font-medium text-xs sm:text-sm">
                  <Filter className="h-4 w-4" />
                  <span>{substituteStatusFilter === "All" ? "All Statuses" : (substituteStatusFilter === 'PENDING' ? 'Pending' : (substituteStatusFilter === 'ACCEPTED' ? 'Accepted' : 'Declined'))}</span>
                </SelectTrigger>
                <SelectContent className={theme === 'dark' ? 'bg-card text-foreground border border-border' : 'bg-white text-gray-900 border border-gray-300'}>
                  <SelectItem value="All">All Statuses</SelectItem>
                  <SelectItem value="PENDING">Pending</SelectItem>
                  <SelectItem value="ACCEPTED">Accepted</SelectItem>
                  <SelectItem value="DECLINED">Declined</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardHeader>

          <CardContent className="flex-1 px-3 sm:px-6 pt-4">
            <div className="border rounded-xl overflow-hidden shadow-sm">
              {substituteLoading ? (
                <div className="py-20 flex flex-col items-center justify-center gap-3">
                  <Loader2 className="w-8 h-8 animate-spin text-primary" />
                  <span className="text-xs text-muted-foreground">Loading substitute requests...</span>
                </div>
              ) : (!Array.isArray(substituteRequests) || substituteRequests.length === 0) ? (
                <div className="flex flex-col items-center justify-center py-16 px-4">
                  <div className={`p-4 rounded-full mb-3 ${theme === 'dark' ? 'bg-primary/10' : 'bg-primary/5'}`}>
                    <UserCheck className="w-10 h-10 text-primary opacity-50" />
                  </div>
                  <h3 className={`text-base font-semibold mb-1 ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>
                    No Handover Requests
                  </h3>
                  <p className={`text-xs text-center max-w-sm ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}`}>
                    {substituteStatusFilter !== 'All'
                      ? `There are no ${substituteStatusFilter.toLowerCase()} handover requests.`
                      : 'When a colleague nominates you as their handover / standby colleague, it will appear here.'}
                  </p>
                </div>
              ) : (
                <>
                  {/* Mobile: stacked cards */}
                  <div className="md:hidden space-y-3 p-2">
                    {substituteRequests.map((req) => (
                      <div
                        key={req.id}
                        className={`p-3 rounded-lg border transition-all ${
                          req.substitute_status === 'PENDING'
                            ? 'border-amber-300 dark:border-amber-800 bg-amber-50/40 dark:bg-amber-950/20'
                            : theme === 'dark'
                            ? 'bg-card border-border text-foreground'
                            : 'bg-white border-gray-200 text-gray-900'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <div className="font-semibold text-base break-words">{req.applicant_name}</div>
                            <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                              <span className="text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                                DEVELOPER
                              </span>
                              {req.applicant_email && (
                                <span className="text-xs text-muted-foreground font-medium">{req.applicant_email}</span>
                              )}
                            </div>
                          </div>
                          <div className="shrink-0">{getSubstituteStatusBadge(req.substitute_status, theme, req.overall_leave_status)}</div>
                        </div>

                        <div className="mt-2.5">
                          <div className="text-sm font-semibold text-foreground">{req.title || 'Leave Request'}</div>
                          {renderLeaveCategoryBadge(req.leave_type, req.is_half_day, req.half_day_session)}
                        </div>

                        <div className="mt-2.5 space-y-2.5">
                          <div className={`p-2.5 rounded-lg border text-sm flex flex-col gap-1 ${theme === 'dark' ? 'bg-muted/10 border-border/40' : 'bg-gray-50/50 border-gray-100'}`}>
                            <div className="flex items-center gap-2">
                              <CalendarIcon className="w-4 h-4 text-primary/60 shrink-0" />
                              <span className="font-medium text-foreground">{formatDateDisplay(req.start_date)}</span>
                              {req.start_date !== req.end_date && (
                                <>
                                  <span className="text-muted-foreground">to</span>
                                  <span className="font-medium text-foreground">{formatDateDisplay(req.end_date)}</span>
                                </>
                              )}
                              <span className="text-xs text-muted-foreground ml-auto font-medium">({req.days_count} {req.days_count === 1 ? 'day' : 'days'})</span>
                            </div>
                            {req.start_time && req.end_time && (
                              <div className="text-xs font-semibold text-primary pl-6">
                                {req.start_time} - {req.end_time}
                              </div>
                            )}
                          </div>

                          <div className="flex flex-col gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              className={`w-full h-9 font-semibold transition border ${
                                theme === 'dark'
                                  ? 'border-purple-500/20 text-purple-400 bg-purple-950/20 hover:bg-purple-950/40'
                                  : 'border-purple-100 text-purple-600 bg-purple-50 hover:bg-purple-100/80'
                              }`}
                              onClick={() => setSubstituteViewReason(req.reason)}
                            >
                              View Reason
                            </Button>

                            {req.document_url && (
                              <a
                                href={req.document_url}
                                target="_blank"
                                rel="noreferrer"
                                className={`w-full h-9 text-xs font-semibold flex items-center justify-center gap-1.5 rounded-md border shadow-xs transition-all ${
                                  theme === 'dark'
                                    ? 'border-sky-500/30 bg-sky-950/30 text-sky-300 hover:bg-sky-950/50'
                                    : 'border-sky-200 bg-sky-50 text-sky-700 hover:bg-sky-100'
                                }`}
                              >
                                <FileText className="w-4 h-4 text-sky-600 dark:text-sky-400" />
                                <span>View Attachment</span>
                                <ExternalLink className="w-3 h-3 opacity-70" />
                              </a>
                            )}
                          </div>

                          {req.overall_leave_status === 'CANCELLED' ? (
                            <div className="pt-2 text-center border-t border-border/40">
                              <span className="text-xs text-muted-foreground italic flex items-center justify-center gap-1">
                                <Ban className="w-3.5 h-3.5 text-slate-400" />
                                Leave was cancelled by applicant — duty coverage voided.
                              </span>
                            </div>
                          ) : req.substitute_status === 'PENDING' ? (
                            <div className="grid grid-cols-2 gap-2.5 pt-1">
                              <Button
                                size="sm"
                                onClick={() => handleSubstituteAction(req.id, 'ACCEPT')}
                                className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold h-9"
                              >
                                <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                                Accept Duty
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleSubstituteAction(req.id, 'DECLINE')}
                                className="border-rose-300 text-rose-600 hover:bg-rose-50 dark:border-rose-800 dark:hover:bg-rose-950/40 text-xs font-semibold h-9"
                              >
                                <XCircle className="w-3.5 h-3.5 mr-1" />
                                Decline
                              </Button>
                            </div>
                          ) : (
                            <div className="pt-2 text-center border-t border-border/40">
                              <span className="text-xs text-muted-foreground">
                                {req.substitute_status === 'ACCEPTED' ? '✓ You accepted this handover duty' : '✕ You declined this handover duty'}
                                {req.substitute_remarks && ` ("${req.substitute_remarks}")`}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Desktop / Tablet: table */}
                  <div className="hidden md:block overflow-x-auto custom-scrollbar">
                    <table className="w-full text-sm text-left border-collapse">
                      <thead className={`sticky top-0 z-10 border-b ${theme === 'dark' ? 'border-border bg-card shadow-sm' : 'border-gray-200 bg-gray-50 shadow-sm'}`}>
                        <tr>
                          <th className={`py-3 px-3 md:px-4 text-left font-semibold ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>Colleague</th>
                          <th className={`py-3 px-3 md:px-4 text-left font-semibold ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>Category / Title</th>
                          <th className={`py-3 px-4 text-center font-semibold ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>Period & Time</th>
                          <th className={`py-3 px-3 text-center font-semibold ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>Attachment</th>
                          <th className={`py-3 px-3 text-center font-semibold ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>Reason</th>
                          <th className={`py-3 px-3 text-center font-semibold ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>Status</th>
                          <th className={`py-3 px-3 text-center font-semibold ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {substituteRequests.map((req) => (
                          <tr
                            key={req.id}
                            className={`transition-colors duration-200 ${theme === 'dark' ? 'hover:bg-accent/50' : 'hover:bg-gray-50'}`}
                          >
                            <td className="py-4 px-3 md:px-4 text-left">
                              <div className={`font-medium ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>{req.applicant_name}</div>
                              <div className="flex items-center gap-1.5 mt-0.5">
                                <span className="text-[11px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                                  DEVELOPER
                                </span>
                                {req.applicant_email && (
                                  <span className={`text-xs ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}`}>{req.applicant_email}</span>
                                )}
                              </div>
                            </td>

                            <td className="py-4 px-3 md:px-4 text-left">
                              <div className={`font-medium text-sm ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>{req.title || 'Leave Request'}</div>
                              {renderLeaveCategoryBadge(req.leave_type, req.is_half_day, req.half_day_session)}
                            </td>

                            <td className={`py-4 px-3 md:px-4 text-sm text-center ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>
                              <div>
                                {formatDateDisplay(req.start_date)}
                                {req.start_date !== req.end_date && (
                                  <>
                                    <span className={theme === 'dark' ? 'text-muted-foreground mx-1' : 'text-gray-500 mx-1'}>to</span>
                                    {formatDateDisplay(req.end_date)}
                                  </>
                                )}
                              </div>
                              <div className="text-xs text-muted-foreground mt-0.5">
                                ({req.days_count} {req.days_count === 1 ? 'day' : 'days'})
                              </div>
                              {req.start_time && req.end_time && (
                                <div className="text-xs font-semibold text-primary mt-0.5">
                                  {req.start_time} - {req.end_time}
                                </div>
                              )}
                            </td>

                            {/* Attachment Column */}
                            <td className="py-4 px-3 md:px-4 text-sm text-center">
                              {req.document_url ? (
                                <a
                                  href={req.document_url}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium bg-sky-50 text-sky-700 dark:bg-sky-950/50 dark:text-sky-300 border border-sky-200 dark:border-sky-800 hover:bg-sky-100 dark:hover:bg-sky-900/50 transition-colors shrink-0 whitespace-nowrap"
                                  title="View Attachment"
                                >
                                  <FileText className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
                                  <span>Document</span>
                                  <ExternalLink className="w-2.5 h-2.5 opacity-70" />
                                </a>
                              ) : (
                                <span className="text-muted-foreground text-xs italic">—</span>
                              )}
                            </td>

                            {/* Reason Column */}
                            <td className="py-4 px-3 md:px-4 text-sm text-center">
                              <button
                                onClick={() => setSubstituteViewReason(req.reason)}
                                className={`text-sm font-medium px-2.5 py-1 rounded-md transition border ${
                                  theme === 'dark'
                                    ? 'border-purple-500/20 text-purple-400 bg-purple-950/20 hover:bg-purple-950/40'
                                    : 'border-purple-100 text-purple-600 bg-purple-50 hover:bg-purple-100/80'
                                }`}
                              >
                                View
                              </button>
                            </td>

                            {/* Status Column */}
                            <td className="py-4 px-3 md:px-4 text-center">
                              {getSubstituteStatusBadge(req.substitute_status, theme, req.overall_leave_status)}
                              {req.substitute_remarks && (
                                <div className="text-[11px] text-muted-foreground mt-1 max-w-[150px] truncate mx-auto" title={req.substitute_remarks}>
                                  "{req.substitute_remarks}"
                                </div>
                              )}
                            </td>

                            {/* Action Column */}
                            <td className="py-4 px-3 md:px-4 text-center">
                              {req.overall_leave_status === 'CANCELLED' ? (
                                <span className="text-xs text-muted-foreground italic">Duty Voided</span>
                              ) : req.substitute_status === 'PENDING' ? (
                                <div className="flex flex-col sm:flex-row justify-center gap-2">
                                  <Button
                                    variant="outline"
                                    className={`px-3 py-1 text-xs flex items-center justify-center gap-1 ${
                                      theme === 'dark'
                                        ? 'text-green-400 border-green-400/50 bg-green-400/5 hover:bg-green-400/20'
                                        : 'text-green-700 border-green-200 bg-green-50 hover:bg-green-100'
                                    }`}
                                    onClick={() => handleSubstituteAction(req.id, 'ACCEPT')}
                                  >
                                    <CheckCircle2 size={15} /> Accept
                                  </Button>
                                  <Button
                                    variant="outline"
                                    className={`px-3 py-1 text-xs flex items-center justify-center gap-1 ${
                                      theme === 'dark'
                                        ? 'text-red-400 border-red-400/50 bg-red-400/5 hover:bg-red-400/20'
                                        : 'text-red-700 border-red-200 bg-red-50 hover:bg-red-100'
                                    }`}
                                    onClick={() => handleSubstituteAction(req.id, 'DECLINE')}
                                  >
                                    <XCircle size={15} /> Decline
                                  </Button>
                                </div>
                              ) : (
                                <span className={`text-xs ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}`}>
                                  {req.substitute_status === 'ACCEPTED' ? '✓ Accepted' : '✕ Declined'}
                                </span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </div>
          </CardContent>

          {substituteTotalPages > 1 && (
            <CardFooter className="px-6 py-4 border-t flex items-center justify-between">
              <span className="text-xs text-muted-foreground">
                Showing page {substitutePage} of {substituteTotalPages} ({substituteTotalItems} total requests)
              </span>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSubstitutePage((p) => Math.max(1, p - 1))}
                  disabled={substitutePage === 1}
                  className="h-8 px-3 text-xs"
                >
                  Previous
                </Button>
                <span className="text-xs font-semibold px-2">
                  {substitutePage} / {substituteTotalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSubstitutePage((p) => Math.min(substituteTotalPages, p + 1))}
                  disabled={substitutePage === substituteTotalPages}
                  className="h-8 px-3 text-xs"
                >
                  Next
                </Button>
              </div>
            </CardFooter>
          )}
        </Card>
      )}

      {/* Details Dialog */}
      <Dialog open={!!selectedLeave} onOpenChange={() => setSelectedLeave(null)}>
        <DialogContent className={`max-w-md ${theme === 'dark' ? 'bg-card text-foreground border-border' : 'bg-white text-gray-900 border-gray-200'}`}>
          <DialogHeader>
            <DialogTitle className="text-base font-semibold">Leave Request Details</DialogTitle>
          </DialogHeader>

          {selectedLeave && (
            <div className="space-y-4 text-xs">
              <div className={`p-3 rounded-lg border space-y-1.5 ${theme === 'dark' ? 'bg-muted/20 border-border' : 'bg-gray-50 border-gray-200'}`}>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Status:</span>
                  {getStatusBadge(selectedLeave.status, theme)}
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Category:</span>
                  <span className="font-semibold text-foreground uppercase">{selectedLeave.leave_type}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Period:</span>
                  <span className="font-semibold text-foreground">
                    {formatDateDisplay(selectedLeave.start_date)} to {formatDateDisplay(selectedLeave.end_date)} ({selectedLeave.days_count} days)
                  </span>
                </div>
                {selectedLeave.start_time && selectedLeave.end_time && (
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Permission Time:</span>
                    <span className="font-semibold text-primary">{selectedLeave.start_time} - {selectedLeave.end_time}</span>
                  </div>
                )}
                {selectedLeave.substitute_developer_name && (
                  <div className="border-t pt-1.5 mt-1.5 border-border/40 space-y-1">
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">Standby Colleague:</span>
                      <span className="font-semibold text-foreground">{selectedLeave.substitute_developer_name}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">Standby Status:</span>
                      <div>
                        {selectedLeave.substitute_status === 'ACCEPTED' && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300">
                            ✓ Accepted
                          </span>
                        )}
                        {selectedLeave.substitute_status === 'DECLINED' && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold bg-rose-100 text-rose-800 dark:bg-rose-950/40 dark:text-rose-300">
                            ✕ Declined
                          </span>
                        )}
                        {selectedLeave.substitute_status === 'PENDING' && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
                            ⏳ Awaiting Standby
                          </span>
                        )}
                        {selectedLeave.substitute_status === 'SKIPPED' && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                            Not Required
                          </span>
                        )}
                      </div>
                    </div>
                    {selectedLeave.substitute_remarks && (
                      <div className="text-[11px] text-muted-foreground pl-2 border-l-2 border-border italic">
                        Notes: {selectedLeave.substitute_remarks}
                      </div>
                    )}
                  </div>
                )}
                {selectedLeave.applied_at && (
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Applied On:</span>
                    <span className="text-foreground">{formatDateDisplay(selectedLeave.applied_at.slice(0, 10))}</span>
                  </div>
                )}
              </div>

              <div>
                <Label className="text-xs font-semibold block mb-1">Reason for Leave:</Label>
                <div className={`p-3 rounded-lg border text-xs leading-relaxed whitespace-pre-wrap ${
                  theme === 'dark' ? 'bg-muted/10 border-border text-foreground' : 'bg-gray-50 border-gray-200 text-gray-800'
                }`}>
                  {selectedLeave.reason}
                </div>
              </div>

              {selectedLeave.admin_remarks && (
                <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40 text-amber-800 dark:text-amber-300">
                  <strong className="block mb-0.5">Admin Review Remarks:</strong>
                  {selectedLeave.admin_remarks}
                  {selectedLeave.reviewed_by && (
                    <div className="text-[10px] text-muted-foreground mt-1">Reviewed by: {selectedLeave.reviewed_by}</div>
                  )}
                </div>
              )}

              {selectedLeave.document_url && (
                <div className="pt-1">
                  <a
                    href={selectedLeave.document_url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs text-primary font-medium hover:underline"
                  >
                    <FileText className="w-4 h-4" />
                    <span>View uploaded supporting document</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSelectedLeave(null)}
              className="text-xs"
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Substitute Request Reason View Dialog */}
      <Dialog open={!!substituteViewReason} onOpenChange={() => setSubstituteViewReason(null)}>
        <DialogContent className={`max-w-md ${theme === 'dark' ? 'bg-card text-foreground border-border' : 'bg-white text-gray-900 border-gray-200'}`}>
          <DialogHeader>
            <DialogTitle className="text-base font-semibold">Reason for Leave Request</DialogTitle>
          </DialogHeader>
          <div className={`p-3 text-xs leading-relaxed whitespace-pre-wrap break-words max-h-64 overflow-y-auto rounded-md border ${
            theme === 'dark' ? 'text-foreground bg-muted/10 border-border' : 'text-gray-900 bg-white border-gray-200'
          }`}>
            {substituteViewReason}
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setSubstituteViewReason(null)} className="text-xs">
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default DeveloperApplyLeave;
