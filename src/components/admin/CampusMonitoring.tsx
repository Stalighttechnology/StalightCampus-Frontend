import React, { useState, useEffect } from "react";
import { useAuth } from "../../context/AuthContext";
import { fetchWithTokenRefresh } from "../../utils/authService";
import { API_ENDPOINT } from "../../utils/config";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "../ui/card";
import { Button } from "../ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "../ui/pagination";
import { MapPin, Clock, AlertTriangle, ShieldAlert, FileText, Search, Play, Square, Loader2 } from "lucide-react";
import Swal from "sweetalert2";

export default function CampusMonitoring() {
  const { theme } = useAuth();
  const [activeSession, setActiveSession] = useState<any>(null);
  const [liveAlerts, setLiveAlerts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  
  // Start form
  const [intervalMinutes, setIntervalMinutes] = useState("45");
  
  // Reports
  const [reports, setReports] = useState<any[]>([]);
  const [reportLoading, setReportLoading] = useState(false);
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return d.toISOString().split("T")[0];
  });
  const [endDate, setEndDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const fetchActiveSession = async () => {
    try {
      setLoading(true);
      const res = await fetchWithTokenRefresh(`${API_ENDPOINT}/admin/monitoring/active/`);
      const data = await res.json();
      if (data.success) {
        if (data.active) {
          setActiveSession(data.session);
          setLiveAlerts(data.alerts || []);
        } else {
          setActiveSession(null);
          setLiveAlerts([]);
        }
      }
    } catch (err) {
      console.error("Failed to fetch active session", err);
    } finally {
      setLoading(false);
    }
  };

  const startSession = async () => {
    if (!intervalMinutes) return;
    try {
      setStarting(true);
      const res = await fetchWithTokenRefresh(`${API_ENDPOINT}/admin/monitoring/start/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ interval_minutes: intervalMinutes })
      });
      const data = await res.json();
      if (data.success) {
        setActiveSession(data.session);
        setLiveAlerts([]);
      } else {
        alert(data.message || "Failed to start session");
      }
    } catch (err: any) {
      console.error("Failed to start session", err);
      alert("Failed to start session");
    } finally {
      setStarting(false);
    }
  };

  const stopSession = async () => {
    const result = await Swal.fire({
      title: 'Stop Monitoring?',
      text: "Are you sure you want to stop the monitoring session?",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Yes, stop it'
    });
    
    if (!result.isConfirmed) return;
    try {
      const res = await fetchWithTokenRefresh(`${API_ENDPOINT}/admin/monitoring/stop/`, {
        method: "POST"
      });
      const data = await res.json();
      if (data.success) {
        setActiveSession(null);
      }
    } catch (err) {
      console.error("Failed to stop session", err);
    }
  };

  const fetchReports = async (p = 1) => {
    try {
      setReportLoading(true);
      const res = await fetchWithTokenRefresh(`${API_ENDPOINT}/admin/monitoring/reports/?start_date=${startDate}&end_date=${endDate}&page=${p}`);
      const data = await res.json();
      if (data.success) {
        setReports(data.data);
        setPage(data.pagination.current_page);
        setTotalPages(data.pagination.total_pages);
      }
    } catch (err) {
      console.error("Failed to fetch reports", err);
    } finally {
      setReportLoading(false);
    }
  };

  useEffect(() => {
    fetchActiveSession();
  }, []);

  useEffect(() => {
    fetchReports(1);
  }, [startDate, endDate]);

  const getNextCheckTime = () => {
    if (!activeSession || !activeSession.calculated_check_times) return null;
    const now = new Date();
    for (let timeStr of activeSession.calculated_check_times) {
      const t = new Date(timeStr);
      if (t > now) return t;
    }
    return null;
  };

  const nextCheck = getNextCheckTime();

  return (
    <div className={`p-6 max-w-7xl mx-auto space-y-6 ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <ShieldAlert className="w-8 h-8 text-primary" />
            Live Campus Monitoring
          </h1>
          <p className="text-muted-foreground mt-1">
            Track faculty presence during scheduled intervals and receive alerts if they leave campus.
          </p>
        </div>
      </div>

      <Tabs defaultValue="live" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="live" className="flex items-center gap-2">
            <MapPin className="w-4 h-4" /> Live Dashboard
          </TabsTrigger>
          <TabsTrigger value="reports" className="flex items-center gap-2">
            <FileText className="w-4 h-4" /> Audit Reports
          </TabsTrigger>
        </TabsList>

        <TabsContent value="live" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Control Panel */}
            <Card className="lg:col-span-1 border-primary/20 shadow-md">
              <CardHeader className="bg-primary/5 pb-4 border-b border-border/50">
                <CardTitle className="flex items-center gap-2">
                  <Play className="w-5 h-5 text-primary" /> Session Control
                </CardTitle>
                <CardDescription>Manage the background location tracker</CardDescription>
              </CardHeader>
              <CardContent className="pt-6 space-y-6">
                {!activeSession ? (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Tracking Interval (Minutes)</label>
                      <Select value={intervalMinutes} onValueChange={setIntervalMinutes}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select interval" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="45">Every 45 minutes</SelectItem>
                          <SelectItem value="60">Every 1 hour</SelectItem>
                          <SelectItem value="120">Every 2 hours</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <Button 
                      onClick={startSession} 
                      disabled={starting}
                      className="w-full bg-primary hover:bg-primary/90 font-semibold"
                    >
                      {starting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Play className="w-4 h-4 mr-2" />}
                      Start Monitoring
                    </Button>
                    <p className="text-xs text-muted-foreground text-center">
                      Starting a session calculates strict ping times for all faculty for the rest of the day.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    <div className="p-4 rounded-xl bg-green-500/10 border border-green-500/20 text-center">
                      <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-green-500/20 text-green-600 mb-3">
                        <ShieldAlert className="w-6 h-6" />
                      </div>
                      <h3 className="text-green-600 font-bold text-lg mb-1">Session Active</h3>
                      <p className="text-sm text-green-600/80 font-medium">Interval: Every {activeSession.interval_minutes} mins</p>
                    </div>
                    
                    <div className="bg-muted/50 rounded-lg p-4 text-center">
                      <p className="text-sm text-muted-foreground mb-1">Next Scheduled Check</p>
                      <p className="text-2xl font-black tabular-nums">
                        {nextCheck ? nextCheck.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true }) : 'Done for today'}
                      </p>
                    </div>

                    <Button 
                      variant="destructive" 
                      onClick={stopSession} 
                      className="w-full font-semibold"
                    >
                      <Square className="w-4 h-4 mr-2" />
                      Stop Session
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Live Alerts */}
            <Card className="lg:col-span-2 shadow-md">
              <CardHeader className="border-b border-border/50">
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 text-red-500" />
                    Today's Boundary Alerts
                  </div>
                  <span className="text-sm font-medium px-3 py-1 bg-red-500/10 text-red-600 rounded-full">
                    {liveAlerts.length} Alerts
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {!activeSession && liveAlerts.length === 0 ? (
                  <div className="flex flex-col items-center justify-center p-12 text-muted-foreground text-center">
                    <ShieldAlert className="w-12 h-12 mb-4 opacity-20" />
                    <p className="font-medium">No active monitoring session</p>
                    <p className="text-sm opacity-70">Start a session to begin receiving alerts.</p>
                  </div>
                ) : liveAlerts.length === 0 ? (
                  <div className="flex flex-col items-center justify-center p-12 text-muted-foreground text-center">
                    <div className="w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center mb-4">
                      <MapPin className="w-8 h-8 text-green-500 opacity-80" />
                    </div>
                    <p className="font-semibold text-green-600">All Clear</p>
                    <p className="text-sm opacity-70 mt-1">No faculty detected outside campus during scheduled checks.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-muted/50 text-xs uppercase tracking-wider font-medium text-muted-foreground">
                        <tr>
                          <th className="px-6 py-3 text-left">Time</th>
                          <th className="px-6 py-3 text-left">Faculty</th>
                          <th className="px-6 py-3 text-left">Scheduled For</th>
                          <th className="px-6 py-3 text-right">Distance (Est.)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {liveAlerts.map((alert: any) => (
                          <tr key={alert.id} className="hover:bg-muted/50 transition-colors">
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-red-500">
                              {new Date(alert.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="font-medium">{alert.faculty_name}</div>
                              <div className="text-xs text-muted-foreground">{alert.faculty_email}</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                              {new Date(alert.scheduled_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                              {alert.distance_meters ? `${Math.round(alert.distance_meters)}m away` : 'Out of bounds'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>

          </div>
        </TabsContent>

        <TabsContent value="reports" className="space-y-4">
          <Card className="shadow-md">
            <CardHeader className="border-b border-border pb-4 flex flex-col xl:flex-row xl:items-center justify-between gap-4">
              <div>
                <CardTitle>Monitoring Audit Reports</CardTitle>
                <CardDescription>Historical logs of faculty found outside campus boundaries.</CardDescription>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-2 bg-background border border-input rounded-md px-2 py-1 focus-within:ring-1 focus-within:ring-ring">
                  <span className="text-xs text-muted-foreground font-medium pl-1">From</span>
                  <input 
                    type="date" 
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="bg-transparent border-none outline-none text-sm p-1 focus:ring-0"
                  />
                </div>
                <div className="flex items-center gap-2 bg-background border border-input rounded-md px-2 py-1 focus-within:ring-1 focus-within:ring-ring">
                  <span className="text-xs text-muted-foreground font-medium pl-1">To</span>
                  <input 
                    type="date" 
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="bg-transparent border-none outline-none text-sm p-1 focus:ring-0"
                  />
                </div>
                <Button className="w-full sm:w-auto" size="sm" onClick={() => fetchReports(1)}>
                  <Search className="w-4 h-4 mr-2" /> Filter
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {reportLoading ? (
                <div className="p-12 flex justify-center">
                  <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                </div>
              ) : reports.length === 0 ? (
                <div className="p-12 text-center text-muted-foreground">
                  <FileText className="w-12 h-12 mx-auto mb-4 opacity-20" />
                  <p>No alerts found in this date range.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-muted/50 text-xs uppercase tracking-wider font-medium text-muted-foreground">
                      <tr>
                        <th className="px-6 py-3 text-left">Date & Time</th>
                        <th className="px-6 py-3 text-left">Faculty</th>
                        <th className="px-6 py-3 text-left">Session Check</th>
                        <th className="px-6 py-3 text-right">Details</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {reports.map((alert: any) => (
                        <tr key={alert.id} className="hover:bg-muted/50">
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            {new Date(alert.timestamp).toLocaleDateString()} <br/>
                            <span className="text-red-500 font-semibold">{new Date(alert.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })}</span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="font-medium">{alert.faculty_name}</div>
                            <div className="text-xs text-muted-foreground">{alert.faculty_email}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                            {new Date(alert.scheduled_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                            {alert.distance_meters ? `${Math.round(alert.distance_meters)}m away` : 'Out of bounds'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
            {totalPages > 1 && (
              <div className="p-4 border-t border-border">
                <Pagination>
                  <PaginationContent className="flex-wrap justify-center">
                    <PaginationItem>
                      <PaginationPrevious 
                        onClick={(e) => {
                          e.preventDefault();
                          if (page > 1) fetchReports(page - 1);
                        }} 
                        className={page === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                      />
                    </PaginationItem>
                    
                    {/* Render basic page numbers */}
                    {Array.from({ length: totalPages }).map((_, idx) => {
                      const pageNum = idx + 1;
                      // Simple logic to show bounded pagination
                      if (
                        pageNum === 1 || 
                        pageNum === totalPages || 
                        (pageNum >= page - 1 && pageNum <= page + 1)
                      ) {
                        return (
                          <PaginationItem key={pageNum}>
                            <PaginationLink 
                              isActive={page === pageNum}
                              onClick={(e) => {
                                e.preventDefault();
                                fetchReports(pageNum);
                              }}
                              className="cursor-pointer"
                            >
                              {pageNum}
                            </PaginationLink>
                          </PaginationItem>
                        );
                      } else if (pageNum === page - 2 || pageNum === page + 2) {
                        return (
                          <PaginationItem key={pageNum}>
                            <PaginationEllipsis />
                          </PaginationItem>
                        );
                      }
                      return null;
                    })}

                    <PaginationItem>
                      <PaginationNext 
                        onClick={(e) => {
                          e.preventDefault();
                          if (page < totalPages) fetchReports(page + 1);
                        }} 
                        className={page === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
                      />
                    </PaginationItem>
                  </PaginationContent>
                </Pagination>
              </div>
            )}
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
