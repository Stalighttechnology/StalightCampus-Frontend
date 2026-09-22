/**
 * ComplianceReportPreview — optimised for zero re-renders while typing.
 *
 * Key performance decisions:
 * 1. All editable fields are UNCONTROLLED (defaultValue + ref writes).
 *    → No state update on every keystroke → zero re-render while the user types.
 * 2. A single mutable ref (`dataRef`) holds the live form state.
 *    On Download, we read from the ref, not component state.
 * 3. Section accordions use a CSS max-height transition — no Framer Motion height
 *    animation inside the scrollable container.
 * 4. Each Section is React.memo'd. renderSection output is useMemo'd per section.
 * 5. The modal entrance/exit still uses Framer Motion (one-shot, not per-keystroke).
 */

import {
  useState,
  useRef,
  useCallback,
  useMemo,
  memo,
  type ReactNode,
} from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTheme } from "../../context/ThemeContext";
import { useToast } from "../../hooks/use-toast";
import * as XLSX from "xlsx";
import {
  X, Download, ChevronDown, ChevronUp, Edit3,
  CheckCircle2, Building2, Users, GraduationCap,
  BookOpen, BarChart3, Landmark, Shield, Cpu, Info,
} from "lucide-react";

type ReportType = "NAAC_SSR" | "NBA_SAR";

interface Props {
  reportType: ReportType;
  data: any;
  onClose: () => void;
}

// ─── Helpers ───────────────────────────────────────────────────────────────
const labelOf = (key: string) =>
  key.split(".").pop()!.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());

function flattenLeaves(obj: any, prefix = ""): Record<string, string> {
  if (!obj || typeof obj !== "object" || Array.isArray(obj)) return {};
  return Object.entries(obj).reduce((acc: any, [k, v]) => {
    const key = prefix ? `${prefix}.${k}` : k;
    if (v !== null && v !== undefined && typeof v === "object" && !Array.isArray(v)) {
      Object.assign(acc, flattenLeaves(v, key));
    } else if (!Array.isArray(v)) {
      acc[key] = String(v ?? "");
    }
    return acc;
  }, {});
}

const isMultiline = (key: string) =>
  ["best_practices", "green_campus", "grievance", "strategic_plan", "vision",
   "mission", "program_educational", "program_outcomes", "course_outcomes",
   "improvements", "feedback", "interaction", "conduct", "welfare", "innovation",
  ].some((w) => key.toLowerCase().includes(w));

const CRITERION_BORDER: Record<string, string> = {
  criterion_1: "border-violet-400",  nba_1: "border-violet-400",
  criterion_2: "border-blue-400",    nba_2: "border-blue-400",
  criterion_3: "border-indigo-400",  nba_3: "border-indigo-400",
  criterion_4: "border-teal-400",    nba_4: "border-teal-400",
  criterion_5: "border-emerald-400", nba_5: "border-emerald-400",
  criterion_6: "border-amber-400",   nba_6: "border-amber-400",
  criterion_7: "border-pink-400",    nba_7: "border-pink-400",
};

const SECTION_META = [
  { id: "institution_profile",  label: "Institution Profile",      Icon: Building2,    color: "text-violet-500"  },
  { id: "enrollment_summary",   label: "Enrollment Summary",       Icon: GraduationCap,color: "text-blue-500"    },
  { id: "faculty_directory",    label: "Faculty Directory",        Icon: Users,        color: "text-purple-500"  },
  { id: "branch_statistics",    label: "Branch Statistics",        Icon: BarChart3,    color: "text-orange-500"  },
  { id: "attendance_summary",   label: "Attendance Summary",       Icon: BookOpen,     color: "text-green-500"   },
  { id: "financial_summary",    label: "Financial Summary",        Icon: Landmark,     color: "text-yellow-500"  },
  { id: "infrastructure",       label: "Infrastructure",           Icon: Cpu,          color: "text-teal-500"    },
  { id: "accreditation",        label: "Accreditation History",    Icon: Shield,       color: "text-pink-500"    },
];

// ─── Uncontrolled editable field ────────────────────────────────────────────
// Uses defaultValue so React never re-renders it on parent state change.
// onChange writes directly to the mutable ref — zero parent re-render.
const Field = memo(({
  label, defaultValue, onChange, multiline = false, isDark, readOnly = false,
}: {
  label: string; defaultValue: string; onChange?: (v: string) => void;
  multiline?: boolean; isDark: boolean; readOnly?: boolean;
}) => {
  const base = `w-full text-sm rounded-lg px-3 py-2 border outline-none transition-colors ${
    readOnly
      ? isDark ? "bg-transparent border-transparent font-semibold text-foreground cursor-default"
               : "bg-transparent border-transparent font-semibold text-gray-800 cursor-default"
      : isDark ? "bg-muted/40 border-border text-foreground focus:ring-2 focus:ring-primary/30 focus:border-primary"
               : "bg-white border-gray-200 text-gray-900 focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400"
  }`;

  return (
    <div>
      <label className={`block text-xs font-medium mb-1 ${isDark ? "text-muted-foreground" : "text-gray-400"}`}>
        {label}
      </label>
      {multiline ? (
        <textarea
          className={`${base} min-h-[68px] resize-y`}
          defaultValue={defaultValue}
          readOnly={readOnly}
          onChange={readOnly ? undefined : (e) => onChange?.(e.target.value)}
        />
      ) : (
        <input
          className={base}
          defaultValue={defaultValue}
          readOnly={readOnly}
          onChange={readOnly ? undefined : (e) => onChange?.(e.target.value)}
        />
      )}
    </div>
  );
});

// ─── Stat pill (read-only) ──────────────────────────────────────────────────
const StatPill = memo(({ label, value, isDark }: { label: string; value: string; isDark: boolean }) => (
  <div className={`rounded-xl p-3 text-center border ${isDark ? "bg-muted/30 border-border" : "bg-gray-50 border-gray-100"}`}>
    <p className={`text-2xl font-semibold ${isDark ? "text-foreground" : "text-gray-900"}`}>{value || "—"}</p>
    <p className={`text-xs mt-0.5 leading-tight ${isDark ? "text-muted-foreground" : "text-gray-500"}`}>{label}</p>
  </div>
));

// ─── CSS-only accordion section ──────────────────────────────────────────────
// No Framer Motion inside the scroll area — just CSS max-height transition.
const Section = memo(({
  label, Icon, colorClass, children, isDark, defaultOpen = false,
}: {
  label: string; Icon: any; colorClass: string;
  children: ReactNode; isDark: boolean; defaultOpen?: boolean;
}) => {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className={`rounded-xl border overflow-hidden transition-shadow hover:shadow-sm ${
      isDark ? "border-border bg-card/70" : "border-gray-200 bg-white"
    }`}>
      <button
        type="button"
        onClick={() => setOpen((p) => !p)}
        className={`w-full flex items-center justify-between px-5 py-3.5 text-left transition-colors select-none ${
          isDark ? "hover:bg-muted/30" : "hover:bg-gray-50/80"
        }`}
      >
        <div className="flex items-center gap-2.5">
          <Icon size={15} className={colorClass} />
          <span className="font-semibold text-sm">{label}</span>
        </div>
        <div className={`transition-transform duration-200 opacity-40 ${open ? "rotate-180" : ""}`}>
          <ChevronDown size={15} />
        </div>
      </button>

      {/* CSS transition — no JS animation cost */}
      <div
        className={`grid transition-all duration-200 ease-out ${open ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}
      >
        <div className="overflow-hidden">
          <div className={`px-5 pb-5 pt-3 border-t ${isDark ? "border-border/60" : "border-gray-100"}`}>
            {children}
          </div>
        </div>
      </div>
    </div>
  );
});

// ─── Criterion block for NAAC / NBA ─────────────────────────────────────────
const CriterionBlock = memo(({
  criterion, isDark, onFieldChange,
}: {
  criterion: { id: string; title: string; fields: Record<string, any> };
  isDark: boolean;
  onFieldChange: (id: string, key: string, val: string) => void;
}) => {
  const border = CRITERION_BORDER[criterion.id] || "border-gray-300";
  return (
    <div className={`border-l-4 ${border} rounded-r-xl px-4 py-3 mb-3 ${isDark ? "bg-muted/20" : "bg-gray-50/80"}`}>
      <p className={`text-[11px] font-semibold uppercase tracking-widest mb-3 ${isDark ? "text-muted-foreground" : "text-gray-500"}`}>
        {criterion.title}
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {Object.entries(criterion.fields).map(([k, v]) => {
          const isNum = typeof v === "number";
          return (
            <Field
              key={k}
              label={labelOf(k)}
              defaultValue={String(v ?? "")}
              readOnly={isNum}
              isDark={isDark}
              multiline={isMultiline(k)}
              onChange={isNum ? undefined : (val) => onFieldChange(criterion.id, k, val)}
            />
          );
        })}
      </div>
    </div>
  );
});

// ─── Compact table ───────────────────────────────────────────────────────────
const DataTable = memo(({ cols, rows, isDark }: { cols: string[]; rows: any[]; isDark: boolean }) => (
  <div className={`overflow-x-auto rounded-lg border mt-2 ${isDark ? "border-border" : "border-gray-200"}`}>
    <table className="min-w-full text-xs">
      <thead>
        <tr className={isDark ? "bg-muted/50" : "bg-gray-50"}>
          {cols.map((c) => (
            <th key={c} className={`px-3 py-2 text-left font-semibold uppercase tracking-wide whitespace-nowrap ${isDark ? "text-muted-foreground" : "text-gray-400"}`}>
              {labelOf(c)}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row, i) => (
          <tr key={i} className={`${isDark ? "border-t border-border/40 hover:bg-muted/20" : "border-t border-gray-100 hover:bg-gray-50"} transition-colors`}>
            {cols.map((c) => (
              <td key={c} className="px-3 py-2 whitespace-nowrap">{row[c] ?? "—"}</td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  </div>
));

// ─── Main Component ──────────────────────────────────────────────────────────
const ComplianceReportPreview = ({ reportType, data, onClose }: Props) => {
  const { theme } = useTheme();
  const { toast }  = useToast();
  const isDark     = theme === "dark";

  // Mutable ref — fields write here directly without triggering re-renders
  const dataRef = useRef<any>(JSON.parse(JSON.stringify(data)));

  // Write helpers — update the ref only
  const setLeaf = useCallback((sectionId: string, dotKey: string, val: string) => {
    const keys = dotKey.split(".");
    let target = dataRef.current[sectionId];
    for (let i = 0; i < keys.length - 1; i++) {
      if (target && keys[i] in target) target = target[keys[i]]; else return;
    }
    if (target) target[keys[keys.length - 1]] = val;
  }, []);

  const setCriterionField = useCallback((sectionId: string, criterionId: string, key: string, val: string) => {
    let arr: any[] = [];
    if (sectionId === "naac_criteria") arr = dataRef.current.naac_criteria || [];
    else if (sectionId === "nba") arr = dataRef.current.nba_program_details?.nba_criteria || [];
    const crit = arr.find((c: any) => c.id === criterionId);
    if (crit) crit.fields[key] = val;
  }, []);

  // ── Excel export (reads from ref, not state) ──────────────────────────────
  const handleDownload = useCallback(() => {
    try {
      const d = dataRef.current;
      const wb = XLSX.utils.book_new();

      const addKVSheet = (name: string, obj: any) => {
        const flat = flattenLeaves(obj);
        const rows = Object.entries(flat).map(([k, v]) => ({ Field: labelOf(k), Value: v }));
        if (rows.length) XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), name.substring(0, 31));
      };

      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet([
        { Field: "Report Type", Value: reportType === "NAAC_SSR" ? "NAAC Self Study Report (SSR)" : "NBA Self Assessment Report (SAR)" },
        { Field: "Generated At", Value: new Date().toLocaleString() },
        { Field: "Institution",  Value: d.institution_profile?.institution_name || "" },
      ]), "Report Info");

      addKVSheet("Institution Profile", d.institution_profile);

      // Enrollment — scalar rows + branch table
      const es = d.enrollment_summary || {};
      const esScalar = Object.entries(es).filter(([k]) => k !== "branch_enrollment").map(([k, v]) => ({ Field: labelOf(k), Value: String(v) }));
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(esScalar), "Enrollment Summary");
      if (Array.isArray(es.branch_enrollment) && es.branch_enrollment.length)
        XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(es.branch_enrollment), "Branch Enrollment");

      if (Array.isArray(d.faculty_directory) && d.faculty_directory.length)
        XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(d.faculty_directory), "Faculty Directory");

      if (Array.isArray(d.branch_statistics) && d.branch_statistics.length)
        XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(d.branch_statistics), "Branch Statistics");

      addKVSheet("Attendance Summary", d.attendance_summary);
      addKVSheet("Financial Summary",  d.financial_summary);
      addKVSheet("Infrastructure",     d.infrastructure);
      addKVSheet("Accreditation",      d.accreditation);

      if (Array.isArray(d.naac_criteria)) {
        const rows: any[] = [];
        d.naac_criteria.forEach((c: any) => {
          rows.push({ Criterion: c.title, Field: "", Value: "" });
          Object.entries(c.fields || {}).forEach(([k, v]) => rows.push({ Criterion: "", Field: labelOf(k), Value: String(v ?? "") }));
        });
        XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), "NAAC 7 Criteria");
      }

      if (d.nba_program_details) {
        const nbp = d.nba_program_details;
        addKVSheet("NBA Program Info", { program_name: nbp.program_name, program_code: nbp.program_code, duration_years: nbp.duration_years, sanctioned_intake: nbp.sanctioned_intake });
        if (Array.isArray(nbp.nba_criteria)) {
          const rows: any[] = [];
          nbp.nba_criteria.forEach((c: any) => {
            rows.push({ Criterion: c.title, Field: "", Value: "" });
            Object.entries(c.fields || {}).forEach(([k, v]) => rows.push({ Criterion: "", Field: labelOf(k), Value: String(v ?? "") }));
          });
          XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), "NBA 7 Criteria");
        }
      }

      XLSX.writeFile(wb, `${reportType}_${new Date().toISOString().split("T")[0]}.xlsx`);
      toast({ title: "Downloaded!", description: `${reportType} Excel file saved.` });
    } catch {
      toast({ variant: "destructive", title: "Export Failed", description: "Could not generate Excel file." });
    }
  }, [reportType, toast]);

  // ── Section content renderers — each is memoized ──────────────────────────
  const institutionContent = useMemo(() => {
    const val = data.institution_profile || {};
    const flat = flattenLeaves(val);
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {Object.entries(flat).map(([dotKey, v]) => (
          <Field key={dotKey} label={labelOf(dotKey)} defaultValue={v} isDark={isDark}
            multiline={false} onChange={(nv) => setLeaf("institution_profile", dotKey, nv)} />
        ))}
      </div>
    );
  }, [isDark, setLeaf]);

  const enrollmentContent = useMemo(() => {
    const es = data.enrollment_summary || {};
    const scalars = Object.entries(es).filter(([k]) => k !== "branch_enrollment");
    const branchEnroll: any[] = es.branch_enrollment || [];
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
          {scalars.map(([k, v]) => <StatPill key={k} label={labelOf(k)} value={String(v)} isDark={isDark} />)}
        </div>
        {branchEnroll.length > 0 && (
          <>
            <p className={`text-xs font-semibold uppercase tracking-wider ${isDark ? "text-muted-foreground" : "text-gray-400"}`}>Enrollment by Branch</p>
            <DataTable cols={["branch_name","branch_code","students"]} rows={branchEnroll} isDark={isDark} />
          </>
        )}
      </div>
    );
  }, [isDark]);

  const facultyContent = useMemo(() => {
    const list = data.faculty_directory;
    if (!Array.isArray(list) || !list.length) return <p className="text-sm text-muted-foreground">No faculty records.</p>;
    const cols = Object.keys(list[0]);
    return <DataTable cols={cols} rows={list} isDark={isDark} />;
  }, [isDark]);

  const branchContent = useMemo(() => {
    const list = data.branch_statistics;
    if (!Array.isArray(list) || !list.length) return <p className="text-sm text-muted-foreground">No branch data.</p>;
    return (
      <div className={`overflow-x-auto rounded-lg border mt-1 ${isDark ? "border-border" : "border-gray-200"}`}>
        <table className="min-w-full text-xs">
          <thead>
            <tr className={isDark ? "bg-muted/50" : "bg-gray-50"}>
              {["Branch Name","Code","Students","Faculty"].map((h) => (
                <th key={h} className={`px-3 py-2 text-left font-semibold uppercase tracking-wide ${isDark ? "text-muted-foreground" : "text-gray-400"}`}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {list.map((r: any, i: number) => (
              <tr key={i} className={`${isDark ? "border-t border-border/40 hover:bg-muted/20" : "border-t border-gray-100 hover:bg-gray-50"} transition-colors`}>
                <td className="px-3 py-2 font-medium">{r.name}</td>
                <td className="px-3 py-2">{r.code}</td>
                <td className="px-3 py-2 font-semibold text-blue-500">{r.students}</td>
                <td className="px-3 py-2 font-semibold text-purple-500">{r.faculty}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }, [isDark]);

  const attendanceContent = useMemo(() => {
    const val = data.attendance_summary || {};
    const note = val.note;
    const entries = Object.entries(val).filter(([k]) => k !== "note");
    return (
      <div className="space-y-3">
        {note && (
          <div className={`flex items-start gap-2 px-3 py-2 rounded-lg text-xs border ${isDark ? "bg-amber-950/20 border-amber-800/40 text-amber-300" : "bg-amber-50 border-amber-200 text-amber-700"}`}>
            <Info size={13} className="mt-0.5 shrink-0" />{note}
          </div>
        )}
        <div className="grid grid-cols-3 gap-3">
          {entries.map(([k, v]) => <StatPill key={k} label={labelOf(k)} value={String(v)} isDark={isDark} />)}
        </div>
      </div>
    );
  }, [isDark]);

  const financialContent = useMemo(() => {
    const val = data.financial_summary || {};
    return (
      <div className="grid grid-cols-2 gap-3">
        {Object.entries(val).map(([k, v]) => <StatPill key={k} label={labelOf(k)} value={String(v)} isDark={isDark} />)}
      </div>
    );
  }, [isDark]);

  const makeEditableSection = useCallback((sectionId: string, val: any) => {
    const flat = flattenLeaves(val);
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {Object.entries(flat).map(([dotKey, v]) => (
          <Field key={dotKey} label={labelOf(dotKey)} defaultValue={v} isDark={isDark}
            multiline={isMultiline(dotKey)} onChange={(nv) => setLeaf(sectionId, dotKey, nv)} />
        ))}
      </div>
    );
  }, [isDark, setLeaf]);

  const naacContent = useMemo(() => {
    const criteria: any[] = data.naac_criteria || [];
    if (!criteria.length) return <p className="text-sm text-muted-foreground">No NAAC criteria data.</p>;
    return (
      <div className="space-y-0">
        {criteria.map((c: any) => (
          <CriterionBlock key={c.id} criterion={c} isDark={isDark}
            onFieldChange={(id, key, val) => setCriterionField("naac_criteria", id, key, val)} />
        ))}
      </div>
    );
  }, [isDark, setCriterionField]);

  const nbaContent = useMemo(() => {
    const nbp = data.nba_program_details;
    if (!nbp) return <p className="text-sm text-muted-foreground">No NBA program data.</p>;
    const { nba_criteria, ...topFields } = nbp;
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {Object.entries(topFields).map(([k, v]) => (
            <Field key={k} label={labelOf(k)} defaultValue={String(v ?? "")} isDark={isDark}
              onChange={(nv) => { dataRef.current.nba_program_details[k] = nv; }} />
          ))}
        </div>
        {Array.isArray(nba_criteria) && (
          <div>
            <p className={`text-xs font-semibold uppercase tracking-wider mb-3 ${isDark ? "text-muted-foreground" : "text-gray-400"}`}>NBA 7 Criteria</p>
            {nba_criteria.map((c: any) => (
              <CriterionBlock key={c.id} criterion={c} isDark={isDark}
                onFieldChange={(id, key, val) => setCriterionField("nba", id, key, val)} />
            ))}
          </div>
        )}
      </div>
    );
  }, [isDark, setCriterionField]);

  // ── Build sections list ────────────────────────────────────────────────────
  const sections = useMemo(() => {
    const base = [
      { ...SECTION_META[0], content: institutionContent },
      { ...SECTION_META[1], content: enrollmentContent },
      { ...SECTION_META[2], content: facultyContent },
      { ...SECTION_META[3], content: branchContent },
      { ...SECTION_META[4], content: attendanceContent },
      { ...SECTION_META[5], content: financialContent },
      { ...SECTION_META[6], content: makeEditableSection("infrastructure", data.infrastructure || {}) },
      { ...SECTION_META[7], content: makeEditableSection("accreditation",  data.accreditation  || {}) },
    ];
    if (reportType === "NAAC_SSR") base.push({ id: "naac_criteria", label: "NAAC 7 Criteria", Icon: CheckCircle2, color: "text-indigo-500", content: naacContent });
    if (reportType === "NBA_SAR")  base.push({ id: "nba",           label: "NBA Program & Criteria", Icon: CheckCircle2, color: "text-emerald-500", content: nbaContent });
    return base;
  }, [reportType, institutionContent, enrollmentContent, facultyContent, branchContent,
      attendanceContent, financialContent, makeEditableSection, naacContent, nbaContent]);

  const gradient = reportType === "NAAC_SSR" ? "from-violet-600 to-indigo-600" : "from-emerald-600 to-teal-600";
  const btnGrad  = reportType === "NAAC_SSR" ? "from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700"
                                             : "from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700";

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto p-4"
      style={{ backgroundColor: "rgba(0,0,0,0.65)", backdropFilter: "blur(6px)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <motion.div
        className={`relative w-full max-w-4xl rounded-2xl shadow-2xl overflow-hidden my-6 ${isDark ? "bg-background" : "bg-gray-50"}`}
        initial={{ opacity: 0, scale: 0.97, y: 16 }}
        animate={{ opacity: 1, scale: 1,    y: 0   }}
        exit={{    opacity: 0, scale: 0.97, y: 16  }}
        transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── Header ─────────────────────────────────────────────────────── */}
        <div className={`bg-gradient-to-r ${gradient} px-6 py-5 flex items-center justify-between`}>
          <div>
            <p className="text-white/60 text-xs font-semibold uppercase tracking-widest mb-1">
              {reportType === "NAAC_SSR" ? "NAAC" : "NBA"} Compliance Report
            </p>
            <h2 className="text-xl font-semibold text-white leading-tight">
              {reportType === "NAAC_SSR" ? "Self Study Report (SSR)" : "Self Assessment Report (SAR)"}
            </h2>
            <p className="text-white/60 text-xs mt-1">Edit any field below, then download the final Excel.</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleDownload}
              className="flex items-center gap-1.5 bg-white/15 hover:bg-white/25 active:bg-white/30 text-white text-sm font-semibold px-4 py-2 rounded-xl transition-colors"
            >
              <Download size={14} />Download
            </button>
            <button onClick={onClose} className="p-2 rounded-xl bg-white/15 hover:bg-white/25 text-white transition-colors">
              <X size={17} />
            </button>
          </div>
        </div>

        {/* ── Edit notice ─────────────────────────────────────────────────── */}
        <div className={`flex items-center gap-2 px-5 py-2 text-xs border-b ${isDark ? "bg-amber-950/20 border-border text-amber-400" : "bg-amber-50 border-amber-100 text-amber-700"}`}>
          <Edit3 size={12} />
          Text boxes are editable. Bold numbers (students, faculty, attendance) are read-only live data from your database.
        </div>

        {/* ── Sections ────────────────────────────────────────────────────── */}
        <div className="px-5 py-4 space-y-2 max-h-[74vh] overflow-y-auto overscroll-contain">
          {sections.map((sec, idx) => (
            <Section
              key={sec.id}
              label={sec.label}
              Icon={sec.Icon}
              colorClass={sec.color}
              isDark={isDark}
              defaultOpen={idx === 0}
            >
              {sec.content}
            </Section>
          ))}
        </div>

        {/* ── Footer ─────────────────────────────────────────────────────── */}
        <div className={`px-5 py-3.5 border-t flex items-center justify-between ${isDark ? "border-border bg-card/80" : "border-gray-200 bg-white"}`}>
          <p className={`text-xs ${isDark ? "text-muted-foreground" : "text-gray-400"}`}>
            Generated {new Date(data.generated_at).toLocaleString()}
          </p>
          <button
            onClick={handleDownload}
            className={`flex items-center gap-2 text-sm font-semibold px-5 py-2.5 rounded-xl transition-all bg-gradient-to-r ${btnGrad} text-white shadow-sm`}
          >
            <Download size={14} />
            Download Final Excel
          </button>
        </div>
      </motion.div>
    </div>
  );
};

export default ComplianceReportPreview;
