import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from '@/components/ui/badge';
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  UserCheck,
  Users,
  Search,
  Plus,
  AlertTriangle,
  Calendar,
  IndianRupee,
  Filter,
  ArrowRight,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  MousePointer2,
  CheckCircle,
  LayoutGrid
} from 'lucide-react';
import { motion, AnimatePresence } from "framer-motion";
import { useTheme } from "@/context/ThemeContext";
import { showSuccessAlert, showErrorAlert, showInfoAlert } from "../../utils/sweetalert";
import {
  getFeesManagerFilters,
  getFeesManagerSemesters,
  getFeesManagerSections,
  getFeesManagerStudents,
  bulkAssignFees,
  getFeeTemplates
} from "../../utils/fees_manager_api";
import { 
  Skeleton, 
  SkeletonStatsGrid, 
  SkeletonTable, 
  SkeletonList, 
  SkeletonPageHeader,
  SkeletonCard
} from "@/components/ui/skeleton";


interface Student {
  id: number;
  name: string;
  usn: string;
  department: string;
  semester: number;
  section: string;
  batch: string;
  admission_mode: string;
}

interface FeeTemplate {
  id: number;
  name: string;
  total_amount_cents?: number;
  total_amount?: number;
  fee_type: string;
}

interface FilterData {
  batches: { id: number; name: string }[];
  branches: { id: number; name: string; code: string }[];
  admission_modes: string[];
}

const FeeAssignments: React.FC = () => {
  const { theme } = useTheme();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Data States
  const [filterData, setFilterData] = useState<FilterData>({ batches: [], branches: [], admission_modes: [] });
  const [semesters, setSemesters] = useState<{ id: number; number: number; name: string }[]>([]);
  const [sections, setSections] = useState<{ id: number; name: string }[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [templates, setTemplates] = useState<FeeTemplate[]>([]);

  // Selection States
  const [selectedFilters, setSelectedFilters] = useState({
    batchId: '',
    branchId: '',
    semesterId: '',
    sectionId: '',
    admissionMode: '',
    search: ''
  });
  const [selectedStudentIds, setSelectedStudentIds] = useState<Set<number>>(new Set());
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [academicYear, setAcademicYear] = useState('2024-25');

  // UI States
  const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const [pagination, setPagination] = useState({
    page: 1,
    totalPages: 1,
    totalCount: 0,
    pageSize: 20
  });

  // Fetch initial filters
  const fetchInitialFilters = useCallback(async () => {
    try {
      const [filterJson, templateJson] = await Promise.all([
        getFeesManagerFilters(),
        getFeeTemplates(1, 200)
      ]);

      if (!filterJson.success || !templateJson.success) {
        throw new Error('Failed to fetch initial data');
      }

      setFilterData(filterJson.data);
      setTemplates(templateJson.data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    }
  }, []);

  // Fetch semesters when branch changes
  useEffect(() => {
    if (!selectedFilters.branchId) {
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

  // Fetch students based on filters
  const fetchStudents = useCallback(async (page: number = 1) => {
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

      const json = await getFeesManagerStudents(params);

      if (!json.success) throw new Error(json.message || 'Failed to fetch students');

      setStudents(json.data.students || []);
      setPagination(prev => ({
        ...prev,
        page: json.data.meta.page,
        totalPages: json.data.meta.total_pages,
        totalCount: json.data.meta.count
      }));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error loading students');
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
        fetchStudents(1);
      } else {
        setStudents([]);
        setPagination(prev => ({ ...prev, totalCount: 0 }));
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [selectedFilters, fetchStudents]);

  const allFiltersSelected =
    selectedFilters.batchId &&
    selectedFilters.branchId &&
    selectedFilters.semesterId &&
    selectedFilters.sectionId &&
    selectedFilters.admissionMode;

  // Handlers
  const toggleStudentSelection = (id: number) => {
    setSelectedStudentIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedStudentIds.size === students.length) {
      setSelectedStudentIds(new Set());
    } else {
      setSelectedStudentIds(new Set(students.map(s => s.id)));
    }
  };

  const handleAssign = async () => {
    if (selectedStudentIds.size === 0 || !selectedTemplateId) return;

    setIsConfirming(true);
    try {
      const result = await bulkAssignFees({
        student_ids: Array.from(selectedStudentIds),
        template_id: parseInt(selectedTemplateId),
        academic_year: academicYear
      });

      if (!result.success) {
        throw new Error(result.message || 'Bulk assignment failed');
      }

      setIsAssignDialogOpen(false);

      // Selective Optimistic Update: Only update students who weren't skipped by the backend
      const assignedTemplate = templates.find(t => t.id.toString() === selectedTemplateId);
      const skippedIds = new Set(result.skipped_student_ids || []);

      if (assignedTemplate) {
        setStudents(prev => prev.map(student => {
          if (selectedStudentIds.has(student.id) && !skippedIds.has(student.id)) {
            const currentTemplates = (student as any).assigned_templates || [];
            if (!currentTemplates.some((t: any) => t.id === assignedTemplate.id)) {
              return {
                ...student,
                assigned_templates: [...currentTemplates, {
                  id: assignedTemplate.id,
                  template_name: assignedTemplate.name
                }]
              };
            }
          }
          return student;
        }));
      }

      setSelectedStudentIds(new Set());
      setSelectedTemplateId('');
      
      if (result.created_count > 0) {
        showSuccessAlert('Success!', result.message || 'Fee templates assigned successfully!');
      } else {
        showInfoAlert('No Changes Made', result.message || 'All selected students already have an assignment for this year.');
      }
    } catch (err) {
      showErrorAlert('Error', err instanceof Error ? err.message : 'Assignment failed');
    } finally {
      setIsConfirming(false);
    }
  };

  const formatCurrency = (centsOrAmount: any) => {
    const amount = Number(centsOrAmount) / (Number.isInteger(centsOrAmount) ? 100 : 1);
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
    }).format(amount || 0);
  };

  return (
    <div>
      <Card className="border-border/50 shadow-sm overflow-hidden">
        <CardHeader className="border-b bg-muted/10">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <CardTitle>Fee Assignments</CardTitle>
              <p className="text-muted-foreground mt-1">Structured student selection and bulk fee template assignment</p>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="px-3 py-1 font-medium h-9">
                {pagination.totalCount} Students Found
              </Badge>
              <Button
                disabled={selectedStudentIds.size === 0}
                onClick={() => setIsAssignDialogOpen(true)}
                className="bg-primary text-white hover:bg-primary/90 shadow-md transition-all active:scale-95 h-9"
              >
                <UserCheck className="h-4 w-4 mr-2" />
                Assign ({selectedStudentIds.size})
              </Button>
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
                placeholder="Search by USN or Name..."
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
                  Please complete the cascading filter selection above to load the student directory.
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
            ) : students.length === 0 ? (
              <div className="h-[450px] flex flex-col items-center justify-center text-muted-foreground italic px-6 text-center bg-muted/5">
                <Users className="h-16 w-16 mb-4 opacity-10" />
                <h3 className="text-lg font-semibold text-foreground not-italic mb-1">No Students Found</h3>
                <p className="text-sm text-muted-foreground">Try adjusting your filters to find what you're looking for.</p>
              </div>
            ) : (

              <div className="overflow-x-auto">
                <Table>
                  <TableHeader className="bg-muted/30">
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="w-[50px] text-center">
                        <Checkbox
                          checked={selectedStudentIds.size === students.length && students.length > 0}
                          onCheckedChange={toggleSelectAll}
                        />
                      </TableHead>
                      <TableHead className="font-semibold py-4">Student Details</TableHead>
                      <TableHead className="font-semibold">USN</TableHead>
                      <TableHead className="font-semibold">Placement</TableHead>
                      <TableHead className="font-semibold">Assigned Fee</TableHead>
                      <TableHead className="font-semibold">Adm. Mode</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {students.map((student) => (
                      <TableRow
                        key={student.id}
                        className={`cursor-pointer transition-all duration-200 border-b border-border/50 ${selectedStudentIds.has(student.id) ? 'bg-primary/5 hover:bg-primary/10' : 'hover:bg-muted/30'}`}
                        onClick={() => toggleStudentSelection(student.id)}
                      >
                        <TableCell className="text-center" onClick={(e) => e.stopPropagation()}>
                          <Checkbox
                            checked={selectedStudentIds.has(student.id)}
                            onCheckedChange={() => toggleStudentSelection(student.id)}
                          />
                        </TableCell>
                        <TableCell className="py-4">
                          <div className="font-semibold text-foreground">{student.name}</div>
                          <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-tight">{student.batch}</div>
                        </TableCell>
                        <TableCell className="font-mono text-sm font-medium">{student.usn}</TableCell>
                        <TableCell>
                          <div className="text-sm font-medium">{student.department}</div>
                          <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-tight">Sem {student.semester} • Sec {student.section}</div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {(student as any).assigned_templates?.length > 0 ? (
                              (student as any).assigned_templates.map((at: any) => (
                                <Badge key={at.id} variant="secondary" className="text-[12px] bg-green-100/50 text-green-700 hover:bg-green-100 border-green-200">
                                  {at.template_name}
                                </Badge>
                              ))
                            ) : (
                              <span className="text-xs text-muted-foreground">None</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-[12px] uppercase font-semibold tracking-widest px-2 border-border/50">
                            {student.admission_mode}
                          </Badge>
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
            Showing {pagination.totalCount > 0 ? ((pagination.page - 1) * pagination.pageSize) + 1 : 0} to {Math.min(pagination.page * pagination.pageSize, pagination.totalCount)} of {pagination.totalCount} students
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => fetchStudents(pagination.page - 1)}
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
              onClick={() => fetchStudents(pagination.page + 1)}
              disabled={pagination.page === pagination.totalPages || loading}
              className="text-white bg-primary border-primary hover:bg-primary/90 hover:border-primary/90 hover:text-white px-3 py-1 h-9"
            >
              Next
            </Button>
          </div>
        </CardFooter>
      </Card>

      {/* Assignment Dialog remains the same */}
      <Dialog open={isAssignDialogOpen} onOpenChange={setIsAssignDialogOpen}>
        <DialogContent className="w-[90vw] sm:max-w-[500px] rounded-xl">
          <DialogHeader>
            <DialogTitle>Assign Fee Template</DialogTitle>
            <DialogDescription>
              Assign a fee template to the {selectedStudentIds.size} selected students.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label>Academic Year</Label>
              <Input
                value={academicYear}
                onChange={(e) => setAcademicYear(e.target.value)}
                placeholder="e.g., 2024-25"
              />
            </div>

            <div className="space-y-2">
              <Label>Select Template</Label>
              <Select value={selectedTemplateId} onValueChange={setSelectedTemplateId}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a fee template" />
                </SelectTrigger>
                <SelectContent>
                  {templates.map(t => (
                    <SelectItem key={t.id} value={t.id.toString()}>
                      {t.name} ({formatCurrency(t.total_amount_cents || t.total_amount)})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedTemplateId && (
              <div className="bg-primary/5 p-4 rounded-lg border border-primary/20 mt-2">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary/10 rounded-full text-primary">
                    <CheckCircle2 className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="text-sm font-semibold">Summary</div>
                    <div className="text-xs text-muted-foreground">
                      Template: {templates.find(t => t.id.toString() === selectedTemplateId)?.name}<br />
                      Amount: {formatCurrency(templates.find(t => t.id.toString() === selectedTemplateId)?.total_amount_cents || templates.find(t => t.id.toString() === selectedTemplateId)?.total_amount)}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAssignDialogOpen(false)}>Cancel</Button>
            <Button
              disabled={!selectedTemplateId || isConfirming}
              onClick={handleAssign}
              className="bg-primary text-white"
            >
              {isConfirming ? "Processing..." : "Confirm & Assign"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default FeeAssignments;