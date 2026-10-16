import { createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";

export const Route = createFileRoute("/onboarding")({
  head: () => ({
    meta: [
      { title: "Goldko — Atendimento Personalizado" },
      {
        name: "description",
        content: "Converse com a nossa equipe no chat personalizado GoldKo.",
      },
    ],
  }),
  component: OnboardingPage,
});

function OnboardingPage() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    const search = window.location.search;
    // Redireciona instantaneamente para a página principal abrindo o chat conversacional
    window.location.replace(`/${search || "?chat=true"}`);
  }, []);

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#00205C] text-white">
      <div className="text-center">
        <p className="font-display text-2xl font-bold uppercase tracking-wider text-white">
          GoldKo
        </p>
        <p className="mt-2 text-sm text-[#42C8E5]">
          Redirecionando para o atendimento personalizado…
        </p>
      </div>
    </div>
  );
}
