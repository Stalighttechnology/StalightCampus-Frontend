import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Checkbox } from '../ui/checkbox';
import { Badge } from '../ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '../ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { useToast } from '../../hooks/use-toast';
import { Search, ChevronLeft, ChevronRight, GraduationCap, ArrowRightLeft, Users, Filter, History } from 'lucide-react';
import { fetchWithTokenRefresh } from '../../utils/authService';
import { API_ENDPOINT } from '../../utils/config';
import { useTheme } from '../../context/ThemeContext';
import { SkeletonTable } from '../ui/skeleton';

interface Student {
  id: number;
  usn: string;
  name: string;
  email: string;
  branch: string;
  semester: string;
  section: string;
}

interface Branch { id: number; name: string; }
interface SemesterOption { id: number; number: number; }
interface SectionOption { id: number; name: string; }
interface BatchOption { id: number; name: string; start_year?: number; end_year?: number; }

interface TransferHistory {
  id: number;
  student_usn: string;
  student_name: string;
  source_branch: string;
  source_semester: string;
  source_section: string;
  target_branch: string;
  target_semester: string;
  target_section: string;
  transferred_by: string;
  transfer_date: string;
}

const StudentBranchTransfer = () => {
  const { toast } = useToast();
  const { theme } = useTheme();

  // Source Filter States
  const [sourceBatchId, setSourceBatchId] = useState<string>('');
  const [sourceBranchId, setSourceBranchId] = useState<string>('');
  const [sourceSemesterId, setSourceSemesterId] = useState<string>('');
  const [sourceSectionId, setSourceSectionId] = useState<string>('');

  // Select Open States for Auto-opening
  const [openBatch, setOpenBatch] = useState(false);
  const [openBranch, setOpenBranch] = useState(false);
  const [openSem, setOpenSem] = useState(false);
  const [openSec, setOpenSec] = useState(false);

  // Dropdown Options
  const [batches, setBatches] = useState<BatchOption[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [sourceSemesters, setSourceSemesters] = useState<SemesterOption[]>([]);
  const [sourceSections, setSourceSections] = useState<SectionOption[]>([]);

  // Target states
  const [targetBranchId, setTargetBranchId] = useState<string>('');
  const [targetSemesterId, setTargetSemesterId] = useState<string>('');
  const [targetSectionId, setTargetSectionId] = useState<string>('');
  const [targetSemesters, setTargetSemesters] = useState<SemesterOption[]>([]);
  const [targetSections, setTargetSections] = useState<SectionOption[]>([]);

  // Data States
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedStudentIds, setSelectedStudentIds] = useState<number[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [hasSearched, setHasSearched] = useState<boolean>(false);

  // Pagination
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [totalCount, setTotalCount] = useState<number>(0);

  // Dialog State
  const [isTransferDialogOpen, setIsTransferDialogOpen] = useState<boolean>(false);
  const [showConfirmation, setShowConfirmation] = useState<boolean>(false);
  const [transferring, setTransferring] = useState<boolean>(false);

  // ─── History Tab States ──────────────────────────────────────────────────────
  const [historyBatchId, setHistoryBatchId] = useState<string>('');
  const [historySearch, setHistorySearch] = useState<string>('');
  const [historyRecords, setHistoryRecords] = useState<TransferHistory[]>([]);
  const [loadingHistory, setLoadingHistory] = useState<boolean>(false);
  const [historyPage, setHistoryPage] = useState<number>(1);
  const [historyTotalPages, setHistoryTotalPages] = useState<number>(1);

  const fetchHistory = useCallback(async (page: number = 1, search: string = historySearch) => {
    if (!historyBatchId) return;
    setLoadingHistory(true);
    try {
      const params = new URLSearchParams();
      params.append('page', page.toString());
      params.append('page_size', '10');
      if (historyBatchId !== 'all') params.append('batch_id', historyBatchId);
      if (search) params.append('search', search);

      const res = await fetchWithTokenRefresh(
        `${API_ENDPOINT}/admin/transfer-history/?${params.toString()}`,
        { method: 'GET' }
      ).then((r: Response) => r.json());

      setHistoryRecords(res?.results || []);
      setHistoryTotalPages(res?.total_pages || 1);
      setHistoryPage(res?.current_page || page);
    } catch (e) {
      toast({ title: 'Error', description: 'Failed to fetch history', variant: 'destructive' });
    } finally {
      setLoadingHistory(false);
    }
  }, [historyBatchId, historySearch, toast]);

  useEffect(() => {
    if (historyBatchId) {
      const delay = setTimeout(() => fetchHistory(1, historySearch), 400);
      return () => clearTimeout(delay);
    }
  }, [historyBatchId, historySearch, fetchHistory]);

  // ─── Load branches and batches on mount ──────────────────────────────────────
  useEffect(() => {
    const loadMeta = async () => {
      try {
        const [branchRes, batchRes] = await Promise.all([
          fetchWithTokenRefresh(`${API_ENDPOINT}/admin/branches-with-hods/?compact=true&page_size=200`, { method: 'GET' }).then((r: Response) => r.json()),
          fetchWithTokenRefresh(`${API_ENDPOINT}/admin/batches/?page_size=200`, { method: 'GET' }).then((r: Response) => r.json()),
        ]);

        const branchList = branchRes?.branches || branchRes?.results?.branches || branchRes?.results || [];
        setBranches(Array.isArray(branchList) ? branchList : []);

        const batchList = batchRes?.results || batchRes?.batches || [];
        setBatches(Array.isArray(batchList) ? batchList : []);
      } catch (e) {
        console.error('Error loading meta', e);
      }
    };
    loadMeta();
  }, []);

  // ─── Handlers for sequential auto-opening ─────────────────────────────────────
  const handleBatchChange = (val: string) => {
    setSourceBatchId(val);
    setSourceBranchId('');
    setSourceSemesterId('');
    setSourceSectionId('');
    setStudents([]);
    setSelectedStudentIds([]);
    setHasSearched(false);
    
    // Auto open Branch
    setTimeout(() => setOpenBranch(true), 150);
  };

  const handleBranchChange = async (val: string) => {
    setSourceBranchId(val);
    setSourceSemesterId('');
    setSourceSectionId('');
    setStudents([]);
    setSelectedStudentIds([]);
    setHasSearched(false);
    setSourceSemesters([]);
    setSourceSections([]);

    if (val && val !== 'all') {
      try {
        const res = await fetchWithTokenRefresh(
          `${API_ENDPOINT}/admin/assignment-options/?branch_id=${val}`,
          { method: 'GET' }
        ).then((r: Response) => r.json());
        setSourceSemesters(res?.semesters || []);
        // Auto open Semester once loaded
        setTimeout(() => setOpenSem(true), 150);
      } catch (e) {
        console.error('Error loading source semesters', e);
      }
    } else {
      setTimeout(() => setOpenSem(true), 150);
    }
  };

  const handleSemesterChange = async (val: string) => {
    setSourceSemesterId(val);
    setSourceSectionId('');
    setStudents([]);
    setSelectedStudentIds([]);
    setHasSearched(false);
    setSourceSections([]);

    if (sourceBranchId && sourceBranchId !== 'all' && val && val !== 'all') {
      try {
        const res = await fetchWithTokenRefresh(
          `${API_ENDPOINT}/admin/assignment-options/?branch_id=${sourceBranchId}&semester_id=${val}`,
          { method: 'GET' }
        ).then((r: Response) => r.json());
        
        const sections = res?.sections || [];
        setSourceSections(sections);
        
        // Auto open Section if there are any
        if (sections.length > 0) {
          setTimeout(() => setOpenSec(true), 150);
        } else {
          // If no sections, we can assume filter is complete
          setSourceSectionId('all');
        }
      } catch (e) {
        console.error('Error loading source sections', e);
      }
    } else {
      setTimeout(() => setOpenSec(true), 150);
    }
  };

  const handleSectionChange = (val: string) => {
    setSourceSectionId(val);
    setStudents([]);
    setSelectedStudentIds([]);
    setHasSearched(false);
  };

  // ─── Target dropdown loading logic ───────────────────────────────────────────
  useEffect(() => {
    if (!targetBranchId) {
      setTargetSemesters([]);
      setTargetSections([]);
      return;
    }
    const load = async () => {
      try {
        const res = await fetchWithTokenRefresh(
          `${API_ENDPOINT}/admin/assignment-options/?branch_id=${targetBranchId}`,
          { method: 'GET' }
        ).then((r: Response) => r.json());
        setTargetSemesters(res?.semesters || []);
      } catch (e) {
        console.error('Error loading target semesters', e);
      }
    };
    load();
    setTargetSemesterId('');
    setTargetSectionId('');
    setTargetSections([]);
  }, [targetBranchId]);

  useEffect(() => {
    if (!targetBranchId || !targetSemesterId) {
      setTargetSections([]);
      return;
    }
    const load = async () => {
      try {
        const res = await fetchWithTokenRefresh(
          `${API_ENDPOINT}/admin/assignment-options/?branch_id=${targetBranchId}&semester_id=${targetSemesterId}`,
          { method: 'GET' }
        ).then((r: Response) => r.json());
        setTargetSections(res?.sections || []);
      } catch (e) {
        console.error('Error loading target sections', e);
      }
    };
    load();
    setTargetSectionId('');
  }, [targetBranchId, targetSemesterId]);

  // ─── Fetch students manually ──────────────────────────────────────────────────
  const fetchStudents = useCallback(async (page: number = 1, search: string = searchTerm) => {
    // Only fetch if required filters are selected
    if (!sourceBatchId || !sourceBranchId || !sourceSemesterId || !sourceSectionId) {
      toast({ title: 'Validation', description: 'Please select Batch, Branch, Semester, and Section to load students.', variant: 'default' });
      return;
    }

    setLoading(true);
    setHasSearched(true);
    try {
      const params = new URLSearchParams();
      params.append('page', page.toString());
      params.append('page_size', '10');
      if (sourceBranchId !== 'all') params.append('branch_id', sourceBranchId);
      if (sourceSemesterId !== 'all') params.append('semester_id', sourceSemesterId);
      if (sourceBatchId !== 'all') params.append('batch_id', sourceBatchId);
      if (sourceSectionId !== 'all') params.append('section_id', sourceSectionId);
      if (search) params.append('search', search);

      const res = await fetchWithTokenRefresh(
        `${API_ENDPOINT}/admin/students/?${params.toString()}`,
        { method: 'GET' }
      ).then((r: Response) => r.json());

      setStudents(res?.results || []);
      setTotalPages(res?.total_pages || 1);
      setCurrentPage(res?.current_page || page);
      setTotalCount(res?.count || 0);
      // Removed setSelectedStudentIds([]) here to preserve selections across page changes
    } catch (e) {
      toast({ title: 'Error', description: 'Failed to fetch students', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [sourceBatchId, sourceBranchId, sourceSemesterId, sourceSectionId, searchTerm, toast]);

  // Handle Search Debounce only after initial fetch
  useEffect(() => {
    if (!hasSearched) return; // Don't auto-search if hasn't been loaded once
    
    const timer = setTimeout(() => {
      fetchStudents(1, searchTerm);
    }, 500);
    return () => clearTimeout(timer);
    // Exclude hasSearched and fetchStudents to prevent double fetching on manual load
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchTerm]);

  // Auto-fetch when filters are completed
  useEffect(() => {
    if (sourceBatchId && sourceBranchId && sourceSemesterId && sourceSectionId && !hasSearched) {
      fetchStudents(1, '');
    }
  }, [sourceBatchId, sourceBranchId, sourceSemesterId, sourceSectionId, hasSearched, fetchStudents]);

  // ─── Table Selections & Actions ───────────────────────────────────────────────
  const toggleSelectAll = (checked: boolean) => {
    if (checked) {
      const newIds = students.map(s => s.id).filter(id => !selectedStudentIds.includes(id));
      setSelectedStudentIds(prev => [...prev, ...newIds]);
    } else {
      const pageIds = students.map(s => s.id);
      setSelectedStudentIds(prev => prev.filter(id => !pageIds.includes(id)));
    }
  };

  const toggleSelectStudent = (studentId: number, checked: boolean) => {
    setSelectedStudentIds(prev =>
      checked ? [...prev, studentId] : prev.filter(id => id !== studentId)
    );
  };

  const handleTransferSubmit = async () => {
    if (!targetBranchId || !targetSemesterId) {
      toast({ title: 'Validation Error', description: 'Please select a target branch and semester', variant: 'destructive' });
      return;
    }
    setTransferring(true);
    try {
      const payload: any = {
        student_ids: selectedStudentIds,
        target_branch_id: parseInt(targetBranchId),
        target_semester_id: parseInt(targetSemesterId),
      };
      if (targetSectionId && targetSectionId !== 'none') {
        payload.target_section_id = parseInt(targetSectionId);
      }

      const res = await fetchWithTokenRefresh(`${API_ENDPOINT}/admin/student-transfer/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      }).then((r: Response) => r.json());

      if (res.success) {
        toast({ title: '✅ Transfer Complete', description: res.message });
        setIsTransferDialogOpen(false);
        setShowConfirmation(false);
        // Remove transferred students from the local table to avoid a network reload
        setStudents(prev => prev.filter(s => !selectedStudentIds.includes(s.id)));
        setTotalCount(prev => Math.max(0, prev - selectedStudentIds.length));
        setSelectedStudentIds([]);
        setTargetBranchId('');
        setTargetSemesterId('');
        setTargetSectionId('');
      } else {
        toast({ title: 'Error', description: res.message || 'Failed to transfer students', variant: 'destructive' });
      }
    } catch (e) {
      toast({ title: 'Error', description: 'An unexpected error occurred', variant: 'destructive' });
    } finally {
      setTransferring(false);
    }
  };

  const isDark = theme === 'dark';
  const isFilterComplete = sourceBatchId && sourceBranchId && sourceSemesterId && sourceSectionId;

  return (
    <div className="space-y-6 p-1">
      {/* Header */}
      <div className={`rounded-xl p-6 border ${isDark ? 'bg-gradient-to-r from-slate-900 to-slate-800 border-slate-700' : 'bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-100'}`}>
        <div className="flex items-center gap-3">
          <div className={`p-3 rounded-xl ${isDark ? 'bg-blue-500/20' : 'bg-blue-100'}`}>
            <ArrowRightLeft className={`h-6 w-6 ${isDark ? 'text-blue-400' : 'text-blue-600'}`} />
          </div>
          <div>
            <h1 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Student Branch Transfer</h1>
            <p className={`text-sm mt-0.5 ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
              Move students from their current branch to a new branch, semester, and section.
            </p>
          </div>
        </div>
      </div>

      <Tabs defaultValue="transfer" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="transfer" className="flex items-center gap-2">
            <Users className="h-4 w-4" /> Transfer Students
          </TabsTrigger>
          <TabsTrigger value="history" className="flex items-center gap-2">
            <History className="h-4 w-4" /> Transfer Records
          </TabsTrigger>
        </TabsList>

        <TabsContent value="transfer" className="m-0 focus-visible:ring-0">
          {/* Filter + Table Card */}
          <Card className={isDark ? 'border-slate-700 bg-slate-900' : ''}>
        <CardHeader className="pb-3 border-b border-border/50 mb-4">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Filter className="h-4 w-4 text-primary" />
            Filter Students Sequentially
          </CardTitle>
          <CardDescription>Select Batch → Branch → Semester → Section to load students.</CardDescription>
        </CardHeader>
        <CardContent>
          {/* Filters Row */}
          <div className="flex flex-col lg:flex-row gap-4 mb-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 flex-1">
              
              {/* 1. BATCH */}
              <Select value={sourceBatchId} onValueChange={handleBatchChange} open={openBatch} onOpenChange={setOpenBatch}>
                <SelectTrigger id="source-batch-select" className={sourceBatchId ? 'border-primary' : ''}>
                  <SelectValue placeholder="Select Batch" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Batches</SelectItem>
                  {batches.map(b => (
                    <SelectItem key={b.id} value={b.id.toString()}>{b.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* 2. BRANCH */}
              <Select value={sourceBranchId} onValueChange={handleBranchChange} open={openBranch} onOpenChange={setOpenBranch} disabled={!sourceBatchId}>
                <SelectTrigger id="source-branch-select" className={sourceBranchId ? 'border-primary' : ''}>
                  <SelectValue placeholder={sourceBatchId ? "Select Branch" : "Select Batch First"} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Branches</SelectItem>
                  {branches.map(b => (
                    <SelectItem key={b.id} value={b.id.toString()}>{b.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* 3. SEMESTER */}
              <Select value={sourceSemesterId} onValueChange={handleSemesterChange} open={openSem} onOpenChange={setOpenSem} disabled={!sourceBranchId || (sourceBranchId !== 'all' && sourceSemesters.length === 0)}>
                <SelectTrigger id="source-semester-select" className={sourceSemesterId ? 'border-primary' : ''}>
                  <SelectValue placeholder={sourceBranchId ? "Select Semester" : "Select Branch First"} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Semesters</SelectItem>
                  {sourceSemesters.map(s => (
                    <SelectItem key={s.id} value={s.id.toString()}>Semester {s.number}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* 4. SECTION */}
              <Select value={sourceSectionId} onValueChange={handleSectionChange} open={openSec} onOpenChange={setOpenSec} disabled={!sourceSemesterId || (sourceSemesterId !== 'all' && sourceSections.length === 0)}>
                <SelectTrigger id="source-section-select" className={sourceSectionId ? 'border-primary' : ''}>
                  <SelectValue placeholder={sourceSemesterId ? "Select Section" : "Select Semester First"} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Sections</SelectItem>
                  {sourceSections.map(s => (
                    <SelectItem key={s.id} value={s.id.toString()}>Section {s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

            </div>
          </div>

          {/* Search + Action Bar */}
          {hasSearched && (
            <div className="flex flex-wrap justify-between items-center gap-3 mb-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div className="relative w-64">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  id="student-search"
                  placeholder="Search by name or USN..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
              <div className="flex items-center gap-3">
                {totalCount > 0 && (
                  <span className="text-sm text-muted-foreground bg-muted px-2 py-1 rounded-md">
                    {totalCount} student{totalCount !== 1 ? 's' : ''} found
                  </span>
                )}
                {selectedStudentIds.length > 0 && (
                  <Button id="transfer-selected-btn" onClick={() => setIsTransferDialogOpen(true)} className="gap-2 shadow-md">
                    <ArrowRightLeft className="h-4 w-4" />
                    Transfer {selectedStudentIds.length} Selected
                  </Button>
                )}
              </div>
            </div>
          )}

          {/* Table */}
          {hasSearched ? (
            <div className={`border rounded-lg overflow-x-auto ${isDark ? 'border-slate-700' : 'border-gray-200'} animate-in fade-in duration-300`}>
              {loading ? (
                <SkeletonTable rows={5} columns={6} />
              ) : (
                <table className="w-full text-sm text-left">
                  <thead className={`font-medium text-xs uppercase tracking-wide ${isDark ? 'bg-slate-800 text-slate-400' : 'bg-gray-50 text-gray-500'}`}>
                    <tr>
                      <th className="p-4 w-12">
                        <Checkbox
                          id="select-all-checkbox"
                          checked={students.length > 0 && students.every(s => selectedStudentIds.includes(s.id))}
                          onCheckedChange={(c) => toggleSelectAll(c as boolean)}
                        />
                      </th>
                      <th className="p-4">USN</th>
                      <th className="p-4">Name</th>
                      <th className="p-4">Branch</th>
                      <th className="p-4">Semester</th>
                      <th className="p-4">Section</th>
                    </tr>
                  </thead>
                  <tbody className={`divide-y ${isDark ? 'divide-slate-800' : 'divide-gray-100'}`}>
                    {students.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="p-12 text-center">
                          <div className="flex flex-col items-center gap-3">
                            <GraduationCap className={`h-10 w-10 ${isDark ? 'text-slate-600' : 'text-gray-300'}`} />
                            <div>
                              <p className={`font-medium ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>No students found</p>
                              <p className="text-xs text-muted-foreground mt-1">Try clearing your search or adjusting filters.</p>
                            </div>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      students.map(student => (
                        <tr
                          key={student.id}
                          className={`cursor-pointer transition-colors ${
                            selectedStudentIds.includes(student.id)
                              ? isDark ? 'bg-blue-500/10' : 'bg-blue-50'
                              : isDark ? 'hover:bg-slate-800/60' : 'hover:bg-gray-50/80'
                          }`}
                          onClick={() => toggleSelectStudent(student.id, !selectedStudentIds.includes(student.id))}
                        >
                          <td className="p-4" onClick={e => e.stopPropagation()}>
                            <Checkbox
                              id={`student-cb-${student.id}`}
                              checked={selectedStudentIds.includes(student.id)}
                              onCheckedChange={c => toggleSelectStudent(student.id, c as boolean)}
                            />
                          </td>
                          <td className="p-4 font-mono font-medium text-xs">{student.usn}</td>
                          <td className="p-4">
                            <span className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>{student.name}</span>
                          </td>
                          <td className="p-4">
                            <Badge variant="outline" className="text-xs font-normal">{student.branch || '—'}</Badge>
                          </td>
                          <td className="p-4 text-muted-foreground text-xs">{student.semester || '—'}</td>
                          <td className="p-4 text-muted-foreground text-xs">{student.section || '—'}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              )}
            </div>
          ) : (
            <div className="py-16 text-center border-2 border-dashed rounded-lg border-muted/60">
              <div className="flex flex-col items-center gap-3">
                <Filter className="h-10 w-10 text-muted-foreground opacity-30" />
                <div>
                  <p className="font-medium text-muted-foreground">No data loaded</p>
                  <p className="text-sm text-muted-foreground mt-1">Select the filters above to automatically load students.</p>
                </div>
              </div>
            </div>
          )}

          {/* Pagination */}
          {hasSearched && totalPages > 1 && (
            <div className="flex justify-between items-center mt-4">
              <span className="text-sm text-muted-foreground">Page {currentPage} of {totalPages}</span>
              <div className="flex gap-2">
                <Button id="prev-page-btn" variant="outline" size="sm"
                  onClick={() => fetchStudents(currentPage - 1, searchTerm)}
                  disabled={currentPage === 1 || loading}>
                  <ChevronLeft className="h-4 w-4 mr-1" /> Prev
                </Button>
                <Button id="next-page-btn" variant="outline" size="sm"
                  onClick={() => fetchStudents(currentPage + 1, searchTerm)}
                  disabled={currentPage === totalPages || loading}>
                  Next <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
      </TabsContent>

      <TabsContent value="history" className="m-0 focus-visible:ring-0">
        <Card className={isDark ? 'border-slate-700 bg-slate-900' : ''}>
          <CardHeader className="pb-3 border-b border-border/50 mb-4">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <History className="h-4 w-4 text-primary" />
              Transfer History Records
            </CardTitle>
            <CardDescription>View past student branch transfers for a specific batch.</CardDescription>
          </CardHeader>
          <CardContent>
            {/* History Filters */}
            <div className="flex flex-col lg:flex-row gap-4 mb-6 justify-between items-start lg:items-center">
              <div className="w-full lg:w-64">
                <Select value={historyBatchId} onValueChange={(v) => { setHistoryBatchId(v); setHistoryPage(1); }}>
                  <SelectTrigger id="history-batch-select" className={historyBatchId ? 'border-primary' : ''}>
                    <SelectValue placeholder="Select Batch" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Batches</SelectItem>
                    {batches.map(b => (
                      <SelectItem key={b.id} value={b.id.toString()}>{b.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {historyBatchId && (
                <div className="relative w-full lg:w-72">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="history-search"
                    placeholder="Search by name or USN..."
                    value={historySearch}
                    onChange={e => setHistorySearch(e.target.value)}
                    className="pl-9"
                  />
                </div>
              )}
            </div>

            {/* History Table */}
            {!historyBatchId ? (
              <div className="py-16 text-center border-2 border-dashed rounded-lg border-muted/60">
                <div className="flex flex-col items-center gap-3">
                  <Filter className="h-10 w-10 text-muted-foreground opacity-30" />
                  <div>
                    <p className="font-medium text-muted-foreground">Select a Batch</p>
                    <p className="text-sm text-muted-foreground mt-1">Please select a batch above to view transfer records.</p>
                  </div>
                </div>
              </div>
            ) : loadingHistory ? (
              <div className="border rounded-lg overflow-x-auto">
                <SkeletonTable rows={5} columns={6} />
              </div>
            ) : (
              <div className={`border rounded-lg overflow-x-auto ${isDark ? 'border-slate-700' : 'border-gray-200'} animate-in fade-in duration-300`}>
                <table className="w-full text-sm text-left">
                  <thead className={`font-medium text-xs uppercase tracking-wide whitespace-nowrap ${isDark ? 'bg-slate-800 text-slate-400' : 'bg-gray-50 text-gray-500'}`}>
                    <tr>
                      <th className="p-4">Student</th>
                      <th className="p-4">From</th>
                      <th className="p-4">To</th>
                      <th className="p-4">Transferred By</th>
                      <th className="p-4">Date</th>
                    </tr>
                  </thead>
                  <tbody className={`divide-y ${isDark ? 'divide-slate-800' : 'divide-gray-100'}`}>
                    {historyRecords.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="p-12 text-center">
                          <p className="text-muted-foreground">No transfer records found.</p>
                        </td>
                      </tr>
                    ) : (
                      historyRecords.map(record => (
                        <tr key={record.id} className={`transition-colors ${isDark ? 'hover:bg-slate-800/60' : 'hover:bg-gray-50/80'}`}>
                          <td className="p-4">
                            <p className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>{record.student_name}</p>
                            <p className="font-mono text-xs text-muted-foreground mt-0.5">{record.student_usn}</p>
                          </td>
                          <td className="p-4">
                            <Badge variant="outline" className="mb-1 text-xs">{record.source_branch}</Badge>
                            <p className="text-xs text-muted-foreground">{record.source_semester}, {record.source_section}</p>
                          </td>
                          <td className="p-4">
                            <Badge className="mb-1 text-xs">{record.target_branch}</Badge>
                            <p className="text-xs text-muted-foreground">{record.target_semester}, {record.target_section}</p>
                          </td>
                          <td className="p-4 text-xs">{record.transferred_by}</td>
                          <td className="p-4 text-xs whitespace-nowrap">
                            {new Date(record.transfer_date).toLocaleDateString()}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {/* History Pagination */}
            {historyBatchId && historyTotalPages > 1 && (
              <div className="flex justify-between items-center mt-4">
                <span className="text-sm text-muted-foreground">Page {historyPage} of {historyTotalPages}</span>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm"
                    onClick={() => fetchHistory(historyPage - 1)}
                    disabled={historyPage === 1 || loadingHistory}>
                    <ChevronLeft className="h-4 w-4 mr-1" /> Prev
                  </Button>
                  <Button variant="outline" size="sm"
                    onClick={() => fetchHistory(historyPage + 1)}
                    disabled={historyPage === historyTotalPages || loadingHistory}>
                    Next <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </TabsContent>
      </Tabs>

      {/* ─── Transfer Dialog ──────────────────────────────────────────── */}
      <Dialog 
        open={isTransferDialogOpen} 
        onOpenChange={(open) => {
          setIsTransferDialogOpen(open);
          if (!open) setShowConfirmation(false);
        }}
      >
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ArrowRightLeft className="h-5 w-5 text-primary" />
              Transfer {selectedStudentIds.length} Student{selectedStudentIds.length !== 1 ? 's' : ''}
            </DialogTitle>
            <DialogDescription>
              {showConfirmation 
                ? "Please review the transfer details below before confirming."
                : "Select the destination branch, semester, and optionally a section."}
            </DialogDescription>
          </DialogHeader>

          {!showConfirmation ? (
            <>
              <div className="space-y-4 py-2">
                {/* Target Branch */}
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">
                    Target Branch <span className="text-destructive">*</span>
                  </label>
                  <Select value={targetBranchId} onValueChange={setTargetBranchId}>
                    <SelectTrigger id="target-branch-select">
                      <SelectValue placeholder="Select Branch" />
                    </SelectTrigger>
                    <SelectContent>
                      {branches.map(b => (
                        <SelectItem key={b.id} value={b.id.toString()}>{b.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Target Semester */}
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">
                    Target Semester <span className="text-destructive">*</span>
                  </label>
                  <Select value={targetSemesterId} onValueChange={setTargetSemesterId} disabled={!targetBranchId || targetSemesters.length === 0}>
                    <SelectTrigger id="target-semester-select">
                      <SelectValue placeholder={targetBranchId ? (targetSemesters.length > 0 ? "Select Semester" : "Loading...") : "Select a branch first"} />
                    </SelectTrigger>
                    <SelectContent>
                      {targetSemesters.map(s => (
                        <SelectItem key={s.id} value={s.id.toString()}>Semester {s.number}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Target Section */}
                <div className="space-y-1.5">
                  <label className="text-sm font-medium flex items-center gap-1">
                    Target Section <span className="text-destructive">*</span>
                  </label>
                  <Select value={targetSectionId} onValueChange={setTargetSectionId} disabled={!targetSemesterId}>
                    <SelectTrigger id="target-section-select">
                      <SelectValue placeholder={targetSemesterId ? "Select Section" : "Select a semester first"} />
                    </SelectTrigger>
                    <SelectContent>
                      {targetSections.map(s => (
                        <SelectItem key={s.id} value={s.id.toString()}>Section {s.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <DialogFooter className="gap-2 pt-2">
                <Button variant="outline" onClick={() => setIsTransferDialogOpen(false)}>Cancel</Button>
                <Button
                  onClick={() => setShowConfirmation(true)}
                  disabled={!targetBranchId || !targetSemesterId || !targetSectionId || targetSectionId === 'none'}
                  className="gap-2"
                >
                  Continue <ChevronRight className="h-4 w-4" />
                </Button>
              </DialogFooter>
            </>
          ) : (
            <>
              <div className="bg-muted/50 p-4 rounded-lg space-y-3 my-2 border border-border">
                <h4 className="font-medium text-sm border-b pb-2">Transfer Summary</h4>
                <div className="grid grid-cols-3 gap-2 text-sm">
                  <span className="text-muted-foreground">Total Students:</span>
                  <span className="col-span-2 font-medium">{selectedStudentIds.length}</span>
                  
                  <span className="text-muted-foreground">To Branch:</span>
                  <span className="col-span-2 font-medium">
                    {branches.find(b => b.id.toString() === targetBranchId)?.name || 'Unknown'}
                  </span>
                  
                  <span className="text-muted-foreground">To Semester:</span>
                  <span className="col-span-2 font-medium">
                    Semester {targetSemesters.find(s => s.id.toString() === targetSemesterId)?.number || 'Unknown'}
                  </span>
                  
                  <span className="text-muted-foreground">To Section:</span>
                  <span className="col-span-2 font-medium">
                    Section {targetSections.find(s => s.id.toString() === targetSectionId)?.name || 'Unknown'}
                  </span>
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                This action will immediately move the selected students to the new branch. This cannot be easily undone.
              </p>
              <DialogFooter className="gap-2 pt-4">
                <Button variant="outline" onClick={() => setShowConfirmation(false)} disabled={transferring}>
                  <ChevronLeft className="h-4 w-4 mr-1" /> Back
                </Button>
                <Button
                  id="confirm-transfer-btn"
                  onClick={handleTransferSubmit}
                  disabled={transferring}
                  className="gap-2 bg-destructive hover:bg-destructive/90 text-destructive-foreground"
                >
                  {transferring ? 'Transferring...' : 'Yes, Transfer Now'}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default StudentBranchTransfer;
