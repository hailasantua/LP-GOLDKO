import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ArrowLeft, ArrowRight, Building2, CalendarDays, Check, FileText, Loader2, Mail, Phone, Send, Sparkles, User, Users } from "lucide-react";
import { GoldkoSheet, SheetHeader, CloseButton } from "@/components/goldko-sheet";
import { submitLead } from "@/lib/leads.functions";
import { trackEvent } from "@/lib/tracking";

export function EventPartnershipModal({ open, onClose, trackingSource = "help_card" }: { open: boolean; onClose: () => void; trackingSource?: "hero" | "help_card" | "general" }) {
  const [company, setCompany] = useState("");
  const [eventName, setEventName] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [people, setPeople] = useState("");
  const [contactName, setContactName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [presentation, setPresentation] = useState<File | null>(null);
  const [formStep, setFormStep] = useState<1 | 2>(1);
  const startedRef = useRef(false);
  const submittedRef = useRef(false);
  const submitLeadFn = useServerFn(submitLead);
  const mutation = useMutation({
    mutationFn: submitLeadFn,
    onSuccess: () => { submittedRef.current = true; trackEvent("funnel_completed", { source: trackingSource, segment: "eventos" }); trackEvent("lead_submit", { source: trackingSource, segment: "eventos", form_name: "eventos_parcerias" }); },
    onError: () => trackEvent("lead_submit_error", { form_name: "eventos_parcerias" }),
  });

  const closeAsAbandoned = useCallback(() => {
    if (startedRef.current && !submittedRef.current) trackEvent("event_form_abandoned", { source: trackingSource, segment: "eventos" });
    onClose();
  }, [onClose, trackingSource]);

  const markStarted = useCallback(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    trackEvent("event_form_started", { source: trackingSource, segment: "eventos" });
  }, [trackingSource]);

  useEffect(() => {
    if (!open) return;
    startedRef.current = false;
    submittedRef.current = false;
    setFormStep(1);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const closeOnEscape = (event: KeyboardEvent) => event.key === "Escape" && closeAsAbandoned();
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [open, closeAsAbandoned]);

  if (!open) return null;

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (formStep === 1) {
      setFormStep(2);
      return;
    }
    mutation.mutate({
      data: {
        name: contactName.trim(),
        email: email.trim(),
        phone: phone.trim() || undefined,
        interest: "empresa",
        message: [
          "Solicitação de evento ou parceria",
          `Empresa: ${company.trim()}`,
          `Evento: ${eventName.trim()}`,
          `Data: ${eventDate}`,
          `Quantidade estimada de pessoas: ${people}`,
          presentation ? `PDF informado: ${presentation.name}` : "PDF de apresentação: não informado",
        ].join("\n"),
      },
    });
  }

  const inputClass = "w-full rounded-2xl border border-[#E6E1D8] bg-white px-4 py-3 pl-11 text-base text-[#172033] outline-none transition placeholder:text-[#00205C]/35 focus:border-[#42C8E5] focus:ring-2 focus:ring-[#42C8E5]/20";
  const labelClass = "text-[13px] font-bold text-[#00205C]";
  const iconClass = "pointer-events-none absolute left-4 top-1/2 size-[18px] -translate-y-1/2 text-[#00205C]/45";

  return (
    <GoldkoSheet onBackdrop={closeAsAbandoned} maxWidth="max-w-xl">
      {mutation.isSuccess ? (
        <div className="relative flex min-h-96 flex-col items-center justify-center px-6 py-10 text-center">
          <div className="absolute right-4 top-4"><CloseButton onClick={onClose} /></div>
          <span className="flex size-16 items-center justify-center rounded-full bg-[#E1F5EE] text-[#0F6E56]"><Check className="size-8" /></span>
          <h2 className="mt-5 font-display text-3xl font-bold uppercase text-[#00205C]">Solicitação recebida</h2>
          <p className="mt-2 max-w-md text-[15px] text-[#4A5672]">Os dados do evento foram enviados para nossa equipe. Entraremos em contato pelos dados informados.</p>
          {presentation && <p className="mt-3 text-xs text-[#4A5672]">A equipe vai pedir o arquivo “{presentation.name}” durante o atendimento.</p>}
          <button type="button" onClick={onClose} className="mt-6 rounded-full bg-[#00205C] px-7 py-3 font-bold text-white transition hover:bg-[#003380]">Concluir</button>
        </div>
      ) : (
        <>
          <SheetHeader
            eyebrow="Eventos e parcerias"
            title="Conte sobre o seu evento"
            intro={formStep === 1 ? "Primeiro, os detalhes do evento." : "Agora, como falamos com você?"}
            onClose={closeAsAbandoned}
          />
          <div className="relative px-5 sm:px-8">
            <div className="flex items-center gap-2 text-xs font-semibold text-[#4A5672]">
              <span className={formStep === 1 ? "text-[#00205C]" : ""}>1. Evento</span>
              <span className="h-px flex-1 bg-[#E6E1D8]"><span className="block h-px bg-[#42C8E5] transition-all duration-500" style={{ width: formStep === 1 ? "50%" : "100%" }} /></span>
              <span className={formStep === 2 ? "text-[#00205C]" : ""}>2. Contato</span>
            </div>
          </div>

          <form onSubmit={handleSubmit} onChange={markStarted} className="relative min-h-0 flex-1 overflow-y-auto px-5 pb-7 pt-5 sm:px-8 sm:pb-8">
            {formStep === 1 ? (
              <div className="grid gap-4 sm:grid-cols-2 animate-in fade-in slide-in-from-right-2 duration-300">
                <label className="space-y-1.5"><span className={labelClass}>Nome da empresa</span><div className="relative"><Building2 className={iconClass} /><input required value={company} onChange={(e) => setCompany(e.target.value)} className={inputClass} placeholder="Sua empresa" /></div></label>
                <label className="space-y-1.5"><span className={labelClass}>Nome do evento</span><div className="relative"><Sparkles className={iconClass} /><input required value={eventName} onChange={(e) => setEventName(e.target.value)} className={inputClass} placeholder="Convenção anual" /></div></label>
                <label className="space-y-1.5"><span className={labelClass}>Data do evento</span><div className="relative"><CalendarDays className={iconClass} /><input required type="date" value={eventDate} onChange={(e) => setEventDate(e.target.value)} className={inputClass} /></div></label>
                <label className="space-y-1.5"><span className={labelClass}>Quantidade estimada</span><div className="relative"><Users className={iconClass} /><input required min="1" type="number" inputMode="numeric" value={people} onChange={(e) => setPeople(e.target.value)} className={inputClass} placeholder="Número de pessoas" /></div></label>
                <label className="space-y-1.5 sm:col-span-2"><span className={labelClass}>PDF de apresentação <span className="font-medium text-[#4A5672]">(opcional)</span></span><span className="flex cursor-pointer items-center gap-3 rounded-2xl border border-dashed border-[#00205C]/20 bg-white/80 px-4 py-3.5 text-sm font-semibold text-[#00205C] transition hover:border-[#00205C]/50"><FileText className="size-[18px] text-[#00205C]/45" /><span className="min-w-0 flex-1 truncate">{presentation?.name || "Selecionar arquivo PDF"}</span><input type="file" accept="application/pdf,.pdf" className="sr-only" onChange={(e) => setPresentation(e.target.files?.[0] || null)} /></span></label>
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 animate-in fade-in slide-in-from-right-2 duration-300">
                <label className="space-y-1.5 sm:col-span-2"><span className={labelClass}>Pessoa de contato</span><div className="relative"><User className={iconClass} /><input required autoFocus value={contactName} onChange={(e) => setContactName(e.target.value)} className={inputClass} placeholder="Nome completo" /></div></label>
                <label className="space-y-1.5"><span className={labelClass}>Telefone</span><div className="relative"><Phone className={iconClass} /><input required type="tel" inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} className={inputClass} placeholder="(00) 00000-0000" /></div></label>
                <label className="space-y-1.5"><span className={labelClass}>E-mail</span><div className="relative"><Mail className={iconClass} /><input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={inputClass} placeholder="voce@empresa.com.br" /></div></label>
              </div>
            )}

            {mutation.isError && <p className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">Não foi possível enviar agora. Confira os dados e tente novamente.</p>}

            <div className="mt-6 flex items-center gap-3">
              {formStep === 2 && (
                <button type="button" onClick={() => setFormStep(1)} className="inline-flex items-center gap-2 rounded-full border border-[#E6E1D8] bg-white px-5 py-3.5 text-sm font-bold text-[#00205C] transition hover:border-[#00205C]/40">
                  <ArrowLeft className="size-4" /> Voltar
                </button>
              )}
              <button type="submit" disabled={mutation.isPending} className="inline-flex flex-1 items-center justify-center gap-2 rounded-full bg-[#00205C] px-6 py-3.5 text-[15px] font-bold text-white transition hover:bg-[#003380] disabled:bg-[#00205C]/40">
                {formStep === 1 ? (
                  <>Continuar <ArrowRight className="size-4" /></>
                ) : mutation.isPending ? (
                  <><Loader2 className="size-5 animate-spin" /> Enviando…</>
                ) : (
                  <><Send className="size-4" /> Enviar solicitação</>
                )}
              </button>
            </div>
          </form>
        </>
      )}
    </GoldkoSheet>
  );
}
