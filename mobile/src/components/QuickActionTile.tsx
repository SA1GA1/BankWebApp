import { ArrowRight } from "lucide-react";
import { MOCK_QUICK_ACTIONS } from "../mocks/visual";

export default function QuickActionTile({ icon, title }: { icon: string; title: string }) {
  return (
    <button className="flex flex-col items-center gap-1 min-w-[64px]">
      <div className="w-12 h-12 rounded-xl bg-bank-accent-soft text-bank-accent grid place-items-center">
        <ArrowRight className="w-5 h-5" strokeWidth={1.75} />
      </div>
      <span className="text-[10px] text-bank-primary text-center leading-tight">{title}</span>
    </button>
  );
}

// Re-export mock data for use in TransferPage
export { MOCK_QUICK_ACTIONS };
