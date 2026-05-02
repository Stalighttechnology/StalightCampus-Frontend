import React, { useState, useEffect } from "react";
import { FileText, Download } from "lucide-react";
import { useTheme } from "@/context/ThemeContext";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  getBranches, 
  getSemesters, 
  getSections, 
  getAllStudyMaterials 
} from "@/utils/student_api";
import { SkeletonList } from "../ui/skeleton";

interface StudyMaterial {
  id: number;
  title: string;
  subject_name: string;
  subject_code: string;
  semester: string;
  uploaded_by: string;
  file_url: string;
}

const StudyMaterialRow = ({ material, theme }: { material: StudyMaterial; theme: string }) => (
  <div className={`grid grid-cols-3 md:grid-cols-7 gap-2 md:gap-2 items-start md:items-center text-xs md:text-sm py-3 md:py-2 px-3 md:px-0 md:border-b ${theme === 'dark' ? 'md:border-border' : 'md:border-gray-200'} last:border-b-0`}>
    <div className="hidden md:flex items-center">
      <FileText className="text-red-500" size={18} />
    </div>
    <div className="col-span-1">
      <span className={`md:hidden text-xs font-bold mr-1 ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}`}>Title:</span>
      <div className={`${theme === 'dark' ? 'text-blue-400' : 'text-blue-600'} font-medium cursor-pointer hover:underline truncate`}>
        {material.title}
      </div>
    </div>
    <div className="col-span-1">
      <span className={`md:hidden text-xs font-bold mr-1 ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}`}>Course:</span>
      <div className={`truncate`}>{material.subject_name}</div>
    </div>
    <div className="col-span-1 hidden md:block">
      <span className={`truncate`}>{material.subject_code}</span>
    </div>
    <div className="hidden md:block col-span-1">{material.semester || "N/A"}</div>
    <div className="hidden md:block col-span-1">{material.uploaded_by}</div>
    <div className="col-span-1">
      <a href={material.file_url} download={material.title + ".pdf"} target="_blank" rel="noopener noreferrer">
        <Download className={`cursor-pointer ${theme === 'dark' ? 'text-muted-foreground hover:text-foreground' : 'text-gray-500 hover:text-gray-700'}`} size={18} />
      </a>
    </div>
  </div>
);

const StudyMaterialsStudent = () => {
  const { theme } = useTheme();
  const [selectedBranch, setSelectedBranch] = useState<string>("All Branches");
  const [selectedSemester, setSelectedSemester] = useState<string>("All Semesters");
  const [selectedSection, setSelectedSection] = useState<string>("All Sections");
  const [materials, setMaterials] = useState<StudyMaterial[]>([]);
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
    const resp = await getAllStudyMaterials(selectedBranch === 'All Branches' ? undefined : selectedBranch, selectedSemester === 'All Semesters' ? undefined : selectedSemester, selectedSection === 'All Sections' ? undefined : selectedSection, searchQuery || undefined);
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
          <h1 className="text-lg sm:text-xl md:text-2xl font-semibold ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}">Study Materials</h1>
          <p className={`text-xs sm:text-sm mt-1 ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-600'}`}>
            Access and download study materials shared by your professors.
          </p>
        </CardHeader>
        <CardContent className="p-3 sm:p-4 lg:p-6 space-y-6">
          {/* Filters & Search */}
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 sm:gap-3">
              <Select value={selectedBranch} onValueChange={setSelectedBranch}>
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
                onValueChange={setSelectedSemester}
                disabled={semesters.length === 0}
              >
                <SelectTrigger className={`${semesters.length === 0 ? 'opacity-50 cursor-not-allowed' : ''} ${theme === 'dark' ? 'border-border bg-background text-foreground' : 'border-gray-300 bg-white text-gray-900'}`}>
                  <SelectValue placeholder="All Semesters" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="All Semesters">All Semesters</SelectItem>
                  {semesters.map((s) => (
                    <SelectItem key={s.id} value={s.id.toString()}>Sem {s.number}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select
                value={selectedSection}
                onValueChange={setSelectedSection}
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
            <div className="hidden md:grid grid-cols-7 font-semibold text-xs sm:text-sm gap-2 mb-4 px-2">
              <div>Type</div>
              <div>Title</div>
              <div>Course Name</div>
              <div>Course Code</div>
              <div>Semester</div>
              <div>Uploaded By</div>
              <div>Action</div>
            </div>
            <div className="space-y-1">
              {loading ? (
                <SkeletonList items={5} />
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
    </div>
  );
};

export default StudyMaterialsStudent;