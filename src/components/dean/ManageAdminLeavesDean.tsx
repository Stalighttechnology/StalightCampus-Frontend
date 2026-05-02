import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Button } from "../ui/button";
import { useTheme } from "../../context/ThemeContext";
import { CheckCircle, XCircle, Filter as FilterIcon, Loader2 } from 'lucide-react';
import { manageAllLeaves } from "../../utils/dean_api";
import Swal from 'sweetalert2';
import withReactContent from 'sweetalert2-react-content';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "../ui/dialog";
import { SkeletonTable, SkeletonList, SkeletonPageHeader } from "../ui/skeleton";
import { Alert, AlertDescription } from "../ui/alert";

const MySwal = withReactContent(Swal);

interface UnifiedLeave {
  id: number;
  title?: string;
  faculty_name: string;
  department: string;
  faculty_type: 'principal' | 'coe' | 'fees_manager';
  start_date: string;
  end_date: string;
  reason: string;
  status: string;
  submitted_at: string;
  reviewed_at: string | null;
}

const ManageAdminLeavesDean = () => {
  const { theme } = useTheme();
  const [allLeaves, setAllLeaves] = useState<UnifiedLeave[]>([]);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<number | null>(null);
  const [selectedLeave, setSelectedLeave] = useState<UnifiedLeave | null>(null);
  const [showReasonDialog, setShowReasonDialog] = useState(false);
  const [statusFilter, setStatusFilter] = useState<'All' | 'Approved' | 'Pending' | 'Rejected'>('All');
  const [showFilter, setShowFilter] = useState(false);
  const filterRef = useRef<HTMLDivElement | null>(null);

  // Fetch all leaves data in one call
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const response = await manageAllLeaves();
        if (response.success && response.data) {
          setAllLeaves(response.data);
        } else {
          setError(response.message || "Failed to fetch leaves");
        }
      } catch (err) {
        setError("Failed to fetch leave data");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleAction = async (leaveId: number, action: 'APPROVED' | 'REJECTED') => {
    setActionLoading(leaveId);
    try {
      const response = await manageAllLeaves(
        { leave_id: leaveId, status: action },
        'PATCH'
      );

      if (response.success && response.updated_leave) {
        // Update the leave status in the local state
        setAllLeaves(prevLeaves =>
          prevLeaves.map(leave =>
            leave.id === leaveId
              ? { ...leave, status: action, reviewed_at: response.updated_leave?.reviewed_at || null }
              : leave
          )
        );
        setSuccessMessage(`Leave ${action.toLowerCase()} successfully`);
        setTimeout(() => setSuccessMessage(""), 3000);
      } else {
        setError(response.message || "Failed to update leave");
      }
    } catch (err) {
      setError("Failed to update leave");
    } finally {
      setActionLoading(null);
    }
  };

  // Create unified arrays for pending and recent leaves
  const allPendingLeaves: UnifiedLeave[] = allLeaves.filter(leave => leave.status === 'PENDING');

  // Get leaves from past 7 days (only processed leaves, not pending)
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const recentLeaves: UnifiedLeave[] = allLeaves
    .filter(leave => leave.status !== 'PENDING' && new Date(leave.start_date) >= sevenDaysAgo)
    .sort((a, b) => new Date(b.start_date).getTime() - new Date(a.start_date).getTime()); // Sort by date descending

  // Filtered recent leaves according to statusFilter
  const filteredRecentLeaves: UnifiedLeave[] = recentLeaves.filter(l => {
    if (statusFilter === 'All') return true;
    return l.status === statusFilter.toUpperCase();
  });

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (filterRef.current && !filterRef.current.contains(e.target as Node)) {
        setShowFilter(false);
      }
    };
    if (showFilter) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showFilter]);

  return (
    <div className={`${theme === 'dark' ? 'bg-background text-foreground' : 'bg-gray-50 text-gray-900'}`}>
      {/* Error Message */}
      {error && (
        <Alert variant="destructive" className="mb-4">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Success Message */}
      {successMessage && (
        <Alert className={`mb-4 border-green-500 bg-green-500/10 text-green-600`}>
          <CheckCircle className="w-4 h-4" />
          <AlertDescription>{successMessage}</AlertDescription>
        </Alert>
      )}

      <div>
        <div className="mb-6">
          <Card className={`flex-1 ${theme === 'dark' ? 'bg-card text-foreground border-border shadow-sm' : 'bg-white text-gray-900 border-gray-200 shadow-sm'}`}>
            <CardHeader>
              <CardTitle className={`text-xl font-semibold ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>
                Pending Leave Requests
              </CardTitle>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <div className="overflow-x-auto max-w-full custom-scrollbar">
                {/* Mobile: stacked cards */}
                <div className="md:hidden space-y-3">
                  {loading ? (
                    <div className="space-y-3">
                      <SkeletonList items={3} />
                    </div>
                  ) : allPendingLeaves.length === 0 ? (
                    <div className={`text-center py-4 ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}`}>No pending leave requests.</div>
                  ) : (
                    allPendingLeaves.map((leave) => (
                      <div key={leave.id} className={`p-3 rounded-md border ${theme === 'dark' ? 'bg-card border-border text-foreground' : 'bg-white border-gray-200 text-gray-900'}`}>
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="font-medium">{leave.faculty_name}</div>
                            <div className="text-xs text-muted-foreground">{leave.faculty_type === 'principal' ? 'Administration' : leave.department}</div>
                            <div className="text-sm mt-1">{leave.start_date} <span className={theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}>to</span> {leave.end_date}</div>
                          </div>
                          <div className="shrink-0">
                            <span className={`px-3 py-1 rounded-full text-xs font-medium ${theme === 'dark' ? 'bg-yellow-900 text-yellow-200' : 'bg-yellow-100 text-yellow-700'}`}>Pending</span>
                          </div>
                        </div>
                        <div className="mt-3 flex items-center justify-between">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => { setSelectedLeave(leave); setShowReasonDialog(true); }}
                          >
                            View
                          </Button>
                          <div>
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                className={`px-3 py-1 text-xs flex items-center gap-1 w-full md:w-auto ${
                                  theme === 'dark'
                                    ? 'text-green-400 border-green-400 hover:bg-green-900/20'
                                    : 'text-green-700 border-green-600 hover:bg-green-100'
                                }`}
                                onClick={() => handleAction(leave.id, 'APPROVED')}
                                disabled={actionLoading === leave.id}
                              >
                                {actionLoading === leave.id ? '...' : <><CheckCircle size={16} /> Approve</>}
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className={`px-3 py-1 text-xs flex items-center gap-1 w-full md:w-auto ${
                                  theme === 'dark'
                                    ? 'text-red-400 border-red-400 hover:bg-red-900/20'
                                    : 'text-red-700 border-red-600 hover:bg-red-100'
                                }`}
                                onClick={() => handleAction(leave.id, 'REJECTED')}
                                disabled={actionLoading === leave.id}
                              >
                                {actionLoading === leave.id ? '...' : <><XCircle size={16} /> Reject</>}
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
                {/* Tablet/Laptop: table */}
                <table className="hidden md:table w-full text-sm text-left border-collapse">
                  <thead className={`border-b ${theme === 'dark' ? 'border-border bg-card' : 'border-gray-200 bg-gray-50'}`}>
                    <tr>
                      <th className={`py-2 px-2 md:px-4 text-left ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>Name</th>
                      <th className={`py-2 px-2 md:px-4 text-left ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>Department</th>
                      <th className={`py-2 px-2 md:px-4 text-left ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>Period</th>
                      <th className={`py-2 px-2 md:px-4 text-left ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>Reason</th>
                      <th className={`py-2 px-2 md:px-4 text-left ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>Status</th>
                      <th className={`py-2 px-2 md:px-4 text-left ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <tr><td colSpan={6} className="py-4"><SkeletonTable rows={5} cols={6} /></td></tr>
                    ) : allPendingLeaves.length === 0 ? (
                      <tr><td colSpan={6} className={`text-center py-4 ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}`}>No pending leave requests.</td></tr>
                    ) : (
                      allPendingLeaves.map((leave) => (
                        <tr key={leave.id} className={`border-b transition-colors duration-200 ${theme === 'dark' ? 'border-border hover:bg-accent' : 'border-gray-200 hover:bg-gray-50'}`}>
                          <td className="py-3 px-2 md:px-4 font-medium">{leave.faculty_name}</td>
                          <td className="py-3 px-2 md:px-4">{leave.faculty_type === 'principal' ? 'Administration' : leave.department}</td>
                          <td className="py-3 px-2 md:px-4">{leave.start_date} <span className={theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}>to</span> {leave.end_date}</td>
                          <td className="py-3 px-2 md:px-4">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => { setSelectedLeave(leave); setShowReasonDialog(true); }}
                            >
                              View
                            </Button>
                          </td>
                          <td className="py-3 px-2 md:px-4">
                            <span className={`px-3 py-1 rounded-full text-xs font-medium ${theme === 'dark' ? 'bg-yellow-900 text-yellow-200' : 'bg-yellow-100 text-yellow-700'}`}>Pending</span>
                          </td>
                          <td className="py-3 px-2 md:px-4">
                            <div className="flex flex-col md:flex-row gap-2">
                              <Button
                                variant="outline"
                                className={`px-3 py-1 text-xs flex items-center gap-1 w-full md:w-auto ${
                                  theme === 'dark' 
                                    ? 'text-green-400 border-green-400 hover:bg-green-900/20' 
                                    : 'text-green-700 border-green-600 hover:bg-green-100'
                                }`}
                                onClick={() => handleAction(leave.id, 'APPROVED')}
                                disabled={actionLoading === leave.id}
                              >
                                {actionLoading === leave.id ? '...' : <><CheckCircle size={16} /> Approve</>}
                              </Button>
                              <Button
                                variant="outline"
                                className={`px-3 py-1 text-xs flex items-center gap-1 w-full md:w-auto ${
                                  theme === 'dark' 
                                    ? 'text-red-400 border-red-400 hover:bg-red-900/20' 
                                    : 'text-red-700 border-red-600 hover:bg-red-100'
                                }`}
                                onClick={() => handleAction(leave.id, 'REJECTED')}
                                disabled={actionLoading === leave.id}
                              >
                                {actionLoading === leave.id ? '...' : <><XCircle size={16} /> Reject</>}
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
        </div>
        <div className="flex flex-col">
      {/* Recent Leave History (Past 7 Days) */}
      <Card className={`flex-1 ${theme === 'dark' ? 'bg-card text-foreground border-border shadow-sm' : 'bg-white text-gray-900 border-gray-200 shadow-sm'}`}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className={`text-xl font-semibold ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>
              Recent Leave History
            </CardTitle>
            <div className="relative" ref={filterRef}>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowFilter(v => !v)}
                aria-label="Filter recent leaves"
              >
                <FilterIcon className="w-5 h-5" />
              </Button>
              {showFilter && (
                <div className={`absolute right-0 mt-2 w-36 rounded shadow-lg z-10 border ${theme === 'dark' ? 'bg-card text-foreground border-border' : 'bg-white text-gray-900 border-gray-300'}`}>
                  {['All', 'Approved', 'Pending', 'Rejected'].map((status) => (
                    <div
                      key={status}
                      onClick={() => { setStatusFilter(status as any); setShowFilter(false); }}
                      className={`${theme === 'dark' ? 'hover:bg-accent' : 'hover:bg-gray-100'} px-4 py-2 cursor-pointer ${statusFilter === status ? 'font-semibold' : ''}`}
                    >
                      {status}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filteredRecentLeaves.length === 0 ? (
            <div className={`text-sm ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}`}>No leave requests in the past 7 days.</div>
          ) : (
            <div className="h-[420px] overflow-auto space-y-4 custom-scrollbar">
              {filteredRecentLeaves.map((leave) => (
                <div
                  key={`${leave.faculty_type}-${leave.id}`}
                  className={`border rounded-md px-4 py-3 shadow-sm ${theme === 'dark' ? 'bg-card text-card-foreground border-border' : 'bg-white text-gray-900 border-gray-200'}`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-start gap-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <h3 className={`font-medium ${theme === 'dark' ? 'text-card-foreground' : 'text-gray-900'}`}>{leave.title || 'Leave Request'}</h3>
                            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                              leave.faculty_type === 'coe'
                                ? (theme === 'dark' ? 'bg-green-400 text-green-900' : 'bg-green-600 text-white')
                                : leave.faculty_type === 'principal'
                                ? (theme === 'dark' ? 'bg-blue-100 text-blue-800' : 'bg-blue-100 text-blue-800')
                                : (theme === 'dark' ? 'bg-purple-100 text-purple-800' : 'bg-purple-100 text-purple-800')
                            }`}>{leave.faculty_type.toUpperCase()}</span>
                          </div>
                          <p className={`mt-1 text-sm ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-700'}`}>{leave.start_date}</p>
                        </div>
                      </div>

                      <p className={`mt-2 text-sm ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-700'}`}>
                        {leave.faculty_name} - {leave.faculty_type === 'principal' ? 'Administration' : leave.department}
                      </p>

                      <p className={`mt-1 text-sm ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-600'}`}>
                        {leave.start_date} to {leave.end_date}
                      </p>

                      <div className="mt-3">
                        <Button
                          onClick={() => { setSelectedLeave(leave); setShowReasonDialog(true); }}
                          variant="outline"
                          size="sm"
                          className={`text-xs ${theme === 'dark' ? 'border-border hover:bg-accent' : 'border-gray-300 hover:bg-gray-50'}`}
                        >
                          View Reason
                        </Button>
                      </div>
                    </div>

                    <div className="ml-4 flex-shrink-0 text-right">
                      <div className="flex flex-col items-end">
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                          leave.status === 'APPROVED' ? (theme === 'dark' ? 'bg-green-700 text-green-50' : 'bg-green-100 text-green-700') :
                          leave.status === 'REJECTED' ? (theme === 'dark' ? 'bg-red-700 text-red-50' : 'bg-red-100 text-red-700') :
                          (theme === 'dark' ? 'bg-yellow-900 text-yellow-200' : 'bg-yellow-100 text-yellow-700')
                        }`}>{leave.status.charAt(0) + leave.status.slice(1).toLowerCase()}</span>
                        <p className={`text-xs mt-2 ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}`}>{new Date(leave.start_date).toLocaleDateString()}</p>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
      </div>
      <Dialog open={showReasonDialog} onOpenChange={setShowReasonDialog}>
        <DialogContent className={theme === 'dark' ? 'bg-card text-card-foreground border-border' : 'bg-white text-gray-900 border-gray-200'}>
          <DialogHeader>
            <DialogTitle className={theme === 'dark' ? 'text-card-foreground' : 'text-gray-900'}>
              Leave Reason
            </DialogTitle>
            <DialogDescription className={theme === 'dark' ? 'text-muted-foreground' : 'text-gray-600'}>
              {selectedLeave && `Reason for: ${selectedLeave.title}`}
            </DialogDescription>
          </DialogHeader>
          <div className="mt-4">
            <p className={`text-sm ${theme === 'dark' ? 'text-card-foreground' : 'text-gray-700'}`}>
              {selectedLeave?.reason}
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ManageAdminLeavesDean;