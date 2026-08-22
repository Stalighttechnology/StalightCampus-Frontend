import { translateTerminology, getTerm } from "@/utils/institutionConfig";
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Calendar } from '../ui/calendar';
import { PopoverTrigger, Popover, PopoverContent } from '../ui/popover';
import { CalendarIcon, UserCheck, Clock, CheckCircle2, XCircle, AlertCircle, Users, ArrowRight, ShieldCheck, Eye, ChevronRight, Check } from 'lucide-react';
import { format } from 'date-fns';
import { DateRange } from 'react-day-picker';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '../ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import {
  applyLeave,
  getApplyLeaveBootstrap,
  getAlternateDutyRequests,
  alternateDutyAction,
  LeaveQuota,
  ColleagueOption,
  AlternateDutyRequestItem
} from '../../utils/faculty_api';
import { useTheme } from '@/context/ThemeContext';
import { useAuth } from '@/context/AuthContext';
import { SkeletonList } from '@/components/ui/skeleton';
import { usePagination } from '@/hooks/useOptimizations';
import Swal from 'sweetalert2';
import withReactContent from 'sweetalert2-react-content';
import { CalendarCheck2, Filter } from 'lucide-react';

const MySwal = withReactContent(Swal);

type LeaveStatus = 'Pending' | 'Approved' | 'Rejected';

const hoursOptions = ["01", "02", "03", "04", "05", "06", "07", "08", "09", "10", "11", "12"];
const minutesOptions = ["00", "05", "10", "15", "20", "25", "30", "35", "40", "45", "50", "55"];

const formatTime24h = (h12: string, m: string, period: string) => {
  let h = parseInt(h12, 10);
  if (period === 'PM' && h < 12) h += 12;
  if (period === 'AM' && h === 12) h = 0;
  return `${h.toString().padStart(2, '0')}:${m}`;
};

interface LeaveRequestDisplay {
  id: string;
  title: string;
  from?: string;
  to?: string;
  date?: string;
  leave_type?: string;
  start_time?: string | null;
  end_time?: string | null;
  is_half_day?: boolean;
  half_day_session?: string | null;
  reason: string;
  status: LeaveStatus;
  current_stage?: string;
  configured_stages?: string[];
  alternate_faculty_name?: string | null;
  alternate_duty_status?: string;
  alternate_duty_remarks?: string;
  alternate_duty_acted_at?: string;
  hod_approval_status?: string;
  hod_remarks?: string;
  hod_reviewed_by?: string;
  hod_reviewed_at?: string;
  intermediate_approval_status?: string;
  intermediate_remarks?: string;
  intermediate_reviewed_by?: string;
  intermediate_reviewed_at?: string;
  principal_approval_status?: string;
  principal_remarks?: string;
  principal_reviewed_by?: string;
  principal_reviewed_at?: string;
  appliedOn: string;
}

const LeaveRequests = React.forwardRef<HTMLDivElement, any>((props, ref) => {
  const [activeMainTab, setActiveMainTab] = useState<'apply' | 'substitute_requests'>('apply');
  const [branches, setBranches] = useState<{ id: number; name: string; }[]>([]);
  const [selectedBranch, setSelectedBranch] = useState<string>('');
  const [leaveType, setLeaveType] = useState<'casual' | 'earned' | 'rh' | 'short_permission'>('casual');
  const [isHalfDay, setIsHalfDay] = useState<boolean>(false);
  const [halfDaySession, setHalfDaySession] = useState<'forenoon' | 'afternoon'>('afternoon');
  const [selectedAlternateFaculty, setSelectedAlternateFaculty] = useState<string>('');
  const [availableColleagues, setAvailableColleagues] = useState<ColleagueOption[]>([]);
  const [permissionDate, setPermissionDate] = useState<Date | undefined>();

  // Alternate Duty requests assigned to current user
  const [substituteRequests, setSubstituteRequests] = useState<AlternateDutyRequestItem[]>([]);
  const [pendingSubstituteCount, setPendingSubstituteCount] = useState<number>(0);
  const [substituteLoading, setSubstituteLoading] = useState<boolean>(false);

  // Helper to get default initial times based on clock
  const getInitialTimes = () => {
    const now = new Date();
    let currentHour24 = now.getHours();
    let currentMinute = now.getMinutes();

    let roundedMinute = Math.ceil(currentMinute / 5) * 5;
    if (roundedMinute >= 60) {
      roundedMinute = 0;
      currentHour24 = (currentHour24 + 1) % 24;
    }

    const startHour24 = currentHour24;
    const endHour24 = (startHour24 + 2) % 24;

    const toParts = (h24: number, m: number) => {
      const period = h24 >= 12 ? 'PM' : 'AM';
      let h12 = h24 % 12;
      if (h12 === 0) h12 = 12;
      return {
        hour: h12.toString().padStart(2, '0'),
        minute: m.toString().padStart(2, '0'),
        period
      };
    };

    return {
      start: toParts(startHour24, roundedMinute),
      end: toParts(endHour24, roundedMinute)
    };
  };

  const initialTimes = getInitialTimes();
  const [startTimeParts, setStartTimeParts] = useState(initialTimes.start);
  const [endTimeParts, setEndTimeParts] = useState(initialTimes.end);
  const [leaveQuota, setLeaveQuota] = useState<LeaveQuota | null>(null);
  const [title, setTitle] = useState<string>('');
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [reason, setReason] = useState('');
  const [filterStatus, setFilterStatus] = useState<'All' | 'Pending' | 'Approved' | 'Rejected'>('All');
  const [filterOpen, setFilterOpen] = useState(false);
  const [viewReason, setViewReason] = useState<string | null>(null);
  const [selectedLeaveForFlow, setSelectedLeaveForFlow] = useState<LeaveRequestDisplay | null>(null);
  const pagination = usePagination({
    queryKey: ['facultyLeaves'],
    pageSize: 10
  });
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { theme } = useTheme();
  const { user } = useAuth();
  const userRole = user?.role || '';
  const showBranchField = userRole === 'teacher' || userRole === 'hod' || userRole === 'faculty';
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const [leaveList, setLeaveList] = useState<LeaveRequestDisplay[]>([]);

  // Fetch branches, bootstrap quotas, colleagues & leave history
  const fetchBootstrapData = () => {
    setLoading(true);
    getApplyLeaveBootstrap({ page: pagination.page, page_size: pagination.pageSize })
      .then((res) => {
        if (res.success && res.data) {
          const { leave_requests, branches, leave_quota, available_colleagues } = res.data;

          if (leave_quota) {
            setLeaveQuota(leave_quota);
          }

          if (available_colleagues) {
            setAvailableColleagues(available_colleagues);
          }

          if (branches) {
            setBranches(branches);
            if (branches.length > 0 && !selectedBranch) setSelectedBranch(branches[0].id.toString());
          }

          const transformedLeaves: LeaveRequestDisplay[] = leave_requests.map((leave: any) => {
            const mappedStatus = (leave.status === 'PENDING' ? 'Pending' :
              leave.status === 'APPROVED' ? 'Approved' :
                leave.status === 'REJECTED' ? 'Rejected' : 'Pending') as LeaveStatus;

            return {
              id: leave.id,
              title: leave.title || `Leave Request ${leave.id}`,
              from: leave.start_date,
              to: leave.end_date,
              leave_type: leave.leave_type || 'casual',
              start_time: leave.start_time,
              end_time: leave.end_time,
              is_half_day: leave.is_half_day,
              half_day_session: leave.half_day_session,
              reason: leave.reason,
              status: mappedStatus,
              current_stage: leave.current_stage,
              configured_stages: leave.configured_stages,
              alternate_faculty_name: leave.alternate_faculty_name,
              alternate_duty_status: leave.alternate_duty_status,
              alternate_duty_remarks: leave.alternate_duty_remarks,
              alternate_duty_acted_at: leave.alternate_duty_acted_at,
              hod_approval_status: leave.hod_approval_status,
              hod_remarks: leave.hod_remarks,
              hod_reviewed_by: leave.hod_reviewed_by,
              hod_reviewed_at: leave.hod_reviewed_at,
              intermediate_approval_status: leave.intermediate_approval_status,
              intermediate_remarks: leave.intermediate_remarks,
              intermediate_reviewed_by: leave.intermediate_reviewed_by,
              intermediate_reviewed_at: leave.intermediate_reviewed_at,
              principal_approval_status: leave.principal_approval_status,
              principal_remarks: leave.principal_remarks,
              principal_reviewed_by: leave.principal_reviewed_by,
              principal_reviewed_at: leave.principal_reviewed_at,
              appliedOn: leave.applied_on
            };
          });
          setLeaveList(transformedLeaves);
          pagination.updatePagination(res);
        } else {
          setError(res.message || 'Failed to load data');
        }
      })
      .catch(() => setError('Failed to load data'))
      .finally(() => setLoading(false));
  };

  // Fetch substitute duty requests
  const fetchSubstituteRequests = () => {
    setSubstituteLoading(true);
    getAlternateDutyRequests()
      .then((res) => {
        if (res.success && res.data) {
          setSubstituteRequests(res.data);
          setPendingSubstituteCount(res.pending_count || 0);
        }
      })
      .catch((err) => console.error("Error fetching substitute requests:", err))
      .finally(() => setSubstituteLoading(false));
  };

  useEffect(() => {
    fetchBootstrapData();
    fetchSubstituteRequests();
  }, [pagination.page, pagination.pageSize]);

  // Derived filtered list for UI
  const filteredLeaveList = filterStatus === 'All' ?
    leaveList :
    leaveList.filter((leave) => leave.status === filterStatus);

  const handleSubstituteAction = async (leaveId: number | string, action: 'ACCEPT' | 'DECLINE') => {
    const currentTheme = document.documentElement.classList.contains('dark') ? 'dark' : 'light';
    const actionLabel = action === 'ACCEPT' ? 'Accept Duty Takeover' : 'Decline Request';

    const { value: remarks } = await MySwal.fire({
      title: `${actionLabel}?`,
      text: action === 'ACCEPT' 
        ? 'You are accepting to cover classes/duties for this colleague during their leave period.'
        : 'Please enter remarks for declining this alternate duty request.',
      input: 'textarea',
      inputPlaceholder: 'Add optional notes or remarks...',
      showCancelButton: true,
      confirmButtonText: action === 'ACCEPT' ? 'Yes, Accept' : 'Decline',
      confirmButtonColor: action === 'ACCEPT' ? '#10b981' : '#ef4444',
      cancelButtonText: 'Cancel',
      background: currentTheme === 'dark' ? '#1c1c1e' : '#ffffff',
      color: currentTheme === 'dark' ? '#ffffff' : '#000000'
    });

    if (remarks !== undefined) {
      try {
        const res = await alternateDutyAction({
          leave_id: leaveId,
          action,
          remarks: remarks || ''
        });

        if (res.success) {
          await MySwal.fire({
            title: 'Success',
            text: res.message || `Alternate duty ${action.toLowerCase()}ed successfully.`,
            icon: 'success',
            confirmButtonColor: currentTheme === 'dark' ? 'hsl(var(--primary))' : '#3b82f6',
            background: currentTheme === 'dark' ? '#1c1c1e' : '#ffffff',
            color: currentTheme === 'dark' ? '#ffffff' : '#000000'
          });
          fetchSubstituteRequests();
        } else {
          throw new Error(res.message || 'Action failed');
        }
      } catch (err: any) {
        await MySwal.fire({
          title: 'Error',
          text: err.message || 'Failed to update substitute duty status',
          icon: 'error',
          confirmButtonColor: '#ef4444',
          background: currentTheme === 'dark' ? '#1c1c1e' : '#ffffff',
          color: currentTheme === 'dark' ? '#ffffff' : '#000000'
        });
      }
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const currentTheme = document.documentElement.classList.contains('dark') ? 'dark' : 'light';

    if (leaveType !== 'short_permission') {
      if (!title.trim() || !selectedBranch || !dateRange?.from || !dateRange?.to || !reason.trim()) {
        await MySwal.fire({
          title: 'Missing Information',
          text: 'Please provide a valid title, branch, date range, and reason.',
          icon: 'warning',
          confirmButtonColor: currentTheme === 'dark' ? 'hsl(var(--primary))' : '#3b82f6',
          background: currentTheme === 'dark' ? '#1c1c1e' : '#ffffff',
          color: currentTheme === 'dark' ? '#ffffff' : '#000000'
        });
        return;
      }

      // Rule 9.8 Client Pre-validations
      const startD = dateRange.from;
      const endD = dateRange.to;
      const diffDays = Math.ceil((endD.getTime() - startD.getTime()) / (1000 * 3600 * 24)) + 1;

      if (leaveType === 'casual' && diffDays > 3) {
        await MySwal.fire({
          title: 'CL Limit (9.8 Rule)',
          text: 'Casual Leave (CL) can be availed for a maximum of 3 days at a stretch.',
          icon: 'warning',
          confirmButtonColor: '#f59e0b',
          background: currentTheme === 'dark' ? '#1c1c1e' : '#ffffff',
          color: currentTheme === 'dark' ? '#ffffff' : '#000000'
        });
        return;
      }

      if (leaveType === 'earned' && (diffDays < 2 || diffDays > 5)) {
        await MySwal.fire({
          title: 'EL Rule (9.8 Rule)',
          text: `Earned Leave (EL) requires a minimum of 2 days and a maximum of 5 days at a stretch. Selected: ${diffDays} day(s).`,
          icon: 'warning',
          confirmButtonColor: '#f59e0b',
          background: currentTheme === 'dark' ? '#1c1c1e' : '#ffffff',
          color: currentTheme === 'dark' ? '#ffffff' : '#000000'
        });
        return;
      }

      if (leaveType === 'rh' && diffDays > 1) {
        await MySwal.fire({
          title: 'Restricted Holiday (9.8 Rule)',
          text: 'Restricted Holiday (RH) can only be availed for 1 day at a time (max 1 per month).',
          icon: 'warning',
          confirmButtonColor: '#f59e0b',
          background: currentTheme === 'dark' ? '#1c1c1e' : '#ffffff',
          color: currentTheme === 'dark' ? '#ffffff' : '#000000'
        });
        return;
      }
    } else {
      if (!title.trim() || !selectedBranch || !permissionDate || !reason.trim()) {
        await MySwal.fire({
          title: 'Missing Information',
          text: 'Please provide a valid title, branch, permission date, time slot, and reason.',
          icon: 'warning',
          confirmButtonColor: currentTheme === 'dark' ? 'hsl(var(--primary))' : '#3b82f6',
          background: currentTheme === 'dark' ? '#1c1c1e' : '#ffffff',
          color: currentTheme === 'dark' ? '#ffffff' : '#000000'
        });
        return;
      }

      // Validate Time range
      const start24 = formatTime24h(startTimeParts.hour, startTimeParts.minute, startTimeParts.period);
      const end24 = formatTime24h(endTimeParts.hour, endTimeParts.minute, endTimeParts.period);
      const [sH, sM] = start24.split(':').map(Number);
      const [eH, eM] = end24.split(':').map(Number);
      const startMinutes = sH * 60 + sM;
      const endMinutes = eH * 60 + eM;

      if (endMinutes <= startMinutes) {
        await MySwal.fire({
          title: 'Invalid Time Slot',
          text: 'End time must be later than start time.',
          icon: 'warning',
          confirmButtonColor: currentTheme === 'dark' ? 'hsl(var(--primary))' : '#3b82f6',
          background: currentTheme === 'dark' ? '#1c1c1e' : '#ffffff',
          color: currentTheme === 'dark' ? '#ffffff' : '#000000'
        });
        return;
      }

      const durationHours = (endMinutes - startMinutes) / 60;
      const maxAllowedHours = leaveQuota?.short_permission_max_hours || 2;
      if (durationHours > maxAllowedHours) {
        await MySwal.fire({
          title: 'Maximum Duration Exceeded',
          text: `Short permission cannot exceed ${maxAllowedHours} hour(s). You selected ${durationHours.toFixed(1)} hours.`,
          icon: 'warning',
          confirmButtonColor: currentTheme === 'dark' ? 'hsl(var(--primary))' : '#3b82f6',
          background: currentTheme === 'dark' ? '#1c1c1e' : '#ffffff',
          color: currentTheme === 'dark' ? '#ffffff' : '#000000'
        });
        return;
      }
    }

    setError(null);

    const startDateStr = leaveType !== 'short_permission' ? format(dateRange!.from!, "yyyy-MM-dd") : format(permissionDate!, "yyyy-MM-dd");
    const endDateStr = leaveType !== 'short_permission' ? format(dateRange!.to!, "yyyy-MM-dd") : startDateStr;
    const startTimeStr = leaveType === 'short_permission' ? formatTime24h(startTimeParts.hour, startTimeParts.minute, startTimeParts.period) : undefined;
    const endTimeStr = leaveType === 'short_permission' ? formatTime24h(endTimeParts.hour, endTimeParts.minute, endTimeParts.period) : undefined;

    const requestData = {
      title: title.trim(),
      branch_ids: [parseInt(selectedBranch)],
      start_date: startDateStr,
      end_date: endDateStr,
      reason: reason.trim(),
      leave_type: leaveType,
      start_time: startTimeStr,
      end_time: endTimeStr,
      is_half_day: leaveType === 'casual' ? isHalfDay : false,
      half_day_session: (leaveType === 'casual' && isHalfDay) ? halfDaySession : undefined,
      alternate_faculty_id: (selectedAlternateFaculty && selectedAlternateFaculty !== 'none') ? parseInt(selectedAlternateFaculty) : null
    };

    try {
      setSubmitting(true);
      const res = await applyLeave(requestData);

      if (res.success) {
        await MySwal.fire({
          title: 'Leave Request Submitted!',
          text: res.message || 'Your leave request has been submitted into the approval pipeline.',
          icon: 'success',
          confirmButtonText: 'OK',
          confirmButtonColor: currentTheme === 'dark' ? 'hsl(var(--primary))' : '#3b82f6',
          background: currentTheme === 'dark' ? '#1c1c1e' : '#ffffff',
          color: currentTheme === 'dark' ? '#ffffff' : '#000000'
        });

        // Reset form
        setTitle("");
        setDateRange(undefined);
        setPermissionDate(undefined);
        setReason("");
        setIsHalfDay(false);
        setSelectedAlternateFaculty('');

        fetchBootstrapData();
      } else {
        throw new Error(res.message || 'Failed to apply for leave');
      }
    } catch (error: any) {
      setError(error instanceof Error ? error.message : "Something went wrong. Please try again.");

      await MySwal.fire({
        title: 'Validation / Application Error',
        text: error instanceof Error ? error.message : 'Something went wrong. Please try again.',
        icon: 'error',
        confirmButtonText: 'OK',
        confirmButtonColor: '#ef4444',
        background: currentTheme === 'dark' ? '#1c1c1e' : '#ffffff',
        color: currentTheme === 'dark' ? '#ffffff' : '#000000'
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDateRangeChange = (newDateRange: DateRange | undefined) => {
    if (newDateRange && newDateRange.from && !newDateRange.to) {
      setDateRange({ from: newDateRange.from, to: newDateRange.from });
    } else {
      setDateRange(newDateRange);
    }
  };

  const renderStatus = (leave: LeaveRequestDisplay) => {
    const status = leave.status;
    const bgClass = status === 'Approved' ? 'text-emerald-700 bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-800' :
      status === 'Rejected' ? 'text-rose-700 bg-rose-100 dark:bg-rose-950/40 dark:text-rose-400 border border-rose-300 dark:border-rose-800' :
        'text-amber-700 bg-amber-100 dark:bg-amber-950/40 dark:text-amber-400 border border-amber-300 dark:border-amber-800';

    return (
      <div 
        className="flex flex-col gap-1 items-start cursor-pointer group"
        onClick={() => setSelectedLeaveForFlow(leave)}
        title="Click to view complete approval workflow pipeline"
      >
        <span className={`px-2.5 py-0.5 text-xs font-semibold rounded-full inline-flex items-center gap-1.5 transition-transform group-hover:scale-105 ${bgClass}`}>
          {status === 'Approved' && <CheckCircle2 className="w-3.5 h-3.5" />}
          {status === 'Rejected' && <XCircle className="w-3.5 h-3.5" />}
          {status === 'Pending' && <Clock className="w-3.5 h-3.5" />}
          <span>{status}</span>
        </span>

        {/* Workflow Stage Tracker Pill */}
        {status === 'Pending' && (
          <span className="text-[10px] text-muted-foreground font-medium flex items-center gap-1 group-hover:text-primary transition-colors">
            {leave.current_stage === 'alternate_duty' && '⏳ Colleague Duty Acceptance'}
            {leave.current_stage === 'hod' && '⏳ HoD Endorsement'}
            {leave.current_stage === 'dean' && '⏳ Dean Endorsement'}
            {leave.current_stage === 'admission_manager' && '⏳ Admission Manager'}
            {leave.current_stage === 'hms_admin' && '⏳ HMS Admin'}
            {leave.current_stage === 'transport_admin' && '⏳ Transport Admin'}
            {leave.current_stage === 'coe' && '⏳ COE Endorsement'}
            {leave.current_stage === 'fees_manager' && '⏳ Fees Manager'}
            {leave.current_stage === 'principal' && '⏳ Principal Sanction'}
          </span>
        )}
      </div>
    );
  };

  return (
    <>
      <style>{`
        @media (max-width: 480px) {
          .apply-leave-card { border-radius: 12px !important; }
          .apply-leave-title { font-size: 1.25rem !important; margin-bottom: 4px !important; }
          .apply-leave-desc { font-size: 0.8125rem !important; }
          .apply-leave-label { font-size: 0.875rem !important; font-weight: 600 !important; }
          .apply-leave-input { font-size: 14px !important; height: 44px !important; }
          .apply-leave-btn { height: 44px !important; font-size: 15px !important; font-weight: 600 !important; }
          .calendar-popover-content { 
            width: 92vw !important; 
            max-width: 340px !important; 
            padding: 0 !important; 
            margin: 0 auto !important;
            overflow: hidden !important;
          }
          .rdp { margin: 0 !important; width: 100% !important; }
          .rdp-months { width: 100% !important; }
          .rdp-month { width: 100% !important; }
          .rdp-table { width: 100% !important; max-width: 100% !important; }
        }
      `}</style>

      <div ref={ref} className={`space-y-6 ${theme === 'dark' ? 'bg-background text-foreground' : 'bg-gray-50 text-gray-900'}`}>
        
        {/* 9.8 Rule Quota Overview Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {/* CL Card */}
          <div className={`p-4 rounded-xl border transition-all ${theme === 'dark' ? 'bg-card border-border shadow-sm' : 'bg-white border-slate-200 shadow-sm'}`}>
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Casual Leave (CL)</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400 font-semibold">
                Max {leaveQuota?.cl_max_stretch ?? 3}d Stretch
              </span>
            </div>
            <div className="mt-2 flex items-baseline gap-1">
              <span className="text-2xl font-bold text-primary">{leaveQuota?.cl_remaining ?? 15}</span>
              <span className="text-xs text-muted-foreground">/ {leaveQuota?.cl_annual_limit ?? leaveQuota?.cl_total ?? 15} left</span>
            </div>
            <p className="mt-1 text-[11px] text-muted-foreground">Used: {leaveQuota?.cl_used ?? 0} days | Half-day (PM only)</p>
          </div>

          {/* EL Card */}
          <div className={`p-4 rounded-xl border transition-all ${theme === 'dark' ? 'bg-card border-border shadow-sm' : 'bg-white border-slate-200 shadow-sm'}`}>
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Earned Leave (EL)</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400 font-semibold">
                {leaveQuota?.el_min_stretch ?? 2} - {leaveQuota?.el_max_stretch ?? 5}d Stretch
              </span>
            </div>
            <div className="mt-2 flex items-baseline gap-1">
              <span className="text-2xl font-bold text-amber-600 dark:text-amber-400">{leaveQuota?.el_remaining ?? (leaveQuota?.el_credited_so_far ?? 15)}</span>
              <span className="text-xs text-muted-foreground">/ {leaveQuota?.el_credited_so_far ?? leaveQuota?.el_accrued_to_date ?? 15} credited</span>
            </div>
            <p className="mt-1 text-[11px] text-muted-foreground">{leaveQuota?.el_half_year_period || 'Credited: 7 in Jan, 8 in Jul (Non-accum.)'}</p>
          </div>

          {/* RH Card */}
          <div className={`p-4 rounded-xl border transition-all ${theme === 'dark' ? 'bg-card border-border shadow-sm' : 'bg-white border-slate-200 shadow-sm'}`}>
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Restricted Holiday (RH)</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400 font-semibold">
                Max {leaveQuota?.rh_monthly_limit ?? 1} / mo
              </span>
            </div>
            <div className="mt-2 flex items-baseline gap-1">
              <span className="text-2xl font-bold text-rose-600 dark:text-rose-400">{leaveQuota?.rh_remaining ?? 2}</span>
              <span className="text-xs text-muted-foreground">/ {leaveQuota?.rh_annual_limit ?? leaveQuota?.rh_total ?? 2} left</span>
            </div>
            <p className="mt-1 text-[11px] text-muted-foreground">Used this month: {leaveQuota?.rh_used_this_month ?? 0}/{leaveQuota?.rh_monthly_limit ?? 1}</p>
          </div>

          {/* Short Permission Card */}
          <div className={`p-4 rounded-xl border transition-all ${theme === 'dark' ? 'bg-card border-border shadow-sm' : 'bg-white border-slate-200 shadow-sm'}`}>
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Short Permission</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 dark:bg-purple-950/40 dark:text-purple-400 font-semibold">
                Max {leaveQuota?.short_permission_max_hours ?? leaveQuota?.sp_max_hours ?? 2}h / time
              </span>
            </div>
            <div className="mt-2 flex items-baseline gap-1">
              <span className="text-2xl font-bold text-purple-600 dark:text-purple-400">{leaveQuota?.short_permission_remaining_this_month ?? leaveQuota?.sp_remaining_this_month ?? 5}</span>
              <span className="text-xs text-muted-foreground">/ {leaveQuota?.short_permission_limit_monthly ?? leaveQuota?.sp_monthly_limit ?? 5} left</span>
            </div>
            <p className="mt-1 text-[11px] text-muted-foreground">Used this month: {leaveQuota?.short_permission_used_this_month ?? leaveQuota?.sp_used_this_month ?? 0}</p>
          </div>
        </div>

        {/* Top Header Tab Switcher (Apply Leave vs Substitute Requests) */}
        <div className="flex items-center justify-between border-b border-border pb-3">
          <div className="flex gap-2">
            <Button
              variant={activeMainTab === 'apply' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setActiveMainTab('apply')}
              className="rounded-lg text-xs sm:text-sm font-semibold"
            >
              Apply Leave & History
            </Button>
            <Button
              variant={activeMainTab === 'substitute_requests' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setActiveMainTab('substitute_requests')}
              className="rounded-lg text-xs sm:text-sm font-semibold relative"
            >
              Substitute Requests
              {pendingSubstituteCount > 0 && (
                <span className="ml-2 px-1.5 py-0.2 text-[10px] rounded-full bg-rose-500 text-white font-bold animate-pulse">
                  {pendingSubstituteCount}
                </span>
              )}
            </Button>
          </div>
        </div>

        {activeMainTab === 'substitute_requests' ? (
          /* Alternate Duty / Substitute Requests Assigned to You */
          <Card className={`border shadow-sm ${theme === 'dark' ? 'bg-card border-border' : 'bg-white border-gray-200'}`}>
            <CardHeader className="border-b">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg sm:text-xl font-semibold flex items-center gap-2">
                    <Users className="w-5 h-5 text-primary" />
                    Alternate Duty / Substitute Requests Assigned to You
                  </CardTitle>
                  <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                    Colleagues who nominated you to cover their duties while they are on leave. Accept or decline to allow their request to proceed.
                  </p>
                </div>
                <Button size="sm" variant="outline" onClick={fetchSubstituteRequests} disabled={substituteLoading}>
                  Refresh
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-4">
              {substituteLoading ? (
                <SkeletonList count={3} />
              ) : substituteRequests.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <UserCheck className="w-12 h-12 mx-auto mb-2 text-muted-foreground/40" />
                  <p className="font-semibold text-foreground">No substitute duty requests assigned</p>
                  <p className="text-xs">When a colleague nominates you for alternate duty, it will appear here.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {substituteRequests.map((req) => (
                    <div
                      key={req.id}
                      className={`p-4 rounded-xl border transition-all ${
                        req.alternate_duty_status === 'PENDING'
                          ? 'border-amber-300 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/20'
                          : 'border-border bg-card'
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-base text-foreground">{req.applicant_name}</span>
                            <span className="text-xs px-2 py-0.5 rounded bg-muted text-muted-foreground capitalize font-medium">
                              {req.applicant_role} • {req.department}
                            </span>
                          </div>
                          <div className="text-xs text-muted-foreground mt-1">
                            <span className="font-medium text-foreground">Leave Period:</span> {req.start_date} to {req.end_date}
                            {req.start_time && req.end_time && ` (${req.start_time} - ${req.end_time})`}
                            <span className="mx-2">•</span>
                            <span className="font-medium text-foreground">Type:</span> {req.leave_type.toUpperCase()}
                          </div>
                          <div className="text-xs text-muted-foreground mt-1">
                            <span className="font-medium text-foreground">Reason:</span> {req.reason}
                          </div>
                          {req.alternate_duty_remarks && (
                            <div className="text-xs text-foreground/80 mt-1 italic">
                              Remarks: {req.alternate_duty_remarks}
                            </div>
                          )}
                        </div>

                        <div className="flex items-center gap-2">
                          {req.alternate_duty_status === 'PENDING' ? (
                            <>
                              <Button
                                size="sm"
                                onClick={() => handleSubstituteAction(req.id, 'ACCEPT')}
                                className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold"
                              >
                                <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                                Accept Duty
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleSubstituteAction(req.id, 'DECLINE')}
                                className="border-rose-300 text-rose-600 hover:bg-rose-50 dark:border-rose-800 dark:hover:bg-rose-950/40 text-xs font-semibold"
                              >
                                <XCircle className="w-3.5 h-3.5 mr-1" />
                                Decline
                              </Button>
                            </>
                          ) : (
                            <span
                              className={`px-3 py-1 text-xs font-semibold rounded-full ${
                                req.alternate_duty_status === 'ACCEPTED'
                                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-400'
                                  : 'bg-rose-100 text-rose-800 dark:bg-rose-950/40 dark:text-rose-400'
                              }`}
                            >
                              {req.alternate_duty_status === 'ACCEPTED' ? 'Duty Accepted' : 'Duty Declined'}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        ) : (
          /* Main Layout: Form (Left) & Recent Applications (Right) */
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Leave Application Form - Left Side */}
            <Card id="apply-leave-form-card" className={`apply-leave-card flex flex-col h-full ${theme === 'dark' ? 'bg-card text-foreground border-border shadow-sm' : 'bg-white text-gray-900 border-gray-200 shadow-sm'}`}>
              <CardHeader className="px-4 sm:px-3 md:px-4 lg:px-6 py-4 sm:py-4 md:py-5 border-b mb-3">
                <div className="flex flex-col gap-1">
                  <CardTitle className={`tracking-tight text-xl sm:text-xl md:text-2xl font-semibold ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>
                    Leave Application Form
                  </CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-5">
                {/* Error Message */}
                {error && (
                  <div className={`p-3 rounded-lg ${theme === 'dark' ? 'bg-destructive/20 text-destructive-foreground border border-destructive' : 'bg-red-100 text-red-700 border border-red-200'}`}>
                    {error}
                  </div>
                )}

                {/* 4-way Leave Type Switcher */}
                <div className="space-y-2">
                  <Label className={`apply-leave-label ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>Leave Category <span className="text-red-500">*</span></Label>
                  <div className={`p-1 rounded-xl grid grid-cols-2 sm:grid-cols-4 gap-1 ${theme === 'dark' ? 'bg-muted/40 border border-border/60' : 'bg-slate-100 border border-slate-200'}`}>
                    <button
                      type="button"
                      onClick={() => setLeaveType('casual')}
                      className={`py-2 px-2 text-xs font-semibold rounded-lg transition-all text-center ${
                        leaveType === 'casual'
                          ? 'bg-primary text-white shadow-md'
                          : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      Casual (CL)
                    </button>
                    <button
                      type="button"
                      onClick={() => setLeaveType('earned')}
                      className={`py-2 px-2 text-xs font-semibold rounded-lg transition-all text-center ${
                        leaveType === 'earned'
                          ? 'bg-primary text-white shadow-md'
                          : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      Earned (EL)
                    </button>
                    <button
                      type="button"
                      onClick={() => setLeaveType('rh')}
                      className={`py-2 px-2 text-xs font-semibold rounded-lg transition-all text-center ${
                        leaveType === 'rh'
                          ? 'bg-primary text-white shadow-md'
                          : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      Holiday (RH)
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setLeaveType('short_permission');
                        const liveTimes = getInitialTimes();
                        setStartTimeParts(liveTimes.start);
                        setEndTimeParts(liveTimes.end);
                        if (!permissionDate) {
                          setPermissionDate(new Date());
                        }
                      }}
                      className={`py-2 px-2 text-xs font-semibold rounded-lg transition-all text-center ${
                        leaveType === 'short_permission'
                          ? 'bg-primary text-white shadow-md'
                          : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      Short Permission
                    </button>
                  </div>

                  {/* 9.8 Rule Tip */}
                  <div className="text-[11px] text-muted-foreground pt-0.5">
                    {leaveType === 'casual' && 'ℹ️ Max 3 days at a stretch. Cannot combine with other leave. Advance sanction required.'}
                    {leaveType === 'earned' && 'ℹ️ 15 days/yr (7 Jan, 8 Jul). Min 2 days and max 5 days at a stretch. Non-accumulative.'}
                    {leaveType === 'rh' && 'ℹ️ Max 2 days per year, limited to 1 day per calendar month.'}
                    {leaveType === 'short_permission' && 'ℹ️ Max 2 hours per permission, allowed up to 5 times per month.'}
                  </div>
                </div>

                {/* Half-Day Option (Only for Casual Leave per 9.8 Rules) */}
                {leaveType === 'casual' && (
                  <div className={`p-3 rounded-lg border flex flex-col sm:flex-row sm:items-center justify-between gap-2 ${theme === 'dark' ? 'bg-muted/20 border-border' : 'bg-blue-50/50 border-blue-200'}`}>
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="isHalfDayCheck"
                        checked={isHalfDay}
                        onChange={(e) => setIsHalfDay(e.target.checked)}
                        className="rounded border-gray-300 text-primary focus:ring-primary h-4 w-4"
                      />
                      <label htmlFor="isHalfDayCheck" className="text-xs font-medium text-foreground cursor-pointer">
                        Apply for Half-Day CL
                      </label>
                    </div>
                    {isHalfDay && (
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">Session:</span>
                        <span className="text-xs font-semibold px-2 py-0.5 rounded bg-primary/10 text-primary border border-primary/20">
                          Afternoon (PM Only per 9.8)
                        </span>
                      </div>
                    )}
                  </div>
                )}

                {/* Title */}
                <div className="space-y-2">
                  <Label htmlFor="title" className={`apply-leave-label ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>
                    Title / Purpose <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="title"
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g., Personal work, Family emergency, Doctor appointment"
                    disabled={submitting}
                    className={`apply-leave-input ${theme === 'dark' ? 'w-full bg-background text-foreground border-border focus:ring-primary/30' : 'w-full bg-white text-gray-900 border-gray-300 focus:ring-primary/20'}`}
                    required
                  />
                </div>

                {/* Nominate Substitute / Alternate Duty Colleague (Mandatory Step 1 in Workflow) */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className={`apply-leave-label ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>
                      Nominate Alternate Duty / Substitute Colleague
                    </Label>
                    <span className="text-[11px] text-muted-foreground">Step 1 of approval</span>
                  </div>
                  <Select
                    value={selectedAlternateFaculty}
                    onValueChange={setSelectedAlternateFaculty}
                  >
                    <SelectTrigger className={`w-full ${theme === 'dark' ? 'bg-background border-border' : 'bg-white border-gray-300'}`}>
                      <SelectValue placeholder="-- Select colleague to cover classes/responsibilities --" />
                    </SelectTrigger>
                    <SelectContent className={`max-h-[220px] ${theme === 'dark' ? 'bg-card border-border text-foreground' : ''}`}>
                      <SelectItem value="none">-- None (Direct review) --</SelectItem>
                      {availableColleagues.map((c) => (
                        <SelectItem key={c.id} value={c.id.toString()}>
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-[11px] text-muted-foreground">
                    Selected colleague will receive an invitation to accept duty arrangement before your request is routed to management.
                  </p>
                </div>

                {/* Branch Selection (Only for Faculty / Teacher / HOD) */}
                {showBranchField && (
                  <div className="space-y-2">
                    <Label className={`apply-leave-label ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>{translateTerminology("Branch")}</Label>
                    <div
                      className={`apply-leave-input ${theme === 'dark' ? 'w-full bg-muted text-muted-foreground border-border flex items-center px-3 rounded-md border text-xs sm:text-sm h-8 sm:h-9 lg:h-10' : 'w-full bg-gray-100 text-gray-500 border-gray-300 flex items-center px-3 rounded-md border text-xs sm:text-sm h-8 sm:h-9 lg:h-10'}`}>
                      {branches.length > 0 ? (branches.find((b) => b.id.toString() === selectedBranch)?.name || branches[0].name) : "No branch assigned"}
                    </div>
                  </div>
                )}

                {/* Date Selection */}
                {leaveType !== 'short_permission' ? (
                  <div className="space-y-2">
                    <Label className={`apply-leave-label ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>Date Range <span className="text-red-500">*</span></Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={`apply-leave-input ${theme === 'dark' ? 'w-full justify-start text-left font-normal bg-background text-foreground border-border hover:bg-accent hover:text-foreground' : 'w-full justify-start text-left font-normal bg-white text-gray-900 border-gray-300 hover:bg-gray-100 hover:text-gray-900'}`}>
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          <span className="truncate">
                            {dateRange?.from ? (
                              dateRange.to ? (
                                <>
                                  {format(dateRange.from, "PPP")} - {format(dateRange.to, "PPP")}
                                </>
                              ) : (
                                format(dateRange.from, "PPP")
                              )
                            ) : (
                              <span className={theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}>Pick date range</span>
                            )}
                          </span>
                        </Button>
                      </PopoverTrigger>

                      <PopoverContent
                        className="calendar-popover-content w-auto p-0 bg-background text-foreground border-border shadow-xl"
                        align="center"
                        side="bottom"
                        sideOffset={4}
                      >
                        <Calendar
                          mode="range"
                          selected={dateRange}
                          onSelect={handleDateRangeChange}
                          disabled={(date) => date < startOfToday}
                          initialFocus
                          className={theme === 'dark' ? 'rounded-md bg-background text-foreground [&_.rdp-day:hover]:bg-accent [&_.rdp-day_selected]:bg-primary [&_.rdp-day_selected]:text-primary-foreground [&_.rdp-day_disabled]:opacity-50 [&_.rdp-day_disabled]:cursor-not-allowed' : 'rounded-md bg-white text-gray-900 [&_.rdp-day:hover]:bg-gray-100 [&_.rdp-day_selected]:bg-blue-600 [&_.rdp-day_selected]:text-white [&_.rdp-day_disabled]:opacity-50 [&_.rdp-day_disabled]:cursor-not-allowed'}
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label className={`apply-leave-label ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>Permission Date <span className="text-red-500">*</span></Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className={`apply-leave-input ${theme === 'dark' ? 'w-full justify-start text-left font-normal bg-background text-foreground border-border hover:bg-accent hover:text-foreground' : 'w-full justify-start text-left font-normal bg-white text-gray-900 border-gray-300 hover:bg-gray-100 hover:text-gray-900'}`}>
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            <span className="truncate">
                              {permissionDate ? format(permissionDate, "PPP") : (
                                <span className={theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}>Select date</span>
                              )}
                            </span>
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent
                          className="calendar-popover-content w-auto p-0 bg-background text-foreground border-border shadow-xl"
                          align="center"
                          side="bottom"
                          sideOffset={4}
                        >
                          <Calendar
                            mode="single"
                            selected={permissionDate}
                            onSelect={(d) => setPermissionDate(d)}
                            disabled={(date) => date < startOfToday}
                            initialFocus
                            className={theme === 'dark' ? 'rounded-md bg-background text-foreground' : 'rounded-md bg-white text-gray-900'}
                          />
                        </PopoverContent>
                      </Popover>
                    </div>

                    {/* Time Slots Selection */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between h-5">
                          <Label className="text-xs font-semibold">Start Time <span className="text-red-500">*</span></Label>
                        </div>
                        <div className="flex gap-1.5 items-center">
                          <Select 
                            value={startTimeParts.hour} 
                            onValueChange={(v) => {
                              const newStart = { ...startTimeParts, hour: v };
                              setStartTimeParts(newStart);
                              const s24 = formatTime24h(v, newStart.minute, newStart.period);
                              const [sH] = s24.split(':').map(Number);
                              const maxH = leaveQuota?.short_permission_max_hours || 2;
                              const endH24 = (sH + maxH) % 24;
                              const period = endH24 >= 12 ? 'PM' : 'AM';
                              let h12 = endH24 % 12;
                              if (h12 === 0) h12 = 12;
                              setEndTimeParts({
                                hour: h12.toString().padStart(2, '0'),
                                minute: newStart.minute,
                                period
                              });
                            }}
                          >
                            <SelectTrigger className={`w-full h-9 text-xs ${theme === 'dark' ? 'bg-background border-border' : ''}`}>
                              <SelectValue placeholder="HH" />
                            </SelectTrigger>
                            <SelectContent className={`max-h-[180px] ${theme === 'dark' ? 'bg-card border-border text-foreground' : ''}`}>
                              {hoursOptions.map(h => (<SelectItem key={h} value={h}>{h}</SelectItem>))}
                            </SelectContent>
                          </Select>
                          <span className="text-muted-foreground font-semibold px-0.5">:</span>
                          <Select 
                            value={startTimeParts.minute} 
                            onValueChange={(v) => {
                              setStartTimeParts({ ...startTimeParts, minute: v });
                              setEndTimeParts(prev => ({ ...prev, minute: v }));
                            }}
                          >
                            <SelectTrigger className={`w-full h-9 text-xs ${theme === 'dark' ? 'bg-background border-border' : ''}`}>
                              <SelectValue placeholder="MM" />
                            </SelectTrigger>
                            <SelectContent className={`max-h-[180px] ${theme === 'dark' ? 'bg-card border-border text-foreground' : ''}`}>
                              {minutesOptions.map(m => (<SelectItem key={m} value={m}>{m}</SelectItem>))}
                            </SelectContent>
                          </Select>
                          <Select 
                            value={startTimeParts.period} 
                            onValueChange={(v) => {
                              const newStart = { ...startTimeParts, period: v };
                              setStartTimeParts(newStart);
                              const s24 = formatTime24h(newStart.hour, newStart.minute, v);
                              const [sH] = s24.split(':').map(Number);
                              const maxH = leaveQuota?.short_permission_max_hours || 2;
                              const endH24 = (sH + maxH) % 24;
                              const period = endH24 >= 12 ? 'PM' : 'AM';
                              let h12 = endH24 % 12;
                              if (h12 === 0) h12 = 12;
                              setEndTimeParts({
                                hour: h12.toString().padStart(2, '0'),
                                minute: newStart.minute,
                                period
                              });
                            }}
                          >
                            <SelectTrigger className={`w-20 h-9 text-xs flex-shrink-0 ${theme === 'dark' ? 'bg-background border-border' : ''}`}>
                              <SelectValue placeholder="AM/PM" />
                            </SelectTrigger>
                            <SelectContent className={theme === 'dark' ? 'bg-card border-border text-foreground' : ''}>
                              <SelectItem value="AM">AM</SelectItem>
                              <SelectItem value="PM">PM</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between h-5">
                          <Label className="text-xs font-semibold">End Time <span className="text-red-500">*</span></Label>
                          {(() => {
                            const s24 = formatTime24h(startTimeParts.hour, startTimeParts.minute, startTimeParts.period);
                            const e24 = formatTime24h(endTimeParts.hour, endTimeParts.minute, endTimeParts.period);
                            const [sH, sM] = s24.split(':').map(Number);
                            const [eH, eM] = e24.split(':').map(Number);
                            const startM = sH * 60 + sM;
                            const endM = eH * 60 + eM;
                            const diff = (endM - startM) / 60;
                            const maxH = leaveQuota?.short_permission_max_hours || 2;
                            if (endM <= startM) {
                              return <span className="text-[11px] text-amber-500 font-medium">Must be after start</span>;
                            } else if (diff > maxH) {
                              return <span className="text-[11px] text-red-500 font-medium">Exceeds {maxH}h ({diff.toFixed(1)}h)</span>;
                            } else {
                              return <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">Duration: {diff.toFixed(1)}h</span>;
                            }
                          })()}
                        </div>
                        <div className="flex gap-1.5 items-center">
                          <Select 
                            value={endTimeParts.hour} 
                            onValueChange={(v) => {
                              setEndTimeParts({ ...endTimeParts, hour: v });
                            }}
                          >
                            <SelectTrigger className={`w-full h-9 text-xs ${theme === 'dark' ? 'bg-background border-border' : ''}`}>
                              <SelectValue placeholder="HH" />
                            </SelectTrigger>
                            <SelectContent className={`max-h-[180px] ${theme === 'dark' ? 'bg-card border-border text-foreground' : ''}`}>
                              {hoursOptions.map(h => (<SelectItem key={h} value={h}>{h}</SelectItem>))}
                            </SelectContent>
                          </Select>
                          <span className="text-muted-foreground font-semibold">:</span>
                          <Select value={endTimeParts.minute} onValueChange={(v) => setEndTimeParts({ ...endTimeParts, minute: v })}>
                            <SelectTrigger className={`w-full h-9 text-xs ${theme === 'dark' ? 'bg-background border-border' : ''}`}>
                              <SelectValue placeholder="MM" />
                            </SelectTrigger>
                            <SelectContent className={`max-h-[180px] ${theme === 'dark' ? 'bg-card border-border text-foreground' : ''}`}>
                              {minutesOptions.map(m => (<SelectItem key={m} value={m}>{m}</SelectItem>))}
                            </SelectContent>
                          </Select>
                          <Select value={endTimeParts.period} onValueChange={(v) => setEndTimeParts({ ...endTimeParts, period: v })}>
                            <SelectTrigger className={`w-20 h-9 text-xs ${theme === 'dark' ? 'bg-background border-border' : ''}`}>
                              <SelectValue placeholder="AM/PM" />
                            </SelectTrigger>
                            <SelectContent className={theme === 'dark' ? 'bg-card border-border text-foreground' : ''}>
                              <SelectItem value="AM">AM</SelectItem>
                              <SelectItem value="PM">PM</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Reason */}
                <div className="space-y-2">
                  <Label htmlFor="reason" className={`apply-leave-label ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>Reason for Leave <span className="text-red-500">*</span></Label>
                  <Textarea
                    id="reason"
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="Please provide details and arrange substitute duties"
                    className={`apply-leave-input ${theme === 'dark' ? 'min-h-[90px] bg-background text-foreground border-border focus:ring-primary/30' : 'min-h-[90px] bg-white text-gray-900 border-gray-300 focus:ring-primary/20'}`}
                    required
                    disabled={submitting}
                  />
                </div>

                {/* Submit Button */}
                <Button
                  type="submit"
                  onClick={handleSubmit}
                  className={`apply-leave-btn ${theme === 'dark' ? 'w-full text-white bg-primary hover:bg-primary/90 border-border' : 'w-full text-white bg-primary hover:bg-primary/90 border-primary'}`}
                  disabled={submitting}
                >
                  {submitting ? "Submitting Application..." : "Submit Leave Request"}
                </Button>
              </CardContent>
            </Card>

            {/* Leave Requests List - Right Side */}
            <Card id="recent-leaves-card" className={`apply-leave-card flex flex-col h-full ${theme === 'dark' ? 'bg-card text-foreground border-border shadow-sm' : 'bg-white text-gray-900 border-gray-200 shadow-sm'}`}>
              <CardHeader className="px-4 sm:px-3 md:px-4 lg:px-6 py-4 sm:py-4 md:py-5 border-b mb-3">
                <div className="flex flex-row items-start sm:items-center justify-between gap-4 w-full">
                  <div className="flex flex-col gap-1">
                    <CardTitle className={`tracking-tight text-xl sm:text-xl md:text-2xl font-semibold ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>
                      Recent Applications & Audit Trail
                    </CardTitle>
                    <p className={`text-xs sm:text-sm ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}`}>
                      Multi-stage approval progression
                    </p>
                  </div>

                  {/* Filter Button */}
                  <div className="flex-shrink-0 mt-2 sm:mt-0">
                    <Popover open={filterOpen} onOpenChange={setFilterOpen}>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex items-center justify-center bg-primary text-white border-primary hover:bg-primary/90 hover:border-primary/90 hover:text-white transition-all duration-200 ease-in-out shadow-md h-9 w-9 sm:h-9 sm:w-auto sm:px-3 whitespace-nowrap rounded-lg"
                        >
                          <Filter className="w-4 h-4" />
                          <span className="hidden sm:inline ml-1.5 text-sm">Filter</span>
                        </Button>
                      </PopoverTrigger>

                      <PopoverContent
                        className={`w-40 sm:w-48 p-2 sm:p-3 lg:p-4 ${theme === 'dark' ? 'bg-card text-foreground border-border' : 'bg-white text-gray-900 border-gray-200'}`}
                      >
                        <div className="space-y-1 sm:space-y-2">
                          <p className={`text-[10px] sm:text-xs font-semibold uppercase tracking-wider mb-2 ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}`}>
                            Filter Status
                          </p>
                          {['All', 'Pending', 'Approved', 'Rejected'].map((status) => (
                            <Button
                              key={status}
                              variant={filterStatus === status ? "default" : "ghost"}
                              className={`w-full justify-start text-xs h-8 px-2 transition-all duration-200 ${filterStatus === status ? 'bg-primary text-white hover:bg-primary/90' : 'hover:bg-primary/10 hover:text-primary'}`}
                              onClick={() => {
                                setFilterStatus(status as any);
                                setFilterOpen(false);
                              }}
                            >
                              {status}
                            </Button>
                          ))}
                        </div>
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="flex-1 p-4 pt-2 sm:pt-0 max-h-[520px] overflow-y-auto custom-scrollbar">
                <div className="overflow-x-auto thin-scrollbar">
                  {/* Mobile View */}
                  <div className="md:hidden space-y-3">
                    {loading ? (
                      <SkeletonList count={3} />
                    ) : filteredLeaveList.length === 0 ? (
                      <div className={`flex flex-col items-center justify-center py-12 px-4 rounded-lg border-2 border-dashed ${theme === 'dark' ? 'border-border bg-card/30' : 'border-gray-200 bg-gray-50/50'}`}>
                        <CalendarCheck2 className="w-8 h-8 text-primary opacity-50 mb-2" />
                        <h3 className="text-sm font-semibold mb-1">No applications</h3>
                        <p className="text-xs text-muted-foreground text-center">No leave applications recorded.</p>
                      </div>
                    ) : (
                      filteredLeaveList.map((leave) => (
                        <div key={leave.id} className={`p-3 rounded-lg border ${theme === 'dark' ? 'bg-card border-border' : 'bg-white border-gray-200'}`}>
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <div className="font-semibold text-sm">{leave.title}</div>
                              <div className="text-xs text-muted-foreground mt-0.5">
                                {leave.from === leave.to ? leave.from : `${leave.from} to ${leave.to}`}
                                <span className="uppercase text-[10px] ml-1 font-bold text-primary">({leave.leave_type})</span>
                              </div>
                              {leave.alternate_faculty_name && (
                                <div className="text-[11px] text-muted-foreground mt-1">
                                  Substitute: <span className="text-foreground font-medium">{leave.alternate_faculty_name}</span> ({leave.alternate_duty_status})
                                </div>
                              )}
                            </div>
                            {renderStatus(leave)}
                          </div>
                          <div className="mt-3 flex gap-2">
                            <button
                              onClick={() => setSelectedLeaveForFlow(leave)}
                              className="w-full text-center text-xs font-medium py-1.5 px-3 rounded-lg border border-primary/20 text-primary bg-primary/5 hover:bg-primary/10 flex items-center justify-center gap-1.5"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              View Approval Flow & Reason
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  {/* Desktop Table View */}
                  <table className="hidden md:table w-full text-sm text-left border-collapse">
                    <thead className={`border-b ${theme === 'dark' ? 'border-border bg-card' : 'border-gray-200 bg-gray-50'}`}>
                      <tr>
                        <th className="py-2.5 px-3 text-left">Category / Title</th>
                        <th className="py-2.5 px-3 text-left">Period</th>
                        <th className="py-2.5 px-3 text-left">Substitute</th>
                        <th className="py-2.5 px-3 text-left">Status & Pipeline</th>
                        <th className="py-2.5 px-3 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {loading ? (
                        <tr>
                          <td colSpan={5} className="p-4"><SkeletonList count={3} /></td>
                        </tr>
                      ) : filteredLeaveList.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="py-16 px-4 text-center text-muted-foreground">
                            <CalendarCheck2 className="w-10 h-10 text-primary/40 mx-auto mb-2" />
                            <p className="font-semibold text-foreground">No applications found</p>
                            <p className="text-xs">Your leave application records will appear here.</p>
                          </td>
                        </tr>
                      ) : (
                        filteredLeaveList.map((leave) => (
                          <tr
                            key={leave.id}
                            className={`border-b transition-colors ${theme === 'dark' ? 'border-border hover:bg-accent/40' : 'border-gray-200 hover:bg-gray-50'}`}
                          >
                            <td className="py-3 px-3">
                              <div className="font-semibold text-sm">{leave.title}</div>
                              <div className="flex items-center gap-1 mt-0.5">
                                <span className="text-[10px] uppercase font-bold px-1.5 py-0.2 rounded bg-primary/10 text-primary">
                                  {leave.leave_type?.replace('_', ' ')}
                                </span>
                                {leave.is_half_day && (
                                  <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-400">
                                    Half-Day ({leave.half_day_session?.toUpperCase() || 'PM'})
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="py-3 px-3 text-xs">
                              <div>{leave.from === leave.to ? leave.from : `${leave.from} to ${leave.to}`}</div>
                              {leave.start_time && leave.end_time && (
                                <div className="text-muted-foreground font-mono">{leave.start_time} - {leave.end_time}</div>
                              )}
                            </td>
                            <td className="py-3 px-3 text-xs">
                              {leave.alternate_faculty_name ? (
                                <div>
                                  <div className="font-medium text-foreground">{leave.alternate_faculty_name}</div>
                                  <span className={`text-[10px] font-semibold px-1 rounded ${
                                    leave.alternate_duty_status === 'ACCEPTED'
                                      ? 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30'
                                      : leave.alternate_duty_status === 'DECLINED'
                                      ? 'text-rose-600 bg-rose-50 dark:bg-rose-950/30'
                                      : 'text-amber-600 bg-amber-50 dark:bg-amber-950/30'
                                  }`}>
                                    {leave.alternate_duty_status || 'PENDING'}
                                  </span>
                                </div>
                              ) : (
                                <span className="text-muted-foreground italic">None nominated</span>
                              )}
                            </td>
                            <td className="py-3 px-3">
                              {renderStatus(leave)}
                            </td>
                            <td className="py-3 px-3 text-right">
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-xs h-7 px-2.5 flex items-center gap-1 ml-auto border-primary/30 text-primary hover:bg-primary/10"
                                onClick={() => setSelectedLeaveForFlow(leave)}
                              >
                                <Eye className="w-3 h-3" />
                                View Flow
                              </Button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
              {pagination.paginationState.totalPages > 1 && (
                <CardFooter className="flex flex-col sm:flex-row justify-between items-center gap-4 text-xs text-muted-foreground px-6 py-3 border-t border-border mt-auto">
                  <div>
                    Showing {pagination.paginationState.totalItems === 0 ? 0 : (pagination.page - 1) * pagination.pageSize + 1} to {Math.min(pagination.page * pagination.pageSize, pagination.paginationState.totalItems)} of {pagination.paginationState.totalItems} applications
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => pagination.goToPage(Math.max(1, pagination.page - 1))}
                      disabled={pagination.page === 1 || loading}
                      className="h-8 px-3 text-xs"
                    >
                      Previous
                    </Button>
                    <span className="text-xs font-semibold px-1">{pagination.page}</span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => pagination.goToPage(Math.min(pagination.paginationState.totalPages, pagination.page + 1))}
                      disabled={pagination.page >= pagination.paginationState.totalPages || loading}
                      className="h-8 px-3 text-xs"
                    >
                      Next
                    </Button>
                  </div>
                </CardFooter>
              )}
            </Card>
          </div>
        )}

        {/* Detailed Approval Flow & Reason Modal */}
        <Dialog open={!!selectedLeaveForFlow} onOpenChange={(open) => !open && setSelectedLeaveForFlow(null)}>
          <DialogContent className={theme === 'dark' ? 'bg-card text-foreground border border-border max-w-[95%] sm:max-w-xl mx-auto rounded-xl p-5 sm:p-6 max-h-[90vh] overflow-y-auto' : 'bg-white text-gray-900 border border-gray-200 max-w-[95%] sm:max-w-xl mx-auto rounded-xl p-5 sm:p-6 max-h-[90vh] overflow-y-auto'}>
            <DialogHeader>
              <div className="flex items-center justify-between gap-2 pr-4">
                <DialogTitle className="text-base sm:text-lg font-bold flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-primary" />
                  Leave Approval Workflow Flow
                </DialogTitle>
              </div>
            </DialogHeader>

            {selectedLeaveForFlow && (
              <div className="space-y-5 mt-3">
                {/* Application Summary Header Card */}
                <div className={`p-3.5 rounded-xl border ${theme === 'dark' ? 'bg-muted/20 border-border' : 'bg-slate-50 border-slate-200'}`}>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <h4 className="font-semibold text-sm text-foreground">{selectedLeaveForFlow.title}</h4>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {selectedLeaveForFlow.from === selectedLeaveForFlow.to ? selectedLeaveForFlow.from : `${selectedLeaveForFlow.from} to ${selectedLeaveForFlow.to}`}
                        {selectedLeaveForFlow.start_time && selectedLeaveForFlow.end_time && ` • ${selectedLeaveForFlow.start_time} - ${selectedLeaveForFlow.end_time}`}
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-primary/10 text-primary">
                        {selectedLeaveForFlow.leave_type?.replace('_', ' ')}
                      </span>
                      {selectedLeaveForFlow.is_half_day && (
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-400">
                          Half-Day ({selectedLeaveForFlow.half_day_session?.toUpperCase() || 'PM'})
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Role-Based Sequential Approval Pipeline Flow */}
                <div>
                  <h5 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-1.5">
                    <span>Approval Pipeline</span>
                    <span className="text-[10px] lowercase font-normal opacity-70">(Role-Based Routing)</span>
                  </h5>

                  <div className="relative pl-6 space-y-4 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-border">
                    {/* Stage 0: Alternate Colleague Duty */}
                    {selectedLeaveForFlow.alternate_faculty_name && (
                      <div className="relative group">
                        <div className={`absolute -left-6 top-1 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                          selectedLeaveForFlow.alternate_duty_status === 'ACCEPTED'
                            ? 'bg-emerald-500 text-white'
                            : selectedLeaveForFlow.alternate_duty_status === 'DECLINED'
                            ? 'bg-rose-500 text-white'
                            : selectedLeaveForFlow.current_stage === 'alternate_duty'
                            ? 'bg-amber-500 text-white ring-4 ring-amber-500/20 animate-pulse'
                            : 'bg-muted text-muted-foreground'
                        }`}>
                          {selectedLeaveForFlow.alternate_duty_status === 'ACCEPTED' ? <Check className="w-3 h-3" /> : '1'}
                        </div>
                        <div className={`p-3 rounded-lg border text-xs ${
                          selectedLeaveForFlow.current_stage === 'alternate_duty' && selectedLeaveForFlow.status === 'Pending'
                            ? 'border-amber-500/50 bg-amber-500/5 shadow-sm'
                            : theme === 'dark' ? 'bg-card border-border' : 'bg-white border-gray-200'
                        }`}>
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-semibold text-foreground">Alternate Duty Colleague</span>
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              selectedLeaveForFlow.alternate_duty_status === 'ACCEPTED'
                                ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400'
                                : selectedLeaveForFlow.alternate_duty_status === 'DECLINED'
                                ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400'
                                : 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400'
                            }`}>
                              {selectedLeaveForFlow.alternate_duty_status || 'PENDING'}
                            </span>
                          </div>
                          <p className="text-muted-foreground mt-1">
                            Nominated: <span className="font-medium text-foreground">{selectedLeaveForFlow.alternate_faculty_name}</span>
                          </p>
                          {selectedLeaveForFlow.alternate_duty_acted_at && (
                            <p className="text-[10px] text-muted-foreground mt-0.5">
                              Acted on: {selectedLeaveForFlow.alternate_duty_acted_at}
                            </p>
                          )}
                          {selectedLeaveForFlow.alternate_duty_remarks && (
                            <p className="text-[11px] mt-1 p-1.5 rounded bg-muted/30 italic">
                              "{selectedLeaveForFlow.alternate_duty_remarks}"
                            </p>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Sequential Stages (HOD / Dean / Section Head / Principal) */}
                    {(selectedLeaveForFlow.configured_stages && selectedLeaveForFlow.configured_stages.length > 0 
                      ? selectedLeaveForFlow.configured_stages.filter(s => s !== 'alternate_duty')
                      : ['hod', 'principal']
                    ).map((stageKey, idx) => {
                      const stageNumber = (selectedLeaveForFlow.alternate_faculty_name ? 2 : 1) + idx;
                      const isCurrentStage = selectedLeaveForFlow.current_stage === stageKey && selectedLeaveForFlow.status === 'Pending';
                      
                      let stageTitle = stageKey === 'hod' ? 'Head of Department (HOD)' :
                        stageKey === 'dean' ? 'Dean' :
                        stageKey === 'principal' ? 'Principal (Final Sanction)' :
                        stageKey === 'admission_manager' ? 'Admission Manager' :
                        stageKey === 'hms_admin' ? 'HMS Admin' :
                        stageKey === 'transport_admin' ? 'Transport Admin' :
                        stageKey === 'coe' ? 'Controller of Examination (COE)' :
                        stageKey === 'fees_manager' ? 'Fees Manager' :
                        stageKey.replace('_', ' ').toUpperCase();

                      let statusBadge = 'PENDING';
                      let reviewerName = null;
                      let reviewTime = null;
                      let remarks = null;

                      if (stageKey === 'hod') {
                        statusBadge = selectedLeaveForFlow.hod_approval_status || 'PENDING';
                        reviewerName = selectedLeaveForFlow.hod_reviewed_by;
                        reviewTime = selectedLeaveForFlow.hod_reviewed_at;
                        remarks = selectedLeaveForFlow.hod_remarks;
                      } else if (stageKey === 'principal') {
                        statusBadge = selectedLeaveForFlow.principal_approval_status || 'PENDING';
                        reviewerName = selectedLeaveForFlow.principal_reviewed_by;
                        reviewTime = selectedLeaveForFlow.principal_reviewed_at;
                        remarks = selectedLeaveForFlow.principal_remarks;
                      } else {
                        statusBadge = selectedLeaveForFlow.intermediate_approval_status || 'PENDING';
                        reviewerName = selectedLeaveForFlow.intermediate_reviewed_by;
                        reviewTime = selectedLeaveForFlow.intermediate_reviewed_at;
                        remarks = selectedLeaveForFlow.intermediate_remarks;
                      }

                      const isApproved = statusBadge === 'APPROVED' || statusBadge === 'Approved';
                      const isRejected = statusBadge === 'REJECTED' || statusBadge === 'Rejected';

                      return (
                        <div key={stageKey} className="relative group">
                          <div className={`absolute -left-6 top-1 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                            isApproved
                              ? 'bg-emerald-500 text-white'
                              : isRejected
                              ? 'bg-rose-500 text-white'
                              : isCurrentStage
                              ? 'bg-amber-500 text-white ring-4 ring-amber-500/20 animate-pulse'
                              : 'bg-muted text-muted-foreground'
                          }`}>
                            {isApproved ? <Check className="w-3 h-3" /> : stageNumber}
                          </div>
                          <div className={`p-3 rounded-lg border text-xs ${
                            isCurrentStage
                              ? 'border-amber-500/50 bg-amber-500/5 shadow-sm'
                              : theme === 'dark' ? 'bg-card border-border' : 'bg-white border-gray-200'
                          }`}>
                            <div className="flex items-center justify-between gap-2">
                              <span className="font-semibold text-foreground flex items-center gap-1.5">
                                <span>{stageTitle}</span>
                                {isCurrentStage && (
                                  <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400">
                                    Current Stage
                                  </span>
                                )}
                              </span>
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                isApproved
                                  ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400'
                                  : isRejected
                                  ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400'
                                  : isCurrentStage
                                  ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400'
                                  : 'bg-muted text-muted-foreground'
                              }`}>
                                {isApproved ? 'APPROVED' : isRejected ? 'REJECTED' : 'PENDING'}
                              </span>
                            </div>

                            {reviewerName && (
                              <p className="text-muted-foreground mt-1">
                                Reviewed by: <span className="font-medium text-foreground">{reviewerName}</span>
                              </p>
                            )}

                            {reviewTime && (
                              <p className="text-[10px] text-muted-foreground mt-0.5">
                                Reviewed on: {reviewTime}
                              </p>
                            )}

                            {remarks && (
                              <p className="text-[11px] mt-1 p-1.5 rounded bg-muted/30 italic">
                                "{remarks}"
                              </p>
                            )}

                            {isCurrentStage && (
                              <p className="text-[11px] font-medium text-amber-600 dark:text-amber-400 mt-1 flex items-center gap-1">
                                <Clock className="w-3 h-3 animate-spin" />
                                Application is currently awaiting action from this authority.
                              </p>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Application Reason & Notes */}
                <div>
                  <h5 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
                    Application Reason
                  </h5>
                  <div className={`p-3 text-xs leading-relaxed whitespace-pre-wrap break-words max-h-36 overflow-y-auto rounded-lg border ${theme === 'dark' ? 'text-foreground bg-muted/20 border-border' : 'text-gray-900 bg-gray-50 border-gray-200'}`}>
                    {selectedLeaveForFlow.reason || 'No reason provided.'}
                  </div>
                </div>

                {/* Footer Controls */}
                <div className="flex justify-end pt-2 border-t border-border">
                  <Button
                    variant="outline"
                    onClick={() => setSelectedLeaveForFlow(null)}
                    className="text-white bg-primary border border-primary hover:bg-primary/90 text-xs h-8 px-4"
                  >
                    Close
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* View Reason Dialog */}
        <Dialog open={!!viewReason} onOpenChange={() => setViewReason(null)}>
          <DialogContent className={theme === 'dark' ? 'bg-card text-foreground border border-border max-w-[90%] sm:max-w-md mx-auto rounded-xl p-4 sm:p-6' : 'bg-white text-gray-900 border border-gray-200 max-w-[90%] sm:max-w-md mx-auto rounded-xl p-4 sm:p-6'}>
            <DialogHeader>
              <DialogTitle className={theme === 'dark' ? 'text-foreground' : 'text-gray-900'}>Application Reason</DialogTitle>
            </DialogHeader>

            <div className={`p-3 text-sm leading-relaxed whitespace-pre-wrap break-words max-h-64 overflow-y-auto rounded-md ${theme === 'dark' ? 'text-foreground bg-muted/20' : 'text-gray-900 bg-gray-50'}`}>
              {viewReason}
            </div>

            <div className="flex justify-end mt-4">
              <Button
                variant="outline"
                onClick={() => setViewReason(null)}
                className="text-white bg-primary border border-primary hover:bg-primary/90"
              >
                Close
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </>
  );
});

export default LeaveRequests;