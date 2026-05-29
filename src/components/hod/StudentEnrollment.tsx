/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "../ui/card";
import { Button } from "../ui/button";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "../ui/select";
import { Checkbox } from "../ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "../ui/dialog";
import { SkeletonCard } from "../ui/skeleton";
import { manageStudents, getElectiveEnrollmentBootstrap, manageSections, manageSubjects, manageSemesters } from "../../utils/hod_api";
import { useHODBootstrap } from "../../context/HODBootstrapContext";
import { useTheme } from "../../context/ThemeContext";
import { API_ENDPOINT } from "../../utils/config";
import { fetchWithTokenRefresh } from "../../utils/authService";
import { Loader2, Users, UserX, UserCheck, FileDown } from "lucide-react";
import { showSuccessAlert, showErrorAlert } from "../../utils/sweetalert";

const StudentEnrollment = () => {
  useHODBootstrap();
  const getSemesterName = (number: number) => {
    const suffixes = ["st", "nd", "rd", "th", "th", "th", "th", "th"];
    return `${number}${suffixes[number - 1]} Semester`;
  };
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
  const [resultData, setResultData] = useState<{added: number;removed: number;failed: any[];}>({ added: 0, removed: 0, failed: [] });
  const [downloadingPDF, setDownloadingPDF] = useState(false);

  const [isSemesterOpen, setIsSemesterOpen] = useState(false);
  const [isSectionOpen, setIsSectionOpen] = useState(false);
  const [isSubjectTypeOpen, setIsSubjectTypeOpen] = useState(false);
  const [isSubjectOpen, setIsSubjectOpen] = useState(false);

  // Add Semester / Section states
  const [isAddSemesterOpen, setIsAddSemesterOpen] = useState(false);
  const [newSemesterNumber, setNewSemesterNumber] = useState("");
  const [addingSemester, setAddingSemester] = useState(false);

  const [isAddSectionOpen, setIsAddSectionOpen] = useState(false);
  const [newSectionName, setNewSectionName] = useState("");
  const [addingSection, setAddingSection] = useState(false);

  const handleOpenAddSemester = () => {
    setNewSemesterNumber("");
    setIsSemesterOpen(false);
    setIsAddSemesterOpen(true);
  };

  const handleOpenAddSection = () => {
    setNewSectionName("");
    setIsSectionOpen(false);
    setIsAddSectionOpen(true);
  };

  const handleAddSemester = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSemesterNumber || isNaN(Number(newSemesterNumber)) || Number(newSemesterNumber) < 1 || Number(newSemesterNumber) > 8) {
      showErrorAlert("Error", "Please enter a valid semester number (1-8)");
      return;
    }
    setAddingSemester(true);
    try {
      const response = await manageSemesters({
        action: "create",
        number: Number(newSemesterNumber),
        branch_id: branchId
      });
      if (response.success) {
        const returnedSemesters = (response as any).semesters || (response.data && Array.isArray((response.data as any).semesters) ? (response.data as any).semesters : null);
        if (returnedSemesters && Array.isArray(returnedSemesters)) {
          const mappedSemesters = returnedSemesters.map((s: any) => ({ id: s.id.toString(), number: s.number }));
          setSemesters(mappedSemesters);
          const newSem = mappedSemesters.find((s: any) => s.number === Number(newSemesterNumber));
          if (newSem) {
            setSemesterId(newSem.id);
            setSectionId("");
            setTimeout(() => setIsSectionOpen(true), 150);
          }
        } else {
          const createdId = response.data?.semester_id || response.data?.id || String(Date.now());
          const newSem = { id: String(createdId), number: Number(newSemesterNumber) };
          setSemesters(prev => [...prev, newSem].sort((a, b) => a.number - b.number));
          setSemesterId(String(createdId));
          setSectionId("");
          setTimeout(() => setIsSectionOpen(true), 150);
        }
        showSuccessAlert("Success", "Semester added successfully!");
        setIsAddSemesterOpen(false);
      } else {
        showErrorAlert("Error", response.message || "Failed to create semester");
      }
    } catch (err: any) {
      showErrorAlert("Error", "An error occurred while creating semester");
    } finally {
      setAddingSemester(false);
    }
  };

  const handleAddSection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSectionName || !["A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L", "M", "N", "O", "P", "Q", "R", "S", "T", "U", "V", "W", "X", "Y", "Z"].includes(newSectionName)) {
      showErrorAlert("Error", "Please select a valid section (A-Z)");
      return;
    }
    setAddingSection(true);
    try {
      if (!semesterId) {
        showErrorAlert("Error", "Please select a semester first.");
        return;
      }
      const response = await manageSections({
        action: "create",
        name: newSectionName,
        semester_id: semesterId,
        branch_id: branchId
      }, "POST");

      if (response.success) {
        const createdId = response.data?.id || response.data?.section_id || String(Date.now());
        const newSec = { id: String(createdId), name: newSectionName, semester_id: semesterId };
        const currentCached = sectionsBySemester[semesterId] || [];
        const updatedSections = [...currentCached, newSec].filter((v, i, a) => a.findIndex(t => t.name === v.name) === i).sort((a, b) => a.name.localeCompare(b.name));
        
        setSectionsBySemester(prev => ({ ...prev, [semesterId]: updatedSections }));
        setSectionId(String(createdId));
        setIsAddSectionOpen(false);
        setTimeout(() => setIsSubjectTypeOpen(true), 150);
      } else {
        showErrorAlert("Error", response.message || "Failed to create section");
      }
    } catch (err: any) {
      showErrorAlert("Error", err.message || "An error occurred while creating section");
    } finally {
      setAddingSection(false);
    }
  };

  // Add Subject Modal and versioning states
  const [isAddSubjectOpen, setIsAddSubjectOpen] = useState(false);
  const [subjectVersion, setSubjectVersion] = useState(0);
  const [addingSubject, setAddingSubject] = useState(false);
  const [newSubjectState, setNewSubjectState] = useState({
    subject_code: "",
    name: "",
    semester_id: "",
    subject_type: "elective",
    credits: 3
  });

  const handleOpenAddSubject = () => {
    setNewSubjectState({
      subject_code: "",
      name: "",
      semester_id: semesterId || (semesters[0]?.id || ""),
      subject_type: subjectType || "elective",
      credits: 3
    });
    setIsSubjectOpen(false);
    setIsAddSubjectOpen(true);
  };

  const handleAddSubject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubjectState.subject_code || !newSubjectState.name || !newSubjectState.semester_id) {
      showErrorAlert("Error", "Please fill in all required fields.");
      return;
    }
    setAddingSubject(true);
    try {
      const res = await manageSubjects({
        action: "create",
        branch_id: branchId,
        name: newSubjectState.name,
        subject_code: newSubjectState.subject_code,
        semester_id: newSubjectState.semester_id,
        subject_type: newSubjectState.subject_type,
        credits: Number(newSubjectState.credits)
      } as any, "POST");

      if (res.success) {
        setSubjectVersion(prev => prev + 1);
        setElectivePage(1);
        if (res.data?.subject_id) {
          setSelectedSubjectId(String(res.data.subject_id));
        }
        setIsAddSubjectOpen(false);
      } else {
        showErrorAlert("Error", res.message || "Failed to create subject");
      }
    } catch (err: any) {
      showErrorAlert("Error", "An error occurred while creating subject");
    } finally {
      setAddingSubject(false);
    }
  };

  const handleExportPDF = async () => {
    if (!selectedSubjectId) return;
    setDownloadingPDF(true);
    try {
      const params = new URLSearchParams({
        subject_id: selectedSubjectId,
        semester_id: semesterId,
        section_id: sectionId,
        search: searchTerm,
      });

      const response = await fetchWithTokenRefresh(`${API_ENDPOINT}/hod/elective-enrollment/export-pdf/?${params}`);
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        const contentDisposition = response.headers.get("Content-Disposition");
        let filename = `Elective_Enrollment_${new Date().toISOString().slice(0, 10)}.pdf`;
        if (contentDisposition) {
          const matches = /filename="?([^"]+)"?/.exec(contentDisposition);
          if (matches && matches[1]) {
            filename = matches[1];
          }
        }
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(url);
      } else {
        const result = await response.json().catch(() => ({}));
        showErrorAlert("Error", result.message || "Failed to export PDF");
      }
    } catch (err) {
      showErrorAlert("Error", "Network error while exporting PDF");
    } finally {
      setDownloadingPDF(false);
    }
  };

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
        const boot = await getElectiveEnrollmentBootstrap(['profile', 'semesters']);
        if (boot.success && boot.data) {
          const bId = boot.data.profile?.branch_id;
          if (bId) setBranchId(String(bId));
          if (Array.isArray(boot.data.semesters)) setSemesters(boot.data.semesters.map((s: any) => ({ id: String(s.id), number: s.number })));
          // Sections are now fetched lazily on semester selection
        }
      } catch (e) {

      }
    };
    loadBootstrap();
  }, []);

  // Fetch sections lazily when semester changes
  useEffect(() => {
    if (branchId && semesterId) {
      const cached = sectionsBySemester[semesterId];
      if (!cached) {
        manageSections({ branch_id: branchId, semester_id: semesterId }, "GET")
          .then((res: any) => {
            if (res.success && res.data) {
              setSectionsBySemester(prev => ({
                ...prev,
                [semesterId]: res.data.map((sec: any) => ({ ...sec, id: String(sec.id) }))
              }));
            }
          })
          .catch((err: any) => console.error(err));
      }
    }
  }, [branchId, semesterId, sectionsBySemester]);

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
          headers: { "Content-Type": "application/json" }
        });

        const data = await response.json();
        if (data.success && data.data) {
          const newSubjects = (data.data.elective_subjects || []).map((s: any) => ({ ...s, id: String(s.id) }));
          if (electivePage === 1) {
            setElectiveSubjects(newSubjects);
          } else {
            setElectiveSubjects((prev) => [...prev, ...newSubjects]);
          }
          setElectiveTotalPages(data.data.elective_pagination?.num_pages || 1);
        }
      } catch (e) {

      }
      setElectiveLoading(false);
    };
    loadSubjects();
  }, [semesterId, subjectType, sectionId, electivePage, subjectVersion]);

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
    const selType = selSub ? selSub.subject_type || selSub.subjectType || '' : '';

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
        headers: { "Content-Type": "application/json" }
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
        originallyEnrolled: s.is_enrolled || false // Store original state for change detection
      }));

      setStudents(mapped);
      setCurrentPage(page);
      setTotalPages(data.total_pages || Math.ceil(data.count / 50)); // Fixed page size of 50
      setTotalStudents(data.count);

      // Reset enrolled count - derived when needed (removed state)
    } catch (e) {

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
    setStudents((prev) => prev.map((p) => p.id === id ? { ...p, checked: !p.checked } : p));
  };

  const save = async () => {
    if (students.length === 0) return;
    setSaving(true);
    try {
      // Determine changes based on original loaded state vs current checked state
      const toRegister = students.filter((s) => s.checked && !s.originallyEnrolled).map((s) => s.usn);
      const toUnregister = students.filter((s) => !s.checked && s.originallyEnrolled).map((s) => s.usn);

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
      setStudents((prev) => prev.map((student) => {
        if (toRegister.includes(student.usn)) {
          return { ...student, checked: true, originallyEnrolled: true };
        } else if (toUnregister.includes(student.usn)) {
          return { ...student, checked: false, originallyEnrolled: false };
        }
        return student;
      }));

    } catch (e) {

      setResultData({ added: 0, removed: 0, failed: [] });
      setResultModalOpen(true);
    }
    setSaving(false);
  };

  return (
    <div id="hod-student-enrollment-container" className="w-full mx-auto max-w-none">
      <Card className="shadow-lg">
        <div id="elective-enrollment-filters-section">
          <CardHeader className="pb-4 md:pb-2 lg:pb-4">
            <CardTitle>Student Enrollment (Elective / Open Elective)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 sm:space-y-5 md:space-y-4 lg:space-y-6 p-4 sm:p-5 md:p-4 lg:p-6 pb-0">
            <div className="w-full">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 w-full">
                <div className="space-y-2">
                  <label className="text-sm font-semibold block text-gray-700 dark:text-gray-300">Semester</label>
                  <Select open={isSemesterOpen} onOpenChange={setIsSemesterOpen} value={semesterId} onValueChange={(v: string) => {
                    setSemesterId(v);
                    setSectionId("");
                    setTimeout(() => setIsSectionOpen(true), 150);
                  }}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Choose Semester" />
                    </SelectTrigger>
                    <SelectContent className={theme === 'dark' ? 'bg-card text-foreground border border-border max-h-[200px] overflow-y-auto custom-scrollbar' : 'bg-white text-gray-900 border border-gray-300 max-h-[200px] overflow-y-auto custom-scrollbar'}>
                      {semesters.length === 0 ? (
                        <div className="p-2 flex justify-center" onPointerDown={(e) => e.stopPropagation()}>
                          <Button
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              handleOpenAddSemester();
                            }}
                            className="w-full bg-primary hover:bg-[#9147e0] text-white shadow-sm transition-all active:scale-95 text-xs py-1.5 h-auto">
                            Add Semester
                          </Button>
                        </div>
                      ) : (
                        semesters.map((sem: any) =>
                          <SelectItem key={sem.id} value={sem.id}>{getSemesterName(sem.number)}</SelectItem>
                        )
                      )}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold block text-gray-700 dark:text-gray-300">Section</label>
                  <Select open={isSectionOpen} onOpenChange={setIsSectionOpen} value={sectionId} onValueChange={(v: string) => {
                    setSectionId(v);
                    setTimeout(() => setIsSubjectTypeOpen(true), 150);
                  }} disabled={!semesterId}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Choose Section" />
                    </SelectTrigger>
                    <SelectContent className={theme === 'dark' ? 'bg-card text-foreground border border-border max-h-[200px] overflow-y-auto custom-scrollbar' : 'bg-white text-gray-900 border border-gray-300 max-h-[200px] overflow-y-auto custom-scrollbar'}>
                      {(() => {
                        const semObj = semesters.find((s: any) => String(s.id) === String(semesterId));
                        const semNumberKey = semObj ? String(semObj.number) : "";
                        const list = sectionsBySemester[String(semesterId)] || sectionsBySemester[semNumberKey] || [];
                        if (semesterId && list.length === 0) {
                          return (
                            <div className="p-2 flex justify-center" onPointerDown={(e) => e.stopPropagation()}>
                              <Button
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  handleOpenAddSection();
                                }}
                                className="w-full bg-primary hover:bg-[#9147e0] text-white shadow-sm transition-all active:scale-95 text-xs py-1.5 h-auto">
                                Add Section
                              </Button>
                            </div>
                          );
                        }
                        return list.map((sec: any) =>
                          <SelectItem key={String(sec.id)} value={String(sec.id)}>{sec.name}</SelectItem>
                        );
                      })()}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold block text-gray-700 dark:text-gray-300">Subject Type</label>
                  <Select open={isSubjectTypeOpen} onOpenChange={setIsSubjectTypeOpen} value={subjectType} onValueChange={(v: string) => {
                    setSubjectType(v);
                    setTimeout(() => setIsSubjectOpen(true), 150);
                  }}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Choose Subject Type" />
                    </SelectTrigger>
                    <SelectContent className={theme === 'dark' ? 'bg-card text-foreground border border-border max-h-[200px] overflow-y-auto custom-scrollbar' : 'bg-white text-gray-900 border border-gray-300 max-h-[200px] overflow-y-auto custom-scrollbar'}>
                      <SelectItem value="elective">Elective</SelectItem>
                      <SelectItem value="open_elective">Open Elective</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold block text-gray-700 dark:text-gray-300">Subject</label>
                  <Select open={isSubjectOpen} onOpenChange={setIsSubjectOpen} value={selectedSubjectId} onValueChange={setSelectedSubjectId} disabled={!semesterId || !sectionId || !subjectType}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Choose Subject" />
                    </SelectTrigger>
                    <SelectContent className={theme === 'dark' ? 'bg-card text-foreground border border-border max-h-[200px] overflow-y-auto custom-scrollbar' : 'bg-white text-gray-900 border border-gray-300 max-h-[200px] overflow-y-auto custom-scrollbar'}>
                      {semesterId && sectionId && subjectType && subjects.length === 0 ? (
                        <div className="p-2 flex justify-center" onPointerDown={(e) => e.stopPropagation()}>
                          <Button
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              handleOpenAddSubject();
                            }}
                            className="w-full bg-primary hover:bg-[#9147e0] text-white shadow-sm transition-all active:scale-95 text-xs py-1.5 h-auto">
                            Add Subject
                          </Button>
                        </div>
                      ) : (
                        subjects.map((s: any) =>
                          <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                        )
                      )}
                    </SelectContent>
                  </Select>
                  {electivePage < electiveTotalPages &&
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setElectivePage((prev) => prev + 1)}
                  disabled={electiveLoading}
                  className="w-full mt-2 bg-purple-600 hover:bg-purple-700 text-white border-purple-600 shadow-sm">
                  
                      {electiveLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Load More Subjects"}
                    </Button>
                }
                </div>
              </div>
            </div>

          <div className={`flex flex-col sm:flex-row items-stretch sm:items-center gap-4 mb-6 p-4 sm:p-5 rounded-lg border ${
          theme === 'dark' ? 'bg-muted/50 border-border' : 'bg-gray-50 border-gray-100'}`
          }>
            <div className="flex-1">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by USN or name"
                className={`w-full px-4 py-2.5 text-sm rounded-md border shadow-sm transition-all placeholder-gray-400 focus:ring-2 focus:ring-purple-500/20 ${
                theme === 'dark' ?
                'bg-background border-border text-foreground placeholder:text-muted-foreground' :
                'bg-white border-gray-300 text-gray-900'}`
                } />
              
            </div>
            <div className="flex flex-col sm:flex-row items-center gap-3">
              <Button
                onClick={() => loadStudents(1, searchTerm)}
                disabled={!selectedSubjectId || isLoading || !branchId}
                className="w-full sm:w-auto px-6 bg-primary hover:bg-[#9147e0] text-white shadow-md transition-all active:scale-95">
                
                {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Search"}
              </Button>
              <Button
                onClick={save}
                disabled={saving || students.length === 0}
                className="w-full sm:w-auto px-6 bg-primary hover:bg-[#9147e0] text-white shadow-md transition-all active:scale-95">
                
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save Enrollment"}
              </Button>
              <Button
                onClick={handleExportPDF}
                disabled={!selectedSubjectId || isLoading || saving || downloadingPDF}
                className="w-full sm:w-auto px-6 bg-primary hover:bg-[#9147e0] text-white shadow-md transition-all active:scale-95 flex items-center justify-center gap-2">
                {downloadingPDF ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <FileDown className="h-4.5 w-4.5" />
                )}
                <span>Export PDF</span>
              </Button>
            </div>
            <div className="flex flex-row items-center justify-center sm:justify-start gap-4 sm:gap-6 text-sm pt-2 sm:pt-0 border-t sm:border-none border-gray-200 dark:border-gray-800 mt-2 sm:mt-0">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-gray-600 dark:text-gray-400">Enrolled:</span>
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                theme === 'dark' ?
                'bg-green-900/30 text-green-400 border border-green-800/50' :
                'bg-green-100 text-green-800 border border-green-200'}`
                }>
                  {students.filter((s: any) => s.checked).length}
                </span>
              </div>
              <label className="flex items-center gap-2 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={showEnrolledOnly}
                  onChange={(e) => setShowEnrolledOnly(e.target.checked)}
                  className="rounded border-gray-300 text-purple-600 focus:ring-purple-500 h-4 w-4 transition-all" />
                
                <span className="font-semibold text-gray-700 dark:text-gray-300 group-hover:text-purple-600 transition-colors">Show enrolled only</span>
              </label>
            </div>
          </div>
          </CardContent>
        </div>

        <CardContent className="space-y-4 sm:space-y-5 md:space-y-4 lg:space-y-6 p-4 sm:p-5 md:p-4 lg:p-6 pt-0">
          <div>
            {isLoading ?
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <SkeletonCard />
                <SkeletonCard />
              </div> :

            <>
                {students.length === 0 ?
              <div className={`flex flex-col items-center justify-center py-16 px-6 text-center border-2 border-dashed rounded-2xl transition-all duration-300 ${theme === 'dark' ? 'border-border bg-card/30 text-muted-foreground' : 'border-gray-200 bg-gray-50/50 text-gray-500'}`}>
                    <div className={`p-6 rounded-full mb-6 ${theme === 'dark' ? 'bg-primary/20 text-primary' : 'bg-primary/10 text-primary'}`}>
                      <Users className="w-12 h-12 opacity-80" />
                    </div>
                    <h3 className={`text-xl font-semibold mb-2 ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>No Students Loaded</h3>
                    <p className="max-w-xs text-base leading-relaxed">
                      Select a semester, section, and subject to load students for enrollment management.
                    </p>
                  </div> :

              (() => {
                // Server-side search is used when the user clicks the Search button.
                // `students` already contains the server-provided (possibly searched) page.
                const filtered = students;
                const enrolledListFiltered = filtered.filter((s: any) => s.checked);
                const notEnrolledListFiltered = filtered.filter((s: any) => !s.checked);

                return (
                  <>
                        <div className={showEnrolledOnly ? "" : "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-3 sm:gap-3 md:gap-2 lg:gap-4"}>
                          <div className={`p-4 sm:p-5 border rounded-xl transition-all ${theme === 'dark' ? 'bg-card/20 border-border' : 'bg-white border-gray-100 shadow-sm'}`}>
                            <div className="flex items-center justify-between mb-4">
                              <div className="flex items-center gap-2">
                                <UserCheck className={`w-5 h-5 ${theme === 'dark' ? 'text-green-400' : 'text-green-600'}`} />
                                <strong className="text-lg font-semibold">Enrolled</strong>
                              </div>
                              <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                          theme === 'dark' ?
                          'bg-green-900/40 text-green-400 border border-green-800/50' :
                          'bg-green-100 text-green-800 border border-green-200'}`
                          }>
                                {enrolledListFiltered.length}
                              </span>
                            </div>
                            <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1 custom-scrollbar">
                              {enrolledListFiltered.map((s: any) =>
                          <div key={s.id} className={`flex items-center gap-3 p-2.5 rounded-lg transition-colors ${
                          theme === 'dark' ? 'hover:bg-accent' : 'hover:bg-gray-50'}`
                          }>
                                  <Checkbox checked={s.checked} onCheckedChange={() => toggleStudent(s.id)} />
                                  <div className="text-sm">
                                    <span className="font-semibold">{s.usn}</span>
                                    <span className="mx-2 text-muted-foreground">•</span>
                                    <span className={theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}>{s.name}</span>
                                  </div>
                                </div>
                          )}
                              {enrolledListFiltered.length === 0 &&
                          <div className={`flex flex-col items-center justify-center py-12 px-4 text-center border-2 border-dashed rounded-xl ${theme === 'dark' ? 'border-border bg-card/20 text-muted-foreground' : 'border-gray-100 bg-gray-50/30 text-gray-400'}`}>
                                  <UserX className="w-8 h-8 mb-2 opacity-20" />
                                  <p className="text-sm font-medium">No enrolled students</p>
                                </div>
                          }
                            </div>
                          </div>

                          {!showEnrolledOnly &&
                      <div className={`p-4 sm:p-5 border rounded-xl custom-scrollbar transition-all ${theme === 'dark' ? 'bg-card/20 border-border' : 'bg-white border-gray-100 shadow-sm'}`}>
                              <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-2">
                                  <Users className={`w-5 h-5 ${theme === 'dark' ? 'text-red-400' : 'text-red-600'}`} />
                                  <strong className="text-lg font-semibold">Not Enrolled</strong>
                                </div>
                                <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                          theme === 'dark' ?
                          'bg-red-900/40 text-red-400 border border-red-800/50' :
                          'bg-red-100 text-red-800 border border-red-200'}`
                          }>
                                  {notEnrolledListFiltered.length}
                                </span>
                              </div>
                              <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
                                {notEnrolledListFiltered.map((s: any) =>
                          <div key={s.id} className={`flex items-center gap-3 p-2.5 rounded-lg transition-colors ${
                          theme === 'dark' ? 'hover:bg-accent' : 'hover:bg-gray-50'}`
                          }>
                                    <Checkbox checked={s.checked} onCheckedChange={() => toggleStudent(s.id)} />
                                    <div className="text-sm">
                                      <span className="font-semibold">{s.usn}</span>
                                      <span className="mx-2 text-muted-foreground">•</span>
                                      <span className={theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}>{s.name}</span>
                                    </div>
                                  </div>
                          )}
                                {notEnrolledListFiltered.length === 0 &&
                          <div className={`flex flex-col items-center justify-center py-12 px-4 text-center border-2 border-dashed rounded-xl ${theme === 'dark' ? 'border-border bg-card/20 text-muted-foreground' : 'border-gray-100 bg-gray-50/30 text-gray-400'}`}>
                                    <UserCheck className="w-8 h-8 mb-2 opacity-20" />
                                    <p className="text-sm font-medium">All students enrolled</p>
                                  </div>
                          }
                              </div>
                            </div>
                      }
                        </div>
                      </>);

              })()
              }
              </>
            }
          </div>

          <Dialog open={resultModalOpen} onOpenChange={(open) => {setResultModalOpen(open);}}>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Enrollment Results</DialogTitle>
              </DialogHeader>
              <div className="py-2">
                <div className="mb-2">Added: <strong>{resultData.added}</strong></div>
                <div className="mb-2">Removed: <strong>{resultData.removed}</strong></div>
                <div className="mb-2">Failed: <strong>{resultData.failed?.length || 0}</strong></div>
                {resultData.failed && resultData.failed.length > 0 &&
                <div className="mt-2 max-h-40 overflow-y-auto border rounded p-2">
                    {resultData.failed.map((f: any, idx: number) =>
                  <div key={f?.usn || f?.student_id || String(f) || idx} className="text-sm">{f.usn || f.student_id || f}</div>
                  )}
                  </div>
                }
              </div>
              <DialogFooter>
                <div className="w-full flex justify-end">
                  <Button onClick={() => {setResultModalOpen(false);}} className="bg-purple-600 hover:bg-purple-700 text-white">Close</Button>
                </div>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Dialog open={isAddSubjectOpen} onOpenChange={setIsAddSubjectOpen}>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Add New Subject</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleAddSubject} className="space-y-4 py-2">
                <div className="space-y-2">
                  <label className="text-sm font-semibold block text-gray-700 dark:text-gray-300">Course Code</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g., PH1L001, BCS601"
                    value={newSubjectState.subject_code}
                    onChange={(e) => setNewSubjectState(prev => ({ ...prev, subject_code: e.target.value }))}
                    className={`w-full px-3 py-2.5 text-sm rounded-md border shadow-sm transition-all focus:ring-2 focus:ring-purple-500/20 ${
                      theme === 'dark' ? 'bg-background border-border text-foreground' : 'bg-white border-gray-300 text-gray-900'
                    }`}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold block text-gray-700 dark:text-gray-300">Course Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g., Mathematics"
                    value={newSubjectState.name}
                    onChange={(e) => setNewSubjectState(prev => ({ ...prev, name: e.target.value }))}
                    className={`w-full px-3 py-2.5 text-sm rounded-md border shadow-sm transition-all focus:ring-2 focus:ring-purple-500/20 ${
                      theme === 'dark' ? 'bg-background border-border text-foreground' : 'bg-white border-gray-300 text-gray-900'
                    }`}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold block text-gray-700 dark:text-gray-300">Semester</label>
                  <Select
                    value={newSubjectState.semester_id}
                    onValueChange={(v) => setNewSubjectState(prev => ({ ...prev, semester_id: v }))}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select Semester" />
                    </SelectTrigger>
                    <SelectContent>
                      {semesters.map((sem: any) => (
                        <SelectItem key={sem.id} value={sem.id}>{getSemesterName(sem.number)}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold block text-gray-700 dark:text-gray-300">Course Type</label>
                  <Select
                    value={newSubjectState.subject_type}
                    onValueChange={(v) => setNewSubjectState(prev => ({ ...prev, subject_type: v }))}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select Course Type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="regular">Regular</SelectItem>
                      <SelectItem value="elective">Elective</SelectItem>
                      <SelectItem value="open_elective">Open Elective</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold block text-gray-700 dark:text-gray-300">Course Credits</label>
                  <input
                    type="number"
                    min="1"
                    max="10"
                    required
                    value={newSubjectState.credits}
                    onChange={(e) => setNewSubjectState(prev => ({ ...prev, credits: parseInt(e.target.value) || 3 }))}
                    className={`w-full px-3 py-2.5 text-sm rounded-md border shadow-sm transition-all focus:ring-2 focus:ring-purple-500/20 ${
                      theme === 'dark' ? 'bg-background border-border text-foreground' : 'bg-white border-gray-300 text-gray-900'
                    }`}
                  />
                </div>
                <DialogFooter className="pt-4 flex gap-2 justify-end">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsAddSubjectOpen(false)}
                    className={`${theme === 'dark' ? 'border-border text-foreground hover:bg-accent' : 'border-gray-300 text-gray-700 hover:bg-gray-50'}`}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={addingSubject}
                    className="bg-primary hover:bg-[#9147e0] text-white shadow-md transition-all active:scale-95"
                  >
                    {addingSubject ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                    Add Course
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>

          <Dialog open={isAddSemesterOpen} onOpenChange={setIsAddSemesterOpen}>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Add New Semester</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleAddSemester} className="space-y-4 py-2">
                <div className="space-y-2">
                  <label className="text-sm font-semibold block text-gray-700 dark:text-gray-300">Semester Number</label>
                  <input
                    type="number"
                    min="1"
                    max="8"
                    required
                    placeholder="Enter semester number (1-8)"
                    value={newSemesterNumber}
                    onChange={(e) => setNewSemesterNumber(e.target.value)}
                    className={`w-full px-3 py-2.5 text-sm rounded-md border shadow-sm transition-all focus:ring-2 focus:ring-purple-500/20 ${
                      theme === 'dark' ? 'bg-background border-border text-foreground' : 'bg-white border-gray-300 text-gray-900'
                    }`}
                  />
                </div>
                <DialogFooter className="pt-4 flex gap-2 justify-end">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsAddSemesterOpen(false)}
                    className={`${theme === 'dark' ? 'border-border text-foreground hover:bg-accent' : 'border-gray-300 text-gray-700 hover:bg-gray-50'}`}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={addingSemester}
                    className="bg-primary hover:bg-[#9147e0] text-white shadow-md transition-all active:scale-95"
                  >
                    {addingSemester ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                    Add Semester
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>

          <Dialog open={isAddSectionOpen} onOpenChange={setIsAddSectionOpen}>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Add New Section</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleAddSection} className="space-y-4 py-2">
                <div className="space-y-2">
                  <label className="text-sm font-semibold block text-gray-700 dark:text-gray-300">Section Name</label>
                  <Select
                    value={newSectionName}
                    onValueChange={setNewSectionName}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select Section" />
                    </SelectTrigger>
                    <SelectContent className={theme === 'dark' ? 'bg-card text-foreground border border-border max-h-[200px] overflow-y-auto custom-scrollbar' : 'bg-white text-gray-900 border border-gray-300 max-h-[200px] overflow-y-auto custom-scrollbar'}>
                      {["A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L", "M", "N", "O", "P", "Q", "R", "S", "T", "U", "V", "W", "X", "Y", "Z"].map((section) => (
                        <SelectItem key={section} value={section}>
                          Section {section}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <DialogFooter className="pt-4 flex gap-2 justify-end">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsAddSectionOpen(false)}
                    className={`${theme === 'dark' ? 'border-border text-foreground hover:bg-accent' : 'border-gray-300 text-gray-700 hover:bg-gray-50'}`}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={addingSection}
                    className="bg-primary hover:bg-[#9147e0] text-white shadow-md transition-all active:scale-95"
                  >
                    {addingSection ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                    Add Section
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </CardContent>
        {students.length > 0 && (
          <CardFooter className="flex flex-col sm:flex-row justify-between items-center gap-4 text-sm text-muted-foreground px-6 py-4 border-t border-border mt-auto">
            <div>
              Showing {totalStudents === 0 ? 0 : (currentPage - 1) * 50 + 1} to {Math.min(currentPage * 50, totalStudents)} of {totalStudents} students
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => loadStudents(Math.max(currentPage - 1, 1))}
                disabled={currentPage === 1 || isLoading}
                className="bg-primary hover:bg-primary/90 text-white border-primary h-9 px-4 transition-all">
                Previous
              </Button>
              <div className="flex items-center justify-center min-w-[2rem]">
                <span className={`text-sm font-semibold ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>
                  {currentPage}
                </span>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => loadStudents(Math.min(currentPage + 1, totalPages))}
                disabled={currentPage === totalPages || isLoading}
                className="bg-primary hover:bg-primary/90 text-white border-primary h-9 px-4 transition-all">
                Next
              </Button>
            </div>
          </CardFooter>
        )}
      </Card>
    </div>);

};

export default StudentEnrollment;