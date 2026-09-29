import React, { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { Input } from "../ui/input";
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
  fetchMyIssuedItems,
  confirmStudentItemReceipt,
  StudentHistoryRecord,
  PaginatedResponse,
} from "../../utils/college_issued_items_api";
import { useToast } from "../../hooks/use-toast";
import { useTheme } from "../../context/ThemeContext";
import { cn } from "@/lib/utils";
import {
  Gift,
  Package,
  CheckCircle2,
  Clock,
  Calendar,
  Loader2,
  Search,
  Eye,
  Shirt,
  BookOpen,
  Wrench,
  GraduationCap,
  CheckCheck,
} from "lucide-react";

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
        label: "Textbooks & Notes",
        icon: <BookOpen className="w-3 h-3 mr-1" />,
        className: "bg-blue-100 text-blue-800 dark:bg-blue-950/50 dark:text-blue-300 border-blue-300 dark:border-blue-800",
      };
    case "EQUIPMENT":
      return {
        label: "Equipment & Tools",
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
        label: "Scholarship Material",
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

export const MyIssuedItems: React.FC = () => {
  const { toast } = useToast();
  const { theme } = useTheme();

  const [data, setData] = useState<PaginatedResponse<StudentHistoryRecord>>({
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
  const [isLoading, setIsLoading] = useState(false);
  const [confirmingId, setConfirmingId] = useState<number | null>(null);
  const [viewingItem, setViewingItem] = useState<StudentHistoryRecord | null>(null);

  const loadItems = useCallback(
    async (page: number) => {
      setIsLoading(true);
      try {
        const res = await fetchMyIssuedItems(page, 10);
        setData(res);
        setCurrentPage(page);
      } catch (err: any) {
        toast({
          title: "Error",
          description: err.message || "Failed to load your issued items.",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    },
    [toast]
  );

  useEffect(() => {
    loadItems(1);
  }, [loadItems]);

  const handleUpdateReceiptStatus = async (
    recordId: number,
    title: string,
    status: "CONFIRMED" | "NOT_RECEIVED"
  ) => {
    setConfirmingId(recordId);
    try {
      await confirmStudentItemReceipt(recordId, status);
      toast({
        title: status === "CONFIRMED" ? "Receipt Confirmed" : "Status Updated",
        description:
          status === "CONFIRMED"
            ? `You have confirmed receipt of "${title}".`
            : `Marked "${title}" as not received.`,
      });
      loadItems(currentPage);
    } catch (err: any) {
      toast({
        title: "Action Failed",
        description: err.message || "Unable to update receipt status.",
        variant: "destructive",
      });
    } finally {
      setConfirmingId(null);
    }
  };

  const filteredResults = data.results.filter((rec) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      rec.item_title.toLowerCase().includes(q) ||
      rec.item_description.toLowerCase().includes(q) ||
      rec.category.toLowerCase().includes(q)
    );
  });

  return (
    <div className="w-full max-w-7xl mx-auto px-2 sm:px-4 lg:px-6 py-4 space-y-6 pb-12">
      {/* Announcement-Style Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-border">
        <div className="flex items-center space-x-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-primary to-purple-600 flex items-center justify-center text-white shadow-md shadow-primary/20 shrink-0">
            <Gift className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
              My Issued Items
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
              View items and materials provided by the college or government, and confirm receipt.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Badge variant="outline" className="px-3 py-1 text-xs font-semibold bg-card shadow-sm">
            Total Allocated: {data.count}
          </Badge>
        </div>
      </div>

      {/* Search Bar */}
      <Card className="border-border shadow-sm rounded-2xl bg-card">
        <CardContent className="p-4">
          <div className="relative max-w-md">
            <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
            <Input
              placeholder="Search by item name, notes..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-10 text-xs sm:text-sm rounded-xl"
            />
          </div>
        </CardContent>
      </Card>

      {/* Items Table Card */}
      <Card className="border border-border shadow-sm rounded-2xl overflow-hidden bg-card">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 text-muted-foreground space-y-2">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            <span className="text-sm font-medium">Loading your items...</span>
          </div>
        ) : filteredResults.length === 0 ? (
          <div className="text-center py-20 px-4 space-y-3">
            <div className="w-16 h-16 rounded-3xl bg-muted flex items-center justify-center mx-auto text-muted-foreground">
              <Package className="w-8 h-8 opacity-60" />
            </div>
            <h3 className="font-bold text-lg text-foreground">No Items Found</h3>
            <p className="text-xs sm:text-sm text-muted-foreground max-w-md mx-auto">
              You do not have any pending or completed college distributions assigned to your class section.
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
                      Item / Provision
                    </TableHead>
                    <TableHead className="text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground py-4">
                      Category
                    </TableHead>
                    <TableHead className="text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground py-4">
                      Overview
                    </TableHead>
                    <TableHead className="text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground py-4">
                      College Status
                    </TableHead>
                    <TableHead className="text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground py-4">
                      Your Confirmation
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredResults.map((rec, idx) => {
                    const rowNumber = (currentPage - 1) * 10 + idx + 1;
                    const cat = getCategoryBadge(rec.category);
                    const isIssued = rec.issue_status === "ISSUED";
                    const isConfirmed = rec.confirmation_status === "CONFIRMED";
                    const isProcessing = confirmingId === rec.id;

                    return (
                      <TableRow
                        key={rec.id}
                        className={theme === "dark" ? "hover:bg-muted/50" : "hover:bg-gray-50/80"}
                      >
                        <TableCell className="text-center text-muted-foreground font-mono text-xs">
                          {rowNumber}
                        </TableCell>

                        <TableCell>
                          <div className="flex flex-col gap-1">
                            <div className="font-semibold text-foreground text-sm sm:text-base leading-tight">
                              {rec.item_title}
                            </div>
                            <div className="flex items-center gap-1 text-xs text-muted-foreground font-medium">
                              <Calendar className="w-3.5 h-3.5 shrink-0" />
                              <span>
                                Issue Date:{" "}
                                {rec.issue_date
                                  ? new Date(rec.issue_date).toLocaleDateString("en-US", {
                                      day: "numeric",
                                      month: "short",
                                      year: "numeric",
                                    })
                                  : "N/A"}
                              </span>
                              {rec.quantity > 1 && (
                                <span className="text-[11px] text-muted-foreground">
                                  • Qty: {rec.quantity}
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
                            onClick={() => setViewingItem(rec)}
                          >
                            <Eye className="w-3.5 h-3.5 mr-1" />
                            View Content
                          </Button>
                        </TableCell>

                        <TableCell className="text-center whitespace-nowrap">
                          {isIssued ? (
                            <div className="flex flex-col items-center">
                              <Badge className="bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-900/50 text-xs">
                                <Package className="w-3 h-3 mr-1" />
                                Handed Over
                              </Badge>
                              {rec.issued_at && (
                                <span className="text-[10px] text-muted-foreground mt-0.5">
                                  {new Date(rec.issued_at).toLocaleDateString("en-US", {
                                    day: "numeric",
                                    month: "short",
                                  })}
                                </span>
                              )}
                            </div>
                          ) : (
                            <Badge variant="outline" className="text-muted-foreground text-xs">
                              <Clock className="w-3 h-3 mr-1" />
                              Pending Handover
                            </Badge>
                          )}
                        </TableCell>

                        <TableCell className="text-center whitespace-nowrap">
                          {isConfirmed ? (
                            <div className="flex flex-col items-center gap-0.5">
                              <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-900/50 text-xs font-semibold px-2.5 py-0.5">
                                <CheckCircle2 className="w-3 h-3 mr-1" />
                                Received
                              </Badge>
                              {rec.confirmed_at && (
                                <span className="text-[10px] text-muted-foreground">
                                  {new Date(rec.confirmed_at).toLocaleDateString("en-US", {
                                    day: "numeric",
                                    month: "short",
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  })}
                                </span>
                              )}
                              <button
                                type="button"
                                disabled={isProcessing}
                                onClick={() => handleUpdateReceiptStatus(rec.id, rec.item_title, "NOT_RECEIVED")}
                                className="text-[10px] text-muted-foreground hover:text-destructive underline transition-colors cursor-pointer mt-0.5"
                              >
                                Mark Not Received
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center justify-center gap-1.5">
                              <Button
                                size="sm"
                                className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs shadow-sm h-8 px-3 flex items-center gap-1.5 rounded-lg transition-all"
                                disabled={isProcessing}
                                onClick={() => handleUpdateReceiptStatus(rec.id, rec.item_title, "CONFIRMED")}
                              >
                                {isProcessing ? (
                                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                ) : (
                                  <CheckCheck className="w-3.5 h-3.5" />
                                )}
                                Received
                              </Button>
                              <Badge variant="outline" className="text-muted-foreground border-border text-xs py-1 px-2">
                                <Clock className="w-3 h-3 mr-1 text-amber-500" />
                                Not Received
                              </Badge>
                            </div>
                          )}
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
                  Showing {Math.min((currentPage - 1) * 10 + 1, data.count)} to {Math.min(currentPage * 10, data.count)} of {data.count} items
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

      {/* View Content Dialog */}
      <Dialog
        open={!!viewingItem}
        onOpenChange={(open) => {
          if (!open) setViewingItem(null);
        }}
      >
        <DialogContent className="max-w-xl p-6 rounded-2xl">
          <DialogHeader>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className={getCategoryBadge(viewingItem?.category || "").className}>
                {getCategoryBadge(viewingItem?.category || "").label}
              </Badge>
              {viewingItem?.quantity && viewingItem.quantity > 1 && (
                <Badge variant="secondary" className="text-xs">
                  Quantity: {viewingItem.quantity}
                </Badge>
              )}
            </div>
            <DialogTitle className="text-xl font-bold text-foreground mt-2">
              {viewingItem?.item_title}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-primary" />
              <span>
                Issue Date:{" "}
                {viewingItem?.issue_date
                  ? new Date(viewingItem.issue_date).toLocaleDateString("en-US", {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })
                  : "N/A"}
              </span>
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            <div className="border border-border rounded-xl p-4 bg-muted/30">
              <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
                Item Details & Instructions
              </h4>
              <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">
                {viewingItem?.item_description || "No specific instructions provided."}
              </p>
            </div>

            <div className="flex items-center justify-between border border-border rounded-xl p-4 bg-card">
              <div className="text-xs space-y-1">
                <span className="font-semibold text-foreground">Handover Status: </span>
                <span className="text-muted-foreground">
                  {viewingItem?.issue_status === "ISSUED" ? "Handed over by College" : "Pending Distribution"}
                </span>
              </div>

              <div>
                {viewingItem?.confirmation_status === "CONFIRMED" ? (
                  <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-200">
                    <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                    Receipt Confirmed
                  </Badge>
                ) : viewingItem?.issue_status === "ISSUED" ? (
                  <Button
                    size="sm"
                    className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs"
                    onClick={() => {
                      if (viewingItem) {
                        handleConfirmReceipt(viewingItem.id, viewingItem.item_title);
                        setViewingItem(null);
                      }
                    }}
                  >
                    Confirm Received
                  </Button>
                ) : (
                  <Badge variant="outline" className="text-xs text-muted-foreground">
                    Awaiting College Handover
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MyIssuedItems;
