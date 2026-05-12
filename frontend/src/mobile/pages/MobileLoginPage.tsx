import { ChevronRight, ShieldCheck } from "lucide-react";
import { api } from "../../api/client";
import { useSession } from "../../store/session";
import type { User } from "../../types";
import { useEffect, useState } from "react";

function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase();
}

export default function MobileLoginPage() {
  const { setUser } = useSession();
  const [users, setUsers] = useState<User[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .listUsers()
      .then(setUsers)
      .catch((e) => setError(String(e)));
  }, []);

  return (
    <div className="mobile-login-wrapper">
      {/* iPhone Frame for login too */}
      <div className="iphone-frame">
        <div className="dynamic-island"></div>
        <div className="phone-screen mobile-login-screen">
          <div className="mobile-login-content">
            {/* Header */}
            <div className="mobile-login-header">
              <div className="mobile-login-logo">
                <div className="mobile-login-logo-icon">DB</div>
                <span className="mobile-login-logo-text">DemoBank</span>
              </div>
              <h1 className="mobile-login-title">
                Демо-банк с подключенным антифрод-сервисом
              </h1>
              <p className="mobile-login-description">
                Каждый перевод и каждое сообщение проходят через ML-модель, которая
                оценивает риск и выбирает реакцию: пропустить, спросить кодовую
                фразу, потребовать SMS или заблокировать.
              </p>
              <div className="mobile-login-security">
                <ShieldCheck className="w-4 h-4" strokeWidth={1.75} />
                <span>Безопасное демо · данные не покидают локальную среду</span>
              </div>
            </div>

            {/* Login Form */}
            <div className="mobile-login-form">
              <h2 className="mobile-login-form-title">Выберите профиль</h2>
              <p className="mobile-login-form-subtitle">
                Авторизация без пароля — это демо. Антифрод подключается на стороне
                банка.
              </p>
              {error && (
                <div className="mobile-error-notice">{error}</div>
              )}
              <ul className="mobile-login-list">
                {users.map((u) => (
                  <li key={u.id}>
                    <button
                      type="button"
                      className="mobile-login-item"
                      onClick={() => {
                        setUser(u);
                        // Navigate handled by parent router
                        window.location.hash = "/home";
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
                      <ChevronRight className="mobile-login-chevron" strokeWidth={1.75} />
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
        <div className="iphone-bezel"></div>
      </div>
    </div>
  );
}
