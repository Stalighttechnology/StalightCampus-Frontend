import { translateTerminology, getTerm } from "@/utils/institutionConfig";
import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Calendar } from '../ui/calendar';
import { Checkbox } from '../ui/checkbox';
import { PopoverTrigger, Popover, PopoverContent } from '../ui/popover';
import { CalendarIcon, UserCheck, Clock, CheckCircle2, XCircle, AlertCircle, Users, ArrowRight, ShieldCheck, Eye, ChevronRight, Check, FileText, Upload, Paperclip, ExternalLink, Image as ImageIcon, X, Search, CheckSquare, Square } from 'lucide-react';
import { format, isSameDay } from 'date-fns';
import { DateRange } from 'react-day-picker';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '../ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../ui/dialog';
import {
  applyLeave,
  getApplyLeaveBootstrap,
  getFacultyLeaveRequests,
  getFacultyLeaveDetails,
  getAvailableColleagues,
  getAlternateDutyRequests,
  alternateDutyAction,
  renominateAlternateFaculty,
  uploadOdCompletionCertificate,
  LeaveQuota,
  ColleagueOption,
  AlternateDutyRequestItem
} from '../../utils/faculty_api';
import { useTheme } from '@/context/ThemeContext';
import { useAuth } from '@/context/AuthContext';
import { SkeletonList, SkeletonTable } from '@/components/ui/skeleton';
import { usePagination } from '@/hooks/useOptimizations';
import Swal from 'sweetalert2';
import withReactContent from 'sweetalert2-react-content';
import { CalendarCheck2, Filter } from 'lucide-react';

const MySwal = withReactContent(Swal);

type LeaveStatus = 'Pending' | 'Approved' | 'Rejected';

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

const getSubstituteStatusBadge = (status: string, currentTheme: string) => {
  const norm = (status || 'PENDING').toUpperCase();
  switch (norm) {
    case "PENDING":
      return <span className={`px-3 py-1 rounded-full text-xs font-medium ${currentTheme === 'dark' ? 'bg-yellow-900/50 text-yellow-200 border border-yellow-800' : 'bg-yellow-100 text-yellow-800 border border-yellow-200'}`}>Pending</span>;
    case "ACCEPTED":
    case "APPROVE":
    case "APPROVED":
      return <span className={`px-3 py-1 rounded-full text-xs font-medium ${currentTheme === 'dark' ? 'bg-emerald-950/50 text-emerald-300 border border-emerald-800' : 'bg-emerald-100 text-emerald-800 border border-emerald-200'}`}>Accepted</span>;
    case "DECLINED":
    case "REJECTED":
    case "REJECT":
      return <span className={`px-3 py-1 rounded-full text-xs font-medium ${currentTheme === 'dark' ? 'bg-rose-950/50 text-rose-300 border border-rose-800' : 'bg-rose-100 text-rose-800 border border-rose-200'}`}>Declined</span>;
    default:
      return <span className={`px-3 py-1 rounded-full text-xs font-medium ${currentTheme === 'dark' ? 'bg-gray-800 text-gray-200' : 'bg-gray-100 text-gray-700'}`}>{status}</span>;
  }
};

const renderSubstituteCategoryBadge = (leaveType: string, isHalfDay?: boolean, halfDaySession?: string | null, odCategory?: string | null) => {
  const normalizedType = (leaveType || 'casual').toLowerCase();

  let label = 'Casual (CL)';
  let colorClass = 'bg-blue-100 text-blue-800 dark:bg-blue-950/40 dark:text-blue-300';

  if (normalizedType === 'od' || normalizedType === 'on_duty') {
    label = 'On Duty (OD)';
    colorClass = 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300';
  } else if (normalizedType === 'short_permission') {
    label = 'Short Permission';
    colorClass = 'bg-purple-100 text-purple-800 dark:bg-purple-950/40 dark:text-purple-300';
  } else if (normalizedType === 'earned' || normalizedType === 'el') {
    label = 'Earned (EL)';
    colorClass = 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950/40 dark:text-indigo-300';
  } else if (normalizedType === 'vacation') {
    label = 'Vacation Leave';
    colorClass = 'bg-purple-100 text-purple-800 dark:bg-purple-950/40 dark:text-purple-300';
  } else if (normalizedType === 'rh' || normalizedType === 'restricted_holiday') {
    label = 'Holiday (RH)';
    colorClass = 'bg-rose-100 text-rose-800 dark:bg-rose-950/40 dark:text-rose-300';
  } else if (normalizedType === 'maternity' || normalizedType === 'ml') {
    label = 'Maternity (ML)';
    colorClass = 'bg-pink-100 text-pink-800 dark:bg-pink-950/40 dark:text-pink-300';
  }

  const showHalfDay = Boolean(isHalfDay || normalizedType === 'half_day');
  const sessionNormalized = (halfDaySession || '').toLowerCase();
  const sessionText = (sessionNormalized === 'forenoon' || sessionNormalized === 'morning') ? 'Morning' : 'Afternoon';

  return (
    <div className="flex flex-wrap items-center gap-1 mt-1">
      <span className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded w-fit ${colorClass}`}>
        {label}
      </span>
      {odCategory && (
        <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 w-fit">
          OD: {odCategory.replace(/_/g, ' ').toUpperCase()}
        </span>
      )}
      {showHalfDay && (
        <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300 w-fit">
          Half-Day ({sessionText})
        </span>
      )}
    </div>
  );
};

const hoursOptions = ["01", "02", "03", "04", "05", "06", "07", "08", "09", "10", "11", "12"];
const minutesOptions = ["00", "05", "10", "15", "20", "25", "30", "35", "40", "45", "50", "55"];

const parseTimeToMinutes = (timeStr: string | undefined, defaultMinutes: number) => {
  if (!timeStr) return defaultMinutes;
  const match = timeStr.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)?$/i);
  if (!match) return defaultMinutes;
  let h = parseInt(match[1], 10);
  const m = parseInt(match[2], 10);
  const period = match[3] ? match[3].toUpperCase() : null;
  if (period === 'PM' && h < 12) h += 12;
  if (period === 'AM' && h === 12) h = 0;
  return h * 60 + m;
};

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
  od_purpose_category?: string;
  initial_document_url?: string | null;
  completion_document_url?: string | null;
  od_completion_verified?: boolean;
  od_completion_verified_by?: string | null;
  od_completion_verified_at?: string | null;
  od_completion_remarks?: string;
  alternate_faculty_name?: string | null;
  alternate_duty_status?: string;
  alternate_duty_remarks?: string;
  alternate_duty_acted_at?: string;
  substitute_assignments?: Array<{
    id: number | string;
    name: string;
    role?: string;
    status: string;
    remarks?: string;
    acted_at?: string;
  }>;
  total_substitutes?: number;
  accepted_substitutes?: number;
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
  const [activeMainTab, setActiveMainTab] = useState<'apply' | 'substitute_requests'>(() => {
    if (typeof window !== 'undefined') {
      const searchParams = new URLSearchParams(window.location.search);
      const tabParam = searchParams.get('tab') || searchParams.get('leave_tab');
      if (tabParam === 'substitute_requests' || tabParam === 'substitute' || tabParam === 'substitutes') {
        return 'substitute_requests';
      }
    }
    return 'apply';
  });

  useEffect(() => {
    const handleSetLeaveTab = (e: any) => {
      if (e.detail?.tab === 'substitute_requests' || e.detail?.tab === 'apply') {
        setActiveMainTab(e.detail.tab);
      }
    };
    window.addEventListener('stalightcampus_set_leave_tab', handleSetLeaveTab);
    return () => window.removeEventListener('stalightcampus_set_leave_tab', handleSetLeaveTab);
  }, []);
  const [branches, setBranches] = useState<{ id: number; name: string; branch_code?: string; }[]>([]);
  const [userBranch, setUserBranch] = useState<{ id: number; name: string; branch_code?: string; } | null>(null);
  const [selectedBranch, setSelectedBranch] = useState<string>('');
  const [selectedSubstituteBranch, setSelectedSubstituteBranch] = useState<string>('');
  const [leaveType, setLeaveType] = useState<'casual' | 'earned' | 'od' | 'vacation' | 'rh' | 'maternity' | 'short_permission'>('casual');
  const [odPurposeCategory, setOdPurposeCategory] = useState<string>('conference_symposia');
  const [customOdPurpose, setCustomOdPurpose] = useState<string>('');
  const [initialDocFile, setInitialDocFile] = useState<File | null>(null);
  const [docPreviewUrl, setDocPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [isHalfDay, setIsHalfDay] = useState<boolean>(false);
  const [halfDaySession, setHalfDaySession] = useState<'forenoon' | 'afternoon'>('afternoon');
  const [targetRole, setTargetRole] = useState<string>('');
  const [selectedAlternateFaculty, setSelectedAlternateFaculty] = useState<string>('');
  const [selectedAlternateFaculties, setSelectedAlternateFaculties] = useState<string[]>([]);
  const [colleagueSearchQuery, setColleagueSearchQuery] = useState<string>('');
  const [availableColleagues, setAvailableColleagues] = useState<ColleagueOption[]>([]);
  const [colleaguesLoading, setColleaguesLoading] = useState<boolean>(false);
  const [permissionDate, setPermissionDate] = useState<Date | undefined>();

  // Post-OD Certificate Upload state
  const [uploadCertModalOpen, setUploadCertModalOpen] = useState<boolean>(false);
  const [targetOdLeave, setTargetOdLeave] = useState<LeaveRequestDisplay | null>(null);
  const [completionCertFile, setCompletionCertFile] = useState<File | null>(null);
  const [certPreviewUrl, setCertPreviewUrl] = useState<string | null>(null);
  const certFileInputRef = useRef<HTMLInputElement | null>(null);
  const [uploadingCert, setUploadingCert] = useState<boolean>(false);

  useEffect(() => {
    if (initialDocFile && (initialDocFile.type.startsWith('image/') || ['jpg', 'jpeg', 'png'].includes(initialDocFile.name.split('.').pop()?.toLowerCase() || ''))) {
      const url = URL.createObjectURL(initialDocFile);
      setDocPreviewUrl(url);
      return () => URL.revokeObjectURL(url);
    } else {
      setDocPreviewUrl(null);
    }
  }, [initialDocFile]);

  useEffect(() => {
    if (completionCertFile && (completionCertFile.type.startsWith('image/') || ['jpg', 'jpeg', 'png'].includes(completionCertFile.name.split('.').pop()?.toLowerCase() || ''))) {
      const url = URL.createObjectURL(completionCertFile);
      setCertPreviewUrl(url);
      return () => URL.revokeObjectURL(url);
    } else {
      setCertPreviewUrl(null);
    }
  }, [completionCertFile]);

  // Alternate Duty requests assigned to current user
  const [substituteRequests, setSubstituteRequests] = useState<AlternateDutyRequestItem[]>([]);
  const [pendingSubstituteCount, setPendingSubstituteCount] = useState<number>(0);
  const [substituteLoading, setSubstituteLoading] = useState<boolean>(false);
  const [substitutePage, setSubstitutePage] = useState<number>(1);
  const [substituteTotalPages, setSubstituteTotalPages] = useState<number>(1);
  const [substituteTotalCount, setSubstituteTotalCount] = useState<number>(0);
  const [substituteStatusFilter, setSubstituteStatusFilter] = useState<string>("All");
  const [substituteViewReason, setSubstituteViewReason] = useState<string | null>(null);

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
  const [isRenominating, setIsRenominating] = useState<boolean>(false);
  const [renominateRole, setRenominateRole] = useState<string>('');
  const [renominateBranch, setRenominateBranch] = useState<string>('');
  const [newColleagueId, setNewColleagueId] = useState<string>('');
  const [renominateColleagueIds, setRenominateColleagueIds] = useState<string[]>([]);
  const [renominateSearchQuery, setRenominateSearchQuery] = useState<string>('');
  const [renominatingLoading, setRenominatingLoading] = useState<boolean>(false);
  const [renominateColleagues, setRenominateColleagues] = useState<ColleagueOption[]>([]);
  const [renominateColleaguesLoading, setRenominateColleaguesLoading] = useState<boolean>(false);
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
  const isStageZero = Boolean(
    leaveQuota && (
      leaveQuota.num_stages === 0 ||
      (Array.isArray(leaveQuota.workflow_stages) && (
        leaveQuota.workflow_stages.length === 0 ||
        (leaveQuota.workflow_stages.length === 1 && (leaveQuota.workflow_stages[0] === 'auto_approve' || leaveQuota.workflow_stages[0] === 'none'))
      )) ||
      (userRole === 'principal' && (!leaveQuota.workflow_stages || leaveQuota.workflow_stages.length === 0 || leaveQuota.num_stages === 0))
    )
  ) || (userRole === 'principal' && !leaveQuota);

  useEffect(() => {
    if (isStageZero) {
      setTargetRole('none');
      setSelectedAlternateFaculty('');
      setSelectedAlternateFaculties([]);
      setSelectedSubstituteBranch('');
    }
  }, [isStageZero]);

  // Dynamically fetch colleagues on-demand when substitute role and branch are selected
  useEffect(() => {
    if (!targetRole || targetRole === 'none' || isStageZero) {
      setAvailableColleagues([]);
      return;
    }
    const requiresBranch = targetRole === 'faculty' || targetRole === 'teacher' || targetRole === 'hod';
    if (requiresBranch && !selectedSubstituteBranch) {
      setAvailableColleagues([]);
      return;
    }

    setColleaguesLoading(true);
    getAvailableColleagues({
      role: targetRole,
      branch_id: selectedSubstituteBranch || undefined
    })
      .then((res) => {
        if (res.success && Array.isArray(res.data)) {
          setAvailableColleagues(res.data);
        } else {
          setAvailableColleagues([]);
        }
      })
      .catch((err) => {
        console.error("Error fetching colleagues:", err);
        setAvailableColleagues([]);
      })
      .finally(() => setColleaguesLoading(false));
  }, [targetRole, selectedSubstituteBranch, isStageZero]);

  // Dynamically fetch colleagues for re-nomination modal
  useEffect(() => {
    if (!renominateRole) {
      setRenominateColleagues([]);
      return;
    }
    const requiresBranch = renominateRole === 'faculty' || renominateRole === 'teacher' || renominateRole === 'hod';
    if (requiresBranch && !renominateBranch) {
      setRenominateColleagues([]);
      return;
    }

    setRenominateColleaguesLoading(true);
    getAvailableColleagues({
      role: renominateRole,
      branch_id: renominateBranch || undefined
    })
      .then((res) => {
        if (res.success && Array.isArray(res.data)) {
          setRenominateColleagues(res.data);
        } else {
          setRenominateColleagues([]);
        }
      })
      .catch((err) => {
        console.error("Error fetching renominate colleagues:", err);
        setRenominateColleagues([]);
      })
      .finally(() => setRenominateColleaguesLoading(false));
  }, [renominateRole, renominateBranch]);

  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const [leaveList, setLeaveList] = useState<LeaveRequestDisplay[]>([]);

  // Fetch branches, bootstrap quotas & policy rules in one call
  const fetchBootstrapData = () => {
    getApplyLeaveBootstrap()
      .then((res) => {
        if (res.success && res.data) {
          const { branches, faculty_branch, leave_quota, available_colleagues } = res.data;

          if (leave_quota) {
            setLeaveQuota(leave_quota);
            const sessionRule = leave_quota.policy_rules?.casual_leave?.half_day_session || 'afternoon_only';
            if (sessionRule === 'forenoon_only' || sessionRule === 'morning_only') {
              setHalfDaySession('forenoon');
            } else if (sessionRule === 'afternoon_only') {
              setHalfDaySession('afternoon');
            }

            // Auto-switch current leaveType if disabled
            const isClOn = leave_quota.cl_is_enabled !== false && leave_quota.policy_rules?.casual_leave?.is_enabled !== false;
            const isOdOn = leave_quota.od_is_enabled !== false && leave_quota.policy_rules?.on_duty?.is_enabled !== false && leave_quota.is_od_eligible !== false;
            const isElOn = leave_quota.el_is_enabled !== false && leave_quota.policy_rules?.earned_leave?.is_enabled !== false && leave_quota.is_el_eligible !== false;
            const isVacOn = leave_quota.vacation_is_enabled !== false && leave_quota.policy_rules?.vacation_leave?.is_enabled !== false && leave_quota.is_vacation_eligible === true;
            const isRhOn = leave_quota.rh_is_enabled !== false && leave_quota.policy_rules?.restricted_holiday?.is_enabled !== false;
            const isMatOn = leave_quota.maternity_is_enabled !== false && leave_quota.policy_rules?.maternity_leave?.is_enabled !== false && leave_quota.is_maternity_eligible === true;
            const isSpOn = leave_quota.sp_is_enabled !== false && leave_quota.policy_rules?.short_permission?.is_enabled !== false;

            setLeaveType((prevType: any) => {
              if (prevType === 'casual' && !isClOn) {
                if (isSpOn) return 'short_permission';
                if (isOdOn) return 'od';
                if (isElOn) return 'earned';
                if (isVacOn) return 'vacation';
                if (isRhOn) return 'rh';
                if (isMatOn) return 'maternity';
              }
              return prevType;
            });

            const isZero = leave_quota.num_stages === 0 ||
              (Array.isArray(leave_quota.workflow_stages) && (
                leave_quota.workflow_stages.length === 0 ||
                (leave_quota.workflow_stages.length === 1 && (leave_quota.workflow_stages[0] === 'auto_approve' || leave_quota.workflow_stages[0] === 'none'))
              )) ||
              (userRole === 'principal' && (!leave_quota.workflow_stages || leave_quota.workflow_stages.length === 0 || leave_quota.num_stages === 0));

            if (isZero) {
              setTargetRole('none');
              setSelectedAlternateFaculty('');
              setSelectedSubstituteBranch('');
            }
          }

          if (branches) {
            setBranches(branches);
          }

          if (faculty_branch) {
            setUserBranch(faculty_branch);
            setSelectedBranch(faculty_branch.id.toString());
          } else if (branches && branches.length > 0 && !selectedBranch) {
            setSelectedBranch(branches[0].id.toString());
          }
        }
      })
      .catch((err) => console.error("Error fetching bootstrap data:", err));
  };

  // Dedicated separate backend call for Leave History
  const fetchLeaveHistory = (page: number = pagination.page, pageSize: number = pagination.pageSize) => {
    setLoading(true);
    getFacultyLeaveRequests({ page, page_size: pageSize })
      .then((res: any) => {
        if (res.success && res.data) {
          const rawLeaves = Array.isArray(res.data) ? res.data : (Array.isArray(res.data.leave_requests) ? res.data.leave_requests : []);
          const transformedLeaves: LeaveRequestDisplay[] = rawLeaves.map((leave: any) => {
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
              od_purpose_category: leave.od_purpose_category,
              initial_document_url: leave.initial_document_url,
              completion_document_url: leave.completion_document_url,
              od_completion_verified: leave.od_completion_verified,
              od_completion_verified_by: leave.od_completion_verified_by,
              od_completion_verified_at: leave.od_completion_verified_at,
              od_completion_remarks: leave.od_completion_remarks,
              alternate_faculty_name: leave.alternate_faculty_name,
              alternate_duty_status: leave.alternate_duty_status,
              alternate_duty_remarks: leave.alternate_duty_remarks,
              alternate_duty_acted_at: leave.alternate_duty_acted_at,
              substitute_assignments: leave.substitute_assignments || [],
              total_substitutes: leave.total_substitutes || (leave.substitute_assignments?.length ?? (leave.alternate_faculty_name ? 1 : 0)),
              accepted_substitutes: leave.accepted_substitutes || (leave.substitute_assignments?.filter((s: any) => s.status === 'ACCEPTED').length ?? (leave.alternate_duty_status === 'ACCEPTED' ? 1 : 0)),
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
          setLeaveList([]);
        }
      })
      .catch((err) => {
        console.error("Error fetching leave requests:", err);
        setLeaveList([]);
      })
      .finally(() => setLoading(false));
  };

  // Fetch substitute duty requests
  const fetchSubstituteRequests = (page: number = substitutePage, status: string = substituteStatusFilter) => {
    setSubstituteLoading(true);
    getAlternateDutyRequests({ page, page_size: 10, status: status !== 'All' ? status : undefined })
      .then((res: any) => {
        if (res.success && res.data) {
          const rawList = Array.isArray(res.data)
            ? res.data
            : (Array.isArray(res.data.requests) ? res.data.requests : []);
          setSubstituteRequests(rawList);
          const count = res.pending_count ?? (res.data?.pending_count ?? rawList.filter((r: any) => r.alternate_duty_status === 'PENDING').length);
          setPendingSubstituteCount(count);
          setSubstituteTotalCount(res.count ?? rawList.length);
          setSubstituteTotalPages(res.total_pages ?? 1);
          setSubstitutePage(res.current_page ?? page);
          window.dispatchEvent(new CustomEvent('substitute-requests-updated', {
            detail: { pending_count: count }
          }));
        } else {
          setSubstituteRequests([]);
        }
      })
      .catch((err) => {
        console.error("Error fetching substitute requests:", err);
        setSubstituteRequests([]);
      })
      .finally(() => setSubstituteLoading(false));
  };

  const fetchPendingSubstituteCountOnly = () => {
    getAlternateDutyRequests({ count_only: true })
      .then((res: any) => {
        if (res && res.success) {
          const count = res.pending_count ?? (res.data?.pending_count ?? 0);
          setPendingSubstituteCount(typeof count === 'number' ? count : 0);
        }
      })
      .catch((err) => console.error("Error fetching pending substitute count:", err));
  };

  useEffect(() => {
    fetchBootstrapData();
    fetchPendingSubstituteCountOnly();

    const handleLeavesUpdated = () => {
      fetchPendingSubstituteCountOnly();
    };

    window.addEventListener('leaves-updated', handleLeavesUpdated);
    return () => {
      window.removeEventListener('leaves-updated', handleLeavesUpdated);
    };
  }, []);

  useEffect(() => {
    fetchLeaveHistory(pagination.page, pagination.pageSize);
  }, [pagination.page, pagination.pageSize]);

  useEffect(() => {
    if (activeMainTab === 'substitute_requests') {
      fetchSubstituteRequests(substitutePage, substituteStatusFilter);
    }
  }, [activeMainTab, substitutePage, substituteStatusFilter]);

  const [detailsLoading, setDetailsLoading] = useState<boolean>(false);

  // Dedicated separate backend call for a specific leave request's details & approval flow
  const handleOpenLeaveDetails = async (leave: LeaveRequestDisplay) => {
    setSelectedLeaveForFlow(leave);
    setDetailsLoading(true);
    try {
      const res = await getFacultyLeaveDetails(leave.id);
      if (res.success && res.data) {
        const d = res.data;
        const mappedStatus = (d.status === 'PENDING' ? 'Pending' :
          d.status === 'APPROVED' ? 'Approved' :
            d.status === 'REJECTED' ? 'Rejected' : 'Pending') as LeaveStatus;

        setSelectedLeaveForFlow({
          id: d.id,
          title: d.title || `Leave Request ${d.id}`,
          from: d.start_date,
          to: d.end_date,
          leave_type: d.leave_type || 'casual',
          start_time: d.start_time,
          end_time: d.end_time,
          is_half_day: d.is_half_day,
          half_day_session: d.half_day_session,
          reason: d.reason,
          status: mappedStatus,
          current_stage: d.current_stage,
          configured_stages: d.configured_stages,
          od_purpose_category: d.od_purpose_category,
          initial_document_url: d.initial_document_url,
          completion_document_url: d.completion_document_url,
          od_completion_verified: d.od_completion_verified,
          od_completion_verified_by: d.od_completion_verified_by,
          od_completion_verified_at: d.od_completion_verified_at,
          od_completion_remarks: d.od_completion_remarks,
          alternate_faculty_name: d.alternate_faculty_name,
          alternate_duty_status: d.alternate_duty_status,
          alternate_duty_remarks: d.alternate_duty_remarks,
          alternate_duty_acted_at: d.alternate_duty_acted_at,
          substitute_assignments: d.substitute_assignments || [],
          total_substitutes: d.total_substitutes || (d.substitute_assignments?.length ?? (d.alternate_faculty_name ? 1 : 0)),
          accepted_substitutes: d.accepted_substitutes || (d.substitute_assignments?.filter((s: any) => s.status === 'ACCEPTED').length ?? (d.alternate_duty_status === 'ACCEPTED' ? 1 : 0)),
          hod_approval_status: d.hod_approval_status,
          hod_remarks: d.hod_remarks,
          hod_reviewed_by: d.hod_reviewed_by,
          hod_reviewed_at: d.hod_reviewed_at,
          intermediate_approval_status: d.intermediate_approval_status,
          intermediate_remarks: d.intermediate_remarks,
          intermediate_reviewed_by: d.intermediate_reviewed_by,
          intermediate_reviewed_at: d.intermediate_reviewed_at,
          principal_approval_status: d.principal_approval_status,
          principal_remarks: d.principal_remarks,
          principal_reviewed_by: d.principal_reviewed_by,
          principal_reviewed_at: d.principal_reviewed_at,
          appliedOn: d.applied_on
        });
      }
    } catch (err) {
      console.error("Error fetching leave details:", err);
    } finally {
      setDetailsLoading(false);
    }
  };

  // Start re-nomination in modal with clean cascading states
  const handleStartRenominating = () => {
    setIsRenominating(true);
    setRenominateRole('');
    setRenominateBranch('');
    setNewColleagueId('');
    setRenominateColleagueIds([]);
    setRenominateSearchQuery('');
    setRenominateColleagues([]);
  };

  // Cascading fetch for re-nomination colleague dropdown
  useEffect(() => {
    if (!isRenominating || !renominateRole || renominateRole === 'none') {
      setRenominateColleagues([]);
      return;
    }
    const isBranchRole = renominateRole === 'faculty' || renominateRole === 'teacher' || renominateRole === 'hod';
    if (isBranchRole && !renominateBranch) {
      setRenominateColleagues([]);
      return;
    }
    setRenominateColleaguesLoading(true);
    getAvailableColleagues({ role: renominateRole, branch_id: renominateBranch })
      .then((res) => {
        if (res.success && res.data) {
          setRenominateColleagues(res.data);
        } else {
          setRenominateColleagues([]);
        }
      })
      .catch((err) => {
        console.error("Error fetching colleagues for re-nomination:", err);
        setRenominateColleagues([]);
      })
      .finally(() => setRenominateColleaguesLoading(false));
  }, [isRenominating, renominateRole, renominateBranch]);

  // Handle re-nominating substitute colleague(s) if declined/pending
  const handleRenominateColleague = async () => {
    if (!selectedLeaveForFlow) return;
    const targetIds = renominateColleagueIds.length > 0 ? renominateColleagueIds : (newColleagueId ? [newColleagueId] : []);
    if (targetIds.length === 0) return;

    setRenominatingLoading(true);
    try {
      const res = await renominateAlternateFaculty({
        leave_id: selectedLeaveForFlow.id,
        alternate_faculty_id: targetIds[0],
        alternate_faculty_ids: targetIds
      } as any);
      if (res.success) {
        await MySwal.fire({
          title: 'Substitute(s) Re-Nominated!',
          text: res.message || 'New colleague(s) nominated. In-app notifications have been sent for duty acceptance.',
          icon: 'success',
          confirmButtonText: 'OK',
          confirmButtonColor: theme === 'dark' ? 'hsl(var(--primary))' : '#3b82f6',
          background: theme === 'dark' ? '#1c1c1e' : '#ffffff',
          color: theme === 'dark' ? '#ffffff' : '#000000'
        });

        const pool = renominateColleagues.length > 0 ? renominateColleagues : availableColleagues;
        const newColleaguesObj = pool.filter(c => targetIds.includes(String(c.id)));
        const newNames = newColleaguesObj.length > 0 ? newColleaguesObj.map(c => c.name).join(', ') : 'Nominated Colleague(s)';

        const newAssignments = newColleaguesObj.map(c => ({
          id: c.id,
          name: c.name,
          role: c.role,
          status: 'PENDING'
        }));

        setSelectedLeaveForFlow(prev => prev ? ({
          ...prev,
          alternate_faculty_name: newNames,
          alternate_duty_status: 'PENDING',
          alternate_duty_acted_at: undefined,
          alternate_duty_remarks: undefined,
          substitute_assignments: newAssignments,
          total_substitutes: newAssignments.length,
          accepted_substitutes: 0,
          current_stage: 'alternate_duty',
          status: 'Pending'
        }) : null);

        setLeaveList(prev => prev.map(l => l.id === selectedLeaveForFlow.id ? ({
          ...l,
          alternate_faculty_name: newNames,
          alternate_duty_status: 'PENDING',
          alternate_duty_acted_at: undefined,
          alternate_duty_remarks: undefined,
          substitute_assignments: newAssignments,
          total_substitutes: newAssignments.length,
          accepted_substitutes: 0,
          current_stage: 'alternate_duty',
          status: 'Pending'
        }) : l));

        setIsRenominating(false);
        setNewColleagueId('');
        setRenominateColleagueIds([]);
        window.dispatchEvent(new CustomEvent('leaves-updated'));
        fetchBootstrapData();
      } else {
        throw new Error(res.message || 'Failed to re-nominate colleague(s)');
      }
    } catch (err: any) {
      await MySwal.fire({
        title: 'Error',
        text: err.message || 'Could not re-nominate colleague.',
        icon: 'error',
        confirmButtonText: 'OK',
        confirmButtonColor: theme === 'dark' ? 'hsl(var(--primary))' : '#3b82f6',
        background: theme === 'dark' ? '#1c1c1e' : '#ffffff',
        color: theme === 'dark' ? '#ffffff' : '#000000'
      });
    } finally {
      setRenominatingLoading(false);
    }
  };

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
          window.dispatchEvent(new CustomEvent('leaves-updated'));
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
    const branchRequired = showBranchField && branches.length > 0;

    if (leaveType !== 'short_permission') {
      if (!title.trim() || (branchRequired && !selectedBranch) || !dateRange?.from || !dateRange?.to || !reason.trim()) {
        await MySwal.fire({
          title: 'Missing Information',
          text: branchRequired
            ? 'Please provide a valid title, branch, date range, and reason.'
            : 'Please provide a valid title, date range, and reason.',
          icon: 'warning',
          confirmButtonColor: currentTheme === 'dark' ? 'hsl(var(--primary))' : '#3b82f6',
          background: currentTheme === 'dark' ? '#1c1c1e' : '#ffffff',
          color: currentTheme === 'dark' ? '#ffffff' : '#000000'
        });
        return;
      }

      // Real-time Timing Enforcement for Today's Half-Day Leave
      if (leaveType === 'casual' && isHalfDay && isSameDay(dateRange.from, new Date())) {
        const now = new Date();
        const currentM = now.getHours() * 60 + now.getMinutes();
        const fnEndStr = leaveQuota?.policy_rules?.casual_leave?.forenoon_end_time || '12:00 PM';
        const anEndStr = leaveQuota?.policy_rules?.casual_leave?.afternoon_end_time || '05:00 PM';
        const fnEndM = parseTimeToMinutes(fnEndStr, 12 * 60);
        const anEndM = parseTimeToMinutes(anEndStr, 17 * 60);

        if (halfDaySession === 'forenoon' && currentM >= fnEndM) {
          await MySwal.fire({
            title: 'Session Cut-off Passed',
            text: `Cannot apply for today's Morning half-day session as the cut-off time (${fnEndStr}) has already passed.`,
            icon: 'warning',
            confirmButtonText: 'OK',
            confirmButtonColor: '#ef4444',
            background: currentTheme === 'dark' ? '#1c1c1e' : '#ffffff',
            color: currentTheme === 'dark' ? '#ffffff' : '#000000'
          });
          return;
        }

        if (halfDaySession === 'afternoon' && currentM >= anEndM) {
          await MySwal.fire({
            title: 'Session Closed for Today',
            text: `Cannot apply for today's Afternoon half-day session as the closing time (${anEndStr}) has already passed.`,
            icon: 'warning',
            confirmButtonText: 'OK',
            confirmButtonColor: '#ef4444',
            background: currentTheme === 'dark' ? '#1c1c1e' : '#ffffff',
            color: currentTheme === 'dark' ? '#ffffff' : '#000000'
          });
          return;
        }
      }

      // Rule 9.8 Client Pre-validations
      const startD = dateRange.from;
      const endD = dateRange.to;
      const diffDays = Math.ceil((endD.getTime() - startD.getTime()) / (1000 * 3600 * 24)) + 1;

      if (leaveType === 'casual' && diffDays > (leaveQuota?.cl_max_stretch ?? 3)) {
        await MySwal.fire({
          title: 'Casual Leave Stretch Limit',
          text: `Casual Leave (CL) can be availed for a maximum of ${leaveQuota?.cl_max_stretch ?? 3} days at a stretch.`,
          icon: 'warning',
          confirmButtonColor: '#f59e0b',
          background: currentTheme === 'dark' ? '#1c1c1e' : '#ffffff',
          color: currentTheme === 'dark' ? '#ffffff' : '#000000'
        });
        return;
      }

      if (leaveType === 'earned') {
        const minStretch = leaveQuota?.el_min_stretch ?? 2;
        const maxStretch = leaveQuota?.el_max_stretch ?? 5;
        if (diffDays < minStretch || diffDays > maxStretch) {
          await MySwal.fire({
            title: 'Earned Leave Stretch Limit',
            text: `Earned Leave (EL) requires a minimum of ${minStretch} days and a maximum of ${maxStretch} days at a stretch. Selected: ${diffDays} day(s).`,
            icon: 'warning',
            confirmButtonColor: '#f59e0b',
            background: currentTheme === 'dark' ? '#1c1c1e' : '#ffffff',
            color: currentTheme === 'dark' ? '#ffffff' : '#000000'
          });
          return;
        }
      }

      if (leaveType === 'rh' && diffDays > 1) {
        await MySwal.fire({
          title: 'Restricted Holiday Limit',
          text: 'Restricted Holiday (RH) can only be availed for 1 day at a time (max 1 per month).',
          icon: 'warning',
          confirmButtonColor: '#f59e0b',
          background: currentTheme === 'dark' ? '#1c1c1e' : '#ffffff',
          color: currentTheme === 'dark' ? '#ffffff' : '#000000'
        });
        return;
      }

      if (leaveType === 'maternity' && diffDays > (leaveQuota?.maternity_annual_limit ?? 90)) {
        await MySwal.fire({
          title: 'Maternity Leave Limit',
          text: `Maternity leave cannot exceed ${leaveQuota?.maternity_annual_limit ?? 90} days per year. Selected: ${diffDays} days.`,
          icon: 'warning',
          confirmButtonColor: '#f59e0b',
          background: currentTheme === 'dark' ? '#1c1c1e' : '#ffffff',
          color: currentTheme === 'dark' ? '#ffffff' : '#000000'
        });
        return;
      }

      if (leaveType === 'od' && odPurposeCategory === 'other' && !customOdPurpose.trim()) {
        await MySwal.fire({
          title: 'Specify Custom OD Purpose',
          text: 'Please type the specific purpose for your On Duty (OD) application.',
          icon: 'warning',
          confirmButtonColor: '#f59e0b',
          background: currentTheme === 'dark' ? '#1c1c1e' : '#ffffff',
          color: currentTheme === 'dark' ? '#ffffff' : '#000000'
        });
        return;
      }
    } else {
      if (!title.trim() || (branchRequired && !selectedBranch) || !permissionDate || !reason.trim()) {
        await MySwal.fire({
          title: 'Missing Information',
          text: branchRequired
            ? 'Please provide a valid title, branch, permission date, time slot, and reason.'
            : 'Please provide a valid title, permission date, time slot, and reason.',
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

    if (initialDocFile) {
      const ext = initialDocFile.name.split('.').pop()?.toLowerCase() || '';
      if (!['jpg', 'jpeg', 'png', 'pdf', 'doc', 'docx'].includes(ext)) {
        await MySwal.fire({
          title: 'Unsupported File Format',
          text: 'For images, only JPG and PNG formats are allowed (documents: PDF, DOC, DOCX).',
          icon: 'warning',
          confirmButtonColor: '#f59e0b',
          background: currentTheme === 'dark' ? '#1c1c1e' : '#ffffff',
          color: currentTheme === 'dark' ? '#ffffff' : '#000000'
        });
        return;
      }
      if (initialDocFile.size > 1024 * 1024) {
        await MySwal.fire({
          title: 'Attachment Too Large',
          text: `The attached document (${(initialDocFile.size / (1024 * 1024)).toFixed(2)} MB) must be less than 1 MB. Please upload a compressed document under 1 MB.`,
          icon: 'warning',
          confirmButtonColor: '#f59e0b',
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

    const isTeachingRole = userRole === 'teacher' || userRole === 'hod' || userRole === 'faculty';
    const branchIdToSubmit = (isTeachingRole && selectedBranch) ? parseInt(selectedBranch) : (userBranch ? userBranch.id : undefined);

    const requestData: any = {
      title: title.trim(),
      branch_id: branchIdToSubmit,
      branch_ids: branchIdToSubmit ? [branchIdToSubmit] : undefined,
      start_date: startDateStr,
      end_date: endDateStr,
      reason: reason.trim(),
      leave_type: leaveType,
      start_time: startTimeStr,
      end_time: endTimeStr,
      is_half_day: leaveType === 'casual' ? isHalfDay : false,
      half_day_session: (leaveType === 'casual' && isHalfDay) ? halfDaySession : undefined,
      alternate_faculty_id: (selectedAlternateFaculties.length > 0)
        ? parseInt(selectedAlternateFaculties[0])
        : ((selectedAlternateFaculty && selectedAlternateFaculty !== 'none') ? parseInt(selectedAlternateFaculty) : null),
      alternate_faculty_ids: selectedAlternateFaculties.length > 0
        ? selectedAlternateFaculties.map(id => parseInt(id))
        : ((selectedAlternateFaculty && selectedAlternateFaculty !== 'none') ? [parseInt(selectedAlternateFaculty)] : []),
      od_purpose_category: leaveType === 'od' ? odPurposeCategory : undefined,
    };

    if (leaveType === 'od') {
      const finalOdPurpose = odPurposeCategory === 'other'
        ? (customOdPurpose.trim() ? `Other: ${customOdPurpose.trim()}` : 'Other')
        : odPurposeCategory;
      requestData.od_purpose_category = finalOdPurpose;
    }
    if (initialDocFile) {
      requestData.document = initialDocFile;
    }

    const odCategoryDisplayMap: Record<string, string> = {
      'conference_symposia': 'Conference / Seminar / Symposia',
      'workshop_fdp': 'Workshop / FDP',
      'exam_valuation_duty': 'Valuation / Examination Duty',
      'phd_doctoral_work': 'Ph.D Research / Doctoral Work',
      'university_statutory_duty': 'Official / Statutory / University Duty',
      'other': customOdPurpose.trim() ? `Other (${customOdPurpose.trim()})` : 'Other Custom Duty',
    };

    const typeLabel =
      leaveType === 'short_permission' ? 'Short Permission' :
        leaveType === 'earned' ? 'Earned Leave (EL)' :
          leaveType === 'od' ? `On Duty (OD) - ${odCategoryDisplayMap[odPurposeCategory] || odPurposeCategory.replace(/_/g, ' ').toUpperCase()}` :
            leaveType === 'vacation' ? 'Vacation Leave' :
              leaveType === 'maternity' ? 'Maternity Leave' :
                leaveType === 'rh' ? 'Restricted Holiday (RH)' :
                  (isHalfDay ? `Casual Leave (CL) - Half Day (${halfDaySession === 'forenoon' ? 'Morning' : 'Afternoon'})` : 'Casual Leave (CL)');

    const dateDisplay = leaveType === 'short_permission'
      ? `${format(permissionDate!, 'MMM dd, yyyy')} (${startTimeParts.hour}:${startTimeParts.minute} ${startTimeParts.period} - ${endTimeParts.hour}:${endTimeParts.minute} ${endTimeParts.period})`
      : (isSameDay(dateRange!.from!, dateRange!.to!)
        ? format(dateRange!.from!, 'MMM dd, yyyy')
        : `${format(dateRange!.from!, 'MMM dd, yyyy')} to ${format(dateRange!.to!, 'MMM dd, yyyy')}`);

    const selectedSubstituteObjs = availableColleagues.filter(c =>
      selectedAlternateFaculties.includes(c.id.toString()) ||
      (selectedAlternateFaculty && selectedAlternateFaculty !== 'none' && c.id.toString() === selectedAlternateFaculty)
    );

    const getColleagueLabel = (c: ColleagueOption) => {
      const parts: string[] = [];
      if (c.role) {
        parts.push(c.role.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()));
      }
      if (c.department) {
        parts.push(c.department);
      }
      const detailStr = parts.length > 0 ? ` (${parts.join(' - ')})` : '';
      return `${c.name}${detailStr}`;
    };

    const substituteDisplayHtml = selectedSubstituteObjs.length > 0
      ? selectedSubstituteObjs.length === 1
        ? `<div style="margin-bottom: 6px;"><strong>Substitute Faculty:</strong> <span>${getColleagueLabel(selectedSubstituteObjs[0])}</span></div>`
        : `<div style="margin-bottom: 6px;"><strong>Substitute Faculty (${selectedSubstituteObjs.length}):</strong>
            <div style="margin-top: 4px; padding-left: 8px; display: flex; flex-direction: column; gap: 4px;">
              ${selectedSubstituteObjs.map(s => `<div style="display: flex; align-items: baseline; gap: 6px;"><span style="color: ${currentTheme === 'dark' ? '#60a5fa' : '#2563eb'}; font-weight: bold;">•</span><span>${getColleagueLabel(s)}</span></div>`).join('')}
            </div>
          </div>`
      : '';

    const confirmResult = await MySwal.fire({
      title: 'Confirm Leave Request?',
      html: `
        <div style="text-align: left; font-size: 13.5px; line-height: 1.6; margin-top: 8px;">
          <div style="margin-bottom: 6px;"><strong>Category:</strong> <span style="color: ${currentTheme === 'dark' ? '#60a5fa' : '#2563eb'}; font-weight: 600;">${typeLabel}</span></div>
          <div style="margin-bottom: 6px;"><strong>Period / Time:</strong> <span>${dateDisplay}</span></div>
          <div style="margin-bottom: 6px;"><strong>Title:</strong> <span>${title.trim()}</span></div>
          ${initialDocFile ? `<div style="margin-bottom: 6px;"><strong>Attached Document:</strong> <span>${initialDocFile.name}</span></div>` : ''}
          ${substituteDisplayHtml}
          <div style="margin-top: 12px; padding-top: 8px; border-top: 1px dashed ${currentTheme === 'dark' ? '#374151' : '#e5e7eb'}; font-size: 13px; opacity: 0.9;">
            ${isStageZero
          ? 'This leave request will be <strong>auto-approved immediately for records</strong> without requiring approvals.'
          : 'Are you sure you want to submit this leave application for approval?'}
          </div>
        </div>
      `,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: isStageZero ? 'Yes, Apply Leave' : 'Yes, Submit Request',
      cancelButtonText: 'Cancel',
      confirmButtonColor: currentTheme === 'dark' ? 'hsl(var(--primary))' : '#3b82f6',
      cancelButtonColor: '#6b7280',
      background: currentTheme === 'dark' ? '#1c1c1e' : '#ffffff',
      color: currentTheme === 'dark' ? '#ffffff' : '#000000'
    });

    if (!confirmResult.isConfirmed) {
      return;
    }

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
        setTargetRole('');
        setSelectedSubstituteBranch('');
        setSelectedAlternateFaculty('');
        setInitialDocFile(null);

        window.dispatchEvent(new CustomEvent('leaves-updated'));
        fetchBootstrapData();
        fetchLeaveHistory();
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
    if (isHalfDay && newDateRange?.from) {
      setDateRange({ from: newDateRange.from, to: newDateRange.from });
    } else if (newDateRange && newDateRange.from && !newDateRange.to) {
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
        className="flex flex-col gap-0.5 items-start cursor-pointer group"
        onClick={() => handleOpenLeaveDetails(leave)}
        title="Click to view complete approval workflow pipeline"
      >
        <span className={`px-2.5 py-0.5 text-[11px] font-semibold rounded-full inline-flex items-center justify-center gap-1 transition-transform group-hover:scale-105 ${bgClass} shrink-0 whitespace-nowrap min-w-[86px]`}>
          {status === 'Approved' && <CheckCircle2 className="w-3 h-3" />}
          {status === 'Rejected' && <XCircle className="w-3 h-3" />}
          {status === 'Pending' && <Clock className="w-3 h-3" />}
          <span>{status}</span>
        </span>

        {/* Workflow Stage Tracker Pill */}
        {status === 'Pending' && (
          <span className="text-[10px] text-muted-foreground font-medium flex items-center gap-1 group-hover:text-primary transition-colors whitespace-nowrap">
            {leave.current_stage === 'alternate_duty' && '⏳ Colleague Duty'}
            {leave.current_stage === 'hod' && '⏳ HoD Endorsement'}
            {leave.current_stage === 'dean' && '⏳ Dean Endorsement'}
            {leave.current_stage === 'admission_manager' && '⏳ Admission Mgr'}
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

  const renderCategoryBadge = (leave: LeaveRequestDisplay) => {
    const type = leave.leave_type?.toLowerCase() || '';
    let name = 'Leave';
    let style = 'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 border-blue-200 dark:border-blue-800';

    if (type === 'casual' || type === 'cl') {
      name = 'Casual Leave (CL)';
      style = 'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 border-blue-200 dark:border-blue-800';
    } else if (type === 'od' || type === 'on_duty') {
      name = 'On Duty (OD)';
      style = 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800';
    } else if (type === 'earned' || type === 'el') {
      name = 'Earned Leave (EL)';
      style = 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800';
    } else if (type === 'vacation') {
      name = 'Vacation Leave';
      style = 'bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300 border-purple-200 dark:border-purple-800';
    } else if (type === 'rh' || type === 'restricted_holiday') {
      name = 'Restricted Holiday (RH)';
      style = 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border-amber-200 dark:border-amber-800';
    } else if (type === 'maternity' || type === 'ml') {
      name = 'Maternity Leave (ML)';
      style = 'bg-pink-50 text-pink-700 dark:bg-pink-950/40 dark:text-pink-300 border-pink-200 dark:border-pink-800';
    } else if (type === 'short_permission') {
      name = 'Short Permission';
      style = 'bg-cyan-50 text-cyan-700 dark:bg-cyan-950/40 dark:text-cyan-300 border-cyan-200 dark:border-cyan-800';
    } else {
      name = type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    }

    return (
      <div className="space-y-1">
        <span className={`inline-flex items-center text-xs font-semibold px-2 py-0.5 rounded-md border ${style} whitespace-nowrap`}>
          {name}
        </span>
        {leave.od_purpose_category && (
          <div>
            <span className="inline-flex text-[10px] font-medium px-1.5 py-0.5 rounded bg-emerald-50/80 text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-300 border border-emerald-200/80 dark:border-emerald-800/60 whitespace-nowrap">
              OD: {leave.od_purpose_category.replace(/_/g, ' ').toUpperCase()}
            </span>
          </div>
        )}
        {leave.is_half_day && (
          <div>
            <span className="inline-flex text-[10px] font-medium px-1.5 py-0.5 rounded bg-amber-50/80 text-amber-800 dark:bg-amber-950/30 dark:text-amber-300 border border-amber-200/80 dark:border-amber-800/60 whitespace-nowrap">
              Half-Day ({leave.half_day_session?.toLowerCase() === 'forenoon' || leave.half_day_session?.toLowerCase() === 'morning' ? 'Morning' : 'Afternoon'})
            </span>
          </div>
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

        {/* Academic Year Cycle Header Banner */}
        <div className="flex flex-wrap items-center justify-between gap-2 px-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
              <CalendarCheck2 className="w-4 h-4 text-primary" />
              Academic Leave Cycle:
            </span>
            <span className="text-xs font-mono font-semibold px-2.5 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
              AY {leaveQuota?.academic_year_label || `${new Date().getFullYear()} - ${new Date().getFullYear() + 1}`}
            </span>
          </div>
          <span className="text-[11px] text-muted-foreground font-medium">
            {leaveQuota?.academic_year_start_date && leaveQuota?.academic_year_end_date ? (
              <>Cycle Window: {leaveQuota.academic_year_start_date} to {leaveQuota.academic_year_end_date} (12 Months)</>
            ) : (
              <>Annual leave balances reset per Institutional Academic Cycle</>
            )}
          </span>
        </div>

        {/* 9.8 Rule Quota Overview Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {/* CL Card */}
          {leaveQuota?.cl_is_enabled !== false && leaveQuota?.policy_rules?.casual_leave?.is_enabled !== false && (
            <div className={`p-4 rounded-xl border transition-all ${theme === 'dark' ? 'bg-card border-border shadow-sm' : 'bg-white border-slate-200 shadow-sm'}`}>
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Casual Leave (CL)</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400 font-semibold whitespace-nowrap shrink-0">
                  Max {leaveQuota?.cl_max_stretch ?? leaveQuota?.policy_rules?.casual_leave?.max_stretch_days ?? 3}d Stretch
                </span>
              </div>
              <div className="mt-2 flex items-baseline gap-1">
                <span className="text-2xl font-semibold text-primary">{leaveQuota?.cl_remaining ?? (leaveQuota?.cl_annual_limit ?? leaveQuota?.cl_total ?? leaveQuota?.policy_rules?.casual_leave?.annual_quota ?? 15)}</span>
                <span className="text-xs text-muted-foreground">/ {leaveQuota?.cl_annual_limit ?? leaveQuota?.cl_total ?? leaveQuota?.policy_rules?.casual_leave?.annual_quota ?? 15} left</span>
              </div>
              <p className="mt-1 text-[11px] text-muted-foreground">
                Used: {leaveQuota?.cl_used ?? 0} days | {leaveQuota?.policy_rules?.casual_leave?.allow_half_day === false ? 'No Half-Day' : (leaveQuota?.policy_rules?.casual_leave?.half_day_session === 'forenoon_only' ? 'Half-day (Morning only)' : (leaveQuota?.policy_rules?.casual_leave?.half_day_session === 'both' ? 'Half-day (Morning / Afternoon)' : 'Half-day (Afternoon only)'))}
              </p>
            </div>
          )}

          {/* On Duty (OD) Card */}
          {leaveQuota?.od_is_enabled !== false && leaveQuota?.policy_rules?.on_duty?.is_enabled !== false && leaveQuota?.is_od_eligible !== false && (
            <div className={`p-4 rounded-xl border transition-all ${theme === 'dark' ? 'bg-card border-border shadow-sm' : 'bg-white border-slate-200 shadow-sm'}`}>
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">On Duty (OD)</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 font-semibold whitespace-nowrap shrink-0">
                  Duty Deputation
                </span>
              </div>
              <div className="mt-2 flex items-baseline gap-1">
                <span className="text-2xl font-semibold text-emerald-600 dark:text-emerald-400">{leaveQuota?.od_total_approved_days ?? 0}</span>
                <span className="text-xs text-muted-foreground">days availed</span>
              </div>
              <p className="mt-1 text-[11px] text-muted-foreground">
                {leaveQuota?.od_pending_certificates_count && leaveQuota.od_pending_certificates_count > 0 ? (
                  <span className="text-amber-500 font-semibold">⚠️ {leaveQuota.od_pending_certificates_count} attendance cert(s) pending</span>
                ) : 'Post-OD certificate upload required'}
              </p>
            </div>
          )}

          {/* EL Card (if eligible) */}
          {leaveQuota?.el_is_enabled !== false && leaveQuota?.policy_rules?.earned_leave?.is_enabled !== false && leaveQuota?.is_el_eligible !== false && (
            <div className={`p-4 rounded-xl border transition-all ${theme === 'dark' ? 'bg-card border-border shadow-sm' : 'bg-white border-slate-200 shadow-sm'}`}>
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Earned Leave (EL)</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400 font-semibold whitespace-nowrap shrink-0">
                  {leaveQuota?.el_min_stretch ?? leaveQuota?.policy_rules?.earned_leave?.min_stretch_days ?? 2} - {leaveQuota?.el_max_stretch ?? leaveQuota?.policy_rules?.earned_leave?.max_stretch_days ?? 5}d Stretch
                </span>
              </div>
              <div className="mt-2 flex items-baseline gap-1">
                <span className="text-2xl font-semibold text-amber-600 dark:text-amber-400">{leaveQuota?.el_remaining ?? (leaveQuota?.el_credited_so_far ?? 15)}</span>
                <span className="text-xs text-muted-foreground">/ {leaveQuota?.el_credited_so_far ?? leaveQuota?.el_accrued_to_date ?? 15} credited</span>
              </div>
              <p className="mt-1 text-[11px] text-muted-foreground">{leaveQuota?.el_half_year_period || 'Credited: 7 in Jan, 8 in Jul (Non-accum.)'}</p>
            </div>
          )}

          {/* Vacation Leave Card (if eligible) */}
          {leaveQuota?.vacation_is_enabled !== false && leaveQuota?.policy_rules?.vacation_leave?.is_enabled !== false && leaveQuota?.is_vacation_eligible === true && (
            <div className={`p-4 rounded-xl border transition-all ${theme === 'dark' ? 'bg-card border-border shadow-sm' : 'bg-white border-slate-200 shadow-sm'}`}>
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Vacation Leave</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-teal-100 text-teal-700 dark:bg-teal-950/40 dark:text-teal-400 font-semibold whitespace-nowrap shrink-0">
                  Teaching Staff
                </span>
              </div>
              <div className="mt-2 flex items-baseline gap-1">
                <span className="text-2xl font-semibold text-teal-600 dark:text-teal-400">{leaveQuota?.vacation_remaining ?? (leaveQuota?.vacation_annual_limit ?? leaveQuota?.vacation_total ?? leaveQuota?.policy_rules?.vacation_leave?.annual_quota ?? 60)}</span>
                <span className="text-xs text-muted-foreground">/ {leaveQuota?.vacation_annual_limit ?? leaveQuota?.vacation_total ?? leaveQuota?.policy_rules?.vacation_leave?.annual_quota ?? 60} days left</span>
              </div>
              <p className="mt-1 text-[11px] text-muted-foreground">Used: {leaveQuota?.vacation_used ?? 0} days | Per College Schedule</p>
            </div>
          )}

          {/* Maternity Leave Card (if eligible) */}
          {leaveQuota?.maternity_is_enabled !== false && leaveQuota?.policy_rules?.maternity_leave?.is_enabled !== false && leaveQuota?.is_maternity_eligible === true && (
            <div className={`p-4 rounded-xl border transition-all ${theme === 'dark' ? 'bg-card border-border shadow-sm' : 'bg-white border-slate-200 shadow-sm'}`}>
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Maternity Leave</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-pink-100 text-pink-700 dark:bg-pink-950/40 dark:text-pink-400 font-semibold whitespace-nowrap shrink-0">
                  Max {leaveQuota?.maternity_annual_limit ?? leaveQuota?.maternity_total ?? leaveQuota?.policy_rules?.maternity_leave?.annual_quota ?? 90} Days
                </span>
              </div>
              <div className="mt-2 flex items-baseline gap-1">
                <span className="text-2xl font-semibold text-pink-600 dark:text-pink-400">{leaveQuota?.maternity_remaining ?? (leaveQuota?.maternity_annual_limit ?? leaveQuota?.maternity_total ?? leaveQuota?.policy_rules?.maternity_leave?.annual_quota ?? 90)}</span>
                <span className="text-xs text-muted-foreground">/ {leaveQuota?.maternity_annual_limit ?? leaveQuota?.maternity_total ?? leaveQuota?.policy_rules?.maternity_leave?.annual_quota ?? 90} days left</span>
              </div>
              <p className="mt-1 text-[11px] text-muted-foreground">Used: {leaveQuota?.maternity_used ?? 0} days | Medical proof required</p>
            </div>
          )}

          {/* RH Card */}
          {leaveQuota?.rh_is_enabled !== false && leaveQuota?.policy_rules?.restricted_holiday?.is_enabled !== false && (
            <div className={`p-4 rounded-xl border transition-all ${theme === 'dark' ? 'bg-card border-border shadow-sm' : 'bg-white border-slate-200 shadow-sm'}`}>
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Restricted Holiday (RH)</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400 font-semibold whitespace-nowrap shrink-0">
                  Max {leaveQuota?.rh_monthly_limit ?? leaveQuota?.policy_rules?.restricted_holiday?.monthly_limit ?? 1} / mo
                </span>
              </div>
              <div className="mt-2 flex items-baseline gap-1">
                <span className="text-2xl font-semibold text-rose-600 dark:text-rose-400">{leaveQuota?.rh_remaining ?? (leaveQuota?.rh_annual_limit ?? leaveQuota?.rh_total ?? leaveQuota?.policy_rules?.restricted_holiday?.annual_quota ?? 2)}</span>
                <span className="text-xs text-muted-foreground">/ {leaveQuota?.rh_annual_limit ?? leaveQuota?.rh_total ?? leaveQuota?.policy_rules?.restricted_holiday?.annual_quota ?? 2} left</span>
              </div>
              <p className="mt-1 text-[11px] text-muted-foreground">Used this month: {leaveQuota?.rh_used_this_month ?? 0}/{leaveQuota?.rh_monthly_limit ?? leaveQuota?.policy_rules?.restricted_holiday?.monthly_limit ?? 1}</p>
            </div>
          )}

          {/* Short Permission Card */}
          {leaveQuota?.sp_is_enabled !== false && leaveQuota?.policy_rules?.short_permission?.is_enabled !== false && (
            <div className={`p-4 rounded-xl border transition-all ${theme === 'dark' ? 'bg-card border-border shadow-sm' : 'bg-white border-slate-200 shadow-sm'}`}>
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Short Permission</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 dark:bg-purple-950/40 dark:text-purple-400 font-semibold whitespace-nowrap shrink-0">
                  Max {leaveQuota?.short_permission_max_hours ?? leaveQuota?.sp_max_hours ?? leaveQuota?.policy_rules?.short_permission?.max_hours ?? 2}h / time
                </span>
              </div>
              <div className="mt-2 flex items-baseline gap-1">
                <span className="text-2xl font-semibold text-purple-600 dark:text-purple-400">{leaveQuota?.short_permission_remaining_this_month ?? leaveQuota?.sp_remaining_this_month ?? (leaveQuota?.short_permission_limit_monthly ?? leaveQuota?.sp_monthly_limit ?? leaveQuota?.policy_rules?.short_permission?.monthly_limit ?? 5)}</span>
                <span className="text-xs text-muted-foreground">/ {leaveQuota?.short_permission_limit_monthly ?? leaveQuota?.sp_monthly_limit ?? leaveQuota?.policy_rules?.short_permission?.monthly_limit ?? 5} left</span>
              </div>
              <p className="mt-1 text-[11px] text-muted-foreground">Used this month: {leaveQuota?.short_permission_used_this_month ?? leaveQuota?.sp_used_this_month ?? 0}</p>
            </div>
          )}
        </div>

        {/* Top Header Tab Switcher (Apply Leave & History vs Substitute Requests) */}
        <div className="flex items-center w-full border-b border-border pb-3">
          <div className={`flex items-center p-1 rounded-xl border w-full ${theme === 'dark' ? 'bg-background/80 border-border' : 'bg-muted/40 border-border/60'
            }`}>
            <button
              type="button"
              onClick={() => setActiveMainTab('apply')}
              className={`flex-1 justify-center px-4 py-2.5 text-xs sm:text-sm font-semibold rounded-lg transition-all duration-200 flex items-center gap-2 ${activeMainTab === 'apply'
                ? 'bg-primary text-white shadow-sm'
                : 'text-muted-foreground hover:text-foreground hover:bg-background/50'
                }`}
            >
              <CalendarCheck2 className="w-4 h-4 shrink-0" />
              <span className="whitespace-nowrap">Apply Leave </span>
            </button>
            <button
              type="button"
              onClick={() => setActiveMainTab('substitute_requests')}
              className={`flex-1 justify-center px-4 py-2.5 text-xs sm:text-sm font-semibold rounded-lg transition-all duration-200 flex items-center gap-2 relative ${activeMainTab === 'substitute_requests'
                ? 'bg-primary text-white shadow-sm'
                : 'text-muted-foreground hover:text-foreground hover:bg-background/50'
                }`}
            >
              <Users className="w-4 h-4 shrink-0" />
              <span className="whitespace-nowrap">Substitute Requests</span>
              {pendingSubstituteCount > 0 && (
                <span className={`ml-1.5 px-1.5 py-0.5 text-[10px] rounded-full font-semibold leading-none ${activeMainTab === 'substitute_requests'
                  ? 'bg-white text-primary'
                  : 'bg-rose-500 text-white animate-pulse'
                  }`}>
                  {pendingSubstituteCount}
                </span>
              )}
            </button>
          </div>
        </div>

        {activeMainTab === 'substitute_requests' ? (
          /* Alternate Duty / Substitute Requests Assigned to You */
          <Card className={`border shadow-sm flex flex-col ${theme === 'dark' ? 'bg-card border-border' : 'bg-white border-gray-200'}`}>
            <CardHeader className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b pb-4">
              <div>
                <CardTitle className="text-lg sm:text-xl font-semibold">
                  Alternate Duty / Substitute Requests Assigned to You
                </CardTitle>
                <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                  Colleagues who nominated you to cover their duties while they are on leave. Accept or decline to allow their request to proceed.
                </p>
              </div>

              {/* Status Filter */}
              <div className="flex items-center gap-2 self-end sm:self-auto">
                <Select value={substituteStatusFilter} onValueChange={(val) => { setSubstituteStatusFilter(val); setSubstitutePage(1); }}>
                  <SelectTrigger className="leave-filter-select min-w-[110px] w-auto px-3 h-9 flex items-center justify-center gap-2 rounded-lg border border-primary bg-primary text-white hover:bg-primary/90 [&>svg:last-child]:hidden [&>span]:flex [&>span]:items-center [&>span]:justify-center [&>span]:gap-2 shadow-sm font-medium text-sm">
                    <Filter className="h-4 w-4" />
                    <span>{substituteStatusFilter === "All" ? "Filter" : (substituteStatusFilter === 'PENDING' ? 'Pending' : (substituteStatusFilter === 'ACCEPTED' ? 'Accepted' : 'Declined'))}</span>
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

            <CardContent className="flex-1 px-2 sm:px-6 pt-4">
              <div className="border rounded-xl overflow-hidden shadow-sm">
                {substituteLoading ? (
                  <SkeletonTable rows={5} columns={7} />
                ) : (!Array.isArray(substituteRequests) || substituteRequests.length === 0) ? (
                  <div className="flex flex-col items-center justify-center py-16 px-4">
                    <div className={`p-4 rounded-full mb-3 ${theme === 'dark' ? 'bg-primary/10' : 'bg-primary/5'}`}>
                      <UserCheck className="w-10 h-10 text-primary opacity-50" />
                    </div>
                    <h3 className={`text-base font-semibold mb-1 ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>
                      No Substitute Requests
                    </h3>
                    <p className={`text-xs text-center max-w-sm ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}`}>
                      {substituteStatusFilter !== 'All'
                        ? `There are no ${substituteStatusFilter.toLowerCase()} substitute requests.`
                        : 'When a colleague nominates you for alternate duty, it will appear here.'}
                    </p>
                  </div>
                ) : (
                  <>
                    {/* Mobile: stacked cards */}
                    <div className="md:hidden space-y-3 p-2">
                      {substituteRequests.map((req) => (
                        <div
                          key={req.id}
                          className={`p-3 rounded-lg border transition-all ${req.alternate_duty_status === 'PENDING'
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
                                  {req.applicant_role?.replace('_', ' ')}
                                </span>
                                {req.department && req.department !== 'General' && req.department !== 'Unknown' && req.department !== 'Inventory Management' && req.applicant_role !== 'inventory_manager' && (
                                  <span className="text-xs text-muted-foreground font-medium">{req.department}</span>
                                )}
                              </div>
                            </div>
                            <div className="shrink-0">{getSubstituteStatusBadge(req.alternate_duty_status, theme)}</div>
                          </div>

                          <div className="mt-2.5">
                            <div className="text-sm font-semibold text-foreground">{req.title}</div>
                            {renderSubstituteCategoryBadge(req.leave_type, req.is_half_day, req.half_day_session, req.od_purpose_category)}
                          </div>

                          <div className="mt-2.5 space-y-2.5">
                            <div className={`p-2.5 rounded-lg border text-sm flex flex-col gap-1 ${theme === 'dark' ? 'bg-muted/10 border-border/40' : 'bg-gray-50/50 border-gray-100'}`}>
                              <div className="flex items-center gap-2">
                                <CalendarIcon className="w-4 h-4 text-primary/60" />
                                <span className="font-medium text-foreground">{formatDateDisplay(req.start_date)}</span>
                                {req.start_date !== req.end_date && (
                                  <>
                                    <span className="text-muted-foreground">to</span>
                                    <span className="font-medium text-foreground">{formatDateDisplay(req.end_date)}</span>
                                  </>
                                )}
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
                                className={`w-full h-9 font-semibold transition border ${theme === 'dark'
                                    ? 'border-purple-500/20 text-purple-400 bg-purple-950/20 hover:bg-purple-950/40'
                                    : 'border-purple-100 text-purple-600 bg-purple-50 hover:bg-purple-100/80'
                                  }`}
                                onClick={() => setSubstituteViewReason(req.reason)}
                              >
                                View Reason
                              </Button>

                              {(req.initial_document_url || req.completion_document_url) && (
                                <>
                                  {req.initial_document_url && (
                                    <a
                                      href={req.initial_document_url}
                                      target="_blank"
                                      rel="noreferrer"
                                      className={`w-full h-9 text-xs font-semibold flex items-center justify-center gap-1.5 rounded-md border shadow-xs transition-all ${theme === 'dark'
                                          ? 'border-sky-500/30 bg-sky-950/30 text-sky-300 hover:bg-sky-950/50'
                                          : 'border-sky-200 bg-sky-50 text-sky-700 hover:bg-sky-100'
                                        }`}
                                    >
                                      <FileText className="w-4 h-4 text-sky-600 dark:text-sky-400" />
                                      <span>View Attachment</span>
                                      <ExternalLink className="w-3 h-3 opacity-70" />
                                    </a>
                                  )}
                                  {req.completion_document_url && (
                                    <a
                                      href={req.completion_document_url}
                                      target="_blank"
                                      rel="noreferrer"
                                      className={`w-full h-9 text-xs font-semibold flex items-center justify-center gap-1.5 rounded-md border shadow-xs transition-all ${theme === 'dark'
                                          ? 'border-emerald-500/30 bg-emerald-950/30 text-emerald-300 hover:bg-emerald-950/50'
                                          : 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                                        }`}
                                    >
                                      <FileText className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                                      <span>View Attendance Certificate</span>
                                      <ExternalLink className="w-3 h-3 opacity-70" />
                                    </a>
                                  )}
                                </>
                              )}
                            </div>

                            {req.alternate_duty_status === 'PENDING' ? (
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
                                  {req.alternate_duty_status === 'ACCEPTED' ? '✓ You accepted this alternate duty' : '✗ You declined this alternate duty'}
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
                            <th className={`py-3 px-3 md:px-4 text-left font-semibold ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>Applicant</th>
                            <th className={`py-3 px-3 md:px-4 text-left font-semibold ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>Category / Title</th>
                            <th className={`py-3 px-4 text-center font-semibold ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>Period & Time</th>
                            <th className={`py-3 px-3 text-center font-semibold ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>Attachments</th>
                            <th className={`py-3 px-3 text-center font-semibold ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>Reason</th>
                            <th className={`py-3 px-3 text-center font-semibold ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>Status</th>
                            <th className={`py-3 px-3 text-center font-semibold ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                          {substituteRequests.map((req) => (
                            <tr
                              key={req.id}
                              className={`transition-colors duration-200 ${theme === 'dark' ? 'hover:bg-accent' : 'hover:bg-gray-50'}`}
                            >
                              <td className="py-4 px-3 md:px-4 text-left">
                                <div className={`font-medium ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>{req.applicant_name}</div>
                                <div className="flex items-center gap-1.5 mt-0.5">
                                  <span className="text-[11px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                                    {req.applicant_role?.replace('_', ' ')}
                                  </span>
                                  {req.department && req.department !== 'General' && req.department !== 'Unknown' && req.department !== 'Inventory Management' && req.applicant_role !== 'inventory_manager' && (
                                    <span className={`text-xs ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}`}>{req.department}</span>
                                  )}
                                </div>
                              </td>

                              <td className="py-4 px-3 md:px-4 text-left">
                                <div className={`font-medium text-sm ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>{req.title}</div>
                                {renderSubstituteCategoryBadge(req.leave_type, req.is_half_day, req.half_day_session, req.od_purpose_category)}
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
                                {req.start_time && req.end_time && (
                                  <div className="text-xs font-semibold text-primary mt-0.5">
                                    {req.start_time} - {req.end_time}
                                  </div>
                                )}
                              </td>

                              {/* Attachments Column */}
                              <td className="py-4 px-3 md:px-4 text-sm text-center">
                                {req.initial_document_url || req.completion_document_url ? (
                                  <div className="flex flex-col items-center justify-center gap-1.5">
                                    {req.initial_document_url && (
                                      <a
                                        href={req.initial_document_url}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium bg-sky-50 text-sky-700 dark:bg-sky-950/50 dark:text-sky-300 border border-sky-200 dark:border-sky-800 hover:bg-sky-100 dark:hover:bg-sky-900/50 transition-colors shrink-0 whitespace-nowrap"
                                        title="View Attached Order / Document Proof"
                                      >
                                        <FileText className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
                                        <span>Attachment</span>
                                        <ExternalLink className="w-2.5 h-2.5 opacity-70" />
                                      </a>
                                    )}
                                    {req.completion_document_url && (
                                      <a
                                        href={req.completion_document_url}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 transition-colors shrink-0 whitespace-nowrap"
                                        title="View Attendance Certificate"
                                      >
                                        <FileText className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                                        <span>Attendance Cert</span>
                                        <ExternalLink className="w-2.5 h-2.5 opacity-70" />
                                      </a>
                                    )}
                                  </div>
                                ) : (
                                  <span className="text-muted-foreground text-xs italic">—</span>
                                )}
                              </td>

                              {/* Reason Column */}
                              <td className="py-4 px-3 md:px-4 text-sm text-center">
                                <button
                                  onClick={() => setSubstituteViewReason(req.reason)}
                                  className={`text-sm font-medium px-2.5 py-1 rounded-md transition border ${theme === 'dark'
                                      ? 'border-purple-500/20 text-purple-400 bg-purple-950/20 hover:bg-purple-950/40'
                                      : 'border-purple-100 text-purple-600 bg-purple-50 hover:bg-purple-100/80'
                                    }`}
                                >
                                  View
                                </button>
                              </td>

                              {/* Status Column */}
                              <td className="py-4 px-3 md:px-4 text-center">
                                {getSubstituteStatusBadge(req.alternate_duty_status, theme)}
                              </td>

                              {/* Action Column */}
                              <td className="py-4 px-3 md:px-4 text-center">
                                {req.alternate_duty_status === 'PENDING' ? (
                                  <div className="flex flex-col md:flex-row justify-center gap-2">
                                    <Button
                                      variant="outline"
                                      className={`px-3 py-1 text-xs flex items-center gap-1 w-full md:w-auto ${theme === 'dark'
                                          ? 'text-green-400 border-green-400/50 bg-green-400/5 hover:bg-green-400/20'
                                          : 'text-green-700 border-green-200 bg-green-50 hover:bg-green-100'
                                        }`}
                                      onClick={() => handleSubstituteAction(req.id, 'ACCEPT')}
                                    >
                                      <CheckCircle2 size={16} /> Accept
                                    </Button>
                                    <Button
                                      variant="outline"
                                      className={`px-3 py-1 text-xs flex items-center gap-1 w-full md:w-auto ${theme === 'dark'
                                          ? 'text-red-400 border-red-400/50 bg-red-400/5 hover:bg-red-400/20'
                                          : 'text-red-700 border-red-200 bg-red-50 hover:bg-red-100'
                                        }`}
                                      onClick={() => handleSubstituteAction(req.id, 'DECLINE')}
                                    >
                                      <XCircle size={16} /> Decline
                                    </Button>
                                  </div>
                                ) : (
                                  <span className={`text-xs ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}`}>
                                    {req.alternate_duty_status === 'ACCEPTED' ? 'Accepted' : 'Declined'}
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

            {/* Pagination Footer */}
            {substituteTotalPages > 1 && (
              <CardFooter className="flex flex-col sm:flex-row justify-between items-center gap-4 text-sm text-muted-foreground px-6 py-4 border-t border-border mt-auto">
                <div>
                  Showing {Math.min((substitutePage - 1) * 10 + 1, substituteTotalCount)} to {Math.min(substitutePage * 10, substituteTotalCount)} of {substituteTotalCount} requests
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSubstitutePage(Math.max(1, substitutePage - 1))}
                    disabled={substitutePage === 1 || substituteLoading}
                    className="bg-primary hover:bg-primary/90 text-white border-primary h-9 px-4 transition-all"
                  >
                    Previous
                  </Button>

                  <div className="flex items-center justify-center min-w-[2rem]">
                    <span className={`text-sm font-semibold ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>
                      {substitutePage}
                    </span>
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSubstitutePage(Math.min(substituteTotalPages, substitutePage + 1))}
                    disabled={substitutePage === substituteTotalPages || substituteLoading}
                    className="bg-primary hover:bg-primary/90 text-white border-primary h-9 px-4 transition-all"
                  >
                    Next
                  </Button>
                </div>
              </CardFooter>
            )}

            {/* View Reason Dialog */}
            <Dialog open={!!substituteViewReason} onOpenChange={() => setSubstituteViewReason(null)}>
              <DialogContent className={theme === 'dark' ? 'bg-card text-foreground border border-border w-[90%] sm:max-w-md mx-auto rounded-xl p-4 sm:p-6' : 'bg-white text-gray-900 border border-gray-200 w-[90%] sm:max-w-md mx-auto rounded-xl p-4 sm:p-6'}>
                <DialogHeader>
                  <DialogTitle className="text-base font-semibold">Leave Application Reason</DialogTitle>
                </DialogHeader>
                <div className="mt-3 text-sm text-foreground/90 whitespace-pre-wrap max-h-[300px] overflow-y-auto p-3 rounded-lg bg-muted/40 border border-border">
                  {substituteViewReason}
                </div>
                <DialogFooter className="mt-4">
                  <Button variant="outline" size="sm" onClick={() => setSubstituteViewReason(null)}>
                    Close
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
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
                {/* Pending Post-OD Attendance Certificate Alert Banner */}
                {Boolean(leaveQuota?.od_pending_certificates_count && leaveQuota.od_pending_certificates_count > 0) && (
                  <div className="p-3.5 rounded-xl border border-amber-300 dark:border-amber-700/60 bg-amber-50 dark:bg-amber-950/30 text-amber-800 dark:text-amber-300 flex items-start gap-3 shadow-xs">
                    <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                    <div className="space-y-1 flex-1">
                      <div className="text-xs font-semibold flex items-center justify-between">
                        <span>Post-OD Attendance Certificate Required</span>
                        <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-amber-200/80 dark:bg-amber-900/60 text-amber-900 dark:text-amber-200">
                          ⚠️ {leaveQuota?.od_pending_certificates_count} Pending
                        </span>
                      </div>
                      <p className="text-[11px] text-amber-700 dark:text-amber-300/90 leading-relaxed">
                        You have {leaveQuota?.od_pending_certificates_count} completed On Duty (OD) leave(s) awaiting attendance/participation certificate submission. Please upload proof in the <strong>Leave History</strong> section.
                      </p>
                    </div>
                  </div>
                )}

                {/* Error Message */}
                {error && (
                  <div className={`p-3 rounded-lg ${theme === 'dark' ? 'bg-destructive/20 text-destructive-foreground border border-destructive' : 'bg-red-100 text-red-700 border border-red-200'}`}>
                    {error}
                  </div>
                )}

                {/* Leave Category Select Option */}
                {(() => {
                  const availableCategories = [
                    { id: 'casual', label: 'Casual Leave (CL)', visible: leaveQuota?.cl_is_enabled !== false && leaveQuota?.policy_rules?.casual_leave?.is_enabled !== false },
                    { id: 'od', label: 'On Duty (OD)', visible: leaveQuota?.od_is_enabled !== false && leaveQuota?.policy_rules?.on_duty?.is_enabled !== false && leaveQuota?.is_od_eligible !== false },
                    { id: 'earned', label: 'Earned Leave (EL)', visible: leaveQuota?.el_is_enabled !== false && leaveQuota?.policy_rules?.earned_leave?.is_enabled !== false && leaveQuota?.is_el_eligible !== false },
                    { id: 'vacation', label: 'Vacation Leave', visible: leaveQuota?.vacation_is_enabled !== false && leaveQuota?.policy_rules?.vacation_leave?.is_enabled !== false && leaveQuota?.is_vacation_eligible === true },
                    { id: 'rh', label: 'Restricted Holiday (RH)', visible: leaveQuota?.rh_is_enabled !== false && leaveQuota?.policy_rules?.restricted_holiday?.is_enabled !== false },
                    { id: 'maternity', label: 'Maternity Leave (ML)', visible: leaveQuota?.maternity_is_enabled !== false && leaveQuota?.policy_rules?.maternity_leave?.is_enabled !== false && leaveQuota?.is_maternity_eligible === true },
                    { id: 'short_permission', label: 'Short Permission', visible: leaveQuota?.sp_is_enabled !== false && leaveQuota?.policy_rules?.short_permission?.is_enabled !== false },
                  ].filter(c => c.visible);

                  return (
                    <div className="space-y-2">
                      <Label htmlFor="leave-category-select" className={`apply-leave-label ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>
                        Leave Category <span className="text-red-500">*</span>
                      </Label>

                      <Select
                        value={leaveType}
                        onValueChange={(val: any) => {
                          setLeaveType(val);
                          if (val !== 'od' && val !== 'maternity') {
                            setInitialDocFile(null);
                            if (fileInputRef.current) fileInputRef.current.value = '';
                          }
                          if (val === 'short_permission') {
                            const liveTimes = getInitialTimes();
                            setStartTimeParts(liveTimes.start);
                            setEndTimeParts(liveTimes.end);
                            if (!permissionDate) {
                              setPermissionDate(new Date());
                            }
                          }
                        }}
                      >
                        <SelectTrigger id="leave-category-select" className={`apply-leave-input w-full text-xs font-semibold ${theme === 'dark' ? 'bg-background border-border text-foreground' : 'bg-white border-gray-300'}`}>
                          <SelectValue placeholder="Select Leave Category" />
                        </SelectTrigger>
                        <SelectContent className={`max-h-[280px] ${theme === 'dark' ? 'bg-card border-border text-foreground' : ''}`}>
                          {availableCategories.map(cat => {
                            const isSelected = leaveType === cat.id;
                            return (
                              <SelectItem
                                key={cat.id}
                                value={cat.id}
                                className={`text-xs font-medium py-2 rounded-md transition-colors cursor-pointer data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground data-[state=checked]:font-semibold ${isSelected ? 'bg-primary text-primary-foreground font-semibold' : ''
                                  }`}
                              >
                                {cat.label}
                              </SelectItem>
                            );
                          })}
                        </SelectContent>
                      </Select>

                      {/* Dynamic Rule Tip from Organization Policy */}
                      <div className="text-[11px] text-muted-foreground pt-0.5 leading-relaxed">
                        {leaveType === 'casual' && (
                          <span>
                            ℹ️ <strong>Casual Leave (CL):</strong> Max <strong>{leaveQuota?.cl_max_stretch ?? leaveQuota?.policy_rules?.casual_leave?.max_stretch_days ?? 3} days</strong> at a stretch ({leaveQuota?.cl_annual_limit ?? leaveQuota?.cl_total ?? 15}d/academic year). {leaveQuota?.policy_rules?.casual_leave?.allow_half_day === false ? 'Half-day not permitted.' : (leaveQuota?.policy_rules?.casual_leave?.half_day_session === 'forenoon_only' ? 'Morning half-day only.' : (leaveQuota?.policy_rules?.casual_leave?.half_day_session === 'both' ? 'Morning & afternoon half-day permitted.' : 'Afternoon half-day only.'))} Anti-clubbing & advance sanction enforced.
                          </span>
                        )}
                        {leaveType === 'od' && (
                          <span>
                            ℹ️ <strong>On Duty (OD):</strong> For conferences, workshops, Ph.D, statutory & institutional duties. {leaveQuota?.policy_rules?.on_duty?.require_initial_document ? 'Initial duty order/invitation attachment is mandatory.' : 'Supporting proof attachment recommended.'} {leaveQuota?.policy_rules?.on_duty?.require_completion_certificate !== false ? 'Attendance certificate required post-completion.' : ''}
                          </span>
                        )}
                        {leaveType === 'earned' && (
                          <span>
                            ℹ️ <strong>Earned Leave (EL):</strong> <strong>{leaveQuota?.el_annual_limit ?? leaveQuota?.el_total_annual ?? 15} days/yr</strong> ({leaveQuota?.el_jan_credit ?? 7}d H1, {leaveQuota?.el_jul_credit ?? 8}d H2 credit). Min <strong>{leaveQuota?.el_min_stretch ?? 2}</strong> to max <strong>{leaveQuota?.el_max_stretch ?? 5} days</strong> at a stretch. Non-accumulative.
                          </span>
                        )}
                        {leaveType === 'vacation' && (
                          <span>
                            ℹ️ <strong>Vacation Leave:</strong> <strong>{leaveQuota?.vacation_annual_limit ?? leaveQuota?.vacation_total ?? 20} days</strong> per academic year. {leaveQuota?.policy_rules?.vacation_leave?.allow_probation ? 'Available for all teaching faculty.' : 'Applicable for confirmed (non-probationary) teaching staff only.'}
                          </span>
                        )}
                        {leaveType === 'maternity' && (
                          <span>
                            ℹ️ <strong>Maternity Leave (ML):</strong> Up to <strong>{leaveQuota?.maternity_annual_limit ?? leaveQuota?.maternity_total ?? 90} days</strong> for eligible staff. Medical certificate attachment required.
                          </span>
                        )}
                        {leaveType === 'rh' && (
                          <span>
                            ℹ️ <strong>Restricted Holiday (RH):</strong> Max <strong>{leaveQuota?.rh_annual_limit ?? leaveQuota?.rh_total ?? 2} days</strong> per academic year, limited to <strong>{leaveQuota?.policy_rules?.restricted_holiday?.monthly_limit ?? leaveQuota?.rh_monthly_limit ?? 1} day</strong> per calendar month.
                          </span>
                        )}
                        {leaveType === 'short_permission' && (
                          <span>
                            ℹ️ <strong>Short Permission:</strong> Max <strong>{leaveQuota?.short_permission_max_hours ?? leaveQuota?.sp_max_hours ?? 2} hours</strong> per permission, allowed up to <strong>{leaveQuota?.monthly_short_permission_limit ?? leaveQuota?.short_permission_limit_monthly ?? 5} times</strong> per calendar month.
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })()}

                {/* File / Image Attachment Section (Exclusively for On Duty and Maternity Leaves) */}
                {(leaveType === 'od' || leaveType === 'maternity') && (
                  <div className={`p-3.5 rounded-xl border space-y-3 ${leaveType === 'od' ? 'border-emerald-500/30 bg-emerald-500/5' :
                    'border-pink-500/30 bg-pink-500/5'
                    }`}>
                    {/* OD Purpose Category */}
                    {leaveType === 'od' && (
                      <div className="space-y-2.5 pb-2.5 border-b border-emerald-500/20">
                        <Label className={`apply-leave-label ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>
                          OD Purpose Category <span className="text-red-500">*</span>
                        </Label>
                        <Select
                          value={odPurposeCategory}
                          onValueChange={(val) => {
                            setOdPurposeCategory(val);
                            if (val !== 'other') {
                              setCustomOdPurpose('');
                            }
                          }}
                        >
                          <SelectTrigger className={`w-full text-xs font-semibold ${theme === 'dark' ? 'bg-background border-border text-foreground' : 'bg-white border-gray-300'}`}>
                            <SelectValue placeholder="Select OD Purpose..." />
                          </SelectTrigger>
                          <SelectContent className={theme === 'dark' ? 'bg-card border-border text-foreground' : ''}>
                            <SelectItem value="conference_symposia">Conference / Seminar / Symposia</SelectItem>
                            <SelectItem value="workshop_fdp">Workshop / Faculty Development (FDP)</SelectItem>
                            <SelectItem value="exam_valuation_duty">Valuation / Examination / Viva Duty</SelectItem>
                            <SelectItem value="phd_doctoral_work">Ph.D Research / Doctoral Work</SelectItem>
                            <SelectItem value="university_statutory_duty">Official Meeting / Statutory / University Duty</SelectItem>
                            <SelectItem value="other">Other (Specify Custom Purpose)</SelectItem>
                          </SelectContent>
                        </Select>

                        {/* Custom OD Purpose Input when Other is selected */}
                        {odPurposeCategory === 'other' && (
                          <div className="space-y-1.5 pt-1">
                            <Label className={`text-xs font-semibold ${theme === 'dark' ? 'text-foreground' : 'text-gray-800'}`}>
                              Specify Custom OD Purpose <span className="text-red-500">*</span>
                            </Label>
                            <Input
                              type="text"
                              value={customOdPurpose}
                              onChange={(e) => setCustomOdPurpose(e.target.value)}
                              placeholder="e.g., Guest Lecture, Industrial Visit, Accreditation Review, Project Inspection"
                              className={`h-8.5 text-xs ${theme === 'dark' ? 'bg-background border-border text-foreground focus:ring-emerald-500/30' : 'bg-white border-gray-300 text-gray-900 focus:ring-emerald-500/20'}`}
                              required
                            />
                            <p className="text-[10px] text-muted-foreground">Please type the official reason or duty description for this OD request.</p>
                          </div>
                        )}
                      </div>
                    )}

                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs font-semibold flex items-center gap-1.5">
                          <Paperclip className={`w-3.5 h-3.5 ${leaveType === 'maternity' ? 'text-pink-500' : 'text-primary'}`} />
                          <span>
                            {leaveType === 'od' ? 'Invitation / Deputation Letter / Duty Order' :
                              'Medical Certificate / Doctor Endorsement'}
                          </span>
                          {leaveType === 'maternity' && <span className="text-red-500">*</span>}
                          {leaveType === 'od' && <span className="text-[10px] text-muted-foreground font-normal">(Required for OD)</span>}
                        </Label>
                      </div>

                      {/* Hidden Native File Input */}
                      <input
                        ref={fileInputRef}
                        type="file"
                        className="hidden"
                        accept=".jpg,.jpeg,.png,.pdf,.doc,.docx,image/jpeg,image/png,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                        onChange={async (e) => {
                          const file = e.target.files?.[0] || null;
                          if (!file) return;

                          const allowedExtensions = ['jpg', 'jpeg', 'png', 'pdf', 'doc', 'docx'];
                          const ext = file.name.split('.').pop()?.toLowerCase() || '';

                          if (!allowedExtensions.includes(ext) && !file.type.startsWith('image/')) {
                            if (fileInputRef.current) fileInputRef.current.value = '';
                            setInitialDocFile(null);
                            await MySwal.fire({
                              title: 'Unsupported File Format',
                              text: 'For images, only JPG and PNG formats are allowed (documents: PDF, DOC, DOCX).',
                              icon: 'warning',
                              confirmButtonColor: '#f59e0b',
                              background: currentTheme === 'dark' ? '#1c1c1e' : '#ffffff',
                              color: currentTheme === 'dark' ? '#ffffff' : '#000000'
                            });
                            return;
                          }

                          // Allow file to be chosen, submit will block if > 1MB
                          setInitialDocFile(file);
                        }}
                      />

                      {/* Selected File Preview Card OR Clean Upload Dropzone */}
                      {initialDocFile ? (
                        <div className={`p-3 rounded-xl border flex items-center justify-between gap-3 ${initialDocFile.size > 1024 * 1024
                          ? 'bg-rose-500/5 border-rose-500/40'
                          : theme === 'dark' ? 'bg-background/90 border-primary/30' : 'bg-white border-primary/30 shadow-sm'
                          }`}>
                          <div className="flex items-center gap-3 min-w-0">
                            {docPreviewUrl ? (
                              <img
                                src={docPreviewUrl}
                                alt="Preview"
                                className={`w-12 h-12 rounded-lg object-cover border shrink-0 bg-muted ${initialDocFile.size > 1024 * 1024 ? 'border-rose-500/40' : 'border-primary/20'
                                  }`}
                              />
                            ) : (
                              <div className={`w-12 h-12 rounded-lg flex items-center justify-center shrink-0 border ${initialDocFile.size > 1024 * 1024
                                ? 'bg-rose-500/10 text-rose-500 border-rose-500/30'
                                : 'bg-primary/10 text-primary border-primary/20'
                                }`}>
                                <FileText className="w-6 h-6" />
                              </div>
                            )}
                            <div className="min-w-0">
                              <p className="font-semibold text-xs text-foreground truncate max-w-[200px] sm:max-w-[280px]">
                                {initialDocFile.name}
                              </p>
                              <p className="text-[11px] text-muted-foreground flex items-center gap-1.5 mt-0.5">
                                <span>{(initialDocFile.size / (1024 * 1024)).toFixed(2)} MB</span>
                                <span>•</span>
                                {initialDocFile.size > 1024 * 1024 ? (
                                  <span className="text-rose-600 dark:text-rose-400 font-semibold flex items-center gap-0.5">
                                    <AlertCircle className="w-3 h-3" /> Exceeds 1 MB Limit
                                  </span>
                                ) : (
                                  <span className="text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-0.5">
                                    <CheckCircle2 className="w-3 h-3" /> Ready
                                  </span>
                                )}
                              </p>
                              {initialDocFile.size > 1024 * 1024 && (
                                <p className="text-[10px] text-rose-500 font-medium mt-0.5">
                                  Attachment must be under 1 MB to submit.
                                </p>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => fileInputRef.current?.click()}
                              className="text-[11px] h-7 px-2.5"
                            >
                              Change
                            </Button>
                            <button
                              type="button"
                              onClick={() => {
                                if (fileInputRef.current) fileInputRef.current.value = '';
                                setInitialDocFile(null);
                              }}
                              className="p-1.5 rounded-lg text-muted-foreground hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-all"
                              title="Remove attachment"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div
                          onClick={() => fileInputRef.current?.click()}
                          className={`border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-all hover:border-primary/50 hover:bg-primary/5 ${theme === 'dark' ? 'border-border/60 bg-background/50' : 'border-gray-200 bg-white/80'
                            }`}
                        >
                          <div className="flex flex-col items-center justify-center gap-1.5">
                            <div className="w-9 h-9 rounded-full bg-primary/10 text-primary flex items-center justify-center">
                              <Upload className="w-4 h-4" />
                            </div>
                            <div className="text-xs font-medium text-foreground">
                              Click to upload {leaveType === 'od' ? 'Duty Order / Letter' : 'Medical Certificate'}
                            </div>
                            <div className="text-[10px] text-muted-foreground">
                              Supports: JPG, PNG images, PDF, Word DOC (Max 1 MB)
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
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

                {/* Substitute Role & Assign To (Substitute Selection) */}
                <div className="space-y-4 p-3.5 rounded-xl border bg-muted/20 border-border">
                  {/* Step 1: Select Substitute Role */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className={`apply-leave-label ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>
                        Substitute Role
                      </Label>
                      {isStageZero && (
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20">
                          ⚡ Auto-Approve (0 Stages)
                        </span>
                      )}
                    </div>
                    <Select
                      value={isStageZero ? 'none' : (targetRole || undefined)}
                      onValueChange={(val) => {
                        if (!isStageZero) {
                          setTargetRole(val);
                          setSelectedAlternateFaculty('');
                          setSelectedAlternateFaculties([]);
                          setSelectedSubstituteBranch('');
                          setColleagueSearchQuery('');
                        }
                      }}
                      disabled={isStageZero}
                    >
                      <SelectTrigger className={`w-full ${isStageZero ? 'opacity-90 cursor-not-allowed bg-muted/50 border-emerald-500/30' : ''} ${theme === 'dark' ? 'bg-background border-border' : 'bg-white border-gray-300'}`}>
                        <SelectValue placeholder="Choose role for duty coverage..." />
                      </SelectTrigger>
                      <SelectContent className={`max-h-[220px] ${theme === 'dark' ? 'bg-card border-border text-foreground' : ''}`}>
                        <SelectItem value="none">Direct Review (No Substitute Required)</SelectItem>
                        {!isStageZero && (
                          <>
                            <SelectItem value="faculty">Faculty Member / Teacher</SelectItem>
                            <SelectItem value="hod">Head of Department (HOD)</SelectItem>
                            <SelectItem value="dean">Dean</SelectItem>
                            <SelectItem value="principal">Principal</SelectItem>
                            <SelectItem value="coe">Controller of Examinations (COE)</SelectItem>
                            <SelectItem value="fees_manager">Fees & Accounts Manager</SelectItem>
                            <SelectItem value="admission_manager">Admission Manager</SelectItem>
                            <SelectItem value="hms_admin">Hostel Manager (HMS)</SelectItem>
                            <SelectItem value="warden">Hostel Warden</SelectItem>
                            <SelectItem value="library_admin">Library Admin</SelectItem>
                            <SelectItem value="transport_admin">Transport Admin</SelectItem>
                            <SelectItem value="driver">Driver / Fleet Staff</SelectItem>
                            <SelectItem value="group_d">Group D / Support Staff</SelectItem>
                            <SelectItem value="security">Security Staff</SelectItem>
                            <SelectItem value="counsellor">Counsellor</SelectItem>
                          </>
                        )}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Step 1.5: Select Department / Branch (When Faculty Member / Teacher or HOD is selected) */}
                  {!isStageZero && targetRole !== 'none' && (targetRole === 'faculty' || targetRole === 'teacher' || targetRole === 'hod') && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label className={`apply-leave-label ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>
                          Department / Branch <span className="text-red-500">*</span>
                        </Label>
                        <span className="text-[11px] text-muted-foreground">Select branch first</span>
                      </div>
                      <Select
                        value={selectedSubstituteBranch || undefined}
                        onValueChange={(val) => {
                          setSelectedSubstituteBranch(val);
                          setSelectedAlternateFaculty('');
                          setSelectedAlternateFaculties([]);
                          setColleagueSearchQuery('');
                        }}
                      >
                        <SelectTrigger className={`w-full ${theme === 'dark' ? 'bg-background border-border' : 'bg-white border-gray-300'}`}>
                          <SelectValue placeholder="Choose Department / Branch..." />
                        </SelectTrigger>
                        <SelectContent className={`max-h-[220px] ${theme === 'dark' ? 'bg-card border-border text-foreground' : ''}`}>
                          {branches.map((b) => (
                            <SelectItem key={b.id} value={b.id.toString()}>
                              {b.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  {/* Step 2: Assign To (Multi-Select Checkboxes for Duty Coverage) */}
                  {(isStageZero || targetRole === 'none') ? (
                    <div className={`p-3 rounded-lg border text-xs flex items-center gap-2 ${isStageZero
                      ? (theme === 'dark' ? 'bg-emerald-950/20 border-emerald-800/40 text-emerald-300' : 'bg-emerald-50 border-emerald-200 text-emerald-800')
                      : (theme === 'dark' ? 'bg-muted/40 border-border text-muted-foreground' : 'bg-slate-100 border-slate-200 text-slate-600')
                      }`}>
                      <CheckCircle2 className={`w-4 h-4 shrink-0 ${isStageZero ? 'text-emerald-600 dark:text-emerald-400' : 'text-emerald-500'}`} />
                      <span>Direct Review enabled: Request will be sent directly for approval without substitute duty assignment.</span>
                    </div>
                  ) : (
                    <div className="space-y-2.5">
                      <div className="flex items-center justify-between">
                        <Label className={`apply-leave-label ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>
                          Assign To (Duty Coverage)
                        </Label>
                        <div className="flex items-center gap-2">
                          {selectedAlternateFaculties.length > 0 && (
                            <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                              {selectedAlternateFaculties.length} selected
                            </span>
                          )}
                          <span className="text-[11px] text-muted-foreground">Multiple Selection</span>
                        </div>
                      </div>

                      {(() => {
                        const isBranchRole = targetRole === 'faculty' || targetRole === 'teacher' || targetRole === 'hod';
                        const isBranchMissing = isBranchRole && !selectedSubstituteBranch;

                        if (!targetRole) {
                          return (
                            <div className={`p-3 rounded-lg border text-xs text-muted-foreground ${theme === 'dark' ? 'bg-muted/20 border-border' : 'bg-gray-50 border-gray-200'}`}>
                              Select substitute role above to choose colleagues.
                            </div>
                          );
                        }

                        if (isBranchMissing) {
                          return (
                            <div className={`p-3 rounded-lg border text-xs text-amber-600 dark:text-amber-400 ${theme === 'dark' ? 'bg-amber-950/20 border-amber-800/40' : 'bg-amber-50 border-amber-200'}`}>
                              Please select department / branch above to view colleagues.
                            </div>
                          );
                        }

                        if (colleaguesLoading) {
                          return (
                            <div className={`p-4 rounded-lg border text-xs text-center flex items-center justify-center gap-2 text-muted-foreground ${theme === 'dark' ? 'bg-muted/20 border-border' : 'bg-gray-50 border-gray-200'}`}>
                              <Clock className="w-4 h-4 animate-spin text-primary" />
                              <span>Loading available colleagues...</span>
                            </div>
                          );
                        }

                        if (availableColleagues.length === 0) {
                          return (
                            <div className={`p-3 rounded-lg border text-xs text-muted-foreground ${theme === 'dark' ? 'bg-muted/20 border-border' : 'bg-gray-50 border-gray-200'}`}>
                              No staff found for role "{targetRole.replace('_', ' ')}".
                            </div>
                          );
                        }

                        const filteredColleagues = availableColleagues.filter((c) =>
                          c.name.toLowerCase().includes(colleagueSearchQuery.toLowerCase()) ||
                          (c.username && c.username.toLowerCase().includes(colleagueSearchQuery.toLowerCase()))
                        );

                        const toggleColleague = (idStr: string) => {
                          setSelectedAlternateFaculties((prev) => {
                            const next = prev.includes(idStr)
                              ? prev.filter((item) => item !== idStr)
                              : [...prev, idStr];
                            setSelectedAlternateFaculty(next[0] || '');
                            return next;
                          });
                        };

                        return (
                          <div className={`rounded-lg border p-3 space-y-3 ${theme === 'dark' ? 'bg-muted/10 border-border' : 'bg-slate-50/50 border-gray-200'}`}>
                            {/* Selected colleagues chips/badges */}
                            {selectedAlternateFaculties.length > 0 && (
                              <div className="flex flex-wrap gap-1.5 pb-2 border-b border-border/60">
                                {selectedAlternateFaculties.map((idStr) => {
                                  const col = availableColleagues.find((c) => c.id.toString() === idStr);
                                  return (
                                    <span
                                      key={idStr}
                                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium border shadow-2xs transition-all ${
                                        theme === 'dark'
                                          ? 'bg-primary/20 text-primary-foreground border-primary/30 text-sky-200'
                                          : 'bg-primary/10 text-primary border-primary/20'
                                      }`}
                                    >
                                      <UserCheck className="w-3.5 h-3.5 text-primary shrink-0" />
                                      <span className="truncate max-w-[180px]">{col ? col.name : `Colleague #${idStr}`}</span>
                                      <button
                                        type="button"
                                        onClick={() => toggleColleague(idStr)}
                                        className="ml-0.5 hover:opacity-80 rounded-full p-0.5 transition cursor-pointer"
                                        title="Remove"
                                      >
                                        <X className="w-3 h-3" />
                                      </button>
                                    </span>
                                  );
                                })}
                              </div>
                            )}

                            {/* Search & Quick Actions */}
                            <div className="flex items-center gap-2">
                              <div className="relative flex-1">
                                <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                                <Input
                                  type="text"
                                  placeholder="Search colleague by name..."
                                  value={colleagueSearchQuery}
                                  onChange={(e) => setColleagueSearchQuery(e.target.value)}
                                  className={`h-8 pl-8 text-xs ${theme === 'dark' ? 'bg-background border-border' : 'bg-white border-gray-300'}`}
                                />
                                {colleagueSearchQuery && (
                                  <button
                                    type="button"
                                    onClick={() => setColleagueSearchQuery('')}
                                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                  >
                                    <X className="w-3 h-3" />
                                  </button>
                                )}
                              </div>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  const allFilteredIds = filteredColleagues.map((c) => c.id.toString());
                                  const allSelected = allFilteredIds.length > 0 && allFilteredIds.every((id) => selectedAlternateFaculties.includes(id));
                                  if (allSelected) {
                                    const next = selectedAlternateFaculties.filter((id) => !allFilteredIds.includes(id));
                                    setSelectedAlternateFaculties(next);
                                    setSelectedAlternateFaculty(next[0] || '');
                                  } else {
                                    const next = Array.from(new Set([...selectedAlternateFaculties, ...allFilteredIds]));
                                    setSelectedAlternateFaculties(next);
                                    setSelectedAlternateFaculty(next[0] || '');
                                  }
                                }}
                                className="h-8 text-xs px-2.5 font-medium shrink-0"
                              >
                                {filteredColleagues.length > 0 && filteredColleagues.every((c) => selectedAlternateFaculties.includes(c.id.toString()))
                                  ? 'Deselect All'
                                  : 'Select All'}
                              </Button>
                              {selectedAlternateFaculties.length > 0 && (
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    setSelectedAlternateFaculties([]);
                                    setSelectedAlternateFaculty('');
                                  }}
                                  className="h-8 text-xs px-2 text-rose-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 shrink-0"
                                >
                                  Clear
                                </Button>
                              )}
                            </div>

                            {/* Checkbox List */}
                            <div className={`max-h-48 overflow-y-auto rounded-md border divide-y ${theme === 'dark' ? 'bg-background/80 border-border divide-border/60' : 'bg-white border-gray-200 divide-gray-100'}`}>
                              {filteredColleagues.length === 0 ? (
                                <div className="p-3 text-center text-xs text-muted-foreground">
                                  No colleagues match "{colleagueSearchQuery}"
                                </div>
                              ) : (
                                filteredColleagues.map((col) => {
                                  const isChecked = selectedAlternateFaculties.includes(col.id.toString());
                                  return (
                                    <label
                                      key={col.id}
                                      className={`flex items-center gap-3 p-2.5 cursor-pointer text-xs transition-colors hover:bg-muted/40 ${
                                        isChecked ? (theme === 'dark' ? 'bg-primary/10' : 'bg-primary/5 font-medium') : ''
                                      }`}
                                    >
                                      <Checkbox
                                        checked={isChecked}
                                        onCheckedChange={() => toggleColleague(col.id.toString())}
                                        className="shrink-0"
                                      />
                                      <div className="flex-1 min-w-0 flex items-center justify-between gap-2">
                                        <span className="truncate text-foreground font-medium">{col.name}</span>
                                        {col.role && (
                                          <span className="text-[10px] uppercase font-semibold px-1.5 py-0.5 rounded bg-muted text-muted-foreground shrink-0">
                                            {col.role.replace('_', ' ')}
                                          </span>
                                        )}
                                      </div>
                                    </label>
                                  );
                                })
                              )}
                            </div>
                          </div>
                        );
                      })()}
                      <p className="text-[11px] text-muted-foreground">
                        ℹ️ Selected colleagues will each receive an invitation to accept duty coverage. All selected colleagues must approve before the request moves forward to the next authority.
                      </p>
                    </div>
                  )}
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

                {/* Half-Day Casual Leave Section */}
                {leaveType === 'casual' && leaveQuota?.policy_rules?.casual_leave?.allow_half_day !== false && (
                  <div className="p-3 rounded-lg border bg-muted/20 border-border space-y-2.5">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <Label htmlFor="half-day-toggle" className="text-xs font-semibold text-foreground cursor-pointer">
                            Apply for Half-Day CL
                          </Label>
                          <span className="text-[10px] font-semibold px-1.5 py-0.2 rounded bg-primary/10 text-primary border border-primary/20">
                            0.5 Day
                          </span>
                        </div>
                        <p className="text-[11px] text-muted-foreground">Permit 0.5 day deduction for single-day absence</p>
                      </div>
                      <input
                        type="checkbox"
                        id="half-day-toggle"
                        checked={isHalfDay}
                        onChange={(e) => {
                          const checked = e.target.checked;
                          setIsHalfDay(checked);
                          if (checked && dateRange?.from) {
                            setDateRange({ from: dateRange.from, to: dateRange.from });
                          }
                        }}
                        className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary cursor-pointer accent-primary"
                      />
                    </div>

                    {isHalfDay && (
                      <div className="pt-2 border-t border-border/40 space-y-2">
                        <Label className="text-[11px] font-semibold text-muted-foreground">
                          Half-Day Session:
                        </Label>
                        {(() => {
                          const sessionRule = leaveQuota?.policy_rules?.casual_leave?.half_day_session || 'afternoon_only';
                          const fnStart = leaveQuota?.policy_rules?.casual_leave?.forenoon_start_time || '09:00 AM';
                          const fnEnd = leaveQuota?.policy_rules?.casual_leave?.forenoon_end_time || '12:00 PM';
                          const anStart = leaveQuota?.policy_rules?.casual_leave?.afternoon_start_time || '12:00 PM';
                          const anEnd = leaveQuota?.policy_rules?.casual_leave?.afternoon_end_time || '05:00 PM';

                          const isSelectedDateToday = dateRange?.from ? isSameDay(dateRange.from, new Date()) : false;
                          const now = new Date();
                          const currentMinutes = now.getHours() * 60 + now.getMinutes();

                          const fnEndMinutes = parseTimeToMinutes(fnEnd, 12 * 60);
                          const anEndMinutes = parseTimeToMinutes(anEnd, 17 * 60);

                          const isFnPassedForToday = isSelectedDateToday && currentMinutes >= fnEndMinutes;
                          const isAnPassedForToday = isSelectedDateToday && currentMinutes >= anEndMinutes;
                          const allPassedForToday = isSelectedDateToday && (
                            (sessionRule === 'forenoon_only' && isFnPassedForToday) ||
                            (sessionRule === 'afternoon_only' && isAnPassedForToday) ||
                            (sessionRule === 'both' && isFnPassedForToday && isAnPassedForToday)
                          );

                          if (allPassedForToday) {
                            return (
                              <div className="p-3 rounded-lg border border-amber-500/30 bg-amber-500/10 text-xs space-y-1">
                                <div className="font-semibold text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
                                  <AlertCircle className="w-4 h-4 text-amber-500 shrink-0" />
                                  Half-Day Closed for Today
                                </div>
                                <p className="text-[11px] text-muted-foreground">
                                  Today&apos;s configured session timings have already passed. Please select a future date to apply for Half-Day CL.
                                </p>
                              </div>
                            );
                          }

                          if (sessionRule === 'both') {
                            return (
                              <div className="grid grid-cols-2 gap-2">
                                <button
                                  type="button"
                                  disabled={isFnPassedForToday}
                                  onClick={() => setHalfDaySession('forenoon')}
                                  className={`p-2.5 rounded-lg border text-xs text-left transition-all ${isFnPassedForToday
                                    ? 'opacity-50 cursor-not-allowed border-border/40 bg-muted/20 text-muted-foreground'
                                    : halfDaySession === 'forenoon'
                                      ? 'border-primary bg-primary/10 text-primary ring-1 ring-primary'
                                      : 'border-border bg-background hover:bg-muted/30 text-muted-foreground'
                                    }`}
                                >
                                  <div className="font-semibold text-foreground flex items-center justify-between">
                                    <span>Morning Session</span>
                                    {isFnPassedForToday && (
                                      <span className="text-[9px] px-1 py-0.2 rounded bg-rose-500/10 text-rose-500 font-semibold">Passed</span>
                                    )}
                                  </div>
                                  <div className="text-[10px] text-muted-foreground mt-0.5">
                                    {fnStart} - {fnEnd}
                                  </div>
                                </button>
                                <button
                                  type="button"
                                  disabled={isAnPassedForToday}
                                  onClick={() => setHalfDaySession('afternoon')}
                                  className={`p-2.5 rounded-lg border text-xs text-left transition-all ${isAnPassedForToday
                                    ? 'opacity-50 cursor-not-allowed border-border/40 bg-muted/20 text-muted-foreground'
                                    : halfDaySession === 'afternoon'
                                      ? 'border-primary bg-primary/10 text-primary ring-1 ring-primary'
                                      : 'border-border bg-background hover:bg-muted/30 text-muted-foreground'
                                    }`}
                                >
                                  <div className="font-semibold text-foreground flex items-center justify-between">
                                    <span>Afternoon Session</span>
                                    {isAnPassedForToday && (
                                      <span className="text-[9px] px-1 py-0.2 rounded bg-rose-500/10 text-rose-500 font-semibold">Passed</span>
                                    )}
                                  </div>
                                  <div className="text-[10px] text-muted-foreground mt-0.5">
                                    {anStart} - {anEnd}
                                  </div>
                                </button>
                              </div>
                            );
                          } else if (sessionRule === 'forenoon_only' || sessionRule === 'morning_only') {
                            if (halfDaySession !== 'forenoon') {
                              setTimeout(() => setHalfDaySession('forenoon'), 0);
                            }
                            return (
                              <div className="p-2.5 rounded-lg border border-border bg-background text-xs flex items-center justify-between">
                                <div>
                                  <div className="font-semibold text-foreground">Morning Session Only</div>
                                  <div className="text-[10px] text-muted-foreground">
                                    Window: {fnStart} - Ends strictly before {fnEnd}
                                  </div>
                                </div>
                                <span className="text-[10px] font-medium px-2 py-0.5 rounded bg-muted text-muted-foreground">
                                  Custom Policy
                                </span>
                              </div>
                            );
                          } else {
                            if (halfDaySession !== 'afternoon') {
                              setTimeout(() => setHalfDaySession('afternoon'), 0);
                            }
                            return (
                              <div className="p-2.5 rounded-lg border border-border bg-background text-xs flex items-center justify-between">
                                <div>
                                  <div className="font-semibold text-foreground">Afternoon Session Only</div>
                                  <div className="text-[10px] text-muted-foreground">
                                    Starts strictly from {anStart} (Window: {anStart} - {anEnd})
                                  </div>
                                </div>
                                <span className="text-[10px] font-medium px-2 py-0.5 rounded bg-muted text-muted-foreground">
                                  Custom Policy
                                </span>
                              </div>
                            );
                          }
                        })()}
                      </div>
                    )}
                  </div>
                )}

                {/* Date Selection */}
                {leaveType !== 'short_permission' ? (
                  <div className="space-y-2">
                    <Label className={`apply-leave-label ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>
                      {isHalfDay ? 'Leave Date (Single Day)' : 'Date Range'} <span className="text-red-500">*</span>
                    </Label>
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
                      Leave History
                    </CardTitle>
                    <p className={`text-xs sm:text-sm ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}`}>
                      Track your leave requests and approval status
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
              <CardContent className="flex-1 flex flex-col p-3 sm:p-4 pt-2 sm:pt-4 overflow-y-auto custom-scrollbar">
                <div className="flex-1 flex flex-col min-h-[360px] sm:min-h-[420px] w-full">
                  {/* Mobile View */}
                  <div className="md:hidden flex-1 flex flex-col space-y-3">
                    {loading ? (
                      <SkeletonList count={3} />
                    ) : filteredLeaveList.length === 0 ? (
                      <div className={`flex-1 flex flex-col items-center justify-center py-12 px-4 rounded-xl border-2 border-dashed ${theme === 'dark' ? 'border-border bg-card/30' : 'border-gray-200 bg-gray-50/50'}`}>
                        <CalendarCheck2 className="w-10 h-10 text-primary/40 mb-3" />
                        <h3 className="text-sm font-semibold mb-1 text-foreground">No applications found</h3>
                        <p className="text-xs text-muted-foreground text-center max-w-[240px]">Your leave application records will appear here.</p>
                      </div>
                    ) : (
                      filteredLeaveList.map((leave) => (
                        <div key={leave.id} className={`p-3.5 rounded-xl border space-y-2.5 ${theme === 'dark' ? 'bg-card border-border' : 'bg-white border-gray-200 shadow-sm'}`}>
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0 flex-1">
                              <div className="font-semibold text-sm text-foreground">{leave.title || 'Leave Application'}</div>
                              <div className="text-xs text-muted-foreground mt-0.5">
                                {leave.from === leave.to ? leave.from : `${leave.from} → ${leave.to}`}
                                {leave.start_time && leave.end_time && (
                                  <span className="font-mono text-[11px] ml-1">({leave.start_time} - {leave.end_time})</span>
                                )}
                              </div>
                              <div className="mt-2">
                                {renderCategoryBadge(leave)}
                              </div>
                              {leave.alternate_faculty_name && (
                                <div className="text-[11px] text-muted-foreground mt-2 flex items-center gap-1.5 flex-wrap">
                                  <span>Substitute:</span>
                                  <span className="text-foreground font-medium">{leave.alternate_faculty_name}</span>
                                  <span className={`text-[10px] font-semibold px-1.5 py-0.2 rounded border ${leave.alternate_duty_status === 'ACCEPTED'
                                    ? 'text-emerald-700 bg-emerald-50 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400'
                                    : leave.alternate_duty_status === 'DECLINED'
                                      ? 'text-rose-700 bg-rose-50 border-rose-200 dark:bg-rose-950/30 dark:text-rose-400'
                                      : 'text-amber-700 bg-amber-50 border-amber-200 dark:bg-amber-950/30 dark:text-amber-400'
                                    }`}>
                                    {leave.alternate_duty_status || 'PENDING'}
                                  </span>
                                </div>
                              )}
                            </div>
                            {renderStatus(leave)}
                          </div>

                          {/* Post-OD Attendance Certificate State */}
                          {leave.leave_type === 'od' && leave.status === 'Approved' && (
                            <div className="mt-2 pt-2 border-t border-border/40 space-y-1">
                              {leave.completion_document_url ? (
                                <div className="flex items-center gap-2 flex-wrap">
                                  <a
                                    href={leave.completion_document_url}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold hover:underline flex items-center gap-1"
                                  >
                                    <FileText className="w-3 h-3" /> Attendance Certificate <ExternalLink className="w-2.5 h-2.5" />
                                  </a>
                                </div>
                              ) : (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => {
                                    setTargetOdLeave(leave);
                                    setUploadCertModalOpen(true);
                                    setCompletionCertFile(null);
                                  }}
                                  className="text-[10px] h-6 px-2 font-semibold text-amber-700 dark:text-amber-400 border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/30 hover:bg-amber-100 flex items-center gap-1 w-full justify-center"
                                >
                                  <Upload className="w-3 h-3" /> Upload Attendance Certificate
                                </Button>
                              )}
                            </div>
                          )}

                          <div className="mt-3 flex flex-col gap-2">
                            <button
                              onClick={() => handleOpenLeaveDetails(leave)}
                              className="w-full text-center text-xs font-medium py-2 px-3 rounded-lg border border-primary/20 text-primary bg-primary/5 hover:bg-primary/10 flex items-center justify-center gap-1.5"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              View Approval Flow & Reason
                            </button>

                            {leave.initial_document_url && (
                              <a
                                href={leave.initial_document_url}
                                target="_blank"
                                rel="noreferrer"
                                className={`w-full h-8 text-xs font-medium flex items-center justify-center gap-1.5 rounded-lg border shadow-sm transition-all ${theme === 'dark'
                                  ? 'border-sky-500/30 bg-sky-950/30 text-sky-300 hover:bg-sky-950/50'
                                  : 'border-sky-200 bg-sky-50 text-sky-700 hover:bg-sky-100'
                                  }`}
                                title="View Attached Duty Order / Document Proof"
                              >
                                <FileText className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
                                <span>View Attachment</span>
                                <ExternalLink className="w-3 h-3 opacity-70" />
                              </a>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  {/* Desktop Table View */}
                  {filteredLeaveList.length === 0 && !loading ? (
                    <div className={`hidden md:flex flex-1 flex-col items-center justify-center py-16 px-4 rounded-xl border-2 border-dashed ${theme === 'dark' ? 'border-border bg-card/30' : 'border-gray-200 bg-gray-50/50'}`}>
                      <CalendarCheck2 className="w-12 h-12 text-primary/40 mb-3" />
                      <h3 className="text-sm font-semibold mb-1 text-foreground">No applications found</h3>
                      <p className="text-xs text-muted-foreground text-center max-w-[280px]">Your leave application records will appear here.</p>
                    </div>
                  ) : (
                    <div className="hidden md:block w-full overflow-x-auto custom-scrollbar">
                      <table className="w-full min-w-[780px] text-sm text-left border-collapse">
                        <thead className={`border-b ${theme === 'dark' ? 'border-border bg-card' : 'border-gray-200 bg-gray-50/80'}`}>
                          <tr>
                            <th className="py-3 px-3.5 text-left font-semibold text-xs text-muted-foreground uppercase tracking-wider min-w-[140px]">Title</th>
                            <th className="py-3 px-3.5 text-left font-semibold text-xs text-muted-foreground uppercase tracking-wider min-w-[140px]">Category</th>
                            <th className="py-3 px-3.5 text-left font-semibold text-xs text-muted-foreground uppercase tracking-wider min-w-[160px]">Period</th>
                            <th className="py-3 px-3.5 text-left font-semibold text-xs text-muted-foreground uppercase tracking-wider min-w-[140px]">Substitute</th>
                            <th className="py-3 px-3.5 text-left font-semibold text-xs text-muted-foreground uppercase tracking-wider min-w-[130px]">Status & Pipeline</th>
                            <th className="py-3 px-3.5 text-right font-semibold text-xs text-muted-foreground uppercase tracking-wider min-w-[70px]">Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {loading ? (
                            <tr>
                              <td colSpan={6} className="p-4"><SkeletonList count={3} /></td>
                            </tr>
                          ) : (
                            filteredLeaveList.map((leave) => (
                              <tr
                                key={leave.id}
                                className={`border-b transition-colors ${theme === 'dark' ? 'border-border hover:bg-accent/40' : 'border-gray-200 hover:bg-gray-50/80'}`}
                              >
                                {/* Title */}
                                <td className="py-3.5 px-3 align-top text-left">
                                  <div className="font-semibold text-xs sm:text-sm text-foreground truncate" title={leave.title}>
                                    {leave.title || 'Leave Application'}
                                  </div>
                                  {leave.initial_document_url && (
                                    <div className="mt-1.5">
                                      <a
                                        href={leave.initial_document_url}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-medium bg-sky-50 text-sky-700 dark:bg-sky-950/50 dark:text-sky-300 border border-sky-200 dark:border-sky-800 hover:bg-sky-100 transition-colors shrink-0 whitespace-nowrap"
                                        title="View Attached Duty Order / Document Proof"
                                      >
                                        <FileText className="w-2.5 h-2.5 text-sky-600 dark:text-sky-400 shrink-0" />
                                        <span>Attachment</span>
                                        <ExternalLink className="w-2 h-2 opacity-70 shrink-0" />
                                      </a>
                                    </div>
                                  )}
                                </td>

                                {/* Category */}
                                <td className="py-3.5 px-3 align-top text-left">
                                  {renderCategoryBadge(leave)}
                                </td>

                                {/* Period */}
                                <td className="py-3.5 px-3 align-top text-left text-xs">
                                  <div className="font-medium text-foreground leading-tight whitespace-nowrap">
                                    {leave.from === leave.to ? leave.from : `${leave.from} → ${leave.to}`}
                                  </div>
                                  {leave.start_time && leave.end_time && (
                                    <div className="text-muted-foreground text-[10px] font-mono mt-0.5 whitespace-nowrap">
                                      {leave.start_time} - {leave.end_time}
                                    </div>
                                  )}
                                </td>

                                {/* Substitute */}
                                <td className="py-3.5 px-3 align-top text-left text-xs">
                                  {leave.alternate_faculty_name ? (
                                    <div className="space-y-0.5">
                                      <div className="font-medium text-foreground leading-tight truncate" title={leave.alternate_faculty_name}>
                                        {leave.alternate_faculty_name}
                                      </div>
                                      <span className={`inline-block text-[9px] font-semibold px-1.5 py-0.2 rounded border ${leave.alternate_duty_status === 'ACCEPTED'
                                        ? 'text-emerald-700 bg-emerald-50 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-800'
                                        : leave.alternate_duty_status === 'DECLINED'
                                          ? 'text-rose-700 bg-rose-50 border-rose-200 dark:bg-rose-950/30 dark:text-rose-400 dark:border-rose-800'
                                          : 'text-amber-700 bg-amber-50 border-amber-200 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-800'
                                        }`}>
                                        {leave.alternate_duty_status || 'PENDING'}
                                      </span>
                                    </div>
                                  ) : (
                                    <span className="text-muted-foreground italic text-xs">None nominated</span>
                                  )}
                                </td>

                                {/* Status & Pipeline */}
                                <td className="py-3.5 px-3 align-top text-left">
                                  {renderStatus(leave)}

                                  {/* OD Post-Completion Certificate Actions in Table */}
                                  {leave.leave_type === 'od' && leave.status === 'Approved' && (
                                    <div className="mt-1 space-y-1">
                                      {leave.completion_document_url ? (
                                        <div className="flex items-center">
                                          <a
                                            href={leave.completion_document_url}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="inline-flex items-center justify-center gap-1 min-w-[86px] px-2.5 py-0.5 rounded-full text-[10px] text-emerald-700 dark:text-emerald-300 font-semibold bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 hover:bg-emerald-100 transition-colors whitespace-nowrap"
                                          >
                                            <FileText className="w-2.5 h-2.5" /> <span>Cert</span> <ExternalLink className="w-2 h-2 opacity-80" />
                                          </a>
                                        </div>
                                      ) : (
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          onClick={() => {
                                            setTargetOdLeave(leave);
                                            setUploadCertModalOpen(true);
                                            setCompletionCertFile(null);
                                          }}
                                          className="text-[9px] h-6 px-2 min-w-[86px] rounded-full font-semibold text-amber-700 dark:text-amber-400 border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/30 hover:bg-amber-100 flex items-center justify-center gap-1 shadow-none"
                                        >
                                          <Upload className="w-2.5 h-2.5" /> Upload Cert
                                        </Button>
                                      )}
                                    </div>
                                  )}
                                </td>

                                {/* Action */}
                                <td className="py-3.5 px-3 align-top text-right">
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="text-xs h-7 px-2.5 inline-flex items-center justify-center gap-1 ml-auto border-primary/30 text-primary hover:bg-primary/10 shadow-none font-medium whitespace-nowrap"
                                    onClick={() => handleOpenLeaveDetails(leave)}
                                  >
                                    <Eye className="w-3.5 h-3.5" />
                                    <span>View</span>
                                  </Button>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </CardContent>
              {pagination.paginationState.totalPages > 1 && (
                <CardFooter className="flex flex-col sm:flex-row justify-between items-center gap-4 text-sm text-muted-foreground px-6 py-4 border-t border-border mt-auto">
                  <div>
                    Showing {pagination.paginationState.totalItems === 0 ? 0 : Math.min((pagination.page - 1) * pagination.pageSize + 1, pagination.paginationState.totalItems)} to {Math.min(pagination.page * pagination.pageSize, pagination.paginationState.totalItems)} of {pagination.paginationState.totalItems} applications
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => pagination.goToPage(Math.max(1, pagination.page - 1))}
                      disabled={pagination.page === 1 || loading}
                      className="bg-primary hover:bg-primary/90 text-white border-primary h-9 px-4 transition-all"
                    >
                      Previous
                    </Button>

                    <div className="flex items-center justify-center min-w-[2rem]">
                      <span className={`text-sm font-semibold ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>
                        {pagination.page}
                      </span>
                    </div>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => pagination.goToPage(Math.min(pagination.paginationState.totalPages, pagination.page + 1))}
                      disabled={pagination.page >= pagination.paginationState.totalPages || loading}
                      className="bg-primary hover:bg-primary/90 text-white border-primary h-9 px-4 transition-all"
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
                <DialogTitle className="sm:text-lg font-semibold flex items-center gap-2 w-full">
                  <ShieldCheck className="w-5 h-5 text-primary" />
                  <span>Leave Approval Workflow Flow</span>
                  {detailsLoading && (
                    <Clock className="w-4 h-4 text-muted-foreground animate-spin ml-auto" />
                  )}
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
                      <span className="text-[10px] uppercase font-semibold px-2 py-0.5 rounded bg-primary/10 text-primary">
                        {selectedLeaveForFlow.leave_type?.replace('_', ' ')}
                      </span>
                      {selectedLeaveForFlow.is_half_day && (
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-400">
                          Half-Day ({selectedLeaveForFlow.half_day_session?.toLowerCase() === 'forenoon' || selectedLeaveForFlow.half_day_session?.toLowerCase() === 'morning' ? 'Morning' : 'Afternoon'})
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Role-Based Sequential Approval Pipeline Flow */}
                <div>
                  <h5 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-1.5">
                    <span>Approval Pipeline</span>
                    <span className="text-[10px] lowercase font-normal opacity-70">(Role-Based Routing)</span>
                  </h5>

                  <div className="relative pl-6 space-y-4 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-border">
                    {/* Stage 0: Alternate Colleague Duty */}
                    {((selectedLeaveForFlow.substitute_assignments && selectedLeaveForFlow.substitute_assignments.length > 0) || selectedLeaveForFlow.alternate_faculty_name) && (
                      <div className="relative group">
                        <div className={`absolute -left-6 top-1 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-semibold ${selectedLeaveForFlow.alternate_duty_status === 'ACCEPTED'
                          ? 'bg-emerald-500 text-white'
                          : selectedLeaveForFlow.alternate_duty_status === 'DECLINED'
                            ? 'bg-rose-500 text-white'
                            : selectedLeaveForFlow.current_stage === 'alternate_duty'
                              ? 'bg-amber-500 text-white ring-4 ring-amber-500/20 animate-pulse'
                              : 'bg-muted text-muted-foreground'
                          }`}>
                          {selectedLeaveForFlow.alternate_duty_status === 'ACCEPTED' ? <Check className="w-3 h-3" /> : '1'}
                        </div>
                        <div className={`p-3 rounded-lg border text-xs ${selectedLeaveForFlow.current_stage === 'alternate_duty' && selectedLeaveForFlow.status === 'Pending'
                          ? 'border-amber-500/50 bg-amber-500/5 shadow-sm'
                          : theme === 'dark' ? 'bg-card border-border' : 'bg-white border-gray-200'
                          }`}>
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-semibold text-foreground flex items-center gap-1.5">
                              <span>Alternate Duty Coverage</span>
                              {selectedLeaveForFlow.substitute_assignments && selectedLeaveForFlow.substitute_assignments.length > 1 && (
                                <span className="text-[10px] font-semibold px-1.5 py-0.2 rounded bg-primary/10 text-primary">
                                  {selectedLeaveForFlow.substitute_assignments.length} Nominees
                                </span>
                              )}
                            </span>
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${selectedLeaveForFlow.alternate_duty_status === 'ACCEPTED'
                              ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400'
                              : selectedLeaveForFlow.alternate_duty_status === 'DECLINED'
                                ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400'
                                : 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400'
                              }`}>
                              {selectedLeaveForFlow.alternate_duty_status || 'PENDING'}
                            </span>
                          </div>

                          {/* Render all assigned substitutes */}
                          {selectedLeaveForFlow.substitute_assignments && selectedLeaveForFlow.substitute_assignments.length > 0 ? (
                            <div className="mt-2.5 space-y-2">
                              {selectedLeaveForFlow.substitute_assignments.map((sub, sIdx) => {
                                const isSubAcc = sub.status === 'ACCEPTED';
                                const isSubDec = sub.status === 'DECLINED';
                                return (
                                  <div key={sub.id || sIdx} className={`p-2 rounded-md border flex items-center justify-between gap-2 text-xs ${
                                    isSubAcc
                                      ? (theme === 'dark' ? 'bg-emerald-950/20 border-emerald-800/40' : 'bg-emerald-50/60 border-emerald-200')
                                      : isSubDec
                                        ? (theme === 'dark' ? 'bg-rose-950/20 border-rose-800/40' : 'bg-rose-50/60 border-rose-200')
                                        : (theme === 'dark' ? 'bg-muted/20 border-border/60' : 'bg-gray-50 border-gray-200')
                                  }`}>
                                    <div className="min-w-0">
                                      <div className="font-medium text-foreground flex items-center gap-1.5">
                                        <UserCheck className="w-3.5 h-3.5 text-primary shrink-0" />
                                        <span className="truncate">{sub.name}</span>
                                        {sub.role && (
                                          <span className="text-[9px] uppercase px-1 py-0.2 rounded bg-muted text-muted-foreground">
                                            {sub.role.replace('_', ' ')}
                                          </span>
                                        )}
                                      </div>
                                      {sub.acted_at && (
                                        <div className="text-[10px] text-muted-foreground mt-0.5">
                                          Responded: {sub.acted_at}
                                        </div>
                                      )}
                                      {sub.remarks && (
                                        <div className="text-[10px] italic text-muted-foreground mt-0.5">
                                          "{sub.remarks}"
                                        </div>
                                      )}
                                    </div>
                                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-semibold shrink-0 ${
                                      isSubAcc
                                        ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400'
                                        : isSubDec
                                          ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400'
                                          : 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400'
                                    }`}>
                                      {sub.status}
                                    </span>
                                  </div>
                                );
                              })}
                            </div>
                          ) : (
                            <p className="text-muted-foreground mt-1">
                              Nominated: <span className="font-medium text-foreground">{selectedLeaveForFlow.alternate_faculty_name}</span>
                            </p>
                          )}

                          {selectedLeaveForFlow.alternate_duty_acted_at && (!selectedLeaveForFlow.substitute_assignments || selectedLeaveForFlow.substitute_assignments.length <= 1) && (
                            <p className="text-[10px] text-muted-foreground mt-1">
                              Acted on: {selectedLeaveForFlow.alternate_duty_acted_at}
                            </p>
                          )}
                          {selectedLeaveForFlow.alternate_duty_remarks && (!selectedLeaveForFlow.substitute_assignments || selectedLeaveForFlow.substitute_assignments.length <= 1) && (
                            <p className="text-[11px] mt-1 p-1.5 rounded bg-muted/30 italic">
                              "{selectedLeaveForFlow.alternate_duty_remarks}"
                            </p>
                          )}

                          {selectedLeaveForFlow.current_stage === 'alternate_duty' && selectedLeaveForFlow.status === 'Pending' && (
                            <p className="text-[11px] font-medium text-amber-600 dark:text-amber-400 mt-2 flex items-center gap-1">
                              <Clock className="w-3 h-3 animate-spin" />
                              Awaiting approval from all nominated substitute colleagues before forwarding to next authority.
                            </p>
                          )}

                          {/* Re-nominate Colleague Option when DECLINED or PENDING in alternate_duty stage */}
                          {(selectedLeaveForFlow.alternate_duty_status === 'DECLINED' ||
                            (selectedLeaveForFlow.current_stage === 'alternate_duty' && selectedLeaveForFlow.status === 'Pending')) && (
                              <div className="mt-3 pt-2.5 border-t border-border/40">
                                {!isRenominating ? (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={handleStartRenominating}
                                    className="text-xs h-7 px-2.5 font-semibold text-primary border-primary/30 hover:bg-primary/5 flex items-center gap-1.5"
                                  >
                                    <UserCheck className="w-3.5 h-3.5" />
                                    {selectedLeaveForFlow.alternate_duty_status === 'DECLINED' ? 'Change / Re-nominate Colleague(s)' : 'Change Nominated Colleague(s)'}
                                  </Button>
                                ) : (
                                <div className="space-y-3 p-3 rounded-lg bg-muted/20 border border-border">
                                  <div className="flex items-center justify-between pb-1 border-b border-border/40">
                                    <Label className="text-xs font-semibold text-foreground">
                                      Re-nominate Substitute Colleague(s)
                                    </Label>
                                    <button
                                      type="button"
                                      onClick={() => setIsRenominating(false)}
                                      className="text-[10px] text-muted-foreground hover:text-foreground underline"
                                    >
                                      Cancel
                                    </button>
                                  </div>

                                  {/* Step 1: Substitute Role */}
                                  <div className="space-y-1.5">
                                    <Label className="text-[11px] font-medium text-foreground">
                                      Substitute Role <span className="text-red-500">*</span>
                                    </Label>
                                    <Select
                                      value={renominateRole || undefined}
                                      onValueChange={(val) => {
                                        setRenominateRole(val);
                                        setRenominateBranch('');
                                        setNewColleagueId('');
                                        setRenominateColleagueIds([]);
                                      }}
                                    >
                                      <SelectTrigger className={`h-8 text-xs ${theme === 'dark' ? 'bg-card border-border' : 'bg-white'}`}>
                                        <SelectValue placeholder="Choose role for duty coverage..." />
                                      </SelectTrigger>
                                      <SelectContent className={`max-h-[220px] ${theme === 'dark' ? 'bg-card border-border text-foreground' : ''}`}>
                                        <SelectItem value="faculty">Faculty Member / Teacher</SelectItem>
                                        <SelectItem value="hod">Head of Department (HOD)</SelectItem>
                                        <SelectItem value="dean">Dean</SelectItem>
                                        <SelectItem value="principal">Principal</SelectItem>
                                        <SelectItem value="coe">Controller of Examinations (COE)</SelectItem>
                                        <SelectItem value="fees_manager">Fees & Accounts Manager</SelectItem>
                                        <SelectItem value="admission_manager">Admission Manager</SelectItem>
                                        <SelectItem value="hms_admin">Hostel Manager (HMS)</SelectItem>
                                        <SelectItem value="warden">Hostel Warden</SelectItem>
                                        <SelectItem value="library_admin">Library Admin</SelectItem>
                                        <SelectItem value="transport_admin">Transport Admin</SelectItem>
                                        <SelectItem value="driver">Driver / Fleet Staff</SelectItem>
                                        <SelectItem value="group_d">Group D / Support Staff</SelectItem>
                                        <SelectItem value="security">Security Staff</SelectItem>
                                        <SelectItem value="counsellor">Counsellor</SelectItem>
                                      </SelectContent>
                                    </Select>
                                  </div>

                                  {/* Step 1.5: Department / Branch (When Faculty/Teacher or HOD is selected) */}
                                  {renominateRole && (renominateRole === 'faculty' || renominateRole === 'teacher' || renominateRole === 'hod') && (
                                    <div className="space-y-1.5">
                                      <div className="flex items-center justify-between">
                                        <Label className="text-[11px] font-medium text-foreground">
                                          Department / Branch <span className="text-red-500">*</span>
                                        </Label>
                                        <span className="text-[10px] text-muted-foreground">Select branch first</span>
                                      </div>
                                      <Select
                                        value={renominateBranch || undefined}
                                        onValueChange={(val) => {
                                          setRenominateBranch(val);
                                          setNewColleagueId('');
                                          setRenominateColleagueIds([]);
                                        }}
                                      >
                                        <SelectTrigger className={`h-8 text-xs ${theme === 'dark' ? 'bg-card border-border' : 'bg-white'}`}>
                                          <SelectValue placeholder="Choose Department / Branch..." />
                                        </SelectTrigger>
                                        <SelectContent className={`max-h-[220px] ${theme === 'dark' ? 'bg-card border-border text-foreground' : ''}`}>
                                          {branches.map((b) => (
                                            <SelectItem key={b.id} value={b.id.toString()}>
                                              {b.name}
                                            </SelectItem>
                                          ))}
                                        </SelectContent>
                                      </Select>
                                    </div>
                                  )}

                                  {/* Step 2: Assign To Colleague(s) */}
                                  <div className="space-y-1.5">
                                    <div className="flex items-center justify-between">
                                      <Label className="text-[11px] font-medium text-foreground">
                                        Assign To <span className="text-red-500">*</span>
                                      </Label>
                                      {renominateColleagueIds.length > 0 && (
                                        <span className="text-[10px] text-primary font-semibold">
                                          {renominateColleagueIds.length} selected
                                        </span>
                                      )}
                                    </div>
                                    {(() => {
                                      const isBranchRole = renominateRole === 'faculty' || renominateRole === 'teacher' || renominateRole === 'hod';
                                      const isBranchMissing = isBranchRole && !renominateBranch;

                                      if (!renominateRole) {
                                        return (
                                          <div className="text-[11px] text-muted-foreground p-2 rounded border bg-muted/20">
                                            Select substitute role first...
                                          </div>
                                        );
                                      }

                                      if (isBranchMissing) {
                                        return (
                                          <div className="text-[11px] text-amber-600 dark:text-amber-400 p-2 rounded border bg-amber-50 dark:bg-amber-950/20">
                                            Select department / branch above first...
                                          </div>
                                        );
                                      }

                                      if (renominateColleaguesLoading) {
                                        return (
                                          <div className="text-[11px] text-muted-foreground p-2 rounded border bg-muted/20 flex items-center gap-1.5">
                                            <Clock className="w-3.5 h-3.5 animate-spin text-primary" />
                                            Loading colleagues...
                                          </div>
                                        );
                                      }

                                      const validRenomPool = renominateColleagues.filter(c => c.username !== user?.username);

                                      if (validRenomPool.length === 0) {
                                        return (
                                          <div className="text-[11px] text-muted-foreground p-2 rounded border bg-muted/20">
                                            No colleagues found for this role/branch
                                          </div>
                                        );
                                      }

                                      const toggleRenomColleague = (idStr: string) => {
                                        setRenominateColleagueIds(prev => {
                                          const next = prev.includes(idStr)
                                            ? prev.filter(x => x !== idStr)
                                            : [...prev, idStr];
                                          setNewColleagueId(next[0] || '');
                                          return next;
                                        });
                                      };

                                      return (
                                        <div className="space-y-2">
                                          <div className={`max-h-36 overflow-y-auto rounded border divide-y ${theme === 'dark' ? 'bg-background border-border divide-border' : 'bg-white border-gray-200 divide-gray-100'}`}>
                                            {validRenomPool.map((c) => {
                                              const isChecked = renominateColleagueIds.includes(String(c.id));
                                              return (
                                                <label
                                                  key={c.id}
                                                  className={`flex items-center gap-2 p-2 cursor-pointer text-xs transition-colors hover:bg-muted/40 ${
                                                    isChecked ? (theme === 'dark' ? 'bg-primary/10' : 'bg-primary/5 font-medium') : ''
                                                  }`}
                                                >
                                                  <Checkbox
                                                    checked={isChecked}
                                                    onCheckedChange={() => toggleRenomColleague(String(c.id))}
                                                    className="shrink-0"
                                                  />
                                                  <span className="truncate flex-1 text-foreground">{c.name}</span>
                                                </label>
                                              );
                                            })}
                                          </div>
                                        </div>
                                      );
                                    })()}
                                  </div>

                                  <div className="flex gap-2 justify-end pt-2 border-t border-border/40">
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={() => setIsRenominating(false)}
                                      className="h-7 text-xs px-2.5"
                                    >
                                      Cancel
                                    </Button>
                                    <Button
                                      size="sm"
                                      onClick={handleRenominateColleague}
                                      disabled={(renominateColleagueIds.length === 0 && !newColleagueId) || renominatingLoading}
                                      className="h-7 text-xs px-3 font-semibold bg-primary text-white hover:bg-primary/90 shadow-xs"
                                    >
                                      {renominatingLoading ? 'Sending...' : 'Confirm & Nominate'}
                                    </Button>
                                  </div>
                                </div>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                    {/* Sequential Stages or Auto-Approved 0-Stage Record */}
                    {(() => {
                      const reviewerStages = (selectedLeaveForFlow.configured_stages ?? []).filter((s: string) => s && s !== 'alternate_duty');
                      const isAutoApprovedZeroStage = (selectedLeaveForFlow.status === 'Approved' || selectedLeaveForFlow.current_stage === 'completed') && reviewerStages.length === 0;

                      if (isAutoApprovedZeroStage) {
                        return (
                          <div className="relative group">
                            <div className="absolute -left-6 top-1 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-semibold bg-emerald-500 text-white">
                              <Check className="w-3 h-3" />
                            </div>
                            <div className={`p-3.5 rounded-lg border text-xs ${theme === 'dark' ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-emerald-50 border-emerald-200'}`}>
                              <div className="flex items-center justify-between gap-2">
                                <span className="font-semibold text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5">
                                  <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                                  Auto-Approved for Records
                                </span>
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400">
                                  APPROVED
                                </span>
                              </div>
                              <p className="text-muted-foreground mt-1.5 text-[11px]">
                                This staff role is configured with 0 approval stages. The leave request was recorded and approved immediately upon submission.
                              </p>
                              {selectedLeaveForFlow.appliedOn && (
                                <p className="text-[10px] text-muted-foreground mt-1">
                                  Recorded at: {selectedLeaveForFlow.appliedOn}
                                </p>
                              )}
                            </div>
                          </div>
                        );
                      }

                      const stagesToRender = reviewerStages.length > 0
                        ? reviewerStages
                        : (selectedLeaveForFlow.status === 'Approved' ? [] : ['hod', 'principal']);

                      return stagesToRender.map((stageKey, idx) => {
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

                        const isApproved = statusBadge === 'APPROVED' || statusBadge === 'Approved' || selectedLeaveForFlow.status === 'Approved';
                        const isRejected = statusBadge === 'REJECTED' || statusBadge === 'Rejected';

                        return (
                          <div key={stageKey} className="relative group">
                            <div className={`absolute -left-6 top-1 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-semibold ${isApproved
                              ? 'bg-emerald-500 text-white'
                              : isRejected
                                ? 'bg-rose-500 text-white'
                                : isCurrentStage
                                  ? 'bg-amber-500 text-white ring-4 ring-amber-500/20 animate-pulse'
                                  : 'bg-muted text-muted-foreground'
                              }`}>
                              {isApproved ? <Check className="w-3 h-3" /> : stageNumber}
                            </div>
                            <div className={`p-3 rounded-lg border text-xs ${isCurrentStage
                              ? 'border-amber-500/50 bg-amber-500/5 shadow-sm'
                              : theme === 'dark' ? 'bg-card border-border' : 'bg-white border-gray-200'
                              }`}>
                              <div className="flex items-center justify-between gap-2">
                                <span className="font-semibold text-foreground flex items-center gap-1.5">
                                  <span>{stageTitle}</span>
                                  {isCurrentStage && (
                                    <span className="text-[9px] font-semibold px-1.5 py-0.2 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400">
                                      Current Stage
                                    </span>
                                  )}
                                </span>
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${isApproved
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
                      });
                    })()}
                  </div>
                </div>

                {/* Application Reason & Notes */}
                <div>
                  <h5 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
                    Application Reason
                  </h5>
                  <div className={`p-3 text-xs leading-relaxed whitespace-pre-wrap break-words max-h-36 overflow-y-auto rounded-lg border ${theme === 'dark' ? 'text-foreground bg-muted/20 border-border' : 'text-gray-900 bg-gray-50 border-gray-200'}`}>
                    {selectedLeaveForFlow.reason || 'No reason provided.'}
                  </div>
                </div>

                {/* Attached Documents / Cloudflare R2 Proofs */}
                {(selectedLeaveForFlow.initial_document_url || selectedLeaveForFlow.completion_document_url) && (
                  <div className="space-y-2">
                    <h5 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Attached Documents & Certificates
                    </h5>
                    <div className="flex flex-wrap gap-2">
                      {selectedLeaveForFlow.initial_document_url && (
                        <a
                          href={selectedLeaveForFlow.initial_document_url}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-primary/20 bg-primary/5 hover:bg-primary/10 text-primary text-xs font-medium transition-all"
                        >
                          <FileText className="w-3.5 h-3.5" />
                          <span>View Attached Proof / Order</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                      {selectedLeaveForFlow.completion_document_url && (
                        <a
                          href={selectedLeaveForFlow.completion_document_url}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-medium transition-all"
                        >
                          <FileText className="w-3.5 h-3.5" />
                          <span>View OD Attendance Certificate</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                    </div>
                  </div>
                )}

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

        {/* Upload Post-OD Attendance Certificate Dialog (Rule 9.8.2) */}
        <Dialog open={uploadCertModalOpen} onOpenChange={setUploadCertModalOpen}>
          <DialogContent className={theme === 'dark' ? 'bg-card text-foreground border border-border max-w-[90%] sm:max-w-md mx-auto rounded-xl p-5 sm:p-6' : 'bg-white text-gray-900 border border-gray-200 max-w-[90%] sm:max-w-md mx-auto rounded-xl p-5 sm:p-6'}>
            <DialogHeader>
              <DialogTitle className="text-base sm:text-lg font-semibold flex items-center gap-2">
                <Upload className="w-5 h-5 text-primary" />
                Upload OD Attendance Certificate
              </DialogTitle>
            </DialogHeader>

            {targetOdLeave && (
              <div className="space-y-4 mt-2">
                <div className={`p-3 rounded-lg border text-xs space-y-1 ${theme === 'dark' ? 'bg-muted/20 border-border' : 'bg-slate-50 border-slate-200'}`}>
                  <div className="font-semibold text-foreground">{targetOdLeave.title}</div>
                  <div className="text-muted-foreground">
                    Period: {targetOdLeave.from === targetOdLeave.to ? targetOdLeave.from : `${targetOdLeave.from} to ${targetOdLeave.to}`}
                  </div>
                  {targetOdLeave.od_purpose_category && (
                    <div className="text-emerald-600 dark:text-emerald-400 font-medium">
                      Purpose: {targetOdLeave.od_purpose_category.replace('_', ' ').toUpperCase()}
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-semibold">
                    Attendance / Participation Certificate File <span className="text-red-500">*</span>
                  </Label>
                  {/* Hidden Native File Input for Post-OD */}
                  <input
                    ref={certFileInputRef}
                    type="file"
                    className="hidden"
                    accept=".jpg,.jpeg,.png,.pdf,.doc,.docx,image/jpeg,image/png,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                    onChange={async (e) => {
                      const file = e.target.files?.[0] || null;
                      if (!file) return;

                      const allowedExtensions = ['jpg', 'jpeg', 'png', 'pdf', 'doc', 'docx'];
                      const ext = file.name.split('.').pop()?.toLowerCase() || '';

                      if (!allowedExtensions.includes(ext) && !file.type.startsWith('image/')) {
                        if (certFileInputRef.current) certFileInputRef.current.value = '';
                        setCompletionCertFile(null);
                        await MySwal.fire({
                          title: 'Unsupported File Format',
                          text: 'For images, only JPG and PNG formats are allowed (documents: PDF, DOC, DOCX).',
                          icon: 'warning',
                          confirmButtonColor: '#f59e0b',
                          background: currentTheme === 'dark' ? '#1c1c1e' : '#ffffff',
                          color: currentTheme === 'dark' ? '#ffffff' : '#000000'
                        });
                        return;
                      }

                      // Allow file to be chosen, submit will block if > 1MB
                      setCompletionCertFile(file);
                    }}
                  />

                  {/* Selected Certificate Preview Card OR Clean Upload Dropzone */}
                  {completionCertFile ? (
                    <div className={`p-3 rounded-xl border flex items-center justify-between gap-3 ${completionCertFile.size > 1024 * 1024
                      ? 'bg-rose-500/5 border-rose-500/40'
                      : theme === 'dark' ? 'bg-background/90 border-primary/30' : 'bg-white border-primary/30 shadow-sm'
                      }`}>
                      <div className="flex items-center gap-3 min-w-0">
                        {certPreviewUrl ? (
                          <img
                            src={certPreviewUrl}
                            alt="Certificate Preview"
                            className={`w-12 h-12 rounded-lg object-cover border shrink-0 bg-muted ${completionCertFile.size > 1024 * 1024 ? 'border-rose-500/40' : 'border-primary/20'
                              }`}
                          />
                        ) : (
                          <div className={`w-12 h-12 rounded-lg flex items-center justify-center shrink-0 border ${completionCertFile.size > 1024 * 1024
                            ? 'bg-rose-500/10 text-rose-500 border-rose-500/30'
                            : 'bg-primary/10 text-primary border-primary/20'
                            }`}>
                            <FileText className="w-6 h-6" />
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="font-semibold text-xs text-foreground truncate max-w-[180px] sm:max-w-[240px]">
                            {completionCertFile.name}
                          </p>
                          <p className="text-[11px] text-muted-foreground flex items-center gap-1.5 mt-0.5">
                            <span>{(completionCertFile.size / (1024 * 1024)).toFixed(2)} MB</span>
                            <span>•</span>
                            {completionCertFile.size > 1024 * 1024 ? (
                              <span className="text-rose-600 dark:text-rose-400 font-semibold flex items-center gap-0.5">
                                <AlertCircle className="w-3 h-3" /> Exceeds 1 MB Limit
                              </span>
                            ) : (
                              <span className="text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-0.5">
                                <CheckCircle2 className="w-3 h-3" /> Ready
                              </span>
                            )}
                          </p>
                          {completionCertFile.size > 1024 * 1024 && (
                            <p className="text-[10px] text-rose-500 font-medium mt-0.5">
                              Certificate must be under 1 MB to submit.
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => certFileInputRef.current?.click()}
                          className="text-[11px] h-7 px-2.5"
                        >
                          Change
                        </Button>
                        <button
                          type="button"
                          onClick={() => {
                            if (certFileInputRef.current) certFileInputRef.current.value = '';
                            setCompletionCertFile(null);
                          }}
                          className="p-1.5 rounded-lg text-muted-foreground hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-all"
                          title="Remove certificate"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div
                      onClick={() => certFileInputRef.current?.click()}
                      className={`border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-all hover:border-primary/50 hover:bg-primary/5 ${theme === 'dark' ? 'border-border/60 bg-background/50' : 'border-gray-200 bg-white/80'
                        }`}
                    >
                      <div className="flex flex-col items-center justify-center gap-1.5">
                        <div className="w-9 h-9 rounded-full bg-primary/10 text-primary flex items-center justify-center">
                          <Upload className="w-4 h-4" />
                        </div>
                        <div className="text-xs font-medium text-foreground">
                          Click to upload attendance certificate / proof
                        </div>
                        <div className="text-[10px] text-muted-foreground">
                          Supports: JPG, PNG images, PDF (Max 1 MB)
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex justify-end gap-2 pt-3 border-t border-border">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setUploadCertModalOpen(false);
                      setTargetOdLeave(null);
                      setCompletionCertFile(null);
                    }}
                    disabled={uploadingCert}
                    className="text-xs h-8 px-3"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={async () => {
                      if (!targetOdLeave || !completionCertFile) {
                        await MySwal.fire({
                          title: 'File Required',
                          text: 'Please select a certificate file to upload.',
                          icon: 'warning',
                          confirmButtonColor: '#3b82f6'
                        });
                        return;
                      }
                      const ext = completionCertFile.name.split('.').pop()?.toLowerCase() || '';
                      if (!['jpg', 'jpeg', 'png', 'pdf', 'doc', 'docx'].includes(ext)) {
                        await MySwal.fire({
                          title: 'Unsupported File Format',
                          text: 'For images, only JPG and PNG formats are allowed (documents: PDF, DOC, DOCX).',
                          icon: 'warning',
                          confirmButtonColor: '#f59e0b'
                        });
                        return;
                      }
                      if (completionCertFile.size > 1024 * 1024) {
                        await MySwal.fire({
                          title: 'File Size Exceeded',
                          text: `The selected certificate (${(completionCertFile.size / (1024 * 1024)).toFixed(2)} MB) exceeds the 1 MB limit.`,
                          icon: 'warning',
                          confirmButtonColor: '#f59e0b'
                        });
                        return;
                      }
                      setUploadingCert(true);
                      try {
                        const res = await uploadOdCompletionCertificate({
                          leave_id: targetOdLeave.id,
                          file: completionCertFile
                        });
                        if (res.success) {
                          await MySwal.fire({
                            title: 'Certificate Uploaded!',
                            text: res.message || 'Your OD attendance certificate has been submitted for HoD verification.',
                            icon: 'success',
                            confirmButtonColor: '#10b981'
                          });
                          setUploadCertModalOpen(false);
                          setTargetOdLeave(null);
                          setCompletionCertFile(null);
                          fetchBootstrapData();
                          fetchLeaveHistory();
                        } else {
                          throw new Error(res.message || 'Failed to upload certificate');
                        }
                      } catch (err: any) {
                        await MySwal.fire({
                          title: 'Upload Failed',
                          text: err.message || 'Failed to upload certificate',
                          icon: 'error',
                          confirmButtonColor: '#ef4444'
                        });
                      } finally {
                        setUploadingCert(false);
                      }
                    }}
                    disabled={!completionCertFile || uploadingCert}
                    className="bg-primary hover:bg-primary/90 text-white text-xs h-8 px-4 font-semibold"
                  >
                    {uploadingCert ? 'Uploading...' : 'Submit Certificate'}
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </>
  );
});

export default LeaveRequests;
