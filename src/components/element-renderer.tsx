import React, { useRef } from "react";
import {
  ArrowDown,
  ArrowUp,
  Copy,
  GripHorizontal,
  Move,
  Pencil,
  Trash2,
} from "lucide-react";
import type { FreeElement } from "@/lib/free-elements";
import { useEditor } from "./editor-context";

interface ElementRendererProps {
  element: FreeElement;
  containerRef: React.RefObject<HTMLDivElement | null>;
}

export function ElementRenderer({ element, containerRef }: ElementRendererProps) {
  const {
    isEditable,
    selectedElementId,
    setSelectedElementId,
    updateElement,
    deleteElement,
    duplicateElement,
    bringForward,
    sendBackward,
    onEditFreeElement,
  } = useEditor();

  const isSelected = isEditable && selectedElementId === element.id;
  const elementRef = useRef<HTMLDivElement>(null);

  // In non-editable mode, hide if visible === false
  if (!isEditable && element.visible === false) {
    return null;
  }

  // --- DRAG HANDLER ---
  const handleDragPointerDown = (e: React.PointerEvent) => {
    if (!isEditable) return;
    e.stopPropagation();
    e.preventDefault();
    e.currentTarget.setPointerCapture?.(e.pointerId);

    setSelectedElementId(element.id);

    const container = containerRef.current;
    if (!container) return;

    const containerRect = container.getBoundingClientRect();
    const elementRect = elementRef.current?.getBoundingClientRect();
    const startPointerX = e.screenX;
    const startPointerY = e.screenY;
    const startElemX = element.x; // in %
    const startElemY = element.y; // in px

    const handlePointerMove = (moveEvent: PointerEvent) => {
      moveEvent.preventDefault();
      const deltaPxX = moveEvent.screenX - startPointerX;
      const deltaPxY = moveEvent.screenY - startPointerY;

      // Convert deltaX into percentage based on container width
      const deltaPercentX = (deltaPxX / containerRect.width) * 100;
      const visibleWidth = elementRect?.width || Math.min(element.width, containerRect.width);
      const maxXPercent = Math.max(0, ((containerRect.width - visibleWidth) / containerRect.width) * 100);
      const newX = Math.max(0, Math.min(maxXPercent, Number((startElemX + deltaPercentX).toFixed(2))));
      const newY = Math.max(0, Math.round(startElemY + deltaPxY));

      updateElement(element.sectionId, element.id, {
        x: newX,
        y: newY,
      });
    };

    const handlePointerUp = () => {
      eventWindows.forEach((eventWindow) => {
        eventWindow.removeEventListener("pointermove", handlePointerMove);
        eventWindow.removeEventListener("pointerup", handlePointerUp);
        eventWindow.removeEventListener("pointercancel", handlePointerUp);
      });
    };

    const ownerWindow = container.ownerDocument.defaultView || window;
    const eventWindows = ownerWindow.parent && ownerWindow.parent !== ownerWindow
      ? [ownerWindow, ownerWindow.parent]
      : [ownerWindow];
    eventWindows.forEach((eventWindow) => {
      eventWindow.addEventListener("pointermove", handlePointerMove, { passive: false });
      eventWindow.addEventListener("pointerup", handlePointerUp);
      eventWindow.addEventListener("pointercancel", handlePointerUp);
    });
  };

  // --- RESIZE HANDLER ---
  const handleResizePointerDown = (
    e: React.PointerEvent,
    direction: "se" | "sw" | "ne" | "nw" | "e" | "w" | "s" | "n"
  ) => {
    if (!isEditable) return;
    e.stopPropagation();
    e.preventDefault();
    e.currentTarget.setPointerCapture?.(e.pointerId);

    const container = containerRef.current;
    if (!container) return;

    const containerRect = container.getBoundingClientRect();
    const startPointerX = e.screenX;
    const startPointerY = e.screenY;
    const startW = element.width;
    const startH = element.height;
    const startX = element.x;
    const startY = element.y;

    const handlePointerMove = (moveEvent: PointerEvent) => {
      moveEvent.preventDefault();
      const deltaPxX = moveEvent.screenX - startPointerX;
      const deltaPxY = moveEvent.screenY - startPointerY;

      let newW = startW;
      let newH = startH;
      let newX = startX;
      let newY = startY;

      if (direction.includes("e")) {
        newW = Math.min(containerRect.width, Math.max(40, Math.round(startW + deltaPxX)));
      }
      if (direction.includes("s")) {
        newH = Math.max(30, Math.round(startH + deltaPxY));
      }
      if (direction.includes("w")) {
        const potentialW = Math.min(containerRect.width, Math.max(40, Math.round(startW - deltaPxX)));
        const effectiveDelta = startW - potentialW;
        newW = potentialW;
        const deltaPercent = (effectiveDelta / containerRect.width) * 100;
        newX = Math.max(0, Number((startX + deltaPercent).toFixed(2)));
      }
      if (direction.includes("n")) {
        const potentialH = Math.max(30, Math.round(startH - deltaPxY));
        const effectiveDelta = startH - potentialH;
        newH = potentialH;
        newY = Math.max(0, Math.round(startY + effectiveDelta));
      }

      updateElement(element.sectionId, element.id, {
        width: newW,
        height: newH,
        x: newX,
        y: newY,
      });
    };

    const handlePointerUp = () => {
      eventWindows.forEach((eventWindow) => {
        eventWindow.removeEventListener("pointermove", handlePointerMove);
        eventWindow.removeEventListener("pointerup", handlePointerUp);
        eventWindow.removeEventListener("pointercancel", handlePointerUp);
      });
    };

    const ownerWindow = container.ownerDocument.defaultView || window;
    const eventWindows = ownerWindow.parent && ownerWindow.parent !== ownerWindow
      ? [ownerWindow, ownerWindow.parent]
      : [ownerWindow];
    eventWindows.forEach((eventWindow) => {
      eventWindow.addEventListener("pointermove", handlePointerMove, { passive: false });
      eventWindow.addEventListener("pointerup", handlePointerUp);
      eventWindow.addEventListener("pointercancel", handlePointerUp);
    });
  };

  // Content rendering based on type
  const renderContent = () => {
    switch (element.type) {
      case "text":
        return (
          <div
            style={{
              ...element.styles,
              width: "100%",
              height: "100%",
              whiteSpace: "pre-wrap",
              wordBreak: "break-word",
            }}
          >
            {element.content || "Texto"}
          </div>
        );

      case "button":
        return (
          <a
            href={isEditable ? undefined : element.href || "#"}
            onClick={(e) => {
              if (isEditable) {
                e.preventDefault();
              }
            }}
            style={{
              ...element.styles,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: "100%",
              height: "100%",
              textDecoration: "none",
            }}
          >
            {element.content || "Botão"}
          </a>
        );

      case "image":
        return (
          <img
            src={element.mediaUrl || "/marcar-goldko.jpg"}
            alt={element.content || "Elemento de imagem"}
            style={{
              ...element.styles,
              width: "100%",
              height: "100%",
              display: "block",
              pointerEvents: "none",
              userSelect: "none",
            }}
            loading="lazy"
          />
        );

      case "video":
        return (
          <video
            src={element.mediaUrl || "/hero-desktop-video.mp4"}
            autoPlay
            loop
            muted
            playsInline
            style={{
              ...element.styles,
              width: "100%",
              height: "100%",
              display: "block",
              objectFit: (element.styles?.objectFit as any) || "cover",
              pointerEvents: "none",
            }}
          />
        );

      case "shape":
      case "container":
      default:
        return (
          <div
            style={{
              ...element.styles,
              width: "100%",
              height: "100%",
            }}
          >
            {element.content && (
              <div className="p-3 text-sm">{element.content}</div>
            )}
          </div>
        );
    }
  };

  const typeLabels: Record<string, string> = {
    text: "Texto",
    button: "Botão",
    image: "Imagem",
    video: "Vídeo",
    shape: "Forma",
    container: "Container",
  };

  return (
    <div
      ref={elementRef}
      onClick={(e) => {
        if (!isEditable) return;
        e.stopPropagation();
        setSelectedElementId(element.id);
      }}
      onDoubleClick={(e) => {
        if (!isEditable) return;
        e.stopPropagation();
        onEditFreeElement?.(element);
      }}
      style={{
        position: "absolute",
        left: `${element.x}%`,
        top: `${element.y}px`,
        width: `${element.width}px`,
        maxWidth: "100%",
        height: `${element.height}px`,
        zIndex: element.zIndex ?? 10,
        opacity: element.opacity ?? 1,
        transform: element.rotation ? `rotate(${element.rotation}deg)` : undefined,
        cursor: isEditable ? "move" : "default",
        touchAction: isEditable ? "none" : "auto",
        pointerEvents:
          isEditable || element.type === "button" ? "auto" : "none",
      }}
      onPointerDown={handleDragPointerDown}
      className={`group/free-elem transition-shadow ${
        isEditable
          ? isSelected
            ? "ring-2 ring-[#42C8E5] ring-offset-1 shadow-2xl"
            : "hover:outline hover:outline-1 hover:outline-dashed hover:outline-[#42C8E5]/70"
          : ""
      }`}
    >
      {/* Element Content */}
      <div className="h-full w-full overflow-hidden select-none">
        {renderContent()}
      </div>

      {/* Floating Toolbar for Selected Element */}
      {isSelected && (
        <>
          {/* Badge & Toolbar */}
          <div
            onPointerDown={(e) => e.stopPropagation()}
            className="absolute -top-11 left-0 z-50 flex items-center gap-1 rounded-lg bg-[#00205C] px-2 py-1 text-white shadow-xl animate-in fade-in zoom-in-95 duration-150"
          >
            <span className="flex items-center gap-1 text-[11px] font-bold text-[#42C8E5] pr-1 border-r border-white/20">
              <GripHorizontal className="size-3 cursor-grab" onPointerDown={handleDragPointerDown} />
              {typeLabels[element.type] || "Elemento"}
            </span>

            {/* Edit Button */}
            <button
              type="button"
              onClick={() => onEditFreeElement?.(element)}
              title="Editar conteúdo e propriedades"
              className="flex items-center gap-1 rounded p-1 text-[11px] font-medium hover:bg-white/10 hover:text-[#42C8E5] transition"
            >
              <Pencil className="size-3" />
              <span>Editar</span>
            </button>

            {/* Duplicate */}
            <button
              type="button"
              onClick={() => duplicateElement(element.sectionId, element.id)}
              title="Duplicar elemento"
              className="rounded p-1 hover:bg-white/10 hover:text-white transition"
            >
              <Copy className="size-3" />
            </button>

            {/* Bring Forward */}
            <button
              type="button"
              onClick={() => bringForward(element.sectionId, element.id)}
              title="Trazer para frente"
              className="rounded p-1 hover:bg-white/10 hover:text-white transition"
            >
              <ArrowUp className="size-3" />
            </button>

            {/* Send Backward */}
            <button
              type="button"
              onClick={() => sendBackward(element.sectionId, element.id)}
              title="Enviar para trás"
              className="rounded p-1 hover:bg-white/10 hover:text-white transition"
            >
              <ArrowDown className="size-3" />
            </button>

            {/* Delete */}
            <button
              type="button"
              onClick={() => deleteElement(element.sectionId, element.id)}
              title="Excluir elemento"
              className="rounded p-1 text-red-300 hover:bg-red-500/30 hover:text-red-100 transition"
            >
              <Trash2 className="size-3" />
            </button>
          </div>

          {/* Resize Handles (8 directions) */}
          {/* Corners */}
          <div
            onPointerDown={(e) => handleResizePointerDown(e, "nw")}
            className="absolute -top-2.5 -left-2.5 size-5 rounded-full border border-[#00205C] bg-[#42C8E5] shadow cursor-nwse-resize z-50 md:-top-1.5 md:-left-1.5 md:size-3"
          />
          <div
            onPointerDown={(e) => handleResizePointerDown(e, "ne")}
            className="absolute -top-2.5 -right-2.5 size-5 rounded-full border border-[#00205C] bg-[#42C8E5] shadow cursor-nesw-resize z-50 md:-top-1.5 md:-right-1.5 md:size-3"
          />
          <div
            onPointerDown={(e) => handleResizePointerDown(e, "se")}
            className="absolute -bottom-2.5 -right-2.5 size-5 rounded-full border border-[#00205C] bg-[#42C8E5] shadow cursor-nwse-resize z-50 md:-bottom-1.5 md:-right-1.5 md:size-3"
          />
          <div
            onPointerDown={(e) => handleResizePointerDown(e, "sw")}
            className="absolute -bottom-2.5 -left-2.5 size-5 rounded-full border border-[#00205C] bg-[#42C8E5] shadow cursor-nesw-resize z-50 md:-bottom-1.5 md:-left-1.5 md:size-3"
          />

          {/* Edges */}
          <div
            onPointerDown={(e) => handleResizePointerDown(e, "n")}
            className="absolute -top-1 left-1/2 -translate-x-1/2 h-2 w-5 rounded-full border border-[#00205C] bg-[#42C8E5] shadow cursor-ns-resize z-50"
          />
          <div
            onPointerDown={(e) => handleResizePointerDown(e, "s")}
            className="absolute -bottom-1 left-1/2 -translate-x-1/2 h-2 w-5 rounded-full border border-[#00205C] bg-[#42C8E5] shadow cursor-ns-resize z-50"
          />
          <div
            onPointerDown={(e) => handleResizePointerDown(e, "w")}
            className="absolute -left-1 top-1/2 -translate-y-1/2 w-2 h-5 rounded-full border border-[#00205C] bg-[#42C8E5] shadow cursor-ew-resize z-50"
          />
          <div
            onPointerDown={(e) => handleResizePointerDown(e, "e")}
            className="absolute -right-1 top-1/2 -translate-y-1/2 w-2 h-5 rounded-full border border-[#00205C] bg-[#42C8E5] shadow cursor-ew-resize z-50"
          />
        </>
      )}
    </div>
  );
}
