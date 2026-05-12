import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronRight, ShieldCheck } from "lucide-react";
import { api } from "../api/client";
import { useSession } from "../store/session";
import type { User } from "../types";

function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase();
}

export default function LoginPage() {
  const { setUser } = useSession();
  const navigate = useNavigate();
  const [users, setUsers] = useState<User[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .listUsers()
      .then(setUsers)
      .catch((e) => setError(String(e)));
  }, []);

  return (
    <div className="h-full flex flex-col bg-bank-bg">
      <div className="bg-bank-primary text-white px-6 py-8 pb-12">
        <div className="flex items-center gap-2 mb-6">
          <div className="w-9 h-9 rounded-xl bg-white text-bank-primary grid place-items-center font-bold text-sm">
            DB
          </div>
          <div className="font-semibold text-lg tracking-tight">DemoBank</div>
        </div>
        <h1 className="text-2xl font-bold leading-tight">
          Демо-банк с антифродом
        </h1>
        <p className="mt-2 text-xs text-white/70 leading-relaxed">
          Переводы и сообщения проходят через ML-модель
        </p>
      </div>

      <div className="flex-1 px-4 py-6 -mt-6">
        <div className="bg-white rounded-2xl shadow-card p-4">
          <h2 className="text-lg font-bold text-bank-primary mb-1">
            Выберите профиль
          </h2>
          <p className="text-xs text-bank-muted mb-4">
            Авторизация без пароля — это демо
          </p>
          {error && (
            <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs">
              Ошибка: {error}
            </div>
          )}
          <ul className="space-y-2">
            {users.map((u) => (
              <li key={u.id}>
                <button
                  type="button"
                  className="w-full bg-bank-bg border border-bank-border hover:border-bank-accent rounded-xl px-3 py-3 transition flex items-center gap-3 text-left"
                  onClick={() => {
                    setUser(u);
                    navigate("/home");
                  }}
                >
                  <div className="w-10 h-10 rounded-full bg-bank-accent-soft text-bank-accent grid place-items-center text-sm font-semibold shrink-0">
                    {initialsOf(u.full_name)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-bank-primary truncate text-sm">
                      {u.full_name}
                    </div>
                    <div className="text-xs text-bank-muted mt-0.5 truncate">
                      Счёт •• {u.account_number.slice(-4)} ·{" "}
                      {u.balance.toLocaleString("ru-RU")} ₽
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-bank-muted shrink-0" strokeWidth={1.75} />
                </button>
              </li>
            ))}
            {users.length === 0 && !error && (
              <li className="text-xs text-bank-muted text-center py-4">
                Загрузка...
              </li>
            )}
          </ul>
        </div>
        <div className="mt-4 flex items-center gap-2 text-xs text-bank-muted justify-center">
          <ShieldCheck className="w-4 h-4" strokeWidth={1.75} />
          Безопасное демо · данные локальны
        </div>
      </div>
    </div>
  );
}
