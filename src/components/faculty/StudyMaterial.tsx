import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader } from "../ui/card";
import { Download, FileText, UploadCloud, X } from "lucide-react";
import { getStudyMaterials, uploadStudyMaterial, getAssignedSubjectsGrouped, getBranches, getSemesters, getSections, AssignedSubject } from "../../utils/faculty_api";
import { useTheme } from "../../context/ThemeContext";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SkeletonList } from "@/components/ui/skeleton";

interface StudyMaterial {
  id: number;
  title: string;
  subject_name: string;
  subject_code: string;
  semester: string;
  uploaded_by: string;
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

interface AssignedSection {
  section: string;
  section_id: string;
  semester: number;
  semester_id: string;
  branch: string;
  branch_id: string;
}

const StudyMaterialRow = ({ material, theme }: { material: StudyMaterial; theme: string }) => (
  <div className={`grid md:grid-cols-6 gap-2 md:gap-3 items-start md:items-center text-xs sm:text-sm py-2 md:py-3 border-b md:border-b ${theme === 'dark' ? 'border-border' : 'border-gray-200'} last:border-b-0`}>
    <div className="hidden md:flex items-center">
      <FileText className="text-red-500" size={18} />
    </div>
    <div className="flex items-start gap-2 md:flex-col md:gap-0">
      <FileText className="text-red-500 flex-shrink-0 md:hidden" size={16} />
      <div>
        <div className="text-xs text-gray-500 md:hidden font-semibold">Title</div>
        <div className={`${theme === 'dark' ? 'text-blue-400' : 'text-blue-600'} font-medium cursor-pointer hover:underline break-words`}>
          {material.title}
        </div>
      </div>
    </div>
    <div className="flex items-start gap-2 md:flex-col md:gap-0">
      <div className="text-xs text-gray-500 md:hidden font-semibold min-w-fit">Course</div>
      <div className="flex flex-col md:gap-0.5">
        <div className={`truncate`}>{material.subject_name}</div>
        <div className="hidden md:block text-gray-500 text-xs">({material.subject_code})</div>
      </div>
    </div>
    <div className="flex items-start gap-2 md:flex-col md:gap-0">
      <div className="text-xs text-gray-500 md:hidden font-semibold">Semester</div>
      <div className="">{material.semester || "N/A"}</div>
    </div>
    <div className="flex items-start gap-2 md:flex-col md:gap-0">
      <div className="text-xs text-gray-500 md:hidden font-semibold">Uploaded</div>
      <div className="">{material.uploaded_by}</div>
    </div>
    <div className="flex items-center justify-end md:justify-center">
      <a href={material.file_url} download={material.title + ".pdf"} target="_blank" rel="noopener noreferrer">
        <Download className={`cursor-pointer text-gray-500 hover:text-gray-700 flex-shrink-0`} size={18} />
      </a>
    </div>
  </div>
);

const StudyMaterialsFaculty = () => {
  const { theme } = useTheme();
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [grouped, setGrouped] = useState<AssignedSubject[]>([]);
  const [selectedSubject, setSelectedSubject] = useState<string>("");
  const [selectedBranch, setSelectedBranch] = useState<string>("All Branches");
  const [selectedSemester, setSelectedSemester] = useState<string>("All Semesters");
  const [selectedSection, setSelectedSection] = useState<string>("All Sections");
  const [materials, setMaterials] = useState<StudyMaterial[]>([]);
  const [uploading, setUploading] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadSubject, setUploadSubject] = useState<string>("");
  const [uploadBranch, setUploadBranch] = useState<string>("");
  const [uploadSemester, setUploadSemester] = useState<string>("");
  const [uploadSection, setUploadSection] = useState<string>("");
  const [uploadTitle, setUploadTitle] = useState<string>("");
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [branches, setBranches] = useState<{ id: string; name: string }[]>([]);
  const [semesters, setSemesters] = useState<{ id: string; number: number }[]>([]);
  const [sections, setSections] = useState<{ id: string; name: string }[]>([]);
  const [hasSearched, setHasSearched] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    const loadBranches = async () => {
      const resp = await getBranches();
      if (resp && resp.success) {
        setBranches(resp.data || []);
      }
    };
    loadBranches();
  }, []);

  // Load assigned subjects only when upload modal opens
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
    if (selectedBranch !== "All Branches") {
      const loadSemesters = async () => {
        const resp = await getSemesters(selectedBranch);
        if (resp && resp.success) {
          setSemesters(resp.data || []);
        } else {
          setSemesters([]);
        }
        setSelectedSemester("All Semesters");
        setSections([]);
        setSelectedSection("All Sections");
      };
      loadSemesters();
    } else {
      setSemesters([]);
      setSelectedSemester("All Semesters");
      setSections([]);
      setSelectedSection("All Sections");
    }
  }, [selectedBranch]);

  useEffect(() => {
    if (selectedBranch !== "All Branches" && selectedSemester !== "All Semesters") {
      const loadSections = async () => {
        const resp = await getSections(selectedBranch, selectedSemester);
        if (resp && resp.success) {
          setSections(resp.data || []);
        } else {
          setSections([]);
        }
        setSelectedSection("All Sections");
      };
      loadSections();
    } else {
      setSections([]);
      setSelectedSection("All Sections");
    }
  }, [selectedBranch, selectedSemester]);

  const loadMaterials = async () => {
    setLoading(true);
    const resp = await getStudyMaterials(selectedBranch === 'All Branches' ? undefined : selectedBranch, selectedSemester === 'All Semesters' ? undefined : selectedSemester, selectedSection === 'All Sections' ? undefined : selectedSection, searchQuery || undefined);
    if (resp && resp.success && Array.isArray(resp.data?.results || resp.data)) {
      setMaterials(resp.data.results || resp.data || []);
    } else if (resp && resp.success && Array.isArray(resp.data)) {
      setMaterials(resp.data);
    } else {
      setMaterials([]);
    }
    setHasSearched(true);
    setLoading(false);
  };

  // Auto-load materials when all filters are selected
  useEffect(() => {
    if (selectedBranch !== "All Branches" && selectedSemester !== "All Semesters" && selectedSection !== "All Sections") {
      loadMaterials();
    }
  }, [selectedBranch, selectedSemester, selectedSection, searchQuery]);

  return (
    <div className={`w-full ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>
      <Card className={`${theme === 'dark' ? 'bg-card border-border' : 'bg-white border-gray-200'}`}>
        <CardHeader className="p-3 sm:p-4 lg:p-6 border-b">
          <div className="flex flex-row justify-between items-center gap-2 sm:gap-3">
            <div>
              <h1 className="text-lg sm:text-xl md:text-2xl font-semibold text-gray-900">Study Materials</h1>
              <p className={`text-xs sm:text-sm mt-1 ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-600'}`}>
                View and upload course-related study materials for your assigned subjects.
              </p>
            </div>
            <button onClick={() => setShowUploadModal(true)} className={`px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-bold flex items-center gap-1 bg-primary text-white hover:bg-primary/90 whitespace-nowrap`}>
              <UploadCloud size={16} /> Upload
            </button>
          </div>
        </CardHeader>
        <CardContent className="p-3 sm:p-4 lg:p-6 space-y-6">
          {/* Filters & Search */}
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2 sm:gap-3">
              <Select value={selectedBranch} onValueChange={(value) => setSelectedBranch(value)}>
                <SelectTrigger className={theme === 'dark' ? 'border-border bg-background text-foreground' : 'border-gray-300 bg-white text-gray-900'}>
                  <SelectValue placeholder="All Branches" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="All Branches">All Branches</SelectItem>
                  {branches.map((b) => (
                    <SelectItem key={b.id} value={b.id.toString()}>{b.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select
                value={selectedSemester}
                onValueChange={(value) => setSelectedSemester(value)}
                disabled={semesters.length === 0}
              >
                <SelectTrigger className={`${semesters.length === 0 ? 'opacity-50 cursor-not-allowed' : ''} ${theme === 'dark' ? 'border-border bg-background text-foreground' : 'border-gray-300 bg-white text-gray-900'}`}>
                  <SelectValue placeholder="All Semesters" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="All Semesters">All Semesters</SelectItem>
                  {semesters.map((s) => (
                    <SelectItem key={s.id} value={s.id.toString()}>Semester {s.number}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select
                value={selectedSection}
                onValueChange={(value) => setSelectedSection(value)}
                disabled={sections.length === 0}
              >
                <SelectTrigger className={`${sections.length === 0 ? 'opacity-50 cursor-not-allowed' : ''} ${theme === 'dark' ? 'border-border bg-background text-foreground' : 'border-gray-300 bg-white text-gray-900'}`}>
                  <SelectValue placeholder="All Sections" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="All Sections">All Sections</SelectItem>
                  {sections.map((sec) => (
                    <SelectItem key={sec.id} value={sec.id.toString()}>{sec.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <input
              type="text"
              placeholder="Search by title, course name, course code, semester, or uploaded by..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={`w-full px-2 sm:px-3 py-2 border rounded text-xs sm:text-sm ${theme === 'dark' ? 'border-border bg-background text-foreground' : 'border-gray-300 bg-white text-gray-900'}`}
            />
          </div>

          {/* Materials Table Section */}
          <div className="pt-4 border-t">
            <div className="hidden md:grid grid-cols-6 font-semibold text-xs sm:text-sm gap-2 mb-4 px-2">
              <div>Type</div>
              <div>Title</div>
              <div>Course</div>
              <div>Semester</div>
              <div>Uploaded By</div>
              <div>Action</div>
            </div>
            <div className="space-y-1">
              {loading ? (
                <div className="py-4">
                  <SkeletonList items={5} />
                </div>
              ) : !hasSearched ? (
                <div className="text-center py-10 text-xs sm:text-sm text-gray-500 italic">Select branch, semester, and section to view study materials.</div>
              ) : materials.length === 0 ? (
                <div className="text-center py-10 text-xs sm:text-sm text-gray-500">No study materials found for the selected criteria.</div>
              ) : (
                materials.map((m: StudyMaterial) => <StudyMaterialRow key={m.id} material={m} theme={theme} />)
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {showUploadModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 sm:p-4">
          <div className={`p-4 sm:p-6 rounded-lg shadow-lg max-w-[95vw] sm:max-w-[90vw] md:max-w-[85vw] lg:max-w-md w-full ${theme === 'dark' ? 'bg-card text-foreground' : 'bg-white text-gray-900'}`}>
            <div className="flex justify-between items-center mb-4 sm:mb-6">
              <h2 className="text-base sm:text-lg font-semibold">Upload Study Material</h2>
              <button onClick={() => setShowUploadModal(false)} className="text-gray-500 hover:text-gray-700">
                <X size={20} />
              </button>
            </div>
            <div className="space-y-3 sm:space-y-4">
              <Select
                value={uploadSubject}
                onValueChange={(subjId) => {
                  setUploadSubject(subjId);
                  const subj = grouped.find(g => String(g.subject_id) === subjId);
                  if (subj && subj.sections.length > 0) {
                    const s = subj.sections[0];
                    setUploadBranch(String(s.branch_id));
                    setUploadSemester(String(s.semester_id));
                    setUploadSection(String(s.section_id));
                  }
                }}
              >
                <SelectTrigger className={theme === 'dark' ? 'border-border bg-background text-foreground' : 'border-gray-300 bg-white text-gray-900'}>
                  <SelectValue placeholder="Select Subject" />
                </SelectTrigger>
                <SelectContent>
                  {grouped.map(g => (
                    <SelectItem key={g.subject_id} value={String(g.subject_id)}>{g.subject_name} ({g.subject_code})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className={`px-2 sm:px-3 py-2 border rounded text-xs sm:text-sm ${theme === 'dark' ? 'border-border bg-background text-foreground' : 'border-gray-300 bg-white text-gray-900'}`}>
                Branch: {uploadBranch ? grouped.find(g => String(g.subject_id) === uploadSubject)?.sections.find(s => String(s.branch_id) === uploadBranch)?.branch : 'N/A'}
              </div>
              <div className={`px-2 sm:px-3 py-2 border rounded text-xs sm:text-sm ${theme === 'dark' ? 'border-border bg-background text-foreground' : 'border-gray-300 bg-white text-gray-900'}`}>
                Semester: {uploadSemester ? `Semester ${grouped.find(g => String(g.subject_id) === uploadSubject)?.sections.find(s => String(s.semester_id) === uploadSemester)?.semester}` : 'N/A'}
              </div>
              <div className={`px-2 sm:px-3 py-2 border rounded text-xs sm:text-sm ${theme === 'dark' ? 'border-border bg-background text-foreground' : 'border-gray-300 bg-white text-gray-900'}`}>
                Section: {uploadSection ? grouped.find(g => String(g.subject_id) === uploadSubject)?.sections.find(s => String(s.section_id) === uploadSection)?.section : 'N/A'}
              </div>
              <input
                type="text"
                placeholder="Title"
                value={uploadTitle}
                onChange={(e) => setUploadTitle(e.target.value)}
                className={`w-full px-2 sm:px-3 py-2 border rounded text-xs sm:text-sm ${theme === 'dark' ? 'border-border bg-background text-foreground' : 'border-gray-300 bg-white text-gray-900'}`}
              />
              <input
                type="file"
                accept=".pdf,.doc,.docx,.ppt,.pptx"
                onChange={(e) => setUploadFile(e.target.files ? e.target.files[0] : null)}
                className={`w-full px-2 sm:px-3 py-2 border rounded text-xs sm:text-sm ${theme === 'dark' ? 'border-border bg-background text-foreground' : 'border-gray-300 bg-white text-gray-900'}`}
              />
              <button
                onClick={async () => {
                  if (!uploadFile || !uploadTitle || !uploadSubject) {
                    alert("Please fill all fields");
                    return;
                  }
                  setUploading(true);
                  try {
                    const subj = grouped.find(g => String(g.subject_id) === uploadSubject);
                    const resp = await uploadStudyMaterial({
                      title: uploadTitle,
                      subject_id: uploadSubject,
                      subject_name: subj ? subj.subject_name : '',
                      subject_code: subj ? subj.subject_code : '',
                      semester_id: uploadSemester,
                      branch_id: uploadBranch,
                      section_id: uploadSection,
                      file: uploadFile,
                    });
                    if (resp && resp.success) {
                      alert('Uploaded successfully');
                      setShowUploadModal(false);
                      setUploadSubject('');
                      setUploadBranch('');
                      setUploadSemester('');
                      setUploadSection('');
                      setUploadTitle('');
                      setUploadFile(null);
                      // Materials will automatically reload since filters are already selected
                    } else {
                      alert(resp?.message || 'Upload failed');
                    }
                  } catch (e) {
                    console.error(e);
                    alert('Upload error');
                  } finally {
                    setUploading(false);
                  }
                }}
                disabled={uploading}
                className={`w-full px-3 sm:px-4 py-2 rounded text-xs sm:text-sm font-bold text-white ${uploading ? 'bg-gray-500' : 'bg-primary hover:bg-primary/90'}`}
              >
                {uploading ? 'Uploading...' : 'Upload'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default StudyMaterialsFaculty;
