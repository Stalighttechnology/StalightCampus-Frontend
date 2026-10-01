import React, { useState } from "react";
import { Heart, Loader2, AlertCircle } from "lucide-react";
import { sportsWellnessApi, StudentMedicalProfile } from "../../../utils/sports_wellness_api";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "../../ui/dialog";
import { Input } from "../../ui/input";
import { Button } from "../../ui/button";
import { Alert, AlertDescription } from "../../ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../ui/select";

interface MedicalProfileEditModalProps {
  profile: StudentMedicalProfile;
  onClose: () => void;
  onSuccess: (updated: StudentMedicalProfile) => void;
}

export const MedicalProfileEditModal: React.FC<MedicalProfileEditModalProps> = ({
  profile,
  onClose,
  onSuccess,
}) => {
  const [formData, setFormData] = useState({
    blood_group: profile.blood_group || "",
    allergies: profile.allergies || "",
    chronic_conditions: profile.chronic_conditions || "",
    physical_disability: profile.physical_disability || "",
    regular_medications: profile.regular_medications || "",
    emergency_contact_name: profile.emergency_contact_name || "",
    emergency_contact_relation: profile.emergency_contact_relation || "",
    emergency_contact_phone: profile.emergency_contact_phone || "",
    secondary_contact_name: profile.secondary_contact_name || "",
    secondary_contact_phone: profile.secondary_contact_phone || "",
    preferred_hospital: profile.preferred_hospital || "",
    insurance_policy_number: profile.insurance_policy_number || "",
    insurance_provider: profile.insurance_provider || "",
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const bloodGroups = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-", "Unknown"];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const updated = await sportsWellnessApi.saveMedicalProfile(profile.student, formData);
      onSuccess(updated);
    } catch (err: any) {
      setError(err.message || "Failed to save medical card.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={true} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="w-[90vw] max-w-[90vw] sm:max-w-xl sm:w-full h-[80vh] sm:h-auto max-h-[80vh] sm:max-h-[90vh] rounded-2xl sm:rounded-lg overflow-y-scroll custom-scrollbar [scrollbar-gutter:stable] p-4 sm:p-6">
        <DialogHeader className="pb-2 border-b border-border/40">
          <DialogTitle className="text-lg font-bold flex items-center gap-2">
            <Heart className="h-5 w-5 text-rose-500" /> Update Student Medical Profile
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 text-sm py-2">
          {error && (
            <Alert variant="destructive" className="py-2.5">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="text-xs">{error}</AlertDescription>
            </Alert>
          )}

          <div className="p-3 bg-muted/40 rounded-xl text-xs border border-border/50">
            <span className="font-semibold text-foreground">{profile.student_name}</span>{" "}
            <span className="text-muted-foreground font-mono">({profile.usn})</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1.5">
                Blood Group
              </label>
              <Select
                value={formData.blood_group || "NONE"}
                onValueChange={(val) => setFormData({ ...formData, blood_group: val === "NONE" ? "" : val })}
              >
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue placeholder="Select Blood Group" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="NONE" className="text-xs">Select Blood Group</SelectItem>
                  {bloodGroups.map((bg) => (
                    <SelectItem key={bg} value={bg} className="text-xs">
                      {bg}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-foreground mb-1.5">
                Preferred Hospital
              </label>
              <Input
                type="text"
                placeholder="e.g. Manipal Hospital, Whitefield"
                value={formData.preferred_hospital}
                onChange={(e) => setFormData({ ...formData, preferred_hospital: e.target.value })}
                className="h-9 text-xs"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-foreground mb-1.5">
              Allergies (Food, Drug, Environmental)
            </label>
            <Input
              type="text"
              placeholder="e.g. Penicillin, Peanuts, Dust"
              value={formData.allergies}
              onChange={(e) => setFormData({ ...formData, allergies: e.target.value })}
              className="h-9 text-xs"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-foreground mb-1.5">
              Chronic Medical Conditions
            </label>
            <Input
              type="text"
              placeholder="e.g. Asthma, Type 1 Diabetes, Epilepsy, Hypertension"
              value={formData.chronic_conditions}
              onChange={(e) => setFormData({ ...formData, chronic_conditions: e.target.value })}
              className="h-9 text-xs"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-foreground mb-1.5">
              Physical Disability / Special Needs
            </label>
            <Input
              type="text"
              placeholder="e.g. Visual impairment, Mobility aid needed"
              value={formData.physical_disability}
              onChange={(e) => setFormData({ ...formData, physical_disability: e.target.value })}
              className="h-9 text-xs"
            />
          </div>

          <div className="p-3.5 bg-muted/40 rounded-xl space-y-3 border border-border/50">
            <h4 className="text-xs font-bold text-foreground uppercase tracking-wider">
              Emergency Contacts
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-medium text-muted-foreground mb-1">
                  Primary Contact Name
                </label>
                <Input
                  type="text"
                  placeholder="Parent / Guardian"
                  value={formData.emergency_contact_name}
                  onChange={(e) => setFormData({ ...formData, emergency_contact_name: e.target.value })}
                  className="h-8 text-xs bg-background"
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-muted-foreground mb-1">
                  Relationship
                </label>
                <Input
                  type="text"
                  placeholder="Father / Mother"
                  value={formData.emergency_contact_relation}
                  onChange={(e) => setFormData({ ...formData, emergency_contact_relation: e.target.value })}
                  className="h-8 text-xs bg-background"
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-muted-foreground mb-1">
                  Phone Number
                </label>
                <Input
                  type="text"
                  placeholder="+91 9876543210"
                  value={formData.emergency_contact_phone}
                  onChange={(e) => setFormData({ ...formData, emergency_contact_phone: e.target.value })}
                  className="h-8 text-xs bg-background"
                />
              </div>
            </div>
          </div>

          <DialogFooter className="pt-3 border-t border-border/40 gap-2">
            <Button type="button" variant="outline" size="sm" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={loading} className="gap-1.5">
              {loading && <Loader2 className="h-3.5 w-3.5 animate-spin" />} Save Medical Card
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
