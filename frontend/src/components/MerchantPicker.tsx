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
        className="w-full text-left border rounded-lg px-3 py-2 bg-white hover:border-bank"
      >
        {value ? (
          <span>
            <span className="font-medium">{value.name}</span>
            <span className="text-slate-500 text-sm ml-2">{value.site}</span>
          </span>
        ) : (
          <span className="text-slate-500">Выбрать интернет-магазин</span>
        )}
      </button>
      {open && (
        <div className="absolute z-30 mt-1 w-full bg-white border rounded-lg shadow-lg max-h-72 overflow-auto">
          <input
            type="text"
            placeholder="Поиск магазина..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full px-3 py-2 border-b text-sm focus:outline-none"
            autoFocus
          />
          {items.length === 0 ? (
            <div className="px-3 py-2 text-sm text-slate-500">Ничего не найдено</div>
          ) : (
            <ul>
              {items.map((m) => (
                <li key={m.id}>
                  <button
                    type="button"
                    className="w-full text-left px-3 py-2 hover:bg-slate-50 flex justify-between items-center"
                    onClick={() => {
                      onChange(m);
                      setQuery(m.name);
                      setOpen(false);
                    }}
                  >
                    <span>
                      <span className="font-medium">{m.name}</span>
                      <span className="block text-xs text-slate-500">{m.site}</span>
                    </span>
                    {m.is_known_suspicious ? (
                      <span className="text-xs bg-red-100 text-red-700 rounded px-2 py-0.5">
                        риск
                      </span>
                    ) : (
                      <span className="text-xs bg-emerald-100 text-emerald-700 rounded px-2 py-0.5">
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
