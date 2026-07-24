import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/certificados")({
  head: () => ({ meta: [{ title: "Certificados — Book Clube" }, { name: "robots", content: "noindex" }] }),
  component: () => (
    <div className="space-y-4">
      <h1 className="font-serif text-3xl font-bold">Certificados</h1>
      <p className="text-muted-foreground">Ao concluir trilhas, seus certificados ficarão disponíveis aqui.</p>
    </div>
  ),
});
