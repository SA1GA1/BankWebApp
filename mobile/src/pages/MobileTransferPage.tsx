import { useEffect, useMemo, useState } from "react";
import { ArrowRight, ArrowRightLeft } from "lucide-react";
import { api } from "../api/client";
import { useSession } from "../store/session";
import { useFingerprint } from "../hooks/useFingerprint";
import type { Decision, Merchant, ScoreResult, TransferResponse } from "../types";

type Mode = "p2p" | "merchant";

// Mock merchants for mobile
const MOCK_MERCHANTS: Merchant[] = [
  { id: 1, name: "Ozon.ru", site: "ozon.ru", category: "marketplace", is_known_suspicious: 0 },
  { id: 2, name: "Wildberries.ru", site: "wildberries.ru", category: "marketplace", is_known_suspicious: 0 },
  { id: 3, name: "Yandex.Market", site: "market.yandex.ru", category: "marketplace", is_known_suspicious: 0 },
  { id: 4, name: "AliExpress Russia", site: "aliexpress.ru", category: "marketplace", is_known_suspicious: 0 },
];

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
  const [showMerchantPicker, setShowMerchantPicker] = useState(false);

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
          Антифрод-система отметила сессию как <b>{screenScore.decision}</b> (score {screenScore.score.toFixed(1)})
        </div>
      )}

      {/* Mode selector */}
      <div className="mobile-segmented-control" style={{ marginBottom: '12px' }}>
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

      {/* Main transfer card */}
      <div className="mobile-card">
        <div className="mobile-card-body">
          {mode === "p2p" ? (
            <>
              <div className="mobile-input-row">
                <input
                  type="text"
                  value={toAccount}
                  onChange={(e) => setToAccount(e.target.value)}
                  placeholder="Счёт получателя"
                  className="mobile-input-full"
                  style={{ flex: 1 }}
                />
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={busy}
                  className="mobile-icon-btn"
                >
                  <ArrowRight size={20} />
                </button>
              </div>
              
              <div className="mobile-grid-2" style={{ marginTop: '12px' }}>
                <div>
                  <label className="mobile-label">Имя получателя</label>
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
            <>
              <div>
                <label className="mobile-label">Магазин</label>
                <button
                  type="button"
                  onClick={() => setShowMerchantPicker(!showMerchantPicker)}
                  className="mobile-input-full"
                  style={{ textAlign: 'left', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                >
                  {merchant ? merchant.name : "Выбрать магазин"}
                  <ArrowRight size={16} style={{ transform: 'rotate(90deg)' }} />
                </button>
                
                {showMerchantPicker && (
                  <ul className="mobile-list" style={{ marginTop: '8px', maxHeight: '200px', overflowY: 'auto' }}>
                    {MOCK_MERCHANTS.map((m) => (
                      <li
                        key={m.id}
                        className={`mobile-list-item ${merchant?.id === m.id ? 'active' : ''}`}
                        onClick={() => {
                          setMerchant(m);
                          setShowMerchantPicker(false);
                        }}
                        style={{ cursor: 'pointer' }}
                      >
                        <div className="mobile-list-content">
                          <div className="mobile-list-title">{m.name}</div>
                          <div className="mobile-list-subtitle">{m.site}</div>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <div style={{ marginTop: '12px' }}>
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
            </>
          )}

          <button
            type="button"
            onClick={handleSubmit}
            disabled={busy}
            className="mobile-btn-primary"
            style={{ marginTop: '16px' }}
          >
            {busy ? (
              "Проверка..."
            ) : (
              <>
                <ArrowRightLeft size={18} />
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
      </div>

      {/* Last result */}
      {lastResult && (
        <div className="mobile-card mobile-card-body" style={{ marginTop: '12px' }}>
          <div className="mobile-section-title">Результат проверки</div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '14px', fontWeight: '500' }}>
              Score: {lastResult.score.toFixed(1)}
            </span>
            <span
              style={{
                padding: '4px 12px',
                borderRadius: '999px',
                fontSize: '12px',
                fontWeight: '500',
                background: lastResult.decision === 'safe' ? '#ecfdf5' : lastResult.decision === 'review' ? '#fffbeb' : '#fef2f2',
                color: lastResult.decision === 'safe' ? '#059669' : lastResult.decision === 'review' ? '#92400e' : '#b91c1c',
              }}
            >
              {lastResult.decision}
            </span>
          </div>
          {lastResult.reasons.length > 0 && (
            <ul style={{ marginTop: '8px', paddingLeft: '16px', fontSize: '12px', color: '#64748b' }}>
              {lastResult.reasons.map((r, i) => (
                <li key={i}>{r}</li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* Challenge Modal */}
      {pending && pending.status === "challenge" && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'grid',
          placeItems: 'center',
          zIndex: 1000,
        }}>
          <div className="mobile-card" style={{ width: '90%', maxWidth: '400px', padding: '20px' }}>
            <h3 className="mobile-card-title" style={{ marginBottom: '8px' }}>Подтверждение</h3>
            <p style={{ fontSize: '13px', color: '#64748b', marginBottom: '16px' }}>
              Введите кодовую фразу для подтверждения перевода
            </p>
            <input
              type="text"
              placeholder="Кодовая фраза"
              className="mobile-input-full"
              style={{ marginBottom: '12px' }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && pending.pending_id) {
                  handleConfirm((e.target as HTMLInputElement).value);
                }
              }}
            />
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={() => setPending(null)}
                style={{
                  flex: 1,
                  padding: '12px',
                  borderRadius: '12px',
                  border: '1px solid #e2e8f0',
                  background: 'white',
                  fontSize: '14px',
                  cursor: 'pointer',
                }}
              >
                Отмена
              </button>
              <button
                onClick={() => {
                  const input = document.querySelector('input[placeholder="Кодовая фраза"]') as HTMLInputElement;
                  if (input && pending.pending_id) handleConfirm(input.value);
                }}
                className="mobile-btn-primary"
                style={{ flex: 1 }}
              >
                Подтвердить
              </button>
            </div>
          </div>
        </div>
      )}

      {pending && pending.status === "blocked" && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'grid',
          placeItems: 'center',
          zIndex: 1000,
        }}>
          <div className="mobile-card" style={{ width: '90%', maxWidth: '400px', padding: '20px' }}>
            <h3 className="mobile-card-title" style={{ color: '#b91c1c', marginBottom: '8px' }}>Перевод заблокирован</h3>
            <p style={{ fontSize: '13px', color: '#64748b', marginBottom: '16px' }}>
              Антифрод-система заблокировала эту операцию
            </p>
            <button
              onClick={() => setPending(null)}
              className="mobile-btn-primary"
            >
              Закрыть
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
