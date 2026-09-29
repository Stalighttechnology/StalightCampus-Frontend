import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "../ui/dialog";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import {
  fetchStudentIssueHistory,
  updateStudentIssuedRecordStatus,
  StudentHistoryRecord,
  PaginatedResponse,
} from "../../utils/college_issued_items_api";
import { useToast } from "../../hooks/use-toast";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "../ui/dropdown-menu";
import {
  History,
  CheckCircle2,
  Clock,
  Package,
  Calendar,
  User,
  Loader2,
  FileText,
  AlertCircle,
  ChevronDown,
  CheckCheck,
} from "lucide-react";

interface StudentIssueHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  studentId: number | null;
  studentName?: string;
  usn?: string;
  readOnly?: boolean;
  onStatusUpdated?: () => void;
}

export const StudentIssueHistoryModal: React.FC<StudentIssueHistoryModalProps> = ({
  isOpen,
  onClose,
  studentId,
  studentName,
  usn,
  readOnly = false,
  onStatusUpdated,
}) => {
  const { toast } = useToast();
  const [data, setData] = useState<PaginatedResponse<StudentHistoryRecord> | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isOpen && studentId) {
      loadHistory(studentId, 1);
    } else {
      setData(null);
      setCurrentPage(1);
    }
  }, [isOpen, studentId]);

  const loadHistory = async (sId: number, page: number) => {
    setIsLoading(true);
    try {
      const res = await fetchStudentIssueHistory(sId, page, 10);
      setData(res);
      setCurrentPage(page);
    } catch (err) {
      console.error("Error loading student issue history:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const [updatingId, setUpdatingId] = useState<number | null>(null);

  const handleUpdateConfirmation = async (
    recordId: number,
    itemTitle: string,
    confirmationStatus: "CONFIRMED" | "NOT_RECEIVED" | "PENDING"
  ) => {
    setUpdatingId(recordId);
    try {
      const res = await updateStudentIssuedRecordStatus(recordId, {
        confirmation_status: confirmationStatus,
      });
      toast({
        title: "Status Updated",
        description: res.message || `Updated confirmation status for "${itemTitle}".`,
      });
      if (studentId) {
        await loadHistory(studentId, currentPage);
      }
      if (onStatusUpdated) onStatusUpdated();
    } catch (err: any) {
      toast({
        title: "Update Failed",
        description: err.message || "Failed to update confirmation status.",
        variant: "destructive",
      });
    } finally {
      setUpdatingId(null);
    }
  };

  const handlePageChange = (page: number) => {
    if (studentId) {
      loadHistory(studentId, page);
    }
  };

  const student = data?.student;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto p-4 sm:p-6 rounded-2xl">
        <DialogHeader>
          <div className="flex items-center space-x-2">
            <div className="p-2 bg-primary/10 text-primary rounded-lg">
              <History className="w-5 h-5" />
            </div>
            <div>
              <DialogTitle className="text-xl font-bold">Student Issue History</DialogTitle>
              <DialogDescription className="text-sm text-muted-foreground">
                Complete record of college and government-issued items for this student.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Student Info Card */}
        <div className="bg-muted/40 border border-border rounded-xl p-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold">
              <User className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-bold text-foreground text-sm sm:text-base">
                {student?.name || studentName || "Student"}
              </h4>
              <p className="text-xs text-muted-foreground">USN: {student?.usn || usn || "N/A"}</p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 text-xs">
            {student?.batch_name && (
              <Badge variant="secondary" className="font-normal">
                Batch: {student.batch_name.replace(/\s*\(\d{4}[–-]\d{4}\)/g, '').trim()}
              </Badge>
            )}
            {student?.branch_name && (
              <Badge variant="secondary" className="font-normal">
                Branch: {student.branch_name}
              </Badge>
            )}
            {student?.semester_number && (
              <Badge variant="secondary" className="font-normal">
                Sem: {student.semester_number}
              </Badge>
            )}
            {student?.section_name && (
              <Badge variant="secondary" className="font-normal">
                Sec: {student.section_name.replace(/^(Section|Sec)\s*/i, '').trim()}
              </Badge>
            )}
          </div>
        </div>

        {/* Records Table */}
        <div className="border border-border rounded-xl overflow-hidden bg-card shadow-sm mt-2">
          {isLoading ? (
            <div className="flex items-center justify-center py-12 text-muted-foreground">
              <Loader2 className="w-6 h-6 animate-spin mr-2 text-primary" />
              Loading distribution records...
            </div>
          ) : !data || data.results.length === 0 ? (
            <div className="text-center py-12 px-4 space-y-2">
              <Package className="w-10 h-10 text-muted-foreground mx-auto opacity-50" />
              <p className="font-medium text-sm text-foreground">No items issued yet</p>
              <p className="text-xs text-muted-foreground">
                This student has not been assigned any college-issued items.
              </p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs sm:text-sm">
                  <thead>
                    <tr className="bg-muted/50 border-b border-border text-muted-foreground font-semibold">
                      <th className="py-3 px-3 w-12 text-center">#</th>
                      <th className="py-3 px-3">Item / Provision</th>
                      <th className="py-3 px-3">Issue Date</th>
                      <th className="py-3 px-3">Status</th>
                      <th className="py-3 px-3">Student Confirmation</th>
                      {!readOnly && <th className="py-3 px-3 text-right">Actions</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {data.results.map((rec, idx) => {
                      const rowNumber = (currentPage - 1) * 10 + idx + 1;
                      const isUpdatingThis = updatingId === rec.id;

                      return (
                        <tr key={rec.id} className="hover:bg-muted/30 transition-colors">
                          <td className="py-3 px-3 text-center text-muted-foreground font-mono text-xs">
                            {rowNumber}
                          </td>
                          <td className="py-3 px-3">
                            <div className="font-semibold text-foreground">{rec.item_title}</div>
                            <div className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                              <Badge variant="outline" className="text-[10px] py-0 px-1.5">
                                {rec.category_display || rec.category}
                              </Badge>
                              {rec.quantity > 1 && <span>Qty: {rec.quantity}</span>}
                            </div>
                            {rec.item_description && (
                              <p className="text-[11px] text-muted-foreground mt-1 line-clamp-1">
                                {rec.item_description}
                              </p>
                            )}
                          </td>
                          <td className="py-3 px-3 whitespace-nowrap text-muted-foreground text-xs">
                            <div className="flex items-center gap-1">
                              <Calendar className="w-3.5 h-3.5" />
                              {rec.issue_date
                                ? new Date(rec.issue_date).toLocaleDateString("en-US", {
                                    day: "numeric",
                                    month: "short",
                                    year: "numeric",
                                  })
                                : "N/A"}
                            </div>
                          </td>
                          <td className="py-3 px-3 whitespace-nowrap">
                            {rec.issue_status === "ISSUED" ? (
                              <Badge className="bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-900/50 hover:bg-blue-500/20 text-xs">
                                <Package className="w-3 h-3 mr-1" />
                                Issued
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-muted-foreground text-xs">
                                <Clock className="w-3 h-3 mr-1" />
                                Pending Handover
                              </Badge>
                            )}
                            {rec.issued_at && (
                              <div className="text-[10px] text-muted-foreground mt-0.5">
                                {new Date(rec.issued_at).toLocaleDateString("en-US", {
                                  day: "numeric",
                                  month: "short",
                                })}
                              </div>
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
                              <Badge variant="outline" className="text-amber-600 dark:text-amber-400 border-amber-300 dark:border-amber-900/50 bg-amber-50 dark:bg-amber-950/20 text-xs">
                                <Clock className="w-3 h-3 mr-1" />
                                Pending Confirmation
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-muted-foreground text-xs">
                                <Clock className="w-3 h-3 mr-1" />
                                Not Received
                              </Badge>
                            )}
                          </td>

                          {!readOnly && (
                            <td className="py-3 px-3 text-right whitespace-nowrap">
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="h-7 text-xs px-2.5 flex items-center gap-1 border-border shadow-none"
                                    disabled={isUpdatingThis}
                                  >
                                    {isUpdatingThis ? (
                                      <Loader2 className="w-3 h-3 animate-spin" />
                                    ) : (
                                      <>
                                        <span>Change Status</span>
                                        <ChevronDown className="w-3 h-3 ml-0.5 text-muted-foreground" />
                                      </>
                                    )}
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-48">
                                  <DropdownMenuItem
                                    onClick={() =>
                                      handleUpdateConfirmation(rec.id, rec.item_title, "CONFIRMED")
                                    }
                                    className="text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-2 cursor-pointer"
                                  >
                                    <CheckCircle2 className="w-3.5 h-3.5" />
                                    <span>Mark Confirmed (Received)</span>
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={() =>
                                      handleUpdateConfirmation(rec.id, rec.item_title, "NOT_RECEIVED")
                                    }
                                    className="text-xs text-rose-600 dark:text-rose-400 flex items-center gap-2 cursor-pointer"
                                  >
                                    <AlertCircle className="w-3.5 h-3.5" />
                                    <span>Mark Not Received</span>
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    onClick={() =>
                                      handleUpdateConfirmation(rec.id, rec.item_title, "PENDING")
                                    }
                                    className="text-xs text-amber-600 dark:text-amber-400 flex items-center gap-2 cursor-pointer"
                                  >
                                    <Clock className="w-3.5 h-3.5" />
                                    <span>Reset to Pending</span>
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </td>
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* 10-per-page Standard Pagination (Matching ERP Announcement theme) */}
              {data.count > 0 && (
                <div className="flex flex-col sm:flex-row justify-between items-center gap-4 text-xs sm:text-sm text-muted-foreground px-4 py-3 border-t border-border mt-auto">
                  <div>
                    Showing {Math.min((currentPage - 1) * 10 + 1, data.count)} to {Math.min(currentPage * 10, data.count)} of {data.count} records
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePageChange(Math.max(1, currentPage - 1))}
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
                      onClick={() => handlePageChange(Math.min(data.total_pages, currentPage + 1))}
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
        </div>
      </DialogContent>
    </Dialog>
  );
};
