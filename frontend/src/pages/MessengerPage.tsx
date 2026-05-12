import { useEffect, useRef, useState } from "react";
import { api } from "../api/client";
import { useSession } from "../store/session";
import { useFingerprint } from "../hooks/useFingerprint";
import ScoreBadge from "../components/ScoreBadge";
import type { Decision, Message, ScoreResult, Thread, User } from "../types";

const BORDERS: Record<Decision, string> = {
  safe: "border-l-transparent",
  review: "border-l-amber-400 bg-amber-50",
  sms: "border-l-orange-500 bg-orange-50",
  biometry: "border-l-red-500 bg-red-50",
};

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

  const peerName = (id: number) => users.find((u) => u.id === id)?.full_name ?? `User ${id}`;

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
      setLastResult({ score: res.score, decision: res.decision, reasons: res.reasons });
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
      // обновим список тредов
      api.threads(user.id).then(setThreads);
    } catch (e) {
      console.error(e);
    } finally {
      setBusy(false);
    }
  };

  if (!user) return null;

  return (
    <div className="max-w-5xl mx-auto px-4 py-6">
      {screenScore && screenScore.decision !== "safe" && (
        <div className="mb-3 p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 text-sm">
          Антифрод-система отметила вашу сессию как <b>{screenScore.decision}</b> при входе в
          мессенджер (score {screenScore.score.toFixed(1)}).
        </div>
      )}

      <div className="grid grid-cols-3 gap-4 h-[70vh]">
        <aside className="col-span-1 bg-white border border-slate-200 rounded-xl overflow-y-auto">
          <div className="px-3 py-2 border-b text-sm font-medium">Диалоги</div>
          <ul>
            {users
              .filter((u) => u.id !== user.id)
              .map((u) => {
                const thread = threads.find((t) => t.peer_id === u.id);
                return (
                  <li key={u.id}>
                    <button
                      type="button"
                      onClick={() => setPeerId(u.id)}
                      className={`w-full text-left px-3 py-2 hover:bg-slate-50 ${
                        peerId === u.id ? "bg-slate-100" : ""
                      }`}
                    >
                      <div className="font-medium text-sm">{u.full_name}</div>
                      <div className="text-xs text-slate-500 truncate">
                        {thread?.last_text ?? "Нет сообщений"}
                      </div>
                    </button>
                  </li>
                );
              })}
          </ul>
        </aside>

        <section className="col-span-2 bg-white border border-slate-200 rounded-xl flex flex-col">
          {peerId === null ? (
            <div className="flex-1 flex items-center justify-center text-slate-400 text-sm">
              Выберите собеседника
            </div>
          ) : (
            <>
              <div className="px-4 py-2 border-b font-medium text-sm">
                {peerName(peerId)}
              </div>
              <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
                {messages.map((m) => {
                  const mine = m.sender_id === user.id;
                  const dec = (m.antifraud_decision ?? "safe") as Decision;
                  return (
                    <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                      <div
                        className={`max-w-[70%] rounded-2xl px-3 py-2 text-sm border-l-4 ${
                          mine
                            ? "bg-bank text-white border-l-transparent"
                            : `bg-slate-100 ${BORDERS[dec]}`
                        }`}
                      >
                        <div>{m.text}</div>
                        <div className="text-[10px] opacity-70 mt-1 flex gap-2">
                          <span>{new Date(m.created_at).toLocaleTimeString("ru-RU")}</span>
                          {!mine && dec !== "safe" && (
                            <span className="font-semibold">⚠ {dec}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
                <div ref={listEnd} />
              </div>
              <div className="border-t p-3 space-y-2">
                {blockedNotice && (
                  <div className="p-2 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs">
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
                    className="flex-1 border rounded-lg px-3 py-2 text-sm"
                  />
                  <button
                    type="button"
                    onClick={send}
                    disabled={busy || !text.trim()}
                    className="bg-bank text-white px-4 rounded-lg disabled:opacity-50 hover:bg-bank-dark"
                  >
                    {busy ? "..." : "Отправить"}
                  </button>
                </div>
              </div>
            </>
          )}
        </section>
      </div>

      {lastResult && (
        <div className="mt-4">
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
