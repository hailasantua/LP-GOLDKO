import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

/**
 * Dados do site do Clube da Nutri (clubedonutri.online).
 * Ficam em outro projeto Supabase, então usam credenciais próprias:
 * CLUBE_SUPABASE_URL e CLUBE_SUPABASE_SECRET_KEY (variáveis de ambiente na Vercel).
 */

export type ClubeStoreId = "flamboyant" | "buriti";
export type ClubeEventRow = {
  store: ClubeStoreId;
  visitor_id: string;
  event_type: "page_view" | "cta_click";
  button_id: string;
  occurred_on: string;
};

export const getClubeNutriEvents = createServerFn({ method: "POST" })
  .validator((data) =>
    z.object({ accessToken: z.string().min(20), days: z.number().int().min(1).max(365).default(30) }).parse(data),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: authData, error: authError } = await supabaseAdmin.auth.getUser(data.accessToken);
    const user = authData.user;
    if (authError || !user || (user.app_metadata?.["role"] !== "admin" && user.email !== "goldkorv@gmail.com")) {
      throw new Error("Acesso não autorizado.");
    }

    const url = process.env["CLUBE_SUPABASE_URL"]?.trim().replace(/\/+$/, "");
    const key = process.env["CLUBE_SUPABASE_SECRET_KEY"]?.trim();
    if (!url || !key) return { configured: false as const, events: [] as ClubeEventRow[] };

    const { createClient } = await import("@supabase/supabase-js");
    // Chaves novas (sb_secret_) não são JWT: vão só no header apikey, sem "Bearer".
    const opaqueKey = key.startsWith("sb_secret_") || key.startsWith("sb_publishable_");
    const clubeFetch: typeof fetch = (input, init) => {
      const headers = new Headers(init?.headers);
      if (opaqueKey && headers.get("Authorization") === `Bearer ${key}`) headers.delete("Authorization");
      headers.set("apikey", key);
      return fetch(input, { ...init, headers });
    };
    const clube = createClient(url, key, {
      global: { fetch: clubeFetch },
      auth: { persistSession: false, autoRefreshToken: false },
    });

    // Período escolhido + o anterior, para a comparação.
    const sinceDate = new Date(Date.now() - (2 * data.days - 1) * 24 * 60 * 60 * 1000);
    const since = sinceDate.toISOString().slice(0, 10);

    const pageSize = 1000;
    const events: ClubeEventRow[] = [];
    for (let from = 0; from < 100000; from += pageSize) {
      const { data: page, error } = await clube
        .from("analytics_events")
        .select("store,visitor_id,event_type,button_id,occurred_on")
        .gte("occurred_on", since)
        .order("occurred_on", { ascending: false })
        .range(from, from + pageSize - 1);
      if (error) {
        console.error("Falha ao buscar eventos do Clube da Nutri:", error);
        // Diagnóstico sem expor a chave: tipo da chave e projeto do Supabase.
        let keyKind = key.startsWith("sb_secret_") ? "sb_secret" : key.startsWith("sb_publishable_") ? "sb_publishable (pública)" : "desconhecida";
        if (key.split(".").length === 3) {
          try {
            const payload = JSON.parse(Buffer.from(key.split(".")[1]!, "base64url").toString("utf8")) as { role?: string; ref?: string };
            keyKind = `JWT role=${payload.role ?? "?"} projeto=${payload.ref ?? "?"}`;
          } catch { keyKind = "JWT ilegível"; }
        }
        const project = url.replace(/^https?:\/\//, "").split(".")[0];
        throw new Error(
          `Não foi possível ler os dados do Clube da Nutri: ${error.message || error.code || "erro desconhecido"} · URL do projeto: ${project} · chave: ${keyKind}`,
        );
      }
      events.push(...((page || []) as ClubeEventRow[]));
      if (!page || page.length < pageSize) break;
    }
    return { configured: true as const, events };
  });
