import React, { useState, useEffect } from "react";
import { Download, Loader2, CheckCircle } from "lucide-react";
import Swal from "sweetalert2";
import { Card, CardHeader, CardTitle, CardFooter } from "../ui/card";
import { Button } from "../ui/button";
import { useTheme } from "../../context/ThemeContext";
import {
  fetchFines,
  exportLibraryFinesPdf,
  payFine
} from "../../utils/library_api";

const LibraryFineManagement = () => {
  const { theme } = useTheme();
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);

  // Fines States
  const [fines, setFines] = useState<any[]>([]);
  const [finesPage, setFinesPage] = useState(1);
  const [finesTotalPages, setFinesTotalPages] = useState(1);
  const [finesCount, setFinesCount] = useState(0);

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

  useEffect(() => {
    loadFines();
  }, []);

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
      <CardHeader className="pb-3 border-b border-gray-200 dark:border-border">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
          <div>
            <div className="flex items-center gap-2 mb-0.5">
              <CardTitle className="sm:text-2xl text-lg font-semibold">Fine Management</CardTitle>
              {finesCount > 0 && (
                <span className={`text-xs font-medium px-2.5 py-0.5 rounded-full mt-0.5 ${theme === 'dark' ? 'bg-red-500/10 text-red-400' : 'bg-red-100 text-red-600'}`}>
                  {finesCount} Pending
                </span>
              )}
            </div>
            <p className={`text-sm ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}`}>Track and settle overdue fines collected from borrowers.</p>
          </div>
          <div className="w-full md:w-auto">
            <Button
              variant="outline"
              onClick={handleExportPDF}
              disabled={exporting || fines.length === 0}
              className="w-full md:w-auto flex items-center justify-center gap-1.5 px-4 py-2 text-sm rounded-lg border bg-primary hover:text-white text-white hover:bg-primary/90 transition-all"
            >
              {exporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
              Export PDF
            </Button>
          </div>
        </div>
      </CardHeader>
      <div className="overflow-x-auto thin-scrollbar">
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
                  <td className="p-4 font-semibold text-red-500">{fine.amount} units</td>
                  <td className="p-4">
                    <span className={`text-[10px] px-2 py-0.5 rounded font-extrabold capitalize ${fine.is_paid
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
    </Card>
  );
};

export default LibraryFineManagement;
