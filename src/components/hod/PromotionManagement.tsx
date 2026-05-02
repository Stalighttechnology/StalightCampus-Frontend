import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../ui/card";
import { Input } from "../ui/input";
import { Button } from "../ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "../ui/dialog";
import { CheckCircle, XCircle, UserCheck, UserX, Users, ArrowRight } from "lucide-react";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "../ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../ui/table";
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
} from "../../utils/hod_api";
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
    <div className="space-y-4">
      {renderContent()}
    </div>
  );
};

const PromotionOverview = ({ onTabChange, theme }: { onTabChange: (tab: "overview" | "promote" | "demote") => void; theme: string }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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

      {/* Quick Stats */}
      <Card className={theme === 'dark' ? 'bg-card text-foreground border-border md:col-span-2' : 'bg-white text-gray-900 border-gray-200 md:col-span-2'}>
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

const PromotionPage = ({ theme, onTabChange }: { theme: string; onTabChange: (tab: "overview" | "promote" | "demote") => void }) => {
  const [state, setState] = useState({
    semesters: [] as Semester[],
    sections: [] as Section[],
    students: [] as Student[],
    selectedStudents: [] as string[],
    selectedSemester: "",
    selectedSection: "all-sections",
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
              sections: sections || [],
            });
          }
        } else {
          updateState({ errors: [bootstrapResponse.message || "Failed to fetch promotion data"] });
        }
      } catch (err) {
        console.error("Error fetching initial data:", err);
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
        const semesterId = state.semesters.find(s => `${s.number}th Semester` === state.selectedSemester)?.id;
        if (semesterId) {
          const sectionRes = await manageSections({ branch_id: state.branchId, semester_id: semesterId }, "GET");
          if (sectionRes.success && sectionRes.data?.length > 0) {
            updateState({
              sections: sectionRes.data.map((s: any) => ({
                id: s.id,
                name: s.name,
                semester_id: s.semester_id.toString(),
              })),
              selectedSection: "all-sections",
            });
          } else {
            updateState({ sections: [], selectedSection: "all-sections" });
          }
        }
      } catch (err) {
        console.error("Error fetching sections:", err);
        updateState({ errors: ["Failed to load sections"] });
      }
    };

    fetchSections();
  }, [state.selectedSemester, state.branchId, state.semesters]);

  // Fetch students when semester and section change
  useEffect(() => {
    const fetchStudents = async () => {
      if (!state.selectedSemester || !state.branchId || !state.selectedSection || state.selectedSection === "all-sections") {
        updateState({ students: [], selectedStudents: [] });
        return;
      }

      try {
        updateState({ isLoading: true });
        const semesterId = state.semesters.find(s => `${s.number}th Semester` === state.selectedSemester)?.id;
        const sectionId = state.sections.find(s => s.name === state.selectedSection)?.id;

        if (semesterId && sectionId) {
          const studentRes = await manageStudents({
            branch_id: state.branchId,
            semester_id: semesterId,
            section_id: sectionId,
            page_size: 50, // Use AdminPagination default page size
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
              hasPrevious: !!studentRes.previous,
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

          console.log(`API returned ${results.length} students for semester ${state.selectedSemester}`);

          // Filter students to ensure they belong to the selected semester
          const currentSemesterNumber = state.semesters.find(s => `${s.number}th Semester` === state.selectedSemester)?.number;
          const filteredStudents = results.filter((student: Student) => {
            // Check if batch contains the correct semester number
            const batchSemesterMatch = student.batch?.match(/Sem(\d+)/);
            if (batchSemesterMatch) {
              const studentSemester = parseInt(batchSemesterMatch[1]);
              return studentSemester === currentSemesterNumber;
            }
            return true; // If no semester in batch, include by default
          });

          console.log(`Filtered to ${filteredStudents.length} students for semester ${currentSemesterNumber}`);
          updateState({
            students: filteredStudents,
            selectedStudents: [],
          });
        }
      } catch (err) {
        console.error("Error fetching students:", err);
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
      updateState({ selectedStudents: state.selectedStudents.filter(id => id !== usn) });
    }
  };

  // Handle select all students
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      updateState({ selectedStudents: state.students.map(student => student.usn) });
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
      const semesterId = state.semesters.find(s => `${s.number}th Semester` === state.selectedSemester)?.id;
      const sectionId = state.sections.find(s => s.name === state.selectedSection)?.id;

      if (semesterId && sectionId) {
        const studentRes = await manageStudents({
          branch_id: state.branchId,
          semester_id: semesterId,
          section_id: sectionId,
          page: page,
          page_size: 50, // Use AdminPagination default page size
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
            hasPrevious: !!studentRes.previous,
          });
        } else {
          updateState({ errors: ["Failed to load students"] });
        }
      }
    } catch (err) {
      console.error("Error fetching students:", err);
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

    const currentSemesterId = state.semesters.find(s => `${s.number}th Semester` === state.selectedSemester)?.id;
    const nextSemester = state.semesters.find(s => s.number === (state.semesters.find(s => s.id === currentSemesterId)?.number || 0) + 1);

    if (!currentSemesterId || !nextSemester) {
      updateState({ errors: ["No next semester available"] });
      return;
    }

    // Optimistic update: immediately remove promoted students from the list
    const studentsToPromote = state.selectedStudents.length > 0 && state.selectedStudents.length < state.students.length
      ? state.students.filter(student => state.selectedStudents.includes(student.usn))
      : state.students;

    updateState({
      students: state.students.filter(student => !state.selectedStudents.includes(student.usn)),
      selectedStudents: [],
      promotionResults: {
        message: `${studentsToPromote.length} students promoted successfully`,
        promoted: studentsToPromote.map(student => ({
          name: student.name,
          usn: student.usn,
          to_semester: nextSemester.number
        })),
      },
    });

    try {
      let res;
      if (state.selectedStudents.length > 0 && state.selectedStudents.length < state.students.length) {
        // Promote selected students
        console.log("Promoting selected students:", state.selectedStudents);
        res = await promoteSelectedStudents({
          student_ids: state.selectedStudents,
          to_semester_id: nextSemester.id, // Pass as string
          branch_id: state.branchId, // Include branch_id
        });
      } else {
        // Bulk promotion
        const sectionId = state.selectedSection !== "all-sections"
          ? state.sections.find(s => s.name === state.selectedSection)?.id
          : undefined;

        res = await promoteStudentsToNextSemester({
          from_semester_id: currentSemesterId, // Pass as string
          to_semester_id: nextSemester.id, // Pass as string
          branch_id: state.branchId,
          ...(sectionId && { section_id: sectionId }),
        });
      }

      if (res.success) {
        // Update with actual results from backend
        const successfulPromotions = res.promoted || [];
        const failedPromotions = res.failed || [];

        updateState({
          students: state.students.filter(student =>
            !successfulPromotions.some(p => p.usn === student.usn)
          ),
          selectedStudents: [],
          promotionResults: {
            message: res.message || `${successfulPromotions.length} students promoted successfully${failedPromotions.length > 0 ? `, ${failedPromotions.length} failed` : ''}`,
            promoted: successfulPromotions.map(p => ({
              name: p.name,
              usn: p.usn,
              to_semester: p.to_semester,
              section: p.section
            })),
            failed: failedPromotions
          },
        });
      } else {
        // Revert optimistic update on failure
        updateState({
          students: [...state.students, ...studentsToPromote],
          selectedStudents: state.selectedStudents.length > 0 ? state.selectedStudents : studentsToPromote.map(s => s.usn),
          promotionResults: null,
          errors: [res.message || "Failed to promote students"],
        });
      }
    } catch (err) {
      console.error("Error promoting students:", err);
      // Revert optimistic update on error
      updateState({
        students: [...state.students, ...studentsToPromote],
        selectedStudents: state.selectedStudents.length > 0 ? state.selectedStudents : studentsToPromote.map(s => s.usn),
        promotionResults: null,
        errors: ["Failed to promote students"],
      });
    }
  };

  // Promote all students in selected semester/section
  const promoteAllStudents = async () => {
    if (!state.selectedSemester || !state.branchId) {
      updateState({ errors: ["Please select a semester"] });
      return;
    }

    const currentSemesterId = state.semesters.find(s => `${s.number}th Semester` === state.selectedSemester)?.id;
    const nextSemester = state.semesters.find(s => s.number === (state.semesters.find(s => s.id === currentSemesterId)?.number || 0) + 1);

    if (!currentSemesterId || !nextSemester) {
      updateState({ errors: ["No next semester available"] });
      return;
    }

    // Optimistic update: immediately clear the student list and show success
    const allStudents = [...state.students];
    updateState({
      students: [],
      selectedStudents: [],
      promotionResults: {
        message: `${allStudents.length} students promoted successfully`,
        promoted: allStudents.map(student => ({
          name: student.name,
          usn: student.usn,
          to_semester: nextSemester.number
        })),
      },
    });

    try {
      const sectionId = state.selectedSection !== "all-sections"
        ? state.sections.find(s => s.name === state.selectedSection)?.id
        : undefined;

      const res = await promoteStudentsToNextSemester({
        from_semester_id: currentSemesterId, // Pass as string
        to_semester_id: nextSemester.id, // Pass as string
        branch_id: state.branchId,
        ...(sectionId && { section_id: sectionId }),
      });

      if (res.success) {
        // Update with actual results from backend
        const successfulPromotions = res.promoted || [];
        const failedPromotions = res.failed || [];

        updateState({
          students: allStudents.filter(student =>
            !successfulPromotions.some(p => p.usn === student.usn)
          ),
          selectedStudents: [],
          promotionResults: {
            message: res.message || `${successfulPromotions.length} students promoted successfully${failedPromotions.length > 0 ? `, ${failedPromotions.length} failed` : ''}`,
            promoted: successfulPromotions.map(p => ({
              name: p.name,
              usn: p.usn,
              to_semester: p.to_semester,
              section: p.section
            })),
            failed: failedPromotions
          },
        });
      } else {
        // Revert optimistic update on failure
        updateState({
          students: allStudents,
          selectedStudents: [],
          promotionResults: null,
          errors: [res.message || "Failed to promote students"],
        });
      }
    } catch (err) {
      console.error("Promotion error:", err);
      // Revert optimistic update on error
      updateState({
        students: allStudents,
        selectedStudents: [],
        promotionResults: null,
        errors: ["Failed to promote students"],
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className={theme === 'dark' ? 'bg-card text-foreground border-border' : 'bg-white text-gray-900 border-gray-200'}>
        <CardHeader>
          <CardTitle className={`flex items-center justify-between gap-2 ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>
            <span className="flex items-center gap-2">
              <UserCheck className="h-5 w-5 text-green-400" />
              Student Promotion
            </span>
            <Button
              onClick={() => onTabChange("overview")}
              variant="outline"
              size="sm"
              className="bg-primary text-white border-primary hover:bg-primary/90 hover:border-primary/90 hover:text-white transition-all duration-200 shadow-md"
            >
              Back to Overview
            </Button>
          </CardTitle>
        </CardHeader>
      </Card>

      {/* Error Messages */}
      {state.errors.length > 0 && (
        <Card className={theme === 'dark' ? 'bg-destructive/10 border-destructive' : 'bg-red-50 border-red-200'}>
          <CardContent className="pt-6">
            <ul className={`text-sm list-disc list-inside ${theme === 'dark' ? 'text-destructive' : 'text-red-500'}`}>
              {state.errors.map((err, idx) => (
                <li key={idx}>{err}</li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Success Messages */}
      {state.promotionResults && (
        <Card className={theme === 'dark' ? 'bg-green-900/20 border-green-500' : 'bg-green-50 border-green-200'}>
          <CardContent className="pt-6">
            <div className={`flex items-center gap-2 ${theme === 'dark' ? 'text-green-400' : 'text-green-600'}`}>
              <CheckCircle className="h-5 w-5" />
              <span>{state.promotionResults.message}</span>
            </div>
            {state.promotionResults.promoted && (
              <div className="mt-2">
                <p className={`text-sm ${theme === 'dark' ? 'text-green-300' : 'text-green-700'}`}>Promoted students:</p>
                <ul className={`text-xs list-disc list-inside ml-4 ${theme === 'dark' ? 'text-green-400' : 'text-green-600'}`}>
                  {state.promotionResults.promoted.map((student: any, idx: number) => (
                    <li key={idx}>{student.name} ({student.usn}) - Semester {student.to_semester}{student.section ? `, Section ${student.section}` : ''}</li>
                  ))}
                </ul>
              </div>
            )}
            {state.promotionResults.failed && state.promotionResults.failed.length > 0 && (
              <div className="mt-2">
                <p className={`text-sm ${theme === 'dark' ? 'text-yellow-300' : 'text-yellow-700'}`}>Failed to promote:</p>
                <ul className={`text-xs list-disc list-inside ml-4 ${theme === 'dark' ? 'text-yellow-400' : 'text-yellow-600'}`}>
                  {state.promotionResults.failed.map((student: any, idx: number) => (
                    <li key={idx}>{student.name} ({student.usn}) - {student.reason}</li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Promotion Controls */}
      <Card className={theme === 'dark' ? 'bg-card text-foreground border-border' : 'bg-white text-gray-900 border-gray-200'}>
        <CardHeader>
          <CardTitle className={`text-lg ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>Promote Students to Next Semester</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            <Select
              value={state.selectedSemester}
              onValueChange={(value) => updateState({ selectedSemester: value, selectedSection: "all-sections" })}
              disabled={state.isLoading}
            >
              <SelectTrigger className={theme === 'dark' ? 'w-48 bg-background text-foreground border-border' : 'w-48 bg-white text-gray-900 border-gray-300'}>
                <SelectValue placeholder="Select Semester" />
              </SelectTrigger>
              <SelectContent className={theme === 'dark' ? 'bg-background text-foreground border-border' : 'bg-white text-gray-900 border-gray-300'}>
                {state.semesters.map((semester) => (
                  <SelectItem key={semester.id} value={`${semester.number}th Semester`} className={theme === 'dark' ? 'focus:bg-accent' : 'focus:bg-gray-100'}>
                    Semester {semester.number}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={state.selectedSection}
              onValueChange={(value) => updateState({ selectedSection: value })}
              disabled={state.isLoading || !state.selectedSemester || state.sections.length === 0}
            >
              <SelectTrigger className={theme === 'dark' ? 'w-48 bg-background text-foreground border-border' : 'w-48 bg-white text-gray-900 border-gray-300'}>
                <SelectValue placeholder="All Sections" />
              </SelectTrigger>
              <SelectContent className={theme === 'dark' ? 'bg-background text-foreground border-border' : 'bg-white text-gray-900 border-gray-300'}>
                <SelectItem value="all-sections" className={theme === 'dark' ? 'focus:bg-accent' : 'focus:bg-gray-100'}>All Sections</SelectItem>
                {(() => {
                  const semesterId = state.semesters.find(s => `${s.number}th Semester` === state.selectedSemester)?.id;
                  return state.sections
                    .filter(section => semesterId ? section.semester_id === semesterId : false)
                    .map((section) => (
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

      {state.isLoading && state.students.length === 0 && (
        <Card className="p-6">
          <SkeletonTable rows={10} cols={6} />
        </Card>
      )}

      {/* Student List */}
      {state.students.length > 0 && (
        <Card className={theme === 'dark' ? 'bg-card text-foreground border-border' : 'bg-white text-gray-900 border-gray-200'}>
          <CardHeader>
            <CardTitle className={`flex items-center justify-between ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>
              <span className="flex items-center gap-2">
                <Users className="h-5 w-5 text-blue-400" />
                Students in {state.selectedSemester} - {state.selectedSection}
              </span>
              <div className="flex items-center gap-2">
                <Checkbox
                  checked={state.selectedStudents.length === state.students.length && state.students.length > 0}
                  onCheckedChange={handleSelectAll}
                  className={theme === 'dark' ? 'border-border' : 'border-gray-300'}
                />
                <span className={`text-sm ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}`}>Select All</span>
                <Button
                  onClick={handlePromoteSelectedStudents}
                  disabled={state.isPromoting || state.selectedStudents.length === 0}
                  className="bg-green-600 hover:bg-green-700 text-white"
                  size="sm"
                >
                  <UserCheck className="h-4 w-4 mr-2" />
                  Promote Selected ({state.selectedStudents.length})
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
                  {state.students.map((student, index) => (
                    <TableRow key={`${student.usn}-${index}`} className={theme === 'dark' ? 'border-border' : 'border-gray-200'}>
                      <TableCell>
                        <Checkbox
                          checked={state.selectedStudents.includes(student.usn)}
                          onCheckedChange={(checked) => handleStudentSelect(student.usn, checked as boolean)}
                          className={theme === 'dark' ? 'border-border' : 'border-gray-300'}
                        />
                      </TableCell>
                      <TableCell className={theme === 'dark' ? 'text-foreground' : 'text-gray-900'}>{student.usn}</TableCell>
                      <TableCell className={theme === 'dark' ? 'text-foreground' : 'text-gray-900'}>{student.name}</TableCell>
                      <TableCell className={theme === 'dark' ? 'text-foreground' : 'text-gray-900'}>{student.batch}</TableCell>
                      <TableCell className={theme === 'dark' ? 'text-foreground' : 'text-gray-900'}>{student.section || 'N/A'}</TableCell>
                      <TableCell className={theme === 'dark' ? 'text-foreground' : 'text-gray-900'}>{student.semester}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {/* Pagination Controls */}
              {state.totalPages > 1 && (
                <div className="flex items-center justify-between mt-4">
                  <div className={`text-sm ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}`}>
                    Showing {state.students.length} of {state.totalStudents} students
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button
                      onClick={() => handlePageChange(state.currentPage - 1)}
                      disabled={!state.hasPrevious || state.isLoading}
                      variant="outline"
                      size="sm"
                    >
                      Previous
                    </Button>
                    <span className={`text-sm ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>
                      Page {state.currentPage} of {state.totalPages}
                    </span>
                    <Button
                      onClick={() => handlePageChange(state.currentPage + 1)}
                      disabled={!state.hasNext || state.isLoading}
                      variant="outline"
                      size="sm"
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

const DemotionPage = ({ theme, onTabChange }: { theme: string; onTabChange: (tab: "overview" | "promote" | "demote") => void }) => {
  const [state, setState] = useState({
    semesters: [] as Semester[],
    sections: [] as Section[],
    students: [] as Student[],
    selectedStudents: [] as string[],
    selectedSemester: "",
    selectedSection: "all-sections",
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
              sections: sections || [],
            });
          }
        } else {
          updateState({ errors: [bootstrapResponse.message || "Failed to fetch demotion data"] });
        }
      } catch (err) {
        console.error("Error fetching initial data:", err);
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
        const semesterId = state.semesters.find(s => `${s.number}th Semester` === state.selectedSemester)?.id;
        if (semesterId) {
          const sectionRes = await manageSections({ branch_id: state.branchId, semester_id: semesterId }, "GET");
          if (sectionRes.success && sectionRes.data?.length > 0) {
            updateState({
              sections: sectionRes.data.map((s: any) => ({
                id: s.id,
                name: s.name,
                semester_id: s.semester_id.toString(),
              })),
              selectedSection: "all-sections",
            });
          } else {
            updateState({ sections: [], selectedSection: "all-sections" });
          }
        }
      } catch (err) {
        console.error("Error fetching sections:", err);
        updateState({ errors: ["Failed to load sections"] });
      }
    };

    fetchSections();
  }, [state.selectedSemester, state.branchId, state.semesters]);

  // Fetch students when semester and section change
  useEffect(() => {
    const fetchStudents = async () => {
      if (!state.selectedSemester || !state.branchId || !state.selectedSection || state.selectedSection === "all-sections") {
        updateState({ students: [], selectedStudents: [] });
        return;
      }

      try {
        updateState({ isLoading: true });
        const semesterId = state.semesters.find(s => `${s.number}th Semester` === state.selectedSemester)?.id;
        const sectionId = state.sections.find(s => s.name === state.selectedSection)?.id;

        if (semesterId && sectionId) {
          const studentRes = await manageStudents({
            branch_id: state.branchId,
            semester_id: semesterId,
            section_id: sectionId,
            page_size: 50, // Use AdminPagination default page size
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
              hasPrevious: !!studentRes.previous,
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

          console.log(`API returned ${results.length} students for semester ${state.selectedSemester}`);

          // Filter students to ensure they belong to the selected semester
          const currentSemesterNumber = state.semesters.find(s => `${s.number}th Semester` === state.selectedSemester)?.number;
          const filteredStudents = results.filter((student: Student) => {
            // Check if batch contains the correct semester number
            const batchSemesterMatch = student.batch?.match(/Sem(\d+)/);
            if (batchSemesterMatch) {
              const studentSemester = parseInt(batchSemesterMatch[1]);
              return studentSemester === currentSemesterNumber;
            }
            return true; // If no semester in batch, include by default
          });

          console.log(`Filtered to ${filteredStudents.length} students for semester ${currentSemesterNumber}`);
          updateState({
            students: filteredStudents,
            selectedStudents: [],
          });
        }
      } catch (err) {
        console.error("Error fetching students:", err);
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
      updateState({ selectedStudents: state.selectedStudents.filter(id => id !== usn) });
    }
  };

  // Handle select all students
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      updateState({ selectedStudents: state.students.map(student => student.usn) });
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
      const semesterId = state.semesters.find(s => `${s.number}th Semester` === state.selectedSemester)?.id;
      const sectionId = state.sections.find(s => s.name === state.selectedSection)?.id;

      if (semesterId && sectionId) {
        const studentRes = await manageStudents({
          branch_id: state.branchId,
          semester_id: semesterId,
          section_id: sectionId,
          page: page,
          page_size: 50, // Use AdminPagination default page size
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
            hasPrevious: !!studentRes.previous,
          });
        } else {
          updateState({ errors: ["Failed to load students"] });
        }
      }
    } catch (err) {
      console.error("Error fetching students:", err);
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

    const currentSemesterId = state.semesters.find(s => `${s.number}th Semester` === state.selectedSemester)?.id;
    const prevSemester = state.semesters.find(s => s.number === (state.semesters.find(s => s.id === currentSemesterId)?.number || 0) - 1);

    if (!currentSemesterId || !prevSemester) {
      updateState({ errors: ["No previous semester available"] });
      return;
    }

    // Optimistic update: immediately remove demoted students from the list
    const studentsToDemote = state.selectedStudents.length > 0 ? state.students.filter(student => state.selectedStudents.includes(student.usn)) : state.students;

    updateState({
      students: state.students.filter(student => !state.selectedStudents.includes(student.usn)),
      selectedStudents: [],
      showBulkDemoteDialog: false,
      bulkDemoteReason: "",
      isDemoting: true,
    });

    try {
      const sectionId = state.selectedSection !== "all-sections"
        ? state.sections.find(s => s.name === state.selectedSection)?.id
        : undefined;

      const res = await bulkDemoteStudents({
        student_ids: state.selectedStudents.length > 0 ? state.selectedStudents : studentsToDemote.map(s => s.usn),
        to_semester_id: prevSemester.id, // Pass as string
        branch_id: state.branchId,
        reason: state.bulkDemoteReason,
        ...(sectionId && { section_id: sectionId }),
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
            selectedStudents: state.selectedStudents.length > 0 ? state.selectedStudents : studentsToDemote.map(s => s.usn),
          });
        }

        updateState({
          demotionResults: {
            message: res.message || `${demotedCount} students demoted successfully`,
            demoted: (apiData.demoted_students || []).map((student: any) => ({
              name: student.name || 'Unknown',
              usn: student.usn || '',
              to_semester: apiData.target_semester || prevSemester.number
            })),
            failed: (apiData.failed_students || []).map((student: any) => ({
              name: student.name || 'Unknown',
              usn: student.usn || '',
              reason: student.reason || 'Unknown error'
            })),
          },
        });
      } else {
        // Revert optimistic update on failure
        updateState({
          students: [...state.students, ...studentsToDemote],
          selectedStudents: state.selectedStudents.length > 0 ? state.selectedStudents : studentsToDemote.map(s => s.usn),
          showBulkDemoteDialog: true,
          bulkDemoteReason: state.bulkDemoteReason,
          demotionResults: null,
          errors: [res.message || "Failed to demote students"],
        });
      }
    } catch (err) {
      console.error("Bulk demotion error:", err);
      // Revert optimistic update on error
      updateState({
        students: [...state.students, ...studentsToDemote],
        selectedStudents: state.selectedStudents.length > 0 ? state.selectedStudents : studentsToDemote.map(s => s.usn),
        showBulkDemoteDialog: true,
        bulkDemoteReason: state.bulkDemoteReason,
        demotionResults: null,
        errors: ["Failed to demote students"],
      });
    } finally {
      updateState({ isDemoting: false });
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className={theme === 'dark' ? 'bg-card text-foreground border-border' : 'bg-white text-gray-900 border-gray-200'}>
        <CardHeader>
          <CardTitle className={`flex items-center justify-between gap-2 ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>
            <span className="flex items-center gap-2">
              <UserX className="h-5 w-5 text-red-400" />
              Student Demotion
            </span>
            <Button
              onClick={() => onTabChange("overview")}
              variant="outline"
              size="sm"
              className="bg-primary text-white border-primary hover:bg-primary/90 hover:border-primary/90 hover:text-white transition-all duration-200 shadow-md"
            >
              Back to Overview
            </Button>
          </CardTitle>
        </CardHeader>
      </Card>

      {/* Error Messages */}
      {state.errors.length > 0 && (
        <Card className={theme === 'dark' ? 'bg-destructive/10 border-destructive' : 'bg-red-50 border-red-200'}>
          <CardContent className="pt-6">
            <ul className={`text-sm list-disc list-inside ${theme === 'dark' ? 'text-destructive' : 'text-red-500'}`}>
              {state.errors.map((err, idx) => (
                <li key={idx}>{err}</li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Success Messages */}
      {state.demotionResults && (
        <Card className={theme === 'dark' ? 'bg-red-900/20 border-red-500' : 'bg-red-50 border-red-200'}>
          <CardContent className="pt-6">
            <div className={`flex items-center gap-2 ${theme === 'dark' ? 'text-red-400' : 'text-red-600'}`}>
              <UserX className="h-5 w-5" />
              <span>{state.demotionResults.message}</span>
            </div>
            {state.demotionResults.demoted && (
              <div className="mt-2">
                <p className={`text-sm ${theme === 'dark' ? 'text-red-300' : 'text-red-700'}`}>Demoted students:</p>
                <ul className={`text-xs list-disc list-inside ml-4 ${theme === 'dark' ? 'text-red-400' : 'text-red-600'}`}>
                  {state.demotionResults.demoted.map((student: any, idx: number) => (
                    <li key={idx}>{student.name} ({student.usn}) - Semester {student.to_semester}{student.section ? `, Section ${student.section}` : ''}</li>
                  ))}
                </ul>
              </div>
            )}
            {state.demotionResults.failed && state.demotionResults.failed.length > 0 && (
              <div className="mt-2">
                <p className={`text-sm ${theme === 'dark' ? 'text-yellow-300' : 'text-yellow-700'}`}>Failed to demote:</p>
                <ul className={`text-xs list-disc list-inside ml-4 ${theme === 'dark' ? 'text-yellow-400' : 'text-yellow-600'}`}>
                  {state.demotionResults.failed.map((student: any, idx: number) => (
                    <li key={idx}>{student.name} ({student.usn}) - {student.reason}</li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Demotion Controls */}
      <Card className={theme === 'dark' ? 'bg-card text-foreground border-border' : 'bg-white text-gray-900 border-gray-200'}>
        <CardHeader>
          <CardTitle className={`text-lg ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>Demote Students to Previous Semester</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            <Select
              value={state.selectedSemester}
              onValueChange={(value) => updateState({ selectedSemester: value, selectedSection: "all-sections" })}
              disabled={state.isLoading}
            >
              <SelectTrigger className={theme === 'dark' ? 'w-48 bg-background text-foreground border-border' : 'w-48 bg-white text-gray-900 border-gray-300'}>
                <SelectValue placeholder="Select Semester" />
              </SelectTrigger>
              <SelectContent className={theme === 'dark' ? 'bg-background text-foreground border-border' : 'bg-white text-gray-900 border-gray-300'}>
                {state.semesters.map((semester) => (
                  <SelectItem key={semester.id} value={`${semester.number}th Semester`} className={theme === 'dark' ? 'focus:bg-accent' : 'focus:bg-gray-100'}>
                    Semester {semester.number}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={state.selectedSection}
              onValueChange={(value) => updateState({ selectedSection: value })}
              disabled={state.isLoading || !state.selectedSemester || state.sections.length === 0}
            >
              <SelectTrigger className={theme === 'dark' ? 'w-48 bg-background text-foreground border-border' : 'w-48 bg-white text-gray-900 border-gray-300'}>
                <SelectValue placeholder="All Sections" />
              </SelectTrigger>
              <SelectContent className={theme === 'dark' ? 'bg-background text-foreground border-border' : 'bg-white text-gray-900 border-gray-300'}>
                <SelectItem value="all-sections" className={theme === 'dark' ? 'focus:bg-accent' : 'focus:bg-gray-100'}>All Sections</SelectItem>
                {(() => {
                  const semesterId = state.semesters.find(s => `${s.number}th Semester` === state.selectedSemester)?.id;
                  return state.sections
                    .filter(section => semesterId ? section.semester_id === semesterId : false)
                    .map((section) => (
                      <SelectItem key={section.id} value={section.name} className={theme === 'dark' ? 'focus:bg-accent' : 'focus:bg-gray-100'}>
                        Section {section.name}
                      </SelectItem>
                    ));
                })()}
              </SelectContent>
            </Select>

            <Button
              onClick={() => updateState({ showBulkDemoteDialog: true })}
              disabled={!state.selectedSemester}
              variant="destructive"
            >
              <Users className="h-4 w-4 mr-2" />
              Bulk Demote Students
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Student List */}
      {state.students.length > 0 && (
        <Card className={theme === 'dark' ? 'bg-card text-foreground border-border' : 'bg-white text-gray-900 border-gray-200'}>
          <CardHeader>
            <CardTitle className={`flex items-center justify-between ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>
              <span className="flex items-center gap-2">
                <Users className="h-5 w-5 text-red-400" />
                Students in {state.selectedSemester} - {state.selectedSection}
              </span>
              <div className="flex items-center gap-2">
                <Checkbox
                  checked={state.selectedStudents.length === state.students.length && state.students.length > 0}
                  onCheckedChange={handleSelectAll}
                  className={theme === 'dark' ? 'border-border' : 'border-gray-300'}
                />
                <span className={`text-sm ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}`}>Select All</span>
                <Button
                  onClick={() => updateState({ showBulkDemoteDialog: true })}
                  disabled={state.selectedStudents.length === 0}
                  variant="destructive"
                  size="sm"
                >
                  <UserX className="h-4 w-4 mr-2" />
                  Demote Selected ({state.selectedStudents.length})
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
                  {state.students.map((student, index) => (
                    <TableRow key={`${student.usn}-${index}`} className={theme === 'dark' ? 'border-border' : 'border-gray-200'}>
                      <TableCell>
                        <Checkbox
                          checked={state.selectedStudents.includes(student.usn)}
                          onCheckedChange={(checked) => handleStudentSelect(student.usn, checked as boolean)}
                          className={theme === 'dark' ? 'border-border' : 'border-gray-300'}
                        />
                      </TableCell>
                      <TableCell className={theme === 'dark' ? 'text-foreground' : 'text-gray-900'}>{student.usn}</TableCell>
                      <TableCell className={theme === 'dark' ? 'text-foreground' : 'text-gray-900'}>{student.name}</TableCell>
                      <TableCell className={theme === 'dark' ? 'text-foreground' : 'text-gray-900'}>{student.batch}</TableCell>
                      <TableCell className={theme === 'dark' ? 'text-foreground' : 'text-gray-900'}>{student.section || 'N/A'}</TableCell>
                      <TableCell className={theme === 'dark' ? 'text-foreground' : 'text-gray-900'}>{student.semester}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {/* Pagination Controls */}
              {state.totalPages > 1 && (
                <div className="flex items-center justify-between mt-4">
                  <div className={`text-sm ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}`}>
                    Showing {state.students.length} of {state.totalStudents} students
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button
                      onClick={() => handlePageChange(state.currentPage - 1)}
                      disabled={!state.hasPrevious || state.isLoading}
                      variant="outline"
                      size="sm"
                    >
                      Previous
                    </Button>
                    <span className={`text-sm ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>
                      Page {state.currentPage} of {state.totalPages}
                    </span>
                    <Button
                      onClick={() => handlePageChange(state.currentPage + 1)}
                      disabled={!state.hasNext || state.isLoading}
                      variant="outline"
                      size="sm"
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

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
              <p><strong>Semester:</strong> {state.selectedSemester}</p>
              <p><strong>Section:</strong> {state.selectedSection === "all-sections" ? "All Sections" : state.selectedSection}</p>
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
                <SelectContent>
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
              className={theme === 'dark' ? 'border-border text-foreground hover:bg-accent' : 'border-gray-300 text-gray-900 hover:bg-gray-100'}
            >
              Cancel
            </Button>
            <Button
              onClick={bulkDemoteAllStudents}
              disabled={state.isDemoting || !state.bulkDemoteReason.trim()}
              variant="destructive"
            >
              {state.isDemoting ? "Demoting..." : (state.selectedStudents.length > 0 ? `Demote Selected (${state.selectedStudents.length})` : "Demote All Students")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PromotionManagement;