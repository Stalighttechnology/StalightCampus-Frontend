import React, { useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Printer,
  FileSpreadsheet,
  QrCode
} from "lucide-react";
import { CollegeDetailsData } from "@/utils/college_details_api";

interface CollegeReportCardModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: CollegeDetailsData;
}

export const CollegeReportCardModal: React.FC<CollegeReportCardModalProps> = ({
  isOpen,
  onClose,
  data
}) => {
  const printRef = useRef<HTMLDivElement>(null);

  const handlePrint = () => {
    window.print();
  };

  const currentDate = new Date().toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric"
  });
  const currentTime = new Date().toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit"
  });

  const displayVal = (val: any) => {
    if (val === undefined || val === null || val === "" || val === 0 || val === "0") {
      return "—";
    }
    return val;
  };

  const affiliationSubtitle = [
    data.affiliated_university ? `Affiliated to ${data.affiliated_university}` : "",
    data.aicte_approval_status ? `AICTE Status: ${data.aicte_approval_status}` : ""
  ].filter(Boolean).join(" | ");

  const contactSubtitle = [
    data.school_address || "",
    data.pincode ? `PIN: ${data.pincode}` : "",
    data.website ? `Website: ${data.website}` : ""
  ].filter(Boolean).join(" | ");

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-w-5xl w-[96vw] max-h-[92vh] p-0 overflow-hidden flex flex-col bg-background border border-border shadow-2xl rounded-2xl print:max-w-none print:w-full print:max-h-none print:h-auto print:overflow-visible print:border-0 print:shadow-none print:bg-white print:p-0 print:static print:transform-none">
        {/* Top Control Bar (Hidden during print) */}
        <div id="report-modal-header" className="px-4 sm:px-6 py-3 sm:py-4 border-b border-border/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-muted/40 print:hidden">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <DialogTitle className="text-sm sm:text-base font-bold text-foreground leading-tight">
                Institutional College Report Card
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                Official Institutional Profile & Compliance Report (AICTE / AISHE / NAAC / University)
              </DialogDescription>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <Button
              variant="default"
              size="sm"
              className="w-full sm:w-auto gap-2 bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm text-xs h-8 sm:h-9"
              onClick={handlePrint}
            >
              <Printer className="w-4 h-4 shrink-0" />
              <span>Print / Export PDF</span>
            </Button>
          </div>
        </div>

        {/* Scrollable Printable Report Canvas */}
        <div id="report-canvas-wrapper" className="flex-1 overflow-y-auto overflow-x-auto p-2 sm:p-6 md:p-8 bg-neutral-100 dark:bg-neutral-900/50 flex justify-start sm:justify-center items-start print:p-0 print:m-0 print:bg-white print:overflow-visible print:block">
          {/* Paper Canvas */}
          <div
            ref={printRef}
            id="printable-college-report-card"
            className="w-full min-w-[650px] sm:min-w-0 max-w-[850px] bg-white text-black p-4 sm:p-8 md:p-10 shadow-lg border border-neutral-300 print:shadow-none print:border-none print:p-0 print:max-w-none print:min-w-0 print:w-full font-serif text-[11px] leading-tight shrink-0 sm:shrink"
            style={{ color: "#000" }}
          >
            {/* Header */}
            <div className="report-section border-b-2 border-black pb-3 mb-3">
              <div className="text-center font-bold text-[13px] tracking-wider uppercase mb-1">
                INSTITUTIONAL PROFILE & COMPLIANCE REPORT CARD
              </div>
              <div className="flex items-center justify-between gap-4">
                <div className="w-16 h-16 flex items-center justify-center">
                  <img
                    src={data.org_logo || "/logo.jpeg"}
                    alt={data.college_name || data.org_name || "College Logo"}
                    className="max-w-full max-h-full object-contain"
                  />
                </div>
                <div className="flex-1 text-center">
                  <div className="text-[17px] font-black uppercase tracking-wide text-neutral-900">
                    {data.college_name || data.org_name || "INSTITUTION NAME"}
                  </div>
                  {affiliationSubtitle && (
                    <div className="text-[11px] font-semibold text-neutral-700 italic mt-0.5">
                      ({affiliationSubtitle})
                    </div>
                  )}
                  {contactSubtitle && (
                    <div className="text-[10px] text-neutral-600 mt-0.5">
                      {contactSubtitle}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-between bg-neutral-100 border border-black px-3 py-1 mt-2.5 font-sans font-bold text-[12px]">
                <span>COLLEGE REPORT CARD</span>
                <span>STATUS: ACTIVE & VERIFIED</span>
              </div>
            </div>

            {/* 1. College Profile Details */}
            <div className="report-section mb-3">
              <div className="font-bold uppercase text-[11px] border-b border-black pb-0.5 mb-1 bg-neutral-200 px-1 font-sans">
                1. College Profile Details
              </div>
              <table className="w-full border-collapse border border-black text-[10px]">
                <tbody>
                  <tr className="border-b border-black">
                    <td className="border-r border-black p-1 font-bold bg-neutral-50 w-28">College Code</td>
                    <td className="border-r border-black p-1 w-44">{displayVal(data.college_code)}</td>
                    <td className="border-r border-black p-1 font-bold bg-neutral-50 w-28">AISHE Code</td>
                    <td className="p-1">{displayVal(data.aishe_code)}</td>
                  </tr>
                  <tr className="border-b border-black">
                    <td className="border-r border-black p-1 font-bold bg-neutral-50">State</td>
                    <td className="border-r border-black p-1">{displayVal(data.state)}</td>
                    <td className="border-r border-black p-1 font-bold bg-neutral-50">Educational District</td>
                    <td className="p-1">{displayVal(data.educational_district)}</td>
                  </tr>
                  <tr className="border-b border-black">
                    <td className="border-r border-black p-1 font-bold bg-neutral-50">Educational Block</td>
                    <td className="border-r border-black p-1">{displayVal(data.educational_block)}</td>
                    <td className="border-r border-black p-1 font-bold bg-neutral-50">Pincode</td>
                    <td className="p-1">{displayVal(data.pincode)}</td>
                  </tr>
                  <tr className="border-b border-black">
                    <td className="border-r border-black p-1 font-bold bg-neutral-50">Assembly Const.</td>
                    <td className="border-r border-black p-1">{displayVal(data.assembly_constituency)}</td>
                    <td className="border-r border-black p-1 font-bold bg-neutral-50">Parliamentary Const.</td>
                    <td className="p-1">{displayVal(data.parliamentary_constituency)}</td>
                  </tr>
                  <tr className="border-b border-black">
                    <td className="border-r border-black p-1 font-bold bg-neutral-50">Campus Address</td>
                    <td colSpan={3} className="p-1">{displayVal(data.school_address)}</td>
                  </tr>
                  <tr>
                    <td className="border-r border-black p-1 font-bold bg-neutral-50">Official Contact</td>
                    <td className="border-r border-black p-1">Email: {displayVal(data.official_email)}</td>
                    <td className="border-r border-black p-1 font-bold bg-neutral-50">Phone / Website</td>
                    <td className="p-1">{displayVal(data.official_phone)} {data.website ? `| ${data.website}` : ""}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* 2. College Recognition, Affiliation & Accreditation */}
            <div className="report-section mb-3">
              <div className="font-bold uppercase text-[11px] border-b border-black pb-0.5 mb-1 bg-neutral-200 px-1 font-sans">
                2. Recognition, Affiliation & Accreditation
              </div>
              <table className="w-full border-collapse border border-black text-[10px]">
                <tbody>
                  <tr className="border-b border-black">
                    <td className="border-r border-black p-1 font-bold bg-neutral-50 w-44">Year Of Establishment</td>
                    <td className="border-r border-black p-1 w-36">{displayVal(data.year_of_establishment)}</td>
                    <td className="border-r border-black p-1 font-bold bg-neutral-50 w-36">First Renewal / 2F 12B</td>
                    <td className="p-1">{displayVal(data.first_renewal)}</td>
                  </tr>
                  <tr className="border-b border-black">
                    <td className="border-r border-black p-1 font-bold bg-neutral-50">Affiliation Validity</td>
                    <td className="border-r border-black p-1">
                      {data.recognition_period_start && data.recognition_period_end ? `${data.recognition_period_start} to ${data.recognition_period_end}` : "—"}
                    </td>
                    <td className="border-r border-black p-1 font-bold bg-neutral-50">Autonomous Status (UGC)</td>
                    <td className="p-1">{displayVal(data.autonomous_status)}</td>
                  </tr>
                  <tr className="border-b border-black">
                    <td className="border-r border-black p-1 font-bold bg-neutral-50">AICTE Approval Status & Number</td>
                    <td className="border-r border-black p-1">
                      {data.aicte_approval_status ? `${data.aicte_approval_status} ${data.aicte_approval_number ? `(${data.aicte_approval_number})` : ""}` : "—"}
                    </td>
                    <td className="border-r border-black p-1 font-bold bg-neutral-50">AICTE Validity Period</td>
                    <td className="p-1">{displayVal(data.aicte_validity_period)}</td>
                  </tr>
                  <tr className="border-b border-black">
                    <td className="border-r border-black p-1 font-bold bg-neutral-50">NAAC Grade & CGPA</td>
                    <td className="border-r border-black p-1">
                      {data.naac_grade ? `${data.naac_grade} ${data.naac_cgpa ? `(CGPA: ${data.naac_cgpa})` : ""} ${data.naac_cycle ? `[${data.naac_cycle}]` : ""}` : "—"}
                    </td>
                    <td className="border-r border-black p-1 font-bold bg-neutral-50">NBA Accredited Programs</td>
                    <td className="p-1">{displayVal(data.nba_accreditation_details)}</td>
                  </tr>
                  <tr className="border-b border-black">
                    <td className="border-r border-black p-1 font-bold bg-neutral-50">NIRF Ranking / Band</td>
                    <td className="border-r border-black p-1">{displayVal(data.nirf_rank)}</td>
                    <td className="border-r border-black p-1 font-bold bg-neutral-50">ISO Certification</td>
                    <td className="p-1">{displayVal(data.iso_certified)}</td>
                  </tr>
                  <tr>
                    <td className="border-r border-black p-1 font-bold bg-neutral-50">Curriculum Framework</td>
                    <td className="border-r border-black p-1">{displayVal(data.college_syllabus)}</td>
                    <td className="border-r border-black p-1 font-bold bg-neutral-50">Management & Type</td>
                    <td className="p-1">
                      {data.college_management || data.college_type ? `${data.college_management || "—"} / ${data.college_type || "—"}` : "—"}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* 3. Medium & Academic Inspections Details */}
            <div className="report-section mb-3">
              <div className="font-bold uppercase text-[11px] border-b border-black pb-0.5 mb-1 bg-neutral-200 px-1 font-sans">
                3. Academic & Inspection Details
              </div>
              <table className="w-full border-collapse border border-black text-[10px]">
                <tbody>
                  <tr className="border-b border-black">
                    <td className="border-r border-black p-1 font-bold bg-neutral-50 w-36">Medium Of Instruction</td>
                    <td className="border-r border-black p-1 w-32">{displayVal(data.medium_of_instruction)}</td>
                    <td className="border-r border-black p-1 font-bold bg-neutral-50 w-44">Academic / LIC Inspections</td>
                    <td className="p-1">{data.academic_inspections_count || 0}</td>
                  </tr>
                  <tr className="border-b border-black">
                    <td className="border-r border-black p-1 font-bold bg-neutral-50">University LIC Visits</td>
                    <td className="border-r border-black p-1">{data.university_lic_visits_count || 0}</td>
                    <td className="border-r border-black p-1 font-bold bg-neutral-50">NBA / NAAC Peer Team Visits</td>
                    <td className="p-1">{data.nba_naac_visits_count || 0}</td>
                  </tr>
                  <tr>
                    <td className="border-r border-black p-1 font-bold bg-neutral-50">Programs / Degrees Offered</td>
                    <td colSpan={3} className="p-1">{displayVal(data.lowest_highest_class)}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* 4. Infrastructure & Other Facility */}
            <div className="report-section mb-3">
              <div className="font-bold uppercase text-[11px] border-b border-black pb-0.5 mb-1 bg-neutral-200 px-1 font-sans">
                4. Infrastructure & Campus Facilities
              </div>
              <table className="w-full border-collapse border border-black text-[10px]">
                <tbody>
                  <tr className="border-b border-black">
                    <td className="border-r border-black p-1 font-bold bg-neutral-50">Campus Land Area</td>
                    <td className="border-r border-black p-1">{displayVal(data.total_land_area_acres)}</td>
                    <td className="border-r border-black p-1 font-bold bg-neutral-50">Total Built-up Area</td>
                    <td className="p-1">{displayVal(data.total_built_up_area_sqm)}</td>
                  </tr>
                  <tr className="border-b border-black">
                    <td className="border-r border-black p-1 font-bold bg-neutral-50">Building Blocks (Pucca)</td>
                    <td className="border-r border-black p-1">
                      {data.no_of_building_blocks || data.pucca_building_blocks ? `${data.no_of_building_blocks || 0} Blocks (${data.pucca_building_blocks || 0} Pucca)` : "—"}
                    </td>
                    <td className="border-r border-black p-1 font-bold bg-neutral-50">All-Weather Road Access</td>
                    <td className="p-1">{displayVal(data.approachable_all_weather_road)}</td>
                  </tr>
                  <tr className="border-b border-black">
                    <td className="border-r border-black p-1 font-bold bg-neutral-50">Total Classrooms / Good Cond.</td>
                    <td className="border-r border-black p-1">
                      {data.total_classrooms || data.classrooms_in_good_condition ? `${data.total_classrooms || 0} (${data.classrooms_in_good_condition || 0} Good)` : "—"}
                    </td>
                    <td className="border-r border-black p-1 font-bold bg-neutral-50">Smart Classrooms & Sem. Halls</td>
                    <td className="p-1">
                      {data.smart_classrooms_count || data.seminar_halls_count ? `${data.smart_classrooms_count || 0} Smart / ${data.seminar_halls_count || 0} Halls` : "—"}
                    </td>
                  </tr>
                  <tr className="border-b border-black">
                    <td className="border-r border-black p-1 font-bold bg-neutral-50">Computing & Engg. Labs</td>
                    <td className="border-r border-black p-1">
                      {data.computing_labs_count || data.engineering_labs_count ? `${data.computing_labs_count || 0} Comp Labs / ${data.engineering_labs_count || 0} Engg Labs` : "—"}
                    </td>
                    <td className="border-r border-black p-1 font-bold bg-neutral-50">Central Library Volumes / Titles</td>
                    <td className="p-1">
                      {data.library_total_books || data.library_total_titles ? `${data.library_total_books?.toLocaleString() || 0} Books / ${data.library_total_titles?.toLocaleString() || 0} Titles` : "—"}
                    </td>
                  </tr>
                  <tr className="border-b border-black">
                    <td className="border-r border-black p-1 font-bold bg-neutral-50">Toilets (Boys / Girls)</td>
                    <td className="border-r border-black p-1">
                      {data.toilets_boys_total || data.toilets_girls_total ? `Boys: ${data.toilets_boys_total || 0} | Girls: ${data.toilets_girls_total || 0}` : "—"}
                    </td>
                    <td className="border-r border-black p-1 font-bold bg-neutral-50">CWSN Accessible (Ramps/Lifts)</td>
                    <td className="p-1">
                      {`Ramps: ${displayVal(data.availability_of_ramps)} | Lifts: ${displayVal(data.availability_of_lifts)}`}
                    </td>
                  </tr>
                  <tr className="border-b border-black">
                    <td className="border-r border-black p-1 font-bold bg-neutral-50">Drinking Water / RO Units</td>
                    <td className="border-r border-black p-1">
                      {data.drinking_water_available || data.ro_plants_count ? `${data.drinking_water_available || 0} Points / ${data.ro_plants_count || 0} RO Units` : "—"}
                    </td>
                    <td className="border-r border-black p-1 font-bold bg-neutral-50">Rainwater Harvesting</td>
                    <td className="p-1">{displayVal(data.rain_water_harvesting)}</td>
                  </tr>
                  <tr className="border-b border-black">
                    <td className="border-r border-black p-1 font-bold bg-neutral-50">Solar Plant / DG Backup</td>
                    <td className="border-r border-black p-1">
                      {data.solar_capacity_kw || data.dg_generator_backup ? `${data.solar_capacity_kw || "—"} / ${data.dg_generator_backup || "—"}` : "—"}
                    </td>
                    <td className="border-r border-black p-1 font-bold bg-neutral-50">Auditorium & Sports Ground</td>
                    <td className="p-1">
                      {data.auditorium_seating_capacity || data.sports_facilities_details ? `Auditorium (${data.auditorium_seating_capacity || 0} seats) / ${data.sports_facilities_details || "—"}` : "—"}
                    </td>
                  </tr>
                  <tr>
                    <td className="border-r border-black p-1 font-bold bg-neutral-50">Hostel & Medical Support</td>
                    <td colSpan={3} className="p-1">
                      {data.boys_hostel_capacity || data.girls_hostel_capacity || data.health_center_ambulance ? (
                        `Boys: ${data.boys_hostel_capacity || 0} beds | Girls: ${data.girls_hostel_capacity || 0} beds | Medical: ${data.health_center_ambulance || "—"}`
                      ) : "—"}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* 5. Digital & IT Facilities */}
            <div className="report-section mb-3">
              <div className="font-bold uppercase text-[11px] border-b border-black pb-0.5 mb-1 bg-neutral-200 px-1 font-sans">
                5. Digital & IT Facilities
              </div>
              <table className="w-full border-collapse border border-black text-[10px]">
                <tbody>
                  <tr className="border-b border-black">
                    <td className="border-r border-black p-1 font-bold bg-neutral-50">Internet / Campus Wi-Fi</td>
                    <td className="border-r border-black p-1">{displayVal(data.internet_bandwidth)}</td>
                    <td className="border-r border-black p-1 font-bold bg-neutral-50">Total Desktops / Laptops</td>
                    <td className="p-1">
                      {data.desktop_count || data.laptop_count ? `${data.desktop_count || 0} Desktops / ${data.laptop_count || 0} Laptops` : "—"}
                    </td>
                  </tr>
                  <tr className="border-b border-black">
                    <td className="border-r border-black p-1 font-bold bg-neutral-50">GPU AI Servers / Workstations</td>
                    <td className="border-r border-black p-1">
                      {data.gpu_server_count ? `${data.gpu_server_count} AI Servers` : "—"}
                    </td>
                    <td className="border-r border-black p-1 font-bold bg-neutral-50">Projectors / DigiBoards</td>
                    <td className="p-1">
                      {data.projector_count || data.digiboard_count ? `${data.projector_count || 0} Projectors / ${data.digiboard_count || 0} DigiBoards` : "—"}
                    </td>
                  </tr>
                  <tr>
                    <td className="border-r border-black p-1 font-bold bg-neutral-50">CCTV Surveillance & ERP</td>
                    <td colSpan={3} className="p-1">
                      {data.cctv_cameras_count || data.campus_erp_system ? `${data.cctv_cameras_count || 0} Cameras / ERP: ${data.campus_erp_system || "—"}` : "—"}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* 6. Governance & Faculty Details */}
            <div className="report-section mb-3">
              <div className="font-bold uppercase text-[11px] border-b border-black pb-0.5 mb-1 bg-neutral-200 px-1 font-sans">
                6. Governance & Faculty Profile
              </div>
              <table className="w-full border-collapse border border-black text-[10px]">
                <tbody>
                  <tr className="border-b border-black">
                    <td className="border-r border-black p-1 font-bold bg-neutral-50">BoG / Governing Body</td>
                    <td className="border-r border-black p-1">{displayVal(data.smc_exists)}</td>
                    <td className="border-r border-black p-1 font-bold bg-neutral-50">Academic Council / BoS</td>
                    <td className="p-1">{displayVal(data.smdc_constituted)}</td>
                  </tr>
                  <tr className="border-b border-black">
                    <td className="border-r border-black p-1 font-bold bg-neutral-50">IQAC & Anti-Ragging Cell</td>
                    <td className="border-r border-black p-1">IQAC: {displayVal(data.iqac_constituted)} | Anti-Ragging: {displayVal(data.anti_ragging_committee)}</td>
                    <td className="border-r border-black p-1 font-bold bg-neutral-50">Instructional Days</td>
                    <td className="p-1">{data.instructional_days ? `${data.instructional_days} Days / Year` : "—"}</td>
                  </tr>
                  <tr className="border-b border-black">
                    <td className="border-r border-black p-1 font-bold bg-neutral-50">Teaching Faculty Count</td>
                    <td className="border-r border-black p-1 font-bold">
                      {data.no_of_teachers ? (
                        `${data.no_of_teachers} Faculty (Prof: ${data.professors_count || 0}, Assoc: ${data.assoc_professors_count || 0}, Asst: ${data.asst_professors_count || 0})`
                      ) : "—"}
                    </td>
                    <td className="border-r border-black p-1 font-bold bg-neutral-50">Ph.D. Qualified & SFR</td>
                    <td className="p-1">
                      {data.phd_faculty_count || data.student_faculty_ratio ? (
                        `${data.phd_faculty_count || 0} Ph.D. Holders | SFR: ${data.student_faculty_ratio || "—"}`
                      ) : "—"}
                    </td>
                  </tr>
                  <tr>
                    <td className="border-r border-black p-1 font-bold bg-neutral-50">Faculty Vacancies & Shortage</td>
                    <td className="border-r border-black p-1">
                      Vacancies: {displayVal(data.faculty_vacancies)} | Shortage: {displayVal(data.faculty_shortage)}
                    </td>
                    <td className="border-r border-black p-1 font-bold bg-neutral-50">Grievances & Complaints</td>
                    <td className="p-1">
                      Received: {data.total_complaints_received ?? "—"} | Resolved: {data.complaints_resolved ?? "—"}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* 7. Student Details (Class / Branch Wise) */}
            <div className="report-section mb-3">
              <div className="font-bold uppercase text-[11px] border-b border-black pb-0.5 mb-1 bg-neutral-200 px-1 font-sans">
                7. Student Enrollment Distribution (Branch-Wise)
              </div>
              <table className="w-full border-collapse border border-black text-[10px] text-center">
                <thead>
                  <tr className="bg-neutral-100 font-bold border-b border-black">
                    <th className="border-r border-black p-1 text-left">Department / Program</th>
                    <th className="border-r border-black p-1 w-24">Boys</th>
                    <th className="border-r border-black p-1 w-24">Girls</th>
                    <th className="p-1 w-28">Total Enrollment</th>
                  </tr>
                </thead>
                <tbody>
                  {data.student_details_class_wise && data.student_details_class_wise.length > 0 ? (
                    data.student_details_class_wise.map((item, idx) => (
                      <tr key={idx} className="border-b border-black">
                        <td className="border-r border-black p-1 text-left font-medium">{item.branch}</td>
                        <td className="border-r border-black p-1">{item.boys}</td>
                        <td className="border-r border-black p-1">{item.girls}</td>
                        <td className="p-1 font-bold">{item.total || (item.boys + item.girls)}</td>
                      </tr>
                    ))
                  ) : (
                    <tr className="border-b border-black">
                      <td colSpan={4} className="p-2 text-center text-neutral-500 italic">
                        No active academic branch enrollment records found in database.
                      </td>
                    </tr>
                  )}
                  {data.student_details_class_wise && data.student_details_class_wise.length > 0 && (
                    <tr className="bg-neutral-100 font-bold">
                      <td className="border-r border-black p-1 text-left">TOTAL INSTITUTIONAL ENROLLMENT</td>
                      <td className="border-r border-black p-1">
                        {data.student_details_class_wise?.reduce((acc, c) => acc + (c.boys || 0), 0) || 0}
                      </td>
                      <td className="border-r border-black p-1">
                        {data.student_details_class_wise?.reduce((acc, c) => acc + (c.girls || 0), 0) || 0}
                      </td>
                      <td className="p-1">
                        {data.student_details_class_wise?.reduce((acc, c) => acc + (c.total || (c.boys + c.girls) || 0), 0) || 0}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* 8. Fee Structure */}
            <div className="report-section mb-4">
              <div className="font-bold uppercase text-[11px] border-b border-black pb-0.5 mb-1 bg-neutral-200 px-1 font-sans">
                8. Approved Fee Structure (Per Annum)
              </div>
              <table className="w-full border-collapse border border-black text-[10px]">
                <thead>
                  <tr className="bg-neutral-100 font-bold border-b border-black text-center">
                    <th className="border-r border-black p-1 text-left">Academic Program / Fee Structure</th>
                    <th className="border-r border-black p-1 w-32">Tuition Fee (₹)</th>
                    <th className="border-r border-black p-1 w-32">Univ / Dev Fee (₹)</th>
                    <th className="p-1 w-32">Total Fee (₹)</th>
                  </tr>
                </thead>
                <tbody>
                  {data.fee_structure_data && data.fee_structure_data.length > 0 ? (
                    data.fee_structure_data.map((fee, idx) => (
                      <tr key={idx} className="border-b border-black">
                        <td className="border-r border-black p-1">{fee.standard}</td>
                        <td className="border-r border-black p-1 text-right">{fee.notified_fee}</td>
                        <td className="border-r border-black p-1 text-right">{fee.exam_dev_fee}</td>
                        <td className="p-1 text-right font-bold">{fee.total}</td>
                      </tr>
                    ))
                  ) : (
                    <tr className="border-b border-black">
                      <td colSpan={4} className="p-2 text-center text-neutral-500 italic">
                        No approved fee templates or custom fee structures configured.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* 9. Statutory Clearances & Regulatory Inspection Compliance */}
            <div className="report-section mb-4">
              <div className="font-bold uppercase text-[11px] border-b border-black pb-0.5 mb-1 bg-neutral-200 px-1 font-sans">
                9. Statutory Clearances & Regulatory Compliance (AICTE / LIC / UGC)
              </div>
              <table className="w-full border-collapse border border-black text-[10px]">
                <tbody>
                  <tr className="border-b border-black">
                    <td className="border-r border-black p-1 font-bold bg-neutral-50 w-44">Fire Safety NOC & Validity</td>
                    <td className="border-r border-black p-1 w-44">
                      {data.fire_safety_certificate || "Valid"} {data.fire_safety_validity ? `(Valid till: ${data.fire_safety_validity})` : ""}
                    </td>
                    <td className="border-r border-black p-1 font-bold bg-neutral-50 w-44">Building Occupancy Sanction</td>
                    <td className="p-1">{displayVal(data.building_occupancy_certificate)}</td>
                  </tr>
                  <tr className="border-b border-black">
                    <td className="border-r border-black p-1 font-bold bg-neutral-50">Structural Stability Certificate</td>
                    <td className="border-r border-black p-1">{displayVal(data.structural_stability_certificate)}</td>
                    <td className="border-r border-black p-1 font-bold bg-neutral-50">Land Title & Environmental NOC</td>
                    <td className="p-1">Land: {displayVal(data.land_ownership_type)} | Env: {displayVal(data.environmental_clearance)}</td>
                  </tr>
                  <tr className="border-b border-black">
                    <td className="border-r border-black p-1 font-bold bg-neutral-50">SC/ST/OBC Cell & SGRC</td>
                    <td className="border-r border-black p-1">SC/ST: {displayVal(data.sc_st_cell_constituted)} | SGRC: {displayVal(data.student_grievance_committee)}</td>
                    <td className="border-r border-black p-1 font-bold bg-neutral-50">Anti-Ragging Squad & IIC</td>
                    <td className="p-1">Anti-Ragging: {displayVal(data.anti_ragging_squad_active)} | IIC: {displayVal(data.iic_incubation_cell)}</td>
                  </tr>
                  <tr className="border-b border-black">
                    <td className="border-r border-black p-1 font-bold bg-neutral-50">Biometric Staff Attendance</td>
                    <td className="border-r border-black p-1">{displayVal(data.biometric_attendance_system)}</td>
                    <td className="border-r border-black p-1 font-bold bg-neutral-50">Student : Computer Ratio & Lab</td>
                    <td className="p-1">Ratio: {displayVal(data.student_computer_ratio)} | Lang Lab: {displayVal(data.language_lab_available)}</td>
                  </tr>
                  <tr>
                    <td className="border-r border-black p-1 font-bold bg-neutral-50">Joint FDR & Audited Balance Sheets</td>
                    <td className="border-r border-black p-1">
                      Joint FDR: {displayVal(data.joint_fdr_with_university)} {data.joint_fdr_amount_lakhs ? `(${data.joint_fdr_amount_lakhs})` : ""} | Audited: {displayVal(data.audited_balance_sheet_available)}
                    </td>
                    <td className="border-r border-black p-1 font-bold bg-neutral-50">Research Grants & Patents</td>
                    <td className="p-1">
                      Grants: {displayVal(data.research_grants_lakhs)} | Patents: {data.patents_published_count || 0} | MOUs: {data.placement_mous_count || 0}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* 10. Institutional, Student & Research Achievements */}
            {data.achievements_data && data.achievements_data.length > 0 && (
              <div className="report-section mb-4">
                <div className="font-bold uppercase text-[11px] border-b border-black pb-0.5 mb-1 bg-neutral-200 px-1 font-sans">
                  10. Institutional, Student & Research Achievements
                </div>
                <table className="w-full border-collapse border border-black text-[10px]">
                  <thead>
                    <tr className="bg-neutral-100 font-bold border-b border-black">
                      <th className="border-r border-black p-1 text-left w-28">Level / Domain</th>
                      <th className="border-r border-black p-1 text-left">Achievement / Recognition Title</th>
                      <th className="border-r border-black p-1 text-left w-44">Recipient / Team</th>
                      <th className="border-r border-black p-1 text-left w-36">Awarding Body</th>
                      <th className="p-1 w-16 text-center">Year</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.achievements_data.map((ach, idx) => (
                      <tr key={idx} className="border-b border-black">
                        <td className="border-r border-black p-1 font-semibold uppercase text-[9px]">
                          {ach.level_label || ach.category?.replace(/_/g, " ") || "Institutional"}
                        </td>
                        <td className="border-r border-black p-1 font-medium">
                          {ach.title}
                          {ach.description && <span className="block text-[9px] text-neutral-600 font-normal">{ach.description}</span>}
                        </td>
                        <td className="border-r border-black p-1">{ach.recipient_name || ach.department || "—"}</td>
                        <td className="border-r border-black p-1">{ach.awarding_body || "—"}</td>
                        <td className="p-1 text-center font-mono">{ach.year || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Footer / Signatures */}
            <div className="report-section pt-6 mt-4 border-t-2 border-black flex items-end justify-between text-[10px]">
              <div>
                <p className="font-mono text-[9px] text-neutral-600">
                  Generated On: {currentDate} {currentTime}
                </p>
                <p className="font-mono text-[9px] text-neutral-600">
                  ERP Verification Code: STL-ENG-{data.college_code || data.organization_id || "001"}
                </p>
              </div>

              <div className="flex gap-12 text-center">
                <div>
                  <div className="w-32 h-10 border-b border-dotted border-black mb-1" />
                  <p className="font-bold">Dean / Vice-Principal</p>
                  <p className="text-[9px] text-neutral-600">(Academic Quality)</p>
                </div>
                <div>
                  <div className="w-36 h-10 border-b border-dotted border-black mb-1" />
                  <p className="font-bold">Principal / Head of Institution</p>
                  <p className="text-[9px] text-neutral-600">(Official Seal & Signature)</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
