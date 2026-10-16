import { recordAnalyticsEvent } from "./analytics.functions";
type TrackingProperties = Record<string, string | number | boolean | null | undefined>;

declare global {
  interface Window {
    dataLayer?: Array<Record<string, unknown>>;
  }
}

export function trackEvent(event: string, properties: TrackingProperties = {}) {
  if (typeof window === "undefined") return Promise.resolve({ success: false });
  const now = Date.now();
  const visitorId = localStorage.getItem("goldko_visitor_id") || crypto.randomUUID();
  localStorage.setItem("goldko_visitor_id", visitorId);
  let session: { id: string; touchedAt: number } | null = null;
  try { session = JSON.parse(sessionStorage.getItem("goldko_session") || "null"); } catch { session = null; }
  if (!session || now - session.touchedAt > 30 * 60 * 1000) session = { id: crypto.randomUUID(), touchedAt: now };
  session.touchedAt = now;
  sessionStorage.setItem("goldko_session", JSON.stringify(session));
  const params = new URLSearchParams(window.location.search);
  const payload = {
    event,
    page_path: window.location.pathname,
    ...properties,
  };
  window.dataLayer = window.dataLayer ?? [];
  window.dataLayer.push(payload);
  window.dispatchEvent(new CustomEvent("goldko:track", { detail: payload }));
  const reserved = new Set(["section", "source", "segment", "label", "destination"]);
  const metadata = Object.fromEntries(
    Object.entries(properties).filter(([key, value]) => !reserved.has(key) && value !== undefined),
  );
  return recordAnalyticsEvent({ data: {
    event_name: event, visitor_id: visitorId, session_id: session.id, page_path: window.location.pathname,
    section: typeof properties.section === "string" ? properties.section : null,
    source: typeof properties.source === "string" ? properties.source : null,
    segment: typeof properties.segment === "string" ? properties.segment : null,
    label: typeof properties.label === "string" ? properties.label : null,
    destination: typeof properties.destination === "string" ? properties.destination : null,
    device: window.matchMedia("(max-width: 767px)").matches ? "mobile" : "desktop",
    utm_source: params.get("utm_source"), utm_medium: params.get("utm_medium"), utm_campaign: params.get("utm_campaign"), metadata,
  } }).catch(() => ({ success: false }));
}

export function trackedClick(event: string, label: string, destination: string) {
  return () => trackEvent(event, { label, destination });
}
