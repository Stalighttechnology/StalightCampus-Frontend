/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Button } from "../ui/button";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "../ui/select";
import { Checkbox } from "../ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "../ui/dialog";
import { SkeletonCard } from "../ui/skeleton";
import { manageStudents, getElectiveEnrollmentBootstrap } from "../../utils/hod_api";
import { useHODBootstrap } from "../../context/HODBootstrapContext";
import { useTheme } from "../../context/ThemeContext";
import { API_ENDPOINT } from "../../utils/config";
import { fetchWithTokenRefresh } from "../../utils/authService";
import { Loader2 } from "lucide-react";

const StudentEnrollment = () => {
  useHODBootstrap();
  const [branchId, setBranchId] = useState<string>("");
  const [semesters, setSemesters] = useState<any[]>([]);
  const [sectionsBySemester, setSectionsBySemester] = useState<Record<string, any[]>>({});
  const [semesterId, setSemesterId] = useState<string>("");
  const [sectionId, setSectionId] = useState<string>("");
  const [subjectType, setSubjectType] = useState<string>("");
  const [electiveSubjects, setElectiveSubjects] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>("");
  const [students, setStudents] = useState<any[]>([]);
  const [showEnrolledOnly, setShowEnrolledOnly] = useState<boolean>(false);
  // enrolledCount state removed (unused)
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const { theme } = useTheme();
  const [saving, setSaving] = useState(false);
  const [resultModalOpen, setResultModalOpen] = useState(false);
  const [resultData, setResultData] = useState<{ added: number; removed: number; failed: any[] }>({ added: 0, removed: 0, failed: [] });

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalStudents, setTotalStudents] = useState(0);
  // studentsPerPage removed (unused)

  // Elective subjects pagination state
  const [electivePage, setElectivePage] = useState(1);
  const [electiveTotalPages, setElectiveTotalPages] = useState(1);
  const [electiveLoading, setElectiveLoading] = useState(false);



  useEffect(() => {
    const loadBootstrap = async () => {
      try {
      const boot = await getElectiveEnrollmentBootstrap();
        if (boot.success && boot.data) {
          const bId = boot.data.profile?.branch_id;
          if (bId) setBranchId(String(bId));
          if (Array.isArray(boot.data.semesters)) setSemesters(boot.data.semesters.map((s: any) => ({ id: String(s.id), number: s.number })));
          if (Array.isArray(boot.data.sections)) {
            const map: Record<string, any[]> = {};
            boot.data.sections.forEach((sec: any) => {
              const semIdKey = String(sec.semester_id || "");
              if (!map[semIdKey]) map[semIdKey] = [];
              map[semIdKey].push({ ...sec, id: String(sec.id) });
            });
            setSectionsBySemester(map);
          }
          // Removed: elective_subjects loading - now loaded on demand
        }
      } catch (e) {
        console.error(e);
      }
    };
    loadBootstrap();
  }, []);

  useEffect(() => {
    const loadSubjects = async () => {
      if (!semesterId || !subjectType || !sectionId) return;
      setElectiveLoading(true);
      try {
        const params = new URLSearchParams({
          subject_type: subjectType,
          semester_id: semesterId,
          section_id: sectionId,
          page: electivePage.toString(),
          page_size: '20' // Load 20 subjects per page
        });

        const response = await fetchWithTokenRefresh(`${API_ENDPOINT}/hod/elective-enrollment-bootstrap/?${params}`, {
          method: "GET",
          headers: { "Content-Type": "application/json" },
        });

        const data = await response.json();
        if (data.success && data.data) {
          const newSubjects = (data.data.elective_subjects || []).map((s: any) => ({ ...s, id: String(s.id) }));
          if (electivePage === 1) {
            setElectiveSubjects(newSubjects);
          } else {
            setElectiveSubjects(prev => [...prev, ...newSubjects]);
          }
          setElectiveTotalPages(data.data.elective_pagination?.num_pages || 1);
        }
      } catch (e) {
        console.error('Error loading elective subjects:', e);
      }
      setElectiveLoading(false);
    };
    loadSubjects();
  }, [semesterId, subjectType, sectionId, electivePage]);

  // Reset elective subjects when semester or subject type changes
  useEffect(() => {
    setElectiveSubjects([]);
    setSubjects([]);
    setSelectedSubjectId("");
    setElectivePage(1);
    setElectiveTotalPages(1);
  }, [semesterId, subjectType]);
  // Reset when section changes as well
  useEffect(() => {
    setElectiveSubjects([]);
    setSubjects([]);
    setSelectedSubjectId("");
    setElectivePage(1);
    setElectiveTotalPages(1);
  }, [sectionId]);

  // Set subjects to the loaded elective subjects
  useEffect(() => {
    setSubjects(electiveSubjects);
  }, [electiveSubjects]);

  const loadStudents = async (page = 1, search?: string) => {
    if (!branchId || !selectedSubjectId) return;
    // Determine selected subject type to decide required params (open_elective vs regular)
    const selSub = subjects.find((s: any) => String(s.id) === String(selectedSubjectId));
    const selType = selSub ? (selSub.subject_type || selSub.subjectType || '') : '';

    // non-open electives require semester and section
    if (selType !== 'open_elective' && (!semesterId || !sectionId)) return;
    // open electives require semester at minimum (section optional for combined/branch modes)
    if (selType === 'open_elective' && !semesterId) return;

    setIsLoading(true);
    try {
      // Build params: always include branch and subject; include semester/section when provided
      const params = new URLSearchParams({
        branch_id: branchId,
        subject_id: selectedSubjectId,
        include_enrollment_status: 'true',
        page: page.toString(),
        page_size: '50'
      });
      if (search && String(search).trim().length > 0) params.set('search', String(search).trim());
      if (semesterId) params.set('semester_id', semesterId);
      if (sectionId) params.set('section_id', sectionId);

      const response = await fetchWithTokenRefresh(`${API_ENDPOINT}/hod/students/?${params}`, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      });

      const data = await response.json();

      if (!data.results) {
        throw new Error(data.message || "Failed to fetch students");
      }

      const mapped = data.results.map((s: any) => ({
        id: s.usn || s.student_id || s.id,
        usn: s.usn || s.student_id || s.id,
        name: s.name,
        checked: s.is_enrolled || false,
        originallyEnrolled: s.is_enrolled || false, // Store original state for change detection
      }));

      setStudents(mapped);
      setCurrentPage(page);
      setTotalPages(Math.ceil(data.count / 50));  // Fixed page size of 50
      setTotalStudents(data.count);

      // Reset enrolled count - derived when needed (removed state)
    } catch (e) {
      console.error(e);
    }
    setIsLoading(false);
  };

  // Automatically load students when selection changes
  useEffect(() => {
    if (branchId && selectedSubjectId) {
      loadStudents(1);
    }
  }, [branchId, selectedSubjectId, semesterId, sectionId]);

  const toggleStudent = (id: string) => {
    setStudents((prev) => prev.map((p) => (p.id === id ? { ...p, checked: !p.checked } : p)));
  };

  const save = async () => {
    if (students.length === 0) return;
    setSaving(true);
    try {
      // Determine changes based on original loaded state vs current checked state
      const toRegister = students.filter(s => s.checked && !s.originallyEnrolled).map(s => s.usn);
      const toUnregister = students.filter(s => !s.checked && s.originallyEnrolled).map(s => s.usn);

      let registeredCount = 0;
      let removedCount = 0;
      let failed: any[] = [];

      if (toRegister.length > 0) {
        const res = await manageStudents({ action: "bulk_register_subjects", branch_id: branchId, subject_id: selectedSubjectId, student_ids: toRegister }, "POST");
        if (res?.success) {
          const resData: any = res.data;
          registeredCount = resData?.registered_count ?? resData?.registered?.length ?? toRegister.length;
          failed = failed.concat(resData?.failed || []);
        } else {
          const msg = res?.message || 'Failed to register students';
          setResultData({ added: 0, removed: 0, failed: [msg] });
          setResultModalOpen(true);
          setSaving(false);
          return;
        }
      }

      if (toUnregister.length > 0) {
        const res2 = await manageStudents({ action: "bulk_unregister_subjects", branch_id: branchId, subject_id: selectedSubjectId, student_ids: toUnregister }, "POST");
        if (res2?.success) {
          const res2Data: any = res2.data;
          removedCount = res2Data?.removed_count ?? res2Data?.removed?.length ?? toUnregister.length;
          failed = failed.concat(res2Data?.failed || []);
        } else {
          const msg = res2?.message || 'Failed to unregister students';
          setResultData({ added: 0, removed: 0, failed: [msg] });
          setResultModalOpen(true);
          setSaving(false);
          return;
        }
      }

      setResultData({ added: registeredCount, removed: removedCount, failed });
      setResultModalOpen(true);
      
      // Update local state instead of reloading to avoid extra API call
      setStudents((prev) => prev.map(student => {
        if (toRegister.includes(student.usn)) {
          return { ...student, checked: true, originallyEnrolled: true };
        } else if (toUnregister.includes(student.usn)) {
          return { ...student, checked: false, originallyEnrolled: false };
        }
        return student;
      }));
      
    } catch (e) {
      console.error(e);
      setResultData({ added: 0, removed: 0, failed: [] });
      setResultModalOpen(true);
    }
    setSaving(false);
  };

  return (
    <div className="w-full mx-auto max-w-none">
      <Card className="shadow-lg">
        <CardHeader className="pb-4 md:pb-2 lg:pb-4">
          <CardTitle className="text-2xl font-semibold leading-none tracking-tight text-gray-900">Student Enrollment (Elective / Open Elective)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 sm:space-y-5 md:space-y-4 lg:space-y-6 p-4 sm:p-5 md:p-4 lg:p-6">
            <div className="w-full">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 w-full">
                <div className="space-y-2">
                  <label className="text-sm font-bold block text-gray-700 dark:text-gray-300">Semester</label>
                  <Select value={semesterId} onValueChange={(v: string) => { setSemesterId(v); setSectionId(""); }}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select semester" />
                    </SelectTrigger>
                    <SelectContent>
                      {semesters.map((sem: any) => (
                        <SelectItem key={sem.id} value={sem.id}>{`${sem.number}th Semester`}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold block text-gray-700 dark:text-gray-300">Section</label>
                  <Select value={sectionId} onValueChange={setSectionId}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select section" />
                    </SelectTrigger>
                    <SelectContent>
                      {(() => {
                        const semObj = semesters.find((s: any) => String(s.id) === String(semesterId));
                        const semNumberKey = semObj ? String(semObj.number) : "";
                        const list = sectionsBySemester[String(semesterId)] || sectionsBySemester[semNumberKey] || [];
                        return list.map((sec: any) => (
                          <SelectItem key={String(sec.id)} value={String(sec.id)}>{sec.name}</SelectItem>
                        ));
                      })()}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold block text-gray-700 dark:text-gray-300">Subject Type</label>
                  <Select value={subjectType} onValueChange={setSubjectType}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Subject type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="elective">Elective</SelectItem>
                      <SelectItem value="open_elective">Open Elective</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold block text-gray-700 dark:text-gray-300">Subject</label>
                  <Select value={selectedSubjectId} onValueChange={setSelectedSubjectId}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select subject" />
                    </SelectTrigger>
                    <SelectContent>
                      {subjects.map((s: any) => (
                        <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {electivePage < electiveTotalPages && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setElectivePage(prev => prev + 1)}
                      disabled={electiveLoading}
                      className="w-full mt-2 bg-purple-600 hover:bg-purple-700 text-white border-purple-600 shadow-sm"
                    >
                      {electiveLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Load More Subjects"}
                    </Button>
                  )}
                </div>
              </div>
            </div>

          <div className={`flex flex-col sm:flex-row items-stretch sm:items-center gap-4 mb-6 p-4 sm:p-5 rounded-lg border ${
            theme === 'dark' ? 'bg-muted/50 border-border' : 'bg-gray-50 border-gray-100'
          }`}>
            <div className="flex-1">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by USN or name"
                className={`w-full px-4 py-2.5 text-sm rounded-md border shadow-sm transition-all placeholder-gray-400 focus:ring-2 focus:ring-purple-500/20 ${
                  theme === 'dark'
                    ? 'bg-background border-border text-foreground placeholder:text-muted-foreground'
                    : 'bg-white border-gray-300 text-gray-900'
                }`}
              />
            </div>
            <div className="flex flex-col sm:flex-row items-center gap-3">
              <Button
                onClick={() => loadStudents(1, searchTerm)}
                disabled={!selectedSubjectId || isLoading || !branchId}
                className="w-full sm:w-auto px-6 bg-primary hover:bg-[#9147e0] text-white shadow-md transition-all active:scale-95"
              >
                {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Search"}
              </Button>
              <Button 
                onClick={save} 
                disabled={saving || students.length === 0}
                className="w-full sm:w-auto px-6 bg-primary hover:bg-[#9147e0] text-white shadow-md transition-all active:scale-95"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save Enrollment"}
              </Button>
            </div>
            <div className="flex flex-row items-center justify-center sm:justify-start gap-4 sm:gap-6 text-sm pt-2 sm:pt-0 border-t sm:border-none border-gray-200 dark:border-gray-800 mt-2 sm:mt-0">
              <div className="flex items-center gap-2">
                <span className="font-bold text-gray-600 dark:text-gray-400">Enrolled:</span>
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                  theme === 'dark' 
                    ? 'bg-green-900/30 text-green-400 border border-green-800/50' 
                    : 'bg-green-100 text-green-800 border border-green-200'
                }`}>
                  {students.filter((s:any)=>s.checked).length}
                </span>
              </div>
              <label className="flex items-center gap-2 cursor-pointer group">
                <input 
                  type="checkbox" 
                  checked={showEnrolledOnly} 
                  onChange={(e)=>setShowEnrolledOnly(e.target.checked)} 
                  className="rounded border-gray-300 text-purple-600 focus:ring-purple-500 h-4 w-4 transition-all"
                />
                <span className="font-semibold text-gray-700 dark:text-gray-300 group-hover:text-purple-600 transition-colors">Show enrolled only</span>
              </label>
            </div>
          </div>

          <div>
            {isLoading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <SkeletonCard />
                <SkeletonCard />
              </div>
            ) : (
              <>
                {students.length === 0 ? (
                  <div className="text-sm text-muted-foreground">No students loaded</div>
                ) : (
                  (() => {
                    // Server-side search is used when the user clicks the Search button.
                    // `students` already contains the server-provided (possibly searched) page.
                    const filtered = students;
                    const enrolledListFiltered = filtered.filter((s: any) => s.checked);
                    const notEnrolledListFiltered = filtered.filter((s: any) => !s.checked);

                    return (
                      <>
                        <div className={showEnrolledOnly ? "" : "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-3 sm:gap-3 md:gap-2 lg:gap-4"}>
                          <div className="p-3 sm:p-3 md:p-3 lg:p-4 border rounded-lg">
                            <div className="flex items-center justify-between mb-2 sm:mb-3">
                              <strong className="text-base sm:text-lg md:text-base lg:text-lg">Enrolled</strong>
                              <span className={`text-sm px-2 py-1 rounded-full ${
                                theme === 'dark' 
                                  ? 'bg-green-900/20 text-green-400' 
                                  : 'bg-green-100 text-green-800'
                              }`}>
                                {enrolledListFiltered.length}
                              </span>
                            </div>
                            <div className="space-y-2 md:space-y-1 max-h-[500px] overflow-y-auto">
                              {enrolledListFiltered.map((s: any) => (
                                <div key={s.id} className={`flex items-center gap-3 p-2 rounded ${
                                  theme === 'dark' ? 'hover:bg-accent' : 'hover:bg-gray-50'
                                }`}>
                                  <Checkbox checked={s.checked} onCheckedChange={() => toggleStudent(s.id)} />
                                  <div className="text-sm">
                                    <span className="font-medium">{s.usn}</span> — {s.name}
                                  </div>
                                </div>
                              ))}
                              {enrolledListFiltered.length === 0 && <div className="text-sm text-muted-foreground py-4 text-center">No enrolled students</div>}
                            </div>
                          </div>

                          {!showEnrolledOnly && (
                            <div className="p-3 sm:p-3 md:p-3 lg:p-4 border rounded-lg">
                              <div className="flex items-center justify-between mb-2 sm:mb-3">
                                <strong className="text-base sm:text-lg md:text-base lg:text-lg">Not Enrolled</strong>
                                <span className={`text-sm px-2 py-1 rounded-full ${
                                  theme === 'dark' 
                                    ? 'bg-red-900/20 text-red-400' 
                                    : 'bg-red-100 text-red-800'
                                }`}>
                                  {notEnrolledListFiltered.length}
                                </span>
                              </div>
                              <div className="space-y-2 md:space-y-1 max-h-[500px] overflow-y-auto">
                                {notEnrolledListFiltered.map((s: any) => (
                                  <div key={s.id} className={`flex items-center gap-3 p-2 rounded ${
                                    theme === 'dark' ? 'hover:bg-accent' : 'hover:bg-gray-50'
                                  }`}>
                                    <Checkbox checked={s.checked} onCheckedChange={() => toggleStudent(s.id)} />
                                    <div className="text-sm">
                                      <span className="font-medium">{s.usn}</span> — {s.name}
                                    </div>
                                  </div>
                                ))}
                                {notEnrolledListFiltered.length === 0 && <div className="text-sm text-muted-foreground py-4 text-center">All students enrolled</div>}
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Pagination Controls */}
                        {totalPages > 1 && (
                          <div className="flex flex-col sm:flex-row items-center justify-between mt-6 sm:mt-5 md:mt-4 lg:mt-6 pt-4 sm:pt-3 md:pt-3 lg:pt-4 border-t gap-3 sm:gap-3 md:gap-2 lg:gap-4">
                            <div className={`text-xs sm:text-sm ${theme === 'dark' ? 'text-foreground' : 'text-gray-600'}`}>
                              Page {currentPage} of {totalPages} ({totalStudents} total students)
                            </div>
                            <div className="flex items-center space-x-2">
                              <Button
                                variant="outline"
                                disabled={currentPage === 1}
                                onClick={() => loadStudents(currentPage - 1)}
                                className="text-sm font-medium px-4 py-2 rounded-md bg-purple-600 hover:bg-purple-700 text-white border-purple-600"
                              >
                                Previous
                              </Button>
                              <span className={`px-4 py-2 text-sm font-medium rounded-md ${theme === 'dark' ? 'text-foreground bg-accent' : 'text-gray-900 bg-gray-100'}`}>
                                {currentPage} of {totalPages}
                              </span>
                              <Button
                                variant="outline"
                                disabled={currentPage === totalPages}
                                onClick={() => loadStudents(currentPage + 1)}
                                className="text-sm font-medium px-4 py-2 rounded-md bg-purple-600 hover:bg-purple-700 text-white border-purple-600"
                              >
                                Next
                              </Button>
                            </div>
                          </div>
                        )}
                      </>
                    );
                  })()
                )}
              </>
            )}
          </div>

          <Dialog open={resultModalOpen} onOpenChange={(open) => { setResultModalOpen(open); }}>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Enrollment Results</DialogTitle>
              </DialogHeader>
              <div className="py-2">
                <div className="mb-2">Added: <strong>{resultData.added}</strong></div>
                <div className="mb-2">Removed: <strong>{resultData.removed}</strong></div>
                <div className="mb-2">Failed: <strong>{resultData.failed?.length || 0}</strong></div>
                {resultData.failed && resultData.failed.length > 0 && (
                  <div className="mt-2 max-h-40 overflow-y-auto border rounded p-2">
                    {resultData.failed.map((f: any, idx: number) => (
                      <div key={f?.usn || f?.student_id || String(f) || idx} className="text-sm">{f.usn || f.student_id || f}</div>
                    ))}
                  </div>
                )}
              </div>
              <DialogFooter>
                <div className="w-full flex justify-end">
                  <Button onClick={() => { setResultModalOpen(false); }} className="bg-purple-600 hover:bg-purple-700 text-white">Close</Button>
                </div>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </CardContent>
      </Card>
    </div>
  );
};

export default StudentEnrollment;
