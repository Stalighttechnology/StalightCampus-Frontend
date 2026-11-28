export interface UICard {
  type: string;
  title?: string;
  subtitle?: string;
  link?: string;
  link_text?: string;
  route_key?: string;
  key_values?: Record<string, string>;
  columns?: string[];
  rows?: Array<Record<string, any>>;
  branches?: Array<Record<string, any>>;
  total_outstanding?: number;
  total_collected?: number;
  unpaid_invoices?: number;
  threshold?: number;
  actions?: Array<{ label?: string; url?: string; route_key?: string; [key: string]: unknown }>;
}

export interface PendingConfirmation {
  pending_action_id: string;
  operation: string;
  summary: string;
  expires_at: string;
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
  pending_confirmation?: PendingConfirmation | null;
  tools_invoked?: string[];
}

export interface ChatbotProps {
  apiBaseUrl?: string;
  defaultOpen?: boolean;
}

