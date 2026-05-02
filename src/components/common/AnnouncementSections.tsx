import { useState } from "react";
import { format } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Edit2, Trash2, Eye, Clock, User, AlertCircle, MoreVertical, CheckCircle2, XCircle } from "lucide-react";
import { useTheme } from "@/context/ThemeContext";
import { Announcement } from "@/utils/announcements_api";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface AnnouncementSectionsProps {
  myAnnouncements: Announcement[];
  receivedAnnouncements: Announcement[];
  onEdit: (announcement: Announcement) => void;
  onDelete: (announcementId: number) => void;
  onToggleActive: (announcementId: number) => void;
  onMarkRead: (announcementId: number) => void;
  loading?: boolean;
  showActions?: boolean; // Whether to show edit/delete buttons
}

const getPriorityColor = (priority: string) => {
  switch (priority) {
    case "urgent":
      return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100";
    case "high":
      return "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-100";
    case "normal":
      return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100";
    case "low":
      return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100";
    default:
      return "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-100";
  }
};

const getPriorityIcon = (priority: string) => {
  switch (priority) {
    case "urgent":
      return "🔴";
    case "high":
      return "🟠";
    case "normal":
      return "🔵";
    case "low":
      return "🟢";
    default:
      return "⚪";
  }
};

const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  return date.toLocaleDateString("en-IN", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const isExpired = (expiresAt: string) => {
  return new Date(expiresAt) < new Date();
};

const isRecent = (dateString: string) => {
  const createdDate = new Date(dateString);
  const now = new Date();
  const diffInHours = (now.getTime() - createdDate.getTime()) / (1000 * 60 * 60);
  return diffInHours < 48; // New if less than 48 hours old
};



export const AnnouncementSections = ({
  myAnnouncements,
  receivedAnnouncements,
  onEdit,
  onDelete,
  onToggleActive,
  onMarkRead,
  loading = false,
  showActions = true,
}: AnnouncementSectionsProps) => {
  const { theme } = useTheme();
  const [activeTab, setActiveTab] = useState("my");
  const [showExpired, setShowExpired] = useState(false);
  const [viewingAnnouncement, setViewingAnnouncement] = useState<Announcement | null>(null);

  const filteredMyAnnouncements = showExpired
    ? myAnnouncements
    : myAnnouncements.filter(a => !isExpired(a.expires_at) && a.is_active);

  const filteredReceivedAnnouncements = showExpired
    ? receivedAnnouncements
    : receivedAnnouncements.filter(a => !isExpired(a.expires_at));

  const totalUnread = receivedAnnouncements.filter(
    (a) => !a.is_read && !isExpired(a.expires_at)
  ).length;

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <TabsList className="grid w-full sm:w-auto grid-cols-2 max-w-md bg-muted/50 p-1 rounded-xl">
          <TabsTrigger value="my" className="gap-2 px-4 py-2 rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm transition-all">
            <span className="text-sm font-semibold">My Announcements</span>
            {filteredMyAnnouncements.length > 0 && (
              <Badge variant="secondary" className="text-[10px] h-5 px-1.5 font-bold bg-primary/10 text-primary border-none">
                {filteredMyAnnouncements.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="received" className="gap-2 px-4 py-2 rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm transition-all">
            <span className="text-sm font-semibold">Received</span>
            {totalUnread > 0 && (
              <Badge className="bg-primary text-white text-[10px] h-5 px-1.5 font-bold border-none shadow-sm">
                {totalUnread}
              </Badge>
            )}
            {filteredReceivedAnnouncements.length > 0 && (
              <Badge variant="secondary" className="text-[10px] h-5 px-1.5 font-bold ml-1 bg-muted text-muted-foreground border-none">
                {filteredReceivedAnnouncements.length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowExpired(!showExpired)}
          className={`text-xs font-bold transition-all h-9 px-4 rounded-xl border-dashed hover:border-solid ${
            showExpired 
              ? "bg-primary/5 border-primary text-primary hover:bg-primary/10" 
              : "text-muted-foreground hover:text-foreground border-muted-foreground/20 hover:border-foreground/30"
          }`}
        >
          {showExpired ? "Hide Archive" : "Show Archive"}
        </Button>
      </div>

      <TabsContent value="my" className="space-y-4 mt-6">
        {loading ? (
          <div className="text-center py-8">
            <p className="text-muted-foreground">Loading announcements...</p>
          </div>
        ) : myAnnouncements.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center">
              <p className="text-muted-foreground">
                No announcements created yet. Create your first announcement!
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className={`rounded-2xl border ${theme === 'dark' ? 'border-border bg-card' : 'border-gray-200 bg-white'} overflow-hidden shadow-sm`}>
            <div className="overflow-x-auto custom-scrollbar">
              <Table>
                <TableHeader>
                  <TableRow className={theme === 'dark' ? 'hover:bg-transparent' : 'bg-gray-50/50 hover:bg-gray-50/50'}>
                  <TableHead className="w-[250px] text-xs font-semibold uppercase tracking-wider text-muted-foreground py-4">Announcement</TableHead>
                  <TableHead className="text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground py-4">Reason</TableHead>
                  <TableHead className="text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground py-4">Target Roles</TableHead>
                  <TableHead className="text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground py-4">Priority</TableHead>
                  <TableHead className="text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground py-4">Status</TableHead>
                  <TableHead className="text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground py-4">Expires</TableHead>
                  <TableHead className="text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground py-4">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredMyAnnouncements.map((announcement) => {
                    const expired = isExpired(announcement.expires_at);
                    return (
                      <TableRow key={announcement.id} className={`${expired ? 'opacity-60' : ''} ${theme === 'dark' ? 'hover:bg-muted/50' : 'hover:bg-gray-50'}`}>
                      <TableCell>
                        <div className="flex flex-col gap-1.5">
                          <span className="font-semibold text-foreground text-lg line-clamp-1">{announcement.title}</span>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-xs flex items-center gap-1 text-muted-foreground font-medium">
                                <Clock className="w-3.5 h-3.5" />
                                {formatDate(announcement.created_at)}
                              </span>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8 text-xs font-semibold px-3 hover:bg-primary/10 hover:text-primary border-primary/20"
                            onClick={() => setViewingAnnouncement(announcement)}
                          >
                            View Content
                          </Button>
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="flex flex-wrap justify-center gap-1.5">
                            {announcement.target_roles.map((role) => (
                              <Badge key={role} variant="outline" className="text-xs px-2 py-0.5 h-5 capitalize font-medium">
                                {role}
                              </Badge>
                            ))}
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge className={`${getPriorityColor(announcement.priority)} text-xs px-2.5 py-0.5 h-6 font-semibold mx-auto`}>
                            {announcement.priority}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="flex flex-col items-center gap-1">
                            {!announcement.is_active ? (
                              <Badge className="bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-500 border-yellow-200 text-xs px-2.5 py-0.5 h-6 w-fit font-medium">
                                Inactive
                              </Badge>
                            ) : expired ? (
                              <Badge className="bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400 border-gray-200 text-xs px-2.5 py-0.5 h-6 w-fit font-medium">
                                Expired
                              </Badge>
                            ) : (
                              <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-500 border-green-200 text-xs px-2.5 py-0.5 h-6 w-fit font-medium">
                                Active
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-center text-sm font-medium">
                          <span className={expired ? 'text-destructive' : 'text-muted-foreground'}>
                            {format(new Date(announcement.expires_at), 'dd MMM yyyy')}
                          </span>
                        </TableCell>
                        <TableCell className="text-center">
                          {showActions && (
                            <div className="flex items-center justify-center gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                className={`h-8 text-xs gap-1.5 border  ${announcement.is_active ? 'text-orange-500 hover:text-orange-600 hover:bg-orange-50' : 'text-green-500 hover:text-green-600 hover:bg-green-50'}`}
                                onClick={() => onToggleActive(announcement.id)}
                              >
                                {announcement.is_active ? (
                                  <>
                                    <XCircle className="h-3.5 w-3.5" />
                                    Deactivate
                                  </>
                                ) : (
                                  <>
                                    <CheckCircle2 className="h-3.5 w-3.5" />
                                    Activate
                                  </>
                                )}
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 text-xs text-muted-foreground hover:text-primary gap-1.5"
                                onClick={() => onEdit(announcement)}
                              >
                                <Edit2 className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 text-xs text-destructive hover:text-destructive hover:bg-destructive/10 gap-1.5"
                                onClick={() => onDelete(announcement.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </div>
        )}
      </TabsContent>

      <TabsContent value="received" className="space-y-4 mt-6">
        {loading ? (
          <div className="text-center py-8">
            <p className="text-muted-foreground">Loading announcements...</p>
          </div>
        ) : receivedAnnouncements.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center">
              <p className="text-muted-foreground">
                No announcements received yet.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className={`rounded-2xl border ${theme === 'dark' ? 'border-border bg-card' : 'border-gray-200 bg-white'} overflow-hidden shadow-sm`}>
            <div className="overflow-x-auto custom-scrollbar">
              <Table>
                <TableHeader>
                  <TableRow className={theme === 'dark' ? 'hover:bg-transparent' : 'bg-gray-50/50 hover:bg-gray-50/50'}>
                    <TableHead className="w-[200px] text-xs font-bold uppercase tracking-wider text-muted-foreground py-4">Announcement</TableHead>
                    <TableHead className="text-center text-xs font-bold uppercase tracking-wider text-muted-foreground py-4">Content</TableHead>
                    <TableHead className="text-center text-xs font-bold uppercase tracking-wider text-muted-foreground py-4">From</TableHead>
                    <TableHead className="text-center text-xs font-bold uppercase tracking-wider text-muted-foreground py-4">Priority</TableHead>
                    <TableHead className="text-center text-xs font-bold uppercase tracking-wider text-muted-foreground py-4">Date</TableHead>
                    <TableHead className="text-center text-xs font-bold uppercase tracking-wider text-muted-foreground py-4">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredReceivedAnnouncements.map((announcement) => {
                    const unread = announcement.is_read === false;
                    return (
                      <TableRow key={announcement.id} className={`${unread ? 'bg-primary/5 font-medium' : ''} ${theme === 'dark' ? 'hover:bg-muted/50' : 'hover:bg-gray-50'}`}>
                        <TableCell>
                          <div className="flex flex-col gap-1.5">
                            <div className="flex items-center gap-2">
                              {unread && <div className="w-2.5 h-2.5 rounded-full bg-primary shrink-0 shadow-sm" />}
                              <span className="text-foreground text-lg font-bold line-clamp-1">{announcement.title}</span>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8 text-xs font-semibold px-3 hover:bg-primary/10 hover:text-primary border-primary/20"
                            onClick={() => {
                              setViewingAnnouncement(announcement);
                              if (unread && onMarkRead) onMarkRead(announcement.id);
                            }}
                          >
                            View Content
                          </Button>
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="flex items-center justify-center gap-2.5 text-sm font-medium">
                            <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-xs text-primary font-bold border border-primary/20">
                              {announcement.created_by_name?.charAt(0).toUpperCase()}
                            </div>
                            <span>{announcement.created_by_name}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge className={`${getPriorityColor(announcement.priority)} text-xs px-2.5 py-0.5 h-6 font-semibold mx-auto`}>
                            {announcement.priority}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center text-sm text-muted-foreground font-medium">
                          {format(new Date(announcement.created_at), 'dd MMM, HH:mm')}
                        </TableCell>
                        <TableCell className="text-center">
                          {unread && onMarkRead && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 text-xs text-primary hover:text-primary hover:bg-primary/10 mx-auto"
                              onClick={() => onMarkRead(announcement.id)}
                            >
                              <Eye className="w-3 h-3 mr-1" />
                              Mark Read
                            </Button>
                          )}
                          {!unread && (
                            <Badge variant="outline" className="text-xs px-2 py-0.5 h-6 text-muted-foreground font-medium mx-auto">
                              Read
                            </Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </div>
        )}
      </TabsContent>
      {/* View Announcement Dialog */}
      <Dialog open={!!viewingAnnouncement} onOpenChange={(open) => !open && setViewingAnnouncement(null)}>
        <DialogContent className="w-[92vw] sm:max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl sm:rounded-3xl p-0 border-none shadow-2xl">
          <div className="p-6 sm:p-8 space-y-6">
            <DialogHeader className="space-y-4">
              <div className="flex items-center justify-between gap-4">
                <Badge className={`${viewingAnnouncement ? getPriorityColor(viewingAnnouncement.priority) : ''} h-7 px-4 text-xs font-semibold rounded-full border-none shadow-sm`}>
                  {viewingAnnouncement?.priority.toUpperCase()}
                </Badge>
                {viewingAnnouncement && (
                  <div className="text-xs text-muted-foreground flex items-center gap-2 font-medium">
                    <Clock className="w-3.5 h-3.5 text-primary/60" />
                    {formatDate(viewingAnnouncement.created_at)}
                  </div>
                )}
              </div>
              <DialogTitle className="text-2xl font-semibold tracking-tight text-foreground">
                {viewingAnnouncement?.title}
              </DialogTitle>
              <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground pb-4 border-b border-border/50">
                <div className="flex items-center gap-2 bg-muted/50 px-2 py-1 rounded-full">
                  <div className="w-6 h-6 rounded-full bg-primary text-[10px] text-white flex items-center justify-center font-semibold shadow-sm">
                    {viewingAnnouncement?.created_by_name?.charAt(0).toUpperCase()}
                  </div>
                  <span className="font-bold text-foreground/80">{viewingAnnouncement?.created_by_name}</span>
                </div>
                {viewingAnnouncement?.branch_name && (
                  <>
                    <span className="text-muted-foreground/40">•</span>
                    <span className="font-medium">{viewingAnnouncement.branch_name}</span>
                  </>
                )}
                {viewingAnnouncement?.is_global && (
                  <>
                    <span className="text-muted-foreground/40">•</span>
                    <Badge variant="secondary" className="text-[10px] h-5 font-semibold uppercase bg-primary/10 text-primary border-none">Global</Badge>
                  </>
                )}
              </div>
            </DialogHeader>

            <div className="relative">
              <div className={`p-6 sm:p-8 rounded-2xl border ${theme === 'dark' ? 'bg-muted/20 border-border/50' : 'bg-gray-50/50 border-gray-100'} min-h-[120px]`}>
                <p className="text-base sm:text-lg text-foreground/90 leading-relaxed whitespace-pre-wrap font-medium">
                  {viewingAnnouncement?.message}
                </p>
              </div>
            </div>

            <div className="pt-4 flex flex-wrap gap-4 items-center justify-between border-t border-border/30">
              <div className="flex flex-wrap gap-2">
                {viewingAnnouncement?.target_roles.map((role) => (
                  <Badge key={role} variant="outline" className="capitalize text-xs font-semibold px-3 py-1 rounded-lg bg-background">
                    {role}
                  </Badge>
                ))}
              </div>
              <div className="text-xs text-muted-foreground font-semibold opacity-70">
                Expires: {viewingAnnouncement && formatDate(viewingAnnouncement.expires_at)}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </Tabs>
  );
};

export default AnnouncementSections;
