import { translateTerminology, getTerm } from "@/utils/institutionConfig";
import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardFooter, CardDescription } from '@/components/ui/card';
import { useTheme } from '@/context/ThemeContext';
import { paginationToUI } from '@/utils/paginationToUI';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { AlertTriangle, Copy, ExternalLink, Search, Settings, Loader2, Check } from 'lucide-react';
import { toast } from 'sonner';
import { getFilterOptions, getSemesters, createResultUploadBatch, getStudentsForRevalMakeupUpload, saveMarksForUpload, publishUploadBatch, unpublishUploadBatch, toggleWithholdResult, updateOrgPassingCriteria } from '../../utils/coe_api';
import { showWarningAlert } from '../../utils/sweetalert';

const PublishResultsRevalMakeup = React.forwardRef<HTMLDivElement>((_, ref) => {
  const { theme } = useTheme();
  const [filters, setFilters] = useState<any>({ batches: [], branches: [] });
  const [semesters, setSemesters] = useState<any[]>([]);
  const [selected, setSelected] = useState<any>({ batch: '', branch: '', semester: '', exam_period: '', request_type: '' });
  const [upload, setUpload] = useState<any>(null);
  const [creatingUpload, setCreatingUpload] = useState(false);
  const [students, setStudents] = useState<any[]>([]);
  const [studentsPage, setStudentsPage] = useState(1);
  const [studentsPageSize, setStudentsPageSize] = useState(25);
  const [studentsPagination, setStudentsPagination] = useState<any>(null);
  const [dirtyPages, setDirtyPages] = useState<Record<number, boolean>>({});
  const [navModalOpen, setNavModalOpen] = useState(false);
  const [pendingNav, setPendingNav] = useState<{page: number;pageSize?: number;} | null>(null);
  const [publishModalOpen, setPublishModalOpen] = useState(false);
  const [unpublishModalOpen, setUnpublishModalOpen] = useState(false);
  const [settingsModalOpen, setSettingsModalOpen] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);
  const [orgPassCriteria, setOrgPassCriteria] = useState<{pass_cie_percent: number, pass_see_percent: number, pass_total_percent: number}>({pass_cie_percent: 40, pass_see_percent: 36, pass_total_percent: 40});
  const [marks, setMarks] = useState<Record<string, Record<string, {cie?: number | string | null;see?: number | string | null;}>>>({});
  const [allMarks, setAllMarks] = useState<Record<string, {usn: string;subs: Record<string, {cie?: number | string | null;see?: number | string | null;}>;}>>({});
  const [saving, setSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
  const [isBranchOpen, setIsBranchOpen] = useState(false);
  const [isSemesterOpen, setIsSemesterOpen] = useState(false);
  const [isExamPeriodOpen, setIsExamPeriodOpen] = useState(false);
  const [isRequestTypeOpen, setIsRequestTypeOpen] = useState(false);

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
  }, [debouncedSearchQuery, upload?.id, selected.request_type]);

  useEffect(() => {
    (async () => {
      const opts = await getFilterOptions();
      setFilters(opts);
      if (opts.org_pass_criteria) {
        setOrgPassCriteria(opts.org_pass_criteria);
      }
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
    if (!selected.batch || !selected.branch || !selected.semester || !selected.exam_period || !selected.request_type || selected.request_type === 'all') {
      toast.error('Select all filters including Request Type before creating upload');
      return;
    }
    try {
      setCreatingUpload(true);
      const res = await createResultUploadBatch({ batch: String(selected.batch), branch: String(selected.branch), semester: String(selected.semester), exam_period: selected.exam_period });
      if (res.success) {
        setSearchQuery('');
        setUpload(res.upload_batch);
        toast.success('Upload batch initialized successfully');
        setTimeout(() => {
          document.getElementById('coe-reval-upload-batch-details')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 150);
      } else {
        toast.error(res.message || 'Failed to create upload');
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to create upload');
    } finally {
      setCreatingUpload(false);
    }
  };

  useEffect(() => {
    let mounted = true;
    (async () => {
      if (!selected.batch || !selected.branch || !selected.semester || !selected.exam_period || !selected.request_type || selected.request_type === 'all') return;
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
  }, [selected.batch, selected.branch, selected.semester, selected.exam_period, selected.request_type]);

  const fetchStudentsPage = async (uploadId: number, page?: number, pageSize?: number, overwriteExisting: boolean = false, searchStr?: string) => {
    const queryStr = searchStr !== undefined ? searchStr : debouncedSearchQuery;
    const stu = await getStudentsForRevalMakeupUpload(uploadId, page, pageSize, selected.request_type === 'all' ? undefined : selected.request_type, queryStr);
    if (stu.success) {
      const studentList = stu.data?.students || [];
      setStudents(studentList);
      if (stu.data?.org_pass_criteria) {
        setOrgPassCriteria(stu.data.org_pass_criteria);
      }
      setStudentsPagination(stu.pagination || null);
      setStudentsPage(page || 1);
      setDirtyPages((prev) => ({ ...(prev || {}), [page || 1]: false }));
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

  const handleInput = (studentId: number, usn: string, subjectId: number, field: 'cie' | 'see', value: string, maxVal: number) => {
    const sid = String(studentId);
    const subKey = String(subjectId);
    const sanitize = (v: string) => {
      if (v === null || v === undefined) return '';
      const trimmed = String(v).trim();
      if (trimmed === '') return '';
      if (!/^-?\d+$/.test(trimmed)) return null;
      const n = Number(trimmed);
      if (Number.isNaN(n)) return null;
      return Math.floor(n);
    };
    const candidate = sanitize(value);
    if (candidate === null) return;
    // enforce bounds as-you-type: reject changes that go outside 0..maxVal
    if (typeof candidate === 'number' && (candidate > maxVal || candidate < 0)) {
      return; // do not update state, preventing typing >maxVal or <0
    }
    const val = candidate;
    setAllMarks((prev) => {
      const next = { ...prev } as any;
      if (!next[sid]) next[sid] = { usn: usn, subs: {} };
      if (!next[sid].subs) next[sid].subs = {};
      next[sid].subs[subKey] = { ...(next[sid].subs[subKey] || {}), [field]: val };
      return next;
    });
    setMarks((prev) => {
      const p = { ...prev } as any;
      const sKey = sid;
      const subKey2 = subKey;
      if (!p[sKey]) p[sKey] = {};
      if (!p[sKey][subKey2]) p[sKey][subKey2] = {};
      p[sKey][subKey2][field] = val;
      return p;
    });
    setDirtyPages((prev) => ({ ...(prev || {}), [studentsPage]: true }));
  };

  const handleSave = async () => {
    if (!upload) {
      toast.error('Create upload batch first');
      return false;
    }
    const payload: any[] = [];
    const missingUsns = new Set<string>();

    Object.entries(allMarks).forEach(([sid, data]) => {
      const usn = data.usn;
      const subs = data.subs || {};
      Object.entries(subs).forEach(([subId, marksObj]) => {
        const rawCie = (marksObj as any).cie;
        const rawSee = (marksObj as any).see;
        const cieVal = rawCie === null || rawCie === undefined || typeof rawCie === 'string' && String(rawCie).trim() === '' ? null : Number(rawCie);
        const seeVal = rawSee === null || rawSee === undefined || typeof rawSee === 'string' && String(rawSee).trim() === '' ? null : Number(rawSee);
        
        const parsedCie = Number.isNaN(cieVal) ? null : cieVal;
        const parsedSee = Number.isNaN(seeVal) ? null : seeVal;

        if ((parsedCie !== null && parsedSee === null) || (parsedCie === null && parsedSee !== null)) {
          missingUsns.add(usn);
        }

        payload.push({ usn: usn, subject_id: Number(subId), cie_marks: parsedCie, see_marks: parsedSee });
      });
    });

    if (missingUsns.size > 0) {
      const usnList = Array.from(missingUsns).join(', ');
      await showWarningAlert("Incomplete Marks", `Please ensure both CIE and SEE marks are entered for the following students before saving: ${usnList}`);
      return false;
    }
    setSaving(true);
    const res = await saveMarksForUpload(upload.id, payload);
    setSaving(false);
    if (res.success) {
      toast.success(`Saved ${res.saved_count} records`);
      setDirtyPages({});
      setAllMarks((prev) => {
        const next = { ...(prev || {}) } as any;
        payload.forEach((rec: any) => {
          const sid = Object.keys(next).find((k) => next[k].usn === rec.usn) || String(rec.usn);
          let sidKey = sid;
          if (!next[sidKey]) {
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
      if (!ok) return;
    }
    if (!saveFirst) {
      setAllMarks((prev) => {
        const next = { ...prev };
        (students || []).forEach((s: any) => {
          delete next[String(s.student_id)];
        });
        return next;
      });
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
      setUpload({ ...upload, is_published: true });
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

  return (
    <div ref={ref} id="coe-publish-results-reval-makeup-container" className={`${theme === 'dark' ? 'bg-background text-foreground' : 'bg-gray-50 text-gray-900'}`}>
      <Card id="coe-publish-results-reval-makeup-filters" className={`${theme === 'dark' ? 'bg-card text-foreground border-border shadow-sm' : 'bg-white text-gray-900 border-gray-200 shadow-sm'} mb-4`}>
        <CardHeader className="border-b pb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between items-start gap-3 sm:gap-4 space-y-0">
          <div className="flex flex-col">
            <CardTitle className="text-xl sm:text-2xl font-semibold">Publish Results (Reval/Makeup)</CardTitle>
            <CardDescription className="text-sm text-muted-foreground mt-1">Filter students and create exam result upload batches.</CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={() => setSettingsModalOpen(true)} className="flex items-center gap-2 w-full sm:w-auto justify-center">
            <Settings className="w-4 h-4" />
            Passing Criteria
          </Button>
        </CardHeader>
        <CardContent className="pt-4 sm:pt-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-6 gap-3 sm:gap-4">
        <div>
          <label htmlFor="reval-batch" className="block text-sm mb-1">Batch</label>
          <Select value={selected.batch} onValueChange={(v) => {
            setSelected((s) => ({ ...s, batch: v }));
            setTimeout(() => setIsBranchOpen(true), 150);
          }}>
            <SelectTrigger id="reval-batch" className={theme === 'dark' ? 'bg-background border-border' : 'bg-white border-gray-300'}>
              <SelectValue placeholder="Select batch" />
            </SelectTrigger>
            <SelectContent>
              {filters.batches && filters.batches.length > 0 ? (
                filters.batches.map((b: any) => <SelectItem key={b.id} value={String(b.id)}>{b.name}</SelectItem>)
              ) : (
                <SelectItem value="none" disabled>No batches found</SelectItem>
              )}
            </SelectContent>
          </Select>
        </div>
        <div>
          <label htmlFor="reval-branch" className="block text-sm mb-1">{translateTerminology("Branch")}</label>
          <Select value={selected.branch} onValueChange={(v) => {
            setSelected((s) => ({ ...s, branch: v, semester: '' }));
            fetchSemesters(v);
            setTimeout(() => setIsSemesterOpen(true), 150);
          }} open={isBranchOpen} onOpenChange={setIsBranchOpen} disabled={!selected.batch}>
            <SelectTrigger id="reval-branch" className={theme === 'dark' ? 'bg-background border-border' : 'bg-white border-gray-300'}>
              <SelectValue placeholder="Select branch" />
            </SelectTrigger>
            <SelectContent>
              {filters.branches && filters.branches.length > 0 ? (
                filters.branches.map((b: any) => <SelectItem key={b.id} value={String(b.id)}>{b.name}</SelectItem>)
              ) : (
                <SelectItem value="none" disabled>No branches found</SelectItem>
              )}
            </SelectContent>
          </Select>
        </div>
        <div>
          <label htmlFor="reval-semester" className="block text-sm mb-1">{translateTerminology("Semester")}</label>
          <Select value={selected.semester} onValueChange={(v) => {
            setSelected((s) => ({ ...s, semester: v }));
            setTimeout(() => setIsExamPeriodOpen(true), 150);
          }} open={isSemesterOpen} onOpenChange={setIsSemesterOpen} disabled={!selected.branch}>
            <SelectTrigger id="reval-semester" className={theme === 'dark' ? 'bg-background border-border' : 'bg-white border-gray-300'}>
              <SelectValue placeholder="Select semester" />
            </SelectTrigger>
            <SelectContent>
              {semesters && semesters.length > 0 ? (
                semesters.map((s: any) => <SelectItem key={s.id} value={String(s.id)}>{s.number}</SelectItem>)
              ) : (
                <SelectItem value="none" disabled>No semesters found</SelectItem>
              )}
            </SelectContent>
          </Select>
        </div>
        <div>
          <label htmlFor="reval-exam-period" className="block text-sm mb-1">Exam Period</label>
          <Select value={selected.exam_period} onValueChange={(v) => {
            setSelected((s) => ({ ...s, exam_period: v }));
            setTimeout(() => setIsRequestTypeOpen(true), 150);
          }} open={isExamPeriodOpen} onOpenChange={setIsExamPeriodOpen} disabled={!selected.semester}>
            <SelectTrigger id="reval-exam-period" className={theme === 'dark' ? 'bg-background border-border' : 'bg-white border-gray-300'}>
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
        <div>
          <label htmlFor="reval-request-type" className="block text-sm mb-1">Request Type</label>
          <Select value={selected.request_type} onValueChange={(v) => setSelected((s) => ({ ...s, request_type: v }))} open={isRequestTypeOpen} onOpenChange={setIsRequestTypeOpen} disabled={!selected.exam_period}>
            <SelectTrigger id="reval-request-type" className={theme === 'dark' ? 'bg-background border-border' : 'bg-white border-gray-300'}>
              <SelectValue placeholder="Request type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="revaluation">Revaluation</SelectItem>
              <SelectItem value="makeup">Makeup</SelectItem>
              <SelectItem value="supplementary">Supplementary</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-end">
          <Button
                disabled={creatingUpload || !!upload}
                onClick={handleCreate}
                className={upload ? "w-full bg-emerald-600/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 font-semibold cursor-not-allowed opacity-100" : "w-full bg-primary text-white border-primary hover:bg-primary/90 hover:border-primary/90"}>
                
            {creatingUpload ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin mr-2 inline-block" />
                Creating Batch...
              </>
            ) : upload ? (
              <>
                <Check className="w-4 h-4 mr-1.5 inline-block text-emerald-600 dark:text-emerald-400" />
                Batch Created
              </>
            ) : (
              "Create Upload Batch"
            )}
          </Button>
        </div>
      </div>
        </CardContent>
      </Card>

      {upload &&
      <Card id="coe-reval-upload-batch-details" className={`${theme === 'dark' ? 'bg-card text-foreground border-border shadow-sm' : 'bg-white text-gray-900 border-gray-200 shadow-sm'} mb-4 transition-all duration-300 scroll-mt-6`}>
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
                        const type = selected.request_type && selected.request_type !== 'all' ? selected.request_type : 'revaluation';
                        const url = `${window.location.origin}/results/view/${upload.token}?type=${type}`;
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
                        const type = selected.request_type && selected.request_type !== 'all' ? selected.request_type : 'revaluation';
                        window.open(`/results/view/${upload.token}?type=${type}`, '_blank');
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
                  <Button className="w-full sm:w-auto h-9 bg-primary text-white border-primary hover:bg-primary/90 hover:border-primary/90" onClick={() => setPublishModalOpen(true)}>Publish Results</Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      }

      {!selected.batch || !selected.branch || !selected.semester || !selected.exam_period || !selected.request_type || selected.request_type === 'all' ?
      <Card className="border-dashed border-2 shadow-none bg-transparent">
            <CardContent className="flex flex-col items-center justify-center py-24 text-center">
              <div className="bg-primary/5 p-6 rounded-full mb-4">
                <Search className="w-12 h-12 text-primary/40" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Select filters to publish results</h3>
              <p className="text-muted-foreground max-w-sm mx-auto">
                Please select a batch, branch, semester, exam period, and request type from the dropdowns above to load the student list and entry form.
              </p>
            </CardContent>
         </Card> :
      upload &&
      <Card className={`${theme === 'dark' ? 'bg-card text-foreground border-border shadow-sm' : 'bg-white text-gray-900 border-gray-200 shadow-sm'}`}>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg sm:text-xl">Student Marks Entry</CardTitle>
            <div className="mt-2 text-sm bg-blue-50 text-blue-800 dark:bg-blue-900/30 dark:text-blue-200 p-3 rounded-md border border-blue-200 dark:border-blue-800/50 flex items-start gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mt-0.5 shrink-0"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>
              <div>
                <strong>Standard Passing Criteria Applied:</strong> Students must secure at least <strong>{orgPassCriteria.pass_cie_percent}% in CIE</strong>, <strong>{orgPassCriteria.pass_see_percent}% in SEE</strong>, and <strong>{orgPassCriteria.pass_total_percent}% in Total Aggregate</strong> of the subject's maximum marks to pass. Grades are awarded based on total percentage.
                <button onClick={() => setSettingsModalOpen(true)} className="ml-2 text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 underline underline-offset-2 font-medium transition-colors cursor-pointer">
                  Edit Criteria
                </button>
              </div>
            </div>
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
            <div className="flex items-center justify-between mb-3">
            <div className="text-sm text-muted-foreground">Showing {students.length} students</div>
            <div className="flex gap-3 items-center pr-1">
            </div>
          </div>
          {students.length === 0 && (
            <div className="py-8 text-center text-muted-foreground">
              No students found for this selection or search query.
            </div>
          )}
          <div className="space-y-4">
            {students.map((s) => {
              const studentMarks = allMarks[String(s.student_id)]?.subs || marks[String(s.student_id)] || {};
              const meetsPassCriteria = (c: any, se: any, t: any, maxCie: number, maxSee: number) => {
                const cieVal = c !== null && c !== undefined && c !== '' ? Number(c) : null;
                const seeVal = se !== null && se !== undefined && se !== '' ? Number(se) : null;
                const totalVal = t !== null && t !== undefined && t !== '' ? Number(t) : null;
                
                const minCie = maxCie * (orgPassCriteria.pass_cie_percent / 100);
                const minSee = maxSee * (orgPassCriteria.pass_see_percent / 100);
                const minTotal = (maxCie + maxSee) * (orgPassCriteria.pass_total_percent / 100);

                return cieVal !== null && seeVal !== null && totalVal !== null &&
                       !isNaN(cieVal) && !isNaN(seeVal) && !isNaN(totalVal) &&
                       cieVal >= minCie && seeVal >= minSee && totalVal >= minTotal;
              };
              const incompleteCount = (s.subjects || []).reduce((acc: number, sub: any) => {
                const e = studentMarks[String(sub.id)];
                const cie = e?.cie;
                const see = e?.see;
                if (cie === null || cie === undefined || see === null || see === undefined || cie === '' || see === '') return acc + 1;
                return acc;
              }, 0);

              return (
                <div key={s.student_id} className={`border rounded-md p-3 ${theme === 'dark' ? 'border-border bg-background/40' : 'border-gray-200 bg-white'}`}>
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
                            let publishedResultId = s.published_result_id;
                            let currentWithheld = s.is_withheld;

                            // Retry once after refreshing current page if the id is not yet present.
                            if (!publishedResultId && upload) {
                              const refreshed = await getStudentsForRevalMakeupUpload(
                                upload.id,
                                studentsPage,
                                studentsPageSize,
                                selected.request_type === 'all' ? undefined : selected.request_type
                              );
                              const refreshedStudent = refreshed?.success ?
                              (refreshed.data?.students || []).find((st: any) => st.student_id === s.student_id) :
                              null;
                              if (refreshedStudent?.published_result_id) {
                                publishedResultId = refreshedStudent.published_result_id;
                                currentWithheld = !!refreshedStudent.is_withheld;
                                await fetchStudentsPage(upload.id, studentsPage, studentsPageSize, true);
                              }
                            }

                            if (!publishedResultId) {
                              toast.error('Published result ID not found yet. Please refresh student list.');
                              return;
                            }

                            await handleToggleWithhold(s.student_id, s.name, publishedResultId, currentWithheld);
                          }}
                          className={`flex-1 sm:flex-none h-8 text-xs font-semibold rounded-md border ${theme === 'dark' ? 'border-red-500 text-red-400 bg-red-500/10 hover:bg-red-500/20' : 'border-red-500 text-red-700 bg-red-50 hover:bg-red-100'}`}
                        >
                          {s.is_withheld ? "Release Result" : "Withhold Result"}
                        </Button>
                      )}
                    </div>
                  </div>

                  <div className="w-full overflow-x-auto xl:overflow-x-visible custom-scrollbar">
                  <table className="min-w-[980px] md:min-w-[1100px] xl:min-w-0 xl:w-full border-collapse table-fixed text-xs sm:text-sm">
                    <colgroup>
                      <col className="w-[8%]" />
                      <col className="w-[13%]" />
                      <col className="w-[11%]" />
                      <col className="w-[10%]" />
                      <col className="w-[9%]" />
                      <col className="w-[9%]" />
                      <col className="w-[9%]" />
                      <col className="w-[6%]" />
                      <col className="w-[5%]" />
                      <col className="w-[9%]" />
                      <col className="w-[11%]" />
                    </colgroup>
                    <thead>
                      <tr>
                        <th className="border px-1.5 py-1">Subject Code</th>
                        <th className="border px-1.5 py-1">Subject Title</th>
                        <th className="border px-1.5 py-1">Request Types</th>
                        <th className="border px-1.5 py-1">Request Status</th>
                        <th className="border px-1.5 py-1">CIE</th>
                        <th className="border px-1.5 py-1">SEE</th>
                        <th className="border px-1.5 py-1">Total Marks</th>
                        <th className="border px-1.5 py-1">Result</th>
                        <th className="border px-1.5 py-1">Grade</th>
                        <th className="border px-1.5 py-1">Grade Point</th>
                        <th className="border px-1.5 py-1">Credits Assigned</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(s.subjects || []).map((sub: any) => {
                          const entry = studentMarks[String(sub.id)];
                          const cie = entry?.cie ?? '';
                          const see = entry?.see ?? '';
                          const maxCie = sub.max_cie_marks ?? 50;
                          const maxSee = sub.max_see_marks ?? 50;
                          const maxTotal = maxCie + maxSee;

                          const cieVal = cie !== null && cie !== undefined && cie !== '' ? Number(cie) : null;
                          const seeVal = see !== null && see !== undefined && see !== '' ? Number(see) : null;
                          const total = cieVal !== null && seeVal !== null && !isNaN(cieVal) && !isNaN(seeVal) ? cieVal + seeVal : '';
                          const displayTotal = total;
                          const result = displayTotal === '' ? 'Incomplete' : meetsPassCriteria(cie, see, total, maxCie, maxSee) ? 'Pass' : 'Fail';

                          let grade = '';
                          let gradePoints = '';

                          if (typeof total === 'number' && maxTotal > 0) {
                            const percentage = (total / maxTotal) * 100;
                            if (result === 'Fail') {
                              grade = 'F';
                              gradePoints = '0';
                            } else {
                              if (percentage >= 90) {grade = 'S';gradePoints = '10';} else
                              if (percentage >= 80) {grade = 'A';gradePoints = '9';} else
                              if (percentage >= 70) {grade = 'B';gradePoints = '8';} else
                              if (percentage >= 60) {grade = 'C';gradePoints = '7';} else
                              if (percentage >= 50) {grade = 'D';gradePoints = '6';} else
                              if (percentage >= 40) {grade = 'E';gradePoints = '5';} else
                              {grade = 'F';gradePoints = '0';}
                            }
                          }

                          return (
                            <tr key={sub.id}>
                            <td className="border px-1.5 py-1 align-top">{sub.code}</td>
                            <td className="border px-1.5 py-1 align-top truncate" title={sub.name}>{sub.name}</td>
                            <td className="border px-1.5 py-1 align-top">{sub.request_details?.types?.join(', ') || 'N/A'}</td>
                            <td className="border px-1.5 py-1 align-top">{sub.request_details?.status || 'N/A'}</td>
                            <td className={`border px-1.5 py-1 align-top`}><Input disabled={upload?.is_published} className="w-14 h-8 text-xs" type="number" min={0} max={sub.max_cie_marks ?? 50} value={cie} onChange={(e: any) => handleInput(s.student_id, s.usn, sub.id, 'cie', e.target.value, sub.max_cie_marks ?? 50)} onWheel={(e: any) => e.currentTarget.blur()} /></td>
                            <td className={`border px-1.5 py-1 align-top`}><Input disabled={upload?.is_published} className="w-14 h-8 text-xs" type="number" min={0} max={sub.max_see_marks ?? 50} value={see} onChange={(e: any) => handleInput(s.student_id, s.usn, sub.id, 'see', e.target.value, sub.max_see_marks ?? 50)} onWheel={(e: any) => e.currentTarget.blur()} /></td>
                            <td className="border px-1.5 py-1 align-top">{displayTotal}</td>
                            <td className={`border px-1.5 py-1 align-top ${result === 'Pass' ? 'text-green-600' : result === 'Fail' ? 'text-red-600' : 'text-yellow-600'}`}>{result}</td>
                            <td className="border px-1.5 py-1 align-top">{grade}</td>
                            <td className="border px-1.5 py-1 align-top">{gradePoints}</td>
                            <td className="border px-1.5 py-1 align-top">{result === 'Pass' ? sub.credits ?? 0 : result === 'Fail' ? 0 : 'N/A'}</td>
                          </tr>);

                        })}
                    </tbody>
                    <tfoot>
                      <tr>
                        <td colSpan={10} className="border px-2 py-1 font-semibold text-right">Total Credits Earned:</td>
                        <td className="border px-2 py-1 font-semibold">
                          {(s.subjects || []).reduce((acc: number, sub: any) => {
                              const entry = studentMarks[String(sub.id)];
                              const cie = entry?.cie;
                              const see = entry?.see;
                              const maxCie = sub.max_cie_marks ?? 50;
                              const maxSee = sub.max_see_marks ?? 50;
                              
                              const cieVal = cie !== null && cie !== undefined && cie !== '' ? Number(cie) : null;
                              const seeVal = see !== null && see !== undefined && see !== '' ? Number(see) : null;
                              const total = cieVal !== null && seeVal !== null && !isNaN(cieVal) && !isNaN(seeVal) ? cieVal + seeVal : null;
                              const passed = meetsPassCriteria(cie, see, total, maxCie, maxSee);
                              const creditsToAdd = passed ? Number(sub.credits ?? 0) : 0;
                              return acc + creditsToAdd;
                            }, 0)}
                        </td>
                      </tr>
                      <tr>
                        <td colSpan={10} className="border px-2 py-1 font-semibold text-right">Total Marks Obtained:</td>
                        <td className="border px-2 py-1 font-semibold">
                          {(s.subjects || []).reduce((acc: number, sub: any) => {
                              const entry = studentMarks[String(sub.id)];
                              const cie = entry?.cie;
                              const see = entry?.see;
                              const cieVal = cie !== null && cie !== undefined && cie !== '' ? Number(cie) : null;
                              const seeVal = see !== null && see !== undefined && see !== '' ? Number(see) : null;
                              const total = cieVal !== null && seeVal !== null && !isNaN(cieVal) && !isNaN(seeVal) ? cieVal + seeVal : 0;
                              return acc + (total !== null ? total : 0);
                            }, 0)}
                        </td>
                      </tr>
                      <tr>
                        <td colSpan={10} className="border px-2 py-1 font-semibold text-right">SGPA:</td>
                        <td className="border px-2 py-1 font-semibold">
                          {(() => {
                              const subjects = s.subjects || [];
                              let totalGradePoints = 0;
                              let totalCredits = 0;

                              subjects.forEach((sub: any) => {
                                const entry = studentMarks[String(sub.id)];
                                const cie = entry?.cie;
                                const see = entry?.see;
                                const cieVal = cie !== null && cie !== undefined && cie !== '' ? Number(cie) : null;
                                const seeVal = see !== null && see !== undefined && see !== '' ? Number(see) : null;
                                const total = cieVal !== null && seeVal !== null && !isNaN(cieVal) && !isNaN(seeVal) ? cieVal + seeVal : null;
                                const credits = Number(sub.credits ?? 0);
                                const maxCie = sub.max_cie_marks ?? 50;
                                const maxSee = sub.max_see_marks ?? 50;
                                const maxTotal = maxCie + maxSee;
                                const passed = meetsPassCriteria(cie, see, total, maxCie, maxSee);

                                if (typeof total === 'number' && credits > 0 && maxTotal > 0) {
                                  const percentage = (total / maxTotal) * 100;
                                  let gradePoints = 0;
                                  if (passed) {
                                    if (percentage >= 90) gradePoints = 10;else
                                    if (percentage >= 80) gradePoints = 9;else
                                    if (percentage >= 70) gradePoints = 8;else
                                    if (percentage >= 60) gradePoints = 7;else
                                    if (percentage >= 50) gradePoints = 6;else
                                    if (percentage >= 40) gradePoints = 5;else
                                    gradePoints = 0;
                                  }

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
            <div className="mt-4 flex items-center justify-end gap-2 border-t pt-4">
              <Button className="bg-primary hover:bg-primary/90 text-white border-primary h-9 px-4 transition-all" onClick={handleSave} disabled={saving || upload?.is_published}>{saving ? 'Saving...' : 'Save Marks'}</Button>
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
        </Card>
      }

      <Dialog open={navModalOpen} onOpenChange={setNavModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Unsaved Changes</DialogTitle>
            <DialogDescription>
              You have unsaved changes on this page. Do you want to save them before navigating?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => confirmNavSave(false)}>Discard</Button>
            <Button onClick={() => confirmNavSave(true)}>Save & Continue</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={publishModalOpen} onOpenChange={setPublishModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Publish Results</DialogTitle>
            <DialogDescription>
              <AlertTriangle className="inline mr-2" />
              Once published, results cannot be edited. This action is irreversible.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPublishModalOpen(false)}>Cancel</Button>
            <Button onClick={() => {setPublishModalOpen(false);handlePublish();}}>Publish</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={unpublishModalOpen} onOpenChange={setUnpublishModalOpen}>
        <DialogContent className={theme === 'dark' ? 'bg-card text-foreground border-border' : 'bg-white text-gray-900 border-gray-200'}>
          <DialogHeader>
            <DialogTitle className="text-red-600 flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Unpublish Results
            </DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="mb-4">Are you sure you want to unpublish these results? This will remove them from the student view.</p>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setUnpublishModalOpen(false)}>Cancel</Button>
              <Button variant="destructive" onClick={async () => {
                const res = await unpublishUploadBatch(upload!.id);
                if (res.success) {
                  toast.success('Unpublished successfully');
                  setUpload({ ...upload!, is_published: false });
                  setUnpublishModalOpen(false);
                } else {
                  toast.error(res.message || 'Unpublish failed');
                }
              }}>Yes, Unpublish</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Settings Modal */}
      <Dialog open={settingsModalOpen} onOpenChange={setSettingsModalOpen}>
        <DialogContent className={`max-w-md w-[90vw] sm:w-full rounded-xl ${theme === 'dark' ? 'bg-card text-foreground border-border' : 'bg-white text-gray-900 border-gray-200'}`}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Organization Passing Criteria
            </DialogTitle>
            <DialogDescription>
              Set the standard passing percentages for all subjects across the institution.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div>
              <label className="block text-sm mb-1 font-medium">Minimum CIE % to Pass</label>
              <div className="relative">
                <Input
                  type="number"
                  min={0}
                  max={100}
                  value={orgPassCriteria.pass_cie_percent}
                  onChange={(e) => {
                    let val = parseInt(e.target.value) || 0;
                    if (val > 100) val = 100;
                    setOrgPassCriteria(prev => ({ ...prev, pass_cie_percent: val }));
                  }}
                  className="pr-8"
                />
                <span className="absolute right-3 top-2.5 text-muted-foreground text-sm">%</span>
              </div>
            </div>
            <div>
              <label className="block text-sm mb-1 font-medium">Minimum SEE % to Pass</label>
              <div className="relative">
                <Input
                  type="number"
                  min={0}
                  max={100}
                  value={orgPassCriteria.pass_see_percent}
                  onChange={(e) => {
                    let val = parseInt(e.target.value) || 0;
                    if (val > 100) val = 100;
                    setOrgPassCriteria(prev => ({ ...prev, pass_see_percent: val }));
                  }}
                  className="pr-8"
                />
                <span className="absolute right-3 top-2.5 text-muted-foreground text-sm">%</span>
              </div>
            </div>
            <div>
              <label className="block text-sm mb-1 font-medium">Minimum Total % to Pass</label>
              <div className="relative">
                <Input
                  type="number"
                  min={0}
                  max={100}
                  value={orgPassCriteria.pass_total_percent}
                  onChange={(e) => {
                    let val = parseInt(e.target.value) || 0;
                    if (val > 100) val = 100;
                    setOrgPassCriteria(prev => ({ ...prev, pass_total_percent: val }));
                  }}
                  className="pr-8"
                />
                <span className="absolute right-3 top-2.5 text-muted-foreground text-sm">%</span>
              </div>
            </div>
          </div>
          <CardFooter className="px-0 pt-2 pb-0 flex justify-end gap-2 border-t mt-4">
            <Button variant="outline" onClick={() => setSettingsModalOpen(false)}>Cancel</Button>
            <Button 
              disabled={savingSettings}
              onClick={async () => {
                setSavingSettings(true);
                const res = await updateOrgPassingCriteria(orgPassCriteria.pass_cie_percent, orgPassCriteria.pass_see_percent, orgPassCriteria.pass_total_percent);
                setSavingSettings(false);
                if (res.success) {
                  toast.success('Passing criteria updated successfully');
                  setSettingsModalOpen(false);
                } else {
                  toast.error(res.message || 'Failed to update criteria');
                }
              }}
            >
              {savingSettings ? 'Saving...' : 'Save Settings'}
            </Button>
          </CardFooter>
        </DialogContent>
      </Dialog>
    </div>);

});

PublishResultsRevalMakeup.displayName = 'PublishResultsRevalMakeup';

export default PublishResultsRevalMakeup;