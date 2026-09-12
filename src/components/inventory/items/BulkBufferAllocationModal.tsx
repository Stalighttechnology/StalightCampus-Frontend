import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "../../ui/dialog";
import { Button } from "../../ui/button";
import { Input } from "../../ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "../../ui/popover";
import {
  GroupedInventoryAsset,
  InventoryLocation,
  bulkAllocateBuffer,
  fetchInventoryPersonnel,
  fetchBranches,
  fetchInventoryLocations,
} from "../../../utils/inventory_api";
import {
  Package,
  PackagePlus,
  ArrowRightLeft,
  Building,
  UserCheck,
  Search,
  CheckCircle2,
  ChevronsUpDown,
  ChevronLeft,
  ChevronRight,
  Loader2,
  AlertCircle,
  Tag,
  Layers,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";

interface Props {
  group: GroupedInventoryAsset | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  locations?: InventoryLocation[];
  branches?: Array<{ id: number; name: string }>;
  initialQuantity?: number;
}

export const BulkBufferAllocationModal: React.FC<Props> = ({
  group,
  isOpen,
  onClose,
  onSuccess,
  locations = [],
  branches = [],
  initialQuantity,
}) => {
  if (!group) return null;

  // Filter buffer items only
  const bufferItems = (group.items || []).filter((i) => !i.branch_id && i.status === "available");
  const maxAvailable = bufferItems.length > 0 ? bufferItems.length : group.in_stock_buffer;

  // Local branches & locations with fallback auto-fetch
  const [branchList, setBranchList] = useState<Array<{ id: number; name: string }>>(branches);
  const [locationList, setLocationList] = useState<InventoryLocation[]>(locations);

  useEffect(() => {
    if (branches && branches.length > 0) setBranchList(branches);
  }, [branches]);

  useEffect(() => {
    if (locations && locations.length > 0) setLocationList(locations);
  }, [locations]);

  useEffect(() => {
    if (isOpen) {
      if (!branches || branches.length === 0) {
        fetchBranches()
          .then((res) => {
            if (res && res.length > 0) setBranchList(res);
          })
          .catch((err) => console.error("Failed to load branches:", err));
      }
      if (!locations || locations.length === 0) {
        fetchInventoryLocations()
          .then((res) => {
            if (res && res.length > 0) {
              setLocationList(res);
              if (!selectedLocationId) setSelectedLocationId(String(res[0].id));
            }
          })
          .catch((err) => console.error("Failed to load locations:", err));
      }
    }
  }, [isOpen]);

  // Form states
  const [quantityInput, setQuantityInput] = useState<string>(
    String(initialQuantity && initialQuantity <= maxAvailable ? initialQuantity : maxAvailable || 1)
  );
  const parsedQuantity = parseInt(quantityInput, 10);
  const isNaNQuantity = isNaN(parsedQuantity);
  const isQuantityExceeded = !isNaNQuantity && parsedQuantity > maxAvailable;
  const isQuantityUnderflow = !isNaNQuantity && parsedQuantity < 1;
  const isQuantityValid = !isNaNQuantity && parsedQuantity >= 1 && parsedQuantity <= maxAvailable;

  const [selectedLocationId, setSelectedLocationId] = useState<string>(
    group.location_id ? String(group.location_id) : locationList[0] ? String(locationList[0].id) : ""
  );
  
  // Room / Lab assignment states (same vs one-by-one per unit)
  const [roomMode, setRoomMode] = useState<"same" | "individual">("individual");
  const [commonRoom, setCommonRoom] = useState<string>("");
  const [unitRooms, setUnitRooms] = useState<Record<number, string>>({});
  const [quickRoomInput, setQuickRoomInput] = useState<string>("");

  const [selectedBranchId, setSelectedBranchId] = useState<string>("");
  
  // Recipient / Handover states
  const [recipientRole, setRecipientRole] = useState<string>("");
  const [recipientBranch, setRecipientBranch] = useState<string>("");
  const [recipientId, setRecipientId] = useState<string>("");
  const [recipientName, setRecipientName] = useState<string>("");
  const [remarks, setRemarks] = useState<string>("");

  // Personnel lookup
  const [recipientPopoverOpen, setRecipientPopoverOpen] = useState(false);
  const [personnelList, setPersonnelList] = useState<Array<{
    id: number;
    name: string;
    email: string;
    role: string;
    branch_name?: string;
  }>>([]);
  const [loadingPersonnel, setLoadingPersonnel] = useState(false);
  const [personnelSearch, setPersonnelSearch] = useState("");
  const [personnelPage, setPersonnelPage] = useState(1);
  const [personnelTotalPages, setPersonnelTotalPages] = useState(1);
  const [personnelTotalCount, setPersonnelTotalCount] = useState(0);

  const [submitting, setSubmitting] = useState(false);

  // Reset form when modal opens or group changes
  useEffect(() => {
    if (isOpen && group) {
      const initQty = initialQuantity && initialQuantity <= maxAvailable ? initialQuantity : maxAvailable;
      setQuantityInput(String(initQty || 1));
      if (group.location_id) setSelectedLocationId(String(group.location_id));
      else if (locationList.length > 0) setSelectedLocationId(String(locationList[0].id));
      setSelectedBranchId("");
      setRoomMode("individual");
      setCommonRoom("");
      setUnitRooms({});
      setQuickRoomInput("");
      setRecipientRole("");
      setRecipientBranch("");
      setRecipientId("");
      setRecipientName("");
      setRemarks("");
      setPersonnelList([]);
    }
  }, [isOpen, group, initialQuantity, maxAvailable, locationList]);

  // Load personnel when role or filter changes
  const loadPersonnel = async (roleVal: string, branchVal: string, searchVal: string, pageVal: number = 1) => {
    if (!roleVal) {
      setPersonnelList([]);
      return;
    }
    const isBranchSpecific = ["faculty", "teacher", "hod", "staff"].includes(roleVal);
    if (isBranchSpecific && (!branchVal || branchVal === "")) {
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
      if (isBranchSpecific && branchVal && branchVal !== "all" && branchVal !== "none") {
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
    if (recipientPopoverOpen && recipientRole) {
      const isBranchSpecific = ["faculty", "teacher", "hod", "staff"].includes(recipientRole);
      if (!isBranchSpecific || recipientBranch) {
        const timer = setTimeout(() => {
          loadPersonnel(recipientRole, recipientBranch, personnelSearch, personnelPage);
        }, 200);
        return () => clearTimeout(timer);
      }
    }
  }, [recipientPopoverOpen, recipientRole, recipientBranch, personnelSearch, personnelPage]);

  // Selected Units Preview
  const selectedUnits = isQuantityValid
    ? bufferItems.slice(0, Math.min(parsedQuantity, bufferItems.length))
    : [];
  const targetBranchObj = branchList.find((b) => String(b.id) === selectedBranchId) || branches.find((b) => String(b.id) === selectedBranchId);

  const handleSubmit = async () => {
    if (!isQuantityValid) {
      if (isQuantityExceeded) {
        toast.error(`Cannot allocate ${parsedQuantity} units. Only ${maxAvailable} available in buffer stock.`);
      } else {
        toast.error("Please enter a valid quantity of at least 1 unit.");
      }
      return;
    }
    if (!selectedBranchId || selectedBranchId === "none") {
      toast.error("Please select a valid destination department / branch.");
      return;
    }
    if (!recipientName.trim()) {
      toast.error("Please select or assign a recipient / custodian.");
      return;
    }

    try {
      setSubmitting(true);
      const payload = {
        item_name: group.item_name,
        category_id: group.category_id,
        item_ids: selectedUnits.length > 0 ? selectedUnits.map((u) => u.id) : undefined,
        quantity: parsedQuantity,
        location_id: selectedLocationId ? parseInt(selectedLocationId) : undefined,
        branch_id: parseInt(selectedBranchId),
        room_no: roomMode === "same" ? commonRoom.trim() : (commonRoom.trim() || undefined),
        unit_rooms: roomMode === "individual" && Object.keys(unitRooms).length > 0 ? unitRooms : undefined,
        received_by_name: recipientName.trim(),
        received_by_role: recipientRole.trim(),
        remarks: remarks.trim(),
      };

      const res = await bulkAllocateBuffer(payload);
      toast.success(res.message || `Successfully allocated ${parsedQuantity} units to ${targetBranchObj?.name || "department"}!`);
      onSuccess();
      onClose();
    } catch (err: any) {
      console.error("Bulk allocation failed:", err);
      toast.error(err.message || "Failed to allocate buffer units");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && !submitting && onClose()}>
      <DialogContent className="max-w-3xl max-h-[92vh] flex flex-col p-0 overflow-hidden bg-background text-foreground shadow-2xl border border-border">
        {/* Header */}
        <DialogHeader className="p-5 pb-4 border-b border-border/60 bg-muted/20 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-xl bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800/60">
              <ArrowRightLeft className="w-5 h-5" />
            </div>
            <div>
              <DialogTitle className="text-lg font-bold text-foreground">
                Allocate Central Buffer Stock
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                Handover and deploy buffer assets in bulk to departments, labs, and custodians.
              </DialogDescription>
            </div>
          </div>

          {/* Quick Asset Summary Card */}
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs bg-card border border-border/60 p-3 rounded-lg">
            <div className="space-y-0.5 max-w-lg">
              <div className="flex items-center gap-2">
                <span className="font-mono text-[11px] font-bold px-2 py-0.5 rounded bg-primary/10 text-primary border border-primary/20">
                  {group.code_range}
                </span>
                <span className="font-semibold text-foreground truncate">
                  {group.clean_name || group.item_name}
                </span>
              </div>
              {group.specifications && (
                <p className="text-[11px] text-muted-foreground truncate">{group.specifications}</p>
              )}
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <span className="px-2.5 py-1 rounded-full bg-purple-100 dark:bg-purple-900/60 text-purple-800 dark:text-purple-200 border border-purple-200 dark:border-purple-800/60 text-xs font-bold flex items-center gap-1">
                <Package className="w-3.5 h-3.5" />
                {maxAvailable} Available in Buffer
              </span>
            </div>
          </div>
        </DialogHeader>

        {/* Scrollable Form Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6">
          {/* Section 1: Allocation Quantity */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <PackagePlus className="w-3.5 h-3.5 text-purple-600" />
                1. Select Quantity to Allocate (Bulk)
              </h4>
              <span className="text-[11px] font-semibold text-purple-700 dark:text-purple-300">
                Max Available: {maxAvailable} unit(s)
              </span>
            </div>

            <div className="space-y-2">
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                <div className="w-full sm:w-48">
                  <Input
                    type="number"
                    min={1}
                    max={maxAvailable}
                    value={quantityInput}
                    onChange={(e) => {
                      setQuantityInput(e.target.value);
                    }}
                    onBlur={() => {
                      if (quantityInput.trim() === "" || parsedQuantity < 1) {
                        setQuantityInput("1");
                      } else if (parsedQuantity > maxAvailable) {
                        setQuantityInput(String(maxAvailable));
                        toast.warning(`Quantity capped to maximum available buffer (${maxAvailable} units).`);
                      }
                    }}
                    className={`h-10 text-sm font-bold ${
                      isQuantityExceeded || isQuantityUnderflow || isNaNQuantity
                        ? "border-destructive focus-visible:ring-destructive text-destructive bg-destructive/5"
                        : ""
                    }`}
                    placeholder="Enter quantity"
                  />
                </div>

                {/* Quick Preset Buttons */}
                <div className="flex flex-wrap items-center gap-1.5">
                  <Button
                    type="button"
                    variant={parsedQuantity === maxAvailable ? "default" : "outline"}
                    size="sm"
                    onClick={() => setQuantityInput(String(maxAvailable))}
                    className="h-8 text-xs font-semibold"
                  >
                    All ({maxAvailable})
                  </Button>
                  {maxAvailable >= 10 && (
                    <Button
                      type="button"
                      variant={parsedQuantity === 10 ? "default" : "outline"}
                      size="sm"
                      onClick={() => setQuantityInput("10")}
                      className="h-8 text-xs font-semibold"
                    >
                      10 Units
                    </Button>
                  )}
                  {maxAvailable >= 5 && (
                    <Button
                      type="button"
                      variant={parsedQuantity === 5 ? "default" : "outline"}
                      size="sm"
                      onClick={() => setQuantityInput("5")}
                      className="h-8 text-xs font-semibold"
                    >
                      5 Units
                    </Button>
                  )}
                  <Button
                    type="button"
                    variant={parsedQuantity === 1 ? "default" : "outline"}
                    size="sm"
                    onClick={() => setQuantityInput("1")}
                    className="h-8 text-xs font-semibold"
                  >
                    1 Unit
                  </Button>
                </div>
              </div>

              {/* Inline Validation Warnings & Feedback */}
              {isQuantityExceeded && (
                <div className="flex items-center gap-1.5 text-xs font-semibold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 p-2 rounded-lg border border-rose-200 dark:border-rose-800/60">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                  <span>
                    Cannot allocate {parsedQuantity} units. Only {maxAvailable} buffer units are available in Central Store.
                  </span>
                </div>
              )}

              {(isQuantityUnderflow || isNaNQuantity) && quantityInput !== "" && (
                <div className="flex items-center gap-1.5 text-xs font-semibold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 p-2 rounded-lg border border-rose-200 dark:border-rose-800/60">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                  <span>Allocation quantity must be at least 1 unit.</span>
                </div>
              )}

              {isQuantityValid && (
                <div className="flex items-center gap-1 text-[11px] text-muted-foreground pt-0.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>
                    <strong>{parsedQuantity}</strong> of {maxAvailable} buffer units selected ({maxAvailable - parsedQuantity} units will remain in buffer stock).
                  </span>
                </div>
              )}
            </div>

            {/* Live Serial Units Selected Preview */}
            {selectedUnits.length > 0 && (
              <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-900/50 border border-border/60">
                <div className="text-[11px] text-muted-foreground font-semibold mb-1.5 flex items-center justify-between">
                  <span>Serial codes being allocated ({selectedUnits.length} selected):</span>
                  <span className="font-mono text-[10.5px]">
                    {selectedUnits[0]?.item_code} &rarr; {selectedUnits[selectedUnits.length - 1]?.item_code}
                  </span>
                </div>
                <div className="flex flex-wrap gap-1 max-h-20 overflow-y-auto">
                  {selectedUnits.map((u) => (
                    <span
                      key={u.id}
                      className="font-mono text-[10.5px] px-1.5 py-0.5 rounded bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800/40 font-medium"
                    >
                      {u.item_code}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Section 2: Campus Location & Department Placement */}
          <div className="space-y-3 border-t border-border/50 pt-5">
            <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Building className="w-3.5 h-3.5 text-primary" />
              2. Destination Department & Campus Placement
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-foreground mb-1">
                  Destination Department / Branch <span className="text-red-500">*</span>
                </label>
                <Select
                  value={selectedBranchId}
                  onValueChange={(val) => {
                    setSelectedBranchId(val);
                    setRecipientBranch(val);
                  }}
                >
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="Select Destination Department..." />
                  </SelectTrigger>
                  <SelectContent className="max-h-[220px]">
                    {branchList.map((b) => (
                      <SelectItem key={b.id} value={String(b.id)}>
                        {b.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-foreground mb-1">
                  Campus Building / Block
                </label>
                <Select value={selectedLocationId} onValueChange={setSelectedLocationId}>
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="Select Destination Building" />
                  </SelectTrigger>
                  <SelectContent>
                    {locationList.map((l) => (
                      <SelectItem key={l.id} value={String(l.id)}>
                        {l.name} ({l.prefix})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Room / Lab / Desk Assignment (One by One per Unit) */}
            <div className="space-y-3 p-4 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-border/60">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <label className="text-xs font-bold text-foreground block">
                      Room / Lab / Desk Assignment
                    </label>
                    {roomMode === "individual" && selectedUnits.length > 0 && (
                      <span className={`px-2 py-0.5 rounded-full text-[10.5px] font-bold border ${
                        selectedUnits.filter((u) => unitRooms[u.id]?.trim()).length === selectedUnits.length
                          ? "bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800"
                          : "bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border-purple-300 dark:border-purple-800"
                      }`}>
                        {selectedUnits.filter((u) => unitRooms[u.id]?.trim()).length} / {selectedUnits.length} Assigned
                      </span>
                    )}
                  </div>
                  <span className="text-[11px] text-muted-foreground">
                    Assign room numbers one by one per unit without typing commas.
                  </span>
                </div>

                {/* Mode Switcher */}
                <div className="flex items-center gap-1 bg-background border border-border p-0.5 rounded-lg shrink-0">
                  <button
                    type="button"
                    onClick={() => {
                      setRoomMode("individual");
                      if (commonRoom.trim() && Object.keys(unitRooms).length === 0) {
                        const initial: Record<number, string> = {};
                        selectedUnits.forEach((u) => {
                          initial[u.id] = commonRoom;
                        });
                        setUnitRooms(initial);
                      }
                    }}
                    className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-all ${
                      roomMode === "individual"
                        ? "bg-purple-600 text-white shadow-xs"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    One by One ({selectedUnits.length} Units)
                  </button>
                  <button
                    type="button"
                    onClick={() => setRoomMode("same")}
                    className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-all ${
                      roomMode === "same"
                        ? "bg-purple-600 text-white shadow-xs"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    Common Room
                  </button>
                </div>
              </div>

              {roomMode === "individual" ? (
                <div className="space-y-3 pt-1">
                  {/* Quick Add to Next Unit Input */}
                  {selectedUnits.length > 0 && (
                    <div className="p-3 bg-background rounded-lg border border-purple-200/80 dark:border-purple-800/60 space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-1.5">
                          <Sparkles className="w-3.5 h-3.5 text-purple-600" />
                          <span className="font-semibold text-foreground">
                            {selectedUnits.find((u) => !unitRooms[u.id]?.trim())
                              ? `Assign Next: Unit #${selectedUnits.findIndex((u) => !unitRooms[u.id]?.trim()) + 1} (${
                                  selectedUnits.find((u) => !unitRooms[u.id]?.trim())?.item_code
                                })`
                              : "All units currently have a room assigned"}
                          </span>
                        </div>
                        {Object.keys(unitRooms).length > 0 && (
                          <div className="flex items-center gap-2">
                            {selectedUnits[0] && unitRooms[selectedUnits[0].id] && (
                              <button
                                type="button"
                                onClick={() => {
                                  const firstVal = unitRooms[selectedUnits[0].id];
                                  const allSame: Record<number, string> = {};
                                  selectedUnits.forEach((u) => {
                                    allSame[u.id] = firstVal;
                                  });
                                  setUnitRooms(allSame);
                                  toast.success(`Copied "${firstVal}" to all ${selectedUnits.length} units.`);
                                }}
                                className="text-[11px] text-purple-600 dark:text-purple-400 hover:underline font-medium"
                              >
                                Copy #1 to All
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => {
                                setUnitRooms({});
                                toast.info("Cleared all unit room assignments.");
                              }}
                              className="text-[11px] text-rose-600 dark:text-rose-400 hover:underline font-medium"
                            >
                              Clear All
                            </button>
                          </div>
                        )}
                      </div>

                      <div className="flex gap-2">
                        <Input
                          placeholder="Type room number (e.g. Lab 301, Desk A) and press Enter to assign..."
                          value={quickRoomInput}
                          onChange={(e) => setQuickRoomInput(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" && quickRoomInput.trim()) {
                              e.preventDefault();
                              const targetUnit = selectedUnits.find((u) => !unitRooms[u.id]?.trim()) || selectedUnits[0];
                              if (targetUnit) {
                                setUnitRooms((prev) => ({ ...prev, [targetUnit.id]: quickRoomInput.trim() }));
                                const assignedCode = targetUnit.item_code;
                                setQuickRoomInput("");
                                toast.success(`Assigned "${quickRoomInput.trim()}" to ${assignedCode}`);
                              }
                            }
                          }}
                          className="h-8.5 text-xs bg-transparent"
                        />
                        <Button
                          type="button"
                          size="sm"
                          onClick={() => {
                            if (quickRoomInput.trim()) {
                              const targetUnit = selectedUnits.find((u) => !unitRooms[u.id]?.trim()) || selectedUnits[0];
                              if (targetUnit) {
                                setUnitRooms((prev) => ({ ...prev, [targetUnit.id]: quickRoomInput.trim() }));
                                const assignedCode = targetUnit.item_code;
                                setQuickRoomInput("");
                                toast.success(`Assigned "${quickRoomInput.trim()}" to ${assignedCode}`);
                              }
                            }
                          }}
                          className="h-8.5 text-xs bg-purple-600 hover:bg-purple-700 text-white shrink-0 font-medium px-3.5"
                        >
                          Add to Next Unit
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* Individual Units List with Room inputs */}
                  <div className="max-h-56 overflow-y-auto space-y-1.5 pr-1">
                    {selectedUnits.map((u, idx) => {
                      const hasRoom = Boolean(unitRooms[u.id]?.trim());
                      return (
                        <div
                          key={u.id}
                          className={`flex items-center gap-2 p-2 rounded-lg border text-xs transition-colors ${
                            hasRoom
                              ? "bg-background border-purple-200/60 dark:border-purple-800/40"
                              : "bg-muted/30 border-dashed border-border"
                          }`}
                        >
                          <div className="w-7 text-center font-mono font-bold text-muted-foreground shrink-0">
                            #{idx + 1}
                          </div>
                          <span className="font-mono font-bold text-primary px-2 py-0.5 rounded bg-primary/10 border border-primary/20 shrink-0">
                            {u.item_code}
                          </span>
                          <Input
                            placeholder={`Room / Lab / Desk for ${u.item_code}...`}
                            value={unitRooms[u.id] || ""}
                            onChange={(e) => {
                              const val = e.target.value;
                              setUnitRooms((prev) => ({ ...prev, [u.id]: val }));
                            }}
                            className="h-7.5 text-xs flex-1 bg-background"
                          />
                          {hasRoom ? (
                            <button
                              type="button"
                              onClick={() => {
                                const newMap = { ...unitRooms };
                                delete newMap[u.id];
                                setUnitRooms(newMap);
                              }}
                              className="w-6 h-6 flex items-center justify-center rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10 text-xs shrink-0"
                              title="Clear room for this unit"
                            >
                              &times;
                            </button>
                          ) : (
                            <span className="text-[10px] text-muted-foreground italic px-1 shrink-0">
                              Optional
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="space-y-1.5 pt-1">
                  <div className="flex gap-2">
                    <Input
                      placeholder="e.g. AI Research Lab 302"
                      value={commonRoom}
                      onChange={(e) => setCommonRoom(e.target.value)}
                      className="h-9 text-xs"
                    />
                    {commonRoom.trim() && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const initial: Record<number, string> = {};
                          selectedUnits.forEach((u) => {
                            initial[u.id] = commonRoom;
                          });
                          setUnitRooms(initial);
                          setRoomMode("individual");
                          toast.success(`Populated ${commonRoom} across all ${selectedUnits.length} units for customization.`);
                        }}
                        className="h-9 text-xs shrink-0 font-medium"
                      >
                        Customize per unit &rarr;
                      </Button>
                    )}
                  </div>
                  <p className="text-[10.5px] text-muted-foreground">
                    This room will be assigned to all {parsedQuantity || 0} allocated unit(s).
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Section 3: Recipient / Custodian Handover */}
          <div className="space-y-4 border-t border-border/50 pt-5">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <UserCheck className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                3. Recipient / Custodian Handover
              </h4>
              <span className="text-[11px] text-purple-700 dark:text-purple-300 font-semibold bg-purple-50 dark:bg-purple-950/60 px-2 py-0.5 rounded-md border border-purple-200 dark:border-purple-800/50">
                Direct Handover
              </span>
            </div>

            {/* Step 1: Recipient Role First */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-foreground">
                  Step 1: Recipient Role First <span className="text-red-500">*</span>
                </label>
                <span className="text-[11px] text-muted-foreground">Select role first</span>
              </div>
              <Select
                value={recipientRole}
                onValueChange={(val) => {
                  setRecipientRole(val);
                  setRecipientId("");
                  setRecipientName("");
                  const isBranchRole = ["faculty", "hod", "staff"].includes(val);
                  setRecipientBranch(isBranchRole ? selectedBranchId || "" : "all");
                  setPersonnelList([]);
                }}
              >
                <SelectTrigger className="w-full h-9 text-xs">
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

            {/* Step 2: Department / Branch Selection (ONLY when Faculty / HOD / Staff is selected) */}
            {["faculty", "hod", "staff"].includes(recipientRole) && (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-foreground">
                    Step 2: Recipient Department / Branch <span className="text-red-500">*</span>
                  </label>
                  <span className="text-[11px] text-muted-foreground">Filter colleagues by branch</span>
                </div>
                <Select
                  value={recipientBranch}
                  onValueChange={(val) => {
                    setRecipientBranch(val);
                    setRecipientId("");
                    setRecipientName("");
                    setPersonnelList([]);
                  }}
                >
                  <SelectTrigger className="w-full h-9 text-xs">
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

            {/* Step 3: Assign Custodian / Recipient with Search in Dropdown */}
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
                    className="w-full h-9 justify-between font-normal text-left px-3 hover:bg-background text-xs"
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
                  className="w-[--radix-popover-trigger-width] min-w-[340px] max-w-[420px] p-0 shadow-xl border overflow-hidden flex flex-col h-[380px]"
                  align="start"
                >
                  {/* Search Header */}
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

                  {/* Body with Colleagues List */}
                  <div className="flex-1 overflow-y-auto p-1.5 space-y-1 relative">
                    {loadingPersonnel && (
                      <div className="absolute inset-0 bg-background/60 backdrop-blur-[1px] flex items-center justify-center z-10">
                        <div className="flex items-center gap-2 text-xs text-muted-foreground bg-background border px-3 py-1.5 rounded-full shadow-sm">
                          <Loader2 className="w-3.5 h-3.5 animate-spin text-purple-600" />
                          <span>Loading colleagues...</span>
                        </div>
                      </div>
                    )}

                    {personnelList.length === 0 && !loadingPersonnel ? (
                      <div className="py-6 text-center text-xs text-muted-foreground space-y-2">
                        <p>No matching colleagues found.</p>
                        {personnelSearch.trim() && (
                          <Button
                            type="button"
                            variant="secondary"
                            size="sm"
                            onClick={() => {
                              setRecipientName(personnelSearch.trim());
                              setRecipientId("");
                              setRecipientPopoverOpen(false);
                            }}
                            className="text-xs h-7"
                          >
                            Use &quot;{personnelSearch.trim()}&quot; as Custodian
                          </Button>
                        )}
                      </div>
                    ) : (
                      personnelList.map((p) => (
                        <div
                          key={p.id}
                          onClick={() => {
                            setRecipientName(p.name);
                            setRecipientId(String(p.id));
                            setRecipientPopoverOpen(false);
                          }}
                          className={`flex items-center justify-between p-2 rounded-lg text-xs cursor-pointer hover:bg-muted/70 transition-colors ${
                            recipientId === String(p.id) ? "bg-purple-50 dark:bg-purple-950/50 border border-purple-200 dark:border-purple-800/60" : ""
                          }`}
                        >
                          <div className="space-y-0.5 truncate">
                            <div className="font-semibold text-foreground truncate flex items-center gap-1.5">
                              <span>{p.name}</span>
                              {p.branch_name && (
                                <span className="text-[10px] text-muted-foreground font-normal">
                                  &bull; {p.branch_name}
                                </span>
                              )}
                            </div>
                            <div className="text-[10.5px] text-muted-foreground truncate">{p.email}</div>
                          </div>
                          {recipientId === String(p.id) && (
                            <CheckCircle2 className="w-4 h-4 text-purple-600 shrink-0 ml-2" />
                          )}
                        </div>
                      ))
                    )}
                  </div>

                  {/* Pagination Footer */}
                  {personnelTotalPages > 1 && (
                    <div className="p-2 border-t bg-muted/20 flex items-center justify-between text-[11px] text-muted-foreground shrink-0">
                      <span>
                        Page {personnelPage} of {personnelTotalPages} ({personnelTotalCount} total)
                      </span>
                      <div className="flex items-center gap-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          disabled={personnelPage <= 1 || loadingPersonnel}
                          onClick={() => setPersonnelPage((prev) => Math.max(1, prev - 1))}
                          className="h-6 w-6 p-0"
                        >
                          <ChevronLeft className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          disabled={personnelPage >= personnelTotalPages || loadingPersonnel}
                          onClick={() => setPersonnelPage((prev) => Math.min(personnelTotalPages, prev + 1))}
                          className="h-6 w-6 p-0"
                        >
                          <ChevronRight className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>
                  )}
                </PopoverContent>
              </Popover>
            </div>

            {/* Handover Remarks */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">
                Handover Notes / Purpose (Optional)
              </label>
              <Input
                placeholder="e.g. Allocated for Deep Learning and Vision Lab research workstations..."
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                className="h-9 text-xs"
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-border bg-muted/10 flex items-center justify-between shrink-0">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onClose}
            disabled={submitting}
            className="text-xs"
          >
            Cancel
          </Button>

          <Button
            type="button"
            size="sm"
            onClick={handleSubmit}
            disabled={submitting || !selectedBranchId || !isQuantityValid || !recipientName.trim()}
            className="bg-purple-600 hover:bg-purple-700 text-white font-semibold text-xs h-9 px-4 gap-1.5 shadow-sm"
          >
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Allocating {parsedQuantity} Unit(s)...</span>
              </>
            ) : (
              <>
                <ArrowRightLeft className="w-3.5 h-3.5" />
                <span>
                  Allocate & Handover {isQuantityValid ? parsedQuantity : 0} Unit{parsedQuantity > 1 ? "s" : ""}{" "}
                  {targetBranchObj ? `to ${targetBranchObj.name}` : ""}
                </span>
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
