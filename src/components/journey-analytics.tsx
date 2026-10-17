import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowRight, Loader2, MoreHorizontal, RefreshCw, Trash2 } from "lucide-react";
import {
  clearAnalyticsEvents,
  getAnalyticsEvents,
  type AnalyticsEventRow,
  type JourneyLeadRow,
} from "@/lib/analytics.functions";
import { supabase } from "@/integrations/supabase/client";

type Period = 7 | 30 | 90;
const PERIODS: Period[] = [7, 30, 90];
const DAY = 24 * 60 * 60 * 1000;

const uniqueVisitors = (events: AnalyticsEventRow[]) =>
  new Set(events.map((event) => event.visitor_id)).size;
const pct = (part: number, total: number) => (total ? Math.round((part / total) * 100) : 0);
const fmt = new Intl.NumberFormat("pt-BR");

const CUSTOMER_OPTIONS = [
  ["store", "Falar com a loja", true],
  ["delivery", "Pedidos e entregas", true],
  ["fidelity", "Cartão fidelidade", true],
  ["feedback", "Sugestões ou reclamações", true],
  ["menu", "Nosso cardápio", false],
  ["products", "Nossos produtos", false],
  ["faq", "Dúvidas frequentes", false],
  ["personalOrders", "Pedidos para você", false],
  ["giftOrders", "Pedidos para presentear", false],
] as const;

/** Calcula todos os números da Jornada para uma janela de eventos. */
function summarize(events: AnalyticsEventRow[], leads: JourneyLeadRow[]) {
  const named = (name: string) => events.filter((event) => event.event_name === name);

  const visitors = uniqueVisitors(named("page_view"));
  const chatOpened = uniqueVisitors(named("chat_opened"));

  const heroOpenEvents = named("hero_cta_click");
  const heroOpeners = new Set(heroOpenEvents.map((event) => event.visitor_id));
  const heroOpened = heroOpeners.size;
  const heroChose = uniqueVisitors(
    named("segment_selected").filter((event) => heroOpeners.has(event.visitor_id)),
  );
  const heroDone = uniqueVisitors(
    named("funnel_completed").filter((event) => event.source === "hero"),
  );
  const heroAbandoned = uniqueVisitors(
    named("chat_abandoned").filter((event) => event.source === "hero"),
  );

  const fromCard = (segment: string) =>
    events.filter((event) => event.source === "help_card" && event.segment === segment);
  const card = (segment: string, finishEvent: string, finishLabel: string) => {
    const scoped = fromCard(segment);
    return {
      clicked: uniqueVisitors(scoped.filter((event) => event.event_name === "help_card_click")),
      finished: uniqueVisitors(scoped.filter((event) => event.event_name === finishEvent)),
      finishLabel,
    };
  };
  const cards = [
    {
      key: "cliente",
      label: "Clientes",
      color: "bg-[#42C8E5]",
      ...card("cliente", "funnel_completed", "concluíram uma ação"),
    },
    {
      key: "clube_nutri",
      label: "Clube Nutri",
      color: "bg-[#ff8515]",
      ...card("clube_nutri", "program_cta_click", "foram ao WhatsApp"),
    },
    {
      key: "empresa",
      label: "Empresas",
      color: "bg-[#00205C]",
      ...card("empresa", "program_cta_click", "foram ao WhatsApp"),
    },
    {
      key: "eventos",
      label: "Eventos e parcerias",
      color: "bg-violet-500",
      ...card("eventos", "lead_submit", "enviaram o formulário"),
    },
  ];

  const customerEvents = fromCard("cliente");
  const optionClicks = customerEvents.filter(
    (event) => event.event_name === "customer_option_click",
  );
  const destinations = CUSTOMER_OPTIONS.map(([key, label, active]) => ({
    key,
    label,
    active,
    people: uniqueVisitors(optionClicks.filter((event) => event.metadata?.["option"] === key)),
  }));

  return {
    visitors,
    chatOpened,
    leads: leads.length,
    conversion: visitors ? (leads.length / visitors) * 100 : null,
    hero: { opened: heroOpened, chose: heroChose, done: heroDone, abandoned: heroAbandoned },
    cards,
    destinations,
  };
}

function Delta({
  current,
  previous,
  kind = "percent",
}: {
  current: number | null;
  previous: number | null;
  kind?: "percent" | "points";
}) {
  if (current === null || previous === null)
    return <span className="text-xs text-gray-400">sem comparação</span>;
  if (kind === "points") {
    const diff = Math.round((current - previous) * 10) / 10;
    if (diff === 0) return <span className="text-xs text-gray-400">igual ao período anterior</span>;
    return (
      <span className={`text-xs font-semibold ${diff > 0 ? "text-emerald-700" : "text-red-600"}`}>
        {diff > 0 ? "+" : "−"}
        {Math.abs(diff).toLocaleString("pt-BR")} p.p. vs. anterior
      </span>
    );
  }
  if (previous === 0) {
    return current > 0 ? (
      <span className="text-xs font-semibold text-emerald-700">novo no período</span>
    ) : (
      <span className="text-xs text-gray-400">sem dados anteriores</span>
    );
  }
  const change = Math.round(((current - previous) / previous) * 100);
  if (change === 0) return <span className="text-xs text-gray-400">igual ao período anterior</span>;
  return (
    <span className={`text-xs font-semibold ${change > 0 ? "text-emerald-700" : "text-red-600"}`}>
      {change > 0 ? "+" : "−"}
      {Math.abs(change)}% vs. anterior
    </span>
  );
}

function Kpi({
  label,
  value,
  children,
}: {
  label: string;
  value: string;
  children?: React.ReactNode;
}) {
  return (
    <article className="rounded-2xl border border-gray-200 bg-white p-4 sm:p-5">
      <p className="text-sm text-gray-500">{label}</p>
      <p className="mt-1 text-3xl font-bold tabular-nums text-[#00205C]">{value}</p>
      <div className="mt-1 min-h-4">{children}</div>
    </article>
  );
}

function Panel({
  title,
  children,
  footer,
}: {
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-5">
      <h2 className="text-base font-semibold text-[#00205C]">{title}</h2>
      <div className="mt-4">{children}</div>
      {footer && <div className="mt-4 text-sm">{footer}</div>}
    </section>
  );
}

export function JourneyAnalytics({ onOpenLeads }: { onOpenLeads?: () => void }) {
  const [period, setPeriod] = useState<Period>(30);
  const [events, setEvents] = useState<AnalyticsEventRow[]>([]);
  const [leads, setLeads] = useState<JourneyLeadRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [clearing, setClearing] = useState(false);
  const [error, setError] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  async function getToken() {
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    if (!token) throw new Error("Sessão expirada.");
    return token;
  }

  async function load(days: Period = period) {
    setLoading(true);
    setError("");
    try {
      const result = await getAnalyticsEvents({ data: { accessToken: await getToken(), days } });
      setEvents(result.events);
      setLeads(result.leads);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível carregar o tracking.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load(period);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [period]);

  useEffect(() => {
    if (!menuOpen) return;
    const close = (event: MouseEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) {
        setMenuOpen(false);
        setConfirmClear(false);
      }
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [menuOpen]);

  async function clearData() {
    setClearing(true);
    setError("");
    try {
      await clearAnalyticsEvents({ data: { accessToken: await getToken() } });
      setEvents([]);
      setMenuOpen(false);
      setConfirmClear(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível limpar os dados.");
    } finally {
      setClearing(false);
    }
  }

  const { current, previous } = useMemo(() => {
    const split = Date.now() - period * DAY;
    const inCurrent = (date: string) => new Date(date).getTime() >= split;
    return {
      current: summarize(
        events.filter((event) => inCurrent(event.created_at)),
        leads.filter((lead) => inCurrent(lead.created_at)),
      ),
      previous: summarize(
        events.filter((event) => !inCurrent(event.created_at)),
        leads.filter((lead) => !inCurrent(lead.created_at)),
      ),
    };
  }, [events, leads, period]);

  const heroSteps = [
    { label: "Abriram o chat", value: current.hero.opened },
    { label: "Escolheram o perfil", value: current.hero.chose },
    { label: "Concluíram", value: current.hero.done },
  ];
  const biggestLoss = (() => {
    const drops = [
      {
        text: "entre abrir o chat e escolher o perfil",
        lost: current.hero.opened - current.hero.chose,
      },
      { text: "entre escolher o perfil e concluir", lost: current.hero.chose - current.hero.done },
    ].filter((drop) => drop.lost > 0);
    if (!drops.length) return null;
    return drops.sort((a, b) => b.lost - a.lost)[0]!;
  })();

  const maxCard = Math.max(1, ...current.cards.map((card) => card.clicked));
  const activeDestinations = current.destinations
    .filter((item) => item.active || item.people > 0)
    .sort((a, b) => b.people - a.people);
  const hiddenSoon = current.destinations.filter(
    (item) => !item.active && item.people === 0,
  ).length;
  const maxDestination = Math.max(1, ...activeDestinations.map((item) => item.people));

  return (
    <section className="space-y-5">
      {/* BARRA: PERÍODO E AÇÕES */}
      <div className="flex flex-wrap items-center gap-3">
        <div
          role="radiogroup"
          aria-label="Período"
          className="flex rounded-xl border border-gray-200 bg-white p-1 shadow-sm"
        >
          {PERIODS.map((days) => (
            <button
              key={days}
              type="button"
              role="radio"
              aria-checked={period === days}
              onClick={() => setPeriod(days)}
              className={`rounded-lg px-3.5 py-1.5 text-xs font-semibold transition ${
                period === days
                  ? "bg-[#EEF6FB] text-[#00205C] ring-1 ring-[#42C8E5]/50"
                  : "text-gray-600 hover:bg-gray-50"
              }`}
            >
              {days} dias
            </button>
          ))}
        </div>
        <div className="ml-auto flex items-center gap-2">
          <button
            type="button"
            onClick={() => void load()}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-[#00205C] transition hover:bg-gray-50 disabled:opacity-60"
          >
            <RefreshCw className={`size-4 ${loading ? "animate-spin" : ""}`} /> Atualizar
          </button>
          <div ref={menuRef} className="relative">
            <button
              type="button"
              aria-label="Mais opções"
              aria-expanded={menuOpen}
              onClick={() => {
                setMenuOpen((open) => !open);
                setConfirmClear(false);
              }}
              className="flex size-9 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-600 transition hover:bg-gray-50"
            >
              <MoreHorizontal className="size-4" />
            </button>
            {menuOpen && (
              <div className="absolute right-0 top-11 z-20 w-72 rounded-xl border border-gray-200 bg-white p-2 shadow-lg">
                {confirmClear ? (
                  <div className="p-2">
                    <p className="text-sm font-semibold text-[#00205C]">Apagar todo o histórico?</p>
                    <p className="mt-1 text-xs text-gray-500">
                      Os números da Jornada voltam a zero. Os leads não são apagados.
                    </p>
                    <div className="mt-3 flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => setConfirmClear(false)}
                        className="rounded-lg px-3 py-1.5 text-xs font-semibold text-gray-600 hover:bg-gray-100"
                      >
                        Cancelar
                      </button>
                      <button
                        type="button"
                        onClick={() => void clearData()}
                        disabled={clearing}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-60"
                      >
                        {clearing && <Loader2 className="size-3.5 animate-spin" />} Apagar
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setConfirmClear(true)}
                    className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-medium text-red-600 hover:bg-red-50"
                  >
                    <Trash2 className="size-4" /> Limpar dados de tracking
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
          {error}
        </div>
      )}

      {loading && events.length === 0 ? (
        <div className="flex items-center justify-center gap-2 py-24 text-sm font-semibold text-gray-500">
          <Loader2 className="size-4 animate-spin" /> Carregando a jornada dos visitantes…
        </div>
      ) : (
        <>
          {/* INDICADORES */}
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Kpi label="Visitantes" value={fmt.format(current.visitors)}>
              <Delta current={current.visitors} previous={previous.visitors} />
            </Kpi>
            <Kpi label="Abriram o chat" value={fmt.format(current.chatOpened)}>
              <Delta current={current.chatOpened} previous={previous.chatOpened} />
            </Kpi>
            <Kpi label="Leads gerados" value={fmt.format(current.leads)}>
              {onOpenLeads ? (
                <button
                  type="button"
                  onClick={onOpenLeads}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-[#0E7C97] hover:underline"
                >
                  Ver no quadro <ArrowRight className="size-3" />
                </button>
              ) : (
                <Delta current={current.leads} previous={previous.leads} />
              )}
            </Kpi>
            <Kpi
              label="Taxa de conversão"
              value={
                current.conversion === null
                  ? "—"
                  : `${current.conversion.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`
              }
            >
              {current.conversion === null ? (
                <span className="text-xs text-gray-400">sem visitas no período</span>
              ) : (
                <Delta current={current.conversion} previous={previous.conversion} kind="points" />
              )}
            </Kpi>
          </div>

          <div className="grid gap-5 lg:grid-cols-2">
            {/* FUNIL DO CHAT */}
            <Panel
              title="Chat da Hero"
              footer={
                biggestLoss ? (
                  <p className="font-medium text-amber-700">
                    Maior perda: {biggestLoss.text} ({biggestLoss.lost}{" "}
                    {biggestLoss.lost === 1 ? "pessoa" : "pessoas"})
                  </p>
                ) : current.hero.opened ? (
                  <p className="text-emerald-700">Todos que abriram o chat chegaram ao fim.</p>
                ) : (
                  <p className="text-gray-400">Ninguém abriu o chat da Hero neste período.</p>
                )
              }
            >
              <ol className="space-y-3.5">
                {heroSteps.map((step, index) => {
                  const width = pct(step.value, Math.max(1, current.hero.opened));
                  return (
                    <li key={step.label}>
                      <div className="mb-1.5 flex items-baseline justify-between text-sm">
                        <span className="text-gray-600">{step.label}</span>
                        <span className="font-semibold tabular-nums text-[#00205C]">
                          {fmt.format(step.value)}
                          {index > 0 && current.hero.opened > 0 && (
                            <span className="ml-1.5 font-normal text-gray-400">
                              {pct(step.value, current.hero.opened)}%
                            </span>
                          )}
                        </span>
                      </div>
                      <div
                        className="h-3 overflow-hidden rounded-full bg-gray-100"
                        role="img"
                        aria-label={`${step.label}: ${step.value}`}
                      >
                        <div
                          className={`h-full rounded-full transition-[width] duration-500 ${index === heroSteps.length - 1 ? "bg-[#00205C]" : "bg-[#42C8E5]"}`}
                          style={{ width: `${step.value ? Math.max(width, 2) : 0}%` }}
                        />
                      </div>
                    </li>
                  );
                })}
              </ol>
              {current.hero.abandoned > 0 && (
                <p className="mt-3 text-xs text-gray-500">
                  {current.hero.abandoned}{" "}
                  {current.hero.abandoned === 1 ? "pessoa fechou" : "pessoas fecharam"} o chat antes
                  de terminar.
                </p>
              )}
            </Panel>

            {/* CARDS DO SITE */}
            <Panel
              title="Cards do site"
              footer={
                <p className="flex items-center gap-3 text-xs text-gray-500">
                  <span className="inline-flex items-center gap-1.5">
                    <span className="h-2 w-4 rounded-full bg-gray-200" /> clicaram
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <span className="flex h-2 w-6 overflow-hidden rounded-full">
                      <span className="flex-1 bg-[#42C8E5]" />
                      <span className="flex-1 bg-[#ff8515]" />
                      <span className="flex-1 bg-[#00205C]" />
                    </span>{" "}
                    chegaram ao fim
                  </span>
                </p>
              }
            >
              <ul className="space-y-4">
                {current.cards.map((card) => (
                  <li key={card.key}>
                    <div className="mb-1.5 flex items-baseline justify-between gap-3 text-sm">
                      <span className="flex items-center gap-2 text-gray-700">
                        <span className={`size-2.5 rounded-sm ${card.color}`} /> {card.label}
                      </span>
                      <span className="tabular-nums text-gray-500">
                        <span className="font-semibold text-[#00205C]">{card.finished}</span> de{" "}
                        {card.clicked}
                        {card.clicked > 0 && (
                          <span className="ml-1.5 text-gray-400">
                            {pct(card.finished, card.clicked)}%
                          </span>
                        )}
                      </span>
                    </div>
                    <div
                      className="relative h-3 overflow-hidden rounded-full bg-gray-100"
                      role="img"
                      aria-label={`${card.label}: ${card.clicked} clicaram, ${card.finished} ${card.finishLabel}`}
                    >
                      <div
                        className="absolute inset-y-0 left-0 rounded-full bg-gray-200"
                        style={{ width: `${pct(card.clicked, maxCard)}%` }}
                      />
                      <div
                        className={`absolute inset-y-0 left-0 rounded-full ${card.color}`}
                        style={{ width: `${pct(card.finished, maxCard)}%` }}
                      />
                    </div>
                  </li>
                ))}
              </ul>
            </Panel>
          </div>

          {/* DESTINOS DOS CLIENTES */}
          <Panel
            title="Para onde os clientes foram"
            footer={
              hiddenSoon > 0 ? (
                <p className="text-xs text-gray-400">
                  {hiddenSoon} opções “em breve” sem cliques estão ocultas.
                </p>
              ) : undefined
            }
          >
            {activeDestinations.every((item) => item.people === 0) ? (
              <p className="text-sm text-gray-400">
                Nenhum cliente escolheu uma opção no menu neste período.
              </p>
            ) : (
              <ul className="space-y-3">
                {activeDestinations.map((item) => (
                  <li
                    key={item.key}
                    className="grid grid-cols-[minmax(0,180px)_1fr_40px] items-center gap-3 text-sm"
                  >
                    <span className="truncate text-gray-700">
                      {item.label}
                      {!item.active && (
                        <span className="ml-1.5 text-xs text-gray-400">em breve</span>
                      )}
                    </span>
                    <div
                      className="h-2.5 overflow-hidden rounded-full bg-gray-100"
                      role="img"
                      aria-label={`${item.label}: ${item.people}`}
                    >
                      <div
                        className="h-full rounded-full bg-[#00205C]"
                        style={{
                          width: `${item.people ? Math.max(pct(item.people, maxDestination), 2) : 0}%`,
                        }}
                      />
                    </div>
                    <span className="text-right font-semibold tabular-nums text-[#00205C]">
                      {item.people}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </>
      )}
    </section>
  );
}
