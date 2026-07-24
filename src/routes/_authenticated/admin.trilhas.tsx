import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/admin/trilhas")({
  head: () => ({ meta: [{ title: "trilhas — Admin — Book Clube" }, { name: "robots", content: "noindex" }] }),
  component: () => (
    <div className="space-y-4">
      <h1 className="font-serif text-3xl font-bold capitalize">trilhas</h1>
      <p className="text-muted-foreground">Este módulo será entregue nas próximas fases.</p>
    </div>
  ),
});
