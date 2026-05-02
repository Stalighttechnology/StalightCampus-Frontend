import { useEffect, useState } from "react";
import { manageStudentLeave, ProctorStudent, LeaveRow } from "@/utils/faculty_api";
import { Button } from "../ui/button";
import { CheckCircle, XCircle, Eye, Filter } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "../ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import Swal from 'sweetalert2';
import { useTheme } from "@/context/ThemeContext";
import { SkeletonTable, SkeletonList } from "@/components/ui/skeleton";

interface ManageStudentLeaveProps {
  proctorStudents: ProctorStudent[];
  proctorStudentsLoading: boolean;
}

const ManageStudentLeave: React.FC<ManageStudentLeaveProps> = ({ proctorStudents, proctorStudentsLoading }) => {
  const statusColors = {
    APPROVED: "bg-green-100 text-green-700",
    REJECTED: "bg-red-100 text-red-700",
    PENDING: "bg-yellow-100 text-yellow-800",
  };

  const statusOptions = ["All", "PENDING", "APPROVED", "REJECTED"];
  const [students, setStudents] = useState<ProctorStudent[]>([]);
  const [leaveRows, setLeaveRows] = useState<LeaveRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("All");
  const [filterOpen, setFilterOpen] = useState(false);
  const [viewReason, setViewReason] = useState<string | null>(null);
  const [showRejectModal, setShowRejectModal] = useState<string | null>(null);
  const { theme } = useTheme();

  useEffect(() => {
    setStudents(proctorStudents);
    const rows: LeaveRow[] = [];
    proctorStudents.forEach((s: ProctorStudent) => {
      (s.leave_requests || []).forEach((leave) => {
        rows.push({
          ...leave,
          status: leave.status as "PENDING" | "APPROVED" | "REJECTED",
          student_name: s.name,
          usn: s.usn,
        });
      });
    });
    setLeaveRows(rows);
  }, [proctorStudents]);

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
        setLeaveRows(prevRows =>
          prevRows.map(row =>
            row.id === leaveId
              ? { ...row, status: "APPROVED" }
              : row
          )
        );

        Swal.fire({
          title: 'Approved!',
          text: 'Leave request approved successfully.',
          icon: 'success',
          confirmButtonText: 'OK',
          background: theme === 'dark' ? '#1c1c1e' : '#ffffff',
          color: theme === 'dark' ? '#E4E4E7' : '#000000',
          confirmButtonColor: '#22c55e',
        });
      } else {
        Swal.fire({
          title: 'Error!',
          text: res.message || "Action failed",
          icon: 'error',
          confirmButtonText: 'OK',
          background: theme === 'dark' ? '#1c1c1e' : '#ffffff',
          color: theme === 'dark' ? '#E4E4E7' : '#000000',
        });
      }
    } catch (e: unknown) {
      Swal.fire({
        title: 'Error!',
        text: e instanceof Error ? e.message : "Action failed",
        icon: 'error',
        confirmButtonText: 'OK',
        background: theme === 'dark' ? '#1c1c1e' : '#ffffff',
        color: theme === 'dark' ? '#E4E4E7' : '#000000',
      });
    } finally {
      setActionLoading(null);
    }
  };

  const handleConfirmReject = async (leaveId: string) => {
    setActionLoading(leaveId + "REJECT");
    try {
      const res = await manageStudentLeave({ leave_id: leaveId, action: "REJECT" });
      if (res.success) {
        setLeaveRows(prevRows =>
          prevRows.map(row =>
            row.id === leaveId
              ? { ...row, status: "REJECTED" }
              : row
          )
        );
        setShowRejectModal(null);

        Swal.fire({
          title: 'Rejected',
          text: 'Leave request rejected.',
          icon: 'error',
          confirmButtonText: 'OK',
          background: theme === 'dark' ? '#1c1c1e' : '#ffffff',
          color: theme === 'dark' ? '#E4E4E7' : '#000000',
        });
      } else {
        Swal.fire({
          title: 'Error!',
          text: res.message || "Action failed",
          icon: 'error',
          confirmButtonText: 'OK',
          background: theme === 'dark' ? '#1c1c1e' : '#ffffff',
          color: theme === 'dark' ? '#E4E4E7' : '#000000',
        });
      }
    } catch (e: unknown) {
      Swal.fire({
        title: 'Error!',
        text: e instanceof Error ? e.message : "Action failed",
        icon: 'error',
        confirmButtonText: 'OK',
        background: theme === 'dark' ? '#1c1c1e' : '#ffffff',
        color: theme === 'dark' ? '#E4E4E7' : '#000000',
      });
    } finally {
      setActionLoading(null);
    }
  };

  // Filter and search
  const filteredRows = leaveRows.filter((row: LeaveRow) => {
    const matchesSearch =
      (row.student_name?.toLowerCase() || '').includes(search.toLowerCase()) ||
      (row.usn?.toLowerCase() || '').includes(search.toLowerCase());
    const matchesStatus =
      filterStatus === "All" || row.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className={`min-h-screen ${theme === 'dark' ? 'bg-background text-foreground' : 'bg-gray-50 text-gray-900'}`}>
      <Card className={theme === 'dark' ? 'bg-card border border-border' : 'bg-white border border-gray-200'}>
        <CardHeader>
          <CardTitle className={`text-2xl font-semibold leading-none tracking-tight text-gray-900'}`}>Leave Approvals</CardTitle>
          <p className={`text-sm ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}`}>Review and manage student leave requests</p>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          {/* Search and Filter */}
          <div className="flex flex-wrap gap-2 sm:gap-3 mb-6 items-center">
            <input
              type="text"
              placeholder="Search by name or USN..."
              value={search}
              onChange={(e) => {
                const value = e.target.value.replace(/[^a-zA-Z0-9\s]/g, "");
                setSearch(value);
              }}
              className={theme === 'dark' ? 'flex-1 min-w-48 bg-background border border-input text-foreground rounded-md px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm' : 'flex-1 min-w-48 bg-white border border-gray-300 text-gray-900 rounded-md px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm'}
            />
            <Popover open={filterOpen} onOpenChange={setFilterOpen}>
              <PopoverTrigger asChild>
                <button
                  className={`flex items-center gap-2 px-2.5 sm:px-3.5 py-1.5 sm:py-2 rounded-md border transition-colors text-xs sm:text-sm font-medium ${theme === 'dark'
                      ? 'border-input bg-background text-foreground hover:bg-accent'
                      : 'border-gray-300 bg-white text-gray-900 hover:bg-gray-50'
                    }`}
                >
                  <Filter className="w-3 h-3 sm:w-4 sm:h-4" />
                  <span className="hidden xs:inline">Filter</span>
                </button>
              </PopoverTrigger>
              <PopoverContent className={`w-40 p-2 sm:p-3 rounded-lg ${theme === 'dark' ? 'bg-card text-foreground border-border' : 'bg-white text-gray-900 border-gray-200'
                }`}>
                <div className="space-y-1.5">
                  {statusOptions.map((status) => (
                    <button
                      key={status}
                      onClick={() => {
                        setFilterStatus(status);
                        setFilterOpen(false);
                      }}
                      className={`w-full text-left px-2.5 py-1.5 rounded-md text-xs sm:text-sm font-medium transition-colors ${filterStatus === status
                          ? theme === 'dark'
                            ? 'bg-primary text-white'
                            : 'bg-primary text-white'
                          : theme === 'dark'
                            ? 'hover:bg-accent text-foreground'
                            : 'hover:bg-gray-100 text-gray-900'
                        }`}
                    >
                      {status === "All" ? "All Statuses" : status.charAt(0) + status.slice(1).toLowerCase()}
                    </button>
                  ))}
                </div>
              </PopoverContent>
            </Popover>
          </div>

          <div className="overflow-x-auto max-w-full thin-scrollbar">
            {proctorStudentsLoading ? (
              <div className="space-y-4">
                <div className="md:hidden">
                  <SkeletonList items={3} />
                </div>
                <div className="hidden md:block">
                  <SkeletonTable rows={5} cols={5} />
                </div>
              </div>
            ) : (
              <>
                {/* Mobile: stacked cards */}
                <div className="md:hidden space-y-2 sm:space-y-3">
                  {filteredRows.length > 0 ? (
                    filteredRows.map((row: LeaveRow) => (
                      <div key={row.id} className={`p-2 sm:p-3 rounded-md border ${theme === 'dark' ? 'bg-card border-border text-foreground' : 'bg-white border-gray-200 text-gray-900'}`}>
                        <div className="flex items-start justify-between gap-2 sm:gap-3">
                          <div className="min-w-0 flex-1">
                            <p className={`font-medium text-xs sm:text-sm ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'} truncate`}>{row.student_name}</p>
                            <p className={`text-xs ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-600'} truncate`}>{row.usn}</p>
                          </div>
                          <div className="shrink-0">{getStatusBadge(row.status)}</div>
                        </div>
                        <div className="mt-2 sm:mt-3 text-xs sm:text-sm space-y-1">
                          <p className={theme === 'dark' ? 'text-muted-foreground' : 'text-gray-600'} style={{ wordBreak: 'break-word' }}><strong>Period:</strong> {row.start_date} to {row.end_date}</p>
                        </div>
                        <div className="mt-3 sm:mt-4 space-y-2">
                          <div className="flex items-center gap-2 sm:gap-3">
                            <span className={`text-xs sm:text-sm font-medium ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-600'}`}><strong>Reason:</strong></span>
                            <button
                              onClick={() => setViewReason(row.reason)}
                              className={`flex items-center gap-1 text-xs sm:text-sm font-medium px-2 sm:px-2.5 py-1 sm:py-1.5 rounded-md transition border ${theme === 'dark' ? 'border-blue-500 text-blue-400 bg-blue-500/10 hover:bg-blue-500/20' : 'border-blue-500 text-blue-700 bg-blue-50 hover:bg-blue-100'}`}
                            >
                              <Eye className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                              <span>View</span>
                            </button>
                          </div>
                          {row.status === "PENDING" ? (
                            <div className="flex gap-1.5 sm:gap-2">
                              <button
                                onClick={() => handleApprove(row.id)}
                                className={`flex items-center gap-1 text-xs sm:text-sm font-medium px-2 sm:px-2.5 py-1 sm:py-1.5 rounded-md transition border flex-1 justify-center ${theme === 'dark' ? 'border-green-500 text-green-400 bg-green-500/10 hover:bg-green-500/20' : 'border-green-500 text-green-700 bg-green-50 hover:bg-green-100'}`}
                                disabled={actionLoading === row.id + "APPROVE"}
                                title="Approve"
                              >
                                <CheckCircle className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                                <span>Approve</span>
                              </button>
                              <button
                                onClick={() => setShowRejectModal(row.id)}
                                className={`flex items-center gap-1 text-xs sm:text-sm font-medium px-2 sm:px-2.5 py-1 sm:py-1.5 rounded-md transition border flex-1 justify-center ${theme === 'dark' ? 'border-red-500 text-red-400 bg-red-500/10 hover:bg-red-500/20' : 'border-red-500 text-red-700 bg-red-50 hover:bg-red-100'}`}
                                disabled={actionLoading === row.id + "REJECT"}
                                title="Reject"
                              >
                                <XCircle className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                                <span>Reject</span>
                              </button>
                            </div>
                          ) : (
                            <span className={`text-xs sm:text-sm ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-600'}`}>No action</span>
                          )}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className={`text-center py-3 sm:py-4 text-xs sm:text-sm ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}`}>No leave requests available.</div>
                  )}
                </div>

                {/* Desktop / Tablet: table */}
                <table className="hidden md:table w-full text-sm text-left border-collapse">
                  <thead className={`border-b ${theme === 'dark' ? 'border-border bg-card' : 'border-gray-200 bg-gray-50'}`}>
                    <tr>
                      <th className={`py-3 px-4 text-left ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>Student</th>
                      <th className={`py-3 px-4 text-left ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>Period</th>
                      <th className={`py-3 px-4 text-left ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>Reasons</th>
                      <th className={`py-3 px-4 text-left ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>Status</th>
                      <th className={`py-3 px-4 text-left ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRows.length > 0 ? (
                      filteredRows.map((row: LeaveRow) => (
                        <tr
                          key={row.id}
                          className={`border-b transition-colors duration-200 ${theme === 'dark' ? 'border-border hover:bg-accent' : 'border-gray-200 hover:bg-gray-50'}`}
                        >
                          <td className="py-3 px-4">
                            <div>
                              <p className={`font-medium ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>{row.student_name}</p>
                              <p className={`text-xs ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-600'}`}>{row.usn}</p>
                            </div>
                          </td>
                          <td className="py-3 px-4">{row.start_date} to {row.end_date}</td>
                          <td className="py-3 px-4">
                            <button
                              onClick={() => setViewReason(row.reason)}
                              className={`flex items-center gap-1 text-xs font-medium px-2.5 py-1.5 rounded-md transition border ${theme === 'dark' ? 'border-blue-500 text-blue-400 bg-blue-500/10 hover:bg-blue-500/20' : 'border-blue-500 text-blue-700 bg-blue-50 hover:bg-blue-100'}`}
                            >
                              <Eye className="w-3.5 h-3.5" />
                              <span className="hidden sm:inline">View</span>
                            </button>
                          </td>
                          <td className="py-3 px-4">{getStatusBadge(row.status)}</td>
                          <td className="py-3 px-4">
                            {row.status === "PENDING" ? (
                              <div className="flex gap-2">
                                <button
                                  onClick={() => handleApprove(row.id)}
                                  className={`flex items-center gap-1 text-xs font-medium px-2.5 py-1.5 rounded-md transition border ${theme === 'dark' ? 'border-green-500 text-green-400 bg-green-500/10 hover:bg-green-500/20' : 'border-green-500 text-green-700 bg-green-50 hover:bg-green-100'}`}
                                  disabled={actionLoading === row.id + "APPROVE"}
                                >
                                  <CheckCircle className="w-3.5 h-3.5" />
                                  <span className="hidden sm:inline">Approve</span>
                                </button>

                                <button
                                  onClick={() => setShowRejectModal(row.id)}
                                  className={`flex items-center gap-1 text-xs font-medium px-2.5 py-1.5 rounded-md transition border ${theme === 'dark' ? 'border-red-500 text-red-400 bg-red-500/10 hover:bg-red-500/20' : 'border-red-500 text-red-700 bg-red-50 hover:bg-red-100'}`}
                                  disabled={actionLoading === row.id + "REJECT"}
                                >
                                  <XCircle className="w-3.5 h-3.5" />
                                  <span className="hidden sm:inline">Reject</span>
                                </button>
                              </div>
                            ) : (
                              <span className={`text-xs ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-600'}`}>No action</span>
                            )}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={5} className={`py-4 text-center ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}`}>
                          No leave requests available.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* View Reason Dialog */}
      <Dialog open={!!viewReason} onOpenChange={() => setViewReason(null)}>
        <DialogContent className={theme === 'dark' ? 'bg-card text-foreground border border-border max-w-md rounded-xl' : 'bg-white text-gray-900 border border-gray-200 max-w-md rounded-xl'}>
          <DialogHeader>
            <DialogTitle className={`text-lg font-semibold ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>Leave Reason</DialogTitle>
          </DialogHeader>

          <div className={`p-3 text-base leading-relaxed whitespace-pre-wrap break-words max-h-64 overflow-y-auto rounded-md ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>
            {viewReason}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              className={theme === 'dark'
                ? 'text-foreground bg-card border border-border hover:bg-accent'
                : 'text-gray-700 bg-white border border-gray-300 hover:bg-gray-50'}
              onClick={() => setViewReason(null)}
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirm Reject Dialog */}
      <Dialog open={!!showRejectModal} onOpenChange={() => setShowRejectModal(null)}>
        <DialogContent className={theme === 'dark' ? 'bg-card text-foreground border border-border max-w-md rounded-lg' : 'bg-white text-gray-900 border border-gray-200 max-w-md rounded-lg'}>
          <DialogHeader>
            <DialogTitle className={theme === 'dark' ? 'text-foreground' : 'text-gray-900'}>Reject Leave Request</DialogTitle>
          </DialogHeader>
          <p className={`text-sm ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}`}>Are you sure you want to reject this leave request?</p>
          <DialogFooter className="pt-4 flex flex-col sm:flex-row justify-end gap-2">
            <Button
              variant="outline"
              className={(theme === 'dark' ? 'border-border text-foreground bg-card hover:bg-accent' : 'border-gray-300 text-gray-700 bg-white hover:bg-gray-50') + ' w-full sm:w-auto'}
              onClick={() => setShowRejectModal(null)}
              disabled={actionLoading?.includes("REJECT")}
            >
              Cancel
            </Button>
            <Button
              className={(theme === 'dark' ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90 border border-destructive' : 'bg-red-600 text-white hover:bg-red-700 border border-red-600') + ' w-full sm:w-auto'}
              onClick={() => showRejectModal && handleConfirmReject(showRejectModal)}
              disabled={actionLoading?.includes("REJECT")}
            >
              {actionLoading?.includes("REJECT") ? "Rejecting..." : "Confirm Reject"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ManageStudentLeave;