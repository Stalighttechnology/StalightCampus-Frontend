import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "../../ui/dialog";
import { Button } from "../../ui/button";
import { Input } from "../../ui/input";
import { Textarea } from "../../ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../ui/select";
import { PhotoUploader } from "../common/PhotoUploader";
import {
  InventoryCategory,
  InventoryLocation,
  createInventoryItem,
  fetchBranches,
} from "../../../utils/inventory_api";
import { PlusCircle, Tag, Loader2, Sparkles, AlertCircle } from "lucide-react";
import { toast } from "sonner";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  categories: InventoryCategory[];
  locations: InventoryLocation[];
  branches?: Array<{ id: number; name: string }>;
  onSuccess: () => void;
}

export const AddInventoryModal: React.FC<Props> = ({
  isOpen,
  onClose,
  categories,
  locations,
  branches = [],
  onSuccess,
}) => {
  const [loading, setLoading] = useState(false);
  const [branchList, setBranchList] = useState<Array<{ id: number; name: string }>>(branches);
  const [formData, setFormData] = useState({
    item_name: "",
    category_id: "",
    location_id: "",
    branch_id: "",
    room_no: "",
    specifications: "",
    quantity_available: 1,
    cost_per_unit: 0,
    asset_type: "tangible",
    status: "available",
    vendor_name: "",
    vendor_contact: "",
    vendor_address: "",
    invoice_no: "",
    invoice_date: "",
    approval_letter_ref: "",
    item_photo_url: "",
    invoice_photo_url: "",
    remarks: "",
  });

  useEffect(() => {
    if (branches && branches.length > 0) {
      setBranchList(branches);
    } else if (isOpen) {
      fetchBranches()
        .then((res) => {
          if (Array.isArray(res) && res.length > 0) {
            setBranchList(res);
          }
        })
        .catch(console.error);
    }
  }, [branches, isOpen]);

  const selectedCategory = categories.find((c) => String(c.id) === formData.category_id);
  const selectedLocation = locations.find((l) => String(l.id) === formData.location_id);

  const previewCode =
    selectedLocation && selectedCategory
      ? `${selectedLocation.prefix.toUpperCase()}-${selectedCategory.prefix.toUpperCase()}-XXXX`
      : "SELECT LOCATION & CATEGORY";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.item_name.trim()) {
      toast.error("Please provide an item name");
      return;
    }
    if (!formData.category_id) {
      toast.error("Please select an asset category");
      return;
    }
    if (!formData.location_id) {
      toast.error("Please select a campus location");
      return;
    }

    try {
      setLoading(true);
      await createInventoryItem({
        ...formData,
        category_id: Number(formData.category_id),
        location_id: Number(formData.location_id),
        branch_id: formData.branch_id && formData.branch_id !== "unassigned" ? Number(formData.branch_id) : null,
        quantity_available: Number(formData.quantity_available) || 1,
        cost_per_unit: Number(formData.cost_per_unit) || 0,
      });

      toast.success("Asset added to inventory successfully");
      onSuccess();
      onClose();
    } catch (err: any) {
      toast.error(err.message || "Failed to add inventory item");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-6">
        <DialogHeader className="pr-8">
          <DialogTitle className="flex items-center gap-2 text-xl font-bold">
            <PlusCircle className="w-5 h-5 text-primary" />
            Add New Inventory Item
          </DialogTitle>
          <DialogDescription>
            Register a new equipment or physical asset into campus inventory.
          </DialogDescription>
        </DialogHeader>

        {/* Live Item Code Preview Banner */}
        <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border border-primary/20 rounded-2xl p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary text-primary-foreground flex items-center justify-center font-black">
              <Tag className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[11px] uppercase font-bold tracking-wider text-muted-foreground flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-primary" /> Auto-Generated Item Code Preview
              </p>
              <p className="font-mono text-lg font-black tracking-wider text-foreground">
                {previewCode}
              </p>
            </div>
          </div>
          <span className="text-xs text-muted-foreground hidden sm:block">
            Unique across organization
          </span>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          {/* Item Name */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-foreground mb-1.5">
              Item Name / Model *
            </label>
            <Input
              required
              placeholder="e.g. Dell Latitude 5440 i7 16GB"
              value={formData.item_name}
              onChange={(e) => setFormData({ ...formData, item_name: e.target.value })}
            />
          </div>

          {/* Category & Location */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-foreground mb-1.5">
                Category *
              </label>
              <Select
                value={formData.category_id}
                onValueChange={(v) => setFormData({ ...formData, category_id: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select Category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((c) => (
                    <SelectItem key={c.id} value={String(c.id)}>
                      {c.name} ({c.prefix})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-foreground mb-1.5">
                Location / Block *
              </label>
              <Select
                value={formData.location_id}
                onValueChange={(v) => setFormData({ ...formData, location_id: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select Location" />
                </SelectTrigger>
                <SelectContent>
                  {locations.map((l) => (
                    <SelectItem key={l.id} value={String(l.id)}>
                      {l.name} ({l.prefix})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Department Branch & Room No */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-foreground mb-1.5">
                Department / Branch (Optional)
              </label>
              <Select
                value={formData.branch_id}
                onValueChange={(v) => setFormData({ ...formData, branch_id: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Assign to Department" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="unassigned">General / Unassigned</SelectItem>
                  {branchList.map((b) => (
                    <SelectItem key={b.id} value={String(b.id)}>
                      {b.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-foreground mb-1.5">
                Room / Lab / Desk No
              </label>
              <Input
                placeholder="e.g. Lab 302, 3rd Floor"
                value={formData.room_no}
                onChange={(e) => setFormData({ ...formData, room_no: e.target.value })}
              />
            </div>
          </div>

          {/* Asset Type & Initial Status */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-foreground mb-1.5">
                Asset Classification
              </label>
              <Select
                value={formData.asset_type}
                onValueChange={(v: any) => setFormData({ ...formData, asset_type: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="tangible">Tangible Asset</SelectItem>
                  <SelectItem value="it_asset">IT Equipment</SelectItem>
                  <SelectItem value="lab_equipment">Lab Equipment</SelectItem>
                  <SelectItem value="furniture">Furniture / Fixture</SelectItem>
                  <SelectItem value="consumable">Consumable</SelectItem>
                  <SelectItem value="license">Software License</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-foreground mb-1.5">
                Initial Status
              </label>
              <Select
                value={formData.status}
                onValueChange={(v: any) => setFormData({ ...formData, status: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="available">Available / In Stock</SelectItem>
                  <SelectItem value="in-use">In Use / Deployed</SelectItem>
                  <SelectItem value="in-repair">In Repair</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Quantity & Unit Cost */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-foreground mb-1.5">
                Quantity Available
              </label>
              <Input
                type="number"
                min={1}
                value={formData.quantity_available}
                onChange={(e) =>
                  setFormData({ ...formData, quantity_available: parseInt(e.target.value) || 1 })
                }
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-foreground mb-1.5">
                Cost Per Unit (₹)
              </label>
              <Input
                type="number"
                min={0}
                step="0.01"
                placeholder="0.00"
                value={formData.cost_per_unit}
                onChange={(e) =>
                  setFormData({ ...formData, cost_per_unit: parseFloat(e.target.value) || 0 })
                }
              />
            </div>
          </div>

          {/* Specifications */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-foreground mb-1.5">
              Technical Specifications / Details
            </label>
            <Textarea
              rows={2}
              placeholder="e.g. Serial: DELL-99481, RAM: 16GB DDR4, Storage: 512GB SSD..."
              value={formData.specifications}
              onChange={(e) => setFormData({ ...formData, specifications: e.target.value })}
            />
          </div>

          {/* Vendor & Invoice Metadata */}
          <div className="p-4 bg-muted/20 border rounded-2xl space-y-3">
            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Purchase & Vendor Information (Optional)
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Input
                placeholder="Vendor Name"
                value={formData.vendor_name}
                onChange={(e) => setFormData({ ...formData, vendor_name: e.target.value })}
              />
              <Input
                placeholder="Invoice Number"
                value={formData.invoice_no}
                onChange={(e) => setFormData({ ...formData, invoice_no: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              <PhotoUploader
                label="Item Photo"
                value={formData.item_photo_url}
                onChange={(url) => setFormData({ ...formData, item_photo_url: url })}
              />
              <PhotoUploader
                label="Purchase Invoice PDF / Image"
                value={formData.invoice_photo_url}
                onChange={(url) => setFormData({ ...formData, invoice_photo_url: url })}
              />
            </div>
          </div>

          {/* Footer Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading} className="gap-1.5 min-w-[140px]">
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Saving...
                </>
              ) : (
                <>
                  <PlusCircle className="w-4 h-4" /> Save Asset
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
