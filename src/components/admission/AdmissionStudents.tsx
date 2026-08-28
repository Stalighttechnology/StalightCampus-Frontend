import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { API_ENDPOINT } from '../../utils/config';
import { fetchWithTokenRefresh } from '../../utils/authService';
import { Loader2, User, Download, Phone, Mail, Filter, Search, GraduationCap } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { SkeletonTable } from '../ui/skeleton';

export default function AdmissionStudents() {
  const { theme } = useTheme();
  const [students, setStudents] = useState<any[]>([]);
  const [branchesList, setBranchesList] = useState<string[]>([]);
  const [batchesList, setBatchesList] = useState<string[]>([]);
  const [selectedBatch, setSelectedBatch] = useState<string>("all");
  const [selectedBranch, setSelectedBranch] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const itemsPerPage = 20;

  useEffect(() => {
    fetchEnrollmentOptions();
  }, []);

  useEffect(() => {
    fetchStudents();
  }, [currentPage]);

  const fetchEnrollmentOptions = async () => {
    try {
      const response = await fetchWithTokenRefresh(`${API_ENDPOINT}/admission/manager/enrollment-options/`);
      if (response.ok) {
        const data = await response.json();
        const apiBranches = (data.branches || data.options?.branches || []).map((b: any) => typeof b === 'string' ? b : b.name).filter(Boolean);
        const apiBatches = (data.batches || data.options?.batches || []).map((b: any) => typeof b === 'string' ? b : b.name).filter(Boolean);
        
        if (apiBranches.length > 0) setBranchesList(prev => Array.from(new Set([...prev, ...apiBranches])));
        if (apiBatches.length > 0) setBatchesList(prev => Array.from(new Set([...prev, ...apiBatches])));
      }
    } catch (err) {
      console.error("Failed to fetch enrollment options for filters:", err);
    }
  };

  const fetchStudents = async () => {
    setLoading(true);
    try {
      const response = await fetchWithTokenRefresh(`${API_ENDPOINT}/admission/manager/applications/?status=enrolled&page=${currentPage}&page_size=${itemsPerPage}`);
      if (response.ok) {
        const data = await response.json();
        const list = data && Array.isArray(data.results) ? data.results : (Array.isArray(data) ? data : []);
        setStudents(list);
        setTotalCount(data.count || list.length);

        // Dynamically extract unique batch and branch names from enrolled students to ensure filters are never empty
        const dynamicBatches = list.map((s: any) => s.batch_name).filter(Boolean);
        const dynamicBranches = list.map((s: any) => s.branch_name || s.enquiry_details?.course_name).filter(Boolean);

        setBatchesList(prev => Array.from(new Set([...prev, ...dynamicBatches])));
        setBranchesList(prev => Array.from(new Set([...prev, ...dynamicBranches])));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = () => {
    const headers = ['App ID', 'Student Name', 'Email', 'Phone', 'Batch', 'Branch / Department', 'Semester', 'Section', 'Date of Enrollment', 'Status'];
    const rows = filteredStudents.map(s => {
      const branchStr = s.branch_name || s.enquiry_details?.course_name || '';
      const batchStr = s.batch_name || '';
      const semStr = s.semester_name || '';
      const secStr = s.section_name || '';
      return [
        `"#${s.id}"`,
        `"${s.enquiry_details?.name || ''}"`,
        `"${s.enquiry_details?.email || ''}"`,
        `"${s.enquiry_details?.phone || ''}"`,
        `"${batchStr}"`,
        `"${branchStr}"`,
        `"${semStr}"`,
        `"${secStr}"`,
        `"${new Date(s.updated_at).toLocaleDateString()}"`,
        '"Enrolled"'
      ];
    });

    const cleanBatch = selectedBatch !== 'all' ? selectedBatch.replace(/[^a-zA-Z0-9]/g, '_').replace(/_+/g, '_').replace(/^_+|_+$/g, '') : '';
    const cleanBranch = selectedBranch !== 'all' ? selectedBranch.replace(/[^a-zA-Z0-9]/g, '_').replace(/_+/g, '_').replace(/^_+|_+$/g, '') : '';

    let fileName = 'Enrolled_Students';
    if (cleanBatch) fileName += `_${cleanBatch}`;
    if (cleanBranch) fileName += `_${cleanBranch}`;
    fileName += '.csv';

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', fileName);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const filteredStudents = students.filter(student => {
    const batchName = student.batch_name || '';
    const matchesBatch = selectedBatch === 'all' || batchName.toLowerCase().includes(selectedBatch.toLowerCase());

    const branchName = student.branch_name || student.enquiry_details?.course_name || '';
    const matchesBranch = selectedBranch === 'all' || branchName.toLowerCase().includes(selectedBranch.toLowerCase());
    
    const name = student.enquiry_details?.name || '';
    const email = student.enquiry_details?.email || '';
    const phone = student.enquiry_details?.phone || '';
    const query = searchQuery.toLowerCase().trim();
    const matchesSearch = !query || name.toLowerCase().includes(query) || email.toLowerCase().includes(query) || phone.toLowerCase().includes(query);

    return matchesBatch && matchesBranch && matchesSearch;
  });

  const totalPages = Math.ceil(totalCount / itemsPerPage);

  if (loading) {
    return (
      <div className="space-y-6">
        <SkeletonTable rows={5} cols={6} />
      </div>
    );
  }

  return (
    <div id="admission-students-container" className="space-y-6 w-full max-w-full overflow-hidden">
      <Card className="overflow-hidden w-full border-border shadow-sm">
        <CardHeader id="admission-students-header" className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b">
          <div>
            <CardTitle className="text-xl sm:text-2xl font-semibold">Enrolled Students</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">View and export institution enrollments by batch and branch.</p>
          </div>
          <Button 
            onClick={handleExport} 
            disabled={filteredStudents.length === 0}
            size="sm" 
            className="bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm w-full sm:w-auto"
          >
            <Download className="w-4 h-4 mr-2" /> Export
          </Button>
        </CardHeader>

        {/* Batch (FIRST) & Branch (SECOND) Filters using Shadcn UI Select */}
        <div className="p-4 border-b border-border bg-muted/20 flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
          <div className="flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-center gap-2.5 sm:gap-3 flex-1">
            {/* Search Input */}
            <div className="relative w-full sm:w-64 min-w-0">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search by name, phone, email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full text-xs pl-9 pr-3 py-2 rounded-lg border border-border bg-background focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>

            {/* 2 Dropdowns in single row on mobile: Grid 2 Columns on Mobile, Auto width on Desktop */}
            <div className="grid grid-cols-2 gap-2 w-full sm:w-auto sm:flex sm:items-center sm:gap-3">
              {/* 1. FIRST: Batch Filter (Shadcn UI Select) */}
              <div className="w-full sm:w-[180px]">
                <Select value={selectedBatch} onValueChange={setSelectedBatch}>
                  <SelectTrigger className="h-9 text-xs border-border bg-background w-full">
                    <div className="flex items-center gap-1.5 sm:gap-2 truncate">
                      <Filter className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                      <SelectValue placeholder="All Batches" />
                    </div>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all" className="text-xs font-medium">All Batches</SelectItem>
                    {batchesList.map(b => (
                      <SelectItem key={b} value={b} className="text-xs font-medium">{b}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* 2. SECOND: Branch / Department Filter (Shadcn UI Select) */}
              <div className="w-full sm:w-[220px]">
                <Select value={selectedBranch} onValueChange={setSelectedBranch}>
                  <SelectTrigger className="h-9 text-xs border-border bg-background w-full">
                    <div className="flex items-center gap-1.5 sm:gap-2 truncate">
                      <GraduationCap className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                      <SelectValue placeholder="All Branches" />
                    </div>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all" className="text-xs font-medium">All Branches / Depts</SelectItem>
                    {branchesList.map(b => (
                      <SelectItem key={b} value={b} className="text-xs font-medium">{b}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <div className="text-xs text-muted-foreground pt-1 md:pt-0">
            Showing <strong className="text-foreground">{filteredStudents.length}</strong> of {students.length} students
          </div>
        </div>

        <CardContent className={filteredStudents.length === 0 ? "p-6" : "p-0"}>
          {filteredStudents.length === 0 ? (
            <div className={`p-8 border-2 border-dashed rounded-xl flex flex-col items-center justify-center space-y-3 min-h-[350px] ${theme === 'dark' ? 'border-border bg-accent/5' : 'border-gray-200 bg-gray-50/50'}`}>
              <div className={`p-3 rounded-full ${theme === 'dark' ? 'bg-accent/10' : 'bg-gray-100'}`}>
                <User className={`w-8 h-8 ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-400'}`} />
              </div>
              <div className="text-center">
                <p className={`text-sm font-medium ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>No enrolled students found.</p>
                <p className={`text-xs mt-1 ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}`}>Try adjusting your batch or branch filters.</p>
              </div>
            </div>
          ) : (
            <>
              {/* Mobile View: Stacked Cards (Hidden on Desktop) */}
              <div className="block md:hidden divide-y divide-border p-3 space-y-3">
                {filteredStudents.map(student => {
                  const branchDisplay = student.branch_name || student.enquiry_details?.course_name || 'N/A';
                  const batchDisplay = student.batch_name || 'N/A';
                  const semDisplay = student.semester_name ? ` • ${student.semester_name}` : '';
                  const secDisplay = student.section_name ? ` (${student.section_name})` : '';

                  return (
                    <div
                      key={student.id}
                      className="p-4 rounded-xl bg-card border border-border/80 shadow-xs space-y-3 hover:border-primary/30 transition-all duration-200"
                    >
                      {/* Top Row: App ID, Student Info & Enrolled Badge */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-10 h-10 rounded-full bg-muted overflow-hidden border border-border flex items-center justify-center shrink-0">
                            {student.photo ? (
                              <img src={student.photo} alt="Student" className="w-full h-full object-cover" />
                            ) : (
                              <User className="w-5 h-5 text-muted-foreground" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs font-mono font-semibold text-muted-foreground">#{student.id}</span>
                              <h4 className="text-sm font-semibold text-foreground tracking-tight truncate">
                                {student.enquiry_details?.name}
                              </h4>
                            </div>
                            {student.enquiry_details?.email && (
                              <a
                                href={`mailto:${student.enquiry_details.email}`}
                                className="inline-flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400 font-medium hover:underline truncate max-w-[200px]"
                                title="Send Email"
                              >
                                <Mail className="w-3 h-3 shrink-0" /> {student.enquiry_details.email}
                              </a>
                            )}
                          </div>
                        </div>
                        <span className="bg-green-100 text-green-700 dark:bg-green-950/40 dark:text-green-400 px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase shrink-0">
                          Enrolled
                        </span>
                      </div>

                      {/* Details Box: Branch, Batch & Enrolled Date */}
                      <div className="space-y-1.5 text-xs bg-muted/30 p-2.5 rounded-lg border border-border/40">
                        <div className="flex items-baseline justify-between gap-2">
                          <span className="text-muted-foreground shrink-0">Branch / Dept:</span>
                          <span className="font-semibold text-foreground text-right truncate">{branchDisplay}</span>
                        </div>
                        <div className="flex items-baseline justify-between gap-2">
                          <span className="text-muted-foreground shrink-0">Batch & Class:</span>
                          <span className="font-medium text-foreground text-right">
                            {batchDisplay}{(semDisplay || secDisplay) && ` • ${semDisplay.replace(' • ', '')}${secDisplay}`}
                          </span>
                        </div>
                        <div className="flex items-baseline justify-between gap-2 pt-1 border-t border-border/30">
                          <span className="text-muted-foreground shrink-0">Enrolled On:</span>
                          <span className="font-medium text-foreground font-mono">
                            {new Date(student.updated_at).toLocaleDateString()}
                          </span>
                        </div>
                      </div>

                      {/* Contact row if phone is present */}
                      {student.enquiry_details?.phone && (
                        <div className="flex items-center justify-between pt-0.5 text-xs">
                          <span className="text-muted-foreground">Phone:</span>
                          <a
                            href={`tel:${student.enquiry_details.phone}`}
                            className="inline-flex items-center gap-1.5 font-mono text-xs text-blue-600 dark:text-blue-400 font-medium hover:underline"
                            title="Call Student"
                          >
                            <Phone className="w-3.5 h-3.5" /> {student.enquiry_details.phone}
                          </a>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Desktop View: Table (Hidden on Mobile) */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full min-w-[850px] text-sm text-left">
                  <thead className="text-xs text-muted-foreground uppercase bg-muted/50 border-b border-border">
                    <tr>
                      <th className="px-6 py-4 font-semibold whitespace-nowrap">App ID</th>
                      <th className="px-6 py-4 font-semibold whitespace-nowrap">Student Details</th>
                      <th className="px-6 py-4 font-semibold whitespace-nowrap">Batch & Academic Class</th>
                      <th className="px-6 py-4 font-semibold whitespace-nowrap">Branch / Department</th>
                      <th className="px-6 py-4 font-semibold whitespace-nowrap">Phone Number</th>
                      <th className="px-6 py-4 font-semibold whitespace-nowrap">Date of Enrollment</th>
                      <th className="px-6 py-4 text-right font-semibold whitespace-nowrap">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {filteredStudents.map(student => {
                      const branchDisplay = student.branch_name || student.enquiry_details?.course_name || 'N/A';
                      const batchDisplay = student.batch_name || 'N/A';
                      const semDisplay = student.semester_name ? ` • ${student.semester_name}` : '';
                      const secDisplay = student.section_name ? ` (${student.section_name})` : '';

                      return (
                        <tr key={student.id} className="hover:bg-muted/30 transition-colors">
                          <td className="px-6 py-4 font-mono font-medium whitespace-nowrap">#{student.id}</td>
                          <td className="px-6 py-4 font-medium">
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-full bg-muted overflow-hidden border border-border flex items-center justify-center flex-shrink-0">
                                {student.photo ? (
                                  <img src={student.photo} alt="Student" className="w-full h-full object-cover" />
                                ) : (
                                  <User className="w-4 h-4 text-muted-foreground" />
                                )}
                              </div>
                              <div>
                                <p className="font-semibold text-foreground">{student.enquiry_details?.name}</p>
                                {student.enquiry_details?.email && (
                                  <a
                                    href={`mailto:${student.enquiry_details.email}`}
                                    className="inline-flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400 font-medium hover:underline mt-0.5"
                                    title="Send Email"
                                  >
                                    <Mail className="w-3 h-3" /> {student.enquiry_details.email}
                                  </a>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-xs">
                              <span className="font-semibold text-foreground">Batch: {batchDisplay}</span>
                              {(semDisplay || secDisplay) && (
                                <span className="text-muted-foreground block mt-0.5">{semDisplay}{secDisplay}</span>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="font-semibold text-foreground">{branchDisplay}</span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {student.enquiry_details?.phone ? (
                              <a
                                href={`tel:${student.enquiry_details.phone}`}
                                className="inline-flex items-center gap-1.5 font-mono text-xs text-blue-600 dark:text-blue-400 font-medium hover:underline"
                                title="Call Student"
                              >
                                <Phone className="w-3.5 h-3.5" /> {student.enquiry_details.phone}
                              </a>
                            ) : (
                              <span className="text-muted-foreground text-xs font-mono">N/A</span>
                            )}
                          </td>
                          <td className="px-6 py-4 text-muted-foreground whitespace-nowrap text-xs">
                            {new Date(student.updated_at).toLocaleDateString()}
                          </td>
                          <td className="px-6 py-4 text-right whitespace-nowrap">
                            <span className="bg-green-100 text-green-700 dark:bg-green-950/40 dark:text-green-400 px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase">
                              Enrolled
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
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
