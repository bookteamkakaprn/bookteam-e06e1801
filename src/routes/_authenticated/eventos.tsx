import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/eventos")({
  head: () => ({ meta: [{ title: "Encontros — Book Clube" }, { name: "robots", content: "noindex" }] }),
  component: () => (
    <div className="space-y-4">
      <h1 className="font-serif text-3xl font-bold">Encontros</h1>
      <p className="text-muted-foreground">A lista de encontros com inscrição estará disponível em breve.</p>
    </div>
  ),
});
