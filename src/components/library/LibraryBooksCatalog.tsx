import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Search, Plus, MapPin, X, Plus as PlusIcon,
  Eye, Edit, Trash2, Download, Loader2
} from "lucide-react";
import Swal from "sweetalert2";
import { Card, CardHeader, CardTitle, CardFooter } from "../ui/card";
import { Button } from "../ui/button";
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

  // Dynamic Category list
  const [categories, setCategories] = useState<string[]>(() => {
    const saved = localStorage.getItem("library_categories");
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {}
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
    physical_location: ""
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
        physical_location: ""
      });
      loadBooks(bookSearch);
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

  return (
    <div className="space-y-4">
      {/* Books List — all inside one Card */}
      <Card className={`border overflow-hidden shadow-sm ${theme === 'dark' ? 'bg-card border-border text-foreground' : 'bg-white border-gray-200 text-gray-900'}`}>
        <CardHeader className="pb-3 border-b border-gray-200 dark:border-border">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 mb-0.5">
                <CardTitle className="sm:text-2xl text-lg font-semibold">Book Catalog</CardTitle>
                {books.length > 0 && (
                  <span className={`text-xs font-medium px-2.5 py-0.5 rounded-full mt-0.5 ${theme === 'dark' ? 'bg-primary/10 text-primary' : 'bg-blue-100 text-blue-700'}`}>
                    {books.length} Titles
                  </span>
                )}
              </div>
              <p className={`text-sm ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}`}>Manage library book titles, ISBN codes, and physical copy inventory.</p>
            </div>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-2.5 w-4 h-4 opacity-50" />
                <input
                  type="text"
                  placeholder="Search by Title, Author, or ISBN..."
                  value={bookSearch}
                  onChange={(e) => {
                    setBookSearch(e.target.value);
                    loadBooks(e.target.value);
                  }}
                  className={`w-full sm:w-72 pl-9 pr-4 py-2 text-sm rounded-lg border focus:outline-none focus:ring-1 focus:ring-primary ${theme === 'dark' ? 'bg-[#1c1c1e] border-[#3a3a3c] text-white' : 'bg-gray-50 border-gray-200 text-gray-900'}`}
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
                className="bg-primary hover:bg-primary/95 text-white font-semibold px-4 py-2 rounded-lg flex items-center justify-center gap-2"
              >
                <Plus className="w-4 h-4" /> Add Book Title
              </Button>

                            <Button
                variant="outline"
                onClick={handleExportPDF}
                disabled={exporting || books.length === 0}
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
        <DialogContent className={`w-[92vw] sm:max-w-lg border p-6 shadow-2xl rounded-xl max-h-[90vh] overflow-y-auto custom-scrollbar ${theme === 'dark' ? 'bg-[#2c2c2e] border-[#3a3a3c] text-white' : 'bg-white border-gray-200 text-gray-900'}`}>
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
        </DialogContent>
      </Dialog>

      {/* View Book Copies Modal */}
      <Dialog open={showViewModal} onOpenChange={setShowViewModal}>
        <DialogContent className={`w-[92vw] md:w-[90vw] lg:max-w-4xl p-6 rounded-2xl shadow-2xl custom-scrollbar overflow-y-auto max-h-[85vh] ${theme === 'dark' ? 'bg-[#1c1c1e] text-white border border-[#3a3a3c]' : 'bg-white text-gray-900'}`}>
          <DialogHeader className="mb-6 border-b pb-3 border-gray-200 dark:border-[#3a3a3c]">
            <DialogTitle className={`text-xl font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{selectedBook?.title}</DialogTitle>
            <p className="text-sm opacity-70">Physical Copies & Circulation Status</p>
          </DialogHeader>

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
                      <td colSpan={5} className="text-center p-6 opacity-60 text-sm">No physical copies generated for this book.</td>
                    </tr>
                  ) : (
                    viewingBookCopies.map((copy) => (
                      <tr key={copy.id} className={`border-b last:border-0 ${theme === 'dark' ? 'border-[#3a3a3c]' : 'border-gray-100'} hover:bg-black/5`}>
                        <td className="p-3 font-mono font-semibold text-sm text-primary">{copy.barcode_id}</td>
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
    </div>
  );
};

export default LibraryBooksCatalog;
