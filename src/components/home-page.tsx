import { useEffect, useRef, useState, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowRight,
  ArrowUpRight,
  Building2,
  Candy,
  Check,
  Clock3,
  Coffee,
  Gift,
  HeartHandshake,
  Instagram,
  MapPin,
  Menu,
  MessageCircle,
  ShoppingBag,
  Users,
  X,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { defaultSiteContent, mergeSiteContent, type SiteContent } from "@/lib/site-content";
import { trackEvent, trackedClick } from "@/lib/tracking";
import {
  EditableCardWrapper,
  EditableDualMediaWrapper,
  EditableLinkWrapper,
  EditableMediaWrapper,
  EditableText,
  type HomePageProps,
} from "./visual-editor-elements";
import { SectionCanvas } from "./section-canvas";
import { ChatLead } from "./chat-lead";
import { CustomerMenuModal } from "./customer-menu-modal";
import { EventPartnershipModal } from "./event-partnership-modal";
import { ProgramInfoModal, type ProgramInfoKind } from "./program-info-modal";
import { SortableHeroBlock } from "./sortable-hero-block";
import { NavbarPositionable } from "./navbar-positionable";

function isVideo(source: string) {
  return /\.(mp4|webm|mov)(\?|$)/i.test(source);
}

function Media({
  source,
  alt,
  className = "",
  priority = false,
}: {
  source: string;
  alt: string;
  className?: string;
  priority?: boolean;
}) {
  const mediaRef = useRef<HTMLDivElement>(null);
  const [shouldLoad, setShouldLoad] = useState(priority);

  useEffect(() => {
    if (priority || shouldLoad || !mediaRef.current) return;
    if (!("IntersectionObserver" in window)) {
      setShouldLoad(true);
      return;
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return;
        setShouldLoad(true);
        observer.disconnect();
      },
      { rootMargin: "320px 0px" },
    );
    observer.observe(mediaRef.current);
    return () => observer.disconnect();
  }, [priority, shouldLoad]);

  if (isVideo(source)) {
    return (
      <div ref={mediaRef} className={className}>
        {shouldLoad ? (
          <video
            src={source}
            autoPlay
            loop
            muted
            playsInline
            preload={priority ? "auto" : "metadata"}
            className={`h-full w-full ${className.includes("object-cover") ? "object-cover" : "object-contain"}`}
            aria-label={alt}
          />
        ) : null}
      </div>
    );
  }

  return (
    <img
      src={source}
      alt={alt}
      loading={priority ? "eager" : "lazy"}
      fetchPriority={priority ? "high" : "auto"}
      decoding="async"
      className={className}
    />
  );
}

function TrackedLink({
  href,
  label,
  event,
  className,
  children,
}: {
  href: string;
  label: string;
  event: string;
  className?: string;
  children: ReactNode;
}) {
  const external = href.startsWith("http");
  return (
    <a
      href={href}
      className={className}
      onClick={trackedClick(event, label, href)}
      target={external ? "_blank" : undefined}
      rel={external ? "noopener noreferrer" : undefined}
    >
      {children}
    </a>
  );
}

const helpIcons = [HeartHandshake, Users, Building2, ShoppingBag];
const discoverIcons = [Gift, Candy, Coffee, MapPin];

function getSegmentFromCard(
  card: { title?: string; href?: string },
  index: number
): "cliente" | "empresa" | "clube_nutri" | undefined {
  const t = (card.title || "").toLowerCase();
  const h = (card.href || "").toLowerCase();
  if (t.includes("nutri") || h.includes("nutri")) return "clube_nutri";
  if (t.includes("empresa") || h.includes("empresa")) return "empresa";
  if (t.includes("cliente") || h.includes("cliente")) return "cliente";
  if (index === 0) return "cliente";
  if (index === 1) return "clube_nutri";
  if (index === 2) return "empresa";
  return undefined;
}

export function HomePage({
  content: propContent,
  pageId: propPageId,
  isEditable = false,
  onEditField,
  onEditMedia,
  onEditDualMedia,
  onEditLink,
  onEditCard,
  onMoveElement,
  onSwapHeroVisuals,
  onMoveNavbarElement,
}: HomePageProps = {}) {
  const containerRef = useRef<HTMLElement>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [customerMenuOpen, setCustomerMenuOpen] = useState(false);
  const [eventFormOpen, setEventFormOpen] = useState(false);
  const [programInfo, setProgramInfo] = useState<ProgramInfoKind | null>(null);
  const [chatSegment, setChatSegment] = useState<"cliente" | "empresa" | "clube_nutri" | undefined>(undefined);
  const [journeySource, setJourneySource] = useState<"hero" | "help_card" | "general">("general");
  const [publicDeviceMode, setPublicDeviceMode] = useState<"desktop" | "mobile" | null>(
    isEditable ? "desktop" : null,
  );

  function openChat(segment?: "cliente" | "empresa" | "clube_nutri", source: "hero" | "help_card" | "general" = "general") {
    setJourneySource(source);
    if (segment === "cliente") {
      setChatOpen(false);
      setChatSegment(undefined);
      setCustomerMenuOpen(true);
      return;
    }
    setChatSegment(segment);
    setChatOpen(true);
  }

  const activePageId =
    propPageId ||
    (typeof window !== "undefined"
      ? new URLSearchParams(window.location.search).get("p") ||
        new URLSearchParams(window.location.search).get("page") ||
        "main"
      : "main");

  const {
    data: fetchedContent,
    isPending: isContentPending,
    isFetching: isContentFetching,
    isFetchedAfterMount,
  } = useQuery({
    queryKey: ["site-content", activePageId],
    enabled: !propContent,
    retry: false,
    staleTime: 0,
    refetchOnMount: "always",
    queryFn: async () => {
      const { data, error } = await supabase
        .from("site_content")
        .select("content")
        .eq("id", activePageId)
        .maybeSingle();
      if (error || !data?.content) {
        return defaultSiteContent;
      }
      return mergeSiteContent(data.content);
    },
  });

  const sourceContent = propContent ?? fetchedContent ?? defaultSiteContent;
  const content =
    !isEditable && publicDeviceMode && sourceContent.deviceVersions?.[publicDeviceMode]
      ? mergeSiteContent(sourceContent.deviceVersions[publicDeviceMode])
      : sourceContent;
  const isPublicContentLoading =
    !propContent &&
    (publicDeviceMode === null ||
      isContentPending ||
      (isContentFetching && !isFetchedAfterMount));
  const heroHeading =
    content.hero.heading || `${content.hero.title} ${content.hero.highlight}`.trim();
  const heroHighlightText = "é sem culpa!";
  const heroHighlightIndex = heroHeading.toLocaleLowerCase("pt-BR").lastIndexOf(heroHighlightText);
  const heroHeadingLead =
    heroHighlightIndex >= 0 ? heroHeading.slice(0, heroHighlightIndex).trimEnd() : heroHeading;
  const heroHeadingHighlight =
    heroHighlightIndex >= 0 ? heroHeading.slice(heroHighlightIndex) : "";

  useEffect(() => {
    if (typeof window === "undefined") return;
    const media = window.matchMedia("(max-width: 767px)");
    const updateDevice = () => setPublicDeviceMode(media.matches ? "mobile" : "desktop");
    updateDevice();
    media.addEventListener("change", updateDevice);
    return () => media.removeEventListener("change", updateDevice);
  }, []);

  useEffect(() => {
    trackEvent("page_view", { page_name: "home" });
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const tipo = params.get("tipo") || params.get("segment") || params.get("chat");
    if (tipo) {
      if (tipo.includes("nutri")) {
        openChat("clube_nutri");
      } else if (tipo.includes("empresa")) {
        openChat("empresa");
      } else if (tipo.includes("cliente")) {
        openChat("cliente");
      } else if (tipo === "true" || tipo === "open" || tipo === "1") {
        openChat();
      }
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined" || isEditable) return;
    const targets = [["topo", "hero"], ["como-ajudar", "help"]] as const;
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        const section = targets.find(([id]) => id === entry.target.id)?.[1];
        if (!section || sessionStorage.getItem(`goldko_view_${section}`)) return;
        sessionStorage.setItem(`goldko_view_${section}`, "1");
        trackEvent("section_view", { section });
      });
    }, { threshold: 0.35 });
    targets.forEach(([id]) => { const element = document.getElementById(id); if (element) observer.observe(element); });
    return () => observer.disconnect();
  }, [isEditable]);

  useEffect(() => {
    if (typeof window === "undefined" || isEditable || isPublicContentLoading) return;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const isMobile = window.matchMedia("(max-width: 767px)").matches;
    if (reduceMotion || isMobile) return;

    const scope = containerRef.current;
    if (!scope) return;

    let cancelled = false;
    let ctx: { revert: () => void } | undefined;
    let refreshFrame = 0;

    void Promise.all([import("gsap"), import("gsap/ScrollTrigger")]).then(
      ([gsapModule, scrollModule]) => {
        if (cancelled || !scope.isConnected) return;
        const gsap = gsapModule.default;
        const ScrollTrigger = scrollModule.ScrollTrigger;
        gsap.registerPlugin(ScrollTrigger);
        ctx = gsap.context(() => {
      gsap.fromTo(
        ".site-navbar-inner",
        { autoAlpha: 0, y: -12 },
        {
          autoAlpha: 1,
          y: 0,
          duration: 0.5,
          ease: "power2.out",
          clearProps: "transform,opacity,visibility",
        },
      );
      gsap.fromTo(
        ".hero-reveal",
        { autoAlpha: 0, y: 24, scale: 0.985, willChange: "transform,opacity" },
        {
          autoAlpha: 1,
          y: 0,
          scale: 1,
          duration: 0.65,
          stagger: 0.07,
          ease: "power3.out",
          clearProps: "transform,opacity,visibility,willChange",
        },
      );
      gsap.utils.toArray<HTMLElement>(".reveal-section").forEach((section) => {
        const items = section.querySelectorAll(".reveal-item");
        if (!items.length) return;
        gsap.fromTo(
          items,
          { autoAlpha: 0, y: 24, willChange: "transform,opacity" },
          {
            autoAlpha: 1,
            y: 0,
            duration: 0.6,
            stagger: 0.06,
            ease: "power3.out",
            scrollTrigger: { trigger: section, start: "top 84%", once: true },
            clearProps: "transform,opacity,visibility,willChange",
          },
        );
      });
          refreshFrame = requestAnimationFrame(() => ScrollTrigger.refresh());
        }, scope);
      },
    );

    return () => {
      cancelled = true;
      if (refreshFrame) cancelAnimationFrame(refreshFrame);
      ctx?.revert();
    };
  }, [content, isEditable, isPublicContentLoading]);

  if (isPublicContentLoading) {
    return (
      <main
        className="flex min-h-screen items-center justify-center bg-white"
        aria-label="Carregando conteúdo"
        aria-busy="true"
      >
        <div className="size-8 animate-spin rounded-full border-2 border-[#42C8E5]/30 border-t-[#00205C]" />
      </main>
    );
  }

  return (
    <main ref={containerRef} className="min-h-screen overflow-hidden bg-white text-foreground">
      <header className="sticky top-0 z-50 border-0 bg-transparent text-foreground shadow-none backdrop-blur-none">
        <div className="site-navbar-inner mx-auto flex h-16 max-w-[1200px] items-center justify-between px-4 md:px-6">
          <NavbarPositionable
            id="logo"
            label="logo"
            isEditable={isEditable}
            position={content.navbar.positions?.logo}
            onChange={onMoveNavbarElement}
            className="w-[150px] shrink-0 md:w-[190px]"
          >
            <a
              href="#topo"
              className="relative inline-flex h-12 w-full items-center"
              onClick={trackedClick("navigation_click", content.navbar.logoText || "GoldKo", "#topo")}
            >
              <EditableMediaWrapper
                isEditable={isEditable}
                path="navbar.logoImage"
                label="Navbar: Logo"
                source={content.navbar.logoImage}
                onEditMedia={onEditMedia}
                className="relative h-12 w-full overflow-visible rounded-lg"
              >
                {content.navbar.logoImage ? (
                  <img
                    src={content.navbar.logoImage}
                    alt={content.navbar.logoText || "GoldKo"}
                    style={{ width: `${content.navbar.logoWidth || 132}px` }}
                    className="absolute left-0 top-1/2 h-auto max-w-none -translate-y-1/2 object-contain"
                  />
                ) : (
                  <span className="font-display text-xl font-bold uppercase tracking-wide text-[#00205C]">
                    {content.navbar.logoText || "GoldKo"}
                  </span>
                )}
              </EditableMediaWrapper>
            </a>
          </NavbarPositionable>
          <NavbarPositionable
            id="navigation"
            label="links da navbar"
            isEditable={isEditable}
            position={content.navbar.positions?.navigation}
            onChange={onMoveNavbarElement}
            className="hidden md:block"
          >
          <nav className="flex items-center gap-7 text-sm font-semibold">
            <a
              className="text-[#00205C] transition-colors hover:text-[#42C8E5]"
              href="#como-ajudar"
            >
              Como podemos ajudar
            </a>
            <button
              onClick={() => openChat()}
              className="rounded-full bg-[#42C8E5] px-5 py-2.5 font-semibold text-sm text-[#00205C] transition-transform hover:scale-105"
            >
              <EditableText
                isEditable={isEditable}
                path="navbar.ctaLabel"
                label="Navbar: Texto do botão"
                value={content.navbar.ctaLabel}
                onEdit={onEditField}
              >
                {content.navbar.ctaLabel}
              </EditableText>
            </button>
          </nav>
          </NavbarPositionable>
          <NavbarPositionable
            id="menu"
            label="menu mobile"
            isEditable={isEditable}
            position={content.navbar.positions?.menu}
            onChange={onMoveNavbarElement}
            className="md:hidden"
          >
            <button
              type="button"
              aria-label={menuOpen ? "Fechar menu" : "Abrir menu"}
              onClick={() => setMenuOpen((open) => !open)}
              className="rounded-full p-2"
            >
              {menuOpen ? <X /> : <Menu />}
            </button>
          </NavbarPositionable>
        </div>
        {menuOpen && (
          <nav className="flex flex-col gap-4 border-t border-border bg-white px-5 py-5 text-sm font-semibold md:hidden">
            <a href="#como-ajudar" onClick={() => setMenuOpen(false)}>Como podemos ajudar</a>
            <button
              className="text-left"
              onClick={() => { setMenuOpen(false); openChat(); }}
            >
              <EditableText
                isEditable={isEditable}
                path="navbar.ctaLabel"
                label="Navbar: Texto do botão"
                value={content.navbar.ctaLabel}
                onEdit={onEditField}
              >
                {content.navbar.ctaLabel}
              </EditableText>
            </button>
          </nav>
        )}
      </header>

      {/* HERO SECTION */}
      <SectionCanvas
        id="topo"
        sectionId="topo"
        sectionTitle="Hero"
        freeElements={content.sectionElements?.["topo"]}
        background={content.sectionBackgrounds?.["topo"]}
        className="-mt-16 flex min-h-screen items-center bg-transparent px-5 pb-10 pt-24 md:px-8 md:pb-14 md:pt-28"
      >
        <div
          style={{ backgroundColor: "transparent" }}
          className="mx-auto grid w-full max-w-[1120px] items-center gap-10 bg-transparent md:grid-cols-[1.08fr_0.92fr] md:gap-14 lg:gap-20"
        >
          <div
            style={{ backgroundColor: "transparent" }}
            className={`relative z-10 flex flex-col items-center justify-center text-center ${
              content.hero.visualOrder === "heading-first" ? "order-1" : "order-2"
            }`}
          >
            {content.hero.eyebrow && content.hero.eyebrow !== "GoldKo Rio Verde" ? (
              <EditableText
                isEditable={isEditable}
                path="hero.eyebrow"
                label="Hero: Texto Pequeno"
                value={content.hero.eyebrow}
                onEdit={onEditField}
              >
                <p className="hero-reveal text-xs font-bold uppercase tracking-[0.28em] text-[#00205C]">
                  {content.hero.eyebrow}
                </p>
              </EditableText>
            ) : null}

            {content.hero.headingImage ? (
              <SortableHeroBlock
                id="heading"
                label="com a personagem"
                isEditable={isEditable}
                onSwap={onSwapHeroVisuals}
                className="w-full max-w-[34rem]"
              >
                <EditableMediaWrapper
                  isEditable={isEditable}
                  path="hero.headingImage"
                  label="Hero: Imagem do Título"
                  source={content.hero.headingImage}
                  onEditMedia={onEditMedia}
                  className={`hero-reveal w-full rounded-2xl ${
                    content.hero.eyebrow && content.hero.eyebrow !== "GoldKo Rio Verde" ? "mt-4" : ""
                  }`}
                >
                  <img
                    src={content.hero.headingImage}
                    alt={heroHeading}
                    className="max-h-[13rem] w-full object-contain"
                  />
                </EditableMediaWrapper>
              </SortableHeroBlock>
            ) : (
              <div className="relative flex flex-col items-center">
                <h1
                  className={`hero-reveal ${
                    content.hero.eyebrow && content.hero.eyebrow !== "GoldKo Rio Verde" ? "mt-4" : ""
                  } max-w-[18ch] self-center font-sans text-[clamp(2.15rem,3.2vw,3.45rem)] font-bold leading-[1.15] tracking-[-0.035em] text-[#00205C] [text-wrap:balance]`}
                >
                  <EditableText
                    isEditable={isEditable}
                    path="hero.heading"
                    label="Hero: Título Completo"
                    value={heroHeading}
                    onEdit={onEditField}
                  >
                    {heroHeadingLead}
                    {heroHeadingHighlight ? (
                      <>
                        {" "}
                        <span className="text-[#FF8300]">{heroHeadingHighlight}</span>
                      </>
                    ) : null}
                  </EditableText>
                </h1>
                {isEditable ? (
                  <button
                    type="button"
                    onClick={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
                      onEditMedia?.("hero.headingImage", "Hero: Imagem do Título", "");
                    }}
                    className="mt-3 inline-flex items-center gap-2 rounded-full bg-[#00205C] px-4 py-2 text-xs font-bold uppercase text-white shadow-md transition hover:bg-[#FF8300]"
                  >
                    Usar imagem no título
                  </button>
                ) : null}
              </div>
            )}

            <EditableText
              isEditable={isEditable}
              path="hero.text"
              label="Hero: Descrição"
              value={content.hero.text}
              onEdit={onEditField}
              as="div"
            >
              <p className="hero-reveal mx-auto mt-6 max-w-[32rem] text-base leading-relaxed text-[#5d626a] md:text-lg">
                {content.hero.text}
              </p>
            </EditableText>

            <div className="hero-reveal mx-auto mt-7 w-full max-w-[25rem]">
              <button
                onClick={() => { trackEvent("hero_cta_click", { section: "hero", source: "hero" }); trackEvent("funnel_started", { section: "hero", source: "hero" }); openChat(undefined, "hero"); }}
                className="inline-flex w-full items-center justify-center gap-3 rounded-2xl border-b-4 border-[#159fbd] bg-[#42C8E5] px-7 py-4 font-bold uppercase text-[#00205C] shadow-sm transition hover:-translate-y-0.5 hover:bg-[#6ED4E9] active:translate-y-0 active:border-b-2"
              >
                <EditableText
                  isEditable={isEditable}
                  path="hero.cta"
                  label="Hero: Texto do botão"
                  value={content.hero.cta}
                  onEdit={onEditField}
                >
                  {content.hero.cta}
                </EditableText>
                <ArrowRight className="size-5" />
              </button>
            </div>
          </div>

          <SortableHeroBlock
            id="media"
            label="com o título"
            isEditable={isEditable}
            onSwap={onSwapHeroVisuals}
            className={`hero-reveal hero-video-mask mx-auto aspect-square w-full max-w-[32rem] overflow-visible rounded-[2rem] bg-transparent md:mx-0 ${
              content.hero.visualOrder === "heading-first" ? "order-2" : "order-1"
            }`}
          >
            <div className="h-full w-full overflow-hidden rounded-[2rem]">
              <EditableDualMediaWrapper
                isEditable={isEditable}
                desktopPath="hero.desktopVideo"
                mobilePath="hero.mobileVideo"
                label="Hero: Vídeo / Foto"
                desktopSource={content.hero.desktopVideo}
                mobileSource={content.hero.mobileVideo}
                onEditDualMedia={onEditDualMedia}
                className="h-full w-full"
              >
                {isEditable ? (
                  <>
                    <Media
                      source={content.hero.mobileVideo}
                      alt={heroHeading}
                      className="h-full w-full object-contain md:hidden"
                      priority
                    />
                    <Media
                      source={content.hero.desktopVideo}
                      alt={heroHeading}
                      className="hidden h-full w-full object-contain md:block"
                      priority
                    />
                  </>
                ) : (
                  <Media
                    source={
                      publicDeviceMode === "mobile"
                        ? content.hero.mobileVideo
                        : content.hero.desktopVideo
                    }
                    alt={heroHeading}
                    className="h-full w-full object-contain"
                    priority
                  />
                )}
              </EditableDualMediaWrapper>
            </div>
          </SortableHeroBlock>
        </div>
      </SectionCanvas>

      {/* COMO PODEMOS TE AJUDAR */}
      <SectionCanvas
        id="como-ajudar"
        sectionId="como-ajudar"
        sectionTitle="Como Ajudar"
        freeElements={content.sectionElements?.["como-ajudar"]}
        background={content.sectionBackgrounds?.["como-ajudar"]}
        className="reveal-section w-full bg-white px-4 py-8 md:px-6 md:py-12"
      >
        <div className="mx-auto max-w-[1520px]">
          <SectionHeading
            title={content.help.title}
            subtitle={content.help.subtitle}
            isEditable={isEditable}
            titlePath="help.title"
            subtitlePath="help.subtitle"
            onEditField={onEditField}
          />
        <div className="mt-9 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {content.help.cards.map((card, index) => {
            const Icon = helpIcons[index % helpIcons.length]!;
            const cardSegment = getSegmentFromCard(card, index);
            const isEventCard = index === 3 || /evento|parceria/i.test(card.title);
            const programKind: ProgramInfoKind | null = index === 1 || /nutri/i.test(card.title)
              ? "nutri"
              : index === 2 || /empresa/i.test(card.title)
                ? "empresa"
                : null;
            const isExternalCard = card.href.startsWith("http") && !card.href.includes("onboarding") && !cardSegment && !isEventCard;
            return (
              <EditableCardWrapper
                key={`${card.title}-${index}`}
                isEditable={isEditable}
                path={`help.cards.${index}`}
                label={`Ajuda: ${card.title}`}
                data={card}
                schemaType="helpCard"
                onEditCard={onEditCard}
                className="rounded-[2rem]"
              >
                <div
                  onClick={() => {
                    if (!isEditable && isEventCard) {
                      setJourneySource("help_card");
                      trackEvent("help_card_click", { section: "help", source: "help_card", segment: "eventos", label: card.title });
                      trackEvent("funnel_started", { section: "help", source: "help_card", segment: "eventos" });
                      setEventFormOpen(true);
                    } else if (!isEditable && programKind) {
                      setJourneySource("help_card");
                      trackEvent("help_card_click", { section: "help", source: "help_card", segment: programKind === "nutri" ? "clube_nutri" : "empresa", label: card.title });
                      trackEvent("funnel_started", { section: "help", source: "help_card", segment: programKind === "nutri" ? "clube_nutri" : "empresa" });
                      setProgramInfo(programKind);
                    } else if (!isEditable && cardSegment) {
                      trackEvent("help_card_click", { section: "help", source: "help_card", segment: cardSegment, label: card.title });
                      trackEvent("funnel_started", { section: "help", source: "help_card", segment: cardSegment });
                      openChat(cardSegment, "help_card");
                    }
                  }}
                  className={`reveal-item group relative flex min-h-[560px] flex-col overflow-hidden rounded-[2rem] p-6 text-white shadow-sm sm:min-h-[520px] lg:min-h-[560px] ${
                    !isEditable && (cardSegment || isEventCard) ? "cursor-pointer" : ""
                  }`}
                >
                  <Media
                    source={card.image}
                    alt={card.title}
                    className="absolute inset-0 h-full w-full object-cover object-top transition duration-500 group-hover:scale-105"
                  />
                  <span className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-black/10" />
                  <span
                    className="relative flex size-11 items-center justify-center rounded-full bg-white/95"
                    style={{ color: card.color }}
                  >
                    <Icon className="size-5" />
                  </span>
                  <div className="relative mt-auto">
                    <h3 className="font-display text-2xl font-bold uppercase">{card.title}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-white/85">{card.text}</p>
                    {isExternalCard ? (
                      <TrackedLink
                        href={card.href}
                        label={card.title}
                        event="help_card_click"
                        className="mt-5 inline-flex items-center gap-2 rounded-full bg-[#42C8E5] px-5 py-3 text-sm font-bold uppercase text-[#00205C] shadow-lg shadow-black/15 transition-colors group-hover:bg-[#6ED4E9]"
                      >
                        <EditableText
                          isEditable={isEditable}
                          path={`help.cards.${index}.cta`}
                          label={`Texto do botão: ${card.title}`}
                          value={card.cta}
                          onEdit={onEditField}
                        >
                          {card.cta}
                        </EditableText>
                        <ArrowUpRight className="size-4" />
                      </TrackedLink>
                    ) : (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (isEditable) return;
                          if (isEventCard) {
                            setJourneySource("help_card");
                            trackEvent("help_card_click", { section: "help", source: "help_card", segment: "eventos", label: card.title });
                            trackEvent("funnel_started", { section: "help", source: "help_card", segment: "eventos" });
                            setEventFormOpen(true);
                            return;
                          }
                          if (programKind) {
                            setJourneySource("help_card");
                            trackEvent("help_card_click", { section: "help", source: "help_card", segment: programKind === "nutri" ? "clube_nutri" : "empresa", label: card.title });
                            trackEvent("funnel_started", { section: "help", source: "help_card", segment: programKind === "nutri" ? "clube_nutri" : "empresa" });
                            setProgramInfo(programKind);
                            return;
                          }
                          if (cardSegment) {
                            trackEvent("help_card_click", { section: "help", source: "help_card", segment: cardSegment, label: card.title });
                            trackEvent("funnel_started", { section: "help", source: "help_card", segment: cardSegment });
                          }
                          openChat(cardSegment, "help_card");
                        }}
                        className="mt-5 inline-flex items-center gap-2 rounded-full bg-[#42C8E5] px-5 py-3 text-sm font-bold uppercase text-[#00205C] shadow-lg shadow-black/15 transition-all hover:bg-[#6ED4E9] active:scale-95"
                      >
                        <EditableText
                          isEditable={isEditable}
                          path={`help.cards.${index}.cta`}
                          label={`Texto do botão: ${card.title}`}
                          value={card.cta}
                          onEdit={onEditField}
                        >
                          {card.cta}
                        </EditableText>
                        <ArrowUpRight className="size-4" />
                      </button>
                    )}
                  </div>
                </div>
              </EditableCardWrapper>
            );
          })}
        </div>
      </div>
    </SectionCanvas>



      {/* DESCUBRA MAIS */}
      {false && (
      <SectionCanvas
        id="descubra"
        sectionId="descubra"
        sectionTitle="Descubra"
        freeElements={content.sectionElements?.["descubra"]}
        background={content.sectionBackgrounds?.["descubra"]}
        className="reveal-section w-full bg-white px-4 py-8 md:px-6 md:py-12"
      >
        <div className="mx-auto max-w-[1520px]">
          <SectionHeading
            title={content.discover.title}
            subtitle={content.discover.subtitle}
            isEditable={isEditable}
            titlePath="discover.title"
            subtitlePath="discover.subtitle"
            onEditField={onEditField}
          />
        <div className="mt-9 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {content.discover.cards.map((card, index) => {
            const Icon = discoverIcons[index % discoverIcons.length]!;
            return (
              <EditableCardWrapper
                key={`${card.title}-${index}`}
                isEditable={isEditable}
                path={`discover.cards.${index}`}
                label={`Descubra: ${card.title}`}
                data={card}
                schemaType="discoverCard"
                onEditCard={onEditCard}
                className="rounded-[2rem]"
              >
                <div className="reveal-item group relative flex min-h-[560px] flex-col overflow-hidden rounded-[2rem] p-6 text-white shadow-sm sm:min-h-[520px] lg:min-h-[560px]">
                  <Media
                    source={card.image}
                    alt={card.title}
                    className="absolute inset-0 h-full w-full object-cover object-top transition duration-500 group-hover:scale-105"
                  />
                  <span className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-black/10" />
                  <span
                    className="relative flex size-11 items-center justify-center rounded-full bg-white/95"
                    style={{ color: card.color }}
                  >
                    <Icon className="size-5" />
                  </span>
                  <div className="relative mt-auto">
                    <h3 className="font-display text-2xl font-bold uppercase">{card.title}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-white/85">{card.text}</p>
                    <TrackedLink
                      href={card.href}
                      label={card.title}
                      event="discover_card_click"
                      className="mt-5 inline-flex items-center gap-2 rounded-full px-5 py-3 text-sm font-bold uppercase text-white shadow-lg shadow-black/15 transition-colors"
                      style={{
                        backgroundColor: card.color,
                      }}
                    >
                      <EditableText
                        isEditable={isEditable}
                        path={`discover.cards.${index}.cta`}
                        label={`Texto do botão: ${card.title}`}
                        value={card.cta}
                        onEdit={onEditField}
                      >
                        {card.cta}
                      </EditableText>
                      <ArrowUpRight className="size-4" />
                    </TrackedLink>
                  </div>
                </div>
              </EditableCardWrapper>
            );
          })}
        </div>
      </div>
      </SectionCanvas>
      )}

      {/* UNIDADES */}
      {false && (
      <SectionCanvas
        id="unidades"
        sectionId="unidades"
        sectionTitle="Unidades"
        freeElements={content.sectionElements?.["unidades"]}
        background={content.sectionBackgrounds?.["unidades"]}
        className="reveal-section bg-[#087fd9] px-4 py-8 text-white md:px-6 md:py-12"
      >
        <div className="mx-auto max-w-[1520px]">
          <SectionHeading
            title={content.units.title}
            subtitle={content.units.subtitle}
            light
            isEditable={isEditable}
            titlePath="units.title"
            subtitlePath="units.subtitle"
            onEditField={onEditField}
          />
          <div className="mt-9 grid gap-5 lg:grid-cols-2">
            {content.units.items.map((unit, index) => (
              <EditableCardWrapper
                key={`${unit.name}-${index}`}
                isEditable={isEditable}
                path={`units.items.${index}`}
                label={`Unidade: ${unit.name}`}
                data={unit}
                schemaType="unitItem"
                onEditCard={onEditCard}
                className="rounded-[2rem]"
              >
                <article className="reveal-item rounded-[2rem] bg-white p-7 text-foreground shadow-xl md:p-9">
                  <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#087fd9]">
                    Unidade local
                  </p>
                  <h3 className="mt-3 font-display text-3xl font-bold uppercase">{unit.name}</h3>
                  <p className="mt-6 flex gap-3 text-muted-foreground">
                    <MapPin className="mt-0.5 size-5 shrink-0 text-[#ff8515]" />
                    {unit.address}
                  </p>
                  <p className="mt-4 flex gap-3 text-muted-foreground">
                    <Clock3 className="mt-0.5 size-5 shrink-0 text-[#ff8515]" />
                    {unit.hours}
                  </p>
                  <div className="mt-7 flex flex-wrap gap-3">
                    {unit.mapUrl && (
                      <UnitButton
                        href={unit.mapUrl}
                        label={unit.mapLabel || "Localização"}
                        event="unit_map_click"
                        isEditable={isEditable}
                        path={`units.items.${index}.mapLabel`}
                        onEditField={onEditField}
                      />
                    )}
                    {unit.whatsapp && (
                      <UnitButton
                        href={unit.whatsapp}
                        label={unit.whatsappLabel || "WhatsApp"}
                        event="whatsapp_click"
                        color="bg-[#22a866] text-white border-transparent"
                        isEditable={isEditable}
                        path={`units.items.${index}.whatsappLabel`}
                        onEditField={onEditField}
                      />
                    )}
                    {unit.orderUrl && (
                      <UnitButton
                        href={unit.orderUrl}
                        label={unit.orderLabel || "Fazer pedido"}
                        event="order_click"
                        color="bg-[#ff8515] text-white border-transparent"
                        isEditable={isEditable}
                        path={`units.items.${index}.orderLabel`}
                        onEditField={onEditField}
                      />
                    )}
                    {unit.ifoodUrl && unit.ifoodUrl !== unit.orderUrl && (
                      <UnitButton
                        href={unit.ifoodUrl}
                        label={unit.ifoodLabel || "iFood"}
                        event="ifood_click"
                        color="bg-[#ea1d2c] text-white border-transparent"
                        isEditable={isEditable}
                        path={`units.items.${index}.ifoodLabel`}
                        onEditField={onEditField}
                      />
                    )}
                  </div>
                </article>
              </EditableCardWrapper>
            ))}
          </div>
        </div>
      </SectionCanvas>
      )}

      {/* LINKS COMPLEMENTARES */}
      <SectionCanvas
        id="links"
        sectionId="links"
        sectionTitle="Links"
        freeElements={content.sectionElements?.["links"]}
        background={content.sectionBackgrounds?.["links"]}
        className="reveal-section w-full bg-white px-4 py-6 md:px-6 md:py-8"
      >
        <div className="mx-auto max-w-[1520px]">
          <h2 className="reveal-item font-display text-3xl font-bold uppercase">
            {content.complementary.title}
          </h2>
          <div className="mt-6 flex flex-wrap gap-3">
            {content.complementary.links.map((link, index) => {
              const isNutri =
                link.href.includes("nutri") ||
                link.label.toLowerCase().includes("parceiro") ||
                link.label.toLowerCase().includes("nutri");
              const isEmpresa =
                link.href.includes("empresa") ||
                link.label.toLowerCase().includes("empresa");
              const isChat = isNutri || isEmpresa || link.href.includes("onboarding");

              if (isChat) {
                const seg = isNutri ? "clube_nutri" : isEmpresa ? "empresa" : undefined;
                return (
                  <button
                    key={`${link.label}-${index}`}
                    type="button"
                    onClick={() => openChat(seg)}
                    className="reveal-item inline-flex items-center gap-2 rounded-full border border-border bg-white px-5 py-3 font-semibold text-[#00205C] transition hover:border-[#42C8E5] hover:text-[#42C8E5]"
                  >
                    <EditableText
                      isEditable={isEditable}
                      path={`complementary.links.${index}.label`}
                      label="Texto do botão"
                      value={link.label}
                      onEdit={onEditField}
                    >
                      {link.label}
                    </EditableText>
                    <ArrowUpRight className="size-4" />
                  </button>
                );
              }

              return (
                <TrackedLink
                  key={`${link.label}-${index}`}
                  href={link.href}
                  label={link.label}
                  event="complementary_link_click"
                  className="reveal-item inline-flex items-center gap-2 rounded-full border border-border bg-white px-5 py-3 font-semibold transition hover:border-[#087fd9] hover:text-[#087fd9]"
                >
                  {link.label === "Instagram" && <Instagram className="size-4" />}
                  <EditableText
                    isEditable={isEditable}
                    path={`complementary.links.${index}.label`}
                    label="Texto do botão"
                    value={link.label}
                    onEdit={onEditField}
                  >
                    {link.label}
                  </EditableText>
                  <ArrowUpRight className="size-4" />
                </TrackedLink>
              );
            })}
          </div>
        </div>
      </SectionCanvas>

      {/* RODAPÉ */}
      {false && (
      <footer className="bg-[#171717] px-4 py-8 text-white md:px-6">
        <div className="mx-auto flex max-w-[1520px] flex-col gap-5 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="font-display text-2xl font-bold uppercase">
              GoldKo <span className="text-[#ff8515]">Rio Verde</span>
            </p>
            <EditableText
              isEditable={isEditable}
              path="footer.text"
              label="Rodapé: Texto de Descrição"
              value={content.footer.text}
              onEdit={onEditField}
              as="div"
            >
              <p className="mt-2 max-w-xl text-sm text-white/60">{content.footer.text}</p>
            </EditableText>
          </div>
          <div className="flex items-center gap-3">
            {content.footer.instagram && (
              <TrackedLink
                href={content.footer.instagram}
                label="Instagram no rodapé"
                event="social_click"
                className="flex size-11 items-center justify-center rounded-full border border-white/20"
              >
                <Instagram className="size-5" />
              </TrackedLink>
            )}
            {content.footer.whatsapp && (
              <TrackedLink
                href={content.footer.whatsapp}
                label="WhatsApp no rodapé"
                event="whatsapp_click"
                className="flex size-11 items-center justify-center rounded-full border border-white/20"
              >
                <MessageCircle className="size-5" />
              </TrackedLink>
            )}
          </div>
        </div>
        <p className="mx-auto mt-8 max-w-[1520px] border-t border-white/10 pt-6 text-xs text-white/40">
          © {new Date().getFullYear()} GoldKo Rio Verde. Todos os direitos reservados.
        </p>
      </footer>
      )}

      {/* CHAT CONVERSACIONAL DE CAPTAÇÃO */}
      <ChatLead
        open={chatOpen}
        onClose={() => { setChatOpen(false); setChatSegment(undefined); }}
        initialSegment={chatSegment}
        trackingSource={journeySource}
        onOpenCustomerMenu={() => {
          setChatOpen(false);
          setChatSegment(undefined);
          setCustomerMenuOpen(true);
        }}
      />
      <CustomerMenuModal
        open={customerMenuOpen}
        onClose={() => setCustomerMenuOpen(false)}
        trackingSource={journeySource}
        labels={content.customerMenu.labels}
        isEditable={isEditable}
        onEditField={onEditField}
        onOpenFidelity={() => setProgramInfo("fidelity")}
      />
      <EventPartnershipModal open={eventFormOpen} onClose={() => setEventFormOpen(false)} trackingSource={journeySource} />
      <ProgramInfoModal kind={programInfo} onClose={() => setProgramInfo(null)} trackingSource={programInfo === "nutri" || programInfo === "empresa" ? "help_card" : journeySource} trackingOption={programInfo === "fidelity" ? "fidelity" : undefined} />
    </main>
  );
}

function SectionHeading({
  title,
  subtitle,
  light = false,
  isEditable = false,
  titlePath,
  subtitlePath,
  onEditField,
}: {
  title: string;
  subtitle: string;
  light?: boolean;
  isEditable?: boolean;
  titlePath?: string;
  subtitlePath?: string;
  onEditField?: (path: string, label: string, value: string, type: "text" | "multiline") => void;
}) {
  return (
    <div className="text-center">
      {isEditable && titlePath ? (
        <EditableText
          isEditable={isEditable}
          path={titlePath}
          label="Título da Seção"
          value={title}
          onEdit={onEditField}
          as="div"
        >
          <h2 className="reveal-item font-display text-4xl font-bold uppercase md:text-5xl">{title}</h2>
        </EditableText>
      ) : (
        <h2 className="reveal-item font-display text-4xl font-bold uppercase md:text-5xl">{title}</h2>
      )}

      {isEditable && subtitlePath ? (
        <EditableText
          isEditable={isEditable}
          path={subtitlePath}
          label="Subtítulo da Seção"
          value={subtitle}
          onEdit={onEditField}
          as="div"
        >
          <p
            className={`reveal-item mx-auto mt-3 max-w-2xl text-base md:text-lg ${
              light ? "text-white/70" : "text-muted-foreground"
            }`}
          >
            {subtitle}
          </p>
        </EditableText>
      ) : (
        <p
          className={`reveal-item mx-auto mt-3 max-w-2xl text-base md:text-lg ${
            light ? "text-white/70" : "text-muted-foreground"
          }`}
        >
          {subtitle}
        </p>
      )}
    </div>
  );
}

function UnitButton({
  href,
  label,
  event,
  color = "border-border",
  isEditable = false,
  path,
  onEditField,
}: {
  href: string;
  label: string;
  event: string;
  color?: string;
  isEditable?: boolean;
  path?: string;
  onEditField?: (path: string, label: string, value: string, type: "text" | "multiline") => void;
}) {
  return (
    <TrackedLink
      href={href}
      label={label}
      event={event}
      className={`rounded-full border px-5 py-3 text-sm font-bold uppercase ${color}`}
    >
      <EditableText
        isEditable={isEditable}
        path={path || ""}
        label="Texto do botão da unidade"
        value={label}
        onEdit={onEditField}
      >
        {label}
      </EditableText>
    </TrackedLink>
  );
}
