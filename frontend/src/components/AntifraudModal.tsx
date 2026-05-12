import { useEffect, useState } from "react";
import type { Decision } from "../types";

interface Props {
  mode: "phrase" | "sms" | "blocked";
  score: number;
  decision: Decision;
  reasons: string[];
  onSubmit?: (code: string) => Promise<void> | void;
  onClose: () => void;
}

export default function AntifraudModal({ mode, score, decision, reasons, onSubmit, onClose }: Props) {
  const [code, setCode] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setCode("");
    setError(null);
  }, [mode]);

  const isBlocked = mode === "blocked";

  return (
    <div className="fixed inset-0 z-50 bg-bank-primary/50 backdrop-blur-sm flex items-center justify-center p-4">
      <div
        className={`max-w-md w-full rounded-2xl bg-white shadow-2xl border ${
          isBlocked ? "border-red-300" : "border-bank-border"
        }`}
      >
        <div
          className={`px-5 py-4 border-b rounded-t-2xl ${
            isBlocked
              ? "bg-red-50 border-red-100"
              : "bg-bank-accent-soft border-bank-border"
          }`}
        >
          <h2 className={`font-semibold ${isBlocked ? "text-red-800" : "text-bank-primary"}`}>
            {isBlocked && "Операция заблокирована антифродом"}
            {mode === "phrase" && "Введите кодовую фразу"}
            {mode === "sms" && "Введите код из SMS"}
          </h2>
          <p className={`text-xs mt-1 ${isBlocked ? "text-red-700" : "text-bank-muted"}`}>
            score = {score.toFixed(1)}, decision = {decision}
          </p>
        </div>
        <div className="px-5 py-4 space-y-3">
          {reasons.length > 0 && (
            <details className="text-xs text-bank-muted">
              <summary className="cursor-pointer">Причины ({reasons.length})</summary>
              <ul className="list-disc list-inside mt-2 space-y-0.5">
                {reasons.map((r) => (
                  <li key={r}>{r}</li>
                ))}
              </ul>
            </details>
          )}
          {!isBlocked && (
            <>
              <p className="text-sm text-slate-700">
                {mode === "phrase"
                  ? "Антифрод-система отметила операцию как сомнительную. Введите вашу секретную кодовую фразу, чтобы подтвердить перевод."
                  : "Мы отправили SMS с кодом на ваш телефон. Введите 4 цифры из сообщения (для демо подойдут любые цифры)."}
              </p>
              <input
                type={mode === "sms" ? "tel" : "text"}
                inputMode={mode === "sms" ? "numeric" : "text"}
                maxLength={mode === "sms" ? 4 : undefined}
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder={mode === "sms" ? "1234" : "Кодовая фраза"}
                className="w-full bg-bank-bg border border-transparent focus:bg-white focus:border-bank-accent focus:ring-2 focus:ring-bank-accent/20 rounded-xl px-3 py-2.5 text-base outline-none transition"
                autoFocus
              />
              {error && <p className="text-xs text-red-600">{error}</p>}
            </>
          )}
        </div>
        <div className="px-5 py-3 flex justify-end gap-2 border-t border-bank-border">
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-2 text-sm text-bank-muted hover:text-bank-primary transition"
          >
            {isBlocked ? "Закрыть" : "Отмена"}
          </button>
          {!isBlocked && (
            <button
              type="button"
              disabled={submitting || !code.trim()}
              onClick={async () => {
                if (!onSubmit) return;
                setSubmitting(true);
                setError(null);
                try {
                  await onSubmit(code.trim());
                } catch (e) {
                  setError(String(e));
                } finally {
                  setSubmitting(false);
                }
              }}
              className="px-4 py-2 text-sm bg-bank-accent text-white rounded-xl disabled:opacity-50 hover:bg-bank-primary transition"
            >
              {submitting ? "..." : "Подтвердить"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
