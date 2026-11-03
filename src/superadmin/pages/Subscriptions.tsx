import { useState, useEffect } from "react";
import { format } from "date-fns";
import { API_BASE_URL } from "@/utils/config";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../../components/ui/table";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { useTheme } from "../../context/ThemeContext";
import { Card, CardHeader, CardTitle, CardContent } from "../../components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../../components/ui/dialog";
import { Label } from "../../components/ui/label";
import { Switch } from "../../components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../components/ui/select";
import { DateTimePicker } from "@/components/ui/datetime-picker";
import { fetchWithSuperadminTokenRefresh } from "../../utils/authService";
import { useToast } from "@/components/ui/use-toast";
import { Loader2, Pencil, Calendar, CheckCircle2, RefreshCw } from "lucide-react";

interface SubscriptionItem {
  id: number;
  org_name: string;
  plan: string;
  status: string;
  expires_at: string;
  expires_at_raw?: string;
  auto_renew: boolean;
  is_active?: boolean;
}

const Subscriptions = () => {
  const [data, setData] = useState<SubscriptionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingItem, setEditingItem] = useState<SubscriptionItem | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Form fields
  const [editPlan, setEditPlan] = useState<string>("advance");
  const [editAutoRenew, setEditAutoRenew] = useState<boolean>(true);
  const [editNoExpiry, setEditNoExpiry] = useState<boolean>(false);
  const [selectedExpiryDate, setSelectedExpiryDate] = useState<Date | undefined>(undefined);

  const { theme } = useTheme();
  const { toast } = useToast();

  const fetchData = async () => {
    try {
      const response = await fetchWithSuperadminTokenRefresh(`${API_BASE_URL}/api/superadmin/subscriptions/`, {
        headers: { "Authorization": `Bearer ${localStorage.getItem("superadmin_token")}` }
      });
      const res = await response.json();
      setData(res.subscriptions || []);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load subscriptions.",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleOpenEdit = (item: SubscriptionItem) => {
    setEditingItem(item);
    setEditPlan((item.plan || "advance").toLowerCase());
    setEditAutoRenew(Boolean(item.auto_renew));

    const isNoExp = !item.expires_at || item.expires_at === "No Expiry";
    setEditNoExpiry(isNoExp);

    if (isNoExp) {
      setSelectedExpiryDate(undefined);
    } else if (item.expires_at_raw) {
      const parsed = new Date(item.expires_at_raw);
      setSelectedExpiryDate(isNaN(parsed.getTime()) ? undefined : parsed);
    } else {
      const formatted = item.expires_at.replace(" ", "T");
      const parsed = new Date(formatted);
      setSelectedExpiryDate(isNaN(parsed.getTime()) ? undefined : parsed);
    }

    setIsDialogOpen(true);
  };

  // Helper to add duration to current date or existing date
  const setQuickExpiry = (monthsToAdd: number) => {
    setEditNoExpiry(false);
    const target = new Date();
    target.setMonth(target.getMonth() + monthsToAdd);
    setSelectedExpiryDate(target);
  };

  const handleSave = async () => {
    if (!editingItem) return;

    if (!editNoExpiry && !selectedExpiryDate) {
      toast({
        variant: "destructive",
        title: "Missing Date",
        description: "Please specify an expiration date or select 'No Expiry'.",
      });
      return;
    }

    setIsSaving(true);
    try {
      const formattedExpiry = selectedExpiryDate
        ? format(selectedExpiryDate, "yyyy-MM-dd'T'HH:mm")
        : null;

      const payload = {
        plan: editPlan,
        auto_renew: editAutoRenew,
        subscription_expires_at: editNoExpiry ? null : formattedExpiry,
      };

      const response = await fetchWithSuperadminTokenRefresh(
        `${API_BASE_URL}/api/superadmin/subscriptions/${editingItem.id}/`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${localStorage.getItem("superadmin_token")}`,
          },
          body: JSON.stringify(payload),
        }
      );

      const res = await response.json();
      if (response.ok && res.subscription) {
        setData((prev) =>
          prev.map((sub) => (sub.id === editingItem.id ? res.subscription : sub))
        );
        toast({
          title: "Subscription Updated",
          description: res.message || `Updated subscription for ${editingItem.org_name}.`,
        });
        setIsDialogOpen(false);
      } else {
        toast({
          variant: "destructive",
          title: "Update Failed",
          description: res.error || "Unable to update subscription.",
        });
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Network Error",
        description: "Could not reach the server to save changes.",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "Active":
        return <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-200 border-none">Active</Badge>;
      case "Trial":
        return <Badge variant="secondary" className="bg-amber-100 text-amber-800 hover:bg-amber-100 border-none">Trial</Badge>;
      case "Expired":
      case "Trial Expired":
        return <Badge variant="destructive">Expired</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getPlanBadge = (plan: string) => {
    switch (plan.toLowerCase()) {
      case "advance":
        return <Badge variant="outline" className="border-purple-500 text-purple-600 bg-purple-50/50 dark:bg-purple-950/20 font-medium">Advance</Badge>;
      case "pro":
        return <Badge variant="outline" className="border-blue-500 text-blue-600 bg-blue-50/50 dark:bg-blue-950/20 font-medium">Pro</Badge>;
      default:
        return <Badge variant="outline" className="border-gray-400 text-gray-600 bg-gray-50/50 dark:bg-gray-900/20 font-medium">Basic</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <Card
        className={`shadow-sm backdrop-blur-sm transition-all duration-300 border ${
          theme === "dark"
            ? "bg-card/40 border-border text-foreground"
            : "bg-white border-gray-100 text-gray-900"
        }`}
      >
        <CardHeader className="flex flex-row items-center justify-between pb-4">
          <div>
            <CardTitle
              className={`text-2xl font-semibold leading-none tracking-tight mb-2 ${
                theme === "dark" ? "text-foreground" : "text-gray-900"
              }`}
            >
              Subscriptions
            </CardTitle>
            <p className={`text-sm ${theme === "dark" ? "text-muted-foreground" : "text-gray-500"}`}>
              Manage active trials, plans, and subscription expirations.
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={fetchData}
            disabled={loading}
            className="h-9 px-3 gap-1.5 text-xs font-medium"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border overflow-hidden">
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow>
                  <TableHead>Organization</TableHead>
                  <TableHead>Plan</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Expires At</TableHead>
                  <TableHead>Auto Renew</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-28 text-center text-muted-foreground">
                      <div className="flex items-center justify-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin text-primary" />
                        <span>Loading subscriptions...</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : data.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                      No organizations found.
                    </TableCell>
                  </TableRow>
                ) : (
                  data.map((item) => (
                    <TableRow key={item.id} className="hover:bg-muted/40 transition-colors">
                      <TableCell className="font-medium text-foreground">{item.org_name}</TableCell>
                      <TableCell>{getPlanBadge(item.plan)}</TableCell>
                      <TableCell>{getStatusBadge(item.status)}</TableCell>
                      <TableCell className="text-muted-foreground">{item.expires_at}</TableCell>
                      <TableCell>
                        {item.auto_renew ? (
                          <Badge variant="outline" className="border-blue-200 text-blue-700 bg-blue-50 dark:bg-blue-950/40 dark:border-blue-800 dark:text-blue-300">
                            Yes
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="border-gray-200 text-gray-500 bg-gray-50 dark:bg-gray-800/40 dark:border-gray-700 dark:text-gray-400">
                            No
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 px-2.5 text-xs font-medium gap-1.5 hover:bg-primary/10 hover:text-primary transition-colors"
                          onClick={() => handleOpenEdit(item)}
                        >
                          <Pencil className="w-3.5 h-3.5" />
                          Edit
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Edit Subscription Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <Pencil className="w-5 h-5 text-primary" />
              Edit Subscription
            </DialogTitle>
            <DialogDescription>
              Adjust subscription plan, expiration date, and auto-renewal for{" "}
              <span className="font-semibold text-foreground">{editingItem?.org_name}</span>.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5 py-2">
            {/* Plan Selection */}
            <div className="space-y-2">
              <Label htmlFor="plan" className="text-sm font-semibold">
                Subscription Plan
              </Label>
              <Select value={editPlan} onValueChange={setEditPlan}>
                <SelectTrigger id="plan" className="w-full">
                  <SelectValue placeholder="Select plan" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="advance">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-purple-600 dark:text-purple-400">Advance</span>
                      <span className="text-xs text-muted-foreground">— Full feature suite</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="pro">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-blue-600 dark:text-blue-400">Pro</span>
                      <span className="text-xs text-muted-foreground">— Core modules</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="basic">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-gray-600 dark:text-gray-400">Basic</span>
                      <span className="text-xs text-muted-foreground">— Trial & essential tier</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Auto Renew Switch */}
            <div className="flex items-center justify-between rounded-lg border p-3.5 bg-muted/20">
              <div className="space-y-0.5">
                <Label htmlFor="auto_renew_toggle" className="text-sm font-semibold cursor-pointer">
                  Auto Renew
                </Label>
                <p className="text-xs text-muted-foreground">
                  Flag institution for automatic cycle renewal
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-muted-foreground">
                  {editAutoRenew ? "Yes" : "No"}
                </span>
                <Switch
                  id="auto_renew_toggle"
                  checked={editAutoRenew}
                  onCheckedChange={setEditAutoRenew}
                />
              </div>
            </div>

            {/* Expiration Settings */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-semibold flex items-center gap-1.5">
                  <Calendar className="w-4 h-4 text-primary" />
                  Expiration Date & Time
                </Label>
                <div className="flex items-center gap-2">
                  <Label htmlFor="no_expiry_toggle" className="text-xs font-medium cursor-pointer text-muted-foreground">
                    No Expiry (Lifetime)
                  </Label>
                  <Switch
                    id="no_expiry_toggle"
                    checked={editNoExpiry}
                    onCheckedChange={(checked) => {
                      setEditNoExpiry(checked);
                      if (!checked && !selectedExpiryDate) {
                        setQuickExpiry(12); // Default to +1 year if unchecking
                      }
                    }}
                  />
                </div>
              </div>

              {!editNoExpiry ? (
                <div className="space-y-2">
                  <DateTimePicker
                    value={selectedExpiryDate}
                    onChange={(d) => setSelectedExpiryDate(d)}
                    className="h-10 text-sm font-normal"
                  />
                  <div className="flex items-center gap-1.5 pt-1">
                    <span className="text-xs text-muted-foreground mr-1">Presets:</span>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-7 px-2 text-xs"
                      onClick={() => setQuickExpiry(1)}
                    >
                      +1 Mo
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-7 px-2 text-xs"
                      onClick={() => setQuickExpiry(3)}
                    >
                      +3 Mo
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-7 px-2 text-xs"
                      onClick={() => setQuickExpiry(12)}
                    >
                      +1 Yr
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-7 px-2 text-xs"
                      onClick={() => setQuickExpiry(24)}
                    >
                      +2 Yr
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="rounded-md border border-dashed border-emerald-500/40 bg-emerald-50/50 dark:bg-emerald-950/20 p-3 text-center">
                  <p className="text-xs font-medium text-emerald-700 dark:text-emerald-400">
                    Organization will have unrestricted lifetime access with no expiration.
                  </p>
                </div>
              )}

              {editingItem?.status === "Expired" && (!editNoExpiry || selectedExpiryDate) && (
                <div className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 bg-emerald-50/60 dark:bg-emerald-950/20 p-2 rounded-md">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>Setting a future date will reactivate this organization's access.</span>
                </div>
              )}
            </div>
          </div>

          <DialogFooter className="pt-2 gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsDialogOpen(false)}
              disabled={isSaving}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="default"
              onClick={handleSave}
              disabled={isSaving}
              className="gap-1.5"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Changes"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Subscriptions;
