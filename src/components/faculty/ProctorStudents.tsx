import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Input } from "../ui/input";
import { Button } from "../ui/button";
import { useState, useEffect } from "react";
import { ProctorStudent } from "../../utils/faculty_api";
import { useTheme } from "@/context/ThemeContext";
import { SkeletonTable } from "@/components/ui/skeleton";

const ITEMS_PER_PAGE = 10;

interface ProctorStudentsProps {
  proctorStudents: ProctorStudent[];
  proctorStudentsLoading: boolean;
  pagination?: any; // pagination object returned from useProctorStudentsQuery
}

const ProctorStudents = ({ proctorStudents, proctorStudentsLoading, pagination }: ProctorStudentsProps) => {
  const [search, setSearch] = useState("");
  // Use server-side pagination provided by the pagination object when available
  const { theme } = useTheme();

  if (proctorStudentsLoading) {
    return (
      <Card className={theme === 'dark' ? 'bg-card text-foreground shadow-md' : 'bg-white text-gray-900 shadow-md'}>
        <CardHeader>
          <CardTitle className="text-2xl font-semibold leading-none tracking-tight text-gray-900">Proctor Students</CardTitle>
        </CardHeader>
        <CardContent>
          <SkeletonTable rows={10} cols={5} />
        </CardContent>
      </Card>
    );
  }

  // Client-side search (by USN or name) applied to the returned page items
  const q = search.trim().toLowerCase();
  const pageItems = (proctorStudents || []).filter((s: any) => {
    if (!q) return true;
    const name = (s.name || '').toString().toLowerCase();
    const usn = (s.usn || '').toString().toLowerCase();
    return name.includes(q) || usn.includes(q);
  });

  // Server pagination metadata
  const currentPage = pagination?.page ?? pagination?.paginationState?.page ?? 1;
  const pageSize = pagination?.pageSize ?? pagination?.paginationState?.pageSize ?? ITEMS_PER_PAGE;
  const totalPages = pagination?.paginationState?.totalPages ?? 1;
  return (
    <Card className={theme === 'dark' ? 'bg-card text-foreground shadow-md' : 'bg-white text-gray-900 shadow-md'}>
      <CardHeader>
        <CardTitle className="text-2xl font-semibold leading-none tracking-tight text-gray-900">Proctor Students</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Input
          placeholder="Search by USN or name..."
          value={search}
          onChange={e => {
            setSearch(e.target.value.replace(/[^a-zA-Z0-9\s]/g, ''));
            pagination?.goToPage?.(1);
          }}
          className={theme === 'dark' ? 'bg-background border border-input text-foreground' : 'bg-white border border-gray-300 text-gray-900'}
        />
        <div className="max-h-max overflow-y-auto overflow-x-auto">
          <table className={`min-w-full rounded-md ${theme === 'dark' ? 'border border-border' : 'border border-gray-200'}`}>
            <thead className={theme === 'dark' ? 'bg-muted text-foreground' : 'bg-gray-100 text-gray-900'}>
              <tr>
                <th className={`px-9 py-2 text-left text-sm font-medium ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>USN</th>
                <th className={`px-8 py-2 text-left text-sm font-medium ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>Name</th>
                <th className={`px-4 py-2 text-center text-sm font-medium ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>Semester</th>
                <th className={`px-4 py-2 text-center text-sm font-medium ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>Section</th>
                <th className={`px-4 py-2 text-center text-sm font-medium ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>Contact No</th>
              </tr>
            </thead>
            <tbody className={theme === 'dark' ? 'divide-border' : 'divide-gray-200'}>
              {pageItems.map((student: any, index: number) => (
                <tr key={index} className={theme === 'dark' ? 'hover:bg-muted' : 'hover:bg-gray-100'}>
                  <td className={`px-4 py-2 text-sm ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>{student.usn}</td>
                  <td className={`px-4 py-2 text-sm ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>{student.name}</td>
                  <td className={`px-4 py-2 text-center text-sm ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>{student.semester}</td>
                  <td className={`px-4 py-2 text-center text-sm ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>{student.section}</td>
                  <td className={`px-4 py-2 text-center text-sm ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>{student.contact || '-'}</td>
                </tr>
              ))}
              {proctorStudents.length === 0 && (
                <tr>
                  <td colSpan={5} className={`text-center py-4 ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>
                    No students found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {/* Pagination controls (server-driven) */}
        <div className="flex justify-end items-center gap-2 mt-3">
          <button
            onClick={() => pagination?.goToPage?.(Math.max(1, (currentPage || 1) - 1))}
            disabled={currentPage <= 1}
            className="px-3 py-1 rounded border bg-primary hover:bg-primary/90 text-white disabled:bg-[#d4a5f2] disabled:text-white disabled:border-[#d4a5f2]"
          >Previous</button>
          <span className="text-sm">{currentPage}</span>
          <button
            onClick={() => pagination?.goToPage?.(Math.min(totalPages, (currentPage || 1) + 1))}
            disabled={currentPage >= totalPages}
            className="px-3 py-1 rounded border bg-primary hover:bg-primary/90 text-white disabled:bg-[#d4a5f2] disabled:text-white disabled:border-[#d4a5f2]"
          >Next</button>
        </div>
      </CardContent>
    </Card>
  );
};

export default ProctorStudents;