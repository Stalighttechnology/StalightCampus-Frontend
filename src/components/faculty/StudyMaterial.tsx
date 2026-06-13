import { translateTerminology, getTerm } from "@/utils/institutionConfig";
import React, { useEffect, useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardFooter } from "../ui/card";
import { FileText, Download, UploadCloud, Trash2, Loader2, Search, BookOpen, X, CloudUpload } from "lucide-react";
import { getStudyMaterials, uploadStudyMaterial, getAssignedSubjectsGrouped, getBranches, getSemesters, getSections, AssignedSubject, deleteStudyMaterial } from "../../utils/faculty_api";
import { uploadFileViaBackendProxy, downloadFileViaBackendProxy } from "../../utils/common_api";
import { useTheme } from "../../context/ThemeContext";
import { useAuth } from "../../context/AuthContext";
import { toast } from "react-hot-toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from
  "@/components/ui/select";
import { SkeletonList } from "@/components/ui/skeleton";
import { usePagination, useDebouncedSearch } from "@/hooks/useOptimizations";

import Swal from "sweetalert2";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface StudyMaterial {
  id: number;
  title: string;
  subject_name: string;
  subject_code: string;
  semester: string;
  uploaded_by: string;
  uploaded_by_name?: string;
  uploaded_by_role?: string | null;
  file_url: string;
}

interface Subject {
  id: number;
  name: string;
  code: string;
  branch: string;
  semester: string;
  section: string;
}

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const StudyMaterialRow = ({ material, theme, onDelete }: { material: StudyMaterial; theme: string; onDelete: (id: number) => void; }) => {
  const { user } = useAuth();
  const [deleting, setDeleting] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const expectedUploaderName = user ? `${user.first_name || ''} ${user.last_name || ''}`.trim() : '';
  const isOwner = material.uploaded_by === expectedUploaderName || material.uploaded_by === user?.username;

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
          const resp = await deleteStudyMaterial(String(material.id));
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
    if (!material.file_url || downloading) return;
    setDownloading(true);
    try {
      if (material.file_url.includes('drive.google.com') || material.file_url.includes('docs.google.com')) {
        window.open(material.file_url, '_blank', 'noopener,noreferrer');
      } else {
        await downloadFileViaBackendProxy(material.file_url, material.title);
      }
    } catch (err) {
      toast.error("Failed to download study material");
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
            className={`inline-flex items-center justify-center p-3 rounded-2xl transition-all duration-200 ${theme === 'dark' ? 'bg-primary/10 text-primary hover:bg-primary/20' : 'bg-primary/5 text-primary hover:bg-primary/10'} ${downloading ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            {downloading ? <Loader2 className="animate-spin" size={22} /> : <Download size={22} />}
          </button>
          {isOwner && (
            <button
              onClick={handleDelete}
              disabled={deleting}
              className={`inline-flex items-center justify-center p-3 rounded-2xl transition-all duration-200 ${theme === 'dark' ? 'bg-red-500/10 text-red-500 hover:bg-red-500/20' : 'bg-red-50 text-red-600 hover:bg-red-100'}`}
            >
              {deleting ? <Loader2 className="animate-spin" size={22} /> : <Trash2 size={22} />}
            </button>
          )}
        </div>
      </TableCell>
    </TableRow>
  );
};


const StudyMaterialsFaculty = React.forwardRef<HTMLDivElement, any>((props, ref) => {
  const { theme } = useTheme();
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [grouped, setGrouped] = useState<AssignedSubject[]>([]);
  const [selectedBranch, setSelectedBranch] = useState<string>("");
  const [selectedSemester, setSelectedSemester] = useState<string>("");
  const [selectedSection, setSelectedSection] = useState<string>("");
  const [materials, setMaterials] = useState<StudyMaterial[]>([]);
  const [uploading, setUploading] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadSubject, setUploadSubject] = useState<string>("");
  const [uploadBranch, setUploadBranch] = useState<string>("");
  const [uploadSemester, setUploadSemester] = useState<string>("");
  const [uploadSection, setUploadSection] = useState<string>("");
  const [uploadTitle, setUploadTitle] = useState<string>("");
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);

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
      setUploadFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setUploadFile(e.target.files[0]);
    }
  };

  const resetForm = () => {
    setUploadTitle("");
    setUploadFile(null);
    setUploadSubject("");
    setUploadBranch("");
    setUploadSemester("");
    setUploadSection("");
    setDragActive(false);
  };
  const [branches, setBranches] = useState<{ id: string; name: string; }[]>([]);
  const [semesters, setSemesters] = useState<{ id: string; number: number; }[]>([]);
  const [sections, setSections] = useState<{ id: string; name: string; }[]>([]);
  const [isSemesterOpen, setIsSemesterOpen] = useState(false);
  const [isSectionOpen, setIsSectionOpen] = useState(false);
  const [hasSearched, setHasSearched] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);

  const { value: search, debouncedValue: debouncedSearch, setValue: setSearch } = useDebouncedSearch('', 500);

  const pagination = usePagination({
    queryKey: ['facultyStudyMaterials', selectedBranch, selectedSemester, selectedSection, debouncedSearch],
    pageSize: 20
  });

  useEffect(() => {
    const loadBranches = async () => {
      const resp = await getBranches();
      if (resp && resp.success) {
        setBranches(resp.data || []);
      }
    };
    loadBranches();
  }, []);

  useEffect(() => {
    if (showUploadModal) {
      const loadAssignments = async () => {
        const resp = await getAssignedSubjectsGrouped();
        if (resp && resp.success) {
          setSubjects(resp.data || []);
          setGrouped(resp.grouped || []);
        }
      };
      loadAssignments();
    }
  }, [showUploadModal]);

  useEffect(() => {
    if (selectedBranch !== "") {
      const loadSemesters = async () => {
        const resp = await getSemesters(selectedBranch);
        if (resp && resp.success) {
          setSemesters(resp.data || []);
        } else {
          setSemesters([]);
        }
        setSelectedSemester("");
        setSections([]);
        setSelectedSection("");
      };
      loadSemesters();
    } else {
      setSemesters([]);
      setSelectedSemester("");
      setSections([]);
      setSelectedSection("");
    }
  }, [selectedBranch]);

  useEffect(() => {
    if (selectedBranch !== "" && selectedSemester !== "") {
      const loadSections = async () => {
        const resp = await getSections(selectedBranch, selectedSemester);
        if (resp && resp.success) {
          setSections(resp.data || []);
        } else {
          setSections([]);
        }
        setSelectedSection("");
      };
      loadSections();
    } else {
      setSections([]);
      setSelectedSection("");
    }
  }, [selectedBranch, selectedSemester]);

  const loadMaterials = async () => {
    setLoading(true);
    const resp = await getStudyMaterials(
      selectedBranch === '' ? undefined : selectedBranch,
      selectedSemester === '' ? undefined : selectedSemester,
      selectedSection === '' ? undefined : selectedSection,
      debouncedSearch || undefined,
      pagination.page,
      pagination.pageSize
    );
    if (resp && resp.success) {
      const dataItems = resp.data?.results || resp.data || [];
      setMaterials(dataItems);
      pagination.updatePagination(resp);
    } else {
      setMaterials([]);
    }
    setHasSearched(true);
    setLoading(false);
  };

  useEffect(() => {
    if (selectedBranch !== "" && selectedSemester !== "" && selectedSection !== "") {
      loadMaterials();
    } else {
      setMaterials([]);
      setHasSearched(false);
    }
  }, [selectedBranch, selectedSemester, selectedSection, debouncedSearch, pagination.page, pagination.pageSize]);

  return (
    <div ref={ref} className={`w-full ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`} {...props}>
      <Card className={`${theme === 'dark' ? 'bg-card border-border' : 'bg-white border-gray-200'}`}>
        <CardHeader id="study-materials-header" className="p-3 sm:p-4 border-b">
          <div className="flex flex-row justify-between items-center gap-2 sm:gap-3">
            <div>
              <h1 className="text-lg sm:text-xl md:text-2xl font-semibold text-gray-900">Study Materials</h1>
              <p className={`text-xs sm:text-sm mt-1 ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-600'}`}>
                View and upload course-related study materials for your assigned subjects.
              </p>
            </div>
            <button onClick={() => setShowUploadModal(true)} className={`px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold flex items-center gap-1 bg-primary text-white hover:bg-primary/90 whitespace-nowrap`}>
              <UploadCloud size={16} /> Upload
            </button>
          </div>
        </CardHeader>
        <CardContent className="p-3 sm:p-4 lg:p-6 space-y-6">
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2 sm:gap-3">
              <Select value={selectedBranch} onValueChange={(value) => {
                setSelectedBranch(value);
                if (value !== "") {
                  setTimeout(() => setIsSemesterOpen(true), 150);
                }
              }}>
                <SelectTrigger className={`text-sm sm:text-base h-10 sm:h-11 ${theme === 'dark' ? 'border-border bg-background text-foreground' : 'border-gray-300 bg-white text-gray-900'}`}>
                  <SelectValue placeholder={translateTerminology("Choose Branch")} />
                </SelectTrigger>
                <SelectContent className="max-h-[200px]">
                  {branches.length > 0 ? (
                    branches.map((b) =>
                      <SelectItem key={b.id} value={b.id.toString()}>{b.name}</SelectItem>
                    )
                  ) : (
                    <div className="p-2 text-sm text-center text-muted-foreground">
                      No branch assigned
                    </div>
                  )}
                </SelectContent>
              </Select>

              <Select
                value={selectedSemester}
                onValueChange={(value) => {
                  setSelectedSemester(value);
                  if (value !== "") {
                    setTimeout(() => setIsSectionOpen(true), 150);
                  }
                }}
                disabled={selectedBranch === "" || semesters.length === 0}
                open={isSemesterOpen}
                onOpenChange={setIsSemesterOpen}>

                <SelectTrigger className={`text-sm sm:text-base h-10 sm:h-11 ${selectedBranch === "" || semesters.length === 0 ? 'opacity-50 cursor-not-allowed' : ''} ${theme === 'dark' ? 'border-border bg-background text-foreground' : 'border-gray-300 bg-white text-gray-900'}`} disabled={selectedBranch === "" || semesters.length === 0}>
                  <SelectValue placeholder={translateTerminology("Choose Semester")} />
                </SelectTrigger>
                <SelectContent className="max-h-[200px]">
                  {semesters.length > 0 ? (
                    semesters.map((s) =>
                      <SelectItem key={s.id} value={s.id.toString()}>Semester {s.number}</SelectItem>
                    )
                  ) : (
                    <div className="p-2 text-sm text-center text-muted-foreground">
                      No semester
                    </div>
                  )}
                </SelectContent>
              </Select>

              <Select
                value={selectedSection}
                onValueChange={(value) => setSelectedSection(value)}
                disabled={selectedSemester === "" || sections.length === 0}
                open={isSectionOpen}
                onOpenChange={setIsSectionOpen}>

                <SelectTrigger className={`text-sm sm:text-base h-10 sm:h-11 ${selectedSemester === "" || sections.length === 0 ? 'opacity-50 cursor-not-allowed' : ''} ${theme === 'dark' ? 'border-border bg-background text-foreground' : 'border-gray-300 bg-white text-gray-900'}`} disabled={selectedSemester === "" || sections.length === 0}>
                  <SelectValue placeholder="Choose Section" />
                </SelectTrigger>
                <SelectContent className="max-h-[200px]">
                  {sections.length > 0 ? (
                    sections.map((sec) =>
                      <SelectItem key={sec.id} value={sec.id.toString()}>{sec.name}</SelectItem>
                    )
                  ) : (
                    <div className="p-2 text-sm text-center text-muted-foreground">
                      No section
                    </div>
                  )}
                </SelectContent>
              </Select>

              <div className="relative">
                <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-400'}`} />
                <input
                  type="text"
                  placeholder="Search materials..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className={`w-full pl-10 pr-12 py-2 text-sm sm:text-base h-10 sm:h-11 border rounded transition-all outline-none focus:ring-2 focus:ring-primary/20 ${theme === 'dark' ?
                    'border-border bg-background text-foreground focus:border-primary' :
                    'border-gray-200 bg-white text-gray-900 focus:border-primary'}`
                  } />
                {search && (
                  <button
                    onClick={() => setSearch("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-primary hover:text-primary/80 transition-colors"
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="pt-4 border-t">
            {!hasSearched ? (
              <div className={`flex flex-col items-center justify-center py-16 px-6 text-center rounded-3xl border-2 border-dashed shadow-sm ${theme === 'dark' ? 'bg-muted/10 border-border/60' : 'bg-gray-50 border-gray-200/60'}`}>
                <div className={`w-24 h-24 rounded-3xl flex items-center justify-center mb-8 shadow-inner animate-pulse ${theme === 'dark' ? 'bg-primary/20 text-primary' : 'bg-primary/10 text-primary'}`}>
                  <Search className="w-12 h-12" />
                </div>
                <h3 className={`text-2xl md:text-2xl font-semibold mb-4 tracking-tight ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>
                  Select Filters to View Materials
                </h3>
                <p className={`text-base md:text-md max-w-md mx-auto leading-relaxed ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}`}>
                  Please select a branch, semester, and section to view the uploaded study materials.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto custom-scrollbar rounded-2xl border border-border">
                <Table>
                  <TableHeader className={theme === 'dark' ? 'bg-muted/30' : 'bg-slate-50/50'}>
                    <TableRow className="border-none hover:bg-transparent h-14">
                      <TableHead className="w-[100px] px-6 py-4 text-base md:text-md font-semibold text-slate-800">Type</TableHead>
                      <TableHead className="px-6 py-4 text-base md:text-md font-semibold text-slate-800">Title</TableHead>
                      <TableHead className="px-6 py-4 text-base md:text-md font-semibold text-slate-800">Course</TableHead>
                      <TableHead className="hidden md:table-cell px-6 py-4 text-base md:text-md font-semibold text-slate-800">{translateTerminology("Semester")}</TableHead>
                      <TableHead className="hidden lg:table-cell px-6 py-4 text-base md:text-md font-semibold text-slate-800">Uploaded By</TableHead>
                      <TableHead className="text-right px-6 py-4 text-base md:text-md font-semibold text-slate-800">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      <TableRow>
                        <TableCell colSpan={6} className="p-4 text-center">
                          <SkeletonList items={5} />
                        </TableCell>
                      </TableRow>
                    ) : materials.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="p-8">
                          <div className={`flex flex-col items-center justify-center py-16 px-6 text-center rounded-3xl border-2 border-dashed shadow-sm ${theme === 'dark' ? 'bg-muted/10 border-border/60' : 'bg-gray-50 border-gray-200/60'}`}>
                            <div className={`w-24 h-24 rounded-3xl flex items-center justify-center mb-8 shadow-inner ${theme === 'dark' ? 'bg-primary/20 text-primary' : 'bg-primary/10 text-primary'}`}>
                              <BookOpen className="w-12 h-12" />
                            </div>
                            <h3 className={`text-2xl md:text-3xl font-semibold mb-4 tracking-tight ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>
                              No Materials Found
                            </h3>
                            <p className={`text-base md:text-lg max-w-md mx-auto leading-relaxed ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}`}>
                              {search ?
                                `We couldn't find any materials matching "${search}". Please try a different search term or criteria.` :
                                "No study materials have been uploaded for the selected filters yet."}
                            </p>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : (
                      materials.map((m: StudyMaterial) => (
                        <StudyMaterialRow
                          key={m.id}
                          material={m}
                          theme={theme}
                          onDelete={(id) => setMaterials((prev) => prev.filter((item) => item.id !== id))}
                        />
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>

        </CardContent>

        {pagination?.paginationState && pagination.paginationState.totalItems > 1 && (
          <CardFooter className="flex flex-col sm:flex-row justify-between items-center gap-4 text-sm text-muted-foreground px-6 py-4 border-t border-border mt-auto">
            <div>
              Showing {Math.min((pagination.paginationState.page - 1) * pagination.paginationState.pageSize + 1, pagination.paginationState.totalItems)} to {Math.min(pagination.paginationState.page * pagination.paginationState.pageSize, pagination.paginationState.totalItems)} of {pagination.paginationState.totalItems} records
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => pagination.goToPage(Math.max(1, pagination.paginationState.page - 1))}
                disabled={pagination.paginationState.page <= 1}
                className="bg-primary hover:bg-primary/90 text-white border-primary h-9 px-4 transition-all"
              >
                Previous
              </Button>

              <div className="flex items-center justify-center min-w-[2rem]">
                <span className={`text-sm font-semibold ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>
                  {pagination.paginationState.page}
                </span>
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={() => pagination.goToPage(Math.min(pagination.paginationState.totalPages, pagination.paginationState.page + 1))}
                disabled={pagination.paginationState.page >= pagination.paginationState.totalPages}
                className="bg-primary hover:bg-primary/90 text-white border-primary h-9 px-4 transition-all"
              >
                Next
              </Button>
            </div>
          </CardFooter>
        )}
      </Card>

      <Dialog open={showUploadModal} onOpenChange={(open) => {
        if (!uploading) {
          setShowUploadModal(open);
          if (!open) resetForm();
        }
      }}>
        <DialogContent className={`w-[92%] sm:max-w-2xl max-h-[90vh] overflow-y-auto custom-scrollbar rounded-2xl ${theme === 'dark' ? 'bg-card text-foreground border-border' : 'bg-white text-gray-900 border-gray-200'}`}>
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold">Upload Study Material</DialogTitle>
          </DialogHeader>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-4">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="upload-title">Material Title *</Label>
                <Input
                  id="upload-title"
                  placeholder="Enter title (e.g. Unit 1 Notes)"
                  value={uploadTitle}
                  onChange={(e) => setUploadTitle(e.target.value)}
                  className={theme === 'dark' ? 'bg-background border-border' : 'bg-white border-gray-300'}
                  disabled={uploading}
                />
              </div>

              <div className="space-y-2">
                <Label>Subject / Course *</Label>
                <Select
                  value={uploadSubject}
                  onValueChange={(subjId) => {
                    setUploadSubject(subjId);
                    const subj = grouped.find((g) => String(g.subject_id) === subjId);
                    if (subj && subj.sections.length > 0) {
                      const s = subj.sections[0];
                      setUploadBranch(String(s.branch_id));
                      setUploadSemester(String(s.semester_id));
                      setUploadSection(String(s.section_id));
                    }
                  }}
                  disabled={uploading || grouped.length === 0}>
                  <SelectTrigger className={theme === 'dark' ? 'bg-background border-border text-foreground' : 'bg-white border-gray-300 text-gray-900'}>
                    <SelectValue placeholder={grouped.length === 0 ? "No subjects assigned" : "Select Subject"} />
                  </SelectTrigger>
                  <SelectContent className={theme === 'dark' ? 'bg-card border-border text-foreground' : 'bg-white text-gray-900'}>
                    {grouped.length > 0 ? (
                      grouped.map((g) => (
                        <SelectItem key={g.subject_id} value={String(g.subject_id)}>
                          {g.subject_name} ({g.subject_code})
                        </SelectItem>
                      ))
                    ) : (
                      <SelectItem value="none" disabled className="text-xs sm:text-sm text-muted-foreground text-center">
                        No subjects assigned
                      </SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>

              {uploadSubject && (
                <div className="space-y-3 p-3 rounded-xl border border-dashed animate-in fade-in slide-in-from-top-1 duration-300 bg-primary/5 border-primary/20">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">{translateTerminology("Branch")}:</span>
                    <span className="font-medium text-primary">{grouped.find((g) => String(g.subject_id) === uploadSubject)?.sections.find((s) => String(s.branch_id) === uploadBranch)?.branch || 'N/A'}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">{translateTerminology("Semester")}:</span>
                    <span className="font-medium text-primary">{uploadSemester ? `Sem ${grouped.find((g) => String(g.subject_id) === uploadSubject)?.sections.find((s) => String(s.semester_id) === uploadSemester)?.semester}` : 'N/A'}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Section:</span>
                    <span className="font-medium text-primary">{uploadSection ? grouped.find((g) => String(g.subject_id) === uploadSubject)?.sections.find((s) => String(s.section_id) === uploadSection)?.section : 'N/A'}</span>
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-4">
              <Label>File Upload *</Label>
              <div
                onDragEnter={handleDrag}
                onDragOver={handleDrag}
                onDragLeave={handleDrag}
                onDrop={handleDrop}
                className={`
                  relative border-2 border-dashed rounded-xl p-8 text-center transition-all duration-200 h-[200px] flex flex-col items-center justify-center
                  ${dragActive ?
                    'border-primary bg-primary/10 scale-[1.02]' :
                    theme === 'dark' ? 'border-border bg-background/50' : 'border-gray-300 bg-gray-50'}
                  ${uploadFile ? 'border-green-500 bg-green-500/5' : ''}
                `}
              >
                <CloudUpload
                  className={`mx-auto mb-4 ${uploadFile ? 'text-green-500' : theme === 'dark' ? 'text-muted-foreground' : 'text-gray-400'}`}
                  size={48}
                />

                {uploadFile ? (
                  <div className="space-y-2 w-full">
                    <p className="text-sm font-medium truncate px-4">{uploadFile.name}</p>
                    <p className={`text-xs ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}`}>
                      {(uploadFile.size / (1024 * 1024)).toFixed(2)} MB
                    </p>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setUploadFile(null)}
                      className="text-red-500 hover:text-red-700 hover:bg-red-50 h-8"
                    >
                      <X size={14} className="mr-1" /> Remove
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Click or drag to upload</p>
                    <p className={`text-xs ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}`}>
                      PDF, DOCX, etc. (Max 20MB)
                    </p>
                    <input
                      type="file"
                      className="hidden"
                      id="file-upload"
                      accept=".pdf,.doc,.docx"
                      onChange={handleFileChange}
                      disabled={uploading}
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-2"
                      onClick={() => document.getElementById('file-upload')?.click()}
                    >
                      Browse Files
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0 mt-4">
            <Button
              variant="outline"
              onClick={() => {
                setShowUploadModal(false);
                resetForm();
              }}
              disabled={uploading}
              className="rounded-xl px-6 h-11"
            >
              Cancel
            </Button>
            <Button
              onClick={async () => {
                if (!uploadFile || !uploadTitle || !uploadSubject) {
                  toast.error("Please fill all mandatory fields");
                  return;
                }
                
                // Validate file size <= 20MB
                const MAX_SIZE = 20 * 1024 * 1024;
                if (uploadFile.size > MAX_SIZE) {
                  toast.error("File size must not exceed 20MB.");
                  return;
                }
                
                // Validate file type
                const allowedTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
                if (!allowedTypes.includes(uploadFile.type)) {
                  toast.error("Only PDF, DOC, and DOCX files are allowed.");
                  return;
                }

                setUploading(true);
                try {
                  const finalFileUrl = await uploadFileViaBackendProxy(uploadFile, 'study_materials');
                  if (!finalFileUrl) {
                    throw new Error("Failed to upload file to storage via proxy");
                  }

                  const subj = grouped.find((g) => String(g.subject_id) === uploadSubject);
                  const resp = await uploadStudyMaterial({
                    title: uploadTitle,
                    subject_id: uploadSubject,
                    subject_name: subj ? subj.subject_name : '',
                    subject_code: subj ? subj.subject_code : '',
                    semester_id: uploadSemester,
                    branch_id: uploadBranch,
                    section_id: uploadSection,
                    file_url: finalFileUrl
                  });

                  if (resp && resp.success) {
                    Swal.fire({
                      title: "Upload Successful!",
                      text: `"${uploadTitle}" has been added to the course materials.`,
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
                    setShowUploadModal(false);
                    resetForm();
                  } else {
                    toast.error(resp?.message || 'Upload failed');
                  }
                } catch (error: any) {
                  toast.error(error.message || 'Upload error');
                } finally {
                  setUploading(false);
                }
              }}
              disabled={uploading}
              className="bg-primary text-white hover:bg-primary/90 rounded-xl px-8 h-11 font-bold shadow-lg shadow-primary/20 transition-all active:scale-95"
            >
              {uploading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Uploading...
                </>
              ) : (
                'Confirm Upload'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>);

});

export default StudyMaterialsFaculty;