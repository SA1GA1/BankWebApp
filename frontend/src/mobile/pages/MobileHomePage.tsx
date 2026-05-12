import { useEffect, useState } from "react";
import { ArrowDownLeft, ArrowUpRight, ShoppingBag } from "lucide-react";
import { api } from "../../api/client";
import { useSession } from "../../store/session";
import type { Transaction, User } from "../../types";
import WalletCard from "../../components/WalletCard";
import PromoBanner from "../../components/PromoBanner";

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  if (!user) return null;

  const balance = detail?.balance ?? user.balance;
  const transactions = detail?.transactions ?? [];

  return (
    <div className="mobile-page">
      {/* Page Header - simplified for mobile */}
      <div className="mobile-page-header">
        <h1 className="mobile-page-title">Главная</h1>
      </div>

      <div className="mobile-content-space-y">
        <WalletCard
          fullName={user.full_name}
          accountNumber={user.account_number}
          balance={balance}
        />

        <PromoBanner />

        <section className="mobile-card">
          <div className="mobile-card-header">
            <h2 className="mobile-card-title">История</h2>
            <button className="mobile-card-action">Все</button>
          </div>
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
                      positive ? "positive" : "negative"
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
                      positive ? "positive" : "negative"
                    }`}
                  >
                    {positive ? "+" : ""}
                    {tx.amount.toLocaleString("ru-RU")} ₽
                  </div>
                </li>
              );
            })}
            {transactions.length === 0 && (
              <li className="mobile-list-empty">Пока пусто</li>
            )}
          </ul>
        </section>
      </div>
    </div>
  );
}
