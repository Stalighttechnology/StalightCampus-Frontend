import { useState, useEffect } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../../components/ui/table";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Card, CardHeader, CardTitle, CardContent } from "../../components/ui/card";
import { Search, MoreVertical, Building2, Trash2, Edit, Eye } from "lucide-react";
import { useTheme } from "../../context/ThemeContext";
import { useNavigate } from "react-router-dom";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger } from
"../../components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle } from
"../../components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle } from
"../../components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue } from
"../../components/ui/select";

import { API_BASE_URL } from "@/utils/config";
import { fetchWithSuperadminTokenRefresh } from "../../utils/authService";

const Organizations = () => {
  const [orgs, setOrgs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const { theme } = useTheme();
  const navigate = useNavigate();

  // Action states
  const [deleteOrg, setDeleteOrg] = useState<any>(null);
  const [planOrg, setPlanOrg] = useState<any>(null);
  const [newPlan, setNewPlan] = useState<string>("");
  const [actionLoading, setActionLoading] = useState(false);
  const [viewOrg, setViewOrg] = useState<any | null>(null);
  const [viewOrgLoading, setViewOrgLoading] = useState(false);

  const fetchOrgs = async () => {
    try {
      const response = await fetchWithSuperadminTokenRefresh(`${API_BASE_URL}/api/superadmin/organizations/`, {
        headers: {
          "Authorization": `Bearer ${localStorage.getItem("superadmin_token")}`
        }
      });
      const data = await response.json();
      setOrgs(data.organizations || []);
    } catch (error) {

    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrgs();
  }, []);

  const handleDelete = async () => {
    if (!deleteOrg) return;
    setActionLoading(true);
    try {
      const response = await fetchWithSuperadminTokenRefresh(`${API_BASE_URL}/api/superadmin/organizations/${deleteOrg.id}/`, {
        method: 'DELETE',
        headers: {
          "Authorization": `Bearer ${localStorage.getItem("superadmin_token")}`
        }
      });
      if (response.ok) {
        setOrgs(orgs.filter((o) => o.id !== deleteOrg.id));
        setDeleteOrg(null);
      } else {
        const errorData = await response.json();
        alert(errorData.error || 'Failed to delete organization');
      }
    } catch (error) {
      alert('Error deleting organization');
    } finally {
      setActionLoading(false);
    }
  };

  const handleChangePlan = async () => {
    if (!planOrg || !newPlan) return;
    setActionLoading(true);
    try {
      const response = await fetchWithSuperadminTokenRefresh(`${API_BASE_URL}/api/superadmin/organizations/${planOrg.id}/`, {
        method: 'PUT',
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${localStorage.getItem("superadmin_token")}`
        },
        body: JSON.stringify({ plan_type: newPlan })
      });
      if (response.ok) {
        await fetchOrgs(); // Refresh data
        setPlanOrg(null);
      }
    } catch (error) {

    } finally {
      setActionLoading(false);
    }
  };

  const fetchOrgDetail = async (org: any) => {
    setViewOrg(org); // show modal immediately with basic data
    setViewOrgLoading(true);
    try {
      const response = await fetchWithSuperadminTokenRefresh(`${API_BASE_URL}/api/superadmin/organizations/${org.id}/`, {
        headers: {
          "Authorization": `Bearer ${localStorage.getItem("superadmin_token")}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        setViewOrg(data);
      }
    } catch (error) {
      // fall back to list data already set
    } finally {
      setViewOrgLoading(false);
    }
  };

  const filteredOrgs = orgs.filter((o) => o.name.toLowerCase().includes(search.toLowerCase()));

  const getStatusBadge = (org: any) => {
    if (!org.is_active) {
      return <Badge variant="destructive">Suspended</Badge>;
    }

    if (org.plan_type === 'basic' && org.trial_ends_at) {
      const isExpired = new Date(org.trial_ends_at) < new Date();
      if (isExpired) {
        return (
          <div className="flex flex-col gap-1 items-start">
            <Badge variant="destructive">Trial Expired</Badge>
            <span className="text-[10px] text-muted-foreground">
              {new Date(org.trial_ends_at).toLocaleString()}
            </span>
          </div>);

      }
      return (
        <div className="flex flex-col gap-1 items-start">
          <Badge variant="secondary" className="bg-amber-100 text-amber-800 hover:bg-amber-100">Trial</Badge>
          <span className="text-[10px] text-muted-foreground">
            Ends: {new Date(org.trial_ends_at).toLocaleString()}
          </span>
        </div>);

    }

    return (
      <div className="flex flex-col gap-1 items-start">
        <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-200">Active</Badge>
        {org.subscription_expires_at ?
        <span className="text-[10px] text-muted-foreground">
            Expires: {new Date(org.subscription_expires_at).toLocaleString()}
          </span> :

        <span className="text-[10px] text-muted-foreground">No Expiry</span>
        }
      </div>);

  };

  const getPlanBadge = (plan: string) => {
    switch (plan) {
      case 'advance':return <Badge variant="outline" className="border-purple-500 text-purple-600">Advance</Badge>;
      case 'pro':return <Badge variant="outline" className="border-blue-500 text-blue-600">Pro</Badge>;
      default:return <Badge variant="outline" className="border-gray-400 text-gray-600">Basic</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <Card className={`shadow-sm backdrop-blur-sm transition-all duration-300 border ${theme === 'dark' ? 'bg-card/40 border-border text-foreground' : 'bg-white border-gray-100 text-gray-900'}`}>
        <CardHeader className="pb-4 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="w-full">
            <CardTitle className={`text-2xl font-semibold leading-none tracking-tight mb-2 ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>
              Organizations
            </CardTitle>
            <p className={`text-sm ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}`}>
              Manage tenant institutions across the platform.
            </p>
          </div>
          <Button className="bg-primary shadow-sm w-full md:w-auto flex-shrink-0" onClick={() => navigate('/stalightcampus')}>
            <Building2 className="w-4 h-4 mr-2" /> Add New Organization
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center w-full max-w-sm space-x-2">
            <div className="relative w-full">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search organizations..."
                className="pl-8 bg-background shadow-sm"
                value={search}
                onChange={(e) => setSearch(e.target.value)} />
            </div>
          </div>

          <div className="rounded-md border overflow-hidden">
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow>
                  <TableHead className="w-[300px]">Organization Name</TableHead>
                  <TableHead>Plan</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Users</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ?
                <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center">Loading...</TableCell>
                  </TableRow> :
                filteredOrgs.length === 0 ?
                <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">No organizations found.</TableCell>
                  </TableRow> :

                filteredOrgs.map((org) =>
                <TableRow key={org.id} className="hover:bg-muted/50">
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <div className="h-8 w-8 rounded bg-primary/10 flex items-center justify-center text-primary font-bold">
                            {org.name.substring(0, 1).toUpperCase()}
                          </div>
                          {org.name}
                        </div>
                      </TableCell>
                      <TableCell>{getPlanBadge(org.plan_type)}</TableCell>
                      <TableCell>{getStatusBadge(org)}</TableCell>
                      <TableCell className="text-muted-foreground">{org.user_count} users</TableCell>
                      <TableCell className="text-muted-foreground">{new Date(org.created_at).toLocaleDateString()}</TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => fetchOrgDetail(org)}>
                              <Eye className="w-4 h-4 mr-2 text-indigo-500" /> View Details
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => {
                          setPlanOrg(org);
                          setNewPlan(org.plan_type);
                        }}>
                              <Edit className="w-4 h-4 mr-2 text-blue-500" /> Change Plan
                            </DropdownMenuItem>
                            <DropdownMenuItem
                          className={`${org.name === "Stalight HQ" ? "text-gray-400 cursor-not-allowed" : "text-red-600 focus:text-red-600"}`}
                          onClick={() => org.name !== "Stalight HQ" && setDeleteOrg(org)}
                          disabled={org.name === "Stalight HQ"}>
                          
                              <Trash2 className="w-4 h-4 mr-2" /> Delete Organization
                              {org.name === "Stalight HQ" && <span className="text-xs ml-auto">(System Org)</span>}
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                )
                }
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteOrg} onOpenChange={(open) => !open && setDeleteOrg(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the organization
              <span className="font-bold text-foreground"> {deleteOrg?.name} </span>
              and remove all of its associated data, users, and records from our servers.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={actionLoading}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                handleDelete();
              }}
              className="bg-red-600 hover:bg-red-700"
              disabled={actionLoading}>
              
              {actionLoading ? "Deleting..." : "Delete Organization"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Change Plan Dialog */}
      <Dialog open={!!planOrg} onOpenChange={(open) => !open && setPlanOrg(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change Subscription Plan</DialogTitle>
            <DialogDescription>
              Update the billing plan for {planOrg?.name}. This will immediately affect their feature access.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Select value={newPlan} onValueChange={setNewPlan}>
              <SelectTrigger>
                <SelectValue placeholder="Select a plan" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="basic">Basic (Trial)</SelectItem>
                <SelectItem value="pro">Pro Plan</SelectItem>
                <SelectItem value="advance">Advance Plan</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPlanOrg(null)} disabled={actionLoading}>Cancel</Button>
            <Button onClick={handleChangePlan} disabled={actionLoading || newPlan === planOrg?.plan_type}>
              {actionLoading ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Details Dialog */}
      <Dialog open={!!viewOrg} onOpenChange={(open) => !open && setViewOrg(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl font-bold">
              <Building2 className="h-5 w-5 text-primary" />
              <span>{viewOrg?.name} details</span>
            </DialogTitle>
            <DialogDescription>
              Full profile, administrative POC, and subscription details.
            </DialogDescription>
          </DialogHeader>

          {viewOrgLoading && (
            <div className="flex items-center justify-center py-10 text-muted-foreground gap-2">
              <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
              Loading organization details...
            </div>
          )}

          {viewOrg && !viewOrgLoading && (
            <div className="space-y-6 py-4">
              {/* Institutional Details */}
              <div>
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider border-b pb-1 mb-3">
                  Institutional Profile
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-[11px] text-muted-foreground block uppercase font-medium">Institution Name</span>
                    <span className="font-semibold text-foreground text-base">{viewOrg.name || "N/A"}</span>
                  </div>
                  <div>
                    <span className="text-[11px] text-muted-foreground block uppercase font-medium">Email / Subdomain</span>
                    <span className="font-medium text-foreground">{viewOrg.domain || "N/A"}</span>
                  </div>
                  <div>
                    <span className="text-[11px] text-muted-foreground block uppercase font-medium">Accreditation ID</span>
                    <span className="font-medium text-foreground">{viewOrg.accreditation_id || "N/A"}</span>
                  </div>
                  <div>
                    <span className="text-[11px] text-muted-foreground block uppercase font-medium">Tax / GSTIN ID</span>
                    <span className="font-medium text-foreground">{viewOrg.tax_id || "N/A"}</span>
                  </div>
                  <div className="md:col-span-2">
                    <span className="text-[11px] text-muted-foreground block uppercase font-medium">Institution Address</span>
                    <span className="font-medium text-foreground block whitespace-pre-line bg-muted/30 p-2.5 rounded border">{viewOrg.address || "N/A"}</span>
                  </div>
                </div>
              </div>

              {/* Administrative Contact (Technical POC) */}
              <div>
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider border-b pb-1 mb-3">
                  Technical Point of Contact (POC)
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm bg-muted/20 p-3.5 rounded border">
                  <div>
                    <span className="text-[11px] text-muted-foreground block uppercase font-medium">POC Name</span>
                    <span className="font-semibold text-foreground">{viewOrg.tech_poc_name || "N/A"}</span>
                  </div>
                  <div>
                    <span className="text-[11px] text-muted-foreground block uppercase font-medium">POC Email</span>
                    <span className="font-medium text-foreground break-all">{viewOrg.tech_poc_email || "N/A"}</span>
                  </div>
                  <div>
                    <span className="text-[11px] text-muted-foreground block uppercase font-medium">POC Mobile</span>
                    <span className="font-medium text-foreground">{viewOrg.tech_poc_mobile || "N/A"}</span>
                  </div>
                </div>
              </div>

              {/* Organization Admin Details */}
              <div>
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider border-b pb-1 mb-3">
                  Organization Admin
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm bg-indigo-50/10 dark:bg-indigo-950/15 p-3.5 rounded border border-indigo-100/30">
                  <div>
                    <span className="text-[11px] text-muted-foreground block uppercase font-medium">Name</span>
                    <span className="font-semibold text-foreground">
                      {viewOrg.org_admin?.name || "N/A"}
                    </span>
                  </div>
                  <div>
                    <span className="text-[11px] text-muted-foreground block uppercase font-medium">Email</span>
                    <span className="font-medium text-foreground break-all">
                      {viewOrg.org_admin?.email || "N/A"}
                    </span>
                  </div>
                  <div>
                    <span className="text-[11px] text-muted-foreground block uppercase font-medium">Mobile</span>
                    <span className="font-medium text-foreground">
                      {viewOrg.org_admin?.mobile_number || "N/A"}
                    </span>
                  </div>
                  <div>
                    <span className="text-[11px] text-muted-foreground block uppercase font-medium">Username / Login ID</span>
                    <span className="font-medium text-foreground font-mono text-xs tracking-tight">
                      {viewOrg.org_admin?.username || "N/A"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Principal Details */}
              <div>
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider border-b pb-1 mb-3">
                  Principal Administrator
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm bg-slate-50/50 dark:bg-slate-900/50 p-3.5 rounded border border-slate-200 dark:border-slate-800">
                  <div>
                    <span className="text-[11px] text-muted-foreground block uppercase font-medium">Name</span>
                    <span className="font-semibold text-foreground">
                      {viewOrg.principal?.name || "N/A"}
                    </span>
                  </div>
                  <div>
                    <span className="text-[11px] text-muted-foreground block uppercase font-medium">Email</span>
                    <span className="font-medium text-foreground break-all">
                      {viewOrg.principal?.email || "N/A"}
                    </span>
                  </div>
                  <div>
                    <span className="text-[11px] text-muted-foreground block uppercase font-medium">Mobile</span>
                    <span className="font-medium text-foreground">
                      {viewOrg.principal?.mobile_number || "N/A"}
                    </span>
                  </div>
                  <div>
                    <span className="text-[11px] text-muted-foreground block uppercase font-medium">Username / Login ID</span>
                    <span className="font-medium text-foreground font-mono text-xs tracking-tight">
                      {viewOrg.principal?.username || "N/A"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Subscription & User Details */}
              <div>
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider border-b pb-1 mb-3">
                  Plan & Subscription Info
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-[11px] text-muted-foreground block uppercase font-medium">Active Subscription Plan</span>
                    <div className="mt-1">{getPlanBadge(viewOrg.plan_type)}</div>
                  </div>
                  <div>
                    <span className="text-[11px] text-muted-foreground block uppercase font-medium">Current Status</span>
                    <div className="mt-1">{getStatusBadge(viewOrg)}</div>
                  </div>
                  <div>
                    <span className="text-[11px] text-muted-foreground block uppercase font-medium">Users Registered</span>
                    <span className="font-semibold text-foreground">{viewOrg.user_count} users</span>
                  </div>
                  <div>
                    <span className="text-[11px] text-muted-foreground block uppercase font-medium">Onboarded Since</span>
                    <span className="font-medium text-foreground">{new Date(viewOrg.created_at).toLocaleString("en-IN")}</span>
                  </div>
                  <div className="md:col-span-2">
                    <span className="text-[11px] text-muted-foreground block uppercase font-medium">Billing Address</span>
                    <span className="font-medium text-foreground block whitespace-pre-line bg-muted/30 p-2.5 rounded border">{viewOrg.billing_address || "N/A"}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="border-t pt-3 mt-2">
            <Button onClick={() => setViewOrg(null)}>Close Details</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>);

};

export default Organizations;