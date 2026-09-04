import React, { useState, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import Swal from "sweetalert2";
import { useTheme } from "../../../context/ThemeContext";
import { fetchIncidents, resolveIncident } from "../../../utils/transport_api";
import { Badge, IncidentT } from "./TransportCommon";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "../../ui/card";
import { Button } from "../../ui/button";
import { SkeletonList } from "../../ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem
} from "../../ui/dropdown-menu";
import { AlertTriangle, CheckCircle, X, PenTool, ShieldAlert, Bus, Navigation, Filter, Check } from "lucide-react";

const TransportIncidents: React.FC = () => {
  const { theme } = useTheme();
  const [loading, setLoading] = useState(true);
  const [incidents, setIncidents] = useState<IncidentT[]>([]);
  const [selectedType, setSelectedType] = useState<string>('all');
  const ROWS_PER_PAGE = 20;
  const [currentPage, setCurrentPage] = useState(1);

  // Resolution state
  const [resolveId, setResolveId] = useState<number | null>(null);
  const [resolveText, setResolveText] = useState('');
  
  // View resolution log modal state
  const [viewIncident, setViewIncident] = useState<IncidentT | null>(null);

  // Expanded descriptions ("View More" toggle)
  const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set());
  const DESCRIPTION_LIMIT = 120;
  const toggleExpanded = (id: number) =>
    setExpandedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const loadIncidents = useCallback(async (typeFilter = selectedType) => {
    setLoading(true);
    try {
      const inc = await fetchIncidents(1, typeFilter === 'all' ? undefined : typeFilter);
      const rawIncidents = inc.results || inc || [];
      setIncidents(Array.isArray(rawIncidents) ? rawIncidents : []);
    } catch (e) {
      console.error("Failed to load incidents:", e);
      setIncidents([]);
    } finally {
      setLoading(false);
    }
  }, [selectedType]);

  useEffect(() => {
    loadIncidents(selectedType);
  }, [selectedType, loadIncidents]);

  const handleResolve = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resolveId) return;
    if (!resolveText.trim()) {
      Swal.fire("Warning", "Please write a resolution log before closing the issue.", "warning");
      return;
    }

    const result = await Swal.fire({
      title: 'Close Ticket?',
      text: "Are you sure you want to close this incident ticket?",
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#22c55e',
      cancelButtonColor: theme === 'dark' ? '#3f3f46' : '#d1d5db',
      confirmButtonText: 'Yes, Close Ticket',
      background: theme === 'dark' ? '#1c1c1e' : '#ffffff',
      color: theme === 'dark' ? '#E4E4E7' : '#000000'
    });

    if (!result.isConfirmed) return;

    try {
      const res = await resolveIncident(resolveId, resolveText);
      if (res.success) { 
        Swal.fire({
          icon: 'success',
          title: 'Resolved',
          text: 'Incident ticket has been closed.',
          background: theme === 'dark' ? '#1c1c1e' : '#ffffff',
          color: theme === 'dark' ? '#E4E4E7' : '#000000',
          confirmButtonColor: '#22c55e'
        });
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

  const getReporterName = (i: IncidentT) => {
    const details = i.reported_by_details;
    if (!details) return "Driver";
    if (details.full_name && typeof details.full_name === 'string' && details.full_name.trim()) {
      return details.full_name.trim();
    }
    const first = details.first_name || '';
    const last = details.last_name || '';
    const combined = `${first} ${last}`.trim();
    if (combined) return combined;
    return details.username || "Driver";
  };

  const formatIncidentDate = (dateStr: string) => {
    if (!dateStr) return "";
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const pad = (n: number) => n.toString().padStart(2, '0');
    const day = pad(d.getDate());
    const month = pad(d.getMonth() + 1);
    const year = d.getFullYear();
    const hours = pad(d.getHours());
    const minutes = pad(d.getMinutes());
    const seconds = pad(d.getSeconds());
    return `${day}/${month}/${year} ${hours}:${minutes}:${seconds}`;
  };

  const bg = theme === 'dark' ? 'bg-background text-foreground' : 'bg-gray-50 text-gray-900';
  const cardBg = theme === 'dark' ? 'bg-card border-border text-foreground' : 'bg-white border-gray-200 text-gray-900';
  const input = theme === 'dark' ? 'bg-[#1c1c1e] border-[#3a3a3c] text-white focus:ring-primary' : 'bg-gray-50 border-gray-200 focus:ring-primary';

  const filterTabs = [
    { id: 'all', label: 'All Tickets' },
    { id: 'emergency', label: 'Emergency', badgeClass: 'bg-red-500/10 text-red-600 dark:text-red-400' },
    { id: 'incident', label: 'Incidents', badgeClass: 'bg-orange-500/10 text-orange-600 dark:text-orange-400' },
    { id: 'complaint', label: 'Complaints', badgeClass: 'bg-purple-500/10 text-purple-600 dark:text-purple-400' },
  ];

  return (
    <div id="transport-incidents-header" className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Resolve Panel (Modal Popup via Portal) */}
        {resolveId && createPortal(
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => setResolveId(null)}
            />
            <div className="relative w-full max-w-md z-50">
              <Card className={`p-6 border shadow-2xl max-h-[90vh] overflow-y-auto custom-scrollbar ${cardBg}`}>
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
                      <Button
                        type="submit"
                        variant="outline"
                        className={`w-full font-semibold rounded-lg flex items-center justify-center gap-1.5 h-10 border ${
                          theme === 'dark'
                            ? 'bg-green-900/20 text-green-400 border-green-500/30 hover:bg-green-900/40'
                            : 'bg-green-100 text-green-700 border-green-200 hover:bg-green-200/80'
                        }`}
                      >
                        <CheckCircle size={16} /> Close Ticket
                      </Button>
                    </div>
                </form>
              </Card>
            </div>
          </div>,
          document.body
        )}

        {/* View Resolution Log Modal */}
        {viewIncident && createPortal(
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => setViewIncident(null)}
            />
            <div className="relative w-full max-w-md z-50">
              <Card className={`p-6 border shadow-2xl max-h-[90vh] overflow-y-auto custom-scrollbar ${cardBg}`}>
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-semibold flex items-center gap-2 text-primary">
                    <PenTool className="w-5 h-5" /> Resolution Log
                  </h3>
                  <Button variant="ghost" size="icon" onClick={() => setViewIncident(null)}>
                    <X size={16} />
                  </Button>
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold uppercase opacity-70 mb-2">Actions Taken</label>
                    <div className={`w-full border rounded-lg px-3 py-2 text-sm whitespace-pre-wrap ${input} min-h-[100px]`}>
                      {viewIncident.action_taken || "No action details logged."}
                    </div>
                  </div>
                  {viewIncident.resolved_at && (
                    <p className="text-xs opacity-60">
                      Resolved on {formatIncidentDate(viewIncident.resolved_at)}
                    </p>
                  )}
                  <div className="pt-2">
                    <Button
                      onClick={() => setViewIncident(null)}
                      className="w-full bg-primary hover:bg-primary/90 text-white font-semibold rounded-lg h-10"
                    >
                      Close
                    </Button>
                  </div>
                </div>
              </Card>
            </div>
          </div>,
          document.body
        )}

        {/* Incidents List */}
        <div className="lg:col-span-3">
          <Card className={`border overflow-hidden shadow-sm backdrop-blur-sm ${cardBg}`}>
            <CardHeader className="pb-3 border-b border-inherit">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <CardTitle id="transport-incidents-title-row" className="sm:text-xl text-lg font-semibold flex items-center gap-2">
                  <ShieldAlert className="w-5 h-5 text-red-500" /> Active Incident Tickets
                </CardTitle>

                {/* Filter Dropdown */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      size="sm"
                      className="h-9 px-3 flex items-center gap-2 text-xs font-semibold rounded-lg bg-primary hover:bg-primary/90 text-white shadow-xs transition-all border-none"
                    >
                      <Filter size={14} className="text-white" />
                      <span>Filter</span>
                      {selectedType !== 'all' && (
                        <span className="ml-1 px-1.5 py-0.5 rounded text-[10px] bg-white/25 text-white font-semibold capitalize">
                          {selectedType}
                        </span>
                      )}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className={`w-44 p-1.5 shadow-xl border rounded-xl ${cardBg}`}>
                    {filterTabs.map(tab => (
                      <DropdownMenuItem
                        key={tab.id}
                        onClick={() => {
                          setSelectedType(tab.id);
                          setCurrentPage(1);
                        }}
                        className={`cursor-pointer flex items-center justify-between text-xs py-2 px-2.5 rounded-lg transition-colors ${
                          selectedType === tab.id
                            ? 'bg-primary/10 text-primary font-semibold'
                            : 'hover:bg-muted/60'
                        }`}
                      >
                        <span className="flex items-center gap-2">
                          {tab.id === 'emergency' && <span className="w-2 h-2 rounded-full bg-red-500" />}
                          {tab.id === 'incident' && <span className="w-2 h-2 rounded-full bg-orange-500" />}
                          {tab.id === 'complaint' && <span className="w-2 h-2 rounded-full bg-purple-500" />}
                          {tab.id === 'all' && <span className="w-2 h-2 rounded-full bg-gray-400" />}
                          {tab.label}
                        </span>
                        {selectedType === tab.id && <Check size={14} className="text-primary ml-auto" />}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </CardHeader>
            <div>
              {loading ? (
                <div className="p-5">
                  <SkeletonList items={3} />
                </div>
              ) : incidents.length === 0 ? (
                <div className="p-6">
                  <div className={`flex flex-col items-center justify-center py-12 px-6 text-center border-2 border-dashed rounded-2xl transition-all duration-300 ${theme === 'dark' ? 'border-border bg-card/30 text-muted-foreground' : 'border-gray-200 bg-gray-50/50 text-gray-500'}`}>
                    <div className={`p-4 rounded-full mb-4 ${theme === 'dark' ? 'bg-primary/20 text-primary' : 'bg-primary/10 text-primary'}`}>
                      <ShieldAlert size={32} className="opacity-80" />
                    </div>
                    <h3 className={`text-base font-semibold mb-1 ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>
                      {selectedType === 'all' ? "No Incidents Filed" : `No ${selectedType.charAt(0).toUpperCase() + selectedType.slice(1)} Tickets`}
                    </h3>
                    <p className="max-w-md text-xs leading-relaxed opacity-80">
                      {selectedType === 'all'
                        ? "No complaints or incidents filed. Everything is running smoothly!"
                        : `No active ${selectedType} tickets found in the system.`}
                    </p>
                  </div>
                </div>
              ) : (() => {
                const totalPages = Math.ceil(incidents.length / ROWS_PER_PAGE);
                const safePage = Math.min(currentPage, totalPages);
                const pageIncidents = incidents.slice((safePage - 1) * ROWS_PER_PAGE, safePage * ROWS_PER_PAGE);
                return (
                  <>
                    {/* Mobile View: Stacked Cards */}
                    <div className="md:hidden space-y-4 p-4">
                      {pageIncidents.map(i => (
                        <div
                          key={i.id}
                          className={`p-4 rounded-xl border ${
                            i.type === 'emergency' && i.status === 'pending'
                              ? theme === 'dark' ? 'bg-red-950/20 border-red-800/40 text-foreground' : 'bg-red-50/70 border-red-200 text-gray-900'
                              : theme === 'dark' ? 'bg-card border-border text-foreground' : 'bg-white border-gray-200 text-gray-900'
                          } flex flex-col gap-3 shadow-sm`}
                        >
                          <div className="flex justify-between items-center pb-2 border-b border-border/25">
                            <div className="flex items-center gap-1.5">
                              <Badge label={i.type} color={i.type} />
                              <Badge label={i.status} color={i.status} />
                            </div>
                            {i.bus_details?.bus_number && (
                              <span className="text-[11px] font-medium px-2 py-0.5 rounded bg-muted/70 text-muted-foreground flex items-center gap-1">
                                <Bus size={11} /> Bus {i.bus_details.bus_number}
                              </span>
                            )}
                          </div>
                          <div className="space-y-1">
                            <h4 className="font-semibold text-base leading-tight flex items-center gap-1.5">
                              {i.type === 'emergency' && <AlertTriangle size={16} className="text-red-600 flex-shrink-0" />}
                              {i.title}
                            </h4>
                            <p className={`text-sm mt-1.5 opacity-80 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
                              {i.description && i.description.length > DESCRIPTION_LIMIT && !expandedIds.has(i.id)
                                ? i.description.slice(0, DESCRIPTION_LIMIT) + '…'
                                : i.description}
                            </p>
                            {i.description && i.description.length > DESCRIPTION_LIMIT && (
                              <button
                                onClick={() => toggleExpanded(i.id)}
                                className={`text-xs font-semibold mt-0.5 transition-colors ${
                                  theme === 'dark' ? 'text-primary hover:text-primary/80' : 'text-primary hover:text-primary/70'
                                }`}
                              >
                                {expandedIds.has(i.id) ? 'View Less ▲' : 'View More ▼'}
                              </button>
                            )}
                          </div>
                          <div className="pt-2 border-t border-border/25 flex flex-col gap-3">
                            <div className="text-xs opacity-75">
                              Reported by <b>{getReporterName(i)}</b> · {formatIncidentDate(i.created_at)}
                            </div>
                            
                            {i.status === 'resolved' ? (
                              <Button
                                variant="outline"
                                size="sm"
                                className="flex items-center justify-center gap-1 w-full border h-9 text-xs font-semibold"
                                onClick={() => setViewIncident(i)}
                              >
                                View Log
                              </Button>
                            ) : (
                              <Button
                                variant="outline"
                                size="sm"
                                className={`flex items-center justify-center gap-1.5 border h-9 w-full text-xs font-semibold ${
                                  theme === 'dark'
                                    ? 'bg-green-900/20 text-green-400 border-green-500/30 hover:bg-green-900/40'
                                    : 'bg-green-100 text-green-700 border-green-200 hover:bg-green-200/80'
                                }`}
                                onClick={() => setResolveId(i.id)}
                              >
                                <CheckCircle size={14} /> Resolve Ticket
                              </Button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Desktop View: List Rows */}
                    <div className="hidden md:block divide-y divide-inherit">
                      {pageIncidents.map(i => (
                        <div 
                          key={i.id} 
                          className={`p-5 transition-all duration-200 hover:bg-primary/5 ${
                            i.type === 'emergency' && i.status === 'pending'
                              ? theme === 'dark' ? 'bg-red-950/15 hover:bg-red-950/25' : 'bg-red-50/50 hover:bg-red-50/80'
                              : ''
                          }`}
                        >
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1">
                              <div className="flex flex-wrap items-center gap-2 mb-2">
                                <Badge label={i.type} color={i.type} />
                                <Badge label={i.status} color={i.status} />
                                {i.bus_details?.bus_number && (
                                  <span className="text-xs font-medium px-2 py-0.5 rounded bg-muted/60 text-muted-foreground flex items-center gap-1">
                                    <Bus size={12} /> Bus {i.bus_details.bus_number}
                                  </span>
                                )}
                                {i.route_details?.route_name && (
                                  <span className="text-xs font-medium px-2 py-0.5 rounded bg-muted/60 text-muted-foreground flex items-center gap-1">
                                    <Navigation size={12} /> {i.route_details.route_name}
                                  </span>
                                )}
                              </div>
                              <p className="font-semibold text-base flex items-center gap-2">
                                {i.type === 'emergency' && <AlertTriangle size={18} className="text-red-600 flex-shrink-0" />}
                                {i.title}
                              </p>
                              <p className={`text-sm mt-1 opacity-80 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
                                {i.description && i.description.length > DESCRIPTION_LIMIT && !expandedIds.has(i.id)
                                  ? i.description.slice(0, DESCRIPTION_LIMIT) + '…'
                                  : i.description}
                              </p>
                              {i.description && i.description.length > DESCRIPTION_LIMIT && (
                                <button
                                  onClick={() => toggleExpanded(i.id)}
                                  className={`text-xs font-semibold mt-0.5 transition-colors ${
                                    theme === 'dark' ? 'text-primary hover:text-primary/80' : 'text-primary hover:text-primary/70'
                                  }`}
                                >
                                  {expandedIds.has(i.id) ? 'View Less ▲' : 'View More ▼'}
                                </button>
                              )}
                              <p className={`text-xs mt-2 opacity-75`}>
                                Reported by <b>{getReporterName(i)}</b> · {formatIncidentDate(i.created_at)}
                              </p>
                            </div>
                            {i.status === 'resolved' ? (
                              <Button
                                variant="outline"
                                size="sm"
                                className="flex items-center gap-1 border h-9 px-3 text-xs font-semibold"
                                onClick={() => setViewIncident(i)}
                              >
                                View Log
                              </Button>
                            ) : (
                              <Button
                                variant="outline"
                                size="sm"
                                className={`flex items-center gap-1 border ${
                                  theme === 'dark'
                                    ? 'bg-green-900/20 text-green-400 border-green-500/30 hover:bg-green-900/40'
                                    : 'bg-green-100 text-green-700 border-green-200 hover:bg-green-200/80'
                                }`}
                                onClick={() => setResolveId(i.id)}
                              >
                                <CheckCircle size={14} /> Resolve
                              </Button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                );
              })()}
            </div>
            {incidents.length > ROWS_PER_PAGE && (
              <CardFooter className="flex flex-col sm:flex-row justify-between items-center gap-4 text-sm text-muted-foreground px-6 py-4 border-t border-border mt-auto">
                <div>
                  {incidents.length > 0 && (() => {
                    const safePage2 = Math.min(currentPage, Math.ceil(incidents.length / ROWS_PER_PAGE));
                    const start2 = Math.min((safePage2 - 1) * ROWS_PER_PAGE + 1, incidents.length);
                    const end2 = Math.min(safePage2 * ROWS_PER_PAGE, incidents.length);
                    return <>Showing {start2} to {end2} of {incidents.length} incidents</>;
                  })()}
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1 || loading}
                    className="bg-primary hover:bg-primary/90 text-white border-primary h-9 px-4 transition-all"
                  >
                    Previous
                  </Button>
                  <div className="flex items-center justify-center min-w-[2rem]">
                    <span className={`text-sm font-semibold ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>
                      {Math.min(currentPage, Math.max(1, Math.ceil(incidents.length / ROWS_PER_PAGE)))}
                    </span>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(p => Math.min(Math.ceil(incidents.length / ROWS_PER_PAGE), p + 1))}
                    disabled={currentPage === Math.ceil(incidents.length / ROWS_PER_PAGE) || loading}
                    className="bg-primary hover:bg-primary/90 text-white border-primary h-9 px-4 transition-all"
                  >
                    Next
                  </Button>
                </div>
              </CardFooter>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
};

export default TransportIncidents;
