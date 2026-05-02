import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useTheme } from '@/context/ThemeContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { AlertTriangle, Copy, ExternalLink } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { getFilterOptions, getSemesters, createResultUploadBatch, getStudentsForUpload, saveMarksForUpload, publishUploadBatch, unpublishUploadBatch, toggleWithholdResult } from '../../utils/coe_api';

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
  const [dirtyPages, setDirtyPages] = useState<Record<number, boolean>>({});
  const [navModalOpen, setNavModalOpen] = useState(false);
  const [pendingNav, setPendingNav] = useState<{ page: number; pageSize?: number } | null>(null);
  const [publishModalOpen, setPublishModalOpen] = useState(false);
  const [unpublishModalOpen, setUnpublishModalOpen] = useState(false);
  const { toast } = useToast();
  // marks for current page (kept for compatibility)
  const [marks, setMarks] = useState<Record<string, Record<string, { cie?: number | string | null; see?: number | string | null }>>>({});
  // persisted marks across pages keyed by student_id -> { usn, subs: { subjectId: {cie,see} }}
  const [allMarks, setAllMarks] = useState<Record<string, { usn: string; subs: Record<string, { cie?: number | string | null; see?: number | string | null }> }>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const opts = await getFilterOptions();
      setFilters(opts);
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
      console.error('Error fetching semesters:', error);
      setSemesters([]);
    }
  };

  const handleCreate = async () => {
    if (!selected.batch || !selected.branch || !selected.semester || !selected.exam_period) {
      toast({ variant: 'destructive', title: 'Missing filters', description: 'Select all filters before creating upload' });
      return;
    }
    const res = await createResultUploadBatch({ batch: String(selected.batch), branch: String(selected.branch), semester: String(selected.semester), exam_period: selected.exam_period });
    if (res.success) {
      setUpload(res.upload_batch);
      // fetch students (includes existing marks if present)
      await fetchStudentsPage(res.upload_batch.id, studentsPage, studentsPageSize);
    } else {
      toast({ variant: 'destructive', title: 'Error', description: res.message || 'Failed to create upload' });
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
          setUpload(res.upload_batch);
          await fetchStudentsPage(res.upload_batch.id, studentsPage, studentsPageSize);
        }
      } catch (e) {
        // ignore
      }
    })();
    return () => { mounted = false; };
  }, [selected.batch, selected.branch, selected.semester, selected.exam_period]);

  // Helper to fetch a specific students page and merge marks
  const fetchStudentsPage = async (uploadId: number, page?: number, pageSize?: number, overwriteExisting: boolean = false) => {
    const stu = await getStudentsForUpload(uploadId, page, pageSize);
    if (stu.success) {
      const studentList = stu.data?.students || [];
      setStudents(studentList);
      setStudentsPagination(stu.data?.pagination || null);
      setStudentsPage(page || 1);
      // mark this page as clean when freshly loaded
      setDirtyPages(prev => ({ ...(prev || {}), [page || 1]: false }));
      // merge marks into allMarks
      setAllMarks(prev => {
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
    setAllMarks(prev => {
      const next = { ...prev } as any;
      if (!next[sid]) next[sid] = { usn: usn, subs: {} };
      if (!next[sid].subs) next[sid].subs = {};
      next[sid].subs[subKey] = { ...(next[sid].subs[subKey] || {}), [field]: val };
      return next;
    });
    // keep compatibility marks for current page rendering
    setMarks(prev => {
      const p = { ...prev } as any;
      const sKey = sid;
      const subKey2 = subKey;
      if (!p[sKey]) p[sKey] = {};
      if (!p[sKey][subKey2]) p[sKey][subKey2] = {};
      p[sKey][subKey2][field] = val;
      return p;
    });
    // mark current page dirty when user edits
    setDirtyPages(prev => ({ ...(prev || {}), [studentsPage]: true }));
  };

  const handleSave = async () => {
    if (!upload) {
      toast({ variant: 'destructive', title: 'No upload', description: 'Create upload batch first' });
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
        const cieVal = (rawCie === null || rawCie === undefined || (typeof rawCie === 'string' && String(rawCie).trim() === '')) ? null : Number(rawCie);
        const seeVal = (rawSee === null || rawSee === undefined || (typeof rawSee === 'string' && String(rawSee).trim() === '')) ? null : Number(rawSee);
        payload.push({ usn: usn, subject_id: Number(subId), cie_marks: Number.isNaN(cieVal) ? null : cieVal, see_marks: Number.isNaN(seeVal) ? null : seeVal });
      });
    });
    setSaving(true);
    const res = await saveMarksForUpload(upload.id, payload);
    setSaving(false);
    if (res.success) {
      toast({ title: 'Saved', description: `Saved ${res.saved_count} records` });
      // clear dirty flags after a successful save
      setDirtyPages({});
      // Merge the saved payload into local cache so UI reflects confirmed values
      setAllMarks(prev => {
        const next = { ...(prev || {}) } as any;
        payload.forEach((rec: any) => {
          const sid = Object.keys(next).find(k => next[k].usn === rec.usn) || String(rec.usn);
          // if we can't find by usn in existing cache, try to find student by matching current students list
          let sidKey = sid;
          if (!next[sidKey]) {
            // fallback: if payload contains usn but no existing entry, attempt to find student_id from `students` on current page
            const found = (students || []).find(s => s.usn === rec.usn);
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
      setMarks(prev => {
        const next = { ...(prev || {}) } as any;
        payload.forEach((rec: any) => {
          const sid = String(rec.student_id || Object.keys(next).find(k => k === String(rec.student_id)) || (students.find(s => s.usn === rec.usn) ? String((students.find(s => s.usn === rec.usn) as any).student_id) : String(rec.student_id || rec.usn)));
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
      toast({ variant: 'destructive', title: 'Save failed', description: res.message || 'Failed saving' });
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
    await fetchStudentsPage(upload.id, targetPage, pageSize ?? studentsPageSize);
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
      setAllMarks(prev => {
        const next = { ...prev };
        (students || []).forEach((s: any) => {
          delete next[String(s.student_id)];
        });
        return next;
      });
      // mark current page clean
      setDirtyPages(prev => ({ ...(prev || {}), [studentsPage]: false }));
    }
    await fetchStudentsPage(upload.id, pendingNav.page, pendingNav.pageSize ?? studentsPageSize);
    setPendingNav(null);
  };

  const handlePublish = async () => {
    if (!upload) {
      toast({ variant: 'destructive', title: 'No upload', description: 'Create upload batch first' });
      return;
    }
    const res = await publishUploadBatch(upload.id);
    if (res.success) {
      toast({ title: 'Published', description: 'Published successfully' });
      // refresh upload info
      setUpload({ ...upload, is_published: true });
      // refresh students in case published_result_id/is_withheld changed after publish
      await fetchStudentsPage(upload.id, studentsPage, studentsPageSize);
    } else {
      toast({ variant: 'destructive', title: 'Publish failed', description: res.message || 'Publish failed' });
    }
  };

  const handleToggleWithhold = async (studentId: number, studentName: string, publishedResultId: number | null, currentWithheld: boolean) => {
    if (!publishedResultId) {
      toast({ variant: 'destructive', title: 'Cannot withhold', description: 'No published result found for this student' });
      return;
    }
    
    try {
      const res = await toggleWithholdResult(publishedResultId);
      if (res.success) {
        const actionText = res.withheld ? 'withheld' : 'released';
        toast({ title: 'Success', description: `Result ${actionText} for ${studentName}` });
        // Refresh students list to update withheld status
        if (upload) {
          await fetchStudentsPage(upload.id, studentsPage, studentsPageSize, true);
        }
      } else {
        toast({ variant: 'destructive', title: 'Failed to toggle withhold', description: res.message || 'Toggle failed' });
      }
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Error', description: e?.message || 'Failed to toggle withhold status' });
    }
  };

  return (
    <div ref={ref} className={`p-3 sm:p-4 lg:p-6 min-h-screen ${theme === 'dark' ? 'bg-background text-foreground' : 'bg-gray-50 text-gray-900'}`}>
      <h2 className={`text-xl sm:text-2xl lg:text-3xl font-bold mb-4 sm:mb-6 ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>
        Publish Exam Results
      </h2>

      <Card className={`${theme === 'dark' ? 'bg-card text-foreground border-border shadow-sm' : 'bg-white text-gray-900 border-gray-200 shadow-sm'} mb-4`}>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg sm:text-xl">Filter And Create Upload Batch</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-3 sm:gap-4">
        <div>
          <label htmlFor="publish-results-batch" className="block text-sm mb-1">Batch</label>
          <Select value={selected.batch} onValueChange={(v) => setSelected(s => ({ ...s, batch: v }))}>
            <SelectTrigger id="publish-results-batch" className={theme === 'dark' ? 'bg-background border-border' : 'bg-white border-gray-300'}>
              <SelectValue placeholder="Select batch" />
            </SelectTrigger>
            <SelectContent>
              {filters.batches.map((b: any) => <SelectItem key={b.id} value={String(b.id)}>{b.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <label htmlFor="publish-results-branch" className="block text-sm mb-1">Branch</label>
          <Select value={selected.branch} onValueChange={(v) => {
            setSelected(s => ({ ...s, branch: v, semester: '' }));
            fetchSemesters(v);
          }}>
            <SelectTrigger id="publish-results-branch" className={theme === 'dark' ? 'bg-background border-border' : 'bg-white border-gray-300'}>
              <SelectValue placeholder="Select branch" />
            </SelectTrigger>
            <SelectContent>
              {filters.branches.map((b: any) => <SelectItem key={b.id} value={String(b.id)}>{b.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <label htmlFor="publish-results-semester" className="block text-sm mb-1">Semester</label>
          <Select value={selected.semester} onValueChange={(v) => setSelected(s => ({ ...s, semester: v }))}>
            <SelectTrigger id="publish-results-semester" className={theme === 'dark' ? 'bg-background border-border' : 'bg-white border-gray-300'}>
              <SelectValue placeholder="Select semester" />
            </SelectTrigger>
            <SelectContent>
              {semesters.map((s: any) => (
                <SelectItem key={s.id} value={String(s.id)}>{s.number}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <label htmlFor="publish-results-exam-period" className="block text-sm mb-1">Exam Period</label>
          <Select value={selected.exam_period} onValueChange={(v) => setSelected(s => ({ ...s, exam_period: v }))}>
            <SelectTrigger id="publish-results-exam-period" className={theme === 'dark' ? 'bg-background border-border' : 'bg-white border-gray-300'}>
              <SelectValue placeholder="Exam period" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="june_july">June/July</SelectItem>
              <SelectItem value="nov_dec">Nov/Dec</SelectItem>
              <SelectItem value="jan_feb">Jan/Feb</SelectItem>
              <SelectItem value="apr_may">Apr/May</SelectItem>
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
        </CardContent>
      </Card>

      {upload && (
        <Card className={`${theme === 'dark' ? 'bg-card text-foreground border-border shadow-sm' : 'bg-white text-gray-900 border-gray-200 shadow-sm'} mb-4`}>
          <CardContent className="pt-5">
          <div className="text-sm sm:text-base flex items-center gap-2 flex-wrap">
            <span>Upload ID: <span className="font-semibold">{upload.id}</span></span>
            <span className="hidden sm:inline">|</span>
            <span>Token: <span className="font-mono">{upload.token}</span></span>
            <Button
              variant="outline"
              size="sm"
              className="h-7 px-2 text-xs ml-2"
              onClick={() => {
                const url = `${window.location.origin}/results/view/${upload.token}`;
                navigator.clipboard.writeText(url);
                toast({ title: 'Copied', description: 'Result link copied to clipboard' });
              }}
            >
              <Copy className="h-3 w-3 mr-1" /> Copy Link
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-7 px-2 text-xs"
              onClick={() => {
                window.open(`/results/view/${upload.token}`, '_blank');
              }}
            >
              <ExternalLink className="h-3 w-3 mr-1" /> Open Link
            </Button>
          </div>
          <div className="mt-3 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
            <div>Published: <span className={`font-medium ${upload.is_published ? 'text-green-600' : 'text-red-600'}`}>{upload.is_published ? 'Yes' : 'No'}</span></div>
            {upload.is_published ? (
              <Button onClick={() => setUnpublishModalOpen(true)} variant="secondary">Unpublish</Button>
            ) : (
              <Button className="bg-primary text-white border-primary hover:bg-primary/90 hover:border-primary/90" onClick={() => setPublishModalOpen(true)}>Publish Results</Button>
            )}
          </div>
          </CardContent>
        </Card>
      )}

      {students.length > 0 && (
        <Card className={`${theme === 'dark' ? 'bg-card text-foreground border-border shadow-sm' : 'bg-white text-gray-900 border-gray-200 shadow-sm'}`}>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg sm:text-xl">Student Marks Entry</CardTitle>
          </CardHeader>
          <CardContent>
        <div className="overflow-auto">
          <div className="flex items-center justify-between mb-3">
            <div className="text-sm text-muted-foreground">Showing {students.length} students</div>
            <div className="flex gap-3 items-center pr-1">
              {/* page size selector */}
              <div className="flex items-center gap-2 px-2 py-1 rounded-md">
                <label htmlFor="publish-results-page-size" className={`text-sm leading-none ${theme === 'dark' ? 'text-muted-foreground' : ''}`}>Page size</label>
                <Select
                  value={String(studentsPageSize)}
                  onValueChange={(v) => {
                    const size = Number(v);
                    setStudentsPageSize(size);
                    if (upload) navigateToPage(1, size);
                  }}
                >
                  <SelectTrigger id="publish-results-page-size" className={`w-20 h-9 px-3 ${theme === 'dark' ? 'bg-slate-800 text-white border-slate-700' : 'bg-white text-foreground border-gray-300'}`}>
                    <SelectValue placeholder="Size" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="10">10</SelectItem>
                    <SelectItem value="25">25</SelectItem>
                    <SelectItem value="50">50</SelectItem>
                    <SelectItem value="100">100</SelectItem>
                  </SelectContent>
                </Select>
              </div>

            
            </div>
          </div>
          <div className="space-y-4">
            {students.map((s) => {
              const studentMarks = (allMarks[String(s.student_id)]?.subs) || marks[String(s.student_id)] || {};
              // Consistent pass/fail rule used across this student row
              const meetsPassCriteria = (c: any, se: any, t: any) => {
                return (typeof c === 'number' && typeof se === 'number' && typeof t === 'number') && (c >= 20 && se >= 18 && t >= 40);
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
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <div className="font-medium">{s.name} <span className="text-sm text-muted-foreground">({s.usn})</span></div>
                      <div className="text-sm text-muted-foreground">Subjects: {(s.subjects || []).length} • Incomplete Entries: {incompleteCount}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      {s.is_withheld && (
                        <div className="text-xs bg-amber-100 text-amber-800 px-2 py-1 rounded border border-amber-300">
                          Withheld
                        </div>
                      )}
                      {upload?.is_published && (
                        <Button
                          size="sm"
                          variant={s.is_withheld ? "outline" : "destructive"}
                          onClick={async () => {
                            if (!s.published_result_id) {
                              toast({ variant: 'destructive', title: 'Not Ready', description: 'Published result ID not found yet. Please refresh student list.' });
                              return;
                            }
                            await handleToggleWithhold(s.student_id, s.name, s.published_result_id, s.is_withheld);
                          }}
                          className="text-xs"
                        >
                          {s.is_withheld ? "Release Result" : "Withhold Result"}
                        </Button>
                      )}
                    </div>
                  </div>

                  <div className="w-full overflow-x-auto">
                  <table className="table-auto w-full min-w-[980px] border-collapse">
                    <thead>
                      <tr>
                        <th className="border px-2 py-1 whitespace-nowrap">Subject Code</th>
                        <th className="border px-2 py-1 whitespace-nowrap">Subject Title</th>
                        <th className="border px-2 py-1 whitespace-nowrap">CIE</th>
                        <th className="border px-2 py-1 whitespace-nowrap">SEE</th>
                        <th className="border px-2 py-1 whitespace-nowrap">Total Marks</th>
                        <th className="border px-2 py-1 whitespace-nowrap">Result</th>
                        <th className="border px-2 py-1 whitespace-nowrap">Grade</th>
                        <th className="border px-2 py-1 whitespace-nowrap">Grade Point</th>
                        <th className="border px-2 py-1 whitespace-nowrap">Credits Assigned</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(s.subjects || []).map((sub: any) => {
                        const entry = studentMarks[String(sub.id)];
                        const cie = entry?.cie ?? '';
                        const see = entry?.see ?? '';
                        const total = (typeof cie === 'number' && typeof see === 'number') ? (cie + see) : '';
                        const displayTotal = total;
                        const result = displayTotal === '' ? 'Incomplete' : (meetsPassCriteria(cie, see, total) ? 'Pass' : 'Fail');
                        
                        // Calculate grade based on total marks (assuming 100 max)
                        let grade = '';
                        let gradePoints = '';
                        if (typeof total === 'number') {
                          if (total >= 90) { grade = 'S'; gradePoints = '10'; }
                          else if (total >= 80) { grade = 'A'; gradePoints = '9'; }
                          else if (total >= 70) { grade = 'B'; gradePoints = '8'; }
                          else if (total >= 60) { grade = 'C'; gradePoints = '7'; }
                          else if (total >= 50) { grade = 'D'; gradePoints = '6'; }
                          else if (total >= 40) { grade = 'E'; gradePoints = '5'; }
                          else { grade = 'F'; gradePoints = '0'; }
                        }
                        
                        return (
                          <tr key={sub.id}>
                            <td className="border px-2 py-1">{sub.code}</td>
                            <td className="border px-2 py-1">{sub.name}</td>
                            <td className={`border px-2 py-1`}><Input disabled={upload?.is_published} className="w-20" type="number" min={0} max={50} value={cie} onChange={(e: any) => handleInput(s.student_id, s.usn, sub.id, 'cie', e.target.value)} onWheel={(e:any) => e.currentTarget.blur()} /></td>
                            <td className={`border px-2 py-1`}><Input disabled={upload?.is_published} className="w-20" type="number" min={0} max={50} value={see} onChange={(e: any) => handleInput(s.student_id, s.usn, sub.id, 'see', e.target.value)} onWheel={(e:any) => e.currentTarget.blur()} /></td>
                            <td className="border px-2 py-1">{displayTotal}</td>
                            <td className={`border px-2 py-1 ${result === 'Pass' ? 'text-green-600' : result === 'Fail' ? 'text-red-600' : 'text-yellow-600'}`}>{result}</td>
                            <td className="border px-2 py-1">{grade}</td>
                            <td className="border px-2 py-1">{gradePoints}</td>
                            <td className="border px-2 py-1">{result === 'Pass' ? (sub.credits ?? 0) : (result === 'Fail' ? 0 : 'N/A')}</td>
                          </tr>
                        );
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
                            const total = (typeof cie === 'number' && typeof see === 'number') ? (cie + see) : null;
                            const passed = meetsPassCriteria(cie, see, total);
                            const creditsToAdd = passed ? (sub.credits || 0) : 0;
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
                            const total = (typeof cie === 'number' && typeof see === 'number') ? (cie + see) : 0;
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
                              const total = (typeof cie === 'number' && typeof see === 'number') ? (cie + see) : null;
                              const credits = sub.credits || 0;
                              const passed = meetsPassCriteria(cie, see, total);

                              if (typeof total === 'number' && credits > 0 && passed) {
                                let gradePoints = 0;
                                if (total >= 90) gradePoints = 10;
                                else if (total >= 80) gradePoints = 9;
                                else if (total >= 70) gradePoints = 8;
                                else if (total >= 60) gradePoints = 7;
                                else if (total >= 50) gradePoints = 6;
                                else if (total >= 40) gradePoints = 5;
                                else gradePoints = 0;

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
                </div>
              );
            })}
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <div className="flex items-center gap-3 mr-auto">
              <button className="px-3 py-1 rounded border text-sm bg-primary text-white border-primary hover:bg-primary/90 hover:border-primary/90 disabled:opacity-50" disabled={studentsPage <= 1} onClick={() => {
                if (!upload) return;
                navigateToPage(Math.max(1, studentsPage - 1));
              }}>Previous</button>

              {/* page numbers (windowed) */}
              {(() => {
                const totalPages = studentsPagination?.count ? Math.max(1, Math.ceil(studentsPagination.count / studentsPageSize)) : 1;
                const maxButtons = 20;
                let start = 1, end = totalPages;
                if (totalPages > maxButtons) {
                  const half = Math.floor(maxButtons / 2);
                  start = Math.max(1, studentsPage - half);
                  end = Math.min(totalPages, start + maxButtons - 1);
                  if (end - start < maxButtons - 1) start = Math.max(1, end - maxButtons + 1);
                }
                const pages = [];
                for (let p = start; p <= end; p++) pages.push(p);
                return (
                  <div className="flex gap-1">
                      {pages.map(p => (
                        <button
                          key={p}
                          className={`px-2 py-1 rounded border text-xs ${p === studentsPage ? (theme === 'dark' ? 'bg-slate-700 border-slate-600 text-white' : 'bg-white border-primary text-primary') : (theme === 'dark' ? 'bg-slate-800 border-slate-700 text-muted-foreground' : 'bg-white border-gray-300 text-gray-700')}`}
                          onClick={() => upload && navigateToPage(p)}
                        >{p}</button>
                    ))}
                  </div>
                );
              })()}

              <button className="px-3 py-1 rounded border text-sm bg-primary text-white border-primary hover:bg-primary/90 hover:border-primary/90 disabled:opacity-50" disabled={!studentsPagination?.next} onClick={() => {
                if (!upload) return;
                navigateToPage(studentsPage + 1);
              }}>Next</button>
            </div>

            <Button className="bg-primary text-white border-primary hover:bg-primary/90 hover:border-primary/90" onClick={handleSave} disabled={saving || upload?.is_published}>{saving ? 'Saving...' : 'Save Marks'}</Button>
            {upload?.is_published && (
              <Button onClick={() => setUnpublishModalOpen(true)} variant="destructive">Unpublish</Button>
            )}
          </div>
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
                  <Button variant="ghost" onClick={() => { setNavModalOpen(false); setPendingNav(null); }}>Cancel</Button>
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
              <Button variant="destructive" className="ml-3" onClick={async () => { setPublishModalOpen(false); await handlePublish(); }}>Confirm Publish</Button>
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
                toast({ title: 'Unpublished', description: 'Public link is now inactive.' });
              } else {
                toast({ variant: 'destructive', title: 'Unpublish failed', description: res.message || 'Failed to unpublish' });
              }
            }}>Confirm Unpublish</Button>
          </div>
        </DialogContent>
      </Dialog>
        </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
});

PublishResults.displayName = 'PublishResults';

export default PublishResults;