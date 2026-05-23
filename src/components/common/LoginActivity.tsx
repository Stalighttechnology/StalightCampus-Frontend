import React, { useEffect, useState } from 'react';
import { API_ENDPOINT } from '../../utils/config';
import { fetchWithTokenRefresh } from '../../utils/authService';
import { useTheme } from '../../context/ThemeContext';
import { Clock, Globe, Smartphone, Monitor, Tablet, ShieldCheck, RefreshCw } from 'lucide-react';

const LoginActivity: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [sessions, setSessions] = useState<any[]>([]);
  const { theme } = useTheme();

  const fetchLoginHistory = async () => {
    setLoading(true);
    try {
      const resp = await fetchWithTokenRefresh(`${API_ENDPOINT}/profile/sessions/`);
      const j = await resp.json();
      if (j.success) {
        setSessions(j.sessions || j.history || []);
        if (j.currentSessionId) localStorage.setItem('session_id', j.currentSessionId);
      }
    } catch (err) {
      console.error('Failed to fetch login sessions', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLoginHistory();
  }, []);

  const terminateSession = async (sessionId: string) => {
    try {
      const resp = await fetchWithTokenRefresh(`${API_ENDPOINT}/sessions/${sessionId}/`, { method: 'DELETE' });
      const j = await resp.json();
      if (j.success) {
        fetchLoginHistory();
      } else {
        console.error('Failed to revoke session', j.message);
      }
    } catch (err) {
      console.error('Network error', err);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header with Refresh button */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className={`p-2 rounded-lg ${theme === 'dark' ? 'bg-purple-900/30' : 'bg-purple-50'}`}>
            <ShieldCheck className="h-5 w-5 text-purple-600" />
          </div>
          <div>
            <h3 className={`font-semibold text-base ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>Recent Sessions</h3>
            <p className={`text-xs ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}`}>Active sessions on your account</p>
          </div>
        </div>
        <button
          onClick={fetchLoginHistory}
          disabled={loading}
          className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border transition-all font-medium
            ${theme === 'dark' ? 'border-border text-muted-foreground hover:text-foreground hover:border-foreground' : 'border-gray-200 text-gray-500 hover:text-gray-800 hover:border-gray-400'}`}
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Loading state */}
      {loading && (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className={`animate-pulse rounded-xl p-4 ${theme === 'dark' ? 'bg-muted' : 'bg-gray-100'}`}>
              <div className="flex items-center gap-4">
                <div className={`h-12 w-12 rounded-xl ${theme === 'dark' ? 'bg-muted-foreground/20' : 'bg-gray-200'}`} />
                <div className="flex-1 space-y-2">
                  <div className={`h-4 rounded w-2/5 ${theme === 'dark' ? 'bg-muted-foreground/20' : 'bg-gray-200'}`} />
                  <div className={`h-3 rounded w-3/5 ${theme === 'dark' ? 'bg-muted-foreground/10' : 'bg-gray-150'}`} />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Empty state */}
      {!loading && sessions.length === 0 && (
        <div className={`flex flex-col items-center justify-center py-12 rounded-xl border-2 border-dashed ${theme === 'dark' ? 'border-border text-muted-foreground' : 'border-gray-200 text-gray-400'}`}>
          <Clock className="h-12 w-12 mb-3 opacity-40" />
          <p className="font-medium">No recent login activity</p>
          <p className="text-sm mt-1">Active sessions will appear here.</p>
        </div>
      )}

      {/* Login history list */}
      {!loading && sessions.length > 0 && (
        <div className="space-y-3">
          {sessions.map((entry: any, idx: number) => {
            const iso = entry.last_seen_at || entry.last_seen || entry.created_at || entry.timestamp || null;
            const dt = iso ? new Date(iso) : null;
            const isRecent = idx === 0;
            const timeAgo = (() => {
              if (!dt || Number.isNaN(dt.getTime())) return '';
              const diff = Date.now() - dt.getTime();
              const mins = Math.floor(diff / 60000);
              const hrs = Math.floor(mins / 60);
              const days = Math.floor(hrs / 24);
              if (mins < 2) return 'Just now';
              if (mins < 60) return `${mins}m ago`;
              if (hrs < 24) return `${hrs}h ago`;
              if (days < 7) return `${days}d ago`;
              return dt.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
            })();

            const DeviceIcon = entry.device_type === 'mobile' ? Smartphone
              : entry.device_type === 'tablet' ? Tablet
              : entry.device_type === 'desktop' ? Monitor
              : Globe;

            const iconColor = entry.device_type === 'mobile' ? 'text-emerald-600'
              : entry.device_type === 'tablet' ? 'text-blue-600'
              : entry.device_type === 'desktop' ? 'text-violet-600'
              : 'text-orange-500';

            const iconBg = entry.device_type === 'mobile'
              ? (theme === 'dark' ? 'bg-emerald-900/30' : 'bg-emerald-50')
              : entry.device_type === 'tablet'
              ? (theme === 'dark' ? 'bg-blue-900/30' : 'bg-blue-50')
              : entry.device_type === 'desktop'
              ? (theme === 'dark' ? 'bg-violet-900/30' : 'bg-violet-50')
              : (theme === 'dark' ? 'bg-orange-900/30' : 'bg-orange-50');

            return (
              <div
                key={entry.id || entry.timestamp}
                className={`relative flex items-start gap-4 p-4 rounded-xl border transition-all
                  ${isRecent
                    ? (theme === 'dark' ? 'border-primary/40 bg-primary/5' : 'border-primary/30 bg-primary/3')
                    : (theme === 'dark' ? 'border-border bg-card hover:border-border/80' : 'border-gray-100 bg-white hover:border-gray-200 shadow-sm')
                  }`}
              >
                {/* Current session badge */}
                {isRecent && (
                  <span className="absolute top-3 right-3 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-primary text-white">
                    Latest
                  </span>
                )}

                {/* Logout button */}
                <div className="absolute top-3 right-3">
                  <button
                    onClick={() => terminateSession(entry.id)}
                    disabled={!!entry.is_current}
                    className={`text-xs px-2 py-1 rounded ${entry.is_current ? 'bg-gray-200 text-gray-500 cursor-not-allowed' : 'bg-red-50 text-red-700 hover:bg-red-100'}`}
                  >
                    {entry.is_current ? 'Current' : 'Logout'}
                  </button>
                </div>

                {/* Device Icon */}
                <div className={`flex-shrink-0 h-12 w-12 rounded-xl flex items-center justify-center ${iconBg}`}>
                  <DeviceIcon className={`h-6 w-6 ${iconColor}`} />
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`font-semibold text-sm truncate ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>
                      {entry.device || entry.browser || 'Unknown Device'}
                    </span>
                    {entry.brand && entry.brand !== 'Unknown' && entry.brand !== entry.device && (
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${theme === 'dark' ? 'bg-muted text-muted-foreground' : 'bg-gray-100 text-gray-600'}`}>
                        {entry.brand}
                      </span>
                    )}
                  </div>

                  {/* OS + Browser */}
                  <div className={`flex items-center gap-2 mt-1 text-xs flex-wrap ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}`}>
                    <span>{entry.os || 'Unknown OS'}</span>
                    <span className="opacity-40">·</span>
                    <span>{entry.browser || 'Unknown Browser'}</span>
                  </div>

                  {/* IP + Time */}
                  <div className={`flex items-center gap-3 mt-2 flex-wrap`}>
                    <span className={`flex items-center gap-1 text-xs font-mono px-2 py-0.5 rounded-md ${theme === 'dark' ? 'bg-muted text-muted-foreground' : 'bg-gray-100 text-gray-600'}`}>
                      <Globe className="h-3 w-3 opacity-60" />
                      {entry.ip_address || '-'}
                    </span>
                    {dt && (
                      <span className={`flex items-center gap-1 text-xs ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}`}>
                        <Clock className="h-3 w-3 opacity-60" />
                        <span title={dt.toLocaleString('en-IN')}>{timeAgo}</span>
                        <span className="opacity-50 ml-1">{dt.toLocaleString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })}</span>
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Security tip */}
      {!loading && sessions.length > 0 && (
        <div className={`flex items-start gap-3 p-3 rounded-lg border text-xs ${theme === 'dark' ? 'bg-amber-900/10 border-amber-800/30 text-amber-400' : 'bg-amber-50 border-amber-200 text-amber-700'}`}>
          <ShieldCheck className="h-4 w-4 mt-0.5 flex-shrink-0" />
          <span>If you notice any unfamiliar login, change your password immediately or contact your admin.</span>
        </div>
      )}
    </div>
  );
};

export default LoginActivity;
