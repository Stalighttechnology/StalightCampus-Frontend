import React, { useState, useEffect } from "react";
import { useToast } from "../../hooks/use-toast";
import { useTheme } from "../../context/ThemeContext";
import { externalLinksApi, ExternalLink } from "../../api/external_links_api";
import {
  Camera, Fingerprint, Globe, BookOpen, FileSpreadsheet, Shield, Bus, DollarSign, Building, Link,
  Plus, Edit2, Trash2, ExternalLink as ExternalLinkIcon, Search, Loader2, AlertCircle
} from "lucide-react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "../ui/card";
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
import Swal from "sweetalert2";

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
  const { theme } = useTheme();
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

  const handleDelete = async (link: ExternalLink) => {
    const currentTheme = theme === 'dark' ? 'dark' : 'light';
    const result = await Swal.fire({
      title: "Delete Link",
      text: `Are you sure you want to delete "${link.name}"? This action cannot be undone.`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#ef4444",
      cancelButtonColor: "#64748b",
      confirmButtonText: "Yes, delete it",
      background: currentTheme === "dark" ? "#1f2937" : "#ffffff",
      color: currentTheme === "dark" ? "#ffffff" : "#000000",
    });

    if (!result.isConfirmed) return;

    try {
      const response = await externalLinksApi.deleteExternalLink(link.id);
      if (response.success) {
        toast({
          title: "Success",
          description: "External link deleted successfully."
        });
        fetchLinks();
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

  const renderIcon = (iconName: string, className = "h-5 w-5") => {
    const IconComponent = ICON_MAP[iconName] || Link;
    return <IconComponent className={className} />;
  };

  return (
    <div className={`w-full text-sm sm:text-base ${theme === 'dark' ? 'bg-background text-foreground' : 'bg-gray-50 text-gray-900'}`}>
      <Card className={theme === 'dark' ? 'w-full bg-card border border-border shadow-sm flex flex-col' : 'w-full bg-white border border-gray-200 shadow-sm flex flex-col'}>
        {/* Header section */}
        <CardHeader className="border-b border-border/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 sm:p-6">
          <div>
            <div className="flex items-center gap-3">
              <CardTitle className="text-xl sm:text-2xl font-semibold">External Links</CardTitle>
              {links.length > 0 && (
                <span className={`text-xs font-medium px-2.5 py-0.5 rounded-full ${theme === 'dark' ? 'bg-primary/10 text-primary' : 'bg-blue-100 text-blue-800'}`}>
                  Total: {links.length}
                </span>
              )}
            </div>
            <CardDescription className="text-sm text-muted-foreground mt-1">
              Access and manage important external systems and institutional resources from one place.
            </CardDescription>
          </div>

          {isAdmin && (
            <Button
              onClick={openAddModal}
              size="sm"
              className="flex items-center justify-center gap-1.5 w-full sm:w-auto text-xs sm:text-sm font-medium whitespace-nowrap bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm"
            >
              <Plus className="w-4 h-4 shrink-0" />
              <span>Add External Link</span>
            </Button>
          )}
        </CardHeader>

        {/* Search and Filters */}
        <div className="px-4 py-3 sm:px-6 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 border-b border-border/40">
          <div className="relative flex-1 sm:max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search external links by name or description..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={`pl-9 pr-12 h-9 text-sm ${theme === 'dark' ? 'bg-card text-foreground border-border' : 'bg-white text-gray-900 border-gray-300'}`}
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-primary hover:text-primary/80 transition-colors"
              >
                Clear
              </button>
            )}
          </div>

          <div className="w-full sm:w-[200px]">
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className={`h-9 text-sm ${theme === 'dark' ? 'bg-card text-foreground border-border' : 'bg-white text-gray-900 border-gray-300'}`}>
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent className={theme === 'dark' ? 'bg-card text-foreground border-border max-h-[250px]' : 'bg-white text-gray-900 border-gray-300 max-h-[250px]'}>
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

        {/* Content section */}
        <CardContent className="p-4 sm:p-6 min-h-[350px]">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-muted-foreground text-sm">Fetching your institutional links...</p>
            </div>
          ) : filteredLinks.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-8 sm:p-12 text-center border-dashed border-2 border-border/60 bg-muted/10 rounded-xl my-4">
              <div className="p-4 bg-muted text-muted-foreground rounded-full mb-3">
                <Link className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-lg font-semibold text-foreground">
                {searchTerm || selectedCategory !== "All" ? "No matches found" : "No External Links Added"}
              </h3>
              <p className="text-sm text-muted-foreground max-w-md mt-1.5">
                {searchTerm || selectedCategory !== "All"
                  ? "Try adjusting your search query or selecting a different category filter."
                  : "Connect your institution's important external systems and access them directly from your Principal Dashboard."}
              </p>
              {isAdmin && !searchTerm && selectedCategory === "All" && (
                <Button
                  onClick={openAddModal}
                  size="sm"
                  className="mt-5 bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm flex items-center gap-2"
                >
                  <Plus className="h-4 w-4" />
                  <span>Add External Link</span>
                </Button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredLinks.map((link) => (
                <Card
                  key={link.id}
                  className={`group overflow-hidden rounded-xl border transition-all duration-200 flex flex-col justify-between hover:shadow-md ${
                    theme === 'dark'
                      ? 'bg-card border-border hover:border-primary/50'
                      : 'bg-white border-gray-200 hover:border-primary/40'
                  }`}
                >
                  <div className="p-5">
                    {/* Badge row & Admin controls */}
                    <div className="flex items-center justify-between gap-3 mb-3">
                      <span className={`px-2.5 py-0.5 text-xs font-medium rounded-full ${
                        theme === 'dark'
                          ? 'bg-primary/15 text-primary border border-primary/20'
                          : 'bg-blue-50 text-blue-700 border border-blue-200'
                      }`}>
                        {link.category}
                      </span>

                      <div className="flex items-center gap-1">
                        {link.status === "Inactive" && (
                          <span className="bg-muted text-muted-foreground border border-border px-2 py-0.5 text-[10px] font-medium rounded-md">
                            Inactive
                          </span>
                        )}

                        {isAdmin && (
                          <div className="flex items-center gap-0.5 opacity-90 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => openEditModal(link)}
                              className="h-7 w-7 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-md"
                              title="Edit link"
                            >
                              <Edit2 className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDelete(link)}
                              className="h-7 w-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-md"
                              title="Delete link"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Card Title & Icon */}
                    <div className="flex items-start gap-3 mb-2.5">
                      <div className="p-2.5 rounded-lg bg-primary/10 text-primary shrink-0">
                        {renderIcon(link.icon, "h-5 w-5")}
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="font-semibold text-foreground text-base group-hover:text-primary transition-colors truncate">
                          {link.name}
                        </h3>
                        <span className="text-xs text-muted-foreground select-all block truncate mt-0.5" title={link.url}>
                          {link.url.replace(/^https?:\/\/(www\.)?/, "")}
                        </span>
                      </div>
                    </div>

                    {/* Description */}
                    <p className="text-muted-foreground text-sm leading-relaxed min-h-[40px] line-clamp-2 mt-2">
                      {link.description || "No description provided."}
                    </p>
                  </div>

                  {/* Action row */}
                  <div className="px-5 py-3 bg-muted/20 border-t border-border/40 flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">
                      Order: {link.display_order ?? 0}
                    </span>

                    <a
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:underline transition-colors"
                    >
                      Open
                      <ExternalLinkIcon className="h-3.5 w-3.5" />
                    </a>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add / Edit Dialog */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className={`sm:max-w-lg w-[95%] max-h-[85vh] overflow-y-auto rounded-xl p-4 sm:p-6 ${
          theme === 'dark' ? 'bg-card text-foreground border-border' : 'bg-white text-gray-900 border-gray-200'
        }`}>
          <DialogHeader className="pb-3 border-b border-border/50">
            <DialogTitle className="text-lg font-semibold">
              {editingLink ? "Edit External Link" : "Add External Link"}
            </DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground">
              Provide the details below to configure this institutional resource.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSave} className="space-y-4 pt-4">
            {validationError && (
              <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-destructive text-xs flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{validationError}</span>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Name */}
              <div className="space-y-1.5">
                <Label htmlFor="linkName" className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Link Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="linkName"
                  placeholder="e.g. CCTV Monitoring"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className={`h-9 text-sm ${theme === 'dark' ? 'bg-card text-foreground border-border' : 'bg-white text-gray-900 border-gray-300'}`}
                  required
                />
              </div>

              {/* Category */}
              <div className="space-y-1.5">
                <Label htmlFor="linkCategory" className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Category <span className="text-destructive">*</span>
                </Label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger id="linkCategory" className={`h-9 text-sm ${theme === 'dark' ? 'bg-card text-foreground border-border' : 'bg-white text-gray-900 border-gray-300'}`}>
                    <SelectValue placeholder="Select Category" />
                  </SelectTrigger>
                  <SelectContent className={theme === 'dark' ? 'bg-card text-foreground border-border max-h-[250px]' : 'bg-white text-gray-900 border-gray-300 max-h-[250px]'}>
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
              <Label htmlFor="linkUrl" className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                URL <span className="text-destructive">*</span>
              </Label>
              <Input
                id="linkUrl"
                type="url"
                placeholder="https://example.com/cctv-feed"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                className={`h-9 text-sm ${theme === 'dark' ? 'bg-card text-foreground border-border' : 'bg-white text-gray-900 border-gray-300'}`}
                required
              />
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <Label htmlFor="linkDesc" className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Short Description
              </Label>
              <textarea
                id="linkDesc"
                rows={2}
                placeholder="Briefly explain what this system or resource is for..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className={`w-full p-2.5 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all ${
                  theme === 'dark'
                    ? 'bg-card text-foreground border-border placeholder:text-muted-foreground'
                    : 'bg-white text-gray-900 border-gray-300 placeholder:text-gray-400'
                }`}
              />
            </div>

            {/* Icon Picker */}
            <div className="space-y-1.5">
              <Label htmlFor="linkIcon" className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block">
                Select Icon <span className="text-destructive">*</span>
              </Label>
              <Select value={icon} onValueChange={setIcon}>
                <SelectTrigger id="linkIcon" className={`h-9 text-sm ${theme === 'dark' ? 'bg-card text-foreground border-border' : 'bg-white text-gray-900 border-gray-300'}`}>
                  <SelectValue placeholder="Select Icon">
                    <div className="flex items-center gap-2">
                      {renderIcon(icon, "h-4 w-4 text-primary")}
                      <span>{PREDEFINED_ICONS.find(ico => ico.name === icon)?.label || icon}</span>
                    </div>
                  </SelectValue>
                </SelectTrigger>
                <SelectContent className={theme === 'dark' ? 'bg-card text-foreground border-border max-h-[250px]' : 'bg-white text-gray-900 border-gray-300 max-h-[250px]'}>
                  {PREDEFINED_ICONS.map((ico) => (
                    <SelectItem key={ico.name} value={ico.name}>
                      <div className="flex items-center gap-2">
                        {renderIcon(ico.name, "h-4 w-4 text-primary")}
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
                <Label htmlFor="linkOrder" className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Display Order
                </Label>
                <Input
                  id="linkOrder"
                  type="number"
                  placeholder="0"
                  value={displayOrder}
                  onChange={(e) => setDisplayOrder(parseInt(e.target.value) || 0)}
                  className={`h-9 text-sm ${theme === 'dark' ? 'bg-card text-foreground border-border' : 'bg-white text-gray-900 border-gray-300'}`}
                  min="0"
                />
              </div>

              {/* Status */}
              <div className="space-y-1.5">
                <Label htmlFor="linkStatus" className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Status
                </Label>
                <Select value={statusVal} onValueChange={(val) => setStatusVal(val as any)}>
                  <SelectTrigger id="linkStatus" className={`h-9 text-sm ${theme === 'dark' ? 'bg-card text-foreground border-border' : 'bg-white text-gray-900 border-gray-300'}`}>
                    <SelectValue placeholder="Select Status" />
                  </SelectTrigger>
                  <SelectContent className={theme === 'dark' ? 'bg-card text-foreground border-border' : 'bg-white text-gray-900 border-gray-300'}>
                    <SelectItem value="Active">Active</SelectItem>
                    <SelectItem value="Inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <DialogFooter className="pt-4 border-t border-border/50 flex flex-row items-center justify-end gap-2 sm:gap-0">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsModalOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="bg-primary hover:bg-primary/90 text-primary-foreground"
              >
                {editingLink ? "Save Changes" : "Add Link"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
