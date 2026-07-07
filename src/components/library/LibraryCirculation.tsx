import React, { useState, useEffect } from "react";
import { RefreshCw, Download, Loader2, CheckCircle } from "lucide-react";
import Swal from "sweetalert2";
import { Card, CardHeader, CardTitle, CardFooter } from "../ui/card";
import { Button } from "../ui/button";
import { downloadFile } from "../../utils/downloadHelper";
import { useTheme } from "../../context/ThemeContext";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "../ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle
} from "../ui/dialog";
import { API_ENDPOINT } from "../../utils/config";
import {
  fetchActiveBorrows,
  exportLibraryBorrowsCsv,
  renewBook
} from "../../utils/library_api";

const LibraryCirculation = () => {
  const { theme } = useTheme();
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);

  // Circulation States
  const [activeBorrows, setActiveBorrows] = useState<any[]>([]);
  const [borrowsPage, setBorrowsPage] = useState(1);
  const [borrowsTotalPages, setBorrowsTotalPages] = useState(1);
  const [borrowsCount, setBorrowsCount] = useState(0);

  // Increase Duration Modal States
  const [showDurationModal, setShowDurationModal] = useState(false);
  const [selectedBorrowId, setSelectedBorrowId] = useState<number | null>(null);
  const [modalDurationDays, setModalDurationDays] = useState(14);
  const [isModalCustom, setIsModalCustom] = useState(false);

  const loadCirculation = async (page: number = 1) => {
    setLoading(true);
    try {
      const res = await fetchActiveBorrows(page);
      if (res && res.results) {
        setActiveBorrows(res.results);
        setBorrowsTotalPages(Math.ceil(res.count / 15) || 1);
        setBorrowsCount(res.count || 0);
        setBorrowsPage(page);
      } else if (Array.isArray(res)) {
        setActiveBorrows(res);
        setBorrowsTotalPages(1);
        setBorrowsCount(res.length);
        setBorrowsPage(1);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCirculation();
  }, []);

  const renewingRef = React.useRef<Record<number, boolean>>({});

  const handleRenewClick = async (borrowId: number, durationDays?: number) => {
    if (renewingRef.current[borrowId]) return;
    renewingRef.current[borrowId] = true;
    try {
      setLoading(true);
      const res = await renewBook(borrowId, durationDays);
      if (res && res.id) {
        const text = res.due_date ? `Borrow duration extended successfully to ${new Date(res.due_date).toLocaleDateString()}` : "Borrow duration extended successfully";
        Swal.fire("Success", text, "success");
        loadCirculation(borrowsPage);
      } else {
        Swal.fire("Renewal Refused", res.message || "Could not renew book. Check reservation holds.", "error");
      }
    } catch (err) {
      Swal.fire("Error", "Renewal failed on server side", "error");
    } finally {
      setLoading(false);
      renewingRef.current[borrowId] = false;
    }
  };

  const handleIncreaseDurationClick = (borrowId: number) => {
    setSelectedBorrowId(borrowId);
    setModalDurationDays(14);
    setIsModalCustom(false);
    setShowDurationModal(true);
  };

  const handleModalDurationSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedBorrowId === null) return;
    setShowDurationModal(false);
    await handleRenewClick(selectedBorrowId, modalDurationDays);
  };

  const handleExportCSV = async () => {
    setExporting(true);
    try {
      const url = `${API_ENDPOINT}/library/admin/borrows/export-csv/`;
      await downloadFile(url, `Active_Circulation_${new Date().toISOString().split("T")[0]}.csv`);

      Swal.fire({
        title: "Success",
        text: "Active circulation CSV exported successfully",
        icon: "success",
        timer: 1500,
        showConfirmButton: false
      });
    } catch (error) {
      Swal.fire("Error", "Failed to export active circulation CSV", "error");
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* List of active borrows */}
      <Card className={`border overflow-hidden shadow-sm ${theme === 'dark' ? 'bg-card border-border text-foreground' : 'bg-white border-gray-200 text-gray-900'}`}>
        <CardHeader id="library-circulation-action-header" className="px-4 sm:px-6 py-4 md:py-5 border-b">
          <div className="flex justify-between items-center w-full gap-2">
            <div>
              <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                <CardTitle className="sm:text-2xl text-xl font-semibold whitespace-nowrap">Active Circulation</CardTitle>
                {borrowsCount > 0 && (
                  <span className={`text-xs font-medium px-2.5 py-0.5 rounded-full mt-0.5 whitespace-nowrap shrink-0 ${theme === 'dark' ? 'bg-primary/10 text-primary' : 'bg-blue-100 text-blue-700'}`}>
                    {borrowsCount} Records
                  </span>
                )}
              </div>
              <p className={`hidden sm:block text-sm ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}`}>Books currently checked out and their return deadlines.</p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {/* Desktop Export CSV Button */}
              <Button
                variant="outline"
                onClick={handleExportCSV}
                disabled={exporting || activeBorrows.length === 0}
                className="hidden sm:flex items-center justify-center gap-1.5 px-4 py-2 h-10 text-sm rounded-lg border bg-primary hover:text-white text-white hover:bg-primary/90 transition-all"
              >
                {exporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                Export CSV
              </Button>
              {/* Mobile Export CSV Icon Button */}
              <Button
                onClick={handleExportCSV}
                disabled={exporting || activeBorrows.length === 0}
                size="icon"
                variant="outline"
                className="flex sm:hidden h-10 w-10 items-center justify-center shrink-0 border border-input bg-background"
              >
                {exporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
              </Button>
            </div>
          </div>
        </CardHeader>
        {/* Desktop View: Table */}
        <div className="hidden sm:block overflow-x-auto thin-scrollbar">
          <table className="w-full text-left border-collapse whitespace-nowrap">
            <thead>
              <tr className={`sticky top-0 z-10 border-b text-xs uppercase tracking-wider font-semibold ${theme === 'dark' ? 'bg-card border-border text-foreground shadow-sm' : 'bg-gray-50 border-gray-200 text-gray-900 shadow-sm'
                }`}>
                <th className="p-4">Borrower</th>
                <th className="p-4">Book Details</th>
                <th className="p-4 font-mono">Barcode ID</th>
                <th className="p-4">Issue Date</th>
                <th className="p-4">Due Date</th>
                <th className="p-4">Status</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {activeBorrows.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-6">
                    <div className={`flex flex-col items-center justify-center py-10 px-4 rounded-xl border-2 border-dashed text-center transition-all duration-300 ${theme === 'dark' ? 'border-border bg-card/30 text-muted-foreground' : 'border-gray-200 bg-gray-50/50 text-gray-500'}`}>
                      <div className={`p-4 rounded-full mb-4 ${theme === 'dark' ? 'bg-primary/20 text-primary' : 'bg-primary/10 text-primary'}`}>
                        <CheckCircle size={32} className="opacity-80" />
                      </div>
                      <h3 className={`text-base font-semibold mb-1 ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>No Active Borrows</h3>
                      <p className="max-w-xs text-xs leading-relaxed opacity-80">
                        No books are currently checked out. Excellent!
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                activeBorrows.map((borrow) => (
                  <tr key={borrow.id} className={`border-b text-sm transition-colors duration-200 ${theme === 'dark' ? 'border-border hover:bg-accent text-foreground' : 'border-gray-200 hover:bg-gray-50 text-gray-900'
                    }`}>
                    <td className="p-4">
                      <p className="font-semibold">{borrow.user_details?.first_name} {borrow.user_details?.last_name}</p>
                      <p className="text-xs opacity-60">{borrow.user_details?.email}</p>
                    </td>
                    <td className="p-4">
                      <p className="font-semibold">{borrow.book_copy_details?.book_details?.title}</p>
                      <p className="text-xs opacity-60">{borrow.book_copy_details?.book_details?.author}</p>
                    </td>
                    <td className="p-4 font-mono text-xs font-semibold">{borrow.book_copy_details?.barcode_id}</td>
                    <td className="p-4 text-xs font-semibold">{new Date(borrow.issue_date).toLocaleDateString()}</td>
                    <td className="p-4 text-xs font-semibold">{new Date(borrow.due_date).toLocaleDateString()}</td>
                    <td className="p-4">
                      <span className={`text-[10px] px-2 py-0.5 rounded font-extrabold capitalize ${borrow.status === "overdue"
                        ? "bg-red-500/20 text-red-400 animate-pulse"
                        : "bg-emerald-500/20 text-emerald-400"
                        }`}>
                        {borrow.status}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      {(() => {
                        const originalDuration = Math.round(
                          (new Date(borrow.due_date).getTime() - new Date(borrow.issue_date).getTime()) / (1000 * 60 * 60 * 24)
                        );
                        const daysSinceIssue = Math.floor(
                          (new Date().getTime() - new Date(borrow.issue_date).getTime()) / (1000 * 60 * 60 * 24)
                        );
                        const isOverdue = borrow.status === "overdue" || new Date() > new Date(borrow.due_date);

                        if (isOverdue) {
                          return (
                            <Button
                              size="sm"
                              disabled={loading}
                              onClick={() => !loading && handleIncreaseDurationClick(borrow.id)}
                              className="bg-amber-600 hover:bg-amber-500 text-white font-semibold px-3.5 py-1 text-xs rounded transition-all"
                            >
                              Increase Duration
                            </Button>
                          );
                        }

                        const isEligible = daysSinceIssue >= originalDuration;
                        return (
                          <Button
                            size="sm"
                            disabled={loading || !isEligible}
                            onClick={() => !loading && isEligible && handleRenewClick(borrow.id)}
                            className="bg-primary/20 hover:bg-primary/30 text-primary-foreground font-semibold px-3.5 py-1 text-xs rounded disabled:opacity-50 disabled:pointer-events-none"
                          >
                            Renew ({originalDuration}d)
                          </Button>
                        );
                      })()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile View: Cards */}
        <div className="block sm:hidden p-4 space-y-4">
          {activeBorrows.length === 0 ? (
            <div className={`flex flex-col items-center justify-center py-10 px-4 rounded-xl border-2 border-dashed text-center transition-all duration-300 ${theme === 'dark' ? 'border-border bg-card/30 text-muted-foreground' : 'border-gray-200 bg-gray-50/50 text-gray-500'}`}>
              <div className={`p-4 rounded-full mb-4 ${theme === 'dark' ? 'bg-primary/20 text-primary' : 'bg-primary/10 text-primary'}`}>
                <CheckCircle size={32} className="opacity-80" />
              </div>
              <h3 className={`text-base font-semibold mb-1 ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>No Active Borrows</h3>
              <p className="max-w-xs text-xs leading-relaxed opacity-80">
                No books are currently checked out. Excellent!
              </p>
            </div>
          ) : (
            activeBorrows.map((borrow) => {
              const originalDuration = Math.round(
                (new Date(borrow.due_date).getTime() - new Date(borrow.issue_date).getTime()) / (1000 * 60 * 60 * 24)
              );
              const daysSinceIssue = Math.floor(
                (new Date().getTime() - new Date(borrow.issue_date).getTime()) / (1000 * 60 * 60 * 24)
              );
              const isEligible = daysSinceIssue >= originalDuration;

              return (
                <div key={borrow.id} className={`p-4 rounded-xl border shadow-sm space-y-3 transition-all ${theme === 'dark' ? 'bg-[#1c1c1e]/60 border-border text-foreground' : 'bg-gray-50/70 border-gray-200/80 text-gray-900'}`}>
                  <div className="space-y-1.5">
                    <h4 className="font-bold text-base break-words whitespace-normal">
                      {borrow.user_details?.first_name} {borrow.user_details?.last_name}
                    </h4>
                    <p className={`text-xs opacity-75 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                      {borrow.user_details?.email}
                    </p>
                    <div className="pt-0.5">
                      <span className={`text-[10px] px-2 py-0.5 rounded font-extrabold capitalize whitespace-nowrap ${borrow.status === "overdue"
                        ? "bg-red-500/20 text-red-400 animate-pulse"
                        : "bg-emerald-500/20 text-emerald-400"
                      }`}>
                        {borrow.status}
                      </span>
                    </div>
                  </div>

                  <div className="border-t border-dashed border-gray-200 dark:border-border pt-2">
                    <h5 className="font-semibold text-sm">{borrow.book_copy_details?.book_details?.title}</h5>
                    <p className={`text-xs opacity-75 mt-0.5 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                      by {borrow.book_copy_details?.book_details?.author}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <span className="opacity-60 block text-[11px] uppercase tracking-wider font-semibold">Barcode ID</span>
                      <span className="font-mono text-sm font-medium">{borrow.book_copy_details?.barcode_id}</span>
                    </div>
                    <div>
                      <span className="opacity-60 block text-[11px] uppercase tracking-wider font-semibold">Issue Date</span>
                      <span className="text-sm font-semibold">{new Date(borrow.issue_date).toLocaleDateString()}</span>
                    </div>
                    <div className="col-span-2">
                      <span className="opacity-60 block text-[11px] uppercase tracking-wider font-semibold">Due Date</span>
                      <span className="text-sm font-bold text-primary">{new Date(borrow.due_date).toLocaleDateString()}</span>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-gray-200 dark:border-border">
                    {(() => {
                      const isOverdue = borrow.status === "overdue" || new Date() > new Date(borrow.due_date);
                      if (isOverdue) {
                        return (
                          <Button
                            size="sm"
                            disabled={loading}
                            onClick={() => !loading && handleIncreaseDurationClick(borrow.id)}
                            className="w-full h-10 px-4 text-sm bg-amber-600 hover:bg-amber-500 text-white font-semibold rounded flex items-center justify-center gap-1.5 transition-all"
                          >
                            Increase Duration
                          </Button>
                        );
                      }
                      return (
                        <Button
                          size="sm"
                          disabled={loading || !isEligible}
                          onClick={() => !loading && isEligible && handleRenewClick(borrow.id)}
                          className="w-full h-10 px-4 text-sm bg-primary/20 hover:bg-primary/30 text-primary-foreground font-semibold rounded disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center gap-1.5"
                        >
                          Renew ({originalDuration}d)
                        </Button>
                      );
                    })()}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {!loading && borrowsTotalPages > 1 && (
          <CardFooter className="flex flex-col sm:flex-row justify-between items-center gap-4 text-sm text-muted-foreground px-6 py-4 border-t border-border mt-auto">
            <div>
              Showing <span className="font-medium">{borrowsCount > 0 ? (borrowsPage - 1) * 15 + 1 : 0}</span> to <span className="font-medium">{Math.min(borrowsPage * 15, borrowsCount)}</span> of <span className="font-medium">{borrowsCount}</span> requests
            </div>
            <div className="flex items-center gap-2">
              <Button
                disabled={borrowsPage === 1}
                onClick={() => loadCirculation(borrowsPage - 1)}
                className="bg-primary hover:bg-primary/90 text-white border-primary h-9 px-4 transition-all"
              >
                Previous
              </Button>
              <div className="flex items-center justify-center px-2">
                <span className={`text-sm font-semibold ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>
                  Page {borrowsPage} of {borrowsTotalPages}
                </span>
              </div>
              <Button
                disabled={borrowsPage === borrowsTotalPages}
                onClick={() => loadCirculation(borrowsPage + 1)}
                className="bg-primary hover:bg-primary/90 text-white border-primary h-9 px-4 transition-all"
              >
                Next
              </Button>
            </div>
          </CardFooter>
        )}
      </Card>

      {/* Increase Duration Modal */}
      <Dialog open={showDurationModal} onOpenChange={setShowDurationModal}>
        <DialogContent className={`w-[90vw] sm:max-w-md border p-6 shadow-2xl rounded-xl ${theme === 'dark' ? 'bg-[#2c2c2e] border-[#3a3a3c] text-white' : 'bg-white border-gray-200 text-gray-900'}`}>
          <DialogHeader className="mb-4">
            <DialogTitle className="text-lg font-semibold">Increase Checkout Duration</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleModalDurationSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase opacity-70 mb-2">Duration (Days)</label>
              <div className="flex gap-2">
                <Select
                  value={isModalCustom ? "custom" : modalDurationDays.toString()}
                  onValueChange={(val) => {
                    if (val === "custom") {
                      setIsModalCustom(true);
                    } else {
                      setIsModalCustom(false);
                      setModalDurationDays(Number(val));
                    }
                  }}
                >
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Select Duration" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="7">7 Days</SelectItem>
                    <SelectItem value="14">14 Days</SelectItem>
                    <SelectItem value="21">21 Days</SelectItem>
                    <SelectItem value="30">30 Days</SelectItem>
                    <SelectItem value="custom">Custom...</SelectItem>
                  </SelectContent>
                </Select>
                {isModalCustom && (
                  <input
                    type="number"
                    min="1"
                    placeholder="Days..."
                    value={modalDurationDays}
                    onChange={(e) => setModalDurationDays(Number(e.target.value) || 1)}
                    className={`w-24 px-3 py-2 text-sm rounded-lg border h-10 focus:outline-none focus:ring-1 focus:ring-primary shrink-0 ${theme === 'dark' ? 'bg-[#1c1c1e] border-[#3a3a3c] text-white' : 'bg-gray-50 border-gray-200'}`}
                  />
                )}
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowDurationModal(false)}
                className={`px-4 h-10 text-sm rounded-lg border ${theme === 'dark' ? 'border-[#3a3a3c] text-white hover:bg-[#3a3a3c]/50' : 'border-gray-200 text-gray-700 hover:bg-gray-50'}`}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={loading}
                className="bg-primary hover:bg-primary/90 text-white font-semibold h-10 px-6 rounded-lg"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Increase"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default LibraryCirculation;
