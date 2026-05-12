import { useEffect, useMemo, useState } from "react";
import { api } from "../api/client";
import { useSession } from "../store/session";
import { useFingerprint } from "../hooks/useFingerprint";
import AntifraudModal from "../components/AntifraudModal";
import MerchantPicker from "../components/MerchantPicker";
import ScoreBadge from "../components/ScoreBadge";
import type { Decision, Merchant, ScoreResult, TransferResponse } from "../types";

type Mode = "p2p" | "merchant";

export default function TransferPage() {
  const { user } = useSession();
  const collectSignals = useFingerprint();
  const [mode, setMode] = useState<Mode>("p2p");
  const [toAccount, setToAccount] = useState("");
  const [toName, setToName] = useState("");
  const [merchant, setMerchant] = useState<Merchant | null>(null);
  const [amount, setAmount] = useState("");
  const [screenScore, setScreenScore] = useState<ScoreResult | null>(null);
  const [lastResult, setLastResult] = useState<ScoreResult | null>(null);
  const [pending, setPending] = useState<TransferResponse | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // screen-entry проверка при mount
  useEffect(() => {
    if (!user) return;
    (async () => {
      const signals = await collectSignals();
      try {
        const res = await api.screenEntry({
          user_id: user.id,
          screen: "transfer",
          signals,
        });
        setScreenScore(res);
      } catch (e) {
        console.warn("screen-entry failed", e);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const amountNumber = useMemo(() => Number(amount.replace(",", ".")) || 0, [amount]);

  const handleSubmit = async () => {
    if (!user) return;
    setError(null);
    setInfo(null);
    setLastResult(null);
    if (amountNumber <= 0) {
      setError("Введите сумму больше нуля");
      return;
    }
    if (mode === "p2p" && !toAccount.trim()) {
      setError("Укажите номер счёта получателя");
      return;
    }
    if (mode === "merchant" && !merchant) {
      setError("Выберите интернет-магазин");
      return;
    }
    setBusy(true);
    try {
      const signals = await collectSignals();
      const res = await api.transfer({
        from_user_id: user.id,
        mode,
        amount: amountNumber,
        to_account: mode === "p2p" ? toAccount.trim() : undefined,
        to_name: mode === "p2p" ? toName.trim() || undefined : undefined,
        merchant_site: mode === "merchant" ? merchant!.site : undefined,
        signals,
      });
      setLastResult({ score: res.score, decision: res.decision, reasons: res.reasons });
      if (res.status === "ok") {
        setInfo(`Перевод выполнен. ID транзакции: ${res.transaction_id}`);
        setAmount("");
      } else if (res.status === "challenge" || res.status === "blocked") {
        setPending(res);
      }
    } catch (e) {
      setError(String(e));
    } finally {
      setBusy(false);
    }
  };

  const handleConfirm = async (code: string) => {
    if (!pending?.pending_id) return;
    const res = await api.confirmTransfer(pending.pending_id, code);
    setLastResult({ score: res.score, decision: res.decision, reasons: res.reasons });
    setInfo(`Перевод выполнен после подтверждения. ID транзакции: ${res.transaction_id}`);
    setPending(null);
    setAmount("");
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-5">
      <h1 className="text-xl font-bold text-bank-dark">Перевод</h1>

      {screenScore && screenScore.decision !== "safe" && (
        <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 text-sm">
          Антифрод-система при входе на экран отметила сессию как{" "}
          <b>{screenScore.decision}</b> (score {screenScore.score.toFixed(1)}). Будьте внимательны.
        </div>
      )}

      <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
        <div className="flex gap-3">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="radio"
              checked={mode === "p2p"}
              onChange={() => setMode("p2p")}
            />
            По реквизитам
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="radio"
              checked={mode === "merchant"}
              onChange={() => setMode("merchant")}
            />
            Интернет-магазин
          </label>
        </div>

        {mode === "p2p" ? (
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium mb-1">Номер счёта</label>
              <input
                type="text"
                value={toAccount}
                onChange={(e) => setToAccount(e.target.value)}
                placeholder="40817..."
                className="w-full border rounded-lg px-3 py-2 font-mono"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Имя получателя (необязательно)</label>
              <input
                type="text"
                value={toName}
                onChange={(e) => setToName(e.target.value)}
                placeholder="Иванов Иван"
                className="w-full border rounded-lg px-3 py-2"
              />
            </div>
          </div>
        ) : (
          <div>
            <label className="block text-sm font-medium mb-1">Магазин</label>
            <MerchantPicker value={merchant} onChange={setMerchant} />
          </div>
        )}

        <div>
          <label className="block text-sm font-medium mb-1">Сумма (₽)</label>
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            min={1}
            className="w-full border rounded-lg px-3 py-2"
          />
        </div>

        <button
          type="button"
          onClick={handleSubmit}
          disabled={busy}
          className="w-full bg-bank text-white rounded-lg py-2.5 font-medium hover:bg-bank-dark disabled:opacity-50"
        >
          {busy ? "Проверка..." : "Перевести"}
        </button>

        {info && (
          <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm">
            {info}
          </div>
        )}
        {error && (
          <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
            {error}
          </div>
        )}
      </div>

      {lastResult && (
        <div>
          <h3 className="text-sm font-medium text-slate-600 mb-2">Результат последней проверки</h3>
          <ScoreBadge
            score={lastResult.score}
            decision={lastResult.decision as Decision}
            reasons={lastResult.reasons}
          />
        </div>
      )}

      {pending && pending.status === "challenge" && pending.challenge && (
        <AntifraudModal
          mode={pending.challenge}
          score={pending.score}
          decision={pending.decision}
          reasons={pending.reasons}
          onSubmit={handleConfirm}
          onClose={() => setPending(null)}
        />
      )}
      {pending && pending.status === "blocked" && (
        <AntifraudModal
          mode="blocked"
          score={pending.score}
          decision={pending.decision}
          reasons={pending.reasons}
          onClose={() => setPending(null)}
        />
      )}
    </div>
  );
}
