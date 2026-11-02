import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import {
  BookOpen,
  ChevronRight,
  MessageCircle,
  Package,
  Send,
  Star,
  Store,
  Truck,
  X,
} from "lucide-react";
import type { CustomerMenuLabels } from "@/lib/site-content";
import { GoldkoSheet, SheetHeader, Stamp, optionRowClass, primaryButtonClass } from "@/components/goldko-sheet";
import { trackEvent, currentStore, storeWhatsAppUrl, storeIfoodUrl } from "@/lib/tracking";
import { createFeedbackServerFn } from "@/lib/chat-leads.functions";

type CustomerAction = {
  key: keyof CustomerMenuLabels;
  icon: typeof Store;
  action: "whatsapp" | "delivery" | "fidelity" | "feedback" | "catalog" | "soon";
};

/** Linha de apoio embaixo de cada opção. */
const descriptions: Partial<Record<keyof CustomerMenuLabels, string>> = {
  store: "Pedidos, dúvidas e retirada",
  delivery: "Entrega onde você estiver",
  products: "Catálogo de produtos em PDF",
  menu: "Em breve",
};

const actions: CustomerAction[] = [
  { key: "store", icon: Store, action: "whatsapp" },
  { key: "delivery", icon: Truck, action: "delivery" },
  { key: "fidelity", icon: Star, action: "fidelity" },
  { key: "feedback", icon: MessageCircle, action: "feedback" },
  { key: "menu", icon: BookOpen, action: "soon" },
  { key: "products", icon: Package, action: "catalog" },
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
    window.open(`${storeWhatsAppUrl()}${suffix}`, "_blank", "noopener,noreferrer");
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
      window.open(storeIfoodUrl(), "_blank", "noopener,noreferrer");
      return;
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
    if (item.action === "catalog") {
      trackEvent("funnel_completed", { source: trackingSource, segment: "cliente", option: item.key });
      window.open("/documentos/catalogo-produtos-goldko.pdf", "_blank", "noopener,noreferrer");
      return;
    }
    setNotice(`${label} estará disponível em breve.`);
  }

  function submitFeedback(event: FormEvent) {
    event.preventDefault();
    if (!message.trim()) return;
    void createFeedbackServerFn({
      data: {
        nome: name.trim() || undefined,
        telefone: phone.trim() || undefined,
        mensagem: message.trim(),
        loja: currentStore(),
      },
    }).catch((err) => console.error("Falha ao salvar sugestão no CRM:", err));
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

        <div className="relative overflow-y-auto px-4 pb-7 pt-3 sm:px-7 sm:pb-8">
          <div className="flex flex-col gap-2.5">
            {visibleActions.map((item) => {
              const Icon = item.icon;
              const label = item.action === "delivery" ? "iFood" : labels[item.key];
              const editClass = isEditable ? "cursor-text outline-dashed hover:outline hover:outline-2 hover:outline-[#ff8515]" : "";

              // Sugestões ou reclamações: link discreto no fim da lista
              if (item.action === "feedback" && !isEditable) return null;

              // Cartão Fidelidade em destaque: borda azul e etiqueta do prêmio
              if (item.action === "fidelity") {
                return (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => editOrRun(item, label)}
                    title={isEditable ? `Clique para editar: ${label}` : undefined}
                    className={`${optionRowClass} border-[1.5px] border-[#51b2dc] py-3.5 ${editClass}`}
                  >
                    <Stamp><Icon className="size-5 fill-current" /></Stamp>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center justify-between gap-2">
                        <span className="text-base font-bold leading-snug text-[#0d2b40]">{label}</span>
                        <span className="shrink-0 rounded-[10px] bg-[#E7F4FA] px-2.5 py-1 text-[13px] font-bold text-[#0d2b40]">R$ 75</span>
                      </span>
                      <span className="mt-1 block text-[13px] leading-snug text-[#4f4f4a]">Seja um cliente fiel e ganhe R$ 75 em compras.</span>
                    </span>
                  </button>
                );
              }

              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => editOrRun(item, label)}
                  title={isEditable ? `Clique para editar: ${label}` : undefined}
                  className={`${optionRowClass} ${editClass}`}
                >
                  <Stamp><Icon className="size-5" /></Stamp>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[15px] font-bold leading-snug text-[#0d2b40]">{label}</span>
                    {descriptions[item.key] && <span className="mt-0.5 block text-[13px] text-[#4f4f4a]">{descriptions[item.key]}</span>}
                  </span>
                  <ChevronRight className="size-[18px] shrink-0 text-[#0d2b40] transition group-hover:translate-x-0.5" />
                </button>
              );
            })}
          </div>

          {!isEditable && (
            <button
              type="button"
              onClick={() => handleAction(actions.find((item) => item.action === "feedback")!, labels.feedback)}
              className="mx-auto mt-3 block px-2 py-2 text-[13px] font-semibold text-[#0d2b40] underline underline-offset-[3px]"
            >
              {labels.feedback}
            </button>
          )}

          {notice && (
            <div className="mt-3 rounded-[14px] border border-[#D9D6D0] bg-white px-4 py-3 text-center text-sm font-semibold text-[#0d2b40]">
              {notice}
            </div>
          )}
        </div>

        {feedbackOpen && (
          <div className="absolute inset-0 z-30 flex items-end bg-[#001433]/70 p-3 backdrop-blur-sm sm:items-center sm:justify-center">
            <form onSubmit={submitFeedback} className="w-full rounded-[1.25rem] bg-[#F6F5F3] p-5 shadow-2xl sm:max-w-md">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="gk-tag is-small"><span>Sugestão ou reclamação</span></h3>
                  <p className="mt-2 text-sm text-[#4f4f4a]">Nome e telefone são opcionais.</p>
                </div>
                <button type="button" aria-label="Fechar" onClick={() => setFeedbackOpen(false)} className="flex size-10 items-center justify-center rounded-xl bg-[#51b2dc] text-[#0d2b40]">
                  <X className="size-5" />
                </button>
              </div>
              <div className="mt-4 space-y-3">
                <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Seu nome (opcional)" className="w-full rounded-xl border border-[#D9D6D0] bg-white px-4 py-3 text-base outline-none focus:border-[#51b2dc]" />
                <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Seu telefone (opcional)" inputMode="tel" className="w-full rounded-xl border border-[#D9D6D0] bg-white px-4 py-3 text-base outline-none focus:border-[#51b2dc]" />
                <textarea required rows={5} value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Escreva sua sugestão ou reclamação" className="w-full resize-none rounded-xl border border-[#D9D6D0] bg-white px-4 py-3 text-base outline-none focus:border-[#51b2dc]" />
              </div>
              <button type="submit" disabled={!message.trim()} className={`mt-4 ${primaryButtonClass}`}>
                <Send className="size-4" /> Enviar
              </button>
            </form>
          </div>
        )}
    </GoldkoSheet>
  );
}
