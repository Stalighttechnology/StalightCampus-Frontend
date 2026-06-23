import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  BookOpen, Users, RefreshCw, AlertTriangle,
  CreditCard, Search, Plus, Check, X, Tag, BookOpen as BookIcon, ScanLine
} from "lucide-react";
import Swal from "sweetalert2";
import BarcodeScannerModal from "../ui/BarcodeScannerModal";
import { Card } from "../ui/card";
import { Button } from "../ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "../ui/select";
import DashboardCard from "../common/DashboardCard";
import { useTheme } from "../../context/ThemeContext";
import {
  fetchLibraryAdminStats,
  searchBorrowers,
  issueBook,
  returnBook
} from "../../utils/library_api";

const LibraryOverview = () => {
  const { theme } = useTheme();
  const [loading, setLoading] = useState(false);

  // Dashboard stats
  const [stats, setStats] = useState({
    total_books: 0,
    total_copies: 0,
    active_borrows: 0,
    overdue_borrows: 0,
    outstanding_fines: 0.00
  });

  const [borrowerSearchText, setBorrowerSearchText] = useState("");
  const [suggestedBorrowers, setSuggestedBorrowers] = useState<any[]>([]);
  const [selectedBorrower, setSelectedBorrower] = useState<any>(null);
  const [issueBarcode, setIssueBarcode] = useState("");
  const [durationDays, setDurationDays] = useState(14);
  const [isCustom, setIsCustom] = useState(false);
  const [barcodeInput, setBarcodeInput] = useState("");
  
  // Scanner Modal states
  const [showIssueScanner, setShowIssueScanner] = useState(false);
  const [showReturnScanner, setShowReturnScanner] = useState(false);

  const loadStats = async () => {
    try {
      const res = await fetchLibraryAdminStats();
      if (res && !res.message) {
        setStats(res);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    loadStats();
  }, []);

  // Autocomplete search for borrowers
  useEffect(() => {
    const delayDebounce = setTimeout(async () => {
      if (borrowerSearchText.trim().length >= 2) {
        try {
          const res = await searchBorrowers(borrowerSearchText);
          if (Array.isArray(res)) {
            setSuggestedBorrowers(res);
          }
        } catch (err) {
          console.error(err);
        }
      } else {
        setSuggestedBorrowers([]);
      }
    }, 300);

    return () => clearTimeout(delayDebounce);
  }, [borrowerSearchText]);

  const handleIssueBookSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBorrower) {
      Swal.fire("Error", "Please search and select a borrower first", "warning");
      return;
    }
    if (!issueBarcode.trim()) {
      Swal.fire("Error", "Please scan or enter a copy barcode ID", "warning");
      return;
    }

    try {
      setLoading(true);
      const res = await issueBook({
        user_id: selectedBorrower.id,
        barcode_id: issueBarcode.trim(),
        duration_days: durationDays
      });

      if (res && res.id) {
        Swal.fire("Issued!", `Book copy ${issueBarcode} successfully lent out!`, "success");
        setIssueBarcode("");
        setSelectedBorrower(null);
        setBorrowerSearchText("");
        loadStats();
      } else {
        Swal.fire("Failed", res.message || "Failed to issue book", "error");
      }
    } catch (err) {
      Swal.fire("Error", "Server error processing book checkout", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleReturnBookSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!barcodeInput.trim()) {
      Swal.fire("Warning", "Barcode ID is required to return a copy", "warning");
      return;
    }

    try {
      setLoading(true);
      const res = await returnBook({ barcode_id: barcodeInput.trim() });
      if (res && res.record) {
        if (res.fine_generated) {
          Swal.fire({
            title: "Returned (Late Penalty)",
            html: `Book successfully checked-in!<br/><b class="text-red-500">Fine Generated: ₹${res.fine_generated.amount}</b>`,
            icon: "warning"
          });
        } else {
          Swal.fire("Returned Successfully", "Book copy marked as available!", "success");
        }
        setBarcodeInput("");
        loadStats();
      } else {
        Swal.fire("Error", res?.message || "Failed to process book return", "error");
      }
    } catch (err) {
      Swal.fire("Error", "Server error processing check-in", "error");
    } finally {
      setLoading(false);
    }
  };

  const containerVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.2
      }
    }
  };

  return (
    <motion.div
      className="space-y-6"
      initial="hidden"
      animate="visible"
      variants={containerVariants}
    >
      {/* Metrics Cards */}
      <div id="library-stats-grid" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        <DashboardCard
          title="Catalog Titles"
          value={stats.total_books}
          description="Cataloged books"
          icon={<BookIcon className="w-5 h-5 text-blue-500" />}
        />
        <DashboardCard
          title="Physical Copies"
          value={stats.total_copies}
          description="Total inventory"
          icon={<Tag className="w-5 h-5 text-emerald-500" />}
        />
        <DashboardCard
          title="Active Borrows"
          value={stats.active_borrows}
          description="Currently checked out"
          icon={<Users className="w-5 h-5 text-purple-500" />}
        />
        <DashboardCard
          title="Overdue Books"
          value={stats.overdue_borrows}
          description="Past return date"
          icon={<AlertTriangle className="w-5 h-5 text-red-500" />}
          className={stats.overdue_borrows > 0 ? "ring-2 ring-red-500/50 bg-red-950/20" : ""}
        />
        <DashboardCard
          title="Total Unpaid Fines"
          value={`${stats.outstanding_fines.toFixed(2)}`}
          description="Unpaid fine amounts"
          icon={<CreditCard className="w-5 h-5 text-amber-500" />}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Quick Issue Panel */}
        <Card id="library-issue-card" className={`p-6 border shadow-sm ${theme === 'dark' ? 'bg-card border-border text-foreground' : 'bg-white border-gray-200 text-gray-900'}`}>
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2 text-primary">
            <BookIcon className="w-5 h-5" /> Book Issue Desk
          </h3>
          <form onSubmit={handleIssueBookSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase opacity-70 mb-2">Search Borrower (Student/Teacher)</label>
              <div className="relative">
                <Search className="absolute left-3 top-2.5 w-4 h-4 opacity-50" />
                <input
                  type="text"
                  placeholder="Search student USN, name, or email..."
                  value={borrowerSearchText}
                  onChange={(e) => setBorrowerSearchText(e.target.value)}
                  className={`w-full pl-9 pr-4 py-2 text-sm rounded-lg border focus:outline-none focus:ring-1 focus:ring-primary ${theme === 'dark' ? 'bg-[#1c1c1e] border-[#3a3a3c] text-white' : 'bg-gray-50 border-gray-200'
                    }`}
                />
                {suggestedBorrowers.length > 0 && (
                  <div className={`absolute left-0 right-0 top-11 max-h-48 overflow-y-auto rounded-lg border z-10 ${theme === 'dark' ? 'bg-card border-border' : 'bg-white border-gray-200'
                    } shadow-lg thin-scrollbar`}>
                    {suggestedBorrowers.map((borrower) => (
                      <button
                        key={borrower.id}
                        type="button"
                        onClick={() => {
                          setSelectedBorrower(borrower);
                          setBorrowerSearchText(`${borrower.first_name} ${borrower.last_name || ""}`);
                          setSuggestedBorrowers([]);
                        }}
                        className={`w-full text-left px-4 py-2.5 text-xs flex justify-between items-center transition-colors ${theme === 'dark' ? 'hover:bg-[#1c1c1e] text-white' : 'hover:bg-gray-100'
                          }`}
                      >
                        <span><b>{borrower.first_name} {borrower.last_name}</b> ({borrower.username})</span>
                        <span className="opacity-70 text-[10px] bg-primary/20 text-primary-foreground px-1.5 py-0.5 rounded capitalize">{borrower.role}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              {selectedBorrower && (
                <div className="mt-2 text-xs bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 p-2 rounded-lg flex items-center justify-between">
                  <span>Selected Borrower: <b>{selectedBorrower.first_name} {selectedBorrower.last_name}</b></span>
                  <X className="w-4 h-4 cursor-pointer" onClick={() => setSelectedBorrower(null)} />
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase opacity-70 mb-2">Book Copy Barcode ID</label>
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="text"
                  placeholder="e.g. BAR-1-001"
                  value={issueBarcode}
                  onChange={(e) => setIssueBarcode(e.target.value)}
                  className={`w-full sm:flex-1 px-4 py-2 h-10 text-sm rounded-lg border focus:outline-none focus:ring-1 focus:ring-primary ${theme === 'dark' ? 'bg-[#1c1c1e] border-[#3a3a3c] text-white' : 'bg-gray-50 border-gray-200'
                    }`}
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowIssueScanner(true)}
                  className="w-full sm:w-auto h-10 px-4 flex items-center justify-center gap-2 border-primary text-primary hover:bg-primary/10"
                >
                  <ScanLine className="w-4 h-4" /> Scan
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold uppercase opacity-70 mb-2">Duration (Days)</label>
                <div className="flex gap-2">
                  <Select
                    value={isCustom ? "custom" : durationDays.toString()}
                    onValueChange={(val) => {
                      if (val === "custom") {
                        setIsCustom(true);
                      } else {
                        setIsCustom(false);
                        setDurationDays(Number(val));
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
                  {isCustom && (
                    <input
                      type="number"
                      min="1"
                      placeholder="Days..."
                      value={durationDays}
                      onChange={(e) => setDurationDays(Number(e.target.value) || 1)}
                      className={`w-24 px-3 py-2 text-sm rounded-lg border h-10 focus:outline-none focus:ring-1 focus:ring-primary shrink-0 ${theme === 'dark' ? 'bg-[#1c1c1e] border-[#3a3a3c] text-white' : 'bg-gray-50 border-gray-200'}`}
                    />
                  )}
                </div>
              </div>

              <div className="flex items-end">
                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-gradient-to-r from-primary to-purple-600 hover:from-primary/90 hover:to-purple-600/90 text-white font-semibold h-10 rounded-lg flex items-center justify-center gap-2"
                >
                  <Plus className="w-4 h-4" /> Issue Book
                </Button>
              </div>
            </div>
          </form>
        </Card>

        {/* Quick Return Panel */}
        <Card id="library-return-card" className={`p-6 border shadow-sm ${theme === 'dark' ? 'bg-card border-border text-foreground' : 'bg-white border-gray-200 text-gray-900'}`}>
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2 text-emerald-400">
            <RefreshCw className="w-5 h-5" /> Book Return Desk
          </h3>
          <form onSubmit={handleReturnBookSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase opacity-70 mb-2">Scan or Enter Barcode ID</label>
              <div className="flex flex-col sm:flex-row gap-2">
                <div className="relative flex-1">
                  <input
                    type="text"
                    placeholder="Scan book barcode sticker..."
                    value={barcodeInput}
                    onChange={(e) => setBarcodeInput(e.target.value)}
                    className={`w-full pl-4 pr-10 py-2 h-10 text-sm rounded-lg border focus:outline-none focus:ring-1 focus:ring-primary ${theme === 'dark' ? 'bg-[#1c1c1e] border-[#3a3a3c] text-white' : 'bg-gray-50 border-gray-200'
                      }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowReturnScanner(true)}
                    className="absolute right-2 top-2 p-1 text-primary hover:text-primary/80 transition-colors"
                  >
                    <ScanLine className="w-5 h-5" />
                  </button>
                </div>
                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-500 text-white font-semibold px-6 h-10 rounded-lg flex items-center justify-center gap-1.5"
                >
                  <Check className="w-4 h-4" /> Check-In
                </Button>
              </div>
            </div>
            <div className={`p-4 rounded-lg text-xs leading-relaxed ${theme === 'dark' ? 'bg-[#1c1c1e] text-gray-400' : 'bg-gray-100 text-gray-600'}`}>
              <p className="font-semibold text-primary mb-1">Return Guidelines:</p>
              <ul className="list-disc pl-4 space-y-1">
                <li>Scan the barcode sticker located on the inside cover of the textbook.</li>
                <li>The system will automatically calculate the date difference and prompt if late penalties are due.</li>
                <li>If a student has outstanding holds, the copy will automatically route to the **Reserved** holds queue status.</li>
              </ul>
            </div>
          </form>
        </Card>
      </div>

      {/* Barcode Scanner Modals */}
      <BarcodeScannerModal
        isOpen={showIssueScanner}
        onClose={() => setShowIssueScanner(false)}
        onScan={(result) => setIssueBarcode(result)}
        title="Scan Issue Barcode"
      />
      <BarcodeScannerModal
        isOpen={showReturnScanner}
        onClose={() => setShowReturnScanner(false)}
        onScan={(result) => setBarcodeInput(result)}
        title="Scan Return Barcode"
      />
    </motion.div>
  );
};

export default LibraryOverview;
