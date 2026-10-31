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

export type StoreId = "flamboyant" | "buriti" | "principal";
export const STORES: Array<{ id: StoreId; label: string; path: string }> = [
  { id: "flamboyant", label: "Flamboyant", path: "/flamboyant" },
  { id: "buriti", label: "Buriti", path: "/buriti" },
  { id: "principal", label: "Principal", path: "/" },
];

/** Loja da página atual, pelo caminho da URL. */
export function storeFromPath(path: string | null | undefined): StoreId {
  const first = (path || "/").split("/").filter(Boolean)[0]?.toLowerCase();
  if (first === "flamboyant" || first === "buriti") return first;
  return "principal";
}

export function currentStore(): StoreId {
  return storeFromPath(typeof window === "undefined" ? "/" : window.location.pathname);
}

/** WhatsApp de cada loja (só dígitos, com 55 + DDD). */
const STORE_WHATSAPP_NUMBERS: Record<StoreId, string> = {
  flamboyant: "5562994311333",
  buriti: "5564993396331",
  principal: "5562992358894",
};

/** Link wa.me da loja da página atual. */
export function storeWhatsAppUrl(): string {
  return `https://wa.me/${STORE_WHATSAPP_NUMBERS[currentStore()]}`;
}

/** Contatos da equipe. */
export const LARA_WHATSAPP = "https://wa.me/5564992922225"; // relacionamento: parcerias, empresas, Clube do Nutri
export const DUDA_WHATSAPP = "https://wa.me/5564981072409"; // eventos e parcerias

/** iFood de cada loja. TODO: link do iFood da Flamboyant (hoje usa o do Buriti). */
const IFOOD_BURITI =
  "https://www.ifood.com.br/delivery/rio-verde-go/goldko-shopping-buriti-rio-verde-residencial-jardim-campestre/2035feba-7e16-49b2-89e5-d3239bc4d0d5";
const STORE_IFOOD_URLS: Record<StoreId, string> = {
  flamboyant: IFOOD_BURITI,
  buriti: IFOOD_BURITI,
  principal: IFOOD_BURITI,
};

export function storeIfoodUrl(): string {
  return STORE_IFOOD_URLS[currentStore()];
}

/** Site do Clube do Nutri da loja da página. */
export function storeClubeNutriUrl(): string {
  return currentStore() === "buriti"
    ? "https://www.clubedonutri.online/buriti"
    : "https://www.clubedonutri.online/flamboyant";
}
