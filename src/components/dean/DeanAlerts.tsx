import { useEffect, useState } from "react";
import { API_ENDPOINT } from "@/utils/config";
import { fetchWithTokenRefresh } from "@/utils/authService";
import { useTheme } from "../../context/ThemeContext";
import { SkeletonList, SkeletonPageHeader } from "../ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "../ui/alert";
import { AlertTriangle, Bell, Info } from "lucide-react";

const DeanAlerts = () => {
  const { theme } = useTheme();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [alerts, setAlerts] = useState<any[]>([]);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setLoading(true);
      try {
        const res = await fetchWithTokenRefresh(`${API_ENDPOINT}/dean/reports/alerts/`);
        const json = await res.json();
        if (!mounted) return;
        if (json.success) setAlerts(json.data || []);
        else setError(json.message || 'Failed to load');
      } catch (e: any) {
        setError(e?.message || 'Network error');
      } finally {
        if (mounted) setLoading(false);
      }
    };
    load();
    return () => { mounted = false; };
  }, []);


  return (
    <div className={`space-y-6 p-6 min-h-screen ${theme === 'dark' ? 'bg-background text-foreground' : 'bg-gray-50 text-gray-900'}`}>
      {loading ? (
        <div className="space-y-6">
          <SkeletonPageHeader />
          <SkeletonList items={5} />
        </div>
      ) : error ? (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : (
        <>
          <h2 className="text-xl font-semibold">Alerts</h2>
          <div className="space-y-4">
            {alerts.length === 0 && (
              <div className={`p-4 rounded-lg shadow-sm border ${theme === 'dark' ? 'bg-card border-border' : 'bg-white border-gray-200'}`}>
                No alerts
              </div>
            )}
            {alerts.map((a: any) => (
              <div key={a.id || a.pk} className={`p-5 rounded-xl shadow-sm border transition-all hover:shadow-md ${theme === 'dark' ? 'bg-card border-border' : 'bg-white border-gray-200'}`}>
                <div className="flex items-start gap-4">
                  <div className={`p-2 rounded-full ${theme === 'dark' ? 'bg-primary/10 text-primary' : 'bg-primary/10 text-primary'}`}>
                    <Bell className="w-5 h-5" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between gap-4 mb-1">
                      <h3 className="font-semibold text-lg">{a.title || a.message || 'Alert'}</h3>
                      <span className={`text-xs ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}`}>{a.created_at || a.timestamp}</span>
                    </div>
                    <p className={`text-sm leading-relaxed ${theme === 'dark' ? 'text-foreground/80' : 'text-gray-700'}`}>{a.summary || a.message}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export default DeanAlerts;
