import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, MapPin, Users } from "lucide-react";
import { useState } from "react";

export const Route = createFileRoute("/_authenticated/eventos")({
  head: () => ({ meta: [{ title: "Encontros — Book Team" }, { name: "robots", content: "noindex" }] }),
  component: EventosPage,
});

type Categoria = "Homens" | "Mulheres" | "Mulheres solteiras" | "Misto" | "Família" | "Ministério (Staff)";

type EventoRow = {
  id: string;
  titulo: string;
  descricao: string | null;
  categoria: Categoria | null;
  data: string;
  hora: string | null;
  cidade: string | null;
  local: string | null;
  valor: number;
  vagas: number;
};

const CATEGORIAS: Categoria[] = [
  "Homens",
  "Mulheres",
  "Mulheres solteiras",
  "Misto",
  "Família",
  "Ministério (Staff)",
];

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

function EventosPage() {
  const [filtroCategoria, setFiltroCategoria] = useState<"todas" | Categoria>("todas");

  const { data, isLoading } = useQuery({
    queryKey: ["eventos-abertos", filtroCategoria],
    queryFn: async () => {
      const today = new Date().toISOString().slice(0, 10);
      let query = supabase
        .from("eventos")
        .select("id, titulo, descricao, categoria, data, hora, cidade, local, valor, vagas")
        .is("livro_id", null)  // ← Filtrar apenas eventos (não cursos)
        .eq("status", "aberto")
        .gte("data", today)
        .order("data")
        .order("hora");

      if (filtroCategoria !== "todas") {
        query = query.eq("categoria", filtroCategoria);
      }

      const { data } = await query;
      return (data ?? []) as unknown as EventoRow[];
    },
  });

  const eventos = data ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-3xl font-bold">Encontros abertos</h1>
        <p className="text-sm text-muted-foreground">
          Confira todos os encontros disponíveis e escolha qual se encaixa melhor.
        </p>
      </div>

      {/* Filtro de categoria */}
      <div className="flex flex-wrap gap-2">
        <Button
          variant={filtroCategoria === "todas" ? "default" : "outline"}
          onClick={() => setFiltroCategoria("todas")}
          size="sm"
        >
          Todas
        </Button>
        {CATEGORIAS.map((cat) => (
          <Button
            key={cat}
            variant={filtroCategoria === cat ? "default" : "outline"}
            onClick={() => setFiltroCategoria(cat)}
            size="sm"
            className={filtroCategoria === cat ? "" : ""}
          >
            {cat}
          </Button>
        ))}
      </div>

      {isLoading && <p className="text-sm text-muted-foreground">Carregando...</p>}

      {!isLoading && eventos.length === 0 && (
        <p className="text-sm text-muted-foreground">Nenhum encontro aberto nesta categoria no momento.</p>
      )}

      <div className="space-y-3">
        {eventos.map((e) => (
          <Card key={e.id}>
            <CardContent className="flex flex-col gap-3 p-4 md:flex-row md:items-center md:justify-between">
              <div className="min-w-0">
                {e.categoria && (
                  <Badge className={`${getBadgeCategoria(e.categoria)} text-white mb-2`}>
                    {e.categoria}
                  </Badge>
                )}
                <p className="font-serif text-lg font-semibold">{e.titulo}</p>
                {e.descricao && (
                  <p className="mt-1 text-xs text-muted-foreground line-clamp-2">{e.descricao}</p>
                )}
                <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                  <span className="inline-flex items-center gap-1">
                    <Calendar className="h-3.5 w-3.5" />
                    {new Date(e.data + "T00:00:00").toLocaleDateString("pt-BR")} {e.hora?.slice(0, 5)}
                  </span>
                  {(e.local || e.cidade) && (
                    <span className="inline-flex items-center gap-1">
                      <MapPin className="h-3.5 w-3.5" /> {[e.local, e.cidade].filter(Boolean).join(" — ")}
                    </span>
                  )}
                  <span className="inline-flex items-center gap-1">
                    <Users className="h-3.5 w-3.5" /> {e.vagas} vagas
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Badge variant="secondary">
                  {Number(e.valor).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                </Badge>
                <Button asChild size="sm" className="bg-gold text-primary-foreground hover:bg-gold/90">
                  <Link to="/inscricao/$eventoId" params={{ eventoId: e.id }}>
                    Inscrever-se
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
