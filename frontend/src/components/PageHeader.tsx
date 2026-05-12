import { EyeOff, MoreHorizontal } from "lucide-react";
import type { ReactNode } from "react";

interface Props {
  title: string;
  right?: ReactNode;
  showControls?: boolean;
}

export default function PageHeader({ title, right, showControls = true }: Props) {
  return (
    <div className="flex items-center justify-between">
      <h1 className="text-2xl font-bold text-bank-primary tracking-tight">{title}</h1>
      <div className="flex items-center gap-2">
        {right}
        {showControls && (
          <>
            <button
              type="button"
              className="w-9 h-9 grid place-items-center rounded-full bg-white border border-bank-border text-bank-muted hover:text-bank-primary hover:border-bank-accent transition"
              title="Скрыть суммы"
            >
              <EyeOff className="w-4 h-4" strokeWidth={1.75} />
            </button>
            <button
              type="button"
              className="w-9 h-9 grid place-items-center rounded-full bg-white border border-bank-border text-bank-muted hover:text-bank-primary hover:border-bank-accent transition"
              title="Меню"
            >
              <MoreHorizontal className="w-4 h-4" strokeWidth={1.75} />
            </button>
          </>
        )}
      </div>
    </div>
  );
}
