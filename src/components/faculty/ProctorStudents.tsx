import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Input } from "../ui/input";
import { Button } from "../ui/button";
import { useState, useEffect } from "react";
import { ProctorStudent } from "../../utils/faculty_api";
import { useTheme } from "@/context/ThemeContext";
import { SkeletonTable } from "@/components/ui/skeleton";
import { useProctorStudentsQuery } from "@/hooks/useApiQueries";
import { useDebouncedSearch } from "@/hooks/useOptimizations";
import { AdminPagination } from "../common/AdminPagination";
import { Search, Users } from "lucide-react";

const ProctorStudents = () => {
  const { theme } = useTheme();
  const { value: search, debouncedValue: debouncedSearch, setValue: setSearch } = useDebouncedSearch('', 500);

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
        <CardHeader>
          <CardTitle className="text-2xl font-semibold leading-none tracking-tight text-gray-900">Proctor Students</CardTitle>
        </CardHeader>
        <CardContent>
          <SkeletonTable rows={10} cols={5} />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={theme === 'dark' ? 'bg-card text-foreground shadow-md' : 'bg-white text-gray-900 shadow-md'}>
      <CardHeader>
        <CardTitle className="text-2xl font-semibold leading-none tracking-tight text-gray-900">Proctor Students</CardTitle>
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
        <div className="max-h-max overflow-y-auto overflow-x-auto">
          <table className={`min-w-full rounded-md ${theme === 'dark' ? 'border border-border' : 'border border-gray-200'}`}>
            <thead className={theme === 'dark' ? 'bg-muted text-foreground' : 'bg-gray-100 text-gray-900'}>
              <tr>
                <th className={`px-4 py-2 text-left text-md font-semibold whitespace-nowrap ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>USN</th>
                <th className={`px-4 py-2 text-left text-md font-semibold whitespace-nowrap ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>Name</th>
                <th className={`px-4 py-2 text-center text-md font-semibold whitespace-nowrap ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>Semester</th>
                <th className={`px-4 py-2 text-center text-md font-semibold whitespace-nowrap ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>Section</th>
                <th className={`px-4 py-2 text-center text-md font-semibold whitespace-nowrap ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>Contact No</th>
              </tr>
            </thead>
            <tbody className={theme === 'dark' ? 'divide-border' : 'divide-gray-200'}>
              {proctorStudents.length > 0 ? (
                proctorStudents.map((student: any, index: number) => (
                  <tr key={index} className={theme === 'dark' ? 'hover:bg-muted' : 'hover:bg-gray-100'}>
                    <td className={`px-4 py-2 text-sm ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>{student.usn}</td>
                    <td className={`px-4 py-2 text-sm whitespace-nowrap ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>{student.name}</td>
                    <td className={`px-4 py-2 text-center text-sm whitespace-nowrap ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>{student.semester}</td>
                    <td className={`px-4 py-2 text-center text-sm whitespace-nowrap ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>{student.section}</td>
                    <td className={`px-4 py-2 text-center text-sm whitespace-nowrap ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>{student.contact || '-'}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="px-4 py-12">
                    <div className={`flex flex-col items-center justify-center text-center`}>
                      <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-4 bg-primary/20 ${theme === 'dark' ? 'bg-muted' : 'bg-gray-100'}`}>
                        <Users className="w-8 h-8 text-primary" />
                      </div>
                      <h3 className="text-lg font-semibold mb-1">No students found</h3>
                      <p className="text-sm text-muted-foreground max-w-xs mx-auto">
                        {debouncedSearch 
                          ? `We couldn't find any proctor students matching "${debouncedSearch}".`
                          : "You don't have any students assigned for proctoring yet."}
                      </p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <AdminPagination
          pagination={pagination.paginationState}
          onPageChange={pagination.goToPage}
        />
      </CardContent>
    </Card>
  );
};

export default ProctorStudents;