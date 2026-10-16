import type { ReactNode } from "react";
import { X } from "lucide-react";

/**
 * Casca visual compartilhada do chat e dos modais da GoldKo:
 * fundo creme com ilustração suave, personagem no topo, título curto e botão de fechar visível.
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
        className={`relative flex max-h-[100dvh] w-full ${maxWidth} flex-col overflow-hidden rounded-t-[1.75rem] bg-[#FFFBF5] shadow-2xl animate-in fade-in slide-in-from-bottom-4 duration-300 sm:max-h-[92dvh] sm:rounded-[1.75rem]`}
      >
        <SoftPattern />
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
    <header className="relative flex items-start gap-4 px-5 pb-2 pt-6 sm:px-8 sm:pt-8">
      <GoldkoAvatar size="lg" />
      <div className="min-w-0 flex-1 pr-2">
        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#D9772B]">{eyebrow}</p>
        <h2 className="mt-1 font-display text-2xl font-bold uppercase leading-[1.05] text-[#00205C] sm:text-3xl">{title}</h2>
        {intro && <p className="mt-1.5 text-sm leading-relaxed text-[#4A5672] sm:text-[15px]">{intro}</p>}
      </div>
      <CloseButton onClick={onClose} />
    </header>
  );
}

export function CloseButton({ onClick, tone = "light" }: { onClick: () => void; tone?: "light" | "dark" }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Fechar"
      className={`flex size-10 shrink-0 items-center justify-center rounded-full transition ${
        tone === "dark"
          ? "text-white hover:bg-white/15"
          : "bg-white text-[#00205C] ring-1 ring-[#00205C]/10 hover:bg-[#E7F7FB]"
      }`}
    >
      <X className="size-5" />
    </button>
  );
}

export function SectionLabel({ children }: { children: ReactNode }) {
  return <h3 className="mb-2.5 text-xs font-bold uppercase tracking-[0.14em] text-[#00205C]/60">{children}</h3>;
}
