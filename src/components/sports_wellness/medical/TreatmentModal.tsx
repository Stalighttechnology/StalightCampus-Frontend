import React, { useState } from "react";
import { Stethoscope, AlertCircle, Loader2, Hospital, Calendar as CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { sportsWellnessApi, StudentTreatmentReferral, StudentSearchItem } from "../../../utils/sports_wellness_api";
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
import { Checkbox } from "../../ui/checkbox";
import { Alert, AlertDescription } from "../../ui/alert";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "../../ui/popover";
import { Calendar } from "../../ui/calendar";
import { cn } from "../../../lib/utils";

interface TreatmentModalProps {
  treatment: StudentTreatmentReferral | null;
  selectedStudent: StudentSearchItem | null;
  onClose: () => void;
  onSuccess: () => void;
}

export const TreatmentModal: React.FC<TreatmentModalProps> = ({
  treatment,
  selectedStudent: initialSelectedStudent,
  onClose,
  onSuccess,
}) => {
  const [student, setStudent] = useState<StudentSearchItem | null>(
    initialSelectedStudent ||
      (treatment
        ? {
            id: treatment.student,
            name: treatment.student_name,
            usn: treatment.usn,
            branch_name: treatment.branch_name,
            batch_name: treatment.batch_name,
            semester_name: treatment.semester_name,
            blood_group: "",
            has_medical_alert: false,
          }
        : null)
  );

  const [formData, setFormData] = useState({
    incident_date: treatment?.incident_date || new Date().toISOString().split("T")[0],
    complaints_symptoms: treatment?.complaints_symptoms || "",
    diagnosis: treatment?.diagnosis || "",
    treatment_provided: treatment?.treatment_provided || "",
    is_referred: treatment?.is_referred || false,
    referred_to: treatment?.referred_to || "",
    referral_reason: treatment?.referral_reason || "",
    rest_advised_days: treatment?.rest_advised_days?.toString() || "0",
    attending_doctor: treatment?.attending_doctor || "",
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!student) {
      setError("Please select a student.");
      return;
    }
    if (!formData.complaints_symptoms.trim()) {
      setError("Complaints / Symptoms are required.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const payload = {
        student: student.id,
        incident_date: formData.incident_date,
        complaints_symptoms: formData.complaints_symptoms,
        diagnosis: formData.diagnosis,
        treatment_provided: formData.treatment_provided,
        is_referred: formData.is_referred,
        referred_to: formData.is_referred ? formData.referred_to : "",
        referral_reason: formData.is_referred ? formData.referral_reason : "",
        rest_advised_days: parseInt(formData.rest_advised_days, 10) || 0,
        attending_doctor: formData.attending_doctor,
      };

      if (treatment) {
        await sportsWellnessApi.updateTreatment(treatment.id, payload);
      } else {
        await sportsWellnessApi.createTreatment(payload);
      }
      onSuccess();
    } catch (err: any) {
      setError(err.message || "An error occurred while logging treatment.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={true} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="w-[90vw] max-w-[90vw] sm:max-w-xl sm:w-full h-[80vh] sm:h-auto max-h-[80vh] sm:max-h-[90vh] rounded-2xl sm:rounded-lg overflow-y-scroll custom-scrollbar [scrollbar-gutter:stable] p-4 sm:p-6">
        <DialogHeader className="pb-2 border-b border-border/40">
          <DialogTitle className="text-lg font-bold flex items-center gap-2">
            <Stethoscope className="h-5 w-5 text-primary" />
            {treatment ? "Edit Clinic Visit / Treatment" : "Log Clinic Visit / Hospital Referral"}
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
                Date of Visit <span className="text-destructive">*</span>
              </label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    className={cn(
                      "w-full h-9 justify-start text-left font-normal text-xs bg-background text-foreground border-input",
                      !formData.incident_date && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-3.5 w-3.5 text-muted-foreground" />
                    {formData.incident_date ? (
                      format(new Date(formData.incident_date), "dd MMM yyyy")
                    ) : (
                      <span>Pick date of visit</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 z-50 bg-popover text-popover-foreground border shadow-md" align="start">
                  <Calendar
                    mode="single"
                    selected={formData.incident_date ? new Date(formData.incident_date) : undefined}
                    onSelect={(d) => {
                      if (d) {
                        const formatted = format(d, "yyyy-MM-dd");
                        setFormData({ ...formData, incident_date: formatted });
                      }
                    }}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div>
              <label className="block text-xs font-semibold text-foreground mb-1.5">
                Attending Doctor / Staff
              </label>
              <Input
                type="text"
                placeholder="Dr. Verma / Nurse"
                value={formData.attending_doctor}
                onChange={(e) => setFormData({ ...formData, attending_doctor: e.target.value })}
                className="h-9 text-xs"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-foreground mb-1.5">
              Chief Complaints & Symptoms <span className="text-destructive">*</span>
            </label>
            <Textarea
              rows={2}
              required
              placeholder="e.g. Acute fever with body ache, sports injury to right ankle..."
              value={formData.complaints_symptoms}
              onChange={(e) => setFormData({ ...formData, complaints_symptoms: e.target.value })}
              className="text-xs resize-none"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1.5">
                Diagnosis
              </label>
              <Input
                type="text"
                placeholder="e.g. Viral URI / Mild Concussion"
                value={formData.diagnosis}
                onChange={(e) => setFormData({ ...formData, diagnosis: e.target.value })}
                className="h-9 text-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-foreground mb-1.5">
                Bed Rest Advised (Days)
              </label>
              <Input
                type="number"
                min="0"
                value={formData.rest_advised_days}
                onChange={(e) => setFormData({ ...formData, rest_advised_days: e.target.value })}
                className="h-9 text-xs"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-foreground mb-1.5">
              Treatment Provided / Prescription Given
            </label>
            <Textarea
              rows={2}
              placeholder="e.g. Paracetamol 650mg TDS x 3 days, ORS solution, crepe bandage..."
              value={formData.treatment_provided}
              onChange={(e) => setFormData({ ...formData, treatment_provided: e.target.value })}
              className="text-xs resize-none"
            />
          </div>

          {/* Referral Section */}
          <div className="p-3.5 bg-muted/40 rounded-xl border border-border/50 space-y-3">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="is_referred"
                checked={formData.is_referred}
                onCheckedChange={(checked) => setFormData({ ...formData, is_referred: Boolean(checked) })}
              />
              <label
                htmlFor="is_referred"
                className="text-xs font-bold text-foreground flex items-center gap-1.5 cursor-pointer"
              >
                <Hospital className="h-4 w-4 text-rose-500" /> Refer to Outside Hospital / Specialist
              </label>
            </div>

            {formData.is_referred && (
              <div className="space-y-3 pt-2 border-t border-border/40">
                <div>
                  <label className="block text-xs font-medium text-foreground mb-1">
                    Referred To Hospital / Clinic Name
                  </label>
                  <Input
                    type="text"
                    placeholder="e.g. Apollo Hospital / City Orthopedic Center"
                    value={formData.referred_to}
                    onChange={(e) => setFormData({ ...formData, referred_to: e.target.value })}
                    className="h-8 text-xs bg-background"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-foreground mb-1">
                    Referral Reason & Clinical Notes
                  </label>
                  <Input
                    type="text"
                    placeholder="e.g. X-Ray required to rule out bone fracture"
                    value={formData.referral_reason}
                    onChange={(e) => setFormData({ ...formData, referral_reason: e.target.value })}
                    className="h-8 text-xs bg-background"
                  />
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="pt-3 border-t border-border/40 gap-2">
            <Button type="button" variant="outline" size="sm" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={loading} className="gap-1.5">
              {loading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              {treatment ? "Update Entry" : "Save Treatment"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
