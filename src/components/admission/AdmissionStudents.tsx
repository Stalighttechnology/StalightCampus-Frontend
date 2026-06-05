import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { API_ENDPOINT } from '../../utils/config';
import { fetchWithTokenRefresh } from '../../utils/authService';
import { Loader2, User, Download } from 'lucide-react';

export default function AdmissionStudents() {
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

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
    return <div className="p-8 flex justify-center"><Loader2 className="animate-spin w-8 h-8 text-primary" /></div>;
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

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4 border-b">
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
        <CardContent className="p-0">
          {students.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <User className="w-12 h-12 mx-auto mb-4 opacity-20" />
              <p>No students have been enrolled yet.</p>
              <p className="text-sm mt-2">Enroll students from the Applications tab.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-muted-foreground uppercase bg-muted/50 border-b border-border">
                  <tr>
                    <th className="px-6 py-4 font-semibold">App ID</th>
                    <th className="px-6 py-4 font-semibold">Student Name</th>
                    <th className="px-6 py-4 font-semibold">Course</th>
                    <th className="px-6 py-4 font-semibold">Phone</th>
                    <th className="px-6 py-4 font-semibold">Date of Enrollment</th>
                    <th className="px-6 py-4 text-right font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {students.map(student => (
                    <tr key={student.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-6 py-4 font-mono font-medium">#{student.id}</td>
                      <td className="px-6 py-4 flex items-center gap-3 font-medium">
                        <div className="w-8 h-8 rounded-full bg-muted overflow-hidden border border-border flex items-center justify-center flex-shrink-0">
                          {student.photo ? (
                            <img src={student.photo} alt="Student" className="w-full h-full object-cover" />
                          ) : (
                            <User className="w-4 h-4 text-muted-foreground" />
                          )}
                        </div>
                        {student.enquiry_details?.name}
                      </td>
                      <td className="px-6 py-4 text-muted-foreground">{student.enquiry_details?.course_name}</td>
                      <td className="px-6 py-4 text-muted-foreground font-mono">{student.enquiry_details?.phone}</td>
                      <td className="px-6 py-4 text-muted-foreground">{new Date(student.updated_at).toLocaleDateString()}</td>
                      <td className="px-6 py-4 text-right">
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
      </Card>
    </div>
  );
}
