import { useEffect, useMemo, useState } from "react";
import { API_ENDPOINT } from "@/utils/config";
import { fetchWithTokenRefresh } from "@/utils/authService";
import { useTheme } from "../../context/ThemeContext";
import { format } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "../ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "../ui/popover";
import { Calendar as CalendarComponent } from "../ui/calendar";
import { Button } from "../ui/button";
import { Calendar, Trash2, ChevronDown, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { SkeletonStatsGrid, SkeletonPageHeader, SkeletonCard } from "../ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "../ui/alert";

const DeanAttendanceFilters = () => {
  const { theme } = useTheme();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<any>(null);
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [selectedRole, setSelectedRole] = useState<string>("hod");
  const [selectedPersonId, setSelectedPersonId] = useState<string | null>(null);
  const [selectedPersonSummary, setSelectedPersonSummary] = useState<any>(null);
  const [isDateModalOpen, setIsDateModalOpen] = useState(false);
  const [startDatePopoverOpen, setStartDatePopoverOpen] = useState(false);
  const [endDatePopoverOpen, setEndDatePopoverOpen] = useState(false);

  const fetchData = async (start?: string, end?: string) => {
    setLoading(true);
    try {
      let url = `${API_ENDPOINT}/dean/reports/hod-admin-attendance/`;
      if (start && end) {
        url += `?start_date=${start}&end_date=${end}`;
      }
      const resSummary = await fetchWithTokenRefresh(url);
      const jsonSummary = await resSummary.json();
      if (!jsonSummary.success) {
        setError(jsonSummary.message || "Failed to load HOD/admin summary");
        return;
      }
      setData(jsonSummary);
      setError(null);
    } catch (e: any) {
      setError(e?.message || "Network error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const summary = data?.summary;
  const isMonthly = summary?.period;
  const hodList = useMemo(() => summary?.hods || [], [summary]);
  const adminList = useMemo(() => summary?.admins || data?.data?.admins || summary?.admin_present_list || [], [summary, data?.data?.admins]);
  const totalRangeDays = isMonthly ? (data?.summary?.period?.total_days || 0) : 1;

  const handleFilter = () => {
    if (startDate && endDate) {
      fetchData(startDate, endDate);
    } else {
      fetchData();
    }
  };

  useEffect(() => {
    const loadPerson = async () => {
      setSelectedPersonSummary(null);
      if (!selectedPersonId) return;

      try {
        if (selectedRole === "hod") {
          let url = `${API_ENDPOINT}/dean/faculty/${selectedPersonId}/profile/`;
          const params = new URLSearchParams();
          if (startDate) params.append("start_date", startDate);
          if (endDate) params.append("end_date", endDate);
          if (params.toString()) url += `?${params.toString()}`;

          const res = await fetchWithTokenRefresh(url);
          const json = await res.json();
          if (json.success) {
            const profile = json.data || json.profile || null;
            setSelectedPersonSummary(profile?.attendance_summary || null);
          }
        } else {
          const selectedAdmin = adminList.find((admin: { id?: string; name?: string; email?: string; mobile?: string; last_login?: string | null }) => String(admin.id) === String(selectedPersonId));
          if (selectedAdmin) {
            const nameParts = String(selectedAdmin.name || "").trim().split(/\s+/);
            const selectedLogin = selectedAdmin.last_login ? new Date(selectedAdmin.last_login) : null;
            let inSelectedRange = false;
            if (selectedLogin) {
              if (isMonthly) {
                const rangeStart = startDate ? new Date(startDate) : null;
                const rangeEnd = endDate ? new Date(endDate) : null;
                inSelectedRange = Boolean(rangeStart && rangeEnd && selectedLogin >= rangeStart && selectedLogin <= rangeEnd);
              } else {
                inSelectedRange = selectedLogin.toDateString() === new Date().toDateString();
              }
            }
            const presentDays = inSelectedRange ? 1 : 0;
            setSelectedPersonSummary({
              first_name: nameParts[0] || "",
              last_name: nameParts.slice(1).join(" ") || "",
              email: selectedAdmin.email || "",
              mobile_number: selectedAdmin.mobile || "",
              address: "",
              bio: "",
              weekly_hours: 0,
              present_days: presentDays,
              absent_days: Math.max(0, totalRangeDays - presentDays),
              leave_days: 0,
              unmarked_days: Math.max(0, totalRangeDays - presentDays),
              total_days: totalRangeDays,
              percent_present: totalRangeDays ? Number(((presentDays / totalRangeDays) * 100).toFixed(2)) : 0,
            });
          }
        }
      } catch {
        // Keep this page resilient; main error handling is in fetchData.
      }
    };

    loadPerson();
  }, [selectedPersonId, selectedRole, startDate, endDate, adminList, totalRangeDays, isMonthly]);


  if (error && !data) {
    return (
      <div className="p-6">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className={`space-y-4  ${theme === "dark" ? "bg-background text-foreground" : "bg-gray-50 text-gray-900"}`}>
      {loading ? (
        <div className="space-y-6">
          <SkeletonPageHeader />
          <SkeletonCard className="h-32" />
          <div className="space-y-4">
            <SkeletonCard className="h-40" />
            <SkeletonStatsGrid items={6} />
          </div>
        </div>
      ) : error ? (
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : (
        <>
          {/* Filter Controls Card */}
          <div className={`p-4 rounded-lg shadow ${theme === "dark" ? "bg-card border border-border" : "bg-white border border-gray-200"}`}>
            <div className="flex flex-wrap lg:flex-nowrap items-end justify-between gap-4">
              {/* Left Side: Role & Select */}
              <div className="flex gap-4 items-end flex-wrap w-full">
                <div className="w-full lg:w-auto">
                  <label htmlFor="dean-filter-role" className={`block text-sm font-medium mb-2 ${theme === "dark" ? "text-foreground" : "text-gray-700"}`}>
                    Role
                  </label>
                  <Select value={selectedRole} onValueChange={(value) => {
                    setSelectedRole(value);
                    setSelectedPersonId(null);
                  }}>
                    <SelectTrigger className={`w-full lg:w-[120px] ${theme === "dark" ? "bg-background border-border" : "bg-white border-gray-300"}`}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="hod">HOD</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="w-full lg:w-auto">
                  <label htmlFor="dean-filter-person" className={`block text-sm font-medium mb-2 ${theme === "dark" ? "text-foreground" : "text-gray-700"}`}>
                    Select
                  </label>
                  <Select value={selectedPersonId || ""} onValueChange={(value) => setSelectedPersonId(value || null)}>
                    <SelectTrigger className={`w-full lg:w-[180px] ${theme === "dark" ? "bg-background border-border" : "bg-white border-gray-300"}`}>
                      <SelectValue placeholder={selectedRole === "hod" ? "Select hod" : "Select admin"} />
                    </SelectTrigger>
                    <SelectContent>
                      {selectedRole === "hod" && hodList.map((h: any) => (
                        <SelectItem key={h.id} value={h.id}>
                          {h.name} {h.branch ? `• ${h.branch}` : ""}
                        </SelectItem>
                      ))}
                      {selectedRole === "admin" && adminList.map((a: any) => (
                        <SelectItem key={a.id} value={a.id}>
                          {a.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Right Side: Date Range & Clear */}
              <div className="flex flex-col lg:flex-row lg:items-center gap-4 w-full lg:w-auto">
                <label className={`text-sm font-medium whitespace-nowrap ${theme === "dark" ? "text-foreground" : "text-gray-700"}`}>
                  Date Range to filter
                </label>
                <Button
                  variant="outline"
                  onClick={() => setIsDateModalOpen(true)}
                  disabled={!selectedPersonId}
                  className={cn(
                    "w-full lg:w-auto justify-start text-left font-normal gap-2",
                    !startDate && "text-muted-foreground",
                    theme === "dark" ? "bg-background border-border" : "bg-white border-gray-300"
                  )}
                >
                  <Calendar className="h-4 w-4" />
                  {startDate && endDate
                    ? `${startDate} to ${endDate}`
                    : "Select dates"}
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => {
                    setStartDate("");
                    setEndDate("");
                    fetchData();
                  }}
                  className="gap-2 w-full lg:w-auto"
                >
                  <Trash2 className="w-4 h-4" />
                  Clear
                </Button>
              </div>
            </div>
          </div>

          {isMonthly && (
            <div className={`mt-2 text-sm ${theme === "dark" ? "text-muted-foreground" : "text-gray-600"}`}>
              Showing data from {data.summary.period.start_date} to {data.summary.period.end_date} ({data.summary.period.total_days} days)
            </div>
          )}

          {/* Date Filter Modal */}
          <Dialog open={isDateModalOpen} onOpenChange={setIsDateModalOpen}>
            <DialogContent className={`${theme === "dark" ? "bg-card border-border" : "bg-white border-gray-200"}`}>
              <DialogHeader>
                <DialogTitle className={theme === "dark" ? "text-foreground" : "text-gray-900"}>
                  Select Date Range
                </DialogTitle>
              </DialogHeader>

              <div className="space-y-4 py-4">
                <div>
                  <label htmlFor="modal-start-date" className={`block text-sm font-medium mb-2 ${theme === "dark" ? "text-foreground" : "text-gray-700"}`}>
                    Start Date
                  </label>
                  <Popover open={startDatePopoverOpen} onOpenChange={setStartDatePopoverOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !startDate && "text-muted-foreground",
                          theme === "dark" ? "bg-background border-border" : "bg-white border-gray-300"
                        )}
                      >
                        <Calendar className="mr-2 h-4 w-4" />
                        {startDate ? format(new Date(startDate), "MMM dd, yyyy") : "Pick a date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className={`w-auto p-0 ${theme === "dark" ? "bg-card border-border" : "bg-white"}`}>
                      <CalendarComponent
                        mode="single"
                        selected={startDate ? new Date(startDate) : undefined}
                        onSelect={(date) => {
                          if (date) {
                            const dateStr = format(date, "yyyy-MM-dd");
                            setStartDate(dateStr);
                            setStartDatePopoverOpen(false);
                          }
                        }}
                        disabled={(date) => date > new Date()}
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                <div>
                  <label htmlFor="modal-end-date" className={`block text-sm font-medium mb-2 ${theme === "dark" ? "text-foreground" : "text-gray-700"}`}>
                    End Date
                  </label>
                  <Popover open={endDatePopoverOpen} onOpenChange={setEndDatePopoverOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !endDate && "text-muted-foreground",
                          theme === "dark" ? "bg-background border-border" : "bg-white border-gray-300"
                        )}
                      >
                        <Calendar className="mr-2 h-4 w-4" />
                        {endDate ? format(new Date(endDate), "MMM dd, yyyy") : "Pick a date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className={`w-auto p-0 ${theme === "dark" ? "bg-card border-border" : "bg-white"}`}>
                      <CalendarComponent
                        mode="single"
                        selected={endDate ? new Date(endDate) : undefined}
                        onSelect={(date) => {
                          if (date) {
                            const dateStr = format(date, "yyyy-MM-dd");
                            setEndDate(dateStr);
                            setEndDatePopoverOpen(false);
                          }
                        }}
                        disabled={(date) => date > new Date()}
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>

              <DialogFooter className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => setIsDateModalOpen(false)}
                  className={theme === "dark" ? "border-border text-foreground" : "border-gray-300 text-gray-700"}
                >
                  Cancel
                </Button>
                <Button
                  onClick={() => {
                    handleFilter();
                    setIsDateModalOpen(false);
                  }}
                  className="bg-primary hover:bg-primary/90 text-white"
                >
                  Apply
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {selectedPersonId && selectedPersonSummary && (
            <div className={`mt-4 p-4 rounded-lg shadow ${theme === "dark" ? "bg-card border border-border" : "bg-white border border-gray-200"}`}>
              <div className="flex items-center justify-between mb-3">
                <div>
                  <div className={`text-sm ${theme === "dark" ? "text-muted-foreground" : "text-gray-500"}`}>Selected</div>
                  <div className="text-lg font-semibold">
                    {(selectedRole === "hod"
                      ? hodList.find((h: any) => h.id === selectedPersonId)?.name
                      : adminList.find((a: any) => a.id === selectedPersonId)?.name) || "Selected Person"}
                  </div>
                  <div className={`text-sm ${theme === "dark" ? "text-muted-foreground" : "text-gray-500"}`}>
                    {selectedRole === "hod"
                      ? hodList.find((h: any) => h.id === selectedPersonId)?.branch
                      : adminList.find((a: any) => a.id === selectedPersonId)?.email || adminList.find((a: any) => a.id === selectedPersonId)?.mobile}
                  </div>
                </div>
                <div className={`text-sm text-right ${theme === "dark" ? "text-muted-foreground" : "text-gray-500"}`}>
                  <div>Range days</div>
                  <div className="text-lg font-semibold">{selectedPersonSummary?.total_days ?? (isMonthly ? data.summary.period.total_days : "-")}</div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
                <div className={`p-4 rounded-lg border shadow-sm ${theme === 'dark' ? 'bg-blue-900/10 border-blue-900/20' : 'bg-blue-50 border-blue-100'}`}>
                  <div className={`text-xs font-semibold mb-1 ${theme === 'dark' ? 'text-blue-400' : 'text-blue-600'}`}>Weekly Hours</div>
                  <div className={`text-2xl font-bold ${theme === 'dark' ? 'text-blue-100' : 'text-blue-900'}`}>{selectedPersonSummary?.weekly_hours ?? 0}</div>
                </div>
                <div className={`p-4 rounded-lg border shadow-sm ${theme === 'dark' ? 'bg-green-900/10 border-green-900/20' : 'bg-green-50 border-green-100'}`}>
                  <div className={`text-xs font-semibold mb-1 ${theme === 'dark' ? 'text-green-400' : 'text-green-600'}`}>Present Days</div>
                  <div className={`text-2xl font-bold ${theme === 'dark' ? 'text-green-100' : 'text-green-900'}`}>{selectedPersonSummary?.present_days ?? 0}</div>
                </div>
                <div className={`p-4 rounded-lg border shadow-sm ${theme === 'dark' ? 'bg-red-900/10 border-red-900/20' : 'bg-red-50 border-red-100'}`}>
                  <div className={`text-xs font-semibold mb-1 ${theme === 'dark' ? 'text-red-400' : 'text-red-600'}`}>Absent Days</div>
                  <div className={`text-2xl font-bold ${theme === 'dark' ? 'text-red-100' : 'text-red-900'}`}>{selectedPersonSummary?.absent_days ?? 0}</div>
                </div>
                <div className={`p-4 rounded-lg border shadow-sm ${theme === 'dark' ? 'bg-purple-900/10 border-purple-900/20' : 'bg-purple-50 border-purple-100'}`}>
                  <div className={`text-xs font-semibold mb-1 ${theme === 'dark' ? 'text-purple-400' : 'text-purple-600'}`}>Attendance %</div>
                  <div className={`text-2xl font-bold ${theme === 'dark' ? 'text-purple-100' : 'text-purple-900'}`}>{selectedPersonSummary?.percent_present ?? "N/A"}</div>
                </div>
                <div className={`p-4 rounded-lg border shadow-sm ${theme === 'dark' ? 'bg-yellow-900/10 border-yellow-900/20' : 'bg-yellow-50 border-yellow-100'}`}>
                  <div className={`text-xs font-semibold mb-1 ${theme === 'dark' ? 'text-yellow-400' : 'text-yellow-600'}`}>Leave Days</div>
                  <div className={`text-2xl font-bold ${theme === 'dark' ? 'text-yellow-100' : 'text-yellow-900'}`}>{selectedPersonSummary?.leave_days ?? 0}</div>
                </div>
                <div className={`p-4 rounded-lg border shadow-sm ${theme === 'dark' ? 'bg-amber-900/10 border-amber-900/20' : 'bg-amber-50 border-amber-100'}`}>
                  <div className={`text-xs font-semibold mb-1 ${theme === 'dark' ? 'text-amber-400' : 'text-amber-600'}`}>Unmarked Days</div>
                  <div className={`text-2xl font-bold ${theme === 'dark' ? 'text-amber-100' : 'text-amber-900'}`}>{selectedPersonSummary?.unmarked_days ?? 0}</div>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default DeanAttendanceFilters;
