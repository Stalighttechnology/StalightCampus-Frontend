import React, { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { useTheme } from "../../context/ThemeContext";
import { API_BASE_URL } from "@/utils/config";
import { useToast } from "@/components/ui/use-toast";
import {
  Megaphone, Loader2, CheckCircle2, Clock, Plus,
  Search, Send, Calendar as CalendarIcon, Inbox, Trash2, ShieldCheck
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";

interface Announcement {
  id: number;
  title: string;
  message: string;
  created_by_name: string;
  priority: "low" | "normal" | "high" | "urgent";
  created_at: string;
  expires_at: string | null;
  is_read?: boolean;
}

interface Developer {
  id: number;
  name: string;
  email: string;
  role?: string;
}

const DeveloperAnnouncements = () => {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const { toast } = useToast();

  const [activeTab, setActiveTab] = useState("received");
  const [myAnnouncements, setMyAnnouncements] = useState<Announcement[]>([]);
  const [receivedAnnouncements, setReceivedAnnouncements] = useState<Announcement[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);
  
  // Pagination
  const [myPage, setMyPage] = useState(1);
  const [myTotal, setMyTotal] = useState(0);
  const [receivedPage, setReceivedPage] = useState(1);
  const [receivedTotal, setReceivedTotal] = useState(0);
  const pageSize = 10;

  // Create Modal
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [priority, setPriority] = useState("normal");
  const [expiresAt, setExpiresAt] = useState<string>("");
  const [expiresOpen, setExpiresOpen] = useState(false);

  // Developer + Superadmin Selector
  const [people, setPeople] = useState<Developer[]>([]);
  const [peopleLoading, setPeopleLoading] = useState(false);
  const [devSearch, setDevSearch] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [selectAll, setSelectAll] = useState(false);
  const [sending, setSending] = useState(false);

  // Token helper — supports both superadmin and regular tokens
  const getToken = async (): Promise<string | null> => {
    let token = localStorage.getItem("superadmin_token");
    const refresh = localStorage.getItem("superadmin_refresh");
    if (!token && !refresh) {
      const fallback = sessionStorage.getItem("access_token");
      if (fallback) return fallback;
      return null;
    }
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split(".")[1]));
        if (Date.now() < payload.exp * 1000 - 30000) return token;
      } catch {}
    }
    if (!refresh) return null;
    try {
      const res = await fetch(`${API_BASE_URL}/api/superadmin/token/refresh/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refresh }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.access) {
          localStorage.setItem("superadmin_token", data.access);
          if (data.refresh) localStorage.setItem("superadmin_refresh", data.refresh);
          return data.access;
        }
      }
    } catch {}
    return null;
  };

  const fetchAnnouncements = useCallback(async () => {
    setLoading(true);
    try {
      const token = await getToken();
      if (!token) { setLoading(false); return; }

      const res = await fetch(
        `${API_BASE_URL}/api/announcements/?my_page=${myPage}&my_page_size=${pageSize}&received_page=${receivedPage}&received_page_size=${pageSize}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (!res.ok) throw new Error("Failed to load");
      const data = await res.json();

      const received = data.received_announcements || {};
      const my = data.my_announcements || {};

      setReceivedAnnouncements(received.results || []);
      setReceivedTotal(received.count || 0);
      const newUnread = received.unread_count || 0;
      setUnreadCount(newUnread);

      // Sync the header bell count in DeveloperDashboard with exact count
      window.dispatchEvent(new CustomEvent("set-announcement-unread", { detail: { count: newUnread } }));

      setMyAnnouncements(my.results || []);
      setMyTotal(my.count || 0);
    } catch {}
    finally { setLoading(false); }
  }, [myPage, receivedPage]);

  const fetchPeople = async () => {
    setPeopleLoading(true);
    try {
      const token = await getToken();
      if (!token) return;
      const res = await fetch(`${API_BASE_URL}/api/superadmin/developers/announcements/devs/`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setPeople(data.developers || []);
      }
    } catch {} finally {
      setPeopleLoading(false);
    }
  };

  useEffect(() => { fetchAnnouncements(); }, [fetchAnnouncements]);

  // Listen for WebSocket announcement events — auto-refresh instantly
  useEffect(() => {
    const handleWs = () => { fetchAnnouncements(); };
    window.addEventListener("refresh-announcements", handleWs);
    return () => window.removeEventListener("refresh-announcements", handleWs);
  }, [fetchAnnouncements]);

  // Mark Read
  const markRead = async (id: number) => {
    try {
      const token = await getToken();
      if (!token) return;
      await fetch(`${API_BASE_URL}/api/announcements/${id}/mark-read/`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      setReceivedAnnouncements((prev) =>
        prev.map((a) => (a.id === id ? { ...a, is_read: true } : a))
      );
      setUnreadCount((prev) => {
        const next = Math.max(0, prev - 1);
        window.dispatchEvent(new CustomEvent("set-announcement-unread", { detail: { count: next } }));
        return next;
      });
    } catch {}
  };

  // Delete (own announcements)
  const deleteAnnouncement = async (id: number) => {
    if (!confirm("Delete this announcement?")) return;
    try {
      const token = await getToken();
      if (!token) return;
      const res = await fetch(`${API_BASE_URL}/api/announcements/${id}/`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok || res.status === 204) {
        setMyAnnouncements((prev) => prev.filter((a) => a.id !== id));
        toast({ title: "Deleted", description: "Announcement removed." });
      } else {
        toast({ variant: "destructive", title: "Delete failed" });
      }
    } catch {
      toast({ variant: "destructive", title: "Network error" });
    }
  };

  // Send
  const handleSend = async () => {
    if (!title.trim() || !message.trim()) {
      toast({ variant: "destructive", title: "Missing fields", description: "Title and message are required." });
      return;
    }
    let devIds: number[] = [];
    if (!selectAll) {
      if (selectedIds.size === 0) {
        toast({ variant: "destructive", title: "No recipient", description: "Select at least one person." });
        return;
      }
      devIds = Array.from(selectedIds);
    }
    setSending(true);
    try {
      const token = await getToken();
      if (!token) { toast({ variant: "destructive", title: "Session expired" }); return; }
      const body: any = { title: title.trim(), message: message.trim(), priority, developer_ids: devIds };
      if (expiresAt) body.expires_at = new Date(expiresAt).toISOString();
      const res = await fetch(`${API_BASE_URL}/api/superadmin/developers/announcements/send/`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to send");
      toast({ title: "Sent!", description: data.message });
      setTitle(""); setMessage(""); setPriority("normal"); setExpiresAt("");
      setSelectedIds(new Set()); setSelectAll(false);
      setShowCreateDialog(false);
      fetchAnnouncements();
    } catch (err: any) {
      toast({ variant: "destructive", title: "Send failed", description: err.message });
    } finally { setSending(false); }
  };

  const handleToggleSelectAll = (checked: boolean) => {
    setSelectAll(!!checked);
    setSelectedIds(checked ? new Set(people.map(d => d.id)) : new Set());
  };

  const filteredPeople = people.filter(d =>
    d.name.toLowerCase().includes(devSearch.toLowerCase()) ||
    d.email.toLowerCase().includes(devSearch.toLowerCase())
  );

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleString("en-IN", {
      day: "2-digit", month: "short", year: "numeric",
      hour: "2-digit", minute: "2-digit", hour12: true,
    });

  const priorityStyle = (p: string) => {
    if (p === 'urgent') return 'border-red-500 text-red-500 bg-red-500/10';
    if (p === 'high') return 'border-orange-500 text-orange-500 bg-orange-500/10';
    if (p === 'low') return 'border-gray-400 text-gray-400 bg-gray-500/10';
    return 'border-blue-500 text-blue-500 bg-blue-500/10';
  };

  const renderAnnouncement = (ann: Announcement, isReceived: boolean) => (
    <motion.div
      key={ann.id}
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className={`p-4 rounded-xl border mb-3 flex flex-col gap-2 transition-shadow hover:shadow-md ${isDark ? "bg-[#131928] border-white/10" : "bg-white border-gray-100 shadow-sm"}`}
    >
      <div className="flex justify-between items-start gap-2">
        <div className="flex gap-2 items-center min-w-0">
          {isReceived && !ann.is_read && <div className="w-2 h-2 flex-shrink-0 bg-violet-500 rounded-full" />}
          <h3 className="font-semibold text-sm truncate">{ann.title}</h3>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className={`text-[10px] px-2 py-0.5 rounded-full border uppercase ${priorityStyle(ann.priority)}`}>{ann.priority}</span>
          {!isReceived && (
            <button
              onClick={() => deleteAnnouncement(ann.id)}
              className="text-red-400 hover:text-red-600 transition-colors p-1 rounded hover:bg-red-500/10"
              title="Delete announcement"
            >
              <Trash2 size={13} />
            </button>
          )}
        </div>
      </div>
      <p className={`text-xs whitespace-pre-wrap leading-relaxed ${isDark ? "text-gray-400" : "text-gray-500"}`}>{ann.message}</p>
      <div className="flex items-center gap-3 mt-1">
        <span className={`text-[11px] flex items-center gap-1 ${isDark ? "text-gray-500" : "text-gray-400"}`}>
          <Megaphone size={11} /> {isReceived ? ann.created_by_name : "You"}
        </span>
        <span className={`text-[11px] flex items-center gap-1 ${isDark ? "text-gray-500" : "text-gray-400"}`}>
          <Clock size={11} /> {formatDate(ann.created_at)}
        </span>
        {isReceived && !ann.is_read && (
          <button onClick={() => markRead(ann.id)} className="text-[11px] text-violet-500 hover:underline ml-auto flex items-center gap-1">
            <CheckCircle2 size={11} /> Mark Read
          </button>
        )}
      </div>
    </motion.div>
  );

  const totalMyPages = Math.max(1, Math.ceil(myTotal / pageSize));
  const totalReceivedPages = Math.max(1, Math.ceil(receivedTotal / pageSize));

  return (
    <div className={`p-4 sm:p-6 min-h-screen ${isDark ? 'bg-[#0B0F19]' : 'bg-gray-50'}`}>
      <Card className={`border-none shadow-sm ${isDark ? 'bg-transparent text-white' : 'bg-white text-gray-900'}`}>
        <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b pb-6">
          <div>
            <CardTitle className="text-2xl font-semibold">Developer Announcements</CardTitle>
            <p className={`text-sm mt-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Manage communications with your engineering team</p>
          </div>

          <Dialog open={showCreateDialog} onOpenChange={(open) => {
            setShowCreateDialog(open);
            if (open && people.length === 0) fetchPeople();
          }}>
            <DialogTrigger asChild>
              <Button className="gap-2 bg-violet-600 hover:bg-violet-700 text-white">
                <Plus size={16} /> New Announcement
              </Button>
            </DialogTrigger>
            <DialogContent className={`max-w-2xl max-h-[85vh] overflow-y-auto ${isDark ? 'bg-[#111827] text-white border-white/10' : 'bg-white'}`}>
              <DialogHeader>
                <DialogTitle>Send Announcement</DialogTitle>
                <DialogDescription>Target specific team members or broadcast to everyone.</DialogDescription>
              </DialogHeader>
              <div className="space-y-5 py-4">
                {/* Recipient Selector */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label>Target Recipients <span className="text-red-500">*</span></Label>
                    <div className="flex items-center space-x-2">
                      <Checkbox id="selectAll" checked={selectAll} onCheckedChange={handleToggleSelectAll} />
                      <label htmlFor="selectAll" className="text-sm font-medium cursor-pointer">Select All</label>
                    </div>
                  </div>
                  {!selectAll && (
                    <div className={`border rounded-lg p-3 ${isDark ? 'border-white/10' : 'border-gray-200'}`}>
                      <div className="relative mb-3">
                        <Search className={`absolute left-3 top-2.5 h-4 w-4 ${isDark ? 'text-gray-500' : 'text-gray-400'}`} />
                        <Input
                          placeholder="Search by name or email…"
                          className={`pl-9 ${isDark ? 'bg-white/5 border-white/10' : ''}`}
                          value={devSearch}
                          onChange={(e) => setDevSearch(e.target.value)}
                        />
                      </div>
                      <div className="max-h-48 overflow-y-auto space-y-1 pr-1 custom-scrollbar">
                        {peopleLoading ? (
                          <div className="py-4 text-center text-sm text-gray-500 flex items-center justify-center gap-2"><Loader2 size={14} className="animate-spin" /> Loading…</div>
                        ) : filteredPeople.length === 0 ? (
                          <div className="py-4 text-center text-sm text-gray-500">No recipients found.</div>
                        ) : (
                          filteredPeople.map(p => (
                            <div key={p.id} className="flex items-center space-x-3 p-2 rounded hover:bg-black/5 dark:hover:bg-white/5">
                              <Checkbox
                                id={`person-${p.id}`}
                                checked={selectedIds.has(p.id)}
                                onCheckedChange={(checked) => {
                                  const next = new Set(selectedIds);
                                  checked ? next.add(p.id) : next.delete(p.id);
                                  setSelectedIds(next);
                                }}
                              />
                              <label htmlFor={`person-${p.id}`} className="flex-1 cursor-pointer flex items-center gap-2">
                                <div>
                                  <div className="text-sm font-medium flex items-center gap-1">
                                    {p.name}
                                    {p.role === 'superadmin' && (
                                      <span className="inline-flex items-center gap-0.5 text-[9px] bg-violet-500/15 text-violet-500 border border-violet-500/30 rounded-full px-1.5 py-0.5 font-semibold">
                                        <ShieldCheck size={9} /> ADMIN
                                      </span>
                                    )}
                                  </div>
                                  <div className="text-xs text-gray-500">{p.email}</div>
                                </div>
                              </label>
                            </div>
                          ))
                        )}
                      </div>
                      <div className="mt-2 text-xs text-gray-500 text-right">{selectedIds.size} selected</div>
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <Label>Title <span className="text-red-500">*</span></Label>
                  <Input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={150} className={isDark ? 'bg-white/5 border-white/10' : ''} />
                </div>
                <div className="space-y-2">
                  <Label>Message <span className="text-red-500">*</span></Label>
                  <Textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={4} maxLength={1000} className={`resize-none ${isDark ? 'bg-white/5 border-white/10' : ''}`} />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Priority</Label>
                    <Select value={priority} onValueChange={setPriority}>
                      <SelectTrigger className={isDark ? 'bg-white/5 border-white/10' : ''}><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">Low</SelectItem>
                        <SelectItem value="normal">Normal</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                        <SelectItem value="urgent">Urgent</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Expires At (Optional)</Label>
                    <Popover open={expiresOpen} onOpenChange={setExpiresOpen}>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className={`w-full justify-start text-left font-normal ${isDark ? 'bg-white/5 border-white/10 text-white' : ''}`}>
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {expiresAt ? format(new Date(expiresAt), 'PPP') : "30 days (default)"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={expiresAt ? new Date(expiresAt) : undefined}
                          onSelect={(date) => { setExpiresAt(date ? format(date, 'yyyy-MM-dd') : ""); setExpiresOpen(false); }}
                          disabled={{ before: new Date() }}
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>

                <Button onClick={handleSend} disabled={sending} className="w-full bg-violet-600 hover:bg-violet-700 text-white">
                  {sending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
                  Send Announcement
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </CardHeader>

        <CardContent className="pt-6">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className={`grid w-full grid-cols-2 max-w-[400px] mb-6 ${isDark ? 'bg-[#131928]' : ''}`}>
              <TabsTrigger value="my">My Announcements</TabsTrigger>
              <TabsTrigger value="received" className="relative">
                Received
                {unreadCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] text-white font-bold">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </TabsTrigger>
            </TabsList>

            {loading ? (
              <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-violet-500" /></div>
            ) : (
              <>
                <TabsContent value="my" className="mt-0">
                  {myAnnouncements.length === 0 ? (
                    <div className="text-center py-16 text-gray-500"><Inbox className="w-12 h-12 mx-auto mb-4 opacity-20" /><p>No announcements sent yet.</p></div>
                  ) : (
                    <>
                      <div className="space-y-3">{myAnnouncements.map(a => renderAnnouncement(a, false))}</div>
                      {totalMyPages > 1 && (
                        <div className="flex items-center justify-center gap-3 mt-4">
                          <Button size="sm" variant="outline" disabled={myPage === 1} onClick={() => setMyPage(p => p - 1)}>Prev</Button>
                          <span className="text-xs text-muted-foreground">Page {myPage} / {totalMyPages}</span>
                          <Button size="sm" variant="outline" disabled={myPage === totalMyPages} onClick={() => setMyPage(p => p + 1)}>Next</Button>
                        </div>
                      )}
                    </>
                  )}
                </TabsContent>

                <TabsContent value="received" className="mt-0">
                  {receivedAnnouncements.length === 0 ? (
                    <div className="text-center py-16 text-gray-500"><Inbox className="w-12 h-12 mx-auto mb-4 opacity-20" /><p>No received announcements.</p></div>
                  ) : (
                    <>
                      <div className="space-y-3">{receivedAnnouncements.map(a => renderAnnouncement(a, true))}</div>
                      {totalReceivedPages > 1 && (
                        <div className="flex items-center justify-center gap-3 mt-4">
                          <Button size="sm" variant="outline" disabled={receivedPage === 1} onClick={() => setReceivedPage(p => p - 1)}>Prev</Button>
                          <span className="text-xs text-muted-foreground">Page {receivedPage} / {totalReceivedPages}</span>
                          <Button size="sm" variant="outline" disabled={receivedPage === totalReceivedPages} onClick={() => setReceivedPage(p => p + 1)}>Next</Button>
                        </div>
                      )}
                    </>
                  )}
                </TabsContent>
              </>
            )}
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default DeveloperAnnouncements;
