import { useEffect, useRef, useState } from "react";
import { api } from "../api/client";
import type { Merchant } from "../types";

interface Props {
  value: Merchant | null;
  onChange: (m: Merchant | null) => void;
}

export default function MerchantPicker({ value, onChange }: Props) {
  const [query, setQuery] = useState(value?.name ?? "");
  const [items, setItems] = useState<Merchant[]>([]);
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let cancelled = false;
    api
      .listMerchants(open ? query : "")
      .then((data) => {
        if (!cancelled) setItems(data);
      })
      .catch(() => setItems([]));
    return () => {
      cancelled = true;
    };
  }, [query, open]);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    window.addEventListener("mousedown", onClick);
    return () => window.removeEventListener("mousedown", onClick);
  }, []);

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full text-left border border-bank-border rounded-xl px-3 py-2.5 bg-bank-bg hover:bg-white hover:border-bank-accent transition"
      >
        {value ? (
          <span>
            <span className="font-medium text-bank-primary">{value.name}</span>
            <span className="text-bank-muted text-sm ml-2">{value.site}</span>
          </span>
        ) : (
          <span className="text-bank-muted">Выбрать интернет-магазин</span>
        )}
      </button>
      {open && (
        <div className="absolute z-30 mt-1 w-full bg-white border border-bank-border rounded-xl shadow-card max-h-72 overflow-auto">
          <input
            type="text"
            placeholder="Поиск магазина..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full px-3 py-2 border-b border-bank-border text-sm focus:outline-none"
            autoFocus
          />
          {items.length === 0 ? (
            <div className="px-3 py-2 text-sm text-bank-muted">Ничего не найдено</div>
          ) : (
            <ul>
              {items.map((m) => (
                <li key={m.id}>
                  <button
                    type="button"
                    className="w-full text-left px-3 py-2 hover:bg-bank-bg flex justify-between items-center"
                    onClick={() => {
                      onChange(m);
                      setQuery(m.name);
                      setOpen(false);
                    }}
                  >
                    <span>
                      <span className="font-medium text-bank-primary">{m.name}</span>
                      <span className="block text-xs text-bank-muted">{m.site}</span>
                    </span>
                    {m.is_known_suspicious ? (
                      <span className="text-xs bg-red-100 text-red-700 rounded-full px-2 py-0.5">
                        риск
                      </span>
                    ) : (
                      <span className="text-xs bg-emerald-100 text-emerald-700 rounded-full px-2 py-0.5">
                        известный
                      </span>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
