import { translateTerminology, getTerm } from "@/utils/institutionConfig";
import { useEffect, useMemo, useState } from "react";
import { API_ENDPOINT } from "@/utils/config";
import { fetchWithTokenRefresh } from "@/utils/authService";
import { downloadFile } from "@/utils/downloadHelper";
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
import { Calendar, Trash2, ChevronDown, AlertCircle, Filter, FileDown, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { SkeletonStatsGrid, SkeletonPageHeader, SkeletonCard } from "../ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle, CardFooter, CardDescription } from "../ui/card";
import { Alert, AlertDescription, AlertTitle } from "../ui/alert";

const DeanAttendanceFilters = () => {
  const { theme } = useTheme();
  const { user } = useAuth();
  const userTier = user?.organization?.plan?.tier || 1;
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<any>(null);
  const [startDate, setStartDate] = useState<string>(
    format(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd')
  );
  const [endDate, setEndDate] = useState<string>(
    format(new Date(), 'yyyy-MM-dd')
  );
  const [selectedRole, setSelectedRole] = useState<string>("");
  const [selectedPersonId, setSelectedPersonId] = useState<string | null>(null);
  const [selectedPersonSummary, setSelectedPersonSummary] = useState<any>(null);
  const [isDateModalOpen, setIsDateModalOpen] = useState(false);
  const [startDatePopoverOpen, setStartDatePopoverOpen] = useState(false);
  const [endDatePopoverOpen, setEndDatePopoverOpen] = useState(false);
  const [leavesPage, setLeavesPage] = useState(1);
  const [isPersonSelectOpen, setIsPersonSelectOpen] = useState(false);
  const [viewingPerson, setViewingPerson] = useState<any>(null);
  const [isDetailLoading, setIsDetailLoading] = useState(false);
  const [exportingPDF, setExportingPDF] = useState(false);


  const fetchData = async () => {
    setLoading(true);
    try {
      let url = `${API_ENDPOINT}/dean/reports/hod-admin-attendance/?names_only=false`;
      const defaultStart = format(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd');
      const defaultEnd = format(new Date(), 'yyyy-MM-dd');
      url += `&start_date=${startDate || defaultStart}&end_date=${endDate || defaultEnd}`;
      url += `&hod_page_size=100&admin_page_size=100`;

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
  }, [startDate, endDate]);

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
    fetchData();
  };

  const getStatsForPerson = (person: any) => {
    let totalDays = totalRangeDays || 1;
    let presentDays = 0;
    let absentDays = totalDays;

    if (person.total_days !== undefined) {
      totalDays = person.total_days;
      presentDays = person.present_days ?? 0;
      absentDays = person.absent_days ?? 0;
    } else {
      if (person.date_joined && startDate && endDate) {
        const joinDate = new Date(person.date_joined);
        const start = new Date(startDate);
        const end = new Date(endDate);
        const effectiveStart = joinDate > start ? joinDate : start;
        if (end >= effectiveStart) {
          const diffTime = Math.abs(end.getTime() - effectiveStart.getTime());
          totalDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
        } else {
          totalDays = 0;
        }
      }

      if (person.is_present !== undefined) {
        presentDays = person.is_present ? 1 : 0;
        absentDays = Math.max(0, totalDays - presentDays);
      } else if (person.status !== undefined) {
        presentDays = person.status === 'present' ? 1 : 0;
        absentDays = person.status === 'present' ? 0 : 1;
      }
    }

    const attendancePercent = totalDays ? ((presentDays / totalDays) * 100).toFixed(1) : "0.0";

    return {
      totalDays,
      presentDays,
      absentDays,
      attendancePercent: `${attendancePercent}%`
    };
  };

  const handleExportReport = async () => {
    setExportingPDF(true);
    try {
      const params = new URLSearchParams();
      params.append("start_date", startDate);
      params.append("end_date", endDate);
      params.append("role", selectedRole);
      params.append("person_id", selectedPersonId || "all");

      const url = `${API_ENDPOINT}/dean/reports/hod-admin-attendance/export-pdf/?${params.toString()}`;
      await downloadFile(url, `${selectedRole.toUpperCase()}_Attendance_Report.pdf`);
    } catch (e: any) {
      console.error("Failed to export PDF:", e);
    } finally {
      setExportingPDF(false);
    }
  };

  useEffect(() => {
    const loadPerson = async () => {
      setSelectedPersonSummary(null);
      const activePersonId = viewingPerson ? viewingPerson.id : selectedPersonId;
      if (!activePersonId || activePersonId === "all") return;
      setIsDetailLoading(true);

      try {
        let url = `${API_ENDPOINT}/dean/faculty/${activePersonId}/profile/`;
        const params = new URLSearchParams();
        params.append("compact", "false");
        params.append("page", String(leavesPage));
        const todayStr = new Date().toLocaleDateString('sv-SE');
        params.append("start_date", startDate || todayStr);
        params.append("end_date", endDate || todayStr);
        url += `?${params.toString()}`;

        const res = await fetchWithTokenRefresh(url);
        const json = await res.json();
        if (json.success) {
          const profile = json.data || json.profile || null;
          setSelectedPersonSummary(profile);
        }
      } catch {
        // Keep this page resilient; main error handling is in fetchData.
      } finally {
        setIsDetailLoading(false);
      }
    };

    loadPerson();
  }, [selectedPersonId, viewingPerson, selectedRole, startDate, endDate, adminList, totalRangeDays, isMonthly, leavesPage]);


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
      {loading && !data ? (
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
          <Card id="dean-attendance-filters-card" className={`${theme === 'dark' ? 'bg-card text-foreground' : 'bg-white text-gray-900'} w-full max-w-full flex flex-col mb-4 ${loading ? 'opacity-70 pointer-events-none' : ''}`}>
            <CardHeader id="dean-attendance-filters-card-header" className="border-b border-border/50 flex flex-row items-center justify-between space-y-0">
              <div>
                <CardTitle>Attendance Filters</CardTitle>
                <CardDescription className="text-[16px] sm:text-sm text-muted-foreground mt-1">
                  Filter and analyze attendance data historically by date and role
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                {(() => {
                  const defaultStart = format(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd');
                  const defaultEnd = format(new Date(), 'yyyy-MM-dd');
                  const isDateFiltered = startDate !== defaultStart || endDate !== defaultEnd;
                  return isDateFiltered && (
                    <Button
                      variant="outline"
                      onClick={() => {
                        setStartDate(defaultStart);
                        setEndDate(defaultEnd);
                      }}
                      className="flex items-center justify-center transition-all duration-200 ease-in-out h-9 px-3 rounded-lg border-red-200 text-red-500 hover:bg-red-50 dark:border-red-950/30 dark:text-red-400 dark:hover:bg-red-950/20"
                    >
                      <Trash2 className="w-4 h-4" />
                      <span className="hidden sm:inline ml-1.5 text-sm">Clear Filter</span>
                    </Button>
                  );
                })()}
                <Button
                  onClick={() => setIsDateModalOpen(true)}
                  disabled={!selectedRole || !selectedPersonId}
                  className="flex items-center justify-center transition-all duration-200 ease-in-out shadow-md h-9 w-9 sm:h-9 sm:w-auto sm:px-3 rounded-lg bg-primary text-white border-primary hover:bg-primary/90 hover:border-primary/90 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Filter className="w-4 h-4" />
                  <span className="hidden sm:inline ml-1.5 text-sm">Filter</span>
                </Button>
              </div>
            </CardHeader>
            <CardContent className="pb-4">
              <div className="flex flex-wrap lg:flex-nowrap items-end justify-between gap-4">
                {/* Left Side: Role & Select */}
                <div className="flex gap-4 items-end flex-wrap w-full">
                  <div className="w-full sm:flex-1">
                    <label htmlFor="dean-filter-role" className={`block text-sm font-semibold mb-2 ${theme === "dark" ? "text-foreground" : "text-gray-700"}`}>
                      Role
                    </label>
                    <Select value={selectedRole} onValueChange={(value) => {
                      setSelectedRole(value);
                      setSelectedPersonId(null);
                      setIsPersonSelectOpen(true);
                      setStartDate(format(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd'));
                      setEndDate(format(new Date(), 'yyyy-MM-dd'));
                    }}>
                      <SelectTrigger className={`w-full ${theme === "dark" ? "bg-background border-border" : "bg-white border-gray-300"}`}>
                        <SelectValue placeholder="Select role" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="hod">{translateTerminology("HOD")}</SelectItem>
                        <SelectItem value="admin">Admin</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="w-full sm:flex-1">
                    <label htmlFor="dean-filter-person" className={`block text-sm font-semibold mb-2 ${theme === "dark" ? "text-foreground" : "text-gray-700"}`}>
                      Select
                    </label>
                    <Select disabled={!selectedRole} open={isPersonSelectOpen} onOpenChange={setIsPersonSelectOpen} value={selectedPersonId || ""} onValueChange={(value) => setSelectedPersonId(value)}>
                      <SelectTrigger className={`w-full ${theme === "dark" ? "bg-background border-border" : "bg-white border-gray-300"}`}>
                        <SelectValue placeholder={!selectedRole ? "Select role first" : (selectedRole === "hod" ? "Select HOD" : "Select Admin")} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All {selectedRole === "hod" ? translateTerminology("HODs") : "Admins"}</SelectItem>
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
              </div>
            </CardContent>
          </Card>

          <Dialog open={isDateModalOpen} onOpenChange={setIsDateModalOpen}>
            <DialogContent
              onPointerDownOutside={(e) => e.preventDefault()}
              onInteractOutside={(e) => e.preventDefault()}
              className={`w-[90%] sm:max-w-md rounded-2xl ${theme === "dark" ? "bg-card border-border" : "bg-white border-gray-200"}`}
            >
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
                  <Popover modal={false} open={startDatePopoverOpen} onOpenChange={setStartDatePopoverOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !startDate && "text-muted-foreground",
                          theme === "dark" ? "bg-background border-border text-foreground" : "bg-white border-gray-300"
                        )}
                      >
                        <Calendar className="mr-2 h-4 w-4" />
                        {startDate ? format(new Date(startDate), "MMM dd, yyyy") : "Pick a date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent align="center" className={`w-auto p-0 ${theme === "dark" ? "bg-card border-border" : "bg-white"}`}>
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
                        disabled={(date) => {
                          const today = new Date();
                          today.setHours(23, 59, 59, 999);
                          const end = endDate ? new Date(endDate) : null;
                          if (end) {
                            // Ensure start date cannot exceed end date
                            end.setHours(0, 0, 0, 0);
                            return date > end || date > today;
                          }
                          return date > today;
                        }}
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                <div>
                  <label htmlFor="modal-end-date" className={`block text-sm font-semibold mb-2 ${theme === "dark" ? "text-foreground" : "text-gray-700"}`}>
                    End Date
                  </label>
                  <Popover modal={false} open={endDatePopoverOpen} onOpenChange={setEndDatePopoverOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !endDate && "text-muted-foreground",
                          theme === "dark" ? "bg-background border-border text-foreground" : "bg-white border-gray-300"
                        )}
                      >
                        <Calendar className="mr-2 h-4 w-4" />
                        {endDate ? format(new Date(endDate), "MMM dd, yyyy") : "Pick a date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent align="center" className={`w-auto p-0 ${theme === "dark" ? "bg-card border-border" : "bg-white"}`}>
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
                        disabled={(date) => {
                          const today = new Date();
                          today.setHours(23, 59, 59, 999);
                          const start = startDate ? new Date(startDate) : null;
                          if (start) {
                            // Ensure end date cannot precede start date
                            start.setHours(0, 0, 0, 0);
                            return date < start || date > today;
                          }
                          return date > today;
                        }}
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>

              <DialogFooter className="flex flex-row justify-end items-center gap-2">
                {(() => {
                  const defaultStart = format(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd');
                  const defaultEnd = format(new Date(), 'yyyy-MM-dd');
                  const isDateFiltered = startDate !== defaultStart || endDate !== defaultEnd;
                  return isDateFiltered && (
                    <Button
                      variant="ghost"
                      onClick={() => {
                        setStartDate(defaultStart);
                        setEndDate(defaultEnd);
                        setIsDateModalOpen(false);
                      }}
                      className="text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20 mr-auto text-sm font-semibold h-9 px-3"
                    >
                      Clear Filter
                    </Button>
                  );
                })()}
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

          {selectedRole && selectedPersonId ? (
            <Card className={`mt-4 shadow ${theme === "dark" ? "bg-card border border-border" : "bg-white border border-gray-200"} overflow-hidden`}>
              <CardHeader className="px-6 py-4 border-b border-border flex flex-row justify-between items-center gap-4">
                <CardTitle className={`text-lg font-semibold ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>
                  {selectedRole === "hod" ? translateTerminology("HOD") : "Admin"} Attendance Summary
                </CardTitle>
                <div className="flex items-center gap-2 shrink-0">
                  {/* Mobile Export PDF Icon Button */}
                  <Button
                    onClick={handleExportReport}
                    disabled={exportingPDF}
                    size="icon"
                    variant="outline"
                    className="flex sm:hidden h-10 w-10 items-center justify-center border border-input bg-background"
                  >
                    {exportingPDF ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileDown className="w-4 h-4" />}
                  </Button>

                  {/* Desktop Export PDF Button */}
                  <button
                    onClick={handleExportReport}
                    disabled={exportingPDF}
                    className="hidden sm:flex items-center justify-center gap-2 px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90 transition-all shadow-md text-xs sm:text-sm font-medium disabled:opacity-50"
                  >
                    {exportingPDF ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                        <span>Downloading...</span>
                      </>
                    ) : (
                      <>
                        <FileDown className="w-4 h-4" />
                        <span>Export PDF</span>
                      </>
                    )}
                  </button>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className={`sticky top-0 whitespace-nowrap ${theme === 'dark' ? 'bg-card' : 'bg-gray-50'}`}>
                      <tr className={`border-b ${theme === 'dark' ? 'border-border' : 'border-gray-200'}`}>
                        <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}`}>
                          {selectedRole === "hod" ? translateTerminology("HOD") : "Admin"}
                        </th>
                        <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}`}>Total Days</th>
                        <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}`}>Present</th>
                        <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}`}>Absent</th>
                        <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}`}>Attendance %</th>
                        <th className={`px-6 py-3 text-right text-xs font-medium uppercase tracking-wider ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}`}>Actions</th>
                      </tr>
                    </thead>
                    <tbody className={`divide-y ${theme === 'dark' ? 'divide-border' : 'divide-gray-200'}`}>
                      {(selectedRole === "hod" ? hodList : adminList)
                        .filter((person: any) => selectedPersonId === "all" || String(person.id) === String(selectedPersonId))
                        .map((person: any) => {
                          const stats = getStatsForPerson(person);
                          return (
                            <tr key={person.id} className={`hover:${theme === 'dark' ? 'bg-accent' : 'bg-gray-50'} ${selectedPersonId === person.id ? (theme === 'dark' ? 'bg-accent/50' : 'bg-blue-50') : ''}`}>
                              <td className={`px-6 py-4 whitespace-nowrap font-medium ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>
                                <div>{person.name}</div>
                                <div className={`text-xs ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}`}>
                                  {person.branch || person.email || person.mobile}
                                </div>
                              </td>
                              <td className={`px-6 py-4 whitespace-nowrap ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>
                                {stats.totalDays}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-green-600 font-medium">
                                {stats.presentDays}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-red-600 font-medium">
                                {stats.absentDays}
                              </td>
                              <td className={`px-6 py-4 whitespace-nowrap font-semibold ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>
                                {stats.attendancePercent}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-right">
                                <Button
                                  size="sm"
                                  onClick={() => {
                                    setViewingPerson(person);
                                  }}
                                  className="bg-primary hover:bg-primary/90 text-white font-medium rounded-lg h-8 px-4"
                                >
                                  View
                                </Button>
                              </td>
                            </tr>
                          );
                        })}
                    </tbody>
                  </table>
                </div>

                {/* Paginated Leaves Section */}
                {userTier >= 2 && selectedRole === "hod" && selectedPersonSummary?.leaves && (
                  <div className="p-6 border-t border-border">
                    <div className="text-md font-semibold mb-3">Leave History for {selectedPersonSummary?.first_name} {selectedPersonSummary?.last_name}</div>
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
                Select a Role to View Report
              </h3>
              <p className={`text-center max-w-md ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}`}>
                Choose a specific role from the dropdown above to generate the detailed attendance analysis and statistics.
              </p>
            </div>
          )}
        </>
      )}

      {/* Attendance Details Modal */}
      <Dialog open={!!viewingPerson} onOpenChange={(open) => !open && setViewingPerson(null)}>
        <DialogContent className={`max-w-xl max-h-[80vh] overflow-y-auto custom-scrollbar rounded-xl w-[90%] ${theme === 'dark' ? 'bg-slate-950 border-white/10' : 'bg-white'}`}>
          <DialogHeader className="pb-4 border-b border-border/50">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pr-8 sm:pr-10">
              <div>
                <DialogTitle className="text-lg font-semibold">
                  {viewingPerson?.name}'s Attendance
                </DialogTitle>
                <p className={`text-sm mt-1 font-medium ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}`}>
                  {startDate && endDate ? `${startDate} — ${endDate}` : "Today"}
                </p>
              </div>
              <div className="flex items-center gap-4 bg-muted/50 p-3 rounded-xl border border-border/50">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.4)]"></div>
                  <span className="text-[10px] font-bold uppercase tracking-widest opacity-80">Present</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.4)]"></div>
                  <span className="text-[10px] font-bold uppercase tracking-widest opacity-80">Absent</span>
                </div>
              </div>
            </div>
          </DialogHeader>

          <div className={`p-4 sm:p-6 rounded-2xl transition-all duration-300 ${theme === 'dark' ? 'bg-muted/20 border border-white/5' : 'bg-gray-50 border border-gray-100'}`}>
            {isDetailLoading ? (
              <div className="flex flex-col items-center justify-center py-20 gap-3">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div>
                <p className="text-sm font-semibold animate-pulse text-muted-foreground">Syncing attendance data...</p>
              </div>
            ) : (
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-7 xl:grid-cols-8 gap-3 sm:gap-4">
                {(() => {
                  const end = endDate ? new Date(endDate) : new Date();
                  const start = startDate ? new Date(startDate) : new Date();
                  if (!startDate) {
                    start.setDate(end.getDate() - 29);
                  }

                  // Cap start date by joining date (date_joined)
                  const joinDateStr = selectedPersonSummary?.date_joined || viewingPerson?.date_joined;
                  if (joinDateStr) {
                    const joinDate = new Date(joinDateStr);
                    joinDate.setHours(0, 0, 0, 0);
                    if (start < joinDate) {
                      start.setTime(joinDate.getTime());
                    }
                  }

                  const todayStr = new Date().toLocaleDateString('sv-SE');
                  const days = [];
                  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
                    days.push(new Date(d));
                  }

                  return days.map((date) => {
                    const dateStr = date.toLocaleDateString('sv-SE');

                    let isPresent = false;
                    let isAbsent = false;
                    let statusLabel = "";

                    const record = selectedPersonSummary?.attendance?.find((r: any) => r.date === dateStr);
                    if (record) {
                      isPresent = record.status?.toLowerCase() === 'present';
                      isAbsent = record.status?.toLowerCase() === 'absent';
                      statusLabel = record.status[0].toUpperCase();
                    } else {
                      const hasAnyCheckIns = selectedPersonSummary?.attendance?.length > 0;
                      if (selectedRole === "admin" && !hasAnyCheckIns) {
                        const adminLastLoginStr = viewingPerson?.last_login ? new Date(viewingPerson.last_login).toLocaleDateString('sv-SE') : "";
                        isPresent = adminLastLoginStr === dateStr;
                        isAbsent = !isPresent && dateStr <= todayStr;
                        statusLabel = isPresent ? "P" : "A";
                      } else {
                        isAbsent = dateStr <= todayStr;
                        statusLabel = "A";
                      }
                    }

                    return (
                      <div
                        key={dateStr}
                        className={`relative group p-4 rounded-2xl border flex flex-col items-center justify-center transition-all duration-300 hover:scale-105 hover:shadow-md ${isPresent
                          ? 'bg-green-500/10 border-green-500/30 text-green-600'
                          : isAbsent
                            ? 'bg-red-500/10 border-red-500/30 text-red-600'
                            : theme === 'dark'
                              ? 'bg-white/5 border-white/5 text-muted-foreground/30'
                              : 'bg-gray-100 border-gray-200 text-gray-300'
                          }`}
                      >
                        <span className="text-[10px] font-black uppercase tracking-wider mb-1 opacity-60">
                          {date.toLocaleDateString('en-US', { weekday: 'short' })}
                        </span>
                        <span className="text-xl font-black leading-tight">{date.getDate()}</span>
                        <span className="text-[10px] font-bold uppercase tracking-widest opacity-60">
                          {date.toLocaleDateString('en-US', { month: 'short' })}
                        </span>

                        <div className={`mt-2 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-tighter ${isPresent ? 'bg-green-500 text-white shadow-[0_0_10px_rgba(34,197,94,0.3)]' : 'bg-red-500 text-white shadow-[0_0_10px_rgba(239,68,68,0.3)]'}`}>
                          {statusLabel}
                        </div>

                        <div className="absolute -top-12 left-1/2 -translate-x-1/2 px-3 py-2 bg-slate-900 text-white text-[10px] rounded-xl opacity-0 group-hover:opacity-100 transition-all duration-200 pointer-events-none whitespace-nowrap z-50 shadow-xl border border-white/10 scale-90 group-hover:scale-100">
                          <div className="font-bold">{date.toLocaleDateString('en-US', { dateStyle: 'medium' })}</div>
                          <div className={`${isPresent ? 'text-green-300' : 'text-red-300'} mt-1`}>
                            {isPresent ? "Present" : "Absent"}
                          </div>
                        </div>
                      </div>
                    );
                  });
                })()}
              </div>
            )}
          </div>

          <DialogFooter className="flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-border/30 pt-6">
            <div className="text-[11px] text-muted-foreground italic font-medium">
              Note: "A" indicates auto-marked absence.
            </div>
            <Button onClick={() => setViewingPerson(null)} className="rounded-xl px-8 bg-primary text-white hover:bg-primary/90">Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default DeanAttendanceFilters;
