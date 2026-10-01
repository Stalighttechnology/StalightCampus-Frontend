import React from "react";
import {
  Trophy,
  Award,
  Eye,
  Edit2,
  Trash2,
  FileText,
  Users,
  Calendar,
  Loader2,
} from "lucide-react";
import { StudentActivityRecord } from "../../../utils/sports_wellness_api";
import { Button } from "../../ui/button";
import { Badge } from "../../ui/badge";
import { useTheme } from "../../../context/ThemeContext";
import {
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../ui/table";

interface ActivityListProps {
  activities: StudentActivityRecord[];
  loading: boolean;
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
  onPageChange: (newPage: number) => void;
  onPageSizeChange: (newPageSize: number) => void;
  readOnly?: boolean;
  onViewDetail: (activity: StudentActivityRecord) => void;
  onEditActivity?: (activity: StudentActivityRecord) => void;
  onDeleteActivity?: (id: number) => void;
}

export const ActivityList: React.FC<ActivityListProps> = ({
  activities,
  loading,
  totalCount,
  page,
  pageSize,
  totalPages,
  onPageChange,
  readOnly = true,
  onViewDetail,
  onEditActivity,
  onDeleteActivity,
}) => {
  const { theme } = useTheme();

  const getBadgeStyle = (type: string) => {
    switch (type) {
      case "sports":
        return "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800";
      case "nss":
        return "bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300 border-amber-300 dark:border-amber-800";
      case "ncc_guides":
        return "bg-cyan-100 text-cyan-800 dark:bg-cyan-950/50 dark:text-cyan-300 border-cyan-300 dark:border-cyan-800";
      case "cultural":
        return "bg-purple-100 text-purple-800 dark:bg-purple-950/50 dark:text-purple-300 border-purple-300 dark:border-purple-800";
      default:
        return "bg-indigo-100 text-indigo-800 dark:bg-indigo-950/50 dark:text-indigo-300 border-indigo-300 dark:border-indigo-800";
    }
  };

  return (
    <div className="overflow-hidden bg-card">
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground space-y-2">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <span className="text-sm font-medium">Loading activity records...</span>
        </div>
      ) : activities.length === 0 ? (
        <div className="text-center py-20 px-4 space-y-3">
          <div className="w-16 h-16 rounded-3xl bg-muted flex items-center justify-center mx-auto text-muted-foreground">
            <Trophy className="w-8 h-8 opacity-60 text-amber-500" />
          </div>
          <h3 className="font-bold text-lg text-foreground">No Activity Records Found</h3>
          <p className="text-xs sm:text-sm text-muted-foreground max-w-md mx-auto">
            {readOnly
              ? "No extra-curricular records match the current filter criteria."
              : "Click 'Record Activity' above to log student participations and achievements."}
          </p>
        </div>
      ) : (
        <>
          {/* Desktop Table View (Large Screens) */}
          <div className="hidden lg:block w-full max-w-full overflow-x-auto overflow-y-scroll max-h-[420px] custom-scrollbar [scrollbar-gutter:stable] [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar]:block [&::-webkit-scrollbar-track]:bg-muted/40 [&::-webkit-scrollbar-thumb]:bg-muted-foreground/40 hover:[&::-webkit-scrollbar-thumb]:bg-muted-foreground/60 [&::-webkit-scrollbar-thumb]:rounded-full border-b border-border">
            <table className="w-full caption-bottom text-sm border-collapse min-w-[850px]">
              <TableHeader className="sticky top-0 z-20 bg-muted/95 backdrop-blur-md shadow-xs">
                <TableRow className="border-b border-border bg-muted/95">
                  <TableHead className="text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground py-3 w-12 sticky top-0 bg-muted/95">
                    #
                  </TableHead>
                  <TableHead className="text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground py-3 min-w-[200px] sticky top-0 bg-muted/95">
                    Student
                  </TableHead>
                  <TableHead className="text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground py-3 sticky top-0 bg-muted/95">
                    Category
                  </TableHead>
                  <TableHead className="text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground py-3 sticky top-0 bg-muted/95">
                    Activity & Award
                  </TableHead>
                  <TableHead className="text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground py-3 sticky top-0 bg-muted/95">
                    Level
                  </TableHead>
                  {!readOnly && (
                    <TableHead className="text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground py-3 sticky top-0 bg-muted/95">
                      Actions
                    </TableHead>
                  )}
                </TableRow>
              </TableHeader>
              <TableBody>
                {activities.map((act, idx) => {
                  const rowNumber = (page - 1) * pageSize + idx + 1;
                  return (
                    <TableRow
                      key={act.id}
                      className={theme === "dark" ? "hover:bg-muted/50" : "hover:bg-gray-50/80"}
                    >
                      <TableCell className="text-center text-muted-foreground font-mono text-xs">
                        {rowNumber}
                      </TableCell>

                      <TableCell>
                        <div className="flex flex-col gap-0.5">
                          <div className="font-semibold text-foreground text-sm leading-tight flex items-center gap-1.5">
                            {act.student_name}
                            {act.participation_type === "team" && (
                              <Badge variant="outline" className="text-[10px] py-0 px-1.5 font-semibold text-blue-600 dark:text-blue-400 border-blue-300 dark:border-blue-800 gap-0.5">
                                <Users className="h-3 w-3" /> Team
                              </Badge>
                            )}
                          </div>
                          <div className="text-xs text-muted-foreground font-mono">
                            {act.usn}
                          </div>
                          {act.team_name && (
                            <div className="text-xs font-medium text-blue-600 dark:text-blue-400 truncate max-w-[200px]">
                              Squad: {act.team_name}
                            </div>
                          )}
                        </div>
                      </TableCell>

                      <TableCell className="text-center">
                        <Badge variant="outline" className={`font-semibold text-xs py-0.5 px-2.5 ${getBadgeStyle(act.activity_type)}`}>
                          {act.activity_type_display}
                        </Badge>
                      </TableCell>

                      <TableCell className="text-center">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => onViewDetail(act)}
                          className="h-7 text-xs gap-1 px-2.5 hover:bg-primary/10 hover:text-primary hover:border-primary/40 transition-colors"
                        >
                          <Eye className="h-3.5 w-3.5 text-primary" />
                          <span>View</span>
                        </Button>
                      </TableCell>

                      <TableCell className="text-center">
                        <span className="text-xs font-medium text-foreground">
                          {act.level_display}
                        </span>
                      </TableCell>

                      {!readOnly && (
                        <TableCell className="text-center px-4 py-3">
                          <div className="flex items-center justify-center gap-1">
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
                              title="View Details"
                              onClick={() => onViewDetail(act)}
                            >
                              <Eye className="w-4 h-4" />
                            </Button>

                            {onEditActivity && (
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-8 w-8 p-0 text-muted-foreground hover:text-amber-600"
                                title="Edit Activity"
                                onClick={() => onEditActivity(act)}
                              >
                                <Edit2 className="w-4 h-4" />
                              </Button>
                            )}

                            {onDeleteActivity && (
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-8 w-8 p-0 text-destructive hover:bg-destructive/10"
                                title="Delete Activity"
                                onClick={() => {
                                  if (window.confirm("Are you sure you want to delete this activity record?")) {
                                    onDeleteActivity(act.id);
                                  }
                                }}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      )}
                    </TableRow>
                  );
                })}
              </TableBody>
            </table>
          </div>

          {/* Mobile & Tablet Card List View (< 1024px) */}
          <div className="block lg:hidden max-h-[460px] overflow-y-scroll custom-scrollbar p-3 sm:p-4 space-y-3 border-b border-border">
            {activities.map((act, idx) => {
              const rowNumber = (page - 1) * pageSize + idx + 1;
              return (
                <div
                  key={act.id}
                  className="p-3.5 sm:p-4 rounded-xl border border-border bg-card shadow-xs flex flex-col gap-2.5 overflow-hidden"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 sm:gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-xs font-mono font-bold px-1.5 py-0.5 rounded bg-muted text-muted-foreground shrink-0">
                        #{rowNumber}
                      </span>
                      <div className="min-w-0">
                        <div className="font-semibold text-foreground text-sm flex items-center gap-1.5">
                          <span className="truncate">{act.student_name}</span>
                          {act.participation_type === "team" && (
                            <Badge variant="outline" className="text-[10px] py-0 px-1 font-semibold text-blue-600 border-blue-300 shrink-0">
                              Team
                            </Badge>
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground font-mono">{act.usn}</div>
                      </div>
                    </div>

                    <Badge variant="outline" className={`font-semibold text-[10px] sm:text-[11px] py-0.5 px-2 w-fit shrink-0 self-start sm:self-auto ${getBadgeStyle(act.activity_type)}`}>
                      {act.activity_type_display}
                    </Badge>
                  </div>

                  <div className="bg-muted/30 p-2.5 sm:p-3 rounded-lg border border-border/50 space-y-1 text-xs">
                    <div className="font-semibold text-foreground text-sm leading-snug">
                      {act.activity_name}
                    </div>
                    <div className="text-muted-foreground pt-1 border-t border-border/40 text-[11px]">
                      <span>Level: <strong className="text-foreground font-semibold">{act.level_display}</strong></span>
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-1 pt-1 border-t border-border/40">
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 sm:h-8 px-2.5 text-xs gap-1"
                      onClick={() => onViewDetail(act)}
                    >
                      <Eye className="w-3.5 h-3.5" /> Details
                    </Button>

                    {!readOnly && onEditActivity && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 sm:h-8 w-7 sm:w-8 p-0 text-muted-foreground hover:text-amber-600"
                        onClick={() => onEditActivity(act)}
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </Button>
                    )}

                    {!readOnly && onDeleteActivity && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 sm:h-8 w-7 sm:w-8 p-0 text-destructive hover:bg-destructive/10"
                        onClick={() => {
                          if (window.confirm("Delete activity record?")) onDeleteActivity(act.id);
                        }}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Standard Pagination matching College Issued Items */}
          {totalCount > 0 && (
            <div className="flex flex-col sm:flex-row justify-between items-center gap-3 text-xs sm:text-sm text-muted-foreground px-4 sm:px-6 py-3.5 border-t border-border mt-auto">
              <div>
                Showing {Math.min((page - 1) * pageSize + 1, totalCount)} to {Math.min(page * pageSize, totalCount)} of {totalCount} activities
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onPageChange(Math.max(1, page - 1))}
                  disabled={page === 1 || loading}
                  className="bg-primary hover:bg-primary/90 text-white border-primary h-8 px-4 text-xs transition-all"
                >
                  Previous
                </Button>

                <div className="flex items-center justify-center min-w-[2rem]">
                  <span className="text-xs sm:text-sm font-semibold text-foreground">
                    {page}
                  </span>
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onPageChange(Math.min(totalPages, page + 1))}
                  disabled={page >= totalPages || loading}
                  className="bg-primary hover:bg-primary/90 text-white border-primary h-8 px-4 text-xs transition-all"
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};
