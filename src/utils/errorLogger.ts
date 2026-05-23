// Global Frontend Error Logger for Stalight Campus
import { API_BASE_URL } from "./config";
const API_URL = API_BASE_URL;
let errorCount = 0;
const MAX_ERRORS_PER_SESSION = 10;

export const initErrorLogger = () => {
  // Capture unhandled Javascript execution exceptions
  window.onerror = (message, source, lineno, colno, error) => {
    logError({
      error_message: typeof message === 'string' ? message : (message?.type || 'Unknown JS Error'),
      stack_trace: error?.stack || `At ${source}:${lineno}:${colno}`,
      page_url: window.location.href,
      component_name: 'WindowOnError',
    });
  };

  // Capture unhandled Promise rejections
  window.onunhandledrejection = (event) => {
    const error = event.reason;
    logError({
      error_message: error?.message || 'Unhandled Promise Rejection',
      stack_trace: error?.stack || String(error),
      page_url: window.location.href,
      component_name: 'WindowOnUnhandledRejection',
    });
  };

  console.log('Stalight HQ Observability: Frontend error logger initialized.');
};

interface FrontendLogPayload {
  error_message: string;
  stack_trace: string;
  page_url: string;
  component_name?: string;
}

export const logError = async (payload: FrontendLogPayload) => {
  // Guard: Avoid logger loop or flooding
  if (errorCount >= MAX_ERRORS_PER_SESSION) {
    return;
  }
  
  errorCount++;

  try {
    const browserInfo = getBrowserInfo();
    const deviceType = getDeviceType();

    // Prepare full ingest data
    const ingestData = {
      error_message: payload.error_message,
      stack_trace: payload.stack_trace,
      page_url: payload.page_url,
      component_name: payload.component_name || 'Component',
      browser: browserInfo,
      device: deviceType,
    };

    // Use sendBeacon or standard fetch
    // sendBeacon is non-blocking and works even during page unload
    const url = `${API_URL}/api/system-logs/frontend-log/`;
    
    // Add Authorization header if superadmin token exists
    const superadminToken = localStorage.getItem('superadmin_token');
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (superadminToken) {
      headers['Authorization'] = `Bearer ${superadminToken}`;
    }

    await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(ingestData),
    });
  } catch (err) {
    // Fail silently in console to prevent inf loop
    console.warn('Failed to ship error log to StalightHQ backend:', err);
  }
};

// Simple User Agent Parsers
function getBrowserInfo(): string {
  const ua = navigator.userAgent;
  let M = ua.match(/(opera|chrome|safari|firefox|msie|trident(?=\/))\/?\s*(\d+)/i) || [];
  let tem;
  if (/trident/i.test(M[1])) {
    tem = /\brv[ :]+(\d+)/g.exec(ua) || [];
    return 'IE ' + (tem[1] || '');
  }
  if (M[1] === 'Chrome') {
    tem = ua.match(/\b(OPR|Edge)\/(\d+)/);
    if (tem != null) return tem.slice(1).join(' ').replace('OPR', 'Opera');
  }
  M = M[2] ? [M[1], M[2]] : [navigator.appName, navigator.appVersion, '-?'];
  if ((tem = ua.match(/version\/(\d+)/i)) != null) M.splice(1, 1, tem[1]);
  return M.join(' ');
}

function getDeviceType(): string {
  const ua = navigator.userAgent;
  if (/(tablet|ipad|playbook|silk)|(android(?!.*mobi))/i.test(ua)) {
    return 'Tablet';
  }
  if (/Mobile|iP(hone|od)|Android|BlackBerry|IEMobile|Kindle|Silk-Accelerated|(hpw|web)OS|Opera M(obi|ini)/.test(ua)) {
    return 'Mobile';
  }
  return 'Desktop';
}
