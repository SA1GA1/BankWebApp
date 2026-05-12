import { NavLink } from "react-router-dom";
import {
  LayoutGrid,
  PiggyBank,
  CreditCard,
  Wallet,
  MessageCircle,
} from "lucide-react";
import type { ComponentType, SVGProps } from "react";

interface NavItem {
  to: string;
  label: string;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  disabled?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  { to: "/home", label: "Главная", icon: LayoutGrid },
  { to: "#savings", label: "Накопления", icon: PiggyBank, disabled: true },
  { to: "/transfer", label: "Платежи", icon: Wallet },
  { to: "#credits", label: "Кредиты", icon: CreditCard, disabled: true },
  { to: "/messenger", label: "Сообщения", icon: MessageCircle },
];

export default function Sidebar() {
  return (
    <aside className="hidden md:flex w-56 shrink-0 bg-white border-r border-bank-border flex-col sticky top-0 h-screen">
      <div className="px-5 h-16 flex items-center gap-2 border-b border-bank-border">
        <div className="w-8 h-8 rounded-lg bg-bank-primary text-white grid place-items-center font-bold text-sm">
          DB
        </div>
        <div className="font-semibold text-bank-primary tracking-tight">DemoBank</div>
      </div>
      <nav className="flex-1 px-2 py-4 space-y-1">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          if (item.disabled) {
            return (
              <span
                key={item.label}
                aria-disabled="true"
                className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-bank-muted cursor-not-allowed select-none"
                title="Раздел недоступен в демо"
              >
                <Icon className="w-5 h-5" strokeWidth={1.75} />
                {item.label}
              </span>
            );
          }
          return (
            <NavLink
              key={item.label}
              to={item.to}
              className={({ isActive }) =>
                [
                  "relative flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition",
                  isActive
                    ? "bg-bank-accent-soft text-bank-accent"
                    : "text-slate-700 hover:bg-slate-50",
                ].join(" ")
              }
            >
              {({ isActive }) => (
                <>
                  {isActive && (
                    <span className="absolute left-0 top-1.5 bottom-1.5 w-1 rounded-r bg-bank-accent" />
                  )}
                  <Icon className="w-5 h-5" strokeWidth={1.75} />
                  {item.label}
                </>
              )}
            </NavLink>
          );
        })}
      </nav>
      <div className="px-5 py-3 text-[11px] text-bank-muted border-t border-bank-border">
        Демо-режим · v0.1
      </div>
    </aside>
  );
}
