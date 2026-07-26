import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_admin/admin/livros")({
  head: () => ({ meta: [{ title: "livros — Admin — Book Clube" }, { name: "robots", content: "noindex" }] }),
  component: () => (
    <div className="space-y-4">
      <h1 className="font-serif text-3xl font-bold capitalize">livros</h1>
      <p className="text-muted-foreground">Este módulo será entregue nas próximas fases.</p>
    </div>
  ),
});
