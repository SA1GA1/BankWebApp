import { useNavigate } from "react-router-dom";
import { LogOut, Search } from "lucide-react";
import { useSession } from "../store/session";

function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/);
  return (parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "");
}

export default function MobileTopBar() {
  const { user, setUser } = useSession();
  const navigate = useNavigate();
  if (!user) return null;

  return (
    <header className="mobile-top-bar">
      <div className="top-bar-content">
        <label className="search-wrapper">
          <Search className="search-icon" strokeWidth={2} />
          <input
            type="text"
            placeholder="Поиск"
            className="search-input"
          />
        </label>
        <div className="user-actions">
          <div className="user-avatar-small">
            {initialsOf(user.full_name)}
          </div>
          <button
            type="button"
            className="logout-btn"
            title="Выйти"
            onClick={() => {
              setUser(null);
              navigate("/login");
            }}
          >
            <LogOut className="w-4 h-4" strokeWidth={1.75} />
          </button>
        </div>
      </div>
    </header>
  );
}
