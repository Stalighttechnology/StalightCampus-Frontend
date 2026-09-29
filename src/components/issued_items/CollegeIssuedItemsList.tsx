import React, { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Badge } from "../ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "../ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import {
  fetchIssuedItemsList,
  fetchFilterOptions,
  deleteIssuedItem,
  CollegeIssuedItemData,
  FilterOptionsResponse,
  SummaryMetrics,
  PaginatedResponse,
} from "../../utils/college_issued_items_api";
import { CreateEditIssueModal } from "./CreateEditIssueModal";
import { IssuedStudentsDrawer } from "./IssuedStudentsDrawer";
import { useToast } from "../../hooks/use-toast";
import { useTheme } from "../../context/ThemeContext";
import { cn } from "@/lib/utils";
import {
  Package,
  PackagePlus,
  Search,
  Users,
  CheckCircle2,
  Clock,
  Edit2,
  Trash2,
  Layers,
  Calendar,
  AlertCircle,
  Loader2,
  Filter,
  Eye,
  Gift,
  BookOpen,
  Shirt,
  Wrench,
  GraduationCap,
  Sparkles,
  CheckCheck,
} from "lucide-react";

interface CollegeIssuedItemsListProps {
  userRole: string;
  readOnly?: boolean;
}

const getCategoryBadge = (category: string) => {
  switch (category) {
    case "UNIFORM":
      return {
        label: "Uniform",
        icon: <Shirt className="w-3 h-3 mr-1" />,
        className: "bg-purple-100 text-purple-800 dark:bg-purple-950/50 dark:text-purple-300 border-purple-300 dark:border-purple-800",
      };
    case "BOOKS":
      return {
        label: "Textbooks & Study Material",
        icon: <BookOpen className="w-3 h-3 mr-1" />,
        className: "bg-blue-100 text-blue-800 dark:bg-blue-950/50 dark:text-blue-300 border-blue-300 dark:border-blue-800",
      };
    case "EQUIPMENT":
      return {
        label: "Equipment & Instruments",
        icon: <Wrench className="w-3 h-3 mr-1" />,
        className: "bg-indigo-100 text-indigo-800 dark:bg-indigo-950/50 dark:text-indigo-300 border-indigo-300 dark:border-indigo-800",
      };
    case "KIT":
      return {
        label: "Lab / Workshop Kit",
        icon: <Package className="w-3 h-3 mr-1" />,
        className: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800",
      };
    case "SCHOLARSHIP":
      return {
        label: "Scholarship / Materials",
        icon: <GraduationCap className="w-3 h-3 mr-1" />,
        className: "bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300 border-amber-300 dark:border-amber-800",
      };
    default:
      return {
        label: "College Provision",
        icon: <Gift className="w-3 h-3 mr-1" />,
        className: "bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200 border-slate-300 dark:border-slate-700",
      };
  }
};

export const CollegeIssuedItemsList: React.FC<CollegeIssuedItemsListProps> = ({
  userRole,
  readOnly = false,
}) => {
  const { toast } = useToast();
  const { theme } = useTheme();

  const [activeTab, setActiveTab] = useState<"active" | "all">("active");
  const [data, setData] = useState<PaginatedResponse<CollegeIssuedItemData>>({
    count: 0,
    page: 1,
    page_size: 10,
    total_pages: 1,
    next: null,
    previous: null,
    results: [],
  });

  const [filterOptions, setFilterOptions] = useState<FilterOptionsResponse | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("ALL");
  const [batchFilter, setBatchFilter] = useState("ALL");
  const [branchFilter, setBranchFilter] = useState("ALL");
  const [isLoading, setIsLoading] = useState(false);

  // Modals state
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<CollegeIssuedItemData | null>(null);
  const [viewingDetailItem, setViewingDetailItem] = useState<CollegeIssuedItemData | null>(null);

  // Drawer state for students
  const [studentsDrawerOpen, setStudentsDrawerOpen] = useState(false);
  const [selectedItemForStudents, setSelectedItemForStudents] = useState<CollegeIssuedItemData | null>(null);

  // Load filter options on mount
  useEffect(() => {
    const loadFilters = async () => {
      try {
        const opts = await fetchFilterOptions();
        setFilterOptions(opts);
      } catch (err) {
        console.error("Error loading filter options:", err);
      }
    };
    loadFilters();
  }, []);

  const loadItems = useCallback(
    async (page: number) => {
      setIsLoading(true);
      try {
        const res = await fetchIssuedItemsList({
          page,
          page_size: 10,
          search: search.trim() || undefined,
          category: categoryFilter !== "ALL" ? categoryFilter : undefined,
          status: activeTab === "active" ? "ACTIVE" : undefined,
          batch_id: batchFilter !== "ALL" ? batchFilter : undefined,
          branch_id: branchFilter !== "ALL" ? branchFilter : undefined,
        });
        setData(res);
        setCurrentPage(page);
      } catch (err: any) {
        toast({
          title: "Error",
          description: err.message || "Failed to load issued items.",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    },
    [search, categoryFilter, activeTab, batchFilter, branchFilter, toast]
  );

  useEffect(() => {
    loadItems(1);
  }, [loadItems]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadItems(1);
  };

  const handleDelete = async (id: number, title: string) => {
    if (!window.confirm(`Are you sure you want to delete "${title}"? All associated student records will also be removed.`)) {
      return;
    }

    try {
      await deleteIssuedItem(id);
      toast({ title: "Deleted", description: "Issue distribution deleted successfully." });
      loadItems(currentPage);
    } catch (err: any) {
      toast({
        title: "Delete Failed",
        description: err.message || "Failed to delete issue.",
        variant: "destructive",
      });
    }
  };

  const metrics: SummaryMetrics = data.summary_metrics || {
    total_distributions: data.count,
    total_eligible: 0,
    total_issued: 0,
    total_pending_confirmation: 0,
    total_confirmed: 0,
  };

  const canManage = !readOnly && ["counsellor", "org_admin", "principal", "dean", "admin", "superadmin"].includes(userRole);

  return (
    <div className="space-y-6 pb-12">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-border">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
            College-Issued Items Management
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
            Track and verify items, kits, and provisions distributed to students free of cost.
          </p>
        </div>

        {canManage && (
          <Button
            onClick={() => {
              setEditingItem(null);
              setCreateModalOpen(true);
            }}
            className="shadow-sm flex items-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold px-4 h-10 rounded-xl"
          >
            <PackagePlus className="w-4 h-4" />
            <span>Create New Issue</span>
          </Button>
        )}
      </div>

      {/* KPI Overview Cards Grid (Announcement Theme) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
        <Card className="border border-border shadow-sm rounded-xl overflow-hidden bg-card/80 backdrop-blur hover:border-primary/40 transition-colors">
          <CardContent className="p-4 space-y-1">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-xs font-semibold uppercase tracking-wider">Total Issues</span>
              <Package className="w-4 h-4 text-primary" />
            </div>
            <div className="text-2xl font-bold text-foreground">{metrics.total_distributions}</div>
            <p className="text-[11px] text-muted-foreground">Active distributions</p>
          </CardContent>
        </Card>

        <Card className="border border-border shadow-sm rounded-xl overflow-hidden bg-card/80 backdrop-blur hover:border-blue-400/40 transition-colors">
          <CardContent className="p-4 space-y-1">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-xs font-semibold uppercase tracking-wider">Total Eligible</span>
              <Users className="w-4 h-4 text-blue-500" />
            </div>
            <div className="text-2xl font-bold text-foreground">{metrics.total_eligible}</div>
            <p className="text-[11px] text-muted-foreground">Student allocations</p>
          </CardContent>
        </Card>

        <Card className="border border-border shadow-sm rounded-xl overflow-hidden bg-card/80 backdrop-blur hover:border-blue-500/40 transition-colors">
          <CardContent className="p-4 space-y-1">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-xs font-semibold uppercase tracking-wider">Items Handed Over</span>
              <CheckCircle2 className="w-4 h-4 text-blue-600" />
            </div>
            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{metrics.total_issued}</div>
            <p className="text-[11px] text-muted-foreground">Marked as Issued</p>
          </CardContent>
        </Card>

        <Card className="border border-border shadow-sm rounded-xl overflow-hidden bg-card/80 backdrop-blur hover:border-amber-400/40 transition-colors">
          <CardContent className="p-4 space-y-1">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-xs font-semibold uppercase tracking-wider">Pending Receipt</span>
              <Clock className="w-4 h-4 text-amber-500" />
            </div>
            <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">
              {metrics.total_pending_confirmation}
            </div>
            <p className="text-[11px] text-muted-foreground">Awaiting student verify</p>
          </CardContent>
        </Card>

        <Card className="border border-border shadow-sm rounded-xl overflow-hidden bg-card/80 backdrop-blur hover:border-emerald-400/40 transition-colors col-span-2 sm:col-span-1">
          <CardContent className="p-4 space-y-1">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-xs font-semibold uppercase tracking-wider">Confirmed</span>
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            </div>
            <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{metrics.total_confirmed}</div>
            <p className="text-[11px] text-muted-foreground">Student confirmed</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs & Filter Bar (Announcement Layout) */}
      <Card className="border-border shadow-sm rounded-2xl bg-card overflow-hidden">
        <CardContent className="p-4 space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-3">
            <Tabs
              value={activeTab}
              onValueChange={(v: any) => setActiveTab(v)}
              className="w-full sm:w-auto"
            >
              <TabsList className="bg-muted p-1 rounded-xl h-10">
                <TabsTrigger value="active" className="text-xs font-semibold px-4 h-8 rounded-lg">
                  Active Distributions ({metrics.total_distributions})
                </TabsTrigger>
                <TabsTrigger value="all" className="text-xs font-semibold px-4 h-8 rounded-lg">
                  All Records
                </TabsTrigger>
              </TabsList>
            </Tabs>

            <div className="text-xs text-muted-foreground font-medium flex items-center gap-2">
              <Filter className="w-3.5 h-3.5" />
              <span>Filters & Search</span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
            <form onSubmit={handleSearchSubmit} className="relative sm:col-span-1 md:col-span-1">
              <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
              <Input
                placeholder="Search issue title, description..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 h-10 text-xs sm:text-sm rounded-xl"
              />
            </form>

            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="h-10 text-xs sm:text-sm rounded-xl">
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Categories</SelectItem>
                <SelectItem value="UNIFORM">Uniform</SelectItem>
                <SelectItem value="BOOKS">Textbooks & Notes</SelectItem>
                <SelectItem value="EQUIPMENT">Equipment & Tools</SelectItem>
                <SelectItem value="KIT">Lab Kit</SelectItem>
                <SelectItem value="SCHOLARSHIP">Scholarship Material</SelectItem>
                <SelectItem value="OTHER">Other Provisions</SelectItem>
              </SelectContent>
            </Select>

            <Select value={batchFilter} onValueChange={setBatchFilter}>
              <SelectTrigger className="h-10 text-xs sm:text-sm rounded-xl">
                <SelectValue placeholder="All Batches" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Batches</SelectItem>
                {filterOptions?.batches.map((b) => (
                  <SelectItem key={b.id} value={b.id.toString()}>
                    {b.name.replace(/\s*\(\d{4}[–-]\d{4}\)/g, '').trim()}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={branchFilter} onValueChange={setBranchFilter}>
              <SelectTrigger className="h-10 text-xs sm:text-sm rounded-xl">
                <SelectValue placeholder="All Branches" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Branches</SelectItem>
                {filterOptions?.branches.map((b) => (
                  <SelectItem key={b.id} value={b.id.toString()}>
                    {b.name} {b.branch_code ? `(${b.branch_code})` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Main Table / List (Matching Announcement Page Table) */}
      <Card className="border border-border shadow-sm rounded-2xl overflow-hidden bg-card">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 text-muted-foreground space-y-2">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            <span className="text-sm font-medium">Loading distribution records...</span>
          </div>
        ) : data.results.length === 0 ? (
          <div className="text-center py-20 px-4 space-y-3">
            <div className="w-16 h-16 rounded-3xl bg-muted flex items-center justify-center mx-auto text-muted-foreground">
              <Package className="w-8 h-8 opacity-60" />
            </div>
            <h3 className="font-bold text-lg text-foreground">No Issue Distributions Found</h3>
            <p className="text-xs sm:text-sm text-muted-foreground max-w-md mx-auto">
              {canManage
                ? "Click 'Create New Issue' above to distribute uniforms, textbooks, or equipment to students."
                : "No college-issued items have been configured matching the selected filters."}
            </p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-muted/50">
                  <TableRow>
                    <TableHead className="text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground py-4 w-12">
                      #
                    </TableHead>
                    <TableHead className="text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground py-4 min-w-[220px]">
                      Issue Title & Date
                    </TableHead>
                    <TableHead className="text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground py-4">
                      Category
                    </TableHead>
                    <TableHead className="text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground py-4">
                      Overview
                    </TableHead>
                    <TableHead className="text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground py-4 min-w-[150px]">
                      Target Scope
                    </TableHead>
                    <TableHead className="text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground py-4">
                      Eligible
                    </TableHead>
                    <TableHead className="text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground py-4">
                      Issued
                    </TableHead>
                    <TableHead className="text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground py-4">
                      Pending Conf.
                    </TableHead>
                    <TableHead className="text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground py-4">
                      Confirmed
                    </TableHead>
                    <TableHead className="text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground py-4">
                      Actions
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.results.map((item, idx) => {
                    const rowNumber = (currentPage - 1) * 10 + idx + 1;
                    const cat = getCategoryBadge(item.category);
                    const confirmedRatio =
                      item.eligible_count > 0 ? (item.confirmed_count / item.eligible_count) * 100 : 0;

                    return (
                      <TableRow
                        key={item.id}
                        className={theme === "dark" ? "hover:bg-muted/50" : "hover:bg-gray-50/80"}
                      >
                        <TableCell className="text-center text-muted-foreground font-mono text-xs">
                          {rowNumber}
                        </TableCell>

                        <TableCell>
                          <div className="flex flex-col gap-1">
                            <div className="font-semibold text-foreground text-sm sm:text-base leading-tight">
                              {item.title}
                            </div>
                            <div className="flex items-center gap-1 text-xs text-muted-foreground font-medium">
                              <Calendar className="w-3.5 h-3.5 shrink-0" />
                              <span>
                                {item.issue_date
                                  ? new Date(item.issue_date).toLocaleDateString("en-US", {
                                      day: "numeric",
                                      month: "short",
                                      year: "numeric",
                                    })
                                  : "N/A"}
                              </span>
                              {item.quantity > 1 && (
                                <span className="text-[11px] text-muted-foreground">
                                  • Qty: {item.quantity}
                                </span>
                              )}
                            </div>
                          </div>
                        </TableCell>

                        <TableCell className="text-center">
                          <Badge
                            variant="outline"
                            className={cn(
                              "text-[10px] font-semibold px-2 py-0.5 whitespace-nowrap inline-flex items-center mx-auto",
                              cat.className
                            )}
                          >
                            {cat.icon}
                            {cat.label}
                          </Badge>
                        </TableCell>

                        <TableCell className="text-center">
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8 text-xs font-semibold px-3 hover:bg-primary/10 hover:text-primary border-primary/20"
                            onClick={() => setViewingDetailItem(item)}
                          >
                            <Eye className="w-3.5 h-3.5 mr-1" />
                            View Content
                          </Button>
                        </TableCell>

                        <TableCell className="text-center">
                          <div className="flex flex-wrap justify-center gap-1 max-w-[180px] mx-auto">
                            {item.branches.length > 0 ? (
                              item.branches.slice(0, 2).map((b) => (
                                <Badge key={b.id} variant="secondary" className="text-[10px] px-1.5 py-0 h-5">
                                  {b.code || b.name}
                                </Badge>
                              ))
                            ) : (
                              <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-5 text-muted-foreground">
                                All Branches
                              </Badge>
                            )}

                            {item.branches.length > 2 && (
                              <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-5 text-muted-foreground">
                                +{item.branches.length - 2}
                              </Badge>
                            )}

                            {item.semesters.length > 0 && (
                              <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-5 bg-primary/10 text-primary">
                                Sem {item.semesters.map((s) => s.number).join(",")}
                              </Badge>
                            )}
                          </div>
                        </TableCell>

                        <TableCell className="text-center font-bold text-foreground">
                          {item.eligible_count}
                        </TableCell>

                        <TableCell className="text-center font-bold text-blue-600 dark:text-blue-400">
                          {item.issued_count}
                        </TableCell>

                        <TableCell className="text-center font-bold text-amber-600 dark:text-amber-400">
                          {item.pending_conf_count}
                        </TableCell>

                        <TableCell className="text-center">
                          <div className="font-bold text-emerald-600 dark:text-emerald-400">
                            {item.confirmed_count}
                          </div>
                          {item.eligible_count > 0 && (
                            <div className="w-14 bg-muted rounded-full h-1 mx-auto mt-1 overflow-hidden">
                              <div
                                className="bg-emerald-500 h-1 rounded-full"
                                style={{ width: `${Math.min(100, Math.round(confirmedRatio))}%` }}
                              />
                            </div>
                          )}
                        </TableCell>

                        <TableCell className="text-center">
                          <div className="flex items-center justify-center gap-1.5 whitespace-nowrap">
                            <Button
                              size="sm"
                              variant="default"
                              className="h-8 px-3 text-xs bg-primary hover:bg-primary/90 text-primary-foreground font-semibold shadow-sm flex items-center gap-1"
                              onClick={() => {
                                setSelectedItemForStudents(item);
                                setStudentsDrawerOpen(true);
                              }}
                            >
                              <Users className="w-3.5 h-3.5" />
                              <span>Issued</span>
                            </Button>

                            {canManage && (
                              <>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
                                  title="Edit Issue"
                                  onClick={() => {
                                    setEditingItem(item);
                                    setCreateModalOpen(true);
                                  }}
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-8 w-8 p-0 text-destructive hover:bg-destructive/10"
                                  title="Delete Issue"
                                  onClick={() => handleDelete(item.id, item.title)}
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </Button>
                              </>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>

            {/* 10-per-page Standard Pagination (Matching ERP Announcement theme) */}
            {data.count > 0 && (
              <div className="flex flex-col sm:flex-row justify-between items-center gap-4 text-xs sm:text-sm text-muted-foreground px-6 py-4 border-t border-border mt-auto">
                <div>
                  Showing {Math.min((currentPage - 1) * 10 + 1, data.count)} to {Math.min(currentPage * 10, data.count)} of {data.count} distributions
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => loadItems(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1 || isLoading}
                    className="bg-primary hover:bg-primary/90 text-white border-primary h-8 px-4 text-xs transition-all"
                  >
                    Previous
                  </Button>

                  <div className="flex items-center justify-center min-w-[2rem]">
                    <span className="text-xs sm:text-sm font-semibold text-foreground">
                      {currentPage}
                    </span>
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => loadItems(Math.min(data.total_pages, currentPage + 1))}
                    disabled={currentPage >= data.total_pages || isLoading}
                    className="bg-primary hover:bg-primary/90 text-white border-primary h-8 px-4 text-xs transition-all"
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </Card>

      {/* View Content Modal (Matching Announcement Content Dialog) */}
      <Dialog
        open={!!viewingDetailItem}
        onOpenChange={(open) => {
          if (!open) setViewingDetailItem(null);
        }}
      >
        <DialogContent className="max-w-xl p-6 rounded-2xl">
          <DialogHeader>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className={getCategoryBadge(viewingDetailItem?.category || "").className}>
                {getCategoryBadge(viewingDetailItem?.category || "").label}
              </Badge>
              {viewingDetailItem?.academic_year && (
                <Badge variant="secondary" className="text-xs">
                  {viewingDetailItem.academic_year}
                </Badge>
              )}
            </div>
            <DialogTitle className="text-xl font-bold text-foreground mt-2">
              {viewingDetailItem?.title}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-primary" />
              <span>
                Issue Date:{" "}
                {viewingDetailItem?.issue_date
                  ? new Date(viewingDetailItem.issue_date).toLocaleDateString("en-US", {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })
                  : "N/A"}
              </span>
              {viewingDetailItem?.created_by && (
                <span>• Created by {viewingDetailItem.created_by.name}</span>
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            <div className="border border-border rounded-xl p-4 bg-muted/30">
              <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
                Description & Instructions
              </h4>
              <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">
                {viewingDetailItem?.description || "No description provided."}
              </p>
            </div>

            {viewingDetailItem?.remarks && (
              <div className="border border-border rounded-xl p-3 bg-muted/20 text-xs">
                <span className="font-semibold text-foreground">Internal Remarks: </span>
                <span className="text-muted-foreground">{viewingDetailItem.remarks}</span>
              </div>
            )}

            <div className="border border-border rounded-xl p-4 bg-card grid grid-cols-4 gap-2 text-center text-xs">
              <div>
                <div className="font-bold text-foreground text-base">{viewingDetailItem?.eligible_count}</div>
                <div className="text-muted-foreground text-[10px]">Eligible</div>
              </div>
              <div>
                <div className="font-bold text-blue-600 text-base">{viewingDetailItem?.issued_count}</div>
                <div className="text-muted-foreground text-[10px]">Issued</div>
              </div>
              <div>
                <div className="font-bold text-amber-600 text-base">{viewingDetailItem?.pending_conf_count}</div>
                <div className="text-muted-foreground text-[10px]">Pending Conf.</div>
              </div>
              <div>
                <div className="font-bold text-emerald-600 text-base">{viewingDetailItem?.confirmed_count}</div>
                <div className="text-muted-foreground text-[10px]">Confirmed</div>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Create / Edit Issue Modal */}
      <CreateEditIssueModal
        isOpen={createModalOpen}
        onClose={() => {
          setCreateModalOpen(false);
          setEditingItem(null);
        }}
        onSuccess={() => loadItems(currentPage)}
        filterOptions={filterOptions}
        editItem={editingItem}
      />

      {/* Issued Students Management Drawer */}
      <IssuedStudentsDrawer
        isOpen={studentsDrawerOpen}
        onClose={() => {
          setStudentsDrawerOpen(false);
          setSelectedItemForStudents(null);
        }}
        itemId={selectedItemForStudents?.id || null}
        itemTitle={selectedItemForStudents?.title}
        readOnly={!canManage}
        onStatusUpdated={() => loadItems(currentPage)}
      />
    </div>
  );
};

export default CollegeIssuedItemsList;
