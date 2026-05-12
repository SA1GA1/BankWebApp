export type Decision = "safe" | "review" | "sms" | "biometry";

export interface User {
  id: number;
  full_name: string;
  account_number: string;
  phone: string;
  balance: number;
  created_at: string;
}

export interface Transaction {
  id: number;
  kind: "incoming" | "outgoing" | "payment";
  counterparty: string | null;
  amount: number;
  description: string | null;
  created_at: string;
  antifraud_score: number | null;
  antifraud_decision: Decision | null;
}

export interface Merchant {
  id: number;
  name: string;
  site: string;
  category: string;
  is_known_suspicious: number;
}

export interface Message {
  id: number;
  sender_id: number;
  receiver_id: number;
  text: string;
  created_at: string;
  antifraud_score: number | null;
  antifraud_decision: Decision | null;
  antifraud_reasons: string[];
}

export interface Thread {
  peer_id: number;
  peer_name: string;
  peer_account: string;
  last_text: string;
  last_created_at: string;
  last_sender_id: number;
}

export interface Signals {
  browser_fingerprint?: string;
  user_agent?: string;
  browser_name?: string;
  browser_version?: string;
  os_type?: string;
  screen_resolution?: string;
  system_language?: string;
  timezone_offset_minutes?: number;
  session_duration_sec?: number;
  mouse_velocity_avg?: number;
  mouse_jitter_score?: number;
  keyboard_typing_speed_median_ms?: number;
  network_rtt_avg_ms?: number;
  is_vpn_detected?: number;
  is_proxy_detected?: number;
  is_tor_detected?: number;
  is_new_device?: number;
  is_new_browser?: number;
  geo_speed_km_h?: number;
  transfers_count_last_10min?: number;
  force_hour_of_day?: number | null;
  geo_mismatch?: boolean;
}

export interface ScoreResult {
  score: number;
  decision: Decision;
  reasons: string[];
}

export interface TransferResponse extends ScoreResult {
  status: "ok" | "challenge" | "blocked";
  challenge?: "phrase" | "sms";
  pending_id?: string;
  transaction_id?: number;
}

export interface MessagePostResponse extends ScoreResult {
  status: "ok" | "flagged" | "blocked";
  message?: Message;
}
