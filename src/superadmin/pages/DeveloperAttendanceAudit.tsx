import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { getDeveloperAttendanceAudit } from "@/utils/admin_api";
import { toast } from "sonner";
import { useTheme } from "../../context/ThemeContext";
import { SkeletonTable } from "@/components/ui/skeleton";
import { CalendarIcon, Download, Eye, Filter, Users, Loader2, X, CheckCircle, XCircle, Clock, MapPin } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { API_ENDPOINT, getSuperAdminToken } from "@/utils/config";

interface AuditSummary {
  id: number;
  name: string;
  email: string;
  total_days: number;
  present: number;
  absent: number;
  attendance_percentage: number;
}

interface DetailRecord {
  id: number;
  date: string;
  status: string;
  marked_at: string | null;
  check_in_time: string | null;
  check_out_time: string | null;
  total_hours: string | null;
  notes: string;
  latitude: string | null;
  longitude: string | null;
  location: {
    inside: boolean | null;
    distance_meters: number | null;
    campus_name: string | null;
  } | null;
}

const DeveloperAttendanceAudit: React.FC = () => {
  const [records, setRecords] = useState<AuditSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [isStartPopoverOpen, setIsStartPopoverOpen] = useState(false);
  const [isEndPopoverOpen, setIsEndPopoverOpen] = useState(false);
  const [filtersApplied, setFiltersApplied] = useState(false);
  
  const [exportingPdf, setExportingPdf] = useState(false);

  // Detail dialog state
  const [selectedDev, setSelectedDev] = useState<AuditSummary | null>(null);
  const [detailRecords, setDetailRecords] = useState<DetailRecord[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  const { theme } = useTheme();

  const fetchRecords = async () => {
    if (!startDate || !endDate) {
      toast.error("Please select both start and end dates");
      return;
    }
    setLoading(true);
    setFiltersApplied(true);
    try {
      const response = await getDeveloperAttendanceAudit({
        start_date: startDate,
        end_date: endDate
      });
      if (response.success) {
        setRecords(response.data || []);
      } else {
        toast.error(response.message || "Failed to load audit records");
      }
    } catch (error) {
      toast.error("Network error while loading audit records");
    } finally {
      setLoading(false);
    }
  };

  const handleViewAttendance = async (dev: AuditSummary) => {
    setSelectedDev(dev);
    setIsDetailOpen(true);
    setDetailLoading(true);
    try {
      const response = await getDeveloperAttendanceAudit({
        start_date: startDate,
        end_date: endDate,
        developer_id: dev.id
      });
      if (response.success) {
        setDetailRecords(response.data || []);
      }
    } catch (error) {
      toast.error("Failed to load developer details");
    } finally {
      setDetailLoading(false);
    }
  };

  const handleExportPdf = async () => {
    setExportingPdf(true);
    try {
      const queryParams = new URLSearchParams();
      if (startDate) queryParams.append("start_date", startDate);
      if (endDate) queryParams.append("end_date", endDate);
      
      const response = await fetch(
        `${API_ENDPOINT}/superadmin/developers/attendance-audit/export-pdf/?${queryParams.toString()}`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${getSuperAdminToken()}`
          }
        }
      );
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `developer_attendance_audit_${new Date().toISOString().split('T')[0]}.pdf`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(url);
      } else {
        toast.error("Failed to download PDF");
      }
    } catch (e: any) {
      toast.error(e.message || "Failed to download PDF");
    } finally {
      setExportingPdf(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status.toLowerCase()) {
      case 'present':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
            <CheckCircle className="w-3 h-3" /> Present
          </span>
        );
      case 'absent':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400">
            <XCircle className="w-3 h-3" /> Absent
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300">
            <Clock className="w-3 h-3" /> {status}
          </span>
        );
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <Card>
        <CardHeader className="border-b border-border/50 flex flex-row items-start sm:items-center justify-between space-y-0">
          <div>
            <CardTitle className="text-xl sm:text-xl md:text-2xl font-semibold">Developer Attendance Audit</CardTitle>
            <CardDescription className="text-sm text-muted-foreground mt-1">
              Monitor attendance across all platform developers
            </CardDescription>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0 mt-1">
            <Button
              size="sm"
              onClick={handleExportPdf}
              disabled={loading || exportingPdf || !filtersApplied || records.length === 0}
              className="hidden sm:flex justify-center bg-primary text-white hover:bg-primary/90 transition-all shadow-md text-sm font-medium px-4 py-2 rounded-md items-center gap-2 h-9 disabled:opacity-50">
              <Download className="h-4 w-4 flex-shrink-0" />
              <span>{exportingPdf ? "Exporting..." : "Export PDF"}</span>
            </Button>
            <Button
              onClick={handleExportPdf}
              disabled={loading || exportingPdf || !filtersApplied || records.length === 0}
              size="icon"
              variant="outline"
              className="flex sm:hidden h-10 w-10 items-center justify-center shrink-0 border border-input bg-background"
              title="Export PDF"
            >
              <Download className="w-4 h-4" />
            </Button>
          </div>
        </CardHeader>

        <CardContent className="p-6 pb-4">
          {/* Filters Section */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end bg-muted/10 p-2 rounded-2xl border border-border/50">
            <div className="space-y-2">
              <Label className="sm:text-[13px] text-[15px] font-semibold uppercase tracking-[0.1em] ml-1">Start Date <span className="text-red-500">*</span></Label>
              <Popover open={isStartPopoverOpen} onOpenChange={setIsStartPopoverOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal bg-background rounded-xl border-border/50 h-11",
                      !startDate && "text-muted-foreground"
                    )}>
                    <CalendarIcon className="mr-2 h-4 w-4 text-primary" />
                    {startDate ? format(new Date(startDate), "PPP") : <span>Pick a date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 rounded-2xl shadow-2xl border-none" align="start">
                  <Calendar
                    mode="single"
                    selected={startDate ? new Date(startDate) : undefined}
                    onSelect={(date) => {
                      if (date) {
                        setStartDate(date.toLocaleDateString('sv-SE'));
                        setIsStartPopoverOpen(false);
                        setTimeout(() => setIsEndPopoverOpen(true), 100);
                      }
                    }}
                    disabled={(date) => {
                      const today = new Date();
                      today.setHours(23, 59, 59, 999);
                      if (date > today) return true;
                      if (endDate) {
                        const end = new Date(endDate + 'T00:00:00');
                        return date > end;
                      }
                      return false;
                    }}
                    initialFocus
                    className="rounded-2xl" />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label className="sm:text-[13px] text-[15px] font-semibold uppercase tracking-[0.1em] ml-1">End Date <span className="text-red-500">*</span></Label>
              <Popover open={isEndPopoverOpen} onOpenChange={setIsEndPopoverOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal bg-background rounded-xl border-border/50 h-11",
                      !endDate && "text-muted-foreground"
                    )}>
                    <CalendarIcon className="mr-2 h-4 w-4 text-primary" />
                    {endDate ? format(new Date(endDate), "PPP") : <span>Pick a date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 rounded-2xl shadow-2xl border-none" align="start">
                  <Calendar
                    mode="single"
                    selected={endDate ? new Date(endDate) : undefined}
                    onSelect={(date) => {
                      if (date) {
                        setEndDate(date.toLocaleDateString('sv-SE'));
                        setIsEndPopoverOpen(false);
                        // Auto-fetch after both dates are selected
                        setTimeout(() => {
                          setLoading(true);
                          setFiltersApplied(true);
                          getDeveloperAttendanceAudit({
                            start_date: startDate,
                            end_date: date.toLocaleDateString('sv-SE')
                          }).then(response => {
                            if (response.success) setRecords(response.data || []);
                          }).finally(() => setLoading(false));
                        }, 50);
                      }
                    }}
                    disabled={(date) => {
                      const today = new Date();
                      today.setHours(23, 59, 59, 999);
                      if (date > today) return true;
                      if (startDate) {
                        const start = new Date(startDate + 'T00:00:00');
                        return date < start;
                      }
                      return false;
                    }}
                    initialFocus
                    className="rounded-2xl" />
                </PopoverContent>
              </Popover>
            </div>
          </div>
        </CardContent>

        <CardContent className="p-6 pt-4">
          {/* Table Section */}
          <div className="rounded-xl border border-border/50 overflow-x-auto bg-card/30 backdrop-blur-md custom-scrollbar">
            <Table>
              <TableHeader className="bg-muted/40 whitespace-nowrap">
                <TableRow className="hover:bg-transparent border-b border-border/50">
                  <TableHead className="px-6 py-4 text-sm sm:text-[14px] font-semibold uppercase tracking-wider">Developer</TableHead>
                  <TableHead className="px-6 py-4 text-center text-sm sm:text-[14px] font-semibold uppercase tracking-wider">Total Days</TableHead>
                  <TableHead className="px-6 py-4 text-center text-sm sm:text-[14px] font-semibold uppercase tracking-wider text-green-600">Present</TableHead>
                  <TableHead className="px-6 py-4 text-center text-sm sm:text-[14px] font-semibold uppercase tracking-wider text-red-600">Absent</TableHead>
                  <TableHead className="px-6 py-4 text-center text-sm sm:text-[14px] font-semibold uppercase tracking-wider">Percentage</TableHead>
                  <TableHead className="px-6 py-4 text-right pr-6 text-sm sm:text-[14px] font-semibold uppercase tracking-wider">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ?
                  <TableRow>
                    <TableCell colSpan={6} className="p-0">
                      <SkeletonTable rows={5} cols={6} />
                    </TableCell>
                  </TableRow> :
                  records.length > 0 ?
                    records.map((item) => (
                      <TableRow key={item.id} className="hover:bg-primary/5 transition-all duration-200 border-b border-border/50">
                        <TableCell className="py-5 px-6">
                          <div className="font-semibold text-sm sm:text-base text-foreground">{item.name}</div>
                          <div className="text-xs text-muted-foreground mt-0.5">{item.email}</div>
                        </TableCell>
                        <TableCell className="text-center font-mono font-semibold text-sm">{item.total_days}</TableCell>
                        <TableCell className="text-center">
                          <div className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-green-100 dark:bg-green-900/30 text-green-600 font-semibold text-sm">
                            {item.present}
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-red-100 dark:bg-red-900/30 text-red-600 font-semibold text-sm">
                            {item.absent}
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="flex flex-col items-center gap-1">
                            <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">{item.attendance_percentage}%</div>
                            <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
                              <div
                                className={cn(
                                  "h-full rounded-full transition-all duration-1000",
                                  item.attendance_percentage >= 75 ? "bg-green-500" :
                                    item.attendance_percentage >= 50 ? "bg-yellow-500" : "bg-red-500"
                                )}
                                style={{ width: `${item.attendance_percentage}%` }} />
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-right pr-6">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-9 w-9 rounded-full hover:bg-primary/10 hover:text-primary transition-all active:scale-95"
                            title="View Full Report"
                            onClick={() => handleViewAttendance(item)}>
                            <Eye className="h-4.5 w-4.5" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    )) :
                    !startDate || !endDate || !filtersApplied ?
                      <TableRow>
                        <TableCell colSpan={6} className="h-72 text-center">
                          <div className="flex flex-col items-center justify-center space-y-3 opacity-60">
                            <div className="bg-primary/10 p-4 rounded-full">
                              <Filter className="h-8 w-8 text-primary" />
                            </div>
                            <div className="space-y-1">
                              <p className="text-sm font-semibold uppercase tracking-widest">Filters Required</p>
                              <p className="text-xs text-muted-foreground">Please select a Date Range to generate the audit report</p>
                            </div>
                          </div>
                        </TableCell>
                      </TableRow> :
                      <TableRow>
                        <TableCell colSpan={6} className="h-72 text-center">
                          <div className="flex flex-col items-center justify-center space-y-3 opacity-60">
                            <div className="bg-muted p-4 rounded-full">
                              <Users className="h-8 w-8 text-muted-foreground" />
                            </div>
                            <div className="space-y-1">
                              <p className="text-sm font-semibold uppercase tracking-widest">No Records Found</p>
                              <p className="text-xs text-muted-foreground">No developer attendance data for the selected period</p>
                            </div>
                          </div>
                        </TableCell>
                      </TableRow>
                }
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Detail Dialog */}
      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="w-[95%] sm:max-w-2xl max-h-[90vh] bg-card rounded-2xl border-none shadow-2xl p-0 overflow-hidden mx-auto flex flex-col">
          <DialogHeader className="p-5 sm:p-6 bg-muted/20 border-b shrink-0 text-left">
            <DialogTitle className="text-lg sm:text-xl font-semibold flex items-center gap-2">
              <CalendarIcon className="h-5 w-5 text-primary" />
              Attendance History
            </DialogTitle>
            <DialogDescription className="text-xs sm:text-sm font-medium mt-1">
              Detail view for <span className="text-foreground font-semibold">{selectedDev?.name}</span>
              {startDate && endDate && (
                <span className="text-muted-foreground"> · {format(new Date(startDate), "MMM d")} – {format(new Date(endDate), "MMM d, yyyy")}</span>
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="p-5 sm:p-6 pt-4 flex-1 overflow-y-auto custom-scrollbar">
            {detailLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-12 w-full rounded-xl" />
                <Skeleton className="h-12 w-full rounded-xl" />
                <Skeleton className="h-12 w-full rounded-xl" />
                <Skeleton className="h-12 w-full rounded-xl" />
              </div>
            ) : detailRecords.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <CalendarIcon className="w-10 h-10 mx-auto mb-3 opacity-40" />
                <p className="text-sm font-medium">No records for this period</p>
              </div>
            ) : (
              <div className="space-y-2">
                {detailRecords.map((rec) => (
                  <div
                    key={rec.id}
                    className={cn(
                      "flex items-center justify-between p-3 rounded-xl border transition-all",
                      rec.status === 'present'
                        ? "border-green-200 dark:border-green-900/30 bg-green-50/50 dark:bg-green-900/10"
                        : rec.status === 'absent'
                          ? "border-red-200 dark:border-red-900/30 bg-red-50/50 dark:bg-red-900/10"
                          : "border-border/50 bg-muted/10"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold",
                        rec.status === 'present'
                          ? "bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-400"
                          : "bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-400"
                      )}>
                        {new Date(rec.date + 'T00:00:00').toLocaleDateString('en-US', { day: '2-digit' })}
                      </div>
                      <div>
                        <div className="text-sm font-semibold">
                          {new Date(rec.date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                        </div>
                        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground mt-0.5">
                          {rec.status === 'absent' ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400">
                              Absent
                            </span>
                          ) : rec.location ? (
                            <span className={cn(
                              "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium",
                              rec.location.inside
                                ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                                : "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400"
                            )}>
                              {rec.location.inside ? "On campus" : "Outside campus"}
                              {rec.location.distance_meters !== null && (
                                <> • {Math.round(rec.location.distance_meters)} m</>
                              )}
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300">
                              Location not recorded
                            </span>
                          )}
                          {rec.check_in_time && (
                            <span>In: {rec.check_in_time}</span>
                          )}
                          {rec.check_out_time && (
                            <span>Out: {rec.check_out_time}</span>
                          )}
                          {rec.total_hours && (
                            <span className="font-medium">{parseFloat(rec.total_hours).toFixed(1)} hrs</span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {rec.latitude && rec.longitude && (
                        <a
                          href={`https://maps.google.com/?q=${rec.latitude},${rec.longitude}`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-primary hover:text-primary/80 transition-colors"
                          title="View on Map"
                        >
                          <MapPin className="w-4 h-4" />
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default DeveloperAttendanceAudit;