import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowRight, ChevronRight, Check, Loader2, FileText, ExternalLink, MessageCircle, Heart, Building2, Leaf, X, type LucideIcon } from "lucide-react";
import { Stamp } from "@/components/goldko-sheet";
import { createChatLeadServerFn, createFeedbackServerFn } from "@/lib/chat-leads.functions";
import { trackEvent, currentStore, storeWhatsAppUrl, storeIfoodUrl, storeClubeNutriUrl, LARA_WHATSAPP } from "@/lib/tracking";

export type Segment = "cliente" | "empresa" | "clube_nutri";

interface ChatMessage {
  id: string;
  from: "bot" | "user";
  text: string;
  chips?: { label: string; value: string }[];
  /** Mostra as opções como cartões grandes (pergunta de perfil). */
  cards?: boolean;
  multiSelect?: boolean;
  resourceLinks?: { label: string; href: string }[];
}

type Step = "welcome" | "segment" | "client_menu" | "company" | "name" | "phone" | "q1" | "q2" | "done";

interface LeadData {
  segment: Segment | null;
  name: string;
  company: string;
  phone: string;
  email: string;
  qty: string;
  interests: string[];
}

const SEGMENTS: { value: Segment; label: string }[] = [
  { value: "cliente", label: "Sou cliente" },
  { value: "empresa", label: "Empresa" },
  { value: "clube_nutri", label: "Clube do Nutri" },
];

/** Visual dos cartões de perfil: ícone, cores e descrição curta. */
const SEGMENT_CARDS: Record<string, { description: string; Icon: LucideIcon; badge?: boolean }> = {
  cliente: { description: "Loja, iFood, fidelidade", Icon: Heart },
  empresa: { description: "Kits corporativos e eventos", Icon: Building2 },
  clube_nutri: { description: "Para nutricionistas", Icon: Leaf, badge: true },
};

const FIDELITY_URL = "https://app.fidelo.com.br/getpass/eavFmj?utm_source=qr";
const PRODUCTS_CATALOG_URL = "/documentos/catalogo-produtos-goldko.pdf";

/** Destino de cada interesse do Clube do Nutri (botão mostrado ao final do cadastro). */
function nutriResource(interest: string): { label: string; href: string } | undefined {
  const lara = (text: string) => `${LARA_WHATSAPP}?text=${encodeURIComponent(text)}`;
  const map: Record<string, { label: string; href: string }> = {
    parceria_comercial: {
      label: "Fale com o nosso relacionamento agora",
      href: lara("Olá! Sou nutricionista e gostaria de conversar sobre uma parceria comercial com a GoldKo."),
    },
    informacoes_clube_nutri: {
      label: "Ver como participar do Clube do Nutri",
      href: storeClubeNutriUrl(),
    },
    // TODO: trocar pelo PDF de vendas dos kits (Haila + Felipe)
    kits_exclusivos_nutricionistas: {
      label: "Conhecer os kits exclusivos",
      href: lara("Olá! Quero conhecer os kits e combos com valores exclusivos para nutricionistas."),
    },
    catalogo_produtos: {
      label: "Abrir catálogo de produtos",
      href: PRODUCTS_CATALOG_URL,
    },
  };
  return map[interest];
}

const CLIENT_PATHS = [
  { label: "Falar com a loja", value: "store" },
  { label: "iFood", value: "delivery" },
  { label: "Cartão Fidelidade", value: "fidelity" },
  { label: "Nosso cardápio", value: "menu" },
  { label: "Nossos produtos", value: "products" },
  { label: "Sugestões ou reclamações", value: "feedback" },
];

const SEGMENT_QUESTIONS: Record<
  Segment,
  {
    q1: string;
    q1Placeholder: string;
    q1Chips: string[];
    q2: string;
    q2Options: { label: string; value: string }[];
  }
> = {
  cliente: {
    q1: "Quantas pessoas têm na sua família?",
    q1Placeholder: "Ex: 3 pessoas",
    q1Chips: ["1 ou 2", "3 ou 4", "5 ou mais"],
    q2: "O que mais te atrai na GoldKo? (pode escolher mais de uma opção)",
    q2Options: [
      { label: "Chocolates Zero Açúcar", value: "chocolates_zero" },
      { label: "Cafeteria & Sobremesas", value: "cafeteria" },
      { label: "Presentes e Kits", value: "presentes" },
      { label: "Clube de Benefícios", value: "beneficios" },
    ],
  },
  empresa: {
    q1: "Quantos colaboradores tem a sua empresa?",
    q1Placeholder: "Ex: 50 colaboradores",
    q1Chips: ["Até 10", "11 a 50", "51 a 200", "Mais de 200", "Prefiro não informar"],
    q2: "O que sua empresa procura? (pode escolher mais de uma opção)",
    q2Options: [
      { label: "Cestas & Kits Corporativos", value: "kits_corporativos" },
      { label: "Fornecimento Recorrente", value: "fornecimento" },
      { label: "Eventos & Datas Especiais", value: "eventos" },
    ],
  },
  clube_nutri: {
    q1: "Qual sua média de pacientes mensais?",
    q1Placeholder: "Ex: 30 pacientes por mês",
    q1Chips: ["Menos de 20", "20 a 50", "51 a 100", "Mais de 100", "Prefiro não informar"],
    q2: "O que mais te interessa no Clube do Nutri? (pode escolher mais de uma opção)",
    q2Options: [
      { label: "Parceria comercial", value: "parceria_comercial" },
      { label: "Como participar do Clube", value: "informacoes_clube_nutri" },
      { label: "Kits e combos exclusivos", value: "kits_exclusivos_nutricionistas" },
      { label: "Catálogo de produtos", value: "catalogo_produtos" },
    ],
  },
};

const SEGMENT_GREETINGS: Record<Segment, { title: string; subtitle: string; chatTitle: string }> = {
  clube_nutri: {
    title: "Olá! Seja bem-vindo(a) ao **Clube do Nutri GoldKo**.",
    subtitle: "Soluções e benefícios pensados especialmente para nutricionistas e profissionais da saúde.",
    chatTitle: "Clube do Nutri",
  },
  empresa: {
    title: "Olá! Seja bem-vindo(a) à **GoldKo para Empresas**.",
    subtitle: "Presentes corporativos e parcerias sob medida para a sua empresa.",
    chatTitle: "Para Empresas",
  },
  cliente: {
    title: "Olá! Seja bem-vindo(a) à **GoldKo**.",
    subtitle: "Muito sabor sem culpa: delícias artesanais sem adição de açúcares para o seu dia a dia.",
    chatTitle: "Cliente GoldKo",
  },
};

let msgIdCounter = 0;
function mkId() {
  return `msg-${++msgIdCounter}-${Date.now()}`;
}
function botMsg(text: string, extra?: Partial<ChatMessage>): ChatMessage {
  return { id: mkId(), from: "bot", text, ...extra };
}
function userMsg(text: string): ChatMessage {
  return { id: mkId(), from: "user", text };
}
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/** Empresa pode responder com WhatsApp ou e-mail; os outros perfis só com WhatsApp. */
function parseContact(raw: string, allowEmail: boolean): { phone: string; email: string } | null {
  const value = raw.trim();
  if (allowEmail && value.includes("@")) {
    return EMAIL_RE.test(value) ? { phone: "", email: value.toLowerCase() } : null;
  }
  const digits = value.replace(/\D/g, "");
  return digits.length >= 10 && digits.length <= 13 ? { phone: digits, email: "" } : null;
}

function contactLabel(lead: { phone: string; email: string }) {
  return lead.phone ? `WhatsApp **${formatPhone(lead.phone)}**` : `e-mail **${lead.email}**`;
}

function formatPhone(digits: string): string {
  if (digits.length === 11) return `(${digits.slice(0, 2)}) ${digits[2]} ${digits.slice(3, 7)}-${digits.slice(7)}`;
  if (digits.length === 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  return digits;
}

/** Mascote dentro do selo recortado (só na mensagem mais recente da assistente). */
function MascotStamp() {
  return (
    <span className="gk-stamp" style={{ width: 40, height: 40 }} aria-hidden="true">
      <span style={{ width: 32, height: 32 }}>
        <img src="/chat-avatar-goldko.png" alt="" className="h-full w-full rounded-full object-contain" />
      </span>
    </span>
  );
}

function TypingIndicator() {
  return (
    <div className="flex items-end gap-2.5 animate-in fade-in duration-200">
      <MascotStamp />
      <div className="rounded-[14px] rounded-bl-[4px] border border-[#D9D6D0] bg-white px-4 py-3.5">
        <div className="flex items-center gap-1.5">
          <div className="size-2 rounded-full bg-[#51b2dc]" style={{ animation: "bounce 1.2s infinite", animationDelay: "0s" }} />
          <div className="size-2 rounded-full bg-[#51b2dc]" style={{ animation: "bounce 1.2s infinite", animationDelay: "0.2s" }} />
          <div className="size-2 rounded-full bg-[#51b2dc]" style={{ animation: "bounce 1.2s infinite", animationDelay: "0.4s" }} />
        </div>
      </div>
    </div>
  );
}

function MessageBubble({
  msg,
  step,
  selectedChips,
  onChipClick,
  showAvatar = false,
}: {
  msg: ChatMessage;
  step: Step;
  selectedChips: string[];
  onChipClick: (v: string) => void;
  showAvatar?: boolean;
}) {
  const isBot = msg.from === "bot";
  const chipsActive =
    (step === "segment" && !msg.multiSelect) ||
    (step === "client_menu" && !msg.multiSelect) ||
    (step === "q1" && !msg.multiSelect) ||
    (step === "q2" && msg.multiSelect);

  return (
    <div className={`flex gap-2.5 ${isBot ? "items-start" : "flex-row-reverse items-end"} animate-in fade-in slide-in-from-bottom-2 duration-300`}>
      {isBot && (showAvatar ? <span className="mt-1"><MascotStamp /></span> : <span aria-hidden="true" className="w-10 shrink-0" />)}
      <div className={`max-w-[86%] ${isBot ? "" : "items-end flex flex-col"}`}>
        <div
          className={`rounded-[14px] px-4 py-3 text-[15px] leading-relaxed [&_strong]:font-bold ${
            isBot
              ? "rounded-bl-[4px] border border-[#D9D6D0] bg-white text-[#4f4f4a] [&_strong]:text-[#0d2b40]"
              : "rounded-br-[4px] bg-[#51b2dc] font-semibold text-[#0d2b40]"
          }`}
          dangerouslySetInnerHTML={{ __html: msg.text.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>").replace(/\n/g, "<br/>") }}
        />
        {msg.chips && msg.cards && (
          <div className="mt-3 flex flex-col gap-2.5">
            {msg.chips.map((chip) => {
              const card = SEGMENT_CARDS[chip.value];
              const isSel = selectedChips.includes(chip.value);
              const disabled = !chipsActive;
              const Icon = card?.Icon ?? Heart;
              return (
                <button
                  key={chip.value}
                  type="button"
                  onClick={() => !disabled && onChipClick(chip.value)}
                  disabled={disabled}
                  className={`flex w-full items-center gap-3 rounded-[14px] border bg-white p-3 text-left transition-all duration-150 ${
                    isSel
                      ? "border-[1.5px] border-[#51b2dc]"
                      : disabled
                        ? "cursor-default border-[#D9D6D0] opacity-50"
                        : "cursor-pointer border-[#D9D6D0] hover:border-[#51b2dc] active:scale-[0.99]"
                  }`}
                >
                  <Stamp><Icon className="size-5" /></Stamp>
                  <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <span className="text-[15px] font-bold text-[#0d2b40]">{chip.label}</span>
                    {card &&
                      (card.badge ? (
                        <span className="mt-1 self-start rounded-md bg-[#E5F3EA] px-2 py-0.5 text-[11px] font-semibold text-[#23613F]">{card.description}</span>
                      ) : (
                        <span className="text-[13px] text-[#4f4f4a]">{card.description}</span>
                      ))}
                  </span>
                  {isSel ? <Check className="size-[18px] shrink-0 text-[#0d2b40]" /> : <ChevronRight className="size-[18px] shrink-0 text-[#0d2b40]" />}
                </button>
              );
            })}
          </div>
        )}
        {msg.chips && !msg.cards && (
          <div className="mt-2.5 flex flex-wrap gap-2">
            {msg.chips.map((chip) => {
              const isSel = selectedChips.includes(chip.value);
              const disabled = !chipsActive;
              return (
                <button
                  key={chip.value}
                  onClick={() => !disabled && onChipClick(chip.value)}
                  disabled={disabled}
                  className={`inline-flex min-h-[38px] items-center gap-1.5 rounded-[10px] border-[1.5px] px-3.5 py-2 text-sm font-semibold leading-none transition-all duration-150 ${
                    isSel
                      ? "border-[#51b2dc] bg-[#51b2dc] text-[#0d2b40]"
                      : disabled
                        ? "cursor-default border-[#E2DED8] bg-white text-[#8A8A84]"
                        : "cursor-pointer border-[#CFE6F2] bg-white text-[#0d2b40] hover:border-[#51b2dc] hover:bg-[#E7F4FA] active:scale-[0.97]"
                  }`}
                >
                  {isSel && <Check className="size-3.5 shrink-0" />}
                  {chip.label}
                </button>
              );
            })}
          </div>
        )}
        {msg.resourceLinks && msg.resourceLinks.length > 0 && (
          <div className="mt-2 grid gap-2">
            {msg.resourceLinks.map((resource) => (
              <a
                key={`${resource.label}-${resource.href}`}
                href={resource.href}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => {
                  void trackEvent("program_resource_click", {
                    section: "chat_lead",
                    source: "chat",
                    segment: "clube_nutri",
                    label: resource.label,
                    destination: resource.href,
                    resource_type: "pdf",
                  });
                }}
                className="flex items-center gap-3 rounded-[14px] border border-[#D9D6D0] bg-white px-3 py-2.5 text-left text-sm font-semibold text-[#0d2b40] transition hover:border-[#51b2dc] active:scale-[0.99]"
              >
                <Stamp small><FileText className="size-4" /></Stamp>
                <span className="min-w-0 flex-1">{resource.label}</span>
                <ExternalLink className="size-4 shrink-0" />
              </a>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export function ChatLead({
  open,
  onClose,
  initialSegment,
  trackingSource = "general",
  onOpenCustomerMenu,
}: {
  open: boolean;
  onClose: () => void;
  initialSegment?: Segment;
  trackingSource?: "hero" | "help_card" | "general";
  onOpenCustomerMenu?: () => void;
}) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [step, setStep] = useState<Step>("welcome");
  const [lead, setLead] = useState<LeadData>({ segment: null, name: "", company: "", phone: "", email: "", qty: "", interests: [] });
  const [inputValue, setInputValue] = useState("");
  const [contactError, setContactError] = useState("");
  const [typing, setTyping] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedOk, setSavedOk] = useState(false);
  const [selectedChips, setSelectedChips] = useState<string[]>([]);
  const [lastChipMsgId, setLastChipMsgId] = useState<string | null>(null);
  const [viewportBox, setViewportBox] = useState({ height: 0, offsetTop: 0 });
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [feedbackName, setFeedbackName] = useState("");
  const [feedbackPhone, setFeedbackPhone] = useState("");
  const [feedbackMessage, setFeedbackMessage] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const abandonmentTrackedRef = useRef(false);

  const closeAsAbandoned = useCallback(() => {
    if (!savedOk && !abandonmentTrackedRef.current) {
      abandonmentTrackedRef.current = true;
      trackEvent("chat_abandoned", { source: trackingSource, segment: lead.segment });
    }
    onClose();
  }, [lead.segment, onClose, savedOk, trackingSource]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, typing]);

  useEffect(() => {
    if (!open) return;
    abandonmentTrackedRef.current = false;
    trackEvent("chat_opened", { source: trackingSource, segment: initialSegment || null });
  }, [open, initialSegment, trackingSource]);

  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeAsAbandoned();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, closeAsAbandoned]);

  useEffect(() => {
    if (!open || typeof window === "undefined") return;
    const visualViewport = window.visualViewport;
    const updateViewport = () => {
      setViewportBox({
        height: Math.round(visualViewport?.height || window.innerHeight),
        offsetTop: Math.round(visualViewport?.offsetTop || 0),
      });
    };
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    updateViewport();
    visualViewport?.addEventListener("resize", updateViewport);
    visualViewport?.addEventListener("scroll", updateViewport);
    window.addEventListener("resize", updateViewport);
    return () => {
      document.body.style.overflow = previousOverflow;
      visualViewport?.removeEventListener("resize", updateViewport);
      visualViewport?.removeEventListener("scroll", updateViewport);
      window.removeEventListener("resize", updateViewport);
    };
  }, [open]);

  useEffect(() => {
    if (["company", "name", "phone", "q1"].includes(step)) {
      setTimeout(() => inputRef.current?.focus(), 350);
    }
  }, [step]);

  const pushBot = useCallback((text: string, extra?: Partial<ChatMessage>, nextStep?: Step) => {
    setTyping(true);
    const delay = Math.min(500 + text.length * 8, 1600);
    setTimeout(() => {
      const msg = botMsg(text, extra);
      setMessages((prev) => [...prev, msg]);
      if (extra?.chips) setLastChipMsgId(msg.id);
      setTyping(false);
      if (nextStep) setStep(nextStep);
    }, delay);
  }, []);

  const addUserMsg = useCallback((text: string) => {
    setMessages((prev) => [...prev, userMsg(text)]);
  }, []);

  // Inicializa o chat sempre que for aberto ou mudar o segmento inicial
  useEffect(() => {
    if (!open) return;
    setMessages([]);
    setInputValue("");
    setContactError("");
    setSelectedChips([]);
    setLastChipMsgId(null);
    setSavedOk(false);
    setFeedbackOpen(false);
    setFeedbackName("");
    setFeedbackPhone("");
    setFeedbackMessage("");

    if (initialSegment) {
      // Segmento pré-selecionado (ex: clicou no card Clube do Nutri ou Empresas)
      setLead({ segment: initialSegment, name: "", company: "", phone: "", email: "", qty: "", interests: [] });
      setStep("welcome");
      const info = SEGMENT_GREETINGS[initialSegment];
      setTimeout(() => {
        if (initialSegment === "cliente") {
          pushBot(
            `${info.title}\n${info.subtitle}\n\nComo podemos te ajudar hoje?`,
            { chips: CLIENT_PATHS },
            "client_menu",
          );
          return;
        }
        if (initialSegment === "empresa") {
          pushBot(`${info.title}\n${info.subtitle}\n\nPara começarmos, qual é o nome da sua **empresa**?`, {}, "company");
          return;
        }
        pushBot(`${info.title}\n${info.subtitle}\n\nPara começarmos, qual é o seu **nome**?`, {}, "name");
      }, 350);
    } else {
      // Nenhum segmento pré-selecionado (ex: clicou no botão geral da Hero ou Header)
      setLead({ segment: null, name: "", company: "", phone: "", email: "", qty: "", interests: [] });
      setStep("welcome");
      setTimeout(() => {
        pushBot(
          "**Oi! Que bom te ver por aqui.**\nChocolate muito gostoso e sem culpa. Pra eu te ajudar do jeito certo, escolhe uma opção:",
          { chips: SEGMENTS.map((s) => ({ label: s.label, value: s.value })), cards: true },
          "segment"
        );
      }, 350);
    }
  }, [open, initialSegment, pushBot]);

  const handleSegmentSelect = useCallback(
    (value: string) => {
      const seg = value as Segment;
      trackEvent("segment_selected", { source: "chat", segment: seg });
      const info = SEGMENTS.find((s) => s.value === seg);
      addUserMsg(info?.label || value);
      if (seg === "cliente" && onOpenCustomerMenu) {
        onClose();
        onOpenCustomerMenu();
        return;
      }
      setLead((prev) => ({ ...prev, segment: seg }));
      const greeting = SEGMENT_GREETINGS[seg];
      if (seg === "cliente") {
        pushBot(
          `${greeting.title}\n${greeting.subtitle}\n\nComo podemos te ajudar hoje?`,
          { chips: CLIENT_PATHS },
          "client_menu",
        );
        return;
      }
      pushBot(`${greeting.title}\n${greeting.subtitle}`);
      if (seg === "empresa") {
        setTimeout(() => pushBot("Para começarmos, qual é o nome da sua **empresa**?", {}, "company"), 1400);
        return;
      }
      setTimeout(() => pushBot("Qual é o seu **nome**?", {}, "name"), 1400);
    },
    [addUserMsg, onClose, onOpenCustomerMenu, pushBot]
  );

  const handleClientPath = useCallback(
    (value: string) => {
      const option = CLIENT_PATHS.find((item) => item.value === value);
      addUserMsg(option?.label || value);

      if (value === "store") {
        window.open(storeWhatsAppUrl(), "_blank", "noopener,noreferrer");
        pushBot("Abrimos o WhatsApp da loja para você. Se não abriu, permita a abertura de uma nova guia.");
        return;
      }
      if (value === "delivery") {
        window.open(storeIfoodUrl(), "_blank", "noopener,noreferrer");
        pushBot("Abrimos a GoldKo no iFood para você.");
        return;
      }
      if (value === "fidelity") {
        window.open(FIDELITY_URL, "_blank", "noopener,noreferrer");
        pushBot("Abrimos a página do Cartão Fidelidade para você.");
        return;
      }
      if (value === "feedback") {
        setFeedbackOpen(true);
        return;
      }
      if (value === "products") {
        window.open(PRODUCTS_CATALOG_URL, "_blank", "noopener,noreferrer");
        pushBot("Abrimos o nosso catálogo de produtos para você.");
        return;
      }

      const unavailable: Record<string, string> = {
        menu: "Nosso cardápio",
      };
      pushBot(`${unavailable[value] || "Este conteúdo"} estará disponível em breve. Enquanto isso, você pode falar diretamente com a nossa loja pelo WhatsApp.`);
    },
    [addUserMsg, pushBot],
  );

  const handleNameSubmit = useCallback(
    (name: string) => {
      if (!name.trim() || name.trim().length < 2) return;
      addUserMsg(name.trim());
      setLead((prev) => ({ ...prev, name: name.trim() }));
      setInputValue("");
      const contactAsk =
        lead.segment === "empresa"
          ? "Agora preciso do seu **WhatsApp** (com DDD) para contato ou do seu **e-mail**, o que preferir:"
          : "Agora preciso do seu **WhatsApp** (com DDD) para contato:";
      pushBot(`Prazer, **${name.trim()}**!\n${contactAsk}`, {}, "phone");
    },
    [addUserMsg, lead.segment, pushBot]
  );

  const handleCompanySubmit = useCallback(
    (company: string) => {
      if (company.trim().length < 2) return;
      addUserMsg(company.trim());
      setLead((prev) => ({ ...prev, company: company.trim() }));
      setInputValue("");
      pushBot(`Ótimo, anotado: **${company.trim()}**.\nE qual é o seu **nome**?`, {}, "name");
    },
    [addUserMsg, pushBot]
  );

  const handlePhoneSubmit = useCallback(
    (raw: string) => {
      if (!lead.segment) return;
      const allowEmail = lead.segment === "empresa";
      const contact = parseContact(raw, allowEmail);
      if (!contact) {
        setContactError(
          allowEmail
            ? "Digite um WhatsApp com DDD, como (64) 99999-9999, ou um e-mail válido."
            : "Digite um WhatsApp com DDD, como (64) 99999-9999.",
        );
        return;
      }
      setContactError("");
      addUserMsg(contact.phone ? formatPhone(contact.phone) : contact.email);
      setInputValue("");
      setLead((prev) => ({ ...prev, phone: contact.phone, email: contact.email }));
      const q = SEGMENT_QUESTIONS[lead.segment];
      pushBot(
        q.q1,
        { chips: q.q1Chips.map((c) => ({ label: c, value: c })) },
        "q1"
      );
    },
    [addUserMsg, lead.segment, pushBot]
  );

  const handleQ1Submit = useCallback(
    (qty: string) => {
      if (!qty.trim() || !lead.segment) return;
      addUserMsg(qty.trim());
      setInputValue("");
      setLead((prev) => ({ ...prev, qty: qty.trim() }));
      const q = SEGMENT_QUESTIONS[lead.segment];
      pushBot(q.q2, { chips: q.q2Options, multiSelect: true }, "q2");
    },
    [addUserMsg, lead.segment, pushBot]
  );

  const handleQ2Confirm = useCallback(async () => {
    const q = SEGMENT_QUESTIONS[lead.segment!];
    const labels = selectedChips.map((v) => q.q2Options.find((o) => o.value === v)?.label || v).join(", ");
    addUserMsg(labels || "Nenhum selecionado");
    const finalLead = { ...lead, interests: selectedChips };
    const resourceLinks =
      finalLead.segment === "clube_nutri"
        ? finalLead.interests.map((interest) => nutriResource(interest)).filter((r): r is { label: string; href: string } => Boolean(r))
        : [];
    setLead(finalLead);
    setSelectedChips([]);
    setSaving(true);
    pushBot("Perfeito! Deixa eu registrar seus dados…", {}, "done");

    try {
      await createChatLeadServerFn({
        data: {
          nome: finalLead.name,
          empresa: finalLead.company || undefined,
          whatsapp: finalLead.phone || undefined,
          email: finalLead.email || undefined,
          tipo: finalLead.segment!,
          quantidade: finalLead.qty,
          interesses: finalLead.interests,
          loja: currentStore(),
        },
      });
      trackEvent("funnel_completed", { source: trackingSource, segment: finalLead.segment });
      trackEvent("lead_submit", { source: trackingSource, segment: finalLead.segment, form_name: "chat_lead" });
      setSavedOk(true);
      setTimeout(
        () =>
          pushBot(
            `Tudo certo, **${finalLead.name}**!\nNossa equipe já recebeu suas informações e vai entrar em contato com você pelo ${contactLabel(finalLead)}.${resourceLinks.length > 0 ? "\n\nOs materiais que você selecionou estão disponíveis abaixo:" : ""}\n\nObrigado pela preferência!`,
            resourceLinks.length > 0 ? { resourceLinks } : undefined,
          ),
        1000
      );
    } catch (error) {
      console.error("Não foi possível cadastrar o lead do chat:", error);
      pushBot(
        `Houve um probleminha ao salvar seus dados. Tente novamente ou fale com a gente pelo WhatsApp.${
          resourceLinks.length > 0 ? "\n\nMesmo assim, você já pode acessar os materiais selecionados:" : ""
        }`,
        resourceLinks.length > 0 ? { resourceLinks } : undefined,
      );
    } finally {
      setSaving(false);
    }
  }, [lead, selectedChips, addUserMsg, pushBot, trackingSource]);

  const handleChipClick = useCallback(
    (value: string) => {
      if (step === "segment") {
        handleSegmentSelect(value);
      } else if (step === "client_menu") {
        handleClientPath(value);
      } else if (step === "q1") {
        handleQ1Submit(value);
      } else if (step === "q2") {
        setSelectedChips((prev) =>
          prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]
        );
      }
    },
    [step, handleSegmentSelect, handleClientPath, handleQ1Submit]
  );

  const submitFeedback = useCallback(
    (event: React.FormEvent) => {
      event.preventDefault();
      if (!feedbackMessage.trim()) return;
      void createFeedbackServerFn({
        data: {
          nome: feedbackName.trim() || undefined,
          telefone: feedbackPhone.trim() || undefined,
          mensagem: feedbackMessage.trim(),
          loja: currentStore(),
        },
      }).catch((err) => console.error("Falha ao salvar sugestão no CRM:", err));
      const parts = [
        "Olá! Quero enviar uma sugestão ou reclamação para a GoldKo.",
        feedbackName.trim() ? `Nome: ${feedbackName.trim()}` : "Nome: não informado",
        feedbackPhone.trim() ? `Telefone: ${feedbackPhone.trim()}` : "Telefone: não informado",
        `Mensagem: ${feedbackMessage.trim()}`,
      ];
      window.open(`${storeWhatsAppUrl()}?text=${encodeURIComponent(parts.join("\n"))}`, "_blank", "noopener,noreferrer");
      setFeedbackOpen(false);
      setFeedbackName("");
      setFeedbackPhone("");
      setFeedbackMessage("");
      pushBot("Obrigado! Abrimos o WhatsApp com sua mensagem pronta para envio.");
    },
    [feedbackMessage, feedbackName, feedbackPhone, pushBot],
  );

  const handleTextSubmit = useCallback(() => {
    const val = inputValue.trim();
    if (!val) return;
    if (step === "company") handleCompanySubmit(val);
    else if (step === "name") handleNameSubmit(val);
    else if (step === "phone") handlePhoneSubmit(val);
    else if (step === "q1") handleQ1Submit(val);
  }, [inputValue, step, handleCompanySubmit, handleNameSubmit, handlePhoneSubmit, handleQ1Submit]);

  if (!open) return null;

  // Passo atual de 4 (mostrado no topo do chat).
  const stepNumberByStep: Record<Step, number> = {
    welcome: 1, segment: 1, client_menu: 2, company: 2, name: 2, phone: 3, q1: 3, q2: 4, done: 4,
  };
  const currentStepNumber = stepNumberByStep[step];
  const TOTAL_STEPS = 4;
  const companyInterestLabels = lead.interests
    .map((value) => SEGMENT_QUESTIONS.empresa.q2Options.find((option) => option.value === value)?.label || value)
    .join(", ");
  const companyWhatsAppHref = `${LARA_WHATSAPP}?text=${encodeURIComponent(
    [
      `Olá! Sou ${lead.name || "um representante"}${lead.company ? `, da empresa ${lead.company}` : ""}.`,
      "Acabei de me cadastrar no site da GoldKo e tenho interesse no atendimento para empresas.",
      companyInterestLabels ? `Interesses: ${companyInterestLabels}.` : "",
      lead.qty ? `Número de colaboradores: ${lead.qty}.` : "",
    ]
      .filter(Boolean)
      .join("\n"),
  )}`;
  const showTextInput = ["company", "name", "phone", "q1"].includes(step);
  const lastBotMsgId = [...messages].reverse().find((msg) => msg.from === "bot")?.id;
  const showMultiConfirm = step === "q2";
  const contactAllowsEmail = step === "phone" && lead.segment === "empresa";
  const inputPlaceholder =
    step === "company"
      ? "Nome da empresa"
      : step === "name"
      ? "Digite seu nome completo…"
      : step === "phone"
      ? contactAllowsEmail
        ? "(64) 99999-9999 ou voce@empresa.com.br"
        : "Ex: (64) 99999-9999"
      : lead.segment
      ? SEGMENT_QUESTIONS[lead.segment].q1Placeholder
      : "Digite sua resposta…";

  return (
    <div
      className="fixed left-0 right-0 z-[200] flex items-end justify-center overflow-hidden p-0 sm:items-center sm:p-4"
      style={{
        top: viewportBox.offsetTop,
        height: viewportBox.height || "100dvh",
        background: "rgba(0,20,51,0.7)",
        backdropFilter: "blur(4px)",
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) closeAsAbandoned();
      }}
    >
      <div
        className="relative flex h-full w-full max-w-lg flex-col overflow-hidden rounded-none bg-[#F6F5F3] text-[#0d2b40] shadow-2xl animate-in fade-in slide-in-from-bottom-4 duration-300 sm:h-[min(700px,96dvh)] sm:rounded-[1.5rem]"
      >
        {feedbackOpen && (
          <div className="absolute inset-0 z-50 flex items-end bg-[#001433]/70 p-3 backdrop-blur-sm sm:items-center sm:justify-center">
            <form onSubmit={submitFeedback} className="w-full rounded-[1.25rem] bg-[#F6F5F3] p-5 shadow-2xl sm:max-w-md">
              <h3 className="gk-tag is-small"><span>Sugestão ou reclamação</span></h3>
              <p className="mt-1 text-sm text-gray-500">Nome e telefone são opcionais.</p>
              <div className="mt-4 space-y-3">
                <input
                  value={feedbackName}
                  onChange={(event) => setFeedbackName(event.target.value)}
                  placeholder="Seu nome (opcional)"
                  className="w-full rounded-xl border border-[#D9D6D0] bg-white px-4 py-3 text-base outline-none focus:border-[#51b2dc]"
                />
                <input
                  value={feedbackPhone}
                  onChange={(event) => setFeedbackPhone(event.target.value)}
                  placeholder="Seu telefone (opcional)"
                  inputMode="tel"
                  className="w-full rounded-xl border border-[#D9D6D0] bg-white px-4 py-3 text-base outline-none focus:border-[#51b2dc]"
                />
                <textarea
                  required
                  rows={5}
                  value={feedbackMessage}
                  onChange={(event) => setFeedbackMessage(event.target.value)}
                  placeholder="Escreva sua sugestão ou reclamação"
                  className="w-full resize-none rounded-xl border border-[#D9D6D0] bg-white px-4 py-3 text-base outline-none focus:border-[#51b2dc]"
                />
              </div>
              <div className="mt-4 flex justify-end gap-2">
                <button type="button" onClick={() => setFeedbackOpen(false)} className="rounded-xl border-[1.5px] border-[#51b2dc] bg-white px-5 py-2.5 text-sm font-bold text-[#0d2b40]">Cancelar</button>
                <button type="submit" disabled={!feedbackMessage.trim()} className="rounded-xl bg-[#51b2dc] px-5 py-2.5 text-sm font-bold text-[#0d2b40] disabled:opacity-50">Enviar</button>
              </div>
            </form>
          </div>
        )}
        {/* CABEÇALHO: etiqueta-ticket + passos (estilo do cardápio online) */}
        <header className="relative z-10 flex shrink-0 flex-col gap-3 border-b border-[#E2DED8] bg-[#F6F5F3] px-4 pt-4 pb-3.5">
          <div className="flex items-center justify-between gap-3">
            <h2 className="gk-tag min-w-0">
              <span className="truncate">{lead.segment ? SEGMENT_GREETINGS[lead.segment].chatTitle : "Assistente GoldKo"}</span>
              <i aria-hidden="true" />
            </h2>
            <button
              type="button"
              onClick={closeAsAbandoned}
              aria-label="Fechar"
              className="flex size-[46px] shrink-0 items-center justify-center rounded-xl bg-[#51b2dc] text-[#0d2b40] transition hover:bg-[#6cc0e4]"
            >
              <X className="size-5" />
            </button>
          </div>
          <div className="flex items-center gap-2.5">
            <div className="grid flex-1 grid-cols-4 gap-1" aria-hidden="true">
              {Array.from({ length: TOTAL_STEPS }, (_, index) => (
                <div
                  key={index}
                  className={`h-[5px] rounded-full transition-colors duration-300 ${
                    index + 1 < currentStepNumber
                      ? "bg-[#0d2b40]"
                      : index + 1 === currentStepNumber
                        ? "bg-[#51b2dc]"
                        : "bg-[#E2DED8]"
                  }`}
                />
              ))}
            </div>
            <span className="text-xs font-semibold text-[#4f4f4a]">
              Passo {currentStepNumber} de {TOTAL_STEPS}
            </span>
          </div>
        </header>

        {/* MENSAGENS */}
        <div className="relative min-h-0 flex-1 bg-[#F6F5F3]">
        <div className="relative h-full overflow-y-auto overscroll-contain px-4 pb-5 pt-6 space-y-4 sm:px-5">
          {messages.map((msg) => (
            <MessageBubble
              key={msg.id}
              msg={msg}
              step={step}
              selectedChips={msg.id === lastChipMsgId ? selectedChips : []}
              onChipClick={handleChipClick}
              showAvatar={!typing && msg.id === lastBotMsgId}
            />
          ))}
          {typing && <TypingIndicator />}
          {step === "done" && savedOk && !typing && (
            <div className="flex justify-center gap-3 pt-3 animate-in fade-in slide-in-from-bottom-3 duration-300">
              {lead.segment === "empresa" ? (
                <a
                  href={companyWhatsAppHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => {
                    void trackEvent("chat_whatsapp_click", {
                      section: "chat_lead",
                      source: trackingSource,
                      segment: "empresa",
                      label: "Falar no WhatsApp",
                      destination: LARA_WHATSAPP,
                    });
                  }}
                  className="inline-flex items-center gap-2 rounded-xl bg-[#51b2dc] px-5 py-3 text-sm font-bold text-[#0d2b40] transition-colors hover:bg-[#6cc0e4]"
                >
                  <MessageCircle className="size-4" /> Falar no WhatsApp
                </a>
              ) : (
                <a
                  href="#descubra"
                  onClick={onClose}
                  className="inline-flex items-center gap-2 rounded-xl bg-[#51b2dc] px-5 py-3 text-sm font-bold text-[#0d2b40] transition-colors hover:bg-[#6cc0e4]"
                >
                  Conhecer produtos <ChevronRight className="size-4" />
                </a>
              )}
              <button
                onClick={onClose}
                className="inline-flex items-center gap-2 rounded-xl border-[1.5px] border-[#51b2dc] bg-white px-5 py-3 text-sm font-bold text-[#0d2b40] transition-colors hover:bg-[#E7F4FA]"
              >
                Fechar
              </button>
            </div>
          )}
          <div ref={bottomRef} />
        </div>
        </div>

        {/* ÁREA DE ENTRADA / BOTÕES */}
        {(showTextInput || showMultiConfirm) && (
          <div className="relative z-10 shrink-0 border-t border-[#E2DED8] bg-[#F6F5F3] px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
            {showTextInput ? (
              <>
              <form
                className="flex items-center gap-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  handleTextSubmit();
                }}
              >
                <input
                  ref={inputRef}
                  value={inputValue}
                  onChange={(e) => {
                    setInputValue(e.target.value);
                    if (contactError) setContactError("");
                  }}
                  onFocus={() => {
                    requestAnimationFrame(() =>
                      bottomRef.current?.scrollIntoView({ behavior: "auto", block: "end" }),
                    );
                  }}
                  placeholder={inputPlaceholder}
                  className="h-12 flex-1 rounded-xl border border-[#D9D6D0] bg-white px-3.5 text-base text-[#0d2b40] outline-none transition-colors placeholder:text-[#8A8A84] focus:border-[#51b2dc] focus:ring-2 focus:ring-[#51b2dc]/25 sm:text-sm"
                  style={{ fontSize: "16px" }}
                  autoComplete={step === "company" ? "organization" : step === "phone" ? (contactAllowsEmail ? "on" : "tel") : "name"}
                  inputMode={contactAllowsEmail ? "email" : step === "phone" || step === "q1" ? "numeric" : "text"}
                />
                <button
                  type="submit"
                  disabled={!inputValue.trim()}
                  className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-[#51b2dc] text-[#0d2b40] transition hover:bg-[#6cc0e4] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <ArrowRight className="size-5" />
                </button>
              </form>
              {contactError && <p role="alert" className="px-2 pt-2 text-xs font-medium text-red-600">{contactError}</p>}
              </>
            ) : (
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs font-medium text-[#4f4f4a]">
                  {selectedChips.length === 0
                    ? "Selecione ao menos uma opção"
                    : `${selectedChips.length} opção(ões) selecionada(s)`}
                </p>
                <button
                  onClick={handleQ2Confirm}
                  disabled={selectedChips.length === 0 || saving}
                  className="inline-flex items-center gap-2 rounded-xl bg-[#51b2dc] px-5 py-3 text-sm font-bold text-[#0d2b40] transition hover:bg-[#6cc0e4] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {saving ? (
                    <>
                      <Loader2 className="size-4 animate-spin" /> Enviando…
                    </>
                  ) : (
                    <>
                      <Check className="size-4" /> Continuar atendimento
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
