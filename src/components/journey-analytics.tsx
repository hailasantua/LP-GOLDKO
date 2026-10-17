import { useEffect, useMemo, useState } from "react";
import { clearAnalyticsEvents, getAnalyticsEvents, type AnalyticsEventRow } from "@/lib/analytics.functions";
import { supabase } from "@/integrations/supabase/client";

const unique = (events: AnalyticsEventRow[], key: "visitor_id" | "session_id") => new Set(events.map((event) => event[key])).size;
const uniqueVisitors = (events: AnalyticsEventRow[]) => unique(events, "visitor_id");

type MobileMetric = {
  label: string;
  value: number | string;
  tone?: "default" | "warning" | "success";
};

const mobileMetricTone = {
  default: "text-[#00205C]",
  warning: "text-amber-600",
  success: "text-emerald-700",
} satisfies Record<NonNullable<MobileMetric["tone"]>, string>;

function MobileMetrics({ metrics, rateLabel, rate }: { metrics: MobileMetric[]; rateLabel: string; rate: number }) {
  const safeRate = Math.min(100, Math.max(0, rate));
  return (
    <div className="p-4 md:hidden">
      <div className="grid grid-cols-2 gap-2.5">
        {metrics.map((metric) => (
          <article key={metric.label} className="min-h-24 rounded-2xl bg-[#F4F7FB] p-3.5">
            <p className="min-h-8 text-[11px] font-bold uppercase leading-tight text-gray-500">{metric.label}</p>
            <p className={`mt-2 text-2xl font-bold ${mobileMetricTone[metric.tone ?? "default"]}`}>{metric.value}</p>
          </article>
        ))}
      </div>
      <div className="mt-3 rounded-2xl bg-[#42C8E5]/10 p-3.5">
        <div className="flex items-center justify-between gap-3 text-xs font-bold text-[#00205C]">
          <span>{rateLabel}</span>
          <span>{rate}%</span>
        </div>
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[#00205C]/10">
          <div className="h-full rounded-full bg-[#42C8E5] transition-[width]" style={{ width: `${safeRate}%` }} />
        </div>
      </div>
    </div>
  );
}

export function JourneyAnalytics() {
  const [events, setEvents] = useState<AnalyticsEventRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [clearing, setClearing] = useState(false);
  const [error, setError] = useState("");

  async function load() {
    setLoading(true); setError("");
    try {
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      if (!token) throw new Error("Sessão expirada.");
      const result = await getAnalyticsEvents({ data: { accessToken: token } });
      setEvents(result.events);
    } catch (err) { setError(err instanceof Error ? err.message : "Não foi possível carregar o tracking."); }
    finally { setLoading(false); }
  }
  useEffect(() => { void load(); }, []);

  async function clearData() {
    if (!window.confirm("Tem certeza que deseja apagar todos os dados de tracking? Esta ação não pode ser desfeita.")) return;
    setClearing(true); setError("");
    try {
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      if (!token) throw new Error("Sessão expirada.");
      await clearAnalyticsEvents({ data: { accessToken: token } });
      setEvents([]);
    } catch (err) { setError(err instanceof Error ? err.message : "Não foi possível limpar os dados."); }
    finally { setClearing(false); }
  }

  const stats = useMemo(() => {
    const named = (name: string) => events.filter((event) => event.event_name === name);
    const heroClicks = named("hero_cta_click").length;
    const heroCompleted = named("funnel_completed").filter((e) => e.source === "hero").length;
    const heroAbandoned = named("chat_abandoned").filter((e) => e.source === "hero").length;
    return { heroClicks, heroCompleted, heroAbandoned };
  }, [events]);

  const customerJourney = useMemo(() => {
    const cardEvents = events.filter((event) => event.source === "help_card" && event.segment === "cliente");
    const opens = cardEvents.filter((event) => event.event_name === "help_card_click");
    const optionClicks = cardEvents.filter((event) => event.event_name === "customer_option_click");
    const completed = cardEvents.filter((event) => event.event_name === "funnel_completed");
    const abandoned = cardEvents.filter((event) => event.event_name === "customer_menu_abandoned");
    const options = [
      ["store", "Falar com a loja", "WhatsApp aberto"],
      ["delivery", "Pedidos e entregas", "WhatsApp aberto"],
      ["fidelity", "Cartão Fidelidade", "Cartão acessado"],
      ["menu", "Nosso cardápio", "Em breve"],
      ["products", "Nossos produtos", "Em breve"],
      ["faq", "Dúvidas frequentes", "Em breve"],
      ["personalOrders", "Pedidos para você", "Em breve"],
      ["giftOrders", "Pedidos para presentear", "Em breve"],
      ["feedback", "Sugestões ou reclamações", "Formulário enviado"],
    ] as const;
    return {
      opens: uniqueVisitors(opens),
      abandoned: uniqueVisitors(abandoned),
      selected: uniqueVisitors(optionClicks),
      completed: uniqueVisitors(completed),
      options: options.map(([key, label, status]) => {
        const clicks = optionClicks.filter((event) => event.metadata?.option === key);
        const finishes = completed.filter((event) => event.metadata?.option === key);
        return { key, label, status, visitors: uniqueVisitors(clicks), completed: uniqueVisitors(finishes) };
      }),
    };
  }, [events]);

  const programJourneys = useMemo(() => {
    const build = (segment: "clube_nutri" | "empresa") => {
      const scoped = events.filter((event) => event.source === "help_card" && event.segment === segment);
      const clicked = uniqueVisitors(scoped.filter((event) => event.event_name === "help_card_click"));
      const abandoned = uniqueVisitors(scoped.filter((event) => event.event_name === "program_abandoned"));
      const whatsapp = uniqueVisitors(scoped.filter((event) => event.event_name === "program_cta_click"));
      return { clicked, abandoned, whatsapp };
    };
    return { nutri: build("clube_nutri"), empresa: build("empresa") };
  }, [events]);

  const eventJourney = useMemo(() => {
    const scoped = events.filter((event) => event.source === "help_card" && event.segment === "eventos");
    return {
      clicked: uniqueVisitors(scoped.filter((event) => event.event_name === "help_card_click")),
      started: uniqueVisitors(scoped.filter((event) => event.event_name === "event_form_started")),
      abandoned: uniqueVisitors(scoped.filter((event) => event.event_name === "event_form_abandoned")),
      submitted: uniqueVisitors(scoped.filter((event) => event.event_name === "lead_submit")),
    };
  }, [events]);

  if (loading) return <div className="py-24 text-center text-sm font-semibold text-gray-500">Carregando jornada dos visitantes…</div>;
  if (error) return <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-red-700">{error}</div>;

  const heroRate = stats.heroClicks ? Math.round(stats.heroCompleted / stats.heroClicks * 100) : 0;
  const customerRate = customerJourney.opens ? Math.round(customerJourney.completed / customerJourney.opens * 100) : 0;
  const nutriRate = programJourneys.nutri.clicked ? Math.round(programJourneys.nutri.whatsapp / programJourneys.nutri.clicked * 100) : 0;
  const companyRate = programJourneys.empresa.clicked ? Math.round(programJourneys.empresa.whatsapp / programJourneys.empresa.clicked * 100) : 0;
  const eventRate = eventJourney.clicked ? Math.round(eventJourney.submitted / eventJourney.clicked * 100) : 0;

  return (
    <section className="flex flex-col">
      <div className="order-0 flex justify-end">
        <div className="grid grid-cols-2 gap-2 sm:flex sm:items-center">
          <button onClick={() => void load()} disabled={clearing} className="min-h-11 rounded-full border border-gray-200 bg-white px-4 py-2 text-xs font-bold text-[#00205C] disabled:cursor-not-allowed disabled:opacity-50">Atualizar</button>
          <button onClick={() => void clearData()} disabled={clearing} className="min-h-11 rounded-full border border-red-200 bg-red-50 px-4 py-2 text-xs font-bold text-red-600 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50">{clearing ? "Limpando…" : "Limpar dados"}</button>
        </div>
      </div>

      <div className="order-1 mt-5 overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-sm sm:mt-7">
        <div className="border-b border-gray-100 p-5">
          <h2 className="font-display text-xl font-bold uppercase text-[#00205C]">Funil do chat da Hero</h2>
        </div>
        <MobileMetrics
          metrics={[
            { label: "Clicaram", value: stats.heroClicks },
            { label: "Abandonaram", value: stats.heroAbandoned, tone: "warning" },
            { label: "Finalizaram", value: stats.heroCompleted, tone: "success" },
          ]}
          rateLabel="Taxa de conclusão"
          rate={heroRate}
        />
        <div className="hidden overflow-x-auto md:block">
          <table className="w-full text-left text-sm"><thead className="bg-gray-50 text-xs uppercase text-gray-400"><tr><th className="px-5 py-3">Clicaram</th><th className="px-5 py-3">Abandonaram</th><th className="px-5 py-3">Finalizaram</th><th className="px-5 py-3">Taxa de conclusão</th></tr></thead><tbody><tr className="border-t border-gray-100"><td className="px-5 py-4 text-lg font-bold text-[#00205C]">{stats.heroClicks}</td><td className="px-5 py-4 text-lg font-bold text-amber-600">{stats.heroAbandoned}</td><td className="px-5 py-4 text-lg font-bold text-emerald-700">{stats.heroCompleted}</td><td className="px-5 py-4 font-bold">{heroRate}%</td></tr></tbody></table>
        </div>
      </div>

      <div className="order-2 mt-5 overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-sm sm:mt-7">
        <div className="border-b border-gray-100 p-5">
          <h2 className="font-display text-xl font-bold uppercase text-[#00205C]">Jornada dos clientes</h2>
        </div>
        <MobileMetrics
          metrics={[
            { label: "Abriram o menu", value: customerJourney.opens },
            { label: "Abandonaram sem escolher", value: customerJourney.abandoned, tone: "warning" },
            { label: "Escolheram uma opção", value: customerJourney.selected },
            { label: "Finalizaram", value: customerJourney.completed, tone: "success" },
          ]}
          rateLabel="Taxa de conclusão"
          rate={customerRate}
        />
        <div className="hidden overflow-x-auto md:block">
          <table className="w-full text-left text-sm"><thead className="bg-gray-50 text-xs uppercase text-gray-400"><tr><th className="px-5 py-3">Abriram o menu</th><th className="px-5 py-3">Abandonaram sem escolher</th><th className="px-5 py-3">Escolheram uma opção</th><th className="px-5 py-3">Finalizaram</th><th className="px-5 py-3">Taxa de conclusão</th></tr></thead><tbody><tr className="border-t border-gray-100"><td className="px-5 py-4 text-lg font-bold text-[#00205C]">{customerJourney.opens}</td><td className="px-5 py-4 text-lg font-bold text-amber-600">{customerJourney.abandoned}</td><td className="px-5 py-4 text-lg font-bold text-[#00205C]">{customerJourney.selected}</td><td className="px-5 py-4 text-lg font-bold text-emerald-700">{customerJourney.completed}</td><td className="px-5 py-4 font-bold">{customerRate}%</td></tr></tbody></table>
        </div>

        <div className="border-y border-gray-100 p-5"><h3 className="font-display text-lg font-bold uppercase text-[#00205C]">Para onde os clientes foram</h3></div>
        <div className="grid gap-3 p-4 md:hidden">
          {customerJourney.options.map((option) => {
            const optionRate = customerJourney.opens ? Math.round(option.visitors / customerJourney.opens * 100) : 0;
            return (
              <article key={option.key} className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <h4 className="font-bold leading-tight text-[#00205C]">{option.label}</h4>
                  <span className="shrink-0 rounded-full bg-[#42C8E5]/10 px-2.5 py-1 text-[10px] font-bold uppercase text-[#00205C]">{option.status}</span>
                </div>
                <div className="mt-4 grid grid-cols-3 gap-2 border-t border-gray-100 pt-3">
                  <div><p className="text-[10px] font-bold uppercase text-gray-400">Pessoas</p><p className="mt-1 text-lg font-bold text-[#00205C]">{option.visitors}</p></div>
                  <div><p className="text-[10px] font-bold uppercase text-gray-400">Concluíram</p><p className="mt-1 text-lg font-bold text-emerald-700">{option.completed}</p></div>
                  <div><p className="text-[10px] font-bold uppercase text-gray-400">Participação</p><p className="mt-1 text-lg font-bold text-[#00205C]">{optionRate}%</p></div>
                </div>
              </article>
            );
          })}
        </div>
        <div className="hidden overflow-x-auto md:block">
          <table className="w-full text-left text-sm"><thead className="bg-gray-50 text-xs uppercase text-gray-400"><tr><th className="px-5 py-3">Destino escolhido</th><th className="px-5 py-3">Pessoas</th><th className="px-5 py-3">Concluíram a ação</th><th className="px-5 py-3">Situação</th><th className="px-5 py-3">% das pessoas</th></tr></thead><tbody>{customerJourney.options.map((option) => <tr key={option.key} className="border-t border-gray-100"><td className="px-5 py-4 font-bold text-[#00205C]">{option.label}</td><td className="px-5 py-4">{option.visitors}</td><td className="px-5 py-4 font-bold text-emerald-700">{option.completed}</td><td className="px-5 py-4 text-gray-500">{option.status}</td><td className="px-5 py-4 font-bold">{customerJourney.opens ? Math.round(option.visitors / customerJourney.opens * 100) : 0}%</td></tr>)}</tbody></table>
        </div>
      </div>

      <div className="order-3 mt-5 overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-sm sm:mt-7">
        <div className="border-b border-gray-100 p-5"><h2 className="font-display text-xl font-bold uppercase text-[#00205C]">Funil do Clube do Nutri</h2></div>
        <MobileMetrics metrics={[{ label: "Clicaram no card", value: programJourneys.nutri.clicked }, { label: "Abandonaram", value: programJourneys.nutri.abandoned, tone: "warning" }, { label: "Foram ao WhatsApp", value: programJourneys.nutri.whatsapp, tone: "success" }]} rateLabel="Taxa de encaminhamento" rate={nutriRate} />
        <div className="hidden overflow-x-auto md:block"><table className="w-full text-left text-sm"><thead className="bg-gray-50 text-xs uppercase text-gray-400"><tr><th className="px-5 py-3">Clicaram no card</th><th className="px-5 py-3">Abandonaram</th><th className="px-5 py-3">Foram direcionados ao WhatsApp</th><th className="px-5 py-3">Taxa de encaminhamento</th></tr></thead><tbody><tr className="border-t border-gray-100"><td className="px-5 py-4 text-lg font-bold text-[#00205C]">{programJourneys.nutri.clicked}</td><td className="px-5 py-4 text-lg font-bold text-amber-600">{programJourneys.nutri.abandoned}</td><td className="px-5 py-4 text-lg font-bold text-emerald-700">{programJourneys.nutri.whatsapp}</td><td className="px-5 py-4 font-bold">{nutriRate}%</td></tr></tbody></table></div>
      </div>

      <div className="order-4 mt-5 overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-sm sm:mt-7">
        <div className="border-b border-gray-100 p-5"><h2 className="font-display text-xl font-bold uppercase text-[#00205C]">Funil GoldKo para Empresas</h2></div>
        <MobileMetrics metrics={[{ label: "Clicaram no card", value: programJourneys.empresa.clicked }, { label: "Abandonaram", value: programJourneys.empresa.abandoned, tone: "warning" }, { label: "Foram ao WhatsApp", value: programJourneys.empresa.whatsapp, tone: "success" }]} rateLabel="Taxa de encaminhamento" rate={companyRate} />
        <div className="hidden overflow-x-auto md:block"><table className="w-full text-left text-sm"><thead className="bg-gray-50 text-xs uppercase text-gray-400"><tr><th className="px-5 py-3">Clicaram no card</th><th className="px-5 py-3">Abandonaram</th><th className="px-5 py-3">Foram direcionados ao WhatsApp</th><th className="px-5 py-3">Taxa de encaminhamento</th></tr></thead><tbody><tr className="border-t border-gray-100"><td className="px-5 py-4 text-lg font-bold text-[#00205C]">{programJourneys.empresa.clicked}</td><td className="px-5 py-4 text-lg font-bold text-amber-600">{programJourneys.empresa.abandoned}</td><td className="px-5 py-4 text-lg font-bold text-emerald-700">{programJourneys.empresa.whatsapp}</td><td className="px-5 py-4 font-bold">{companyRate}%</td></tr></tbody></table></div>
      </div>

      <div className="order-5 mt-5 overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-sm sm:mt-7">
        <div className="border-b border-gray-100 p-5"><h2 className="font-display text-xl font-bold uppercase text-[#00205C]">Funil Eventos e Parcerias</h2></div>
        <MobileMetrics metrics={[{ label: "Clicaram no card", value: eventJourney.clicked }, { label: "Iniciaram o formulário", value: eventJourney.started }, { label: "Abandonaram", value: eventJourney.abandoned, tone: "warning" }, { label: "Enviaram o cadastro", value: eventJourney.submitted, tone: "success" }]} rateLabel="Taxa de envio" rate={eventRate} />
        <div className="hidden overflow-x-auto md:block"><table className="w-full text-left text-sm"><thead className="bg-gray-50 text-xs uppercase text-gray-400"><tr><th className="px-5 py-3">Clicaram no card</th><th className="px-5 py-3">Iniciaram o formulário</th><th className="px-5 py-3">Abandonaram</th><th className="px-5 py-3">Enviaram o cadastro</th><th className="px-5 py-3">Taxa de envio</th></tr></thead><tbody><tr className="border-t border-gray-100"><td className="px-5 py-4 text-lg font-bold text-[#00205C]">{eventJourney.clicked}</td><td className="px-5 py-4 text-lg font-bold text-[#00205C]">{eventJourney.started}</td><td className="px-5 py-4 text-lg font-bold text-amber-600">{eventJourney.abandoned}</td><td className="px-5 py-4 text-lg font-bold text-emerald-700">{eventJourney.submitted}</td><td className="px-5 py-4 font-bold">{eventRate}%</td></tr></tbody></table></div>
      </div>
    </section>
  );
}
