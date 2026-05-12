import React, { useState, useEffect } from "react";
import { FileText, Download, AlertCircle, BookOpen, Search } from "lucide-react";
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
import { Button } from "@/components/ui/button";
import { SkeletonList } from "../ui/skeleton";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";

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
      <span className={`md:hidden text-xs font-semibold mr-1 ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}`}>Title:</span>
      <div className={`${theme === 'dark' ? 'text-blue-400' : 'text-blue-600'} font-medium cursor-pointer hover:underline truncate`}>
        {material.title}
      </div>
    </div>
    <div className="col-span-1">
      <span className={`md:hidden text-xs font-semibold mr-1 ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}`}>Course:</span>
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

  const [currentPage, setCurrentPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);

  const loadMaterials = async (page = 1) => {
    setLoading(true);

    const resp = await getAllStudyMaterials(
      selectedBranch === 'All Branches' ? undefined : selectedBranch,
      selectedSemester === 'All Semesters' ? undefined : selectedSemester,
      selectedSection === 'All Sections' ? undefined : selectedSection,
      searchQuery || undefined,
      page
    );

    if (resp && resp.success && Array.isArray(resp.data)) {
      setMaterials(resp.data);
      setTotalPages(resp.total_pages || 1);
      setCurrentPage(page);
    } else {
      setMaterials([]);
      setTotalPages(1);
    }
    setHasSearched(true);
    setLoading(false);
  };

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages && page !== currentPage) {
      loadMaterials(page);
      // Scroll to top of materials section
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  // Helper to generate page numbers
  const getPageNumbers = () => {
    const pages = [];
    const maxVisible = 3;

    if (totalPages <= 5) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (currentPage > 3) pages.push('ellipsis');

      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);

      for (let i = start; i <= end; i++) {
        if (!pages.includes(i)) pages.push(i);
      }

      if (currentPage < totalPages - 2) pages.push('ellipsis');
      if (!pages.includes(totalPages)) pages.push(totalPages);
    }
    return pages;
  };

  // Load materials on mount and when filters change
  useEffect(() => {
    loadMaterials(1);
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
                <div className="flex flex-col items-center justify-center py-16 px-4 animate-in fade-in duration-700">
                  <div className={`p-6 rounded-full ${theme === 'dark' ? 'bg-white/5' : 'bg-gray-50'} mb-4 shadow-sm`}>
                    <Search className="h-12 w-12 text-indigo-500/50" />
                  </div>
                  <div className="text-center max-w-sm">
                    <h3 className={`text-lg font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>Ready to Search</h3>
                    <p className={`text-sm mt-2 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                      Select your branch, semester, and section to access your study materials.
                    </p>
                  </div>
                </div>
              ) : materials.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 px-4 animate-in fade-in duration-700">
                  <div className={`p-6 rounded-full ${theme === 'dark' ? 'bg-white/5' : 'bg-gray-50'} mb-4 shadow-sm`}>
                    <BookOpen className="h-12 w-12 text-indigo-500/50" />
                  </div>
                  <div className="text-center max-w-sm">
                    <h3 className={`text-lg font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>No Materials Found</h3>
                    <p className={`text-sm mt-2 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                      We couldn't find any study materials matching your current criteria. Please try different filters.
                    </p>
                  </div>
                </div>
              ) : (
                materials.map((m: StudyMaterial) => <StudyMaterialRow key={m.id} material={m} theme={theme} />)
              )}
            </div>

            {totalPages > 1 && (
              <div className="mt-8">
                <Pagination>
                  <PaginationContent>
                    <PaginationItem>
                      <PaginationPrevious
                        href="#"
                        onClick={(e) => {
                          e.preventDefault();
                          handlePageChange(currentPage - 1);
                        }}
                        className={currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                      />
                    </PaginationItem>

                    {getPageNumbers().map((page, i) => (
                      <PaginationItem key={i}>
                        {page === 'ellipsis' ? (
                          <PaginationEllipsis />
                        ) : (
                          <PaginationLink
                            href="#"
                            isActive={currentPage === page}
                            onClick={(e) => {
                              e.preventDefault();
                              handlePageChange(page as number);
                            }}
                            className="cursor-pointer"
                          >
                            {page}
                          </PaginationLink>
                        )}
                      </PaginationItem>
                    ))}

                    <PaginationItem>
                      <PaginationNext
                        href="#"
                        onClick={(e) => {
                          e.preventDefault();
                          handlePageChange(currentPage + 1);
                        }}
                        className={currentPage === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
                      />
                    </PaginationItem>
                  </PaginationContent>
                </Pagination>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default StudyMaterialsStudent;