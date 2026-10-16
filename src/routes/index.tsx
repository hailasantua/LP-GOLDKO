import { useEffect, useRef } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { ArrowRight, ArrowUpRight } from "lucide-react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import nutriImg from "@/assets/nutri.jpg";
import empresasImg from "@/assets/empresas.jpg";
import deliveryImg from "@/assets/delivery.jpg";
import cartaoFidelidadeImg from "@/assets/cartao-fidelidade.jpg";
import marcarGoldkoImg from "@/assets/marcar-goldko.jpg";
import { HomePage } from "@/components/home-page";

const heroVideoSrc = "/hero-desktop-video.mp4";
const heroMobileVideoSrc = "/hero-chocolate-video.mp4";
const nutriVideoSrc = "/nutricionista-video.mp4";
const empresasVideoSrc = "/empresas-video.mp4";
const ifoodVideoSrc = "/entregador-video.mp4";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Goldko — Alimentação que move pessoas" },
      {
        name: "description",
        content:
          "Soluções práticas, nutritivas e acessíveis para clientes, nutricionistas, empresas e delivery.",
      },
      { property: "og:title", content: "Goldko — Alimentação que move pessoas" },
      {
        property: "og:description",
        content: "Uma Goldko para cada momento do seu dia.",
      },
    ],
  }),
  component: HomePage,
});

const audiences = [
  {
    title: "Nutricionistas",
    text: "A solução ideal para complementar seus planos alimentares.",
    video: nutriVideoSrc,
    bgColor: "#FF8100",
    href: "/onboarding?tipo=nutricionista",
  },
  {
    title: "Empresas",
    text: "Alimentação de qualidade para equipes mais felizes e produtivas.",
    video: empresasVideoSrc,
    bgColor: "#0088FF",
    href: "/onboarding?tipo=empresa",
  },
  {
    title: "iFood",
    text: "Soluções práticas para impulsionar seu negócio.",
    video: ifoodVideoSrc,
    bgColor: "#FF7900",
    href: "https://www.ifood.com.br/delivery/rio-verde-go/goldko-shopping-buriti-rio-verde-residencial-jardim-campestre/2035feba-7e16-49b2-89e5-d3239bc4d0d5?utm_medium=share&fbclid=PAcGRvZgRleHRuA2FlbQIxMQBzcnRjBmFwcF9pZAwyNTYyODEwNDA1NTgAAafIVBTeHoaJ4ixIWP540MLrZBOdGFYRDkEpnTaBtHj1zvnBjwiDxoQCmWZg_A_aem_8FbXm8Hvhb4ATi6jAw6eSA",
  },
];

const moments = [
  {
    title: "Cartão fidelidade",
    text: "Faça seu cartão fidelidade e ganhe R$75",
    image: cartaoFidelidadeImg,
    href: "https://app.fidelo.com.br/getpass/eavFmj?utm_source=qr",
    bgColor: "#FF8100",
  },
  {
    title: "Marcar a Goldko",
    text: "Story marcando @goldko.rioverde vale um bombom!",
    image: marcarGoldkoImg,
    href: "https://www.instagram.com/goldko.rioverde",
    bgColor: "#0088FF",
  },
  {
    title: "Empresa",
    text: "Alimentação que gera bem-estar e resultados.",
    image: empresasImg,
    href: "/onboarding?tipo=empresa",
    bgColor: "#FF8100",
  },
];

function Index() {
  const containerRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;

    gsap.registerPlugin(ScrollTrigger);

    const ctx = gsap.context(() => {
      // 1. Hero Entrance Timeline
      const heroTl = gsap.timeline({ defaults: { ease: "power3.out" } });

      heroTl
        .fromTo(
          ".gsap-hero-card",
          { opacity: 0, y: 30, scale: 0.98 },
          { opacity: 1, y: 0, scale: 1, duration: 0.9 },
        )
        .fromTo(
          ".gsap-hero-title",
          { opacity: 0, y: 25 },
          { opacity: 1, y: 0, duration: 0.8 },
          "-=0.6",
        )
        .fromTo(
          ".gsap-hero-divider",
          { opacity: 0, scaleX: 0.6 },
          { opacity: 1, scaleX: 1, duration: 0.6 },
          "-=0.5",
        )
        .fromTo(
          ".gsap-hero-desc",
          { opacity: 0, y: 20 },
          { opacity: 1, y: 0, duration: 0.6 },
          "-=0.4",
        )
        .fromTo(
          ".gsap-hero-btn",
          { opacity: 0, y: 20, scale: 0.95 },
          { opacity: 1, y: 0, scale: 1, duration: 0.6 },
          "-=0.4",
        )
        .fromTo(
          ".gsap-hero-video",
          { opacity: 0, scale: 0.95, y: 25 },
          { opacity: 1, scale: 1, y: 0, duration: 0.9 },
          "-=0.7",
        );

      // 2. Audience Cards Entrance (ScrollTrigger)
      gsap.fromTo(
        ".gsap-audience-card",
        { opacity: 0, y: 40, scale: 0.96 },
        {
          opacity: 1,
          y: 0,
          scale: 1,
          duration: 0.75,
          stagger: 0.15,
          ease: "power3.out",
          scrollTrigger: {
            trigger: ".gsap-audiences-section",
            start: "top 88%",
            toggleActions: "play none none none",
          },
        },
      );

      // 3. Moments Section Header
      gsap.fromTo(
        ".gsap-moments-header",
        { opacity: 0, y: 30 },
        {
          opacity: 1,
          y: 0,
          duration: 0.8,
          ease: "power3.out",
          scrollTrigger: {
            trigger: "#momentos",
            start: "top 88%",
            toggleActions: "play none none none",
          },
        },
      );

      // 4. Moments Cards Entrance (ScrollTrigger)
      gsap.fromTo(
        ".gsap-moment-card",
        { opacity: 0, y: 45, scale: 0.96 },
        {
          opacity: 1,
          y: 0,
          scale: 1,
          duration: 0.8,
          stagger: 0.15,
          ease: "power3.out",
          scrollTrigger: {
            trigger: ".gsap-moments-grid",
            start: "top 88%",
            toggleActions: "play none none none",
          },
        },
      );
    }, containerRef);

    return () => ctx.revert();
  }, []);

  return (
    <main
      ref={containerRef}
      className="min-h-screen bg-background px-3 py-4 md:px-5 md:py-6 lg:px-6"
    >
      {/* Hero */}
      <section className="gsap-hero-card mx-auto max-w-[1520px] overflow-hidden rounded-4xl bg-hero p-4 md:p-5 lg:p-6 opacity-0">
        <div className="grid gap-4 md:grid-cols-[1fr_1.15fr] lg:grid-cols-[1fr_1.25fr] lg:gap-6">
          <div className="relative flex flex-col items-center justify-center text-center py-4 md:py-6 lg:py-8 z-10">
            <h1 className="gsap-hero-title font-display text-4xl leading-[1.18] md:leading-[1.12] lg:leading-[1.12] font-bold tracking-tight uppercase text-hero-foreground md:text-6xl lg:text-7xl opacity-0">
              É chocolate,
              <br />
              é muito gostoso,
              <br />
              <span className="text-[#FE7E00]">é sem culpa!</span>
            </h1>

            {/* Divisor decorativo com folhas */}
            <div className="gsap-hero-divider my-4 md:my-5 flex w-full max-w-xs md:max-w-sm items-center justify-center gap-3 opacity-0">
              <span className="h-px flex-1 bg-hero-foreground/30" />
              <svg
                viewBox="0 0 40 24"
                className="h-5 w-9 fill-current text-hero-foreground/80 shrink-0"
                aria-hidden="true"
              >
                <path d="M19 22 C18 15 11 10.5 2 9.5 C-0.5 9 0 4.5 3.5 2.5 C8.5 0 16 3.5 18.5 11.5 C19.2 14 19 22 19 22 Z" />
                <path d="M21 22 C22 15 29 10.5 38 9.5 C40.5 9 40 4.5 36.5 2.5 C31.5 0 24 3.5 21.5 11.5 C20.8 14 21 22 21 22 Z" />
              </svg>
              <span className="h-px flex-1 bg-hero-foreground/30" />
            </div>

            <p className="gsap-hero-desc max-w-md text-base leading-relaxed text-hero-foreground/90 md:text-lg opacity-0">
              Um <strong className="font-bold text-hero-foreground">Goldko</strong> para cada
              momento!
            </p>

            <a
              href="#momentos"
              className="gsap-hero-btn mt-5 md:mt-6 inline-flex w-fit items-center gap-3 rounded-full bg-[#FE7E00] hover:bg-[#e06f00] px-7 py-3.5 text-base font-semibold text-white shadow-md transition-all hover:scale-[1.03] opacity-0 uppercase"
            >
              Como posso ajudar?
              <ArrowUpRight className="size-5" />
            </a>
          </div>

          <div className="gsap-hero-video hero-video-mask overflow-hidden opacity-0">
            {/* Vídeo mobile */}
            <video
              src={heroMobileVideoSrc}
              autoPlay
              loop
              muted
              playsInline
              width={800}
              height={1104}
              className="h-full w-full bg-hero object-cover block md:hidden"
            />
            {/* Vídeo desktop */}
            <video
              src={heroVideoSrc}
              autoPlay
              loop
              muted
              playsInline
              width={800}
              height={1104}
              className="h-full w-full bg-hero object-cover md:max-h-[560px] hidden md:block"
            />
          </div>
        </div>
      </section>

      {/* Públicos */}
      <section className="gsap-audiences-section mx-auto mt-4 grid max-w-[1520px] gap-4 md:grid-cols-3">
        {audiences.map((a) => {
          const cardContent = (
            <>
              <div className="flex flex-1 flex-col">
                <h2 className="font-display text-lg font-bold uppercase text-white">{a.title}</h2>
                <p className="mt-2 text-base leading-relaxed text-white/90">{a.text}</p>
                <span className="mt-auto pt-6">
                  <span className="flex size-9 items-center justify-center rounded-full bg-white transition-transform group-hover:scale-110 shadow-sm">
                    <ArrowRight className="size-4" style={{ color: a.bgColor }} />
                  </span>
                </span>
              </div>
              <div
                className="audience-media-mask w-28 shrink-0 rounded-3xl md:w-24 lg:w-32 aspect-3/4"
                style={{ "--mask-color": a.bgColor } as React.CSSProperties}
              >
                <video
                  src={a.video}
                  autoPlay
                  loop
                  muted
                  playsInline
                  width={672}
                  height={992}
                  className="h-full w-full object-cover"
                />
              </div>
            </>
          );

          if (a.href) {
            const isExternal = a.href.startsWith("http");
            return (
              <a
                key={a.title}
                href={a.href}
                target={isExternal ? "_blank" : undefined}
                rel={isExternal ? "noopener noreferrer" : undefined}
                style={{ backgroundColor: a.bgColor }}
                className="gsap-audience-card group flex gap-4 rounded-4xl p-5 text-white shadow-sm transition-all hover:scale-[1.01] cursor-pointer opacity-0"
              >
                {cardContent}
              </a>
            );
          }

          return (
            <article
              key={a.title}
              style={{ backgroundColor: a.bgColor }}
              className="gsap-audience-card group flex gap-4 rounded-4xl p-5 text-white shadow-sm transition-all hover:scale-[1.01] opacity-0"
            >
              {cardContent}
            </article>
          );
        })}
      </section>

      {/* Momentos */}
      <section id="momentos" className="mx-auto mt-12 max-w-[1520px]">
        <div className="gsap-moments-header text-center opacity-0">
          <h2 className="font-display text-2xl font-bold uppercase md:text-4xl">
            Uma Goldko para cada momento
          </h2>
          <p className="mx-auto mt-3 max-w-3xl text-base text-muted-foreground md:text-lg">
            Escolha a solução que combina com você e aproveite o melhor da nossa alimentação.
          </p>
        </div>

        <div className="gsap-moments-grid mt-6 grid gap-4 md:grid-cols-3">
          {moments.map((m) => {
            const content = (
              <>
                <h3 className="font-display text-lg font-bold uppercase text-white">{m.title}</h3>
                <p className="mt-2 text-base leading-relaxed text-white/90">{m.text}</p>
                <img
                  src={m.image}
                  alt={m.title}
                  width={672}
                  height={992}
                  loading="lazy"
                  className="mt-4 aspect-4/5 w-full rounded-3xl object-cover"
                />
                <span className="mt-4 flex size-9 items-center justify-center rounded-full bg-white transition-transform group-hover:scale-110 shadow-sm">
                  <ArrowRight className="size-4" style={{ color: m.bgColor }} />
                </span>
              </>
            );

            if (m.href) {
              return (
                <a
                  key={m.title}
                  href={m.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ backgroundColor: m.bgColor }}
                  className="gsap-moment-card group flex flex-col rounded-4xl p-5 text-white shadow-sm transition-transform hover:scale-[1.02] cursor-pointer opacity-0"
                >
                  {content}
                </a>
              );
            }

            return (
              <article
                key={m.title}
                style={{ backgroundColor: m.bgColor }}
                className="gsap-moment-card group flex flex-col rounded-4xl p-5 text-white shadow-sm transition-transform hover:scale-[1.02] opacity-0"
              >
                {content}
              </article>
            );
          })}
        </div>
      </section>

      <footer className="mx-auto mt-10 max-w-[1520px] pb-6 text-center text-sm text-muted-foreground">
        © {new Date().getFullYear()} Goldko
      </footer>
    </main>
  );
}
