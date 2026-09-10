import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, MapPin, Users, DollarSign } from "lucide-react";

export const Route = createFileRoute("/_authenticated/turmas")({
  head: () => ({
    meta: [
      { title: "Turmas abertas — Book Team" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: TurmasPage,
});

type Turma = {
  id: string;
  nome: string | null;
  data_inicio: string | null;
  data_fim: string | null;
  horario: string | null;
  sala: string | null;
  categoria: string | null;
  valor: number | null;
  vagas: number | null;
  ativo: boolean;
  livro?: { titulo: string | null } | null;
};

function TurmasPage() {
  const { data: turmas = [], isLoading } = useQuery({
    queryKey: ["turmas-abertas"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("turmas")
        .select("id, nome, data_inicio, data_fim, horario, sala, categoria, valor, vagas, ativo, livro:livros(titulo)")
        .gt("vagas", 0)
        .eq("ativo", true)
        .order("data_inicio");

      if (error) throw error;
      return (data ?? []) as unknown as Turma[];
    },
  });

  const fmtData = (data: string) =>
    new Date(data + "T00:00:00").toLocaleDateString("pt-BR", {
      weekday: "short",
      day: "2-digit",
      month: "short",
    });

  const getBadgeCategoria = (categoria: string | null) => {
    const cores: Record<string, string> = {
      "Mulheres": "bg-pink-500",
      "Homens": "bg-blue-500",
      "Mulheres solteiras": "bg-rose-500",
      "Misto": "bg-purple-500",
      "Família": "bg-green-500",
      "Ministério (Staff)": "bg-orange-500",
    };
    return cores[categoria || ""] || "bg-gray-500";
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-3xl font-bold">Turmas abertas</h1>
        <p className="text-sm text-muted-foreground">
          Confira todas as turmas disponíveis com vagas abertas.
        </p>
      </div>

      {isLoading && (
        <p className="text-sm text-muted-foreground">Carregando turmas...</p>
      )}

      {!isLoading && turmas.length === 0 && (
        <Card>
          <CardContent className="p-6 text-sm text-muted-foreground">
            Nenhuma turma com vagas abertas no momento.
          </CardContent>
        </Card>
      )}

      <div className="space-y-3">
        {turmas.map((turma) => (
          <Card key={turma.id}>
            <CardContent className="space-y-3 p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0 flex-1">
                  {/* Curso */}
                  {turma.livro?.titulo && (
                    <p className="text-xs font-semibold uppercase tracking-wider text-gold">
                      {turma.livro.titulo}
                    </p>
                  )}

                  {/* Nome da turma */}
                  <p className="font-serif text-lg font-semibold truncate">
                    {turma.nome || "Turma sem nome"}
                  </p>

                  {/* Categoria */}
                  {turma.categoria && (
                    <div className="mt-2">
                      <Badge className={`${getBadgeCategoria(turma.categoria)} text-white`}>
                        {turma.categoria}
                      </Badge>
                    </div>
                  )}

                  {/* Detalhes */}
                  <div className="mt-3 grid gap-2 text-xs text-muted-foreground sm:grid-cols-2">
                    {turma.data_inicio && (
                      <span className="inline-flex items-center gap-1">
                        <Calendar className="h-3.5 w-3.5" />
                        {fmtData(turma.data_inicio)}
                        {turma.data_fim && turma.data_fim !== turma.data_inicio && (
                          <>
                            {" → "}
                            {fmtData(turma.data_fim)}
                          </>
                        )}
                      </span>
                    )}

                    {turma.horario && (
                      <span className="inline-flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5" />
                        {turma.horario}
                      </span>
                    )}

                    {turma.sala && (
                      <span className="inline-flex items-center gap-1">
                        <MapPin className="h-3.5 w-3.5" />
                        {turma.sala}
                      </span>
                    )}

                    {turma.vagas !== null && (
                      <span className="inline-flex items-center gap-1">
                        <Users className="h-3.5 w-3.5" />
                        {turma.vagas} vaga{turma.vagas !== 1 ? "s" : ""} disponível{turma.vagas !== 1 ? "s" : ""}
                      </span>
                    )}
                  </div>
                </div>

                {/* Valor */}
                {turma.valor !== null && (
                  <div className="flex items-center gap-1 font-serif text-lg font-semibold">
                    <DollarSign className="h-4 w-4" />
                    {Number(turma.valor).toLocaleString("pt-BR", {
                      style: "currency",
                      currency: "BRL",
                    })}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
