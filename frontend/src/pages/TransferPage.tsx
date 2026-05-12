import { useEffect, useMemo, useState } from "react";
import { ArrowRight, ArrowRightLeft } from "lucide-react";
import { api } from "../api/client";
import { useSession } from "../store/session";
import { useFingerprint } from "../hooks/useFingerprint";
import AntifraudModal from "../components/AntifraudModal";
import MerchantPicker from "../components/MerchantPicker";
import ScoreBadge from "../components/ScoreBadge";
import PageHeader from "../components/PageHeader";
import QuickActionTile from "../components/QuickActionTile";
import RecipientTile from "../components/RecipientTile";
import {
  MOCK_QUICK_ACTIONS,
  MOCK_RECENT_RECIPIENTS,
} from "../mocks/visual";
import type {
  Decision,
  Merchant,
  ScoreResult,
  TransferResponse,
} from "../types";

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

  const amountNumber = useMemo(
    () => Number(amount.replace(",", ".")) || 0,
    [amount]
  );

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
      setLastResult({
        score: res.score,
        decision: res.decision,
        reasons: res.reasons,
      });
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
    setLastResult({
      score: res.score,
      decision: res.decision,
      reasons: res.reasons,
    });
    setInfo(`Перевод выполнен после подтверждения. ID транзакции: ${res.transaction_id}`);
    setPending(null);
    setAmount("");
  };

  return (
    <div className="max-w-5xl mx-auto px-6 py-6 space-y-5">
      <PageHeader title="Платежи" />

      {screenScore && screenScore.decision !== "safe" && (
        <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-sm">
          Антифрод-система при входе на экран отметила сессию как{" "}
          <b>{screenScore.decision}</b> (score{" "}
          {screenScore.score.toFixed(1)}). Будьте внимательны.
        </div>
      )}

      {/* Быстрые действия */}
      <section className="bg-white rounded-2xl border border-bank-border p-4 shadow-card">
        <div className="flex gap-3 overflow-x-auto pb-1 -mx-1 px-1">
          {MOCK_QUICK_ACTIONS.map((action, i) => (
            <QuickActionTile key={i} icon={action.icon} title={action.title} />
          ))}
        </div>
      </section>

      {/* Перевести — основная карточка */}
      <section className="bg-white rounded-2xl border border-bank-border shadow-card">
        <div className="px-5 py-4 border-b border-bank-border flex items-center justify-between">
          <h2 className="font-semibold text-bank-primary text-lg">Перевести</h2>
          <div className="flex bg-bank-bg rounded-full p-1 text-sm">
            <button
              type="button"
              onClick={() => setMode("p2p")}
              className={`px-3 py-1 rounded-full transition ${
                mode === "p2p"
                  ? "bg-white text-bank-primary shadow-sm font-medium"
                  : "text-bank-muted hover:text-bank-primary"
              }`}
            >
              По реквизитам
            </button>
            <button
              type="button"
              onClick={() => setMode("merchant")}
              className={`px-3 py-1 rounded-full transition ${
                mode === "merchant"
                  ? "bg-white text-bank-primary shadow-sm font-medium"
                  : "text-bank-muted hover:text-bank-primary"
              }`}
            >
              Интернет-магазин
            </button>
          </div>
        </div>

        <div className="p-5 space-y-4">
          {mode === "p2p" ? (
            <>
              <div className="bg-bank-bg rounded-2xl px-4 py-3 flex items-center gap-3">
                <input
                  type="text"
                  value={toAccount}
                  onChange={(e) => setToAccount(e.target.value)}
                  placeholder="На DemoBank или в другой банк"
                  className="flex-1 bg-transparent outline-none placeholder:text-bank-muted text-bank-primary font-mono text-sm"
                />
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={busy}
                  className="w-10 h-10 rounded-full bg-bank-accent text-white grid place-items-center hover:bg-bank-primary disabled:opacity-50 transition"
                  title="Перевести"
                >
                  <ArrowRight className="w-5 h-5" strokeWidth={2} />
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-bank-muted mb-1">
                    Имя получателя (необязательно)
                  </label>
                  <input
                    type="text"
                    value={toName}
                    onChange={(e) => setToName(e.target.value)}
                    placeholder="Иванов Иван"
                    className="w-full bg-bank-bg border border-transparent focus:bg-white focus:border-bank-accent focus:ring-2 focus:ring-bank-accent/20 rounded-xl px-3 py-2.5 text-sm outline-none transition"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-bank-muted mb-1">
                    Сумма, ₽
                  </label>
                  <input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    min={1}
                    placeholder="0"
                    className="w-full bg-bank-bg border border-transparent focus:bg-white focus:border-bank-accent focus:ring-2 focus:ring-bank-accent/20 rounded-xl px-3 py-2.5 text-sm outline-none transition"
                  />
                </div>
              </div>
            </>
          ) : (
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-bank-muted mb-1">
                  Магазин
                </label>
                <MerchantPicker value={merchant} onChange={setMerchant} />
              </div>
              <div>
                <label className="block text-xs font-medium text-bank-muted mb-1">
                  Сумма, ₽
                </label>
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  min={1}
                  placeholder="0"
                  className="w-full bg-bank-bg border border-transparent focus:bg-white focus:border-bank-accent focus:ring-2 focus:ring-bank-accent/20 rounded-xl px-3 py-2.5 text-sm outline-none transition"
                />
              </div>
            </div>
          )}

          <button
            type="button"
            onClick={handleSubmit}
            disabled={busy}
            className="w-full bg-bank-accent text-white rounded-xl py-3 font-medium hover:bg-bank-primary disabled:opacity-50 transition flex items-center justify-center gap-2"
          >
            {busy ? (
              "Проверка..."
            ) : (
              <>
                <ArrowRightLeft className="w-4 h-4" strokeWidth={2} />
                Перевести
              </>
            )}
          </button>

          {info && (
            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm">
              {info}
            </div>
          )}
          {error && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">
              {error}
            </div>
          )}
        </div>
      </section>

      {/* Получатели */}
      <section>
        <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1">
          <RecipientTile variant="between" name="Между своими" />
          <RecipientTile variant="international" name="В другую страну" />
          {MOCK_RECENT_RECIPIENTS.map((r, i) => (
            <RecipientTile
              key={i}
              variant="person"
              initials={r.initials}
              name={r.name}
            />
          ))}
          <RecipientTile variant="templates" name="Шаблоны переводов" />
        </div>
      </section>

      {lastResult && (
        <div>
          <h3 className="text-sm font-medium text-bank-muted mb-2">
            Результат последней проверки
          </h3>
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
