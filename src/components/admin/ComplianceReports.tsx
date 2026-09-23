import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTheme } from "../../context/ThemeContext";
import { fetchWithTokenRefresh } from "../../utils/authService";
import { API_ENDPOINT } from "../../utils/config";
import { useToast } from "../../hooks/use-toast";
import ComplianceReportPreview from "./ComplianceReportPreview";
import {
  FileCheck,
  Award,
  Building2,
  ArrowRight,
  ChevronRight,
  Loader2,
  ShieldCheck,
  BookOpen,
} from "lucide-react";

type ReportType = "NAAC_SSR" | "NBA_SAR";

const REPORTS = [
  {
    type: "NAAC_SSR" as ReportType,
    title: "NAAC SSR",
    subtitle: "Self Study Report",
    body:
      "National Assessment and Accreditation Council mandated report that evaluates institutional quality across 7 criteria including curriculum, research, infrastructure, and governance.",
    icon: <Award size={32} />,
    gradient: "from-violet-600 to-indigo-600",
    accent: "violet",
    badge: "NAAC",
    criteria: [
      "Curricular Aspects",
      "Teaching-Learning & Evaluation",
      "Research, Innovations & Extension",
      "Infrastructure & Learning Resources",
      "Student Support & Progression",
      "Governance, Leadership & Management",
      "Institutional Values & Best Practices",
    ],
  },
  {
    type: "NBA_SAR" as ReportType,
    title: "NBA SAR",
    subtitle: "Self Assessment Report",
    body:
      "National Board of Accreditation report covering program outcomes, faculty qualifications, physical resources, and student performance for technical program accreditation.",
    icon: <ShieldCheck size={32} />,
    gradient: "from-emerald-600 to-teal-600",
    accent: "emerald",
    badge: "NBA",
    criteria: [
      "Vision, Mission & Program Educational Objectives",
      "Program Outcomes & Course Outcomes",
      "Program Curriculum & Teaching-Learning Processes",
      "Student Performance",
      "Faculty Information & Contributions",
      "Facilities & Technical Support",
      "Continuous Improvement",
    ],
  },
];

const ComplianceReports = () => {
  const { theme } = useTheme();
  const { toast } = useToast();
  const isDark = theme === "dark";

  const [selectedReport, setSelectedReport] = useState<ReportType | null>(null);
  const [loadingType, setLoadingType] = useState<ReportType | null>(null);
  const [previewData, setPreviewData] = useState<any>(null);

  const handleGenerate = async (type: ReportType) => {
    setLoadingType(type);
    try {
      const res = await fetchWithTokenRefresh(
        `${API_ENDPOINT}/admin/compliance-reports/data/?report_type=${type}`
      );
      const json = await res.json();
      if (json.success) {
        setPreviewData(json.data);
        setSelectedReport(type);
      } else {
        toast({
          variant: "destructive",
          title: "Error",
          description: json.message || "Failed to load report data.",
        });
      }
    } catch {
      toast({
        variant: "destructive",
        title: "Network Error",
        description: "Could not connect to server.",
      });
    } finally {
      setLoadingType(null);
    }
  };

  return (
    <div className={`min-h-screen pb-12 ${isDark ? "bg-background text-foreground" : "bg-gray-50 text-gray-900"}`}>
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="mb-8"
      >
        <div className="flex items-center gap-3 mb-2">
          <div className={`p-2 rounded-xl ${isDark ? "bg-primary/20" : "bg-indigo-50"}`}>
            <BookOpen size={22} className={isDark ? "text-primary" : "text-indigo-600"} />
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">Compliance Reports</h1>
        </div>
        <p className={`text-sm ${isDark ? "text-muted-foreground" : "text-gray-500"}`}>
          Generate NAAC Self Study Report (SSR) and NBA Self Assessment Report (SAR) with a single click.
          Preview and edit data before downloading the final Excel file.
        </p>
      </motion.div>

      {/* Info banner */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.1 }}
        className={`flex items-start gap-3 p-4 rounded-xl mb-8 border ${
          isDark
            ? "bg-blue-950/30 border-blue-900/40 text-blue-300"
            : "bg-blue-50 border-blue-100 text-blue-700"
        }`}
      >
        <Building2 size={18} className="mt-0.5 shrink-0" />
        <p className="text-sm">
          Data is automatically aggregated from student records, faculty directories, attendance history,
          and financial transactions. You can preview and edit any field before generating the final report.
        </p>
      </motion.div>

      {/* Report Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {REPORTS.map((report, idx) => (
          <motion.div
            key={report.type}
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 + idx * 0.1, duration: 0.4 }}
            className={`rounded-2xl border overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-300 ${
              isDark ? "bg-card border-border" : "bg-white border-gray-200"
            }`}
          >
            {/* Gradient header */}
            <div className={`bg-gradient-to-r ${report.gradient} p-6`}>
              <div className="flex items-start justify-between">
                <div className="text-white">
                  {report.icon}
                  <span
                    className="mt-3 inline-block text-xs font-semibold uppercase tracking-widest px-2 py-0.5 rounded-full bg-white/20"
                  >
                    {report.badge}
                  </span>
                </div>
                <FileCheck size={18} className="text-white/60" />
              </div>
              <h2 className="mt-4 text-2xl font-semibold text-white">{report.title}</h2>
              <p className="text-white/80 text-sm font-medium">{report.subtitle}</p>
            </div>

            {/* Body */}
            <div className="p-6 space-y-4">
              <p className={`text-sm leading-relaxed ${isDark ? "text-muted-foreground" : "text-gray-600"}`}>
                {report.body}
              </p>

              {/* Criteria list */}
              <div>
                <p className={`text-xs font-semibold uppercase tracking-wider mb-2 ${isDark ? "text-muted-foreground" : "text-gray-400"}`}>
                  Key Criteria Covered
                </p>
                <ul className="space-y-1.5">
                  {report.criteria.map((c, i) => (
                    <li key={i} className={`flex items-center gap-2 text-xs ${isDark ? "text-foreground/80" : "text-gray-700"}`}>
                      <ChevronRight size={12} className={`shrink-0 ${report.accent === "violet" ? "text-violet-500" : "text-emerald-500"}`} />
                      {c}
                    </li>
                  ))}
                </ul>
              </div>

              {/* CTA */}
              <button
                onClick={() => handleGenerate(report.type)}
                disabled={loadingType !== null}
                className={`w-full mt-2 flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-semibold text-sm transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed
                  ${
                    report.accent === "violet"
                      ? "bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white shadow-md hover:shadow-violet-200"
                      : "bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white shadow-md hover:shadow-emerald-200"
                  }`}
              >
                {loadingType === report.type ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Loading data…
                  </>
                ) : (
                  <>
                    Preview & Generate {report.title}
                    <ArrowRight size={16} />
                  </>
                )}
              </button>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Preview Modal */}
      <AnimatePresence>
        {selectedReport && previewData && (
          <ComplianceReportPreview
            reportType={selectedReport}
            data={previewData}
            onClose={() => {
              setSelectedReport(null);
              setPreviewData(null);
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default ComplianceReports;
