import { useRef, useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../ui/card";
import { Input } from "../ui/input";
import { Button } from "../ui/button";
import { SkeletonTable } from "../ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "../ui/dialog";
import { Pencil, Trash2, UploadCloud, Upload, Loader2 } from "lucide-react";
// Removed chart imports; performance chart is no longer shown on this page
import Papa from "papaparse";
import * as XLSX from "xlsx";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "../ui/select";
import { manageStudents, getSemesters, manageSections, manageProfile, manageBatches, getHODStudentBootstrap } from "../../utils/hod_api";
import { useHODBootstrap } from "../../context/HODBootstrapContext";
import { useTheme } from "../../context/ThemeContext";

const mockChartData = [
  { subject: "CS101", attendance: 85, marks: 78, semester: "4th Semester" },
  { subject: "CS102", attendance: 92, marks: 88, semester: "4th Semester" },
  { subject: "CS103", attendance: 75, marks: 69, semester: "4th Semester" },
];
interface Semester {
  id: string;
  number: number;
}

interface Batch {
  id: string;
  name: string;
  start_year: number;
  end_year: number;
}

interface Section {
  id: string;
  name: string;
  semester_id: string;
}

interface Student {
  usn: string;
  name: string;
  email: string;
  section: string;
  semester: string;
  cycle?: string;
  phone?: string;
  mode_of_admission?: string;
}

const StudentManagement = () => {
  const { theme } = useTheme();
  const [state, setState] = useState({
    students: [] as Student[],
    search: "",
    sectionFilter: "All",
    semesterFilter: "All",
    selectedStudent: null as Student | null,
    confirmDelete: false,
    editDialog: false,
    addStudentModal: false,
    editForm: { name: "", email: "", section: "", semester: "", cycle: "", phone: "", mode_of_admission: "KCET" },
    uploadErrors: [] as string[],
    uploadedCount: 0,
    updatedCount: 0,
    droppedFileName: null as string | null,
    selectedFile: null as File | null,
    manualForm: { usn: "", name: "", email: "", section: "", semester: "", batch: "", cycle: "", phone: "", mode_of_admission: "KCET" },
    currentPage: 1,
    totalPages: 1,
    selectedSemester: "",
    semesters: [] as Semester[],
    manualSections: [] as Section[],
    listSections: [] as Section[],
    editSections: [] as Section[],
    batches: [] as Batch[],
    branchId: "",
    chartData: mockChartData,
    isLoading: false,
    isEditSectionsLoading: false,
    manualErrors: {} as Record<string, string>,
    manualSemesters: [] as Semester[],
    totalStudents: 0,
    pageSize: 50,
    successMessage: "",
  });

  const bootstrap = useHODBootstrap();
  const [sectionsCache, setSectionsCache] = useState<Record<string, Section[]>>({});

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Helper to update state
  const updateState = (newState: Partial<typeof state>) => {
    setState((prev) => ({ ...prev, ...newState }));
  };

  // Fetch students
  const fetchStudents = async (branchId: string, page: number = 1, pageSize: number = 50, search: string = '', sectionId: string = '', forceRefresh: boolean = false) => {
    try {
      const params: any = {
        branch_id: branchId,
        page: page,
        page_size: pageSize
      };
      if (search) params.search = search;
      if (sectionId) params.section_id = sectionId;
      if (forceRefresh) params.force_refresh = true;
      const studentRes = await manageStudents(params, "GET");
      // Normalize different possible response shapes from backend
      // 1) { success: true, results: [...], count }
      // 2) { success: true, data: { students: [...] } }
      // 3) plain array
      let results: any[] = [];
      let count = 0;
      if (studentRes == null) {
        results = [];
      } else if ((studentRes as any).results && Array.isArray((studentRes as any).results)) {
        results = (studentRes as any).results;
        count = (studentRes as any).count || results.length;
      } else if ((studentRes as any).data && Array.isArray((studentRes as any).data.students)) {
        results = (studentRes as any).data.students;
        count = (studentRes as any).count || results.length;
      } else if (Array.isArray(studentRes)) {
        results = studentRes as any[];
        count = results.length;
      } else if ((studentRes as any).success === false) {
        // Backend returned an error
        updateState({ uploadErrors: [...state.uploadErrors, `Students API: ${(studentRes as any).message || 'Error fetching students'}`] });
        results = [];
      } else {
        // Unknown shape but try to extract 'data' array
        if ((studentRes as any).data && Array.isArray((studentRes as any).data)) {
          results = (studentRes as any).data;
          count = results.length;
        } else {
          results = [];
        }
      }

      // Map results into UI student shape
      const students = results.map((s: any) => ({
        usn: s.usn,
        name: s.name,
        email: s.email,
        phone: s.phone,
        section: s.section || 'Unknown',
        semester: s.semester || 'Unknown',
        cycle: s.cycle,
        mode_of_admission: s.mode_of_admission,
      }));
      const totalPages = Math.ceil(count / pageSize);
      updateState({ students, totalStudents: count, currentPage: page, totalPages });
    } catch (err) {
      updateState({ uploadErrors: [...state.uploadErrors, "Failed to fetch students"] });
    }
  };

  // Fetch batches
  const fetchBatches = async () => {
    try {
      const batchRes = await manageBatches();
      if (batchRes.success && batchRes.batches) {
        const defaultBatch = batchRes.batches[0]?.name || "";
        updateState({
          batches: batchRes.batches,
          manualForm: { ...state.manualForm, batch: defaultBatch }
        });
      } else {
        updateState({ uploadErrors: [...state.uploadErrors, `Batches API: ${batchRes.message || "No batches found"}`] });
      }
    } catch (err) {
      updateState({ uploadErrors: [...state.uploadErrors, "Failed to fetch batches"] });
    }
  };

  // Fetch initial data
  useEffect(() => {
    const fetchInitialData = async () => {
      updateState({ isLoading: true });
      try {
        const boot = await getHODStudentBootstrap(['profile', 'semesters', 'sections', 'batches']);
        if (!boot.success || !boot.data?.profile?.branch_id) {
          throw new Error(boot.message || "Failed to bootstrap student management");
        }
        const branchId = boot.data.profile.branch_id;
        updateState({ branchId });

        // Fetch initial students separately
        await fetchStudents(branchId, 1, state.pageSize);

        // Batches
        if (Array.isArray(boot.data.batches)) {
          const batches = boot.data.batches.map((b: any) => ({ ...b, id: b.id.toString() }));
          const defaultBatch = batches[0]?.name || "";
          updateState({ batches, manualForm: { ...state.manualForm, batch: defaultBatch } });
        } else {
          await fetchBatches();
        }

        // Semesters
        if (Array.isArray(boot.data.semesters) && boot.data.semesters.length > 0) {
          const semesters = boot.data.semesters.map((s: any) => ({ id: s.id.toString(), number: s.number }));
          const defaultSemester = `${semesters[0].number}th Semester`;
          updateState({ semesters, selectedSemester: defaultSemester, manualForm: { ...state.manualForm, semester: defaultSemester } });
          // Manual sections will be populated by useEffect based on semester selection
        } else {
          updateState({ uploadErrors: [...state.uploadErrors, "No semesters found"] });
        }

        // Sections - populate cache with all sections from bootstrap
        if (Array.isArray(boot.data.sections) && boot.data.sections.length > 0) {
          const sectionsBySemester: Record<string, Section[]> = {};
          boot.data.sections.forEach((sec: any) => {
            const semesterId = String(sec.semester_id || "ALL");
            if (!sectionsBySemester[semesterId]) {
              sectionsBySemester[semesterId] = [];
            }
            sectionsBySemester[semesterId].push({
              id: String(sec.id),
              name: sec.name,
              semester_id: String(sec.semester_id || ""),
            });
          });
          setSectionsCache(sectionsBySemester);
        }

        // Students are now fetched separately via fetchStudents call above

        // Performance fetch removed (chart not shown on this page)
      } catch (err) {
        console.error("Error fetching initial data:", err);
        updateState({ uploadErrors: [...state.uploadErrors, "Failed to connect to backend"] });
      } finally {
        updateState({ isLoading: false });
      }
    };
    fetchInitialData();
  }, []);

  // Handle search
  const handleSearch = () => {
    if (state.branchId) {
      const sectionId = state.sectionFilter === "All" ? "" : state.sectionFilter;
      fetchStudents(state.branchId, 1, state.pageSize, state.search, sectionId);
    }
  };

  // Fetch students when section filter changes
  useEffect(() => {
    if (state.branchId) {
      const sectionId = state.sectionFilter === "All" ? "" : state.sectionFilter;
      fetchStudents(state.branchId, 1, state.pageSize, state.search, sectionId);
    }
  }, [state.sectionFilter]);

  // Fetch sections when semester changes in Add Student Manually
  useEffect(() => {
    if (state.branchId && state.manualForm.semester) {
      const semesterId = getSemesterId(state.manualForm.semester);
      // Use cached sections instead of making API call
      const cacheKey = semesterId || "ALL";
      const cached = sectionsCache[cacheKey];
      if (cached) {
        updateState({
          manualSections: cached,
          manualForm: { ...state.manualForm, section: cached[0]?.name || "" },
        });
      } else {
        updateState({
          manualSections: [],
          manualForm: { ...state.manualForm, section: "" },
        });
      }
    } else if (state.branchId) {
      updateState({ manualSections: [], manualForm: { ...state.manualForm, section: "" } });
    }
  }, [state.branchId, state.manualForm.semester, sectionsCache]);

  // Fetch sections when semester changes in Student List filter
  useEffect(() => {
    if (state.branchId && state.semesterFilter !== "All") {
      // Use cached sections instead of making API call
      const cached = sectionsCache[state.semesterFilter];
      if (cached) {
        updateState({ listSections: cached });
      } else {
        updateState({ listSections: [] });
      }
    } else if (state.branchId) {
      // For "All" semesters, show all sections
      const allSections = Object.values(sectionsCache).flat();
      const uniqueSections = allSections.filter((section, index, self) =>
        index === self.findIndex(s => s.id === section.id)
      );
      updateState({ listSections: uniqueSections });
    }
  }, [state.branchId, state.semesterFilter, sectionsCache]);

  // Fetch sections when semester changes in Edit Dialog
  useEffect(() => {
    if (state.editDialog && state.branchId && state.editForm.semester) {
      const semesterId = getSemesterId(state.editForm.semester);
      const semesterNumber = getSemesterNumber(state.editForm.semester);
      if (semesterId) {
        // Use cached sections instead of making API call
        const cacheKey = semesterId || "ALL";
        const cached = sectionsCache[cacheKey];
        if (cached) {
          updateState({
            editSections: cached,
            editForm: {
              ...state.editForm,
              section: cached.find((s: any) => s.name === state.editForm.section)?.name || cached[0]?.name || "",
              cycle: semesterNumber <= 2 ? state.editForm.cycle : "" // Reset cycle for semesters > 2
            },
          });
        } else {
          updateState({
            editSections: [],
            editForm: { ...state.editForm, section: "", cycle: semesterNumber <= 2 ? state.editForm.cycle : "" },
          });
        }
      } else {
        updateState({ editSections: [], editForm: { ...state.editForm, section: "", cycle: "" } });
      }
    }
  }, [state.branchId, state.editForm.semester, state.editDialog, sectionsCache]);

  // Map semester and section names to IDs
  const getSemesterId = (semesterName: string) =>
    state.semesters.find((s) => `${s.number}th Semester` === semesterName)?.id || "";

  const getSemesterNumber = (semesterName: string) =>
    state.semesters.find((s) => `${s.number}th Semester` === semesterName)?.number || 0;

  const formatSemesterDisplay = (student: Student) => {
    const semesterNumber = getSemesterNumber(student.semester);
    if (semesterNumber <= 2 && student.cycle) {
      return `${student.semester} (${student.cycle} cycle)`;
    }
    return student.semester;
  };

  const getSectionId = (sectionName: string, sections: Section[]) =>
    sections.find((s) => s.name === sectionName)?.id || "";

  const getBatchId = (batchName: string) =>
    state.batches.find((b) => b.name === batchName)?.id || "";

  // Handle file selection (just stores the file, doesn't process)
  const handleFileSelect = (file: File) => {
    updateState({
      selectedFile: file,
      droppedFileName: file.name,
      uploadErrors: [],
      uploadedCount: 0,
      updatedCount: 0
    });
  };

  // Handle student enrollment (processes the selected file)
  const handleEnrollStudents = async () => {
    if (!state.selectedFile) {
      updateState({ uploadErrors: ["Please select a file first"] });
      return;
    }

    if (!state.manualForm.semester || !state.manualForm.section || !state.manualForm.batch) {
      updateState({ uploadErrors: ["Please select batch, semester and section before enrolling"] });
      return;
    }

    // Check cycle validation for semesters 1 and 2
    const semesterNumber = getSemesterNumber(state.manualForm.semester);
    if (semesterNumber <= 2 && !state.manualForm.cycle) {
      updateState({ uploadErrors: ["Please select cycle for semesters 1 and 2"] });
      return;
    }

    updateState({ isLoading: true, uploadErrors: [] });

    const file = state.selectedFile;
    const reader = new FileReader();
    const extension = file.name.split(".").pop()?.toLowerCase();

    reader.onload = async (e) => {
      try {
        const result = e.target?.result;
        if (!result) {
          updateState({ uploadErrors: ["No data in file"], uploadedCount: 0, updatedCount: 0, isLoading: false });
          return;
        }

        let data: any[] = [];
        if (extension === "csv") {
          const parsed = Papa.parse(result as string, { header: true, skipEmptyLines: true });
          data = parsed.data;
        } else if (extension === "xls" || extension === "xlsx") {
          const workbook = XLSX.read(result, { type: "binary" });
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          data = XLSX.utils.sheet_to_json(worksheet);
        } else {
          updateState({
            uploadErrors: ["Unsupported file type (use CSV, XLS, or XLSX)"],
            uploadedCount: 0,
            updatedCount: 0,
          });
          return;
        }

        // Validate and sanitize
        const errors: string[] = [];
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

        const selectedBatchId = getBatchId(state.manualForm.batch);
        const selectedSemesterId = getSemesterId(state.manualForm.semester);
        const selectedSectionId = getSectionId(state.manualForm.section, state.manualSections);

        if (!selectedBatchId) {
          updateState({ uploadErrors: ["Invalid batch selected. Please select a valid batch."], uploadedCount: 0, updatedCount: 0, isLoading: false });
          return;
        }

        const bulkData = data
          .map((entry, index) => {
            const usn = String(entry.usn || entry.USN || "").trim();
            const name = String(entry.name || entry.Name || "").trim();
            const email = String(entry.email || entry.Email || "").trim();
            const parent_name = String(entry.parent_name || entry.ParentName || "").trim() || "";
            const parent_contact = String(entry.parent_contact || entry.ParentContact || "").trim() || "";
            const emergency_contact = String(entry.emergency_contact || entry.EmergencyContact || "").trim() || "";
            const phone = String(entry.phone || entry.Phone || entry.contact || entry.Contact || entry.contact_number || entry.ContactNumber || "").trim() || "";
            const blood_group = String(entry.blood_group || entry.BloodGroup || "").trim() || "";
            const mode_of_admission = String(entry.mode_of_admission || entry.ModeOfAdmission || state.manualForm.mode_of_admission || "KCET").trim();
            const date_of_admission = entry.date_of_admission || entry.DateOfAdmission || new Date().toISOString().split("T")[0];
            const row = index + 2;

            if (!usn || !name) {
              // Skip rows with missing required fields instead of erroring
              return null;
            }
            // Email validation (optional)
            if (email && !emailRegex.test(email)) {
              errors.push(`Row ${row}: Invalid email "${email}"`);
              return null;
            }

            const cycle = String(entry.cycle || entry.Cycle || "").trim().toUpperCase();

            // Validate cycle for semesters 1 and 2 - use UI selected cycle if available
            const semesterNumber = getSemesterNumber(state.manualForm.semester);
            const selectedCycle = state.manualForm.cycle;

            if (semesterNumber <= 2) {
              // Use cycle from UI selection, or from CSV if provided
              const finalCycle = selectedCycle || cycle;
              if (!finalCycle || !['P', 'C'].includes(finalCycle)) {
                errors.push(`Row ${row}: Cycle (P or C) is required for semester ${semesterNumber}. Please select cycle above or include in CSV.`);
                return null;
              }
            } else if (cycle) {
              errors.push(`Row ${row}: Cycle can only be set for semesters 1 and 2`);
              return null;
            }

            return {
              usn,
              name,
              email,
              cycle: semesterNumber <= 2 ? (selectedCycle || cycle) : undefined,
              phone: phone || undefined,
              parent_name,
              parent_contact,
              emergency_contact,
              blood_group,
              mode_of_admission,
              date_of_admission,
              semester_id: selectedSemesterId,
              section_id: selectedSectionId,
              batch_id: selectedBatchId,
              branch_id: state.branchId
            };
          })
          .filter(Boolean);

        if (bulkData.length === 0) {
          updateState({ uploadErrors: ["No valid students found in the file. Please ensure USN and Name columns are filled for at least one row."], uploadedCount: 0, updatedCount: 0, isLoading: false });
          return;
        }

        if (errors.length > 0) {
          updateState({ uploadErrors: errors, uploadedCount: 0, updatedCount: 0, isLoading: false });
          return;
        }

        // Send to backend
        const res = await manageStudents(
          {
            action: "bulk_update",
            branch_id: state.branchId,
            semester_id: selectedSemesterId,
            section_id: selectedSectionId,
            batch_id: selectedBatchId,
            bulk_data: bulkData,
          },
          "POST"
        );

        if (res.success) {
          const createdCount = res.data?.created_count || 0;
          const updatedCount = res.data?.updated_count || 0;
          updateState({
            uploadedCount: createdCount,
            updatedCount: updatedCount,
            uploadErrors: [],
            droppedFileName: null,
            selectedFile: null,
            currentPage: 1, // Reset to first page to show the new students
            isLoading: false,
          });
          if (createdCount > 0) {
            updateState({ successMessage: `${createdCount} student${createdCount !== 1 ? 's' : ''} added successfully.` });
            setTimeout(() => updateState({ successMessage: "" }), 4000);
          }
          if (fileInputRef.current) fileInputRef.current.value = "";
          // Note: Removed automatic refresh after bulk upload to avoid GET after POST
        } else {
          updateState({ uploadErrors: [res.message || "Bulk upload failed"], uploadedCount: 0, updatedCount: 0, isLoading: false });
        }
      } catch (err) {
        console.error("File upload error:", err);
        updateState({ uploadErrors: ["Error processing file"], uploadedCount: 0, updatedCount: 0, isLoading: false });
      }
    };

    if (extension === "csv") {
      reader.readAsText(file);
    } else if (extension === "xls" || extension === "xlsx") {
      reader.readAsBinaryString(file);
    }
  };

  // Handle manual student entry
  const handleManualEntry = async () => {
    const { usn, name, email, section, semester, batch, phone, mode_of_admission } = state.manualForm;

    const newErrors: any = {};

    // USN validation removed
    if (!usn) newErrors.usn = "USN is required";
    // Removed USN format validation

    // Name validation
    const nameRegex = /^[A-Za-z\s]+$/;
    if (!name) newErrors.name = "Name is required";
    else if (!nameRegex.test(name)) newErrors.name = "Name should contain only letters and spaces";

    // Email validation (optional)
    const emailRegex =
      /^[a-zA-Z0-9]+([._%+-]?[a-zA-Z0-9]+)*@([a-zA-Z0-9]+(-[a-zA-Z0-9]+)*\.)+[A-Za-z]{2,10}$/;
    const consecutiveDotRegex = /\.{2,}/;
    if (email && (!emailRegex.test(email) || consecutiveDotRegex.test(email)))
      newErrors.email = "Invalid email format (e.g., user@example.com)";

    // Section, semester, batch
    if (!section) newErrors.section = "Section is required";
    if (!semester) newErrors.semester = "Semester is required";
    if (!batch) newErrors.batch = "Batch is required";

    // Cycle validation for semesters 1 and 2
    const semesterNumber = getSemesterNumber(semester);
    if (semesterNumber <= 2 && !state.manualForm.cycle) {
      newErrors.cycle = "Cycle is required for semesters 1 and 2";
    } else if (semesterNumber > 2 && state.manualForm.cycle) {
      newErrors.cycle = "Cycle can only be set for semesters 1 and 2";
    }

    // Phone validation (optional)
    const phoneRegex = /^\d{10}$/;
    if (phone && !phoneRegex.test(phone)) newErrors.phone = "Phone must be 10 digits";

    // If any validation errors, update state and stop
    if (Object.keys(newErrors).length > 0) {
      updateState({ manualErrors: newErrors, uploadErrors: ["Fix errors before submitting"] });
      return;
    }

    // If all valid, call API
    try {
      const res = await manageStudents(
        {
          action: "create",
          branch_id: state.branchId,
          usn,
          name,
          email,
          phone,
          semester_id: getSemesterId(semester),
          section_id: getSectionId(section, state.manualSections),
          batch_id: getBatchId(batch),
          cycle: state.manualForm.cycle || undefined,
          mode_of_admission: mode_of_admission || "KCET",
        },
        "POST"
      );

      if (res.success) {
        // Optimistically add new student locally so UI updates without a full refresh
        const newStudent = {
          usn: usn,
          name: name,
          email: email,
          section: section,
          semester: semester,
          cycle: state.manualForm.cycle,
          phone: phone,
          mode_of_admission: mode_of_admission,
        };
        updateState({
          students: [newStudent, ...state.students],
          manualForm: {
            usn: "",
            name: "",
            email: "",
            section: state.manualSections[0]?.name || "",
            semester: state.semesters[0]?.number
              ? `${state.semesters[0].number}th Semester`
              : "",
            batch: "",
            cycle: "",
            phone: "",
            mode_of_admission: "KCET",
          },
          manualErrors: {},
          uploadErrors: [],
          uploadedCount: 1, // Show success message
          currentPage: 1, // Reset to first page to show the new student
        });
        updateState({ successMessage: "Student added successfully." });
        setTimeout(() => updateState({ successMessage: "" }), 3000);
        // Clear success message after 3 seconds
        setTimeout(() => {
          updateState({ uploadedCount: 0, updatedCount: 0 });
        }, 3000);
      } else {
        updateState({ uploadErrors: [res.message || "Error adding student"] });
      }
    } catch (err) {
      console.error("Manual entry error:", err);
      updateState({ uploadErrors: ["Failed to add student"] });
    }
  };


  // Handle edit save
  const handleEditSave = async () => {
    // Validate cycle for semesters 1 and 2
    const semesterNumber = getSemesterNumber(state.editForm.semester);
    if (semesterNumber <= 2 && !state.editForm.cycle) {
      updateState({ uploadErrors: ["Cycle is required for semesters 1 and 2"] });
      return;
    }

    try {
      const res = await manageStudents({
        action: "update",
        branch_id: state.branchId,
        student_id: state.selectedStudent!.usn,
        name: state.editForm.name,
        email: state.editForm.email,
        phone: state.editForm.phone || undefined,
        semester_id: getSemesterId(state.editForm.semester),
        section_id: getSectionId(state.editForm.section, state.editSections),
        cycle: state.editForm.cycle || undefined,
        mode_of_admission: state.editForm.mode_of_admission || "KCET",
      }, "POST");

      if (res.success) {
        // Optimistically update local list so changes appear immediately
        const updated = state.students.map((s) =>
          s.usn === state.selectedStudent!.usn
            ? { ...s, name: state.editForm.name, email: state.editForm.email, phone: state.editForm.phone, section: state.editForm.section, semester: state.editForm.semester, cycle: state.editForm.cycle, mode_of_admission: state.editForm.mode_of_admission }
            : s
        );
        updateState({ students: updated, editDialog: false, uploadErrors: [], editSections: [], currentPage: 1 });
        updateState({ successMessage: "Student updated successfully." });
        setTimeout(() => updateState({ successMessage: "" }), 3000);
      } else {
        updateState({ uploadErrors: [res.message || "Error updating student"] });
      }
    } catch (err) {
      console.error("Edit save error:", err);
      updateState({ uploadErrors: ["Failed to update student"] });
    }
  };

  // Handle delete
  const handleDelete = async () => {
    try {
      const res = await manageStudents({
        action: "delete",
        branch_id: state.branchId,
        student_id: state.selectedStudent!.usn,
      }, "POST");

      if (res.success) {
        // Optimistically remove student from local state
        const filtered = state.students.filter((s) => s.usn !== state.selectedStudent!.usn);
        updateState({ students: filtered, confirmDelete: false, uploadErrors: [], currentPage: 1 });
        updateState({ successMessage: "Student deleted successfully." });
        setTimeout(() => updateState({ successMessage: "" }), 3000);
      } else {
        updateState({ uploadErrors: [res.message || "Error deleting student"] });
      }
    } catch (err) {
      console.error("Delete error:", err);
      updateState({ uploadErrors: ["Failed to delete student"] });
    }
  };

  // Generate CSV template
  const generateTemplate = () => {
    const semesterNumber = getSemesterNumber(state.manualForm.semester);
    // Include phone as an additional column in the template
    const headers = ["usn", "name", "email", "phone"];
    const rows = [
      ["1AM22CI001", "John Doe", "john.doe@example.com", "9876543210"],
      ["1AM22CI002", "Jane Smith", "jane.smith@example.com", "9123456780"],
      ["1AM22CI003", "Alice Johnson", "alice.johnson@example.com", "9988776655"],
    ];
    return [headers.join(","), ...rows.map((row) => row.join(","))].join("\n");
  };

  // Download CSV template
  const downloadTemplate = () => {
    const csvContent = generateTemplate();
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", "student_bulk_enroll_template.csv");
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Handle file drop
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  // Close upload modal
  const closeModal = () => {
    updateState({
      addStudentModal: false,
      uploadErrors: [],
      droppedFileName: null,
      selectedFile: null,
      uploadedCount: 0,
      updatedCount: 0,
    });
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  function levenshteinDistance(a: string, b: string): number {
    const dp: number[][] = Array.from({ length: a.length + 1 }, () => Array(b.length + 1).fill(0));

    for (let i = 0; i <= a.length; i++) dp[i][0] = i;
    for (let j = 0; j <= b.length; j++) dp[0][j] = j;

    for (let i = 1; i <= a.length; i++) {
      for (let j = 1; j <= b.length; j++) {
        if (a[i - 1] === b[j - 1]) dp[i][j] = dp[i - 1][j - 1];
        else dp[i][j] = Math.min(dp[i - 1][j - 1], dp[i - 1][j], dp[i][j - 1]) + 1;
      }
    }
    return dp[a.length][b.length];
  }

  // Filter students for table (now server-side, so just use state.students)
  const filteredStudents = state.students;

  // Paginate the filtered students (server-side, so no slicing)
  const paginatedFilteredStudents = filteredStudents;

  const totalFilteredPages = Math.ceil(state.totalStudents / state.pageSize);

  // Handle page change
  const handlePageChange = async (newPage: number) => {
    if (newPage >= 1 && newPage <= totalFilteredPages) {
      await fetchStudents(state.branchId, newPage, state.pageSize, state.search, state.sectionFilter);
    }
  };

  // Open edit dialog
  const openEdit = (student: Student) => {
    const semesterId = getSemesterId(student.semester);
    updateState({
      selectedStudent: student,
      editForm: {
        name: student.name,
        email: student.email,
        section: student.section,
        semester: student.semester,
        cycle: student.cycle || "",
        phone: student.phone || "",
        mode_of_admission: student.mode_of_admission || "KCET",
      },
      editDialog: true,
      editSections: [],
    });
    // Sections will be populated by useEffect based on semester
  };

  // Chart removed

  return (
    <div className={` sm: md: lg: space-y-6 md:space-y-5 min-h-screen ${theme === 'dark' ? 'bg-background text-foreground' : 'bg-gray-50 text-gray-900'}`}>
      {state.successMessage && (
        <p className={`text-sm mt-2 ${theme === 'dark' ? 'text-green-400' : 'text-green-600'}`}>{state.successMessage}</p>
      )}
      {state.uploadErrors.length > 0 && (
        <ul className={`text-sm ${theme === 'dark' ? 'text-destructive' : 'text-red-500'} mb-4 list-disc list-inside`}>
          {state.uploadErrors.map((err, idx) => (
            <li key={idx}>{err}</li>
          ))}
        </ul>
      )}

      {/* Add Student Manually Form */}
      <Card className={theme === 'dark' ? 'bg-card text-foreground border-border' : 'bg-white text-gray-900 border-gray-200'}>
        <CardHeader>
          <CardTitle className={`text-2xl font-semibold leading-none tracking-tight text-gray-900 ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>Add Student Manually</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 md:gap-3">
            {/* USN */}
            <div className="flex flex-col">
              <Input
                placeholder="USN"
                value={state.manualForm.usn}
                maxLength={10}
                onChange={(e) => {
                  const value = e.target.value.toUpperCase();
                  let error = "";

                  updateState({
                    manualForm: { ...state.manualForm, usn: value },
                    manualErrors: { ...state.manualErrors, usn: error },
                  });
                }}
                onBlur={(e) => {
                  const value = e.target.value.toUpperCase();
                  let error = "";

                  updateState({
                    manualErrors: { ...state.manualErrors, usn: error },
                  });
                }}
                className={`w-full ${theme === 'dark' ? 'bg-card text-foreground border-border placeholder:text-muted-foreground' : 'bg-white text-gray-900 border-gray-300 placeholder:text-gray-500'} focus:ring-0 ${state.manualErrors?.usn
                    ? "border-red-500"
                    : theme === 'dark' ? 'border-border focus:border-primary' : 'border-gray-300 focus:border-blue-500'
                  }`}
              />
              <span className="text-red-500 text-xs mt-1">
                {state.manualErrors?.usn}
              </span>
            </div>

            {/* Name Field */}
            <div className="flex flex-col">
              <Input
                placeholder="Name"
                value={state.manualForm.name}
                onChange={(e) => {
                  const value = e.target.value.replace(/[^A-Za-z\s]/g, "");
                  let error = "";

                  // Live validation: only letters and spaces allowed
                  if (value && !/^[A-Za-z\s]*$/.test(value)) {
                    error = "Name should contain only letters and spaces";
                  }

                  updateState({
                    manualForm: { ...state.manualForm, name: value },
                    manualErrors: { ...state.manualErrors, name: error },
                  });
                }}
                onBlur={(e) => {
                  const value = e.target.value.trim();
                  const nameRegex = /^[A-Za-z\s]+$/;
                  let error = "";
                  if (!value) error = "Name is required";
                  else if (!nameRegex.test(value)) error = "Name should contain only letters and spaces";

                  updateState({
                    manualErrors: { ...state.manualErrors, name: error },
                  });
                }}
                className={`w-full ${theme === 'dark' ? 'bg-card text-foreground border-border placeholder:text-muted-foreground' : 'bg-white text-gray-900 border-gray-300 placeholder:text-gray-500'} focus:ring-0 ${state.manualErrors?.name
                    ? "border-red-500"
                    : theme === 'dark' ? 'border-border focus:border-primary' : 'border-gray-300 focus:border-blue-500'
                  }`}
              />
              <span className="text-red-500 text-xs mt-1">
                {state.manualErrors?.name}
              </span>
            </div>


            {/* Email */}
            <div className="flex flex-col">
              <Input
                placeholder="Email"
                type="text"
                value={state.manualForm.email}
                onChange={(e) => {
                  let value = e.target.value;

                  // Remove spaces and invalid characters commonly not allowed in email
                  value = value.replace(/[!#$%^&*()_+<>?:"{}]/g, "");

                  // Professional-grade email regex
                  const emailRegex = /^[a-zA-Z0-9]+([._%+-]?[a-zA-Z0-9]+)*@([a-zA-Z0-9]+(-[a-zA-Z0-9]+)*\.)+[A-Za-z]{2,10}$/;
                  const consecutiveDotRegex = /\.{2,}/;

                  const error =
                    value && (!emailRegex.test(value) || consecutiveDotRegex.test(value))
                      ? "Invalid email format (e.g., user@example.com)"
                      : "";

                  updateState({
                    manualForm: { ...state.manualForm, email: value },
                    manualErrors: { ...state.manualErrors, email: error },
                  });
                }}
                className={`w-full ${theme === 'dark' ? 'bg-card text-foreground border-border placeholder:text-muted-foreground' : 'bg-white text-gray-900 border-gray-300 placeholder:text-gray-500'} focus:ring-0 ${state.manualErrors?.email
                    ? "border-red-500"
                    : theme === 'dark' ? 'border-border focus:border-primary' : 'border-gray-300 focus:border-blue-500'
                  }`}
              />
              <span className="text-red-500 text-xs mt-1">
                {state.manualErrors?.email}
              </span>
            </div>

            {/* Phone */}
            <div className="flex flex-col">
              <Input
                placeholder="Phone"
                type="tel"
                value={state.manualForm.phone}
                onChange={(e) => {
                  const value = e.target.value.replace(/[^0-9]/g, "");
                  let error = "";
                  if (value && !/^\d{0,10}$/.test(value)) error = "Phone must be up to 10 digits";
                  updateState({ manualForm: { ...state.manualForm, phone: value }, manualErrors: { ...state.manualErrors, phone: error } });
                }}
                onBlur={(e) => {
                  const value = e.target.value.trim();
                  let error = "";
                  if (value && !/^\d{10}$/.test(value)) error = "Phone must be 10 digits";
                  updateState({ manualErrors: { ...state.manualErrors, phone: error } });
                }}
                className={`w-full ${theme === 'dark' ? 'bg-card text-foreground border-border placeholder:text-muted-foreground' : 'bg-white text-gray-900 border-gray-300 placeholder:text-gray-500'} focus:ring-0 ${state.manualErrors?.phone
                    ? "border-red-500"
                    : theme === 'dark' ? 'border-border focus:border-primary' : 'border-gray-300 focus:border-blue-500'
                  }`}
              />
              <span className="text-red-500 text-xs mt-1">{state.manualErrors?.phone}</span>
            </div>

            {/* Mode of Admission */}
            <div className="flex flex-col">
              <Select
                value={state.manualForm.mode_of_admission}
                onValueChange={(value) => updateState({ manualForm: { ...state.manualForm, mode_of_admission: value } })}
              >
                <SelectTrigger className={`w-full ${theme === 'dark' ? 'bg-card text-foreground border-border' : 'bg-white text-gray-900 border-gray-300'} focus:ring-0`}>
                  <SelectValue placeholder="Mode of Admission" />
                </SelectTrigger>
                <SelectContent className={theme === 'dark' ? 'bg-card border-border' : 'bg-white border-gray-200'}>
                  <SelectItem value="KCET">KCET</SelectItem>
                  <SelectItem value="COMEDK">COMEDK</SelectItem>
                  <SelectItem value="JEE Main">JEE Main</SelectItem>
                  <SelectItem value="NEET">NEET</SelectItem>
                  <SelectItem value="Merit">Merit</SelectItem>
                  <SelectItem value="Management">Management</SelectItem>
                  <SelectItem value="NRI">NRI</SelectItem>
                  <SelectItem value="Lateral Entry">Lateral Entry</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Select
              value={state.manualForm.semester}
              onValueChange={(value) =>
                updateState({
                  manualForm: { ...state.manualForm, semester: value, section: "" },
                  manualSections: [],
                })
              }
              disabled={state.isLoading || state.semesters.length === 0}
            >
              <SelectTrigger className={`w-full ${theme === 'dark' ? 'bg-card text-foreground border-border' : 'bg-white text-gray-900 border-gray-300'} placeholder:text-muted-foreground focus:ring-0`}>
                <SelectValue
                  placeholder={state.semesters.length === 0 ? "No semesters available" : "Select Semester"}
                />
              </SelectTrigger>
              <SelectContent className={theme === 'dark' ? 'bg-card text-foreground border-border' : 'bg-white text-gray-900 border-gray-300'}>
                {state.semesters.map((s) => (
                  <SelectItem key={s.id} value={`${s.number}th Semester`} className={theme === 'dark' ? 'text-foreground hover:bg-accent' : 'text-gray-900 hover:bg-gray-100'}>
                    Semester {s.number}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={state.manualForm.section}
              onValueChange={(value) => updateState({ manualForm: { ...state.manualForm, section: value } })}
              disabled={state.isLoading || !state.manualForm.semester || state.manualSections.length === 0}
            >
              <SelectTrigger className={`w-full ${theme === 'dark' ? 'bg-card text-foreground border-border' : 'bg-white text-gray-900 border-gray-300'} placeholder:text-muted-foreground focus:ring-0`}>
                <SelectValue
                  placeholder={
                    state.manualSections.length === 0 || !state.manualForm.semester
                      ? "Select semester first"
                      : "Select Section"
                  }
                />
              </SelectTrigger>
              <SelectContent className={theme === 'dark' ? 'bg-card text-foreground border-border' : 'bg-white text-gray-900 border-gray-300'}>
                {state.manualSections
                  .filter((section) => section.semester_id === getSemesterId(state.manualForm.semester))
                  .map((section) => (
                    <SelectItem key={section.id} value={section.name} className={theme === 'dark' ? 'text-foreground hover:bg-accent' : 'text-gray-900 hover:bg-gray-100'}>
                      Section {section.name}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
            <Select
              value={state.manualForm.batch}
              onValueChange={(value) => updateState({ manualForm: { ...state.manualForm, batch: value } })}
              disabled={state.isLoading || state.batches.length === 0}
            >
              <SelectTrigger className={`w-full ${theme === 'dark' ? 'bg-card text-foreground border-border' : 'bg-white text-gray-900 border-gray-300'} placeholder:text-muted-foreground focus:ring-0`}>
                <SelectValue
                  placeholder={state.batches.length === 0 ? "No batches available" : "Select Batch"}
                />
              </SelectTrigger>
              <SelectContent className={theme === 'dark' ? 'bg-card text-foreground border-border' : 'bg-white text-gray-900 border-gray-300'}>
                {state.batches.map((batch) => (
                  <SelectItem key={batch.id} value={batch.name} className={theme === 'dark' ? 'text-foreground hover:bg-accent' : 'text-gray-900 hover:bg-gray-100'}>
                    {batch.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {state.manualForm.semester && getSemesterNumber(state.manualForm.semester) <= 2 && (
              <Select
                value={state.manualForm.cycle}
                onValueChange={(value) => updateState({ manualForm: { ...state.manualForm, cycle: value } })}
                disabled={state.isLoading}
              >
                <SelectTrigger className={`w-full ${theme === 'dark' ? 'bg-card text-foreground border-border' : 'bg-white text-gray-900 border-gray-300'} placeholder:text-muted-foreground focus:ring-0`}>
                  <SelectValue placeholder="Select Cycle" />
                </SelectTrigger>
                <SelectContent className={theme === 'dark' ? 'bg-card text-foreground border-border' : 'bg-white text-gray-900 border-gray-300'}>
                  <SelectItem value="P" className={theme === 'dark' ? 'text-foreground hover:bg-accent' : 'text-gray-900 hover:bg-gray-100'}>
                    P Cycle (Physics)
                  </SelectItem>
                  <SelectItem value="C" className={theme === 'dark' ? 'text-foreground hover:bg-accent' : 'text-gray-900 hover:bg-gray-100'}>
                    C Cycle (Chemistry)
                  </SelectItem>
                </SelectContent>
              </Select>
            )}
          </div>
          <div className="flex justify-end mt-4">
            <Button
              onClick={handleManualEntry}
              disabled={
                state.isLoading ||
                !state.branchId ||
                !state.manualForm.semester ||
                !state.manualForm.section ||
                !state.manualForm.batch ||
                (getSemesterNumber(state.manualForm.semester) <= 2 && !state.manualForm.cycle)
              }
              className="flex items-center justify-center gap-1 text-sm font-medium px-4 py-1.5 rounded-md transition disabled:opacity-50 bg-primary text-white border-primary hover:bg-primary/90 hover:border-primary/90 hover:text-white"
            >
              + Add Student
            </Button>
          </div>
          {state.uploadedCount === 1 && (
            <p className={`text-sm mt-2 ${theme === 'dark' ? 'text-green-400' : 'text-green-600'}`}>
              Student added successfully.
            </p>
          )}
          {state.uploadErrors.length > 0 && (
            <ul className="text-sm text-red-400 mt-2 list-disc list-inside">
              {state.uploadErrors.map((err, idx) => (
                <li key={idx}>{err}</li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card className={theme === 'dark' ? 'bg-card text-foreground border-border' : 'bg-white text-gray-900 border-gray-200'}>
        <CardHeader>
          <div className="flex flex-row justify-between items-center gap-2 md:gap-4">
            <CardTitle className={`text-lg md:text-base flex-1 truncate ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>Student List</CardTitle>
            <div className="flex gap-2">
              <Button
                onClick={() => updateState({ addStudentModal: true })}
                className="flex-shrink-0 flex items-center gap-1 text-xs md:text-sm font-semibold px-3 py-1.5 rounded-md transition bg-primary text-white border-primary hover:bg-primary/90 hover:border-primary/90 hover:text-white whitespace-nowrap"
                disabled={state.isLoading || !state.branchId}
              >
                <Upload className="w-4 h-4" />
                <span className="hidden sm:inline">Bulk Upload</span>
                <span className="sm:hidden">Upload</span>
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-3 md:gap-4 mb-4">
            {/* Left side: Search input and button */}
            <div className="flex gap-2">
              <Input
                placeholder="Search students..."
                className={`flex-1 md:w-48 ${theme === 'dark' ? 'bg-card text-foreground border-border placeholder:text-muted-foreground' : 'bg-white text-gray-900 border-gray-300 placeholder:text-gray-500'}`}
                value={state.search}
                onChange={(e) => updateState({ search: e.target.value })}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              />
              <Button onClick={handleSearch} variant="outline" className="text-xs md:text-sm">
                Search
              </Button>
            </div>

            {/* Right side: Dropdowns */}
            <div className="flex gap-2 md:gap-4">
              <Select
                value={state.semesterFilter}
                onValueChange={(value) =>
                  updateState({
                    semesterFilter: value,
                    sectionFilter: "All",
                    currentPage: 1,
                    listSections: [],
                  })
                }
                disabled={state.isLoading || state.semesters.length === 0}
              >
                <SelectTrigger className={`flex-1 md:w-40 md:max-w-40 ${theme === 'dark' ? 'bg-card text-foreground border-border' : 'bg-white text-gray-900 border-gray-300'}`}>
                  <SelectValue
                    placeholder={
                      state.semesters.length === 0
                        ? "No semesters available"
                        : "Select Semester"
                    }
                  />
                </SelectTrigger>
                <SelectContent className={theme === 'dark' ? 'bg-card text-foreground border-border' : 'bg-white text-gray-900 border-gray-300'}>
                  <SelectItem value="All" className={theme === 'dark' ? 'text-foreground hover:bg-accent' : 'text-gray-900 hover:bg-gray-100'}>All Semesters</SelectItem>
                  {state.semesters.map((s) => (
                    <SelectItem key={s.id} value={s.id} className={theme === 'dark' ? 'text-foreground hover:bg-accent' : 'text-gray-900 hover:bg-gray-100'}>
                      Semester {s.number}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select
                value={state.sectionFilter}
                onValueChange={(value) =>
                  updateState({ sectionFilter: value, currentPage: 1 })
                }
                disabled={
                  state.isLoading ||
                  state.semesterFilter === "All" ||
                  state.listSections.length === 0
                }
              >
                <SelectTrigger className={`flex-1 md:w-40 md:max-w-40 ${theme === 'dark' ? 'bg-card text-foreground border-border' : 'bg-white text-gray-900 border-gray-300'}`}>
                  <SelectValue
                    placeholder={
                      state.listSections.length === 0 ||
                        state.semesterFilter === "All"
                        ? "Select semester first"
                        : "Select Section"
                    }
                  />
                </SelectTrigger>
                <SelectContent className={theme === 'dark' ? 'bg-card text-foreground border-border' : 'bg-white text-gray-900 border-gray-300'}>
                  <SelectItem value="All" className={theme === 'dark' ? 'text-foreground hover:bg-accent' : 'text-gray-900 hover:bg-gray-100'}>All Sections</SelectItem>
                  {state.listSections
                    .filter((section) => section.semester_id === state.semesterFilter)
                    .map((section) => (
                      <SelectItem key={section.id} value={section.id} className={theme === 'dark' ? 'text-foreground hover:bg-accent' : 'text-gray-900 hover:bg-gray-100'}>
                        Section {section.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {state.isLoading ? (
            <div className="py-4">
              <SkeletonTable rows={10} cols={7} />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm md:text-base text-left">
                <thead className={theme === 'dark' ? 'bg-card text-foreground border-border' : 'bg-gray-100 text-gray-900 border-gray-300'}>
                  <tr className="border-b">
                    <th className="py-3 px-3 md:px-4 text-sm md:text-base font-medium">USN</th>
                    <th className="py-3 px-3 md:px-4 text-sm md:text-base font-medium">Name</th>
                    <th className="py-3 px-3 md:px-4 text-sm md:text-base font-medium">Email</th>
                    <th className="hidden sm:table-cell py-3 px-3 md:px-4 text-sm md:text-base font-medium">Phone</th>
                    <th className="hidden md:table-cell py-3 px-3 md:px-4 text-sm md:text-base font-medium">Section</th>
                    <th className="hidden lg:table-cell py-3 px-3 md:px-4 text-sm md:text-base font-medium">Mode</th>
                    <th className="py-3 px-3 md:px-4 text-sm md:text-base font-medium">Semester</th>
                    <th className="py-3 px-3 md:px-4 text-sm md:text-base font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody className={theme === 'dark' ? 'divide-y divide-border' : 'divide-y divide-gray-200'}>
                  {paginatedFilteredStudents.map((student) => (
                    <tr key={student.usn} className={`${theme === 'dark' ? 'hover:bg-accent' : 'hover:bg-gray-50'} align-middle`}>
                      <td className="py-3 px-3 md:px-4 text-sm md:text-base">{student.usn}</td>
                      <td className="py-3 px-3 md:px-4 text-sm md:text-base">{student.name}</td>
                      <td className="py-3 px-3 md:px-4 text-sm md:text-base">{student.email}</td>
                      <td className="hidden sm:table-cell py-3 px-3 md:px-4 text-sm md:text-base">{student.phone && student.phone.trim() ? student.phone : '-'}</td>
                      <td className="hidden md:table-cell py-3 px-3 md:px-4 text-sm md:text-base">Section {student.section}</td>
                      <td className="hidden lg:table-cell py-3 px-3 md:px-4 text-sm md:text-base">{student.mode_of_admission || 'KCET'}</td>
                      <td className="py-3 px-3 md:px-4 text-sm md:text-base">{formatSemesterDisplay(student)}</td>
                      <td className="py-3 px-3 md:px-4 text-sm md:text-base flex gap-2 md:gap-3 items-center">
                        <button
                          onClick={() => openEdit(student)}
                          className={theme === 'dark' ? 'text-primary hover:text-primary/80' : 'text-blue-600 hover:text-blue-800'}
                          aria-label="Edit student"
                        >
                          <Pencil className="w-4 h-4 md:w-5 md:h-5" />
                        </button>
                        <button
                          onClick={() =>
                            updateState({
                              selectedStudent: student,
                              confirmDelete: true,
                            })
                          }
                          className={theme === 'dark' ? 'text-destructive hover:text-destructive/80' : 'text-red-600 hover:text-red-800'}
                          aria-label="Delete student"
                        >
                          <Trash2 className="w-4 h-4 md:w-5 md:h-5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {paginatedFilteredStudents.length === 0 && (
                <p className={`text-center mt-4 ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}`}>No students found</p>
              )}

              <div className="text-sm text-gray-500 mt-4">
                Showing {Math.min((state.currentPage - 1) * state.pageSize + 1, state.totalStudents)} to {Math.min(state.currentPage * state.pageSize, state.totalStudents)} of {state.totalStudents}{" "}
                students (Page {state.currentPage} of {totalFilteredPages})
              </div>
            </div>
          )}

          <div className="flex justify-end items-center gap-2 md:gap-3 mt-4">
            <Button
              onClick={() => handlePageChange(state.currentPage - 1)}
              disabled={state.currentPage === 1}
              className="w-20 md:w-24 flex items-center justify-center gap-1 text-xs md:text-sm font-medium py-1.5 rounded-md transition disabled:opacity-50 disabled:cursor-not-allowed bg-primary text-white border-primary hover:bg-primary/90 hover:border-primary/90 hover:text-white"
            >
              Previous
            </Button>
            <div className={`w-12 md:w-16 text-center text-xs md:text-sm font-medium py-1.5 rounded-md ${theme === 'dark' ? 'text-foreground bg-card border-border' : 'text-gray-900 bg-white border-gray-300'}`}>
              {state.currentPage}
            </div>
            <Button
              onClick={() => handlePageChange(state.currentPage + 1)}
              disabled={state.currentPage === totalFilteredPages}
              className="w-20 md:w-24 flex items-center justify-center gap-1 text-xs md:text-sm font-medium py-1.5 rounded-md transition disabled:opacity-50 disabled:cursor-not-allowed bg-primary text-white border-primary hover:bg-primary/90 hover:border-primary/90 hover:text-white"
            >
              Next
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Student Performance Comparison chart removed to reduce calls and simplify page */}


      <Dialog open={state.addStudentModal} onOpenChange={closeModal}>
        <DialogContent className={`${theme === 'dark' ? 'bg-card text-foreground border-border' : 'bg-white text-gray-900 border-gray-300'} w-[92%] sm:w-auto md:w-[80%] lg:w-auto max-w-md sm:max-w-2xl md:max-w-3xl lg:max-w-2xl rounded-2xl sm:rounded-md p-4 max-h-[80vh] sm:max-h-none overflow-y-auto`}>
          <DialogHeader>
            <DialogTitle className={theme === 'dark' ? 'text-foreground' : 'text-gray-900'}>Upload Student Data</DialogTitle>
          </DialogHeader>

          {/* Semester & Section Select */}
          <div className="mb-4">
            <label className={`block text-sm font-medium mb-1 ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>
              Select Batch, Semester, and Section
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-4">
              {/* Batch Dropdown */}
              <Select
                value={state.manualForm.batch}
                onValueChange={(value) =>
                  updateState({
                    manualForm: {
                      ...state.manualForm,
                      batch: value,
                      semester: "",
                      section: "",
                    },
                    manualSemesters: [], // Clear semesters when batch changes (optional)
                    manualSections: [], // Clear sections when batch changes
                  })
                }
                disabled={state.isLoading || state.batches.length === 0}
              >
                <SelectTrigger className={`w-full ${theme === 'dark' ? 'bg-card text-foreground border-border' : 'bg-white text-gray-900 border-gray-300'}`}>
                  <SelectValue
                    placeholder={
                      state.batches.length === 0
                        ? "No batches available"
                        : "Select Batch"
                    }
                  />
                </SelectTrigger>
                <SelectContent className={theme === 'dark' ? 'bg-card text-foreground border-border' : 'bg-white text-gray-900 border-gray-300'}>
                  {state.batches.map((batch) => (
                    <SelectItem
                      key={batch.id}
                      value={batch.name}
                      className={theme === 'dark' ? 'text-foreground hover:bg-accent' : 'text-gray-900 hover:bg-gray-100'}
                    >
                      Batch {batch.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Semester Dropdown */}
              <Select
                value={state.manualForm.semester}
                onValueChange={(value) =>
                  updateState({
                    manualForm: { ...state.manualForm, semester: value, section: "" },
                    manualSections: [],
                  })
                }
                disabled={
                  state.isLoading ||
                  !state.manualForm.batch || // Disable if no batch selected
                  state.semesters.length === 0
                }
              >
                <SelectTrigger className={`w-full ${theme === 'dark' ? 'bg-card text-foreground border-border' : 'bg-white text-gray-900 border-gray-300'}`}>
                  <SelectValue
                    placeholder={
                      state.semesters.length === 0
                        ? "No semesters available"
                        : "Select Semester"
                    }
                  />
                </SelectTrigger>
                <SelectContent className={theme === 'dark' ? 'bg-card text-foreground border-border' : 'bg-white text-gray-900 border-gray-300'}>
                  {state.semesters.map((s) => (
                    <SelectItem
                      key={s.id}
                      value={`${s.number}th Semester`}
                      className={theme === 'dark' ? 'text-foreground hover:bg-accent' : 'text-gray-900 hover:bg-gray-100'}
                    >
                      Semester {s.number}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Section Dropdown */}
              <Select
                value={state.manualForm.section}
                onValueChange={(value) =>
                  updateState({ manualForm: { ...state.manualForm, section: value } })
                }
                disabled={
                  state.isLoading ||
                  !state.manualForm.semester ||
                  state.manualSections.length === 0
                }
              >
                <SelectTrigger className={`w-full ${theme === 'dark' ? 'bg-card text-foreground border-border' : 'bg-white text-gray-900 border-gray-300'}`}>
                  <SelectValue
                    placeholder={
                      state.manualSections.length === 0 || !state.manualForm.semester
                        ? "Select semester first"
                        : "Select Section"
                    }
                  />
                </SelectTrigger>
                <SelectContent className={theme === 'dark' ? 'bg-card text-foreground border-border' : 'bg-white text-gray-900 border-gray-300'}>
                  {state.manualSections
                    .filter(
                      (section) =>
                        section.semester_id ===
                        getSemesterId(state.manualForm.semester)
                    )
                    .map((section) => (
                      <SelectItem
                        key={section.id}
                        value={section.name}
                        className={theme === 'dark' ? 'text-foreground hover:bg-accent' : 'text-gray-900 hover:bg-gray-100'}
                      >
                        Section {section.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>

              {/* Mode of Admission Dropdown */}
              <Select
                value={state.manualForm.mode_of_admission}
                onValueChange={(value) => updateState({ manualForm: { ...state.manualForm, mode_of_admission: value } })}
                disabled={state.isLoading}
              >
                <SelectTrigger className={`w-full ${theme === 'dark' ? 'bg-card text-foreground border-border' : 'bg-white text-gray-900 border-gray-300'}`}>
                  <SelectValue placeholder="Mode of Admission" />
                </SelectTrigger>
                <SelectContent className={theme === 'dark' ? 'bg-card text-foreground border-border' : 'bg-white text-gray-900 border-gray-300'}>
                  <SelectItem value="KCET">KCET</SelectItem>
                  <SelectItem value="COMEDK">COMEDK</SelectItem>
                  <SelectItem value="JEE Main">JEE Main</SelectItem>
                  <SelectItem value="NEET">NEET</SelectItem>
                  <SelectItem value="Merit">Merit</SelectItem>
                  <SelectItem value="Management">Management</SelectItem>
                  <SelectItem value="NRI">NRI</SelectItem>
                  <SelectItem value="Lateral Entry">Lateral Entry</SelectItem>
                </SelectContent>
              </Select>

              {/* Cycle Dropdown - only for semesters 1 and 2 */}
              {state.manualForm.semester && getSemesterNumber(state.manualForm.semester) <= 2 && (
                <Select
                  value={state.manualForm.cycle}
                  onValueChange={(value) => updateState({ manualForm: { ...state.manualForm, cycle: value } })}
                  disabled={state.isLoading}
                >
                  <SelectTrigger className={`w-full ${theme === 'dark' ? 'bg-card text-foreground border-border' : 'bg-white text-gray-900 border-gray-300'}`}>
                    <SelectValue placeholder="Select Cycle" />
                  </SelectTrigger>
                  <SelectContent className={theme === 'dark' ? 'bg-card text-foreground border-border' : 'bg-white text-gray-900 border-gray-300'}>
                    <SelectItem value="P" className={theme === 'dark' ? 'text-foreground hover:bg-accent' : 'text-gray-900 hover:bg-gray-100'}>
                      P Cycle (Physics)
                    </SelectItem>
                    <SelectItem value="C" className={theme === 'dark' ? 'text-foreground hover:bg-accent' : 'text-gray-900 hover:bg-gray-100'}>
                      C Cycle (Chemistry)
                    </SelectItem>
                  </SelectContent>
                </Select>
              )}
            </div>
          </div>


          {/* File Upload Drop Zone */}
          <div
            onDrop={handleDrop}
            onDragOver={(e) => e.preventDefault()}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-lg p-6 sm:p-8 text-center cursor-pointer transition-colors ${theme === 'dark' ? 'border-border hover:bg-accent' : 'border-gray-300 hover:bg-gray-100'}`}
          >
            <UploadCloud size={36} className={`mx-auto mb-3 ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-400'}`} />
            <p className={`font-medium ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>
              Drag & drop file here or click to select
            </p>
            <p className={`text-sm ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}`}>
              Supports CSV, XLS, XLSX (max 5MB, 500 records)
            </p>
            <input
              type="file"
              accept=".csv,.xls,.xlsx"
              ref={fileInputRef}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  handleFileSelect(file);
                }
              }}
              style={{ display: "none" }}
            />
            {state.droppedFileName && (
              <p className={`text-sm mt-2 ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}`}>
                Selected file: <strong className={theme === 'dark' ? 'text-foreground' : 'text-gray-900'}>{state.droppedFileName}</strong>
              </p>
            )}
            {state.uploadErrors.length > 0 && (
              <ul className="text-sm text-red-400 mt-2 list-disc list-inside">
                {state.uploadErrors.map((err, idx) => (
                  <li key={idx}>{err}</li>
                ))}
              </ul>
            )}
            {(state.uploadedCount > 0 || state.updatedCount > 0) && (
              <p className={`text-sm mt-2 ${theme === 'dark' ? 'text-green-400' : 'text-green-600'}`}>
                {state.uploadedCount > 0 && `${state.uploadedCount} new student${state.uploadedCount !== 1 ? 's' : ''} added`}
                {state.uploadedCount > 0 && state.updatedCount > 0 && ', '}
                {state.updatedCount > 0 && `${state.updatedCount} student${state.updatedCount !== 1 ? 's' : ''} updated`}
                .
              </p>
            )}
          </div>

          {/* Upload Instructions */}
          <div className={`mt-6 text-sm ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}`}>
            <h4 className={`font-medium mb-2 ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>Upload Instructions</h4>
            <ul className="list-disc pl-6 space-y-1">
              <li>Use the provided template for proper data formatting</li>
              <li>
                Required columns: <strong className={theme === 'dark' ? 'text-foreground' : 'text-gray-900'}>usn</strong> and <strong className={theme === 'dark' ? 'text-foreground' : 'text-gray-900'}>name</strong>
              </li>
              <li>
                Optional columns: <strong className={theme === 'dark' ? 'text-foreground' : 'text-gray-900'}>email</strong> and <strong className={theme === 'dark' ? 'text-foreground' : 'text-gray-900'}>phone</strong>
              </li>
              <li>Semester, Section, Mode of Admission, and Cycle (for semesters 1-2) are selected above, not in the file</li>
              <li>Maximum 500 records per file</li>
              <li>
                <a
                  href="#"
                  className={theme === 'dark' ? 'text-primary underline' : 'text-blue-600 underline'}
                  onClick={downloadTemplate}
                >
                  Download Template
                </a>
              </li>
            </ul>
          </div>

          {/* Footer */}
          <DialogFooter className="flex justify-end gap-2 mt-4">
            <Button
              variant="outline"
              onClick={closeModal}
              className={`text-foreground ${theme === 'dark' ? 'bg-card border-border hover:bg-accent' : 'bg-white border-gray-300 hover:bg-gray-100'}`}
            >
              Cancel
            </Button>
            <Button
              onClick={handleEnrollStudents}
              disabled={!state.selectedFile || state.isLoading}
              className="flex items-center gap-1 text-sm font-medium px-3 py-1.5 rounded-md transition disabled:opacity-50 bg-primary text-white border-primary hover:bg-[#9147e0] hover:border-[#9147e0] hover:text-white"
            >
              {state.isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Enroll Students"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>


      <Dialog open={state.confirmDelete} onOpenChange={() => updateState({ confirmDelete: false })}>
        <DialogContent className={`${theme === 'dark' ? 'bg-card text-foreground border-border' : 'bg-white text-gray-900 border-gray-300'} w-[92%] sm:w-auto max-w-sm mx-auto rounded-2xl sm:rounded-md p-4`}>
          <DialogHeader>
            <DialogTitle className={theme === 'dark' ? 'text-foreground' : 'text-gray-900'}>Delete Student</DialogTitle>
          </DialogHeader>
          <div className={theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}>
            Are you sure you want to delete <strong className={theme === 'dark' ? 'text-foreground' : 'text-gray-900'}>{state.selectedStudent?.name}</strong>?
          </div>
          <DialogFooter className="flex justify-end gap-2 mt-4">
            <Button
              variant="outline"
              onClick={() => updateState({ confirmDelete: false })}
              className={`text-foreground ${theme === 'dark' ? 'bg-card border-border hover:bg-accent' : 'bg-white border-gray-300 hover:bg-gray-100'}`}
            >
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete} className="flex-shrink-0 bg-[#ef4444] hover:bg-[#dc2626] text-white border-transparent">
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={state.editDialog} onOpenChange={() => updateState({ editDialog: false, editSections: [] })}>
        <DialogContent className={`${theme === 'dark' ? 'bg-card text-foreground border-border' : 'bg-white text-gray-900 border-gray-300'} w-[92%] sm:w-auto max-w-md sm:max-w-2xl rounded-2xl sm:rounded-md`}>
          <DialogHeader>
            <DialogTitle className={theme === 'dark' ? 'text-foreground' : 'text-gray-900'}>Edit Student</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Input
              className={` ${theme === 'dark' ? 'bg-card text-foreground border-border placeholder:text-muted-foreground' : 'bg-white text-gray-900 border-gray-300 placeholder:text-gray-500'}`}
              placeholder="Name"
              value={state.editForm.name}
              onChange={(e) => updateState({ editForm: { ...state.editForm, name: e.target.value } })}
            />
            <Input
              className={` ${theme === 'dark' ? 'bg-card text-foreground border-border placeholder:text-muted-foreground' : 'bg-white text-gray-900 border-gray-300 placeholder:text-gray-500'}`}
              placeholder="Email"
              value={state.editForm.email}
              onChange={(e) => updateState({ editForm: { ...state.editForm, email: e.target.value } })}
            />
            <Input
              className={` ${theme === 'dark' ? 'bg-card text-foreground border-border placeholder:text-muted-foreground' : 'bg-white text-gray-900 border-gray-300 placeholder:text-gray-500'}`}
              placeholder="Phone"
              value={state.editForm.phone}
              onChange={(e) => {
                const value = e.target.value.replace(/[^0-9]/g, "");
                updateState({ editForm: { ...state.editForm, phone: value } });
              }}
            />
            <Select
              value={state.editForm.mode_of_admission}
              onValueChange={(value) => updateState({ editForm: { ...state.editForm, mode_of_admission: value } })}
            >
              <SelectTrigger className={theme === 'dark' ? 'bg-card text-foreground border-border' : 'bg-white text-gray-900 border-gray-300'}>
                <SelectValue placeholder="Mode of Admission" />
              </SelectTrigger>
              <SelectContent className={theme === 'dark' ? 'bg-card border-border' : 'bg-white border-gray-200'}>
                <SelectItem value="KCET">KCET</SelectItem>
                <SelectItem value="COMEDK">COMEDK</SelectItem>
                <SelectItem value="JEE Main">JEE Main</SelectItem>
                <SelectItem value="NEET">NEET</SelectItem>
                <SelectItem value="Merit">Merit</SelectItem>
                <SelectItem value="Management">Management</SelectItem>
                <SelectItem value="NRI">NRI</SelectItem>
                <SelectItem value="Lateral Entry">Lateral Entry</SelectItem>
              </SelectContent>
            </Select>
            <Select
              value={state.editForm.semester}
              onValueChange={(value) =>
                updateState({
                  editForm: { ...state.editForm, semester: value, section: "" },
                  editSections: [],
                })
              }
              disabled={state.isLoading || state.semesters.length === 0}
            >
              <SelectTrigger className={theme === 'dark' ? 'bg-card text-foreground border-border' : 'bg-white text-gray-900 border-gray-300'}>
                <SelectValue
                  placeholder={state.semesters.length === 0 ? "No semesters available" : "Select Semester"}
                />
              </SelectTrigger>
              <SelectContent className={theme === 'dark' ? 'bg-card text-foreground border-border' : 'bg-white text-gray-900 border-gray-300'}>
                {state.semesters.map((s) => (
                  <SelectItem key={s.id} value={`${s.number}th Semester`} className={theme === 'dark' ? 'text-foreground hover:bg-accent' : 'text-gray-900 hover:bg-gray-100'}>
                    Semester {s.number}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={state.editForm.section}
              onValueChange={(value) => updateState({ editForm: { ...state.editForm, section: value } })}
              disabled={
                state.isLoading || state.isEditSectionsLoading || !state.editForm.semester || state.editSections.length === 0
              }
            >
              <SelectTrigger className={theme === 'dark' ? 'bg-card text-foreground border-border' : 'bg-white text-gray-900 border-gray-300'}>
                <SelectValue
                  placeholder={
                    state.editSections.length === 0 || !state.editForm.semester
                      ? "Select semester first"
                      : state.isEditSectionsLoading
                        ? <Loader2 className="h-4 w-4 animate-spin mx-auto" />
                        : "Select Section"
                  }
                />
              </SelectTrigger>
              <SelectContent className={theme === 'dark' ? 'bg-card text-foreground border-border' : 'bg-white text-gray-900 border-gray-300'}>
                {state.editSections
                  .filter((section) => section.semester_id === getSemesterId(state.editForm.semester))
                  .map((section) => (
                    <SelectItem key={section.id} value={section.name} className={theme === 'dark' ? 'text-foreground hover:bg-accent' : 'text-gray-900 hover:bg-gray-100'}>
                      Section {section.name}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
            {/* Cycle field - only show for semesters 1 and 2 */}
            {getSemesterNumber(state.editForm.semester) <= 2 && (
              <Select
                value={state.editForm.cycle}
                onValueChange={(value) => updateState({ editForm: { ...state.editForm, cycle: value } })}
              >
                <SelectTrigger className={theme === 'dark' ? 'bg-card text-foreground border-border' : 'bg-white text-gray-900 border-gray-300'}>
                  <SelectValue placeholder="Select Cycle" />
                </SelectTrigger>
                <SelectContent className={theme === 'dark' ? 'bg-card text-foreground border-border' : 'bg-white text-gray-900 border-gray-300'}>
                  <SelectItem value="P" className={theme === 'dark' ? 'text-foreground hover:bg-accent' : 'text-gray-900 hover:bg-gray-100'}>Physics Cycle</SelectItem>
                  <SelectItem value="C" className={theme === 'dark' ? 'text-foreground hover:bg-accent' : 'text-gray-900 hover:bg-gray-100'}>Chemistry Cycle</SelectItem>
                </SelectContent>
              </Select>
            )}
          </div>
          <DialogFooter className="flex justify-end gap-2 mt-4">
            <Button
              variant="outline"
              className={`text-foreground ${theme === 'dark' ? 'bg-card border-border hover:bg-accent' : 'bg-white border-gray-300 hover:bg-gray-100'}`}
              onClick={() => updateState({ editDialog: false, editSections: [] })}
            >
              Cancel
            </Button>
            <Button onClick={handleEditSave} className="flex items-center gap-1 text-sm font-medium px-3 py-1.5 rounded-md transition disabled:opacity-50 bg-primary text-white border-primary hover:bg-[#9147e0] hover:border-[#9147e0]">
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default StudentManagement;