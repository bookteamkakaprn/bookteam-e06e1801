import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ChevronLeft, ChevronRight } from "lucide-react";

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
  titulo: string | null;
  autor: string | null;
  imagem_url?: string | null;
  capa_url?: string | null;
  trilha_id?: string | null;
};

function CursosPage() {
  const scrollerRefJornada = useRef<HTMLDivElement>(null);
  const scrollerRefComplementares = useRef<HTMLDivElement>(null);

  // Buscar jornada (excluir complementares)
  const { data: livrosJornada = [], isLoading: loadingJornada } = useQuery({
    queryKey: ["cursos-jornada"],
    queryFn: async () => {
      // Buscar trilha "Jornada"
      const { data: trilhas } = await supabase
        .from("trilhas")
        .select("id")
        .ilike("nome", "%Jornada%")
        .not("nome", "ilike", "%Complementares%")
        .single();

      if (!trilhas) return [];

      // Buscar livros dessa trilha
      const { data, error } = await supabase
        .from("livros")
        .select("id, titulo, autor, imagem_url, capa_url")
        .eq("trilha_id", trilhas.id)
        .eq("status", "ativo")
        .order("ordem", { ascending: true });

      if (error) throw error;
      return data || [];
    },
  });

  // Buscar complementares
  const { data: livrosComplementares = [], isLoading: loadingComplementares } = useQuery({
    queryKey: ["cursos-complementares"],
    queryFn: async () => {
      // Buscar trilha "Cursos Complementares"
      const { data: trilhas } = await supabase
        .from("trilhas")
        .select("id")
        .ilike("nome", "%Cursos Complementares%")
        .single();

      if (!trilhas) return [];

      // Buscar livros dessa trilha
      const { data, error } = await supabase
        .from("livros")
        .select("id, titulo, autor, imagem_url, capa_url")
        .eq("trilha_id", trilhas.id)
        .eq("status", "ativo")
        .order("ordem", { ascending: true });

      if (error) throw error;
      return data || [];
    },
  });

  const scrollBy = (ref: React.RefObject<HTMLDivElement>, dir: 1 | -1) => {
    if (!ref.current) return;
    ref.current.scrollBy({ left: dir * ref.current.clientWidth * 0.8, behavior: "smooth" });
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-serif text-3xl font-bold">Cursos</h1>
        <p className="text-sm text-muted-foreground">
          Explore sua jornada de aprendizado
        </p>
      </div>

      {/* SEÇÃO 1: JORNADA */}
      {!loadingJornada && livrosJornada.length > 0 && (
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-serif text-2xl font-semibold">JORNADA DE CURSOS</h2>
            <div className="flex gap-2">
              <button
                onClick={() => scrollBy(scrollerRefJornada, -1)}
                className="flex h-10 w-10 items-center justify-center rounded-full border border-border/60 bg-card/60 hover:border-gold/40 hover:text-gold transition-all"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <button
                onClick={() => scrollBy(scrollerRefJornada, 1)}
                className="flex h-10 w-10 items-center justify-center rounded-full border border-border/60 bg-card/60 hover:border-gold/40 hover:text-gold transition-all"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>
          </div>

          <div
            ref={scrollerRefJornada}
            className="flex gap-4 overflow-x-auto pb-4 scrollbar-hidden"
          >
            {livrosJornada.map((livro) => (
              <div
                key={livro.id}
                className="shrink-0 w-[200px] md:w-[240px] flex flex-col gap-3 cursor-pointer group"
              >
                <div
                  className="aspect-[2/3] rounded-lg overflow-hidden bg-black/20 group-hover:shadow-lg transition-shadow"
                  style={{
                    backgroundImage:
                      livro.imagem_url || livro.capa_url
                        ? `url('${livro.imagem_url || livro.capa_url}')`
                        : undefined,
                    backgroundSize: "cover",
                    backgroundPosition: "center",
                  }}
                />
                <div>
                  <p className="font-semibold text-sm line-clamp-2">{livro.titulo}</p>
                  {livro.autor && <p className="text-xs text-muted-foreground">{livro.autor}</p>}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* SEÇÃO 2: CURSOS COMPLEMENTARES */}
      {!loadingComplementares && livrosComplementares.length > 0 && (
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-serif text-2xl font-semibold">CURSOS COMPLEMENTARES</h2>
            <div className="flex gap-2">
              <button
                onClick={() => scrollBy(scrollerRefComplementares, -1)}
                className="flex h-10 w-10 items-center justify-center rounded-full border border-border/60 bg-card/60 hover:border-gold/40 hover:text-gold transition-all"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <button
                onClick={() => scrollBy(scrollerRefComplementares, 1)}
                className="flex h-10 w-10 items-center justify-center rounded-full border border-border/60 bg-card/60 hover:border-gold/40 hover:text-gold transition-all"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>
          </div>

          <div
            ref={scrollerRefComplementares}
            className="flex gap-4 overflow-x-auto pb-4 scrollbar-hidden"
          >
            {livrosComplementares.map((livro) => (
              <div
                key={livro.id}
                className="shrink-0 w-[200px] md:w-[240px] flex flex-col gap-3 cursor-pointer group"
              >
                <div
                  className="aspect-[2/3] rounded-lg overflow-hidden bg-black/20 group-hover:shadow-lg transition-shadow"
                  style={{
                    backgroundImage:
                      livro.imagem_url || livro.capa_url
                        ? `url('${livro.imagem_url || livro.capa_url}')`
                        : undefined,
                    backgroundSize: "cover",
                    backgroundPosition: "center",
                  }}
                />
                <div>
                  <p className="font-semibold text-sm line-clamp-2">{livro.titulo}</p>
                  {livro.autor && <p className="text-xs text-muted-foreground">{livro.autor}</p>}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {(loadingJornada || loadingComplementares) && (
        <p className="text-sm text-muted-foreground">Carregando cursos…</p>
      )}

      {!loadingJornada && !loadingComplementares && livrosJornada.length === 0 && livrosComplementares.length === 0 && (
        <p className="text-sm text-muted-foreground">Nenhum curso disponível no momento.</p>
      )}
    </div>
  );
}
