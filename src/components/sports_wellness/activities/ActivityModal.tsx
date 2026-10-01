import React, { useState } from "react";
import {
  Upload,
  FileText,
  Loader2,
  AlertCircle,
  Calendar as CalendarIcon,
  User,
  Users,
  Trash2,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { format } from "date-fns";
import {
  sportsWellnessApi,
  StudentActivityRecord,
  StudentSearchItem,
} from "../../../utils/sports_wellness_api";
import { StudentSearchSelector } from "../common/StudentSearchSelector";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "../../ui/dialog";
import { Input } from "../../ui/input";
import { Textarea } from "../../ui/textarea";
import { Button } from "../../ui/button";
import { Alert, AlertDescription } from "../../ui/alert";
import { Badge } from "../../ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "../../ui/popover";
import { Calendar } from "../../ui/calendar";
import { cn } from "../../../lib/utils";

interface ActivityModalProps {
  activity: StudentActivityRecord | null;
  selectedStudent: StudentSearchItem | null;
  onClose: () => void;
  onSuccess: () => void;
}

interface TeamMemberItem {
  student_id: number;
  student_name: string;
  usn: string;
  branch_name?: string;
  role: "captain" | "vice_captain" | "member";
}

export const ActivityModal: React.FC<ActivityModalProps> = ({
  activity,
  selectedStudent: initialSelectedStudent,
  onClose,
  onSuccess,
}) => {
  const [student, setStudent] = useState<StudentSearchItem | null>(
    initialSelectedStudent ||
      (activity
        ? {
            id: activity.student,
            name: activity.student_name,
            usn: activity.usn,
            branch_name: activity.branch_name,
            batch_name: activity.batch_name,
            semester_name: activity.semester_name,
            blood_group: "",
            has_medical_alert: false,
          }
        : null)
  );

  const [participationType, setParticipationType] = useState<"solo" | "team">(
    activity?.participation_type || "solo"
  );
  const [teamName, setTeamName] = useState(activity?.team_name || "");
  const [rosterPage, setRosterPage] = useState(1);
  const rosterPageSize = 10;

  const [teamMembers, setTeamMembers] = useState<TeamMemberItem[]>(() => {
    if (activity?.team_members_data && Array.isArray(activity.team_members_data)) {
      return activity.team_members_data;
    }
    if (activity && activity.participation_type === "team") {
      return [
        {
          student_id: activity.student,
          student_name: activity.student_name,
          usn: activity.usn,
          branch_name: activity.branch_name,
          role: activity.team_role || "captain",
        },
      ];
    }
    if (initialSelectedStudent) {
      return [
        {
          student_id: initialSelectedStudent.id,
          student_name: initialSelectedStudent.name,
          usn: initialSelectedStudent.usn,
          branch_name: initialSelectedStudent.branch_name,
          role: "captain",
        },
      ];
    }
    return [];
  });

  const [formData, setFormData] = useState({
    activity_type: activity?.activity_type || "sports",
    activity_name: activity?.activity_name || "",
    academic_year: activity?.academic_year || "2025-2026",
    event_date: activity?.event_date || new Date().toISOString().split("T")[0],
    level: activity?.level || "intra_college",
    position_award: activity?.position_award || "participant",
    role_designation: activity?.role_designation || "",
    description: activity?.description || "",
  });

  const [certificateFile, setCertificateFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const activityTypes = [
    { value: "sports", label: "Sports & Athletics" },
    { value: "nss", label: "National Service Scheme (NSS)" },
    { value: "ncc_guides", label: "NCC / Scouts & Guides" },
    { value: "cultural", label: "Cultural & Arts" },
    { value: "club_society", label: "Clubs & Societies" },
    { value: "hackathon_tech", label: "Technical / Hackathons" },
    { value: "other", label: "Other Approved Activity" },
  ];

  const levelChoices = [
    { value: "intra_college", label: "Intra-College / Departmental" },
    { value: "inter_college", label: "Inter-College" },
    { value: "district", label: "District Level" },
    { value: "university", label: "University Level" },
    { value: "state", label: "State Level" },
    { value: "national", label: "National Level" },
    { value: "international", label: "International Level" },
  ];

  const positionChoices = [
    { value: "participant", label: "Participant" },
    { value: "gold_medal", label: "Gold Medal (1st Place)" },
    { value: "winner", label: "Winner (1st Place)" },
    { value: "1st_place", label: "1st Place (Winner)" },
    { value: "silver_medal", label: "Silver Medal (2nd Place)" },
    { value: "runner_up", label: "Runner Up (2nd Place)" },
    { value: "2nd_place", label: "2nd Place (Runner Up)" },
    { value: "bronze_medal", label: "Bronze Medal (3rd Place)" },
    { value: "second_runner_up", label: "Second Runner Up (3rd Place)" },
    { value: "3rd_place", label: "3rd Place (Second Runner Up)" },
    { value: "special_mention", label: "Special Mention / Consolation" },
    { value: "captain_lead", label: "Captain / Team Lead" },
    { value: "organizer_volunteer", label: "Organizer / Volunteer" },
  ];

  const handleAddTeamMember = (selected: StudentSearchItem | null) => {
    if (!selected) return;
    if (teamMembers.some((m) => m.student_id === selected.id)) {
      setError(`${selected.name} (${selected.usn}) is already in the team roster.`);
      return;
    }

    const isFirst = teamMembers.length === 0;
    const newMember: TeamMemberItem = {
      student_id: selected.id,
      student_name: selected.name,
      usn: selected.usn,
      branch_name: selected.branch_name,
      role: isFirst ? "captain" : "member",
    };

    const updated = [...teamMembers, newMember];
    setTeamMembers(updated);
    setRosterPage(Math.max(1, Math.ceil(updated.length / rosterPageSize)));
    setError(null);

    // If no main student selected, set this student as the primary
    if (!student || isFirst) {
      setStudent(selected);
    }
  };

  const handleRemoveTeamMember = (studentId: number) => {
    const updated = teamMembers.filter((m) => m.student_id !== studentId);
    setTeamMembers(updated);
    if ((rosterPage - 1) * rosterPageSize >= updated.length && rosterPage > 1) {
      setRosterPage(rosterPage - 1);
    }

    if (student?.id === studentId) {
      if (updated.length > 0) {
        const cap = updated.find((m) => m.role === "captain") || updated[0];
        setStudent({
          id: cap.student_id,
          name: cap.student_name,
          usn: cap.usn,
          branch_name: cap.branch_name || "",
          batch_name: "",
          semester_name: "",
          blood_group: "",
          has_medical_alert: false,
        });
      } else {
        setStudent(null);
      }
    }
  };

  const handleRoleChange = (studentId: number, newRole: "captain" | "vice_captain" | "member") => {
    const updated = teamMembers.map((m) => {
      if (m.student_id === studentId) {
        return { ...m, role: newRole };
      }
      // If promoting this member to captain, change previous captain to vice_captain or member
      if (newRole === "captain" && m.role === "captain") {
        return { ...m, role: "member" as const };
      }
      return m;
    });

    setTeamMembers(updated);

    if (newRole === "captain") {
      const cap = updated.find((m) => m.student_id === studentId);
      if (cap) {
        setStudent({
          id: cap.student_id,
          name: cap.student_name,
          usn: cap.usn,
          branch_name: cap.branch_name || "",
          batch_name: "",
          semester_name: "",
          blood_group: "",
          has_medical_alert: false,
        });
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (participationType === "solo") {
      if (!student) {
        setError("Please select a student for solo participation.");
        return;
      }
    } else {
      if (teamMembers.length === 0) {
        setError("Please add at least one member to the team roster.");
        return;
      }
      if (!teamName.trim()) {
        setError("Please provide a Team / Squad Name.");
        return;
      }
    }

    if (!formData.activity_name.trim()) {
      setError("Activity / Event Name is required.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const primaryStudent =
        participationType === "solo"
          ? student
          : teamMembers.find((m) => m.role === "captain") || teamMembers[0];

      if (!primaryStudent) {
        setError("Could not identify primary student.");
        setLoading(false);
        return;
      }

      const primaryStudentId =
        "id" in primaryStudent ? primaryStudent.id : primaryStudent.student_id;

      const data = new FormData();
      data.append("student", primaryStudentId.toString());
      data.append("participation_type", participationType);
      data.append("activity_type", formData.activity_type);
      data.append("activity_name", formData.activity_name);
      data.append("academic_year", formData.academic_year);
      data.append("event_date", formData.event_date);
      data.append("level", formData.level);
      data.append("position_award", formData.position_award);
      data.append("role_designation", formData.role_designation);
      data.append("description", formData.description);

      if (participationType === "team") {
        data.append("team_name", teamName.trim());
        const primaryRole =
          teamMembers.find((m) => m.student_id === primaryStudentId)?.role || "captain";
        data.append("team_role", primaryRole);
        data.append("team_members_data", JSON.stringify(teamMembers));
      } else {
        data.append("team_name", "");
        data.append("team_role", "member");
        data.append("team_members_data", JSON.stringify([]));
      }

      if (certificateFile) {
        data.append("certificate_file", certificateFile);
      }

      if (activity) {
        await sportsWellnessApi.updateActivity(activity.id, data);
      } else {
        await sportsWellnessApi.createActivity(data);
      }
      onSuccess();
    } catch (err: any) {
      setError(err.message || "An error occurred while saving activity.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={true} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="w-[90vw] max-w-[90vw] sm:max-w-2xl sm:w-full h-[80vh] sm:h-auto max-h-[80vh] sm:max-h-[90vh] rounded-2xl sm:rounded-lg overflow-y-scroll custom-scrollbar [scrollbar-gutter:stable] p-4 sm:p-6">
        <DialogHeader className="pb-2 border-b border-border/40">
          <DialogTitle className="text-lg font-bold">
            {activity ? "Edit Activity Record" : "Record Student Activity / Achievement"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 text-sm py-2">
          {error && (
            <Alert variant="destructive" className="py-2.5">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="text-xs">{error}</AlertDescription>
            </Alert>
          )}

          {/* Mode Switch: Solo vs Team */}
          <div>
            <label className="block text-xs font-semibold text-foreground mb-1.5">
              Participation Mode <span className="text-destructive">*</span>
            </label>
            <div className="grid grid-cols-2 gap-2 bg-muted/60 p-1 rounded-xl border border-border/50">
              <button
                type="button"
                onClick={() => setParticipationType("solo")}
                className={cn(
                  "flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-semibold transition-all",
                  participationType === "solo"
                    ? "bg-background text-foreground shadow-sm border border-border/50"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <User className="h-4 w-4 text-primary" />
                Solo / Individual
              </button>
              <button
                type="button"
                onClick={() => {
                  setParticipationType("team");
                  if (student && teamMembers.length === 0) {
                    setTeamMembers([
                      {
                        student_id: student.id,
                        student_name: student.name,
                        usn: student.usn,
                        branch_name: student.branch_name,
                        role: "captain",
                      },
                    ]);
                  }
                }}
                className={cn(
                  "flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-semibold transition-all",
                  participationType === "team"
                    ? "bg-background text-foreground shadow-sm border border-border/50"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Users className="h-4 w-4 text-primary" />
                Team / Group
              </button>
            </div>
          </div>

          {/* Solo Student Selector */}
          {participationType === "solo" ? (
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1.5">
                Select Student <span className="text-destructive">*</span>
              </label>
              <StudentSearchSelector
                selectedStudent={student}
                onSelectStudent={setStudent}
                placeholder="Search by student name or USN..."
              />
            </div>
          ) : (
            /* Team Participation Configuration */
            <div className="space-y-3.5 p-3.5 bg-muted/30 rounded-xl border border-border/60">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-primary" />
                  <span className="text-xs font-bold text-foreground">Team Details & Roster</span>
                </div>
                <Badge variant="secondary" className="text-[11px] font-semibold px-2 py-0.5">
                  {teamMembers.length} {teamMembers.length === 1 ? "Member" : "Members"}
                </Badge>
              </div>

              <div>
                <label className="block text-xs font-semibold text-foreground mb-1.5">
                  Team / Squad Name <span className="text-destructive">*</span>
                </label>
                <Input
                  type="text"
                  required={participationType === "team"}
                  value={teamName}
                  onChange={(e) => setTeamName(e.target.value)}
                  placeholder="e.g. VTU Basketball Squad, Team CyberSec, Rover Explorers"
                  className="h-9 text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-foreground mb-1.5">
                  Search & Add Team Members
                </label>
                <StudentSearchSelector
                  selectedStudent={null}
                  onSelectStudent={handleAddTeamMember}
                  placeholder="Search student by name or USN to add to roster..."
                />
              </div>

              {teamMembers.length > 0 && (
                <div className="space-y-2 mt-2">
                  <div className="flex items-center justify-between text-[11px] font-semibold text-muted-foreground">
                    <span>TEAM ROSTER ({teamMembers.length})</span>
                    <span>ROLE / DESIGNATION</span>
                  </div>
                  <div className="divide-y divide-border/40 rounded-xl border border-border/60 bg-background overflow-hidden shadow-xs">
                    {teamMembers
                      .slice((rosterPage - 1) * rosterPageSize, rosterPage * rosterPageSize)
                      .map((member, idx) => {
                        const globalIdx = (rosterPage - 1) * rosterPageSize + idx;
                        return (
                          <div
                            key={member.student_id}
                            className="p-2.5 flex items-center justify-between gap-3 hover:bg-muted/30 transition-colors"
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div
                                className={cn(
                                  "w-6 h-6 rounded-full flex items-center justify-center font-bold text-[11px] shrink-0",
                                  member.role === "captain"
                                    ? "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300 border border-amber-300 dark:border-amber-700"
                                    : member.role === "vice_captain"
                                    ? "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300 border border-blue-300 dark:border-blue-700"
                                    : "bg-muted text-muted-foreground"
                                )}
                              >
                                {member.role === "captain" ? "C" : member.role === "vice_captain" ? "VC" : globalIdx + 1}
                              </div>
                              <div className="min-w-0 truncate">
                                <div className="text-xs font-semibold text-foreground truncate">
                                  {member.student_name}
                                </div>
                                <div className="text-[10px] text-muted-foreground font-mono">
                                  {member.usn} {member.branch_name ? `• ${member.branch_name}` : ""}
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-2 shrink-0">
                              <Select
                                value={member.role}
                                onValueChange={(val: "captain" | "vice_captain" | "member") =>
                                  handleRoleChange(member.student_id, val)
                                }
                              >
                                <SelectTrigger className="h-7 text-xs w-[140px]">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem
                                    value="captain"
                                    className="text-xs font-semibold text-amber-600 dark:text-amber-400"
                                  >
                                    Captain (C)
                                  </SelectItem>
                                  <SelectItem
                                    value="vice_captain"
                                    className="text-xs font-semibold text-blue-600 dark:text-blue-400"
                                  >
                                    Vice-Captain (VC)
                                  </SelectItem>
                                  <SelectItem value="member" className="text-xs text-muted-foreground">
                                    Team Member
                                  </SelectItem>
                                </SelectContent>
                              </Select>

                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => handleRemoveTeamMember(member.student_id)}
                                className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                                title="Remove member"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </div>
                        );
                      })}
                  </div>

                  {Math.ceil(teamMembers.length / rosterPageSize) > 1 && (
                    <div className="flex items-center justify-between px-3 py-2 border border-border bg-card text-xs text-muted-foreground rounded-xl">
                      <span className="text-[11px]">
                        Showing <span className="font-semibold text-foreground">{(rosterPage - 1) * rosterPageSize + 1}–{Math.min(rosterPage * rosterPageSize, teamMembers.length)}</span> of <span className="font-semibold text-foreground">{teamMembers.length}</span> members
                      </span>
                      <div className="flex items-center gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={rosterPage === 1}
                          onClick={() => setRosterPage((p) => Math.max(1, p - 1))}
                          className="bg-primary hover:bg-primary/90 text-white border-primary h-8 px-3 transition-all text-xs"
                        >
                          Previous
                        </Button>
                        <div className="flex items-center justify-center min-w-[1.5rem]">
                          <span className="text-xs font-semibold text-foreground">
                            {rosterPage}
                          </span>
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={rosterPage >= Math.ceil(teamMembers.length / rosterPageSize)}
                          onClick={() => setRosterPage((p) => Math.min(Math.ceil(teamMembers.length / rosterPageSize), p + 1))}
                          className="bg-primary hover:bg-primary/90 text-white border-primary h-8 px-3 transition-all text-xs"
                        >
                          Next
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1.5">
                Activity Category <span className="text-destructive">*</span>
              </label>
              <Select
                value={formData.activity_type}
                onValueChange={(val) => setFormData({ ...formData, activity_type: val })}
              >
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue placeholder="Select Category" />
                </SelectTrigger>
                <SelectContent>
                  {activityTypes.map((t) => (
                    <SelectItem key={t.value} value={t.value} className="text-xs">
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-foreground mb-1.5">
                Participation Level <span className="text-destructive">*</span>
              </label>
              <Select
                value={formData.level}
                onValueChange={(val) => setFormData({ ...formData, level: val })}
              >
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue placeholder="Select Level" />
                </SelectTrigger>
                <SelectContent>
                  {levelChoices.map((l) => (
                    <SelectItem key={l.value} value={l.value} className="text-xs">
                      {l.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-foreground mb-1.5">
              Activity / Event Name <span className="text-destructive">*</span>
            </label>
            <Input
              type="text"
              required
              value={formData.activity_name}
              onChange={(e) => setFormData({ ...formData, activity_name: e.target.value })}
              placeholder="e.g. VTU Inter-Collegiate Basketball Tournament, NSS Blood Donation Camp"
              className="h-9 text-xs"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1.5">
                Event Date <span className="text-destructive">*</span>
              </label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    className={cn(
                      "w-full h-9 justify-start text-left font-normal text-xs bg-background text-foreground border-input",
                      !formData.event_date && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-3.5 w-3.5 text-muted-foreground" />
                    {formData.event_date ? (
                      format(new Date(formData.event_date), "dd MMM yyyy")
                    ) : (
                      <span>Pick event date</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent
                  className="w-auto p-0 z-50 bg-popover text-popover-foreground border shadow-md"
                  align="start"
                >
                  <Calendar
                    mode="single"
                    selected={formData.event_date ? new Date(formData.event_date) : undefined}
                    onSelect={(d) => {
                      if (d) {
                        const formatted = format(d, "yyyy-MM-dd");
                        setFormData({ ...formData, event_date: formatted });
                      }
                    }}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div>
              <label className="block text-xs font-semibold text-foreground mb-1.5">
                Academic Year
              </label>
              <Input
                type="text"
                value={formData.academic_year}
                onChange={(e) => setFormData({ ...formData, academic_year: e.target.value })}
                placeholder="2025-2026"
                className="h-9 text-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-foreground mb-1.5">
                Award / Position
              </label>
              <Select
                value={formData.position_award || "participant"}
                onValueChange={(val) => setFormData({ ...formData, position_award: val })}
              >
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue placeholder="Select Position / Award" />
                </SelectTrigger>
                <SelectContent>
                  {positionChoices.map((p) => (
                    <SelectItem key={p.value} value={p.value} className="text-xs">
                      {p.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-foreground mb-1.5">
              Role / Designation (Optional)
            </label>
            <Input
              type="text"
              value={formData.role_designation}
              onChange={(e) => setFormData({ ...formData, role_designation: e.target.value })}
              placeholder="e.g. Captain, Lead Organizer, Solo Performer, Volunteer"
              className="h-9 text-xs"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-foreground mb-1.5">
              Description & Highlights
            </label>
            <Textarea
              rows={3}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Add key achievements, score, event overview, or faculty commendations..."
              className="text-xs resize-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-foreground mb-1.5">
              Certificate / Proof Document (PDF, JPG, PNG)
            </label>
            <div className="flex items-center gap-3">
              <label className="cursor-pointer inline-flex items-center gap-2 px-3 py-1.5 border border-input rounded-md bg-secondary hover:bg-secondary/80 text-xs font-medium text-secondary-foreground transition">
                <Upload className="h-3.5 w-3.5" />
                <span>{certificateFile ? "Replace Certificate" : "Upload Certificate"}</span>
                <input
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png"
                  onChange={(e) => {
                    if (e.target.files?.[0]) setCertificateFile(e.target.files[0]);
                  }}
                  className="hidden"
                />
              </label>
              {certificateFile ? (
                <span className="text-xs text-primary font-medium truncate max-w-xs flex items-center gap-1">
                  <FileText className="h-3.5 w-3.5" /> {certificateFile.name}
                </span>
              ) : activity?.certificate_url ? (
                <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                  Current certificate attached
                </span>
              ) : null}
            </div>
          </div>

          <DialogFooter className="pt-3 border-t border-border/40 gap-2">
            <Button type="button" variant="outline" size="sm" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={loading} className="gap-1.5">
              {loading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              {activity ? "Update Record" : "Save Record"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
