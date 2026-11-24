import { useState, type FormEvent, type ReactNode } from "react";
import { Check, ChevronRight, FileText, Loader2 } from "lucide-react";
import { primaryButtonClass } from "@/components/goldko-sheet";
import { createCustomerSignupServerFn } from "@/lib/chat-leads.functions";
import { currentStore, trackEvent } from "@/lib/tracking";

export type SignupKind = "fidelity" | "delivery" | "products";

const STORAGE_KEY = "gk_cliente_cadastro";

/** Nome de quem já se cadastrou neste navegador (null = ainda não). */
export function savedCustomerName(): string | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as { nome?: string }).nome || "" : null;
  } catch {
    return null;
  }
}

function saveCustomer(nome: string) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ nome, at: Date.now() }));
  } catch {
    /* navegador sem armazenamento: só pede de novo na próxima vez */
  }
}

function formatPhone(value: string) {
  const d = value.replace(/\D/g, "").slice(0, 11);
  if (d.length <= 2) return d;
  if (d.length <= 7) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

export const SIGNUP_COPY: Record<
  SignupKind,
  {
    eyebrow: string;
    title: ReactNode;
    subtitle: ReactNode;
    cta: string;
    skip?: string;
    done: string;
    next: string;
  }
> = {
  fidelity: {
    eyebrow: "Cartão Fidelidade",
    title: (
      <>
        Cadastre-se e ganhe <b>R$ 75</b> em compras
      </>
    ),
    subtitle:
      "A cada R$ 75 em compras você ganha 1 estrela. Com 10 estrelas, R$ 75 por nossa conta.",
    cta: "Quero meu cartão",
    done: "Agora é só ativar seu cartão no Fidelo, leva 1 minuto.",
    next: "Ativar meu cartão",
  },
  delivery: {
    eyebrow: "iFood",
    title: "Antes de ir para o iFood…",
    subtitle: (
      <>
        Cadastre-se e receba <b>promoções exclusivas</b> do iFood da GoldKo no seu WhatsApp.
      </>
    ),
    cta: "Quero as promoções",
    skip: "Ir direto para o iFood",
    done: "As promoções vão chegar no seu WhatsApp.",
    next: "Ir para o iFood",
  },
  products: {
    eyebrow: "Nossos produtos",
    title: "Receba o catálogo no seu WhatsApp",
    subtitle: "O catálogo completo da GoldKo, mais os lançamentos assim que chegarem na loja.",
    cta: "Receber no WhatsApp",
    skip: "Só baixar o PDF",
    done: "Nossa equipe vai te mandar o catálogo e os lançamentos no WhatsApp.",
    next: "Baixar o catálogo agora",
  },
};

const PERKS: Partial<Record<SignupKind, string[]>> = {
  delivery: [
    "Cupons que só quem é cadastrado recebe",
    "Aviso de lançamentos e sabores novos",
    "Promoções em datas especiais",
  ],
};

function Perk({ children }: { children: ReactNode }) {
  return (
    <li className="flex items-center gap-2.5 text-sm">
      <span className="grid size-[22px] shrink-0 place-items-center rounded-full bg-[#51b2dc]">
        <Check className="size-3 text-[#0d2b40]" strokeWidth={3.5} />
      </span>
      {children}
    </li>
  );
}

function FidelityCard({ name }: { name: string }) {
  return (
    <div className="flex flex-col gap-3.5 rounded-2xl bg-[#0d2b40] p-5 text-white">
      <div className="flex items-center justify-between gap-2">
        <span className="font-['Oswald'] text-lg font-bold tracking-wide">GOLDKO · FIDELIDADE</span>
        <span className="rounded-full bg-[#51b2dc] px-2.5 py-1 text-xs font-bold text-[#0d2b40]">
          R$ 75 de prêmio
        </span>
      </div>
      <div className="grid grid-cols-10 gap-1.5" aria-hidden="true">
        {Array.from({ length: 10 }, (_, index) => (
          <span
            key={index}
            className="aspect-square rounded-full border-[1.5px] border-dashed border-[#51b2dc]"
          />
        ))}
      </div>
      <div className="flex items-end justify-between gap-2">
        <span className="truncate text-lg font-bold">{name.trim() || "Seu nome aqui"}</span>
        <span className="shrink-0 text-xs text-[#a9c4d6]">10 estrelas = R$ 75</span>
      </div>
    </div>
  );
}

const inputClass =
  "h-12 w-full rounded-xl border-[1.5px] border-[#D9D6D0] bg-white px-3.5 text-base font-medium text-[#0d2b40] outline-none focus:border-[#51b2dc]";

export function CustomerSignup({
  kind,
  trackingSource,
  onSkip,
  onNext,
}: {
  kind: SignupKind;
  trackingSource: string;
  /** Pular o cadastro e seguir direto (iFood, PDF). */
  onSkip: () => void;
  /** Depois do cadastro: abrir o destino (Fidelo, iFood, PDF). */
  onNext: () => void;
}) {
  const copy = SIGNUP_COPY[kind];
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [consent, setConsent] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  const digits = phone.replace(/\D/g, "");
  const valid = name.trim().length >= 2 && digits.length >= 10 && consent;

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!valid || saving) return;
    setSaving(true);
    setError("");
    try {
      await createCustomerSignupServerFn({
        data: { nome: name.trim(), whatsapp: digits, origem: kind, loja: currentStore() },
      });
      saveCustomer(name.trim());
      trackEvent("lead_submit", {
        source: trackingSource,
        segment: "cliente",
        form_name: "cliente_cadastro",
        option: kind,
      });
      setDone(true);
    } catch {
      setError("Não deu para concluir agora. Confira o WhatsApp e tente de novo.");
    } finally {
      setSaving(false);
    }
  }

  if (done) {
    const first = name.trim().split(/\s+/)[0];
    return (
      <div className="flex flex-col gap-4">
        <div className="flex flex-col items-center gap-3 py-2 text-center">
          <span className="grid size-[72px] place-items-center rounded-full bg-[#51b2dc]">
            <Check className="size-9 text-[#0d2b40]" strokeWidth={2.8} />
          </span>
          <h3 className="text-2xl font-bold">Pronto, {first}!</h3>
          <p className="max-w-sm text-[15px] leading-relaxed text-[#3f4a52]">{copy.done}</p>
        </div>
        <button type="button" onClick={onNext} className={primaryButtonClass}>
          {copy.next} <ChevronRight className="size-[18px]" />
        </button>
        <p className="rounded-[14px] border border-[#D9D6D0] bg-white px-4 py-3 text-sm leading-relaxed">
          <b>Da próxima vez</b> o site já lembra de você: as opções abrem direto, sem pedir nome e
          WhatsApp de novo.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <h3 className="text-2xl font-bold leading-tight">{copy.title}</h3>
        <p className="text-[15px] leading-relaxed text-[#3f4a52]">{copy.subtitle}</p>
      </div>

      {kind === "fidelity" && <FidelityCard name={name} />}
      {PERKS[kind] && (
        <ul className="flex flex-col gap-2 rounded-2xl border-2 border-[#51b2dc] bg-[#E7F4FA] p-4">
          {PERKS[kind]!.map((perk) => (
            <Perk key={perk}>{perk}</Perk>
          ))}
        </ul>
      )}
      {kind === "products" && (
        <div className="flex items-center gap-3.5 rounded-2xl border-2 border-[#51b2dc] bg-[#E7F4FA] p-4">
          <span className="grid h-20 w-16 shrink-0 place-items-center rounded-lg border-[1.5px] border-[#D9D6D0] bg-white">
            <FileText className="size-7" strokeWidth={1.8} />
          </span>
          <span className="flex flex-col gap-1">
            <span className="text-base font-bold">Catálogo GoldKo · PDF</span>
            <span className="text-[13px] text-[#3f4a52]">
              Chocolates zero açúcar, kits e presentes
            </span>
          </span>
        </div>
      )}

      <label className="flex flex-col gap-1.5 text-[13px] font-bold">
        Seu nome
        <input
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Como podemos te chamar?"
          autoComplete="name"
          className={inputClass}
        />
      </label>
      <label className="flex flex-col gap-1.5 text-[13px] font-bold">
        WhatsApp
        <input
          value={phone}
          onChange={(event) => setPhone(formatPhone(event.target.value))}
          placeholder="(71) 90000-0000"
          inputMode="tel"
          autoComplete="tel"
          className={inputClass}
        />
      </label>
      <label className="flex items-start gap-2.5 text-xs leading-relaxed text-[#4f4f4a]">
        <input
          type="checkbox"
          checked={consent}
          onChange={(event) => setConsent(event.target.checked)}
          className="mt-0.5 size-[18px] shrink-0 accent-[#2a7fa8]"
        />
        Aceito receber novidades da GoldKo no WhatsApp. Sem spam, só coisa boa.
      </label>

      {error && <p className="text-sm font-semibold text-red-700">{error}</p>}

      <button type="submit" disabled={!valid || saving} className={primaryButtonClass}>
        {saving ? <Loader2 className="size-5 animate-spin" /> : null}
        {copy.cta} {!saving && <ChevronRight className="size-[18px]" />}
      </button>
      {copy.skip && (
        <button
          type="button"
          onClick={onSkip}
          className="self-center px-2 py-1 text-sm font-bold underline underline-offset-4"
        >
          {copy.skip}
        </button>
      )}
    </form>
  );
}
