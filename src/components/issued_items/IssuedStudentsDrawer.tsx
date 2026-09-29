import React, { useState, useEffect, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "../ui/dialog";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Badge } from "../ui/badge";
import { Checkbox } from "../ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import {
  fetchIssuedStudents,
  markStudentsIssued,
  updateStudentIssuedRecordStatus,
  StudentIssuedItemRecord,
  PaginatedResponse,
} from "../../utils/college_issued_items_api";
import { StudentIssueHistoryModal } from "./StudentIssueHistoryModal";
import { useToast } from "../../hooks/use-toast";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "../ui/dropdown-menu";
import {
  Users,
  Search,
  CheckCircle2,
  Clock,
  Package,
  History,
  CheckCheck,
  Loader2,
  Filter,
  UserCheck,
  AlertCircle,
  ChevronDown,
} from "lucide-react";

interface IssuedStudentsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  itemId: number | null;
  itemTitle?: string;
  readOnly?: boolean;
  onStatusUpdated?: () => void;
}

export const IssuedStudentsDrawer: React.FC<IssuedStudentsDrawerProps> = ({
  isOpen,
  onClose,
  itemId,
  itemTitle,
  readOnly = false,
  onStatusUpdated,
}) => {
  const { toast } = useToast();
  const [data, setData] = useState<PaginatedResponse<StudentIssuedItemRecord>>({
    count: 0,
    page: 1,
    page_size: 10,
    total_pages: 1,
    next: null,
    previous: null,
    results: [],
  });

  const [currentPage, setCurrentPage] = useState(1);
  const [search, setSearch] = useState("");
  const [issueStatusFilter, setIssueStatusFilter] = useState("ALL");
  const [confirmationFilter, setConfirmationFilter] = useState("ALL");
  const [isLoading, setIsLoading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  // Multi-selection state
  const [selectedRecordIds, setSelectedRecordIds] = useState<number[]>([]);

  // Student history modal
  const [historyModalOpen, setHistoryModalOpen] = useState(false);
  const [selectedStudentForHistory, setSelectedStudentForHistory] = useState<{
    id: number;
    name: string;
    usn: string;
  } | null>(null);

  const loadStudents = useCallback(
    async (
      page: number,
      filterOverrides?: {
        search?: string;
        issue_status?: string;
        confirmation_status?: string;
      }
    ) => {
      if (!itemId) return;
      setIsLoading(true);
      try {
        const activeSearch =
          filterOverrides?.search !== undefined ? filterOverrides.search : search;
        const activeIssueStatus =
          filterOverrides?.issue_status !== undefined
            ? filterOverrides.issue_status
            : issueStatusFilter;
        const activeConfirmation =
          filterOverrides?.confirmation_status !== undefined
            ? filterOverrides.confirmation_status
            : confirmationFilter;

        const res = await fetchIssuedStudents(itemId, {
          page,
          page_size: 10,
          search: activeSearch.trim() || undefined,
          issue_status: activeIssueStatus !== "ALL" ? activeIssueStatus : undefined,
          confirmation_status:
            activeConfirmation !== "ALL" ? activeConfirmation : undefined,
        });
        setData(res);
        setCurrentPage(res.page || page);
        setSelectedRecordIds([]);
      } catch (err: any) {
        toast({
          title: "Error loading students",
          description: err.message || "Failed to load students for this issue.",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    },
    [itemId, search, issueStatusFilter, confirmationFilter, toast]
  );

  useEffect(() => {
    if (isOpen && itemId) {
      loadStudents(1);
    } else {
      setSelectedRecordIds([]);
      setSearch("");
      setIssueStatusFilter("ALL");
      setConfirmationFilter("ALL");
    }
  }, [isOpen, itemId]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadStudents(1, { search });
  };

  const toggleSelectRecord = (id: number) => {
    if (selectedRecordIds.includes(id)) {
      setSelectedRecordIds(selectedRecordIds.filter((rId) => rId !== id));
    } else {
      setSelectedRecordIds([...selectedRecordIds, id]);
    }
  };

  const toggleSelectAllOnPage = () => {
    const pendingOnPage = data.results
      .filter((r) => r.issue_status === "PENDING")
      .map((r) => r.id);

    if (selectedRecordIds.length >= pendingOnPage.length && pendingOnPage.length > 0) {
      setSelectedRecordIds([]);
    } else {
      setSelectedRecordIds(pendingOnPage);
    }
  };

  const handleMarkIssued = async (recordIds: number[]) => {
    if (!itemId || recordIds.length === 0) return;
    setIsProcessing(true);
    try {
      const res = await markStudentsIssued(itemId, {
        student_issued_ids: recordIds,
      });
      toast({
        title: "Status Updated",
        description: res.message || `Marked ${recordIds.length} student(s) as Issued.`,
      });
      loadStudents(currentPage);
      if (onStatusUpdated) onStatusUpdated();
    } catch (err: any) {
      toast({
        title: "Action Failed",
        description: err.message || "Failed to mark as issued.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleUpdateConfirmation = async (
    recordId: number,
    studentName: string,
    confirmationStatus: "CONFIRMED" | "NOT_RECEIVED" | "PENDING"
  ) => {
    setIsProcessing(true);
    try {
      const res = await updateStudentIssuedRecordStatus(recordId, {
        confirmation_status: confirmationStatus,
      });
      toast({
        title: "Status Updated",
        description: res.message || `Updated status for ${studentName}.`,
      });
      loadStudents(currentPage);
      if (onStatusUpdated) onStatusUpdated();
    } catch (err: any) {
      toast({
        title: "Update Failed",
        description: err.message || "Failed to update confirmation status.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleOpenHistory = (studentId: number, studentName: string, usn: string) => {
    setSelectedStudentForHistory({ id: studentId, name: studentName, usn });
    setHistoryModalOpen(true);
  };

  const pendingOnPage = data.results.filter((r) => r.issue_status === "PENDING");

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-5xl max-h-[92vh] flex flex-col p-4 sm:p-6 rounded-2xl">
          <DialogHeader className="pb-2 border-b border-border">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center space-x-2">
                <div className="p-2 bg-primary/10 text-primary rounded-lg">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <DialogTitle className="text-xl font-bold">
                    Issued Students: {itemTitle || data.item_title || "Distribution"}
                  </DialogTitle>
                  <DialogDescription className="text-xs sm:text-sm text-muted-foreground">
                    Manage student allocations, handover records, and verify student receipt confirmations.
                  </DialogDescription>
                </div>
              </div>

              {!readOnly && (
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="default"
                    className="h-8 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm flex items-center gap-1.5"
                    disabled={selectedRecordIds.length === 0 || isProcessing}
                    onClick={() => handleMarkIssued(selectedRecordIds)}
                  >
                    {isProcessing ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <CheckCheck className="w-3.5 h-3.5" />
                    )}
                    Mark Selected Issued ({selectedRecordIds.length})
                  </Button>
                </div>
              )}
            </div>
          </DialogHeader>

          {/* Search & Filter Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 py-3">
            <form onSubmit={handleSearchSubmit} className="flex items-center gap-2 flex-1 min-w-[240px]">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
                <Input
                  placeholder="Search student name, USN, or email..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9 h-9 text-xs sm:text-sm"
                />
              </div>
              <Button type="submit" size="sm" variant="secondary" className="h-9 px-3 text-xs">
                Search
              </Button>
            </form>

            <div className="flex flex-wrap items-center gap-2">
              <Select
                value={issueStatusFilter}
                onValueChange={(val) => {
                  setIssueStatusFilter(val);
                  loadStudents(1, { issue_status: val });
                }}
              >
                <SelectTrigger className="h-9 w-[130px] text-xs">
                  <SelectValue placeholder="Issue Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Issue Status</SelectItem>
                  <SelectItem value="PENDING">Pending Handover</SelectItem>
                  <SelectItem value="ISSUED">Issued</SelectItem>
                </SelectContent>
              </Select>

              <Select
                value={confirmationFilter}
                onValueChange={(val) => {
                  setConfirmationFilter(val);
                  loadStudents(1, { confirmation_status: val });
                }}
              >
                <SelectTrigger className="h-9 w-[150px] text-xs">
                  <SelectValue placeholder="Confirmation" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Confirmations</SelectItem>
                  <SelectItem value="CONFIRMED">Confirmed</SelectItem>
                  <SelectItem value="PENDING">Pending Conf. / Not Confirmed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Table Content */}
          <div className="flex-1 overflow-y-auto border border-border rounded-xl bg-card shadow-sm">
            {isLoading ? (
              <div className="flex items-center justify-center py-16 text-muted-foreground">
                <Loader2 className="w-6 h-6 animate-spin mr-2 text-primary" />
                Loading eligible students...
              </div>
            ) : data.results.length === 0 ? (
              <div className="text-center py-16 px-4 space-y-2">
                <Users className="w-10 h-10 text-muted-foreground mx-auto opacity-50" />
                <p className="font-semibold text-sm text-foreground">No students found</p>
                <p className="text-xs text-muted-foreground">
                  Try clearing your search query or adjusting your filters.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs sm:text-sm">
                  <thead>
                    <tr className="bg-muted/50 border-b border-border text-muted-foreground font-semibold">
                      {!readOnly && (
                        <th className="py-3 px-3 w-10 text-center">
                          <Checkbox
                            checked={
                              pendingOnPage.length > 0 &&
                              selectedRecordIds.length === pendingOnPage.length
                            }
                            onCheckedChange={toggleSelectAllOnPage}
                            disabled={pendingOnPage.length === 0}
                            title="Select all pending on this page"
                          />
                        </th>
                      )}
                      <th className="py-3 px-3">Student Details</th>
                      <th className="py-3 px-3">Class / Section</th>
                      <th className="py-3 px-3">Issue Status</th>
                      <th className="py-3 px-3">Student Confirmation</th>
                      <th className="py-3 px-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {data.results.map((rec) => {
                      const isPending = rec.issue_status === "PENDING";
                      const isChecked = selectedRecordIds.includes(rec.id);

                      return (
                        <tr
                          key={rec.id}
                          className={`hover:bg-muted/30 transition-colors ${
                            isChecked ? "bg-primary/5" : ""
                          }`}
                        >
                          {!readOnly && (
                            <td className="py-3 px-3 text-center">
                              <Checkbox
                                checked={isChecked}
                                onCheckedChange={() => toggleSelectRecord(rec.id)}
                                disabled={!isPending}
                              />
                            </td>
                          )}
                          <td className="py-3 px-3">
                            <div className="font-bold text-foreground">{rec.student_name}</div>
                            <div className="text-xs font-mono text-muted-foreground">
                              USN: {rec.usn}
                            </div>
                            {rec.email && (
                              <div className="text-[11px] text-muted-foreground hidden sm:block">
                                {rec.email}
                              </div>
                            )}
                          </td>
                          <td className="py-3 px-3 text-xs">
                            <div className="font-medium text-foreground">
                              {rec.branch_name} {rec.branch_code ? `(${rec.branch_code})` : ""}
                            </div>
                            <div className="text-muted-foreground text-[11px]">
                              {rec.batch_name.replace(/\s*\(\d{4}[–-]\d{4}\)/g, '').trim()} • Sem {rec.semester_number || "N/A"} • Sec {rec.section_name.replace(/^(Section|Sec)\s*/i, '').trim()}
                            </div>
                          </td>
                          <td className="py-3 px-3 whitespace-nowrap">
                            {rec.issue_status === "ISSUED" ? (
                              <div>
                                <Badge className="bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-900/50 hover:bg-blue-500/20 text-xs">
                                  <Package className="w-3 h-3 mr-1" />
                                  Issued
                                </Badge>
                                {rec.issued_at && (
                                  <div className="text-[10px] text-muted-foreground mt-0.5">
                                    {new Date(rec.issued_at).toLocaleDateString("en-US", {
                                      day: "numeric",
                                      month: "short",
                                      year: "numeric",
                                    })}
                                    {rec.issued_by_name ? ` by ${rec.issued_by_name}` : ""}
                                  </div>
                                )}
                              </div>
                            ) : (
                              <Badge variant="outline" className="text-muted-foreground text-xs">
                                <Clock className="w-3 h-3 mr-1" />
                                Pending Handover
                              </Badge>
                            )}
                          </td>
                          <td className="py-3 px-3 whitespace-nowrap">
                            {rec.confirmation_status === "CONFIRMED" ? (
                              <div>
                                <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-900/50 hover:bg-emerald-500/20 text-xs">
                                  <CheckCircle2 className="w-3 h-3 mr-1" />
                                  Confirmed
                                </Badge>
                                {rec.confirmed_at && (
                                  <div className="text-[10px] text-muted-foreground mt-0.5">
                                    {new Date(rec.confirmed_at).toLocaleDateString("en-US", {
                                      day: "numeric",
                                      month: "short",
                                      year: "numeric",
                                      hour: "2-digit",
                                      minute: "2-digit",
                                    })}
                                  </div>
                                )}
                              </div>
                            ) : rec.confirmation_status === "NOT_RECEIVED" ? (
                              <Badge
                                variant="outline"
                                className="text-rose-600 dark:text-rose-400 border-rose-300 dark:border-rose-900/50 bg-rose-50 dark:bg-rose-950/20 text-xs"
                              >
                                <AlertCircle className="w-3 h-3 mr-1" />
                                Not Received
                              </Badge>
                            ) : rec.issue_status === "ISSUED" ? (
                              <Badge
                                variant="outline"
                                className="text-amber-600 dark:text-amber-400 border-amber-300 dark:border-amber-900/50 bg-amber-50 dark:bg-amber-950/20 text-xs"
                              >
                                <Clock className="w-3 h-3 mr-1" />
                                Pending Confirmation
                              </Badge>
                            ) : (
                              <Badge
                                variant="outline"
                                className="text-muted-foreground text-xs"
                              >
                                <Clock className="w-3 h-3 mr-1" />
                                Not Received
                              </Badge>
                            )}
                          </td>
                          <td className="py-3 px-3 text-right whitespace-nowrap space-x-1.5">
                            {!readOnly && isPending && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 px-2 text-xs border-emerald-300 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-800 dark:text-emerald-300"
                                onClick={() => handleMarkIssued([rec.id])}
                                disabled={isProcessing}
                              >
                                Mark Issued
                              </Button>
                            )}

                            {!readOnly && (
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-7 px-2 text-xs border-border shadow-none inline-flex items-center gap-1"
                                    disabled={isProcessing}
                                  >
                                    <span>Status</span>
                                    <ChevronDown className="w-3 h-3 text-muted-foreground" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-48">
                                  <DropdownMenuItem
                                    onClick={() =>
                                      handleUpdateConfirmation(rec.id, rec.student_name, "CONFIRMED")
                                    }
                                    className="text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-2 cursor-pointer"
                                  >
                                    <CheckCircle2 className="w-3.5 h-3.5" />
                                    <span>Mark Confirmed (Received)</span>
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={() =>
                                      handleUpdateConfirmation(rec.id, rec.student_name, "NOT_RECEIVED")
                                    }
                                    className="text-xs text-rose-600 dark:text-rose-400 flex items-center gap-2 cursor-pointer"
                                  >
                                    <AlertCircle className="w-3.5 h-3.5" />
                                    <span>Mark Not Received</span>
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    onClick={() =>
                                      handleUpdateConfirmation(rec.id, rec.student_name, "PENDING")
                                    }
                                    className="text-xs text-amber-600 dark:text-amber-400 flex items-center gap-2 cursor-pointer"
                                  >
                                    <Clock className="w-3.5 h-3.5" />
                                    <span>Reset to Pending</span>
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            )}

                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 px-2 text-xs text-primary hover:bg-primary/10 inline-flex items-center gap-1"
                              onClick={() =>
                                handleOpenHistory(rec.student_id, rec.student_name, rec.usn)
                              }
                            >
                              <History className="w-3.5 h-3.5" />
                              <span className="hidden sm:inline">View</span>
                            </Button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* 10-per-page Standard Pagination (Matching ERP Announcement theme) */}
          {data.count > 0 && (
            <div className="flex flex-col sm:flex-row justify-between items-center gap-4 text-xs sm:text-sm text-muted-foreground px-4 py-3 border-t border-border mt-auto">
              <div>
                Showing {Math.min((currentPage - 1) * 10 + 1, data.count)} to {Math.min(currentPage * 10, data.count)} of {data.count} students
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => loadStudents(Math.max(1, currentPage - 1))}
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
                  onClick={() => loadStudents(Math.min(data.total_pages, currentPage + 1))}
                  disabled={currentPage >= data.total_pages || isLoading}
                  className="bg-primary hover:bg-primary/90 text-white border-primary h-8 px-4 text-xs transition-all"
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Student Complete History Modal */}
      <StudentIssueHistoryModal
        isOpen={historyModalOpen}
        onClose={() => {
          setHistoryModalOpen(false);
          setSelectedStudentForHistory(null);
        }}
        studentId={selectedStudentForHistory?.id || null}
        studentName={selectedStudentForHistory?.name}
        usn={selectedStudentForHistory?.usn}
        readOnly={readOnly}
        onStatusUpdated={() => {
          loadStudents(currentPage);
          if (onStatusUpdated) onStatusUpdated();
        }}
      />
    </>
  );
};
