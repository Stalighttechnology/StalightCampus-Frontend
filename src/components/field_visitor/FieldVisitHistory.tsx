import React, { useState, useEffect } from "react";
import { useTheme } from "../../context/ThemeContext";
import {
  getFieldVisits,
  getFieldVisitDetail,
  downloadFieldVisitPdf,
  FieldVisitInspection,
  updateFieldVisit,
} from "../../utils/field_visitor_api";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../ui/card";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Badge } from "../ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "../ui/dialog";
import {
  Calendar,
  Clock,
  Building,
  Building2,
  School,
  User,
  Users,
  Star,
  Search,
  Eye,
  Camera,
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  FileText,
  Printer,
  ChevronRight,
  Filter,
  Utensils,
  Home,
  ShieldCheck,
  CheckSquare,
  MapPin,
  ExternalLink,
  Loader2,
} from "lucide-react";
import Swal from "sweetalert2";

interface FieldVisitHistoryProps {
  onStartNewVisit?: (orgId?: number) => void;
}

const getStatusBadge = (status: string, theme: string) => {
  const baseClass = "px-3 py-1 rounded-full text-xs font-medium inline-block";
  const s = (status || "").toUpperCase();
  if (s === "RESOLVED")
    return <span className={`${baseClass} ${theme === 'dark' ? 'bg-green-900/80 text-green-300' : 'bg-green-100 text-green-700'}`}>Resolved</span>;
  if (s === "ACTION_REQUIRED")
    return <span className={`${baseClass} ${theme === 'dark' ? 'bg-red-900/80 text-red-300' : 'bg-red-100 text-red-700'}`}>Action Required</span>;
  if (s === "IN_REVIEW")
    return <span className={`${baseClass} ${theme === 'dark' ? 'bg-amber-900/80 text-amber-300' : 'bg-amber-100 text-amber-700'}`}>In Review</span>;
  return <span className={`${baseClass} ${theme === 'dark' ? 'bg-zinc-800 text-zinc-300 border border-zinc-700' : 'bg-gray-100 text-gray-700 border border-gray-200'}`}>Submitted</span>;
};

export const FieldVisitHistory: React.FC<FieldVisitHistoryProps> = ({ onStartNewVisit }) => {
  const { theme } = useTheme();
  const [visits, setVisits] = useState<FieldVisitInspection[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedVisit, setSelectedVisit] = useState<FieldVisitInspection | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    fetchVisits();
  }, []);

  const fetchVisits = async () => {
    setLoading(true);
    const res = await getFieldVisits();
    if (res.success) {
      setVisits(res.visits);
    }
    setLoading(false);
  };

  const handleOpenDetail = async (visit: FieldVisitInspection) => {
    setSelectedVisit(visit);
    setIsModalOpen(true);
    if (visit.id) {
      setLoadingDetail(true);
      const res = await getFieldVisitDetail(visit.id);
      if (res.success && res.report) {
        setSelectedVisit(res.report);
      }
      setLoadingDetail(false);
    }
  };

  const filteredVisits = visits.filter((v) => {
    const s = search.toLowerCase();
    return (
      (v.school_name || v.org_name || "").toLowerCase().includes(s) ||
      (v.principal_name || "").toLowerCase().includes(s) ||
      (v.observations || "").toLowerCase().includes(s)
    );
  });

  const handlePrint = async () => {
    if (!selectedVisit?.id) return;
    setDownloadingPdf(true);
    const cleanSchool = (selectedVisit.school_name || 'School').replace(/[^a-zA-Z0-9_-]/g, '_');
    const filename = `Inspection_Report_${cleanSchool}_${selectedVisit.visit_date}_${selectedVisit.id}.pdf`;
    await downloadFieldVisitPdf(selectedVisit.id, filename);
    setDownloadingPdf(false);
  };

  return (
    <div className={`users-container text-sm sm:text-base max-w-none mx-auto ${theme === 'dark' ? 'bg-background' : 'bg-gray-50'}`}>
      <Card id="inspection-history-card" className={`users-card ${theme === 'dark' ? 'bg-card border border-border' : 'bg-white border border-gray-200'}`}>
        <div id="inspection-history-header-filters">
          <CardHeader className="users-card-header border-b pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex-1 min-w-0">
              <CardTitle className={`users-card-title text-xl sm:text-2xl font-semibold ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>
                Field Inspection History
              </CardTitle>
              <p className={`users-card-desc text-sm mt-1 ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}`}>
                Manage and review all school inspections filed across institutions
              </p>
            </div>

            <div className="flex items-center gap-2">
              {onStartNewVisit && (
                <Button
                  onClick={() => onStartNewVisit()}
                  className="flex gap-2 items-center bg-primary text-white hover:bg-primary/90 border border-primary transition-all text-xs sm:text-sm font-semibold cursor-pointer shadow-sm"
                >
                  <Building className="w-4 h-4" /> Record New Inspection
                </Button>
              )}
            </div>
          </CardHeader>

          <CardContent className="users-card-content pt-4 pb-4">
            {/* Global Search Box */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 mb-2">
              <div className="w-full sm:max-w-md">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 opacity-40" />
                  <Input
                    placeholder="Search school, principal, observations..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className={`h-9 w-full pl-10 pr-12 rounded-md shadow-sm text-xs sm:text-sm ${theme === 'dark' ? 'bg-card border-border text-foreground' : 'bg-white border-gray-300 text-gray-900 focus:border-primary'}`}
                  />
                  {search && (
                    <button
                      onClick={() => setSearch("")}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-primary hover:text-primary/80 transition-colors"
                    >
                      Clear
                    </button>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </div>

        <CardContent className="users-card-content pt-0 pb-6">
          {loading ? (
            <div className="py-16 text-center text-muted-foreground text-sm flex flex-col items-center gap-2">
              <span className="text-xs">Loading inspection records...</span>
            </div>
          ) : filteredVisits.length === 0 ? (
            <div className={`flex flex-col items-center justify-center py-20 px-4 rounded-lg border-2 border-dashed ${theme === 'dark' ? 'border-border bg-card/30' : 'border-gray-200 bg-gray-50/50'}`}>
              <div className={`p-4 rounded-full mb-4 ${theme === 'dark' ? 'bg-primary/10' : 'bg-primary/5'}`}>
                <Search className="w-10 h-10 text-primary opacity-50" />
              </div>
              <h3 className={`text-lg font-semibold mb-1 ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>
                No Inspection Reports Found
              </h3>
              <p className={`text-center text-xs max-w-sm ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}`}>
                {search ? "No reports matched your search criteria. Try a different query." : "No school field inspections have been filed yet."}
              </p>
              {onStartNewVisit && !search && (
                <Button onClick={() => onStartNewVisit()} className="mt-4 gap-2 bg-primary text-white">
                  <Building className="w-4 h-4" /> Start First Inspection
                </Button>
              )}
            </div>
          ) : (
            <>
              {/* Mobile Card List (Visible on screens < md) */}
              <div className="block md:hidden space-y-3">
                {filteredVisits.map((v) => (
                  <div
                    key={v.id}
                    className={`p-3.5 rounded-xl border transition-all shadow-sm ${
                      theme === 'dark'
                        ? 'bg-card/90 border-border'
                        : 'bg-white border-gray-200'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div>
                        <div className="font-bold text-sm text-foreground flex items-center gap-1.5">
                          <School className="w-4 h-4 text-primary shrink-0" />
                          {v.school_name || v.org_name}
                        </div>
                        <div className="text-[11px] text-muted-foreground flex items-center gap-1.5 mt-0.5">
                          <Calendar className="w-3.5 h-3.5" />
                          {v.visit_date} {v.visit_time ? `• ${v.visit_time}` : ''}
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        {getStatusBadge(v.follow_up_status, theme)}
                        <span className="text-xs font-bold text-amber-500">⭐ {v.overall_score_rating}/5.0</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs py-1.5 border-t border-b border-border/40 my-2">
                      <div>
                        <span className="text-[10px] text-muted-foreground block">Principal</span>
                        <span className="font-medium text-foreground truncate block">{v.principal_name || "—"}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-muted-foreground block">Evidence</span>
                        <span className="font-medium text-foreground flex items-center gap-1">
                          <Camera className="w-3 h-3 text-muted-foreground" />
                          {v.photos_count ?? v.photos?.length ?? 0} attached
                        </span>
                      </div>
                    </div>

                    {v.observations && (
                      <p className={`text-xs p-2.5 rounded-lg mb-2.5 line-clamp-2 ${theme === 'dark' ? 'bg-muted/40 text-muted-foreground' : 'bg-gray-50 text-gray-600'}`}>
                        {v.observations}
                      </p>
                    )}

                    <div className="pt-2 border-t border-border/60">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleOpenDetail(v)}
                        className={`w-full text-xs font-semibold gap-1.5 h-9 rounded-lg transition-all flex items-center justify-center ${
                          theme === 'dark'
                            ? 'bg-primary/10 border-primary/30 text-primary hover:bg-primary hover:text-white'
                            : 'bg-primary/5 border-primary/20 text-primary hover:bg-primary hover:text-white'
                        }`}
                      >
                        <Eye className="w-4 h-4" /> View Report
                      </Button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Desktop Table (Visible on screens >= md) */}
              <div className="hidden md:block table-wrapper overflow-x-auto custom-scrollbar border rounded-lg">
                <table className="users-table w-full text-left">
                  <thead className={`table-header border-b text-xs font-bold uppercase tracking-wider ${theme === 'dark' ? 'border-border text-foreground bg-muted/30' : 'border-gray-200 text-gray-700 bg-gray-50'}`}>
                    <tr>
                      <th className="py-3 px-4">Date & Time</th>
                      <th className="py-3 px-3">Institution / School</th>
                      <th className="py-3 px-3">Principal</th>
                      <th className="py-3 px-3">Audit Score</th>
                      <th className="py-3 px-3">Evidence</th>
                      <th className="py-3 px-3">Status</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredVisits.map((v) => (
                      <tr
                        key={v.id}
                        className={`table-row border-b transition-colors duration-150 ${theme === 'dark' ? 'border-border' : 'border-gray-100'}`}
                      >
                        <td className="py-3 px-4 whitespace-nowrap text-xs">
                          <div className="font-semibold text-foreground flex items-center gap-1.5">
                            <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
                            {v.visit_date}
                          </div>
                          {v.visit_time && (
                            <div className="text-[11px] text-muted-foreground flex items-center gap-1 mt-0.5">
                              <Clock className="w-3 h-3" /> {v.visit_time}
                            </div>
                          )}
                        </td>
                        <td className="py-3 px-3">
                          <div className="font-bold text-sm text-foreground flex items-center gap-1.5">
                            <School className="w-4 h-4 text-primary shrink-0" />
                            {v.school_name || v.org_name}
                          </div>
                          {v.observations && (
                            <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5 max-w-xs sm:max-w-md">
                              {v.observations}
                            </p>
                          )}
                        </td>
                        <td className="py-3 px-3 text-xs whitespace-nowrap">
                          <span className="font-medium text-foreground">{v.principal_name || "—"}</span>
                        </td>
                        <td className="py-3 px-3 whitespace-nowrap text-xs font-bold text-amber-500">
                          ⭐ {v.overall_score_rating}/5.0
                        </td>
                        <td className="py-3 px-3 whitespace-nowrap text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Camera className="w-3.5 h-3.5 text-muted-foreground" />
                            {v.photos_count ?? v.photos?.length ?? 0} attached
                          </span>
                        </td>
                        <td className="py-3 px-3 whitespace-nowrap">
                          {getStatusBadge(v.follow_up_status, theme)}
                        </td>
                        <td className="py-3 px-4 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-1.5">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleOpenDetail(v)}
                              className={`text-xs gap-1 h-8 ${theme === 'dark' ? 'bg-card border-border hover:bg-accent' : 'bg-white border-gray-200 hover:bg-gray-100'}`}
                            >
                              <Eye className="w-3.5 h-3.5 text-primary" /> View Report
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Comprehensive Full Inspection Detail & Printable Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="w-[90vw] sm:w-full sm:max-w-4xl max-h-[80vh] sm:max-h-[90vh] rounded-2xl sm:rounded-xl overflow-y-auto custom-scrollbar p-3.5 sm:p-6">
          {loadingDetail && !selectedVisit?.classroom_inspection ? (
            <div className="py-24 flex flex-col items-center justify-center gap-3 text-muted-foreground">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
              <span className="text-xs font-semibold text-foreground">Loading full inspection report details...</span>
              <span className="text-[11px] text-muted-foreground">Retrieving checklists, evidence photos and institutional responses...</span>
            </div>
          ) : selectedVisit ? (
            <div className="space-y-6 print:p-0">
              {/* Report Header */}
              <div className="border-b border-border pb-4 space-y-3">
                <div className="pr-8 sm:pr-10 space-y-1.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline" className="text-xs font-bold text-primary border-primary/30">
                      Official Inspection Record #{selectedVisit.id}
                    </Badge>
                    {getStatusBadge(selectedVisit.follow_up_status, theme)}
                  </div>
                  <DialogTitle className="text-lg sm:text-xl font-bold text-foreground leading-tight">
                    {selectedVisit.school_name || selectedVisit.org_name}
                  </DialogTitle>
                  <DialogDescription className="text-xs text-muted-foreground">
                    Inspection filed for <strong>{selectedVisit.school_name || selectedVisit.org_name}</strong> on {selectedVisit.visit_date} {selectedVisit.visit_time ? `(${selectedVisit.visit_time} - ${selectedVisit.departure_time || 'Done'})` : ''}.
                  </DialogDescription>
                </div>
                <div className="flex items-center justify-between gap-3 pt-1">
                  <div className="flex items-center gap-1.5 text-xs">
                    <span className="text-muted-foreground">Overall Rating:</span>
                    <span className="font-bold text-amber-500 text-sm">⭐ {selectedVisit.overall_score_rating}/5.0</span>
                  </div>
                  <Button
                    onClick={handlePrint}
                    disabled={downloadingPdf}
                    className="h-9 px-4 bg-primary text-primary-foreground hover:bg-primary/90 flex items-center justify-center gap-2 text-xs font-medium rounded-lg shadow-sm transition-all shrink-0"
                  >
                    {downloadingPdf ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Printer className="w-3.5 h-3.5" />}
                    {downloadingPdf ? "Generating..." : "Print / PDF"}
                  </Button>
                </div>
              </div>

              {/* 1. Target Institution & Visit Logistics */}
              <Card className="border border-border shadow-sm">
                <CardHeader className="py-2.5 px-4 bg-muted/30 border-b border-border">
                  <CardTitle className="text-xs font-bold uppercase tracking-wider text-primary flex items-center gap-2">
                    <Building2 className="w-4 h-4" />
                    1. Target Institution & Visit Logistics
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  <div>
                    <span className="text-muted-foreground block text-[11px]">School / Institution:</span>
                    <span className="font-semibold text-foreground">{selectedVisit.school_name || selectedVisit.org_name}</span>
                    {selectedVisit.school_code && (
                      <span className="text-muted-foreground text-[11px] block">Code: {selectedVisit.school_code}</span>
                    )}
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-[11px]">Inspection Timing:</span>
                    <span className="font-medium text-foreground">
                      {selectedVisit.visit_date} | {selectedVisit.visit_time || "Morning"} - {selectedVisit.departure_time || "Afternoon"}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-[11px]">Accompanying Officials:</span>
                    <span className="font-medium text-foreground">
                      {selectedVisit.accompanying_officials || "Solo Inspection Officer"}
                    </span>
                  </div>
                  {selectedVisit.school_address && (
                    <div className="sm:col-span-3 pt-1 border-t border-border/50 flex items-start gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-muted-foreground shrink-0 mt-0.5" />
                      <span className="text-muted-foreground">{selectedVisit.school_address}</span>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* 2. Stakeholder Interaction & Verification */}
              <Card className="border border-border shadow-sm">
                <CardHeader className="py-2.5 px-4 bg-muted/30 border-b border-border">
                  <CardTitle className="text-xs font-bold uppercase tracking-wider text-primary flex items-center gap-2">
                    <Users className="w-4 h-4" />
                    2. Stakeholder Dialogue & Live Headcounts
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4 space-y-3 text-xs">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 bg-muted/20 rounded-lg border border-border/60">
                    <div>
                      <span className="text-muted-foreground block text-[11px]">Principal In-Charge:</span>
                      <span className="font-semibold text-foreground">
                        {selectedVisit.principal_name || "N/A"}
                      </span>
                      {selectedVisit.principal_contact && (
                        <span className="text-muted-foreground text-[11px] block">Contact: {selectedVisit.principal_contact}</span>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="p-2 bg-card rounded border border-border text-center">
                        <div className="text-[10px] text-muted-foreground">Students Present</div>
                        <div className="font-bold text-sm text-foreground">{selectedVisit.student_count_present || 0}</div>
                      </div>
                      <div className="p-2 bg-card rounded border border-border text-center">
                        <div className="text-[10px] text-muted-foreground">Teachers Present</div>
                        <div className="font-bold text-sm text-foreground">{selectedVisit.teachers_count_present || 0}</div>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <span className="font-semibold text-foreground block">Principal Administrative Notes:</span>
                      <p className="text-muted-foreground leading-relaxed p-2.5 rounded bg-card border border-border">
                        {selectedVisit.principal_interaction_notes || "Routine institutional review conducted."}
                      </p>
                    </div>
                    <div className="space-y-1">
                      <span className="font-semibold text-foreground block">Student Dialogue Notes:</span>
                      <p className="text-muted-foreground leading-relaxed p-2.5 rounded bg-card border border-border">
                        {selectedVisit.student_interaction_notes || "Interacted with students regarding amenities."}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* 3. Facility Checklists & Audit Scores */}
              <Card className="border border-border shadow-sm">
                <CardHeader className="py-2.5 px-4 bg-muted/30 border-b border-border">
                  <CardTitle className="text-xs font-bold uppercase tracking-wider text-primary flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4" />
                    3. Facility Inspection Checklists & Audit Ratings
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4 space-y-4 text-xs">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {/* Classrooms */}
                    <div className="p-3 bg-card border border-border rounded-lg space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-foreground flex items-center gap-1.5">
                          <School className="w-4 h-4 text-primary" /> Classrooms & Teaching Facilities
                        </span>
                        <Badge variant="secondary" className="text-xs font-bold text-amber-500">
                          ⭐ {selectedVisit.classroom_inspection?.rating || 4}/5
                        </Badge>
                      </div>
                      <div className="grid grid-cols-2 gap-1.5 text-[11px] text-muted-foreground">
                        <div>Cleanliness: <strong className="text-foreground">{selectedVisit.classroom_inspection?.cleanliness || 'Good'}</strong></div>
                        <div>Seating: <strong className="text-foreground">{selectedVisit.classroom_inspection?.seating_capacity || 'Adequate'}</strong></div>
                        <div>Ventilation: <strong className="text-foreground">{selectedVisit.classroom_inspection?.ventilation || 'Good'}</strong></div>
                        <div>Boards: <strong className="text-foreground">{selectedVisit.classroom_inspection?.blackboard_smartboard || 'Functional'}</strong></div>
                      </div>
                      {selectedVisit.classroom_inspection?.remarks && (
                        <p className="text-[11px] text-muted-foreground italic pt-1 border-t border-border/50">
                          "{selectedVisit.classroom_inspection.remarks}"
                        </p>
                      )}
                    </div>

                    {/* Hostel */}
                    <div className="p-3 bg-card border border-border rounded-lg space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-foreground flex items-center gap-1.5">
                          <Home className="w-4 h-4 text-primary" /> Hostel & Living Quarters
                        </span>
                        <Badge variant="secondary" className="text-xs font-bold text-amber-500">
                          {selectedVisit.hostel_inspection?.has_hostel ? `⭐ ${selectedVisit.hostel_inspection?.rating || 4}/5` : 'N/A'}
                        </Badge>
                      </div>
                      {selectedVisit.hostel_inspection?.has_hostel ? (
                        <>
                          <div className="grid grid-cols-2 gap-1.5 text-[11px] text-muted-foreground">
                            <div>Hygiene: <strong className="text-foreground">{selectedVisit.hostel_inspection?.hygiene || 'Satisfactory'}</strong></div>
                            <div>Safety: <strong className="text-foreground">{selectedVisit.hostel_inspection?.safety_security || 'Adequate'}</strong></div>
                            <div className="col-span-2">Room Condition: <strong className="text-foreground">{selectedVisit.hostel_inspection?.room_condition || 'Good'}</strong></div>
                          </div>
                          {selectedVisit.hostel_inspection?.remarks && (
                            <p className="text-[11px] text-muted-foreground italic pt-1 border-t border-border/50">
                              "{selectedVisit.hostel_inspection.remarks}"
                            </p>
                          )}
                        </>
                      ) : (
                        <p className="text-[11px] text-muted-foreground py-2">No hostel facility on premises.</p>
                      )}
                    </div>

                    {/* Kitchen & Mess */}
                    <div className="p-3 bg-card border border-border rounded-lg space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-foreground flex items-center gap-1.5">
                          <Utensils className="w-4 h-4 text-primary" /> Kitchen, Mess & Food Storage
                        </span>
                        <Badge variant="secondary" className="text-xs font-bold text-amber-500">
                          ⭐ {selectedVisit.kitchen_mess_inspection?.rating || 4}/5
                        </Badge>
                      </div>
                      <div className="grid grid-cols-2 gap-1.5 text-[11px] text-muted-foreground">
                        <div>Food Quality: <strong className="text-foreground">{selectedVisit.kitchen_mess_inspection?.food_quality || 'Good'}</strong></div>
                        <div>Cleanliness: <strong className="text-foreground">{selectedVisit.kitchen_mess_inspection?.cleanliness || 'Good'}</strong></div>
                        <div>Safe Water: <strong className="text-foreground">{selectedVisit.kitchen_mess_inspection?.drinking_water_safe ? 'Potable & Safe' : 'Action Needed'}</strong></div>
                        <div>Storage: <strong className="text-foreground">{selectedVisit.kitchen_mess_inspection?.storage_condition || 'Hygienic'}</strong></div>
                      </div>
                      {selectedVisit.kitchen_mess_inspection?.remarks && (
                        <p className="text-[11px] text-muted-foreground italic pt-1 border-t border-border/50">
                          "{selectedVisit.kitchen_mess_inspection.remarks}"
                        </p>
                      )}
                    </div>

                    {/* Infrastructure & Compliance */}
                    <div className="p-3 bg-card border border-border rounded-lg space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-foreground flex items-center gap-1.5">
                          <CheckSquare className="w-4 h-4 text-primary" /> Infrastructure & Records
                        </span>
                        <Badge variant="secondary" className="text-xs font-bold text-amber-500">
                          ⭐ {selectedVisit.infrastructure_docs?.rating || 4}/5
                        </Badge>
                      </div>
                      <div className="grid grid-cols-2 gap-1.5 text-[11px] text-muted-foreground">
                        <div>Library: <strong className="text-foreground">{selectedVisit.infrastructure_docs?.library_status || 'Active'}</strong></div>
                        <div>Lab Equipment: <strong className="text-foreground">{selectedVisit.infrastructure_docs?.lab_equipment || 'Functional'}</strong></div>
                        <div>Fire Safety: <strong className="text-foreground">{selectedVisit.infrastructure_docs?.fire_safety_compliant ? 'Compliant' : 'Non-compliant'}</strong></div>
                        <div>Registers: <strong className="text-foreground">{selectedVisit.infrastructure_docs?.registers_verified ? 'Verified & Valid' : 'Discrepancies'}</strong></div>
                      </div>
                      {selectedVisit.infrastructure_docs?.remarks && (
                        <p className="text-[11px] text-muted-foreground italic pt-1 border-t border-border/50">
                          "{selectedVisit.infrastructure_docs.remarks}"
                        </p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* 4. Photographs & Field Inspection Evidence */}
              {selectedVisit.photos && selectedVisit.photos.length > 0 && (
                <Card className="border border-border shadow-sm">
                  <CardHeader className="py-2.5 px-4 bg-muted/30 border-b border-border">
                    <CardTitle className="text-xs font-bold uppercase tracking-wider text-primary flex items-center gap-2">
                      <Camera className="w-4 h-4" />
                      4. Photographs & Field Evidence ({selectedVisit.photos.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-4">
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                      {selectedVisit.photos.map((p, idx) => (
                        <a
                          key={idx}
                          href={p.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="group border border-border rounded-lg overflow-hidden bg-card hover:border-primary/50 transition-all block shadow-sm"
                        >
                          <div className="relative h-28 bg-muted overflow-hidden">
                            <img
                              src={p.url}
                              alt={p.caption || "Evidence"}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                            />
                          </div>
                          <div className="p-2 text-xs">
                            <Badge variant="secondary" className="text-[9px] uppercase tracking-wider mb-1 px-1.5 py-0">
                              {p.category || 'general'}
                            </Badge>
                            <div className="font-medium text-foreground truncate">{p.caption || "Inspection photo"}</div>
                            <div className="text-[10px] text-muted-foreground flex items-center justify-between mt-1">
                              <span>Cloudflare R2</span>
                              <span className="text-primary group-hover:underline flex items-center gap-0.5">
                                View ↗
                              </span>
                            </div>
                          </div>
                        </a>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* 5. Observations & Corrective Actions */}
              <Card className="border border-border shadow-sm">
                <CardHeader className="py-2.5 px-4 bg-muted/30 border-b border-border">
                  <CardTitle className="text-xs font-bold uppercase tracking-wider text-primary flex items-center gap-2">
                    <FileText className="w-4 h-4" />
                    5. Observations & Corrective Actions
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4 space-y-3 text-xs">
                  <div>
                    <span className="font-semibold text-foreground block mb-1">Critical Observations:</span>
                    <div className="p-3.5 rounded-lg bg-card border border-border text-foreground leading-relaxed whitespace-pre-wrap">
                      {selectedVisit.observations || "Routine inspection completed."}
                    </div>
                  </div>

                  {selectedVisit.corrective_action && (
                    <div className="p-3.5 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/40 rounded-lg space-y-1.5">
                      <div className="font-bold text-amber-800 dark:text-amber-300 flex items-center justify-between">
                        <span className="flex items-center gap-1.5">
                          <AlertTriangle className="w-4 h-4" /> Action Required from Principal
                        </span>
                        {selectedVisit.action_deadline && (
                          <Badge variant="destructive" className="text-[10px]">
                            Deadline: {selectedVisit.action_deadline}
                          </Badge>
                        )}
                      </div>
                      <p className="text-amber-950 dark:text-amber-100 leading-relaxed font-medium">
                        {selectedVisit.corrective_action}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* 6. Principal Institutional Response */}
              {selectedVisit.principal_response && (
                <Card className="border border-border shadow-sm">
                  <CardHeader className="py-2.5 px-4 bg-muted/30 border-b border-border">
                    <CardTitle className="text-xs font-bold uppercase tracking-wider text-primary flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      6. Institutional Response from School Principal
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-4 space-y-2 text-xs">
                    <div className="p-3 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/40 rounded-lg space-y-1">
                      <div className="flex items-center justify-between font-semibold text-emerald-800 dark:text-emerald-300">
                        <span>Official Principal Response</span>
                        {selectedVisit.principal_response_date && (
                          <span className="text-[11px] text-muted-foreground font-normal">
                            Logged: {new Date(selectedVisit.principal_response_date).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                      <p className="text-emerald-950 dark:text-emerald-100 leading-relaxed">
                        {selectedVisit.principal_response}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
};
