import { NavLink } from "react-router-dom";
import { LayoutGrid, Wallet, MessageCircle } from "lucide-react";
import type { ComponentType, SVGProps } from "react";

interface NavItem {
  to: string;
  label: string;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
}

const NAV_ITEMS: NavItem[] = [
  { to: "/home", label: "Главная", icon: LayoutGrid },
  { to: "/transfer", label: "Платежи", icon: Wallet },
  { to: "/messenger", label: "Сообщения", icon: MessageCircle },
];

export default function BottomNav() {
  return (
    <nav className="absolute bottom-0 left-0 right-0 bg-white border-t border-bank-border px-2 py-2 z-30">
      <div className="flex justify-around items-center">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.label}
              to={item.to}
              className={({ isActive }) =>
                [
                  "flex flex-col items-center justify-center py-1 px-3 rounded-lg text-xs font-medium transition",
                  isActive
                    ? "text-bank-accent"
                    : "text-bank-muted hover:text-bank-primary",
                ].join(" ")
              }
            >
              {({ isActive }) => (
                <>
                  <Icon className="w-6 h-6" strokeWidth={1.75} />
                  <span className="mt-0.5">{item.label}</span>
                  {isActive && (
                    <span className="absolute bottom-1 w-8 h-0.5 rounded-full bg-bank-accent" />
                  )}
                </>
              )}
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
}
