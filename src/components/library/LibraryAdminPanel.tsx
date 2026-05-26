import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  BookOpen, Users, ClipboardList, CreditCard,
  Search, Plus, Check, X, RefreshCw, AlertTriangle,
  Calendar, MapPin, Tag, BarChart2, BookOpen as BookIcon
} from "lucide-react";
import Swal from "sweetalert2";
import { Card } from "../ui/card";
import { Button } from "../ui/button";
import { useTheme } from "../../context/ThemeContext";
import {
  fetchLibraryAdminStats,
  fetchLibraryBooks,
  createLibraryBook,
  updateLibraryBook,
  deleteLibraryBook,
  searchBorrowers,
  issueBook,
  returnBook,
  renewBook,
  fetchActiveBorrows,
  fetchFines,
  fetchBookCopies,
  payFine,
  fetchReservations
} from "../../utils/library_api";

interface LibraryAdminPanelProps {
  initialTab?: "overview" | "catalog" | "circulation" | "reserves" | "fines";
}

const LibraryAdminPanel = ({ initialTab = "overview" }: LibraryAdminPanelProps) => {
  const { theme } = useTheme();
  const [activeTab, setActiveTab] = useState(initialTab);
  const [loading, setLoading] = useState(false);

  // Dashboard stats
  const [stats, setStats] = useState({
    total_books: 0,
    total_copies: 0,
    active_borrows: 0,
    overdue_borrows: 0,
    outstanding_fines: 0.00
  });

  // Book Catalog states
  const [books, setBooks] = useState<any[]>([]);
  const [bookSearch, setBookSearch] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedBook, setSelectedBook] = useState<any>(null);
  const [showViewModal, setShowViewModal] = useState(false);
  const [viewingBookCopies, setViewingBookCopies] = useState<any[]>([]);
  const [loadingCopies, setLoadingCopies] = useState(false);
  const [copiesPage, setCopiesPage] = useState(1);
  const [copiesTotalPages, setCopiesTotalPages] = useState(1);

  // Add/Edit Book form
  const [bookForm, setBookForm] = useState({
    title: "",
    author: "",
    isbn: "",
    category: "",
    description: "",
    total_copies: 1,
    physical_location: ""
  });

  // Circulation States
  const [activeBorrows, setActiveBorrows] = useState<any[]>([]);
  const [borrowsPage, setBorrowsPage] = useState(1);
  const [borrowsTotalPages, setBorrowsTotalPages] = useState(1);
  const [barcodeInput, setBarcodeInput] = useState("");
  const [borrowerSearchText, setBorrowerSearchText] = useState("");
  const [suggestedBorrowers, setSuggestedBorrowers] = useState<any[]>([]);
  const [selectedBorrower, setSelectedBorrower] = useState<any>(null);
  const [issueBarcode, setIssueBarcode] = useState("");
  const [durationDays, setDurationDays] = useState(14);

  // Fines and Reservations
  const [fines, setFines] = useState<any[]>([]);
  const [finesPage, setFinesPage] = useState(1);
  const [finesTotalPages, setFinesTotalPages] = useState(1);

  const [reservations, setReservations] = useState<any[]>([]);
  const [reservationsPage, setReservationsPage] = useState(1);
  const [reservationsTotalPages, setReservationsTotalPages] = useState(1);

  // Fetch initial dashboard stats and dynamic lists
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

  const loadBooks = async (query = "") => {
    setLoading(true);
    try {
      const res = await fetchLibraryBooks(query);
      if (Array.isArray(res)) {
        setBooks(res);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const loadCirculation = async (page: number = 1) => {
    setLoading(true);
    try {
      const res = await fetchActiveBorrows(page);
      if (res && res.results) {
        setActiveBorrows(res.results);
        setBorrowsTotalPages(Math.ceil(res.count / 15) || 1);
        setBorrowsPage(page);
      } else if (Array.isArray(res)) {
        setActiveBorrows(res);
        setBorrowsTotalPages(1);
        setBorrowsPage(1);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const loadReservations = async (page: number = 1) => {
    setLoading(true);
    try {
      const res = await fetchReservations(page);
      if (res && res.results) {
        setReservations(res.results);
        setReservationsTotalPages(Math.ceil(res.count / 15) || 1);
        setReservationsPage(page);
      } else if (Array.isArray(res)) {
        setReservations(res);
        setReservationsTotalPages(1);
        setReservationsPage(1);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const loadFines = async (page: number = 1) => {
    setLoading(true);
    try {
      const res = await fetchFines(page);
      if (res && res.results) {
        setFines(res.results);
        setFinesTotalPages(Math.ceil(res.count / 15) || 1);
        setFinesPage(page);
      } else if (Array.isArray(res)) {
        setFines(res);
        setFinesTotalPages(1);
        setFinesPage(1);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === "overview") {
      loadStats();
    } else if (activeTab === "catalog") {
      loadBooks(bookSearch);
    } else if (activeTab === "circulation") {
      loadCirculation();
    } else if (activeTab === "reserves") {
      loadReservations();
    } else if (activeTab === "fines") {
      loadFines();
    }
  }, [activeTab]);

  // Autocomplete search for borrowers (students/teachers)
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

  // --- BOOK CATALOG ACTIONS ---
  const handleSaveBook = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bookForm.title || !bookForm.author) {
      Swal.fire("Error", "Title and Author are required", "error");
      return;
    }

    try {
      setLoading(true);
      let res;
      if (selectedBook) {
        res = await updateLibraryBook(selectedBook.id, bookForm);
        Swal.fire("Success", "Book catalog updated successfully", "success");
      } else {
        res = await createLibraryBook(bookForm);
        Swal.fire("Success", "Book added and barcodes generated!", "success");
      }

      setShowAddModal(false);
      setSelectedBook(null);
      setBookForm({
        title: "",
        author: "",
        isbn: "",
        category: "",
        description: "",
        total_copies: 1,
        physical_location: ""
      });
      if (selectedBook) {
        setBooks(prev => prev.map(b => b.id === selectedBook.id ? { ...b, ...res } : b));
        if (res.total_copies !== selectedBook.total_copies) {
          const diff = res.total_copies - selectedBook.total_copies;
          setStats(prev => ({ ...prev, total_copies: prev.total_copies + diff }));
        }
      } else {
        setBooks(prev => [res, ...prev]);
        setStats(prev => ({
          ...prev,
          total_books: prev.total_books + 1,
          total_copies: prev.total_copies + (res.total_copies || bookForm.total_copies)
        }));
      }
    } catch (err) {
      Swal.fire("Error", "Failed to save book catalog item", "error");
    } finally {
      setLoading(false);
    }
  };

  const loadBookCopiesPage = async (bookId: number, page: number) => {
    setLoadingCopies(true);
    try {
      const res = await fetchBookCopies(bookId, page);
      if (res && res.results) {
        setViewingBookCopies(res.results);
        setCopiesTotalPages(Math.ceil(res.count / 15) || 1);
        setCopiesPage(page);
      } else {
        // Fallback if not paginated
        setViewingBookCopies(Array.isArray(res) ? res : []);
        setCopiesTotalPages(1);
        setCopiesPage(1);
      }
    } catch (err) {
      console.error(err);
      Swal.fire("Error", "Failed to load book copies", "error");
    } finally {
      setLoadingCopies(false);
    }
  };

  const handleViewBookClick = (book: any) => {
    setSelectedBook(book);
    setShowViewModal(true);
    loadBookCopiesPage(book.id, 1);
  };

  const handleEditBookClick = (book: any) => {
    setSelectedBook(book);
    setBookForm({
      title: book.title || "",
      author: book.author || "",
      isbn: book.isbn || "",
      category: book.category || "",
      description: book.description || "",
      total_copies: book.total_copies || 1,
      physical_location: book.physical_location || ""
    });
    setShowAddModal(true);
  };

  const handleDeleteBookClick = async (book: any) => {
    const confirm = await Swal.fire({
      title: `Delete ${book.title}?`,
      text: "This will remove the catalog item and all associated barcode assets. You cannot undo this action.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      confirmButtonText: "Yes, delete"
    });

    if (confirm.isConfirmed) {
      try {
        setLoading(true);
        const res = await deleteLibraryBook(book.id);
        if (res && res.message && res.message.includes("Cannot delete")) {
          Swal.fire("Failed", res.message, "error");
        } else {
          Swal.fire("Deleted", "Book deleted successfully", "success");
          setBooks(prev => prev.filter(b => b.id !== book.id));
          setStats(prev => ({
            ...prev,
            total_books: Math.max(0, prev.total_books - 1),
            total_copies: Math.max(0, prev.total_copies - book.total_copies)
          }));
        }
      } catch (err) {
        Swal.fire("Error", "Failed to delete book catalog", "error");
      } finally {
        setLoading(false);
      }
    }
  };

  // --- CIRCULATION ACTIONS ---
  const handleIssueBookSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBorrower) {
      Swal.fire("Required", "Please search and select a borrower first", "warning");
      return;
    }
    if (!issueBarcode.trim()) {
      Swal.fire("Required", "Please enter or scan a book copy Barcode ID", "warning");
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
        Swal.fire("Issued!", `Book issued successfully to ${selectedBorrower.first_name}! Due date: ${new Date(res.due_date).toLocaleDateString()}`, "success");
        setIssueBarcode("");
        setSelectedBorrower(null);
        setBorrowerSearchText("");
        loadCirculation();
        loadStats();
      } else {
        Swal.fire("Issue Failed", res.message || "Could not issue book. Check barcode status.", "error");
      }
    } catch (err) {
      Swal.fire("Error", "Server error during issuance flow", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleReturnBookSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!barcodeInput.trim()) {
      Swal.fire("Required", "Please enter or scan a barcode ID", "warning");
      return;
    }

    try {
      setLoading(true);
      const res = await returnBook({ barcode_id: barcodeInput.trim() });
      if (res && res.message && res.message.includes("success")) {
        let fineMsg = "";
        if (res.fine_generated) {
          fineMsg = `<br/><span style="color: #ef4444; font-weight: bold;">Overdue Fine Generated: ${res.fine_generated.amount} units!</span>`;
        }
        Swal.fire({
          title: "Book Checked-In!",
          html: `Barcode <b>${barcodeInput}</b> successfully returned and restocked.${fineMsg}`,
          icon: "success"
        });
        setBarcodeInput("");
        loadCirculation();
        loadStats();
      } else {
        Swal.fire("Error", res.message || "Failed to process book return", "error");
      }
    } catch (err) {
      Swal.fire("Error", "Server error processing check-in", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleRenewClick = async (borrowId: number) => {
    try {
      setLoading(true);
      const res = await renewBook(borrowId);
      if (res && res.id) {
        Swal.fire("Success", "Borrow duration extended successfully by 14 days", "success");
        loadCirculation();
      } else {
        Swal.fire("Renewal Refused", res.message || "Could not renew book. Check reservation holds.", "error");
      }
    } catch (err) {
      Swal.fire("Error", "Renewal failed on server side", "error");
    } finally {
      setLoading(false);
    }
  };

  // --- FINES ACTIONS ---
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
          loadFines();
          loadStats();
        }
      } catch (err) {
        Swal.fire("Error", "Failed to mark fine as paid", "error");
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <div className={`p-1 md:p-4 min-h-screen ${theme === "dark" ? "text-white" : "text-gray-900"}`}>

      {/* Metrics Cards */}
      {activeTab === "overview" && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
          <Card className={`p-5 flex flex-col justify-between border ${theme === 'dark' ? 'bg-[#2c2c2e]/60 border-[#3a3a3c] text-white' : 'bg-white border-gray-200'} shadow-md hover:shadow-lg transition-shadow`}>
            <div>
              <p className="text-xs uppercase tracking-wider font-semibold opacity-70">Catalog Titles</p>
              <h2 className="text-3xl font-extrabold mt-1">{stats.total_books}</h2>
            </div>
            <div className="flex items-center justify-between mt-4">
              <span className="text-[10px] bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded font-semibold">Catalog</span>
              <BookIcon className="w-5 h-5 opacity-60 text-blue-400" />
            </div>
          </Card>

          <Card className={`p-5 flex flex-col justify-between border ${theme === 'dark' ? 'bg-[#2c2c2e]/60 border-[#3a3a3c] text-white' : 'bg-white border-gray-200'} shadow-md hover:shadow-lg transition-shadow`}>
            <div>
              <p className="text-xs uppercase tracking-wider font-semibold opacity-70">Physical Copies</p>
              <h2 className="text-3xl font-extrabold mt-1">{stats.total_copies}</h2>
            </div>
            <div className="flex items-center justify-between mt-4">
              <span className="text-[10px] bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded font-semibold">Copies</span>
              <Tag className="w-5 h-5 opacity-60 text-emerald-400" />
            </div>
          </Card>

          <Card className={`p-5 flex flex-col justify-between border ${theme === 'dark' ? 'bg-[#2c2c2e]/60 border-[#3a3a3c] text-white' : 'bg-white border-gray-200'} shadow-md hover:shadow-lg transition-shadow`}>
            <div>
              <p className="text-xs uppercase tracking-wider font-semibold opacity-70">Active Borrows</p>
              <h2 className="text-3xl font-extrabold mt-1">{stats.active_borrows}</h2>
            </div>
            <div className="flex items-center justify-between mt-4">
              <span className="text-[10px] bg-purple-500/20 text-purple-400 px-2 py-0.5 rounded font-semibold">On Loan</span>
              <Users className="w-5 h-5 opacity-60 text-purple-400" />
            </div>
          </Card>

          <Card className={`p-5 flex flex-col justify-between border ${theme === 'dark' ? 'bg-[#2c2c2e]/60 border-[#3a3a3c] text-white' : 'bg-white border-gray-200'} shadow-md hover:shadow-lg transition-shadow ${stats.overdue_borrows > 0 ? 'ring-2 ring-red-500/50 bg-red-950/20' : ''}`}>
            <div>
              <p className="text-xs uppercase tracking-wider font-semibold opacity-70">Overdue Books</p>
              <h2 className="text-3xl font-extrabold mt-1 text-red-500">{stats.overdue_borrows}</h2>
            </div>
            <div className="flex items-center justify-between mt-4">
              <span className={`text-[10px] px-2 py-0.5 rounded font-semibold ${stats.overdue_borrows > 0 ? 'bg-red-500/30 text-red-400 animate-pulse' : 'bg-gray-500/20 text-gray-400'}`}>Warning</span>
              <AlertTriangle className="w-5 h-5 opacity-60 text-red-500" />
            </div>
          </Card>

          <Card className={`p-5 flex flex-col justify-between border ${theme === 'dark' ? 'bg-[#2c2c2e]/60 border-[#3a3a3c] text-white' : 'bg-white border-gray-200'} shadow-md hover:shadow-lg transition-shadow`}>
            <div>
              <p className="text-md uppercase tracking-wider font-semibold opacity-70">Total Unpaid Fines</p>
              <h2 className="text-3xl font-bold mt-1 text-amber-400">{stats.outstanding_fines.toFixed(2)}</h2>
            </div>
            <div className="flex items-center justify-between mt-4">
              <span className="text-[10px] bg-amber-500/20 text-amber-400 px-2 py-0.5 rounded font-semibold">Fines</span>
              <CreditCard className="w-5 h-5 opacity-60 text-amber-400" />
            </div>
          </Card>
        </div>
      )}

      {/* Main Tab Content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
        >
          {/* TAB 1: OVERVIEW */}
          {activeTab === "overview" && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Quick Issue Panel */}
              <Card className={`p-6 border ${theme === 'dark' ? 'bg-[#2c2c2e]/60 border-[#3a3a3c] text-white' : 'bg-white border-gray-200'} shadow-md`}>
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
                        <div className={`absolute left-0 right-0 top-11 max-h-48 overflow-y-auto rounded-lg border z-10 ${theme === 'dark' ? 'bg-[#2c2c2e] border-[#3a3a3c]' : 'bg-white border-gray-200'
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
                    <input
                      type="text"
                      placeholder="e.g. BAR-1-001"
                      value={issueBarcode}
                      onChange={(e) => setIssueBarcode(e.target.value)}
                      className={`w-full px-4 py-2 text-sm rounded-lg border focus:outline-none focus:ring-1 focus:ring-primary ${theme === 'dark' ? 'bg-[#1c1c1e] border-[#3a3a3c] text-white' : 'bg-gray-50 border-gray-200'
                        }`}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold uppercase opacity-70 mb-2">Duration (Days)</label>
                      <select
                        value={durationDays}
                        onChange={(e) => setDurationDays(Number(e.target.value))}
                        className={`w-full px-3 py-2 text-sm rounded-lg border focus:outline-none focus:ring-1 focus:ring-primary ${theme === 'dark' ? 'bg-[#1c1c1e] border-[#3a3a3c] text-white' : 'bg-gray-50 border-gray-200'
                          }`}
                      >
                        <option value={7}>7 Days</option>
                        <option value={14}>14 Days</option>
                        <option value={21}>21 Days</option>
                        <option value={30}>30 Days</option>
                      </select>
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
              <Card className={`p-6 border ${theme === 'dark' ? 'bg-[#2c2c2e]/60 border-[#3a3a3c] text-white' : 'bg-white border-gray-200'} shadow-md`}>
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2 text-emerald-400">
                  <RefreshCw className="w-5 h-5" /> Book Return Desk
                </h3>
                <form onSubmit={handleReturnBookSubmit} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold uppercase opacity-70 mb-2">Scan or Enter Barcode ID</label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Scan book barcode sticker..."
                        value={barcodeInput}
                        onChange={(e) => setBarcodeInput(e.target.value)}
                        className={`flex-1 px-4 py-2 text-sm rounded-lg border focus:outline-none focus:ring-1 focus:ring-primary ${theme === 'dark' ? 'bg-[#1c1c1e] border-[#3a3a3c] text-white' : 'bg-gray-50 border-gray-200'
                          }`}
                      />
                      <Button
                        type="submit"
                        disabled={loading}
                        className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold px-6 h-10 rounded-lg flex items-center gap-1.5"
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
          )}

          {/* TAB 2: BOOKS CATALOG */}
          {activeTab === "catalog" && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row justify-between items-center gap-3">
                <div className="relative w-full sm:w-80">
                  <Search className="absolute left-3 top-2.5 w-4 h-4 opacity-50" />
                  <input
                    type="text"
                    placeholder="Search by Title, Author, or ISBN..."
                    value={bookSearch}
                    onChange={(e) => {
                      setBookSearch(e.target.value);
                      loadBooks(e.target.value);
                    }}
                    className={`w-full pl-9 pr-4 py-2 text-sm rounded-lg border focus:outline-none focus:ring-1 focus:ring-primary ${theme === 'dark' ? 'bg-[#2c2c2e]/60 border-[#3a3a3c] text-white' : 'bg-white border-gray-200'
                      }`}
                  />
                </div>
                <Button
                  onClick={() => {
                    setSelectedBook(null);
                    setBookForm({
                      title: "",
                      author: "",
                      isbn: "",
                      category: "",
                      description: "",
                      total_copies: 1,
                      physical_location: ""
                    });
                    setShowAddModal(true);
                  }}
                  className="w-full sm:w-auto bg-primary hover:bg-primary/95 text-white font-semibold px-4 py-2 rounded-lg flex items-center justify-center gap-2"
                >
                  <Plus className="w-4 h-4" /> Add Book Title
                </Button>
              </div>

              {/* Books List Grid/Table */}
              <Card className={`border overflow-hidden ${theme === 'dark' ? 'bg-[#2c2c2e]/60 border-[#3a3a3c] text-white' : 'bg-white border-gray-200'} shadow-md`}>
                <div className="overflow-x-auto thin-scrollbar">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className={`border-b text-xs uppercase tracking-wider font-semibold ${theme === 'dark' ? 'bg-[#1c1c1e] border-[#3a3a3c] text-gray-400' : 'bg-gray-50 border-gray-200 text-gray-600'
                        }`}>
                        <th className="p-4">Book Title</th>
                        <th className="p-4">Author</th>
                        <th className="p-4">ISBN</th>
                        <th className="p-4">Category</th>
                        <th className="p-4">Location</th>
                        <th className="p-4 text-center">Copies (Avail/Total)</th>
                        <th className="p-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {books.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="text-center p-8 opacity-60 text-sm">
                            No books cataloged matching the search query. Add a book to populate!
                          </td>
                        </tr>
                      ) : (
                        books.map((book) => (
                          <tr key={book.id} className={`border-b text-sm transition-colors ${theme === 'dark' ? 'border-[#3a3a3c] hover:bg-[#1c1c1e]/40' : 'border-gray-200 hover:bg-gray-50'
                            }`}>
                            <td className="p-4 font-semibold">{book.title}</td>
                            <td className="p-4 opacity-80">{book.author}</td>
                            <td className="p-4 font-mono text-xs opacity-70">{book.isbn || "N/A"}</td>
                            <td className="p-4">
                              <span className="text-xs px-2.5 py-0.5 rounded-full font-semibold bg-primary/20 text-primary-foreground capitalize">
                                {book.category || "General"}
                              </span>
                            </td>
                            <td className="p-4 text-xs font-semibold flex items-center gap-1 mt-1 opacity-70">
                              <MapPin className="w-3.5 h-3.5 text-primary" /> {book.physical_location || "Not set"}
                            </td>
                            <td className="p-4 text-center font-semibold">
                              <span className={book.available_copies > 0 ? "text-emerald-500" : "text-red-500"}>
                                {book.available_copies}
                              </span>
                              <span className="opacity-50"> / {book.total_copies}</span>
                            </td>
                            <td className="p-4 text-right space-x-3 whitespace-nowrap">
                              <button
                                onClick={() => handleViewBookClick(book)}
                                className="text-xs text-blue-500 font-semibold hover:underline"
                              >
                                View
                              </button>
                              <button
                                onClick={() => handleEditBookClick(book)}
                                className="text-xs text-primary font-semibold hover:underline"
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => handleDeleteBookClick(book)}
                                className="text-xs text-red-500 font-semibold hover:underline"
                              >
                                Delete
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </Card>

              {/* Add/Edit Catalog Modal */}
              {showAddModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                  <motion.div
                    initial={{ scale: 0.95, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className={`w-full max-w-lg rounded-xl border p-6 shadow-2xl ${theme === 'dark' ? 'bg-[#2c2c2e] border-[#3a3a3c] text-white' : 'bg-white border-gray-200'
                      }`}
                  >
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="text-lg font-semibold">
                        {selectedBook ? "Edit Catalog Item" : "Add New Book Title"}
                      </h3>
                      <X className="w-5 h-5 cursor-pointer" onClick={() => setShowAddModal(false)} />
                    </div>
                    <form onSubmit={handleSaveBook} className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="col-span-2">
                          <label className="block text-xs uppercase tracking-wider font-semibold opacity-70 mb-1">Book Title *</label>
                          <input
                            type="text"
                            required
                            value={bookForm.title}
                            onChange={(e) => setBookForm({ ...bookForm, title: e.target.value })}
                            className={`w-full px-4 py-2 text-sm rounded-lg border focus:outline-none focus:ring-1 focus:ring-primary ${theme === 'dark' ? 'bg-[#1c1c1e] border-[#3a3a3c] text-white' : 'bg-gray-50 border-gray-200'
                              }`}
                          />
                        </div>

                        <div>
                          <label className="block text-xs uppercase tracking-wider font-semibold opacity-70 mb-1">Author *</label>
                          <input
                            type="text"
                            required
                            value={bookForm.author}
                            onChange={(e) => setBookForm({ ...bookForm, author: e.target.value })}
                            className={`w-full px-4 py-2 text-sm rounded-lg border focus:outline-none focus:ring-1 focus:ring-primary ${theme === 'dark' ? 'bg-[#1c1c1e] border-[#3a3a3c] text-white' : 'bg-gray-50 border-gray-200'
                              }`}
                          />
                        </div>

                        <div>
                          <label className="block text-xs uppercase tracking-wider font-semibold opacity-70 mb-1">ISBN Code</label>
                          <input
                            type="text"
                            value={bookForm.isbn}
                            onChange={(e) => setBookForm({ ...bookForm, isbn: e.target.value })}
                            className={`w-full px-4 py-2 text-sm rounded-lg border focus:outline-none focus:ring-1 focus:ring-primary ${theme === 'dark' ? 'bg-[#1c1c1e] border-[#3a3a3c] text-white' : 'bg-gray-50 border-gray-200'
                              }`}
                          />
                        </div>

                        <div>
                          <label className="block text-xs uppercase tracking-wider font-semibold opacity-70 mb-1">Genre/Category</label>
                          <select
                            value={bookForm.category}
                            onChange={(e) => setBookForm({ ...bookForm, category: e.target.value })}
                            className={`w-full px-4 py-2 text-sm rounded-lg border focus:outline-none focus:ring-1 focus:ring-primary ${theme === 'dark' ? 'bg-[#1c1c1e] border-[#3a3a3c] text-white' : 'bg-gray-50 border-gray-200'
                              }`}
                          >
                            <option value="">Select Category</option>
                            <option value="Computer Science">Computer Science</option>
                            <option value="Engineering">Engineering</option>
                            <option value="Mathematics">Mathematics</option>
                            <option value="Physics">Physics</option>
                            <option value="Chemistry">Chemistry</option>
                            <option value="Biology">Biology</option>
                            <option value="Business & Management">Business & Management</option>
                            <option value="Literature">Literature</option>
                            <option value="History">History</option>
                            <option value="General Fiction">General Fiction</option>
                            <option value="Non-Fiction">Non-Fiction</option>
                            <option value="Reference">Reference</option>
                            <option value="Other">Other</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-xs uppercase tracking-wider font-semibold opacity-70 mb-1">Shelf Location</label>
                          <input
                            type="text"
                            placeholder="e.g. Row 3, Rack A"
                            value={bookForm.physical_location}
                            onChange={(e) => setBookForm({ ...bookForm, physical_location: e.target.value })}
                            className={`w-full px-4 py-2 text-sm rounded-lg border focus:outline-none focus:ring-1 focus:ring-primary ${theme === 'dark' ? 'bg-[#1c1c1e] border-[#3a3a3c] text-white' : 'bg-gray-50 border-gray-200'
                              }`}
                          />
                        </div>

                        <div className="col-span-2">
                          <label className="block text-xs uppercase tracking-wider font-semibold opacity-70 mb-1">Brief Description</label>
                          <textarea
                            rows={3}
                            value={bookForm.description}
                            onChange={(e) => setBookForm({ ...bookForm, description: e.target.value })}
                            className={`w-full px-4 py-2 text-sm rounded-lg border focus:outline-none focus:ring-1 focus:ring-primary ${theme === 'dark' ? 'bg-[#1c1c1e] border-[#3a3a3c] text-white' : 'bg-gray-50 border-gray-200'
                              }`}
                          />
                        </div>

                        <div>
                          <label className="block text-xs uppercase tracking-wider font-semibold opacity-70 mb-1">Total Copies</label>
                          <input
                            type="number"
                            min={1}
                            value={bookForm.total_copies}
                            onChange={(e) => setBookForm({ ...bookForm, total_copies: Number(e.target.value) })}
                            className={`w-full px-4 py-2 text-sm rounded-lg border focus:outline-none focus:ring-1 focus:ring-primary ${theme === 'dark' ? 'bg-[#1c1c1e] border-[#3a3a3c] text-white' : 'bg-gray-50 border-gray-200'
                              }`}
                          />
                        </div>
                      </div>

                      <div className="flex justify-end gap-2 pt-4 border-t border-gray-200 dark:border-[#3a3a3c]">
                        <Button
                          type="button"
                          onClick={() => setShowAddModal(false)}
                          className="bg-transparent hover:bg-gray-500/10 text-gray-500 border border-gray-500/20"
                        >
                          Cancel
                        </Button>
                        <Button
                          type="submit"
                          disabled={loading}
                          className="bg-primary hover:bg-primary/90 text-white font-semibold"
                        >
                          Save Book Title
                        </Button>
                      </div>
                    </form>
                  </motion.div>
                </div>
              )}
              {/* View Book Copies Modal */}
              {showViewModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                  <motion.div
                    initial={{ scale: 0.95, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className={`w-full max-w-4xl p-6 rounded-2xl shadow-2xl overflow-y-auto max-h-[90vh] ${theme === 'dark' ? 'bg-[#1c1c1e] text-white border border-[#3a3a3c]' : 'bg-white text-gray-900'
                      }`}
                  >
                    <div className="flex justify-between items-center mb-6 border-b pb-3 border-gray-200 dark:border-[#3a3a3c]">
                      <div>
                        <h2 className="text-xl font-semibold">{selectedBook?.title}</h2>
                        <p className="text-sm opacity-70">Physical Copies & Circulation Status</p>
                      </div>
                      <button onClick={() => setShowViewModal(false)} className="opacity-70 hover:opacity-100 p-2">
                        <X className="w-6 h-6" />
                      </button>
                    </div>

                    {loadingCopies ? (
                      <div className="p-10 text-center opacity-70">Loading barcode copies...</div>
                    ) : (
                      <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-[#3a3a3c]">
                        <table className="w-full text-left border-collapse">
                          <thead>
                            <tr className={`border-b text-xs uppercase tracking-wider font-semibold ${theme === 'dark' ? 'bg-[#2c2c2e] text-gray-400' : 'bg-gray-50 text-gray-600'
                              }`}>
                              <th className="p-3">Barcode ID</th>
                              <th className="p-3">Status</th>
                              <th className="p-3">Current Borrower</th>
                              <th className="p-3">Contact</th>
                              <th className="p-3">Due Status</th>
                            </tr>
                          </thead>
                          <tbody>
                            {viewingBookCopies.length === 0 ? (
                              <tr>
                                <td colSpan={5} className="text-center p-6 opacity-60 text-sm">No physical copies generated for this book.</td>
                              </tr>
                            ) : (
                              viewingBookCopies.map((copy) => (
                                <tr key={copy.id} className={`border-b last:border-0 ${theme === 'dark' ? 'border-[#3a3a3c]' : 'border-gray-100'} hover:bg-black/5`}>
                                  <td className="p-3 font-mono font-semibold text-sm text-primary">{copy.barcode_id}</td>
                                  <td className="p-3">
                                    <span className={`px-2 py-1 text-[14px] font-semibold uppercase rounded-full ${copy.status === 'available' ? 'bg-emerald-500/20 text-emerald-500' :
                                        copy.status === 'borrowed' ? 'bg-blue-500/20 text-blue-500' :
                                          'bg-red-500/20 text-red-500'
                                      }`}>
                                      {copy.status}
                                    </span>
                                  </td>
                                  <td className="p-3 text-sm">
                                    {copy.current_borrower ? (
                                      <span className="font-semibold">{copy.current_borrower.user_name}</span>
                                    ) : (
                                      <span className="opacity-40">-</span>
                                    )}
                                  </td>
                                  <td className="p-3 text-sm">
                                    {copy.current_borrower ? (
                                      <div className="flex flex-col opacity-80 text-xs">
                                        <span>{copy.current_borrower.user_email}</span>
                                        <span>{copy.current_borrower.user_mobile}</span>
                                      </div>
                                    ) : (
                                      <span className="opacity-40">-</span>
                                    )}
                                  </td>
                                  <td className="p-3 text-sm">
                                    {copy.current_borrower ? (
                                      <div className="flex flex-col text-xs">
                                        <span className="opacity-70">Due: {new Date(copy.current_borrower.due_date).toLocaleDateString()}</span>
                                        {copy.current_borrower.overdue_days > 0 ? (
                                          <span className="text-red-500 font-semibold">{copy.current_borrower.overdue_days} days overdue (Fine: ₹{copy.current_borrower.fine_amount})</span>
                                        ) : (
                                          <span className="text-emerald-500">On time</span>
                                        )}
                                      </div>
                                    ) : (
                                      <span className="opacity-40">-</span>
                                    )}
                                  </td>
                                </tr>
                              ))
                            )}
                          </tbody>
                        </table>
                      </div>
                    )}

                    {!loadingCopies && copiesTotalPages > 1 && (
                      <div className="flex justify-between items-center mt-4 text-sm">
                        <span className="opacity-70">
                          Page {copiesPage} of {copiesTotalPages}
                        </span>
                        <div className="flex gap-2">
                          <Button
                            disabled={copiesPage === 1}
                            onClick={() => loadBookCopiesPage(selectedBook.id, copiesPage - 1)}
                            className="px-3 py-1 bg-gray-100 hover:bg-gray-200 text-gray-800 dark:bg-[#2c2c2e] dark:hover:bg-[#3a3a3c] dark:text-gray-200"
                          >
                            Previous
                          </Button>
                          <Button
                            disabled={copiesPage === copiesTotalPages}
                            onClick={() => loadBookCopiesPage(selectedBook.id, copiesPage + 1)}
                            className="px-3 py-1 bg-gray-100 hover:bg-gray-200 text-gray-800 dark:bg-[#2c2c2e] dark:hover:bg-[#3a3a3c] dark:text-gray-200"
                          >
                            Next
                          </Button>
                        </div>
                      </div>
                    )}
                  </motion.div>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: CIRCULATION */}
          {activeTab === "circulation" && (
            <div className="space-y-6">
              {/* List of active borrows */}
              <Card className={`border overflow-hidden ${theme === 'dark' ? 'bg-[#2c2c2e]/60 border-[#3a3a3c] text-white' : 'bg-white border-gray-200'} shadow-md`}>
                <div className="p-4 border-b border-gray-200 dark:border-[#3a3a3c] flex justify-between items-center">
                  <h3 className="text-md font-semibold">Currently Lent Books</h3>
                  <button
                    onClick={loadCirculation}
                    className="p-1.5 hover:bg-primary/10 rounded-full text-primary transition-colors"
                  >
                    <RefreshCw className="w-4 h-4" />
                  </button>
                </div>
                <div className="overflow-x-auto thin-scrollbar">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className={`border-b text-xs uppercase tracking-wider font-semibold ${theme === 'dark' ? 'bg-[#1c1c1e] border-[#3a3a3c] text-gray-400' : 'bg-gray-50 border-gray-200 text-gray-600'
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
                          <tr key={borrow.id} className={`border-b text-sm transition-colors ${theme === 'dark' ? 'border-[#3a3a3c] hover:bg-[#1c1c1e]/40' : 'border-gray-200 hover:bg-gray-50'
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
                              <Button
                                size="sm"
                                disabled={loading}
                                onClick={() => handleRenewClick(borrow.id)}
                                className="bg-primary/20 hover:bg-primary/30 text-primary-foreground font-semibold px-3.5 py-1 text-xs rounded"
                              >
                                Renew (14d)
                              </Button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>

                  {!loading && borrowsTotalPages > 1 && (
                    <div className="flex justify-between items-center p-4 border-t border-gray-200 dark:border-[#3a3a3c] text-sm">
                      <span className="opacity-70">
                        Page {borrowsPage} of {borrowsTotalPages}
                      </span>
                      <div className="flex gap-2">
                        <Button
                          disabled={borrowsPage === 1}
                          onClick={() => loadCirculation(borrowsPage - 1)}
                          className="px-3 py-1 bg-gray-100 hover:bg-gray-200 text-gray-800 dark:bg-[#2c2c2e] dark:hover:bg-[#3a3a3c] dark:text-gray-200"
                        >
                          Previous
                        </Button>
                        <Button
                          disabled={borrowsPage === borrowsTotalPages}
                          onClick={() => loadCirculation(borrowsPage + 1)}
                          className="px-3 py-1 bg-gray-100 hover:bg-gray-200 text-gray-800 dark:bg-[#2c2c2e] dark:hover:bg-[#3a3a3c] dark:text-gray-200"
                        >
                          Next
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </Card>
            </div>
          )}

          {/* TAB 4: HOLDS WAITLIST */}
          {activeTab === "reserves" && (
            <Card className={`border overflow-hidden ${theme === 'dark' ? 'bg-[#2c2c2e]/60 border-[#3a3a3c] text-white' : 'bg-white border-gray-200'} shadow-md`}>
              <div className="overflow-x-auto thin-scrollbar">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className={`border-b text-xs uppercase tracking-wider font-semibold ${theme === 'dark' ? 'bg-[#1c1c1e] border-[#3a3a3c] text-gray-400' : 'bg-gray-50 border-gray-200 text-gray-600'
                      }`}>
                      <th className="p-4">Student</th>
                      <th className="p-4">Requested Book</th>
                      <th className="p-4">Author</th>
                      <th className="p-4">Date Reserved</th>
                      <th className="p-4">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reservations.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="text-center p-8 opacity-60 text-sm">
                          No active holds/reservations. Books are currently in good supply!
                        </td>
                      </tr>
                    ) : (
                      reservations.map((res) => (
                        <tr key={res.id} className={`border-b text-sm transition-colors ${theme === 'dark' ? 'border-[#3a3a3c] hover:bg-[#1c1c1e]/40' : 'border-gray-200 hover:bg-gray-50'
                          }`}>
                          <td className="p-4 font-semibold">{res.user_details?.first_name} {res.user_details?.last_name}</td>
                          <td className="p-4 font-semibold">{res.book_details?.title}</td>
                          <td className="p-4 opacity-70">{res.book_details?.author}</td>
                          <td className="p-4 text-xs opacity-70">{new Date(res.reserved_date).toLocaleDateString()}</td>
                          <td className="p-4">
                            <span className={`text-[10px] px-2.5 py-0.5 rounded-full font-semibold capitalize ${res.status === "allocated"
                                ? "bg-emerald-500/20 text-emerald-400"
                                : res.status === "pending"
                                  ? "bg-amber-500/20 text-amber-400 animate-pulse"
                                  : "bg-gray-500/20 text-gray-400"
                              }`}>
                              {res.status}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>

                {!loading && reservationsTotalPages > 1 && (
                  <div className="flex justify-between items-center p-4 border-t border-gray-200 dark:border-[#3a3a3c] text-sm">
                    <span className="opacity-70">
                      Page {reservationsPage} of {reservationsTotalPages}
                    </span>
                    <div className="flex gap-2">
                      <Button
                        disabled={reservationsPage === 1}
                        onClick={() => loadReservations(reservationsPage - 1)}
                        className="px-3 py-1 bg-gray-100 hover:bg-gray-200 text-gray-800 dark:bg-[#2c2c2e] dark:hover:bg-[#3a3a3c] dark:text-gray-200"
                      >
                        Previous
                      </Button>
                      <Button
                        disabled={reservationsPage === reservationsTotalPages}
                        onClick={() => loadReservations(reservationsPage + 1)}
                        className="px-3 py-1 bg-gray-100 hover:bg-gray-200 text-gray-800 dark:bg-[#2c2c2e] dark:hover:bg-[#3a3a3c] dark:text-gray-200"
                      >
                        Next
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </Card>
          )}

          {/* TAB 5: FINES */}
          {activeTab === "fines" && (
            <Card className={`border overflow-hidden ${theme === 'dark' ? 'bg-[#2c2c2e]/60 border-[#3a3a3c] text-white' : 'bg-white border-gray-200'} shadow-md`}>
              <div className="overflow-x-auto thin-scrollbar">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className={`border-b text-xs uppercase tracking-wider font-semibold ${theme === 'dark' ? 'bg-[#1c1c1e] border-[#3a3a3c] text-gray-400' : 'bg-gray-50 border-gray-200 text-gray-600'
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
                        <td colSpan={6} className="text-center p-8 opacity-60 text-sm">
                          All fine records are fully settled! Perfect score.
                        </td>
                      </tr>
                    ) : (
                      fines.map((fine) => (
                        <tr key={fine.id} className={`border-b text-sm transition-colors ${theme === 'dark' ? 'border-[#3a3a3c] hover:bg-[#1c1c1e]/40' : 'border-gray-200 hover:bg-gray-50'
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

                {!loading && finesTotalPages > 1 && (
                  <div className="flex justify-between items-center p-4 border-t border-gray-200 dark:border-[#3a3a3c] text-sm">
                    <span className="opacity-70">
                      Page {finesPage} of {finesTotalPages}
                    </span>
                    <div className="flex gap-2">
                      <Button
                        disabled={finesPage === 1}
                        onClick={() => loadFines(finesPage - 1)}
                        className="px-3 py-1 bg-gray-100 hover:bg-gray-200 text-gray-800 dark:bg-[#2c2c2e] dark:hover:bg-[#3a3a3c] dark:text-gray-200"
                      >
                        Previous
                      </Button>
                      <Button
                        disabled={finesPage === finesTotalPages}
                        onClick={() => loadFines(finesPage + 1)}
                        className="px-3 py-1 bg-gray-100 hover:bg-gray-200 text-gray-800 dark:bg-[#2c2c2e] dark:hover:bg-[#3a3a3c] dark:text-gray-200"
                      >
                        Next
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </Card>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
};

export default LibraryAdminPanel;
