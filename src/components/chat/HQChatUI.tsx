import React, { useState, useEffect, useRef, useCallback } from "react";
import { useTheme } from "@/context/ThemeContext";
import {
  Send, Paperclip, Mic, Trash2, Users, User, StopCircle, Plus, X,
  Search, Check, Loader2, Image as ImageIcon, FileText as FileIcon,
  Info, UserPlus, UserMinus, Crown, LogOut
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { format, isToday, isYesterday } from "date-fns";
import {
  fetchHQChatGroups, fetchHQChatMessages, createHQChatGroup,
  sendHQChatMessage, deleteHQChatMessage,
  fetchGroupInfo, addGroupMember, removeGroupMember,
  leaveGroup, deleteGroup,
  HQChatGroup, HQChatMessage, HQGroupInfo, HQGroupMember
} from "@/utils/hq_chat_api";
import { useHQChatSocket } from "@/hooks/useHQChatSocket";
import { API_BASE_URL, getSuperAdminToken, getAuthToken } from "@/utils/config";

// ─── Helpers ────────────────────────────────────────────────────────────────

const getCurrentUserId = (): number | null => {
  let token = getSuperAdminToken();
  if (!token) token = getAuthToken();
  if (!token) return null;
  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    return payload.user_id ? parseInt(payload.user_id, 10) : null;
  } catch { return null; }
};

const getToken = (): string | null => getSuperAdminToken() ?? getAuthToken();

const formatTime = (iso: string) => {
  const d = new Date(iso);
  if (isToday(d)) return format(d, "HH:mm");
  if (isYesterday(d)) return "Yesterday";
  return format(d, "dd MMM");
};

const initials = (name: string) =>
  (name || '?').split(" ").filter(Boolean).map(n => n[0]).join("").toUpperCase().slice(0, 2) || "?";

// ─── Notification sound using Web Audio API (no external file needed) ───────
const playNotificationSound = () => {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    if (ctx.state === 'suspended') ctx.resume();

    const masterGain = ctx.createGain();
    masterGain.gain.setValueAtTime(0.18, ctx.currentTime);
    masterGain.connect(ctx.destination);

    // Teams-style: two clean sine-wave notes with soft attack + long tail
    const playNote = (freq: number, startTime: number, duration: number, vol: number) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, startTime);
      gain.gain.setValueAtTime(0, startTime);
      gain.gain.linearRampToValueAtTime(vol, startTime + 0.015); // fast soft attack
      gain.gain.setValueAtTime(vol, startTime + duration * 0.25);
      gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration); // smooth tail
      osc.connect(gain);
      gain.connect(masterGain);
      osc.start(startTime);
      osc.stop(startTime + duration + 0.05);
    };

    const t = ctx.currentTime;
    playNote(1046.50, t,        0.45, 1.0); // C6 — first note
    playNote(1318.51, t + 0.13, 0.55, 0.9); // E6 — second note (a major third up)

    setTimeout(() => ctx.close(), 1200);
  } catch { /* AudioContext not supported */ }
};

// ─── Browser notification ────────────────────────────────────────────────────
const showBrowserNotification = (title: string, body: string) => {
  if ('Notification' in window && Notification.permission === 'granted') {
    new Notification(title, { body, icon: '/favicon.ico' });
  }
};

const requestNotificationPermission = () => {
  if ('Notification' in window && Notification.permission === 'default') {
    Notification.requestPermission();
  }
};

// ─── Group Info Dialog ───────────────────────────────────────────────────────
interface Person { id: number; name: string; email: string; role?: string; }

const GroupInfoDialog = ({
  group,
  currentUserId,
  onMembersChanged,
}: {
  group: HQChatGroup;
  currentUserId: number | null;
  onMembersChanged: () => void;
}) => {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [info, setInfo] = useState<HQGroupInfo | null>(null);
  const [allPeople, setAllPeople] = useState<Person[]>([]);
  const [search, setSearch] = useState("");
  const [addSearch, setAddSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState<"members" | "add">("members");

  const load = async () => {
    setLoading(true);
    try {
      const [infoData, res] = await Promise.all([
        fetchGroupInfo(group.id),
        fetch(`${API_BASE_URL}/api/superadmin/developers/announcements/devs/`, {
          headers: { Authorization: `Bearer ${getToken()}` }
        })
      ]);
      setInfo(infoData);
      if (res.ok) {
        const d = await res.json();
        setAllPeople(d.developers || []);
      }
    } catch { } finally { setLoading(false); }
  };

  useEffect(() => { if (open) load(); }, [open, group.id]);

  const currentMemberIds = new Set(info?.members.map(m => m.id) ?? []);
  const availableToAdd = allPeople.filter(p =>
    !currentMemberIds.has(p.id) &&
    (p.name.toLowerCase().includes(addSearch.toLowerCase()) ||
      p.email.toLowerCase().includes(addSearch.toLowerCase()))
  );
  const filteredMembers = (info?.members ?? []).filter(m =>
    m.name.toLowerCase().includes(search.toLowerCase())
  );

  const handleRemove = async (userId: number) => {
    try {
      await removeGroupMember(group.id, userId);
      toast({ title: "Member removed" });
      load();
      onMembersChanged();
    } catch {
      toast({ title: "Failed to remove", variant: "destructive" });
    }
  };

  const handleAdd = async (userId: number) => {
    try {
      await addGroupMember(group.id, userId);
      toast({ title: "Member added!" });
      load();
      onMembersChanged();
    } catch {
      toast({ title: "Failed to add", variant: "destructive" });
    }
  };

  if (!group.is_group) return null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full text-gray-400 hover:text-blue-500" title="Group info">
          <Info size={18} />
        </Button>
      </DialogTrigger>
      <DialogContent className={`max-w-md ${isDark ? "bg-gray-900 border-gray-700 text-gray-100" : ""}`}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users size={18} className="text-blue-500" />
            {group.name}
          </DialogTitle>
        </DialogHeader>

        {/* Tabs */}
        <div className="flex gap-2">
          <Button variant={tab === "members" ? "default" : "outline"} size="sm" onClick={() => setTab("members")} className="flex-1">
            <Users size={14} className="mr-1" /> Members ({info?.members.length ?? 0})
          </Button>
          <Button variant={tab === "add" ? "default" : "outline"} size="sm" onClick={() => setTab("add")} className="flex-1">
            <UserPlus size={14} className="mr-1" /> Add Members
          </Button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-40">
            <Loader2 size={24} className="animate-spin text-gray-400" />
          </div>
        ) : tab === "members" ? (
          <>
            <div className="relative">
              <Search size={13} className="absolute left-3 top-2.5 text-gray-400" />
              <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search members..." className="pl-8 h-8 text-sm" />
            </div>
            <ScrollArea className={`h-60 rounded-lg border ${isDark ? "border-gray-700" : ""}`}>
              {filteredMembers.length === 0 ? (
                <div className="p-4 text-center text-sm text-gray-400">No members found</div>
              ) : filteredMembers.map(m => (
                <div key={m.id} className={`flex items-center gap-3 p-3 border-b last:border-b-0 ${isDark ? "border-gray-800" : "border-gray-100"}`}>
                  <Avatar className="h-8 w-8 shrink-0">
                    <AvatarFallback className={`text-xs ${isDark ? "bg-gray-700" : "bg-blue-100 text-blue-700"}`}>
                      {initials(m.name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1">
                      <span className="text-sm font-medium truncate">{m.name}</span>
                      {info?.created_by === m.id && <Crown size={12} className="text-yellow-500 shrink-0" title="Creator" />}
                    </div>
                    <span className="text-xs text-gray-400 truncate">{m.email}</span>
                  </div>
                  {m.role && <Badge variant="outline" className="text-xs capitalize shrink-0">{m.role}</Badge>}
                  {m.id !== currentUserId && (
                    <button
                      onClick={() => handleRemove(m.id)}
                      className="p-1.5 rounded-full text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors shrink-0"
                      title="Remove from group"
                    >
                      <UserMinus size={14} />
                    </button>
                  )}
                </div>
              ))}
            </ScrollArea>
          </>
        ) : (
          <>
            <div className="relative">
              <Search size={13} className="absolute left-3 top-2.5 text-gray-400" />
              <Input value={addSearch} onChange={e => setAddSearch(e.target.value)} placeholder="Search to add..." className="pl-8 h-8 text-sm" />
            </div>
            <ScrollArea className={`h-60 rounded-lg border ${isDark ? "border-gray-700" : ""}`}>
              {availableToAdd.length === 0 ? (
                <div className="p-4 text-center text-sm text-gray-400">No more members to add</div>
              ) : availableToAdd.map(p => (
                <div key={p.id} className={`flex items-center gap-3 p-3 border-b last:border-b-0 ${isDark ? "border-gray-800" : "border-gray-100"}`}>
                  <Avatar className="h-8 w-8 shrink-0">
                    <AvatarFallback className={`text-xs ${isDark ? "bg-gray-700" : "bg-green-100 text-green-700"}`}>
                      {initials(p.name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{p.name}</div>
                    <div className="text-xs text-gray-400 truncate">{p.email}</div>
                  </div>
                  <button
                    onClick={() => handleAdd(p.id)}
                    className="p-1.5 rounded-full text-green-500 hover:bg-green-50 dark:hover:bg-green-900/20 transition-colors shrink-0"
                    title="Add to group"
                  >
                    <UserPlus size={14} />
                  </button>
                </div>
              ))}
            </ScrollArea>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};

// ─── New Chat Dialog ─────────────────────────────────────────────────────────

const NewChatDialog = ({
  onCreated,
}: { onCreated: (group: HQChatGroup) => void }) => {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [isGroup, setIsGroup] = useState(false);
  const [groupName, setGroupName] = useState("");
  const [people, setPeople] = useState<Person[]>([]);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);

  const fetchPeople = async () => {
    setLoading(true);
    try {
      const token = getToken();
      const res = await fetch(`${API_BASE_URL}/api/superadmin/developers/announcements/devs/`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setPeople(data.developers || []);
      }
    } catch { } finally { setLoading(false); }
  };

  useEffect(() => { if (open) { fetchPeople(); setSelected(new Set()); setSearch(""); setGroupName(""); } }, [open]);

  const filtered = people.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.email.toLowerCase().includes(search.toLowerCase())
  );

  const toggle = (id: number) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const handleCreate = async () => {
    if (selected.size === 0) return;
    if (isGroup && !groupName.trim()) { toast({ title: "Enter a group name", variant: "destructive" }); return; }
    setCreating(true);
    try {
      const data = await createHQChatGroup(groupName, Array.from(selected), isGroup);
      setOpen(false);
      const displayName = data.display_name || groupName;
      onCreated({ id: data.id, name: displayName, is_group: isGroup, last_message: "", last_message_time: new Date().toISOString(), unread: 0 });
      toast({ title: isGroup ? "Group created!" : "Chat started!" });
    } catch {
      toast({ title: "Failed to create chat", variant: "destructive" });
    } finally { setCreating(false); }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="icon" variant="ghost" className="rounded-full hover:bg-blue-100 dark:hover:bg-blue-900/30 text-blue-600">
          <Plus size={20} />
        </Button>
      </DialogTrigger>
      <DialogContent className={`max-w-md ${isDark ? "bg-gray-900 border-gray-700 text-gray-100" : ""}`}>
        <DialogHeader>
          <DialogTitle>New Chat</DialogTitle>
        </DialogHeader>

        <div className="flex gap-2">
          <Button variant={isGroup ? "outline" : "default"} size="sm" onClick={() => setIsGroup(false)} className="flex-1">
            <User size={14} className="mr-1" /> Direct Message
          </Button>
          <Button variant={isGroup ? "default" : "outline"} size="sm" onClick={() => setIsGroup(true)} className="flex-1">
            <Users size={14} className="mr-1" /> Group Chat
          </Button>
        </div>

        {isGroup && (
          <div>
            <Label>Group Name</Label>
            <Input value={groupName} onChange={e => setGroupName(e.target.value)} placeholder="e.g. Dev Ops Team" className="mt-1" />
          </div>
        )}

        <div className="relative">
          <Search size={14} className="absolute left-3 top-3 text-gray-400" />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search members..." className="pl-8" />
        </div>

        <ScrollArea className={`h-52 rounded-lg border ${isDark ? "border-gray-700" : ""}`}>
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="animate-spin text-gray-400" size={20} />
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-4 text-center text-sm text-gray-400">No members found</div>
          ) : (
            filtered.map(p => (
              <div
                key={p.id}
                onClick={() => toggle(p.id)}
                className={`flex items-center gap-3 p-3 cursor-pointer transition-colors border-b last:border-b-0
                  ${isDark ? "border-gray-800 hover:bg-gray-800" : "hover:bg-gray-50"}
                  ${selected.has(p.id) ? (isDark ? "bg-blue-900/20" : "bg-blue-50") : ""}`}
              >
                <Avatar className="h-8 w-8">
                  <AvatarFallback className={`text-xs ${isDark ? "bg-gray-700" : "bg-blue-100 text-blue-700"}`}>
                    {initials(p.name)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{p.name}</div>
                  <div className="text-xs text-gray-400 truncate">{p.email}</div>
                </div>
                {p.role && <Badge variant="outline" className="text-xs capitalize">{p.role}</Badge>}
                {selected.has(p.id) && <Check size={16} className="text-blue-500 shrink-0" />}
              </div>
            ))
          )}
        </ScrollArea>

        {selected.size > 0 && <p className="text-xs text-gray-400">{selected.size} member(s) selected</p>}

        <Button onClick={handleCreate} disabled={creating || selected.size === 0} className="w-full">
          {creating ? <Loader2 size={16} className="animate-spin mr-2" /> : null}
          {isGroup ? "Create Group" : "Start Chat"}
        </Button>
      </DialogContent>
    </Dialog>
  );
};

// ─── Main HQChatUI ──────────────────────────────────────────────────────────

export const HQChatUI = () => {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const { toast } = useToast();
  const currentUserId = Number(getCurrentUserId());

  const [groups, setGroups] = useState<HQChatGroup[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<HQChatGroup | null>(null);
  const [messages, setMessages] = useState<HQChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [search, setSearch] = useState("");
  const [unreadMap, setUnreadMap] = useState<Record<number, number>>({});

  const [text, setText] = useState("");
  const [attachment, setAttachment] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const selectedGroupRef = useRef<HQChatGroup | null>(null);

  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunks = useRef<Blob[]>([]);

  const [typingUser, setTypingUser] = useState<number | null>(null);
  const typingTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Keep ref in sync with state (for callbacks that capture stale closures)
  useEffect(() => { selectedGroupRef.current = selectedGroup; }, [selectedGroup]);

  // Request notification permission on mount
  useEffect(() => { requestNotificationPermission(); }, []);

  const onMessageReceived = useCallback((msg: HQChatMessage) => {
    const activeGroup = selectedGroupRef.current;

    setMessages(prev => {
      if (activeGroup?.id === (msg as any).group_id) {
        if (prev.find(m => m.id === msg.id)) return prev;
        return [...prev, msg];
      }
      return prev;
    });

    setGroups(prev =>
      prev.map(g => g.id === (msg as any).group_id
        ? { ...g, last_message: msg.content || "Attachment", last_message_time: msg.created_at }
        : g
      ).sort((a, b) => new Date(b.last_message_time).getTime() - new Date(a.last_message_time).getTime())
    );

    // Sound + notification + unread dot for messages NOT in the active group
    if (msg.sender_id !== currentUserId && activeGroup?.id !== (msg as any).group_id) {
      playNotificationSound();
      showBrowserNotification(
        msg.sender_name,
        msg.content ? (msg.content.length > 80 ? msg.content.slice(0, 80) + '…' : msg.content) : '📎 Attachment'
      );
      setUnreadMap(prev => ({
        ...prev,
        [(msg as any).group_id]: (prev[(msg as any).group_id] ?? 0) + 1
      }));
    }
  }, [currentUserId]);

  const onMessageDeleted = useCallback((msgId: number) => {
    setMessages(prev => prev.map(m => m.id === msgId ? { ...m, is_deleted: true } : m));
  }, []);

  const onGroupCreated = useCallback((group: HQChatGroup) => {
    setGroups(prev => [group, ...prev.filter(g => g.id !== group.id)]);
  }, []);

  const onUserTyping = useCallback((userId: number, groupId: number) => {
    if (selectedGroupRef.current?.id === groupId && userId !== currentUserId) {
      setTypingUser(userId);
      if (typingTimeout.current) clearTimeout(typingTimeout.current);
      typingTimeout.current = setTimeout(() => setTypingUser(null), 2500);
    }
  }, [currentUserId]);

  const { isConnected, sendTypingIndicator } = useHQChatSocket({
    onMessageReceived, onMessageDeleted, onGroupCreated, onUserTyping
  });

  useEffect(() => { loadGroups(); }, []);

  useEffect(() => {
    if (selectedGroup) {
      loadMessages(selectedGroup.id);
      // Clear unread for this group
      setUnreadMap(prev => ({ ...prev, [selectedGroup.id]: 0 }));
    }
  }, [selectedGroup?.id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const loadGroups = async () => {
    setLoading(true);
    try { setGroups(await fetchHQChatGroups()); }
    catch { toast({ title: "Error", description: "Failed to load chats", variant: "destructive" }); }
    finally { setLoading(false); }
  };

  const loadMessages = async (groupId: number) => {
    try { setMessages(await fetchHQChatMessages(groupId)); }
    catch { toast({ title: "Error", description: "Failed to load messages", variant: "destructive" }); }
  };

  const handleSend = async () => {
    if (!selectedGroup || (!text.trim() && !attachment)) return;
    setSending(true);
    try {
      let fileType: string | undefined;
      if (attachment) {
        if (attachment.type.startsWith("image/")) fileType = "image";
        else if (attachment.type.startsWith("audio/")) fileType = "audio";
        else fileType = "document";
      }
      await sendHQChatMessage(selectedGroup.id, text, attachment ?? undefined, fileType);
      setText("");
      setAttachment(null);
    } catch {
      toast({ title: "Error", description: "Failed to send message", variant: "destructive" });
    } finally { setSending(false); }
  };

  const handleDelete = async (msgId: number) => {
    try { await deleteHQChatMessage(msgId); }
    catch { toast({ title: "Error", description: "Failed to delete", variant: "destructive" }); }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  const handleTypingChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setText(e.target.value);
    if (selectedGroup) sendTypingIndicator(selectedGroup.id);
  };

  const handleLeaveOrDelete = async (action: "leave" | "delete") => {
    if (!selectedGroup) return;
    try {
      if (action === "leave") await leaveGroup(selectedGroup.id);
      else await deleteGroup(selectedGroup.id);
      
      toast({ title: action === "leave" ? "Left chat" : "Chat deleted" });
      setSelectedGroup(null);
      loadGroups();
    } catch {
      toast({ title: "Failed to " + action, variant: "destructive" });
    }
  };

  // Total unread count across all groups (for sidebar badge — dispatched via event)
  const totalUnread = Object.values(unreadMap).reduce((a, b) => a + b, 0);
  useEffect(() => {
    window.dispatchEvent(new CustomEvent("hq-chat-unread", { detail: { count: totalUnread } }));
  }, [totalUnread]);

  const filteredGroups = groups.filter(g =>
    g.name.toLowerCase().includes(search.toLowerCase())
  );

  const base = isDark ? "bg-gray-900 border-gray-800 text-gray-100" : "bg-white border-gray-200 text-gray-900";

  return (
    <div className={`flex h-full border rounded-2xl overflow-hidden shadow-xl ${base}`}>

      {/* ── Sidebar ─────────────────────────────────────────────────── */}
      <div className={`w-80 flex-shrink-0 flex flex-col border-r ${isDark ? "border-gray-800 bg-gray-950" : "border-gray-100 bg-gray-50"}`}>
        <div className="p-4 border-b flex items-center justify-between" style={{ borderColor: isDark ? "#1f2937" : "#e5e7eb" }}>
          <div>
            <h2 className="font-bold text-base">HQ Chat</h2>
            <div className="flex items-center gap-1 mt-0.5">
              <span className={`inline-block w-2 h-2 rounded-full ${isConnected ? "bg-green-500" : "bg-gray-400"}`} />
              <span className="text-xs text-gray-400">{isConnected ? "Connected" : "Connecting..."}</span>
            </div>
          </div>
          <NewChatDialog onCreated={(group) => {
            setGroups(prev => [group, ...prev.filter(g => g.id !== group.id)]);
            setSelectedGroup(group);
            loadGroups();
          }} />
        </div>

        <div className="px-3 py-2">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-2.5 text-gray-400" />
            <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search chats..." className={`pl-8 h-8 text-sm ${isDark ? "bg-gray-800 border-gray-700" : "bg-white"}`} />
          </div>
        </div>

        <ScrollArea className="flex-1">
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <Loader2 size={24} className="animate-spin text-gray-400" />
            </div>
          ) : filteredGroups.length === 0 ? (
            <div className="p-6 text-center">
              <Users size={32} className="mx-auto text-gray-300 mb-2" />
              <p className="text-sm text-gray-400">No chats yet</p>
              <p className="text-xs text-gray-400 mt-1">Click + to start a new chat</p>
            </div>
          ) : (
            filteredGroups.map(group => {
              const unread = unreadMap[group.id] ?? 0;
              return (
                <button
                  key={group.id}
                  onClick={() => setSelectedGroup(group)}
                  className={`w-full text-left px-4 py-3 border-b transition-all
                    ${isDark ? "border-gray-800/60 hover:bg-gray-800/50" : "border-gray-100 hover:bg-gray-100/80"}
                    ${selectedGroup?.id === group.id
                      ? isDark ? "bg-blue-900/20 border-l-2 border-l-blue-500" : "bg-blue-50 border-l-2 border-l-blue-500"
                      : ""}`}
                >
                  <div className="flex items-center gap-3">
                    <div className="relative shrink-0">
                      <Avatar className="h-10 w-10">
                        <AvatarFallback className={`text-sm font-semibold ${isDark ? "bg-gray-700" : "bg-gradient-to-br from-blue-100 to-indigo-100 text-blue-700"}`}>
                          {group.is_group ? <Users size={16} /> : initials(group.name)}
                        </AvatarFallback>
                      </Avatar>
                      {unread > 0 && (
                        <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-blue-600 text-[9px] text-white font-bold ring-2 ring-white dark:ring-gray-950">
                          {unread > 9 ? '9+' : unread}
                        </span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className={`text-sm truncate ${unread > 0 ? "font-bold" : "font-medium"}`}>{group.name || "—"}</span>
                        <span className="text-[10px] text-gray-400 shrink-0 ml-2">{formatTime(group.last_message_time)}</span>
                      </div>
                      <p className={`text-xs truncate mt-0.5 ${unread > 0 ? "font-semibold text-gray-700 dark:text-gray-200" : "text-gray-400"}`}>
                        {group.last_message || "Start chatting…"}
                      </p>
                    </div>
                  </div>
                </button>
              );
            })
          )}
        </ScrollArea>
      </div>

      {/* ── Chat Window ──────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0">
        {selectedGroup ? (
          <>
            <div className={`h-16 px-5 flex items-center gap-3 border-b shrink-0 ${isDark ? "border-gray-800 bg-gray-900" : "border-gray-100 bg-white"}`}>
              <Avatar className="h-9 w-9">
                <AvatarFallback className={`font-semibold ${isDark ? "bg-gray-700" : "bg-gradient-to-br from-blue-100 to-indigo-100 text-blue-700"}`}>
                  {selectedGroup.is_group ? <Users size={16} /> : initials(selectedGroup.name)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-sm truncate">{selectedGroup.name || "—"}</h3>
                <p className="text-xs text-gray-400">{selectedGroup.is_group ? "Group Chat" : "Direct message"}</p>
              </div>
              
              <div className="flex items-center gap-1">
                {/* Group info button */}
                {selectedGroup.is_group && (
                  <>
                    <Button variant="ghost" size="icon" onClick={() => handleLeaveOrDelete("leave")} className="h-8 w-8 rounded-full text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20" title="Leave group">
                      <LogOut size={16} />
                    </Button>
                    <GroupInfoDialog
                      group={selectedGroup}
                      currentUserId={currentUserId}
                      onMembersChanged={loadGroups}
                    />
                  </>
                )}
                <Button variant="ghost" size="icon" onClick={() => { if(confirm("Are you sure you want to delete this chat?")) handleLeaveOrDelete("delete") }} className="h-8 w-8 rounded-full text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20" title="Delete chat">
                  <Trash2 size={16} />
                </Button>
              </div>
            </div>

            <div className={`flex-1 overflow-y-auto px-5 py-4 space-y-4 ${isDark ? "bg-[#0d1117]" : "bg-gray-50"}`}>
              {messages.length === 0 && (
                <div className="flex flex-col items-center justify-center h-full opacity-50">
                  <Send size={32} className="mb-2 text-gray-400" />
                  <p className="text-sm text-gray-400">No messages yet. Say hello!</p>
                </div>
              )}
              {messages.map(msg => {
                const isMine = msg.sender_id === currentUserId;
                return (
                  <div key={msg.id} className={`flex flex-col ${isMine ? "items-end" : "items-start"}`}>
                    {!isMine && selectedGroup.is_group && (
                      <span className="text-[11px] text-gray-400 ml-3 mb-1">{msg.sender_name}</span>
                    )}
                    <div className="relative group max-w-[70%]">
                      {msg.is_deleted ? (
                        <div className={`px-4 py-2 rounded-2xl text-sm italic opacity-50 border ${isDark ? "border-gray-700 bg-gray-800 text-gray-400" : "border-gray-200 bg-gray-100 text-gray-400"}`}>
                          🚫 Message deleted
                        </div>
                      ) : (
                        <>
                          <div className={`px-4 py-2.5 rounded-2xl shadow-sm ${isMine
                            ? "bg-blue-600 text-white rounded-br-md"
                            : isDark
                              ? "bg-gray-800 text-gray-100 border border-gray-700 rounded-bl-md"
                              : "bg-white text-gray-800 border border-gray-200 rounded-bl-md"
                            }`}>
                            {msg.content && <p className="text-sm whitespace-pre-wrap break-words">{msg.content}</p>}
                            {msg.attachments?.map(att => (
                              <div key={att.id} className="mt-2">
                                {att.file_type === "image" ? (
                                  <img src={att.url} alt="attachment" className="rounded-lg max-h-56 object-cover cursor-pointer" onClick={() => window.open(att.url, "_blank")} />
                                ) : att.file_type === "audio" ? (
                                  <div className={`flex items-center gap-2 px-2 py-1 rounded-lg ${isMine ? "bg-blue-500" : isDark ? "bg-gray-700" : "bg-gray-100"}`}>
                                    <Mic size={14} className={isMine ? "text-white" : "text-blue-500"} />
                                    <audio src={att.url} controls preload="metadata" className="h-8 max-w-[200px]" />
                                  </div>
                                ) : (
                                  <a href={att.url} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-sm underline hover:opacity-80">
                                    <FileIcon size={14} /> View Document
                                  </a>
                                )}
                              </div>
                            ))}
                            <div className={`text-[10px] mt-1.5 text-right ${isMine ? "text-blue-200" : "text-gray-400"}`}>
                              {format(new Date(msg.created_at), "HH:mm")}
                            </div>
                          </div>
                          {isMine && (
                            <button
                              onClick={() => handleDelete(msg.id)}
                              title="Delete message"
                              className="absolute -left-10 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity p-2 rounded-full bg-red-100 hover:bg-red-200 text-red-600 shadow-sm"
                            >
                              <Trash2 size={14} />
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
              {typingUser && (
                <div className="flex items-start">
                  <div className={`px-4 py-2 rounded-2xl rounded-bl-md text-xs italic text-gray-400 ${isDark ? "bg-gray-800" : "bg-white border border-gray-200"}`}>
                    typing…
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            <div className={`px-4 py-3 border-t shrink-0 ${isDark ? "border-gray-800 bg-gray-900" : "bg-white border-gray-100"}`}>
              {attachment && (
                <div className={`flex items-center gap-2 mb-2 px-3 py-1.5 rounded-lg text-sm ${isDark ? "bg-gray-800" : "bg-gray-100"}`}>
                  {attachment.type.startsWith("image/") ? <ImageIcon size={14} className="text-blue-500" /> : <FileIcon size={14} className="text-blue-500" />}
                  <span className="truncate flex-1">{attachment.name}</span>
                  <button onClick={() => setAttachment(null)} className="text-gray-400 hover:text-red-500 transition-colors"><X size={14} /></button>
                </div>
              )}
              <div className="flex items-center gap-2">
                <input type="file" ref={fileInputRef} className="hidden" accept="image/*,application/pdf,.doc,.docx" onChange={e => setAttachment(e.target.files?.[0] ?? null)} />
                <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full text-gray-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 shrink-0"
                  onClick={() => fileInputRef.current?.click()}>
                  <Paperclip size={18} />
                </Button>
                <Input
                  value={text}
                  onChange={handleTypingChange}
                  onKeyDown={handleKeyDown}
                  placeholder="Type a message…"
                  className={`flex-1 rounded-full h-9 text-sm ${isDark ? "bg-gray-800 border-gray-700 focus-visible:ring-blue-500" : "bg-gray-50 border-gray-200 focus-visible:ring-blue-500"}`}
                />
                <Button onClick={handleSend} disabled={sending || (!text.trim() && !attachment)} size="icon" className="h-9 w-9 rounded-full bg-blue-600 hover:bg-blue-700 shadow-md shrink-0">
                  {sending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} className="ml-0.5" />}
                </Button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center gap-4 select-none">
            <div className={`w-24 h-24 rounded-3xl flex items-center justify-center shadow-inner ${isDark ? "bg-gray-800" : "bg-gradient-to-br from-blue-50 to-indigo-100"}`}>
              <Users size={44} className={isDark ? "text-gray-600" : "text-blue-300"} />
            </div>
            <div className="text-center">
              <h3 className={`text-xl font-semibold ${isDark ? "text-gray-300" : "text-gray-600"}`}>Select a chat</h3>
              <p className={`text-sm mt-1 ${isDark ? "text-gray-500" : "text-gray-400"}`}>Pick a conversation or start a new one with the + button.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
