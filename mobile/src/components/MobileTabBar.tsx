import { Home, MessageSquare, CreditCard } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface MobileTabBarProps {
  currentPath: string;
}

export default function MobileTabBar({ currentPath }: MobileTabBarProps) {
  const navigate = useNavigate();

  const tabs = [
    { path: "/home", icon: Home, label: "Главная" },
    { path: "/transfer", icon: CreditCard, label: "Платежи" },
    { path: "/messenger", icon: MessageSquare, label: "Сообщения" },
  ] as const;

  return (
    <div className="mobile-tab-bar">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = currentPath === tab.path || 
                        (tab.path !== "/home" && currentPath.startsWith(tab.path));
        
        return (
          <button
            key={tab.path}
            type="button"
            className={`mobile-tab-btn ${isActive ? "active" : ""}`}
            onClick={() => navigate(tab.path)}
          >
            <Icon size={22} strokeWidth={isActive ? 2.5 : 2} />
            <span className="mobile-tab-label">{tab.label}</span>
          </button>
        );
      })}
    </div>
  );
}
