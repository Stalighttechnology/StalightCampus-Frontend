import React, { useState, useEffect, useMemo, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "../../ui/dialog";
import { Button } from "../../ui/button";
import { Input } from "../../ui/input";
import { Textarea } from "../../ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../ui/select";
import { PhotoUploader } from "../common/PhotoUploader";
import {
  InventoryItem,
  createInventoryTicket,
  fetchInventoryItemsPaginated,
  fetchBranches,
  uploadInventoryFile,
} from "../../../utils/inventory_api";
import { Wrench, Plus, Loader2, Search, Check, X, Package, ChevronDown } from "lucide-react";
import { toast } from "sonner";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  preselectedItem?: InventoryItem | null;
  onSuccess: () => void;
  branches?: Array<{ id: number; name: string }>;
}

export const RaiseTicketModal: React.FC<Props> = ({
  isOpen,
  onClose,
  preselectedItem,
  onSuccess,
  branches = [],
}) => {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [chosenItem, setChosenItem] = useState<InventoryItem | null>(preselectedItem || null);
  const [branchList, setBranchList] = useState<Array<{ id: number; name: string }>>(branches);
  const [submitting, setSubmitting] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [assetSearch, setAssetSearch] = useState("");
  const [isAssetDropdownOpen, setIsAssetDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Pagination state for Asset selection (10 items per page)
  const [assetPage, setAssetPage] = useState(1);
  const [assetTotalCount, setAssetTotalCount] = useState(0);
  const [assetTotalPages, setAssetTotalPages] = useState(1);
  const [assetLoading, setAssetLoading] = useState(false);
  const pageSize = 10;

  // Form State
  const [formData, setFormData] = useState({
    inventory_item_id: "",
    department_id: "",
    room_no: "",
    issue_category: "hardware_damage",
    issue_description: "",
    attachment_url: "",
    priority: "medium",
  });

  useEffect(() => {
    if (isOpen) {
      if (branches && branches.length > 0) {
        setBranchList(branches);
      } else if (branchList.length === 0) {
        fetchBranches()
          .then((res) => setBranchList(Array.isArray(res) ? res : []))
          .catch(console.error);
      }
    }
  }, [isOpen, branches]);

  // Server-side fetch for assets when modal is open or search/page changes
  useEffect(() => {
    if (!isOpen) return;
    setAssetLoading(true);
    const handler = setTimeout(() => {
      const params: Record<string, string | number> = {
        page: assetPage,
        page_size: pageSize,
      };
      if (assetSearch.trim()) params.search = assetSearch.trim();

      fetchInventoryItemsPaginated(params)
        .then((res) => {
          if (res && Array.isArray(res.results)) {
            setItems(res.results);
            setAssetTotalCount(res.count ?? res.results.length);
            setAssetTotalPages(res.total_pages ?? Math.max(1, Math.ceil((res.count || res.results.length) / pageSize)));
          } else if (Array.isArray(res)) {
            setItems(res);
            setAssetTotalCount(res.length);
            setAssetTotalPages(Math.max(1, Math.ceil(res.length / pageSize)));
          } else {
            setItems([]);
            setAssetTotalCount(0);
            setAssetTotalPages(1);
          }
        })
        .catch((err) => {
          console.error("Failed to load inventory items for ticket", err);
          setItems([]);
        })
        .finally(() => setAssetLoading(false));
    }, 200);

    return () => clearTimeout(handler);
  }, [isOpen, assetPage, assetSearch]);

  useEffect(() => {
    setAssetPage(1);
  }, [assetSearch]);

  useEffect(() => {
    if (preselectedItem) {
      setChosenItem(preselectedItem);
      setFormData((prev) => ({
        ...prev,
        inventory_item_id: String(preselectedItem.id),
        department_id: preselectedItem.branch ? String(preselectedItem.branch) : "",
        room_no: preselectedItem.room_no || "",
      }));
    }
  }, [preselectedItem]);

  // Click outside listener for asset dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsAssetDropdownOpen(false);
      }
    };
    if (isAssetDropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isAssetDropdownOpen]);

  // Auto focus search input when dropdown opens
  useEffect(() => {
    if (isAssetDropdownOpen) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
    }
  }, [isAssetDropdownOpen]);

  const selectedItem = useMemo(() => {
    return chosenItem || items.find((i) => String(i.id) === formData.inventory_item_id) || preselectedItem || null;
  }, [chosenItem, items, formData.inventory_item_id, preselectedItem]);

  const handleSelectAsset = (item: InventoryItem) => {
    setChosenItem(item);
    setFormData((prev) => ({
      ...prev,
      inventory_item_id: String(item.id),
      room_no: item.room_no || prev.room_no,
      department_id: item.branch ? String(item.branch) : prev.department_id,
    }));
    setIsAssetDropdownOpen(false);
  };

  const handleClearAsset = (e: React.MouseEvent) => {
    e.stopPropagation();
    setChosenItem(null);
    setFormData((prev) => ({
      ...prev,
      inventory_item_id: "",
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.inventory_item_id) {
      toast.error("Please select an associated asset / equipment");
      return;
    }
    if (!formData.issue_description.trim()) {
      toast.error("Please describe the issue");
      return;
    }

    try {
      setSubmitting(true);
      let attachmentUrl = formData.attachment_url;
      if (selectedFile) {
        attachmentUrl = await uploadInventoryFile(selectedFile, "inventory/tickets");
      }

      await createInventoryTicket({
        ...formData,
        attachment_url: attachmentUrl,
        inventory_item_id: Number(formData.inventory_item_id),
        department_id: formData.department_id ? Number(formData.department_id) : null,
      });

      toast.success("Maintenance ticket raised successfully!");
      onSuccess();
      onClose();
      setFormData({
        inventory_item_id: "",
        department_id: "",
        room_no: "",
        issue_category: "hardware_damage",
        issue_description: "",
        attachment_url: "",
        priority: "medium",
      });
      setSelectedFile(null);
      setAssetSearch("");
    } catch (err: any) {
      toast.error(err.message || "Failed to raise ticket");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-[90%] sm:w-full max-w-xl max-h-[85vh] sm:max-h-[90vh] overflow-y-auto overflow-x-hidden p-5 sm:p-6 rounded-xl sm:rounded-2xl custom-scrollbar">
        <DialogHeader className="pr-8">
          <DialogTitle className="flex items-center gap-2 text-xl font-semibold">
            <Wrench className="w-5 h-5 text-amber-500 flex-shrink-0" />
            Report Issue / Maintenance Ticket
          </DialogTitle>
          <DialogDescription>
            Report damaged equipment, software glitches, or repair requirements.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2 w-full min-w-0">
          {/* Asset Selection (Dropdown with Search Box & Paginated 10 Entries) */}
          <div className="space-y-1.5 w-full min-w-0" ref={dropdownRef}>
            <label className="block text-xs font-semibold uppercase tracking-wider text-foreground">
              Associated Asset / Equipment <span className="text-rose-500 font-black">*</span>
            </label>

            <div className="relative w-full min-w-0">
              {/* Dropdown Trigger Button */}
              <button
                type="button"
                onClick={() => setIsAssetDropdownOpen((prev) => !prev)}
                className={`w-full flex items-center justify-between gap-2 px-3 py-2 rounded-xl border bg-background text-left transition-all min-w-0 overflow-hidden ${
                  isAssetDropdownOpen ? "ring-2 ring-primary/30 border-primary" : "border-input hover:border-primary/50"
                }`}
              >
                {selectedItem ? (
                  <div className="flex items-center gap-2 min-w-0 flex-1 overflow-hidden">
                    <Package className="w-4 h-4 text-primary flex-shrink-0" />
                    <span className="font-mono text-xs font-semibold px-1.5 py-0.5 rounded bg-primary/10 text-primary whitespace-nowrap flex-shrink-0">
                      {selectedItem.item_code}
                    </span>
                    <span className="text-xs font-medium text-foreground truncate min-w-0 flex-1 block">
                      {selectedItem.item_name}
                    </span>
                  </div>
                ) : (
                  <span className="text-xs text-muted-foreground truncate">
                    Select Asset / Equipment...
                  </span>
                )}

                <div className="flex items-center gap-1 flex-shrink-0">
                  {selectedItem && (
                    <button
                      type="button"
                      onClick={handleClearAsset}
                      className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted"
                      title="Clear selection"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                  <ChevronDown
                    className={`w-4 h-4 text-muted-foreground transition-transform duration-200 ${
                      isAssetDropdownOpen ? "rotate-180 text-primary" : ""
                    }`}
                  />
                </div>
              </button>

              {/* Opened Dropdown Menu with Search Box on Top, 10 Items Below & Pagination */}
              {isAssetDropdownOpen && (
                <div className="absolute left-0 right-0 top-full mt-1.5 z-50 rounded-xl border bg-popover text-popover-foreground shadow-xl p-2.5 space-y-2 animate-in fade-in-0 zoom-in-95 w-full max-w-full overflow-hidden">
                  {/* Search Box Inside Dropdown */}
                  <div className="relative w-full">
                    <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      ref={searchInputRef}
                      placeholder="Search by item code or item name..."
                      value={assetSearch}
                      onChange={(e) => setAssetSearch(e.target.value)}
                      className="pl-8 h-8 text-xs bg-muted/30 focus-visible:ring-1 w-full"
                    />
                    {assetSearch && (
                      <button
                        type="button"
                        onClick={() => setAssetSearch("")}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    )}
                  </div>

                  {/* Scrollable Items List (10 per page with server-side indexing) */}
                  <div className="max-h-56 overflow-y-auto divide-y divide-border/30 rounded-lg border border-border/40 w-full">
                    {assetLoading ? (
                      <div className="p-4 flex items-center justify-center gap-2 text-xs text-muted-foreground">
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" />
                        Loading equipment...
                      </div>
                    ) : items.length === 0 ? (
                      <div className="p-4 text-center text-xs text-muted-foreground">
                        No equipment found{assetSearch ? ` matching "${assetSearch}"` : ""}.
                      </div>
                    ) : (
                      items.map((item, idx) => {
                        const globalIndex = (assetPage - 1) * pageSize + idx + 1;
                        const isSelected = String(item.id) === formData.inventory_item_id;
                        return (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() => handleSelectAsset(item)}
                            className={`w-full text-left p-2.5 hover:bg-primary/5 transition-colors flex items-center justify-between gap-2.5 ${
                              isSelected ? "bg-primary/10" : ""
                            }`}
                          >
                            <div className="flex items-center gap-2.5 min-w-0 flex-1 overflow-hidden">
                              <span className="font-mono text-[10px] font-semibold px-1.5 py-0.5 rounded bg-muted/80 text-muted-foreground border border-border/50 flex-shrink-0">
                                #{globalIndex}
                              </span>
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2 min-w-0">
                                  <span className="font-mono font-semibold text-xs text-primary whitespace-nowrap flex-shrink-0">
                                    {item.item_code}
                                  </span>
                                  <span className="font-medium text-xs text-foreground truncate min-w-0 block">
                                    {item.item_name}
                                  </span>
                                </div>
                                <div className="text-[11px] text-muted-foreground mt-0.5 truncate">
                                  {item.category_details?.name || "Asset"} • {item.branch_name || "General"} {item.room_no && `• Room ${item.room_no}`}
                                </div>
                              </div>
                            </div>
                            {isSelected && <Check className="w-4 h-4 text-primary flex-shrink-0" />}
                          </button>
                        );
                      })
                    )}
                  </div>

                  {/* Pagination Footer */}
                  {assetTotalCount > 0 && (
                    <div className="flex items-center justify-between pt-1 border-t border-border/40 text-[11px] text-muted-foreground px-0.5">
                      <span>
                        Showing {(assetPage - 1) * pageSize + 1}-{Math.min(assetPage * pageSize, assetTotalCount)} of {assetTotalCount}
                      </span>
                      <div className="flex items-center gap-1.5">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={assetPage <= 1 || assetLoading}
                          onClick={(e) => {
                            e.stopPropagation();
                            setAssetPage((p) => Math.max(1, p - 1));
                          }}
                          className="h-6 px-2 text-[10px]"
                        >
                          Prev
                        </Button>
                        <span className="font-medium px-1 text-foreground">
                          {assetPage} / {assetTotalPages}
                        </span>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={assetPage >= assetTotalPages || assetLoading}
                          onClick={(e) => {
                            e.stopPropagation();
                            setAssetPage((p) => Math.min(assetTotalPages, p + 1));
                          }}
                          className="h-6 px-2 text-[10px]"
                        >
                          Next
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Department & Room */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 min-w-0 w-full">
            <div className="min-w-0">
              <label className="block text-xs font-semibold uppercase tracking-wider text-foreground mb-1 truncate">
                Department / Branch
              </label>
              <Select
                value={formData.department_id}
                onValueChange={(v) => setFormData({ ...formData, department_id: v })}
              >
                <SelectTrigger className="w-full min-w-0 text-xs">
                  <SelectValue placeholder="Select Department" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">General / None</SelectItem>
                  {branchList.map((b) => (
                    <SelectItem key={b.id} value={String(b.id)}>
                      {b.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="min-w-0">
              <label className="block text-xs font-semibold uppercase tracking-wider text-foreground mb-1 truncate">
                Room / Lab Location
              </label>
              <Input
                placeholder="e.g. Lab 402, 4th Floor"
                value={formData.room_no}
                onChange={(e) => setFormData({ ...formData, room_no: e.target.value })}
                className="w-full min-w-0 text-xs"
              />
            </div>
          </div>

          {/* Category & Priority */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 min-w-0 w-full">
            <div className="min-w-0">
              <label className="block text-xs font-semibold uppercase tracking-wider text-foreground mb-1 truncate">
                Issue Category <span className="text-rose-500 font-black">*</span>
              </label>
              <Select
                value={formData.issue_category}
                onValueChange={(v) => setFormData({ ...formData, issue_category: v })}
              >
                <SelectTrigger className="w-full min-w-0 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="hardware_damage">Hardware Damage</SelectItem>
                  <SelectItem value="software_failure">Software / OS Crash</SelectItem>
                  <SelectItem value="electrical">Electrical / Power</SelectItem>
                  <SelectItem value="network">Network / WiFi</SelectItem>
                  <SelectItem value="replacement_needed">Part Replacement</SelectItem>
                  <SelectItem value="routine_service">Routine Service</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="min-w-0">
              <label className="block text-xs font-semibold uppercase tracking-wider text-foreground mb-1 truncate">
                Priority <span className="text-rose-500 font-black">*</span>
              </label>
              <Select
                value={formData.priority}
                onValueChange={(v) => setFormData({ ...formData, priority: v })}
              >
                <SelectTrigger className="w-full min-w-0 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Issue Description */}
          <div className="w-full min-w-0">
            <label className="block text-xs font-semibold uppercase tracking-wider text-foreground mb-1">
              Issue Description <span className="text-rose-500 font-black">*</span>
            </label>
            <Textarea
              required
              rows={3}
              placeholder="Explain the problem in detail (e.g. Monitor display flickering, burning smell, won't turn on)..."
              value={formData.issue_description}
              onChange={(e) => setFormData({ ...formData, issue_description: e.target.value })}
              className="w-full min-w-0 text-xs"
            />
          </div>

          {/* Photo / Screenshot */}
          <div className="w-full min-w-0">
            <PhotoUploader
              label="Photo of Defect / Error (Optional)"
              value={formData.attachment_url}
              file={selectedFile}
              onFileChange={(f) => setSelectedFile(f)}
              onChange={(url) => setFormData((prev) => ({ ...prev, attachment_url: url }))}
              folder="inventory/tickets"
              maxSizeMB={1}
              autoUpload={false}
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 w-full">
            <Button type="button" variant="outline" onClick={onClose} className="px-4">
              Cancel
            </Button>
            <Button type="submit" disabled={submitting} className="gap-1.5 px-4 font-semibold">
              {submitting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <Plus className="w-4 h-4" /> Raise Ticket
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
