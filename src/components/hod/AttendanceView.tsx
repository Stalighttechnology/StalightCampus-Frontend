import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { Eye, FileDown } from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import Fuse from "fuse.js";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogClose,
} from "../ui/dialog";
import { useToast } from "../ui/use-toast";
import { manageProfile, manageSections, manageSubjects, getBranches, getSemesters, getAttendanceBootstrap } from "../../utils/hod_api";
import { useTheme } from "../../context/ThemeContext";
import { SkeletonTable } from "../ui/skeleton";

interface Student {
  student_id: string;
  name: string;
  usn: string;
  attendance_percentage: number | string;
  total_sessions?: number;
  present_sessions?: number;
  semester?: number | string;
  section?: string;
}

interface Semester {
  id: string;
  number: number;
}

interface Section {
  id: string;
  name: string;
  semester_id: string;
}

interface Subject {
  id: string;
  name: string;
  subject_code: string;
  semester_id: string;
}

// Define types for API response
interface SectionResponse {
  id: string;
  name: string;
  semester_id: string;
}

interface SubjectResponse {
  id: string;
  name: string;
  subject_code: string;
  semester_id: string;
}

interface AttendanceBootstrapResponse {
  success: boolean;
  message?: string;
  data?: {
    profile: {
      branch: string;
      branch_id: string;
    };
    semesters: Semester[];
    sections: SectionResponse[];
    subjects: SubjectResponse[];
    attendance: {
      students: Student[];
    };
  };
}

const AttendanceView = () => {
  const { toast } = useToast();
  const { theme } = useTheme();

  // Helper function to format attendance percentage
  const formatAttendancePercentage = (percentage: number | string): string => {
    if (percentage === "NA" || percentage === null || percentage === undefined) {
      return "NA";
    }
    if (typeof percentage === "string") {
      return percentage;
    }
    return `${percentage}%`;
  };

  // Helper function to get progress bar width
  const getProgressBarWidth = (percentage: number | string): string => {
    if (percentage === "NA" || percentage === null || percentage === undefined) {
      return "0%";
    }
    if (typeof percentage === "string") {
      return "0%";
    }
    return `${Math.min(percentage, 100)}%`;
  };

  // Helper function to get numeric value for sorting
  const getNumericPercentage = (percentage: number | string): number => {
    if (percentage === "NA" || percentage === null || percentage === undefined) {
      return -1; // Sort NA values to the end
    }
    if (typeof percentage === "string") {
      return -1;
    }
    return percentage;
  };
  const [state, setState] = useState({
    search: "",
    currentPage: 1,
    selectedStudent: null as Student | null,
    filters: {
      semester_id: "",
      section_id: "",
      subject_id: "",
    },
    students: [] as Student[],
    loading: true,
    error: null as string | null,
    branch: "",
    branchId: "",
    semesters: [] as Semester[],
    sections: [] as Section[],
    subjects: [] as Subject[],
    pagination: {
      page: 1,
      page_size: 50,
      total_students: 0,
      total_pages: 0,
    },
  });

  const studentsPerPage = 50;

  // Helper to update state
  const updateState = (newState: Partial<typeof state>) => {
    setState((prev) => ({ ...prev, ...newState }));
  };

  // Fetch all data using combined endpoint with pagination
  useEffect(() => {
    const fetchData = async () => {
      updateState({ loading: true, search: "", currentPage: 1 });
      try {
        // Fetch data with pagination support
        const response = await getAttendanceBootstrap("", {
          page: state.pagination.page,
          page_size: state.pagination.page_size,
          ...(state.filters.semester_id && { semester_id: state.filters.semester_id }),
          ...(state.filters.section_id && { section_id: state.filters.section_id }),
          ...(state.filters.subject_id && { subject_id: state.filters.subject_id }),
        });
        if (response.success && response.data) {
          updateState({
            branch: response.data.profile.branch,
            branchId: response.data.profile.branch_id,
            semesters: response.data.semesters,
            sections: response.data.sections.map((s) => ({
              id: s.id,
              name: s.name,
              semester_id: s.semester_id.toString(),
            })),
            subjects: response.data.subjects.map((s) => ({
              id: s.id,
              name: s.name,
              subject_code: s.subject_code,
              semester_id: s.semester_id.toString(),
            })),
            students: response.data.attendance.students,
            pagination: {
              page: response.count ? Math.ceil(response.count / state.pagination.page_size) : 1,
              page_size: state.pagination.page_size,
              total_students: response.count || 0,
              total_pages: response.count ? Math.ceil(response.count / state.pagination.page_size) : 1,
            },
          });
        } else {
          throw new Error(response.message || "Failed to fetch data");
        }
      } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : "Network error";
        updateState({ error: errorMessage });
        toast({ variant: "destructive", title: "Error", description: errorMessage });
      } finally {
        updateState({ loading: false });
      }
    };
    fetchData();
  }, [state.filters.semester_id, state.filters.section_id, state.filters.subject_id, state.pagination.page, state.pagination.page_size, toast]);

// Use fuzzy search on current page data
const fuse = new Fuse(state.students, {
  keys: ["name", "usn", "semester", "section"],
  threshold: 0.3,
  includeScore: true,
});

// Use fuzzy search
const filteredStudents = state.search
  ? fuse.search(state.search).map((result) => result.item)
  : state.students;

const totalPages = state.pagination.total_pages;
const currentStudents = filteredStudents;  const handlePrev = () => {
    if (state.pagination.page > 1) {
      updateState({
        pagination: { ...state.pagination, page: state.pagination.page - 1 },
        currentPage: state.pagination.page - 1
      });
    }
  };

  const handleNext = () => {
    if (state.pagination.page < state.pagination.total_pages) {
      updateState({
        pagination: { ...state.pagination, page: state.pagination.page + 1 },
        currentPage: state.pagination.page + 1
      });
    }
  };

  const handleExportPDF = () => {
    const doc = new jsPDF();
    doc.text(`All Students Attendance Report - ${state.branch.toUpperCase()} - Page ${state.pagination.page}`, 14, 16);
    const tableColumn = ["Name", "USN", "Attendance", "Semester", "Section"];
    const tableRows = currentStudents.map((student) => [
      student.name,
      student.usn,
      formatAttendancePercentage(student.attendance_percentage),
      student.semester || "-",
      student.section || "-",
    ]);

    autoTable(doc, {
      head: [tableColumn],
      body: tableRows,
      startY: 20,
    });

    doc.save(`attendance-report-${state.branch}-page-${state.pagination.page}.pdf`);
  };

  // Helper to get display text for dropdowns
  const getSemesterDisplay = (semesterId: string) => {
    const semester = state.semesters.find((s) => s.id === semesterId);
    return semester ? `Semester ${semester.number}` : "";
  };

  const getSectionDisplay = (sectionId: string) => {
    const section = state.sections.find((s) => s.id === sectionId);
    return section ? `Section ${section.name}` : "";
  };

  const getSubjectDisplay = (subjectId: string) => {
    const subject = state.subjects.find((s) => s.id === subjectId);
    return subject ? subject.name : "";
  };

  if (state.loading && state.students.length === 0) {
    return (
      <Card className="p-6">
        <SkeletonTable rows={10} cols={5} />
      </Card>
    );
  }

  if (state.error) {
    return <div className={`text-center py-6 ${theme === 'dark' ? 'text-destructive' : 'text-red-500'}`}>{state.error}</div>;
  }

  return (
    <Card className={`shadow-md border rounded-lg ${theme === 'dark' ? 'bg-card text-foreground border-border' : 'bg-gray-50 text-gray-900'}`}>
      <CardHeader>
        <CardTitle className="text-2xl font-semibold mb-4">All Students Attendance</CardTitle>
        <p className={`text-sm ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}`}>
          View and analyze attendance for all students in {state.branch.toUpperCase()}.
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Select
            value={state.filters.semester_id}
            onValueChange={(value) =>
              updateState({
                filters: { semester_id: value, section_id: "", subject_id: "" },
                sections: [],
                subjects: [],
                pagination: { ...state.pagination, page: 1 },
              })
            }
            disabled={state.semesters.length === 0}
          >
            <SelectTrigger className={theme === 'dark' ? 'bg-background text-foreground border-border' : 'bg-white text-gray-900 border-gray-300'}>
              <SelectValue
                placeholder={state.semesters.length === 0 ? "No semesters available" : "Select Semester"}
              />
            </SelectTrigger>
            <SelectContent className={theme === 'dark' ? 'bg-background text-foreground border-border' : 'bg-white text-gray-900 border-gray-300'}>
              {state.semesters.map((semester) => (
                <SelectItem  key={semester.id} value={semester.id} className={theme === 'dark' ? 'focus:bg-accent' : 'focus:bg-gray-100'}>
                  Semester {semester.number}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={state.filters.section_id}
            onValueChange={(value) => updateState({
              filters: { ...state.filters, section_id: value },
              pagination: { ...state.pagination, page: 1 }
            })}
            disabled={state.sections.length === 0 || !state.filters.semester_id}
          >
            <SelectTrigger className={theme === 'dark' ? 'bg-background text-foreground border-border' : 'bg-white text-gray-900 border-gray-300'}>
              <SelectValue
                placeholder={
                  state.sections.length === 0 || !state.filters.semester_id ? "Select semester first" : "Select Section"
                }
              />
            </SelectTrigger>
            <SelectContent className={theme === 'dark' ? 'bg-background text-foreground border-border' : 'bg-white text-gray-900 border-gray-300'}>
              {state.sections
                .filter((section) => section.semester_id === state.filters.semester_id)
                .map((section) => (
                  <SelectItem key={section.id} value={section.id} className={theme === 'dark' ? 'focus:bg-accent' : 'focus:bg-gray-100'}>
                    Section {section.name}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
          <Select
            value={state.filters.subject_id}
            onValueChange={(value) => updateState({
              filters: { ...state.filters, subject_id: value },
              pagination: { ...state.pagination, page: 1 }
            })}
            disabled={state.subjects.length === 0 || !state.filters.semester_id}
          >
            <SelectTrigger className={theme === 'dark' ? 'bg-background text-foreground border-border' : 'bg-white text-gray-900 border-gray-300'}>
              <SelectValue
                placeholder={
                  state.subjects.length === 0 || !state.filters.semester_id ? "Select semester first" : "Select Subject"
                }
              />
            </SelectTrigger>
            <SelectContent className={theme === 'dark' ? 'bg-background text-foreground border-border' : 'bg-white text-gray-900 border-gray-300'}>
              {state.subjects
                .filter((subject) => subject.semester_id === state.filters.semester_id)
                .map((subject) => (
                  <SelectItem key={subject.id} value={subject.id} className={theme === 'dark' ? 'focus:bg-accent' : 'focus:bg-gray-100'}>
                    {subject.name}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col md:flex-row justify-between items-center mt-4 gap-2 md:gap-4 w-full">
          {/* Input + Error */}
          <div className="flex flex-col w-full max-w-md">
            <Input
              className={`w-full ${theme === 'dark' ? 'bg-background text-foreground border-border placeholder:text-muted-foreground' : 'bg-white text-gray-900 border-gray-300 placeholder:text-gray-500'}`}
              placeholder="Search by name or USN..."
              value={state.search}
              onChange={(e) => {
                const value = e.target.value;
                if (/^[a-zA-Z0-9]*$/.test(value)) {
                  updateState({ search: value });
                }
              }}
            />
            {state.search && /[^a-zA-Z0-9]/.test(state.search) && (
              <span className={`text-sm mt-1 ${theme === 'dark' ? 'text-destructive' : 'text-red-500'}`}>
                Only alphanumeric characters are allowed
              </span>
            )}
          </div>

          {/* Export Button */}
          <Button
            className="ml-0 md:ml-4 flex items-center gap-2 bg-primary text-white border-primary hover:bg-primary/90 hover:border-primary/90 hover:text-white transition-all duration-200 ease-in-out transform hover:scale-105 shadow-md"
            onClick={handleExportPDF}
          >
            <FileDown size={16} />
            Export Report
          </Button>
        </div>


        <div className="overflow-x-auto mt-4">
          {/* Height ≈ 5 rows (5 × h-16 = 80 = 20rem). Adjust if your row height differs */}
          <div className={`overflow-y-auto custom-scrollbar border rounded ${theme === 'dark' ? 'border-border' : 'border-gray-300'}`}>
            <table className="w-full table-fixed border-collapse">
              <thead className={`text-left sticky top-0 z-10 ${theme === 'dark' ? 'bg-card text-foreground border-border' : 'bg-gray-100 text-gray-900 border-gray-300'}`}>
                <tr>
                  <th className={`p-3 border w-[24%] ${theme === 'dark' ? 'border-border' : 'border-gray-300'}`}>Student</th>
                  <th className={`p-3 border w-[32%] ${theme === 'dark' ? 'border-border' : 'border-gray-300'}`}>Attendance</th>
                  <th className={`p-3 border w-[12%] ${theme === 'dark' ? 'border-border' : 'border-gray-300'}`}>Semester</th>
                  <th className={`p-3 border w-[12%] ${theme === 'dark' ? 'border-border' : 'border-gray-300'}`}>Section</th>
                  <th className={`p-3 border w-[20%] ${theme === 'dark' ? 'border-border' : 'border-gray-300'}`}>Actions</th>
                </tr>
              </thead>

              <tbody>
                {currentStudents.map((student) => (
                  <tr key={student.student_id} className={`h-16 ${theme === 'dark' ? 'hover:bg-accent border-border' : 'hover:bg-gray-100 border-gray-300'}`}>
                    <td className={`p-3 border ${theme === 'dark' ? 'border-border' : 'border-gray-300'}`}>
                      <div>
                        <p className={`font-medium ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>{student.name}</p>
                        <p className={`text-sm ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}`}>{student.usn}</p>
                      </div>
                    </td>

                    <td className={`p-3 border ${theme === 'dark' ? 'border-border' : 'border-gray-300'}`}>
                      <div className="flex items-center gap-2">
                        <span>{formatAttendancePercentage(student.attendance_percentage)}</span>
                        <div className={`w-full h-2 rounded ${theme === 'dark' ? 'bg-muted' : 'bg-gray-200'}`}>
                          <div
                            className="h-2 bg-green-500 rounded"
                            style={{ width: getProgressBarWidth(student.attendance_percentage) }}
                          />
                        </div>
                      </div>
                    </td>

                    <td className={`p-3 border ${theme === 'dark' ? 'border-border' : 'border-gray-300'}`}>{student.semester || "-"}</td>
                    <td className={`p-3 border ${theme === 'dark' ? 'border-border' : 'border-gray-300'}`}>{student.section || "-"}</td>

                    <td className={`p-3 border ${theme === 'dark' ? 'border-border' : 'border-gray-300'}`}>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="bg-primary text-white border-primary hover:bg-primary/90 hover:border-primary/90 hover:text-white transition-all duration-200 ease-in-out transform hover:scale-105 shadow-md"
                        onClick={() => updateState({ selectedStudent: student })}
                      >
                        <Eye size={16} /> View Details
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="flex justify-between items-center mt-6">
          <Button
            onClick={handlePrev}
            disabled={state.pagination.page === 1}
            className="bg-primary text-white border-primary hover:bg-primary/90 hover:border-primary/90 hover:text-white transition-all duration-200 ease-in-out transform hover:scale-105 shadow-md"
          >
            Previous
          </Button>
          <p className={theme === 'dark' ? 'text-foreground' : 'text-gray-900'}>
            Page {state.pagination.page} of {state.pagination.total_pages} ({state.pagination.total_students} total students)
          </p>
          <Button
            onClick={handleNext}
            disabled={state.pagination.page === state.pagination.total_pages}
            className="bg-primary text-white border-primary hover:bg-primary/90 hover:border-primary/90 hover:text-white transition-all duration-200 ease-in-out transform hover:scale-105 shadow-md"
          >
            Next
          </Button>
        </div>

        <Dialog open={!!state.selectedStudent} onOpenChange={() => updateState({ selectedStudent: null })}>
          <DialogContent className={`sm:max-w-md border ${theme === 'dark' ? 'bg-card text-foreground border-border' : 'bg-white text-gray-900 border-gray-300'}`}>
            <DialogHeader>
              <DialogTitle className={theme === 'dark' ? 'text-foreground' : 'text-gray-900'}>
                {state.selectedStudent?.name}'s Details
              </DialogTitle>
              <DialogDescription className={theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}>
                Full attendance record
              </DialogDescription>
            </DialogHeader>

            <div className={`space-y-2 mt-4 ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>
              <p><strong className={theme === 'dark' ? 'text-foreground' : 'text-gray-900'}>USN:</strong> {state.selectedStudent?.usn}</p>
              <p><strong className={theme === 'dark' ? 'text-foreground' : 'text-gray-900'}>Attendance:</strong> {formatAttendancePercentage(state.selectedStudent?.attendance_percentage)}</p>
              <p><strong className={theme === 'dark' ? 'text-foreground' : 'text-gray-900'}>Total Sessions:</strong> {state.selectedStudent?.total_sessions || "-"}</p>
              <p><strong className={theme === 'dark' ? 'text-foreground' : 'text-gray-900'}>Present Sessions:</strong> {state.selectedStudent?.present_sessions || "-"}</p>
              <p><strong className={theme === 'dark' ? 'text-foreground' : 'text-gray-900'}>Branch:</strong> {state.branch.toUpperCase()}</p>
              <p><strong className={theme === 'dark' ? 'text-foreground' : 'text-gray-900'}>Semester:</strong> {state.selectedStudent?.semester || "-"}</p>
              <p><strong className={theme === 'dark' ? 'text-foreground' : 'text-gray-900'}>Section:</strong> {state.selectedStudent?.section?.toUpperCase() || "-"}</p>
            </div>

            <DialogClose asChild>
              <Button className={`mt-6 w-full ${theme === 'dark' ? 'bg-card text-foreground border-border hover:bg-accent' : 'bg-white text-gray-900 border-gray-300 hover:bg-gray-100'}`}>
                Close
              </Button>
            </DialogClose>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
};

export default AttendanceView;