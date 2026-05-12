import { useNavigate } from "react-router-dom";
import { LogOut } from "lucide-react";
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
    <header className="bg-white border-b border-bank-border sticky top-0 z-20 px-4">
      <div className="h-14 flex items-center gap-3">
        <div className="flex-1" />
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-bank-accent-soft text-bank-accent grid place-items-center text-xs font-semibold">
            {initialsOf(user.full_name)}
          </div>
          <span className="text-sm text-slate-700 truncate max-w-[100px]">
            {user.full_name.split(" ")[0]}
          </span>
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
