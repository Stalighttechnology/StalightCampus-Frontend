import React from "react";
import { Heart, FileText, Edit2, Trash2, Hospital, HeartPulse, Stethoscope, Calendar, Eye } from "lucide-react";
import { StudentHealthCheckRecord, StudentTreatmentReferral } from "../../../utils/sports_wellness_api";
import { Badge } from "../../ui/badge";
import { Button } from "../../ui/button";
import {
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../ui/table";

interface VitalsLogTableProps {
  checkups: StudentHealthCheckRecord[];
  treatments: StudentTreatmentReferral[];
  loading: boolean;
  activeSubTab: "checkups" | "treatments";
  onSubTabChange: (tab: "checkups" | "treatments") => void;
  // Checkup pagination
  checkupPage: number;
  checkupTotalPages: number;
  checkupTotalCount: number;
  checkupPageSize: number;
  onCheckupPageChange: (page: number) => void;
  onCheckupPageSizeChange: (pageSize: number) => void;
  // Treatment pagination
  treatmentPage: number;
  treatmentTotalPages: number;
  treatmentTotalCount: number;
  treatmentPageSize: number;
  onTreatmentPageChange: (page: number) => void;
  onTreatmentPageSizeChange: (pageSize: number) => void;
  readOnly?: boolean;
  onViewCheckup?: (item: StudentHealthCheckRecord) => void;
  onEditCheckup?: (item: StudentHealthCheckRecord) => void;
  onDeleteCheckup?: (id: number) => void;
  onViewTreatment?: (item: StudentTreatmentReferral) => void;
  onEditTreatment?: (item: StudentTreatmentReferral) => void;
  onDeleteTreatment?: (id: number) => void;
}

export const VitalsLogTable: React.FC<VitalsLogTableProps> = ({
  checkups,
  treatments,
  loading,
  activeSubTab,
  onSubTabChange,
  checkupPage,
  checkupTotalPages,
  checkupTotalCount,
  checkupPageSize,
  onCheckupPageChange,
  treatmentPage,
  treatmentTotalPages,
  treatmentTotalCount,
  treatmentPageSize,
  onTreatmentPageChange,
  readOnly = true,
  onViewCheckup,
  onEditCheckup,
  onDeleteCheckup,
  onViewTreatment,
  onEditTreatment,
  onDeleteTreatment,
}) => {
  return (
    <div className="w-full bg-card">
      {/* Sub-tab switcher matching Announcements Segmented Control */}
      <div className="p-3 sm:p-4 border-b border-border bg-card flex items-center justify-between flex-wrap gap-3">
        <div className="grid grid-cols-2 p-1 rounded-xl bg-muted border border-border w-full sm:flex sm:w-auto self-start gap-1">
          <button
            onClick={() => onSubTabChange("checkups")}
            className={`py-2 px-2 sm:px-4 rounded-lg text-xs sm:text-sm font-semibold transition-all flex items-center justify-center gap-1.5 whitespace-nowrap min-w-0 ${
              activeSubTab === "checkups"
                ? "bg-primary text-white shadow-sm"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
            }`}
          >
            <Heart className={`w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0 ${activeSubTab === "checkups" ? "text-white" : "text-rose-500"}`} />
            <span className="hidden sm:inline truncate">Health Checkups & Vitals</span>
            <span className="sm:hidden truncate">Checkups</span>
            {checkupTotalCount > 0 && (
              <Badge
                className={`text-[10px] h-4 px-1.5 border-none shrink-0 ${
                  activeSubTab === "checkups"
                    ? "bg-white/20 text-white"
                    : "bg-primary/10 text-primary"
                }`}
              >
                {checkupTotalCount}
              </Badge>
            )}
          </button>

          <button
            onClick={() => onSubTabChange("treatments")}
            className={`py-2 px-2 sm:px-4 rounded-lg text-xs sm:text-sm font-semibold transition-all flex items-center justify-center gap-1.5 whitespace-nowrap min-w-0 ${
              activeSubTab === "treatments"
                ? "bg-primary text-white shadow-sm"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
            }`}
          >
            <Hospital className={`w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0 ${activeSubTab === "treatments" ? "text-white" : "text-primary"}`} />
            <span className="hidden sm:inline truncate">Clinic Treatments & Referrals</span>
            <span className="sm:hidden truncate">Treatments</span>
            {treatmentTotalCount > 0 && (
              <Badge
                className={`text-[10px] h-4 px-1.5 border-none shrink-0 ${
                  activeSubTab === "treatments"
                    ? "bg-white/20 text-white"
                    : "bg-primary/10 text-primary"
                }`}
              >
                {treatmentTotalCount}
              </Badge>
            )}
          </button>
        </div>
      </div>

      <div>
        {loading ? (
          <div className="p-16 text-center text-xs sm:text-sm text-muted-foreground">
            Loading medical records...
          </div>
        ) : activeSubTab === "checkups" ? (
          /* Checkups View */
          <div>
            {checkups.length === 0 ? (
              <div className="py-20 text-center space-y-3 px-4">
                <div className="mx-auto w-16 h-16 rounded-3xl bg-muted flex items-center justify-center text-muted-foreground">
                  <HeartPulse className="w-8 h-8 text-rose-500 opacity-80" />
                </div>
                <div className="space-y-1">
                  <h4 className="text-base font-semibold text-foreground">
                    No Health Checkup Records Found
                  </h4>
                  <p className="text-xs sm:text-sm text-muted-foreground max-w-sm mx-auto">
                    {readOnly
                      ? "No admission health checks or periodic routine checkups are recorded."
                      : "Record admission vitals, BMI, blood pressure, vision, and routine checkups."}
                  </p>
                </div>
              </div>
            ) : (
              <>
                {/* Desktop Table (Large Screens) */}
                <div className="hidden lg:block w-full max-w-full overflow-x-auto overflow-y-scroll max-h-[460px] custom-scrollbar [scrollbar-gutter:stable] [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar]:block [&::-webkit-scrollbar-track]:bg-muted/40 [&::-webkit-scrollbar-thumb]:bg-muted-foreground/40 hover:[&::-webkit-scrollbar-thumb]:bg-muted-foreground/60 [&::-webkit-scrollbar-thumb]:rounded-full border-b border-border">
                  <table className="w-full caption-bottom text-sm border-collapse min-w-[850px]">
                    <TableHeader className="sticky top-0 z-20 bg-muted/95 backdrop-blur-md shadow-xs">
                      <TableRow className="border-b border-border bg-muted/95">
                        <TableHead className="text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground py-3 w-12 sticky top-0 bg-muted/95">
                          #
                        </TableHead>
                        <TableHead className="text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground py-3 min-w-[220px] sticky top-0 bg-muted/95">
                          Student
                        </TableHead>
                        <TableHead className="text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground py-3 sticky top-0 bg-muted/95">
                          Checkup Type
                        </TableHead>
                        <TableHead className="text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground py-3 sticky top-0 bg-muted/95">
                          Vitals & Health Details
                        </TableHead>
                        {!readOnly && (
                          <TableHead className="text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground py-3 sticky top-0 bg-muted/95">
                            Actions
                          </TableHead>
                        )}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {checkups.map((c, idx) => {
                        const rowNumber = (checkupPage - 1) * checkupPageSize + idx + 1;
                        return (
                          <TableRow key={c.id} className="text-xs hover:bg-muted/40 transition-colors">
                            <TableCell className="text-center text-muted-foreground font-mono text-xs">
                              {rowNumber}
                            </TableCell>
                            <TableCell className="px-4 py-3">
                              <div className="font-semibold text-foreground text-sm leading-tight">{c.student_name}</div>
                              <div className="text-muted-foreground font-mono text-xs mt-0.5">
                                {c.usn} {c.branch_name ? `• ${c.branch_name}` : ""}
                              </div>
                            </TableCell>
                            <TableCell className="text-center px-4 py-3">
                              <Badge variant="outline" className="font-semibold text-xs py-0.5 px-2 bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 border-blue-200 dark:border-blue-800">
                                {c.check_type_display}
                              </Badge>
                              <div className="text-muted-foreground text-[11px] mt-0.5">{c.check_date}</div>
                            </TableCell>
                            <TableCell className="text-center px-4 py-3">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => onViewCheckup?.(c)}
                                className="h-7 text-xs gap-1 px-2.5 hover:bg-primary/10 hover:text-primary hover:border-primary/40 transition-colors"
                              >
                                <Eye className="h-3.5 w-3.5 text-primary" />
                                <span>View</span>
                              </Button>
                            </TableCell>
                            {!readOnly && (
                              <TableCell className="text-center px-4 py-3">
                                <div className="flex items-center justify-center gap-1">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => onViewCheckup?.(c)}
                                    className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
                                    title="View Details"
                                  >
                                    <Eye className="h-4 w-4" />
                                  </Button>
                                  {onEditCheckup && (
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => onEditCheckup(c)}
                                      className="h-8 w-8 p-0 text-muted-foreground hover:text-amber-600"
                                      title="Edit Checkup"
                                    >
                                      <Edit2 className="h-4 w-4" />
                                    </Button>
                                  )}
                                  {onDeleteCheckup && (
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => {
                                        if (window.confirm("Delete checkup record?")) onDeleteCheckup(c.id);
                                      }}
                                      className="h-8 w-8 p-0 text-destructive hover:bg-destructive/10"
                                      title="Delete Checkup"
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  )}
                                </div>
                              </TableCell>
                            )}
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </table>
                </div>

                {/* Mobile Cards (< 1024px) */}
                <div className="block lg:hidden max-h-[460px] overflow-y-scroll custom-scrollbar p-3 sm:p-4 space-y-3 border-b border-border">
                  {checkups.map((c, idx) => {
                    const rowNumber = (checkupPage - 1) * checkupPageSize + idx + 1;
                    return (
                      <div
                        key={c.id}
                        className="p-3.5 sm:p-4 rounded-xl border border-border bg-card shadow-xs flex flex-col gap-2.5 overflow-hidden"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 sm:gap-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="text-xs font-mono font-bold px-1.5 py-0.5 rounded bg-muted text-muted-foreground shrink-0">
                              #{rowNumber}
                            </span>
                            <div className="min-w-0">
                              <div className="font-semibold text-foreground text-sm truncate">{c.student_name}</div>
                              <div className="text-xs text-muted-foreground font-mono">{c.usn}</div>
                            </div>
                          </div>

                          <Badge variant="outline" className="font-semibold text-[10px] sm:text-[11px] py-0.5 px-2 bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 border-blue-200 w-fit shrink-0 self-start sm:self-auto">
                            {c.check_type_display}
                          </Badge>
                        </div>

                        <div className="flex items-center justify-between text-xs bg-muted/30 p-2.5 sm:p-3 rounded-lg border border-border/50">
                          <span className="text-muted-foreground">Examination Date:</span>
                          <span className="text-foreground font-medium">{c.check_date}</span>
                        </div>

                        <div className="flex items-center justify-end gap-1 pt-1 border-t border-border/40">
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 sm:h-8 px-2.5 text-xs gap-1"
                            onClick={() => onViewCheckup?.(c)}
                          >
                            <Eye className="w-3.5 h-3.5" /> Details
                          </Button>

                          {!readOnly && onEditCheckup && (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 sm:h-8 w-7 sm:w-8 p-0 text-muted-foreground hover:text-amber-600"
                              onClick={() => onEditCheckup(c)}
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </Button>
                          )}

                          {!readOnly && onDeleteCheckup && (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 sm:h-8 w-7 sm:w-8 p-0 text-destructive hover:bg-destructive/10"
                              onClick={() => {
                                if (window.confirm("Delete checkup record?")) onDeleteCheckup(c.id);
                              }}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Standard Pagination matching Activity Table */}
                {checkupTotalCount > 0 && (
                  <div className="flex flex-col sm:flex-row justify-between items-center gap-3 text-xs sm:text-sm text-muted-foreground px-4 sm:px-6 py-3.5 border-t border-border mt-auto">
                    <div>
                      Showing {Math.min((checkupPage - 1) * checkupPageSize + 1, checkupTotalCount)} to {Math.min(checkupPage * checkupPageSize, checkupTotalCount)} of {checkupTotalCount} checkups
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onCheckupPageChange(Math.max(1, checkupPage - 1))}
                        disabled={checkupPage === 1 || loading}
                        className="bg-primary hover:bg-primary/90 text-white border-primary h-8 px-4 text-xs transition-all"
                      >
                        Previous
                      </Button>

                      <div className="flex items-center justify-center min-w-[2rem]">
                        <span className="text-xs sm:text-sm font-semibold text-foreground">
                          {checkupPage}
                        </span>
                      </div>

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onCheckupPageChange(Math.min(checkupTotalPages, checkupPage + 1))}
                        disabled={checkupPage >= checkupTotalPages || loading}
                        className="bg-primary hover:bg-primary/90 text-white border-primary h-8 px-4 text-xs transition-all"
                      >
                        Next
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        ) : (
          /* Treatments View */
          <div>
            {treatments.length === 0 ? (
              <div className="py-20 text-center space-y-3 px-4">
                <div className="mx-auto w-16 h-16 rounded-3xl bg-muted flex items-center justify-center text-muted-foreground">
                  <Hospital className="w-8 h-8 text-primary opacity-80" />
                </div>
                <div className="space-y-1">
                  <h4 className="text-base font-semibold text-foreground">
                    No Dispensary Treatments Or Referrals Found
                  </h4>
                  <p className="text-xs sm:text-sm text-muted-foreground max-w-sm mx-auto">
                    No clinic visits, prescriptions, or external hospital referrals logged yet.
                  </p>
                </div>
              </div>
            ) : (
              <>
                {/* Desktop Table (Large Screens) */}
                <div className="hidden lg:block w-full max-w-full overflow-x-auto overflow-y-scroll max-h-[470px] custom-scrollbar [scrollbar-gutter:stable] [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar]:block [&::-webkit-scrollbar-track]:bg-muted/40 [&::-webkit-scrollbar-thumb]:bg-muted-foreground/40 hover:[&::-webkit-scrollbar-thumb]:bg-muted-foreground/60 [&::-webkit-scrollbar-thumb]:rounded-full border-b border-border">
                  <table className="w-full caption-bottom text-sm border-collapse min-w-[850px]">
                    <TableHeader className="sticky top-0 z-20 bg-muted/95 backdrop-blur-md shadow-xs">
                      <TableRow className="border-b border-border bg-muted/95">
                        <TableHead className="text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground py-3 w-12 sticky top-0 bg-muted/95">
                          #
                        </TableHead>
                        <TableHead className="text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground py-3 min-w-[220px] sticky top-0 bg-muted/95">
                          Student
                        </TableHead>
                        <TableHead className="text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground py-3 min-w-[180px] sticky top-0 bg-muted/95">
                          Diagnosis
                        </TableHead>
                        <TableHead className="text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground py-3 sticky top-0 bg-muted/95">
                          Treatment & Referral Details
                        </TableHead>
                        {!readOnly && (
                          <TableHead className="text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground py-3 sticky top-0 bg-muted/95">
                            Actions
                          </TableHead>
                        )}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {treatments.map((t, idx) => {
                        const rowNumber = (treatmentPage - 1) * treatmentPageSize + idx + 1;
                        return (
                          <TableRow key={t.id} className="text-xs hover:bg-muted/40 transition-colors">
                            <TableCell className="text-center text-muted-foreground font-mono text-xs">
                              {rowNumber}
                            </TableCell>
                            <TableCell className="px-4 py-3">
                              <div className="font-semibold text-foreground text-sm leading-tight">{t.student_name}</div>
                              <div className="text-muted-foreground font-mono text-xs mt-0.5">
                                {t.usn} {t.branch_name ? `• ${t.branch_name}` : ""}
                              </div>
                            </TableCell>
                            <TableCell className="px-4 py-3 font-medium text-foreground text-xs">
                              {t.diagnosis || "—"}
                            </TableCell>
                            <TableCell className="text-center px-4 py-3">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => onViewTreatment?.(t)}
                                className="h-7 text-xs gap-1 px-2.5 hover:bg-primary/10 hover:text-primary hover:border-primary/40 transition-colors"
                              >
                                <Eye className="h-3.5 w-3.5 text-primary" />
                                <span>View</span>
                              </Button>
                            </TableCell>
                            {!readOnly && (
                              <TableCell className="text-center px-4 py-3">
                                <div className="flex items-center justify-center gap-1">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => onViewTreatment?.(t)}
                                    className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
                                    title="View Details"
                                  >
                                    <Eye className="h-4 w-4" />
                                  </Button>
                                  {onEditTreatment && (
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => onEditTreatment(t)}
                                      className="h-8 w-8 p-0 text-muted-foreground hover:text-amber-600"
                                      title="Edit Treatment"
                                    >
                                      <Edit2 className="h-4 w-4" />
                                    </Button>
                                  )}
                                  {onDeleteTreatment && (
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => {
                                        if (window.confirm("Delete treatment entry?")) onDeleteTreatment(t.id);
                                      }}
                                      className="h-8 w-8 p-0 text-destructive hover:bg-destructive/10"
                                      title="Delete Treatment"
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  )}
                                </div>
                              </TableCell>
                            )}
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </table>
                </div>

                {/* Mobile Cards (< 1024px) */}
                <div className="block lg:hidden max-h-[470px] overflow-y-scroll custom-scrollbar p-3 sm:p-4 space-y-3 border-b border-border">
                  {treatments.map((t, idx) => {
                    const rowNumber = (treatmentPage - 1) * treatmentPageSize + idx + 1;
                    return (
                      <div
                        key={t.id}
                        className="p-3.5 sm:p-4 rounded-xl border border-border bg-card shadow-xs flex flex-col gap-2.5 overflow-hidden"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 sm:gap-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="text-xs font-mono font-bold px-1.5 py-0.5 rounded bg-muted text-muted-foreground shrink-0">
                              #{rowNumber}
                            </span>
                            <div className="min-w-0">
                              <div className="font-semibold text-foreground text-sm truncate">{t.student_name}</div>
                              <div className="text-xs text-muted-foreground font-mono">{t.usn}</div>
                            </div>
                          </div>
                        </div>

                        <div className="bg-muted/30 p-2.5 sm:p-3 rounded-lg border border-border/50 space-y-1 text-xs">
                          <span className="text-muted-foreground block text-[11px]">Diagnosis:</span>
                          <span className="font-semibold text-foreground">{t.diagnosis || "—"}</span>
                        </div>

                        <div className="flex items-center justify-end gap-1 pt-1 border-t border-border/40">
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 sm:h-8 px-2.5 text-xs gap-1"
                            onClick={() => onViewTreatment?.(t)}
                          >
                            <Eye className="w-3.5 h-3.5" /> Details
                          </Button>

                          {!readOnly && onEditTreatment && (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 sm:h-8 w-7 sm:w-8 p-0 text-muted-foreground hover:text-amber-600"
                              onClick={() => onEditTreatment(t)}
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </Button>
                          )}

                          {!readOnly && onDeleteTreatment && (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 sm:h-8 w-7 sm:w-8 p-0 text-destructive hover:bg-destructive/10"
                              onClick={() => {
                                if (window.confirm("Delete treatment entry?")) onDeleteTreatment(t.id);
                              }}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Standard Pagination matching Activity Table */}
                {treatmentTotalCount > 0 && (
                  <div className="flex flex-col sm:flex-row justify-between items-center gap-3 text-xs sm:text-sm text-muted-foreground px-4 sm:px-6 py-3.5 border-t border-border mt-auto">
                    <div>
                      Showing {Math.min((treatmentPage - 1) * treatmentPageSize + 1, treatmentTotalCount)} to {Math.min(treatmentPage * treatmentPageSize, treatmentTotalCount)} of {treatmentTotalCount} treatments
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onTreatmentPageChange(Math.max(1, treatmentPage - 1))}
                        disabled={treatmentPage === 1 || loading}
                        className="bg-primary hover:bg-primary/90 text-white border-primary h-8 px-4 text-xs transition-all"
                      >
                        Previous
                      </Button>

                      <div className="flex items-center justify-center min-w-[2rem]">
                        <span className="text-xs sm:text-sm font-semibold text-foreground">
                          {treatmentPage}
                        </span>
                      </div>

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onTreatmentPageChange(Math.min(treatmentTotalPages, treatmentPage + 1))}
                        disabled={treatmentPage >= treatmentTotalPages || loading}
                        className="bg-primary hover:bg-primary/90 text-white border-primary h-8 px-4 text-xs transition-all"
                      >
                        Next
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default VitalsLogTable;
