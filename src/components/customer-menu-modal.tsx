import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import {
  BookOpen,
  CircleHelp,
  Clock,
  Gift,
  MessageCircle,
  Package,
  Send,
  ShoppingBag,
  Star,
  Store,
  Truck,
  X,
} from "lucide-react";
import type { CustomerMenuLabels } from "@/lib/site-content";
import { GoldkoSheet, SheetHeader } from "@/components/goldko-sheet";
import { trackEvent } from "@/lib/tracking";

const STORE_WHATSAPP = "https://wa.me/5562992358894";
type CustomerAction = {
  key: keyof CustomerMenuLabels;
  icon: typeof Store;
  action: "whatsapp" | "delivery" | "fidelity" | "feedback" | "soon";
};

const actions: CustomerAction[] = [
  { key: "store", icon: Store, action: "whatsapp" },
  { key: "delivery", icon: Truck, action: "delivery" },
  { key: "fidelity", icon: Star, action: "fidelity" },
  { key: "menu", icon: BookOpen, action: "soon" },
  { key: "products", icon: Package, action: "soon" },
  { key: "faq", icon: CircleHelp, action: "soon" },
  { key: "personalOrders", icon: ShoppingBag, action: "soon" },
  { key: "giftOrders", icon: Gift, action: "soon" },
  { key: "feedback", icon: MessageCircle, action: "feedback" },
];

type CustomerMenuModalProps = {
  open: boolean;
  onClose: () => void;
  trackingSource?: "hero" | "help_card" | "general";
  labels: CustomerMenuLabels;
  isEditable?: boolean;
  onEditField?: (path: string, label: string, value: string, type: "text" | "multiline") => void;
  onOpenFidelity: () => void;
};

export function CustomerMenuModal({ open, onClose, trackingSource = "help_card", labels, isEditable = false, onEditField, onOpenFidelity }: CustomerMenuModalProps) {
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [notice, setNotice] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");
  const selectedRef = useRef(false);

  const closeAsAbandoned = useCallback(() => {
    if (!selectedRef.current) trackEvent("customer_menu_abandoned", { source: trackingSource, segment: "cliente" });
    onClose();
  }, [onClose, trackingSource]);

  useEffect(() => {
    if (!open) return;
    selectedRef.current = false;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeAsAbandoned();
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [open, closeAsAbandoned]);

  if (!open) return null;

  function openWhatsApp(text?: string) {
    const suffix = text ? `?text=${encodeURIComponent(text)}` : "";
    window.open(`${STORE_WHATSAPP}${suffix}`, "_blank", "noopener,noreferrer");
  }

  function handleAction(item: CustomerAction, label: string) {
    setNotice("");
    selectedRef.current = true;
    trackEvent("customer_option_click", { section: "customer_menu", source: trackingSource, segment: "cliente", label, option: item.key });
    if (item.action === "whatsapp") {
      trackEvent("funnel_completed", { source: trackingSource, segment: "cliente", option: item.key });
      return openWhatsApp();
    }
    if (item.action === "delivery") {
      trackEvent("funnel_completed", { source: trackingSource, segment: "cliente", option: item.key });
      return openWhatsApp("Olá! Preciso de ajuda com pedidos e entregas da GoldKo.");
    }
    if (item.action === "fidelity") {
      onClose();
      onOpenFidelity();
      return;
    }
    if (item.action === "feedback") {
      setFeedbackOpen(true);
      return;
    }
    setNotice(`${label} estará disponível em breve.`);
  }

  function submitFeedback(event: FormEvent) {
    event.preventDefault();
    if (!message.trim()) return;
    openWhatsApp(
      [
        "Olá! Quero enviar uma sugestão ou reclamação para a GoldKo.",
        name.trim() ? `Nome: ${name.trim()}` : "Nome: não informado",
        phone.trim() ? `Telefone: ${phone.trim()}` : "Telefone: não informado",
        `Mensagem: ${message.trim()}`,
      ].join("\n"),
    );
    trackEvent("funnel_completed", { source: trackingSource, segment: "cliente", option: "feedback" });
    setFeedbackOpen(false);
    setName("");
    setPhone("");
    setMessage("");
  }

  const activeActions = actions.filter((item) => item.action !== "soon");
  const soonActions = actions.filter((item) => item.action === "soon");
  const visibleActions = isEditable ? actions : activeActions;

  function editOrRun(item: CustomerAction, label: string) {
    if (isEditable) {
      onEditField?.(`customerMenu.labels.${item.key}`, `Cliente GoldKo: ${label}`, label, "text");
      return;
    }
    handleAction(item, label);
  }

  return (
    <GoldkoSheet onBackdrop={closeAsAbandoned} maxWidth="max-w-[560px]">
        <SheetHeader eyebrow="Cliente GoldKo" title="Como posso te ajudar hoje?" onClose={closeAsAbandoned} />

        <div className="relative overflow-y-auto px-5 pb-7 pt-4 sm:px-8 sm:pb-8">
          <div className="grid grid-cols-2 gap-2.5 sm:gap-3">
            {visibleActions.map((item) => {
              const Icon = item.icon;
              const label = labels[item.key];
              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => editOrRun(item, label)}
                  title={isEditable ? `Clique para editar: ${label}` : undefined}
                  className={`group flex min-h-[104px] flex-col items-start justify-between gap-3 rounded-2xl border border-[#EDE6DA] bg-white p-4 text-left transition hover:-translate-y-0.5 hover:border-[#00205C] active:translate-y-0 ${
                    isEditable ? "cursor-text outline-dashed hover:outline hover:outline-2 hover:outline-[#ff8515]" : ""
                  }`}
                >
                  <span className="flex size-10 items-center justify-center rounded-full bg-[#E7F7FB] text-[#00205C] transition group-hover:bg-[#00205C] group-hover:text-white">
                    <Icon className="size-5" />
                  </span>
                  <span className="text-[15px] font-bold leading-snug text-[#00205C]">{label}</span>
                  {isEditable && item.action === "soon" && (
                    <span className="text-[11px] font-semibold uppercase tracking-wide text-[#8A7A63]">Em breve</span>
                  )}
                </button>
              );
            })}
          </div>

          {!isEditable && soonActions.length > 0 && (
            <div className="mt-3 flex items-start gap-3 rounded-2xl bg-[#F3EEE5]/90 px-4 py-3">
              <Clock className="mt-0.5 size-4 shrink-0 text-[#8A7A63]" />
              <p className="text-[13px] leading-relaxed text-[#6B5D48]">
                <span className="font-bold">Em breve:</span>{" "}
                {soonActions.map((item) => labels[item.key].toLowerCase()).join(", ")}.
              </p>
            </div>
          )}

          {notice && (
            <div className="mt-3 rounded-2xl border border-[#EDE6DA] bg-white px-4 py-3 text-center text-sm font-semibold text-[#00205C]">
              {notice}
            </div>
          )}
        </div>

        {feedbackOpen && (
          <div className="absolute inset-0 z-30 flex items-end bg-[#001433]/70 p-3 backdrop-blur-sm sm:items-center sm:justify-center">
            <form onSubmit={submitFeedback} className="w-full rounded-[1.5rem] bg-white p-5 shadow-2xl sm:max-w-md">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="font-display text-2xl font-bold uppercase text-[#00205C]">Sugestão ou reclamação</h3>
                  <p className="mt-1 text-sm text-gray-500">Nome e telefone são opcionais.</p>
                </div>
                <button type="button" onClick={() => setFeedbackOpen(false)} className="rounded-full p-2 text-gray-500 hover:bg-gray-100">
                  <X className="size-5" />
                </button>
              </div>
              <div className="mt-4 space-y-3">
                <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Seu nome (opcional)" className="w-full rounded-xl border border-gray-200 px-4 py-3 text-base outline-none focus:border-[#42C8E5]" />
                <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Seu telefone (opcional)" inputMode="tel" className="w-full rounded-xl border border-gray-200 px-4 py-3 text-base outline-none focus:border-[#42C8E5]" />
                <textarea required rows={5} value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Escreva sua sugestão ou reclamação" className="w-full resize-none rounded-xl border border-gray-200 px-4 py-3 text-base outline-none focus:border-[#42C8E5]" />
              </div>
              <button type="submit" disabled={!message.trim()} className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-full bg-[#00205C] px-5 py-3 font-bold text-white transition hover:bg-[#003380] disabled:bg-[#00205C]/25">
                <Send className="size-4" /> Enviar pelo WhatsApp
              </button>
            </form>
          </div>
        )}
    </GoldkoSheet>
  );
}
