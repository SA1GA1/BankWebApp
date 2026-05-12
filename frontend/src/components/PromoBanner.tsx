import { X } from "lucide-react";
import { MOCK_PROMO } from "../mocks/visual";

export default function PromoBanner() {
  return (
    <section className="bg-white rounded-2xl border border-bank-border px-5 py-4 flex items-center gap-4 shadow-card">
      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-bank-accent to-bank-primary text-white grid place-items-center font-bold text-lg shrink-0">
        %
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-semibold text-bank-primary">{MOCK_PROMO.title}</div>
        <div className="text-xs text-bank-muted mt-0.5 truncate">
          {MOCK_PROMO.subtitle}
        </div>
      </div>
      <button
        type="button"
        className="bg-bank-accent text-white text-sm font-medium rounded-full px-4 py-2 hover:bg-bank-primary transition shrink-0"
      >
        {MOCK_PROMO.cta}
      </button>
      <button
        type="button"
        className="text-bank-muted hover:text-bank-primary transition"
        title="Закрыть"
      >
        <X className="w-4 h-4" strokeWidth={2} />
      </button>
    </section>
  );
}
