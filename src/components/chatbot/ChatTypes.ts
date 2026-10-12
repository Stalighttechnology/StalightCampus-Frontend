export interface UICard {
  type: string;
  title?: string;
  subtitle?: string;
  key_values?: Record<string, string>;
  columns?: string[];
  rows?: Array<Record<string, any>>;
  branches?: Array<Record<string, any>>;
  total_outstanding?: number;
  total_collected?: number;
  unpaid_invoices?: number;
  threshold?: number;
  actions?: Array<{label?: string; url?: string; [key: string]: unknown;}>;
}

export interface SuggestedAction {
  text: string;
}

export interface ChatMessage {
  id: string;
  sender: "bot" | "user";
  text: string;
  timestamp: string;
  isStreaming?: boolean;
  ui_cards?: UICard[];
  suggested_actions?: SuggestedAction[];
  tools_invoked?: string[];
}

export interface ChatbotProps {
  apiBaseUrl?: string;
  defaultOpen?: boolean;
}

