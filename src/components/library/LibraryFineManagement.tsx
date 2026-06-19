import React, { useState, useEffect } from "react";
import { Download, Loader2, CheckCircle, Settings } from "lucide-react";
import Swal from "sweetalert2";
import { Card, CardHeader, CardTitle, CardFooter } from "../ui/card";
import { Button } from "../ui/button";
import { useTheme } from "../../context/ThemeContext";
import {
  fetchFines,
  exportLibraryFinesPdf,
  payFine,
  fetchLibrarySettings,
  updateLibrarySettings
} from "../../utils/library_api";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle
} from "../ui/dialog";

const LibraryFineManagement = () => {
  const { theme } = useTheme();
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);

  // Fines States
  const [fines, setFines] = useState<any[]>([]);
  const [finesPage, setFinesPage] = useState(1);
  const [finesTotalPages, setFinesTotalPages] = useState(1);
  const [finesCount, setFinesCount] = useState(0);

  // Library Settings State
  const [dailyFineRate, setDailyFineRate] = useState<number | null>(null);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [newFineRate, setNewFineRate] = useState<string>("");
  const [updatingSettings, setUpdatingSettings] = useState(false);

  const loadFines = async (page: number = 1) => {
    setLoading(true);
    try {
      const res = await fetchFines(page);
      if (res && res.results) {
        setFines(res.results);
        setFinesTotalPages(Math.ceil(res.count / 15) || 1);
        setFinesCount(res.count || 0);
        setFinesPage(page);
      } else if (Array.isArray(res)) {
        setFines(res);
        setFinesTotalPages(1);
        setFinesCount(res.length);
        setFinesPage(1);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const loadSettings = async () => {
    try {
      const res = await fetchLibrarySettings();
      if (res && res.daily_fine_rate !== undefined) {
        setDailyFineRate(res.daily_fine_rate);
        setNewFineRate(res.daily_fine_rate !== null ? res.daily_fine_rate.toString() : "");
      }
    } catch (err) {
      console.error("Failed to load settings:", err);
    }
  };

  const handleUpdateSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFineRate.trim()) {
      Swal.fire("Error", "Daily fine rate is mandatory", "error");
      return;
    }
    const parsed = parseFloat(newFineRate);
    if (isNaN(parsed) || parsed < 0) {
      Swal.fire("Error", "Please enter a valid positive number", "error");
      return;
    }
    setUpdatingSettings(true);
    try {
      const res = await updateLibrarySettings({ daily_fine_rate: parsed });
      if (res && res.daily_fine_rate !== undefined) {
        Swal.fire("Success", "Daily fine rate updated and unpaid fines recalculated!", "success");
        setDailyFineRate(res.daily_fine_rate);
        setShowSettingsModal(false);
        loadFines(finesPage);
      } else if (res && res.message) {
        Swal.fire("Error", res.message, "error");
      }
    } catch (err) {
      Swal.fire("Error", "Failed to update settings", "error");
    } finally {
      setUpdatingSettings(false);
    }
  };

  useEffect(() => {
    loadFines();
    loadSettings();
  }, []);

  const getOverdueDetails = (fine: any) => {
    const borrow = fine.borrow_record_details;
    if (!borrow) return null;
    const dueDateStr = borrow.due_date;
    const returnedDateStr = borrow.returned_date || new Date().toISOString().split("T")[0];
    
    if (!dueDateStr) return null;
    
    const dueDate = new Date(dueDateStr);
    const returnedDate = new Date(returnedDateStr);
    
    const timeDiff = returnedDate.getTime() - dueDate.getTime();
    const daysDiff = Math.max(0, Math.ceil(timeDiff / (1000 * 3600 * 24)));
    
    return {
      days: daysDiff,
      from: dueDateStr.split("T")[0],
      to: returnedDateStr.split("T")[0]
    };
  };

  const handlePayFineClick = async (fineId: number, amount: string) => {
    const confirm = await Swal.fire({
      title: "Confirm Payment",
      text: `Collect cash/digital payment of ${amount} units?`,
      icon: "question",
      showCancelButton: true,
      confirmButtonText: "Yes, Paid"
    });

    if (confirm.isConfirmed) {
      try {
        setLoading(true);
        const res = await payFine(fineId);
        if (res && res.is_paid) {
          Swal.fire("Paid", "Fine successfully settled and marked as paid!", "success");
          loadFines(finesPage);
        }
      } catch (err) {
        Swal.fire("Error", "Failed to mark fine as paid", "error");
      } finally {
        setLoading(false);
      }
    }
  };

  const handleExportPDF = async () => {
    setExporting(true);
    try {
      const blob = await exportLibraryFinesPdf();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `Library_Fines_${new Date().toISOString().split("T")[0]}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      Swal.fire({
        title: "Success",
        text: "Library fines PDF exported successfully",
        icon: "success",
        timer: 1500,
        showConfirmButton: false
      });
    } catch (error) {
      Swal.fire("Error", "Failed to export library fines PDF", "error");
    } finally {
      setExporting(false);
    }
  };

  return (
    <Card className={`border overflow-hidden shadow-sm ${theme === 'dark' ? 'bg-card border-border text-foreground' : 'bg-white border-gray-200 text-gray-900'}`}>
      <CardHeader id="library-fines-action-header" className="px-4 sm:px-6 py-4 md:py-5 border-b">
        <div className="flex justify-between items-center w-full gap-2">
          <div>
            <div className="flex items-center gap-2 mb-0.5 flex-wrap">
              <CardTitle className="sm:text-2xl text-lg font-semibold whitespace-nowrap">Fine Management</CardTitle>
              {finesCount > 0 && (
                <span className={`text-xs font-medium px-2.5 py-0.5 rounded-full mt-0.5 whitespace-nowrap shrink-0 ${theme === 'dark' ? 'bg-red-500/10 text-red-400' : 'bg-red-100 text-red-600'}`}>
                  {finesCount} Pending
                </span>
              )}
              {dailyFineRate !== null ? (
                <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full mt-0.5 whitespace-nowrap shrink-0 ${theme === 'dark' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-emerald-100 text-emerald-600'}`}>
                  Rate: ₹{dailyFineRate}/day
                </span>
              ) : (
                <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full mt-0.5 whitespace-nowrap shrink-0 ${theme === 'dark' ? 'bg-amber-500/10 text-amber-400' : 'bg-amber-100 text-amber-600'}`}>
                  Rate: Not Set
                </span>
              )}
            </div>
            <p className={`hidden sm:block text-sm ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}`}>Track and settle overdue fines collected from borrowers.</p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {/* Set Fine Rate Button (Desktop) */}
            <Button
              variant="outline"
              onClick={() => setShowSettingsModal(true)}
              className={`hidden sm:flex items-center justify-center gap-1.5 px-4 py-2 h-10 text-sm rounded-lg border transition-all ${
                theme === 'dark' 
                  ? 'border-border bg-[#2c2c2e] hover:bg-[#3a3a3c] text-white' 
                  : 'border-gray-200 bg-white hover:bg-gray-50 text-gray-900'
              }`}
            >
              <Settings className="w-4 h-4" />
              Set Fine Rate
            </Button>

            {/* Desktop Export PDF Button */}
            <Button
              variant="outline"
              onClick={handleExportPDF}
              disabled={exporting || fines.length === 0}
              className="hidden sm:flex items-center justify-center gap-1.5 px-4 py-2 h-10 text-sm rounded-lg border bg-primary hover:text-white text-white hover:bg-primary/90 transition-all"
            >
              {exporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
              Export PDF
            </Button>
            {/* Mobile Export PDF Icon Button */}
            <Button
              onClick={handleExportPDF}
              disabled={exporting || fines.length === 0}
              size="icon"
              variant="outline"
              className="flex sm:hidden h-10 w-10 items-center justify-center shrink-0 border border-input bg-background"
            >
              {exporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            </Button>
          </div>
        </div>

        {/* Mobile Set Fine Rate Row */}
        <div className="block sm:hidden mt-3 w-full">
          <Button
            onClick={() => setShowSettingsModal(true)}
            className="w-full bg-primary hover:bg-primary/95 text-white flex items-center justify-center gap-1.5 h-10 text-sm font-semibold rounded-lg shadow-sm border-0"
          >
            <Settings className="w-4 h-4" />
            Set Fine Rate
          </Button>
        </div>
      </CardHeader>
      {/* Desktop View: Table */}
      <div className="hidden sm:block overflow-x-auto thin-scrollbar">
        <table className="w-full text-left border-collapse whitespace-nowrap">
          <thead>
            <tr className={`sticky top-0 z-10 border-b text-xs uppercase tracking-wider font-semibold ${theme === 'dark' ? 'bg-card border-border text-foreground shadow-sm' : 'bg-gray-50 border-gray-200 text-gray-900 shadow-sm'
              }`}>
              <th className="p-4">Borrower</th>
              <th className="p-4">Overdue Book Title</th>
              <th className="p-4">Barcode ID</th>
              <th className="p-4">Late Fine Amount</th>
              <th className="p-4">Fine Status</th>
              <th className="p-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {fines.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-6">
                  <div className={`flex flex-col items-center justify-center py-10 px-4 rounded-xl border-2 border-dashed text-center transition-all duration-300 ${theme === 'dark' ? 'border-border bg-card/30 text-muted-foreground' : 'border-gray-200 bg-gray-50/50 text-gray-500'}`}>
                    <div className={`p-4 rounded-full mb-4 ${theme === 'dark' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-emerald-100 text-emerald-600'}`}>
                      <CheckCircle size={32} className="opacity-80" />
                    </div>
                    <h3 className={`text-base font-semibold mb-1 ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>No Fines Found</h3>
                    <p className="max-w-xs text-xs leading-relaxed opacity-80">
                      All fine records are fully settled! Perfect score.
                    </p>
                  </div>
                </td>
              </tr>
            ) : (
              fines.map((fine) => (
                <tr key={fine.id} className={`border-b text-sm transition-colors duration-200 ${theme === 'dark' ? 'border-border hover:bg-accent text-foreground' : 'border-gray-200 hover:bg-gray-50 text-gray-900'
                  }`}>
                  <td className="p-4 font-semibold">{fine.borrow_record_details?.user_details?.first_name} {fine.borrow_record_details?.user_details?.last_name}</td>
                  <td className="p-4 font-semibold">{fine.borrow_record_details?.book_copy_details?.book_details?.title}</td>
                  <td className="p-4 font-mono text-xs opacity-70">{fine.borrow_record_details?.book_copy_details?.barcode_id}</td>
                  <td className="p-4">
                    <div className="flex flex-col gap-0.5">
                      <span className="font-semibold text-red-500">{fine.amount} units</span>
                      {(() => {
                        const details = getOverdueDetails(fine);
                        if (!details || details.days <= 0) return null;
                        return (
                          <div className="text-[11px] font-normal leading-normal text-muted-foreground flex flex-col gap-0.5">
                            <span className={theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}>
                              {details.days} {details.days === 1 ? 'day' : 'days'} overdue
                            </span>
                            <span className="text-[10px] opacity-75">
                              ({details.from} to {details.to})
                            </span>
                          </div>
                        );
                      })()}
                    </div>
                  </td>
                  <td className="p-4">
                    <span className={`text-[10px] px-2 py-0.5 rounded font-semibold capitalize ${fine.is_paid
                      ? "bg-emerald-500/20 text-emerald-400"
                      : "bg-red-500/20 text-red-400 animate-pulse"
                      }`}>
                      {fine.is_paid ? "Paid" : "Overdue (Unpaid)"}
                    </span>
                  </td>
                  <td className="p-4 text-right">
                    {!fine.is_paid && (
                      <Button
                        size="sm"
                        disabled={loading}
                        onClick={() => handlePayFineClick(fine.id, fine.amount)}
                        className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold px-4 py-1 text-xs rounded"
                      >
                        Settle Payment
                      </Button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile View: Cards */}
      <div className="block sm:hidden p-4 space-y-4">
        {fines.length === 0 ? (
          <div className={`flex flex-col items-center justify-center py-10 px-4 rounded-xl border-2 border-dashed text-center transition-all duration-300 ${theme === 'dark' ? 'border-border bg-card/30 text-muted-foreground' : 'border-gray-200 bg-gray-50/50 text-gray-500'}`}>
            <div className={`p-4 rounded-full mb-4 ${theme === 'dark' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-emerald-100 text-emerald-600'}`}>
              <CheckCircle size={32} className="opacity-80" />
            </div>
            <h3 className={`text-base font-semibold mb-1 ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>No Fines Found</h3>
            <p className="max-w-xs text-xs leading-relaxed opacity-80">
              All fine records are fully settled! Perfect score.
            </p>
          </div>
        ) : (
          fines.map((fine) => (
            <div key={fine.id} className={`p-4 rounded-xl border shadow-sm space-y-3 transition-all ${theme === 'dark' ? 'bg-[#1c1c1e]/60 border-border text-foreground' : 'bg-gray-50/70 border-gray-200/80 text-gray-900'}`}>
              <div className="space-y-1.5">
                <h4 className="font-semibold text-base break-words whitespace-normal">
                  {fine.borrow_record_details?.user_details?.first_name} {fine.borrow_record_details?.user_details?.last_name}
                </h4>
                <p className={`text-xs opacity-75 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                  {fine.borrow_record_details?.user_details?.email}
                </p>
                <div className="pt-0.5">
                  <span className={`text-[10px] px-2 py-0.5 rounded font-semibold capitalize whitespace-nowrap ${fine.is_paid
                    ? "bg-emerald-500/20 text-emerald-400"
                    : "bg-red-500/20 text-red-400 animate-pulse"
                    }`}>
                    {fine.is_paid ? "Paid" : "Overdue (Unpaid)"}
                  </span>
                </div>
              </div>

              <div className="border-t border-dashed border-gray-200 dark:border-border pt-2">
                <h5 className="font-semibold text-sm">{fine.borrow_record_details?.book_copy_details?.book_details?.title}</h5>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="opacity-60 block text-[11px] uppercase tracking-wider font-semibold">Barcode ID</span>
                  <span className="font-mono text-sm font-medium">{fine.borrow_record_details?.book_copy_details?.barcode_id}</span>
                </div>
                <div>
                  <span className="opacity-60 block text-[11px] uppercase tracking-wider font-semibold">Fine Amount</span>
                  <span className="text-sm font-semibold text-red-500 block">{fine.amount} units</span>
                  {(() => {
                    const details = getOverdueDetails(fine);
                    if (!details || details.days <= 0) return null;
                    return (
                      <div className="text-[11px] font-normal leading-normal text-muted-foreground mt-1 flex flex-col gap-0.5">
                        <span className={theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}>
                          {details.days} {details.days === 1 ? 'day' : 'days'} overdue
                        </span>
                        <span className="text-[10px] opacity-75">
                          ({details.from} to {details.to})
                        </span>
                      </div>
                    );
                  })()}
                </div>
              </div>

              {!fine.is_paid && (
                <div className="pt-2 border-t border-gray-200 dark:border-border">
                  <Button
                    size="sm"
                    disabled={loading}
                    onClick={() => handlePayFineClick(fine.id, fine.amount)}
                    className="w-full h-10 px-4 text-sm bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded flex items-center justify-center gap-1.5"
                  >
                    Settle Payment
                  </Button>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {!loading && finesTotalPages > 1 && (
        <CardFooter className="flex flex-col sm:flex-row justify-between items-center gap-4 text-sm text-muted-foreground px-6 py-4 border-t border-border mt-auto">
          <div>
            Showing <span className="font-medium">{finesCount > 0 ? (finesPage - 1) * 15 + 1 : 0}</span> to <span className="font-medium">{Math.min(finesPage * 15, finesCount)}</span> of <span className="font-medium">{finesCount}</span> fines
          </div>
          <div className="flex items-center gap-2">
            <Button
              disabled={finesPage === 1}
              onClick={() => loadFines(finesPage - 1)}
              className="bg-primary hover:bg-primary/90 text-white border-primary h-9 px-4 transition-all"
            >
              Previous
            </Button>
            <div className="flex items-center justify-center px-2">
              <span className={`text-sm font-semibold ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>
                Page {finesPage} of {finesTotalPages}
              </span>
            </div>
            <Button
              disabled={finesPage === finesTotalPages}
              onClick={() => loadFines(finesPage + 1)}
              className="bg-primary hover:bg-primary/90 text-white border-primary h-9 px-4 transition-all"
            >
              Next
            </Button>
          </div>
        </CardFooter>
      )}

      {/* Settings Dialog */}
      <Dialog open={showSettingsModal} onOpenChange={setShowSettingsModal}>
        <DialogContent className={`w-[90vw] sm:max-w-md border p-6 shadow-2xl rounded-xl ${theme === 'dark' ? 'bg-[#2c2c2e] border-[#3a3a3c] text-white' : 'bg-white border-gray-200 text-gray-900'}`}>
          <DialogHeader className="mb-4">
            <DialogTitle className="text-lg font-semibold">Library Fine Configuration</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleUpdateSettings} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider mb-2 opacity-75">
                Daily Fine Rate (₹ / Day)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                required
                value={newFineRate}
                onChange={(e) => setNewFineRate(e.target.value)}
                placeholder="e.g. 5.00"
                className={`w-full px-3.5 py-2.5 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-primary transition-all duration-200 ${
                  theme === 'dark'
                    ? 'bg-[#1c1c1e] border-[#3a3a3c] text-white focus:border-primary/50'
                    : 'bg-gray-50 border-gray-200 text-gray-900 focus:border-primary/50'
                }`}
              />
              <p className="mt-1.5 text-[11px] opacity-60 leading-relaxed">
                Updating the daily rate will immediately recalculate all unpaid outstanding fines based on overdue duration.
              </p>
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowSettingsModal(false)}
                className={`px-4 py-2 text-sm rounded-lg border transition-all ${
                  theme === 'dark' 
                    ? 'border-border bg-transparent hover:bg-white/5 text-white' 
                    : 'border-gray-200 bg-transparent hover:bg-gray-50 text-gray-900'
                }`}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={updatingSettings}
                className="bg-primary hover:bg-primary/90 text-white font-semibold px-4 py-2 text-sm rounded-lg flex items-center gap-1.5"
              >
                {updatingSettings && <Loader2 className="w-4 h-4 animate-spin" />}
                Save Changes
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </Card>
  );
};

export default LibraryFineManagement;
