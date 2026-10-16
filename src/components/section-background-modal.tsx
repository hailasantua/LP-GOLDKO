import React, { useState, useEffect } from "react";
import { Paintbrush, Trash2, X } from "lucide-react";
import type { SectionBackground } from "@/lib/free-elements";
import { MediaUploadField } from "./media-upload-field";

interface SectionBackgroundModalProps {
  sectionId: string | null;
  initialBackground?: SectionBackground;
  onClose: () => void;
  onSave: (sectionId: string, background: SectionBackground) => void;
}

export function SectionBackgroundModal({
  sectionId,
  initialBackground,
  onClose,
  onSave,
}: SectionBackgroundModalProps) {
  if (!sectionId) return null;

  const [backgroundColor, setBackgroundColor] = useState(
    initialBackground?.backgroundColor || ""
  );
  const [backgroundImage, setBackgroundImage] = useState(
    initialBackground?.backgroundImage || ""
  );
  const [backgroundSize, setBackgroundSize] = useState<"cover" | "contain" | "auto">(
    initialBackground?.backgroundSize || "cover"
  );
  const [backgroundPosition, setBackgroundPosition] = useState(
    initialBackground?.backgroundPosition || "center"
  );
  const [overlayOpacity, setOverlayOpacity] = useState(
    initialBackground?.overlayOpacity ?? 0
  );

  useEffect(() => {
    setBackgroundColor(initialBackground?.backgroundColor || "");
    setBackgroundImage(initialBackground?.backgroundImage || "");
    setBackgroundSize(initialBackground?.backgroundSize || "cover");
    setBackgroundPosition(initialBackground?.backgroundPosition || "center");
    setOverlayOpacity(initialBackground?.overlayOpacity ?? 0);
  }, [initialBackground, sectionId]);

  const handleSave = () => {
    onSave(sectionId, {
      backgroundColor: backgroundColor || undefined,
      backgroundImage: backgroundImage || undefined,
      backgroundSize,
      backgroundPosition,
      overlayOpacity: Number(overlayOpacity),
    });
    onClose();
  };

  const handleClear = () => {
    setBackgroundColor("");
    setBackgroundImage("");
    setOverlayOpacity(0);
    onSave(sectionId, {
      backgroundColor: undefined,
      backgroundImage: undefined,
      overlayOpacity: 0,
    });
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="relative max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-3xl bg-white p-6 text-gray-900 shadow-2xl animate-in fade-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 pb-4">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#ff8515]">
              Personalização Visual
            </span>
            <h3 className="font-display text-lg font-bold text-[#00205C] flex items-center gap-2">
              <Paintbrush className="size-4 text-[#42C8E5]" />
              Fundo da Seção: <span className="capitalize">{sectionId}</span>
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition"
          >
            <X className="size-5" />
          </button>
        </div>

        {/* Form Body */}
        <div className="mt-5 space-y-5">
          {/* Cor de Fundo */}
          <div>
            <label className="block text-xs font-bold uppercase text-gray-600">
              Cor de Fundo da Seção
            </label>
            <div className="mt-1.5 flex items-center gap-2">
              <input
                type="color"
                value={backgroundColor || "#ffffff"}
                onChange={(e) => setBackgroundColor(e.target.value)}
                className="size-9 cursor-pointer rounded-lg border border-gray-300"
              />
              <input
                type="text"
                value={backgroundColor}
                onChange={(e) => setBackgroundColor(e.target.value)}
                placeholder="#ffffff ou transparente"
                className="w-full rounded-2xl border border-gray-200 p-2.5 text-sm"
              />
              {backgroundColor && (
                <button
                  type="button"
                  onClick={() => setBackgroundColor("")}
                  className="rounded-xl border border-gray-200 px-3 py-2 text-xs font-semibold text-gray-500 hover:bg-gray-100"
                >
                  Limpar
                </button>
              )}
            </div>
          </div>

          {/* Imagem de Fundo com Supabase Storage */}
          <div>
            <MediaUploadField
              label="Imagem de Fundo (Upload ou URL)"
              value={backgroundImage}
              onChange={(newUrl) => setBackgroundImage(newUrl)}
            />
          </div>

          {/* Ajustes de Imagem se houver imagem de fundo */}
          {backgroundImage && (
            <div className="grid grid-cols-2 gap-3 rounded-2xl bg-gray-50 p-4">
              <div>
                <label className="block text-[11px] font-bold uppercase text-gray-500">
                  Enquadramento
                </label>
                <select
                  value={backgroundSize}
                  onChange={(e) => setBackgroundSize(e.target.value as any)}
                  className="mt-1 w-full rounded-xl border border-gray-200 p-2 text-xs"
                >
                  <option value="cover">Cobrir Seção (Cover)</option>
                  <option value="contain">Conter Imagem (Contain)</option>
                  <option value="auto">Tamanho Original (Auto)</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase text-gray-500">
                  Posicionamento
                </label>
                <select
                  value={backgroundPosition}
                  onChange={(e) => setBackgroundPosition(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-gray-200 p-2 text-xs"
                >
                  <option value="center">Centro</option>
                  <option value="top">Topo</option>
                  <option value="bottom">Base</option>
                </select>
              </div>

              <div className="col-span-2 mt-2">
                <label className="block text-[11px] font-bold uppercase text-gray-500">
                  Película Escura Sobre a Imagem ({Math.round(overlayOpacity * 100)}%)
                </label>
                <p className="text-[11px] text-gray-500">
                  Ajuda a destacar textos brancos sobre fotos contrastantes.
                </p>
                <input
                  type="range"
                  min="0"
                  max="0.9"
                  step="0.05"
                  value={overlayOpacity}
                  onChange={(e) => setOverlayOpacity(Number(e.target.value))}
                  className="mt-2 w-full cursor-pointer accent-[#ff8515]"
                />
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="mt-6 flex items-center justify-between border-t border-gray-100 pt-4">
          <button
            type="button"
            onClick={handleClear}
            className="flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-bold text-gray-500 hover:bg-gray-100 hover:text-red-600 transition"
          >
            <Trash2 className="size-3.5" />
            <span>Restaurar Padrão</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-full px-5 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-100 transition"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="rounded-full bg-[#ff8515] px-6 py-2 text-xs font-bold uppercase tracking-wider text-white shadow-md hover:bg-[#e0740e] transition"
            >
              Aplicar Fundo
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
