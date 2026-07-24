import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/pagamentos")({
  head: () => ({ meta: [{ title: "Pagamentos — Book Clube" }, { name: "robots", content: "noindex" }] }),
  component: () => (
    <div className="space-y-4">
      <h1 className="font-serif text-3xl font-bold">Pagamentos</h1>
      <p className="text-muted-foreground">Seus pagamentos e comprovantes aparecerão aqui.</p>
    </div>
  ),
});
