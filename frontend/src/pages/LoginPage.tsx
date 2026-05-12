import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api/client";
import { useSession } from "../store/session";
import type { User } from "../types";

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
    <div className="max-w-2xl mx-auto px-4 py-10">
      <h1 className="text-2xl font-bold text-bank-dark mb-2">DemoBank</h1>
      <p className="text-slate-600 mb-6">Выберите клиента для входа в демо-кабинет.</p>
      {error && (
        <div className="mb-4 p-3 rounded bg-red-50 text-red-700 text-sm">
          Не удалось загрузить пользователей: {error}
        </div>
      )}
      <ul className="space-y-2">
        {users.map((u) => (
          <li key={u.id}>
            <button
              type="button"
              className="w-full text-left bg-white border border-slate-200 hover:border-bank rounded-lg px-4 py-3 transition"
              onClick={() => {
                setUser(u);
                navigate("/home");
              }}
            >
              <div className="flex justify-between items-baseline">
                <span className="font-medium">{u.full_name}</span>
                <span className="text-sm text-slate-500">{u.account_number}</span>
              </div>
              <div className="text-sm text-slate-500 mt-1">
                Баланс: {u.balance.toLocaleString("ru-RU")} ₽
              </div>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
