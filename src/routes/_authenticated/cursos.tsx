import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BookOpen, User } from "lucide-react";

export const Route = createFileRoute("/_authenticated/cursos")({
  head: () => ({
    meta: [
      { title: "Cursos — Book Team" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: CursosPage,
});

type Nivel = {
  id: string;
  nome: string | null;
};

type Livro = {
  id: string;
  titulo: string | null;
  descricao: string | null;
  nivel_id: string | null;
  autor: string | null;
  status?: string | null;
  nivel?: Nivel | null;
};

function CursosPage() {
  const { data: livros = [], isLoading } = useQuery({
    queryKey: ["cursos"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("livros")
        .select("id, titulo, descricao, nivel_id, autor, status, nivel:niveis_trilha(id, nome)")
        .eq("status", "ativo")
        .order("titulo");

      if (error) throw error;
      return (data ?? []) as unknown as Livro[];
    },
  });

  // Agrupar por nível
  const porNivel = livros.reduce(
    (acc, livro) => {
      const nivel = livro.nivel?.nome || "Sem categoria";
      if (!acc[nivel]) acc[nivel] = [];
      acc[nivel].push(livro);
      return acc;
    },
    {} as Record<string, Livro[]>
  );

  const niveis = Object.keys(porNivel).sort();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-3xl font-bold">Cursos</h1>
        <p className="text-sm text-muted-foreground">
          Conheça todos os cursos disponíveis na plataforma.
        </p>
      </div>

      {isLoading && (
        <p className="text-sm text-muted-foreground">Carregando cursos…</p>
      )}

      {!isLoading && livros.length === 0 && (
        <Card>
          <CardContent className="p-6 text-sm text-muted-foreground">
            Nenhum curso disponível no momento.
          </CardContent>
        </Card>
      )}

      {!isLoading && niveis.map((nivel) => (
        <div key={nivel} className="space-y-3">
          <h2 className="font-serif text-xl font-semibold text-gold">{nivel}</h2>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {porNivel[nivel].map((livro) => (
              <Card key={livro.id} className="flex flex-col">
                <CardContent className="flex-1 space-y-3 p-4">
                  {/* Status */}
                  <div>
                    <Badge className="bg-green-500 gap-1">
                      <BookOpen className="h-3 w-3" />
                      Disponível
                    </Badge>
                  </div>

                  {/* Título */}
                  <div>
                    <p className="font-serif text-lg font-semibold line-clamp-2">
                      {livro.titulo || "Sem título"}
                    </p>
                  </div>

                  {/* Autor */}
                  {livro.autor && (
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <User className="h-3 w-3" />
                      {livro.autor}
                    </div>
                  )}

                  {/* Descrição */}
                  {livro.descricao && (
                    <p className="text-xs text-muted-foreground line-clamp-3">
                      {livro.descricao}
                    </p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
