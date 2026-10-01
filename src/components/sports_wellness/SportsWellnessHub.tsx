import React, { useState, useEffect } from "react";
import {
  Trophy,
  HeartPulse,
  Plus,
  Search,
} from "lucide-react";
import {
  sportsWellnessApi,
  StudentActivityRecord,
  ActivitySummaryMetrics,
  OverviewStats,
  StudentSearchItem,
} from "../../utils/sports_wellness_api";
import { ActivityStatsCard } from "./activities/ActivityStatsCard";
import { ActivityList } from "./activities/ActivityList";
import { ActivityModal } from "./activities/ActivityModal";
import { ActivityDetailModal } from "./activities/ActivityDetailModal";
import { MedicalOverviewTab } from "./medical/MedicalOverviewTab";
import { Card, CardHeader, CardTitle } from "../ui/card";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { Badge } from "../ui/badge";

interface SportsWellnessHubProps {
  userRole?: string;
  readOnly?: boolean;
}

export const SportsWellnessHub: React.FC<SportsWellnessHubProps> = ({
  userRole = "counsellor",
  readOnly = false,
}) => {
  // Main Tab State: "activities" | "medical"
  const [activeTab, setActiveTab] = useState<string>("activities");

  // Selected Student Context (Global filter)
  const [selectedStudent, setSelectedStudent] = useState<StudentSearchItem | null>(null);

  // Overview Stats & Summary
  const [overviewStats, setOverviewStats] = useState<OverviewStats | null>(null);
  const [activitySummary, setActivitySummary] = useState<ActivitySummaryMetrics | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);

  // Activities Table State
  const [activities, setActivities] = useState<StudentActivityRecord[]>([]);
  const [activityLoading, setActivityLoading] = useState(false);
  const [activityPage, setActivityPage] = useState(1);
  const [activityPageSize, setActivityPageSize] = useState(10);
  const [activityTotalPages, setActivityTotalPages] = useState(1);
  const [activityTotalCount, setActivityTotalCount] = useState(0);

  // Filter states
  const [activityTypeFilter, setActivityTypeFilter] = useState("");
  const [levelFilter, setLevelFilter] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  // Modals & Triggers
  const [showActivityModal, setShowActivityModal] = useState(false);
  const [editingActivity, setEditingActivity] = useState<StudentActivityRecord | null>(null);
  const [viewingActivity, setViewingActivity] = useState<StudentActivityRecord | null>(null);
  const [triggerNewCheckup, setTriggerNewCheckup] = useState(false);
  const [triggerNewTreatment, setTriggerNewTreatment] = useState(false);

  // Load High-level overview stats & summary metrics
  const loadOverviewStats = async () => {
    setStatsLoading(true);
    try {
      const stats = await sportsWellnessApi.fetchOverviewStats(selectedStudent?.id);
      setOverviewStats(stats);
      setActivitySummary({
        total_activities: stats.total_activities,
        by_type: stats.by_type || {},
        by_level: stats.by_level || {},
        by_award: stats.by_award || {},
      });
    } catch (err) {
      console.error("Error loading overview stats:", err);
    } finally {
      setStatsLoading(false);
    }
  };

  // Load Activities list
  const loadActivities = async () => {
    setActivityLoading(true);
    try {
      const data = await sportsWellnessApi.fetchActivities({
        student_id: selectedStudent?.id,
        activity_type: activityTypeFilter,
        level: levelFilter,
        search: searchTerm,
        page: activityPage,
        page_size: activityPageSize,
      });
      setActivities(data.results);
      setActivityTotalCount(data.count);
      setActivityTotalPages(data.total_pages);
    } catch (err) {
      console.error("Error loading activities:", err);
    } finally {
      setActivityLoading(false);
    }
  };

  useEffect(() => {
    loadOverviewStats();
  }, [selectedStudent]);

  useEffect(() => {
    if (activeTab === "activities") {
      loadActivities();
    }
  }, [selectedStudent, activityTypeFilter, levelFilter, searchTerm, activityPage, activityPageSize, activeTab]);

  const isReadOnlyView = readOnly || ["admin", "principal", "dean", "org_admin"].includes(userRole) || userRole !== "counsellor";
  const canManage = !isReadOnlyView && userRole === "counsellor";

  return (
    <div className="w-full max-w-none mx-auto space-y-4">
      {/* High-level Activity Statistics Cards */}
      {activeTab === "activities" && (
        <ActivityStatsCard summary={activitySummary} loading={statsLoading} />
      )}

      <Card className="shadow-sm overflow-hidden bg-card border border-border rounded-2xl w-full">
        {/* Card Header matching Announcement Management */}
        <CardHeader className="border-b p-4 sm:p-6 flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4 w-full">
            <div className="min-w-0 flex-1">
              <CardTitle className="text-lg sm:text-2xl font-bold text-foreground tracking-tight">
                Sports & Wellness
              </CardTitle>
              <p className="text-xs sm:text-sm mt-0.5 text-muted-foreground leading-relaxed">
                Track student extra-curricular activities, achievements, medical vitals, and health records
              </p>
            </div>

            {/* Top Action Button(s) */}
            {canManage && (
              <div className="w-full sm:w-auto flex items-center gap-2 shrink-0">
                {activeTab === "activities" ? (
                  <Button
                    onClick={() => {
                      setEditingActivity(null);
                      setShowActivityModal(true);
                    }}
                    className="gap-1.5 w-full sm:w-auto text-white bg-primary hover:bg-primary/90 font-semibold h-9 sm:h-10 text-xs sm:text-sm shadow-xs"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Record Activity</span>
                  </Button>
                ) : (
                  <div className="grid grid-cols-2 sm:flex items-center gap-2 w-full sm:w-auto">
                    <Button
                      onClick={() => setTriggerNewCheckup(true)}
                      className="gap-1.5 w-full sm:w-auto text-white bg-primary hover:bg-primary/90 font-semibold text-xs sm:text-sm h-9 shadow-xs"
                    >
                      <Plus className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                      <span>Record Checkup</span>
                    </Button>
                    <Button
                      onClick={() => setTriggerNewTreatment(true)}
                      className="gap-1.5 w-full sm:w-auto text-white bg-primary hover:bg-primary/90 font-semibold text-xs sm:text-sm h-9 shadow-xs"
                    >
                      <Plus className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                      <span>Log Treatment</span>
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Top Segmented Switcher Buttons (Responsive on Mobile) */}
          <div className="grid grid-cols-2 p-1 rounded-xl bg-muted border border-border w-full sm:flex sm:w-auto self-start gap-1">
            <button
              onClick={() => setActiveTab("activities")}
              className={`py-2 px-2.5 sm:px-4 rounded-lg text-xs sm:text-sm font-semibold transition-all flex items-center justify-center gap-1.5 whitespace-nowrap min-w-0 ${
                activeTab === "activities"
                  ? "bg-primary text-white shadow-sm"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
              }`}
            >
              <Trophy className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
              <span className="hidden sm:inline truncate">Sports & Extra-Curriculars</span>
              <span className="sm:hidden truncate">Activities</span>
              {(overviewStats?.total_activities ?? 0) > 0 && (
                <Badge
                  className={`text-[10px] h-4 px-1.5 border-none shrink-0 ${
                    activeTab === "activities"
                      ? "bg-white/20 text-white"
                      : "bg-primary/10 text-primary"
                  }`}
                >
                  {overviewStats?.total_activities ?? 0}
                </Badge>
              )}
            </button>

            <button
              onClick={() => setActiveTab("medical")}
              className={`py-2 px-2.5 sm:px-4 rounded-lg text-xs sm:text-sm font-semibold transition-all flex items-center justify-center gap-1.5 whitespace-nowrap min-w-0 ${
                activeTab === "medical"
                  ? "bg-primary text-white shadow-sm"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
              }`}
            >
              <HeartPulse className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
              <span className="hidden sm:inline truncate">Medical & Health Checks</span>
              <span className="sm:hidden truncate">Medical Checks</span>
              {overviewStats?.medical_alerts_count ? (
                <Badge
                  className={`text-[10px] h-4 px-1.5 border-none shrink-0 ${
                    activeTab === "medical"
                      ? "bg-white/20 text-white"
                      : "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300"
                  }`}
                >
                  {overviewStats.medical_alerts_count}
                  <span className="hidden sm:inline ml-0.5">Alerts</span>
                </Badge>
              ) : null}
            </button>
          </div>
        </CardHeader>

        {/* Content Section */}
        {activeTab === "activities" ? (
          <div>
            {/* Filter Bar integrated directly beneath Header */}
            <div className="p-4 border-b border-border bg-card">
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                <div className="relative">
                  <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
                  <Input
                    placeholder="Search activity, student, USN..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9 h-10 text-xs sm:text-sm rounded-xl"
                  />
                </div>

                <Select
                  value={activityTypeFilter || "ALL"}
                  onValueChange={(val) => setActivityTypeFilter(val === "ALL" ? "" : val)}
                >
                  <SelectTrigger className="h-10 text-xs sm:text-sm rounded-xl">
                    <SelectValue placeholder="All Activity Types" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">All Activity Types</SelectItem>
                    <SelectItem value="sports">Sports & Athletics</SelectItem>
                    <SelectItem value="nss">National Service Scheme (NSS)</SelectItem>
                    <SelectItem value="ncc_guides">NCC / Scouts & Guides</SelectItem>
                    <SelectItem value="cultural">Cultural & Arts</SelectItem>
                    <SelectItem value="club_society">Clubs & Societies</SelectItem>
                    <SelectItem value="hackathon_tech">Technical / Hackathons</SelectItem>
                    <SelectItem value="other">Other Activities</SelectItem>
                  </SelectContent>
                </Select>

                <Select
                  value={levelFilter || "ALL"}
                  onValueChange={(val) => setLevelFilter(val === "ALL" ? "" : val)}
                >
                  <SelectTrigger className="h-10 text-xs sm:text-sm rounded-xl">
                    <SelectValue placeholder="All Levels" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">All Levels</SelectItem>
                    <SelectItem value="intra_college">Intra-College / Department</SelectItem>
                    <SelectItem value="inter_college">Inter-College</SelectItem>
                    <SelectItem value="district">District Level</SelectItem>
                    <SelectItem value="university">University Level</SelectItem>
                    <SelectItem value="state">State Level</SelectItem>
                    <SelectItem value="national">National Level</SelectItem>
                    <SelectItem value="international">International Level</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Activities Table View */}
            <ActivityList
              activities={activities}
              loading={activityLoading}
              totalCount={activityTotalCount}
              page={activityPage}
              pageSize={activityPageSize}
              totalPages={activityTotalPages}
              onPageChange={setActivityPage}
              onPageSizeChange={setActivityPageSize}
              readOnly={!canManage}
              onViewDetail={(act) => setViewingActivity(act)}
              onEditActivity={(act) => {
                setEditingActivity(act);
                setShowActivityModal(true);
              }}
              onDeleteActivity={async (id) => {
                try {
                  await sportsWellnessApi.deleteActivity(id);
                  loadActivities();
                  loadOverviewStats();
                } catch (err) {
                  alert("Failed to delete activity record");
                }
              }}
            />
          </div>
        ) : (
          <MedicalOverviewTab
            readOnly={!canManage}
            selectedStudent={selectedStudent}
            onSelectStudent={setSelectedStudent}
            triggerNewCheckup={triggerNewCheckup}
            onResetTriggerCheckup={() => setTriggerNewCheckup(false)}
            triggerNewTreatment={triggerNewTreatment}
            onResetTriggerTreatment={() => setTriggerNewTreatment(false)}
          />
        )}
      </Card>

      {/* Activity Modals */}
      {showActivityModal && (
        <ActivityModal
          activity={editingActivity}
          selectedStudent={selectedStudent}
          onClose={() => setShowActivityModal(false)}
          onSuccess={() => {
            setShowActivityModal(false);
            loadActivities();
            loadOverviewStats();
          }}
        />
      )}

      {viewingActivity && (
        <ActivityDetailModal
          activity={viewingActivity}
          onClose={() => setViewingActivity(null)}
        />
      )}
    </div>
  );
};

export default SportsWellnessHub;
