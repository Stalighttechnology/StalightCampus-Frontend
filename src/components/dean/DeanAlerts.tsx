import { useEffect, useState } from "react";
import { API_ENDPOINT } from "@/utils/config";
import { fetchWithTokenRefresh } from "@/utils/authService";
import { useTheme } from "../../context/ThemeContext";
import { SkeletonList, SkeletonPageHeader } from "../ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "../ui/alert";
import { AlertTriangle, Bell, Info } from "lucide-react";
import { Button } from "../ui/button";
import Swal from "sweetalert2";

const DeanAlerts = () => {
  const { theme } = useTheme();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [publishingAll, setPublishingAll] = useState(false);

  const handlePublishAll = async () => {
    const result = await Swal.fire({
      title: 'Are you sure?',
      text: 'Publish all scheduled upcoming exams?',
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#9147e0',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Yes, publish all!',
      target: document.body
    });

    if (!result.isConfirmed) return;

    setPublishingAll(true);
    try {
      const res = await fetchWithTokenRefresh(`${API_ENDPOINT}/dean/reports/exams/publish-all/`, {
        method: 'POST'
      });
      const json = await res.json();
      if (json.success) {
        Swal.fire({
          title: 'Published',
          text: json.message || 'All exams published successfully.',
          icon: 'success',
          confirmButtonColor: '#9147e0',
          target: document.body
        });
        const alertsRes = await fetchWithTokenRefresh(`${API_ENDPOINT}/dean/reports/alerts/`);
        const alertsJson = await alertsRes.json();
        if (alertsJson.success) setAlerts(alertsJson.data || []);
      } else {
        Swal.fire({
          title: 'Error',
          text: json.message || 'Failed to publish exams.',
          icon: 'error',
          confirmButtonColor: '#9147e0',
          target: document.body
        });
      }
    } catch (e: any) {
      Swal.fire({
        title: 'Error',
        text: e?.message || 'Network error',
        icon: 'error',
        confirmButtonColor: '#9147e0',
        target: document.body
      });
    } finally {
      setPublishingAll(false);
    }
  };

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
                    {a.title?.startsWith("New Exam Scheduled:") && a.message?.includes("pending publication") && (
                      <div className="mt-3">
                        <Button
                          onClick={handlePublishAll}
                          disabled={publishingAll}
                          size="sm"
                          className="bg-primary text-white hover:bg-primary/90 text-xs font-semibold h-8"
                        >
                          {publishingAll ? "Publishing..." : "Publish All Schedule"}
                        </Button>
                      </div>
                    )}
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
