import { useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import type { User } from "@supabase/supabase-js";
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Check,
  ExternalLink,
  Eye,
  EyeOff,
  Globe,
  Loader2,
  LogOut,
  Monitor,
  Pencil,
  Plus,
  RotateCcw,
  Save,
  Sparkles,
  Smartphone,
  Trash2,
  UploadCloud,
  X,
} from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import {
  createBlankSiteContent,
  defaultSiteContent,
  mergeSiteContent,
  type SiteContent,
} from "@/lib/site-content";
import { HomePage } from "./home-page";
import { MediaUploadField } from "./media-upload-field";
import { createPageServerFn, deletePageServerFn, upsertPageServerFn } from "@/lib/pages.functions";
import { EditorProvider, type EditorContextValue } from "./editor-context";
import { FreeElementModal } from "./free-element-modal";
import { SectionBackgroundModal } from "./section-background-modal";
import {
  createDefaultFreeElement,
  generateElementId,
  type FreeElement,
  type FreeElementType,
  type SectionBackground,
} from "@/lib/free-elements";

function DevicePreview({ mode, children }: { mode: "desktop" | "mobile"; children: ReactNode }) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [mobileRoot, setMobileRoot] = useState<HTMLElement | null>(null);

  useEffect(() => {
    if (mode !== "mobile") {
      setMobileRoot(null);
      return;
    }

    const frame = iframeRef.current;
    const doc = frame?.contentDocument;
    if (!doc) return;

    const syncFrame = () => {
      const frameDocument = frame.contentDocument;
      if (!frameDocument) return;

      frameDocument.head.querySelectorAll("[data-editor-style]").forEach((node) => node.remove());
      document.querySelectorAll('link[rel="stylesheet"], style').forEach((node) => {
        const clone = node.cloneNode(true) as HTMLElement;
        clone.setAttribute("data-editor-style", "true");
        frameDocument.head.appendChild(clone);
      });

      frameDocument.documentElement.style.background = "white";
      frameDocument.body.style.margin = "0";
      frameDocument.body.style.background = "white";
      setMobileRoot(frameDocument.getElementById("mobile-editor-root"));
    };

    syncFrame();
  }, [mode]);

  if (mode === "desktop") return <>{children}</>;

  return (
    <div className="flex h-[calc(100vh-4rem)] min-h-[720px] justify-center overflow-hidden bg-slate-200 p-4 md:p-7">
      <div className="h-full w-[393px] max-w-full overflow-hidden rounded-[32px] border-[6px] border-slate-800 bg-white shadow-2xl">
        <iframe
          ref={iframeRef}
          title="Prévia mobile — iPhone 15"
          srcDoc={'<!doctype html><html><head><meta name="viewport" content="width=device-width, initial-scale=1" /></head><body><div id="mobile-editor-root"></div></body></html>'}
          onLoad={() => {
            const frameDocument = iframeRef.current?.contentDocument;
            if (!frameDocument) return;
            document.querySelectorAll('link[rel="stylesheet"], style').forEach((node) => {
              const clone = node.cloneNode(true) as HTMLElement;
              clone.setAttribute("data-editor-style", "true");
              frameDocument.head.appendChild(clone);
            });
            frameDocument.body.style.margin = "0";
            frameDocument.body.style.background = "white";
            setMobileRoot(frameDocument.getElementById("mobile-editor-root"));
          }}
          className="h-full w-full border-0 bg-white"
        />
      </div>
      {mobileRoot && createPortal(children, mobileRoot)}
    </div>
  );
}

function contentWithoutDeviceVersions(content: SiteContent): SiteContent {
  const { deviceVersions: _deviceVersions, ...version } = content;
  return version as SiteContent;
}
import { JourneyAnalytics } from "./journey-analytics";
import { LeadsPanel } from "./leads-panel";

function isAdmin(user: User | null) {
  return user?.app_metadata?.["role"] === "admin" || user?.email === "goldkorv@gmail.com";
}

function isVideo(source: string) {
  return /\.(mp4|webm|mov)(\?|$)/i.test(source);
}

function setByPath(obj: any, path: string, value: any): any {
  const parts = path.split(".");
  const newObj = Array.isArray(obj) ? [...obj] : { ...obj };
  let current: any = newObj;
  for (let i = 0; i < parts.length - 1; i++) {
    const part = parts[i]!;
    const nextKey = isNaN(Number(parts[i + 1])) ? {} : [];
    current[part] = Array.isArray(current[part])
      ? [...current[part]]
      : typeof current[part] === "object" && current[part] !== null
        ? { ...current[part] }
        : nextKey;
    current = current[part];
  }
  current[parts[parts.length - 1]!] = value;
  return newObj;
}

type ActiveModal =
  | { type: "text" | "multiline"; path: string; label: string; value: string }
  | { type: "media"; path: string; label: string; source: string }
  | {
      type: "dual-media";
      desktopPath: string;
      mobilePath: string;
      label: string;
      desktopSource: string;
      mobileSource: string;
    }
  | { type: "link"; path: string; label: string; data: { label: string; href: string } }
  | { type: "card"; path: string; label: string; data: any; schemaType?: string }
  | null;

interface PageItem {
  id: string;
  title: string;
  image?: string;
  updatedAt?: string;
}

export function ContentPanel() {
  const [user, setUser] = useState<User | null>(null);
  const [checking, setChecking] = useState(true);
  const [email, setEmail] = useState("goldkorv@gmail.com");
  const [password, setPassword] = useState("");
  const [authError, setAuthError] = useState("");

  // Gerenciamento de páginas
  const [currentPageId, setCurrentPageId] = useState<string | null>(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      return params.get("p") || params.get("page") || null;
    }
    return null;
  });

  // Aba ativa no painel administrativo.
  const [adminTab, setAdminTab] = useState<"pages" | "journey" | "leads">(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      if (params.get("tab") === "journey") return "journey";
      if (params.get("tab") === "leads") return "leads";
    }
    return "pages";
  });
  const [pagesList, setPagesList] = useState<PageItem[]>([]);
  const [loadingPages, setLoadingPages] = useState(false);
  const [loadingCurrentPage, setLoadingCurrentPage] = useState(false);

  // Modal para criar nova página
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newPageTitle, setNewPageTitle] = useState("");
  const [newPageSlug, setNewPageSlug] = useState("");
  const [creatingPage, setCreatingPage] = useState(false);
  const [createError, setCreateError] = useState("");

  // Conteúdo independente para cada tamanho de tela.
  const [deviceContents, setDeviceContents] = useState<Record<"desktop" | "mobile", SiteContent>>({
    desktop: defaultSiteContent,
    mobile: defaultSiteContent,
  });
  const [savedDeviceContents, setSavedDeviceContents] = useState<Record<"desktop" | "mobile", SiteContent>>({
    desktop: defaultSiteContent,
    mobile: defaultSiteContent,
  });

  const [isEditMode, setIsEditMode] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const [activeModal, setActiveModal] = useState<ActiveModal>(null);

  // Estados e controle para Elementos Visuais Livres
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null);
  const [activeFreeElementModal, setActiveFreeElementModal] = useState<FreeElement | null>(null);
  const [activeBgModalSectionId, setActiveBgModalSectionId] = useState<string | null>(null);
  const [deviceMode, setDeviceMode] = useState<"desktop" | "mobile">("desktop");

  const content = deviceContents[deviceMode];
  const savedContent = savedDeviceContents[deviceMode];

  function setContent(
    update: SiteContent | ((previous: SiteContent) => SiteContent),
  ) {
    setDeviceContents((previous) => {
      const current = previous[deviceMode];
      const next = typeof update === "function" ? update(current) : update;
      return { ...previous, [deviceMode]: next };
    });
  }

  function updateElement(sectionId: string, elementId: string, updates: Partial<FreeElement>) {
    setContent((prev) => {
      const currentList = prev.sectionElements?.[sectionId] || [];
      const updatedList = currentList.map((elem) =>
        elem.id === elementId ? { ...elem, ...updates } : elem
      );
      return {
        ...prev,
        sectionElements: {
          ...prev.sectionElements,
          [sectionId]: updatedList,
        },
      };
    });
  }

  function deleteElement(sectionId: string, elementId: string) {
    setContent((prev) => {
      const currentList = prev.sectionElements?.[sectionId] || [];
      const updatedList = currentList.filter((elem) => elem.id !== elementId);
      return {
        ...prev,
        sectionElements: {
          ...prev.sectionElements,
          [sectionId]: updatedList,
        },
      };
    });
    if (selectedElementId === elementId) {
      setSelectedElementId(null);
    }
  }

  function duplicateElement(sectionId: string, elementId: string) {
    setContent((prev) => {
      const currentList = prev.sectionElements?.[sectionId] || [];
      const target = currentList.find((elem) => elem.id === elementId);
      if (!target) return prev;

      const newElem: FreeElement = {
        ...target,
        id: generateElementId(target.type),
        x: Math.min(90, target.x + 3),
        y: target.y + 20,
        zIndex: (target.zIndex ?? 10) + 1,
      };

      setSelectedElementId(newElem.id);

      return {
        ...prev,
        sectionElements: {
          ...prev.sectionElements,
          [sectionId]: [...currentList, newElem],
        },
      };
    });
  }

  function bringForward(sectionId: string, elementId: string) {
    setContent((prev) => {
      const currentList = prev.sectionElements?.[sectionId] || [];
      const updatedList = currentList.map((elem) =>
        elem.id === elementId ? { ...elem, zIndex: (elem.zIndex ?? 10) + 1 } : elem
      );
      return {
        ...prev,
        sectionElements: {
          ...prev.sectionElements,
          [sectionId]: updatedList,
        },
      };
    });
  }

  function sendBackward(sectionId: string, elementId: string) {
    setContent((prev) => {
      const currentList = prev.sectionElements?.[sectionId] || [];
      const updatedList = currentList.map((elem) =>
        elem.id === elementId ? { ...elem, zIndex: Math.max(1, (elem.zIndex ?? 10) - 1) } : elem
      );
      return {
        ...prev,
        sectionElements: {
          ...prev.sectionElements,
          [sectionId]: updatedList,
        },
      };
    });
  }

  function addElement(sectionId: string, type: FreeElementType, options?: { x?: number; y?: number }) {
    const newElement = createDefaultFreeElement(sectionId, type, options);
    setContent((prev) => {
      const currentList = prev.sectionElements?.[sectionId] || [];
      return {
        ...prev,
        sectionElements: {
          ...prev.sectionElements,
          [sectionId]: [...currentList, newElement],
        },
      };
    });
    setSelectedElementId(newElement.id);
  }

  function updateSectionBackground(sectionId: string, updates: Partial<SectionBackground>) {
    setContent((prev) => {
      const currentBg = prev.sectionBackgrounds?.[sectionId] || {};
      return {
        ...prev,
        sectionBackgrounds: {
          ...prev.sectionBackgrounds,
          [sectionId]: { ...currentBg, ...updates },
        },
      };
    });
  }

  const editorContextValue: EditorContextValue = {
    isEditable: isEditMode,
    selectedElementId,
    setSelectedElementId,
    updateElement,
    deleteElement,
    duplicateElement,
    bringForward,
    sendBackward,
    addElement,
    updateSectionBackground,
    onOpenBackgroundModal: (sectionId) => setActiveBgModalSectionId(sectionId),
    onEditFreeElement: (elem) => setActiveFreeElementModal(elem),
    deviceMode,
    setDeviceMode,
  };

  // Autenticação inicial
  useEffect(() => {
    void supabase.auth.getSession().then(({ data }) => {
      setUser(data.session?.user ?? null);
      setChecking(false);
    });
    const { data } = supabase.auth.onAuthStateChange((_event, session) =>
      setUser(session?.user ?? null),
    );
    return () => data.subscription.unsubscribe();
  }, []);

  // Carrega lista de todas as páginas
  async function loadPages() {
    setLoadingPages(true);
    const { data, error } = await supabase
      .from("site_content")
      .select("id, content, updated_at")
      .order("updated_at", { ascending: false });

    setLoadingPages(false);

    if (error) {
      console.warn("Erro ao buscar páginas:", error.message);
      setPagesList([
        {
          id: "main",
          title: "Página Principal (Home)",
          image: "/marcar-goldko.jpg",
          updatedAt: new Date().toISOString(),
        },
      ]);
      return;
    }

    const list: PageItem[] = (data || []).map((row: any) => {
      const raw = row.content || {};
      const title =
        row.id === "main"
          ? "Página Principal"
          : raw?.meta?.title || raw?.hero?.title || row.id;

      let img = raw?.meta?.thumbnail || "";
      if (!img && raw?.hero?.desktopVideo && !isVideo(raw?.hero?.desktopVideo)) {
        img = raw?.hero?.desktopVideo;
      }
      if (!img && raw?.menu?.image && !isVideo(raw?.menu?.image)) {
        img = raw?.menu?.image;
      }
      if (!img && raw?.business?.image && !isVideo(raw?.business?.image)) {
        img = raw?.business?.image;
      }
      if (!img && raw?.about?.image && !isVideo(raw?.about?.image)) {
        img = raw?.about?.image;
      }

      return {
        id: row.id,
        title,
        image: img,
        updatedAt: row.updated_at,
      };
    });

    // Garante que 'main' existe e é a primeira da lista
    const mainIdx = list.findIndex((p) => p.id === "main");
    if (mainIdx > -1) {
      const [mainItem] = list.splice(mainIdx, 1);
      list.unshift(mainItem);
    } else {
      list.unshift({
        id: "main",
        title: "Página Principal",
        image: "/marcar-goldko.jpg",
        updatedAt: new Date().toISOString(),
      });
    }

    setPagesList(list);
  }

  // Carrega conteúdo da página ativa
  async function loadPageContent(pageId: string) {
    setLoadingCurrentPage(true);
    const { data, error } = await supabase
      .from("site_content")
      .select("content")
      .eq("id", pageId)
      .maybeSingle();

    setLoadingCurrentPage(false);

    if (error || !data?.content) {
      const initial =
        pageId === "main"
          ? defaultSiteContent
          : createBlankSiteContent(pageId);
      const initialVersions = { desktop: initial, mobile: initial };
      setDeviceContents(initialVersions);
      setSavedDeviceContents(initialVersions);
    } else {
      const loaded = mergeSiteContent(data.content);
      const base = contentWithoutDeviceVersions(loaded);
      const desktop = loaded.deviceVersions?.desktop
        ? contentWithoutDeviceVersions(mergeSiteContent(loaded.deviceVersions.desktop))
        : base;
      const mobile = loaded.deviceVersions?.mobile
        ? contentWithoutDeviceVersions(mergeSiteContent(loaded.deviceVersions.mobile))
        : base;
      const loadedVersions = { desktop, mobile };
      setDeviceContents(loadedVersions);
      setSavedDeviceContents(loadedVersions);
    }
  }

  useEffect(() => {
    if (!isAdmin(user)) return;
    void loadPages();
  }, [user]);

  useEffect(() => {
    if (!isAdmin(user) || !currentPageId) return;
    void loadPageContent(currentPageId);
  }, [user, currentPageId]);

  async function signIn(event: React.FormEvent) {
    event.preventDefault();
    setAuthError("");
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) setAuthError("Não foi possível entrar. Verifique seu e-mail e sua senha.");
  }

  const hasChanges = JSON.stringify(deviceContents) !== JSON.stringify(savedDeviceContents);

  function updateField(path: string, value: any) {
    setContent((prev) => setByPath(prev, path, value));
  }

  // Selecionar página no dashboard e abrir editor
  function selectPage(pageId: string) {
    setCurrentPageId(pageId);
    if (typeof window !== "undefined") {
      window.history.pushState(
        null,
        "",
        pageId === "main" ? "/painel" : `/painel?p=${pageId}`,
      );
    }
  }

  // Voltar para a lista de páginas
  function handleBackToPages() {
    if (
      hasChanges &&
      !window.confirm(
        "Você tem alterações não salvas. Deseja realmente voltar para a lista de páginas?",
      )
    ) {
      return;
    }
    setCurrentPageId(null);
    if (typeof window !== "undefined") {
      window.history.pushState(null, "", "/painel");
    }
    void loadPages();
  }

  async function handleSave() {
    if (!user || !isAdmin(user) || !currentPageId) return;

    const applyToBoth = window.confirm(
      `Deseja salvar as alterações da versão ${deviceMode === "mobile" ? "MOBILE" : "DESKTOP"} também na outra versão?\n\nOK = salvar em desktop e mobile\nCancelar = salvar somente nesta versão`,
    );

    setSaving(true);
    setSaveSuccess(false);
    setErrorMessage("");

    try {
      const nextVersions = applyToBoth
        ? { desktop: content, mobile: content }
        : deviceContents;
      const persistedContent: SiteContent = {
        ...nextVersions.desktop,
        deviceVersions: {
          desktop: contentWithoutDeviceVersions(nextVersions.desktop),
          mobile: contentWithoutDeviceVersions(nextVersions.mobile),
        },
      };

      await upsertPageServerFn({
        data: { id: currentPageId, content: persistedContent, updatedBy: user.id },
      });
      setSaving(false);
      setDeviceContents(nextVersions);
      setSavedDeviceContents(nextVersions);
      setSaveSuccess(true);
      window.setTimeout(() => setSaveSuccess(false), 4000);
      void loadPages();
    } catch (err: any) {
      setSaving(false);
      setErrorMessage(`Erro ao salvar: ${err?.message || String(err)}`);
    }
  }

  function handleDiscard() {
    if (window.confirm("Deseja realmente descartar todas as alterações não salvas?")) {
      setDeviceContents(savedDeviceContents);
      setActiveModal(null);
    }
  }

  // Criação de nova página
  function handleNewTitleChange(val: string) {
    setNewPageTitle(val);
    const slug = val
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
    setNewPageSlug(slug);
  }

  async function handleCreatePage(e: React.FormEvent) {
    e.preventDefault();
    const slug = newPageSlug.trim().toLowerCase();
    const title = newPageTitle.trim() || "Nova Página";

    if (!slug) {
      setCreateError("Informe um identificador (slug) válido.");
      return;
    }

    if (pagesList.some((p) => p.id === slug)) {
      setCreateError("Já existe uma página com este identificador. Escolha outro.");
      return;
    }

    setCreatingPage(true);
    setCreateError("");

    const blank = createBlankSiteContent(title);
    blank.meta = { title };

    try {
      await createPageServerFn({ data: { id: slug, content: blank, updatedBy: user?.id } });
    } catch (err: any) {
      setCreatingPage(false);
      setCreateError(`Erro ao criar: ${err?.message || String(err)}`);
      return;
    }

    setCreatingPage(false);

    setIsCreateModalOpen(false);
    setNewPageTitle("");
    setNewPageSlug("");

    // Abre imediatamente o editor da nova página
    const blankVersions = { desktop: blank, mobile: blank };
    setDeviceContents(blankVersions);
    setSavedDeviceContents(blankVersions);
    selectPage(slug);
    void loadPages();
  }

  async function handleDeletePage(page: PageItem, e: React.MouseEvent) {
    e.stopPropagation();
    if (page.id === "main") {
      alert("A página principal não pode ser excluída.");
      return;
    }
    if (
      !window.confirm(
        `Tem certeza de que deseja excluir a página "${page.title}" (${page.id})? Esta ação não pode ser desfeita.`,
      )
    ) {
      return;
    }

    try {
      await deletePageServerFn({ data: { id: page.id } });
      void loadPages();
    } catch (err: any) {
      alert(`Erro ao excluir página: ${err?.message || String(err)}`);
    }
  }

  if (checking) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <Loader2 className="size-8 animate-spin text-[#00205C]" />
      </div>
    );
  }

  // TELA DE LOGIN
  if (!user || !isAdmin(user)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f8fafc] px-4">
        <div className="w-full max-w-md rounded-3xl border border-gray-100 bg-white p-8 shadow-xl">
          <div className="text-center">
            <h1 className="font-display text-3xl font-bold uppercase tracking-wide text-[#00205C]">
              GoldKo <span className="text-[#ff8515]">Painel</span>
            </h1>
            <p className="mt-2 text-sm text-gray-500">
              Faça login com a conta de administrador para acessar o Editor Visual.
            </p>
          </div>

          <form onSubmit={signIn} className="mt-8 space-y-4">
            <div>
              <label className="text-xs font-bold uppercase text-gray-600">E-mail</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1.5 w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-[#00205C]"
              />
            </div>
            <div>
              <label className="text-xs font-bold uppercase text-gray-600">Senha</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1.5 w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-[#00205C]"
              />
            </div>

            {authError && (
              <p className="text-xs font-semibold text-red-600">{authError}</p>
            )}

            <button
              type="submit"
              className="mt-2 w-full rounded-xl bg-[#00205C] py-3.5 text-sm font-bold uppercase text-white shadow-md transition hover:bg-[#001742]"
            >
              Entrar no Painel
            </button>
          </form>
        </div>
      </div>
    );
  }

  // TELA ANTERIOR: DASHBOARD DE PÁGINAS (ESTILO DA IMAGEM DE REFERÊNCIA)
  if (!currentPageId) {
    return (
      <div className="min-h-screen bg-[#F8F8F8] text-gray-900">
        {/* TOPBAR DO DASHBOARD */}
        <header className="sticky top-0 z-40 flex h-16 items-center justify-between border-b border-gray-200 bg-white/90 px-4 backdrop-blur-md md:px-8">
          <div className="flex items-center gap-3 sm:gap-6">
            <span className="font-display text-lg font-bold uppercase tracking-wide text-[#00205C]">
              GoldKo <span className="text-[#ff8515]">Painel</span>
            </span>

            {/* ABAS DE NAVEGAÇÃO DO PAINEL */}
            <nav className="flex items-center rounded-full bg-gray-100 p-1 border border-gray-200/80">
              <button
                type="button"
                onClick={() => { setAdminTab("journey"); window.history.pushState(null, "", "/painel?tab=journey"); }}
                className={`inline-flex items-center gap-1.5 rounded-full px-3 sm:px-4 py-1.5 text-xs font-bold transition ${adminTab === "journey" ? "bg-[#42C8E5] text-[#00205C] shadow-xs" : "text-gray-500 hover:text-gray-900"}`}
              >Jornada</button>
              <button
                type="button"
                onClick={() => { setAdminTab("leads"); window.history.pushState(null, "", "/painel?tab=leads"); }}
                className={`inline-flex items-center gap-1.5 rounded-full px-3 sm:px-4 py-1.5 text-xs font-bold transition ${adminTab === "leads" ? "bg-[#42C8E5] text-[#00205C] shadow-xs" : "text-gray-500 hover:text-gray-900"}`}
              >Leads</button>
              <button
                type="button"
                onClick={() => {
                  setAdminTab("pages");
                  if (typeof window !== "undefined") {
                    window.history.pushState(null, "", "/painel");
                  }
                }}
                className={`inline-flex items-center gap-1.5 rounded-full px-3 sm:px-4 py-1.5 text-xs font-bold transition ${
                  adminTab === "pages"
                    ? "bg-white text-[#00205C] shadow-xs"
                    : "text-gray-500 hover:text-gray-900"
                }`}
              >
                <span>Páginas</span>
              </button>

            </nav>
          </div>

          <div className="flex items-center gap-3">
            <span className="hidden text-xs text-gray-400 sm:inline">
              Logado como <strong className="text-gray-700">{user.email}</strong>
            </span>

            <a
              href="/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex size-9 items-center justify-center rounded-full border border-gray-200 text-gray-600 transition hover:bg-gray-100 hover:text-gray-900"
              title="Ver site principal em nova aba"
            >
              <Globe className="size-4" />
            </a>

            <button
              type="button"
              onClick={() => void supabase.auth.signOut()}
              className="inline-flex size-9 items-center justify-center rounded-full border border-gray-200 text-gray-600 transition hover:bg-red-50 hover:text-red-600"
              title="Sair do painel"
            >
              <LogOut className="size-4" />
            </button>
          </div>
        </header>

        {/* CONTEÚDO PRINCIPAL DO DASHBOARD */}
        <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 md:py-12 lg:px-8">
          {adminTab === "journey" ? (
            <JourneyAnalytics />
          ) : adminTab === "leads" ? (
            <LeadsPanel />
          ) : (
            <>
              {/* Cabeçalho da Seção */}
          <div className="mb-8 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <span className="text-xs font-bold uppercase tracking-widest text-[#ff8515]">
                Gerenciador de Conteúdo
              </span>
              <h1 className="font-display text-2xl font-bold uppercase tracking-wide text-[#00205C] sm:text-3xl">
                Minhas Páginas
              </h1>
              <p className="mt-1 text-sm text-gray-500">
                Selecione uma página para editar no modo visual ou crie uma nova página do zero.
              </p>
            </div>

            <button
              type="button"
              onClick={() => setIsCreateModalOpen(true)}
              className="inline-flex items-center gap-2 rounded-full bg-[#00205C] px-5 py-2.5 text-xs font-bold uppercase tracking-wider text-white shadow-md transition hover:bg-[#ff8515]"
            >
              <Plus className="size-4" />
              <span>Nova Página</span>
            </button>
          </div>

          {/* GRID DE CARDS (IDENTICO AO LAYOUT DA IMAGEM DE REFERENCIA) */}
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {/* CARD 1: + NOVA PÁGINA (Borda pontilhada, ícone + no meio) */}
            <button
              type="button"
              onClick={() => setIsCreateModalOpen(true)}
              className="group relative flex aspect-[4/5] flex-col items-center justify-center rounded-3xl border-2 border-dashed border-[#D5D0C8] bg-[#F7F6F3] p-6 text-center transition-all duration-300 hover:border-[#ff8515] hover:bg-[#fff9f2] hover:shadow-md cursor-pointer"
            >
              <div className="mb-3 flex size-12 items-center justify-center rounded-full bg-white/90 text-[#99948D] shadow-2xs transition-all duration-300 group-hover:scale-110 group-hover:bg-[#ff8515] group-hover:text-white">
                <Plus className="size-6 stroke-[2]" />
              </div>
              <span className="text-sm font-semibold tracking-wide text-[#827D75] transition-colors group-hover:text-[#ff8515]">
                Nova Página
              </span>
              <span className="mt-1 text-[11px] text-[#A6A097]">Criar do zero</span>
            </button>

            {/* CARDS 2+: PÁGINAS EXISTENTES */}
            {pagesList.map((page, index) => {
              const pageNumber = String(index + 1).padStart(2, "0");
              const isMain = page.id === "main";
              const publicUrl = isMain ? "/" : `/?p=${page.id}`;

              return (
                <div
                  key={page.id}
                  onClick={() => selectPage(page.id)}
                  className="group relative flex flex-col overflow-hidden rounded-3xl border border-[#EBE7E1] bg-white shadow-xs transition-all duration-300 hover:-translate-y-1 hover:shadow-xl cursor-pointer"
                >
                  {/* ÁREA SUPERIOR DE MÍDIA / THUMBNAIL (ASPECT 4/5) */}
                  <div className="relative aspect-[4/5] w-full overflow-hidden bg-[#EDE8E1]">
                    {page.image ? (
                      <img
                        src={page.image}
                        alt={page.title}
                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-[#EDE8E1] text-xs font-medium tracking-wide text-[#A39E96]">
                        Sem mídia
                      </div>
                    )}

                    {/* Tag no topo */}
                    <div className="absolute top-3 left-3 flex items-center gap-1.5">
                      {isMain ? (
                        <span className="rounded-full bg-[#00205C]/90 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white shadow-xs backdrop-blur-xs">
                          Principal
                        </span>
                      ) : (
                        <span className="rounded-full bg-black/60 px-2.5 py-0.5 font-mono text-[10px] text-white/90 shadow-xs backdrop-blur-xs">
                          /{page.id}
                        </span>
                      )}
                    </div>

                    {/* Botão de exclusão (apenas em páginas secundárias) */}
                    {!isMain && (
                      <button
                        type="button"
                        title="Excluir página"
                        onClick={(e) => void handleDeletePage(page, e)}
                        className="absolute top-3 right-3 z-10 flex size-8 items-center justify-center rounded-full bg-white/90 text-gray-400 opacity-0 shadow-md transition-all hover:bg-red-500 hover:text-white group-hover:opacity-100"
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    )}

                    {/* Overlay hover para entrar no editor */}
                    <div className="absolute inset-0 flex items-center justify-center bg-black/35 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-[#ff8515] px-4 py-2 text-xs font-bold uppercase tracking-wider text-white shadow-lg transition-transform duration-200">
                        <Pencil className="size-3" />
                        Editar Visual
                      </span>
                    </div>
                  </div>

                  {/* ÁREA INFERIOR DE DETALHES */}
                  <div className="flex flex-1 flex-col justify-between border-t border-[#F2EFEB] bg-white p-4">
                    <div>
                      {/* NÚMERO DOURADO SERIFADO (01, 02, 03... IGUAL AO MOCKUP) */}
                      <div className="font-serif text-xs font-normal tracking-widest text-[#C5A059]">
                        {pageNumber}
                      </div>

                      {/* TÍTULO DA PÁGINA EM NEGRITO */}
                      <h3 className="mt-1 truncate font-bold text-sm leading-snug text-gray-900 transition-colors group-hover:text-[#00205C] md:text-[15px]">
                        {page.title}
                      </h3>
                    </div>

                    {/* Rodapé do Card com Link Externo */}
                    <div className="mt-3 flex items-center justify-between border-t border-gray-100 pt-2 text-[11px] text-gray-400">
                      <span className="truncate">
                        {isMain ? "Home do Site" : `/?p=${page.id}`}
                      </span>
                      <a
                        href={publicUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="p-1 text-gray-400 transition hover:text-[#ff8515]"
                        title="Ver página pública"
                      >
                        <ExternalLink className="size-3.5" />
                      </a>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
            </>
          )}
        </main>

        {/* MODAL PARA CRIAR NOVA PÁGINA */}
        {isCreateModalOpen && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs"
            onClick={() => setIsCreateModalOpen(false)}
          >
            <div
              className="relative w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl animate-in fade-in zoom-in duration-150"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between border-b border-gray-100 pb-4">
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-[#ff8515]">
                    Criar do Zero
                  </span>
                  <h3 className="font-display text-xl font-bold uppercase text-[#00205C]">
                    Nova Página
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="rounded-full p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
                >
                  <X className="size-5" />
                </button>
              </div>

              <form onSubmit={handleCreatePage} className="mt-5 space-y-4">
                <div>
                  <label className="block text-xs font-bold uppercase text-gray-600">
                    Nome da Página
                  </label>
                  <input
                    type="text"
                    required
                    autoFocus
                    placeholder="Ex: Linha Capilar, Páscoa, Empresas..."
                    value={newPageTitle}
                    onChange={(e) => handleNewTitleChange(e.target.value)}
                    className="mt-1.5 w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm outline-none focus:border-[#00205C] focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase text-gray-600">
                    Identificador na URL (Slug)
                  </label>
                  <div className="mt-1.5 flex items-center rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm focus-within:border-[#00205C] focus-within:bg-white">
                    <span className="font-mono text-xs text-gray-400">/?p=</span>
                    <input
                      type="text"
                      required
                      placeholder="linha-capilar"
                      value={newPageSlug}
                      onChange={(e) =>
                        setNewPageSlug(
                          e.target.value
                            .toLowerCase()
                            .replace(/[^a-z0-9-]/g, ""),
                        )
                      }
                      className="ml-1 w-full bg-transparent font-mono text-sm outline-none"
                    />
                  </div>
                  <p className="mt-1 text-[11px] text-gray-400">
                    O link desta página para os clientes será:{" "}
                    <code className="text-gray-600">
                      https://.../?p={newPageSlug || "identificador"}
                    </code>
                  </p>
                </div>

                {createError && (
                  <p className="rounded-lg bg-red-50 p-2.5 text-xs font-semibold text-red-600">
                    {createError}
                  </p>
                )}

                <div className="flex items-center justify-end gap-3 border-t border-gray-100 pt-4">
                  <button
                    type="button"
                    onClick={() => setIsCreateModalOpen(false)}
                    className="rounded-full px-4 py-2 text-xs font-bold uppercase tracking-wider text-gray-500 hover:bg-gray-100"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={creatingPage}
                    className="inline-flex items-center gap-2 rounded-full bg-[#ff8515] px-6 py-2.5 text-xs font-bold uppercase tracking-wider text-white shadow-md transition hover:bg-[#e0740e] disabled:opacity-50"
                  >
                    {creatingPage ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <Plus className="size-4" />
                    )}
                    <span>{creatingPage ? "Criando..." : "Criar e Abrir Editor"}</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    );
  }

  // TELA DO EDITOR VISUAL (WYSIWYG)
  const activePageItem = pagesList.find((p) => p.id === currentPageId);
  const activePageTitle =
    activePageItem?.title ||
    (currentPageId === "main" ? "Página Principal" : currentPageId);

  return (
    <div className="min-h-screen bg-gray-100">
      {/* TOPBAR FIXA DO EDITOR */}
      <header className="fixed top-0 left-0 right-0 z-[100] flex h-16 items-center justify-between border-b border-white/10 bg-[#00205C] px-4 text-white shadow-xl backdrop-blur-md md:px-6">
        {/* Lado Esquerdo: Branding, Página Atual e Dica */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="font-display text-lg font-bold uppercase tracking-wide">
              GoldKo <span className="text-[#ff8515]">Visual</span>
            </span>
            <span className="rounded-md bg-[#42C8E5]/20 px-2 py-0.5 text-[11px] font-bold uppercase text-[#42C8E5]">
              Editor
            </span>
          </div>

          <div className="hidden items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs text-white/90 md:flex">
            <span className="text-white/50">Editando:</span>
            <span className="font-bold">{activePageTitle}</span>
          </div>

          <div className="hidden items-center gap-1.5 text-xs text-white/70 xl:flex">
            <Sparkles className="size-3.5 text-[#ff8515]" />
            <span>Clique nos textos, fotos ou botões para editar</span>
          </div>
        </div>

        {/* Lado Direito: Ações */}
        <div className="flex items-center gap-2.5 sm:gap-3">
          {/* BOTÃO VOLTAR (AO LADO DE PRÉ-VISUALIZAR, SOLICITADO PELO USUÁRIO) */}
          <button
            type="button"
            onClick={handleBackToPages}
            className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3.5 py-1.5 text-xs font-semibold text-white/90 transition hover:bg-white/20 hover:text-white"
            title="Voltar para a lista de páginas"
          >
            <ArrowLeft className="size-3.5" />
            <span>Voltar</span>
          </button>

          {/* Alternar Modo Edição / Pré-visualizar */}
          <button
            type="button"
            onClick={() => setIsEditMode(!isEditMode)}
            className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-semibold transition ${
              isEditMode
                ? "border border-emerald-500/40 bg-emerald-500/20 text-emerald-300"
                : "bg-white/10 text-white/70 hover:bg-white/20"
            }`}
            title={
              isEditMode
                ? "Modo de edição ativo. Clique para ver como visitante."
                : "Modo de pré-visualização. Clique para voltar a editar."
            }
          >
            {isEditMode ? <Pencil className="size-3.5" /> : <Eye className="size-3.5" />}
            <span className="hidden sm:inline">
              {isEditMode ? "Modo Edição" : "Pré-visualizar"}
            </span>
          </button>

          {/* Alternar tamanho da área de edição */}
          <div
            className="flex items-center rounded-full border border-white/15 bg-white/10 p-1"
            aria-label="Tamanho da prévia"
          >
            <button
              type="button"
              onClick={() => setDeviceMode("desktop")}
              className={`inline-flex size-7 items-center justify-center rounded-full transition ${
                deviceMode === "desktop"
                  ? "bg-white text-[#00205C] shadow-sm"
                  : "text-white/65 hover:bg-white/10 hover:text-white"
              }`}
              title="Configurar versão desktop"
              aria-label="Configurar versão desktop"
              aria-pressed={deviceMode === "desktop"}
            >
              <Monitor className="size-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setDeviceMode("mobile")}
              className={`inline-flex size-7 items-center justify-center rounded-full transition ${
                deviceMode === "mobile"
                  ? "bg-[#42C8E5] text-[#00205C] shadow-sm"
                  : "text-white/65 hover:bg-white/10 hover:text-white"
              }`}
              title="Configurar versão mobile"
              aria-label="Configurar versão mobile"
              aria-pressed={deviceMode === "mobile"}
            >
              <Smartphone className="size-3.5" />
            </button>
          </div>

          {/* Status de alterações */}
          {hasChanges ? (
            <span className="hidden items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/20 px-3 py-1 text-xs font-semibold text-amber-300 sm:flex">
              <span className="size-2 animate-pulse rounded-full bg-amber-400" />
              Não salvo
            </span>
          ) : (
            <span className="hidden items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-white/70 sm:flex">
              <Check className="size-3 text-emerald-400" />
              Sincronizado
            </span>
          )}

          {/* Botão Descartar */}
          {hasChanges && (
            <button
              type="button"
              onClick={handleDiscard}
              className="inline-flex items-center gap-1 rounded-full border border-white/20 px-3 py-1.5 text-xs font-semibold text-white/80 transition hover:bg-white/10 hover:text-white"
            >
              <RotateCcw className="size-3" />
              <span className="hidden md:inline">Descartar</span>
            </button>
          )}

          {/* Botão Salvar e Publicar */}
          <button
            type="button"
            disabled={saving}
            onClick={handleSave}
            className="inline-flex items-center gap-2 rounded-full bg-[#ff8515] px-4 py-2 text-xs font-bold uppercase tracking-wider text-white shadow-lg transition hover:bg-[#e0740e] disabled:opacity-50 sm:px-5"
          >
            {saving ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Save className="size-4" />
            )}
            <span>{saving ? "Salvando..." : "Salvar e Publicar"}</span>
          </button>

          {/* Ver Página Pública */}
          <a
            href={currentPageId === "main" ? "/" : `/?p=${currentPageId}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex size-9 items-center justify-center rounded-full border border-white/20 text-white/80 transition hover:bg-white/10 hover:text-white"
            title="Abrir página pública em nova aba"
          >
            <Globe className="size-4" />
          </a>

          {/* Sair */}
          <button
            type="button"
            onClick={() => void supabase.auth.signOut()}
            className="inline-flex size-9 items-center justify-center rounded-full border border-white/20 text-white/80 transition hover:bg-red-500/20 hover:text-red-300"
            title="Sair do painel"
          >
            <LogOut className="size-4" />
          </button>
        </div>
      </header>

      {/* ÁREA DO SITE RENDERIZADO */}
      <div className="pt-16">
        {loadingCurrentPage ? (
          <div className="flex h-96 items-center justify-center">
            <Loader2 className="size-8 animate-spin text-[#00205C]" />
          </div>
        ) : (
          <>
            {errorMessage && (
              <div className="bg-red-500 px-4 py-2 text-center text-xs font-semibold text-white">
                {errorMessage}
              </div>
            )}

            <EditorProvider value={editorContextValue}>
              <DevicePreview mode={deviceMode}>
                <HomePage
                key={currentPageId}
                pageId={currentPageId}
                content={content}
                isEditable={isEditMode}
                onEditField={(path, label, value, type) => {
                  setActiveModal({
                    type: type || "text",
                    path,
                    label,
                    value: value || "",
                  });
                }}
                onEditMedia={(path, label, source) => {
                  setActiveModal({
                    type: "media",
                    path,
                    label,
                    source: source || "",
                  });
                }}
                onEditDualMedia={(desktopPath, mobilePath, label, desktopSource, mobileSource) => {
                  setActiveModal({
                    type: "dual-media",
                    desktopPath,
                    mobilePath,
                    label,
                    desktopSource: desktopSource || "",
                    mobileSource: mobileSource || "",
                  });
                }}
                onEditLink={(path, label, data) => {
                  setActiveModal({
                    type: "link",
                    path,
                    label,
                    data,
                  });
                }}
                onEditCard={(path, label, data, schemaType) => {
                  setActiveModal({
                    type: "card",
                    path,
                    label,
                    data: { ...data },
                    schemaType,
                  });
                }}
                onMoveElement={(elementId, layout) => {
                  setContent((previous) => ({
                    ...previous,
                    elementLayouts: {
                      ...previous.elementLayouts,
                      [elementId]: layout,
                    },
                  }));
                }}
                onSwapHeroVisuals={() => {
                  setContent((previous) => ({
                    ...previous,
                    hero: {
                      ...previous.hero,
                      visualOrder:
                        previous.hero.visualOrder === "heading-first"
                          ? "media-first"
                          : "heading-first",
                    },
                    elementLayouts: {
                      ...previous.elementLayouts,
                      "hero-heading-image": null,
                      "hero-main-media": null,
                    },
                  }));
                }}
                onMoveNavbarElement={(elementId, position) => {
                  setContent((previous) => ({
                    ...previous,
                    navbar: {
                      ...previous.navbar,
                      positions: {
                        ...previous.navbar.positions,
                        [elementId]: position,
                      },
                    },
                  }));
                }}
                />
              </DevicePreview>
            </EditorProvider>
          </>
        )}
      </div>

      {/* TOAST DE SUCESSO FLUTUANTE */}
      {saveSuccess && (
        <div className="fixed right-6 bottom-6 z-[120] flex items-center gap-3 rounded-2xl bg-emerald-600 px-5 py-3.5 text-sm font-semibold text-white shadow-2xl animate-in slide-in-from-bottom-5">
          <Check className="size-5" />
          <span>Alterações publicadas com sucesso na página!</span>
        </div>
      )}

      {/* MODAL / DIALOG DE EDIÇÃO INTERATIVA ON-PAGE */}
      {activeModal && (
        <div
          className="fixed inset-0 z-[300] flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs"
          onClick={() => setActiveModal(null)}
        >
          <div
            className="relative max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-3xl bg-white p-6 text-gray-900 shadow-2xl animate-in fade-in zoom-in duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header do Modal */}
            <div className="flex items-center justify-between border-b border-gray-100 pb-4">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#ff8515]">
                  Editor Rápido
                </span>
                <h3 className="font-display text-xl font-bold uppercase text-[#00205C]">
                  {activeModal.label}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="rounded-full p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
              >
                <X className="size-5" />
              </button>
            </div>

            {/* Conteúdo do Modal */}
            <div className="mt-5 space-y-4">
              {/* CAMPO DE TEXTO SIMPLES */}
              {activeModal.type === "text" && (
                <div>
                  <label className="block text-xs font-bold uppercase text-gray-600">
                    Texto
                  </label>
                  <input
                    type="text"
                    autoFocus
                    value={activeModal.value}
                    onChange={(e) => {
                      const newVal = e.target.value;
                      setActiveModal({ ...activeModal, value: newVal });
                      updateField(activeModal.path, newVal);
                    }}
                    className="mt-1.5 w-full rounded-2xl border border-gray-200 bg-gray-50/50 p-4 text-base outline-none focus:border-[#00205C] focus:bg-white"
                  />
                </div>
              )}

              {/* CAMPO DE TEXTO MULTILINHA */}
              {activeModal.type === "multiline" && (
                <div>
                  <label className="block text-xs font-bold uppercase text-gray-600">
                    Conteúdo do Texto (com parágrafos)
                  </label>
                  <textarea
                    rows={6}
                    autoFocus
                    value={activeModal.value}
                    onChange={(e) => {
                      const newVal = e.target.value;
                      setActiveModal({ ...activeModal, value: newVal });
                      updateField(activeModal.path, newVal);
                    }}
                    className="mt-1.5 w-full rounded-2xl border border-gray-200 bg-gray-50/50 p-4 text-sm leading-relaxed outline-none focus:border-[#00205C] focus:bg-white"
                  />
                </div>
              )}

              {/* CAMPO DE MÍDIA (FOTO / VÍDEO COM UPLOAD SUPABASE) */}
              {activeModal.type === "media" && (
                <div className="space-y-5">
                  <MediaUploadField
                    label={activeModal.label}
                    value={activeModal.source}
                    onChange={(newUrl) => {
                      setActiveModal({ ...activeModal, source: newUrl });
                      updateField(activeModal.path, newUrl);
                    }}
                  />
                  {activeModal.path === "navbar.logoImage" && (
                    <div className="rounded-2xl border border-[#42C8E5]/30 bg-[#42C8E5]/5 p-4">
                      <div className="mb-3 flex items-center justify-between gap-4">
                        <label htmlFor="navbar-logo-width" className="text-sm font-bold text-[#00205C]">
                          Tamanho do logo
                        </label>
                        <span className="rounded-full bg-white px-3 py-1 text-xs font-bold text-[#00205C] shadow-sm">
                          {content.navbar.logoWidth || 132}px
                        </span>
                      </div>
                      <input
                        id="navbar-logo-width"
                        type="range"
                        min="70"
                        max="260"
                        step="2"
                        value={content.navbar.logoWidth || 132}
                        onChange={(event) => updateField("navbar.logoWidth", Number(event.target.value))}
                        className="w-full accent-[#42C8E5]"
                      />
                      <p className="mt-2 text-xs leading-relaxed text-gray-500">
                        Redimensiona somente a imagem. A altura da navbar e a posição dos outros elementos permanecem iguais.
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* CAMPOS DE MÍDIA DUAL (DESKTOP + MOBILE) */}
              {activeModal.type === "dual-media" && (
                <div className="space-y-6">
                  {/* Desktop */}
                  <div className="rounded-2xl border border-gray-200 bg-gray-50/60 p-4">
                    <div className="mb-3 flex items-center gap-2">
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-[#00205C]/10 px-3 py-1 text-[11px] font-bold uppercase text-[#00205C]">
                        🖥️ Desktop (16:9)
                      </span>
                    </div>
                    <MediaUploadField
                      label="Vídeo / Foto Desktop"
                      value={activeModal.desktopSource}
                      onChange={(newUrl) => {
                        setActiveModal({ ...activeModal, desktopSource: newUrl });
                        updateField(activeModal.desktopPath, newUrl);
                      }}
                    />
                  </div>

                  {/* Mobile */}
                  <div className="rounded-2xl border border-[#42C8E5]/30 bg-[#42C8E5]/5 p-4">
                    <div className="mb-3 flex items-center gap-2">
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-[#42C8E5]/20 px-3 py-1 text-[11px] font-bold uppercase text-[#00205C]">
                        📱 Mobile (9:16)
                      </span>
                    </div>
                    <MediaUploadField
                      label="Vídeo / Foto Mobile (vertical 9:16)"
                      value={activeModal.mobileSource}
                      onChange={(newUrl) => {
                        setActiveModal({ ...activeModal, mobileSource: newUrl });
                        updateField(activeModal.mobilePath, newUrl);
                      }}
                    />
                  </div>
                </div>
              )}

              {/* CAMPO DE BOTÃO E LINK */}
              {activeModal.type === "link" && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold uppercase text-gray-600">
                      Texto do Botão
                    </label>
                    <input
                      type="text"
                      autoFocus
                      value={activeModal.data.label}
                      onChange={(e) => {
                        const newLabel = e.target.value;
                        const updated = { ...activeModal.data, label: newLabel };
                        setActiveModal({ ...activeModal, data: updated });
                        updateField(`${activeModal.path}.label`, newLabel);
                        if (activeModal.path.endsWith(".cta")) {
                          updateField(activeModal.path, newLabel);
                        }
                      }}
                      className="mt-1.5 w-full rounded-2xl border border-gray-200 bg-gray-50/50 p-3.5 text-sm outline-none focus:border-[#00205C] focus:bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase text-gray-600">
                      Link de Destino (URL completa ou #seção)
                    </label>
                    <input
                      type="text"
                      value={activeModal.data.href}
                      onChange={(e) => {
                        const newHref = e.target.value;
                        const updated = { ...activeModal.data, href: newHref };
                        setActiveModal({ ...activeModal, data: updated });
                        updateField(`${activeModal.path}.href`, newHref);
                        if (activeModal.path === "hero.cta") {
                          updateField("hero.ctaHref", newHref);
                        }
                      }}
                      placeholder="Ex: #como-ajudar, #cardapio, /contato ou https://..."
                      className="mt-1.5 w-full rounded-2xl border border-gray-200 bg-gray-50/50 p-3.5 font-mono text-sm outline-none focus:border-[#00205C] focus:bg-white"
                    />
                  </div>

                  <div>
                    <span className="text-[11px] font-semibold text-gray-400">
                      Atalhos para seções da página:
                    </span>
                    <div className="mt-1.5 flex flex-wrap gap-1.5">
                      {["#como-ajudar", "#empresas", "#cardapio", "#conheca", "#unidades", "/contato"].map(
                        (tag) => (
                          <button
                            key={tag}
                            type="button"
                            onClick={() => {
                              const updated = { ...activeModal.data, href: tag };
                              setActiveModal({ ...activeModal, data: updated });
                              updateField(`${activeModal.path}.href`, tag);
                              if (activeModal.path === "hero.cta") {
                                updateField("hero.ctaHref", tag);
                              }
                            }}
                            className="rounded-lg bg-gray-100 px-2.5 py-1 font-mono text-[11px] text-gray-700 transition hover:bg-[#00205C] hover:text-white"
                          >
                            {tag}
                          </button>
                        ),
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* EDIÇÃO DE CARDS */}
              {activeModal.type === "card" && (
                <div className="space-y-4">
                  {/* Título do Card */}
                  {"title" in activeModal.data && (
                    <div>
                      <label className="block text-xs font-bold uppercase text-gray-600">
                        Título do Card
                      </label>
                      <input
                        type="text"
                        value={activeModal.data.title || ""}
                        onChange={(e) => {
                          const updated = { ...activeModal.data, title: e.target.value };
                          setActiveModal({ ...activeModal, data: updated });
                          updateField(activeModal.path, updated);
                        }}
                        className="mt-1.5 w-full rounded-xl border border-gray-200 bg-gray-50/50 p-3 text-sm outline-none focus:border-[#00205C] focus:bg-white"
                      />
                    </div>
                  )}

                  {/* Nome (para Unidades) */}
                  {"name" in activeModal.data && (
                    <div>
                      <label className="block text-xs font-bold uppercase text-gray-600">
                        Nome da Unidade
                      </label>
                      <input
                        type="text"
                        value={activeModal.data.name || ""}
                        onChange={(e) => {
                          const updated = { ...activeModal.data, name: e.target.value };
                          setActiveModal({ ...activeModal, data: updated });
                          updateField(activeModal.path, updated);
                        }}
                        className="mt-1.5 w-full rounded-xl border border-gray-200 bg-gray-50/50 p-3 text-sm outline-none focus:border-[#00205C] focus:bg-white"
                      />
                    </div>
                  )}

                  {/* Texto descritivo */}
                  {"text" in activeModal.data && (
                    <div>
                      <label className="block text-xs font-bold uppercase text-gray-600">
                        Texto Descritivo
                      </label>
                      <textarea
                        rows={3}
                        value={activeModal.data.text || ""}
                        onChange={(e) => {
                          const updated = { ...activeModal.data, text: e.target.value };
                          setActiveModal({ ...activeModal, data: updated });
                          updateField(activeModal.path, updated);
                        }}
                        className="mt-1.5 w-full rounded-xl border border-gray-200 bg-gray-50/50 p-3 text-sm leading-relaxed outline-none focus:border-[#00205C] focus:bg-white"
                      />
                    </div>
                  )}

                  {/* Imagem do Card */}
                  {"image" in activeModal.data && (
                    <div>
                      <MediaUploadField
                        label="Imagem do Card"
                        value={activeModal.data.image || ""}
                        onChange={(newUrl) => {
                          const updated = { ...activeModal.data, image: newUrl };
                          setActiveModal({ ...activeModal, data: updated });
                          updateField(activeModal.path, updated);
                        }}
                      />
                    </div>
                  )}

                  {/* Botão / CTA do Card */}
                  {"cta" in activeModal.data && (
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <div>
                        <label className="block text-xs font-bold uppercase text-gray-600">
                          Texto do Botão
                        </label>
                        <input
                          type="text"
                          value={activeModal.data.cta || ""}
                          onChange={(e) => {
                            const updated = { ...activeModal.data, cta: e.target.value };
                            setActiveModal({ ...activeModal, data: updated });
                            updateField(activeModal.path, updated);
                          }}
                          className="mt-1.5 w-full rounded-xl border border-gray-200 bg-gray-50/50 p-3 text-sm outline-none focus:border-[#00205C] focus:bg-white"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold uppercase text-gray-600">
                          Link do Botão
                        </label>
                        <input
                          type="text"
                          value={activeModal.data.href || ""}
                          onChange={(e) => {
                            const updated = { ...activeModal.data, href: e.target.value };
                            setActiveModal({ ...activeModal, data: updated });
                            updateField(activeModal.path, updated);
                          }}
                          className="mt-1.5 w-full rounded-xl border border-gray-200 bg-gray-50/50 p-3 font-mono text-sm outline-none focus:border-[#00205C] focus:bg-white"
                        />
                      </div>
                    </div>
                  )}

                  {/* Campos específicos de Unidades */}
                  {activeModal.schemaType === "unit" && (
                    <div className="space-y-3 pt-2">
                      <div>
                        <label className="block text-xs font-bold uppercase text-gray-600">
                          Endereço
                        </label>
                        <input
                          type="text"
                          value={activeModal.data.address || ""}
                          onChange={(e) => {
                            const updated = { ...activeModal.data, address: e.target.value };
                            setActiveModal({ ...activeModal, data: updated });
                            updateField(activeModal.path, updated);
                          }}
                          className="mt-1 w-full rounded-xl border border-gray-200 p-3 text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold uppercase text-gray-600">
                          Horário de Funcionamento
                        </label>
                        <input
                          type="text"
                          value={activeModal.data.hours || ""}
                          onChange={(e) => {
                            const updated = { ...activeModal.data, hours: e.target.value };
                            setActiveModal({ ...activeModal, data: updated });
                            updateField(activeModal.path, updated);
                          }}
                          className="mt-1 w-full rounded-xl border border-gray-200 p-3 text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold uppercase text-gray-600">
                          WhatsApp da Loja
                        </label>
                        <input
                          type="text"
                          value={activeModal.data.whatsapp || ""}
                          onChange={(e) => {
                            const updated = { ...activeModal.data, whatsapp: e.target.value };
                            setActiveModal({ ...activeModal, data: updated });
                            updateField(activeModal.path, updated);
                          }}
                          placeholder="Ex: 5564999999999"
                          className="mt-1 w-full rounded-xl border border-gray-200 p-3 text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold uppercase text-gray-600">
                          Link Google Maps
                        </label>
                        <input
                          type="text"
                          value={activeModal.data.mapUrl || ""}
                          onChange={(e) => {
                            const updated = { ...activeModal.data, mapUrl: e.target.value };
                            setActiveModal({ ...activeModal, data: updated });
                            updateField(activeModal.path, updated);
                          }}
                          className="mt-1 w-full rounded-xl border border-gray-200 p-3 text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold uppercase text-gray-600">
                          Link iFood
                        </label>
                        <input
                          type="text"
                          value={activeModal.data.ifoodUrl || ""}
                          onChange={(e) => {
                            const updated = { ...activeModal.data, ifoodUrl: e.target.value };
                            setActiveModal({ ...activeModal, data: updated });
                            updateField(activeModal.path, updated);
                          }}
                          className="mt-1 w-full rounded-xl border border-gray-200 p-3 text-sm"
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Footer do Modal */}
            <div className="mt-6 flex items-center justify-end gap-3 border-t border-gray-100 pt-4">
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="rounded-full bg-[#00205C] px-6 py-2.5 text-xs font-bold uppercase tracking-wider text-white transition hover:bg-[#ff8515]"
              >
                Concluir
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE EDIÇÃO DE ELEMENTO VISUAL LIVRE */}
      <FreeElementModal
        element={activeFreeElementModal}
        onClose={() => setActiveFreeElementModal(null)}
        onSave={(elementId, sectionId, updates) => {
          updateElement(sectionId, elementId, updates);
        }}
        onDelete={(elementId, sectionId) => {
          deleteElement(sectionId, elementId);
        }}
      />

      {/* MODAL DE FUNDO DE SEÇÃO */}
      <SectionBackgroundModal
        sectionId={activeBgModalSectionId}
        initialBackground={
          activeBgModalSectionId
            ? content.sectionBackgrounds?.[activeBgModalSectionId]
            : undefined
        }
        onClose={() => setActiveBgModalSectionId(null)}
        onSave={(sectionId, bg) => {
          updateSectionBackground(sectionId, bg);
        }}
      />
    </div>
  );
}
