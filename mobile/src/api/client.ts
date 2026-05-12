import type {
  Merchant,
  Message,
  MessagePostResponse,
  ScoreResult,
  Signals,
  Thread,
  Transaction,
  TransferResponse,
  User,
} from "../types";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    headers: { "Content-Type": "application/json" },
    ...init,
  });
  if (!res.ok) {
    let detail = res.statusText;
    try {
      const body = await res.json();
      detail = body.detail ?? JSON.stringify(body);
    } catch {
      /* ignore */
    }
    throw new Error(`${res.status}: ${detail}`);
  }
  return res.json() as Promise<T>;
}

export const api = {
  listUsers: () => request<User[]>("/api/users"),
  getUser: (id: number) => request<User & { transactions: Transaction[] }>(`/api/users/${id}`),
  listTransactions: (id: number) => request<Transaction[]>(`/api/users/${id}/transactions`),
  listMerchants: (q: string) =>
    request<Merchant[]>(`/api/merchants?q=${encodeURIComponent(q)}`),
  transfer: (body: {
    from_user_id: number;
    mode: "p2p" | "merchant";
    amount: number;
    to_account?: string;
    to_name?: string;
    merchant_site?: string;
    signals: Signals;
  }) =>
    request<TransferResponse>("/api/transfer", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  confirmTransfer: (pending_id: string, code: string) =>
    request<TransferResponse>("/api/transfer/confirm", {
      method: "POST",
      body: JSON.stringify({ pending_id, code }),
    }),
  threads: (userId: number) => request<Thread[]>(`/api/messages/threads/${userId}`),
  messages: (userId: number, peerId: number) =>
    request<Message[]>(`/api/messages/${userId}/${peerId}`),
  postMessage: (body: {
    sender_id: number;
    receiver_id: number;
    text: string;
    signals: Signals;
  }) =>
    request<MessagePostResponse>("/api/messages", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  screenEntry: (body: { user_id: number; screen: "transfer" | "messenger"; signals: Signals }) =>
    request<ScoreResult>("/api/antifraud/screen-entry", {
      method: "POST",
      body: JSON.stringify(body),
    }),
};
