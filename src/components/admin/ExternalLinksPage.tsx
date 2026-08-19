import React, { useState, useEffect } from "react";
import { useToast } from "../../hooks/use-toast";
import { externalLinksApi, ExternalLink } from "../../api/external_links_api";
import {
  Camera, Fingerprint, Globe, BookOpen, FileSpreadsheet, Shield, Bus, DollarSign, Building, Link,
  Plus, Edit2, Trash2, ExternalLink as ExternalLinkIcon, Search, Loader2, AlertCircle, HelpCircle
} from "lucide-react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Card } from "../ui/card";
import { Label } from "../ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter
} from "../ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";

const CATEGORIES = [
  "Security", "Academics", "Examination", "Administration", "Finance",
  "HR & Payroll", "Transport", "Communication", "Government", "Other"
];

const PREDEFINED_ICONS = [
  { name: "Camera", label: "CCTV/Camera" },
  { name: "Fingerprint", label: "Biometric/Attendance" },
  { name: "Globe", label: "Website" },
  { name: "BookOpen", label: "LMS/Learning" },
  { name: "FileSpreadsheet", label: "Exam Portal" },
  { name: "Shield", label: "Security/Feeds" },
  { name: "Bus", label: "Transport/GPS" },
  { name: "DollarSign", label: "Finance/Payroll" },
  { name: "Building", label: "Government/Portal" },
  { name: "Link", label: "General Link" }
];

const ICON_MAP: Record<string, React.ComponentType<any>> = {
  Camera, Fingerprint, Globe, BookOpen, FileSpreadsheet, Shield, Bus, DollarSign, Building, Link
};

interface ExternalLinksPageProps {
  userRole: string;
}

export default function ExternalLinksPage({ userRole }: ExternalLinksPageProps) {
  const { toast } = useToast();
  const isAdmin = ["principal", "org_admin", "admin"].includes(userRole);

  const [links, setLinks] = useState<ExternalLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingLink, setEditingLink] = useState<ExternalLink | null>(null);

  // Form State
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("Security");
  const [icon, setIcon] = useState("Link");
  const [statusVal, setStatusVal] = useState<'Active' | 'Inactive'>("Active");
  const [displayOrder, setDisplayOrder] = useState<number>(0);
  const [validationError, setValidationError] = useState<string | null>(null);

  // Delete State
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [linkToDelete, setLinkToDelete] = useState<ExternalLink | null>(null);

  useEffect(() => {
    fetchLinks();
  }, []);

  const fetchLinks = async () => {
    setLoading(true);
    try {
      const data = await externalLinksApi.getExternalLinks();
      if (data.success) {
        setLinks(data.links);
      } else {
        toast({
          variant: "destructive",
          title: "Error",
          description: "Failed to fetch external links."
        });
      }
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: err.message || "Failed to load links."
      });
    } finally {
      setLoading(false);
    }
  };

  const openAddModal = () => {
    setEditingLink(null);
    setName("");
    setUrl("");
    setDescription("");
    setCategory("Security");
    setIcon("Link");
    setStatusVal("Active");
    setDisplayOrder(0);
    setValidationError(null);
    setIsModalOpen(true);
  };

  const openEditModal = (link: ExternalLink) => {
    setEditingLink(link);
    setName(link.name);
    setUrl(link.url);
    setDescription(link.description || "");
    setCategory(link.category);
    setIcon(link.icon);
    setStatusVal(link.status);
    setDisplayOrder(link.display_order || 0);
    setValidationError(null);
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    if (!name.trim()) {
      setValidationError("Link Name is required.");
      return;
    }

    if (!url.trim()) {
      setValidationError("URL is required.");
      return;
    }

    if (!url.startsWith("http://") && !url.startsWith("https://")) {
      setValidationError("URL must start with http:// or https://");
      return;
    }

    const payload: Partial<ExternalLink> = {
      name: name.trim(),
      url: url.trim(),
      description: description.trim() || "",
      category,
      icon,
      status: statusVal,
      display_order: Number(displayOrder) || 0
    };

    try {
      if (editingLink) {
        const response = await externalLinksApi.updateExternalLink(editingLink.id, payload);
        if (response.success) {
          toast({
            title: "Success",
            description: "External link updated successfully."
          });
          fetchLinks();
          setIsModalOpen(false);
        }
      } else {
        const response = await externalLinksApi.createExternalLink(payload);
        if (response.success) {
          toast({
            title: "Success",
            description: "External link added successfully."
          });
          fetchLinks();
          setIsModalOpen(false);
        }
      }
    } catch (err: any) {
      setValidationError(err.message || "Failed to save link.");
    }
  };

  const openDeleteConfirm = (link: ExternalLink) => {
    setLinkToDelete(link);
    setDeleteConfirmOpen(true);
  };

  const handleDelete = async () => {
    if (!linkToDelete) return;
    try {
      const response = await externalLinksApi.deleteExternalLink(linkToDelete.id);
      if (response.success) {
        toast({
          title: "Success",
          description: "External link deleted successfully."
        });
        fetchLinks();
        setDeleteConfirmOpen(false);
      }
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: err.message || "Failed to delete link."
      });
    }
  };

  const filteredLinks = links.filter(link => {
    const matchesSearch = link.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (link.description && link.description.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesCategory = selectedCategory === "All" || link.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const getCategoryBadgeColor = (cat: string) => {
    const colors: Record<string, string> = {
      Security: "bg-red-50 text-red-700 border-red-200 dark:bg-red-950/20 dark:text-red-400 dark:border-red-800/30",
      Academics: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/20 dark:text-blue-400 dark:border-blue-800/30",
      Examination: "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/20 dark:text-purple-400 dark:border-purple-800/30",
      Administration: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/20 dark:text-amber-400 dark:border-amber-800/30",
      Finance: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-800/30",
      "HR & Payroll": "bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/20 dark:text-indigo-400 dark:border-indigo-800/30",
      Transport: "bg-cyan-50 text-cyan-700 border-cyan-200 dark:bg-cyan-950/20 dark:text-cyan-400 dark:border-cyan-800/30",
      Communication: "bg-pink-50 text-pink-700 border-pink-200 dark:bg-pink-950/20 dark:text-pink-400 dark:border-pink-800/30",
      Government: "bg-teal-50 text-teal-700 border-teal-200 dark:bg-teal-950/20 dark:text-teal-400 dark:border-teal-800/30",
      Other: "bg-slate-50 text-slate-700 border-slate-200 dark:bg-slate-900 dark:text-slate-400 dark:border-slate-800"
    };
    return colors[cat] || colors.Other;
  };

  const renderIcon = (iconName: string, className = "h-5 w-5") => {
    const IconComponent = ICON_MAP[iconName] || Link;
    return <IconComponent className={className} />;
  };

  return (
    <div className="space-y-6 p-1 sm:p-2">
      {/* Header section */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-100 dark:border-slate-800 pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            <Link className="h-6 w-6 text-purple-600 dark:text-purple-400" />
            External Links
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
            Access and manage important external systems and institutional resources from one place.
          </p>
        </div>
        {isAdmin && (
          <Button
            onClick={openAddModal}
            className="w-full sm:w-auto bg-purple-600 hover:bg-purple-700 text-white rounded-xl shadow-md transition-all flex items-center justify-center gap-2 px-4 py-2.5"
          >
            <Plus className="h-5 w-5" />
            Add External Link
          </Button>
        )}
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4 items-stretch sm:items-center">
        {/* Search bar */}
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-3 h-5 w-5 text-slate-400" />
          <Input
            placeholder="Search external links by name or description..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-11 pr-4 py-6 border-slate-200 focus-visible:ring-purple-500 rounded-xl dark:border-slate-800"
          />
        </div>

        {/* Category filter dropdown */}
        <div className="w-full sm:w-[220px]">
          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger className="w-full h-[50px] border-slate-200 dark:border-slate-800 rounded-xl focus:ring-purple-500/20 focus:border-purple-500">
              <SelectValue placeholder="Filter by Category" />
            </SelectTrigger>
            <SelectContent className="max-h-[300px]">
              <SelectItem value="All">All Categories</SelectItem>
              {CATEGORIES.map((cat) => (
                <SelectItem key={cat} value={cat}>
                  {cat}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Grid section */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
          <p className="text-slate-500 text-sm">Fetching your institutional links...</p>
        </div>
      ) : filteredLinks.length === 0 ? (
        <Card className="flex flex-col items-center justify-center p-10 text-center border-dashed border-2 border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/10 rounded-2xl">
          <div className="p-4 bg-purple-50 dark:bg-purple-950/20 rounded-full text-purple-600 dark:text-purple-400 mb-4">
            <Link className="h-10 w-10" />
          </div>
          <h3 className="text-lg font-bold text-slate-900 dark:text-white">
            {searchTerm || selectedCategory !== "All" ? "No matches found" : "No External Links Added"}
          </h3>
          <p className="text-slate-500 dark:text-slate-400 text-sm max-w-md mt-2">
            {searchTerm || selectedCategory !== "All" 
              ? "Try adjusting your search query or selecting a different category filter." 
              : "Connect your institution's important external systems and access them directly from your Principal Dashboard."}
          </p>
          {isAdmin && !searchTerm && selectedCategory === "All" && (
            <Button
              onClick={openAddModal}
              className="mt-6 bg-purple-600 hover:bg-purple-700 text-white rounded-xl shadow-md flex items-center gap-2 px-5 py-2.5"
            >
              <Plus className="h-5 w-5" />
              Add External Link
            </Button>
          )}
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredLinks.map((link) => (
            <Card
              key={link.id}
              className="group overflow-hidden border border-slate-100 hover:border-purple-200 dark:border-slate-850 dark:hover:border-purple-900 bg-white dark:bg-slate-900 rounded-2xl shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 flex flex-col justify-between"
            >
              <div className="p-6">
                {/* Badge row & Admin controls */}
                <div className="flex items-center justify-between gap-3 mb-4">
                  <span className={`px-2.5 py-1 text-xs font-semibold rounded-full border ${getCategoryBadgeColor(link.category)}`}>
                    {link.category}
                  </span>
                  
                  <div className="flex items-center gap-1.5">
                    {link.status === "Inactive" && (
                      <span className="bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border border-slate-200 dark:border-slate-700 px-2 py-0.5 text-[10px] font-bold rounded-md">
                        Inactive
                      </span>
                    )}

                    {isAdmin && (
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openEditModal(link)}
                          className="h-8 w-8 text-slate-500 hover:text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-950/20 rounded-lg"
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openDeleteConfirm(link)}
                          className="h-8 w-8 text-slate-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-lg"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Card Title & Icon */}
                <div className="flex items-start gap-4 mb-3">
                  <div className="p-3 bg-purple-50 dark:bg-purple-950/20 text-purple-600 dark:text-purple-400 rounded-xl">
                    {renderIcon(link.icon, "h-6 w-6")}
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 dark:text-white text-base group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">
                      {link.name}
                    </h3>
                    <span className="text-[10px] text-slate-400 dark:text-slate-500 select-all block truncate max-w-[200px]" title={link.url}>
                      {link.url.replace(/https?:\/\/(www\.)?/, "")}
                    </span>
                  </div>
                </div>

                {/* Description */}
                <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed min-h-[40px] line-clamp-2">
                  {link.description || "No description provided."}
                </p>
              </div>

              {/* Action row */}
              <div className="px-6 py-4 bg-slate-50/50 dark:bg-slate-950/20 border-t border-slate-50 dark:border-slate-850 flex items-center justify-between">
                <span className="text-xs text-slate-400 dark:text-slate-500">
                  Order: {link.display_order ?? 0}
                </span>
                
                <a
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-sm font-bold text-purple-600 hover:text-purple-700 dark:text-purple-400 dark:hover:text-purple-300 transition-colors"
                >
                  Open
                  <ExternalLinkIcon className="h-4 w-4" />
                </a>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Add / Edit Dialog */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-lg w-[95%] max-h-[85vh] overflow-y-auto rounded-2xl p-4 sm:p-6">
          <DialogHeader className="pb-2 border-b border-slate-100 dark:border-slate-800">
            <DialogTitle className="text-lg font-bold text-slate-900 dark:text-white">
              {editingLink ? "Edit External Link" : "Add External Link"}
            </DialogTitle>
            <DialogDescription className="text-sm text-slate-500 dark:text-slate-400">
              Provide the details below to configure this institutional resource.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSave} className="space-y-4 pt-4">
            {validationError && (
              <div className="p-3 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800/30 rounded-xl text-red-600 dark:text-red-400 text-xs flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{validationError}</span>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Name */}
              <div className="space-y-1.5">
                <Label htmlFor="linkName" className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Link Name <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="linkName"
                  placeholder="e.g. CCTV Monitoring"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="rounded-xl border-slate-200 dark:border-slate-800 focus-visible:ring-purple-500"
                  required
                />
              </div>

              {/* Category */}
              <div className="space-y-1.5">
                <Label htmlFor="linkCategory" className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Category <span className="text-red-500">*</span>
                </Label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger id="linkCategory" className="w-full rounded-xl border-slate-200 dark:border-slate-800 focus:ring-purple-500/20 focus:border-purple-500">
                    <SelectValue placeholder="Select Category" />
                  </SelectTrigger>
                  <SelectContent className="max-h-[250px]">
                    {CATEGORIES.map((cat) => (
                      <SelectItem key={cat} value={cat}>
                        {cat}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* URL */}
            <div className="space-y-1.5">
              <Label htmlFor="linkUrl" className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                URL <span className="text-red-500">*</span>
              </Label>
              <Input
                id="linkUrl"
                type="url"
                placeholder="https://example.com/cctv-feed"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                className="rounded-xl border-slate-200 dark:border-slate-800 focus-visible:ring-purple-500"
                required
              />
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <Label htmlFor="linkDesc" className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Short Description
              </Label>
              <textarea
                id="linkDesc"
                rows={2}
                placeholder="Briefly explain what this system or resource is for..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all text-slate-800 dark:text-slate-200"
              />
            </div>

            {/* Icon Picker */}
            <div className="space-y-1.5">
              <Label htmlFor="linkIcon" className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block">
                Select Icon <span className="text-red-500">*</span>
              </Label>
              <Select value={icon} onValueChange={setIcon}>
                <SelectTrigger id="linkIcon" className="w-full rounded-xl border-slate-200 dark:border-slate-800 focus:ring-purple-500/20 focus:border-purple-500">
                  <SelectValue placeholder="Select Icon">
                    <div className="flex items-center gap-2">
                      {renderIcon(icon, "h-4 w-4 text-purple-600 dark:text-purple-400")}
                      <span>{PREDEFINED_ICONS.find(ico => ico.name === icon)?.label || icon}</span>
                    </div>
                  </SelectValue>
                </SelectTrigger>
                <SelectContent className="max-h-[250px]">
                  {PREDEFINED_ICONS.map((ico) => (
                    <SelectItem key={ico.name} value={ico.name}>
                      <div className="flex items-center gap-2">
                        {renderIcon(ico.name, "h-4 w-4 text-purple-600 dark:text-purple-400")}
                        <span>{ico.label}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Display Order */}
              <div className="space-y-1.5">
                <Label htmlFor="linkOrder" className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Display Order
                </Label>
                <Input
                  id="linkOrder"
                  type="number"
                  placeholder="0"
                  value={displayOrder}
                  onChange={(e) => setDisplayOrder(parseInt(e.target.value) || 0)}
                  className="rounded-xl border-slate-200 dark:border-slate-800 focus-visible:ring-purple-500"
                  min="0"
                />
              </div>

              {/* Status */}
              <div className="space-y-1.5">
                <Label htmlFor="linkStatus" className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Status
                </Label>
                <Select value={statusVal} onValueChange={(val) => setStatusVal(val as any)}>
                  <SelectTrigger id="linkStatus" className="w-full rounded-xl border-slate-200 dark:border-slate-800 focus:ring-purple-500/20 focus:border-purple-500">
                    <SelectValue placeholder="Select Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Active">Active</SelectItem>
                    <SelectItem value="Inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <DialogFooter className="pt-4 border-t border-slate-100 dark:border-slate-800 flex flex-row items-center justify-end gap-2 sm:gap-0">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsModalOpen(false)}
                className="rounded-xl border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="bg-purple-600 hover:bg-purple-700 text-white rounded-xl shadow-md"
              >
                {editingLink ? "Save Changes" : "Add Link"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <DialogContent className="sm:max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-red-600" />
              Confirm Delete
            </DialogTitle>
            <DialogDescription className="text-sm text-slate-500 dark:text-slate-400 pt-2">
              Are you sure you want to delete <span className="font-bold text-slate-800 dark:text-slate-200">“{linkToDelete?.name}”</span>?
              This will remove the external link from all dashboard panels, and the action cannot be undone.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="mt-4 gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => setDeleteConfirmOpen(false)}
              className="rounded-xl border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-700 text-white rounded-xl shadow-md"
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
