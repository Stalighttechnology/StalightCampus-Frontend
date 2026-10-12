import React, { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { StalightLogoAvatar, SiriOrbGlow } from "./ChatIcons";
import { MessageBubble } from "./MessageBubble";
import { ChatMessage, ChatbotProps, UICard, SuggestedAction } from "./ChatTypes";
import { useVoiceAssistant } from "./useVoiceAssistant";
import { fetchWithTokenRefresh } from "@/utils/authService";
import { API_BASE_URL } from "@/utils/config";

// Role-specific recommendations matching actual dashboard sidebar pages
const ROLE_PAGE_PROMPTS: Record<string, string[]> = {
  student: [
    "Check my attendance",
    "View internal marks",
    "Class schedule & timetable",
    "Check pending fees",
    "Download study materials",
    "Submit leave request",
    "Hostel room & mess details",
    "View campus announcements",
  ],
  parent: [
    "Student attendance percentage",
    "Semester internal marks",
    "Outstanding tuition fees",
    "Class timetable",
    "Campus notices & circulars",
    "Hostel accommodation status",
    "College holiday calendar",
  ],
  faculty: [
    "Take today's attendance",
    "Upload internal marks",
    "Check my timetable",
    "Student leave applications",
    "Upload study material",
    "Apply for staff leave",
    "My salary & payroll",
    "Schedule mentoring session",
  ],
  teacher: [
    "Take today's attendance",
    "Upload internal marks",
    "Check my timetable",
    "Student leave applications",
    "Upload study material",
    "Apply for staff leave",
    "My salary & payroll",
    "Schedule mentoring session",
  ],
  hod: [
    "Department attendance summary",
    "Faculty teaching timetable",
    "Pending staff leave approvals",
    "Question paper approvals",
    "Low attendance alert list",
    "Course syllabus monitor",
    "Schedule department meeting",
    "Department inventory status",
  ],
  principal: [
    "Campus attendance records",
    "Department risk analysis",
    "Faculty leave requests",
    "Question paper approvals",
    "College profile & report card",
    "Financial collection summary",
    "Staff task tracker",
    "Campus inspections & visits",
  ],
  admin: [
    "Campus attendance records",
    "Faculty assignments",
    "Staff enrollment & users",
    "Question paper approvals",
    "College report card",
    "Leave approvals",
    "Campus announcements",
    "Billing & plan overview",
  ],
  org_admin: [
    "Multi-branch dashboard",
    "Institutional fee collection",
    "Overall student attendance",
    "Staff user directory",
    "Exam assessments",
    "Campus asset monitoring",
    "Billing & subscription",
  ],
  fees_manager: [
    "Outstanding fees summary",
    "Recent student invoices",
    "Payment transactions log",
    "Fee defaulters list",
    "Payroll management",
    "Payment gateway settings",
    "Apply for leave",
  ],
  coe: [
    "Examination timetable",
    "Question paper approvals",
    "Publish exam results",
    "Revaluation applications",
    "Makeup exam requests",
    "Course statistics report",
    "Fee settings for exams",
  ],
  dean: [
    "Academic examination status",
    "Question paper approvals",
    "Faculty attendance overview",
    "Department compliance reports",
    "Staff leave requests",
    "Campus monitoring",
  ],
  hms: [
    "Hostel occupancy & rooms",
    "Student hostel admissions",
    "Today's mess food menu",
    "Student complaint issues",
    "Visitor gate logs",
    "Warden leave requests",
  ],
  warden: [
    "Hostel resident list",
    "Student gate pass requests",
    "Today's meal schedule",
    "Hostel complaints & issues",
    "Night visitor logs",
    "Apply for leave",
  ],
  transport_admin: [
    "Campus bus fleet status",
    "Driver duty assignments",
    "Bus routes & pick-up stops",
    "Live GPS vehicle tracking",
    "Transport complaints log",
    "Driver leave management",
  ],
  driver: [
    "My trip history",
    "Assigned bus route & stops",
    "Report vehicle complaint",
    "My attendance record",
    "Apply for driver leave",
    "My salary slips",
  ],
  library_admin: [
    "Book catalog & search",
    "Active book circulations",
    "Overdue library fines",
    "Library staff tasks",
    "Apply for staff leave",
    "My attendance records",
  ],
  admission_manager: [
    "Lead enquiries pipeline",
    "New student applications",
    "Course seat matrix status",
    "Counsellor team allocations",
    "Admission fee payments",
    "Campus portal builder",
  ],
  counsellor: [
    "Prospective student leads",
    "Admission enquiry status",
    "Campus announcements",
    "My attendance records",
    "Apply for leave",
  ],
  inventory_manager: [
    "Asset directory & inventory",
    "Procurement purchase requests",
    "Vendor quotations",
    "Maintenance & repair tickets",
    "Block & location allocations",
  ],
  field_visitor: [
    "Record school inspection visit",
    "Field visit history",
    "Officer profile",
  ],
};

const DEFAULT_PROMPTS = [
  "Attendance summary",
  "Outstanding fees",
  "Class timetable",
  "Exam schedule",
  "Campus announcements",
  "Handbook rules",
];

// Resolves the exact page route based on current user role and intent
const resolveRoleBasedPath = (role: string, intent: string): string => {
  const r = (role || "").toLowerCase();

  switch (intent) {
    case "staff_tasks":
      if (r === "faculty" || r === "teacher") return "/faculty/staff-tasks";
      if (r === "hod") return "/hod/staff-tasks";
      if (r === "fees_manager") return "/fees-manager/staff-tasks";
      if (r === "transport_admin") return "/transport-admin/staff-tasks";
      if (r === "library_admin") return "/library-admin/staff-tasks";
      if (r === "admission_manager") return "/admission-manager/staff-tasks";
      if (r === "coe") return "/coe/staff-tasks";
      if (r === "dean") return "/dean/staff-tasks";
      if (r === "hms") return "/hms/staff-tasks";
      if (r === "org_admin") return "/org-admin/staff-tasks";
      return "/admin/staff-tasks";

    case "field_visits":
      if (r === "field_visitor") return "/field-visitor/visit-history";
      return "/admin/field-visits";

    case "college_details":
      if (r === "org_admin") return "/org-admin/college-details";
      if (r === "dean") return "/dean/college-details";
      return "/admin/college-details";

    case "qp_approvals":
      if (r === "hod") return "/hod/qp-approvals";
      if (r === "coe") return "/coe/qp-approvals";
      if (r === "dean") return "/dean/qp-approvals";
      if (r === "faculty" || r === "teacher") return "/faculty/upload-qp";
      return "/admin/qp-approvals";

    case "timetable_config":
      if (r === "hod") return "/hod/timetable";
      return "/admin/timetable-config";

    case "branches":
      if (r === "org_admin") return "/org-admin/branches";
      return "/admin/branches";

    case "batches":
      if (r === "org_admin") return "/org-admin/batches";
      return "/admin/batches";

    case "users":
      if (r === "org_admin") return "/org-admin/users";
      if (r === "hod") return "/hod/students";
      return "/admin/users";

    case "enroll_user":
      if (r === "org_admin") return "/org-admin/enroll-user";
      if (r === "dean") return "/dean/enroll-user";
      return "/admin/enroll-user";

    case "bulk_upload":
      return "/admin/bulk-upload";

    case "teacher_assignments":
      if (r === "hod") return "/hod/faculty-assignments";
      return "/admin/teacher-assignments";

    case "syllabus_monitor":
      if (r === "student" || r === "parent") return "/student-syllabus";
      if (r === "faculty" || r === "teacher") return "/faculty/syllabus-status";
      if (r === "hod") return "/hod/syllabus-monitor";
      return "/admin/syllabus-monitor";

    case "student_transfer":
      return "/admin/student-transfer";

    case "co_attainment":
      if (r === "hod") return "/hod/co-attainment";
      if (r === "faculty" || r === "teacher") return "/faculty/co-attainment";
      if (r === "coe") return "/coe/co-attainment";
      if (r === "dean") return "/dean/co-attainment";
      return "/admin/co-attainment";

    case "issued_items":
      if (r === "student") return "/my-issued-items";
      if (r === "counsellor") return "/counsellor/issued-items";
      if (r === "org_admin") return "/org-admin/issued-items";
      return "/admin/issued-items";

    case "sports_wellness":
      if (r === "counsellor") return "/counsellor/sports-wellness";
      if (r === "org_admin") return "/org-admin/sports-wellness";
      return "/admin/sports-wellness";

    case "campus_locations":
      if (r === "org_admin") return "/org-admin/campus-locations";
      if (r === "dean") return "/dean/campus-locations";
      return "/admin/campus-locations";

    case "campus_monitoring":
      if (r === "org_admin") return "/org-admin/campus-monitoring";
      return "/admin/campus-monitoring";

    case "scan_student":
      if (r === "org_admin") return "/org-admin/scan-student-info";
      if (r === "hod") return "/hod/scan-student-info";
      if (r === "faculty" || r === "teacher") return "/faculty/scan-student-info";
      if (r === "coe") return "/coe/scan-student-info";
      if (r === "dean") return "/dean/scan-student-info";
      return "/admin/scan-student-info";

    case "alumni_directory":
      if (r === "org_admin") return "/org-admin/alumni-directory";
      if (r === "hod") return "/hod/alumni-directory";
      if (r === "dean") return "/dean/alumni-directory";
      return "/admin/alumni-directory";

    case "billing":
      if (r === "org_admin") return "/org-admin/billing";
      if (r === "dean") return "/dean/billing";
      return "/admin/billing";

    case "schedule_meeting":
      if (r === "faculty" || r === "teacher") return "/faculty/schedule-meeting";
      if (r === "hod") return "/hod/schedule-meeting";
      if (r === "fees_manager") return "/fees-manager/schedule-meeting";
      if (r === "transport_admin") return "/transport-admin/schedule-meeting";
      if (r === "library_admin") return "/library-admin/schedule-meeting";
      if (r === "admission_manager") return "/admission-manager/schedule-meeting";
      if (r === "coe") return "/coe/schedule-meeting";
      if (r === "dean") return "/dean/schedule-meeting";
      if (r === "hms") return "/hms/schedule-meeting";
      if (r === "warden") return "/warden/schedule-meeting";
      if (r === "org_admin") return "/org-admin/schedule-meeting";
      return "/admin/schedule-meeting";

    case "reports":
      if (r === "fees_manager") return "/fees-manager/reports";
      if (r === "dean") return "/dean/reports";
      if (r === "org_admin") return "/org-admin/reports";
      return "/admin/reports";

    case "attendance":
      if (r === "student" || r === "parent") return "/attendance";
      if (r === "faculty" || r === "teacher") return "/faculty/take-attendance";
      if (r === "hod") return "/hod/attendance-records";
      if (r === "fees_manager") return "/fees-manager/my-attendance";
      if (r === "transport_admin") return "/transport-admin/my-attendance";
      if (r === "library_admin") return "/library-admin/my-attendance";
      if (r === "admission_manager") return "/admission-manager/my-attendance";
      if (r === "driver") return "/driver/my-attendance";
      if (r === "warden") return "/warden/my-attendance";
      if (r === "hms") return "/hms/my-attendance";
      if (r === "dean") return "/dean/faculty-attendance";
      if (r === "admin" || r === "principal") return "/admin/faculty-attendance";
      if (r === "org_admin") return "/org-admin/attendance";
      return "/attendance";

    case "my_attendance":
      if (r === "faculty" || r === "teacher") return "/faculty/faculty-attendance";
      if (r === "hod") return "/hod/my-attendance";
      if (r === "fees_manager") return "/fees-manager/my-attendance";
      if (r === "transport_admin") return "/transport-admin/my-attendance";
      if (r === "library_admin") return "/library-admin/my-attendance";
      if (r === "admission_manager") return "/admission-manager/my-attendance";
      if (r === "driver") return "/driver/my-attendance";
      if (r === "warden") return "/warden/my-attendance";
      if (r === "hms") return "/hms/my-attendance";
      if (r === "coe") return "/coe/my-attendance";
      if (r === "dean") return "/dean/my-attendance";
      if (r === "admin" || r === "principal") return "/admin/my-attendance";
      return "/my-attendance";

    case "low_attendance":
      if (r === "hod") return "/hod/low-attendance";
      if (r === "org_admin") return "/org-admin/low-attendance";
      return "/admin/low-attendance";

    case "attendance_records":
      if (r === "hod") return "/hod/attendance-records";
      if (r === "faculty" || r === "teacher") return "/faculty/attendance-records";
      return "/admin/attendance-records";

    case "fees":
      if (r === "student" || r === "parent") return "/fees";
      if (r === "fees_manager") return "/fees-manager/invoices";
      if (r === "org_admin") return "/org-admin/invoices";
      if (r === "admin" || r === "principal") return "/admin/finance";
      if (r === "dean") return "/dean/finance";
      if (r === "admission_manager") return "/admission-manager/admission-fees";
      if (r === "coe") return "/coe/fee-settings";
      return "/fees";

    case "invoices":
      if (r === "fees_manager") return "/fees-manager/invoices";
      if (r === "org_admin") return "/org-admin/invoices";
      return "/invoices";

    case "timetable":
      if (r === "student" || r === "parent") return "/timetable";
      if (r === "faculty" || r === "teacher") return "/faculty/timetable";
      if (r === "hod") return "/hod/timetable";
      if (r === "admin" || r === "principal") return "/admin/timetable";
      return "/timetable";

    case "class_schedule":
      if (r === "student" || r === "parent") return "/class-schedule";
      if (r === "faculty" || r === "teacher") return "/faculty/schedule-class";
      return "/class-schedule";

    case "marks":
      if (r === "student" || r === "parent") return "/marks";
      if (r === "faculty" || r === "teacher") return "/faculty/upload-marks";
      if (r === "hod") return "/hod/marks";
      if (r === "coe") return "/coe/publish-results";
      return "/marks";

    case "exams":
      if (r === "student" || r === "parent") return "/marks";
      if (r === "faculty" || r === "teacher") return "/faculty/exam-applications";
      if (r === "hod") return "/hod/exam-applications";
      if (r === "coe") return "/coe/exam-scheduling";
      if (r === "dean") return "/dean/exams";
      if (r === "org_admin") return "/org-admin/exams";
      return "/exams";

    case "revaluation":
      if (r === "student") return "/revaluation";
      if (r === "coe") return "/coe/revaluation-requests";
      return "/revaluation";

    case "makeupexam":
      if (r === "student") return "/makeupexam";
      if (r === "coe") return "/coe/makeup-requests";
      return "/makeupexam";

    case "leave":
      if (r === "student") return "/leave-request";
      if (r === "faculty" || r === "teacher") return "/faculty/apply-leave";
      if (r === "hod") return "/hod/apply-leaves";
      if (r === "admin" || r === "principal") return "/admin/apply-leave";
      if (r === "fees_manager") return "/fees-manager/leave";
      if (r === "transport_admin") return "/transport-admin/apply-leave";
      if (r === "driver") return "/driver/apply-leave";
      if (r === "library_admin") return "/library-admin/apply-leave";
      if (r === "admission_manager") return "/admission-manager/apply-leave";
      if (r === "warden") return "/warden/apply-leave";
      if (r === "hms") return "/hms/apply-leave";
      if (r === "dean") return "/dean/apply-leave";
      return "/apply-leave";

    case "leave_approvals":
      if (r === "faculty" || r === "teacher") return "/faculty/student-leave";
      if (r === "hod") return "/hod/leaves";
      if (r === "admin" || r === "principal") return "/admin/hod-leaves";
      if (r === "dean") return "/dean/admin-leaves";
      if (r === "warden") return "/warden/gate-passes";
      if (r === "hms") return "/hms/manage-warden-leaves";
      if (r === "transport_admin") return "/transport-admin/manage-leaves";
      return "/leaves";

    case "announcements":
      if (r === "student" || r === "parent") return "/announcements";
      if (r === "faculty" || r === "teacher") return "/faculty/faculty-announcement-management";
      if (r === "hod") return "/hod/hod-announcement-management";
      if (r === "fees_manager") return "/fees-manager/announcement-management";
      if (r === "transport_admin") return "/transport-admin/announcement-management";
      if (r === "driver") return "/driver/announcements";
      if (r === "library_admin") return "/library-admin/announcements";
      if (r === "admission_manager") return "/admission-manager/announcements";
      if (r === "warden") return "/warden/announcement-management";
      if (r === "hms") return "/hms/announcement-management";
      if (r === "admin" || r === "principal" || r === "org_admin" || r === "coe" || r === "dean") return "/admin/announcement-management";
      return "/announcements";

    case "study_materials":
      if (r === "student") return "/student-study-material";
      if (r === "faculty" || r === "teacher") return "/faculty/study-materials";
      if (r === "hod") return "/hod/study-materials";
      return "/study-materials";

    case "assignments":
      if (r === "student") return "/student-assignment";
      if (r === "faculty" || r === "teacher") return "/faculty/faculty-assignments";
      if (r === "hod") return "/hod/faculty-assignments";
      return "/assignments";

    case "hostel":
      if (r === "student" || r === "parent" || r === "outside_student") return "/student-hostel-details";
      if (r === "warden") return "/warden/residents";
      if (r === "hms") return "/hms/hostels";
      return "/student-hostel-details";

    case "transport":
      if (r === "student" || r === "parent") return "/transportation";
      if (r === "transport_admin") return "/transport-admin/transport-buses";
      if (r === "driver") return "/driver/driver-history";
      return "/transportation";

    case "library":
      if (r === "student") return "/library";
      if (r === "library_admin") return "/library-admin/library-books";
      return "/library";

    case "admission":
      if (r === "admission_manager" || r === "counsellor") return "/admission-manager/admission-enquiries";
      return "/admission-dashboard";

    case "payroll":
      if (r === "fees_manager") return "/fees-manager/payroll";
      if (r === "faculty" || r === "teacher") return "/faculty/my-payroll";
      if (r === "hod") return "/hod/my-payroll";
      if (r === "transport_admin") return "/transport-admin/my-payroll";
      if (r === "driver") return "/driver/my-payroll";
      if (r === "library_admin") return "/library-admin/my-payroll";
      if (r === "admission_manager") return "/admission-manager/my-payroll";
      if (r === "warden") return "/warden/my-payroll";
      if (r === "hms") return "/hms/my-payroll";
      if (r === "dean") return "/dean/my-payroll";
      if (r === "coe") return "/coe/my-payroll";
      if (r === "admin" || r === "principal") return "/admin/my-payroll";
      if (r === "org_admin") return "/org-admin/my-payroll";
      return "/my-payroll";

    case "reimbursements":
      if (r === "hod") return "/hod/reimbursements";
      if (r === "coe") return "/coe/reimbursements";
      if (r === "hms") return "/hms/reimbursements";
      if (r === "warden") return "/warden/reimbursements";
      if (r === "transport_admin") return "/transport-admin/reimbursements";
      if (r === "driver") return "/driver/reimbursements";
      if (r === "library_admin") return "/library-admin/reimbursements";
      return "/faculty/reimbursements";

    case "calendar":
      return "/holiday-calendar";

    case "inventory":
      if (r === "inventory_manager") return "/inventory-manager/inventory-items";
      if (r === "hod") return "/hod/inventory";
      if (r === "admin" || r === "principal" || r === "org_admin" || r === "dean") return "/admin/inventory";
      return "/inventory";

    case "profile":
      if (r === "faculty" || r === "teacher") return "/faculty/faculty-profile";
      if (r === "hod") return "/hod/hod-profile";
      if (r === "student") return "/profile";
      if (r === "field_visitor") return "/field-visitor/profile";
      return "/profile";

    default:
      return "/dashboard";
  }
};

const INITIAL_GREETING = "Hello! I am Stalight Intelligence. How can I assist you with your authorized campus records, attendance, fees, or academics today?";

export const StalightChatbot: React.FC<ChatbotProps> = ({
  apiBaseUrl = API_BASE_URL,
  defaultOpen = false,
}) => {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const [isClosing, setIsClosing] = useState(false);
  const [isSpinning, setIsSpinning] = useState(false);
  const [inputMessage, setInputMessage] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string>("");
  const isVoiceModeRef = useRef<boolean>(false);

  // Read authenticated user role dynamically for role-based recommendations and routing
  const getUserRole = useCallback((): string => {
    try {
      const storedRole = sessionStorage.getItem("role") || localStorage.getItem("role");
      if (storedRole) return storedRole.toLowerCase();

      const userStr = sessionStorage.getItem("user") || localStorage.getItem("user");
      if (userStr) {
        const u = JSON.parse(userStr);
        if (u.role) return String(u.role).toLowerCase();
      }
    } catch {}
    return "student";
  }, []);

  const [activeRole, setActiveRole] = useState<string>(getUserRole());

  useEffect(() => {
    setActiveRole(getUserRole());
  }, [getUserRole, isOpen]);

  // Dynamic recommendations matching active role's dashboard sidebar
  const currentPrompts = ROLE_PAGE_PROMPTS[activeRole] || DEFAULT_PROMPTS;

  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const typingTimerRef = useRef<any>(null);

  // Helper to scroll messages to bottom
  const scrollToBottom = useCallback((behavior: ScrollBehavior = "smooth") => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTo({
        top: messagesContainerRef.current.scrollHeight,
        behavior,
      });
    }
    messagesEndRef.current?.scrollIntoView({ behavior, block: "end" });
  }, []);

  // Forward declaration for handleSendMessage
  const handleSendMessageRef = useRef<(textToSend?: string, isVoice?: boolean) => Promise<void>>(async () => {});

  // Voice Assistant Hook with live transcription and auto-submit callback
  const {
    isListening,
    isSpeaking,
    isSupported: isVoiceSupported,
    startVoiceInteraction,
    toggleListening,
    speakText,
    stopAll,
  } = useVoiceAssistant({
    onTranscriptChange: (liveText) => {
      setInputMessage(liveText);
    },
    onTranscriptFinal: (finalText) => {
      if (finalText && finalText.trim()) {
        setInputMessage(finalText);
        isVoiceModeRef.current = true;
        handleSendMessageRef.current(finalText, true);
      }
    },
    onWakeWord: () => {
      setIsOpen(true);
      isVoiceModeRef.current = true;
    },
    lang: "en-IN",
  });

  // Auto-navigate background to the user's role-authorized dashboard screen based on topic
  const handleAutoNavigation = useCallback((text: string) => {
    const lower = text.toLowerCase();
    const role = getUserRole();
    let targetPath = "";

    // 1. Staff Tasks / Task Tracker
    if (lower.includes("task") || lower.includes("todo") || lower.includes("to-do") || lower.includes("delegat")) {
      targetPath = resolveRoleBasedPath(role, "staff_tasks");
    }
    // 2. Field visits / Inspections / School Visits
    else if (lower.includes("inspection") || lower.includes("field report") || lower.includes("field visit") || lower.includes("school inspection") || lower.includes("school visit")) {
      targetPath = resolveRoleBasedPath(role, "field_visits");
    }
    // 3. College Details / Profile & Report card
    else if (lower.includes("college details") || lower.includes("college profile") || lower.includes("report card") || lower.includes("institution profile")) {
      targetPath = resolveRoleBasedPath(role, "college_details");
    }
    // 4. Question Paper Approvals / Upload QP
    else if (lower.includes("question paper") || lower.includes("qp approval") || lower.includes("upload qp") || lower.includes("qp")) {
      targetPath = resolveRoleBasedPath(role, "qp_approvals");
    }
    // 5. Workflow Configuration / Timetable settings
    else if (lower.includes("workflow") || lower.includes("timetable config") || lower.includes("timetable setting")) {
      targetPath = resolveRoleBasedPath(role, "timetable_config");
    }
    // 6. Batches & Branches
    else if (lower.includes("branch") || lower.includes("department list")) {
      targetPath = resolveRoleBasedPath(role, "branches");
    } else if (lower.includes("batch")) {
      targetPath = resolveRoleBasedPath(role, "batches");
    }
    // 7. Users / Staff Enrollment / Bulk upload
    else if (lower.includes("bulk upload")) {
      targetPath = resolveRoleBasedPath(role, "bulk_upload");
    } else if (lower.includes("enroll staff") || lower.includes("enroll user") || lower.includes("enrollment")) {
      targetPath = resolveRoleBasedPath(role, "enroll_user");
    } else if (lower.includes("user management") || lower.includes("users list") || lower.includes("all users")) {
      targetPath = resolveRoleBasedPath(role, "users");
    }
    // 8. Teacher Assignments / Transfer
    else if (lower.includes("teacher assignment") || lower.includes("faculty assignment")) {
      targetPath = resolveRoleBasedPath(role, "teacher_assignments");
    } else if (lower.includes("branch transfer") || lower.includes("student transfer")) {
      targetPath = resolveRoleBasedPath(role, "student_transfer");
    }
    // 9. Syllabus & CO/PO Attainment
    else if (lower.includes("co/po") || lower.includes("attainment") || lower.includes("co attainment")) {
      targetPath = resolveRoleBasedPath(role, "co_attainment");
    } else if (lower.includes("syllabus monitor") || lower.includes("syllabus status") || lower.includes("syllabus")) {
      targetPath = resolveRoleBasedPath(role, "syllabus_monitor");
    }
    // 10. Issued items & Sports/Wellness
    else if (lower.includes("issued item") || lower.includes("college-issued")) {
      targetPath = resolveRoleBasedPath(role, "issued_items");
    } else if (lower.includes("sport") || lower.includes("wellness") || lower.includes("gym")) {
      targetPath = resolveRoleBasedPath(role, "sports_wellness");
    }
    // 11. Campus locations & Monitoring
    else if (lower.includes("campus location") || lower.includes("geofence") || lower.includes("geo-fence")) {
      targetPath = resolveRoleBasedPath(role, "campus_locations");
    } else if (lower.includes("campus monitoring") || lower.includes("cctv") || lower.includes("surveillance")) {
      targetPath = resolveRoleBasedPath(role, "campus_monitoring");
    }
    // 12. Student scanner & Alumni
    else if (lower.includes("scan student") || lower.includes("scan for student") || lower.includes("qr scan") || lower.includes("student scanner")) {
      targetPath = resolveRoleBasedPath(role, "scan_student");
    } else if (lower.includes("alumni") || lower.includes("graduates")) {
      targetPath = resolveRoleBasedPath(role, "alumni_directory");
    }
    // 13. Billing & Plans
    else if (lower.includes("billing") || lower.includes("subscription") || lower.includes("plans")) {
      targetPath = resolveRoleBasedPath(role, "billing");
    }
    // 14. Schedule Meeting
    else if (lower.includes("schedule meeting") || lower.includes("calendar meeting") || lower.includes("book meeting") || lower.includes("meet")) {
      targetPath = resolveRoleBasedPath(role, "schedule_meeting");
    }
    // 15. Reimbursements & Claims
    else if (lower.includes("reimbursement") || lower.includes("claim") || lower.includes("allowance")) {
      targetPath = resolveRoleBasedPath(role, "reimbursements");
    }
    // 16. Attendance & Low Attendance
    else if (lower.includes("attendance") || lower.includes("absent") || lower.includes("present") || lower.includes("shortage")) {
      if (lower.includes("low attendance") || lower.includes("defaulter attendance")) {
        targetPath = resolveRoleBasedPath(role, "low_attendance");
      } else if (lower.includes("my attendance") || lower.includes("staff attendance") || lower.includes("faculty attendance")) {
        targetPath = resolveRoleBasedPath(role, "my_attendance");
      } else if (lower.includes("record") || lower.includes("history")) {
        targetPath = resolveRoleBasedPath(role, "attendance_records");
      } else {
        targetPath = resolveRoleBasedPath(role, "attendance");
      }
    }
    // 17. Fees, Invoices & Reports
    else if (lower.includes("fee") || lower.includes("invoice") || lower.includes("payment") || lower.includes("defaulter") || lower.includes("dues")) {
      if (lower.includes("invoice")) {
        targetPath = resolveRoleBasedPath(role, "invoices");
      } else {
        targetPath = resolveRoleBasedPath(role, "fees");
      }
    } else if (lower.includes("report") || lower.includes("analytics")) {
      targetPath = resolveRoleBasedPath(role, "reports");
    }
    // 18. Marks & Academic Performance
    else if (lower.includes("mark") || lower.includes("cie") || lower.includes("internal") || lower.includes("grade") || lower.includes("score")) {
      targetPath = resolveRoleBasedPath(role, "marks");
    }
    // 19. Exams
    else if (lower.includes("exam") || lower.includes("see") || lower.includes("assessment")) {
      targetPath = resolveRoleBasedPath(role, "exams");
    } else if (lower.includes("revaluation") || lower.includes("reval")) {
      targetPath = resolveRoleBasedPath(role, "revaluation");
    } else if (lower.includes("makeup") || lower.includes("make-up")) {
      targetPath = resolveRoleBasedPath(role, "makeupexam");
    }
    // 20. Timetable & Schedule
    else if (lower.includes("timetable") || lower.includes("routine") || lower.includes("time table")) {
      targetPath = resolveRoleBasedPath(role, "timetable");
    } else if (lower.includes("schedule") || lower.includes("class timing") || lower.includes("mentoring")) {
      targetPath = resolveRoleBasedPath(role, "class_schedule");
    }
    // 21. Leaves & Calendar
    else if (lower.includes("leave") || lower.includes("holiday") || lower.includes("vacation")) {
      if (lower.includes("approve") || lower.includes("manage") || lower.includes("student leave") || lower.includes("staff leave") || lower.includes("request")) {
        targetPath = resolveRoleBasedPath(role, "leave_approvals");
      } else if (lower.includes("calendar")) {
        targetPath = resolveRoleBasedPath(role, "calendar");
      } else {
        targetPath = resolveRoleBasedPath(role, "leave");
      }
    }
    // 22. Announcements
    else if (lower.includes("announcement") || lower.includes("circular") || lower.includes("notice") || lower.includes("broadcast")) {
      targetPath = resolveRoleBasedPath(role, "announcements");
    }
    // 23. Study materials & Assignments
    else if (lower.includes("study material") || lower.includes("notes") || lower.includes("lecture")) {
      targetPath = resolveRoleBasedPath(role, "study_materials");
    } else if (lower.includes("assignment") || lower.includes("homework")) {
      targetPath = resolveRoleBasedPath(role, "assignments");
    }
    // 24. Hostel, Transport, Library, Admissions
    else if (lower.includes("hostel") || lower.includes("mess") || lower.includes("menu") || lower.includes("room") || lower.includes("gate pass")) {
      targetPath = resolveRoleBasedPath(role, "hostel");
    } else if (lower.includes("bus") || lower.includes("transport") || lower.includes("route") || lower.includes("driver") || lower.includes("trip")) {
      targetPath = resolveRoleBasedPath(role, "transport");
    } else if (lower.includes("library") || lower.includes("book") || lower.includes("circulation") || lower.includes("fine")) {
      targetPath = resolveRoleBasedPath(role, "library");
    } else if (lower.includes("lead") || lower.includes("admission") || lower.includes("enquiry") || lower.includes("seat matrix") || lower.includes("counsellor")) {
      targetPath = resolveRoleBasedPath(role, "admission");
    } else if (lower.includes("payroll") || lower.includes("salary") || lower.includes("pay slip") || lower.includes("compensation")) {
      targetPath = resolveRoleBasedPath(role, "payroll");
    } else if (lower.includes("inventory") || lower.includes("procurement") || lower.includes("asset") || lower.includes("ticket")) {
      targetPath = resolveRoleBasedPath(role, "inventory");
    } else if (lower.includes("profile") || lower.includes("account") || lower.includes("settings")) {
      targetPath = resolveRoleBasedPath(role, "profile");
    }

    if (targetPath) {
      navigate(targetPath);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, [navigate, getUserRole]);

  // Direct internal navigation handler from message links
  const handleDirectNavigation = useCallback((path: string) => {
    navigate(path);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [navigate]);

  // Initialize fresh Session ID & Messages on page load / hard refresh
  useEffect(() => {
    const freshSid = "stalight-" + Math.random().toString(36).substring(2, 11) + "-" + Date.now();
    setSessionId(freshSid);
    try {
      localStorage.removeItem("stalight_chat_history");
      localStorage.setItem("stalight_chat_session_id", freshSid);
    } catch (e) {
      // Ignore storage restrictions
    }

    setMessages([
      {
        id: "msg-0",
        sender: "bot",
        text: INITIAL_GREETING,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      },
    ]);

    return () => {
      if (typingTimerRef.current) clearInterval(typingTimerRef.current);
      stopAll();
    };
  }, [stopAll]);

  // Scroll to bottom on message updates
  useEffect(() => {
    scrollToBottom("smooth");
  }, [messages, isLoading, scrollToBottom]);

  // When chatbot is opened (or reopened), scroll immediately to end & focus input
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        scrollToBottom("auto");
        inputRef.current?.focus();
      }, 30);

      setTimeout(() => {
        scrollToBottom("smooth");
      }, 150);
    } else {
      stopAll();
    }
  }, [isOpen, scrollToBottom, stopAll]);

  useEffect(() => {
    if (!isLoading && isOpen && !isListening) {
      inputRef.current?.focus();
    }
  }, [isLoading, isOpen, isListening]);

  // Smooth typewriter streamer
  const streamBotResponse = useCallback((fullReply: string, msgId: string, timestamp: string, shouldSpeak: boolean = false) => {
    if (typingTimerRef.current) clearInterval(typingTimerRef.current);

    let idx = 0;
    const chunkSize = fullReply.length > 250 ? 4 : fullReply.length > 100 ? 3 : 2;
    const speed = 12;

    setMessages((prev) => [
      ...prev,
      {
        id: msgId,
        sender: "bot",
        text: "",
        timestamp: timestamp,
        isStreaming: true,
      },
    ]);

    // If voice mode is active, speak the clean response naturally
    if (shouldSpeak) {
      speakText(fullReply);
    }

    typingTimerRef.current = setInterval(() => {
      idx += chunkSize;
      if (idx >= fullReply.length) {
        clearInterval(typingTimerRef.current);
        typingTimerRef.current = null;
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === msgId ? { ...msg, text: fullReply, isStreaming: false } : msg
          )
        );
        inputRef.current?.focus();
      } else {
        const slice = fullReply.slice(0, idx);
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === msgId ? { ...msg, text: slice, isStreaming: true } : msg
          )
        );
      }
    }, speed);
  }, [speakText]);

  const handleSendMessage = async (textToSend?: string, isVoice: boolean = false) => {
    const text = (textToSend || inputMessage).trim();
    if (!text || isLoading) return;

    // Explicitly speak only if this exact turn was submitted via voice speech
    const isVoiceTurn = isVoice === true;

    // Auto-navigate background to matching page immediately
    handleAutoNavigation(text);

    const timestamp = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    const userMsg: ChatMessage = {
      id: "usr-" + Date.now(),
      sender: "user",
      text: text,
      timestamp: timestamp,
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputMessage("");
    setIsLoading(true);

    try {
      let reply = "";
      let uiCards: UICard[] = [];
      let suggestedActions: SuggestedAction[] = [];

      try {
        const copilotRes = await fetchWithTokenRefresh(`${apiBaseUrl}/api/copilot/chat/`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message: text }),
        });
        if (copilotRes.ok) {
          const copilotData = await copilotRes.json();
          reply = copilotData.response || "";
          uiCards = copilotData.ui_cards || [];
          suggestedActions = copilotData.suggested_actions || [];
        }
      } catch (copilotErr) {
        console.warn("Copilot endpoint fallback:", copilotErr);
      }

      if (!reply) {
        const response = await fetch(`${apiBaseUrl}/api/chatbot/message/`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            message: text,
            session_id: sessionId,
          }),
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        reply = data.reply || data.response || "I am currently unavailable. Please contact us at contact@stalight.in.";
      }

      const botMsgId = "bot-" + Date.now();
      const botTimestamp = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

      setIsLoading(false);
      streamBotResponse(reply, botMsgId, botTimestamp, isVoiceTurn);

      if (uiCards.length > 0 || suggestedActions.length > 0) {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === botMsgId ? { ...m, ui_cards: uiCards, suggested_actions: suggestedActions } : m
          )
        );
      }
    } catch (error) {
      console.error("Chat error:", error);
      setIsLoading(false);
      const fallbackMsg: ChatMessage = {
        id: "bot-err-" + Date.now(),
        sender: "bot",
        text: "I am unable to connect to the server at this moment. Please email our team directly at contact@stalight.in or call +91 73495 51102 / +91 73495 51101.",
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };
      setMessages((prev) => [...prev, fallbackMsg]);
      if (isVoiceTurn) {
        speakText("I am unable to connect to the server at this moment. Please contact our team at contact@stalight.in.");
      }
    }
  };

  handleSendMessageRef.current = handleSendMessage;

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Smooth Gemini-style open transition without laggy artificial delay
  const handleOpenWithSpin = useCallback((isVoice: boolean = false) => {
    setIsClosing(false);
    setIsSpinning(true);
    setIsOpen(true);
    setTimeout(() => {
      setIsSpinning(false);
      if (isVoice) {
        isVoiceModeRef.current = true;
        startVoiceInteraction();
      }
    }, 280);
  }, [startVoiceInteraction]);

  // Smooth Gemini-style close transition matching 240ms exit animation
  const handleCloseWithSpin = useCallback(() => {
    stopAll();
    setIsClosing(true);
    setIsSpinning(true);
    setTimeout(() => {
      setIsOpen(false);
      setIsClosing(false);
      setIsSpinning(false);
    }, 240);
  }, [stopAll]);

  // Handler for floating "Hey Stalight" badge click
  const handleHeyStalightBadgeClick = () => {
    handleOpenWithSpin(true);
  };

  // Handler for circular launcher logo click
  const handleLauncherIconClick = () => {
    if (isOpen) {
      handleCloseWithSpin();
    } else {
      handleOpenWithSpin(false);
    }
  };

  return (
    <div className="stalight-chatbot-root font-sans text-slate-900">
      {/* Floating Apple-Style Light Frosted Launcher Button */}
      {(!isOpen || isClosing) && (
        <div className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 transition-all duration-300 ${
          isClosing ? "opacity-100 scale-100" : isOpen ? "opacity-0 pointer-events-none scale-90" : "opacity-100 scale-100"
        }`}>
          {/* Hey Stalight Voice Badge Trigger with Auto-Cycling Gemini Hide & Reveal */}
          <button
            onClick={handleHeyStalightBadgeClick}
            title="Start voice interaction with Hey Stalight"
            className="group hidden sm:flex items-center gap-2.5 py-2 rounded-full bg-white/95 backdrop-blur-2xl border border-slate-200/90 text-xs font-semibold text-slate-700 shadow-[0_10px_25px_rgba(0,0,0,0.08)] hover:border-purple-300 hover:shadow-[0_12px_30px_rgba(168,85,247,0.2)] transition-shadow overflow-hidden whitespace-nowrap animate-badge-auto-cycle cursor-pointer"
          >
            <span className="relative flex h-2 w-2 flex-shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-purple-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-gradient-to-tr from-pink-500 via-purple-600 to-blue-600" />
            </span>
            <span className="bg-gradient-to-r from-pink-500 via-purple-600 to-blue-600 bg-clip-text text-transparent font-extrabold tracking-tight group-hover:from-pink-600 group-hover:to-purple-700 transition-all flex-shrink-0">
              Hey Stalight
            </span>
          </button>

          {/* Launcher Circular Orb Logo Button with Gemini Spin */}
          <button
            onClick={handleLauncherIconClick}
            aria-label="Open Stalight Intelligence"
            className="transform hover:scale-105 active:scale-95 transition-transform duration-200 cursor-pointer"
          >
            <SiriOrbGlow size={56} isSpinning={isSpinning} />
          </button>
        </div>
      )}

      {/* Main Apple Light Glass Window with Smooth Gemini Enter/Exit */}
      {isOpen && (
        <div className={`fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-50 w-[calc(100vw-2rem)] sm:w-[420px] h-[600px] max-h-[calc(100vh-3rem)] flex flex-col rounded-[28px] backdrop-blur-3xl bg-white/95 border border-slate-200/90 shadow-[0_25px_80px_rgba(0,0,0,0.12),0_0_30px_rgba(37,99,235,0.08)] overflow-hidden ${
          isClosing ? "gemini-chat-window-exit" : "gemini-chat-window-enter"
        }`}>
          {/* Apple Light Glass Header */}
          <div className="flex items-center justify-between px-5 py-3.5 bg-white/80 backdrop-blur-xl border-b border-slate-200/80">
            <div className="flex items-center gap-3">
              <div className={isClosing ? "animate-gemini-burst" : ""}>
                <StalightLogoAvatar size={34} />
              </div>
              <div>
                <div className="flex items-center gap-1.5 flex-wrap">
                  <h3 className="text-[15px] font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-pink-500 via-purple-600 to-blue-600">
                    Stalight
                  </h3>
                  <span className="px-2 py-0.5 text-[10px] font-bold bg-gradient-to-r from-purple-50 to-pink-50 text-purple-700 border border-purple-200/80 rounded-full shadow-sm">
                    Intelligence
                  </span>
                  <span className="px-2 py-0.5 text-[9px] font-bold tracking-wider uppercase bg-amber-50 text-amber-700 border border-amber-200/90 rounded-full shadow-sm flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                    Test Mode
                  </span>
                </div>
              </div>
            </div>

            {/* Header Right Actions */}
            <div className="flex items-center gap-1.5">
              {/* Speaking / Listening Voice Status Indicator */}
              {(isSpeaking || isListening) && (
                <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-purple-50 border border-purple-200/80 text-[10px] font-bold text-purple-700 animate-pulse mr-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-purple-600" />
                  <span>{isSpeaking ? "Speaking..." : "Listening..."}</span>
                </div>
              )}

              <button
                onClick={handleCloseWithSpin}
                title="Close"
                className="p-2 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer group"
              >
                <svg className="w-4 h-4 group-hover:rotate-90 transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
          </div>

          {/* Messages Scroll Area */}
          <div
            ref={messagesContainerRef}
            className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/30 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
          >
            {messages.map((msg) => (
              <MessageBubble
                key={msg.id}
                message={msg}
                onActionClick={(actionText) => handleSendMessage(actionText)}
                onNavigate={handleDirectNavigation}
              />
            ))}

            {/* Thinking State */}
            {isLoading && (
              <div className="flex items-end gap-2.5 justify-start">
                <StalightLogoAvatar size={28} className="mb-1" />
                <div className="px-4 py-2.5 rounded-2xl rounded-bl-sm bg-white border border-slate-200 shadow-sm flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-pink-500 animate-pulse" style={{ animationDelay: "0ms" }} />
                  <span className="w-2 h-2 rounded-full bg-purple-500 animate-pulse" style={{ animationDelay: "150ms" }} />
                  <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" style={{ animationDelay: "300ms" }} />
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Clean Role-Aware Suggestions Bar matching sidebar pages */}
          <div className="px-3.5 py-2 bg-slate-50/80 border-t border-slate-200/80 flex items-center gap-1.5 overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
            {currentPrompts.map((prompt, idx) => (
              <button
                key={idx}
                onClick={() => handleSendMessage(prompt)}
                disabled={isLoading}
                className="whitespace-nowrap flex-shrink-0 px-3 py-1.5 rounded-full text-[11px] font-medium bg-white hover:bg-purple-50 border border-slate-200/90 hover:border-purple-200 text-slate-700 hover:text-purple-700 transition-all disabled:opacity-50 shadow-sm cursor-pointer"
              >
                {prompt}
              </button>
            ))}
          </div>

          {/* Light Glass Input Footer with Live Mic & Waveform */}
          <div className="p-3 bg-white/90 border-t border-slate-200/80 backdrop-blur-xl">
            <div className="relative flex items-center">
              <input
                ref={inputRef}
                type="text"
                value={inputMessage}
                onChange={(e) => {
                  if (typeof window !== "undefined" && window.speechSynthesis?.speaking) {
                    window.speechSynthesis.cancel();
                  }
                  setInputMessage(e.target.value);
                }}
                onKeyDown={handleKeyDown}
                placeholder={isListening ? "Listening... speak now" : "Ask Stalight or choose a topic..."}
                maxLength={500}
                className={`w-full pl-4 pr-20 py-2.5 bg-slate-50/90 border rounded-full text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 shadow-inner transition-all ${
                  isListening
                    ? "border-purple-400 focus:border-purple-500 focus:ring-purple-500/20 bg-purple-50/30"
                    : "border-slate-200 focus:border-blue-500 focus:ring-blue-500/20"
                }`}
              />

              <div className="absolute right-1.5 flex items-center gap-1">
                {/* Direct Microphone Button */}
                {isVoiceSupported && (
                  <button
                    onClick={() => {
                      isVoiceModeRef.current = true;
                      toggleListening();
                    }}
                    type="button"
                    title={isSpeaking ? "Stop speaking" : isListening ? "Stop listening" : "Speak to Stalight"}
                    aria-label={isSpeaking ? "Stop Voice Output" : "Voice Input"}
                    className={`p-2 rounded-full transition-all ${
                      isSpeaking
                        ? "bg-red-50 text-red-500 hover:bg-red-100 hover:text-red-600"
                        : isListening
                        ? "bg-purple-600 text-white shadow-md shadow-purple-500/30 animate-pulse scale-105"
                        : "text-slate-400 hover:text-purple-600 hover:bg-purple-50"
                    }`}
                  >
                    {isSpeaking ? (
                      <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                        <rect x="6" y="6" width="12" height="12" rx="2" />
                      </svg>
                    ) : (
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                      </svg>
                    )}
                  </button>
                )}

                {/* Send Button */}
                <button
                  onClick={() => handleSendMessage()}
                  disabled={!inputMessage.trim() || isLoading}
                  type="button"
                  aria-label="Send"
                  className="p-2 rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/20 hover:opacity-95 disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer"
                >
                  <svg className="w-3.5 h-3.5 transform rotate-90" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
                    />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StalightChatbot;

