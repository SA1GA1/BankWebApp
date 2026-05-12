import { useEffect, useState } from "react";
import { ArrowDownLeft, ArrowUpRight, ShoppingBag } from "lucide-react";
import { api } from "../api/client";
import { useSession } from "../store/session";
import type { Transaction, User } from "../types";
import PageHeader from "../components/PageHeader";
import WalletCard from "../components/WalletCard";
import PromoBanner from "../components/PromoBanner";

function txIcon(kind: Transaction["kind"]) {
  if (kind === "incoming") return ArrowDownLeft;
  if (kind === "payment") return ShoppingBag;
  return ArrowUpRight;
}

export default function HomePage() {
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
    <div className="max-w-5xl mx-auto px-6 py-6 space-y-5">
      <PageHeader title="Главная" />

      <WalletCard
        fullName={user.full_name}
        accountNumber={user.account_number}
        balance={balance}
      />

      <PromoBanner />

      <section className="bg-white rounded-2xl border border-bank-border shadow-card">
        <div className="px-5 py-4 flex items-center justify-between border-b border-bank-border">
          <h2 className="font-semibold text-bank-primary">История</h2>
          <button className="text-sm text-bank-accent hover:underline">Все</button>
        </div>
        {error && (
          <div className="m-5 p-3 rounded-lg bg-red-50 text-red-700 text-sm">{error}</div>
        )}
        <ul className="divide-y divide-bank-border">
          {transactions.map((tx) => {
            const Icon = txIcon(tx.kind);
            const positive = tx.amount > 0;
            return (
              <li
                key={tx.id}
                className="px-5 py-3.5 flex items-center gap-4 hover:bg-bank-bg/60 transition"
              >
                <div
                  className={`w-10 h-10 rounded-full grid place-items-center shrink-0 ${
                    positive
                      ? "bg-emerald-50 text-emerald-600"
                      : "bg-bank-accent-soft text-bank-accent"
                  }`}
                >
                  <Icon className="w-5 h-5" strokeWidth={1.75} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-bank-primary truncate">
                    {tx.counterparty ?? "Операция"}
                  </div>
                  <div className="text-xs text-bank-muted mt-0.5 truncate">
                    {tx.description ?? tx.kind} ·{" "}
                    {new Date(tx.created_at).toLocaleString("ru-RU")}
                  </div>
                </div>
                <div
                  className={`font-semibold tabular-nums ${
                    positive ? "text-emerald-600" : "text-bank-primary"
                  }`}
                >
                  {positive ? "+" : ""}
                  {tx.amount.toLocaleString("ru-RU")} ₽
                </div>
              </li>
            );
          })}
          {transactions.length === 0 && (
            <li className="px-5 py-8 text-center text-sm text-bank-muted">
              Пока пусто
            </li>
          )}
        </ul>
      </section>
    </div>
  );
}
