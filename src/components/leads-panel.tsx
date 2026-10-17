import { useEffect, useMemo, useState } from "react";
import { AlignLeft, Building2, CheckSquare, Clock, Download, Loader2, Mail, MessageCircle, Plus, RefreshCw, Search, Trash2, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  createManualLead,
  deleteChatLead,
  LEAD_STATUSES,
  listChatLeads,
  updateChatLead,
  type ChatLeadRow,
  type LeadPatch,
  type LeadStatus,
} from "@/lib/leads-admin.functions";

const STATUS_META: Record<LeadStatus, { label: string; chip: string; dot: string }> = {
  novo: { label: "Novo", chip: "bg-[#42C8E5]/15 text-[#00205C]", dot: "bg-[#42C8E5]" },
  contatado: { label: "Contatado", chip: "bg-amber-100 text-amber-800", dot: "bg-amber-500" },
  qualificado: { label: "Qualificado", chip: "bg-violet-100 text-violet-800", dot: "bg-violet-500" },
  convertido: { label: "Convertido", chip: "bg-emerald-100 text-emerald-800", dot: "bg-emerald-600" },
  perdido: { label: "Perdido", chip: "bg-gray-200 text-gray-600", dot: "bg-gray-400" },
};

type SegmentFilter = "todos" | "cliente" | "empresa" | "clube_nutri";
const SEGMENTS: { value: SegmentFilter; label: string }[] = [
  { value: "todos", label: "Todos" },
  { value: "cliente", label: "Clientes" },
  { value: "empresa", label: "Empresas" },
  { value: "clube_nutri", label: "Clube Nutri" },
];

const TIPO_LABEL: Record<string, string> = {
  cliente: "Cliente",
  empresa: "Empresa",
  clube_nutri: "Clube Nutri",
  nutricionista: "Clube Nutri",
};

const INTEREST_LABELS: Record<string, string> = {
  chocolates_zero: "Chocolates Zero Açúcar",
  cafeteria: "Cafeteria & Sobremesas",
  presentes: "Presentes e Kits",
  beneficios: "Clube de Benefícios",
  lanche_equipe: "Lanches saudáveis p/ equipe",
  kits_corporativos: "Cestas & kits corporativos",
  fornecimento: "Fornecimento recorrente",
  eventos: "Eventos & datas especiais",
  parceria_comercial: "Parceria comercial",
  informacoes_clube_nutri: "Como participar do Clube",
  kits_exclusivos_nutricionistas: "Kits e combos exclusivos",
  catalogo_produtos: "Catálogo de produtos",
  tabela_nutricional: "Tabela nutricional",
  tabela_calorias: "Tabela de calorias",
};

const normalizeTipo = (tipo: string) => (tipo === "nutricionista" ? "clube_nutri" : tipo);
const isStatus = (value: string): value is LeadStatus => (LEAD_STATUSES as readonly string[]).includes(value);
const statusOf = (lead: ChatLeadRow): LeadStatus => (isStatus(lead.status) ? lead.status : "novo");

function quantityOf(lead: ChatLeadRow) {
  const tipo = normalizeTipo(lead.tipo);
  if (tipo === "empresa") return lead.qtd_colaboradores ? `${lead.qtd_colaboradores} colaboradores` : "";
  if (tipo === "clube_nutri") return lead.qtd_pacientes ? `${lead.qtd_pacientes} pacientes` : "";
  return lead.qtd_pacientes ? `Família: ${lead.qtd_pacientes}` : "";
}

function interestsOf(lead: ChatLeadRow) {
  const values = normalizeTipo(lead.tipo) === "empresa" ? lead.interesse_empresa : lead.interesse_nutri;
  return (values || []).map((value) => INTEREST_LABELS[value] || value);
}

function formatPhone(raw: string | null) {
  const digits = (raw || "").replace(/\D/g, "");
  if (digits.length === 11) return `(${digits.slice(0, 2)}) ${digits[2]} ${digits.slice(3, 7)}-${digits.slice(7)}`;
  if (digits.length === 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  return raw || "";
}

/** Leads antigos (antes da migração) guardavam o e-mail no campo de WhatsApp. */
function contactOf(lead: ChatLeadRow) {
  const raw = lead.whatsapp || "";
  const legacyEmail = raw.includes("@") ? raw : "";
  return {
    phone: legacyEmail ? "" : raw.replace(/\D/g, ""),
    email: lead.email || legacyEmail,
  };
}

function whatsappLink(phone: string, name: string) {
  const digits = phone.replace(/\D/g, "");
  const full = digits.length <= 11 ? `55${digits}` : digits;
  const text = encodeURIComponent(`Olá, ${name.split(" ")[0]}! Aqui é da GoldKo. Recebemos seu cadastro pelo nosso site.`);
  return `https://wa.me/${full}?text=${text}`;
}

const dateFormatter = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit", year: "2-digit", hour: "2-digit", minute: "2-digit" });

async function getToken() {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error("Sessão expirada. Entre novamente no painel.");
  return token;
}

const SEGMENT_LABEL_COLOR: Record<string, { bar: string; name: string }> = {
  cliente: { bar: "bg-[#4BCE97]", name: "Cliente" },
  empresa: { bar: "bg-[#579DFF]", name: "Empresa" },
  clube_nutri: { bar: "bg-[#9F8FEF]", name: "Clube Nutri" },
};

const COLUMN_ACCENT: Record<LeadStatus, string> = {
  novo: "bg-[#42C8E5]",
  contatado: "bg-[#F5CD47]",
  qualificado: "bg-[#9F8FEF]",
  convertido: "bg-[#4BCE97]",
  perdido: "bg-[#8C9BAB]",
};

const shortDate = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short" });

export function LeadsPanel() {
  const [leads, setLeads] = useState<ChatLeadRow[]>([]);
  const [migrated, setMigrated] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [segment, setSegment] = useState<SegmentFilter>("todos");
  const [query, setQuery] = useState("");
  const [savingId, setSavingId] = useState<string | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const [toast, setToast] = useState("");
  const [dragId, setDragId] = useState<string | null>(null);
  const [overColumn, setOverColumn] = useState<LeadStatus | null>(null);
  const [composer, setComposer] = useState<LeadStatus | null>(null);
  const [composerText, setComposerText] = useState("");
  const [creating, setCreating] = useState(false);

  async function load() {
    setLoading(true);
    setError("");
    try {
      const result = await listChatLeads({ data: { accessToken: await getToken() } });
      setLeads(result.leads);
      setMigrated(result.migrated);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível carregar os leads.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(""), 3500);
    return () => clearTimeout(timer);
  }, [toast]);

  async function saveLead(id: string, patch: LeadPatch, quiet = false) {
    setSavingId(id);
    const previous = leads;
    setLeads((list) => list.map((lead) => (lead.id === id ? ({ ...lead, ...patch } as ChatLeadRow) : lead)));
    try {
      const result = await updateChatLead({ data: { accessToken: await getToken(), id, patch } });
      if (result.skipped.length) {
        setToast("Salvo. Empresa, e-mail e anotações só serão guardados depois de rodar a atualização do banco.");
      } else if (!quiet) {
        setToast("Alterações salvas");
      }
      return true;
    } catch (err) {
      setLeads(previous);
      setToast(err instanceof Error ? err.message : "Não foi possível salvar.");
      return false;
    } finally {
      setSavingId(null);
    }
  }

  async function removeLead(id: string) {
    setSavingId(id);
    try {
      await deleteChatLead({ data: { accessToken: await getToken(), id } });
      setLeads((list) => list.filter((lead) => lead.id !== id));
      setOpenId(null);
      setToast("Cartão excluído");
    } catch (err) {
      setToast(err instanceof Error ? err.message : "Não foi possível excluir.");
    } finally {
      setSavingId(null);
    }
  }

  async function createCard(status: LeadStatus) {
    const nome = composerText.trim();
    if (nome.length < 2) return;
    setCreating(true);
    try {
      const tipo = segment === "todos" ? "cliente" : segment;
      const created = await createManualLead({ data: { accessToken: await getToken(), nome, status, tipo } });
      const card: ChatLeadRow = {
        id: created.id,
        created_at: created.created_at,
        tipo,
        nome,
        empresa_nome: null,
        whatsapp: "",
        email: null,
        qtd_pacientes: null,
        qtd_colaboradores: null,
        interesse_nutri: null,
        interesse_empresa: null,
        status,
        observacoes: null,
        utm_source: "manual",
      };
      setLeads((list) => [card, ...list]);
      setComposerText("");
    } catch (err) {
      setToast(err instanceof Error ? err.message : "Não foi possível criar o cartão.");
    } finally {
      setCreating(false);
    }
  }

  function dropOn(status: LeadStatus) {
    const id = dragId;
    setDragId(null);
    setOverColumn(null);
    if (!id) return;
    const lead = leads.find((item) => item.id === id);
    if (!lead || statusOf(lead) === status) return;
    void saveLead(id, { status }, true);
  }

  const visible = useMemo(() => {
    const term = query.trim().toLowerCase();
    return leads.filter((lead) => {
      if (segment !== "todos" && normalizeTipo(lead.tipo) !== segment) return false;
      if (!term) return true;
      const contact = contactOf(lead);
      return [lead.nome, lead.empresa_nome, contact.phone, contact.email, lead.observacoes]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(term));
    });
  }, [leads, segment, query]);

  const columns = useMemo(
    () => LEAD_STATUSES.map((status) => ({ status, cards: visible.filter((lead) => statusOf(lead) === status) })),
    [visible],
  );

  function exportCsv() {
    const header = ["Data", "Perfil", "Nome", "Empresa", "WhatsApp", "E-mail", "Volume", "Interesses", "Etapa", "Anotações"];
    const rows = visible.map((lead) => {
      const contact = contactOf(lead);
      return [
        dateFormatter.format(new Date(lead.created_at)),
        TIPO_LABEL[lead.tipo] || lead.tipo,
        lead.nome,
        lead.empresa_nome || "",
        formatPhone(contact.phone),
        contact.email,
        quantityOf(lead),
        interestsOf(lead).join("; "),
        STATUS_META[statusOf(lead)].label,
        lead.observacoes || "",
      ];
    });
    const csv = [header, ...rows].map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(";")).join("\n");
    const blob = new Blob([`﻿${csv}`], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `leads-goldko-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  const openLead = leads.find((lead) => lead.id === openId) || null;

  return (
    <div
      className="flex h-[calc(100dvh-4rem)] flex-col overflow-hidden"
      style={{ background: "linear-gradient(135deg, #00205C 0%, #0B4A8B 45%, #42C8E5 100%)" }}
    >
      {/* BARRA DO QUADRO */}
      <div className="flex shrink-0 flex-wrap items-center gap-2 bg-black/25 px-4 py-2.5 text-white backdrop-blur-sm md:px-5">
        <h1 className="mr-1 rounded-md px-2 py-1 text-lg font-bold">Leads</h1>
        <div className="flex items-center gap-1">
          {SEGMENTS.map((item) => (
            <button
              key={item.value}
              type="button"
              onClick={() => setSegment(item.value)}
              className={`rounded-md px-2.5 py-1.5 text-sm font-semibold transition ${
                segment === item.value ? "bg-white text-[#00205C]" : "text-white/90 hover:bg-white/20"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
        <div className="ml-auto flex items-center gap-2">
          <label className="relative hidden sm:block">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-white/70" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Buscar cartões"
              className="w-56 rounded-md border border-white/25 bg-white/15 py-1.5 pl-8 pr-3 text-sm text-white outline-none placeholder:text-white/60 focus:bg-white focus:text-[#172B4D] focus:placeholder:text-gray-400"
            />
          </label>
          <button type="button" onClick={() => void load()} title="Atualizar" className="flex size-8 items-center justify-center rounded-md hover:bg-white/20">
            <RefreshCw className={`size-4 ${loading ? "animate-spin" : ""}`} />
          </button>
          <button
            type="button"
            onClick={exportCsv}
            disabled={visible.length === 0}
            className="inline-flex items-center gap-1.5 rounded-md bg-white px-3 py-1.5 text-sm font-bold text-[#00205C] transition hover:bg-white/90 disabled:opacity-50"
          >
            <Download className="size-4" /> Exportar
          </button>
        </div>
      </div>

      {!migrated && (
        <div className="shrink-0 bg-amber-100 px-5 py-2 text-xs text-amber-900">
          Falta rodar no Supabase o arquivo <code className="font-bold">supabase/migrations/20261016_leads_empresa_email.sql</code> para guardar empresa, e-mail e anotações.
        </div>
      )}
      {error && <div className="shrink-0 bg-red-100 px-5 py-2 text-sm font-semibold text-red-800">{error}</div>}

      {/* COLUNAS */}
      <div className="min-h-0 flex-1 overflow-x-auto overflow-y-hidden">
        <div className="flex h-full items-start gap-3 p-3 md:p-4">
          {columns.map(({ status, cards }) => (
            <section
              key={status}
              onDragOver={(event) => {
                event.preventDefault();
                if (overColumn !== status) setOverColumn(status);
              }}
              onDragLeave={(event) => {
                if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setOverColumn(null);
              }}
              onDrop={(event) => {
                event.preventDefault();
                dropOn(status);
              }}
              className={`flex max-h-full w-[272px] shrink-0 flex-col rounded-xl bg-[#101204] text-[#B6C2CF] shadow-md transition ${
                overColumn === status && dragId ? "ring-2 ring-[#42C8E5]" : ""
              }`}
            >
              <header className="flex items-center gap-2 px-3 pb-2 pt-3">
                <span className={`h-2 w-2 rounded-full ${COLUMN_ACCENT[status]}`} />
                <h2 className="flex-1 text-sm font-bold uppercase tracking-wide text-[#DEE4EA]">{STATUS_META[status].label}</h2>
                <span className="text-sm text-[#9FADBC]">{cards.length}</span>
              </header>

              <div className="min-h-[8px] flex-1 space-y-2 overflow-y-auto px-2 pb-1">
                {loading && leads.length === 0 && status === "novo" && (
                  <div className="flex items-center gap-2 px-2 py-3 text-sm text-[#9FADBC]">
                    <Loader2 className="size-4 animate-spin" /> Carregando…
                  </div>
                )}
                {cards.map((lead) => {
                  const contact = contactOf(lead);
                  const tipo = normalizeTipo(lead.tipo);
                  const label = SEGMENT_LABEL_COLOR[tipo];
                  const interests = interestsOf(lead);
                  return (
                    <article
                      key={lead.id}
                      draggable
                      onDragStart={(event) => {
                        event.dataTransfer.effectAllowed = "move";
                        event.dataTransfer.setData("text/plain", lead.id);
                        setDragId(lead.id);
                      }}
                      onDragEnd={() => {
                        setDragId(null);
                        setOverColumn(null);
                      }}
                      onClick={() => setOpenId(lead.id)}
                      className={`group cursor-pointer rounded-lg bg-[#22272B] px-3 pb-2 pt-2.5 shadow-[0_1px_1px_#091E4240] ring-[#85B8FF] transition hover:ring-2 ${
                        dragId === lead.id ? "rotate-2 opacity-50" : ""
                      } ${savingId === lead.id ? "opacity-70" : ""}`}
                    >
                      {label && (
                        <div className="mb-1.5 flex gap-1">
                          <span className={`h-2 w-10 rounded ${label.bar}`} title={label.name} />
                        </div>
                      )}
                      <p className="text-sm leading-snug text-[#DEE4EA]">{lead.nome}</p>
                      {lead.empresa_nome && (
                        <p className="mt-0.5 flex items-center gap-1 text-xs text-[#9FADBC]">
                          <Building2 className="size-3" /> {lead.empresa_nome}
                        </p>
                      )}
                      <div className="mt-2 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs text-[#9FADBC]">
                        <span className="inline-flex items-center gap-1" title={dateFormatter.format(new Date(lead.created_at))}>
                          <Clock className="size-3.5" /> {shortDate.format(new Date(lead.created_at)).replace(".", "")}
                        </span>
                        {contact.phone && (
                          <span className="inline-flex items-center gap-1" title={formatPhone(contact.phone)}>
                            <MessageCircle className="size-3.5" />
                          </span>
                        )}
                        {contact.email && (
                          <span className="inline-flex items-center gap-1" title={contact.email}>
                            <Mail className="size-3.5" />
                          </span>
                        )}
                        {lead.observacoes && (
                          <span className="inline-flex items-center gap-1" title="Tem anotações">
                            <AlignLeft className="size-3.5" />
                          </span>
                        )}
                        {interests.length > 0 && (
                          <span className="inline-flex items-center gap-1" title={interests.join(", ")}>
                            <CheckSquare className="size-3.5" /> {interests.length}
                          </span>
                        )}
                        {quantityOf(lead) && <span className="truncate">{quantityOf(lead)}</span>}
                      </div>
                    </article>
                  );
                })}

                {composer === status && (
                  <form
                    onSubmit={(event) => {
                      event.preventDefault();
                      void createCard(status);
                    }}
                  >
                    <textarea
                      autoFocus
                      value={composerText}
                      onChange={(event) => setComposerText(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" && !event.shiftKey) {
                          event.preventDefault();
                          void createCard(status);
                        }
                        if (event.key === "Escape") setComposer(null);
                      }}
                      rows={2}
                      placeholder="Nome do lead"
                      className="w-full resize-none rounded-lg bg-[#22272B] px-3 py-2 text-sm text-[#DEE4EA] shadow outline-none ring-2 ring-[#85B8FF] placeholder:text-[#8C9BAB]"
                    />
                    <div className="mt-1.5 flex items-center gap-1">
                      <button type="submit" disabled={creating} className="rounded bg-[#579DFF] px-3 py-1.5 text-sm font-semibold text-[#1D2125] hover:bg-[#85B8FF] disabled:opacity-60">
                        {creating ? "Adicionando…" : "Adicionar cartão"}
                      </button>
                      <button type="button" onClick={() => setComposer(null)} aria-label="Cancelar" className="flex size-8 items-center justify-center rounded text-[#9FADBC] hover:bg-[#A6C5E229]">
                        <X className="size-5" />
                      </button>
                    </div>
                  </form>
                )}
              </div>

              {composer !== status && (
                <div className="flex items-center gap-1 p-2">
                  <button
                    type="button"
                    onClick={() => {
                      setComposer(status);
                      setComposerText("");
                    }}
                    className="flex flex-1 items-center gap-2 rounded-lg px-2 py-1.5 text-sm font-medium text-[#9FADBC] transition hover:bg-[#A6C5E229] hover:text-[#DEE4EA]"
                  >
                    <Plus className="size-4" /> Adicionar um cartão
                  </button>
                </div>
              )}
            </section>
          ))}
          <div className="w-1 shrink-0" />
        </div>
      </div>

      {openLead && (
        <LeadSheet
          key={openLead.id}
          lead={openLead}
          migrated={migrated}
          saving={savingId === openLead.id}
          onClose={() => setOpenId(null)}
          onSave={(patch) => saveLead(openLead.id, patch)}
          onDelete={() => void removeLead(openLead.id)}
        />
      )}

      {toast && (
        <div className="fixed bottom-6 left-1/2 z-[300] max-w-md -translate-x-1/2 rounded-full bg-[#00205C] px-5 py-3 text-center text-sm font-semibold text-white shadow-xl">
          {toast}
        </div>
      )}
    </div>
  );
}

function LeadSheet({
  lead,
  migrated,
  saving,
  onClose,
  onSave,
  onDelete,
}: {
  lead: ChatLeadRow;
  migrated: boolean;
  saving: boolean;
  onClose: () => void;
  onSave: (patch: LeadPatch) => Promise<boolean>;
  onDelete: () => void;
}) {
  const contact = contactOf(lead);
  const [nome, setNome] = useState(lead.nome);
  const [empresa, setEmpresa] = useState(lead.empresa_nome || "");
  const [whatsapp, setWhatsapp] = useState(contact.phone ? formatPhone(contact.phone) : "");
  const [email, setEmail] = useState(contact.email);
  const [status, setStatus] = useState<LeadStatus>(statusOf(lead));
  const [tipo, setTipo] = useState<"cliente" | "empresa" | "clube_nutri">(
    (["cliente", "empresa", "clube_nutri"].includes(normalizeTipo(lead.tipo)) ? normalizeTipo(lead.tipo) : "cliente") as "cliente" | "empresa" | "clube_nutri",
  );
  const [observacoes, setObservacoes] = useState(lead.observacoes || "");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [formError, setFormError] = useState("");

  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (nome.trim().length < 2) return setFormError("Informe o nome.");
    if (!whatsapp.trim() && !email.trim()) return setFormError("Informe pelo menos um contato: WhatsApp ou e-mail.");
    if (email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim())) return setFormError("E-mail inválido.");
    setFormError("");
    const patch: LeadPatch = {
      nome: nome.trim(),
      status,
      tipo,
      whatsapp: whatsapp.trim() || null,
    };
    if (migrated) {
      patch.empresa_nome = empresa.trim() || null;
      patch.email = email.trim() || null;
      patch.observacoes = observacoes.trim() || null;
    }
    const ok = await onSave(patch);
    if (ok) onClose();
  }

  const interests = interestsOf(lead);
  const fieldClass =
    "w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm text-gray-900 outline-none transition focus:border-[#42C8E5] focus:ring-2 focus:ring-[#42C8E5]/20 disabled:bg-gray-50 disabled:text-gray-400";
  const labelClass = "mb-1 block text-xs font-bold text-[#00205C]";

  return (
    <div className="fixed inset-0 z-[250] flex justify-end bg-[#001433]/40 backdrop-blur-[2px]" onClick={(event) => event.target === event.currentTarget && onClose()}>
      <aside className="flex h-full w-full max-w-md flex-col bg-white shadow-2xl animate-in slide-in-from-right duration-300">
        <header className="flex items-start justify-between gap-3 border-b border-gray-100 px-6 py-5">
          <div className="min-w-0">
            <p className="text-[11px] font-bold uppercase tracking-widest text-[#ff8515]">
              {TIPO_LABEL[lead.tipo] || lead.tipo} · {dateFormatter.format(new Date(lead.created_at))}
            </p>
            <h2 className="mt-1 truncate font-display text-2xl font-bold uppercase text-[#00205C]">{lead.nome}</h2>
          </div>
          <button type="button" onClick={onClose} aria-label="Fechar" className="flex size-9 shrink-0 items-center justify-center rounded-full border border-gray-200 text-gray-500 hover:bg-gray-100">
            <X className="size-4" />
          </button>
        </header>

        <form onSubmit={submit} className="flex min-h-0 flex-1 flex-col">
          <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-6 py-5">
            <div className="flex flex-wrap gap-2">
              {contact.phone && (
                <a href={whatsappLink(contact.phone, lead.nome)} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded-full bg-emerald-600 px-4 py-2 text-sm font-bold text-white hover:bg-emerald-700">
                  <MessageCircle className="size-4" /> Chamar no WhatsApp
                </a>
              )}
              {contact.email && (
                <a href={`mailto:${contact.email}`} className="inline-flex items-center gap-2 rounded-full border border-gray-200 px-4 py-2 text-sm font-bold text-[#00205C] hover:bg-gray-50">
                  <Mail className="size-4" /> Enviar e-mail
                </a>
              )}
            </div>

            <div>
              <span className={labelClass}>Etapa</span>
              <div className="flex flex-wrap gap-1.5">
                {LEAD_STATUSES.map((item) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => setStatus(item)}
                    className={`rounded-full px-3 py-1.5 text-xs font-bold transition ${status === item ? `${STATUS_META[item].chip} ring-2 ring-[#00205C]/30` : "bg-gray-100 text-gray-500 hover:bg-gray-200"}`}
                  >
                    {STATUS_META[item].label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <span className={labelClass}>Perfil</span>
              <div className="flex flex-wrap gap-1.5">
                {(["cliente", "empresa", "clube_nutri"] as const).map((item) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => setTipo(item)}
                    className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold transition ${tipo === item ? "bg-[#00205C] text-white" : "bg-gray-100 text-gray-500 hover:bg-gray-200"}`}
                  >
                    <span className={`h-1.5 w-4 rounded ${SEGMENT_LABEL_COLOR[item]!.bar}`} />
                    {SEGMENT_LABEL_COLOR[item]!.name}
                  </button>
                ))}
              </div>
            </div>

            <label className="block">
              <span className={labelClass}>Nome</span>
              <input value={nome} onChange={(e) => setNome(e.target.value)} className={fieldClass} />
            </label>
            {(tipo === "empresa" || lead.empresa_nome) && (
              <label className="block">
                <span className={labelClass}>Empresa</span>
                <input value={empresa} onChange={(e) => setEmpresa(e.target.value)} disabled={!migrated} className={fieldClass} placeholder="Nome da empresa" />
              </label>
            )}
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block">
                <span className={labelClass}>WhatsApp</span>
                <input value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} inputMode="tel" className={fieldClass} placeholder="(64) 99999-9999" />
              </label>
              <label className="block">
                <span className={labelClass}>E-mail</span>
                <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" disabled={!migrated} className={fieldClass} placeholder="nome@empresa.com.br" />
              </label>
            </div>

            <div className="rounded-2xl bg-gray-50 p-4 text-sm">
              <p className="text-xs font-bold uppercase text-gray-400">Respostas no chat</p>
              <p className="mt-2 text-gray-700">
                <span className="font-semibold text-[#00205C]">Volume:</span> {quantityOf(lead) || "—"}
              </p>
              <div className="mt-2 flex flex-wrap gap-1">
                {interests.length ? (
                  interests.map((interest) => (
                    <span key={interest} className="rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-gray-600 ring-1 ring-gray-200">
                      {interest}
                    </span>
                  ))
                ) : (
                  <span className="text-gray-400">Sem interesses informados</span>
                )}
              </div>
            </div>

            <label className="block">
              <span className={labelClass}>Anotações da equipe</span>
              <textarea
                value={observacoes}
                onChange={(e) => setObservacoes(e.target.value)}
                disabled={!migrated}
                rows={4}
                className={`${fieldClass} resize-none`}
                placeholder={migrated ? "Ex.: pediu orçamento de 50 kits para dezembro" : "Disponível depois da atualização do banco"}
              />
            </label>

            {formError && <p className="text-sm font-semibold text-red-600">{formError}</p>}
          </div>

          <footer className="flex items-center justify-between gap-3 border-t border-gray-100 px-6 py-4">
            {confirmDelete ? (
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-red-700">Excluir de vez?</span>
                <button type="button" onClick={onDelete} disabled={saving} className="rounded-full bg-red-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-red-700">Sim, excluir</button>
                <button type="button" onClick={() => setConfirmDelete(false)} className="rounded-full px-2 py-1.5 text-xs font-bold text-gray-500 hover:bg-gray-100">Não</button>
              </div>
            ) : (
              <button type="button" onClick={() => setConfirmDelete(true)} className="inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-xs font-bold text-red-600 hover:bg-red-50">
                <Trash2 className="size-3.5" /> Excluir
              </button>
            )}
            <button type="submit" disabled={saving} className="inline-flex items-center gap-2 rounded-full bg-[#00205C] px-6 py-2.5 text-sm font-bold text-white hover:bg-[#003380] disabled:opacity-50">
              {saving && <Loader2 className="size-4 animate-spin" />} Salvar
            </button>
          </footer>
        </form>
      </aside>
    </div>
  );
}
