import { translateTerminology, getTerm } from "@/utils/institutionConfig";
import React, { useState, useEffect } from "react";
import { FileText, Download, AlertCircle, BookOpen, Search, Loader2 } from "lucide-react";
import { useTheme } from "@/context/ThemeContext";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardFooter
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  getBranches,
  getSemesters,
  getSections,
  getAllStudyMaterials
} from "@/utils/student_api";
import { downloadFileViaBackendProxy } from "@/utils/common_api";
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
  uploaded_by_name: string;
  uploaded_by_role: string | null;
  file_url: string;
}

const StudyMaterialRow = ({ material, theme }: { material: StudyMaterial; theme: string }) => {
  const [downloading, setDownloading] = useState(false);

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
      console.error("Failed to download file", err);
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
        <button
          onClick={handleDownload}
          disabled={downloading}
          className={`inline-flex items-center justify-center p-3 rounded-2xl transition-all duration-200 ${theme === 'dark' ? 'bg-primary/10 text-primary hover:bg-primary/20' : 'bg-primary/5 text-primary hover:bg-primary/10'} ${downloading ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          {downloading ? <Loader2 className="animate-spin" size={22} /> : <Download size={22} />}
        </button>
      </TableCell>
    </TableRow>
  );
};

const StudyMaterialsStudent = () => {
  const { theme } = useTheme();
  const [selectedBranch, setSelectedBranch] = useState<string>("");
  const [selectedSemester, setSelectedSemester] = useState<string>("");
  const [selectedSection, setSelectedSection] = useState<string>("");
  const [materials, setMaterials] = useState<StudyMaterial[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [branches, setBranches] = useState<{ id: string; name: string }[]>([]);
  const [semesters, setSemesters] = useState<{ id: string; number: number }[]>([]);
  const [sections, setSections] = useState<{ id: string; name: string }[]>([]);
  const [hasSearched, setHasSearched] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);

  const [isSemesterOpen, setIsSemesterOpen] = useState<boolean>(false);
  const [isSectionOpen, setIsSectionOpen] = useState<boolean>(false);

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
    if (selectedBranch) {
      const loadSemesters = async () => {
        const resp = await getSemesters(selectedBranch);
        if (resp && resp.success) {
          setSemesters(resp.data || []);
          setIsSemesterOpen(true);
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
    if (selectedBranch && selectedSemester) {
      const loadSections = async () => {
        const resp = await getSections(selectedBranch, selectedSemester);
        if (resp && resp.success) {
          setSections(resp.data || []);
          setIsSectionOpen(true);
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

  const [currentPage, setCurrentPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [totalCount, setTotalCount] = useState<number>(0);

  const loadMaterials = async (page = 1) => {
    setLoading(true);

    const resp = await getAllStudyMaterials(
      !selectedBranch ? undefined : selectedBranch,
      !selectedSemester ? undefined : selectedSemester,
      !selectedSection ? undefined : selectedSection,
      searchQuery || undefined,
      page
    );

    if (resp && resp.success && Array.isArray(resp.data)) {
      setMaterials(resp.data);
      setTotalPages(resp.total_pages || 1);
      setTotalCount(resp.count || 0);
      setCurrentPage(page);
    } else {
      setMaterials([]);
      setTotalPages(1);
      setTotalCount(0);
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

  // Clear search query when dropdown filters change
  useEffect(() => {
    if (selectedBranch || selectedSemester || selectedSection) {
      setSearchQuery("");
    }
  }, [selectedBranch, selectedSemester, selectedSection]);

  // Load materials only when all filters are selected OR there is a search query
  useEffect(() => {
    if ((selectedBranch && selectedSemester && selectedSection) || searchQuery.trim() !== "") {
      loadMaterials(1);
    } else {
      setMaterials([]);
      setHasSearched(false);
    }
  }, [selectedBranch, selectedSemester, selectedSection, searchQuery]);

  return (
    <div className={`w-full max-w-full overflow-hidden ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>
      <Card id="study-materials-card" className={`w-full max-w-full overflow-hidden ${theme === 'dark' ? 'bg-card border-border' : 'bg-white border-gray-200'}`}>
        <CardHeader id="study-materials-header" className="p-3 sm:p-4 lg:p-6 border-b">
          <h1 className={`text-2xl sm:text-3xl font-semibold ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>Study Materials</h1>
          <p className={`text-sm sm:text-base mt-1 ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-600'}`}>
            Access and download study materials shared by your professors.
          </p>
        </CardHeader>
        <CardContent className="p-3 sm:p-4 lg:p-6 space-y-6">
          {/* Filters & Search */}
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 sm:gap-3">
              <Select value={selectedBranch || undefined} onValueChange={setSelectedBranch}>
                <SelectTrigger className={`text-sm sm:text-base h-10 sm:h-11 ${theme === 'dark' ? 'border-border bg-background text-foreground' : 'border-gray-300 bg-white text-gray-900'}`}>
                  <SelectValue placeholder={translateTerminology("Choose Branch")} />
                </SelectTrigger>
                <SelectContent className="max-h-[200px]">
                  {branches.map((b) => (
                    <SelectItem key={b.id} value={b.id.toString()}>{b.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select
                value={selectedSemester || undefined}
                onValueChange={setSelectedSemester}
                disabled={semesters.length === 0}
                open={isSemesterOpen}
                onOpenChange={setIsSemesterOpen}
              >
                <SelectTrigger className={`text-sm sm:text-base h-10 sm:h-11 ${semesters.length === 0 ? 'opacity-50 cursor-not-allowed' : ''} ${theme === 'dark' ? 'border-border bg-background text-foreground' : 'border-gray-300 bg-white text-gray-900'}`}>
                  <SelectValue placeholder={translateTerminology("Choose Semester")} />
                </SelectTrigger>
                <SelectContent className="max-h-[200px]">
                  {semesters.map((s) => (
                    <SelectItem key={s.id} value={s.id.toString()}>Sem {s.number}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select
                value={selectedSection || undefined}
                onValueChange={setSelectedSection}
                disabled={sections.length === 0}
                open={isSectionOpen}
                onOpenChange={setIsSectionOpen}
              >
                <SelectTrigger className={`text-sm sm:text-base h-10 sm:h-11 ${sections.length === 0 ? 'opacity-50 cursor-not-allowed' : ''} ${theme === 'dark' ? 'border-border bg-background text-foreground' : 'border-gray-300 bg-white text-gray-900'}`}>
                  <SelectValue placeholder="Choose Section" />
                </SelectTrigger>
                <SelectContent className="max-h-[200px]">
                  {sections.map((sec) => (
                    <SelectItem key={sec.id} value={sec.id.toString()}>{sec.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="relative">
              <input
                type="text"
                placeholder="Search by title, course name, course code, semester, or uploaded by..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={`w-full pl-3 pr-12 py-2 text-sm sm:text-base h-10 sm:h-11 border rounded ${theme === 'dark' ? 'border-border bg-background text-foreground' : 'border-gray-300 bg-white text-gray-900'}`}
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-primary hover:text-primary/80 transition-colors"
                >
                  Clear
                </button>
              )}
            </div>
          </div>

          {/* Materials Table Section */}
          <div className="pt-4 border-t">
            {!hasSearched ? (
              <div className={`flex flex-col items-center justify-center py-16 px-6 text-center rounded-3xl border-2 border-dashed shadow-sm ${theme === 'dark' ? 'bg-muted/10 border-border/60' : 'bg-gray-50 border-gray-200/60'}`}>
                <div className={`w-24 h-24 rounded-3xl flex items-center justify-center mb-8 shadow-inner animate-pulse ${theme === 'dark' ? 'bg-primary/20 text-primary' : 'bg-primary/10 text-primary'}`}>
                  <Search className="w-12 h-12" />
                </div>
                <h3 className={`text-2xl md:text-2xl font-semibold mb-4 tracking-tight ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>
                  Select Filters to View Materials
                </h3>
                <p className={`text-base md:text-sm max-w-md mx-auto leading-relaxed ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}`}>
                  Please select your branch, semester, and section from the dropdowns above to access and download your study materials.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto custom-scrollbar rounded-2xl border border-border">
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
                          <SkeletonList items={5} />
                        </TableCell>
                      </TableRow>
                    ) : materials.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="p-8">
                          <div className={`flex flex-col items-center justify-center py-16 px-6 text-center rounded-3xl border-2 border-dashed shadow-sm ${theme === 'dark' ? 'bg-muted/10 border-border/60' : 'bg-gray-50 border-gray-200/60'}`}>
                            <div className={`w-24 h-24 rounded-3xl flex items-center justify-center mb-8 shadow-inner ${theme === 'dark' ? 'bg-primary/20 text-primary' : 'bg-primary/10 text-primary'}`}>
                              <BookOpen className="w-12 h-12" />
                            </div>
                            <h3 className={`text-2xl md:text-3xl font-bold mb-4 tracking-tight ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>
                              No Materials Found
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
                      materials.map((m: StudyMaterial) => <StudyMaterialRow key={m.id} material={m} theme={theme} />)
                    )}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>

        </CardContent>

        {totalPages > 1 && (
          <CardFooter className="flex flex-col sm:flex-row justify-between items-center gap-4 text-sm text-muted-foreground px-6 py-4 border-t border-border mt-auto">
            <div>
              Showing {Math.min((currentPage - 1) * 50 + 1, totalCount)} to {Math.min(currentPage * 50, totalCount)} of {totalCount} records
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(Math.max(1, currentPage - 1))}
                disabled={currentPage <= 1 || loading}
                className="bg-primary hover:bg-primary/90 text-white border-primary h-9 px-4 transition-all"
              >
                Previous
              </Button>

              <div className="flex items-center justify-center min-w-[2rem]">
                <span className={`text-sm font-semibold ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>
                  {currentPage}
                </span>
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage >= totalPages || loading}
                className="bg-primary hover:bg-primary/90 text-white border-primary h-9 px-4 transition-all"
              >
                Next
              </Button>
            </div>
          </CardFooter>
        )}
      </Card>
    </div>
  );
};

export default StudyMaterialsStudent;