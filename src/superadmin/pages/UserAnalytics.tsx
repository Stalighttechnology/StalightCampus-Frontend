import { useState, useEffect, useCallback } from "react";
import { API_BASE_URL } from "@/utils/config";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../../components/ui/card";
import { useTheme } from "../../context/ThemeContext";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, Legend } from "recharts";
import { fetchWithSuperadminTokenRefresh } from "../../utils/authService";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Badge } from "../../components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "../../components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../components/ui/table";
import {
  Users,
  Building2,
  UserCheck,
  UserX,
  Search,
  Eye,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  ArrowUpDown,
  Loader2,
  AlertCircle,
} from "lucide-react";

const COLORS = [
  '#0ea5e9', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#f43f5e',
  '#06b6d4', '#84cc16', '#eab308', '#6366f1', '#d946ef', '#14b8a6',
  '#f97316', '#a855f7', '#3b82f6', '#22c55e', '#e11d48', '#64748b'
];

interface RoleBreakdownItem {
  role: string;
  name: string;
  count: number;
  active_count: number;
  inactive_count: number;
}

interface OrganizationSummary {
  id: number | string | null;
  name: string;
  domain: string | null;
  institution_type: string | null;
  plan_type: string | null;
  total_users: number;
  active_users: number;
  inactive_users: number;
}

interface OrgRoleDetailsResponse {
  id: number | string | null;
  name: string;
  domain: string | null;
  institution_type: string | null;
  plan_type: string | null;
  total_users: number;
  active_users: number;
  inactive_users: number;
  roles_distribution: RoleBreakdownItem[];
}

interface AnalyticsApiResponse {
  total_users: number;
  active_users: number;
  inactive_users: number;
  roles_distribution: { name: string; value: number }[];
  organizations_count: number;
  page: number;
  page_size: number;
  total_pages: number;
  organizations: OrganizationSummary[];
}

const UserAnalytics = () => {
  const [data, setData] = useState<AnalyticsApiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { theme } = useTheme();

  // Server-side query parameters
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [sortBy, setSortBy] = useState<"users_desc" | "users_asc" | "name_asc" | "name_desc">("users_desc");
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  // Selected Organization for View Modal (Lazy loaded)
  const [selectedOrgBasic, setSelectedOrgBasic] = useState<OrganizationSummary | null>(null);
  const [modalRoleData, setModalRoleData] = useState<OrgRoleDetailsResponse | null>(null);
  const [modalLoading, setModalLoading] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);
  const [modalRoleSearch, setModalRoleSearch] = useState("");

  // Debounce search query to prevent hammering the server on every keystroke
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setCurrentPage(1); // Reset to page 1 on search change
    }, 400);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Fetch paginated user analytics from backend
  const fetchAnalytics = useCallback(async (page: number, search: string, sort: string) => {
    try {
      setLoading(true);
      setError(null);
      const queryParams = new URLSearchParams({
        page: page.toString(),
        page_size: pageSize.toString(),
        search: search.trim(),
        sort_by: sort,
      });

      const response = await fetchWithSuperadminTokenRefresh(
        `${API_BASE_URL}/api/superadmin/analytics/users/?${queryParams.toString()}`,
        {
          headers: { "Authorization": `Bearer ${localStorage.getItem("superadmin_token")}` }
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to load analytics: ${response.statusText}`);
      }

      const res: AnalyticsApiResponse = await response.json();
      setData(res);
    } catch (err: any) {
      setError(err.message || "An error occurred while loading user analytics.");
    } finally {
      setLoading(false);
    }
  }, [pageSize]);

  // Re-fetch when page, debounced search, or sort order changes
  useEffect(() => {
    fetchAnalytics(currentPage, debouncedSearch, sortBy);
  }, [fetchAnalytics, currentPage, debouncedSearch, sortBy]);

  // Lazy-load role breakdown for clicked organization
  const handleViewOrganization = async (org: OrganizationSummary) => {
    setSelectedOrgBasic(org);
    setModalRoleData(null);
    setModalRoleSearch("");
    setModalLoading(true);
    setModalError(null);

    const orgIdentifier = org.id ?? "system";

    try {
      const response = await fetchWithSuperadminTokenRefresh(
        `${API_BASE_URL}/api/superadmin/analytics/organizations/${orgIdentifier}/roles/`,
        {
          headers: { "Authorization": `Bearer ${localStorage.getItem("superadmin_token")}` }
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to load role details: ${response.statusText}`);
      }

      const roleRes: OrgRoleDetailsResponse = await response.json();
      setModalRoleData(roleRes);
    } catch (err: any) {
      setModalError(err.message || "Failed to load role distribution for this organization.");
    } finally {
      setModalLoading(false);
    }
  };

  const isDark = theme === "dark";

  // Filtered roles in modal based on search input
  const filteredRoles = (modalRoleData?.roles_distribution || []).filter(item => {
    if (!modalRoleSearch.trim()) return true;
    const q = modalRoleSearch.toLowerCase().trim();
    return item.name.toLowerCase().includes(q) || item.role.toLowerCase().includes(q);
  });

  const totalPages = data?.total_pages || 1;
  const totalOrganizationsCount = data?.organizations_count ?? 0;

  return (
    <div className="space-y-6 pb-12">
      {/* Page Header */}
      <div>
        <h1 className={`text-2xl font-bold tracking-tight ${isDark ? 'text-white' : 'text-gray-900'}`}>
          User Analytics
        </h1>
        <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
          Cross-organization user metrics, role distributions, and institutional user counts
        </p>
      </div>

      {error ? (
        <div className="p-4 rounded-lg bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 text-sm flex items-center gap-2">
          <AlertCircle className="h-5 w-5 flex-shrink-0" />
          <span>{error}</span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchAnalytics(currentPage, debouncedSearch, sortBy)}
            className="ml-auto text-xs"
          >
            Retry
          </Button>
        </div>
      ) : null}

      {/* Top 4 KPI Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <Card className={`backdrop-blur-sm shadow-sm transition-all duration-300 border ${isDark ? 'bg-card/40 border-border text-foreground' : 'bg-white border-gray-100 text-gray-900'}`}>
          <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
            <CardTitle className={`text-sm font-medium ${isDark ? 'text-foreground' : 'text-gray-600'}`}>
              Total Users
            </CardTitle>
            <Users className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{data?.total_users?.toLocaleString() ?? "—"}</div>
            <p className="text-xs text-muted-foreground mt-1">Platform wide accounts</p>
          </CardContent>
        </Card>

        <Card className={`backdrop-blur-sm shadow-sm transition-all duration-300 border ${isDark ? 'bg-card/40 border-border text-foreground' : 'bg-white border-gray-100 text-gray-900'}`}>
          <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
            <CardTitle className={`text-sm font-medium ${isDark ? 'text-foreground' : 'text-gray-600'}`}>
              Active Users
            </CardTitle>
            <UserCheck className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-emerald-500">{data?.active_users?.toLocaleString() ?? "—"}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {data?.total_users ? ((data.active_users / data.total_users) * 100).toFixed(1) : 0}% of all accounts
            </p>
          </CardContent>
        </Card>

        <Card className={`backdrop-blur-sm shadow-sm transition-all duration-300 border ${isDark ? 'bg-card/40 border-border text-foreground' : 'bg-white border-gray-100 text-gray-900'}`}>
          <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
            <CardTitle className={`text-sm font-medium ${isDark ? 'text-foreground' : 'text-gray-600'}`}>
              Inactive Users
            </CardTitle>
            <UserX className="h-4 w-4 text-rose-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-rose-500">{data?.inactive_users?.toLocaleString() ?? "—"}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {data?.total_users ? ((data.inactive_users / data.total_users) * 100).toFixed(1) : 0}% deactivated
            </p>
          </CardContent>
        </Card>

        <Card className={`backdrop-blur-sm shadow-sm transition-all duration-300 border ${isDark ? 'bg-card/40 border-border text-foreground' : 'bg-white border-gray-100 text-gray-900'}`}>
          <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
            <CardTitle className={`text-sm font-medium ${isDark ? 'text-foreground' : 'text-gray-600'}`}>
              Organizations
            </CardTitle>
            <Building2 className="h-4 w-4 text-indigo-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-indigo-500">
              {totalOrganizationsCount.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Institutions with registered users</p>
          </CardContent>
        </Card>
      </div>

      {/* Global Role Distribution Chart */}
      <Card className={`shadow-sm backdrop-blur-sm transition-all duration-300 border ${isDark ? 'bg-card/40 border-border text-foreground' : 'bg-white border-gray-100 text-gray-900'}`}>
        <CardHeader className="pb-2">
          <CardTitle className={`text-lg font-semibold ${isDark ? 'text-foreground' : 'text-gray-900'}`}>
            Overall Role Distribution
          </CardTitle>
          <CardDescription>
            Proportion of users across all roles across the entire platform
          </CardDescription>
        </CardHeader>
        <CardContent className="h-80 mx-2 mb-4">
          {data?.roles_distribution && data.roles_distribution.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data.roles_distribution}
                  cx="50%"
                  cy="50%"
                  innerRadius={65}
                  outerRadius={105}
                  paddingAngle={3}
                  dataKey="value"
                  stroke="none"
                >
                  {data.roles_distribution.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <RechartsTooltip
                  formatter={(val: any, name: any) => [`${val.toLocaleString()} users`, name]}
                  contentStyle={{
                    backgroundColor: isDark ? '#1f2937' : '#fff',
                    borderRadius: '8px',
                    borderColor: isDark ? '#374151' : '#e5e7eb',
                    color: isDark ? '#fff' : '#111827'
                  }}
                />
                <Legend verticalAlign="bottom" height={40} iconType="circle" />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex items-center justify-center text-muted-foreground">
              {loading ? "Loading role chart..." : "No role data available"}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Organizations & User Counts Table (Server Paginated 10 per page) */}
      <Card className={`shadow-sm backdrop-blur-sm transition-all duration-300 border ${isDark ? 'bg-card/40 border-border text-foreground' : 'bg-white border-gray-100 text-gray-900'}`}>
        <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4">
          <div>
            <CardTitle className={`text-lg font-semibold ${isDark ? 'text-foreground' : 'text-gray-900'}`}>
              Organizations & User Counts
            </CardTitle>
            <CardDescription>
              List of all organizations with total users and active breakdown
            </CardDescription>
          </div>

          {/* Search & Sort Controls */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 w-full sm:w-auto">
            <div className="relative min-w-[220px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search organization or domain..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-9 text-sm"
              />
            </div>

            <div className="flex items-center gap-1.5">
              <Select
                value={sortBy}
                onValueChange={(val: "users_desc" | "users_asc" | "name_asc" | "name_desc") => {
                  setSortBy(val);
                  setCurrentPage(1);
                }}
              >
                <SelectTrigger className="h-9 w-[175px] text-xs font-medium">
                  <div className="flex items-center gap-2 truncate">
                    <ArrowUpDown className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    <SelectValue placeholder="Sort order" />
                  </div>
                </SelectTrigger>
                <SelectContent align="end">
                  <SelectItem value="users_desc">Most Users First</SelectItem>
                  <SelectItem value="users_asc">Least Users First</SelectItem>
                  <SelectItem value="name_asc">Name (A - Z)</SelectItem>
                  <SelectItem value="name_desc">Name (Z - A)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <div className="overflow-x-auto relative min-h-[300px]">
            {loading && (
              <div className="absolute inset-0 bg-background/50 backdrop-blur-[1px] flex items-center justify-center z-10">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-5 w-5 animate-spin text-indigo-600" />
                  <span>Loading organizations...</span>
                </div>
              </div>
            )}

            <Table>
              <TableHeader>
                <TableRow className={isDark ? 'border-border/60 hover:bg-transparent' : 'border-gray-100 hover:bg-transparent'}>
                  <TableHead className="w-12 text-center">#</TableHead>
                  <TableHead>Organization</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="text-right">Total Users</TableHead>
                  <TableHead className="text-center">Status Breakdown</TableHead>
                  <TableHead className="text-center w-28">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data?.organizations && data.organizations.length > 0 ? (
                  data.organizations.map((org, idx) => {
                    const serialNumber = (currentPage - 1) * pageSize + idx + 1;
                    return (
                      <TableRow
                        key={org.id ?? `sys-${idx}`}
                        className={`transition-colors ${
                          isDark ? 'hover:bg-muted/40 border-border/50' : 'hover:bg-gray-50 border-gray-100'
                        }`}
                      >
                        <TableCell className="text-center text-xs text-muted-foreground font-mono">
                          {serialNumber}
                        </TableCell>

                        <TableCell>
                          <div className="flex flex-col">
                            <span className="font-semibold text-sm">{org.name}</span>
                            {org.domain && (
                              <span className="text-xs text-muted-foreground font-mono">
                                {org.domain}
                              </span>
                            )}
                          </div>
                        </TableCell>

                        <TableCell>
                          <Badge variant="outline" className="text-xs capitalize font-normal">
                            {org.institution_type || "N/A"}
                          </Badge>
                        </TableCell>

                        <TableCell className="text-right">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300">
                            {org.total_users.toLocaleString()}
                          </span>
                        </TableCell>

                        <TableCell className="text-center">
                          <div className="inline-flex items-center gap-2 text-xs">
                            <span className="text-emerald-600 dark:text-emerald-400 font-medium" title="Active Users">
                              {org.active_users.toLocaleString()} active
                            </span>
                            <span className="text-muted-foreground">•</span>
                            <span className="text-rose-500 dark:text-rose-400 font-medium" title="Inactive Users">
                              {org.inactive_users.toLocaleString()} inactive
                            </span>
                          </div>
                        </TableCell>

                        <TableCell className="text-center">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleViewOrganization(org)}
                            className="h-8 px-3 text-xs gap-1.5 font-medium border-indigo-200 dark:border-indigo-800 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/50"
                          >
                            <Eye className="h-3.5 w-3.5" />
                            View
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })
                ) : !loading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                      No organizations found matching "{debouncedSearch}".
                    </TableCell>
                  </TableRow>
                ) : null}
              </TableBody>
            </Table>
          </div>

          {/* Server-Side Pagination Controls */}
          {totalOrganizationsCount > 0 && (
            <div className="flex flex-col sm:flex-row items-center justify-between px-6 py-4 border-t gap-3">
              <div className="text-xs text-muted-foreground">
                Showing{" "}
                <strong>{(currentPage - 1) * pageSize + 1}</strong> to{" "}
                <strong>{Math.min(currentPage * pageSize, totalOrganizationsCount)}</strong> of{" "}
                <strong>{totalOrganizationsCount}</strong> organizations
              </div>
              <div className="flex items-center gap-1.5">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(p => Math.max(p - 1, 1))}
                  disabled={currentPage === 1 || loading}
                  className="h-8 px-3 text-xs"
                >
                  <ChevronLeft className="h-4 w-4 mr-1" />
                  Previous
                </Button>
                <span className="text-xs px-2 text-muted-foreground font-medium">
                  Page {currentPage} of {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))}
                  disabled={currentPage >= totalPages || loading}
                  className="h-8 px-3 text-xs"
                >
                  Next
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Lazy-Loaded Organization Detail Modal */}
      <Dialog
        open={!!selectedOrgBasic}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedOrgBasic(null);
            setModalRoleData(null);
          }
        }}
      >
        <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col p-6 overflow-hidden">
          {selectedOrgBasic && (
            <>
              {/* Modal Header */}
              <DialogHeader className="pb-3 border-b">
                <div className="flex items-center gap-2">
                  <Building2 className="h-5 w-5 text-indigo-500" />
                  <DialogTitle className="text-xl font-bold">
                    {selectedOrgBasic.name}
                  </DialogTitle>
                </div>
                <DialogDescription className="text-xs text-muted-foreground flex items-center gap-2 pt-1">
                  <span>Domain: <strong>{selectedOrgBasic.domain || "N/A"}</strong></span>
                  <span>•</span>
                  <span>Type: <strong>{selectedOrgBasic.institution_type || "N/A"}</strong></span>
                  {selectedOrgBasic.plan_type && (
                    <>
                      <span>•</span>
                      <span>Plan: <strong>{selectedOrgBasic.plan_type}</strong></span>
                    </>
                  )}
                </DialogDescription>
              </DialogHeader>

              {/* Summary KPIs Row */}
              <div className="grid grid-cols-4 gap-3 py-3">
                <div className="p-3 rounded-lg border bg-muted/30 text-center">
                  <span className="text-xs text-muted-foreground block">Total Users</span>
                  <span className="text-lg font-bold text-blue-600 dark:text-blue-400">
                    {selectedOrgBasic.total_users.toLocaleString()}
                  </span>
                </div>
                <div className="p-3 rounded-lg border bg-muted/30 text-center">
                  <span className="text-xs text-muted-foreground block">Active</span>
                  <span className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
                    {selectedOrgBasic.active_users.toLocaleString()}
                  </span>
                </div>
                <div className="p-3 rounded-lg border bg-muted/30 text-center">
                  <span className="text-xs text-muted-foreground block">Inactive</span>
                  <span className="text-lg font-bold text-rose-500 dark:text-rose-400">
                    {selectedOrgBasic.inactive_users.toLocaleString()}
                  </span>
                </div>
                <div className="p-3 rounded-lg border bg-muted/30 text-center">
                  <span className="text-xs text-muted-foreground block">Roles Count</span>
                  <span className="text-lg font-bold text-indigo-600 dark:text-indigo-400">
                    {modalLoading ? "..." : (modalRoleData?.roles_distribution.length ?? 0)}
                  </span>
                </div>
              </div>

              {/* Modal Body: Loading / Error / Table */}
              {modalLoading ? (
                <div className="flex-1 flex flex-col items-center justify-center py-12 space-y-3">
                  <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
                  <p className="text-xs text-muted-foreground">
                    Fetching Role-by-Role User Breakdown...
                  </p>
                </div>
              ) : modalError ? (
                <div className="flex-1 flex flex-col items-center justify-center py-10 space-y-3 text-center">
                  <AlertCircle className="h-8 w-8 text-rose-500" />
                  <p className="text-xs text-rose-500">{modalError}</p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleViewOrganization(selectedOrgBasic)}
                    className="text-xs"
                  >
                    Retry
                  </Button>
                </div>
              ) : (
                <>
                  {/* Search Filter for Roles */}
                  <div className="flex items-center justify-between gap-3 pt-2 pb-2">
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="h-4 w-4 text-indigo-500" />
                      <h3 className="font-semibold text-sm">Role-by-Role User Breakdown</h3>
                    </div>
                    <div className="relative w-48">
                      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                      <Input
                        type="text"
                        placeholder="Filter roles..."
                        value={modalRoleSearch}
                        onChange={(e) => setModalRoleSearch(e.target.value)}
                        className="pl-8 h-8 text-xs"
                      />
                    </div>
                  </div>

                  {/* Roles Table */}
                  <div className="flex-1 overflow-y-auto border rounded-md max-h-[360px]">
                    <Table>
                      <TableHeader className="sticky top-0 bg-background/95 backdrop-blur z-10">
                        <TableRow>
                          <TableHead className="w-10 text-center">#</TableHead>
                          <TableHead>Role Name</TableHead>
                          <TableHead>Role Key</TableHead>
                          <TableHead className="text-right">Total Count</TableHead>
                          <TableHead className="text-right">Active</TableHead>
                          <TableHead className="text-right">Inactive</TableHead>
                          <TableHead className="text-right w-24">% of Org</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredRoles.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={7} className="h-24 text-center text-muted-foreground text-xs">
                              {modalRoleSearch
                                ? `No roles found matching "${modalRoleSearch}".`
                                : "No roles recorded for this organization."}
                            </TableCell>
                          </TableRow>
                        ) : (
                          filteredRoles.map((roleItem, i) => {
                            const percent = selectedOrgBasic.total_users > 0
                              ? ((roleItem.count / selectedOrgBasic.total_users) * 100).toFixed(1)
                              : "0.0";
                            return (
                              <TableRow key={roleItem.role} className="text-xs">
                                <TableCell className="text-center text-muted-foreground font-mono">
                                  {i + 1}
                                </TableCell>
                                <TableCell className="font-medium text-foreground">
                                  {roleItem.name}
                                </TableCell>
                                <TableCell className="font-mono text-[11px] text-muted-foreground">
                                  {roleItem.role}
                                </TableCell>
                                <TableCell className="text-right font-bold text-foreground">
                                  <Badge variant="secondary" className="font-bold">
                                    {roleItem.count.toLocaleString()}
                                  </Badge>
                                </TableCell>
                                <TableCell className="text-right text-emerald-600 dark:text-emerald-400 font-medium">
                                  {roleItem.active_count.toLocaleString()}
                                </TableCell>
                                <TableCell className="text-right text-rose-500 dark:text-rose-400 font-medium">
                                  {roleItem.inactive_count.toLocaleString()}
                                </TableCell>
                                <TableCell className="text-right font-mono text-muted-foreground">
                                  {percent}%
                                </TableCell>
                              </TableRow>
                            );
                          })
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </>
              )}

              {/* Modal Footer */}
              <div className="pt-3 flex justify-end">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSelectedOrgBasic(null);
                    setModalRoleData(null);
                  }}
                  className="text-xs"
                >
                  Close
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default UserAnalytics;
