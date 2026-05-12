import { useEffect, useRef } from "react";
import { useSession } from "../store/session";
import type { Signals } from "../types";

const SESSION_START = Date.now();

function detectBrowser(): { browser_name: string; browser_version: string; os_type: string } {
  const ua = navigator.userAgent;
  let browser_name = "Unknown";
  if (/Edg\//.test(ua)) browser_name = "Edge";
  else if (/Chrome\//.test(ua) && /Safari\//.test(ua)) browser_name = "Chrome";
  else if (/Firefox\//.test(ua)) browser_name = "Firefox";
  else if (/Safari\//.test(ua)) browser_name = "Safari";
  const v = ua.match(/(?:Chrome|Firefox|Safari|Edg)\/([\d.]+)/);
  const browser_version = v ? v[1] : "0";
  let os_type = "Unknown";
  if (/Windows/.test(ua)) os_type = "Windows";
  else if (/Macintosh|Mac OS X/.test(ua)) os_type = "macOS";
  else if (/Linux/.test(ua)) os_type = "Linux";
  else if (/Android/.test(ua)) os_type = "Android";
  else if (/iPhone|iPad/.test(ua)) os_type = "iOS";
  return { browser_name, browser_version, os_type };
}

async function sha1(text: string): Promise<string> {
  const buf = new TextEncoder().encode(text);
  const hash = await crypto.subtle.digest("SHA-1", buf);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

interface TelemetryState {
  mouseSamples: number;
  mouseVelocitySum: number;
  mouseVelocitySqSum: number;
  lastMouseEvent: { x: number; y: number; t: number } | null;
  keySamples: number[];
  lastKeyTime: number | null;
}

const state: TelemetryState = {
  mouseSamples: 0,
  mouseVelocitySum: 0,
  mouseVelocitySqSum: 0,
  lastMouseEvent: null,
  keySamples: [],
  lastKeyTime: null,
};

let listenersAttached = false;
let fingerprintCache: string | null = null;

function attachListeners() {
  if (listenersAttached) return;
  listenersAttached = true;
  window.addEventListener("mousemove", (e) => {
    const now = performance.now();
    if (state.lastMouseEvent) {
      const dx = e.clientX - state.lastMouseEvent.x;
      const dy = e.clientY - state.lastMouseEvent.y;
      const dt = now - state.lastMouseEvent.t;
      if (dt > 0) {
        const v = Math.sqrt(dx * dx + dy * dy) / dt;
        state.mouseSamples += 1;
        state.mouseVelocitySum += v;
        state.mouseVelocitySqSum += v * v;
      }
    }
    state.lastMouseEvent = { x: e.clientX, y: e.clientY, t: now };
  });
  window.addEventListener("keydown", () => {
    const now = performance.now();
    if (state.lastKeyTime !== null) {
      const dt = now - state.lastKeyTime;
      if (dt > 0 && dt < 5000) state.keySamples.push(dt);
      if (state.keySamples.length > 200) state.keySamples.shift();
    }
    state.lastKeyTime = now;
  });
}

function median(arr: number[]): number {
  if (!arr.length) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const mid = sorted.length >> 1;
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

function networkRtt(): number {
  const entries = performance.getEntriesByType("navigation") as PerformanceNavigationTiming[];
  if (!entries.length) return 0;
  const e = entries[0];
  return Math.max(0, e.responseStart - e.requestStart);
}

export function useFingerprint(): () => Promise<Signals> {
  const { riskOverrides } = useSession();
  const riskRef = useRef(riskOverrides);
  riskRef.current = riskOverrides;

  useEffect(() => {
    attachListeners();
  }, []);

  return async () => {
    const { browser_name, browser_version, os_type } = detectBrowser();
    const screen_resolution = `${window.screen.width}x${window.screen.height}`;
    const system_language = navigator.language;
    const timezone_offset_minutes = -new Date().getTimezoneOffset();

    if (!fingerprintCache) {
      fingerprintCache = await sha1(
        [navigator.userAgent, screen_resolution, system_language, String(timezone_offset_minutes)].join("|")
      );
    }

    const mouse_velocity_avg = state.mouseSamples
      ? state.mouseVelocitySum / state.mouseSamples
      : 0;
    const variance = state.mouseSamples
      ? state.mouseVelocitySqSum / state.mouseSamples - mouse_velocity_avg * mouse_velocity_avg
      : 0;
    const mouse_jitter_score = Math.sqrt(Math.max(0, variance));
    const keyboard_typing_speed_median_ms = median(state.keySamples);

    const base: Signals = {
      browser_fingerprint: fingerprintCache,
      user_agent: navigator.userAgent,
      browser_name,
      browser_version,
      os_type,
      screen_resolution,
      system_language,
      timezone_offset_minutes,
      session_duration_sec: (Date.now() - SESSION_START) / 1000,
      mouse_velocity_avg,
      mouse_jitter_score,
      keyboard_typing_speed_median_ms,
      network_rtt_avg_ms: networkRtt(),
      is_vpn_detected: 0,
      is_proxy_detected: 0,
      is_tor_detected: 0,
      is_new_device: 0,
      is_new_browser: 0,
      geo_speed_km_h: 0,
      transfers_count_last_10min: 0,
      force_hour_of_day: null,
      geo_mismatch: false,
    };

    return { ...base, ...riskRef.current };
  };
}
