import { createFileRoute } from "@tanstack/react-router";
import { ListTodo } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export const Route = createFileRoute("/_authenticated/tarefas")({
  head: () => ({
    meta: [
      { title: "Tarefas — Book Team" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: TarefasPage,
});

function TarefasPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-3xl font-bold">Tarefas</h1>
        <p className="text-sm text-muted-foreground">
          Acompanhe as tarefas dos seus cursos e turmas.
        </p>
      </div>

      <Card>
        <CardContent className="flex min-h-48 flex-col items-center justify-center p-6 text-center">
          <ListTodo className="mb-3 h-10 w-10 text-muted-foreground" />
          <p className="font-medium">Nenhuma tarefa disponível</p>
          <p className="mt-1 text-sm text-muted-foreground">
            As tarefas liberadas para você aparecerão aqui.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
