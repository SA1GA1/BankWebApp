import { FileText, Home, QrCode, X } from "lucide-react";
import type { ComponentType, SVGProps } from "react";

type IconKey = "qr-code" | "home" | "file-text";

const ICON_MAP: Record<IconKey, ComponentType<SVGProps<SVGSVGElement>>> = {
  "qr-code": QrCode,
  home: Home,
  "file-text": FileText,
};

interface Props {
  icon: string;
  title: string;
}

export default function QuickActionTile({ icon, title }: Props) {
  const Icon = ICON_MAP[(icon as IconKey)] ?? FileText;
  return (
    <div className="relative w-[104px] shrink-0 bg-white rounded-2xl border border-bank-border p-3 hover:border-bank-accent hover:shadow-card transition cursor-pointer group">
      <button
        type="button"
        className="absolute top-2 right-2 w-4 h-4 rounded-full bg-bank-bg text-bank-muted grid place-items-center opacity-0 group-hover:opacity-100 transition"
        title="Открепить"
      >
        <X className="w-3 h-3" strokeWidth={2.5} />
      </button>
      <div className="w-9 h-9 rounded-lg bg-bank-bg grid place-items-center mb-2">
        <Icon className="w-5 h-5 text-bank-primary" strokeWidth={1.75} />
      </div>
      <div className="text-[12px] text-bank-primary leading-tight line-clamp-2 min-h-[28px]">
        {title}
      </div>
    </div>
  );
}
