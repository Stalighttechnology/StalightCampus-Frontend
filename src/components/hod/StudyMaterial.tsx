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
import { Download, FileText, UploadCloud, X } from "lucide-react";
import { uploadStudyMaterial, getStudyMaterials, getBranches, manageSections, getSemesters, manageSubjects } from "../../utils/hod_api";
import { useTheme } from "../../context/ThemeContext";
import { SkeletonTable } from "../ui/skeleton";

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
const useStudyMaterials = (branchId: string | null, semesterFilter: string, sectionFilter: string, searchQuery: string, sectionsLoaded: boolean) => {
  const [studyMaterials, setStudyMaterials] = useState<StudyMaterial[]>([]);
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    const fetchMaterials = async () => {
      // Allow fetching even if some filters are "All"
      if (!sectionsLoaded) {
        return;
      }
      setLoading(true);
      try {
        const sem = semesterFilter === 'All Semesters' ? undefined : semesterFilter;
        const sec = sectionFilter === 'All Sections' ? undefined : sectionFilter;
        const resp = await getStudyMaterials(branchId || undefined, sem, sec, searchQuery);
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
            file_url: m.drive_web_view_link || m.file_url,
          }));
          setStudyMaterials(mapped);
        } else {
          setStudyMaterials([]);
        }
      } catch (error) {
        console.error("Error fetching study materials:", error);
        setStudyMaterials([]);
      } finally {
        setLoading(false);
      }
    };
    // Debounce search
    const timer = setTimeout(() => {
      fetchMaterials();
    }, 300);
    return () => clearTimeout(timer);
  }, [branchId, semesterFilter, sectionFilter, searchQuery, sectionsLoaded]);

  const addStudyMaterial = (material: StudyMaterial) => {
    setStudyMaterials((s) => [...s, material]);
  };

  return { studyMaterials, addStudyMaterial, loading };
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
    resetForm,
  };
};

// Row component for each study material
const StudyMaterialRow = ({ material, theme }: { material: StudyMaterial; theme: string }) => (
  <TableRow className={theme === 'dark' ? 'border-border' : 'border-gray-200'}>
    <TableCell className="w-[50px]">
      <FileText className="text-red-500" size={20} />
    </TableCell>
    <TableCell className="font-medium">
      <div className={`${theme === 'dark' ? 'text-blue-400' : 'text-blue-600'} cursor-pointer hover:underline truncate max-w-[150px] sm:max-w-[200px]`}>
        {material.title}
      </div>
    </TableCell>
    <TableCell className="max-w-[150px] truncate">
      {material.subject_name}
    </TableCell>
    <TableCell className="max-w-[100px] truncate">
      {material.subject_code}
    </TableCell>
    <TableCell>
      {material.semester || "N/A"}
    </TableCell>
    <TableCell className="max-w-[120px] truncate">
      {material.uploaded_by}
    </TableCell>
    <TableCell className="text-right">
      <a href={material.file_url} download={material.title + ".pdf"} target="_blank" rel="noopener noreferrer">
        <Download className={`inline-block cursor-pointer ${theme === 'dark' ? 'text-muted-foreground hover:text-foreground' : 'text-gray-500 hover:text-gray-700'}`} size={20} />
      </a>
    </TableCell>
  </TableRow>
);

// Main component
const StudyMaterials = () => {
  const { theme } = useTheme();
  const [selectedBranchFilter, setSelectedBranchFilter] = useState<string>("All Branches");
  const [selectedSectionFilter, setSelectedSectionFilter] = useState<string>("All Sections");
  const [branches, setBranches] = useState<Array<{ id: string; name: string }>>([]);
  const [sections, setSections] = useState<Array<{ id: string; name: string }>>([]);
  const [pageSectionsLoaded, setPageSectionsLoaded] = useState<boolean>(false);
  const [pageSemesters, setPageSemesters] = useState<Array<{ id: string; number: number }>>([]);
  // Modal-specific lists
  const [modalSemesters, setModalSemesters] = useState<Array<{ id: string; number: number }>>([]);
  const [modalSections, setModalSections] = useState<Array<{ id: string; name: string }>>([]);
  const [modalSubjects, setModalSubjects] = useState<Array<{ id: string; name: string; subject_code: string }>>([]);

  // Pass null when 'All Branches' to hook; but hook expects branch id, so use null to represent none
  const [searchQuery, setSearchQuery] = useState("");
  const [semesterFilter, setSemesterFilter] = useState("All Semesters");

  // Pass null when 'All Branches' to hook; but hook expects branch id, so use null to represent none
  const branchIdForHook = selectedBranchFilter === "All Branches" ? null : selectedBranchFilter;
  const { studyMaterials, addStudyMaterial, loading } = useStudyMaterials(branchIdForHook, semesterFilter, selectedSectionFilter, searchQuery, pageSectionsLoaded);
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
    resetForm,
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
        console.error("Failed to load branches", e);
      }
    };
    load();
  }, []);
  // Load semesters for the page and sections when branch/semester filters change
  useEffect(() => {
    const loadPageSemesters = async () => {
      if (!selectedBranchFilter || selectedBranchFilter === "All Branches") {
        setPageSemesters([]);
        setSemesterFilter("All Semesters");
        setSections([]);
        setSelectedSectionFilter("All Sections");
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
        console.error("Failed to load semesters for branch", e);
        setPageSemesters([]);
      }
      setSemesterFilter("All Semesters");
      setSelectedSectionFilter("All Sections");
    };
    loadPageSemesters();
  }, [selectedBranchFilter]);

  useEffect(() => {
    const loadSections = async () => {
      // Only load sections when a branch AND a semester are selected
      setPageSectionsLoaded(false);
      if (!selectedBranchFilter || selectedBranchFilter === "All Branches" || semesterFilter === 'All Semesters') {
        setSections([]);
        setSelectedSectionFilter("All Sections");
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
        console.error("Failed to load sections", e);
        setSections([]);
      }
      setSelectedSectionFilter("All Sections");
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
        console.error("Failed to load semesters for branch (modal)", e);
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
        console.error("Failed to load modal sections", e);
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
        console.error("Failed to load modal subjects", e);
        setModalSubjects([]);
      }
    };
    loadSectionsAndSubjects();
  }, [branchId, semesterId]);

  const handleUpload = async () => {
    console.log('handleUpload invoked', { title, branchId, semesterId, sectionId, subjectId, subjectName, subjectCode, file });
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

    // Validate file size <= 50MB
    const MAX_SIZE = 50 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      alert("File size must not exceed 50MB.");
      return;
    }

    setUploading(true);
    try {
      const response = await uploadStudyMaterial({
        title,
        subject_name: subjectName,
        subject_code: subjectCode,
        semester_id: semesterId,
        branch_id: branchId,
        section_id: sectionId,
        file,
      });

      if (response.success && response.data) {
        const apiMaterial: ApiStudyMaterial = response.data;
        const newMaterial: StudyMaterial = {
          id: apiMaterial.id,
          title: apiMaterial.title,
          subject_name: apiMaterial.subject_name,
          subject_code: apiMaterial.subject_code,
          semester: (apiMaterial.semester_id ? parseInt(apiMaterial.semester_id) || null : (apiMaterial.semester ? parseInt(apiMaterial.semester as any) || null : null)),
          branch: apiMaterial.branch_id || apiMaterial.branch || null,
          uploaded_by: apiMaterial.uploaded_by,
          uploaded_at: apiMaterial.uploaded_at,
          // Prefer Drive web view link when available
          file_url: apiMaterial.drive_web_view_link || apiMaterial.file_url,
        };
        addStudyMaterial(newMaterial);
        resetForm();
        setShowUploadModal(false);
      } else {
        alert(response.message || "Upload failed");
      }
    } catch (error) {
      alert("Error uploading material");
      console.error(error);
    } finally {
      setUploading(false);
    }
  };

  // Since we are doing server-side search/filter, we just use studyMaterials directly
  // unless we want to do additional client-side filtering
  const filteredMaterials = studyMaterials;

  return (
    <div className="w-full mx-auto max-w-none">
      <Card className={`shadow-lg ${theme === 'dark' ? 'bg-card border-border text-foreground' : 'bg-white border-gray-200 text-gray-900'}`}>
        <CardHeader className="pb-4">
          <div className="flex justify-between items-center gap-2">
            <CardTitle className="text-2xl font-semibold leading-none tracking-tight">Study Materials</CardTitle>
            <Button
              onClick={() => setShowUploadModal(true)}
              className={`px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-1 transition-all duration-200 ease-in-out transform hover:scale-105 bg-primary text-white border-primary hover:bg-primary/90 hover:border-primary/90 hover:text-white ${theme === 'dark' ? 'shadow-lg shadow-primary/20' : 'shadow-md'}`}
              disabled={uploading}
            >
              <UploadCloud size={16} />
              Upload
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Filters Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="sm:col-span-2 lg:col-span-1">
              <input
                type="text"
                placeholder="Search by title, course name, course code, semester, or uploaded by..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={`w-full px-3 py-2 rounded outline-none focus:ring-2 border ${theme === 'dark' ? 'bg-background text-foreground border-border focus:ring-primary' : 'bg-white text-gray-900 border-gray-300 focus:ring-blue-500'}`}
              />
            </div>
            <div>
              <Select
                value={selectedBranchFilter}
                onValueChange={(value) => setSelectedBranchFilter(value)}
              >
                <SelectTrigger className={`w-full ${theme === 'dark' ? 'border-border bg-background text-foreground' : 'border-gray-300 bg-white text-gray-900'}`}>
                  <SelectValue placeholder="All Branches" />
                </SelectTrigger>
                <SelectContent className={theme === 'dark' ? 'bg-background text-foreground border-border' : 'bg-white text-gray-900 border-gray-300'}>
                  <SelectItem value="All Branches">All Branches</SelectItem>
                  {branches.map((b) => (
                    <SelectItem key={b.id} value={b.id}>
                      {b.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Select
                value={semesterFilter}
                onValueChange={(value) => setSemesterFilter(value)}
              >
                <SelectTrigger className={`w-full ${theme === 'dark' ? 'border-border bg-background text-foreground' : 'border-gray-300 bg-white text-gray-900'}`}>
                  <SelectValue placeholder="All Semesters" />
                </SelectTrigger>
                <SelectContent className={theme === 'dark' ? 'bg-background text-foreground border-border' : 'bg-white text-gray-900 border-gray-300'}>
                  <SelectItem value="All Semesters">All Semesters</SelectItem>
                  {pageSemesters && pageSemesters.length > 0 ? (
                    pageSemesters.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {`Semester ${s.number}`}
                      </SelectItem>
                    ))
                  ) : (
                    ["1","2","3","4","5","6","7","8"].map((semester) => (
                      <SelectItem key={semester} value={semester}>
                        {semester}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Select
                value={selectedSectionFilter}
                onValueChange={(value) => setSelectedSectionFilter(value)}
              >
                <SelectTrigger className={`w-full ${theme === 'dark' ? 'border-border bg-background text-foreground' : 'border-gray-300 bg-white text-gray-900'}`}>
                  <SelectValue placeholder="All Sections" />
                </SelectTrigger>
                <SelectContent className={theme === 'dark' ? 'bg-background text-foreground border-border' : 'bg-white text-gray-900 border-gray-300'}>
                  <SelectItem value="All Sections">All Sections</SelectItem>
                  {sections.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Table Area */}
          <div className="overflow-x-auto rounded-lg border">
            <Table className="min-w-[700px]">
              <TableHeader>
                <TableRow className={theme === 'dark' ? 'border-border hover:bg-transparent' : 'border-gray-200 hover:bg-transparent'}>
                  <TableHead className="w-[50px]">Type</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead>Course Name</TableHead>
                  <TableHead>Course Code</TableHead>
                  <TableHead>Sem</TableHead>
                  <TableHead>Uploaded By</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="p-4">
                      <SkeletonTable rows={10} cols={7} />
                    </TableCell>
                  </TableRow>
                ) : filteredMaterials.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-10 text-muted-foreground">
                      No study materials found.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredMaterials.map((material) => (
                    <StudyMaterialRow key={material.id} material={material} theme={theme} />
                  ))
                )}
              </TableBody>
            </Table>
          </div>
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
            <DialogTitle className="text-xl font-bold">Upload Study Material</DialogTitle>
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
                  disabled={uploading}
                />
              </div>

              <div className="space-y-2">
                <Label>Branch *</Label>
                <Select
                  value={branchId}
                  onValueChange={(value) => setBranchId(value)}
                  disabled={uploading}
                >
                  <SelectTrigger className={theme === 'dark' ? 'bg-background border-border' : 'bg-white border-gray-300'}>
                    <SelectValue placeholder="Select Branch" />
                  </SelectTrigger>
                  <SelectContent className={theme === 'dark' ? 'bg-card border-border text-foreground' : 'bg-white text-gray-900'}>
                    {branches.map((b) => (
                      <SelectItem key={b.id} value={b.id}>
                        {b.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Semester *</Label>
                  <Select
                    value={semesterId}
                    onValueChange={(value) => setSemesterId(value)}
                    disabled={uploading || !branchId}
                  >
                    <SelectTrigger className={theme === 'dark' ? 'bg-background border-border' : 'bg-white border-gray-300'}>
                      <SelectValue placeholder="Select Sem" />
                    </SelectTrigger>
                    <SelectContent className={theme === 'dark' ? 'bg-card border-border text-foreground' : 'bg-white text-gray-900'}>
                      {modalSemesters.map((s) => (
                        <SelectItem key={s.id} value={s.id}>
                          Sem {s.number}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Section</Label>
                  <Select
                    value={sectionId}
                    onValueChange={(value) => setSectionId(value)}
                    disabled={uploading || !semesterId}
                  >
                    <SelectTrigger className={theme === 'dark' ? 'bg-background border-border' : 'bg-white border-gray-300'}>
                      <SelectValue placeholder="Optional" />
                    </SelectTrigger>
                    <SelectContent className={theme === 'dark' ? 'bg-card border-border text-foreground' : 'bg-white text-gray-900'}>
                      {modalSections.map((s) => (
                        <SelectItem key={s.id} value={s.id}>
                          Sec {s.name}
                        </SelectItem>
                      ))}
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
                  disabled={uploading || !semesterId}
                >
                  <SelectTrigger className={theme === 'dark' ? 'bg-background border-border' : 'bg-white border-gray-300'}>
                    <SelectValue placeholder="Select Course" />
                  </SelectTrigger>
                  <SelectContent className={theme === 'dark' ? 'bg-card border-border text-foreground' : 'bg-white text-gray-900'}>
                    {modalSubjects.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.name} ({s.subject_code})
                      </SelectItem>
                    ))}
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
                  ${dragActive 
                    ? 'border-primary bg-primary/10 scale-[1.02]' 
                    : theme === 'dark' ? 'border-border bg-background/50' : 'border-gray-300 bg-gray-50'
                  }
                  ${file ? 'border-green-500 bg-green-500/5' : ''}
                `}
              >
                <UploadCloud 
                  className={`mx-auto mb-4 ${file ? 'text-green-500' : theme === 'dark' ? 'text-muted-foreground' : 'text-gray-400'}`} 
                  size={48} 
                />
                
                {file ? (
                  <div className="space-y-2">
                    <p className="text-sm font-medium truncate px-4">{file.name}</p>
                    <p className={`text-xs ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}`}>
                      {(file.size / (1024 * 1024)).toFixed(2)} MB
                    </p>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setFile(null)}
                      className="text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                    >
                      <X size={16} className="mr-1" /> Remove
                    </Button>
                  </div>
                ) : (
                  <>
                    <p className="text-sm font-medium mb-1">Drag & drop your file here</p>
                    <p className={`text-xs mb-4 ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}`}>
                      PDF, JPG, PNG or JPEG (Max 50MB)
                    </p>
                    <input
                      type="file"
                      id="study-material-file"
                      className="hidden"
                      onChange={handleFileChange}
                      accept=".pdf,.png,.jpg,.jpeg"
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => document.getElementById('study-material-file')?.click()}
                      className="bg-primary text-white border-primary hover:bg-primary/90 hover:text-white"
                    >
                      Select File
                    </Button>
                  </>
                )}
              </div>

              <div className="pt-2">
                <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">Instructions</p>
                <ul className={`text-[11px] list-disc pl-4 space-y-1 ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}`}>
                  <li>Select the correct Branch and Semester to see available courses.</li>
                  <li>Title should be descriptive (e.g., "Unit 1 - Calculus Notes").</li>
                  <li>Ensure the file is clear and readable.</li>
                  <li>Maximum file size allowed is 50MB.</li>
                </ul>
              </div>
            </div>
          </div>

          <DialogFooter className="mt-4 flex flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              onClick={() => setShowUploadModal(false)}
              disabled={uploading}
              className={theme === 'dark' ? 'border-border' : 'border-gray-300'}
            >
              Cancel
            </Button>
            <Button
              onClick={handleUpload}
              disabled={uploading || !file || !title || !branchId || !semesterId || !subjectId}
              className="bg-primary text-white hover:bg-primary/90 min-w-[120px]"
            >
              {uploading ? (
                <>
                  <span className="animate-spin mr-2">◌</span>
                  Uploading...
                </>
              ) : (
                "Upload Material"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default StudyMaterials;