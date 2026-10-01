import React, { useState, useEffect } from "react";
import {
  sportsWellnessApi,
  StudentMedicalProfile,
  StudentHealthCheckRecord,
  StudentTreatmentReferral,
  StudentSearchItem,
} from "../../../utils/sports_wellness_api";
import { MedicalAlertBanner } from "./MedicalAlertBanner";
import { VitalsLogTable } from "./VitalsLogTable";
import { HealthCheckModal } from "./HealthCheckModal";
import { HealthCheckDetailModal } from "./HealthCheckDetailModal";
import { TreatmentModal } from "./TreatmentModal";
import { TreatmentDetailModal } from "./TreatmentDetailModal";
import { MedicalProfileEditModal } from "./MedicalProfileEditModal";
import { StudentSearchSelector } from "../common/StudentSearchSelector";

interface MedicalOverviewTabProps {
  readOnly?: boolean;
  selectedStudent: StudentSearchItem | null;
  onSelectStudent: (student: StudentSearchItem | null) => void;
  triggerNewCheckup?: boolean;
  onResetTriggerCheckup?: () => void;
  triggerNewTreatment?: boolean;
  onResetTriggerTreatment?: () => void;
}

export const MedicalOverviewTab: React.FC<MedicalOverviewTabProps> = ({
  readOnly = true,
  selectedStudent,
  onSelectStudent,
  triggerNewCheckup,
  onResetTriggerCheckup,
  triggerNewTreatment,
  onResetTriggerTreatment,
}) => {
  const [medicalProfile, setMedicalProfile] = useState<StudentMedicalProfile | null>(null);

  // Checkups State
  const [checkups, setCheckups] = useState<StudentHealthCheckRecord[]>([]);
  const [checkupPage, setCheckupPage] = useState(1);
  const [checkupPageSize, setCheckupPageSize] = useState(10);
  const [checkupTotalPages, setCheckupTotalPages] = useState(1);
  const [checkupTotalCount, setCheckupTotalCount] = useState(0);

  // Treatments State
  const [treatments, setTreatments] = useState<StudentTreatmentReferral[]>([]);
  const [treatmentPage, setTreatmentPage] = useState(1);
  const [treatmentPageSize, setTreatmentPageSize] = useState(10);
  const [treatmentTotalPages, setTreatmentTotalPages] = useState(1);
  const [treatmentTotalCount, setTreatmentTotalCount] = useState(0);

  const [loading, setLoading] = useState(false);
  const [activeSubTab, setActiveSubTab] = useState<"checkups" | "treatments">("checkups");

  // Modals
  const [showHealthCheckModal, setShowHealthCheckModal] = useState(false);
  const [editingCheckup, setEditingCheckup] = useState<StudentHealthCheckRecord | null>(null);
  const [viewingCheckup, setViewingCheckup] = useState<StudentHealthCheckRecord | null>(null);
  const [showTreatmentModal, setShowTreatmentModal] = useState(false);
  const [editingTreatment, setEditingTreatment] = useState<StudentTreatmentReferral | null>(null);
  const [viewingTreatment, setViewingTreatment] = useState<StudentTreatmentReferral | null>(null);
  const [showProfileEditModal, setShowProfileEditModal] = useState(false);

  // External trigger from header button
  useEffect(() => {
    if (triggerNewCheckup) {
      setEditingCheckup(null);
      setShowHealthCheckModal(true);
      onResetTriggerCheckup?.();
    }
  }, [triggerNewCheckup, onResetTriggerCheckup]);

  useEffect(() => {
    if (triggerNewTreatment) {
      setEditingTreatment(null);
      setShowTreatmentModal(true);
      onResetTriggerTreatment?.();
    }
  }, [triggerNewTreatment, onResetTriggerTreatment]);

  // Fetch Student Medical Profile when student is selected
  useEffect(() => {
    if (!selectedStudent) {
      setMedicalProfile(null);
      return;
    }

    const fetchProfile = async () => {
      try {
        const data = await sportsWellnessApi.fetchMedicalProfile(selectedStudent.id);
        setMedicalProfile(data);
      } catch (err) {
        console.error("Failed to load medical profile:", err);
      }
    };
    fetchProfile();
  }, [selectedStudent]);

  // Fetch Checkups or Treatments on demand based on active subtab
  const loadRecords = async () => {
    setLoading(true);
    try {
      if (activeSubTab === "checkups") {
        const checkupData = await sportsWellnessApi.fetchHealthChecks({
          student_id: selectedStudent?.id,
          page: checkupPage,
          page_size: checkupPageSize,
        });
        setCheckups(checkupData.results);
        setCheckupTotalCount(checkupData.count);
        setCheckupTotalPages(checkupData.total_pages);
      } else {
        const treatmentData = await sportsWellnessApi.fetchTreatments({
          student_id: selectedStudent?.id,
          page: treatmentPage,
          page_size: treatmentPageSize,
        });
        setTreatments(treatmentData.results);
        setTreatmentTotalCount(treatmentData.count);
        setTreatmentTotalPages(treatmentData.total_pages);
      }
    } catch (err) {
      console.error("Failed to fetch medical records:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRecords();
  }, [
    selectedStudent,
    activeSubTab,
    activeSubTab === "checkups" ? checkupPage : treatmentPage,
    activeSubTab === "checkups" ? checkupPageSize : treatmentPageSize,
  ]);

  return (
    <div className="w-full">
      {/* Search Filter Bar */}
      <div className="p-4 border-b border-border bg-card">
        <div className="w-full sm:max-w-md">
          <StudentSearchSelector
            selectedStudent={selectedStudent}
            onSelectStudent={onSelectStudent}
            placeholder="Search student by name or USN..."
          />
        </div>
      </div>

      {/* Emergency & Alert Banner (Shown when a student is selected) */}
      {selectedStudent && (
        <div className="p-4 border-b border-border">
          <MedicalAlertBanner
            profile={medicalProfile}
            readOnly={readOnly}
            onEditProfile={() => setShowProfileEditModal(true)}
          />
        </div>
      )}

      {/* History Log Table with identical styling & scrollable viewport */}
      <VitalsLogTable
        checkups={checkups}
        treatments={treatments}
        loading={loading}
        activeSubTab={activeSubTab}
        onSubTabChange={setActiveSubTab}
        checkupPage={checkupPage}
        checkupTotalPages={checkupTotalPages}
        checkupTotalCount={checkupTotalCount}
        checkupPageSize={checkupPageSize}
        onCheckupPageChange={setCheckupPage}
        onCheckupPageSizeChange={setCheckupPageSize}
        treatmentPage={treatmentPage}
        treatmentTotalPages={treatmentTotalPages}
        treatmentTotalCount={treatmentTotalCount}
        treatmentPageSize={treatmentPageSize}
        onTreatmentPageChange={setTreatmentPage}
        onTreatmentPageSizeChange={setTreatmentPageSize}
        readOnly={readOnly}
        onViewCheckup={(item) => setViewingCheckup(item)}
        onEditCheckup={(item) => {
          setEditingCheckup(item);
          setShowHealthCheckModal(true);
        }}
        onDeleteCheckup={async (id) => {
          try {
            await sportsWellnessApi.deleteHealthCheck(id);
            loadRecords();
          } catch (err) {
            alert("Failed to delete health checkup");
          }
        }}
        onViewTreatment={(item) => setViewingTreatment(item)}
        onEditTreatment={(item) => {
          setEditingTreatment(item);
          setShowTreatmentModal(true);
        }}
        onDeleteTreatment={async (id) => {
          try {
            await sportsWellnessApi.deleteTreatment(id);
            loadRecords();
          } catch (err) {
            alert("Failed to delete treatment entry");
          }
        }}
      />

      {/* Modals */}
      {viewingCheckup && (
        <HealthCheckDetailModal
          checkup={viewingCheckup}
          onClose={() => setViewingCheckup(null)}
        />
      )}

      {viewingTreatment && (
        <TreatmentDetailModal
          treatment={viewingTreatment}
          onClose={() => setViewingTreatment(null)}
        />
      )}

      {showHealthCheckModal && (
        <HealthCheckModal
          checkup={editingCheckup}
          selectedStudent={selectedStudent}
          onClose={() => setShowHealthCheckModal(false)}
          onSuccess={() => {
            setShowHealthCheckModal(false);
            loadRecords();
          }}
        />
      )}

      {showTreatmentModal && (
        <TreatmentModal
          treatment={editingTreatment}
          selectedStudent={selectedStudent}
          onClose={() => setShowTreatmentModal(false)}
          onSuccess={() => {
            setShowTreatmentModal(false);
            loadRecords();
          }}
        />
      )}

      {showProfileEditModal && medicalProfile && (
        <MedicalProfileEditModal
          profile={medicalProfile}
          onClose={() => setShowProfileEditModal(false)}
          onSuccess={(updated) => {
            setMedicalProfile(updated);
            setShowProfileEditModal(false);
          }}
        />
      )}
    </div>
  );
};

export default MedicalOverviewTab;
