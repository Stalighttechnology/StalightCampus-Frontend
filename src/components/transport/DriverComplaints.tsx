import React, { useState, useEffect } from "react";
import { useTheme } from "../../context/ThemeContext";
import { fetchDriverComplaints } from "../../utils/transport_api";
import { FileText, Bus } from "lucide-react";

const DriverComplaints: React.FC = () => {
  const { theme } = useTheme();

  const [complaints, setComplaints] = useState<any[]>([]);
  const [complaintsPage, setComplaintsPage] = useState(1);
  const [hasMoreComplaints, setHasMoreComplaints] = useState(false);
  const [loadingComplaints, setLoadingComplaints] = useState(false);

  const bg = theme === 'dark' ? 'bg-background text-foreground' : 'bg-gray-50 text-gray-900';
  const card = theme === 'dark' ? 'bg-card border-border' : 'bg-white border-gray-100';

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
    <div className={`min-h-screen ${bg} p-4 md:p-6`}>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Bus className="text-primary" size={26} /> Complaints & Incidents</h1>
          <p className={`text-sm mt-1 ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}`}>Track incidents and emergencies reported by you</p>
        </div>
      </div>

      <div className={`rounded-2xl border shadow-sm p-5 ${card}`}>
        <h2 className="font-bold text-base mb-4 flex items-center gap-2"><FileText size={16} /> Incident Reports</h2>
        {complaints.length === 0 && !loadingComplaints ? (
          <div className="py-12 text-center opacity-60 text-sm">No complaints or incidents reported by you.</div>
        ) : (
          <div className="space-y-4">
            {complaints.map(c => (
              <div key={c.id} className={`p-4 rounded-xl border ${theme === 'dark' ? 'bg-background' : 'bg-gray-50'}`}>
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="font-bold text-sm">{c.title}</p>
                    <p className={`text-xs mt-0.5 ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}`}>{c.description}</p>
                    <p className="text-[10px] opacity-60 mt-2">{new Date(c.created_at).toLocaleString()}</p>
                  </div>
                  <span className={`px-2.5 py-1 rounded-full text-xs font-bold capitalize ${c.status === 'resolved' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>{c.status}</span>
                </div>
              </div>
            ))}
          </div>
        )}
        {hasMoreComplaints && (
          <button onClick={() => loadComplaints(complaintsPage + 1)} disabled={loadingComplaints} className="mt-4 w-full py-2.5 rounded-lg border border-inherit text-sm font-semibold hover:bg-primary/5 transition-all">
            {loadingComplaints ? 'Loading...' : 'Load More'}
          </button>
        )}
      </div>
    </div>
  );
};

export default DriverComplaints;
