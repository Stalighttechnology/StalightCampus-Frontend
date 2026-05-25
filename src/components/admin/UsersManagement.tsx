import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import * as Select from "@radix-ui/react-select";
import { ChevronDownIcon, CheckIcon, Pencil1Icon, TrashIcon } from "@radix-ui/react-icons";
import { Search, FileDownIcon, Loader2 } from "lucide-react";
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

const roles = ["All", "Student", "Head of Department", "Teacher", "COE", "Fees Manager", "Principal", "HMS", "Warden", "Dean"];

const roleMap: Record<string, string> = {
  "Student": "student",
  "Head of Department": "hod",
  "Teacher": "teacher",
  "COE": "coe",
  "Fees Manager": "fees_manager",
  "Principal": "principal",
  "HMS": "hms_admin",
  "Warden": "warden",
  "Dean": "dean"
};

const UsersManagement = ({ setError, toast }: UsersManagementProps) => {
  const [users, setUsers] = useState<User[]>([]);
  const [roleFilter, setRoleFilter] = useState("All");
  const [departmentFilter, setDepartmentFilter] = useState("All");
  const [departments, setDepartments] = useState<string[]>(["All"]);
  const [searchQuery, setSearchQuery] = useState(""); // input value
  const [appliedSearch, setAppliedSearch] = useState(""); // applied term
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editData, setEditData] = useState<User | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalUsers, setTotalUsers] = useState(0);
  const [pageSize] = useState(10); // Fixed page size for consistency
  const normalize = (str: string) => str.toLowerCase().trim();
  const { theme } = useTheme();
  const [downloadingPDF, setDownloadingPDF] = useState(false);

  const rolesNeedingDept = ["Head of Department", "Teacher", "Student"];
  const isAnyFilterActive =
    (roleFilter !== "All" && (!rolesNeedingDept.includes(roleFilter) || departmentFilter !== "All")) ||
    (roleFilter === "All" && departmentFilter !== "All") ||
    appliedSearch !== "";

  const handleDownloadPDF = async () => {
    setDownloadingPDF(true);
    try {
      let queryParams = `?page_size=5000`;
      if (roleFilter !== "All") {
        queryParams += `&role=${roleMap[roleFilter]}`;
      }
      if (departmentFilter !== "All") {
        queryParams += `&department=${encodeURIComponent(departmentFilter)}`;
      }
      if (appliedSearch.trim()) {
        queryParams += `&search=${encodeURIComponent(appliedSearch.trim())}`;
      }

      const response = await fetchWithTokenRefresh(`${API_ENDPOINT}/admin/users/export-pdf/${queryParams}`);
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `User_List_${new Date().toISOString().slice(0, 10)}.pdf`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(url);
        toast({
          title: "Success",
          description: "User list PDF exported successfully",
        });
      } else {
        const result = await response.json().catch(() => ({}));
        toast({
          variant: "destructive",
          title: "Error",
          description: result.message || "Failed to export PDF",
        });
      }
    } catch (err) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Network error while exporting PDF",
      });
    } finally {
      setDownloadingPDF(false);
    }
  };

  // Reset current page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [roleFilter, departmentFilter, appliedSearch]);

  // Fetch departments for filter
  useEffect(() => {
    const fetchDepartments = async () => {
      try {
        const res = await getBranchesWithHODs({ page_size: 100 });
        if (res.success) {
          const dataSource = res.results || res.branches || (res as any).data || [];
          const branchList = Array.isArray(dataSource) ? dataSource : [];
          const names = branchList.map((b: {name: string;}) => b.name).filter(Boolean);
          setDepartments(["All", ...names]);
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


        // Add role filter if not "All"
        if (roleFilter !== "All") {
          filterParams.role = roleMap[roleFilter];
        }

        // Add department filter if not "All"
        if (departmentFilter !== "All") {
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

  const confirmDelete = (id: number) => {
    setDeleteId(id);
  };

  const deleteUser = async () => {
    if (deleteId !== null) {
      setLoading(true);
      setError(null);
      try {
        const response = await manageUserAction({
          user_id: deleteId.toString(),
          action: "delete"
        });
        if (response.success) {
          // Remove deleted user from local state instead of making another GET call
          setUsers((prevUsers) => prevUsers.filter((user) => user.id !== deleteId));
          setTotalUsers((prevTotal) => prevTotal - 1);

          // If we deleted the last item on the page and it's not the first page, go to previous page
          if (users.length === 1 && currentPage > 1) {
            setCurrentPage(currentPage - 1);
          }

          setDeleteId(null);
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
    }
  };

  const SelectMenu = ({
    label,
    value,
    onChange,
    options





  }: {label: string;value: string;onChange: (val: string) => void;options: string[];}) =>
  <div className="flex flex-col">
      <label className={`text-sm mb-1 ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-600'}`}>{label}</label>
      <Select.Root value={value} onValueChange={onChange}>
        <Select.Trigger className={`select-trigger inline-flex items-center justify-between px-3 py-2 rounded w-full text-sm shadow-sm outline-none focus:ring-2 ${
      theme === 'dark' ?
      'bg-card border border-border text-foreground focus:ring-primary' :
      'bg-white border border-gray-300 text-gray-900 focus:ring-blue-500'}`
      }>
          <div className="truncate flex-1 text-left mr-2">
            <Select.Value />
          </div>
          <Select.Icon>
            <ChevronDownIcon className={theme === 'dark' ? 'text-foreground' : 'text-gray-500'} />
          </Select.Icon>
        </Select.Trigger>
        <Select.Portal>
          <Select.Content className={`rounded shadow-lg z-50 ${
        theme === 'dark' ?
        'bg-card border border-border text-foreground' :
        'bg-white border border-gray-300 text-gray-900'}`
        }>
            <Select.Viewport>
              {options.map((opt) =>
            <Select.Item
              key={opt}
              value={opt}
              className={`px-3 py-2 cursor-pointer text-sm flex items-center ${
              theme === 'dark' ?
              'hover:bg-accent text-foreground' :
              'hover:bg-gray-100 text-gray-900'}`
              }>
              
                  <Select.ItemText>{opt}</Select.ItemText>
                  <Select.ItemIndicator className="ml-2">
                    <CheckIcon className={theme === 'dark' ? 'text-primary' : 'text-blue-500'} />
                  </Select.ItemIndicator>
                </Select.Item>
            )}
            </Select.Viewport>
          </Select.Content>
        </Select.Portal>
      </Select.Root>
    </div>;


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
            <CardHeader className="users-card-header flex flex-row items-center justify-between gap-4">
              <div>
                <CardTitle className={`users-card-title ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>User Management</CardTitle>
                <p className={`users-card-desc ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}`}>Manage all users in the system</p>
              </div>
              <Button
                onClick={handleDownloadPDF}
                disabled={!isAnyFilterActive || downloadingPDF}
                className={`flex items-center gap-2 px-4 py-2 font-medium transition-all duration-200 shrink-0 ${
                  theme === 'dark' ? 'bg-primary text-primary-foreground hover:bg-primary/90' : 'bg-primary text-primary-foreground hover:bg-primary/90'
                }`}
              >
                {downloadingPDF ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileDownIcon className="w-4 h-4" />}
                {downloadingPDF ? "Exporting..." : "Download PDF"}
              </Button>
            </CardHeader>
            <CardContent className="users-card-content pb-0">
              <div className="filters-search flex flex-col xl:flex-row xl:items-end justify-between gap-8 mb-10">
                {/* Filters Section */}
                <div className="flex-1 w-full">
                  <div className="flex flex-row items-end gap-3 sm:gap-6 w-full max-w-4xl">
                    <div className="flex flex-col gap-2 flex-1 min-w-0">
                      <span className={`filter-label text-[10px] sm:text-[11px] font-bold uppercase tracking-widest truncate ${theme === 'dark' ? 'text-muted-foreground/70' : 'text-gray-400'}`}>User Role</span>
                      <SelectMenu
                        label=""
                        value={roleFilter}
                        onChange={setRoleFilter}
                        options={roles} />
                      
                    </div>

                    <div className="flex flex-col gap-2 flex-1 min-w-0">
                      <span className={`filter-label text-[10px] sm:text-[11px] font-bold uppercase tracking-widest truncate ${theme === 'dark' ? 'text-muted-foreground/70' : 'text-gray-400'}`}>Department</span>
                      <SelectMenu
                        label=""
                        value={departmentFilter}
                        onChange={setDepartmentFilter}
                        options={departments} />
                      
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
                          onKeyPress={(e) => {if (e.key === 'Enter') {setAppliedSearch(searchQuery.trim());setCurrentPage(1);}}}
                          className={`search-input h-10 w-full pl-10 rounded-md shadow-sm ${theme === 'dark' ? 'bg-card border-border text-foreground' : 'bg-white border-gray-300 text-gray-900 focus:border-blue-500'}`} />
                        
                      </div>
                      <Button
                        onClick={() => {setAppliedSearch(searchQuery.trim());setCurrentPage(1);}}
                        className={`h-10 px-6 font-medium transition-all duration-200 ${theme === 'dark' ? 'bg-primary text-primary-foreground hover:bg-primary/90' : 'bg-primary text-primary-foreground hover:bg-primary/90'}`}>
                        
                        Search
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
                const needsDept = rolesNeedingDept.includes(roleFilter) && departmentFilter === "All";

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

              return (
                <div className="table-wrapper block overflow-x-auto">
                {loading ?
                  <SkeletonTable rows={pageSize} cols={6} /> :

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
                      <>
                        {filteredUsers.length > 0 ?
                        filteredUsers.map((user) =>
                        <tr
                          key={user.id}
                          className={`table-row border-b transition-colors duration-200 ${
                          theme === 'dark' ?
                          'border-border hover:bg-accent' :
                          'border-gray-200 hover:bg-gray-50'}`
                          }>
                          
                              <td className="table-cell py-2 px-1 whitespace-nowrap md:w-[200px]">
                                {editingId === user.id ?
                            <Input
                              name="name"
                              value={editData?.name || ""}
                              onChange={handleEditChange}
                              className={theme === 'dark' ?
                              'bg-card text-foreground w-full' :
                              'bg-white text-gray-900 w-full'} /> :


                            user.name
                            }
                              </td>
                              <td className="table-cell py-2 px-1 whitespace-nowrap md:w-[200px]">
                                {editingId === user.id ?
                            <Input
                              name="email"
                              value={editData?.email || ""}
                              onChange={handleEditChange}
                              className={theme === 'dark' ?
                              'bg-card text-foreground w-full' :
                              'bg-white text-gray-900 w-full'} /> :


                            user.email
                            }
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
                                  {editingId === user.id ?
                              <Button
                                size="sm"
                                onClick={saveEdit}
                                disabled={loading}
                                className={theme === 'dark' ?
                                'bg-primary text-primary-foreground hover:bg-primary/90' :
                                'bg-primary text-primary-foreground hover:bg-primary/90'}>
                                
                                      {loading ? "Saving..." : "Save"}
                                    </Button> :

                              <>
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
                                    </>
                              }
                                </div>
                              </td>
                            </tr>
                        ) :

                        <tr>
                            <td colSpan={6} className={`py-8 text-center ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}`}>
                              No users found for the selected criteria.
                            </td>
                          </tr>
                        }
                      </>
                    </tbody>
                  </table>
                  }
              </div>);

            })()}

          {/* Mobile: show table only; compact card list removed */}

          {/* Pagination Controls */}
          {totalPages > 1 &&
            <div className="pagination-container flex flex-col sm:flex-row items-center justify-between mt-6 gap-2">
              <div className={`pagination-info ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}`}>
                Showing {(currentPage - 1) * pageSize + 1} to {Math.min(currentPage * pageSize, totalUsers)} of {totalUsers} users
              </div>
              <div className="pagination-controls flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                  disabled={currentPage === 1 || loading}
                  className="pagination-btn text-white bg-primary border-primary hover:bg-primary/90 hover:border-primary/90 hover:text-white px-2 py-1 sm:px-3 sm:py-1">
                  
                  Previous
                </Button>

                {/* Single current page indicator (all viewports) */}
                <div className="flex items-center">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled
                    className={`pagination-btn ${theme === 'dark' ? 'text-muted-foreground bg-card border border-border' : 'text-gray-700 bg-white border border-gray-300'} px-2 py-1 sm:px-3 sm:py-1`}
                    aria-label={`Current page ${currentPage} of ${totalPages}`}>
                    
                    {currentPage}
                  </Button>
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages || loading}
                  className="pagination-btn text-white bg-primary border-primary hover:bg-primary/90 hover:border-primary/90 hover:text-white px-2 py-1 sm:px-3 sm:py-1">
                  
                  Next
                </Button>
              </div>
            </div>
            }
        </CardContent>
      </Card>
      </div>

      <Dialog open={deleteId !== null} onOpenChange={() => setDeleteId(null)}>
        <DialogContent
          className={
          theme === 'dark' ?
          'delete-modal bg-card border border-border text-foreground w-[92%] max-w-[420px] sm:max-w-md rounded-lg mx-auto' :
          'delete-modal bg-white border border-gray-200 text-gray-900 w-[92%] max-w-[420px] sm:max-w-md rounded-lg mx-auto'
          }>
          
          <DialogHeader>
            <DialogTitle className={`delete-modal-title ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>Confirm Deletion</DialogTitle>
          </DialogHeader>
          <p className={`delete-modal-body ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}`}>
            Are you sure you want to delete this user? This action cannot be undone.
          </p>
          <DialogFooter className="delete-modal-buttons">
            <Button
              variant="outline"
              onClick={() => setDeleteId(null)}
              disabled={loading}
              className={`delete-modal-btn ${theme === 'dark' ?
              'text-foreground bg-card border border-border hover:bg-accent' :
              'text-gray-700 bg-white border border-gray-300 hover:bg-gray-50'}`}>
              
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={deleteUser}
              disabled={loading}
              className={`delete-modal-btn ${theme === 'dark' ?
              'bg-destructive hover:bg-destructive/90 text-destructive-foreground' :
              'bg-red-600 hover:bg-red-700 text-white'}`}>
              
              {loading ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>);

};

export default UsersManagement;