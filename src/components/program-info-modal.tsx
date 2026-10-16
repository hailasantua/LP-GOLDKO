import { useCallback, useEffect, useRef } from "react";
import { ArrowUpRight, BadgeCheck, Building2, Download, FileText, Gift, HeartHandshake, MessageCircle, ShoppingBag, Sparkles, Star, Users } from "lucide-react";
import { GoldkoSheet, SectionLabel, SheetHeader } from "@/components/goldko-sheet";
import { trackEvent } from "@/lib/tracking";

export type ProgramInfoKind = "nutri" | "empresa" | "fidelity";

const WHATSAPP = "https://wa.me/5562992358894";
const FIDELITY = "https://app.fidelo.com.br/getpass/eavFmj?utm_source=qr";
const NUTRI_CATALOG = "/documentos/catalogo-nutricional-goldko.pdf";
const NUTRI_CALORIES = "/documentos/tabela-de-calorias-goldko.pdf";

type NutriOption = {
  icon: typeof Star;
  title: string;
  text: string;
  action: "whatsapp" | "pdf";
  href: string;
};

const nutriOptions: NutriOption[] = [
  {
    icon: HeartHandshake,
    title: "Parceria comercial",
    text: "Converse com a equipe sobre oportunidades de parceria.",
    action: "whatsapp",
    href: `${WHATSAPP}?text=${encodeURIComponent("Olá! Sou nutricionista e gostaria de conversar sobre uma parceria comercial com a GoldKo.")}`,
  },
  {
    icon: BadgeCheck,
    title: "Como participar do Clube",
    text: "Tire suas dúvidas e saiba como entrar no Clube do Nutri.",
    action: "whatsapp",
    href: `${WHATSAPP}?text=${encodeURIComponent("Olá! Quero mais informações sobre o Clube do Nutri GoldKo.")}`,
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
    href: NUTRI_CATALOG,
  },
  {
    icon: FileText,
    title: "Tabela nutricional",
    text: "Informações nutricionais de cada produto.",
    action: "pdf",
    href: `${NUTRI_CATALOG}#page=3`,
  },
  {
    icon: Sparkles,
    title: "Tabela de calorias",
    text: "Calorias por 100 g e por porção.",
    action: "pdf",
    href: NUTRI_CALORIES,
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
    title: "Quanto mais GoldKo, melhor",
    intro: "O programa Fidelo reúne suas vantagens em um cartão digital simples de cadastrar e fácil de acessar.",
    sections: [
      { icon: Sparkles, title: "Como funciona", text: "Cadastre-se pelo link oficial e use seu cartão digital nas experiências participantes da GoldKo." },
      { icon: Gift, title: "Benefícios", text: "Acompanhe as vantagens e campanhas disponíveis para clientes cadastrados no programa." },
      { icon: BadgeCheck, title: "Como se cadastrar", text: "Acesse a página do Fidelo, informe seus dados e siga as orientações para concluir o cadastro." },
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
    const source = trackingSource || "help_card";
    const eventName = option.action === "whatsapp" ? "program_cta_click" : "program_resource_click";
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
    { label: "Fale com a equipe", items: nutriOptions.filter((option) => option.action === "whatsapp") },
    { label: "Materiais para baixar", items: nutriOptions.filter((option) => option.action === "pdf") },
  ];
  const CtaIcon = kind === "fidelity" ? ArrowUpRight : MessageCircle;

  return (
    <GoldkoSheet onBackdrop={closeAsAbandoned} maxWidth={kind === "nutri" ? "max-w-3xl" : "max-w-2xl"}>
        <SheetHeader eyebrow={page.eyebrow} title={page.title} intro={page.intro} onClose={closeAsAbandoned} />

        <div className="relative min-h-0 flex-1 overflow-y-auto px-5 pb-7 pt-4 sm:px-8 sm:pb-8">
          {kind === "nutri" ? (
            <div className="space-y-5">
              {nutriGroups.map((group) => (
                <section key={group.label}>
                  <SectionLabel>{group.label}</SectionLabel>
                  <div className="grid gap-2.5 sm:grid-cols-3">
                    {group.items.map(({ icon: Icon, title, text, action, href }) => {
                      const ActionIcon = action === "pdf" ? Download : ArrowUpRight;
                      return (
                        <button
                          key={title}
                          type="button"
                          onClick={() => void openNutriOption({ icon: Icon, title, text, action, href })}
                          className="group flex items-start gap-3 rounded-2xl border border-[#EDE6DA] bg-white p-4 text-left transition hover:-translate-y-0.5 hover:border-[#00205C] active:translate-y-0 sm:flex-col sm:gap-3"
                        >
                          <span className="flex w-full items-center justify-between gap-3 max-sm:w-auto">
                            <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[#E7F7FB] text-[#00205C] transition group-hover:bg-[#00205C] group-hover:text-white">
                              <Icon className="size-5" />
                            </span>
                            <ActionIcon className="size-4 shrink-0 text-[#00205C]/50 transition group-hover:text-[#00205C] max-sm:hidden" />
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block text-[15px] font-bold leading-snug text-[#00205C]">{title}</span>
                            <span className="mt-1 block text-[13px] leading-relaxed text-[#4A5672]">{text}</span>
                          </span>
                          <ActionIcon className="mt-1 size-4 shrink-0 text-[#00205C]/50 sm:hidden" />
                        </button>
                      );
                    })}
                  </div>
                </section>
              ))}
            </div>
          ) : (
            <>
              <div className="grid gap-x-6 gap-y-5 rounded-2xl border border-[#EDE6DA] bg-white/90 p-5 sm:grid-cols-2 sm:p-6">
                {page.sections.map(({ icon: Icon, title, text }) => (
                  <article key={title} className="flex items-start gap-3">
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[#E7F7FB] text-[#00205C]"><Icon className="size-5" /></span>
                    <div className="min-w-0">
                      <h3 className="text-[15px] font-bold text-[#00205C]">{title}</h3>
                      <p className="mt-1 text-[13px] leading-relaxed text-[#4A5672]">{text}</p>
                    </div>
                  </article>
                ))}
              </div>

              <div className="mt-5">
                <button type="button" onClick={() => void openCta()} className="inline-flex w-full items-center justify-center gap-2.5 rounded-full bg-[#00205C] px-7 py-4 text-[15px] font-bold text-white transition hover:-translate-y-0.5 hover:bg-[#003380] sm:w-auto">
                  <CtaIcon className="size-5" />{page.cta}
                </button>
                {kind !== "fidelity" && <p className="mt-2 text-xs text-[#4A5672] sm:ml-2 sm:inline">Atendimento pelo WhatsApp</p>}
              </div>
            </>
          )}
        </div>
    </GoldkoSheet>
  );
}
