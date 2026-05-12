import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronRight, ShieldCheck } from "lucide-react";
import { api } from "../api/client";
import { useSession } from "../store/session";
import type { User as UserType } from "../types";

function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase();
}

export default function MobileLoginPage() {
  const { setUser } = useSession();
  const navigate = useNavigate();
  const [users, setUsers] = useState<UserType[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .listUsers()
      .then(setUsers)
      .catch((e) => setError(String(e)));
  }, []);

  return (
    <div className="mobile-login-wrapper">
      <div className="mobile-login-screen mobile-login-content">
        <div className="mobile-login-header">
          <div className="mobile-login-logo">
            <div className="mobile-login-logo-icon">DB</div>
            <div className="mobile-login-logo-text">DemoBank</div>
          </div>
          <h1 className="mobile-login-title">
            Демо-банк с антифрод-сервисом
          </h1>
          <p className="mobile-login-description">
            Каждый перевод и сообщение проходят через ML-модель для оценки риска
          </p>
          <div className="mobile-login-security">
            <ShieldCheck size={14} />
            Безопасное демо · данные локальны
          </div>
        </div>

        <div className="mobile-login-form">
          <h2 className="mobile-login-form-title">Выберите профиль</h2>
          <p className="mobile-login-form-subtitle">
            Авторизация без пароля — это демо
          </p>
          
          {error && (
            <div className="mobile-error-notice">
              Не удалось загрузить пользователей: {error}
            </div>
          )}
          
          <ul className="mobile-login-list">
            {users.map((u) => (
              <li key={u.id}>
                <button
                  type="button"
                  className="mobile-login-item"
                  onClick={() => {
                    setUser(u);
                    navigate("/home");
                  }}
                >
                  <div className="mobile-login-avatar">
                    {initialsOf(u.full_name)}
                  </div>
                  <div className="mobile-login-info">
                    <div className="mobile-login-name">{u.full_name}</div>
                    <div className="mobile-login-details">
                      Счёт •• {u.account_number.slice(-4)} ·{" "}
                      {u.balance.toLocaleString("ru-RU")} ₽
                    </div>
                  </div>
                  <ChevronRight className="mobile-login-chevron" />
                </button>
              </li>
            ))}
            {users.length === 0 && !error && (
              <li className="mobile-login-loading">Загрузка...</li>
            )}
          </ul>
        </div>
      </div>
    </div>
  );
}
