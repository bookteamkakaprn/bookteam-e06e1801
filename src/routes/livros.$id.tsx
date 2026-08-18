import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/use-auth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  ArrowRight,
  Calendar,
  Clock,
  MapPin,
  BookOpen,
  User,
  CheckCircle2,
  CreditCard,
  Heart,
} from "lucide-react";

export const Route = createFileRoute("/livros/$id")({
  head: () => ({
    meta: [
      {
        title: "Livro — Book Team",
      },
      {
        name: "robots",
        content: "noindex",
      },
    ],
  }),
  component: LivroDetalhesPage,
});

type Livro = {
  id: string;
  titulo: string;
  autor: string | null;
  categoria: string | null;
  ordem: number | null;
  imagem_url: string | null;
};

type Evento = {
  id: string;
  titulo: string;
  data: string;
  hora: string | null;
  cidade: string | null;
  local: string | null;
  valor: number | null;
  pix_codigo: string | null;
  pix_copia_cola: string | null;
  livro_id: string | null;
};

function LivroDetalhesPage() {
  const { id } = Route.useParams();
  const { user } = useAuth();

  const isPlaceholder = id.startsWith("placeholder-");

  /*
   * Busca o livro quando ele já existe no Supabase.
   */
  const {
    data: livro,
    isLoading: carregandoLivro,
  } = useQuery({
    queryKey: ["livro-detalhes", id],
    enabled: !isPlaceholder,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("livros")
        .select("*")
        .eq("id", id)
        .maybeSingle();

      if (error) throw error;

      return data as Livro | null;
    },
  });

  /*
   * Busca os encontros disponíveis para este livro.
   */
  const {
    data: eventos = [],
    isLoading: carregandoEventos,
  } = useQuery({
    queryKey: ["eventos-livro", id],
    enabled: !isPlaceholder,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("eventos")
        .select(
          "id, titulo, data, hora, cidade, local, valor, pix_codigo, pix_copia_cola, livro_id",
        )
        .eq("livro_id", id)
        .order("data", { ascending: true });

      if (error) throw error;

      return (data ?? []) as Evento[];
    },
  });

  /*
   * Para livros que ainda não foram cadastrados pelo ADM,
   * usamos as posições fixas da jornada.
   */
  const ordemPlaceholder = isPlaceholder
    ? Number(id.replace("placeholder-", ""))
    : null;

  const jornadaBase: Record<
    number,
    {
      titulo: string;
      autor: string;
    }
  > = {
    1: {
      titulo: "Mantenha Seu Amor Aceso",
      autor: "",
    },
    2: {
      titulo: "Cultura da Honra",
      autor: "",
    },
    3: {
      titulo: "Livro 3",
      autor: "",
    },
    4: {
      titulo: "Livro 4",
      autor: "",
    },
    5: {
      titulo: "Organize a Sua Desordem Mental",
      autor: "",
    },
    6: {
      titulo: "O Despertar da Leoa",
      autor: "",
    },
    7: {
      titulo: "Livro 7",
      autor: "",
    },
    8: {
      titulo: "Os Caminhos Sobrenaturais da Realeza",
      autor: "",
    },
    9: {
      titulo: "O Poder Sobrenatural de uma Mente Transformada",
      autor: "",
    },
    10: {
      titulo: "Impunível",
      autor: "Danny Silk",
    },
  };

  const livroVisual: Livro | null =
    livro ??
    (isPlaceholder && ordemPlaceholder
      ? {
          id,
          titulo:
            jornadaBase[ordemPlaceholder]?.titulo ??
            `Livro ${ordemPlaceholder}`,
          autor: jornadaBase[ordemPlaceholder]?.autor ?? "",
          categoria: "Jornada",
          ordem: ordemPlaceholder,
          imagem_url: null,
        }
      : null);

  if (carregandoLivro) {
    return (
      <div className="min-h-screen bg-background px-4 py-20">
        <div className="mx-auto max-w-5xl animate-pulse">
          <div className="h-8 w-40 rounded bg-muted" />
          <div className="mt-8 grid gap-8 md:grid-cols-[300px_1fr]">
            <div className="aspect-[2/3] rounded-2xl bg-muted" />
            <div className="space-y-4">
              <div className="h-10 w-3/4 rounded bg-muted" />
              <div className="h-5 w-1/2 rounded bg-muted" />
              <div className="h-24 rounded bg-muted" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!livroVisual) {
    return (
      <div className="min-h-screen bg-background px-4 py-20">
        <div className="mx-auto max-w-3xl text-center">
          <BookOpen className="mx-auto h-12 w-12 text-gold" />

          <h1 className="mt-5 font-serif text-3xl font-semibold">
            Livro não encontrado
          </h1>

          <p className="mt-3 text-muted-foreground">
            Não conseguimos encontrar este livro.
          </p>

          <Button asChild className="mt-6 bg-gold text-primary-foreground">
            <Link to="/">Voltar para os livros</Link>
          </Button>
        </div>
      </div>
    );
  }

  const numeroLivro = livroVisual.ordem ?? ordemPlaceholder ?? 0;

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* TOPO */}
      <header className="border-b border-border/50 bg-background/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 md:px-8">
          <Link
            to="/"
            className="flex items-center gap-2 text-sm text-foreground/70 transition-colors hover:text-gold"
          >
            <ArrowLeft className="h-4 w-4" />
            Voltar para os livros
          </Link>

          <div className="flex items-center gap-2">
            <Heart className="h-4 w-4 fill-gold text-gold" />
            <span className="font-serif text-sm font-semibold">
              BOOK TEAM
            </span>
          </div>
        </div>
      </header>

      {/* CONTEÚDO */}
      <main className="mx-auto max-w-6xl px-4 py-10 md:px-8 md:py-16">
        <div className="grid gap-10 md:grid-cols-[300px_1fr] lg:grid-cols-[340px_1fr]">
          {/* CAPA */}
          <div>
            <div className="relative aspect-[2/3] overflow-hidden rounded-r-3xl rounded-l-lg border border-gold/20 bg-gradient-to-br from-[oklch(0.4_0.12_25)] to-[oklch(0.2_0.05_20)] shadow-premium">
              {livroVisual.imagem_url ? (
                <img
                  src={livroVisual.imagem_url}
                  alt={livroVisual.titulo}
                  className="absolute inset-0 h-full w-full object-cover"
                />
              ) : (
                <div className="absolute inset-0 flex flex-col items-center justify-center px-8 text-center">
                  <div className="flex h-24 w-24 items-center justify-center rounded-3xl border border-gold/30 bg-black/20">
                    <BookOpen className="h-12 w-12 text-gold" />
                  </div>

                  <p className="mt-5 text-xs font-semibold uppercase tracking-[0.2em] text-gold">
                    Capa em breve
                  </p>

                  <p className="mt-2 text-sm text-foreground/60">
                    O ADM ainda não cadastrou a capa deste livro.
                  </p>
                </div>
              )}

              <div className="absolute left-4 top-4 rounded-full border border-gold/30 bg-black/60 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.15em] text-gold backdrop-blur">
                Livro {numeroLivro} de 10
              </div>
            </div>

            {/* PROGRESSO */}
            <div className="mt-4">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Jornada</span>
                <span>{numeroLivro}/10</span>
              </div>

              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10">
                <div
                  className="h-full bg-gradient-gold"
                  style={{
                    width: `${Math.min((numeroLivro / 10) * 100, 100)}%`,
                  }}
                />
              </div>
            </div>
          </div>

          {/* INFORMAÇÕES */}
          <div>
            <Badge
              variant="outline"
              className="border-gold/30 text-gold"
            >
              {livroVisual.categoria || "Jornada"}
            </Badge>

            <h1 className="mt-4 max-w-3xl font-serif text-3xl font-semibold leading-tight md:text-5xl">
              {livroVisual.titulo}
            </h1>

            {livroVisual.autor && (
              <p className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
                <User className="h-4 w-4" />
                {livroVisual.autor}
              </p>
            )}

            <div className="mt-8 rounded-2xl border border-gold/20 bg-card/60 p-5">
              <div className="flex gap-3">
                <BookOpen className="mt-0.5 h-5 w-5 shrink-0 text-gold" />

                <div>
                  <h2 className="font-semibold">
                    Sobre esta etapa da jornada
                  </h2>

                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                    Este é o livro {numeroLivro} da jornada Book Team.
                    Escolha o próximo encontro disponível para participar
                    desta etapa.
                  </p>
                </div>
              </div>
            </div>

            {/* ENCONTROS */}
            <section className="mt-10">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h2 className="font-serif text-2xl font-semibold">
                    Próximos encontros
                  </h2>

                  <p className="mt-1 text-sm text-muted-foreground">
                    Escolha a turma da qual deseja participar.
                  </p>
                </div>
              </div>

              {carregandoEventos && (
                <div className="mt-5 space-y-3">
                  {[1, 2].map((item) => (
                    <div
                      key={item}
                      className="h-36 animate-pulse rounded-2xl bg-muted"
                    />
                  ))}
                </div>
              )}

              {!carregandoEventos && eventos.length === 0 && (
                <div className="mt-5 rounded-2xl border border-border/60 bg-card/50 p-6">
                  <div className="flex gap-3">
                    <Calendar className="h-5 w-5 shrink-0 text-gold" />

                    <div>
                      <p className="font-semibold">
                        Ainda não há turma cadastrada
                      </p>

                      <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                        O ADM ainda não cadastrou o próximo encontro para
                        este livro. Assim que a turma for cadastrada, ela
                        aparecerá aqui automaticamente.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <div className="mt-5 space-y-4">
                {eventos.map((evento) => (
                  <EventoCard
                    key={evento.id}
                    evento={evento}
                    userId={user?.id}
                  />
                ))}
              </div>
            </section>

            {/* AVISO PARA LIVRO AINDA NÃO CADASTRADO */}
            {isPlaceholder && (
              <div className="mt-6 rounded-2xl border border-gold/20 bg-gold/5 p-5">
                <div className="flex gap-3">
                  <BookOpen className="h-5 w-5 shrink-0 text-gold" />

                  <div>
                    <p className="font-semibold">
                      Este livro já faz parte da jornada
                    </p>

                    <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                      O livro está reservado nesta posição da sequência.
                      Quando o ADM cadastrar as informações e a turma,
                      elas aparecerão automaticamente nesta página.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

/* ———————————————— EVENTO ———————————————— */

function EventoCard({
  evento,
}: {
  evento: Evento;
  userId?: string;
}) {
  const dataFormatada = new Date(
    `${evento.data}T00:00:00`,
  ).toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
  });

  return (
    <div className="rounded-2xl border border-border/60 bg-card/60 p-5 transition-all hover:border-gold/30 hover:bg-card">
      <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
        <div className="min-w-0">
          <p className="font-serif text-lg font-semibold">
            {evento.titulo}
          </p>

          <div className="mt-3 grid gap-2 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-gold" />
              <span className="capitalize">{dataFormatada}</span>
            </div>

            {evento.hora && (
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-gold" />
                <span>{evento.hora.slice(0, 5)}</span>
              </div>
            )}

            {(evento.local || evento.cidade) && (
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-gold" />
                <span>
                  {[evento.local, evento.cidade]
                    .filter(Boolean)
                    .join(", ")}
                </span>
              </div>
            )}
          </div>
        </div>

        <div className="flex shrink-0 flex-col gap-2 md:min-w-[190px]">
          {evento.valor !== null && (
            <div className="mb-1 text-center">
              <p className="text-xs text-muted-foreground">
                Investimento
              </p>

              <p className="font-serif text-xl font-semibold text-gold">
                {Number(evento.valor).toLocaleString("pt-BR", {
                  style: "currency",
                  currency: "BRL",
                })}
              </p>
            </div>
          )}

          <Button
            asChild
            className="w-full bg-gold text-primary-foreground hover:bg-gold/90"
          >
            <Link
              to="/inscricao/$eventoId"
              params={{ eventoId: evento.id }}
            >
              Quero participar
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </div>

      {/* PIX */}
      {(evento.pix_codigo || evento.pix_copia_cola) && (
        <div className="mt-5 border-t border-border/50 pt-4">
          <div className="flex items-start gap-3">
            <CreditCard className="mt-0.5 h-4 w-4 shrink-0 text-gold" />

            <div>
              <p className="text-sm font-semibold">
                Pagamento via PIX
              </p>

              <p className="mt-1 text-xs text-muted-foreground">
                O código PIX será disponibilizado durante a inscrição.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
