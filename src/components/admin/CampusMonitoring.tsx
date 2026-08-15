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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import { Badge } from "../ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "../ui/avatar";
import { Input } from "../ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "../ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../ui/table";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "../ui/pagination";
import { 
  MapPin, 
  AlertTriangle, 
  ShieldAlert, 
  FileText, 
  Search, 
  Loader2, 
  Wifi, 
  RefreshCw, 
  CheckCircle2,
  Radio,
  Building2,
  Phone,
  Mail,
  Table as TableIcon,
  Filter
} from "lucide-react";

export default function CampusMonitoring() {
  const { theme, user } = useAuth();
  const [activeSession, setActiveSession] = useState<any>(null);
  const [campuses, setCampuses] = useState<any[]>([]);
  const [liveAlerts, setLiveAlerts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Selected Faculty Modal State (Shadcn Dialog)
  const [selectedFaculty, setSelectedFaculty] = useState<any | null>(null);

  // View Mode for Live Dashboard: 'radar' | 'table'
  const [viewMode, setViewMode] = useState<'radar' | 'table'>('radar');

  // Reports State
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
        setActiveSession(data.session);
        setCampuses(data.campuses || []);
        const rawAlerts = data.alerts || [];
        const seen = new Set();
        const uniqueAlerts = rawAlerts.filter((alert: any) => {
          const key = alert.faculty_id || alert.faculty_email;
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        });
        setLiveAlerts(uniqueAlerts);
      }
    } catch (err) {
      console.error("Failed to fetch active session", err);
    } finally {
      setLoading(false);
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

    // Real-time WebSocket listener for instant boundary alert updates
    const handleWsRefresh = () => {
      fetchActiveSession();
    };

    window.addEventListener("refresh-campus-monitoring", handleWsRefresh);
    return () => {
      window.removeEventListener("refresh-campus-monitoring", handleWsRefresh);
    };
  }, []);

  useEffect(() => {
    fetchReports(1);
  }, [startDate, endDate]);

  // Polar coordinate positions for plotting faculty nodes on the radar UI
  const getFormattedDistance = (facultyAlert: any) => {
    if (!facultyAlert) return 'Outside Geofence';
    if (facultyAlert.distance_meters && facultyAlert.distance_meters > 0) {
      return `${Math.round(facultyAlert.distance_meters)} meters`;
    }
    
    const alertLat = facultyAlert.latitude;
    const alertLng = facultyAlert.longitude;
    const campusLat = campuses[0]?.latitude;
    const campusLng = campuses[0]?.longitude;

    if (alertLat && alertLng && campusLat && campusLng) {
      const R = 6371000; // Earth radius in meters
      const dLat = (alertLat - campusLat) * (Math.PI / 180);
      const dLon = (alertLng - campusLng) * (Math.PI / 180);
      const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(campusLat * (Math.PI / 180)) *
          Math.cos(alertLat * (Math.PI / 180)) *
          Math.sin(dLon / 2) *
          Math.sin(dLon / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      const dist = Math.round(R * c);
      return `${dist} meters`;
    }
    
    return 'Outside Geofence';
  };

  const getRadarPosition = (index: number, total: number) => {
    const angle = (index / Math.max(total, 1)) * 2 * Math.PI - Math.PI / 2;
    // Vary radial distance across 3 concentric orbit rings (30%, 36%, 42%) so nodes never collide or overlap
    const orbitRadius = 30 + (index % 3) * 6;
    const x = 50 + orbitRadius * Math.cos(angle);
    const y = 50 + orbitRadius * Math.sin(angle);
    return { left: `${x}%`, top: `${y}%` };
  };

  const handleResolveAlert = async (alertId: number) => {
    try {
      const res = await fetchWithTokenRefresh(`${API_ENDPOINT}/admin/monitoring/resolve-alert/${alertId}/`, {
        method: 'POST'
      });
      const data = await res.json();
      if (data.success) {
        setSelectedFaculty(null);
        fetchActiveSession();
      }
    } catch (err) {
      console.error("Error resolving alert");
    }
  };

  return (
    <div className={`p-4 sm:p-6 max-w-7xl mx-auto space-y-6 ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>
      
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-border/40 pb-5">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight flex items-center gap-2.5">
            <ShieldAlert className="w-7 h-7 sm:w-8 sm:h-8 text-primary" />
            Live Campus Monitoring
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Real-time geofence scanner tracking faculty location events.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchActiveSession} disabled={loading} className="w-full sm:w-auto">
          <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      <Tabs defaultValue="live" className="w-full space-y-6">
        
        {/* Main Tab Navigation */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <TabsList className="grid w-full sm:w-auto grid-cols-2">
            <TabsTrigger value="live" className="flex items-center justify-center gap-2 text-xs sm:text-sm font-semibold">
              <Radio className="w-4 h-4 text-primary" /> Live Radar
            </TabsTrigger>
            <TabsTrigger value="reports" className="flex items-center justify-center gap-2 text-xs sm:text-sm font-semibold">
              <FileText className="w-4 h-4" /> Audit Reports
            </TabsTrigger>
          </TabsList>
        </div>

        {/* TAB 1: LIVE RADAR DASHBOARD */}
        <TabsContent value="live" className="space-y-6 outline-none">
          
          {/* Top Control Sub-header for Live Dashboard (Only visible in Live Radar tab) */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-card p-3 rounded-xl border border-border shadow-sm">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline" className="flex items-center gap-1.5 py-1 text-xs whitespace-nowrap">
                <Wifi className="w-3.5 h-3.5 text-green-500 animate-pulse" />
                Live WebSockets
              </Badge>
              <Badge variant="destructive" className="py-1 text-xs whitespace-nowrap">
                {liveAlerts.length} Outside Campus
              </Badge>
            </div>

            {/* Radar vs Table Toggle */}
            <div className="flex items-center bg-muted p-1 rounded-lg border border-border/50 w-full sm:w-auto">
              <button
                onClick={() => setViewMode('radar')}
                className={`flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                  viewMode === 'radar' 
                    ? 'bg-background text-primary shadow-sm' 
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <Radio className="w-3.5 h-3.5" /> Radar View
              </button>
              <button
                onClick={() => setViewMode('table')}
                className={`flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                  viewMode === 'table' 
                    ? 'bg-background text-primary shadow-sm' 
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <TableIcon className="w-3.5 h-3.5" /> List View
              </button>
            </div>
          </div>

          {viewMode === 'radar' ? (
            /* RADAR SCANNER DISPLAY (Responsive Mobile Layout) */
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Radar Scanner Visual Container */}
              <div className="lg:col-span-2 relative overflow-hidden rounded-2xl bg-gradient-to-b from-slate-950 via-slate-900 to-blue-950 border border-blue-900/60 shadow-2xl p-4 sm:p-8 min-h-[380px] sm:min-h-[500px] flex flex-col items-center justify-center">
                
                {/* Background Radar Waves */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none overflow-hidden">
                  <div className="absolute w-[280px] sm:w-[420px] h-[280px] sm:h-[420px] rounded-full border border-blue-500/20 animate-ping opacity-25" />
                  <div className="absolute w-[220px] sm:w-[340px] h-[220px] sm:h-[340px] rounded-full border border-blue-400/30 animate-pulse" />
                  
                  {/* Concentric Rings */}
                  <div className="w-[300px] sm:w-[460px] h-[300px] sm:h-[460px] rounded-full border border-blue-400/20 flex items-center justify-center">
                    <div className="w-[220px] sm:w-[340px] h-[220px] sm:h-[340px] rounded-full border border-blue-400/30 flex items-center justify-center">
                      <div className="w-[140px] sm:w-[220px] h-[140px] sm:h-[220px] rounded-full border border-blue-400/40 border-dashed flex items-center justify-center">
                        <div className="w-[80px] sm:w-[120px] h-[80px] sm:h-[120px] rounded-full border border-blue-400/50 bg-blue-500/10" />
                      </div>
                    </div>
                  </div>

                  {/* Crosshairs */}
                  <div className="absolute w-full h-[1px] bg-blue-500/20" />
                  <div className="absolute h-full w-[1px] bg-blue-500/20" />

                  {/* Rotating Sweep Line */}
                  <div 
                    className="absolute w-[300px] sm:w-[460px] h-[300px] sm:h-[460px] rounded-full pointer-events-none"
                    style={{
                      background: 'conic-gradient(from 0deg at 50% 50%, rgba(59, 130, 246, 0.35) 0deg, rgba(59, 130, 246, 0) 55deg)',
                      animation: 'spin 5s linear infinite',
                    }}
                  />
                </div>

                {/* CENTER CAMPUS / ORG HUB NODE */}
                {(() => {
                  const orgLogo = activeSession?.org_logo || user?.org_logo || user?.organization?.logo || null;
                  return (
                    <div className="relative z-10 flex flex-col items-center justify-center group cursor-pointer">
                      <div className="relative w-14 h-14 sm:w-20 sm:h-20 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-500 border-2 sm:border-4 border-blue-300 shadow-[0_0_30px_rgba(59,130,246,0.6)] flex items-center justify-center transform group-hover:scale-105 transition-transform overflow-hidden p-1">
                        {orgLogo ? (
                          <img 
                            src={orgLogo} 
                            alt={activeSession?.org_name || "Org Logo"} 
                            className="w-full h-full object-cover rounded-full bg-white"
                          />
                        ) : (
                          <Building2 className="w-7 h-7 sm:w-9 sm:h-9 text-white" />
                        )}
                      </div>
                      <div className="mt-2 text-center">
                        <span className="px-2.5 py-0.5 bg-blue-950/90 text-blue-200 font-bold text-xs rounded-full border border-blue-400/30">
                          {activeSession?.org_name || campuses[0]?.name || "Campus Center"}
                        </span>
                      </div>
                    </div>
                  );
                })()}

                {/* OUTSIDE FACULTY AVATAR NODES */}
                {liveAlerts.map((alert: any, idx: number) => {
                  const pos = getRadarPosition(idx, liveAlerts.length);
                  const facultyName = alert.faculty_name || "Faculty";
                  
                  return (
                    <div
                      key={alert.id}
                      onClick={() => setSelectedFaculty(alert)}
                      style={{ left: pos.left, top: pos.top }}
                      className="absolute z-20 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center group cursor-pointer transition-transform hover:scale-110"
                    >
                      <div className="relative">
                        <div className="absolute -inset-1.5 rounded-full bg-red-500/40 animate-ping" />
                        <Avatar className="w-10 h-10 sm:w-12 sm:h-12 border-2 border-red-500 shadow-lg">
                          <AvatarImage src={alert.profile_picture} alt={facultyName} />
                          <AvatarFallback className="bg-rose-600 text-white font-bold text-xs sm:text-sm">
                            {facultyName.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                      </div>
                      <div className="mt-1 px-2 py-0.5 bg-slate-950/90 border border-red-500/40 rounded-full text-center max-w-[90px] sm:max-w-[110px] truncate shadow-md">
                        <p className="text-[10px] sm:text-xs font-semibold text-white truncate">{facultyName}</p>
                      </div>
                    </div>
                  );
                })}

              </div>

              {/* Quick Info Sidebar Panel */}
              <Card className="shadow-sm border-border">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base font-bold flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-primary" /> Active Boundary
                  </CardTitle>
                  <CardDescription className="text-xs">Configured geofence coordinates</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 text-sm">
                  {campuses.length === 0 ? (
                    <div className="p-3 bg-muted/40 rounded-lg text-xs text-muted-foreground">
                      Standard 500m Geofence Active
                    </div>
                  ) : (
                    campuses.map((c) => (
                      <div key={c.id} className="p-3 bg-muted/40 border border-border/50 rounded-lg space-y-1">
                        <div className="font-semibold text-xs sm:text-sm flex items-center justify-between">
                          <span>{c.name}</span>
                          <Badge variant="secondary" className="text-[10px]">{c.radius_meters || 500}m Radius</Badge>
                        </div>
                        {c.latitude && c.longitude && (
                          <p className="text-[11px] text-muted-foreground tabular-nums">
                            Lat: {c.latitude.toFixed(4)}, Lng: {c.longitude.toFixed(4)}
                          </p>
                        )}
                      </div>
                    ))
                  )}

                  <div className="pt-2 border-t border-border space-y-2">
                    <h4 className="text-xs font-bold text-muted-foreground uppercase">Recent Out-of-Bounds</h4>
                    {liveAlerts.length === 0 ? (
                      <p className="text-xs text-green-600 font-medium">✓ All faculty inside campus</p>
                    ) : (
                      liveAlerts.slice(0, 3).map((a) => (
                        <div 
                          key={a.id} 
                          onClick={() => setSelectedFaculty(a)}
                          className="flex items-center justify-between p-2 hover:bg-muted rounded-lg cursor-pointer transition-colors text-xs"
                        >
                          <div className="flex items-center gap-2 truncate">
                            <Avatar className="w-6 h-6 border border-red-400">
                              <AvatarImage src={a.profile_picture} />
                              <AvatarFallback className="text-[9px] bg-red-500 text-white">
                                {a.faculty_name?.charAt(0)}
                              </AvatarFallback>
                            </Avatar>
                            <span className="font-medium truncate">{a.faculty_name}</span>
                          </div>
                          <span className="text-[10px] font-semibold text-red-500">
                            {new Date(a.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>

            </div>
          ) : (
            /* LIST VIEW TABLE */
            <Card className="shadow-sm border-border">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-red-500" /> Today's Alerts
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {liveAlerts.length === 0 ? (
                  <div className="p-8 text-center text-muted-foreground text-sm">
                    No faculty detected outside campus today.
                  </div>
                ) : (
                  <div className="overflow-x-auto w-full">
                    <Table className="w-full min-w-[500px]">
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-[110px]">Time</TableHead>
                          <TableHead className="min-w-[150px]">Faculty</TableHead>
                          <TableHead className="min-w-[160px]">Contact</TableHead>
                          <TableHead className="text-right w-[110px]">Distance</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {liveAlerts.map((alert: any) => (
                          <TableRow 
                            key={alert.id} 
                            onClick={() => setSelectedFaculty(alert)}
                            className="cursor-pointer"
                          >
                            <TableCell className="font-semibold text-red-500 text-xs whitespace-nowrap">
                              {new Date(alert.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2.5 min-w-0">
                                <Avatar className="w-8 h-8 border border-red-400 shrink-0">
                                  <AvatarImage src={alert.profile_picture} />
                                  <AvatarFallback className="bg-red-500 text-white text-xs font-bold">
                                    {alert.faculty_name?.charAt(0)}
                                  </AvatarFallback>
                                </Avatar>
                                <div className="min-w-0">
                                  <div className="font-semibold text-xs sm:text-sm truncate">{alert.faculty_name}</div>
                                  <div className="text-[11px] text-muted-foreground truncate">{alert.faculty_designation || "Faculty"}</div>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                              <div>{alert.faculty_email}</div>
                              {alert.faculty_mobile && <div className="text-primary font-mono">{alert.faculty_mobile}</div>}
                            </TableCell>
                            <TableCell className="text-right whitespace-nowrap">
                              <Badge variant="destructive" className="text-[10px] whitespace-nowrap inline-flex items-center justify-center rounded-full px-2.5 py-0.5 font-semibold shrink-0">
                                {alert.distance_meters ? `${Math.round(alert.distance_meters)}m away` : 'Out of bounds'}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

        </TabsContent>

        {/* TAB 2: AUDIT REPORTS */}
        <TabsContent value="reports" className="space-y-4 outline-none">
          <Card className="shadow-sm border-border">
            <CardHeader className="pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/50">
              <div>
                <CardTitle className="text-lg sm:text-xl font-bold">Monitoring Audit Reports</CardTitle>
                <CardDescription className="text-xs sm:text-sm">Historical logs of faculty detected outside campus.</CardDescription>
              </div>
              <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                <div className="flex items-center gap-1.5 bg-background border border-input rounded-lg px-2.5 py-1 text-xs">
                  <span className="text-muted-foreground font-medium">From</span>
                  <Input 
                    type="date" 
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="h-7 border-none bg-transparent p-0 text-xs shadow-none focus-visible:ring-0"
                  />
                </div>
                <div className="flex items-center gap-1.5 bg-background border border-input rounded-lg px-2.5 py-1 text-xs">
                  <span className="text-muted-foreground font-medium">To</span>
                  <Input 
                    type="date" 
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="h-7 border-none bg-transparent p-0 text-xs shadow-none focus-visible:ring-0"
                  />
                </div>
                <Button size="sm" onClick={() => fetchReports(1)} className="h-8 text-xs font-semibold">
                  <Filter className="w-3.5 h-3.5 mr-1.5" /> Filter
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {reportLoading ? (
                <div className="p-12 flex justify-center">
                  <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                </div>
              ) : reports.length === 0 ? (
                <div className="p-12 text-center text-muted-foreground text-sm">
                  <FileText className="w-10 h-10 mx-auto mb-3 opacity-30" />
                  <p className="font-medium">No alerts found in this date range.</p>
                </div>
              ) : (
                <div className="overflow-x-auto w-full">
                  <Table className="w-full min-w-[550px]">
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[120px]">Date & Time</TableHead>
                        <TableHead className="min-w-[160px]">Faculty</TableHead>
                        <TableHead className="w-[140px]">Event Type</TableHead>
                        <TableHead className="text-right w-[110px]">Details</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {reports.map((alert: any) => (
                        <TableRow 
                          key={alert.id} 
                          onClick={() => setSelectedFaculty(alert)}
                          className="cursor-pointer"
                        >
                          <TableCell className="text-xs font-medium whitespace-nowrap">
                            {new Date(alert.timestamp).toLocaleDateString()} <br/>
                            <span className="text-red-500 font-semibold">{new Date(alert.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })}</span>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2.5 min-w-0">
                              <Avatar className="w-7 h-7 border border-border shrink-0">
                                <AvatarImage src={alert.profile_picture} />
                                <AvatarFallback className="text-[10px] bg-muted font-bold">
                                  {alert.faculty_name?.charAt(0)}
                                </AvatarFallback>
                              </Avatar>
                              <div className="min-w-0">
                                <div className="font-medium text-xs sm:text-sm truncate">{alert.faculty_name}</div>
                                <div className="text-[11px] text-muted-foreground truncate">{alert.faculty_email}</div>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="whitespace-nowrap">
                            {alert.is_resolved ? (
                              <Badge variant="outline" className="text-[10px] text-emerald-600 border-emerald-200 bg-emerald-50 whitespace-nowrap inline-flex items-center justify-center rounded-full px-2.5 py-0.5 font-semibold shrink-0">
                                Returned / Resolved
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-[10px] text-red-500 border-red-200 bg-red-50 whitespace-nowrap inline-flex items-center justify-center rounded-full px-2.5 py-0.5 font-semibold shrink-0">
                                Active Exit
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-right text-xs whitespace-nowrap font-medium">
                            {getFormattedDistance(alert)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
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
                        className={page === 1 ? "pointer-events-none opacity-50 text-xs" : "cursor-pointer text-xs"}
                      />
                    </PaginationItem>
                    
                    {Array.from({ length: totalPages }).map((_, idx) => {
                      const pageNum = idx + 1;
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
                              className="cursor-pointer text-xs"
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
                        className={page === totalPages ? "pointer-events-none opacity-50 text-xs" : "cursor-pointer text-xs"}
                      />
                    </PaginationItem>
                  </PaginationContent>
                </Pagination>
              </div>
            )}
          </Card>
        </TabsContent>

      </Tabs>

      {/* SHADCN DIALOG: FACULTY PROFILE CONTACT DETAILS MODAL */}
      <Dialog open={!!selectedFaculty} onOpenChange={(open) => !open && setSelectedFaculty(null)}>
        <DialogContent className="sm:max-w-md">
          {selectedFaculty && (
            <>
              <DialogHeader className="flex flex-col items-center text-center">
                <Avatar className="w-20 h-20 border-4 border-red-500 shadow-lg mb-3">
                  <AvatarImage src={selectedFaculty.profile_picture} alt={selectedFaculty.faculty_name} />
                  <AvatarFallback className="bg-rose-600 text-white font-black text-2xl">
                    {selectedFaculty.faculty_name?.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <DialogTitle className="text-xl font-bold">{selectedFaculty.faculty_name}</DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground font-medium mt-0.5">
                  {selectedFaculty.faculty_designation || "Faculty Member"}
                </DialogDescription>
                <Badge variant="destructive" className="mt-2 text-xs py-1 px-3">
                  Detected Outside Campus Boundary
                </Badge>
              </DialogHeader>

              <div className="space-y-3 bg-muted/40 p-4 rounded-xl border border-border/50 text-xs sm:text-sm my-2">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground flex items-center gap-1.5 text-xs">
                    <Mail className="w-3.5 h-3.5 text-primary" /> Email
                  </span>
                  <span className="font-semibold truncate max-w-[210px] text-xs">{selectedFaculty.faculty_email}</span>
                </div>

                {selectedFaculty.faculty_mobile && (
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground flex items-center gap-1.5 text-xs">
                      <Phone className="w-3.5 h-3.5 text-primary" /> Phone
                    </span>
                    <span className="font-mono font-semibold text-xs text-primary">{selectedFaculty.faculty_mobile}</span>
                  </div>
                )}

                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground flex items-center gap-1.5 text-xs">
                    <MapPin className="w-3.5 h-3.5 text-red-500" /> Time Detected
                  </span>
                  <span className="font-semibold text-xs">
                    {new Date(selectedFaculty.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground flex items-center gap-1.5 text-xs">
                    <ShieldAlert className="w-3.5 h-3.5 text-amber-500" /> Distance Est.
                  </span>
                  <span className="font-semibold text-xs text-amber-600">
                    {getFormattedDistance(selectedFaculty)}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-3 pt-2">
                {!selectedFaculty.is_resolved && (
                  <Button 
                    size="sm"
                    onClick={() => handleResolveAlert(selectedFaculty.id)}
                    className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs rounded-lg transition-colors shadow-sm"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" /> Mark Returned
                  </Button>
                )}
                {selectedFaculty.faculty_mobile ? (
                  <a 
                    href={`tel:${selectedFaculty.faculty_mobile}`}
                    className="flex-1 inline-flex items-center justify-center gap-2 py-2 px-4 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-xs rounded-lg transition-colors shadow-sm"
                  >
                    <Phone className="w-3.5 h-3.5" /> Call Faculty
                  </a>
                ) : (
                  <a 
                    href={`mailto:${selectedFaculty.faculty_email}`}
                    className="flex-1 inline-flex items-center justify-center gap-2 py-2 px-4 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-xs rounded-lg transition-colors shadow-sm"
                  >
                    <Mail className="w-3.5 h-3.5" /> Send Email
                  </a>
                )}
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setSelectedFaculty(null)}
                  className="rounded-lg text-xs"
                >
                  Close
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

    </div>
  );
}
