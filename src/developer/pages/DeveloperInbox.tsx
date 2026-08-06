import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTheme } from "../../context/ThemeContext";
import { API_BASE_URL } from "@/utils/config";
import {
  Bell,
  Megaphone,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Clock,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Inbox,
  AlertTriangle,
  Info,
  Zap,
} from "lucide-react";

interface Announcement {
  id: number;
  title: string;
  message: string;
  created_by_name: string;
  created_by_role: string;
  priority: "low" | "normal" | "high" | "urgent";
  created_at: string;
  expires_at: string | null;
  is_read: boolean;
  is_global: boolean;
  target_roles: string[];
}

const PRIORITY_CONFIG = {
  low:    { label: "Low",    icon: <Info size={13} />,          color: "text-slate-400",   bg: "bg-slate-100 dark:bg-slate-800",         border: "border-slate-200 dark:border-slate-700" },
  normal: { label: "Normal", icon: <Megaphone size={13} />,     color: "text-blue-500",    bg: "bg-blue-50 dark:bg-blue-900/20",          border: "border-blue-200 dark:border-blue-800/50" },
  high:   { label: "High",   icon: <AlertTriangle size={13} />, color: "text-orange-500",  bg: "bg-orange-50 dark:bg-orange-900/20",      border: "border-orange-200 dark:border-orange-800/50" },
  urgent: { label: "Urgent", icon: <Zap size={13} />,           color: "text-red-500",     bg: "bg-red-50 dark:bg-red-900/20",            border: "border-red-200 dark:border-red-800/50" },
};

const DeveloperInbox = () => {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [unreadCount, setUnreadCount] = useState(0);
  const [expanded, setExpanded] = useState<number | null>(null);
  const pageSize = 10;

  // Token refresh helper
  const getToken = async (): Promise<string | null> => {
    const token = localStorage.getItem("superadmin_token");
    const refresh = localStorage.getItem("superadmin_refresh");
    if (!token) return null;

    try {
      const payload = JSON.parse(atob(token.split(".")[1]));
      if (Date.now() < payload.exp * 1000 - 30000) return token;
    } catch { return token; }

    if (!refresh) return null;
    try {
      const res = await fetch(`${API_BASE_URL}/api/superadmin/token/refresh/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refresh }),
      });
      if (!res.ok) return null;
      const data = await res.json();
      if (data.access) {
        localStorage.setItem("superadmin_token", data.access);
        if (data.refresh) localStorage.setItem("superadmin_refresh", data.refresh);
        return data.access;
      }
    } catch { return null; }
    return null;
  };

  const fetchAnnouncements = useCallback(async (p = 1) => {
    setLoading(true);
    setError(null);
    try {
      const token = await getToken();
      if (!token) { setError("Session expired. Please log in again."); return; }

      const res = await fetch(
        `${API_BASE_URL}/api/announcements/?received_page=${p}&received_page_size=${pageSize}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (!res.ok) throw new Error(`Error ${res.status}`);
      const data = await res.json();

      const received = data.received_announcements || {};
      setAnnouncements(received.results || []);
      setTotalCount(received.count || 0);
      setUnreadCount(received.unread_count || 0);
    } catch (err: any) {
      setError(err.message || "Failed to load announcements");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAnnouncements(page); }, [page]);

  // Listen for WS refresh events
  useEffect(() => {
    const handler = () => fetchAnnouncements(page);
    window.addEventListener("refresh-announcements", handler);
    window.addEventListener("refresh-unread-count", handler);
    return () => {
      window.removeEventListener("refresh-announcements", handler);
      window.removeEventListener("refresh-unread-count", handler);
    };
  }, [page, fetchAnnouncements]);

  const markRead = async (id: number) => {
    try {
      const token = await getToken();
      if (!token) return;
      await fetch(`${API_BASE_URL}/api/announcements/${id}/read/`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      setAnnouncements((prev) =>
        prev.map((a) => (a.id === id ? { ...a, is_read: true } : a))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
      window.dispatchEvent(new CustomEvent("refresh-unread-count"));
    } catch {}
  };

  const handleExpand = (id: number) => {
    const isOpening = expanded !== id;
    setExpanded(isOpening ? id : null);
    if (isOpening) {
      const ann = announcements.find((a) => a.id === id);
      if (ann && !ann.is_read) markRead(id);
    }
  };

  const totalPages = Math.ceil(totalCount / pageSize);

  const formatDate = (iso: string) => {
    return new Date(iso).toLocaleString("en-IN", {
      day: "2-digit", month: "short", year: "numeric",
      hour: "2-digit", minute: "2-digit", hour12: true,
    });
  };

  return (
    <div className={`min-h-screen p-6 ${isDark ? "bg-[#0B0F19] text-white" : "bg-gray-50 text-gray-900"}`}>
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className={`p-3 rounded-2xl relative ${isDark ? "bg-violet-500/20 text-violet-400" : "bg-violet-100 text-violet-600"}`}>
              <Bell size={26} />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 h-5 w-5 text-[10px] font-bold flex items-center justify-center rounded-full bg-red-500 text-white">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Inbox</h1>
              <p className={`text-sm mt-0.5 ${isDark ? "text-gray-400" : "text-gray-500"}`}>
                Announcements from Stalight HQ
              </p>
            </div>
          </div>
          <button
            onClick={() => fetchAnnouncements(page)}
            className={`p-2.5 rounded-xl transition-colors ${isDark ? "hover:bg-white/8 text-gray-400" : "hover:bg-gray-100 text-gray-500"}`}
            title="Refresh"
          >
            <RefreshCw size={16} />
          </button>
        </div>

        {/* Stats row */}
        {!loading && !error && (
          <div className="grid grid-cols-2 gap-3 mb-6">
            <div className={`rounded-xl p-4 border ${isDark ? "bg-[#131928] border-white/8" : "bg-white border-gray-100"}`}>
              <p className={`text-xs font-medium mb-1 ${isDark ? "text-gray-400" : "text-gray-500"}`}>Total</p>
              <p className="text-2xl font-bold">{totalCount}</p>
            </div>
            <div className={`rounded-xl p-4 border ${isDark ? "bg-red-500/10 border-red-500/20" : "bg-red-50 border-red-100"}`}>
              <p className={`text-xs font-medium mb-1 ${isDark ? "text-red-300" : "text-red-500"}`}>Unread</p>
              <p className={`text-2xl font-bold ${isDark ? "text-red-300" : "text-red-500"}`}>{unreadCount}</p>
            </div>
          </div>
        )}

        {/* Content */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 size={28} className="animate-spin text-violet-400" />
          </div>
        ) : error ? (
          <div className={`flex flex-col items-center justify-center py-16 gap-3 rounded-2xl border ${isDark ? "bg-[#131928] border-white/8" : "bg-white border-gray-100"}`}>
            <AlertCircle size={28} className="text-red-400" />
            <p className="text-sm text-red-400">{error}</p>
            <button onClick={() => fetchAnnouncements(page)} className="text-xs text-violet-400 hover:underline">
              Try again
            </button>
          </div>
        ) : announcements.length === 0 ? (
          <div className={`flex flex-col items-center justify-center py-20 gap-3 rounded-2xl border ${isDark ? "bg-[#131928] border-white/8" : "bg-white border-gray-100"}`}>
            <Inbox size={32} className={isDark ? "text-gray-600" : "text-gray-300"} />
            <p className={`text-sm font-medium ${isDark ? "text-gray-500" : "text-gray-400"}`}>No announcements yet</p>
            <p className={`text-xs ${isDark ? "text-gray-600" : "text-gray-400"}`}>
              You'll receive messages from Stalight HQ here
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            <AnimatePresence mode="popLayout">
              {announcements.map((ann) => {
                const priority = PRIORITY_CONFIG[ann.priority] || PRIORITY_CONFIG.normal;
                const isOpen = expanded === ann.id;

                return (
                  <motion.div
                    key={ann.id}
                    layout
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    className={`rounded-2xl border overflow-hidden cursor-pointer transition-shadow ${
                      !ann.is_read
                        ? isDark
                          ? "bg-violet-500/5 border-violet-500/20 shadow-sm shadow-violet-500/5"
                          : "bg-violet-50/50 border-violet-200"
                        : isDark
                        ? "bg-[#131928] border-white/8"
                        : "bg-white border-gray-100"
                    }`}
                    onClick={() => handleExpand(ann.id)}
                  >
                    {/* Card header */}
                    <div className="p-4 flex items-start gap-3">
                      {/* Unread dot */}
                      <div className="mt-1.5 flex-shrink-0">
                        {ann.is_read ? (
                          <div className={`w-2 h-2 rounded-full ${isDark ? "bg-white/10" : "bg-gray-200"}`} />
                        ) : (
                          <div className="w-2 h-2 rounded-full bg-violet-500 shadow-sm shadow-violet-500" />
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <p className={`font-semibold text-sm leading-snug ${ann.is_read ? isDark ? "text-gray-200" : "text-gray-700" : ""}`}>
                            {ann.title}
                          </p>
                          <div className={`flex-shrink-0 flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full ${priority.bg} ${priority.color}`}>
                            {priority.icon}
                            {priority.label}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 mt-1.5">
                          <span className={`text-xs ${isDark ? "text-gray-500" : "text-gray-400"}`}>
                            From <span className="font-medium">{ann.created_by_name}</span>
                          </span>
                          <span className={isDark ? "text-gray-700" : "text-gray-300"}>·</span>
                          <span className={`text-xs flex items-center gap-1 ${isDark ? "text-gray-500" : "text-gray-400"}`}>
                            <Clock size={10} />
                            {formatDate(ann.created_at)}
                          </span>
                        </div>

                        {/* Preview when collapsed */}
                        {!isOpen && (
                          <p className={`text-xs mt-2 line-clamp-2 ${isDark ? "text-gray-400" : "text-gray-500"}`}>
                            {ann.message}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Expanded body */}
                    <AnimatePresence>
                      {isOpen && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2 }}
                          className="overflow-hidden"
                        >
                          <div className={`px-4 pb-4 ml-5 border-t pt-3 ${isDark ? "border-white/5" : "border-gray-100"}`}>
                            <p className={`text-sm leading-relaxed whitespace-pre-wrap ${isDark ? "text-gray-300" : "text-gray-600"}`}>
                              {ann.message}
                            </p>
                            <div className="flex items-center gap-3 mt-3">
                              {ann.is_read ? (
                                <span className={`text-xs flex items-center gap-1 ${isDark ? "text-gray-500" : "text-gray-400"}`}>
                                  <CheckCircle2 size={11} className="text-green-500" /> Read
                                </span>
                              ) : (
                                <span className="text-xs text-violet-400">Marking as read…</span>
                              )}
                              {ann.expires_at && (
                                <span className={`text-xs flex items-center gap-1 ${isDark ? "text-gray-500" : "text-gray-400"}`}>
                                  <Clock size={11} /> Expires {formatDate(ann.expires_at)}
                                </span>
                              )}
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-6">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className={`flex items-center gap-1 text-sm px-3 py-2 rounded-xl transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
                isDark ? "hover:bg-white/8 text-gray-300" : "hover:bg-gray-100 text-gray-600"
              }`}
            >
              <ChevronLeft size={15} /> Prev
            </button>
            <span className={`text-xs ${isDark ? "text-gray-500" : "text-gray-400"}`}>
              Page {page} of {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className={`flex items-center gap-1 text-sm px-3 py-2 rounded-xl transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
                isDark ? "hover:bg-white/8 text-gray-300" : "hover:bg-gray-100 text-gray-600"
              }`}
            >
              Next <ChevronRight size={15} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default DeveloperInbox;
