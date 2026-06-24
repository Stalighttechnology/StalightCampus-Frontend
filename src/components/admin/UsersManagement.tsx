import { useState, useEffect } from "react";
import Swal from "sweetalert2";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "../ui/card";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem
} from "../ui/select";
import { cn } from "../../lib/utils";
import { Pencil1Icon, TrashIcon } from "@radix-ui/react-icons";
import { Search, Loader2, Download } from "lucide-react";
import { downloadFile } from "../../utils/downloadHelper";
import { Input } from "../ui/input";
import { fetchWithTokenRefresh } from "../../utils/authService";
import { API_ENDPOINT } from "../../utils/config";
import { Button } from "../ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle } from
"../ui/dialog";
import { manageUsers, manageUserAction, getBranchesWithHODs } from "../../utils/admin_api";
import { useToast } from "../../hooks/use-toast";
import { useTheme } from "../../context/ThemeContext";
import { PLAN_TIERS } from "../../utils/planGating";
import { SkeletonTable, SkeletonPageHeader } from "../ui/skeleton";

interface User {
  id: number;
  name: string;
  email: string;
  role: string;
  status: string;
  username?: string; // Added to store original username
  department?: string;
  extra?: {usn?: string;branch?: string;branches?: string[];};
}

interface UsersManagementProps {
  setError: (error: string | null) => void;
  toast: (options: {variant?: string;title: string;description: string;}) => void;
}

// Utility to safely extract arrays from API responses
function extractArray<T>(obj: unknown, primaryKey: keyof any, fallbackKey?: keyof any): T[] {
  if (typeof obj !== 'object' || obj === null) return [];
  const anyObj = obj as Record<string, unknown>;
  const primary = anyObj[primaryKey as string];
  if (Array.isArray(primary)) return primary as T[];
  if (fallbackKey) {
    const fallback = anyObj[fallbackKey as string];
    if (Array.isArray(fallback)) return fallback as T[];
  }
  return [];
}


const getStatusBadge = (status: string, theme: string) => {
  const baseClass = "px-3 py-1 rounded-full text-xs font-medium";
  if (status === "Active")
  return <span className={`${baseClass} ${theme === 'dark' ? 'bg-green-900 text-green-300' : 'bg-green-100 text-green-700'}`}>Active</span>;
  if (status === "Inactive")
  return <span className={`${baseClass} ${theme === 'dark' ? 'bg-red-900 text-red-300' : 'bg-red-500 text-white'}`}>Inactive</span>;
};

const getRoleBadge = (role: string, theme: string) => {
  return (
    <span className={`px-3 py-1 rounded-full text-xs font-medium ${theme === 'dark' ? 'bg-gray-700 text-gray-200' : 'bg-gray-200 text-gray-800'}`}>
      {role}
    </span>);

};

const ALL_ROLES = [
  "Student", 
  "Head of Department", 
  "Teacher", 
  "COE", 
  "Fees Manager", 
  "Principal", 
  "Org Admin", 
  "HMS", 
  "Warden", 
  "Dean", 
  "Placement Officer",
  "Transport Admin",
  "Library Admin",
  "Admission Manager"
];

const BASIC_PLAN_ROLES = [
  "Org Admin",
  "Principal",
  "Head of Department",
  "Teacher",
  "Student",
  "Dean"
];

const PRO_PLAN_ROLES = [
  "Org Admin",
  "Principal",
  "Head of Department",
  "Teacher",
  "Student",
  "Dean",
  "COE",
  "Fees Manager"
];

const roleMap: Record<string, string> = {
  "Student": "student",
  "Head of Department": "hod",
  "Teacher": "teacher",
  "COE": "coe",
  "Fees Manager": "fees_manager",
  "Principal": "principal",
  "Org Admin": "org_admin",
  "HMS": "hms_admin",
  "Warden": "warden",
  "Dean": "dean",
  "Placement Officer": "placement_officer",
  "Transport Admin": "transport_admin",
  "Library Admin": "library_admin",
  "Admission Manager": "admission_manager"
};

const UsersManagement = ({ setError, toast }: UsersManagementProps) => {
  const [users, setUsers] = useState<User[]>([]);
  const [roleFilter, setRoleFilter] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("");
  const [departments, setDepartments] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState(""); // input value
  const [appliedSearch, setAppliedSearch] = useState(""); // applied term
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editData, setEditData] = useState<User | null>(null);
  const [promoteData, setPromoteData] = useState<User | null>(null);
  const [selectedNewRole, setSelectedNewRole] = useState<string>("");
  const [promoteConfirmText, setPromoteConfirmText] = useState("");
  const [promoteStep, setPromoteStep] = useState<1 | 2>(1);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalUsers, setTotalUsers] = useState(0);
  const [pageSize] = useState(10); // Fixed page size for consistency
  const normalize = (str: string) => str.toLowerCase().trim();
  const { theme } = useTheme();
  const [downloadingCSV, setDownloadingCSV] = useState(false);

  const userStr = sessionStorage.getItem("user") || localStorage.getItem("user");
  const user = userStr ? JSON.parse(userStr) : null;
  const orgPlan = user?.org_plan || "basic";
  const userTier = PLAN_TIERS[orgPlan.toLowerCase()] || 1;
  const roles = userTier >= 3 ? ALL_ROLES : userTier === 2 ? PRO_PLAN_ROLES : BASIC_PLAN_ROLES;

  const rolesNeedingDept = ["Head of Department", "Teacher", "Student"];
  const isAnyFilterActive =
    (roleFilter !== "" && (!rolesNeedingDept.includes(roleFilter) || departmentFilter !== "")) ||
    (roleFilter === "" && departmentFilter !== "") ||
    appliedSearch !== "";

  const handleDownloadCSV = async () => {
    setDownloadingCSV(true);
    try {
      let queryParams = `?page_size=5000`;
      if (roleFilter) {
        queryParams += `&role=${roleMap[roleFilter]}`;
      }
      if (departmentFilter) {
        queryParams += `&department=${encodeURIComponent(departmentFilter)}`;
      }
      if (appliedSearch.trim()) {
        queryParams += `&search=${encodeURIComponent(appliedSearch.trim())}`;
      }

      const url = `${API_ENDPOINT}/admin/users/export-csv/${queryParams}`;
      await downloadFile(url, `User_List_${new Date().toISOString().slice(0, 10)}.csv`);
      toast({
        title: "Success",
        description: "User list CSV exported successfully",
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "An unexpected error occurred during export",
      });
    } finally {
      setDownloadingCSV(false);
    }
  };

  // Reset current page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [roleFilter, departmentFilter, appliedSearch]);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setAppliedSearch(searchQuery.trim());
    }, 500);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Clear search query when dropdown filters change
  useEffect(() => {
    if (roleFilter || departmentFilter) {
      setSearchQuery("");
      setAppliedSearch("");
    }
  }, [roleFilter, departmentFilter]);

  const handleRoleFilterChange = (val: string) => {
    setRoleFilter(val);
    if (rolesNeedingDept.includes(val)) {
      setTimeout(() => {
        const trigger = document.getElementById("dept-select-trigger");
        if (trigger) {
          trigger.click();
        }
      }, 150);
    } else {
      setDepartmentFilter("");
    }
  };

  // Fetch departments for filter
  useEffect(() => {
    const fetchDepartments = async () => {
      try {
        const res = await getBranchesWithHODs({ page_size: 100 });
        if (res.success) {
          const dataSource = res.results || res.branches || (res as any).data || [];
          const branchList = Array.isArray(dataSource) ? dataSource : [];
          const names = branchList.map((b: {name: string;}) => b.name).filter(Boolean);
          setDepartments(names);
        }
      } catch (e) {

      }
    };
    fetchDepartments();
  }, []);



  useEffect(() => {
    const fetchUsers = async () => {
      if (!isAnyFilterActive) {
        setUsers([]);
        setTotalUsers(0);
        setTotalPages(0);
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);
      try {
        // Prepare filter parameters
        const filterParams: {page: number;page_size: number;role?: string;is_active?: boolean;search?: string;department?: string;} = {
          page: currentPage,
          page_size: pageSize
        };
        // Debug: show filter params


        // Add role filter if selected
        if (roleFilter) {
          filterParams.role = roleMap[roleFilter];
        }

        // Add department filter if selected
        if (departmentFilter) {
          filterParams.department = departmentFilter;
        }
        // Add search filter if provided
        if (appliedSearch.trim()) {
          filterParams.search = appliedSearch.trim();
        }
        const response = await manageUsers(filterParams);

        // Handle invalid page due to filter changes
        if (!response.success && response.message && response.message.includes("Invalid page")) {
          setCurrentPage(1);
          return;
        }

        // Check if the response has the expected structure
        const hasResults = response && typeof response === 'object' && 'results' in response;
        const dataSource = hasResults ? (response as any).results : response as any;

        if (response && response.success) {
          // Handle paginated response format where data is nested under results
          const usersData = dataSource.users || [];
          const paginationData = response as any;

          // Transform backend user data to frontend format
          const transformedUsers = Array.isArray(usersData) ? usersData.map((user: any) => ({
            id: user.id,
            name: `${user.first_name || ""} ${user.last_name || ""}`.trim() || user.username || "N/A",
            email: user.email || "N/A",
            role: user.role || "N/A",
            status: user.is_active ? "Active" : "Inactive",
            username: user.username || "",
            department: user.department || "N/A",
            extra: user.extra || {}
          })) : [];

          setUsers(transformedUsers);

          const count = paginationData.count || dataSource && dataSource.count;
          if (count !== undefined) {
            setTotalUsers(count);
            const calculatedTotalPages = Math.ceil(count / pageSize);
            setTotalPages(calculatedTotalPages);

            // Reset to page 1 if current page exceeds total pages
            if (currentPage > calculatedTotalPages && calculatedTotalPages > 0) {
              setCurrentPage(1);
            }
          }
        } else {
          setError(dataSource?.message || "Failed to fetch users");
          toast({
            variant: "destructive",
            title: "Error",
            description: dataSource?.message || "Failed to fetch users"
          });
        }
      } catch (err) {

        setError("Network error");
        toast({
          variant: "destructive",
          title: "Error",
          description: "Network error"
        });
      } finally {
        setLoading(false);
      }
    };
    fetchUsers();
  }, [setError, toast, currentPage, roleFilter, departmentFilter, pageSize, appliedSearch]);

  const filteredUsers = Array.isArray(users) ? users : [];

  const handleEdit = (user: User) => {
    setEditingId(user.id);
    setEditData({ ...user }); // Include original username in editData
  };

  const handleEditChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (editData) {
      setEditData({ ...editData, [e.target.name]: e.target.value });
    }
  };

  const saveEdit = async () => {
    if (editData) {
      setLoading(true);
      setError(null);
      try {
        const [firstName, ...lastNameParts] = editData.name.split(" ");
        const lastName = lastNameParts.join(" ");
        const originalUser = users.find((u) => u.id === editData.id);
        const username = editData.email; // Use the new email as username for login compatibility
        const updates = {
          username,
          email: editData.email,
          first_name: firstName || "",
          last_name: lastName || ""
        };
        const response = await manageUserAction({
          user_id: editData.id.toString(),
          action: "edit",
          updates
        });
        if (response.success) {
          // Update local state with returned user data instead of making another GET call
          if (response.user) {
            setUsers((prevUsers) =>
            prevUsers.map((user) =>
            user.id === editData.id ?
            {
              ...user,
              name: `${response.user.first_name || ""} ${response.user.last_name || ""}`.trim() || response.user.username || "N/A",
              email: response.user.email || "N/A",
              role: response.user.role || "N/A",
              status: response.user.is_active ? "Active" : "Inactive",
              username: response.user.username || ""
            } :
            user
            )
            );
          }
          setEditingId(null);
          setEditData(null);
          toast({ title: "Success", description: "User updated successfully" });
        } else {
          setError(response.message || "Failed to update user");
          toast({
            variant: "destructive",
            title: "Error",
            description: response.message || "Failed to update user"
          });
        }
      } catch (err) {

        setError("Network error");
        toast({
          variant: "destructive",
          title: "Error",
          description: "Network error"
        });
      } finally {
        setLoading(false);
      }
    }
  };

  const confirmDelete = async (id: number) => {
    const currentTheme = theme === 'dark' ? 'dark' : 'light';
    const result = await Swal.fire({
      title: 'Confirm Deletion',
      text: 'Are you sure you want to delete this user? This action cannot be undone.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#3b82f6',
      confirmButtonText: 'Yes, delete!',
      background: currentTheme === 'dark' ? '#1f2937' : '#fff',
      color: currentTheme === 'dark' ? '#fff' : '#000'
    });

    if (result.isConfirmed) {
      deleteUser(id);
    }
  };

  const deleteUser = async (id: number) => {
    setLoading(true);
    setError(null);
    try {
      const response = await manageUserAction({
        user_id: id.toString(),
        action: "delete"
      });
      if (response.success) {
        // Remove deleted user from local state instead of making another GET call
        setUsers((prevUsers) => prevUsers.filter((user) => user.id !== id));
        setTotalUsers((prevTotal) => prevTotal - 1);

        // If we deleted the last item on the page and it's not the first page, go to previous page
        if (users.length === 1 && currentPage > 1) {
          setCurrentPage(currentPage - 1);
        }

        toast({ title: "Success", description: "User deleted successfully" });
      } else {
        setError(response.message || "Failed to delete user");
        toast({
          variant: "destructive",
          title: "Error",
          description: response.message || "Failed to delete user"
        });
      }
    } catch (err) {
      setError("Network error");
      toast({
        variant: "destructive",
        title: "Error",
        description: "Network error"
      });
    } finally {
      setLoading(false);
    }
  };

  const savePromote = async () => {
    if (promoteData && selectedNewRole) {
      setLoading(true);
      setError(null);
      try {
        const response = await manageUserAction({
          user_id: promoteData.id.toString(),
          action: "promote",
          updates: { role: selectedNewRole }
        });
        if (response.success) {
          if (response.user) {
            setUsers((prevUsers) =>
              prevUsers.map((user) =>
                user.id === promoteData.id ? {
                  ...user,
                  role: response.user?.role || user.role,
                  status: response.user?.is_active ? "Active" : "Inactive"
                } : user
              )
            );
          }
          setPromoteData(null);
          setSelectedNewRole("");
          setPromoteConfirmText("");
          setPromoteStep(1);
          toast({ title: "Success", description: "User promoted successfully" });
        } else {
          setError(response.message || "Failed to promote user");
          toast({ variant: "destructive", title: "Error", description: response.message || "Failed to promote user" });
        }
      } catch (err) {
        setError("Network error");
        toast({ variant: "destructive", title: "Error", description: "Network error" });
      } finally {
        setLoading(false);
      }
    }
  };

  const SelectMenu = ({
    label,
    placeholder,
    value,
    onChange,
    options,
    triggerId,
    disabled
  }: {
    label: string;
    placeholder?: string;
    value: string;
    onChange: (val: string) => void;
    options: string[];
    triggerId?: string;
    disabled?: boolean;
  }) => (
    <div className="flex flex-col">
      {label && <label className={`text-sm mb-1 ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-600'}`}>{label}</label>}
      <Select value={value || undefined} onValueChange={onChange} disabled={disabled}>
        <SelectTrigger id={triggerId} className={cn(
          theme === 'dark' ? 'w-full bg-card text-foreground border border-border' : 'w-full bg-white text-gray-900 border border-gray-300',
          disabled && "opacity-50 cursor-not-allowed"
        )}>
          <SelectValue placeholder={placeholder || label} />
        </SelectTrigger>
        <SelectContent className={theme === 'dark' ? 'bg-card text-foreground border border-border max-h-[200px] overflow-y-auto custom-scrollbar' : 'bg-white text-gray-900 border border-gray-300 max-h-[200px] overflow-y-auto custom-scrollbar'}>
          {options.map((opt) => (
            <SelectItem key={opt} value={opt}>
              {opt}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );


  if (loading && users.length === 0) {
    return (
      <div className="space-y-6">
        <SkeletonPageHeader />
        <SkeletonTable rows={10} cols={5} />
      </div>);

  }

  return (
    <>
      <style>{`
        @media (max-width: 480px) {
          .users-card { border-radius: 12px; }
          .users-card-header { padding: 16px; }
          .users-card-title { font-size: 24px; font-weight: 600; line-height: 1.2; }
          .users-card-desc { font-size: 16px; margin-top: 4px; }
          .users-card-content { padding: 16px; }
          .users-card-content.pb-0 { padding-bottom: 0 !important; }
          .users-card-content.pt-0 { padding-top: 0 !important; }
          .filters-search { gap: 16px; }
          .filter-label { font-size: 16px; font-weight: 600; margin-bottom: 6px; text-transform: none; letter-spacing: normal; }
          .search-wrapper { gap: 10px; }
          .search-input { font-size: 14px; }
          .table-wrapper { border-radius: 6px; }
          .users-table { font-size: 14px; }
          /* Keep table layout on small screens to avoid card-like rendering */
          .users-table { display: table !important; table-layout: auto !important; width: 100% !important; }
          .users-table thead, .users-table tbody { display: table-row-group !important; }
          .users-table tr { display: table-row !important; }
          .users-table th, .users-table td { display: table-cell !important; }
          .table-wrapper { overflow-x: auto; -webkit-overflow-scrolling: touch; }
          .table-header th { font-size: 16px; font-weight: 600; padding: 12px 10px !important; white-space: nowrap; }
          .table-cell { padding: 12px 10px !important; font-size: 16px; white-space: nowrap; }
          .action-buttons { gap: 4px; }
          .pagination-container { gap: 8px; flex-direction: column; align-items: center; }
          .pagination-info { font-size: 12px; }
          .pagination-controls { gap: 4px; }
          .pagination-btn { padding: 6px 10px !important; font-size: 12px !important; }
          .delete-modal { width: 90vw !important; max-width: 320px !important; padding: 16px !important; }
          .delete-modal-title { font-size: 20px; line-height: 1.3; }
          .delete-modal-body { font-size: 14px; line-height: 1.5; margin: 12px 0; }
          .delete-modal-buttons { gap: 8px; flex-direction: column; }
          .delete-modal-btn { width: 100% !important; padding: 10px 12px !important; font-size: 13px !important; }
        }
      `}</style>
      <div className={`users-container text-sm sm:text-base max-w-none mx-auto ${theme === 'dark' ? 'bg-background' : 'bg-gray-50'}`}>
        <Card id="users-management-card" className={`users-card ${theme === 'dark' ? 'bg-card border border-border' : 'bg-white border border-gray-200'}`}>
          <div id="users-management-header-filters">
            <CardHeader className="users-card-header flex flex-row items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <CardTitle className={`users-card-title ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>User Management</CardTitle>
                <p className={`users-card-desc ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}`}>Manage all users in the system</p>
              </div>
              
              {/* Desktop Download CSV Button */}
              <Button
                onClick={handleDownloadCSV}
                className="hidden md:flex gap-2 items-center dark:bg-zinc-800 dark:text-zinc-100 dark:hover:bg-zinc-700 bg-white text-zinc-900 border border-zinc-200 hover:bg-zinc-100"
                variant="outline"
                size="sm"
                disabled={downloadingCSV}
              >
                {downloadingCSV ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Download className="h-4 w-4" />
                )}
                {downloadingCSV ? "Exporting..." : "Export CSV"}
              </Button>
            </CardHeader>
             <CardContent className="users-card-content pb-0">
              <div className="filters-search flex flex-col xl:flex-row xl:items-end justify-between gap-8 mb-2 sm:mb-10">
                {/* Filters Section */}
                <div className="flex-1 w-full">
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-end gap-3 sm:gap-6 w-full max-w-4xl">
                    <div className="flex flex-col gap-2 flex-1 min-w-0 w-full">
                      <span className={`filter-label text-[10px] sm:text-[11px] font-bold uppercase tracking-widest truncate ${theme === 'dark' ? 'text-muted-foreground/70' : 'text-gray-400'}`}>User Role</span>
                      <SelectMenu
                        label=""
                        placeholder="Choose Role"
                        value={roleFilter}
                        onChange={handleRoleFilterChange}
                        options={roles} />
                      
                    </div>

                    <div className="flex flex-col gap-2 flex-1 min-w-0">
                      <span className={`filter-label text-[10px] sm:text-[11px] font-bold uppercase tracking-widest truncate ${theme === 'dark' ? 'text-muted-foreground/70' : 'text-gray-400'}`}>Department</span>
                      <SelectMenu
                        label=""
                        placeholder="Choose Department"
                        value={departmentFilter}
                        onChange={setDepartmentFilter}
                        options={departments}
                        triggerId="dept-select-trigger"
                        disabled={roleFilter !== "" && !rolesNeedingDept.includes(roleFilter)} />
                      
                    </div>
                  </div>
                </div>
                {/* Search Section */}
                <div className="w-full xl:w-auto xl:min-w-[320px]">
                  <div className="flex flex-col gap-2">
                    <label className={`filter-label text-[11px] font-bold uppercase tracking-widest ${theme === 'dark' ? 'text-muted-foreground/70' : 'text-gray-400'}`}>Global Search</label>
                    <div className="search-wrapper flex gap-2">
                      <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 opacity-40" />
                        <Input
                          placeholder="Search name, email or USN..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className={`search-input h-10 w-full pl-10 pr-12 rounded-md shadow-sm ${theme === 'dark' ? 'bg-card border-border text-foreground' : 'bg-white border-gray-300 text-gray-900 focus:border-blue-500'}`} />
                        {searchQuery && (
                          <button
                            onClick={() => setSearchQuery("")}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-primary hover:text-primary/80 transition-colors"
                          >
                            Clear
                          </button>
                        )}
                      </div>
                      {/* Mobile Download CSV Icon Button */}
                      <Button
                        onClick={handleDownloadCSV}
                        variant="outline"
                        size="icon"
                        className="flex md:hidden dark:bg-zinc-800 dark:text-zinc-100 dark:hover:bg-zinc-700 bg-white text-zinc-900 border border-zinc-200"
                        disabled={downloadingCSV}
                      >
                        {downloadingCSV ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </div>

          <CardContent className="users-card-content pt-0">
            {(() => {
              if (!isAnyFilterActive) {
                const needsDept = rolesNeedingDept.includes(roleFilter) && departmentFilter === "";

                return (
                  <div className={`flex flex-col items-center justify-center py-20 px-4 rounded-lg border-2 border-dashed ${theme === 'dark' ? 'border-border bg-card/30' : 'border-gray-200 bg-gray-50/50'}`}>
                  <div className={`p-4 rounded-full mb-4 ${theme === 'dark' ? 'bg-primary/10' : 'bg-primary/5'}`}>
                    <Search className="w-10 h-10 text-primary opacity-50" />
                  </div>
                  <h3 className={`text-lg font-semibold mb-2 ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>
                    {needsDept ? "Department Selection Required" : "Ready to manage users?"}
                  </h3>
                  <p className={`text-center max-w-sm ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}`}>
                    {needsDept ?
                      <>Please select a <strong>Department</strong> to view all {roleFilter}s.</> :

                      <>Select a <strong>User Role</strong> or <strong>Department</strong> above to load the user list.</>
                      }
                  </p>
                </div>);

              }

              if (loading) {
                return (
                  <div className="table-wrapper block overflow-x-auto custom-scrollbar">
                    <SkeletonTable rows={pageSize} cols={6} />
                  </div>
                );
              }

              if (filteredUsers.length === 0) {
                return (
                  <div className={`flex flex-col items-center justify-center py-20 px-4 rounded-lg border-2 border-dashed ${theme === 'dark' ? 'border-border bg-card/30' : 'border-gray-200 bg-gray-50/50'}`}>
                    <div className={`p-4 rounded-full mb-4 ${theme === 'dark' ? 'bg-primary/10' : 'bg-primary/5'}`}>
                      <Search className="w-10 h-10 text-primary opacity-50" />
                    </div>
                    <h3 className={`text-lg font-semibold mb-2 ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>
                      No Users Found
                    </h3>
                    <p className={`text-center max-w-sm ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}`}>
                      We couldn't find any users matching the selected criteria. Try adjusting your filters or search query.
                    </p>
                  </div>
                );
              }

              return (
                <div className="table-wrapper block overflow-x-auto custom-scrollbar    ">
                  <table className="users-table w-full text-left">
                    <thead className={`table-header border-b ${theme === 'dark' ? 'border-border text-foreground' : 'border-gray-200 text-gray-900'}`}>
                      <tr>
                        <th className="py-2 px-4 sm:w-[200px]">Full Name</th>
                        <th className="py-2 px-1 md:w-[200px]">Email</th>
                        <th className="py-2 px-1 md:w-[120px]">Role</th>
                        <th className="py-2 px-1 md:w-[250px]">Department</th>
                        <th className="py-2 px-1 md:w-[120px]">Status</th>
                        <th className="py-2 px-1 text-right md:w-[120px]">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredUsers.map((user) =>
                        <tr
                          key={user.id}
                          className={`table-row border-b transition-colors duration-200 ${
                            theme === 'dark' ?
                              'border-border hover:bg-accent' :
                              'border-gray-200 hover:bg-gray-50'
                          }`}
                        >
                          <td className="table-cell py-2 px-1 whitespace-nowrap md:w-[200px]">
                            {user.name}
                          </td>
                          <td className="table-cell py-2 px-1 whitespace-nowrap md:w-[200px]">
                            {user.email}
                          </td>
                          <td className="table-cell py-2 px-1 whitespace-nowrap md:w-[120px]">{getRoleBadge(user.role, theme)}</td>
                          <td className="table-cell py-2 px-1 whitespace-nowrap md:w-[250px]">
                            <span className={`text-sm font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                              {user.department !== "N/A" ? user.department : "-"}
                            </span>
                          </td>
                          <td className="table-cell py-2 px-1 whitespace-nowrap md:w-[120px]">{getStatusBadge(user.status, theme)}</td>
                          <td className="table-cell py-2 px-1 text-right">
                            <div className="action-buttons whitespace-nowrap justify-end gap-2">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => { setPromoteData(user); setSelectedNewRole(""); setPromoteStep(1); }}
                                disabled={loading || (user.role !== 'teacher' && user.role !== 'hod')}
                                className={theme === 'dark' ?
                                  'p-2 rounded hover:bg-accent' :
                                  'p-2 rounded hover:bg-gray-100'}
                                title="Promote Role">
                                <ArrowUpCircle className={theme === 'dark' ? 'w-5 h-5 text-purple-400' : 'w-5 h-5 text-purple-500'} />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleEdit(user)}
                                disabled={loading}
                                className={theme === 'dark' ?
                                  'p-2 rounded hover:bg-accent' :
                                  'p-2 rounded hover:bg-gray-100'}>
                                <Pencil1Icon className={theme === 'dark' ? 'w-5 h-5 text-primary' : 'w-5 h-5 text-blue-500'} />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => confirmDelete(user.id)}
                                disabled={loading}
                                className={theme === 'dark' ?
                                  'p-2 rounded hover:bg-accent' :
                                  'p-2 rounded hover:bg-gray-100'}>
                                <TrashIcon className={theme === 'dark' ? 'w-5 h-5 text-destructive' : 'w-5 h-5 text-red-500'} />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              );

            })()}

          {/* Mobile: show table only; compact card list removed */}

        </CardContent>
        {totalPages > 1 &&
          <CardFooter className="flex flex-col sm:flex-row justify-between items-center gap-4 text-sm text-muted-foreground px-6 py-4 border-t border-border mt-auto">
            <div>
              Showing {(currentPage - 1) * pageSize + 1} to {Math.min(currentPage * pageSize, totalUsers)} of {totalUsers} users
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                disabled={currentPage === 1 || loading}
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
                onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages || loading}
                className="bg-primary hover:bg-primary/90 text-white border-primary h-9 px-4 transition-all">
                Next
              </Button>
            </div>
          </CardFooter>
        }
      </Card>
      </div>

      <Dialog open={editingId !== null} onOpenChange={(open) => !open && (setEditingId(null) || setEditData(null))}>
        <DialogContent
          className={
          theme === 'dark' ?
          'bg-card border border-border text-foreground w-[92%] max-w-[420px] sm:max-w-md rounded-lg mx-auto' :
          'bg-white border border-gray-200 text-gray-900 w-[92%] max-w-[420px] sm:max-w-md rounded-lg mx-auto'
          }>
          <DialogHeader>
            <DialogTitle className={theme === 'dark' ? 'text-foreground' : 'text-gray-900'}>Edit User Details</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className={`text-sm font-medium ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-600'}`}>Full Name</label>
              <Input
                name="name"
                value={editData?.name || ""}
                onChange={handleEditChange}
                className={theme === 'dark' ? 'bg-card text-foreground' : 'bg-white text-gray-900'}
              />
            </div>
            <div className="space-y-2">
              <label className={`text-sm font-medium ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-600'}`}>Email</label>
              <Input
                name="email"
                value={editData?.email || ""}
                onChange={handleEditChange}
                className={theme === 'dark' ? 'bg-card text-foreground' : 'bg-white text-gray-900'}
              />
            </div>
          </div>
          <DialogFooter className="flex flex-row justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => { setEditingId(null); setEditData(null); }}
              disabled={loading}
              className={theme === 'dark' ? 'text-foreground bg-card border border-border hover:bg-accent' : 'text-gray-700 bg-white border border-gray-300 hover:bg-gray-50'}
            >
              Cancel
            </Button>
            <Button
              onClick={saveEdit}
              disabled={loading}
              className="bg-primary text-white hover:bg-primary/90"
            >
              {loading ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={promoteData !== null} onOpenChange={(open) => { if(!open) { setPromoteData(null); setSelectedNewRole(""); setPromoteConfirmText(""); setPromoteStep(1); }}}>
        <DialogContent
          className={
          theme === 'dark' ?
          'bg-card border border-border text-foreground w-[92%] max-w-[420px] sm:max-w-md rounded-lg mx-auto' :
          'bg-white border border-gray-200 text-gray-900 w-[92%] max-w-[420px] sm:max-w-md rounded-lg mx-auto'
          }>
          <DialogHeader>
            <DialogTitle className={theme === 'dark' ? 'text-foreground' : 'text-gray-900'}>
              {promoteStep === 1 ? 'Promote / Change Role' : 'Confirm Promotion'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {promoteStep === 1 ? (
              <>
                <p className={`text-sm ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}`}>
                  Select a new role for <strong>{promoteData?.name}</strong>. Their current role is <strong>{promoteData?.role}</strong>.
                </p>
                <div className="space-y-2">
                  <label className={`text-sm font-medium ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-600'}`}>New Role</label>
                  <SelectMenu
                    label=""
                    placeholder="Choose New Role"
                    value={Object.keys(roleMap).find(key => roleMap[key] === selectedNewRole) || ""}
                    onChange={(val) => setSelectedNewRole(roleMap[val])}
                    options={roles.filter(r => {
                      if (promoteData?.role === 'teacher' && roleMap[r] === 'hod') return true;
                      if (promoteData?.role === 'hod' && roleMap[r] === 'principal') return true;
                      return false;
                    })}
                  />
                </div>
                <div className={`p-3 text-xs rounded-md ${theme === 'dark' ? 'bg-primary/10 text-primary-foreground border border-primary/20' : 'bg-blue-50 text-blue-800 border border-blue-100'}`}>
                  <strong>Note:</strong> Promoting a user will automatically log them out and notify them via email. If promoting a Teacher or HOD, their current class assignments or branch leadership will be unassigned automatically.
                </div>
              </>
            ) : (
              <>
                <div className={`p-3 text-xs rounded-md ${theme === 'dark' ? 'bg-red-500/10 text-red-400 border border-red-500/20' : 'bg-red-50 text-red-600 border border-red-200'}`}>
                  <strong>Warning:</strong> This action is irreversible. Please confirm you want to proceed.
                </div>
                <div className="space-y-2">
                  <label className={`text-sm font-medium ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-600'}`}>
                    Type <strong>promote</strong> to confirm
                  </label>
                  <Input
                    value={promoteConfirmText}
                    onChange={(e) => setPromoteConfirmText(e.target.value)}
                    placeholder="Type promote here"
                    className={`w-full ${theme === 'dark' ? 'bg-background border-border text-foreground' : 'bg-white border-gray-300 text-gray-900'}`}
                  />
                </div>
              </>
            )}
          </div>
          <DialogFooter className="flex flex-row justify-end gap-2">
            {promoteStep === 1 ? (
              <>
                <Button
                  variant="outline"
                  onClick={() => { setPromoteData(null); setSelectedNewRole(""); setPromoteConfirmText(""); setPromoteStep(1); }}
                  disabled={loading}
                  className={theme === 'dark' ? 'text-foreground bg-card border border-border hover:bg-accent' : 'text-gray-700 bg-white border border-gray-300 hover:bg-gray-50'}
                >
                  Cancel
                </Button>
                <Button
                  onClick={() => setPromoteStep(2)}
                  disabled={loading || !selectedNewRole}
                  className="bg-purple-600 hover:bg-purple-700 text-white"
                >
                  Next
                </Button>
              </>
            ) : (
              <>
                <Button
                  variant="outline"
                  onClick={() => setPromoteStep(1)}
                  disabled={loading}
                  className={theme === 'dark' ? 'text-foreground bg-card border border-border hover:bg-accent' : 'text-gray-700 bg-white border border-gray-300 hover:bg-gray-50'}
                >
                  Back
                </Button>
                <Button
                  onClick={savePromote}
                  disabled={loading || promoteConfirmText !== 'promote'}
                  className="bg-purple-600 hover:bg-purple-700 text-white"
                >
                  {loading ? "Promoting..." : "Promote"}
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>);

};

export default UsersManagement;