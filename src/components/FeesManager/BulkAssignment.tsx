import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardFooter, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
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
  Play
} from 'lucide-react';
import { motion, AnimatePresence } from "framer-motion";
import { useTheme } from "@/context/ThemeContext";
import {
  getFeesManagerFilters,
  getFeeTemplates,
  getFeesManagerSemesters,
  getFeesManagerSections,
  getFeesManagerStudents,
  bulkAssignFees
} from "../../utils/fees_manager_api";
import { showConfirmAlert, showSuccessAlert, showErrorAlert, showInfoAlert } from "../../utils/sweetalert";
import { 
  Skeleton, 
  SkeletonStatsGrid, 
  SkeletonTable, 
  SkeletonList, 
  SkeletonPageHeader,
  SkeletonCard
} from "@/components/ui/skeleton";


interface FilterData {
  batches: { id: number; name: string }[];
  branches: { id: number; name: string; code: string }[];
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
  const [success, setSuccess] = useState<{ created: number; skipped: number } | null>(null);

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

  // Data States
  const [filterData, setFilterData] = useState<FilterData>({ batches: [], branches: [], admission_modes: [] });
  const [semesters, setSemesters] = useState<{ id: number; number: number; name: string }[]>([]);
  const [sections, setSections] = useState<{ id: number; name: string }[]>([]);
  const [templates, setTemplates] = useState<FeeTemplate[]>([]);
  const [studentCount, setStudentCount] = useState<number | null>(null);

  // Fetch initial filters and templates
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [filterJson, templateJson] = await Promise.all([
          getFeesManagerFilters(),
          getFeeTemplates(1, 200)
        ]);

        if (filterJson.success) {
          setFilterData(filterJson.data);
        }
        if (templateJson.success) {
          setTemplates(templateJson.data || []);
        }
      } catch (err) {
        console.error("Error fetching initial data:", err);
      }
    };
    fetchData();
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
          ...(selectedFilters.admissionMode && { admission_mode: selectedFilters.admissionMode }),
        };

        const json = await getFeesManagerStudents(params);

        if (json.success) {
          setStudentCount(json.data.meta?.count || 0);
        }
      } catch (err) {
        console.error("Error fetching student count:", err);
      } finally {
        setFetchingStats(false);
      }
    };

    fetchCount();
  }, [selectedFilters]);

  const handleBulkAssign = async () => {
    if (!selectedTemplate) return;

    const templateName = templates.find(t => t.id.toString() === selectedTemplate)?.name;
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
        academic_year: academicYear
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
      currency: 'INR',
    }).format(amount);
  };

  const allFiltersSelected =
    selectedFilters.batchId &&
    selectedFilters.branchId &&
    selectedFilters.semesterId &&
    selectedFilters.sectionId &&
    selectedFilters.admissionMode;

  return (
    <div>
      <Card>
        <CardHeader className="border-b bg-muted/20 pb-6 px-6">
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
            <p className="text-[13px] text-muted-foreground leading-relaxed">
              The bulk assignment engine validates each student against the target template and academic year.
              If an assignment already exists for a student, the system will automatically skip it to prevent
              duplicate invoices, ensuring your financial records remain consistent and error-free.
            </p>
          </div>

          {/* Filters Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-8">
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

          {!allFiltersSelected ? (
            <div className="h-[400px] flex flex-col items-center justify-center bg-muted/5 px-6 text-center rounded-xl border border-dashed">
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
                Please complete the cascading filter selection above to calculate the target student scope.
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
          ) : (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
              {/* Assignment Scope */}
              <div className="max-w-4xl mx-auto space-y-8">
                <div className="flex flex-col items-center p-10 bg-primary/5 rounded-2xl border border-primary/10 text-center shadow-inner">
                  {fetchingStats ? (
                    <div className="space-y-4">
                      <Skeleton className="h-16 w-32 rounded-xl mx-auto" />
                      <Skeleton className="h-4 w-64 rounded mx-auto" />
                    </div>
                  ) : (

                    <motion.div
                      initial={{ scale: 0.95, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      className="space-y-3"
                    >
                      <div className="text-6xl font-black text-primary tracking-tighter">{studentCount}</div>
                      <div className="text-xl font-semibold text-foreground">Target Students Identified</div>
                      <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground bg-background/50 px-4 py-2 rounded-full border">
                        <Users className="h-4 w-4" />
                        <span>
                          {filterData.branches.find(b => b.id.toString() === selectedFilters.branchId)?.name} •
                          Sem {semesters.find(s => s.id.toString() === selectedFilters.semesterId)?.number}
                        </span>
                      </div>
                    </motion.div>
                  )}
                </div>

                {/* Assignment Form */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 p-8 border rounded-2xl bg-muted/10 shadow-sm">
                  <div className="space-y-3">
                    <Label className="text-sm font-semibold flex items-center gap-2">
                      <LayoutGrid className="h-4 w-4 text-primary" />
                      Select Fee Template
                    </Label>
                    <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
                      <SelectTrigger className="h-12 bg-background border-border/50 text-md">
                        <SelectValue placeholder="Choose a template" />
                      </SelectTrigger>
                      <SelectContent>
                        {templates.map(t => (
                          <SelectItem key={t.id} value={t.id.toString()} className="py-3">
                            <div className="flex flex-col">
                              <span className="font-semibold">{t.name}</span>
                              <span className="text-xs text-muted-foreground font-semibold">{formatCurrency(t.total_amount)}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-[13px] text-muted-foreground px-1">Select the fee structure to be applied to all students above.</p>
                  </div>

                  <div className="space-y-3">
                    <Label className="text-sm font-semibold flex items-center gap-2">
                      <BarChart3 className="h-4 w-4 text-primary" />
                      Academic Year
                    </Label>
                    <Input
                      value={academicYear}
                      onChange={(e) => setAcademicYear(e.target.value)}
                      className="h-12 bg-background border-border/50 text-lg font-semibold"
                      placeholder="e.g., 2024-25"
                    />
                    <p className="text-[13px] text-muted-foreground px-1">Specify the billing period for these assignments.</p>
                  </div>
                </div>

                {/* Action Section */}
                <div className="space-y-4">
                  <Button
                    className="w-full h-14 text-md font-semibold shadow-lg hover:shadow-primary/20 transition-all group relative overflow-hidden"
                    disabled={!selectedTemplate || loading || studentCount === 0}
                    onClick={handleBulkAssign}
                  >
                    {loading ? (
                      <div className="flex items-center gap-3">
                        <Zap className="h-6 w-6 animate-pulse text-yellow-400" />
                        <span>Executing Mass Assignment...</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-3">
                        <Play className="h-6 w-6 group-hover:scale-110 transition-transform fill-current" />
                        <span>Start Bulk Assignment</span>
                      </div>
                    )}
                  </Button>

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
    </div>
  );
};

export default BulkAssignment;