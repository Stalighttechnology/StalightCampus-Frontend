import { translateTerminology, getTerm } from "@/utils/institutionConfig";
import { useEffect, useMemo, useState } from "react";
import { API_ENDPOINT } from "@/utils/config";
import { fetchWithTokenRefresh } from "@/utils/authService";
import { useTheme } from "../../context/ThemeContext";
import { format } from "date-fns";
import { useAuth } from "@/context/AuthContext";
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
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "../ui/card";
import { Alert, AlertDescription, AlertTitle } from "../ui/alert";

const DeanAttendanceFilters = () => {
  const { theme } = useTheme();
  const { user } = useAuth();
  const userTier = user?.organization?.plan?.tier || 1;
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<any>(null);
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [selectedRole, setSelectedRole] = useState<string>("");
  const [selectedPersonId, setSelectedPersonId] = useState<string | null>(null);
  const [selectedPersonSummary, setSelectedPersonSummary] = useState<any>(null);
  const [isDateModalOpen, setIsDateModalOpen] = useState(false);
  const [startDatePopoverOpen, setStartDatePopoverOpen] = useState(false);
  const [endDatePopoverOpen, setEndDatePopoverOpen] = useState(false);
  const [leavesPage, setLeavesPage] = useState(1);
  const [isPersonSelectOpen, setIsPersonSelectOpen] = useState(false);


  const fetchData = async () => {
    setLoading(true);
    try {
      // We only need the names of HODs and Admins for the dropdowns.
      // Individual profiles are fetched separately when a person is selected.
      const url = `${API_ENDPOINT}/dean/reports/hod-admin-attendance/?names_only=true`;
      const resSummary = await fetchWithTokenRefresh(url);
      const jsonSummary = await resSummary.json();
      if (!jsonSummary.success) {
        setError(jsonSummary.message || "Failed to load HOD/admin list");
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
  const isMonthly = useMemo(() => Boolean(startDate && endDate), [startDate, endDate]);
  const hodList = useMemo(() => summary?.hods || [], [summary]);
  const adminList = useMemo(() => summary?.admins || data?.data?.admins || summary?.admin_present_list || [], [summary, data?.data?.admins]);
  const totalRangeDays = useMemo(() => {
    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      const diffTime = Math.abs(end.getTime() - start.getTime());
      return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    }
    return 1;
  }, [startDate, endDate]);

  const handleFilter = () => {
    // The loadPerson useEffect will automatically trigger when startDate/endDate changes
    // No need to re-fetch the global HOD/Admin list
  };

  useEffect(() => {
    const loadPerson = async () => {
      setSelectedPersonSummary(null);
      if (!selectedPersonId) return;

      try {
        if (selectedRole === "hod") {
          let url = `${API_ENDPOINT}/dean/faculty/${selectedPersonId}/profile/`;
          const params = new URLSearchParams();
          params.append("compact", "true");
          params.append("page", String(leavesPage));
          if (startDate) params.append("start_date", startDate);
          if (endDate) params.append("end_date", endDate);
          url += `?${params.toString()}`;

          const res = await fetchWithTokenRefresh(url);
          const json = await res.json();
          if (json.success) {
            const profile = json.data || json.profile || null;
            setSelectedPersonSummary(profile);
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
              total_weekly_hours: 0,
              attendance_summary: {
                present_days: presentDays,
                absent_days: Math.max(0, totalRangeDays - presentDays),
                leave_days: 0,
                unmarked_days: Math.max(0, totalRangeDays - presentDays),
                total_days: totalRangeDays,
                percent_present: totalRangeDays ? Number(((presentDays / totalRangeDays) * 100).toFixed(2)) : 0,
              }
            });
          }
        }
      } catch {
        // Keep this page resilient; main error handling is in fetchData.
      }
    };

    loadPerson();
  }, [selectedPersonId, selectedRole, startDate, endDate, adminList, totalRangeDays, isMonthly, leavesPage]);


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
    <div id="dean-attendance-filters-container" className={`space-y-4  ${theme === "dark" ? "bg-background text-foreground" : "bg-gray-50 text-gray-900"}`}>
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
          <div id="dean-attendance-filters-card">
            <div className="mb-4">
              <h2 className={`text-xl font-semibold ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>Attendance Filters</h2>
              <p className={`text-sm ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}`}>Filter and analyze attendance data historically by date and role</p>
            </div>

            {/* Filter Controls Card */}
            <div className={`p-4 rounded-lg shadow ${theme === "dark" ? "bg-card border border-border" : "bg-white border border-gray-200"}`}>
              <div className="flex flex-wrap lg:flex-nowrap items-end justify-between gap-4">
                {/* Left Side: Role & Select */}
                <div className="flex gap-4 items-end flex-wrap w-full">
                  <div className="w-full lg:w-auto">
                    <label htmlFor="dean-filter-role" className={`block text-sm font-semibold mb-2 ${theme === "dark" ? "text-foreground" : "text-gray-700"}`}>
                      Role
                    </label>
                    <Select value={selectedRole} onValueChange={(value) => {
                      setSelectedRole(value);
                      setSelectedPersonId(null);
                      setIsPersonSelectOpen(true);
                    }}>
                      <SelectTrigger className={`w-full lg:w-[120px] ${theme === "dark" ? "bg-background border-border" : "bg-white border-gray-300"}`}>
                        <SelectValue placeholder="Select role" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="hod">{translateTerminology("HOD")}</SelectItem>
                        <SelectItem value="admin">Admin</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="w-full lg:w-auto">
                    <label htmlFor="dean-filter-person" className={`block text-sm font-semibold mb-2 ${theme === "dark" ? "text-foreground" : "text-gray-700"}`}>
                      Select
                    </label>
                    <Select disabled={!selectedRole} open={isPersonSelectOpen} onOpenChange={setIsPersonSelectOpen} value={selectedPersonId || ""} onValueChange={(value) => setSelectedPersonId(value || null)}>
                      <SelectTrigger className={`w-full lg:w-[180px] ${theme === "dark" ? "bg-background border-border" : "bg-white border-gray-300"}`}>
                        <SelectValue placeholder={!selectedRole ? "Select role first" : (selectedRole === "hod" ? "Select HOD" : "Select Admin")} />
                      </SelectTrigger>
                      <SelectContent>
                        {selectedRole === "hod" && hodList.map((h: any) => (
                          <SelectItem key={h.id} value={h.id}>
                            {h.name}
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
                  <label className={`text-sm font-semibold whitespace-nowrap ${theme === "dark" ? "text-foreground" : "text-gray-700"}`}>
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
                    disabled={!startDate && !endDate}
                    onClick={() => {
                      setStartDate("");
                      setEndDate("");
                    }}
                    className={`flex-1 flex items-center justify-center gap-1 text-sm font-medium px-3 py-1.5 rounded-md transition border disabled:opacity-50 disabled:cursor-not-allowed ${theme === 'dark' ? 'border-red-500 text-red-400 bg-red-500/10 hover:bg-red-500/20' : 'border-red-500 text-red-700 bg-red-50 hover:bg-red-100'}`}
                  >
                    <Trash2 className="w-4 h-4" />
                    Clear
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {isMonthly && (
            <div className={`mt-2 text-sm ${theme === "dark" ? "text-muted-foreground" : "text-gray-600"}`}>
              Showing data from {startDate} to {endDate} ({totalRangeDays} {totalRangeDays === 1 ? "day" : "days"})
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
                  <label htmlFor="modal-start-date" className={`block text-sm font-semibold mb-2 ${theme === "dark" ? "text-foreground" : "text-gray-700"}`}>
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
                  <label htmlFor="modal-end-date" className={`block text-sm font-semibold mb-2 ${theme === "dark" ? "text-foreground" : "text-gray-700"}`}>
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

          {selectedPersonId && selectedPersonSummary ? (
            <Card className={`mt-4 shadow ${theme === "dark" ? "bg-card border border-border" : "bg-white border border-gray-200"}`}>
              <CardContent className="p-4">
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
                  <div className="text-lg font-semibold">{selectedPersonSummary?.attendance_summary?.total_days ?? (isMonthly ? data.summary.period.total_days : "-")}</div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
                <div className={`p-4 rounded-lg border shadow-sm ${theme === 'dark' ? 'bg-blue-900/10 border-blue-900/20' : 'bg-blue-50 border-blue-100'}`}>
                  <div className={`text-xs font-semibold mb-1 ${theme === 'dark' ? 'text-blue-400' : 'text-blue-600'}`}>Weekly Hours</div>
                  <div className={`text-2xl font-semibold ${theme === 'dark' ? 'text-blue-100' : 'text-blue-900'}`}>{selectedPersonSummary?.total_weekly_hours ?? 0}</div>
                </div>
                <div className={`p-4 rounded-lg border shadow-sm ${theme === 'dark' ? 'bg-green-900/10 border-green-900/20' : 'bg-green-50 border-green-100'}`}>
                  <div className={`text-xs font-semibold mb-1 ${theme === 'dark' ? 'text-green-400' : 'text-green-600'}`}>Present Days</div>
                  <div className={`text-2xl font-semibold ${theme === 'dark' ? 'text-green-100' : 'text-green-900'}`}>{selectedPersonSummary?.attendance_summary?.present_days ?? 0}</div>
                </div>
                <div className={`p-4 rounded-lg border shadow-sm ${theme === 'dark' ? 'bg-red-900/10 border-red-900/20' : 'bg-red-50 border-red-100'}`}>
                  <div className={`text-xs font-semibold mb-1 ${theme === 'dark' ? 'text-red-400' : 'text-red-600'}`}>Absent Days</div>
                  <div className={`text-2xl font-semibold ${theme === 'dark' ? 'text-red-100' : 'text-red-900'}`}>{selectedPersonSummary?.attendance_summary?.absent_days ?? 0}</div>
                </div>
                <div className={`p-4 rounded-lg border shadow-sm ${theme === 'dark' ? 'bg-purple-900/10 border-purple-900/20' : 'bg-purple-50 border-purple-100'}`}>
                  <div className={`text-xs font-semibold mb-1 ${theme === 'dark' ? 'text-purple-400' : 'text-purple-600'}`}>Attendance %</div>
                  <div className={`text-2xl font-semibold ${theme === 'dark' ? 'text-purple-100' : 'text-purple-900'}`}>{selectedPersonSummary?.attendance_summary?.percent_present ?? "N/A"}</div>
                </div>
                <div className={`p-4 rounded-lg border shadow-sm ${theme === 'dark' ? 'bg-yellow-900/10 border-yellow-900/20' : 'bg-yellow-50 border-yellow-100'}`}>
                  <div className={`text-xs font-semibold mb-1 ${theme === 'dark' ? 'text-yellow-400' : 'text-yellow-600'}`}>Leave Days</div>
                  <div className={`text-2xl font-semibold ${theme === 'dark' ? 'text-yellow-100' : 'text-yellow-900'}`}>{selectedPersonSummary?.attendance_summary?.leave_days ?? 0}</div>
                </div>
                <div className={`p-4 rounded-lg border shadow-sm ${theme === 'dark' ? 'bg-amber-900/10 border-amber-900/20' : 'bg-amber-50 border-amber-100'}`}>
                  <div className={`text-xs font-semibold mb-1 ${theme === 'dark' ? 'text-amber-400' : 'text-amber-600'}`}>Unmarked Days</div>
                  <div className={`text-2xl font-semibold ${theme === 'dark' ? 'text-amber-100' : 'text-amber-900'}`}>{selectedPersonSummary?.attendance_summary?.unmarked_days ?? 0}</div>
                </div>
              </div>

              {/* Paginated Leaves Section */}
              {userTier >= 2 && selectedRole === "hod" && selectedPersonSummary?.leaves && (
                <div className="mt-6 border-t border-border pt-4">
                  <div className="text-md font-semibold mb-3">Leave History</div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                      <thead className={theme === 'dark' ? 'text-muted-foreground bg-muted' : 'text-gray-500 bg-gray-50'}>
                        <tr>
                          <th className="px-4 py-2 font-medium">Period</th>
                          <th className="px-4 py-2 font-medium">Status</th>
                          <th className="px-4 py-2 font-medium">Reason</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {selectedPersonSummary.leaves.length > 0 ? selectedPersonSummary.leaves.map((l: any) => (
                          <tr key={l.id} className={theme === 'dark' ? 'hover:bg-muted/50' : 'hover:bg-gray-50'}>
                            <td className="px-4 py-3">{l.start_date} to {l.end_date}</td>
                            <td className="px-4 py-3">
                              <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${l.status === 'APPROVED' ? 'bg-green-100 text-green-800' :
                                  l.status === 'REJECTED' ? 'bg-red-100 text-red-800' :
                                    'bg-yellow-100 text-yellow-800'
                                }`}>
                                {l.status}
                              </span>
                            </td>
                            <td className="px-4 py-3 max-w-[200px] truncate" title={l.reason}>{l.reason}</td>
                          </tr>
                        )) : (
                          <tr>
                            <td colSpan={3} className="px-4 py-6 text-center text-muted-foreground">No leave records found in this range.</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>

                </div>
              )}
              </CardContent>
              {userTier >= 2 && selectedRole === "hod" && selectedPersonSummary?.leaves && selectedPersonSummary.leaves_pagination?.total_pages > 1 && (
                <CardFooter className="flex flex-col sm:flex-row justify-between items-center gap-4 text-sm text-muted-foreground px-6 py-4 border-t border-border mt-auto w-full">
                  <div className={`text-xs font-medium ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}`}>
                    Showing Page {leavesPage} of {selectedPersonSummary.leaves_pagination.total_pages}
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={leavesPage === 1}
                      onClick={() => setLeavesPage(p => Math.max(1, p - 1))}
                      className="bg-primary hover:bg-primary/90 text-white border-primary h-9 px-4 transition-all"
                    >
                      Previous
                    </Button>
                    <div className="flex items-center justify-center min-w-[2rem]">
                      <span className={`text-sm font-semibold ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>
                        {leavesPage}
                      </span>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={leavesPage === selectedPersonSummary.leaves_pagination.total_pages}
                      onClick={() => setLeavesPage(p => p + 1)}
                      className="bg-primary hover:bg-primary/90 text-white border-primary h-9 px-4 transition-all"
                    >
                      Next
                    </Button>
                  </div>
                </CardFooter>
              )}
            </Card>
          ) : (
            <div className={`mt-4 flex flex-col items-center justify-center py-24 px-4 rounded-lg border-2 border-dashed ${theme === 'dark' ? 'border-border bg-card/30' : 'border-gray-200 bg-gray-50/50'}`}>
              <div className={`p-5 rounded-full mb-4 ${theme === 'dark' ? 'bg-primary/10' : 'bg-primary/5'}`}>
                <AlertCircle className="w-10 h-10 text-primary opacity-50" />
              </div>
              <h3 className={`text-lg font-semibold mb-2 ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>
                Select a {selectedRole === "hod" ? translateTerminology("HOD") : "Admin"} to View Report
              </h3>
              <p className={`text-center max-w-md ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}`}>
                Choose a specific {selectedRole === "hod" ? "Head of Department" : "Administrator"} from the dropdown above to generate their detailed attendance analysis and statistics.
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default DeanAttendanceFilters;
