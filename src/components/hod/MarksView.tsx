import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Button } from "../ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import { UploadIcon } from "lucide-react";
import { Input } from "../ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose } from "../ui/dialog";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "../ui/select";
import { useToast } from "../ui/use-toast";
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from "recharts";
import autoTable from "jspdf-autotable";
import jsPDF from "jspdf";
import { manageProfile, getStudentPerformance, getSemesters, manageSections, manageSubjects, getMarks, getMarksBootstrap } from "../../utils/hod_api";
import { useTheme } from "../../context/ThemeContext";
import { SkeletonChart, SkeletonTable } from "../ui/skeleton";

// Define types for chart components
interface TooltipProps {
  active?: boolean;
  payload?: Array<{
    name: string;
    value: number;
    color: string;
    unit?: string;
  }>;
  label?: string;
}

interface LegendProps {
  payload?: Array<{
    value: string;
    color: string;
  }>;
}

interface Student {
  name: string;
  rollNo: string;
  subject_marks: { [key: string]: { average: number; tests: { test_number: number; mark: number; max_mark: number }[] } };
}

interface ChartData {
  subject: string;
  subject_code: string;
  average: number;
  max: number;
  attendance: number;
  semester: string;
}

interface Semester {
  id: string;
  name: string;
}

interface Section {
  id: string;
  name: string;
  semester_id: string;
}

interface Subject {
  id: string;
  name: string;
  semester_id: string;
}

const MarksView = () => {
  const { toast } = useToast();
  const { theme } = useTheme();
  const [state, setState] = useState({
    searchTerm: "",
    semesterFilter: "all", // Default to "All Semesters"
    sectionFilter: "",
    subjectFilter: "",
    students: [] as Student[],
    chartData: [] as ChartData[],
    semesters: [] as Semester[],
    sections: [] as Section[],
    subjects: [] as Subject[],
    loading: true,
    branchId: "",
    selectedStudent: null as Student | null,
    error: null as string | null,
    // Pagination state
    currentPage: 1,
    pageSize: 100,
    totalStudents: 0,
    totalPages: 0,
  });

  const reportRef = useRef<HTMLDivElement>(null);

  const updateState = (newState: Partial<typeof state>) => {
    setState(prev => ({ ...prev, ...newState }));
  };

  useEffect(() => {
    const fetchData = async () => {
      updateState({ loading: true, error: null });
      try {
        const filters: { 
          semester_id?: string; 
          section_id?: string; 
          subject_id?: string;
          search?: string;
          page?: number;
          page_size?: number;
        } = {};
        
        if (state.semesterFilter !== "all") {
          filters.semester_id = state.semesterFilter;
        }
        if (state.sectionFilter && state.sectionFilter !== "all") {
          filters.section_id = state.sectionFilter;
        }
        if (state.subjectFilter && state.subjectFilter !== "all") {
          filters.subject_id = state.subjectFilter;
        }
        if (state.searchTerm.trim()) {
          filters.search = state.searchTerm.trim();
        }
        
        filters.page = state.currentPage;
        filters.page_size = state.pageSize;

        const response = await getMarksBootstrap("", filters);
        if (!response.success || !response.data) {
          throw new Error(response.message || "Failed to fetch data");
        }

        const data = response.data;

        // Set branchId
        updateState({ branchId: data.profile.branch_id });

        // Set semesters
        const semestersData = data.semesters.map((s) => ({
          id: s.id,
          name: `${s.number}th Semester`,
        }));

        // Set sections
        const sectionsData = data.sections.map((s) => ({
          id: s.id,
          name: s.name,
          semester_id: s.semester_id,
        }));

        // Set subjects
        const subjectsData = data.subjects.map((s) => ({
          id: s.id,
          name: s.name,
          semester_id: s.semester_id,
        }));

        // Process performance data for chart
        const chartData = state.semesterFilter === "all"
          ? data.performance.map((p) => ({
              subject: p.subject,
              subject_code: p.subject,
              average: p.marks,
              max: 100,
              attendance: p.attendance,
              semester: p.semester,
            }))
          : data.performance
              .filter((p) => {
                const selectedSemester = semestersData.find(s => s.id === state.semesterFilter);
                return p.semester === selectedSemester?.name;
              })
              .map((p) => ({
                subject: p.subject,
                subject_code: p.subject,
                average: p.marks,
                max: 100,
                attendance: p.attendance,
                semester: p.semester,
              }));

        // Process marks data
        const studentsMap = new Map<string, Student>();
        data.marks.forEach((mark) => {
          const studentId = mark.student_id;
          if (!studentsMap.has(studentId)) {
            studentsMap.set(studentId, {
              name: mark.student,
              rollNo: mark.usn,
              subject_marks: {},
            });
          }
          const student = studentsMap.get(studentId)!;
          student.subject_marks[mark.subject] = {
            average: mark.average_mark,
            tests: mark.test_marks,
          };
        });
        const studentsData = Array.from(studentsMap.values());

        // Update pagination state
        updateState({
          semesters: semestersData,
          sections: sectionsData,
          subjects: subjectsData,
          chartData,
          students: studentsData,
          loading: false,
          error: null,
          totalStudents: data.pagination.total_students,
          totalPages: data.pagination.total_pages,
        });
      } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : "Failed to fetch data";
        console.error("Error fetching data:", err);
        updateState({
          students: [],
          chartData: [],
          sections: [],
          subjects: [],
          loading: false,
          error: errorMessage,
        });
        toast({ variant: "destructive", title: "Error", description: errorMessage });
      }
    };
    fetchData();
  }, [state.semesterFilter, state.sectionFilter, state.subjectFilter, state.searchTerm, state.currentPage, state.pageSize, toast]);

  // Custom Tooltip for BarChart
  const CustomTooltip = ({ active, payload, label }: TooltipProps) => {
    if (active && payload && payload.length) {
      return (
        <div className={`rounded-md px-3 py-2 shadow-md text-sm ${theme === 'dark' ? 'bg-card border border-border text-foreground' : 'bg-white border border-gray-300 text-gray-900'}`}>
          <p className={`font-medium ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>{label}</p>
          {payload.map((entry, index) => (
            <p key={index} className={theme === 'dark' ? 'text-foreground' : 'text-gray-900'}>
              <span
                className="inline-block w-3 h-3 rounded-full mr-2"
                style={{ backgroundColor: entry.color }}
              ></span>
              {entry.name}: {entry.value}
              {entry.unit ? entry.unit : ""}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  const CustomLegend = (props: LegendProps) => {
  const { payload } = props;
  return (
    <ul className={`flex gap-6 text-sm mt-2 ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>
      {payload && payload.map((entry, index) => (
        <li key={`item-${index}`} className="flex items-center gap-2">
          <span
            className="w-3 h-3 rounded-sm"
            style={{ backgroundColor: entry.color }}
          ></span>
          {entry.value}
        </li>
      ))}
    </ul>
  );
};

  const getSemesterDisplay = () =>
    state.semesterFilter === "all" ? "All Semesters" : state.semesters.find((s) => s.id === state.semesterFilter)?.name || "Select Semester";
  const getSectionDisplay = () =>
    state.sectionFilter === "all" ? "All Sections" : state.sections.find((s) => s.id === state.sectionFilter)?.name || "All Sections";
  const getSubjectDisplay = () =>
    state.subjectFilter === "all" ? "All Subjects" : state.subjects.find((s) => s.id === state.subjectFilter)?.name || "All Subjects";

  // Get subject keys for table columns
  const subjectKeys = state.subjects.map((s) => s.name);

  // Students are already filtered server-side
  const filteredStudents = state.students;

  const handleExportPDF = (type: "marks" | "attendance") => {
    const doc = new jsPDF();
    let headers: string[] = [];
    let data: string[][] = [];

    if (type === "marks") {
      headers = ["Name", "Roll No", ...subjectKeys];
      data = filteredStudents.map((student) => [
        student.name,
        student.rollNo,
        ...subjectKeys.map((key) => {
          const subjectData = student.subject_marks[key];
          if (!subjectData) return "-";
          return `Avg: ${subjectData.average}, Tests: ${subjectData.tests.map(t => `${t.mark}/${t.max_mark}`).join(", ")}`;
        }),
      ]);
    } else {
      headers = ["Name", "Roll No", ...subjectKeys];
      data = filteredStudents.map((student) => [
        student.name,
        student.rollNo,
        ...subjectKeys.map((key) => {
          const chartItem = state.chartData.find(c => c.subject === key);
          return chartItem ? `${chartItem.attendance}%` : "-";
        }),
      ]);
    }

    autoTable(doc, {
      head: [headers],
      body: data,
      startY: 20,
      theme: "grid",
    });

    doc.save(`${type}_report.pdf`);
  };

  return (
    <div className={`p-6 min-h-screen ${theme === 'dark' ? 'bg-background text-foreground' : 'bg-gray-50 text-gray-900'}`} ref={reportRef}>
      <div>
        <h2 className="text-2xl font-semibold">Internal Marks & Attendance</h2>
        <p className={`text-sm ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}`}>
          View and analyze student performance and generate reports.
        </p>
      </div>

      {state.loading && !state.students.length && (
        <div className="space-y-6 my-4">
          <SkeletonChart />
          <SkeletonTable rows={10} cols={5} />
        </div>
      )}

      <div className="flex flex-wrap gap-4 my-6">
        <Select
          value={state.semesterFilter}
          onValueChange={(value) =>
            updateState({ semesterFilter: value, sectionFilter: "all", subjectFilter: "all", currentPage: 1 })
          }
          disabled={state.loading || state.semesters.length === 0}
        >
          <SelectTrigger className={theme === 'dark' ? 'w-48 bg-background text-foreground border-border' : 'w-48 bg-white text-gray-900 border-gray-300'}>
            <SelectValue placeholder={getSemesterDisplay()} />
          </SelectTrigger>
          <SelectContent className={theme === 'dark' ? 'bg-background text-foreground border-border' : 'bg-white text-gray-900 border-gray-300'}>
            <SelectItem value="all" className={theme === 'dark' ? 'focus:bg-accent' : 'focus:bg-gray-100'}>All Semesters</SelectItem>
            {state.semesters.map((semester) => (
              <SelectItem key={semester.id} value={semester.id} className={theme === 'dark' ? 'focus:bg-accent' : 'focus:bg-gray-100'}>
                {semester.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={state.sectionFilter}
          onValueChange={(value) => updateState({ sectionFilter: value, currentPage: 1 })}
          disabled={
            state.loading ||
            state.sections.length === 0
          }
        >
          <SelectTrigger className={theme === 'dark' ? 'w-48 bg-background text-foreground border-border' : 'w-48 bg-white text-gray-900 border-gray-300'}>
            <SelectValue placeholder={getSectionDisplay()} />
          </SelectTrigger>
          <SelectContent className={theme === 'dark' ? 'bg-background text-foreground border-border' : 'bg-white text-gray-900 border-gray-300'}>
            <SelectItem value="all" className={theme === 'dark' ? 'focus:bg-accent' : 'focus:bg-gray-100'}>All Sections</SelectItem>
            {state.sections
              .filter((section) => state.semesterFilter === "all" || section.semester_id === state.semesterFilter)
              .map((section) => (
                <SelectItem key={section.id} value={section.id} className={theme === 'dark' ? 'focus:bg-accent' : 'focus:bg-gray-100'}>
                  {section.name}
                </SelectItem>
              ))}
          </SelectContent>
        </Select>

        <Select
          value={state.subjectFilter}
          onValueChange={(value) => updateState({ subjectFilter: value, currentPage: 1 })}
          disabled={
            state.loading ||
            state.subjects.length === 0
          }
        >
          <SelectTrigger className={theme === 'dark' ? 'w-48 bg-background text-foreground border-border' : 'w-48 bg-white text-gray-900 border-gray-300'}>
            <SelectValue placeholder={getSubjectDisplay()} />
          </SelectTrigger>
          <SelectContent className={theme === 'dark' ? 'bg-background text-foreground border-border' : 'bg-white text-gray-900 border-gray-300'}>
            <SelectItem value="all" className={theme === 'dark' ? 'focus:bg-accent' : 'focus:bg-gray-100'}>All Subjects</SelectItem>
            {state.subjects
              .filter((subject) => state.semesterFilter === "all" || subject.semester_id === state.semesterFilter)
              .map((subject) => (
                <SelectItem key={subject.id} value={subject.id} className={theme === 'dark' ? 'focus:bg-accent' : 'focus:bg-gray-100'}>
                  {subject.name}
                </SelectItem>
              ))}
          </SelectContent>
        </Select>
      </div>

      {state.error && (
        <Card className="my-4">
          <CardContent>
            <p className={`text-center ${theme === 'dark' ? 'text-destructive' : 'text-red-500'}`}>{state.error}</p>
          </CardContent>
        </Card>
      )}

      {!state.loading && !state.error && (
        <Tabs defaultValue="marks">
          <TabsList className={`w-full justify-center rounded-md p-1 ${theme === 'dark' ? 'bg-card border border-border' : 'bg-gray-200 border border-gray-300'}`}>
            <TabsTrigger 
              value="marks" 
              className={`w-full rounded-sm ${theme === 'dark' ? 'data-[state=active]:bg-primary data-[state=active]:text-white' : 'data-[state=active]:bg-primary data-[state=active]:text-white'}`}
            >
              Marks Report
            </TabsTrigger>
            <TabsTrigger 
              value="attendance" 
              className={`w-full rounded-sm ${theme === 'dark' ? 'data-[state=active]:bg-primary data-[state=active]:text-white' : 'data-[state=active]:bg-primary data-[state=active]:text-white'}`}
            >
              Attendance Report
            </TabsTrigger>
          </TabsList>

          {/* Marks Report */}
          <TabsContent value="marks">
            <Card className={theme === 'dark' ? 'bg-card border border-border' : 'bg-white border border-gray-300'}>
              <CardHeader>
                <CardTitle className={theme === 'dark' ? 'text-foreground' : 'text-gray-900'}>Class Average Marks by Subject</CardTitle>
                <span className={`text-sm ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}`}>
                  {getSemesterDisplay()}, {getSectionDisplay()}
                </span>
              </CardHeader>
              <CardContent className="flex flex-col gap-4">
                {state.chartData.length === 0 ? (
                  <p className={`text-center ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}`}>No chart data available</p>
                ) : (
                  <div className="h-80 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={state.chartData}>
                        <XAxis dataKey="subject" stroke={theme === 'dark' ? '#9ca3af' : '#6b7280'} />
                        <YAxis stroke={theme === 'dark' ? '#9ca3af' : '#6b7280'} />
                        <Tooltip content={<CustomTooltip />} />
                        <Legend content={<CustomLegend />} />
                        <Bar dataKey="average" fill="#22d3ee" radius={[4, 4, 0, 0]} name="Class Average" />
                        <Bar dataKey="max" fill="#64748b" radius={[4, 4, 0, 0]} name="Maximum Marks" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </CardContent>
            </Card>

            <div className="flex justify-between items-center mt-6">
              <Input
                placeholder="Search by name or roll number..."
                className={`w-1/3 ${theme === 'dark' ? 'bg-background text-foreground border-border placeholder:text-muted-foreground' : 'bg-white text-gray-900 border-gray-300 placeholder:text-gray-500'}`}
                value={state.searchTerm}
                onChange={(e) => updateState({ searchTerm: e.target.value, currentPage: 1 })}
                disabled={state.loading}
              />
              <Button
                className="flex items-center gap-2 bg-primary text-white border-primary hover:bg-primary/90 hover:border-primary/90 hover:text-white transition-all duration-200 ease-in-out transform hover:scale-105 shadow-md"
                onClick={() => handleExportPDF("marks")}
                disabled={state.loading || filteredStudents.length === 0}
              >
                <UploadIcon className="w-4 h-4" />
                Export Marks to PDF
              </Button>
            </div>

            {/* Pagination Controls */}
            {state.totalPages > 1 && (
              <div className="flex justify-between items-center mt-4">
                <div className={`text-sm ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}`}>
                  Showing {((state.currentPage - 1) * state.pageSize) + 1} to {Math.min(state.currentPage * state.pageSize, state.totalStudents)} of {state.totalStudents} students
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => updateState({ currentPage: state.currentPage - 1 })}
                    disabled={state.currentPage <= 1 || state.loading}
                    className={theme === 'dark' ? 'bg-background text-foreground border-border hover:bg-accent' : 'bg-white text-gray-900 border-gray-300 hover:bg-gray-100'}
                  >
                    Previous
                  </Button>
                  <span className={`text-sm px-3 ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>
                    Page {state.currentPage} of {state.totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => updateState({ currentPage: state.currentPage + 1 })}
                    disabled={state.currentPage >= state.totalPages || state.loading}
                    className={theme === 'dark' ? 'bg-background text-foreground border-border hover:bg-accent' : 'bg-white text-gray-900 border-gray-300 hover:bg-gray-100'}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}

            <Card className={`mt-6 rounded-xl shadow-lg ${theme === 'dark' ? 'bg-card border border-border' : 'bg-white border border-gray-300'}`}>
              <CardContent className="p-0 rounded-xl overflow-x-auto custom-scrollbar">
                <table className="min-w-full text-sm table-auto">
                  <thead className={`sticky top-0 z-10 ${theme === 'dark' ? 'bg-card' : 'bg-gray-100'}`}>
                    <tr>
                      <th className={`text-left py-4 px-6 font-semibold tracking-wide ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>Student</th>
                      {subjectKeys.map((subject) => (
                        <th key={subject} className={`text-left py-4 px-5 font-semibold tracking-wide ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>
                          {subject}
                        </th>
                      ))}
                      <th className={`text-left py-4 px-5 font-semibold tracking-wide ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredStudents.length === 0 ? (
                      <tr>
                        <td colSpan={subjectKeys.length + 2} className={`py-6 text-center ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}`}>
                          No students found
                        </td>
                      </tr>
                    ) : (
                      filteredStudents.map((student, idx) => (
                        <tr
                          key={student.rollNo}
                          className={`border-b ${theme === 'dark' ? 'border-border' : 'border-gray-300'} ${idx % 2 === 0 ? (theme === 'dark' ? 'bg-card' : 'bg-gray-50') : (theme === 'dark' ? 'bg-background' : 'bg-white')}`}
                        >
                          <td className={`py-4 px-6 ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>
                            <div className="font-semibold truncate">{student.name}</div>
                            <div className={`text-xs truncate ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}`}>{student.rollNo}</div>
                          </td>
                          {subjectKeys.map((subject) => (
                            <td key={subject} className={`py-4 px-5 align-top ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>
                              {student.subject_marks[subject] ? (
                                <div className="space-y-1">
                                  <div className={`text-sm font-medium ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>
                                    Avg: {student.subject_marks[subject]?.average || "-"}
                                  </div>
                                  <div className={`text-xs ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}`}>Tests:</div>
                                  <ul className={`flex flex-wrap gap-2 text-xs ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>
                                    {student.subject_marks[subject]?.tests.map((test) => (
                                      <li key={test.test_number} className="flex items-center gap-1">
                                        <span className={`inline-block w-1.5 h-1.5 rounded-full ${theme === 'dark' ? 'bg-foreground' : 'bg-gray-900'}`}></span>
                                        {test.mark}/{test.max_mark}
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              ) : (
                                "-"
                              )}
                            </td>
                          ))}
                          <td className="py-2 px-4">
                            <Button
                              className="text-sm bg-primary text-white border-primary hover:bg-primary/90 hover:border-primary/90 hover:text-white transition-all duration-200 ease-in-out transform hover:scale-105 shadow-md"
                              size="sm"
                              onClick={() => updateState({ selectedStudent: student })}
                            >
                              View Details
                            </Button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </CardContent>
            </Card>

          </TabsContent>

          {/* Attendance Report */}
          <TabsContent value="attendance">
            <Card className={theme === 'dark' ? 'bg-card border border-border' : 'bg-white border border-gray-300'}>
              <CardHeader>
                <CardTitle className={theme === 'dark' ? 'text-foreground' : 'text-gray-900'}>Class Average Attendance by Subject</CardTitle>
                <span className={`text-sm ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}`}>
                  {getSemesterDisplay()}, {getSectionDisplay()}
                </span>
              </CardHeader>
              <CardContent className="flex flex-col gap-4">
                {state.chartData.length === 0 ? (
                  <p className={`text-center ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}`}>No chart data available</p>
                ) : (
                  <div className="h-80 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={state.chartData}>
                        <XAxis dataKey="subject" stroke={theme === 'dark' ? '#9ca3af' : '#6b7280'} />
                        <YAxis stroke={theme === 'dark' ? '#9ca3af' : '#6b7280'} unit="%" />
                        <Tooltip content={<CustomTooltip />} />
                        <Legend content={<CustomLegend />} />
                        <Bar dataKey="attendance" fill="#10b981" radius={[4, 4, 0, 0]} name="Class Average Attendance" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </CardContent>
            </Card>

            <div className="flex justify-between items-center mt-6">
              <Input
                placeholder="Search by name or roll number..."
                className={`w-1/3 ${theme === 'dark' ? 'bg-background text-foreground border-border placeholder:text-muted-foreground' : 'bg-white text-gray-900 border-gray-300 placeholder:text-gray-500'}`}
                value={state.searchTerm}
                onChange={(e) => updateState({ searchTerm: e.target.value, currentPage: 1 })}
                disabled={state.loading}
              />
              <Button
                className="flex items-center gap-2 bg-primary text-white border-primary hover:bg-primary/90 hover:border-primary/90 hover:text-white transition-all duration-200 ease-in-out transform hover:scale-105 shadow-md"
                onClick={() => handleExportPDF("attendance")}
                disabled={state.loading || filteredStudents.length === 0}
              >
                <UploadIcon className="w-4 h-4" />
                Export Attendance to PDF
              </Button>
            </div>

            {/* Pagination Controls */}
            {state.totalPages > 1 && (
              <div className="flex justify-between items-center mt-4">
                <div className={`text-sm ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}`}>
                  Showing {((state.currentPage - 1) * state.pageSize) + 1} to {Math.min(state.currentPage * state.pageSize, state.totalStudents)} of {state.totalStudents} students
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => updateState({ currentPage: state.currentPage - 1 })}
                    disabled={state.currentPage <= 1 || state.loading}
                    className={theme === 'dark' ? 'bg-background text-foreground border-border hover:bg-accent' : 'bg-white text-gray-900 border-gray-300 hover:bg-gray-100'}
                  >
                    Previous
                  </Button>
                  <span className={`text-sm px-3 ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>
                    Page {state.currentPage} of {state.totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => updateState({ currentPage: state.currentPage + 1 })}
                    disabled={state.currentPage >= state.totalPages || state.loading}
                    className={theme === 'dark' ? 'bg-background text-foreground border-border hover:bg-accent' : 'bg-white text-gray-900 border-gray-300 hover:bg-gray-100'}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}

            <Card className={`mt-4 ${theme === 'dark' ? 'bg-card border border-border' : 'bg-white border border-gray-300'}`}>
              <CardContent className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className={`border-b ${theme === 'dark' ? 'border-border' : 'border-gray-300'}`}>
                      <th className={`text-left py-2 px-4 font-medium ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>Student</th>
                      {subjectKeys.map((subject) => (
                        <th key={subject} className={`text-left py-2 px-4 font-medium ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>
                          {subject}
                        </th>
                      ))}
                      <th className={`text-left py-2 px-4 font-medium ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredStudents.length === 0 ? (
                      <tr>
                        <td colSpan={subjectKeys.length + 2} className={`py-3 text-center ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}`}>
                          No students found
                        </td>
                      </tr>
                    ) : (
                      filteredStudents.map((student) => (
                        <tr key={student.rollNo} className={`border-b ${theme === 'dark' ? 'border-border hover:bg-accent' : 'border-gray-300 hover:bg-gray-100'}`}>
                          <td className={`py-2 px-4 ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>
                            <div className="font-semibold">{student.name}</div>
                            <div className={`text-xs ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}`}>{student.rollNo}</div>
                          </td>
                          {subjectKeys.map((subject) => (
                            <td key={subject} className={`py-2 px-4 ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>
                              {student.subject_marks[subject]
                                ? `${state.chartData.find((c) => c.subject === subject)?.attendance || 0}%`
                                : "-"}
                            </td>
                          ))}
                          <td className="py-2 px-4">
                            <Button
                              className={`text-sm ${theme === 'dark' ? 'bg-card text-foreground border-border hover:bg-accent' : 'bg-white text-gray-900 border-gray-300 hover:bg-gray-100'}`}
                              size="sm"
                              onClick={() => updateState({ selectedStudent: student })}
                            >
                              View Details
                            </Button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

      )}

      <Dialog open={!!state.selectedStudent} onOpenChange={() => updateState({ selectedStudent: null })}>
        <DialogContent className={`sm:max-w-[500px] ${theme === 'dark' ? 'bg-card text-foreground' : 'bg-white text-gray-900'}`}>
          <DialogHeader>
            <DialogTitle>Student Details</DialogTitle>
          </DialogHeader>
          {state.selectedStudent && (
            <div className="space-y-4">
              <div>
                <h4 className={`text-sm font-medium ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>Name</h4>
                <p className={`text-base ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>{state.selectedStudent.name}</p>
              </div>
              <div>
                <h4 className={`text-sm font-medium ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>Roll Number</h4>
                <p className={`text-base ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>{state.selectedStudent.rollNo}</p>
              </div>
              <div>
                <h4 className={`text-sm font-medium ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>Marks</h4>
                {Object.keys(state.selectedStudent.subject_marks).length === 0 ? (
                  <p className={`text-sm ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>No marks available</p>
                ) : (
                  <table className="min-w-full text-sm border-t">
                    <thead>
                      <tr className={`border-b ${theme === 'dark' ? 'border-border' : 'border-gray-300'}`}>
                        <th className={`text-left py-2 px-3 font-medium ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>Subject</th>
                        <th className={`text-left py-2 px-3 font-medium ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>Marks</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Object.entries(state.selectedStudent.subject_marks).map(([subject, marks]) => (
                        <tr key={subject} className={`border-b ${theme === 'dark' ? 'border-border' : 'border-gray-300'}`}>
                          <td className={`py-2 px-3 ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>{subject}</td>
                          <td className={`py-2 px-3 ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>
                            <p className="text-sm">Average: {marks.average || "-"}</p>
                            <p className={`text-sm ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>Tests:</p>
                            <ul className={`list-disc list-inside text-sm ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>
                              {marks.tests.map((test) => (
                                <li key={test.test_number}>
                                  Test {test.test_number}: {test.mark}/{test.max_mark}
                                </li>
                              ))}
                            </ul>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          )}
          <DialogClose asChild>
            <Button
              variant="outline"
              className={`mt-4 ${theme === 'dark' ? 'bg-card text-foreground border-border hover:bg-accent' : 'bg-white text-gray-900 border-gray-300 hover:bg-gray-100'}`}
            >
              Close
            </Button>
          </DialogClose>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MarksView;
