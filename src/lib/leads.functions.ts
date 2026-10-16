import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const submitLeadSchema = z.object({
  name: z.string().min(2, "Nome é obrigatório"),
  email: z.string().email("Email inválido"),
  phone: z.string().optional(),
  interest: z.enum(["cliente", "nutricionista", "empresa", "ifood", ""]).optional(),
  message: z.string().optional(),
});

export type SubmitLeadInput = z.infer<typeof submitLeadSchema>;

export const submitLead = createServerFn({ method: "POST" })
  .validator((data) => submitLeadSchema.parse(data))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { error } = await supabaseAdmin.from("leads").insert({
      name: data.name,
      email: data.email,
      phone: data.phone || null,
      interest: data.interest || null,
      message: data.message || null,
    });

    if (error) {
      console.error("Failed to submit lead:", error);
      throw new Error("Não foi possível enviar sua mensagem. Tente novamente mais tarde.");
    }

    return { success: true };
  });
