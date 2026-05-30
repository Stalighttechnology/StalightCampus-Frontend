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
import { Download, FileText, UploadCloud, X, Trash2, Loader2 } from "lucide-react";
import { uploadStudyMaterial, getStudyMaterials, getBranches, manageSections, getSemesters, manageSubjects, deleteStudyMaterial } from "../../utils/hod_api";
import { uploadFileViaBackendProxy, downloadFileViaBackendProxy } from "../../utils/common_api";
import { useTheme } from "../../context/ThemeContext";
import { SkeletonTable } from "../ui/skeleton";
import { toast } from "react-hot-toast";
import { AdminPagination } from "../common/AdminPagination";
import Swal from "sweetalert2";

// Interface for study material from API
interface ApiStudyMaterial {
  id: string;
  title: string;
  subject_name: string;
  subject_code: string;
  semester_id: string;
  branch_id: string;
  uploaded_by: string;
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
      // Only load materials when all filters are selected
      if (!sectionsLoaded || !branchId || semesterFilter === 'Choose Semester' || sectionFilter === 'Choose Section') {
        setStudyMaterials([]);
        setTotalPages(1);
        setTotalCount(0);
        return;
      }
      setLoading(true);
      try {
        const sem = semesterFilter === 'Choose Semester' ? undefined : semesterFilter;
        const sec = sectionFilter === 'Choose Section' ? undefined : sectionFilter;
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
  const [sectionId, setSectionId] = useState("");
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
    setSectionId("");
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
    sectionId,
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
    setSectionId,
    resetForm
  };
};

// Row component for each study material
const StudyMaterialRow = ({ material, theme, onDelete }: { material: StudyMaterial; theme: string; onDelete: (id: string) => void; }) => {
  const [deleting, setDeleting] = useState(false);

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
    if (material.file_url.includes('drive.google.com') || material.file_url.includes('docs.google.com')) {
      window.open(material.file_url, '_blank', 'noopener,noreferrer');
    } else {
      await downloadFileViaBackendProxy(material.file_url, material.title);
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
      <TableCell className={`hidden lg:table-cell text-sm md:text-base ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'} px-6 py-4 whitespace-nowrap`}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-sm font-semibold text-primary shadow-sm">
            {material.uploaded_by.charAt(0)}
          </div>
          <span className="truncate font-medium">{material.uploaded_by}</span>
        </div>
      </TableCell>
      <TableCell className="text-right px-6 py-4">
        <div className="flex justify-end items-center gap-3">
          <button
            onClick={handleDownload}
            className={`inline-flex items-center justify-center p-3 rounded-2xl transition-all duration-200 ${theme === 'dark' ? 'bg-primary/10 text-primary hover:bg-primary/20' : 'bg-primary/5 text-primary hover:bg-primary/10'}`}
          >
            <Download size={22} />
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
  const [selectedBranchFilter, setSelectedBranchFilter] = useState<string>("Choose Branch");
  const [selectedSectionFilter, setSelectedSectionFilter] = useState<string>("Choose Section");
  const [branches, setBranches] = useState<Array<{ id: string; name: string; }>>([]);
  const [sections, setSections] = useState<Array<{ id: string; name: string; }>>([]);
  const [pageSectionsLoaded, setPageSectionsLoaded] = useState<boolean>(false);
  const [pageSemesters, setPageSemesters] = useState<Array<{ id: string; number: number; }>>([]);
  // Modal-specific lists
  const [modalSemesters, setModalSemesters] = useState<Array<{ id: string; number: number; }>>([]);
  const [modalSections, setModalSections] = useState<Array<{ id: string; name: string; }>>([]);
  const [modalSubjects, setModalSubjects] = useState<Array<{ id: string; name: string; subject_code: string; }>>([]);

  // Pass null when 'Choose Branch' to hook; but hook expects branch id, so use null to represent none
  const [searchQuery, setSearchQuery] = useState("");
  const [localSearchQuery, setLocalSearchQuery] = useState("");
  const [semesterFilter, setSemesterFilter] = useState("Choose Semester");
  const [currentPage, setCurrentPage] = useState(1);

  // Debounce sync local search to searchQuery
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchQuery(localSearchQuery);
      setCurrentPage(1);
    }, 500);
    return () => clearTimeout(timer);
  }, [localSearchQuery]);

  // Pass null when 'Choose Branch' to hook; but hook expects branch id, so use null to represent none
  const branchIdForHook = selectedBranchFilter === "Choose Branch" ? null : selectedBranchFilter;
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
    sectionId,
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
    setSectionId,
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
      if (!selectedBranchFilter || selectedBranchFilter === "Choose Branch") {
        setPageSemesters([]);
        setSemesterFilter("Choose Semester");
        setSections([]);
        setSelectedSectionFilter("Choose Section");
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
      setSemesterFilter("Choose Semester");
      setSelectedSectionFilter("Choose Section");
      setCurrentPage(1);
    };
    loadPageSemesters();
  }, [selectedBranchFilter]);

  useEffect(() => {
    const loadSections = async () => {
      // Only load sections when a branch AND a semester are selected
      setPageSectionsLoaded(false);
      if (!selectedBranchFilter || selectedBranchFilter === "Choose Branch" || semesterFilter === 'Choose Semester') {
        setSections([]);
        setSelectedSectionFilter("Choose Section");
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
      setSelectedSectionFilter("Choose Section");
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
        setSectionId("");
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
        setSectionId("");
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
      alert("Please provide a title and select a file.");
      return;
    }

    if (!branchId || !semesterId) {
      alert("Please provide branch ID and semester ID.");
      return;
    }

    if (!subjectId && !subjectName) {
      alert("Please select a course (Course Name).");
      return;
    }

    // Validate file size <= 20MB
    const MAX_SIZE = 20 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      alert("File size must not exceed 20MB.");
      return;
    }
    
    // Validate file type
    const allowedTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    if (!allowedTypes.includes(file.type)) {
      alert("Only PDF, DOC, and DOCX files are allowed.");
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
        section_id: sectionId,
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
          <CardHeader className="pb-4">
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
          <div className="px-6 pb-2">
            {/* Filters Grid */}
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <Select
                    value={selectedBranchFilter}
                    onValueChange={(value) => setSelectedBranchFilter(value)}>

                    <SelectTrigger className={`w-full text-sm sm:text-base h-10 sm:h-11 ${theme === 'dark' ? 'border-border bg-background text-foreground' : 'border-gray-300 bg-white text-gray-900'}`}>
                      <SelectValue placeholder="Choose Branch" />
                    </SelectTrigger>
                    <SelectContent className={theme === 'dark' ? 'bg-background text-foreground border-border' : 'bg-white text-gray-900 border-gray-300'}>
                      <SelectItem value="Choose Branch">Choose Branch</SelectItem>
                      {branches.map((b) =>
                        <SelectItem key={b.id} value={b.id}>
                          {b.name}
                        </SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Select
                    value={semesterFilter}
                    onValueChange={(value) => setSemesterFilter(value)}>

                    <SelectTrigger className={`w-full text-sm sm:text-base h-10 sm:h-11 ${theme === 'dark' ? 'border-border bg-background text-foreground' : 'border-gray-300 bg-white text-gray-900'}`}>
                      <SelectValue placeholder="Choose Semester" />
                    </SelectTrigger>
                    <SelectContent className={theme === 'dark' ? 'bg-background text-foreground border-border' : 'bg-white text-gray-900 border-gray-300'}>
                      <SelectItem value="Choose Semester">Choose Semester</SelectItem>
                      {pageSemesters && pageSemesters.length > 0 ?
                        pageSemesters.map((s) =>
                          <SelectItem key={s.id} value={s.id}>
                            {`Semester ${s.number}`}
                          </SelectItem>
                        ) :

                        ["1", "2", "3", "4", "5", "6", "7", "8"].map((semester) =>
                          <SelectItem key={semester} value={semester}>
                            {semester}
                          </SelectItem>
                        )
                      }
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Select
                    value={selectedSectionFilter}
                    onValueChange={(value) => setSelectedSectionFilter(value)}>

                    <SelectTrigger className={`w-full text-sm sm:text-base h-10 sm:h-11 ${theme === 'dark' ? 'border-border bg-background text-foreground' : 'border-gray-300 bg-white text-gray-900'}`}>
                      <SelectValue placeholder="Choose Section" />
                    </SelectTrigger>
                    <SelectContent className={theme === 'dark' ? 'bg-background text-foreground border-border' : 'bg-white text-gray-900 border-gray-300'}>
                      <SelectItem value="Choose Section">Choose Section</SelectItem>
                      {sections.map((s) =>
                        <SelectItem key={s.id} value={s.id}>
                          {s.name}
                        </SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Search Row */}
              <div className="w-full">
                <Input
                  placeholder="Search materials..."
                  className={`w-full text-sm sm:text-base h-10 sm:h-11 ${theme === 'dark' ? 'bg-background text-foreground border-border placeholder:text-muted-foreground' : 'bg-white text-gray-900 border-gray-300 placeholder:text-gray-500'}`}
                  value={localSearchQuery}
                  onChange={(e) => setLocalSearchQuery(e.target.value)} />
              </div>
            </div>
          </div>
        </div>
        <CardContent className="space-y-6 pt-2">
          {/* Table Area Section */}
          <div className="pt-4 border-t">
            {(!pageSectionsLoaded || !branchIdForHook || semesterFilter === 'Choose Semester' || selectedSectionFilter === 'Choose Section') ? (
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

          <AdminPagination
            pagination={{
              page: currentPage,
              pageSize: 20,
              totalPages: totalPages,
              totalItems: totalCount
            }}
            onPageChange={setCurrentPage}
          />
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
                <Label htmlFor="material-title">Material Title *</Label>
                <Input
                  id="material-title"
                  placeholder="Enter title (e.g. Unit 1 Notes)"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className={theme === 'dark' ? 'bg-background border-border' : 'bg-white border-gray-300'}
                  disabled={uploading} />

              </div>

              <div className="space-y-2">
                <Label>Branch *</Label>
                <Select
                  value={branchId}
                  onValueChange={(value) => setBranchId(value)}
                  disabled={uploading}>

                  <SelectTrigger className={theme === 'dark' ? 'bg-background border-border' : 'bg-white border-gray-300'}>
                    <SelectValue placeholder="Select Branch" />
                  </SelectTrigger>
                  <SelectContent className={theme === 'dark' ? 'bg-card border-border text-foreground' : 'bg-white text-gray-900'}>
                    {branches.map((b) =>
                      <SelectItem key={b.id} value={b.id}>
                        {b.name}
                      </SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Semester *</Label>
                  <Select
                    value={semesterId}
                    onValueChange={(value) => setSemesterId(value)}
                    disabled={uploading || !branchId}>

                    <SelectTrigger className={theme === 'dark' ? 'bg-background border-border' : 'bg-white border-gray-300'}>
                      <SelectValue placeholder="Select Sem" />
                    </SelectTrigger>
                    <SelectContent className={theme === 'dark' ? 'bg-card border-border text-foreground' : 'bg-white text-gray-900'}>
                      {modalSemesters.map((s) =>
                        <SelectItem key={s.id} value={s.id}>
                          Sem {s.number}
                        </SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Section</Label>
                  <Select
                    value={sectionId}
                    onValueChange={(value) => setSectionId(value)}
                    disabled={uploading || !semesterId}>

                    <SelectTrigger className={theme === 'dark' ? 'bg-background border-border' : 'bg-white border-gray-300'}>
                      <SelectValue placeholder="Optional" />
                    </SelectTrigger>
                    <SelectContent className={theme === 'dark' ? 'bg-card border-border text-foreground' : 'bg-white text-gray-900'}>
                      {modalSections.map((s) =>
                        <SelectItem key={s.id} value={s.id}>
                          Sec {s.name}
                        </SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Course / Subject *</Label>
                <Select
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
                  <SelectContent className={theme === 'dark' ? 'bg-card border-border text-foreground' : 'bg-white text-gray-900'}>
                    {modalSubjects.map((s) =>
                      <SelectItem key={s.id} value={s.id}>
                        {s.name} ({s.subject_code})
                      </SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Right Side: Upload Area */}
            <div className="space-y-4">
              <Label>File Upload *</Label>
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
              disabled={uploading || !file || !title || !branchId || !semesterId || !subjectId && !subjectName}>

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