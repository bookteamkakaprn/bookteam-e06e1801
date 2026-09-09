import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { BookOpen, Loader2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/cursos")({
  head: () => ({
    meta: [
      { title: "Cursos — Book Team" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: CursosPage,
});

type Livro = {
  id: string;
  titulo: string;
  autor: string | null;
  imagem_url: string | null;
  descricao: string | null;
  categoria: string | null;
  trilha_id: string | null;
  ordem: number;
  status: string;
  trilhas?: { nome: string; nivel: string | null } | null;
};

function CursosPage() {
  const [busca, setBusca] = useState("");

  const { data: cursos = [], isLoading } = useQuery({
    queryKey: ["aluno-cursos"],

    queryFn: async () => {
      const { data, error } = await supabase
        .from("livros")
        .select("*, trilhas(nome, nivel)")
        .order("ordem");

      if (error) throw error;
      return (data ?? []) as unknown as Livro[];
    },
  });

  const cursosFiltrados = useMemo(() => {
    if (!busca.trim()) return cursos;
    const termo = busca.toLowerCase();
    return cursos.filter(
      (c) =>
        c.titulo.toLowerCase().includes(termo) ||
        c.autor?.toLowerCase().includes(termo) ||
        c.categoria?.toLowerCase().includes(termo)
    );
  }, [cursos, busca]);

  const cursosPorNivel = useMemo(() => {
    const grupos: { [key: string]: Livro[] } = {};

    cursosFiltrados.forEach((curso) => {
      const nivel = curso.trilhas?.nivel || "Sem nível";
      if (!grupos[nivel]) grupos[nivel] = [];
      grupos[nivel].push(curso);
    });

    return grupos;
  }, [cursosFiltrados]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-3xl font-bold">Cursos disponíveis</h1>
        <p className="text-sm text-muted-foreground">
          Explore nossos cursos e conheça cada trilha de aprendizado.
        </p>
      </div>

      {/* BUSCA */}
      <div>
        <Input
          placeholder="Buscar por nome, autor ou categoria..."
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          className="max-w-md"
        />
      </div>

      {isLoading && (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      )}

      {!isLoading && Object.entries(cursosPorNivel).map(([nivel, cursosNivel]) => (
        <div key={nivel} className="space-y-3">
          <h2 className="font-serif text-xl font-semibold">{nivel}</h2>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {cursosNivel.map((curso) => (
              <Card
                key={curso.id}
                className="overflow-hidden hover:border-primary/50 transition-colors"
              >
                {curso.imagem_url && (
                  <div className="aspect-video w-full overflow-hidden bg-secondary">
                    <img
                      src={curso.imagem_url}
                      alt={curso.titulo}
                      className="h-full w-full object-cover"
                    />
                  </div>
                )}

                <CardHeader className="pb-3">
                  <div className="space-y-1">
                    <CardTitle className="line-clamp-2 text-base">
                      {curso.titulo}
                    </CardTitle>

                    {curso.autor && (
                      <p className="text-xs text-muted-foreground">
                        Por {curso.autor}
                      </p>
                    )}

                    <div className="flex flex-wrap gap-1 pt-2">
                      {curso.categoria && (
                        <Badge variant="outline" className="text-xs">
                          {curso.categoria}
                        </Badge>
                      )}

                      {curso.status === "ativo" && (
                        <Badge className="bg-green-500/20 text-green-700 text-xs">
                          Ativo
                        </Badge>
                      )}
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="space-y-3">
                  {curso.descricao && (
                    <p className="text-sm line-clamp-3 text-muted-foreground">
                      {curso.descricao}
                    </p>
                  )}

                  <Button size="sm" variant="outline" className="w-full" asChild>
                    <Link to={`/eventos`}>Ver turmas abertas</Link>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      ))}

      {!isLoading && cursosFiltrados.length === 0 && (
        <Card>
          <CardContent className="py-8 text-center text-sm text-muted-foreground">
            <BookOpen className="mx-auto mb-2 h-8 w-8 opacity-50" />
            Nenhum curso encontrado com sua busca.
          </CardContent>
        </Card>
      )}
    </div>
  );
}
