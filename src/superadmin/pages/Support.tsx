import { useState, useEffect, useCallback } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../../components/ui/table";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { Label } from "../../components/ui/label";
import { Textarea } from "../../components/ui/textarea";
import { useTheme } from "../../context/ThemeContext";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "../../components/ui/dialog";
import { Card, CardHeader, CardTitle, CardContent } from "../../components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/select";
import { showSuccessAlert, showErrorAlert } from "../../utils/sweetalert";
import { ChevronLeft, ChevronRight, Eye, Building, Mail, Phone, User as UserIcon, ShieldCheck, Wrench } from "lucide-react";

import { API_BASE_URL } from "@/utils/config";
import { fetchWithSuperadminTokenRefresh } from "../../utils/authService";

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

const Support = () => {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTicket, setSelectedTicket] = useState<any>(null);
  const [updateForm, setUpdateForm] = useState({ status: '', response: '', assigned_developer_id: '', deadline: '' });
  const [developers, setDevelopers] = useState<any[]>([]);
  const [priorityFilter, setPriorityFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
  const pageSize = 10;
  const { theme } = useTheme();

  const allSkills = Array.from(new Set(developers.flatMap(d => d.developer_skills || [])));
  const filteredDevelopers = developers.filter(dev =>
    selectedSkills.length === 0 || selectedSkills.every(skill => dev.developer_skills?.includes(skill))
  );

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        page_size: String(pageSize),
        ...(priorityFilter !== 'All' && { priority: priorityFilter }),
        ...(statusFilter !== 'All' && { status: statusFilter })
      });
      const response = await fetchWithSuperadminTokenRefresh(`${API_BASE_URL}/api/superadmin/support/tickets/?${params}`, {
        headers: { "Authorization": `Bearer ${localStorage.getItem("superadmin_token")}` }
      });
      const res = await response.json();
      setData(res.tickets || []);
      setTotal(res.total || 0);
    } catch (error) {

    } finally {
      setLoading(false);
    }
  }, [page, priorityFilter, statusFilter]);

  useEffect(() => { fetchData(); }, [fetchData]);

  useEffect(() => {
    const fetchDevs = async () => {
      try {
        const res = await fetchWithSuperadminTokenRefresh(`${API_BASE_URL}/api/superadmin/support/developers/`, {
          headers: { "Authorization": `Bearer ${localStorage.getItem("superadmin_token")}` }
        });
        const data = await res.json();
        if (data.developers) setDevelopers(data.developers);
      } catch (e) { }
    };
    fetchDevs();
  }, []);

  // Reset to page 1 when filters change
  useEffect(() => { setPage(1); }, [priorityFilter, statusFilter]);

  const handleUpdate = async () => {
    try {
      const res = await fetchWithSuperadminTokenRefresh(`${API_BASE_URL}/api/superadmin/support/tickets/${selectedTicket.internal_id}/`, {
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
      <Card className={`shadow-sm backdrop-blur-sm transition-all duration-300 border ${theme === 'dark' ? 'bg-card/40 border-border text-foreground' : 'bg-white border-gray-100 text-gray-900'}`}>
        <CardHeader className="pb-4 flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-border/50">
          <div className="w-full">
            <CardTitle className={`text-2xl font-semibold leading-none tracking-tight mb-2 ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>
              Support Panel
            </CardTitle>
            <p className={`text-sm ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}`}>
              Handle organization support requests.
            </p>
          </div>
        </CardHeader>
        <CardContent className="space-y-4 pt-4">
          {/* Filters */}
          <div className="flex flex-wrap gap-3 items-center pb-2">
            <div className="flex items-center gap-2">
              <Label className="text-sm font-medium whitespace-nowrap">Priority:</Label>
              <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                <SelectTrigger className="w-[140px] h-9">
                  <SelectValue placeholder="Priority" />
                </SelectTrigger>
                <SelectContent>
                  {['All', 'Critical', 'High', 'Medium', 'Low'].map((v) => (
                    <SelectItem key={v} value={v}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <Label className="text-sm font-medium whitespace-nowrap">Status:</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[140px] h-9">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  {['All', 'Open', 'Pending', 'Resolved', 'Closed'].map((v) => (
                    <SelectItem key={v} value={v}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="ml-auto text-sm text-muted-foreground">
              {total} ticket{total !== 1 ? 's' : ''} found
            </div>
          </div>

          <div className="rounded-md border overflow-hidden">
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow>
                  <TableHead>Ticket ID</TableHead>
                  <TableHead>Organization</TableHead>
                  <TableHead>Subject</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Assigned To</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ?
                  <TableRow><TableCell colSpan={8} className="h-24 text-center">Loading...</TableCell></TableRow> :
                  data.length === 0 ?
                    <TableRow><TableCell colSpan={8} className="h-24 text-center text-muted-foreground">No tickets found.</TableCell></TableRow> :
                    data.map((item) =>
                      <TableRow
                        key={item.id}
                        className="cursor-pointer hover:bg-muted/50 transition-colors"
                        onClick={() => {
                          setSelectedTicket(item);
                          setUpdateForm({
                            status: item.status,
                            response: item.response || '',
                            assigned_developer_id: item.assigned_developer?.id || '',
                            deadline: item.deadline ? item.deadline.slice(0, 16) : ''
                          });
                        }}>
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
                        <TableCell>
                          {item.assigned_developer ? (
                            <div className="flex items-center gap-2">
                              <div className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-medium">
                                {item.assigned_developer.name ? item.assigned_developer.name.charAt(0).toUpperCase() : 'U'}
                              </div>
                              <span className="text-sm font-medium">{item.assigned_developer.name || 'Unknown'}</span>
                            </div>
                          ) : (
                            <span className="text-sm text-muted-foreground italic">Unassigned</span>
                          )}
                        </TableCell>
                        <TableCell className="text-muted-foreground whitespace-nowrap">{item.date}</TableCell>
                        <TableCell>
                          <Button variant="outline" size="sm" className="gap-2" onClick={(e) => {
                            e.stopPropagation();
                            setSelectedTicket(item);
                            setUpdateForm({
                              status: item.status,
                              response: item.response || '',
                              assigned_developer_id: item.assigned_developer?.id || '',
                              deadline: item.deadline ? item.deadline.slice(0, 16) : ''
                            });
                          }}>
                            <Eye size={16} /> View
                          </Button>
                        </TableCell>
                      </TableRow>
                    )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          {totalPages > 1 &&
            <div className="flex items-center justify-between pt-4">
              <p className="text-sm text-muted-foreground">
                Page {page} of {totalPages}
              </p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>
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
                <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          }
        </CardContent>
      </Card>

      {/* Ticket Detail Dialog */}
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
            <DialogDescription className="sr-only">Support ticket details and resolution controls</DialogDescription>
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
                    <span>Opened: {selectedTicket?.date}</span>
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
                      <div className="text-sm font-bold flex items-center gap-2">
                        {selectedTicket?.org_details?.admin_name}
                        <Badge variant="secondary" className="text-[10px] px-1.5 py-0">Admin</Badge>
                      </div>
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
                      <div className="text-sm font-bold flex items-center gap-2">
                        {selectedTicket?.org_details?.tech_poc_name}
                        <Badge variant="secondary" className="text-[10px] px-1.5 py-0">Tech POC</Badge>
                      </div>
                      <div className="flex flex-col gap-1 mt-1 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1.5"><Mail size={12} /> {selectedTicket?.org_details?.tech_poc_email}</span>
                        <span className="flex items-center gap-1.5"><Phone size={12} /> {selectedTicket?.org_details?.tech_poc_mobile}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {selectedTicket?.transfer_history?.length > 0 && (
                <div>
                  <h4 className="font-semibold text-xs text-muted-foreground uppercase tracking-wide mb-2 mt-4">Transfer History</h4>
                  <div className="space-y-3">
                    {selectedTicket.transfer_history.map((log: any, idx: number) => (
                      <div key={idx} className="p-3 border rounded-lg bg-muted/10 text-sm">
                        <div className="flex justify-between items-start mb-1">
                          <span className="font-semibold">{log.from} &rarr; {log.to}</span>
                          <span className="text-xs text-muted-foreground">{new Date(log.date).toLocaleString()}</span>
                        </div>
                        {log.reason && <p className="text-muted-foreground text-xs italic mt-1">&quot;{log.reason}&quot;</p>}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Right Column: Resolution & Assignment */}
            <div className="space-y-5 bg-muted/20 p-5 rounded-xl border">
              <h4 className="font-semibold text-sm border-b pb-2">Resolution & Assignment</h4>

              <div>
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Update Status</Label>
                <Select value={updateForm.status} onValueChange={(val) => setUpdateForm({ ...updateForm, status: val })}>
                  <SelectTrigger className="w-full mt-1.5 h-10">
                    <SelectValue placeholder="Select Status" />
                  </SelectTrigger>
                  <SelectContent>
                    {['Open', 'Pending', 'Resolved', 'Closed'].map((s) => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Official HQ Response</Label>
                <Textarea
                  className="mt-1.5 resize-none focus:ring-2 focus:ring-primary/20 transition-all"
                  placeholder="Enter response to the organization..."
                  rows={4}
                  value={updateForm.response}
                  onChange={(e) => setUpdateForm({ ...updateForm, response: e.target.value })}
                />
              </div>

              <div>
                <div className="flex items-center justify-between mt-2">
                  <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Assign Developer</Label>
                  {selectedSkills.length > 0 && (
                    <Button variant="ghost" size="sm" className="h-6 text-xs text-primary/80 hover:text-primary" onClick={() => setSelectedSkills([])}>Clear Filters</Button>
                  )}
                </div>

                {allSkills.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2 mb-3">
                    {allSkills.map(skill => (
                      <Badge
                        key={skill}
                        variant={selectedSkills.includes(skill) ? "default" : "outline"}
                        className={`cursor-pointer transition-all ${selectedSkills.includes(skill) ? 'shadow-sm' : 'hover:border-primary/50'}`}
                        onClick={() => setSelectedSkills(prev =>
                          prev.includes(skill) ? prev.filter(s => s !== skill) : [...prev, skill]
                        )}
                      >
                        {skill}
                      </Badge>
                    ))}
                  </div>
                )}

                <Select
                  value={updateForm.assigned_developer_id ? String(updateForm.assigned_developer_id) : "unassigned"}
                  onValueChange={(val) => setUpdateForm({ ...updateForm, assigned_developer_id: val === "unassigned" ? "" : val })}
                >
                  <SelectTrigger className="w-full mt-1.5 h-10">
                    <SelectValue placeholder="Select Developer" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unassigned">Unassigned</SelectItem>
                    {filteredDevelopers.map(dev => (
                      <SelectItem key={dev.id} value={String(dev.id)}>
                        {dev.first_name} {dev.last_name} ({dev.developer_skills?.join(', ') || 'No skills'})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Deadline (Optional)</Label>
                <input
                  type="datetime-local"
                  className="w-full mt-1.5 flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm focus:ring-2 focus:ring-primary/20 transition-all"
                  value={updateForm.deadline}
                  onChange={(e) => setUpdateForm({ ...updateForm, deadline: e.target.value })}
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
    </div>);

};
export default Support;