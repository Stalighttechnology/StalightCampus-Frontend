import React, { useState, useEffect } from "react";
import { useTheme } from "../../../context/ThemeContext";
import { fetchDriverComplaints } from "../../../utils/transport_api";
import { FileText, Bus, ShieldAlert } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "../../ui/card";
import { Button } from "../../ui/button";

const DriverComplaints: React.FC = () => {
  const { theme } = useTheme();

  const [complaints, setComplaints] = useState<any[]>([]);
  const [complaintsPage, setComplaintsPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [loadingComplaints, setLoadingComplaints] = useState(false);

  const bg = theme === 'dark' ? 'bg-background text-foreground' : 'bg-gray-50 text-gray-900';
  const cardBg = theme === 'dark' ? 'bg-card border-border text-foreground' : 'bg-white border-gray-200 text-gray-900';

  useEffect(() => {
    loadComplaints(1);
  }, []);

  const loadComplaints = async (page: number) => {
    setLoadingComplaints(true);
    const res = await fetchDriverComplaints(page);
    if (res.results) {
      setComplaints(res.results);
      setTotalCount(res.count || 0);
      setTotalPages(Math.max(1, Math.ceil((res.count || 0) / 10)));
      setComplaintsPage(page);
    }
    setLoadingComplaints(false);
  };

  return (
    <div>
      <Card id="driver-complaints-card" className={`border overflow-hidden shadow-sm backdrop-blur-sm ${cardBg}`}>
        <CardHeader id="driver-complaints-header" className="pb-3 border-b border-inherit">
          <CardTitle className="text-xl font-semibold flex items-center gap-2">
            <Bus className="text-primary" size={22} /> Complaints & Incidents
          </CardTitle>
          <p className={`text-xs mt-1 ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}`}>
            Track incidents and emergencies reported by you
          </p>
        </CardHeader>
        <CardContent className="p-6">
          {loadingComplaints ? (
            <div className="space-y-4">
              {[1, 2, 3].map(i => (
                <div key={i} className={`p-4 rounded-xl border animate-pulse ${theme === 'dark' ? 'bg-card border-border' : 'bg-gray-50 border-gray-200'}`}>
                  <div className="flex items-start justify-between mb-2 gap-4">
                    <div className="space-y-2 flex-1">
                      <div className="h-4 bg-muted rounded w-1/4"></div>
                      <div className="h-3 bg-muted rounded w-3/4"></div>
                      <div className="h-2.5 bg-muted rounded w-16"></div>
                    </div>
                    <div className="h-6 bg-muted rounded w-16"></div>
                  </div>
                </div>
              ))}
            </div>
          ) : complaints.length === 0 ? (
            <div className={`flex flex-col items-center justify-center py-10 px-4 rounded-xl border-2 border-dashed text-center transition-all duration-300 ${theme === 'dark' ? 'border-border bg-card/30 text-muted-foreground' : 'border-gray-200 bg-gray-50/50 text-gray-500'}`}>
              <div className={`p-4 rounded-full mb-4 ${theme === 'dark' ? 'bg-primary/20 text-primary' : 'bg-primary/10 text-primary'}`}>
                <ShieldAlert size={32} className="opacity-80" />
              </div>
              <h3 className={`text-base font-semibold mb-1 ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>No Complaints Reported</h3>
              <p className="max-w-md text-xs leading-relaxed opacity-85">
                No complaints or incidents have been reported by you yet.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {complaints.map(c => (
                <div key={c.id} className={`p-4 rounded-xl border transition-all ${theme === 'dark' ? 'bg-card hover:bg-accent/40 border-border' : 'bg-gray-50 hover:bg-gray-100/50 border-gray-200'}`}>
                  <div className="flex items-start justify-between mb-2 gap-4">
                    <div className="space-y-1">
                      <p className="font-semibold text-sm">{c.title}</p>
                      <p className={`text-xs mt-0.5 leading-relaxed ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}`}>
                        {c.description}
                      </p>
                      <p className="text-[10px] opacity-60 pt-1">
                        {new Date(c.created_at).toLocaleString()}
                      </p>
                    </div>
                    <span className={`px-2.5 py-1 rounded-full text-xs font-semibold capitalize whitespace-nowrap ${
                      c.status === 'resolved' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400' : 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400'
                    }`}>
                      {c.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
        {totalPages > 1 && (
          <CardFooter className="flex flex-col sm:flex-row justify-between items-center gap-4 text-sm text-muted-foreground px-6 py-4 border-t border-border mt-auto">
            <div>
              Showing {Math.min((complaintsPage - 1) * 10 + 1, totalCount)} to {Math.min(complaintsPage * 10, totalCount)} of {totalCount} records
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => loadComplaints(Math.max(1, complaintsPage - 1))}
                disabled={complaintsPage === 1 || loadingComplaints}
                className="bg-primary hover:bg-primary/90 text-white border-primary h-9 px-4 transition-all"
              >
                Previous
              </Button>
              <div className="flex items-center justify-center min-w-[2rem]">
                <span className={`text-sm font-semibold ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>
                  {complaintsPage}
                </span>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => loadComplaints(Math.min(totalPages, complaintsPage + 1))}
                disabled={complaintsPage === totalPages || loadingComplaints}
                className="bg-primary hover:bg-primary/90 text-white border-primary h-9 px-4 transition-all"
              >
                Next
              </Button>
            </div>
          </CardFooter>
        )}
      </Card>
    </div>
  );
};

export default DriverComplaints;
