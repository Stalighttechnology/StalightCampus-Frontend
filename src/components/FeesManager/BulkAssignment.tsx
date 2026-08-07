import { translateTerminology, getTerm } from "@/utils/institutionConfig";
import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardFooter, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import {
  CheckCircle2,
  AlertTriangle,
  BarChart3,
  Search,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  Zap,
  CheckCircle,
  MousePointer2,
  LayoutGrid,
  Filter,
  Users,
  Play,
  CalendarIcon,
  Calendar as CalendarLucideIcon
} from
  'lucide-react';
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { motion, AnimatePresence } from "framer-motion";
import { useTheme } from "@/context/ThemeContext";
import {
  getFeesManagerFilters,
  getFeeTemplates,
  getFeesManagerSemesters,
  getFeesManagerSections,
  getFeesManagerStudents,
  bulkAssignFees
} from
  "../../utils/fees_manager_api";
import { showConfirmAlert, showSuccessAlert, showErrorAlert, showInfoAlert } from "../../utils/sweetalert";
import {
  Skeleton,
  SkeletonStatsGrid,
  SkeletonTable,
  SkeletonList,
  SkeletonPageHeader,
  SkeletonCard
} from
  "@/components/ui/skeleton";


interface FilterData {
  batches: { id: number; name: string; }[];
  branches: { id: number; name: string; code: string; }[];
  admission_modes: string[];
}

interface FeeTemplate {
  id: number;
  name: string;
  total_amount: number;
  fee_type: string;
}

const BulkAssignment: React.FC = () => {
  const { theme } = useTheme();
  const [loading, setLoading] = useState(false);
  const [fetchingStats, setFetchingStats] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<{ created: number; skipped: number; } | null>(null);
  const [openSelect, setOpenSelect] = useState<'batch' | 'branch' | 'semester' | 'section' | 'admission' | null>(null);

  // Selection States
  const [selectedFilters, setSelectedFilters] = useState({
    batchId: '',
    branchId: '',
    semesterId: '',
    sectionId: '',
    admissionMode: ''
  });

  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [academicYear, setAcademicYear] = useState('2024-25');
  const [dueDate, setDueDate] = useState<string>('');

  // Data States
  const [filterData, setFilterData] = useState<FilterData>({ batches: [], branches: [], admission_modes: [] });
  const [semesters, setSemesters] = useState<{ id: number; number: number; name: string; }[]>([]);
  const [sections, setSections] = useState<{ id: number; name: string; }[]>([]);
  const [templates, setTemplates] = useState<FeeTemplate[]>([]);
  const [studentCount, setStudentCount] = useState<number | null>(null);

  // Loading states for cascading filters
  const [loadingInitialFilters, setLoadingInitialFilters] = useState(false);
  const [loadingSemesters, setLoadingSemesters] = useState(false);
  const [loadingSections, setLoadingSections] = useState(false);

  // Fetch initial filters and templates
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoadingInitialFilters(true);
        const [filterJson, templateJson] = await Promise.all([
          getFeesManagerFilters(),
          getFeeTemplates(1, 200)]
        );

        if (filterJson.success) {
          setFilterData(filterJson.data);
        }
        if (templateJson.success) {
          setTemplates(templateJson.data || []);
        }
      } catch (err) {

      } finally {
        setLoadingInitialFilters(false);
      }
    };
    fetchData();
  }, []);

  // Fetch semesters when branch changes
  useEffect(() => {
    if (!selectedFilters.branchId || selectedFilters.branchId === 'all_branches') {
      setSemesters([]);
      setSelectedFilters((prev) => ({ ...prev, semesterId: '', sectionId: '' }));
      return;
    }

    const fetchSemesters = async () => {
      try {
        setLoadingSemesters(true);
        const res = await getFeesManagerSemesters(selectedFilters.branchId);
        if (res.success) {
          setSemesters(res.data || []);
        }
      } catch (err) {

      } finally {
        setLoadingSemesters(false);
      }
    };
    fetchSemesters();
  }, [selectedFilters.branchId]);

  // Fetch sections when semester changes
  useEffect(() => {
    if (!selectedFilters.semesterId || !selectedFilters.branchId) {
      setSections([]);
      setSelectedFilters((prev) => ({ ...prev, sectionId: '' }));
      return;
    }

    const fetchSections = async () => {
      try {
        setLoadingSections(true);
        const res = await getFeesManagerSections(selectedFilters.branchId, selectedFilters.semesterId);
        if (res.success) {
          setSections(res.data || []);
        }
      } catch (err) {

      } finally {
        setLoadingSections(false);
      }
    };
    fetchSections();
  }, [selectedFilters.semesterId, selectedFilters.branchId]);

  // Fetch student count when all filters are selected
  useEffect(() => {
    const allFiltersSelected =
      selectedFilters.batchId &&
      selectedFilters.branchId &&
      selectedFilters.semesterId &&
      selectedFilters.sectionId &&
      selectedFilters.admissionMode;

    if (!allFiltersSelected) {
      setStudentCount(null);
      return;
    }

    const fetchCount = async () => {
      try {
        setFetchingStats(true);
        const params = {
          page: '1',
          page_size: '1',
          ...(selectedFilters.batchId && { batch_id: selectedFilters.batchId }),
          ...(selectedFilters.branchId && { branch_id: selectedFilters.branchId }),
          ...(selectedFilters.semesterId && { semester_id: selectedFilters.semesterId }),
          ...(selectedFilters.sectionId && { section_id: selectedFilters.sectionId }),
          ...(selectedFilters.admissionMode && { admission_mode: selectedFilters.admissionMode })
        };

        const json = await getFeesManagerStudents(params);

        if (json.success) {
          setStudentCount(json.data.meta?.count || 0);
        }
      } catch (err) {

      } finally {
        setFetchingStats(false);
      }
    };

    fetchCount();
  }, [selectedFilters]);

  const handleBulkAssign = async () => {
    if (!selectedTemplate) return;

    const templateName = templates.find((t) => t.id.toString() === selectedTemplate)?.name;
    const confirmed = await showConfirmAlert(
      'Mass Assignment Confirmation',
      `Are you sure you want to assign "${templateName}" to ${studentCount} students? This will generate invoices for all of them.`,
      'Yes, start assignment'
    );

    if (!confirmed.isConfirmed) return;

    try {
      setLoading(true);
      setError(null);
      setSuccess(null);

      const result = await bulkAssignFees({
        filters: {
          batch_id: selectedFilters.batchId,
          branch_id: selectedFilters.branchId,
          semester_id: selectedFilters.semesterId,
          section_id: selectedFilters.sectionId,
          admission_mode: selectedFilters.admissionMode
        },
        template_id: parseInt(selectedTemplate),
        academic_year: academicYear,
        due_date: dueDate
      });

      if (!result.success) {
        throw new Error(result.message || 'Bulk assignment failed');
      }

      if (result.data.created_count > 0) {
        showSuccessAlert(
          'Mass Assignment Successful!',
          `${result.data.created_count} students assigned successfully. ${result.data.skipped_count} duplicates were skipped.`
        );
      } else {
        showInfoAlert(
          'No Changes Made',
          `${result.data.skipped_count} students already have this assignment. 0 new assignments created.`
        );
      }

      // Refresh count (might have changed if unassigned students filter was a thing, but here we just show total)
    } catch (err) {
      showErrorAlert('Assignment Failed', err instanceof Error ? err.message : 'An error occurred during assignment');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR'
    }).format(amount);
  };

  const allFiltersSelected =
    selectedFilters.batchId &&
    selectedFilters.branchId &&
    selectedFilters.semesterId &&
    selectedFilters.sectionId &&
    selectedFilters.admissionMode;

  return (
    <div id="feesmanager-bulk-assignment-container">
      <Card>
        <div id="feesmanager-bulk-assignment-filters">
          <CardHeader id="feesmanager-bulk-assignment-header" className="border-b bg-muted/20 pb-6 px-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <CardTitle className="text-2xl font-semibold flex items-center gap-2">
                  Bulk Fee Assignment
                </CardTitle>
                <p className="text-muted-foreground mt-1 text-sm">Mass assign fee templates to specific student cohorts</p>
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-6">
          {/* Operational Safety Note */}
          <div className="mb-8 p-4 bg-primary/5 rounded-xl border border-primary/10">
            <h4 className="text-sm font-semibold text-primary flex items-center gap-2 mb-1">
              Note: Operational Safety
            </h4>
            <p className="text-[14px] sm:text-[13px] text-muted-foreground leading-relaxed">
              The bulk assignment engine validates each student against the target template and academic year.
              If an assignment already exists for a student, the system will automatically skip it to prevent
              duplicate invoices, ensuring your financial records remain consistent and error-free.
            </p>
          </div>

          {/* Filters Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-8">
            <div className="space-y-2">
              <Label className="text-sm sm:text-xs font-semibold uppercase tracking-wider text-muted-foreground">Batch</Label>
              <Select
                value={selectedFilters.batchId}
                open={openSelect === 'batch'}
                onOpenChange={(open) => setOpenSelect(open ? 'batch' : null)}
                onValueChange={(val) => {
                  setSelectedFilters((p) => ({ ...p, batchId: val }));
                  // Auto-derive academic year from selected batch name
                  const selectedBatch = filterData.batches.find(b => b.id.toString() === val);
                  if (selectedBatch) setAcademicYear(selectedBatch.name);
                  setTimeout(() => setOpenSelect('branch'), 100);
                }}>
                <SelectTrigger className="bg-background">
                  <SelectValue placeholder="Select Batch" />
                </SelectTrigger>
                <SelectContent>
                  {loadingInitialFilters ? (
                    <SelectItem value="none" disabled className="text-muted-foreground text-xs text-center">
                      Loading batches...
                    </SelectItem>
                  ) : filterData.batches.length > 0 ? (
                    filterData.batches.map((b) => <SelectItem key={b.id} value={b.id.toString()}>{b.name}</SelectItem>)
                  ) : (
                    <SelectItem value="none" disabled className="text-muted-foreground text-xs text-center">
                      No batches found
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-sm sm:text-xs font-semibold uppercase tracking-wider text-muted-foreground">{translateTerminology("Branch")}</Label>
              <Select
                value={selectedFilters.branchId}
                open={openSelect === 'branch'}
                onOpenChange={(open) => setOpenSelect(open ? 'branch' : null)}
                onValueChange={(val) => {
                  setSelectedFilters((p) => ({ ...p, branchId: val }));
                  setTimeout(() => setOpenSelect('semester'), 100);
                }}
                disabled={!selectedFilters.batchId}>

                <SelectTrigger className="bg-background">
                  <SelectValue placeholder={translateTerminology("Select Branch")} />
                </SelectTrigger>
                <SelectContent>
                  {loadingInitialFilters ? (
                    <SelectItem value="none" disabled className="text-muted-foreground text-xs text-center">
                      Loading branches...
                    </SelectItem>
                  ) : filterData.branches.length > 0 ? (
                    filterData.branches.map((b) => <SelectItem key={b.id} value={b.id.toString()}>{b.name}</SelectItem>)
                  ) : (
                    <SelectItem value="none" disabled className="text-muted-foreground text-xs text-center">
                      No branches found
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-sm sm:text-xs font-semibold uppercase tracking-wider text-muted-foreground">{translateTerminology("Semester")}</Label>
              <Select
                value={selectedFilters.semesterId}
                open={openSelect === 'semester'}
                onOpenChange={(open) => setOpenSelect(open ? 'semester' : null)}
                onValueChange={(val) => {
                  setSelectedFilters((p) => ({ ...p, semesterId: val }));
                  setTimeout(() => setOpenSelect('section'), 100);
                }}
                disabled={!selectedFilters.branchId}>

                <SelectTrigger className="bg-background">
                  <SelectValue placeholder={translateTerminology("Select Semester")} />
                </SelectTrigger>
                <SelectContent>
                  {loadingSemesters ? (
                    <SelectItem value="none" disabled className="text-muted-foreground text-xs text-center">
                      Loading semesters...
                    </SelectItem>
                  ) : semesters.length > 0 ? (
                    semesters.map((s) => <SelectItem key={s.id} value={s.id.toString()}>{translateTerminology(s.name)}</SelectItem>)
                  ) : (
                    <SelectItem value="none" disabled className="text-muted-foreground text-xs text-center">
                      No semesters found
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-sm sm:text-xs font-semibold uppercase tracking-wider text-muted-foreground">Section</Label>
              <Select
                value={selectedFilters.sectionId}
                open={openSelect === 'section'}
                onOpenChange={(open) => setOpenSelect(open ? 'section' : null)}
                onValueChange={(val) => {
                  setSelectedFilters((p) => ({ ...p, sectionId: val }));
                  setTimeout(() => setOpenSelect('admission'), 100);
                }}
                disabled={!selectedFilters.semesterId}>

                <SelectTrigger className="bg-background">
                  <SelectValue placeholder="Select Section" />
                </SelectTrigger>
                <SelectContent className="max-h-[200px]">
                  {loadingSections ? (
                    <SelectItem value="none" disabled className="text-muted-foreground text-xs text-center">
                      Loading sections...
                    </SelectItem>
                  ) : sections.length > 0 ? (
                    sections.map((s) => <SelectItem key={s.id} value={s.id.toString()}>{s.name}</SelectItem>)
                  ) : (
                    <SelectItem value="none" disabled className="text-muted-foreground text-xs text-center">
                      No sections found
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-sm sm:text-xs font-semibold uppercase tracking-wider text-muted-foreground">Admission Mode</Label>
              <Select
                value={selectedFilters.admissionMode}
                open={openSelect === 'admission'}
                onOpenChange={(open) => setOpenSelect(open ? 'admission' : null)}
                onValueChange={(val) => {
                  setSelectedFilters((p) => ({ ...p, admissionMode: val }));
                  setOpenSelect(null);
                }}
                disabled={!selectedFilters.sectionId}>

                <SelectTrigger className="bg-background">
                  <SelectValue placeholder="Select Admission Mode" />
                </SelectTrigger>
                <SelectContent>
                  {loadingInitialFilters ? (
                    <SelectItem value="none" disabled className="text-muted-foreground text-xs text-center">
                      Loading admission modes...
                    </SelectItem>
                  ) : filterData.admission_modes.length > 0 ? (
                    filterData.admission_modes.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)
                  ) : (
                    <SelectItem value="none" disabled className="text-muted-foreground text-xs text-center">
                      No admission modes found
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>
          </CardContent>
        </div>

        <CardContent className="p-6 pt-0">
          {!allFiltersSelected ? (
            <div className="min-h-[400px] py-10 flex flex-col items-center justify-center bg-muted/5 px-4 text-center rounded-xl border border-dashed">
              <div className="relative mb-6">
                <div className="absolute -top-3 -right-3 bg-primary/10 p-2 rounded-full animate-bounce sm:-top-4 sm:-right-4 sm:p-3">
                  <MousePointer2 className="h-3 w-3 text-primary sm:h-4 sm:w-4" />
                </div>
                <div className="bg-muted/20 p-6 rounded-2xl border-2 border-dashed border-muted sm:p-8">
                  <Filter className="h-6 w-6 text-muted-foreground/30 sm:h-8 sm:w-8" />
                </div>
              </div>
              <h3 className="text-lg font-bold text-foreground mb-2">Selection Required</h3>
              <p className="text-muted-foreground max-w-sm mb-8 text-sm px-2">
                Please complete the cascading filter selection above to calculate the target student scope.
              </p>
              <div className="flex flex-wrap justify-center gap-4 sm:gap-6 w-full max-w-3xl">
                {[
                  { label: 'Batch', active: !!selectedFilters.batchId },
                  { label: translateTerminology("Branch"), active: !!selectedFilters.branchId },
                  { label: translateTerminology("Semester"), active: !!selectedFilters.semesterId },
                  { label: 'Section', active: !!selectedFilters.sectionId },
                  { label: 'Admission', active: !!selectedFilters.admissionMode }
                ].map((step, i) => (
                  <div key={step.label} className="flex flex-col items-center gap-2 min-w-[60px] sm:min-w-[80px]">
                    <div className={`h-10 w-10 sm:h-12 sm:w-12 rounded-full flex items-center justify-center text-xs sm:text-sm font-bold border-2 transition-all duration-300 ${step.active
                        ? 'bg-primary border-primary text-white shadow-lg shadow-primary/25 scale-110'
                        : 'bg-background border-muted text-muted-foreground opacity-60'
                      }`}>
                      {step.active ? <CheckCircle className="h-5 w-5 sm:h-6 sm:w-6" /> : i + 1}
                    </div>
                    <span className={`text-[10px] sm:text-[11px] font-bold uppercase tracking-wider transition-colors duration-300 ${step.active ? 'text-primary' : 'text-muted-foreground opacity-60'
                      }`}>
                      {step.label}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ) : (

            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
              {/* Assignment Scope */}
              <div className="max-w-4xl mx-auto space-y-8">
                <div className="flex flex-col items-center p-10 bg-primary/5 rounded-2xl border border-primary/10 text-center shadow-inner">
                  {fetchingStats ?
                    <div className="space-y-4">
                      <Skeleton className="h-16 w-32 rounded-xl mx-auto" />
                      <Skeleton className="h-4 w-64 rounded mx-auto" />
                    </div> :


                    <motion.div
                      initial={{ scale: 0.95, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      className="space-y-3">

                      <div className="text-6xl font-black text-primary tracking-tighter">{studentCount}</div>
                      <div className="text-xl font-semibold text-foreground">Target Students Identified</div>
                      <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground bg-background/50 px-4 py-2 rounded-full border">
                        <Users className="h-4 w-4" />
                        <span>
                          {filterData.branches.find((b) => b.id.toString() === selectedFilters.branchId)?.name} •
                          Sem {semesters.find((s) => s.id.toString() === selectedFilters.semesterId)?.number}
                        </span>
                      </div>
                    </motion.div>
                  }
                </div>

                {/* Assignment Form */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 p-8 border rounded-2xl bg-muted/10 shadow-sm">
                  <div className="space-y-3">
                    <Label className="text-md sm:text-sm font-semibold flex items-center gap-2">
                      <LayoutGrid className="h-4 w-4 text-primary" />
                      Select Fee Template
                    </Label>
                    <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
                      <SelectTrigger className="h-12 bg-background border-border/50 text-md">
                        <SelectValue placeholder="Choose a template" />
                      </SelectTrigger>
                      <SelectContent>
                        {templates.map((t) =>
                          <SelectItem key={t.id} value={t.id.toString()} className="py-3">
                            <div className="flex flex-col">
                              <span className="font-semibold">{t.name}</span>
                              <span className="text-xs text-muted-foreground font-semibold">{formatCurrency(t.total_amount)}</span>
                            </div>
                          </SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                    <p className="text-[13px] text-muted-foreground px-1">Select the fee structure to be applied to all students above.</p>
                  </div>

                  <div className="space-y-3">
                    <Label className="text-md sm:text-sm font-semibold flex items-center gap-2">
                      <BarChart3 className="h-4 w-4 text-primary" />
                      Academic Year
                    </Label>
                    <Input
                      value={academicYear || (selectedFilters.batchId ? filterData.batches.find(b => b.id.toString() === selectedFilters.batchId)?.name || '' : '')}
                      readOnly
                      className="h-12 bg-muted/40 border-border/50 text-lg font-semibold cursor-not-allowed text-muted-foreground"
                      placeholder="Select a batch first" />

                    <p className="text-[13px] text-muted-foreground px-1">Specify the billing period for these assignments.</p>
                  </div>

                  <div className="space-y-3">
                    <Label className="text-md sm:text-sm font-semibold flex items-center gap-2">
                      <CalendarLucideIcon className="h-4 w-4 text-primary" />
                      Due Date
                    </Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant={"outline"}
                          className={cn(
                            "w-full justify-start text-left font-semibold h-12 text-md border-border/50",
                            !dueDate && "text-muted-foreground",
                            theme === 'dark' ? 'bg-background hover:bg-muted' : 'bg-white hover:bg-gray-50'
                          )}>
                          
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {dueDate ? format(new Date(dueDate), "PPP") : <span>Pick a due date</span>}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={dueDate ? new Date(dueDate) : undefined}
                          onSelect={(date) => setDueDate(date ? format(date, "yyyy-MM-dd") : '')}
                          disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                          initialFocus />
                      </PopoverContent>
                    </Popover>
                    <p className="text-[13px] text-muted-foreground px-1">When should these invoices be paid?</p>
                  </div>
                </div>

                {/* Action Section */}
                <div className="space-y-4">
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        className="w-full h-14 text-md font-semibold shadow-lg hover:shadow-primary/20 transition-all group relative overflow-hidden"
                        disabled={!selectedTemplate || !dueDate || loading || studentCount === 0}>
    
                        {loading ?
                          <div className="flex items-center gap-3">
                            <Zap className="h-6 w-6 animate-pulse text-yellow-400" />
                            <span>Executing Mass Assignment...</span>
                          </div> :
    
                          <div className="flex items-center gap-3">
                            <Play className="h-6 w-6 group-hover:scale-110 transition-transform fill-current" />
                            <span>Start Bulk Assignment</span>
                          </div>
                        }
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Confirm Bulk Assignment</AlertDialogTitle>
                        <AlertDialogDescription className="leading-relaxed flex flex-col gap-4 mt-2">
                          <span className="text-sm">Are you sure you want to assign this fee template to {studentCount} students?</span>
                          <div className="flex items-start gap-3 p-3 bg-red-50 dark:bg-red-950/30 text-red-800 dark:text-red-300 border border-red-200 dark:border-red-900/50 rounded-lg text-sm text-left">
                            <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5" />
                            <div>
                              <strong className="font-semibold text-red-900 dark:text-red-200">Warning:</strong> This is a bulk operation. If you want to change or delete this assignment later, you must visit each individual student's fees page and delete the invoice <strong>before</strong> the student makes a payment.
                            </div>
                          </div>
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleBulkAssign} className="bg-red-600 hover:bg-red-700 text-white border-none">
                          Confirm Bulk Assignment
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>

                  <div className="flex items-center justify-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-widest bg-muted/20 py-3 rounded-lg border border-dashed border-border/50">
                    <ShieldCheck className="h-4 w-4 text-primary" />
                    Atomic Transaction Secure • Zero-Collision Duplication Check
                  </div>
                </div>

                {/* Status Alerts Removed - Handled by SweetAlert */}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>);

};

export default BulkAssignment;