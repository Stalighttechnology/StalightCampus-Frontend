import { translateTerminology, getTerm } from "@/utils/institutionConfig";
import React, { useState, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import Swal from "sweetalert2";
import { useTheme } from "../../../context/ThemeContext";
import {
  fetchAllocations, fetchRoutes, fetchTransportFilters, fetchRouteOptions,
  createAllocation, deleteAllocation, fetchBranchSemesters, fetchRouteStops, fetchEligibleStudents, updateAllocation,
  fetchSemesterSections
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
import { Users, Navigation, Search, Filter, Plus, Trash2, X, ChevronLeft, ChevronRight, CheckCircle, RefreshCw, Pencil } from "lucide-react";
import { useNavigate } from "react-router-dom";

const TransportAllocations: React.FC = () => {
  const { theme } = useTheme();
  const navigate = useNavigate();
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
  const [showFilterModal, setShowFilterModal] = useState(false);
  
  // Eligible Student States
  const [eligibleStudents, setEligibleStudents] = useState<any[]>([]);
  const [eligiblePage, setEligiblePage] = useState(1);
  const [eligibleTotalPages, setEligibleTotalPages] = useState(1);
  const [eligibleFilters, setEligibleFilters] = useState({ search: "", branch: "", batch: "", semester: "", section: "" });

  // Form states
  const [allocationForm, setAllocationForm] = useState({ student: '', route: '', stop: '' });
  const [allocOptions, setAllocOptions] = useState({ routes: [] as any[], stops: [] as any[] });
  const [branchSemesters, setBranchSemesters] = useState<any[]>([]);
  const [semesterSections, setSemesterSections] = useState<any[]>([]);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);

  // Edit states
  const [editingAllocation, setEditingAllocation] = useState<any | null>(null);
  const [editAllocForm, setEditAllocForm] = useState({ student_id: '', route_id: '', stop_id: '', status: 'allocated' });
  const [editAllocOptions, setEditAllocOptions] = useState({ stops: [] as any[] });

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

  const loadFormOptions = useCallback(async () => {
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
  }, [filterOptions.branches.length, allocOptions.routes.length]);

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
    if (!eligibleFilters.branch || !eligibleFilters.batch || !eligibleFilters.semester || !eligibleFilters.section) {
      setEligibleStudents([]);
      setEligibleTotalPages(1);
      return;
    }
    const r = await fetchEligibleStudents(eligiblePage, eligibleFilters.branch, eligibleFilters.batch, eligibleFilters.semester, eligibleFilters.search, eligibleFilters.section);
    if (r.results) {
      setEligibleStudents(r.results);
      setEligibleTotalPages(Math.ceil((r.count || 1) / 25));
    } else if (r.students) setEligibleStudents(r.students);
  };

  useEffect(() => {
    loadData();
    loadFormOptions();
  }, [allocPage, allocFilters, loadFormOptions]);
  
  useEffect(() => {
    const timeout = setTimeout(() => {
      loadEligibleStudents();
    }, 300);
    return () => clearTimeout(timeout);
  }, [eligiblePage, eligibleFilters]);

  useEffect(() => {
    if (eligibleFilters.branch) {
      fetchBranchSemesters(parseInt(eligibleFilters.branch)).then(res => {
        if (res.success) setBranchSemesters(res.semesters);
      });
    } else {
      setBranchSemesters([]);
      setEligibleFilters(f => ({ ...f, semester: "", section: "" }));
    }
  }, [eligibleFilters.branch]);

  useEffect(() => {
    if (eligibleFilters.semester) {
      const branchId = eligibleFilters.branch ? parseInt(eligibleFilters.branch) : undefined;
      fetchSemesterSections(parseInt(eligibleFilters.semester), branchId).then(res => {
        if (res.success) setSemesterSections(res.sections);
      });
    } else {
      setSemesterSections([]);
      setEligibleFilters(f => ({ ...f, section: "" }));
    }
  }, [eligibleFilters.semester, eligibleFilters.branch]);

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

  useEffect(() => {
    if (eligibleFilters.branch) {
      setOpenDropdown('batch');
    }
  }, [eligibleFilters.branch]);

  useEffect(() => {
    if (eligibleFilters.batch) {
      setOpenDropdown('semester');
    }
  }, [eligibleFilters.batch]);

  useEffect(() => {
    if (eligibleFilters.semester) {
      setOpenDropdown('section');
    }
  }, [eligibleFilters.semester]);

  useEffect(() => {
    if (eligibleFilters.section) {
      setOpenDropdown('student');
    }
  }, [eligibleFilters.section]);

  useEffect(() => {
    if (allocationForm.student) {
      setOpenDropdown('route');
    }
  }, [allocationForm.student]);

  useEffect(() => {
    if (allocationForm.route) {
      setOpenDropdown('stop');
    }
  }, [allocationForm.route]);

  useEffect(() => {
    if (editAllocForm.route_id) {
      fetchRouteStops(parseInt(editAllocForm.route_id)).then(res => {
        if (res.success) setEditAllocOptions(prev => ({ ...prev, stops: res.stops }));
      });
    } else {
      setEditAllocOptions(prev => ({ ...prev, stops: [] }));
    }
  }, [editAllocForm.route_id]);

  const startEditAllocation = async (a: any) => {
    setEditingAllocation(a);
    setEditAllocForm({
      student_id: String(a.student_details?.id || a.student || ''),
      route_id: String(a.route_details?.id || a.route || ''),
      stop_id: String(a.stop_details?.id || a.stop || ''),
      status: a.status
    });
    const routeId = a.route_details?.id || a.route;
    if (routeId) {
      const res = await fetchRouteStops(parseInt(routeId));
      if (res.success) {
        setEditAllocOptions(prev => ({ ...prev, stops: res.stops }));
      }
    }
  };

  const handleUpdateAllocation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAllocation) return;
    if (!editAllocForm.student_id || !editAllocForm.route_id || !editAllocForm.stop_id) {
      Swal.fire("Warning", "Please select student, route, and stop.", "warning");
      return;
    }

    try {
      const res = await updateAllocation(editingAllocation.id, {
        student: parseInt(editAllocForm.student_id),
        route: parseInt(editAllocForm.route_id),
        stop: parseInt(editAllocForm.stop_id),
        status: editAllocForm.status
      });
      if (res.id) {
        Swal.fire("Updated!", "Allocation updated successfully.", "success");
        setAllocations(prev => prev.map(item => item.id === editingAllocation.id ? res : item));
        setEditingAllocation(null);
      } else {
        Swal.fire("Error", res.detail || res.message || 'Failed to update allocation', "error");
      }
    } catch (err) {
      Swal.fire("Error", "Server error updating allocation", "error");
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
    <div id="transport-allocations-header" className="space-y-6">
      {/* Allocation Setup form */}
      <Card id="transport-allocation-form-card" className={`p-6 border shadow-sm backdrop-blur-sm ${cardBg}`}>
        <div className="flex justify-between items-center mb-4 pb-2 border-b border-inherit">
          <h3 className="text-xl font-semibold flex items-center gap-2">
            Allocate Student to Stop
          </h3>
        </div>
        <form onSubmit={handleAllocate} className="space-y-5">
          {/* Eligible Student Filters */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 items-end">
            <div>
              <label className="block text-xs font-semibold uppercase opacity-70 mb-2">{translateTerminology("Branch")}</label>
              <Select
                value={eligibleFilters.branch}
                onValueChange={(val) => setEligibleFilters(f => ({ ...f, branch: val, semester: "", section: "" }))}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder={translateTerminology("Branch")} />
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
                disabled={!eligibleFilters.branch}
                open={openDropdown === 'batch'}
                onOpenChange={(open) => setOpenDropdown(open ? 'batch' : null)}
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
              <label className="block text-xs font-semibold uppercase opacity-70 mb-2">{translateTerminology("Semester")}</label>
              <Select
                value={eligibleFilters.semester}
                disabled={!eligibleFilters.branch || !eligibleFilters.batch || branchSemesters.length === 0}
                open={openDropdown === 'semester'}
                onOpenChange={(open) => setOpenDropdown(open ? 'semester' : null)}
                onValueChange={(val) => setEligibleFilters(f => ({ ...f, semester: val, section: "" }))}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder={translateTerminology("Semester")} />
                </SelectTrigger>
                <SelectContent>
                  {branchSemesters.map((s: any) => <SelectItem key={s.id} value={s.id.toString()}>Sem {s.number}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase opacity-70 mb-2">Section</label>
              <Select
                value={eligibleFilters.section}
                disabled={!eligibleFilters.branch || !eligibleFilters.batch || !eligibleFilters.semester || semesterSections.length === 0}
                open={openDropdown === 'section'}
                onOpenChange={(open) => setOpenDropdown(open ? 'section' : null)}
                onValueChange={(val) => setEligibleFilters(f => ({ ...f, section: val }))}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Section" />
                </SelectTrigger>
                <SelectContent>
                  {semesterSections.map((sec: any) => <SelectItem key={sec.id} value={sec.id.toString()}>Section {sec.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 border-t border-inherit pt-4">
            <div>
              <label className="text-xs font-semibold uppercase opacity-70 mb-2 block">
                Select Student
              </label>
              <Select
                value={allocationForm.student}
                disabled={!eligibleFilters.branch || !eligibleFilters.batch || !eligibleFilters.semester || !eligibleFilters.section}
                open={openDropdown === 'student'}
                onOpenChange={(open) => setOpenDropdown(open ? 'student' : null)}
                onValueChange={(val) => setAllocationForm(f => ({ ...f, student: val }))}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder={
                    (!eligibleFilters.branch || !eligibleFilters.batch || !eligibleFilters.semester || !eligibleFilters.section)
                      ? "Filter options first..."
                      : (eligibleStudents.length === 0 ? "No eligible students found" : "Select student...")
                  } />
                </SelectTrigger>
                <SelectContent className="max-h-56 overflow-y-auto">
                  <div 
                    className="px-2 py-1.5 sticky top-0 bg-popover z-10 border-b border-border/40" 
                    onClick={(e) => e.stopPropagation()} 
                    onKeyDown={(e) => e.stopPropagation()}
                  >
                    <div className="relative">
                      <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                      <input 
                        type="text" 
                        placeholder="Search student..." 
                        className={`w-full pl-8 pr-2.5 py-1 text-xs rounded-md border focus:outline-none focus:ring-1 ${input}`} 
                        value={eligibleFilters.search} 
                        onChange={e => {
                          setEligiblePage(1);
                          setEligibleFilters(f => ({ ...f, search: e.target.value }));
                        }}
                      />
                    </div>
                  </div>
                  {eligibleStudents.length === 0 ? (
                    <div className="py-4 text-center text-xs text-muted-foreground select-none">
                      No matching students found
                    </div>
                  ) : (
                    eligibleStudents.map(s => (
                      <SelectItem key={s.id} value={s.id.toString()} disabled={s.is_allocated}>
                        {s.name} ({s.usn}){s.is_allocated ? " (Allocated)" : ""}
                      </SelectItem>
                    ))
                  )}
                  {eligibleTotalPages > 1 && (
                    <div 
                      className={`relative mt-2 border-t border-inherit flex items-center justify-between px-3 py-1.5 text-xs ${theme === 'dark' ? 'bg-[#1c1c1e] text-gray-300' : 'bg-white text-gray-600'}`}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button 
                        type="button" 
                        onClick={(e) => { 
                          e.preventDefault(); 
                          e.stopPropagation(); 
                          setEligiblePage(p => Math.max(1, p - 1)); 
                        }} 
                        disabled={eligiblePage === 1} 
                        className="p-1 rounded hover:bg-accent disabled:opacity-50 text-foreground"
                      >
                        <ChevronLeft size={14} />
                      </button>
                      <span>Pg {eligiblePage} / {eligibleTotalPages}</span>
                      <button 
                        type="button" 
                        onClick={(e) => { 
                          e.preventDefault(); 
                          e.stopPropagation(); 
                          setEligiblePage(p => Math.min(eligibleTotalPages, p + 1)); 
                        }} 
                        disabled={eligiblePage === eligibleTotalPages} 
                        className="p-1 rounded hover:bg-accent disabled:opacity-50 text-foreground"
                      >
                        <ChevronRight size={14} />
                      </button>
                    </div>
                  )}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase opacity-70 mb-2">Select Route</label>
              <Select
                value={allocationForm.route}
                disabled={!allocationForm.student}
                open={openDropdown === 'route'}
                onOpenChange={(open) => setOpenDropdown(open ? 'route' : null)}
                onValueChange={(val) => setAllocationForm(f => ({ ...f, route: val, stop: '' }))}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder={!allocationForm.student ? "Select student first" : "Choose Route"} />
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
                disabled={!allocationForm.route}
                open={openDropdown === 'stop'}
                onOpenChange={(open) => setOpenDropdown(open ? 'stop' : null)}
                onValueChange={(val) => {
                  if (val === "add_stop") {
                    navigate('/transport-admin/transport-routes');
                  } else {
                    setAllocationForm(f => ({ ...f, stop: val }));
                  }
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder={!allocationForm.route ? "Select route first" : "Choose Stop"} />
                </SelectTrigger>
                <SelectContent>
                  {allocOptions.stops.length === 0 ? (
                    <SelectItem value="add_stop" className="text-primary font-semibold">
                      + Add Stop to Route
                    </SelectItem>
                  ) : (
                    allocOptions.stops.map((s: any) => <SelectItem key={s.id} value={s.id.toString()}>{s.stop_name}</SelectItem>)
                  )}
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

      {/* Allocations Table Card */}
      <Card className={`border overflow-hidden shadow-sm backdrop-blur-sm ${cardBg}`}>
        <div id="transport-allocations-table-header">
          <CardHeader className="pb-3 border-b border-inherit">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
              <div>
                <div className="flex items-center justify-between w-full">
                  <div className="flex items-center gap-2">
                    <CardTitle className="sm:text-xl text-lg font-semibold flex items-center gap-2">
                      Active Transport Allocations
                    </CardTitle>
                    {allocCount > 0 && (
                      <span className={`hidden sm:inline-flex text-xs font-medium px-2.5 py-0.5 rounded-full ${theme === 'dark' ? 'bg-primary/10 text-primary' : 'bg-blue-100 text-blue-700'}`}>
                        {allocCount} Students
                      </span>
                    )}
                  </div>
                  <Button 
                    onClick={() => setShowFilterModal(true)} 
                    className="md:hidden w-10 h-10 text-sm font-medium flex items-center justify-center gap-1.5 shadow-sm transition-all duration-200 bg-primary text-white hover:bg-primary/90 p-0 flex-shrink-0"
                    title="Filters"
                  >
                    <Filter className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
          </CardHeader>

          {/* Filters Bar */}
          <div className={`p-4 border-b border-inherit flex flex-col md:flex-row gap-3 md:items-center ${theme === 'dark' ? 'bg-card' : 'bg-gray-50'}`}>
            <div className="hidden md:flex items-center gap-3 w-full md:w-auto">
              <div className="flex items-center gap-1.5 text-sm font-semibold opacity-75 flex-shrink-0">
                <Filter size={14} /> Filters:
              </div>
              
              <Select value={allocFilters.route} onValueChange={(val) => setAllocFilters(f => ({ ...f, route: val }))}>
                <SelectTrigger className="flex-1 min-w-0 sm:w-[180px] sm:flex-initial h-9">
                  <SelectValue placeholder="All Routes" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none_all">All Routes</SelectItem>
                  {routes.map(r => <SelectItem key={r.id} value={r.id.toString()}>{r.route_name}</SelectItem>)}
                </SelectContent>
              </Select>

              <Select value={allocFilters.status} onValueChange={(val) => setAllocFilters(f => ({ ...f, status: val }))}>
                <SelectTrigger className="flex-1 min-w-0 sm:w-[150px] sm:flex-initial h-9">
                  <SelectValue placeholder="All Statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none_all">All Statuses</SelectItem>
                  <SelectItem value="allocated">Allocated</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex-1 relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input type="text" placeholder="Search by name or USN..." className={`w-full pl-9 pr-3 py-1.5 border rounded-lg text-sm focus:outline-none focus:ring-1 ${input}`} value={allocFilters.search} onChange={e => setAllocFilters(f => ({ ...f, search: e.target.value }))} />
            </div>
          </div>
        </div>

        {loading ? (
          <div className="p-4"><SkeletonTable rows={8} cols={6} /></div>
        ) : (
          <>
            <div className="overflow-x-auto thin-scrollbar">
              <table className="w-full text-left border-collapse whitespace-nowrap">
                <thead>
                  <tr className={`sticky top-0 z-10 border-b text-sm sm:text-xs uppercase tracking-wider font-semibold ${theme === 'dark' ? 'bg-card border-border text-foreground shadow-sm' : 'bg-gray-50 border-gray-200 text-gray-900 shadow-sm'}`}>
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
                    <tr>
                      <td colSpan={6} className="p-6">
                        <div className={`flex flex-col items-center justify-center py-10 px-4 rounded-xl border-2 border-dashed text-center transition-all duration-300 ${theme === 'dark' ? 'border-border bg-card/30 text-muted-foreground' : 'border-gray-200 bg-gray-50/50 text-gray-500'}`}>
                          <div className={`p-4 rounded-full mb-4 ${theme === 'dark' ? 'bg-primary/20 text-primary' : 'bg-primary/10 text-primary'}`}>
                            <Users size={32} className="opacity-80" />
                          </div>
                          <h3 className={`text-base font-semibold mb-1 ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>No Allocations Found</h3>
                          <p className="max-w-xs text-xs leading-relaxed opacity-80">
                            No student allocations configured yet. Select a student and assign a route using the allocation form on the left.
                          </p>
                        </div>
                      </td>
                    </tr>
                  ) : allocations.map(a => (
                    <tr key={a.id} className={`border-b text-sm transition-colors duration-200 ${theme === 'dark' ? 'border-border hover:bg-accent text-foreground' : 'border-gray-200 hover:bg-gray-50 text-gray-900'}`}>
                      <td className="p-4 font-mono text-sm sm:text-xs font-semibold">{a.student_details?.usn}</td>
                      <td className="p-4 font-semibold text-base sm:text-sm">{a.student_details?.name}</td>
                      <td className="p-4 text-sm sm:text-xs opacity-75">{a.student_details?.branch_name} (Sem {a.student_details?.semester_number})</td>
                      <td className="p-4 text-sm sm:text-xs">
                        <div className="flex items-center gap-2">
                          <Navigation size={12} className="opacity-50 text-primary" />
                          <span>{a.route_details?.route_name} <span className="opacity-50 mx-1">→</span> {a.stop_details?.stop_name}</span>
                        </div>
                      </td>
                      <td className="p-4 text-sm sm:text-xs"><Badge label={a.status} color={a.status} /></td>
                      <td className="p-4 text-right">
                        <div className="flex justify-end gap-1.5">
                          <Button size="icon" variant="ghost" onClick={() => startEditAllocation(a)} className="h-8 w-8 text-primary" title="Edit Allocation">
                            <Pencil size={15} />
                          </Button>
                          <Button size="icon" variant="ghost" onClick={() => handleRemoveAllocation(a.id)} className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20" title="Remove Allocation">
                            <Trash2 size={15} />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            {/* Pagination */}
            {allocations.length > 1 && (
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
                      {allocPage}
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

      {editingAllocation && createPortal(
        <div className="fixed inset-0 z-[999999] flex items-center justify-center p-4">
          <div className="modal-overlay" onClick={() => setEditingAllocation(null)} />
          <div className="relative w-full max-w-md z-[1000000]">
            <Card className={`p-6 border shadow-2xl backdrop-blur-sm max-h-[90vh] overflow-y-auto custom-scrollbar ${cardBg}`}>
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold flex items-center gap-2 text-primary">
                  <Pencil className="w-5 h-5" /> Edit Allocation
                </h3>
                <Button variant="ghost" size="icon" onClick={() => setEditingAllocation(null)}>
                  <X size={16} />
                </Button>
              </div>
              <form onSubmit={handleUpdateAllocation} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold uppercase opacity-70 mb-2">Student</label>
                  <Select
                    value={editAllocForm.student_id}
                    disabled
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Student Name" />
                    </SelectTrigger>
                    <SelectContent className="z-[1000001]">
                      <SelectItem value={editAllocForm.student_id}>
                        {editingAllocation.student_details?.name || "Select Student"}
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase opacity-70 mb-2">Select Route</label>
                  <Select
                    value={editAllocForm.route_id}
                    onValueChange={(val) => setEditAllocForm(f => ({ ...f, route_id: val, stop_id: "" }))}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Choose Route" />
                    </SelectTrigger>
                    <SelectContent className="z-[1000001]">
                      {allocOptions.routes.map((r: any) => (
                        <SelectItem key={r.id} value={r.id.toString()}>{r.route_name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase opacity-70 mb-2">Select Stop</label>
                  <Select
                    value={editAllocForm.stop_id}
                    disabled={!editAllocForm.route_id}
                    onValueChange={(val) => {
                      if (val === "add_stop") {
                        navigate('/transport-admin/transport-routes');
                      } else {
                        setEditAllocForm(f => ({ ...f, stop_id: val }));
                      }
                    }}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder={!editAllocForm.route_id ? "Select route first" : "Choose Stop"} />
                    </SelectTrigger>
                    <SelectContent className="z-[1000001]">
                      {editAllocOptions.stops.length === 0 ? (
                        <SelectItem value="add_stop" className="text-primary font-semibold">
                          + Add Stop to Route
                        </SelectItem>
                      ) : (
                        editAllocOptions.stops.map((s: any) => (
                          <SelectItem key={s.id} value={s.id.toString()}>{s.stop_name}</SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase opacity-70 mb-2">Status</label>
                  <Select
                    value={editAllocForm.status}
                    onValueChange={(val) => setEditAllocForm(f => ({ ...f, status: val }))}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent className="z-[1000001]">
                      <SelectItem value="allocated">Allocated</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="pt-2">
                  <Button type="submit" className="w-full bg-gradient-to-r from-primary to-purple-600 text-white font-semibold rounded-lg flex items-center justify-center gap-1.5 h-10">
                    <CheckCircle size={16} /> Save Changes
                  </Button>
                </div>
              </form>
            </Card>
          </div>
        </div>,
        document.body
      )}

      {showFilterModal && createPortal(
        <div className="fixed inset-0 z-[999999] flex items-center justify-center p-4">
          <div className="modal-overlay" onClick={() => setShowFilterModal(false)} />
          <div className="relative w-full max-w-sm z-[1000000]">
            <Card className={`p-6 border shadow-2xl backdrop-blur-sm ${cardBg}`}>
              <div className="flex justify-between items-center mb-4 pb-2 border-b border-inherit">
                <h3 className="text-lg font-semibold flex items-center gap-2 text-primary">
                  <Filter className="w-4 h-4" /> Filter Allocations
                </h3>
                <Button variant="ghost" size="icon" onClick={() => setShowFilterModal(false)}>
                  <X size={16} />
                </Button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold uppercase opacity-70 mb-2">Route</label>
                  <Select value={allocFilters.route} onValueChange={(val) => setAllocFilters(f => ({ ...f, route: val }))}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="All Routes" />
                    </SelectTrigger>
                    <SelectContent className="z-[1000001]">
                      <SelectItem value="none_all">All Routes</SelectItem>
                      {routes.map(r => <SelectItem key={r.id} value={r.id.toString()}>{r.route_name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase opacity-70 mb-2">Status</label>
                  <Select value={allocFilters.status} onValueChange={(val) => setAllocFilters(f => ({ ...f, status: val }))}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="All Statuses" />
                    </SelectTrigger>
                    <SelectContent className="z-[1000001]">
                      <SelectItem value="none_all">All Statuses</SelectItem>
                      <SelectItem value="allocated">Allocated</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex gap-2 pt-2">
                  <Button 
                    variant="outline"
                    onClick={() => {
                      setAllocFilters(f => ({ ...f, route: "", status: "" }));
                      setShowFilterModal(false);
                    }}
                    className="flex-1 text-sm h-9"
                  >
                    Clear Filters
                  </Button>
                  <Button 
                    onClick={() => setShowFilterModal(false)}
                    className="flex-1 bg-primary text-white text-sm h-9"
                  >
                    Apply Filters
                  </Button>
                </div>
              </div>
            </Card>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default TransportAllocations;
