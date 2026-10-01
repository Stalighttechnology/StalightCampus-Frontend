import React, { useState } from "react";
import { Upload, FileText, Loader2, AlertCircle, HeartPulse, Activity, Calendar as CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { sportsWellnessApi, StudentHealthCheckRecord, StudentSearchItem } from "../../../utils/sports_wellness_api";
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
import { Badge } from "../../ui/badge";
import { Alert, AlertDescription } from "../../ui/alert";
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

interface HealthCheckModalProps {
  checkup: StudentHealthCheckRecord | null;
  selectedStudent: StudentSearchItem | null;
  onClose: () => void;
  onSuccess: () => void;
}

export const HealthCheckModal: React.FC<HealthCheckModalProps> = ({
  checkup,
  selectedStudent: initialSelectedStudent,
  onClose,
  onSuccess,
}) => {
  const [student, setStudent] = useState<StudentSearchItem | null>(
    initialSelectedStudent ||
      (checkup
        ? {
            id: checkup.student,
            name: checkup.student_name,
            usn: checkup.usn,
            branch_name: checkup.branch_name,
            batch_name: checkup.batch_name,
            semester_name: checkup.semester_name,
            blood_group: "",
            has_medical_alert: false,
          }
        : null)
  );

  const [formData, setFormData] = useState({
    check_type: checkup?.check_type || "periodic_annual",
    check_date: checkup?.check_date || new Date().toISOString().split("T")[0],
    height_cm: checkup?.height_cm?.toString() || "",
    weight_kg: checkup?.weight_kg?.toString() || "",
    blood_pressure: checkup?.blood_pressure || "",
    pulse_rate: checkup?.pulse_rate?.toString() || "",
    vision_left: checkup?.vision_left || "6/6",
    vision_right: checkup?.vision_right || "6/6",
    hearing_status: checkup?.hearing_status || "Normal",
    general_observations: checkup?.general_observations || "",
    examined_by: checkup?.examined_by || "",
  });

  const [reportFile, setReportFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Live BMI calculation
  const computedBmi = React.useMemo(() => {
    const h = parseFloat(formData.height_cm);
    const w = parseFloat(formData.weight_kg);
    if (h > 0 && w > 0) {
      const hM = h / 100.0;
      return (w / (hM * hM)).toFixed(1);
    }
    return null;
  }, [formData.height_cm, formData.weight_kg]);

  const getBmiBadge = (bmiVal: string | null) => {
    if (!bmiVal) return null;
    const num = parseFloat(bmiVal);
    if (num < 18.5) return { label: "Underweight", color: "text-amber-600 bg-amber-50 dark:bg-amber-950/60 border-amber-200 dark:border-amber-800" };
    if (num <= 24.9) return { label: "Normal Weight", color: "text-emerald-600 bg-emerald-50 dark:bg-emerald-950/60 border-emerald-200 dark:border-emerald-800" };
    if (num <= 29.9) return { label: "Overweight", color: "text-orange-600 bg-orange-50 dark:bg-orange-950/60 border-orange-200 dark:border-orange-800" };
    return { label: "Obese", color: "text-rose-600 bg-rose-50 dark:bg-rose-950/60 border-rose-200 dark:border-rose-800" };
  };

  const checkTypes = [
    { value: "initial_admission", label: "Initial Admission Health Check" },
    { value: "periodic_annual", label: "Annual / Periodic Routine Check" },
    { value: "sports_clearance", label: "Sports / Athletic Fitness Clearance" },
    { value: "referral_followup", label: "Referral / Follow-up Examination" },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!student) {
      setError("Please select a student.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const data = new FormData();
      data.append("student", student.id.toString());
      data.append("check_type", formData.check_type);
      data.append("check_date", formData.check_date);
      if (formData.height_cm) data.append("height_cm", formData.height_cm);
      if (formData.weight_kg) data.append("weight_kg", formData.weight_kg);
      if (formData.blood_pressure) data.append("blood_pressure", formData.blood_pressure);
      if (formData.pulse_rate) data.append("pulse_rate", formData.pulse_rate);
      if (formData.vision_left) data.append("vision_left", formData.vision_left);
      if (formData.vision_right) data.append("vision_right", formData.vision_right);
      if (formData.hearing_status) data.append("hearing_status", formData.hearing_status);
      if (formData.general_observations) data.append("general_observations", formData.general_observations);
      if (formData.examined_by) data.append("examined_by", formData.examined_by);

      if (reportFile) {
        data.append("medical_report_file", reportFile);
      }

      if (checkup) {
        await sportsWellnessApi.updateHealthCheck(checkup.id, data);
      } else {
        await sportsWellnessApi.createHealthCheck(data);
      }
      onSuccess();
    } catch (err: any) {
      setError(err.message || "An error occurred while saving health checkup.");
    } finally {
      setLoading(false);
    }
  };

  const bmiMeta = getBmiBadge(computedBmi);

  return (
    <Dialog open={true} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="w-[90vw] max-w-[90vw] sm:max-w-2xl sm:w-full h-[80vh] sm:h-auto max-h-[80vh] sm:max-h-[90vh] rounded-2xl sm:rounded-lg overflow-y-scroll custom-scrollbar [scrollbar-gutter:stable] p-4 sm:p-6">
        <DialogHeader className="pb-2 border-b border-border/40">
          <DialogTitle className="text-lg font-bold flex items-center gap-2">
            <HeartPulse className="h-5 w-5 text-rose-500" />
            {checkup ? "Edit Health Checkup" : "Record Student Health Checkup"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 text-sm py-2">
          {error && (
            <Alert variant="destructive" className="py-2.5">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="text-xs">{error}</AlertDescription>
            </Alert>
          )}

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

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1.5">
                Checkup Type <span className="text-destructive">*</span>
              </label>
              <Select
                value={formData.check_type}
                onValueChange={(val) => setFormData({ ...formData, check_type: val })}
              >
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue placeholder="Select Checkup Type" />
                </SelectTrigger>
                <SelectContent>
                  {checkTypes.map((t) => (
                    <SelectItem key={t.value} value={t.value} className="text-xs">
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-foreground mb-1.5">
                Examination Date <span className="text-destructive">*</span>
              </label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    className={cn(
                      "w-full h-9 justify-start text-left font-normal text-xs bg-background text-foreground border-input",
                      !formData.check_date && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-3.5 w-3.5 text-muted-foreground" />
                    {formData.check_date ? (
                      format(new Date(formData.check_date), "dd MMM yyyy")
                    ) : (
                      <span>Pick examination date</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 z-50 bg-popover text-popover-foreground border shadow-md" align="start">
                  <Calendar
                    mode="single"
                    selected={formData.check_date ? new Date(formData.check_date) : undefined}
                    onSelect={(d) => {
                      if (d) {
                        const formatted = format(d, "yyyy-MM-dd");
                        setFormData({ ...formData, check_date: formatted });
                      }
                    }}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {/* Vitals Section */}
          <div className="p-4 bg-muted/40 rounded-xl space-y-3 border border-border/50">
            <h4 className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5">
              <Activity className="h-4 w-4 text-primary" /> Physical Measurements & Vitals
            </h4>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">
                  Height (cm)
                </label>
                <Input
                  type="number"
                  step="0.1"
                  placeholder="175"
                  value={formData.height_cm}
                  onChange={(e) => setFormData({ ...formData, height_cm: e.target.value })}
                  className="h-8 text-xs bg-background"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">
                  Weight (kg)
                </label>
                <Input
                  type="number"
                  step="0.1"
                  placeholder="68"
                  value={formData.weight_kg}
                  onChange={(e) => setFormData({ ...formData, weight_kg: e.target.value })}
                  className="h-8 text-xs bg-background"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">
                  Blood Pressure
                </label>
                <Input
                  type="text"
                  placeholder="120/80"
                  value={formData.blood_pressure}
                  onChange={(e) => setFormData({ ...formData, blood_pressure: e.target.value })}
                  className="h-8 text-xs bg-background"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">
                  Pulse (bpm)
                </label>
                <Input
                  type="number"
                  placeholder="72"
                  value={formData.pulse_rate}
                  onChange={(e) => setFormData({ ...formData, pulse_rate: e.target.value })}
                  className="h-8 text-xs bg-background"
                />
              </div>
            </div>

            {/* Computed BMI Banner */}
            {computedBmi && (
              <div className="p-2.5 bg-background rounded-lg border border-border/60 flex items-center justify-between text-xs">
                <span className="text-muted-foreground">
                  Auto-calculated BMI: <strong className="text-foreground text-sm ml-1">{computedBmi}</strong>
                </span>
                {bmiMeta && (
                  <Badge variant="outline" className={`font-bold text-[11px] ${bmiMeta.color}`}>
                    {bmiMeta.label}
                  </Badge>
                )}
              </div>
            )}

            <div className="grid grid-cols-3 gap-3 pt-2">
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">
                  Vision (Left)
                </label>
                <Input
                  type="text"
                  placeholder="6/6"
                  value={formData.vision_left}
                  onChange={(e) => setFormData({ ...formData, vision_left: e.target.value })}
                  className="h-8 text-xs bg-background"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">
                  Vision (Right)
                </label>
                <Input
                  type="text"
                  placeholder="6/6"
                  value={formData.vision_right}
                  onChange={(e) => setFormData({ ...formData, vision_right: e.target.value })}
                  className="h-8 text-xs bg-background"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">
                  Hearing Status
                </label>
                <Input
                  type="text"
                  placeholder="Normal"
                  value={formData.hearing_status}
                  onChange={(e) => setFormData({ ...formData, hearing_status: e.target.value })}
                  className="h-8 text-xs bg-background"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-foreground mb-1.5">
              Examining Medical Officer / Doctor Name
            </label>
            <Input
              type="text"
              placeholder="e.g. Dr. Rajesh Kumar, MD (Campus Health Center)"
              value={formData.examined_by}
              onChange={(e) => setFormData({ ...formData, examined_by: e.target.value })}
              className="h-9 text-xs"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-foreground mb-1.5">
              General Clinical Observations & Recommendations
            </label>
            <Textarea
              rows={3}
              placeholder="Physical fitness observations, dietary advice, follow-up recommendations..."
              value={formData.general_observations}
              onChange={(e) => setFormData({ ...formData, general_observations: e.target.value })}
              className="text-xs resize-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-foreground mb-1.5">
              Health Report / Lab Document (PDF, JPG, PNG)
            </label>
            <div className="flex items-center gap-3">
              <label className="cursor-pointer inline-flex items-center gap-2 px-3 py-1.5 border border-input rounded-md bg-secondary hover:bg-secondary/80 text-xs font-medium text-secondary-foreground transition">
                <Upload className="h-3.5 w-3.5" />
                <span>{reportFile ? "Replace Document" : "Upload Report"}</span>
                <input
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png"
                  onChange={(e) => {
                    if (e.target.files?.[0]) setReportFile(e.target.files[0]);
                  }}
                  className="hidden"
                />
              </label>
              {reportFile ? (
                <span className="text-xs text-primary font-medium truncate max-w-xs flex items-center gap-1">
                  <FileText className="h-3.5 w-3.5" /> {reportFile.name}
                </span>
              ) : checkup?.medical_report_url ? (
                <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                  Current report attached
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
              {checkup ? "Update Checkup" : "Save Checkup"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
