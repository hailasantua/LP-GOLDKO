import { useRef, type PointerEvent as ReactPointerEvent, type ReactNode } from "react";
import { Move, RotateCcw } from "lucide-react";
import type { ElementLayout } from "@/lib/site-content";

export function PositionableElement({
  id,
  label,
  isEditable,
  layout,
  onChange,
  children,
  className = "",
}: {
  id: string;
  label: string;
  isEditable?: boolean;
  layout?: ElementLayout | null;
  onChange?: (elementId: string, layout: ElementLayout | null) => void;
  children: ReactNode;
  className?: string;
}) {
  const elementRef = useRef<HTMLDivElement>(null);

  function beginDrag(event: ReactPointerEvent<HTMLButtonElement>) {
    if (!isEditable || !elementRef.current || !onChange) return;
    event.preventDefault();
    event.stopPropagation();

    const element = elementRef.current;
    const section = element.closest("section");
    if (!section) return;

    const elementRect = element.getBoundingClientRect();
    const sectionRect = section.getBoundingClientRect();
    const startX = event.clientX;
    const startY = event.clientY;
    const initial: ElementLayout = layout || {
      x: elementRect.left - sectionRect.left,
      y: elementRect.top - sectionRect.top,
      width: elementRect.width,
      zIndex: 30,
    };
    const ownerWindow = element.ownerDocument.defaultView || window;

    onChange(id, initial);

    const handleMove = (moveEvent: PointerEvent) => {
      const maxX = Math.max(0, sectionRect.width - initial.width);
      onChange(id, {
        ...initial,
        x: Math.min(maxX, Math.max(0, initial.x + moveEvent.clientX - startX)),
        y: Math.max(0, initial.y + moveEvent.clientY - startY),
      });
    };

    const finish = () => {
      ownerWindow.removeEventListener("pointermove", handleMove);
      ownerWindow.removeEventListener("pointerup", finish);
    };

    ownerWindow.addEventListener("pointermove", handleMove);
    ownerWindow.addEventListener("pointerup", finish, { once: true });
  }

  return (
    <div
      ref={elementRef}
      data-positionable={id}
      style={
        layout
          ? {
              position: "absolute",
              left: `${layout.x}px`,
              top: `${layout.y}px`,
              width: `${layout.width}px`,
              zIndex: layout.zIndex ?? 30,
            }
          : undefined
      }
      className={`group/positionable ${layout ? "" : "relative"} ${className}`}
    >
      {children}
      {isEditable && (
        <div className="absolute -top-10 left-0 z-[70] flex items-center gap-1 rounded-full bg-[#00205C] p-1 text-white opacity-0 shadow-xl transition-opacity group-hover/positionable:opacity-100">
          <button
            type="button"
            onPointerDown={beginDrag}
            className="inline-flex cursor-grab items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold active:cursor-grabbing"
            title={`Arrastar ${label}`}
          >
            <Move className="size-3" />
            Mover
          </button>
          {layout && (
            <button
              type="button"
              onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                onChange?.(id, null);
              }}
              className="rounded-full p-1.5 hover:bg-white/15"
              title="Voltar à posição original"
            >
              <RotateCcw className="size-3" />
            </button>
          )}
        </div>
      )}
    </div>
  );
}
