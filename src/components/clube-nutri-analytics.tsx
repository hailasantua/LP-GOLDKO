import { useEffect, useMemo, useState } from "react";
import { ExternalLink, Loader2, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  getClubeNutriEvents,
  type ClubeEventRow,
  type ClubeStoreId,
} from "@/lib/clube-nutri.functions";

type Period = 7 | 30 | 90;
const PERIODS: Period[] = [7, 30, 90];
const DAY = 24 * 60 * 60 * 1000;
const fmt = new Intl.NumberFormat("pt-BR");
const pct = (part: number, total: number) => (total ? Math.round((part / total) * 100) : 0);

const STORES: Array<{ id: ClubeStoreId; label: string }> = [
  { id: "flamboyant", label: "Flamboyant" },
  { id: "buriti", label: "Buriti" },
];

type Kind = "whatsapp" | "pdf" | "old";
/** Botões da página do Clube (mesmos ids do repositório clube-da-nutri-goldko). */
const BUTTONS: Array<{ id: string; section: string; label: string; kind: Kind }> = [
  { id: "nav_join", section: "Topo", label: "Quero entrar no clube", kind: "whatsapp" },
  { id: "hero_join", section: "Hero", label: "Fale agora com uma atendente", kind: "whatsapp" },
  { id: "experience_kits", section: "Um produto, duas experiências", label: "Conhecer os kits (PDF)", kind: "pdf" },
  { id: "kit_30", section: "Kits", label: "Reservar kit 30", kind: "whatsapp" },
  { id: "kit_60", section: "Kits", label: "Reservar kit 60", kind: "whatsapp" },
  { id: "kit_100", section: "Kits", label: "Reservar kit 100", kind: "whatsapp" },
  { id: "community_join", section: "Mais proximidade", label: "Quero entrar no clube", kind: "whatsapp" },
  { id: "event_reserve", section: "Encontro", label: "Consultar e reservar meu kit", kind: "whatsapp" },
  { id: "participate_join", section: "Como participar", label: "Clique aqui e fale com a equipe", kind: "whatsapp" },
  { id: "footer_join", section: "Final", label: "Falar com relacionamento", kind: "whatsapp" },
  { id: "hero_kits", section: "Hero", label: "Conhecer os kits", kind: "old" },
];
const KIND_OF = new Map(BUTTONS.map((button) => [button.id, button.kind]));

function summarize(events: ClubeEventRow[]) {
  const visitors = new Set(events.filter((e) => e.event_type === "page_view").map((e) => e.visitor_id)).size;
  const clicks = events.filter((e) => e.event_type === "cta_click");
  const people = (filter: (e: ClubeEventRow) => boolean) => new Set(clicks.filter(filter).map((e) => e.visitor_id)).size;
  return {
    visitors,
    clicked: people(() => true),
    whatsapp: people((e) => KIND_OF.get(e.button_id) === "whatsapp"),
    pdf: people((e) => KIND_OF.get(e.button_id) === "pdf"),
    byButton: new Map(BUTTONS.map((b) => [b.id, people((e) => e.button_id === b.id)])),
  };
}

function Delta({ current, previous }: { current: number; previous: number }) {
  if (previous === 0)
    return current > 0 ? (
      <span className="text-xs font-semibold text-emerald-700">novo no período</span>
    ) : (
      <span className="text-xs text-gray-400">sem dados anteriores</span>
    );
  const change = Math.round(((current - previous) / previous) * 100);
  if (change === 0) return <span className="text-xs text-gray-400">igual ao período anterior</span>;
  return (
    <span className={`text-xs font-semibold ${change > 0 ? "text-emerald-700" : "text-red-600"}`}>
      {change > 0 ? "+" : "−"}
      {Math.abs(change)}% vs. anterior
    </span>
  );
}

function Kpi({ label, value, children }: { label: string; value: string; children?: React.ReactNode }) {
  return (
    <article className="min-w-0 rounded-2xl border border-gray-200 bg-white p-4 sm:p-5">
      <p className="text-sm leading-snug text-gray-500">{label}</p>
      <p className="mt-1 text-2xl font-bold tabular-nums text-[#00205C] sm:text-3xl">{value}</p>
      <div className="mt-1 min-h-4">{children}</div>
    </article>
  );
}

function Panel({ title, children, footer }: { title: string; children: React.ReactNode; footer?: React.ReactNode }) {
  return (
    <section className="min-w-0 rounded-2xl border border-gray-200 bg-white p-4 sm:p-5">
      <h2 className="text-base font-semibold text-[#00205C]">{title}</h2>
      <div className="mt-4">{children}</div>
      {footer && <div className="mt-4 text-sm">{footer}</div>}
    </section>
  );
}

export function ClubeNutriAnalytics() {
  const [period, setPeriod] = useState<Period>(30);
  const [store, setStore] = useState<ClubeStoreId | "todas">("todas");
  const [events, setEvents] = useState<ClubeEventRow[]>([]);
  const [configured, setConfigured] = useState(true);
  const [loaded, setLoaded] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function load(days: Period = period) {
    setLoading(true);
    setError("");
    try {
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      if (!token) throw new Error("Sessão expirada.");
      const result = await getClubeNutriEvents({ data: { accessToken: token, days } });
      setConfigured(result.configured);
      setEvents(result.events);
      setLoaded(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível carregar o Clube da Nutri.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load(period);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [period]);

  const { current, previous, perStore } = useMemo(() => {
    const split = new Date(Date.now() - (period - 1) * DAY).toISOString().slice(0, 10);
    const scoped = store === "todas" ? events : events.filter((e) => e.store === store);
    const inCurrent = (e: ClubeEventRow) => e.occurred_on >= split;
    return {
      current: summarize(scoped.filter(inCurrent)),
      previous: summarize(scoped.filter((e) => !inCurrent(e))),
      perStore: STORES.map((s) => ({
        ...s,
        ...summarize(events.filter((e) => e.store === s.id && inCurrent(e))),
      })),
    };
  }, [events, period, store]);

  const buttons = BUTTONS.filter((b) => b.kind !== "old" || (current.byButton.get(b.id) ?? 0) > 0)
    .map((b) => ({ ...b, people: current.byButton.get(b.id) ?? 0 }))
    .sort((a, b) => b.people - a.people);
  const maxButton = Math.max(1, ...buttons.map((b) => b.people));
  const maxVisitors = Math.max(1, ...perStore.map((s) => s.visitors));
  const conversion = current.visitors ? (current.whatsapp / current.visitors) * 100 : 0;

  return (
    <section className="space-y-5">
      {/* CABEÇALHO E FILTROS */}
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 sm:flex sm:flex-wrap">
        <div role="radiogroup" aria-label="Período" className="col-span-2 grid grid-cols-3 rounded-xl border border-gray-200 bg-white p-1 shadow-sm sm:col-span-1 sm:flex">
          {PERIODS.map((days) => (
            <button
              key={days}
              type="button"
              role="radio"
              aria-checked={period === days}
              onClick={() => setPeriod(days)}
              className={`rounded-lg px-2 py-2 text-xs font-semibold transition sm:px-3.5 sm:py-1.5 ${
                period === days ? "bg-[#EEF6FB] text-[#00205C] ring-1 ring-[#42C8E5]/50" : "text-gray-600 hover:bg-gray-50"
              }`}
            >
              {days} dias
            </button>
          ))}
        </div>
        <select
          value={store}
          onChange={(event) => setStore(event.target.value as ClubeStoreId | "todas")}
          aria-label="Filtrar por loja"
          className={`min-w-0 w-full rounded-xl border bg-white px-3 py-2 text-xs font-semibold shadow-sm outline-none focus:border-[#42C8E5] sm:w-auto ${
            store === "todas" ? "border-gray-200 text-gray-600" : "border-[#42C8E5]/60 bg-[#EEF6FB] text-[#00205C]"
          }`}
        >
          <option value="todas">Todas as lojas</option>
          {STORES.map((item) => (
            <option key={item.id} value={item.id}>
              {item.label}
            </option>
          ))}
        </select>
        <div className="flex shrink-0 items-center justify-end gap-2 sm:ml-auto">
          <a
            href={`https://clubedonutri.online/${store === "todas" ? "flamboyant" : store}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-600 transition hover:bg-gray-50 sm:px-4"
          >
            Ver site <ExternalLink className="size-3.5" />
          </a>
          <button
            type="button"
            onClick={() => void load()}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-[#00205C] transition hover:bg-gray-50 disabled:opacity-60 sm:px-4"
          >
            <RefreshCw className={`size-4 ${loading ? "animate-spin" : ""}`} /> Atualizar
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{error}</div>
      )}

      {loading && !loaded ? (
        <div className="flex items-center justify-center gap-2 py-24 text-sm font-semibold text-gray-500">
          <Loader2 className="size-4 animate-spin" /> Carregando o Clube da Nutri…
        </div>
      ) : !configured ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900">
          <p className="font-semibold">Falta conectar o banco do Clube da Nutri.</p>
          <p className="mt-1">
            Adicione na Vercel as variáveis <code className="font-mono">CLUBE_SUPABASE_URL</code> e{" "}
            <code className="font-mono">CLUBE_SUPABASE_SECRET_KEY</code> (as mesmas do projeto clube-da-nutri-goldko) e
            publique de novo.
          </p>
        </div>
      ) : (
        <>
          {/* INDICADORES */}
          <div className="grid grid-cols-2 gap-2.5 sm:gap-3 lg:grid-cols-4">
            <Kpi label="Visitantes" value={fmt.format(current.visitors)}>
              <Delta current={current.visitors} previous={previous.visitors} />
            </Kpi>
            <Kpi label="Chamaram no WhatsApp" value={fmt.format(current.whatsapp)}>
              <Delta current={current.whatsapp} previous={previous.whatsapp} />
            </Kpi>
            <Kpi label="Abriram o catálogo" value={fmt.format(current.pdf)}>
              <Delta current={current.pdf} previous={previous.pdf} />
            </Kpi>
            <Kpi label="Taxa de conversão" value={`${conversion.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`}>
              <span className="text-xs text-gray-400">visitantes que chamaram no WhatsApp</span>
            </Kpi>
          </div>

          <div className="grid gap-5 lg:grid-cols-[1.4fr_1fr]">
            {/* BOTÕES */}
            <Panel
              title="Botões mais clicados"
              footer={
                <p className="text-xs text-gray-500">
                  Pessoas diferentes que clicaram em cada botão. Laranja leva ao WhatsApp da Lara; azul abre o catálogo.
                </p>
              }
            >
              <ul className="space-y-3">
                {buttons.map((button) => (
                  <li key={button.id}>
                    <div className="flex items-baseline justify-between gap-3 text-sm">
                      <span className="text-gray-800">
                        {button.label} <span className="text-xs text-gray-400">{button.section}</span>
                        {button.kind === "old" && <span className="ml-1 text-xs text-gray-400">(removido)</span>}
                      </span>
                      <strong className="tabular-nums text-[#00205C]">{button.people}</strong>
                    </div>
                    <div className="mt-1.5 h-2.5 rounded-full bg-gray-100">
                      <div
                        className={`h-full rounded-full ${
                          button.kind === "pdf" ? "bg-[#42C8E5]" : button.kind === "old" ? "bg-gray-300" : "bg-[#ff8515]"
                        }`}
                        style={{ width: `${(button.people / maxButton) * 100}%` }}
                      />
                    </div>
                  </li>
                ))}
              </ul>
            </Panel>

            {/* POR LOJA */}
            <Panel title="Por loja">
              <ul className="space-y-5">
                {perStore.map((item) => (
                  <li key={item.id}>
                    <div className="flex items-baseline justify-between text-sm">
                      <span className="font-semibold text-gray-800">{item.label}</span>
                      <span className="text-gray-500">
                        <strong className="tabular-nums text-[#00205C]">{item.visitors}</strong> visitantes
                      </span>
                    </div>
                    <div className="mt-1.5 h-2.5 rounded-full bg-gray-100">
                      <div className="h-full rounded-full bg-[#00205C]" style={{ width: `${(item.visitors / maxVisitors) * 100}%` }} />
                    </div>
                    <p className="mt-1.5 text-xs text-gray-500">
                      {item.whatsapp} no WhatsApp ({pct(item.whatsapp, item.visitors)}%) · {item.pdf} abriram o catálogo
                    </p>
                  </li>
                ))}
              </ul>
            </Panel>
          </div>
        </>
      )}
    </section>
  );
}
