import { useEffect, useMemo, useState } from "react";
import { ArrowRight, ArrowRightLeft } from "lucide-react";
import { api } from "../../api/client";
import { useSession } from "../../store/session";
import { useFingerprint } from "../../hooks/useFingerprint";
import AntifraudModal from "../../components/AntifraudModal";
import MerchantPicker from "../../components/MerchantPicker";
import ScoreBadge from "../../components/ScoreBadge";
import QuickActionTile from "../../components/QuickActionTile";
import RecipientTile from "../../components/RecipientTile";
import {
  MOCK_QUICK_ACTIONS,
  MOCK_RECENT_RECIPIENTS,
} from "../../mocks/visual";
import type {
  Decision,
  Merchant,
  ScoreResult,
  TransferResponse,
} from "../../types";

type Mode = "p2p" | "merchant";

export default function MobileTransferPage() {
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
    <div className="mobile-page">
      <div className="mobile-page-header">
        <h1 className="mobile-page-title">Платежи</h1>
      </div>

      {screenScore && screenScore.decision !== "safe" && (
        <div className="mobile-warning-notice">
          Антифрод-система при входе на экран отметила сессию как{" "}
          <b>{screenScore.decision}</b> (score{" "}
          {screenScore.score.toFixed(1)}). Будьте внимательны.
        </div>
      )}

      <div className="mobile-content-space-y">
        {/* Быстрые действия - horizontal scroll */}
        <section className="mobile-card mobile-scroll-x">
          <div className="mobile-scroll-content">
            {MOCK_QUICK_ACTIONS.map((action, i) => (
              <QuickActionTile key={i} icon={action.icon} title={action.title} />
            ))}
          </div>
        </section>

        {/* Перевести — основная карточка */}
        <section className="mobile-card">
          <div className="mobile-card-header">
            <h2 className="mobile-card-title">Перевести</h2>
            <div className="mobile-segmented-control">
              <button
                type="button"
                onClick={() => setMode("p2p")}
                className={`segmented-btn ${mode === "p2p" ? "active" : ""}`}
              >
                По реквизитам
              </button>
              <button
                type="button"
                onClick={() => setMode("merchant")}
                className={`segmented-btn ${mode === "merchant" ? "active" : ""}`}
              >
                Интернет-магазин
              </button>
            </div>
          </div>

          <div className="mobile-card-body">
            {mode === "p2p" ? (
              <>
                <div className="mobile-input-row">
                  <input
                    type="text"
                    value={toAccount}
                    onChange={(e) => setToAccount(e.target.value)}
                    placeholder="На DemoBank или в другой банк"
                    className="mobile-input flex-1"
                  />
                  <button
                    type="button"
                    onClick={handleSubmit}
                    disabled={busy}
                    className="mobile-icon-btn"
                    title="Перевести"
                  >
                    <ArrowRight className="w-5 h-5" strokeWidth={2} />
                  </button>
                </div>
                <div className="mobile-grid-2">
                  <div>
                    <label className="mobile-label">
                      Имя получателя (необязательно)
                    </label>
                    <input
                      type="text"
                      value={toName}
                      onChange={(e) => setToName(e.target.value)}
                      placeholder="Иванов Иван"
                      className="mobile-input-full"
                    />
                  </div>
                  <div>
                    <label className="mobile-label">Сумма, ₽</label>
                    <input
                      type="number"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      min={1}
                      placeholder="0"
                      className="mobile-input-full"
                    />
                  </div>
                </div>
              </>
            ) : (
              <div className="mobile-space-y">
                <div>
                  <label className="mobile-label">Магазин</label>
                  <MerchantPicker value={merchant} onChange={setMerchant} />
                </div>
                <div>
                  <label className="mobile-label">Сумма, ₽</label>
                  <input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    min={1}
                    placeholder="0"
                    className="mobile-input-full"
                  />
                </div>
              </div>
            )}

            <button
              type="button"
              onClick={handleSubmit}
              disabled={busy}
              className="mobile-btn-primary"
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
              <div className="mobile-success-notice">{info}</div>
            )}
            {error && (
              <div className="mobile-error-notice">{error}</div>
            )}
          </div>
        </section>

        {/* Получатели - horizontal scroll */}
        <section className="mobile-scroll-x">
          <div className="mobile-scroll-content">
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
            <h3 className="mobile-section-title">
              Результат последней проверки
            </h3>
            <ScoreBadge
              score={lastResult.score}
              decision={lastResult.decision as Decision}
              reasons={lastResult.reasons}
            />
          </div>
        )}
      </div>

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
