/**
 * Supabase Website Service for Stalight Campus SuperAdmin
 * Fetches form submissions and leads from Stalight website Supabase database
 */

import {
  getSuperAdminWebsiteLeads,
  updateSuperAdminWebsiteLeadStatus,
  deleteSuperAdminWebsiteLead,
} from "./admin_api";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || "https://jkzucjenrihvdwkibljn.supabase.co";
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || "sb_publishable_jlyS7VC_CVyYmuD_5hEWeQ_zu6aGTR6";

export type FormTableKey =
  | "contact_inquiries"
  | "admission_applications"
  | "project_inquiries"
  | "it_assessments"
  | "neurocampus_inquiries"
  | "neurosync_inquiries";

export interface FormConfig {
  key: FormTableKey;
  label: string;
  description: string;
  color: string;
}

export const LEAD_STATUS_OPTIONS = [
  {
    value: "New",
    label: "New",
    badgeClass: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800",
    dotClass: "bg-blue-500",
  },
  {
    value: "Contacted",
    label: "Contacted",
    badgeClass: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800",
    dotClass: "bg-amber-500",
  },
  {
    value: "Interested",
    label: "Interested",
    badgeClass: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800",
    dotClass: "bg-emerald-500",
  },
  {
    value: "In Progress",
    label: "In Progress",
    badgeClass: "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/60 dark:text-purple-300 dark:border-purple-800",
    dotClass: "bg-purple-500",
  },
  {
    value: "Not Interested",
    label: "Not Interested",
    badgeClass: "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800",
    dotClass: "bg-rose-500",
  },
  {
    value: "Closed",
    label: "Closed / Converted",
    badgeClass: "bg-teal-50 text-teal-700 border-teal-200 dark:bg-teal-950/60 dark:text-teal-300 dark:border-teal-800",
    dotClass: "bg-teal-500",
  },
] as const;

export type LeadStatusType = typeof LEAD_STATUS_OPTIONS[number]["value"];

export const FORM_CONFIGS: Record<FormTableKey, FormConfig> = {
  contact_inquiries: {
    key: "contact_inquiries",
    label: "Contact Inquiries",
    description: "General contact messages submitted from the main website",
    color: "blue",
  },
  admission_applications: {
    key: "admission_applications",
    label: "Admission Applications",
    description: "Skill development and academic admission form submissions",
    color: "purple",
  },
  project_inquiries: {
    key: "project_inquiries",
    label: "Project Inquiries",
    description: "Software development and growth marketing quote inquiries",
    color: "emerald",
  },
  it_assessments: {
    key: "it_assessments",
    label: "IT Assessments",
    description: "IT services and technical assessment requests",
    color: "amber",
  },
  neurocampus_inquiries: {
    key: "neurocampus_inquiries",
    label: "NeuroCampus Inquiries",
    description: "NeuroCampus ERP demo bookings and product inquiries",
    color: "indigo",
  },
  neurosync_inquiries: {
    key: "neurosync_inquiries",
    label: "NeuroSync Inquiries",
    description: "NeuroSync proctoring demo and institution inquiries",
    color: "rose",
  },
};

export interface WebsiteLeadItem {
  id: string | number;
  formType: FormTableKey;
  formLabel: string;
  name: string;
  email: string;
  phone?: string;
  companyOrOrg?: string;
  summary: string;
  status: string;
  createdAt: string;
  raw: Record<string, any>;
}

/**
 * Fetch raw table records from Supabase REST API
 */
async function fetchTableRecords(tableName: FormTableKey): Promise<any[]> {
  try {
    const url = `${SUPABASE_URL}/rest/v1/${tableName}?select=*`;
    const response = await fetch(url, {
      method: "GET",
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      const errText = await response.text();
      console.warn(`Supabase query failed for ${tableName}:`, response.status, errText);
      return [];
    }

    const data = await response.json();
    return Array.isArray(data) ? data : [];
  } catch (error) {
    console.error(`Error fetching table ${tableName}:`, error);
    return [];
  }
}

/**
 * Normalize and map raw row into unified WebsiteLeadItem
 */
function normalizeRecord(formType: FormTableKey, row: Record<string, any>): WebsiteLeadItem {
  const config = FORM_CONFIGS[formType];
  const id = row.id ?? `${formType}_${Math.random()}`;
  const createdAt = row.created_at || row.applied_at || new Date().toISOString();
  const status = row.status || "New";

  switch (formType) {
    case "contact_inquiries":
      return {
        id,
        formType,
        formLabel: config.label,
        name: row.full_name || row.name || "Anonymous",
        email: row.email || "",
        phone: row.phone || "",
        companyOrOrg: row.company || "",
        summary: row.message || "",
        status,
        createdAt,
        raw: row,
      };

    case "admission_applications":
      return {
        id,
        formType,
        formLabel: config.label,
        name: `${row.first_name || ""} ${row.last_name || ""}`.trim() || "Applicant",
        email: row.email || "",
        phone: row.phone || "",
        companyOrOrg: row.interested_track ? `Track: ${row.interested_track}` : "",
        summary: row.highest_qualification ? `Qualification: ${row.highest_qualification}` : "",
        status,
        createdAt,
        raw: row,
      };

    case "project_inquiries":
      return {
        id,
        formType,
        formLabel: config.label,
        name: row.full_name || "Client",
        email: row.email || "",
        phone: row.phone || "",
        companyOrOrg: row.company_name || row.company || "",
        summary: [
          row.service_required ? `Service: ${row.service_required}` : "",
          row.expected_timeline ? `Timeline: ${row.expected_timeline}` : "",
          row.project_requirements ? `Req: ${row.project_requirements}` : "",
        ]
          .filter(Boolean)
          .join(" | "),
        status,
        createdAt,
        raw: row,
      };

    case "it_assessments":
      return {
        id,
        formType,
        formLabel: config.label,
        name: row.full_name || "Client",
        email: row.email || "",
        phone: row.phone || "",
        companyOrOrg: row.company || "",
        summary: [
          row.primary_focus ? `Focus: ${row.primary_focus}` : "",
          row.timeline ? `Timeline: ${row.timeline}` : "",
          row.details ? `Details: ${row.details}` : "",
        ]
          .filter(Boolean)
          .join(" | "),
        status,
        createdAt,
        raw: row,
      };

    case "neurocampus_inquiries":
      return {
        id,
        formType,
        formLabel: config.label,
        name: row.full_name || "Institution Lead",
        email: row.official_email || row.email || "",
        phone: row.phone || "",
        companyOrOrg: [row.organization, row.designation ? `(${row.designation})` : ""]
          .filter(Boolean)
          .join(" "),
        summary: [
          row.interested_solution ? `Solution: ${row.interested_solution}` : "",
          row.preferred_date ? `Demo: ${row.preferred_date} ${row.preferred_time || ""}`.trim() : "",
          row.message ? `Msg: ${row.message}` : "",
        ]
          .filter(Boolean)
          .join(" | "),
        status,
        createdAt,
        raw: row,
      };

    case "neurosync_inquiries":
      return {
        id,
        formType,
        formLabel: config.label,
        name: row.full_name || "Institution Lead",
        email: row.official_email || row.email || "",
        phone: row.phone || "",
        companyOrOrg: [row.organization, row.designation ? `(${row.designation})` : ""]
          .filter(Boolean)
          .join(" "),
        summary: [
          row.product_interested ? `Product: ${row.product_interested}` : "",
          row.number_of_students ? `Students: ${row.number_of_students}` : "",
          row.current_process ? `Current: ${row.current_process}` : "",
          row.preferred_date ? `Demo: ${row.preferred_date} ${row.preferred_time || ""}`.trim() : "",
        ]
          .filter(Boolean)
          .join(" | "),
        status,
        createdAt,
        raw: row,
      };

    default:
      return {
        id,
        formType,
        formLabel: formType,
        name: row.full_name || row.name || "Lead",
        email: row.email || "",
        phone: row.phone || "",
        companyOrOrg: "",
        summary: JSON.stringify(row),
        status,
        createdAt,
        raw: row,
      };
  }
}

/**
 * Fetch submissions for one or all forms
 */
export async function getWebsiteLeads(
  filterType: FormTableKey | "all" = "all",
  statusFilter: string = "all"
): Promise<{ success: boolean; data: WebsiteLeadItem[]; counts: Record<string, number> }> {
  try {
    // 1. First try fetching via Campus SuperAdmin Backend (using credentials in Django .env)
    const backendRes = await getSuperAdminWebsiteLeads({
      form_type: filterType,
      status: statusFilter !== "all" ? statusFilter : undefined,
    });
    if (backendRes && backendRes.success && Array.isArray(backendRes.data)) {
      return {
        success: true,
        data: backendRes.data,
        counts: backendRes.counts || {},
      };
    }
  } catch (backendError) {
    console.warn("Backend website leads fetch failed, trying direct Supabase REST...", backendError);
  }

  // 2. Direct Supabase REST fetch as fallback
  try {
    const counts: Record<string, number> = {
      all: 0,
      contact_inquiries: 0,
      admission_applications: 0,
      project_inquiries: 0,
      it_assessments: 0,
      neurocampus_inquiries: 0,
      neurosync_inquiries: 0,
    };

    // Fetch all tables in parallel to keep counts across all cards populated
    const keys = Object.keys(FORM_CONFIGS) as FormTableKey[];
    const results = await Promise.all(
      keys.map(async (k) => {
        const rows = await fetchTableRecords(k);
        counts[k] = rows.length;
        counts.all += rows.length;
        if (filterType === "all" || filterType === k) {
          return rows.map((r) => normalizeRecord(k, r));
        }
        return [];
      })
    );

    let merged = results.flat();

    // Filter by status if requested
    if (statusFilter && statusFilter !== "all") {
      merged = merged.filter(
        (item) => item.status?.toLowerCase() === statusFilter.toLowerCase()
      );
    }

    // Sort by createdAt descending
    merged.sort((a, b) => {
      const dateA = new Date(a.createdAt).getTime();
      const dateB = new Date(b.createdAt).getTime();
      return (isNaN(dateB) ? 0 : dateB) - (isNaN(dateA) ? 0 : dateA);
    });

    return { success: true, data: merged, counts };
  } catch (error) {
    console.error("Error in getWebsiteLeads:", error);
    return {
      success: false,
      data: [],
      counts: {
        all: 0,
        contact_inquiries: 0,
        admission_applications: 0,
        project_inquiries: 0,
        it_assessments: 0,
        neurocampus_inquiries: 0,
        neurosync_inquiries: 0,
      },
    };
  }
}

/**
 * Update the status of a website lead directly in Supabase
 */
export async function updateWebsiteLeadStatus(
  formType: FormTableKey,
  leadId: string | number,
  status: string
): Promise<{ success: boolean; message: string }> {
  try {
    const res = await updateSuperAdminWebsiteLeadStatus(formType, leadId, status);
    if (res && res.success) {
      return { success: true, message: res.message || `Status updated to ${status}` };
    }
    return { success: false, message: res?.message || "Failed to update status in Supabase" };
  } catch (err: any) {
    return { success: false, message: err?.message || "Network error updating status" };
  }
}

/**
 * Permanently delete a website lead from Supabase
 */
export async function deleteWebsiteLead(
  formType: FormTableKey,
  leadId: string | number
): Promise<{ success: boolean; message: string }> {
  try {
    const res = await deleteSuperAdminWebsiteLead(formType, leadId);
    if (res && res.success) {
      return { success: true, message: res.message || "Lead deleted successfully from Supabase" };
    }
    return { success: false, message: res?.message || "Failed to delete lead from Supabase" };
  } catch (err: any) {
    return { success: false, message: err?.message || "Network error deleting lead" };
  }
}

