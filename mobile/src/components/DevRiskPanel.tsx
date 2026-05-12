import { useEffect, useState } from "react";
import { useSession } from "../store/session";
import type { Signals } from "../types";

const PRESETS: Record<string, Partial<Signals>> = {
  clean: {
    is_vpn_detected: 0,
    is_proxy_detected: 0,
    is_tor_detected: 0,
    is_new_device: 0,
    geo_speed_km_h: 0,
    transfers_count_last_10min: 0,
    force_hour_of_day: null,
    geo_mismatch: false,
  },
  suspicious: {
    is_vpn_detected: 1,
    is_new_device: 1,
    force_hour_of_day: 3,
    geo_speed_km_h: 0,
    transfers_count_last_10min: 0,
  },
  fraud: {
    is_vpn_detected: 1,
    is_tor_detected: 1,
    is_new_device: 1,
    geo_speed_km_h: 1500,
    transfers_count_last_10min: 6,
    force_hour_of_day: 3,
    geo_mismatch: true,
  },
};

export default function DevRiskPanel() {
  const { riskOverrides, setRiskOverrides, patchRiskOverrides } = useSession();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const toggle = (key: keyof Signals) => {
    patchRiskOverrides({ [key]: riskOverrides[key] ? 0 : 1 } as Partial<Signals>);
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="absolute bottom-20 right-4 z-40 bg-bank-primary text-white text-xs px-3 py-2 rounded-full shadow-card hover:bg-bank-primary-dark transition"
        title="⌘+K"
      >
        Dev
      </button>
      {open && (
        <div className="absolute bottom-28 right-4 z-40 w-72 bg-white border border-bank-border rounded-2xl shadow-card p-3 text-xs max-h-80 overflow-y-auto">
          <div className="flex justify-between items-center mb-2">
            <h3 className="font-semibold text-bank-primary">Сигналы риска</h3>
            <button className="text-bank-muted hover:text-bank-primary transition" onClick={() => setOpen(false)}>
              ✕
            </button>
          </div>
          <div className="space-y-1.5">
            <label className="flex justify-between items-center">
              <span>VPN</span>
              <input
                type="checkbox"
                checked={!!riskOverrides.is_vpn_detected}
                onChange={() => toggle("is_vpn_detected")}
              />
            </label>
            <label className="flex justify-between items-center">
              <span>Proxy</span>
              <input
                type="checkbox"
                checked={!!riskOverrides.is_proxy_detected}
                onChange={() => toggle("is_proxy_detected")}
              />
            </label>
            <label className="flex justify-between items-center">
              <span>Tor</span>
              <input
                type="checkbox"
                checked={!!riskOverrides.is_tor_detected}
                onChange={() => toggle("is_tor_detected")}
              />
            </label>
            <label className="flex justify-between items-center">
              <span>Новое устройство</span>
              <input
                type="checkbox"
                checked={!!riskOverrides.is_new_device}
                onChange={() => toggle("is_new_device")}
              />
            </label>
            <label className="flex justify-between items-center">
              <span>geo_mismatch</span>
              <input
                type="checkbox"
                checked={!!riskOverrides.geo_mismatch}
                onChange={() =>
                  patchRiskOverrides({ geo_mismatch: !riskOverrides.geo_mismatch })
                }
              />
            </label>
            <label className="flex justify-between items-center gap-2">
              <span>geo_speed</span>
              <input
                type="number"
                className="w-20 border rounded px-2 py-0.5 text-xs"
                value={riskOverrides.geo_speed_km_h ?? 0}
                onChange={(e) =>
                  patchRiskOverrides({ geo_speed_km_h: Number(e.target.value) || 0 })
                }
              />
            </label>
            <label className="flex justify-between items-center gap-2">
              <span>Час суток</span>
              <input
                type="number"
                min={0}
                max={23}
                placeholder="auto"
                className="w-20 border rounded px-2 py-0.5 text-xs"
                value={riskOverrides.force_hour_of_day ?? ""}
                onChange={(e) =>
                  patchRiskOverrides({
                    force_hour_of_day: e.target.value === "" ? null : Number(e.target.value),
                  })
                }
              />
            </label>
            <label className="flex justify-between items-center gap-2">
              <span>Переводов / 10 мин</span>
              <input
                type="number"
                min={0}
                className="w-20 border rounded px-2 py-0.5 text-xs"
                value={riskOverrides.transfers_count_last_10min ?? 0}
                onChange={(e) =>
                  patchRiskOverrides({
                    transfers_count_last_10min: Number(e.target.value) || 0,
                  })
                }
              />
            </label>
          </div>
          <div className="grid grid-cols-3 gap-1.5 mt-3">
            <button
              type="button"
              className="text-xs bg-emerald-100 text-emerald-800 rounded py-1 hover:bg-emerald-200"
              onClick={() => setRiskOverrides(PRESETS.clean)}
            >
              Чисто
            </button>
            <button
              type="button"
              className="text-xs bg-amber-100 text-amber-800 rounded py-1 hover:bg-amber-200"
              onClick={() => setRiskOverrides(PRESETS.suspicious)}
            >
              Подозрительно
            </button>
            <button
              type="button"
              className="text-xs bg-red-100 text-red-800 rounded py-1 hover:bg-red-200"
              onClick={() => setRiskOverrides(PRESETS.fraud)}
            >
              Фрод
            </button>
          </div>
        </div>
      )}
    </>
  );
}
