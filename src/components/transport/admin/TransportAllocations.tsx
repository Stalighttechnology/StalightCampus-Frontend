import React, { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Swal from "sweetalert2";
import { useTheme } from "../../../context/ThemeContext";
import {
  fetchAllocations, fetchRoutes, fetchTransportFilters, fetchRouteOptions,
  createAllocation, deleteAllocation, fetchBranchSemesters, fetchRouteStops, fetchEligibleStudents
} from "../../../utils/transport_api";
import { Badge, AllocationT, RouteT } from "./TransportCommon";
import { Card, CardHeader, CardTitle, CardFooter, CardContent } from "../../ui/card";
import { Button } from "../../ui/button";
import { SkeletonTable } from "../../ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "../../ui/select";
import { Users, Navigation, Search, Filter, Plus, Trash2, X, ChevronLeft, ChevronRight, CheckCircle, RefreshCw } from "lucide-react";

const TransportAllocations: React.FC = () => {
  const { theme } = useTheme();
  const [loading, setLoading] = useState(true);
  const [allocations, setAllocations] = useState<AllocationT[]>([]);
  const [routes, setRoutes] = useState<RouteT[]>([]);

  // Filter options state
  const [filterOptions, setFilterOptions] = useState({ branches: [], batches: [], semesters: [] });

  // Pagination & Filters State
  const [allocPage, setAllocPage] = useState(1);
  const [allocTotalPages, setAllocTotalPages] = useState(1);
  const [allocCount, setAllocCount] = useState(0);
  const [allocFilters, setAllocFilters] = useState({ route: "", status: "", search: "", branch: "", batch: "", semester: "" });
  
  // Eligible Student States
  const [eligibleStudents, setEligibleStudents] = useState<any[]>([]);
  const [eligiblePage, setEligiblePage] = useState(1);
  const [eligibleTotalPages, setEligibleTotalPages] = useState(1);
  const [eligibleFilters, setEligibleFilters] = useState({ search: "", branch: "", batch: "", semester: "" });

  // Form states
  const [showAllocForm, setShowAllocForm] = useState(false);
  const [allocationForm, setAllocationForm] = useState({ student: '', route: '', stop: '' });
  const [allocOptions, setAllocOptions] = useState({ routes: [] as any[], stops: [] as any[] });
  const [branchSemesters, setBranchSemesters] = useState<any[]>([]);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetchRoutes();
      if (r.results || Array.isArray(r)) setRoutes(r.results || r);

      const al = await fetchAllocations(allocPage, allocFilters.route, allocFilters.status, allocFilters.search);
      if (al.results || Array.isArray(al)) {
        setAllocations(al.results || al);
        setAllocCount(al.count || (al.results || al).length);
        setAllocTotalPages(Math.ceil((al.count || 1) / 20));
      }
    } finally {
      setLoading(false);
    }
  }, [allocPage, allocFilters]);

  const loadAllocations = async () => {
    setLoading(true);
    try {
      const a = await fetchAllocations(allocPage, allocFilters.route, allocFilters.status, allocFilters.search);
      if (a.results) {
        setAllocations(a.results);
        setAllocCount(a.count || a.results.length);
        setAllocTotalPages(Math.ceil((a.count || 1) / 20));
      } else if (Array.isArray(a)) {
        setAllocations(a);
        setAllocCount(a.length);
        setAllocTotalPages(1);
      }
    } finally {
      setLoading(false);
    }
  };
  
  const loadEligibleStudents = async () => {
    if (!eligibleFilters.branch || !eligibleFilters.batch || !eligibleFilters.semester) {
      setEligibleStudents([]);
      setEligibleTotalPages(1);
      return;
    }
    const r = await fetchEligibleStudents(eligiblePage, eligibleFilters.branch, eligibleFilters.batch, eligibleFilters.semester, eligibleFilters.search);
    if (r.results) {
      setEligibleStudents(r.results);
      setEligibleTotalPages(Math.ceil((r.count || 1) / 25));
    } else if (r.students) setEligibleStudents(r.students);
  };

  useEffect(() => {
    loadData();
  }, [allocPage, allocFilters]);
  
  useEffect(() => {
    if (showAllocForm) {
      const timeout = setTimeout(() => {
        loadEligibleStudents();
      }, 300);
      return () => clearTimeout(timeout);
    }
  }, [showAllocForm, eligiblePage, eligibleFilters]);

  useEffect(() => {
    if (eligibleFilters.branch) {
      fetchBranchSemesters(parseInt(eligibleFilters.branch)).then(res => {
        if (res.success) setBranchSemesters(res.semesters);
      });
    } else {
      setBranchSemesters([]);
      setEligibleFilters(f => ({ ...f, semester: "" }));
    }
  }, [eligibleFilters.branch]);

  useEffect(() => {
    if (allocationForm.route) {
      fetchRouteStops(parseInt(allocationForm.route)).then(res => {
        if (res.success) setAllocOptions(prev => ({ ...prev, stops: res.stops }));
      });
    } else {
      setAllocOptions(prev => ({ ...prev, stops: [] }));
      setAllocationForm(f => ({ ...f, stop: "" }));
    }
  }, [allocationForm.route]);

  const handleOpenAllocForm = async () => {
    setShowAllocForm(true);
    if (filterOptions.branches.length === 0) {
      const filters = await fetchTransportFilters();
      if (filters.success) {
        setFilterOptions({ branches: filters.branches || [], batches: filters.batches || [], semesters: [] });
      }
    }
    if (allocOptions.routes.length === 0) {
      const routeOps = await fetchRouteOptions();
      if (routeOps.success) {
        setAllocOptions(prev => ({ ...prev, routes: routeOps.routes || [] }));
      }
    }
  };

  const handleAllocate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!allocationForm.student || !allocationForm.route || !allocationForm.stop) {
      Swal.fire("Warning", "Please select student, route, and boarding stop.", "warning");
      return;
    }
    try {
      const res = await createAllocation({ student: parseInt(allocationForm.student), route: parseInt(allocationForm.route), stop: parseInt(allocationForm.stop) });
      if (res.id) { 
        Swal.fire("Allocated!", "Student successfully assigned to route stop.", "success");
        setShowAllocForm(false); 
        setAllocations(prev => [res, ...prev]);
        setAllocCount(prev => prev + 1);
        setAllocationForm({ student: '', route: '', stop: '' }); 
      } else {
        Swal.fire("Error", res.detail || res.message || 'Failed to allocate student', "error");
      }
    } catch (err) {
      Swal.fire("Error", "Server error processing allocation", "error");
    }
  };

  const handleRemoveAllocation = async (id: number) => {
    const confirmResult = await Swal.fire({
      title: "Remove Allocation?",
      text: "Are you sure you want to remove this student's transport allocation?",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      cancelButtonColor: "#3085d6",
      confirmButtonText: "Yes, remove"
    });

    if (confirmResult.isConfirmed) {
      try {
        await deleteAllocation(id);
        Swal.fire("Removed", "Allocation record has been deleted.", "success");
        setAllocations(allocations.filter(a => a.id !== id));
        setAllocCount(prev => Math.max(0, prev - 1));
      } catch (error) {
        Swal.fire("Error", "Failed to delete allocation record.", "error");
      }
    }
  };

  const bg = theme === 'dark' ? 'bg-background text-foreground' : 'bg-gray-50 text-gray-900';
  const cardBg = theme === 'dark' ? 'bg-card border-border text-foreground' : 'bg-white border-gray-200 text-gray-900';
  const input = theme === 'dark' ? 'bg-[#1c1c1e] border-[#3a3a3c] text-white focus:ring-primary' : 'bg-gray-50 border-gray-200 focus:ring-primary';

  return (
    <div className="space-y-6">

      {/* Allocation Setup form */}
      <AnimatePresence>
        {showAllocForm && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
          >
            <Card className={`p-6 border shadow-sm backdrop-blur-sm ${cardBg}`}>
              <div className="flex justify-between items-center mb-4 pb-2 border-b border-inherit">
                <h3 className="text-lg font-semibold flex items-center gap-2 text-primary">
                  <Users className="w-5 h-5" /> Allocate Student to Stop
                </h3>
                <Button variant="ghost" size="icon" onClick={() => setShowAllocForm(false)}>
                  <X size={16} />
                </Button>
              </div>
              <form onSubmit={handleAllocate} className="space-y-5">
                {/* Eligible Student Filters */}
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 items-end">
                  <div>
                    <label className="block text-xs font-semibold uppercase opacity-70 mb-2">Branch</label>
                    <Select
                      value={eligibleFilters.branch}
                      onValueChange={(val) => setEligibleFilters(f => ({ ...f, branch: val, semester: "" }))}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Branch" />
                      </SelectTrigger>
                      <SelectContent>
                        {filterOptions.branches.map((b: any) => <SelectItem key={b.id} value={b.id.toString()}>{b.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold uppercase opacity-70 mb-2">Batch</label>
                    <Select
                      value={eligibleFilters.batch}
                      onValueChange={(val) => setEligibleFilters(f => ({ ...f, batch: val }))}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Batch" />
                      </SelectTrigger>
                      <SelectContent>
                        {filterOptions.batches.map((b: any) => <SelectItem key={b.id} value={b.id.toString()}>{b.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold uppercase opacity-70 mb-2">Semester</label>
                    <Select
                      value={eligibleFilters.semester}
                      disabled={!eligibleFilters.branch || !eligibleFilters.batch || branchSemesters.length === 0}
                      onValueChange={(val) => setEligibleFilters(f => ({ ...f, semester: val }))}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Semester" />
                      </SelectTrigger>
                      <SelectContent>
                        {branchSemesters.map((s: any) => <SelectItem key={s.id} value={s.id.toString()}>Sem {s.number}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="relative">
                    <Search size={14} className="absolute left-3 top-9 text-gray-400" />
                    <label className="block text-xs font-semibold uppercase opacity-70 mb-2">Search Student</label>
                    <input type="text" placeholder="USN or Name..." className={`w-full pl-9 pr-3 py-2 border rounded-lg text-sm focus:outline-none ${input}`} value={eligibleFilters.search} onChange={e => setEligibleFilters(f => ({ ...f, search: e.target.value }))} />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 border-t border-inherit pt-4">
                  <div>
                    <label className="text-xs font-semibold uppercase opacity-70 mb-2 flex justify-between items-center">
                      <span>Select Student</span>
                      {eligibleTotalPages > 1 && (
                        <div className="flex items-center gap-1">
                          <button onClick={() => setEligiblePage(p => Math.max(1, p - 1))} disabled={eligiblePage === 1} className="p-0.5 rounded bg-gray-100 dark:bg-accent disabled:opacity-50 hover:bg-gray-200 text-gray-700" type="button"><ChevronLeft size={12} /></button>
                          <span className="text-[10px] opacity-70">Pg {eligiblePage}/{eligibleTotalPages}</span>
                          <button onClick={() => setEligiblePage(p => Math.min(eligibleTotalPages, p + 1))} disabled={eligiblePage === eligibleTotalPages} className="p-0.5 rounded bg-gray-100 dark:bg-accent disabled:opacity-50 hover:bg-gray-200 text-gray-700" type="button"><ChevronRight size={12} /></button>
                        </div>
                      )}
                    </label>
                    <Select
                      value={allocationForm.student}
                      disabled={eligibleStudents.length === 0}
                      onValueChange={(val) => setAllocationForm(f => ({ ...f, student: val }))}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder={eligibleStudents.length === 0 ? "Filter options first..." : "Select student..."} />
                      </SelectTrigger>
                      <SelectContent>
                        {eligibleStudents.map(s => <SelectItem key={s.id} value={s.id.toString()}>{s.name} ({s.usn})</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold uppercase opacity-70 mb-2">Select Route</label>
                    <Select
                      value={allocationForm.route}
                      onValueChange={(val) => setAllocationForm(f => ({ ...f, route: val, stop: '' }))}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Choose Route" />
                      </SelectTrigger>
                      <SelectContent>
                        {allocOptions.routes.map((r: any) => <SelectItem key={r.id} value={r.id.toString()}>{r.route_name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold uppercase opacity-70 mb-2">Select Stop</label>
                    <Select
                      value={allocationForm.stop}
                      disabled={!allocationForm.route || allocOptions.stops.length === 0}
                      onValueChange={(val) => setAllocationForm(f => ({ ...f, stop: val }))}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder={!allocationForm.route ? "Select route first" : "Choose Stop"} />
                      </SelectTrigger>
                      <SelectContent>
                        {allocOptions.stops.map((s: any) => <SelectItem key={s.id} value={s.id.toString()}>{s.stop_name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <div className="flex gap-2 justify-end pt-3 border-t border-inherit">
                  <Button type="submit" className="bg-gradient-to-r from-primary to-purple-600 text-white font-semibold rounded-lg flex items-center justify-center gap-1.5 h-10 px-6">
                    <CheckCircle size={16} /> Save Allocation
                  </Button>
                </div>
              </form>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Allocations Table Card */}
      <Card className={`border overflow-hidden shadow-sm backdrop-blur-sm ${cardBg}`}>
        <CardHeader className="pb-3 border-b border-inherit">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <CardTitle className="sm:text-xl text-lg font-semibold flex items-center gap-2">
                  <Users size={20} className="text-primary" /> Active Transport Allocations
                </CardTitle>
                {allocCount > 0 && (
                  <span className={`text-xs font-medium px-2.5 py-0.5 rounded-full ${theme === 'dark' ? 'bg-primary/10 text-primary' : 'bg-blue-100 text-blue-700'}`}>
                    {allocCount} Students
                  </span>
                )}
              </div>
            </div>
            {!showAllocForm && (
              <Button onClick={handleOpenAllocForm} className="bg-primary hover:bg-primary/95 text-white flex items-center gap-1">
                <Plus size={15} /> Allocate Student
              </Button>
            )}
          </div>
        </CardHeader>

        {/* Filters Bar */}
        {!showAllocForm && (
          <div className={`p-4 border-b border-inherit flex flex-wrap gap-3 items-center ${theme === 'dark' ? 'bg-card' : 'bg-gray-50'}`}>
            <div className="flex items-center gap-2 text-sm font-semibold opacity-75"><Filter size={14} /> Filters:</div>
            
            <Select value={allocFilters.route} onValueChange={(val) => setAllocFilters(f => ({ ...f, route: val }))}>
              <SelectTrigger className="w-[180px] h-9">
                <SelectValue placeholder="All Routes" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none_all">All Routes</SelectItem>
                {routes.map(r => <SelectItem key={r.id} value={r.id.toString()}>{r.route_name}</SelectItem>)}
              </SelectContent>
            </Select>

            <Select value={allocFilters.status} onValueChange={(val) => setAllocFilters(f => ({ ...f, status: val }))}>
              <SelectTrigger className="w-[150px] h-9">
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none_all">All Statuses</SelectItem>
                <SelectItem value="allocated">Allocated</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>

            <div className="flex-1 relative min-w-[200px]">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input type="text" placeholder="Search by name or USN..." className={`w-full pl-9 pr-3 py-1.5 border rounded-lg text-sm focus:outline-none focus:ring-1 ${input}`} value={allocFilters.search} onChange={e => setAllocFilters(f => ({ ...f, search: e.target.value }))} />
            </div>
          </div>
        )}

        {loading ? (
          <div className="p-4"><SkeletonTable rows={8} cols={6} /></div>
        ) : (
          <>
            <div className="overflow-x-auto thin-scrollbar">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className={`sticky top-0 z-10 border-b text-xs uppercase tracking-wider font-semibold ${theme === 'dark' ? 'bg-card border-border text-foreground shadow-sm' : 'bg-gray-50 border-gray-200 text-gray-900 shadow-sm'}`}>
                    <th className="p-4">USN</th>
                    <th className="p-4">Student Name</th>
                    <th className="p-4">Academic Details</th>
                    <th className="p-4">Route Info</th>
                    <th className="p-4">Status</th>
                    <th className="p-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-inherit">
                  {allocations.length === 0 ? (
                    <tr><td colSpan={6} className="p-8 text-center opacity-60 text-sm">No allocations found.</td></tr>
                  ) : allocations.map(a => (
                    <tr key={a.id} className={`border-b text-sm transition-colors duration-200 ${theme === 'dark' ? 'border-border hover:bg-accent text-foreground' : 'border-gray-200 hover:bg-gray-50 text-gray-900'}`}>
                      <td className="p-4 font-mono text-xs font-semibold">{a.student_details?.usn}</td>
                      <td className="p-4 font-semibold">{a.student_details?.name}</td>
                      <td className="p-4 text-xs opacity-75">{a.student_details?.branch_name} (Sem {a.student_details?.semester_number})</td>
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <Navigation size={12} className="opacity-50 text-primary" />
                          <span>{a.route_details?.route_name} <span className="opacity-50 mx-1">→</span> {a.stop_details?.stop_name}</span>
                        </div>
                      </td>
                      <td className="p-4"><Badge label={a.status} color={a.status} /></td>
                      <td className="p-4 text-right">
                        <Button size="icon" variant="ghost" onClick={() => handleRemoveAllocation(a.id)} className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20" title="Remove Allocation">
                          <Trash2 size={15} />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            {/* Pagination */}
            {allocTotalPages > 1 && (
              <CardFooter className="flex flex-col sm:flex-row justify-between items-center gap-4 text-sm text-muted-foreground px-6 py-4 border-t border-inherit mt-auto">
                <div>
                  Showing <span className="font-medium">{allocCount > 0 ? (allocPage - 1) * 20 + 1 : 0}</span> to <span className="font-medium">{Math.min(allocPage * 20, allocCount)}</span> of <span className="font-medium">{allocCount}</span> allocations
                </div>
                <div className="flex items-center gap-2">
                  <Button disabled={allocPage === 1} onClick={() => setAllocPage(p => Math.max(1, p - 1))} className="bg-primary hover:bg-primary/90 text-white border-primary h-9 px-4 transition-all">
                    Previous
                  </Button>
                  <div className="flex items-center justify-center px-2">
                    <span className={`text-sm font-semibold ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>
                      Page {allocPage} of {allocTotalPages}
                    </span>
                  </div>
                  <Button disabled={allocPage === allocTotalPages} onClick={() => setAllocPage(p => Math.min(allocTotalPages, p + 1))} className="bg-primary hover:bg-primary/90 text-white border-primary h-9 px-4 transition-all">
                    Next
                  </Button>
                </div>
              </CardFooter>
            )}
          </>
        )}
      </Card>
    </div>
  );
};

export default TransportAllocations;
