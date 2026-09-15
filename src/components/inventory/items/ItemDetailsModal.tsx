import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../../ui/dialog";
import { Popover, PopoverTrigger, PopoverContent } from "../../ui/popover";
import { Button } from "../../ui/button";
import { Input } from "../../ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "../../ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../ui/select";
import { Textarea } from "../../ui/textarea";
import {
  InventoryItem,
  InventoryHistoryLog,
  fetchItemHistory,
  updateInventoryItem,
  splitTransferInventoryItem,
  fetchInventoryPersonnel,
  generateItemQR,
  fetchBranches,
  fetchInventoryLocations,
} from "../../../utils/inventory_api";
import { InventoryStatusBadge } from "../common/InventoryStatusBadge";
import { ItemHistoryTimeline } from "./ItemHistoryTimeline";
import { QRCodePreviewModal } from "../common/QRCodePreviewModal";
import {
  Tag,
  Building,
  Calendar,
  IndianRupee,
  FileText,
  QrCode,
  History,
  Wrench,
  Loader2,
  Trash2,
  ArrowRightLeft,
  ExternalLink,
  UserCheck,
  Search,
  CheckCircle2,
  Package,
  Layers,
  ChevronsUpDown,
  Check,
  Plus,
  Users,
} from "lucide-react";
import { toast } from "sonner";

interface Props {
  item: InventoryItem | null;
  isOpen: boolean;
  onClose: () => void;
  onRefresh: () => void;
  onRaiseTicket?: (item: InventoryItem) => void;
  locations?: Array<{ id: number; name: string }>;
  branches?: Array<{ id: number; name: string }>;
  role?: string;
}

export const ItemDetailsModal: React.FC<Props> = ({
  item,
  isOpen,
  onClose,
  onRefresh,
  onRaiseTicket,
  locations = [],
  branches = [],
  role = "admin",
}) => {
  const isFaculty = role === "faculty" || role === "staff";
  const canCUD = role === "inventory_manager" || role === "superadmin";
  const [activeTab, setActiveTab] = useState("overview");
  const [history, setHistory] = useState<InventoryHistoryLog[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [showQRModal, setShowQRModal] = useState(false);

  // Status Form State
  const [statusEdit, setStatusEdit] = useState<string>("");
  const [statusRemarks, setStatusRemarks] = useState("");
  const [statusUpdating, setStatusUpdating] = useState(false);

  // Transfer & Partial Allocation Form State
  const [transferMode, setTransferMode] = useState<"full" | "split">("full");
  const [transferQuantity, setTransferQuantity] = useState(1);
  const [locationEdit, setLocationEdit] = useState<string>("");
  const [departmentEdit, setDepartmentEdit] = useState<string>("");
  const [roomEdit, setRoomEdit] = useState<string>("");
  const [transferRemarks, setTransferRemarks] = useState("");
  const [transferUpdating, setTransferUpdating] = useState(false);

  // Recipient / Custodian Handover State
  const [recipientRole, setRecipientRole] = useState("");
  const [recipientBranch, setRecipientBranch] = useState("");
  const [recipientId, setRecipientId] = useState("");
  const [recipientName, setRecipientName] = useState("");
  const [personnelSearch, setPersonnelSearch] = useState("");
  const [recipientPopoverOpen, setRecipientPopoverOpen] = useState(false);
  const [personnelList, setPersonnelList] = useState<Array<{
    id: number;
    name: string;
    email: string;
    role: string;
    branch_id?: number;
    branch_name?: string;
  }>>([]);
  const [loadingPersonnel, setLoadingPersonnel] = useState(false);
  const [personnelPage, setPersonnelPage] = useState(1);
  const [personnelTotalPages, setPersonnelTotalPages] = useState(1);
  const [personnelTotalCount, setPersonnelTotalCount] = useState(0);

  // Dynamic Lists for Locations and Departments/Branches
  const [branchList, setBranchList] = useState<Array<{ id: number; name: string }>>(branches);
  const [locationList, setLocationList] = useState<Array<{ id: number; name: string }>>(locations);

  useEffect(() => {
    if (branches && branches.length > 0) {
      setBranchList(branches);
    } else if (isOpen && branchList.length === 0) {
      fetchBranches()
        .then((res) => setBranchList(Array.isArray(res) ? res : []))
        .catch(console.error);
    }
  }, [branches, isOpen]);

  useEffect(() => {
    if (locations && locations.length > 0) {
      setLocationList(locations);
    } else if (isOpen && locationList.length === 0) {
      fetchInventoryLocations()
        .then((res) => setLocationList(Array.isArray(res) ? res : []))
        .catch(console.error);
    }
  }, [locations, isOpen]);

  const loadPersonnel = async (roleVal: string, branchVal: string, searchVal: string, pageVal: number = 1) => {
    if (!roleVal) {
      setPersonnelList([]);
      return;
    }
    const isBranchSpecific = ["faculty", "teacher", "hod", "staff"].includes(roleVal);
    if (isBranchSpecific && (!branchVal || branchVal === "" || branchVal === "unassigned")) {
      setPersonnelList([]);
      return;
    }

    try {
      setLoadingPersonnel(true);
      const params: Record<string, any> = {
        page: pageVal,
        page_size: 10,
      };
      if (roleVal && roleVal !== "all") params.role = roleVal;
      if (isBranchSpecific && branchVal && branchVal !== "all" && branchVal !== "none" && branchVal !== "unassigned") {
        params.branch = branchVal;
      }
      if (searchVal.trim()) params.search = searchVal.trim();
      const res = await fetchInventoryPersonnel(params);
      setPersonnelList(res.results || []);
      setPersonnelTotalPages(res.total_pages || 1);
      setPersonnelTotalCount(res.count || 0);
      setPersonnelPage(res.current_page || pageVal);
    } catch (err: any) {
      console.error("Failed to load personnel:", err);
      setPersonnelList([]);
      setPersonnelTotalPages(1);
      setPersonnelTotalCount(0);
    } finally {
      setLoadingPersonnel(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      if (!recipientRole) {
        setPersonnelList([]);
        return;
      }
      const isBranchSpecific = ["faculty", "teacher", "hod", "staff"].includes(recipientRole);
      if (isBranchSpecific && !recipientBranch) {
        setPersonnelList([]);
        return;
      }
      setPersonnelPage(1);
      const handler = setTimeout(() => {
        loadPersonnel(recipientRole, recipientBranch, personnelSearch, 1);
      }, 250);
      return () => clearTimeout(handler);
    }
  }, [recipientRole, recipientBranch, personnelSearch, isOpen]);

  useEffect(() => {
    if (!item || !isOpen) return;

    setStatusEdit(item.status);
    setStatusRemarks("");

    setTransferMode(item.quantity_available > 1 ? "split" : "full");
    setTransferQuantity(item.quantity_available > 1 ? 1 : item.quantity_available);
    setLocationEdit(item.location ? String(item.location) : "");
    const curBranch = item.branch ? String(item.branch) : "unassigned";
    setDepartmentEdit(curBranch);
    setRoomEdit(item.room_no || "");
    setTransferRemarks("");
    setRecipientRole("");
    setRecipientBranch("");
    setRecipientId("");
    setRecipientName("");
    setPersonnelSearch("");
    setPersonnelList([]);
    setPersonnelPage(1);

    // Load history
    setHistoryLoading(true);
    fetchItemHistory(item.id)
      .then((data) => setHistory(data))
      .catch((err) => console.error("Error fetching item history:", err))
      .finally(() => setHistoryLoading(false));
  }, [item, isOpen]);

  if (!item) return null;

  const handleStatusUpdate = async () => {
    try {
      setStatusUpdating(true);
      await updateInventoryItem(item.id, {
        status: statusEdit,
        remarks: statusRemarks.trim() || `Operational status updated to ${statusEdit}`,
      });
      toast.success("Asset status updated successfully");
      setStatusRemarks("");
      onRefresh();
      // Refresh history
      const freshHistory = await fetchItemHistory(item.id);
      setHistory(freshHistory);
    } catch (err: any) {
      toast.error(err.message || "Failed to update status");
    } finally {
      setStatusUpdating(false);
    }
  };

  const handleTransferSubmit = async () => {
    const qty = transferMode === "full" ? item.quantity_available : Number(transferQuantity);
    if (qty <= 0) {
      toast.error("Transfer quantity must be at least 1");
      return;
    }
    if (qty > item.quantity_available) {
      toast.error(`Cannot transfer more than available quantity (${item.quantity_available})`);
      return;
    }

    if (!locationEdit) {
      toast.error("Please select a destination location / campus block.");
      return;
    }

    if (!departmentEdit || departmentEdit === "unassigned") {
      toast.error("Please select an assigned department / branch.");
      return;
    }

    if (!roomEdit.trim()) {
      toast.error("Please enter a destination room / lab / desk no.");
      return;
    }

    if (!recipientRole) {
      toast.error("Please select a recipient / custodian role.");
      return;
    }

    if (!recipientName.trim()) {
      toast.error("Please select or assign a recipient / custodian.");
      return;
    }

    try {
      setTransferUpdating(true);
      const payload: any = {
        quantity: qty,
        location_id: locationEdit ? Number(locationEdit) : undefined,
        branch_id: departmentEdit && departmentEdit !== "unassigned" ? Number(departmentEdit) : null,
        room_no: roomEdit.trim(),
        received_by_id: recipientId ? Number(recipientId) : null,
        received_by_name: recipientName.trim(),
        received_by_role: recipientRole,
        remarks: transferRemarks.trim(),
      };

      const res = await splitTransferInventoryItem(item.id, payload);
      toast.success(res.message || "Asset transfer / allocation completed successfully");
      setTransferRemarks("");
      onRefresh();
      // Reload history
      const freshHistory = await fetchItemHistory(item.id);
      setHistory(freshHistory);
      setActiveTab("history");
    } catch (err: any) {
      toast.error(err.message || "Failed to transfer item");
    } finally {
      setTransferUpdating(false);
    }
  };

  const handleGenerateQR = async () => {
    try {
      const res = await generateItemQR(item.id);
      toast.success("QR Code generated successfully");
      setShowQRModal(true);
      onRefresh();
    } catch (err: any) {
      toast.error(err.message || "Failed to generate QR");
    }
  };

  const gridCols = isFaculty ? "grid-cols-2" : canCUD ? "grid-cols-5" : "grid-cols-3";

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto p-6">
          {/* Header */}
          <DialogHeader className="border-b pb-4 pr-8">
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-mono text-sm font-black px-2.5 py-0.5 rounded-lg bg-primary/10 text-primary border border-primary/20">
                    {item.item_code}
                  </span>
                  <InventoryStatusBadge status={item.status} size="md" />
                  <span className="text-xs px-2 py-0.5 rounded-md bg-muted font-semibold text-muted-foreground uppercase">
                    {item.asset_type.replace(/_/g, " ")}
                  </span>
                  <span className="text-xs px-2 py-0.5 rounded-md bg-primary/10 font-bold text-primary">
                    {item.quantity_available} Available Unit(s)
                  </span>
                </div>
                <DialogTitle className="text-2xl font-black text-foreground pt-1">
                  {item.item_name}
                </DialogTitle>
              </div>

              {/* Quick Actions */}
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowQRModal(true)}
                  className="gap-1.5 text-xs font-semibold"
                >
                  <QrCode className="w-3.5 h-3.5" /> Badge
                </Button>
                {onRaiseTicket && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      onClose();
                      onRaiseTicket(item);
                    }}
                    className="gap-1.5 text-xs font-semibold text-amber-600 border-amber-200 hover:bg-amber-50"
                  >
                    <Wrench className="w-3.5 h-3.5" /> Report Issue
                  </Button>
                )}
              </div>
            </div>
          </DialogHeader>

          {/* Navigation Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-4">
            <TabsList className={`grid ${gridCols} w-full`}>
              <TabsTrigger value="overview">Overview</TabsTrigger>
              {!isFaculty && <TabsTrigger value="documents">Media & Invoices</TabsTrigger>}
              {canCUD && <TabsTrigger value="status">Status</TabsTrigger>}
              {canCUD && (
                <TabsTrigger value="transfer" className="gap-1.5">
                  <ArrowRightLeft className="w-3.5 h-3.5" /> Transfer & Allocate
                </TabsTrigger>
              )}
              <TabsTrigger value="history" className="gap-1.5">
                <History className="w-3.5 h-3.5" /> Timeline
              </TabsTrigger>
            </TabsList>

            {/* Overview Tab */}
            <TabsContent value="overview" className="space-y-4 pt-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {/* Category Card */}
                <div className="p-3.5 rounded-xl border bg-muted/20 space-y-1">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <Tag className="w-3.5 h-3.5 text-primary" /> Category
                  </span>
                  <div className="font-semibold text-sm text-foreground">
                    {item.category_details?.name || "General"}
                  </div>
                  <div className="text-[11px] text-muted-foreground">
                    Code Prefix: {item.category_details?.prefix || "--"}
                  </div>
                </div>

                {/* Location Card */}
                <div className="p-3.5 rounded-xl border bg-muted/20 space-y-1">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <Building className="w-3.5 h-3.5 text-primary" /> Location & Room
                  </span>
                  <div className="font-semibold text-sm text-foreground">
                    {item.location_details?.name || "Unassigned Block"}
                  </div>
                  <div className="text-[11px] text-muted-foreground">
                    Room / Lab: <strong className="text-foreground">{item.room_no || "N/A"}</strong>
                  </div>
                </div>

                {/* Department Card */}
                <div className="p-3.5 rounded-xl border bg-muted/20 space-y-1">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <Building className="w-3.5 h-3.5 text-primary" /> Department / Branch
                  </span>
                  <div className="font-semibold text-sm text-foreground">
                    {item.branch_name || "Institutional / General"}
                  </div>
                  <div className="text-[11px] text-muted-foreground">
                    Org Scope: Active Campus
                  </div>
                </div>

                {/* Valuation & Quantity Card */}
                {!isFaculty && (
                  <div className="p-3.5 rounded-xl border bg-muted/20 space-y-1 sm:col-span-2 lg:col-span-1">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                      <IndianRupee className="w-3.5 h-3.5 text-primary" /> Valuation
                    </span>
                    <div className="font-semibold text-sm text-foreground">
                      ₹{Number(item.total_cost || 0).toLocaleString("en-IN")}
                    </div>
                    <div className="text-[11px] text-muted-foreground">
                      {item.quantity_available} unit(s) @ ₹{Number(item.cost_per_unit || 0).toLocaleString("en-IN")}/unit
                    </div>
                  </div>
                )}

                {/* Dates Card */}
                <div className="p-3.5 rounded-xl border bg-muted/20 space-y-1">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-primary" /> Registration Date
                  </span>
                  <div className="font-semibold text-sm text-foreground">
                    {new Date(item.created_at).toLocaleDateString()}
                  </div>
                  <div className="text-[11px] text-muted-foreground">
                    Added by: {item.created_by_name || "System"}
                  </div>
                </div>

                {/* Vendor / Invoice Info */}
                {!isFaculty && (
                  <div className="p-3.5 rounded-xl border bg-muted/20 space-y-1">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                      <FileText className="w-3.5 h-3.5 text-primary" /> Procurement & Invoice
                    </span>
                    <div className="font-semibold text-sm text-foreground truncate">
                      {item.vendor_name || "Direct Stock / Requisition"}
                    </div>
                    <div className="text-[11px] text-muted-foreground truncate">
                      Invoice: {item.invoice_no || "--"}
                    </div>
                  </div>
                )}
              </div>

              {/* Specifications & Remarks */}
              <div className="space-y-3 pt-2">
                {item.specifications && (
                  <div className="p-3.5 rounded-xl border bg-card space-y-1">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      Technical Specifications & Description
                    </h4>
                    <p className="text-xs text-foreground whitespace-pre-wrap leading-relaxed">
                      {item.specifications}
                    </p>
                  </div>
                )}

                {item.remarks && (
                  <div className="p-3.5 rounded-xl border bg-card space-y-1">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      Notes & Custody Remarks
                    </h4>
                    <p className="text-xs text-foreground whitespace-pre-wrap leading-relaxed">
                      {item.remarks}
                    </p>
                  </div>
                )}
              </div>
            </TabsContent>

            {/* Documents & Media Tab (Only for Admins/Managers) */}
            {!isFaculty && (
              <TabsContent value="documents" className="space-y-4 pt-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Item Photo */}
                  <div className="p-4 rounded-xl border bg-card space-y-2">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      Asset Photograph
                    </h4>
                    {item.item_photo_url ? (
                      <div className="space-y-2">
                        <img
                          src={item.item_photo_url}
                          alt={item.item_name}
                          className="w-full h-48 object-cover rounded-lg border"
                        />
                        <a
                          href={item.item_photo_url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-xs text-primary font-bold hover:underline flex items-center gap-1"
                        >
                          View Full Image <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground">No photograph uploaded</p>
                    )}
                  </div>

                  {/* Invoice Document */}
                  <div className="p-4 rounded-xl border bg-card space-y-2">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      Invoice / Purchase Order
                    </h4>
                    {item.invoice_photo_url ? (
                      <div className="space-y-2">
                        <div className="p-4 rounded-lg bg-muted/40 border text-center space-y-1">
                          <FileText className="w-8 h-8 text-primary mx-auto" />
                          <p className="text-xs font-semibold">{item.invoice_no || "Invoice File"}</p>
                        </div>
                        <a
                          href={item.invoice_photo_url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-xs text-primary font-bold hover:underline flex items-center gap-1"
                        >
                          Open Document <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground">No invoice document attached</p>
                    )}
                  </div>
                </div>
              </TabsContent>
            )}

            {/* Status Tab */}
            <TabsContent value="status" className="space-y-4 pt-3">
              <div className="bg-card border rounded-2xl p-4 space-y-4">
                <div className="border-b pb-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-foreground">
                    Update Condition / Status
                  </h4>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    Update the operational lifecycle condition of this asset.
                  </p>
                </div>

                {!item.branch && (
                  <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-200 text-xs">
                    <p className="font-semibold">Central Store Buffer Stock</p>
                    <p className="text-[11px] mt-0.5 opacity-90">
                      This unit is currently in central buffer stock and has not been allotted to any department. Unallotted items cannot be marked as In Repair, Scrapped, or Discarded. Please use the <strong>Transfer / Allocate</strong> tab to assign this unit to a department first.
                    </p>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-foreground mb-1">
                      Current Status
                    </label>
                    <Select value={statusEdit} onValueChange={setStatusEdit} disabled={!item.branch}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {item.branch ? (
                          <>
                            <SelectItem value="available">Available / In Stock</SelectItem>
                            <SelectItem value="in-use">In Use / Deployed</SelectItem>
                            <SelectItem value="in-repair">In Repair</SelectItem>
                            <SelectItem value="scrapped">Scrapped / Retired</SelectItem>
                            <SelectItem value="discarded">Discarded</SelectItem>
                          </>
                        ) : (
                          <SelectItem value="available">Available (Central Buffer)</SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-foreground mb-1">
                      Reason for Change / Notes
                    </label>
                    <Input
                      placeholder={!item.branch ? "Unit is in central buffer..." : "e.g. Sent for routine inspection, damaged screen repaired..."}
                      value={statusRemarks}
                      disabled={!item.branch}
                      onChange={(e) => setStatusRemarks(e.target.value)}
                    />
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <Button
                    onClick={handleStatusUpdate}
                    disabled={!item.branch || statusUpdating || (statusEdit === item.status && !statusRemarks.trim())}
                    className="gap-1.5 font-semibold"
                  >
                    {statusUpdating ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save Status Change"}
                  </Button>
                </div>
              </div>
            </TabsContent>

            {/* Transfer & Partial Allocation Tab */}
            <TabsContent value="transfer" className="space-y-5 pt-3">
              <div className="bg-card border rounded-2xl p-4 sm:p-5 space-y-5">
                <div className="border-b pb-3 flex items-start justify-between gap-3 flex-wrap">
                  <div>
                    <h4 className="text-sm font-bold text-foreground flex items-center gap-1.5">
                      <ArrowRightLeft className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                      Transfer & Quantity Allocation
                    </h4>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Allocate partial or full quantity of this asset to a specific campus block, department, lab room, and custodian.
                    </p>
                  </div>
                  <span className="text-xs font-bold px-2.5 py-1 bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800/50 rounded-lg">
                    Total Available: {item.quantity_available} unit(s)
                  </span>
                </div>

                {/* Step 0: Transfer Mode Selection (When multiple units available) */}
                {item.quantity_available > 1 && (
                  <div className="space-y-2 p-3 bg-muted/20 border rounded-xl">
                    <label className="block text-xs font-bold text-foreground">
                      Transfer & Allocation Mode
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      <button
                        type="button"
                        onClick={() => {
                          setTransferMode("split");
                          if (transferQuantity >= item.quantity_available) {
                            setTransferQuantity(1);
                          }
                        }}
                        className={`p-3 rounded-lg border text-left transition-all ${
                          transferMode === "split"
                            ? "border-purple-500 bg-purple-50/70 dark:bg-purple-950/40 text-purple-950 dark:text-purple-200 shadow-sm"
                            : "border-border hover:bg-muted/40 text-foreground"
                        }`}
                      >
                        <div className="flex items-center gap-2 font-bold text-xs">
                          <Layers className="w-4 h-4 text-purple-600" /> Partial Quantity Allocation
                        </div>
                        <p className="text-[11px] text-muted-foreground mt-1">
                          Allocate a specific number of units (e.g. 5 of {item.quantity_available}) to a department/room.
                        </p>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setTransferMode("full");
                          setTransferQuantity(item.quantity_available);
                        }}
                        className={`p-3 rounded-lg border text-left transition-all ${
                          transferMode === "full"
                            ? "border-purple-500 bg-purple-50/70 dark:bg-purple-950/40 text-purple-950 dark:text-purple-200 shadow-sm"
                            : "border-border hover:bg-muted/40 text-foreground"
                        }`}
                      >
                        <div className="flex items-center gap-2 font-bold text-xs">
                          <Package className="w-4 h-4 text-purple-600" /> Full Asset Relocation
                        </div>
                        <p className="text-[11px] text-muted-foreground mt-1">
                          Move all {item.quantity_available} units together to the target location & department.
                        </p>
                      </button>
                    </div>
                  </div>
                )}

                {/* Quantity Input (if Split mode) */}
                {transferMode === "split" && item.quantity_available > 1 && (
                  <div className="p-3.5 bg-purple-50/40 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-800/40 rounded-xl space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                        <Package className="w-3.5 h-3.5 text-purple-600" />
                        Quantity to Allocate & Handover <span className="text-red-500">*</span>
                      </label>
                      <span className="text-xs font-semibold text-purple-700 dark:text-purple-300">
                        Remaining in Stock: {Math.max(0, item.quantity_available - transferQuantity)} unit(s)
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <Input
                        type="number"
                        min={1}
                        max={item.quantity_available - 1}
                        value={transferQuantity}
                        onChange={(e) => {
                          const val = Number(e.target.value) || 1;
                          setTransferQuantity(Math.min(item.quantity_available - 1, Math.max(1, val)));
                        }}
                        onWheel={(e) => (e.target as HTMLElement).blur()}
                        className="h-9 w-36 font-bold text-base [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      />
                      <span className="text-xs text-muted-foreground">
                        unit(s) out of <strong>{item.quantity_available}</strong> available in {item.item_code}
                      </span>
                    </div>
                  </div>
                )}

                {/* Target Location & Department Section */}
                <div className="space-y-3 border-t border-border/50 pt-4">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <Building className="w-3.5 h-3.5 text-primary" />
                    1. Destination Location & Department
                  </h4>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {/* Target Campus Location */}
                    <div>
                      <label className="block text-xs font-semibold text-foreground mb-1">
                        Location / Campus Block <span className="text-red-500">*</span>
                      </label>
                      <Select value={locationEdit} onValueChange={setLocationEdit}>
                        <SelectTrigger className="h-9">
                          <SelectValue placeholder="Select Location" />
                        </SelectTrigger>
                        <SelectContent>
                          {locationList.map((loc) => (
                            <SelectItem key={loc.id} value={String(loc.id)}>
                              {loc.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Target Department / Branch */}
                    <div>
                      <label className="block text-xs font-semibold text-foreground mb-1">
                        Assigned Department / Branch
                      </label>
                      <Select
                        value={departmentEdit}
                        onValueChange={(val) => {
                          setDepartmentEdit(val);
                          setRecipientBranch(val !== "unassigned" ? val : "all");
                        }}
                      >
                        <SelectTrigger className="h-9">
                          <SelectValue placeholder="Select Department" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="unassigned">Institutional / General (None)</SelectItem>
                          {branchList.map((b) => (
                            <SelectItem key={b.id} value={String(b.id)}>
                              {b.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Room / Lab No */}
                    <div>
                      <label className="block text-xs font-semibold text-foreground mb-1">
                        Room / Lab / Desk No
                      </label>
                      <Input
                        placeholder="e.g. Lab 304, Room 102"
                        value={roomEdit}
                        onChange={(e) => setRoomEdit(e.target.value)}
                        className="h-9"
                      />
                    </div>
                  </div>
                </div>

                {/* Stepped Recipient / Custodian Handover */}
                <div className="space-y-3.5 border-t border-border/50 pt-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                      <UserCheck className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                      2. Assign Custodian / Recipient Handover
                    </h4>
                    <span className="text-[11px] text-purple-700 dark:text-purple-300 font-semibold bg-purple-50 dark:bg-purple-950/60 px-2 py-0.5 rounded-md border border-purple-200 dark:border-purple-800/50">
                      Direct Custodian Assignment
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* Step 1: Role */}
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-foreground">
                        Step 1: Recipient Role <span className="text-red-500">*</span>
                      </label>
                      <Select
                        value={recipientRole}
                        onValueChange={(val) => {
                          setRecipientRole(val);
                          setRecipientId("");
                          setRecipientName("");
                          const isBranchRole = ["faculty", "hod", "staff"].includes(val);
                          setRecipientBranch(isBranchRole ? "" : "all");
                          setPersonnelList([]);
                        }}
                      >
                        <SelectTrigger className="h-9">
                          <SelectValue placeholder="Choose recipient role..." />
                        </SelectTrigger>
                        <SelectContent className="max-h-[220px]">
                          <SelectItem value="faculty">Faculty Member / Teacher</SelectItem>
                          <SelectItem value="hod">Head of Department (HOD)</SelectItem>
                          <SelectItem value="staff">Staff / Lab Assistant</SelectItem>
                          <SelectItem value="dean">Dean</SelectItem>
                          <SelectItem value="principal">Principal</SelectItem>
                          <SelectItem value="warden">Hostel Warden</SelectItem>
                          <SelectItem value="library_admin">Library Admin</SelectItem>
                          <SelectItem value="transport_admin">Transport Admin</SelectItem>
                          <SelectItem value="group_d">Support Staff / Group D</SelectItem>
                          <SelectItem value="security">Security Staff</SelectItem>
                          <SelectItem value="other">Other / External Custodian</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Step 2: Branch Filter (ONLY when Faculty / HOD / Staff is selected) */}
                    {["faculty", "hod", "staff"].includes(recipientRole) && (
                      <div className="space-y-1">
                        <label className="text-xs font-semibold text-foreground">
                          Step 2: Department Filter <span className="text-red-500">*</span>
                        </label>
                        <Select
                          value={recipientBranch}
                          onValueChange={(val) => {
                            setRecipientBranch(val);
                            setRecipientId("");
                            setRecipientName("");
                            setPersonnelList([]);
                          }}
                        >
                          <SelectTrigger className="h-9">
                            <SelectValue placeholder="Choose Department / Branch..." />
                          </SelectTrigger>
                          <SelectContent className="max-h-[220px]">
                            <SelectItem value="all">All Departments / Branches</SelectItem>
                            {branchList.map((b) => (
                              <SelectItem key={b.id} value={String(b.id)}>
                                {b.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </div>

                  {/* Step 3 (or Step 2): Assign Custodian / Recipient via In-Dropdown Search Popover */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-semibold text-foreground">
                        {["faculty", "hod", "staff"].includes(recipientRole)
                          ? "Step 3: Assign Custodian / Recipient"
                          : "Step 2: Assign Custodian / Recipient"}{" "}
                        <span className="text-red-500">*</span>
                      </label>
                      <span className="text-[11px] text-muted-foreground">Select colleague from list</span>
                    </div>

                    <Popover open={recipientPopoverOpen} onOpenChange={setRecipientPopoverOpen}>
                      <PopoverTrigger asChild>
                        <Button
                          type="button"
                          variant="outline"
                          role="combobox"
                          aria-expanded={recipientPopoverOpen}
                          disabled={
                            !recipientRole ||
                            (["faculty", "hod", "staff"].includes(recipientRole) && !recipientBranch)
                          }
                          className="w-full h-9 justify-between font-normal text-left px-3 hover:bg-background"
                        >
                          {recipientName ? (
                            <div className="flex items-center gap-2 truncate">
                              <CheckCircle2 className="w-4 h-4 text-purple-600 shrink-0" />
                              <span className="font-semibold text-foreground truncate">{recipientName}</span>
                              {recipientId && (
                                <span className="text-[10px] px-1.5 py-0.5 bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 rounded font-medium shrink-0">
                                  Registered Staff
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-muted-foreground text-xs">
                              {!recipientRole
                                ? "Select recipient role first..."
                                : ["faculty", "hod", "staff"].includes(recipientRole) && !recipientBranch
                                ? "Select department / branch first..."
                                : loadingPersonnel
                                ? "Loading colleagues..."
                                : "Search & select colleague or type name..."}
                            </span>
                          )}
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent
                        className="w-[--radix-popover-trigger-width] min-w-[340px] max-w-[420px] p-0 shadow-xl border overflow-hidden flex flex-col h-[450px]"
                        align="start"
                      >
                        {/* Fixed Search Header */}
                        <div className="p-2 border-b bg-muted/10 shrink-0">
                          <div className="relative">
                            <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-muted-foreground" />
                            <Input
                              placeholder="Type name or email to filter..."
                              value={personnelSearch}
                              onChange={(e) => {
                                setPersonnelSearch(e.target.value);
                                setPersonnelPage(1);
                              }}
                              className="h-8 pl-8 text-xs bg-muted/30 focus-visible:ring-1"
                              autoFocus
                            />
                          </div>
                        </div>

                        {/* Fixed Body with Smooth Page Transitions */}
                        <div className="flex-1 overflow-hidden p-1.5 flex flex-col justify-start relative">
                          {loadingPersonnel && (
                            <div className="absolute inset-0 bg-background/60 backdrop-blur-[1px] flex items-center justify-center z-10 animate-in fade-in-50 duration-150">
                              <div className="flex items-center gap-2 text-xs text-muted-foreground bg-background border px-3 py-1.5 rounded-full shadow-sm">
                                <Loader2 className="w-3.5 h-3.5 animate-spin text-purple-600" />
                                <span>Loading colleagues...</span>
                              </div>
                            </div>
                          )}

                          {personnelList.length === 0 && !loadingPersonnel ? (
                            <div className="flex-1 flex flex-col items-center justify-center text-center p-4 text-xs text-muted-foreground">
                              <Users className="w-8 h-8 text-muted-foreground/40 mb-1.5" />
                              <p className="font-medium">No registered staff found</p>
                              <p className="text-[11px] text-muted-foreground/70">Try adjusting your search or department filter.</p>
                            </div>
                          ) : (
                            <div
                              key={`transfer-page-${personnelPage}`}
                              className="flex-1 flex flex-col space-y-0.5 animate-in fade-in-50 slide-in-from-bottom-1 duration-200"
                            >
                              {personnelList.map((p) => {
                                const isSelected = String(p.id) === recipientId || p.name === recipientName;
                                return (
                                  <button
                                    type="button"
                                    key={p.id}
                                    onClick={() => {
                                      setRecipientId(String(p.id));
                                      setRecipientName(p.name);
                                      setRecipientPopoverOpen(false);
                                    }}
                                    className={`w-full text-left px-2.5 py-1.5 rounded-md flex items-center justify-between gap-2 transition-all duration-150 h-[34px] ${
                                      isSelected
                                        ? "bg-purple-50 dark:bg-purple-950/60 text-purple-900 dark:text-purple-100 font-semibold shadow-xs"
                                        : "hover:bg-muted/70 text-foreground"
                                    }`}
                                  >
                                    <div className="min-w-0 flex-1">
                                      <div className="font-semibold text-xs truncate leading-none">{p.name}</div>
                                      <div className="text-[10.5px] text-muted-foreground truncate leading-tight mt-0.5">{p.email}</div>
                                    </div>
                                    {p.branch_name && (
                                      <span className="text-[9.5px] px-1.5 py-0.5 bg-muted rounded font-medium shrink-0 max-w-[110px] truncate">
                                        {p.branch_name}
                                      </span>
                                    )}
                                    {isSelected && <Check className="w-3.5 h-3.5 text-purple-600 shrink-0" />}
                                  </button>
                                );
                              })}
                            </div>
                          )}

                          {/* Option to use custom typed name */}
                          {personnelSearch.trim() && (
                            <button
                              type="button"
                              onClick={() => {
                                setRecipientId("");
                                setRecipientName(personnelSearch.trim());
                                setRecipientPopoverOpen(false);
                              }}
                              className="w-full text-left px-2.5 py-1.5 mt-auto rounded-md border border-dashed border-purple-300 dark:border-purple-800 bg-purple-50/60 dark:bg-purple-950/40 text-purple-800 dark:text-purple-300 hover:bg-purple-100 dark:hover:bg-purple-900/50 flex items-center gap-1.5 transition-colors text-xs shrink-0"
                            >
                              <Plus className="w-3.5 h-3.5 shrink-0" />
                              <span className="truncate">
                                Assign custom recipient: <strong>"{personnelSearch.trim()}"</strong>
                              </span>
                            </button>
                          )}
                        </div>

                        {/* Fixed Footer Pagination */}
                        <div className="p-2 border-t bg-muted/20 shrink-0 flex items-center justify-between text-[11px] text-muted-foreground">
                          <span className="px-1 font-medium">
                            Page {personnelPage} of {personnelTotalPages} ({personnelTotalCount} total)
                          </span>
                          <div className="flex items-center gap-1">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              disabled={personnelPage <= 1 || loadingPersonnel}
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                const prev = personnelPage - 1;
                                setPersonnelPage(prev);
                                loadPersonnel(recipientRole, recipientBranch, personnelSearch, prev);
                              }}
                              className="h-6 px-2.5 text-[11px] transition-all"
                            >
                              Prev
                            </Button>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              disabled={personnelPage >= personnelTotalPages || loadingPersonnel}
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                const next = personnelPage + 1;
                                setPersonnelPage(next);
                                loadPersonnel(recipientRole, recipientBranch, personnelSearch, next);
                              }}
                              className="h-6 px-2.5 text-[11px] transition-all"
                            >
                              Next
                            </Button>
                          </div>
                        </div>
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>

                {/* Transfer Reason */}
                <div className="space-y-1.5 border-t border-border/50 pt-4">
                  <label className="block text-xs font-semibold text-foreground">
                    Transfer Reason & Custody Remarks
                  </label>
                  <Input
                    placeholder="e.g. Allocated 5 units to CSE Lab 204 for operating systems practicals"
                    value={transferRemarks}
                    onChange={(e) => setTransferRemarks(e.target.value)}
                    className="h-9"
                  />
                </div>

                <div className="flex items-center justify-between gap-3 pt-2 border-t border-border/50">
                  <div className="text-xs text-muted-foreground">
                    Transferring: <strong className="text-foreground">{transferMode === "full" ? item.quantity_available : transferQuantity} unit(s)</strong>
                  </div>
                  <Button
                    onClick={handleTransferSubmit}
                    disabled={transferUpdating}
                    className="bg-purple-600 hover:bg-purple-700 text-white font-semibold gap-1.5 shadow-sm"
                  >
                    {transferUpdating ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        <ArrowRightLeft className="w-4 h-4" />
                        Confirm Handover & Allocation ({transferMode === "full" ? item.quantity_available : transferQuantity} units)
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </TabsContent>

            {/* Timeline Tab */}
            <TabsContent value="history" className="pt-3">
              <ItemHistoryTimeline history={history} loading={historyLoading} />
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>

      {/* QR Preview Dialog */}
      <QRCodePreviewModal
        item={item}
        isOpen={showQRModal}
        onClose={() => setShowQRModal(false)}
      />
    </>
  );
};
