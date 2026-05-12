import { User } from "lucide-react";

interface Props {
  variant: "between" | "international" | "person" | "templates";
  initials?: string;
  name: string;
}

export default function RecipientTile({ variant, initials, name }: Props) {
  const isPerson = variant === "person";

  return (
    <button className="flex flex-col items-center gap-1 min-w-[72px]">
      <div
        className={`w-14 h-14 rounded-full grid place-items-center text-sm font-semibold shrink-0 ${
          isPerson
            ? "bg-bank-accent-soft text-bank-accent"
            : "bg-bank-bg text-bank-primary"
        }`}
      >
        {isPerson && initials ? (
          initials
        ) : (
          <User className="w-6 h-6" strokeWidth={1.75} />
        )}
      </div>
      <span className="text-[10px] text-bank-primary text-center leading-tight max-w-[72px] truncate">
        {name}
      </span>
    </button>
  );
}

// Re-export for convenience
export const MOCK_RECENT_RECIPIENTS = [
  { initials: "АЗ", name: "Александр З." },
  { initials: "ЮД", name: "Юрий Д." },
  { initials: "АВ", name: "Александр В." },
  { initials: "ГИ", name: "Галина И." },
];
