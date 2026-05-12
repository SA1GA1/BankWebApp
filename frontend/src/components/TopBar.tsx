import { NavLink, useNavigate } from "react-router-dom";
import { useSession } from "../store/session";

export default function TopBar() {
  const { user, setUser } = useSession();
  const navigate = useNavigate();
  if (!user) return null;

  const link = ({ isActive }: { isActive: boolean }) =>
    `px-3 py-2 rounded-md text-sm font-medium ${
      isActive ? "bg-bank text-white" : "text-slate-700 hover:bg-slate-200"
    }`;

  return (
    <header className="bg-white border-b border-slate-200">
      <div className="max-w-5xl mx-auto px-4 h-14 flex items-center gap-4">
        <div className="font-bold text-bank">DemoBank</div>
        <nav className="flex gap-1 ml-4">
          <NavLink to="/home" className={link}>Главная</NavLink>
          <NavLink to="/transfer" className={link}>Перевод</NavLink>
          <NavLink to="/messenger" className={link}>Сообщения</NavLink>
        </nav>
        <div className="ml-auto flex items-center gap-3 text-sm">
          <span className="text-slate-700">{user.full_name}</span>
          <button
            type="button"
            className="text-slate-500 hover:text-bank-dark"
            onClick={() => {
              setUser(null);
              navigate("/login");
            }}
          >
            Выйти
          </button>
        </div>
      </div>
    </header>
  );
}
