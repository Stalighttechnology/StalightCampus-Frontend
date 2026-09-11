import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../../ui/dialog";
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

  // Transfer Form State
  const [locationEdit, setLocationEdit] = useState<string>("");
  const [departmentEdit, setDepartmentEdit] = useState<string>("");
  const [roomEdit, setRoomEdit] = useState<string>("");
  const [transferRemarks, setTransferRemarks] = useState("");
  const [transferUpdating, setTransferUpdating] = useState(false);

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

  useEffect(() => {
    if (!item || !isOpen) return;

    setStatusEdit(item.status);
    setStatusRemarks("");

    setLocationEdit(item.location ? String(item.location) : "");
    setDepartmentEdit(item.branch ? String(item.branch) : "unassigned");
    setRoomEdit(item.room_no || "");
    setTransferRemarks("");

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

  const handleTransferUpdate = async () => {
    try {
      setTransferUpdating(true);
      const payload: Record<string, any> = {
        remarks: transferRemarks.trim() || `Asset relocated/transferred for ${item.item_code}`,
        room_no: roomEdit.trim(),
      };

      if (locationEdit) {
        payload.location_id = Number(locationEdit);
      }
      if (departmentEdit && departmentEdit !== "unassigned") {
        payload.branch_id = Number(departmentEdit);
      } else if (departmentEdit === "unassigned") {
        payload.branch_id = null;
      }

      await updateInventoryItem(item.id, payload);
      toast.success("Asset location & department transferred successfully");
      setTransferRemarks("");
      onRefresh();
      // Refresh history
      const freshHistory = await fetchItemHistory(item.id);
      setHistory(freshHistory);
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
                  <ArrowRightLeft className="w-3.5 h-3.5" /> Transfer
                </TabsTrigger>
              )}
              <TabsTrigger value="history" className="gap-1.5">
                <History className="w-3.5 h-3.5" /> Timeline
              </TabsTrigger>
            </TabsList>

            {/* Overview Tab */}
            <TabsContent value="overview" className="space-y-4 pt-3">
              <div className={`grid grid-cols-1 ${!isFaculty ? "md:grid-cols-2" : ""} gap-4`}>
                {/* Specifications Card */}
                <div className="bg-card border rounded-2xl p-4 space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <Tag className="w-3.5 h-3.5 text-primary" /> Asset Information
                  </h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between py-1 border-b border-border/50">
                      <span className="text-muted-foreground">Category:</span>
                      <span className="font-semibold text-foreground">
                        {item.category_details?.name || "General"}
                      </span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-border/50">
                      <span className="text-muted-foreground">Location:</span>
                      <span className="font-semibold text-foreground">
                        {item.location_details?.name || "Main Campus"}
                      </span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-border/50">
                      <span className="text-muted-foreground">Room / Desk:</span>
                      <span className="font-semibold text-foreground">{item.room_no || "N/A"}</span>
                    </div>
                    <div className="flex justify-between py-1">
                      <span className="text-muted-foreground">Department:</span>
                      <span className="font-semibold text-foreground">
                        {item.branch_name || "Institutional"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Financial & Valuation Card (Only for Admins/Managers) */}
                {!isFaculty && (
                  <div className="bg-card border rounded-2xl p-4 space-y-3">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                      <IndianRupee className="w-3.5 h-3.5 text-emerald-600" /> Valuation & Cost
                    </h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between py-1 border-b border-border/50">
                        <span className="text-muted-foreground">Quantity:</span>
                        <span className="font-semibold text-foreground">{item.quantity_available}</span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-border/50">
                        <span className="text-muted-foreground">Unit Cost:</span>
                        <span className="font-semibold text-foreground">
                          ₹{Number(item.cost_per_unit || 0).toLocaleString("en-IN")}
                        </span>
                      </div>
                      <div className="flex justify-between py-1">
                        <span className="text-muted-foreground">Total Valuation:</span>
                        <span className="font-extrabold text-emerald-600">
                          ₹{Number(item.total_cost || 0).toLocaleString("en-IN")}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Technical Specifications */}
              {item.specifications && (
                <div className="bg-muted/20 border rounded-2xl p-4 space-y-1.5">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Technical Specifications
                  </h4>
                  <p className="text-xs text-foreground whitespace-pre-line leading-relaxed">
                    {item.specifications}
                  </p>
                </div>
              )}

              {/* Vendor & Invoice Metadata (Only for Admins/Managers) */}
              {!isFaculty && (
                <div className="bg-card border rounded-2xl p-4 space-y-2 text-xs">
                  <h4 className="font-bold uppercase tracking-wider text-muted-foreground">
                    Procurement Reference
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-muted-foreground">
                    {item.vendor_name && <div>Vendor: <strong className="text-foreground">{item.vendor_name}</strong></div>}
                    {item.invoice_no && <div>Invoice: <strong className="text-foreground">{item.invoice_no}</strong></div>}
                    {item.invoice_date && <div>Date: <strong className="text-foreground">{item.invoice_date}</strong></div>}
                  </div>
                </div>
              )}
            </TabsContent>

            {/* Documents & Media Tab (Only for Admins/Managers) */}
            {!isFaculty && (
              <TabsContent value="documents" className="space-y-4 pt-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Photo */}
                  <div className="border rounded-2xl p-4 space-y-2 flex flex-col items-center justify-center min-h-[220px] bg-muted/10">
                    <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground self-start">
                      Asset Image
                    </p>
                    {item.item_photo_url ? (
                      <div className="relative group w-full aspect-video rounded-xl overflow-hidden border">
                        <img
                          src={item.item_photo_url}
                          alt="Asset"
                          className="w-full h-full object-cover"
                        />
                        <a
                          href={item.item_photo_url}
                          target="_blank"
                          rel="noreferrer"
                          className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white text-xs font-bold transition-opacity"
                        >
                          View Full Image <ExternalLink className="w-3.5 h-3.5 ml-1" />
                        </a>
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground">No image uploaded</p>
                    )}
                  </div>

                  {/* Purchase Invoice */}
                  <div className="border rounded-2xl p-4 space-y-2 flex flex-col items-center justify-center min-h-[220px] bg-muted/10">
                    <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground self-start">
                      Purchase Invoice / Sanction
                    </p>
                    {item.invoice_photo_url ? (
                      <div className="w-full p-4 border rounded-xl bg-card flex flex-col items-center justify-center gap-2 text-center">
                        <FileText className="w-10 h-10 text-primary" />
                        <p className="text-xs font-semibold text-foreground">
                          {item.invoice_no ? `Invoice #${item.invoice_no}` : "Attached Invoice"}
                        </p>
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

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-foreground mb-1">
                      Current Status
                    </label>
                    <Select value={statusEdit} onValueChange={setStatusEdit}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="available">Available / In Stock</SelectItem>
                        <SelectItem value="in-use">In Use / Deployed</SelectItem>
                        <SelectItem value="in-repair">In Repair</SelectItem>
                        <SelectItem value="scrapped">Scrapped / Retired</SelectItem>
                        <SelectItem value="discarded">Discarded</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-foreground mb-1">
                      Reason for Change / Notes
                    </label>
                    <Input
                      placeholder="e.g. Sent for routine inspection, damaged screen repaired..."
                      value={statusRemarks}
                      onChange={(e) => setStatusRemarks(e.target.value)}
                    />
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <Button
                    onClick={handleStatusUpdate}
                    disabled={statusUpdating || (statusEdit === item.status && !statusRemarks.trim())}
                    className="gap-1.5 font-semibold"
                  >
                    {statusUpdating ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save Status Change"}
                  </Button>
                </div>
              </div>
            </TabsContent>

            {/* Transfer Tab */}
            <TabsContent value="transfer" className="space-y-4 pt-3">
              <div className="bg-card border rounded-2xl p-4 space-y-4">
                <div className="border-b pb-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-1.5">
                    <ArrowRightLeft className="w-3.5 h-3.5 text-primary" /> Transfer Location & Department
                  </h4>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    Relocate this asset to another building, department branch, or specific lab room.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {/* Target Campus Location */}
                  <div>
                    <label className="block text-xs font-semibold text-foreground mb-1">
                      Location / Campus Block
                    </label>
                    <Select value={locationEdit} onValueChange={setLocationEdit}>
                      <SelectTrigger>
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
                      Department / Branch
                    </label>
                    <Select value={departmentEdit} onValueChange={setDepartmentEdit}>
                      <SelectTrigger>
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
                      placeholder="e.g. Lab 304, Room 102, Server Rack B"
                      value={roomEdit}
                      onChange={(e) => setRoomEdit(e.target.value)}
                    />
                  </div>
                </div>

                {/* Transfer Reason */}
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1">
                    Reason for Transfer / Custody Notes
                  </label>
                  <Input
                    placeholder="e.g. Transferred to Lab 304 for semester labs"
                    value={transferRemarks}
                    onChange={(e) => setTransferRemarks(e.target.value)}
                  />
                </div>

                <div className="flex justify-end pt-2">
                  <Button
                    onClick={handleTransferUpdate}
                    disabled={transferUpdating}
                    className="gap-1.5 font-semibold"
                  >
                    {transferUpdating ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save Transfer"}
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
