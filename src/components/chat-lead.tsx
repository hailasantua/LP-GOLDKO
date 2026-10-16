import { useCallback, useEffect, useRef, useState } from "react";
import { Send, ChevronRight, Check, Loader2, FileText, ExternalLink } from "lucide-react";
import { CloseButton, GoldkoAvatar } from "@/components/goldko-sheet";
import { createChatLeadServerFn } from "@/lib/chat-leads.functions";
import { trackEvent } from "@/lib/tracking";

export type Segment = "cliente" | "empresa" | "clube_nutri";

interface ChatMessage {
  id: string;
  from: "bot" | "user";
  text: string;
  chips?: { label: string; value: string }[];
  multiSelect?: boolean;
  resourceLinks?: { label: string; href: string }[];
}

type Step = "welcome" | "segment" | "client_menu" | "name" | "phone" | "q1" | "q2" | "done";

interface LeadData {
  segment: Segment | null;
  name: string;
  phone: string;
  qty: string;
  interests: string[];
}

const SEGMENTS: { value: Segment; label: string }[] = [
  { value: "cliente", label: "Sou cliente" },
  { value: "empresa", label: "Empresa" },
  { value: "clube_nutri", label: "Clube Nutri" },
];

const STORE_WHATSAPP = "https://wa.me/5562992358894";
const FIDELITY_URL = "https://app.fidelo.com.br/getpass/eavFmj?utm_source=qr";
const NUTRI_CATALOG_URL = "/documentos/catalogo-nutricional-goldko.pdf";
const NUTRI_CALORIES_URL = "/documentos/tabela-de-calorias-goldko.pdf";

const NUTRI_RESOURCES: Record<string, { label: string; href: string }> = {
  catalogo_produtos: {
    label: "Abrir catálogo de produtos",
    href: NUTRI_CATALOG_URL,
  },
  tabela_nutricional: {
    label: "Abrir tabela nutricional",
    href: `${NUTRI_CATALOG_URL}#page=3`,
  },
  tabela_calorias: {
    label: "Abrir tabela de calorias",
    href: NUTRI_CALORIES_URL,
  },
};

const CLIENT_PATHS = [
  { label: "Falar com a loja", value: "store" },
  { label: "Pedidos e entregas", value: "delivery" },
  { label: "Cartão Fidelidade", value: "fidelity" },
  { label: "Nosso cardápio", value: "menu" },
  { label: "Nossos produtos", value: "products" },
  { label: "Dúvidas frequentes", value: "faq" },
  { label: "Pedidos para você", value: "personal_orders" },
  { label: "Pedidos para presentear", value: "gift_orders" },
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
    q1Chips: ["Até 10", "11 a 50", "51 a 200", "Mais de 200"],
    q2: "O que sua empresa procura? (pode escolher mais de uma opção)",
    q2Options: [
      { label: "Lanches Saudáveis p/ Equipe", value: "lanche_equipe" },
      { label: "Cestas & Kits Corporativos", value: "kits_corporativos" },
      { label: "Fornecimento Recorrente", value: "fornecimento" },
      { label: "Eventos & Datas Especiais", value: "eventos" },
    ],
  },
  clube_nutri: {
    q1: "Quantos pacientes você acompanha atualmente?",
    q1Placeholder: "Ex: 30 pacientes",
    q1Chips: ["Menos de 20", "20 a 50", "51 a 100", "Mais de 100"],
    q2: "O que mais te interessa no Clube do Nutri? (pode escolher mais de uma opção)",
    q2Options: [
      { label: "Parceria comercial", value: "parceria_comercial" },
      { label: "Como participar do Clube", value: "informacoes_clube_nutri" },
      { label: "Kits e combos exclusivos", value: "kits_exclusivos_nutricionistas" },
      { label: "Catálogo de produtos", value: "catalogo_produtos" },
      { label: "Tabela nutricional", value: "tabela_nutricional" },
      { label: "Tabela de calorias", value: "tabela_calorias" },
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
    subtitle: "Presentes corporativos, lanches saudáveis e parcerias sob medida para a sua equipe.",
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
function formatPhone(digits: string): string {
  if (digits.length === 11) return `(${digits.slice(0, 2)}) ${digits[2]} ${digits.slice(3, 7)}-${digits.slice(7)}`;
  if (digits.length === 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  return digits;
}

function TypingIndicator() {
  return (
    <div className="flex items-end gap-2.5 animate-in fade-in duration-200">
      <GoldkoAvatar size="sm" ring={false} />
      <div className="rounded-[18px] rounded-bl-md border border-[#EDE6DA] bg-white px-4 py-3.5">
        <div className="flex items-center gap-1.5">
          <div className="size-2 rounded-full bg-[#00205C]/40" style={{ animation: "bounce 1.2s infinite", animationDelay: "0s" }} />
          <div className="size-2 rounded-full bg-[#00205C]/40" style={{ animation: "bounce 1.2s infinite", animationDelay: "0.2s" }} />
          <div className="size-2 rounded-full bg-[#00205C]/40" style={{ animation: "bounce 1.2s infinite", animationDelay: "0.4s" }} />
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
}: {
  msg: ChatMessage;
  step: Step;
  selectedChips: string[];
  onChipClick: (v: string) => void;
}) {
  const isBot = msg.from === "bot";
  const chipsActive =
    (step === "segment" && !msg.multiSelect) ||
    (step === "client_menu" && !msg.multiSelect) ||
    (step === "q1" && !msg.multiSelect) ||
    (step === "q2" && msg.multiSelect);

  return (
    <div className={`flex gap-2.5 ${isBot ? "items-start" : "flex-row-reverse items-end"} animate-in fade-in slide-in-from-bottom-2 duration-300`}>
      {isBot && (
        <span className="mt-1.5">
          <GoldkoAvatar size="sm" ring={false} />
        </span>
      )}
      <div className={`max-w-[86%] ${isBot ? "" : "items-end flex flex-col"}`}>
        <div
          className={`rounded-[18px] px-4 py-3 text-[15px] leading-relaxed [&_strong]:font-bold ${
            isBot
              ? "rounded-bl-md border border-[#EDE6DA] bg-white text-[#3A4660] [&_strong]:text-[#00205C]"
              : "rounded-br-md bg-[#00205C] text-white"
          }`}
          dangerouslySetInnerHTML={{ __html: msg.text.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>").replace(/\n/g, "<br/>") }}
        />
        {msg.chips && (
          <div className="mt-2.5 flex flex-wrap gap-2">
            {msg.chips.map((chip) => {
              const isSel = selectedChips.includes(chip.value);
              const disabled = !chipsActive;
              return (
                <button
                  key={chip.value}
                  onClick={() => !disabled && onChipClick(chip.value)}
                  disabled={disabled}
                  className={`inline-flex items-center gap-1.5 rounded-full border px-4 py-2.5 text-sm font-semibold leading-none transition-all duration-150 ${
                    isSel
                      ? "border-[#00205C] bg-[#00205C] text-white"
                      : disabled
                        ? "cursor-default border-[#E6E1D8] bg-white/70 text-[#00205C]/35"
                        : "cursor-pointer border-[#BDE8F2] bg-[#E7F7FB] text-[#00205C] hover:border-[#00205C] hover:bg-[#00205C] hover:text-white active:scale-[0.97]"
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
                className="flex items-center gap-3 rounded-2xl border border-[#EDE6DA] bg-white px-4 py-3 text-left text-sm font-semibold text-[#00205C] transition hover:border-[#00205C] active:scale-[0.99]"
              >
                <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-[#E7F7FB]">
                  <FileText className="size-4" />
                </span>
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
  const [lead, setLead] = useState<LeadData>({ segment: null, name: "", phone: "", qty: "", interests: [] });
  const [inputValue, setInputValue] = useState("");
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
    if (["name", "phone", "q1"].includes(step)) {
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
    setSelectedChips([]);
    setLastChipMsgId(null);
    setSavedOk(false);
    setFeedbackOpen(false);
    setFeedbackName("");
    setFeedbackPhone("");
    setFeedbackMessage("");

    if (initialSegment) {
      // Segmento pré-selecionado (ex: clicou no card Clube do Nutri ou Empresas)
      setLead({ segment: initialSegment, name: "", phone: "", qty: "", interests: [] });
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
        pushBot(`${info.title}\n${info.subtitle}\n\nPara começarmos, qual é o seu **nome**?`, {}, "name");
      }, 350);
    } else {
      // Nenhum segmento pré-selecionado (ex: clicou no botão geral da Hero ou Header)
      setLead({ segment: null, name: "", phone: "", qty: "", interests: [] });
      setStep("welcome");
      setTimeout(() => {
        pushBot(
          "**Olá! Seja bem-vindo(a) à GoldKo.**\nÉ chocolate muito gostoso e sem culpa.\n\nPrimeiro, me conta: com qual perfil você se identifica?",
          { chips: SEGMENTS.map((s) => ({ label: s.label, value: s.value })) },
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
      setTimeout(() => pushBot("Qual é o seu **nome**?", {}, "name"), 1400);
    },
    [addUserMsg, onClose, onOpenCustomerMenu, pushBot]
  );

  const handleClientPath = useCallback(
    (value: string) => {
      const option = CLIENT_PATHS.find((item) => item.value === value);
      addUserMsg(option?.label || value);

      if (value === "store") {
        window.open(STORE_WHATSAPP, "_blank", "noopener,noreferrer");
        pushBot("Abrimos o WhatsApp da loja para você. Se não abriu, permita a abertura de uma nova guia.");
        return;
      }
      if (value === "delivery") {
        const message = encodeURIComponent("Olá! Preciso de ajuda com pedidos e entregas da GoldKo.");
        window.open(`${STORE_WHATSAPP}?text=${message}`, "_blank", "noopener,noreferrer");
        pushBot("Abrimos o atendimento de pedidos e entregas no WhatsApp.");
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

      const unavailable: Record<string, string> = {
        menu: "Nosso cardápio",
        products: "Nosso catálogo de produtos",
        faq: "A área de dúvidas frequentes",
        personal_orders: "O catálogo de pedidos para você",
        gift_orders: "O material de pedidos para presentear",
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
      pushBot(`Prazer, **${name.trim()}**!\nAgora preciso do seu **WhatsApp** (com DDD) para contato:`, {}, "phone");
    },
    [addUserMsg, pushBot]
  );

  const handlePhoneSubmit = useCallback(
    (phone: string) => {
      const cleaned = phone.replace(/\D/g, "");
      if (cleaned.length < 8 || !lead.segment) return;
      addUserMsg(formatPhone(cleaned));
      setInputValue("");
      setLead((prev) => ({ ...prev, phone: cleaned }));
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
        ? finalLead.interests.map((interest) => NUTRI_RESOURCES[interest]).filter(Boolean)
        : [];
    setLead(finalLead);
    setSelectedChips([]);
    setSaving(true);
    pushBot("Perfeito! Deixa eu registrar seus dados…", {}, "done");

    try {
      await createChatLeadServerFn({
        data: {
          nome: finalLead.name,
          whatsapp: finalLead.phone,
          tipo: finalLead.segment!,
          quantidade: finalLead.qty,
          interesses: finalLead.interests,
        },
      });
      trackEvent("funnel_completed", { source: trackingSource, segment: finalLead.segment });
      trackEvent("lead_submit", { source: trackingSource, segment: finalLead.segment, form_name: "chat_lead" });
      setSavedOk(true);
      setTimeout(
        () =>
          pushBot(
            `Tudo certo, **${finalLead.name}**!\nNossa equipe já recebeu suas informações e vai entrar em contato com você pelo WhatsApp **${formatPhone(
              finalLead.phone
            )}**.${resourceLinks.length > 0 ? "\n\nOs materiais que você selecionou estão disponíveis abaixo:" : ""}\n\nObrigado pela preferência!`,
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
      const parts = [
        "Olá! Quero enviar uma sugestão ou reclamação para a GoldKo.",
        feedbackName.trim() ? `Nome: ${feedbackName.trim()}` : "Nome: não informado",
        feedbackPhone.trim() ? `Telefone: ${feedbackPhone.trim()}` : "Telefone: não informado",
        `Mensagem: ${feedbackMessage.trim()}`,
      ];
      window.open(`${STORE_WHATSAPP}?text=${encodeURIComponent(parts.join("\n"))}`, "_blank", "noopener,noreferrer");
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
    if (step === "name") handleNameSubmit(val);
    else if (step === "phone") handlePhoneSubmit(val);
    else if (step === "q1") handleQ1Submit(val);
  }, [inputValue, step, handleNameSubmit, handlePhoneSubmit, handleQ1Submit]);

  if (!open) return null;

  const progressByStep: Partial<Record<Step, number>> = { name: 20, phone: 45, q1: 70, q2: 90, done: 100 };
  const progress = progressByStep[step] ?? 0;
  const showTextInput = ["name", "phone", "q1"].includes(step);
  const showMultiConfirm = step === "q2";
  const inputPlaceholder =
    step === "name"
      ? "Digite seu nome completo…"
      : step === "phone"
      ? "Ex: (64) 99999-9999"
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
        className="relative flex h-full w-full max-w-lg flex-col overflow-hidden rounded-none bg-[#FFFBF5] shadow-2xl animate-in fade-in slide-in-from-bottom-4 duration-300 sm:h-[min(700px,96dvh)] sm:rounded-[1.75rem]"
      >
        {feedbackOpen && (
          <div className="absolute inset-0 z-50 flex items-end bg-[#001433]/70 p-3 backdrop-blur-sm sm:items-center sm:justify-center">
            <form onSubmit={submitFeedback} className="w-full rounded-[1.5rem] bg-white p-5 shadow-2xl sm:max-w-md">
              <h3 className="font-display text-2xl font-bold uppercase text-[#00205C]">Sugestão ou reclamação</h3>
              <p className="mt-1 text-sm text-gray-500">Nome e telefone são opcionais.</p>
              <div className="mt-4 space-y-3">
                <input
                  value={feedbackName}
                  onChange={(event) => setFeedbackName(event.target.value)}
                  placeholder="Seu nome (opcional)"
                  className="w-full rounded-xl border border-gray-200 px-4 py-3 text-base outline-none focus:border-[#42C8E5]"
                />
                <input
                  value={feedbackPhone}
                  onChange={(event) => setFeedbackPhone(event.target.value)}
                  placeholder="Seu telefone (opcional)"
                  inputMode="tel"
                  className="w-full rounded-xl border border-gray-200 px-4 py-3 text-base outline-none focus:border-[#42C8E5]"
                />
                <textarea
                  required
                  rows={5}
                  value={feedbackMessage}
                  onChange={(event) => setFeedbackMessage(event.target.value)}
                  placeholder="Escreva sua sugestão ou reclamação"
                  className="w-full resize-none rounded-xl border border-gray-200 px-4 py-3 text-base outline-none focus:border-[#42C8E5]"
                />
              </div>
              <div className="mt-4 flex justify-end gap-2">
                <button type="button" onClick={() => setFeedbackOpen(false)} className="rounded-full border border-gray-200 px-5 py-2.5 text-sm font-bold text-gray-600">Cancelar</button>
                <button type="submit" disabled={!feedbackMessage.trim()} className="rounded-full bg-[#00205C] px-5 py-2.5 text-sm font-bold text-white disabled:bg-[#00205C]/25">Enviar pelo WhatsApp</button>
              </div>
            </form>
          </div>
        )}
        {/* CABEÇALHO COM A PERSONAGEM */}
        <header className="relative z-10 flex shrink-0 items-center gap-3 bg-[#00205C] px-4 py-3.5 sm:px-5">
          <GoldkoAvatar size="md" ring={false} />
          <div className="min-w-0 flex-1">
            <p className="text-[15px] font-bold leading-tight text-white">Assistente GoldKo</p>
            <p className="mt-0.5 flex items-center gap-1.5 text-xs text-[#9FE6F5]">
              <span className="size-[7px] rounded-full bg-[#5DCAA5]" />
              {lead.segment ? SEGMENT_GREETINGS[lead.segment].chatTitle : "Online agora"}
            </p>
          </div>
          <CloseButton onClick={closeAsAbandoned} tone="dark" />
        </header>

        {/* PROGRESSO DO CADASTRO */}
        <div className="relative z-10 h-[3px] shrink-0 bg-[#E6EEF7]">
          <div
            className="h-full bg-[#42C8E5] transition-[width] duration-500 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* MENSAGENS */}
        <div className="relative min-h-0 flex-1 bg-[#FFFBF5]">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 opacity-[0.22]"
            style={{
              backgroundImage: 'url("/chat-conversation-background.png")',
              backgroundPosition: "center",
              backgroundRepeat: "no-repeat",
              backgroundSize: "cover",
            }}
          />
        <div className="relative h-full overflow-y-auto overscroll-contain px-4 pb-5 pt-6 space-y-4 sm:px-5">
          <div className="flex flex-col items-center pb-1 text-center animate-in fade-in zoom-in-95 duration-500">
            <GoldkoAvatar size="xl" />
            <p className="mt-3 text-xs font-bold uppercase tracking-[0.18em] text-[#D9772B]">GoldKo</p>
          </div>
          {messages.map((msg) => (
            <MessageBubble
              key={msg.id}
              msg={msg}
              step={step}
              selectedChips={msg.id === lastChipMsgId ? selectedChips : []}
              onChipClick={handleChipClick}
            />
          ))}
          {typing && <TypingIndicator />}
          {step === "done" && savedOk && !typing && (
            <div className="flex justify-center gap-3 pt-3 animate-in fade-in slide-in-from-bottom-3 duration-300">
              <a
                href="#descubra"
                onClick={onClose}
                className="inline-flex items-center gap-2 rounded-full bg-[#00205C] px-5 py-2.5 text-sm font-bold text-white transition-colors hover:bg-[#003380]"
              >
                Conhecer produtos <ChevronRight className="size-4" />
              </a>
              <button
                onClick={onClose}
                className="inline-flex items-center gap-2 rounded-full border border-[#E6E1D8] bg-white px-5 py-2.5 text-sm font-bold text-[#00205C]/70 transition-colors hover:border-[#00205C]/40"
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
          <div className="relative z-10 shrink-0 border-t border-[#EDE6DA] bg-white px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
            {showTextInput ? (
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
                  onChange={(e) => setInputValue(e.target.value)}
                  onFocus={() => {
                    requestAnimationFrame(() =>
                      bottomRef.current?.scrollIntoView({ behavior: "auto", block: "end" }),
                    );
                  }}
                  placeholder={inputPlaceholder}
                  className="flex-1 rounded-full border border-[#E6E1D8] bg-[#FFFBF5] px-4 py-2.5 text-base text-[#00205C] outline-none transition-colors placeholder:text-[#00205C]/40 focus:border-[#42C8E5] focus:bg-white focus:ring-2 focus:ring-[#42C8E5]/20 sm:text-sm"
                  style={{ fontSize: "16px" }}
                  autoComplete={step === "phone" ? "tel" : "name"}
                  inputMode={step === "phone" || step === "q1" ? "numeric" : "text"}
                />
                <button
                  type="submit"
                  disabled={!inputValue.trim()}
                  className="flex size-11 shrink-0 items-center justify-center rounded-full bg-[#00205C] text-white transition hover:bg-[#003380] disabled:cursor-not-allowed disabled:bg-[#00205C]/25"
                >
                  <Send className="size-4" />
                </button>
              </form>
            ) : (
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs font-medium text-[#4A5672]">
                  {selectedChips.length === 0
                    ? "Selecione ao menos uma opção"
                    : `${selectedChips.length} opção(ões) selecionada(s)`}
                </p>
                <button
                  onClick={handleQ2Confirm}
                  disabled={selectedChips.length === 0 || saving}
                  className="inline-flex items-center gap-2 rounded-full bg-[#00205C] px-5 py-3 text-sm font-bold text-white transition hover:bg-[#003380] disabled:cursor-not-allowed disabled:bg-[#00205C]/25"
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
