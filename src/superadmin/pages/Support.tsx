import { useState, useEffect, useCallback } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../../components/ui/table";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { Label } from "../../components/ui/label";
import { Textarea } from "../../components/ui/textarea";
import { useTheme } from "../../context/ThemeContext";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../../components/ui/dialog";
import { showSuccessAlert, showErrorAlert } from "../../utils/sweetalert";
import { ChevronLeft, ChevronRight } from "lucide-react";

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';

const getPriorityClass = (p: string) =>
  p === 'Critical' ? 'border-red-500 text-red-600 bg-red-50 dark:bg-red-900/10' :
  p === 'High'     ? 'border-orange-500 text-orange-600 bg-orange-50 dark:bg-orange-900/10' :
  p === 'Medium'   ? 'border-yellow-500 text-yellow-700 bg-yellow-50 dark:bg-yellow-900/10' :
                     'border-blue-400 text-blue-600 bg-blue-50 dark:bg-blue-900/10';

const getStatusClass = (s: string) =>
  s === 'Resolved' ? 'bg-emerald-100 text-emerald-800 border-emerald-200' :
  s === 'Closed'   ? 'bg-gray-100 text-gray-600 border-gray-300' :
  s === 'Pending'  ? 'bg-amber-100 text-amber-800 border-amber-200' :
                     'bg-blue-100 text-blue-800 border-blue-200';

const Support = () => {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTicket, setSelectedTicket] = useState<any>(null);
  const [updateForm, setUpdateForm] = useState({ status: '', response: '' });
  const [priorityFilter, setPriorityFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const pageSize = 10;
  const { theme } = useTheme();

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        page_size: String(pageSize),
        ...(priorityFilter !== 'All' && { priority: priorityFilter }),
        ...(statusFilter !== 'All' && { status: statusFilter }),
      });
      const response = await fetch(`${API_BASE}/api/superadmin/support/tickets/?${params}`, {
        headers: { "Authorization": `Bearer ${localStorage.getItem("superadmin_token")}` }
      });
      const res = await response.json();
      setData(res.tickets || []);
      setTotal(res.total || 0);
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setLoading(false);
    }
  }, [page, priorityFilter, statusFilter]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Reset to page 1 when filters change
  useEffect(() => { setPage(1); }, [priorityFilter, statusFilter]);

  const handleUpdate = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/superadmin/support/tickets/${selectedTicket.internal_id}/`, {
        method: 'PUT',
        headers: {
          "Authorization": `Bearer ${localStorage.getItem("superadmin_token")}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(updateForm)
      });
      const result = await res.json();
      if (result.success) {
        showSuccessAlert('Success', 'Ticket updated successfully');
        setSelectedTicket(null);
        fetchData();
      } else {
        showErrorAlert('Error', result.error);
      }
    } catch (e) {
      showErrorAlert('Error', 'Network error');
    }
  };

  const totalPages = Math.ceil(total / pageSize);

  return (
    <div className="space-y-6">
      <div>
        <h1 className={`text-3xl font-bold tracking-tight ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>Support Panel</h1>
        <p className="text-muted-foreground mt-1">Handle organization support requests.</p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="flex items-center gap-2">
          <Label className="text-sm font-medium whitespace-nowrap">Priority:</Label>
          <select
            className="h-9 rounded-md border border-input bg-background px-3 text-sm"
            value={priorityFilter}
            onChange={e => setPriorityFilter(e.target.value)}
          >
            {['All', 'Critical', 'High', 'Medium', 'Low'].map(v => (
              <option key={v} value={v}>{v}</option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <Label className="text-sm font-medium whitespace-nowrap">Status:</Label>
          <select
            className="h-9 rounded-md border border-input bg-background px-3 text-sm"
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
          >
            {['All', 'Open', 'Pending', 'Resolved', 'Closed'].map(v => (
              <option key={v} value={v}>{v}</option>
            ))}
          </select>
        </div>
        <div className="ml-auto text-sm text-muted-foreground">
          {total} ticket{total !== 1 ? 's' : ''} found
        </div>
      </div>

      <div className="rounded-md border bg-card shadow-sm overflow-hidden">
        <Table>
          <TableHeader className="bg-muted/50">
            <TableRow>
              <TableHead>Ticket ID</TableHead>
              <TableHead>Organization</TableHead>
              <TableHead>Subject</TableHead>
              <TableHead>Priority</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Date</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={6} className="h-24 text-center">Loading...</TableCell></TableRow>
            ) : data.length === 0 ? (
              <TableRow><TableCell colSpan={6} className="h-24 text-center text-muted-foreground">No tickets found.</TableCell></TableRow>
            ) : data.map((item) => (
              <TableRow
                key={item.id}
                className="cursor-pointer hover:bg-muted/50 transition-colors"
                onClick={() => { setSelectedTicket(item); setUpdateForm({ status: item.status, response: item.response || '' }); }}
              >
                <TableCell className="font-medium text-primary">{item.id}</TableCell>
                <TableCell>{item.org_name}</TableCell>
                <TableCell>
                  {item.subject}
                  {item.description && <p className="text-xs text-muted-foreground truncate max-w-xs">{item.description}</p>}
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className={getPriorityClass(item.priority)}>{item.priority}</Badge>
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className={getStatusClass(item.status)}>{item.status}</Badge>
                </TableCell>
                <TableCell className="text-muted-foreground whitespace-nowrap">{item.date}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Page {page} of {totalPages}
          </p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              const p = Math.max(1, Math.min(page - 2, totalPages - 4)) + i;
              return (
                <Button key={p} variant={p === page ? "default" : "outline"} size="sm" onClick={() => setPage(p)}>
                  {p}
                </Button>
              );
            })}
            <Button variant="outline" size="sm" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Ticket Detail Dialog */}
      <Dialog open={!!selectedTicket} onOpenChange={(open) => !open && setSelectedTicket(null)}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle className="flex justify-between items-center pr-4">
              <span>{selectedTicket?.id}</span>
              <Badge variant="outline" className={getPriorityClass(selectedTicket?.priority || '')}>{selectedTicket?.priority}</Badge>
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <h4 className="font-semibold text-xs text-muted-foreground uppercase tracking-wide">Organization</h4>
                <p className="text-sm font-medium mt-1">{selectedTicket?.org_name}</p>
              </div>
              <div>
                <h4 className="font-semibold text-xs text-muted-foreground uppercase tracking-wide">Date</h4>
                <p className="text-sm font-medium mt-1">{selectedTicket?.date}</p>
              </div>
            </div>
            <div>
              <h4 className="font-semibold text-xs text-muted-foreground uppercase tracking-wide">Subject</h4>
              <p className="text-sm font-medium mt-1">{selectedTicket?.subject}</p>
            </div>
            <div>
              <h4 className="font-semibold text-xs text-muted-foreground uppercase tracking-wide">Description</h4>
              <div className="text-sm text-muted-foreground p-3 bg-muted rounded-md min-h-[80px] mt-1">
                {selectedTicket?.description}
              </div>
            </div>

            <hr />

            <div>
              <Label>Update Status</Label>
              <select
                className="w-full mt-1 flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={updateForm.status}
                onChange={e => setUpdateForm({ ...updateForm, status: e.target.value })}
              >
                {['Open', 'Pending', 'Resolved', 'Closed'].map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>

            <div>
              <Label>Official HQ Response</Label>
              <Textarea
                className="mt-1"
                placeholder="Enter response to the organization..."
                rows={4}
                value={updateForm.response}
                onChange={e => setUpdateForm({ ...updateForm, response: e.target.value })}
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setSelectedTicket(null)}>Cancel</Button>
              <Button className="bg-primary text-white" onClick={handleUpdate}>Save Changes</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
export default Support;
