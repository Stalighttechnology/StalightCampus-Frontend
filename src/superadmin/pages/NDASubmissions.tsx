import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "../../components/ui/card";
import { Download, Search, FileText, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "../../components/ui/button";
import { useTheme } from "../../context/ThemeContext";
import { API_BASE_URL } from "@/utils/config";
import { fetchWithSuperadminTokenRefresh } from "../../utils/authService";

const NDASubmissions = () => {
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
  
  // Pagination state
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [total, setTotal] = useState(0);

  const { theme } = useTheme();

  // Debounce search
  useEffect(() => {
    const timerId = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
      setPage(1); // Reset to first page on new search
    }, 500);

    return () => {
      clearTimeout(timerId);
    };
  }, [searchTerm]);

  useEffect(() => {
    const fetchSubmissions = async () => {
      setLoading(true);
      try {
        const queryParams = new URLSearchParams({
          page: page.toString(),
          page_size: pageSize.toString(),
          search: debouncedSearchTerm
        });
        
        const response = await fetchWithSuperadminTokenRefresh(`${API_BASE_URL}/api/superadmin/nda-submissions/?${queryParams.toString()}`, {
          headers: {
            "Authorization": `Bearer ${localStorage.getItem("superadmin_token")}`
          }
        });
        const data = await response.json();
        
        if (data.submissions) {
          setSubmissions(data.submissions);
          setTotal(data.total || 0);
        }
      } catch (error) {
        console.error("Error fetching NDA submissions:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchSubmissions();
  }, [page, pageSize, debouncedSearchTerm]);

  const totalPages = Math.ceil(total / pageSize);
  const startItem = (page - 1) * pageSize + 1;
  const endItem = Math.min(page * pageSize, total);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className={`text-3xl font-bold tracking-tight ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>NDA & Consents</h1>
          <p className="text-muted-foreground mt-1">View and download all signed NDA documents.</p>
        </div>
      </div>

      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-3 border-b border-border/50">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <CardTitle className="text-lg font-medium flex items-center gap-2">
              <FileText className="w-5 h-5 text-indigo-500" />
              Submissions Directory
            </CardTitle>
            <div className="relative w-full sm:w-64">
              <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                <Search className="w-4 h-4 text-muted-foreground" />
              </div>
              <input
                type="text"
                className="w-full pl-10 pr-4 py-2 text-sm border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                placeholder="Search name, ID, or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto min-h-[400px]">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-muted-foreground uppercase bg-muted/50">
                <tr>
                  <th className="px-6 py-4 font-medium">Name & Email</th>
                  <th className="px-6 py-4 font-medium">ID</th>
                  <th className="px-6 py-4 font-medium">Role</th>
                  <th className="px-6 py-4 font-medium">Department</th>
                  <th className="px-6 py-4 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {loading ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-muted-foreground">
                      <div className="flex justify-center items-center gap-2">
                        <div className="w-4 h-4 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                        Fetching records...
                      </div>
                    </td>
                  </tr>
                ) : submissions.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-muted-foreground">
                      <FileText className="w-8 h-8 mx-auto text-muted-foreground/50 mb-3" />
                      <p>No submissions found matching your search.</p>
                    </td>
                  </tr>
                ) : (
                  submissions.map((sub) => (
                    <tr key={sub.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-6 py-4">
                        <div className="font-medium text-foreground">{sub.full_name}</div>
                        <div className="text-xs text-muted-foreground">{sub.personal_email}</div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-indigo-50 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-500/20">
                          {sub.employee_intern_id}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        {sub.role === 'EMPLOYEE' ? (
                          <span className="text-emerald-600 dark:text-emerald-400 font-medium text-xs">Employee</span>
                        ) : (
                          <span className="text-amber-600 dark:text-amber-400 font-medium text-xs">Intern</span>
                        )}
                        <div className="text-xs text-muted-foreground">{sub.designation}</div>
                      </td>
                      <td className="px-6 py-4 text-muted-foreground">
                        {sub.department}
                      </td>
                      <td className="px-6 py-4 text-right">
                        {sub.pdf_url ? (
                          <a
                            href={sub.pdf_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 focus:ring-2 focus:ring-indigo-500 focus:outline-none transition-colors shadow-sm"
                          >
                            <Download className="w-3.5 h-3.5" />
                            Download
                          </a>
                        ) : (
                          <span className="text-xs text-muted-foreground italic px-3 py-1.5 border border-dashed rounded-md">Pending PDF</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
        {total > 0 && (
          <CardFooter className="flex items-center justify-between border-t border-border/50 px-6 py-4 bg-muted/10">
            <div className="text-sm text-muted-foreground">
              Showing <span className="font-medium text-foreground">{startItem}</span> to <span className="font-medium text-foreground">{endItem}</span> of <span className="font-medium text-foreground">{total}</span> results
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1 || loading}
                className="h-8 gap-1 pl-2.5"
              >
                <ChevronLeft className="h-4 w-4" />
                <span className="sr-only sm:not-sr-only sm:inline-block">Previous</span>
              </Button>
              <div className="flex items-center justify-center text-sm font-medium w-10">
                {page} / {totalPages || 1}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages || loading}
                className="h-8 gap-1 pr-2.5"
              >
                <span className="sr-only sm:not-sr-only sm:inline-block">Next</span>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </CardFooter>
        )}
      </Card>
    </div>
  );
};

export default NDASubmissions;
