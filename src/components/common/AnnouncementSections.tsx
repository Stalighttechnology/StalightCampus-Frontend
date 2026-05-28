import { useState } from "react";
import { format } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Edit2, Trash2, Eye, Clock, User, AlertCircle, MoreVertical, CheckCircle2, XCircle, Megaphone, BellOff } from "lucide-react";
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

import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { SkeletonList } from "@/components/ui/skeleton";

interface PaginationData {
  count: number;
  page: number;
  pageSize: number;
  unreadCount?: number;
}

interface AnnouncementSectionsProps {
  myAnnouncements: Announcement[];
  receivedAnnouncements: Announcement[];
  onEdit: (announcement: Announcement) => void;
  onDelete: (announcementId: number) => void;
  onToggleActive: (announcementId: number) => void;
  onMarkRead: (announcementId: number) => void;
  loading?: boolean;
  showActions?: boolean; // Whether to show edit/delete buttons
  myPagination?: PaginationData;
  receivedPagination?: PaginationData;
  onPageChange?: (page: number, type: 'my' | 'received') => void;
  activeTab: string;
  onTabChange: (tab: string) => void;
  header?: React.ReactNode;
  showExpired?: boolean;
  setShowExpired?: (val: boolean) => void;
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

const SectionContentWrapper = ({
  header,
  children,
  className
}: {
  header: React.ReactNode | undefined;
  children: React.ReactNode;
  className?: string;
}) => {
  if (header) {
    return <CardContent className={className}>{children}</CardContent>;
  }
  return <>{children}</>;
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
  myPagination,
  receivedPagination,
  onPageChange,
  activeTab,
  onTabChange,
  header,
  showExpired: propShowExpired,
  setShowExpired: propSetShowExpired,
}: AnnouncementSectionsProps) => {
  const { theme } = useTheme();
  const [localShowExpired, setLocalShowExpired] = useState(false);
  
  const showExpired = propShowExpired !== undefined ? propShowExpired : localShowExpired;
  const setShowExpired = propSetShowExpired || setLocalShowExpired;

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
    <>
      <style>{`
        @media (max-width: 480px) {
          .ann-tabs-list { width: 100% !important; grid-template-columns: 1fr 1fr !important; }
          .ann-archive-btn { width: 100% !important; margin-top: 10px !important; }
          .ann-table-container { border: none !important; }
          .ann-card-mobile { padding: 16px !important; margin-bottom: 12px !important; border-radius: 12px !important; border: 1px solid hsl(var(--border)) !important; }
          .ann-card-header { display: flex; flex-direction: column; gap: 8px; margin-bottom: 12px; }
          .ann-card-title { font-size: 1rem !important; font-weight: 600 !important; line-height: 1.3 !important; }
          .ann-card-meta { display: flex; flex-direction: column; gap: 4px; }
          .ann-card-badges { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 8px; }
          .ann-card-actions { display: flex; flex-direction: column; gap: 8px; border-top: 1px solid hsl(var(--border)); padding-top: 12px; margin-top: 12px; }
          .ann-card-actions-row { display: grid; grid-template-columns: 1.2fr 1fr 1fr; gap: 8px; }
          .ann-card-actions-row button { flex: 1; }
          .ann-pagination { flex-direction: column !important; gap: 16px !important; align-items: center !important; text-align: center !important; }
        }
      `}</style>
      <Tabs value={activeTab} onValueChange={onTabChange} className="w-full">
        <div id={header ? "announcement-header-section" : undefined} className={header ? "flex flex-col" : undefined}>
          {header}
          <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${header ? 'px-6 pb-4' : ''}`}>
        <TabsList className="ann-tabs-list grid w-full sm:w-auto grid-cols-2 max-w-md bg-muted/50 p-1 rounded-xl mt-5">
          <TabsTrigger value="my" className="gap-2 px-4 py-2 rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm transition-all">
            <span className="text-sm font-semibold">My Announcements</span>
            {myPagination && myPagination.count > 0 && (
              <Badge variant="secondary" className="text-[10px] h-5 px-1.5 font-semibold bg-primary/10 text-primary border-none">
                {myPagination.count}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="received" className="gap-2 px-4 py-2 rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm transition-all">
            <span className="text-sm font-semibold">Received</span>
            {receivedPagination && receivedPagination.unreadCount !== undefined ? (
              receivedPagination.unreadCount > 0 && (
                <Badge variant="secondary" className="text-[10px] h-5 px-1.5 font-semibold ml-1 bg-primary text-white border-none shadow-sm pointer-events-none select-none">
                  {receivedPagination.unreadCount}
                </Badge>
              )
            ) : (
              receivedPagination && receivedPagination.count > 0 && (
                <Badge variant="secondary" className="text-[10px] h-5 px-1.5 font-semibold ml-1 bg-muted text-muted-foreground border-none pointer-events-none select-none">
                  {receivedPagination.count}
                </Badge>
              )
            )}
          </TabsTrigger>
        </TabsList>

        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowExpired(!showExpired)}
          className={`ann-archive-btn text-xs font-semibold transition-all h-9 px-4 rounded-xl border-dashed mt-5 hover:border-solid ${showExpired
              ? "bg-primary/5 border-primary text-primary hover:bg-primary/10"
              : "text-muted-foreground hover:text-foreground border-muted-foreground/20 hover:border-foreground/30"
            }`}
        >
          {showExpired ? "Hide Archive" : "Show Archive"}
        </Button>
          </div>
        </div>

        <SectionContentWrapper header={header} className="announcements-card-content pt-0">
        <TabsContent value="my" className="space-y-4 mt-6">
        {loading ? (
          <div className="py-4">
            <SkeletonList items={5} />
          </div>
        ) : myAnnouncements.length === 0 ? (
          <div className={`flex flex-col items-center justify-center py-16 px-4 text-center rounded-3xl border-2 border-dashed shadow-sm ${theme === 'dark' ? 'bg-muted/10 border-border/60' : 'bg-gray-50 border-gray-200/60'}`}>
            <div className={`w-20 h-20 rounded-3xl flex items-center justify-center mb-6 shadow-inner ${theme === 'dark' ? 'bg-primary/20 text-primary' : 'bg-primary/10 text-primary'}`}>
              <Megaphone className="w-10 h-10" />
            </div>
            <h3 className={`text-xl font-semibold mb-2 tracking-tight ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>No announcements created</h3>
            <p className={`text-sm max-w-[280px] mx-auto leading-relaxed ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}`}>
              You haven't created any announcements yet. Click the button above to create your first announcement!
            </p>
          </div>
        ) : (
          <div className={`ann-table-container rounded-2xl border ${theme === 'dark' ? 'border-border bg-card' : 'border-gray-200 bg-white'} overflow-hidden shadow-sm`}>
            {/* Desktop Table View */}
            <div className="hidden sm:block overflow-x-auto custom-scrollbar">
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
                          <div className="flex flex-col gap-1">
                            <div className="font-semibold text-foreground text-sm sm:text-base leading-tight whitespace-normal break-words">{announcement.title}</div>
                            <div className="flex flex-col gap-0.5 mt-1">
                              <span className="text-xs font-semibold text-primary/80 flex items-center gap-1">
                                <User className="w-3 h-3" />
                                {announcement.created_by_name}
                              </span>
                              <span className="text-[10px] flex items-center gap-1 text-muted-foreground font-medium">
                                <Clock className="w-3 h-3" />
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

            {/* Mobile Card View */}
            <div className="block sm:hidden space-y-3 p-3">
              {filteredMyAnnouncements.map((announcement) => {
                const expired = isExpired(announcement.expires_at);
                return (
                  <div key={announcement.id} className={`ann-card-mobile ${theme === 'dark' ? 'bg-muted/10' : 'bg-gray-50/50'} ${expired ? 'opacity-60' : ''}`}>
                    <div className="ann-card-header">
                      <div className="flex justify-between items-start">
                        <Badge className={`${getPriorityColor(announcement.priority)} text-[10px] uppercase font-bold px-2 py-0.5`}>
                          {announcement.priority}
                        </Badge>
                        {!announcement.is_active ? (
                          <Badge variant="outline" className="text-[10px] text-yellow-600 border-yellow-200">Inactive</Badge>
                        ) : expired ? (
                          <Badge variant="outline" className="text-[10px] text-gray-500 border-gray-200">Expired</Badge>
                        ) : (
                          <Badge variant="outline" className="text-[10px] text-green-600 border-green-200">Active</Badge>
                        )}
                      </div>
                      <div className="ann-card-title text-foreground">{announcement.title}</div>
                      <div className="ann-card-meta">
                        <span className="text-xs text-primary/80 font-semibold flex items-center gap-1.5">
                          <User className="w-3.5 h-3.5" /> {announcement.created_by_name}
                        </span>
                        <span className="text-[11px] text-muted-foreground font-medium flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5" /> {formatDate(announcement.created_at)}
                        </span>
                      </div>
                    </div>
                    
                    <div className="ann-card-badges">
                      {announcement.target_roles.map((role) => (
                        <Badge key={role} variant="outline" className="text-[10px] capitalize px-2 h-5 bg-background">
                          {role}
                        </Badge>
                      ))}
                    </div>

                    <div className="ann-card-actions">
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full h-9 text-xs font-semibold bg-background border-primary/20 text-primary"
                        onClick={() => setViewingAnnouncement(announcement)}
                      >
                        <Eye className="w-4 h-4 mr-2" /> View Content
                      </Button>
                      {showActions && (
                        <div className="ann-card-actions-row">
                          <Button
                            variant="ghost"
                            size="sm"
                            className={`h-9 text-[11px] font-semibold border flex items-center justify-center gap-1 ${announcement.is_active ? 'text-orange-500 border-orange-100 bg-orange-50/30' : 'text-green-500 border-green-100 bg-green-50/30'}`}
                            onClick={() => onToggleActive(announcement.id)}
                          >
                            {announcement.is_active ? (
                              <><XCircle className="h-3.5 w-3.5 shrink-0" /> Deactivate</>
                            ) : (
                              <><CheckCircle2 className="h-3.5 w-3.5 shrink-0" /> Activate</>
                            )}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-9 text-[11px] font-semibold border border-border flex items-center justify-center gap-1"
                            onClick={() => onEdit(announcement)}
                          >
                            <Edit2 className="h-3.5 w-3.5 shrink-0" /> Edit
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-9 text-[11px] font-semibold border border-destructive/20 text-destructive bg-destructive/5 flex items-center justify-center gap-1"
                            onClick={() => onDelete(announcement.id)}
                          >
                            <Trash2 className="h-3.5 w-3.5 shrink-0" /> Delete
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

      </TabsContent>

      <TabsContent value="received" className="space-y-4 mt-6">
        {loading ? (
          <div className="py-4">
            <SkeletonList items={5} />
          </div>
        ) : receivedAnnouncements.length === 0 ? (
          <div className={`flex flex-col items-center justify-center py-16 px-4 text-center rounded-3xl border-2 border-dashed shadow-sm ${theme === 'dark' ? 'bg-muted/10 border-border/60' : 'bg-gray-50 border-gray-200/60'}`}>
            <div className={`w-20 h-20 rounded-3xl flex items-center justify-center mb-6 shadow-inner ${theme === 'dark' ? 'bg-primary/20 text-primary' : 'bg-primary/10 text-primary'}`}>
              <BellOff className="w-10 h-10" />
            </div>
            <h3 className={`text-xl font-semibold mb-2 tracking-tight ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>No announcements received</h3>
            <p className={`text-sm max-w-[280px] mx-auto leading-relaxed ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}`}>
              Your inbox is clear! There are currently no announcements for you to review.
            </p>
          </div>
        ) : (
          <div className={`ann-table-container rounded-2xl border ${theme === 'dark' ? 'border-border bg-card' : 'border-gray-200 bg-white'} overflow-hidden shadow-sm`}>
            {/* Desktop Table View */}
            <div className="hidden sm:block overflow-x-auto custom-scrollbar">
              <Table>
                <TableHeader>
                  <TableRow className={theme === 'dark' ? 'hover:bg-transparent' : 'bg-gray-50/50 hover:bg-gray-50/50'}>
                    <TableHead className="w-[250px] text-xs font-semibold uppercase tracking-wider text-muted-foreground py-4">Announcement</TableHead>
                    <TableHead className="text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground py-4">Content</TableHead>
                    <TableHead className="text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground py-4">Priority</TableHead>
                    <TableHead className="text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground py-4">Date</TableHead>
                    <TableHead className="text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground py-4">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredReceivedAnnouncements.map((announcement) => {
                    const unread = announcement.is_read === false;
                    return (
                      <TableRow key={announcement.id} className={`${unread ? 'bg-primary/5 font-medium' : ''} ${theme === 'dark' ? 'hover:bg-muted/50' : 'hover:bg-gray-50'}`}>
                        <TableCell>
                          <div className="flex flex-col gap-1">
                            <div className="flex items-start gap-2">
                              {unread && <div className="w-2 h-2 rounded-full bg-primary shrink-0 shadow-sm mt-1.5" />}
                              <div className="text-foreground text-sm sm:text-base font-semibold leading-tight whitespace-normal break-words">{announcement.title}</div>
                            </div>
                            <div className="flex flex-col gap-0.5 mt-0.5 ml-4.5">
                              <span className="text-xs font-semibold text-primary/80 flex items-center gap-1">
                                <User className="w-3 h-3" />
                                {announcement.created_by_name}
                              </span>
                              <span className="text-[10px] flex items-center gap-1 text-muted-foreground font-medium">
                                <Clock className="w-3 h-3" />
                                {format(new Date(announcement.created_at), 'dd MMM, HH:mm')}
                              </span>
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

            {/* Mobile Card View (Received) */}
            <div className="block sm:hidden space-y-3 p-3">
              {filteredReceivedAnnouncements.map((announcement) => {
                const unread = announcement.is_read === false;
                return (
                  <div key={announcement.id} className={`ann-card-mobile ${theme === 'dark' ? 'bg-muted/10' : 'bg-gray-50/50'} ${unread ? 'border-primary/40 bg-primary/5' : ''}`}>
                    <div className="ann-card-header">
                      <div className="flex justify-between items-start">
                        <Badge className={`${getPriorityColor(announcement.priority)} text-[10px] uppercase font-bold px-2 py-0.5`}>
                          {announcement.priority}
                        </Badge>
                        {unread ? (
                          <Badge className="bg-primary text-white text-[10px]">Unread</Badge>
                        ) : (
                          <Badge variant="outline" className="text-[10px] text-muted-foreground">Read</Badge>
                        )}
                      </div>
                      <div className="ann-card-title text-foreground">
                        {unread && <span className="inline-block w-2 h-2 rounded-full bg-primary mr-2 shadow-sm" />}
                        {announcement.title}
                      </div>
                      <div className="ann-card-meta">
                        <span className="text-xs text-primary/80 font-semibold flex items-center gap-1.5">
                          <User className="w-3.5 h-3.5" /> {announcement.created_by_name}
                        </span>
                        <span className="text-[11px] text-muted-foreground font-medium flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5" /> {format(new Date(announcement.created_at), 'dd MMM, HH:mm')}
                        </span>
                      </div>
                    </div>

                    <div className="ann-card-actions">
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full h-9 text-xs font-semibold bg-background border-primary/20 text-primary"
                        onClick={() => {
                          setViewingAnnouncement(announcement);
                          if (unread && onMarkRead) onMarkRead(announcement.id);
                        }}
                      >
                        <Eye className="w-4 h-4 mr-2" /> View Content
                      </Button>
                      {unread && onMarkRead && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="w-full h-9 text-xs text-primary bg-primary/10 hover:bg-primary/20"
                          onClick={() => onMarkRead(announcement.id)}
                        >
                          Mark as Read
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </TabsContent>
        </SectionContentWrapper>

        {activeTab === "my" && myPagination && myPagination.count > 0 && (
          <CardFooter className="flex flex-col sm:flex-row justify-between items-center gap-4 text-sm text-muted-foreground px-6 py-4 border-t border-border mt-auto">
            <div>
              Showing {Math.min((myPagination.page - 1) * myPagination.pageSize + 1, myPagination.count)} to {Math.min(myPagination.page * myPagination.pageSize, myPagination.count)} of {myPagination.count} announcements
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => onPageChange?.(Math.max(1, myPagination.page - 1), 'my')}
                disabled={myPagination.page === 1}
                className="bg-primary hover:bg-primary/90 text-white border-primary h-9 px-4 transition-all"
              >
                Previous
              </Button>

              <div className="flex items-center justify-center min-w-[2rem]">
                <span className={`text-sm font-semibold ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>
                  {myPagination.page}
                </span>
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={() => onPageChange?.(Math.min(Math.ceil(myPagination.count / myPagination.pageSize), myPagination.page + 1), 'my')}
                disabled={myPagination.page >= Math.ceil(myPagination.count / myPagination.pageSize)}
                className="bg-primary hover:bg-primary/90 text-white border-primary h-9 px-4 transition-all"
              >
                Next
              </Button>
            </div>
          </CardFooter>
        )}

        {activeTab === "received" && receivedPagination && receivedPagination.count > 0 && (
          <CardFooter className="flex flex-col sm:flex-row justify-between items-center gap-4 text-sm text-muted-foreground px-6 py-4 border-t border-border mt-auto">
            <div>
              Showing {Math.min((receivedPagination.page - 1) * receivedPagination.pageSize + 1, receivedPagination.count)} to {Math.min(receivedPagination.page * receivedPagination.pageSize, receivedPagination.count)} of {receivedPagination.count} announcements
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => onPageChange?.(Math.max(1, receivedPagination.page - 1), 'received')}
                disabled={receivedPagination.page === 1}
                className="bg-primary hover:bg-primary/90 text-white border-primary h-9 px-4 transition-all"
              >
                Previous
              </Button>

              <div className="flex items-center justify-center min-w-[2rem]">
                <span className={`text-sm font-semibold ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>
                  {receivedPagination.page}
                </span>
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={() => onPageChange?.(Math.min(Math.ceil(receivedPagination.count / receivedPagination.pageSize), receivedPagination.page + 1), 'received')}
                disabled={receivedPagination.page >= Math.ceil(receivedPagination.count / receivedPagination.pageSize)}
                className="bg-primary hover:bg-primary/90 text-white border-primary h-9 px-4 transition-all"
              >
                Next
              </Button>
            </div>
          </CardFooter>
        )}

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
              <DialogTitle className="text-xl font-semibold tracking-tight text-foreground">
                {viewingAnnouncement?.title}
              </DialogTitle>
              <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground pb-4 border-b border-border/50">
                <div className="flex items-center gap-2 bg-muted/50 px-2 py-1 rounded-full">
                  <div className="w-6 h-6 rounded-full bg-primary text-[12px] text-white flex items-center justify-center font-semibold shadow-sm">
                    {viewingAnnouncement?.created_by_name?.charAt(0).toUpperCase()}
                  </div>
                  <span className="font-semibold text-foreground/80">{viewingAnnouncement?.created_by_name}</span>
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
                    <Badge variant="secondary" className="text-[12px] h-5 font-semibold uppercase bg-primary/10 text-primary border-none">Global</Badge>
                  </>
                )}
              </div>
            </DialogHeader>

            <div className="relative">
              <div className={`p-6 sm:p-8 rounded-2xl border ${theme === 'dark' ? 'bg-muted/20 border-border/50' : 'bg-gray-50/50 border-gray-100'} min-h-[120px]`}>
                <p className="text-base sm:text-md text-foreground/90 leading-relaxed whitespace-pre-wrap font-semibold">
                  {viewingAnnouncement?.message}
                </p>
              </div>
            </div>

            <div className="pt-4 flex flex-wrap gap-4 items-center justify-between border-t border-border/30">
              <div className="flex flex-wrap gap-2">
                {viewingAnnouncement?.target_roles.map((role) => (
                  <Badge key={role} variant="outline" className="capitalize text-sm font-semibold px-3 py-1 rounded-lg bg-background">
                    {role}
                  </Badge>
                ))}
              </div>
              <div className="text-sm text-muted-foreground font-semibold opacity-70">
                Expires: {viewingAnnouncement && formatDate(viewingAnnouncement.expires_at)}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      </Tabs>
    </>
  );
};

export default AnnouncementSections;
