import React, { useState, useEffect } from "react";
import { RefreshCw, Download, Loader2 } from "lucide-react";
import Swal from "sweetalert2";
import { Card, CardHeader, CardTitle, CardFooter } from "../ui/card";
import { Button } from "../ui/button";
import { useTheme } from "../../context/ThemeContext";
import {
  fetchActiveBorrows,
  exportLibraryBorrowsPdf,
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

  const handleRenewClick = async (borrowId: number) => {
    if (renewingRef.current[borrowId]) return;
    renewingRef.current[borrowId] = true;
    try {
      setLoading(true);
      const res = await renewBook(borrowId);
      if (res && res.id) {
        Swal.fire("Success", "Borrow duration extended successfully by 14 days", "success");
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

  const handleExportPDF = async () => {
    setExporting(true);
    try {
      const blob = await exportLibraryBorrowsPdf();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `Active_Circulation_${new Date().toISOString().split("T")[0]}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      Swal.fire({
        title: "Success",
        text: "Active circulation PDF exported successfully",
        icon: "success",
        timer: 1500,
        showConfirmButton: false
      });
    } catch (error) {
      Swal.fire("Error", "Failed to export active circulation PDF", "error");
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* List of active borrows */}
      <Card className={`border overflow-hidden shadow-sm ${theme === 'dark' ? 'bg-card border-border text-foreground' : 'bg-white border-gray-200 text-gray-900'}`}>
        <CardHeader className="pb-3 border-b border-gray-200 dark:border-border">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
            <div>
              <div className="flex items-center gap-2 mb-0.5">
                <CardTitle className="sm:text-2xl text-lg font-semibold">Active Circulation</CardTitle>
                {borrowsCount > 0 && (
                  <span className={`text-xs font-medium px-2.5 py-0.5 rounded-full mt-0.5 ${theme === 'dark' ? 'bg-primary/10 text-primary' : 'bg-blue-100 text-blue-700'}`}>
                    {borrowsCount} Records
                  </span>
                )}
              </div>
              <p className={`text-sm ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}`}>Books currently checked out and their return deadlines.</p>
            </div>
            <div>
              <Button
                variant="outline"
                onClick={handleExportPDF}
                disabled={exporting || activeBorrows.length === 0}
                className="flex items-center gap-1.5 px-4 py-2 text-sm rounded-lg border bg-primary hover:text-white text-white hover:bg-primary/90 transition-all"
              >
                {exporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                Export PDF
              </Button>
            </div>
          </div>
        </CardHeader>
        <div className="overflow-x-auto thin-scrollbar">
          <table className="w-full text-left border-collapse">
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
                  <td colSpan={7} className="text-center p-8 opacity-60 text-sm">
                    No books are currently checked out. Excellent!
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
                        const daysSinceIssue = Math.floor(
                          (new Date().getTime() - new Date(borrow.issue_date).getTime()) / (1000 * 60 * 60 * 24)
                        );
                        const isEligible = daysSinceIssue >= 14;
                        return (
                          <Button
                            size="sm"
                            disabled={loading || !isEligible}
                            onClick={() => !loading && isEligible && handleRenewClick(borrow.id)}
                            className="bg-primary/20 hover:bg-primary/30 text-primary-foreground font-semibold px-3.5 py-1 text-xs rounded disabled:opacity-100 disabled:pointer-events-none"
                          >
                            Renew (14d)
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
    </div>
  );
};

export default LibraryCirculation;
