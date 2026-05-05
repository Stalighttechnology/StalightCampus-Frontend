import { useState } from "react";
import { manageStudentLeave, getProctorStudentLeaves, ProctorStudentLeave } from "@/utils/faculty_api";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "../ui/button";
import { CheckCircle, XCircle, Filter, Search } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "../ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import Swal from 'sweetalert2';
import { useTheme } from "@/context/ThemeContext";
import { SkeletonTable } from "@/components/ui/skeleton";
import { useDebouncedSearch } from "@/hooks/useOptimizations";
import { AdminPagination } from "../common/AdminPagination";

const PAGE_SIZE = 20;

const ManageStudentLeave = () => {
  const { theme } = useTheme();
  const queryClient = useQueryClient();
  const { value: search, debouncedValue: debouncedSearch, setValue: setSearch } = useDebouncedSearch('', 500);

  const statusOptions = ["All", "PENDING", "APPROVED", "REJECTED"];
  const [filterStatus, setFilterStatus] = useState("All");
  const [filterOpen, setFilterOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [viewReason, setViewReason] = useState<string | null>(null);
  const [showRejectModal, setShowRejectModal] = useState<string | null>(null);

  const queryKey = ['proctorStudentLeaves', page, debouncedSearch, filterStatus];

  const { data, isLoading } = useQuery({
    queryKey,
    queryFn: () => getProctorStudentLeaves({
      page,
      page_size: PAGE_SIZE,
      search: debouncedSearch || undefined,
      status: filterStatus !== 'All' ? filterStatus : undefined,
    }),
    staleTime: 15_000,
  });

  const leaves: ProctorStudentLeave[] = data?.data ?? [];
  const paginationRaw = data?.pagination;
  const pagination = paginationRaw ? {
    page: paginationRaw.page,
    pageSize: paginationRaw.page_size,
    totalPages: paginationRaw.total_pages,
    totalItems: paginationRaw.total_count,
  } : undefined;

  const getStatusBadge = (status: "PENDING" | "APPROVED" | "REJECTED") => {
    switch (status) {
      case "PENDING":
        return <span className={`px-3 py-1 rounded-full text-xs font-medium ${theme === 'dark' ? 'bg-yellow-900 text-yellow-200' : 'bg-yellow-100 text-yellow-700'}`}>Pending</span>;
      case "APPROVED":
        return <span className={`px-3 py-1 rounded-full text-xs font-medium ${theme === 'dark' ? 'bg-green-900 text-green-200' : 'bg-green-100 text-green-700'}`}>Approved</span>;
      case "REJECTED":
        return <span className={`px-3 py-1 rounded-full text-xs font-medium ${theme === 'dark' ? 'bg-red-900 text-red-200' : 'bg-red-100 text-red-700'}`}>Rejected</span>;
      default:
        return <span className={`px-3 py-1 rounded-full text-xs font-medium ${theme === 'dark' ? 'bg-gray-700 text-gray-200' : 'bg-gray-100 text-gray-700'}`}>Unknown</span>;
    }
  };

  const handleApprove = async (leaveId: string) => {
    setActionLoading(leaveId + "APPROVE");
    try {
      const res = await manageStudentLeave({ leave_id: leaveId, action: "APPROVE" });
      if (res.success) {
        queryClient.invalidateQueries({ queryKey: ['proctorStudentLeaves'] });
        Swal.fire({ title: 'Approved!', text: 'Leave request approved successfully.', icon: 'success', confirmButtonColor: '#22c55e' });
      } else {
        throw new Error(res.message || "Action failed");
      }
    } catch (e: unknown) {
      Swal.fire({ title: 'Error!', text: e instanceof Error ? e.message : "An unexpected error occurred.", icon: 'error' });
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (leaveId: string, reason: string) => {
    setActionLoading(leaveId + "REJECT");
    try {
      const res = await manageStudentLeave({ leave_id: leaveId, action: "REJECT", rejection_reason: reason });
      if (res.success) {
        queryClient.invalidateQueries({ queryKey: ['proctorStudentLeaves'] });
        setShowRejectModal(null);
        Swal.fire({ title: 'Rejected!', text: 'Leave request rejected.', icon: 'info', confirmButtonColor: '#ef4444' });
      } else {
        throw new Error(res.message || "Action failed");
      }
    } catch (e: unknown) {
      Swal.fire({ title: 'Error!', text: e instanceof Error ? e.message : "An unexpected error occurred.", icon: 'error' });
    } finally {
      setActionLoading(null);
    }
  };

  const handleFilterChange = (status: string) => {
    setFilterStatus(status);
    setPage(1);
    setFilterOpen(false);
  };

  const handleSearchChange = (val: string) => {
    setSearch(val);
    setPage(1);
  };

  return (
    <Card className={theme === 'dark' ? 'bg-card text-foreground shadow-md' : 'bg-white text-gray-900 shadow-md'}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4 border-b">
        <div>
          <CardTitle className="text-2xl font-bold">Manage Student Leave</CardTitle>
          <p className="text-sm text-muted-foreground mt-1">
            Review pending leave requests. Approved/Rejected records show for 7 days.
          </p>
        </div>
      </CardHeader>
      <CardContent className="pt-6 space-y-6">
        {/* Search + Filter bar */}
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="relative w-full md:max-w-md">
            <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-400'}`} />
            <input
              type="text"
              placeholder="Search by student name or USN..."
              value={search}
              onChange={(e) => handleSearchChange(e.target.value)}
              className={`w-full pl-10 pr-3 py-2 border rounded-lg text-sm transition-all focus:ring-2 focus:ring-primary/20 outline-none ${
                theme === 'dark' ? 'bg-background border-border text-foreground focus:border-primary' : 'bg-white border-gray-200 text-gray-900 focus:border-primary'
              }`}
            />
          </div>

          <Popover open={filterOpen} onOpenChange={setFilterOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" className={`flex items-center gap-2 ${theme === 'dark' ? 'border-border' : 'border-gray-200'}`}>
                <Filter size={16} />
                <span>Status: {filterStatus === "All" ? "All" : filterStatus.charAt(0) + filterStatus.slice(1).toLowerCase()}</span>
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-48 p-2" align="end">
              <div className="space-y-1">
                {statusOptions.map(opt => (
                  <button
                    key={opt}
                    onClick={() => handleFilterChange(opt)}
                    className={`w-full text-left px-3 py-2 text-sm rounded-md transition-colors ${
                      filterStatus === opt
                        ? 'bg-primary text-white'
                        : theme === 'dark' ? 'hover:bg-muted text-foreground' : 'hover:bg-gray-100 text-gray-700'
                    }`}
                  >
                    {opt === "All" ? "All Statuses" : opt.charAt(0) + opt.slice(1).toLowerCase()}
                  </button>
                ))}
              </div>
            </PopoverContent>
          </Popover>
        </div>

        {/* Table */}
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-sm text-left">
            <thead className={theme === 'dark' ? 'bg-muted text-foreground' : 'bg-gray-50 text-gray-600'}>
              <tr>
                <th className="px-6 py-3 font-semibold">Student</th>
                <th className="px-6 py-3 font-semibold">Leave Period</th>
                <th className="px-6 py-3 font-semibold">Reason</th>
                <th className="px-6 py-3 font-semibold text-center">Status</th>
                <th className="px-6 py-3 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className={`divide-y ${theme === 'dark' ? 'divide-border' : 'divide-gray-100'}`}>
              {isLoading ? (
                <tr><td colSpan={5}><SkeletonTable rows={5} cols={5} /></td></tr>
              ) : leaves.map((leave) => (
                <tr key={leave.id} className={`${theme === 'dark' ? 'hover:bg-muted/50' : 'hover:bg-gray-50'} transition-colors`}>
                  <td className="px-6 py-4">
                    <div className="font-medium">{leave.student_name}</div>
                    <div className="text-xs text-muted-foreground">{leave.usn}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium">
                      {leave.start_date ? new Date(leave.start_date).toLocaleDateString() : '—'} – {leave.end_date ? new Date(leave.end_date).toLocaleDateString() : '—'}
                    </div>
                    {leave.submitted_at && (
                      <div className="text-xs text-muted-foreground mt-0.5">Applied: {leave.submitted_at}</div>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <div className="max-w-xs truncate">{leave.reason}</div>
                    <button
                      onClick={() => setViewReason(leave.reason)}
                      className="text-primary hover:underline text-xs font-medium mt-1"
                    >
                      View Details
                    </button>
                  </td>
                  <td className="px-6 py-4 text-center">
                    {getStatusBadge(leave.status)}
                  </td>
                  <td className="px-6 py-4 text-right">
                    {leave.status === "PENDING" ? (
                      <div className="flex justify-end gap-2">
                        <Button
                          onClick={() => handleApprove(leave.id)}
                          size="sm"
                          className="bg-green-600 hover:bg-green-700 text-white"
                          disabled={!!actionLoading}
                        >
                          {actionLoading === leave.id + "APPROVE" ? "..." : <CheckCircle size={16} />}
                        </Button>
                        <Button
                          onClick={() => setShowRejectModal(leave.id)}
                          size="sm"
                          className="bg-red-600 hover:bg-red-700 text-white"
                          disabled={!!actionLoading}
                        >
                          {actionLoading === leave.id + "REJECT" ? "..." : <XCircle size={16} />}
                        </Button>
                      </div>
                    ) : (
                      <div className="flex flex-col items-end gap-0.5">
                        <span className="text-xs text-muted-foreground italic">Processed</span>
                        {leave.reviewed_by && (
                          <span className="text-xs text-muted-foreground">by {leave.reviewed_by}</span>
                        )}
                      </div>
                    )}
                  </td>
                </tr>
              ))}
              {!isLoading && leaves.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-10 text-center text-muted-foreground italic">
                    {search ? `No leave requests found for "${search}".` : "No active leave requests at this time."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Server-side pagination */}
        <AdminPagination pagination={pagination} onPageChange={setPage} />
      </CardContent>

      {/* View Reason Dialog */}
      <Dialog open={!!viewReason} onOpenChange={() => setViewReason(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Leave Reason</DialogTitle></DialogHeader>
          <div className={`mt-4 p-4 rounded-lg text-sm leading-relaxed ${theme === 'dark' ? 'bg-muted' : 'bg-gray-50'}`}>
            {viewReason}
          </div>
          <DialogFooter><Button onClick={() => setViewReason(null)}>Close</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={!!showRejectModal} onOpenChange={() => setShowRejectModal(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Reject Leave Request</DialogTitle></DialogHeader>
          <div className="mt-4 space-y-3">
            <label className="text-sm font-medium">Rejection Reason (Optional)</label>
            <textarea
              id="rejection-reason"
              className={`w-full p-3 border rounded-lg text-sm min-h-[100px] outline-none focus:ring-2 focus:ring-primary/20 ${
                theme === 'dark' ? 'bg-background border-border text-foreground focus:border-primary' : 'bg-white border-gray-200 text-gray-900 focus:border-primary'
              }`}
              placeholder="Provide a reason for rejection..."
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRejectModal(null)}>Cancel</Button>
            <Button
              variant="destructive"
              onClick={() => {
                const reason = (document.getElementById('rejection-reason') as HTMLTextAreaElement).value;
                if (showRejectModal) handleReject(showRejectModal, reason);
              }}
            >
              Reject Request
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
};

export default ManageStudentLeave;