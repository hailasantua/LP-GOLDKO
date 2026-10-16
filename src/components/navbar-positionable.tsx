import { useRef, type PointerEvent as ReactPointerEvent, type ReactNode } from "react";
import { Move } from "lucide-react";

export function NavbarPositionable({
  id,
  label,
  isEditable,
  position,
  onChange,
  children,
  className = "",
}: {
  id: string;
  label: string;
  isEditable?: boolean;
  position?: { x: number; y: number };
  onChange?: (elementId: string, position: { x: number; y: number }) => void;
  children: ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);

  function beginDrag(event: ReactPointerEvent<HTMLButtonElement>) {
    if (!isEditable || !onChange || !ref.current) return;
    event.preventDefault();
    event.stopPropagation();

    const startX = event.clientX;
    const startY = event.clientY;
    const initial = position || { x: 0, y: 0 };
    const ownerWindow = ref.current.ownerDocument.defaultView || window;

    const move = (moveEvent: PointerEvent) => {
      onChange(id, {
        x: initial.x + moveEvent.clientX - startX,
        y: Math.max(-22, Math.min(22, initial.y + moveEvent.clientY - startY)),
      });
    };
    const finish = () => {
      ownerWindow.removeEventListener("pointermove", move);
      ownerWindow.removeEventListener("pointerup", finish);
    };

    ownerWindow.addEventListener("pointermove", move);
    ownerWindow.addEventListener("pointerup", finish, { once: true });
  }

  return (
    <div
      ref={ref}
      style={{ transform: `translate(${position?.x || 0}px, ${position?.y || 0}px)` }}
      className={`group/navbar-item relative ${className}`}
    >
      {children}
      {isEditable && (
        <button
          type="button"
          onPointerDown={beginDrag}
          className="absolute -bottom-7 left-1/2 z-[80] inline-flex -translate-x-1/2 cursor-grab items-center gap-1 rounded-full bg-[#00205C] px-2.5 py-1 text-[10px] font-bold text-white opacity-0 shadow-lg transition-opacity group-hover/navbar-item:opacity-100 active:cursor-grabbing"
          title={`Mover ${label}`}
        >
          <Move className="size-3 text-[#42C8E5]" />
          Mover
        </button>
      )}
    </div>
  );
}
