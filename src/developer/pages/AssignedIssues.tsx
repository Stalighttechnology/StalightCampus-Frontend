import { useState, useEffect } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../../components/ui/table";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { Label } from "../../components/ui/label";
import { Textarea } from "../../components/ui/textarea";
import { useTheme } from "../../context/ThemeContext";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../../components/ui/dialog";
import { showSuccessAlert, showErrorAlert } from "../../utils/sweetalert";
import { API_BASE_URL } from "@/utils/config";
import { fetchWithSuperadminTokenRefresh } from "../../utils/authService";
import { ChevronLeft, ChevronRight, Eye, Mail, Phone, ShieldCheck, Wrench } from "lucide-react";

const getPriorityClass = (p: string) =>
  p === 'Critical' ? 'border-red-500 text-red-600 bg-red-50 dark:bg-red-900/10' :
  p === 'High' ? 'border-orange-500 text-orange-600 bg-orange-50 dark:bg-orange-900/10' :
  p === 'Medium' ? 'border-yellow-500 text-yellow-700 bg-yellow-50 dark:bg-yellow-900/10' :
  'border-blue-400 text-blue-600 bg-blue-50 dark:bg-blue-900/10';

const getStatusClass = (s: string) =>
  s === 'Resolved' ? 'bg-emerald-100 text-emerald-800 border-emerald-200' :
  s === 'Closed' ? 'bg-gray-100 text-gray-600 border-gray-300' :
  s === 'Pending' ? 'bg-amber-100 text-amber-800 border-amber-200' :
  'bg-blue-100 text-blue-800 border-blue-200';

const AssignedIssues = () => {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedTicket, setSelectedTicket] = useState<any>(null);
  const [updateForm, setUpdateForm] = useState({ status: '', response: '' });
  const { theme } = useTheme();

  const fetchData = async (p = page) => {
    setLoading(true);
    try {
      const response = await fetchWithSuperadminTokenRefresh(`${API_BASE_URL}/api/developer/assigned-tickets/?page=${p}`, {
        headers: { "Authorization": `Bearer ${localStorage.getItem("superadmin_token")}` }
      });
      const res = await response.json();
      if (res.tickets) {
        setData(res.tickets);
        setTotalPages(res.total_pages || 1);
      }
    } catch (error) {
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(page); }, [page]);

  const handleUpdate = async () => {
    try {
      const res = await fetchWithSuperadminTokenRefresh(`${API_BASE_URL}/api/developer/assigned-tickets/${selectedTicket.internal_id}/`, {
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

  return (
    <div className="space-y-6">
      <div>
        <h1 className={`text-3xl font-bold tracking-tight ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>Assigned Issues</h1>
        <p className="text-muted-foreground mt-1">Manage support tickets assigned to you.</p>
      </div>

      <div className="rounded-md border bg-card shadow-sm overflow-hidden">
        <Table>
          <TableHeader className="bg-muted/50">
            <TableRow>
              <TableHead>Ticket ID</TableHead>
              <TableHead>Organization</TableHead>
              <TableHead>Subject</TableHead>
              <TableHead>Deadline</TableHead>
              <TableHead>Priority</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ?
              <TableRow><TableCell colSpan={7} className="h-24 text-center">Loading...</TableCell></TableRow> :
              data.length === 0 ?
                <TableRow><TableCell colSpan={7} className="h-24 text-center text-muted-foreground">No tickets assigned.</TableCell></TableRow> :
                data.map((item) => (
                  <TableRow
                    key={item.id}
                    className="cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => { setSelectedTicket(item); setUpdateForm({ status: item.status, response: item.response || '' }); }}>

                    <TableCell className="font-medium text-primary">{item.id}</TableCell>
                    <TableCell>{item.org_name}</TableCell>
                    <TableCell>
                      {item.subject}
                      {item.description && <p className="text-xs text-muted-foreground truncate max-w-xs">{item.description}</p>}
                    </TableCell>
                    <TableCell className="text-muted-foreground whitespace-nowrap">
                      {item.deadline ? new Date(item.deadline).toLocaleString() : 'No Deadline'}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={getPriorityClass(item.priority)}>{item.priority}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={getStatusClass(item.status)}>{item.status}</Badge>
                    </TableCell>
                    <TableCell>
                      <Button variant="outline" size="sm" className="gap-2" onClick={(e) => {
                         e.stopPropagation();
                         setSelectedTicket(item);
                         setUpdateForm({ status: item.status, response: item.response || '' });
                      }}>
                        <Eye size={16} /> View
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
            }
          </TableBody>
        </Table>

        {/* Pagination Controls */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-border/50">
          <div className="text-sm text-muted-foreground">
            Page {page} of {totalPages}
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
            >
              <ChevronLeft className="w-4 h-4 mr-1" /> Prev
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
            >
              Next <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        </div>
      </div>

      <Dialog open={!!selectedTicket} onOpenChange={(open) => !open && setSelectedTicket(null)}>
        <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
          <DialogHeader className="border-b pb-4">
            <DialogTitle className="flex justify-between items-center pr-4 text-xl">
              <span className="flex items-center gap-2">
                <span className="text-primary font-bold">{selectedTicket?.id}</span>
                <span className="text-muted-foreground text-sm font-normal">| {selectedTicket?.org_name}</span>
              </span>
              <Badge variant="outline" className={`text-sm px-3 py-1 ${getPriorityClass(selectedTicket?.priority || '')}`}>
                {selectedTicket?.priority} Priority
              </Badge>
            </DialogTitle>
          </DialogHeader>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-4">
            {/* Left Column: Ticket Details */}
            <div className="space-y-5">
              <div>
                <h4 className="font-semibold text-xs text-muted-foreground uppercase tracking-wide mb-1">Issue Overview</h4>
                <div className="p-4 bg-muted/30 border rounded-lg space-y-3">
                  <div>
                    <Label className="text-xs text-muted-foreground">Subject</Label>
                    <p className="font-medium">{selectedTicket?.subject}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Description</Label>
                    <div className="text-sm text-foreground mt-1 whitespace-pre-wrap">
                      {selectedTicket?.description}
                    </div>
                  </div>
                  <div className="pt-2 flex justify-between items-center border-t border-border/50 text-xs text-muted-foreground">
                    <span>Deadline: {selectedTicket?.deadline ? new Date(selectedTicket.deadline).toLocaleString() : 'None'}</span>
                    <span>Status: <strong className="text-foreground">{selectedTicket?.status}</strong></span>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="font-semibold text-xs text-muted-foreground uppercase tracking-wide mb-2">Organization Contacts</h4>
                <div className="grid grid-cols-1 gap-3">
                  {/* Admin Contact */}
                  <div className="p-3 border rounded-lg bg-card shadow-sm flex items-start gap-3">
                    <div className="bg-blue-100 text-blue-600 p-2 rounded-full dark:bg-blue-900/20 dark:text-blue-400">
                      <ShieldCheck size={18} />
                    </div>
                    <div>
                      <p className="text-sm font-bold flex items-center gap-2">
                        {selectedTicket?.org_details?.admin_name}
                        <Badge variant="secondary" className="text-[10px] px-1.5 py-0">Admin</Badge>
                      </p>
                      <div className="flex flex-col gap-1 mt-1 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1.5"><Mail size={12} /> {selectedTicket?.org_details?.admin_email}</span>
                        <span className="flex items-center gap-1.5"><Phone size={12} /> {selectedTicket?.org_details?.admin_mobile}</span>
                      </div>
                    </div>
                  </div>

                  {/* Tech POC */}
                  <div className="p-3 border rounded-lg bg-card shadow-sm flex items-start gap-3">
                    <div className="bg-emerald-100 text-emerald-600 p-2 rounded-full dark:bg-emerald-900/20 dark:text-emerald-400">
                      <Wrench size={18} />
                    </div>
                    <div>
                      <p className="text-sm font-bold flex items-center gap-2">
                        {selectedTicket?.org_details?.tech_poc_name}
                        <Badge variant="secondary" className="text-[10px] px-1.5 py-0">Tech POC</Badge>
                      </p>
                      <div className="flex flex-col gap-1 mt-1 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1.5"><Mail size={12} /> {selectedTicket?.org_details?.tech_poc_email}</span>
                        <span className="flex items-center gap-1.5"><Phone size={12} /> {selectedTicket?.org_details?.tech_poc_mobile}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column: Resolution */}
            <div className="space-y-5 bg-muted/20 p-5 rounded-xl border">
              <h4 className="font-semibold text-sm border-b pb-2">Ticket Resolution</h4>
              
              <div>
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Update Status</Label>
                <select
                  className="w-full mt-1.5 flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm focus:ring-2 focus:ring-primary/20 transition-all"
                  value={updateForm.status}
                  onChange={(e) => setUpdateForm({ ...updateForm, status: e.target.value })}>
                  {['Open', 'Pending', 'Resolved', 'Closed'].map((s) =>
                    <option key={s} value={s}>{s}</option>
                  )}
                </select>
              </div>

              <div>
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Official Response</Label>
                <Textarea
                  className="mt-1.5 resize-none focus:ring-2 focus:ring-primary/20 transition-all"
                  placeholder="Enter response or resolution notes..."
                  rows={6}
                  value={updateForm.response}
                  onChange={(e) => setUpdateForm({ ...updateForm, response: e.target.value })} 
                />
              </div>
            </div>
          </div>
          
          <div className="flex justify-end pt-4 border-t gap-3">
            <Button variant="outline" onClick={() => setSelectedTicket(null)}>Cancel</Button>
            <Button onClick={handleUpdate}>Save Changes</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AssignedIssues;
