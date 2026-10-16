import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const optionalText = (max: number) =>
  z.string().trim().max(max).optional().transform((value) => (value ? value : undefined));

const createChatLeadSchema = z
  .object({
    nome: z.string().trim().min(2, "Nome é obrigatório").max(120),
    empresa: optionalText(160),
    whatsapp: z
      .string()
      .optional()
      .transform((value) => (value ? value.replace(/\D/g, "") : undefined))
      .pipe(z.string().min(8, "WhatsApp inválido").max(15, "WhatsApp inválido").optional()),
    email: z.string().trim().toLowerCase().email("E-mail inválido").max(200).optional(),
    tipo: z.enum(["cliente", "clube_nutri", "empresa"]),
    quantidade: z.string().trim().min(1).max(100),
    interesses: z.array(z.string().trim().min(1).max(100)).max(10),
  })
  .refine((data) => Boolean(data.whatsapp || data.email), {
    message: "Informe um WhatsApp ou um e-mail",
    path: ["whatsapp"],
  })
  .refine((data) => data.tipo === "empresa" || Boolean(data.whatsapp), {
    message: "WhatsApp é obrigatório",
    path: ["whatsapp"],
  });

// Cadastro originado no chat público. A gravação acontece somente no servidor,
// evitando depender de permissões de INSERT expostas ao navegador.
export const createChatLeadServerFn = createServerFn({ method: "POST" })
  .validator((data) => createChatLeadSchema.parse(data))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const isEmpresa = data.tipo === "empresa";

    const base = {
      tipo: data.tipo,
      status: "novo",
      qtd_pacientes: isEmpresa ? null : data.quantidade,
      interesse_nutri: isEmpresa ? null : data.interesses,
      qtd_colaboradores: isEmpresa ? data.quantidade : null,
      interesse_empresa: isEmpresa ? data.interesses : null,
      utm_source: "chat_lead",
    };

    // Com a migração 20261016 aplicada: empresa e e-mail em colunas próprias.
    const full = await supabaseAdmin
      .from("leads_onboarding")
      .insert({
        ...base,
        nome: data.nome,
        empresa_nome: data.empresa ?? null,
        email: data.email ?? null,
        whatsapp: data.whatsapp ?? null,
      })
      .select("*")
      .single();

    if (!full.error) return full.data;

    // Sem a migração (coluna inexistente ou WhatsApp obrigatório): grava no formato antigo
    // para não perder o lead. Empresa vai junto do nome e o e-mail ocupa o campo de contato.
    const schemaOutdated = ["42703", "PGRST204", "23502"].includes(full.error.code ?? "");
    if (!schemaOutdated) {
      console.error("Erro ao cadastrar lead do chat:", full.error);
      throw new Error(`Falha ao cadastrar lead do chat: ${full.error.message}`);
    }

    const legacy = await supabaseAdmin
      .from("leads_onboarding")
      .insert({
        ...base,
        nome: data.empresa ? `${data.nome} (${data.empresa})` : data.nome,
        whatsapp: data.whatsapp ?? data.email ?? "",
      })
      .select("*")
      .single();

    if (legacy.error) {
      console.error("Erro ao cadastrar lead do chat:", legacy.error);
      throw new Error(`Falha ao cadastrar lead do chat: ${legacy.error.message}`);
    }

    return legacy.data;
  });
