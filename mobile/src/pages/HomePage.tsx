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
  }, [user?.id]);

  if (!user) return null;

  const balance = detail?.balance ?? user.balance;
  const transactions = detail?.transactions ?? [];

  return (
    <div className="px-4 py-4 space-y-3">
      {/* Wallet Card */}
      <div className="bg-gradient-to-br from-bank-primary to-bank-primary-dark text-white rounded-2xl p-4 shadow-card">
        <div className="text-xs text-white/70 mb-1">Баланс</div>
        <div className="text-2xl font-bold mb-3">
          {balance.toLocaleString("ru-RU")} ₽
        </div>
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm font-medium">{user.full_name}</div>
            <div className="text-xs text-white/70 font-mono mt-0.5">
              {user.account_number}
            </div>
          </div>
          <div className="w-10 h-10 rounded-full bg-white/20 grid place-items-center">
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M4 4h16v16H4z" opacity="0.3" />
            </svg>
          </div>
        </div>
      </div>

      {/* Promo Banner */}
      <div className="bg-gradient-to-r from-amber-100 to-orange-100 border border-amber-200 rounded-xl p-3">
        <div className="text-xs font-semibold text-amber-900">Кэшбэк 5%</div>
        <div className="text-[10px] text-amber-800 mt-0.5">
          На категории «Кафе» и «Такси» в этом месяце
        </div>
      </div>

      {/* History */}
      <section className="bg-white rounded-2xl border border-bank-border shadow-card overflow-hidden">
        <div className="px-4 py-3 flex items-center justify-between border-b border-bank-border">
          <h2 className="font-semibold text-bank-primary text-sm">История</h2>
          <button className="text-xs text-bank-accent hover:underline">Все</button>
        </div>
        {error && (
          <div className="m-4 p-3 rounded-lg bg-red-50 text-red-700 text-xs">{error}</div>
        )}
        <ul className="divide-y divide-bank-border">
          {transactions.map((tx) => {
            const Icon = txIcon(tx.kind);
            const positive = tx.amount > 0;
            return (
              <li key={tx.id} className="px-4 py-3 flex items-center gap-3">
                <div
                  className={`w-9 h-9 rounded-full grid place-items-center shrink-0 ${
                    positive
                      ? "bg-emerald-50 text-emerald-600"
                      : "bg-bank-accent-soft text-bank-accent"
                  }`}
                >
                  <Icon className="w-4 h-4" strokeWidth={1.75} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-bank-primary truncate text-sm">
                    {tx.counterparty ?? "Операция"}
                  </div>
                  <div className="text-[10px] text-bank-muted mt-0.5 truncate">
                    {tx.description ?? tx.kind} ·{" "}
                    {new Date(tx.created_at).toLocaleDateString("ru-RU")}
                  </div>
                </div>
                <div
                  className={`font-semibold text-sm tabular-nums ${
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
            <li className="px-4 py-6 text-center text-xs text-bank-muted">
              Пока пусто
            </li>
          )}
        </ul>
      </section>
    </div>
  );
}
