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

import { Search, Users, FileDown, ScanFace } from "lucide-react";
import { API_ENDPOINT } from "../../utils/config";
import { fetchWithTokenRefresh } from "../../utils/authService";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import FaceRecognitionUploader from "@/components/common/FaceRecognitionUploader";
import ProctorStudentParentModal from "./ProctorStudentParentModal";

const ProctorStudents = () => {
  const { theme } = useTheme();
  const [downloadingPDF, setDownloadingPDF] = useState(false);
  const { value: search, debouncedValue: debouncedSearch, setValue: setSearch } = useDebouncedSearch('', 500);
  const [selectedStudentFace, setSelectedStudentFace] = useState<any>(null);
  const [selectedStudentParent, setSelectedStudentParent] = useState<any>(null);

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

  return (
    <Card className={theme === 'dark' ? 'bg-card text-foreground shadow-md' : 'bg-white text-gray-900 shadow-md'}>
      <CardHeader id="proctor-students-header" className="px-2 sm:px-3 md:px-4 lg:px-6 py-3 sm:py-4 md:py-5 border-b mb-3">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 w-full">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <CardTitle className={`tracking-tight text-xl sm:text-xl md:text-2xl font-semibold ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>Proctor Students</CardTitle>
              {proctorData?.pagination?.total !== undefined && (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400">
                  {proctorData.pagination.total} Total
                </span>
              )}
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
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-400'}`} />
            <Input
              placeholder="Search by USN or name..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className={`pl-10 pr-12 ${theme === 'dark' ? 'bg-background border border-input text-foreground' : 'bg-white border border-gray-300 text-gray-900'}`}
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-primary hover:text-primary/80 transition-colors"
              >
                Clear
              </button>
            )}
          </div>
          {/* Mobile Export PDF Icon Button */}
          <Button
            onClick={handleExportPDF}
            disabled={downloadingPDF || proctorStudents.length === 0}
            size="icon"
            variant="outline"
            className="flex sm:hidden h-10 w-10 items-center justify-center shrink-0 border border-input bg-background"
          >
            {downloadingPDF
              ? <span className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              : <FileDown className="w-4 h-4" />
            }
          </Button>
        </div>
        {proctorStudentsLoading ? (
          <SkeletonTable rows={10} cols={5} />
        ) : proctorStudents.length > 0 ? (
          <div className="max-h-max overflow-y-auto overflow-x-auto">
            <table className={`min-w-full rounded-md ${theme === 'dark' ? 'border border-border' : 'border border-gray-200'}`}>
              <thead className={theme === 'dark' ? 'bg-muted text-foreground' : 'bg-gray-100 text-gray-900'}>
                <tr>
                  <th className={`px-4 py-2 text-left text-md font-semibold whitespace-nowrap ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>USN</th>
                  <th className={`px-4 py-2 text-left text-md font-semibold whitespace-nowrap ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>Name</th>
                  <th className={`px-4 py-2 text-center text-md font-semibold whitespace-nowrap ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>{translateTerminology("Semester")}</th>
                  <th className={`px-4 py-2 text-center text-md font-semibold whitespace-nowrap ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>Section</th>
                  <th className={`px-4 py-2 text-center text-md font-semibold whitespace-nowrap ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>Contact No</th>
                  <th className={`px-4 py-2 text-center text-md font-semibold whitespace-nowrap ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>Actions</th>
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
                    <td className={`px-4 py-2 text-center text-sm whitespace-nowrap ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>
                      <div className="flex items-center justify-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          title="Train Face"
                          onClick={() => setSelectedStudentFace(student)}
                          className="flex items-center gap-1.5 hover:bg-primary/10 transition-colors"
                        >
                          <ScanFace className="w-4 h-4 text-primary" />
                          <span className="text-xs font-medium text-primary">Train</span>
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          title="Parental Access"
                          onClick={() => setSelectedStudentParent(student)}
                          className="flex items-center gap-1.5 hover:bg-primary/10 transition-colors"
                        >
                          <Users className="w-4 h-4 text-primary" />
                          <span className="text-xs font-medium text-primary">Parents</span>
                        </Button>
                      </div>
                    </td>
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

      {proctorData?.pagination && proctorData.pagination.total_pages > 1 && (
        <CardFooter className="flex flex-col sm:flex-row justify-between items-center gap-4 text-sm text-muted-foreground px-6 py-4 border-t border-border mt-auto">
          <div>
            Showing {Math.min((proctorData.pagination.page - 1) * proctorData.pagination.page_size + 1, proctorData.pagination.total)} to {Math.min(proctorData.pagination.page * proctorData.pagination.page_size, proctorData.pagination.total)} of {proctorData.pagination.total} records
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => pagination.goToPage(Math.max(1, proctorData.pagination.page - 1))}
              disabled={proctorData.pagination.page <= 1}
              className="bg-primary hover:bg-primary/90 text-white border-primary h-9 px-4 transition-all"
            >
              Previous
            </Button>

            <div className="flex items-center justify-center min-w-[2rem]">
              <span className={`text-sm font-semibold ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>
                {proctorData.pagination.page}
              </span>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => pagination.goToPage(Math.min(proctorData.pagination.total_pages, proctorData.pagination.page + 1))}
              disabled={proctorData.pagination.page >= proctorData.pagination.total_pages}
              className="bg-primary hover:bg-primary/90 text-white border-primary h-9 px-4 transition-all"
            >
              Next
            </Button>
          </div>
        </CardFooter>
      )}
      <Dialog open={!!selectedStudentFace} onOpenChange={(open) => !open && setSelectedStudentFace(null)}>
        <DialogContent className={`sm:max-w-[600px] w-[95vw] p-4 sm:p-6 max-h-[90vh] overflow-y-auto ${theme === 'dark' ? 'bg-card text-card-foreground border-border' : 'bg-white'}`}>
          <DialogHeader>
            <DialogTitle className="pr-8 text-base sm:text-lg leading-tight">Train Face: {selectedStudentFace?.name} <span className="block sm:inline text-sm sm:text-base font-normal text-muted-foreground">({selectedStudentFace?.usn})</span></DialogTitle>
          </DialogHeader>
          {selectedStudentFace && (
            <FaceRecognitionUploader
              title=""
              description={`Upload 3 to 5 images for ${selectedStudentFace.name}`}
              statusEndpoint={`/faculty/proctor-students/${selectedStudentFace.id}/check-face-status/`}
              trainEndpoint={`/faculty/proctor-students/${selectedStudentFace.id}/train-face/`}
            />
          )}
        </DialogContent>
      </Dialog>
      <ProctorStudentParentModal 
        student={selectedStudentParent} 
        onClose={() => setSelectedStudentParent(null)} 
      />
    </Card>
  );
};

export default ProctorStudents;