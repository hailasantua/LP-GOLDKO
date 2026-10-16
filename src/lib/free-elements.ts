export type FreeElementType = "text" | "image" | "video" | "button" | "shape" | "container";

export type FreeElement = {
  id: string;
  type: FreeElementType;
  sectionId: string;
  content?: string;
  mediaUrl?: string;
  href?: string;
  x: number; // percentage (0 - 100)
  y: number; // px from top of section
  width: number; // px
  height: number; // px
  rotation?: number; // degrees
  zIndex?: number;
  opacity?: number;
  visible?: boolean;
  styles?: Record<string, string>;
  desktop?: Partial<Pick<FreeElement, "x" | "y" | "width" | "height">>;
  mobile?: Partial<Pick<FreeElement, "x" | "y" | "width" | "height">>;
};

export type SectionBackground = {
  backgroundColor?: string;
  backgroundImage?: string;
  backgroundSize?: "cover" | "contain" | "auto";
  backgroundPosition?: string;
  overlayOpacity?: number;
};

export type SectionElementsMap = Record<string, FreeElement[]>;
export type SectionBackgroundsMap = Record<string, SectionBackground>;

export function generateElementId(prefix = "el"): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 6)}`;
}

export function createDefaultFreeElement(
  sectionId: string,
  type: FreeElementType,
  options?: { x?: number; y?: number }
): FreeElement {
  const id = generateElementId(type);
  const x = options?.x ?? 20; // default 20%
  const y = options?.y ?? 60; // default 60px

  switch (type) {
    case "text":
      return {
        id,
        type: "text",
        sectionId,
        content: "Clique duas vezes ou no botão editar para alterar este texto.",
        x,
        y,
        width: 320,
        height: 70,
        zIndex: 10,
        styles: {
          color: "#151515",
          fontSize: "18px",
          fontWeight: "600",
          lineHeight: "1.4",
        },
      };

    case "button":
      return {
        id,
        type: "button",
        sectionId,
        content: "Clique Aqui",
        href: "#",
        x,
        y,
        width: 190,
        height: 50,
        zIndex: 10,
        styles: {
          backgroundColor: "#ff8515",
          color: "#ffffff",
          borderRadius: "9999px",
          fontSize: "14px",
          fontWeight: "700",
          textAlign: "center",
          boxShadow: "0 4px 14px 0 rgba(255, 133, 21, 0.39)",
        },
      };

    case "image":
      return {
        id,
        type: "image",
        sectionId,
        mediaUrl: "/marcar-goldko.jpg",
        content: "Imagem",
        x,
        y,
        width: 280,
        height: 200,
        zIndex: 10,
        styles: {
          borderRadius: "16px",
          objectFit: "cover",
        },
      };

    case "video":
      return {
        id,
        type: "video",
        sectionId,
        mediaUrl: "/hero-desktop-video.mp4",
        content: "Vídeo",
        x,
        y,
        width: 320,
        height: 220,
        zIndex: 10,
        styles: {
          borderRadius: "16px",
          objectFit: "cover",
        },
      };

    case "shape":
      return {
        id,
        type: "shape",
        sectionId,
        x,
        y,
        width: 180,
        height: 180,
        zIndex: 5,
        styles: {
          backgroundColor: "#00205C",
          borderRadius: "16px",
        },
      };

    case "container":
      return {
        id,
        type: "container",
        sectionId,
        x,
        y,
        width: 380,
        height: 220,
        zIndex: 5,
        styles: {
          backgroundColor: "#ffffff",
          borderRadius: "20px",
          border: "1px solid #e5e7eb",
          boxShadow: "0 10px 25px -5px rgba(0,0,0,0.08)",
        },
      };
  }
}
