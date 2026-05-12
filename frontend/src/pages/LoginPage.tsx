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
    <div className="min-h-screen flex flex-col md:flex-row">
      <div className="md:flex-1 bg-bank-primary text-white px-8 py-10 md:py-16 md:px-14 flex flex-col justify-between relative overflow-hidden">
        <div className="absolute -right-20 -top-20 w-80 h-80 rounded-full bg-bank-accent/30 blur-3xl pointer-events-none" />
        <div className="absolute -right-32 bottom-0 w-96 h-96 rounded-full bg-bank-accent/20 blur-3xl pointer-events-none" />
        <div className="relative">
          <div className="flex items-center gap-3 mb-12">
            <div className="w-10 h-10 rounded-xl bg-white text-bank-primary grid place-items-center font-bold">
              DB
            </div>
            <div className="font-semibold text-xl tracking-tight">DemoBank</div>
          </div>
          <h1 className="text-3xl md:text-4xl font-bold leading-tight max-w-md">
            Демо-банк с подключенным антифрод-сервисом
          </h1>
          <p className="mt-4 text-sm md:text-base text-white/70 max-w-md leading-relaxed">
            Каждый перевод и каждое сообщение проходят через ML-модель, которая
            оценивает риск и выбирает реакцию: пропустить, спросить кодовую
            фразу, потребовать SMS или заблокировать.
          </p>
        </div>
        <div className="relative flex items-center gap-2 text-xs text-white/60 mt-10">
          <ShieldCheck className="w-4 h-4" strokeWidth={1.75} />
          Безопасное демо · данные не покидают локальную среду
        </div>
      </div>

      <div className="md:flex-1 bg-bank-bg px-6 py-10 md:py-16 md:px-12 flex items-center justify-center">
        <div className="w-full max-w-md">
          <h2 className="text-2xl font-bold text-bank-primary mb-2">
            Выберите профиль
          </h2>
          <p className="text-sm text-bank-muted mb-6">
            Авторизация без пароля — это демо. Антифрод подключается на стороне
            банка.
          </p>
          {error && (
            <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">
              Не удалось загрузить пользователей: {error}
            </div>
          )}
          <ul className="space-y-2">
            {users.map((u) => (
              <li key={u.id}>
                <button
                  type="button"
                  className="w-full bg-white border border-bank-border hover:border-bank-accent hover:shadow-card rounded-2xl px-4 py-3 transition flex items-center gap-3 text-left"
                  onClick={() => {
                    setUser(u);
                    navigate("/home");
                  }}
                >
                  <div className="w-11 h-11 rounded-full bg-bank-accent-soft text-bank-accent grid place-items-center text-sm font-semibold shrink-0">
                    {initialsOf(u.full_name)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-bank-primary truncate">
                      {u.full_name}
                    </div>
                    <div className="text-xs text-bank-muted mt-0.5 truncate">
                      Счёт •• {u.account_number.slice(-4)} ·{" "}
                      {u.balance.toLocaleString("ru-RU")} ₽
                    </div>
                  </div>
                  <ChevronRight
                    className="w-5 h-5 text-bank-muted shrink-0"
                    strokeWidth={1.75}
                  />
                </button>
              </li>
            ))}
            {users.length === 0 && !error && (
              <li className="text-sm text-bank-muted text-center py-6">
                Загрузка...
              </li>
            )}
          </ul>
        </div>
      </div>
    </div>
  );
}
