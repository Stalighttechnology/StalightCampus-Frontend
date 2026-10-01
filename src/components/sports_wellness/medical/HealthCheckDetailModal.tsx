import React, { useState, useEffect } from "react";
import {
  Calendar,
  FileText,
  Download,
  User,
  HeartPulse,
  Activity,
  Stethoscope,
  Eye as EyeIcon,
} from "lucide-react";
import { sportsWellnessApi, StudentHealthCheckRecord } from "../../../utils/sports_wellness_api";
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

interface HealthCheckDetailModalProps {
  checkup: StudentHealthCheckRecord | null;
  checkupId?: number | null;
  onClose: () => void;
}

export const HealthCheckDetailModal: React.FC<HealthCheckDetailModalProps> = ({
  checkup: initialCheckup,
  checkupId,
  onClose,
}) => {
  const [detail, setDetail] = useState<StudentHealthCheckRecord | null>(initialCheckup);
  const [loading, setLoading] = useState(false);

  const targetId = checkupId || initialCheckup?.id;

  useEffect(() => {
    if (!targetId) {
      setDetail(null);
      return;
    }

    setDetail(initialCheckup);
    setLoading(true);

    sportsWellnessApi
      .fetchHealthCheckDetail(targetId)
      .then((data) => {
        setDetail(data);
      })
      .catch((err) => {
        console.error("Failed to fetch health check detail:", err);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [targetId]);

  if (!targetId && !initialCheckup) return null;

  const checkup = detail || initialCheckup;
  if (!checkup) return null;

  const getBmiBadge = (bmi: number | null) => {
    if (!bmi) return null;
    if (bmi < 18.5) {
      return (
        <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-300 dark:bg-amber-950 dark:text-amber-300 text-xs">
          Underweight ({bmi})
        </Badge>
      );
    }
    if (bmi <= 24.9) {
      return (
        <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950 dark:text-emerald-300 text-xs">
          Normal ({bmi})
        </Badge>
      );
    }
    return (
      <Badge variant="outline" className="bg-rose-50 text-rose-700 border-rose-300 dark:bg-rose-950 dark:text-rose-300 text-xs">
        Overweight / Obese ({bmi})
      </Badge>
    );
  };

  return (
    <Dialog open={Boolean(checkup)} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="w-[90vw] max-w-[90vw] sm:max-w-xl sm:w-full h-[80vh] sm:h-auto max-h-[80vh] sm:max-h-[90vh] rounded-2xl sm:rounded-lg overflow-y-scroll custom-scrollbar [scrollbar-gutter:stable] p-4 sm:p-6">
        <DialogHeader className="pb-2 border-b border-border/40">
          <div className="flex flex-wrap items-center gap-2 mb-1.5">
            <Badge
              variant="secondary"
              className="font-semibold text-xs bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border-blue-200 dark:border-blue-800"
            >
              {checkup.check_type_display}
            </Badge>
            {checkup.bmi && getBmiBadge(checkup.bmi)}
          </div>

          <DialogTitle className="text-xl font-bold tracking-tight flex items-center gap-2">
            <HeartPulse className="w-5 h-5 text-rose-500 shrink-0" />
            <span>Health Checkup & Vitals Details</span>
          </DialogTitle>

          <div className="flex flex-col gap-1 text-xs text-muted-foreground pt-1">
            <div className="flex flex-wrap items-center gap-2 font-medium text-foreground">
              <User className="h-3.5 w-3.5 text-primary shrink-0" />
              <span>{checkup.student_name}</span>
              <span className="font-mono text-muted-foreground">({checkup.usn})</span>
            </div>
            {checkup.branch_name && (
              <div className="text-xs text-muted-foreground font-normal pl-5">
                {checkup.branch_name}
                {checkup.semester_name ? ` • Sem ${checkup.semester_name}` : ""}
                {checkup.batch_name ? ` • ${checkup.batch_name}` : ""}
              </div>
            )}
            <div className="flex items-center gap-1 text-muted-foreground pl-5 pt-0.5">
              <Calendar className="h-3.5 w-3.5 shrink-0" />
              <span>Date of Examination: {checkup.check_date}</span>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 text-sm py-2">
          {/* Key Vitals Grid */}
          <div>
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Activity className="h-3.5 w-3.5 text-primary" /> Recorded Vitals
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 bg-muted/30 p-3.5 rounded-xl border border-border/50 text-xs">
              <div>
                <span className="text-muted-foreground block text-[11px]">Height</span>
                <span className="font-semibold text-foreground text-sm">
                  {checkup.height_cm ? `${checkup.height_cm} cm` : "—"}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground block text-[11px]">Weight</span>
                <span className="font-semibold text-foreground text-sm">
                  {checkup.weight_kg ? `${checkup.weight_kg} kg` : "—"}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground block text-[11px]">Body Mass Index (BMI)</span>
                <span className="font-semibold text-foreground text-sm">
                  {checkup.bmi ? checkup.bmi : "—"}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground block text-[11px]">Blood Pressure (BP)</span>
                <span className="font-semibold text-foreground text-sm">
                  {checkup.blood_pressure || "—"}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground block text-[11px]">Pulse Rate</span>
                <span className="font-semibold text-foreground text-sm">
                  {checkup.pulse_rate ? `${checkup.pulse_rate} bpm` : "—"}
                </span>
              </div>
              {(checkup.vision_left || checkup.vision_right) && (
                <div>
                  <span className="text-muted-foreground block text-[11px] flex items-center gap-1">
                    <EyeIcon className="w-3 h-3" /> Vision (L / R)
                  </span>
                  <span className="font-semibold text-foreground text-sm">
                    {checkup.vision_left || "6/6"} / {checkup.vision_right || "6/6"}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Observations and Doctor */}
          <div className="space-y-3">
            <div className="p-3 bg-muted/20 rounded-xl border border-border/40 space-y-1">
              <h4 className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                <Stethoscope className="h-3.5 w-3.5 text-primary" /> General Observations & Notes
              </h4>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {checkup.general_observations || "All parameters evaluated within normal healthy range. No acute anomalies noted."}
              </p>
            </div>

            {checkup.examined_by && (
              <div className="flex items-center justify-between text-xs px-3 py-2 bg-muted/30 rounded-lg border border-border/40">
                <span className="text-muted-foreground">Examined By / Medical Officer:</span>
                <span className="font-semibold text-foreground">{checkup.examined_by}</span>
              </div>
            )}
          </div>

          {/* Attached Medical Report */}
          {checkup.medical_report_url ? (
            <div>
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                Attached Medical Report / Document
              </h4>
              <Card className="border-border/60">
                <CardContent className="p-3 flex items-center justify-between">
                  <div className="flex items-center gap-2 overflow-hidden">
                    <FileText className="text-primary h-5 w-5 shrink-0" />
                    <span className="truncate text-xs font-medium text-foreground">
                      Health_Report_{checkup.student_name.replace(/\s+/g, "_")}_{checkup.check_date}
                    </span>
                  </div>
                  <Button size="sm" asChild className="gap-1.5 text-xs">
                    <a href={checkup.medical_report_url} target="_blank" rel="noopener noreferrer">
                      <Download className="h-3.5 w-3.5" /> View / Download
                    </a>
                  </Button>
                </CardContent>
              </Card>
            </div>
          ) : (
            <div className="p-3 text-center text-xs text-muted-foreground border border-dashed border-border rounded-lg">
              No attached medical report file uploaded for this checkup.
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

export default HealthCheckDetailModal;
