import { useEffect, useRef, useState } from "react";
import { Send, ArrowLeft } from "lucide-react";
import { api } from "../api/client";
import { useSession } from "../store/session";
import { useFingerprint } from "../hooks/useFingerprint";
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

export default function MobileMessengerPage() {
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
  }, [user?.id]);

  useEffect(() => {
    if (!user || !peerId) return;
    api.messages(user.id, peerId).then(setMessages);
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

  // Chat view
  if (peerId !== null) {
    return (
      <div className="mobile-chat-container">
        {/* Chat Header */}
        <div className="mobile-chat-header">
          <button
            type="button"
            onClick={() => setPeerId(null)}
            className="mobile-back-btn"
          >
            <ArrowLeft size={18} />
          </button>
          <div className="mobile-avatar active">
            {initialsOf(peerName(peerId))}
          </div>
          <div className="mobile-chat-peer-name">{peerName(peerId)}</div>
        </div>

        {/* Messages */}
        <div className="mobile-chat-messages">
          {messages.map((m) => {
            const mine = m.sender_id === user.id;
            const dec = (m.antifraud_decision ?? "safe") as Decision;
            return (
              <div
                key={m.id}
                className={`mobile-message ${mine ? "mine" : "theirs"}`}
              >
                <div
                  className={`mobile-message-bubble ${mine ? "mine" : "theirs"} ${PEER_BUBBLE_BORDER[dec]}`}
                >
                  <div className="mobile-message-text">{m.text}</div>
                  <div className={`mobile-message-time ${mine ? "mine" : "theirs"}`}>
                    <span>
                      {new Date(m.created_at).toLocaleTimeString("ru-RU")}
                    </span>
                    {!mine && dec !== "safe" && (
                      <span className="mobile-message-warning">
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

        {/* Input Area */}
        <div className="mobile-chat-input-area">
          {blockedNotice && (
            <div className="mobile-error-notice" style={{ marginBottom: '8px' }}>
              Сообщение заблокировано (score {blockedNotice.score.toFixed(1)})
            </div>
          )}
          <div className="mobile-input-row">
            <input
              type="text"
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  send();
                }
              }}
              placeholder="Сообщение..."
              className="mobile-input-full"
              style={{ flex: 1 }}
            />
            <button
              type="button"
              onClick={send}
              disabled={busy || !text.trim()}
              className="mobile-send-btn"
            >
              <Send size={20} />
            </button>
          </div>
        </div>

        {/* Last result badge */}
        {lastResult && (
          <div className="mobile-score-result">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '12px', color: '#64748b' }}>
                Score: {lastResult.score.toFixed(1)}
              </span>
              <span
                style={{
                  padding: '2px 8px',
                  borderRadius: '999px',
                  fontSize: '10px',
                  fontWeight: '500',
                  background: lastResult.decision === 'safe' ? '#ecfdf5' : lastResult.decision === 'review' ? '#fffbeb' : '#fef2f2',
                  color: lastResult.decision === 'safe' ? '#059669' : lastResult.decision === 'review' ? '#92400e' : '#b91c1c',
                }}
              >
                {lastResult.decision}
              </span>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Dialog list view
  return (
    <div className="mobile-page">
      <div className="mobile-page-header">
        <h1 className="mobile-page-title">Сообщения</h1>
      </div>

      {screenScore && screenScore.decision !== "safe" && (
        <div className="mobile-warning-notice">
          Антифрод-система отметила сессию как <b>{screenScore.decision}</b> (score {screenScore.score.toFixed(1)})
        </div>
      )}

      <div className="mobile-card">
        <div className="mobile-card-header">
          <span className="mobile-card-title">Диалоги</span>
        </div>
        <div className="mobile-card-body" style={{ padding: '0' }}>
          <ul className="mobile-list mobile-dialog-list">
            {users
              .filter((u) => u.id !== user.id)
              .map((u) => {
                const thread = threads.find((t) => t.peer_id === u.id);
                const active = peerId === u.id;
                return (
                  <li key={u.id}>
                    <button
                      type="button"
                      className={`mobile-dialog-item ${active ? 'active' : ''}`}
                      onClick={() => setPeerId(u.id)}
                    >
                      {active && <span className="mobile-dialog-indicator" />}
                      <div className={`mobile-avatar ${active ? 'active' : ''}`}>
                        {initialsOf(u.full_name)}
                      </div>
                      <div className="mobile-dialog-content">
                        <div className="mobile-dialog-name">{u.full_name}</div>
                        <div className="mobile-dialog-preview">
                          {thread?.last_text ?? "Нет сообщений"}
                        </div>
                      </div>
                    </button>
                  </li>
                );
              })}
            {users.filter((u) => u.id !== user.id).length === 0 && (
              <li className="mobile-list-empty">Загрузка...</li>
            )}
          </ul>
        </div>
      </div>
    </div>
  );
}
