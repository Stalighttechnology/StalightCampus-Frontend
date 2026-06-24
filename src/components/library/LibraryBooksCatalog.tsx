import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Search, Plus, MapPin, X, Plus as PlusIcon,
  Eye, Edit, Trash2, Download, Loader2, Book, CheckCircle, ScanLine, Printer
} from "lucide-react";
import Swal from "sweetalert2";
import JsBarcode from "jsbarcode";
import { Card, CardHeader, CardTitle, CardFooter } from "../ui/card";
import { Button } from "../ui/button";
import BarcodeScannerModal from "../ui/BarcodeScannerModal";
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
  DialogTitle,
  DialogFooter
} from "../ui/dialog";
import { useTheme } from "../../context/ThemeContext";
import {
  fetchLibraryBooks,
  exportLibraryBooksPdf,
  createLibraryBook,
  updateLibraryBook,
  deleteLibraryBook,
  fetchBookCopies,
  addBookCopy,
  fetchLibraryCategories,
  createLibraryCategory
} from "../../utils/library_api";

const LibraryBooksCatalog = () => {
  const { theme } = useTheme();
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);

  // Book Catalog states
  const [books, setBooks] = useState<any[]>([]);
  const [catalogPage, setCatalogPage] = useState(1);
  const [bookSearch, setBookSearch] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedBook, setSelectedBook] = useState<any>(null);
  const [showViewModal, setShowViewModal] = useState(false);
  const [viewingBookCopies, setViewingBookCopies] = useState<any[]>([]);
  const [loadingCopies, setLoadingCopies] = useState(false);
  const [copiesPage, setCopiesPage] = useState(1);
  const [copiesTotalPages, setCopiesTotalPages] = useState(1);
  const [copiesCount, setCopiesCount] = useState(0);
  const [newSpecificBarcode, setNewSpecificBarcode] = useState("");
  const [isAddingSpecificCopy, setIsAddingSpecificCopy] = useState(false);

  // Scanner Modal state
  const [showCatalogScanner, setShowCatalogScanner] = useState(false);

  // Dynamic Category list
  const [categories, setCategories] = useState<string[]>(() => {
    const saved = localStorage.getItem("library_categories");
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) { }
    }
    return [];
  });

  const allCategories = React.useMemo(() => {
    const fromBooks = books.map((b) => b.category).filter(Boolean);
    const unique = Array.from(new Set([...categories, ...fromBooks]));
    return unique.sort();
  }, [books, categories]);

  // Inline Category Add states
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");

  // Add/Edit Book form
  const [bookForm, setBookForm] = useState({
    title: "",
    author: "",
    isbn: "",
    category: "",
    description: "",
    total_copies: 1,
    physical_location: "",
    custom_barcodes: [] as string[]
  });

  const loadCategories = async () => {
    try {
      const res = await fetchLibraryCategories();
      if (Array.isArray(res)) {
        setCategories(res.map((c: any) => c.name));
      }
    } catch (err) {
      console.error("Failed to load categories:", err);
    }
  };

  const loadBooks = async (query = "") => {
    setLoading(true);
    try {
      const res = await fetchLibraryBooks(query);
      if (Array.isArray(res)) {
        setBooks(res);
        setCatalogPage(1);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBooks(bookSearch);
    loadCategories();
  }, []);

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
        physical_location: "",
        custom_barcodes: []
      });
      loadBooks(bookSearch);
    } catch (err) {
      Swal.fire("Error", "Failed to save book catalog item", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleAddSpecificCopy = async () => {
    if (!selectedBook) return;
    setIsAddingSpecificCopy(true);
    try {
      const res = await addBookCopy(selectedBook.id, { barcode_id: newSpecificBarcode.trim() });
      if (res && res.id) {
        Swal.fire("Success", "Copy added successfully", "success");
        setNewSpecificBarcode("");
        // Refresh copies and book list
        loadBookCopiesPage(selectedBook.id, copiesPage);
        loadBooks(bookSearch);
      } else if (res && res.message) {
        Swal.fire("Error", res.message, "error");
      } else {
        throw new Error("Invalid response");
      }
    } catch (err) {
      Swal.fire("Error", "Failed to add specific copy", "error");
    } finally {
      setIsAddingSpecificCopy(false);
    }
  };

  const loadBookCopiesPage = async (bookId: number, page: number) => {
    setLoadingCopies(true);
    try {
      const res = await fetchBookCopies(bookId, page);
      if (res && res.results) {
        setViewingBookCopies(res.results);
        setCopiesTotalPages(Math.ceil(res.count / 15) || 1);
        setCopiesCount(res.count || 0);
        setCopiesPage(page);
      } else {
        setViewingBookCopies(Array.isArray(res) ? res : []);
        setCopiesTotalPages(1);
        setCopiesCount(Array.isArray(res) ? res.length : 0);
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
      physical_location: book.physical_location || "",
      custom_barcodes: []
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
          loadBooks(bookSearch);
        }
      } catch (err) {
        Swal.fire("Error", "Failed to delete book catalog", "error");
      } finally {
        setLoading(false);
      }
    }
  };

  const handleExportPDF = async () => {
    setExporting(true);
    try {
      const blob = await exportLibraryBooksPdf(bookSearch);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `Book_Catalog_${new Date().toISOString().split("T")[0]}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      Swal.fire({
        title: "Success",
        text: "Book catalog PDF exported successfully",
        icon: "success",
        timer: 1500,
        showConfirmButton: false
      });
    } catch (error) {
      Swal.fire("Error", "Failed to export book catalog PDF", "error");
    } finally {
      setExporting(false);
    }
  };

  const handleDownloadBarcode = (barcodeId: string) => {
    const canvas = document.createElement("canvas");
    JsBarcode(canvas, barcodeId, {
      format: "CODE128",
      width: 2,
      height: 100,
      displayValue: true,
      textMargin: 5,
      fontSize: 16,
      margin: 10,
      background: "#ffffff"
    });

    const url = canvas.toDataURL("image/png");
    const link = document.createElement("a");
    link.href = url;
    link.download = `${barcodeId}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrintBarcode = (barcodeId: string) => {
    const canvas = document.createElement("canvas");
    JsBarcode(canvas, barcodeId, {
      format: "CODE128",
      width: 2,
      height: 100,
      displayValue: true,
      textMargin: 5,
      fontSize: 16,
      margin: 10,
      background: "#ffffff"
    });

    const url = canvas.toDataURL("image/png");
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head><title>Print Barcode - ${barcodeId}</title></head>
          <body style="margin: 0; padding: 40px; text-align: center;">
            <img src="${url}" style="max-width: 100%; height: auto; border: 1px dashed #ccc; padding: 10px;" />
            <p style="font-family: sans-serif; font-size: 12px; color: #666; margin-top: 20px;">Affix this sticker to the inside cover of the book.</p>
            <script>
              window.onload = function() {
                setTimeout(function() {
                  window.print();
                  window.close();
                }, 250);
              }
            </script>
          </body>
        </html>
      `);
      printWindow.document.close();
    }
  };

  const handlePrintAllBarcodes = async (book: any) => {
    Swal.fire({
      title: "Generating barcodes...",
      text: "Fetching all copies...",
      allowOutsideClick: false,
      didOpen: () => Swal.showLoading()
    });

    try {
      let allCopies: any[] = [];
      let currentPage = 1;
      let totalPages = 1;

      // Fetch first page to get total pages
      const firstPageRes = await fetchBookCopies(book.id, currentPage);
      if (firstPageRes && firstPageRes.results) {
        allCopies = [...firstPageRes.results];
        totalPages = Math.ceil(firstPageRes.count / 15) || 1;
      } else {
        allCopies = Array.isArray(firstPageRes) ? firstPageRes : [];
      }

      // Fetch remaining pages
      for (let p = 2; p <= totalPages; p++) {
        const res = await fetchBookCopies(book.id, p);
        if (res && res.results) {
          allCopies = [...allCopies, ...res.results];
        }
      }

      if (allCopies.length === 0) {
        Swal.fire("No Copies", "There are no physical copies to print barcodes for.", "info");
        return;
      }

      let htmlContent = `
        <html>
          <head>
            <title>Print All Barcodes - ${book.title}</title>
            <style>
              body { margin: 0; padding: 20px; font-family: sans-serif; background: #fff; }
              .header { text-align: center; margin-bottom: 30px; }
              .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 20px; }
              .sticker { border: 1px dashed #ccc; padding: 15px 10px; text-align: center; page-break-inside: avoid; border-radius: 8px; }
              img { max-width: 100%; height: auto; margin-bottom: 5px; }
              .book-title { font-size: 11px; color: #333; font-weight: bold; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
              .book-location { font-size: 10px; color: #666; margin-top: 3px; }
              @media print {
                 .sticker { page-break-inside: avoid; border: 1px dashed #ccc; }
              }
            </style>
          </head>
          <body>
            <div class="header">
              <h2>Barcodes for: ${book.title}</h2>
              <p>Total Copies: ${allCopies.length} | ISBN: ${book.isbn || 'N/A'}</p>
            </div>
            <div class="grid">
      `;

      for (const copy of allCopies) {
        const canvas = document.createElement("canvas");
        JsBarcode(canvas, copy.barcode_id, {
          format: "CODE128",
          width: 2,
          height: 60,
          displayValue: true,
          textMargin: 5,
          fontSize: 14,
          margin: 0,
          background: "#ffffff"
        });
        const url = canvas.toDataURL("image/png");
        htmlContent += `
          <div class="sticker">
            <img src="${url}" />
            <div class="book-title">${book.title}</div>
            <div class="book-location">Loc: ${book.physical_location || 'Not set'}</div>
          </div>
        `;
      }

      htmlContent += `
            </div>
            <script>
              window.onload = function() {
                setTimeout(function() {
                  window.print();
                  window.close();
                }, 500);
              }
            </script>
          </body>
        </html>
      `;

      Swal.close();
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(htmlContent);
        printWindow.document.close();
      }

    } catch (err) {
      console.error(err);
      Swal.fire("Error", "Failed to generate barcodes", "error");
    }
  };

  return (
    <div className="space-y-4">
      {/* Books List — all inside one Card */}
      <Card className={`border overflow-hidden shadow-sm ${theme === 'dark' ? 'bg-card border-border text-foreground' : 'bg-white border-gray-200 text-gray-900'}`}>
        <div className="border-b border-border/50 pb-4">
          <CardHeader id="library-books-action-header" className="px-4 sm:px-6 py-4 md:py-5 border-b mb-3">
            <div className="flex justify-between items-center w-full">
              <div>
                <div className="flex items-center gap-2 mb-0.5">
                  <CardTitle className="sm:text-2xl text-xl font-semibold">Book Catalog</CardTitle>
                  {books.length > 0 && (
                    <span className={`text-xs font-medium px-2.5 py-0.5 rounded-full mt-0.5 whitespace-nowrap ${theme === 'dark' ? 'bg-primary/10 text-primary' : 'bg-blue-100 text-blue-700'}`}>
                      {books.length} Titles
                    </span>
                  )}
                </div>
                <p className={`hidden sm:block text-sm ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}`}>Manage library book titles, ISBN codes, and physical copy inventory.</p>
              </div>
              {/* Desktop Export PDF Button */}
              <Button
                variant="outline"
                onClick={handleExportPDF}
                disabled={exporting || books.length === 0}
                className="hidden sm:flex items-center justify-center gap-1.5 px-4 py-2 h-10 text-sm rounded-lg border bg-primary hover:text-white text-white hover:bg-primary/90 transition-all"
              >
                {exporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                Export PDF
              </Button>
            </div>
          </CardHeader>
          <div className="px-4 sm:px-6">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-2.5 w-4 h-4 opacity-50" />
                  <input
                    type="text"
                    placeholder="Search by Title, Author, or ISBN..."
                    value={bookSearch}
                    onChange={(e) => {
                      setBookSearch(e.target.value);
                      loadBooks(e.target.value);
                    }}
                    className={`w-full sm:w-72 pl-9 pr-10 py-2 h-10 text-sm rounded-lg border focus:outline-none focus:ring-1 focus:ring-primary ${theme === 'dark' ? 'bg-[#1c1c1e] border-[#3a3a3c] text-white' : 'bg-gray-50 border-gray-200 text-gray-900'}`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowCatalogScanner(true)}
                    className="absolute right-2 top-2 p-1 text-primary hover:text-primary/80 transition-colors"
                  >
                    <ScanLine className="w-5 h-5" />
                  </button>
                </div>
                {/* Mobile Export PDF Icon Button */}
                <Button
                  onClick={handleExportPDF}
                  disabled={exporting || books.length === 0}
                  size="icon"
                  variant="outline"
                  className="flex sm:hidden h-10 w-10 items-center justify-center shrink-0 border border-input bg-background"
                >
                  {exporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                </Button>
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
                    physical_location: "",
                    custom_barcodes: []
                  });
                  setShowAddModal(true);
                }}
                className="bg-primary hover:bg-primary/95 text-white font-semibold px-4 py-2 h-10 rounded-lg flex items-center justify-center gap-2"
              >
                <Plus className="w-4 h-4" /> Add Book
              </Button>
            </div>
          </div>
        </div>
        {/* Desktop View: Table */}
        <div className="hidden sm:block overflow-x-auto thin-scrollbar">
          <table className="w-full text-left border-collapse whitespace-nowrap">
            <thead>
              <tr className={`sticky top-0 z-10 border-b text-xs uppercase tracking-wider font-semibold ${theme === 'dark' ? 'bg-card border-border text-foreground shadow-sm' : 'bg-gray-50 border-gray-200 text-gray-900 shadow-sm'
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
                  <td colSpan={7} className="p-6">
                    <div className={`flex flex-col items-center justify-center py-10 px-4 rounded-xl border-2 border-dashed text-center transition-all duration-300 ${theme === 'dark' ? 'border-border bg-card/30 text-muted-foreground' : 'border-gray-200 bg-gray-50/50 text-gray-500'}`}>
                      <div className={`p-4 rounded-full mb-4 ${theme === 'dark' ? 'bg-primary/20 text-primary' : 'bg-primary/10 text-primary'}`}>
                        <Book size={32} className="opacity-80" />
                      </div>
                      <h3 className={`text-base font-semibold mb-1 ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>No Books Found</h3>
                      <p className="max-w-xs text-xs leading-relaxed opacity-80">
                        No books cataloged matching the search query. Add a book to populate!
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                books.slice((catalogPage - 1) * 10, catalogPage * 10).map((book) => (
                  <tr key={book.id} className={`border-b text-sm transition-colors duration-200 ${theme === 'dark' ? 'border-border hover:bg-accent text-foreground' : 'border-gray-200 hover:bg-gray-50 text-gray-900'
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
                    <td className="p-4 text-right space-x-2 whitespace-nowrap">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handlePrintAllBarcodes(book)}
                        title="Print All Barcodes"
                        className="h-8 w-8 p-0 text-emerald-500 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/30"
                      >
                        <Printer className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleViewBookClick(book)}
                        className="h-8 w-8 p-0 text-blue-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/30"
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEditBookClick(book)}
                        className="h-8 w-8 p-0 text-primary hover:text-primary-foreground hover:bg-primary/10"
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeleteBookClick(book)}
                        className="h-8 w-8 p-0 text-red-500 hover:text-red-600 hover:bg-red-500/10"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile View: Cards */}
        <div className="block sm:hidden p-4 space-y-4">
          {books.length === 0 ? (
            <div className="p-6">
              <div className={`flex flex-col items-center justify-center py-10 px-4 rounded-xl border-2 border-dashed text-center transition-all duration-300 ${theme === 'dark' ? 'border-border bg-card/30 text-muted-foreground' : 'border-gray-200 bg-gray-50/50 text-gray-500'}`}>
                <div className={`p-4 rounded-full mb-4 ${theme === 'dark' ? 'bg-primary/20 text-primary' : 'bg-primary/10 text-primary'}`}>
                  <Book size={32} className="opacity-80" />
                </div>
                <h3 className={`text-base font-semibold mb-1 ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>No Books Found</h3>
                <p className="max-w-xs text-xs leading-relaxed opacity-80">
                  No books cataloged matching the search query. Add a book to populate!
                </p>
              </div>
            </div>
          ) : (
            books.slice((catalogPage - 1) * 10, catalogPage * 10).map((book) => (
              <div key={book.id} className={`p-4 rounded-xl border shadow-sm space-y-4 transition-all ${theme === 'dark' ? 'bg-[#1c1c1e]/60 border-border text-foreground' : 'bg-gray-50/70 border-gray-200/80 text-gray-900'}`}>
                <div className="flex justify-between items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <h4 className="font-bold text-lg break-words whitespace-normal pr-2">{book.title}</h4>
                    <p className={`text-sm opacity-75 mt-0.5 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>by {book.author}</p>
                  </div>
                  <span className="text-xs px-2.5 py-0.5 rounded-full font-semibold bg-primary/20 text-primary-foreground capitalize shrink-0">
                    {book.category || "General"}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="opacity-60 block text-[11px] uppercase tracking-wider font-semibold">ISBN</span>
                    <span className="font-mono text-sm font-medium">{book.isbn || "N/A"}</span>
                  </div>
                  <div>
                    <span className="opacity-60 block text-[11px] uppercase tracking-wider font-semibold">Location</span>
                    <span className="flex items-center gap-1.5 mt-0.5 text-sm font-medium">
                      <MapPin className="w-4 h-4 text-primary" /> {book.physical_location || "Not set"}
                    </span>
                  </div>
                  <div className="col-span-2">
                    <span className="opacity-60 block text-[11px] uppercase tracking-wider font-semibold">Copies (Available / Total)</span>
                    <span className="font-bold text-base mt-0.5 block">
                      <span className={book.available_copies > 0 ? "text-emerald-500" : "text-red-500"}>
                        {book.available_copies}
                      </span>
                      <span className="opacity-50"> / {book.total_copies}</span>
                    </span>
                  </div>
                </div>

                <div className="space-y-2 pt-3 border-t border-gray-100 dark:border-border">
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleViewBookClick(book)}
                      className="flex-1 h-10 px-4 text-sm text-blue-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/30 flex items-center justify-center gap-1.5"
                    >
                      <Eye className="w-4 h-4" /> View Copies
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePrintAllBarcodes(book)}
                      className="flex-1 h-10 px-4 text-sm text-emerald-500 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 flex items-center justify-center gap-1.5"
                    >
                      <Printer className="w-4 h-4" /> Print All Barcodes
                    </Button>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEditBookClick(book)}
                      className="flex-1 h-10 px-4 text-sm text-primary hover:text-primary-foreground hover:bg-primary/10 flex items-center justify-center gap-1.5"
                    >
                      <Edit className="w-4 h-4" /> Edit
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDeleteBookClick(book)}
                      className="flex-1 h-10 px-4 text-sm text-red-500 hover:text-red-600 hover:bg-red-500/10 flex items-center justify-center gap-1.5"
                    >
                      <Trash2 className="w-4 h-4" /> Delete
                    </Button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {!loading && Math.ceil(books.length / 10) > 1 && (
          <CardFooter className="flex flex-col sm:flex-row justify-between items-center gap-4 text-sm text-muted-foreground px-6 py-4 border-t border-border mt-auto">
            <div>
              Showing <span className="font-medium">{books.length > 0 ? (catalogPage - 1) * 10 + 1 : 0}</span> to <span className="font-medium">{Math.min(catalogPage * 10, books.length)}</span> of <span className="font-medium">{books.length}</span> books
            </div>
            <div className="flex items-center gap-2">
              <Button
                disabled={catalogPage === 1}
                onClick={() => setCatalogPage(catalogPage - 1)}
                className="bg-primary hover:bg-primary/90 text-white border-primary h-9 px-4 transition-all"
              >
                Previous
              </Button>
              <div className="flex items-center justify-center px-2">
                <span className={`text-sm font-semibold ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>
                  Page {catalogPage} of {Math.ceil(books.length / 10)}
                </span>
              </div>
              <Button
                disabled={catalogPage === Math.ceil(books.length / 10)}
                onClick={() => setCatalogPage(catalogPage + 1)}
                className="bg-primary hover:bg-primary/90 text-white border-primary h-9 px-4 transition-all"
              >
                Next
              </Button>
            </div>
          </CardFooter>
        )}
      </Card>

      {/* Add/Edit Catalog Modal */}
      <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
        <DialogContent className={`w-[90vw] sm:max-w-lg border p-6 shadow-2xl rounded-xl max-h-[80vh] sm:max-h-[90vh] overflow-y-auto custom-scrollbar ${theme === 'dark' ? 'bg-[#2c2c2e] border-[#3a3a3c] text-white' : 'bg-white border-gray-200 text-gray-900'}`}>
          <DialogHeader className="mb-4">
            <DialogTitle className="text-lg font-semibold">
              {selectedBook ? "Edit Catalog Item" : "Add New Book Title"}
            </DialogTitle>
          </DialogHeader>
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
                <label className="block text-xs uppercase tracking-wider font-semibold opacity-70 mb-1">Category</label>
                {isAddingCategory ? (
                  <div className="space-y-2">
                    <input
                      type="text"
                      placeholder="New Category..."
                      value={newCategoryName}
                      onChange={(e) => setNewCategoryName(e.target.value)}
                      className={`w-full px-4 py-2 text-sm rounded-lg border focus:outline-none focus:ring-1 focus:ring-primary ${theme === 'dark' ? 'bg-[#1c1c1e] border-[#3a3a3c] text-white' : 'bg-gray-50 border-gray-200'}`}
                    />
                    <div className="flex justify-end gap-1.5">
                      <Button
                        type="button"
                        size="sm"
                        onClick={async () => {
                          const trimmed = newCategoryName.trim();
                          if (!trimmed) {
                            Swal.fire("Error", "Category name cannot be empty", "error");
                            return;
                          }
                          if (allCategories.some(c => c.toLowerCase() === trimmed.toLowerCase())) {
                            Swal.fire("Error", "Category already exists", "error");
                            return;
                          }
                          try {
                            const res = await createLibraryCategory({ name: trimmed });
                            if (res && res.name) {
                              setCategories(prev => [...prev, res.name]);
                              setBookForm(prev => ({ ...prev, category: res.name }));
                              setNewCategoryName("");
                              setIsAddingCategory(false);
                            }
                          } catch (err) {
                            Swal.fire("Error", "Failed to save category to database", "error");
                          }
                        }}
                        className="bg-primary hover:bg-primary/90 text-white text-xs h-8 px-3.5"
                      >
                        Save
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setNewCategoryName("");
                          setIsAddingCategory(false);
                        }}
                        className="text-xs h-8 px-3.5"
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <Select
                    value={bookForm.category || "none"}
                    onValueChange={(val) => {
                      if (val === "ADD_NEW_CATEGORY") {
                        setIsAddingCategory(true);
                      } else {
                        setBookForm(prev => ({ ...prev, category: val === "none" ? "" : val }));
                      }
                    }}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select Category" />
                    </SelectTrigger>
                    <SelectContent className="max-h-[250px]">
                      <SelectItem value="none">Select Category</SelectItem>
                      {allCategories.map((cat) => (
                        <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                      ))}
                      <SelectItem value="ADD_NEW_CATEGORY" className="text-primary font-semibold border-t border-gray-100 dark:border-[#3a3a3c] mt-1 pt-2 cursor-pointer">
                        + Add Category
                      </SelectItem>
                    </SelectContent>
                  </Select>
                )}
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
                  className={`w-full px-4 py-2 text-sm rounded-lg border focus:outline-none focus:ring-1 focus:ring-primary resize-none h-24 overflow-y-auto ${theme === 'dark' ? 'bg-[#1c1c1e] border-[#3a3a3c] text-white' : 'bg-gray-50 border-gray-200'
                    }`}
                />
              </div>

              {!selectedBook && (
                <>
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

                  <div className="col-span-2 mt-2 p-4 border rounded-lg bg-gray-50/50 dark:bg-black/20 dark:border-[#3a3a3c]">
                    <label className="block text-xs uppercase tracking-wider font-semibold opacity-70 mb-2">Custom Barcodes (Optional)</label>
                    <p className="text-xs text-gray-500 mb-3">
                      To use your own barcodes, scan or type them below. If left blank, the system will auto-generate them.
                    </p>
                    <div className="space-y-2 max-h-48 overflow-y-auto pr-2">
                      {Array.from({ length: bookForm.total_copies }).map((_, idx) => (
                        <div key={idx} className="flex items-center gap-3">
                          <span className="text-xs font-mono w-16 opacity-50">Copy {idx + 1}</span>
                          <input
                            type="text"
                            placeholder="Scan or type custom barcode..."
                            value={bookForm.custom_barcodes[idx] || ""}
                            onChange={(e) => {
                              const newBarcodes = [...bookForm.custom_barcodes];
                              newBarcodes[idx] = e.target.value;
                              setBookForm({ ...bookForm, custom_barcodes: newBarcodes });
                            }}
                            className={`flex-1 px-3 py-1.5 text-sm rounded-md border focus:outline-none focus:ring-1 focus:ring-primary ${theme === 'dark' ? 'bg-[#1c1c1e] border-[#3a3a3c] text-white' : 'bg-white border-gray-200'}`}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}
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
        </DialogContent>
      </Dialog>

      {/* View Book Copies Modal */}
      <Dialog open={showViewModal} onOpenChange={setShowViewModal}>
        <DialogContent className={`w-[90vw] md:w-[90vw] lg:max-w-4xl p-6 rounded-2xl shadow-2xl custom-scrollbar overflow-y-auto max-h-[80vh] md:max-h-[85vh] ${theme === 'dark' ? 'bg-[#1c1c1e] text-white border border-[#3a3a3c]' : 'bg-white text-gray-900'}`}>
          <DialogHeader className="mb-6 border-b pb-3 border-gray-200 dark:border-[#3a3a3c] flex flex-row items-start justify-between">
            <div>
              <DialogTitle className={`text-xl font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{selectedBook?.title}</DialogTitle>
              <p className="text-sm opacity-70">Physical Copies & Circulation Status</p>
            </div>
            <Button onClick={() => handlePrintAllBarcodes(selectedBook)} variant="outline" className="h-9 gap-2 mt-0">
              <Printer className="w-4 h-4" /> Print All Barcodes
            </Button>
          </DialogHeader>

          <div className={`mb-4 p-4 rounded-lg border ${theme === 'dark' ? 'bg-[#2c2c2e] border-[#3a3a3c]' : 'bg-gray-50 border-gray-200'}`}>
            <h4 className="text-sm font-semibold mb-2">Add Specific Copy</h4>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Scan or type custom barcode (leave blank to auto-generate)"
                value={newSpecificBarcode}
                onChange={(e) => setNewSpecificBarcode(e.target.value)}
                className={`flex-1 px-3 py-2 text-sm rounded-lg border focus:outline-none focus:ring-1 focus:ring-primary ${theme === 'dark' ? 'bg-[#1c1c1e] border-[#3a3a3c] text-white' : 'bg-white border-gray-200'}`}
              />
              <Button
                onClick={handleAddSpecificCopy}
                disabled={isAddingSpecificCopy}
                className="bg-primary hover:bg-primary/90 text-white gap-2"
              >
                {isAddingSpecificCopy ? <Loader2 className="w-4 h-4 animate-spin" /> : <PlusIcon className="w-4 h-4" />}
                Add Copy
              </Button>
            </div>
          </div>

          {loadingCopies ? (
            <div className="p-10 text-center opacity-70">Loading barcode copies...</div>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-[#3a3a3c]">
              <table className="w-full text-left border-collapse whitespace-nowrap">
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
                      <td colSpan={5} className="p-6">
                        <div className={`flex flex-col items-center justify-center py-8 px-4 rounded-xl border border-dashed text-center ${theme === 'dark' ? 'border-border bg-card/10 text-muted-foreground' : 'border-gray-200 bg-gray-50/50 text-gray-500'}`}>
                          <Book size={24} className="opacity-45 mb-2" />
                          <p className="text-xs font-semibold">No Copies Found</p>
                          <p className="text-[11px] opacity-70 mt-0.5">No physical copies generated for this book.</p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    viewingBookCopies.map((copy) => (
                      <tr key={copy.id} className={`border-b last:border-0 ${theme === 'dark' ? 'border-[#3a3a3c]' : 'border-gray-100'} hover:bg-black/5`}>
                        <td className="p-3">
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-semibold text-sm text-primary">{copy.barcode_id}</span>
                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity" style={{ opacity: 1 }}>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 w-6 p-0 text-gray-500 hover:text-blue-500"
                                onClick={() => handleDownloadBarcode(copy.barcode_id)}
                                title="Download Barcode"
                              >
                                <Download className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 w-6 p-0 text-gray-500 hover:text-emerald-500"
                                onClick={() => handlePrintBarcode(copy.barcode_id)}
                                title="Print Barcode"
                              >
                                <Printer className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </div>
                        </td>
                        <td className="p-3">
                          <span className={`px-2 py-1 text-[14px] font-semibold rounded-full ${copy.status === 'available' ? 'bg-emerald-500/20 text-emerald-500' :
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
            <DialogFooter className="flex flex-col sm:flex-row justify-between items-center gap-4 text-sm text-muted-foreground border-t border-border mt-4 pt-4 sm:justify-between w-full">
              <div>
                Showing {Math.min((copiesPage - 1) * 15 + 1, copiesCount)} to {Math.min(copiesPage * 15, copiesCount)} of {copiesCount} copies
              </div>
              <div className="flex items-center gap-2">
                <Button
                  disabled={copiesPage === 1}
                  onClick={() => loadBookCopiesPage(selectedBook.id, copiesPage - 1)}
                  className="bg-primary hover:bg-primary/90 text-white border-primary h-9 px-4 transition-all"
                >
                  Previous
                </Button>
                <div className="flex items-center justify-center min-w-[2rem]">
                  <span className={`text-sm font-semibold ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>
                    {copiesPage}
                  </span>
                </div>
                <Button
                  disabled={copiesPage === copiesTotalPages}
                  onClick={() => loadBookCopiesPage(selectedBook.id, copiesPage + 1)}
                  className="bg-primary hover:bg-primary/90 text-white border-primary h-9 px-4 transition-all"
                >
                  Next
                </Button>
              </div>
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>

      {/* Barcode Scanner Modal */}
      <BarcodeScannerModal
        isOpen={showCatalogScanner}
        onClose={() => setShowCatalogScanner(false)}
        onScan={(result) => {
          setBookSearch(result);
          loadBooks(result);
        }}
        title="Scan Book ISBN / Barcode"
      />
    </div>
  );
};

export default LibraryBooksCatalog;
