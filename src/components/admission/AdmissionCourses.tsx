import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, Trash2, Edit, Loader2 } from 'lucide-react';
import { API_ENDPOINT } from '../../utils/config';
import { fetchWithTokenRefresh } from '../../utils/authService';
import { toast } from 'sonner';

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

  useEffect(() => {
    fetchCourses();
  }, []);

  const fetchCourses = async () => {
    try {
      const response = await fetchWithTokenRefresh(`${API_ENDPOINT}/admission/manager/courses/`);
      if (response.ok) {
        const data = await response.json();
        setCourses(data);
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
           setCourses(prev => [...prev, savedCourse]);
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
    if (!confirm('Are you sure you want to delete this course?')) return;
    try {
      const response = await fetchWithTokenRefresh(`${API_ENDPOINT}/admission/manager/courses/${id}/`, {
        method: 'DELETE'
      });
      if (response.ok) {
        toast.success('Course deleted successfully');
        setCourses(prev => prev.filter(c => c.id !== id));
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
      <div className="space-y-6 animate-pulse">
        <Card className="border-border">
          <CardHeader className="flex flex-row items-center justify-between pb-4 border-b">
            <div className="space-y-2">
              <div className="h-6 w-36 bg-muted rounded" />
              <div className="h-3.5 w-72 bg-muted rounded" />
            </div>
            <div className="h-9 w-28 bg-muted rounded" />
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-muted/50 border-b border-border">
                  <tr>
                    {[1, 2, 3, 4, 5].map((i) => (
                      <th key={i} className="px-6 py-4">
                        <div className="h-4 w-20 bg-muted rounded" />
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {[1, 2, 3, 4, 5].map((row) => (
                    <tr key={row}>
                      {[1, 2, 3, 4, 5].map((col) => (
                        <td key={col} className="px-6 py-4">
                          <div className="h-4 bg-muted rounded w-24" />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div id="admission-courses-container" className="space-y-6">
      {isEditing && (
        <Card className="border-primary/20">
          <CardHeader>
            <CardTitle className="text-lg">{currentCourse.id ? 'Edit Course' : 'Add New Course'}</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSave} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">Course Name</label>
                  <input type="text" required value={currentCourse.name} onChange={e => setCurrentCourse({...currentCourse, name: e.target.value})} className="w-full p-2.5 border border-input rounded bg-background focus:ring-1 focus:ring-primary focus:border-transparent outline-none text-sm" placeholder="e.g. Bachelor of Technology" />
                </div>
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
                <textarea required value={currentCourse.description} onChange={e => setCurrentCourse({...currentCourse, description: e.target.value})} className="w-full p-2.5 border border-input rounded bg-background focus:ring-1 focus:ring-primary focus:border-transparent outline-none text-sm" rows={3} placeholder="Briefly describe the course..."></textarea>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="ghost" onClick={() => setIsEditing(false)}>Cancel</Button>
                <Button type="submit">Save Course</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <Card>
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
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-muted-foreground uppercase bg-muted/50 border-b border-border">
                  <tr>
                    <th className="px-6 py-4 font-semibold">Course Code</th>
                    <th className="px-6 py-4 font-semibold">Course Name</th>
                    <th className="px-6 py-4 font-semibold">Duration</th>
                    <th className="px-6 py-4 font-semibold">Description</th>
                    <th className="px-6 py-4 text-right font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {courses.map(course => (
                    <tr key={course.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-6 py-4 font-mono font-medium text-foreground whitespace-nowrap">
                        {course.code}
                      </td>
                      <td className="px-6 py-4 font-medium text-foreground">
                        {course.name}
                      </td>
                      <td className="px-6 py-4 text-muted-foreground whitespace-nowrap">
                        {course.duration_years} Year{course.duration_years > 1 ? 's' : ''}
                      </td>
                      <td className="px-6 py-4 text-muted-foreground max-w-xs truncate">
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
      </Card>
    </div>
  );
};
export default AdmissionCourses;
