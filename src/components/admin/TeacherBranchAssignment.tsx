import { useState, useEffect, forwardRef } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "../ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue } from
"../ui/select";
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
  DialogTitle } from
"../ui/dialog";
import { Badge } from "../ui/badge";
import { fetchWithTokenRefresh } from "../../utils/authService";
import { API_ENDPOINT } from "../../utils/config";
import { useToast } from "../../hooks/use-toast";
import { useTheme } from "../../context/ThemeContext";
import { SkeletonTable } from "../ui/skeleton";

// Custom SelectContent components without scroll arrows
const CustomSelectContent = forwardRef<
  React.ElementRef<typeof SelectPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Content> & {header?: React.ReactNode;}>(
  ({ className, children, position = "popper", header, ...props }, ref) =>
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
      {...props}>
      
      {header && <div className="z-20 bg-popover border-b">{header}</div>}
      <SelectPrimitive.Viewport
        className={cn(
          "p-1 max-h-[calc(100%-8px)] overflow-y-auto custom-scrollbar",
          position === "popper" &&
          "h-[var(--radix-select-trigger-height)] w-full min-w-[var(--radix-select-trigger-width)]"
        )}>
        
        {children}
      </SelectPrimitive.Viewport>
    </SelectPrimitive.Content>
  </SelectPrimitive.Portal>
);
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
  toast: (options: {title?: string;description?: string;variant?: string;}) => void;
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

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setAppliedSearch(searchTerm.trim());
    }, 500);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Load branches list on mount
  useEffect(() => {
    const fetchInitialBranches = async () => {
      try {
        const response = await fetchWithTokenRefresh(`${API_ENDPOINT}/admin/teacher-assignments/?page=1&page_size=1`, {
          method: "GET",
          headers: {
            Authorization: `Bearer ${sessionStorage.getItem("access_token")}`,
            "Content-Type": "application/json"
          }
        });
        const result = await response.json();
        const hasResults = result && typeof result === 'object' && 'results' in result;
        const dataSource = hasResults ? result.results : result;
        if (dataSource && dataSource.success) {
          setBranches(dataSource.branches || []);
        }
      } catch (e) {
        // fail silently
      }
    };
    fetchInitialBranches();
  }, []);

  useEffect(() => {
    if (branchFilter) {
      setSearchTerm("");
      setAppliedSearch("");
    }
  }, [branchFilter]);

  useEffect(() => {
    if (branchFilter || appliedSearch) {
      fetchTeacherAssignments();
    } else {
      setTeachers([]);
      setTotalCount(0);
      setTotalPages(1);
      setLoading(false);
    }
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
          Authorization: `Bearer ${sessionStorage.getItem("access_token")}`,
          "Content-Type": "application/json"
        }
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
        const count = result.count || dataSource && dataSource.count;
        if (count !== undefined) {
          setTotalPages(Math.ceil(count / 10));
          setTotalCount(count);
        }
      } else {
        setError(dataSource?.message || result.message || "Failed to fetch Faculty assignments");
      }
    } catch (error) {

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
          Authorization: `Bearer ${sessionStorage.getItem("access_token")}`,
          "Content-Type": "application/json"
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
          variant: "default"
        });
        // Update local state using returned teacher payload to avoid extra GET
        if (result.teacher) {
          setTeachers((prev) =>
          prev.map((t) =>
          t.id === result.teacher.id ?
          { ...t, primary_branch: result.teacher.primary_branch } :
          t
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
      <Card id="teacher-assignments-card" className={theme === 'dark' ? 'bg-card border border-border' : 'bg-white border border-gray-200'}>
        <div id="teacher-assignments-header-section" className="flex flex-col">
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
                    className="assign-btn-mobile w-full sm:w-auto flex items-center justify-center gap-2 bg-primary hover:bg-primary/90 text-white">
                    
                  <Building className="h-4 w-4" />
                  Assign Primary Branch
                </Button>
              </div>
            </div>
          </CardHeader>
          {/* Search and Filter Controls */}
          <div className="controls-wrapper px-4 sm:px-6 flex flex-col sm:flex-row gap-4 mb-4">
            <div className="search-container relative w-full sm:w-64">
              <Input
                  placeholder="Search teachers by name or email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="search-input-mobile w-full pr-12" />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-primary hover:text-primary/80 transition-colors"
                >
                  Clear
                </button>
              )}
            </div>
            <div className="filter-container sm:w-48">
              <Select value={branchFilter || undefined} onValueChange={(value) => setBranchFilter(value === "all" ? "" : value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose Branch" />
                </SelectTrigger>
                <SelectContent className={theme === 'dark' ? 'bg-card text-foreground border border-border max-h-[200px] overflow-y-auto custom-scrollbar' : 'bg-white text-gray-900 border border-gray-300 max-h-[200px] overflow-y-auto custom-scrollbar'}>
                  <SelectItem value="all">All Branches</SelectItem>
                  {branches.length === 0 ? (
                    <SelectItem value="none" disabled>No branches found</SelectItem>
                  ) : (
                    branches.map((branch) =>
                      <SelectItem key={branch.id} value={branch.id.toString()}>
                        {branch.name}
                      </SelectItem>
                    )
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
        <CardContent className="assignment-card-content">
          <div>
            {loading ?
              <SkeletonTable rows={5} cols={1} /> :

              branchFilter === "" && appliedSearch === "" ? (
                <div className={`flex flex-col items-center justify-center py-20 px-4 rounded-lg border-2 border-dashed ${theme === 'dark' ? 'border-border bg-card/30' : 'border-gray-200 bg-gray-50/50'}`}>
                  <div className={`p-4 rounded-full mb-4 ${theme === 'dark' ? 'bg-primary/10' : 'bg-primary/5'}`}>
                    <Building className="w-10 h-10 text-primary opacity-50" />
                  </div>
                  <h3 className={`text-lg font-semibold mb-2 ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>
                    Select a Branch
                  </h3>
                  <p className={`text-center max-w-sm ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}`}>
                    Please select a branch from the dropdown above to view and manage its faculty assignments.
                  </p>
                </div>
              ) : teachers.length === 0 ? (
                <div className={`flex flex-col items-center justify-center py-20 px-4 rounded-lg border-2 border-dashed ${theme === 'dark' ? 'border-border bg-card/30' : 'border-gray-200 bg-gray-50/50'}`}>
                  <div className={`p-4 rounded-full mb-4 ${theme === 'dark' ? 'bg-primary/10' : 'bg-primary/5'}`}>
                    <Building className="w-10 h-10 text-primary opacity-50" />
                  </div>
                  <h3 className={`text-lg font-semibold mb-2 ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>
                    No Faculty Assignments Found
                  </h3>
                  <p className={`text-center max-w-sm ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}`}>
                    There are no faculty members assigned to the selected branch or matching your search.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-3 sm:gap-4">
                  {teachers.map((teacher) =>
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
                    }}>
                    
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
                          {teacher.primary_branch && teacher.primary_branch.name ?
                        <Badge className={theme === 'dark' ? 'bg-purple-700 text-white border-transparent text-[10px] sm:text-xs' : 'bg-purple-100 text-purple-800 border-transparent text-[10px] sm:text-xs'}>
                              {teacher.primary_branch.name}
                            </Badge> :

                        <span className={`px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-medium ${theme === 'dark' ? 'bg-gray-700 text-gray-200' : 'bg-purple-50 text-purple-700'}`}>
                              Not Assigned
                            </span>
                        }
                        </div>
                      </div>
                    </Card>
                  )}
                </div>
              )
              }
          </div>

        </CardContent>
        {!loading && totalPages > 1 &&
          <CardFooter className="flex flex-col sm:flex-row justify-between items-center gap-4 text-sm text-muted-foreground px-6 py-4 border-t border-border mt-auto">
            <div>
              Showing {Math.min((currentPage - 1) * 10 + 1, totalCount)} to {Math.min(currentPage * 10, totalCount)} of {totalCount} teachers
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                className="bg-primary hover:bg-primary/90 text-white border-primary h-9 px-4 transition-all">
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
                onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
                className="bg-primary hover:bg-primary/90 text-white border-primary h-9 px-4 transition-all">
                Next
              </Button>
            </div>
          </CardFooter>
          }
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
                  const teacher = teachers.find((t) => t.id.toString() === value);
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
                          className="h-8 pl-8 text-xs bg-muted/50 border-none ring-1 focus-visible:ring-primary" />
                        
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
                            setCurrentPage((prev) => Math.max(1, prev - 1));
                          }}
                          disabled={currentPage === 1 || loading}>
                          
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
                            setCurrentPage((prev) => Math.min(totalPages, prev + 1));
                          }}
                          disabled={currentPage === totalPages || loading}>
                          
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    }>
                    
                  <div className="pt-1">
                    {loading ? (
                      <div className="p-4 flex flex-col items-center gap-2">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                        <span className="text-[10px] text-muted-foreground">Loading...</span>
                      </div>
                    ) : teachers.length === 0 ? (
                      <SelectItem value="none" disabled>No faculty found</SelectItem>
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
                  {branches.length === 0 ? (
                    <SelectItem value="none" disabled>No branches found</SelectItem>
                  ) : (
                    branches.map((branch) => (
                      <SelectItem key={branch.id} value={branch.id.toString()}>
                        {branch.name}
                      </SelectItem>
                    ))
                  )}
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
                className="bg-primary hover:bg-primary/90 text-white">
                
              Assign Branch
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      </div>
    </>);

};

export default TeacherBranchAssignment;