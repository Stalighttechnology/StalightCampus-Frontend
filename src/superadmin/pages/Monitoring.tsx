import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { useTheme } from "../../context/ThemeContext";
import {
  Server,
  HardDrive,
  Cpu,
  Database,
  Search,
  Filter,
  X,
  CheckCircle2,
  AlertTriangle,
  Activity,
  FileText,
  User,
  Globe,
  Calendar,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Check,
  AlertCircle,
  Copy,
  Clock,
  ExternalLink,
  ShieldAlert
} from "lucide-react";
import { API_BASE_URL } from "@/utils/config";
import { fetchWithSuperadminTokenRefresh } from "../../utils/authService";

interface OrgItem {
  id: number;
  name: string;
}

const Monitoring = () => {
  const { theme } = useTheme();

  // Active Tab: 'health' | 'errors' | 'audit'
  const [activeTab, setActiveTab] = useState<"health" | "errors" | "audit">("health");

  // Loading States
  const [loadingHealth, setLoadingHealth] = useState(true);
  const [loadingStats, setLoadingStats] = useState(true);
  const [loadingLogs, setLoadingLogs] = useState(true);
  const [loadingAudit, setLoadingAudit] = useState(true);

  // Data States
  const [healthData, setHealthData] = useState<any>(null);
  const [statsData, setStatsData] = useState<any>({
    critical_errors: 0,
    warnings: 0,
    api_failures: 0,
    failed_logins: 0,
    payment_errors: 0,
    database_errors: 0,
    resolved_today: 0
  });
  const [logs, setLogs] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [organizations, setOrganizations] = useState<OrgItem[]>([]);

  // Login history (last N) for current user
  const [loginHistory, setLoginHistory] = useState<any[]>([]);
  const [loadingLoginHistory, setLoadingLoginHistory] = useState<boolean>(false);

  // Pagination states
  const [logPage, setLogPage] = useState(1);
  const [logTotalPages, setLogTotalPages] = useState(1);
  const [logTotalCount, setLogTotalCount] = useState(0);
  const logPageSize = 15;

  const [auditPage, setAuditPage] = useState(1);
  const [auditTotalPages, setAuditTotalPages] = useState(1);
  const [auditTotalCount, setAuditTotalCount] = useState(0);
  const auditPageSize = 15;

  // Filter States for Error Logs
  const [errorSearch, setErrorSearch] = useState("");
  const [errorSeverity, setErrorSeverity] = useState("All");
  const [errorCategory, setErrorCategory] = useState("All");
  const [errorResolved, setErrorResolved] = useState("false"); // default to showing unresolved errors
  const [errorOrgId, setErrorOrgId] = useState("All");
  const [errorStatusCode, setErrorStatusCode] = useState("");
  const [errorStartDate, setErrorStartDate] = useState("");
  const [errorEndDate, setErrorEndDate] = useState("");

  // Filter States for Audit Logs
  const [auditSearch, setAuditSearch] = useState("");
  const [auditAction, setAuditAction] = useState("All");
  const [auditOrgId, setAuditOrgId] = useState("All");

  // Selected Log for detail drawer
  const [selectedLog, setSelectedLog] = useState<any | null>(null);
  const [selectedLogTab, setSelectedLogTab] = useState<"details" | "trace" | "payloads">("details");
  const [resolveNotes, setResolveNotes] = useState("");
  const [resolvingState, setResolvingState] = useState(false);

  // UI Toast state
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Trigger Toast helper
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3000);
  };

  // 1. Fetch Live Health status
  const fetchHealthData = async () => {
    setLoadingHealth(true);
    try {
      const response = await fetchWithSuperadminTokenRefresh(`${API_BASE_URL}/api/superadmin/monitoring/system/`, {
        headers: { "Authorization": `Bearer ${localStorage.getItem("superadmin_token")}` }
      });
      if (response.ok) {
        const res = await response.json();
        setHealthData(res);
      }
    } catch (error) {
      console.error("Error fetching health metrics:", error);
    } finally {
      setLoadingHealth(false);
    }
  };

  // 2. Fetch Organizations list (for filters)
  const fetchOrganizations = async () => {
    try {
      const response = await fetchWithSuperadminTokenRefresh(`${API_BASE_URL}/api/superadmin/organizations/?page_size=100`, {
        headers: { "Authorization": `Bearer ${localStorage.getItem("superadmin_token")}` }
      });
      if (response.ok) {
        const res = await response.json();
        setOrganizations(res.organizations || []);
      }
    } catch (error) {
      console.error("Error fetching organizations list:", error);
    }
  };

  // 3. Fetch Error stats
  const fetchStats = async () => {
    setLoadingStats(true);
    try {
      const response = await fetchWithSuperadminTokenRefresh(`${API_BASE_URL}/api/superadmin/system-logs/stats/`, {
        headers: { "Authorization": `Bearer ${localStorage.getItem("superadmin_token")}` }
      });
      if (response.ok) {
        const res = await response.json();
        setStatsData(res);
      }
    } catch (error) {
      console.error("Error fetching logs stats:", error);
    } finally {
      setLoadingStats(false);
    }
  };

  // 4. Fetch System Error Logs
  const fetchLogs = async (page = 1) => {
    setLoadingLogs(true);
    try {
      const queryParams = new URLSearchParams();
      queryParams.append("page", String(page));
      queryParams.append("page_size", String(logPageSize));

      if (errorSeverity !== "All") queryParams.append("severity", errorSeverity);
      if (errorCategory !== "All") queryParams.append("category", errorCategory);
      if (errorResolved !== "All") queryParams.append("resolved", errorResolved);
      if (errorOrgId !== "All") queryParams.append("org_id", errorOrgId);
      if (errorStatusCode) queryParams.append("status_code", errorStatusCode);
      if (errorSearch) queryParams.append("search", errorSearch);
      if (errorStartDate) queryParams.append("start_date", errorStartDate);
      if (errorEndDate) queryParams.append("end_date", errorEndDate);

      const response = await fetchWithSuperadminTokenRefresh(`${API_BASE_URL}/api/superadmin/system-logs/?${queryParams.toString()}`, {
        headers: { "Authorization": `Bearer ${localStorage.getItem("superadmin_token")}` }
      });
      if (response.ok) {
        const res = await response.json();
        setLogs(res.logs || []);
        setLogTotalPages(res.total_pages || 1);
        setLogTotalCount(res.total_count || 0);
        setLogPage(res.current_page || 1);
      }
    } catch (error) {
      console.error("Error fetching error logs:", error);
    } finally {
      setLoadingLogs(false);
    }
  };

  // 5. Fetch Audit Logs
  const fetchAuditLogs = async (page = 1) => {
    setLoadingAudit(true);
    try {
      const queryParams = new URLSearchParams();
      queryParams.append("page", String(page));
      queryParams.append("page_size", String(auditPageSize));

      if (auditOrgId !== "All") queryParams.append("org_id", auditOrgId);
      if (auditAction !== "All") queryParams.append("action", auditAction);
      if (auditSearch) queryParams.append("search", auditSearch);

      const response = await fetchWithSuperadminTokenRefresh(`${API_BASE_URL}/api/superadmin/system-logs/audit-logs/?${queryParams.toString()}`, {
        headers: { "Authorization": `Bearer ${localStorage.getItem("superadmin_token")}` }
      });
      if (response.ok) {
        const res = await response.json();
        setAuditLogs(res.audit_logs || []);
        setAuditTotalPages(res.total_pages || 1);
        setAuditTotalCount(res.total_count || 0);
        setAuditPage(res.current_page || 1);
      }
    } catch (error) {
      console.error("Error fetching audit logs:", error);
    } finally {
      setLoadingAudit(false);
    }
  };

  // 6. Fetch Login History (last 20 from backend) but frontend will show last 5
  const fetchLoginHistory = async () => {
    setLoadingLoginHistory(true);
    try {
      const currentSessionId = localStorage.getItem('session_id') || undefined;
      const response = await fetchWithSuperadminTokenRefresh(`${API_BASE_URL}/api/profile/sessions/`, {
        headers: {
          'Authorization': `Bearer ${sessionStorage.getItem('access_token')}`,
          ...(currentSessionId ? { 'X-Session-Id': currentSessionId } : {})
        }
      });
      if (response.ok) {
        const res = await response.json();
        setLoginHistory(res.sessions || []);
        // store currentSessionId from server response if provided
        if (res.currentSessionId) localStorage.setItem('session_id', res.currentSessionId);
      }
    } catch (error) {
      console.error('Error fetching login history:', error);
    } finally {
      setLoadingLoginHistory(false);
    }
  };

  const terminateSession = async (loginId: string) => {
    try {
      const currentSessionId = localStorage.getItem('session_id') || undefined;
      const response = await fetchWithSuperadminTokenRefresh(`${API_BASE_URL}/api/sessions/${loginId}/`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${sessionStorage.getItem('access_token')}`,
          ...(currentSessionId ? { 'X-Session-Id': currentSessionId } : {})
        }
      });
      if (response.ok) {
        const res = await response.json();
        showToast(res.message || 'Session terminated');
        // Refresh list
        fetchLoginHistory();
      } else {
        const res = await response.json();
        showToast(res.message || 'Failed to terminate session');
      }
    } catch (error) {
      console.error('Error terminating session:', error);
      showToast('Network error');
    }
  };

  // 6. Handle Log Resolution toggle
  const handleResolveLog = async (logId: number, setResolved: boolean) => {
    setResolvingState(true);
    try {
      const response = await fetchWithSuperadminTokenRefresh(`${API_BASE_URL}/api/superadmin/system-logs/${logId}/resolve/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${localStorage.getItem("superadmin_token")}`
        },
        body: JSON.stringify({
          resolved: setResolved,
          notes: resolveNotes
        })
      });
      if (response.ok) {
        const res = await response.json();
        showToast(res.message || `Log marked as ${setResolved ? 'resolved' : 'unresolved'}`);

        // Refresh details drawer if open
        if (selectedLog && selectedLog.id === logId) {
          setSelectedLog({
            ...selectedLog,
            resolved: setResolved,
            notes: resolveNotes,
            resolved_at: setResolved ? new Date().toISOString() : null,
            resolved_by: setResolved ? "admin" : null
          });
        }

        // Refresh error list & stats
        fetchLogs(logPage);
        fetchStats();
      } else {
        const res = await response.json();
        showToast(res.error || "Failed to save resolution changes.");
      }
    } catch (error) {
      console.error("Error resolving log:", error);
      showToast("Server connection error.");
    } finally {
      setResolvingState(false);
    }
  };

  // Copy to Clipboard utility
  const copyToClipboard = (text: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    showToast("Copied to clipboard!");
  };

  // Reset log filters
  const resetLogFilters = () => {
    setErrorSearch("");
    setErrorSeverity("All");
    setErrorCategory("All");
    setErrorResolved("false");
    setErrorOrgId("All");
    setErrorStatusCode("");
    setErrorStartDate("");
    setErrorEndDate("");
    setLogPage(1);
  };

  // Reset audit filters
  const resetAuditFilters = () => {
    setAuditSearch("");
    setAuditAction("All");
    setAuditOrgId("All");
    setAuditPage(1);
  };

  // Mount logic
  useEffect(() => {
    fetchOrganizations();
    fetchHealthData();
    // System health auto-refresh every 60s
    const interval = setInterval(fetchHealthData, 60000);
    return () => clearInterval(interval);
  }, []);

  // Fetch error logs when filters / pages change
  useEffect(() => {
    if (activeTab === "errors") {
      fetchStats();
      fetchLogs(logPage);
    }
  }, [
    activeTab,
    logPage,
    errorSeverity,
    errorCategory,
    errorResolved,
    errorOrgId,
    errorStatusCode,
    errorStartDate,
    errorEndDate
  ]);

  // Fetch audit logs when filters / pages change
  useEffect(() => {
    if (activeTab === "audit") {
      fetchAuditLogs(auditPage);
      fetchLoginHistory();
    }
  }, [activeTab, auditPage, auditOrgId, auditAction]);

  // Load new search inputs after 500ms debounce
  useEffect(() => {
    if (activeTab === "errors") {
      const delayDebounceFn = setTimeout(() => {
        setLogPage(1);
        fetchLogs(1);
      }, 500);
      return () => clearTimeout(delayDebounceFn);
    }
  }, [errorSearch]);

  useEffect(() => {
    if (activeTab === "audit") {
      const delayDebounceFn = setTimeout(() => {
        setAuditPage(1);
        fetchAuditLogs(1);
      }, 500);
      return () => clearTimeout(delayDebounceFn);
    }
  }, [auditSearch]);

  // Prettify JSON object view
  const renderJsonPayload = (data: any) => {
    if (!data) return <span className="text-gray-400 dark:text-gray-600 italic">No Payload</span>;
    try {
      const parsed = typeof data === "string" ? JSON.parse(data) : data;
      if (Object.keys(parsed).length === 0) {
        return <span className="text-gray-400 dark:text-gray-600 italic">Empty JSON object</span>;
      }
      return (
        <pre className="bg-slate-950 dark:bg-black text-emerald-400 p-4 rounded-md font-mono text-xs overflow-auto max-h-80 border border-slate-800 leading-relaxed">
          {JSON.stringify(parsed, null, 2)}
        </pre>
      );
    } catch (e) {
      return (
        <pre className="bg-slate-950 dark:bg-black text-slate-300 p-4 rounded-md font-mono text-xs overflow-auto max-h-80 border border-slate-800 leading-relaxed">
          {String(data)}
        </pre>
      );
    }
  };

  // Formatting helpers
  const formatTime = (isoString: string) => {
    if (!isoString) return "";
    const date = new Date(isoString);
    return date.toLocaleString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit"
    });
  };

  // Badge styler for severity
  const getSeverityBadgeClass = (severity: string) => {
    const map: Record<string, string> = {
      Critical: "bg-red-100 text-red-800 border-red-200 dark:bg-red-950/40 dark:text-red-400 dark:border-red-900/50",
      High: "bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-950/40 dark:text-orange-400 dark:border-orange-900/50",
      Medium: "bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-950/40 dark:text-yellow-400 dark:border-yellow-900/50",
      Low: "bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-950/40 dark:text-blue-400 dark:border-blue-900/50",
      Info: "bg-slate-100 text-slate-800 border-slate-200 dark:bg-slate-800/40 dark:text-slate-400 dark:border-slate-700/50"
    };
    return map[severity] || "bg-slate-100 text-slate-800";
  };

  // Badge styler for categories
  const getCategoryColor = (category: string) => {
    const map: Record<string, string> = {
      API: "bg-indigo-100 text-indigo-800 dark:bg-indigo-950/40 dark:text-indigo-400",
      Frontend: "bg-pink-100 text-pink-800 dark:bg-pink-950/40 dark:text-pink-400",
      Database: "bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-400",
      Queue: "bg-cyan-100 text-cyan-800 dark:bg-cyan-950/40 dark:text-cyan-400",
      Auth: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-400",
      Payment: "bg-teal-100 text-teal-800 dark:bg-teal-950/40 dark:text-teal-400",
      Security: "bg-rose-100 text-rose-800 dark:bg-rose-950/40 dark:text-rose-400"
    };
    return map[category] || "bg-slate-100 text-slate-800";
  };

  return (
    <div className="space-y-6 relative min-h-screen pb-12">
      {/* Dynamic Floating Toast Alerts */}
      {toastMessage && (
        <div className="fixed top-5 right-5 z-[100] animate-bounce bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-950 px-4 py-3 rounded-lg shadow-2xl flex items-center space-x-2 border border-slate-700 dark:border-slate-300 font-medium">
          <CheckCircle2 className="w-5 h-5 text-emerald-500" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between pb-2 border-b border-gray-200 dark:border-gray-800">
        <div>
          <h1 className={`text-3xl font-extrabold tracking-tight ${theme === "dark" ? "text-white" : "text-gray-900"}`}>
            Stalight HQ Monitor
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Centralized health dashboard, error logger, and audit log viewer.
          </p>
        </div>

        {/* Tab Controls */}
        <div className="flex items-center bg-gray-100 dark:bg-slate-800 rounded-lg p-1.5 mt-4 md:mt-0 shadow-inner">
          <button
            onClick={() => setActiveTab("health")}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-md text-xs font-semibold tracking-wide transition-all ${activeTab === "health"
                ? "bg-white dark:bg-slate-900 shadow-sm text-blue-600 dark:text-blue-400"
                : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
              }`}
          >
            <Activity className="w-3.5 h-3.5" />
            <span>Live Health</span>
          </button>
          <button
            onClick={() => setActiveTab("errors")}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-md text-xs font-semibold tracking-wide transition-all ${activeTab === "errors"
                ? "bg-white dark:bg-slate-900 shadow-sm text-blue-600 dark:text-blue-400"
                : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
              }`}
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>Error Logs</span>
          </button>
          <button
            onClick={() => setActiveTab("audit")}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-md text-xs font-semibold tracking-wide transition-all ${activeTab === "audit"
                ? "bg-white dark:bg-slate-900 shadow-sm text-blue-600 dark:text-blue-400"
                : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
              }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Audit Logs</span>
          </button>
        </div>
      </div>

      {/* Tab Content Panel */}
      <div className="mt-6">
        {/* TAB 1: LIVE HEALTH STATUS */}
        {activeTab === "health" && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className={`text-lg font-bold ${theme === "dark" ? "text-white" : "text-gray-900"}`}>
                Server Resources
              </h2>
              <button
                onClick={fetchHealthData}
                disabled={loadingHealth}
                className="flex items-center space-x-1 text-xs text-blue-600 dark:text-blue-400 hover:underline disabled:opacity-50"
              >
                <RefreshCw className={`w-3 h-3 ${loadingHealth ? "animate-spin" : ""}`} />
                <span>Refresh Live Status</span>
              </button>
            </div>

            {loadingHealth && !healthData ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-pulse">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="h-32 bg-gray-200 dark:bg-slate-800 rounded-xl"></div>
                ))}
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  {/* CPU Usage Card */}
                  <Card className="border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900/50 shadow-sm hover:shadow-md transition-all">
                    <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                      <CardTitle className="text-xs font-semibold text-gray-500 uppercase tracking-wider">CPU Info</CardTitle>
                      <Cpu className="w-4 h-4 text-blue-500 animate-pulse" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-3xl font-bold text-gray-900 dark:text-white">
                        {healthData?.cpu?.usage}%
                      </div>
                      <div className="mt-2 w-full bg-gray-100 dark:bg-slate-800 rounded-full h-1.5">
                        <div
                          className="bg-blue-500 h-1.5 rounded-full transition-all duration-500"
                          style={{ width: `${healthData?.cpu?.usage || 0}%` }}
                        ></div>
                      </div>
                      <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-2">
                        {healthData?.cpu?.cores}
                      </p>
                    </CardContent>
                  </Card>

                  {/* Memory Usage Card */}
                  <Card className="border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900/50 shadow-sm hover:shadow-md transition-all">
                    <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                      <CardTitle className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Memory RAM</CardTitle>
                      <Server className="w-4 h-4 text-purple-500" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-3xl font-bold text-gray-900 dark:text-white">
                        {healthData?.memory?.percent}%
                      </div>
                      <div className="mt-2 w-full bg-gray-100 dark:bg-slate-800 rounded-full h-1.5">
                        <div
                          className="bg-purple-500 h-1.5 rounded-full transition-all duration-500"
                          style={{ width: `${healthData?.memory?.percent || 0}%` }}
                        ></div>
                      </div>
                      <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-2">
                        Used {healthData?.memory?.used} of {healthData?.memory?.total}
                      </p>
                    </CardContent>
                  </Card>

                  {/* Disk Capacity Card */}
                  <Card className="border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900/50 shadow-sm hover:shadow-md transition-all">
                    <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                      <CardTitle className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Disk Storage</CardTitle>
                      <HardDrive className="w-4 h-4 text-emerald-500" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-3xl font-bold text-gray-900 dark:text-white">
                        {healthData?.disk?.percent}%
                      </div>
                      <div className="mt-2 w-full bg-gray-100 dark:bg-slate-800 rounded-full h-1.5">
                        <div
                          className="bg-emerald-500 h-1.5 rounded-full transition-all duration-500"
                          style={{ width: `${healthData?.disk?.percent || 0}%` }}
                        ></div>
                      </div>
                      <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-2">
                        Used {healthData?.disk?.used} of {healthData?.disk?.total}
                      </p>
                    </CardContent>
                  </Card>

                  {/* Connectivity Status Card */}
                  <Card className="border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900/50 shadow-sm hover:shadow-md transition-all">
                    <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                      <CardTitle className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Database & Cache</CardTitle>
                      <Database className="w-4 h-4 text-orange-500" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-lg font-bold text-gray-950 dark:text-slate-100 flex items-center space-x-1.5">
                        <span className="inline-block w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
                        <span className="truncate">{healthData?.database || "PostgreSQL Ready"}</span>
                      </div>
                      <div className="text-xs text-gray-600 dark:text-gray-400 mt-1 flex items-center space-x-1.5">
                        <span className="inline-block w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                        <span className="truncate">{healthData?.cache || "Redis Connected"}</span>
                      </div>
                      <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-2.5 pt-1 border-t border-slate-100 dark:border-slate-800/80">
                        Operational Status: 100% Ok
                      </p>
                    </CardContent>
                  </Card>
                </div>

                {/* Additional Health details */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  <div className="lg:col-span-2 border border-slate-100 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900/50 p-6 space-y-4">
                    <div className="flex items-center justify-between border-b border-gray-100 dark:border-slate-800 pb-3">
                      <h3 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider">
                        Operational Health Report
                      </h3>
                      <span className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-400 text-xs px-2.5 py-0.5 rounded-full font-semibold border border-emerald-200 dark:border-emerald-800">
                        All Systems Online
                      </span>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm pt-2">
                      <div className="p-3 bg-gray-50 dark:bg-slate-900 rounded-lg">
                        <span className="text-xs text-gray-400 block">Server Uptime</span>
                        <span className="font-semibold text-gray-900 dark:text-white mt-0.5 inline-block">Active</span>
                      </div>
                      <div className="p-3 bg-gray-50 dark:bg-slate-900 rounded-lg">
                        <span className="text-xs text-gray-400 block">Queue Runner</span>
                        <span className="font-semibold text-emerald-600 dark:text-emerald-400 mt-0.5 inline-block">Idle / Waiting</span>
                      </div>
                      <div className="p-3 bg-gray-50 dark:bg-slate-900 rounded-lg">
                        <span className="text-xs text-gray-400 block">Web Server</span>
                        <span className="font-semibold text-gray-900 dark:text-white mt-0.5 inline-block">Gunicorn / Nginx</span>
                      </div>
                    </div>
                  </div>

                  <div className="border border-slate-100 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900/50 p-6 space-y-4">
                    <h3 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider border-b border-gray-100 dark:border-slate-800 pb-3">
                      Telemetry Node
                    </h3>
                    <div className="space-y-3 text-xs text-gray-600 dark:text-gray-400">
                      <div className="flex justify-between">
                        <span>Environment:</span>
                        <span className="font-mono text-gray-900 dark:text-slate-100 font-semibold uppercase">Local Dev / Staging</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Node Version:</span>
                        <span className="font-mono text-gray-900 dark:text-slate-100">React v18 | Vite</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Django Version:</span>
                        <span className="font-mono text-gray-900 dark:text-slate-100">Python 3.11 | Django 4.2</span>
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* TAB 2: SENTRY-LIKE ERROR LOG FEED */}
        {activeTab === "errors" && (
          <div className="space-y-6">
            {/* ERROR STATISTICS WIDGET CARDS */}
            {loadingStats ? (
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 animate-pulse">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <div key={i} className="h-20 bg-gray-200 dark:bg-slate-800 rounded-xl"></div>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
                {/* Critical */}
                <div
                  onClick={() => {
                    setErrorSeverity("Critical");
                    setErrorResolved("false");
                    setLogPage(1);
                  }}
                  className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/30 p-4 rounded-xl shadow-sm hover:shadow-md cursor-pointer transition-all hover:-translate-y-0.5 group"
                >
                  <span className="text-xs font-semibold text-red-600 dark:text-red-400 block tracking-wider uppercase">Criticals</span>
                  <div className="flex items-baseline space-x-1.5 mt-1">
                    <span className="text-2xl font-bold text-red-700 dark:text-red-300">{statsData.critical_errors}</span>
                    <span className="text-[10px] text-red-500 dark:text-red-400">active</span>
                  </div>
                </div>

                {/* Warnings */}
                <div
                  onClick={() => {
                    setErrorSeverity("High");
                    setErrorResolved("false");
                    setLogPage(1);
                  }}
                  className="bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-900/30 p-4 rounded-xl shadow-sm hover:shadow-md cursor-pointer transition-all hover:-translate-y-0.5"
                >
                  <span className="text-xs font-semibold text-orange-600 dark:text-orange-400 block tracking-wider uppercase">Warnings</span>
                  <div className="flex items-baseline space-x-1.5 mt-1">
                    <span className="text-2xl font-bold text-orange-700 dark:text-orange-300">{statsData.warnings}</span>
                    <span className="text-[10px] text-orange-500 dark:text-orange-400">high/med</span>
                  </div>
                </div>

                {/* API Failures */}
                <div
                  onClick={() => {
                    setErrorCategory("API");
                    setErrorResolved("false");
                    setLogPage(1);
                  }}
                  className="bg-indigo-50 dark:bg-indigo-950/20 border border-indigo-200 dark:border-indigo-900/30 p-4 rounded-xl shadow-sm hover:shadow-md cursor-pointer transition-all hover:-translate-y-0.5"
                >
                  <span className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 block tracking-wider uppercase">API Fails</span>
                  <div className="flex items-baseline space-x-1.5 mt-1">
                    <span className="text-2xl font-bold text-indigo-700 dark:text-indigo-300">{statsData.api_failures}</span>
                    <span className="text-[10px] text-indigo-500 dark:text-indigo-400">errors</span>
                  </div>
                </div>

                {/* Failed Logins */}
                <div
                  onClick={() => {
                    setErrorCategory("Auth");
                    setErrorSearch("login");
                    setErrorResolved("false");
                    setLogPage(1);
                  }}
                  className="bg-pink-50 dark:bg-pink-950/20 border border-pink-200 dark:border-pink-900/30 p-4 rounded-xl shadow-sm hover:shadow-md cursor-pointer transition-all hover:-translate-y-0.5"
                >
                  <span className="text-xs font-semibold text-pink-600 dark:text-pink-400 block tracking-wider uppercase">Bad Logins</span>
                  <div className="flex items-baseline space-x-1.5 mt-1">
                    <span className="text-2xl font-bold text-pink-700 dark:text-pink-300">{statsData.failed_logins}</span>
                    <span className="text-[10px] text-pink-500 dark:text-pink-400">attempts</span>
                  </div>
                </div>

                {/* Payment Errors */}
                <div
                  onClick={() => {
                    setErrorCategory("Payment");
                    setErrorResolved("false");
                    setLogPage(1);
                  }}
                  className="bg-teal-50 dark:bg-teal-950/20 border border-teal-200 dark:border-teal-900/30 p-4 rounded-xl shadow-sm hover:shadow-md cursor-pointer transition-all hover:-translate-y-0.5"
                >
                  <span className="text-xs font-semibold text-teal-600 dark:text-teal-400 block tracking-wider uppercase">Payments</span>
                  <div className="flex items-baseline space-x-1.5 mt-1">
                    <span className="text-2xl font-bold text-teal-700 dark:text-teal-300">{statsData.payment_errors}</span>
                    <span className="text-[10px] text-teal-500 dark:text-teal-400">failures</span>
                  </div>
                </div>

                {/* DB Connection Errors */}
                <div
                  onClick={() => {
                    setErrorCategory("Database");
                    setErrorResolved("false");
                    setLogPage(1);
                  }}
                  className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/30 p-4 rounded-xl shadow-sm hover:shadow-md cursor-pointer transition-all hover:-translate-y-0.5"
                >
                  <span className="text-xs font-semibold text-amber-600 dark:text-amber-400 block tracking-wider uppercase">DB Errors</span>
                  <div className="flex items-baseline space-x-1.5 mt-1">
                    <span className="text-2xl font-bold text-amber-700 dark:text-amber-300">{statsData.database_errors}</span>
                    <span className="text-[10px] text-amber-500 dark:text-amber-400">issues</span>
                  </div>
                </div>

                {/* Resolved Today */}
                <div
                  onClick={() => {
                    setErrorResolved("true");
                    setLogPage(1);
                  }}
                  className="bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/30 p-4 rounded-xl shadow-sm hover:shadow-md cursor-pointer transition-all hover:-translate-y-0.5"
                >
                  <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 block tracking-wider uppercase">Done Today</span>
                  <div className="flex items-baseline space-x-1.5 mt-1">
                    <span className="text-2xl font-bold text-emerald-700 dark:text-emerald-300">{statsData.resolved_today}</span>
                    <span className="text-[10px] text-emerald-500 dark:text-emerald-400">fixed</span>
                  </div>
                </div>
              </div>
            )}

            {/* FILTERS PANEL */}
            <div className="bg-white dark:bg-slate-900 rounded-xl p-5 border border-gray-150 dark:border-slate-800 shadow-sm space-y-4">
              <div className="flex items-center space-x-2 text-gray-800 dark:text-slate-200 font-bold text-sm">
                <Filter className="w-4 h-4 text-blue-500" />
                <span>Search & Filter Incidents</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {/* Search Term */}
                <div>
                  <label className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide">Search Logs</label>
                  <div className="relative mt-1">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                      <Search className="h-3.5 w-3.5 text-gray-400" />
                    </span>
                    <input
                      type="text"
                      value={errorSearch}
                      onChange={(e) => setErrorSearch(e.target.value)}
                      placeholder="Search message, URL, stack trace..."
                      className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-gray-200 dark:border-slate-800 bg-transparent text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                </div>

                {/* Organization filter */}
                <div>
                  <label className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide">Tenant Org</label>
                  <select
                    value={errorOrgId}
                    onChange={(e) => {
                      setErrorOrgId(e.target.value);
                      setLogPage(1);
                    }}
                    className="w-full mt-1 py-1.5 px-3 text-xs rounded-lg border border-gray-200 dark:border-slate-800 bg-transparent text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    <option value="All">All Tenants</option>
                    {organizations.map((org) => (
                      <option key={org.id} value={org.id}>
                        {org.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Category filter */}
                <div>
                  <label className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide">Category</label>
                  <select
                    value={errorCategory}
                    onChange={(e) => {
                      setErrorCategory(e.target.value);
                      setLogPage(1);
                    }}
                    className="w-full mt-1 py-1.5 px-3 text-xs rounded-lg border border-gray-200 dark:border-slate-800 bg-transparent text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    <option value="All">All Categories</option>
                    <option value="API">API</option>
                    <option value="Frontend">Frontend</option>
                    <option value="Database">Database</option>
                    <option value="Queue">Queue</option>
                    <option value="Auth">Auth</option>
                    <option value="Payment">Payment</option>
                    <option value="Security">Security</option>
                  </select>
                </div>

                {/* Severity filter */}
                <div>
                  <label className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide">Severity</label>
                  <select
                    value={errorSeverity}
                    onChange={(e) => {
                      setErrorSeverity(e.target.value);
                      setLogPage(1);
                    }}
                    className="w-full mt-1 py-1.5 px-3 text-xs rounded-lg border border-gray-200 dark:border-slate-800 bg-transparent text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    <option value="All">All Severities</option>
                    <option value="Critical">Critical</option>
                    <option value="High">High</option>
                    <option value="Medium">Medium</option>
                    <option value="Low">Low</option>
                    <option value="Info">Info</option>
                  </select>
                </div>

                {/* Status Code */}
                <div>
                  <label className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide">Status Code</label>
                  <input
                    type="number"
                    value={errorStatusCode}
                    onChange={(e) => {
                      setErrorStatusCode(e.target.value);
                      setLogPage(1);
                    }}
                    placeholder="e.g. 500, 401"
                    className="w-full mt-1 py-1.5 px-3 text-xs rounded-lg border border-gray-200 dark:border-slate-800 bg-transparent text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>

                {/* Resolution Status */}
                <div>
                  <label className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide">Incident Status</label>
                  <select
                    value={errorResolved}
                    onChange={(e) => {
                      setErrorResolved(e.target.value);
                      setLogPage(1);
                    }}
                    className="w-full mt-1 py-1.5 px-3 text-xs rounded-lg border border-gray-200 dark:border-slate-800 bg-transparent text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    <option value="All">All Logs</option>
                    <option value="false">Active / Unresolved</option>
                    <option value="true">Resolved</option>
                  </select>
                </div>

                {/* Start Date */}
                <div>
                  <label className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide">Start Date</label>
                  <input
                    type="date"
                    value={errorStartDate}
                    onChange={(e) => {
                      setErrorStartDate(e.target.value);
                      setLogPage(1);
                    }}
                    className="w-full mt-1 py-1.5 px-3 text-xs rounded-lg border border-gray-200 dark:border-slate-800 bg-transparent text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>

                {/* End Date & Reset Button */}
                <div className="flex items-end space-x-2">
                  <div className="flex-1">
                    <label className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide">End Date</label>
                    <input
                      type="date"
                      value={errorEndDate}
                      onChange={(e) => {
                        setErrorEndDate(e.target.value);
                        setLogPage(1);
                      }}
                      className="w-full mt-1 py-1.5 px-3 text-xs rounded-lg border border-gray-200 dark:border-slate-800 bg-transparent text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                  <button
                    onClick={resetLogFilters}
                    className="py-1.5 px-3 text-xs font-semibold rounded-lg bg-gray-100 hover:bg-gray-250 dark:bg-slate-800 dark:hover:bg-slate-700 text-gray-700 dark:text-gray-200 transition-colors border border-gray-250 dark:border-slate-700"
                  >
                    Reset
                  </button>
                </div>
              </div>
            </div>

            {/* ERROR LOGS LIST TABLE */}
            <div className="bg-white dark:bg-slate-900 border border-gray-150 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-gray-50 dark:bg-slate-900/80 border-b border-gray-150 dark:border-slate-800 text-[11px] font-bold text-gray-500 dark:text-gray-400 tracking-wider uppercase">
                      <th className="px-6 py-4">Timestamp</th>
                      <th className="px-4 py-4">Severity</th>
                      <th className="px-4 py-4">Category</th>
                      <th className="px-6 py-4">Error Incident / Endpoint</th>
                      <th className="px-4 py-4">Status</th>
                      <th className="px-6 py-4">Tenant / Actor</th>
                      <th className="px-4 py-4">State</th>
                      <th className="px-6 py-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-slate-800/60 text-xs text-gray-700 dark:text-slate-300">
                    {loadingLogs ? (
                      [1, 2, 3, 4, 5].map((i) => (
                        <tr key={i} className="animate-pulse">
                          <td className="px-6 py-4"><div className="h-3 bg-gray-200 dark:bg-slate-800 rounded w-24"></div></td>
                          <td className="px-4 py-4"><div className="h-5 bg-gray-200 dark:bg-slate-800 rounded-full w-12"></div></td>
                          <td className="px-4 py-4"><div className="h-5 bg-gray-200 dark:bg-slate-800 rounded-full w-14"></div></td>
                          <td className="px-6 py-4">
                            <div className="h-3 bg-gray-200 dark:bg-slate-800 rounded w-60"></div>
                            <div className="h-2.5 bg-gray-200 dark:bg-slate-800 rounded w-40 mt-2"></div>
                          </td>
                          <td className="px-4 py-4"><div className="h-4 bg-gray-200 dark:bg-slate-800 rounded w-8"></div></td>
                          <td className="px-6 py-4"><div className="h-3 bg-gray-200 dark:bg-slate-800 rounded w-28"></div></td>
                          <td className="px-4 py-4"><div className="h-4 bg-gray-200 dark:bg-slate-800 rounded w-16"></div></td>
                          <td className="px-6 py-4 text-right"><div className="h-7 bg-gray-200 dark:bg-slate-800 rounded w-16 ml-auto"></div></td>
                        </tr>
                      ))
                    ) : logs.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">
                          <div className="flex flex-col items-center space-y-2">
                            <CheckCircle2 className="w-8 h-8 text-emerald-500" />
                            <span className="font-semibold text-sm">No unresolved incidents found!</span>
                            <span className="text-xs text-gray-400">Adjust filters or search criteria.</span>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      logs.map((log) => (
                        <tr
                          key={log.id}
                          className="hover:bg-slate-50 dark:hover:bg-slate-850/30 transition-colors cursor-pointer group"
                          onClick={() => {
                            setSelectedLog(log);
                            setResolveNotes(log.notes || "");
                            setSelectedLogTab("details");
                          }}
                        >
                          <td className="px-6 py-4 whitespace-nowrap text-gray-500 dark:text-gray-400">
                            {formatTime(log.timestamp)}
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap">
                            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wide border uppercase ${getSeverityBadgeClass(log.severity)}`}>
                              {log.severity}
                            </span>
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-semibold tracking-wide uppercase ${getCategoryColor(log.category)}`}>
                              {log.category}
                            </span>
                          </td>
                          <td className="px-6 py-4 max-w-sm">
                            <div className="font-semibold text-gray-900 dark:text-white truncate group-hover:text-blue-600 dark:group-hover:text-blue-400">
                              {log.error_message}
                            </div>
                            <div className="text-[11px] text-gray-400 font-mono mt-0.5 truncate flex items-center space-x-1">
                              {log.method && <span className="font-bold text-gray-500 mr-1">{log.method}</span>}
                              <span className="truncate">{log.endpoint}</span>
                            </div>
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap">
                            {log.status_code ? (
                              <span className={`font-mono font-bold px-1.5 py-0.5 rounded ${log.status_code >= 500 ? 'bg-red-50 text-red-600 dark:bg-red-950/20' : 'bg-gray-100 text-gray-700 dark:bg-slate-800 dark:text-gray-300'}`}>
                                {log.status_code}
                              </span>
                            ) : (
                              <span className="text-gray-400">-</span>
                            )}
                          </td>
                          <td className="px-6 py-4 max-w-[160px]">
                            <div className="font-medium text-gray-800 dark:text-slate-200 truncate">{log.org?.name || "Stalight HQ"}</div>
                            {log.user && (
                              <div className="text-[10px] text-gray-400 truncate mt-0.5 flex items-center space-x-0.5">
                                <User className="w-2.5 h-2.5" />
                                <span className="truncate">{log.user.name || log.user.email}</span>
                              </div>
                            )}
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap">
                            {log.resolved ? (
                              <span className="inline-flex items-center space-x-1 text-emerald-600 dark:text-emerald-400 font-semibold text-[11px]">
                                <Check className="w-3.5 h-3.5" />
                                <span>Resolved</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center space-x-1 text-red-500 dark:text-red-400 font-semibold text-[11px]">
                                <AlertCircle className="w-3.5 h-3.5" />
                                <span>Active</span>
                              </span>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedLog(log);
                                setResolveNotes(log.notes || "");
                                setSelectedLogTab("details");
                              }}
                              className="text-xs font-semibold bg-gray-100 hover:bg-blue-600 hover:text-white dark:bg-slate-800 dark:hover:bg-blue-500 text-gray-700 dark:text-gray-300 px-3 py-1.5 rounded-lg transition-colors border border-transparent dark:border-slate-700"
                            >
                              Inspect
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* PAGINATION PANEL */}
              {logTotalPages > 1 && (
                <div className="bg-gray-50 dark:bg-slate-900 border-t border-gray-150 dark:border-slate-800 px-6 py-4 flex items-center justify-between">
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    Showing page <span className="font-semibold text-gray-800 dark:text-slate-200">{logPage}</span> of{" "}
                    <span className="font-semibold text-gray-800 dark:text-slate-200">{logTotalPages}</span> (
                    <span className="font-semibold">{logTotalCount}</span> total errors)
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => setLogPage((p) => Math.max(1, p - 1))}
                      disabled={logPage === 1}
                      className="p-1.5 rounded bg-white dark:bg-slate-800 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-slate-700 disabled:opacity-40"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    {[...Array(logTotalPages)].map((_, i) => {
                      const pageNum = i + 1;
                      // Display active page, first, last and immediate neighbors
                      if (
                        pageNum === 1 ||
                        pageNum === logTotalPages ||
                        Math.abs(pageNum - logPage) <= 1
                      ) {
                        return (
                          <button
                            key={pageNum}
                            onClick={() => setLogPage(pageNum)}
                            className={`px-3 py-1 text-xs font-bold rounded ${logPage === pageNum
                                ? "bg-blue-600 text-white"
                                : "bg-white dark:bg-slate-800 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-slate-700 hover:bg-gray-50"
                              }`}
                          >
                            {pageNum}
                          </button>
                        );
                      }
                      if (pageNum === 2 || pageNum === logTotalPages - 1) {
                        return <span key={pageNum} className="text-gray-400 text-xs px-1">...</span>;
                      }
                      return null;
                    })}
                    <button
                      onClick={() => setLogPage((p) => Math.min(logTotalPages, p + 1))}
                      disabled={logPage === logTotalPages}
                      className="p-1.5 rounded bg-white dark:bg-slate-800 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-slate-700 disabled:opacity-40"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 3: AUDIT LOGS ACTIVITY TAB */}
        {activeTab === "audit" && (
          <div className="space-y-6">
            {/* AUDIT LOGS FILTERS PANEL */}
            <div className="bg-white dark:bg-slate-900 rounded-xl p-5 border border-gray-150 dark:border-slate-800 shadow-sm space-y-4">
              <div className="flex items-center space-x-2 text-gray-800 dark:text-slate-200 font-bold text-sm">
                <FileText className="w-4 h-4 text-blue-500" />
                <span>Search & Filter Team Activities</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {/* Search */}
                <div>
                  <label className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide">Keyword Search</label>
                  <div className="relative mt-1">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                      <Search className="h-3.5 w-3.5 text-gray-400" />
                    </span>
                    <input
                      type="text"
                      value={auditSearch}
                      onChange={(e) => setAuditSearch(e.target.value)}
                      placeholder="Search model, action, user email..."
                      className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-gray-200 dark:border-slate-800 bg-transparent text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                </div>

                {/* Organization */}
                <div>
                  <label className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide">Tenant Org</label>
                  <select
                    value={auditOrgId}
                    onChange={(e) => {
                      setAuditOrgId(e.target.value);
                      setAuditPage(1);
                    }}
                    className="w-full mt-1 py-1.5 px-3 text-xs rounded-lg border border-gray-200 dark:border-slate-800 bg-transparent text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    <option value="All">All Tenants</option>
                    {organizations.map((org) => (
                      <option key={org.id} value={org.id}>
                        {org.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Action Type */}
                <div>
                  <label className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide">Action Type</label>
                  <select
                    value={auditAction}
                    onChange={(e) => {
                      setAuditAction(e.target.value);
                      setAuditPage(1);
                    }}
                    className="w-full mt-1 py-1.5 px-3 text-xs rounded-lg border border-gray-200 dark:border-slate-800 bg-transparent text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    <option value="All">All Actions</option>
                    <option value="CREATE">CREATE</option>
                    <option value="UPDATE">UPDATE</option>
                    <option value="DELETE">DELETE</option>
                    <option value="LOGIN">LOGIN</option>
                    <option value="LOGOUT">LOGOUT</option>
                  </select>
                </div>

                {/* Reset Buttons */}
                <div className="flex items-end">
                  <button
                    onClick={resetAuditFilters}
                    className="w-full py-1.5 px-4 text-xs font-semibold rounded-lg bg-gray-100 hover:bg-gray-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-gray-700 dark:text-gray-200 transition-colors border border-gray-200 dark:border-slate-700"
                  >
                    Reset Filter Fields
                  </button>
                </div>
              </div>
            </div>

            {/* Recent Login Activity (last 5) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="border border-slate-100 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900/50 p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-bold text-gray-900 dark:text-white">Recent Login Activity</h3>
                  <button
                    onClick={fetchLoginHistory}
                    className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    Refresh
                  </button>
                </div>
                {loadingLoginHistory ? (
                  <div className="animate-pulse space-y-2">
                    {[1, 2, 3].map(i => (
                      <div key={i} className="h-8 bg-gray-100 dark:bg-slate-800 rounded" />
                    ))}
                  </div>
                ) : (loginHistory.length === 0 ? (
                  <div className="text-xs text-gray-500">No recent login activity.</div>
                ) : (
                  <ul className="space-y-2 text-xs">
                    {loginHistory.map((h: any) => (
                      <li key={h.id} className="flex items-center justify-between">
                        <div className="truncate">
                          <div className="font-semibold text-[13px] text-gray-800 dark:text-slate-200">{h.device || h.browser || 'Unknown'}</div>
                          <div className="text-gray-500 dark:text-gray-400 text-[11px]">{formatTime(h.last_seen_at || h.created_at)} • {h.ip_address || '-'}</div>
                        </div>
                        <div className="ml-3">
                          <button
                            onClick={() => terminateSession(h.id)}
                            disabled={!!h.is_current}
                            className={`text-xs px-2 py-1 rounded ${h.is_current ? 'bg-gray-200 text-gray-500 cursor-not-allowed' : 'bg-red-50 text-red-700 hover:bg-red-100'}`}
                          >
                            {h.is_current ? 'Current' : 'Logout'}
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                ))}
              </div>
            </div>

            {/* AUDIT LOG TABLE */}
            <div className="bg-white dark:bg-slate-900 border border-gray-150 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-gray-50 dark:bg-slate-900/80 border-b border-gray-150 dark:border-slate-800 text-[11px] font-bold text-gray-500 dark:text-gray-400 tracking-wider uppercase">
                      <th className="px-6 py-4">Timestamp</th>
                      <th className="px-4 py-4">Action</th>
                      <th className="px-6 py-4">Target Resource</th>
                      <th className="px-6 py-4">Tenant / User</th>
                      <th className="px-6 py-4">Client IP</th>
                      <th className="px-6 py-4">Incident Details</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-slate-800/60 text-xs text-gray-700 dark:text-slate-300">
                    {loadingAudit ? (
                      [1, 2, 3, 4, 5].map((i) => (
                        <tr key={i} className="animate-pulse">
                          <td className="px-6 py-4"><div className="h-3 bg-gray-200 dark:bg-slate-800 rounded w-24"></div></td>
                          <td className="px-4 py-4"><div className="h-5 bg-gray-200 dark:bg-slate-800 rounded-full w-12"></div></td>
                          <td className="px-6 py-4"><div className="h-3 bg-gray-200 dark:bg-slate-800 rounded w-32"></div></td>
                          <td className="px-6 py-4"><div className="h-3 bg-gray-200 dark:bg-slate-800 rounded w-36"></div></td>
                          <td className="px-6 py-4"><div className="h-3 bg-gray-200 dark:bg-slate-800 rounded w-20"></div></td>
                          <td className="px-6 py-4"><div className="h-3 bg-gray-200 dark:bg-slate-800 rounded w-48"></div></td>
                        </tr>
                      ))
                    ) : auditLogs.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">
                          <div className="flex flex-col items-center space-y-2">
                            <FileText className="w-8 h-8 text-gray-300" />
                            <span className="font-semibold text-sm">No activity audit logs found</span>
                            <span className="text-xs text-gray-400">Adjust filters or search parameters.</span>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      auditLogs.map((log) => (
                        <tr key={log.id} className="hover:bg-slate-50 dark:hover:bg-slate-850/30 transition-colors">
                          <td className="px-6 py-4 whitespace-nowrap text-gray-500 dark:text-gray-400">
                            {formatTime(log.timestamp)}
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap font-bold">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] tracking-wide uppercase ${log.action === "DELETE"
                                  ? "bg-red-100 text-red-800 dark:bg-red-950/40 dark:text-red-400"
                                  : log.action === "CREATE"
                                    ? "bg-green-100 text-green-800 dark:bg-green-950/40 dark:text-green-400"
                                    : log.action === "UPDATE"
                                      ? "bg-blue-100 text-blue-800 dark:bg-blue-950/40 dark:text-blue-400"
                                      : "bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-350"
                                }`}
                            >
                              {log.action}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="font-semibold text-gray-800 dark:text-slate-200">{log.model_name}</span>
                            {log.object_id && (
                              <span className="ml-1.5 text-gray-400 font-mono text-[10px] bg-gray-100 dark:bg-slate-800 px-1 rounded">
                                ID: {log.object_id}
                              </span>
                            )}
                          </td>
                          <td className="px-6 py-4 max-w-[180px]">
                            <div className="font-medium text-gray-800 dark:text-slate-200 truncate">{log.org?.name || "Stalight HQ"}</div>
                            {log.user && (
                              <div className="text-[10px] text-gray-400 truncate mt-0.5">
                                {log.user.name || log.user.email}
                              </div>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap font-mono text-gray-500 dark:text-gray-400">
                            {log.ip_address || "-"}
                          </td>
                          <td className="px-6 py-4 max-w-sm text-gray-600 dark:text-gray-400 font-mono text-[11px] truncate">
                            {typeof log.details === "object" ? JSON.stringify(log.details) : log.details}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* PAGINATION PANEL */}
              {auditTotalPages > 1 && (
                <div className="bg-gray-50 dark:bg-slate-900 border-t border-gray-150 dark:border-slate-800 px-6 py-4 flex items-center justify-between">
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    Showing page <span className="font-semibold text-gray-800 dark:text-slate-200">{auditPage}</span> of{" "}
                    <span className="font-semibold text-gray-800 dark:text-slate-200">{auditTotalPages}</span> (
                    <span className="font-semibold">{auditTotalCount}</span> total operations)
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => setAuditPage((p) => Math.max(1, p - 1))}
                      disabled={auditPage === 1}
                      className="p-1.5 rounded bg-white dark:bg-slate-800 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-slate-700 disabled:opacity-40"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    {[...Array(auditTotalPages)].map((_, i) => {
                      const pageNum = i + 1;
                      if (
                        pageNum === 1 ||
                        pageNum === auditTotalPages ||
                        Math.abs(pageNum - auditPage) <= 1
                      ) {
                        return (
                          <button
                            key={pageNum}
                            onClick={() => setAuditPage(pageNum)}
                            className={`px-3 py-1 text-xs font-bold rounded ${auditPage === pageNum
                                ? "bg-blue-600 text-white"
                                : "bg-white dark:bg-slate-800 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-slate-700 hover:bg-gray-50"
                              }`}
                          >
                            {pageNum}
                          </button>
                        );
                      }
                      if (pageNum === 2 || pageNum === auditTotalPages - 1) {
                        return <span key={pageNum} className="text-gray-400 text-xs px-1">...</span>;
                      }
                      return null;
                    })}
                    <button
                      onClick={() => setAuditPage((p) => Math.min(auditTotalPages, p + 1))}
                      disabled={auditPage === auditTotalPages}
                      className="p-1.5 rounded bg-white dark:bg-slate-800 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-slate-700 disabled:opacity-40"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* DETAIL SIDE DRAWER PANEL */}
      {selectedLog && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 transition-opacity"
            onClick={() => setSelectedLog(null)}
          ></div>

          {/* Drawer container */}
          <div
            className="fixed inset-y-0 right-0 z-50 w-full max-w-2xl bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col transform transition-transform duration-300 ease-in-out translation-x-0"
          >
            {/* Header */}
            <div className="p-6 border-b border-gray-100 dark:border-slate-800 bg-gray-50 dark:bg-slate-900/50 flex justify-between items-start">
              <div className="space-y-1.5">
                <div className="flex items-center space-x-2">
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold border uppercase tracking-wider ${getSeverityBadgeClass(selectedLog.severity)}`}>
                    {selectedLog.severity}
                  </span>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${getCategoryColor(selectedLog.category)}`}>
                    {selectedLog.category}
                  </span>
                  {selectedLog.status_code && (
                    <span className="font-mono text-xs font-bold bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-200 px-1.5 py-0.5 rounded">
                      {selectedLog.status_code}
                    </span>
                  )}
                </div>
                <h3 className="text-base font-extrabold text-gray-900 dark:text-white leading-tight pr-8">
                  {selectedLog.error_message}
                </h3>
                <div className="text-xs text-gray-400 font-mono flex items-center space-x-1 mt-1">
                  {selectedLog.method && <span className="font-bold text-gray-600 dark:text-gray-300">{selectedLog.method}</span>}
                  <span className="truncate">{selectedLog.endpoint}</span>
                </div>
              </div>

              <button
                onClick={() => setSelectedLog(null)}
                className="p-1 rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Inner Drawer Tabs */}
            <div className="flex border-b border-gray-100 dark:border-slate-800 px-6 bg-white dark:bg-slate-900">
              <button
                onClick={() => setSelectedLogTab("details")}
                className={`py-3 px-4 text-xs font-semibold tracking-wide border-b-2 transition-all ${selectedLogTab === "details"
                    ? "border-blue-500 text-blue-600 dark:text-blue-400"
                    : "border-transparent text-gray-500 hover:text-gray-800 dark:hover:text-gray-300"
                  }`}
              >
                Incident Overview
              </button>
              {selectedLog.stack_trace && (
                <button
                  onClick={() => setSelectedLogTab("trace")}
                  className={`py-3 px-4 text-xs font-semibold tracking-wide border-b-2 transition-all ${selectedLogTab === "trace"
                      ? "border-blue-500 text-blue-600 dark:text-blue-400"
                      : "border-transparent text-gray-500 hover:text-gray-800 dark:hover:text-gray-300"
                    }`}
                >
                  Stack Trace
                </button>
              )}
              <button
                onClick={() => setSelectedLogTab("payloads")}
                className={`py-3 px-4 text-xs font-semibold tracking-wide border-b-2 transition-all ${selectedLogTab === "payloads"
                    ? "border-blue-500 text-blue-600 dark:text-blue-400"
                    : "border-transparent text-gray-500 hover:text-gray-800 dark:hover:text-gray-300"
                  }`}
              >
                Request & Response
              </button>
            </div>

            {/* Drawer Body Scroll Area */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* TAB A: OVERVIEW & RESOLUTION */}
              {selectedLogTab === "details" && (
                <div className="space-y-6">
                  {/* Grid Metadata */}
                  <div className="bg-slate-50 dark:bg-slate-950/40 rounded-xl p-5 border border-slate-150 dark:border-slate-800 grid grid-cols-2 gap-y-4 gap-x-6 text-xs">
                    <div>
                      <span className="text-[10px] font-semibold text-gray-400 uppercase block tracking-wider">Timestamp</span>
                      <span className="font-medium text-gray-900 dark:text-white mt-1 inline-block">
                        {formatTime(selectedLog.timestamp)}
                      </span>
                    </div>

                    <div>
                      <span className="text-[10px] font-semibold text-gray-400 uppercase block tracking-wider">Client IP Address</span>
                      <span className="font-mono text-gray-950 dark:text-slate-100 mt-1 inline-block">
                        {selectedLog.ip_address || "Unavailable"}
                      </span>
                    </div>

                    <div>
                      <span className="text-[10px] font-semibold text-gray-400 uppercase block tracking-wider">Organization Tenant</span>
                      <span className="font-medium text-gray-950 dark:text-slate-100 mt-1 inline-block">
                        {selectedLog.org?.name || "Stalight HQ (System-level)"}
                      </span>
                    </div>

                    <div>
                      <span className="text-[10px] font-semibold text-gray-400 uppercase block tracking-wider">User Actor Context</span>
                      <span className="font-medium text-gray-950 dark:text-slate-100 mt-1 inline-block">
                        {selectedLog.user ? `${selectedLog.user.name} (${selectedLog.user.email})` : "Anonymous Session"}
                      </span>
                    </div>

                    <div className="col-span-2 border-t border-slate-200 dark:border-slate-800/80 pt-3">
                      <span className="text-[10px] font-semibold text-gray-400 uppercase block tracking-wider">Device User Agent / Page URI</span>
                      <span className="font-mono text-[11px] text-gray-600 dark:text-gray-300 mt-1.5 inline-block leading-relaxed break-all">
                        {selectedLog.device_info || "No device metadata available."}
                      </span>
                    </div>
                  </div>

                  {/* Incident Resolution Status Section */}
                  <div className="border border-slate-150 dark:border-slate-800 bg-white dark:bg-slate-900/60 rounded-xl p-5 space-y-4 shadow-sm">
                    <div className="flex items-center space-x-2 border-b border-gray-100 dark:border-slate-800 pb-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                      <h4 className="text-xs font-bold text-gray-900 dark:text-white uppercase tracking-wider">
                        Incident Resolution
                      </h4>
                    </div>

                    {selectedLog.resolved ? (
                      <div className="space-y-3">
                        <div className="p-3 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/30 rounded-lg text-xs text-emerald-800 dark:text-emerald-400">
                          <p className="font-bold flex items-center space-x-1">
                            <span>✓ Resolved Log Item</span>
                          </p>
                          <p className="mt-1 text-[11px] text-emerald-700 dark:text-emerald-400/90">
                            Marked resolved by <span className="font-bold font-mono">{selectedLog.resolved_by || "system"}</span>{" "}
                            on {formatTime(selectedLog.resolved_at)}
                          </p>
                        </div>

                        {selectedLog.notes && (
                          <div className="p-3 bg-gray-50 dark:bg-slate-900 rounded-lg text-xs text-gray-700 dark:text-gray-300">
                            <span className="font-semibold block text-gray-400 text-[10px] uppercase">Resolution Notes:</span>
                            <span className="mt-1 block italic">{selectedLog.notes}</span>
                          </div>
                        )}

                        <button
                          onClick={() => handleResolveLog(selectedLog.id, false)}
                          disabled={resolvingState}
                          className="w-full text-xs font-semibold py-2 px-4 rounded-lg bg-gray-100 hover:bg-red-50 hover:text-red-600 dark:bg-slate-800 dark:hover:bg-red-950/20 dark:hover:text-red-400 border border-gray-200 dark:border-slate-700 text-gray-600 dark:text-gray-300 transition-colors disabled:opacity-40"
                        >
                          Reopen Log Incident (Mark Active)
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-3.5">
                        <div className="p-3 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/30 rounded-lg text-xs text-red-800 dark:text-red-400 font-semibold flex items-center space-x-1">
                          <AlertCircle className="w-4 h-4 text-red-500" />
                          <span>This incident is currently ACTIVE and unresolved.</span>
                        </div>

                        <div>
                          <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">
                            Troubleshooting / Action Notes
                          </label>
                          <textarea
                            value={resolveNotes}
                            onChange={(e) => setResolveNotes(e.target.value)}
                            placeholder="Document investigation steps or the fix here..."
                            rows={3}
                            className="w-full mt-1.5 p-3 text-xs rounded-lg border border-gray-200 dark:border-slate-800 bg-transparent text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                          />
                        </div>

                        <button
                          onClick={() => handleResolveLog(selectedLog.id, true)}
                          disabled={resolvingState}
                          className="w-full text-xs font-bold py-2.5 px-4 rounded-lg bg-blue-600 hover:bg-blue-700 text-white shadow-md transition-all flex items-center justify-center space-x-2 disabled:opacity-40"
                        >
                          {resolvingState ? (
                            <>
                              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                              <span>Saving...</span>
                            </>
                          ) : (
                            <>
                              <Check className="w-4 h-4" />
                              <span>Mark as Resolved</span>
                            </>
                          )}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* TAB B: SYSTEM EXCEPTION STACK TRACE */}
              {selectedLogTab === "trace" && selectedLog.stack_trace && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide">
                      Error Stack Trace
                    </span>
                    <button
                      onClick={() => copyToClipboard(selectedLog.stack_trace)}
                      className="flex items-center space-x-1 text-xs text-blue-600 dark:text-blue-400 hover:underline"
                    >
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy Trace</span>
                    </button>
                  </div>

                  <pre className="bg-slate-950 dark:bg-black text-red-400 p-5 rounded-xl font-mono text-[11px] overflow-auto max-h-[480px] leading-relaxed border border-slate-900 shadow-inner select-text whitespace-pre">
                    {selectedLog.stack_trace}
                  </pre>
                </div>
              )}

              {/* TAB C: REQUEST / RESPONSE PAYLOADS */}
              {selectedLogTab === "payloads" && (
                <div className="space-y-6">
                  {/* Request Payload */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Request Body & Query Parameters
                      </span>
                      {selectedLog.request_payload && (
                        <button
                          onClick={() => copyToClipboard(JSON.stringify(selectedLog.request_payload, null, 2))}
                          className="flex items-center space-x-1 text-xs text-blue-600 dark:text-blue-400 hover:underline"
                        >
                          <Copy className="w-3 h-3" />
                          <span>Copy Request</span>
                        </button>
                      )}
                    </div>
                    {renderJsonPayload(selectedLog.request_payload)}
                  </div>

                  {/* Response Payload */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Response Body Details
                      </span>
                      {selectedLog.response_payload && (
                        <button
                          onClick={() => copyToClipboard(JSON.stringify(selectedLog.response_payload, null, 2))}
                          className="flex items-center space-x-1 text-xs text-blue-600 dark:text-blue-400 hover:underline"
                        >
                          <Copy className="w-3 h-3" />
                          <span>Copy Response</span>
                        </button>
                      )}
                    </div>
                    {renderJsonPayload(selectedLog.response_payload)}
                  </div>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default Monitoring;