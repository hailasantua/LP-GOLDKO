import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const eventSchema = z.object({
  event_name: z.string().min(1).max(80), visitor_id: z.string().min(1).max(100), session_id: z.string().min(1).max(100),
  page_path: z.string().max(500).default("/"), section: z.string().max(80).nullable().optional(), source: z.string().max(120).nullable().optional(),
  segment: z.string().max(80).nullable().optional(), label: z.string().max(200).nullable().optional(), destination: z.string().max(1000).nullable().optional(),
  device: z.string().max(30).nullable().optional(), utm_source: z.string().max(200).nullable().optional(), utm_medium: z.string().max(200).nullable().optional(),
  utm_campaign: z.string().max(200).nullable().optional(), metadata: z.record(z.union([z.string(), z.number(), z.boolean(), z.null()])).default({}),
});
export type AnalyticsEventRow = z.infer<typeof eventSchema> & { id: string; created_at: string };
export type JourneyLeadRow = { created_at: string; segment: "cliente" | "clube_nutri" | "empresa" | "eventos" };

export const recordAnalyticsEvent = createServerFn({ method: "POST" })
  .validator((data) => eventSchema.parse(data))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("analytics_events").insert(data);
    if (error) { console.error("Falha ao registrar evento analítico:", error); return { success: false }; }
    return { success: true };
  });

export const getAnalyticsEvents = createServerFn({ method: "POST" })
  .validator((data) => z.object({ accessToken: z.string().min(20) }).parse(data))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: authData, error: authError } = await supabaseAdmin.auth.getUser(data.accessToken);
    const user = authData.user;
    if (authError || !user || (user.app_metadata?.role !== "admin" && user.email !== "goldkorv@gmail.com")) throw new Error("Acesso não autorizado.");
    const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const [eventsResult, onboardingResult, contactResult] = await Promise.all([
      supabaseAdmin.from("analytics_events").select("*").gte("created_at", since).order("created_at", { ascending: false }).limit(20000),
      supabaseAdmin.from("leads_onboarding").select("created_at,tipo").gte("created_at", since),
      supabaseAdmin.from("leads").select("created_at,interest,message").gte("created_at", since),
    ]);
    if (eventsResult.error) console.error("Falha ao buscar eventos analíticos:", eventsResult.error);
    if (onboardingResult.error) console.error("Falha ao buscar cadastros do chat:", onboardingResult.error);
    if (contactResult.error) console.error("Falha ao buscar contatos:", contactResult.error);
    const onboardingLeads: JourneyLeadRow[] = (onboardingResult.data || []).map((lead) => ({
      created_at: lead.created_at,
      segment: lead.tipo === "nutricionista" ? "clube_nutri" : lead.tipo as JourneyLeadRow["segment"],
    }));
    const contactLeads: JourneyLeadRow[] = (contactResult.data || []).map((lead) => ({
      created_at: lead.created_at,
      segment: lead.message?.startsWith("Solicitação de evento") ? "eventos" : lead.interest === "nutricionista" ? "clube_nutri" : lead.interest === "cliente" ? "cliente" : "empresa",
    }));
    return { events: (eventsResult.data || []) as AnalyticsEventRow[], leads: [...onboardingLeads, ...contactLeads] };
  });

export const clearAnalyticsEvents = createServerFn({ method: "POST" })
  .validator((data) => z.object({ accessToken: z.string().min(20) }).parse(data))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: authData, error: authError } = await supabaseAdmin.auth.getUser(data.accessToken);
    const user = authData.user;
    if (authError || !user || (user.app_metadata?.role !== "admin" && user.email !== "goldkorv@gmail.com")) {
      throw new Error("Acesso não autorizado.");
    }

    const { data: deleted, error } = await supabaseAdmin
      .from("analytics_events")
      .delete()
      .gte("created_at", "1970-01-01T00:00:00.000Z")
      .select("id");

    if (error) throw new Error(`Não foi possível limpar os dados: ${error.message}`);
    return { success: true, deleted: deleted?.length ?? 0 };
  });
