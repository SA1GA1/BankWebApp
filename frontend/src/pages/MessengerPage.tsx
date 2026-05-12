import { useEffect, useRef, useState } from "react";
import { Send } from "lucide-react";
import { api } from "../api/client";
import { useSession } from "../store/session";
import { useFingerprint } from "../hooks/useFingerprint";
import ScoreBadge from "../components/ScoreBadge";
import PageHeader from "../components/PageHeader";
import type { Decision, Message, ScoreResult, Thread, User } from "../types";

const PEER_BUBBLE_BORDER: Record<Decision, string> = {
  safe: "border-l-transparent",
  review: "border-l-amber-400",
  sms: "border-l-orange-500",
  biometry: "border-l-red-500",
};

function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase();
}

export default function MessengerPage() {
  const { user } = useSession();
  const collectSignals = useFingerprint();
  const [users, setUsers] = useState<User[]>([]);
  const [threads, setThreads] = useState<Thread[]>([]);
  const [peerId, setPeerId] = useState<number | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [screenScore, setScreenScore] = useState<ScoreResult | null>(null);
  const [lastResult, setLastResult] = useState<ScoreResult | null>(null);
  const [blockedNotice, setBlockedNotice] = useState<ScoreResult | null>(null);
  const listEnd = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!user) return;
    api.listUsers().then(setUsers);
    api.threads(user.id).then(setThreads);
    (async () => {
      const signals = await collectSignals();
      try {
        const res = await api.screenEntry({
          user_id: user.id,
          screen: "messenger",
          signals,
        });
        setScreenScore(res);
      } catch (e) {
        console.warn("screen-entry failed", e);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  useEffect(() => {
    if (!user || !peerId) return;
    api.messages(user.id, peerId).then(setMessages);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, peerId]);

  useEffect(() => {
    listEnd.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const peerName = (id: number) =>
    users.find((u) => u.id === id)?.full_name ?? `User ${id}`;

  const send = async () => {
    if (!user || !peerId || !text.trim()) return;
    setBusy(true);
    setBlockedNotice(null);
    try {
      const signals = await collectSignals();
      const res = await api.postMessage({
        sender_id: user.id,
        receiver_id: peerId,
        text: text.trim(),
        signals,
      });
      setLastResult({
        score: res.score,
        decision: res.decision,
        reasons: res.reasons,
      });
      if (res.status === "blocked") {
        setBlockedNotice({
          score: res.score,
          decision: res.decision,
          reasons: res.reasons,
        });
      } else if (res.message) {
        setMessages((prev) => [...prev, res.message!]);
      }
      setText("");
      api.threads(user.id).then(setThreads);
    } catch (e) {
      console.error(e);
    } finally {
      setBusy(false);
    }
  };

  if (!user) return null;

  return (
    <div className="max-w-5xl mx-auto px-6 py-6 space-y-5">
      <PageHeader title="Сообщения" />

      {screenScore && screenScore.decision !== "safe" && (
        <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-sm">
          Антифрод-система отметила вашу сессию как{" "}
          <b>{screenScore.decision}</b> при входе в мессенджер (score{" "}
          {screenScore.score.toFixed(1)}).
        </div>
      )}

      <div className="grid grid-cols-3 gap-4 h-[70vh]">
        <aside className="col-span-1 bg-white border border-bank-border rounded-2xl overflow-y-auto shadow-card">
          <div className="px-4 py-3 border-b border-bank-border text-sm font-semibold text-bank-primary">
            Диалоги
          </div>
          <ul className="divide-y divide-bank-border">
            {users
              .filter((u) => u.id !== user.id)
              .map((u) => {
                const thread = threads.find((t) => t.peer_id === u.id);
                const active = peerId === u.id;
                return (
                  <li key={u.id}>
                    <button
                      type="button"
                      onClick={() => setPeerId(u.id)}
                      className={`relative w-full text-left px-4 py-3 flex items-center gap-3 transition ${
                        active
                          ? "bg-bank-accent-soft"
                          : "hover:bg-bank-bg/60"
                      }`}
                    >
                      {active && (
                        <span className="absolute left-0 top-2 bottom-2 w-1 rounded-r bg-bank-accent" />
                      )}
                      <div
                        className={`w-9 h-9 rounded-full grid place-items-center text-xs font-semibold shrink-0 ${
                          active
                            ? "bg-bank-accent text-white"
                            : "bg-bank-bg text-bank-primary"
                        }`}
                      >
                        {initialsOf(u.full_name)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="font-medium text-sm text-bank-primary truncate">
                          {u.full_name}
                        </div>
                        <div className="text-xs text-bank-muted truncate">
                          {thread?.last_text ?? "Нет сообщений"}
                        </div>
                      </div>
                    </button>
                  </li>
                );
              })}
          </ul>
        </aside>

        <section className="col-span-2 bg-white border border-bank-border rounded-2xl flex flex-col shadow-card">
          {peerId === null ? (
            <div className="flex-1 flex items-center justify-center text-bank-muted text-sm">
              Выберите собеседника
            </div>
          ) : (
            <>
              <div className="px-5 py-3 border-b border-bank-border flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-bank-accent text-white grid place-items-center text-xs font-semibold">
                  {initialsOf(peerName(peerId))}
                </div>
                <div className="font-semibold text-bank-primary text-sm">
                  {peerName(peerId)}
                </div>
              </div>
              <div className="flex-1 overflow-y-auto px-5 py-4 space-y-2 bg-bank-bg/40">
                {messages.map((m) => {
                  const mine = m.sender_id === user.id;
                  const dec = (m.antifraud_decision ?? "safe") as Decision;
                  return (
                    <div
                      key={m.id}
                      className={`flex ${mine ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={`max-w-[72%] rounded-2xl px-4 py-2.5 text-sm border-l-4 ${
                          mine
                            ? "bg-bank-accent text-white border-l-transparent rounded-br-md"
                            : `bg-white text-slate-900 border-bank-border border ${PEER_BUBBLE_BORDER[dec]} rounded-bl-md`
                        }`}
                      >
                        <div>{m.text}</div>
                        <div
                          className={`text-[10px] mt-1 flex gap-2 ${
                            mine ? "text-white/70" : "text-bank-muted"
                          }`}
                        >
                          <span>
                            {new Date(m.created_at).toLocaleTimeString("ru-RU")}
                          </span>
                          {!mine && dec !== "safe" && (
                            <span className="font-semibold uppercase">
                              ⚠ {dec}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
                <div ref={listEnd} />
              </div>
              <div className="border-t border-bank-border p-3 space-y-2">
                {blockedNotice && (
                  <div className="p-2.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs">
                    Сообщение заблокировано антифрод-системой (score{" "}
                    {blockedNotice.score.toFixed(1)}). Причины:{" "}
                    {blockedNotice.reasons.slice(0, 3).join("; ")}
                  </div>
                )}
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        send();
                      }
                    }}
                    placeholder="Сообщение..."
                    className="flex-1 bg-bank-bg border border-transparent focus:bg-white focus:border-bank-accent focus:ring-2 focus:ring-bank-accent/20 rounded-full px-4 py-2.5 text-sm outline-none transition"
                  />
                  <button
                    type="button"
                    onClick={send}
                    disabled={busy || !text.trim()}
                    className="w-11 h-11 bg-bank-accent text-white rounded-full grid place-items-center disabled:opacity-50 hover:bg-bank-primary transition shrink-0"
                    title="Отправить"
                  >
                    <Send className="w-4 h-4" strokeWidth={2} />
                  </button>
                </div>
              </div>
            </>
          )}
        </section>
      </div>

      {lastResult && (
        <div>
          <ScoreBadge
            score={lastResult.score}
            decision={lastResult.decision as Decision}
            reasons={lastResult.reasons}
          />
        </div>
      )}
    </div>
  );
}
