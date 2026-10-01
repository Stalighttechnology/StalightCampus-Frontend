import React, { useState, useEffect } from "react";
import {
  Calendar,
  Award,
  FileText,
  Download,
  User,
  Users,
  Tag,
  Loader2,
} from "lucide-react";
import { sportsWellnessApi, StudentActivityRecord } from "../../../utils/sports_wellness_api";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "../../ui/dialog";
import { Badge } from "../../ui/badge";
import { Button } from "../../ui/button";
import { Card, CardContent } from "../../ui/card";
import { cn } from "../../../lib/utils";

interface ActivityDetailModalProps {
  activity: StudentActivityRecord | null;
  activityId?: number | null;
  onClose: () => void;
}

export const ActivityDetailModal: React.FC<ActivityDetailModalProps> = ({
  activity: initialActivity,
  activityId,
  onClose,
}) => {
  const [detail, setDetail] = useState<StudentActivityRecord | null>(initialActivity);
  const [loading, setLoading] = useState(false);

  const targetId = activityId || initialActivity?.id;

  useEffect(() => {
    if (!targetId) {
      setDetail(null);
      return;
    }

    setDetail(initialActivity);
    setLoading(true);

    sportsWellnessApi
      .fetchActivityDetail(targetId)
      .then((data) => {
        setDetail(data);
      })
      .catch((err) => {
        console.error("Failed to fetch activity detail:", err);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [targetId]);

  if (!targetId && !initialActivity) return null;

  const activity = detail || initialActivity;
  if (!activity) return null;

  const isTeam = activity.participation_type === "team" || Boolean(activity.team_name);
  const teamMembers = activity.team_members_data || [];

  return (
    <Dialog open={Boolean(targetId)} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="w-[90vw] max-w-[90vw] sm:max-w-xl sm:w-full h-[80vh] sm:h-auto max-h-[80vh] sm:max-h-[90vh] rounded-2xl sm:rounded-lg overflow-y-scroll custom-scrollbar [scrollbar-gutter:stable] p-4 sm:p-6">
        <DialogHeader className="pb-2 border-b border-border/40">
          <div className="flex flex-wrap items-center gap-2 mb-1.5">
            <Badge
              variant="secondary"
              className="font-semibold text-xs bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800"
            >
              {activity.activity_type_display}
            </Badge>
            <Badge
              variant="outline"
              className="font-semibold text-xs border-purple-300 dark:border-purple-800 text-purple-700 dark:text-purple-300"
            >
              {activity.level_display}
            </Badge>
            <Badge
              variant="secondary"
              className={cn(
                "text-xs font-semibold flex items-center gap-1",
                isTeam
                  ? "bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border-blue-200 dark:border-blue-800"
                  : "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800"
              )}
            >
              {isTeam ? <Users className="h-3 w-3" /> : <User className="h-3 w-3" />}
              {isTeam ? "Team Participation" : "Solo Participation"}
            </Badge>
          </div>
          <DialogTitle className="text-xl font-bold tracking-tight">
            {activity.activity_name}
          </DialogTitle>
          <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground pt-1">
            <span className="flex items-center gap-1 font-medium text-foreground">
              <User className="h-3.5 w-3.5 text-primary" /> {activity.student_name} ({activity.usn})
              {activity.branch_name && (
                <span className="text-muted-foreground font-normal">• {activity.branch_name}</span>
              )}
            </span>
            <span className="flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5" /> {activity.event_date}
            </span>
            {activity.academic_year && (
              <span className="flex items-center gap-1">
                <Tag className="h-3.5 w-3.5" /> {activity.academic_year}
              </span>
            )}
          </div>
        </DialogHeader>

        <div className="space-y-4 text-sm py-2">
          {isTeam && activity.team_name && (
            <div className="p-3 bg-blue-500/5 border border-blue-500/20 rounded-xl flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                <span className="text-xs text-muted-foreground font-medium">Team Name:</span>
                <span className="text-xs font-bold text-foreground">{activity.team_name}</span>
              </div>
              <Badge variant="outline" className="text-[11px] font-semibold">
                {teamMembers.length > 0 ? `${teamMembers.length} Members` : "Squad"}
              </Badge>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3 p-3 bg-muted/40 rounded-xl border border-border/50">
            <div>
              <span className="text-xs text-muted-foreground block">Award / Position</span>
              <span className="font-semibold text-foreground flex items-center gap-1.5 mt-0.5">
                <Award className="h-4 w-4 text-amber-500" />
                {activity.position_award_display}
              </span>
            </div>
            <div>
              <span className="text-xs text-muted-foreground block">Role / Designation</span>
              <span className="font-semibold text-foreground block mt-0.5">
                {activity.role_designation || (isTeam ? "Team Squad" : "Participant")}
              </span>
            </div>
          </div>

          {isTeam && teamMembers.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <Users className="h-3.5 w-3.5 text-primary" /> Team Roster & Roles
              </h4>
              <div className="divide-y divide-border/40 rounded-xl border border-border/60 bg-background overflow-hidden">
                {teamMembers.map((member, idx) => (
                  <div
                    key={member.student_id || idx}
                    className="p-2.5 flex items-center justify-between gap-2 hover:bg-muted/20 text-xs"
                  >
                    <div className="flex items-center gap-2.5">
                      <div
                        className={cn(
                          "w-5 h-5 rounded-full flex items-center justify-center font-bold text-[10px] shrink-0",
                          member.role === "captain"
                            ? "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300"
                            : member.role === "vice_captain"
                            ? "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300"
                            : "bg-muted text-muted-foreground"
                        )}
                      >
                        {member.role === "captain" ? "C" : member.role === "vice_captain" ? "VC" : idx + 1}
                      </div>
                      <div>
                        <span className="font-semibold text-foreground mr-1.5">{member.student_name}</span>
                        <span className="text-muted-foreground font-mono text-[11px]">({member.usn})</span>
                      </div>
                    </div>
                    <div>
                      {member.role === "captain" && (
                        <Badge variant="secondary" className="bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-800 text-[10px] py-0.5 px-2 font-semibold">
                          Captain (C)
                        </Badge>
                      )}
                      {member.role === "vice_captain" && (
                        <Badge variant="secondary" className="bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border-blue-300 dark:border-blue-800 text-[10px] py-0.5 px-2 font-semibold">
                          Vice-Captain (VC)
                        </Badge>
                      )}
                      {(!member.role || member.role === "member") && (
                        <Badge variant="outline" className="text-[10px] text-muted-foreground py-0.5 px-2 font-normal">
                          Member
                        </Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activity.description && (
            <div>
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
                Description & Remarks
              </h4>
              <p className="text-foreground bg-muted/30 p-3 rounded-lg text-xs leading-relaxed whitespace-pre-line border border-border/40">
                {activity.description}
              </p>
            </div>
          )}

          {activity.certificate_url ? (
            <div>
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                Attached Certificate / Proof
              </h4>
              <Card className="border-border/60">
                <CardContent className="p-3 flex items-center justify-between">
                  <div className="flex items-center gap-2 overflow-hidden">
                    <FileText className="text-primary h-5 w-5 shrink-0" />
                    <span className="truncate text-xs font-medium text-foreground">
                      Activity_Certificate_{activity.id}
                    </span>
                  </div>
                  <Button size="sm" asChild className="gap-1.5 text-xs">
                    <a href={activity.certificate_url} target="_blank" rel="noopener noreferrer">
                      <Download className="h-3.5 w-3.5" /> View / Download
                    </a>
                  </Button>
                </CardContent>
              </Card>
            </div>
          ) : (
            <div className="p-3 text-center text-xs text-muted-foreground border border-dashed border-border rounded-lg">
              No certificate document uploaded for this activity.
            </div>
          )}
        </div>

        <DialogFooter className="pt-2 border-t border-border/40">
          <Button variant="secondary" size="sm" onClick={onClose}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
