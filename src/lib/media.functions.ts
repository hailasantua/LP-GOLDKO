import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const uploadUrlSchema = z.object({
  path: z.string().min(1),
});

export const getSignedUploadUrl = createServerFn({ method: "POST" })
  .validator((data) => uploadUrlSchema.parse(data))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Garante que o bucket 'media' está criado e público
    try {
      await supabaseAdmin.storage.createBucket("media", {
        public: true,
        fileSizeLimit: 52428800,
      });
    } catch {
      // Bucket já existe
    }

    const { data: signedData, error } = await supabaseAdmin.storage
      .from("media")
      .createSignedUploadUrl(data.path);

    if (error || !signedData) {
      console.error("Erro ao gerar URL assinada:", error);
      throw new Error(error?.message || "Não foi possível autorizar o upload de mídia.");
    }

    const { data: publicData } = supabaseAdmin.storage
      .from("media")
      .getPublicUrl(data.path);

    return {
      token: signedData.token,
      path: signedData.path,
      publicUrl: publicData.publicUrl,
    };
  });
