import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, Trash2, Edit, Loader2 } from 'lucide-react';
import { API_ENDPOINT } from '../../utils/config';
import { fetchWithTokenRefresh } from '../../utils/authService';

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
        setIsEditing(false);
        setCurrentCourse({ name: '', code: '', duration_years: 4, description: '' });
        fetchCourses();
      }
    } catch (err) {
      console.error('Failed to save course', err);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this course?')) return;
    try {
      const response = await fetchWithTokenRefresh(`${API_ENDPOINT}/admission/manager/courses/${id}/`, {
        method: 'DELETE'
      });
      if (response.ok) {
        fetchCourses();
      }
    } catch (err) {
      console.error('Failed to delete course', err);
    }
  };

  if (loading) {
    return <div className="p-8 flex justify-center"><Loader2 className="animate-spin w-8 h-8 text-primary" /></div>;
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Manage Courses</h1>
        <Button onClick={() => {
          setIsEditing(true);
          setCurrentCourse({ name: '', code: '', duration_years: 4, description: '' });
        }}>
          <Plus size={16} className="mr-2" /> Add Course
        </Button>
      </div>

      {isEditing && (
        <Card className="mb-8 border-primary/20">
          <CardHeader>
            <CardTitle>{currentCourse.id ? 'Edit Course' : 'Add New Course'}</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSave} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Course Name</label>
                  <input type="text" required value={currentCourse.name} onChange={e => setCurrentCourse({...currentCourse, name: e.target.value})} className="w-full p-2 border border-input rounded bg-background" placeholder="e.g. Bachelor of Technology" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Course Code</label>
                  <input type="text" required value={currentCourse.code} onChange={e => setCurrentCourse({...currentCourse, code: e.target.value})} className="w-full p-2 border border-input rounded bg-background" placeholder="e.g. BTECH-CS" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Duration (Years)</label>
                  <input type="number" required min={1} max={6} value={currentCourse.duration_years} onChange={e => setCurrentCourse({...currentCourse, duration_years: parseInt(e.target.value)})} className="w-full p-2 border border-input rounded bg-background" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Description</label>
                <textarea required value={currentCourse.description} onChange={e => setCurrentCourse({...currentCourse, description: e.target.value})} className="w-full p-2 border border-input rounded bg-background" rows={3} placeholder="Briefly describe the course..."></textarea>
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="ghost" onClick={() => setIsEditing(false)}>Cancel</Button>
                <Button type="submit">Save Course</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="p-0">
          {courses.length === 0 && !isEditing ? (
            <div className="text-center py-12 text-muted-foreground border-b border-border">
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
