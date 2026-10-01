import React, { useState, useEffect } from "react";
import {
  Calendar,
  Hospital,
  User,
  Stethoscope,
  Pill,
  BedDouble,
  AlertCircle,
  FileText,
} from "lucide-react";
import { sportsWellnessApi, StudentTreatmentReferral } from "../../../utils/sports_wellness_api";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "../../ui/dialog";
import { Badge } from "../../ui/badge";
import { Button } from "../../ui/button";

interface TreatmentDetailModalProps {
  treatment: StudentTreatmentReferral | null;
  treatmentId?: number | null;
  onClose: () => void;
}

export const TreatmentDetailModal: React.FC<TreatmentDetailModalProps> = ({
  treatment: initialTreatment,
  treatmentId,
  onClose,
}) => {
  const [detail, setDetail] = useState<StudentTreatmentReferral | null>(initialTreatment);
  const [loading, setLoading] = useState(false);

  const targetId = treatmentId || initialTreatment?.id;

  useEffect(() => {
    if (!targetId) {
      setDetail(null);
      return;
    }

    setDetail(initialTreatment);
    setLoading(true);

    sportsWellnessApi
      .fetchTreatmentDetail(targetId)
      .then((data) => {
        setDetail(data);
      })
      .catch((err) => {
        console.error("Failed to fetch treatment detail:", err);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [targetId]);

  if (!targetId && !initialTreatment) return null;

  const treatment = detail || initialTreatment;
  if (!treatment) return null;

  return (
    <Dialog open={Boolean(treatment)} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="w-[90vw] max-w-[90vw] sm:max-w-xl sm:w-full h-[80vh] sm:h-auto max-h-[80vh] sm:max-h-[90vh] rounded-2xl sm:rounded-lg overflow-y-scroll custom-scrollbar [scrollbar-gutter:stable] p-4 sm:p-6">
        <DialogHeader className="pb-2 border-b border-border/40">
          <div className="flex flex-wrap items-center gap-2 mb-1.5">
            {treatment.is_referred ? (
              <Badge variant="outline" className="font-semibold text-xs bg-rose-50 text-rose-700 border-rose-300 dark:bg-rose-950/60 dark:text-rose-300 flex items-center gap-1">
                <Hospital className="h-3 w-3" /> External Referral
              </Badge>
            ) : (
              <Badge variant="outline" className="font-semibold text-xs bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-300">
                On-Campus Treatment
              </Badge>
            )}
            {treatment.rest_advised_days > 0 && (
              <Badge variant="secondary" className="font-semibold text-xs bg-amber-50 text-amber-700 border-amber-300 dark:bg-amber-950 dark:text-amber-300">
                <BedDouble className="h-3 w-3 mr-1" /> {treatment.rest_advised_days} Days Rest
              </Badge>
            )}
          </div>

          <DialogTitle className="text-xl font-bold tracking-tight flex items-center gap-2">
            <Stethoscope className="w-5 h-5 text-primary shrink-0" />
            <span>Clinic Treatment & Referral Details</span>
          </DialogTitle>

          <div className="flex flex-col gap-1 text-xs text-muted-foreground pt-1">
            <div className="flex flex-wrap items-center gap-2 font-medium text-foreground">
              <User className="h-3.5 w-3.5 text-primary shrink-0" />
              <span>{treatment.student_name}</span>
              <span className="font-mono text-muted-foreground">({treatment.usn})</span>
            </div>
            {treatment.branch_name && (
              <div className="text-xs text-muted-foreground font-normal pl-5">
                {treatment.branch_name}
                {treatment.semester_name ? ` • Sem ${treatment.semester_name}` : ""}
                {treatment.batch_name ? ` • ${treatment.batch_name}` : ""}
              </div>
            )}
            <div className="flex items-center gap-1 text-muted-foreground pl-5 pt-0.5">
              <Calendar className="h-3.5 w-3.5 shrink-0" />
              <span>Date of Incident / Visit: {treatment.incident_date}</span>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 text-sm py-2">
          {/* Symptoms & Diagnosis */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="p-3 bg-muted/30 rounded-xl border border-border/50 space-y-1 text-xs">
              <span className="font-semibold text-foreground flex items-center gap-1.5">
                <AlertCircle className="w-3.5 h-3.5 text-amber-500" /> Symptoms & Complaints
              </span>
              <p className="text-muted-foreground leading-relaxed">
                {treatment.complaints_symptoms || "—"}
              </p>
            </div>

            <div className="p-3 bg-muted/30 rounded-xl border border-border/50 space-y-1 text-xs">
              <span className="font-semibold text-foreground flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-primary" /> Diagnosis
              </span>
              <p className="font-medium text-foreground leading-relaxed">
                {treatment.diagnosis || "Under observation"}
              </p>
            </div>
          </div>

          {/* Treatment Given */}
          <div className="p-3.5 bg-muted/20 rounded-xl border border-border/40 space-y-1 text-xs">
            <span className="font-semibold text-foreground flex items-center gap-1.5">
              <Pill className="w-3.5 h-3.5 text-emerald-600" /> Treatment Given & Medications
            </span>
            <p className="text-muted-foreground leading-relaxed whitespace-pre-line">
              {treatment.treatment_provided || "First aid & symptomatic relief administered on campus."}
            </p>
          </div>

          {/* Referral Card (if referred) */}
          {treatment.is_referred && (
            <div className="p-3.5 bg-rose-500/5 rounded-xl border border-rose-500/20 space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-bold text-rose-700 dark:text-rose-400 flex items-center gap-1.5">
                  <Hospital className="w-4 h-4" /> Hospital Referral Info
                </span>
                <Badge variant="outline" className="bg-rose-100 text-rose-800 border-rose-300 text-[10px] py-0 px-2 font-semibold">
                  Referred
                </Badge>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 border-t border-rose-500/10">
                <div>
                  <span className="text-muted-foreground block text-[11px]">Referred To Facility:</span>
                  <span className="font-semibold text-foreground">{treatment.referred_to || "External Hospital"}</span>
                </div>
                {treatment.referral_reason && (
                  <div>
                    <span className="text-muted-foreground block text-[11px]">Reason for Referral:</span>
                    <span className="font-medium text-foreground">{treatment.referral_reason}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Rest Advised & Doctor */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div className="p-2.5 bg-muted/30 rounded-lg border border-border/40 flex items-center justify-between">
              <span className="text-muted-foreground flex items-center gap-1">
                <BedDouble className="w-3.5 h-3.5 text-amber-500" /> Medical Rest Advised:
              </span>
              <span className="font-bold text-foreground">
                {treatment.rest_advised_days > 0 ? `${treatment.rest_advised_days} Days` : "No rest advised"}
              </span>
            </div>

            {treatment.attending_doctor && (
              <div className="p-2.5 bg-muted/30 rounded-lg border border-border/40 flex items-center justify-between">
                <span className="text-muted-foreground">Attending Staff / Doctor:</span>
                <span className="font-semibold text-foreground">{treatment.attending_doctor}</span>
              </div>
            )}
          </div>
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

export default TreatmentDetailModal;
