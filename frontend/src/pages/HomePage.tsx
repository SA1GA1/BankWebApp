import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client";
import { useSession } from "../store/session";
import type { Transaction, User } from "../types";

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
        // обновим баланс в session
        setUser({ ...user, balance: data.balance });
      })
      .catch((e) => setError(String(e)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  if (!user) return null;

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
      <section className="bg-gradient-to-br from-bank to-bank-dark text-white rounded-2xl p-6 shadow">
        <p className="text-sm opacity-80">Баланс</p>
        <p className="text-4xl font-bold mt-1">
          {(detail?.balance ?? user.balance).toLocaleString("ru-RU")} ₽
        </p>
        <p className="text-sm opacity-80 mt-3">
          Счёт: <span className="font-mono">{user.account_number}</span>
        </p>
      </section>

      <section className="grid grid-cols-2 gap-3">
        <Link
          to="/transfer"
          className="block bg-white border border-slate-200 hover:border-bank rounded-xl p-4"
        >
          <div className="font-semibold">Перевести</div>
          <p className="text-sm text-slate-500 mt-1">
            По реквизитам или интернет-магазину
          </p>
        </Link>
        <Link
          to="/messenger"
          className="block bg-white border border-slate-200 hover:border-bank rounded-xl p-4"
        >
          <div className="font-semibold">Сообщения</div>
          <p className="text-sm text-slate-500 mt-1">Чат с другими клиентами</p>
        </Link>
      </section>

      <section>
        <h2 className="font-semibold mb-3">Последние операции</h2>
        {error && (
          <div className="p-3 rounded bg-red-50 text-red-700 text-sm">{error}</div>
        )}
        <ul className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100">
          {(detail?.transactions ?? []).map((tx) => (
            <li key={tx.id} className="px-4 py-3 flex items-center justify-between">
              <div>
                <div className="font-medium">{tx.counterparty ?? "—"}</div>
                <div className="text-xs text-slate-500">
                  {tx.description ?? tx.kind} · {new Date(tx.created_at).toLocaleString("ru-RU")}
                </div>
              </div>
              <div
                className={`font-semibold ${
                  tx.amount < 0 ? "text-slate-800" : "text-emerald-700"
                }`}
              >
                {tx.amount > 0 ? "+" : ""}
                {tx.amount.toLocaleString("ru-RU")} ₽
              </div>
            </li>
          ))}
          {(detail?.transactions ?? []).length === 0 && (
            <li className="px-4 py-6 text-center text-sm text-slate-500">Пока пусто</li>
          )}
        </ul>
      </section>
    </div>
  );
}
