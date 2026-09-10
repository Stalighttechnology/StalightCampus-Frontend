import React, { useState, useEffect } from "react";
import {
  InventoryLocation,
  fetchInventoryLocations,
  createInventoryLocation,
  updateInventoryLocation,
  deleteInventoryLocation,
} from "../../../utils/inventory_api";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "../../ui/dialog";
import { Button } from "../../ui/button";
import { Input } from "../../ui/input";
import { Card } from "../../ui/card";
import { MapPin, Plus, Edit2, Trash2, Loader2, RefreshCw, Building } from "lucide-react";
import { toast } from "sonner";

interface Props {
  role?: string;
}

export const LocationManagement: React.FC<Props> = ({ role = "admin" }) => {
  const canCUD = role === "inventory_manager" || role === "superadmin";
  const [locations, setLocations] = useState<InventoryLocation[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [editingLocation, setEditingLocation] = useState<InventoryLocation | null>(null);
  const [name, setName] = useState("");
  const [prefix, setPrefix] = useState("");
  const [building, setBuilding] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadLocations();
  }, []);

  const loadLocations = async () => {
    try {
      setLoading(true);
      const data = await fetchInventoryLocations();
      setLocations(data);
    } catch (err: any) {
      toast.error(err.message || "Failed to load locations");
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (loc?: InventoryLocation) => {
    if (loc) {
      setEditingLocation(loc);
      setName(loc.name);
      setPrefix(loc.prefix);
      setBuilding(loc.building || "");
    } else {
      setEditingLocation(null);
      setName("");
      setPrefix("");
      setBuilding("");
    }
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !prefix.trim()) {
      toast.error("Please provide location name and prefix");
      return;
    }

    try {
      setSubmitting(true);
      if (editingLocation) {
        await updateInventoryLocation(editingLocation.id, {
          name: name.trim(),
          prefix: prefix.trim().toUpperCase(),
          building: building.trim(),
        });
        toast.success("Location updated successfully");
      } else {
        await createInventoryLocation({
          name: name.trim(),
          prefix: prefix.trim().toUpperCase(),
          building: building.trim(),
        });
        toast.success("Location created successfully");
      }
      setShowModal(false);
      loadLocations();
    } catch (err: any) {
      toast.error(err.message || "Failed to save location");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (loc: InventoryLocation) => {
    if (window.confirm(`Are you sure you want to delete location '${loc.name}'?`)) {
      try {
        await deleteInventoryLocation(loc.id);
        toast.success("Location deleted");
        loadLocations();
      } catch (err: any) {
        toast.error(err.message || "Failed to delete location");
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Action */}
      {canCUD && (
        <div className="flex items-center justify-end gap-4 w-full">
          <Button
            size="sm"
            onClick={() => handleOpenModal()}
            className="gap-1.5 text-xs font-semibold shadow-sm ml-auto"
          >
            <Plus className="w-4 h-4" /> Add Location
          </Button>
        </div>
      )}

      {/* Grid of Locations */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        {loading ? (
          <div className="col-span-full py-16 text-center text-muted-foreground">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-primary" />
            Loading locations...
          </div>
        ) : locations.length === 0 ? (
          <Card className="col-span-full p-12 text-center text-muted-foreground">
            <MapPin className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="font-semibold text-foreground">No locations configured yet.</p>
            <p className="text-xs text-muted-foreground mt-1">
              {canCUD
                ? "Click 'Add Location' to register Engineering Block, Library Block, Admin Block, etc."
                : "Institutional location blocks will appear here once configured by the Inventory Manager."}
            </p>
          </Card>
        ) : (
          locations.map((l) => (
            <Card
              key={l.id}
              className="p-5 rounded-2xl border bg-card hover:border-primary/40 transition-all shadow-sm space-y-3 flex flex-col justify-between"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-sm font-black px-2.5 py-1 rounded-lg bg-primary/10 text-primary border border-primary/20">
                    Prefix: {l.prefix}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {l.items_count ?? 0} item(s)
                  </span>
                </div>
                <h3 className="text-base font-bold text-foreground">{l.name}</h3>
                {l.building && (
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <Building className="w-3 h-3" /> {l.building}
                  </p>
                )}
              </div>

              {canCUD && (
                <div className="flex justify-end gap-1.5 pt-2 border-t border-border/50">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleOpenModal(l)}
                    className="h-8 text-xs gap-1"
                  >
                    <Edit2 className="w-3.5 h-3.5" /> Edit
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(l)}
                    className="h-8 text-xs gap-1 text-destructive hover:bg-destructive/10"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              )}
            </Card>
          ))
        )}
      </div>

      {/* Modal */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="max-w-md p-6">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg font-bold">
              <MapPin className="w-5 h-5 text-primary" />
              {editingLocation ? "Edit Campus Location" : "Add Campus Location"}
            </DialogTitle>
            <DialogDescription>
              Define building/block name and its single or double letter prefix for item codes.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4 pt-2">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-foreground mb-1">
                Location / Block Name *
              </label>
              <Input
                required
                placeholder="e.g. Engineering Block, Administrative Block"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-foreground mb-1">
                Location Prefix (1-4 letters) *
              </label>
              <Input
                required
                maxLength={4}
                placeholder="e.g. E, A, D, LIB"
                value={prefix}
                onChange={(e) => setPrefix(e.target.value.toUpperCase())}
                className="font-mono uppercase font-bold"
              />
              <p className="text-[11px] text-muted-foreground mt-1">
                Used in serial code: e.g. <code><strong>{prefix || "E"}</strong>-LAP-0001</code>
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-foreground mb-1">
                Building Number / Landmark (Optional)
              </label>
              <Input
                placeholder="e.g. Building 4, North Campus"
                value={building}
                onChange={(e) => setBuilding(e.target.value)}
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setShowModal(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save Location"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};
