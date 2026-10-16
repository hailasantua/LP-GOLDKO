import React, { createContext, useContext } from "react";
import type {
  FreeElement,
  FreeElementType,
  SectionBackground,
} from "@/lib/free-elements";

export interface EditorContextValue {
  isEditable: boolean;
  selectedElementId: string | null;
  setSelectedElementId: (id: string | null) => void;
  updateElement: (sectionId: string, elementId: string, updates: Partial<FreeElement>) => void;
  deleteElement: (sectionId: string, elementId: string) => void;
  duplicateElement: (sectionId: string, elementId: string) => void;
  bringForward: (sectionId: string, elementId: string) => void;
  sendBackward: (sectionId: string, elementId: string) => void;
  addElement: (sectionId: string, type: FreeElementType, options?: { x?: number; y?: number }) => void;
  updateSectionBackground: (sectionId: string, updates: Partial<SectionBackground>) => void;
  onOpenBackgroundModal?: (sectionId: string) => void;
  onEditFreeElement?: (element: FreeElement) => void;
  deviceMode: "desktop" | "mobile";
  setDeviceMode: (mode: "desktop" | "mobile") => void;
}

const defaultContext: EditorContextValue = {
  isEditable: false,
  selectedElementId: null,
  setSelectedElementId: () => {},
  updateElement: () => {},
  deleteElement: () => {},
  duplicateElement: () => {},
  bringForward: () => {},
  sendBackward: () => {},
  addElement: () => {},
  updateSectionBackground: () => {},
  deviceMode: "desktop",
  setDeviceMode: () => {},
};

export const EditorContext = createContext<EditorContextValue>(defaultContext);

export function useEditor() {
  return useContext(EditorContext);
}

export function EditorProvider({
  value,
  children,
}: {
  value: EditorContextValue;
  children: React.ReactNode;
}) {
  return <EditorContext.Provider value={value}>{children}</EditorContext.Provider>;
}
