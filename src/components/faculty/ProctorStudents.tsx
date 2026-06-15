import { translateTerminology, getTerm } from "@/utils/institutionConfig";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "../ui/card";
import { Input } from "../ui/input";
import { Button } from "../ui/button";
import { useState, useEffect } from "react";
import { ProctorStudent } from "../../utils/faculty_api";
import { useTheme } from "@/context/ThemeContext";
import { SkeletonTable } from "@/components/ui/skeleton";
import { useProctorStudentsQuery } from "@/hooks/useApiQueries";
import { useDebouncedSearch } from "@/hooks/useOptimizations";

import { Search, Users, FileDown } from "lucide-react";
import { API_ENDPOINT } from "../../utils/config";
import { fetchWithTokenRefresh } from "../../utils/authService";

const ProctorStudents = () => {
  const { theme } = useTheme();
  const [downloadingPDF, setDownloadingPDF] = useState(false);
  const { value: search, debouncedValue: debouncedSearch, setValue: setSearch } = useDebouncedSearch('', 500);

  const handleExportPDF = async () => {
    setDownloadingPDF(true);
    try {
      const params = new URLSearchParams();
      if (debouncedSearch) params.append('search', debouncedSearch);
      const response = await fetchWithTokenRefresh(
        `${API_ENDPOINT}/faculty/proctor-students/export-pdf/?${params.toString()}`
      );
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const cd = response.headers.get('Content-Disposition');
        let filename = 'Proctor_Students.pdf';
        if (cd) {
          const m = /filename="?([^"]+)"?/.exec(cd);
          if (m && m[1]) filename = m[1];
        }
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(url);
      } else {
        const err = await response.json().catch(() => ({}));
        alert(err.message || 'Failed to export PDF');
      }
    } catch {
      alert('Network error while exporting PDF');
    } finally {
      setDownloadingPDF(false);
    }
  };

  const includeFields = 'id,name,usn,semester,section,contact';
  const {
    data: proctorData,
    isLoading: proctorStudentsLoading,
    pagination
  } = useProctorStudentsQuery(true, includeFields, undefined, false, debouncedSearch);

  const proctorStudents = proctorData?.data || [];

  if (proctorStudentsLoading) {
    return (
      <Card className={theme === 'dark' ? 'bg-card text-foreground shadow-md' : 'bg-white text-gray-900 shadow-md'}>
        <CardHeader className="px-2 sm:px-3 md:px-4 lg:px-6 py-3 sm:py-4 md:py-5 border-b mb-3">
          <CardTitle className={`tracking-tight text-xl sm:text-xl md:text-2xl font-semibold ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>Proctor Students</CardTitle>
        </CardHeader>
        <CardContent>
          <SkeletonTable rows={10} cols={5} />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={theme === 'dark' ? 'bg-card text-foreground shadow-md' : 'bg-white text-gray-900 shadow-md'}>
      <CardHeader id="proctor-students-header" className="px-2 sm:px-3 md:px-4 lg:px-6 py-3 sm:py-4 md:py-5 border-b mb-3">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 w-full">
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between w-full sm:w-auto gap-2">
              <div className="flex items-center gap-2">
                <CardTitle className={`tracking-tight text-xl sm:text-xl md:text-2xl font-semibold ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>Proctor Students</CardTitle>
                {pagination?.paginationState?.totalItems !== undefined && (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400">
                    {pagination.paginationState.totalItems} Total
                  </span>
                )}
              </div>
              {/* Mobile Export PDF Icon Button */}
              <Button
                onClick={handleExportPDF}
                disabled={downloadingPDF || proctorStudents.length === 0}
                size="icon"
                variant="outline"
                className="flex sm:hidden h-9 w-9 items-center justify-center shrink-0 border border-input bg-background mt-1"
              >
                {downloadingPDF
                  ? <span className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                  : <FileDown className="w-4 h-4" />
                }
              </Button>
            </div>
            <p className={`text-[16px] sm:text-sm mt-1 ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}`}>
              View and export performance and attendance statistics for your proctored students
            </p>
          </div>
          <Button
            id="proctor-export-pdf-btn"
            onClick={handleExportPDF}
            disabled={downloadingPDF || proctorStudents.length === 0}
            className="hidden sm:flex w-full sm:w-auto h-9 bg-primary text-white hover:bg-primary/90 shadow-md transition-all duration-200 items-center justify-center gap-2 text-sm"
          >
            {downloadingPDF
              ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              : <FileDown className="w-4 h-4" />
            }
            Export PDF
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="relative">
          <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-400'}`} />
          <Input
            placeholder="Search by USN or name..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className={`pl-10 ${theme === 'dark' ? 'bg-background border border-input text-foreground' : 'bg-white border border-gray-300 text-gray-900'}`}
          />
        </div>
        {proctorStudents.length > 0 ? (
          <div className="max-h-max overflow-y-auto overflow-x-auto">
            <table className={`min-w-full rounded-md ${theme === 'dark' ? 'border border-border' : 'border border-gray-200'}`}>
              <thead className={theme === 'dark' ? 'bg-muted text-foreground' : 'bg-gray-100 text-gray-900'}>
                <tr>
                  <th className={`px-4 py-2 text-left text-md font-semibold whitespace-nowrap ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>USN</th>
                  <th className={`px-4 py-2 text-left text-md font-semibold whitespace-nowrap ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>Name</th>
                  <th className={`px-4 py-2 text-center text-md font-semibold whitespace-nowrap ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>{translateTerminology("Semester")}</th>
                  <th className={`px-4 py-2 text-center text-md font-semibold whitespace-nowrap ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>Section</th>
                  <th className={`px-4 py-2 text-center text-md font-semibold whitespace-nowrap ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>Contact No</th>
                </tr>
              </thead>
              <tbody className={theme === 'dark' ? 'divide-border' : 'divide-gray-200'}>
                {proctorStudents.map((student: any, index: number) => (
                  <tr key={index} className={theme === 'dark' ? 'hover:bg-muted' : 'hover:bg-gray-100'}>
                    <td className={`px-4 py-2 text-sm ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>{student.usn}</td>
                    <td className={`px-4 py-2 text-sm whitespace-nowrap ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>{student.name}</td>
                    <td className={`px-4 py-2 text-center text-sm whitespace-nowrap ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>{student.semester}</td>
                    <td className={`px-4 py-2 text-center text-sm whitespace-nowrap ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>{student.section}</td>
                    <td className={`px-4 py-2 text-center text-sm whitespace-nowrap ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>{student.contact || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className={`flex flex-col items-center justify-center py-20 px-6 text-center border-2 border-dashed rounded-2xl transition-all duration-300 ${theme === 'dark' ? 'border-border bg-card/30 text-muted-foreground' : 'border-gray-200 bg-gray-50/50 text-gray-500'}`}>
            <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-6 bg-primary/20 ${theme === 'dark' ? 'bg-muted' : 'bg-gray-100'}`}>
              <Users className="w-8 h-8 text-primary" />
            </div>
            <h3 className={`text-xl font-semibold mb-2 ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>No Students Found</h3>
            <p className="text-sm text-muted-foreground max-w-xs mx-auto">
              {debouncedSearch
                ? `We couldn't find any proctor students matching "${debouncedSearch}".`
                : "You don't have any students assigned for proctoring yet."}
            </p>
          </div>
        )}

      </CardContent>

      {pagination?.paginationState && pagination.paginationState.totalPages > 1 && (
        <CardFooter className="flex flex-col sm:flex-row justify-between items-center gap-4 text-sm text-muted-foreground px-6 py-4 border-t border-border mt-auto">
          <div>
            Showing {Math.min((pagination.paginationState.page - 1) * pagination.paginationState.pageSize + 1, pagination.paginationState.totalItems)} to {Math.min(pagination.paginationState.page * pagination.paginationState.pageSize, pagination.paginationState.totalItems)} of {pagination.paginationState.totalItems} records
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => pagination.goToPage(Math.max(1, pagination.paginationState.page - 1))}
              disabled={pagination.paginationState.page <= 1}
              className="bg-primary hover:bg-primary/90 text-white border-primary h-9 px-4 transition-all"
            >
              Previous
            </Button>

            <div className="flex items-center justify-center min-w-[2rem]">
              <span className={`text-sm font-semibold ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>
                {pagination.paginationState.page}
              </span>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => pagination.goToPage(Math.min(pagination.paginationState.totalPages, pagination.paginationState.page + 1))}
              disabled={pagination.paginationState.page >= pagination.paginationState.totalPages}
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

export default ProctorStudents;