import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const deletePageSchema = z.object({
  id: z.string().min(1),
});

export const deletePageServerFn = createServerFn({ method: "POST" })
  .validator((data) => deletePageSchema.parse(data))
  .handler(async ({ data }) => {
    if (data.id === "main") {
      throw new Error("A página principal não pode ser excluída.");
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { error } = await supabaseAdmin
      .from("site_content")
      .delete()
      .eq("id", data.id);

    if (error) {
      console.error("Erro ao excluir página no Supabase Admin:", error);
      throw new Error(error.message || "Não foi possível excluir a página.");
    }

    return { success: true };
  });

const createPageSchema = z.object({
  id: z.string().min(1),
  content: z.any(),
  updatedBy: z.string().optional(),
});

export const createPageServerFn = createServerFn({ method: "POST" })
  .validator((data) => createPageSchema.parse(data))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { error } = await supabaseAdmin.from("site_content").insert({
      id: data.id,
      content: data.content,
      updated_at: new Date().toISOString(),
      updated_by: data.updatedBy ?? null,
    });

    if (error) {
      console.error("Erro ao criar página no Supabase Admin:", error);
      throw new Error(error.message || "Não foi possível criar a página.");
    }

    return { success: true };
  });

const upsertPageSchema = z.object({
  id: z.string().min(1),
  content: z.any(),
  updatedBy: z.string().optional(),
});

export const upsertPageServerFn = createServerFn({ method: "POST" })
  .validator((data) => upsertPageSchema.parse(data))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { error } = await supabaseAdmin.from("site_content").upsert({
      id: data.id,
      content: data.content,
      updated_at: new Date().toISOString(),
      updated_by: data.updatedBy ?? null,
    });

    if (error) {
      console.error("Erro ao salvar página no Supabase Admin:", error);
      throw new Error(error.message || "Não foi possível salvar a página.");
    }

    return { success: true };
  });
