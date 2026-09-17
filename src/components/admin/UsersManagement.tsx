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
import { Search, Loader2, Download, ArrowUpCircle, ArrowDownCircle, Eye } from "lucide-react";
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
  DialogTitle
} from
  "../ui/dialog";
import { manageUsers, manageUserAction, getBranchesWithHODs, manageAdminProfile } from "../../utils/admin_api";
import { useToast } from "../../hooks/use-toast";
import { useTheme } from "../../context/ThemeContext";
import { PLAN_TIERS } from "../../utils/planGating";
import { translateTerminology, getInstitutionType } from "../../utils/institutionConfig";
import { SkeletonTable, SkeletonPageHeader } from "../ui/skeleton";

interface User {
  id: number;
  name: string;
  first_name?: string;
  last_name?: string;
  email: string;
  role: string;
  designation?: string;
  status: string;
  username?: string; // Added to store original username
  department?: string;
  extra?: { usn?: string; branch?: string; branches?: string[]; };
  mobile?: string;
}

interface UsersManagementProps {
  setError: (error: string | null) => void;
  toast: (options: { variant?: string; title: string; description: string; }) => void;
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

const displayRoleMap: Record<string, string> = {
  "student": "Student",
  "hod": "Head of Department",
  "teacher": "Teacher",
  "group_d": "Group D",
  "security": "Security",
  "coe": "COE",
  "fees_manager": "Fees Manager",
  "principal": "Principal",
  "org_admin": "Org Admin",
  "hms_admin": "HMS",
  "warden": "Warden",
  "dean": "Dean",
  "placement_officer": "Placement Officer",
  "transport_admin": "Transport Admin",
  "library_admin": "Library Admin",
  "inventory_manager": "Inventory Manager",
  "admission_manager": "Admission Manager",
  "counsellor": "Admission Counsellor",
  "driver": "Driver"
};

const getRoleBadge = (role: string, theme: string) => {
  const displayRole = displayRoleMap[role] || role;
  return (
    <span className={`px-3 py-1 rounded-full text-xs font-medium ${theme === 'dark' ? 'bg-gray-700 text-gray-200' : 'bg-gray-200 text-gray-800'}`}>
      {translateTerminology(displayRole)}
    </span>);
};

const ALL_ROLES = [
  "Student",
  "Head of Department",
  "Teacher",
  "Group D",
  "Security",
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
  "Inventory Manager",
  "Admission Manager",
  "Admission Counsellor",
  "Driver"
];

const BASIC_PLAN_ROLES = [
  "Org Admin",
  "Principal",
  "Head of Department",
  "Teacher",
  "Group D",
  "Security",
  "Student",
  "Dean",
  "Admission Counsellor",
  "Driver"
];

const PRO_PLAN_ROLES = [
  "Org Admin",
  "Principal",
  "Head of Department",
  "Teacher",
  "Group D",
  "Security",
  "Student",
  "Dean",
  "COE",
  "Fees Manager",
  "Admission Counsellor",
  "Driver"
];

const roleMap: Record<string, string> = {
  "Student": "student",
  "Head of Department": "hod",
  "Teacher": "teacher",
  "Group D": "group_d",
  "Security": "security",
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
  "Inventory Manager": "inventory_manager",
  "Admission Manager": "admission_manager",
  "Admission Counsellor": "counsellor",
  "Driver": "driver"
};

const UsersManagement = ({ setError, toast }: UsersManagementProps) => {
  const [users, setUsers] = useState<User[]>([]);
  const [roleFilter, setRoleFilter] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [departments, setDepartments] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState(""); // input value
  const [appliedSearch, setAppliedSearch] = useState(""); // applied term
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editData, setEditData] = useState<User | null>(null);
  const [promoteData, setPromoteData] = useState<User | null>(null);
  const [roleChangeAction, setRoleChangeAction] = useState<"promote" | "demote">("promote");
  const [selectedNewRole, setSelectedNewRole] = useState<string>("");
  const [promoteConfirmText, setPromoteConfirmText] = useState("");
  const [promoteStep, setPromoteStep] = useState<1 | 2>(1);
  const [loading, setLoading] = useState(true);
  const [initialLoad, setInitialLoad] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalUsers, setTotalUsers] = useState(0);
  const [pageSize] = useState(10); // Fixed page size for consistency
  const normalize = (str: string) => str.toLowerCase().trim();
  const { theme } = useTheme();

  // Profile viewing state
  const [viewingUser, setViewingUser] = useState<User | null>(null);
  const [viewProfileData, setViewProfileData] = useState<any | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);

  const handleViewProfile = async (user: User) => {
    setViewingUser(user);
    setViewProfileData(null);
    setLoadingProfile(true);
    setIsViewModalOpen(true);
    try {
      const response = await manageAdminProfile({ user_id: user.id }, 'GET');
      if (response.success && response.profile) {
        setViewProfileData(response.profile);
      } else {
        toast({
          variant: "destructive",
          title: "Error",
          description: response.message || "Failed to load user profile."
        });
      }
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: err.message || "Failed to fetch user profile."
      });
    } finally {
      setLoadingProfile(false);
    }
  };
  const [downloadingCSV, setDownloadingCSV] = useState(false);

  const userStr = sessionStorage.getItem("user") || localStorage.getItem("user");
  const user = userStr ? JSON.parse(userStr) : null;
  const orgPlan = user?.org_plan || "basic";
  const userTier = PLAN_TIERS[orgPlan.toLowerCase()] || 1;
  const baseRoles = userTier >= 3 ? ALL_ROLES : userTier === 2 ? PRO_PLAN_ROLES : BASIC_PLAN_ROLES;
  const roles = getInstitutionType() === 'school' ? baseRoles.filter(r => r !== "Placement Officer") : baseRoles;

  const rolesNeedingDept = ["Head of Department", "Teacher", "Student"];
  const isAnyFilterActive =
    (roleFilter !== "" && (!rolesNeedingDept.includes(roleFilter) || departmentFilter !== "")) ||
    (roleFilter === "" && departmentFilter !== "") ||
    statusFilter !== "All" ||
    appliedSearch !== "";

  const handleDownloadCSV = async () => {
    setDownloadingCSV(true);
    try {
      let queryParams = `?page_size=5000`;
      if (roleFilter) {
        queryParams += `&role=${roleMap[roleFilter]}`;
      }
      if (departmentFilter && departmentFilter !== "All Branches") {
        queryParams += `&department=${encodeURIComponent(departmentFilter)}`;
      }
      if (statusFilter !== "All") {
        queryParams += `&is_active=${statusFilter === "Active"}`;
      }
      if (appliedSearch.trim()) {
        queryParams += `&search=${encodeURIComponent(appliedSearch.trim())}`;
      }

      const roleStr = roleFilter ? roleFilter.replace(/ /g, '_') : 'All_Roles';
      const deptStr = (departmentFilter && departmentFilter !== "All Branches") ? departmentFilter.replace(/ /g, '_') : 'All_Departments';
      const statusStr = statusFilter ? statusFilter : 'All_Status';
      const fileName = `${roleStr}_${deptStr}_${statusStr}.csv`;

      const url = `${API_ENDPOINT}/admin/users/export-csv/${queryParams}`;
      await downloadFile(url, fileName);
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
  }, [roleFilter, departmentFilter, appliedSearch, statusFilter]);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setAppliedSearch(searchQuery.trim());
    }, 500);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Clear search query when dropdown filters change
  useEffect(() => {
    if (roleFilter || departmentFilter || statusFilter !== "All") {
      setSearchQuery("");
      setAppliedSearch("");
    }
  }, [roleFilter, departmentFilter, statusFilter]);

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
          const names = branchList.map((b: { name: string; }) => b.name).filter(Boolean);
          setDepartments(["All Branches", ...names]);
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
        setInitialLoad(false);
        return;
      }

      setLoading(true);
      setError(null);
      try {
        // Prepare filter parameters
        const filterParams: { page: number; page_size: number; role?: string; is_active?: boolean; search?: string; department?: string; } = {
          page: currentPage,
          page_size: pageSize
        };
        // Debug: show filter params


        // Add role filter if selected
        if (roleFilter) {
          filterParams.role = roleMap[roleFilter];
        }

        // Add department filter if selected and not 'All Branches'
        if (departmentFilter && departmentFilter !== "All Branches") {
          filterParams.department = departmentFilter;
        }
        // Add status filter if selected
        if (statusFilter !== "All") {
          filterParams.is_active = statusFilter === "Active";
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
            first_name: user.first_name || "",
            last_name: user.last_name || "",
            email: user.email || "N/A",
            role: user.role || "N/A",
            designation: user.designation || "",
            status: user.is_active ? "Active" : "Inactive",
            username: user.username || "",
            department: user.department || "N/A",
            extra: user.extra || {},
            mobile: user.mobile_number || "",
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
        setInitialLoad(false);
      }
    };
    fetchUsers();
  }, [setError, toast, currentPage, roleFilter, departmentFilter, statusFilter, pageSize, appliedSearch]);

  const filteredUsers = Array.isArray(users) ? users : [];

  const handleEdit = (user: User) => {
    setEditingId(user.id);
    let fName = user.first_name || "";
    let lName = user.last_name || "";
    if (!fName && user.name && user.name !== "N/A") {
      const parts = user.name.split(" ");
      fName = parts[0] || "";
      lName = parts.slice(1).join(" ");
    }
    setEditData({
      ...user,
      first_name: fName,
      last_name: lName,
      mobile: user.mobile || "",
      designation: user.designation || ""
    });
  };

  const handleEditChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (editData) {
      setEditData({ ...editData, [e.target.name]: e.target.value });
    }
  };

  const saveEdit = async () => {
    if (editData) {
      const currentTheme = theme === 'dark' ? 'dark' : 'light';
      const roleLabel = Object.keys(roleMap).find(k => roleMap[k] === editData.role) || editData.role;
      const firstName = (editData.first_name || "").trim();
      const lastName = (editData.last_name || "").trim();
      const designation = (editData.designation || "").trim();
      const email = editData.email.trim();
      const phone = (editData.mobile || "").trim();

      const bgCard = currentTheme === 'dark' ? '#1e293b' : '#f8fafc';
      const borderCol = currentTheme === 'dark' ? '#334155' : '#e2e8f0';
      const textMuted = currentTheme === 'dark' ? '#94a3b8' : '#64748b';
      const textBold = currentTheme === 'dark' ? '#f1f5f9' : '#0f172a';

      const result = await Swal.fire({
        title: 'Confirm Changes',
        html: `
          <div style="text-align: left; margin-top: 10px; font-size: 13px;">
            <p style="margin-bottom: 12px; color: ${textMuted}; font-size: 13px;">
              Are you sure you want to save these updated details for this user?
            </p>
            <div style="background: ${bgCard}; border: 1px solid ${borderCol}; border-radius: 8px; padding: 12px 14px; line-height: 1.6;">
              <div style="display: flex; justify-content: space-between; padding: 3px 0; border-bottom: 1px dashed ${borderCol};">
                <span style="color: ${textMuted}; font-weight: 500;">Role:</span>
                <span style="color: ${textBold}; font-weight: 600;">${roleLabel || '—'}</span>
              </div>
              <div style="display: flex; justify-content: space-between; padding: 3px 0; border-bottom: 1px dashed ${borderCol};">
                <span style="color: ${textMuted}; font-weight: 500;">First Name:</span>
                <span style="color: ${textBold}; font-weight: 600;">${firstName || '—'}</span>
              </div>
              <div style="display: flex; justify-content: space-between; padding: 3px 0; border-bottom: 1px dashed ${borderCol};">
                <span style="color: ${textMuted}; font-weight: 500;">Last Name:</span>
                <span style="color: ${textBold}; font-weight: 600;">${lastName || '—'}</span>
              </div>
              <div style="display: flex; justify-content: space-between; padding: 3px 0; border-bottom: 1px dashed ${borderCol};">
                <span style="color: ${textMuted}; font-weight: 500;">Designation:</span>
                <span style="color: ${textBold}; font-weight: 600;">${designation || '—'}</span>
              </div>
              <div style="display: flex; justify-content: space-between; padding: 3px 0; border-bottom: 1px dashed ${borderCol};">
                <span style="color: ${textMuted}; font-weight: 500;">Email:</span>
                <span style="color: ${textBold}; font-weight: 600;">${email || '—'}</span>
              </div>
              <div style="display: flex; justify-content: space-between; padding: 3px 0;">
                <span style="color: ${textMuted}; font-weight: 500;">Phone Number:</span>
                <span style="color: ${textBold}; font-weight: 600;">${phone || '—'}</span>
              </div>
            </div>
          </div>
        `,
        icon: 'question',
        showCancelButton: true,
        confirmButtonColor: '#3b82f6',
        cancelButtonColor: '#6b7280',
        confirmButtonText: 'Yes, save changes',
        cancelButtonText: 'Cancel',
        background: currentTheme === 'dark' ? '#0f172a' : '#fff',
        color: currentTheme === 'dark' ? '#fff' : '#000'
      });

      if (!result.isConfirmed) {
        return;
      }

      setLoading(true);
      setError(null);
      try {
        const firstName = (editData.first_name || "").trim();
        const lastName = (editData.last_name || "").trim();
        const username = editData.email.trim();
        const updates = {
          username,
          email: editData.email.trim(),
          first_name: firstName,
          last_name: lastName,
          designation: (editData.designation || "").trim(),
          mobile_number: (editData.mobile || "").trim(),
          role: editData.role
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
                    first_name: response.user.first_name || "",
                    last_name: response.user.last_name || "",
                    email: response.user.email || "N/A",
                    role: response.user.role || "N/A",
                    designation: response.user.designation || "",
                    mobile: response.user.mobile_number || "",
                    status: response.user.is_active ? "Active" : "Inactive",
                    username: response.user.username || ""
                  } :
                  user
              )
            );
          } else {
            // Fallback: update with local edit data
            setUsers((prevUsers) =>
              prevUsers.map((user) =>
                user.id === editData.id ?
                  {
                    ...user,
                    name: `${firstName} ${lastName}`.trim() || editData.email,
                    first_name: firstName,
                    last_name: lastName,
                    email: editData.email,
                    role: editData.role,
                    designation: editData.designation,
                    mobile: editData.mobile
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
          action: roleChangeAction,
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
          toast({ title: "Success", description: `User ${roleChangeAction}d successfully` });
        } else {
          setError(response.message || `Failed to ${roleChangeAction} user`);
          toast({ variant: "destructive", title: "Error", description: response.message || `Failed to ${roleChangeAction} user` });
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
              {translateTerminology(opt)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );


  if (initialLoad && loading) {
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
          .users-card-title { line-height: 1.2; }
          .users-card-desc { margin-top: 4px; }
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
            <CardHeader className="users-card-header border-b pb-4 flex flex-row items-center justify-between gap-4">
              <div className="flex-1 min-w-0">
                <CardTitle className={`users-card-title text-xl sm:text-2xl font-semibold ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>User Management</CardTitle>
                <p className={`users-card-desc text-sm sm:text-sm mt-1 ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}`}>Manage all users in the system</p>
              </div>

              {/* Desktop Download CSV Button */}
              <Button
                onClick={handleDownloadCSV}
                className="hidden md:flex gap-2 items-center bg-primary text-white hover:bg-primary/90 border border-primary transition-all hover:text-white"
                variant="outline"
                size="sm"
                disabled={downloadingCSV || (!roleFilter && !departmentFilter)}
              >
                {downloadingCSV ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Download className="h-4 w-4" />
                )}
                {downloadingCSV ? "Exporting..." : "Export CSV"}
              </Button>
            </CardHeader>
            <CardContent className="users-card-content pb-0 pt-3">
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
                      <span className={`filter-label text-[10px] sm:text-[11px] font-bold uppercase tracking-widest truncate ${theme === 'dark' ? 'text-muted-foreground/70' : 'text-gray-400'}`}>{translateTerminology("Department")}</span>
                      <SelectMenu
                        label=""
                        placeholder={translateTerminology("Choose Department")}
                        value={departmentFilter}
                        onChange={setDepartmentFilter}
                        options={departments}
                        triggerId="dept-select-trigger"
                        disabled={roleFilter !== "" && !rolesNeedingDept.includes(roleFilter)} />
                    </div>

                    <div className="flex flex-col gap-2 flex-1 min-w-0">
                      <span className={`filter-label text-[10px] sm:text-[11px] font-bold uppercase tracking-widest truncate ${theme === 'dark' ? 'text-muted-foreground/70' : 'text-gray-400'}`}>Status</span>
                      <SelectMenu
                        label=""
                        placeholder="Choose Status"
                        value={statusFilter}
                        onChange={setStatusFilter}
                        options={["All", "Active", "Inactive"]} />
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
                        disabled={downloadingCSV || (!roleFilter && !departmentFilter)}
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

              if (loading && users.length === 0) {
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
                <div className={cn(
                  "table-wrapper block overflow-x-auto custom-scrollbar relative",
                  loading && "opacity-60 pointer-events-none"
                )}>
                  {loading && (
                    <div className="absolute inset-0 flex items-center justify-center bg-background/30 z-10">
                      <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    </div>
                  )}
                  <table className="users-table w-full text-left">
                    <thead className={`table-header border-b ${theme === 'dark' ? 'border-border text-foreground' : 'border-gray-200 text-gray-900'}`}>
                      <tr>
                        <th className="py-2 px-4 sm:w-[200px]">Full Name</th>
                        <th className="py-2 px-1 md:w-[200px]">Email</th>
                        {roleFilter === "Student" && (
                          <th className="py-2 px-1 md:w-[150px]">{translateTerminology("USN")}</th>
                        )}
                        <th className="py-2 px-1 md:w-[120px]">Role</th>
                        <th className="py-2 px-1 md:w-[140px]">Designation</th>
                        {(roleFilter === "" || rolesNeedingDept.includes(roleFilter)) && (
                          <th className="py-2 px-1 md:w-[250px]">Department</th>
                        )}
                        <th className="py-2 px-1 md:w-[140px]">Mobile</th>
                        <th className="py-2 px-1 md:w-[120px]">Status</th>
                        <th className="py-2 px-1 text-right md:w-[120px]">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredUsers.map((user) =>
                        <tr
                          key={user.id}
                          className={`table-row border-b transition-colors duration-200 ${theme === 'dark' ?
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
                          {roleFilter === "Student" && (
                            <td className="table-cell py-2 px-1 whitespace-nowrap md:w-[150px]">
                              {user.extra?.usn || "-"}
                            </td>
                          )}
                          <td className="table-cell py-2 px-1 whitespace-nowrap md:w-[120px]">{getRoleBadge(user.role, theme)}</td>
                          <td className="table-cell py-2 px-1 whitespace-nowrap md:w-[140px] text-sm font-medium">
                            {user.designation ? (
                              <span className="text-xs px-2.5 py-0.5 rounded-md font-medium bg-muted/60 text-foreground border border-border/50">
                                {user.designation}
                              </span>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </td>
                          {(roleFilter === "" || rolesNeedingDept.includes(roleFilter)) && (
                            <td className="table-cell py-2 px-1 whitespace-nowrap md:w-[250px]">
                              <span className={`text-sm font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                                {user.department !== "N/A" ? user.department : "-"}
                              </span>
                            </td>
                          )}
                          <td className="table-cell py-2 px-1 whitespace-nowrap md:w-[140px] text-sm font-medium">
                            {user.mobile ? user.mobile : <span className="text-muted-foreground">—</span>}
                          </td>
                          <td className="table-cell py-2 px-1 whitespace-nowrap md:w-[120px]">{getStatusBadge(user.status, theme)}</td>
                          <td className="table-cell py-2 px-1 text-right">
                            <div className="action-buttons whitespace-nowrap justify-end gap-2">
                              {(user.role === 'teacher' || user.role === 'hod') && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => { setPromoteData(user); setRoleChangeAction("promote"); setSelectedNewRole(""); setPromoteStep(1); }}
                                  disabled={loading}
                                  className={theme === 'dark' ?
                                    'p-2 rounded hover:bg-accent' :
                                    'p-2 rounded hover:bg-gray-100'}
                                  title="Promote Role">
                                  <ArrowUpCircle className={theme === 'dark' ? 'w-5 h-5 text-purple-400' : 'w-5 h-5 text-purple-500'} />
                                </Button>
                              )}
                              {(user.role === 'hod' || user.role === 'principal') && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => { setPromoteData(user); setRoleChangeAction("demote"); setSelectedNewRole(""); setPromoteStep(1); }}
                                  disabled={loading}
                                  className={theme === 'dark' ?
                                    'p-2 rounded hover:bg-accent' :
                                    'p-2 rounded hover:bg-gray-100'}
                                  title="Demote Role">
                                  <ArrowDownCircle className={theme === 'dark' ? 'w-5 h-5 text-orange-400' : 'w-5 h-5 text-orange-500'} />
                                </Button>
                              )}
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleViewProfile(user)}
                                disabled={loading}
                                className={theme === 'dark' ?
                                  'p-2 rounded hover:bg-accent' :
                                  'p-2 rounded hover:bg-gray-100'}
                                title="View Profile">
                                <Eye className={theme === 'dark' ? 'w-5 h-5 text-teal-400' : 'w-5 h-5 text-teal-500'} />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleEdit(user)}
                                disabled={loading}
                                className={theme === 'dark' ?
                                  'p-2 rounded hover:bg-accent' :
                                  'p-2 rounded hover:bg-gray-100'}
                                title="Edit User">
                                <Pencil1Icon className={theme === 'dark' ? 'w-5 h-5 text-primary' : 'w-5 h-5 text-blue-500'} />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => confirmDelete(user.id)}
                                disabled={loading}
                                className={theme === 'dark' ?
                                  'p-2 rounded hover:bg-accent' :
                                  'p-2 rounded hover:bg-gray-100'}
                                title="Delete User">
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
              'bg-card border border-border text-foreground w-[92%] max-w-[500px] rounded-xl mx-auto' :
              'bg-white border border-gray-200 text-gray-900 w-[92%] max-w-[500px] rounded-xl mx-auto'
          }>
          <DialogHeader>
            <DialogTitle className={theme === 'dark' ? 'text-foreground' : 'text-gray-900'}>Edit User Details</DialogTitle>
          </DialogHeader>
          <div className="space-y-3.5 py-2">
            {/* Role Select */}
            <div className="space-y-1.5">
              <label className={`text-xs font-semibold ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-700'}`}>Role</label>
              <Select
                value={editData?.role || ""}
                onValueChange={(val) => {
                  if (editData) {
                    setEditData({ ...editData, role: val });
                  }
                }}
              >
                <SelectTrigger className={`h-9 text-xs ${theme === 'dark' ? 'bg-background border-border text-foreground' : 'bg-white text-gray-900'}`}>
                  <SelectValue placeholder="Select a role" />
                </SelectTrigger>
                <SelectContent className={theme === 'dark' ? 'bg-card border-border text-foreground' : 'bg-white'}>
                  {Object.entries(roleMap).map(([label, value]) => (
                    <SelectItem key={value} value={value} className="text-xs">
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* First Name & Last Name (Initials) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className={`text-xs font-semibold ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-700'}`}>First Name</label>
                <Input
                  name="first_name"
                  placeholder="Head of Branch/Faculty name"
                  value={editData?.first_name || ""}
                  onChange={handleEditChange}
                  className={`h-9 text-xs ${theme === 'dark' ? 'bg-background text-foreground' : 'bg-white text-gray-900'}`}
                />
              </div>
              <div className="space-y-1.5">
                <label className={`text-xs font-semibold ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-700'}`}>Last Name</label>
                <Input
                  name="last_name"
                  placeholder="initials"
                  value={editData?.last_name || ""}
                  onChange={handleEditChange}
                  className={`h-9 text-xs ${theme === 'dark' ? 'bg-background text-foreground' : 'bg-white text-gray-900'}`}
                />
              </div>
            </div>

            {/* Designation */}
            <div className="space-y-1.5">
              <label className={`text-xs font-semibold ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-700'}`}>Designation</label>
              <Input
                name="designation"
                placeholder="Enter designation"
                value={editData?.designation || ""}
                onChange={handleEditChange}
                className={`h-9 text-xs ${theme === 'dark' ? 'bg-background text-foreground' : 'bg-white text-gray-900'}`}
              />
            </div>

            {/* Email */}
            <div className="space-y-1.5">
              <label className={`text-xs font-semibold ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-700'}`}>Email</label>
              <Input
                name="email"
                type="email"
                placeholder="user@example.com"
                value={editData?.email || ""}
                onChange={handleEditChange}
                className={`h-9 text-xs ${theme === 'dark' ? 'bg-background text-foreground' : 'bg-white text-gray-900'}`}
              />
            </div>

            {/* Phone Number */}
            <div className="space-y-1.5">
              <label className={`text-xs font-semibold ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-700'}`}>Phone Number</label>
              <Input
                name="mobile"
                placeholder="Phone Number"
                value={editData?.mobile || ""}
                onChange={handleEditChange}
                className={`h-9 text-xs ${theme === 'dark' ? 'bg-background text-foreground' : 'bg-white text-gray-900'}`}
              />
            </div>
          </div>
          <DialogFooter className="flex flex-row justify-end gap-2 pt-2 border-t border-border/40">
            <Button
              variant="outline"
              size="sm"
              onClick={() => { setEditingId(null); setEditData(null); }}
              disabled={loading}
              className={theme === 'dark' ? 'text-foreground bg-card border border-border hover:bg-accent' : 'text-gray-700 bg-white border border-gray-300 hover:bg-gray-50'}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={saveEdit}
              disabled={loading}
              className="bg-primary text-white hover:bg-primary/90"
            >
              {loading ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={promoteData !== null} onOpenChange={(open) => { if (!open) { setPromoteData(null); setSelectedNewRole(""); setPromoteConfirmText(""); setPromoteStep(1); } }}>
        <DialogContent
          className={
            theme === 'dark' ?
              'bg-card border border-border text-foreground w-[92%] max-w-[420px] sm:max-w-md rounded-lg mx-auto' :
              'bg-white border border-gray-200 text-gray-900 w-[92%] max-w-[420px] sm:max-w-md rounded-lg mx-auto'
          }>
          <DialogHeader>
            <DialogTitle className={theme === 'dark' ? 'text-foreground' : 'text-gray-900'}>
              {promoteStep === 1 ? `${roleChangeAction === 'promote' ? 'Promote' : 'Demote'} / Change Role` : `Confirm ${roleChangeAction === 'promote' ? 'Promotion' : 'Demotion'}`}
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
                      if (roleChangeAction === 'promote') {
                        if (promoteData?.role === 'teacher' && roleMap[r] === 'hod') return true;
                        if (promoteData?.role === 'hod' && roleMap[r] === 'principal') return true;
                      } else {
                        if (promoteData?.role === 'hod' && roleMap[r] === 'teacher') return true;
                        if (promoteData?.role === 'principal' && roleMap[r] === 'hod') return true;
                      }
                      return false;
                    })}
                  />
                </div>
                <div className={`p-3 text-xs rounded-md ${theme === 'dark' ? 'bg-primary/10 text-primary-foreground border border-primary/20' : 'bg-blue-50 text-blue-800 border border-blue-100'}`}>
                  <strong>Note:</strong> {roleChangeAction === 'promote' ? 'Promoting' : 'Demoting'} a user will automatically log them out and notify them via email. If changing to a Teacher or HOD, their current class assignments or branch leadership will be unassigned automatically.
                </div>
              </>
            ) : (
              <>
                <div className={`p-3 text-xs rounded-md ${theme === 'dark' ? 'bg-red-500/10 text-red-400 border border-red-500/20' : 'bg-red-50 text-red-600 border border-red-200'}`}>
                  <strong>Warning:</strong> This action is irreversible. Please confirm you want to proceed.
                </div>
                <div className="space-y-2">
                  <label className={`text-sm font-medium ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-600'}`}>
                    Type <strong>{roleChangeAction}</strong> to confirm
                  </label>
                  <Input
                    value={promoteConfirmText}
                    onChange={(e) => setPromoteConfirmText(e.target.value)}
                    placeholder={`Type ${roleChangeAction} here`}
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
                  disabled={loading || promoteConfirmText !== roleChangeAction}
                  className="bg-purple-600 hover:bg-purple-700 text-white"
                >
                  {loading ? (roleChangeAction === 'promote' ? "Promoting..." : "Demoting...") : (roleChangeAction === 'promote' ? "Promote" : "Demote")}
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View User Profile Modal */}
      <Dialog open={isViewModalOpen} onOpenChange={setIsViewModalOpen}>
        <DialogContent
          className={
            theme === 'dark' ?
              'bg-card border border-border text-foreground w-[95%] max-w-[500px] sm:max-w-lg rounded-lg mx-auto p-6 max-h-[85vh] overflow-y-auto' :
              'bg-white border border-gray-200 text-gray-900 w-[95%] max-w-[500px] sm:max-w-lg rounded-lg mx-auto p-6 max-h-[85vh] overflow-y-auto'
          }>
          <DialogHeader className="pb-3 border-b border-border">
            <DialogTitle className={theme === 'dark' ? 'text-foreground flex items-center gap-2' : 'text-gray-900 flex items-center gap-2'}>
              <Eye className="h-5 w-5 text-teal-500" />
              User Profile Details
            </DialogTitle>
          </DialogHeader>

          {loadingProfile ? (
            <div className="flex flex-col items-center justify-center py-10 gap-3">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-slate-500 text-sm">Fetching user profile...</p>
            </div>
          ) : viewingUser ? (
            <div className="space-y-4 pt-4 text-sm">
              <div className="flex flex-col items-center gap-3 pb-4 border-b border-border">
                {viewProfileData?.profile_picture ? (
                  <img
                    src={viewProfileData.profile_picture}
                    alt={viewingUser.name}
                    className="w-20 h-20 rounded-full object-cover border-2 border-primary/20 shadow-sm"
                  />
                ) : (
                  <div className="w-20 h-20 rounded-full bg-primary/10 text-primary flex items-center justify-center text-2xl font-bold border border-primary/10">
                    {viewingUser.name.charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="text-center">
                  <h3 className="font-bold text-lg text-foreground">{viewingUser.name}</h3>
                  {viewProfileData?.designation && (
                    <span className="text-xs font-semibold text-primary block mt-0.5">
                      {viewProfileData.designation}
                    </span>
                  )}
                  <span className="text-xs text-muted-foreground font-medium px-2.5 py-0.5 rounded-full bg-accent mt-1.5 inline-block">
                    {viewingUser.role.toUpperCase()}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider block">Email Address</span>
                  <span className="text-foreground select-all block truncate">{viewingUser.email}</span>
                </div>
                <div className="space-y-1">
                  <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider block">Mobile Number</span>
                  <span className="text-foreground">
                    {viewProfileData?.mobile_number || viewingUser.mobile || "—"}
                  </span>
                </div>
                {viewingUser.role === 'student' && viewingUser.extra?.usn && (
                  <div className="space-y-1">
                    <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider block">{translateTerminology("USN")}</span>
                    <span className="text-foreground">{viewingUser.extra.usn}</span>
                  </div>
                )}
                {viewingUser.department && viewingUser.department !== "N/A" && (
                  <div className="space-y-1">
                    <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider block">Department</span>
                    <span className="text-foreground">{viewingUser.department}</span>
                  </div>
                )}
                {viewingUser.extra?.branch && (
                  <div className="space-y-1">
                    <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider block">Branch</span>
                    <span className="text-foreground">{viewingUser.extra.branch}</span>
                  </div>
                )}
                <div className="space-y-1">
                  <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider block">Status</span>
                  <span className="text-foreground">{viewingUser.status}</span>
                </div>

                {viewingUser.role === 'student' && (
                  <>
                    {viewProfileData?.student_details?.course && (
                      <div className="space-y-1">
                        <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider block">Course</span>
                        <span className="text-foreground">{viewProfileData.student_details.course}</span>
                      </div>
                    )}
                    {viewProfileData?.student_details?.proctor_name && (
                      <div className="space-y-1">
                        <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider block">Proctor / Mentor</span>
                        <span className="text-foreground">{viewProfileData.student_details.proctor_name}</span>
                      </div>
                    )}
                    {viewProfileData?.student_details?.parent_name && (
                      <div className="space-y-1">
                        <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider block">Parent's Name</span>
                        <span className="text-foreground">{viewProfileData.student_details.parent_name}</span>
                      </div>
                    )}
                    {viewProfileData?.student_details?.parent_contact && (
                      <div className="space-y-1">
                        <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider block">Parent's Phone</span>
                        <span className="text-foreground select-all">{viewProfileData.student_details.parent_contact}</span>
                      </div>
                    )}
                    {viewProfileData?.student_details?.blood_group && (
                      <div className="space-y-1">
                        <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider block">Blood Group</span>
                        <span className="text-foreground">{viewProfileData.student_details.blood_group}</span>
                      </div>
                    )}
                    {viewProfileData?.student_details?.mode_of_admission && (
                      <div className="space-y-1">
                        <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider block">Admission Mode</span>
                        <span className="text-foreground">{viewProfileData.student_details.mode_of_admission}</span>
                      </div>
                    )}
                  </>
                )}
              </div>

              {['teacher', 'hod'].includes(viewingUser.role) && viewProfileData?.teaching_assignments?.length > 0 && (
                <div className="space-y-2 pt-3 border-t border-border mt-2">
                  <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider block">Active Teaching Assignments</span>
                  <div className="overflow-x-auto rounded-xl border border-border bg-accent/10">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="border-b border-border bg-accent/30 text-muted-foreground font-semibold">
                          <th className="p-2">Subject</th>
                          <th className="p-2">Sem / Sec</th>
                          <th className="p-2">Branch</th>
                        </tr>
                      </thead>
                      <tbody>
                        {viewProfileData.teaching_assignments.map((assoc: any) => (
                          <tr key={assoc.id} className="border-b border-border last:border-0 hover:bg-accent/25">
                            <td className="p-2 font-medium text-foreground">{assoc.subject}</td>
                            <td className="p-2 text-foreground">{assoc.semester} - {assoc.section}</td>
                            <td className="p-2 text-foreground">{assoc.branch}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {viewProfileData?.address && (
                <div className="space-y-1 pt-2">
                  <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider block">Residential Address</span>
                  <p className="text-muted-foreground leading-relaxed bg-accent/30 p-2.5 rounded-xl border border-border">
                    {viewProfileData.address}
                  </p>
                </div>
              )}

              {viewProfileData?.bio && (
                <div className="space-y-1 pt-2">
                  <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider block">Biography</span>
                  <p className="text-muted-foreground leading-relaxed bg-accent/30 p-2.5 rounded-xl border border-border">
                    {viewProfileData.bio}
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-6 text-muted-foreground">
              No user selected.
            </div>
          )}

          <DialogFooter className="pt-4 border-t border-border mt-4">
            <Button
              type="button"
              onClick={() => setIsViewModalOpen(false)}
              className="w-full bg-primary hover:bg-primary/90 text-white rounded-lg"
            >
              Close Details
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>);

};

export default UsersManagement;