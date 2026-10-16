import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const createChatLeadSchema = z.object({
  nome: z.string().trim().min(2, "Nome é obrigatório").max(120),
  whatsapp: z.string().transform((value) => value.replace(/\D/g, "")).pipe(
    z.string().min(8, "WhatsApp é obrigatório").max(15, "WhatsApp inválido"),
  ),
  tipo: z.enum(["cliente", "clube_nutri", "empresa"]),
  quantidade: z.string().trim().min(1).max(100),
  interesses: z.array(z.string().trim().min(1).max(100)).max(10),
});

// Cadastro originado no chat público. A gravação acontece somente no servidor,
// evitando depender de permissões de INSERT expostas ao navegador.
export const createChatLeadServerFn = createServerFn({ method: "POST" })
  .validator((data) => createChatLeadSchema.parse(data))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const isEmpresa = data.tipo === "empresa";

    const { data: inserted, error } = await supabaseAdmin
      .from("leads_onboarding")
      .insert({
        nome: data.nome,
        whatsapp: data.whatsapp,
        tipo: data.tipo,
        status: "novo",
        qtd_pacientes: isEmpresa ? null : data.quantidade,
        interesse_nutri: isEmpresa ? null : data.interesses,
        qtd_colaboradores: isEmpresa ? data.quantidade : null,
        interesse_empresa: isEmpresa ? data.interesses : null,
        utm_source: "chat_lead",
      })
      .select("*")
      .single();

    if (error) {
      console.error("Erro ao cadastrar lead do chat:", error);
      throw new Error(`Falha ao cadastrar lead do chat: ${error.message}`);
    }

    return inserted;
  });
