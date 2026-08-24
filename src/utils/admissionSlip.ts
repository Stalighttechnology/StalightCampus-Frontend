/**
 * Utility for fetching and printing the complete 5-Page Filled Admission Application & Confirmation Dossier
 * Templates are stored and rendered on the backend in templates/admission_forms/
 */
import { API_ENDPOINT } from './config';
import { fetchWithTokenRefresh } from './authService';
import { toast } from 'sonner';

interface ApplicationData {
  id?: number;
  usn?: string;
  branch_name?: string;
  batch_name?: string;
  semester_name?: string;
  section_name?: string;
  address?: string;
  photo?: string;
  enquiry_details?: {
    name?: string;
    phone?: string;
    email?: string;
    city?: string;
    course_name?: string;
    status?: string;
    usn?: string;
  };
  form_data?: {
    name?: string;
    [key: string]: any;
  };
  [key: string]: any;
}

export async function printFullAdmissionApplication(app: ApplicationData): Promise<void> {
  const currentStatus = app?.enquiry_details?.status;
  if (currentStatus && currentStatus !== 'admission_confirmed' && currentStatus !== 'enrolled') {
    toast.warning("Application dossier download is available once the student's admission is confirmed or enrolled.");
    return;
  }

  if (!app?.id) {
    toast.error("Application ID is missing.");
    return;
  }

  const toastId = toast.loading("Preparing Admission Application Dossier...");

  try {
    let clientLogo = '';
    try {
      const rawUser = sessionStorage.getItem('user') || localStorage.getItem('user');
      if (rawUser) {
        const u = JSON.parse(rawUser);
        clientLogo = u.org_logo || u.organization?.logo_url || u.organization?.logo || '';
      }
    } catch (e) {
      // Ignore
    }
    if (!clientLogo) {
      clientLogo = localStorage.getItem('org_logo') || '';
    }

    const queryParam = clientLogo ? `?logo_url=${encodeURIComponent(clientLogo)}` : '';
    const res = await fetchWithTokenRefresh(`${API_ENDPOINT}/admission/manager/applications/${app.id}/download_dossier/${queryParam}`);
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      toast.dismiss(toastId);
      toast.error(err.error || err.detail || "Failed to generate admission dossier.");
      return;
    }

    const data = await res.json();
    const html = data.html;

    toast.dismiss(toastId);

    if (!html) {
      toast.error("Empty document received from server.");
      return;
    }

    const printWindow = window.open('', '_blank', 'width=1000,height=1100');
    if (printWindow) {
      printWindow.document.open();
      printWindow.document.write(html);
      printWindow.document.close();
      printWindow.focus();
      setTimeout(() => {
        printWindow.print();
      }, 400);
    } else {
      toast.error("Popup blocked! Please allow popups for this website to print/download the form.");
    }
  } catch (error: any) {
    console.error("Error generating dossier:", error);
    toast.dismiss(toastId);
    toast.error(error.message || "An error occurred while generating the admission dossier.");
  }
}

// Aliases for compatibility
export const generateAdmissionConfirmationSlipHTML = (app: ApplicationData) => '';
export const printAdmissionConfirmationSlip = printFullAdmissionApplication;
