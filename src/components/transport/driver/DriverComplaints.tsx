import React, { useState, useEffect } from "react";
import { useTheme } from "../../../context/ThemeContext";
import { fetchDriverComplaints } from "../../../utils/transport_api";
import { FileText, Bus } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "../../ui/card";
import { Button } from "../../ui/button";

const DriverComplaints: React.FC = () => {
  const { theme } = useTheme();

  const [complaints, setComplaints] = useState<any[]>([]);
  const [complaintsPage, setComplaintsPage] = useState(1);
  const [hasMoreComplaints, setHasMoreComplaints] = useState(false);
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
      setComplaints(prev => page === 1 ? res.results : [...prev, ...res.results]);
      setHasMoreComplaints(!!res.next);
      setComplaintsPage(page);
    }
    setLoadingComplaints(false);
  };

  return (
    <div>
      <Card className={`border overflow-hidden shadow-sm backdrop-blur-sm ${cardBg}`}>
        <CardHeader className="pb-3 border-b border-inherit">
          <CardTitle className="text-xl font-bold flex items-center gap-2">
            <Bus className="text-primary" size={22} /> Complaints & Incidents
          </CardTitle>
          <p className={`text-xs mt-1 ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}`}>
            Track incidents and emergencies reported by you
          </p>
        </CardHeader>
        <CardContent className="p-6">
          {complaints.length === 0 && !loadingComplaints ? (
            <div className="py-12 text-center opacity-60 text-sm">
              No complaints or incidents reported by you.
            </div>
          ) : (
            <div className="space-y-4">
              {complaints.map(c => (
                <div key={c.id} className={`p-4 rounded-xl border transition-all ${theme === 'dark' ? 'bg-card hover:bg-accent/40 border-border' : 'bg-gray-50 hover:bg-gray-100/50 border-gray-200'}`}>
                  <div className="flex items-start justify-between mb-2 gap-4">
                    <div className="space-y-1">
                      <p className="font-bold text-sm">{c.title}</p>
                      <p className={`text-xs mt-0.5 leading-relaxed ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}`}>
                        {c.description}
                      </p>
                      <p className="text-[10px] opacity-60 pt-1">
                        {new Date(c.created_at).toLocaleString()}
                      </p>
                    </div>
                    <span className={`px-2.5 py-1 rounded-full text-xs font-bold capitalize whitespace-nowrap ${
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
        {hasMoreComplaints && (
          <CardFooter className="flex justify-center border-t border-border p-4 bg-muted/20">
            <Button 
              onClick={() => loadComplaints(complaintsPage + 1)} 
              disabled={loadingComplaints} 
              className="bg-primary hover:bg-primary/95 text-white w-full sm:w-auto h-9 px-6 transition-all"
            >
              {loadingComplaints ? 'Loading...' : 'Load More'}
            </Button>
          </CardFooter>
        )}
      </Card>
    </div>
  );
};

export default DriverComplaints;
