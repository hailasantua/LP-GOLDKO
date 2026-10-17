import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type { Database } from "@/integrations/supabase/types";

type LeadUpdate = Database["public"]["Tables"]["leads_onboarding"]["Update"];

export const LEAD_STATUSES = ["novo", "contatado", "qualificado", "convertido", "perdido"] as const;
export type LeadStatus = (typeof LEAD_STATUSES)[number];

export type ChatLeadRow = {
  id: string;
  created_at: string;
  tipo: string;
  nome: string;
  empresa_nome: string | null;
  whatsapp: string | null;
  email: string | null;
  qtd_pacientes: string | null;
  qtd_colaboradores: string | null;
  interesse_nutri: string[] | null;
  interesse_empresa: string[] | null;
  status: string;
  observacoes: string | null;
  utm_source: string | null;
};

const tokenSchema = z.object({ accessToken: z.string().min(20) });

async function adminClient(accessToken: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin.auth.getUser(accessToken);
  const user = data.user;
  if (
    error ||
    !user ||
    (user.app_metadata?.["role"] !== "admin" && user.email !== "goldkorv@gmail.com")
  ) {
    throw new Error("Acesso não autorizado.");
  }
  return supabaseAdmin;
}

/** Colunas que só existem depois da migração 20261016 (empresa, e-mail e observações). */
const NEW_COLUMNS = ["empresa_nome", "email", "observacoes"] as const;
const isMissingColumn = (code?: string) => code === "42703" || code === "PGRST204";

export const listChatLeads = createServerFn({ method: "POST" })
  .validator((data) => tokenSchema.parse(data))
  .handler(async ({ data }) => {
    const db = await adminClient(data.accessToken);
    const { data: rows, error } = await db
      .from("leads_onboarding")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(2000);
    if (error) throw new Error(`Não foi possível carregar os leads: ${error.message}`);

    const list = (rows || []) as Array<Record<string, unknown>>;
    const migrated = list.length === 0 || NEW_COLUMNS.every((column) => column in list[0]!);
    const leads: ChatLeadRow[] = list.map((row) => ({
      id: String(row["id"]),
      created_at: String(row["created_at"]),
      tipo: String(row["tipo"] ?? ""),
      nome: String(row["nome"] ?? ""),
      empresa_nome: (row["empresa_nome"] as string | null | undefined) ?? null,
      whatsapp: (row["whatsapp"] as string | null | undefined) ?? null,
      email: (row["email"] as string | null | undefined) ?? null,
      qtd_pacientes: (row["qtd_pacientes"] as string | null | undefined) ?? null,
      qtd_colaboradores: (row["qtd_colaboradores"] as string | null | undefined) ?? null,
      interesse_nutri: (row["interesse_nutri"] as string[] | null | undefined) ?? null,
      interesse_empresa: (row["interesse_empresa"] as string[] | null | undefined) ?? null,
      status: String(row["status"] ?? "novo"),
      observacoes: (row["observacoes"] as string | null | undefined) ?? null,
      utm_source: (row["utm_source"] as string | null | undefined) ?? null,
    }));
    return { leads, migrated };
  });

const nullableText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .nullable()
    .optional()
    .transform((value) => (value === undefined ? undefined : value ? value : null));

const patchSchema = z.object({
  status: z.enum(LEAD_STATUSES).optional(),
  tipo: z.enum(["cliente", "empresa", "clube_nutri"]).optional(),
  nome: z.string().trim().min(2).max(120).optional(),
  empresa_nome: nullableText(160),
  whatsapp: nullableText(20),
  email: nullableText(200),
  observacoes: nullableText(4000),
});
export type LeadPatch = z.input<typeof patchSchema>;

const updateSchema = tokenSchema.extend({ id: z.string().uuid(), patch: patchSchema });

export const updateChatLead = createServerFn({ method: "POST" })
  .validator((data) => updateSchema.parse(data))
  .handler(async ({ data }) => {
    const db = await adminClient(data.accessToken);
    const patch = Object.fromEntries(
      Object.entries(data.patch).filter(([, value]) => value !== undefined),
    );
    if ("whatsapp" in patch && typeof patch["whatsapp"] === "string") {
      patch["whatsapp"] = patch["whatsapp"].replace(/\D/g, "") || null;
    }

    const first = await db
      .from("leads_onboarding")
      .update(patch as LeadUpdate)
      .eq("id", data.id)
      .select("id")
      .single();
    if (!first.error) return { success: true, skipped: [] as string[] };

    // Banco ainda sem as colunas novas: salva o que for possível e avisa o painel.
    if (isMissingColumn(first.error.code)) {
      const skipped = NEW_COLUMNS.filter((column) => column in patch);
      const legacyPatch = Object.fromEntries(
        Object.entries(patch).filter(([key]) => !skipped.includes(key as never)),
      );
      if (Object.keys(legacyPatch).length > 0) {
        const retry = await db
          .from("leads_onboarding")
          .update(legacyPatch as LeadUpdate)
          .eq("id", data.id)
          .select("id")
          .single();
        if (retry.error) throw new Error(`Não foi possível salvar: ${retry.error.message}`);
      }
      return { success: true, skipped: [...skipped] };
    }
    if (first.error.code === "23502" || first.error.code === "23514") {
      throw new Error("Informe pelo menos um contato: WhatsApp ou e-mail.");
    }
    throw new Error(`Não foi possível salvar: ${first.error.message}`);
  });

export const deleteChatLead = createServerFn({ method: "POST" })
  .validator((data) => tokenSchema.extend({ id: z.string().uuid() }).parse(data))
  .handler(async ({ data }) => {
    const db = await adminClient(data.accessToken);
    const { error } = await db.from("leads_onboarding").delete().eq("id", data.id);
    if (error) throw new Error(`Não foi possível excluir: ${error.message}`);
    return { success: true };
  });

const createSchema = tokenSchema.extend({
  nome: z.string().trim().min(2).max(120),
  status: z.enum(LEAD_STATUSES),
  tipo: z.enum(["cliente", "empresa", "clube_nutri"]).default("cliente"),
});

/** Cartão criado à mão no quadro (ex.: contato que chegou por telefone ou na loja). */
export const createManualLead = createServerFn({ method: "POST" })
  .validator((data) => createSchema.parse(data))
  .handler(async ({ data }) => {
    const db = await adminClient(data.accessToken);
    const { data: row, error } = await db
      .from("leads_onboarding")
      .insert({
        nome: data.nome,
        status: data.status,
        tipo: data.tipo,
        whatsapp: "",
        utm_source: "manual",
      } as LeadUpdate as never)
      .select("*")
      .single();
    if (error) throw new Error(`Não foi possível criar o cartão: ${error.message}`);
    return {
      id: String((row as Record<string, unknown>)["id"]),
      created_at: String((row as Record<string, unknown>)["created_at"]),
    };
  });
