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
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
      <div
        className={`max-w-md w-full rounded-xl bg-white shadow-xl border ${
          isBlocked ? "border-red-300" : "border-slate-200"
        }`}
      >
        <div
          className={`px-5 py-4 border-b ${
            isBlocked ? "bg-red-50 border-red-100" : "bg-slate-50 border-slate-100"
          }`}
        >
          <h2 className="font-semibold">
            {isBlocked && "Операция заблокирована антифродом"}
            {mode === "phrase" && "Введите кодовую фразу"}
            {mode === "sms" && "Введите код из SMS"}
          </h2>
          <p className="text-xs text-slate-600 mt-1">
            score = {score.toFixed(1)}, decision = {decision}
          </p>
        </div>
        <div className="px-5 py-4 space-y-3">
          {reasons.length > 0 && (
            <details className="text-xs text-slate-600">
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
                className="w-full border rounded-lg px-3 py-2 text-base"
                autoFocus
              />
              {error && <p className="text-xs text-red-600">{error}</p>}
            </>
          )}
        </div>
        <div className="px-5 py-3 flex justify-end gap-2 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-2 text-sm text-slate-600 hover:text-slate-900"
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
              className="px-4 py-2 text-sm bg-bank text-white rounded-lg disabled:opacity-50 hover:bg-bank-dark"
            >
              {submitting ? "..." : "Подтвердить"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
