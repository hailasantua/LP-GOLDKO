import type { SectionBackgroundsMap, SectionElementsMap } from "./free-elements";

export type SiteLink = {
  label: string;
  href: string;
};

export type FeatureCard = {
  title: string;
  text: string;
  href: string;
  image: string;
  color: string;
  cta: string;
};

export type ElementLayout = {
  x: number;
  y: number;
  width: number;
  zIndex?: number;
};

export type CustomerMenuLabels = {
  store: string;
  delivery: string;
  fidelity: string;
  menu: string;
  products: string;
  faq: string;
  personalOrders: string;
  giftOrders: string;
  feedback: string;
};

export type SiteContent = {
  navbar: {
    logoText: string;
    logoImage: string;
    logoWidth: number;
    ctaLabel: string;
    positions?: Record<string, { x: number; y: number }>;
  };
  hero: {
    eyebrow: string;
    heading: string;
    headingImage: string;
    title: string;
    highlight: string;
    text: string;
    cta: string;
    ctaHref: string;
    desktopVideo: string;
    mobileVideo: string;
    visualOrder: "media-first" | "heading-first";
  };
  help: {
    title: string;
    subtitle: string;
    cards: FeatureCard[];
  };
  customerMenu: {
    labels: CustomerMenuLabels;
  };
  business: {
    eyebrow: string;
    title: string;
    titleHighlight: string;
    text: string;
    features: Array<{ image: string; title: string; text: string }>;
    audiences: string[];
    primaryCta: SiteLink;
    whatsappCta: SiteLink;
    image: string;
  };
  discover: {
    title: string;
    subtitle: string;
    cards: FeatureCard[];
  };
  menu: {
    eyebrow: string;
    title: string;
    text: string;
    image: string;
    primaryCta: SiteLink;
  };
  about: {
    eyebrow: string;
    title: string;
    text: string;
    subtitle: string;
    story: string;
    image: string;
    primaryCta?: SiteLink;
    pillars: Array<{ image?: string; title: string; text: string }>;
  };
  socialProof: {
    title: string;
    subtitle: string;
    items: Array<{
      category: string;
      title: string;
      text: string;
      image: string;
      href: string;
    }>;
  };
  units: {
    title: string;
    subtitle: string;
    items: Array<{
      name: string;
      address: string;
      hours: string;
      whatsapp: string;
      mapUrl: string;
      orderUrl: string;
      ifoodUrl: string;
      mapLabel?: string;
      whatsappLabel?: string;
      orderLabel?: string;
      ifoodLabel?: string;
    }>;
  };
  complementary: {
    title: string;
    links: SiteLink[];
  };
  footer: {
    text: string;
    instagram: string;
    whatsapp: string;
  };
  meta?: {
    title?: string;
    thumbnail?: string;
  };
  sectionElements?: SectionElementsMap;
  sectionBackgrounds?: SectionBackgroundsMap;
  elementLayouts?: Record<string, ElementLayout | null>;
  deviceVersions?: {
    desktop?: unknown;
    mobile?: unknown;
  };
};

const ifoodUrl =
  "https://www.ifood.com.br/delivery/rio-verde-go/goldko-shopping-buriti-rio-verde-residencial-jardim-campestre/2035feba-7e16-49b2-89e5-d3239bc4d0d5";

export const defaultSiteContent: SiteContent = {
  navbar: {
    logoText: "GoldKo",
    logoImage: "/goldko-logo-navbar.png",
    logoWidth: 132,
    ctaLabel: "Fale com a gente",
  },
  hero: {
    eyebrow: "",
    heading: "É chocolate, é muito gostoso, é sem culpa!",
    headingImage: "",
    title: "É chocolate, é muito gostoso,",
    highlight: "é sem culpa!",
    text: "Tudo da GoldKo em um só lugar. 💙 Peça, fale com a gente, descubra benefícios e viva mais experiências GoldKo.",
    cta: "Como podemos te ajudar?",
    ctaHref: "#como-ajudar",
    desktopVideo: "/hero-desktop-video.mp4",
    mobileVideo: "/hero-chocolate-video.mp4",
    visualOrder: "media-first",
  },
  help: {
    title: "Como podemos te ajudar hoje?",
    subtitle: "Escolha o caminho que combina com o seu momento.",
    cards: [
      {
        title: "Cliente GoldKo",
        text: "Benefícios, novidades e experiências pensadas para você.",
        href: "#descubra",
        image: "/cliente-goldko-caixas.png",
        color: "#ff8100",
        cta: "Quero descobrir",
      },
      {
        title: "Clube do Nutri",
        text: "Soluções e parcerias para complementar seus planos alimentares.",
        href: "/onboarding?tipo=nutricionista",
        image: "/nutricionista-video.mp4",
        color: "#0088ff",
        cta: "Conhecer o clube",
      },
      {
        title: "GoldKo para Empresas",
        text: "Presentes, ações e soluções que todo mundo vai querer receber.",
        href: "#empresas",
        image: "/empresas-video.mp4",
        color: "#151515",
        cta: "Ver soluções",
      },
      {
        title: "Pedidos & Entregas",
        text: "Seu momento GoldKo onde você estiver.",
        href: ifoodUrl,
        image: "/entregador-video.mp4",
        color: "#ff4b3e",
        cta: "Pedir agora",
      },
    ],
  },
  customerMenu: {
    labels: {
      store: "Falar com a loja",
      delivery: "Pedidos e entregas",
      fidelity: "Cartão Fidelidade",
      menu: "Nosso cardápio",
      products: "Nossos produtos",
      faq: "Dúvidas frequentes",
      personalOrders: "Pedidos para você",
      giftOrders: "Pedidos para presentear",
      feedback: "Sugestões ou reclamações",
    },
  },
  business: {
    eyebrow: "GoldKo para empresas",
    title: "Um presente diferente.",
    titleHighlight: "Gostoso.",
    text: "Kits e soluções GoldKo para empresas que querem surpreender clientes, parceiros e colaboradores em qualquer ocasião.",
    features: [
      {
        image: "",
        title: "Zero adição de açúcares",
        text: "Sabor e bem-estar para todos.",
      },
      {
        image: "",
        title: "Presentes que marcam",
        text: "Ideais para eventos, campanhas e datas especiais.",
      },
      {
        image: "",
        title: "Do pequeno ao grande pedido",
        text: "Soluções para ações pontuais ou demandas recorrentes.",
      },
    ],
    audiences: ["Clientes", "Parceiros", "Colaboradores", "Eventos"],
    primaryCta: { label: "Quero uma proposta", href: "/onboarding?tipo=empresa" },
    whatsappCta: { label: "Atendimento para empresas", href: "" },
    image: "/goldko-empresas-presente.png",
  },
  discover: {
    title: "Descubra mais da GoldKo",
    subtitle: "Conheça nossos benefícios, produtos, história e unidades.",
    cards: [
      {
        title: "Cartão fidelidade",
        text: "Quanto mais GoldKo, melhor.",
        href: "https://app.fidelo.com.br/getpass/eavFmj?utm_source=qr",
        image: "/cartao-fidelidade.jpg",
        color: "#ff8100",
        cta: "Fazer meu cartão",
      },
      {
        title: "Conheça a GoldKo",
        text: "Descubra nossa história e o jeito GoldKo de transformar prazer em bem-estar.",
        href: "#conheca",
        image: "/hero-chocolate-video.mp4",
        color: "#0088ff",
        cta: "Conhecer a história",
      },
      {
        title: "Nosso cardápio",
        text: "Chocolate, cafeteria e experiências para todos os momentos.",
        href: "#cardapio",
        image: "/marcar-goldko.jpg",
        color: "#242424",
        cta: "Ver cardápio",
      },
      {
        title: "Nossas unidades",
        text: "Encontre a GoldKo mais perto de você.",
        href: "#unidades",
        image: "/empresas.jpg",
        color: "#6750d8",
        cta: "Encontrar uma loja",
      },
    ],
  },
  menu: {
    eyebrow: "Nosso cardápio",
    title: "Tem GoldKo para todos os momentos.",
    text: "Chocolates, marshmallows, cafés especiais e escolhas deliciosas para saborear na loja ou pedir onde estiver.",
    image: "/marcar-goldko.jpg",
    primaryCta: { label: "Ver opções e pedir", href: ifoodUrl },
  },
  about: {
    eyebrow: "Conheça a GoldKo",
    title: "Cuidar de si sem abrir mão do prazer.",
    text: "Acreditamos que se cuidar não precisa significar abrir mão do prazer.\n\nA GoldKo nasceu para provar que chocolate zero adição de açúcares pode ser cremoso, surpreendente e muito gostoso.",
    subtitle: "Chocolate é nossa paixão. Inovação faz parte da nossa história.",
    story:
      "Depois de anos de testes e descobertas, nasceu em 2016 o primeiro chocolate GoldKo.\n\nDesde então, seguimos criando chocolates, marshmallows, cafés especiais e experiências que unem sabor e bem-estar.",
    image: "/goldko-conheca-video.mp4",
    primaryCta: { label: "Conhecer nossos produtos", href: "#cardapio" },
    pillars: [
      {
        image: "",
        title: "Inovação",
        text: "Produtos surpreendentes, zero adição de açúcares e cheios de sabor.",
      },
      {
        image: "",
        title: "Bem-estar",
        text: "Prazer e equilíbrio podem caminhar juntos.",
      },
      {
        image: "",
        title: "Experiência",
        text: "Muito além do chocolate: produtos, cafeteria e momentos que fazem parte do dia a dia.",
      },
    ],
  },
  socialProof: {
    title: "GoldKo por aí",
    subtitle: "Encontros, parcerias e histórias que deixam a vida mais gostosa.",
    items: [
      {
        category: "Experiências",
        title: "Momentos que viram memória",
        text: "GoldKo presente nos dias que merecem um sabor especial.",
        image: "/marcar-goldko.jpg",
        href: "https://www.instagram.com/goldko.rioverde",
      },
      {
        category: "Empresas",
        title: "Marcas que escolhem surpreender",
        text: "Ações e presentes criados para clientes, parceiros e equipes.",
        image: "/empresas.jpg",
        href: "#empresas",
      },
      {
        category: "Nutricionistas",
        title: "Parcerias com propósito",
        text: "Profissionais que acreditam em prazer, equilíbrio e novas escolhas.",
        image: "/cartao-fidelidade.jpg",
        href: "/onboarding?tipo=nutricionista",
      },
    ],
  },
  units: {
    title: "Nossas unidades",
    subtitle: "Comece pelas lojas da nossa operação local.",
    items: [
      {
        name: "GoldKo — Buriti Shopping Rio Verde",
        address: "BR-060, 1044 · Jardim Campestre · Rio Verde — GO",
        hours: "Segunda a sábado, 10h às 22h · Domingo, 11h às 22h",
        whatsapp: "",
        mapUrl: "https://www.google.com/maps/search/?api=1&query=GoldKo+Buriti+Shopping+Rio+Verde",
        orderUrl: ifoodUrl,
        ifoodUrl,
        mapLabel: "Localização",
        whatsappLabel: "WhatsApp",
        orderLabel: "Fazer pedido",
        ifoodLabel: "iFood",
      },
    ],
  },
  complementary: {
    title: "Continue com a GoldKo",
    links: [
      { label: "Instagram", href: "https://www.instagram.com/goldko.rioverde" },
      {
        label: "Cartão fidelidade",
        href: "https://app.fidelo.com.br/getpass/eavFmj?utm_source=qr",
      },
      { label: "Fale com a equipe", href: "/contato" },
      { label: "Seja parceiro", href: "/onboarding?tipo=nutricionista" },
    ],
  },
  footer: {
    text: "GoldKo Rio Verde · Chocolate, cafeteria e experiências para todos os momentos.",
    instagram: "https://www.instagram.com/goldko.rioverde",
    whatsapp: "",
  },
  sectionElements: {},
  sectionBackgrounds: {},
};

export function mergeSiteContent(value: unknown): SiteContent {
  if (!value || typeof value !== "object") return defaultSiteContent;
  const candidate = value as Partial<SiteContent>;
  return {
    ...defaultSiteContent,
    ...candidate,
    navbar: { ...defaultSiteContent.navbar, ...candidate.navbar },
    hero: {
      ...defaultSiteContent.hero,
      ...candidate.hero,
      heading:
        candidate.hero?.heading ||
        [candidate.hero?.title, candidate.hero?.highlight].filter(Boolean).join(" ") ||
        defaultSiteContent.hero.heading,
    },
    help: { ...defaultSiteContent.help, ...candidate.help },
    customerMenu: {
      ...defaultSiteContent.customerMenu,
      ...candidate.customerMenu,
      labels: {
        ...defaultSiteContent.customerMenu.labels,
        ...candidate.customerMenu?.labels,
      },
    },
    business: { ...defaultSiteContent.business, ...candidate.business },
    discover: { ...defaultSiteContent.discover, ...candidate.discover },
    menu: { ...defaultSiteContent.menu, ...candidate.menu },
    about: { ...defaultSiteContent.about, ...candidate.about },
    socialProof: { ...defaultSiteContent.socialProof, ...candidate.socialProof },
    units: { ...defaultSiteContent.units, ...candidate.units },
    complementary: { ...defaultSiteContent.complementary, ...candidate.complementary },
    footer: { ...defaultSiteContent.footer, ...candidate.footer },
    meta: candidate.meta ? { ...candidate.meta } : undefined,
    sectionElements: candidate.sectionElements ? { ...candidate.sectionElements } : {},
    sectionBackgrounds: candidate.sectionBackgrounds ? { ...candidate.sectionBackgrounds } : {},
  };
}

export function createBlankSiteContent(pageTitle: string = "Nova Página"): SiteContent {
  return {
    navbar: {
      logoText: "GoldKo",
      logoImage: "/goldko-logo-navbar.png",
      logoWidth: 132,
      ctaLabel: "Fale com a gente",
    },
    hero: {
      eyebrow: "SUA NOVA PÁGINA",
      heading: `${pageTitle} do zero`,
      headingImage: "",
      title: pageTitle.toUpperCase(),
      highlight: "DO ZERO",
      text: "Esta é uma nova página criada do zero. Clique diretamente nos textos, imagens ou botões para personalizar tudo como quiser.",
      cta: "Fale com a gente",
      ctaHref: "#contato",
      desktopVideo: "",
      mobileVideo: "",
      visualOrder: "media-first",
    },
    help: {
      title: "Como podemos ajudar",
      subtitle: "Adicione os principais destaques, serviços ou vantagens aqui.",
      cards: [
        {
          title: "Destaque 1",
          text: "Clique para alterar este texto e descrever sua oferta.",
          href: "#",
          image: "",
          color: "#ff8100",
          cta: "Saiba mais",
        },
        {
          title: "Destaque 2",
          text: "Clique para alterar este texto e descrever sua oferta.",
          href: "#",
          image: "",
          color: "#0088ff",
          cta: "Saiba mais",
        },
        {
          title: "Destaque 3",
          text: "Clique para alterar este texto e descrever sua oferta.",
          href: "#",
          image: "",
          color: "#ff7900",
          cta: "Saiba mais",
        },
      ],
    },
    customerMenu: {
      labels: { ...defaultSiteContent.customerMenu.labels },
    },
    business: {
      eyebrow: "CONHEÇA MAIS",
      title: "Apresente sua solução",
      titleHighlight: "com exclusividade",
      text: "Espaço dedicado para apresentar sua proposta de valor, novidades ou linhas especiais.",
      features: [
        {
          image: "",
          title: "Benefício Exclusivo",
          text: "Descreva a qualidade e o diferencial do que você oferece.",
        },
        {
          image: "",
          title: "Atendimento Rápido",
          text: "Facilidade de contato para tirar dúvidas e fechar pedidos.",
        },
      ],
      audiences: ["Clientes", "Parceiros", "Eventos"],
      primaryCta: { label: "Quero uma proposta", href: "#contato" },
      whatsappCta: { label: "Falar pelo WhatsApp", href: "" },
      image: "",
    },
    discover: {
      title: "Descubra mais",
      subtitle: "Explore opções e produtos especiais.",
      cards: [
        {
          title: "Opção 1",
          text: "Detalhes sobre este produto ou serviço.",
          href: "#",
          image: "",
          color: "#ff8100",
          cta: "Ver mais",
        },
        {
          title: "Opção 2",
          text: "Detalhes sobre este produto ou serviço.",
          href: "#",
          image: "",
          color: "#0088ff",
          cta: "Ver mais",
        },
      ],
    },
    menu: {
      eyebrow: "Catálogo",
      title: "Conheça nossas opções completas",
      text: "Tudo preparado com carinho e qualidade única para você.",
      image: "",
      primaryCta: { label: "Ver cardápio e opções", href: "#" },
    },
    about: {
      eyebrow: "Sobre nós",
      title: "Qualidade sem abrir mão do sabor.",
      text: "Conte um pouco sobre sua essência, diferencial e missão aqui.",
      subtitle: "Compromisso com o que há de melhor.",
      story: "Cada detalhe é pensado para proporcionar uma experiência inesquecível.",
      image: "",
      primaryCta: { label: "Saiba mais", href: "#" },
      pillars: [
        { image: "", title: "Qualidade", text: "Feito com os melhores ingredientes." },
        { image: "", title: "Cuidado", text: "Atenção em cada detalhe." },
        { image: "", title: "Sabor", text: "Experiência gastronômica marcante." },
      ],
    },
    socialProof: {
      title: "Experiências e Depoimentos",
      subtitle: "O que os clientes dizem",
      items: [],
    },
    units: {
      title: "Nossas unidades",
      subtitle: "Onde nos encontrar",
      items: [
        {
          name: "GoldKo — Buriti Shopping Rio Verde",
          address: "BR-060, 1044 · Jardim Campestre · Rio Verde — GO",
          hours: "Segunda a sábado, 10h às 22h · Domingo, 11h às 22h",
          whatsapp: "",
          mapUrl: "https://www.google.com/maps/search/?api=1&query=GoldKo+Buriti+Shopping+Rio+Verde",
          orderUrl: ifoodUrl,
          ifoodUrl,
        },
      ],
    },
    complementary: {
      title: "Continue com a GoldKo",
      links: [
        { label: "Instagram", href: "https://www.instagram.com/goldko.rioverde" },
        { label: "Fale com a equipe", href: "/contato" },
      ],
    },
    footer: {
      text: "GoldKo Rio Verde · Chocolate, cafeteria e experiências para todos os momentos.",
      instagram: "https://www.instagram.com/goldko.rioverde",
      whatsapp: "",
    },
    sectionElements: {},
    sectionBackgrounds: {},
  };
}
