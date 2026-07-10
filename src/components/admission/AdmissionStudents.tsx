import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { API_ENDPOINT } from '../../utils/config';
import { fetchWithTokenRefresh } from '../../utils/authService';
import { Loader2, User, Download } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { SkeletonTable } from '../ui/skeleton';

export default function AdmissionStudents() {
  const { theme } = useTheme();
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    fetchStudents();
  }, []);

  const fetchStudents = async () => {
    try {
      const response = await fetchWithTokenRefresh(`${API_ENDPOINT}/admission/manager/applications/`);
      if (response.ok) {
        const data = await response.json();
        // Only show enrolled students
        setStudents(data.filter((app: any) => app.enquiry_details?.status === 'enrolled'));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <SkeletonTable rows={5} cols={5} />
      </div>
    );
  }

  const handleExportHOD = () => {
    // Basic CSV Export logic for the HOD
    const headers = ['ID', 'Name', 'Email', 'Phone', 'Course', 'Status'];
    const csvContent = [
      headers.join(','),
      ...students.map(s => 
        [s.id, s.enquiry_details?.name, s.enquiry_details?.email, s.enquiry_details?.phone, s.enquiry_details?.course_name, s.enquiry_details?.status].join(',')
      )
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', 'HOD_Enrolled_Students.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const totalCount = students.length;
  const totalPages = Math.ceil(totalCount / itemsPerPage);
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = students.slice(indexOfFirstItem, indexOfLastItem);

  return (
    <div id="admission-students-container" className="space-y-6 w-full max-w-full overflow-hidden">
      <Card className="overflow-hidden w-full border-border">
        <CardHeader id="admission-students-header" className="flex flex-row items-center justify-between space-y-0 pb-4 border-b">
          <div>
            <CardTitle className="text-lg font-semibold">Enrolled Students</CardTitle>
            <p className="text-xs text-muted-foreground mt-1">View and export institution enrollments.</p>
          </div>
          <Button 
            onClick={handleExportHOD} 
            disabled={students.length === 0}
            size="sm" 
            className="bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm"
          >
            <Download className="w-4 h-4 mr-2" /> Export for HOD
          </Button>
        </CardHeader>
        <CardContent className={students.length === 0 ? "p-6" : "p-0"}>
          {students.length === 0 ? (
            <div className={`p-8 border-2 border-dashed rounded-xl flex flex-col items-center justify-center space-y-3 min-h-[350px] ${theme === 'dark' ? 'border-border bg-accent/5' : 'border-gray-200 bg-gray-50/50'}`}>
              <div className={`p-3 rounded-full ${theme === 'dark' ? 'bg-accent/10' : 'bg-gray-100'}`}>
                <User className={`w-8 h-8 ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-400'}`} />
              </div>
              <div className="text-center">
                <p className={`text-sm font-medium ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>No students have been enrolled yet.</p>
                <p className={`text-xs mt-1 ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}`}>Enroll students from the Applications tab.</p>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[800px] text-sm text-left">
                <thead className="text-xs text-muted-foreground uppercase bg-muted/50 border-b border-border">
                  <tr>
                    <th className="px-6 py-4 font-semibold whitespace-nowrap">App ID</th>
                    <th className="px-6 py-4 font-semibold whitespace-nowrap">Student Name</th>
                    <th className="px-6 py-4 font-semibold whitespace-nowrap">Course</th>
                    <th className="px-6 py-4 font-semibold whitespace-nowrap">Phone</th>
                    <th className="px-6 py-4 font-semibold whitespace-nowrap">Date of Enrollment</th>
                    <th className="px-6 py-4 text-right font-semibold whitespace-nowrap">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {currentItems.map(student => (
                    <tr key={student.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-6 py-4 font-mono font-medium whitespace-nowrap">#{student.id}</td>
                      <td className="px-6 py-4 font-medium whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-muted overflow-hidden border border-border flex items-center justify-center flex-shrink-0">
                            {student.photo ? (
                              <img src={student.photo} alt="Student" className="w-full h-full object-cover" />
                            ) : (
                              <User className="w-4 h-4 text-muted-foreground" />
                            )}
                          </div>
                          {student.enquiry_details?.name}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-muted-foreground whitespace-nowrap">{student.enquiry_details?.course_name}</td>
                      <td className="px-6 py-4 text-muted-foreground font-mono whitespace-nowrap">{student.enquiry_details?.phone}</td>
                      <td className="px-6 py-4 text-muted-foreground whitespace-nowrap">{new Date(student.updated_at).toLocaleDateString()}</td>
                      <td className="px-6 py-4 text-right whitespace-nowrap">
                        <span className="bg-green-100 text-green-700 px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase">
                          Enrolled
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
        {totalPages > 1 && (
          <CardFooter className="flex flex-col sm:flex-row justify-between items-center gap-4 text-sm text-muted-foreground px-6 py-4 border-t border-border mt-auto">
            <div>
              Showing {Math.min((currentPage - 1) * itemsPerPage + 1, totalCount)} to {Math.min(currentPage * itemsPerPage, totalCount)} of {totalCount} enrolled students
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1 || loading}
                className="bg-primary hover:bg-primary/90 text-white border-primary h-9 px-4 transition-all">
                Previous
              </Button>

              <div className="flex items-center justify-center min-w-[2rem]">
                <span className={`text-sm font-semibold ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>
                  {currentPage}
                </span>
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages || loading}
                className="bg-primary hover:bg-primary/90 text-white border-primary h-9 px-4 transition-all">
                Next
              </Button>
            </div>
          </CardFooter>
        )}
      </Card>
    </div>
  );
}
