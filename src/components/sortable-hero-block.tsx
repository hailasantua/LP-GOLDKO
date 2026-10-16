import { type DragEvent, type ReactNode } from "react";
import { GripVertical } from "lucide-react";

export function SortableHeroBlock({
  id,
  label,
  isEditable,
  onSwap,
  children,
  className = "",
}: {
  id: "heading" | "media";
  label: string;
  isEditable?: boolean;
  onSwap?: () => void;
  children: ReactNode;
  className?: string;
}) {
  function handleDragStart(event: DragEvent<HTMLDivElement>) {
    event.dataTransfer.setData("application/x-goldko-hero", id);
    event.dataTransfer.effectAllowed = "move";
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    const source = event.dataTransfer.getData("application/x-goldko-hero");
    if (!source || source === id) return;
    event.preventDefault();
    event.stopPropagation();
    onSwap?.();
  }

  return (
    <div
      draggable={Boolean(isEditable)}
      onDragStart={handleDragStart}
      onDragOver={(event) => {
        if (!isEditable) return;
        event.preventDefault();
        event.dataTransfer.dropEffect = "move";
      }}
      onDrop={handleDrop}
      className={`group/sortable relative ${isEditable ? "cursor-grab active:cursor-grabbing" : ""} ${className}`}
    >
      {children}
      {isEditable && (
        <div className="pointer-events-none absolute -top-9 left-1/2 z-[70] inline-flex -translate-x-1/2 items-center gap-1 rounded-full bg-[#00205C] px-3 py-1.5 text-[11px] font-bold text-white opacity-0 shadow-xl transition-opacity group-hover/sortable:opacity-100">
          <GripVertical className="size-3 text-[#42C8E5]" />
          Arraste para trocar {label}
        </div>
      )}
    </div>
  );
}
