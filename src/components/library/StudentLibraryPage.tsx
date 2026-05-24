import React, { useState, useEffect } from "react";
import { useTheme } from "../../context/ThemeContext";
import {
  fetchStudentLibraryDashboard,
  fetchStudentBorrows,
  searchCatalog,
  requestReservation
} from "../../utils/library_api";
import {
  BookOpen, Clock, CheckCircle, AlertTriangle,
  Search, Calendar, Tag, CreditCard, BookMarked
} from "lucide-react";
import Swal from "sweetalert2";

const StudentLibraryPage: React.FC = () => {
  const { theme } = useTheme();
  const [tab, setTab] = useState<'taken' | 'overdue' | 'returned' | 'catalog'>('taken');
  const [loading, setLoading] = useState(true);

  // Dashboard summary
  const [summary, setSummary] = useState({
    taken_count: 0,
    overdue_count: 0,
    returned_count: 0,
    total_unpaid_fine: 0.00
  });

  // Borrow lists
  const [borrows, setBorrows] = useState<any[]>([]);

  // Catalog search
  const [catalogSearch, setCatalogSearch] = useState("");
  const [catalogResults, setCatalogResults] = useState<any[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(false);

  const bg = theme === 'dark' ? 'bg-background text-foreground' : 'bg-gray-50 text-gray-900';
  const card = theme === 'dark' ? 'bg-card border-border' : 'bg-white border-gray-100';

  const loadDashboard = async () => {
    try {
      const res = await fetchStudentLibraryDashboard();
      if (res && !res.detail) {
        setSummary(res);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const loadBorrows = async (status: string) => {
    setLoading(true);
    try {
      const res = await fetchStudentBorrows(status);
      if (Array.isArray(res)) {
        setBorrows(res);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const loadCatalog = async (query: string) => {
    setCatalogLoading(true);
    try {
      const res = await searchCatalog(query);
      if (Array.isArray(res)) {
        setCatalogResults(res);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setCatalogLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, []);

  useEffect(() => {
    if (tab === 'taken') loadBorrows('taken');
    else if (tab === 'overdue') loadBorrows('overdue');
    else if (tab === 'returned') loadBorrows('returned');
    else if (tab === 'catalog') loadCatalog(catalogSearch);
  }, [tab]);

  // Catalog search debounce
  useEffect(() => {
    if (tab !== 'catalog') return;
    const timeout = setTimeout(() => {
      loadCatalog(catalogSearch);
    }, 400);
    return () => clearTimeout(timeout);
  }, [catalogSearch]);

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
          loadCatalog(catalogSearch);
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
    const diff = Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return diff;
  };

  return (
    <div className={`min-h-screen ${bg} p-4 md:p-6`}>
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <BookOpen className="text-primary" size={26} /> My Library
        </h1>
        <p className={`text-sm mt-1 ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}`}>
          Track your borrowed books, returns, and search the catalog
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <div className={`rounded-2xl border shadow-sm p-4 ${card}`}>
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
              <BookMarked size={16} className="text-blue-500" />
            </div>
            <p className={`text-xs font-semibold ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}`}>Borrowed</p>
          </div>
          <p className="text-2xl font-extrabold">{summary.taken_count}</p>
        </div>

        <div className={`rounded-2xl border shadow-sm p-4 ${card} ${summary.overdue_count > 0 ? 'ring-2 ring-red-500/40' : ''}`}>
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-red-500/10 flex items-center justify-center">
              <AlertTriangle size={16} className="text-red-500" />
            </div>
            <p className={`text-xs font-semibold ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}`}>Overdue</p>
          </div>
          <p className={`text-2xl font-extrabold ${summary.overdue_count > 0 ? 'text-red-500' : ''}`}>{summary.overdue_count}</p>
        </div>

        <div className={`rounded-2xl border shadow-sm p-4 ${card}`}>
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
              <CheckCircle size={16} className="text-emerald-500" />
            </div>
            <p className={`text-xs font-semibold ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}`}>Returned</p>
          </div>
          <p className="text-2xl font-extrabold">{summary.returned_count}</p>
        </div>

        <div className={`rounded-2xl border shadow-sm p-4 ${card}`}>
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center">
              <CreditCard size={16} className="text-amber-500" />
            </div>
            <p className={`text-xs font-semibold ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}`}>Unpaid Fines</p>
          </div>
          <p className={`text-2xl font-extrabold ${summary.total_unpaid_fine > 0 ? 'text-amber-500' : ''}`}>
            ₹{summary.total_unpaid_fine.toFixed(2)}
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className={`flex gap-2 p-2 rounded-2xl mb-6 border ${theme === 'dark' ? 'bg-card border-border' : 'bg-white border-gray-100'} shadow-sm overflow-x-auto`}>
        {[
          { id: 'taken', label: '📚 Borrowed', count: summary.taken_count },
          { id: 'overdue', label: '⚠️ Overdue', count: summary.overdue_count },
          { id: 'returned', label: '✅ Returned', count: summary.returned_count },
          { id: 'catalog', label: '🔍 Search Catalog' }
        ].map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id as any)}
            className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all whitespace-nowrap px-3 ${
              tab === t.id
                ? 'bg-primary text-white shadow-md'
                : theme === 'dark'
                ? 'text-muted-foreground hover:bg-accent'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            {t.label}
            {'count' in t && t.count !== undefined && t.count > 0 && (
              <span className={`ml-1.5 px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                tab === t.id ? 'bg-white/20' : 'bg-primary/10 text-primary'
              }`}>
                {t.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Content */}
      {loading && tab !== 'catalog' ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : tab === 'catalog' ? (
        /* CATALOG SEARCH TAB */
        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-4 top-3 w-4 h-4 opacity-50" />
            <input
              type="text"
              placeholder="Search books by title, author, ISBN, or category..."
              value={catalogSearch}
              onChange={(e) => setCatalogSearch(e.target.value)}
              className={`w-full pl-10 pr-4 py-3 text-sm rounded-2xl border focus:outline-none focus:ring-2 focus:ring-primary/30 ${
                theme === 'dark' ? 'bg-card border-border text-foreground' : 'bg-white border-gray-200'
              }`}
            />
          </div>

          {catalogLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-6 h-6 border-3 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : catalogResults.length === 0 ? (
            <div className={`rounded-2xl border shadow-sm p-12 text-center ${card}`}>
              <BookOpen size={48} className="mx-auto mb-4 opacity-20" />
              <p className="font-semibold mb-1">No Books Found</p>
              <p className={`text-sm ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}`}>
                {catalogSearch ? `No results for "${catalogSearch}". Try a different keyword.` : "Type in the search bar to discover books."}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {catalogResults.map((book) => (
                <div
                  key={book.id}
                  className={`rounded-2xl border shadow-sm p-5 transition-all hover:shadow-md ${card}`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-sm truncate">{book.title}</h3>
                      <p className={`text-xs mt-0.5 ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}`}>
                        by {book.author}
                      </p>
                    </div>
                    <span className={`ml-2 shrink-0 px-2.5 py-1 rounded-full text-[10px] font-bold ${
                      book.available_copies > 0
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
                        <span className={`text-xs ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}`}>
                          {book.category}
                        </span>
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
                        <Search size={12} className="opacity-50" />
                        <span className={`text-xs ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}`}>
                          📍 {book.physical_location}
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
          )}
        </div>
      ) : (
        /* BORROW LISTS (taken / overdue / returned) */
        <div className={`rounded-2xl border shadow-sm ${card}`}>
          <div className="p-5 border-b border-inherit">
            <h2 className="font-bold text-base flex items-center gap-2">
              {tab === 'taken' && <><BookMarked size={16} className="text-primary" /> Currently Borrowed</>}
              {tab === 'overdue' && <><AlertTriangle size={16} className="text-red-500" /> Overdue Books</>}
              {tab === 'returned' && <><CheckCircle size={16} className="text-emerald-500" /> Return History</>}
            </h2>
          </div>

          {borrows.length === 0 ? (
            <div className="p-12 text-center">
              {tab === 'taken' && <BookOpen size={40} className="mx-auto mb-3 opacity-20" />}
              {tab === 'overdue' && <CheckCircle size={40} className="mx-auto mb-3 text-emerald-400 opacity-40" />}
              {tab === 'returned' && <Calendar size={40} className="mx-auto mb-3 opacity-20" />}
              <p className="font-semibold mb-1">
                {tab === 'taken' && "No books currently borrowed"}
                {tab === 'overdue' && "No overdue books — you're all clear! 🎉"}
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
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-sm truncate">
                          {borrow.book_copy_details?.book_details?.title}
                        </p>
                        <p className={`text-xs mt-0.5 ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}`}>
                          by {borrow.book_copy_details?.book_details?.author}
                        </p>

                        <div className="flex flex-wrap items-center gap-3 mt-2.5">
                          <span className={`text-xs flex items-center gap-1 ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}`}>
                            <Calendar size={12} />
                            Issued: {new Date(borrow.issue_date).toLocaleDateString()}
                          </span>
                          <span className={`text-xs flex items-center gap-1 ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}`}>
                            <Clock size={12} />
                            Due: {new Date(borrow.due_date).toLocaleDateString()}
                          </span>
                          {borrow.returned_date && (
                            <span className="text-xs flex items-center gap-1 text-emerald-600">
                              <CheckCircle size={12} />
                              Returned: {new Date(borrow.returned_date).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex flex-col items-end gap-1.5 shrink-0">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold capitalize ${
                          borrow.status === 'returned'
                            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400'
                            : isOverdue
                            ? 'bg-red-100 text-red-600 dark:bg-red-500/20 dark:text-red-400 animate-pulse'
                            : 'bg-blue-100 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400'
                        }`}>
                          {borrow.status}
                        </span>

                        {/* Days remaining badge for active borrows */}
                        {borrow.status !== 'returned' && (
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                            isOverdue
                              ? 'text-red-500'
                              : daysLeft <= 3
                              ? 'text-amber-500'
                              : 'text-emerald-500'
                          }`}>
                            {isOverdue
                              ? `${Math.abs(daysLeft)} days late`
                              : daysLeft === 0
                              ? 'Due today!'
                              : `${daysLeft} days left`
                            }
                          </span>
                        )}

                        {/* Fine badge */}
                        {borrow.fine_amount > 0 && (
                          <span className="text-[10px] font-bold text-red-500 bg-red-50 dark:bg-red-500/10 px-2 py-0.5 rounded">
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
  );
};

export default StudentLibraryPage;
