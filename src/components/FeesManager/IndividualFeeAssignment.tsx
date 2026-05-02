import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  CheckCircle2,
  User,
  CheckCircle,
  MousePointer2,
  LayoutGrid,
  Search,
  Filter,
  Users,
  Calendar,
  Trash2
} from 'lucide-react';
import { motion, AnimatePresence } from "framer-motion";
import { useTheme } from "@/context/ThemeContext";
import {
  getFeesManagerFilters,
  getFeesManagerSemesters,
  getFeesManagerSections,
  getFeesManagerAssignments,
  deleteFeeAssignment
} from "../../utils/fees_manager_api";
import { showConfirmAlert, showSuccessAlert, showErrorAlert } from "../../utils/sweetalert";
import { 
  Skeleton, 
  SkeletonStatsGrid, 
  SkeletonTable, 
  SkeletonList, 
  SkeletonPageHeader,
  SkeletonCard
} from "@/components/ui/skeleton";


interface Assignment {
  id: number;
  student: {
    id: number;
    name: string;
    usn: string;
    department: string;
    semester: number;
    section: string;
    batch: string;
    admission_mode: string;
  };
  template: {
    id: number;
    name: string;
    total_amount: number;
    fee_type: string;
  };
  academic_year: string;
  assigned_at: string;
  is_active: boolean;
}

interface FilterData {
  batches: { id: number; name: string }[];
  branches: { id: number; name: string; code: string }[];
  admission_modes: string[];
}

const IndividualFeeAssignment: React.FC = () => {
  const { theme } = useTheme();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Data States
  const [filterData, setFilterData] = useState<FilterData>({ batches: [], branches: [], admission_modes: [] });
  const [semesters, setSemesters] = useState<{ id: number; number: number; name: string }[]>([]);
  const [sections, setSections] = useState<{ id: number; name: string }[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);

  // Selection States
  const [selectedFilters, setSelectedFilters] = useState({
    batchId: '',
    branchId: '',
    semesterId: '',
    sectionId: '',
    admissionMode: '',
    search: ''
  });

  // UI States
  const [pagination, setPagination] = useState({
    page: 1,
    totalPages: 1,
    totalCount: 0,
    pageSize: 20
  });

  // Fetch initial filters
  const fetchInitialFilters = useCallback(async () => {
    try {
      const filterJson = await getFeesManagerFilters();
      if (!filterJson.success) throw new Error(filterJson.message || 'Failed to fetch initial data');
      setFilterData(filterJson.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    }
  }, []);

  // Fetch semesters when branch changes
  useEffect(() => {
    if (!selectedFilters.branchId || selectedFilters.branchId === 'all_branches') {
      setSemesters([]);
      setSelectedFilters(prev => ({ ...prev, semesterId: '', sectionId: '' }));
      return;
    }

    const fetchSemesters = async () => {
      try {
        const res = await getFeesManagerSemesters(selectedFilters.branchId);
        if (res.success) {
          setSemesters(res.data || []);
        }
      } catch (err) {
        console.error("Error fetching semesters:", err);
      }
    };
    fetchSemesters();
  }, [selectedFilters.branchId]);

  // Fetch sections when semester changes
  useEffect(() => {
    if (!selectedFilters.semesterId || !selectedFilters.branchId) {
      setSections([]);
      setSelectedFilters(prev => ({ ...prev, sectionId: '' }));
      return;
    }

    const fetchSections = async () => {
      try {
        const res = await getFeesManagerSections(selectedFilters.branchId, selectedFilters.semesterId);
        if (res.success) {
          setSections(res.data || []);
        }
      } catch (err) {
        console.error("Error fetching sections:", err);
      }
    };
    fetchSections();
  }, [selectedFilters.semesterId, selectedFilters.branchId]);

  // Fetch assignments based on filters
  const fetchAssignments = useCallback(async (page: number = 1) => {
    try {
      setLoading(true);
      const params = {
        page: page.toString(),
        page_size: pagination.pageSize.toString(),
        ...(selectedFilters.batchId && { batch_id: selectedFilters.batchId }),
        ...(selectedFilters.branchId && { branch_id: selectedFilters.branchId }),
        ...(selectedFilters.semesterId && { semester_id: selectedFilters.semesterId }),
        ...(selectedFilters.sectionId && { section_id: selectedFilters.sectionId }),
        ...(selectedFilters.admissionMode && { admission_mode: selectedFilters.admissionMode }),
        ...(selectedFilters.search && { search: selectedFilters.search })
      };

      const json = await getFeesManagerAssignments(params);

      if (!json.success) throw new Error(json.message || 'Failed to fetch assignments');

      setAssignments(json.data.assignments || []);
      setPagination(prev => ({
        ...prev,
        page: json.data.meta.page,
        totalPages: json.data.meta.total_pages,
        totalCount: json.data.meta.count
      }));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error loading assignments');
    } finally {
      setLoading(false);
    }
  }, [selectedFilters, pagination.pageSize]);

  useEffect(() => {
    fetchInitialFilters();
  }, [fetchInitialFilters]);

  useEffect(() => {
    const timer = setTimeout(() => {
      const allFiltersSelected =
        selectedFilters.batchId &&
        selectedFilters.branchId &&
        selectedFilters.semesterId &&
        selectedFilters.sectionId &&
        selectedFilters.admissionMode;

      if (allFiltersSelected) {
        fetchAssignments(1);
      } else {
        setAssignments([]);
        setPagination(prev => ({ ...prev, totalCount: 0 }));
        setLoading(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [selectedFilters, fetchAssignments]);

  const allFiltersSelected =
    selectedFilters.batchId &&
    selectedFilters.branchId &&
    selectedFilters.semesterId &&
    selectedFilters.sectionId &&
    selectedFilters.admissionMode;

  const handleDelete = async (id: number) => {
    const confirmed = await showConfirmAlert(
      'Delete Assignment?',
      'Are you sure you want to delete this fee assignment? This will also remove the associated unpaid invoice.',
      'Yes, delete it'
    );
    
    if (!confirmed.isConfirmed) return;

    try {
      const res = await deleteFeeAssignment(id);

      if (!res.success) {
        throw new Error(res.message || 'Failed to delete assignment');
      }

      // Update local state instead of re-fetching
      setAssignments(prev => prev.filter(a => a.id !== id));
      setPagination(prev => ({
        ...prev,
        totalCount: Math.max(0, prev.totalCount - 1)
      }));

      showSuccessAlert('Deleted!', 'Assignment deleted successfully');
    } catch (err) {
      showErrorAlert('Error', err instanceof Error ? err.message : 'Deletion failed');
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
    }).format(amount || 0);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  return (
    <div>
      <Card className="overflow-hidden">
        <CardHeader className="border-b bg-muted/20 pb-6 px-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <CardTitle>
                Individual Fee Management
              </CardTitle>
              <p className="text-muted-foreground mt-1 text-sm">Review and manage existing student fee assignments</p>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="px-3 py-1 font-medium h-9">
                {pagination.totalCount} Assignments Found
              </Badge>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-6">
          {/* Filters Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-6">
            <div className="space-y-2">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Batch</Label>
              <Select value={selectedFilters.batchId} onValueChange={(val) => setSelectedFilters(p => ({ ...p, batchId: val }))}>
                <SelectTrigger className="bg-background">
                  <SelectValue placeholder="All Batches" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all_batches">All Batches</SelectItem>
                  {filterData.batches.map(b => <SelectItem key={b.id} value={b.id.toString()}>{b.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Branch</Label>
              <Select
                value={selectedFilters.branchId}
                onValueChange={(val) => setSelectedFilters(p => ({ ...p, branchId: val }))}
                disabled={!selectedFilters.batchId}
              >
                <SelectTrigger className="bg-background">
                  <SelectValue placeholder="All Branches" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all_branches">All Branches</SelectItem>
                  {filterData.branches.map(b => <SelectItem key={b.id} value={b.id.toString()}>{b.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Semester</Label>
              <Select
                value={selectedFilters.semesterId}
                onValueChange={(val) => setSelectedFilters(p => ({ ...p, semesterId: val }))}
                disabled={!selectedFilters.branchId}
              >
                <SelectTrigger className="bg-background">
                  <SelectValue placeholder="Semester" />
                </SelectTrigger>
                <SelectContent>
                  {semesters.map(s => <SelectItem key={s.id} value={s.id.toString()}>{s.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Section</Label>
              <Select
                value={selectedFilters.sectionId}
                onValueChange={(val) => setSelectedFilters(p => ({ ...p, sectionId: val }))}
                disabled={!selectedFilters.semesterId}
              >
                <SelectTrigger className="bg-background">
                  <SelectValue placeholder="Section" />
                </SelectTrigger>
                <SelectContent className="max-h-[200px]">
                  {sections.map(s => <SelectItem key={s.id} value={s.id.toString()}>{s.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Admission Mode</Label>
              <Select
                value={selectedFilters.admissionMode}
                onValueChange={(val) => setSelectedFilters(p => ({ ...p, admissionMode: val }))}
                disabled={!selectedFilters.sectionId}
              >
                <SelectTrigger className="bg-background">
                  <SelectValue placeholder="Admission" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all_modes">All Modes</SelectItem>
                  {filterData.admission_modes.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Search Row */}
          <div className="mb-6">
            <div className="relative max-w-md w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by student or USN..."
                className="pl-9 bg-muted/20 border-border h-10"
                value={selectedFilters.search}
                onChange={(e) => setSelectedFilters(p => ({ ...p, search: e.target.value }))}
                disabled={!selectedFilters.admissionMode}
              />
            </div>
          </div>

          <div className="border rounded-xl overflow-hidden shadow-sm">
            {!allFiltersSelected ? (
              <div className="h-[400px] flex flex-col items-center justify-center bg-muted/5 px-6 text-center">
                <div className="relative mb-6">
                  <div className="absolute -top-4 -right-4 bg-primary/10 p-3 rounded-full animate-bounce">
                    <MousePointer2 className="h-3 w-3 text-primary" />
                  </div>
                  <div className="bg-muted/20 p-8 rounded-2xl border-2 border-dashed border-muted">
                    <Filter className="h-7 w-7 text-muted-foreground/30" />
                  </div>
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">Selection Required</h3>
                <p className="text-muted-foreground max-w-sm mb-8">
                  Please complete the cascading filter selection above to view fee assignments.
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 w-full max-w-2xl">
                  {[
                    { label: 'Batch', active: !!selectedFilters.batchId },
                    { label: 'Branch', active: !!selectedFilters.branchId },
                    { label: 'Semester', active: !!selectedFilters.semesterId },
                    { label: 'Section', active: !!selectedFilters.sectionId },
                    { label: 'Admission', active: !!selectedFilters.admissionMode },
                  ].map((step, i) => (
                    <div key={step.label} className="flex flex-col items-center gap-2">
                      <div className={`h-8 w-8 rounded-full flex items-center justify-center text-xs font-semibold border-2 transition-all ${step.active ? 'bg-primary border-primary text-white shadow-lg shadow-primary/20' : 'bg-background border-muted text-muted-foreground'
                        }`}>
                        {step.active ? <CheckCircle className="h-4 w-4" /> : i + 1}
                      </div>
                      <span className={`text-[10px] font-semibold uppercase tracking-wider ${step.active ? 'text-primary' : 'text-muted-foreground'}`}>
                        {step.label}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ) : loading ? (
              <div className="overflow-x-auto">
                <SkeletonTable rows={10} cols={6} />
              </div>
            ) : assignments.length === 0 ? (
              <div className="h-[400px] flex flex-col items-center justify-center text-muted-foreground italic px-6 text-center bg-muted/5">
                <Users className="h-12 w-12 mb-4 opacity-10" />
                <h3 className="text-lg font-semibold text-foreground not-italic mb-1">No Assignments Found</h3>
                <p className="text-sm text-muted-foreground">Try adjusting your filters to find what you're looking for.</p>
              </div>
            ) : (

              <div className="overflow-x-auto">
                <Table>
                  <TableHeader className="bg-muted/30">
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="font-semibold py-4 px-6 text-foreground h-12">Student Details</TableHead>
                      <TableHead className="font-semibold text-foreground h-12 text-center">Placement</TableHead>
                      <TableHead className="font-semibold text-foreground h-12 text-center">Template Assigned</TableHead>
                      <TableHead className="font-semibold text-foreground h-12 text-center">Total Amount</TableHead>
                      <TableHead className="font-semibold text-foreground h-12 text-center">Assigned On</TableHead>
                      <TableHead className="text-right font-semibold pr-6 text-foreground h-12">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {assignments.map((assignment) => (
                      <TableRow key={assignment.id} className="hover:bg-primary/5 transition-all duration-200 border-b border-border/50">
                        <TableCell className="py-5 px-6 align-middle">
                          <div className="font-semibold text-foreground leading-tight">{assignment.student.name}</div>
                          <div className="text-[10px] font-semibold text-muted-foreground font-mono uppercase tracking-tight mt-1">{assignment.student.usn}</div>
                        </TableCell>
                        <TableCell className="align-middle text-center">
                          <div className="flex flex-col items-center justify-center">
                            <div className="text-sm font-medium leading-tight">{assignment.student.department}</div>
                            <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-tight mt-1">Sem {assignment.student.semester} • Sec {assignment.student.section}</div>
                          </div>
                        </TableCell>
                        <TableCell className="align-middle text-center">
                          <div className="flex flex-col items-center gap-1">
                            <span className="font-semibold text-sm leading-tight">{assignment.template.name}</span>
                            <Badge variant="outline" className="w-fit text-[10px] uppercase font-semibold tracking-widest px-2 border-border/50 h-5">
                              {assignment.template.fee_type}
                            </Badge>
                          </div>
                        </TableCell>
                        <TableCell className="align-middle text-center">
                          <div className="inline-flex items-center justify-center">
                            <span className="font-semibold text-green-600 bg-green-50 dark:bg-green-900/20 px-2 py-1 rounded text-sm">
                              {formatCurrency(assignment.template.total_amount)}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="align-middle text-center">
                          <div className="flex items-center justify-center gap-1.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-tight">
                            <Calendar className="h-3.5 w-3.5 text-muted-foreground/50" />
                            {formatDate(assignment.assigned_at)}
                          </div>
                        </TableCell>
                        <TableCell className="text-right pr-6 align-middle">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-9 w-9 text-destructive hover:text-destructive hover:bg-destructive/10 rounded-full transition-all active:scale-95"
                            onClick={() => handleDelete(assignment.id)}
                          >
                            <Trash2 className="h-4.5 w-4.5" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        </CardContent>

        <CardFooter className="py-4 bg-muted/5 flex flex-col sm:flex-row items-center justify-between border-t px-6 gap-4">
          <div className={`text-sm ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}`}>
            Showing {pagination.totalCount > 0 ? ((pagination.page - 1) * pagination.pageSize) + 1 : 0} to {Math.min(pagination.page * pagination.pageSize, pagination.totalCount)} of {pagination.totalCount} assignments
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => fetchAssignments(pagination.page - 1)}
              disabled={pagination.page === 1 || loading}
              className="text-white bg-primary border-primary hover:bg-primary/90 hover:border-primary/90 hover:text-white px-3 py-1 h-9"
            >
              Previous
            </Button>

            <div className="flex items-center">
              <Button
                variant="outline"
                size="sm"
                disabled
                className={`${theme === 'dark' ? 'text-muted-foreground bg-card border border-border' : 'text-gray-700 bg-white border border-gray-300'} px-3 py-1 h-9 min-w-[36px]`}
              >
                {pagination.page}
              </Button>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => fetchAssignments(pagination.page + 1)}
              disabled={pagination.page === pagination.totalPages || loading}
              className="text-white bg-primary border-primary hover:bg-primary/90 hover:border-primary/90 hover:text-white px-3 py-1 h-9"
            >
              Next
            </Button>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
};

export default IndividualFeeAssignment;