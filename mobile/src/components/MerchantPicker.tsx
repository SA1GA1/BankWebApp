import { useEffect, useState } from "react";
import { api } from "../api/client";
import type { Merchant } from "../types";

interface Props {
  value: Merchant | null;
  onChange: (m: Merchant | null) => void;
}

export default function MerchantPicker({ value, onChange }: Props) {
  const [merchants, setMerchants] = useState<Merchant[]>([]);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open || query.length < 2) return;
    api.listMerchants(query).then(setMerchants);
  }, [query, open]);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full bg-bank-bg border border-transparent focus:bg-white focus:border-bank-accent focus:ring-2 focus:ring-bank-accent/20 rounded-xl px-3 py-2.5 text-sm outline-none transition flex items-center justify-between"
      >
        <span className="truncate">
          {value ? `${value.name} (${value.category})` : "Выберите магазин"}
        </span>
        <span className="text-bank-muted">{open ? "▲" : "▼"}</span>
      </button>
      {open && (
        <div className="absolute z-20 w-full mt-1 bg-white border border-bank-border rounded-xl shadow-card max-h-48 overflow-y-auto">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Поиск..."
            className="w-full px-3 py-2 text-sm border-b border-bank-border outline-none"
            autoFocus
          />
          <ul>
            {merchants.map((m) => (
              <li key={m.id}>
                <button
                  type="button"
                  className="w-full px-3 py-2 text-left text-sm hover:bg-bank-bg transition truncate"
                  onClick={() => {
                    onChange(m);
                    setOpen(false);
                  }}
                >
                  {m.name} · {m.category}
                  {m.is_known_suspicious ? " ⚠️" : ""}
                </button>
              </li>
            ))}
            {merchants.length === 0 && query.length >= 2 && (
              <li className="px-3 py-2 text-xs text-bank-muted">Ничего не найдено</li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
