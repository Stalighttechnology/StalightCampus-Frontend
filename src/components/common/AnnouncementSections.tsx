import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Edit2, Trash2, Eye, Clock, User, AlertCircle, MoreVertical, CheckCircle2, XCircle, Megaphone, BellOff, MapPin, ExternalLink, FileDown, Loader2 } from "lucide-react";
import { useTheme } from "@/context/ThemeContext";
import { Announcement } from "@/utils/announcements_api";
import { actionGatePass } from "@/utils/hms_api";
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
import { fetchWithTokenRefresh } from "../../utils/authService";
import { downloadFile } from "@/utils/downloadHelper";
import { API_ENDPOINT } from "../../utils/config";

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
  hideReceivedTab?: boolean;
  onResolveEmergency?: (incidentId: number) => void;
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

const formatAnnouncementMessage = (msg: string) => {
  if (!msg) return "";
  return msg.split('\n').map(line => {
    if (line.startsWith('Leaving:') || line.startsWith('Expected Return:')) {
      const match = line.match(/(Leaving:|Expected Return:)\s*(\d{4}-\d{2}-\d{2})\s*(\d{2}:\d{2}(?::\d{2})?)/);
      if (match) {
        const prefix = match[1];
        const datePart = match[2];
        const timePart = match[3];

        const timeParts = timePart.split(':');
        let hours = parseInt(timeParts[0], 10);
        const minutes = timeParts[1];
        const ampm = hours >= 12 ? 'PM' : 'AM';
        hours = hours % 12;
        hours = hours ? hours : 12;
        const hourStr = hours < 10 ? `0${hours}` : hours.toString();

        return `${prefix} ${datePart} ${hourStr}:${minutes} ${ampm}`;
      }
    }
    return line;
  }).join('\n');
};

const formatRoleName = (role: string) => {
  if (!role) return "";
  return role
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
};

const renderTargetRoles = (targetRoles: string[]) => {
  if (!targetRoles || targetRoles.length === 0) return null;
  const ALL_POSSIBLE_ROLES = ["student", "hod", "faculty", "principal", "placement_officer", "org_admin", "dean", "coe", "fees_manager", "hms_admin", "transport_admin", "library_admin", "admission_manager"];

  if (targetRoles.length >= ALL_POSSIBLE_ROLES.length - 1) {
    return (
      <Badge variant="outline" className="text-xs px-2 py-0.5 h-5 bg-primary/10 text-primary border-primary/20 font-semibold rounded-md">
        All Roles
      </Badge>
    );
  }

  const visibleRoles = targetRoles.slice(0, 2);
  const remainingCount = targetRoles.length - visibleRoles.length;

  return (
    <div className="flex flex-nowrap justify-center gap-1.5 mx-auto">
      {visibleRoles.map((role) => (
        <Badge key={role} variant="outline" className="text-xs px-2 py-0.5 h-5 font-medium whitespace-nowrap rounded-md">
          {formatRoleName(role)}
        </Badge>
      ))}
      {remainingCount > 0 && (
        <Badge variant="secondary" className="text-xs px-2 py-0.5 h-5 font-semibold bg-muted text-muted-foreground border-none rounded-md whitespace-nowrap">
          +{remainingCount} more
        </Badge>
      )}
    </div>
  );
};

const renderTargetRolesMobile = (targetRoles: string[]) => {
  if (!targetRoles || targetRoles.length === 0) return null;
  const ALL_POSSIBLE_ROLES = ["student", "hod", "faculty", "principal", "placement_officer", "org_admin", "dean", "coe", "fees_manager", "hms_admin", "transport_admin", "library_admin", "admission_manager"];

  if (targetRoles.length >= ALL_POSSIBLE_ROLES.length - 1) {
    return (
      <Badge variant="outline" className="text-[10px] px-2 h-5 bg-primary/10 text-primary border-primary/20 font-semibold rounded-md">
        All Roles
      </Badge>
    );
  }

  const visibleRoles = targetRoles.slice(0, 2);
  const remainingCount = targetRoles.length - visibleRoles.length;

  return (
    <div className="flex flex-wrap gap-1">
      {visibleRoles.map((role) => (
        <Badge key={role} variant="outline" className="text-[10px] px-2 h-5 bg-background font-medium whitespace-nowrap rounded-md">
          {formatRoleName(role)}
        </Badge>
      ))}
      {remainingCount > 0 && (
        <Badge variant="secondary" className="text-[10px] px-2 h-5 font-semibold bg-muted text-muted-foreground border-none rounded-md">
          +{remainingCount}
        </Badge>
      )}
    </div>
  );
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
  hideReceivedTab = false,
  onResolveEmergency,
}: AnnouncementSectionsProps) => {
  const { theme } = useTheme();
  const navigate = useNavigate();
  const [localShowExpired, setLocalShowExpired] = useState(false);

  const showExpired = propShowExpired !== undefined ? propShowExpired : localShowExpired;
  const setShowExpired = propSetShowExpired || setLocalShowExpired;

  const [viewingAnnouncement, setViewingAnnouncement] = useState<Announcement | null>(null);
  const [exportingPDF, setExportingPDF] = useState(false);

  const handleExportExamPDF = async () => {
    if (!viewingAnnouncement?.id) return;
    setExportingPDF(true);
    try {
      const url = `${API_ENDPOINT}/announcements/${viewingAnnouncement.id}/export-pdf/`;
      const response = await fetchWithTokenRefresh(url);
      if (!response.ok) {
        throw new Error("Failed to download PDF");
      }
      const examName = viewingAnnouncement.title || "Exam";
      const fileName = `${examName.replace(/\s+/g, '_')}_Schedule.pdf`;
      await downloadFile(response, fileName);
    } catch (error) {
      console.error("Error exporting PDF:", error);
    } finally {
      setExportingPDF(false);
    }
  };
  const [actionNote, setActionNote] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  const handleAction = async (action: 'approve' | 'reject') => {
    if (!viewingAnnouncement || !viewingAnnouncement.gate_pass) return;
    setActionLoading(true);
    try {
      const res = await actionGatePass(viewingAnnouncement.gate_pass, action, actionNote);
      if (res.success) {
        setViewingAnnouncement(null);
        setActionNote('');
        // Trigger parent refresh
        window.dispatchEvent(new CustomEvent('refresh-announcements'));
      }
    } catch (e) {
      console.error(e);
    } finally {
      setActionLoading(false);
    }
  };

  const filteredMyAnnouncements = showExpired
    ? myAnnouncements.filter(a => isExpired(a.expires_at) || !a.is_active)
    : myAnnouncements.filter(a => !isExpired(a.expires_at) && a.is_active);

  const filteredReceivedAnnouncements = receivedAnnouncements.filter(a => !isExpired(a.expires_at));

  const totalUnread = receivedAnnouncements.filter(
    (a) => !a.is_read && !isExpired(a.expires_at)
  ).length;

  return (
    <>
      <style>{`
        @media (max-width: 639px) {
          .ann-tabs-list { width: 100% !important; grid-template-columns: ${hideReceivedTab ? '1fr' : '1fr 1fr'} !important; margin-top: 8px !important; }
          .ann-tabs-list button {
            font-size: 11px !important;
            padding-left: 4px !important;
            padding-right: 4px !important;
            gap: 4px !important;
          }
          .ann-tabs-list button span {
            font-size: 13px !important;
          }
          .ann-archive-btn { width: 100% !important; margin-top: 8px !important; }
          .ann-table-container { border: none !important; }
          .ann-card-mobile { padding: 12px !important; margin-bottom: 12px !important; border-radius: 12px !important; border: 1px solid hsl(var(--border)) !important; }
          .ann-card-header { display: flex; flex-direction: column; gap: 8px; margin-bottom: 12px; }
          .ann-card-title { font-size: 1rem !important; font-weight: 600 !important; line-height: 1.3 !important; }
          .ann-card-meta { display: flex; flex-direction: column; gap: 4px; }
          .ann-card-meta span { font-size: 0.75rem !important; }
          .ann-card-badges { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 8px; }
          .ann-card-badges > * { font-size: 0.7rem !important; height: auto !important; padding: 2px 8px !important; }
          .ann-card-actions { display: flex; flex-direction: column; gap: 8px; border-top: 1px solid hsl(var(--border)); padding-top: 12px; margin-top: 12px; }
          .ann-card-actions button { font-size: 0.75rem !important; }
          .ann-card-actions-row { display: grid; grid-template-columns: 1.2fr 1fr 1fr; gap: 8px; }
          .ann-card-actions-row button { flex: 1; }
          .ann-pagination { flex-direction: column !important; gap: 16px !important; align-items: center !important; text-align: center !important; }
          .announcements-card-content { padding-top: 4px !important; }
        }
      `}</style>
      <Tabs value={activeTab} onValueChange={onTabChange} className="w-full">
        <div id={header ? "announcement-header-section" : undefined} className={header ? "flex flex-col" : undefined}>
          {header}
          <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${header ? 'px-6 pb-2 sm:pb-4' : ''}`}>
            {hideReceivedTab ? (
              <div className="flex items-center gap-2 mt-5">
                <h3 className="text-lg font-semibold">My Announcements</h3>
                {myPagination && myPagination.count > 0 && (
                  <Badge variant="secondary" className="text-[10px] h-5 px-1.5 font-semibold bg-primary/10 text-primary border-none">
                    {myPagination.count}
                  </Badge>
                )}
              </div>
            ) : (
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
                    filteredReceivedAnnouncements.length > 0 && (
                      <Badge variant="secondary" className="text-[10px] h-5 px-1.5 font-semibold ml-1 bg-muted text-muted-foreground border-none pointer-events-none select-none">
                        {filteredReceivedAnnouncements.length}
                      </Badge>
                    )
                  )}
                </TabsTrigger>
              </TabsList>
            )}

            {activeTab !== "received" && (
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
            )}
          </div>
        </div>

        <SectionContentWrapper header={header} className="announcements-card-content pt-0">
          <TabsContent value="my" className="space-y-4 mt-2 sm:mt-6">
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
              <div className={`ann-table-container rounded-2xl border-none sm:border ${theme === 'dark' ? 'border-border bg-transparent sm:bg-card' : 'border-gray-200 bg-transparent sm:bg-white'} overflow-hidden shadow-none sm:shadow-sm`}>
                {/* Desktop Table View */}
                <div className="hidden sm:block overflow-x-auto custom-scrollbar">
                  <Table>
                    <TableHeader>
                      <TableRow className={theme === 'dark' ? 'hover:bg-transparent' : 'bg-gray-50/50 hover:bg-gray-50/50'}>
                        <TableHead className="w-[250px] text-xs font-semibold uppercase tracking-wider text-muted-foreground py-4">Announcement</TableHead>
                        <TableHead className="text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground py-4">Reason</TableHead>
                        <TableHead className="text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground py-4 whitespace-nowrap">Target Roles</TableHead>
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
                                  <span className="text-xs font-semibold text-primary/80 flex items-start gap-1">
                                    <User className="w-4 h-4 shrink-0 mt-0.5" />
                                    <span>From: {announcement.created_by_name}</span>
                                  </span>
                                  <span className="text-xs flex items-start gap-1 text-muted-foreground font-medium">
                                    <Clock className="w-4 h-4 shrink-0 mt-0.5" />
                                    <span>{formatDate(announcement.created_at)}</span>
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
                            <TableCell className="text-center whitespace-nowrap">
                              {activeTab === 'received' ? (
                                <Badge variant="outline" className="text-xs px-2 py-0.5 h-5 font-medium rounded-md">
                                  {formatRoleName(announcement.created_by_role)}
                                </Badge>
                              ) : (
                                renderTargetRoles(announcement.target_roles)
                              )}
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
                                    disabled={!announcement.is_active && expired}
                                    className={`h-8 text-xs gap-1.5 border ${(announcement.is_active && !isExpired(announcement.expires_at))
                                      ? theme === 'dark' ? 'text-orange-400 border-orange-950/40 hover:bg-orange-950/20 hover:text-orange-300' : 'text-orange-500 border-orange-100 hover:text-orange-600 hover:bg-orange-50'
                                      : (!announcement.is_active && expired) 
                                        ? 'text-muted-foreground border-border opacity-50 cursor-not-allowed'
                                        : theme === 'dark' ? 'text-green-400 border-green-950/40 hover:bg-green-950/20 hover:text-green-300' : 'text-green-500 border-green-100 hover:text-green-600 hover:bg-green-50'
                                      }`}
                                    onClick={() => onToggleActive(announcement.id)}
                                  >
                                    {(announcement.is_active && !isExpired(announcement.expires_at)) ? (
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
                <div className="block sm:hidden space-y-3 p-0">
                  {filteredMyAnnouncements.map((announcement) => {
                    const expired = isExpired(announcement.expires_at);
                    return (
                      <div key={announcement.id} className={`ann-card-mobile ${theme === 'dark' ? 'bg-muted/10' : 'bg-gray-50/50'} ${expired ? 'opacity-60' : ''}`}>
                        <div className="ann-card-header">
                          <div className="flex justify-between items-start">
                            <Badge className={`${getPriorityColor(announcement.priority)} text-[10px] uppercase font-semibold px-2 py-0.5`}>
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
                              <User className="w-3.5 h-3.5" /> From: {announcement.created_by_name}
                            </span>
                            <span className="text-[11px] text-muted-foreground font-medium flex items-center gap-1.5">
                              <Clock className="w-3.5 h-3.5" /> {formatDate(announcement.created_at)}
                            </span>
                          </div>
                        </div>

                        <div className="ann-card-badges">
                          {activeTab === 'received' ? (
                            <Badge variant="outline" className="text-[10px] px-2 h-5 bg-background font-medium rounded-md">
                              {formatRoleName(announcement.created_by_role)}
                            </Badge>
                          ) : (
                            renderTargetRolesMobile(announcement.target_roles)
                          )}
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
                            <div className="flex flex-col gap-2 mt-2 w-full">
                              <Button
                                variant="ghost"
                                size="sm"
                                disabled={!announcement.is_active && expired}
                                className={`w-full h-9 text-xs font-semibold border flex items-center justify-center gap-1.5 rounded-xl ${(announcement.is_active && !isExpired(announcement.expires_at))
                                  ? theme === 'dark' ? 'text-orange-400 border-orange-900/30 bg-orange-950/20 hover:bg-orange-950/40' : 'text-orange-500 border-orange-100 bg-orange-50/30 hover:bg-orange-50/50'
                                  : (!announcement.is_active && expired)
                                    ? 'text-muted-foreground border-border opacity-50 cursor-not-allowed'
                                    : theme === 'dark' ? 'text-green-400 border-green-900/30 bg-green-950/20 hover:bg-green-950/40' : 'text-green-500 border-green-100 bg-green-50/30 hover:bg-green-50/50'
                                  }`}
                                onClick={() => onToggleActive(announcement.id)}
                              >
                                {(announcement.is_active && !isExpired(announcement.expires_at)) ? (
                                  <><XCircle className="h-4 w-4 shrink-0" /> Deactivate</>
                                ) : (
                                  <><CheckCircle2 className="h-4 w-4 shrink-0" /> Activate</>
                                )}
                              </Button>
                              <div className="grid grid-cols-2 gap-2 w-full">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-9 text-xs font-semibold border border-border flex items-center justify-center gap-1.5 rounded-xl bg-background hover:bg-muted/30"
                                  onClick={() => onEdit(announcement)}
                                >
                                  <Edit2 className="h-3.5 w-3.5 shrink-0" /> Edit
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-9 text-xs font-semibold border border-destructive/20 text-destructive bg-destructive/5 hover:bg-destructive/10 flex items-center justify-center gap-1.5 rounded-xl"
                                  onClick={() => onDelete(announcement.id)}
                                >
                                  <Trash2 className="h-3.5 w-3.5 shrink-0" /> Delete
                                </Button>
                              </div>
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

          <TabsContent value="received" className="space-y-4 mt-2 sm:mt-6">
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
              <div className={`ann-table-container rounded-2xl border-none sm:border ${theme === 'dark' ? 'border-border bg-transparent sm:bg-card' : 'border-gray-200 bg-transparent sm:bg-white'} overflow-hidden shadow-none sm:shadow-sm`}>
                {/* Desktop Table View */}
                <div className="hidden sm:block overflow-x-auto custom-scrollbar">
                  <Table>
                    <TableHeader>
                      <TableRow className={theme === 'dark' ? 'hover:bg-transparent' : 'bg-gray-50/50 hover:bg-gray-50/50'}>
                        <TableHead className="w-[250px] text-xs font-semibold uppercase tracking-wider text-muted-foreground py-4">Announcement</TableHead>
                        <TableHead className="text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground py-4">Reason</TableHead>
                        <TableHead className="text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground py-4">Priority</TableHead>
                        <TableHead className="text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground py-4">Date</TableHead>
                        <TableHead className="text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground py-4">Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredReceivedAnnouncements.map((announcement) => {
                        const unread = announcement.is_read === false;
                        const isEmergency = announcement.is_emergency;
                        const hasCoords = announcement.latitude !== undefined && announcement.latitude !== null &&
                          announcement.longitude !== undefined && announcement.longitude !== null;
                        return (
                          <TableRow key={announcement.id} className={`${isEmergency ? 'bg-red-50/40 dark:bg-red-950/10 border-l-4 border-l-red-500' : unread ? 'bg-primary/5 font-medium' : ''} ${theme === 'dark' ? 'hover:bg-muted/50' : 'hover:bg-gray-50'}`}>
                            <TableCell>
                              <div className="flex flex-col gap-1">
                                <div className="flex items-start gap-2">
                                  {unread && !isEmergency && <div className="w-2 h-2 rounded-full bg-primary shrink-0 shadow-sm mt-1.5" />}
                                  <div className="text-foreground text-sm sm:text-base font-semibold leading-tight whitespace-normal break-words">{announcement.title}</div>
                                </div>
                                <div className="flex flex-col gap-0.5 mt-0.5 ml-4.5">
                                  <span className="text-xs font-semibold text-primary/80 flex items-start gap-1">
                                    <User className="w-3 h-3 shrink-0 mt-0.5" />
                                    <span>From: {announcement.created_by_name}</span>
                                  </span>
                                  <span className="text-[10px] flex items-start gap-1 text-muted-foreground font-medium">
                                    <Clock className="w-3 h-3 shrink-0 mt-0.5" />
                                    <span>{format(new Date(announcement.created_at), 'dd MMM, HH:mm')}</span>
                                  </span>
                                  {isEmergency && hasCoords && (
                                    <div className="flex items-center gap-2 mt-1">
                                      <span className="text-[10px] flex items-center gap-1 text-red-500 font-semibold bg-red-50 dark:bg-red-950/30 px-1.5 py-0.5 rounded border border-red-200 dark:border-red-900/50">
                                        <MapPin className="w-3.5 h-3.5 shrink-0" />
                                        {announcement.latitude?.toFixed(4)}, {announcement.longitude?.toFixed(4)}
                                      </span>
                                      <a
                                        href={`https://www.google.com/maps/search/?api=1&query=${announcement.latitude},${announcement.longitude}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-[10px] font-bold text-primary hover:underline flex items-center gap-1 bg-primary/5 px-1.5 py-0.5 rounded border border-primary/20"
                                      >
                                        <ExternalLink className="w-3 h-3" />
                                        Get Direction
                                      </a>
                                    </div>
                                  )}
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
                                  if (unread && !isEmergency && onMarkRead) onMarkRead(announcement.id);
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
                              {isEmergency ? (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="h-8 text-xs font-semibold px-3 text-red-600 border-red-200 bg-red-50 hover:bg-red-100 dark:text-red-400 dark:border-red-900 dark:bg-red-950/30 dark:hover:bg-red-900/50 flex items-center gap-1 mx-auto"
                                  onClick={() => onResolveEmergency && announcement.incident_id && onResolveEmergency(announcement.incident_id)}
                                >
                                  <CheckCircle2 className="w-3.5 h-3.5" />
                                  Resolve
                                </Button>
                              ) : (
                                <>
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
                                </>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>

                {/* Mobile Card View (Received) */}
                <div className="block sm:hidden space-y-3 p-0">
                  {filteredReceivedAnnouncements.map((announcement) => {
                    const unread = announcement.is_read === false;
                    const isEmergency = announcement.is_emergency;
                    const hasCoords = announcement.latitude !== undefined && announcement.latitude !== null &&
                      announcement.longitude !== undefined && announcement.longitude !== null;
                    return (
                      <div key={announcement.id} className={`ann-card-mobile ${theme === 'dark' ? 'bg-muted/10' : 'bg-gray-50/50'} ${isEmergency ? 'border-red-500 border-l-4 bg-red-50/20 dark:bg-red-950/10' : unread ? 'border-primary/40 bg-primary/5' : ''}`}>
                        <div className="ann-card-header">
                          <div className="flex justify-between items-start">
                            <Badge className={`${getPriorityColor(announcement.priority)} text-[10px] uppercase font-semibold px-2 py-0.5`}>
                              {announcement.priority}
                            </Badge>
                            {isEmergency ? (
                              <Badge className="bg-red-500 text-white text-[10px]">Emergency</Badge>
                            ) : unread ? (
                              <Badge className="bg-primary text-white text-[10px]">Unread</Badge>
                            ) : (
                              <Badge variant="outline" className="text-[10px] text-muted-foreground">Read</Badge>
                            )}
                          </div>
                          <div className="ann-card-title text-foreground">
                            {unread && !isEmergency && <span className="inline-block w-2 h-2 rounded-full bg-primary mr-2 shadow-sm" />}
                            {announcement.title}
                          </div>
                          <div className="ann-card-meta">
                            <span className="text-xs text-primary/80 font-semibold flex items-center gap-1.5">
                              <User className="w-3.5 h-3.5" /> From: {announcement.created_by_name}
                            </span>
                            <span className="text-[11px] text-muted-foreground font-medium flex items-center gap-1.5">
                              <Clock className="w-3.5 h-3.5" /> {format(new Date(announcement.created_at), 'dd MMM, HH:mm')}
                            </span>
                            {isEmergency && hasCoords && (
                              <div className="flex flex-col gap-2 mt-2">
                                <span className="text-[11px] flex items-center gap-1 text-red-500 font-semibold bg-red-50 dark:bg-red-950/30 px-2 py-1 rounded border border-red-200 dark:border-red-900/50 w-fit">
                                  <MapPin className="w-3.5 h-3.5 shrink-0" />
                                  {announcement.latitude?.toFixed(4)}, {announcement.longitude?.toFixed(4)}
                                </span>
                                <a
                                  href={`https://www.google.com/maps/search/?api=1&query=${announcement.latitude},${announcement.longitude}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-xs font-bold text-primary hover:underline flex items-center gap-1 bg-primary/5 px-3 py-1.5 rounded border border-primary/20 w-full justify-center"
                                >
                                  <ExternalLink className="w-3.5 h-3.5" />
                                  Get Direction
                                </a>
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="ann-card-actions">
                          <Button
                            variant="outline"
                            size="sm"
                            className="w-full h-9 text-xs font-semibold bg-background border-primary/20 text-primary"
                            onClick={() => {
                              setViewingAnnouncement(announcement);
                              if (unread && !isEmergency && onMarkRead) onMarkRead(announcement.id);
                            }}
                          >
                            <Eye className="w-4 h-4 mr-2" /> View Content
                          </Button>
                          {isEmergency ? (
                            <Button
                              variant="destructive"
                              size="sm"
                              className="w-full h-9 text-xs font-semibold bg-red-600 hover:bg-red-700 text-white mt-2 flex items-center justify-center gap-1.5 rounded-xl"
                              onClick={() => onResolveEmergency && announcement.incident_id && onResolveEmergency(announcement.incident_id)}
                            >
                              <CheckCircle2 className="h-4 w-4 shrink-0" /> Resolve Emergency
                            </Button>
                          ) : (
                            unread && onMarkRead && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="w-full h-9 text-xs text-primary bg-primary/10 hover:bg-primary/20"
                                onClick={() => onMarkRead(announcement.id)}
                              >
                                Mark as Read
                              </Button>
                            )
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

        {activeTab === "my" && myPagination && myPagination.count > myPagination.pageSize && (
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

        {activeTab === "received" && receivedPagination && receivedPagination.count > receivedPagination.pageSize && (
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
          <DialogContent className="w-[90%] sm:max-w-2xl max-h-[85vh] sm:max-h-[90vh] overflow-hidden rounded-xl sm:rounded-2xl p-0 border-none shadow-2xl flex flex-col bg-background">
            <div className="p-6 sm:p-8 space-y-6 flex-1 overflow-y-auto custom-scrollbar">
              <DialogHeader className="space-y-4">
                <div className="flex items-center justify-between gap-4 pr-6 sm:pr-0">
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
                <div className="flex items-center justify-between gap-4 pr-6 sm:pr-0">
                  <DialogTitle className="text-lg sm:text-xl font-semibold tracking-tight text-foreground flex-1 min-w-0">
                    {viewingAnnouncement?.title}
                  </DialogTitle>

                  {viewingAnnouncement?.exam_data && viewingAnnouncement.exam_data.length > 0 && (
                    <div className="flex items-center gap-2 shrink-0">
                      {/* Mobile Export Button */}
                      <Button
                        variant="outline"
                        size="icon"
                        className="flex sm:hidden dark:bg-zinc-800 dark:text-zinc-100 dark:hover:bg-zinc-700 bg-white text-zinc-900 border border-zinc-200 h-9 w-9 items-center justify-center shrink-0 p-0"
                        onClick={handleExportExamPDF}
                        disabled={exportingPDF}
                      >
                        {exportingPDF ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <FileDown className="w-3.5 h-3.5" />
                        )}
                      </Button>

                      {/* Desktop Export Button */}
                      <Button
                        variant="outline"
                        size="sm"
                        className="hidden sm:flex bg-primary hover:bg-primary/90 text-white border-primary h-9 px-3.5 rounded-lg items-center justify-center gap-1.5 shadow-sm text-xs font-semibold shrink-0"
                        onClick={handleExportExamPDF}
                        disabled={exportingPDF}
                      >
                        {exportingPDF ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <FileDown className="w-3.5 h-3.5" />
                        )}
                        <span>{exportingPDF ? "Exporting..." : "Export PDF"}</span>
                      </Button>
                    </div>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground pb-4 border-b border-border/50">
                  <div className="flex items-center gap-2 bg-muted/50 px-2 py-1 rounded-full">
                    <div className="w-6 h-6 rounded-full bg-primary text-[12px] text-white flex items-center justify-center font-semibold shadow-sm">
                      {viewingAnnouncement?.created_by_name?.charAt(0).toUpperCase()}
                    </div>
                    <span className="font-semibold text-foreground/80">
                      From: {viewingAnnouncement?.created_by_name}
                      {viewingAnnouncement?.created_by_role && ` (${formatRoleName(viewingAnnouncement.created_by_role)})`}
                    </span>
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
                  <p className="text-sm sm:text-base text-foreground/90 leading-relaxed whitespace-pre-wrap font-medium">
                    {formatAnnouncementMessage(viewingAnnouncement?.message || '')}
                  </p>
                </div>
              </div>

              {viewingAnnouncement?.exam_data && viewingAnnouncement.exam_data.length > 0 && (
                <div className="mt-6 space-y-4">
                  <h4 className="text-sm font-semibold text-foreground uppercase tracking-wider">Detailed Schedule</h4>
                  <div className={`overflow-x-auto rounded-xl border ${theme === 'dark' ? 'border-border/50' : 'border-gray-200'}`}>
                    <Table>
                      <TableHeader className={theme === 'dark' ? 'bg-muted/30' : 'bg-gray-50'}>
                        <TableRow>
                          <TableHead className="font-semibold py-3 text-xs uppercase tracking-wider">Subject</TableHead>
                          <TableHead className="font-semibold py-3 text-xs uppercase tracking-wider">Date</TableHead>
                          <TableHead className="font-semibold py-3 text-xs uppercase tracking-wider">Time</TableHead>
                          <TableHead className="font-semibold py-3 text-xs uppercase tracking-wider">Room</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {viewingAnnouncement.exam_data.map((exam: any, idx: number) => (
                          <TableRow key={idx} className={theme === 'dark' ? 'hover:bg-muted/20 border-border/50' : 'hover:bg-gray-50/50'}>
                            <TableCell className="font-medium">{exam.subjectName}</TableCell>
                            <TableCell>{format(new Date(exam.dateStr), 'dd/MM/yyyy')}</TableCell>
                            <TableCell className="text-muted-foreground whitespace-nowrap">{exam.timeStr}</TableCell>
                            <TableCell>{exam.venue || 'TBD'}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}

              {viewingAnnouncement?.is_emergency && (
                <div className={`p-4 rounded-xl border space-y-3 ${theme === 'dark' ? 'bg-red-950/20 border-red-900/30' : 'bg-red-50/50 border-red-100'}`}>
                  <h4 className="text-xs font-semibold text-red-600 dark:text-red-400 uppercase tracking-wider flex items-center gap-1.5">
                    <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
                    Live Incident Details
                  </h4>
                  {viewingAnnouncement.latitude !== undefined && viewingAnnouncement.latitude !== null && (
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-background/55 p-3 rounded-lg border border-border/50">
                      <div className="flex items-center gap-2 text-sm">
                        <MapPin className="w-4 h-4 text-red-500 shrink-0" />
                        <span className="font-semibold text-foreground/80">
                          Location Co-ordinates: {viewingAnnouncement.latitude?.toFixed(6)}, {viewingAnnouncement.longitude?.toFixed(6)}
                        </span>
                      </div>
                      <a
                        href={`https://www.google.com/maps/search/?api=1&query=${viewingAnnouncement.latitude},${viewingAnnouncement.longitude}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs font-bold text-primary hover:underline flex items-center gap-1 bg-primary/10 px-3 py-1.5 rounded border border-primary/20 w-full sm:w-auto justify-center"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        Get Direction
                      </a>
                    </div>
                  )}
                  <div className="flex gap-2 pt-1">
                    <Button
                      onClick={() => {
                        if (onResolveEmergency && viewingAnnouncement.incident_id) {
                          onResolveEmergency(viewingAnnouncement.incident_id);
                          setViewingAnnouncement(null);
                        }
                      }}
                      className="w-full text-xs font-semibold h-10 bg-green-600 hover:bg-green-700 text-white flex items-center justify-center gap-1.5 rounded-xl border border-transparent"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      Resolve Emergency
                    </Button>
                  </div>
                </div>
              )}

              {viewingAnnouncement?.gate_pass && (
                <div className={`p-4 rounded-xl border space-y-3 ${theme === 'dark' ? 'bg-purple-950/20 border-purple-900/30' : 'bg-purple-50/50 border-purple-100'}`}>
                  <h4 className="text-xs font-semibold text-purple-600 dark:text-purple-400 uppercase tracking-wider">Gate Pass Linked</h4>
                  <p className="text-xs text-muted-foreground font-medium">
                    This announcement is linked to a student gate pass request. Please navigate to the dedicated **Gate Pass Requests** page to review, approve, or reject this request.
                  </p>
                  {window.location.pathname.includes('/warden') && (
                    <Button
                      onClick={() => {
                        setViewingAnnouncement(null);
                        navigate('/warden/gate-passes');
                      }}
                      className="w-full text-xs font-semibold h-9 bg-primary hover:bg-primary/90 text-white rounded-xl"
                    >
                      Go to Gate Pass Requests
                    </Button>
                  )}
                </div>
              )}

              <div className="pt-4 flex flex-col gap-3 border-t border-border/30">
                {viewingAnnouncement?.target_roles && viewingAnnouncement.target_roles.length > 0 && (
                  <div className="flex flex-col gap-1.5">
                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">To:</span>
                    <div className="flex flex-wrap gap-1.5">
                      {viewingAnnouncement.target_roles.map((role) => (
                        <Badge key={role} variant="outline" className="text-xs font-semibold px-2 py-0.5 rounded-md bg-background">
                          {formatRoleName(role)}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
                <div className="flex justify-between items-center mt-1">
                  <div className="text-sm text-muted-foreground font-semibold opacity-70">
                    {viewingAnnouncement?.is_emergency ? "Active Ticket" : `Expires: ${viewingAnnouncement && formatDate(viewingAnnouncement.expires_at)}`}
                  </div>
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
