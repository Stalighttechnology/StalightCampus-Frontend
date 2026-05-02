import { useState, useEffect } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../../components/ui/table";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Search, MoreVertical, Building2, Trash2, Edit } from "lucide-react";
import { useTheme } from "../../context/ThemeContext";
import { useNavigate } from "react-router-dom";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../../components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "../../components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../../components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../components/ui/select";

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

  const fetchOrgs = async () => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/api/superadmin/organizations/`, {
        headers: {
          "Authorization": `Bearer ${localStorage.getItem("superadmin_token")}`
        }
      });
      const data = await response.json();
      setOrgs(data.organizations || []);
    } catch (error) {
      console.error("Error fetching organizations:", error);
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
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/api/superadmin/organizations/${deleteOrg.id}/`, {
        method: 'DELETE',
        headers: {
          "Authorization": `Bearer ${localStorage.getItem("superadmin_token")}`
        }
      });
      if (response.ok) {
        setOrgs(orgs.filter(o => o.id !== deleteOrg.id));
        setDeleteOrg(null);
      }
    } catch (error) {
      console.error("Error deleting organization:", error);
    } finally {
      setActionLoading(false);
    }
  };

  const handleChangePlan = async () => {
    if (!planOrg || !newPlan) return;
    setActionLoading(true);
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/api/superadmin/organizations/${planOrg.id}/`, {
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
      console.error("Error updating organization:", error);
    } finally {
      setActionLoading(false);
    }
  };

  const filteredOrgs = orgs.filter(o => o.name.toLowerCase().includes(search.toLowerCase()));

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
          </div>
        );
      }
      return (
        <div className="flex flex-col gap-1 items-start">
          <Badge variant="secondary" className="bg-amber-100 text-amber-800 hover:bg-amber-100">Trial</Badge>
          <span className="text-[10px] text-muted-foreground">
            Ends: {new Date(org.trial_ends_at).toLocaleString()}
          </span>
        </div>
      );
    }

    return (
      <div className="flex flex-col gap-1 items-start">
        <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-200">Active</Badge>
        {org.subscription_expires_at ? (
          <span className="text-[10px] text-muted-foreground">
            Expires: {new Date(org.subscription_expires_at).toLocaleString()}
          </span>
        ) : (
          <span className="text-[10px] text-muted-foreground">No Expiry</span>
        )}
      </div>
    );
  };

  const getPlanBadge = (plan: string) => {
    switch (plan) {
      case 'advance': return <Badge variant="outline" className="border-purple-500 text-purple-600">Advance</Badge>;
      case 'pro': return <Badge variant="outline" className="border-blue-500 text-blue-600">Pro</Badge>;
      default: return <Badge variant="outline" className="border-gray-400 text-gray-600">Basic</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className={`text-3xl font-bold tracking-tight ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>Organizations</h1>
          <p className="text-muted-foreground mt-1">Manage tenant institutions across the platform.</p>
        </div>
        <Button className="bg-primary shadow-sm" onClick={() => navigate('/stalightcampus')}>
          <Building2 className="w-4 h-4 mr-2" /> Add New Organization
        </Button>
      </div>

      <div className="flex items-center w-full max-w-sm space-x-2">
        <div className="relative w-full">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search organizations..."
            className="pl-8 bg-background shadow-sm"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="rounded-md border bg-card shadow-sm overflow-hidden">
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
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center">Loading...</TableCell>
              </TableRow>
            ) : filteredOrgs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">No organizations found.</TableCell>
              </TableRow>
            ) : (
              filteredOrgs.map((org) => (
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
                        <DropdownMenuItem onClick={() => {
                          setPlanOrg(org);
                          setNewPlan(org.plan_type);
                        }}>
                          <Edit className="w-4 h-4 mr-2 text-blue-500" /> Change Plan
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-red-600 focus:text-red-600"
                          onClick={() => setDeleteOrg(org)}
                        >
                          <Trash2 className="w-4 h-4 mr-2" /> Delete Organization
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

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
              disabled={actionLoading}
            >
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
    </div>
  );
};

export default Organizations;
