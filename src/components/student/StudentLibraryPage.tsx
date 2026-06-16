import React, { useState, useEffect, useRef } from "react";
import { useTheme } from "../../context/ThemeContext";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "../ui/card";
import { Button } from "../ui/button";
import { SkeletonList } from "../ui/skeleton";
import {
  fetchStudentLibraryDashboard,
  fetchStudentBorrows,
  searchCatalog,
  requestReservation
} from "../../utils/library_api";
import {
  BookOpen, Clock, CheckCircle, AlertTriangle,
  Search, Calendar, Tag, CreditCard, BookMarked,
  ChevronLeft, ChevronRight, MapPin
} from "lucide-react";
import Swal from "sweetalert2";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem
} from "../ui/select";

type TabType = 'taken' | 'overdue' | 'returned' | 'catalog';

const PAGE_SIZE = 15;

const StudentLibraryPage: React.FC = () => {
  const { theme } = useTheme();
  const [tab, setTab] = useState<TabType>('taken');

  // Track which tabs have already been fetched so we don't re-fetch on revisit
  const fetchedTabs = useRef<Set<string>>(new Set());

  // Dashboard summary – fetched once on mount
  const [summary, setSummary] = useState({
    taken_count: 0,
    overdue_count: 0,
    returned_count: 0,
    total_unpaid_fine: 0.00
  });

  // --- Borrow list state (shared across taken/overdue/returned tabs) ---
  const [borrows, setBorrows] = useState<any[]>([]);
  const [borrowsLoading, setBorrowsLoading] = useState(false);
  const [borrowsPage, setBorrowsPage] = useState(1);
  const [borrowsTotalPages, setBorrowsTotalPages] = useState(1);
  const [borrowsCount, setBorrowsCount] = useState(0);

  // --- Catalog state ---
  const [catalogSearch, setCatalogSearch] = useState("");
  const [catalogResults, setCatalogResults] = useState<any[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [catalogPage, setCatalogPage] = useState(1);
  const [catalogTotalPages, setCatalogTotalPages] = useState(1);
  const [catalogCount, setCatalogCount] = useState(0);

  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [selectedAvailability, setSelectedAvailability] = useState<string>("all");
  const [categoriesList, setCategoriesList] = useState<string[]>([]);

  useEffect(() => {
    if (catalogResults.length > 0) {
      const cats = Array.from(new Set(catalogResults.map((b: any) => b.category).filter(Boolean))) as string[];
      setCategoriesList(prev => {
        const combined = [...prev, ...cats];
        return Array.from(new Set(combined));
      });
    }
  }, [catalogResults]);

  const bg = theme === 'dark' ? 'bg-background text-foreground' : 'bg-gray-50 text-gray-900';
  const card = theme === 'dark' ? 'bg-card border-border' : 'bg-white border-gray-100';

  // ─── Loaders ──────────────────────────────────────────────────────────────

  const loadDashboard = async () => {
    try {
      const res = await fetchStudentLibraryDashboard();
      if (res && !res.detail) setSummary(res);
    } catch (err) {
      console.error(err);
    }
  };

  const loadBorrows = async (status: string, page: number = 1) => {
    setBorrowsLoading(true);
    try {
      const res = await fetchStudentBorrows(status, page);
      if (res && res.results) {
        setBorrows(res.results);
        setBorrowsCount(res.count || 0);
        setBorrowsTotalPages(Math.ceil(res.count / PAGE_SIZE) || 1);
        setBorrowsPage(page);
      } else if (Array.isArray(res)) {
        setBorrows(res);
        setBorrowsCount(res.length);
        setBorrowsTotalPages(1);
        setBorrowsPage(1);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setBorrowsLoading(false);
    }
  };

  const loadCatalog = async (query: string, page: number = 1) => {
    setCatalogLoading(true);
    try {
      const res = await searchCatalog(query, page);
      if (res && res.results) {
        setCatalogResults(res.results);
        setCatalogCount(res.count || 0);
        setCatalogTotalPages(Math.ceil(res.count / PAGE_SIZE) || 1);
        setCatalogPage(page);
      } else if (Array.isArray(res)) {
        setCatalogResults(res);
        setCatalogCount(res.length);
        setCatalogTotalPages(1);
        setCatalogPage(1);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setCatalogLoading(false);
    }
  };

  // ─── Effects ──────────────────────────────────────────────────────────────

  // Load dashboard stats once
  useEffect(() => {
    loadDashboard();
  }, []);

  // Load data only when a tab is first visited — no re-fetch on revisit
  useEffect(() => {
    if (tab === 'catalog') {
      // Catalog is always search-driven; load empty list on first visit only
      if (!fetchedTabs.current.has('catalog')) {
        fetchedTabs.current.add('catalog');
        loadCatalog("", 1);
      }
      return;
    }

    const cacheKey = tab; // 'taken' | 'overdue' | 'returned'
    if (!fetchedTabs.current.has(cacheKey)) {
      fetchedTabs.current.add(cacheKey);
      // Reset pagination when switching to a fresh tab
      setBorrowsPage(1);
      setBorrowsTotalPages(1);
      setBorrows([]);
      loadBorrows(tab, 1);
    } else {
      // Tab was already loaded — just show the cached state (no API call)
    }
  }, [tab]);

  // Catalog search debounce — reset to page 1 on new search
  useEffect(() => {
    if (tab !== 'catalog') return;
    const timeout = setTimeout(() => {
      // Invalidate cache so a new search always refetches
      fetchedTabs.current.delete('catalog');
      fetchedTabs.current.add('catalog');
      loadCatalog(catalogSearch, 1);
    }, 400);
    return () => clearTimeout(timeout);
  }, [catalogSearch]);

  // ─── Pagination helpers ───────────────────────────────────────────────────

  const handleBorrowsPageChange = (newPage: number) => {
    loadBorrows(tab, newPage);
  };

  const handleCatalogPageChange = (newPage: number) => {
    loadCatalog(catalogSearch, newPage);
  };

  // ─── Actions ─────────────────────────────────────────────────────────────

  const handleReserve = async (bookId: number, bookTitle: string) => {
    const confirm = await Swal.fire({
      title: "Place a Hold?",
      text: `Request a reservation for "${bookTitle}"? You'll be added to the waitlist.`,
      icon: "question",
      showCancelButton: true,
      confirmButtonText: "Yes, Reserve"
    });

    if (confirm.isConfirmed) {
      try {
        const res = await requestReservation(bookId);
        if (res && res.id) {
          Swal.fire("Reserved!", "You have been added to the waitlist. You'll be notified when a copy is available.", "success");
          // Refresh catalog on current page
          loadCatalog(catalogSearch, catalogPage);
        } else {
          Swal.fire("Info", res.message || "Could not place reservation", "info");
        }
      } catch (err) {
        Swal.fire("Error", "Failed to place reservation", "error");
      }
    }
  };

  const getDaysRemaining = (dueDateStr: string) => {
    const due = new Date(dueDateStr);
    const now = new Date();
    return Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  };

  // ─── Shared Pagination UI ─────────────────────────────────────────────────

  const PaginationBar = ({
    page, totalPages, count, itemsPerPage, typeLabel, onPageChange
  }: { page: number; totalPages: number; count: number; itemsPerPage: number; typeLabel: string; onPageChange: (p: number) => void }) => {
    if (count === 0) return null;
    const startItem = count > 0 ? (page - 1) * itemsPerPage + 1 : 0;
    const endItem = Math.min(page * itemsPerPage, count);
    return (
      <CardFooter className="flex flex-col sm:flex-row justify-between items-center gap-4 text-sm text-muted-foreground px-6 py-4 border-t border-border mt-auto w-full">
        <div>
          Showing {startItem} to {endItem} of {count} {typeLabel}
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(page - 1)}
            disabled={page === 1}
            className="bg-primary hover:bg-primary/90 text-white border-primary h-9 px-4 transition-all"
          >
            Previous
          </Button>

          <div className="flex items-center justify-center min-w-[2rem]">
            <span className={`text-sm font-semibold ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>
              {page}
            </span>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(page + 1)}
            disabled={page === totalPages || totalPages === 0}
            className="bg-primary hover:bg-primary/90 text-white border-primary h-9 px-4 transition-all"
          >
            Next
          </Button>
        </div>
      </CardFooter>
    );
  };

  const filteredCatalog = catalogResults.filter(book => {
    const matchCategory = !selectedCategory || selectedCategory === 'all' || book.category === selectedCategory;
    const matchAvailability = selectedAvailability === 'all' ||
      (selectedAvailability === 'available' && book.available_copies > 0) ||
      (selectedAvailability === 'unavailable' && book.available_copies === 0);
    return matchCategory && matchAvailability;
  });

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <>
      <style>{`
        @media (max-width: 480px) {
          .library-card-header { padding: 16px !important; }
          .library-card-title { font-size: 1.25rem !important; }
          .library-card-desc { font-size: 0.8125rem !important; margin-top: 4px !important; }
        }
      `}</style>

      <div className={`w-full max-w-full overflow-hidden ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>
        <Card id="library-card" className={`w-full max-w-full overflow-hidden ${theme === 'dark' ? 'bg-card border-border shadow-sm' : 'bg-white border-gray-200 shadow-sm'}`}>
          <CardHeader id="library-header" className="library-card-header p-3 sm:p-4 lg:p-6 border-b w-full overflow-hidden">
            <div>
              <CardTitle className={`library-card-title text-lg sm:text-xl md:text-2xl font-semibold ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>
                My Library
              </CardTitle>
              <CardDescription className={`library-card-desc whitespace-normal break-words ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}`}>
                Track your borrowed books, returns, and search the catalog
              </CardDescription>
            </div>

            {/* Tabs */}
            <div className={`library-tabs flex flex-row overflow-x-auto custom-scrollbar gap-2 p-2 rounded-2xl mt-6 border ${theme === 'dark' ? 'bg-background border-border' : 'bg-gray-50 border-gray-100'} shadow-sm`}>
              {([
                { id: 'taken', label: 'Borrowed', count: summary.taken_count },
                { id: 'overdue', label: 'Overdue', count: summary.overdue_count },
                { id: 'returned', label: 'Returned', count: summary.returned_count },
                { id: 'catalog', label: 'Search Catalog' }
              ] as const).map(t => (
                <button
                  key={t.id}
                  onClick={() => {
                    setTab(t.id);
                    if (window.innerWidth < 768) {
                      setTimeout(() => {
                        document.getElementById('library-tab-content')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                      }, 50);
                    }
                  }}
                  className={`library-tab-btn flex-1 shrink-0 py-2.5 rounded-xl text-sm font-semibold transition-all whitespace-nowrap px-4 flex items-center justify-center gap-1.5 ${tab === t.id
                      ? 'bg-primary text-white shadow-md'
                      : theme === 'dark'
                        ? 'text-muted-foreground hover:bg-accent'
                        : 'text-gray-600 hover:bg-gray-100'
                    }`}
                >
                  {t.label}
                  {'count' in t && t.count > 0 && (
                    <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${tab === t.id ? 'bg-white/20' : 'bg-primary/10 text-primary'
                      }`}>
                      {t.count}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </CardHeader>

          <CardContent className="p-3 sm:p-4 lg:p-6 space-y-6">
            {/* Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 w-full">
              <div className={`rounded-2xl border shadow-sm p-3 sm:p-4 ${card}`}>
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-blue-500/10 flex items-center justify-center shrink-0">
                    <BookMarked size={16} className="text-blue-500 sm:w-4 sm:h-4" />
                  </div>
                  <p className={`text-sm font-semibold truncate ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}`}>Borrowed</p>
                </div>
                <p className="text-2xl font-bold">{summary.taken_count}</p>
              </div>

              <div className={`rounded-2xl border shadow-sm p-3 sm:p-4 ${card} ${summary.overdue_count > 0 ? 'ring-2 ring-red-500/40' : ''}`}>
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-red-500/10 flex items-center justify-center shrink-0">
                    <AlertTriangle size={16} className="text-red-500 sm:w-4 sm:h-4" />
                  </div>
                  <p className={`text-sm font-semibold truncate ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}`}>Overdue</p>
                </div>
                <p className={`text-2xl font-bold ${summary.overdue_count > 0 ? 'text-red-500' : ''}`}>{summary.overdue_count}</p>
              </div>

              <div className={`rounded-2xl border shadow-sm p-3 sm:p-4 ${card}`}>
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center shrink-0">
                    <CheckCircle size={16} className="text-emerald-500 sm:w-4 sm:h-4" />
                  </div>
                  <p className={`text-sm font-semibold truncate ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}`}>Returned</p>
                </div>
                <p className="text-2xl font-bold">{summary.returned_count}</p>
              </div>

              <div className={`rounded-2xl border shadow-sm p-3 sm:p-4 ${card}`}>
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-amber-500/10 flex items-center justify-center shrink-0">
                    <CreditCard size={16} className="text-amber-500 sm:w-4 sm:h-4" />
                  </div>
                  <p className={`text-sm font-semibold truncate ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}`}>Unpaid Fines</p>
                </div>
                <p className={`text-2xl font-bold ${summary.total_unpaid_fine > 0 ? 'text-amber-500' : ''}`}>
                  ₹{summary.total_unpaid_fine.toFixed(2)}
                </p>
              </div>
            </div>

            {/* Active Tab Content Container */}
            <div id="library-tab-content" className="scroll-mt-6">
              {/* ── Catalog Tab ── */}
              {tab === 'catalog' && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                  <div className="relative w-full">
                    <label className="text-xs font-semibold mb-1.5 block">Search Book</label>
                    <div className="relative">
                      <Search className="absolute left-4 top-3 w-4 h-4 opacity-50" />
                      <input
                        type="text"
                        placeholder="Search title, author, ISBN..."
                        value={catalogSearch}
                        onChange={(e) => setCatalogSearch(e.target.value)}
                        className={`w-full pl-10 pr-4 py-2.5 text-sm rounded-xl border focus:outline-none focus:ring-2 focus:ring-primary/30 h-10 ${theme === 'dark' ? 'bg-card border-border text-foreground' : 'bg-white border-gray-200'
                          }`}
                      />
                    </div>
                  </div>

                  <div className="w-full">
                    <label className="text-xs font-semibold mb-1.5 block">Category</label>
                    <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                      <SelectTrigger className="w-full h-10">
                        <SelectValue placeholder="All Categories" />
                      </SelectTrigger>
                      <SelectContent className={theme === 'dark' ? 'bg-card text-foreground border border-border' : 'bg-white text-gray-900 border border-gray-300'}>
                        <SelectItem value="all">All Categories</SelectItem>
                        {categoriesList.map(cat => (
                          <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="w-full">
                    <label className="text-xs font-semibold mb-1.5 block">Availability</label>
                    <Select value={selectedAvailability} onValueChange={setSelectedAvailability}>
                      <SelectTrigger className="w-full h-10">
                        <SelectValue placeholder="All Statuses" />
                      </SelectTrigger>
                      <SelectContent className={theme === 'dark' ? 'bg-card text-foreground border border-border' : 'bg-white text-gray-900 border border-gray-300'}>
                        <SelectItem value="all">All Statuses</SelectItem>
                        <SelectItem value="available">Available</SelectItem>
                        <SelectItem value="unavailable">Unavailable</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {catalogLoading ? (
                  <div className="p-4">
                    <SkeletonList items={3} />
                  </div>
                ) : (!selectedCategory && !catalogSearch.trim()) ? (
                  <div className={`rounded-2xl border shadow-sm p-12 text-center ${card}`}>
                    <BookOpen size={48} className="mx-auto mb-4 opacity-20" />
                    <p className="font-semibold mb-1">Select Category or Search</p>
                    <p className={`text-sm ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}`}>
                      Please select a category from the dropdown or type in the search bar above to view the book catalog.
                    </p>
                  </div>
                ) : filteredCatalog.length === 0 ? (
                  <div className={`rounded-2xl border shadow-sm p-12 text-center ${card}`}>
                    <BookOpen size={48} className="mx-auto mb-4 opacity-20" />
                    <p className="font-semibold mb-1">No Books Found</p>
                    <p className={`text-sm ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}`}>
                      {catalogSearch
                        ? `No results for "${catalogSearch}". Try a different keyword or filters.`
                        : "Type in the search bar or adjust filters to discover books."}
                    </p>
                  </div>
                ) : (
                  <div className={`rounded-2xl border shadow-sm overflow-hidden ${card}`}>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
                      {filteredCatalog.map((book) => (
                        <div
                          key={book.id}
                          className={`rounded-xl border shadow-sm p-5 transition-all hover:shadow-md ${card}`}
                        >
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex-1 min-w-0">
                              <h3 className="font-bold text-sm truncate">{book.title}</h3>
                              <p className={`text-xs mt-0.5 ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}`}>
                                by {book.author}
                              </p>
                            </div>
                            <span className={`ml-2 shrink-0 px-2.5 py-1 rounded-full text-[10px] font-bold ${book.available_copies > 0
                                ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400'
                                : 'bg-red-100 text-red-600 dark:bg-red-500/20 dark:text-red-400'
                              }`}>
                              {book.available_copies > 0 ? `${book.available_copies} Available` : 'Unavailable'}
                            </span>
                          </div>

                          <div className="space-y-1.5 mb-4">
                            {book.category && (
                              <div className="flex items-center gap-1.5">
                                <Tag size={12} className="opacity-50" />
                                <span className={`text-xs ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}`}>{book.category}</span>
                              </div>
                            )}
                            {book.isbn && (
                              <div className="flex items-center gap-1.5">
                                <BookOpen size={12} className="opacity-50" />
                                <span className={`text-xs font-mono ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}`}>
                                  ISBN: {book.isbn}
                                </span>
                              </div>
                            )}
                            {book.physical_location && (
                              <div className="flex items-center gap-1.5">
                                <MapPin size={12} className="opacity-50 text-primary" />
                                <span className={`text-xs ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}`}>
                                  {book.physical_location}
                                </span>
                              </div>
                            )}
                          </div>

                          {book.available_copies === 0 && (
                            <button
                              onClick={() => handleReserve(book.id, book.title)}
                              className="w-full py-2 rounded-xl text-xs font-bold bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
                            >
                              Place Hold / Reserve
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ── Borrow Tabs (taken / overdue / returned) ── */}
            {tab !== 'catalog' && (
              <div className={`rounded-2xl border shadow-sm ${card}`}>
                <div className="p-5 border-b border-inherit">
                  <h2 className="font-semibold text-base flex items-center gap-2">
                    {tab === 'taken' && <><BookMarked size={16} className="text-primary" /> Currently Borrowed</>}
                    {tab === 'overdue' && <><AlertTriangle size={16} className="text-red-500" /> Overdue Books</>}
                    {tab === 'returned' && <><CheckCircle size={16} className="text-emerald-500" /> Return History</>}
                  </h2>
                </div>

                {borrowsLoading ? (
                  <div className="p-4">
                    <SkeletonList items={3} />
                  </div>
                ) : borrows.length === 0 ? (
                  <div className="p-12 text-center">
                    {tab === 'taken' && <BookOpen size={40} className="mx-auto mb-3 opacity-20" />}
                    {tab === 'overdue' && <CheckCircle size={40} className="mx-auto mb-3 text-emerald-400 opacity-40" />}
                    {tab === 'returned' && <Calendar size={40} className="mx-auto mb-3 opacity-20" />}
                    <p className="font-semibold mb-1">
                      {tab === 'taken' && "No books currently borrowed"}
                      {tab === 'overdue' && "No overdue books — you're all clear!"}
                      {tab === 'returned' && "No return history yet"}
                    </p>
                    <p className={`text-sm ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}`}>
                      {tab === 'taken' && "Visit the library to borrow books."}
                      {tab === 'overdue' && "All borrowed books are within their due dates."}
                      {tab === 'returned' && "Books you return will appear here."}
                    </p>
                  </div>
                ) : (
                  <div className="divide-y divide-inherit">
                    {borrows.map((borrow) => {
                      const daysLeft = getDaysRemaining(borrow.due_date);
                      const isOverdue = borrow.status === 'overdue';

                      return (
                        <div key={borrow.id} className="px-5 py-4 hover:bg-primary/5 transition-all">
                          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                            <div className="flex-1 min-w-0">
                              <p className="font-semibold text-base sm:text-sm truncate">
                                {borrow.book_copy_details?.book_details?.title}
                              </p>
                              <p className={`text-sm sm:text-xs mt-0.5 ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}`}>
                                by {borrow.book_copy_details?.book_details?.author}
                              </p>

                              <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 mt-2.5">
                                <span className={`text-sm sm:text-xs flex items-center gap-1 ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}`}>
                                  <Calendar size={12} />
                                  Issued: {new Date(borrow.issue_date).toLocaleDateString()}
                                </span>
                                <span className={`text-sm sm:text-xs flex items-center gap-1 ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}`}>
                                  <Clock size={12} />
                                  Due: {new Date(borrow.due_date).toLocaleDateString()}
                                </span>
                                {borrow.returned_date && (
                                  <span className="text-sm sm:text-xs flex items-center gap-1 text-emerald-600">
                                    <CheckCircle size={12} />
                                    Returned: {new Date(borrow.returned_date).toLocaleDateString()}
                                  </span>
                                )}
                              </div>
                            </div>

                            <div className="flex flex-row sm:flex-col items-center sm:items-end justify-between sm:justify-start gap-2 shrink-0 w-full sm:w-auto pt-3 sm:pt-0 border-t sm:border-t-0 border-border/20">
                              <div className="flex items-center gap-2 sm:flex-col sm:items-end">
                                <span className={`px-2.5 py-1 rounded-full text-xs sm:text-[10px] font-bold capitalize ${borrow.status === 'returned'
                                    ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400'
                                    : isOverdue
                                      ? 'bg-red-100 text-red-600 dark:bg-red-500/20 dark:text-red-400 animate-pulse'
                                      : 'bg-blue-100 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400'
                                  }`}>
                                  {borrow.status}
                                </span>

                                {borrow.status !== 'returned' && (
                                  <span className={`text-xs sm:text-[10px] font-bold px-2 py-0.5 rounded ${isOverdue
                                      ? 'text-red-500 bg-red-50 dark:bg-red-500/10'
                                      : daysLeft <= 3
                                        ? 'text-amber-500 bg-amber-50 dark:bg-amber-500/10'
                                        : 'text-emerald-500 bg-emerald-50 dark:bg-emerald-500/10'
                                    }`}>
                                    {isOverdue
                                      ? `${Math.abs(daysLeft)} days late`
                                      : daysLeft === 0
                                        ? 'Due today!'
                                        : `${daysLeft} days left`
                                    }
                                  </span>
                                )}
                              </div>

                              {borrow.fine_amount > 0 && (
                                <span className="text-xs sm:text-[10px] font-bold text-red-500 bg-red-50 dark:bg-red-500/10 px-2 py-0.5 rounded">
                                  Fine: ₹{borrow.fine_amount}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        </CardContent>

          {/* CardFooter for Pagination */}
          {tab === 'catalog' && (selectedCategory || catalogSearch.trim()) && catalogTotalPages > 1 && (
            <PaginationBar
              page={catalogPage}
              totalPages={catalogTotalPages}
              count={catalogCount}
              itemsPerPage={PAGE_SIZE}
              typeLabel="books"
              onPageChange={handleCatalogPageChange}
            />
          )}

          {tab !== 'catalog' && borrowsTotalPages > 1 && (
            <PaginationBar
              page={borrowsPage}
              totalPages={borrowsTotalPages}
              count={borrowsCount}
              itemsPerPage={PAGE_SIZE}
              typeLabel="records"
              onPageChange={handleBorrowsPageChange}
            />
          )}
        </Card>
      </div>
    </>
  );
};

export default StudentLibraryPage;
