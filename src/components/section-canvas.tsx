import React, { useRef, useState } from "react";
import {
  Image as ImageIcon,
  Layers,
  LayoutGrid,
  MousePointerClick,
  Paintbrush,
  Plus,
  Square,
  Type,
  Video,
} from "lucide-react";
import type {
  FreeElement,
  FreeElementType,
  SectionBackground,
} from "@/lib/free-elements";
import { useEditor } from "./editor-context";
import { ElementRenderer } from "./element-renderer";

interface SectionCanvasProps {
  sectionId: string;
  sectionTitle?: string;
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  freeElements?: FreeElement[];
  background?: SectionBackground;
  id?: string;
}

export function SectionCanvas({
  sectionId,
  sectionTitle,
  children,
  className = "",
  style = {},
  freeElements = [],
  background,
  id,
}: SectionCanvasProps) {
  const {
    isEditable,
    addElement,
    onOpenBackgroundModal,
    setSelectedElementId,
  } = useEditor();

  const containerRef = useRef<HTMLDivElement>(null);
  const [isAddMenuOpen, setIsAddMenuOpen] = useState(false);

  // Background styles
  const backgroundStyle: React.CSSProperties = {
    ...style,
    backgroundColor: background?.backgroundColor || style.backgroundColor,
    backgroundImage: background?.backgroundImage
      ? `url("${background.backgroundImage}")`
      : style.backgroundImage,
    backgroundSize: background?.backgroundSize || style.backgroundSize || "cover",
    backgroundPosition:
      background?.backgroundPosition || style.backgroundPosition || "center",
    backgroundRepeat: "no-repeat",
  };

  const handleCanvasClick = (e: React.MouseEvent) => {
    // If clicking directly on canvas or section background, deselect element
    if (e.target === containerRef.current || (e.target as HTMLElement).classList.contains("section-click-target")) {
      setSelectedElementId(null);
    }
  };

  const handleAddElement = (type: FreeElementType) => {
    setIsAddMenuOpen(false);
    // Add element centered or at comfortable default offset
    addElement(sectionId, type, { x: 25, y: 60 });
  };

  return (
    <section
      id={id || sectionId}
      ref={containerRef}
      onClick={handleCanvasClick}
      style={backgroundStyle}
      className={`relative section-click-target ${className} ${
        isEditable ? "group/section" : ""
      }`}
    >
      {/* Background dark/light overlay if configured */}
      {background?.overlayOpacity !== undefined && background.overlayOpacity > 0 && (
        <div
          className="pointer-events-none absolute inset-0 z-0"
          style={{
            backgroundColor: `rgba(0, 0, 0, ${background.overlayOpacity})`,
          }}
        />
      )}

      {/* Visual Editor Section Controls (Only visible in edit mode) */}
      {isEditable && (
        <div
          className={`absolute right-3 z-[60] flex items-center gap-1.5 opacity-40 transition-opacity group-hover/section:opacity-100 ${
            sectionId === "topo" ? "top-[4.5rem]" : "top-2"
          }`}
        >
          {/* Section Name Badge */}
          <span className="hidden sm:inline-flex items-center gap-1 rounded-full bg-[#00205C]/80 px-2.5 py-1 text-[10px] font-semibold text-white/90 backdrop-blur-sm shadow">
            <Layers className="size-2.5 text-[#42C8E5]" />
            {sectionTitle || sectionId}
          </span>

          {/* Section Background Button */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onOpenBackgroundModal?.(sectionId);
            }}
            title="Alterar cor ou imagem de fundo desta seção"
            className="inline-flex items-center gap-1 rounded-full bg-[#00205C] px-2.5 py-1 text-[11px] font-semibold text-white shadow-md hover:bg-[#ff8515] transition"
          >
            <Paintbrush className="size-3 text-[#42C8E5]" />
            <span className="hidden md:inline">Fundo</span>
          </button>

          {/* Add Element Menu Trigger */}
          <div className="relative">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setIsAddMenuOpen(!isAddMenuOpen);
              }}
              className="inline-flex items-center gap-1 rounded-full bg-[#ff8515] px-3 py-1 text-[11px] font-bold text-white shadow-md hover:bg-[#e0740e] transition"
              title="Adicionar elemento livre nesta seção"
            >
              <Plus className="size-3" />
              <span>Adicionar</span>
            </button>

            {/* Dropdown Menu */}
            {isAddMenuOpen && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsAddMenuOpen(false);
                  }}
                />
                <div className="absolute right-0 top-full mt-1 z-50 w-48 rounded-xl border border-white/10 bg-[#00205C] p-1.5 text-white shadow-2xl animate-in fade-in zoom-in-95 duration-100">
                  <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-[#42C8E5]">
                    Novo Elemento Livre
                  </div>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleAddElement("text");
                    }}
                    className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-xs text-white/90 hover:bg-white/10 hover:text-white transition"
                  >
                    <Type className="size-3.5 text-[#ff8515]" />
                    <span>Texto Livre</span>
                  </button>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleAddElement("button");
                    }}
                    className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-xs text-white/90 hover:bg-white/10 hover:text-white transition"
                  >
                    <MousePointerClick className="size-3.5 text-[#42C8E5]" />
                    <span>Botão com Link</span>
                  </button>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleAddElement("image");
                    }}
                    className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-xs text-white/90 hover:bg-white/10 hover:text-white transition"
                  >
                    <ImageIcon className="size-3.5 text-emerald-400" />
                    <span>Imagem</span>
                  </button>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleAddElement("video");
                    }}
                    className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-xs text-white/90 hover:bg-white/10 hover:text-white transition"
                  >
                    <Video className="size-3.5 text-purple-400" />
                    <span>Vídeo</span>
                  </button>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleAddElement("shape");
                    }}
                    className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-xs text-white/90 hover:bg-white/10 hover:text-white transition"
                  >
                    <Square className="size-3.5 text-amber-400" />
                    <span>Forma / Bloco</span>
                  </button>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleAddElement("container");
                    }}
                    className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-xs text-white/90 hover:bg-white/10 hover:text-white transition"
                  >
                    <LayoutGrid className="size-3.5 text-sky-400" />
                    <span>Card Container</span>
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Regular Section Content */}
      <div className="relative z-10 w-full bg-transparent" style={{ backgroundColor: "transparent" }}>
        {children}
      </div>

      {/* Free Elements Rendered Over the Section */}
      {freeElements.map((elem) => (
        <ElementRenderer
          key={elem.id}
          element={elem}
          containerRef={containerRef}
        />
      ))}
    </section>
  );
}
