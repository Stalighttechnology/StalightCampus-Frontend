import { useState, useEffect, forwardRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import * as SelectPrimitive from "@radix-ui/react-select";
import { cn } from "../../lib/utils";
import { Building, Search, ChevronLeft, ChevronRight } from "lucide-react";
import { Input } from "../ui/input";
import { Button } from "../ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import { Badge } from "../ui/badge";
import { fetchWithTokenRefresh } from "../../utils/authService";
import { API_ENDPOINT } from "../../utils/config";
import { useToast } from "../../hooks/use-toast";
import { useTheme } from "../../context/ThemeContext";
import { SkeletonTable } from "../ui/skeleton";

// Custom SelectContent components without scroll arrows
const CustomSelectContent = forwardRef<
  React.ElementRef<typeof SelectPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Content> & { header?: React.ReactNode }
>(({ className, children, position = "popper", header, ...props }, ref) => (
  <SelectPrimitive.Portal>
    <SelectPrimitive.Content
      ref={ref}
      className={cn(
        "relative z-50 max-h-96 min-w-[8rem] overflow-hidden rounded-md border bg-popover text-popover-foreground shadow-md data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2",
        position === "popper" &&
          "data-[side=bottom]:translate-y-1 data-[side=left]:-translate-x-1 data-[side=right]:translate-x-1 data-[side=top]:-translate-y-1",
        className
      )}
      position={position}
      {...props}
    >
      {header && <div className="z-20 bg-popover border-b">{header}</div>}
      <SelectPrimitive.Viewport
        className={cn(
          "p-1 max-h-[calc(100%-8px)] overflow-y-auto custom-scrollbar",
          position === "popper" &&
            "h-[var(--radix-select-trigger-height)] w-full min-w-[var(--radix-select-trigger-width)]"
        )}
      >
        {children}
      </SelectPrimitive.Viewport>
    </SelectPrimitive.Content>
  </SelectPrimitive.Portal>
));
CustomSelectContent.displayName = SelectPrimitive.Content.displayName;


interface Teacher {
  id: number;
  username: string;
  first_name: string;
  last_name: string;
  email: string;
  primary_branch: {
    id: number;
    name: string;
  } | null;
}

interface Branch {
  id: number;
  name: string;
}

interface TeacherBranchAssignmentProps {
  setError: (error: string | null) => void;
  toast: (options: { title?: string; description?: string; variant?: string }) => void;
}


const TeacherBranchAssignment = ({ setError, toast }: TeacherBranchAssignmentProps) => {
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const { theme } = useTheme();
  const [selectedTeacher, setSelectedTeacher] = useState<Teacher | null>(null);
  const [showBranchDialog, setShowBranchDialog] = useState(false);
  const [selectedBranch, setSelectedBranch] = useState<string>("");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [searchTerm, setSearchTerm] = useState(""); // Input value
  const [appliedSearch, setAppliedSearch] = useState(""); // Applied search term
  const [branchFilter, setBranchFilter] = useState("");

  // Function to perform search
  const performSearch = () => {
    setAppliedSearch(searchTerm.trim());
    setCurrentPage(1); // Reset to first page when searching
  };

  // Handle Enter key press for search
  const handleSearchKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      performSearch();
    }
  };

  useEffect(() => {
    fetchTeacherAssignments();
  }, [currentPage, appliedSearch, branchFilter]);

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [appliedSearch, branchFilter]);

  const fetchTeacherAssignments = async () => {
    try {
      setLoading(true);
      let url = `${API_ENDPOINT}/admin/teacher-assignments/?page=${currentPage}&page_size=10`;
      if (appliedSearch) url += `&search=${encodeURIComponent(appliedSearch)}`;
      if (branchFilter) url += `&branch_id=${branchFilter}`;

      const response = await fetchWithTokenRefresh(url, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("access_token")}`,
          "Content-Type": "application/json",
        },
      });
      const result = await response.json();

      // Handle invalid page due to filter changes
      if (!result.success && result.message && result.message.includes("Invalid page")) {
        setCurrentPage(1);
        return;
      }

      const hasResults = result && typeof result === 'object' && 'results' in result;
      const dataSource = hasResults ? result.results : result;

      if (dataSource && dataSource.success) {
        setTeachers(dataSource.teachers || []);
        setBranches(dataSource.branches || []);
        const count = result.count || (dataSource && dataSource.count);
        if (count !== undefined) {
          setTotalPages(Math.ceil(count / 10));
          setTotalCount(count);
        }
      } else {
        setError(dataSource?.message || result.message || "Failed to fetch Faculty assignments");
      }
    } catch (error) {
      console.error("Error fetching Faculty assignments:", error);
      setError("Failed to fetch Faculty assignments");
    } finally {
      setLoading(false);
    }
  };

  const handleAssignPrimaryBranch = async () => {
    if (!selectedTeacher || !selectedBranch) return;

    try {
      const response = await fetchWithTokenRefresh(`${API_ENDPOINT}/admin/assign-teacher-branch/`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("access_token")}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          teacher_id: selectedTeacher.id,
          branch_id: selectedBranch
        })
      });
      const result = await response.json();

      if (result.success) {
        toast({
          title: "Success",
          description: result.message,
          variant: "default",
        });
        // Update local state using returned teacher payload to avoid extra GET
        if (result.teacher) {
          setTeachers((prev) =>
            prev.map((t) =>
              t.id === result.teacher.id
                ? { ...t, primary_branch: result.teacher.primary_branch }
                : t
            )
          );
        }
        setShowBranchDialog(false);
        setSelectedBranch("");
        setSelectedTeacher(null);
      } else {
        setError(result.message || "Failed to assign branch");
      }
    } catch (error) {
      console.error("Error assigning branch:", error);
      setError("Failed to assign branch");
    }
  };

  // Removed global loading return to prevent unmounting of Dialog/State

  return (
    <>
      <style>{`
        @media (max-width: 480px) {
          .assignment-card-header { padding: 16px !important; }
          .assignment-card-content { padding: 12px 16px 16px 16px !important; }
          .assignment-title { font-size: 1.35rem !important; margin-bottom: 4px !important; }
          .assignment-desc { font-size: 0.8125rem !important; }
          .assign-btn-mobile { margin-top: 8px !important; }
          
          .controls-wrapper { gap: 12px !important; margin-bottom: 16px !important; }
          .search-container { width: 100% !important; }
          .search-input-mobile { flex: 1 !important; width: 100% !important; }
          .filter-container { width: 100% !important; }
          
          .teacher-card { padding: 16px !important; gap: 12px !important; }
          .teacher-name { font-size: 1rem !important; margin-bottom: 4px !important; }
          .teacher-info { font-size: 0.8125rem !important; line-height: 1.5 !important; }
          .badge-wrapper { margin-top: 4px !important; }
          
          .pagination-wrapper { 
            padding-top: 16px !important; 
            margin-top: 8px !important; 
            border-top: 1px solid var(--border);
          }
        }
      `}</style>

      <div className={`${theme === 'dark' ? 'bg-background' : 'bg-gray-50'}`}>
      <Card className={theme === 'dark' ? 'bg-card border border-border' : 'bg-white border border-gray-200'}>
        <CardHeader className="assignment-card-header">
          <div className="w-full flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <CardTitle className={`assignment-title text-2xl font-semibold leading-none tracking-tight mb-2 ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>Faculty-Branch Assignments</CardTitle>
              <p className={`assignment-desc block text-xs md:text-base text-gray-500 ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}`}>Assign primary branches to faculty members</p>
            </div>
            <div className="w-full sm:w-auto">
              <Button
                onClick={() => {
                  setSelectedTeacher(null);
                  setSelectedBranch("");
                  setShowBranchDialog(true);
                }}
                className="assign-btn-mobile w-full sm:w-auto flex items-center justify-center gap-2 bg-primary hover:bg-primary/90 text-white"
              >
                <Building className="h-4 w-4" />
                Assign Primary Branch
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="assignment-card-content">
          {/* Search and Filter Controls */}
          <div className="controls-wrapper flex flex-col sm:flex-row gap-4 mb-4">
            <div className="search-container flex gap-2">
              <Input
                placeholder="Search teachers by name or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyPress={handleSearchKeyPress}
                className="search-input-mobile w-64"
              />
              <Button
                onClick={performSearch}
                variant="outline"
                size="sm"
                className="px-3"
              >
                <Search className="h-4 w-4" />
              </Button>
            </div>
            <div className="filter-container sm:w-48">
              <Select value={branchFilter || "all"} onValueChange={(value) => setBranchFilter(value === "all" ? "" : value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter by branch" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Branches</SelectItem>
                  {branches.map((branch) => (
                    <SelectItem key={branch.id} value={branch.id.toString()}>
                      {branch.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            {loading ? (
              <SkeletonTable rows={5} cols={1} />
            ) : (
              <div className="grid grid-cols-1 gap-3 sm:gap-4">
                {teachers.map((teacher) => (
                  <Card
                    key={teacher.id}
                    className="teacher-card p-3 sm:p-4 cursor-pointer hover:border-primary/50 transition-colors"
                    onClick={() => {
                      setSelectedTeacher(teacher);
                      if (teacher.primary_branch) {
                        setSelectedBranch(teacher.primary_branch.id.toString());
                      } else {
                        setSelectedBranch("");
                      }
                      setShowBranchDialog(true);
                    }}
                  >
                    <div className="flex flex-col sm:flex-row sm:justify-between items-start gap-2">
                      <div className="w-full">
                        <h3 className="teacher-name text-sm sm:text-lg font-semibold">
                          {teacher.first_name} {teacher.last_name}
                        </h3>
                        <p className="teacher-info text-sm text-gray-600 dark:text-gray-400">{teacher.email}</p>
                        <p className="teacher-info text-sm text-gray-600 dark:text-gray-400 mt-1">
                          Branch: {teacher.primary_branch && teacher.primary_branch.name ? teacher.primary_branch.name : "Not Assigned"}
                        </p>
                      </div>
                      <div className="badge-wrapper">
                        {teacher.primary_branch && teacher.primary_branch.name ? (
                          <Badge className={theme === 'dark' ? 'bg-purple-700 text-white border-transparent text-[10px] sm:text-xs' : 'bg-purple-100 text-purple-800 border-transparent text-[10px] sm:text-xs'}>
                            {teacher.primary_branch.name}
                          </Badge>
                        ) : (
                          <span className={`px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-medium ${theme === 'dark' ? 'bg-gray-700 text-gray-200' : 'bg-purple-50 text-purple-700'}`}>
                            Not Assigned
                          </span>
                        )}
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>

          {/* Pagination Info - moved to bottom */}
          {!loading && (
            <div className="pagination-wrapper flex flex-col sm:flex-row justify-between items-center gap-4 text-sm text-gray-600 mt-2">
              <div className="text-xs sm:text-sm">
                Showing {Math.min((currentPage - 1) * 10 + 1, totalCount)} to {Math.min(currentPage * 10, totalCount)} of {totalCount} teachers
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                  className="bg-primary hover:bg-primary/90 text-white border-primary"
                >
                  Previous
                </Button>

                {/* Current Page Number */}
                <div className="flex gap-1">
                  <span className="px-3 py-2 text-sm font-medium">
                    {currentPage}
                  </span>
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                  disabled={currentPage === totalPages}
                  className="bg-primary hover:bg-primary/90 text-white border-primary"
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Primary Branch Assignment Dialog */}
      <Dialog open={showBranchDialog} onOpenChange={setShowBranchDialog}>
        <DialogContent className="w-full max-w-[320px] mx-4 rounded-lg sm:rounded-md sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Assign Primary Branch</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Select Faculty</label>
              <Select value={selectedTeacher?.id.toString() || ""} onValueChange={(value) => {
                const teacher = teachers.find(t => t.id.toString() === value);
                setSelectedTeacher(teacher || null);
                if (teacher?.primary_branch) {
                  setSelectedBranch(teacher.primary_branch.id.toString());
                } else {
                  setSelectedBranch("");
                }
              }}>
                <SelectTrigger className="w-full mt-1">
                  <SelectValue placeholder="Choose a faculty" />
                </SelectTrigger>
                <CustomSelectContent 
                  className="max-h-[250px]"
                  header={
                    <div className="p-2 space-y-2">
                      <div className="relative">
                        <Search className="absolute left-2 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                        <Input
                          placeholder="Search faculty..."
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              performSearch();
                            }
                            e.stopPropagation();
                          }}
                          onPointerDown={(e) => e.stopPropagation()}
                          className="h-8 pl-8 text-xs bg-muted/50 border-none ring-1 focus-visible:ring-primary"
                        />
                      </div>
                      <div className="flex items-center justify-between px-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0"
                          onPointerDown={(e) => e.preventDefault()}
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setCurrentPage(prev => Math.max(1, prev - 1));
                          }}
                          disabled={currentPage === 1 || loading}
                        >
                          <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                          Page {currentPage} of {totalPages}
                        </span>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0"
                          onPointerDown={(e) => e.preventDefault()}
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setCurrentPage(prev => Math.min(totalPages, prev + 1));
                          }}
                          disabled={currentPage === totalPages || loading}
                        >
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  }
                >
                  <div className="pt-1">
                    {loading ? (
                      <div className="p-4 flex flex-col items-center gap-2">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                        <span className="text-[10px] text-muted-foreground">Loading...</span>
                      </div>
                    ) : (
                      teachers.map((teacher) => (
                        <SelectItem key={teacher.id} value={teacher.id.toString()}>
                          {teacher.first_name} {teacher.last_name}
                        </SelectItem>
                      ))
                    )}
                  </div>
                </CustomSelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium">Select Branch</label>
              <Select value={selectedBranch} onValueChange={setSelectedBranch}>
                <SelectTrigger className="w-full mt-1">
                  <SelectValue placeholder="Choose a branch" />
                </SelectTrigger>
                <CustomSelectContent className="max-h-[180px]">
                  {branches.map((branch) => (
                    <SelectItem key={branch.id} value={branch.id.toString()}>
                      {branch.name}
                    </SelectItem>
                  ))}
                </CustomSelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowBranchDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleAssignPrimaryBranch}
              disabled={!selectedTeacher || !selectedBranch}
              className="bg-primary hover:bg-primary/90 text-white"
            >
              Assign Branch
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      </div>
    </>
  );
};

export default TeacherBranchAssignment;