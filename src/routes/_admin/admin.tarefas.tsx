import { createFileRoute } from "@tanstack/react-router";
import { ListTodo } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const Route = createFileRoute("/_admin/admin/tarefas")({
  component: AdminTarefasPage,
});

function AdminTarefasPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-3xl font-bold">Tarefas</h1>
        <p className="text-sm text-muted-foreground">
          Área para acompanhar e administrar as tarefas dos alunos.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ListTodo className="h-5 w-5" />
            Tarefas dos cursos
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border border-dashed p-6 text-center">
            <p className="font-medium">Nenhuma tarefa cadastrada</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Esta aba já está disponível no painel. O cadastro e o acompanhamento das tarefas serão vinculados aos cursos e turmas.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
