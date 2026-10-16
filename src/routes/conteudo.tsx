import { createFileRoute } from "@tanstack/react-router";
import { ContentPanel } from "@/components/content-panel";

export const Route = createFileRoute("/conteudo")({
  head: () => ({ meta: [{ title: "Painel de conteúdo — GoldKo Rio Verde" }] }),
  component: ContentPanel,
});
