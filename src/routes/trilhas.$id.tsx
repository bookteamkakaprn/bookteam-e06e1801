import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/use-auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, BookOpen, Calendar, MapPin, Users } from "lucide-react";

export const Route = createFileRoute("/trilhas/$id")({
  head: () => ({
    meta: [
      { title: "Trilha — Book Team" },
      { name: "description", content: "Detalhes da trilha, livros e próximos encontros do Book Team." },
      { property: "og:title", content: "Trilha — Book Team" },
      { property: "og:description", content: "Detalhes da trilha, livros e próximos encontros do Book Team." },
    ],
  }),
  component: TrilhaPage,
});

function TrilhaPage() {
  const { id } = Route.useParams();
  const { user } = useAuth();

  const { data, isLoading, error } = useQuery({
    queryKey: ["trilha", id],
    queryFn: async () => {
      const today = new Date().toISOString().slice(0, 10);
      const [trilhaRes, livrosRes, eventosRes] = await Promise.all([
        supabase.from("trilhas").select("*").eq("id", id).maybeSingle(),
        supabase.from("livros").select("*").eq("trilha_id", id).order("ordem"),
        supabase
          .from("eventos")
          .select("*, livros!inner(trilha_id, titulo)")
          .eq("livros.trilha_id", id)
          .eq("status", "aberto")
          .gte("data", today)
          .order("data"),
      ]);
      if (trilhaRes.error) throw trilhaRes.error;
      return {
        trilha: trilhaRes.data,
        livros: livrosRes.data ?? [],
        eventos: eventosRes.data ?? [],
      };
    },
  });

  if (isLoading) {
    return <div className="mx-auto max-w-5xl px-4 py-16 text-muted-foreground">Carregando trilha…</div>;
  }
  if (error || !data?.trilha) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-16">
        <p className="text-muted-foreground">Trilha não encontrada.</p>
        <Button asChild variant="link" className="mt-2 px-0">
          <Link to="/">Voltar</Link>
        </Button>
      </div>
    );
  }

  const { trilha, livros, eventos } = data;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-30 border-b border-border/60 bg-background/80 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" /> Voltar
          </Link>
          {user ? (
            <Button asChild size="sm" variant="outline">
              <Link to="/inicio">Meu painel</Link>
            </Button>
          ) : (
            <Button asChild size="sm" className="bg-gold text-primary-foreground hover:bg-gold/90">
              <Link to="/auth">Entrar</Link>
            </Button>
          )}
        </div>
      </header>

      <section
        className="relative overflow-hidden"
        style={{ background: `linear-gradient(135deg, ${trilha.cor ?? "#8B4513"}22, transparent 60%)` }}
      >
        <div className="mx-auto max-w-5xl px-4 py-12">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-gold">Trilha</p>
          <h1 className="mt-2 font-serif text-3xl font-semibold md:text-4xl">{trilha.nome}</h1>
          {trilha.descricao && (
            <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-foreground/75">{trilha.descricao}</p>
          )}
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-4 py-10">
        <h2 className="font-serif text-xl font-semibold">Livros da trilha</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {livros.map((l) => (
            <Card key={l.id}>
              <CardContent className="flex gap-4 p-4">
                {l.imagem_url ? (
                  <img src={l.imagem_url} alt={l.titulo} className="h-24 w-16 rounded object-cover" />
                ) : (
                  <div className="flex h-24 w-16 items-center justify-center rounded bg-muted">
                    <BookOpen className="h-6 w-6 text-muted-foreground" />
                  </div>
                )}
                <div className="min-w-0">
                  <p className="text-xs uppercase tracking-wider text-muted-foreground">Livro {l.ordem}</p>
                  <p className="font-serif text-lg font-semibold leading-tight">{l.titulo}</p>
                  {l.autor && <p className="text-sm text-muted-foreground">{l.autor}</p>}
                  {l.descricao && (
                    <p className="mt-1.5 text-[13px] leading-relaxed text-foreground/70">{l.descricao}</p>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
          {livros.length === 0 && <p className="text-sm text-muted-foreground">Nenhum livro cadastrado ainda.</p>}
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-4 py-10">
        <h2 className="font-serif text-xl font-semibold">Próximos encontros</h2>
        <div className="mt-4 space-y-3">
          {eventos.map((e) => (
            <Card key={e.id}>
              <CardContent className="flex flex-col gap-3 p-4 md:flex-row md:items-center md:justify-between">
                <div className="min-w-0 flex-1">
                  <p className="font-serif text-lg font-semibold">{e.titulo}</p>
                  {e.descricao && <p className="text-sm text-muted-foreground">{e.descricao}</p>}
                  <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                    <span className="inline-flex items-center gap-1">
                      <Calendar className="h-3.5 w-3.5" />
                      {new Date(e.data + "T00:00:00").toLocaleDateString("pt-BR")} {e.hora?.slice(0, 5)}
                    </span>
                    {(e.cidade || e.local) && (
                      <span className="inline-flex items-center gap-1">
                        <MapPin className="h-3.5 w-3.5" /> {[e.local, e.cidade].filter(Boolean).join(" — ")}
                      </span>
                    )}
                    <span className="inline-flex items-center gap-1">
                      <Users className="h-3.5 w-3.5" /> {e.vagas} vagas
                    </span>
                  </div>
                </div>
                <div className="flex flex-col items-start gap-2 md:items-end">
                  <Badge variant="secondary" className="text-sm">
                    {Number(e.valor).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                  </Badge>
                  {user ? (
                    <Button asChild size="sm" className="bg-gold text-primary-foreground hover:bg-gold/90">
                      <Link to="/inscricao/$eventoId" params={{ eventoId: e.id }}>Inscrever-se</Link>
                    </Button>
                  ) : (
                    <Button asChild size="sm" variant="outline">
                      <Link to="/auth">Entre para se inscrever</Link>
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
          {eventos.length === 0 && (
            <p className="text-sm text-muted-foreground">Ainda não há encontros abertos para essa trilha.</p>
          )}
        </div>
      </section>
    </div>
  );
}