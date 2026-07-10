import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Plus, Trash2, Edit, Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { SkeletonTable } from '../ui/skeleton';
import { API_ENDPOINT } from '../../utils/config';
import { fetchWithTokenRefresh } from '../../utils/authService';
import { toast } from 'sonner';
import { useTheme } from "../../context/ThemeContext";
import Swal from 'sweetalert2';

interface Course {
  id?: number;
  name: string;
  code: string;
  duration_years: number;
  description: string;
}

const AdmissionCourses: React.FC = () => {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [currentCourse, setCurrentCourse] = useState<Course>({ name: '', code: '', duration_years: 4, description: '' });

  const [currentPage, setCurrentPage] = useState(1);
  const [totalServerCount, setTotalServerCount] = useState(0);
  const { theme } = useTheme();
  const pageSize = 20;
  const totalCount = totalServerCount;
  const totalPages = Math.ceil(totalCount / pageSize);

  const paginatedCourses = courses;

  useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(totalPages);
    }
  }, [courses, totalPages, currentPage]);

  useEffect(() => {
    fetchCourses(currentPage);
  }, [currentPage]);

  const fetchCourses = async (page: number = 1) => {
    setLoading(true);
    try {
      const response = await fetchWithTokenRefresh(`${API_ENDPOINT}/admission/manager/courses/?page=${page}`);
      if (response.ok) {
        const data = await response.json();
        setCourses(data.results || (Array.isArray(data) ? data : []));
        setTotalServerCount(data.count ?? (Array.isArray(data) ? data.length : 0));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const method = currentCourse.id ? 'PUT' : 'POST';
      const url = currentCourse.id 
        ? `${API_ENDPOINT}/admission/manager/courses/${currentCourse.id}/` 
        : `${API_ENDPOINT}/admission/manager/courses/`;

      const response = await fetchWithTokenRefresh(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(currentCourse)
      });

      if (response.ok) {
        const savedCourse = await response.json();
        setIsEditing(false);
        setCurrentCourse({ name: '', code: '', duration_years: 4, description: '' });
        toast.success(method === 'POST' ? 'Course added successfully!' : 'Course updated successfully!');
        if (method === 'POST') {
           fetchCourses(currentPage); // Re-fetch to maintain pagination
        } else {
           setCourses(prev => prev.map(c => c.id === savedCourse.id ? savedCourse : c));
        }
      } else {
        toast.error('Failed to save course');
      }
    } catch (err) {
      console.error('Failed to save course', err);
      toast.error('Failed to save course');
    }
  };

  const handleDelete = async (id: number) => {
    const result = await Swal.fire({
      title: 'Are you sure?',
      text: "You won't be able to revert this!",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Yes, delete it!'
    });
    
    if (!result.isConfirmed) return;
    
    try {
      const response = await fetchWithTokenRefresh(`${API_ENDPOINT}/admission/manager/courses/${id}/`, {
        method: 'DELETE'
      });
      if (response.ok) {
        toast.success('Course deleted successfully');
        fetchCourses(currentPage); // Re-fetch to get correct paginated results
      } else {
        toast.error('Failed to delete course');
      }
    } catch (err) {
      console.error('Failed to delete course', err);
      toast.error('Failed to delete course');
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <SkeletonTable rows={5} cols={5} />
      </div>
    );
  }

  return (
    <div id="admission-courses-container" className="space-y-6 w-full max-w-full overflow-hidden">
      <Dialog open={isEditing} onOpenChange={setIsEditing}>
        {isEditing && (
          <DialogContent className="w-[90%] rounded-2xl max-h-[90vh] overflow-y-auto sm:max-w-[550px] p-6">
            <DialogHeader>
              <DialogTitle className="text-lg font-semibold">{currentCourse.id ? 'Edit Course' : 'Add New Course'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSave} className="space-y-4 pt-2">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">Course Name</label>
                <input type="text" required value={currentCourse.name} onChange={e => setCurrentCourse({...currentCourse, name: e.target.value})} className="w-full p-2.5 border border-input rounded bg-background focus:ring-1 focus:ring-primary focus:border-transparent outline-none text-sm" placeholder="e.g. Bachelor of Technology" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">Course Code</label>
                  <input type="text" required value={currentCourse.code} onChange={e => setCurrentCourse({...currentCourse, code: e.target.value})} className="w-full p-2.5 border border-input rounded bg-background focus:ring-1 focus:ring-primary focus:border-transparent outline-none text-sm font-mono" placeholder="e.g. BTECH-CS" />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">Duration (Years)</label>
                  <input type="number" required min={1} max={6} value={currentCourse.duration_years} onChange={e => setCurrentCourse({...currentCourse, duration_years: parseInt(e.target.value)})} className="w-full p-2.5 border border-input rounded bg-background focus:ring-1 focus:ring-primary focus:border-transparent outline-none text-sm" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">Description</label>
                <textarea required value={currentCourse.description} onChange={e => setCurrentCourse({...currentCourse, description: e.target.value})} className="w-full p-2.5 border border-input rounded bg-background focus:ring-1 focus:ring-primary focus:border-transparent outline-none text-sm h-[100px] resize-none overflow-y-auto custom-scrollbar" placeholder="Briefly describe the course..."></textarea>
              </div>
              <DialogFooter className="pt-2">
                <Button type="button" variant="outline" onClick={() => setIsEditing(false)}>Cancel</Button>
                <Button type="submit">Save Course</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        )}
      </Dialog>

      <Card className="overflow-hidden w-full border-border">
        <CardHeader id="admission-courses-header" className="flex flex-row items-center justify-between space-y-0 pb-4 border-b">
          <div>
            <CardTitle className="text-lg font-semibold">Manage Courses</CardTitle>
            <p className="text-xs text-muted-foreground mt-1">Create and modify courses offered by your institution.</p>
          </div>
          <Button onClick={() => {
            setIsEditing(true);
            setCurrentCourse({ name: '', code: '', duration_years: 4, description: '' });
          }} size="sm" className="shadow-sm">
            <Plus size={16} className="mr-2" /> Add Course
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          {courses.length === 0 && !isEditing ? (
            <div className="text-center py-12 text-muted-foreground">
              <p>No courses found. Add a course to display it on the admission landing page.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[800px] text-sm text-left">
                <thead className="text-xs text-muted-foreground uppercase bg-muted/50 border-b border-border">
                  <tr>
                    <th className="px-6 py-4 font-semibold whitespace-nowrap">Course Code</th>
                    <th className="px-6 py-4 font-semibold whitespace-nowrap">Course Name</th>
                    <th className="px-6 py-4 font-semibold whitespace-nowrap">Duration</th>
                    <th className="px-6 py-4 font-semibold whitespace-nowrap">Description</th>
                    <th className="px-6 py-4 text-right font-semibold whitespace-nowrap">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {paginatedCourses.map(course => (
                    <tr key={course.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-6 py-4 font-mono font-medium text-foreground whitespace-nowrap">
                        {course.code}
                      </td>
                      <td className="px-6 py-4 font-medium text-foreground whitespace-nowrap">
                        {course.name}
                      </td>
                      <td className="px-6 py-4 text-muted-foreground whitespace-nowrap">
                        {course.duration_years} Year{course.duration_years > 1 ? 's' : ''}
                      </td>
                      <td className="px-6 py-4 text-muted-foreground max-w-xs truncate whitespace-nowrap">
                        {course.description}
                      </td>
                      <td className="px-6 py-4 text-right whitespace-nowrap">
                        <div className="flex justify-end gap-2">
                          <Button variant="ghost" size="icon" onClick={() => { setIsEditing(true); setCurrentCourse(course); }} className="h-8 w-8 text-primary hover:bg-primary/10">
                            <Edit size={16} />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => handleDelete(course.id!)} className="h-8 w-8 text-destructive hover:bg-destructive/10">
                            <Trash2 size={16} />
                          </Button>
                        </div>
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
              Showing {Math.min((currentPage - 1) * pageSize + 1, totalCount)} to {Math.min(currentPage * pageSize, totalCount)} of {totalCount} courses
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
};
export default AdmissionCourses;
