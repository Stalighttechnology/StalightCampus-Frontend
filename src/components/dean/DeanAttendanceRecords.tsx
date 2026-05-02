import { useEffect, useState } from "react";
import { API_ENDPOINT } from "@/utils/config";
import { fetchWithTokenRefresh } from "@/utils/authService";
import { useTheme } from "../../context/ThemeContext";
import { SkeletonTable, SkeletonPageHeader } from "../ui/skeleton";
import { Button } from "../ui/button";
import { Alert, AlertDescription } from "../ui/alert";
import { Loader2, ChevronLeft, ChevronRight } from "lucide-react";

const DeanAttendanceRecords = () => {
  const { theme } = useTheme();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [records, setRecords] = useState<any[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  const load = async (p = 1) => {
    setLoading(true);
    try {
      const res = await fetchWithTokenRefresh(`${API_ENDPOINT}/dean/reports/attendance-records/?page=${p}`);
      const json = await res.json();
      if (json.success) {
        setRecords(prev => p === 1 ? (json.data || []) : [...prev, ...(json.data || [])]);
        setHasMore((json.next !== null) && (json.data?.length > 0));
      } else {
        setError(json.message || 'Failed to load');
      }
    } catch (e: any) {
      setError(e?.message || 'Network error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(1); }, []);

  return (
    <div className={`space-y-6 p-6 min-h-screen ${theme === 'dark' ? 'bg-background text-foreground' : 'bg-gray-50 text-gray-900'}`}>
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Attendance Records</h2>
        {loading && <div className="text-xs animate-pulse opacity-50">Refreshing...</div>}
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className={`rounded-lg shadow-sm border overflow-hidden ${theme === 'dark' ? 'bg-card border-border' : 'bg-white border-gray-200'}`}>
        <div className="overflow-x-auto">
          {loading && records.length === 0 ? (
            <div className="p-4">
              <SkeletonTable rows={10} cols={4} />
            </div>
          ) : (
            <table className="min-w-full divide-y divide-gray-200 dark:divide-border">
              <thead>
                <tr className={`text-left text-sm ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}`}>
                  <th className="px-6 py-3 font-semibold">Date</th>
                  <th className="px-6 py-3 font-semibold">Branch</th>
                  <th className="px-6 py-3 font-semibold">Total</th>
                  <th className="px-6 py-3 font-semibold">Present</th>
                </tr>
              </thead>
              <tbody className={`divide-y ${theme === 'dark' ? 'divide-border' : 'divide-gray-200'}`}>
                {records.length === 0 && !loading ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-10 text-center text-gray-500 italic">No records found</td>
                  </tr>
                ) : (
                  records.map((r: any, idx: number) => (
                    <tr key={idx} className={`text-sm hover:${theme === 'dark' ? 'bg-muted/50' : 'bg-gray-50'} transition-colors`}>
                      <td className="px-6 py-4 whitespace-nowrap">{r.date || r.day}</td>
                      <td className="px-6 py-4 whitespace-nowrap">{r.branch_name || r.branch}</td>
                      <td className="px-6 py-4 whitespace-nowrap">{r.total_students}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${theme === 'dark' ? 'bg-green-900/30 text-green-300' : 'bg-green-100 text-green-800'}`}>
                          {r.present_count}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <div className="flex items-center gap-4">
        <Button 
          variant="outline"
          onClick={() => { if (page > 1) { setPage(p => p - 1); load(page - 1); } }} 
          disabled={page === 1 || loading}
          className="gap-2"
        >
          <ChevronLeft className="w-4 h-4" />
          Previous
        </Button>
        <span className="text-sm font-medium px-4 py-2 rounded-md bg-muted/50 border">
          Page {page}
        </span>
        <Button 
          onClick={() => { if (hasMore) { setPage(p => p + 1); load(page + 1); } }} 
          disabled={!hasMore || loading}
          className="gap-2"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ChevronRight className="w-4 h-4" />}
          {loading ? 'Loading...' : 'Load more'}
        </Button>
      </div>
    </div>
  );
};

export default DeanAttendanceRecords;
