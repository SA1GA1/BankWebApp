import { ArrowRightLeft, Globe2, Star, X } from "lucide-react";
import type { ComponentType, SVGProps } from "react";

type Variant = "between" | "international" | "templates" | "person";

interface Props {
  variant?: Variant;
  initials?: string;
  name: string;
}

const VARIANT_ICON: Record<Exclude<Variant, "person">, ComponentType<SVGProps<SVGSVGElement>>> = {
  between: ArrowRightLeft,
  international: Globe2,
  templates: Star,
};

export default function RecipientTile({ variant = "person", initials, name }: Props) {
  return (
    <div className="relative w-[104px] shrink-0 flex flex-col items-center text-center cursor-pointer group">
      <button
        type="button"
        className="absolute top-0 right-2 w-4 h-4 rounded-full bg-bank-bg text-bank-muted grid place-items-center opacity-0 group-hover:opacity-100 transition z-10"
        title="Открепить"
      >
        <X className="w-3 h-3" strokeWidth={2.5} />
      </button>
      {variant === "person" ? (
        <div className="w-11 h-11 rounded-full bg-bank-accent-soft text-bank-accent grid place-items-center text-sm font-semibold border border-bank-border">
          {initials ?? "?"}
        </div>
      ) : (
        <div className="w-11 h-11 rounded-full bg-white border border-bank-border grid place-items-center text-bank-primary">
          {(() => {
            const Icon = VARIANT_ICON[variant];
            return <Icon className="w-5 h-5" strokeWidth={1.75} />;
          })()}
        </div>
      )}
      <div className="mt-2 text-[11px] text-bank-primary leading-tight line-clamp-2 min-h-[28px] w-full px-1">
        {name}
      </div>
    </div>
  );
}
