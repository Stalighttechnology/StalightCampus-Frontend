import React from "react";
import { Trophy, Award, Users, Compass, Activity, Flag } from "lucide-react";
import { ActivitySummaryMetrics } from "../../../utils/sports_wellness_api";
import { Card, CardContent } from "../../ui/card";
import { Skeleton } from "../../ui/skeleton";

interface ActivityStatsCardProps {
  summary: ActivitySummaryMetrics | null;
  loading?: boolean;
}

export const ActivityStatsCard: React.FC<ActivityStatsCardProps> = ({ summary, loading }) => {
  if (loading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
        {[...Array(6)].map((_, i) => (
          <Skeleton key={i} className="h-[96px] rounded-xl" />
        ))}
      </div>
    );
  }

  const total = summary?.total_activities || 0;
  const sports = summary?.by_type?.sports || 0;
  const nss = summary?.by_type?.nss || 0;
  const ncc = summary?.by_type?.ncc_guides || 0;
  const winners =
    (summary?.by_award?.winner || 0) +
    (summary?.by_award?.gold_medal || 0) +
    (summary?.by_award?.['1st_place'] || 0) +
    (summary?.by_award?.silver_medal || 0) +
    (summary?.by_award?.runner_up || 0) +
    (summary?.by_award?.['2nd_place'] || 0) +
    (summary?.by_award?.bronze_medal || 0) +
    (summary?.by_award?.second_runner_up || 0) +
    (summary?.by_award?.['3rd_place'] || 0);
  const nationalState =
    (summary?.by_level?.national || 0) +
    (summary?.by_level?.state || 0) +
    (summary?.by_level?.international || 0);

  const stats = [
    {
      label: "Total Participations",
      value: total,
      subtitle: "Active participations",
      icon: <Activity className="w-4 h-4 text-primary" />,
      hoverBorder: "hover:border-primary/40",
      valueColor: "text-foreground",
    },
    {
      label: "Sports & Athletics",
      value: sports,
      subtitle: "Tournaments & meets",
      icon: <Trophy className="w-4 h-4 text-emerald-500" />,
      hoverBorder: "hover:border-emerald-400/40",
      valueColor: "text-emerald-600 dark:text-emerald-400",
    },
    {
      label: "NSS Activities",
      value: nss,
      subtitle: "Community outreach",
      icon: <Users className="w-4 h-4 text-amber-500" />,
      hoverBorder: "hover:border-amber-400/40",
      valueColor: "text-amber-600 dark:text-amber-400",
    },
    {
      label: "NCC / Scouts & Guides",
      value: ncc,
      subtitle: "Cadets & camps",
      icon: <Compass className="w-4 h-4 text-cyan-500" />,
      hoverBorder: "hover:border-cyan-400/40",
      valueColor: "text-cyan-600 dark:text-cyan-400",
    },
    {
      label: "Medals & Awards",
      value: winners,
      subtitle: "Podium finishes",
      icon: <Award className="w-4 h-4 text-purple-500" />,
      hoverBorder: "hover:border-purple-400/40",
      valueColor: "text-purple-600 dark:text-purple-400",
    },
    {
      label: "State & National",
      value: nationalState,
      subtitle: "Higher representation",
      icon: <Flag className="w-4 h-4 text-rose-500" />,
      hoverBorder: "hover:border-rose-400/40",
      valueColor: "text-rose-600 dark:text-rose-400",
    },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 sm:gap-4">
      {stats.map((stat, idx) => (
        <Card
          key={idx}
          className={`border border-border shadow-xs rounded-xl overflow-hidden bg-card/80 backdrop-blur ${stat.hoverBorder} transition-colors`}
        >
          <CardContent className="p-3 sm:p-4 space-y-1">
            <div className="flex items-center justify-between text-muted-foreground gap-1">
              <span className="text-[11px] sm:text-xs font-semibold uppercase tracking-wider truncate">{stat.label}</span>
              <div className="shrink-0">{stat.icon}</div>
            </div>
            <div className={`text-xl sm:text-2xl font-bold ${stat.valueColor}`}>{stat.value}</div>
            <p className="text-[10px] sm:text-[11px] text-muted-foreground truncate">{stat.subtitle}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};
