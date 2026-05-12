import { useEffect, useState } from "react";
import { ArrowDownLeft, ArrowUpRight, ShoppingBag } from "lucide-react";
import { api } from "../api/client";
import { useSession } from "../store/session";
import type { Transaction, User } from "../types";

function txIcon(kind: Transaction["kind"]) {
  if (kind === "incoming") return ArrowDownLeft;
  if (kind === "payment") return ShoppingBag;
  return ArrowUpRight;
}

export default function MobileHomePage() {
  const { user, setUser } = useSession();
  const [detail, setDetail] = useState<(User & { transactions: Transaction[] }) | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    api
      .getUser(user.id)
      .then((data) => {
        setDetail(data);
        setUser({ ...user, balance: data.balance });
      })
      .catch((e) => setError(String(e)));
  }, [user?.id]);

  if (!user) return null;

  const balance = detail?.balance ?? user.balance;
  const transactions = detail?.transactions ?? [];

  return (
    <div className="mobile-page">
      <div className="mobile-page-header">
        <h1 className="mobile-page-title">Главная</h1>
      </div>

      {/* Wallet Card */}
      <div className="mobile-card mobile-card-body" style={{ marginBottom: '12px' }}>
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm text-slate-500">Баланс</span>
          <span className="text-xs text-slate-400">{user.account_number}</span>
        </div>
        <div className="text-3xl font-bold text-bank-dark mb-1">
          {balance.toLocaleString("ru-RU")} ₽
        </div>
        <div className="text-sm text-slate-600">{user.full_name}</div>
      </div>

      {/* Promo Banner */}
      <div className="mobile-card mobile-card-body" style={{ marginBottom: '12px', background: 'linear-gradient(135deg, #1d6ff0 0%, #0b2545 100%)', color: 'white' }}>
        <div className="text-sm font-medium mb-1">🎁 Кэшбэк 5%</div>
        <div className="text-xs opacity-80">На покупки в категориях «Кафе» и «Транспорт»</div>
      </div>

      {/* Transactions */}
      <div className="mobile-card">
        <div className="mobile-card-header">
          <span className="mobile-card-title">История</span>
        </div>
        <div className="mobile-card-body" style={{ padding: '0' }}>
          {error && (
            <div className="mobile-error-notice">{error}</div>
          )}
          <ul className="mobile-list">
            {transactions.map((tx) => {
              const Icon = txIcon(tx.kind);
              const positive = tx.amount > 0;
              return (
                <li key={tx.id} className="mobile-list-item">
                  <div
                    className={`mobile-list-icon ${
                      positive ? 'positive' : 'negative'
                    }`}
                  >
                    <Icon className="w-5 h-5" strokeWidth={1.75} />
                  </div>
                  <div className="mobile-list-content">
                    <div className="mobile-list-title">
                      {tx.counterparty ?? "Операция"}
                    </div>
                    <div className="mobile-list-subtitle">
                      {tx.description ?? tx.kind} ·{" "}
                      {new Date(tx.created_at).toLocaleString("ru-RU")}
                    </div>
                  </div>
                  <div
                    className={`mobile-list-amount ${
                      positive ? 'positive' : 'negative'
                    }`}
                  >
                    {positive ? "+" : ""}{tx.amount.toLocaleString("ru-RU")} ₽
                  </div>
                </li>
              );
            })}
            {transactions.length === 0 && (
              <li className="mobile-list-empty">Пока пусто</li>
            )}
          </ul>
        </div>
      </div>
    </div>
  );
}
