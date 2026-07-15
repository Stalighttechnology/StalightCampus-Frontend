import { translateTerminology, getTerm } from "@/utils/institutionConfig";
import { useEffect, useState, useCallback, useRef } from "react";
import { API_ENDPOINT } from "@/utils/config";
import { fetchWithTokenRefresh } from "@/utils/authService";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "../ui/card";
import { Button } from "../ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import { Calendar as CalendarComponent } from "../ui/calendar";
import { Calendar as CalendarIcon, Sliders, AlertCircle, FileText, Loader2, Filter, Clock, UserCheck, UserX, Percent } from "lucide-react";
import DashboardCard from "../common/DashboardCard";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { Label } from "../ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogClose } from "../ui/dialog";
import { useTheme } from "../../context/ThemeContext";
import { SkeletonStatsGrid, SkeletonTable, SkeletonPageHeader, SkeletonCard, SkeletonList } from "../ui/skeleton";
import { Alert, AlertDescription } from "../ui/alert";
import { normalizePaginatedResponse } from "../../utils/normalizePagination";
import { useAuth } from "@/context/AuthContext";

interface Branch {
  readonly id?: number;
  readonly branch_id?: number;
  readonly branch?: string;
  readonly name?: string;
}

interface Faculty {
  readonly id: number;
  readonly name: string;
  readonly email?: string;
}

interface Assignment {
  readonly subject?: string;
  readonly branch?: string;
  readonly semester?: string | number;
  readonly section?: string | number;
}

interface ScheduledClass {
  readonly id: number;
  readonly day?: string;
  readonly start_time?: string;
  readonly end_time?: string;
  readonly subject?: string;
  readonly section?: string;
  readonly duration_hours?: number;
}

interface AttendanceSummary {
  readonly present_days?: number;
  readonly absent_days?: number;
  readonly percent_present?: number | string;
  readonly leave_days?: number;
  readonly unmarked_days?: number;
}

interface AttendanceRecord {
  readonly date: string;
  readonly status: string;
  readonly marked_at?: string;
  readonly notes?: string;
}

interface LeaveRecord {
  readonly id: string;
  readonly start_date: string;
  readonly end_date: string;
  readonly status: string;
  readonly reason?: string;
}

interface Profile {
  readonly name?: string;
  readonly email?: string;
  readonly total_weekly_hours?: number;
  readonly attendance_summary?: AttendanceSummary;
  readonly assignments?: Assignment[];
  readonly scheduled_classes?: ScheduledClass[];
  readonly attendance?: AttendanceRecord[];
  readonly leaves?: LeaveRecord[];
  readonly leaves_pagination?: {
    count: number;
    total_pages: number;
    current_page: number;
  };
}

interface DeanFacultyProfileProps {
  readonly facultyId?: string;
  readonly initialStartDate?: string;
  readonly initialEndDate?: string;
}


const safeErrorMessage = (error: unknown): string => {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  try { return JSON.stringify(error); } catch { return "Unknown error occurred"; }
};

const useBranches = (onError: (err: string | null) => void) => {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true); // Start true so initial skeleton holds
  const onErrorRef = useRef(onError);
  useEffect(() => { onErrorRef.current = onError; });

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      if (mounted) setLoading(true);
      onErrorRef.current(null);
      try {
        const res = await fetchWithTokenRefresh(`${API_ENDPOINT}/dean/reports/branches/`);
        const json = await res.json();
        if (!mounted) return;
        if (json.success) {
          setBranches(json.data || []);
        } else {
          onErrorRef.current(json.message || "Failed to load branches");
        }
      } catch (e: unknown) {
        if (mounted) onErrorRef.current(safeErrorMessage(e));
      } finally {
        if (mounted) setLoading(false);
      }
    };
    load();
    return () => { mounted = false; };
  }, []); // ← Empty: branches only load once, no deps needed

  return { branches, loading };
};


const useFacultiesByBranch = (
  selectedBranch: string | null,
  search: string,
  page: number,
  onError: (err: string | null) => void,
) => {
  const [faculties, setFaculties] = useState<Faculty[]>([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({ currentPage: 1, totalPages: 1, totalItems: 0 });
  const onErrorRef = useRef(onError);
  useEffect(() => { onErrorRef.current = onError; });

  useEffect(() => {
    let mounted = true;
    if (!selectedBranch) {
      setFaculties([]);
      setLoading(false);
      return;
    }

    const loadFaculties = async () => {
      if (mounted) setLoading(true);
      onErrorRef.current(null);
      try {
        const qs = new URLSearchParams();
        qs.append("branch_id", selectedBranch);
        if (search) qs.append("q", search);
        qs.append("page", String(page));
        qs.append("page_size", "10");

        const res = await fetchWithTokenRefresh(
          `${API_ENDPOINT}/dean/reports/faculties/?${qs.toString()}`
        );
        const json = await res.json();
        if (!mounted) return;
        if (json.success) {
          const normalized = normalizePaginatedResponse(json, "data");
          setFaculties(normalized.items);
          setPagination({
            currentPage: normalized.meta.currentPage || page,
            totalPages: normalized.meta.totalPages || 1,
            totalItems: normalized.meta.totalItems || 0,
          });
        } else {
          onErrorRef.current(json.message || "Failed to load faculties");
        }
      } catch (e: unknown) {
        if (mounted) onErrorRef.current(safeErrorMessage(e));
      } finally {
        if (mounted) setLoading(false);
      }
    };

    // Debounce only search changes; branch/page changes are immediate
    const delay = search ? 300 : 0;
    const timer = setTimeout(loadFaculties, delay);
    return () => {
      mounted = false;
      clearTimeout(timer);
    };
  }, [selectedBranch, search, page]); // ← onError removed from deps

  return { faculties, loading, pagination };
};


const useFacultyProfile = (
  facultyId: string | null,
  startDate: string,
  endDate: string,
  page: number,
  reloadKey: number,
  onError: (err: string | null) => void,
) => {
  const [profile, setProfile] = useState<Profile | null>(null);
  // `loading` = true only when we have NO profile yet (first load for this faculty)
  const [loading, setLoading] = useState(false);
  // `isFetching` = true for any in-flight request (including refetches)
  const [isFetching, setIsFetching] = useState(false);
  const onErrorRef = useRef(onError);
  useEffect(() => { onErrorRef.current = onError; });
  // Track which facultyId the current profile belongs to
  const profileFacultyRef = useRef<string | null>(null);

  useEffect(() => {
    let mounted = true;

    if (!facultyId) {
      setProfile(null);
      setLoading(false);
      setIsFetching(false);
      profileFacultyRef.current = null;
      return;
    }

    // Only show the hard "loading" spinner when we have no profile for this faculty yet
    const isNewFaculty = profileFacultyRef.current !== facultyId;
    if (mounted) {
      setIsFetching(true);
      if (isNewFaculty) setLoading(true);
    }
    onErrorRef.current(null);

    const loadProfile = async () => {
      try {
        const params = new URLSearchParams();
        params.append("compact", "true");
        params.append("page", String(page));
        if (startDate) params.append("start_date", startDate);
        if (endDate) params.append("end_date", endDate);

        const res = await fetchWithTokenRefresh(
          `${API_ENDPOINT}/dean/faculty/${facultyId}/profile/?${params.toString()}`
        );
        const json = await res.json();
        if (!mounted) return;

        if (json.success) {
          // Only update once we have the new data — no null flash
          setProfile(json.data || json.profile || null);
          profileFacultyRef.current = facultyId;
        } else {
          onErrorRef.current(json.message || "Failed to load profile");
        }
      } catch (e: unknown) {
        if (mounted) onErrorRef.current(safeErrorMessage(e));
      } finally {
        if (mounted) {
          setLoading(false);
          setIsFetching(false);
        }
      }
    };

    loadProfile();
    return () => { mounted = false; };
  }, [facultyId, startDate, endDate, page, reloadKey]); // ← onError removed from deps

  return { profile, loading, isFetching };
};

// ─── Custom hook: Initialize dates ────────────────────────────────────────────

const useInitialDates = (initialStartDate?: string, initialEndDate?: string) => {
  const [startDate, setStartDate] = useState<string>(() => {
    if (initialStartDate) return initialStartDate;
    const today = new Date();
    const oneMonthAgo = new Date();
    oneMonthAgo.setMonth(today.getMonth() - 1);
    return oneMonthAgo.toLocaleDateString("sv-SE");
  });
  const [endDate, setEndDate] = useState<string>(() => {
    if (initialEndDate) return initialEndDate;
    const today = new Date();
    return today.toLocaleDateString("sv-SE");
  });

  // Sync with parent props if they change after mount
  useEffect(() => {
    if (initialStartDate !== undefined) setStartDate(initialStartDate || "");
  }, [initialStartDate]);

  useEffect(() => {
    if (initialEndDate !== undefined) setEndDate(initialEndDate || "");
  }, [initialEndDate]);

  return { startDate, setStartDate, endDate, setEndDate };
};

// ─── Main component ───────────────────────────────────────────────────────────

const DeanFacultyProfile = ({
  facultyId: initialFacultyId,
  initialStartDate,
  initialEndDate,
}: DeanFacultyProfileProps) => {
  const { user } = useAuth();
  const userTier = user?.organization?.plan?.tier || 1;
  const [error, setError] = useState<string | null>(null);
  const { branches, loading: branchesLoading } = useBranches(setError);
  const [selectedBranch, setSelectedBranch] = useState<string | null>(null);
  const [facultySearch, setFacultySearch] = useState("");
  const [facultyPage, setFacultyPage] = useState(1);
  const { faculties, loading: facultiesLoading, pagination: facultyPagination } =
    useFacultiesByBranch(selectedBranch, facultySearch, facultyPage, setError);
  const [selectedFaculty, setSelectedFaculty] = useState<string | null>(
    initialFacultyId || null
  );
  const [facultyPopoverOpen, setFacultyPopoverOpen] = useState(false);
  const { startDate, setStartDate, endDate, setEndDate } = useInitialDates(
    initialStartDate,
    initialEndDate
  );
  const [reloadKey, setReloadKey] = useState(0);
  const [startDatePopoverOpen, setStartDatePopoverOpen] = useState(false);
  const [endDatePopoverOpen, setEndDatePopoverOpen] = useState(false);
  const { theme } = useTheme();
  const [leavesPage, setLeavesPage] = useState(1);
  const [exportLoading, setExportLoading] = useState(false);

  const { profile, loading: profileLoading, isFetching: profileFetching } =
    useFacultyProfile(selectedFaculty, startDate, endDate, leavesPage, reloadKey, setError);

  const handleExportPDF = async () => {
    if (!selectedFaculty) return;
    setExportLoading(true);
    try {
      const params = new URLSearchParams();
      if (startDate) params.append("start_date", startDate);
      if (endDate) params.append("end_date", endDate);

      const response = await fetchWithTokenRefresh(
        `${API_ENDPOINT}/dean/faculty/${selectedFaculty}/export-pdf/?${params.toString()}`
      );
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        const contentDisposition = response.headers.get("Content-Disposition");
        let filename = `Faculty_Profile_${selectedFaculty}_${new Date().toISOString().slice(0, 10)}.pdf`;
        if (contentDisposition) {
          const matches = /filename="?([^"]+)"?/.exec(contentDisposition);
          if (matches && matches[1]) {
            filename = matches[1];
          }
        }
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(url);
      } else {
        const result = await response.json().catch(() => ({}));
        setError(result.message || "Failed to export PDF");
      }
    } catch (err) {
      setError("Network error while exporting PDF");
    } finally {
      setExportLoading(false);
    }
  };

  // Latches true once the very first full load completes
  const hasCompletedInitialLoad = useRef(false);

  // Latch the ref once all three initial loads are done
  const allInitialDataReady =
    !branchesLoading &&
    branches.length > 0 &&
    (!selectedBranch || !facultiesLoading) &&
    (!selectedFaculty || !profileLoading);

  if (allInitialDataReady && !hasCompletedInitialLoad.current) {
    hasCompletedInitialLoad.current = true;
  }

  // Show full skeleton ONLY on the very first mount load
  const showInitialSkeleton = !hasCompletedInitialLoad.current && (
    branchesLoading ||
    (selectedBranch !== null && facultiesLoading) ||
    (selectedFaculty !== null && profileLoading)
  );

  // ── Reset page and faculty when branch changes ─────────────────────────────
  useEffect(() => {
    setFacultyPage(1);
    // Only clear selected faculty if there's no initialFacultyId override
    if (!initialFacultyId) {
      setSelectedFaculty(null);
    }
  }, [selectedBranch, initialFacultyId]);

  // ── Reset faculty page when search changes ────────────────────────────────
  useEffect(() => {
    setFacultyPage(1);
  }, [facultySearch]);

  // ── Reset leaves page when faculty changes ────────────────────────────────
  useEffect(() => {
    setLeavesPage(1);
  }, [selectedFaculty]);

  // ── Sync with parent facultyId prop ──────────────────────────────────────
  useEffect(() => {
    if (initialFacultyId) setSelectedFaculty(initialFacultyId);
  }, [initialFacultyId]);

  // Auto-select first branch on initial load
  useEffect(() => {
    if (hasCompletedInitialLoad.current) return; // Don't auto-select after first load
    if (!selectedBranch && branches.length > 0) {
      const firstBranch = branches[0];
      const branchId = String((firstBranch.branch_id ?? firstBranch.id) ?? "");
      if (branchId) setSelectedBranch(branchId);
    }
  }, [branches, selectedBranch]);

  // Auto-select first faculty on initial load
  useEffect(() => {
    if (hasCompletedInitialLoad.current) return;
    if (selectedBranch && !selectedFaculty && faculties.length > 0) {
      const firstFaculty = faculties[0];
      if (firstFaculty?.id) setSelectedFaculty(String(firstFaculty.id));
    }
  }, [faculties, selectedBranch, selectedFaculty]);

  const handleDateFilter = useCallback(() => {
    setReloadKey((k) => k + 1);
  }, []);

  const handleClearDates = useCallback(() => {
    setStartDate("");
    setEndDate("");
    setReloadKey((k) => k + 1);
  }, [setStartDate, setEndDate]);

  return (
    <div
      className={`dean-profile min-h-screen ${theme === "dark" ? "bg-background" : "bg-gray-50"
        } p-0`}
    >
      <style>{`
        @media (min-width: 481px) and (max-width: 768px) {
          .dean-profile .filters-row { display: flex !important; flex-direction: row !important; align-items: flex-end !important; gap: 0.75rem !important; }
          .dean-profile .filters-row .flex-1 { flex: 1 1 200px !important; min-width: 150px !important; max-width: 240px !important; }
          .dean-profile .filters-row .flex-shrink-0 { flex-shrink: 0 !important; align-self: flex-end !important; margin-top: 0 !important; width: auto !important; }
          .dean-profile .filters-row .flex-shrink-0 button { width: auto !important; }
        }
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background-color: rgba(156, 163, 175, 0.5); border-radius: 20px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background-color: rgba(107, 114, 128, 0.8); }

        @media (max-width: 480px) {
          .dean-profile .filters-row { gap: 12px !important; display: flex !important; flex-direction: column !important; align-items: stretch !important; }
          .dean-profile .filters-row .flex-1 { width: 100% !important; min-width: 0 !important; }
          .dean-profile .filters-row .flex-shrink-0 { width: 100% !important; margin-top: 0.25rem !important; display: flex !important; }
          .dean-profile .dean-buttons-row { display: flex !important; flex-direction: row !important; gap: 8px !important; width: 100% !important; align-items: center !important; }
          .dean-profile .dean-buttons-row button.dean-mobile-icon-btn { width: 40px !important; min-width: 40px !important; height: 40px !important; min-height: 40px !important; padding: 0 !important; display: flex !important; align-items: center !important; justify-content: center !important; flex-shrink: 0 !important; }
          .dean-profile h1 { font-size: 1.75rem !important; line-height: 1.4 !important; }
          .dean-profile h2 { font-size: 1.375rem !important; line-height: 1.45 !important; }
          .dean-profile h3 { font-size: 1.125rem !important; line-height: 1.5 !important; }
          .dean-profile, .dean-profile p, .dean-profile label, .dean-profile input, .dean-profile button { font-size: 0.875rem !important; }
          .dean-profile .card, .dean-profile .card-content { padding-left: 12px !important; padding-right: 12px !important; }
          .dean-profile .button-group { flex-direction: column !important; gap: 8px !important; }
          .dean-profile button, .dean-profile .btn { width: 100% !important; padding: 10px 16px !important; min-height: 40px !important; }
          .dean-profile img, .dean-profile .responsive-img { max-width: 100% !important; height: auto !important; }
          .dean-profile table, .dean-profile .table-responsive { width: 100% !important; display: block !important; overflow-x: auto !important; -webkit-overflow-scrolling: touch !important; }
          .dean-profile .modal, .dean-profile .popup, .dean-profile .dialog, .dean-profile .swal2-popup, .dean-profile [role="dialog"] {
            width: 90vw !important; max-width: 340px !important; padding: 20px !important; border-radius: 12px !important; left: 50% !important; top: 50% !important; transform: translate(-50%, -50%) !important; box-sizing: border-box !important; max-height: 90vh !important; overflow: auto !important;
          }
          .dean-filters-dialog { width: 90vw !important; max-width: 320px !important; padding: 16px !important; border-radius: 12px !important; box-shadow: 0 8px 30px rgba(0,0,0,0.12) !important; left: 50% !important; top: 50% !important; transform: translate(-50%, -50%) !important; }
          .dean-profile .modal-header, .dean-profile .dialog-header, .dean-profile .swal2-title { font-size: 20px !important; margin-bottom: 12px !important; }
          .dean-profile .modal-body, .dean-profile .dialog-body, .dean-profile .swal2-html-container { font-size: 14px !important; line-height: 1.5 !important; }
          .dean-profile .modal-footer, .dean-profile .dialog-footer, .dean-profile .swal2-actions { margin-top: 16px !important; display: flex !important; gap: 8px !important; flex-direction: column !important; }
          .dean-profile .modal-button, .dean-profile .swal2-confirm, .dean-profile .swal2-cancel { width: 100% !important; padding: 10px 16px !important; min-height: 40px !important; }
        }
      `}</style>

      {/* ── Full-page skeleton: shown ONCE only on initial mount ──────────── */}
      {showInitialSkeleton ? (
        <div className="space-y-6">
          <SkeletonPageHeader />
          <Card
            className={
              theme === "dark"
                ? "w-full bg-card border border-border"
                : "w-full bg-white border border-gray-200"
            }
          >
            <CardContent className="p-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <SkeletonCard className="h-20" />
                <SkeletonCard className="h-20" />
                <SkeletonCard className="h-20" />
              </div>
            </CardContent>
          </Card>
          <div className="space-y-4">
            <SkeletonStatsGrid items={6} />
            <SkeletonList items={3} />
            <SkeletonTable rows={5} cols={5} />
          </div>
        </div>
      ) : error ? (
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : (
        <>
          {/* ── Filters header ─────────────────────────────────────────────── */}
          <div id="dean-faculty-filters-header-wrapper">
            <Card
              className={
                theme === "dark"
                  ? "w-full bg-card border border-border flex flex-col mb-4"
                  : "w-full bg-white border border-gray-200 flex flex-col mb-4"
              }
            >
              <div id="dean-faculty-header-section" className="border-b border-border/50 pb-4">
                <CardHeader className="px-2 sm:px-3 md:px-4 lg:px-6 py-3 sm:py-4 md:py-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 border-b mb-3">
                  <div className="flex-1 min-w-0">
                    <CardTitle className={`tracking-tight text-xl sm:text-xl md:text-2xl font-semibold ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>
                      Faculty Profile
                    </CardTitle>
                    <p className={`text-[16px] sm:text-sm mt-1 ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-505'}`}>
                      View faculty attendance, schedule and assignments
                    </p>
                  </div>
                </CardHeader>
                <CardContent className="pb-0">
                  <div
                    id="dean-faculty-filters"
                    className="filters-row flex flex-col lg:flex-row gap-6 items-start lg:items-end"
                  >
                    {/* Branch selector */}
                    <div className="flex-1">
                      <Label
                        className={`text-sm font-semibold mb-2 ${theme === "dark" ? "text-foreground" : "text-gray-700"
                          }`}
                      >
                        {translateTerminology("Branch")}
                      </Label>
                      <Select
                        value={selectedBranch || ""}
                        onValueChange={(val) => {
                          setSelectedBranch(val || null);
                          // Use a slightly longer timeout of 350ms to ensure the Select completes 
                          // its close animation and focus restoration before triggering the Popover
                          setTimeout(() => {
                            setFacultyPopoverOpen(true);
                          }, 350);
                        }}
                      >
                        <SelectTrigger
                          className={`w-full font-normal ${theme === "dark"
                            ? "bg-background border-border"
                            : "bg-white border-gray-200"
                            }`}
                        >
                          <SelectValue placeholder="Select a branch" />
                        </SelectTrigger>
                        <SelectContent>
                          {branches.map((b: Branch) => (
                            <SelectItem
                              key={(b.branch_id ?? b.id) ?? ""}
                              value={String((b.branch_id ?? b.id) ?? "")}
                            >
                              {b.branch || b.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Faculty selector */}
                    <div className="flex-1">
                      <Label
                        className={`text-sm font-semibold mb-2 ${theme === "dark" ? "text-foreground" : "text-gray-700"
                          }`}
                      >
                        Faculty
                      </Label>
                      <FacultySearchDropdown
                        selectedBranch={selectedBranch}
                        selectedFaculty={selectedFaculty}
                        setSelectedFaculty={setSelectedFaculty}
                        profile={profile}
                        faculties={faculties}
                        facultiesLoading={facultiesLoading}
                        facultySearch={facultySearch}
                        setFacultySearch={setFacultySearch}
                        facultyPage={facultyPage}
                        setFacultyPage={setFacultyPage}
                        facultyPagination={facultyPagination}
                        theme={theme}
                        facultyPopoverOpen={facultyPopoverOpen}
                        setFacultyPopoverOpen={setFacultyPopoverOpen}
                      />
                    </div>

                    {/* Action buttons (Filters & Export PDF) in a single row on mobile */}
                    <div className="flex-shrink-0 flex items-end gap-3 w-full lg:w-auto mt-2 lg:mt-0 dean-buttons-row">
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button
                            variant="outline"
                            className="flex items-center justify-center bg-primary text-white border-primary hover:bg-primary/90 hover:border-primary/90 hover:text-white transition-all duration-200 ease-in-out shadow-md h-9 px-3 whitespace-nowrap rounded-lg w-full lg:w-auto flex-1 lg:flex-initial"
                            disabled={
                              !selectedBranch || !selectedFaculty || facultiesLoading
                            }
                            title={
                              !selectedBranch || !selectedFaculty
                                ? "Select branch and faculty to enable filters"
                                : undefined
                            }
                          >
                            <Filter className="w-4 h-4" />
                            <span className="ml-1.5 text-sm">Filter</span>
                          </Button>
                        </DialogTrigger>
                        <DialogContent
                          className={`${theme === "dark"
                            ? "bg-card border-border"
                            : "bg-white border-gray-200"
                            } dean-filters-dialog`}
                        >
                          <DialogHeader>
                            <DialogTitle>Attendance Report Filters</DialogTitle>
                          </DialogHeader>
                          <div className="space-y-4 py-2">
                            <DatePickerField
                              label="Start Date"
                              date={startDate}
                              onDateChange={setStartDate}
                              popoverOpen={startDatePopoverOpen}
                              onPopoverChange={setStartDatePopoverOpen}
                              theme={theme}
                            />
                            <DatePickerField
                              label="End Date"
                              date={endDate}
                              onDateChange={setEndDate}
                              popoverOpen={endDatePopoverOpen}
                              onPopoverChange={setEndDatePopoverOpen}
                              theme={theme}
                            />
                            <div className="flex justify-end gap-2">
                              <DialogClose asChild>
                                <Button
                                  onClick={handleClearDates}
                                  className="px-4 py-2 bg-gray-100 text-gray-800 rounded-md hover:bg-gray-200 transition-colors"
                                >
                                  Clear
                                </Button>
                              </DialogClose>
                              <DialogClose asChild>
                                <Button
                                  onClick={handleDateFilter}
                                  className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90 transition-colors"
                                >
                                  Apply
                                </Button>
                              </DialogClose>
                            </div>
                          </div>
                        </DialogContent>
                      </Dialog>

                      {/* Desktop/Tablet Export Button */}
                      <Button
                        onClick={handleExportPDF}
                        variant="outline"
                        className="hidden lg:flex items-center justify-center gap-2 px-4 h-9 bg-primary text-white border-primary hover:bg-primary/90 hover:border-primary/90 hover:text-white transition-all duration-200 ease-in-out shadow-md rounded-lg w-full lg:w-auto flex-1 lg:flex-initial whitespace-nowrap"
                        disabled={
                          !selectedBranch || !selectedFaculty || facultiesLoading || exportLoading
                        }
                        title={
                          !selectedBranch || !selectedFaculty
                            ? "Select branch and faculty to enable export"
                            : undefined
                        }
                      >
                        {exportLoading ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Exporting...
                          </>
                        ) : (
                          <>
                            <FileText className="h-4 w-4" />
                            Export PDF
                          </>
                        )}
                      </Button>
                      {/* Mobile Export Icon Button */}
                      <Button
                        onClick={handleExportPDF}
                        size="icon"
                        variant="outline"
                        className="flex lg:hidden items-center justify-center h-9 w-9 p-0 border border-input bg-background text-foreground flex-shrink-0 shadow-sm dean-mobile-icon-btn"
                        disabled={
                          !selectedBranch || !selectedFaculty || facultiesLoading || exportLoading
                        }
                        title="Export PDF"
                      >
                        {exportLoading ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <FileText className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </div>
            </Card>
          </div>

          {/* ── Profile content ─────────────────────────────────────────────── */}
          {profile ? (
            <Card
              id="dean-faculty-container"
              className={
                theme === "dark"
                  ? "w-full bg-card border border-border relative overflow-hidden"
                  : "w-full bg-white border border-gray-200 relative overflow-hidden"
              }
            >
              <CardContent className="px-6 pb-6 pt-4 space-y-6">
                <div>
                  {/* Stats Cards */}
                  <div className="p-0">
                    <div
                      id="dean-faculty-stats-grid"
                      className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-5 gap-4 mb-8"
                    >
                      <DashboardCard
                        title="Weekly Hours"
                        value={profile.total_weekly_hours ?? 0}
                        icon={<Clock className="w-5 h-5" />}
                      />
                      <DashboardCard
                        title="Present Days"
                        value={profile.attendance_summary?.present_days ?? 0}
                        icon={<UserCheck className="w-5 h-5" />}
                      />
                      <DashboardCard
                        title="Absent Days"
                        value={profile.attendance_summary?.absent_days ?? 0}
                        icon={<UserX className="w-5 h-5" />}
                      />
                      <DashboardCard
                        title="Attendance %"
                        value={typeof profile.attendance_summary?.percent_present === 'number' ? `${profile.attendance_summary.percent_present}%` : (profile.attendance_summary?.percent_present ?? "N/A")}
                        icon={<Percent className="w-5 h-5" />}
                      />
                      <DashboardCard
                        title="Leave Days"
                        value={profile.attendance_summary?.leave_days ?? 0}
                        description={`Total: ${profile.attendance_summary?.total_leave_days_all_time ?? 0}`}
                        icon={<CalendarIcon className="w-5 h-5" />}
                      />
                    </div>

                    {/* Assignments */}
                    <div className="mb-8">
                      <h3
                        className={`text-xl font-semibold mb-4 flex items-center ${theme === "dark" ? "text-foreground" : "text-gray-800"
                          }`}
                      >
                        <svg className="w-6 h-6 mr-2 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                        </svg>
                        Subject Assignments
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                        <AssignmentsList assignments={profile.assignments ?? []} theme={theme} />
                      </div>
                    </div>

                    {/* Scheduled Classes */}
                    <div className="mb-8">
                      <h3
                        className={`text-xl font-semibold mb-4 flex items-center ${theme === "dark" ? "text-foreground" : "text-gray-800"
                          }`}
                      >
                        <svg className="w-6 h-6 mr-2 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        Weekly Schedule
                      </h3>
                      <ScheduledClassesTable classesList={profile.scheduled_classes ?? []} theme={theme} />
                    </div>

                    {/* Leave Requests */}
                    {userTier >= 2 && (
                      <div>
                        <h3
                          className={`text-xl font-semibold mb-4 flex items-center ${theme === "dark" ? "text-foreground" : "text-gray-800"
                            }`}
                        >
                          <svg className="w-6 h-6 mr-2 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1m0-10V7m0 10a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v10z" />
                          </svg>
                          Leave Requests
                        </h3>
                        <LeaveRequestsTable
                          leaves={profile.leaves ?? []}
                          theme={theme}
                          pagination={profile.leaves_pagination}
                          currentPage={leavesPage}
                          onPageChange={setLeavesPage}
                        />
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : (
            /* Empty state — shown only when genuinely no faculty is selected */
            !profileLoading && (
              <div
                className={`mt-4 flex flex-col items-center justify-center py-24 px-4 rounded-xl border-2 border-dashed ${theme === "dark"
                  ? "border-border bg-card/30"
                  : "border-gray-200 bg-gray-50/50"
                  }`}
              >
                <div
                  className={`p-5 rounded-full mb-4 ${theme === "dark" ? "bg-primary/10" : "bg-primary/5"
                    }`}
                >
                  <AlertCircle className="w-10 h-10 text-primary opacity-50" />
                </div>
                <h3
                  className={`text-lg font-semibold mb-2 ${theme === "dark" ? "text-foreground" : "text-gray-900"
                    }`}
                >
                  Select a Faculty Member to View Profile
                </h3>
                <p
                  className={`text-center max-w-md text-sm ${theme === "dark" ? "text-muted-foreground" : "text-gray-500"
                    }`}
                >
                  Choose a branch and then select a faculty member from the dropdown
                  above to view their detailed performance analytics, schedule, and
                  attendance history.
                </p>
              </div>
            )
          )}
        </>
      )}
    </div>
  );
};


// ─── Subcomponent: Date Picker Field ─────────────────────────────────────────

interface DatePickerFieldProps {
  readonly label: string;
  readonly date: string;
  readonly onDateChange: (date: string) => void;
  readonly popoverOpen: boolean;
  readonly onPopoverChange: (open: boolean) => void;
  readonly theme: string;
}

function DatePickerField({
  label, date, onDateChange, popoverOpen, onPopoverChange, theme,
}: DatePickerFieldProps) {
  return (
    <div>
      <Label className={`text-sm mb-1 ${theme === "dark" ? "text-foreground" : "text-gray-700"}`}>
        {label}
      </Label>
      <Popover open={popoverOpen} onOpenChange={onPopoverChange}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className={cn(
              "w-full justify-start text-left font-normal",
              !date && "text-muted-foreground",
              theme === "dark"
                ? "bg-background border-border"
                : "bg-white border-gray-300"
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {date ? format(new Date(date), "MMM dd, yyyy") : "Pick a date"}
          </Button>
        </PopoverTrigger>
        <PopoverContent
          className={`w-auto p-0 ${theme === "dark" ? "bg-card border-border" : "bg-white"
            }`}
        >
          <CalendarComponent
            mode="single"
            selected={date ? new Date(date) : undefined}
            onSelect={(selectedDate) => {
              if (selectedDate) {
                onDateChange(format(selectedDate, "yyyy-MM-dd"));
                onPopoverChange(false);
              }
            }}
            disabled={(d) => d > new Date()}
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}

// ─── Subcomponent: Assignments List ──────────────────────────────────────────

interface AssignmentsListProps {
  readonly assignments: readonly Assignment[];
  readonly theme: string;
}

function AssignmentsList({ assignments, theme }: AssignmentsListProps) {
  const list = assignments || [];

  return (
    <>
      {list.length === 0 ? (
        <div
          className={`col-span-full flex flex-col items-center justify-center py-12 px-4 rounded-xl border-2 border-dashed ${theme === "dark" ? "border-border bg-card/30 text-muted-foreground" : "border-gray-200 bg-gray-50/50 text-gray-500"
            }`}
        >
          <div className={`p-4 rounded-full mb-4 ${theme === 'dark' ? 'bg-primary/10' : 'bg-primary/5'}`}>
            <svg className="w-8 h-8 text-primary opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
          </div>
          <h3 className={`text-lg font-semibold mb-1 ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>
            No assignments found
          </h3>
          <p className={`text-center max-w-sm text-sm ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}`}>
            There are currently no assignments listed for this faculty member.
          </p>
        </div>
      ) : (
        list.map((a, idx) => {
          const key = a.subject
            ? `${a.subject}-${a.branch ?? ""}-${a.section ?? ""}`
            : `assignment-${idx}`;
          return (
            <div
              key={key}
              className={`border rounded-lg p-4 hover:shadow-md transition-shadow ${theme === "dark"
                ? "bg-muted/50 border-border"
                : "bg-gray-50 border-gray-200"
                }`}
            >
              <div
                className={`font-semibold mb-1 ${theme === "dark" ? "text-foreground" : "text-gray-800"
                  }`}
              >
                {a.subject}
              </div>
              <div className="flex flex-wrap gap-2">
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${theme === "dark" ? "bg-blue-900/30 text-blue-300" : "bg-blue-100 text-blue-800"}`}>{a.branch}</span>
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${theme === "dark" ? "bg-green-900/30 text-green-300" : "bg-green-100 text-green-800"}`}>Semester {a.semester}</span>
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${theme === "dark" ? "bg-purple-900/30 text-purple-300" : "bg-purple-100 text-purple-800"}`}>Section {a.section}</span>
              </div>
            </div>
          );
        })
      )}
    </>
  );
}

// ─── Subcomponent: Scheduled Classes Table ───────────────────────────────────

interface ScheduledClassesTableProps {
  readonly classesList: readonly ScheduledClass[];
  readonly theme: string;
}

const SCHEDULE_PAGE_SIZE = 10;

function ScheduledClassesTable({ classesList, theme }: ScheduledClassesTableProps) {
  const list = classesList || [];
  const [currentPage, setCurrentPage] = useState(1);

  const totalPages = Math.max(1, Math.ceil(list.length / SCHEDULE_PAGE_SIZE));
  const paginated = list.slice((currentPage - 1) * SCHEDULE_PAGE_SIZE, currentPage * SCHEDULE_PAGE_SIZE);

  return (
    <Card className={`shadow-none border overflow-hidden ${theme === "dark" ? "bg-card border-border" : "bg-white border-gray-200"}`}>
      <CardContent className="p-0 overflow-x-auto">
        <table className="w-full">
          <thead className={theme === "dark" ? "bg-muted/50" : "bg-gray-50"}>
            <tr>
              {["Day", "Time", "Subject", "Section", "Hours"].map((h) => (
                <th key={h} className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${theme === "dark" ? "text-muted-foreground" : "text-gray-500"}`}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className={`divide-y ${theme === "dark" ? "divide-border" : "divide-gray-200"}`}>
            {list.length === 0 ? (
              <tr>
                <td colSpan={5} className="p-4">
                  <div
                    className={`flex flex-col items-center justify-center py-12 px-4 rounded-xl border-2 border-dashed ${theme === 'dark' ? 'border-border bg-card/30 text-muted-foreground' : 'border-gray-200 bg-gray-50/50 text-gray-500'
                      }`}
                  >
                    <div className={`p-4 rounded-full mb-4 ${theme === 'dark' ? 'bg-primary/10' : 'bg-primary/5'}`}>
                      <svg className="w-8 h-8 text-primary opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <h3 className={`text-lg font-semibold mb-1 ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>
                      No scheduled classes found
                    </h3>
                    <p className={`text-center max-w-sm text-sm ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}`}>
                      There are no classes scheduled for this faculty member.
                    </p>
                  </div>
                </td>
              </tr>
            ) : (
              paginated.map((s) => (
                <tr key={s.id} className="transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${theme === "dark" ? "bg-blue-900/30 text-blue-300" : "bg-blue-100 text-blue-800"}`}>{s.day}</span>
                  </td>
                  <td className={`px-6 py-4 whitespace-nowrap text-sm ${theme === "dark" ? "text-foreground" : "text-gray-900"}`}>{s.start_time} - {s.end_time}</td>
                  <td className={`px-6 py-4 whitespace-nowrap text-sm font-medium ${theme === "dark" ? "text-foreground" : "text-gray-900"}`}>{s.subject}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${theme === "dark" ? "bg-green-900/30 text-green-300" : "bg-green-100 text-green-800"}`}>{s.section}</span>
                  </td>
                  <td className={`px-6 py-4 whitespace-nowrap text-sm ${theme === "dark" ? "text-foreground" : "text-gray-900"}`}>{s.duration_hours} hrs</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </CardContent>
      {totalPages > 1 && (
        <CardFooter className="flex flex-col sm:flex-row items-center justify-between p-6 border-t border-border mt-auto gap-4">
          <div className={`text-xs font-medium ${theme === "dark" ? "text-muted-foreground" : "text-gray-500"}`}>
            Showing Page {currentPage} of {totalPages} ({list.length} records)
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm" disabled={currentPage === 1} onClick={() => setCurrentPage((p) => p - 1)} className="h-9 px-4 text-white bg-primary border-primary hover:bg-primary/90 hover:border-primary/90 hover:text-white transition-all rounded-lg">Previous</Button>
            <div className={`flex items-center justify-center min-w-[40px] h-9 px-3 text-sm font-semibold rounded-lg border ${theme === "dark" ? "bg-card border-border text-foreground" : "bg-white border-gray-200 text-gray-900"}`}>{currentPage}</div>
            <Button variant="outline" size="sm" disabled={currentPage === totalPages} onClick={() => setCurrentPage((p) => p + 1)} className="h-9 px-4 text-white bg-primary border-primary hover:bg-primary/90 hover:border-primary/90 hover:text-white transition-all rounded-lg">Next</Button>
          </div>
        </CardFooter>
      )}
    </Card>
  );
}


// ─── Subcomponent: Attendance Log Table ──────────────────────────────────────

interface AttendanceLogTableProps {
  readonly attendance: readonly AttendanceRecord[];
  readonly theme: string;
}

function AttendanceLogTable({ attendance, theme }: AttendanceLogTableProps) {
  if (!attendance || attendance.length === 0) {
    return (
      <div className={`text-center py-8 ${theme === "dark" ? "text-muted-foreground" : "text-gray-500"}`}>
        No attendance records found
      </div>
    );
  }

  const getStatusColor = (status: string) => {
    const s = status.toLowerCase();
    if (s === "present") return theme === "dark" ? "bg-green-900/30 text-green-300" : "bg-green-100 text-green-800";
    if (s === "absent") return theme === "dark" ? "bg-red-900/30 text-red-300" : "bg-red-100 text-red-800";
    if (s === "leave") return theme === "dark" ? "bg-yellow-900/30 text-yellow-300" : "bg-yellow-100 text-yellow-800";
    return theme === "dark" ? "bg-blue-900/30 text-blue-300" : "bg-blue-100 text-blue-800";
  };

  return (
    <div className={`overflow-x-auto border rounded-lg ${theme === "dark" ? "bg-card border-border" : "bg-white border-gray-200"}`}>
      <table className="w-full">
        <thead className={theme === "dark" ? "bg-muted/50" : "bg-gray-50"}>
          <tr>
            {["Date", "Status", "Notes"].map((h) => (
              <th key={h} className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${theme === "dark" ? "text-muted-foreground" : "text-gray-500"}`}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody className={`divide-y ${theme === "dark" ? "divide-border" : "divide-gray-200"}`}>
          {attendance.map((a, idx) => (
            <tr key={`${a.date}-${idx}`} className="transition-colors">
              <td className={`px-6 py-4 whitespace-nowrap text-sm font-medium ${theme === "dark" ? "text-foreground" : "text-gray-900"}`}>{a.date}</td>
              <td className="px-6 py-4 whitespace-nowrap">
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(a.status)}`}>{a.status}</span>
              </td>
              <td className={`px-6 py-4 text-sm ${theme === "dark" ? "text-muted-foreground" : "text-gray-600"}`}>{a.notes || "-"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── Subcomponent: Leave Requests Table ──────────────────────────────────────

interface LeaveRequestsTableProps {
  readonly leaves: readonly LeaveRecord[];
  readonly theme: string;
  readonly pagination?: { total_pages: number; count?: number };
  readonly currentPage: number;
  readonly onPageChange: (page: number) => void;
}

function LeaveRequestsTable({
  leaves, theme, pagination, currentPage, onPageChange,
}: LeaveRequestsTableProps) {
  const leavesList = leaves || [];
  const [selectedLeave, setSelectedLeave] = useState<LeaveRecord | null>(null);
  const [showReasonDialog, setShowReasonDialog] = useState(false);

  const getStatusColor = (status: string) => {
    const s = status.toUpperCase();
    if (s === "APPROVED") return theme === "dark" ? "bg-green-900/30 text-green-300" : "bg-green-100 text-green-800";
    if (s === "REJECTED") return theme === "dark" ? "bg-red-900/30 text-red-300" : "bg-red-100 text-red-800";
    if (s === "PENDING") return theme === "dark" ? "bg-yellow-900/30 text-yellow-300" : "bg-yellow-100 text-yellow-800";
    return theme === "dark" ? "bg-blue-900/30 text-blue-300" : "bg-blue-100 text-blue-800";
  };

  return (
    <Card className={`shadow-none border overflow-hidden ${theme === "dark" ? "bg-card border-border" : "bg-white border-gray-200"}`}>
      <CardContent className="p-0 overflow-x-auto">
        <table className="w-full">
          <thead className={theme === "dark" ? "bg-muted/50" : "bg-gray-50"}>
            <tr>
              {["Period", "Status", "Reason"].map((h) => (
                <th key={h} className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${theme === "dark" ? "text-muted-foreground" : "text-gray-500"}`}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className={`divide-y ${theme === "dark" ? "divide-border" : "divide-gray-200"}`}>
            {leavesList.length === 0 ? (
              <tr>
                <td colSpan={3} className="py-8 text-center text-muted-foreground">
                  <div className="flex flex-col items-center justify-center space-y-2 opacity-65">
                    <CalendarIcon className="h-8 w-8 text-muted-foreground" />
                    <p className="text-sm font-semibold uppercase tracking-wider">No Leave Requests Found</p>
                  </div>
                </td>
              </tr>
            ) : (
              leavesList.map((l) => (
                <tr key={l.id} className="transition-colors">
                  <td className={`px-6 py-4 whitespace-nowrap text-sm font-medium ${theme === "dark" ? "text-foreground" : "text-gray-900"}`}>{l.start_date} to {l.end_date}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(l.status)}`}>{l.status}</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    {l.reason ? (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => { setSelectedLeave(l); setShowReasonDialog(true); }}
                        className={`text-xs ${theme === 'dark' ? 'border-border hover:bg-accent' : 'border-gray-300 hover:bg-gray-50'}`}
                      >
                        View
                      </Button>
                    ) : (
                      <span className={theme === 'dark' ? 'text-muted-foreground' : 'text-gray-400'}>-</span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </CardContent>
      {pagination && pagination.total_pages > 1 && (
        <CardFooter className="flex flex-col sm:flex-row items-center justify-between p-6 border-t border-border mt-auto gap-4">
          <div className={`text-xs font-medium ${theme === "dark" ? "text-muted-foreground" : "text-gray-500"}`}>
            Showing Page {currentPage} of {pagination.total_pages}
            {pagination.count !== undefined && ` (${pagination.count} records)`}
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm" disabled={currentPage === 1} onClick={() => onPageChange(currentPage - 1)} className="h-9 px-4 text-white bg-primary border-primary hover:bg-primary/90 hover:border-primary/90 hover:text-white transition-all rounded-lg">Previous</Button>
            <div className={`flex items-center justify-center min-w-[40px] h-9 px-3 text-sm font-semibold rounded-lg border ${theme === "dark" ? "bg-card border-border text-foreground" : "bg-white border-gray-200 text-gray-900"}`}>{currentPage}</div>
            <Button variant="outline" size="sm" disabled={currentPage === pagination.total_pages} onClick={() => onPageChange(currentPage + 1)} className="h-9 px-4 text-white bg-primary border-primary hover:bg-primary/90 hover:border-primary/90 hover:text-white transition-all rounded-lg">Next</Button>
          </div>
        </CardFooter>
      )}
      <Dialog open={showReasonDialog} onOpenChange={setShowReasonDialog}>
        <DialogContent className={`w-[90%] sm:max-w-md mx-auto rounded-xl ${theme === 'dark' ? 'bg-card text-card-foreground border-border' : 'bg-white text-gray-900 border-gray-200'}`}>
          <DialogHeader>
            <DialogTitle className={theme === 'dark' ? 'text-card-foreground' : 'text-gray-900'}>
              Leave Reason
            </DialogTitle>
            <DialogDescription className={theme === 'dark' ? 'text-muted-foreground' : 'text-gray-600'}>
              {selectedLeave && `Leave period: ${selectedLeave.start_date} to ${selectedLeave.end_date}`}
            </DialogDescription>
          </DialogHeader>
          <div className="mt-4">
            <p className={`text-sm ${theme === 'dark' ? 'text-card-foreground' : 'text-gray-700'} whitespace-pre-wrap`}>
              {selectedLeave?.reason}
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

// ─── Subcomponent: Faculty Search Dropdown ────────────────────────────────────

interface FacultySearchDropdownProps {
  selectedBranch: string | null;
  selectedFaculty: string | null;
  setSelectedFaculty: (val: string | null) => void;
  profile: Profile | null;
  faculties: Faculty[];
  facultiesLoading: boolean;
  facultySearch: string;
  setFacultySearch: (val: string) => void;
  facultyPage: number;
  setFacultyPage: (val: number | ((prev: number) => number)) => void;
  facultyPagination: { currentPage: number; totalPages: number; totalItems: number };
  theme: string;
  facultyPopoverOpen: boolean;
  setFacultyPopoverOpen: (open: boolean) => void;
}

function FacultySearchDropdown({
  selectedBranch, selectedFaculty, setSelectedFaculty, profile, faculties,
  facultiesLoading, facultySearch, setFacultySearch, facultyPage, setFacultyPage,
  facultyPagination, theme, facultyPopoverOpen, setFacultyPopoverOpen,
}: FacultySearchDropdownProps) {
  return (
    <Popover open={facultyPopoverOpen} onOpenChange={setFacultyPopoverOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          className={cn(
            "w-full justify-between h-10 transition-all font-normal",
            !selectedFaculty && "text-muted-foreground",
            theme === "dark"
              ? "bg-background border-border hover:bg-muted"
              : "bg-white border-gray-200 hover:bg-gray-50"
          )}
          disabled={!selectedBranch}
        >
          <span className="truncate">
            {selectedFaculty
              ? profile?.name ||
              faculties.find((f) => String(f.id) === selectedFaculty)?.name ||
              "Loading..."
              : "Select faculty member"}
          </span>
          <svg className="ml-2 h-4 w-4 shrink-0 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[300px] p-0 shadow-xl border-border" align="start">
        <div className={`flex flex-col ${theme === "dark" ? "bg-card text-foreground" : "bg-white text-gray-900"}`}>
          <div className="p-2 border-b border-border">
            <input
              className={`w-full px-3 py-2 text-sm rounded-md border outline-none focus:ring-1 focus:ring-primary ${theme === "dark"
                ? "bg-background border-border text-foreground"
                : "bg-white border-gray-200 text-gray-900"
                }`}
              placeholder="Search faculty..."
              value={facultySearch}
              onChange={(e) => setFacultySearch(e.target.value)}
              onClick={(e) => e.stopPropagation()}
              autoFocus
            />
          </div>
          <div className="max-h-[200px] overflow-y-auto p-1 custom-scrollbar">
            {facultiesLoading && faculties.length === 0 ? (
              <div className="p-8 text-center text-sm text-muted-foreground flex flex-col items-center gap-2">
                <div className="w-4 h-4 border-2 border-primary border-t-transparent animate-spin rounded-full" />
                Loading...
              </div>
            ) : faculties.length === 0 ? (
              <div className="p-8 text-center text-sm text-muted-foreground italic">No faculty found.</div>
            ) : (
              faculties.map((f) => (
                <div
                  key={f.id}
                  className={cn(
                    "relative flex cursor-pointer select-none items-center rounded-sm px-3 py-2 text-sm outline-none transition-colors",
                    selectedFaculty === String(f.id)
                      ? "bg-primary/10 text-primary font-medium"
                      : theme === "dark"
                        ? "hover:bg-muted text-foreground"
                        : "hover:bg-gray-100 text-gray-700"
                  )}
                  onClick={() => {
                    setSelectedFaculty(String(f.id));
                    setFacultyPopoverOpen(false);
                  }}
                >
                  <div className="flex flex-col overflow-hidden">
                    <span className="truncate">{f.name}</span>
                    {f.email && <span className="text-[10px] opacity-60 truncate">{f.email}</span>}
                  </div>
                  {selectedFaculty === String(f.id) && (
                    <svg className="ml-auto h-4 w-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </div>
              ))
            )}
          </div>
          {facultyPagination.totalPages > 1 && (
            <div className="flex items-center justify-between p-2 border-t border-border bg-muted/20 text-xs">
              <Button
                variant="ghost" size="sm" className="h-7 px-2 hover:bg-background"
                disabled={facultyPage === 1 || facultiesLoading}
                onClick={(e) => { e.stopPropagation(); setFacultyPage((prev) => prev - 1); }}
              >Prev</Button>
              <span className="font-medium">{facultyPage} / {facultyPagination.totalPages}</span>
              <Button
                variant="ghost" size="sm" className="h-7 px-2 hover:bg-background"
                disabled={facultyPage === facultyPagination.totalPages || facultiesLoading}
                onClick={(e) => { e.stopPropagation(); setFacultyPage((prev) => prev + 1); }}
              >Next</Button>
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

export default DeanFacultyProfile;