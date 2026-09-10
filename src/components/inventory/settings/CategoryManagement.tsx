import React, { useState, useEffect } from "react";
import {
  InventoryCategory,
  fetchInventoryCategories,
  createInventoryCategory,
  updateInventoryCategory,
  deleteInventoryCategory,
} from "../../../utils/inventory_api";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "../../ui/dialog";
import { Button } from "../../ui/button";
import { Input } from "../../ui/input";
import { Textarea } from "../../ui/textarea";
import { Card } from "../../ui/card";
import { Layers, Plus, Edit2, Trash2, Loader2, RefreshCw, Tag } from "lucide-react";
import { toast } from "sonner";

interface Props {
  role?: string;
}

export const CategoryManagement: React.FC<Props> = ({ role = "admin" }) => {
  const canCUD = role === "inventory_manager" || role === "superadmin";
  const [categories, setCategories] = useState<InventoryCategory[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState<InventoryCategory | null>(null);
  const [name, setName] = useState("");
  const [prefix, setPrefix] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    try {
      setLoading(true);
      const data = await fetchInventoryCategories();
      setCategories(data);
    } catch (err: any) {
      toast.error(err.message || "Failed to load categories");
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (cat?: InventoryCategory) => {
    if (cat) {
      setEditingCategory(cat);
      setName(cat.name);
      setPrefix(cat.prefix);
      setDescription(cat.description || "");
    } else {
      setEditingCategory(null);
      setName("");
      setPrefix("");
      setDescription("");
    }
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !prefix.trim()) {
      toast.error("Please provide category name and code prefix");
      return;
    }

    try {
      setSubmitting(true);
      if (editingCategory) {
        await updateInventoryCategory(editingCategory.id, {
          name: name.trim(),
          prefix: prefix.trim().toUpperCase(),
          description: description.trim(),
        });
        toast.success("Category updated successfully");
      } else {
        await createInventoryCategory({
          name: name.trim(),
          prefix: prefix.trim().toUpperCase(),
          description: description.trim(),
        });
        toast.success("Category created successfully");
      }
      setShowModal(false);
      loadCategories();
    } catch (err: any) {
      toast.error(err.message || "Failed to save category");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (cat: InventoryCategory) => {
    if (window.confirm(`Are you sure you want to delete category '${cat.name}'?`)) {
      try {
        await deleteInventoryCategory(cat.id);
        toast.success("Category deleted");
        loadCategories();
      } catch (err: any) {
        toast.error(err.message || "Failed to delete category");
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
            <Plus className="w-4 h-4" /> Add Category
          </Button>
        </div>
      )}

      {/* Grid of Categories */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        {loading ? (
          <div className="col-span-full py-16 text-center text-muted-foreground">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-primary" />
            Loading categories...
          </div>
        ) : categories.length === 0 ? (
          <Card className="col-span-full p-12 text-center text-muted-foreground">
            <Layers className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="font-semibold text-foreground">No categories defined yet.</p>
            <p className="text-xs text-muted-foreground mt-1">
              {canCUD
                ? "Click 'Add Category' to set up prefixes for laptops, projectors, servers, etc."
                : "Institutional asset categories will appear here once configured by the Inventory Manager."}
            </p>
          </Card>
        ) : (
          categories.map((c) => (
            <Card
              key={c.id}
              className="p-5 rounded-2xl border bg-card hover:border-primary/40 transition-all shadow-sm space-y-3 flex flex-col justify-between"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-sm font-black px-2.5 py-1 rounded-lg bg-primary/10 text-primary border border-primary/20">
                    {c.prefix}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {c.items_count ?? 0} item(s)
                  </span>
                </div>
                <h3 className="text-base font-bold text-foreground">{c.name}</h3>
                {c.description && (
                  <p className="text-xs text-muted-foreground line-clamp-2">{c.description}</p>
                )}
              </div>

              {canCUD && (
                <div className="flex justify-end gap-1.5 pt-2 border-t border-border/50">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleOpenModal(c)}
                    className="h-8 text-xs gap-1"
                  >
                    <Edit2 className="w-3.5 h-3.5" /> Edit
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(c)}
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
              <Tag className="w-5 h-5 text-primary" />
              {editingCategory ? "Edit Asset Category" : "Add Asset Category"}
            </DialogTitle>
            <DialogDescription>
              Define the category name and its unique short prefix for item barcodes.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4 pt-2">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-foreground mb-1">
                Category Name *
              </label>
              <Input
                required
                placeholder="e.g. Laptop, Projector, Server, Microscope"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-foreground mb-1">
                Code Prefix (2-6 letters) *
              </label>
              <Input
                required
                maxLength={6}
                placeholder="e.g. LAP, PRO, SRV, MIC"
                value={prefix}
                onChange={(e) => setPrefix(e.target.value.toUpperCase())}
                className="font-mono uppercase font-bold"
              />
              <p className="text-[11px] text-muted-foreground mt-1">
                Used in serial code: e.g. <code>E-<strong>{prefix || "LAP"}</strong>-0001</code>
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-foreground mb-1">
                Description (Optional)
              </label>
              <Textarea
                rows={2}
                placeholder="Brief description of items falling in this category..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setShowModal(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save Category"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};
