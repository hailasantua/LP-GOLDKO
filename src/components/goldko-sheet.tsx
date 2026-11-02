import type { ReactNode } from "react";
import { X } from "lucide-react";

/**
 * Casca visual compartilhada dos modais da GoldKo, no estilo do cardápio online:
 * fundo bege-claro, título em etiqueta-ticket azul, botão de fechar quadrado azul
 * e ícones dentro de um selo recortado.
 */

export const GK = {
  navy: "#00205C",
  cyan: "#42C8E5",
  cream: "#FFFBF5",
  orange: "#D9772B",
};

export function GoldkoAvatar({ size = "md", ring = true }: { size?: "sm" | "md" | "lg" | "xl"; ring?: boolean }) {
  const sizes = { sm: "size-8", md: "size-11", lg: "size-14", xl: "size-24" } as const;
  return (
    <span
      className={`${sizes[size]} flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-white p-0.5 ${
        ring ? "ring-2 ring-[#42C8E5] ring-offset-2 ring-offset-[#FFFBF5]" : ""
      }`}
    >
      <img src="/chat-avatar-goldko.png" alt="Assistente GoldKo" className="h-full w-full object-contain" />
    </span>
  );
}

export function SoftPattern() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 opacity-[0.22]"
      style={{
        backgroundImage: 'url("/chat-conversation-background.png")',
        backgroundPosition: "center",
        backgroundSize: "cover",
      }}
    />
  );
}

export function GoldkoSheet({
  onBackdrop,
  maxWidth = "max-w-2xl",
  children,
}: {
  onBackdrop: () => void;
  maxWidth?: string;
  children: ReactNode;
}) {
  return (
    <div
      className="fixed inset-0 z-[210] flex items-end justify-center bg-[#001433]/70 p-0 backdrop-blur-sm sm:items-center sm:p-5"
      onClick={(event) => event.target === event.currentTarget && onBackdrop()}
    >
      <section
        className={`relative flex max-h-[100dvh] w-full ${maxWidth} flex-col overflow-hidden rounded-t-[1.5rem] bg-[#F6F5F3] text-[#0d2b40] shadow-2xl animate-in fade-in slide-in-from-bottom-4 duration-300 sm:max-h-[92dvh] sm:rounded-[1.5rem]`}
      >
        <span aria-hidden="true" className="mx-auto mt-2.5 block h-[5px] w-10 shrink-0 rounded-full bg-[#D3CEC6] sm:hidden" />
        {children}
      </section>
    </div>
  );
}

export function SheetHeader({
  eyebrow,
  title,
  intro,
  onClose,
}: {
  eyebrow: string;
  title: string;
  intro?: string;
  onClose: () => void;
}) {
  return (
    <header className="relative px-4 pb-1 pt-3 sm:px-7 sm:pt-7">
      <div className="flex items-center justify-between gap-3">
        <h2 className="gk-tag min-w-0">
          <span className="truncate">
            {eyebrow}
            <span className="sr-only"> — {title}</span>
          </span>
          <i aria-hidden="true" />
        </h2>
        <CloseButton onClick={onClose} />
      </div>
      {intro && <p className="mt-3 text-sm leading-relaxed text-[#4f4f4a] sm:text-[15px]">{intro}</p>}
    </header>
  );
}

export function CloseButton({ onClick, tone = "light" }: { onClick: () => void; tone?: "light" | "dark" }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Fechar"
      className={`flex shrink-0 items-center justify-center transition ${
        tone === "dark"
          ? "size-10 rounded-full text-white hover:bg-white/15"
          : "size-[46px] rounded-xl bg-[#51b2dc] text-[#0d2b40] hover:bg-[#6cc0e4]"
      }`}
    >
      <X className="size-5" />
    </button>
  );
}

export function SectionLabel({ children, aside }: { children: ReactNode; aside?: ReactNode }) {
  return (
    <div className="mb-2.5 flex items-center justify-between gap-3">
      <h3 className="gk-tag is-small"><span>{children}</span></h3>
      {aside && <span className="text-[13px] text-[#4f4f4a]">{aside}</span>}
    </div>
  );
}

/** Ícone dentro do selo azul recortado (mesmo das fotos do cardápio). */
export function Stamp({ children, small = false }: { children: ReactNode; small?: boolean }) {
  return (
    <span className={small ? "gk-stamp is-small" : "gk-stamp"} aria-hidden="true">
      <span>{children}</span>
    </span>
  );
}

/** Linha clicável dos modais: selo + título + texto + seta (cards brancos do cardápio). */
export const optionRowClass =
  "group flex w-full items-center gap-3.5 rounded-[14px] border border-[#D9D6D0] bg-white px-3.5 py-3 text-left transition hover:border-[#51b2dc] active:scale-[0.99]";

/** Botão principal azul do cardápio. */
export const primaryButtonClass =
  "inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#51b2dc] px-6 py-3.5 text-[15px] font-bold text-[#0d2b40] transition hover:bg-[#6cc0e4] disabled:opacity-50";
