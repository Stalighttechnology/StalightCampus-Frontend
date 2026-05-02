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
import { Building, Search } from "lucide-react";
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
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Content>
>(({ className, children, position = "popper", ...props }, ref) => (
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
      
      // Handle response structure (similar to UsersManagement)
      const hasResults = result && typeof result === 'object' && 'results' in result;
      const dataSource = hasResults ? result.results : result;
      const paginationData = hasResults ? result : dataSource;
      
      if (dataSource && dataSource.success) {
        setTeachers(dataSource.teachers || []);
        setBranches(dataSource.branches || []);
        setTotalPages(Math.ceil((paginationData.count || 0) / 10));
        setTotalCount(paginationData.count || 0);
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

  if (loading) {
    return (
      <div className="space-y-6">
        <SkeletonTable rows={8} cols={4} />
      </div>
    );
  }

  return (
    <div className={`${theme === 'dark' ? 'bg-background' : 'bg-gray-50'}`}>
      <Card className={theme === 'dark' ? 'bg-card border border-border' : 'bg-white border border-gray-200'}>
        <CardHeader>
          <div className="w-full flex items-start justify-between">
            <div>
              <CardTitle className={`text-2xl font-semibold leading-none tracking-tight text-gray-900 mb-2 ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>Faculty-Branch Assignments</CardTitle>
              <p className={`block text-xs md:text-base text-gray-500 ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}`}>Assign primary branches to faculty members</p>
            </div>
            <div>
              <Button
                onClick={() => {
                  setSelectedTeacher(null);
                  setSelectedBranch("");
                  setShowBranchDialog(true);
                }}
                className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-white"
              >
                <Building className="h-4 w-4" />
                Assign Primary Branch
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Search and Filter Controls */}
          <div className="flex flex-col sm:flex-row gap-4 mb-4">
            <div className="flex gap-2">
              <Input
                placeholder="Search teachers by name or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyPress={handleSearchKeyPress}
                className="w-64"
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
            <div className="sm:w-48">
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

          <div className="max-h-[calc(100vh-28rem)] sm:max-h-[calc(100vh-26rem)] md:max-h-[calc(100vh-24rem)] lg:max-h-[calc(100vh-22rem)] overflow-y-auto custom-scrollbar pr-2">
            <div className="grid grid-cols-1 gap-2 sm:gap-4">
              {teachers.map((teacher) => (
                <Card 
                  key={teacher.id} 
                  className="p-2 sm:p-4 cursor-pointer hover:border-primary/50 transition-colors"
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
                    <div>
                      <h3 className="text-sm sm:text-lg font-semibold">
                        {teacher.first_name} {teacher.last_name}
                      </h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400">{teacher.email}</p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Branch: {teacher.primary_branch && teacher.primary_branch.name ? teacher.primary_branch.name : "Not Assigned"}
                      </p>
                    </div>
                    {teacher.primary_branch && teacher.primary_branch.name ? (
                      <Badge className={theme === 'dark' ? 'bg-purple-700 text-white border-transparent text-xs' : 'bg-purple-100 text-purple-800 border-transparent text-xs'}>
                        {teacher.primary_branch.name}
                      </Badge>
                    ) : (
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${theme === 'dark' ? 'bg-gray-700 text-gray-200' : 'bg-purple-50 text-purple-700'}`}>
                        Not Assigned
                      </span>
                    )}
                  </div>
                </Card>
              ))}
            </div>
          </div>

          {/* Pagination Info - moved to bottom */}
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4 text-sm text-gray-600 mt-4">
            <div>
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
                <CustomSelectContent className="max-h-[180px]">
                  {teachers.map((teacher) => (
                    <SelectItem key={teacher.id} value={teacher.id.toString()}>
                      {teacher.first_name} {teacher.last_name}
                    </SelectItem>
                  ))}
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
  );
};

export default TeacherBranchAssignment;