import { NavLink } from "react-router-dom";
import { LayoutGrid, Wallet, MessageCircle, User } from "lucide-react";
import type { ComponentType, SVGProps } from "react";

interface NavItem {
  to: string;
  label: string;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  disabled?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  { to: "/home", label: "Главная", icon: LayoutGrid },
  { to: "/transfer", label: "Платежи", icon: Wallet },
  { to: "/messenger", label: "Сообщения", icon: MessageCircle },
  { to: "#profile", label: "Профиль", icon: User, disabled: true },
];

export default function MobileTabBar() {
  return (
    <nav className="mobile-tab-bar">
      {NAV_ITEMS.map((item) => {
        const Icon = item.icon;
        if (item.disabled) {
          return (
            <span
              key={item.label}
              className="tab-item disabled"
              title="Раздел недоступен в демо"
            >
              <Icon className="tab-icon" strokeWidth={1.75} />
              <span className="tab-label">{item.label}</span>
            </span>
          );
        }
        return (
          <NavLink
            key={item.label}
            to={item.to}
            className={({ isActive }) =>
              `tab-item ${isActive ? "active" : ""}`
            }
          >
            {({ isActive }) => (
              <>
                <div className="tab-icon-wrapper">
                  <Icon className="tab-icon" strokeWidth={1.75} />
                  {isActive && <span className="tab-indicator" />}
                </div>
                <span className="tab-label">{item.label}</span>
              </>
            )}
          </NavLink>
        );
      })}
    </nav>
  );
}
