import { type ReactNode } from "react";
import { Camera, Pencil } from "lucide-react";
import { type ElementLayout, type SiteContent } from "@/lib/site-content";

export interface HomePageProps {
  content?: SiteContent;
  pageId?: string;
  isEditable?: boolean;
  onEditField?: (path: string, label: string, value: string, type: "text" | "multiline") => void;
  onEditMedia?: (path: string, label: string, source: string) => void;
  onEditDualMedia?: (
    desktopPath: string,
    mobilePath: string,
    label: string,
    desktopSource: string,
    mobileSource: string
  ) => void;
  onEditLink?: (path: string, label: string, data: { label: string; href: string }) => void;
  onEditCard?: (path: string, label: string, data: any, schemaType?: string) => void;
  onMoveElement?: (elementId: string, layout: ElementLayout | null) => void;
  onSwapHeroVisuals?: () => void;
  onMoveNavbarElement?: (elementId: string, position: { x: number; y: number }) => void;
}

export function EditableText({
  isEditable,
  path,
  label,
  value,
  onEdit,
  children,
  className = "",
  as = "span",
}: {
  isEditable?: boolean;
  path: string;
  label: string;
  value: string;
  onEdit?: (path: string, label: string, value: string, type: "text" | "multiline") => void;
  children: ReactNode;
  className?: string;
  as?: "span" | "div";
}) {
  if (!isEditable) return <>{children}</>;
  const Tag = as;
  return (
    <Tag
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onEdit?.(path, label, value || "", value?.includes("\n") ? "multiline" : "text");
      }}
      className={`group/edit relative cursor-pointer rounded-lg transition-all hover:outline hover:outline-2 hover:outline-dashed hover:outline-[#ff8515] hover:bg-[#ff8515]/10 ${className}`}
      title={`Clique para editar: ${label}`}
    >
      {children}
      <span className="pointer-events-none absolute -top-3 -right-2 hidden rounded-full bg-[#ff8515] px-1.5 py-0.5 text-[10px] font-bold text-white shadow-md group-hover/edit:inline-flex items-center gap-1 z-30">
        <Pencil className="size-2.5" />
        Editar
      </span>
    </Tag>
  );
}

export function EditableMediaWrapper({
  isEditable,
  path,
  label,
  source,
  onEditMedia,
  children,
  className = "",
}: {
  isEditable?: boolean;
  path: string;
  label: string;
  source: string;
  onEditMedia?: (path: string, label: string, source: string) => void;
  children: ReactNode;
  className?: string;
}) {
  if (!isEditable) return <>{children}</>;
  return (
    <div
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onEditMedia?.(path, label, source);
      }}
      className={`group/media relative cursor-pointer flex items-center justify-center ${className}`}
      title={`Clique para alterar mídia: ${label}`}
    >
      {children}
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/50 opacity-0 group-hover/media:opacity-100 transition-opacity rounded-[inherit] z-20 backdrop-blur-xs">
        <span className="inline-flex items-center gap-2 rounded-full bg-[#00205C] px-5 py-2.5 text-xs font-bold uppercase text-white shadow-xl hover:bg-[#ff8515] transition-colors">
          <Camera className="size-4 text-[#42C8E5]" />
          Trocar Mídia
        </span>
        <span className="text-xs text-white/90 font-medium">{label}</span>
      </div>
    </div>
  );
}

export function EditableDualMediaWrapper({
  isEditable,
  desktopPath,
  mobilePath,
  label,
  desktopSource,
  mobileSource,
  onEditDualMedia,
  children,
  className = "",
}: {
  isEditable?: boolean;
  desktopPath: string;
  mobilePath: string;
  label: string;
  desktopSource: string;
  mobileSource: string;
  onEditDualMedia?: (
    desktopPath: string,
    mobilePath: string,
    label: string,
    desktopSource: string,
    mobileSource: string
  ) => void;
  children: ReactNode;
  className?: string;
}) {
  if (!isEditable) return <>{children}</>;
  return (
    <div
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onEditDualMedia?.(desktopPath, mobilePath, label, desktopSource, mobileSource);
      }}
      className={`group/media relative cursor-pointer flex items-center justify-center ${className}`}
      title={`Clique para alterar mídia: ${label}`}
    >
      {children}
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/50 opacity-0 group-hover/media:opacity-100 transition-opacity rounded-[inherit] z-20 backdrop-blur-xs">
        <span className="inline-flex items-center gap-2 rounded-full bg-[#00205C] px-5 py-2.5 text-xs font-bold uppercase text-white shadow-xl hover:bg-[#ff8515] transition-colors">
          <Camera className="size-4 text-[#42C8E5]" />
          Trocar Mídia
        </span>
        <span className="text-xs text-white/90 font-medium">{label}</span>
        <span className="text-[10px] text-white/70 font-medium">Desktop + Mobile (9:16)</span>
      </div>
    </div>
  );
}

export function EditableLinkWrapper({
  isEditable,
  path,
  label,
  href,
  text,
  onEditLink,
  children,
  className = "",
}: {
  isEditable?: boolean;
  path: string;
  label: string;
  href: string;
  text: string;
  onEditLink?: (path: string, label: string, data: { label: string; href: string }) => void;
  children: ReactNode;
  className?: string;
}) {
  if (!isEditable) return <>{children}</>;
  return (
    <div
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onEditLink?.(path, label, { label: text, href });
      }}
      className={`group/btn relative inline-flex cursor-pointer ${className}`}
      title={`Clique para editar botão e link: ${label}`}
    >
      {children}
      <span className="pointer-events-none absolute -top-2.5 -right-2.5 hidden rounded-full bg-[#00205C] px-1.5 py-0.5 text-[10px] font-bold text-white shadow-md group-hover/btn:inline-flex items-center gap-1 z-30">
        <Pencil className="size-2.5 text-[#42C8E5]" />
        Editar
      </span>
    </div>
  );
}

export function EditableCardWrapper({
  isEditable,
  path,
  label,
  data,
  schemaType,
  onEditCard,
  children,
  className = "",
}: {
  isEditable?: boolean;
  path: string;
  label: string;
  data: any;
  schemaType?: string;
  onEditCard?: (path: string, label: string, data: any, schemaType?: string) => void;
  children: ReactNode;
  className?: string;
}) {
  if (!isEditable) return <>{children}</>;
  return (
    <div
      onClick={(e) => {
        if (e.defaultPrevented) return;
        e.preventDefault();
        e.stopPropagation();
        onEditCard?.(path, label, data, schemaType);
      }}
      className={`group/card relative cursor-pointer transition-all hover:ring-3 hover:ring-[#ff8515] hover:ring-offset-2 ${className}`}
      title={`Clique para editar: ${label}`}
    >
      {children}
      <span className="pointer-events-none absolute top-3 right-3 hidden rounded-full bg-[#00205C] px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-white shadow-xl group-hover/card:inline-flex items-center gap-1.5 z-30">
        <Pencil className="size-3 text-[#42C8E5]" />
        Editar Card
      </span>
    </div>
  );
}
