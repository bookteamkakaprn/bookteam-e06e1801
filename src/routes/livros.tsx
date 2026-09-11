import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { BookOpen, ChevronRight } from "lucide-react";

function LivrosPage() {
  const { data: livros = [], isLoading } = useQuery({
    queryKey: ["livros-page"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("livros")
        .select("id, titulo, autor, imagem_url, capa_url, status, categoria")
        .eq("status", "ativo")
        .order("ordem", { ascending: true });

      if (error) throw error;
      return data || [];
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="font-serif text-3xl font-bold">Livros</h1>
          <p className="text-sm text-muted-foreground">Conheça nossa biblioteca de cursos</p>
        </div>
        <Card>
          <CardContent className="p-6 text-sm text-muted-foreground">
            Carregando livros...
          </CardContent>
        </Card>
      </div>
    );
  }

  const livrosPorCategoria = livros.reduce((acc, livro) => {
    const cat = livro.categoria || "Sem categoria";
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(livro);
    return acc;
  }, {} as Record<string, any[]>);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-serif text-3xl font-bold">Livros e Cursos</h1>
        <p className="text-sm text-muted-foreground">
          Explore nossa biblioteca de cursos sobre consórcio, amor, honra e desenvolvimento pessoal
        </p>
      </div>

      {Object.entries(livrosPorCategoria).map(([categoria, livrosCategoria]) => (
        <div key={categoria} className="space-y-4">
          <h2 className="font-serif text-2xl font-semibold text-gold">{categoria}</h2>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {livrosCategoria.map((livro) => {
              const capa = livro.imagem_url || livro.capa_url;

              return (
                <Link
                  key={livro.id}
                  to={`/livros/${livro.id}`}
                  className="group"
                >
                  <Card className="h-full overflow-hidden transition-all hover:shadow-lg hover:border-gold/50">
                    <CardContent className="p-0">
                      {/* Imagem/Capa */}
                      <div className="relative aspect-[3/4] overflow-hidden bg-secondary">
                        {capa ? (
                          <img
                            src={capa}
                            alt={livro.titulo}
                            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center flex-col gap-2">
                            <BookOpen className="h-12 w-12 text-muted-foreground/50" />
                            <span className="text-xs text-muted-foreground text-center px-2">
                              Capa em breve
                            </span>
                          </div>
                        )}

                        {/* Gradient overlay */}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />

                        {/* Texto sobre a imagem */}
                        <div className="absolute bottom-0 left-0 right-0 p-4">
                          <p className="font-serif font-semibold text-white">{livro.titulo}</p>
                          {livro.autor && (
                            <p className="text-xs text-gold/80">{livro.autor}</p>
                          )}
                        </div>
                      </div>

                      {/* Badge e botão */}
                      <div className="flex items-center justify-between gap-2 border-t border-border/50 bg-card/50 p-3">
                        <Badge variant="secondary" className="text-xs">
                          {categoria}
                        </Badge>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="gap-1 group-hover:text-gold"
                          asChild
                        >
                          <span>
                            Ver
                            <ChevronRight className="h-3.5 w-3.5" />
                          </span>
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        </div>
      ))}

      {livros.length === 0 && (
        <Card>
          <CardContent className="p-6 text-center text-muted-foreground">
            <BookOpen className="mx-auto mb-4 h-12 w-12 opacity-50" />
            <p>Nenhum livro disponível no momento</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export const Route = createFileRoute("/livros")({
  head: () => ({ meta: [{ title: "Livros e Cursos — Book Team" }] }),
  component: LivrosPage,
});
