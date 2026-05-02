import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import * as Select from "@radix-ui/react-select";
import { ChevronDownIcon, CheckIcon, Pencil1Icon, TrashIcon } from "@radix-ui/react-icons";
import { Search } from "lucide-react";
import { Input } from "../ui/input";
import { Button } from "../ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import { manageUsers, manageUserAction } from "../../utils/admin_api";
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
}

interface UsersManagementProps {
  setError: (error: string | null) => void;
  toast: (options: any) => void;
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
    </span>
  );
};

const roles = ["All", "Student", "Head of Department", "Teacher", "COE", "Fees Manager", "Principal"];
const statuses = ["All", "Active", "Inactive"];

const roleMap: Record<string, string> = {
  "Student": "student",
  "Head of Department": "hod",
  "Teacher": "teacher",
  "COE": "coe",
  "Fees Manager": "fees_manager",
  "Principal": "principal",
};

const UsersManagement = ({ setError, toast }: UsersManagementProps) => {
  const [users, setUsers] = useState<User[]>([]);
  const [roleFilter, setRoleFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");
  const [searchQuery, setSearchQuery] = useState(""); // Input value
  const [appliedSearch, setAppliedSearch] = useState(""); // Applied search term
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

  // Reset current page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [roleFilter, statusFilter, appliedSearch]);

  // Function to perform search
  const performSearch = () => {
    setAppliedSearch(searchQuery.trim());
    setCurrentPage(1); // Reset to first page when searching
  };

  // Handle Enter key press for search
  const handleSearchKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      performSearch();
    }
  };

  useEffect(() => {
    const fetchUsers = async () => {
      setLoading(true);
      setError(null);
      try {
        // Prepare filter parameters
        const filterParams: any = {
          page: currentPage,
          page_size: pageSize,
        };
        
        // Add role filter if not "All"
        if (roleFilter !== "All") {
          filterParams.role = roleMap[roleFilter];
        }
        
        // Add status filter if not "All"
        if (statusFilter !== "All") {
          filterParams.is_active = statusFilter === "Active";
        }

        // Add search filter if not empty
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
        const dataSource = hasResults ? (response as any).results : (response as any);
        
        if (dataSource && dataSource.success) {
          // Handle paginated response format where data is nested under results
          const usersData = dataSource.users || [];
          const paginationData = hasResults ? (response as any) : dataSource;
          
          // Transform backend user data to frontend format
          const transformedUsers = Array.isArray(usersData) ? usersData.map((user: any) => ({
            id: user.id,
            name: `${user.first_name || ""} ${user.last_name || ""}`.trim() || user.username || "N/A",
            email: user.email || "N/A",
            role: user.role || "N/A",
            status: user.is_active ? "Active" : "Inactive",
            username: user.username || "",
          })) : [];
          
          setUsers(transformedUsers);
          setTotalUsers(paginationData.count || 0);
          const calculatedTotalPages = Math.ceil((paginationData.count || 0) / pageSize);
          setTotalPages(calculatedTotalPages);
          
          // Reset to page 1 if current page exceeds total pages
          if (currentPage > calculatedTotalPages && calculatedTotalPages > 0) {
            setCurrentPage(1);
          }
        } else {
          setError(dataSource?.message || "Failed to fetch users");
          toast({
            variant: "destructive",
            title: "Error",
            description: dataSource?.message || "Failed to fetch users",
          });
        }
      } catch (err) {
        console.error("Fetch Users Error:", err);
        setError("Network error");
        toast({
          variant: "destructive",
          title: "Error",
          description: "Network error",
        });
      } finally {
        setLoading(false);
      }
    };
    fetchUsers();
  }, [setError, toast, currentPage, roleFilter, statusFilter, appliedSearch, pageSize]);

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
          last_name: lastName || "",
        };
        const response = await manageUserAction({
          user_id: editData.id.toString(),
          action: "edit",
          updates
        });
        if (response.success) {
          // Update local state with returned user data instead of making another GET call
          if (response.user) {
            setUsers(prevUsers =>
              prevUsers.map(user =>
                user.id === editData.id
                  ? {
                      ...user,
                      name: `${response.user.first_name || ""} ${response.user.last_name || ""}`.trim() || response.user.username || "N/A",
                      email: response.user.email || "N/A",
                      role: response.user.role || "N/A",
                      status: response.user.is_active ? "Active" : "Inactive",
                      username: response.user.username || "",
                    }
                  : user
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
            description: response.message || "Failed to update user",
          });
        }
      } catch (err) {
        console.error("Save Edit Error:", err);
        setError("Network error");
        toast({
          variant: "destructive",
          title: "Error",
          description: "Network error",
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
          setUsers(prevUsers => prevUsers.filter(user => user.id !== deleteId));
          setTotalUsers(prevTotal => prevTotal - 1);
          
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
            description: response.message || "Failed to delete user",
          });
        }
      } catch (err) {
        console.error("Delete User Error:", err);
        setError("Network error");
        toast({
          variant: "destructive",
          title: "Error",
          description: "Network error",
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
    options,
  }: {
    label: string;
    value: string;
    onChange: (val: string) => void;
    options: string[];
  }) => (
    <div className="flex flex-col">
      <label className={`text-sm mb-1 ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-600'}`}>{label}</label>
      <Select.Root value={value} onValueChange={onChange}>
        <Select.Trigger className={`select-trigger inline-flex items-center justify-between px-3 py-2 rounded w-full sm:w-48 text-sm shadow-sm outline-none focus:ring-2 ${
          theme === 'dark' 
            ? 'bg-card border border-border text-foreground focus:ring-primary' 
            : 'bg-white border border-gray-300 text-gray-900 focus:ring-blue-500'
        }`}>
          <Select.Value />
          <Select.Icon>
            <ChevronDownIcon className={theme === 'dark' ? 'text-foreground' : 'text-gray-500'} />
          </Select.Icon>
        </Select.Trigger>
        <Select.Portal>
          <Select.Content className={`rounded shadow-lg z-50 ${
            theme === 'dark' 
              ? 'bg-card border border-border text-foreground' 
              : 'bg-white border border-gray-300 text-gray-900'
          }`}>
            <Select.Viewport>
              {options.map((opt) => (
                <Select.Item
                  key={opt}
                  value={opt}
                  className={`px-3 py-2 cursor-pointer text-sm flex items-center ${
                    theme === 'dark' 
                      ? 'hover:bg-accent text-foreground' 
                      : 'hover:bg-gray-100 text-gray-900'
                  }`}
                >
                  <Select.ItemText>{opt}</Select.ItemText>
                  <Select.ItemIndicator className="ml-2">
                    <CheckIcon className={theme === 'dark' ? 'text-primary' : 'text-blue-500'} />
                  </Select.ItemIndicator>
                </Select.Item>
              ))}
            </Select.Viewport>
          </Select.Content>
        </Select.Portal>
      </Select.Root>
    </div>
  );

  if (loading && users.length === 0) {
    return (
      <div className="space-y-6">
        <SkeletonPageHeader />
        <SkeletonTable rows={10} cols={5} />
      </div>
    );
  }

  return (
    <>
      <style>{`
        @media (max-width: 480px) {
=          .users-card { border-radius: 8px; }
          .users-card-header { padding: 12px; }
          .users-card-title { font-size: 20px; line-height: 1.3; }
          .users-card-desc { font-size: 13px; margin-top: 4px; }
          .users-card-content { padding: 12px; }
          .filters-search { gap: 12px; }
          .filter-label { font-size: 13px; margin-bottom: 4px; }
          .search-wrapper { gap: 8px; }
          .search-input { font-size: 14px; }
          .table-wrapper { border-radius: 6px; }
          .users-table { font-size: 13px; }
          /* Keep table layout on small screens to avoid card-like rendering */
          .users-table { display: table !important; table-layout: auto !important; width: 100% !important; }
          .users-table thead, .users-table tbody { display: table-row-group !important; }
          .users-table tr { display: table-row !important; }
          .users-table th, .users-table td { display: table-cell !important; }
          .table-wrapper { overflow-x: auto; }
          .table-header th { font-size: 13px; padding: 8px 6px !important; white-space: nowrap; }
          .table-cell { padding: 8px 6px !important; font-size: 14px; }
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
        <Card className={`users-card ${theme === 'dark' ? 'bg-card border border-border' : 'bg-white border border-gray-200'}`}>
          <CardHeader className="users-card-header">
            <CardTitle className={`users-card-title ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>User Management</CardTitle>
            <p className={`users-card-desc ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}`}>Manage all users in the system</p>
          </CardHeader>
          <CardContent className="users-card-content">
            <div className="filters-search flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
              {/* Filters */}
              <div className="grid grid-cols-1 gap-3 md:flex md:gap-4">
              <div className="w-full lg:w-auto">
                <span className={`filter-label block mb-1 ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-600'}`}>Filter by Role</span>
                <SelectMenu
                  label=""
                  value={roleFilter}
                  onChange={setRoleFilter}
                  options={roles}
                />
              </div>
              <div className="w-full lg:w-auto">
                <span className={`filter-label block mb-1 ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-600'}`}>Filter by Status</span>
                <SelectMenu
                  label=""
                  value={statusFilter}
                  onChange={setStatusFilter}
                  options={statuses}
                />
              </div>
            </div>

            {/* Search */}
            <div className="w-full md:w-auto flex flex-col">
              <label className={`filter-label mb-1 ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-600'}`}>Search</label>
              <div className="search-wrapper flex gap-2">
                <Input
                  placeholder="Search name or email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyPress={handleSearchKeyPress}
                  className={`search-input w-full md:w-52 rounded ${theme === 'dark' 
                    ? 'bg-card border border-border text-foreground px-2 py-1' 
                    : 'bg-white border border-gray-300 text-gray-900 px-2 py-1'}`}
                />
                <Button
                  onClick={performSearch}
                  variant="outline"
                  size="sm"
                  className={theme === 'dark' 
                    ? 'bg-card border border-border text-foreground hover:bg-accent' 
                    : 'bg-white border border-gray-300 text-gray-900 hover:bg-gray-50'}
                >
                  <Search className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>

          <div className="table-wrapper block overflow-x-auto">
            <table className="users-table w-full text-left">
              <thead className={`table-header border-b ${theme === 'dark' ? 'border-border text-foreground' : 'border-gray-200 text-gray-900'}`}>
                <tr>
                  <th className="py-2 px-4 sm:w-[200px]">Full Name</th>
                  <th className="py-2 px-1 md:w-[200px]">Email</th>
                  <th className="py-2 px-1 md:w-[120px]">Role</th>
                  <th className="py-2 px-1 md:w-[120px]">Status</th>
                  <th className="py-2 px-1 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                  {filteredUsers.length > 0 ? (
                  filteredUsers.map((user) => (
                    <tr
                      key={user.id}
                      className={`table-row border-b transition-colors duration-200 ${
                        theme === 'dark' 
                          ? 'border-border hover:bg-accent' 
                          : 'border-gray-200 hover:bg-gray-50'
                      }`}
                    >
                      <td className="table-cell py-2 px-1 break-words whitespace-normal md:w-[200px]">
                        {editingId === user.id ? (
                          <Input
                            name="name"
                            value={editData?.name || ""}
                            onChange={handleEditChange}
                            className={theme === 'dark' 
                              ? 'bg-card text-foreground w-full' 
                              : 'bg-white text-gray-900 w-full'}
                          />
                        ) : (
                          user.name
                        )}
                      </td>
                      <td className="table-cell py-2 px-1 break-words whitespace-normal md:w-[200px]">
                        {editingId === user.id ? (
                          <Input
                            name="email"
                            value={editData?.email || ""}
                            onChange={handleEditChange}
                            className={theme === 'dark' 
                              ? 'bg-card text-foreground w-full' 
                              : 'bg-white text-gray-900 w-full'}
                          />
                        ) : (
                          user.email
                        )}
                      </td>
                      <td className="table-cell py-2 px-1 break-words whitespace-normal md:w-[120px]">{getRoleBadge(user.role, theme)}</td>
                      <td className="table-cell py-2 px-1 break-words whitespace-normal md:w-[120px]">{getStatusBadge(user.status, theme)}</td>
                      <td className="table-cell py-2 px-1 text-right">
                        <div className="action-buttons flex flex-wrap sm:flex-nowrap justify-end gap-2">
                          {editingId === user.id ? (
                            <Button
                              size="sm"
                              onClick={saveEdit}
                              disabled={loading}
                              className={theme === 'dark' 
                                ? 'text-foreground bg-card border border-border w-full sm:w-auto hover:bg-accent' 
                                : 'text-gray-700 bg-white border border-gray-300 w-full sm:w-auto hover:bg-gray-50'}
                            >
                              {loading ? "Saving..." : "Save"}
                            </Button>
                          ) : (
                            <>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleEdit(user)}
                                disabled={loading}
                                className={theme === 'dark' 
                                  ? 'p-2 rounded hover:bg-accent' 
                                  : 'p-2 rounded hover:bg-gray-100'}
                              >
                                <Pencil1Icon className={theme === 'dark' ? 'w-5 h-5 text-primary' : 'w-5 h-5 text-blue-500'} />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => confirmDelete(user.id)}
                                disabled={loading}
                                className={theme === 'dark' 
                                  ? 'p-2 rounded hover:bg-accent' 
                                  : 'p-2 rounded hover:bg-gray-100'}
                              >
                                <TrashIcon className={theme === 'dark' ? 'w-5 h-5 text-destructive' : 'w-5 h-5 text-red-500'} />
                              </Button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className={`py-4 text-center ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}`}>
                      No users found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile: show table only; compact card list removed */}

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="pagination-container flex flex-col sm:flex-row items-center justify-between mt-6 gap-2">
              <div className={`pagination-info ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}`}>
                Showing {((currentPage - 1) * pageSize) + 1} to {Math.min(currentPage * pageSize, totalUsers)} of {totalUsers} users
              </div>
              <div className="pagination-controls flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1 || loading}
                  className="pagination-btn text-white bg-primary border-primary hover:bg-primary/90 hover:border-primary/90 hover:text-white px-2 py-1 sm:px-3 sm:py-1"
                >
                  Previous
                </Button>

                {/* Single current page indicator (all viewports) */}
                <div className="flex items-center">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled
                    className={`pagination-btn ${theme === 'dark' ? 'text-muted-foreground bg-card border border-border' : 'text-gray-700 bg-white border border-gray-300'} px-2 py-1 sm:px-3 sm:py-1`}
                    aria-label={`Current page ${currentPage} of ${totalPages}`}
                  >
                    {currentPage}
                  </Button>
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages || loading}
                  className="pagination-btn text-white bg-primary border-primary hover:bg-primary/90 hover:border-primary/90 hover:text-white px-2 py-1 sm:px-3 sm:py-1"
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
      </div>

      <Dialog open={deleteId !== null} onOpenChange={() => setDeleteId(null)}>
        <DialogContent
          className={
            theme === 'dark'
              ? 'delete-modal bg-card border border-border text-foreground w-[92%] max-w-[420px] sm:max-w-md rounded-lg mx-auto'
              : 'delete-modal bg-white border border-gray-200 text-gray-900 w-[92%] max-w-[420px] sm:max-w-md rounded-lg mx-auto'
          }
        >
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
              className={`delete-modal-btn ${theme === 'dark' 
                ? 'text-foreground bg-card border border-border hover:bg-accent' 
                : 'text-gray-700 bg-white border border-gray-300 hover:bg-gray-50'}`}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={deleteUser}
              disabled={loading}
              className={`delete-modal-btn ${theme === 'dark' 
                ? 'bg-destructive hover:bg-destructive/90 text-destructive-foreground' 
                : 'bg-red-600 hover:bg-red-700 text-white'}`}
            >
              {loading ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default UsersManagement;