import { createFileRoute } from "@tanstack/react-router";
import { HomePage } from "@/components/home-page";

export const Route = createFileRoute("/buriti")({
  head: () => ({
    meta: [
      { title: "Goldko Buriti — Alimentação que move pessoas" },
      {
        name: "description",
        content:
          "Goldko Buriti: soluções práticas, nutritivas e acessíveis para clientes, nutricionistas, empresas e delivery.",
      },
      { property: "og:title", content: "Goldko Buriti — Alimentação que move pessoas" },
      { property: "og:description", content: "Uma Goldko para cada momento do seu dia." },
    ],
  }),
  component: BuritiPage,
});

function BuritiPage() {
  return <HomePage pageId="buriti" />;
}
