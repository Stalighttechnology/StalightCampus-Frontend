import React, { useState, useEffect, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "../ui/dialog";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Textarea } from "../ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { Badge } from "../ui/badge";
import { Checkbox } from "../ui/checkbox";
import {
  FilterOptionsResponse,
  AcademicHierarchyResponse,
  TargetGroupPayload,
  createIssuedItem,
  updateIssuedItem,
  fetchAcademicHierarchy,
  previewEligibleCount,
  CollegeIssuedItemData,
} from "../../utils/college_issued_items_api";
import { useToast } from "../../hooks/use-toast";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "../ui/popover";
import { cn } from "@/lib/utils";
import {
  Loader2,
  PackagePlus,
  Layers,
  Plus,
  Trash2,
  CheckCircle2,
  Users,
  AlertCircle,
  HelpCircle,
  ChevronDown,
} from "lucide-react";

interface CreateEditIssueModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  filterOptions: FilterOptionsResponse | null;
  editItem?: CollegeIssuedItemData | null;
}

export const CreateEditIssueModal: React.FC<CreateEditIssueModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  filterOptions,
  editItem = null,
}) => {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hierarchy, setHierarchy] = useState<AcademicHierarchyResponse | null>(null);

  // Form State
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("UNIFORM");
  const [quantity, setQuantity] = useState(1);
  const [issueDate, setIssueDate] = useState(new Date().toISOString().split("T")[0]);
  const [academicYear, setAcademicYear] = useState("");
  const [remarks, setRemarks] = useState("");

  // Row-Based Target Allocation State
  const [targetGroups, setTargetGroups] = useState<TargetGroupPayload[]>([
    {
      id: "group-1",
      batch_id: null,
      branch_id: "ALL",
      semester_id: "ALL",
      section_ids: [],
    },
  ]);

  const [previewCount, setPreviewCount] = useState<number | null>(null);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);

  // Load hierarchy tree on modal open
  useEffect(() => {
    if (isOpen) {
      const loadTree = async () => {
        try {
          const res = await fetchAcademicHierarchy();
          setHierarchy(res);
          // Set first batch as default for group-1 if available
          if (!editItem && res.batches && res.batches.length > 0) {
            setTargetGroups([
              {
                id: "group-1",
                batch_id: res.batches[0].id,
                branch_id: "ALL",
                semester_id: "ALL",
                section_ids: [],
              },
            ]);
          }
        } catch (err) {
          console.error("Error loading hierarchy:", err);
        }
      };
      loadTree();
    }
  }, [isOpen, editItem]);

  useEffect(() => {
    if (editItem) {
      setTitle(editItem.title || "");
      setDescription(editItem.description || "");
      setCategory(editItem.category || "OTHER");
      setQuantity(editItem.quantity || 1);
      setIssueDate(editItem.issue_date || new Date().toISOString().split("T")[0]);
      setAcademicYear(editItem.academic_year || "");
      setRemarks(editItem.remarks || "");
    } else {
      setTitle("");
      setDescription("");
      setCategory("UNIFORM");
      setQuantity(1);
      setIssueDate(new Date().toISOString().split("T")[0]);
      setAcademicYear("");
      setRemarks("");
      setPreviewCount(null);
    }
  }, [editItem, isOpen]);

  // Dynamic Live Eligible Count Preview Debounced
  useEffect(() => {
    if (editItem || !isOpen) return;

    const validGroups = targetGroups.filter((g) => g.batch_id !== null);
    if (validGroups.length === 0) {
      setPreviewCount(0);
      return;
    }

    const timer = setTimeout(async () => {
      setIsPreviewLoading(true);
      try {
        const payload = validGroups.map((g) => ({
          batch_id: g.batch_id!,
          branch_id: g.branch_id === "ALL" ? null : g.branch_id,
          semester_id: g.semester_id === "ALL" ? null : g.semester_id,
          section_ids: g.section_ids,
        }));
        const count = await previewEligibleCount(payload);
        setPreviewCount(count);
      } catch (err) {
        console.error("Preview count error:", err);
      } finally {
        setIsPreviewLoading(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [targetGroups, editItem, isOpen]);

  // Target Row Management
  const addTargetGroup = () => {
    const firstBatchId = hierarchy?.batches && hierarchy.batches.length > 0 ? hierarchy.batches[0].id : null;
    const newGroup: TargetGroupPayload = {
      id: `group-${Date.now()}`,
      batch_id: firstBatchId,
      branch_id: "ALL",
      semester_id: "ALL",
      section_ids: [],
    };
    setTargetGroups([...targetGroups, newGroup]);
  };

  const removeTargetGroup = (groupId: string) => {
    if (targetGroups.length <= 1) return;
    setTargetGroups(targetGroups.filter((g) => g.id !== groupId));
  };

  const updateGroup = (groupId: string, updates: Partial<TargetGroupPayload>) => {
    setTargetGroups((prev) =>
      prev.map((g) => {
        if (g.id !== groupId) return g;
        const updated = { ...g, ...updates };

        // When batch changes:
        if (updates.batch_id !== undefined && updates.batch_id !== g.batch_id) {
          updated.section_ids = [];
          const matchDist = hierarchy?.student_distribution?.find(
            (d) => d.batch_id === updated.batch_id && (updated.branch_id === "ALL" || d.branch_id === updated.branch_id)
          );
          if (matchDist && matchDist.semester_id) {
            updated.semester_id = matchDist.semester_id;
          } else if (updated.branch_id && updated.branch_id !== "ALL") {
            const branchSems = hierarchy?.semesters.filter((s) => s.branch_id === updated.branch_id) || [];
            if (branchSems.length > 0) {
              updated.semester_id = branchSems[0].id;
            }
          }
        }

        // When branch changes:
        if (updates.branch_id !== undefined && updates.branch_id !== g.branch_id) {
          updated.section_ids = [];
          const matchDist = hierarchy?.student_distribution?.find(
            (d) => d.batch_id === updated.batch_id && (updates.branch_id === "ALL" || d.branch_id === updates.branch_id)
          );
          if (matchDist && matchDist.semester_id) {
            updated.semester_id = matchDist.semester_id;
          } else if (updates.branch_id !== "ALL") {
            const branchSems = hierarchy?.semesters.filter((s) => s.branch_id === updates.branch_id) || [];
            if (branchSems.length > 0) {
              updated.semester_id = branchSems[0].id;
            } else {
              updated.semester_id = "ALL";
            }
          } else {
            updated.semester_id = "ALL";
          }
        }

        // Reset sections if semester explicitly changed
        if (updates.semester_id !== undefined && updates.semester_id !== g.semester_id) {
          updated.section_ids = [];
        }

        return updated;
      })
    );
  };

  const toggleSectionInGroup = (groupId: string, sectionId: number) => {
    setTargetGroups((prev) =>
      prev.map((g) => {
        if (g.id !== groupId) return g;
        const currentSecs = g.section_ids || [];
        const nextSecs = currentSecs.includes(sectionId)
          ? currentSecs.filter((s) => s !== sectionId)
          : [...currentSecs, sectionId];
        return { ...g, section_ids: nextSecs };
      })
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      toast({ title: "Validation Error", description: "Item/Issue name is required.", variant: "destructive" });
      return;
    }

    if (!editItem) {
      const validGroups = targetGroups.filter((g) => g.batch_id !== null);
      if (validGroups.length === 0) {
        toast({ title: "Validation Error", description: "Please select at least one Batch in the target rules.", variant: "destructive" });
        return;
      }
    }

    setIsSubmitting(true);
    try {
      if (editItem) {
        await updateIssuedItem(editItem.id, {
          title,
          description,
          category,
          quantity,
          issue_date: issueDate,
          academic_year: academicYear,
          remarks,
        });
        toast({ title: "Success", description: "Issue updated successfully." });
      } else {
        const payloadGroups = targetGroups
          .filter((g) => g.batch_id !== null)
          .map((g) => ({
            batch_id: g.batch_id!,
            branch_id: g.branch_id === "ALL" ? null : g.branch_id,
            semester_id: g.semester_id === "ALL" ? null : g.semester_id,
            section_ids: g.section_ids,
          }));

        const res = await createIssuedItem({
          title,
          description,
          category,
          quantity,
          issue_date: issueDate,
          academic_year: academicYear,
          remarks,
          target_groups: payloadGroups,
        });
        toast({
          title: "Distribution Created",
          description: `Issue created! ${res.eligible_count || 0} student(s) enrolled for distribution.`,
        });
      }
      onSuccess();
      onClose();
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message || "Failed to save issue.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[92vh] overflow-y-auto p-4 sm:p-6 rounded-2xl">
        <DialogHeader>
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-primary/10 text-primary rounded-xl shrink-0">
              <PackagePlus className="w-6 h-6" />
            </div>
            <div>
              <DialogTitle className="text-xl sm:text-2xl font-bold">
                {editItem ? "Edit Issued Item Details" : "Create New College-Issued Item Distribution"}
              </DialogTitle>
              <DialogDescription className="text-xs sm:text-sm text-muted-foreground">
                {editItem
                  ? "Update item details and distribution instructions."
                  : "Specify item provisions and define structured target classes per batch."}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6 pt-2">
          {/* Basic Item Info Card */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border border-border rounded-xl p-4 bg-card shadow-sm">
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="item-title" className="font-semibold text-sm">
                Item / Issue Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="item-title"
                placeholder="e.g. College Uniform Set 2026, Semester 4 Lab Kit, Govt. Scholarship Books"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                className="h-10 text-sm"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="category" className="font-semibold text-sm">
                Category
              </Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger id="category" className="h-10 text-sm">
                  <SelectValue placeholder="Select Category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="UNIFORM">Uniform</SelectItem>
                  <SelectItem value="BOOKS">Textbooks & Study Material</SelectItem>
                  <SelectItem value="EQUIPMENT">Equipment & Instruments</SelectItem>
                  <SelectItem value="KIT">Lab / Workshop Kit</SelectItem>
                  <SelectItem value="SCHOLARSHIP">Scholarship / Materials</SelectItem>
                  <SelectItem value="OTHER">Other Student Provision</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="quantity" className="font-semibold text-sm">
                Quantity (per student)
              </Label>
              <Input
                id="quantity"
                type="number"
                min="1"
                value={quantity}
                onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                className="h-10 text-sm"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="issue-date" className="font-semibold text-sm">
                Issue / Distribution Date
              </Label>
              <Input
                id="issue-date"
                type="date"
                value={issueDate}
                onChange={(e) => setIssueDate(e.target.value)}
                className="h-10 text-sm"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="academic-year" className="font-semibold text-sm">
                Academic Year (Optional)
              </Label>
              <Input
                id="academic-year"
                placeholder="e.g. 2026-2027"
                value={academicYear}
                onChange={(e) => setAcademicYear(e.target.value)}
                className="h-10 text-sm"
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="description" className="font-semibold text-sm">
                Description & Collection Instructions
              </Label>
              <Textarea
                id="description"
                placeholder="Provide details of items included, collection venue, distribution schedule, or student guidelines..."
                rows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="text-sm"
              />
            </div>
          </div>

          {/* Structured Target Rules Builder (Row-by-Row) */}
          {!editItem ? (
            <div className="space-y-4 border border-border rounded-xl p-4 sm:p-5 bg-muted/20">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-border">
                <div className="flex items-center gap-2">
                  <Layers className="w-5 h-5 text-primary" />
                  <div>
                    <h3 className="font-bold text-base text-foreground">Target Student Eligibility</h3>
                    <p className="text-xs text-muted-foreground">
                      Select batch first, then select branch, corresponding semester, and specific sections.
                    </p>
                  </div>
                </div>

                {previewCount !== null && (
                  <Badge
                    variant="outline"
                    className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-300 dark:border-emerald-800 text-xs py-1 px-3 font-semibold self-start sm:self-auto flex items-center gap-1.5"
                  >
                    {isPreviewLoading ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Users className="w-3.5 h-3.5" />
                    )}
                    <span>{previewCount} Student{previewCount === 1 ? "" : "s"} Eligible</span>
                  </Badge>
                )}
              </div>

              {/* Rows List */}
              <div className="space-y-4 pt-1">
                {targetGroups.map((group, index) => {
                  const selectedBatch = hierarchy?.batches.find((b) => b.id === group.batch_id);

                  // Filter branches: all active branches
                  const availableBranches = hierarchy?.branches || [];

                  // Active current semester for this batch & branch (cohort-locked to single current semester)
                  const availableSemesters = (() => {
                    if (!hierarchy?.semesters) return [];
                    if (!group.batch_id) return [];

                    const distMatches =
                      hierarchy.student_distribution?.filter((d) => {
                        if (d.batch_id !== group.batch_id) return false;
                        if (group.branch_id && group.branch_id !== "ALL" && d.branch_id !== group.branch_id)
                          return false;
                        return true;
                      }) || [];

                    if (distMatches.length > 0) {
                      // Lock to the single primary cohort semester
                      const primarySemId = distMatches[0].semester_id;
                      return hierarchy.semesters.filter((s) => s.id === primarySemId);
                    }

                    // Fallback for batches without student records yet: default to Semester 1 for the branch
                    if (group.branch_id && group.branch_id !== "ALL") {
                      const branchSems = hierarchy.semesters.filter((s) => s.branch_id === group.branch_id);
                      return branchSems.length > 0 ? [branchSems[0]] : [];
                    }

                    return [];
                  })();

                  // Filter sections: strictly for the current semester of this batch & branch
                  const availableSections = (() => {
                    if (!hierarchy?.sections) return [];
                    if (!group.batch_id) return [];

                    const targetSemId =
                      group.semester_id && group.semester_id !== "ALL"
                        ? group.semester_id
                        : availableSemesters.length > 0
                        ? availableSemesters[0].id
                        : null;

                    if (targetSemId) {
                      return hierarchy.sections.filter(
                        (s) =>
                          (!group.branch_id || group.branch_id === "ALL" || s.branch_id === group.branch_id) &&
                          s.semester_id === targetSemId
                      );
                    }

                    return [];
                  })();

                  return (
                    <div
                      key={group.id}
                      className="p-4 rounded-xl border border-border bg-card shadow-sm space-y-3 relative group"
                    >
                      <div className="flex items-center justify-between pb-2 border-b border-border/60">
                        <div className="flex items-center gap-2">
                          <span className="w-5 h-5 rounded-full bg-primary/10 text-primary font-bold text-xs flex items-center justify-center">
                            {index + 1}
                          </span>
                          <span className="font-semibold text-xs text-foreground uppercase tracking-wider">
                            Target Rule #{index + 1}
                          </span>
                        </div>

                        {targetGroups.length > 1 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0 text-destructive hover:bg-destructive/10"
                            onClick={() => removeTargetGroup(group.id)}
                            title="Remove this target rule"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        )}
                      </div>

                      {/* 4-Step Cascading Dropdowns */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                        {/* 1. Batch Dropdown */}
                        <div className="space-y-1.5">
                          <Label className="text-xs font-medium text-muted-foreground">
                            1. Select Batch <span className="text-destructive">*</span>
                          </Label>
                          <Select
                            value={group.batch_id ? group.batch_id.toString() : ""}
                            onValueChange={(val) =>
                              updateGroup(group.id, { batch_id: parseInt(val) || null })
                            }
                          >
                            <SelectTrigger className="h-9 text-xs">
                              <SelectValue placeholder="Choose Batch" />
                            </SelectTrigger>
                            <SelectContent>
                              {hierarchy?.batches.map((b) => (
                                <SelectItem key={b.id} value={b.id.toString()}>
                                  {b.name.replace(/\s*\(\d{4}[–-]\d{4}\)/g, '').trim()}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        {/* 2. Branch Dropdown */}
                        <div className="space-y-1.5">
                          <Label className="text-xs font-medium text-muted-foreground">
                            2. Select Branch
                          </Label>
                          <Select
                            value={group.branch_id ? group.branch_id.toString() : "ALL"}
                            onValueChange={(val) =>
                              updateGroup(group.id, {
                                branch_id: val === "ALL" ? "ALL" : parseInt(val) || "ALL",
                              })
                            }
                            disabled={!group.batch_id}
                          >
                            <SelectTrigger className="h-9 text-xs">
                              <SelectValue placeholder="All Branches" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="ALL">All Branches</SelectItem>
                              {availableBranches.map((br) => (
                                <SelectItem key={br.id} value={br.id.toString()}>
                                  {br.name} {br.branch_code ? `(${br.branch_code})` : ""}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        {/* 3. Semester Dropdown */}
                        <div className="space-y-1.5">
                          <Label className="text-xs font-medium text-muted-foreground">
                            3. Select Semester
                          </Label>
                          <Select
                            value={group.semester_id ? group.semester_id.toString() : "ALL"}
                            onValueChange={(val) =>
                              updateGroup(group.id, {
                                semester_id: val === "ALL" ? "ALL" : parseInt(val) || "ALL",
                              })
                            }
                            disabled={!group.batch_id}
                          >
                            <SelectTrigger className="h-9 text-xs">
                              <SelectValue placeholder="All Semesters" />
                            </SelectTrigger>
                            <SelectContent>
                              {availableSemesters.length === 0 && (
                                <SelectItem value="ALL">All Semesters</SelectItem>
                              )}
                              {availableSemesters.length > 1 && (
                                <SelectItem value="ALL">All Semesters</SelectItem>
                              )}
                              {availableSemesters.map((s) => (
                                <SelectItem key={s.id} value={s.id.toString()}>
                                  Semester {s.number}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        {/* 4. Sections Dropdown (Unified Theme matching Batch & Branch) */}
                        <div className="space-y-1.5">
                          <Label className="text-xs font-medium text-muted-foreground">
                            4. Sections
                          </Label>
                          <Popover>
                            <PopoverTrigger asChild>
                              <button
                                type="button"
                                disabled={!group.batch_id}
                                className={cn(
                                  "flex h-9 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-xs ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 transition-colors",
                                  !group.batch_id && "cursor-not-allowed opacity-50 bg-muted/40"
                                )}
                              >
                                <span className="truncate text-foreground">
                                  {group.section_ids.length === 0
                                    ? "All Sections"
                                    : group.section_ids.length === 1
                                    ? `Sec ${availableSections.find((s) => s.id === group.section_ids[0])?.name.replace(/^(Section|Sec)\s*/i, '').trim() || group.section_ids[0]}`
                                    : group.section_ids.length <= 2
                                    ? group.section_ids
                                        .map((id) => `Sec ${availableSections.find((s) => s.id === id)?.name.replace(/^(Section|Sec)\s*/i, '').trim() || id}`)
                                        .join(", ")
                                    : `${group.section_ids.length} Sections Selected`}
                                </span>
                                <ChevronDown className="h-3.5 w-3.5 opacity-50 shrink-0 ml-1" />
                              </button>
                            </PopoverTrigger>
                            <PopoverContent className="w-56 p-1.5 space-y-1 text-xs" align="start">
                              <div
                                onClick={() => updateGroup(group.id, { section_ids: [] })}
                                className={cn(
                                  "flex items-center gap-2 px-2.5 py-1.5 rounded-md cursor-pointer hover:bg-muted font-medium transition-colors select-none",
                                  group.section_ids.length === 0 ? "bg-primary/10 text-primary font-bold" : "text-foreground"
                                )}
                              >
                                <Checkbox
                                  checked={group.section_ids.length === 0}
                                  onCheckedChange={() => updateGroup(group.id, { section_ids: [] })}
                                />
                                <span>All Sections</span>
                              </div>
                              <div className="h-[1px] bg-border my-1" />
                              <div className="max-h-48 overflow-y-auto space-y-0.5 pr-0.5">
                                {availableSections.map((sec) => {
                                  const isChecked = group.section_ids.includes(sec.id);
                                  const cleanSec = sec.name.replace(/^(Section|Sec)\s*/i, '').trim();
                                  return (
                                    <div
                                      key={sec.id}
                                      onClick={() => toggleSectionInGroup(group.id, sec.id)}
                                      className={cn(
                                        "flex items-center gap-2 px-2.5 py-1.5 rounded-md cursor-pointer hover:bg-muted transition-colors select-none",
                                        isChecked ? "bg-primary/10 text-primary font-semibold" : "text-foreground"
                                      )}
                                    >
                                      <Checkbox
                                        checked={isChecked}
                                        onCheckedChange={() => toggleSectionInGroup(group.id, sec.id)}
                                      />
                                      <span>Sec {cleanSec}</span>
                                    </div>
                                  );
                                })}
                                {availableSections.length === 0 && (
                                  <div className="text-center py-2 text-muted-foreground text-[11px]">
                                    No sections found for this branch & semester.
                                  </div>
                                )}
                              </div>
                            </PopoverContent>
                          </Popover>
                        </div>
                      </div>
                    </div>
                  );
                })}

                {/* Add Target Rule Button */}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addTargetGroup}
                  className="w-full h-10 border-dashed border-primary/40 text-primary hover:bg-primary/5 flex items-center justify-center gap-2 font-semibold text-xs rounded-xl"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add Another Target Batch / Class</span>
                </Button>
              </div>
            </div>
          ) : (
            <div className="p-3 bg-muted/30 rounded-lg text-xs text-muted-foreground border border-border">
              Target classes (batches, branches, semesters, sections) cannot be modified after creation to preserve
              student distribution integrity.
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="remarks" className="font-semibold text-sm">
              Remarks / Budget / Scheme Note (Optional)
            </Label>
            <Input
              id="remarks"
              placeholder="e.g. Budget source, Government grant ID, Vendor invoice number..."
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              className="h-10 text-sm"
            />
          </div>

          <DialogFooter className="flex items-center justify-between gap-3 pt-3 border-t border-border">
            <div className="text-xs text-muted-foreground font-medium">
              {previewCount !== null && (
                <span>
                  Estimated recipients: <strong className="text-foreground">{previewCount}</strong> students
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting} className="min-w-[140px]">
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : editItem ? (
                  "Save Changes"
                ) : (
                  "Create Distribution"
                )}
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default CreateEditIssueModal;
