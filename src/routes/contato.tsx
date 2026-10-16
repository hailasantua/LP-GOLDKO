import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowLeft, Check, Loader2 } from "lucide-react";

import { submitLead } from "@/lib/leads.functions";
import { trackEvent } from "@/lib/tracking";

const schema = z.object({
  name: z.string().min(2, "Informe seu nome completo"),
  email: z.string().email("Informe um email válido"),
  phone: z.string().optional(),
  interest: z.enum(["cliente", "nutricionista", "empresa", "ifood", ""]),
  message: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

export const Route = createFileRoute("/contato")({
  head: () => ({
    meta: [
      { title: "Fale com a Goldko — Alimentação que move pessoas" },
      {
        name: "description",
        content:
          "Entre em contato com a Goldko. Tire dúvidas, solicite informações ou descubra a solução ideal para você, sua empresa ou seus pacientes.",
      },
      { property: "og:title", content: "Fale com a Goldko — Alimentação que move pessoas" },
      {
        property: "og:description",
        content: "Entre em contato e descubra a solução Goldko ideal para você.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Contato,
});

const interestOptions = [
  { value: "cliente", label: "Quero ser cliente" },
  { value: "nutricionista", label: "Sou nutricionista" },
  { value: "empresa", label: "Represento uma empresa" },
  { value: "ifood", label: "Tenho delivery no iFood" },
];

function Contato() {
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      interest: "",
      message: "",
    },
  });

  const submitLeadFn = useServerFn(submitLead);

  const mutation = useMutation({
    mutationFn: submitLeadFn,
    onSuccess: () => {
      trackEvent("lead_submit", { form_name: "contato" });
      reset();
    },
    onError: () => trackEvent("lead_submit_error", { form_name: "contato" }),
  });

  const onSubmit = (data: FormData) => {
    mutation.mutate({
      data: {
        name: data.name,
        email: data.email,
        phone: data.phone || undefined,
        interest: data.interest || undefined,
        message: data.message || undefined,
      },
    });
  };

  return (
    <main className="min-h-screen bg-background px-3 py-4 md:px-5 md:py-6 lg:px-6">
      <div className="mx-auto max-w-[1520px]">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          Voltar para home
        </Link>
      </div>

      <section className="mx-auto mt-6 max-w-[720px] rounded-4xl bg-card p-6 md:p-10">
        <h1 className="font-display text-3xl font-bold uppercase tracking-tight md:text-4xl">
          Fale com a <span className="text-brand">Goldko</span>
        </h1>
        <p className="mt-3 text-base leading-relaxed text-muted-foreground">
          Preencha o formulário abaixo. Nossa equipe entrará em contato em breve para entender como
          podemos ajudar você.
        </p>

        {mutation.isSuccess ? (
          <div className="mt-8 flex flex-col items-center rounded-3xl bg-surface p-8 text-center">
            <span className="flex size-14 items-center justify-center rounded-full bg-brand text-brand-foreground">
              <Check className="size-7" />
            </span>
            <h2 className="font-display mt-4 text-xl font-bold uppercase">Mensagem enviada!</h2>
            <p className="mt-2 text-muted-foreground">
              Agradecemos o contato. Retornaremos o mais breve possível.
            </p>
            <button
              onClick={() => mutation.reset()}
              className="mt-6 inline-flex items-center justify-center rounded-full bg-brand px-6 py-2.5 text-sm font-medium text-brand-foreground transition-transform hover:scale-[1.03]"
            >
              Enviar nova mensagem
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} className="mt-8 space-y-5">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-foreground">
                Nome
              </label>
              <input
                id="name"
                type="text"
                {...register("name")}
                className="mt-1.5 block w-full rounded-2xl border border-input bg-background px-4 py-3 text-base outline-none transition-colors focus:border-ring focus:ring-2 focus:ring-ring/20"
                placeholder="Seu nome completo"
              />
              {errors.name && (
                <p className="mt-1.5 text-sm text-destructive">{errors.name.message}</p>
              )}
            </div>

            <div className="grid gap-5 md:grid-cols-2">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-foreground">
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  {...register("email")}
                  className="mt-1.5 block w-full rounded-2xl border border-input bg-background px-4 py-3 text-base outline-none transition-colors focus:border-ring focus:ring-2 focus:ring-ring/20"
                  placeholder="seu@email.com"
                />
                {errors.email && (
                  <p className="mt-1.5 text-sm text-destructive">{errors.email.message}</p>
                )}
              </div>

              <div>
                <label htmlFor="phone" className="block text-sm font-medium text-foreground">
                  Telefone <span className="text-muted-foreground">(opcional)</span>
                </label>
                <input
                  id="phone"
                  type="tel"
                  {...register("phone")}
                  className="mt-1.5 block w-full rounded-2xl border border-input bg-background px-4 py-3 text-base outline-none transition-colors focus:border-ring focus:ring-2 focus:ring-ring/20"
                  placeholder="(00) 00000-0000"
                />
              </div>
            </div>

            <div>
              <label htmlFor="interest" className="block text-sm font-medium text-foreground">
                Você se interessa como
              </label>
              <select
                id="interest"
                {...register("interest")}
                className="mt-1.5 block w-full rounded-2xl border border-input bg-background px-4 py-3 text-base outline-none transition-colors focus:border-ring focus:ring-2 focus:ring-ring/20"
              >
                <option value="">Selecione uma opção</option>
                {interestOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="message" className="block text-sm font-medium text-foreground">
                Mensagem <span className="text-muted-foreground">(opcional)</span>
              </label>
              <textarea
                id="message"
                rows={4}
                {...register("message")}
                className="mt-1.5 block w-full resize-none rounded-2xl border border-input bg-background px-4 py-3 text-base outline-none transition-colors focus:border-ring focus:ring-2 focus:ring-ring/20"
                placeholder="Conte um pouco sobre o que você precisa"
              />
            </div>

            {mutation.isError && (
              <p className="text-sm text-destructive">
                {mutation.error?.message || "Ocorreu um erro. Tente novamente."}
              </p>
            )}

            <button
              type="submit"
              disabled={mutation.isPending}
              className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-brand px-6 py-3.5 text-base font-medium text-brand-foreground transition-transform hover:scale-[1.02] disabled:opacity-70 disabled:hover:scale-100 md:w-auto"
            >
              {mutation.isPending ? (
                <>
                  <Loader2 className="size-5 animate-spin" />
                  Enviando...
                </>
              ) : (
                "Enviar mensagem"
              )}
            </button>
          </form>
        )}
      </section>

      <footer className="mx-auto mt-10 max-w-[1520px] pb-6 text-center text-sm text-muted-foreground">
        © {new Date().getFullYear()} Goldko
      </footer>
    </main>
  );
}
