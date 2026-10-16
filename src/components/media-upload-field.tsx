import { useRef, useState } from "react";
import {
  AlertCircle,
  ExternalLink,
  Film,
  Image as ImageIcon,
  Link2,
  Loader2,
  Trash2,
  UploadCloud,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { getSignedUploadUrl } from "@/lib/media.functions";

interface MediaUploadFieldProps {
  label: string;
  value: string;
  onChange: (url: string) => void;
  accept?: string;
  helperText?: string;
}

function isVideoUrl(url: string) {
  return /\.(mp4|webm|mov)(\?|$)/i.test(url);
}

export function MediaUploadField({
  label,
  value,
  onChange,
  accept = "image/*,video/*",
  helperText,
}: MediaUploadFieldProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [showManualInput, setShowManualInput] = useState(false);

  async function handleFileUpload(file: File) {
    setUploadError(null);

    // Limite de 50MB
    const maxSize = 50 * 1024 * 1024;
    if (file.size > maxSize) {
      setUploadError("O arquivo excede o limite máximo de 50MB.");
      return;
    }

    setIsUploading(true);

    try {
      const cleanFileName = file.name
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-zA-Z0-9.-]/g, "_")
        .toLowerCase();

      const filePath = `uploads/${Date.now()}-${cleanFileName}`;

      // 1. Solicita ao servidor uma URL assinada de upload (bypassa RLS via service role)
      const { token, publicUrl } = await getSignedUploadUrl({ data: { path: filePath } });

      // 2. Faz o upload usando o token assinado (sem precisar de sessão autenticada no cliente)
      const { error: uploadError } = await supabase.storage
        .from("media")
        .uploadToSignedUrl(filePath, token, file, {
          cacheControl: "31536000",
        });

      if (uploadError) {
        throw uploadError;
      }

      onChange(publicUrl);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Erro desconhecido ao enviar arquivo para o Supabase.";
      setUploadError(message);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  }

  function handleDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setIsDragging(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      void handleFileUpload(file);
    }
  }

  const hasValue = Boolean(value && value.trim() !== "");
  const isVideo = hasValue && isVideoUrl(value);

  return (
    <div className="block text-sm font-semibold">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-gray-900">{label}</span>
        <button
          type="button"
          onClick={() => setShowManualInput(!showManualInput)}
          className="inline-flex items-center gap-1 text-xs font-medium text-gray-500 hover:text-[#087fd9]"
        >
          <Link2 className="size-3" />
          {showManualInput ? "Ocultar link manual" : "Editar URL manualmente"}
        </button>
      </div>

      {showManualInput && (
        <div className="mb-3">
          <input
            type="text"
            value={value}
            placeholder="https://... ou /arquivo.mp4"
            onChange={(e) => onChange(e.target.value)}
            className="w-full rounded-xl border border-border bg-white px-4 py-2.5 text-sm font-normal outline-none focus:border-[#087fd9]"
          />
        </div>
      )}

      {hasValue ? (
        <div className="rounded-2xl border border-border bg-white p-4 shadow-sm">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            {/* Preview do arquivo */}
            <div className="relative flex h-28 w-28 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-gray-100 bg-neutral-900">
              {isVideo ? (
                <video
                  src={value}
                  muted
                  playsInline
                  autoPlay
                  loop
                  className="h-full w-full object-cover"
                />
              ) : (
                <img
                  src={value}
                  alt={label}
                  className="h-full w-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLElement).style.display = "none";
                  }}
                />
              )}
              <span className="absolute bottom-1 right-1 rounded-md bg-black/60 px-1.5 py-0.5 text-[10px] font-bold uppercase text-white">
                {isVideo ? "Vídeo" : "Imagem"}
              </span>
            </div>

            {/* Informações e ações */}
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                {isVideo ? <Film className="size-3.5" /> : <ImageIcon className="size-3.5" />}
                <span className="max-w-[280px] truncate font-mono text-[11px]">{value}</span>
              </div>

              {value.includes("supabase.co") && (
                <p className="mt-1 inline-flex items-center gap-1 text-[11px] font-medium text-emerald-600">
                  <span className="size-1.5 rounded-full bg-emerald-500" />
                  Armazenado no Supabase Storage
                </p>
              )}

              <div className="mt-3 flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  disabled={isUploading}
                  onClick={() => fileInputRef.current?.click()}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 shadow-sm transition hover:bg-gray-50 disabled:opacity-50"
                >
                  {isUploading ? (
                    <Loader2 className="size-3.5 animate-spin" />
                  ) : (
                    <UploadCloud className="size-3.5 text-[#087fd9]" />
                  )}
                  {isUploading ? "Enviando..." : "Substituir arquivo"}
                </button>

                <a
                  href={value}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 rounded-lg border border-border bg-white px-2.5 py-1.5 text-xs font-semibold text-gray-700 shadow-sm transition hover:bg-gray-50"
                  title="Abrir arquivo original em nova aba"
                >
                  <ExternalLink className="size-3.5" />
                </a>

                <button
                  type="button"
                  onClick={() => onChange("")}
                  className="inline-flex items-center gap-1 rounded-lg border border-transparent px-2.5 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50"
                  title="Remover mídia"
                >
                  <Trash2 className="size-3.5" />
                  Remover
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* Área de Upload / Dropzone quando não há arquivo */
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          onClick={() => !isUploading && fileInputRef.current?.click()}
          className={`flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed p-6 text-center transition ${
            isDragging
              ? "border-[#087fd9] bg-blue-50/60"
              : "border-gray-300 bg-white hover:border-[#087fd9] hover:bg-gray-50/70"
          } ${isUploading ? "pointer-events-none opacity-60" : ""}`}
        >
          {isUploading ? (
            <div className="flex flex-col items-center">
              <Loader2 className="size-8 animate-spin text-[#087fd9]" />
              <p className="mt-2 text-sm font-semibold text-gray-700">
                Enviando para o Supabase Storage...
              </p>
              <p className="text-xs text-muted-foreground">Isso pode levar alguns segundos.</p>
            </div>
          ) : (
            <>
              <div className="flex size-11 items-center justify-center rounded-full bg-blue-50 text-[#087fd9]">
                <UploadCloud className="size-6" />
              </div>
              <p className="mt-3 text-sm font-semibold text-gray-800">
                Clique para selecionar ou arraste o arquivo aqui
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {helperText ?? "Fotos (JPG, PNG, WebP) ou Vídeos (MP4, WebM) até 50MB"}
              </p>
              <span className="mt-3 inline-flex items-center gap-1 rounded-full bg-gray-100 px-3 py-1 text-[11px] font-semibold text-gray-600">
                Salvar direto no Supabase
              </span>
            </>
          )}
        </div>
      )}

      {/* Input oculto padrão */}
      <input
        ref={fileInputRef}
        type="file"
        accept={accept}
        onChange={(e) => {
          if (e.target.files && e.target.files[0]) {
            void handleFileUpload(e.target.files[0]);
          }
        }}
        className="hidden"
      />

      {/* Mensagem de Erro de Upload */}
      {uploadError && (
        <div className="mt-2 flex items-start gap-2 rounded-xl bg-red-50 p-3 text-xs text-red-700">
          <AlertCircle className="mt-0.5 size-4 shrink-0" />
          <div>
            <p className="font-semibold">Erro no upload</p>
            <p className="mt-0.5 leading-relaxed">{uploadError}</p>
          </div>
        </div>
      )}
    </div>
  );
}
