import React, { useState, useEffect, useRef } from "react";
import {
  QrCode,
  Search,
  CheckCircle2,
  LogOut,
  LogIn,
  AlertTriangle,
  Clock,
  User,
  Phone,
  Home,
  ShieldCheck,
  RefreshCw,
  Camera,
  X,
  AlertCircle,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Calendar,
  RotateCcw,
} from "lucide-react";
import { BrowserMultiFormatReader, NotFoundException } from "@zxing/library";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { useTheme } from "@/context/ThemeContext";
import {
  getSecurityGatePasses,
  verifyGatePass,
  checkOutGatePass,
  checkInGatePass
} from "@/utils/hms_api";
import { toast } from "sonner";
import { API_BASE_URL } from "@/utils/config";

interface SecurityGatePassScannerProps {
  currentUser?: any;
}

export const SecurityGatePassScanner: React.FC<SecurityGatePassScannerProps> = ({ currentUser }) => {
  const { theme } = useTheme();

  // Stats State (KPIs)
  const [stats, setStats] = useState({
    outside: 0,
    approved: 0,
    overdue: 0,
    today_movement: 0,
  });
  const [statsLoading, setStatsLoading] = useState(false);

  // Tabs Data & Pagination State
  const [activeTab, setActiveTab] = useState<"outside" | "approved" | "history">("outside");
  const [searchQuery, setSearchQuery] = useState("");

  // Outside Tab
  const [outsidePasses, setOutsidePasses] = useState<any[]>([]);
  const [outsideLoading, setOutsideLoading] = useState(false);
  const [outsidePage, setOutsidePage] = useState(1);
  const [outsideTotalPages, setOutsideTotalPages] = useState(1);
  const [outsideCount, setOutsideCount] = useState(0);

  // Approved Tab
  const [approvedPasses, setApprovedPasses] = useState<any[]>([]);
  const [approvedLoading, setApprovedLoading] = useState(false);
  const [approvedPage, setApprovedPage] = useState(1);
  const [approvedTotalPages, setApprovedTotalPages] = useState(1);
  const [approvedCount, setApprovedCount] = useState(0);

  // All Log (History) Tab
  const [historyPasses, setHistoryPasses] = useState<any[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyPage, setHistoryPage] = useState(1);
  const [historyTotalPages, setHistoryTotalPages] = useState(1);
  const [historyDateFrom, setHistoryDateFrom] = useState("");
  const [historyDateTo, setHistoryDateTo] = useState("");
  const todayStr = new Date().toISOString().split("T")[0];

  // Selected Pass for Verification & Actions
  const [selectedPass, setSelectedPass] = useState<any | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [securityNote, setSecurityNote] = useState("");

  // Scanner Modal State
  const [scannerOpen, setScannerOpen] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);
  const [videoDevices, setVideoDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string | undefined>(undefined);
  const [isCameraStarting, setIsCameraStarting] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const codeReader = useRef<BrowserMultiFormatReader | null>(null);

  // Audio Beep
  const playBeep = () => {
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      const audioCtx = new AudioContextClass();
      if (audioCtx.state === "suspended") {
        audioCtx.resume();
      }
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();
      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);
      oscillator.type = "sine";
      oscillator.frequency.setValueAtTime(880, audioCtx.currentTime);
      gainNode.gain.setValueAtTime(0.8, audioCtx.currentTime);
      oscillator.start();
      setTimeout(() => {
        oscillator.stop();
        audioCtx.close();
      }, 150);
    } catch (e) {
      console.warn("Audio feedback error:", e);
    }
  };

  // 1st Fetch: Stats only
  const fetchStats = async () => {
    try {
      setStatsLoading(true);
      const res = await getSecurityGatePasses({ stats_only: true });
      if (res?.stats) {
        setStats({
          outside: res.stats.outside || 0,
          approved: res.stats.approved || 0,
          overdue: res.stats.overdue || 0,
          today_movement: res.stats.today_movement || 0,
        });
      }
    } catch (err) {
      console.error("Error fetching gate pass stats:", err);
    } finally {
      setStatsLoading(false);
    }
  };

  // 2nd: Fetch individual tab data
  const fetchOutsidePasses = async (page = 1) => {
    try {
      setOutsideLoading(true);
      const res = await getSecurityGatePasses({ status: 'checked_out', page, page_size: 10 });
      const raw = res?.data || res;
      const list = Array.isArray(raw) ? raw : (raw?.results || (res as any)?.results || []);
      setOutsidePasses(Array.isArray(list) ? list : []);
      setOutsidePage(res.current_page || page);
      setOutsideTotalPages(res.total_pages || 1);
      if (typeof res.count === 'number') {
        setOutsideCount(res.count);
      }
    } catch (err: any) {
      console.error("Error fetching outside passes:", err);
      toast.error(err.message || "Failed to load outside gate passes");
    } finally {
      setOutsideLoading(false);
    }
  };

  const fetchApprovedPasses = async (page = 1) => {
    try {
      setApprovedLoading(true);
      const res = await getSecurityGatePasses({ status: 'approved', page, page_size: 10 });
      const raw = res?.data || res;
      const list = Array.isArray(raw) ? raw : (raw?.results || (res as any)?.results || []);
      setApprovedPasses(Array.isArray(list) ? list : []);
      setApprovedPage(res.current_page || page);
      setApprovedTotalPages(res.total_pages || 1);
      if (typeof res.count === 'number') {
        setApprovedCount(res.count);
      }
    } catch (err: any) {
      console.error("Error fetching approved passes:", err);
      toast.error(err.message || "Failed to load approved gate passes");
    } finally {
      setApprovedLoading(false);
    }
  };

  const fetchHistoryPasses = async (page = 1, fromDate?: string, toDate?: string) => {
    try {
      setHistoryLoading(true);
      const fDate = fromDate !== undefined ? fromDate : historyDateFrom;
      const tDate = toDate !== undefined ? toDate : historyDateTo;
      const res = await getSecurityGatePasses({
        status: 'history',
        page,
        page_size: 10,
        date_from: fDate || undefined,
        date_to: tDate || undefined,
      });
      const raw = res?.data || res;
      const list = Array.isArray(raw) ? raw : (raw?.results || (res as any)?.results || []);
      setHistoryPasses(Array.isArray(list) ? list : []);
      setHistoryPage(res.current_page || page);
      setHistoryTotalPages(res.total_pages || 1);
    } catch (err: any) {
      console.error("Error fetching all log passes:", err);
      toast.error(err.message || "Failed to load all log gate passes");
    } finally {
      setHistoryLoading(false);
    }
  };

  const handleApplyDateFilter = (from: string, to: string) => {
    setHistoryDateFrom(from);
    setHistoryDateTo(to);
    fetchHistoryPasses(1, from, to);
  };

  const handleClearDateFilter = () => {
    setHistoryDateFrom("");
    setHistoryDateTo("");
    fetchHistoryPasses(1, "", "");
  };

  // Refresh active tab + stats
  const refreshActiveData = () => {
    fetchStats();
    if (activeTab === "outside") fetchOutsidePasses(outsidePage);
    else if (activeTab === "approved") fetchApprovedPasses(approvedPage);
    else if (activeTab === "history") fetchHistoryPasses(historyPage);
  };

  // Initial load: 1st fetch stats, then fetch active tab (outside)
  useEffect(() => {
    fetchStats();
    fetchOutsidePasses(1);

    const interval = setInterval(() => {
      fetchStats();
      if (activeTab === "outside") fetchOutsidePasses(outsidePage);
      else if (activeTab === "approved") fetchApprovedPasses(approvedPage);
      else if (activeTab === "history") fetchHistoryPasses(historyPage);
    }, 30000); // 30s auto-refresh

    return () => clearInterval(interval);
  }, []);

  // When active tab changes, fetch that tab's data
  useEffect(() => {
    if (activeTab === "outside") {
      fetchOutsidePasses(outsidePage);
    } else if (activeTab === "approved") {
      fetchApprovedPasses(approvedPage);
    } else if (activeTab === "history") {
      fetchHistoryPasses(historyPage);
    }
  }, [activeTab]);

  // Initialize Scanner Reader
  useEffect(() => {
    codeReader.current = new BrowserMultiFormatReader();
    const initDevices = async () => {
      try {
        const devices = await codeReader.current?.listVideoInputDevices();
        if (devices && devices.length > 0) {
          setVideoDevices(devices);
          const backCam = devices.find((d) => /back|rear|environment/i.test(d.label));
          setSelectedDeviceId(backCam ? backCam.deviceId : devices[devices.length - 1].deviceId);
        }
      } catch (err) {
        console.error("Error listing video devices:", err);
      }
    };
    initDevices();

    return () => {
      if (codeReader.current) {
        codeReader.current.reset();
      }
    };
  }, []);

  // Handle Scanning Start / Stop
  useEffect(() => {
    if (!scannerOpen && codeReader.current) {
      codeReader.current.reset();
      setScanning(false);
      setScanError(null);
    }
  }, [scannerOpen]);

  const startScanning = async () => {
    if (!codeReader.current || !videoRef.current) return;
    setScanning(true);
    setIsCameraStarting(true);
    setScanError(null);

    try {
      const result = await codeReader.current.decodeOnceFromVideoDevice(selectedDeviceId, videoRef.current);
      if (result) {
        playBeep();
        const scannedText = result.getText();
        handleScannedCode(scannedText);
        setScannerOpen(false);
      }
    } catch (err) {
      if (!(err instanceof NotFoundException)) {
        console.error("Scan error:", err);
        setScanError("Camera access denied or device error.");
      }
    } finally {
      setIsCameraStarting(false);
      setScanning(false);
    }
  };

  const stopScanning = () => {
    if (codeReader.current) {
      codeReader.current.reset();
    }
    setScanning(false);
    setIsCameraStarting(false);
  };

  const handleSwitchCamera = () => {
    if (videoDevices.length > 1) {
      const currentIndex = videoDevices.findIndex((d) => d.deviceId === selectedDeviceId);
      const nextIndex = (currentIndex + 1) % videoDevices.length;
      const nextDeviceId = videoDevices[nextIndex].deviceId;
      setSelectedDeviceId(nextDeviceId);

      if (scanning && codeReader.current) {
        codeReader.current.reset();
        setIsCameraStarting(true);
        codeReader.current
          .decodeOnceFromVideoDevice(nextDeviceId, videoRef.current)
          .then((result) => {
            if (result) {
              playBeep();
              handleScannedCode(result.getText());
              setScannerOpen(false);
            }
          })
          .catch((err) => {
            if (!(err instanceof NotFoundException)) {
              console.error(err);
            }
          });
      }
    }
  };

  // Process scanned code or token
  const handleScannedCode = async (rawCode: string) => {
    if (!rawCode || !rawCode.trim()) return;
    let token = rawCode.trim();

    try {
      const parsed = JSON.parse(token);
      if (parsed.pass_token) token = parsed.pass_token;
      else if (parsed.id) token = String(parsed.id);
      else if (parsed.token) token = parsed.token;
    } catch {
      // Plain string token
    }

    try {
      setVerifying(true);
      const res = await verifyGatePass(token);
      const passData = res?.data?.data || res?.data || res;
      if (passData && (passData.id || passData.pass_token)) {
        setSelectedPass(passData);
        setSecurityNote("");
        const namePart = passData.student_name ? ` (${passData.student_name})` : '';
        toast.success(`Verified Gate Pass: ${passData.pass_token || `ID #${passData.id}`}${namePart}`);
      } else {
        toast.error(res?.message || "Gate Pass not found");
      }
    } catch (err: any) {
      console.error("Verify error:", err);
      toast.error(err.message || "Failed to verify gate pass");
    } finally {
      setVerifying(false);
    }
  };

  // Search Submit
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    handleScannedCode(searchQuery.trim());
  };

  // Check-Out Action
  const handleCheckOut = async () => {
    if (!selectedPass?.id) return;
    try {
      setActionLoading(true);
      const res = await checkOutGatePass(selectedPass.id, securityNote);
      const passData = res?.data?.data || res?.data || res;
      toast.success(res?.message || "Student successfully checked out of campus!");
      if (passData && passData.id) {
        setSelectedPass(passData);
      } else {
        setSelectedPass(null);
      }
      refreshActiveData();
    } catch (err: any) {
      console.error("Checkout error:", err);
      toast.error(err.message || "Failed to check out student");
    } finally {
      setActionLoading(false);
    }
  };

  // Check-In Action
  const handleCheckIn = async () => {
    if (!selectedPass?.id) return;
    try {
      setActionLoading(true);
      const res = await checkInGatePass(selectedPass.id, securityNote);
      const passData = res?.data?.data || res?.data || res;
      const isLate = passData?.is_late ?? (res as any)?.is_late ?? false;
      const lateMinutes = passData?.late_duration_minutes ?? (res as any)?.late_duration_minutes ?? 0;

      if (isLate) {
        toast.warning(
          `Student checked in LATE by ${lateMinutes} mins. Recorded in gate register.`
        );
      } else {
        toast.success(res?.message || "Student successfully checked in and returned on time!");
      }
      if (passData && passData.id) {
        setSelectedPass(passData);
      } else {
        setSelectedPass(null);
      }
      refreshActiveData();
    } catch (err: any) {
      console.error("Checkin error:", err);
      toast.error(err.message || "Failed to check in student");
    } finally {
      setActionLoading(false);
    }
  };

  const formatSafeDateTime = (dtStr?: string | null) => {
    if (!dtStr) return '--';
    try {
      const d = new Date(dtStr);
      return isNaN(d.getTime()) ? dtStr : d.toLocaleString();
    } catch {
      return dtStr || '--';
    }
  };

  const getFullImageUrl = (path?: string) => {
    if (!path) return "";
    if (path.startsWith("http://") || path.startsWith("https://")) return path;
    const base = API_BASE_URL.replace(/\/api$/, "");
    return `${base}${path.startsWith("/") ? "" : "/"}${path}`;
  };

  const getStatusBadge = (status?: string | null) => {
    const s = (status || 'pending').toLowerCase();
    switch (s) {
      case "approved":
        return (
          <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30">
            Approved (Ready for Checkout)
          </Badge>
        );
      case "checked_out":
        return (
          <Badge className="bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30 animate-pulse">
            Checked Out (Outside)
          </Badge>
        );
      case "checked_in":
        return (
          <Badge className="bg-gray-500/15 text-gray-600 dark:text-gray-400 border-gray-500/30">
            Checked In (Returned)
          </Badge>
        );
      case "rejected":
        return (
          <Badge className="bg-red-500/15 text-red-600 dark:text-red-400 border-red-500/30">
            Rejected
          </Badge>
        );
      case "pending":
        return (
          <Badge className="bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30">
            Pending
          </Badge>
        );
      default:
        return <Badge variant="outline">{(status || 'N/A').toUpperCase()}</Badge>;
    }
  };

  const isOverdue = (pass: any) => {
    if (!pass || pass.status !== "checked_out") return false;
    if (!pass.expected_return_date || !pass.expected_return_time) return false;
    try {
      const expDate = new Date(`${pass.expected_return_date}T${pass.expected_return_time}`);
      return new Date() > expDate;
    } catch {
      return false;
    }
  };

  // Fetch Full Pass Details when tapping a student in the list
  const handleSelectPass = async (pass: any) => {
    if (!pass) return;
    setSecurityNote("");
    setSelectedPass(pass); // immediate preview
    setVerifying(true);
    try {
      const res = await verifyGatePass(pass.pass_token || pass.id.toString());
      const passData = res?.data?.data || res?.data || res;
      if (passData && (passData.id || passData.pass_token)) {
        setSelectedPass(passData);
      }
    } catch (err: any) {
      console.error("Error fetching pass full details:", err);
    } finally {
      setVerifying(false);
    }
  };

  // Reusable list renderer
  const renderPassList = (
    passesList: any[],
    isLoading: boolean,
    emptyMessage: string
  ) => {
    if (isLoading && passesList.length === 0) {
      return (
        <div className="py-12 flex flex-col items-center justify-center text-muted-foreground">
          <Loader2 className="h-6 w-6 animate-spin mb-2" />
          <p className="text-xs">Loading passes...</p>
        </div>
      );
    }

    if (passesList.length === 0) {
      return (
        <div className="py-12 text-center text-muted-foreground text-xs">
          {emptyMessage}
        </div>
      );
    }

    return (
      <div className="space-y-2 max-h-[520px] overflow-y-auto pr-1">
        {passesList.map((pass) => {
          const late = isOverdue(pass);
          const isSelected = selectedPass?.id === pass.id;

          return (
            <div
              key={pass.id}
              onClick={() => handleSelectPass(pass)}
              className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                isSelected
                  ? "border-primary bg-primary/5 shadow-sm ring-1 ring-primary/30"
                  : "hover:border-primary/40 hover:bg-muted/30 bg-card"
              }`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="h-11 w-11 rounded-lg border bg-muted overflow-hidden flex-shrink-0 flex items-center justify-center relative">
                  {pass.student_photo ? (
                    <img
                      src={getFullImageUrl(pass.student_photo)}
                      alt={pass.student_name}
                      className="h-full w-full object-cover"
                      onError={(e) => {
                        (e.currentTarget as HTMLElement).style.display = "none";
                        const fallback = e.currentTarget.parentElement?.querySelector(".avatar-fallback");
                        if (fallback) (fallback as HTMLElement).classList.remove("hidden");
                      }}
                    />
                  ) : null}
                  <div
                    className={`avatar-fallback h-full w-full items-center justify-center bg-primary/10 text-primary font-bold text-sm ${
                      pass.student_photo ? "hidden" : "flex"
                    }`}
                  >
                    {pass.student_name ? pass.student_name.charAt(0).toUpperCase() : <User className="h-5 w-5 text-muted-foreground/50" />}
                  </div>
                </div>

                <div className="space-y-0.5 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-sm text-foreground truncate max-w-[200px] sm:max-w-none">
                      {pass.student_name}
                    </span>
                    {getStatusBadge(pass.status)}
                    {late && (
                      <Badge className="bg-red-500/15 text-red-600 border-red-500/30 text-[10px] animate-bounce">
                        OVERDUE
                      </Badge>
                    )}
                  </div>

                  <div className="text-xs text-muted-foreground flex items-center gap-1.5 truncate">
                    <span className="font-mono text-foreground/80 font-medium">{pass.student_usn}</span>
                    <span>•</span>
                    <span className="truncate">{pass.hostel_name || "Hostel"}</span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  // Reusable pagination toolbar
  const renderPagination = (
    currentPage: number,
    totalPages: number,
    onPageChange: (newPage: number) => void,
    isLoading: boolean
  ) => {
    if (totalPages <= 1) return null;

    return (
      <div className="flex items-center justify-between pt-3 border-t text-xs text-muted-foreground mt-3">
        <span>
          Page {currentPage} of {totalPages}
        </span>
        <div className="flex items-center gap-1.5">
          <Button
            variant="outline"
            size="sm"
            disabled={currentPage <= 1 || isLoading}
            onClick={() => onPageChange(currentPage - 1)}
            className="h-7 px-2 text-xs gap-1"
          >
            <ChevronLeft className="h-3.5 w-3.5" /> Previous
          </Button>
          <span className="px-2.5 py-1 text-xs font-semibold bg-muted rounded border">
            {currentPage}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={currentPage >= totalPages || isLoading}
            onClick={() => onPageChange(currentPage + 1)}
            className="h-7 px-2 text-xs gap-1"
          >
            Next <ChevronRight className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    );
  };

  const isCurrentTabLoading =
    activeTab === "outside" ? outsideLoading : activeTab === "approved" ? approvedLoading : historyLoading;

  return (
    <div className="w-full max-w-full space-y-6">
      {/* Header & Quick Action */}
      <Card className="border shadow-sm bg-card text-card-foreground p-6 rounded-2xl">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <ShieldCheck className="h-7 w-7 text-primary" />
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
                Security Gate Pass Scanner
              </h1>
            </div>
            <p className="text-muted-foreground text-sm max-w-2xl">
              Scan student digital QR gate passes at the main security gate to process instant Check-Outs and Check-Ins with real-time identity & return verification.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Button
              size="lg"
              onClick={() => setScannerOpen(true)}
              className="bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm font-semibold gap-2 transition-all transform hover:scale-105"
            >
              <QrCode className="h-5 w-5" />
              Scan Student QR
            </Button>

            <Button
              variant="outline"
              size="icon"
              onClick={refreshActiveData}
              disabled={isCurrentTabLoading || statsLoading}
              className="border-input hover:bg-muted text-foreground"
              title="Refresh Passes"
            >
              <RefreshCw className={`h-4 w-4 ${isCurrentTabLoading || statsLoading ? "animate-spin" : ""}`} />
            </Button>
          </div>
        </div>
      </Card>

      {/* Metrics Row (KPIs fetched first) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card className="border shadow-sm">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
                Currently Outside
              </p>
              <h3 className="text-2xl font-bold text-blue-600 dark:text-blue-400 mt-1">
                {stats.outside}
              </h3>
            </div>
            <div className="p-3 bg-blue-100 dark:bg-blue-950 rounded-xl text-blue-600">
              <LogOut className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>

        <Card className="border shadow-sm">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
                Approved (Waiting)
              </p>
              <h3 className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">
                {stats.approved}
              </h3>
            </div>
            <div className="p-3 bg-emerald-100 dark:bg-emerald-950 rounded-xl text-emerald-600">
              <CheckCircle2 className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>

        <Card className="border shadow-sm">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
                Overdue Returns
              </p>
              <h3 className="text-2xl font-bold text-amber-600 dark:text-amber-400 mt-1">
                {stats.overdue}
              </h3>
            </div>
            <div className="p-3 bg-amber-100 dark:bg-amber-950 rounded-xl text-amber-600">
              <AlertTriangle className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>

        <Card className="border shadow-sm">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
                Today's Total Movement
              </p>
              <h3 className="text-2xl font-bold text-foreground mt-1">
                {stats.today_movement}
              </h3>
            </div>
            <div className="p-3 bg-muted rounded-xl text-muted-foreground">
              <Clock className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Manual Lookup / Token Search (Full-width directly below KPI metric cards) */}
      <Card className="border shadow-sm">
        <CardHeader className="pb-2 pt-4 px-4 sm:px-6">
          <CardTitle className="text-sm sm:text-base font-semibold flex items-center gap-2">
            <Search className="h-4 w-4 text-primary" />
            Manual Lookup / Token Search
          </CardTitle>
          <CardDescription className="text-xs">
            Enter Gate Pass Token (e.g. GP-XXXXXX), USN, or Student Name.
          </CardDescription>
        </CardHeader>
        <CardContent className="pb-4 px-4 sm:px-6 pt-1">
          <form onSubmit={handleSearch} className="flex gap-2">
            <Input
              placeholder="Enter Token or USN..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="font-mono text-sm"
            />
            <Button type="submit" disabled={verifying || !searchQuery.trim()} className="min-w-[90px]">
              {verifying ? <Loader2 className="h-4 w-4 animate-spin" /> : "Verify"}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Gate Movement Register (Full Page Width) */}
      <div className="w-full space-y-4">
        <Card className="border shadow-sm w-full">
          <CardHeader className="pb-3 border-b">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div>
                <CardTitle className="text-base font-semibold">
                  Gate Movement Register
                </CardTitle>
                <CardDescription className="text-xs">
                  Live feed of students outside campus, approved passes, and today's logs.
                </CardDescription>
              </div>
            </div>
          </CardHeader>

          <CardContent className="pt-4">
            <Tabs
              value={activeTab}
              onValueChange={(val: any) => setActiveTab(val)}
              className="w-full"
            >
              <TabsList className="grid grid-cols-3 mb-4">
                <TabsTrigger value="outside" className="text-xs">
                  Outside ({stats.outside})
                </TabsTrigger>
                <TabsTrigger value="approved" className="text-xs">
                  Approved ({stats.approved})
                </TabsTrigger>
                <TabsTrigger value="history" className="text-xs">
                  All Log
                </TabsTrigger>
              </TabsList>

              {/* Outside Tab Content */}
              <TabsContent value="outside" className="mt-0">
                {renderPassList(
                  outsidePasses,
                  outsideLoading,
                  "No students currently outside campus."
                )}
                {renderPagination(
                  outsidePage,
                  outsideTotalPages,
                  (p) => fetchOutsidePasses(p),
                  outsideLoading
                )}
              </TabsContent>

              {/* Approved Tab Content */}
              <TabsContent value="approved" className="mt-0">
                {renderPassList(
                  approvedPasses,
                  approvedLoading,
                  "No approved gate passes waiting for checkout."
                )}
                {renderPagination(
                  approvedPage,
                  approvedTotalPages,
                  (p) => fetchApprovedPasses(p),
                  approvedLoading
                )}
              </TabsContent>

              {/* All Log Tab Content */}
              <TabsContent value="history" className="mt-0 space-y-3">
                {/* Date Filter Bar */}
                <div className="p-3 bg-muted/30 border rounded-xl space-y-2">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                      <Calendar className="h-3.5 w-3.5 text-primary" />
                      <span>Filter by Date</span>
                      {(historyDateFrom || historyDateTo) && (
                        <Badge variant="secondary" className="text-[10px] h-5 px-1.5 font-normal">
                          Filtered
                        </Badge>
                      )}
                    </div>
                    {(historyDateFrom || historyDateTo) && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleClearDateFilter}
                        className="h-6 px-2 text-[11px] text-muted-foreground hover:text-foreground gap-1"
                      >
                        <RotateCcw className="h-3 w-3" /> Reset Filter
                      </Button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                    <div>
                      <label className="text-[11px] text-muted-foreground block mb-1 font-medium">
                        From Date:
                      </label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className={cn(
                              "w-full justify-start text-left font-normal text-xs h-9 bg-background border-input hover:bg-muted/50 transition-colors",
                              !historyDateFrom && "text-muted-foreground"
                            )}
                          >
                            <Calendar className="mr-2 h-3.5 w-3.5 text-primary shrink-0" />
                            {historyDateFrom ? (
                              <span className="font-medium text-foreground">
                                {format(new Date(historyDateFrom + "T00:00:00"), "dd/MM/yyyy")}
                              </span>
                            ) : (
                              <span>Pick from date</span>
                            )}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0 z-50 bg-popover border border-border shadow-xl rounded-xl" align="start">
                          <CalendarComponent
                            mode="single"
                            selected={historyDateFrom ? new Date(historyDateFrom + "T00:00:00") : undefined}
                            onSelect={(selectedDate) => {
                              if (selectedDate) {
                                const val = format(selectedDate, "yyyy-MM-dd");
                                handleApplyDateFilter(val, historyDateTo);
                              }
                            }}
                            disabled={(date) => {
                              const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
                              const today = new Date();
                              const todayOnly = new Date(today.getFullYear(), today.getMonth(), today.getDate());
                              if (d > todayOnly) return true;
                              if (historyDateTo) {
                                const toDateObj = new Date(historyDateTo + "T00:00:00");
                                if (d > toDateObj) return true;
                              }
                              return false;
                            }}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                    </div>

                    <div>
                      <label className="text-[11px] text-muted-foreground block mb-1 font-medium">
                        To Date:
                      </label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className={cn(
                              "w-full justify-start text-left font-normal text-xs h-9 bg-background border-input hover:bg-muted/50 transition-colors",
                              !historyDateTo && "text-muted-foreground"
                            )}
                          >
                            <Calendar className="mr-2 h-3.5 w-3.5 text-primary shrink-0" />
                            {historyDateTo ? (
                              <span className="font-medium text-foreground">
                                {format(new Date(historyDateTo + "T00:00:00"), "dd/MM/yyyy")}
                              </span>
                            ) : (
                              <span>Pick to date</span>
                            )}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0 z-50 bg-popover border border-border shadow-xl rounded-xl" align="start">
                          <CalendarComponent
                            mode="single"
                            selected={historyDateTo ? new Date(historyDateTo + "T00:00:00") : undefined}
                            onSelect={(selectedDate) => {
                              if (selectedDate) {
                                const val = format(selectedDate, "yyyy-MM-dd");
                                handleApplyDateFilter(historyDateFrom, val);
                              }
                            }}
                            disabled={(date) => {
                              const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
                              const today = new Date();
                              const todayOnly = new Date(today.getFullYear(), today.getMonth(), today.getDate());
                              if (d > todayOnly) return true;
                              if (historyDateFrom) {
                                const fromDateObj = new Date(historyDateFrom + "T00:00:00");
                                if (d < fromDateObj) return true;
                              }
                              return false;
                            }}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                  </div>
                  <p className="text-[11px] text-muted-foreground/80 italic">
                    {historyDateFrom || historyDateTo
                      ? `Showing logs ${historyDateFrom ? `from ${format(new Date(historyDateFrom + "T00:00:00"), "dd/MM/yyyy")}` : ''} ${historyDateTo ? `to ${format(new Date(historyDateTo + "T00:00:00"), "dd/MM/yyyy")}` : ''} (10 per page)`
                      : "Showing 10 most recent entries. Select dates above to filter past logs."}
                  </p>
                </div>

                {renderPassList(
                  historyPasses,
                  historyLoading,
                  historyDateFrom || historyDateTo
                    ? "No gate pass logs found for the selected date range."
                    : "No gate pass movement recorded yet."
                )}
                {renderPagination(
                  historyPage,
                  historyTotalPages,
                  (p) => fetchHistoryPasses(p),
                  historyLoading
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>

      {/* Selected Pass Inspection & Action Dialog */}
      <Dialog open={!!selectedPass} onOpenChange={(open) => !open && setSelectedPass(null)}>
        <DialogContent
          className={`w-[95vw] sm:max-w-lg border p-6 shadow-2xl rounded-2xl max-h-[90vh] overflow-y-auto ${
            theme === "dark"
              ? "bg-[#2c2c2e] border-[#3a3a3c] text-white"
              : "bg-white border-gray-200 text-gray-900"
          }`}
        >
          {selectedPass && (
            <div className="space-y-4">
              <DialogHeader className="pb-2 border-b">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-primary bg-primary/10 px-2 py-0.5 rounded">
                      {selectedPass.pass_token || `ID #${selectedPass.id}`}
                    </span>
                    {getStatusBadge(selectedPass.status)}
                  </div>
                </div>
                <DialogTitle className="text-lg font-bold mt-2 text-left">
                  {selectedPass.student_name}
                </DialogTitle>
                <p className="text-xs text-muted-foreground font-mono text-left">
                  USN: {selectedPass.student_usn}
                </p>
              </DialogHeader>

              {/* Student Photo & Vital Details */}
              <div className="flex items-center gap-4 p-3 bg-muted/40 rounded-xl border">
                <div className="h-20 w-20 rounded-lg overflow-hidden border bg-muted flex-shrink-0 flex items-center justify-center relative">
                  {selectedPass.student_photo ? (
                    <img
                      src={getFullImageUrl(selectedPass.student_photo)}
                      alt={selectedPass.student_name}
                      className="h-full w-full object-cover"
                      onError={(e) => {
                        (e.currentTarget as HTMLElement).style.display = "none";
                        const fallback = e.currentTarget.parentElement?.querySelector(".detail-avatar-fallback");
                        if (fallback) (fallback as HTMLElement).classList.remove("hidden");
                      }}
                    />
                  ) : null}
                  <div
                    className={`detail-avatar-fallback h-full w-full items-center justify-center bg-primary/10 text-primary font-bold text-xl ${
                      selectedPass.student_photo ? "hidden" : "flex"
                    }`}
                  >
                    {selectedPass.student_name ? selectedPass.student_name.charAt(0).toUpperCase() : <User className="h-10 w-10 text-muted-foreground/50" />}
                  </div>
                </div>

                <div className="space-y-1 text-xs">
                  <div className="flex items-center gap-1.5 text-foreground font-medium">
                    <Home className="h-3.5 w-3.5 text-muted-foreground" />
                    <span>
                      {selectedPass.hostel_name || "Hostel"} • Room:{" "}
                      {selectedPass.room_number || "N/A"}
                    </span>
                  </div>

                  {selectedPass.student_phone && (
                    <div className="flex items-center gap-1.5 text-muted-foreground">
                      <Phone className="h-3.5 w-3.5" />
                      <a
                        href={`tel:${selectedPass.student_phone}`}
                        className="hover:underline text-primary"
                      >
                        Student: {selectedPass.student_phone}
                      </a>
                    </div>
                  )}

                  {selectedPass.parent_phone && (
                    <div className="flex items-center gap-1.5 text-muted-foreground">
                      <Phone className="h-3.5 w-3.5 text-emerald-600" />
                      <a
                        href={`tel:${selectedPass.parent_phone}`}
                        className="hover:underline text-emerald-600 font-medium"
                      >
                        Parent: {selectedPass.parent_phone}
                      </a>
                    </div>
                  )}
                </div>
              </div>

              {/* Schedule & Timing details */}
              <div className="grid grid-cols-2 gap-2 text-xs bg-muted/20 p-3 rounded-lg border">
                <div>
                  <span className="text-muted-foreground block text-[11px]">Pass Type</span>
                  <span className="font-semibold capitalize text-foreground">
                    {selectedPass.pass_type || "Standard"}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[11px]">Approved By (Warden)</span>
                  <span className="font-medium text-emerald-600 dark:text-emerald-400">
                    {selectedPass.approved_by_name || selectedPass.warden_name || "Warden"}
                  </span>
                </div>

                <div className="col-span-2 border-t pt-2 mt-1">
                  <span className="text-muted-foreground block text-[11px]">Reason / Purpose</span>
                  <span className="text-foreground italic">{selectedPass.reason}</span>
                </div>

                <div className="border-t pt-2 mt-1">
                  <span className="text-muted-foreground block text-[11px]">Approved Out</span>
                  <span className="font-medium text-foreground">
                    {selectedPass.out_date} {selectedPass.out_time}
                  </span>
                </div>
                <div className="border-t pt-2 mt-1">
                  <span className="text-muted-foreground block text-[11px]">Expected Return</span>
                  <span className="font-medium text-foreground">
                    {selectedPass.expected_return_date} {selectedPass.expected_return_time}
                  </span>
                </div>

                {selectedPass.checked_out_by_name && (
                  <div className="border-t pt-2 mt-1 col-span-2 sm:col-span-1">
                    <span className="text-muted-foreground block text-[11px]">Checked Out By</span>
                    <span className="font-medium text-blue-600 dark:text-blue-400">
                      {selectedPass.checked_out_by_name}
                    </span>
                  </div>
                )}

                {selectedPass.checked_in_by_name && (
                  <div className="border-t pt-2 mt-1 col-span-2 sm:col-span-1">
                    <span className="text-muted-foreground block text-[11px]">Checked In By</span>
                    <span className="font-medium text-purple-600 dark:text-purple-400">
                      {selectedPass.checked_in_by_name}
                    </span>
                  </div>
                )}
              </div>

              {/* Overdue Warning if Checked Out and past return time */}
              {isOverdue(selectedPass) && (
                <div className="flex items-center gap-2 p-2.5 bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 rounded-lg text-amber-800 dark:text-amber-200 text-xs">
                  <AlertTriangle className="h-4 w-4 flex-shrink-0 text-amber-600 animate-bounce" />
                  <span>
                    <strong>Warning: Overdue Return!</strong> Student was expected to return by{" "}
                    {selectedPass.expected_return_date} {selectedPass.expected_return_time}.
                  </span>
                </div>
              )}

              {/* Actual Timestamp Log */}
              {(selectedPass.actual_out_time || selectedPass.actual_in_time) && (
                <div className="text-xs space-y-1 bg-muted/40 p-2.5 rounded-lg border">
                  {selectedPass.actual_out_time && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Checked Out:</span>
                      <span className="font-mono font-medium">
                        {formatSafeDateTime(selectedPass.actual_out_time)}
                      </span>
                    </div>
                  )}
                  {selectedPass.actual_in_time && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Checked In:</span>
                      <span className="font-mono font-medium">
                        {formatSafeDateTime(selectedPass.actual_in_time)}
                      </span>
                    </div>
                  )}
                  {selectedPass.is_late && (
                    <div className="flex justify-between text-red-600 font-semibold">
                      <span>Late Duration:</span>
                      <span>{selectedPass.late_duration_minutes} Minutes</span>
                    </div>
                  )}
                </div>
              )}

              {/* Security Note */}
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">
                  Security Note / Bag Check / Comments (Optional):
                </label>
                <Textarea
                  placeholder="e.g. Accompanied by parent / Luggage checked / Late due to traffic..."
                  value={securityNote}
                  onChange={(e) => setSecurityNote(e.target.value)}
                  rows={2}
                  className="text-xs"
                />
              </div>

              {/* Action Buttons */}
              <div className="pt-2 flex flex-col sm:flex-row gap-2">
                {selectedPass.status === "approved" && (
                  <Button
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold shadow-md gap-2"
                    size="lg"
                    onClick={handleCheckOut}
                    disabled={actionLoading}
                  >
                    {actionLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <LogOut className="h-4 w-4" />
                    )}
                    Check Out (Allow Exit)
                  </Button>
                )}

                {selectedPass.status === "checked_out" && (
                  <Button
                    className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold shadow-md gap-2"
                    size="lg"
                    onClick={handleCheckIn}
                    disabled={actionLoading}
                  >
                    {actionLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <LogIn className="h-4 w-4" />
                    )}
                    Check In (Verify Return)
                  </Button>
                )}

                {selectedPass.status === "checked_in" && (
                  <div className="w-full text-center py-2 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 border border-emerald-300 dark:border-emerald-800">
                    <CheckCircle2 className="h-4 w-4" /> Gate Pass Completed & In Hostel
                  </div>
                )}

                {selectedPass.status === "rejected" && (
                  <div className="w-full text-center py-2 bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-400 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 border border-red-300 dark:border-red-800">
                    <AlertCircle className="h-4 w-4" /> Request was Rejected by Warden
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Barcode / QR Scanner Modal */}
      <Dialog open={scannerOpen} onOpenChange={(open) => !open && setScannerOpen(false)}>
        <DialogContent
          className={`w-[92vw] sm:max-w-md border p-6 shadow-2xl rounded-2xl ${
            theme === "dark"
              ? "bg-[#2c2c2e] border-[#3a3a3c] text-white"
              : "bg-white border-gray-200 text-gray-900"
          }`}
        >
          <DialogHeader className="mb-2">
            <DialogTitle className="text-lg font-bold flex items-center gap-2">
              <QrCode className="h-5 w-5 text-primary" />
              Scan Student Gate Pass QR
            </DialogTitle>
          </DialogHeader>

          <div className="relative aspect-square w-full max-w-sm mx-auto bg-black rounded-xl overflow-hidden shadow-inner">
            <video
              ref={videoRef}
              onPlaying={() => setIsCameraStarting(false)}
              className="w-full h-full object-cover rounded-xl bg-black"
              playsInline
              muted
            />

            {!scanning && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 text-white p-4 text-center">
                <Camera className="h-12 w-12 mx-auto mb-2 opacity-60 animate-pulse" />
                <p className="text-sm font-medium">Position student QR code inside the frame</p>
                <p className="text-xs text-white/70 mt-1">Press "Start Camera" to scan</p>
              </div>
            )}

            {scanning && (
              <div className="absolute inset-0 pointer-events-none">
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[75%] h-[75%] border-2 border-emerald-400 rounded-xl shadow-[0_0_0_100vw_rgba(0,0,0,0.45)]">
                  <div className="w-full h-0.5 bg-emerald-400/80 shadow-[0_0_8px_#34d399] animate-pulse mt-1/2" />
                </div>
              </div>
            )}
          </div>

          {scanError && (
            <div className="flex items-center gap-2 mt-3 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-xs text-red-700 dark:text-red-300">
              <AlertCircle className="h-4 w-4 text-red-500 flex-shrink-0" />
              <span>{scanError}</span>
            </div>
          )}

          <div className="flex gap-2 mt-4">
            {!scanning ? (
              <Button
                onClick={startScanning}
                className="flex-1 bg-primary hover:bg-primary/90 text-white font-semibold"
              >
                <Camera className="h-4 w-4 mr-2" /> Start Camera
              </Button>
            ) : (
              <>
                {isCameraStarting ? (
                  <Button disabled className="flex-1">
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Starting...
                  </Button>
                ) : (
                  <>
                    {videoDevices.length > 1 && (
                      <Button onClick={handleSwitchCamera} variant="outline" className="flex-1 text-xs">
                        Switch Cam
                      </Button>
                    )}
                    <Button onClick={stopScanning} variant="outline" className="flex-1 text-xs">
                      Stop
                    </Button>
                  </>
                )}
              </>
            )}

            <Button onClick={() => setScannerOpen(false)} variant="ghost" className="text-xs">
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SecurityGatePassScanner;
