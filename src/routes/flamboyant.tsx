import { createFileRoute } from "@tanstack/react-router";
import { HomePage } from "@/components/home-page";

export const Route = createFileRoute("/flamboyant")({
  head: () => ({
    meta: [
      { title: "Goldko Flamboyant — Alimentação que move pessoas" },
      {
        name: "description",
        content:
          "Goldko Flamboyant: soluções práticas, nutritivas e acessíveis para clientes, nutricionistas, empresas e delivery.",
      },
      { property: "og:title", content: "Goldko Flamboyant — Alimentação que move pessoas" },
      { property: "og:description", content: "Uma Goldko para cada momento do seu dia." },
    ],
  }),
  component: FlamboyantPage,
});

function FlamboyantPage() {
  return <HomePage pageId="flamboyant" />;
}
