import { useEffect, useMemo, useState } from "react";
import { Building2, Download, Loader2, Mail, MessageCircle, RefreshCw, Search, Trash2, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
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

function StatusChip({ status }: { status: LeadStatus }) {
  const meta = STATUS_META[status];
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold ${meta.chip}`}>
      <span className={`size-1.5 rounded-full ${meta.dot}`} />
      {meta.label}
    </span>
  );
}

function StatusSelect({ value, onChange, disabled }: { value: LeadStatus; onChange: (status: LeadStatus) => void; disabled?: boolean }) {
  const meta = STATUS_META[value];
  return (
    <select
      value={value}
      disabled={disabled}
      onClick={(event) => event.stopPropagation()}
      onChange={(event) => onChange(event.target.value as LeadStatus)}
      aria-label="Status do lead"
      className={`cursor-pointer appearance-none rounded-full border-0 py-1 pl-3 pr-7 text-xs font-bold outline-none ring-[#42C8E5] focus:ring-2 disabled:opacity-60 ${meta.chip}`}
      style={{
        backgroundImage:
          "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='10' viewBox='0 0 24 24' fill='none' stroke='%2300205C' stroke-width='3'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E\")",
        backgroundRepeat: "no-repeat",
        backgroundPosition: "right 10px center",
      }}
    >
      {LEAD_STATUSES.map((status) => (
        <option key={status} value={status}>
          {STATUS_META[status].label}
        </option>
      ))}
    </select>
  );
}

export function LeadsPanel() {
  const [leads, setLeads] = useState<ChatLeadRow[]>([]);
  const [migrated, setMigrated] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [segment, setSegment] = useState<SegmentFilter>("todos");
  const [statusFilter, setStatusFilter] = useState<LeadStatus | "todos">("todos");
  const [query, setQuery] = useState("");
  const [savingId, setSavingId] = useState<string | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const [toast, setToast] = useState("");

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

  async function saveLead(id: string, patch: LeadPatch) {
    setSavingId(id);
    const previous = leads;
    setLeads((list) => list.map((lead) => (lead.id === id ? ({ ...lead, ...patch } as ChatLeadRow) : lead)));
    try {
      const result = await updateChatLead({ data: { accessToken: await getToken(), id, patch } });
      setToast(
        result.skipped.length
          ? "Salvo. Empresa, e-mail e anotações só serão guardados depois de rodar a atualização do banco."
          : "Alterações salvas",
      );
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
      setToast("Lead excluído");
    } catch (err) {
      setToast(err instanceof Error ? err.message : "Não foi possível excluir.");
    } finally {
      setSavingId(null);
    }
  }

  const bySegment = useMemo(
    () => (segment === "todos" ? leads : leads.filter((lead) => normalizeTipo(lead.tipo) === segment)),
    [leads, segment],
  );

  const statusCounts = useMemo(() => {
    const counts = Object.fromEntries(LEAD_STATUSES.map((status) => [status, 0])) as Record<LeadStatus, number>;
    bySegment.forEach((lead) => {
      counts[statusOf(lead)] += 1;
    });
    return counts;
  }, [bySegment]);

  const visible = useMemo(() => {
    const term = query.trim().toLowerCase();
    return bySegment.filter((lead) => {
      if (statusFilter !== "todos" && statusOf(lead) !== statusFilter) return false;
      if (!term) return true;
      const contact = contactOf(lead);
      return [lead.nome, lead.empresa_nome, contact.phone, contact.email, lead.observacoes]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(term));
    });
  }, [bySegment, statusFilter, query]);

  function exportCsv() {
    const header = ["Data", "Perfil", "Nome", "Empresa", "WhatsApp", "E-mail", "Volume", "Interesses", "Status", "Anotações"];
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
    <div className="space-y-6">
      <div className="flex justify-end">
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => void load()}
            className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-4 py-2.5 text-sm font-bold text-[#00205C] transition hover:bg-gray-50"
          >
            <RefreshCw className={`size-4 ${loading ? "animate-spin" : ""}`} /> Atualizar
          </button>
          <button
            type="button"
            onClick={exportCsv}
            disabled={visible.length === 0}
            className="inline-flex items-center gap-2 rounded-full bg-[#00205C] px-4 py-2.5 text-sm font-bold text-white transition hover:bg-[#003380] disabled:opacity-40"
          >
            <Download className="size-4" /> Exportar
          </button>
        </div>
      </div>

      {!migrated && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-900">
          <strong>Falta uma atualização no banco.</strong> Rode no Supabase o arquivo{" "}
          <code className="rounded bg-white/70 px-1.5 py-0.5 text-xs">supabase/migrations/20261016_leads_empresa_email.sql</code>{" "}
          para guardar nome da empresa, e-mail e anotações em campos próprios.
        </div>
      )}

      {/* RESUMO POR STATUS */}
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-6">
        <button
          type="button"
          onClick={() => setStatusFilter("todos")}
          className={`rounded-2xl border p-4 text-left transition ${statusFilter === "todos" ? "border-[#00205C] bg-white shadow-sm" : "border-gray-200 bg-white hover:border-gray-300"}`}
        >
          <p className="text-[11px] font-bold uppercase text-gray-500">Total</p>
          <p className="mt-1 text-2xl font-bold text-[#00205C]">{bySegment.length}</p>
        </button>
        {LEAD_STATUSES.map((status) => (
          <button
            key={status}
            type="button"
            onClick={() => setStatusFilter(statusFilter === status ? "todos" : status)}
            className={`rounded-2xl border p-4 text-left transition ${statusFilter === status ? "border-[#00205C] bg-white shadow-sm" : "border-gray-200 bg-white hover:border-gray-300"}`}
          >
            <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase text-gray-500">
              <span className={`size-1.5 rounded-full ${STATUS_META[status].dot}`} />
              {STATUS_META[status].label}
            </p>
            <p className="mt-1 text-2xl font-bold text-[#00205C]">{statusCounts[status]}</p>
          </button>
        ))}
      </div>

      <section className="overflow-hidden rounded-[2rem] border border-gray-200 bg-white shadow-sm">
        {/* FILTROS */}
        <div className="flex flex-col gap-3 border-b border-gray-100 p-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div className="flex flex-wrap gap-1.5">
            {SEGMENTS.map((item) => (
              <button
                key={item.value}
                type="button"
                onClick={() => setSegment(item.value)}
                className={`rounded-full px-3.5 py-1.5 text-xs font-bold transition ${segment === item.value ? "bg-[#00205C] text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}
              >
                {item.label}
              </button>
            ))}
          </div>
          <label className="relative block sm:w-72">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-gray-400" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Buscar nome, empresa, contato…"
              className="w-full rounded-full border border-gray-200 bg-gray-50 py-2.5 pl-10 pr-4 text-sm outline-none focus:border-[#42C8E5] focus:bg-white"
            />
          </label>
        </div>

        {error ? (
          <p className="p-8 text-center text-sm font-semibold text-red-600">{error}</p>
        ) : loading && leads.length === 0 ? (
          <div className="flex items-center justify-center gap-2 p-12 text-sm text-gray-500">
            <Loader2 className="size-4 animate-spin" /> Carregando leads…
          </div>
        ) : visible.length === 0 ? (
          <div className="p-12 text-center">
            <p className="font-bold text-[#00205C]">{leads.length === 0 ? "Nenhum lead ainda" : "Nenhum lead com esses filtros"}</p>
            <p className="mt-1 text-sm text-gray-500">
              {leads.length === 0 ? "Assim que alguém concluir o chat do site, o cadastro aparece aqui." : "Ajuste os filtros ou a busca."}
            </p>
          </div>
        ) : (
          <>
            {/* TABELA (DESKTOP) */}
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full text-left text-sm">
                <thead className="bg-gray-50 text-xs uppercase text-gray-400">
                  <tr>
                    <th className="px-6 py-3 font-bold">Data</th>
                    <th className="px-4 py-3 font-bold">Lead</th>
                    <th className="px-4 py-3 font-bold">Contato</th>
                    <th className="px-4 py-3 font-bold">Volume</th>
                    <th className="px-4 py-3 font-bold">Interesses</th>
                    <th className="px-6 py-3 font-bold">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {visible.map((lead) => {
                    const contact = contactOf(lead);
                    const interests = interestsOf(lead);
                    return (
                      <tr
                        key={lead.id}
                        onClick={() => setOpenId(lead.id)}
                        className="cursor-pointer border-t border-gray-100 align-top transition hover:bg-[#42C8E5]/5"
                      >
                        <td className="whitespace-nowrap px-6 py-4 text-xs text-gray-500">{dateFormatter.format(new Date(lead.created_at))}</td>
                        <td className="px-4 py-4">
                          <p className="font-bold text-[#00205C]">{lead.nome}</p>
                          <p className="mt-0.5 flex items-center gap-1.5 text-xs text-gray-500">
                            <span className="font-semibold">{TIPO_LABEL[lead.tipo] || lead.tipo}</span>
                            {lead.empresa_nome && (
                              <>
                                · <Building2 className="size-3" /> {lead.empresa_nome}
                              </>
                            )}
                          </p>
                        </td>
                        <td className="px-4 py-4">
                          {contact.phone && (
                            <a
                              href={whatsappLink(contact.phone, lead.nome)}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(event) => event.stopPropagation()}
                              className="flex items-center gap-1.5 whitespace-nowrap font-semibold text-[#00205C] hover:text-emerald-700"
                            >
                              <MessageCircle className="size-3.5 text-emerald-600" /> {formatPhone(contact.phone)}
                            </a>
                          )}
                          {contact.email && (
                            <a
                              href={`mailto:${contact.email}`}
                              onClick={(event) => event.stopPropagation()}
                              className="mt-0.5 flex items-center gap-1.5 text-xs font-semibold text-[#00205C] hover:underline"
                            >
                              <Mail className="size-3.5 text-[#42C8E5]" /> {contact.email}
                            </a>
                          )}
                        </td>
                        <td className="whitespace-nowrap px-4 py-4 text-gray-600">{quantityOf(lead) || "—"}</td>
                        <td className="max-w-xs px-4 py-4">
                          <div className="flex flex-wrap gap-1">
                            {interests.length ? (
                              interests.map((interest) => (
                                <span key={interest} className="rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-semibold text-gray-600">
                                  {interest}
                                </span>
                              ))
                            ) : (
                              <span className="text-gray-400">—</span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <StatusSelect
                            value={statusOf(lead)}
                            disabled={savingId === lead.id}
                            onChange={(status) => void saveLead(lead.id, { status })}
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* CARTÕES (CELULAR) */}
            <div className="divide-y divide-gray-100 md:hidden">
              {visible.map((lead) => {
                const contact = contactOf(lead);
                return (
                  <button
                    key={lead.id}
                    type="button"
                    onClick={() => setOpenId(lead.id)}
                    className="flex w-full items-start justify-between gap-3 p-4 text-left"
                  >
                    <div className="min-w-0">
                      <p className="font-bold text-[#00205C]">{lead.nome}</p>
                      <p className="mt-0.5 truncate text-xs text-gray-500">
                        {TIPO_LABEL[lead.tipo] || lead.tipo}
                        {lead.empresa_nome ? ` · ${lead.empresa_nome}` : ""}
                      </p>
                      <p className="mt-1 truncate text-xs font-semibold text-[#00205C]">
                        {contact.phone ? formatPhone(contact.phone) : contact.email}
                      </p>
                      <p className="mt-1 text-[11px] text-gray-400">{dateFormatter.format(new Date(lead.created_at))}</p>
                    </div>
                    <StatusChip status={statusOf(lead)} />
                  </button>
                );
              })}
            </div>
          </>
        )}
      </section>

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
              <span className={labelClass}>Status</span>
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

            <label className="block">
              <span className={labelClass}>Nome</span>
              <input value={nome} onChange={(e) => setNome(e.target.value)} className={fieldClass} />
            </label>
            {(normalizeTipo(lead.tipo) === "empresa" || lead.empresa_nome) && (
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
