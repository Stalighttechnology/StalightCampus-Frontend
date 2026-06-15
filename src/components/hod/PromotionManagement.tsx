import { translateTerminology, getTerm } from "@/utils/institutionConfig";
import { useState, useEffect } from "react";
import Swal from "sweetalert2";
import { cn } from "@/lib/utils";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle } from
"../ui/card";
import { Input } from "../ui/input";
import { Button } from "../ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter } from
"../ui/dialog";
import { CheckCircle, XCircle, UserCheck, UserX, Users, ArrowRight } from "lucide-react";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue } from
"../ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow } from
"../ui/table";
import { Checkbox } from "../ui/checkbox";
import {
  getSemesters,
  manageSections,
  manageProfile,
  promoteStudentsToNextSemester,
  promoteSelectedStudents,
  demoteStudent,
  bulkDemoteStudents,
  manageStudents,
  getPromotionBootstrap,
  graduateStudents } from
"../../utils/hod_api";
import { useTheme } from "../../context/ThemeContext";
import { SkeletonTable } from "../ui/skeleton";

interface Semester {
  id: string;
  number: number;
}

interface Section {
  id: string;
  name: string;
  semester_id: string;
}

interface Student {
  usn: string;
  name: string;
  semester: string;
  section: string | null;
  batch: string | null;
}

const PromotionManagement = () => {
  const { theme } = useTheme();
  const [activeTab, setActiveTab] = useState<"overview" | "promote" | "demote">("overview");

  const renderContent = () => {
    switch (activeTab) {
      case "overview":
        return <PromotionOverview onTabChange={setActiveTab} theme={theme} />;
      case "promote":
        return <PromotionPage theme={theme} onTabChange={setActiveTab} />;
      case "demote":
        return <DemotionPage theme={theme} onTabChange={setActiveTab} />;
      default:
        return <PromotionOverview onTabChange={setActiveTab} theme={theme} />;
    }
  };

  return (
    <div id="hod-promotion-container" className="space-y-4">
      {renderContent()}
    </div>);

};

const PromotionOverview = ({ onTabChange, theme }: {onTabChange: (tab: "overview" | "promote" | "demote") => void;theme: string;}) => {
  return (
    <div className="space-y-6">
      <div id="hod-promotion-cards-wrapper" className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Promotion Card */}
        <Card className={`h-full flex flex-col ${theme === 'dark' ? 'bg-card text-foreground border-border hover:border-green-500' : 'bg-white text-gray-900 border-gray-200 hover:border-green-500'}`}>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-3 bg-green-600 rounded-lg">
                <UserCheck className="h-6 w-6 text-white" />
              </div>
              <div>
                <CardTitle className={theme === 'dark' ? 'text-foreground' : 'text-gray-900'}>Student Promotion</CardTitle>
                <p className={`text-sm ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}`}>Promote eligible students to next semester</p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col justify-between">
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className={theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}>Bulk promote students</span>
                <ArrowRight className={`h-4 w-4 ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-400'}`} />
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className={theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}>Promote selected students</span>
                <ArrowRight className={`h-4 w-4 ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-400'}`} />
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className={theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}>View promotion history</span>
                <ArrowRight className={`h-4 w-4 ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-400'}`} />
              </div>
            </div>
            <Button onClick={() => onTabChange("promote")} className="w-full mt-6 bg-green-600 hover:bg-green-700 text-white">
              Manage Promotions
            </Button>
          </CardContent>
        </Card>

        {/* Demotion Card */}
        <Card className={`h-full flex flex-col ${theme === 'dark' ? 'bg-card text-foreground border-border hover:border-red-500' : 'bg-white text-gray-900 border-gray-200 hover:border-red-500'}`}>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-3 bg-red-600 rounded-lg">
                <UserX className="h-6 w-6 text-white" />
              </div>
              <div>
                <CardTitle className={theme === 'dark' ? 'text-foreground' : 'text-gray-900'}>Student Demotion</CardTitle>
                <p className={`text-sm ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}`}>Demote students to previous semester</p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col justify-between">
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className={theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}>Individual demotion</span>
                <ArrowRight className={`h-4 w-4 ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-400'}`} />
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className={theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}>Bulk demotion</span>
                <ArrowRight className={`h-4 w-4 ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-400'}`} />
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className={theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}>Track demotion reasons</span>
                <ArrowRight className={`h-4 w-4 ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-400'}`} />
              </div>
            </div>
            <Button onClick={() => onTabChange("demote")} className="w-full mt-6 bg-red-600 hover:bg-red-700 text-white">
              Manage Demotions
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Quick Stats */}
      <Card className={theme === 'dark' ? 'bg-card text-foreground border-border' : 'bg-white text-gray-900 border-gray-200'}>
        <CardHeader>
          <CardTitle className={`flex items-center gap-2 ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>
            <Users className="h-5 w-5" />
            Quick Statistics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className={`text-center p-4 rounded-lg ${theme === 'dark' ? 'bg-muted' : 'bg-gray-100'}`}>
              <div className="text-2xl font-bold text-green-400">0</div>
              <div className={`text-sm ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}`}>Students Promoted This Month</div>
            </div>
            <div className={`text-center p-4 rounded-lg ${theme === 'dark' ? 'bg-muted' : 'bg-gray-100'}`}>
              <div className="text-2xl font-bold text-red-400">0</div>
              <div className={`text-sm ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}`}>Students Demoted This Month</div>
            </div>
            <div className={`text-center p-4 rounded-lg ${theme === 'dark' ? 'bg-muted' : 'bg-gray-100'}`}>
              <div className="text-2xl font-bold text-blue-400">0</div>
              <div className={`text-sm ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}`}>Active Operations</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );

};

const PromotionPage = ({ theme, onTabChange }: {theme: string;onTabChange: (tab: "overview" | "promote" | "demote") => void;}) => {
  const [state, setState] = useState({
    semesters: [] as Semester[],
    sections: [] as Section[],
    students: [] as Student[],
    selectedStudents: [] as string[],
    selectedSemester: "",
    selectedSection: "",
    branchId: "",
    isLoading: false,
    isPromoting: false,
    promotionResults: null as any,
    errors: [] as string[],
    // Pagination state
    currentPage: 1,
    totalPages: 1,
    totalStudents: 0,
    hasNext: false,
    hasPrevious: false,
    isSectionOpen: false
  });

  // Helper to update state
  const updateState = (newState: Partial<typeof state>) => {
    setState((prev) => ({ ...prev, ...newState }));
  };

  // Fetch initial data
  useEffect(() => {
    const fetchInitialData = async () => {
      updateState({ isLoading: true });
      try {
        const bootstrapResponse = await getPromotionBootstrap();
        if (bootstrapResponse.success && bootstrapResponse.data) {
          const { profile, semesters, sections } = bootstrapResponse.data;

          if (profile?.branch_id) {
            updateState({
              branchId: profile.branch_id,
              semesters: semesters || [],
              sections: sections || []
            });
          }
        } else {
          updateState({ errors: [bootstrapResponse.message || "Failed to fetch promotion data"] });
        }
      } catch (err) {

        updateState({ errors: ["Failed to load initial data"] });
      } finally {
        updateState({ isLoading: false });
      }
    };

    fetchInitialData();
  }, []);

  // Fetch sections when semester changes
  useEffect(() => {
    const fetchSections = async () => {
      if (!state.selectedSemester || !state.branchId) return;

      try {
        const semesterId = state.semesters.find((s) => `${s.number}th Semester` === state.selectedSemester)?.id;
        if (semesterId) {
          const sectionRes = await manageSections({ branch_id: state.branchId, semester_id: semesterId }, "GET");
          if (sectionRes.success && sectionRes.data?.length > 0) {
            updateState({
              sections: sectionRes.data.map((s: any) => ({
                id: s.id,
                name: s.name,
                semester_id: s.semester_id.toString()
              })),
              selectedSection: "",
              isSectionOpen: true
            });
          } else {
            updateState({ sections: [], selectedSection: "", isSectionOpen: true });
          }
        }
      } catch (err) {

        updateState({ errors: ["Failed to load sections"] });
      }
    };

    fetchSections();
  }, [state.selectedSemester, state.branchId, state.semesters]);

  // Fetch students when semester and section change
  useEffect(() => {
    const fetchStudents = async () => {
      if (!state.selectedSemester || !state.branchId || !state.selectedSection) {
        updateState({ students: [], selectedStudents: [] });
        return;
      }

      try {
        updateState({ isLoading: true });
        const semesterId = state.semesters.find((s) => `${s.number}th Semester` === state.selectedSemester)?.id;
        const sectionId = state.sections.find((s) => s.name === state.selectedSection)?.id;

        if (semesterId && sectionId) {
          const studentRes = await manageStudents({
            branch_id: state.branchId,
            semester_id: semesterId,
            section_id: sectionId,
            page_size: 50 // Use AdminPagination default page size
          }, "GET");

          if (studentRes.results && Array.isArray(studentRes.results)) {
            const totalPages = Math.ceil((studentRes.count || 0) / 50);
            updateState({
              students: studentRes.results,
              selectedStudents: [],
              currentPage: 1,
              totalPages: totalPages,
              totalStudents: studentRes.count || 0,
              hasNext: !!studentRes.next,
              hasPrevious: !!studentRes.previous
            });
          } else {
            updateState({ errors: ["Failed to load students"] });
          }
          // 1) { success: true, results: [...], count }
          // 2) { success: true, data: { students: [...] } }
          // 3) plain array
          let results: any[] = [];
          if (studentRes == null) {
            results = [];
          } else if (studentRes.results && Array.isArray(studentRes.results)) {
            results = studentRes.results;
          } else if (studentRes.data && Array.isArray((studentRes.data as any).students)) {
            results = (studentRes.data as any).students;
          } else if (Array.isArray(studentRes)) {
            results = studentRes as any[];
          } else if (studentRes.success === false) {
            // Backend returned an error
            updateState({ errors: [studentRes.message || "Failed to load students"] });
            results = [];
          } else {
            // Unknown shape but try to extract 'data' array
            if (studentRes.data && Array.isArray(studentRes.data)) {
              results = studentRes.data;
            } else {
              results = [];
            }
          }



          updateState({
            students: results,
            selectedStudents: []
          });
        }
      } catch (err) {

        updateState({ errors: ["Failed to load students"] });
      } finally {
        updateState({ isLoading: false });
      }
    };

    fetchStudents();
  }, [state.selectedSemester, state.selectedSection, state.branchId, state.semesters, state.sections]);

  // Handle individual student selection
  const handleStudentSelect = (usn: string, checked: boolean) => {
    if (checked) {
      updateState({ selectedStudents: [...state.selectedStudents, usn] });
    } else {
      updateState({ selectedStudents: state.selectedStudents.filter((id) => id !== usn) });
    }
  };

  // Handle select all students
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      updateState({ selectedStudents: state.students.map((student) => student.usn) });
    } else {
      updateState({ selectedStudents: [] });
    }
  };

  // Handle page change
  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= state.totalPages) {
      fetchStudentsPage(newPage);
    }
  };

  // Function to fetch students for a specific page
  const fetchStudentsPage = async (page: number = 1) => {
    try {
      updateState({ isLoading: true });
      const semesterId = state.semesters.find((s) => `${s.number}th Semester` === state.selectedSemester)?.id;
      const sectionId = state.sections.find((s) => s.name === state.selectedSection)?.id;

      if (semesterId && sectionId) {
        const studentRes = await manageStudents({
          branch_id: state.branchId,
          semester_id: semesterId,
          section_id: sectionId,
          page: page,
          page_size: 50 // Use AdminPagination default page size
        }, "GET");

        if (studentRes.results && Array.isArray(studentRes.results)) {
          const totalPages = Math.ceil((studentRes.count || 0) / 50);
          updateState({
            students: studentRes.results,
            selectedStudents: [],
            currentPage: page,
            totalPages: totalPages,
            totalStudents: studentRes.count || 0,
            hasNext: !!studentRes.next,
            hasPrevious: !!studentRes.previous
          });
        } else {
          updateState({ errors: ["Failed to load students"] });
        }
      }
    } catch (err) {

      updateState({ errors: ["Failed to load students"] });
    } finally {
      updateState({ isLoading: false });
    }
  };

  // Promote selected students
  const handlePromoteSelectedStudents = async () => {
    if (!state.selectedSemester || !state.branchId) {
      updateState({ errors: ["Please select a semester"] });
      return;
    }

    const currentSemesterId = state.semesters.find((s) => `${s.number}th Semester` === state.selectedSemester)?.id;
    const currentSemesterNumber = state.semesters.find((s) => s.id === currentSemesterId)?.number || 0;
    const isGraduation = currentSemesterNumber === 8;
    const nextSemester = state.semesters.find((s) => s.number === currentSemesterNumber + 1);

    if (!currentSemesterId || (!nextSemester && !isGraduation)) {
      updateState({ errors: ["No next semester available"] });
      return;
    }

    // Optimistic update: immediately remove promoted students from the list
    const studentsToPromote = state.selectedStudents.length > 0 && state.selectedStudents.length < state.students.length ?
    state.students.filter((student) => state.selectedStudents.includes(student.usn)) :
    state.students;

    const confirmRes = await Swal.fire({
      title: 'Are you sure?',
      html: isGraduation ?
        `You are about to graduate ${studentsToPromote.length} student(s).<br><br><b class="text-red-500">Warning:</b> Once graduated, their current semester attendance and marks will be archived, and their login access will be revoked.` :
        `You are about to promote ${studentsToPromote.length} student(s) to Semester ${nextSemester?.number}.<br><br><b class="text-red-500">Warning:</b> Once promoted, their current semester attendance and marks will be archived, and they will be shifted to the next semester.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Yes, proceed',
      cancelButtonText: 'Cancel',
      background: theme === 'dark' ? '#0f172a' : '#fff',
      color: theme === 'dark' ? '#fff' : '#000'
    });

    if (!confirmRes.isConfirmed) {
      return;
    }

    const keyword = isGraduation ? 'GRADUATE' : 'PROMOTE';
    const typedConfirm = await Swal.fire({
      title: 'Confirm Action',
      text: `To confirm, type "${keyword}" in the box below:`,
      input: 'text',
      inputPlaceholder: keyword,
      showCancelButton: true,
      confirmButtonText: isGraduation ? 'Confirm Graduation' : 'Confirm Promotion',
      background: theme === 'dark' ? '#0f172a' : '#fff',
      color: theme === 'dark' ? '#fff' : '#000',
      inputValidator: (value) => {
        if (value !== keyword) {
          return `You must type "${keyword}" to confirm!`;
        }
      }
    });

    if (!typedConfirm.isConfirmed) {
      return;
    }

    updateState({
      students: state.students.filter((student) => !state.selectedStudents.includes(student.usn)),
      selectedStudents: [],
      promotionResults: {
        message: isGraduation ? `${studentsToPromote.length} students graduated successfully` : `${studentsToPromote.length} students promoted successfully`,
        promoted: studentsToPromote.map((student) => ({
          name: student.name,
          usn: student.usn,
          to_semester: isGraduation ? 'Alumni' : nextSemester?.number
        }))
      }
    });

    try {
      let res;
      if (isGraduation) {
        res = await graduateStudents({ student_ids: state.selectedStudents });
        // The API returns graduated_students instead of promoted, map it for consistency
        if (res.success) {
          res.promoted = res.data?.graduated_students || [];
          res.failed = res.data?.failed_students || [];
        }
      } else if (state.selectedStudents.length > 0 && state.selectedStudents.length < state.students.length) {
        // Promote selected students
        res = await promoteSelectedStudents({
          student_ids: state.selectedStudents,
          to_semester_id: nextSemester?.id as string,
          branch_id: state.branchId
        });
      } else {
        // Bulk promotion
        const sectionId = state.selectedSection ?
        state.sections.find((s) => s.name === state.selectedSection)?.id :
        undefined;

        res = await promoteStudentsToNextSemester({
          from_semester_id: currentSemesterId, // Pass as string
          to_semester_id: nextSemester?.id as string, // Pass as string
          branch_id: state.branchId,
          ...(sectionId && { section_id: sectionId })
        });
      }

      if (res.success) {
        // Update with actual results from backend
        const successfulPromotions = res.promoted || [];
        const failedPromotions = res.failed || [];

        updateState({
          students: state.students.filter((student) =>
          !successfulPromotions.some((p) => p.usn === student.usn)
          ),
          selectedStudents: [],
          promotionResults: null
        });

        Swal.fire({
          icon: 'success',
          title: 'Promotion Success',
          text: res.message || `${successfulPromotions.length} students promoted successfully${failedPromotions.length > 0 ? `, ${failedPromotions.length} failed` : ''}`,
          background: theme === 'dark' ? '#0f172a' : '#fff',
          color: theme === 'dark' ? '#fff' : '#000'
        });
      } else {
        // Revert optimistic update on failure
        updateState({
          students: [...state.students, ...studentsToPromote],
          selectedStudents: state.selectedStudents.length > 0 ? state.selectedStudents : studentsToPromote.map((s) => s.usn),
          promotionResults: null
        });

        Swal.fire({
          icon: 'error',
          title: 'Promotion Failed',
          text: res.message || "Failed to promote students",
          background: theme === 'dark' ? '#0f172a' : '#fff',
          color: theme === 'dark' ? '#fff' : '#000'
        });
      }
    } catch (err) {

      // Revert optimistic update on error
      updateState({
        students: [...state.students, ...studentsToPromote],
        selectedStudents: state.selectedStudents.length > 0 ? state.selectedStudents : studentsToPromote.map((s) => s.usn),
        promotionResults: null
      });

      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: "Failed to promote students due to a network or server error",
        background: theme === 'dark' ? '#0f172a' : '#fff',
        color: theme === 'dark' ? '#fff' : '#000'
      });
    }
  };

  // Promote all students in selected semester/section
  const promoteAllStudents = async () => {
    if (!state.selectedSemester || !state.branchId) {
      updateState({ errors: ["Please select a semester"] });
      return;
    }

    const currentSemesterId = state.semesters.find((s) => `${s.number}th Semester` === state.selectedSemester)?.id;
    const nextSemester = state.semesters.find((s) => s.number === (state.semesters.find((s) => s.id === currentSemesterId)?.number || 0) + 1);

    if (!currentSemesterId || !nextSemester) {
      updateState({ errors: ["No next semester available"] });
      return;
    }

    // Optimistic update: immediately clear the student list and show success
    const allStudents = [...state.students];

    const confirmRes = await Swal.fire({
      title: 'Are you sure?',
      html: `You are about to promote ALL ${allStudents.length} student(s) in this section to Semester ${nextSemester.number}.<br><br><b class="text-red-500">Warning:</b> Once promoted, their current semester attendance and marks will be archived, and they will be shifted to the next semester.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Yes, proceed',
      cancelButtonText: 'Cancel',
      background: theme === 'dark' ? '#0f172a' : '#fff',
      color: theme === 'dark' ? '#fff' : '#000'
    });

    if (!confirmRes.isConfirmed) {
      return;
    }

    const typedConfirm = await Swal.fire({
      title: 'Confirm Action',
      text: 'To confirm, type "PROMOTE" in the box below:',
      input: 'text',
      inputPlaceholder: 'PROMOTE',
      showCancelButton: true,
      confirmButtonText: 'Confirm Bulk Promotion',
      background: theme === 'dark' ? '#0f172a' : '#fff',
      color: theme === 'dark' ? '#fff' : '#000',
      inputValidator: (value) => {
        if (value !== 'PROMOTE') {
          return 'You must type "PROMOTE" to confirm!';
        }
      }
    });

    if (!typedConfirm.isConfirmed) {
      return;
    }

    updateState({
      students: [],
      selectedStudents: [],
      promotionResults: {
        message: `${allStudents.length} students promoted successfully`,
        promoted: allStudents.map((student) => ({
          name: student.name,
          usn: student.usn,
          to_semester: nextSemester.number
        }))
      }
    });

    try {
      const sectionId = state.selectedSection ?
      state.sections.find((s) => s.name === state.selectedSection)?.id :
      undefined;

      const res = await promoteStudentsToNextSemester({
        from_semester_id: currentSemesterId, // Pass as string
        to_semester_id: nextSemester.id, // Pass as string
        branch_id: state.branchId,
        ...(sectionId && { section_id: sectionId })
      });

      if (res.success) {
        // Update with actual results from backend
        const successfulPromotions = res.promoted || [];
        const failedPromotions = res.failed || [];

        updateState({
          students: allStudents.filter((student) =>
          !successfulPromotions.some((p) => p.usn === student.usn)
          ),
          selectedStudents: [],
          promotionResults: null
        });

        Swal.fire({
          icon: 'success',
          title: 'Promotion Success',
          text: res.message || `${successfulPromotions.length} students promoted successfully${failedPromotions.length > 0 ? `, ${failedPromotions.length} failed` : ''}`,
          background: theme === 'dark' ? '#0f172a' : '#fff',
          color: theme === 'dark' ? '#fff' : '#000'
        });
      } else {
        // Revert optimistic update on failure
        updateState({
          students: allStudents,
          selectedStudents: [],
          promotionResults: null
        });

        Swal.fire({
          icon: 'error',
          title: 'Promotion Failed',
          text: res.message || "Failed to promote students",
          background: theme === 'dark' ? '#0f172a' : '#fff',
          color: theme === 'dark' ? '#fff' : '#000'
        });
      }
    } catch (err) {

      // Revert optimistic update on error
      updateState({
        students: allStudents,
        selectedStudents: [],
        promotionResults: null
      });

      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: "Failed to promote students due to a network or server error",
        background: theme === 'dark' ? '#0f172a' : '#fff',
        color: theme === 'dark' ? '#fff' : '#000'
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className={theme === 'dark' ? 'bg-card text-foreground border-border' : 'bg-white text-gray-900 border-gray-200'}>
        <CardHeader className="px-3 sm:px-6 py-3 sm:py-4">
          <CardTitle className={`flex flex-row items-center justify-between gap-2 w-full ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>
            <span className="flex items-center gap-2 whitespace-nowrap text-xl sm:text-lg">
              <UserCheck className="h-5 w-5 text-green-400 shrink-0" />
              Student Promotion
            </span>
            <Button
              onClick={() => onTabChange("overview")}
              variant="outline"
              size="sm"
              className="bg-primary text-white border-primary hover:bg-primary/90 hover:border-primary/90 hover:text-white transition-all duration-200 shadow-md text-xs sm:text-sm shrink-0">
              <span className="hidden sm:inline">Back to Overview</span>
              <span className="inline sm:hidden">Back</span>
            </Button>
          </CardTitle>
        </CardHeader>
      </Card>


      {/* Promotion Controls */}
      <Card className={theme === 'dark' ? 'bg-card text-foreground border-border' : 'bg-white text-gray-900 border-gray-200'}>
        <CardHeader>
          <CardTitle className={`text-lg ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>Promote Students to Next Semester</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full">
            <Select
              value={state.selectedSemester}
              onValueChange={(value) => updateState({ selectedSemester: value, selectedSection: "", isSectionOpen: false })}
              disabled={state.isLoading}>
              
              <SelectTrigger className={theme === 'dark' ? 'w-full bg-background text-foreground border-border' : 'w-full bg-white text-gray-900 border-gray-300'}>
                <SelectValue placeholder={translateTerminology("Select Semester")} />
              </SelectTrigger>
              <SelectContent className={cn("max-h-[200px]", theme === 'dark' ? 'bg-background text-foreground border-border' : 'bg-white text-gray-900 border-gray-300')}>
                {state.semesters.length === 0 ? (
                  <SelectItem value="none" disabled className="text-muted-foreground">No Semester</SelectItem>
                ) : (
                  state.semesters.map((semester) => (
                    <SelectItem key={semester.id} value={`${semester.number}th Semester`} className={theme === 'dark' ? 'focus:bg-accent' : 'focus:bg-gray-100'}>
                      Semester {semester.number}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>

            <Select
              value={state.selectedSection}
              onValueChange={(value) => updateState({ selectedSection: value })}
              {...({ open: state.isSectionOpen, onOpenChange: (open: boolean) => updateState({ isSectionOpen: open }) } as any)}
              disabled={state.isLoading || !state.selectedSemester}>
              
              <SelectTrigger className={theme === 'dark' ? 'w-full bg-background text-foreground border-border' : 'w-full bg-white text-gray-900 border-gray-300'}>
                <SelectValue placeholder="Select Section" />
              </SelectTrigger>
              <SelectContent className={cn("max-h-[200px]", theme === 'dark' ? 'bg-background text-foreground border-border' : 'bg-white text-gray-900 border-gray-300')}>
                {(() => {
                  const semesterId = state.semesters.find((s) => `${s.number}th Semester` === state.selectedSemester)?.id;
                  const filteredSections = state.sections.filter((section) => semesterId ? section.semester_id === semesterId : false);
                  if (filteredSections.length === 0) {
                    return <SelectItem value="none" disabled className="text-muted-foreground">No Section</SelectItem>;
                  }
                  return filteredSections.map((section) => (
                    <SelectItem key={section.id} value={section.name} className={theme === 'dark' ? 'focus:bg-accent' : 'focus:bg-gray-100'}>
                      Section {section.name}
                    </SelectItem>
                  ));
                })()}
              </SelectContent>
            </Select>


          </div>
        </CardContent>
      </Card>

      {state.isLoading && state.students.length === 0 &&
      <Card className="p-6">
          <SkeletonTable rows={10} cols={6} />
        </Card>
      }

      {/* Student List */}
      {state.students.length > 0 ?
      <Card className={theme === 'dark' ? 'bg-card text-foreground border-border' : 'bg-white text-gray-900 border-gray-200'}>
          <CardHeader>
            <CardTitle className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>
              <span className="flex items-center gap-2">
                <Users className="h-5 w-5 text-blue-400" />
                <span className="text-xl sm:text-semibold md:text-lg">Students in {state.selectedSemester} - {state.selectedSection}</span>
              </span>
              <div className="flex items-center justify-between sm:justify-end gap-3 w-full sm:w-auto border-t sm:border-t-0 pt-3 sm:pt-0">
                <div className="flex items-center gap-2">
                  <Checkbox
                  id="select-all-students"
                  checked={state.selectedStudents.length === state.students.length && state.students.length > 0}
                  onCheckedChange={handleSelectAll}
                  className={theme === 'dark' ? 'border-border' : 'border-gray-300'} />
                
                  <label htmlFor="select-all-students" className={`text-sm cursor-pointer whitespace-nowrap ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}`}>
                    Select All
                  </label>
                </div>
                <Button
                onClick={handlePromoteSelectedStudents}
                disabled={state.isPromoting || state.selectedStudents.length === 0}
                className={`flex-1 sm:flex-none ${state.selectedSemester === '8th Semester' ? 'bg-purple-600 hover:bg-purple-700' : 'bg-green-600 hover:bg-green-700'} text-white h-9 px-4`}
                size="sm">
                
                  <UserCheck className="h-4 w-4 mr-2" />
                  <span className="whitespace-nowrap">{state.selectedSemester === '8th Semester' ? 'Graduate' : 'Promote'} ({state.selectedStudents.length})</span>
                </Button>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className={theme === 'dark' ? 'border-border' : 'border-gray-200'}>
                    <TableHead className={theme === 'dark' ? 'text-foreground' : 'text-gray-900'}>Select</TableHead>
                    <TableHead className={theme === 'dark' ? 'text-foreground' : 'text-gray-900'}>USN</TableHead>
                    <TableHead className={theme === 'dark' ? 'text-foreground' : 'text-gray-900'}>Name</TableHead>
                    <TableHead className={theme === 'dark' ? 'text-foreground' : 'text-gray-900'}>Batch</TableHead>
                    <TableHead className={theme === 'dark' ? 'text-foreground' : 'text-gray-900'}>Section</TableHead>
                    <TableHead className={theme === 'dark' ? 'text-foreground' : 'text-gray-900'}>Sem</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {state.students.map((student, index) =>
                <TableRow key={`${student.usn}-${index}`} className={theme === 'dark' ? 'border-border' : 'border-gray-200'}>
                      <TableCell>
                        <Checkbox
                      checked={state.selectedStudents.includes(student.usn)}
                      onCheckedChange={(checked) => handleStudentSelect(student.usn, checked as boolean)}
                      className={theme === 'dark' ? 'border-border' : 'border-gray-300'} />
                    
                      </TableCell>
                      <TableCell className={`whitespace-nowrap ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>{student.usn}</TableCell>
                      <TableCell className={`whitespace-nowrap ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>{student.name}</TableCell>
                      <TableCell className={`whitespace-nowrap ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>{student.batch}</TableCell>
                      <TableCell className={`whitespace-nowrap ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>{student.section || 'N/A'}</TableCell>
                      <TableCell className={`whitespace-nowrap ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>{student.semester}</TableCell>
                    </TableRow>
                )}
                </TableBody>
              </Table>

              {/* Pagination Controls */}
              {state.totalPages > 1 &&
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mt-6">
                  <div className={`text-sm ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-600'}`}>
                    Showing {Math.min((state.currentPage - 1) * 50 + 1, state.totalStudents)} to {Math.min(state.currentPage * 50, state.totalStudents)} of {state.totalStudents}
                  </div>
                  <div className="flex gap-2 items-center justify-center sm:justify-end">
                    <Button
                  onClick={() => handlePageChange(state.currentPage - 1)}
                  disabled={!state.hasPrevious || state.isLoading}
                  variant="outline"
                  className="text-base font-medium px-4 py-2 text-white bg-primary border-primary hover:bg-primary/90 hover:border-primary/90 hover:text-white shadow-sm transition-all duration-200">
                  
                      Prev
                    </Button>
                    <span className="px-3 text-base font-medium text-primary">
                      {state.currentPage}
                    </span>
                    <Button
                  onClick={() => handlePageChange(state.currentPage + 1)}
                  disabled={!state.hasNext || state.isLoading}
                  variant="outline"
                  className="text-base font-medium px-4 py-2 text-white bg-primary border-primary hover:bg-primary/90 hover:border-primary/90 hover:text-white shadow-sm transition-all duration-200">
                  
                      Next
                    </Button>
                  </div>
                </div>
            }
            </div>
          </CardContent>
        </Card> :
      !state.isLoading &&
      <Card className={`border-2 border-dashed flex flex-col items-center justify-center p-12 text-center space-y-4 ${theme === 'dark' ? 'border-border bg-accent/5' : 'border-gray-200 bg-gray-50/50'}`
      }>
          <div className={`p-4 rounded-full ${theme === 'dark' ? 'bg-accent/10' : 'bg-primary/10'}`}>
            <Users className={`w-10 h-10 ${theme === 'dark' ? 'text-primary/70' : 'text-primary/70'}`} />
          </div>
          <div className="max-w-xs mx-auto">
            <h3 className={`text-lg font-bold ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>
              No Students to Display
            </h3>
            <p className={`text-sm mt-1 ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}`}>
              Please select a semester and section to view students eligible for promotion.
            </p>
          </div>
        </Card>
      }
    </div>);

};

const DemotionPage = ({ theme, onTabChange }: {theme: string;onTabChange: (tab: "overview" | "promote" | "demote") => void;}) => {
  const [state, setState] = useState({
    semesters: [] as Semester[],
    sections: [] as Section[],
    students: [] as Student[],
    selectedStudents: [] as string[],
    selectedSemester: "",
    selectedSection: "",
    branchId: "",
    isLoading: false,
    isDemoting: false,
    showBulkDemoteDialog: false,
    bulkDemoteReason: "",
    demotionResults: null as any,
    errors: [] as string[],
    // Pagination state
    currentPage: 1,
    totalPages: 1,
    totalStudents: 0,
    hasNext: false,
    hasPrevious: false,
    isSectionOpen: false
  });

  // Helper to update state
  const updateState = (newState: Partial<typeof state>) => {
    setState((prev) => ({ ...prev, ...newState }));
  };

  // Fetch initial data
  useEffect(() => {
    const fetchInitialData = async () => {
      updateState({ isLoading: true });
      try {
        const bootstrapResponse = await getPromotionBootstrap();
        if (bootstrapResponse.success && bootstrapResponse.data) {
          const { profile, semesters, sections } = bootstrapResponse.data;

          if (profile?.branch_id) {
            updateState({
              branchId: profile.branch_id,
              semesters: semesters || [],
              sections: sections || []
            });
          }
        } else {
          updateState({ errors: [bootstrapResponse.message || "Failed to fetch demotion data"] });
        }
      } catch (err) {

        updateState({ errors: ["Failed to load initial data"] });
      } finally {
        updateState({ isLoading: false });
      }
    };

    fetchInitialData();
  }, []);

  // Fetch sections when semester changes
  useEffect(() => {
    const fetchSections = async () => {
      if (!state.selectedSemester || !state.branchId) return;

      try {
        const semesterId = state.semesters.find((s) => `${s.number}th Semester` === state.selectedSemester)?.id;
        if (semesterId) {
          const sectionRes = await manageSections({ branch_id: state.branchId, semester_id: semesterId }, "GET");
          if (sectionRes.success && sectionRes.data?.length > 0) {
            updateState({
              sections: sectionRes.data.map((s: any) => ({
                id: s.id,
                name: s.name,
                semester_id: s.semester_id.toString()
              })),
              selectedSection: "",
              isSectionOpen: true
            });
          } else {
            updateState({ sections: [], selectedSection: "", isSectionOpen: true });
          }
        }
      } catch (err) {

        updateState({ errors: ["Failed to load sections"] });
      }
    };

    fetchSections();
  }, [state.selectedSemester, state.branchId, state.semesters]);

  // Fetch students when semester and section change
  useEffect(() => {
    const fetchStudents = async () => {
      if (!state.selectedSemester || !state.branchId || !state.selectedSection) {
        updateState({ students: [], selectedStudents: [] });
        return;
      }

      try {
        updateState({ isLoading: true });
        const semesterId = state.semesters.find((s) => `${s.number}th Semester` === state.selectedSemester)?.id;
        const sectionId = state.sections.find((s) => s.name === state.selectedSection)?.id;

        if (semesterId && sectionId) {
          const studentRes = await manageStudents({
            branch_id: state.branchId,
            semester_id: semesterId,
            section_id: sectionId,
            page_size: 50 // Use AdminPagination default page size
          }, "GET");

          if (studentRes.results && Array.isArray(studentRes.results)) {
            const totalPages = Math.ceil((studentRes.count || 0) / 50);
            updateState({
              students: studentRes.results,
              selectedStudents: [],
              currentPage: 1,
              totalPages: totalPages,
              totalStudents: studentRes.count || 0,
              hasNext: !!studentRes.next,
              hasPrevious: !!studentRes.previous
            });
          } else {
            updateState({ errors: ["Failed to load students"] });
          }
          // 1) { success: true, results: [...], count }
          // 2) { success: true, data: { students: [...] } }
          // 3) plain array
          let results: any[] = [];
          if (studentRes == null) {
            results = [];
          } else if (studentRes.results && Array.isArray(studentRes.results)) {
            results = studentRes.results;
          } else if (studentRes.data && Array.isArray((studentRes.data as any).students)) {
            results = (studentRes.data as any).students;
          } else if (Array.isArray(studentRes)) {
            results = studentRes as any[];
          } else if (studentRes.success === false) {
            // Backend returned an error
            updateState({ errors: [studentRes.message || "Failed to load students"] });
            results = [];
          } else {
            // Unknown shape but try to extract 'data' array
            if (studentRes.data && Array.isArray(studentRes.data)) {
              results = studentRes.data;
            } else {
              results = [];
            }
          }



          updateState({
            students: results,
            selectedStudents: []
          });
        }
      } catch (err) {

        updateState({ errors: ["Failed to load students"] });
      } finally {
        updateState({ isLoading: false });
      }
    };

    fetchStudents();
  }, [state.selectedSemester, state.selectedSection, state.branchId, state.semesters, state.sections]);

  // Handle individual student selection
  const handleStudentSelect = (usn: string, checked: boolean) => {
    if (checked) {
      updateState({ selectedStudents: [...state.selectedStudents, usn] });
    } else {
      updateState({ selectedStudents: state.selectedStudents.filter((id) => id !== usn) });
    }
  };

  // Handle select all students
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      updateState({ selectedStudents: state.students.map((student) => student.usn) });
    } else {
      updateState({ selectedStudents: [] });
    }
  };

  // Handle page change
  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= state.totalPages) {
      fetchStudentsPage(newPage);
    }
  };

  // Function to fetch students for a specific page
  const fetchStudentsPage = async (page: number = 1) => {
    try {
      updateState({ isLoading: true });
      const semesterId = state.semesters.find((s) => `${s.number}th Semester` === state.selectedSemester)?.id;
      const sectionId = state.sections.find((s) => s.name === state.selectedSection)?.id;

      if (semesterId && sectionId) {
        const studentRes = await manageStudents({
          branch_id: state.branchId,
          semester_id: semesterId,
          section_id: sectionId,
          page: page,
          page_size: 50 // Use AdminPagination default page size
        }, "GET");

        if (studentRes.results && Array.isArray(studentRes.results)) {
          const totalPages = Math.ceil((studentRes.count || 0) / 50);
          updateState({
            students: studentRes.results,
            selectedStudents: [],
            currentPage: page,
            totalPages: totalPages,
            totalStudents: studentRes.count || 0,
            hasNext: !!studentRes.next,
            hasPrevious: !!studentRes.previous
          });
        } else {
          updateState({ errors: ["Failed to load students"] });
        }
      }
    } catch (err) {

      updateState({ errors: ["Failed to load students"] });
    } finally {
      updateState({ isLoading: false });
    }
  };

  // Bulk demote students
  const bulkDemoteAllStudents = async () => {
    if (!state.selectedSemester || !state.branchId || !state.bulkDemoteReason.trim()) {
      updateState({ errors: ["Please select a semester and provide a reason for demotion"] });
      return;
    }

    const currentSemesterId = state.semesters.find((s) => `${s.number}th Semester` === state.selectedSemester)?.id;
    const prevSemester = state.semesters.find((s) => s.number === (state.semesters.find((s) => s.id === currentSemesterId)?.number || 0) - 1);

    if (!currentSemesterId || !prevSemester) {
      updateState({ errors: ["No previous semester available"] });
      return;
    }

    // Optimistic update: immediately remove demoted students from the list
    const studentsToDemote = state.selectedStudents.length > 0 ? state.students.filter((student) => state.selectedStudents.includes(student.usn)) : state.students;

    const confirmRes = await Swal.fire({
      title: 'Are you sure?',
      html: `You are about to demote ${studentsToDemote.length} student(s) to Semester ${prevSemester.number}.<br><br><b class="text-red-500">Warning:</b> Once demoted, they will be returned to the previous semester and their current semester data will be adjusted.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Yes, proceed',
      cancelButtonText: 'Cancel',
      background: theme === 'dark' ? '#0f172a' : '#fff',
      color: theme === 'dark' ? '#fff' : '#000'
    });

    if (!confirmRes.isConfirmed) {
      return;
    }

    const typedConfirm = await Swal.fire({
      title: 'Confirm Action',
      text: 'To confirm, type "DEMOTE" in the box below:',
      input: 'text',
      inputPlaceholder: 'DEMOTE',
      showCancelButton: true,
      confirmButtonText: 'Confirm Demotion',
      background: theme === 'dark' ? '#0f172a' : '#fff',
      color: theme === 'dark' ? '#fff' : '#000',
      inputValidator: (value) => {
        if (value !== 'DEMOTE') {
          return 'You must type "DEMOTE" to confirm!';
        }
      }
    });

    if (!typedConfirm.isConfirmed) {
      return;
    }

    updateState({
      students: state.students.filter((student) => !state.selectedStudents.includes(student.usn)),
      selectedStudents: [],
      showBulkDemoteDialog: false,
      bulkDemoteReason: "",
      isDemoting: true
    });

    try {
      const sectionId = state.selectedSection ?
      state.sections.find((s) => s.name === state.selectedSection)?.id :
      undefined;

      const res = await bulkDemoteStudents({
        student_ids: state.selectedStudents.length > 0 ? state.selectedStudents : studentsToDemote.map((s) => s.usn),
        to_semester_id: prevSemester.id, // Pass as string
        branch_id: state.branchId,
        reason: state.bulkDemoteReason,
        ...(sectionId && { section_id: sectionId })
      });

      if (res.success) {
        // Update with actual API response data
        const apiData = res.data || {};
        const demotedCount = apiData.demoted_count || 0;

        // Only keep students removed if some were actually demoted
        if (demotedCount === 0) {
          // Revert the optimistic removal since no students were demoted
          updateState({
            students: [...state.students, ...studentsToDemote],
            selectedStudents: state.selectedStudents.length > 0 ? state.selectedStudents : studentsToDemote.map((s) => s.usn)
          });
        }

        updateState({
          demotionResults: null
        });

        Swal.fire({
          icon: 'success',
          title: 'Demotion Success',
          text: res.message || `${demotedCount} students demoted successfully`,
          background: theme === 'dark' ? '#0f172a' : '#fff',
          color: theme === 'dark' ? '#fff' : '#000'
        });
      } else {
        // Revert optimistic update on failure
        updateState({
          students: [...state.students, ...studentsToDemote],
          selectedStudents: state.selectedStudents.length > 0 ? state.selectedStudents : studentsToDemote.map((s) => s.usn),
          showBulkDemoteDialog: true,
          bulkDemoteReason: state.bulkDemoteReason,
          demotionResults: null
        });

        Swal.fire({
          icon: 'error',
          title: 'Demotion Failed',
          text: res.message || "Failed to demote students",
          background: theme === 'dark' ? '#0f172a' : '#fff',
          color: theme === 'dark' ? '#fff' : '#000'
        });
      }
    } catch (err) {

      // Revert optimistic update on error
      updateState({
        students: [...state.students, ...studentsToDemote],
        selectedStudents: state.selectedStudents.length > 0 ? state.selectedStudents : studentsToDemote.map((s) => s.usn),
        showBulkDemoteDialog: true,
        bulkDemoteReason: state.bulkDemoteReason,
        demotionResults: null
      });

      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: "Failed to demote students due to a network or server error",
        background: theme === 'dark' ? '#0f172a' : '#fff',
        color: theme === 'dark' ? '#fff' : '#000'
      });
    } finally {
      updateState({ isDemoting: false });
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className={theme === 'dark' ? 'bg-card text-foreground border-border' : 'bg-white text-gray-900 border-gray-200'}>
        <CardHeader className="px-3 sm:px-6 py-3 sm:py-4">
          <CardTitle className={`flex flex-row items-center justify-between gap-2 w-full ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>
            <span className="flex items-center gap-2 whitespace-nowrap text-xl sm:text-lg">
              <UserX className="h-5 w-5 text-red-400 shrink-0" />
              Student Demotion
            </span>
            <Button
              onClick={() => onTabChange("overview")}
              variant="outline"
              size="sm"
              className="bg-primary text-white border-primary hover:bg-primary/90 hover:border-primary/90 hover:text-white transition-all duration-200 shadow-md text-xs sm:text-sm shrink-0">
              <span className="hidden sm:inline">Back to Overview</span>
              <span className="inline sm:hidden">Back</span>
            </Button>
          </CardTitle>
        </CardHeader>
      </Card>


      {/* Demotion Controls */}
      <Card className={theme === 'dark' ? 'bg-card text-foreground border-border' : 'bg-white text-gray-900 border-gray-200'}>
        <CardHeader>
          <CardTitle className={`text-lg ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>Demote Students to Previous Semester</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full">
              <Select
                value={state.selectedSemester}
                onValueChange={(value) => updateState({ selectedSemester: value, selectedSection: "", isSectionOpen: false })}
                disabled={state.isLoading}>
                
                <SelectTrigger className={theme === 'dark' ? 'w-full bg-background text-foreground border-border' : 'w-full bg-white text-gray-900 border-gray-300'}>
                  <SelectValue placeholder={translateTerminology("Select Semester")} />
                </SelectTrigger>
                <SelectContent className={cn("max-h-[200px]", theme === 'dark' ? 'bg-background text-foreground border-border' : 'bg-white text-gray-900 border-gray-300')}>
                  {state.semesters.length === 0 ? (
                    <SelectItem value="none" disabled className="text-muted-foreground">No Semester</SelectItem>
                  ) : (
                    state.semesters.map((semester) => (
                      <SelectItem key={semester.id} value={`${semester.number}th Semester`} className={theme === 'dark' ? 'focus:bg-accent' : 'focus:bg-gray-100'}>
                        Semester {semester.number}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>

              <Select
                value={state.selectedSection}
                onValueChange={(value) => updateState({ selectedSection: value })}
                {...({ open: state.isSectionOpen, onOpenChange: (open: boolean) => updateState({ isSectionOpen: open }) } as any)}
                disabled={state.isLoading || !state.selectedSemester}>
                
                <SelectTrigger className={theme === 'dark' ? 'w-full bg-background text-foreground border-border' : 'w-full bg-white text-gray-900 border-gray-300'}>
                  <SelectValue placeholder="Select Section" />
                </SelectTrigger>
                <SelectContent className={cn("max-h-[200px]", theme === 'dark' ? 'bg-background text-foreground border-border' : 'bg-white text-gray-900 border-gray-300')}>
                  {(() => {
                    const semesterId = state.semesters.find((s) => `${s.number}th Semester` === state.selectedSemester)?.id;
                    const filteredSections = state.sections.filter((section) => semesterId ? section.semester_id === semesterId : false);
                    if (filteredSections.length === 0) {
                      return <SelectItem value="none" disabled className="text-muted-foreground">No Section</SelectItem>;
                    }
                    return filteredSections.map((section) => (
                      <SelectItem key={section.id} value={section.name} className={theme === 'dark' ? 'focus:bg-accent' : 'focus:bg-gray-100'}>
                        Section {section.name}
                      </SelectItem>
                    ));
                  })()}
                </SelectContent>
              </Select>
            </div>

            <Button
              onClick={() => updateState({ showBulkDemoteDialog: true })}
              disabled={!state.selectedSemester}
              className="w-full sm:w-auto self-start"
              variant="destructive">
              <Users className="h-4 w-4 mr-2" />
              Bulk Demote Students
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Student List */}
      {state.students.length > 0 ?
      <Card className={theme === 'dark' ? 'bg-card text-foreground border-border' : 'bg-white text-gray-900 border-gray-200'}>
          <CardHeader>
            <CardTitle className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>
              <span className="flex items-center gap-2">
                <Users className="h-5 w-5 text-red-400" />
                <span className="text-xl sm:text-semibold md:text-lg">Students in {state.selectedSemester} - {state.selectedSection}</span>
              </span>
              <div className="flex items-center justify-between sm:justify-end gap-3 w-full sm:w-auto border-t sm:border-t-0 pt-3 sm:pt-0">
                <div className="flex items-center gap-2">
                  <Checkbox
                  id="select-all-students-demote"
                  checked={state.selectedStudents.length === state.students.length && state.students.length > 0}
                  onCheckedChange={handleSelectAll}
                  className={theme === 'dark' ? 'border-border' : 'border-gray-300'} />
                
                  <label htmlFor="select-all-students-demote" className={`text-sm cursor-pointer whitespace-nowrap ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}`}>
                    Select All
                  </label>
                </div>
                <Button
                onClick={() => updateState({ showBulkDemoteDialog: true })}
                disabled={state.selectedStudents.length === 0}
                variant="destructive"
                size="sm"
                className="flex-1 sm:flex-none h-9 px-4">
                
                  <UserX className="h-4 w-4 mr-2" />
                  <span className="whitespace-nowrap">Demote ({state.selectedStudents.length})</span>
                </Button>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className={theme === 'dark' ? 'border-border' : 'border-gray-200'}>
                    <TableHead className={theme === 'dark' ? 'text-foreground' : 'text-gray-900'}>Select</TableHead>
                    <TableHead className={theme === 'dark' ? 'text-foreground' : 'text-gray-900'}>USN</TableHead>
                    <TableHead className={theme === 'dark' ? 'text-foreground' : 'text-gray-900'}>Name</TableHead>
                    <TableHead className={theme === 'dark' ? 'text-foreground' : 'text-gray-900'}>Batch</TableHead>
                    <TableHead className={theme === 'dark' ? 'text-foreground' : 'text-gray-900'}>Section</TableHead>
                    <TableHead className={theme === 'dark' ? 'text-foreground' : 'text-gray-900'}>Sem</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {state.students.map((student, index) =>
                <TableRow key={`${student.usn}-${index}`} className={theme === 'dark' ? 'border-border' : 'border-gray-200'}>
                      <TableCell>
                        <Checkbox
                      checked={state.selectedStudents.includes(student.usn)}
                      onCheckedChange={(checked) => handleStudentSelect(student.usn, checked as boolean)}
                      className={theme === 'dark' ? 'border-border' : 'border-gray-300'} />
                    
                      </TableCell>
                      <TableCell className={`whitespace-nowrap ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>{student.usn}</TableCell>
                      <TableCell className={`whitespace-nowrap ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>{student.name}</TableCell>
                      <TableCell className={`whitespace-nowrap ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>{student.batch}</TableCell>
                      <TableCell className={`whitespace-nowrap ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>{student.section || 'N/A'}</TableCell>
                      <TableCell className={`whitespace-nowrap ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>{student.semester}</TableCell>
                    </TableRow>
                )}
                </TableBody>
              </Table>

              {/* Pagination Controls */}
              {state.totalPages > 1 &&
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mt-6">
                  <div className={`text-sm ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-600'}`}>
                    Showing {Math.min((state.currentPage - 1) * 50 + 1, state.totalStudents)} to {Math.min(state.currentPage * 50, state.totalStudents)} of {state.totalStudents}
                  </div>
                  <div className="flex gap-2 items-center justify-center sm:justify-end">
                    <Button
                  onClick={() => handlePageChange(state.currentPage - 1)}
                  disabled={!state.hasPrevious || state.isLoading}
                  variant="outline"
                  className="text-base font-medium px-4 py-2 text-white bg-primary border-primary hover:bg-primary/90 hover:border-primary/90 hover:text-white shadow-sm transition-all duration-200">
                  
                      Prev
                    </Button>
                    <span className="px-3 text-base font-medium text-primary">
                      {state.currentPage}
                    </span>
                    <Button
                  onClick={() => handlePageChange(state.currentPage + 1)}
                  disabled={!state.hasNext || state.isLoading}
                  variant="outline"
                  className="text-base font-medium px-4 py-2 text-white bg-primary border-primary hover:bg-primary/90 hover:border-primary/90 hover:text-white shadow-sm transition-all duration-200">
                  
                      Next
                    </Button>
                  </div>
                </div>
            }
            </div>
          </CardContent>
        </Card> :
      !state.isLoading &&
      <Card className={`border-2 border-dashed flex flex-col items-center justify-center p-12 text-center space-y-4 ${theme === 'dark' ? 'border-border bg-accent/5' : 'border-gray-200 bg-gray-50/50'}`
      }>
          <div className={`p-4 rounded-full ${theme === 'dark' ? 'bg-accent/10' : 'bg-primary/10'}`}>
            <Users className={`w-10 h-10 ${theme === 'dark' ? 'text-primary/70' : 'text-primary/70'}`} />
          </div>
          <div className="max-w-xs mx-auto">
            <h3 className={`text-lg font-bold ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>
              No Students to Display
            </h3>
            <p className={`text-sm mt-1 ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}`}>
              Please select a semester and section to view students eligible for demotion.
            </p>
          </div>
        </Card>
      }

      {/* Bulk Demote Dialog */}
      <Dialog open={state.showBulkDemoteDialog} onOpenChange={(open) => updateState({ showBulkDemoteDialog: open, bulkDemoteReason: "" })}>
        <DialogContent className={theme === 'dark' ? 'bg-card text-foreground border-border' : 'bg-white text-gray-900 border-gray-200'}>
          <DialogHeader>
            <DialogTitle className={theme === 'dark' ? 'text-foreground' : 'text-gray-900'}>
              {state.selectedStudents.length > 0 ? `Demote Selected Students (${state.selectedStudents.length})` : 'Bulk Demote Students'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className={`text-sm ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>
              <p><strong>{translateTerminology("Semester")}:</strong> {state.selectedSemester}</p>
              <p><strong>Section:</strong> {state.selectedSection || "All Sections"}</p>
              <p className={`mt-2 ${theme === 'dark' ? 'text-yellow-400' : 'text-yellow-600'}`}>
                ⚠️ This will demote {state.selectedStudents.length > 0 ? `the ${state.selectedStudents.length} selected students` : 'ALL students'} in the selected semester/section to the previous semester.
              </p>
            </div>
            <div>
              <label className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>
                Reason for Demotion *
              </label>
              <Select value={state.bulkDemoteReason} onValueChange={(value) => updateState({ bulkDemoteReason: value })}>
                <SelectTrigger className={theme === 'dark' ? 'bg-background text-foreground border-border' : 'bg-white text-gray-900 border-gray-300'}>
                  <SelectValue placeholder="Select reason for demotion" />
                </SelectTrigger>
                <SelectContent className="max-h-[200px]">
                  <SelectItem value="exam_failure">Exam Failure</SelectItem>
                  <SelectItem value="attendance_shortage">Attendance Shortage</SelectItem>
                  <SelectItem value="academic_misconduct">Academic Misconduct</SelectItem>
                  <SelectItem value="manual_demotion">Manual Demotion</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button
              onClick={() => updateState({ showBulkDemoteDialog: false, bulkDemoteReason: "" })}
              variant="outline"
              className={theme === 'dark' ? 'border-border text-foreground hover:bg-accent' : 'border-gray-300 text-gray-900 hover:bg-gray-100'}>
              
              Cancel
            </Button>
            <Button
              onClick={bulkDemoteAllStudents}
              disabled={state.isDemoting || !state.bulkDemoteReason.trim()}
              variant="destructive">
              
              {state.isDemoting ? "Demoting..." : state.selectedStudents.length > 0 ? `Demote Selected (${state.selectedStudents.length})` : "Demote All Students"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>);

};

export default PromotionManagement;