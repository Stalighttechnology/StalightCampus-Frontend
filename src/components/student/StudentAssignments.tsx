import { useMemo, useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { Card, CardContent,CardHeader,CardTitle } from "../ui/card";
import { Badge } from "../ui/badge";
import { format, isBefore } from "date-fns";
import { Input } from "../ui/input";
import { Button } from "../ui/button";
import { Filter, X, ClipboardList, Clock, CheckCircle2, AlertCircle } from "lucide-react";
import { useHistoricalStudentDataQuery } from "@/hooks/useApiQueries";
import { useTheme } from "@/context/ThemeContext";
import { Skeleton, SkeletonTable } from "../ui/skeleton";


const getStatusBadge = (status: string, dueDate: string, theme: string) => {
  const now = new Date();
  const due = new Date(dueDate);

  if (status === "Submitted") return <Badge className={theme === 'dark' ? "bg-blue-900/30 text-blue-400" : "bg-blue-100 text-blue-700"}>Submitted</Badge>;
  if (status === "Pending" && isBefore(due, now)) {
    return <Badge className={theme === 'dark' ? "bg-red-900/30 text-red-400" : "bg-red-100 text-red-700"}>Overdue</Badge>;
  }
  return <Badge className={theme === 'dark' ? "bg-yellow-900/30 text-yellow-400" : "bg-yellow-100 text-yellow-700"}>Pending</Badge>;
};

// Filter Modal Component
const FilterModal = ({ isOpen, onClose, statusFilter, setStatusFilter, search, setSearch, theme }: any) => {
  if (!isOpen) return null;

  return createPortal(
    <div 
      className="fixed inset-0 z-[9999] flex items-center justify-center"
    >
      {/* BACKDROP */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      ></div>

      {/* MODAL CONTENT */}
      <Card className={`relative z-10 w-96 ${theme === 'dark' ? 'bg-card border-border' : 'bg-white border-gray-200'}`}>
        <div className="p-6 space-y-4">
          <div className="flex justify-between items-center">
            <h3 className={`text-lg font-semibold ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>Filter Assignments</h3>
            <button 
              onClick={onClose}
              className={theme === 'dark' ? 'text-muted-foreground hover:text-foreground transition' : 'text-gray-500 hover:text-gray-700 transition'}
            >
              <X size={20} />
            </button>
          </div>

          {/* Status Filter */}
          <div className="space-y-2">
            <label className={`block text-sm font-medium ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>Status</label>
            <div className="space-y-2">
              {["All", "Submitted", "Pending", "Overdue"].map((status) => (
                <label key={status} className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition">
                  <input
                    type="radio"
                    name="status"
                    value={status}
                    checked={statusFilter === status}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="w-4 h-4"
                  />
                  <span className={theme === 'dark' ? 'text-foreground' : 'text-gray-900'}>{status}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 pt-4">
            <Button
              onClick={() => {
                setStatusFilter("All");
                setSearch("");
              }}
              variant="outline"
              className={theme === 'dark' ? 'border-border text-foreground hover:bg-accent' : 'border-gray-300 text-gray-700 hover:bg-gray-100'}
            >
              Clear Filters
            </Button>
            <Button
              onClick={onClose}
              className="bg-purple-600 text-white hover:bg-purple-700 ml-auto transition"
            >
              Apply
            </Button>
          </div>
        </div>
      </Card>
    </div>,
    document.body
  );
};

const StudentAssignment = () => {
  const [assignments, setAssignments] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [isAssignmentsLoaded, setIsAssignmentsLoaded] = useState(false);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState("All");
  const { theme } = useTheme();

  // Load assignments data automatically on mount
  const { data: assignmentsResponse, isLoading } = useHistoricalStudentDataQuery(true);

  useEffect(() => {
    if (assignmentsResponse?.success && Array.isArray(assignmentsResponse.data)) {
      setAssignments(assignmentsResponse.data);
      setIsAssignmentsLoaded(true);
    }
  }, [assignmentsResponse]);

  // Prevent scroll when modal is open
  useEffect(() => {
    if (isFilterOpen) {
      document.body.style.overflow = 'hidden';
      document.documentElement.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
      document.documentElement.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
      document.documentElement.style.overflow = 'unset';
    };
  }, [isFilterOpen]);

  const filtered = useMemo(() => {
    return assignments.filter((a) => {
      const matchesSearch = a.title.toLowerCase().includes(search.toLowerCase());
      const matchesStatus = statusFilter === "All" || a.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [search, assignments, statusFilter]);

  const summary = useMemo(() => {
    let pending = 0;
    let submitted = 0;
    let overdue = 0;
    const now = new Date();

    assignments.forEach((a) => {
      if (a.status === "Submitted") submitted++;
      else if (isBefore(new Date(a.dueDate), now)) overdue++;
      else pending++;
    });

    return {
      total: assignments.length,
      pending,
      submitted,
      overdue,
    };
  }, [assignments]);

  return (
    <div className={`${theme === 'dark' ? 'bg-background text-foreground' : 'bg-gray-50 text-gray-900'}`}>
      <Card className={theme === 'dark' ? 'bg-card border-border' : 'bg-white border-gray-200'}>
        <CardHeader className="p-6 border-b">
          <div className="flex justify-between items-center">
            <div>
              <h2 className={`text-lg sm:text-xl md:text-2xl font-semibold ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>Assignments</h2>
              <p className={`text-sm mt-1 ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-600'}`}>
                Track and manage your academic assignments and deadlines.
              </p>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-6 space-y-8">
          {isLoading && !isAssignmentsLoaded && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-24 w-full rounded-lg" />
                ))}
              </div>
              <SkeletonTable rows={8} cols={3} />
            </div>
          )}

          {isAssignmentsLoaded && (
            <>
              {/* Refined Summary Row */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
                {[
                  { label: "Total", value: summary.total, color: "blue", icon: <ClipboardList className="opacity-80" size={20} /> },
                  { label: "Pending", value: summary.pending, color: "yellow", icon: <Clock className="opacity-80" size={20} /> },
                  { label: "Submitted", value: summary.submitted, color: "emerald", icon: <CheckCircle2 className="opacity-80" size={20} /> },
                  { label: "Overdue", value: summary.overdue, color: "red", icon: <AlertCircle className="opacity-80" size={20} /> },
                ].map((stat, i) => (
                  <div 
                    key={i} 
                    className={`relative overflow-hidden group p-4 rounded-xl border transition-all duration-300 hover:shadow-md ${
                      theme === 'dark' 
                        ? 'bg-muted/30 border-border hover:bg-muted/50' 
                        : 'bg-gray-50/50 border-gray-100 hover:bg-white hover:border-gray-200'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className={`text-xs font-medium uppercase tracking-wider ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}`}>
                          {stat.label}
                        </p>
                        <p className={`text-2xl font-bold mt-1 ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>
                          {stat.value}
                        </p>
                      </div>
                      <div className={`p-2 rounded-lg ${
                        stat.color === 'blue' ? 'bg-blue-500/10 text-blue-500' :
                        stat.color === 'yellow' ? 'bg-yellow-500/10 text-yellow-500' :
                        stat.color === 'emerald' ? 'bg-emerald-500/10 text-emerald-500' :
                        'bg-red-500/10 text-red-500'
                      }`}>
                        {stat.icon}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Filters & Actions */}
              <div className="flex items-center justify-between gap-2">
                <div className="relative flex-1 sm:max-w-sm">
                  <Input
                    placeholder="Search assignments..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className={`w-full pl-4 ${theme === 'dark' ? 'bg-background border-border' : 'bg-white border-gray-200 shadow-sm'}`}
                  />
                </div>
                <Button 
                  variant="outline" 
                  onClick={() => setIsFilterOpen(true)}
                  className={`flex items-center gap-2 px-3 sm:px-4 ${theme === 'dark' ? 'border-border text-foreground hover:bg-accent' : 'border-gray-300 text-gray-700 hover:bg-gray-100'}`}
                >
                  <Filter size={16} />
                  <span className="hidden xs:inline sm:inline">Filters</span>
                </Button>
              </div>

              {/* Table */}
              <div className={`rounded-xl border overflow-hidden ${theme === 'dark' ? 'border-border' : 'border-gray-100 shadow-sm'}`}>
                <div className="overflow-x-auto">
                  <table className={`min-w-full text-sm text-left ${theme === 'dark' ? 'divide-border' : 'divide-gray-100'}`}>
                    <thead className={theme === 'dark' ? 'bg-muted/50 text-muted-foreground' : 'bg-gray-50/50 text-gray-500'}>
                      <tr>
                        <th className="px-6 py-4 font-semibold uppercase tracking-wider text-[11px]">Assignment Title</th>
                        <th className="px-6 py-4 font-semibold uppercase tracking-wider text-[11px]">Due Date</th>
                        <th className="px-6 py-4 font-semibold uppercase tracking-wider text-[11px]">Current Status</th>
                      </tr>
                    </thead>
                    <tbody className={theme === 'dark' ? 'divide-border' : 'divide-gray-50'}>
                      {filtered.map((assignment, idx) => (
                        <tr key={idx} className={`${theme === 'dark' ? 'hover:bg-accent/30' : 'hover:bg-blue-50/30'} transition-colors`}>
                          <td className={`px-6 py-4 font-medium ${theme === 'dark' ? 'text-foreground' : 'text-gray-800'}`}>
                            {assignment.title}
                          </td>
                          <td className={`px-6 py-4 ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}`}>
                            {format(new Date(assignment.dueDate), "MMM dd, yyyy")}
                          </td>
                          <td className="px-6 py-4">
                            {getStatusBadge(assignment.status, assignment.dueDate, theme)}
                          </td>
                        </tr>
                      ))}
                      {filtered.length === 0 && (
                        <tr>
                          <td colSpan={3} className={`px-6 py-10 text-center ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-400 italic'}`}>
                            No assignments found matching your filters.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Filter Modal - Rendered via Portal */}
              <FilterModal 
                isOpen={isFilterOpen}
                onClose={() => setIsFilterOpen(false)}
                statusFilter={statusFilter}
                setStatusFilter={setStatusFilter}
                search={search}
                setSearch={setSearch}
                theme={theme}
              />
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default StudentAssignment;