import React from "react";
import { AlertTriangle, Phone, Heart, Edit3 } from "lucide-react";
import { StudentMedicalProfile } from "../../../utils/sports_wellness_api";
import { Card, CardContent } from "../../ui/card";
import { Badge } from "../../ui/badge";
import { Button } from "../../ui/button";

interface MedicalAlertBannerProps {
  profile: StudentMedicalProfile | null;
  readOnly?: boolean;
  onEditProfile?: () => void;
}

export const MedicalAlertBanner: React.FC<MedicalAlertBannerProps> = ({
  profile,
  readOnly = true,
  onEditProfile,
}) => {
  if (!profile) return null;

  const hasCriticalAlert = Boolean(
    profile.allergies ||
    profile.chronic_conditions ||
    profile.physical_disability
  );

  return (
    <Card
      className={`border transition shadow-xs ${
        hasCriticalAlert
          ? "bg-rose-50/40 dark:bg-rose-950/20 border-rose-300 dark:border-rose-900/60"
          : "bg-primary/5 border-primary/20"
      }`}
    >
      <CardContent className="p-4 sm:p-5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-3">
            <div
              className={`w-11 h-11 rounded-xl flex items-center justify-center font-bold text-white shrink-0 shadow-xs ${
                hasCriticalAlert ? "bg-rose-600" : "bg-primary"
              }`}
            >
              {profile.blood_group ? (
                <span className="text-sm tracking-tight">{profile.blood_group}</span>
              ) : (
                <Heart className="h-5 w-5" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h4 className="text-base font-bold text-foreground">
                  Medical & Emergency Card
                </h4>
                {hasCriticalAlert ? (
                  <Badge variant="destructive" className="text-[10px] uppercase font-bold tracking-wider gap-1">
                    <AlertTriangle className="h-3 w-3" /> High Attention
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-[10px] font-semibold border-emerald-300 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40">
                    Standard Profile
                  </Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                {profile.student_name} ({profile.usn}) {profile.branch_name ? `• ${profile.branch_name}` : ""}
              </p>
            </div>
          </div>

          {!readOnly && onEditProfile && (
            <Button
              variant="outline"
              size="sm"
              onClick={onEditProfile}
              className="gap-1.5 self-start sm:self-auto text-xs font-semibold"
            >
              <Edit3 className="h-3.5 w-3.5" /> Update Medical Card
            </Button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mt-4 pt-3 border-t border-border/50 text-xs">
          <div>
            <span className="text-muted-foreground block font-medium">Allergies</span>
            <span className="font-semibold text-foreground mt-0.5 block">
              {profile.allergies || "None declared"}
            </span>
          </div>

          <div>
            <span className="text-muted-foreground block font-medium">Chronic Conditions</span>
            <span className="font-semibold text-foreground mt-0.5 block">
              {profile.chronic_conditions || "None declared"}
            </span>
          </div>

          <div>
            <span className="text-muted-foreground block font-medium">Emergency Contact</span>
            <span className="font-semibold text-foreground mt-0.5 flex items-center gap-1">
              <Phone className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
              {profile.emergency_contact_phone ? (
                <span>
                  {profile.emergency_contact_name || "Contact"} ({profile.emergency_contact_phone})
                </span>
              ) : (
                "Not provided"
              )}
            </span>
          </div>

          <div>
            <span className="text-muted-foreground block font-medium">Preferred Hospital</span>
            <span className="font-semibold text-foreground mt-0.5 block truncate">
              {profile.preferred_hospital || "Campus Clinic"}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
