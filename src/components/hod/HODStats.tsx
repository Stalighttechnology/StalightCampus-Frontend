import UpcomingMeetingsWidget from "../common/UpcomingMeetingsWidget";
import { translateTerminology, getTerm } from "@/utils/institutionConfig";
import { useState, useEffect, useRef } from "react";
import {
  Users,
  Calendar,
  CheckCircle,
  XCircle,
  UserPlus,
  ClipboardList,
  CheckSquare,
  Video,
  ListTodo,
  Receipt,
  CreditCard,
  User,
  Bell,
  Filter,
  FileText,
  ExternalLink
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  PieChart,
  Pie,
  Legend,
} from "recharts";
import Swal from "sweetalert2";
import { useNavigate } from "react-router-dom";
import { getHODStats, manageLeaves, manageProfile, getHODDashboard, getHODDashboardBootstrap, getFacultyLeavesBootstrap, getHodStudentLeaves } from "../../utils/hod_api";
import { PLAN_TIERS } from "../../utils/planGating";
import { motion } from "framer-motion";
import { useTheme } from "../../context/ThemeContext";
import { SkeletonCard, SkeletonChart, SkeletonList, SkeletonStatsGrid, SkeletonTable, Skeleton } from "../ui/skeleton";
import { DepartmentStudentLeaves } from "./DepartmentStudentLeaves";

interface LeaveRequest {
  id: string;
  name: string;
  role: string;
  dept: string;
  title: string;
  leave_type: string;
  start_time?: string | null;
  end_time?: string | null;
  is_half_day?: boolean;
  half_day_session?: string | null;
  from: string;
  to: string;
  period: string;
  reason: string;
  status: "Pending" | "Approved" | "Rejected" | "Endorsed (Pending Principal)" | "Endorsed (Pending Dean)" | "Endorsed (Pending COE)" | "Endorsed (Pending Next Authority)" | string;
  initial_document_url?: string | null;
  completion_document_url?: string | null;
  od_completion_verified?: boolean;
  od_purpose_category?: string | null;
  alternate_faculty_name?: string | null;
  alternate_duty_status?: string;
  hod_approval_status?: string;
  hod_reviewed_by_name?: string | null;
  current_stage?: string;
  canApprove?: boolean;
}

interface StatsData {
  faculty_count: number;
  student_count: number;
  pending_leaves: number;
  average_attendance: number;
  attendance_trend: Array<{
    week: string;
    start_date: string;
    end_date: string;
    attendance_percentage: number | string;
  }>;
  faculty_attendance_today?: {
    total_faculty: number;
    present: number;
    absent: number;
    not_marked: number;
  };
}

interface HODStatsProps {
  setError: (err: string | null) => void;
  setPage: (page: string) => void;
  onBootstrapData?: (data: {
    branch_id: string;
    semesters: Array<{ id: string; number: number }>;
    sections: Array<{ id: string; name: string; semester_id: string }>;
  }) => void;
}

interface DashboardLeave {
  id: number;
  faculty_name: string;
  department: string;
  title?: string;
  leave_type?: string;
  is_half_day?: boolean;
  half_day_session?: string | null;
  start_time?: string | null;
  end_time?: string | null;
  start_date: string;
  end_date: string;
  reason: string;
  status: string;
}

export default function HODStats({ setError, setPage, onBootstrapData }: HODStatsProps) {
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
  const [stats, setStats] = useState<StatsData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const navigate = useNavigate();
  const [branchId, setBranchId] = useState<string | null>(null);
  const [hodName, setHodName] = useState(translateTerminology("HOD"));
  const [branchName, setBranchName] = useState("your");
  const { theme } = useTheme();

  // Tab & Filter states for Leave Approvals section
  const [activeTab, setActiveTab] = useState<"faculty" | "student">("faculty");
  const [facultyPendingCount, setFacultyPendingCount] = useState<number>(0);
  const [studentPendingCount, setStudentPendingCount] = useState<number>(0);
  const [search, setSearch] = useState("");
  const [localSearch, setLocalSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<"All" | "Pending" | "Approved" | "Rejected">("All");
  const [showFilter, setShowFilter] = useState(false);
  const filterRef = useRef<HTMLDivElement>(null);
  const [viewReason, setViewReason] = useState<string | null>(null);
  const initialLoadRef = useRef(true);

  // Close filter dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (filterRef.current && !filterRef.current.contains(event.target as Node)) {
        setShowFilter(false);
      }
    };

    if (showFilter) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showFilter]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(localSearch);
    }, 400);
    return () => clearTimeout(timer);
  }, [localSearch]);

  const userStr = sessionStorage.getItem("user") || localStorage.getItem("user");
  const user = userStr ? JSON.parse(userStr) : null;
  const orgPlan = user?.org_plan || "basic";
  const userTier = PLAN_TIERS[orgPlan.toLowerCase()] || 1;

  // Format date range to "MMM DD, YYYY to MMM DD, YYYY" (or single date if same day)
  const formatPeriod = (startDate: string, endDate: string): string => {
    try {
      const start = new Date(startDate);
      const end = new Date(endDate);
      const options: Intl.DateTimeFormatOptions = { month: "short", day: "2-digit", year: "numeric" };
      const startStr = start.toLocaleDateString("en-US", options);
      const endStr = end.toLocaleDateString("en-US", options);
      if (startDate === endDate || startStr === endStr) {
        return startStr;
      }
      return `${startStr} to ${endStr}`;
    } catch {
      return "Invalid date";
    }
  };

  const renderLeaveCategoryBadge = (leaveType?: string, isHalfDay?: boolean, halfDaySession?: string | null, odCategory?: string | null) => {
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
        <span className={`text-[10px] font-bold uppercase px-1.5 py-0.2 rounded w-fit ${colorClass}`}>
          {label}
        </span>
        {odCategory && (
          <span className="text-[10px] font-semibold px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 w-fit">
            OD: {odCategory.replace(/_/g, ' ').toUpperCase()}
          </span>
        )}
        {showHalfDay && (
          <span className="text-[10px] font-semibold px-1.5 py-0.2 rounded bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300 w-fit">
            Half-Day ({sessionText})
          </span>
        )}
      </div>
    );
  };

  // Fetch faculty leave requests with full metadata (limited to 5 recent leaves)
  const fetchFacultyLeaves = async (searchQuery = search, statusQuery = filterStatus) => {
    try {
      const filters = {
        status: statusQuery !== "All" ?
          statusQuery === "Pending" ? "PENDING" :
            statusQuery === "Approved" ? "APPROVED" :
              statusQuery === "Rejected" ? "REJECTED" : undefined : undefined,
        search: searchQuery || undefined,
        page: 1,
        page_size: 5
      };

      const response = await getFacultyLeavesBootstrap(undefined, filters);
      if (response.results?.success && response.results?.data) {
        const data = response.results.data;
        if (data.profile?.branch_id) {
          setBranchId(data.profile.branch_id);
        }

        if (typeof (data as any).pending_count === 'number') {
          setFacultyPendingCount((data as any).pending_count);
        } else if (typeof (response as any).pending_count === 'number') {
          setFacultyPendingCount((response as any).pending_count);
        }

        const today = new Date();
        const todayDateOnly = new Date(today.getFullYear(), today.getMonth(), today.getDate());
        const sevenDaysAgo = new Date(todayDateOnly);
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

        const processed = (data.leaves || [])
          .map((req: any) => {
            const isPending = req.status === "PENDING";
            const isHodApproved = req.hod_approval_status === "APPROVED";
            const isAtHod = req.current_stage === "hod";

            let displayStatus = "Pending";
            if (req.status === "APPROVED") {
              displayStatus = "Approved";
            } else if (req.status === "REJECTED") {
              displayStatus = "Rejected";
            } else if (isHodApproved) {
              const nextStage = (req.current_stage || '').toLowerCase();
              if (nextStage === 'principal') {
                displayStatus = "Endorsed (Pending Principal)";
              } else if (nextStage === 'dean') {
                displayStatus = "Endorsed (Pending Dean)";
              } else if (nextStage === 'coe') {
                displayStatus = "Endorsed (Pending COE)";
              } else if (nextStage && nextStage !== 'completed') {
                displayStatus = `Endorsed (Pending ${nextStage.replace('_', ' ').toUpperCase()})`;
              } else {
                displayStatus = "Endorsed (Pending Next Authority)";
              }
            } else {
              displayStatus = "Pending";
            }

            return {
              raw: req,
              mapped: {
                id: req.id.toString(),
                name: req.faculty_name || "Unknown",
                role: req.role || "teacher",
                dept: req.department || "Unknown",
                title: req.title || (req.leave_type === 'short_permission' ? 'Short Permission' : (req.reason ? req.reason.slice(0, 50) : 'Leave Request')),
                leave_type: req.leave_type || "casual",
                start_time: req.start_time,
                end_time: req.end_time,
                is_half_day: Boolean(req.is_half_day || req.leave_type === 'half_day'),
                half_day_session: req.half_day_session,
                from: req.start_date || "N/A",
                to: req.end_date || "N/A",
                period: formatPeriod(req.start_date, req.end_date),
                reason: req.reason || "No reason provided",
                status: displayStatus,
                initial_document_url: req.initial_document_url || null,
                completion_document_url: req.completion_document_url || null,
                od_completion_verified: Boolean(req.od_completion_verified),
                od_purpose_category: req.od_purpose_category || null,
                alternate_faculty_name: req.alternate_faculty_name,
                alternate_duty_status: req.alternate_duty_status,
                hod_approval_status: req.hod_approval_status,
                hod_reviewed_by_name: req.hod_reviewed_by_name,
                current_stage: req.current_stage,
                canApprove: isPending && isAtHod && !isHodApproved
              }
            };
          })
          .filter((item: any) => {
            const r = item.raw;
            const status = (r.status || '').toUpperCase();
            const isHodApproved = r.hod_approval_status === "APPROVED";

            if (status === 'PENDING') {
              if (isHodApproved) {
                const refDateStr = r.reviewed_at || r.submitted_at;
                if (!refDateStr) return true;
                const ref = new Date(refDateStr);
                const refDateOnly = new Date(ref.getFullYear(), ref.getMonth(), ref.getDate());
                return refDateOnly >= sevenDaysAgo;
              }
              try {
                const end = new Date(r.end_date);
                const endDateOnly = new Date(end.getFullYear(), end.getMonth(), end.getDate());
                return endDateOnly >= todayDateOnly;
              } catch {
                return false;
              }
            }

            if (status === 'APPROVED' || status === 'REJECTED') {
              const refDateStr = r.reviewed_at || r.submitted_at;
              if (!refDateStr) return false;
              const ref = new Date(refDateStr);
              const refDateOnly = new Date(ref.getFullYear(), ref.getMonth(), ref.getDate());
              return refDateOnly >= sevenDaysAgo;
            }

            return false;
          })
          .map((item: any) => item.mapped);

        setLeaveRequests(processed.slice(0, 5));
        if (typeof (data as any).pending_count !== 'number' && typeof (response as any).pending_count !== 'number') {
          setFacultyPendingCount(processed.filter((l: any) => l.canApprove || l.status === "Pending").length);
        }
      }
    } catch (err) {
      console.error("Error fetching faculty leaves:", err);
    }
  };
  // Map raw dashboard leave items to LeaveRequest
  const processLeavesData = (leaves: any[]) => {
    return leaves.map((req: any) => {
      const isPending = req.status === "PENDING";
      const isHodApproved = req.hod_approval_status === "APPROVED";
      const isAtHod = req.current_stage === "hod";

      let displayStatus = "Pending";
      if (req.status === "APPROVED") {
        displayStatus = "Approved";
      } else if (req.status === "REJECTED") {
        displayStatus = "Rejected";
      } else if (isHodApproved) {
        const nextStage = (req.current_stage || '').toLowerCase();
        if (nextStage === 'principal') {
          displayStatus = "Endorsed (Pending Principal)";
        } else if (nextStage === 'dean') {
          displayStatus = "Endorsed (Pending Dean)";
        } else if (nextStage === 'coe') {
          displayStatus = "Endorsed (Pending COE)";
        } else if (nextStage && nextStage !== 'completed') {
          displayStatus = `Endorsed (Pending ${nextStage.replace('_', ' ').toUpperCase()})`;
        } else {
          displayStatus = "Endorsed (Pending Next Authority)";
        }
      } else {
        displayStatus = "Pending";
      }

      return {
        id: req.id.toString(),
        name: req.faculty_name || "Unknown",
        role: req.role || "teacher",
        dept: req.department || "Unknown",
        title: req.title || (req.leave_type === 'short_permission' ? 'Short Permission' : (req.reason ? req.reason.slice(0, 50) : 'Leave Request')),
        leave_type: req.leave_type || "casual",
        start_time: req.start_time,
        end_time: req.end_time,
        is_half_day: Boolean(req.is_half_day || req.leave_type === 'half_day'),
        half_day_session: req.half_day_session,
        from: req.start_date || "N/A",
        to: req.end_date || "N/A",
        period: formatPeriod(req.start_date, req.end_date),
        reason: req.reason || "No reason provided",
        status: displayStatus,
        initial_document_url: req.initial_document_url || null,
        completion_document_url: req.completion_document_url || null,
        od_completion_verified: Boolean(req.od_completion_verified),
        od_purpose_category: req.od_purpose_category || null,
        alternate_faculty_name: req.alternate_faculty_name,
        alternate_duty_status: req.alternate_duty_status,
        hod_approval_status: req.hod_approval_status,
        hod_reviewed_by_name: req.hod_reviewed_by_name,
        current_stage: req.current_stage,
        canApprove: isPending && isAtHod && !isHodApproved
      };
    });
  };

  // Fetch combined dashboard bootstrap (profile + stats + overview + leaves in ONE SINGLE GET CALL)
  const fetchDashboardBootstrap = async () => {
    setIsLoading(true);
    try {
      const res = await getHODDashboardBootstrap(['profile', 'overview', 'attendance_trend', 'leaves', 'faculty_attendance']);
      if (res.success && res.data) {
        // Set profile data
        setBranchId(res.data.profile.branch_id);
        setHodName(res.data.profile.first_name || translateTerminology("HOD"));
        setBranchName(res.data.profile.branch || "your");

        // Set stats data & pending counters
        if (res.data.overview) {
          setStats({
            faculty_count: res.data.overview.faculty_count,
            student_count: res.data.overview.student_count,
            pending_leaves: res.data.overview.pending_leaves,
            average_attendance: 0,
            attendance_trend: res.data.attendance_trend || [],
          });
          if (typeof res.data.overview.pending_faculty_leaves === 'number') {
            setFacultyPendingCount(res.data.overview.pending_faculty_leaves);
          }
          if (typeof res.data.overview.pending_student_leaves === 'number') {
            setStudentPendingCount(res.data.overview.pending_student_leaves);
          }
        }

        // Set 5 recent leave requests directly from single bootstrap call
        if (Array.isArray(res.data.leaves)) {
          const processed = processLeavesData(res.data.leaves);
          setLeaveRequests(processed.slice(0, 5));
          if (!res.data.overview?.pending_faculty_leaves) {
            setFacultyPendingCount(processed.filter(l => l.canApprove || l.status === "Pending").length);
          }
        }

        // Set faculty attendance data
        if (res.data.faculty_attendance_today) {
          setStats(prev => prev ? {
            ...prev,
            faculty_attendance_today: res.data.faculty_attendance_today.summary
          } : null);
        }

        // Pass bootstrap data to parent (only pass available data)
        if (onBootstrapData) {
          onBootstrapData({
            branch_id: res.data.profile.branch_id,
            semesters: res.data.semesters || [],
            sections: res.data.sections || [],
          });
        }
      } else {
        setErrors([res.message || "Failed to fetch dashboard data"]);
      }
    } catch (err) {
      setErrors(["Failed to fetch dashboard data"]);
    } finally {
      setIsLoading(false);
      initialLoadRef.current = false;
    }
  };

  // Re-fetch faculty leaves only on explicit search / filter change (not on initial mount)
  useEffect(() => {
    if (!initialLoadRef.current && activeTab === "faculty") {
      fetchFacultyLeaves(search, filterStatus);
    }
  }, [search, filterStatus]);

  const pendingFacultyLeavesCount = facultyPendingCount || leaveRequests.filter(r => r.status === "Pending" || r.canApprove).length;

  const updateLeaveStatus = (index: number, status: string) => {
    const updatedLeaves = [...leaveRequests];
    updatedLeaves[index] = { ...updatedLeaves[index], status: status as any };
    setLeaveRequests(updatedLeaves);
  };

  // Handle approve
  const handleApprove = async (index: number) => {
    const leave = leaveRequests[index];
    const isShortPermission = leave.leave_type === 'short_permission';
    const typeLabel = isShortPermission ? 'Short Permission' : 'Leave';

    const payload = {
      action: "update" as const,
      branch_id: branchId || undefined,
      leave_id: leave.id,
      status: "APPROVED" as const
    };

    const result = await Swal.fire({
      title: `Approve ${typeLabel}?`,
      text: `You are about to approve this ${typeLabel.toLowerCase()} request. Are you sure you want to proceed?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: `Yes, approve ${typeLabel.toLowerCase()}`,
      cancelButtonText: 'No, cancel',
      customClass: {
        confirmButton: 'bg-green-600 text-white',
        cancelButton: 'bg-gray-300 text-black'
      }
    });

    if (!result.isConfirmed) return;

    try {
      const res = await manageLeaves(payload, "PATCH");
      if (res.success) {
        const updated = res.updated_leave;
        let newStatus: any = 'Approved';
        if (updated && updated.status === 'PENDING' && updated.hod_approval_status === 'APPROVED') {
          const nextStage = (updated.current_stage || '').toLowerCase();
          if (nextStage === 'principal') {
            newStatus = "Endorsed (Pending Principal)";
          } else if (nextStage === 'dean') {
            newStatus = "Endorsed (Pending Dean)";
          } else if (nextStage === 'coe') {
            newStatus = "Endorsed (Pending COE)";
          } else if (nextStage && nextStage !== 'completed') {
            newStatus = `Endorsed (Pending ${nextStage.replace('_', ' ').toUpperCase()})`;
          } else {
            newStatus = "Endorsed (Pending Next Authority)";
          }
        }
        setLeaveRequests((prev) =>
          prev.map((item) => item.id === leave.id ? { ...item, status: newStatus, canApprove: false } : item)
        );
        if (res.pending_leaves_count !== undefined) {
          setStats(prev => prev ? { ...prev, pending_leaves: res.pending_leaves_count } : prev);
        }
        window.dispatchEvent(new CustomEvent('leave-approvals-updated', { detail: { pending_count: res.pending_leaves_count } }));
        window.dispatchEvent(new CustomEvent('leaves-updated'));
        Swal.fire(`${typeLabel} Approved!`, `The ${typeLabel.toLowerCase()} request has been approved.`, 'success');
      } else {
        Swal.fire('Error!', res.message || `Failed to approve the ${typeLabel.toLowerCase()} request.`, 'error');
      }
    } catch (err) {
      Swal.fire('Error!', `Failed to approve the ${typeLabel.toLowerCase()} request.`, 'error');
    }
  };

  // Reject
  const handleReject = async (index: number) => {
    const leave = leaveRequests[index];
    const isShortPermission = leave.leave_type === 'short_permission';
    const typeLabel = isShortPermission ? 'Short Permission' : 'Leave';

    const payload = {
      action: "update" as const,
      branch_id: branchId || undefined,
      leave_id: leave.id,
      status: "REJECTED" as const
    };

    const result = await Swal.fire({
      title: `Reject ${typeLabel}?`,
      text: `You are about to reject this ${typeLabel.toLowerCase()} request. Are you sure you want to proceed?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: `Yes, reject ${typeLabel.toLowerCase()}`,
      cancelButtonText: 'No, cancel',
      customClass: {
        confirmButton: 'bg-red-600 text-white',
        cancelButton: 'bg-gray-300 text-black'
      }
    });

    if (!result.isConfirmed) return;

    try {
      const res = await manageLeaves(payload, "PATCH");
      if (res.success) {
        setLeaveRequests((prev) =>
          prev.map((item) => item.id === leave.id ? { ...item, status: 'Rejected', canApprove: false } : item)
        );
        if (res.pending_leaves_count !== undefined) {
          setStats(prev => prev ? { ...prev, pending_leaves: res.pending_leaves_count } : prev);
        }
        window.dispatchEvent(new CustomEvent('leave-approvals-updated', { detail: { pending_count: res.pending_leaves_count } }));
        window.dispatchEvent(new CustomEvent('leaves-updated'));
        Swal.fire('Rejected!', `The ${typeLabel.toLowerCase()} request has been rejected.`, 'success');
      } else {
        Swal.fire('Error!', res.message || `Failed to reject the ${typeLabel.toLowerCase()} request.`, 'error');
      }
    } catch (err) {
      Swal.fire('Error!', `Failed to reject the ${typeLabel.toLowerCase()} request.`, 'error');
    }
  };

  // Initial data fetch
  useEffect(() => {
    fetchDashboardBootstrap();
  }, []);

  // Transform attendance trend for chart
  const chartData = stats?.attendance_trend?.length
    ? stats.attendance_trend.map((item) => ({
        week: item.week,
        attendance: item.attendance_percentage === "NA" ? 0 : 
                   typeof item.attendance_percentage === "string" ? 0 : 
                   item.attendance_percentage,
      }))
    : [{ week: "No Data", attendance: 0 }];

  // Calculate pending leaves count from actual leave requests
  const pendingLeavesCount = leaveRequests.filter(request => request.status === "Pending").length;

  // Data for pie chart - show only components (Faculty, Students). "Members" was a duplicate (sum) and caused overlapping labels.
  const memberData = [
    { name: "Faculty", value: stats?.faculty_count || 0, fill: "#2563eb" },
    { name: "Students", value: stats?.student_count || 0, fill: "#6b7280" },
  ];

  const totalMembers = (stats?.faculty_count || 0) + (stats?.student_count || 0);

  const RADIAN = Math.PI / 180;
  const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, index }: any) => {
    // push labels further out to avoid overlap with large slices
    const radius = innerRadius + (outerRadius - innerRadius) * 1.4;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);
    const entry = memberData[index] || { name: '', value: '' };
    return (
      <text x={x} y={y} fill={theme === 'dark' ? '#e5e7eb' : '#111827'} textAnchor={x > cx ? 'start' : 'end'} dominantBaseline="central" fontSize={12}>
        {entry.name}: {entry.value}
      </text>
    );
  };  const attendancePct = stats?.faculty_attendance_today && stats.faculty_attendance_today.total_faculty > 0
    ? Math.round((stats.faculty_attendance_today.present / stats.faculty_attendance_today.total_faculty) * 100)
    : 0;

  const attendanceColor = attendancePct >= 75 ? "text-emerald-600 dark:text-emerald-400" : attendancePct >= 50 ? "text-amber-600 dark:text-amber-400" : "text-rose-600 dark:text-rose-400";

  return (
    <div className={` space-y-6 font-sans min-h-screen ${theme === 'dark' ? 'bg-background text-foreground' : 'bg-gray-50 text-gray-900'}`}>
      {/* Loading and Errors */}
      {isLoading && (
        <div className="space-y-6">
          <SkeletonStatsGrid items={3} columns={3} />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <SkeletonChart />
            <SkeletonChart />
          </div>
          <div className="p-6 rounded-lg border bg-card space-y-4">
            <Skeleton className="h-6 w-1/4 mb-4" />
            <SkeletonTable rows={5} cols={5} />
          </div>
        </div>
      )}
      {errors.length > 0 && (
        <ul className={`text-sm ${theme === 'dark' ? 'text-destructive' : 'text-red-500'} mb-4 list-disc list-inside ${theme === 'dark' ? 'bg-destructive/10 border border-destructive/20' : 'bg-red-50'} p-4 rounded-lg`}>
          {errors.map((err, idx) => (
            <li key={idx}>{err}</li>
          ))}
        </ul>
      )}

      {(() => {
        const bName = (branchName || user?.branch_name || user?.branch || '').toString().toLowerCase();
        const dName = ((user as any)?.department || '').toString().toLowerCase();
        const isNonTeachingHOD = bName.includes('non-teaching') || bName.includes('non teaching') || dName.includes('non-teaching') || dName.includes('non teaching');

        if (!isNonTeachingHOD) return null;

        const quickActions = [
          { title: "Manage Staff Leaves", desc: "Review and approve/reject staff leave requests", icon: <Calendar className="w-6 h-6 text-blue-500" />, page: "leaves" },
          { title: "Staff Attendance", desc: "View daily attendance logs of staff members", icon: <CheckSquare className="w-6 h-6 text-indigo-500" />, page: "faculty-attendance" },
          { title: "Staff Tasks", desc: "Assign and track work tasks for staff", icon: <ListTodo className="w-6 h-6 text-purple-500" />, page: "staff-tasks" },
          { title: "Announcements", desc: "Send announcements to your team and view notices", icon: <Bell className="w-6 h-6 text-amber-500" />, page: "hod-announcement-management" },
          { title: "Schedule Meeting", desc: "Organize and manage team meetings", icon: <Video className="w-6 h-6 text-emerald-500" />, page: "schedule-meeting" },
          { title: "Apply Leave", desc: "Submit your own leave request", icon: <Calendar className="w-6 h-6 text-sky-500" />, page: "apply-leaves" },
          { title: "My Attendance", desc: "Check your personal attendance history", icon: <CheckCircle className="w-6 h-6 text-teal-500" />, page: "my-attendance" },
          { title: "My Salary & Payroll", desc: "View your salary details and payslips", icon: <CreditCard className="w-6 h-6 text-rose-500" />, page: "my-payroll" },
          { title: "Reimbursements & Claims", desc: "Submit expense reimbursement claims", icon: <Receipt className="w-6 h-6 text-cyan-500" />, page: "reimbursements" },
          { title: "My Profile", desc: "Manage personal profile details", icon: <User className="w-6 h-6 text-gray-500" />, page: "hod-profile" },
        ];

        return (
          <div className="space-y-6">
            <div className={`p-6 rounded-2xl border ${theme === 'dark' ? 'bg-card border-border' : 'bg-white border-gray-100'} shadow-sm`}>
              <h2 className="text-xl sm:text-2xl font-semibold mb-1">Non-Teaching HOD Portal</h2>
              <p className="text-sm text-muted-foreground mb-6">Manage staff leaves, track attendance, assign tasks, and send team announcements.</p>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3.5 sm:gap-4">
                {quickActions.map((act) => (
                  <div 
                    key={act.page} 
                    onClick={() => setPage(act.page)}
                    className={`p-4 rounded-xl cursor-pointer transition-all duration-200 hover:scale-[1.02] border min-w-0 overflow-hidden flex flex-col justify-between ${theme === 'dark' ? 'bg-card/50 hover:bg-card border-border' : 'bg-gray-50/50 hover:bg-white border-gray-200'} shadow-sm hover:shadow-md`}
                  >
                    <div>
                      <div className="flex items-center gap-3 mb-2 min-w-0">
                        <div className="p-2 rounded-xl bg-background border shadow-xs flex-shrink-0">{act.icon}</div>
                        <h3 className="font-semibold text-sm sm:text-base leading-snug break-words min-w-0 flex-1">{act.title}</h3>
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">{act.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );
      })()}

      {/* Hide academic charts/cards for Non-Teaching HOD */}
      {(() => {
        const bName = (branchName || user?.branch_name || user?.branch || '').toString().toLowerCase();
        const dName = ((user as any)?.department || '').toString().toLowerCase();
        return bName.includes('non-teaching') || bName.includes('non teaching') || dName.includes('non-teaching') || dName.includes('non teaching');
      })() ? null : (
      <>
      {/* Stats Cards */}
      <div id="hod-stats-cards" className={`grid grid-cols-1 md:grid-cols-3 lg:grid-cols-3 gap-6 ${theme === 'dark' ? 'bg-background' : 'bg-gray-50'}`}>
        {[
          {
            title: `Total ${translateTerminology("Faculty")}`,
            value: stats?.faculty_count.toString() || "0",
            icon: <Users className="w-6 h-6 text-blue-600 dark:text-blue-400" />,
            iconBg: "bg-blue-100 dark:bg-blue-950/60",
            change: "+2.5% since last month",
            color: "text-blue-600 dark:text-blue-400 font-medium",
          },
          {
            title: `Total ${translateTerminology("Students")}`,
            value: stats?.student_count.toString() || "0",
            icon: <Users className="w-6 h-6 text-purple-600 dark:text-purple-400" />,
            iconBg: "bg-purple-100 dark:bg-purple-950/60",
            change: "+5.1% since last semester",
            color: "text-purple-600 dark:text-purple-400 font-medium",
          },
          {
            title: `${translateTerminology("Faculty")} Present Today`,
            value: stats?.faculty_attendance_today?.present.toString() || "0",
            icon: <CheckCircle className={`w-6 h-6 ${attendanceColor}`} />,
            iconBg: attendancePct >= 75 ? "bg-emerald-100 dark:bg-emerald-950/60" : attendancePct >= 50 ? "bg-amber-100 dark:bg-amber-950/60" : "bg-rose-100 dark:bg-rose-950/60",
            change: `${attendancePct}% attendance`,
            color: `${attendanceColor} font-medium`,
            clickable: true,
            onClick: () => setPage("faculty-attendance"),
          },
        ].map((item, i) => (
            <div
              key={i}
              className={`p-4 rounded-xl shadow-sm flex items-center gap-4 hover:shadow-md transition-all border ${theme === 'dark' ? 'bg-card border-border' : 'bg-white border-gray-200'} text-gray-900 outline-none ${item.clickable ? `cursor-pointer ${theme === 'dark' ? 'hover:bg-accent/80' : 'hover:bg-gray-50'}` : ''}`}
              onClick={item.onClick}
            >
              <div className={`flex items-center justify-center w-12 h-12 rounded-xl shrink-0 ${item.iconBg}`}>
                {item.icon}
              </div>
              <div className="min-w-0 flex-1">
                <p className={`text-sm font-medium ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-600'}`}>{item.title}</p>
                <p className={`text-2xl font-bold tracking-tight ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>{item.value}</p>
                <p className={`text-xs mt-0.5 ${item.color}`}>{item.change}</p>
              </div>
            </div>
        ))}
      </div>

      {/* Charts: Attendance Trends and Member Distribution */}
      <div className={`grid grid-cols-1 lg:grid-cols-2 gap-6 ${theme === 'dark' ? 'bg-background' : 'bg-gray-50'}`}>
        {/* Attendance Chart */}
        <div id="hod-attendance-trends" className={`p-6 rounded-lg shadow-sm ${theme === 'dark' ? 'bg-card border border-border' : 'bg-white border border-gray-200'}`}>
          <div className="flex justify-between items-center mb-2">
            <h3 className={`text-lg font-semibold ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>Attendance Trends</h3>
          </div>
          <p className={`text-sm mb-4 ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}`}>Weekly attendance percentage</p>
          <div className={`min-h-[250px] ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}`}>
            {(!chartData.some(d => d.attendance > 0) && !isLoading) || (chartData.length === 1 && chartData[0].week === "No Data") ? (
              <div className={`h-[250px] flex flex-col items-center justify-center border-2 border-dashed rounded-xl p-8 space-y-3 ${theme === 'dark' ? 'border-border bg-accent/5' : 'border-gray-200 bg-gray-50/50'}`}>
                <div className={`p-3 rounded-full ${theme === 'dark' ? 'bg-accent/10' : 'bg-gray-100'}`}>
                  <Calendar className={`w-8 h-8 ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-400'}`} />
                </div>
                <div className="text-center">
                  <p className={`text-sm font-medium ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>No attendance data</p>
                  <p className={`text-xs ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}`}>Attendance data will appear here once recorded</p>
                </div>
              </div>
            ) : (
              <div className="overflow-x-auto custom-scrollbar pb-2 scrollbar-thin scrollbar-thumb-gray-200 dark:scrollbar-thumb-zinc-800">
                <div style={{ width: chartData.length > 6 ? `${chartData.length * 70}px` : "100%", minWidth: "100%" }}>
                  <ResponsiveContainer width="100%" height={250}>
                    <LineChart data={chartData} margin={{ top: 10, right: 25, left: -10, bottom: 10 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke={theme === 'dark' ? '#3f3f46' : '#e5e7eb'} />
                      <XAxis dataKey="week" stroke={theme === 'dark' ? '#9ca3af' : '#6b7280'} fontSize={12} interval={0} />
                      <YAxis domain={[0, 100]} stroke={theme === 'dark' ? '#9ca3af' : '#6b7280'} fontSize={12} />
                      <Tooltip
                        contentStyle={{ backgroundColor: theme === 'dark' ? '#1c1c1e' : '#fff', borderRadius: "8px", border: theme === 'dark' ? '1px solid #3f3f46' : '1px solid #e5e7eb' }}
                        labelStyle={{ color: theme === 'dark' ? '#e5e7eb' : '#111827' }}
                        itemStyle={{ color: theme === 'dark' ? '#e5e7eb' : '#111827' }}
                      />
                      <Line
                        type="monotone"
                        dataKey="attendance"
                        stroke="#2563eb"
                        strokeWidth={2}
                        dot={{ r: 4 }}
                        name="Attendance Percentage"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Member Distribution Pie Chart */}
        <div id="hod-member-distribution" className={`p-6 rounded-lg shadow-sm ${theme === 'dark' ? 'bg-card border border-border' : 'bg-white border border-gray-200'}`}>
          <div className="flex justify-between items-center mb-2">
            <h3 className={`text-lg font-semibold ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>Member Distribution</h3>
          </div>
          <p className={`text-sm mb-4 ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}`}>Faculty, Students, and Total Members</p>
          <div className="min-h-[250px] focus:outline-none">
            {totalMembers === 0 && !isLoading ? (
              <div className={`h-[250px] flex flex-col items-center justify-center border-2 border-dashed rounded-xl p-8 space-y-3 ${theme === 'dark' ? 'border-border bg-accent/5' : 'border-gray-200 bg-gray-50/50'}`}>
                <div className={`p-3 rounded-full ${theme === 'dark' ? 'bg-accent/10' : 'bg-gray-100'}`}>
                  <Users className={`w-8 h-8 ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-400'}`} />
                </div>
                <div className="text-center">
                  <p className={`text-sm font-medium ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>No members found</p>
                  <p className={`text-xs ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}`}>Add faculty or students to see distribution</p>
                </div>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                    <Pie
                      data={memberData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      paddingAngle={2}
                      label={renderCustomizedLabel}
                      labelLine={false}
                    />
                    {/* Subtle center background for better contrast (only render in dark theme) */}
                    {theme === 'dark' && (
                      <circle cx="50%" cy="50%" r={42} fill="#0b1220" opacity={0.06} />
                    )}
                    {/* Center label showing total members */}
                    <text x="50%" y="46%" textAnchor="middle" fill={theme === 'dark' ? '#cbd5e1' : '#6b7280'} fontSize={12}>
                      Total Members
                    </text>
                    <text x="50%" y="58%" textAnchor="middle" fill={theme === 'dark' ? '#e5e7eb' : '#0f172a'} fontSize={20} fontWeight={700}>
                      {totalMembers}
                    </text>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: theme === 'dark' ? '#1c1c1e' : '#fff',
                      borderRadius: "8px",
                      border: theme === 'dark' ? '1px solid #3f3f46' : '1px solid #e5e7eb',
                    }}
                    labelStyle={{ color: theme === 'dark' ? '#e5e7eb' : '#111827' }}
                    itemStyle={{ color: theme === 'dark' ? '#e5e7eb' : '#111827' }}
                  />
                  <Legend 
                    verticalAlign="bottom" 
                    height={36}
                    formatter={(value) => (
                      <span className={theme === 'dark' ? 'text-foreground' : 'text-gray-900'}>
                        {value}
                      </span>
                    )}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      {/* Leave Approvals (Recent 5 Leaves) */}
      {userTier >= 2 && (
        <div id="hod-leave-table" className={`p-4 sm:p-6 rounded-xl shadow-sm text-sm ${theme === 'dark' ? 'bg-card border border-border' : 'bg-white border border-gray-200'} ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>
          <div id="hod-leave-header" className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border">
            <div>
              <h3 className={`text-lg sm:text-xl font-semibold ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>Leave Approvals</h3>
              <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">Review and manage department faculty and student leave requests.</p>
            </div>
            <div className="flex items-center gap-2.5 w-full sm:w-auto shrink-0">
              <div className="flex items-center gap-1.5 bg-muted/60 p-1 rounded-xl border border-border w-full sm:w-auto">
                <button
                  type="button"
                  onClick={() => setActiveTab("faculty")}
                  className={`flex-1 sm:flex-initial justify-center px-3 py-1.5 text-xs sm:text-sm font-semibold rounded-lg transition-all duration-200 flex items-center gap-1.5 ${activeTab === "faculty"
                    ? "bg-primary text-white shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Faculty Leaves
                  {pendingFacultyLeavesCount > 0 && (
                    <span className={`px-1.5 py-0.2 rounded-full text-[11px] ${activeTab === "faculty" ? "bg-white text-primary font-bold" : "bg-primary text-white"}`}>
                      {pendingFacultyLeavesCount}
                    </span>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("student")}
                  className={`flex-1 sm:flex-initial justify-center px-3 py-1.5 text-xs sm:text-sm font-semibold rounded-lg transition-all duration-200 flex items-center gap-1.5 ${activeTab === "student"
                    ? "bg-primary text-white shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Student Leaves
                  {studentPendingCount > 0 && (
                    <span className={`px-1.5 py-0.2 rounded-full text-[11px] ${activeTab === "student" ? "bg-white text-primary font-bold" : "bg-purple-600 text-white"}`}>
                      {studentPendingCount}
                    </span>
                  )}
                </button>
              </div>

              {/* Desktop View All button in header */}
              <Button
                onClick={() => setPage("leaves")}
                className="hidden sm:flex h-9 text-xs sm:text-sm font-medium items-center justify-center gap-1 shadow-sm transition-all duration-200 bg-primary text-white hover:bg-primary/90 px-3.5 shrink-0"
              >
                View All
              </Button>
            </div>
          </div>

          {activeTab === "faculty" ? (
            <div className="pt-4">
              {/* Search & Filter Bar */}
              <div className="flex flex-row items-center gap-2 mb-4 w-full">
                <Input
                  placeholder="Search faculty..."
                  value={localSearch}
                  onChange={(e) => setLocalSearch(e.target.value)}
                  className={`flex-1 text-sm ${theme === 'dark' ? 'bg-card border-border text-foreground placeholder:text-muted-foreground' : 'bg-white border-gray-300 text-gray-900 placeholder:text-gray-500'}`}
                />

                <div className="relative shrink-0" ref={filterRef}>
                  <Button
                    onClick={() => setShowFilter(!showFilter)}
                    className="h-10 text-sm font-medium flex items-center justify-center gap-1.5 shadow-sm transition-all duration-200 bg-primary text-white hover:bg-primary/90 px-3 sm:px-4"
                  >
                    <Filter className="w-4 h-4" />
                    <span className="hidden sm:inline">{filterStatus === "All" ? "Filter" : filterStatus}</span>
                  </Button>
                  {showFilter && (
                    <div className={`absolute right-0 mt-2 w-48 ${theme === 'dark' ? 'bg-card border-border' : 'bg-white border-gray-200'} border rounded-md shadow-lg z-20`}>
                      <div className="py-1">
                        {(["All", "Pending", "Approved", "Rejected"] as const).map((status) => (
                          <button
                            key={status}
                            type="button"
                            className={`block w-full text-left px-4 py-2 text-sm hover:${theme === 'dark' ? 'bg-accent' : 'bg-gray-100'} ${filterStatus === status ? (theme === 'dark' ? 'bg-accent text-accent-foreground' : 'bg-gray-100 text-gray-900') : (theme === 'dark' ? 'text-foreground' : 'text-gray-700')}`}
                            onClick={() => {
                              setFilterStatus(status);
                              setShowFilter(false);
                            }}
                          >
                            {status === "All" ? "All Status" : status}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Mobile View All button next to filter */}
                <Button
                  onClick={() => setPage("leaves")}
                  className="sm:hidden h-10 text-sm font-medium flex items-center justify-center gap-1 shadow-sm transition-all duration-200 bg-primary text-white hover:bg-primary/90 px-3 shrink-0"
                >
                  View All
                </Button>
              </div>

              {/* Mobile Card List (recent 5) */}
              <div className="block md:hidden space-y-3">
                {leaveRequests.length === 0 && !isLoading ? (
                  <div className={`border-2 border-dashed flex flex-col items-center justify-center p-8 text-center space-y-4 rounded-lg ${theme === 'dark' ? 'border-border bg-accent/5' : 'border-gray-200 bg-gray-50/50'}`}>
                    <div className={`p-3 rounded-full ${theme === 'dark' ? 'bg-accent/10' : 'bg-primary/10'}`}>
                      <Filter className={`w-8 h-8 ${theme === 'dark' ? 'text-primary/70' : 'text-primary/70'}`} />
                    </div>
                    <div className="max-w-xs mx-auto">
                      <h3 className={`text-md font-semibold ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>
                        No Leave Requests Found
                      </h3>
                      <p className={`text-xs mt-1 ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}`}>
                        There are no leave requests matching the selected status or filters.
                      </p>
                    </div>
                  </div>
                ) : (
                  leaveRequests.slice(0, 5).map((row, index) => (
                    <div key={row.id} className={`p-3 sm:p-4 rounded-md border ${theme === 'dark' ? 'bg-card border-border text-foreground' : 'bg-white border-gray-200 text-gray-900'}`}>
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <div>
                          <div className="font-medium text-base">{row.name}</div>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.2 rounded bg-muted text-muted-foreground">
                              {row.role?.replace('_', ' ')}
                            </span>
                            {row.dept && row.dept !== 'N/A' && (
                              <span className={`text-xs ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}`}>{row.dept}</span>
                            )}
                          </div>
                        </div>
                        <div className="shrink-0">
                          <span
                            className={`px-3 py-1 rounded-full text-xs font-medium ${row.status === "Pending" ?
                              theme === 'dark' ? 'bg-yellow-900 text-yellow-200' : 'bg-yellow-100 text-yellow-800' :
                              row.status === "Approved" ?
                                theme === 'dark' ? 'bg-green-900 text-green-200' : 'bg-green-100 text-green-700' :
                                row.status.startsWith("Endorsed") ?
                                  theme === 'dark' ? 'bg-blue-900 text-blue-200' : 'bg-blue-100 text-blue-700' :
                                  theme === 'dark' ? 'bg-red-900 text-red-200' : 'bg-red-100 text-red-700'}`
                            }>
                            {row.status}
                          </span>
                        </div>
                      </div>

                      <div className="my-2 p-2 rounded bg-accent/10 border border-border/40">
                        <div className="font-semibold text-xs text-foreground">{row.title}</div>
                        {renderLeaveCategoryBadge(row.leave_type, row.is_half_day, row.half_day_session, row.od_purpose_category)}
                        <div className="text-xs text-muted-foreground mt-1">
                          {row.period}
                          {row.start_time && row.end_time && (
                            <span className="font-semibold text-purple-600 dark:text-purple-400 ml-1">
                              ({row.start_time} - {row.end_time})
                            </span>
                          )}
                        </div>
                        {row.alternate_faculty_name && (
                          <div className="text-[11px] text-muted-foreground mt-1">
                            Sub: <span className="font-medium text-foreground">{row.alternate_faculty_name}</span> ({row.alternate_duty_status})
                          </div>
                        )}
                      </div>

                      <div className="flex flex-col gap-2 mb-3">
                        <button
                          onClick={() => setViewReason(row.reason)}
                          className={`w-full h-9 text-sm font-semibold flex items-center justify-center rounded-lg shadow-sm transition-all duration-200
                          ${theme === 'dark' ?
                              'bg-primary/10 text-primary border border-primary/30 hover:bg-primary/20' :
                              'bg-primary/5 text-primary border border-primary/20 hover:bg-primary/10'}`
                          }>
                          View Reason
                        </button>

                        {(row.initial_document_url || row.completion_document_url) && (
                          <>
                            {row.initial_document_url && (
                              <a
                                href={row.initial_document_url}
                                target="_blank"
                                rel="noreferrer"
                                className={`w-full h-9 text-xs font-semibold flex items-center justify-center gap-1.5 rounded-lg border shadow-sm transition-all ${
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
                            {row.completion_document_url && (
                              <a
                                href={row.completion_document_url}
                                target="_blank"
                                rel="noreferrer"
                                className={`w-full h-9 text-xs font-semibold flex items-center justify-center gap-1.5 rounded-lg border shadow-sm transition-all ${
                                  theme === 'dark'
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

                      {row.canApprove || row.status === "Pending" ? (
                        <div className="flex flex-row gap-2 mt-2">
                          <Button
                            variant="outline"
                            className={`flex-1 h-9 text-xs font-semibold flex items-center justify-center gap-1.5 shadow-sm transition-all duration-200
                            ${theme === 'dark' ?
                                'text-green-400 border-green-400/50 bg-green-400/5 hover:bg-green-400/20' :
                                'text-green-700 border-green-200 bg-green-50 hover:bg-green-100'}`
                            }
                            onClick={() => handleApprove(index)}
                            disabled={isLoading}>
                            <CheckCircle size={14} /> Approve
                          </Button>
                          <Button
                            variant="outline"
                            className={`flex-1 h-9 text-xs font-semibold flex items-center justify-center gap-1.5 shadow-sm transition-all duration-200
                            ${theme === 'dark' ?
                                'text-red-400 border-red-400/50 bg-red-400/5 hover:bg-red-400/20' :
                                'text-red-700 border-red-200 bg-red-50 hover:bg-red-100'}`
                            }
                            onClick={() => handleReject(index)}
                            disabled={isLoading}>
                            <XCircle size={14} /> Reject
                          </Button>
                        </div>
                      ) : (
                        <div className="pt-2 text-center border-t border-border/30">
                          <span className={`text-xs ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}`}>
                            {row.status.startsWith("Endorsed") ? "Endorsed (Forwarded to Next Authority)" : "No action needed"}
                          </span>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>

              {/* Desktop Table View (recent 5) */}
              <div className={`hidden md:block overflow-x-auto custom-scrollbar border rounded-lg ${theme === 'dark' ? 'border-border' : 'border-gray-200'}`}>
                <table className="w-full text-sm">
                  <thead className={`${theme === 'dark' ? 'bg-card text-foreground' : 'bg-gray-50 text-gray-900'}`}>
                    <tr className={`border-b ${theme === 'dark' ? 'border-border' : 'border-gray-200'}`}>
                      <th className="py-3 px-2 md:px-4 text-left font-semibold">Applicant</th>
                      <th className="py-3 px-2 md:px-4 text-left font-semibold">Category / Title</th>
                      <th className="py-3 px-2 md:px-4 text-center font-semibold">Period & Time</th>
                      <th className="py-3 px-2 md:px-4 text-center font-semibold">Attachments</th>
                      <th className="py-3 px-2 md:px-4 text-center font-semibold">Reason</th>
                      <th className="py-3 px-2 md:px-4 text-center font-semibold">Status</th>
                      <th className="py-3 px-2 md:px-4 text-center font-semibold">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {leaveRequests.length === 0 && !isLoading ? (
                      <tr>
                        <td colSpan={7} className="p-0">
                          <div className={`border-2 border-dashed flex flex-col items-center justify-center p-12 text-center space-y-4 ${theme === 'dark' ? 'border-border bg-accent/5' : 'border-gray-200 bg-gray-50/50'}`}>
                            <div className={`p-4 rounded-full ${theme === 'dark' ? 'bg-accent/10' : 'bg-primary/10'}`}>
                              <Filter className={`w-10 h-10 ${theme === 'dark' ? 'text-primary/70' : 'text-primary/70'}`} />
                            </div>
                            <div className="max-w-xs mx-auto">
                              <h3 className={`text-lg font-semibold ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>
                                No Leave Requests Found
                              </h3>
                              <p className={`text-sm mt-1 ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}`}>
                                There are no leave requests matching the selected status or filters.
                              </p>
                            </div>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      leaveRequests.slice(0, 5).map((row, index) => (
                        <tr key={row.id} className={`border-b transition-colors duration-200 ${theme === 'dark' ? 'border-border hover:bg-accent' : 'border-gray-200 hover:bg-gray-50'}`}>
                          <td className="py-4 px-2 md:px-4 text-left">
                            <div className={`font-medium ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>{row.name}</div>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <span className="text-[11px] font-semibold uppercase tracking-wider px-1.5 py-0.2 rounded bg-muted text-muted-foreground">
                                {row.role?.replace('_', ' ')}
                              </span>
                              {row.dept && row.dept !== 'N/A' && row.dept !== 'General' && (
                                <span className={`text-xs ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}`}>{row.dept}</span>
                              )}
                            </div>
                          </td>

                          <td className="py-4 px-2 md:px-4 text-left">
                            <div className={`font-medium text-sm ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>{row.title}</div>
                            {renderLeaveCategoryBadge(row.leave_type, row.is_half_day, row.half_day_session, row.od_purpose_category)}
                            {row.alternate_faculty_name && (
                              <div className="text-[11px] text-muted-foreground mt-1">
                                Sub: <span className="font-medium text-foreground">{row.alternate_faculty_name}</span> ({row.alternate_duty_status})
                              </div>
                            )}
                          </td>

                          <td className={`py-4 px-2 md:px-4 text-sm text-center ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>
                            <div>{row.period}</div>
                            {row.start_time && row.end_time && (
                              <div className="text-xs font-semibold text-purple-600 dark:text-purple-400 mt-0.5">
                                {row.start_time} - {row.end_time}
                              </div>
                            )}
                          </td>

                          {/* Attachments Column */}
                          <td className="py-4 px-2 md:px-4 text-sm text-center">
                            {row.initial_document_url || row.completion_document_url ? (
                              <div className="flex flex-col items-center justify-center gap-1.5">
                                {row.initial_document_url && (
                                  <a
                                    href={row.initial_document_url}
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
                                {row.completion_document_url && (
                                  <a
                                    href={row.completion_document_url}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 transition-colors shrink-0 whitespace-nowrap"
                                    title="View Attendance Certificate"
                                  >
                                    <FileText className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                                    <span>Certificate</span>
                                    <ExternalLink className="w-2.5 h-2.5 opacity-70" />
                                  </a>
                                )}
                              </div>
                            ) : (
                              <span className="text-muted-foreground text-xs italic">—</span>
                            )}
                          </td>

                          <td className="py-4 px-2 md:px-4 text-sm text-center">
                            <button
                              onClick={() => setViewReason(row.reason)}
                              className={`text-sm font-medium px-2 py-1 rounded-md ${theme === 'dark' ? 'bg-muted/10 text-foreground border border-border' : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'}`}>
                              View
                            </button>
                          </td>

                          <td className="py-4 px-2 md:px-4 text-sm text-center">
                            <span
                              className={`px-3 py-1 rounded-full text-xs font-medium ${row.status === "Pending" ?
                                theme === 'dark' ? 'bg-yellow-900 text-yellow-200' : 'bg-yellow-100 text-yellow-800' :
                                row.status === "Approved" ?
                                  theme === 'dark' ? 'bg-green-900 text-green-200' : 'bg-green-100 text-green-700' :
                                  row.status.startsWith("Endorsed") ?
                                    theme === 'dark' ? 'bg-blue-900 text-blue-200' : 'bg-blue-100 text-blue-700' :
                                    theme === 'dark' ? 'bg-red-900 text-red-200' : 'bg-red-100 text-red-700'}`
                              }>
                              {row.status}
                            </span>
                          </td>

                          <td className="py-4 px-2 md:px-4 text-sm text-center">
                            {row.canApprove || row.status === "Pending" ? (
                              <div className="flex flex-col md:flex-row items-center justify-center gap-2">
                                <Button
                                  variant="outline"
                                  className={`px-3 py-1 text-xs flex items-center gap-1 w-full md:w-auto ${theme === 'dark' ?
                                    'text-green-400 border-green-400 hover:bg-green-900/20' :
                                    'text-green-700 border-green-600 hover:bg-green-100'}`
                                  }
                                  onClick={() => handleApprove(index)}
                                  disabled={isLoading}>
                                  <CheckCircle size={16} /> Approve
                                </Button>
                                <Button
                                  variant="outline"
                                  className={`px-3 py-1 text-xs flex items-center gap-1 w-full md:w-auto ${theme === 'dark' ?
                                    'text-red-400 border-red-400 hover:bg-red-900/20' :
                                    'text-red-700 border-red-600 hover:bg-red-100'}`
                                  }
                                  onClick={() => handleReject(index)}
                                  disabled={isLoading}>
                                  <XCircle size={16} /> Reject
                                </Button>
                              </div>
                            ) : (
                              <span className={`text-xs ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}`}>
                                {row.status.startsWith("Endorsed") ? "Endorsed (Forwarded to Next Authority)" : "No action needed"}
                              </span>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="pt-4">
              <DepartmentStudentLeaves onPendingCountChange={setStudentPendingCount} pageSize={5} hidePagination={true} />
            </div>
          )}
        </div>
      )}
      </>
      )}

      {/* View Reason Dialog */}
      <Dialog open={!!viewReason} onOpenChange={() => setViewReason(null)}>
        <DialogContent className={`${theme === 'dark' ? 'bg-card text-foreground border border-border' : 'bg-white text-gray-900 border border-gray-200'} max-w-[90%] sm:max-w-md mx-auto rounded-xl p-4 sm:p-6`}>
          <DialogHeader>
            <DialogTitle className={`text-lg font-semibold ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>Leave Reason</DialogTitle>
          </DialogHeader>

          <div
            className={`p-3 text-base leading-relaxed whitespace-pre-wrap break-words 
                      max-h-64 overflow-y-auto rounded-md ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>
            {viewReason}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              className={theme === 'dark' ?
                'text-white bg-primary border border-primary hover:bg-primary/90 hover:text-white' :
                'text-white bg-primary border border-primary hover:bg-primary/90 hover:text-white'}
              onClick={() => setViewReason(null)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};