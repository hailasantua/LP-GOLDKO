import React, { useState, useEffect } from "react";
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  Bold,
  Maximize2,
  Minimize2,
  Pencil,
  RotateCw,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import type { FreeElement } from "@/lib/free-elements";
import { MediaUploadField } from "./media-upload-field";

interface FreeElementModalProps {
  element: FreeElement | null;
  onClose: () => void;
  onSave: (elementId: string, sectionId: string, updates: Partial<FreeElement>) => void;
  onDelete: (elementId: string, sectionId: string) => void;
}

export function FreeElementModal({
  element,
  onClose,
  onSave,
  onDelete,
}: FreeElementModalProps) {
  if (!element) return null;

  const [content, setContent] = useState(element.content || "");
  const [href, setHref] = useState(element.href || "");
  const [mediaUrl, setMediaUrl] = useState(element.mediaUrl || "");
  const [width, setWidth] = useState(element.width);
  const [height, setHeight] = useState(element.height);
  const [opacity, setOpacity] = useState(element.opacity ?? 1);
  const [rotation, setRotation] = useState(element.rotation ?? 0);
  const [styles, setStyles] = useState<Record<string, string>>(element.styles || {});

  useEffect(() => {
    setContent(element.content || "");
    setHref(element.href || "");
    setMediaUrl(element.mediaUrl || "");
    setWidth(element.width);
    setHeight(element.height);
    setOpacity(element.opacity ?? 1);
    setRotation(element.rotation ?? 0);
    setStyles(element.styles || {});
  }, [element]);

  const updateStyle = (key: string, value: string) => {
    setStyles((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = () => {
    onSave(element.id, element.sectionId, {
      content,
      href,
      mediaUrl,
      width: Number(width),
      height: Number(height),
      opacity: Number(opacity),
      rotation: Number(rotation),
      styles,
    });
    onClose();
  };

  const handleDelete = () => {
    if (confirm("Tem certeza que deseja excluir este elemento?")) {
      onDelete(element.id, element.sectionId);
      onClose();
    }
  };

  const typeTitles: Record<string, string> = {
    text: "Editar Texto Livre",
    button: "Editar Botão de Ação",
    image: "Editar Imagem",
    video: "Editar Vídeo",
    shape: "Editar Forma / Bloco",
    container: "Editar Card Container",
  };

  return (
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="relative max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-3xl bg-white p-6 text-gray-900 shadow-2xl animate-in fade-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 pb-4">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#42C8E5]">
              Elemento Visual Livre
            </span>
            <h3 className="font-display text-lg font-bold text-[#00205C]">
              {typeTitles[element.type] || "Editar Elemento"}
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
          {/* TEXTO */}
          {element.type === "text" && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase text-gray-600">
                  Conteúdo do Texto
                </label>
                <textarea
                  rows={4}
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Escreva seu texto..."
                  className="mt-1 w-full rounded-2xl border border-gray-200 p-3 text-sm focus:border-[#42C8E5] focus:ring-1 focus:ring-[#42C8E5] outline-none transition"
                />
              </div>

              {/* Controles de tipografia */}
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {/* Cor do texto */}
                <div>
                  <label className="block text-[11px] font-bold uppercase text-gray-500">
                    Cor do Texto
                  </label>
                  <div className="mt-1 flex items-center gap-2">
                    <input
                      type="color"
                      value={styles.color || "#151515"}
                      onChange={(e) => updateStyle("color", e.target.value)}
                      className="size-8 cursor-pointer rounded-lg border border-gray-300"
                    />
                    <input
                      type="text"
                      value={styles.color || "#151515"}
                      onChange={(e) => updateStyle("color", e.target.value)}
                      className="w-full rounded-xl border border-gray-200 px-2 py-1.5 text-xs"
                    />
                  </div>
                </div>

                {/* Tamanho da fonte */}
                <div>
                  <label className="block text-[11px] font-bold uppercase text-gray-500">
                    Tamanho
                  </label>
                  <select
                    value={styles.fontSize || "18px"}
                    onChange={(e) => updateStyle("fontSize", e.target.value)}
                    className="mt-1 w-full rounded-xl border border-gray-200 p-2 text-xs"
                  >
                    <option value="12px">12px (Muito Pequeno)</option>
                    <option value="14px">14px (Pequeno)</option>
                    <option value="16px">16px (Normal)</option>
                    <option value="18px">18px (Médio)</option>
                    <option value="20px">20px (Grande)</option>
                    <option value="24px">24px (Título 3)</option>
                    <option value="32px">32px (Título 2)</option>
                    <option value="40px">40px (Título 1)</option>
                    <option value="48px">48px (Destaque)</option>
                    <option value="60px">60px (Gigante)</option>
                  </select>
                </div>

                {/* Peso da fonte */}
                <div>
                  <label className="block text-[11px] font-bold uppercase text-gray-500">
                    Espessura
                  </label>
                  <select
                    value={styles.fontWeight || "600"}
                    onChange={(e) => updateStyle("fontWeight", e.target.value)}
                    className="mt-1 w-full rounded-xl border border-gray-200 p-2 text-xs"
                  >
                    <option value="400">Regular</option>
                    <option value="500">Médio</option>
                    <option value="600">Semibold</option>
                    <option value="700">Bold</option>
                    <option value="800">Extra Bold</option>
                  </select>
                </div>
              </div>

              {/* Alinhamento */}
              <div>
                <label className="block text-[11px] font-bold uppercase text-gray-500 mb-1">
                  Alinhamento
                </label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => updateStyle("textAlign", "left")}
                    className={`flex items-center gap-1 rounded-xl px-3 py-1.5 text-xs font-semibold border ${
                      styles.textAlign === "left" || !styles.textAlign
                        ? "border-[#00205C] bg-[#00205C] text-white"
                        : "border-gray-200 text-gray-600 hover:bg-gray-50"
                    }`}
                  >
                    <AlignLeft className="size-3.5" />
                    <span>Esquerda</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => updateStyle("textAlign", "center")}
                    className={`flex items-center gap-1 rounded-xl px-3 py-1.5 text-xs font-semibold border ${
                      styles.textAlign === "center"
                        ? "border-[#00205C] bg-[#00205C] text-white"
                        : "border-gray-200 text-gray-600 hover:bg-gray-50"
                    }`}
                  >
                    <AlignCenter className="size-3.5" />
                    <span>Centro</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => updateStyle("textAlign", "right")}
                    className={`flex items-center gap-1 rounded-xl px-3 py-1.5 text-xs font-semibold border ${
                      styles.textAlign === "right"
                        ? "border-[#00205C] bg-[#00205C] text-white"
                        : "border-gray-200 text-gray-600 hover:bg-gray-50"
                    }`}
                  >
                    <AlignRight className="size-3.5" />
                    <span>Direita</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* BOTÃO */}
          {element.type === "button" && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase text-gray-600">
                  Texto do Botão
                </label>
                <input
                  type="text"
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Ex: Clique Aqui"
                  className="mt-1 w-full rounded-2xl border border-gray-200 p-3 text-sm focus:border-[#42C8E5] focus:ring-1 focus:ring-[#42C8E5] outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-gray-600">
                  Link de Destino (URL ou #âncora)
                </label>
                <input
                  type="text"
                  value={href}
                  onChange={(e) => setHref(e.target.value)}
                  placeholder="Ex: https://wa.me/... ou #contato"
                  className="mt-1 w-full rounded-2xl border border-gray-200 p-3 text-sm focus:border-[#42C8E5] focus:ring-1 focus:ring-[#42C8E5] outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold uppercase text-gray-500">
                    Cor de Fundo
                  </label>
                  <div className="mt-1 flex items-center gap-2">
                    <input
                      type="color"
                      value={styles.backgroundColor || "#ff8515"}
                      onChange={(e) => updateStyle("backgroundColor", e.target.value)}
                      className="size-8 cursor-pointer rounded-lg border border-gray-300"
                    />
                    <input
                      type="text"
                      value={styles.backgroundColor || "#ff8515"}
                      onChange={(e) => updateStyle("backgroundColor", e.target.value)}
                      className="w-full rounded-xl border border-gray-200 px-2 py-1.5 text-xs"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase text-gray-500">
                    Cor do Texto
                  </label>
                  <div className="mt-1 flex items-center gap-2">
                    <input
                      type="color"
                      value={styles.color || "#ffffff"}
                      onChange={(e) => updateStyle("color", e.target.value)}
                      className="size-8 cursor-pointer rounded-lg border border-gray-300"
                    />
                    <input
                      type="text"
                      value={styles.color || "#ffffff"}
                      onChange={(e) => updateStyle("color", e.target.value)}
                      className="w-full rounded-xl border border-gray-200 px-2 py-1.5 text-xs"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase text-gray-500">
                  Cantos Arredondados
                </label>
                <select
                  value={styles.borderRadius || "9999px"}
                  onChange={(e) => updateStyle("borderRadius", e.target.value)}
                  className="mt-1 w-full rounded-xl border border-gray-200 p-2 text-xs"
                >
                  <option value="9999px">Totalmente Arredondado (Pílula)</option>
                  <option value="16px">Arredondado Moderno (16px)</option>
                  <option value="8px">Levemente Arredondado (8px)</option>
                  <option value="0px">Reto (0px)</option>
                </select>
              </div>
            </div>
          )}

          {/* IMAGEM / VÍDEO */}
          {(element.type === "image" || element.type === "video") && (
            <div className="space-y-4">
              <MediaUploadField
                label={element.type === "image" ? "Imagem (Upload ou URL)" : "Vídeo (Upload ou URL)"}
                value={mediaUrl}
                onChange={(newUrl) => setMediaUrl(newUrl)}
              />

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold uppercase text-gray-500">
                    Cantos Arredondados
                  </label>
                  <select
                    value={styles.borderRadius || "16px"}
                    onChange={(e) => updateStyle("borderRadius", e.target.value)}
                    className="mt-1 w-full rounded-xl border border-gray-200 p-2 text-xs"
                  >
                    <option value="0px">Nenhum (0px)</option>
                    <option value="12px">Médio (12px)</option>
                    <option value="16px">Suave (16px)</option>
                    <option value="24px">Arredondado (24px)</option>
                    <option value="9999px">Círculo / Oval</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase text-gray-500">
                    Enquadramento
                  </label>
                  <select
                    value={styles.objectFit || "cover"}
                    onChange={(e) => updateStyle("objectFit", e.target.value)}
                    className="mt-1 w-full rounded-xl border border-gray-200 p-2 text-xs"
                  >
                    <option value="cover">Preencher (Cover)</option>
                    <option value="contain">Conter (Contain)</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* FORMA / CONTAINER */}
          {(element.type === "shape" || element.type === "container") && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase text-gray-600">
                  Texto Opcional dentro do Bloco
                </label>
                <input
                  type="text"
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Texto ou título do card..."
                  className="mt-1 w-full rounded-2xl border border-gray-200 p-3 text-sm focus:border-[#42C8E5] focus:ring-1 focus:ring-[#42C8E5] outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold uppercase text-gray-500">
                    Cor de Fundo
                  </label>
                  <div className="mt-1 flex items-center gap-2">
                    <input
                      type="color"
                      value={styles.backgroundColor || "#ffffff"}
                      onChange={(e) => updateStyle("backgroundColor", e.target.value)}
                      className="size-8 cursor-pointer rounded-lg border border-gray-300"
                    />
                    <input
                      type="text"
                      value={styles.backgroundColor || "#ffffff"}
                      onChange={(e) => updateStyle("backgroundColor", e.target.value)}
                      className="w-full rounded-xl border border-gray-200 px-2 py-1.5 text-xs"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase text-gray-500">
                    Cantos Arredondados
                  </label>
                  <select
                    value={styles.borderRadius || "16px"}
                    onChange={(e) => updateStyle("borderRadius", e.target.value)}
                    className="mt-1 w-full rounded-xl border border-gray-200 p-2 text-xs"
                  >
                    <option value="0px">Quadrado (0px)</option>
                    <option value="12px">Pequeno (12px)</option>
                    <option value="16px">Médio (16px)</option>
                    <option value="24px">Grande (24px)</option>
                    <option value="9999px">Círculo (9999px)</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* DIMENSÕES E OPACIDADE GLOBAIS */}
          <div className="rounded-2xl bg-gray-50 p-4 space-y-3">
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500">
              Tamanho e Aparência
            </span>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div>
                <label className="block text-[11px] font-semibold text-gray-600">
                  Largura (px)
                </label>
                <input
                  type="number"
                  value={width}
                  onChange={(e) => setWidth(Number(e.target.value))}
                  className="mt-1 w-full rounded-xl border border-gray-200 p-2 text-xs"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-gray-600">
                  Altura (px)
                </label>
                <input
                  type="number"
                  value={height}
                  onChange={(e) => setHeight(Number(e.target.value))}
                  className="mt-1 w-full rounded-xl border border-gray-200 p-2 text-xs"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-gray-600">
                  Opacidade ({Math.round(opacity * 100)}%)
                </label>
                <input
                  type="range"
                  min="0.1"
                  max="1"
                  step="0.05"
                  value={opacity}
                  onChange={(e) => setOpacity(Number(e.target.value))}
                  className="mt-2 w-full cursor-pointer accent-[#ff8515]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-gray-600">
                  Rotação ({rotation}°)
                </label>
                <input
                  type="number"
                  value={rotation}
                  onChange={(e) => setRotation(Number(e.target.value))}
                  className="mt-1 w-full rounded-xl border border-gray-200 p-2 text-xs"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-6 flex items-center justify-between border-t border-gray-100 pt-4">
          <button
            type="button"
            onClick={handleDelete}
            className="flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-bold text-red-600 hover:bg-red-50 transition"
          >
            <Trash2 className="size-3.5" />
            <span>Excluir Elemento</span>
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
              Salvar Alterações
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
