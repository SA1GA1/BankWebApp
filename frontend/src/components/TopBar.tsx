import { useNavigate } from "react-router-dom";
import { LogOut, Search } from "lucide-react";
import { useSession } from "../store/session";

function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/);
  return (parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "");
}

export default function TopBar() {
  const { user, setUser } = useSession();
  const navigate = useNavigate();
  if (!user) return null;

  return (
    <header className="bg-white border-b border-bank-border sticky top-0 z-20">
      <div className="h-16 px-6 flex items-center gap-6">
        <div className="flex-1 max-w-2xl">
          <label className="relative block">
            <Search
              className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-bank-muted"
              strokeWidth={2}
            />
            <input
              type="text"
              placeholder="Поиск"
              className="w-full bg-bank-bg border border-transparent focus:bg-white focus:border-bank-accent focus:ring-2 focus:ring-bank-accent/20 rounded-full pl-9 pr-4 py-2 text-sm outline-none transition"
            />
          </label>
        </div>
        <div className="ml-auto flex items-center gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-full bg-bank-accent-soft text-bank-accent grid place-items-center text-sm font-semibold">
              {initialsOf(user.full_name)}
            </div>
            <span className="text-sm text-slate-700 hidden sm:block">
              {user.full_name.split(" ")[0]}
            </span>
          </div>
          <button
            type="button"
            className="p-2 rounded-full text-bank-muted hover:text-bank-primary hover:bg-bank-bg transition"
            title="Выйти"
            onClick={() => {
              setUser(null);
              navigate("/login");
            }}
          >
            <LogOut className="w-5 h-5" strokeWidth={1.75} />
          </button>
        </div>
      </div>
    </header>
  );
}
