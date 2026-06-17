import { translateTerminology, getTerm } from "@/utils/institutionConfig";
import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge'; // Trigger reload
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { useTheme } from '@/context/ThemeContext';
import { paginationToUI } from '@/utils/paginationToUI';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { AlertTriangle, Copy, ExternalLink, Search } from 'lucide-react';
import { getFilterOptions, getSemesters, createResultUploadBatch, getStudentsForUpload, saveMarksForUpload, publishUploadBatch, unpublishUploadBatch, toggleWithholdResult, importCieMarks, importSeeMarks } from "../../utils/coe_api";
import { toast } from "sonner";
import { SkeletonForm, SkeletonTable } from '@/components/ui/skeleton';

const PublishResults = React.forwardRef<HTMLDivElement>((_, ref) => {
  const { theme } = useTheme();
  const [filters, setFilters] = useState<any>({ batches: [], branches: [] });
  const [semesters, setSemesters] = useState<any[]>([]);
  // Do not pre-select exam_period so students aren't auto-loaded before user choice
  const [selected, setSelected] = useState<any>({ batch: '', branch: '', semester: '', exam_period: '' });
  const [upload, setUpload] = useState<any>(null);
  const [students, setStudents] = useState<any[]>([]);
  const [studentsPage, setStudentsPage] = useState(1);
  const [studentsPageSize, setStudentsPageSize] = useState(25);
  const [studentsPagination, setStudentsPagination] = useState<any>(null);
  const [subjectsMeta, setSubjectsMeta] = useState<Record<string, {name: string, code: string, credits: number}>>({});
  const [dirtyPages, setDirtyPages] = useState<Record<number, boolean>>({});
  const [navModalOpen, setNavModalOpen] = useState(false);
  const [pendingNav, setPendingNav] = useState<{page: number;pageSize?: number;} | null>(null);
  const [publishModalOpen, setPublishModalOpen] = useState(false);
  const [unpublishModalOpen, setUnpublishModalOpen] = useState(false);
  const [importCieModalOpen, setImportCieModalOpen] = useState(false);
  const [cieCalculationRule, setCieCalculationRule] = useState('average');
  const [importingCie, setImportingCie] = useState(false);
  const [importSeeModalOpen, setImportSeeModalOpen] = useState(false);
  const [importingSee, setImportingSee] = useState(false);
  // marks for current page (kept for compatibility)
  const [marks, setMarks] = useState<Record<string, Record<string, {cie?: number | string | null;see?: number | string | null;}>>>({});
  // persisted marks across pages keyed by student_id -> { usn, subs: { subjectId: {cie,see} }}
  const [allMarks, setAllMarks] = useState<Record<string, {usn: string;subs: Record<string, {cie?: number | string | null;see?: number | string | null;}>;}>>({});
  const [saving, setSaving] = useState(false);
  const [filtersLoading, setFiltersLoading] = useState(true);
  const [studentsLoading, setStudentsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
  const [isBranchOpen, setIsBranchOpen] = useState(false);
  const [isSemesterOpen, setIsSemesterOpen] = useState(false);
  const [isExamPeriodOpen, setIsExamPeriodOpen] = useState(false);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 500);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  useEffect(() => {
    if (upload) {
      fetchStudentsPage(upload.id, 1, studentsPageSize, false, debouncedSearchQuery);
    }
  }, [debouncedSearchQuery, upload?.id]);

  useEffect(() => {
    (async () => {
      setFiltersLoading(true);
      const opts = await getFilterOptions();
      setFilters(opts);
      setFiltersLoading(false);
    })();
  }, []);

  const fetchSemesters = async (branchId: string) => {
    if (!branchId) {
      setSemesters([]);
      return;
    }
    try {
      const sems = await getSemesters(parseInt(branchId));
      setSemesters(sems);
    } catch (error) {

      setSemesters([]);
    }
  };

  const handleCreate = async () => {
    if (!selected.batch || !selected.branch || !selected.semester || !selected.exam_period) {
      toast.error('Select all filters before creating upload');
      return;
    }
    const res = await createResultUploadBatch({ batch: String(selected.batch), branch: String(selected.branch), semester: String(selected.semester), exam_period: selected.exam_period });
    if (res.success) {
      setSearchQuery('');
      setUpload(res.upload_batch);
    } else {
      toast.error(res.message || 'Failed to create upload');
    }
  };

  // Auto-create or fetch existing upload when all filters are selected
  useEffect(() => {
    let mounted = true;
    (async () => {
      if (!selected.batch || !selected.branch || !selected.semester || !selected.exam_period) return;
      try {
        const res = await createResultUploadBatch({ batch: String(selected.batch), branch: String(selected.branch), semester: String(selected.semester), exam_period: selected.exam_period });
        if (!mounted) return;
        if (res.success) {
          setSearchQuery('');
          setUpload(res.upload_batch);
        }
      } catch (e) {

        // ignore
      }})();
    return () => {mounted = false;};
  }, [selected.batch, selected.branch, selected.semester, selected.exam_period]);

  // Helper to fetch a specific students page and merge marks
  const fetchStudentsPage = async (uploadId: number, page?: number, pageSize?: number, overwriteExisting: boolean = false, searchStr?: string) => {
    setStudentsLoading(true);
    const queryStr = searchStr !== undefined ? searchStr : debouncedSearchQuery;
    const stu = await getStudentsForUpload(uploadId, page, pageSize, undefined, queryStr);
    setStudentsLoading(false);
    if (stu.success) {
      const studentList = stu.data?.students || [];
      setStudents(studentList);
      if (stu.data?.subjects_meta) {
        setSubjectsMeta(stu.data.subjects_meta);
      }
      setStudentsPagination(stu.pagination || null);
      setStudentsPage(page || 1);
      // mark this page as clean when freshly loaded
      setDirtyPages((prev) => ({ ...(prev || {}), [page || 1]: false }));
      // merge marks into allMarks
      setAllMarks((prev) => {
        const next = { ...prev };
        (studentList || []).forEach((s: any) => {
          const sid = String(s.student_id);
          if (!next[sid]) next[sid] = { usn: s.usn, subs: {} };
          (s.subjects || []).forEach((sub: any) => {
            if (overwriteExisting) {
              next[sid].subs[String(sub.id)] = { cie: sub.cie_marks ?? '', see: sub.see_marks ?? '' };
            } else {
              if (!next[sid].subs[String(sub.id)]) {
                next[sid].subs[String(sub.id)] = { cie: sub.cie_marks ?? '', see: sub.see_marks ?? '' };
              }
            }
          });
        });
        return next;
      });
    }
  };

  const handleInput = (studentId: number, usn: string, subjectId: number, field: 'cie' | 'see', value: string) => {
    const sid = String(studentId);
    const subKey = String(subjectId);
    // sanitize input: allow empty string to clear, otherwise integer-like values only
    const sanitize = (v: string) => {
      if (v === null || v === undefined) return '';
      const trimmed = String(v).trim();
      if (trimmed === '') return '';
      // allow leading zeros etc by parsing number
      // but reject non-numeric input
      if (!/^-?\d+$/.test(trimmed)) return null;
      const n = Number(trimmed);
      if (Number.isNaN(n)) return null;
      return Math.floor(n);
    };
    const candidate = sanitize(value);
    // if input is non-numeric, ignore
    if (candidate === null) return;
    // enforce bounds as-you-type: reject changes that go outside 0..50
    if (typeof candidate === 'number' && (candidate > 50 || candidate < 0)) {
      return; // do not update state, preventing typing >50 or <0
    }
    const val = candidate;
    setAllMarks((prev) => {
      const next = { ...prev } as any;
      if (!next[sid]) next[sid] = { usn: usn, subs: {} };
      if (!next[sid].subs) next[sid].subs = {};
      next[sid].subs[subKey] = { ...(next[sid].subs[subKey] || {}), [field]: val };
      return next;
    });
    // keep compatibility marks for current page rendering
    setMarks((prev) => {
      const p = { ...prev } as any;
      const sKey = sid;
      const subKey2 = subKey;
      if (!p[sKey]) p[sKey] = {};
      if (!p[sKey][subKey2]) p[sKey][subKey2] = {};
      p[sKey][subKey2][field] = val;
      return p;
    });
    // mark current page dirty when user edits
    setDirtyPages((prev) => ({ ...(prev || {}), [studentsPage]: true }));
  };

  const handleSave = async () => {
    if (!upload) {
      toast.error('Create upload batch first');
      return false;
    }
    // Build payload from all persisted marks across pages so multi-page edits are preserved
    const payload: any[] = [];
    Object.entries(allMarks).forEach(([sid, data]) => {
      const usn = data.usn;
      const subs = data.subs || {};
      Object.entries(subs).forEach(([subId, marksObj]) => {
        const rawCie = (marksObj as any).cie;
        const rawSee = (marksObj as any).see;
        const cieVal = rawCie === null || rawCie === undefined || typeof rawCie === 'string' && String(rawCie).trim() === '' ? null : Number(rawCie);
        const seeVal = rawSee === null || rawSee === undefined || typeof rawSee === 'string' && String(rawSee).trim() === '' ? null : Number(rawSee);
        payload.push({ usn: usn, subject_id: Number(subId), cie_marks: Number.isNaN(cieVal) ? null : cieVal, see_marks: Number.isNaN(seeVal) ? null : seeVal });
      });
    });
    setSaving(true);
    const res = await saveMarksForUpload(upload.id, payload);
    setSaving(false);
    if (res.success) {
      toast.success(`Saved ${res.saved_count} records`);
      setDirtyPages({});
      // Merge the saved payload into local cache so UI reflects confirmed values
      setAllMarks((prev) => {
        const next = { ...(prev || {}) } as any;
        payload.forEach((rec: any) => {
          const sid = Object.keys(next).find((k) => next[k].usn === rec.usn) || String(rec.usn);
          // if we can't find by usn in existing cache, try to find student by matching current students list
          let sidKey = sid;
          if (!next[sidKey]) {
            // fallback: if payload contains usn but no existing entry, attempt to find student_id from `students` on current page
            const found = (students || []).find((s) => s.usn === rec.usn);
            if (found) sidKey = String(found.student_id);
          }
          if (!next[sidKey]) next[sidKey] = { usn: rec.usn, subs: {} };
          if (!next[sidKey].subs) next[sidKey].subs = {};
          const subId = String(rec.subject_id);
          next[sidKey].subs[subId] = { cie: rec.cie_marks === null ? '' : Number(rec.cie_marks), see: rec.see_marks === null ? '' : Number(rec.see_marks) };
        });
        return next;
      });
      // also update marks for current page rendering
      setMarks((prev) => {
        const next = { ...(prev || {}) } as any;
        payload.forEach((rec: any) => {
          const sid = String(rec.student_id || Object.keys(next).find((k) => k === String(rec.student_id)) || (students.find((s) => s.usn === rec.usn) ? String((students.find((s) => s.usn === rec.usn) as any).student_id) : String(rec.student_id || rec.usn)));
          const subId = String(rec.subject_id);
          if (!next[sid]) next[sid] = {};
          if (!next[sid][subId]) next[sid][subId] = {};
          next[sid][subId].cie = rec.cie_marks === null ? '' : Number(rec.cie_marks);
          next[sid][subId].see = rec.see_marks === null ? '' : Number(rec.see_marks);
        });
        return next;
      });
      return true;
    } else {
      toast.error(res.message || 'Failed saving');
      return false;
    }
  };

  const navigateToPage = async (targetPage: number, pageSize?: number) => {
    if (!upload) return;
    if (targetPage === studentsPage) return;
    const currentDirty = dirtyPages[studentsPage];
    if (currentDirty) {
      // open in-UI modal and store pending navigation
      setPendingNav({ page: targetPage, pageSize });
      setNavModalOpen(true);
      return;
    }
    await fetchStudentsPage(upload.id, targetPage, pageSize ?? studentsPageSize, false, debouncedSearchQuery);
  };

  const confirmNavSave = async (saveFirst: boolean) => {
    if (!upload || !pendingNav) return setNavModalOpen(false);
    setNavModalOpen(false);
    if (saveFirst) {
      const ok = await handleSave();
      if (!ok) return; // abort if save failed
    }
    if (!saveFirst) {
      // Discard local unsaved changes for the current page so server values are shown
      setAllMarks((prev) => {
        const next = { ...prev };
        (students || []).forEach((s: any) => {
          delete next[String(s.student_id)];
        });
        return next;
      });
      // mark current page clean
      setDirtyPages((prev) => ({ ...(prev || {}), [studentsPage]: false }));
    }
    await fetchStudentsPage(upload.id, pendingNav.page, pendingNav.pageSize ?? studentsPageSize, false, debouncedSearchQuery);
    setPendingNav(null);
  };

  const handlePublish = async () => {
    if (!upload) {
      toast.error('Create upload batch first');
      return;
    }
    const res = await publishUploadBatch(upload.id);
    if (res.success) {
      toast.success('Published successfully');
      // refresh upload info
      setUpload({ ...upload, is_published: true });
      // refresh students in case published_result_id/is_withheld changed after publish
      await fetchStudentsPage(upload.id, studentsPage, studentsPageSize, false, debouncedSearchQuery);
    } else {
      toast.error(res.message || 'Publish failed');
    }
  };

  const handleToggleWithhold = async (studentId: number, studentName: string, publishedResultId: number | null, currentWithheld: boolean) => {
    if (!publishedResultId) {
      toast.error('No published result found for this student');
      return;
    }

    try {
      const res = await toggleWithholdResult(publishedResultId);
      if (res.success) {
        const actionText = res.withheld ? 'withheld' : 'released';
        toast.success(`Result ${actionText} for ${studentName}`);
        // Refresh students list to update withheld status
        if (upload) {
          await fetchStudentsPage(upload.id, studentsPage, studentsPageSize, true, debouncedSearchQuery);
        }
      } else {
        toast.error(res.message || 'Toggle failed');
      }
    } catch (e: any) {
      toast.error(e?.message || 'Failed to toggle withhold status');
    }
  };

  const handleImportCie = async () => {
    if (!upload) return;
    setImportingCie(true);
    const res = await importCieMarks(upload.id, cieCalculationRule);
    setImportingCie(false);
    if (res.success) {
      toast.success(res.message || 'Import successful');
      setImportCieModalOpen(false);
      // reload current page to show imported marks
      await fetchStudentsPage(upload.id, studentsPage, studentsPageSize, true, debouncedSearchQuery);
    } else {
      toast.error(res.message || 'Import failed');
    }
  };

  const handleImportSee = async () => {
    if (!upload) return;
    setImportingSee(true);
    const res = await importSeeMarks(upload.id);
    setImportingSee(false);
    if (res.success) {
      toast.success(res.message || 'Import successful');
      setImportSeeModalOpen(false);
      // reload current page to show imported marks
      await fetchStudentsPage(upload.id, studentsPage, studentsPageSize, true, debouncedSearchQuery);
    } else {
      toast.error(res.message || 'Import failed');
    }
  };

  return (
    <div ref={ref} id="coe-publish-results-container" className={` ${theme === 'dark' ? 'bg-background text-foreground' : 'bg-gray-50 text-gray-900'}`}>
      <Card id="coe-publish-results-filters" className={`${theme === 'dark' ? 'bg-card text-foreground border-border shadow-sm' : 'bg-white text-gray-900 border-gray-200 shadow-sm'} mb-4`}>
        <CardHeader className="pb-4">
          <CardTitle>Filter And Create Upload Batch</CardTitle>
        </CardHeader>
        <CardContent>
          {filtersLoading ?
          <SkeletonForm fields={4} /> :

          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-3 sm:gap-4">
              <div>
                <label htmlFor="publish-results-batch" className="block text-sm mb-1">Batch</label>
                <Select value={selected.batch} onValueChange={(v) => {
                  setSelected((s) => ({ ...s, batch: v }));
                  setTimeout(() => setIsBranchOpen(true), 150);
                }}>
                  <SelectTrigger id="publish-results-batch" className={theme === 'dark' ? 'bg-background border-border' : 'bg-white border-gray-300'}>
                    <SelectValue placeholder="Select batch" />
                  </SelectTrigger>
                  <SelectContent>
                    {filters.batches.map((b: any) => <SelectItem key={b.id} value={String(b.id)}>{b.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label htmlFor="publish-results-branch" className="block text-sm mb-1">{translateTerminology("Branch")}</label>
                <Select value={selected.branch} onValueChange={(v) => {
                  setSelected((s) => ({ ...s, branch: v, semester: '' }));
                  fetchSemesters(v);
                  setTimeout(() => setIsSemesterOpen(true), 150);
                }} open={isBranchOpen} onOpenChange={setIsBranchOpen} disabled={!selected.batch}>
                  <SelectTrigger id="publish-results-branch" className={theme === 'dark' ? 'bg-background border-border' : 'bg-white border-gray-300'}>
                    <SelectValue placeholder="Select branch" />
                  </SelectTrigger>
                  <SelectContent>
                    {filters.branches.map((b: any) => <SelectItem key={b.id} value={String(b.id)}>{b.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label htmlFor="publish-results-semester" className="block text-sm mb-1">{translateTerminology("Semester")}</label>
                <Select value={selected.semester} onValueChange={(v) => {
                  setSelected((s) => ({ ...s, semester: v }));
                  setTimeout(() => setIsExamPeriodOpen(true), 150);
                }} open={isSemesterOpen} onOpenChange={setIsSemesterOpen} disabled={!selected.branch}>
                  <SelectTrigger id="publish-results-semester" className={theme === 'dark' ? 'bg-background border-border' : 'bg-white border-gray-300'}>
                    <SelectValue placeholder="Select semester" />
                  </SelectTrigger>
                  <SelectContent>
                    {semesters.map((s: any) =>
                  <SelectItem key={s.id} value={String(s.id)}>{s.number}</SelectItem>
                  )}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label htmlFor="publish-results-exam-period" className="block text-sm mb-1">Exam Period</label>
                <Select value={selected.exam_period} onValueChange={(v) => setSelected((s) => ({ ...s, exam_period: v }))} open={isExamPeriodOpen} onOpenChange={setIsExamPeriodOpen} disabled={!selected.semester}>
                  <SelectTrigger id="publish-results-exam-period" className={theme === 'dark' ? 'bg-background border-border' : 'bg-white border-gray-300'}>
                    <SelectValue placeholder="Exam period" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="june_july">June/July</SelectItem>
                    <SelectItem value="nov_dec">Nov/Dec</SelectItem>
                    <SelectItem value="jan_feb">Jan/Feb</SelectItem>
                    <SelectItem value="apr_may">Apr/May</SelectItem>
                    <SelectItem value="sept_oct">Sept/Oct</SelectItem>
                    <SelectItem value="feb_mar">Feb/Mar</SelectItem>
                    <SelectItem value="supplementary">Supplementary</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-end">
                <Button className="w-full sm:w-auto bg-primary text-white border-primary hover:bg-primary/90 hover:border-primary/90" onClick={handleCreate}>
                  Create Upload Batch
                </Button>
              </div>
            </div>
          }
        </CardContent>
      </Card>

      {upload &&
      <Card className={`${theme === 'dark' ? 'bg-card text-foreground border-border shadow-sm' : 'bg-white text-gray-900 border-gray-200 shadow-sm'} mb-4`}>
          <CardContent className="p-4 sm:p-5">
            <div className="flex flex-col gap-4">
              {/* Header section with ID & Status */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border/40">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold text-sm shrink-0 shadow-inner">
                    ID
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-foreground flex items-center gap-2">
                      <span>Upload Batch #{upload.id}</span>
                      <Badge className={upload.is_published ? "border-emerald-200 bg-emerald-100 text-emerald-800 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-200" : "border-red-200 bg-red-100 text-red-800 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-200"}>
                        {upload.is_published ? "Published" : "Draft"}
                      </Badge>
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5">Manage result publication and imports</div>
                  </div>
                </div>
                {upload.is_published && (
                  <div className="flex gap-2 w-full sm:w-auto">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 sm:flex-none h-8 text-xs gap-1.5"
                      onClick={() => {
                        const url = `${window.location.origin}/results/view/${upload.token}`;
                        navigator.clipboard.writeText(url);
                        toast.success('Result link copied to clipboard');
                      }}>
                      <Copy className="h-3.5 w-3.5" /> Copy Link
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 sm:flex-none h-8 text-xs gap-1.5"
                      onClick={() => {
                        window.open(`/results/view/${upload.token}`, '_blank');
                      }}>
                      <ExternalLink className="h-3.5 w-3.5" /> Open Link
                    </Button>
                  </div>
                )}
              </div>

              {/* Token Section */}
              <div className="space-y-1.5">
                <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block">Token / Access Key</span>
                <div className="font-mono text-xs bg-muted/20 p-3 rounded-xl border border-border/30 break-all select-all leading-normal text-foreground/90">
                  {upload.token}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-1 flex flex-col sm:flex-row sm:items-center gap-3">
                {upload.is_published ? (
                  <Button onClick={() => setUnpublishModalOpen(true)} className="w-full sm:w-auto h-9 font-medium shadow-sm transition-all border border-red-200 bg-red-100 text-red-800 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-200 hover:bg-red-200 dark:hover:bg-red-950/60">
                    Unpublish Results
                  </Button>
                ) : (
                  <div className="flex flex-col sm:flex-row gap-2 w-full">
                    <Button variant="outline" size="sm" className="w-full sm:w-auto h-9" onClick={() => setImportCieModalOpen(true)}>Import Internal Marks</Button>
                    <Button variant="outline" size="sm" className="w-full sm:w-auto h-9" onClick={() => setImportSeeModalOpen(true)}>Import SEE Marks</Button>
                    <Button size="sm" className="w-full sm:w-auto h-9 bg-primary text-white border-primary hover:bg-primary/90 hover:border-primary/90 sm:ml-auto" onClick={() => setPublishModalOpen(true)}>Publish Results</Button>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      }

      {!selected.batch || !selected.branch || !selected.semester || !selected.exam_period ?
      <Card className="border-dashed border-2 shadow-none bg-transparent">
            <CardContent className="flex flex-col items-center justify-center py-24 text-center">
              <div className="bg-primary/5 p-6 rounded-full mb-4">
                <Search className="w-12 h-12 text-primary/40" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Select filters to publish results</h3>
              <p className="text-muted-foreground max-w-sm mx-auto">
                Please select a batch, branch, semester, and exam period from the dropdowns above to load the student list and entry form.
              </p>
            </CardContent>
         </Card> :
      students.length > 0 &&
      <Card className={`${theme === 'dark' ? 'bg-card text-foreground border-border shadow-sm' : 'bg-white text-gray-900 border-gray-200 shadow-sm'}`}>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg sm:text-xl">Student Marks Entry</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="mb-4">
              <div className="relative">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by student name or USN..."
                  className="pl-9"
                  value={searchQuery}
                  onChange={(e: any) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>
            <div className="overflow-auto">
          <div className="flex items-center justify-between mb-3">
            <div className="text-sm text-muted-foreground">Showing {students.length} students</div>
            <div className="flex gap-3 items-center pr-1">
              {/* Pagination controls will follow below the table */}
            </div>
          </div>
            {studentsLoading ?
            <SkeletonTable rows={10} cols={9} /> :

            <div className="space-y-4">
                {students.map((s) => {
                const studentMarks = allMarks[String(s.student_id)]?.subs || marks[String(s.student_id)] || {};
                // Consistent pass/fail rule used across this student row
                const meetsPassCriteria = (c: any, se: any, t: any) => {
                  return typeof c === 'number' && typeof se === 'number' && typeof t === 'number' && c >= 20 && se >= 18 && t >= 40;
                };
                const incompleteCount = (s.subjects || []).reduce((acc: number, sub: any) => {
                  const e = studentMarks[String(sub.id)];
                  const cie = e?.cie;
                  const see = e?.see;
                  if (cie === null || cie === undefined || see === null || see === undefined || cie === '' || see === '') return acc + 1;
                  return acc;
                }, 0);

                return (
                  <div key={s.student_id} className="border rounded-md p-3">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-3">
                        <div className="space-y-1">
                          <div className="font-semibold text-base leading-tight">
                            {s.name} <span className="text-xs font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded ml-1">({s.usn})</span>
                          </div>
                          <div className="text-xs text-muted-foreground">
                            Subjects: {(s.subjects || []).length} • Incomplete: {incompleteCount}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 w-full sm:w-auto">
                          {s.is_withheld && (
                            <div className="text-xs bg-amber-100 text-amber-800 px-2.5 py-1 rounded-md border border-amber-300 font-medium">
                              Withheld
                            </div>
                          )}
                          {upload?.is_published && (
                            <Button
                              size="sm"
                              variant={s.is_withheld ? "outline" : "destructive"}
                              onClick={async () => {
                                if (!s.published_result_id) {
                                  toast.error('Published result ID not found yet. Please refresh student list.');
                                  return;
                                }
                                await handleToggleWithhold(s.student_id, s.name, s.published_result_id, s.is_withheld);
                              }}
                              className={`flex-1 sm:flex-none h-8 text-xs font-semibold rounded-md border ${theme === 'dark' ? 'border-red-500 text-red-400 bg-red-500/10 hover:bg-red-500/20' : 'border-red-500 text-red-700 bg-red-50 hover:bg-red-100'}`}
                            >
                              {s.is_withheld ? "Release Result" : "Withhold Result"}
                            </Button>
                          )}
                        </div>
                      </div>

                      <div className="w-full overflow-x-auto custom-scrollbar">
                      <table className="table-auto w-full min-w-[980px] border-collapse">
                        <thead>
                          <tr>
                            <th className="border font-semibold px-2 py-1 whitespace-nowrap">Subject Code</th>
                            <th className="border font-semibold px-2 py-1 whitespace-nowrap">Subject Title</th>
                            <th className="border font-semibold px-2 py-1 whitespace-nowrap">CIE</th>
                            <th className="border font-semibold px-2 py-1 whitespace-nowrap">SEE</th>
                            <th className="border font-semibold px-2 py-1 whitespace-nowrap">Total Marks</th>
                            <th className="border font-semibold px-2 py-1 whitespace-nowrap">Result</th>
                            <th className="border font-semibold px-2 py-1 whitespace-nowrap">Grade</th>
                            <th className="border font-semibold px-2 py-1 whitespace-nowrap">Grade Point</th>
                            <th className="border font-semibold px-2 py-1 whitespace-nowrap">Credits Assigned</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(s.subjects || []).map((sub: any) => {
                            const entry = studentMarks[String(sub.id)];
                            const cie = entry?.cie ?? '';
                            const see = entry?.see ?? '';
                            const total = typeof cie === 'number' && typeof see === 'number' ? cie + see : '';
                            const displayTotal = total;
                            const result = displayTotal === '' ? 'Incomplete' : meetsPassCriteria(cie, see, total) ? 'Pass' : 'Fail';

                            // Calculate grade based on total marks (assuming 100 max)
                            let grade = '';
                            let gradePoints = '';
                            if (typeof total === 'number') {
                              if (total >= 90) {grade = 'S';gradePoints = '10';} else
                              if (total >= 80) {grade = 'A';gradePoints = '9';} else
                              if (total >= 70) {grade = 'B';gradePoints = '8';} else
                              if (total >= 60) {grade = 'C';gradePoints = '7';} else
                              if (total >= 50) {grade = 'D';gradePoints = '6';} else
                              if (total >= 40) {grade = 'E';gradePoints = '5';} else
                              {grade = 'F';gradePoints = '0';}
                            }

                            return (
                              <tr key={sub.id}>
                                <td className="border px-2 py-1">{subjectsMeta[sub.id]?.code || sub.code}</td>
                                <td className="border px-2 py-1">{subjectsMeta[sub.id]?.name || sub.name}</td>
                                <td className="border px-2 py-1"><Input disabled={upload?.is_published} className="w-20" type="number" min={0} max={50} value={cie} onChange={(e: any) => handleInput(s.student_id, s.usn, sub.id, 'cie', e.target.value)} onWheel={(e: any) => e.currentTarget.blur()} /></td>
                                <td className={`border px-2 py-1`}><Input disabled={upload?.is_published} className="w-20" type="number" min={0} max={50} value={see} onChange={(e: any) => handleInput(s.student_id, s.usn, sub.id, 'see', e.target.value)} onWheel={(e: any) => e.currentTarget.blur()} /></td>
                                <td className="border px-2 py-1">{displayTotal}</td>
                                <td className={`border px-2 py-1 ${result === 'Pass' ? 'text-green-600' : result === 'Fail' ? 'text-red-600' : 'text-yellow-600'}`}>{result}</td>
                                <td className="border px-2 py-1">{grade}</td>
                                <td className="border px-2 py-1">{gradePoints}</td>
                                <td className="border px-2 py-1">{result === 'Pass' ? (subjectsMeta[sub.id]?.credits ?? sub.credits ?? 0) : result === 'Fail' ? 0 : 'N/A'}</td>
                              </tr>);

                          })}
                        </tbody>
                        <tfoot>
                          <tr>
                            <td colSpan={8} className="border px-2 py-1 font-semibold text-right">Total Credits Earned:</td>
                            <td className="border px-2 py-1 font-semibold">
                              {(s.subjects || []).reduce((acc: number, sub: any) => {
                                const entry = studentMarks[String(sub.id)];
                                const cie = entry?.cie;
                                const see = entry?.see;
                                const total = typeof cie === 'number' && typeof see === 'number' ? cie + see : null;
                                const passed = meetsPassCriteria(cie, see, total);
                                const creditsToAdd = passed ? sub.credits || 0 : 0;
                                return acc + creditsToAdd;
                              }, 0)}
                            </td>
                          </tr>
                          <tr>
                            <td colSpan={8} className="border px-2 py-1 font-semibold text-right">Total Marks Obtained:</td>
                            <td className="border px-2 py-1 font-semibold">
                              {(s.subjects || []).reduce((acc: number, sub: any) => {
                                const entry = studentMarks[String(sub.id)];
                                const cie = entry?.cie;
                                const see = entry?.see;
                                const total = typeof cie === 'number' && typeof see === 'number' ? cie + see : 0;
                                return acc + (typeof total === 'number' ? total : 0);
                              }, 0)}
                            </td>
                          </tr>
                          <tr>
                            <td colSpan={8} className="border px-2 py-1 font-semibold text-right">SGPA:</td>
                            <td className="border px-2 py-1 font-semibold">
                              {(() => {
                                const subjects = s.subjects || [];
                                let totalGradePoints = 0;
                                let totalCredits = 0;

                                subjects.forEach((sub: any) => {
                                  const entry = studentMarks[String(sub.id)];
                                  const cie = entry?.cie;
                                  const see = entry?.see;
                                  const total = typeof cie === 'number' && typeof see === 'number' ? cie + see : null;
                                  const credits = sub.credits || 0;
                                  const passed = meetsPassCriteria(cie, see, total);

                                  if (typeof total === 'number' && credits > 0 && passed) {
                                    let gradePoints = 0;
                                    if (total >= 90) gradePoints = 10;else
                                    if (total >= 80) gradePoints = 9;else
                                    if (total >= 70) gradePoints = 8;else
                                    if (total >= 60) gradePoints = 7;else
                                    if (total >= 50) gradePoints = 6;else
                                    if (total >= 40) gradePoints = 5;else
                                    gradePoints = 0;

                                    totalGradePoints += gradePoints * credits;
                                    totalCredits += credits;
                                  }
                                });

                                return totalCredits > 0 ? (totalGradePoints / totalCredits).toFixed(2) : '0.00';
                              })()}
                            </td>
                          </tr>
                        </tfoot>
                      </table>
                      </div>
                    </div>);

              })}
              </div>
            }
            <div className="mt-4 flex items-center justify-end gap-2 border-t pt-4">
              <Button
                className="h-9 px-4 text-sm font-semibold bg-primary text-white border-primary hover:bg-primary/90"
                onClick={handleSave}
                disabled={saving || upload?.is_published}
              >
                {saving ? 'Saving...' : 'Save Marks'}
              </Button>
              {upload?.is_published && (
                <Button
                  onClick={() => setUnpublishModalOpen(true)}
                  className={`flex items-center justify-center gap-1 text-sm font-medium px-3 py-1.5 rounded-md transition border ${theme === 'dark' ? 'border-red-500 text-red-400 bg-red-500/10 hover:bg-red-500/20' : 'border-red-500 text-red-700 bg-red-50 hover:bg-red-100'}`}
                >
                  Unpublish
                </Button>
              )}
            </div>
          </div>
        </CardContent>

          {studentsPagination && studentsPagination.count > studentsPageSize && (
            <CardFooter className="flex flex-col sm:flex-row justify-between items-center gap-4 text-sm text-muted-foreground px-6 py-4 border-t border-border mt-auto">
              <div className="text-sm text-muted-foreground text-center sm:text-left">
                {studentsPagination?.count > 0 ?
                  `Showing ${(studentsPage - 1) * studentsPageSize + 1} to ${Math.min(studentsPage * studentsPageSize, studentsPagination?.count || 0)} of ${studentsPagination?.count || 0} students` :
                  `Showing 0 students`}
              </div>
              
              <div className="flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto">
                <div className="flex items-center gap-2 w-full sm:w-auto justify-center">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      if (!upload) return;
                      navigateToPage(Math.max(1, studentsPage - 1));
                    }}
                    disabled={studentsPage === 1}
                    className="bg-primary hover:bg-primary/90 text-white border-primary h-9 px-4 transition-all"
                  >
                    Prev
                  </Button>

                  <div className="flex items-center justify-center min-w-[2rem]">
                    <span className="text-sm font-semibold text-primary">
                      {studentsPage}
                    </span>
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      if (!upload) return;
                      navigateToPage(studentsPage + 1);
                    }}
                    disabled={!studentsPagination?.next}
                    className="bg-primary hover:bg-primary/90 text-white border-primary h-9 px-4 transition-all"
                  >
                    Next
                  </Button>
                </div>
              </div>
            </CardFooter>
          )}
          {/* Navigation confirmation modal */}
          <Dialog open={navModalOpen} onOpenChange={setNavModalOpen}>
            <DialogContent className={`max-w-xl ${theme === 'dark' ? 'bg-background text-foreground border-border' : 'bg-white text-gray-900 border-gray-200'}`}>
                <DialogHeader>
                  <div className="flex items-center gap-3">
                    <AlertTriangle className={`h-6 w-6 ${theme === 'dark' ? 'text-amber-300' : 'text-amber-500'} animate-pulse`} />
                    <DialogTitle className={theme === 'dark' ? 'text-foreground text-lg' : 'text-gray-900 text-lg'}>Unsaved changes</DialogTitle>
                  </div>
                  <DialogDescription className={`mt-2 ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-700'}`}>
                    You have unsaved changes on this page. Save before navigating to avoid losing edits.
                  </DialogDescription>
                </DialogHeader>
                <div className="mt-6 flex justify-end">
                  <Button variant="ghost" onClick={() => {setNavModalOpen(false);setPendingNav(null);}}>Cancel</Button>
                  <button className={`ml-3 px-4 py-2 rounded border ${theme === 'dark' ? 'border-amber-400 text-amber-200 bg-amber-900/10 hover:bg-amber-900/20' : 'border-amber-300 text-amber-700 bg-amber-50 hover:bg-amber-100'}`} onClick={() => confirmNavSave(false)}>Continue without saving</button>
                  <Button className="ml-3" onClick={() => confirmNavSave(true)}>Save and continue</Button>
                </div>
              </DialogContent>
          </Dialog>
      {/* Publish confirmation modal when incomplete marks present */}
      <Dialog open={publishModalOpen} onOpenChange={setPublishModalOpen}>
        <DialogContent className={`max-w-md ${theme === 'dark' ? 'bg-background text-foreground border-border' : 'bg-white text-gray-900 border-gray-200'}`}>
            <DialogHeader>
              <div className="flex items-center gap-3">
                <AlertTriangle className={`h-6 w-6 ${theme === 'dark' ? 'text-amber-300' : 'text-amber-500'} animate-pulse`} />
                <DialogTitle className={theme === 'dark' ? 'text-foreground text-lg' : 'text-gray-900 text-lg'}>Confirm Publish</DialogTitle>
              </div>
              <DialogDescription className={`mt-2 ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-700'}`}>
                <div className="mb-2">Once published, results cannot be edited. This action is irreversible.</div>
                <div>Some students may have incomplete marks. You can continue to publish and those will be treated as incomplete/fail per rules.</div>
              </DialogDescription>
            </DialogHeader>
            <div className="mt-4 flex justify-end">
              <Button variant="ghost" onClick={() => setPublishModalOpen(false)}>Cancel</Button>
              <Button variant="destructive" className="ml-3" onClick={async () => {setPublishModalOpen(false);await handlePublish();}}>Confirm Publish</Button>
            </div>
        </DialogContent>
      </Dialog>
      {/* Unpublish confirmation modal (UI-only) */}
      <Dialog open={unpublishModalOpen} onOpenChange={setUnpublishModalOpen}>
        <DialogContent className={`max-w-md ${theme === 'dark' ? 'bg-background text-foreground border-border' : 'bg-white text-gray-900 border-gray-200'}`}>
          <DialogHeader>
            <div className="flex items-center gap-3">
              <AlertTriangle className={`h-6 w-6 ${theme === 'dark' ? 'text-rose-300' : 'text-rose-500'} animate-pulse`} />
              <DialogTitle className={theme === 'dark' ? 'text-foreground text-lg' : 'text-gray-900 text-lg'}>Confirm Unpublish</DialogTitle>
            </div>
            <DialogDescription className={`mt-2 ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-700'}`}>
              This will mark the upload as not published in the UI only. No backend changes will be made. The public link will still work until the backend `is_published` flag is changed.
            </DialogDescription>
          </DialogHeader>
          <div className="mt-4 flex justify-end">
            <Button variant="ghost" onClick={() => setUnpublishModalOpen(false)}>Cancel</Button>
            <Button className="ml-3" onClick={async () => {
                    setUnpublishModalOpen(false);
                    if (!upload) return;
                    const res = await unpublishUploadBatch(upload.id);
                    if (res.success) {
                      setUpload({ ...upload, is_published: false });
                      toast.success('Public link is now inactive.');
                    } else {
                      toast.error(res.message || 'Failed to unpublish');
                    }
                  }}>Confirm Unpublish</Button>
          </div>
        </DialogContent>
      </Dialog>
      {/* Import CIE Marks Modal */}
      <Dialog open={importCieModalOpen} onOpenChange={setImportCieModalOpen}>
        <DialogContent className={`max-w-md ${theme === 'dark' ? 'bg-background text-foreground border-border' : 'bg-white text-gray-900 border-gray-200'}`}>
          <DialogHeader>
            <DialogTitle>Import Internal Marks</DialogTitle>
            <DialogDescription className="mt-2 text-muted-foreground">
              This will pull the faculty-entered internal marks into this upload batch. Each IA is assumed to be out of 50 marks.
            </DialogDescription>
          </DialogHeader>
          <div className="mt-4 space-y-4">
            <div>
              <label className="block text-sm mb-1 font-medium">Calculation Rule</label>
              <Select value={cieCalculationRule} onValueChange={setCieCalculationRule}>
                <SelectTrigger className={theme === 'dark' ? 'bg-background border-border' : 'bg-white border-gray-300'}>
                  <SelectValue placeholder="Select calculation rule" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="average">Proportional Average (All IAs)</SelectItem>
                  <SelectItem value="best_2">Best 2 out of N</SelectItem>
                  <SelectItem value="best_3">Best 3 out of N</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-2">
                This rule determines how the final CIE out of 50 is calculated if the student wrote multiple IAs.
              </p>
            </div>
          </div>
          <div className="mt-6 flex justify-end">
            <Button variant="ghost" onClick={() => setImportCieModalOpen(false)}>Cancel</Button>
            <Button className="ml-3 bg-primary text-white" disabled={importingCie} onClick={handleImportCie}>
              {importingCie ? 'Importing...' : 'Confirm Import'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      {/* Import SEE Marks Modal */}
      <Dialog open={importSeeModalOpen} onOpenChange={setImportSeeModalOpen}>
        <DialogContent className={`max-w-md ${theme === 'dark' ? 'bg-background text-foreground border-border' : 'bg-white text-gray-900 border-gray-200'}`}>
          <DialogHeader>
            <DialogTitle>Import SEE Marks</DialogTitle>
            <DialogDescription className="mt-2 text-muted-foreground">
              This will pull the faculty-entered SEE marks into this upload batch. SEE marks evaluated out of 100 will be automatically scaled down to 50.
            </DialogDescription>
          </DialogHeader>
          <div className="mt-4 flex justify-end">
            <Button variant="outline" onClick={() => setImportSeeModalOpen(false)}>Cancel</Button>
            <Button className="ml-3 bg-primary text-white" disabled={importingSee} onClick={handleImportSee}>
              {importingSee ? 'Importing...' : 'Confirm Import'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
        </Card>
      }
    </div>);

});

PublishResults.displayName = 'PublishResults';

export default PublishResults;