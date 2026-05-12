import {
  ChevronRight,
  Plus,
  QrCode,
  Sparkles,
  Wallet as WalletIcon,
  ShieldCheck,
} from "lucide-react";
import { MOCK_CASHBACK_POINTS } from "../mocks/visual";

interface Props {
  fullName: string;
  accountNumber: string;
  balance: number;
}

function lastFour(account: string): string {
  return account.slice(-4);
}

export default function WalletCard({ fullName, accountNumber, balance }: Props) {
  const last4 = lastFour(accountNumber);
  const initials = fullName.slice(0, 1).toUpperCase();

  return (
    <section className="bg-bank-accent-soft rounded-3xl p-5 shadow-card">
      <div className="flex items-center justify-between mb-4">
        <button
          type="button"
          className="flex items-center gap-1 text-lg font-semibold text-bank-primary hover:text-bank-accent transition"
        >
          Кошелёк
          <ChevronRight className="w-5 h-5" strokeWidth={2} />
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {/* Tile 1 — Основной счёт */}
        <div className="bg-white rounded-2xl p-4 flex flex-col gap-3 hover:shadow-card transition cursor-pointer">
          <div className="w-9 h-9 rounded-lg bg-bank-bg grid place-items-center">
            <QrCode className="w-5 h-5 text-bank-primary" strokeWidth={1.75} />
          </div>
          <div>
            <div className="flex items-center gap-1.5 text-bank-primary">
              <ShieldCheck className="w-4 h-4 text-bank-accent" strokeWidth={2} />
              <span className="font-semibold text-base">
                {balance.toLocaleString("ru-RU")} ₽
              </span>
            </div>
            <div className="text-[11px] text-bank-muted mt-0.5">
              Счёт •• {last4}
            </div>
          </div>
        </div>

        {/* Tile 2 — Пополнить */}
        <div className="bg-white rounded-2xl p-4 flex flex-col gap-3 hover:shadow-card transition cursor-pointer">
          <div className="w-12 h-8 rounded-md bg-gradient-to-br from-bank-accent to-bank-primary text-white text-[10px] font-mono px-1.5 py-1 flex items-end">
            {last4}
          </div>
          <div>
            <div className="text-sm font-semibold text-bank-accent">
              Пополните счёт
            </div>
            <div className="text-[11px] text-bank-muted mt-0.5">
              По номеру карты
            </div>
          </div>
        </div>

        {/* Tile 3 — Кешбэк */}
        <div className="bg-white rounded-2xl p-4 flex flex-col gap-3 hover:shadow-card transition cursor-pointer">
          <div className="w-9 h-9 rounded-full bg-bank-accent grid place-items-center">
            <Sparkles className="w-5 h-5 text-white" strokeWidth={2} />
          </div>
          <div>
            <div className="text-base font-semibold text-bank-primary">
              {MOCK_CASHBACK_POINTS}
            </div>
            <div className="text-[11px] text-bank-muted mt-0.5">DemoBonus</div>
          </div>
        </div>

        {/* Tile 4 — Оформить */}
        <div className="bg-white rounded-2xl p-4 flex flex-col gap-3 hover:shadow-card transition cursor-pointer">
          <div className="w-9 h-9 rounded-full border border-bank-border grid place-items-center">
            <Plus className="w-5 h-5 text-bank-primary" strokeWidth={1.75} />
          </div>
          <div>
            <div className="text-sm font-semibold text-bank-primary">
              Оформить
            </div>
            <div className="text-[11px] text-bank-muted mt-0.5">
              карту или счёт
            </div>
          </div>
        </div>

        {/* Tile 5 — Все счета */}
        <div className="bg-white rounded-2xl p-4 flex flex-col gap-3 hover:shadow-card transition cursor-pointer">
          <div className="w-9 h-9 rounded-lg bg-bank-bg grid place-items-center">
            <WalletIcon className="w-5 h-5 text-bank-primary" strokeWidth={1.75} />
          </div>
          <div>
            <div className="flex items-center justify-between text-sm font-semibold text-bank-primary">
              Все счета
              <ChevronRight className="w-4 h-4 text-bank-muted" strokeWidth={2} />
            </div>
            <div className="text-[11px] text-bank-muted mt-0.5">
              карты и бонусы
            </div>
          </div>
        </div>
      </div>

      <div className="mt-4 px-2 flex items-center gap-3 text-xs text-bank-muted">
        <div className="w-7 h-7 rounded-full bg-bank-primary text-white grid place-items-center text-[11px] font-semibold">
          {initials}
        </div>
        Привет, {fullName.split(" ")[0]} · последний вход сегодня
      </div>
    </section>
  );
}
