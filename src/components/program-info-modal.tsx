import { useCallback, useEffect, useRef } from "react";
import { ArrowUpRight, BadgeCheck, Building2, ChevronRight, Download, FileText, Gift, HeartHandshake, MessageCircle, ShoppingBag, Sparkles, Star, Users } from "lucide-react";
import { GoldkoSheet, SectionLabel, SheetHeader, Stamp, optionRowClass, primaryButtonClass } from "@/components/goldko-sheet";
import { trackEvent, LARA_WHATSAPP, storeClubeNutriUrl } from "@/lib/tracking";

export type ProgramInfoKind = "nutri" | "empresa" | "fidelity";

const WHATSAPP = LARA_WHATSAPP; // Lara (relacionamento GoldKo)
const FIDELITY = "https://app.fidelo.com.br/getpass/eavFmj?utm_source=qr";

type NutriOption = {
  icon: typeof Star;
  title: string;
  text: string;
  action: "whatsapp" | "pdf" | "site";
  href: string;
};

const nutriOptions: NutriOption[] = [
  {
    icon: HeartHandshake,
    title: "Parceria comercial",
    text: "Fale com o nosso relacionamento agora.",
    action: "whatsapp",
    href: `${WHATSAPP}?text=${encodeURIComponent("Olá! Sou nutricionista e gostaria de conversar sobre uma parceria comercial com a GoldKo.")}`,
  },
  {
    icon: BadgeCheck,
    title: "Como participar do Clube",
    text: "Veja no site como entrar no Clube do Nutri.",
    action: "site",
    href: "", // definido pela loja da página (storeClubeNutriUrl)
  },
  {
    icon: Gift,
    title: "Kits e combos exclusivos",
    text: "Condições especiais para profissionais da nutrição.",
    action: "whatsapp",
    href: `${WHATSAPP}?text=${encodeURIComponent("Olá! Quero conhecer os kits e combos com valores exclusivos para nutricionistas.")}`,
  },
  {
    icon: ShoppingBag,
    title: "Catálogo de produtos",
    text: "Produtos organizados por família e apresentação.",
    action: "pdf",
    href: "/documentos/catalogo-produtos-goldko.pdf",
  },
];

const content = {
  nutri: {
    eyebrow: "Clube do Nutri",
    title: "Tudo para apoiar sua atuação profissional",
    intro: "Fale com a nossa equipe ou baixe os materiais do Clube do Nutri.",
    sections: [],
    cta: "Quero mais informações",
    href: `${WHATSAPP}?text=${encodeURIComponent("Olá! Quero mais informações sobre o Clube do Nutri GoldKo.")}`,
  },
  empresa: {
    eyebrow: "GoldKo para Empresas",
    title: "Soluções corporativas que surpreendem",
    intro: "Atendimento personalizado para empresas que querem presentear, celebrar e criar experiências marcantes.",
    sections: [
      { icon: Building2, title: "Atendimento corporativo", text: "Nossa equipe entende a necessidade da empresa e desenvolve uma solução adequada para cada ocasião." },
      { icon: Users, title: "Grandes quantidades", text: "Suporte para pedidos em volume, ações internas, eventos, datas comemorativas, clientes e colaboradores." },
      { icon: Gift, title: "Opções de produtos", text: "Kits, presentes e combinações GoldKo com possibilidades de personalização conforme a demanda." },
      { icon: FileText, title: "Catálogo corporativo", text: "O catálogo em PDF será disponibilizado pela equipe durante o atendimento comercial." },
    ],
    cta: "Quero mais informações",
    href: `${WHATSAPP}?text=${encodeURIComponent("Olá! Quero mais informações sobre o atendimento GoldKo para Empresas.")}`,
  },
  fidelity: {
    eyebrow: "Cartão Fidelidade",
    title: "Seja um cliente fiel e ganhe R$ 75 em compras",
    intro: "O programa Fidelo reúne suas vantagens em um cartão digital simples de cadastrar e fácil de acessar.",
    sections: [
      { icon: Sparkles, title: "Como funciona", text: "Todas as suas compras valem. A cada R$ 75 acumulados, você ganha 1 estrela. Com 10 estrelas, R$ 75 em compras na loja por nossa conta." },
      { icon: Gift, title: "Benefícios", text: "Receba descontos especiais para clientes fiéis." },
      { icon: BadgeCheck, title: "Como se cadastrar", text: "Clique no link abaixo e emita seu cartão em 1 minuto." },
    ],
    cta: "Emitir Cartão Fidelidade",
    href: FIDELITY,
  },
} satisfies Record<ProgramInfoKind, { eyebrow: string; title: string; intro: string; sections: Array<{ icon: typeof Star; title: string; text: string }>; cta: string; href: string }>;

export function ProgramInfoModal({ kind, onClose, trackingSource, trackingOption }: { kind: ProgramInfoKind | null; onClose: () => void; trackingSource?: string; trackingOption?: string }) {
  const ctaClickedRef = useRef(false);
  const closeAsAbandoned = useCallback(() => {
    if (kind && kind !== "fidelity" && !ctaClickedRef.current) {
      trackEvent("program_abandoned", { source: trackingSource || "help_card", segment: kind === "nutri" ? "clube_nutri" : "empresa" });
    }
    onClose();
  }, [kind, onClose, trackingSource]);

  useEffect(() => {
    if (!kind) return;
    ctaClickedRef.current = false;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const closeOnEscape = (event: KeyboardEvent) => event.key === "Escape" && closeAsAbandoned();
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [kind, closeAsAbandoned]);

  if (!kind) return null;
  const page = content[kind];

  async function openCta() {
    if (!kind) return;
    ctaClickedRef.current = true;
    const segment = kind === "nutri" ? "clube_nutri" : kind === "fidelity" ? "cliente" : kind;
    const source = trackingSource || (kind === "nutri" || kind === "empresa" ? "help_card" : kind);
    await Promise.all([
      trackEvent("program_cta_click", { section: "program_info", source, segment, label: page.cta, destination: page.href, option: trackingOption }),
      trackEvent("funnel_completed", { source, segment, option: trackingOption }),
    ]);
    window.location.href = page.href;
  }

  async function openNutriOption(option: NutriOption) {
    ctaClickedRef.current = true;
    if (option.action === "site") option = { ...option, href: storeClubeNutriUrl() };
    const source = trackingSource || "help_card";
    const eventName = option.action === "pdf" ? "program_resource_click" : "program_cta_click";
    await Promise.all([
      trackEvent(eventName, {
        section: "program_info",
        source,
        segment: "clube_nutri",
        label: option.title,
        destination: option.href,
        resource_type: option.action,
      }),
      trackEvent("funnel_completed", {
        source,
        segment: "clube_nutri",
        option: option.title,
      }),
    ]);
    window.location.href = option.href;
  }

  const nutriGroups = [
    { label: "Fale com a equipe", items: nutriOptions.filter((option) => option.action !== "pdf") },
    { label: "Materiais", items: nutriOptions.filter((option) => option.action === "pdf") },
  ];
  const CtaIcon = kind === "fidelity" ? ArrowUpRight : MessageCircle;

  return (
    <GoldkoSheet onBackdrop={closeAsAbandoned} maxWidth={kind === "nutri" ? "max-w-3xl" : "max-w-2xl"}>
        <SheetHeader eyebrow={page.eyebrow} title={page.title} intro={page.intro} onClose={closeAsAbandoned} />

        <div className="relative min-h-0 flex-1 overflow-y-auto px-4 pb-7 pt-3 sm:px-7 sm:pb-8">
          {kind === "nutri" ? (
            <div className="space-y-5">
              {nutriGroups.map((group) => (
                <section key={group.label}>
                  <SectionLabel aside={group.items.length > 1 ? `${group.items.length} opções` : undefined}>{group.label}</SectionLabel>
                  <div className="grid gap-2.5 sm:grid-cols-2">
                    {group.items.map(({ icon: Icon, title, text, action, href }) => (
                      <button
                        key={title}
                        type="button"
                        onClick={() => void openNutriOption({ icon: Icon, title, text, action, href })}
                        className={`${optionRowClass} ${action === "pdf" ? "border-[1.5px] border-[#51b2dc]" : ""}`}
                      >
                        <Stamp><Icon className="size-5" /></Stamp>
                        <span className="min-w-0 flex-1">
                          <span className="block text-[15px] font-bold leading-snug text-[#0d2b40]">{title}</span>
                          <span className="mt-0.5 block text-[13px] leading-snug text-[#4f4f4a]">{text}</span>
                        </span>
                        {action === "pdf" ? (
                          <span className="inline-flex shrink-0 items-center gap-1 rounded-[10px] bg-[#E7F4FA] px-2.5 py-1 text-xs font-bold text-[#0d2b40]">
                            <Download className="size-3.5" /> PDF
                          </span>
                        ) : (
                          <ChevronRight className="size-[18px] shrink-0 text-[#0d2b40] transition group-hover:translate-x-0.5" />
                        )}
                      </button>
                    ))}
                  </div>
                </section>
              ))}
            </div>
          ) : (
            <>
              <ul className="flex flex-col rounded-[14px] border border-[#D9D6D0] bg-white px-3.5 py-1">
                {page.sections.map(({ icon: Icon, title, text }, index) => (
                  <li key={title} className={`flex items-start gap-3 py-3 ${index > 0 ? "border-t border-[#EEEBE6]" : ""}`}>
                    <Stamp small><Icon className="size-[18px]" /></Stamp>
                    <div className="min-w-0 pt-0.5">
                      <h3 className="text-[15px] font-bold text-[#0d2b40]">{title}</h3>
                      <p className="mt-0.5 text-[13px] leading-relaxed text-[#4f4f4a]">{text}</p>
                    </div>
                  </li>
                ))}
              </ul>

              <div className="mt-4">
                <button type="button" onClick={() => void openCta()} className={primaryButtonClass}>
                  <CtaIcon className="size-5" />{page.cta}
                </button>
                {kind !== "fidelity" && <p className="mt-2 text-center text-xs text-[#4f4f4a]">Atendimento pelo WhatsApp</p>}
              </div>
            </>
          )}
        </div>
    </GoldkoSheet>
  );
}
