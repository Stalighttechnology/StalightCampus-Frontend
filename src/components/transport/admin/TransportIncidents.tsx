import React, { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Swal from "sweetalert2";
import { useTheme } from "../../../context/ThemeContext";
import { fetchIncidents, resolveIncident } from "../../../utils/transport_api";
import { Badge, IncidentT } from "./TransportCommon";
import { Card, CardHeader, CardTitle, CardContent } from "../../ui/card";
import { Button } from "../../ui/button";
import { SkeletonList } from "../../ui/skeleton";
import { AlertTriangle, CheckCircle, X, RefreshCw, PenTool, ShieldAlert } from "lucide-react";

const TransportIncidents: React.FC = () => {
  const { theme } = useTheme();
  const [loading, setLoading] = useState(true);
  const [incidents, setIncidents] = useState<IncidentT[]>([]);

  // Resolution state
  const [resolveId, setResolveId] = useState<number | null>(null);
  const [resolveText, setResolveText] = useState('');

  const loadIncidents = useCallback(async () => {
    setLoading(true);
    try {
      const inc = await fetchIncidents();
      if (inc.results || Array.isArray(inc)) setIncidents(inc.results || inc);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadIncidents();
  }, [loadIncidents]);

  const handleResolve = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resolveId) return;
    if (!resolveText.trim()) {
      Swal.fire("Warning", "Please write a resolution log before closing the issue.", "warning");
      return;
    }

    try {
      const res = await resolveIncident(resolveId, resolveText);
      if (res.success) { 
        Swal.fire("Resolved", "Incident ticket has been closed.", "success");
        setIncidents(incidents.map(inc => inc.id === resolveId ? { ...inc, status: 'resolved' } : inc));
        setResolveId(null); 
        setResolveText(''); 
      } else {
        Swal.fire("Error", res.message || 'Failed to resolve incident', "error");
      }
    } catch (err) {
      Swal.fire("Error", "Server error processing resolution request", "error");
    }
  };

  const bg = theme === 'dark' ? 'bg-background text-foreground' : 'bg-gray-50 text-gray-900';
  const cardBg = theme === 'dark' ? 'bg-card border-border text-foreground' : 'bg-white border-gray-200 text-gray-900';
  const input = theme === 'dark' ? 'bg-[#1c1c1e] border-[#3a3a3c] text-white focus:ring-primary' : 'bg-gray-50 border-gray-200 focus:ring-primary';

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Resolve Panel */}
        <AnimatePresence>
          {resolveId && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="lg:col-span-1"
            >
              <Card className={`p-6 border shadow-sm backdrop-blur-sm ${cardBg}`}>
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-semibold flex items-center gap-2 text-primary">
                    <PenTool className="w-5 h-5" /> Resolution Log
                  </h3>
                  <Button variant="ghost" size="icon" onClick={() => setResolveId(null)}>
                    <X size={16} />
                  </Button>
                </div>
                <form onSubmit={handleResolve} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold uppercase opacity-70 mb-2">Actions Taken</label>
                    <textarea 
                      placeholder="Describe the action taken to resolve this ticket..." 
                      className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 ${input}`} 
                      rows={4} 
                      value={resolveText} 
                      onChange={e => setResolveText(e.target.value)} 
                    />
                  </div>
                  <div className="pt-2">
                    <Button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-lg flex items-center justify-center gap-1.5 h-10">
                      <CheckCircle size={16} /> Close Ticket
                    </Button>
                  </div>
                </form>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Incidents List */}
        <div className={resolveId ? "lg:col-span-2" : "lg:col-span-3"}>
          <Card className={`border overflow-hidden shadow-sm backdrop-blur-sm ${cardBg}`}>
            <CardHeader className="pb-3 border-b border-inherit">
              <CardTitle className="sm:text-xl text-lg font-semibold flex items-center gap-2">
                <ShieldAlert size={20} className="text-primary" /> Active Incident Tickets
              </CardTitle>
            </CardHeader>
            <div className="divide-y divide-inherit">
              {loading ? (
                <div className="p-5">
                  <SkeletonList items={3} />
                </div>
              ) : incidents.length === 0 ? (
                <p className="p-8 text-sm text-center opacity-60">No complaints or incidents filed. Everything is smooth!</p>
              ) : incidents.map(i => (
                <div key={i.id} className="p-5 transition-all duration-200 hover:bg-primary/5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex flex-wrap items-center gap-2 mb-2">
                        <Badge label={i.type} color={i.type} />
                        <Badge label={i.status} color={i.status} />
                      </div>
                      <p className="font-semibold text-base">{i.title}</p>
                      <p className={`text-sm mt-1 opacity-80 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>{i.description}</p>
                      <p className={`text-xs mt-2 opacity-60`}>Reported by <b>{i.reported_by_details?.first_name || "Driver"}</b> · {new Date(i.created_at).toLocaleDateString()} {new Date(i.created_at).toLocaleTimeString()}</p>
                    </div>
                    {i.status !== 'resolved' && !resolveId && (
                      <Button size="sm" className="bg-emerald-600 hover:bg-emerald-500 text-white flex items-center gap-1" onClick={() => setResolveId(i.id)}>
                        <CheckCircle size={14} /> Resolve
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default TransportIncidents;
