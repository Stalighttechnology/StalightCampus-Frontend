import { translateTerminology, getTerm } from "@/utils/institutionConfig";
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../ui/card";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "../ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from
  "../ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from
  "../ui/table";
import { Download, FileText, UploadCloud, X, Trash2, Loader2, ChevronDown } from "lucide-react";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuCheckboxItem } from "../ui/dropdown-menu";
import { uploadStudyMaterial, getStudyMaterials, getBranches, manageSections, getSemesters, manageSubjects, deleteStudyMaterial } from "../../utils/hod_api";
import { uploadFileViaBackendProxy, downloadFileViaBackendProxy } from "../../utils/common_api";
import { useTheme } from "../../context/ThemeContext";
import { SkeletonTable } from "../ui/skeleton";
import { toast } from "react-hot-toast";
import { AdminPagination } from "../common/AdminPagination";
import Swal from "sweetalert2";
import { cn } from "@/lib/utils";

// Interface for study material from API
interface ApiStudyMaterial {
  id: string;
  title: string;
  subject_name: string;
  subject_code: string;
  semester_id: string;
  branch_id: string;
  uploaded_by: string;
  uploaded_by_name?: string;
  uploaded_by_role?: string | null;
  uploaded_at: string;
  file_url: string;
  drive_file_id?: string | null;
  drive_web_view_link?: string | null;
  section?: string | null;
  section_id?: string | null;
}

// Interface for display study material
interface StudyMaterial {
  id: string;
  title: string;
  subject_name: string;
  subject_code: string;
  semester: number | null;
  semester_id?: string | null;
  branch: string | null;
  branch_id?: string | null;
  uploaded_by: string;
  uploaded_by_name?: string;
  uploaded_by_role?: string | null;
  uploaded_at: string;
  file_url: string;
  section?: string | null;
  section_id?: string | null;
}

// Hook for managing study materials (loads by branch/semester/section/search)
const useStudyMaterials = (branchId: string | null, semesterFilter: string, sectionFilter: string, searchQuery: string, sectionsLoaded: boolean, page: number) => {
  const [studyMaterials, setStudyMaterials] = useState<StudyMaterial[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [totalCount, setTotalCount] = useState<number>(0);

  useEffect(() => {
    const fetchMaterials = async () => {
      // Only load materials when all filters are selected, unless a search query is active
      const hasSearch = searchQuery.trim() !== "";
      const hasBranch = branchId && branchId !== "";
      const hasSemester = semesterFilter && semesterFilter !== "" && semesterFilter !== "Choose Semester";
      const hasSection = sectionFilter && sectionFilter !== "" && sectionFilter !== "Choose Section";
      if (!hasSearch && (!sectionsLoaded || !hasBranch || !hasSemester || !hasSection)) {
        setStudyMaterials([]);
        setTotalPages(1);
        setTotalCount(0);
        return;
      }
      setLoading(true);
      try {
        const sem = (semesterFilter === 'Choose Semester' || semesterFilter === "") ? undefined : semesterFilter;
        const sec = (sectionFilter === 'Choose Section' || sectionFilter === "") ? undefined : sectionFilter;
        const resp = await getStudyMaterials(branchId || undefined, sem, sec, searchQuery, page);
        if (resp && resp.success && Array.isArray(resp.data)) {
          const mapped = resp.data.map((m: any) => ({
            id: m.id,
            title: m.title,
            subject_name: m.subject_name,
            subject_code: m.subject_code,
            semester: m.semester ? parseInt(m.semester as any) || null : null,
            semester_id: m.semester_id || m.semester || null,
            branch: m.branch || null,
            branch_id: m.branch_id || null,
            section: m.section || null,
            section_id: m.section_id || null,
            uploaded_by: m.uploaded_by || '',
            uploaded_by_name: m.uploaded_by_name || '',
            uploaded_by_role: m.uploaded_by_role || null,
            uploaded_at: m.uploaded_at || '',
            file_url: m.drive_web_view_link || m.file_url
          }));
          setStudyMaterials(mapped);
          setTotalPages(resp.total_pages || Math.ceil((resp.count || 0) / 20) || 1);
          setTotalCount(resp.count || 0);
        } else {
          setStudyMaterials([]);
          setTotalPages(1);
          setTotalCount(0);
        }
      } catch (error) {

        setStudyMaterials([]);
        setTotalPages(1);
        setTotalCount(0);
      } finally {
        setLoading(false);
      }
    };
    // Debounce search
    const timer = setTimeout(() => {
      fetchMaterials();
    }, 300);
    return () => clearTimeout(timer);
  }, [branchId, semesterFilter, sectionFilter, searchQuery, sectionsLoaded, page]);

  const addStudyMaterial = (material: StudyMaterial) => {
    setStudyMaterials((s) => [material, ...s]);
  };

  const removeStudyMaterial = (id: string) => {
    setStudyMaterials((s) => s.filter((m) => m.id !== id));
  };

  return { studyMaterials, addStudyMaterial, removeStudyMaterial, loading, totalPages, totalCount };
};

// Hook for managing upload modal
const useUploadModal = () => {
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [subjectName, setSubjectName] = useState("");
  const [subjectCode, setSubjectCode] = useState("");
  const [subjectId, setSubjectId] = useState("");
  const [semesterId, setSemesterId] = useState("");
  const [branchId, setBranchId] = useState("");
  const [sectionIds, setSectionIds] = useState<string[]>([]);
  const [isSectionDropdownOpen, setIsSectionDropdownOpen] = useState(false);
  const [uploading, setUploading] = useState(false);

  const [dragActive, setDragActive] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0]);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      setFile(e.dataTransfer.files[0]);
    }
  };

  const resetForm = () => {
    setFile(null);
    setTitle("");
    setSubjectName("");
    setSubjectCode("");
    setSubjectId("");
    setSemesterId("");
    setBranchId("");
    setSectionIds([]);
    setDragActive(false);
  };

  return {
    showUploadModal,
    setShowUploadModal,
    file,
    title,
    subjectName,
    subjectCode,
    semesterId,
    branchId,
    sectionIds,
    uploading,
    setUploading,
    handleFileChange,
    handleDrag,
    handleDrop,
    dragActive,
    setFile,
    setTitle,
    setSubjectName,
    setSubjectCode,
    setSubjectId,
    setSemesterId,
    setBranchId,
    setSectionIds,
    isSectionDropdownOpen,
    setIsSectionDropdownOpen,
    resetForm
  };
};

// Row component for each study material
const StudyMaterialRow = ({ material, theme, onDelete }: { material: StudyMaterial; theme: string; onDelete: (id: string) => void; }) => {
  const [deleting, setDeleting] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const handleDelete = async () => {
    Swal.fire({
      title: "Delete Study Material?",
      text: `Are you sure you want to delete "${material.title}"? This action cannot be undone.`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#ef4444",
      cancelButtonColor: theme === 'dark' ? '#374151' : '#e5e7eb',
      confirmButtonText: "Yes, delete it",
      cancelButtonText: "Cancel",
      background: theme === 'dark' ? '#1f2937' : '#ffffff',
      color: theme === 'dark' ? '#f3f4f6' : '#111827',
      iconColor: "#ef4444"
    }).then(async (result) => {
      if (result.isConfirmed) {
        setDeleting(true);
        try {
          const resp = await deleteStudyMaterial(material.id);
          if (resp.success) {
            toast.success("Study material deleted successfully");
            onDelete(material.id);
            Swal.fire({
              title: "Deleted!",
              text: "The material has been deleted.",
              icon: "success",
              timer: 1500,
              showConfirmButton: false,
              background: theme === 'dark' ? '#1f2937' : '#ffffff',
              color: theme === 'dark' ? '#f3f4f6' : '#111827'
            });
          } else {
            toast.error(resp.message || "Failed to delete study material");
            Swal.fire({
              title: "Error!",
              text: resp.message || "Failed to delete study material",
              icon: "error",
              background: theme === 'dark' ? '#1f2937' : '#ffffff',
              color: theme === 'dark' ? '#f3f4f6' : '#111827'
            });
          }
        } catch (e) {
          toast.error("Error deleting study material");
        } finally {
          setDeleting(false);
        }
      }
    });
  };

  const handleDownload = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (!material.file_url) return;
    setDownloading(true);
    try {
      if (material.file_url.includes('drive.google.com') || material.file_url.includes('docs.google.com')) {
        window.open(material.file_url, '_blank', 'noopener,noreferrer');
      } else {
        await downloadFileViaBackendProxy(material.file_url, material.title);
      }
    } catch (err) {
      toast.error("Failed to download file");
    } finally {
      setDownloading(false);
    }
  };

  return (
    <TableRow className={`group ${theme === 'dark' ? 'border-border/50' : 'border-gray-100'} hover:bg-muted/5 transition-colors`}>
      <TableCell className="w-[100px] px-6 py-4">
        <div className={`p-2.5 rounded-xl inline-flex items-center justify-center ${theme === 'dark' ? 'bg-red-500/10' : 'bg-red-50'}`}>
          <FileText className="text-red-500" size={22} />
        </div>
      </TableCell>
      <TableCell className="font-medium max-w-[250px] px-6 py-4">
        <div 
          onClick={handleDownload}
          className={`text-sm md:text-base lg:text-lg ${theme === 'dark' ? 'text-blue-400' : 'text-blue-600'} hover:underline cursor-pointer truncate font-semibold tracking-tight`}
        >
          {material.title}
        </div>
      </TableCell>
      <TableCell className={`text-sm md:text-base ${theme === 'dark' ? 'text-slate-300' : 'text-slate-600'} font-medium px-6 py-4 whitespace-nowrap`}>
        {material.subject_name}
      </TableCell>
      <TableCell className={`hidden md:table-cell text-sm md:text-base ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'} px-6 py-4 whitespace-nowrap`}>
        {material.subject_code}
      </TableCell>
      <TableCell className={`hidden md:table-cell text-sm md:text-base font-semibold ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'} px-6 py-4 whitespace-nowrap text-center`}>
        {material.semester || "N/A"}
      </TableCell>
      <TableCell className={`hidden lg:table-cell text-sm md:text-base ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'} px-6 py-4`}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-sm font-semibold text-primary shadow-sm flex-shrink-0">
            {(material.uploaded_by_name ?? 'U').charAt(0).toUpperCase()}
          </div>
          <div className="flex flex-col min-w-0">
            <span className="truncate font-medium">{material.uploaded_by_name ?? 'Unknown'}</span>
            {material.uploaded_by_role && (
              <span className="text-xs text-muted-foreground truncate">{material.uploaded_by_role}</span>
            )}
          </div>
        </div>
      </TableCell>
      <TableCell className="text-right px-6 py-4">
        <div className="flex justify-end items-center gap-3">
          <button
            onClick={handleDownload}
            disabled={downloading}
            className={`inline-flex items-center justify-center p-3 rounded-2xl transition-all duration-200 ${theme === 'dark' ? 'bg-primary/10 text-primary hover:bg-primary/20' : 'bg-primary/5 text-primary hover:bg-primary/10'}`}
          >
            {downloading ? <Loader2 className="animate-spin" size={22} /> : <Download size={22} />}
          </button>
          <button
            onClick={handleDelete}
            disabled={deleting}
            className={`inline-flex items-center justify-center p-3 rounded-2xl transition-all duration-200 ${theme === 'dark' ? 'bg-red-500/10 text-red-500 hover:bg-red-500/20' : 'bg-red-50 text-red-600 hover:bg-red-100'}`}
          >
            {deleting ? <Loader2 className="animate-spin" size={22} /> : <Trash2 size={22} />}
          </button>
        </div>
      </TableCell>
    </TableRow>
  );
};


// Main component
const StudyMaterials = () => {
  const { theme } = useTheme();
  // Open states for select dropdown triggers
  const [isBranchOpen, setIsBranchOpen] = useState(false);
  const [isSemesterOpen, setIsSemesterOpen] = useState(false);
  const [isSectionOpen, setIsSectionOpen] = useState(false);

  // Upload modal open states
  const [isModalBranchOpen, setIsModalBranchOpen] = useState(false);
  const [isModalSemesterOpen, setIsModalSemesterOpen] = useState(false);
  const [isModalSectionOpen, setIsModalSectionOpen] = useState(false);
  const [isModalSubjectOpen, setIsModalSubjectOpen] = useState(false);

  const [selectedBranchFilter, setSelectedBranchFilter] = useState<string>("");
  const [selectedSectionFilter, setSelectedSectionFilter] = useState<string>("");
  const [branches, setBranches] = useState<Array<{ id: string; name: string; }>>([]);
  const [sections, setSections] = useState<Array<{ id: string; name: string; }>>([]);
  const [pageSectionsLoaded, setPageSectionsLoaded] = useState<boolean>(false);
  const [pageSemesters, setPageSemesters] = useState<Array<{ id: string; number: number; }>>([]);
  // Modal-specific lists
  const [modalSemesters, setModalSemesters] = useState<Array<{ id: string; number: number; }>>([]);
  const [modalSections, setModalSections] = useState<Array<{ id: string; name: string; }>>([]);
  const [modalSubjects, setModalSubjects] = useState<Array<{ id: string; name: string; subject_code: string; }>>([]);

  // Pass null when empty to hook; but hook expects branch id, so use null to represent none
  const [searchQuery, setSearchQuery] = useState("");
  const [localSearchQuery, setLocalSearchQuery] = useState("");
  const [semesterFilter, setSemesterFilter] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  // Debounce sync local search to searchQuery
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchQuery(localSearchQuery);
      setCurrentPage(1);
    }, 500);
    return () => clearTimeout(timer);
  }, [localSearchQuery]);

  // Clear search query when dropdown filters change
  useEffect(() => {
    if (selectedBranchFilter || semesterFilter || selectedSectionFilter) {
      setLocalSearchQuery("");
      setSearchQuery("");
    }
  }, [selectedBranchFilter, semesterFilter, selectedSectionFilter]);

  // Pass null when empty to hook; but hook expects branch id, so use null to represent none
  const branchIdForHook = selectedBranchFilter || null;
  const { studyMaterials, addStudyMaterial, removeStudyMaterial, loading, totalPages, totalCount } = useStudyMaterials(branchIdForHook, semesterFilter, selectedSectionFilter, searchQuery, pageSectionsLoaded, currentPage);
  const {
    showUploadModal,
    setShowUploadModal,
    file,
    title,
    subjectName,
    subjectCode,
    subjectId,
    semesterId,
    branchId,
    sectionIds,
    uploading,
    setUploading,
    handleFileChange,
    handleDrag,
    handleDrop,
    dragActive,
    setFile,
    setTitle,
    setSubjectName,
    setSubjectCode,
    setSubjectId,
    setSemesterId,
    setBranchId,
    setSectionIds,
    isSectionDropdownOpen,
    setIsSectionDropdownOpen,
    resetForm
  } = useUploadModal();



  // Load branches on mount
  useEffect(() => {
    const load = async () => {
      try {
        const resp = await getBranches();
        if (resp && resp.success && Array.isArray(resp.data)) {
          setBranches(resp.data);
        }
      } catch (e) {

      }
    };
    load();
  }, []);
  // Load semesters for the page and sections when branch/semester filters change
  useEffect(() => {
    const loadPageSemesters = async () => {
      if (!selectedBranchFilter) {
        setPageSemesters([]);
        setSemesterFilter("");
        setSections([]);
        setSelectedSectionFilter("");
        return;
      }
      try {
        const resp = await getSemesters(selectedBranchFilter);
        if (resp && resp.success && Array.isArray(resp.data)) {
          setPageSemesters(resp.data);
        } else {
          setPageSemesters([]);
        }
      } catch (e) {

        setPageSemesters([]);
      }
      setSemesterFilter("");
      setSelectedSectionFilter("");
      setCurrentPage(1);
    };
    loadPageSemesters();
  }, [selectedBranchFilter]);

  useEffect(() => {
    const loadSections = async () => {
      // Only load sections when a branch AND a semester are selected
      setPageSectionsLoaded(false);
      if (!selectedBranchFilter || !semesterFilter) {
        setSections([]);
        setSelectedSectionFilter("");
        setPageSectionsLoaded(true);
        return;
      }
      try {
        const params: any = { branch_id: selectedBranchFilter, semester_id: semesterFilter };
        const resp = await manageSections(params, "GET");
        if (resp && resp.success && Array.isArray(resp.data)) {
          setSections(resp.data.map((s) => ({ id: s.id, name: s.name })));
        } else {
          setSections([]);
        }
      } catch (e) {

        setSections([]);
      }
      setSelectedSectionFilter("");
      setCurrentPage(1);
      setPageSectionsLoaded(true);
    };
    loadSections();
  }, [selectedBranchFilter, semesterFilter]);



  // Load semesters when branchId (upload modal) changes
  useEffect(() => {
    const loadSemesters = async () => {
      if (!branchId) {
        setModalSemesters([]);
        setSemesterId("");
        setSectionIds([]);
        setModalSubjects([]);
        setSubjectCode("");
        return;
      }
      try {
        const resp = await getSemesters(branchId);
        if (resp && resp.success && Array.isArray(resp.data)) {
          setModalSemesters(resp.data);
        } else {
          setModalSemesters([]);
        }
      } catch (e) {

        setModalSemesters([]);
      }
    };
    loadSemesters();
  }, [branchId]);

  // Load sections and subjects when semester changes in modal
  useEffect(() => {
    const loadSectionsAndSubjects = async () => {
      if (!branchId || !semesterId) {
        setModalSections([]);
        setModalSubjects([]);
        setSectionIds([]);
        setSubjectCode("");
        return;
      }
      try {
        const secsResp = await manageSections({ branch_id: branchId, semester_id: semesterId }, "GET");
        if (secsResp && secsResp.success && Array.isArray(secsResp.data)) {
          setModalSections(secsResp.data.map((s) => ({ id: s.id, name: s.name })));
        } else {
          setModalSections([]);
        }
      } catch (e) {

        setModalSections([]);
      }

      try {
        const subjResp = await manageSubjects({ branch_id: branchId, semester_id: semesterId }, "GET");
        if (subjResp && subjResp.success && Array.isArray(subjResp.data)) {
          setModalSubjects(subjResp.data);
        } else {
          setModalSubjects([]);
        }
      } catch (e) {

        setModalSubjects([]);
      }
    };
    loadSectionsAndSubjects();
  }, [branchId, semesterId]);



  const handleUpload = async () => {

    if (!file || !title) {
      Swal.fire({
        title: "Missing Information",
        text: "Please provide a title and select a file.",
        icon: "warning",
        confirmButtonText: "OK",
        confirmButtonColor: theme === 'dark' ? 'hsl(var(--primary))' : '#3b82f6',
        background: theme === 'dark' ? '#1c1c1e' : '#ffffff',
        color: theme === 'dark' ? '#ffffff' : '#000000',
        customClass: { popup: 'rounded-2xl border border-border shadow-2xl' }
      });
      return;
    }

    if (!branchId || !semesterId || sectionIds.length === 0) {
      Swal.fire({
        title: "Missing Configuration",
        text: "Please select branch, semester, and section.",
        icon: "warning",
        confirmButtonText: "OK",
        confirmButtonColor: theme === 'dark' ? 'hsl(var(--primary))' : '#3b82f6',
        background: theme === 'dark' ? '#1c1c1e' : '#ffffff',
        color: theme === 'dark' ? '#ffffff' : '#000000',
        customClass: { popup: 'rounded-2xl border border-border shadow-2xl' }
      });
      return;
    }

    if (!subjectId && !subjectName) {
      Swal.fire({
        title: "Missing Course Selection",
        text: "Please select a course (Course Name).",
        icon: "warning",
        confirmButtonText: "OK",
        confirmButtonColor: theme === 'dark' ? 'hsl(var(--primary))' : '#3b82f6',
        background: theme === 'dark' ? '#1c1c1e' : '#ffffff',
        color: theme === 'dark' ? '#ffffff' : '#000000',
        customClass: { popup: 'rounded-2xl border border-border shadow-2xl' }
      });
      return;
    }

    // Validate file size <= 20MB
    const MAX_SIZE = 20 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      Swal.fire({
        title: "File Too Large",
        text: "File size must not exceed 20MB.",
        icon: "error",
        confirmButtonText: "OK",
        confirmButtonColor: theme === 'dark' ? 'hsl(var(--primary))' : '#3b82f6',
        background: theme === 'dark' ? '#1c1c1e' : '#ffffff',
        color: theme === 'dark' ? '#ffffff' : '#000000',
        customClass: { popup: 'rounded-2xl border border-border shadow-2xl' }
      });
      return;
    }
    
    // Validate file type
    const allowedTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    if (!allowedTypes.includes(file.type)) {
      Swal.fire({
        title: "Invalid File Type",
        text: "Only PDF, DOC, and DOCX files are allowed.",
        icon: "error",
        confirmButtonText: "OK",
        confirmButtonColor: theme === 'dark' ? 'hsl(var(--primary))' : '#3b82f6',
        background: theme === 'dark' ? '#1c1c1e' : '#ffffff',
        color: theme === 'dark' ? '#ffffff' : '#000000',
        customClass: { popup: 'rounded-2xl border border-border shadow-2xl' }
      });
      return;
    }

    setUploading(true);
    try {
      const finalFileUrl = await uploadFileViaBackendProxy(file, 'study_materials');
      if (!finalFileUrl) {
        throw new Error("Failed to upload file to storage via proxy");
      }

      // 3. Finalize upload with backend
      const response = await uploadStudyMaterial({
        title,
        subject_name: subjectName,
        subject_code: subjectCode,
        semester_id: semesterId,
        branch_id: branchId,
        section_ids: sectionIds,
        file_url: finalFileUrl
      });

      if (response.success && response.data) {
        const apiMaterial: ApiStudyMaterial = response.data;
        const newMaterial: StudyMaterial = {
          id: apiMaterial.id,
          title: apiMaterial.title,
          subject_name: apiMaterial.subject_name,
          subject_code: apiMaterial.subject_code,
          semester: apiMaterial.semester_id ? parseInt(apiMaterial.semester_id) || null : apiMaterial.semester ? parseInt(apiMaterial.semester as any) || null : null,
          branch: apiMaterial.branch_id || apiMaterial.branch || null,
          uploaded_by: apiMaterial.uploaded_by,
          uploaded_by_name: apiMaterial.uploaded_by_name,
          uploaded_by_role: apiMaterial.uploaded_by_role,
          uploaded_at: apiMaterial.uploaded_at,
          file_url: apiMaterial.file_url
        };
        resetForm();
        setShowUploadModal(false);
        
        Swal.fire({
          title: "Upload Successful!",
          text: `"${title}" has been added to the course materials.`,
          icon: "success",
          confirmButtonText: "Great",
          confirmButtonColor: theme === 'dark' ? 'hsl(var(--primary))' : '#3b82f6',
          background: theme === 'dark' ? '#1c1c1e' : '#ffffff',
          color: theme === 'dark' ? '#ffffff' : '#000000',
          iconColor: "#22c55e",
          customClass: {
            popup: 'rounded-2xl border border-border shadow-2xl'
          }
        });
      } else {
        toast.error(response.message || "Upload failed");
      }
    } catch (error: any) {
      toast.error(error.message || "Error uploading material");
    } finally {
      setUploading(false);
    }
  };

  // Since we are doing server-side search/filter, we just use studyMaterials directly
  // unless we want to do additional client-side filtering
  const filteredMaterials = studyMaterials;

  return (
    <div id="hod-study-materials-container" className="w-full mx-auto max-w-none">
      <Card className={`shadow-lg ${theme === 'dark' ? 'bg-card border-border text-foreground' : 'bg-white border-gray-200 text-gray-900'}`}>
        <div id="hod-study-materials-header-section" className="space-y-4">
          <CardHeader className="pb-4 border-b">
            <div className="flex justify-between items-center gap-2">
              <CardTitle className="text-2xl font-semibold leading-none tracking-tight">Study Materials</CardTitle>
              <Button
                onClick={() => setShowUploadModal(true)}
                className={`px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-1 transition-all duration-200 ease-in-out transform hover:scale-105 bg-primary text-white border-primary hover:bg-primary/90 hover:border-primary/90 hover:text-white ${theme === 'dark' ? 'shadow-lg shadow-primary/20' : 'shadow-md'}`}
                disabled={uploading}>

                <UploadCloud size={16} />
                Upload
              </Button>
            </div>
          </CardHeader>
          <div className="px-6 pb-2 pt-3">
            {/* Filters Grid */}
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <Select
                    open={isBranchOpen}
                    onOpenChange={setIsBranchOpen}
                    value={selectedBranchFilter}
                    onValueChange={(value) => {
                      setSelectedBranchFilter(value);
                      setTimeout(() => setIsSemesterOpen(true), 150);
                    }}>

                    <SelectTrigger className={`w-full text-sm sm:text-base h-10 sm:h-11 ${theme === 'dark' ? 'border-border bg-background text-foreground' : 'border-gray-300 bg-white text-gray-900'}`}>
                      <SelectValue placeholder={translateTerminology("Select Branch")} />
                    </SelectTrigger>
                    <SelectContent className={cn("max-h-[200px] overflow-y-auto", theme === 'dark' ? 'bg-background text-foreground border-border' : 'bg-white text-gray-900 border-gray-300')}>
                      {branches.length > 0 ? (
                        branches.map((b) => (
                          <SelectItem key={b.id} value={b.id}>
                            {b.name}
                          </SelectItem>
                        ))
                      ) : (
                        <div className="py-2 px-8 text-sm text-muted-foreground text-center">No branches available</div>
                      )}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Select
                    open={isSemesterOpen}
                    onOpenChange={setIsSemesterOpen}
                    value={semesterFilter}
                    onValueChange={(value) => {
                      setSemesterFilter(value);
                      setTimeout(() => setIsSectionOpen(true), 150);
                    }}
                    disabled={!selectedBranchFilter}>

                    <SelectTrigger className={`w-full text-sm sm:text-base h-10 sm:h-11 ${theme === 'dark' ? 'border-border bg-background text-foreground' : 'border-gray-300 bg-white text-gray-900'}`}>
                      <SelectValue placeholder={translateTerminology("Select Semester")} />
                    </SelectTrigger>
                    <SelectContent className={cn("max-h-[200px] overflow-y-auto", theme === 'dark' ? 'bg-background text-foreground border-border' : 'bg-white text-gray-900 border-gray-300')}>
                      {pageSemesters && pageSemesters.length > 0 ? (
                        pageSemesters.map((s) => (
                          <SelectItem key={s.id} value={s.id}>
                            {`Semester ${s.number}`}
                          </SelectItem>
                        ))
                      ) : (
                        <div className="py-2 px-8 text-sm text-muted-foreground text-center">No semesters available</div>
                      )}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Select
                    open={isSectionOpen}
                    onOpenChange={setIsSectionOpen}
                    value={selectedSectionFilter}
                    onValueChange={(value) => setSelectedSectionFilter(value)}
                    disabled={!semesterFilter}>

                    <SelectTrigger className={`w-full text-sm sm:text-base h-10 sm:h-11 ${theme === 'dark' ? 'border-border bg-background text-foreground' : 'border-gray-300 bg-white text-gray-900'}`}>
                      <SelectValue placeholder="Select Section" />
                    </SelectTrigger>
                    <SelectContent className={cn("max-h-[200px] overflow-y-auto", theme === 'dark' ? 'bg-background text-foreground border-border' : 'bg-white text-gray-900 border-gray-300')}>
                      {sections.length > 0 ? (
                        sections.map((s) => (
                          <SelectItem key={s.id} value={s.id}>
                            {s.name}
                          </SelectItem>
                        ))
                      ) : (
                        <div className="py-2 px-8 text-sm text-muted-foreground text-center">No sections available</div>
                      )}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Search Row */}
              <div className="w-full">
                <div className="relative">
                  <Input
                    placeholder="Search materials..."
                    className={`w-full text-sm sm:text-base h-10 sm:h-11 pr-16 ${theme === 'dark' ? 'bg-background text-foreground border-border placeholder:text-muted-foreground' : 'bg-white text-gray-900 border-gray-300 placeholder:text-gray-500'}`}
                    value={localSearchQuery}
                    onChange={(e) => setLocalSearchQuery(e.target.value)} />
                  {localSearchQuery && (
                    <button
                      onClick={() => {
                        setLocalSearchQuery("");
                        setSearchQuery("");
                      }}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-primary hover:text-primary/80 transition-colors"
                    >
                      Clear
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
        <CardContent className="space-y-6 pt-2">
          {/* Table Area Section */}
          <div className="pt-4 border-t">
                    {(!searchQuery.trim() && (!pageSectionsLoaded || !branchIdForHook || !semesterFilter || !selectedSectionFilter)) ? (
              <div className={`flex flex-col items-center justify-center py-16 px-6 text-center rounded-3xl border-2 border-dashed shadow-sm ${theme === 'dark' ? 'bg-muted/10 border-border/60' : 'bg-gray-50 border-gray-200/60'}`}>
                <div className={`w-24 h-24 rounded-3xl flex items-center justify-center mb-8 shadow-inner animate-pulse ${theme === 'dark' ? 'bg-primary/20 text-primary' : 'bg-primary/10 text-primary'}`}>
                  <FileText className="w-12 h-12" />
                </div>
                <h3 className={`text-2xl md:text-2xl font-semibold mb-4 tracking-tight ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>
                  Select Filters to View Materials
                </h3>
                <p className={`text-base md:text-md max-w-md mx-auto leading-relaxed ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}`}>
                  Please select a branch, semester, and section from the dropdowns above to explore available study materials.
                </p>
              </div>
            ) : (
              <div className="overflow-hidden rounded-2xl border border-border">
                <Table>
                  <TableHeader className={theme === 'dark' ? 'bg-muted/30' : 'bg-slate-50/50'}>
                    <TableRow className="border-none hover:bg-transparent h-14">
                      <TableHead className="w-[100px] px-6 py-4 text-base md:text-md font-semibold text-slate-800 whitespace-nowrap">Type</TableHead>
                      <TableHead className="px-6 py-4 text-base md:text-md font-semibold text-slate-800 whitespace-nowrap">Title</TableHead>
                      <TableHead className="px-6 py-4 text-base md:text-md font-semibold text-slate-800 whitespace-nowrap">Course Name</TableHead>
                      <TableHead className="hidden md:table-cell px-6 py-4 text-base md:text-md font-semibold text-slate-800 whitespace-nowrap">Code</TableHead>
                      <TableHead className="hidden md:table-cell px-6 py-4 text-base md:text-md font-semibold text-slate-800 whitespace-nowrap text-center">Sem</TableHead>
                      <TableHead className="hidden lg:table-cell px-6 py-4 text-base md:text-md font-semibold text-slate-800 whitespace-nowrap">Uploaded By</TableHead>
                      <TableHead className="text-right px-6 py-4 text-base md:text-md font-semibold text-slate-800 whitespace-nowrap">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      <TableRow>
                        <TableCell colSpan={7} className="p-4 text-center">
                          <SkeletonTable rows={5} cols={7} />
                        </TableCell>
                      </TableRow>
                    ) : studyMaterials.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="p-8">
                          <div className={`flex flex-col items-center justify-center py-16 px-6 text-center rounded-3xl border-2 border-dashed shadow-sm ${theme === 'dark' ? 'bg-muted/10 border-border/60' : 'bg-gray-50 border-gray-200/60'}`}>
                            <div className={`w-24 h-24 rounded-3xl flex items-center justify-center mb-8 shadow-inner ${theme === 'dark' ? 'bg-primary/20 text-primary' : 'bg-primary/10 text-primary'}`}>
                              <UploadCloud className="w-12 h-12" />
                            </div>
                            <h3 className={`text-2xl md:text-3xl font-semibold mb-4 tracking-tight ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>
                              No Study Materials Found
                            </h3>
                            <p className={`text-base md:text-lg max-w-md mx-auto leading-relaxed ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}`}>
                              {searchQuery ?
                                `We couldn't find any materials matching "${searchQuery}". Please try a different search term or criteria.` :
                                "No study materials have been uploaded for the selected filters yet."}
                            </p>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : (
                      studyMaterials.map((material) => (
                        <StudyMaterialRow key={material.id} material={material} theme={theme} onDelete={removeStudyMaterial} />
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>

          {totalPages > 1 && (
            <AdminPagination
              pagination={{
                page: currentPage,
                pageSize: 20,
                totalPages: totalPages,
                totalItems: totalCount
              }}
              onPageChange={setCurrentPage}
            />
          )}
        </CardContent>
      </Card>

      <Dialog open={showUploadModal} onOpenChange={(open) => {
        if (!uploading) {
          setShowUploadModal(open);
          if (!open) resetForm();
        }
      }}>
        <DialogContent className={`w-[92%] sm:max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl ${theme === 'dark' ? 'bg-card text-foreground border-border' : 'bg-white text-gray-900 border-gray-200'}`}>
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold">Upload Study Material</DialogTitle>
          </DialogHeader>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-4">
            {/* Left Side: Form Fields */}
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="material-title">Material Title <span className="text-red-500">*</span></Label>
                <Input
                  id="material-title"
                  placeholder="Enter title (e.g. Unit 1 Notes)"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className={theme === 'dark' ? 'bg-background border-border' : 'bg-white border-gray-300'}
                  disabled={uploading} />

              </div>

              <div className="space-y-2">
                <Label>{translateTerminology("Branch")} <span className="text-red-500">*</span></Label>
                <Select
                  open={isModalBranchOpen}
                  onOpenChange={setIsModalBranchOpen}
                  value={branchId}
                  onValueChange={(value) => {
                    setBranchId(value);
                    setTimeout(() => setIsModalSemesterOpen(true), 150);
                  }}
                  disabled={uploading}>

                  <SelectTrigger className={theme === 'dark' ? 'bg-background border-border' : 'bg-white border-gray-300'}>
                    <SelectValue placeholder={translateTerminology("Select Branch")} />
                  </SelectTrigger>
                  <SelectContent className={cn("max-h-[200px] overflow-y-auto", theme === 'dark' ? 'bg-card border-border text-foreground' : 'bg-white text-gray-900')}>
                    {branches.length > 0 ? (
                      branches.map((b) => (
                        <SelectItem key={b.id} value={b.id}>
                          {b.name}
                        </SelectItem>
                      ))
                    ) : (
                      <div className="py-2 px-8 text-sm text-muted-foreground text-center">No branches available</div>
                    )}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{translateTerminology("Semester")} <span className="text-red-500">*</span></Label>
                  <Select
                    open={isModalSemesterOpen}
                    onOpenChange={setIsModalSemesterOpen}
                    value={semesterId}
                    onValueChange={(value) => {
                      setSemesterId(value);
                      setTimeout(() => setIsModalSectionOpen(true), 150);
                    }}
                    disabled={uploading || !branchId}>

                    <SelectTrigger className={theme === 'dark' ? 'bg-background border-border' : 'bg-white border-gray-300'}>
                      <SelectValue placeholder="Select Sem" />
                    </SelectTrigger>
                    <SelectContent className={cn("max-h-[200px] overflow-y-auto", theme === 'dark' ? 'bg-card border-border text-foreground' : 'bg-white text-gray-900')}>
                      {modalSemesters.length > 0 ? (
                        modalSemesters.map((s) => (
                          <SelectItem key={s.id} value={s.id}>
                            Sem {s.number}
                          </SelectItem>
                        ))
                      ) : (
                        <div className="py-2 px-8 text-sm text-muted-foreground text-center">No semesters available</div>
                      )}
                    </SelectContent>
                  </Select>
                </div>
                 <div className="space-y-2 flex flex-col justify-end">
                   <Label>Section <span className="text-red-500">*</span></Label>
                   <div className="relative">
                     {/* Trigger button */}
                     <button
                       type="button"
                       disabled={uploading || !semesterId}
                       onClick={() => setIsSectionDropdownOpen(prev => !prev)}
                       className={cn(
                         "w-full min-h-10 h-auto py-1 px-3 rounded-md border text-sm flex items-center justify-between gap-2 bg-background font-normal",
                         theme === 'dark' ? 'border-border text-foreground' : 'border-gray-300 text-gray-900',
                         (uploading || !semesterId) && 'opacity-50 cursor-not-allowed'
                       )}
                     >
                       <div className="flex flex-row gap-1 items-center overflow-x-auto py-1 flex-1 min-w-0 custom-scrollbar">
                         {sectionIds.length > 0 ? sectionIds.map(id => {
                           const sec = modalSections.find(s => s.id === id);
                           return (
                             <span key={id} className="inline-flex items-center gap-1 bg-primary/10 text-primary text-xs px-2 py-0.5 rounded-md font-medium border border-primary/20 shrink-0">
                               Sec {sec ? sec.name : id}
                               <span
                                 role="button"
                                 tabIndex={0}
                                 className="hover:bg-primary/20 rounded-full p-0.5 transition-colors focus:outline-none cursor-pointer"
                                 onPointerDown={(e) => { e.stopPropagation(); e.preventDefault(); }}
                                 onClick={(e) => { e.stopPropagation(); e.preventDefault(); setSectionIds(sectionIds.filter(x => x !== id)); }}
                               >
                                 <X size={10} />
                               </span>
                             </span>
                           );
                         }) : <span className={theme === 'dark' ? 'text-muted-foreground' : 'text-gray-400'}>Select Section</span>}
                       </div>
                       <ChevronDown className={cn("h-4 w-4 opacity-50 shrink-0 transition-transform", isSectionDropdownOpen && 'rotate-180')} />
                     </button>

                     {/* Custom dropdown panel */}
                     {isSectionDropdownOpen && (
                       <>
                         {/* Backdrop to close */}
                         <div
                           className="fixed inset-0 z-[9998]"
                           onClick={() => setIsSectionDropdownOpen(false)}
                         />
                         <div className={cn(
                           "absolute left-0 top-full mt-1 w-full z-[9999] rounded-md border shadow-lg overflow-hidden",
                           theme === 'dark' ? 'bg-card border-border' : 'bg-white border-gray-200'
                         )}>
                           {modalSections.length > 0 ? (
                             <>
                               {/* Select All row */}
                               <label
                                 className={cn(
                                   "flex items-center gap-3 px-3 py-2 cursor-pointer border-b text-sm font-medium select-none",
                                   theme === 'dark'
                                     ? 'hover:bg-accent border-border text-foreground'
                                     : 'hover:bg-gray-50 border-gray-100 text-gray-900'
                                 )}
                               >
                                 <input
                                   type="checkbox"
                                   className="h-4 w-4 rounded accent-primary cursor-pointer shrink-0"
                                   checked={sectionIds.length === modalSections.length && modalSections.length > 0}
                                   ref={el => { if (el) el.indeterminate = sectionIds.length > 0 && sectionIds.length < modalSections.length; }}
                                   onChange={(e) => {
                                     if (e.target.checked) {
                                       setSectionIds(modalSections.map(s => s.id));
                                     } else {
                                       setSectionIds([]);
                                     }
                                   }}
                                 />
                                 Select All
                               </label>
                               {/* Individual section rows */}
                               <div className="max-h-[180px] overflow-y-auto">
                                 {modalSections.map((s) => (
                                   <label
                                     key={s.id}
                                     className={cn(
                                       "flex items-center gap-3 px-3 py-2 cursor-pointer text-sm select-none",
                                       theme === 'dark'
                                         ? 'hover:bg-accent text-foreground'
                                         : 'hover:bg-gray-50 text-gray-900'
                                     )}
                                   >
                                     <input
                                       type="checkbox"
                                       className="h-4 w-4 rounded accent-primary cursor-pointer shrink-0"
                                       checked={sectionIds.includes(s.id)}
                                       onChange={(e) => {
                                         if (e.target.checked) {
                                           setSectionIds(prev => [...prev, s.id]);
                                         } else {
                                           setSectionIds(prev => prev.filter(id => id !== s.id));
                                         }
                                       }}
                                     />
                                     Sec {s.name}
                                   </label>
                                 ))}
                               </div>
                             </>
                           ) : (
                             <div className="py-3 px-4 text-sm text-muted-foreground text-center">No sections available</div>
                           )}
                         </div>
                       </>
                     )}
                   </div>
                 </div>
              </div>

              <div className="space-y-2">
                <Label>Course / Subject <span className="text-red-500">*</span></Label>
                <Select
                  open={isModalSubjectOpen}
                  onOpenChange={setIsModalSubjectOpen}
                  value={subjectId}
                  onValueChange={(sid) => {
                    setSubjectId(sid);
                    const subj = modalSubjects.find((m) => m.id === sid);
                    if (subj) {
                      setSubjectName(subj.name);
                      setSubjectCode(subj.subject_code || "");
                    } else {
                      setSubjectName("");
                      setSubjectCode("");
                    }
                  }}
                  disabled={uploading || !semesterId}>

                  <SelectTrigger className={theme === 'dark' ? 'bg-background border-border' : 'bg-white border-gray-300'}>
                    <SelectValue placeholder="Select Course" />
                  </SelectTrigger>
                  <SelectContent className={cn("max-h-[200px] overflow-y-auto", theme === 'dark' ? 'bg-card border-border text-foreground' : 'bg-white text-gray-900')}>
                    {modalSubjects.length > 0 ? (
                      modalSubjects.map((s) => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.name} ({s.subject_code})
                        </SelectItem>
                      ))
                    ) : (
                      <div className="py-2 px-8 text-sm text-muted-foreground text-center">No courses available</div>
                    )}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Right Side: Upload Area */}
            <div className="space-y-4">
              <Label>File Upload <span className="text-red-500">*</span></Label>
              <div
                onDragEnter={handleDrag}
                onDragOver={handleDrag}
                onDragLeave={handleDrag}
                onDrop={handleDrop}
                className={`
                  relative border-2 border-dashed rounded-xl p-8 text-center transition-all duration-200
                  ${dragActive ?
                    'border-primary bg-primary/10 scale-[1.02]' :
                    theme === 'dark' ? 'border-border bg-background/50' : 'border-gray-300 bg-gray-50'}
                  ${file ? 'border-green-500 bg-green-500/5' : ''}
                `}>

                <UploadCloud
                  className={`mx-auto mb-4 ${file ? 'text-green-500' : theme === 'dark' ? 'text-muted-foreground' : 'text-gray-400'}`}
                  size={48} />


                {file ?
                  <div className="space-y-2">
                    <p className="text-sm font-medium truncate px-4">{file.name}</p>
                    <p className={`text-xs ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}`}>
                      {(file.size / (1024 * 1024)).toFixed(2)} MB
                    </p>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setFile(null)}
                      className="text-red-500 hover:text-red-700 hover:bg-red-50">

                      <X size={14} className="mr-1" /> Remove
                    </Button>
                  </div> :

                  <div className="space-y-2">
                    <p className="text-sm font-medium">Click or drag to upload</p>
                    <p className={`text-xs ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}`}>
                      PDF, DOCX, etc. (Max 20MB)
                    </p>
                    <Input
                      type="file"
                      className="hidden"
                      id="file-upload"
                      accept=".pdf,.doc,.docx"
                      onChange={handleFileChange}
                      disabled={uploading} />

                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-2"
                      onClick={() => document.getElementById('file-upload')?.click()}>

                      Browse Files
                    </Button>
                  </div>
                }
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => {
                resetForm();
                setShowUploadModal(false);
              }}
              disabled={uploading}>

              Cancel
            </Button>
            <Button
              onClick={handleUpload}
              disabled={uploading || !file || !title || !branchId || !semesterId || sectionIds.length === 0 || (!subjectId && !subjectName)}>

              {uploading ?
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Uploading...
                </> :

                "Upload Material"
              }
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>);

};

export default StudyMaterials;